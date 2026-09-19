/**
 * Putting the aquarium on the home screen.
 *
 * Installed, it opens full screen with no address bar, keeps working with no
 * network, and looks to her like any other app on the tablet — which is the
 * difference between "a website Papa opens" and "mine".
 *
 * Three different browsers, three different stories:
 *
 * - Chrome and Edge fire `beforeinstallprompt` when they judge the app
 *   installable. We keep the event and fire it later from a real tap, which
 *   is the only time `prompt()` is allowed.
 * - Safari on iOS has no API at all. The only route is Share → Add to Home
 *   Screen, so all we can do is say so — and that line is for the grown-up,
 *   who can read it.
 * - Firefox and desktop Safari do neither, so the offer is hidden rather than
 *   promising something that will not happen.
 *
 * The listener has to be attached before the browser fires the event, which
 * is early, so this module is imported by the layout rather than by the sheet
 * that shows the button.
 */
import { readable, writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

/** What, if anything, to offer her grown-up. */
export type InstallOffer =
  /** already on the home screen — nothing to offer */
  | 'installed'
  /** the browser has an install prompt waiting for us */
  | 'ready'
  /** iOS: no prompt, only instructions */
  | 'ios'
  /** this browser cannot install, or has not decided yet */
  | 'none';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let waiting: InstallEvent | null = null;

const offer = writable<InstallOffer>('none');
export const installOffer: Readable<InstallOffer> = { subscribe: offer.subscribe };

/** Is it already running as an installed app? */
function launched(): boolean {
  if (!browser) return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // Safari's own, non-standard, and the only one iOS sets
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** iPadOS 13+ claims to be a Mac, so the touch count is what gives it away. */
function iOS(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return true;
  return /iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/** Safari is the only iOS browser that can add to the home screen. */
function iOSSafari(): boolean {
  return iOS() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

function settle() {
  if (launched()) offer.set('installed');
  else if (waiting) offer.set('ready');
  else if (iOSSafari()) offer.set('ios');
  else offer.set('none');
}

if (browser) {
  window.addEventListener('beforeinstallprompt', (e) => {
    // without this Chrome shows its own bar as well as ours
    e.preventDefault();
    waiting = e as InstallEvent;
    settle();
  });
  window.addEventListener('appinstalled', () => {
    waiting = null;
    offer.set('installed');
  });
  settle();
}

/**
 * Ask the browser to install. Must be called straight out of a tap: the
 * saved event is only good for one prompt, and only from a gesture.
 */
export async function addToHomeScreen(): Promise<boolean> {
  if (!waiting) return false;
  const event = waiting;
  waiting = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    settle();
    return outcome === 'accepted';
  } catch {
    settle();
    return false;
  }
}

/**
 * Has the service worker finished stashing the app away?
 *
 * `controller` is set once a worker is looking after this page, which is also
 * when the precache has completed — so this is the honest answer to "is it
 * downloaded?", rather than a promise that it will be.
 */
export const offlineReady: Readable<boolean> = readable(false, (set) => {
  if (!browser || !('serviceWorker' in navigator)) return;
  set(!!navigator.serviceWorker.controller);
  const changed = () => set(!!navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', changed);
  return () => navigator.serviceWorker.removeEventListener('controllerchange', changed);
});
