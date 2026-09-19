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

## The edges of the screen

A phone keeps a strip at the bottom for the home bar and, held sideways, a
strip at one side for the notch. iOS treats a swipe that starts in the bottom
strip as a system gesture, so the **first tap on anything sitting there does
nothing at all**.

> The menu button — the one control on every screen — was pinned 12px from the
> bottom. On a notched phone it needed two taps, every time, and there was no
> way for a child to work out why.

Everything pinned to an edge measures from `--edge-top`/`-bottom`/`-left`/
`-right` (`app.css`), which are `env(safe-area-inset-*)` and therefore zero on
a desktop and on any phone without cutouts. `viewport-fit=cover` in `app.html`
is what makes the browser report them at all.

`src/test/edges.test.ts` reads every component's CSS and fails on a `position:
fixed` rule — or an absolutely positioned child of a `.hud` — that pins itself
to an edge without them. It also catches a page that re-states `.page`'s
bottom padding and drops the inset with it, which is how the map and the maker
both lost theirs.

## One control, several fingers

A five-year-old does not use a touchscreen one finger at a time. The tank
tracks its pointers in a `Map` keyed by `pointerId`: with a single drag object
the second finger took the first one's place, so only the last one stirred the
water, lifting either one stopped the other's bubbles, and a tap anywhere
cancelled a journey somebody was holding a doorway open for.

## The service worker caches three lists, not two

`$service-worker` exports `build`, `files` **and** `prerendered`. The first two
are the scripts and the contents of `static/`; the third is the nine pages
themselves.

> Only the first two were cached. Every asset the app needs was on the device
> and the HTML that loads them was not, so offline she got the browser's
> dinosaur on any page she had not already opened on that device. The offline
> story looked finished and was not.

`src/test/pwa.test.ts` fails if `prerendered` goes missing again. Test it for
real with `npm run build`, serve `build/`, load a page, then stop the server —
Chrome's "offline" checkbox is not the same thing: under it `fetch()` inside a
worker resolves with a synthetic 404 instead of rejecting, so the fallback
path never runs.

## Anything sized against the glass has to be tried on a phone

`art.sx()` split the loop at `worldWidth - tankWidth - 700`. On a desktop that
is a sensible margin. On a phone, where the sea is three 390px screens, it is
80px — inside the glass — so everything past the first eighty pixels was drawn
a whole loop to the left and culled.

> She opened the aquarium on a phone and saw six animals huddled in the
> left-hand corner of an empty tank. All fifty of them were there, in front of
> her, and the renderer was throwing them away.

Every test of that function used a 900px screen. Constants that trade one
dimension off against another — a margin against a world width, a cast against
a screen — need testing at the sizes the app is actually used at, which for
this one is a phone held upright. `art/world.test.ts` now loops over 390, 844
and 1280.

## The sea loops, so nothing may be clamped to the first screen

`world.ts` used to finish its food update with
`f.x = clamp(f.x, 6, this.width - 6)` — a leftover from when the tank was one
screen wide and had side walls.

> Every pellet she dropped while riding was snatched back to the origin the
> instant it landed, and sank there, a mile from the fish she meant to feed.
> It never showed up at rest, because at rest the camera *is* the first
> screen, which is why it survived so long.

The sea is a loop: positions are world coordinates and the only legal
correction is `wrapWorld`. The three things that are still deliberately
clamped to the glass — the key, the pearl, the doorways — are clamped because
she has to be able to reach them, and each says so.

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
