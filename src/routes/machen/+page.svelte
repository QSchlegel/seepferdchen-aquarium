<script lang="ts">
  /**
   * The creature maker.
   *
   * Wordless on purpose: every control is a picture, a colour or a size, and
   * the creature she is building is always on screen above them, updating as
   * she taps. She can name it with the keyboard if she wants, or not at all.
   */
  import CreaturePortrait from '$lib/components/CreaturePortrait.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import { addMine, mine, removeMine, toSpec, type MyCreature } from '$lib/stores/mine';
  import { settings } from '$lib/stores/settings';
  import { sfx } from '$lib/audio';
  import { speak } from '$lib/speech';
  import { t } from '$lib/data/i18n';
  import { goto } from '$app/navigation';

  /** The bodies she can start from. */
  const KINDS = [
    { kind: 'fish', shape: 'plain', icon: '🐟' },
    { kind: 'fish', shape: 'tang', icon: '🐠' },
    { kind: 'fish', shape: 'puffer', icon: '🐡' },
    { kind: 'fish', shape: 'goldfish', icon: '🥇' },
    { kind: 'seahorse', shape: 'plain', icon: '🌊' },
    { kind: 'turtle', shape: 'plain', icon: '🐢' },
    { kind: 'octopus', shape: 'plain', icon: '🐙' },
    { kind: 'jelly', shape: 'plain', icon: '🎐' },
    { kind: 'crab', shape: 'plain', icon: '🦀' },
    { kind: 'star', shape: 'plain', icon: '⭐' },
    { kind: 'seaUnicorn', shape: 'plain', icon: '🦄' },
    { kind: 'merperson', shape: 'plain', icon: '🧜' }
  ];

  const COLOURS = [
    '#ff6b9d', '#ff9f43', '#ffe066', '#7ef0c8', '#63d3f0', '#c471f5',
    '#ff5c8a', '#4aa96b', '#f2504b', '#8b6fd6', '#ffffff', '#3b4a58'
  ];

  const SIZES = [
    { size: 18, icon: '🐜' },
    { size: 26, icon: '🐟' },
    { size: 36, icon: '🐳' }
  ];

  let kindIndex = $state(0);
  let body = $state('#ff9f43');
  let accent = $state('#ffe066');
  let fin = $state('#ff6b9d');
  let size = $state(26);
  let sparkly = $state(false);
  let name = $state('');
  /** Which colour the palette is currently painting. */
  let slot = $state<'body' | 'accent' | 'fin'>('body');

  const draft = $derived<MyCreature>({
    id: 'draft',
    name: name || '?',
    kind: KINDS[kindIndex].kind,
    shape: KINDS[kindIndex].shape,
    size,
    body,
    accent,
    fin,
    pattern: 'plain',
    sparkles: sparkly ? 1 : undefined
  });

  const preview = $derived(toSpec(draft));

  function pick(colour: string) {
    if (slot === 'body') body = colour;
    else if (slot === 'accent') accent = colour;
    else fin = colour;
    if ($settings.sound) sfx.pop();
  }

  function shuffle() {
    const c = () => COLOURS[Math.floor(Math.random() * COLOURS.length)];
    kindIndex = Math.floor(Math.random() * KINDS.length);
    body = c(); accent = c(); fin = c();
    size = SIZES[Math.floor(Math.random() * SIZES.length)].size;
    sparkly = Math.random() < 0.4;
    if ($settings.sound) sfx.chime();
  }

  function save() {
    const { id: _draftId, ...spec } = draft;
    const made = addMine(spec);
    if ($settings.sound) sfx.sing();
    speak(made.name === '?' ? '' : made.name, $settings.lang);
    name = '';
  }

  function show(id: string) {
    goto(`/?find=${id}`);
  }
</script>

<Meta path="/machen" />

