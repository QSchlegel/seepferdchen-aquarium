# The Cast

`src/lib/data/cast.ts`. Groups: `rangers`, `seahorses`, `fish`, `shoals`,
`unicorns`, `friends` — plus `mine` for her own creations, which follow her
everywhere.

## Telling them apart

Hide and seek is only fair if two animals of the same kind are actually
distinguishable. `cast.test.ts` measures perceptual colour distance between
every same-kind pair and fails if two are both similarly coloured *and*
similarly sized.

It has caught five real collisions:

| Pair | Was | Now |
|---|---|---|
| Sandy / Pebble / Nugget | three near-identical pale golds | sand, stone, gold |
| Stardust / Twinkletail | both pure white | white, blue |
| Luna / Blossom | both near-white | white, pink |
| Mango / Pepper | both orange | orange, deep red |
| Coco / Rosie | both pink | pink, violet |

The foals are named for their colours — Sandy is sand, Pebble is stone, Nugget
is the only gold one.

## Shoals

A shoal shares one name and one look across every member, so **the shoal is the
character**. `sameCharacter()` treats any member as the target — otherwise the
game asks for "Mango" and marks ten fish that *are* Mango as wrong.

## Drawing

One routine per `kind` in `art/index.ts`. Each reads a **different** set of
palette fields — see [[Gotchas#Undefined colours]]. Shared touches: every
creature blinks on its own clock, carries a soft contour so it reads against a
busy reef, and has a blushed cheek.
