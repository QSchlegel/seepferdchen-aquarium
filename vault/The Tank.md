# The Tank

The main screen. A simulation (`src/lib/sim/world.ts`) plus a renderer
(`src/lib/art/index.ts`), joined by a thin Svelte host.

## Behaviour

`src/lib/sim/behaviour.ts`, one function per mode:

| Mode | What it does |
|---|---|
| `swim` | roams, chases food it likes, flees predators, investigates taps |
| `school` | boids — separation, alignment, cohesion |
| `follow` | trails a leader at an offset |
| `drift` | rises slowly, reappears at the bottom |
| `crawl` | walks the sea floor |
| `bob` | hovers around a home spot |
| `static` | sits — but still rocks with the swell |

On top of the modes:

- **Fleeing.** Anything small bolts from anything `scary`. The shark does not
  chase; everyone else simply leaves. This does more for aliveness than any
  other single thing.
- **Energy.** Sprinting tires a creature; tired ones potter near the reef. Stops
  all thirty cruising at one pace.
- **Boldness.** Fixed per creature at spawn, so each behaves consistently. Bold
  ones come to see what she just did.
- **Depth.** Every creature drifts slowly through `z`, which drives its drawn
  size and paleness.

## Feeding

Six foods, and **nobody eats everything** — what she drops decides who comes:

| Food | Who wants it |
|---|---|
| Körner (pellets) | most fish |
| Algen (greens) | grazers |
| Krill | hunters — shark, eel, octopus, jelly |
| Zuckerwatte | unicorns and merfolk only |
| Muschel-Müsli | merfolk — drawn from Lucille's own illustration |
| Seetang-Plankton | seahorses |

`vegetarian` means *no meat*, not *greens only* — the merfolk are vegetarian and
still want their muesli.

## The key hunt

A dull, tarnished key hides among the reef and glints occasionally. Tap it, then
tap the chest: the lid springs open, coins fountain out, and one of six
treasures rises in a shaft of light. After a while the chest locks itself and
the key hides somewhere new. The longer she hunts, the more often it winks.

## Terrain

Layered value noise, seeded per place — see [[The Nine Places]]. `sandY(x)` is
the single source of truth for the floor: where crabs walk, where food settles,
where the key lies. Collision slides along the slope, not just upwards, or
swimmers stick to the steep outcrops.
