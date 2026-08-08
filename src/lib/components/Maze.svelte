<script lang="ts">
  /**
   * The coral maze. She drags a seahorse through it to the treasure.
   *
   * Walls block but never punish: the swimmer slides along them, there is no
   * timer and no way to lose. Finishing regenerates a fresh maze.
   */
  import { onMount } from 'svelte';
  import * as art from '$lib/art';
  import { atGoal, generateMaze, resolve, type Maze } from '$lib/sim/maze';
  import { settings } from '$lib/stores/settings';
  import { sfx } from '$lib/audio';
  import { GALLERY } from '$lib/data/cast';
  import type { CreatureSpec } from '$lib/sim/types';

  let { onwin = () => {} }: { onwin?: () => void } = $props();

  let canvas: HTMLCanvasElement;
  let host: HTMLDivElement;
  let raf = 0;

  let maze: Maze | null = null;
  let swimmer = { x: 0, y: 0, dir: 1 as 1 | -1, phase: 0 };
  let target: { x: number; y: number } | null = null;
  let sparkles: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = [];
  let won = 0;

  /** A seahorse leads, because it is upright and reads well at maze scale. */
  const HERO: CreatureSpec =
    GALLERY.find((c) => c.kind === 'seahorse') ?? GALLERY[0];

  function reset(w: number, h: number) {
    maze = generateMaze(w, h);
    swimmer = { x: maze.start.x, y: maze.start.y, dir: 1, phase: 0 };
    target = null;
    won = 0;
  }

  onMount(() => {
    const ctx = canvas.getContext('2d', { alpha: false })!;
    art.bindContext(ctx);

    let cssW = 0, cssH = 0;
    const fit = () => {
      const rect = host.getBoundingClientRect();
      cssW = Math.max(240, Math.round(rect.width));
      cssH = Math.max(240, Math.round(rect.height));
      const scale = Math.max(0.6, Math.min(window.devicePixelRatio || 1, 2));
      canvas.width = Math.round(cssW * scale);
      canvas.height = Math.round(cssH * scale);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      art.setTank(cssW, cssH);
      reset(cssW, cssH);
    };
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(host);

    let last = performance.now();
    const frame = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      if (!isFinite(dt) || dt < 0) dt = 1 / 60;
      dt = Math.min(dt, 0.05);
      step(dt, cssW, cssH);
      paint(ctx, cssW, cssH, now / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  });

  function step(dt: number, w: number, h: number) {
    if (!maze) return;
    const r = maze.size * 0.26;

    if (won > 0) {
      won -= dt;
      if (won <= 0) reset(w, h);
    } else if (target) {
      // swim towards her finger, then let the walls have their say
      const dx = target.x - swimmer.x, dy = target.y - swimmer.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        const sp = Math.min(maze.size * 3.4, d * 6);
        swimmer.x += (dx / d) * sp * dt;
        swimmer.y += (dy / d) * sp * dt;
        if (Math.abs(dx) > 4) swimmer.dir = dx > 0 ? 1 : -1;
        swimmer.phase += dt * 9;
      }
      const fixed = resolve(maze, swimmer.x, swimmer.y, r);
      swimmer.x = fixed.x;
      swimmer.y = fixed.y;

      if (atGoal(maze, swimmer.x, swimmer.y)) {
        won = 2.4;
        target = null;
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * 7, sp = 60 + Math.random() * 220;
          sparkles.push({
            x: maze.goal.x, y: maze.goal.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
            life: 1 + Math.random(), col: art.pick(art.RAINBOW)
          });
        }
        if ($settings.sound) sfx.sing();
        onwin();
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 150 * dt; s.life -= dt;
      if (s.life <= 0) sparkles.splice(i, 1);
    }
  }

  function paint(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
    art.bindContext(g);   // shared module context; claim it before painting
    art.reef.water(t);
    if (!maze) return;

    const m = maze;
    const wall = m.size * 0.17;

    // the goal first, so the walls sit over its glow
    g.save();
    g.globalAlpha = 0.35 + 0.2 * Math.sin(t * 2.4);
    g.fillStyle = '#ffe680';
    g.beginPath(); g.arc(m.goal.x, m.goal.y, m.size * 0.5, 0, 7); g.fill();
    g.restore();
    g.save();
    g.translate(m.goal.x, m.goal.y + m.size * 0.16);
    const s = m.size / 90;
    g.scale(s, s);
    art.reef.loot('crown', t);
    g.restore();

    // walls, drawn as knobbly coral rather than lines
    g.lineCap = 'round';
    for (const seg of m.segments) {
      g.strokeStyle = 'rgba(20,70,100,.25)';
      g.lineWidth = wall + 5;
      g.beginPath(); g.moveTo(seg.x1, seg.y1 + 3); g.lineTo(seg.x2, seg.y2 + 3); g.stroke();

      const grad = g.createLinearGradient(seg.x1, seg.y1, seg.x2, seg.y2);
      grad.addColorStop(0, '#ff6b9d');
      grad.addColorStop(0.5, '#c471f5');
      grad.addColorStop(1, '#ff9f43');
      g.strokeStyle = grad;
      g.lineWidth = wall;
      g.beginPath(); g.moveTo(seg.x1, seg.y1); g.lineTo(seg.x2, seg.y2); g.stroke();

      // a few polyps so it reads as living coral
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      const n = Math.max(2, Math.round(len / 22));
      for (let i = 0; i <= n; i++) {
        const p = i / n;
        const x = seg.x1 + (seg.x2 - seg.x1) * p;
        const y = seg.y1 + (seg.y2 - seg.y1) * p;
        g.fillStyle = 'rgba(255,255,255,.35)';
        g.beginPath();
        g.arc(x, y, wall * 0.24 * (0.7 + 0.3 * Math.sin(t * 2 + i + seg.x1)), 0, 7);
        g.fill();
      }
    }

    // the swimmer
    g.save();
    g.translate(swimmer.x, swimmer.y);
    const k = (m.size * 0.5) / 40;
    g.scale(swimmer.dir * k, k);
    art.drawCreature(HERO.kind, { ...HERO, size: 40, phase: swimmer.phase, tailSpeed: 7 }, t);
    g.restore();

    for (const sp of sparkles) {
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, sp.life));
      g.fillStyle = sp.col;
      g.beginPath(); g.arc(sp.x, sp.y, 5, 0, 7); g.fill();
      g.restore();
    }
  }

  /* --------------------------------------------------------------- input */

  function at(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: PointerEvent) {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine */ }
    target = at(e);
  }
  function move(e: PointerEvent) {
    if (target) target = at(e);
  }
  function up() {
    target = null;
  }
</script>

<div class="host" bind:this={host}>
  <canvas
    bind:this={canvas}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    aria-label="Labyrinth"
  ></canvas>
</div>

<style>
  .host { position: fixed; inset: 0; touch-action: none; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
