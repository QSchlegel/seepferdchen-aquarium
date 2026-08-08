<script lang="ts">
  /** A card for every creature, in the spirit of the photo page in the book. */
  import CreaturePortrait from '$lib/components/CreaturePortrait.svelte';
  import { GALLERY } from '$lib/data/cast';
  import { settings } from '$lib/stores/settings';
  import { progress } from '$lib/stores/progress';
  import { t } from '$lib/data/i18n';
  import Meta from '$lib/components/Meta.svelte';

  const GROUPS = [
    { key: 'rangers',   de: 'Die Rangers',        en: 'The Rangers' },
    { key: 'seahorses', de: 'Der Seepferdchenhof', en: 'The seahorse farm' },
    { key: 'unicorns',  de: 'Einhörner',          en: 'Unicorns' },
    { key: 'fish',      de: 'Fische',             en: 'Fish' },
    { key: 'shoals',    de: 'Schwärme',           en: 'Shoals' },
    { key: 'friends',   de: 'Freunde',            en: 'Friends' }
  ];

  const byGroup = (g: string) => GALLERY.filter((c) => c.group === g);
</script>

<Meta path="/steckbriefe" />

<div class="page">
  <h1>{t('allOf', $settings.lang)}</h1>

  {#each GROUPS as g}
    {@const list = byGroup(g.key)}
    {#if list.length}
      <h2>{g[$settings.lang]}</h2>
      <div class="grid">
        {#each list as c (c.id)}
          <a class="card" href={'/?find=' + c.id}>
            <div class="portrait">
              <CreaturePortrait spec={c} size={104} />
              {#if $progress.met.includes(c.id)}<span class="met" title="schon getroffen">💛</span>{/if}
            </div>
            <strong>{$settings.lang === 'en' && c.nameEn ? c.nameEn : c.name}</strong>
            {#if c.about}<span class="about">{c.about[$settings.lang]}</span>{/if}
            <span class="go">{t('showInTank', $settings.lang)} →</span>
          </a>
        {/each}
      </div>
    {/if}
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    text-decoration: none;
    color: var(--ink);
    touch-action: manipulation;
    transition: transform 0.12s ease;
  }
  .card:active { transform: scale(0.97); }
  .portrait {
    position: relative;
    background: radial-gradient(circle at 50% 40%, rgba(120, 215, 225, 0.55), rgba(30, 120, 165, 0.35));
    border-radius: 16px;
  }
  .met { position: absolute; top: 4px; right: 6px; font-size: 15px; }
  strong { font-size: 16px; }
  .about { font-size: 12.5px; line-height: 1.35; opacity: 0.8; }
  .go { font-size: 12px; font-weight: 700; opacity: 0.6; margin-top: 2px; }
</style>
