<script lang="ts">
  /**
   * Hide and seek. One animal's picture sits in the corner; she finds that
   * animal in the living tank and taps it.
   *
   * There is deliberately not one word on this screen — no names, no score
   * text, no instructions. A four-year-old who cannot read yet can play it
   * alone, which is not true of the find game next door.
   */
  import Tank from '$lib/components/Tank.svelte';
  import CreaturePortrait from '$lib/components/CreaturePortrait.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import { GALLERY, sameCharacter } from '$lib/data/cast';
  import { settings } from '$lib/stores/settings';
  import { sfx } from '$lib/audio';
  import { onMount } from 'svelte';
  import type { World } from '$lib/sim/world';
  import type { Creature, CreatureSpec } from '$lib/sim/types';

  let world = $state<World | null>(null);
  let target = $state<CreatureSpec | null>(null);
  let found = $state(0);
  let verdict = $state<'' | 'right' | 'wrong'>('');
  let hinting = $state(false);

  /** Only creatures that are actually swimming in the tank can be sought. */
  /** Anything too small to pick out of a busy tank is no fun to hunt for. */
  const FINDABLE = 14;

  function pool(): CreatureSpec[] {
    const live = new Set(world?.creatures.map((c) => c.id) ?? []);
    const inTank = GALLERY.filter(
      (c) => live.has(c.id) && c.id !== 'ellistormi' && (c.size ?? 0) >= FINDABLE
    );
    return inTank.length ? inTank : GALLERY;
  }

  function nextRound() {
    const p = pool();
    let next = p[Math.floor(Math.random() * p.length)];
    if (target && p.length > 1) {
      while (next.id === target.id) next = p[Math.floor(Math.random() * p.length)];
    }
    target = next;
    verdict = '';
    hinting = false;
  }

  function onmeet(c: Creature) {
    if (!target || verdict === 'right') return;
    if (sameCharacter(target, c)) {
      verdict = 'right';
      found += 1;
      if ($settings.sound) sfx.sing();
      // a lap of honour from the animal she found
      world?.highlight(c.id);
      setTimeout(nextRound, 1900);
    } else {
      verdict = 'wrong';
      if ($settings.sound) sfx.wrong();
      setTimeout(() => (verdict = ''), 800);
    }
  }

  /** The eye button: the target sparkles for a moment, for when she is stuck. */
  function hint() {
    if (!target || !world) return;
    hinting = true;
    world.highlight(target.id);
    if ($settings.sound) sfx.chime();
    setTimeout(() => (hinting = false), 2600);
  }

  onMount(() => {
    const t = setTimeout(nextRound, 400);
    return () => clearTimeout(t);
  });
</script>

<Meta path="/verstecken" />

<Tank bind:world {onmeet} />

<div class="hud">
  {#if target}
    <div class="card seek" class:right={verdict === 'right'} class:wrong={verdict === 'wrong'}>
      <CreaturePortrait spec={target} size={104} />
      {#if verdict === 'right'}<span class="tick">🎉</span>{/if}
    </div>
  {/if}

  <div class="tally" aria-label="gefunden">
    {#each Array(Math.min(found, 12)) as _, i (i)}<span>⭐</span>{/each}
  </div>

  <button class="chip eye" class:on={hinting} onclick={hint} aria-label="Tipp">👀</button>
</div>

<style>
  .hud { position: fixed; inset: 0; pointer-events: none; z-index: 30; }

  .seek {
    position: absolute;
    left: 50%;
    top: calc(12px + env(safe-area-inset-top));
    transform: translateX(-50%);
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 4px solid rgba(255, 255, 255, 0.75);
    transition: background 0.25s ease, transform 0.18s ease, border-color 0.25s ease;
  }
  .seek.right { background: #d9f7d0; border-color: #ffd166; transform: translateX(-50%) scale(1.06); }
  .seek.wrong { animation: nudge 0.4s ease; }
  @keyframes nudge {
    25% { transform: translateX(calc(-50% - 9px)); }
    75% { transform: translateX(calc(-50% + 9px)); }
  }
  .tick { font-size: 30px; }

  .tally {
    position: absolute;
    left: 50%;
    top: calc(150px + env(safe-area-inset-top));
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
    max-width: min(360px, calc(100vw - 40px));
    font-size: 19px;
    filter: drop-shadow(0 2px 4px rgba(0, 40, 60, 0.5));
  }

  .eye {
    position: absolute;
    right: 12px;
    bottom: calc(96px + env(safe-area-inset-bottom));
    pointer-events: auto;
    font-size: 24px;
    padding: 10px 14px;
  }
  .eye:active { transform: scale(0.93); }
  .eye.on { background: rgba(255, 209, 102, 0.75); border-color: #fff; }

  @media (max-height: 430px) {
    .tally { display: none; }
  }
</style>
