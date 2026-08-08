/** User settings, kept in localStorage so the tank remembers how she likes it. */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Lang } from '$lib/data/i18n';
import { DEFAULT_SCENE, type SceneId } from '$lib/data/scenes';

export interface Settings {
  lang: Lang;
  sound: boolean;
  /** The ambient loop. Off by default — it is a room she may be sitting in. */
  music: boolean;
  sparkles: boolean;
  quality: 'low' | 'medium' | 'high';
  /** Which place the tank is in. */
  scene: SceneId;
}

const DEFAULTS: Settings = {
  lang: 'de', sound: true, music: false, sparkles: true, quality: 'high', scene: DEFAULT_SCENE
};
const KEY = 'aquarium.settings';

function load(): Settings {
  if (!browser) return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export const settings = writable<Settings>(load());

if (browser) {
  settings.subscribe((s) => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
  });
}
