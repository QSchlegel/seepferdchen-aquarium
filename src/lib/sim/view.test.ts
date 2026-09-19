/**
 * The glass she is looking at.
 *
 * The sea is three to five screens wide and the tank shows one of them. Left
 * to a plain random walk the cast spreads out evenly over all of it, so most
 * of the animals are always somewhere she is not looking — and on a phone,
 * where the glass is at its narrowest and the cast is thinned to begin with,
 * that left about five animals on screen and a lot of empty water.
 *
 * These are the tests for the tide that brings them back. The numbers are
 * deliberately well under what the simulation actually manages, because this
 * is a random walk with a lean on it, not a magnet: the point is that she
 * always has plenty to tap, not that any particular fish is anywhere.
 */
import { describe, expect, it } from 'vitest';
import { World } from './world';
import { CAST } from '$lib/data/cast';
import { setScene, wrapDelta, wrapWorld, worldWidth } from '$lib/art';
import { stubContext } from '../../test/stub-canvas';
import type { CreatureSpec } from './types';

/** A phone held upright — the smallest glass the app ever has. */
const PHONE: [number, number] = [390, 844];

function tank(w = PHONE[0], h = PHONE[1], span?: number) {
  setScene('riff');
  const world = new World(stubContext(), CAST, { quality: 'high', sparkles: false, span });
  world.resize(w, h);
  return world;
}

function run(w: World, seconds: number) {
  for (let i = 0; i < seconds * 30; i++) w.step(1 / 30);
}

/** Everyone currently somewhere she could see them. */
function onGlass(w: World) {
  return w.creatures.filter((c) => {
    const x = wrapWorld(c.x - w.camera);
    return x < w.width;
  });
}

/** Everyone she could pick out and tap: not a speck of shoal in the distance. */
function worthTapping(w: World) {
  return onGlass(w).filter((c) => !c.shoal && c.z > -0.4);
}

describe('the glass she is looking at', () => {
  it('has the cast in front of her the moment it opens', () => {
    const w = tank();
    // she should not have to wait for the tank to fill up; before the cast was
    // spread over the whole sea and she opened the app to four fish
    expect(onGlass(w).length).toBeGreaterThan(w.creatures.length * 0.5);
    expect(worthTapping(w).length).toBeGreaterThanOrEqual(8);
  });

  it('keeps it that way while she plays', () => {
    const w = tank();
    for (const minutes of [0.5, 1, 3]) {
      run(w, minutes * 60);
      expect(onGlass(w).length, `after ${minutes} min`).toBeGreaterThan(w.creatures.length * 0.4);
      expect(worthTapping(w).length, `after ${minutes} min`).toBeGreaterThanOrEqual(6);
    }
  });

  it('brings back a cast that has wandered to the far side of the sea', () => {
    const w = tank();
    // put every one of them as far away as the loop allows
    const far = wrapWorld(w.camera + w.worldWidth / 2);
    for (const c of w.creatures) { c.x = wrapWorld(far + (Math.random() - 0.5) * 60); c.tx = null; }
    expect(onGlass(w).length).toBe(0);

    run(w, 90);
    expect(onGlass(w).length, 'nobody came back').toBeGreaterThan(w.creatures.length * 0.3);
  });

  it('leaves the sea alone when the whole of it is already on screen', () => {
    // hide and seek forces one screen: there is no away to come back from, and
    // a tide would only bunch everyone in the middle of a game about looking
    const w = tank(PHONE[0], PHONE[1], 1);
    expect(worldWidth()).toBe(w.width);
    run(w, 60);
    const x = w.creatures.map((c) => wrapWorld(c.x) / w.width);
    // still spread across the width rather than huddled
    expect(Math.min(...x)).toBeLessThan(0.3);
    expect(Math.max(...x)).toBeGreaterThan(0.7);
  });

  it('does not shrink the sea to do it', () => {
    const w = tank();
    // the point is that the cast comes to her, not that the world got smaller:
    // the doorways, the ride and the far scenery all need the room
    expect(w.worldWidth).toBeGreaterThanOrEqual(w.width * 3);
  });

  it('keeps the ones that cannot swim where she can see them', () => {
    const w = tank();
    // a starfish never moves and a crab walks at a few pixels a second, so out
    // in the open sea they would simply never be seen again
    const rooted = () => w.creatures.filter((c) => c.mode === 'static' || c.mode === 'crawl');
    expect(rooted().length).toBeGreaterThan(0);
    for (const c of rooted()) expect(wrapWorld(c.x - w.camera)).toBeLessThan(w.width);
    run(w, 120);
    for (const c of rooted()) {
      // a crab may pace a little past the edge before turning round
      expect(wrapWorld(c.x - w.camera + w.width * 0.2)).toBeLessThan(w.width * 1.4);
    }
  });

  it('follows her out into the sea when she rides away', () => {
    const w = tank();
    const mount = w.creatures.find((c) => c.mode === 'swim')!;
    mount.tame = true;
    // parked half a sea from home, with the camera riding on its back. Speed
    // zero so it stays put and the test is about the cast, not about steering.
    mount.speed = 0;
    mount.x = wrapWorld(w.worldWidth / 2);
    w.drive(mount);
    run(w, 1);
    expect(Math.abs(wrapDelta(w.camera, 0)), 'the camera never left home').toBeGreaterThan(w.width * 0.8);

    run(w, 120);
    // the glass is out here now, and so is everybody else
    expect(onGlass(w).length, 'the cast stayed behind').toBeGreaterThan(w.creatures.length * 0.25);
  });

  it('shows her the one she picked out of the gallery', () => {
    const w = tank();
    const c = w.creatures.find((o) => o.mode === 'swim' && !o.shoal)!;
    // right round the other side of the sea, where a sparkle would be wasted
    c.x = wrapWorld(w.camera + w.worldWidth / 2);
    expect(wrapWorld(c.x - w.camera)).toBeGreaterThan(w.width);

    w.highlight(c.id);
    // on the glass at once — she tapped a picture and expects that animal,
    // not a promise that it is on its way
    expect(wrapWorld(c.x - w.camera), 'never arrived').toBeLessThan(w.width);
    // and it stays around long enough to be seen and tapped
    run(w, 4);
    expect(wrapWorld(c.x - w.camera), 'gone again already').toBeLessThan(w.width * 1.2);
  });

  it('leaves food where she dropped it, however far from home she is', () => {
    // the sea loops and has no side walls, but food used to be clamped to the
    // first screen: everything she fed the fish while riding was snatched back
    // to the origin, and she watched it rot from a mile away
    const w = tank();
    const away = wrapWorld(w.camera + w.worldWidth * 0.45);
    w.dropFood(away, 120, 3, 'pellet');
    const before = w.foods.map((f) => f.x);
    run(w, 3);
    for (const [i, f] of w.foods.entries()) {
      expect(Math.abs(f.x - before[i]), 'food moved across the sea').toBeLessThan(60);
    }
  });

  it('still lets her feed the fish in front of her', () => {
    // the tide must not out-argue a pellet: food beats everything
    const specs: CreatureSpec[] = [
      { id: 'one', name: 'O', kind: 'fish', size: 24, speed: 60, likes: 'pellet' }
    ];
    setScene('riff');
    const w = new World(stubContext(), specs, { quality: 'low', sparkles: false });
    w.resize(...PHONE);
    const c = w.creatures[0];
    c.x = wrapWorld(w.camera + w.width * 0.5);
    c.y = 300;
    w.dropFood(c.x + 40, 300, 1, 'pellet');
    run(w, 10);
    expect(w.fedTotal).toBeGreaterThan(0);
  });
});
