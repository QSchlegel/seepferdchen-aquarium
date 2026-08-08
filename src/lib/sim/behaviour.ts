/**
 * Movement. One function per mode, all of them pure in the sense that they
 * only touch the creature handed to them plus the world context they are given.
 */

import type { Creature, Food, FoodKind } from './types';
import { sandY, clamp, rnd } from '$lib/art';

export interface Context {
  width: number;
  height: number;
  time: number;
  dt: number;
  foods: Food[];
  /** Where each shoal's centre currently is. */
  shoals: Record<string, { x: number; y: number }>;
  /** Called when a creature reaches a pellet. */
  onEat: (c: Creature, f: Food) => void;
  /** Everyone in the tank, for flocking and for keeping an eye on the shark. */
  all: Creature[];
  /** The big ones the little ones would rather avoid. */
  scary: Creature[];
  /** Where she last touched the water, and how long ago. */
  poke: { x: number; y: number; age: number } | null;
}

/** How close a shoal-mate has to be to count as a neighbour. */
const NEIGHBOUR = 70;
/** How close is too close. */
const PERSONAL_SPACE = 26;

/**
 * What a creature will and will not eat, favourite first.
 *
 * Nobody eats everything. Drop greens and the grazers come while the hunters
 * ignore it; drop krill and it is the other way round. That is the whole point
 * of having three foods.
 */
const DIET_BY_KIND: Record<string, FoodKind[]> = {
  // candy floss is magic food: only the unicorns and the merfolk touch it,
  // which makes dropping it feel like a spell rather than a feed
  unicorn:     ['candy', 'greens'],
  unicornLand: ['candy', 'greens'],
  seaUnicorn:  ['candy', 'greens'],
  shark:     ['krill'],
  eel:       ['krill'],
  octopus:   ['krill'],
  crab:      ['krill', 'greens'],
  jelly:     ['krill'],
  star:      ['greens', 'pellet'],
  snail:     ['greens'],
  turtle:    ['greens', 'pellet'],
  seahorse:  ['plankton', 'greens'],
  merperson: ['muesli', 'candy', 'greens'],
  rider:     ['muesli', 'candy', 'greens'],
  parrot:    ['pellet'],
  minnow:    ['pellet', 'krill'],
  fish:      ['pellet', 'krill']
};

/** The only food a vegetarian turns its nose up at. */
const MEATY: FoodKind[] = ['krill'];

export function dietOf(c: Creature): FoodKind[] {
  if (c.eats?.length) return c.eats;

  const base = DIET_BY_KIND[c.kind] ?? ['pellet', 'krill'];
  const withLikes = c.likes ? [c.likes, ...base.filter((k) => k !== c.likes)] : base;

  // `vegetarian` means no meat — NOT greens only. The merfolk are vegetarian
  // and still want their Muschel-Müsli and their candy floss.
  const diet = c.vegetarian ? withLikes.filter((k) => !MEATY.includes(k)) : withLikes;
  return diet.length ? diet : ['greens'];
}

/** What this creature would pick if it had the choice. */
export function favourite(c: Creature): FoodKind {
  return dietOf(c)[0];
}

/**
 * The best food in reach, or null. A creature will cross most of the tank for
 * its favourite but only bothers with the rest when it drifts close by — which
 * is what makes feeding one kind of food look different from another.
 */
function nearestFood(c: Creature, foods: Food[], range: number): { f: Food; d: number } | null {
  const diet = dietOf(c);
  const fav = diet[0];
  let best: Food | null = null;
  let bestScore = Infinity;
  let bestD = 0;
  for (const f of foods) {
    if (!diet.includes(f.kind)) continue;   // it simply will not touch the rest
    const d = Math.hypot(f.x - c.x, f.y - c.y);
    const liked = f.kind === fav;
    if (d > range * (liked ? 1.7 : 1)) continue;
    const score = liked ? d * 0.55 : d;
    if (score < bestScore) { bestScore = score; bestD = d; best = f; }
  }
  return best ? { f: best, d: bestD } : null;
}

function tryEat(c: Creature, hit: { f: Food; d: number } | null, ctx: Context) {
  if (hit && hit.d < c.size * 0.9) ctx.onEat(c, hit.f);
}

