/** What she has done so far: pellets fed, creatures met, game score, treasure. */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Progress {
  fed: number;
  met: string[];
  bestScore: number;
  /** How many times she has unlocked the treasure chest. */
  treasures: number;
  /** How many names she has typed out in full. */
  typed: number;
  /** Which of the six treasures she has found. */
  loot: string[];
}

const DEFAULTS: Progress = { fed: 0, met: [], bestScore: 0, treasures: 0, typed: 0, loot: [] };
const KEY = 'aquarium.progress';

function load(): Progress {
  if (!browser) return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export const progress = writable<Progress>(load());

if (browser) {
  progress.subscribe((p) => {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  });
}

export function recordMeeting(id: string) {
  progress.update((p) => (p.met.includes(id) ? p : { ...p, met: [...p.met, id] }));
}
export function recordFeed(total: number) {
  progress.update((p) => ({ ...p, fed: Math.max(p.fed, total) }));
}
export function recordScore(score: number) {
  progress.update((p) => ({ ...p, bestScore: Math.max(p.bestScore, score) }));
}
export function recordTreasure(loot?: string) {
  progress.update((p) => ({
    ...p,
    treasures: p.treasures + 1,
    loot: loot && !p.loot.includes(loot) ? [...p.loot, loot] : p.loot
  }));
}
export function recordTyped() {
  progress.update((p) => ({ ...p, typed: p.typed + 1 }));
}
