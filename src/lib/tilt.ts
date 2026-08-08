/**
 * Device tilt, for the pearl game.
 *
 * iOS gates the sensor behind a permission prompt that only works from a real
 * user gesture, so start() has to be called straight out of a tap handler.
 * Whatever angle the device is held at when it starts counts as level, because
 * nobody holds a tablet flat.
 */

export interface Tilt {
  /** -1 (left) to 1 (right). */
  x: number;
  /** -1 (back) to 1 (forward). */
  y: number;
}

type Ctor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** Is there a sensor worth asking for? Desktops define the event but never fire it. */
export function tiltSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.DeviceOrientationEvent === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

/** How far she has to tilt for full speed, in degrees. */
const RANGE = 26;
const DEADZONE = 0.12;

/** Clamp to -1..1 with a dead zone, so a steady hand means a still pearl. */
function shape(v: number): number {
  const a = Math.abs(v);
  if (a < DEADZONE) return 0;
  return Math.sign(v) * Math.min(1, (a - DEADZONE) / (1 - DEADZONE));
}

/**
 * Start listening. Resolves with a stop function, or null if the sensor is
 * missing or she said no to the permission prompt.
 */
export async function startTilt(onTilt: (t: Tilt) => void): Promise<(() => void) | null> {
  if (!tiltSupported()) return null;

  const ctor = window.DeviceOrientationEvent as Ctor;
  if (typeof ctor.requestPermission === 'function') {
    try {
      if ((await ctor.requestPermission()) !== 'granted') return null;
    } catch {
      return null;
    }
  }

  let zeroBeta: number | null = null;
  let zeroGamma = 0;

  const handler = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    if (zeroBeta === null) { zeroBeta = e.beta; zeroGamma = e.gamma; }
    onTilt({
      x: shape((e.gamma - zeroGamma) / RANGE),
      y: shape((e.beta - zeroBeta) / RANGE)
    });
  };

  window.addEventListener('deviceorientation', handler);
  return () => {
    window.removeEventListener('deviceorientation', handler);
    onTilt({ x: 0, y: 0 });
  };
}
