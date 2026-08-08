import { describe, expect, it } from 'vitest';
import { LOOT, World } from './world';
import { chestPos, sandY, setScene, setTank, wrapDelta } from '$lib/art';
import { stubContext } from '../../test/stub-canvas';
import type { Creature, CreatureSpec } from './types';

const SPECS: CreatureSpec[] = [
  { id: 'a', name: 'A', kind: 'fish', size: 24, speed: 60 },
  { id: 'b', name: 'B', kind: 'fish', size: 20, speed: 60 },
  { id: 'leader', name: 'L', kind: 'seahorse', size: 40, upright: true },
  { id: 'foal', name: 'F', kind: 'seahorse', size: 16, mode: 'follow', leader: 'leader',
    followOffset: { x: -30, y: 0 } },
  { id: 'crab', name: 'C', kind: 'crab', size: 20, mode: 'crawl', speed: 30 }
];

function makeWorld() {
  const w = new World(stubContext(), SPECS, { quality: 'high', sparkles: true });
  w.resize(800, 600);
  return w;
}

/** Run the sim for a while at a fixed step. */
function run(w: World, seconds: number, dt = 1 / 60) {
  for (let i = 0; i < seconds / dt; i++) w.step(dt);
}

describe('World', () => {
  it('stocks the tank from the specs', () => {
    const w = makeWorld();
    expect(w.creatures).toHaveLength(SPECS.length);
    expect(w.creatures.map((c) => c.id)).toContain('leader');
  });

  it('resolves follower leaders', () => {
    const w = makeWorld();
    const foal = w.creatures.find((c) => c.id === 'foal')!;
    expect(foal.leaderRef?.id).toBe('leader');
  });

  it('keeps every creature in the sea', () => {
    const w = makeWorld();
    run(w, 30);
    for (const c of w.creatures) {
      // the sea loops, so x is anywhere in world space — but always wrapped,
      // never drifting off to infinity
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(w.worldWidth);
      // vertically it is still a tank, with a surface and a floor
      expect(c.y).toBeGreaterThan(-c.size);
      expect(c.y).toBeLessThan(600 + c.size * 2);
      expect(Number.isFinite(c.x)).toBe(true);
      expect(Number.isFinite(c.y)).toBe(true);
    }
  });

  it('lets fish find and eat food', () => {
    const w = makeWorld();
    const fish = w.creatures.find((c) => c.id === 'a')!;
    w.dropFood(fish.x + 40, fish.y, 1);
    const before = w.foods.length;
    expect(before).toBe(1);
    run(w, 12);
    expect(w.foods.length).toBeLessThan(before);
    expect(w.fedTotal).toBeGreaterThan(0);
  });

  it('a tap on a creature wakes it, a tap on water drops food', () => {
    const w = makeWorld();
    const c = w.creatures[0];
    const hit = w.tap(c.x, c.y);
    expect(hit?.id).toBe(c.id);
    expect(hit!.label).toBeGreaterThan(0);

    const foodBefore = w.foods.length;
    // a corner the creatures are steered away from
    const miss = w.tap(4, 4);
    expect(miss).toBeNull();
    expect(w.foods.length).toBeGreaterThan(foodBefore);
  });

  it('keeps the crab on the sea floor', () => {
    const w = makeWorld();
    run(w, 10);
    const crab = w.creatures.find((c) => c.id === 'crab')!;
    expect(crab.y).toBeGreaterThan(600 * 0.7);
  });

  it('pauses cleanly', () => {
    const w = makeWorld();
    const c = w.creatures[0];
    w.paused = true;
    const x = c.x;
    run(w, 5);
    expect(c.x).toBe(x);
  });

  it('scales creatures down on a small screen', () => {
    const small = new World(stubContext(), SPECS, { quality: 'low', sparkles: false });
    small.resize(390, 700);
    const big = makeWorld();
    const a = small.creatures.find((c) => c.id === 'a')!;
    const b = big.creatures.find((c) => c.id === 'a')!;
    expect(a.size).toBeLessThan(b.size);
  });
});

