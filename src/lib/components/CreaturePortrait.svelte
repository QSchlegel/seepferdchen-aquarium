<script lang="ts">
  /** Draws one creature, animated, into a small canvas — used on the cards. */
  import { onMount } from 'svelte';
  import * as art from '$lib/art';
  import { extentOf } from '$lib/art/extents';
  import type { CreatureSpec } from '$lib/sim/types';

  let { spec, size = 96, speed = 1 }: { spec: CreatureSpec; size?: number; speed?: number } = $props();

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    let raf = 0;
    const t0 = performance.now();

    // fit the creature's real bounding box into the tile with a little margin
    const e = extentOf(spec.kind);
    const pad = 0.88;
    const scale = Math.min(
      (size * pad) / (spec.size * e.halfW * 2),
      (size * pad) / (spec.size * e.halfH * 2)
    );

    const frame = (now: number) => {
      const t = ((now - t0) / 1000) * speed;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      art.bindContext(ctx);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(scale, scale);
      ctx.translate(-e.cx * spec.size, -e.cy * spec.size);
      art.drawCreature(spec.kind, { ...spec, dir: 1, phase: spec.phase ?? 0, wiggle: 0 }, t);
      ctx.restore();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });
</script>

<canvas bind:this={canvas} style="width:{size}px;height:{size}px"></canvas>

<style>
  canvas { display: block; }
</style>
