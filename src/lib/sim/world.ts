/**
 * The aquarium itself: owns every creature and particle, steps the simulation
 * and paints a frame. Deliberately framework-free so it can be unit tested and
 * so the Svelte layer stays thin.
 */

import * as art from '$lib/art';
import { update, type Context } from './behaviour';
import { FOOD } from './types';
import { SCENES, portalsOf, type SceneId } from '$lib/data/scenes';
import type {
  Bubble, Creature, CreatureSpec, Food, FoodKind, Heart, Letter, Pearl, Sparkle
} from './types';

const GLITTER = ['#ffffff', '#fff6c9', '#ffd6ee', '#d8f3ff', '#ffe9a8', '#f2d9ff', '#c9fff0'];

export interface WorldOptions {
  /** Fewer particles on slower devices. */
  quality: 'low' | 'medium' | 'high';
  sparkles: boolean;
}

export interface WorldEvents {
  onFeed?: (total: number) => void;
  onTap?: (c: Creature) => void;
  onKeyFound?: () => void;
  onChestOpen?: (total: number, loot: Loot) => void;
  onCheer?: (c: Creature) => void;
  onPearl?: (home: number, wanted: number) => void;
  onTravel?: (to: SceneId) => void;
}

/** How far along the key hunt she is. */
export type HuntStage = 'hidden' | 'carried' | 'open';

/** The key hunt: find the key on the sea floor, then tap the chest open. */
export interface Treasure {
  stage: HuntStage;
  /** Where the key lies while it is still hidden. */
  keyX: number;
  keyY: number;
  keyRot: number;
  keyPhase: number;
  /** Lid position, 0 shut to 1 wide open. */
  open: number;
  /** Seconds the chest stays open before it locks itself and the key rehides. */
  reset: number;
  /** Countdown to the next glint off the hidden key. */
  glint: number;
  /** 1 while it is catching the light, fading to 0. This is the only tell. */
  glintNow: number;
  /** How long she has been looking. A long hunt gets gentler. */
  hunting: number;
  /** Countdown to the next idle bubble from the chest. */
  puff: number;
  /** Raw 0-1 progress of the lid; `open` is this run through the spring easing. */
  swing: number;
  /** What came out this time, and how far it has risen (1 down to 0). */
  loot: Loot | null;
  lootRise: number;
}

/** What sits under a given point — used for the hover cursor. */
export type HitKind = 'creature' | 'key' | 'chest' | null;

/** Where the mouse is and what it is over, for the drawn cursor. */
export interface Pointer {
  x: number;
  y: number;
  over: HitKind;
  /** Fades from 1 to 0 after a click, driving the ripple. */
  press: number;
}

/** Taps on one creature inside this many seconds count towards a loop. */
const TAP_CHAIN_SECONDS = 1.4;

/**
 * What a key press did. Every key does something, so that mashing the keyboard
 * is rewarding rather than inert — and letters call out the creatures whose
 * names start with them, which is the whole teaching idea.
 */
export type KeyEffect =
  | { kind: 'letter'; char: string; matched: Creature[] }
  | { kind: 'food'; count: number }
  | { kind: 'feed' }
  | { kind: 'burst' }
  | { kind: 'current' }
  | { kind: 'clear' };

/** Seconds she must hold on a doorway before it takes her there. */
const TRAVEL_HOLD = 1.1;

/** How long the swim between places takes. */
const TRAVEL_SECONDS = 1.5;

/** How long the chest stays open before the hunt starts over. */
const CHEST_OPEN_SECONDS = 9;

/** How far the reef layers slide against each other, in pixels at full lean. */
const PARALLAX = 26;

/* How much smaller the furthest creature is drawn than the nearest one. */
const DEPTH_MIN = 0.42;
const DEPTH_SPAN = 0.85;

/** The six treasures she can collect, one at random each time she opens the chest. */
export const LOOT = ['crown', 'gem', 'pearl', 'ring', 'star', 'shell'] as const;
export type Loot = (typeof LOOT)[number];

/** Overshoots past 1 and settles back, which is what makes the lid feel sprung. */
function easeOutBack(x: number) {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}

/* The pearl rolls through water, so it accelerates gently and coasts to a stop. */
const PEARL_ACCEL = 430;
const PEARL_DRAG = 1.5;
const PEARL_SINK = 55;
const PEARLS_TO_WIN = 3;

export class World {
  creatures: Creature[] = [];
  foods: Food[] = [];
  bubbles: Bubble[] = [];
  sparkles: Sparkle[] = [];
  hearts: Heart[] = [];
  letters: Letter[] = [];

  width = 0;
  height = 0;
  time = 0;
  fedTotal = 0;
  paused = false;

  /** What the feed button and a tap on the water drop. */
  food: FoodKind = 'pellet';

  /** How many times she has opened the chest. */
  treasures = 0;
  treasure: Treasure = {
    stage: 'hidden',
    keyX: 0, keyY: 0, keyRot: 0, keyPhase: 0,
    open: 0, reset: 0, glint: 1.5, glintNow: 0, puff: 2, hunting: 0,
    swing: 0, loot: null, lootRise: 0
  };

  /** Null on touch screens, which have nothing to hover. */
  pointer: Pointer | null = null;

  /** How brightly the wreck's hold is lit — it warms when someone is inside. */
  wreckLit = 0;

  /** Where she is leaning, -1 to 1. Slides the reef layers for parallax. */
  look = { x: 0, y: 0 };

  /** Where she last touched the water. Nosy creatures come to look. */
  poke: { x: number; y: number; age: number } | null = null;

  /**
   * The doorway she is holding on, and how far the ring has filled. A hold
   * rather than a tap, so she cannot travel by brushing the glass.
   */
  hold: { to: SceneId; x: number; y: number; progress: number } | null = null;

  /**
   * The journey itself. The screen dives through the water into the new place;
   * the scene only actually swaps at the darkest point, so she never sees the
   * reef pop from one shape to another.
   */
  travel: { to: SceneId; progress: number; swapped: boolean } | null = null;

  /** The tilt game. Null pearl means it is not running. */
  pearl: Pearl | null = null;
  pearlsHome = 0;
  pearlsWanted = 0;
  tilt: { x: number; y: number } = { x: 0, y: 0 };
  private pearlRespawn = 0;

