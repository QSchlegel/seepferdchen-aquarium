# AGENTS.md

Guidance for coding agents working in this repository. Human contributors want
[README.md](README.md); the full notes live in [the vault](vault/).

This file is the short version of [CLAUDE.md](CLAUDE.md) — read that too.

## What this is

An interactive aquarium for a five-year-old who cannot read yet, set in the
world of the *Seepferdchenhof* books. SvelteKit, static output, canvas
rendering, no runtime dependencies.

## Non-negotiables

1. **No feature may require reading.** Pictures, colours and sound only. Text is
   for adults. If your feature needs a label to make sense, redesign it.
2. **Nothing can be failed or lost.** No timers, no game-over, no score that can
   go down. A wrong answer is answered warmly and play continues.
3. **`src/lib/sim/` and `src/lib/art/` stay framework-free.** They are tested
   headlessly against a stub canvas. Do not import Svelte into them.
4. **Every change keeps `npm test` and `npm run check` green.**

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm test` | ~100 headless tests |
| `npm run check` | svelte-check, must report 0 errors |
| `npm run build` | regenerates the module graph, then builds |
| `npm run graph` | regenerate the module graph only |

## Traps that have already caused bugs here

- `art` keeps **one** module-level canvas context — call `art.bindContext(ctx)`
  right before you paint, or another component will have stolen it.
- Canvas `filter` is applied in device space and **ignores the transform**.
- `fillStyle = undefined` **fails silently**. Add a `kind` and you must supply
  every palette field its routine reads.
- Svelte 5: **plain classes are not reactive**, and values computed in
  `onMount` **do not follow prop changes**.

## Expectations for a change

- Write the test that would have caught the bug, not one that restates the fix.
- Check visual work visually — build it and look at it.
- Comment *why*, not *what*, especially around a workaround.
- Say plainly what you verified and what you did not.

## Where to start

`vault/Backlog.md` lists tasks graded by difficulty, from one-line colour
changes upward. Anything tagged `#good-first-task` is self-contained.
