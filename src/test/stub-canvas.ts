/**
 * A canvas context that swallows everything. The simulation never reads back
 * from the context, so this is enough to exercise step() and tap() in Node.
 */
export function stubContext(): CanvasRenderingContext2D {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 40 });
      if (prop === 'canvas') return { width: 800, height: 600 };
      return noop;
    },
    set: () => true
  };
  return new Proxy({}, handler) as CanvasRenderingContext2D;
}
