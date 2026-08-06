# Rebounder (TS port)

A browser/TypeScript port of the Unity game *Rebounder*: the player draws rotatable line segments to deflect coloured balls fired from launchers into matching-coloured targets.

Ported from the Unity source at `rebounder-unity-reference`, which remains the reference implementation. See [CONTEXT.md](CONTEXT.md) for domain terminology and [ROADMAP.md](ROADMAP.md) for project scope and status.

## Status

Planning stage — architecture decisions and domain modelling are recorded in [docs/adr/](docs/adr/), but implementation hasn't started yet. See [ROADMAP.md](ROADMAP.md) for the Phase 1 prototype scope and Phase 2 full-conversion plan.

## Stack

- Canvas2D renderer, hand-rolled physics — see [ADR 0001](docs/adr/0001-canvas2d-rendering.md) and [ADR 0002](docs/adr/0002-hand-rolled-physics.md)
- Vite + vanilla TypeScript, no UI framework
- Pointer Events for unified mouse/touch input

## Repo layout

- [CONTEXT.md](CONTEXT.md) — domain language/terminology
- [ROADMAP.md](ROADMAP.md) — scope and phased plan
- [docs/adr/](docs/adr/) — architecture decision records
- [docs/agents/](docs/agents/) — agent-facing workflow docs (issue tracker, triage labels, domain docs)

## Contributing

Issues and specs are tracked as GitHub issues on this repo — see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md). Do new work in a git worktree on its own branch, not directly on `main`.
