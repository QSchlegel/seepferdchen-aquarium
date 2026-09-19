<script lang="ts">
  /** The story, one page at a time, with the character it is about. */
  import CreaturePortrait from '$lib/components/CreaturePortrait.svelte';
  import { STORY } from '$lib/data/story';
  import { CAST } from '$lib/data/cast';
  import { settings } from '$lib/stores/settings';
  import { short } from '$lib/stores/viewport';
  import { sfx } from '$lib/audio';
  import { t } from '$lib/data/i18n';
  import Meta from '$lib/components/Meta.svelte';

  let i = $state(0);
  const who = $derived(CAST.find((c) => c.id === STORY[i].who)!);

  function turn(to: number) {
    const n = Math.max(0, Math.min(STORY.length - 1, to));
    if (n === i) return;
    i = n;
    if ($settings.sound) sfx.pop();
  }

  /**
   * Turning the page with a finger.
   *
   * On a phone a book is swiped, not button-pressed — and the two buttons are
   * at the bottom of the screen while her eyes are on the picture. The
   * buttons stay for the keyboard and for anyone who does not think to swipe.
   */
  let from = 0;
  const SWIPE = 45;

  function grasp(e: PointerEvent) { from = e.clientX; }
  function release(e: PointerEvent) {
    const dx = e.clientX - from;
    if (Math.abs(dx) < SWIPE) return;
    turn(dx < 0 ? i + 1 : i - 1);
  }
</script>

<Meta path="/geschichte" />

<div class="page">
  <h1>{t('storyIntro', $settings.lang)}</h1>

  <div
    class="card story"
    onpointerdown={grasp}
    onpointerup={release}
    role="group"
    aria-roledescription="Buch"
  >
    <div class="who"><CreaturePortrait spec={who} size={$short ? 86 : 132} /></div>
    <p>{STORY[i][$settings.lang]}</p>
    <div class="dots">
      {#each STORY as _, n}
        <button
          class="dot"
          class:on={n === i}
          aria-label={'Seite ' + (n + 1)}
          onclick={() => turn(n)}
        ></button>
      {/each}
    </div>
  </div>

  <div class="controls">
    <button class="chip" disabled={i === 0} onclick={() => turn(i - 1)}>
      ← {t('back', $settings.lang)}
    </button>
    <button class="chip" disabled={i === STORY.length - 1} onclick={() => turn(i + 1)}>
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
  .dots { display: flex; justify-content: center; width: 100%; }
  /**
   * The dot she sees is 12px; the button she hits is the full height of a row
   * and an equal share of its width. A 12px target is not a target at all for
   * a five-year-old's finger — she was turning pages by accident or not at all.
   */
  .dot {
    flex: 1 1 0;
    max-width: 46px;
    height: 44px;
    display: grid;
    place-items: center;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
  }
  .dot::before {
    content: '';
    width: 12px; height: 12px; border-radius: 50%;
    border: 2px solid rgba(0, 60, 90, 0.35);
    transition: background 0.2s ease, transform 0.2s ease;
  }
  .dot.on::before { background: #f0803a; border-color: #d1631f; transform: scale(1.3); }
  .controls { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
  .controls .chip:disabled { opacity: 0.4; }

  @media (max-height: 460px) {
    /* sideways: the picture gives way so the words still fit on one screen */
    .story { gap: 6px; }
    p { font-size: 15px; line-height: 1.4; }
    .controls { margin-top: 10px; }
  }
</style>
