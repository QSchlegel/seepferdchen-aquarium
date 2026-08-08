import { describe, expect, it } from 'vitest';
import { toSpec, type MyCreature } from './mine';
import { bindContext, drawCreature, setTank } from '$lib/art';

/** Every body the maker offers. */
const KINDS = [
  'fish', 'minnow', 'seahorse', 'turtle', 'octopus', 'jelly', 'crab', 'star',
  'eel', 'snail', 'shark', 'parrot', 'unicorn', 'unicornLand', 'seaUnicorn',
  'merperson'
];

const make = (kind: string): MyCreature => ({
  id: 'mine-test', name: 'Test', kind, shape: 'plain', size: 26,
  body: '#ff9f43', accent: '#ffe066', fin: '#ff6b9d', pattern: 'plain'
});

/**
 * A context that records every colour it is asked to paint with. Painting with
 * `undefined` is what produced the smeared creatures, and canvas silently
 * accepts it, so nothing else would catch this.
 */
function recordingContext() {
  const bad: string[] = [];
  const seen = new Set<string>();
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: (_o: number, c: unknown) => check('gradient', c) });
      }
      if (prop === 'measureText') return () => ({ width: 20 });
      if (prop === 'canvas') return { width: 200, height: 200 };
      return () => {};
    },
    set(_t, prop, value) {
      if (prop === 'fillStyle' || prop === 'strokeStyle') check(String(prop), value);
      return true;
    }
  };
  function check(where: string, value: unknown) {
    const s = String(value);
    seen.add(s);
    if (value === undefined || value === null || s === 'undefined' || s.includes('undefined')) {
      bad.push(`${where}=${s}`);
    }
  }
  return { ctx: new Proxy({}, handler) as unknown as CanvasRenderingContext2D, bad, seen };
}

describe('the creature maker', () => {
  it('gives every body a complete palette', () => {
    for (const kind of KINDS) {
      const spec = toSpec(make(kind)) as Record<string, unknown>;
      for (const [key, value] of Object.entries(spec)) {
        // `sparkles` is genuinely optional; everything present must be real
        if (value === undefined && key === 'sparkles') continue;
        expect(value, `${kind}.${key} is undefined`).toBeDefined();
        expect(String(value), `${kind}.${key} contains undefined`).not.toContain('undefined');
      }
    }
  });

  it('paints every body without an undefined colour', () => {
    for (const kind of KINDS) {
      const rec = recordingContext();
      bindContext(rec.ctx);
      setTank(400, 400);
      // several frames, so time-varying branches get exercised too
      for (const t of [0, 0.4, 1.3, 2.7]) {
        drawCreature(kind, { ...toSpec(make(kind)), dir: 1, wiggle: 0, phase: 0 }, t);
      }
      expect(rec.bad, `${kind} painted with: ${rec.bad.join(', ')}`).toEqual([]);
      expect(rec.seen.size, `${kind} painted nothing`).toBeGreaterThan(1);
    }
  });

  it('gives the unicorns and merfolk the array fields their routines iterate', () => {
    const sea = toSpec(make('seaUnicorn')) as Record<string, unknown>;
    expect(Array.isArray(sea.mane), 'seaUnicorn.mane must be an array').toBe(true);
    const uni = toSpec(make('unicorn')) as Record<string, unknown>;
    expect(Array.isArray(uni.rainbow), 'unicorn.rainbow must be an array').toBe(true);
    const mer = toSpec(make('merperson')) as Record<string, unknown>;
    for (const f of ['skin', 'skinDark', 'hair', 'hairHi', 'tail', 'tailDark', 'top', 'dots']) {
      expect(mer[f], `merperson.${f} missing`).toBeDefined();
    }
  });
});
