/**
 * The creatures she and her friends have made.
 *
 * Kept in localStorage next to the rest of the progress, and merged into the
 * cast so a home-made fish swims alongside the ones out of the books.
 */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { CreatureSpec } from '$lib/sim/types';

/** What the editor lets her choose. Everything else is derived from these. */
export interface MyCreature {
  id: string;
  name: string;
  kind: string;
  shape: string;
  size: number;
  body: string;
  accent: string;
  fin: string;
  /** Which of the ready-made patterns is painted on it. */
  pattern: string;
  sparkles?: number;
}

const KEY = 'aquarium.mine';

function load(): MyCreature[] {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export const mine = writable<MyCreature[]>(load());

if (browser) {
  mine.subscribe((list) => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* full, ignore */ }
  });
}

/** A short id that will not collide with the book cast. */
function freshId() {
  return 'mine-' + Math.random().toString(36).slice(2, 9);
}

export function addMine(c: Omit<MyCreature, 'id'>) {
  const made: MyCreature = { ...c, id: freshId() };
  mine.update((list) => [...list, made]);
  return made;
}

export function removeMine(id: string) {
  mine.update((list) => list.filter((c) => c.id !== id));
}

/**
 * Turn a made creature into a spec the simulation understands. Home-made ones
 * are always free swimmers — the modes that need a leader or a shoal only make
 * sense for creatures written into the story.
 */
export function toSpec(c: MyCreature): CreatureSpec {
  return {
    id: c.id,
    name: c.name || '?',
    kind: c.kind,
    shape: c.shape,
    size: c.size,
    speed: 46 + (40 - c.size) * 0.6,
    tailSpeed: 7,
    body: c.body,
    accent: c.accent,
    fin: c.fin,
    mane: c.accent,
    tail: c.fin,
    skin: c.body,
    hair: c.accent,
    upright: c.kind === 'seahorse' || c.kind === 'merperson',
    sparkles: c.sparkles,
    group: 'mine',
    about: { de: 'Selbst gemacht!', en: 'Home-made!' }
  } as CreatureSpec;
}