describe('hands in the water', () => {
  it('a swipe shoves nearby swimmers along with it', () => {
    const w = makeWorld();
    const c = w.creatures.find((o) => o.mode === 'swim')!;
    c.vx = 0; c.vy = 0;
    w.swipe(c.x, c.y, 12, 0);
    expect(c.vx).toBeGreaterThan(0);
  });

  it('a swipe leaves the sea floor alone', () => {
    const w = makeWorld();
    const crab = w.creatures.find((c) => c.id === 'crab')!;
    crab.vx = 0;
    w.swipe(crab.x, crab.y, 12, 0);
    expect(crab.vx).toBe(0);
  });

  it('three taps on one creature set it somersaulting', () => {
    const w = makeWorld();
    const c = w.creatures[0];
    w.tap(c.x, c.y);
    expect(c.loop).toBeFalsy();
    w.tap(c.x, c.y);
    expect(c.loop).toBeFalsy();
    w.tap(c.x, c.y);
    expect(c.loop).toBe(1);

    run(w, 1.5);
    expect(c.loop).toBe(0);
  });

  it('forgets the tap chain if she takes too long', () => {
    const w = makeWorld();
    const c = w.creatures[0];
    w.tap(c.x, c.y);
    w.tap(c.x, c.y);
    run(w, 2);
    w.tap(c.x, c.y);
    expect(c.loop).toBeFalsy();
  });

  it('holding still blows bubbles', () => {
    const w = makeWorld();
    const before = w.bubbles.length;
    w.bubbleStream(300, 300);
    expect(w.bubbles.length).toBeGreaterThan(before);
  });

  it('tracks the mouse for the drawn cursor', () => {
    const w = makeWorld();
    expect(w.pointer).toBeNull();
    w.setPointer(w.treasure.keyX, w.treasure.keyY);
    expect(w.pointer?.over).toBe('key');
    w.pressPointer();
    expect(w.pointer?.press).toBe(1);
    run(w, 1);
    expect(w.pointer?.press).toBe(0);
    w.clearPointer();
    expect(w.pointer).toBeNull();
  });
});

describe('animal sense', () => {
  const CAST2: CreatureSpec[] = [
    { id: 'shark', name: 'S', kind: 'shark', size: 56, speed: 36, scary: true },
    { id: 'tiny', name: 'T', kind: 'fish', size: 18, speed: 60 },
    { id: 'f1', name: 'F1', kind: 'fish', size: 12, speed: 60, mode: 'school', shoal: 'a' },
    { id: 'f2', name: 'F2', kind: 'fish', size: 12, speed: 60, mode: 'school', shoal: 'a' },
    { id: 'f3', name: 'F3', kind: 'fish', size: 12, speed: 60, mode: 'school', shoal: 'a' }
  ];
  const build = () => {
    const w = new World(stubContext(), CAST2, { quality: 'high', sparkles: false });
    w.resize(900, 600);
    return w;
  };

  it('sends a small fish bolting from the shark', () => {
    const w = build();
    const shark = w.creatures.find((c) => c.id === 'shark')!;
    const tiny = w.creatures.find((c) => c.id === 'tiny')!;
    tiny.x = 470; tiny.y = 300; tiny.vx = 0; tiny.vy = 0;
    const gap0 = 20;

    // hold the shark still, or its own wandering decides the outcome
    for (let i = 0; i < 60 * 1.2; i++) {
      shark.x = 450; shark.y = 300; shark.vx = 0; shark.vy = 0;
      w.step(1 / 60);
    }
    expect(Math.hypot(tiny.x - shark.x, tiny.y - shark.y)).toBeGreaterThan(gap0);
    expect(tiny.flee).toBeGreaterThan(0);
  });

  it('does not frighten the shark with its own reflection', () => {
    const w = build();
    const shark = w.creatures.find((c) => c.id === 'shark')!;
    run(w, 2);
    expect(shark.flee ?? 0).toBe(0);
  });

  it('keeps a shoal together but not on top of each other', () => {
    const w = build();
    const school = w.creatures.filter((c) => c.shoal === 'a');
    for (const c of school) { c.x = 400; c.y = 300; }   // start them piled up
    run(w, 6);
    const gaps: number[] = [];
    for (let i = 0; i < school.length; i++) {
      for (let j = i + 1; j < school.length; j++) {
        gaps.push(Math.hypot(school[i].x - school[j].x, school[i].y - school[j].y));
      }
    }
    expect(Math.min(...gaps)).toBeGreaterThan(3);     // they spread out
    expect(Math.max(...gaps)).toBeLessThan(400);      // but stay a shoal
  });

  it('tires from a real sprint and recovers once the danger passes', () => {
    const w = build();
    const shark = w.creatures.find((c) => c.id === 'shark')!;
    const tiny = w.creatures.find((c) => c.id === 'tiny')!;
    tiny.energy = 1;

    // hold the shark on top of it, so it keeps bolting at full tilt
    for (let i = 0; i < 60 * 3; i++) {
      shark.x = tiny.x + 20; shark.y = tiny.y;
      w.step(1 / 60);
    }
    const tired = tiny.energy!;
    expect(tired).toBeLessThan(1);

    // send the shark to the far corner and let the little one catch its breath
    shark.x = 20; shark.y = 20;
    shark.mode = 'static';
    run(w, 8);
    expect(tiny.energy!).toBeGreaterThan(tired);
    expect(tiny.energy!).toBeLessThanOrEqual(1);
  });

  it('remembers where she last touched the water', () => {
    const w = build();
    expect(w.poke).toBeNull();
    w.dropFood(300, 200, 1);
    expect(w.poke).toEqual({ x: 300, y: 200, age: 0 });
    run(w, 1);
    expect(w.poke!.age).toBeGreaterThan(0.9);
  });
});

