# 🐠 Seepferdchen-Aquarium

An aquarium you can play with, from the world of the *Seepferdchenhof* books.

**Play it here → [lucilleschlegel.com](https://lucilleschlegel.com)**

Tap a fish and it says hello. Feed them — but not everyone likes the same food.
Find the hidden golden key and unlock the treasure chest. Swim off to eight
other places. Build your own creature and watch it join the others.

---

## 🎨 Want to change something?

You can. This is a good project to learn on, and **you do not need to be a
grown-up**. Here is the smallest possible thing you can do.

### Make a fish a different colour

**1. Get it running.** In a terminal, in this folder:

```bash
npm install
npm run dev
```

It prints an address like `http://localhost:5173`. Open that in your browser.
You should see the aquarium.

**2. Open the file with the animals in it.**

```
src/lib/data/cast.ts
```

**3. Find a fish.** Look for a line like this:

```ts
{ id: 'coco', name: 'Coco', kind: 'fish', size: 22, body: '#ff5c8a', ... }
```

`body: '#ff5c8a'` is its colour. Those numbers and letters are a colour code.

**4. Change it.** Try `body: '#00ff00'` for bright green. Save the file.

**5. Look at your browser.** The fish changed colour. You did that. 🎉

### Colour codes

A colour code starts with `#` and has six characters: two for **red**, two for
**green**, two for **blue**. `00` means none, `ff` means as much as possible.

| Code | Colour |
|---|---|
| `#ff0000` | red |
| `#00ff00` | green |
| `#0000ff` | blue |
| `#ffff00` | yellow |
| `#ff00ff` | pink |
| `#ffffff` | white |
| `#000000` | black |

You can also use a [colour picker](https://htmlcolorcodes.com/) and copy the
code it gives you.

### Then try these

- Give an animal a new name — change `name: 'Coco'`
- Make a fish bigger or smaller — change `size: 22`
- Add a sentence to the story — open `src/lib/data/story.ts`
- Add a new colour to the creature maker — open `src/routes/machen/+page.svelte`

More ideas, sorted from easy to hard, are in **[vault/Backlog.md](vault/Backlog.md)**.

### If something breaks

Nothing you do here can break anything for real. The website that other people
see does not change until someone deliberately publishes it.

If the aquarium goes blank, undo your change (`Ctrl+Z` / `Cmd+Z`) and save
again. If you get stuck, that is normal — everyone does.

---

## 🧪 Checking your work

```bash
npm test      # checks the rules of the aquarium still hold
npm run check # checks for spelling mistakes in the code
```

`npm test` is friendly and fast. It knows things like *two animals of the same
kind must not look alike* — so if you accidentally make two fish the same
colour, it tells you which two.

---

## 🛠 For grown-ups and agents

| | |
|---|---|
| Stack | SvelteKit 2 · Svelte 5 · canvas · no runtime dependencies |
| Output | static, served by Caddy |
| Hosting | Railway, behind Cloudflare |
| Tests | ~100, headless, sub-second |

```bash
npm run dev     # dev server
npm test        # tests
npm run check   # svelte-check
npm run build   # regenerates the module graph, then builds
npm run graph   # module graph only
```

**Documentation** lives in [`vault/`](vault/) as an Obsidian vault — open that
folder in Obsidian, or just read the Markdown:

- [Design Principles](vault/Design%20Principles.md) — why it is built this way
- [Architecture](vault/Architecture.md) — how the pieces fit
- [The Tank](vault/The%20Tank.md) · [The Nine Places](vault/The%20Nine%20Places.md) · [The Cast](vault/The%20Cast.md) · [Games](vault/Games.md)
- [**Gotchas**](vault/Gotchas.md) — traps that have each caused a real bug. Read this one.
- [Backlog](vault/Backlog.md) · [Contributing](vault/Contributing.md)

Agents: [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md).

There is a live module graph at `/admin`.

### The one design rule

**She cannot read yet.** Every control is a picture, a colour or a sound; text
is for the adult nearby. If a feature needs reading to make sense, it needs
redesigning, not a label. Nothing can be failed, timed or lost.
