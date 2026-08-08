<script lang="ts">
  /** Draws one creature, animated, into a small canvas — used on the cards. */
  import { onMount } from 'svelte';
  import * as art from '$lib/art';
  import { extentOf } from '$lib/art/extents';
  import type { CreatureSpec } from '$lib/sim/types';

  let { spec, size = 96, speed = 1 }: { spec: CreatureSpec; size?: number; speed?: number } = $props();

  let canvas: HTMLCanvasElement;

  /**
   * The fit has to follow the creature.
   *
   * These were computed once at mount, so a tile that changes creature — the
   * maker's live preview does exactly that — kept drawing every later body
   * with the *first* one's bounding box. A unicorn scaled and centred as if it
   * were a fish is what came out as a smear.
   */
  const extent = $derived(extentOf(spec.kind));
  const scale = $derived(
    Math.min(
      // generous margin: the stored extents are approximations, and a clipped
      // creature looks broken in a way a slightly small one does not
      (size * 0.78) / (spec.size * extent.halfW * 2),
      (size * 0.78) / (spec.size * extent.halfH * 2)
    )
  );

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = ((now - t0) / 1000) * speed;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      art.bindContext(ctx);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(scale, scale);
      ctx.translate(-extent.cx * spec.size, -extent.cy * spec.size);
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