describe('travelling to another place', () => {
  it('offers doorways in the background', () => {
    const w = makeWorld();
    const ports = w.portals();
    expect(ports.length).toBeGreaterThan(0);
    for (const p of ports) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(800);
      expect(p.r).toBeGreaterThan(20);
    }
  });

  it('keeps doorways clear of the heads-up display on a phone', () => {
    for (const [W, H] of [[390, 844], [360, 640], [430, 932], [820, 1180]] as const) {
      const w = new World(stubContext(), SPECS, { quality: 'low', sparkles: false });
      w.resize(W, H);
      for (const p of w.portals()) {
        // fully inside the glass
        expect(p.x - p.r).toBeGreaterThanOrEqual(0);
        expect(p.x + p.r).toBeLessThanOrEqual(W);
        // clear of the ticker at the top and the food tray at the bottom
        expect(p.y - p.r).toBeGreaterThan(90);
        expect(p.y + p.r).toBeLessThan(H - 170);
      }
    }
  });

  it('needs a hold, not a tap', () => {
    const w = makeWorld();
    const p = w.portals()[0];
    let went: string | null = null;
    (w as unknown as { events: { onTravel?: (t: string) => void } }).events.onTravel =
      (to) => (went = to);

    expect(w.beginHold(p.x, p.y)).toBe(true);
    run(w, 0.3);
    expect(went).toBeNull();          // too soon
    // the hold finishes, then the journey itself takes a moment
    run(w, 2.2);
    expect(went).toBe(p.to);
  });

  it('lets go without travelling', () => {
    const w = makeWorld();
    const p = w.portals()[0];
    let went: string | null = null;
    (w as unknown as { events: { onTravel?: (t: string) => void } }).events.onTravel =
      (to) => (went = to);
    w.beginHold(p.x, p.y);
    run(w, 0.4);
    w.cancelHold();
    run(w, 3);
    expect(went).toBeNull();
    expect(w.hold).toBeNull();
  });

  it('ignores a hold on open water', () => {
    const w = makeWorld();
    expect(w.beginHold(4, 4)).toBe(false);
    expect(w.hold).toBeNull();
  });

  it('does not drop food through a doorway', () => {
    const w = makeWorld();
    for (const c of w.creatures) { c.x = -400; c.y = -400; }
    const p = w.portals()[0];
    const before = w.foods.length;
    expect(w.tap(p.x, p.y)).toBeNull();
    expect(w.foods.length).toBe(before);
  });
});

describe('nothing stands still', () => {
  const RESTERS: CreatureSpec[] = [
    { id: 'star', name: 'S', kind: 'star', size: 20, mode: 'static' },
    { id: 'crab', name: 'C', kind: 'crab', size: 20, mode: 'crawl', speed: 30 },
    { id: 'anem', name: 'A', kind: 'jelly', size: 18, mode: 'bob' }
  ];

  it('rocks even the creatures that sit on the sand', () => {
    const w = new World(stubContext(), RESTERS, { quality: 'low', sparkles: false });
    w.resize(800, 600);
    const seen: Record<string, Set<string>> = { star: new Set(), crab: new Set(), anem: new Set() };
    for (let i = 0; i < 60 * 8; i++) {
      w.step(1 / 60);
      for (const c of w.creatures) {
        seen[c.id].add(`${c.x.toFixed(1)},${c.y.toFixed(1)}`);
      }
    }
    // each of them visits many distinct positions rather than one
    for (const id of Object.keys(seen)) expect(seen[id].size).toBeGreaterThan(50);
  });

  it('gives the resters a rock to draw with', () => {
    const w = new World(stubContext(), RESTERS, { quality: 'low', sparkles: false });
    w.resize(800, 600);
    run(w, 3);
    const star = w.creatures.find((c) => c.id === 'star')!;
    expect(star.sway).toBeDefined();
    expect(Math.abs(star.sway!)).toBeLessThan(0.2);
  });

  it('keeps a sitting creature on its own patch of sand', () => {
    const w = new World(stubContext(), RESTERS, { quality: 'low', sparkles: false });
    w.resize(800, 600);
    const star = w.creatures.find((c) => c.id === 'star')!;
    const home = star.x;
    run(w, 30);
    // distance round the loop: the sea has no ends, so a patch near zero is
    // not a whole world away from a position just before the seam
    expect(Math.abs(wrapDelta(home, star.x))).toBeLessThan(20);
  });
});

