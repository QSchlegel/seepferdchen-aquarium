/**
 * What shape is the window, right now?
 *
 * CSS handles nearly all of this on its own. The exception is a canvas: a
 * `CreaturePortrait` is drawn at a pixel size passed in as a prop, so the
 * component has to *know* it is on a phone held sideways rather than being
 * told by a media query after the fact.
 *
 * Read as a store rather than once at mount, because a tablet gets turned
 * over mid-game — the tank used to keep a `compact` flag sampled once in
 * `onMount`, which was right until the first time she rolled onto her side.
 */
import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

/** True while the window matches. False on the server, where there is no window. */
export function media(query: string): Readable<boolean> {
  return readable(false, (set) => {
    if (!browser) return;
    const mq = window.matchMedia(query);
    set(mq.matches);
    const changed = () => set(mq.matches);
    mq.addEventListener('change', changed);
    return () => mq.removeEventListener('change', changed);
  });
}

/**
 * A phone held sideways — about 390px of height for everything.
 *
 * The same number lives in the `@media (max-height: 460px)` blocks in the
 * components. Keep the two in step: this store decides how big a picture is
 * drawn, the CSS decides what is around it.
 */
export const short = media('(max-height: 460px)');

/** A phone, either way up. */
export const phone = media('(max-width: 560px)');
