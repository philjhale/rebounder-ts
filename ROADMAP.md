# Roadmap

Source of truth for what "the prototype" covers vs. what a full port still needs. See `CONTEXT.md` for terminology and `docs/adr/` for why key technical choices were made.

## Phase 1 — Prototype (current scope)

Goal: prove the core Line/Ball/Target loop feels right in the browser before investing in the rest.

- Canvas2D renderer, hand-rolled circle/segment/box collision, `requestAnimationFrame` variable-timestep loop ([ADR 0001](docs/adr/0001-canvas2d-rendering.md), [ADR 0002](docs/adr/0002-hand-rolled-physics.md))
- Vite + vanilla TypeScript, no UI framework
- Pointer Events for unified mouse/touch input
- Fixed single canvas aspect ratio — no responsive/multi-aspect handling
- Original sprite PNGs reused directly from `rebounder-unity-reference/Assets/SpriteCollections/InGame/Textures/`
- 5 hand-authored levels, fixed-field JSON schema (`launchers`, `targets`, `obstacles`, `teleporters`, `colourChangers`, `lineCounts`): `Scene1`, `UseTheObstacle`, `FirstTeleporter`, `FirstColourChanger`, `FirstColouredLine` ([ADR 0003](docs/adr/0003-hand-authored-prototype-levels.md))
- No progression/save system — a bare level picker, no persisted state

## Phase 2 — Full conversion (not started)

What's still required to call this a complete port of the original:

1. **Unity scene → JSON converter.** A script to parse the remaining ~70 `.unity` YAML scenes under `rebounder-unity-reference/Assets/Scenes/Levels/`, extracting `Transform` position/rotation for `Launcher`/`Target`/`Obstacle`/`Teleporter`/`ColourChanger` GameObjects (by tag/component), Teleporter pairings, and the `LineCounts` component's `StartingXLines` fields from each scene's `LevelScripts` GameObject. Once built, it also re-generates the 5 Phase-1 levels, so the hand-authored versions become disposable.
2. **Aspect-ratio variants.** Some levels ship two scenes for different device aspect ratios (e.g. `Scene3`, `Scene5`, `DownAndAround`, `CrossCollision`, `GiantEye`, `TargetBounceCross`, `TeleBounce`, `DownAndAround2`). Needs either a responsive viewport/scaling strategy or a decision to pick one variant per level and drop the other.
3. **Full level curriculum.** Port `LevelOrderHelper.cs`'s complete 65-level ordered list with progression gating (a level unlocks once the previous is complete).
4. **Save/progress system.** Port `GameSaveHelper`/`GameProgressSaveManager` (per-level completion, "all levels complete" flag) to `localStorage`.
5. **Menu flow.** Title screen, How To Play, Pause menu, Level Complete, All Levels Complete, Credits — currently NGUI/tk2d-driven UI (`UICamera`, `tk2dSprite`) with no browser equivalent yet. Needs a DOM or Canvas UI layer.
6. **In-game HUD.** Per-colour remaining-line indicators, pause/resume, next-level button (see `InGameUiManager`, `RemainingLinesButton`, `PauseButton`).
7. **Sprite animation.** `ColourChanger`, `Teleporter`, and `TargetHit` use frame-sequence sprite animation (`F1`..`F5` textures) via tk2d's animator — needs a small Canvas2D frame animator.
8. **GUI atlas assets.** Only 3 general-UI PNGs found (`InGameGui.png` at 1x/2x/4x) — audit what's actually in that atlas vs. what needs custom drawing.
9. **Audio.** None found anywhere in the source repo — the original ships silent. Nothing to port; flag separately if audio is wanted net-new.
10. **Fixed-timestep revisit.** Re-check collision tunneling once physics runs against all 75 levels' denser geometry, not just the 5 prototype levels ([ADR 0002](docs/adr/0002-hand-rolled-physics.md)).
11. **GameAnalytics.** Explicitly out of scope — drop entirely, not ported.
