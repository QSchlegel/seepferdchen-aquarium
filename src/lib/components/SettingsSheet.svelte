<script lang="ts">
  /**
   * A small sheet of switches: language, sound, music, sparkles, quality —
   * and the offer to put the aquarium on the home screen.
   *
   * The install offer lives here because it is the only control in the app
   * aimed at the grown-up rather than the child, and this sheet is where the
   * grown-up's controls already are. It shows itself only while there is
   * something to do: once the app is installed the row is gone.
   */
  import { settings } from '$lib/stores/settings';
  import { t } from '$lib/data/i18n';
  import { setAudioEnabled, sfx } from '$lib/audio';
  import { setSpeechEnabled } from '$lib/speech';
  import { addToHomeScreen, installOffer, offlineReady } from '$lib/install';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  async function install() {
    if ($settings.sound) sfx.pop();
    const accepted = await addToHomeScreen();
    if (accepted && $settings.sound) sfx.sing();
  }

  $effect(() => { setAudioEnabled($settings.sound); setSpeechEnabled($settings.sound); });
</script>

{#if open}
  <div
    class="scrim"
    role="button"
    tabindex="-1"
    onclick={() => (open = false)}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
  ></div>
  <div class="sheet card" role="dialog" aria-label={t('settings', $settings.lang)}>
    {#if $installOffer === 'ready' || $installOffer === 'ios'}
      <!-- the iOS instruction is a sentence, so it gets its own line -->
      <div class="row install" class:stacked={$installOffer === 'ios'}>
        <span class="what">
          <span class="lead">📲 {t('install', $settings.lang)}</span>
          {#if $offlineReady}
            <span class="sub">✓ {t('offlineYes', $settings.lang)}</span>
          {/if}
        </span>
        {#if $installOffer === 'ready'}
          <button class="chip small go" onclick={install}>{t('installNow', $settings.lang)}</button>
        {:else}
          <!-- iOS has no install API; the share glyph is the whole instruction -->
          <span class="sub how">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l3.5 3.5M12 3L8.5 6.5M12 3v12" />
              <path d="M6 12H4.5v8.5h15V12H18" />
            </svg>
            {t('installIos', $settings.lang)}
          </span>
        {/if}
      </div>
    {/if}

    <div class="row">
      <span>{t('language', $settings.lang)}</span>
      <div class="group">
        <button class="chip small" class:on={$settings.lang === 'de'}
          onclick={() => ($settings.lang = 'de')}>Deutsch</button>
        <button class="chip small" class:on={$settings.lang === 'en'}
          onclick={() => ($settings.lang = 'en')}>English</button>
      </div>
    </div>
    <div class="row">
      <span>{t('sound', $settings.lang)}</span>
      <button class="chip small" class:on={$settings.sound}
        onclick={() => ($settings.sound = !$settings.sound)}>{$settings.sound ? '🔊' : '🔇'}</button>
    </div>
    <div class="row">
      <span>{t('music', $settings.lang)}</span>
      <button class="chip small" class:on={$settings.music && $settings.sound}
        disabled={!$settings.sound}
        onclick={() => ($settings.music = !$settings.music)}>{$settings.music ? '🎵' : '—'}</button>
    </div>
    <div class="row">
      <span>{t('sparkles', $settings.lang)}</span>
      <button class="chip small" class:on={$settings.sparkles}
        onclick={() => ($settings.sparkles = !$settings.sparkles)}>{$settings.sparkles ? '✨' : '—'}</button>
    </div>
    <div class="row">
      <span>{t('quality', $settings.lang)}</span>
      <div class="group">
        {#each ['low', 'medium', 'high'] as q}
          <button class="chip small" class:on={$settings.quality === q}
            onclick={() => ($settings.quality = q as any)}>{t(q, $settings.lang)}</button>
        {/each}
      </div>
    </div>
    <button class="chip" onclick={() => (open = false)}>OK</button>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(2, 30, 50, 0.45);
    border: 0;
  }
  .sheet {
    position: fixed;
    left: 50%; bottom: calc(90px + var(--edge-bottom));
    transform: translateX(-50%);
    z-index: 51;
    width: min(420px, calc(100vw - 24px - var(--edge-left) - var(--edge-right)));
    display: flex;
    flex-direction: column;
    gap: 12px;
    /* six rows is taller than a phone held sideways: scroll rather than
       disappear off the top of the screen */
    max-height: calc(100vh - 110px);
    max-height: calc(100dvh - 110px - var(--edge-top) - var(--edge-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
  }
  .group { display: flex; gap: 6px; flex-wrap: wrap; }

  /* the one row here that is addressed to the grown-up, so it is allowed
     rather more words than anything else in the app */
  .install {
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid rgba(0, 60, 90, 0.12);
  }
  .install.stacked { flex-direction: column; align-items: stretch; gap: 7px; }
  .install.stacked .how { max-width: none; }
  .what { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .lead { font-size: 16px; font-weight: 700; }
  .sub { font-size: 12.5px; font-weight: 600; opacity: 0.72; line-height: 1.3; }
  .how { display: flex; align-items: center; gap: 6px; max-width: 200px; text-align: left; }
  .how svg {
    flex: none;
    width: 17px; height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .install :global(.chip.go) {
    flex: none;
    background: rgba(255, 190, 60, 0.5);
    border-color: rgba(200, 130, 0, 0.45);
  }
  .sheet :global(.chip) { color: var(--ink); background: rgba(0, 60, 90, 0.1); border-color: rgba(0, 60, 90, 0.2); text-shadow: none; }
  .sheet :global(.chip.on) { background: rgba(255, 190, 60, 0.5); border-color: rgba(200, 130, 0, 0.5); }
  .sheet :global(.chip:disabled) { opacity: 0.4; cursor: not-allowed; }

  @media (max-height: 460px) {
    /* sideways there is no room above the menu button, so it sits in the
       corner instead and takes the whole height it can get */
    .sheet {
      bottom: calc(10px + var(--edge-bottom));
      gap: 8px;
      max-height: calc(100dvh - 20px - var(--edge-top) - var(--edge-bottom));
    }
    .row { font-size: 14px; }
  }
</style>
