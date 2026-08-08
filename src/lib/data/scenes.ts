/**
 * The places the tank can be. Each scene is a palette and a set of densities;
 * the drawing routines are shared, so a new scene is data rather than code.
 */

export type SceneId =
  | 'riff' | 'kelpwald' | 'tiefsee' | 'lagune' | 'wrack'
  | 'hoehle' | 'vulkan' | 'eismeer' | 'perlbank';

export interface Scene {
  id: SceneId;
  icon: string;
  name: { de: string; en: string };
  /** Top-to-bottom water gradient. */
  water: [string, string, string, string, string];
  /** Sea floor, light to dark. */
  sand: [string, string, string];
  /** Sunbeam colour and how strong they are. */
  ray: string;
  rayAlpha: number;
  /** Multipliers on how much of each thing grows here. 0 means none. */
  growth: {
    seaweed: number; kelp: number; fans: number;
    sponges: number; anemones: number; coral: number;
  };
  /** Tint laid over the whole scene, for the deep and the shallow. */
  tint?: { color: string; alpha: number };
  /** Creatures glow faintly in the dark. */
  glow?: boolean;
  /**
   * The shape of the sea floor here. `seed` moves the noise to a different
   * stretch of coastline; the rest set how dramatic it is.
   */
  terrain: {
    seed: number;
    /** Height of the broad dunes, as a fraction of the tank. */
    roll: number;
    /** How high the outcrops stand. */
    ridge: number;
    /** How often outcrops occur. */
    ridgeFreq: number;
    /** How high the floor sits overall; negative digs it deeper. */
    lift: number;
  };
  /**
   * Who lives here, by group. The heroes follow her everywhere; the rest of
   * the cast belongs to a place, so arriving somewhere new means meeting
   * somebody new rather than seeing the same tank repainted.
   */
  residents: string[];
  /** There is a wreck on the floor here, and she can swim inside it. */
  wreck?: boolean;
  /**
   * Which places you can reach from here. Always symmetric — if you can swim
   * there you can swim back — and each one becomes a headland in the distant
   * terrain. Positions are derived, so adding a link needs no layout work.
   */
  links: SceneId[];
  /** Where this place sits on the map, as a 3x3 grid cell. */
  cell: [number, number];
}

