# Architecture

```
src/lib/art/        the drawing layer — creatures, reef, terrain, effects
src/lib/sim/        world, behaviour, maze, types — no framework
src/lib/data/       cast, scenes, story, translations, module graph
src/lib/stores/     settings, progress, her own creatures (localStorage)
src/lib/components/ Svelte: canvas hosts, portraits, nav, settings
src/routes/         one directory per screen
scripts/graph.mjs   generates the module graph for /admin
```

## The split that matters

**`sim/` and `art/` know nothing about Svelte.** `World` is a plain class you
can build in a test with a stub canvas and step by hand:

```ts
const w = new World(stubContext(), CAST, { quality: 'low', sparkles: false });
w.resize(900, 700);
for (let i = 0; i < 600; i++) w.step(1 / 60);
```

That is why behaviour is testable at all. Keep it.

## Rendering

One canvas, drawn back to front every frame:

1. water and the surface swell
2. distant terrain ridges (three layers, different parallax)
3. reef layers, each sliding at its own rate
4. the chest, the hidden key
5. creatures, sorted by depth
6. particles, then the heads-up display

Depth is scale plus alpha — see [[Gotchas]] for why it is not blur.

## Data flow

Settings and progress are Svelte stores backed by localStorage. The `World` is
a plain class, so it **reports changes outward through callbacks** rather than
being watched. See [[Gotchas#Svelte 5 reactivity]].

## Seeing it

`/admin` draws the live module graph — every file a node, every import an edge,
generated at build time by `scripts/graph.mjs`.
