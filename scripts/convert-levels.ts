#!/usr/bin/env node
// One-off migration: converts every active level scene from the Unity
// reference project into this project's Level JSON format, and regenerates
// src/levels/index.ts in curriculum order. See docs/adr/0007-unity-scene-converter.md.
//
// Not wired into the build - run manually, on demand:
//   node scripts/convert-levels.ts <path-to-rebounder-unity-reference>
// (defaults to ../rebounder-unity-reference relative to the repo root, which
// is where it lives for a normal, non-worktree checkout).
//
// Fails loudly: throws and stops on the first scene it can't fully parse,
// rather than emitting a partial or best-effort level.

import { readdirSync, readFileSync, writeFileSync, statSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  parseMeshColliderPositionsXY,
  parseNumberField,
  parseObjectRefField,
  parseQuaternionZW,
  parseUnityBlocks,
  parseVec2Field,
  quaternionToAngleDegrees,
  resolveTeleporterPairs,
  slugify,
  type ObjectRef,
  type TeleporterRef,
  type UnityBlock,
} from './unity-yaml.ts';
import type {
  ColourChangerData,
  Colour,
  LauncherData,
  Level,
  LineCounts,
  ObstacleData,
  TargetData,
  TeleporterData,
} from '../src/types.ts';

// --- Script GUIDs (Assets/Scripts/Game/WorldObjects/*.cs.meta) -------------
// Target/Teleporter/ColourChanger have no distinguishing Unity tag, so they're
// identified by the guid of their attached MonoBehaviour script instead.
const LAUNCHER_SCRIPT_GUID = '5a97b728e1aa14041838abce769194df';
const TARGET_SCRIPT_GUID = '9a92faf0c6e364c61b9d908a2139bc96';
const TELEPORTER_SCRIPT_GUID = '09bb2e43cc59647e78601805eef81e7f';
const COLOUR_CHANGER_SCRIPT_GUID = '2b78549d4f09646b7abc0f9847410481';
const LINE_COUNTS_SCRIPT_GUID = 'e664e9085e77e4881a8447657553e9b4';

// Assets/Scripts/Game/Enums/Colour.cs
const COLOUR_BY_ENUM_VALUE: Colour[] = ['Purple', 'Green', 'Blue', 'Orange', 'None'];

function colourFromEnumValue(value: number): Colour {
  if (!Number.isInteger(value) || value < 0 || value >= COLOUR_BY_ENUM_VALUE.length) {
    throw new Error(`Unrecognized Colour enum value: ${String(value)}`);
  }
  return COLOUR_BY_ENUM_VALUE[value];
}

// --- Curriculum order (Assets/Scripts/Game/Helpers/LevelOrderHelper.cs) ----
// Mirrors LevelOrderHelper.GetLevels() exactly, in order, including the two
// levels left commented out there ("Not using just now").
const CURRICULUM_ORDER = [
  'Scene1',
  'Scene2a',
  'Scene2',
  'Scene4',
  'TheSpiral',
  'Scene3',
  'Scene5',
  'ThreeVerticalLines',
  'UseTheObstacle',
  'FillInTheBlanks',
  'FirstTwoTarget',
  'SecondTwoTarget',
  'Diagonal',
  'CrossingStreams',
  'LeftAndDown',
  'FirstTeleporter',
  'OneUpOneDown',
  'OneDownOneUp',
  'OtherSideOfTheWall',
  'BackDoor',
  'FirstColourChanger',
  'HorizontalColourTunnel',
  'ColourTunnel',
  'AvoidTheALine',
  'ColourCross',
  'FirstColouredLine',
  'SecondColouredLine',
  'Opposites',
  'TwoColouredLines',
  'ColouredLineFive',
  'DownUpDownUp1',
  'TwoUprights',
  'DownAndAround',
  'BackDoor2',
  'DownUpDownUp2',
  'UseTheBalls',
  'CrossCollision',
  'LargeGap',
  'ThreeVerticalColouredLines',
  'GiantEye',
  'LevelColumns',
  'FillTheGap',
  'Splits',
  'AwkwardAngle',
  'TheX',
  'RandomColumns',
  'InTheCorner',
  'ThroughTheGap',
  'TwoGaps',
  'UseTheObstacle2',
  'CrossOver',
  'BounceTarget',
  'TargetBounceCross',
  'ThreeDiagonalLines',
  'ParallelSlant',
  'ThreeShootersUp',
  'TeleBounce',
  'Roundabout',
  'DownAndAround2',
  'SmallT',
] as const;

