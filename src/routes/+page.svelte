<script lang="ts">
  /** The tank itself, plus the heads-up display over it. */
  import Tank from '$lib/components/Tank.svelte';
  import SettingsSheet from '$lib/components/SettingsSheet.svelte';
  import { settings } from '$lib/stores/settings';
  import { progress } from '$lib/stores/progress';
  import { t } from '$lib/data/i18n';
  import { TICKER } from '$lib/data/story';
  import { sfx } from '$lib/audio';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { startTilt, tiltSupported } from '$lib/tilt';
  import type { HuntStage, World } from '$lib/sim/world';
  import type { FoodKind } from '$lib/sim/types';
  import Meta from '$lib/components/Meta.svelte';

  /** The six treasures, as a row of slots she can fill. */
  const LOOT_ICON = [
    { kind: 'crown', icon: '👑' }, { kind: 'gem', icon: '💎' }, { kind: 'pearl', icon: '🫧' },
    { kind: 'ring', icon: '💍' }, { kind: 'star', icon: '⭐' }, { kind: 'shell', icon: '🐚' }
  ];

  const MENU: { kind: FoodKind; icon: string; key: string }[] = [
    { kind: 'pellet', icon: '🟠', key: 'pellets' },
    { kind: 'greens', icon: '🌿', key: 'greens' },
    { kind: 'krill',  icon: '🦐', key: 'krill' },
    { kind: 'candy',  icon: '🍭', key: 'candy' },
    { kind: 'muesli', icon: '🥣', key: 'muesli' },
    { kind: 'plankton', icon: '🌱', key: 'plankton' }
  ];

  let world = $state<World | null>(null);
  let settingsOpen = $state(false);
  let line = $state(0);
  let hintVisible = $state(true);
  let paused = $state(false);
  let hunt = $state<HuntStage>('hidden');
  let food = $state<FoodKind>('pellet');
  /** On a phone the six foods collapse to the one she is holding. */
  let compact = $state(false);
  let menuOpen = $state(true);

  /* the tilt game */
  let canTilt = $state(false);
  let tilting = $state(false);
  let tiltNote = $state('');
  let pearls = $state(0);
  let stopTilt: (() => void) | null = null;

  const questKey = $derived(
    hunt === 'carried' ? 'keyFound' : hunt === 'open' ? 'chestOpen' : 'findKey'
  );

  onMount(() => {
    const ticker = setInterval(() => (line = (line + 1) % TICKER.length), 9000);
    const hint = setTimeout(() => (hintVisible = false), 14000);
    canTilt = tiltSupported();
    compact = window.matchMedia('(max-width: 560px)').matches;
    menuOpen = false;
    // a creature id in the query string means "show me this one" from the gallery
    const want = $page.url.searchParams.get('find');
    if (want) setTimeout(() => world?.highlight(want), 700);
    return () => {
      clearInterval(ticker);
      clearTimeout(hint);
      endTilt();
    };
  });

  /** iOS only grants the sensor from inside a real tap, so this runs on click. */
  async function toggleTilt() {
    if (tilting) { endTilt(); return; }
    if (!world) return;
    const stop = await startTilt((t) => world?.setTilt(t.x, t.y));
    if (!stop) { tiltNote = t('tiltDenied', $settings.lang); return; }
    stopTilt = stop;
    tilting = true;
    pearls = 0;
    tiltNote = t('tiltHint', $settings.lang);
    hintVisible = false;
    world.startPearlGame();
  }

  function endTilt() {
    stopTilt?.();
    stopTilt = null;
    tilting = false;
    tiltNote = '';
    world?.stopPearlGame();
  }

  function onPearl(home: number, wanted: number) {
    pearls = home;
    if (home >= wanted) {
      tiltNote = t('tiltWon', $settings.lang);
      setTimeout(endTilt, 2600);
    }
  }

  function feed() {
    world?.feedEveryone();
    if ($settings.sound) sfx.plop();
    hintVisible = false;
  }
  function chooseFood(kind: FoodKind) {
    food = kind;
    if (world) world.food = kind;
    menuOpen = false;
    if ($settings.sound) sfx.pop();
  }
  function togglePause() {
    if (!world) return;
    // World is a plain class, so the button tracks its own copy of the flag
    paused = !world.paused;
    world.paused = paused;
  }
