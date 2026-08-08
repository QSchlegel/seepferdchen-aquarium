import { describe, expect, it } from 'vitest';
import { CAST, GALLERY, sameCharacter } from './cast';
import type { CreatureSpec } from '$lib/sim/types';

/** Rough perceptual distance between two '#rrggbb' colours. */
function colourGap(a: string, b: string) {
  const rgb = (h: string) => {
    // the jellyfish are written as rgba(); without this they all compared equal
    const m = h.match(/rgba?\(([^)]+)\)/);
    if (m) return m[1].split(',').slice(0, 3).map((v) => parseFloat(v));
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  // weighted for how the eye actually sees difference
  return Math.sqrt(2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2);
}

const seekable = GALLERY.filter((c) => c.id !== 'ellistormi' && (c.size ?? 0) >= 14);

describe('telling the cast apart', () => {
  it('never asks her to find something too small to see', () => {
    for (const c of seekable) expect(c.size).toBeGreaterThanOrEqual(14);
  });

  it('gives two animals of the same kind either colour or size to tell them apart', () => {
    const failures: string[] = [];
    for (let i = 0; i < seekable.length; i++) {
      for (let j = i + 1; j < seekable.length; j++) {
        const a = seekable[i] as CreatureSpec, b = seekable[j] as CreatureSpec;
        if (a.kind !== b.kind) continue;
        if (!a.body || !b.body) continue;

        const gap = colourGap(a.body, b.body);
        const sizeRatio = Math.max(a.size, b.size) / Math.min(a.size, b.size);
        // either clearly different colours, or clearly different sizes
        if (gap < 90 && sizeRatio < 1.35) {
          failures.push(`${a.name} (${a.body}, ${a.size}) vs ${b.name} (${b.body}, ${b.size}) — gap ${gap.toFixed(0)}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('treats a whole shoal as one character', () => {
    const shoalFish = CAST.filter((c) => c.shoal);
    expect(shoalFish.length).toBeGreaterThan(3);
    const first = shoalFish[0];
    const mate = shoalFish.find((c) => c.shoal === first.shoal && c.id !== first.id)!;
    expect(mate).toBeDefined();
    // a mate counts as the same character, a different shoal does not
    expect(sameCharacter(first, mate)).toBe(true);
    expect(sameCharacter(first, first)).toBe(true);
    const other = CAST.find((c) => c.shoal && c.shoal !== first.shoal);
    if (other) expect(sameCharacter(first, other)).toBe(false);
    const solo = CAST.find((c) => !c.shoal)!;
    expect(sameCharacter(first, solo)).toBe(false);
  });

  it('keeps every shoal member big enough to notice in the water', () => {
    for (const c of CAST.filter((x) => x.shoal)) expect(c.size).toBeGreaterThanOrEqual(12);
  });
});
