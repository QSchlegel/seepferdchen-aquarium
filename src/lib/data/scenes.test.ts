import { describe, expect, it } from 'vitest';
import { SCENES, SCENE_LIST, chromeInk, contrast, lightness, portalsOf, type SceneId } from './scenes';

describe('the world map', () => {
  const ids = Object.keys(SCENES) as SceneId[];

  it('has nine places', () => {
    expect(ids).toHaveLength(9);
    expect(SCENE_LIST).toHaveLength(9);
  });

  it('links both ways — if you can swim there you can swim back', () => {
    for (const id of ids) {
      for (const to of SCENES[id].links) {
        expect(SCENES[to], `${to} is linked from ${id} but does not exist`).toBeDefined();
        expect(SCENES[to].links, `${to} does not link back to ${id}`).toContain(id);
      }
    }
  });

  it('never links a place to itself or twice to the same place', () => {
    for (const id of ids) {
      const links = SCENES[id].links;
      expect(links).not.toContain(id);
      expect(new Set(links).size).toBe(links.length);
    }
  });

  it('reaches every place from the reef', () => {
    const seen = new Set<SceneId>(['riff']);
    const queue: SceneId[] = ['riff'];
    while (queue.length) {
      for (const to of SCENES[queue.shift()!].links) {
        if (!seen.has(to)) { seen.add(to); queue.push(to); }
      }
    }
    expect([...seen].sort()).toEqual([...ids].sort());
  });

  it('shows at most three doorways, all on screen', () => {
    for (const id of ids) {
      const ports = portalsOf(id);
      expect(ports.length).toBeGreaterThan(0);
      expect(ports.length).toBeLessThanOrEqual(3);
      for (const p of ports) {
        expect(p.at[0]).toBeGreaterThan(0);
        expect(p.at[0]).toBeLessThan(1);
      }
      // no two doorways share a slot
      expect(new Set(ports.map((p) => p.at[0])).size).toBe(ports.length);
    }
  });

  it('gives every place its own square on the map', () => {
    const cells = ids.map((id) => SCENES[id].cell.join(','));
    expect(new Set(cells).size).toBe(ids.length);
  });

  it('gives every place a distinct look and its own terrain seed', () => {
    expect(new Set(ids.map((id) => SCENES[id].water[0])).size).toBe(ids.length);
    expect(new Set(ids.map((id) => SCENES[id].terrain.seed)).size).toBe(ids.length);
    expect(new Set(ids.map((id) => SCENES[id].icon)).size).toBe(ids.length);
  });
});

/**
 * The buttons float over the sea, so whether she can see them depends on the
 * place she is in. They are white frosted glass, which was fine in the trench
 * and invisible in the pearl beds: white on that water is a contrast ratio of
 * 1.1, which is none. Six of the nine places were like that, and a button she
 * cannot see is a button she cannot press — and she cannot read a label to
 * find out what she is missing.
 */
describe('you can see the buttons in every place', () => {
  const INK = '#10394f';
  const ids = Object.keys(SCENES) as SceneId[];

  /** Everything the floating controls sit over: the surface and the sand. */
  const behind = (id: SceneId) => [SCENES[id].water[0], SCENES[id].water[1], SCENES[id].sand[0]];

  it('measures lightness the way an eye does', () => {
    expect(lightness('#000000')).toBeCloseTo(0, 5);
    expect(lightness('#ffffff')).toBeCloseTo(1, 5);
    // green carries most of the perceived brightness, blue almost none
    expect(lightness('#00ff00')).toBeGreaterThan(lightness('#ff0000'));
    expect(lightness('#0000ff')).toBeLessThan(lightness('#ff0000'));
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrast('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('picks the ink that stands out against its own water', () => {
    for (const id of ids) {
      const ink = chromeInk(id) === 'dark' ? INK : '#ffffff';
      for (const water of behind(id)) {
        // 3:1 is the floor for something you have to be able to find and hit
        expect(contrast(ink, water), `${id}: ${chromeInk(id)} chrome on ${water}`)
          .toBeGreaterThan(3);
      }
    }
  });

  it('agrees with itself about the whole place, not just the surface', () => {
    // the top bar is over the water and the corner buttons over the sand; a
    // place that wanted one ink at the top and the other at the bottom would
    // need two sets of chrome, and there is only one
    for (const id of ids) {
      const chosen = chromeInk(id) === 'dark' ? INK : '#ffffff';
      const other = chromeInk(id) === 'dark' ? '#ffffff' : INK;
      const worst = (ink: string) => Math.min(...behind(id).map((c) => contrast(ink, c)));
      expect(worst(chosen), `${id} picked the worse of the two`).toBeGreaterThan(worst(other));
    }
  });

  it('is dark-inked in the pale places and white in the deep ones', () => {
    // a guard on the data rather than the code: repaint a place much lighter
    // or much darker and this says the chrome has to follow
    expect(chromeInk('perlbank')).toBe('dark');
    expect(chromeInk('eismeer')).toBe('dark');
    expect(chromeInk('lagune')).toBe('dark');
    expect(chromeInk('riff')).toBe('dark');
    expect(chromeInk('tiefsee')).toBe('light');
    expect(chromeInk('hoehle')).toBe('light');
    expect(chromeInk('vulkan')).toBe('light');
  });
});
