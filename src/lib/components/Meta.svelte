<script lang="ts">
  /**
   * Head tags for one page. Prerendered, so what a scraper sees is whatever
   * was true at build time — which is why the copy lives in data/site.ts
   * rather than coming from the language switch.
   */
  import { OG_IMAGE, OG_IMAGE_ALT, PAGES, SITE_NAME, SITE_URL } from '$lib/data/site';

  let { path }: { path: string } = $props();

  const page = $derived(PAGES[path] ?? PAGES['/']);
  const title = $derived(path === '/' ? SITE_NAME : `${page.title} · ${SITE_NAME}`);
  const url = $derived(path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={page.description} />
  <link rel="canonical" href={url} />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={page.description} />
  <meta property="og:url" content={url} />
  <meta property="og:locale" content="de_DE" />
  <meta property="og:locale:alternate" content="en_GB" />
  <meta property="og:image" content={OG_IMAGE} />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={OG_IMAGE_ALT} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={page.description} />
  <meta name="twitter:image" content={OG_IMAGE} />
  <meta name="twitter:image:alt" content={OG_IMAGE_ALT} />
</svelte:head>
