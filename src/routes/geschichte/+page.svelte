<script lang="ts">
  /** The story, one page at a time, with the character it is about. */
  import CreaturePortrait from '$lib/components/CreaturePortrait.svelte';
  import { STORY } from '$lib/data/story';
  import { CAST } from '$lib/data/cast';
  import { settings } from '$lib/stores/settings';
  import { t } from '$lib/data/i18n';
  import Meta from '$lib/components/Meta.svelte';

  let i = $state(0);
  const who = $derived(CAST.find((c) => c.id === STORY[i].who)!);
</script>

<Meta path="/geschichte" />

<div class="page">
  <h1>{t('storyIntro', $settings.lang)}</h1>

  <div class="card story">
    <div class="who"><CreaturePortrait spec={who} size={132} /></div>
    <p>{STORY[i][$settings.lang]}</p>
    <div class="dots">
      {#each STORY as _, n}
        <button
          class="dot"
          class:on={n === i}
          aria-label={'Seite ' + (n + 1)}
          onclick={() => (i = n)}
        ></button>
      {/each}
    </div>
  </div>

  <div class="controls">
    <button class="chip" disabled={i === 0} onclick={() => (i = Math.max(0, i - 1))}>
      ← {t('back', $settings.lang)}
    </button>
    <button class="chip" disabled={i === STORY.length - 1} onclick={() => (i = Math.min(STORY.length - 1, i + 1))}>
      {t('next', $settings.lang)} →
    </button>
  </div>
</div>

<style>
  .story { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .who {
    background: radial-gradient(circle at 50% 40%, rgba(120, 215, 225, 0.5), rgba(30, 120, 165, 0.3));
    border-radius: 20px;
  }
  p { margin: 0; font-size: 17px; line-height: 1.5; text-align: center; }
  .dots { display: flex; gap: 7px; margin-top: 4px; }
  .dot {
    width: 12px; height: 12px; border-radius: 50%;
    border: 2px solid rgba(0, 60, 90, 0.35);
    background: transparent; padding: 0; cursor: pointer;
  }
  .dot.on { background: #f0803a; border-color: #d1631f; }
  .controls { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
  .controls .chip:disabled { opacity: 0.4; }
</style>
