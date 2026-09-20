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

## The sea is wider than the window

Each place is several screens long (`span` in `scenes.ts`, 3–5) and **loops**:
swim off one end and you come back on the other. Everything with a position
stores *world* coordinates; `art.sx()` turns those into screen coordinates and
`wrapDelta()` measures the short way round, so a fish near the seam still
chases food just across it rather than swimming the long way.

The terrain noise is periodic over one loop — `loopFbm()` blends the value at u
with the value at u−1 so f(0) === f(1). Tests assert the floor and all three
ridge layers join with no step, in all nine places.

Hide and seek forces `span: 1`. A target she would have to swim off-window to
find is not a target a four-year-old can find.

### Why the tank looked empty on a phone

Two separate things, and the first one is the one that mattered.

**The renderer was throwing most of it away.** `art.sx()` decides whether a
world position belongs to the right of the camera or round the back to the
left; everything past a split point is drawn at a negative x and culled. The
split was `worldWidth - tankWidth - 700`, which is the right idea written
down for a desktop and for nothing else. On a phone the sea is three *narrow*
screens — 1170px — so the split came out at **80px**. Everything past the
first eighty pixels of the glass was shoved a whole loop to the left and
culled before it was drawn. The animals were all in front of her and she
could see six of them, huddled in the corner.

It is now `min(tankWidth + 700, (worldWidth + tankWidth) / 2)`: the generous
margin when there is room for one, and otherwise the midpoint between the
right edge and the seam, which is as far from both as it is possible to get.
`art/world.test.ts` now runs the seam tests at 390, 844 and 1280 wide rather
than only at 900, which is how it was missed.

**And the cast really was spread too thin.** A sea three to five screens wide
plus a plain random walk means two thirds of the animals are always somewhere
she is not looking. So there is also a tide, in `behaviour.ts`:

- It is **zero while a creature is on screen**. Inside the glass everyone
  wanders exactly as they did before.
- Outside, each time a swimmer picks a new target it may instead pick one
  *anywhere across the glass* — likelier the further out it has drifted, and
  it commits to the journey for six to ten seconds rather than dithering at
  the edge.
- Crawlers turn round just off the edge of sight; a crab at four pixels a
  second that keeps walking is gone for the afternoon.
- Jellyfish, which restart at the sea floor each time they reach the surface,
  come up where she can see them.
- The cast **spawns** across a screen and a half centred on the glass, so the
  tank is full the moment she opens it rather than a minute later.

Measured on a 390×844 phone, median of six fresh loads, counting animals big
and near enough to pick out: **6 before, 20 after**. Drawing all of them costs
3.7ms a frame there, against 6.1ms on a desktop — the phone was only ever
cheap because it was throwing the tank away.

The tide follows the camera, not the origin, so when she rides off into the
sea the cast comes with her. It switches itself off when the whole sea is
already on screen, which is what hide and seek does: there is no "away" to
come back from, and a tide would only bunch everyone in the middle of a game
about looking.

## Leaning the tablet to look along the sea

The 🧭 button turns the gyroscope on; tipping the tablet then slides the
window along the sea, and holding it straight stops it where it is. Turning
the button off drifts the view back to the first screen, where the doorways,
the key and the chest live.

It exists because the sea is three to five screens wide and the only other way
to see any of it was to feed a creature until it was tame and then ride it —
several steps in, and a long way past what a five-year-old will find on her
own. She is already holding the tablet. Tipping it needs no reading, no aim
and no fine motor control, and it undoes itself.

Details that matter:

- **Eased, not direct.** A hand-held tablet is never still, and an un-eased
  camera reads as a judder. `LOOK_SPEED` is 300px a second at full lean, which
  crosses a three-screen sea in about five seconds.
- **Level means stop, not spring back.** She can lean over to a stretch of sea
  and then hold the tablet still to watch it.
- **The reins win.** Leaning while riding does not drag the view off the animal
  she is steering.
- **A one-screen sea does not slide** — hide and seek would only lose her the
  creature she is hunting.
- **The tide follows the glass**, so wherever she looks, the cast drifts over
  to her rather than leaving her an empty stretch of water.

The pearl game uses the same sensor for something else, so starting one stops
the other.

## Taming and riding

Feed a creature its favourite and its trust grows — a ring fills over its head.
At full trust it is tame and wears a heart. Tap a tame creature to take the
reins; a thumb stick appears (WASD and arrows also work) and the camera follows
it through the sea, round the loop and back.

## Terrain

Layered value noise, seeded per place — see [[The Nine Places]]. `sandY(x)` is
the single source of truth for the floor: where crabs walk, where food settles,
where the key lies. Collision slides along the slope, not just upwards, or
swimmers stick to the steep outcrops.
