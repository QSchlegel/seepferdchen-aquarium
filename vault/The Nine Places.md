# The Nine Places

Defined in `src/lib/data/scenes.ts`. Each has its own water gradient, sand,
light, vegetation densities, terrain seed and inhabitants.

| Place | Feel |
|---|---|
| Riff | the home reef, bright and busy |
| Kelpwald | green, towering, dim below |
| Tiefsee | near-black, sparse, a trench |
| Schiffswrack | a wreck with a hold that lights when someone shelters inside |
| Lagune | shallow, bright, the surface close overhead |
| Höhle | dark, violet, sponge-covered |
| Vulkan | warm reds, broken ground |
| Eismeer | pale, icy, high-key |
| Perlenbank | soft pinks, coral-rich |

## The buttons change colour with the water

The floating controls — the menu button, the feed button, the counters, the
quest line — are frosted glass. White glass with white icons reads beautifully
over the trench and the cave, and is *invisible* over the pearl beds, the ice
sea and the lagoon, where the water at the surface is almost white. Measured as
a contrast ratio, white on the pearl beds is 1.1, which is none at all; six of
the nine places were like that, and the reef only got away with it because of
the border round each pill.

`chromeInk(place)` weighs white against the ink the cards are written in,
against that place's surface water and its sand, and the tank sets
`data-chrome` on `<html>` to whichever wins. The pale six get dark ink on
light glass, the dark three keep white on dark. A test in `scenes.test.ts`
holds every place to a contrast ratio of at least 3:1, so repainting a place —
or adding a tenth — cannot quietly hide the controls again.

## How they connect

Each scene lists `links`. The graph is **symmetric** — if you can swim there you
can swim back — and fully connected. Doorway positions on screen are *derived*
from the links, so adding a connection needs no layout work.

Guarded by tests in `src/lib/data/scenes.test.ts`: nine places, every link
reciprocal, no self-links, everything reachable from the reef, at most three
doorways each, unique map cells, distinct water and terrain seeds.

## Travelling

Each destination appears as a **headland in the distant terrain** — the ridge
line swells up to meet it. Press and hold on one: a ring fills, then the screen
dives through the water, the cast sweeps past, and the scene swaps at the
deepest point so nothing pops.

A hold rather than a tap, so a finger resting on the glass never teleports her.

[[Games#The map]] shows the whole graph as a chart.