/** Steer velocity towards a point, with an easing that feels like water. */
function steer(c: Creature, tx: number, ty: number, speed: number, ease: number, dt: number) {
  const dx = tx - c.x, dy = ty - c.y;
  const d = Math.hypot(dx, dy) || 1;
  const wantX = (dx / d) * speed;
  const wantY = (dy / d) * speed * 0.7;
  c.vx += (wantX - c.vx) * ease * 60 * dt;
  c.vy += (wantY - c.vy) * ease * 60 * dt;
}

/**
 * Anything big and toothy nearby sends a small creature bolting. This is the
 * single biggest thing that makes the tank look alive: the shark does not have
 * to do anything, everyone else just gets out of its way.
 */
function fleeFrom(c: Creature, ctx: Context): { x: number; y: number } | null {
  if (c.scary || c.size > 34) return null;
  let ax = 0, ay = 0, worst = 0;
  for (const p of ctx.scary) {
    const dx = c.x - p.x, dy = c.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    // a bold fish lets it come closer before bolting
    const range = 150 + p.size * 1.6 - (c.bold ?? 0.5) * 50;
    if (d > range) continue;
    const push = 1 - d / range;
    ax += (dx / d) * push;
    ay += (dy / d) * push;
    worst = Math.max(worst, push);
  }
  if (worst <= 0) return null;
  c.flee = Math.max(c.flee ?? 0, worst);
  return { x: ax, y: ay };
}

/**
 * Boids, for the shoals: keep your distance, match your neighbours' heading,
 * and stay with the group. Emergent, so the shoal splits round obstacles and
 * regroups on its own instead of holding a rigid formation.
 */
function flock(c: Creature, ctx: Context) {
  let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0, n = 0;
  for (const o of ctx.all) {
    if (o === c || o.shoal !== c.shoal) continue;
    const dx = o.x - c.x, dy = o.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d > NEIGHBOUR || d === 0) continue;
    n++;
    alignX += o.vx; alignY += o.vy;
    cohX += o.x; cohY += o.y;
    if (d < PERSONAL_SPACE) {
      sepX -= (dx / d) * (1 - d / PERSONAL_SPACE);
      sepY -= (dy / d) * (1 - d / PERSONAL_SPACE);
    }
  }
  if (!n) return { sepX, sepY, alignX: 0, alignY: 0, cohX: 0, cohY: 0 };
  return {
    sepX, sepY,
    alignX: alignX / n - c.vx, alignY: alignY / n - c.vy,
    cohX: cohX / n - c.x, cohY: cohY / n - c.y
  };
}

/** Keep a swimmer inside the glass and off the sand. */
function bounds(c: Creature, ctx: Context) {
  const m = c.size * 1.1;
  if (c.x < m) { c.x = m; c.vx = Math.abs(c.vx); c.tx = rnd(ctx.width * 0.4, ctx.width * 0.9); }
  if (c.x > ctx.width - m) {
    c.x = ctx.width - m; c.vx = -Math.abs(c.vx); c.tx = rnd(ctx.width * 0.1, ctx.width * 0.6);
  }
  if (c.y < m * 0.8) { c.y = m * 0.8; c.vy = Math.abs(c.vy); }

  const clear = c.size * (c.upright ? 1.0 : 0.5);
  const floor = sandY(c.x) - clear;
  if (c.y > floor) {
    c.y = floor;
    if (c.vy > 0) c.vy = -Math.abs(c.vy) * 0.6;

    // Slide along the slope as well as lifting out of it. The terrain has
    // steep-sided outcrops now, and correcting only downwards left a swimmer
    // pressed into the rock with its own steering driving it straight back in
    // — which is exactly what looked like getting stuck.
    // sandY grows downwards, so the larger side is the way out.
    const slope = (sandY(c.x + 6) - sandY(c.x - 6)) / 12;
    c.x = clamp(c.x + slope * 9, m, ctx.width - m);
    c.vx += slope * 26;

    // and stop it aiming at a point buried in the hill
    if (c.ty !== null && c.tx !== null && c.ty > sandY(c.tx) - clear) {
      c.tx = rnd(ctx.width * 0.1, ctx.width * 0.9);
      c.ty = rnd(ctx.height * 0.12, sandY(c.tx) - clear - 40);
    }
  }
}