describe('travelling between places', () => {
  it('swims across rather than cutting', () => {
    const w = makeWorld();
    const p = w.portals()[0];
    let arrived: string | null = null;
    (w as unknown as { events: { onTravel?: (t: string) => void } }).events.onTravel =
      (to) => (arrived = to);

    w.beginHold(p.x, p.y);
    run(w, 1.3);                       // hold completes
    expect(w.travel).not.toBeNull();
    expect(arrived).toBeNull();        // the place has not changed yet

    run(w, 0.7);                       // past the deepest point
    expect(arrived).toBe(p.to);        // swapped where the wash is thickest

    run(w, 1.2);
    expect(w.travel).toBeNull();       // and surfaced again
  });
});

describe('who lives where', () => {
  const MIXED: CreatureSpec[] = [
    { id: 'r1', name: 'R', kind: 'merperson', size: 40, upright: true, group: 'rangers' },
    { id: 'u1', name: 'U', kind: 'seaUnicorn', size: 34, group: 'unicorns' },
    { id: 'f1', name: 'F', kind: 'fish', size: 22, group: 'fish' },
    { id: 'x1', name: 'X', kind: 'eel', size: 24, group: 'friends' }
  ];

  it('stocks only the residents of the current place', () => {
    setScene('lagune');   // rangers, unicorns, seahorses, shoals — no eels
    const w = new World(stubContext(), MIXED, { quality: 'low', sparkles: false });
    w.resize(900, 700);
    const ids = w.creatures.map((c) => c.id).sort();
    expect(ids).toContain('r1');
    expect(ids).toContain('u1');
    expect(ids).not.toContain('x1');
    setScene('riff');
  });

  it('swaps the cast when she arrives somewhere new', () => {
    setScene('riff');
    const w = new World(stubContext(), MIXED, { quality: 'low', sparkles: false });
    w.resize(900, 700);
    expect(w.creatures.map((c) => c.id)).toContain('x1');

    setScene('lagune');
    w.restock();
    expect(w.creatures.map((c) => c.id)).not.toContain('x1');
    expect(w.creatures.length).toBeGreaterThan(0);
    setScene('riff');
  });

  it('takes her own creatures with her everywhere', () => {
    const withMine: CreatureSpec[] = [
      ...MIXED,
      { id: 'mine-1', name: 'Blubbi', kind: 'fish', size: 26, group: 'mine' }
    ];
    for (const place of ['riff', 'kelpwald', 'tiefsee', 'wrack', 'lagune'] as const) {
      setScene(place);
      const w = new World(stubContext(), withMine, { quality: 'low', sparkles: false });
      w.resize(900, 700);
      expect(w.creatures.map((c) => c.id)).toContain('mine-1');
    }
    setScene('riff');
  });

  it('gives every place its own sea floor', () => {
    setTank(900, 700);
    const sample = () => {
      const out: number[] = [];
      for (let x = 0; x < 900; x += 30) out.push(sandY(x));
      return out;
    };
    setScene('riff');
    const a = sample();
    setScene('tiefsee');
    const b = sample();
    setScene('riff');
    // not merely shifted: the shape itself differs
    const diffs = a.map((v, i) => v - b[i]);
    const spread = Math.max(...diffs) - Math.min(...diffs);
    expect(spread).toBeGreaterThan(8);
  });
});

describe('depth', () => {
  it('spreads the cast through the tank rather than onto one pane', () => {
    const w = makeWorld();
    const zs = w.creatures.map((c) => c.z);
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...zs)).toBeLessThanOrEqual(1);
    expect(new Set(zs).size).toBeGreaterThan(1);
  });

  it('drifts swimmers through depth but leaves the sea floor alone', () => {
    const w = makeWorld();
    const fish = w.creatures.find((c) => c.mode === 'swim')!;
    const crab = w.creatures.find((c) => c.id === 'crab')!;
    const z0 = { fish: fish.z, crab: crab.z };
    run(w, 20);
    expect(fish.z).not.toBe(z0.fish);
    expect(crab.z).toBe(z0.crab);
    expect(Math.abs(fish.z)).toBeLessThanOrEqual(1);
  });

  it('clamps the lean that drives the parallax', () => {
    const w = makeWorld();
    w.setLook(-4, 7);
    expect(w.look).toEqual({ x: -1, y: 1 });
  });
});