export const SCENES: Record<SceneId, Scene> = {
  riff: {
    id: 'riff',
    icon: '🪸',
    name: { de: 'Riff', en: 'Reef' },
    water: ['#a9e7de', '#77d3d6', '#3fa8c9', '#1f7ba8', '#155c86'],
    sand: ['#f7e6b8', '#efd9a0', '#e0c489'],
    ray: '#eafff8',
    rayAlpha: 1,
    growth: { seaweed: 1, kelp: 1, fans: 1, sponges: 1, anemones: 1, coral: 1 },
    links: ['kelpwald', 'lagune', 'tiefsee'],
    cell: [1, 1],
    residents: ['rangers', 'seahorses', 'fish', 'shoals', 'friends', 'unicorns'],
    terrain: { seed: 0,   roll: 0.10, ridge: 0.05, ridgeFreq: 7.3,  lift: 0 },
  },
  kelpwald: {
    id: 'kelpwald',
    icon: '🌿',
    name: { de: 'Kelpwald', en: 'Kelp forest' },
    water: ['#cfe9b8', '#8fc98f', '#4f9e7e', '#2b7566', '#1c4f4c'],
    sand: ['#e6dcae', '#d3c795', '#b9ad7d'],
    ray: '#f0ffd8',
    rayAlpha: 1.25,
    growth: { seaweed: 2.4, kelp: 3.2, fans: 0.3, sponges: 0.4, anemones: 0.5, coral: 0.4 },
    links: ['riff', 'eismeer', 'hoehle'],
    cell: [0, 1],
    residents: ['rangers', 'seahorses', 'fish', 'shoals'],
    terrain: { seed: 31,  roll: 0.07, ridge: 0.02, ridgeFreq: 4.1,  lift: 0.02 },
  },
  tiefsee: {
    id: 'tiefsee',
    icon: '🌚',
    name: { de: 'Tiefsee', en: 'Deep sea' },
    water: ['#12405e', '#0d3350', '#0a2740', '#071c30', '#04121f'],
    sand: ['#4a5568', '#3d4757', '#2f3846'],
    ray: '#9fd8ff',
    rayAlpha: 0.28,
    growth: { seaweed: 0.3, kelp: 0.2, fans: 0.6, sponges: 1.4, anemones: 1.6, coral: 0.7 },
    tint: { color: '#0a1c30', alpha: 0.3 },
    glow: true,
    links: ['riff', 'hoehle', 'vulkan'],
    cell: [1, 2],
    residents: ['rangers', 'friends', 'shoals'],
    terrain: { seed: 77,  roll: 0.17, ridge: 0.13, ridgeFreq: 3.2,  lift: -0.06 },
  },
  wrack: {
    id: 'wrack',
    icon: '⚓',
    name: { de: 'Schiffswrack', en: 'Shipwreck' },
    water: ['#8fc6cf', '#5ea5b8', '#3b7f9c', '#28607e', '#1a4460'],
    sand: ['#e8dcc0', '#d6c8a8', '#c0b08e'],
    ray: '#dff2ff',
    rayAlpha: 0.7,
    growth: { seaweed: 0.7, kelp: 0.5, fans: 0.8, sponges: 1.1, anemones: 0.9, coral: 0.8 },
    tint: { color: '#1a3a52', alpha: 0.1 },
    wreck: true,
    links: ['vulkan', 'perlbank'],
    cell: [2, 1],
    residents: ['rangers', 'friends', 'fish', 'seahorses'],
    terrain: { seed: 128, roll: 0.05, ridge: 0.02, ridgeFreq: 9.0,  lift: 0.03 },
  },
  lagune: {
    id: 'lagune',
    icon: '🏝️',
    name: { de: 'Lagune', en: 'Lagoon' },
    water: ['#eafbf3', '#b6f0e4', '#7fe0d6', '#4fc7c4', '#2ba3a8'],
    sand: ['#fff6dc', '#fbeac2', '#f0dba8'],
    ray: '#ffffff',
    rayAlpha: 1.5,
    growth: { seaweed: 0.8, kelp: 0.3, fans: 0.7, sponges: 0.6, anemones: 1.2, coral: 1.4 },
    tint: { color: '#fff3c9', alpha: 0.08 },
    links: ['riff', 'perlbank', 'eismeer'],
    cell: [1, 0],
    residents: ['rangers', 'unicorns', 'seahorses', 'shoals'],
    terrain: { seed: 205, roll: 0.05, ridge: 0.01, ridgeFreq: 5.5, lift: 0.08 }
  },
  hoehle: {
    id: 'hoehle',
    icon: '🕳️',
    name: { de: 'Höhle', en: 'Cave' },
    water: ['#2a3550', '#232c46', '#1b2438', '#141b2b', '#0d121d'],
    sand: ['#5a5468', '#4a4557', '#3a3645'],
    ray: '#b9a6ff',
    rayAlpha: 0.22,
    growth: { seaweed: 0.2, kelp: 0.1, fans: 0.4, sponges: 1.6, anemones: 1.3, coral: 0.5 },
    tint: { color: '#140f26', alpha: 0.32 },
    glow: true,
    links: ['kelpwald', 'tiefsee', 'vulkan'],
    cell: [0, 2],
    residents: ['rangers', 'friends', 'shoals'],
    terrain: { seed: 311, roll: 0.14, ridge: 0.16, ridgeFreq: 5.7, lift: 0.04 }
  },
  vulkan: {
    id: 'vulkan',
    icon: '🌋',
    name: { de: 'Vulkan', en: 'Volcano' },
    water: ['#6e4a52', '#5a3b46', '#452e3a', '#31212c', '#1e141c'],
    sand: ['#5c4038', '#4a332d', '#382622'],
    ray: '#ffb08a',
    rayAlpha: 0.3,
    growth: { seaweed: 0.2, kelp: 0.1, fans: 1.2, sponges: 0.8, anemones: 1.4, coral: 0.6 },
    tint: { color: '#3a1410', alpha: 0.22 },
    glow: true,
    links: ['tiefsee', 'hoehle', 'wrack'],
    cell: [2, 2],
    residents: ['rangers', 'friends', 'fish'],
    terrain: { seed: 404, roll: 0.2, ridge: 0.22, ridgeFreq: 2.6, lift: -0.02 }
  },
  eismeer: {
    id: 'eismeer',
    icon: '🧊',
    name: { de: 'Eismeer', en: 'Ice sea' },
    water: ['#eaf7ff', '#c4e7f7', '#94cfe8', '#6aabcc', '#4a83a8'],
    sand: ['#e8f2f7', '#d2e2ea', '#b8ccd8'],
    ray: '#ffffff',
    rayAlpha: 1.4,
    growth: { seaweed: 0.4, kelp: 0.6, fans: 0.2, sponges: 0.5, anemones: 0.4, coral: 0.2 },
    tint: { color: '#dff2ff', alpha: 0.12 },
    links: ['kelpwald', 'lagune', 'perlbank'],
    cell: [0, 0],
    residents: ['rangers', 'seahorses', 'shoals', 'friends'],
    terrain: { seed: 512, roll: 0.13, ridge: 0.18, ridgeFreq: 3.8, lift: 0.05 }
  },
  perlbank: {
    id: 'perlbank',
    icon: '🦪',
    name: { de: 'Perlenbank', en: 'Pearl beds' },
    water: ['#fdeef6', '#f3d8e8', '#dcb6d2', '#b98fb6', '#8f6a92'],
    sand: ['#fff1e4', '#f6ddcd', '#e6c6b4'],
    ray: '#fff0fa',
    rayAlpha: 1.1,
    growth: { seaweed: 0.5, kelp: 0.2, fans: 1.1, sponges: 0.9, anemones: 1.5, coral: 1.6 },
    tint: { color: '#ffe6f4', alpha: 0.1 },
    links: ['lagune', 'wrack', 'eismeer'],
    cell: [2, 0],
    residents: ['rangers', 'seahorses', 'unicorns', 'shoals'],
    terrain: { seed: 620, roll: 0.06, ridge: 0.03, ridgeFreq: 6.4, lift: 0.06 }
  }
};

export const SCENE_LIST = Object.values(SCENES);

/** Standard slots for the doorways: left, middle, right. */
const SLOTS: [number, number][] = [[0.13, 0.52], [0.5, 0.46], [0.87, 0.52]];

/** Where the ways out of a place sit on screen, derived from its links. */
export function portalsOf(id: SceneId): { to: SceneId; at: [number, number] }[] {
  const links = SCENES[id]?.links ?? [];
  return links.slice(0, 3).map((to, i) => ({ to, at: SLOTS[i] ?? SLOTS[1] }));
}
export const DEFAULT_SCENE: SceneId = 'riff';
