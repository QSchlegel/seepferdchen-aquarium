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
step by hand. Keep it that way — it is why there are ~100 tests for behaviour
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
  body was drawn with the first one's fit.

## Verifying

```bash
npm test          # ~100 tests, all headless, all fast
npm run check     # svelte-check, must be clean
npm run build     # regenerates the module graph, then builds
```

Prefer a test that would have caught the bug over a test that restates the fix.
Several tests here are of the form "paint everything and fail on any undefined
colour" or "run the sim for forty seconds and assert nobody is inside a rock" —
those catch whole categories.

Verify visually too when the change is visual. A screenshot of the built site
beats reasoning about canvas coordinates.

## Deploying

Static build, served by Caddy, on Railway. `railway.json` pins the builder to
the Dockerfile — do not remove it, there is no `start` script and Railpack
would produce a broken deploy.

## Tone

The comments in this codebase explain *why*, especially where something looks
odd. Match that. If you work around a browser quirk, say which quirk. A future
reader — possibly a child — should be able to follow what happened and why.