<div class="page">
  <div class="stage">
    <CreaturePortrait spec={preview} size={190} />
    {#if sparkly}<span class="twinkle">✨</span>{/if}
  </div>

  <div class="row" role="group" aria-label={t('shape', $settings.lang)}>
    {#each KINDS as k, i (k.kind + k.shape)}
      <button
        class="chip small pickbtn"
        class:on={kindIndex === i}
        onclick={() => { kindIndex = i; if ($settings.sound) sfx.pop(); }}
        aria-pressed={kindIndex === i}
      >{k.icon}</button>
    {/each}
  </div>

  <!-- which part the colours paint: the swatch shows what it is set to now -->
  <div class="row parts" role="group" aria-label={t('colour', $settings.lang)}>
    {#each [['body', body], ['accent', accent], ['fin', fin]] as [key, col] (key)}
      <button
        class="part"
        class:on={slot === key}
        style="--c:{col}"
        onclick={() => (slot = key as typeof slot)}
        aria-pressed={slot === key}
        aria-label={t(key === 'body' ? 'colBody' : key === 'accent' ? 'colAccent' : 'colFin', $settings.lang)}
      ><span class="swatch"></span></button>
    {/each}
  </div>

  <div class="row palette" role="group" aria-label={t('colour', $settings.lang)}>
    {#each COLOURS as col (col)}
      <button class="dot" style="--c:{col}" onclick={() => pick(col)} aria-label={col}></button>
    {/each}
  </div>

  <div class="row" role="group" aria-label={t('size', $settings.lang)}>
    {#each SIZES as sz (sz.size)}
      <button
        class="chip small pickbtn"
        class:on={size === sz.size}
        onclick={() => { size = sz.size; if ($settings.sound) sfx.pop(); }}
        aria-pressed={size === sz.size}
      >{sz.icon}</button>
    {/each}
    <button
      class="chip small pickbtn"
      class:on={sparkly}
      onclick={() => { sparkly = !sparkly; if ($settings.sound) sfx.chime(); }}
      aria-pressed={sparkly}
      aria-label={t('sparkles', $settings.lang)}
    >✨</button>
    <button class="chip small pickbtn" onclick={shuffle} aria-label={t('shuffle', $settings.lang)}>🎲</button>
  </div>

  <div class="row">
    <input
      class="name"
      bind:value={name}
      maxlength="14"
      placeholder="???"
      aria-label={t('name', $settings.lang)}
    />
    <button class="chip save" onclick={save}>✅</button>
  </div>

  {#if $mine.length}
    <div class="mine">
      {#each $mine as c (c.id)}
        <div class="card made">
          <button class="tile" onclick={() => show(c.id)} aria-label={c.name}>
            <CreaturePortrait spec={toSpec(c)} size={84} />
          </button>
          <strong>{c.name}</strong>
          <button class="bin" onclick={() => removeMine(c.id)} aria-label="🗑">🗑</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding-bottom: 96px; }

  .stage {
    position: relative;
    display: flex;
    justify-content: center;
    padding: 6px 0 12px;
  }
  .twinkle { position: absolute; right: 34%; top: 6px; font-size: 26px; animation: pop 1.4s infinite; }
  @keyframes pop { 50% { transform: scale(1.35) rotate(12deg); } }

  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 7px;
    margin-bottom: 10px;
  }
  .pickbtn { font-size: 21px; padding: 8px 10px; cursor: pointer; opacity: 0.6; }
  .pickbtn.on { opacity: 1; box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.7); }

  .parts { gap: 12px; }
  .part {
    width: 54px; height: 54px;
    border-radius: 16px;
    border: 3px solid rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.18);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .part.on { box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.8); }
  .swatch {
    width: 30px; height: 30px; border-radius: 10px;
    background: var(--c);
    border: 2px solid rgba(255, 255, 255, 0.8);
  }

  .palette { max-width: 340px; margin-inline: auto; }
  .dot {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: var(--c);
    border: 3px solid rgba(255, 255, 255, 0.75);
    cursor: pointer;
    transition: transform 0.12s ease;
  }
  .dot:active { transform: scale(0.88); }

  .name {
    width: 190px;
    padding: 10px 14px;
    border-radius: 999px;
    border: 3px solid rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.85);
    font: inherit;
    font-size: 19px;
    font-weight: 700;
    text-align: center;
    color: var(--ink);
  }
  .save { font-size: 22px; cursor: pointer; }

  .mine {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
    gap: 10px;
    margin-top: 18px;
  }
  .made { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; }
  .made strong { font-size: 15px; }
  .tile { background: none; border: none; cursor: pointer; padding: 0; }
  .bin { background: none; border: none; font-size: 16px; opacity: 0.55; cursor: pointer; }
</style>
