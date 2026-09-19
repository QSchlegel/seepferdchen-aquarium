<script lang="ts">
  /** A small sheet of switches: language, sound, music, sparkles, quality. */
  import { settings } from '$lib/stores/settings';
  import { t } from '$lib/data/i18n';
  import { setAudioEnabled } from '$lib/audio';
  import { setSpeechEnabled } from '$lib/speech';

  let { open = $bindable(false) }: { open?: boolean } = $props();

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
