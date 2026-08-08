import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: '404.html', precompress: false }),
    prerender: { entries: ['*'] },
    // relative asset paths, so build/ also works when opened straight off disk
    paths: { relative: true },
    serviceWorker: { register: true }
  }
};
