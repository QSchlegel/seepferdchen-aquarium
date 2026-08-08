# Seepferdchen-Aquarium

An interactive aquarium for a five-year-old who cannot read yet, set in the
world of the *Seepferdchenhof* books. Live at
[lucilleschlegel.com](https://lucilleschlegel.com).

> [!important] The rule everything follows from
> **She cannot read.** Every control is a picture, a colour or a sound. If a
> feature needs reading, it does not work — redesign it, do not add a label.

## Start here

- [[Design Principles]] — why it is built this way
- [[Architecture]] — how the pieces fit
- [[The Tank]] — the simulation and the renderer
- [[The Nine Places]] — the world and how it connects
- [[The Cast]] — the animals, and what makes each distinct
- [[Games]] — the five things she can play
- [[Gotchas]] — traps that have already caused real bugs
- [[Backlog]] — things to work on, easiest first
- [[Contributing]] — how to join in

## At a glance

| | |
|---|---|
| Stack | SvelteKit, canvas, no runtime dependencies |
| Output | static, served by Caddy |
| Hosting | Railway, custom domain via Cloudflare |
| Tests | ~100, headless, sub-second |
| Screens | tank, map, characters, story, hide & seek, maze, maker, find, typing |
