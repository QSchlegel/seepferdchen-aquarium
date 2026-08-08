/**
 * How much room each kind of creature actually needs around its origin, in
 * multiples of its `size`, and where its visual centre sits. Used to frame
 * portraits — without it the long-tailed merpeople get their heads cropped.
 */
export interface Extent { halfW: number; halfH: number; cx: number; cy: number; }

const E: Record<string, Extent> = {
  merperson:   { halfW: 1.55, halfH: 1.05, cx: -0.32, cy: -0.20 },
  mermaid:     { halfW: 1.55, halfH: 1.05, cx: -0.32, cy: -0.20 },
  rider:       { halfW: 0.95, halfH: 1.55, cx:  0.05, cy: -0.05 },
  seahorse:    { halfW: 0.85, halfH: 1.35, cx:  0.05, cy: -0.05 },
  unicornLand: { halfW: 2.05, halfH: 1.35, cx: -0.45, cy: -0.10 },
  seaUnicorn:  { halfW: 2.05, halfH: 1.30, cx: -0.55, cy: -0.10 },
  unicorn:     { halfW: 1.60, halfH: 1.15, cx: -0.25, cy: -0.05 },
  eel:         { halfW: 2.40, halfH: 0.80, cx: -0.70, cy:  0.00 },
  snail:       { halfW: 1.30, halfH: 1.00, cx:  0.10, cy:  0.10 },
  crab:        { halfW: 1.10, halfH: 1.00, cx:  0.00, cy:  0.00 },
  star:        { halfW: 0.90, halfH: 0.90, cx:  0.00, cy:  0.00 },
  jelly:       { halfW: 0.85, halfH: 1.80, cx:  0.00, cy:  0.45 },
  octopus:     { halfW: 1.00, halfH: 1.40, cx:  0.00, cy:  0.25 },
  turtle:      { halfW: 1.15, halfH: 0.85, cx:  0.00, cy:  0.00 },
  shark:       { halfW: 1.35, halfH: 1.00, cx: -0.10, cy: -0.05 },
  parrot:      { halfW: 1.45, halfH: 1.10, cx: -0.15, cy:  0.00 },
  minnow:      { halfW: 1.25, halfH: 0.75, cx: -0.10, cy:  0.00 },
  fish:        { halfW: 1.55, halfH: 1.05, cx: -0.15, cy:  0.00 }
};

export function extentOf(kind: string): Extent {
  return E[kind] ?? E.fish;
}