  private shoalState: Record<string, { x: number; y: number; tx: number; ty: number; retarget: number }> = {};
  private tapChain: { id: string; count: number; at: number } | null = null;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private specs: CreatureSpec[],
    public options: WorldOptions = { quality: 'high', sparkles: true },
    private events: WorldEvents = {}
  ) {
    art.bindContext(ctx);
  }

  /* --------------------------------------------------------------- setup */

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    art.setTank(width, height);
    if (!this.creatures.length) this.stock();
    const k = this.sizeScale();
    for (const c of this.creatures) c.size = (c.baseSize ?? c.size) * k;
    for (const c of this.creatures) {
      if (c.mode === 'crawl' || c.mode === 'static') {
        c.x = art.clamp(c.x, 40, width - 40);
        c.y = art.sandY(c.x) + (c.mode === 'static' ? 22 : 6);
      }
      c.x = art.clamp(c.x, 20, width - 20);
      c.y = art.clamp(c.y, 20, height - 20);
    }
    // keep the key lying on the sand when the tank changes shape, rather than
    // rehiding it and losing her half-finished hunt
    if (this.treasure.stage === 'hidden') this.seatKey(this.treasure.keyX);
  }

  /* ------------------------------------------------------------ key hunt */

  /** Put the key down on the sea floor at x, nudged inside the glass. */
  private seatKey(x: number) {
    const tr = this.treasure;
    tr.keyX = art.clamp(x, 34, this.width - 34);
    tr.keyY = art.sandY(tr.keyX) + 6;
  }

  /** Hide the key somewhere new along the floor, well clear of the chest. */
  private hideKey() {
    const tr = this.treasure;
    const chestX = art.chestPos().x;
    // the same bias the scenery uses, so the key lands among plants rather
    // than out on the bare sand where it may as well be signposted
    const reefX = () => art.clamp(
      Math.pow(Math.random(), 1.5) * this.width * 0.82 + art.rnd(-10, 24),
      this.width * 0.05, this.width * 0.95
    );
    let x = reefX();
    // a key dropped at the chest's feet would make for a very short hunt
    for (let i = 0; i < 24 && Math.abs(x - chestX) < 120; i++) x = reefX();
    this.seatKey(x);
    tr.keyRot = art.rnd(-0.5, 0.5);
    tr.keyPhase = art.rnd(0, 7);
    tr.glint = art.rnd(1.4, 2.8);
    tr.glintNow = 0;
    tr.hunting = 0;
    tr.stage = 'hidden';
  }

  /** Is this point on the hidden key? Generous, for small fingers. */
  private onKey(x: number, y: number) {
    const tr = this.treasure;
    return tr.stage === 'hidden' && Math.hypot(tr.keyX - x, tr.keyY - y) < 42;
  }

  /** Is this point on the chest? A box, because the chest is a wide, low thing. */
  private onChest(x: number, y: number) {
    const p = art.chestPos();
    return Math.abs(x - p.x) < 50 && y > p.y - 60 && y < p.y + 20;
  }

  private takeKey() {
    const tr = this.treasure;
    tr.stage = 'carried';
    this.burst(tr.keyX, tr.keyY - 8);
    this.glitter(tr.keyX, tr.keyY - 8, 10, 16);
    this.events.onKeyFound?.();
  }

  private openChest() {
    const tr = this.treasure;
    tr.stage = 'open';
    tr.reset = CHEST_OPEN_SECONDS;
    tr.loot = art.pick([...LOOT]);
    tr.lootRise = 1;
    this.treasures++;

    const p = art.chestPos();
    this.burst(p.x, p.y - 34);
    this.glitter(p.x, p.y - 34, 34, 40);
    // a fountain of coins, thrown out of the lid and falling back to the sand
    for (let i = 0; i < 18; i++) {
      const a = art.rnd(-2.5, -0.6);
      const sp = art.rnd(120, 260);
      this.sparkles.push({
        x: p.x + art.rnd(-16, 16), y: p.y - 30,
        vx: Math.cos(a) * sp * art.pick([1, -1]), vy: Math.sin(a) * sp,
        gravity: 240, life: art.rnd(1, 1.7), maxLife: 1.7,
        r: art.rnd(5, 9), rot: art.rnd(0, 7), star: false, color: art.pick(['#f5c542', '#ffd76e', '#ffef9f'])
      });
    }
    for (let i = 0; i < 8; i++) {
      this.bubbles.push(this.makeBubble(p.x + art.rnd(-24, 24), p.y - 24, art.rnd(3, 9)));
    }
    this.events.onChestOpen?.(this.treasures, tr.loot);
  }

  /**
   * How big creatures are drawn, relative to the artwork's native size. A phone
   * gets everything a bit smaller so the tank does not feel like a rush hour.
   */
  private sizeScale() {
    return art.clamp(Math.min(this.width, this.height) / 700, 0.62, 1);
  }

  /** The key shrinks less than the cast does — it still has to be spottable. */
  private keyScale() {
    return Math.max(0.85, this.sizeScale());
  }

  /** On a small screen, thin out the shoals and the spare fish. */
  private castFor(width: number) {
    const specs = this.residents();
    if (width >= 760) return specs;
    const keepEveryOther = width < 520;
    let shoalIndex = 0;
    return specs.filter((s) => {
      if (s.shoal) {
        shoalIndex++;
        return keepEveryOther ? shoalIndex % 3 !== 0 : true;
      }
      if (keepEveryOther && s.group === 'fish') {
        return !['coco', 'splash', 'pepper'].includes(s.id);
      }
      return true;
    });
  }

  /** Everyone who lives in the place we are currently in. */
  private residents() {
    const here = art.currentScene().residents;
    if (!here?.length) return this.specs;
    const live = this.specs.filter(
      // her own creatures follow her everywhere, like the heroes do — they
      // belong to her, not to a place
      (sp) => !sp.group || sp.group === 'mine' || here.includes(sp.group as string)
    );
    return live.length ? live : this.specs;
  }

  /**
   * Swap the cast for the one that lives here. Called when she arrives
   * somewhere new, at the point in the journey where the screen is thickest.
   */
  restock() {
    this.creatures = [];
    this.shoalState = {};
    this.stock();
    const k = this.sizeScale();
    for (const c of this.creatures) c.size = (c.baseSize ?? c.size) * k;
  }

  /** Build the cast from the specs. */
  private stock() {
    const specs = this.castFor(this.width);
    const k = this.sizeScale();
    this.creatures = specs.map((spec, i) => this.spawn(spec, i, specs.length, k));
    // resolve leaders now that every creature exists
    for (const c of this.creatures) {
      if (c.leader) c.leaderRef = this.creatures.find((o) => o.id === c.leader) ?? null;
    }
    for (const c of this.creatures) {
      if (c.shoal && !this.shoalState[c.shoal]) {
        this.shoalState[c.shoal] = {
          x: this.width * 0.5, y: this.height * 0.5,
          tx: this.width * 0.5, ty: this.height * 0.5, retarget: 0
        };
      }
    }
    const n = this.options.quality === 'low' ? 8 : this.options.quality === 'medium' ? 12 : 18;
    for (let i = 0; i < n; i++) {
      this.bubbles.push(this.makeBubble(art.rnd(0, this.width), art.rnd(0, this.height)));
    }
    this.hideKey();
  }

  private spawn(spec: CreatureSpec, index = 0, total = 1, scale = 1): Creature {
    const mode = spec.mode ?? 'swim';
    // spread the first positions over the tank instead of clumping at random
    const golden = 0.618033988749895;
    const fx = (index * golden) % 1;
    const fy = ((index * golden * 3) % 1);
    return {
      ...spec,
      baseSize: spec.size,
      size: spec.size * scale,
      mode,
      x: this.width * (0.06 + fx * 0.88),
      y: this.height * (0.1 + fy * 0.68),
      // spread the cast through the depth of the tank, not onto one pane
      z: art.rnd(-0.85, 0.85),
      vz: 0,
      tz: art.rnd(-0.85, 0.85),
      vx: art.rnd(-40, 40),
      vy: 0,
      dir: Math.random() < 0.5 ? -1 : 1,
      phase: spec.phase ?? art.rnd(0, 7),
      tailSpeed: spec.tailSpeed ?? 7,
      speed: spec.speed ?? art.rnd(38, 62),
      wiggle: 0,
      label: 0,
      fed: 0,
      energy: art.rnd(0.5, 1),
      bold: art.rnd(0, 1),
      flee: 0,
      tx: null,
      ty: null,
      retarget: 0,
      offset: spec.offset
    } as Creature;
  }

  /* ------------------------------------------------------------ particles */

  private makeBubble(x: number, y: number, r?: number): Bubble {
    return { x, y, r: r ?? art.rnd(3, 9), vy: art.rnd(28, 62), phase: art.rnd(0, 7), speed: art.rnd(1.5, 3) };
  }

  private glitter(x: number, y: number, n = 1, spread = 6) {
    if (!this.options.sparkles) return;
    for (let i = 0; i < n; i++) {
      this.sparkles.push({
        x: x + art.rnd(-spread, spread), y: y + art.rnd(-spread, spread),
        vx: art.rnd(-14, 14), vy: art.rnd(-16, 4), gravity: -6,
        life: art.rnd(0.7, 1.4), maxLife: 1.4,
        r: art.rnd(3, 7), rot: art.rnd(0, 7), star: true, color: art.pick(GLITTER)
      });
    }
  }

  private burst(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const a = art.rnd(0, 7), sp = art.rnd(40, 150);
      this.sparkles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, gravity: 20,
        life: 0.8, maxLife: 0.8, r: art.rnd(3, 7), rot: art.rnd(0, 7),
        star: true, color: art.pick(GLITTER)
      });
    }
    for (let i = 0; i < 5; i++) {
      this.hearts.push({
        x: x + art.rnd(-14, 14), y: y + art.rnd(-8, 8), vx: art.rnd(-16, 16),
        life: 1.3, maxLife: 1.3, scale: art.rnd(1.1, 2.1),
        color: art.pick(['#ff5c8a', '#ffd166', '#7ef0c8', '#ff9f43', '#c7a6ff'])
      });
    }
  }

  /* -------------------------------------------------------------- input */

  /** What is under this point, if anything. Drives the hover cursor. */
  hitTest(x: number, y: number): HitKind {
    if (this.onKey(x, y)) return 'key';
    if (this.treasure.stage === 'carried' && this.onChest(x, y)) return 'chest';
    return this.creatureAt(x, y) ? 'creature' : null;
  }

  private creatureAt(x: number, y: number): Creature | null {
    let hit: Creature | null = null;
    let bestD = Infinity;
    for (const c of this.creatures) {
      const d = Math.hypot(c.x - x, c.y - y);
      // small creatures get a generous radius so small fingers can reach them
      const r = Math.max(c.size * 1.25, 34) + 8;
      if (d < r && d < bestD) { bestD = d; hit = c; }
    }
    return hit;
  }

  /**
   * A tap: picks up the key, unlocks the chest, wakes a creature, or drops
   * food — in that order. Returns the creature, if one was tapped.
   */
  tap(x: number, y: number): Creature | null {
    // a doorway swallows the tap; travelling is a hold, handled separately
    if (this.portalAt(x, y) && !this.creatureAt(x, y)) return null;

    // the hunt gets first refusal: both targets are small and deliberate
    if (this.onKey(x, y)) { this.takeKey(); return null; }
    if (this.treasure.stage === 'carried' && this.onChest(x, y)) { this.openChest(); return null; }

    const hit = this.creatureAt(x, y);
    if (hit) {
      hit.wiggle = 1;
      hit.label = 2.6;
      this.burst(hit.x, hit.y - hit.size * 0.4);
      this.cheer(hit);
      this.events.onTap?.(hit);
      return hit;
    }
    this.dropFood(x, y);
    return null;
  }

  /**
   * Wake a creature the 3D view has already identified by raycast. Same effect
   * as tapping it, without asking the simulation to guess from a flat point.
   */
  tapCreature(id: string): Creature | null {
    const c = this.creatures.find((o) => o.id === id);
    if (!c) return null;
    c.wiggle = 1;
    c.label = 2.6;
    this.burst(c.x, c.y - c.size * 0.4);
    this.cheer(c);
    this.events.onTap?.(c);
    return c;
  }

  /** Three taps on the same creature in a row and it turns a happy somersault. */
  private cheer(c: Creature) {
    const chain = this.tapChain;
    if (chain && chain.id === c.id && this.time - chain.at < TAP_CHAIN_SECONDS) {
      chain.count++;
      chain.at = this.time;
      if (chain.count >= 3) {
        this.tapChain = null;
        c.loop = 1;
        c.wiggle = 0;
        this.burst(c.x, c.y);
        this.glitter(c.x, c.y, 12, c.size);
        this.events.onCheer?.(c);
      }
      return;
    }
    this.tapChain = { id: c.id, count: 1, at: this.time };
  }

  /**
   * A finger dragged through the water. Everything nearby gets shoved along,
   * which is most of the fun of having a tank you can put your hand in.
   */
  swipe(x: number, y: number, dx: number, dy: number) {
    if (Math.hypot(dx, dy) < 1.5) return;
    const reach = Math.max(120, Math.min(this.width, this.height) * 0.24);
    for (const c of this.creatures) {
      if (c.mode === 'static' || c.mode === 'crawl') continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d > reach) continue;
      const k = (1 - d / reach) * 9;
      c.vx += dx * k;
      c.vy += dy * k;
      c.tx = null;                       // it has forgotten where it was going
      c.retarget = Math.min(c.retarget, 0.4);
    }
    for (const b of this.bubbles) {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < reach) b.x += dx * (1 - d / reach) * 1.6;
    }
    for (const f of this.foods) {
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < reach * 0.7) { f.vx += dx * (1 - d / (reach * 0.7)) * 4; f.vy -= Math.abs(dy) * 0.2; }
    }
    if (Math.random() < 0.4) this.bubbles.push(this.makeBubble(x, y, art.rnd(2, 5)));
    this.glitter(x, y, 1, 10);
  }

  /** Held still on the water: a stream of bubbles rises from her finger. */
  bubbleStream(x: number, y: number) {
    for (let i = 0; i < 2; i++) {
      this.bubbles.push(this.makeBubble(x + art.rnd(-9, 9), y + art.rnd(-4, 4), art.rnd(2, 6)));
    }
    this.glitter(x, y, 1, 8);
  }

  /* ----------------------------------------------------------- the pearl */

  /** Start the tilt game: a pearl to roll into the chest. */
  startPearlGame(count = PEARLS_TO_WIN) {
    this.pearlsWanted = count;
    this.pearlsHome = 0;
    this.spawnPearl();
  }

  stopPearlGame() {
    this.pearl = null;
    this.tilt = { x: 0, y: 0 };
  }

  /** How far the device is tilted, -1 to 1 on each axis. */
  setTilt(x: number, y: number) {
    this.tilt = { x: art.clamp(x, -1, 1), y: art.clamp(y, -1, 1) };
  }

  private spawnPearl() {
    const chestX = art.chestPos().x;
    // start it well away from the chest, or there is nothing to steer
    const x = chestX > this.width / 2 ? art.rnd(this.width * 0.08, this.width * 0.3)
                                      : art.rnd(this.width * 0.7, this.width * 0.92);
    const r = art.clamp(Math.min(this.width, this.height) * 0.026, 12, 20);
    this.pearl = { x, y: this.height * 0.3, vx: 0, vy: 0, r, spin: 0 };
    this.glitter(x, this.height * 0.3, 8, 14);
  }

  private stepPearl(dt: number) {
    const p = this.pearl;
    if (!p) {
      // a beat between pearls, so the last one's fireworks are not stepped on
      if (this.pearlRespawn > 0) {
        this.pearlRespawn -= dt;
        if (this.pearlRespawn <= 0) this.spawnPearl();
      }
      return;
    }

    p.vx += this.tilt.x * PEARL_ACCEL * dt;
    p.vy += (this.tilt.y * PEARL_ACCEL + PEARL_SINK) * dt;
    const drag = Math.max(0, 1 - PEARL_DRAG * dt);
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.spin += p.vx * dt * 0.04;

    // the glass, and the sand it rolls along
    if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.45; }
    if (p.x > this.width - p.r) { p.x = this.width - p.r; p.vx = -Math.abs(p.vx) * 0.45; }
    if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy) * 0.45; }
    const floor = art.sandY(p.x) - p.r * 0.3;
    if (p.y > floor) { p.y = floor; p.vy = -Math.abs(p.vy) * 0.25; }

    if (Math.random() < dt * 10) this.glitter(p.x, p.y, 1, p.r);

    const c = art.chestPos();
    if (Math.abs(p.x - c.x) < 46 && p.y > c.y - 56) this.pearlHome();
  }

  private pearlHome() {
    const c = art.chestPos();
    this.pearlsHome++;
    this.pearl = null;
    this.burst(c.x, c.y - 40);
    this.glitter(c.x, c.y - 40, 20, 30);
    for (let i = 0; i < 5; i++) {
      this.bubbles.push(this.makeBubble(c.x + art.rnd(-20, 20), c.y - 26, art.rnd(3, 8)));
    }
    this.events.onPearl?.(this.pearlsHome, this.pearlsWanted);
    this.pearlRespawn = this.pearlsHome < this.pearlsWanted ? 0.7 : 0;
  }

  /* --------------------------------------------------------- the doorways */

  /** Where the ways out of this scene are, in tank pixels. */
  portals(): { to: SceneId; x: number; y: number; r: number }[] {
    const here = portalsOf(art.currentScene().id);
    const r = art.clamp(Math.min(this.width, this.height) * 0.075, 30, 58);

    // On a tall phone the bottom third is heads-up display and the top is the
    // ticker, so doorways are squeezed into the clear band between them and
    // kept a full radius inside the glass.
    const top = Math.max(this.height * 0.22, 110 + r);
    const bottom = this.height - Math.max(this.height * 0.3, 180 + r);

    return here.map((p) => ({
      to: p.to,
      x: art.clamp(p.at[0] * this.width, r + 8, this.width - r - 8),
      y: bottom > top
        ? art.clamp(p.at[1] * this.height, top, bottom)
        : this.height * 0.45,
      r
    }));
  }

  /** The doorway under a point, if any. Generous, like everything else here. */
  portalAt(x: number, y: number) {
    for (const p of this.portals()) {
      if (Math.hypot(p.x - x, p.y - y) < p.r * 1.25) return p;
    }
    return null;
  }

  /** Begin holding on a doorway. Returns true if there was one there. */
  beginHold(x: number, y: number) {
    const p = this.portalAt(x, y);
    if (!p) return false;
    this.hold = { to: p.to, x: p.x, y: p.y, progress: 0 };
    return true;
  }

  cancelHold() {
    this.hold = null;
  }

  private stepHold(dt: number) {
    const h = this.hold;
    if (!h) return;
    h.progress += dt / TRAVEL_HOLD;
    // a few sparks round the ring so the wait feels like something happening
    if (Math.random() < dt * 30) {
      const a = art.rnd(0, 7);
      const r = Math.max(34, Math.min(this.width, this.height) * 0.075);
      this.glitter(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 1, 4);
    }
    if (h.progress >= 1) {
      const to = h.to;
      this.hold = null;
      this.burst(h.x, h.y);
      this.travel = { to, progress: 0, swapped: false };
    }
  }

  /** The swim between places: dive in, swap at the bottom, surface again. */
  private stepTravel(dt: number) {
    const tr = this.travel;
    if (!tr) return;
    tr.progress += dt / TRAVEL_SECONDS;

    // bubbles rushing past, as though she were the one moving
    if (Math.random() < dt * 90) {
      this.bubbles.push(this.makeBubble(art.rnd(0, this.width), art.rnd(0, this.height), art.rnd(4, 14)));
    }

    if (!tr.swapped && tr.progress >= 0.5) {
      tr.swapped = true;
      // the page changes the scene, which regrows the reef; then the cast that
      // lives there takes over from the one she just swam away from
      this.events.onTravel?.(tr.to);
      this.restock();
      this.hideKey();
    }
    if (tr.progress >= 1) this.travel = null;
  }

  /**
   * How far the cast is thrown outwards as she swims through. Symmetric, so
   * the ones she is leaving rush past her and the ones she is arriving among
   * come sweeping in from the edges.
   */
  private travelPush() {
    return this.travelVeil();
  }

  /** 0 at the surface of the journey, 1 at its deepest. */
  private travelVeil() {
    if (!this.travel) return 0;
    return Math.sin(art.clamp(this.travel.progress, 0, 1) * Math.PI);
  }

  /* ------------------------------------------------------------ keyboard */

  /**
   * Every key does something. Letters float up and wake any creature whose
   * name starts with them, digits drop that many pellets, space feeds the
   * tank, the arrows push a current, and Enter throws a party.
   */
  pressKey(key: string): KeyEffect | null {
    if (key === ' ' || key === 'Spacebar') {
      this.feedEveryone();
      return { kind: 'feed' };
    }
    if (key === 'Enter') {
      for (let i = 0; i < 5; i++) {
        this.burst(art.rnd(this.width * 0.15, this.width * 0.85), art.rnd(this.height * 0.2, this.height * 0.7));
      }
      return { kind: 'burst' };
    }
    if (key === 'Backspace' || key === 'Escape' || key === 'Delete') {
      this.letters.length = 0;
      return { kind: 'clear' };
    }
    if (key.startsWith('Arrow')) {
      const dx = key === 'ArrowRight' ? 9 : key === 'ArrowLeft' ? -9 : 0;
      const dy = key === 'ArrowDown' ? 9 : key === 'ArrowUp' ? -9 : 0;
      // a current across the whole tank, not just under one finger
      for (let i = 0; i < 5; i++) {
        this.swipe(this.width * (0.1 + i * 0.2), this.height * 0.45, dx, dy);
      }
      return { kind: 'current' };
    }
    if (/^[0-9]$/.test(key)) {
      const count = key === '0' ? 10 : Number(key);
      for (let i = 0; i < count; i++) {
        this.dropFood(art.rnd(this.width * 0.1, this.width * 0.9), art.rnd(20, this.height * 0.3), 1);
      }
      return { kind: 'food', count };
    }

    if (key.length !== 1) return null;
    const char = key.toUpperCase();
    if (!/^\p{L}$/u.test(char)) return null;

    this.spawnLetter(char);
    // everyone whose name starts with it pipes up — letter meets animal
    const matched = this.creatures.filter((c) => c.name.toUpperCase().startsWith(char));
    for (const c of matched) {
      c.wiggle = 1.2;
      c.label = 3;
      this.burst(c.x, c.y - c.size * 0.4);
    }
    return { kind: 'letter', char, matched };
  }

  private spawnLetter(char: string) {
    this.letters.push({
      char,
      x: art.rnd(this.width * 0.14, this.width * 0.86),
      y: this.height * 0.8,
      vx: art.rnd(-9, 9),
      vy: art.rnd(-52, -34),
      life: 3.2, maxLife: 3.2,
      rot: art.rnd(-0.28, 0.28), spin: art.rnd(-0.5, 0.5),
      size: art.rnd(40, 58),
      color: art.pick(art.RAINBOW)
    });
    // keep a mashed keyboard from filling the tank
    if (this.letters.length > 14) this.letters.splice(0, this.letters.length - 14);
  }

  /* ------------------------------------------------------------- pointer */

  /**
   * Lean the view. The pointer and the tilt sensor both feed this; it slides
   * the reef layers so the tank has somewhere behind it to look into.
   */
  setLook(x: number, y: number) {
    this.look.x = art.clamp(x, -1, 1);
    this.look.y = art.clamp(y, -1, 1);
  }

  /** Track the mouse, so the drawn cursor can follow it. */
  setPointer(x: number, y: number) {
    const press = this.pointer?.press ?? 0;
    this.pointer = { x, y, over: this.hitTest(x, y), press };
  }

  clearPointer() {
    this.pointer = null;
  }

  /** Kick off the click ripple. */
  pressPointer() {
    if (this.pointer) this.pointer.press = 1;
  }

  dropFood(x: number, y: number, n = 3, kind: FoodKind = this.food) {
    this.poke = { x, y, age: 0 };
    const p = FOOD[kind];
    for (let i = 0; i < n; i++) {
      this.foods.push({
        x: x + art.rnd(-14, 14), y: y + art.rnd(-10, 6),
        vx: art.rnd(-6, 6), vy: art.rnd(2, 10),
        phase: art.rnd(0, 7), life: p.life, kind, rot: art.rnd(0, 7)
      });
    }
    for (let i = 0; i < 3; i++) {
      this.bubbles.push(this.makeBubble(x + art.rnd(-10, 10), y + art.rnd(-6, 6), art.rnd(2, 5)));
    }
  }

  /** Scatter food across the whole tank — the feed button. */
  feedEveryone(kind: FoodKind = this.food) {
    for (let i = 0; i < 14; i++) {
      this.dropFood(art.rnd(this.width * 0.08, this.width * 0.92), art.rnd(20, this.height * 0.35), 1, kind);
    }
  }

  /** Make a creature announce itself — used by the gallery and the find game. */
  highlight(id: string) {
    const c = this.creatures.find((o) => o.id === id);
    if (!c) return null;
    c.wiggle = 1.4;
    c.label = 3.4;
    this.burst(c.x, c.y - c.size * 0.4);
    return c;
  }

  /* --------------------------------------------------------------- step */

  step(dt: number) {
    // the cursor keeps living while the tank is paused, so it still feels alive
    if (this.pointer && this.pointer.press > 0) {
      this.pointer.press = Math.max(0, this.pointer.press - dt * 2.2);
    }
    if (this.paused) return;
    this.time += dt;
    const t = this.time;

    // shoals wander as one body, and swarm on food
    for (const key of Object.keys(this.shoalState)) {
      const s = this.shoalState[key];
      let target: Food | null = null;
      let bestD = Infinity;
      for (const f of this.foods) {
        const d = Math.hypot(f.x - s.x, f.y - s.y);
        if (d < bestD && d < this.width * 0.7) { bestD = d; target = f; }
      }
      if (target) { s.tx = target.x; s.ty = target.y; }
      else {
        s.retarget -= dt;
        if (s.retarget <= 0) {
          s.retarget = art.rnd(2.5, 5);
          s.tx = art.rnd(this.width * 0.1, this.width * 0.9);
          s.ty = art.rnd(this.height * 0.15, art.sandY(s.tx) - 60);
        }
      }
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy) || 1;
      const sp = target ? 110 : 52;
      s.x += (dx / d) * sp * dt;
      s.y += (dy / d) * sp * dt;
    }

    if (this.poke) this.poke.age += dt;
    // recomputed each frame because the cast can be thinned on a small screen
    const scary = this.creatures.filter((c) => c.scary || c.size > 44);

    const ctx: Context = {
      width: this.width, height: this.height, time: t, dt,
      foods: this.foods,
      shoals: this.shoalState,
      all: this.creatures,
      scary,
      poke: this.poke,
      onEat: (c, f) => {
        const i = this.foods.indexOf(f);
        if (i < 0) return;
        this.foods.splice(i, 1);
        c.wiggle = 0.8;
        c.fed++;
        this.fedTotal++;
        this.glitter(f.x, f.y, 4, 8);
        this.bubbles.push(this.makeBubble(c.x + c.dir * c.size * 0.6, c.y - 6, art.rnd(2, 5)));
        this.events.onFeed?.(this.fedTotal);
      }
    };

    for (const c of this.creatures) {
      update(c, ctx);
      if (c.sparkles && this.options.sparkles) {
        c.glitterTimer = (c.glitterTimer ?? 0) - dt;
        if (c.glitterTimer <= 0) {
          c.glitterTimer = c.wiggle > 0 ? 0.04 : 0.12;
          this.glitter(c.x - c.dir * c.size * 1.1, c.y + art.rnd(-c.size * 0.3, c.size * 0.3), 1, c.size * 0.25);
        }
      }
    }

    // particles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.vy * dt;
      b.x += Math.sin(t * b.speed + b.phase) * 0.6;
      if (b.y < -12) this.bubbles.splice(i, 1);
    }
    const wantBubbles = this.options.quality === 'low' ? 8 : this.options.quality === 'medium' ? 12 : 18;
    while (this.bubbles.length < wantBubbles) {
      this.bubbles.push(this.makeBubble(art.rnd(0, this.width), this.height + art.rnd(0, 40)));
    }

    // each kind of food falls its own way: pellets drop, flakes flutter
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      const p = FOOD[f.kind];
      f.vy = Math.min(f.vy + p.pull * dt, p.sink);
      f.y += f.vy * dt;
      f.x += (f.vx + Math.sin(t * 2 + f.phase) * p.sway) * dt * 6;
      f.vx *= 1 - Math.min(1, dt * 1.4);
      f.rot += p.spin * dt * (f.vy / p.sink);
      f.life -= dt;
      f.x = art.clamp(f.x, 6, this.width - 6);
      const floor = art.sandY(f.x) + 4;
      if (f.y > floor) { f.y = floor; f.vy = 0; }
      if (f.life <= 0) this.foods.splice(i, 1);
    }

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.gravity * dt; s.life -= dt;
      if (s.life <= 0) this.sparkles.splice(i, 1);
    }
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.y -= 38 * dt; h.x += h.vx * dt; h.life -= dt;
      if (h.life <= 0) this.hearts.splice(i, 1);
    }
    for (let i = this.letters.length - 1; i >= 0; i--) {
      const l = this.letters[i];
      l.y += l.vy * dt;
      l.x += (l.vx + Math.sin(t * 1.6 + l.rot) * 6) * dt;
      l.vy = Math.max(l.vy - 4 * dt, -70);
      l.rot += l.spin * dt;
      l.life -= dt;
      if (l.life <= 0) this.letters.splice(i, 1);
    }

    this.stepTreasure(dt);
    this.stepPearl(dt);
    this.stepHold(dt);
    this.stepTravel(dt);

    // the wreck's hold glows while anyone is sheltering in it
    if (art.currentScene().wreck) {
      const h = art.wreckHold();
      const inside = this.creatures.some(
        (c) => Math.abs(c.x - h.x) < h.rx && Math.abs(c.y - h.y) < h.ry
      );
      this.wreckLit += ((inside ? 1 : 0) - this.wreckLit) * Math.min(1, dt * 2.5);
    } else {
      this.wreckLit = 0;
    }

    // during the tilt game the whole tank leans, which sells the illusion
    if (this.tilt.x || this.tilt.y) {
      for (const b of this.bubbles) b.x += this.tilt.x * 22 * dt;
      for (const f of this.foods) f.x += this.tilt.x * 26 * dt;
    }
  }

  /** The key hunt: glinting key, opening lid, and the reset that starts it over. */
  private stepTreasure(dt: number) {
    const tr = this.treasure;
    const p = art.chestPos();
    // the lid also stands open while she is rolling pearls into it
    const wantOpen = tr.stage === 'open' || this.pearl !== null || this.pearlRespawn > 0;

    if (tr.stage === 'open') {
      tr.reset -= dt;
      if (tr.reset <= 0) this.hideKey();   // locks itself, key hides somewhere new
    }

    // the lid runs on a spring, so it flies back and rocks into place
    if (wantOpen) {
      tr.swing = Math.min(1, tr.swing + dt / 0.55);
      tr.open = easeOutBack(tr.swing);
      // the hoard keeps twinkling for as long as it is on show
      if (Math.random() < dt * 22) this.glitter(p.x + art.rnd(-26, 26), p.y - 40, 1, 8);
    } else {
      tr.swing = Math.max(0, tr.swing - dt / 0.35);
      tr.open = tr.swing <= 0 ? 0 : easeOutBack(tr.swing);
      // the chest breathes out a bubble now and then
      tr.puff -= dt;
      if (tr.puff <= 0) {
        tr.puff = art.rnd(5, 9);
        this.bubbles.push(this.makeBubble(p.x + art.rnd(-16, 16), p.y - 30, art.rnd(3, 8)));
      }
    }

    // the treasure rises out, hangs in the light, then fades into her collection
    if (tr.lootRise > 0) {
      tr.lootRise = Math.max(0, tr.lootRise - dt / 3.2);
      if (Math.random() < dt * 30) this.glitter(p.x + art.rnd(-20, 20), p.y - 70, 1, 10);
      if (tr.lootRise === 0) tr.loot = null;
    }

    if (tr.stage === 'hidden') {
      tr.hunting += dt;
      tr.glintNow = Math.max(0, tr.glintNow - dt / 1.1);
      tr.glint -= dt;
      if (tr.glint <= 0) {
        // after a minute of looking it winks more often, so nobody gives up
        const impatient = art.clamp(tr.hunting / 45, 0, 1);
        tr.glint = art.rnd(1.6 - impatient * 0.9, 3.2 - impatient * 1.8);
        tr.glintNow = 1;
        this.glitter(tr.keyX, tr.keyY - 6, 2, 7);
      }
    } else {
      tr.glintNow = 0;
    }
  }

  /* --------------------------------------------------------------- paint */

  draw() {
    const g = this.ctx;
    const t = this.time;
    const W = this.width, H = this.height;

    // The art module keeps one module-level context, and anything else that
    // draws (a CreaturePortrait tile, the maze) binds its own. Reclaim it here
    // so a portrait sharing the screen cannot steal the tank's paint.
    art.bindContext(g);

    // The reef is drawn in layers that slide against each other as she moves
    // the pointer or leans the device. Nothing interactive is offset — the
    // chest and the key stay exactly where the hit tests expect them.
    const layer = (depth: number, paint: () => void) => {
      g.save();
      g.translate(this.look.x * PARALLAX * depth, this.look.y * PARALLAX * 0.45 * depth);
      paint();
      g.restore();
    };

    layer(0.05, () => art.reef.water(t));
    // The distant terrain, in layers that slide against one another. The
    // places she can travel to are headlands in the furthest-forward layer,
    // so they parallax with the land rather than floating in front of it.
    art.setHeadlands(this.portals().map((p) => ({
      x: p.x, y: p.y, r: p.r, to: p.to,
      glow: this.hold && this.hold.to === p.to ? this.hold.progress : 0
    })));
    for (let i = 0; i < art.RIDGE_LAYERS; i++) {
      layer(0.05 + i * 0.05, () => art.reef.ridge(i, t));
    }
    // colour and current pointing the way, over the terrain but behind the reef
    layer(0.2, () => art.reef.wayfinding(t));
    // deep water first: silhouettes, then the light net over everything
    layer(0.12, () => art.reef.farFish(t));
    layer(0.18, () => art.reef.caustics(t));
    layer(0.22, () => { art.reef.sand(); art.reef.shells(t); });
    layer(0.34, () => art.reef.kelp(t));
    layer(0.46, () => art.reef.fans(t));
    this.drawHoldRing();
    layer(0.5, () => art.reef.wreck(t, this.wreckLit));
    art.reef.chest(t, this.treasure.open);

    // The key goes in among the reef, not on top of it, so sponges, coral and
    // weed grow over it. Its glint is what gives it away, not its outline.
    if (this.treasure.stage === 'hidden') {
      g.save();
      g.translate(this.treasure.keyX, this.treasure.keyY);
      g.rotate(this.treasure.keyRot);
      g.scale(this.keyScale(), this.keyScale());
      art.reef.key(t, this.treasure.keyPhase, this.treasure.glintNow);
      g.restore();
    }

    layer(0.62, () => art.reef.sponges(t));
    layer(0.74, () => art.reef.coral());
    layer(0.88, () => art.reef.anemones(t));
    layer(1, () => art.reef.seaweed(t));
    art.reef.seeps(t);
    art.reef.motes(t);

    for (const f of this.foods) art.reef.food(f, t);

    // creatures, furthest away first, so near ones genuinely occlude far ones
    const order = [...this.creatures].sort((a, b) => (a.z - b.z) || (a.size - b.size));
    for (const c of order) this.drawCreature(c, t);

    // key in hand: it bobs over the chest, so it is obvious where it goes
    if (this.treasure.stage === 'carried') {
      const p = art.chestPos();
      art.reef.chestBeacon(t);
      g.save();
      g.translate(p.x, p.y - 64 + Math.sin(t * 2.6) * 5);
      g.rotate(Math.sin(t * 1.4) * 0.14);
      const k = this.keyScale() * 1.15;
      g.scale(k, k);
      art.reef.key(t, 0);
      g.restore();
    }

    // bubbles
    for (const b of this.bubbles) {
      g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fill();
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.beginPath(); g.arc(b.x - b.r * 0.32, b.y - b.r * 0.34, Math.max(0.9, b.r * 0.2), 0, 7); g.fill();
    }

    // sparkles
    for (const s of this.sparkles) {
      const a = art.clamp(s.life / s.maxLife, 0, 1);
      g.save(); g.globalAlpha = a; g.translate(s.x, s.y); g.rotate(s.rot + (1 - a) * 2);
      g.fillStyle = s.color;
      const r = s.r * (0.6 + 0.7 * a), q = r * 0.26;
      g.beginPath();
      g.moveTo(0, -r); g.quadraticCurveTo(q, -q, r, 0);
      g.quadraticCurveTo(q, q, 0, r); g.quadraticCurveTo(-q, q, -r, 0);
      g.quadraticCurveTo(-q, -q, 0, -r); g.fill();
      g.restore();
    }

    // hearts
    for (const h of this.hearts) {
      const a = art.clamp(h.life / h.maxLife, 0, 1);
      g.save(); g.globalAlpha = a; g.translate(h.x, h.y); g.scale(h.scale, h.scale);
      g.fillStyle = h.color;
      g.beginPath();
      g.moveTo(0, 4);
      g.bezierCurveTo(-6, -1, -5, -7, 0, -4);
      g.bezierCurveTo(5, -7, 6, -1, 0, 4);
      g.fill(); g.restore();
    }

    // the reward, rising out of the open chest in its own shaft of light
    const tr = this.treasure;
    if (tr.loot && tr.lootRise > 0) {
      const climb = 1 - tr.lootRise;
      const ease = 1 - Math.pow(1 - Math.min(1, climb * 1.8), 3);
      const p = art.chestPos();
      const y = p.y - 40 - ease * 120 + Math.sin(t * 2) * 3;
      const fade = Math.min(1, tr.lootRise * 3);

      g.save();
      g.globalAlpha = fade * 0.3;
      const ray = g.createLinearGradient(p.x, p.y - 200, p.x, p.y);
      ray.addColorStop(0, 'rgba(255,230,128,0)');
      ray.addColorStop(1, 'rgba(255,230,128,.9)');
      g.fillStyle = ray;
      g.beginPath();
      g.moveTo(p.x - 20, p.y - 20); g.lineTo(p.x - 74, p.y - 210);
      g.lineTo(p.x + 74, p.y - 210); g.lineTo(p.x + 20, p.y - 20);
      g.closePath(); g.fill();
      g.restore();

      g.save();
      g.globalAlpha = fade;
      g.translate(p.x, y);
      const s = art.clamp(ease * 1.6, 0.2, 1.25) * fade;
      g.scale(s, s);
      g.rotate(Math.sin(t * 1.5) * 0.12);
      art.reef.loot(tr.loot, t);
      g.restore();
    }

    if (this.pearl) art.reef.pearl(this.pearl, t);

    for (const l of this.letters) art.reef.letter(l);

    // name bubbles last so nothing covers them
    for (const c of this.creatures) if (c.label > 0) this.drawLabel(c);

    // the deep sea is dim and the lagoon is bright; a flat wash sells both
    const tint = art.currentScene().tint;
    if (tint) {
      g.save(); g.globalAlpha = tint.alpha; g.fillStyle = tint.color;
      g.fillRect(0, 0, W, H); g.restore();
    }

    // the journey: a wash of the water she is swimming into, deepest halfway
    const veil = this.travelVeil();
    if (veil > 0) {
      const dest = SCENES[this.travel!.to];
      g.save();
      g.globalAlpha = veil;
      const wash = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
      wash.addColorStop(0, dest.water[1]);
      wash.addColorStop(1, dest.water[4]);
      g.fillStyle = wash;
      g.fillRect(0, 0, W, H);
      // streaks, so it reads as movement rather than a fade to colour
      g.globalAlpha = veil * 0.5;
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 2;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + this.time;
        const r0 = Math.min(W, H) * (0.15 + veil * 0.2);
        const r1 = r0 + Math.min(W, H) * 0.35 * veil;
        g.beginPath();
        g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
        g.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1);
        g.stroke();
      }
      g.restore();
    }

    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,35,55,.32)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);

    // the cursor rides above everything, including the vignette
    const p = this.pointer;
    if (p) art.reef.cursor(t, p.x, p.y, !!p.over, p.press);
  }

  /**
   * The filling ring, and only while she is holding. Nothing marks a vista the
   * rest of the time — it is scenery until she reaches for it.
   */
  private drawHoldRing() {
    const h = this.hold;
    if (!h) return;
    const g = this.ctx;
    const r = art.clamp(Math.min(this.width, this.height) * 0.075, 30, 58);
    g.save();
    g.translate(h.x, h.y);
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = 6;
    g.beginPath(); g.arc(0, 0, r + 10, 0, 7); g.stroke();
    g.strokeStyle = '#ffd166';
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, 0, r + 10, -Math.PI / 2, -Math.PI / 2 + h.progress * Math.PI * 2);
    g.stroke();
    g.restore();
  }

  private drawCreature(c: Creature, t: number) {
    const g = this.ctx;
    // 0 at the back of the tank, 1 pressed against the glass
    const near = (art.clamp(c.z, -1, 1) + 1) / 2;

    const push = this.travelPush();
    g.save();
    // Distant creatures are smaller and paler, the way water works. No blur:
    // canvas `filter` is applied in device space, ignoring the transform, so a
    // blurred creature lands at the canvas origin instead of where it swims.
    g.globalAlpha = 0.34 + near * 0.66;
    if (push > 0) {
      // thrown outwards from the middle of the screen, and bigger as it passes
      const dx = c.x - this.width / 2, dy = c.y - this.height / 2;
      const d = Math.hypot(dx, dy) || 1;
      const reach = push * Math.min(this.width, this.height) * 0.85;
      g.translate(c.x + (dx / d) * reach, c.y + (dy / d) * reach);
      g.scale(1 + push * 0.8, 1 + push * 0.8);
      g.globalAlpha *= 1 - push * 0.7;
    } else {
      g.translate(c.x, c.y);
    }
    g.scale(DEPTH_MIN + near * DEPTH_SPAN, DEPTH_MIN + near * DEPTH_SPAN);

    if (c.mode === 'swim' || c.mode === 'crawl') {
      g.save(); g.globalAlpha = 0.1 * near; g.fillStyle = '#000';
      g.beginPath();
      g.ellipse(0, art.sandY(c.x) + 20 - c.y, c.size * 0.8, c.size * 0.16, 0, 0, 7);
      g.fill(); g.restore();
    }
    g.scale(c.dir, 1);
    if (c.loop) g.rotate((1 - c.loop) * Math.PI * 2);
    else if (c.wiggle > 0) g.rotate(Math.sin(t * 26) * (c.upright ? 0.06 : 0.16) * c.wiggle);
    else if (c.mode === 'swim' && !c.upright) g.rotate(art.clamp(c.vy * c.dir * 0.0022, -0.3, 0.3));
    else if (c.sway) g.rotate(c.sway);
    art.drawCreature(c.kind, c, t);
    g.restore();

    // No wash over the far ones. An ellipse of water colour laid on top can
    // never match a creature's outline, so it reads as an oval stuck behind it
    // — and it was pointless anyway: fading towards the water that is already
    // behind them is exactly what distance does to colour.
  }

  private drawLabel(c: Creature) {
    const g = this.ctx;
    const a = art.clamp(c.label / 2.6, 0, 1);
    g.save();
    g.globalAlpha = Math.min(1, a * 1.6);
    g.font = 'bold 18px "Baloo 2", "Comic Sans MS", "Trebuchet MS", sans-serif';
    const w = g.measureText(c.name).width + 28;
    const x = art.clamp(c.x, w / 2 + 8, this.width - w / 2 - 8);
    const y = Math.max(38, c.y - c.size - 34);
    g.fillStyle = 'rgba(255,255,255,.96)';
    g.beginPath();
    const r = 17;
    g.moveTo(x - w / 2 + r, y - 17);
    g.arcTo(x + w / 2, y - 17, x + w / 2, y + 17, r);
    g.arcTo(x + w / 2, y + 17, x - w / 2, y + 17, r);
    g.arcTo(x - w / 2, y + 17, x - w / 2, y - 17, r);
    g.arcTo(x - w / 2, y - 17, x + w / 2, y - 17, r);
    g.fill();
    g.beginPath();
    g.moveTo(x - 8, y + 15); g.lineTo(x + 8, y + 15); g.lineTo(x, y + 26);
    g.fill();
    g.fillStyle = '#1c3a52';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(c.name, x, y + 1);
    g.restore();
  }
}