describe('the chest reward', () => {
  it('hands out a treasure that rises and then fades', () => {
    const w = makeWorld();
    for (const c of w.creatures) { c.x = -400; c.y = -400; }
    w.tap(w.treasure.keyX, w.treasure.keyY);
    const p = chestPos();
    w.tap(p.x, p.y - 20);

    expect(w.treasure.loot).not.toBeNull();
    expect(LOOT).toContain(w.treasure.loot);
    expect(w.treasure.lootRise).toBe(1);

    run(w, 4);
    expect(w.treasure.lootRise).toBe(0);
    expect(w.treasure.loot).toBeNull();
  });

  it('throws the lid past open before it settles', () => {
    const w = makeWorld();
    for (const c of w.creatures) { c.x = -400; c.y = -400; }
    w.tap(w.treasure.keyX, w.treasure.keyY);
    const p = chestPos();
    w.tap(p.x, p.y - 20);

    let peak = 0;
    for (let i = 0; i < 40; i++) { run(w, 1 / 60); peak = Math.max(peak, w.treasure.open); }
    expect(peak).toBeGreaterThan(1);      // the overshoot
    run(w, 1);
    expect(w.treasure.open).toBe(1);      // and it settles back
  });
});

describe('the tilt game', () => {
  it('starts a pearl away from the chest', () => {
    const w = makeWorld();
    w.startPearlGame();
    expect(w.pearl).not.toBeNull();
    expect(Math.abs(w.pearl!.x - chestPos().x)).toBeGreaterThan(100);
  });

  it('rolls the pearl the way she leans', () => {
    const w = makeWorld();
    w.startPearlGame();
    const x0 = w.pearl!.x;
    w.setTilt(1, 0);
    run(w, 0.5);
    expect(w.pearl!.x).toBeGreaterThan(x0);
  });

  it('clamps a wild tilt reading', () => {
    const w = makeWorld();
    w.setTilt(-9, 12);
    expect(w.tilt).toEqual({ x: -1, y: 1 });
  });

  it('counts a pearl home and sets up the next one', () => {
    const w = makeWorld();
    w.startPearlGame();
    const c = chestPos();
    w.pearl!.x = c.x;
    w.pearl!.y = c.y - 20;
    run(w, 1 / 60);
    expect(w.pearlsHome).toBe(1);
    run(w, 1.2);
    expect(w.pearl).not.toBeNull();   // a fresh one has rolled in
  });

  it('finishes after the last pearl, leaving none behind', () => {
    const w = makeWorld();
    w.startPearlGame(2);
    const c = chestPos();
    for (let i = 0; i < 2; i++) {
      run(w, 1.2);
      w.pearl!.x = c.x;
      w.pearl!.y = c.y - 20;
      run(w, 1 / 60);
    }
    expect(w.pearlsHome).toBe(2);
    run(w, 2);
    expect(w.pearl).toBeNull();
  });

  it('holds the chest open while the game runs', () => {
    const w = makeWorld();
    w.startPearlGame();
    run(w, 1);
    expect(w.treasure.open).toBe(1);
    w.stopPearlGame();
    run(w, 1);
    expect(w.treasure.open).toBe(0);
  });
});

describe('the keyboard', () => {
  it('floats a letter up and calls out the creatures it belongs to', () => {
    const w = makeWorld();
    const e = w.pressKey('a');
    expect(e).toEqual(expect.objectContaining({ kind: 'letter', char: 'A' }));
    expect(w.letters[0].char).toBe('A');
    // spec 'a' is named 'A', so it should have piped up
    expect((e as { matched: { id: string }[] }).matched.map((c) => c.id)).toContain('a');
  });

  it('takes umlauts, and ignores keys that are not letters', () => {
    const w = makeWorld();
    expect(w.pressKey('ä')).toEqual(expect.objectContaining({ kind: 'letter', char: 'Ä' }));
    expect(w.pressKey('F1')).toBeNull();
    expect(w.pressKey('Shift')).toBeNull();
  });

  it('drops one pellet per digit, and feeds on space', () => {
    const w = makeWorld();
    w.pressKey('3');
    expect(w.foods).toHaveLength(3);
    w.foods.length = 0;
    w.pressKey(' ');
    expect(w.foods.length).toBeGreaterThan(3);
  });

  it('pushes a current with the arrows', () => {
    const w = makeWorld();
    const c = w.creatures.find((o) => o.mode === 'swim')!;
    c.x = 400; c.y = 270; c.vx = 0;
    w.pressKey('ArrowRight');
    expect(c.vx).toBeGreaterThan(0);
  });

  it('clears the letters, and does not let them pile up forever', () => {
    const w = makeWorld();
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') w.pressKey(ch);
    expect(w.letters.length).toBeLessThanOrEqual(14);
    w.pressKey('Backspace');
    expect(w.letters).toHaveLength(0);
  });

  it('lets the letters drift away on their own', () => {
    const w = makeWorld();
    w.pressKey('S');
    expect(w.letters).toHaveLength(1);
    run(w, 4);
    expect(w.letters).toHaveLength(0);
  });
});

