# Working on the Seepferdchen-Aquarium

This is an interactive aquarium built for one particular five-year-old, in the
world of the *Seepferdchenhof* books. Everything here follows from that.

## The one rule that decides most arguments

**She cannot read yet.**

If a feature needs reading to use, it does not work. Before adding anything,
ask: could a child who cannot read a single word figure this out from the
pictures, the colours and the sounds? If not, redesign it — do not add a label.

Concretely:

- Controls are pictures. Text is for the grown-up looking over her shoulder.
- Anything nameable can be spoken aloud (`$lib/speech.ts`), never only written.
- Nothing can be lost, timed, or failed. A wrong tap says "try again" warmly and
  the round continues. There is no score she can be sad about.
- Tap targets are generous. Small fingers, a moving target, a tablet on a sofa.

## Shape of the code

```
src/lib/art/      one big canvas drawing layer — every creature and the reef
src/lib/sim/      the simulation: world, behaviour, maze, types. No framework.
src/lib/data/     the cast, the places, the story, translations
src/lib/stores/   settings, progress, her own creatures — all localStorage
src/lib/components/  Svelte: canvas hosts, portraits, nav, settings
src/routes/       one directory per screen
```

The split that matters: **`sim/` and `art/` know nothing about Svelte.** The
simulation is a plain class you can construct in a test with a stub canvas and
step by hand. Keep it that way — it is why there are ~130 tests for behaviour
that would otherwise need a browser.

`/admin` draws the live module graph if you want to see the real shape.

## Things that have already bitten someone

Learn these rather than rediscovering them:

- **`art` holds one module-level canvas context.** Anything that draws must call
  `art.bindContext(ctx)` immediately before painting. A `CreaturePortrait` on
  the same screen as the tank will otherwise steal it and the tank goes black.
- **Canvas `filter` ignores the transform.** A blurred creature lands at the
  canvas origin, not where it swims. Do not use it for depth.
- **Painting with `undefined` is silent.** Canvas accepts `fillStyle = undefined`
  and draws with the previous colour. Every creature routine reads a different
  set of palette fields; if you add a `kind`, give it *all* of them. See
  `paletteFor()` in `stores/mine.ts` and the test that catches this.
- **Svelte 5: a plain class is not reactive.** `World` is a plain class, so a
  component cannot watch `world.someField`. Report changes out through a
  callback instead.
- **Values computed in `onMount` do not follow prop changes.** This broke the
  creature maker: the portrait's bounding box was computed once, so every later
  body was drawn with the first one's fit. A media query read once at mount has
  the same problem when the tablet is turned over — use `stores/viewport.ts`.
- **The sea is wider than the window, and it loops.** Positions are world
  coordinates; correct them with `wrapWorld`, never by clamping to
  `this.width`. Food was clamped, so everything she dropped while riding was
  yanked back to the origin.
- **A constant that trades the screen off against the world must be tried at
  phone size.** `art.sx()` split the loop at `worldWidth - tankWidth - 700`,
  which on a phone is 80px — inside the glass — so the renderer culled all but
  a corner of the tank. Every test of it used a 900px screen. See
  [The Tank](vault/The%20Tank.md); the cast also drifts back towards whatever
  the camera is looking at, which is the other half of a full tank.
- **A stylesheet read in a test is empty unless `css: true`.** Vitest stubs CSS,
  so `?raw` gives `''` and the test passes while checking nothing.
- **The browser paints its own reserved strip with your root background
  colour.** `html`/`body` needs a `background-color`, not only a gradient, or
  iOS Safari's bottom bar leaves a band of white under the sea.
- **The floating controls are not always white.** They sit over water that is
  repainted nine ways; white glass vanishes over the pale places. Take their
  colours from the `--chip-*` tokens in `app.css`, which follow `chromeInk()`
  for the place she is in.
- **A phone eats taps at the edges of the screen.** Anything pinned to an edge
  measures from `--edge-top`/`-bottom`/`-left`/`-right` in `app.css`, never
  from 0. The menu button sat in the home bar and needed two taps, every time.
  `src/test/edges.test.ts` fails the build if a new control forgets.

## Verifying

```bash
npm test          # ~130 tests, all headless, all fast
npm run check     # svelte-check, must be clean
npm run build     # regenerates the module graph, then builds
```

Prefer a test that would have caught the bug over a test that restates the fix.
Several tests here are of the form "paint everything and fail on any undefined
colour" or "run the sim for forty seconds and assert nobody is inside a rock" —
those catch whole categories.

Verify visually too when the change is visual. A screenshot of the built site
beats reasoning about canvas coordinates — and at 375×667 and 844×390, not
just at desktop width. She plays on a phone, held either way up.

## Deploying

Static build, served by Caddy, on Railway. `railway.json` pins the builder to
the Dockerfile — do not remove it, there is no `start` script and Railpack
would produce a broken deploy.

It is also an installable app. Three things have to stay true, and the
`Caddyfile` is where two of them live: the manifest is served as
`application/manifest+json`, and neither it nor `service-worker.js` may be
cached. The third is `src/service-worker.ts`, which precaches `build`, `files`
**and** `prerendered` — see [Gotchas](vault/Gotchas.md). `src/test/pwa.test.ts`
guards what it can from Node.

## Tone

The comments in this codebase explain *why*, especially where something looks
odd. Match that. If you work around a browser quirk, say which quirk. A future
reader — possibly a child — should be able to follow what happened and why.
