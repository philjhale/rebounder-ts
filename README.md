# Rebounder

A browser/TypeScript port of the Unity game *Rebounder*: the player draws rotatable line segments to deflect coloured balls fired from launchers into matching-coloured targets.

Ported from the Unity source at `rebounder-unity-reference`, which remains the reference implementation. See [`CONTEXT.md`](./CONTEXT.md) for the game's domain vocabulary (Line, Ball, Launcher, Target, Level, etc.) and [`ROADMAP.md`](./ROADMAP.md) for planned work.

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
