/// <reference types="@sveltejs/kit" />
/**
 * Cache everything the app ships with, so the aquarium works with no network
 * at all — the whole point on a tablet in the back of a car.
 *
 * Three lists, and all three matter:
 *   `build`       the hashed JavaScript and CSS
 *   `files`       everything in static/ — the icons, the manifest
 *   `prerendered` the nine pages themselves
 *
 * The last one was missing, which made the offline story a lie: the scripts
 * were all in the cache but the HTML that loads them was not, so a page she
 * had not already opened on this device showed the browser's dinosaur.
 */
import { build, files, prerendered, version } from '$service-worker';

const CACHE = `aquarium-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

/**
 * Where a navigation lands when the page it asked for was never cached: the
 * tank, which is the only entry that ends in a slash. Found rather than
 * hard-coded, so it keeps whatever base the app is served under.
 */
const HOME = prerendered.find((p) => p.endsWith('/')) ?? prerendered[0] ?? '/';

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE)
      // One at a time, tolerantly: `addAll` is a single transaction, so one
      // file that 404s loses her the entire offline app rather than one page.
      .then((cache) =>
        Promise.all(ASSETS.map((url) => cache.add(url).catch(() => undefined)))
      )
      .then(() => (self as any).skipWaiting())
  );
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => (self as any).clients.claim())
  );
});

self.addEventListener('fetch', (event: any) => {
  const request: Request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // chrome-extension: and friends cannot be put in a cache, and throw if you try
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(serve(request, url));
});

async function serve(request: Request, url: URL): Promise<Response> {
  const cache = await caches.open(CACHE);

  // A navigation is matched by path alone. `/karte?find=coco` is the same page
  // as `/karte`, and asking the cache for the whole URL would miss it.
  const navigating = request.mode === 'navigate';
  const key = navigating ? url.pathname : request;

  const hit = await cache.match(key, { ignoreSearch: navigating });
  if (hit) return hit;

  try {
    const res = await fetch(request);
    if (res.ok && url.origin === location.origin) {
      // clone before the body is read by the page
      cache.put(navigating ? url.pathname : request, res.clone());
    }
    return res;
  } catch (offline) {
    // No network and nothing cached under this path: hand back the tank, which
    // is prerendered, always cached, and can route to the rest on its own.
    const home = await cache.match(HOME);
    if (home) return home;
    throw offline;
  }
}
