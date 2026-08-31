# Rebounder

A browser/TypeScript port of the Unity game I made many years ago called *Rebounder*. The player draws lines to deflect balls fired from launchers into matching-coloured targets.

Converted using Claude [Matt Pocock's skills](https://github.com/mattpocock/skills).

## Requirements

- Node.js (with npm)

## Getting started

Install dependencies:

```sh
npm install
```

Run the dev server:

```sh
npm run dev
```

This starts Vite and prints a local URL to open in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | Type-check without emitting output |
| `npm run lint` | Lint the codebase |
| `npm run lint:fix` | Lint and auto-fix |

## Project structure

- `src/` — game source (simulation, rendering, input, levels, save/progression logic)
- `src/levels/` — individual level definitions (JSON)
- `public/sprites/` — game art
- `docs/` — agent-facing documentation (issue tracker, triage labels, domain docs workflow)

## graphify (AI assistant tooling)

This repo uses [graphify](https://github.com/Graphify-Labs/graphify) to give AI coding assistants a queryable knowledge graph of the codebase (see the `## graphify` section in [CLAUDE.md](CLAUDE.md)). It's not required to build or run the game — only for assistants working on the codebase.

Install:

```sh
uv tool install graphifyy
# or: pipx install graphifyy
graphify install
graphify hook install
```

`graphify-out/` (the graph itself) is committed to the repo so nobody has to regenerate it from scratch. `graphify hook install` wires up git hooks that keep it current automatically — rebuilding on every commit and branch switch (AST-only, no API cost) and merging `graph.json` cleanly instead of producing conflict markers. After a `git pull`, run `graphify update .` to pick up teammates' changes.

See the [graphify install docs](https://github.com/Graphify-Labs/graphify#install) for platform-specific setup and troubleshooting.