describe('feeding', () => {
  it('drops whatever is on the menu', () => {
    const w = makeWorld();
    w.food = 'krill';
    w.dropFood(400, 100, 2);
    expect(w.foods.every((f) => f.kind === 'krill')).toBe(true);
    w.feedEveryone('greens');
    expect(w.foods.some((f) => f.kind === 'greens')).toBe(true);
  });

  it('sinks flakes slower than pellets', () => {
    const w = makeWorld();
    w.creatures.length = 0;   // an empty tank, or someone eats the evidence
    w.dropFood(200, 60, 1, 'pellet');
    w.dropFood(600, 60, 1, 'greens');
    const [pellet, greens] = w.foods;
    const y0 = { pellet: pellet.y, greens: greens.y };
    run(w, 2);
    expect(pellet.y - y0.pellet).toBeGreaterThan(greens.y - y0.greens);
  });

  it('feeds only the animals that eat what she dropped', () => {
    // a grazer and a hunter, side by side, offered one food at a time
    const specs: CreatureSpec[] = [
      { id: 'grazer', name: 'G', kind: 'seahorse', size: 24, speed: 70, upright: true },
      { id: 'hunter', name: 'H', kind: 'eel', size: 24, speed: 70 }
    ];
    const offer = (kind: 'pellet' | 'greens' | 'krill') => {
      const w = new World(stubContext(), specs, { quality: 'low', sparkles: false });
      w.resize(800, 600);
      for (const c of w.creatures) { c.x = 400; c.y = 300; }
      w.dropFood(430, 300, 1, kind);
      run(w, 12);
      return w.creatures.filter((c) => c.fed > 0).map((c) => c.id);
    };
    expect(offer('greens')).toEqual(['grazer']);
    expect(offer('krill')).toEqual(['hunter']);
    // nobody here eats pellets, so the pellet is simply ignored
    expect(offer('pellet')).toEqual([]);
  });

  it('saves the candy floss for the unicorns and the merfolk', () => {
    const specs: CreatureSpec[] = [
      { id: 'uni', name: 'U', kind: 'seaUnicorn', size: 30, speed: 70 },
      { id: 'mer', name: 'M', kind: 'merperson', size: 30, speed: 70, upright: true },
      { id: 'shark', name: 'S', kind: 'shark', size: 30, speed: 70 },
      { id: 'nemo', name: 'N', kind: 'fish', size: 24, speed: 70 }
    ];
    const w = new World(stubContext(), specs, { quality: 'low', sparkles: false });
    w.resize(800, 600);
    for (const c of w.creatures) { c.x = 400; c.y = 300; }
    for (let i = 0; i < 6; i++) w.dropFood(410, 300, 1, 'candy');
    run(w, 14);
    const ate = w.creatures.filter((c) => c.fed > 0).map((c) => c.id).sort();
    expect(ate).toEqual(['mer', 'uni']);
  });

  it('gives the merfolk their muesli and the seahorses their plankton', () => {
    const specs: CreatureSpec[] = [
      { id: 'mer', name: 'M', kind: 'merperson', size: 30, speed: 70, upright: true },
      { id: 'horse', name: 'H', kind: 'seahorse', size: 26, speed: 70, upright: true },
      { id: 'shark', name: 'S', kind: 'shark', size: 30, speed: 70 }
    ];
    const offer = (kind: 'muesli' | 'plankton') => {
      const w = new World(stubContext(), specs, { quality: 'low', sparkles: false });
      w.resize(800, 600);
      for (const c of w.creatures) { c.x = 400; c.y = 300; }
      for (let i = 0; i < 5; i++) w.dropFood(415, 300, 1, kind);
      run(w, 14);
      return w.creatures.filter((c) => c.fed > 0).map((c) => c.id).sort();
    };
    expect(offer('muesli')).toEqual(['mer']);
    expect(offer('plankton')).toEqual(['horse']);
  });

  it('lets a vegetarian eat greens and leave the pellets alone', () => {
    const specs: CreatureSpec[] = [
      { id: 'veg', name: 'V', kind: 'seahorse', size: 24, speed: 70, vegetarian: true, upright: true }
    ];
    const meat = new World(stubContext(), specs, { quality: 'low', sparkles: false });
    meat.resize(800, 600);
    const v1 = meat.creatures[0];
    meat.dropFood(v1.x + 30, v1.y, 1, 'pellet');
    run(meat, 12);
    expect(meat.fedTotal).toBe(0);

    const veg = new World(stubContext(), specs, { quality: 'low', sparkles: false });
    veg.resize(800, 600);
    const v2 = veg.creatures[0];
    veg.dropFood(v2.x + 30, v2.y, 1, 'greens');
    run(veg, 12);
    expect(veg.fedTotal).toBeGreaterThan(0);
  });
});

