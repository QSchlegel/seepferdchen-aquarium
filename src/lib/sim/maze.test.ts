import { describe, expect, it } from 'vitest';
import { atGoal, generateMaze, mazeShape, resolve } from './maze';

/** A fixed generator, so a failure is reproducible. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

describe('the coral maze', () => {
  it('fits a sensible grid to the screen', () => {
    for (const [w, h] of [[390, 700], [820, 1100], [1440, 900]] as const) {
      const s = mazeShape(w, h);
      expect(s.cols).toBeGreaterThanOrEqual(3);
      expect(s.rows).toBeGreaterThanOrEqual(3);
      expect(s.cols * s.size).toBeLessThanOrEqual(w);
    }
  });

  it('carves every cell, so nowhere is walled off', () => {
    const m = generateMaze(1000, 700, seeded(7));
    for (const row of m.cells) for (const cell of row) expect(cell.seen).toBe(true);
  });

  it('leaves a way from the start to the treasure', () => {
    const m = generateMaze(1000, 700, seeded(11));
    // flood fill through the carved openings
    const seen = new Set<string>(['0,0']);
    const queue: [number, number][] = [[0, 0]];
    while (queue.length) {
      const [r, c] = queue.shift()!;
      const cell = m.cells[r][c];
      const go = (nr: number, nc: number) => {
        if (nr < 0 || nc < 0 || nr >= m.rows || nc >= m.cols) return;
        const k = `${nr},${nc}`;
        if (seen.has(k)) return;
        seen.add(k);
        queue.push([nr, nc]);
      };
      if (!cell.n) go(r - 1, c);
      if (!cell.s) go(r + 1, c);
      if (!cell.w) go(r, c - 1);
      if (!cell.e) go(r, c + 1);
    }
    expect(seen.has(`${m.rows - 1},${m.cols - 1}`)).toBe(true);
  });

  it('starts and finishes in opposite corners', () => {
    const m = generateMaze(1000, 700, seeded(3));
    expect(m.goal.x).toBeGreaterThan(m.start.x);
    expect(m.goal.y).toBeGreaterThan(m.start.y);
    expect(atGoal(m, m.goal.x, m.goal.y)).toBe(true);
    expect(atGoal(m, m.start.x, m.start.y)).toBe(false);
  });

  it('pushes a swimmer back out of a wall instead of trapping it', () => {
    const m = generateMaze(1000, 700, seeded(5));
    const wall = m.segments[0];
    const r = m.size * 0.26;
    // drop it right on the wall
    const out = resolve(m, (wall.x1 + wall.x2) / 2, (wall.y1 + wall.y2) / 2, r);
    const dx = out.x - (wall.x1 + wall.x2) / 2;
    const dy = out.y - (wall.y1 + wall.y2) / 2;
    expect(Math.hypot(dx, dy)).toBeGreaterThan(0);
    expect(Number.isFinite(out.x)).toBe(true);
    expect(Number.isFinite(out.y)).toBe(true);
  });

  it('leaves a swimmer in open water alone', () => {
    const m = generateMaze(1000, 700, seeded(9));
    const mid = { x: m.ox + m.size * 0.5, y: m.oy + m.size * 0.5 };
    const out = resolve(m, mid.x, mid.y, m.size * 0.26);
    expect(Math.hypot(out.x - mid.x, out.y - mid.y)).toBeLessThan(0.001);
  });

  it('never lets a swimmer squeeze through a wall', () => {
    const m = generateMaze(1000, 700, seeded(13));
    const r = m.size * 0.26;
    // walk hard into every wall in turn; it must always end up outside
    for (const s of m.segments.slice(0, 40)) {
      const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
      const out = resolve(m, mx + 1, my + 1, r);
      let closest = Infinity;
      for (const o of m.segments) {
        const dx = o.x2 - o.x1, dy = o.y2 - o.y1;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((out.x - o.x1) * dx + (out.y - o.y1) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        closest = Math.min(closest, Math.hypot(out.x - (o.x1 + dx * t), out.y - (o.y1 + dy * t)));
      }
      expect(closest).toBeGreaterThan(r - 0.6);
    }
  });
});