// Levels commented out in LevelOrderHelper.cs ("Not using just now") - excluded.
const EXCLUDED_LEVELS = ['UpDraft', 'OverTheEdge'];

// Levels with multiple aspect-ratio scene variants (SetRequiresAspectRatioSpecificScenes()
// in LevelOrderHelper.cs). We convert a single variant per level; 16:9 is chosen as the
// modern/default aspect ratio. Multi-aspect handling is deferred (see ROADMAP.md).
const PREFERRED_ASPECT_SUFFIX = '-16by9';

// --- Filesystem: locate the source scene for each curriculum level ---------

function findUnityFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...findUnityFiles(fullPath));
    } else if (entry.endsWith('.unity')) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveScenePath(levelName: string, filesByBasename: Map<string, string>): string {
  const exact = filesByBasename.get(levelName);
  if (exact) return exact;

  const aspectVariant = filesByBasename.get(`${levelName}${PREFERRED_ASPECT_SUFFIX}`);
  if (aspectVariant) return aspectVariant;

  throw new Error(`No source scene found for curriculum level "${levelName}"`);
}

// --- Entity extraction -------------------------------------------------

interface GameObjectInfo {
  id: string;
  tag: string;
  name: string;
  /** class-id -> fileIDs of this GameObject's own components (e.g. "4" -> Transform fileID). */
  components: Map<string, string[]>;
}

function parseComponentList(body: string): Map<string, string[]> {
  const componentsSection = /m_Component:\n((?: {2}- \d+: \{fileID: \d+\}\n)*)/.exec(body);
  const components = new Map<string, string[]>();
  if (!componentsSection) return components;
  const entryPattern = /- (\d+): \{fileID: (\d+)\}/g;
  for (const entry of componentsSection[1].matchAll(entryPattern)) {
    const [, classId, fileId] = entry;
    const existing = components.get(classId) ?? [];
    existing.push(fileId);
    components.set(classId, existing);
  }
  return components;
}

function parseGameObjects(blocks: Map<string, UnityBlock>): Map<string, GameObjectInfo> {
  const gameObjects = new Map<string, GameObjectInfo>();
  for (const block of blocks.values()) {
    if (block.type !== '1') continue;
    const tagMatch = /^ {2}m_TagString: (\S+)/m.exec(block.body);
    const nameMatch = /^ {2}m_Name: ?(.*)$/m.exec(block.body);
    if (!tagMatch || !nameMatch) {
      throw new Error(`GameObject ${block.id} is missing m_TagString or m_Name`);
    }
    gameObjects.set(block.id, {
      id: block.id,
      tag: tagMatch[1],
      name: nameMatch[1].trim(),
      components: parseComponentList(block.body),
    });
  }
  return gameObjects;
}

function requireComponent(go: GameObjectInfo, classId: string): string {
  const ids = go.components.get(classId);
  if (!ids || ids.length === 0) {
    throw new Error(`GameObject "${go.name}" (${go.id}) has no component of class ${classId}`);
  }
  if (ids.length > 1) {
    throw new Error(`GameObject "${go.name}" (${go.id}) has multiple components of class ${classId}`);
  }
  return ids[0];
}

function requireBlock(blocks: Map<string, UnityBlock>, id: string, context: string): UnityBlock {
  const block = blocks.get(id);
  if (!block) {
    throw new Error(`Expected block ${id} (${context}) not found`);
  }
  return block;
}