describe('the key hunt', () => {
  /** Park the cast in one corner so a tap can only land on the hunt. */
  function clearWorld() {
    const w = makeWorld();
    for (const c of w.creatures) { c.x = -400; c.y = -400; }
    return w;
  }

  it('hides a key on the sea floor, away from the chest', () => {
    const w = clearWorld();
    const tr = w.treasure;
    expect(tr.stage).toBe('hidden');
    expect(tr.keyX).toBeGreaterThan(0);
    expect(tr.keyX).toBeLessThan(800);
    expect(Math.abs(tr.keyX - chestPos().x)).toBeGreaterThan(100);
  });

  it('keeps the key dull between glints', () => {
    const w = clearWorld();
    w.treasure.glintNow = 0;
    w.treasure.glint = 99;      // no glint due for a long while
    run(w, 2);
    expect(w.treasure.glintNow).toBe(0);
  });

  it('winks more often the longer she hunts', () => {
    const w = clearWorld();
    const early: number[] = [];
    let last = w.treasure.glint;
    // count the glints in the first 30 seconds, then in a later 30
    let n1 = 0;
    for (let i = 0; i < 60 * 30; i++) {
      w.step(1 / 60);
      if (w.treasure.glint > last) n1++;
      last = w.treasure.glint;
    }
    let n2 = 0;
    for (let i = 0; i < 60 * 30; i++) {
      w.step(1 / 60);
      if (w.treasure.glint > last) n2++;
      last = w.treasure.glint;
    }
    expect(w.treasure.hunting).toBeGreaterThan(55);
    expect(n2).toBeGreaterThan(n1);
    void early;
  });

  it('stops glinting the moment she picks it up', () => {
    const w = clearWorld();
    w.treasure.glintNow = 1;
    w.tap(w.treasure.keyX, w.treasure.keyY);
    run(w, 0.1);
    expect(w.treasure.glintNow).toBe(0);
  });

  it('picks the key up on a tap, without dropping food', () => {
    const w = clearWorld();
    const food = w.foods.length;
    expect(w.tap(w.treasure.keyX, w.treasure.keyY)).toBeNull();
    expect(w.treasure.stage).toBe('carried');
    expect(w.foods.length).toBe(food);
  });

  it('will not open the chest without the key', () => {
    const w = clearWorld();
    const p = chestPos();
    w.tap(p.x, p.y - 20);
    expect(w.treasure.stage).toBe('hidden');
    expect(w.treasures).toBe(0);
    // an ordinary tap on the water, so she still gets to feed the fish
    expect(w.foods.length).toBeGreaterThan(0);
  });

  it('opens the chest once she is carrying the key', () => {
    const w = clearWorld();
    w.tap(w.treasure.keyX, w.treasure.keyY);
    const p = chestPos();
    w.tap(p.x, p.y - 20);
    expect(w.treasure.stage).toBe('open');
    expect(w.treasures).toBe(1);

    run(w, 1);
    expect(w.treasure.open).toBe(1);   // lid all the way back
  });

  it('locks itself again and hides a fresh key', () => {
    const w = clearWorld();
    w.tap(w.treasure.keyX, w.treasure.keyY);
    const p = chestPos();
    w.tap(p.x, p.y - 20);

    run(w, 12);
    expect(w.treasure.stage).toBe('hidden');
    expect(w.treasure.open).toBe(0);
    expect(w.treasures).toBe(1);       // the count survives the reset
  });

  it('reports what is under the pointer, for the hover cursor', () => {
    const w = clearWorld();
    const p = chestPos();
    expect(w.hitTest(w.treasure.keyX, w.treasure.keyY)).toBe('key');
    expect(w.hitTest(p.x, p.y - 20)).toBeNull();   // nothing to do there yet
    expect(w.hitTest(4, 4)).toBeNull();

    w.tap(w.treasure.keyX, w.treasure.keyY);
    expect(w.hitTest(p.x, p.y - 20)).toBe('chest');

    const c = w.creatures[0];
    c.x = 300; c.y = 200;
    expect(w.hitTest(300, 200)).toBe('creature');
  });

  it('keeps the key on the sand when the tank is resized', () => {
    const w = clearWorld();
    w.resize(500, 800);
    const tr = w.treasure;
    expect(tr.keyX).toBeLessThan(500);
    expect(tr.keyY).toBeGreaterThan(500 * 0.5);
  });
});

