<script lang="ts">
  /**
   * The aquarium canvas. Owns the render loop and forwards taps to the World;
   * everything else about the simulation lives in $lib/sim.
   */
  import { onMount } from 'svelte';
  import { World, type HuntStage, type KeyEffect } from '$lib/sim/world';
  import { setScene } from '$lib/art';
  import { CAST } from '$lib/data/cast';
  import { mine, toSpec } from '$lib/stores/mine';
  import { settings } from '$lib/stores/settings';
  import { recordFeed, recordMeeting, recordTreasure } from '$lib/stores/progress';
  import { sfx } from '$lib/audio';
  import { speak } from '$lib/speech';
  import type { Creature } from '$lib/sim/types';

  let {
    world = $bindable<World | null>(null),
    onmeet = (c: Creature) => {},
    onhunt = (stage: HuntStage) => {},
    span = undefined as number | undefined,
    onkey = (effect: KeyEffect) => {},
    onpearl = (home: number, wanted: number) => {},
    ontravel = (to: string) => {},
    ondrive = (riding: boolean) => {}
  }: {
    world?: World | null;
    onmeet?: (c: Creature) => void;
    onhunt?: (stage: HuntStage) => void;
    /** Force a one-screen sea. Hide and seek does; the tank does not. */
    span?: number;
    onkey?: (effect: KeyEffect) => void;
    onpearl?: (home: number, wanted: number) => void;
    ontravel?: (to: string) => void;
    ondrive?: (riding: boolean) => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let host: HTMLDivElement;
  let raf = 0;
  let dpr = 1;

  onMount(() => {
    const ctx = canvas.getContext('2d', { alpha: false })!;
    setScene($settings.scene);   // before the world sizes, so scenery grows to match
    // her own creatures swim with the rest
    const cast = [...CAST, ...$mine.map(toSpec)];
    const w = new World(ctx, cast, { quality: $settings.quality, sparkles: $settings.sparkles, span }, {
      onFeed: (total) => recordFeed(total),
      onTap: (c) => {
        recordMeeting(c.id);
        onmeet(c);
        // hearing the name is how a non-reader learns who is who
        if ($settings.sound) speak(c.name, $settings.lang, 1);
        if ($settings.sound) {
          if (c.kind === 'merperson' || c.kind === 'rider') sfx.sing();
          else if (c.sparkles) { sfx.chime(); setTimeout(sfx.chime, 130); }
          else sfx.chime();
        }
      },
      onKeyFound: () => {
        if ($settings.sound) { sfx.chime(); setTimeout(sfx.chime, 120); }
      },
      onChestOpen: (_total, loot) => {
        recordTreasure(loot);
        if ($settings.sound) sfx.sing();
      },
      onCheer: () => {
        if ($settings.sound) sfx.sing();
      },
      onPearl: (home, wanted) => {
        onpearl(home, wanted);
        if ($settings.sound) home >= wanted ? sfx.sing() : sfx.chime();
      },
      onTravel: (to) => {
        ontravel(to);
        if ($settings.sound) sfx.sing();
      },
      onTamed: () => { if ($settings.sound) { sfx.sing(); setTimeout(sfx.chime, 220); } },
      onDrive: (c) => ondrive(!!c)
    });
    world = w;

    const fit = () => {
      const rect = host.getBoundingClientRect();
      // cap the backing store so older phones can still allocate it
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(240, Math.round(rect.width));
      const cssH = Math.max(240, Math.round(rect.height));
      let scale = dpr;
      const MAXPIX = 3.2e6;
      if (cssW * cssH * scale * scale > MAXPIX) scale = Math.sqrt(MAXPIX / (cssW * cssH));
      scale = Math.max(0.6, Math.min(scale, 2));
      canvas.width = Math.round(cssW * scale);
      canvas.height = Math.round(cssH * scale);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      w.resize(cssW, cssH);
    };
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(host);
    window.addEventListener('orientationchange', () => setTimeout(fit, 300));

    let last = performance.now();
    let stage: HuntStage = w.treasure.stage;
    const frame = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      if (!isFinite(dt) || dt < 0) dt = 1 / 60;
      w.step(Math.min(dt, 0.05));
      // pointer lean and device lean both slide the reef layers
      w.setLook(lean.x + w.tilt.x * 0.6, lean.y + w.tilt.y * 0.5);
      w.draw();
      // World is a plain class, so the hunt is reported out rather than watched
      if (w.treasure.stage !== stage) { stage = w.treasure.stage; onhunt(stage); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // pause when the tab is hidden so we do not burn battery in a pocket
    const vis = () => { if (document.hidden) last = performance.now(); };
    document.addEventListener('visibilitychange', vis);

    // every key does something in the tank
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const effect = w.pressKey(e.key);
      if (!effect) return;
      // the arrows and space would otherwise scroll the page out from under her
      if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
      onkey(effect);
      if (!$settings.sound) return;
      if (effect.kind === 'letter') effect.matched.length ? sfx.sing() : sfx.chime();
      else if (effect.kind === 'feed' || effect.kind === 'food') sfx.plop();
      else if (effect.kind === 'burst') sfx.sing();
      else sfx.pop();
    };
    window.addEventListener('keydown', key);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      stopStream();
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', vis);
    };
  });

  // keep the live world in step with the settings sheet
  $effect(() => {
    if (world) {
      world.options.quality = $settings.quality;
      world.options.sparkles = $settings.sparkles;
    }
  });

  // changing the place regrows the reef around the cast, who stay put
  $effect(() => {
    if (world) {
      setScene($settings.scene);
      world.resize(world.width, world.height);
    }
  });

  /* ------------------------------------------------------------ gestures */

  /** Canvas coordinates for a pointer event. */
  function at(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  let drag: { x: number; y: number; moved: number } | null = null;
  let stream = 0;
  let lean = { x: 0, y: 0 };

  /** After this long without moving, a held finger starts blowing bubbles. */
  const HOLD_MS = 400;

  function startStream(x: number, y: number) {
    stopStream();
    stream = window.setInterval(() => world?.bubbleStream(x, y), 90);
  }
  function stopStream() {
    if (stream) { clearInterval(stream); stream = 0; }
  }

  function down(e: PointerEvent) {
    e.preventDefault();
    // capture can throw if the pointer is already gone; never lose the tap over it
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine */ }
    const { x, y } = at(e);
    drag = { x, y, moved: 0 };
    world?.pressPointer();

    // a doorway takes a hold, not a tap — no bubbles, no food, just the ring
    if (world?.beginHold(x, y)) {
      if ($settings.sound) sfx.pop();
      return;
    }

    const hit = world?.tap(x, y);
    // a tame creature offers its back: tap to ride, tap again to let go
    if (hit?.tame && world) {
      world.drive(world.driving === hit ? null : hit);
      if ($settings.sound) sfx.chime();
    }
    if (!hit && $settings.sound) sfx.plop();
    // holding still on one spot turns her finger into a bubbler
    setTimeout(() => { if (drag && drag.moved < 10) startStream(drag.x, drag.y); }, HOLD_MS);
  }

  function move(e: PointerEvent) {
    if (!world) return;
    const { x, y } = at(e);
    // a mouse gets the drawn cursor; touch has nothing to hover with
    if (e.pointerType === 'mouse') {
      world.setPointer(x, y);
      lean = { x: (x / canvas.clientWidth - 0.5) * 1.6, y: (y / canvas.clientHeight - 0.5) * 1.2 };
      canvas.style.cursor = 'none';
    }
    if (!drag) return;
    const dx = x - drag.x, dy = y - drag.y;
    drag.moved += Math.hypot(dx, dy);
    if (drag.moved > 10) stopStream();
    // sliding off the doorway cancels the journey
    if (world.hold && drag.moved > 24) world.cancelHold();
    if (world.hold) { drag.x = x; drag.y = y; return; }
    drag.x = x; drag.y = y;
    world.swipe(x, y, dx, dy);
  }

  function up() {
    drag = null;
    stopStream();
    world?.cancelHold();
  }

  function leave(e: PointerEvent) {
    up();
    if (e.pointerType === 'mouse') {
      world?.clearPointer();
      lean = { x: 0, y: 0 };
      canvas.style.cursor = 'default';
    }
  }
</script>

<div class="host" bind:this={host}>
  <canvas
    bind:this={canvas}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onpointerleave={leave}
    aria-label="Aquarium"
  ></canvas>
</div>

<style>
  .host {
    position: fixed;
    inset: 0;
    touch-action: none;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
