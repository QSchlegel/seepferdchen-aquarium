<script lang="ts">
  /**
   * Admin: the module graph.
   *
   * Every source file is a node, every import an edge, generated at build time
   * by scripts/graph.mjs — the browser cannot read the source tree, so this
   * ships as data. Laid out with a small spring simulation rather than a graph
   * library, since the whole app is otherwise dependency-free.
   *
   * Not linked from the drawer: this is for whoever maintains the thing, not
   * for the child using it.
   */
  import { onMount } from 'svelte';
  import graph from '$lib/data/graph.json';

  type Node = {
    id: string; label: string; layer: string; loc: number; fanIn: number;
    x: number; y: number; vx: number; vy: number;
  };

  const LAYERS: Record<string, { colour: string; name: string }> = {
    route:     { colour: '#ffd166', name: 'Seiten' },
    component: { colour: '#63d3f0', name: 'Komponenten' },
    sim:       { colour: '#7ef0c8', name: 'Simulation' },
    art:       { colour: '#ff6b9d', name: 'Zeichnen' },
    data:      { colour: '#c471f5', name: 'Daten' },
    store:     { colour: '#ff9f43', name: 'Speicher' },
    lib:       { colour: '#a8b8c8', name: 'Sonstiges' }
  };

  const W = 1000, H = 680;

  let nodes = $state<Node[]>([]);
  let links = $state<{ source: string; target: string }[]>([]);
  let selected = $state<string | null>(null);
  let hidden = $state(new Set<string>());
  let running = $state(true);

  /** Everything the selected module touches, in either direction. */
  const related = $derived.by(() => {
    if (!selected) return null;
    const up = new Set<string>(), down = new Set<string>();
    for (const l of links) {
      if (l.source === selected) down.add(l.target);
      if (l.target === selected) up.add(l.source);
    }
    return { up, down };
  });

  const shown = $derived(nodes.filter((n) => !hidden.has(n.layer)));
  const shownIds = $derived(new Set(shown.map((n) => n.id)));
  const shownLinks = $derived(
    links.filter((l) => shownIds.has(l.source) && shownIds.has(l.target))
  );

  const byId = $derived(new Map(nodes.map((n) => [n.id, n])));
  const radius = (n: Node) => 6 + Math.min(16, Math.sqrt(n.loc) * 0.55) + n.fanIn * 0.5;

  function edgeClass(l: { source: string; target: string }) {
    if (!selected) return 'edge';
    if (l.source === selected) return 'edge out';
    if (l.target === selected) return 'edge in';
    return 'edge dim';
  }

  function nodeClass(n: Node) {
    if (!selected) return 'node';
    if (n.id === selected) return 'node picked';
    if (related?.up.has(n.id)) return 'node up';
    if (related?.down.has(n.id)) return 'node down';
    return 'node dim';
  }

  onMount(() => {
    // seed on a circle: a random start makes the layout different every visit
    const raw = graph.nodes as Omit<Node, 'x' | 'y' | 'vx' | 'vy'>[];
    nodes = raw.map((n, i) => {
      const a = (i / raw.length) * Math.PI * 2;
      return { ...n, x: W / 2 + Math.cos(a) * 260, y: H / 2 + Math.sin(a) * 220, vx: 0, vy: 0 };
    });
    links = graph.links as { source: string; target: string }[];

    // a plain spring layout: repulsion everywhere, attraction along imports,
    // and a pull to the middle so nothing drifts off the canvas
    let raf = 0;
    let heat = 1;
    const step = () => {
      if (running) {
        const index = new Map(nodes.map((n) => [n.id, n]));
        for (const a of nodes) {
          for (const b of nodes) {
            if (a === b) continue;
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy || 1;
            if (d2 > 90000) continue;
            const f = 5200 / d2;
            a.vx += (dx / Math.sqrt(d2)) * f;
            a.vy += (dy / Math.sqrt(d2)) * f;
          }
        }
        for (const l of links) {
          const s = index.get(l.source), t = index.get(l.target);
          if (!s || !t) continue;
          const dx = t.x - s.x, dy = t.y - s.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = (d - 120) * 0.012;
          s.vx += (dx / d) * f; s.vy += (dy / d) * f;
          t.vx -= (dx / d) * f; t.vy -= (dy / d) * f;
        }
        for (const n of nodes) {
          n.vx += (W / 2 - n.x) * 0.0016;
          n.vy += (H / 2 - n.y) * 0.0016;
          n.vx *= 0.86; n.vy *= 0.86;
          n.x = Math.max(30, Math.min(W - 30, n.x + n.vx * heat));
          n.y = Math.max(30, Math.min(H - 30, n.y + n.vy * heat));
        }
        nodes = nodes;              // tell Svelte the positions moved
        heat = Math.max(0.15, heat * 0.997);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  function toggleLayer(layer: string) {
    const next = new Set(hidden);
    next.has(layer) ? next.delete(layer) : next.add(layer);
    hidden = next;
  }
</script>

<svelte:head><title>Admin · Modulgraph</title></svelte:head>

<div class="page">
  <header>
    <h1>Modulgraph</h1>
    <p class="sub">
      {shown.length} Module · {shownLinks.length} Importe
      {#if selected}
        · <strong>{byId.get(selected)?.label}</strong>
        nutzt {related?.down.size} · genutzt von {related?.up.size}
      {/if}
    </p>
  </header>

  <div class="legend">
    {#each Object.entries(LAYERS) as [key, l] (key)}
      <button
        class="chip small key"
        class:off={hidden.has(key)}
        style="--c:{l.colour}"
        onclick={() => toggleLayer(key)}
        aria-pressed={!hidden.has(key)}
      >
        <span class="swatch"></span>{l.name}
        <span class="count">{nodes.filter((n) => n.layer === key).length}</span>
      </button>
    {/each}
    <button class="chip small key" onclick={() => (running = !running)}>
      {running ? '⏸ Layout' : '▶ Layout'}
    </button>
    {#if selected}
      <button class="chip small key" onclick={() => (selected = null)}>✕ Auswahl</button>
    {/if}
  </div>

  <svg viewBox="0 0 {W} {H}" class="graph" role="img" aria-label="Modulgraph">
    <defs>
      <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L8,4 L0,8 z" fill="rgba(255,255,255,.45)" />
      </marker>
    </defs>

    {#each shownLinks as l, i (l.source + '>' + l.target + i)}
      {@const s = byId.get(l.source)}
      {@const t = byId.get(l.target)}
      {#if s && t}
        <line class={edgeClass(l)} x1={s.x} y1={s.y} x2={t.x} y2={t.y} marker-end="url(#arrow)" />
      {/if}
    {/each}

    {#each shown as n (n.id)}
      <g
        class={nodeClass(n)}
        transform="translate({n.x},{n.y})"
        onclick={() => (selected = selected === n.id ? null : n.id)}
        onkeydown={(e) => e.key === 'Enter' && (selected = n.id)}
        role="button"
        tabindex="0"
      >
        <circle r={radius(n)} style="--c:{LAYERS[n.layer]?.colour ?? '#fff'}" />
        <text y={radius(n) + 13}>{n.label}</text>
        <title>{n.id} — {n.loc} Zeilen, {n.fanIn}× importiert</title>
      </g>
    {/each}
  </svg>
</div>

<style>
  .page { max-width: 1040px; margin: 0 auto; padding: 8px 10px 90px; }
  header { text-align: center; margin-bottom: 8px; }
  h1 { margin: 0 0 2px; font-size: 26px; }
  .sub { margin: 0; font-size: 13px; opacity: 0.85; }

  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .key.off { opacity: 0.4; }
  .swatch { width: 11px; height: 11px; border-radius: 3px; background: var(--c); }
  .count { opacity: 0.65; font-variant-numeric: tabular-nums; }

  .graph {
    width: 100%;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(6, 44, 70, 0.5), rgba(4, 30, 50, 0.62));
    border: 2px solid rgba(255, 255, 255, 0.22);
  }

  .edge { stroke: rgba(255, 255, 255, 0.16); stroke-width: 1; }
  .edge.dim { stroke: rgba(255, 255, 255, 0.05); }
  .edge.out { stroke: #ffd166; stroke-width: 2; }
  .edge.in { stroke: #7ef0c8; stroke-width: 2; }

  .node { cursor: pointer; }
  .node circle {
    fill: var(--c);
    stroke: rgba(255, 255, 255, 0.65);
    stroke-width: 1.5;
    transition: opacity 0.2s ease;
  }
  .node text {
    fill: #fff;
    font-size: 11px;
    font-weight: 700;
    text-anchor: middle;
    paint-order: stroke;
    stroke: rgba(0, 30, 50, 0.85);
    stroke-width: 3px;
    pointer-events: none;
  }
  .node.dim circle, .node.dim text { opacity: 0.2; }
  .node.picked circle { stroke: #fff; stroke-width: 3.5; }
  .node.up circle { stroke: #7ef0c8; stroke-width: 3; }
  .node.down circle { stroke: #ffd166; stroke-width: 3; }

  @media (max-width: 560px) {
    .node text { font-size: 13px; }
    h1 { font-size: 21px; }
  }
</style>
