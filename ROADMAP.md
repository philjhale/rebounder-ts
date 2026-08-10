# Roadmap

Source of truth for what "the prototype" covers vs. what a full port still needs. See `CONTEXT.md` for terminology and `docs/adr/` for why key technical choices were made.

## Phase 1 — Prototype (current scope)

Goal: prove the core Line/Ball/Target loop feels right in the browser before investing in the rest.

- Canvas2D renderer, hand-rolled circle/segment/box collision, `requestAnimationFrame` variable-timestep loop ([ADR 0001](docs/adr/0001-canvas2d-rendering.md), [ADR 0002](docs/adr/0002-hand-rolled-physics.md))
- Vite + vanilla TypeScript, no UI framework
- Pointer Events for unified mouse/touch input
- Fixed single canvas aspect ratio — no responsive/multi-aspect handling
- Original sprite PNGs reused directly from `rebounder-unity-reference/Assets/SpriteCollections/InGame/Textures/`
- 5 hand-authored levels, fixed-field JSON schema (`launchers`, `targets`, `obstacles`, `teleporters`, `colourChangers`, `lineCounts`): `Scene1`, `UseTheObstacle`, `FirstTeleporter`, `FirstColourChanger`, `FirstColouredLine` ([ADR 0003](docs/adr/0003-hand-authored-prototype-levels.md), superseded by [ADR 0007](docs/adr/0007-unity-scene-converter.md) — all 60 active levels are now converter output)
- No progression/save system — a bare level picker, no persisted state

## Phase 2 — Full conversion (spec'd, not yet built)

What's still required to call this a complete port of the original. Fully specified in [spec issue #38](https://github.com/philjhale/rebounder-ts/issues/38), collapsing wayfinder map [#23](https://github.com/philjhale/rebounder-ts/issues/23)'s resolved decisions — ready for `/to-tickets` → `/implement`.

1. **Unity scene → JSON converter.** *(Done.)* A one-off script (`scripts/convert-levels.ts`) parses all `.unity` YAML scenes under `rebounder-unity-reference/Assets/Scenes/Levels/`, extracting entity transforms, Teleporter pairings, and `LineCounts`, and regenerated the 5 Phase-1 levels in place, replacing the hand-authored versions. Added `angle` to `ObstacleData` for the rotated-obstacle instances found in source. Fails loudly per-scene rather than emitting a partial level. Decided: [ADR 0007](docs/adr/0007-unity-scene-converter.md), [issue #30](https://github.com/philjhale/rebounder-ts/issues/30); built in [issue #40](https://github.com/philjhale/rebounder-ts/issues/40).
2. **Aspect-ratio variants.** Some levels ship two scenes for different device aspect ratios (e.g. `Scene3`, `Scene5`, `DownAndAround`, `CrossCollision`, `GiantEye`, `TargetBounceCross`, `TeleBounce`, `DownAndAround2`). The converter (item 1) converts a single chosen variant (16:9) per level; a responsive viewport/scaling strategy and which variant to keep are still deferred past Phase 2.
3. **Full level curriculum.** *(Converter output done, item 1; progression gating still open.)* 60 active levels (`UpDraft`/`OverTheEdge` are commented out in source) in `LevelOrderHelper.cs`'s flat order, with strictly linear progression gating via a single monotonic "highest unlocked" pointer. Decided: [issue #31](https://github.com/philjhale/rebounder-ts/issues/31).
4. **Save/progress system.** Single JSON blob in `localStorage`, keyed by level `id`, with an in-memory fallback if `localStorage` is unavailable. Decided: [ADR 0008](docs/adr/0008-save-progress-system.md), [issue #33](https://github.com/philjhale/rebounder-ts/issues/33).
5. **Menu flow.** Title screen, How To Play, Pause menu, Level Complete, All Levels Complete, Credits, as a DOM overlay over the Canvas2D game world. Decided: [ADR 0006](docs/adr/0006-dom-overlay-for-ui-chrome.md), [issue #32](https://github.com/philjhale/rebounder-ts/issues/32).
6. **In-game HUD.** Per-colour remaining-line indicators (atlas sprites, top-left), pause button (top-right), reading `GameState.remainingLineCounts` live every frame. Decided: [issue #34](https://github.com/philjhale/rebounder-ts/issues/34).
7. **Sprite animation.** `ColourChanger` and `Teleporter` use frame-sequence sprite animation via a single pure `animatedSpriteName` render-layer helper; `TargetHit` stays a static colour swap (confirmed non-animated). Missing F2-F5/Spot/Stripe frame PNGs tracked separately in [issue #37](https://github.com/philjhale/rebounder-ts/issues/37). Decided: [issue #35](https://github.com/philjhale/rebounder-ts/issues/35).
8. **GUI atlas assets.** Audited: 11 named sub-sprites in `InGameGui.png`, covering title/back-buttons/pause icon/remaining-lines indicator. The DOM-overlay decision (item 5) dissolved the rest of the "needs custom art" gap — those panels are plain CSS, not new bitmap art. Decided: [issue #27](https://github.com/philjhale/rebounder-ts/issues/27).
9. **Audio.** None found anywhere in the source repo — the original ships silent. Nothing to port; flag separately if audio is wanted net-new.
10. **Fixed-timestep revisit.** Re-check collision tunneling once physics runs against all 60 levels' denser geometry, not just the 5 prototype levels ([ADR 0002](docs/adr/0002-hand-rolled-physics.md)). Not yet specified — needs the converter's real level data first.
11. **GameAnalytics.** Explicitly out of scope — drop entirely, not ported.

Also decided as part of this phase: rotated-obstacle rendering/collision, added by item 1's schema change ([ADR 0009](docs/adr/0009-rotated-obstacle-collision.md), [issue #36](https://github.com/philjhale/rebounder-ts/issues/36)).
