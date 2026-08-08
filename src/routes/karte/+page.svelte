<script lang="ts">
  /**
   * The chart of the nine places.
   *
   * Built from the same link graph the doorways use, so it can never disagree
   * with what she can actually do. Each place is a porthole showing its own
   * water, the routes bow like currents and flow towards where she can go, and
   * everything she cannot reach yet stays on the chart but goes quiet — the
   * world should look bigger than the bit she is standing in.
   */
  import Meta from '$lib/components/Meta.svelte';
  import { SCENES, SCENE_LIST, type SceneId } from '$lib/data/scenes';
  import { settings } from '$lib/stores/settings';
  import { sfx } from '$lib/audio';
  import { speak } from '$lib/speech';
  import { goto } from '$app/navigation';

  const here = $derived($settings.scene);
  const reachable = $derived(new Set(SCENES[here]?.links ?? []));

  /** Every link once, for drawing the routes. */
  const EDGES = (() => {
    const seen = new Set<string>();
    const out: { a: SceneId; b: SceneId }[] = [];
    for (const s of SCENE_LIST) {
      for (const to of s.links) {
        const key = [s.id, to].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ a: s.id, b: to });
      }
    }
    return out;
  })();

  const pos = (id: SceneId) => {
    const [col, row] = SCENES[id].cell;
    return { x: 17 + col * 33, y: 17 + row * 33 };
  };

  /**
   * A route that bows sideways instead of running straight, so the chart reads
   * as currents rather than a wiring diagram. The bow always leans the same
   * way for a given pair, so it never flickers.
   */
  function route(a: SceneId, b: SceneId) {
    const p = pos(a), q = pos(b);
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    const dx = q.x - p.x, dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = (a < b ? 1 : -1) * 6;
    return `M ${p.x} ${p.y} Q ${mx + (-dy / len) * bow} ${my + (dx / len) * bow} ${q.x} ${q.y}`;
  }

  function go(id: SceneId) {
    if (id === here) { goto('/'); return; }
    if (!reachable.has(id)) {
      // not from here — name it rather than doing nothing
      if ($settings.sound) sfx.wrong();
      speak(SCENES[id].name[$settings.lang], $settings.lang);
      return;
    }
    $settings.scene = id;
    if ($settings.sound) sfx.sing();
    speak(SCENES[id].name[$settings.lang], $settings.lang);
    goto('/');
  }
</script>

<Meta path="/karte" />