describe('nobody gets stuck in the rocks', () => {
  it('keeps every swimmer out of the sea floor, in every place', () => {
    for (const place of ['riff', 'tiefsee', 'vulkan', 'eismeer'] as const) {
      setScene(place);
      const w = new World(stubContext(), SPECS, { quality: 'low', sparkles: false });
      w.resize(900, 700);
      run(w, 40);
      for (const c of w.creatures) {
        if (c.mode === 'crawl' || c.mode === 'static') continue;
        const floor = sandY(c.x);
        expect(c.y, `${c.id} sank into the floor in ${place}`).toBeLessThanOrEqual(floor + 1);
      }
    }
    setScene('riff');
  });

  it('does not leave a swimmer grinding against a slope', () => {
    setScene('vulkan');   // the most broken-up terrain of the nine
    const w = new World(stubContext(), SPECS, { quality: 'low', sparkles: false });
    w.resize(900, 700);
    run(w, 6);

    const swimmers = w.creatures.filter((c) => c.mode === 'swim');
    const start = swimmers.map((c) => ({ x: c.x, y: c.y }));
    run(w, 14);
    // over fourteen seconds a free swimmer should have gone somewhere
    swimmers.forEach((c, i) => {
      const moved = Math.hypot(c.x - start[i].x, c.y - start[i].y);
      expect(moved, `${c.id} barely moved — stuck?`).toBeGreaterThan(20);
    });
    setScene('riff');
  });
});

describe('taming and riding', () => {
  const RIDE: CreatureSpec[] = [
    { id: 'nemo', name: 'N', kind: 'fish', size: 26, speed: 60, likes: 'pellet' }
  ];
  const build = () => {
    setScene('riff');
    const w = new World(stubContext(), RIDE, { quality: 'low', sparkles: false });
    w.resize(800, 600);
    return w;
  };

  it('makes the sea several screens wide and loops it', () => {
    const w = build();
    expect(w.worldWidth).toBe(800 * 3);
  });

  it('wins a creature round by feeding it its favourite', () => {
    const w = build();
    const c = w.creatures[0];
    expect(c.tame).toBeFalsy();

    let tamed: string | null = null;
    (w as unknown as { events: { onTamed?: (c: Creature) => void } }).events.onTamed =
      (x) => (tamed = x.id);

    // keep offering it what it likes, right where it is
    for (let i = 0; i < 40 && !c.tame; i++) {
      w.dropFood(c.x + 20, c.y, 1, 'pellet');
      run(w, 3);
    }
    expect(c.trust).toBe(1);
    expect(c.tame).toBe(true);
    expect(tamed).toBe('nemo');
  });

  it('will not hand the reins to something untamed', () => {
    const w = build();
    expect(w.drive(w.creatures[0])).toBeNull();
    expect(w.driving).toBeNull();
  });

  it('drives a tamed creature and carries the camera with it', () => {
    const w = build();
    const c = w.creatures[0];
    c.tame = true;
    c.trust = 1;

    expect(w.drive(c)).toBe(c);
    expect(c.driven).toBe(true);

    const startX = c.x;
    w.setSteer(1, 0);                 // ask it to swim right
    run(w, 2.5);
    expect(wrapDelta(startX, c.x)).toBeGreaterThan(60);

    // the window followed it, keeping it roughly in the middle
    expect(Math.abs(wrapDelta(w.camera + 400, c.x))).toBeLessThan(160);
  });

  it('lets go cleanly', () => {
    const w = build();
    const c = w.creatures[0];
    c.tame = true;
    w.drive(c);
    w.drive(null);
    expect(w.driving).toBeNull();
    expect(c.driven).toBe(false);
  });

  it('carries on round the loop instead of hitting a wall', () => {
    const w = build();
    const c = w.creatures[0];
    c.tame = true;
    c.x = w.worldWidth - 40;
    w.drive(c);
    w.setSteer(1, 0);
    run(w, 6);
    // it went past the end and came back round, rather than stopping
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.x).toBeLessThanOrEqual(w.worldWidth);
    expect(Number.isFinite(w.camera)).toBe(true);
  });

  it('lets hide and seek force a single-screen sea', () => {
    setScene('riff');
    const w = new World(stubContext(), RIDE, { quality: 'low', sparkles: false, span: 1 });
    w.resize(800, 600);
    expect(w.worldWidth).toBe(800);
  });
});
