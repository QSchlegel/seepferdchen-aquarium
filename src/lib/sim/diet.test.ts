/**
 * Diets, checked against the real cast rather than invented specs.
 *
 * A previous version of these tests used bare stand-in creatures and passed
 * while the actual mermaids — who carry `vegetarian: true` — were quietly
 * refusing their muesli. Test the cast that ships.
 */
import { describe, expect, it } from 'vitest';
import { dietOf } from './behaviour';
import { CAST } from '$lib/data/cast';
import { World } from './world';
import { stubContext } from '../../test/stub-canvas';
import type { Creature, FoodKind } from './types';

const asCreature = (spec: (typeof CAST)[number]) => spec as unknown as Creature;
const find = (id: string) => asCreature(CAST.find((c) => c.id === id)!);

describe('who eats what, in the cast we actually ship', () => {
  it('feeds the mermaids their Muschel-Müsli', () => {
    for (const id of ['elli', 'mona', 'maris']) {
      expect(dietOf(find(id))).toContain('muesli');
    }
  });

  it('feeds the merfolk candy floss too', () => {
    expect(dietOf(find('elli'))).toContain('candy');
  });

  it('feeds the seahorses their plankton', () => {
    const horses = CAST.filter((c) => c.kind === 'seahorse');
    expect(horses.length).toBeGreaterThan(0);
    for (const h of horses) expect(dietOf(asCreature(h))).toContain('plankton');
  });

  it('keeps krill away from every vegetarian', () => {
    for (const spec of CAST) {
      if (!spec.vegetarian) continue;
      expect(dietOf(asCreature(spec))).not.toContain('krill');
    }
  });

  it('gives the hunters their krill', () => {
    expect(dietOf(find('finn'))).toContain('krill');    // the shark
    expect(dietOf(find('zebra'))).toContain('krill');   // the eel
  });

  it('leaves nobody with an empty plate', () => {
    for (const spec of CAST) {
      const diet = dietOf(asCreature(spec));
      expect(diet.length).toBeGreaterThan(0);
      for (const k of diet) {
        expect(['pellet', 'greens', 'krill', 'candy', 'muesli', 'plankton'])
          .toContain(k as FoodKind);
      }
    }
  });

  it('does not let one food feed the whole tank', () => {
    for (const food of ['muesli', 'plankton', 'candy', 'krill'] as FoodKind[]) {
      const eaters = CAST.filter((c) => dietOf(asCreature(c)).includes(food));
      expect(eaters.length).toBeGreaterThan(0);
      expect(eaters.length).toBeLessThan(CAST.length);
    }
  });
});

describe('and actually reaches it in the tank', () => {
  /** Drop a food right next to one creature and see whether it eats. */
  function feedNextTo(id: string, kind: FoodKind) {
    const w = new World(stubContext(), CAST, { quality: 'low', sparkles: false });
    w.resize(1000, 700);
    const c = w.creatures.find((o) => o.id === id)!;
    for (let i = 0; i < 8; i++) w.dropFood(c.x + 20, c.y, 1, kind);
    for (let i = 0; i < 60 * 16; i++) w.step(1 / 60);
    return c.fed;
  }

  it('a mermaid eats the muesli put in front of her', () => {
    expect(feedNextTo('elli', 'muesli')).toBeGreaterThan(0);
  });

  it('a seahorse eats the plankton put in front of it', () => {
    const horse = CAST.find((c) => c.kind === 'seahorse')!;
    expect(feedNextTo(horse.id, 'plankton')).toBeGreaterThan(0);
  });

  it('the shark ignores the muesli entirely', () => {
    expect(feedNextTo('finn', 'muesli')).toBe(0);
  });
});