function scriptGuidOf(block: UnityBlock): string | undefined {
  const match = /^ {2}m_Script: \{fileID: \d+, guid: ([0-9a-f]+)/m.exec(block.body);
  return match?.[1];
}

/** Every MonoBehaviour (class 114) block whose attached script matches the given guid. */
function findMonoBehavioursByScriptGuid(blocks: Map<string, UnityBlock>, scriptGuid: string): UnityBlock[] {
  const matches: UnityBlock[] = [];
  for (const block of blocks.values()) {
    if (block.type !== '114') continue;
    if (scriptGuidOf(block) === scriptGuid) matches.push(block);
  }
  return matches;
}

function ownerGameObject(monoBehaviour: UnityBlock, gameObjects: Map<string, GameObjectInfo>): GameObjectInfo {
  const ref = parseObjectRefField(monoBehaviour.body, 'm_GameObject');
  const go = gameObjects.get(ref.fileID);
  if (!go) {
    throw new Error(`MonoBehaviour ${monoBehaviour.id} references missing GameObject ${ref.fileID}`);
  }
  return go;
}

function positionOf(
  go: GameObjectInfo,
  blocks: Map<string, UnityBlock>,
): { position: { x: number; y: number }; z: number; w: number } {
  const transformId = requireComponent(go, '4');
  const transform = requireBlock(blocks, transformId, `Transform of "${go.name}"`);
  const position = parseVec2Field(transform.body, 'm_LocalPosition');
  const { z, w } = parseQuaternionZW(transform.body, 'm_LocalRotation');
  return { position, z, w };
}

// --- Per-entity-kind extraction --------------------------------------------

function extractLaunchers(
  gameObjects: Map<string, GameObjectInfo>,
  blocks: Map<string, UnityBlock>,
  sceneName: string,
): LauncherData[] {
  const launchers: LauncherData[] = [];
  for (const go of gameObjects.values()) {
    if (go.tag !== 'Shooter') continue;
    const monoBehaviourIds = go.components.get('114') ?? [];
    const launcherScript = monoBehaviourIds
      .map((id) => requireBlock(blocks, id, `MonoBehaviour of "${go.name}"`))
      .find((block) => scriptGuidOf(block) === LAUNCHER_SCRIPT_GUID);
    if (!launcherScript) continue; // e.g. "LauncherInner", a decorative Shooter-tagged child.

    const { position, z, w } = positionOf(go, blocks);
    const colourValue = parseNumberField(launcherScript.body, 'Colour');
    const enabledValue = parseNumberField(launcherScript.body, 'Enabled');
    launchers.push({
      position,
      colour: colourFromEnumValue(colourValue),
      enabled: enabledValue !== 0,
      angle: quaternionToAngleDegrees(z, w),
    });
  }
  if (launchers.length === 0) {
    throw new Error(`Scene "${sceneName}": found no launchers`);
  }
  return launchers;
}

/**
 * Most "Obstacle"-tagged pieces are simple rectangles with a BoxCollider (class 65),
 * whose m_Size gives width/height directly. A handful of pieces (diagonal corner
 * walls used to build curved layouts, e.g. TheSpiral, Scene2a, SmallT) instead use
 * an irregular MeshCollider (class 64) with no simple width/height. For those we
 * fall back to the axis-aligned bounding box of the shape's meshColliderPositions -
 * an approximation, but faithful polygon collision is out of scope for this ticket
 * (rendering/collision consumption of obstacle shape is #43).
 *
 * A few "Obstacle"-tagged GameObjects are pure grouping nodes (a Transform only, no
 * renderer or collider at all) - parents of the real pieces above. Those are skipped.
 * Note this means a rotation on such a parent node isn't composed into its children's
 * angle (each MeshCollider piece here uses an identity local rotation and relies on
 * its parent for its world orientation) - out of scope for the same reason as above:
 * this converter reads each GameObject's own local transform, not the full scene
 * hierarchy. In every case observed in the source data, that parent rotation is a
 * multiple of 90 degrees and the piece's bounding box is square, so this doesn't
 * affect the converted width/height either way - only, potentially, the angle
 * ticket #43 would eventually use for rendering that specific shape.
 */
function extractObstacles(gameObjects: Map<string, GameObjectInfo>, blocks: Map<string, UnityBlock>): ObstacleData[] {
  const obstacles: ObstacleData[] = [];
  for (const go of gameObjects.values()) {
    if (go.tag !== 'Obstacle') continue;
    const { position, z, w } = positionOf(go, blocks);
    const angle = quaternionToAngleDegrees(z, w);

    const boxColliderIds = go.components.get('65') ?? [];
    if (boxColliderIds.length === 1) {
      const boxCollider = requireBlock(blocks, boxColliderIds[0], `BoxCollider of "${go.name}"`);
      const size = parseVec2Field(boxCollider.body, 'm_Size');
      obstacles.push({ position, width: size.x, height: size.y, angle });
      continue;
    }

    const meshColliderIds = go.components.get('64') ?? [];
    if (meshColliderIds.length === 1) {
      const monoBehaviourIds = go.components.get('114') ?? [];
      const spriteScript = monoBehaviourIds
        .map((id) => requireBlock(blocks, id, `MonoBehaviour of "${go.name}"`))
        .find((block) => /^ {2}meshColliderPositions:/m.test(block.body));
      if (!spriteScript) {
        throw new Error(`Obstacle "${go.name}" (${go.id}) has a MeshCollider but no meshColliderPositions data`);
      }
      const points = parseMeshColliderPositionsXY(spriteScript.body);
      if (points.length === 0) {
        throw new Error(`Obstacle "${go.name}" (${go.id}): meshColliderPositions is empty`);
      }
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = maxX - minX;
      const height = maxY - minY;
      if (width <= 0 || height <= 0) {
        throw new Error(`Obstacle "${go.name}" (${go.id}): degenerate bounding box from meshColliderPositions`);
      }
      obstacles.push({
        position: { x: position.x + (minX + maxX) / 2, y: position.y + (minY + maxY) / 2 },
        width,
        height,
        angle,
      });
      continue;
    }

    if (boxColliderIds.length === 0 && meshColliderIds.length === 0) {
      // Pure grouping node - no collider, not a real obstacle instance.
      continue;
    }

    throw new Error(
      `Obstacle "${go.name}" (${go.id}) has an unrecognized collider shape (BoxColliders: ${String(
        boxColliderIds.length,
      )}, MeshColliders: ${String(meshColliderIds.length)})`,
    );
  }
  return obstacles;
}

function extractTargets(
  blocks: Map<string, UnityBlock>,
  gameObjects: Map<string, GameObjectInfo>,
  sceneName: string,
): TargetData[] {
  const targets: TargetData[] = [];
  for (const script of findMonoBehavioursByScriptGuid(blocks, TARGET_SCRIPT_GUID)) {
    const go = ownerGameObject(script, gameObjects);
    const { position } = positionOf(go, blocks);
    const colourValue = parseNumberField(script.body, 'Colour');
    targets.push({ position, colour: colourFromEnumValue(colourValue) });
  }
  if (targets.length === 0) {
    throw new Error(`Scene "${sceneName}": found no targets`);
  }
  return targets;
}

function extractColourChangers(blocks: Map<string, UnityBlock>, gameObjects: Map<string, GameObjectInfo>): ColourChangerData[] {
  const colourChangers: ColourChangerData[] = [];
  for (const script of findMonoBehavioursByScriptGuid(blocks, COLOUR_CHANGER_SCRIPT_GUID)) {
    const go = ownerGameObject(script, gameObjects);
    const { position } = positionOf(go, blocks);
    const colourValue = parseNumberField(script.body, 'Colour');
    colourChangers.push({ position, colour: colourFromEnumValue(colourValue) });
  }
  return colourChangers;
}

function extractTeleporters(blocks: Map<string, UnityBlock>, gameObjects: Map<string, GameObjectInfo>): TeleporterData[] {
  const scripts = findMonoBehavioursByScriptGuid(blocks, TELEPORTER_SCRIPT_GUID);
  if (scripts.length === 0) return [];

  const refs: TeleporterRef[] = scripts.map((script) => {
    const go = ownerGameObject(script, gameObjects);
    const prefabParent = /^ {2}m_PrefabParentObject: \{fileID: \d+(?:, guid: ([0-9a-f]+))?/m.exec(
      requireBlock(blocks, go.id, `GameObject of teleporter ${script.id}`).body,
    );
    const otherRef: ObjectRef = parseObjectRefField(script.body, 'OtherTeleporter');
    return { id: script.id, ownGuid: prefabParent?.[1], otherRef };
  });

  const pairIds = resolveTeleporterPairs(refs);

  return scripts.map((script) => {
    const go = ownerGameObject(script, gameObjects);
    const { position } = positionOf(go, blocks);
    const pairId = pairIds.get(script.id);
    if (!pairId) {
      throw new Error(`Teleporter ${script.id}: no pairId resolved`);
    }
    return { position, pairId };
  });
}

function extractLineCounts(blocks: Map<string, UnityBlock>, sceneName: string): LineCounts {
  const scripts = findMonoBehavioursByScriptGuid(blocks, LINE_COUNTS_SCRIPT_GUID);
  if (scripts.length !== 1) {
    throw new Error(
      `Scene "${sceneName}": expected exactly one LineCounts component, found ${String(scripts.length)}`,
    );
  }
  const [script] = scripts;
  return {
    Orange: parseNumberField(script.body, 'StartingOrangeLines'),
    Blue: parseNumberField(script.body, 'StartingBlueLines'),
    Green: parseNumberField(script.body, 'StartingGreenLines'),
    Purple: parseNumberField(script.body, 'StartingPurpleLines'),
  };
}

// --- Scene -> Level ----------------------------------------------------

function convertScene(sceneText: string, levelName: string): Level {
  const blocks = parseUnityBlocks(sceneText);
  const gameObjects = parseGameObjects(blocks);

  return {
    id: slugify(levelName),
    name: levelName,
    launchers: extractLaunchers(gameObjects, blocks, levelName),
    targets: extractTargets(blocks, gameObjects, levelName),
    obstacles: extractObstacles(gameObjects, blocks),
    teleporters: extractTeleporters(blocks, gameObjects),
    colourChangers: extractColourChangers(blocks, gameObjects),
    lineCounts: extractLineCounts(blocks, levelName),
  };
}

// --- Orchestration -------------------------------------------------------

function main(): void {
  const repoRoot = path.resolve(import.meta.dirname, '..');
  const referenceDir = path.resolve(
    process.argv[2] ?? path.join(repoRoot, '..', 'rebounder-unity-reference'),
  );
  const scenesDir = path.join(referenceDir, 'Assets', 'Scenes', 'Levels');
  if (!existsSync(scenesDir)) {
    throw new Error(`Reference scenes directory not found: ${scenesDir}`);
  }

  const unityFiles = findUnityFiles(scenesDir);
  const filesByBasename = new Map<string, string>();
  for (const filePath of unityFiles) {
    filesByBasename.set(path.basename(filePath, '.unity'), filePath);
  }

  for (const excluded of EXCLUDED_LEVELS) {
    if (CURRICULUM_ORDER.includes(excluded as (typeof CURRICULUM_ORDER)[number])) {
      throw new Error(`"${excluded}" is both excluded and in CURRICULUM_ORDER - fix the script`);
    }
  }

  const levels: Level[] = [];
  const sceneChoices: { level: string; scene: string }[] = [];
  for (const levelName of CURRICULUM_ORDER) {
    const scenePath = resolveScenePath(levelName, filesByBasename);
    sceneChoices.push({ level: levelName, scene: path.relative(scenesDir, scenePath) });
    const sceneText = readFileSync(scenePath, 'utf-8');
    let level: Level;
    try {
      level = convertScene(sceneText, levelName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to convert scene "${levelName}" (${scenePath}): ${message}`, { cause: err });
    }
    levels.push(level);
  }

  if (levels.length !== 60) {
    throw new Error(`Expected 60 active curriculum levels, converted ${String(levels.length)}`);
  }

  const ids = levels.map((l) => l.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Converted levels have duplicate ids');
  }

  const levelsDir = path.join(repoRoot, 'src', 'levels');

  // Remove the ADR-0003 hand-authored level JSON files this converter replaces.
  const handAuthoredFiles = [
    'scene1.json',
    'use-the-obstacle.json',
    'first-teleporter.json',
    'first-colour-changer.json',
    'first-coloured-line.json',
  ];
  for (const file of handAuthoredFiles) {
    const filePath = path.join(levelsDir, file);
    if (existsSync(filePath)) rmSync(filePath);
  }

  // Write one JSON file per level, and regenerate the barrel index.ts.
  const importLines: string[] = [];
  const arrayEntries: string[] = [];
  for (const level of levels) {
    const fileName = `${level.id}.json`;
    writeFileSync(path.join(levelsDir, fileName), `${JSON.stringify(level, null, 2)}\n`);
    const varName = toCamelCase(level.id);
    importLines.push(`import ${varName} from './${level.id}.json';`);
    arrayEntries.push(varName);
  }

  const indexContent = `import type { Level } from '../types';
${importLines.join('\n')}

export const levels: Level[] = [
${arrayEntries.map((name) => `  ${name},`).join('\n')}
] as Level[];
`;
  writeFileSync(path.join(levelsDir, 'index.ts'), indexContent);

  console.log(`Converted ${String(levels.length)} levels.`);
  const aspectVariantChoices = sceneChoices.filter((c) => c.scene.includes(PREFERRED_ASPECT_SUFFIX));
  console.log(
    `Aspect-ratio variant chosen for ${String(aspectVariantChoices.length)} multi-variant levels (suffix "${PREFERRED_ASPECT_SUFFIX}"):`,
  );
  for (const choice of aspectVariantChoices) {
    console.log(`  ${choice.level} -> ${choice.scene}`);
  }
}

function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

main();