<div class="page">
  <div class="chart">
    <!-- a few bubbles drifting over the chart, so it is not a dead diagram -->
    {#each [8, 23, 47, 62, 78, 91] as left, i (left)}
      <span class="bubble" style="left:{left}%; animation-delay:{i * 2.3}s"></span>
    {/each}

    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id="deep" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stop-color="rgba(255,255,255,.16)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <!-- chart grid, faint, for the sea-chart feel -->
      {#each [17, 50, 83] as g (g)}
        <line class="grid" x1={g} y1="4" x2={g} y2="96" />
        <line class="grid" x1="4" y1={g} x2="96" y2={g} />
      {/each}
      <circle cx="50" cy="42" r="46" fill="url(#deep)" />

      {#each EDGES as e (e.a + e.b)}
        {@const live = e.a === here || e.b === here}
        <path class="route" class:live d={route(e.a, e.b)} />
        {#if live}
          <path class="flow" d={route(e.a, e.b)} />
        {/if}
      {/each}
    </svg>

    {#each SCENE_LIST as s (s.id)}
      {@const p = pos(s.id)}
      <button
        class="place"
        class:here={s.id === here}
        class:near={reachable.has(s.id)}
        style="left:{p.x}%; top:{p.y}%; --w1:{s.water[1]}; --w4:{s.water[4]}; --sand:{s.sand[0]}"
        onclick={() => go(s.id)}
        aria-label={s.name[$settings.lang]}
        aria-current={s.id === here ? 'true' : undefined}
      >
        <span class="porthole">
          <span class="water"></span>
          <span class="floor"></span>
          <span class="icon">{s.icon}</span>
          <span class="glint"></span>
        </span>
        <span class="tag">{s.name[$settings.lang]}</span>
        {#if s.id === here}<span class="you">🫧</span>{/if}
      </button>
    {/each}

    <span class="compass" aria-hidden="true">✦</span>
  </div>
</div>

<style>
  .page { padding-bottom: 92px; }

  .chart {
    position: relative;
    width: min(600px, calc(100vw - 20px));
    aspect-ratio: 1;
    margin: 4px auto 0;
    border-radius: 28px;
    overflow: hidden;
    background:
      radial-gradient(120% 90% at 50% 0%, rgba(190, 240, 255, 0.28), rgba(255, 255, 255, 0) 60%),
      linear-gradient(180deg, #2b7fa6 0%, #1d5f83 45%, #123f5c 100%);
    border: 3px solid rgba(255, 255, 255, 0.35);
    box-shadow: inset 0 0 60px rgba(0, 25, 45, 0.5), 0 12px 34px rgba(0, 35, 60, 0.32);
  }

  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .grid { stroke: rgba(255, 255, 255, 0.075); stroke-width: 0.35; }

  .route {
    fill: none;
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 0.9;
    stroke-linecap: round;
    stroke-dasharray: 2.4 2.6;
  }
  .route.live { stroke: rgba(255, 209, 102, 0.5); stroke-width: 1.9; stroke-dasharray: none; }
  /* a current running along the routes she can actually take */
  .flow {
    fill: none;
    stroke: #ffe9a8;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-dasharray: 1.5 7;
    animation: drift 2.4s linear infinite;
  }
  @keyframes drift { to { stroke-dashoffset: -17; } }

  .bubble {
    position: absolute;
    bottom: -6%;
    width: 9px; height: 9px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.12);
    animation: rise 14s linear infinite;
    pointer-events: none;
  }
  @keyframes rise {
    to { transform: translateY(-620px) translateX(14px); opacity: 0; }
  }

  .place {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
  }

  /* each place is a little window onto its own water */
  .porthole {
    position: relative;
    display: grid;
    place-items: center;
    width: 76px; height: 76px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid rgba(255, 255, 255, 0.55);
    box-shadow: 0 6px 16px rgba(0, 30, 50, 0.4);
    opacity: 0.4;
    filter: saturate(0.35);
    transition: opacity 0.3s ease, filter 0.3s ease, transform 0.15s ease;
  }
  .water {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, var(--w1), var(--w4));
  }
  .floor {
    position: absolute; left: -10%; right: -10%; bottom: -14%;
    height: 42%;
    border-radius: 50% 50% 0 0;
    background: var(--sand);
    opacity: 0.9;
  }
  .icon {
    position: relative;
    font-size: 32px;
    line-height: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 25, 45, 0.45));
  }
  /* the curve of glass across the top of the porthole */
  .glint {
    position: absolute; inset: 0;
    background: radial-gradient(60% 42% at 32% 16%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0) 70%);
  }

  .place.near .porthole { opacity: 1; filter: none; border-color: rgba(255, 255, 255, 0.9); }
  .place.here .porthole {
    opacity: 1;
    filter: none;
    border-color: #ffd166;
    box-shadow: 0 0 0 5px rgba(255, 209, 102, 0.4), 0 8px 20px rgba(0, 30, 50, 0.45);
    animation: beat 2.4s ease-in-out infinite;
  }
  @keyframes beat { 50% { transform: scale(1.07); } }
  .place:active .porthole { transform: scale(0.93); }
  .place.near:hover .porthole { transform: translateY(-3px) scale(1.05); }

  .you {
    position: absolute;
    top: -14px;
    font-size: 17px;
    animation: bob 2.2s ease-in-out infinite;
  }
  @keyframes bob { 50% { transform: translateY(-5px); } }

  .tag {
    font-size: 12.5px;
    font-weight: 800;
    text-shadow: 0 2px 6px rgba(0, 35, 60, 0.95);
    white-space: nowrap;
    opacity: 0.6;
  }
  .place.here .tag, .place.near .tag { opacity: 1; }

  .compass {
    position: absolute;
    right: 14px; bottom: 12px;
    font-size: 22px;
    opacity: 0.4;
    animation: spin 26s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 560px) {
    .porthole { width: 58px; height: 58px; border-width: 2px; }
    .icon { font-size: 25px; }
    .tag { font-size: 10.5px; }
    .chart { border-radius: 22px; }
  }
</style>