const MODES: Record<string, (c: Creature, ctx: Context) => void> = {
  swim(c, ctx) {
    // running away beats everything else
    const escape = fleeFrom(c, ctx);
    if (escape) {
      c.tx = c.x + escape.x * 300;
      c.ty = c.y + escape.y * 300;
      steer(c, c.tx, c.ty, c.speed * 2.6, 0.1, ctx.dt);
      c.x += c.vx * ctx.dt; c.y += c.vy * ctx.dt;
      bounds(c, ctx);
      if (Math.abs(c.vx) > 4) c.dir = c.vx > 0 ? 1 : -1;
      return;
    }

    const hit = nearestFood(c, ctx.foods, ctx.width * 0.55);
    // a bold creature comes to see what she just did
    const nosy = !hit && ctx.poke && ctx.poke.age < 2.2 && (c.bold ?? 0.5) > 0.55
      && Math.hypot(ctx.poke.x - c.x, ctx.poke.y - c.y) < ctx.width * 0.45;

    if (hit) {
      c.tx = hit.f.x; c.ty = hit.f.y;
    } else if (nosy) {
      c.tx = ctx.poke!.x; c.ty = ctx.poke!.y;
    } else {
      c.retarget -= ctx.dt;
      if (c.retarget <= 0 || c.tx === null) {
        c.retarget = rnd(2.2, 5);
        c.tx = rnd(ctx.width * 0.06, ctx.width * 0.94);
        c.ty = rnd(ctx.height * 0.1, sandY(c.tx) - 60);
        if (c.kind === 'shark') c.ty = rnd(ctx.height * 0.1, ctx.height * 0.55);
        // tired creatures drop down to potter about near the reef
        if ((c.energy ?? 1) < 0.3) c.ty = sandY(c.tx) - rnd(40, 110);
      }
    }

    // resting is what stops all thirty of them cruising at once
    const rested = 0.55 + (c.energy ?? 1) * 0.45;
    const chase = hit ? 1.8 : nosy ? 1.3 : rested;
    steer(c, c.tx!, c.ty!, c.speed * chase, hit ? 0.06 : 0.022, ctx.dt);
    c.vy += Math.sin(ctx.time * 1.3 + c.phase) * 4 * ctx.dt;
    c.x += c.vx * ctx.dt; c.y += c.vy * ctx.dt;
    bounds(c, ctx);
    if (Math.abs(c.vx) > 4) c.dir = c.vx > 0 ? 1 : -1;
    tryEat(c, hit, ctx);
  },

  school(c, ctx) {
    const centre = ctx.shoals[c.shoal!] ?? { x: ctx.width / 2, y: ctx.height / 2 };
    const f = flock(c, ctx);
    const escape = fleeFrom(c, ctx);

    // the shoal centre is a loose pull, not a slot to be held
    const toCentre = { x: centre.x - c.x, y: centre.y - c.y };
    const panic = escape ? 5 : 0;

    let ax = f.sepX * 190 + f.alignX * 0.55 + f.cohX * 0.9 + toCentre.x * 0.5;
    let ay = f.sepY * 190 + f.alignY * 0.55 + f.cohY * 0.9 + toCentre.y * 0.5;
    if (escape) { ax += escape.x * 900; ay += escape.y * 900; }

    const d = Math.hypot(ax, ay) || 1;
    const sp = Math.min(c.speed * (1 + panic * 0.35), d * 2.4);
    const ease = escape ? 5.5 : 3.2;
    c.vx += ((ax / d) * sp - c.vx) * ease * ctx.dt;
    c.vy += ((ay / d) * sp - c.vy) * ease * ctx.dt;
    c.x += c.vx * ctx.dt; c.y += c.vy * ctx.dt;
    bounds(c, ctx);
    if (Math.abs(c.vx) > 3) c.dir = c.vx > 0 ? 1 : -1;
    tryEat(c, nearestFood(c, ctx.foods, c.size * 4), ctx);
  },

  follow(c, ctx) {
    const L = c.leaderRef;
    if (!L) { MODES.swim(c, ctx); return; }
    const off = c.followOffset ?? { x: -40, y: 0 };
    const tx = L.x + off.x * L.dir + Math.sin(ctx.time * 0.9 + c.phase) * 10;
    const ty = L.y + off.y + Math.cos(ctx.time * 1.2 + c.phase) * 8;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
    const sp = Math.min(c.speed, d * 2.5);
    c.vx += ((dx / d) * sp - c.vx) * 2.6 * ctx.dt;
    c.vy += ((dy / d) * sp - c.vy) * 2.6 * ctx.dt;
    c.x += c.vx * ctx.dt; c.y += c.vy * ctx.dt;
    if (Math.abs(c.vx) > 3) c.dir = c.vx > 0 ? 1 : -1;
    tryEat(c, nearestFood(c, ctx.foods, c.size * 5), ctx);
  },

  drift(c, ctx) {
    c.y -= (12 + Math.sin(ctx.time * 1.8 + c.phase) * 10) * ctx.dt;
    c.x += Math.sin(ctx.time * 0.55 + c.phase) * 0.55;
    if (c.y < -c.size * 2) { c.y = sandY(c.x) - 10; c.x = rnd(30, ctx.width - 30); }
    c.dir = 1;
  },

  crawl(c, ctx) {
    if (c.crawlDir === undefined) c.crawlDir = Math.random() < 0.5 ? -1 : 1;
    c.x += c.crawlDir * c.speed * ctx.dt * (c.wiggle > 0 ? 2 : 1);
    if (c.x < 34) { c.x = 34; c.crawlDir = 1; }
    if (c.x > ctx.width - 34) { c.x = ctx.width - 34; c.crawlDir = -1; }
    if (Math.random() < 0.004) c.crawlDir = (c.crawlDir * -1) as 1 | -1;
    c.y = sandY(c.x) + 6 + Math.sin(ctx.time * 6 + c.phase) * 1.5;
    c.sway = Math.sin(ctx.time * 1.6 + c.phase) * 0.05;
    c.dir = c.crawlDir;
  },

  bob(c, ctx) {
    if (c.homeX === undefined) c.homeX = clamp(c.x, c.size * 1.6, ctx.width - c.size * 1.6);
    c.x = c.homeX + Math.sin(ctx.time * 0.5 + c.phase) * 22;
    c.y = sandY(c.x) - 70 + Math.sin(ctx.time * 1.1 + c.phase) * 18;
    c.sway = Math.sin(ctx.time * 0.8 + c.phase) * 0.07;
    c.dir = Math.cos(ctx.time * 0.5 + c.phase) > 0 ? 1 : -1;
  },

  /**
   * Nothing in water is actually still. A resting starfish still rocks with
   * the swell and shuffles a little along the sand — the alternative is a
   * sticker pasted on the floor, which is what this used to look like.
   */
  static(c, ctx) {
    if (c.homeX === undefined) c.homeX = c.x;
    c.homeX = clamp(c.homeX, 30, ctx.width - 30);
    c.x = c.homeX + Math.sin(ctx.time * 0.42 + c.phase) * 7;
    c.y = sandY(c.x) + 22 + Math.sin(ctx.time * 0.85 + c.phase * 1.7) * 2.5;
    c.sway = Math.sin(ctx.time * 0.55 + c.phase) * 0.09;
  }
};