</script>

<Meta path="/" />

<Tank
  bind:world
  onmeet={() => (hintVisible = false)}
  onhunt={(s) => (hunt = s)}
  onpearl={onPearl}
  ontravel={(to) => ($settings.scene = to as typeof $settings.scene)}
/>

<div class="hud">
  <div class="top" style="padding-top: calc(10px + env(safe-area-inset-top))">
    <div class="chip small counter">
      🐟 <span class="word">{t('fed', $settings.lang)}:</span> {$progress.fed}
    </div>
    {#if $progress.treasures > 0}
      <div class="chip small counter shelf" aria-label={t('treasures', $settings.lang)}>
        {#each LOOT_ICON as l (l.kind)}
          <span class:got={$progress.loot.includes(l.kind)}>{l.icon}</span>
        {/each}
      </div>
    {/if}
    {#if tilting}
      <div class="chip small counter">🫧 {pearls}/3</div>
    {/if}
    <div class="spacer"></div>
    {#if canTilt}
      <button
        class="chip small"
        class:on={tilting}
        onclick={toggleTilt}
        aria-pressed={tilting}
        aria-label={t('tilt', $settings.lang)}
      >🫧</button>
    {/if}
    <button class="chip small" onclick={togglePause} aria-label={t(paused ? 'play' : 'pause', $settings.lang)}>
      {paused ? '▶️' : '⏸'}
    </button>
    <button class="chip small" onclick={() => (settingsOpen = true)} aria-label={t('settings', $settings.lang)}>⚙️</button>
  </div>

  <p class="story">{TICKER[line][$settings.lang]}</p>

  <!-- the quest line sits up top, where nothing swims behind it -->
  {#if tiltNote}
    <p class="hint quest">{tiltNote}</p>
  {:else if hintVisible}
    <p class="hint">{t('tapHint', $settings.lang)}</p>
  {:else}
    <p class="hint quest" class:won={hunt === 'open'}>
      {hunt === 'open' ? '🎉' : '🔑'} {t(questKey, $settings.lang)}
    </p>
  {/if}

  <!-- feeding lives in the corner: navigation left, food right, tank clear -->
  <div class="feeder">
    {#if menuOpen}
      <div class="menu" role="group" aria-label={t('food', $settings.lang)}>
        {#each MENU as m (m.kind)}
          <button
            class="chip small bite"
            class:on={food === m.kind}
            onclick={() => chooseFood(m.kind)}
            aria-pressed={food === m.kind}
            aria-label={t(m.key, $settings.lang)}
          >{m.icon}</button>
        {/each}
      </div>
    {/if}
    <button
      class="chip small bite current"
      class:on={menuOpen}
      onclick={() => { menuOpen = !menuOpen; if ($settings.sound) sfx.pop(); }}
      aria-expanded={menuOpen}
      aria-label={t('food', $settings.lang)}
    >{MENU.find((m) => m.kind === food)?.icon}</button>
    <button class="feed" onclick={feed} aria-label={t('feed', $settings.lang)}>🐟</button>
  </div>
</div>

<SettingsSheet bind:open={settingsOpen} />

<style>
  .hud { position: fixed; inset: 0; pointer-events: none; z-index: 30; }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
  }
  .top :global(.chip) { pointer-events: auto; }
  .spacer { flex: 1; }
  .counter { pointer-events: none; }

  .story {
    position: absolute;
    left: 50%;
    top: calc(74px + env(safe-area-inset-top));
    transform: translateX(-50%);
    width: min(640px, calc(100vw - 32px));
    margin: 0;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.35;
    text-shadow: 0 2px 8px rgba(0, 45, 70, 0.8), 0 0 3px rgba(0, 45, 70, 0.6);
    animation: fadein 0.8s ease;
  }
  @keyframes fadein { from { opacity: 0; transform: translate(-50%, 8px); } }

  /* The quest line, up at the top out of the way. It used to sit in the
     middle-bottom over the reef, which is the part of the tank she is
     actually looking at. */
  .hint {
    position: absolute;
    left: 50%;
    top: calc(108px + env(safe-area-inset-top));
    transform: translateX(-50%);
    margin: 0;
    max-width: min(420px, calc(100vw - 24px));
    padding: 7px 15px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    border: 2px solid rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    animation: fadein 0.5s ease;
  }

  /* Feeding, in the bottom-right corner: navigation lives bottom-left, so the
     middle of the glass — where the reef and the chest are — stays clear. */
  .feeder {
    position: absolute;
    right: 14px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    /* pinned to the edge, not centred: otherwise opening the two-column picker
       widens the cluster and drags the feed button in off the corner */
    align-items: flex-end;
    gap: 8px;
    pointer-events: auto;
  }
  /* two columns, not six in a stack: a single tall column reached up into the
     band where the doorways sit. */
  .menu {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 6px;
    animation: rise 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }
  @keyframes rise { from { opacity: 0; transform: translateY(12px); } }
  .bite {
    font-size: 20px;
    line-height: 1;
    padding: 8px 9px;
    cursor: pointer;
    opacity: 0.72;
    transition: opacity 0.15s ease, transform 0.12s ease, box-shadow 0.2s ease;
  }
  .current { box-shadow: 0 4px 12px rgba(0, 35, 60, 0.3); }
  .feed {
    width: 64px; height: 64px;
    border-radius: 22px;
    border: 2px solid rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.26);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font-size: 30px;
    cursor: pointer;
    box-shadow: 0 8px 22px rgba(0, 40, 65, 0.3);
    transition: transform 0.13s ease, background 0.2s ease;
  }
  .feed:hover { background: rgba(255, 255, 255, 0.38); }
  .feed:active { transform: scale(0.92); }

  .shelf { display: flex; gap: 3px; font-size: 15px; line-height: 1; }
  .shelf span { opacity: 0.28; filter: grayscale(1); transition: opacity 0.4s ease, filter 0.4s ease; }
  .shelf span.got { opacity: 1; filter: none; }

  .top :global(.chip.on) {
    background: rgba(255, 209, 102, 0.75);
    border-color: #fff;
  }

  .quest {
    background: rgba(255, 214, 110, 0.24);
    border-color: rgba(255, 226, 150, 0.7);
    animation: fadein 0.5s ease;
  }
  .quest.won {
    background: rgba(255, 214, 110, 0.5);
    border-color: #ffd166;
  }

  .bite.on {
    opacity: 1;
    box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.7);
  }
  .bite:active { transform: scale(0.92); }

  @media (max-width: 560px) {
    /* the fish icon already says what is being counted */
    .counter .word { display: none; }
    .top { gap: 6px; padding: 0 10px; }
    /* flavour text she cannot read, lying across the middle of the tank */
    .story { display: none; }
    .shelf { display: none; }
  }
  @media (max-width: 430px) {
    .story { font-size: 14px; width: calc(100vw - 20px); }
    .hint { font-size: 13px; padding: 7px 12px; max-width: calc(100vw - 24px); white-space: normal; text-align: center; }
    .bite { font-size: 19px; padding: 7px 8px; }
    .feed { width: 58px; height: 58px; font-size: 27px; }
    .hint { font-size: 13px; padding: 6px 12px; top: calc(64px + env(safe-area-inset-top)); }
    .shelf { font-size: 13px; gap: 2px; }
    .top { gap: 5px; padding: 0 8px; }
  }
  /* landscape on a phone: almost no height, so drop everything optional */
  @media (max-height: 430px) {
    .story { top: calc(60px + env(safe-area-inset-top)); font-size: 12px; }
    .feed { width: 52px; height: 52px; font-size: 24px; }
    .hint { display: none; }
  }
</style>
