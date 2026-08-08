import { describe, expect, it } from 'vitest';
import { sandY, farRidgeY, ridgeY, setTank, setWorld, setScene, wrapWorld, wrapDelta, worldWidth, setCamera, sx } from './index';
import { SCENES, type SceneId } from '$lib/data/scenes';

const SCREEN = 900;

function place(id: SceneId) {
  setScene(id);
  setTank(SCREEN, 700);
  setWorld(SCREEN * SCENES[id].span);
}

describe('the looping world', () => {
  it('is several screens wide, and each place its own length', () => {
    for (const id of Object.keys(SCENES) as SceneId[]) {
      place(id);
      expect(worldWidth()).toBe(SCREEN * SCENES[id].span);
      expect(SCENES[id].span).toBeGreaterThanOrEqual(3);
    }
  });

  it('wraps coordinates round the loop', () => {
    place('riff');
    const w = worldWidth();
    expect(wrapWorld(-10)).toBeCloseTo(w - 10, 5);
    expect(wrapWorld(w + 25)).toBeCloseTo(25, 5);
    // shortest way round, so a creature near the seam still chases the near one
    expect(wrapDelta(w - 10, 10)).toBeCloseTo(20, 5);
    expect(wrapDelta(10, w - 10)).toBeCloseTo(-20, 5);
  });

  it('joins the sea floor to itself with no step at the seam', () => {
    for (const id of Object.keys(SCENES) as SceneId[]) {
      place(id);
      const w = worldWidth();
      // the floor either side of the join must agree
      expect(Math.abs(sandY(0) - sandY(w)), `${id} sand seam`).toBeLessThan(0.5);
      expect(Math.abs(sandY(1) - sandY(w + 1)), `${id} sand seam+1`).toBeLessThan(0.5);
      // and there must be no cliff across the join
      const step = Math.abs(sandY(w - 1) - sandY(0));
      expect(step, `${id} sand jumps ${step.toFixed(1)}px at the seam`).toBeLessThan(6);
    }
  });

  it('joins the distant ridges to themselves too', () => {
    for (const id of Object.keys(SCENES) as SceneId[]) {
      place(id);
      const w = worldWidth();
      expect(Math.abs(farRidgeY(w - 1) - farRidgeY(-1)), `${id} far ridge`).toBeLessThan(6);
      for (let layer = 0; layer < 3; layer++) {
        const step = Math.abs(ridgeY(layer, w - 1) - ridgeY(layer, 0));
        expect(step, `${id} ridge ${layer} jumps ${step.toFixed(1)}px`).toBeLessThan(8);
      }
    }
  });

  it('still varies — a seamless floor must not be a flat one', () => {
    place('riff');
    const w = worldWidth();
    const ys: number[] = [];
    for (let x = 0; x < w; x += w / 200) ys.push(sandY(x));
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20);
  });

  it('maps world positions onto the screen either side of the camera', () => {
    place('riff');
    setCamera(0);
    expect(sx(0)).toBeCloseTo(0, 5);
    expect(sx(200)).toBeCloseTo(200, 5);
    // just behind the camera reads as negative, not as most of a loop away
    expect(sx(worldWidth() - 30)).toBeCloseTo(-30, 5);

    setCamera(500);
    expect(sx(500)).toBeCloseTo(0, 5);
    expect(sx(700)).toBeCloseTo(200, 5);
  });
});

describe('things stay where they are when the camera moves', () => {
  it('keeps a fixture at a fixed screen distance from the camera', () => {
    place('riff');
    // a fixture at world 600 must appear 600px right of a camera at 0,
    // and 100px right of a camera at 500 — it must not ride along
    setCamera(0);
    const a = sx(600);
    setCamera(500);
    const b = sx(600);
    expect(a - b).toBeCloseTo(500, 5);
  });

  it('never lets a fixture jump as it crosses the seam', () => {
    place('riff');
    const w = worldWidth();
    // walk the camera right past the join and watch one fixed point
    let prev = null as number | null;
    for (let cam = w - 400; cam <= w + 400; cam += 5) {
      setCamera(cam);
      const p = sx(0);              // the point at world 0, i.e. the seam
      if (prev !== null) {
        // it should slide smoothly by the step size, never teleport
        expect(Math.abs(p - prev), `jumped at camera ${cam}`).toBeLessThan(20);
      }
      prev = p;
    }
  });

  it('gives the widest fixture room before it wraps', () => {
    place('riff');
    const w = worldWidth();
    // the wreck is the widest thing drawn; whatever margin sx uses must be
    // bigger than it, or half a shipwreck appears on the wrong side
    setCamera(0);
    expect(sx(w - 500)).toBeLessThan(0);
    expect(sx(w - 500)).toBeGreaterThan(-600);
  });
});
