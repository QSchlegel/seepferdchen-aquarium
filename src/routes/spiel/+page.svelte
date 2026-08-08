<script lang="ts">
  /**
   * Find-the-creature. A name appears, four portraits appear, she taps the
   * right one. Deliberately forgiving: a wrong guess just says "try again".
   */
  import CreaturePortrait from '$lib/components/CreaturePortrait.svelte';
  import { GALLERY } from '$lib/data/cast';
  import { settings } from '$lib/stores/settings';
  import { progress, recordScore } from '$lib/stores/progress';
  import { t } from '$lib/data/i18n';
  import { sfx } from '$lib/audio';
  import { speak } from '$lib/speech';
  import type { CreatureSpec } from '$lib/sim/types';
  import Meta from '$lib/components/Meta.svelte';

  // one entry per shoal is plenty, and skip the pair sprite to avoid confusion
  const POOL = GALLERY.filter((c) => c.id !== 'ellistormi');

  let round = $state<CreatureSpec[]>([]);
  let answer = $state<CreatureSpec | null>(null);
  let score = $state(0);
  let feedback = $state<'' | 'right' | 'wrong'>('');
  let started = $state(false);

  function shuffle<T>(a: T[]): T[] {
    const out = [...a];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function newRound() {
    const four = shuffle(POOL).slice(0, 4);
    round = four;
    answer = four[Math.floor(Math.random() * four.length)];
    feedback = '';
    started = true;
    // read the name out, so a child who cannot read yet can still play
    if ($settings.sound) setTimeout(sayAnswer, 260);
  }

  /** Say the name she is looking for. Also on tap, for a second listen. */
  function sayAnswer() {
    if (answer) speak(label(answer), $settings.lang);
  }

  function guess(c: CreatureSpec) {
    if (feedback === 'right') return;
    if (c.id === answer?.id) {
      feedback = 'right';
      score += 1;
      recordScore(score);
      if ($settings.sound) sfx.sing();
      setTimeout(newRound, 1400);
    } else {
      feedback = 'wrong';
      if ($settings.sound) sfx.wrong();
      setTimeout(() => (feedback = ''), 900);
    }
  }

  const label = (c: CreatureSpec) => ($settings.lang === 'en' && c.nameEn ? c.nameEn : c.name);
</script>

<Meta path="/spiel" />

<div class="page">
  <h1>{t('game', $settings.lang)}</h1>

  {#if !started}
    <div class="card intro">
      <p>
        {$settings.lang === 'de'
          ? 'Ein Name erscheint. Tippe das richtige Tier an!'
          : 'A name appears. Tap the right animal!'}
      </p>
      <button class="chip" onclick={newRound}>{t('startGame', $settings.lang)}</button>
      {#if $progress.bestScore > 0}
        <span class="best">🏆 {$progress.bestScore}</span>
      {/if}
    </div>
  {:else}
    <div class="scoreline">
      <span class="chip small">⭐ {t('score', $settings.lang)}: {score}</span>
      <span class="chip small">🏆 {$progress.bestScore}</span>
    </div>

    <button
      class="card ask"
      class:right={feedback === 'right'}
      class:wrong={feedback === 'wrong'}
      onclick={sayAnswer}
      aria-label={answer ? label(answer) : ''}
    >
      <span class="find">🔊 {t('findWho', $settings.lang)}</span>
      <strong>{answer ? label(answer) : ''}</strong>
      {#if feedback === 'right'}<span class="verdict">🎉 {t('correct', $settings.lang)}</span>{/if}
      {#if feedback === 'wrong'}<span class="verdict">{t('tryAgain', $settings.lang)}</span>{/if}
    </button>

    <div class="grid">
      {#each round as c (c.id)}
        <button
          class="pick"
          class:won={feedback === 'right' && c.id === answer?.id}
          onclick={() => guess(c)}
          aria-label={label(c)}
        >
          <CreaturePortrait spec={c} size={118} />
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .intro { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .intro p { margin: 0; font-size: 17px; text-align: center; }
  .intro :global(.chip) { color: var(--ink); background: rgba(255, 190, 60, 0.5); border-color: rgba(200, 130, 0, 0.4); text-shadow: none; }
  .best { font-size: 15px; font-weight: 700; opacity: 0.7; }

  .scoreline { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; }

  .ask {
    width: 100%;
    cursor: pointer;
    font: inherit;
    color: inherit;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    transition: background 0.2s ease, transform 0.15s ease;
  }
  .ask.right { background: #d9f7d0; transform: scale(1.02); }
  .ask.wrong { background: #ffe3e0; }
  .find { font-size: 14px; opacity: 0.7; }
  .ask strong { font-size: 26px; }
  .verdict { font-size: 15px; font-weight: 700; margin-top: 4px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 14px;
  }
  .pick {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 132px;
    padding: 6px;
    border-radius: 20px;
    border: 3px solid rgba(255, 255, 255, 0.55);
    background: radial-gradient(circle at 50% 40%, rgba(120, 215, 225, 0.55), rgba(30, 120, 165, 0.35));
    cursor: pointer;
    touch-action: manipulation;
    transition: transform 0.12s ease, border-color 0.2s ease;
  }
  .pick:active { transform: scale(0.96); }
  .pick.won { border-color: #ffd166; box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.45); }

  @media (min-width: 620px) {
    .grid { grid-template-columns: repeat(4, 1fr); }
  }
</style>
