import { describe, expect, it } from 'vitest';
import { blink } from './index';

describe('blinking', () => {
  it('is open nearly all the time', () => {
    let shut = 0;
    const steps = 4000;
    for (let i = 0; i < steps; i++) if (blink(i / 60, 0) > 0.5) shut++;
    // a blink is a moment, not a state: well under a tenth of the time
    expect(shut / steps).toBeLessThan(0.06);
    expect(shut).toBeGreaterThan(0);
  });

  it('closes fully and reopens', () => {
    let peak = 0;
    for (let i = 0; i < 1200; i++) peak = Math.max(peak, blink(i / 60, 0));
    expect(peak).toBeGreaterThan(0.9);
    expect(blink(0.5, 0)).toBeLessThan(0.2);
  });

  it('never leaves an eye stuck', () => {
    for (let i = 0; i < 5000; i++) {
      const v = blink(i / 30, (i % 17) * 0.37);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('does not blink the whole tank in unison', () => {
    // the moment each of several creatures first shuts its eyes
    const firsts = [0, 0.4, 1.1, 2.3, 3.9].map((phase) => {
      for (let i = 0; i < 3000; i++) if (blink(i / 60, phase) > 0.8) return i;
      return -1;
    });
    expect(firsts.every((f) => f >= 0)).toBe(true);
    expect(new Set(firsts).size).toBeGreaterThan(1);
  });
});
