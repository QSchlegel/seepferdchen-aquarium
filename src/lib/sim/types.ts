/** Shared shapes for the simulation. */

/** How a creature moves. Each mode is a different update routine in behaviour.ts. */
export type Mode =
  | 'swim'    // free roaming, chases food
  | 'school'  // holds a slot in a shoal that moves as one
  | 'follow'  // trails a leader at an offset
  | 'drift'   // rises slowly and reappears at the bottom
  | 'crawl'   // walks along the sea floor
  | 'bob'     // hovers around a home spot
  | 'static'; // sits still

export interface CreatureSpec {
  id: string;
  name: string;
  /** Which drawing routine paints it. */
  kind: string;
  size: number;
  mode?: Mode;
  /** Radians per second of the tail/leg cycle. */
  tailSpeed?: number;
  /** Pixels per second when roaming. */
  speed?: number;
  /** Doesn't tilt with vertical velocity (upright creatures: seahorses, merpeople). */
  upright?: boolean;
  /** Only eats greens. Shorthand for eats: ['greens']. */
  vegetarian?: boolean;
  /** Favourite food. It will cross the tank for this. Defaults by diet. */
  likes?: FoodKind;
  /**
   * Everything it will eat, favourite first. Anything not listed it ignores
   * completely, so what she drops decides who comes to dinner.
   */
  eats?: FoodKind[];
  /** Big enough that the little ones keep their distance. */
  scary?: boolean;
  /** Leaves a sparkle trail. */
  sparkles?: number;
  /** id of the creature to follow, for mode 'follow'. */
  leader?: string;
  followOffset?: { x: number; y: number };
  /** Which shoal it belongs to, for mode 'school'. */
  shoal?: string;
  /** A line for the character gallery. */
  about?: { de: string; en: string };
  /** Everything else is passed straight to the drawing routine as palette. */
  [key: string]: any;
}

export interface Creature extends CreatureSpec {
  x: number;
  y: number;
  /** Depth through the tank, -1 (far) to 1 (near). Only the 3D view uses it. */
  z: number;
  vz: number;
  /** Where it is drifting to in depth. */
  tz: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  phase: number;
  mode: Mode;
  tailSpeed: number;
  speed: number;
  /** Countdown while the creature is wiggling after a tap. */
  wiggle: number;
  /** Countdown while its name bubble is showing. */
  label: number;
  /** Counts 1 down to 0 through a celebratory somersault. */
  loop?: number;
  /** 0 (exhausted, pottering near the reef) to 1 (fresh). */
  energy?: number;
  /** How recently it was startled, 1 down to 0. */
  flee?: number;
  /** 0 (shy) to 1 (nosy). Fixed at spawn, so each one behaves consistently. */
  bold?: number;
  /** How many pellets it has eaten. */
  fed: number;
  /** Wander target. */
  tx: number | null;
  ty: number | null;
  retarget: number;
  /** Countdown to picking a new depth to drift towards. */
  retargetZ?: number;
  /** A slow rock with the swell, radians. Nothing in water is ever still. */
  sway?: number;
  /** Sea-floor walkers remember which way they are heading. */
  crawlDir?: 1 | -1;
  homeX?: number;
  offset?: { x: number; y: number };
  glitterTimer?: number;
  leaderRef?: Creature | null;
  /** Native artwork size, before the screen-size scale is applied. */
  baseSize?: number;
}

/** Everything she can drop in the water. */
export type FoodKind = 'pellet' | 'greens' | 'krill' | 'candy' | 'muesli' | 'plankton';

export interface Food {
  x: number; y: number; vx: number; vy: number; phase: number; life: number;
  kind: FoodKind;
  /** Which way the flake is lying, for the ones that tumble as they fall. */
  rot: number;
}

/** How each kind of food behaves on the way down. */
export const FOOD: Record<FoodKind, {
  /** Terminal sink speed, px/s. */ sink: number;
  /** How fast it gets there. */ pull: number;
  /** Sideways flutter. */ sway: number;
  /** Seconds before it dissolves. */ life: number;
  /** Tumble rate. */ spin: number;
}> = {
  pellet: { sink: 34, pull: 12, sway: 0.5, life: 26, spin: 2 },
  greens: { sink: 12, pull: 4,  sway: 4.5, life: 34, spin: 0.7 },
  krill:  { sink: 24, pull: 9,  sway: 1.6, life: 22, spin: 1.1 },
  // candy floss is spun sugar: it barely sinks at all and drifts for ages
  candy:  { sink: 6,  pull: 2,  sway: 5.5, life: 40, spin: 0.4 },
  // a bowlful is heavy, and settles quickly with barely a wobble
  muesli: { sink: 40, pull: 16, sway: 0.3, life: 30, spin: 0.5 },
  // plankton is almost weightless: it hangs in the water and swirls
  plankton: { sink: 4, pull: 1.5, sway: 6.5, life: 46, spin: 1.6 }
};

export interface Bubble {
  x: number; y: number; r: number; vy: number; phase: number; speed: number;
}

export interface Sparkle {
  x: number; y: number; vx: number; vy: number;
  gravity: number; life: number; maxLife: number;
  r: number; rot: number; star: boolean; color: string;
}

/** The pearl she steers into the chest by tilting the device. */
export interface Pearl {
  x: number; y: number; vx: number; vy: number; r: number; spin: number;
}

/** A letter she typed, drifting up through the water. */
export interface Letter {
  char: string;
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  rot: number; spin: number; size: number; color: string;
}

export interface Heart {
  x: number; y: number; vx: number; life: number; maxLife: number;
  scale: number; color: string;
}
