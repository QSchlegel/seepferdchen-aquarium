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

/* Shifting a colour towards white or black, for the shades each routine wants. */
function shift(hex: string, amount: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((d) => d + d).join('') : h;
  const n = parseInt(full, 16);
  const ch = (sh: number) => {
    const v = (n >> sh) & 255;
    const out = amount > 0 ? v + (255 - v) * amount : v * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}
const lighter = (c: string, k = 0.35) => shift(c, k);
const darker = (c: string, k = 0.3) => shift(c, -k);

/**
 * The full palette a drawing routine expects, built from her three colours.
 *
 * Each `kind` reads different fields — a seahorse wants `dark`, a sea unicorn
 * wants `shade` and `tail` and a `mane` **array**, a merperson wants eight of
 * them. Handing over only body/accent/fin left those routines painting with
 * `undefined`, which is what made the unicorns and merpeople come out as
 * smears. Anything missing here is a broken creature, so it is exhaustive.
 */
function paletteFor(kind: string, body: string, accent: string, fin: string) {
  const rainbow = [accent, lighter(accent), fin, lighter(fin, 0.5), body, lighter(body)];

  switch (kind) {
    case 'seahorse':
      return { body, accent, fin, dark: darker(body) };

    case 'merperson':
      // drawMerperson reads sixteen fields, not the handful the name suggests
      return {
        skin: body, skinDark: darker(body),
        hair: accent, hairHi: lighter(accent), streak: lighter(accent, 0.6),
        hairStyle: 'curly',
        tail: fin, tailDark: darker(fin),
        top: accent, topAlt: lighter(accent, 0.5),
        tie: fin, accColor: accent, glassCol: lighter(body, 0.6),
        pattern: 'plain',
        dots: lighter(fin, 0.55),
        body, accent, fin
      };

    case 'seaUnicorn':
      return { body, shade: darker(body, 0.16), tail: fin, mane: rainbow, accent, fin };

    case 'unicornLand':
      return { body, shade: darker(body, 0.16), mane: rainbow, tail: rainbow, accent, fin };

    case 'parrot':
      return {
        body, fin, fin2: darker(fin), beak: accent,
        belly: lighter(body, 0.45), belly2: lighter(body, 0.7),
        top: accent, accent
      };

    case 'unicorn':
      return { body, accent, fin, rainbow };

    case 'jelly':
      // the jellies are drawn translucent, so their body wants an alpha
      return { body: withAlpha(body, 0.72), fin, accent };

    case 'snail':
      return { body, foot: lighter(body, 0.5), accent, fin };

    case 'eel':
      return { body, accent: darker(accent), fin };

    default:
      // fish, octopus, star, crab, turtle, shark, parrot, minnow
      return { body, accent, fin };
  }
}

function withAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((d) => d + d).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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
    phase: 0,
    ...paletteFor(c.kind, c.body, c.accent, c.fin),
    upright: c.kind === 'seahorse' || c.kind === 'merperson' || c.kind === 'rider',
    sparkles: c.sparkles,
    group: 'mine',
    about: { de: 'Selbst gemacht!', en: 'Home-made!' }
  } as CreatureSpec;
}
