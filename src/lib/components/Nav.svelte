<script lang="ts">
  /**
   * Getting around.
   *
   * One button in the bottom-left corner that opens a drawer of picture cards.
   *
   * Nine tabs across the bottom ate a strip of the tank on every screen and
   * truncated their own labels on a phone. A corner button gives the glass
   * back and leaves each destination a card big enough to recognise, with
   * feeding mirrored in the opposite corner.
   */
  import { page } from '$app/stores';
  import { settings } from '$lib/stores/settings';
  import { t } from '$lib/data/i18n';
  import { sfx } from '$lib/audio';

  const links = [
    { href: '/',            key: 'tank',       icon: '🐠' },
    { href: '/karte',       key: 'map',        icon: '🗺️' },
    { href: '/steckbriefe', key: 'characters', icon: '🪸' },
    { href: '/geschichte',  key: 'story',      icon: '📖' },
    { href: '/verstecken',  key: 'seek',       icon: '🔍' },
    { href: '/labyrinth',   key: 'maze',       icon: '🌀' },
    { href: '/machen',      key: 'make',       icon: '🎨' },
    { href: '/spiel',       key: 'game',       icon: '🎯' },
    { href: '/tippen',      key: 'typing',     icon: '⌨️' }
  ];

  let open = $state(false);
  const current = $derived(links.find((l) => l.href === $page.url.pathname) ?? links[0]);

  function toggle() {
    open = !open;
    if ($settings.sound) sfx.pop();
  }
</script>

<!-- desktop: a drawer behind one button -->
<div class="drawer-root">
  <button
    class="opener"
    class:on={open}
    onclick={toggle}
    aria-expanded={open}
    aria-label={t('menu', $settings.lang)}
  >
    <span class="icon">{open ? '✕' : current.icon}</span>
  </button>

  {#if open}
    <button class="scrim" aria-label={t('close', $settings.lang)} onclick={() => (open = false)}></button>
    <div class="drawer" role="menu">
      {#each links as l (l.href)}
        <a
          class="card"
          class:active={$page.url.pathname === l.href}
          href={l.href}
          role="menuitem"
          onclick={() => (open = false)}
          aria-current={$page.url.pathname === l.href ? 'page' : undefined}
        >
          <span class="big">{l.icon}</span>
          <span class="name">{t(l.key, $settings.lang)}</span>
        </a>
      {/each}
    </div>
  {/if}
</div>


<style>

  .opener {
      position: fixed;
      /* clear of the notch and the home bar — see --edge-* in app.css */
      left: calc(16px + var(--edge-left));
      bottom: calc(16px + var(--edge-bottom));
      z-index: 45;
      width: 64px;
      height: 64px;
      border-radius: 22px;
      border: 2px solid var(--chip-line);
      background: var(--chip);
      color: var(--chip-ink);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
      display: grid;
      place-items: center;
      box-shadow: 0 8px 22px rgba(0, 40, 65, 0.3);
      transition: transform 0.15s ease, background 0.2s ease;
    }
    .opener .icon { font-size: 30px; }
    .opener:hover { background: var(--chip-press); transform: translateY(-2px); }
    .opener.on { background: var(--chip-press); }

    .scrim {
      position: fixed;
      inset: 0;
      z-index: 44;
      border: none;
      padding: 0;
      background: rgba(3, 38, 60, 0.34);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      cursor: pointer;
      animation: fade 0.18s ease;
    }
    @keyframes fade { from { opacity: 0; } }

    .drawer {
      position: fixed;
      left: calc(16px + var(--edge-left));
      bottom: calc(92px + var(--edge-bottom));
      z-index: 46;
      display: grid;
      grid-template-columns: repeat(3, 116px);
      gap: 10px;
      padding: 14px;
      border-radius: 26px;
      border: 2px solid var(--chip-line);
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 18px 44px rgba(0, 35, 60, 0.36);
      animation: rise 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.3);
    }
    @keyframes rise { from { opacity: 0; transform: translateY(14px) scale(0.96); } }

    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 92px;
      border-radius: 18px;
      border: 2px solid var(--chip-line);
      background: var(--chip);
      color: var(--chip-ink);
      text-decoration: none;
      text-shadow: var(--chip-shadow);
      transition: transform 0.12s ease, background 0.2s ease;
    }
    .card:hover { background: var(--chip-press); transform: translateY(-3px); }
    .card.active { background: var(--chip-lit); border-color: #ffd166; }
    .big { font-size: 34px; line-height: 1; }
    .name { font-size: 13px; font-weight: 700; }

  /* a phone gets a smaller drawer, still three across */
  @media (max-width: 560px) {
    .opener {
      width: 60px;
      height: 60px;
      border-radius: 20px;
      left: calc(12px + var(--edge-left));
      bottom: calc(12px + var(--edge-bottom));
    }
    .opener .icon { font-size: 27px; }
    .drawer {
      left: calc(12px + var(--edge-left));
      right: calc(12px + var(--edge-right));
      bottom: calc(82px + var(--edge-bottom));
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 12px;
      border-radius: 22px;
    }
    .card { min-height: 78px; }
    .big { font-size: 29px; }
    .name { font-size: 11.5px; }
  }

  /* Sideways on a phone there is no room for three rows of cards above the
     button — the top ones ended up off the screen. Five across, two rows. */
  @media (max-height: 460px) {
    .opener { width: 52px; height: 52px; border-radius: 17px; }
    .opener .icon { font-size: 24px; }
    .drawer {
      left: calc(12px + var(--edge-left));
      right: calc(12px + var(--edge-right));
      bottom: calc(74px + var(--edge-bottom));
      grid-template-columns: repeat(5, 1fr);
      gap: 7px;
      padding: 10px;
    }
    .card { min-height: 62px; gap: 3px; }
    .big { font-size: 25px; }
    .name { font-size: 11px; }
  }
</style>