/**
 * Drift through the depth of the tank. Slow and aimless on purpose: depth is
 * atmosphere, not gameplay, and a fish that lunges at the glass is unsettling.
 * Sea-floor creatures keep the depth they were placed at.
 */
function drift(c: Creature, ctx: Context) {
  if (c.mode === 'crawl' || c.mode === 'static' || c.mode === 'bob') return;
  c.retargetZ = (c.retargetZ ?? 0) - ctx.dt;
  if (c.retargetZ <= 0) {
    c.retargetZ = rnd(4, 9);
    c.tz = rnd(-0.85, 0.85);
  }
  c.vz += (Math.sign(c.tz - c.z) * 0.22 - c.vz) * 1.4 * ctx.dt;
  c.z = clamp(c.z + c.vz * ctx.dt, -0.95, 0.95);
}

/** Advance one creature by dt. */
export function update(c: Creature, ctx: Context) {
  if (c.wiggle > 0) c.wiggle -= ctx.dt;
  if (c.label > 0) c.label -= ctx.dt;
  if (c.loop) c.loop = Math.max(0, c.loop - ctx.dt * 1.5);
  if (c.flee) c.flee = Math.max(0, c.flee - ctx.dt * 0.8);

  // Energy ebbs while swimming hard and comes back while pottering, so the
  // tank breathes instead of everyone cruising at the same pace all day.
  const effort = Math.hypot(c.vx, c.vy) / Math.max(1, c.speed);
  c.energy = clamp((c.energy ?? 1) + (effort > 1.1 ? -0.09 : 0.05) * ctx.dt, 0.15, 1);

  drift(c, ctx);
  (MODES[c.mode] ?? MODES.swim)(c, ctx);
}
