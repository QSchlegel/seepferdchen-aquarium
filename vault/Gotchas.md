# Gotchas

Traps that have each caused a real, shipped bug here. Worth reading before you
spend an afternoon on one.

## The shared canvas context

`art` keeps **one** module-level context, set by `bindContext()`. Any component
that draws must claim it *immediately before painting*.

> A `CreaturePortrait` renders on its own rAF loop and binds the context every
> frame. Put one on the same screen as the tank — which `/verstecken` does — and
> the tank paints into a 100px tile instead. The screen went black with smeared
> bubble trails.

`World.draw()` and the maze reclaim it at the top of every frame.

## Canvas `filter` ignores the transform

It is applied in **device space**. A blurred creature is drawn at the canvas
origin, not where it swims. Depth uses scale and alpha instead.

## Undefined colours

`ctx.fillStyle = undefined` is **silently ignored** — canvas keeps the previous
colour. Every creature routine reads a different set of fields:

- seahorse → `dark`
- seaUnicorn → `shade`, `tail`, `mane` (an **array**)
- unicorn → `rainbow` (an **array**)
- merperson → sixteen fields including `topAlt`, `tie`, `accColor`, `glassCol`
- parrot → `beak`, `belly`, `belly2`, `fin2`, `top`

Add a `kind` and you must supply all of them. `mine.test.ts` paints every body
through a recording context and fails on any undefined colour.

## Svelte 5 reactivity

**Plain classes are not reactive.** `$state` deep-proxies plain objects, not
class instances. `World` is a class, so `world.paused` cannot be watched — the
pause button showed the wrong icon for a while. Report outward via callbacks.

**Values computed in `onMount` do not follow prop changes.** `CreaturePortrait`
computed its bounding box once, so the maker's preview drew every later body
with the *first* one's fit. A unicorn scaled as a fish came out as a smear.

## Terrain collision

Correcting only downwards leaves a swimmer pressed into a steep outcrop with
its own steering driving it back in. Slide along the slope as well, and repick
any target buried in the hill.

## Deployment

There is **no `start` script** — the site is static, served by Caddy from the
Dockerfile. `railway.json` pins the builder; without it a GitHub-triggered
deploy falls to Railpack and breaks.

## The repository root

`~/git` is itself a git repository containing ~90 unrelated projects. This
project has its own `.git`. Never run `git add -A` from the parent.
