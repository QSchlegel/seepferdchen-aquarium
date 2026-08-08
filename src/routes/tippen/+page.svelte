<script lang="ts">
  /**
   * Learning to type, with the cast as the alphabet. A creature appears and
   * she spells its name — one letter at a time, in order. Wrong keys only
   * wobble; there is no way to lose, because losing is not the point.
   */
  import CreaturePortrait from '$lib/components/CreaturePortrait.svelte';
  import { GALLERY } from '$lib/data/cast';
  import { settings } from '$lib/stores/settings';
  import { progress, recordTyped } from '$lib/stores/progress';
  import { t } from '$lib/data/i18n';
  import { sfx } from '$lib/audio';
  import { onMount } from 'svelte';
  import type { CreatureSpec } from '$lib/sim/types';
  import Meta from '$lib/components/Meta.svelte';

  const POOL = GALLERY.filter((c) => c.id !== 'ellistormi');

  const ROWS = ['QWERTZUIOP', 'ASDFGHJKLÖÄ', 'YXCVBNMÜ'];

  let mode = $state<'first' | 'whole'>('first');
  let spec = $state<CreatureSpec | null>(null);
  let done = $state(0);
  let wrong = $state('');
  let won = $state(false);

  const label = (c: CreatureSpec) => ($settings.lang === 'en' && c.nameEn ? c.nameEn : c.name);

  /** The name split into characters, upper-cased for matching. */
  const chars = $derived(spec ? [...label(spec)] : []);
  /** Only the letters have to be typed; spaces and hyphens fill themselves in. */
  const target = $derived(mode === 'first' ? chars.slice(0, 1) : chars);
  const nextChar = $derived(target[done] ?? null);

  function pickCreature() {
    let next = POOL[Math.floor(Math.random() * POOL.length)];
    // never the same one twice in a row, it reads as the game being stuck
    if (spec && POOL.length > 1) {
      while (next.id === spec.id) next = POOL[Math.floor(Math.random() * POOL.length)];
    }
    spec = next;
    done = 0;
    won = false;
    wrong = '';
    skipFreebies();
  }

  /** Non-letters (spaces, hyphens) are given to her for free. */
  function skipFreebies() {
    while (done < target.length && !/\p{L}/u.test(target[done])) done++;
  }

  function type(char: string) {
    if (won || !nextChar) return;
    if (char.toUpperCase() === nextChar.toUpperCase()) {
      done++;
      skipFreebies();
      wrong = '';
      if (done >= target.length) {
        won = true;
        recordTyped();
        if ($settings.sound) sfx.sing();
        setTimeout(pickCreature, 1800);
      } else if ($settings.sound) {
        sfx.chime();
      }
    } else {
      wrong = char;
      if ($settings.sound) sfx.wrong();
      setTimeout(() => (wrong = ''), 500);
    }
  }

  function key(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length !== 1 || !/\p{L}/u.test(e.key)) return;
    e.preventDefault();
    type(e.key);
  }

  onMount(() => {
    pickCreature();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
</script>

<Meta path="/tippen" />

<div class="page">
  <h1>{t('typing', $settings.lang)}</h1>

  <div class="scoreline">
    <span class="chip small">⌨️ {t('typed', $settings.lang)}: {$progress.typed}</span>
    <div class="modes" role="group" aria-label={t('typing', $settings.lang)}>
      <button
        class="chip small mode"
        class:on={mode === 'first'}
        aria-pressed={mode === 'first'}
        onclick={() => { if (mode !== 'first') { mode = 'first'; pickCreature(); } }}
        title={t('firstLetter', $settings.lang)}
      >A</button>
      <button
        class="chip small mode"
        class:on={mode === 'whole'}
        aria-pressed={mode === 'whole'}
        onclick={() => { if (mode !== 'whole') { mode = 'whole'; pickCreature(); } }}
        title={t('wholeName', $settings.lang)}
      >ABC</button>
    </div>
  </div>

  {#if spec}
    <div class="card ask" class:right={won} class:wrong={!!wrong}>
      <CreaturePortrait {spec} size={112} />
      <span class="find">
        {t(mode === 'first' ? 'typeFirst' : 'typeName', $settings.lang)}
      </span>

      <div class="word" aria-label={label(spec)}>
        {#each chars as c, i (i)}
          {#if !/\p{L}/u.test(c)}
            <span class="gap">{c === ' ' ? '' : c}</span>
          {:else}
            <span
              class="slot"
              class:filled={i < done}
              class:next={i === done && !won}
              class:dim={mode === 'first' && i > 0}
            >{i < done || (mode === 'first' && i > 0) ? c : ''}</span>
          {/if}
        {/each}
      </div>

      {#if won}<span class="verdict">🎉 {t('wellDone', $settings.lang)}</span>{/if}
    </div>

    <p class="hint">{t('keyboardHint', $settings.lang)}</p>

    <div class="keyboard">
      {#each ROWS as row}
        <div class="row">
          {#each [...row] as k (k)}
            <button
              class="key"
              class:target={nextChar?.toUpperCase() === k}
              class:bad={wrong.toUpperCase() === k}
              onclick={() => type(k)}
              aria-label={k}
            >{k}</button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .scoreline { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }
  .scoreline .chip { cursor: pointer; }
  .modes { display: flex; gap: 5px; }
  /* two clear choices, current one lit: a single toggle read as "broken" */
  .mode { font-weight: 800; opacity: 0.55; transition: opacity 0.15s ease, box-shadow 0.2s ease; }
  .mode.on { opacity: 1; box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.6); }

  .ask {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    transition: background 0.2s ease, transform 0.15s ease;
  }
  .ask.right { background: #d9f7d0; transform: scale(1.02); }
  .ask.wrong { animation: shake 0.32s ease; }
  @keyframes shake {
    25% { transform: translateX(-7px); }
    75% { transform: translateX(7px); }
  }
  .find { font-size: 14px; opacity: 0.7; }
  .verdict { font-size: 16px; font-weight: 700; }

  .word { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
  .gap { width: 12px; font-size: 26px; font-weight: 800; opacity: 0.5; }
  .slot {
    display: flex; align-items: center; justify-content: center;
    min-width: 30px; height: 42px;
    border-radius: 10px;
    border: 3px solid rgba(30, 90, 130, 0.25);
    background: rgba(255, 255, 255, 0.55);
    font-size: 26px; font-weight: 800;
    color: #1c3a52;
  }
  .slot.filled { background: #ffd166; border-color: #e0a92b; }
  .slot.next { border-color: #2aa7d8; box-shadow: 0 0 0 4px rgba(42, 167, 216, 0.3); }
  .slot.dim { opacity: 0.4; }

  .hint { text-align: center; font-size: 14px; opacity: 0.75; margin: 12px 0 8px; }

  .keyboard { display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .row { display: flex; gap: 5px; justify-content: center; flex-wrap: wrap; }
  .key {
    min-width: 34px;
    min-height: 44px;
    padding: 0 6px;
    border-radius: 11px;
    border: 2px solid rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.28);
    color: #fff;
    font-size: 17px;
    font-weight: 800;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    touch-action: manipulation;
    transition: transform 0.1s ease, background 0.15s ease;
  }
  .key:active { transform: scale(0.92); }
  .key.target {
    background: rgba(255, 209, 102, 0.85);
    border-color: #fff;
    color: #1c3a52;
    text-shadow: none;
  }
  .key.bad { background: rgba(255, 120, 110, 0.8); }

  @media (max-width: 380px) {
    .key { min-width: 28px; min-height: 40px; font-size: 15px; }
  }
</style>
