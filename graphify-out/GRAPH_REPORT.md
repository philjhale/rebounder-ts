# Graph Report - graphify-index  (2026-08-28)

## Corpus Check
- Corpus is ~38,155 words - fits in a single context window. You may not need a graph.

## Summary
- 358 nodes · 709 edges · 21 communities (15 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Collision Physics
- Unity Scene Conversion
- Level Picker UI
- Pointer Input Handling
- Canvas Rendering
- ESLint Tooling Config
- Architecture Decision Records
- TypeScript Project Config
- HUD Rendering
- Core Domain Types
- CI Pipeline
- Code Review Workflow
- Issue Tracker Workflow
- Stale Branch Edit Guard
- ESLint Autofix Hook
- Session Start Hook
- Triage Labels
- Worktree Workflow
- App Entry Point

## God Nodes (most connected - your core abstractions)
1. `showLevel()` - 16 edges
2. `compilerOptions` - 16 edges
3. `renderLevel()` - 15 edges
4. `Phase 2 - Full Conversion` - 13 edges
5. `extractColourChangers()` - 12 edges
6. `convertScene()` - 11 edges
7. `positionOf()` - 10 edges
8. `required()` - 10 edges
9. `updateGame()` - 10 edges
10. `Vec2` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Rebounder Project` --semantically_similar_to--> `CONTEXT.md Glossary`  [INFERRED] [semantically similar]
  README.md → CONTEXT.md
- `extractColourChangers()` --calls--> `rotatePoint()`  [EXTRACTED]
  scripts/convert-levels.ts → src/geometry.ts
- `CI Required Status Checks` --rationale_for--> `CI Workflow`  [EXTRACTED]
  docs/adr/0004-ci-required-status-checks.md → .github/workflows/ci.yml
- `Pull Requests (CLAUDE.md ref)` --references--> `code-reviewer subagent`  [EXTRACTED]
  CLAUDE.md → .claude/agents/code-reviewer.md
- `Pull Requests (CLAUDE.md ref)` --references--> `PR Template`  [EXTRACTED]
  CLAUDE.md → .github/PULL_REQUEST_TEMPLATE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Gate Pipeline** — docs_adr_0004_ci_required_status_checks_ci_required_status_checks, docs_adr_0005_eslint_setup_eslint_setup, github_workflows_ci_ci_workflow [INFERRED 0.85]
- **Canvas2D + DOM Rendering Layers** — docs_adr_0001_canvas2d_rendering_canvas2d_rendering, docs_adr_0006_dom_overlay_for_ui_chrome_dom_overlay, docs_adr_0009_rotated_obstacle_collision_rotated_obstacle_collision [INFERRED 0.75]
- **Level Data Lifecycle** — docs_adr_0003_hand_authored_prototype_levels_hand_authored_levels, docs_adr_0007_unity_scene_converter_unity_scene_converter, docs_adr_0008_save_progress_system_save_progress_system, roadmap_full_level_curriculum [INFERRED 0.85]

## Communities (21 total, 6 thin omitted)

### Community 0 - "Collision Physics"
Cohesion: 0.06
Nodes (61): circleVsBox(), circleVsCircle(), circleVsObstacle(), circleVsSegment(), clamp(), Collision, reflect(), rotatePoint() (+53 more)

### Community 1 - "Unity Scene Conversion"
Cohesion: 0.13
Nodes (40): ADR-0003, ADR-0007, COLOUR_BY_ENUM_VALUE, colourFromEnumValue(), convertScene(), CURRICULUM_ORDER, EXCLUDED_LEVELS, extractColourChangers() (+32 more)

### Community 2 - "Level Picker UI"
Cohesion: 0.10
Nodes (28): ADR-0008, LevelPickerOptions, renderLevelPicker(), ADR-0006, levels, VALID_COLOURS, computeNextPointer(), getFrontierPointer() (+20 more)

### Community 3 - "Pointer Input Handling"
Cohesion: 0.11
Nodes (30): required(), attachPointerInput(), handlePointerDown(), handlePointerMove(), handlePointerUp(), toWorld(), app, goTo() (+22 more)

### Community 4 - "Canvas Rendering"
Cohesion: 0.12
Nodes (30): drawColourChanger(), drawImageCentred(), drawLauncher(), drawLine(), drawObstacle(), drawSprite(), drawTargetHits(), drawTiledSprite() (+22 more)

### Community 5 - "ESLint Tooling Config"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, devDependencies, eslint, @eslint/js, @types/node, typescript, typescript-eslint (+19 more)

### Community 6 - "Architecture Decision Records"
Cohesion: 0.10
Nodes (27): Domain Docs (CLAUDE.md ref), CONTEXT.md Glossary, Canvas2D Rendering, Hand-rolled Physics, Hand-authored Prototype Levels, DOM Overlay for UI Chrome, Unity Scene Converter, Save/Progress System (+19 more)

### Community 7 - "TypeScript Project Config"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, scripts, src, compilerOptions, allowImportingTsExtensions, isolatedModules (+14 more)

### Community 8 - "HUD Rendering"
Cohesion: 0.14
Nodes (19): Hud, HUD_COLOURS, HudOptions, isSlotEmpty(), layoutRemainingSlots(), PAUSE_ICON_PATH, RemainingSlot, renderHud() (+11 more)

### Community 9 - "Core Domain Types"
Cohesion: 0.27
Nodes (13): Ball, Colour, ColourChanger, Launcher, Level, Line, LineCounts, LineHandle (+5 more)

### Community 10 - "CI Pipeline"
Cohesion: 0.33
Nodes (7): CI Required Status Checks, ESLint Setup, build job, CI Workflow, lint job, test job, typecheck job

### Community 11 - "Code Review Workflow"
Cohesion: 0.40
Nodes (5): code-review skill, code-reviewer subagent, simplify skill, Pull Requests (CLAUDE.md ref), PR Template

### Community 12 - "Issue Tracker Workflow"
Cohesion: 0.67
Nodes (3): Issue Tracker (CLAUDE.md ref), GitHub Issue Tracker Workflow, Wayfinder

## Knowledge Gaps
- **105 isolated node(s):** `block-stale-branch-edit.sh script`, `eslint-fix.sh script`, `session-start-main-switch.sh script`, `name`, `private` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Level` connect `Level Picker UI` to `Collision Physics`, `Unity Scene Conversion`, `Canvas Rendering`, `HUD Rendering`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `LineCounts` connect `HUD Rendering` to `Collision Physics`, `Unity Scene Conversion`, `Level Picker UI`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `showLevel()` connect `Pointer Input Handling` to `HUD Rendering`, `Collision Physics`, `Canvas Rendering`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `showLevel()` (e.g. with `closePause()` and `handleKeydown()`) actually correct?**
  _`showLevel()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `block-stale-branch-edit.sh script`, `eslint-fix.sh script`, `session-start-main-switch.sh script` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Collision Physics` be split into smaller, more focused modules?**
  _Cohesion score 0.0601404741000878 - nodes in this community are weakly interconnected._
- **Should `Unity Scene Conversion` be split into smaller, more focused modules?**
  _Cohesion score 0.12579281183932348 - nodes in this community are weakly interconnected._