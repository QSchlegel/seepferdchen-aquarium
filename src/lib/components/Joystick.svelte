<script lang="ts">
  /**
   * The reins.
   *
   * A thumb stick for touch, WASD and the arrow keys for a keyboard. It only
   * exists while she is riding something, so the tank is not cluttered with a
   * control she cannot use yet.
   *
   * The stick recentres itself wherever her thumb lands rather than living at a
   * fixed point, because a five-year-old does not aim for a target before
   * dragging — she puts her thumb down and pulls.
   */
  import { onMount } from 'svelte';

  let {
    onsteer = (x: number, y: number) => {},
    onrelease = () => {}
  }: { onsteer?: (x: number, y: number) => void; onrelease?: () => void } = $props();

  let pad: HTMLDivElement;
  let active = $state(false);
  /** Where the thumb went down, and where it is now, in pad coordinates. */
  let origin = $state({ x: 0, y: 0 });
  let knob = $state({ x: 0, y: 0 });

  const REACH = 46;

  /** Keys currently held. Several at once gives the diagonals. */
  const held = new Set<string>();

  function fromKeys() {
    const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
    onsteer(x, y);
    if (!x && !y) onrelease();
  }

  const KEYMAP: Record<string, string> = {
    w: 'up', a: 'left', s: 'down', d: 'right',
    arrowup: 'up', arrowleft: 'left', arrowdown: 'down', arrowright: 'right'
  };

  onMount(() => {
    const down = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.key.toLowerCase()];
      if (!dir) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.isContentEditable)) return;
      e.preventDefault();
      held.add(dir);
      fromKeys();
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.key.toLowerCase()];
      if (!dir) return;
      held.delete(dir);
      fromKeys();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    // a lost keyup while the tab is away would leave her swimming forever
    const blur = () => { held.clear(); fromKeys(); };
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  });

  function at(e: PointerEvent) {
    const r = pad.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function press(e: PointerEvent) {
    e.preventDefault();
    try { pad.setPointerCapture(e.pointerId); } catch { /* fine */ }
    origin = at(e);
    knob = { x: 0, y: 0 };
    active = true;
  }

  function move(e: PointerEvent) {
    if (!active) return;
    const p = at(e);
    let dx = p.x - origin.x, dy = p.y - origin.y;
    const d = Math.hypot(dx, dy);
    if (d > REACH) { dx = (dx / d) * REACH; dy = (dy / d) * REACH; }
    knob = { x: dx, y: dy };
    onsteer(dx / REACH, dy / REACH);
  }

  function release() {
    if (!active) return;
    active = false;
    knob = { x: 0, y: 0 };
    onsteer(0, 0);
    onrelease();
  }
</script>

<div
  class="pad"
  bind:this={pad}
  onpointerdown={press}
  onpointermove={move}
  onpointerup={release}
  onpointercancel={release}
  onpointerleave={release}
  role="application"
  aria-label="Steuerung"
>
  <div class="ring" class:on={active} style={active ? `left:${origin.x}px; top:${origin.y}px` : ''}>
    <div class="knob" style="transform: translate({knob.x}px, {knob.y}px)"></div>
  </div>
  {#if !active}
    <div class="hint" aria-hidden="true">
      <span>▲</span>
      <span>◀ <span class="dot">●</span> ▶</span>
      <span>▼</span>
    </div>
  {/if}
</div>

<style>
  .pad {
    position: fixed;
    left: 0;
    bottom: calc(84px + env(safe-area-inset-bottom));
    width: min(190px, 42vw);
    height: min(190px, 42vw);
    margin-left: 6px;
    z-index: 42;
    touch-action: none;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.28);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: grid;
    place-items: center;
  }

  .ring {
    width: 96px; height: 96px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.14);
    display: grid;
    place-items: center;
    transition: opacity 0.15s ease;
  }
  /* the stick recentres under her thumb rather than sitting in one place */
  .ring.on {
    position: absolute;
    transform: translate(-50%, -50%);
  }

  .knob {
    width: 46px; height: 46px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.85);
    border: 3px solid rgba(255, 209, 102, 0.9);
    box-shadow: 0 4px 12px rgba(0, 35, 60, 0.35);
  }

  .hint {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.75);
    text-shadow: 0 1px 3px rgba(0, 35, 60, 0.7);
    pointer-events: none;
  }
  .dot { opacity: 0.5; }

  @media (min-width: 561px) {
    /* on a desktop the keyboard is the main way to drive, so this is smaller */
    .pad { width: 150px; height: 150px; left: 92px; bottom: 16px; }
  }
</style>
