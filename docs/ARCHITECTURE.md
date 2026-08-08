# Notes on the design

## Why the drawing layer binds its context once

Every routine in `art/index.ts` paints straight onto a module-level `ctx`, set
with `bindContext()`. Threading the context through every call would be tidier
in the abstract, but these routines run hundreds of times per frame and the
extra argument showed up when profiling on a throttled CPU. The trade is that
only one canvas can be painted at a time — which is fine, because portraits and
the tank never draw in the same tick.

## Why the simulation knows nothing about Svelte

`World` is a plain class. It takes a context, a list of specs and some options.
That means:

- it can be unit tested in Node against a stub context (see `world.test.ts`),
- the render loop lives in one small component and nothing else re-renders,
- swapping the UI layer later would not touch the simulation.

## Behaviour modes

Each creature has one of seven modes, and `behaviour.ts` has one function per
mode. Adding a new kind of movement means adding a function and a name — no
conditionals anywhere else.

| mode     | who                        | what it does                                  |
|----------|----------------------------|-----------------------------------------------|
| `swim`   | most fish, merpeople       | wanders to a target, chases the nearest pellet |
| `school` | the three shoals           | holds a slot around a shoal centre that itself wanders and swarms food |
| `follow` | Stormi's three foals       | trails a leader at an offset, flipping side with the leader |
| `drift`  | jellyfish                  | rises, reappears at the bottom                 |
| `crawl`  | crab, snail                | walks the sea floor, turns at the edges        |
| `bob`    | (available)                | hovers around a home point                     |
| `static` | starfish                   | sits in the sand                               |

## The sea floor

`sandY(x)` is the single source of truth for the height of the sand: ripples
from two sine waves plus a bank rising on the right. The reef, the crawling
creatures, the falling food and the swimmers' lower bound all read from it, so
nothing ever floats above the sand or sinks into it.

## What was dropped along the way

An earlier version of this aquarium was a single HTML file with no JavaScript at
all — CSS animation over pre-rendered sprite sheets — because iOS Quick Look and
in-app previews block scripts. That version is still the right answer for
sending a file to someone. This one is the right answer for a real app: the
behaviour is simulated rather than choreographed, which is what makes the fish
actually chase the food.
