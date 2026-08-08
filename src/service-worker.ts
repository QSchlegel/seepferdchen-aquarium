/// <reference types="@sveltejs/kit" />
/**
 * Cache everything the app ships with, so the aquarium works with no network
 * at all — the whole point on a tablet in the back of a car.
 */
import { build, files, version } from '$service-worker';

const CACHE = `aquarium-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event: any) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => (self as any).skipWaiting()));
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => (self as any).clients.claim())
  );
});

self.addEventListener('fetch', (event: any) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request)
        .then((res) => {
          if (res.ok && new URL(event.request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html') as any);
    })
  );
});
