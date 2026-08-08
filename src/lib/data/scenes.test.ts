import { describe, expect, it } from 'vitest';
import { SCENES, SCENE_LIST, portalsOf, type SceneId } from './scenes';

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
