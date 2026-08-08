# Contributing

Everyone is welcome, including children. See [[Backlog]] for things to do.

## Getting it running

```bash
npm install
npm run dev
```

Open the address it prints. Changes appear as you save.

## Before you send a change

```bash
npm test        # must pass
npm run check   # must report 0 errors
```

If your change is visual, **look at it**. Build and open it; a screenshot beats
reasoning about canvas coordinates.

## What makes a change good here

- It works for someone who cannot read. See [[Design Principles]].
- Nothing can be failed or lost.
- If you fix a bug, add the test that would have caught it.
- Comments explain *why*, especially around a workaround.
- Read [[Gotchas]] first — it will save you an afternoon.

## For agents

[[../AGENTS.md|AGENTS.md]] and [[../CLAUDE.md|CLAUDE.md]] at the repository root.
