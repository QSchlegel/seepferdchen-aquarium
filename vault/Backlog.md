# Backlog

Things to work on, easiest first. Nothing here is urgent — this is a place to
practise and play. Pick anything that looks fun.

Tags: `#good-first-task` self-contained · `#art` drawing · `#code` logic ·
`#design` how it feels · `#kid-friendly` a child could do this with help

---

## Tiny — change one thing and look at it

Start here if you have never touched the code.

- [ ] **Give a creature a new colour** `#good-first-task` `#kid-friendly` `#art`
  In `src/lib/data/cast.ts`, change any `body`, `fin` or `accent`. Run
  `npm test` — if you accidentally make two animals look alike, the test says so.
- [ ] **Add a new food** `#good-first-task` `#code`
  A new `FoodKind` in `sim/types.ts`, how it sinks in `FOOD`, who eats it in
  `behaviour.ts`, and how it looks in `art/index.ts`.
- [ ] **Add a story line to the ticker** `#good-first-task` `#kid-friendly`
  `src/lib/data/story.ts`. German and English.
- [ ] **Change how often the key glints** `#good-first-task`
  In `world.ts`. Too rare is frustrating, too often is no hunt at all.
- [ ] **Add a colour to the maker's palette** `#good-first-task` `#kid-friendly`
- [ ] **Make the bubbles bigger, smaller, faster or slower** `#good-first-task`

## Small — an afternoon

- [ ] **A new treasure for the chest** `#art`
  There are six. Draw a seventh in `drawLoot()` and add it to `LOOT`.
- [ ] **A new creature** `#art` `#code`
  A `kind`, a drawing routine, an entry in `DRAW`, an extent, and a cast member.
  Read [[Gotchas#Undefined colours]] first.
- [ ] **A tenth place** `#design` `#code`
  A scene in `scenes.ts` with its own palette, terrain seed, residents and
  links. The tests will tell you if the graph stops being symmetric.
- [ ] **Better shell and starfish drawings on the sand** `#art`
- [ ] **A sound for each kind of food landing** `#code`
- [ ] **Let her rename a creature she made** `#code`
- [ ] **Show which foods a creature likes on its card** `#design` `#kid-friendly`

## Medium — a weekend

- [ ] **Improve the mermaid drawings** `#art`
  Sixteen palette fields; hair styles and accessories already branch.
- [ ] **Terrain that reads by colour** `#design` `#art`
  Make each place's floor easier to navigate at a glance.
- [ ] **Music per place** `#code` `#design`
  Procedural ambience in `audio.ts`, keyed to the scene.
- [ ] **A better reward system** `#design`
  Right now: six treasures and a fed counter. What would actually feel like
  progress to a five-year-old without becoming a score she can lose?
- [ ] **Improve the spoken voice** `#code`
  Rate, pitch and voice selection in `speech.ts`; a toggle separate from sound.
- [ ] **Refresh the share image and the app icon** `#art`
- [ ] **Finish the PWA** `#code`
  Manifest and service worker exist. Audit installability properly.
- [ ] **A deeper maker** `#design` `#code`
  Patterns, fin shapes, eye styles, accessories.
- [ ] **Share a creature by link or QR** `#code`
  Encode a creature into a URL another child can open. No server, no accounts,
  nothing stored about anyone.

## Large — a project

- [ ] **A backend for real multiplayer** `#code`
  Needed for passkeys or email login. Think hard about storing children's data
  before starting.
- [ ] **Record her own voice for the names** `#design`
- [ ] **A drawing tool so she can draw a creature freehand** `#art` `#code`
- [ ] **Make the whole thing work offline on a plane** `#code`

## Known rough edges

Honest list of what is not right yet.

- [ ] Creature extents are approximations; some portraits sit off-centre.
- [ ] The find game still leans on reading, with speech as the workaround.
- [ ] `npm audit` reports dev-dependency vulnerabilities.
- [ ] Some drawing routines are long and hard to follow.
- [ ] No end-to-end tests — the games are only verified by hand.
