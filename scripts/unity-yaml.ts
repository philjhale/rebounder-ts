// Pure, side-effect-free helpers for parsing Unity's `.unity` scene YAML.
//
// The format actually used by the reference project is narrow (see ADR 0007):
// a flat sequence of `--- !u!<type> &<fileID>` documents, each containing a
// 2-space-indented set of fields. We hand-roll just enough of a parser for
// that shape rather than pulling in a general-purpose YAML/Unity library.

export interface UnityBlock {
  /** Unity's built-in class ID, e.g. "1" (GameObject), "4" (Transform), "114" (MonoBehaviour). */
  type: string;
  /** The `&fileID` anchor for this document, used to cross-reference from other blocks. */
  id: string;
  body: string;
}

/**
 * Unity's YAML emitter wraps a single field's value onto a continuation line
 * when the line would otherwise be too long (this happens for fields like
 * `m_Script` and `m_PrefabParentObject`, whose object-reference value has a
 * long guid). The continuation is indented 4 spaces, one level deeper than
 * the 2-space field indent used everywhere in these files, and is never a
 * list item (list items are themselves 2-space `- `). Joining any such line
 * onto its predecessor recovers the single logical field=value line.
 *
 * This is deliberately naive about *other* legitimately-nested 4-space
 * blocks (e.g. `m_LightmapEditorSettings`'s child fields) - it will glom
 * those together too - but nothing in this converter ever reads those
 * fields, so that's harmless.
 */
function unwrapContinuationLines(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const isContinuation = /^ {4}\S/.test(line) && !/^ {4}- /.test(line);
    if (isContinuation && out.length > 0) {
      out[out.length - 1] = `${out[out.length - 1]} ${line.trim()}`;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** Splits a whole `.unity` file's text into its top-level documents, keyed by fileID. */
export function parseUnityBlocks(sceneText: string): Map<string, UnityBlock> {
  const text = unwrapContinuationLines(sceneText);
  const anchorPattern = /^--- !u!(\d+) &(\d+)\n/gm;
  const matches = [...text.matchAll(anchorPattern)];

  const blocks = new Map<string, UnityBlock>();
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const type = match[1];
    const id = match[2];
    const bodyStart = match.index + match[0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
    blocks.set(id, { type, id, body: text.slice(bodyStart, bodyEnd) });
  }
  return blocks;
}

/**
 * The original z-rotation-only convention: launcher (and obstacle) angle is
 * stored as a quaternion but only ever rotates around Z, so the scalar angle
 * is recoverable as `2 * atan2(z, w)`. Result is degrees, normalized to
 * (-180, 180], and rounded to avoid float noise from the source data
 * (e.g. `45.0000037524848` -> `45`).
 */
export function quaternionToAngleDegrees(z: number, w: number): number {
  let degrees = (2 * Math.atan2(z, w) * 180) / Math.PI;
  while (degrees > 180) degrees -= 360;
  while (degrees <= -180) degrees += 360;
  return Math.round(degrees * 100) / 100;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Extracts `<field>: {x: .., y: .., ...}` from a block body. Throws if the field is absent. */
export function parseVec2Field(body: string, field: string): Vec2 {
  const pattern = new RegExp(`^ {2}${field}: \\{x: (-?[\\d.]+(?:e-?\\d+)?), y: (-?[\\d.]+(?:e-?\\d+)?)`, 'm');
  const match = pattern.exec(body);
  if (!match) {
    throw new Error(`Expected field "${field}" (Vec2) not found`);
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** Extracts the z/w components of a quaternion field, e.g. `m_LocalRotation: {x: 0, y: 0, z: .38, w: .92}`. */
export function parseQuaternionZW(body: string, field: string): { z: number; w: number } {
  const pattern = new RegExp(
    `^ {2}${field}: \\{x: -?[\\d.]+(?:e-?\\d+)?, y: -?[\\d.]+(?:e-?\\d+)?, z: (-?[\\d.]+(?:e-?\\d+)?), w: (-?[\\d.]+(?:e-?\\d+)?)`,
    'm',
  );
  const match = pattern.exec(body);
  if (!match) {
    throw new Error(`Expected field "${field}" (quaternion) not found`);
  }
  return { z: Number(match[1]), w: Number(match[2]) };
}

/** Extracts a bare numeric field, e.g. `  Colour: 3` or `  StartingOrangeLines: 1`. */
export function parseNumberField(body: string, field: string): number {
  const pattern = new RegExp(`^ {2}${field}: (-?[\\d.]+)\\s*$`, 'm');
  const match = pattern.exec(body);
  if (!match) {
    throw new Error(`Expected field "${field}" (number) not found`);
  }
  return Number(match[1]);
}

/**
 * Extracts the `x`/`y` components of a `meshColliderPositions` point-list field, e.g.:
 * ```
 *   meshColliderPositions:
 *   - {x: 0, y: .03125, z: -6}
 *   - {x: -.5, y: -.5, z: -6}
 * ```
 * Used as a fallback for the handful of "Obstacle"-tagged pieces (diagonal corner
 * pieces used to build curved walls) that use an irregular MeshCollider instead of
 * a BoxCollider - see `extractObstacles` in convert-levels.ts for how this is used.
 */
export function parseMeshColliderPositionsXY(body: string): Vec2[] {
  const section = /^ {2}meshColliderPositions:\n((?: {2}- \{x: [^\n]+\n)*)/m.exec(body);
  if (!section) return [];
  const pointPattern = /- \{x: (-?[\d.]+(?:e-?\d+)?), y: (-?[\d.]+(?:e-?\d+)?)/g;
  return [...section[1].matchAll(pointPattern)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

/** An object-reference field, e.g. `OtherTeleporter: {fileID: 123}` or `{fileID: 123, guid: abc, type: 2}`. */
export interface ObjectRef {
  fileID: string;
  guid?: string;
}

/** Extracts an object-reference field. Handles both the local (fileID-only) and cross-prefab (fileID+guid) shapes. */
export function parseObjectRefField(body: string, field: string): ObjectRef {
  const pattern = new RegExp(`^ {2}${field}: \\{fileID: (\\d+)(?:, guid: ([0-9a-f]+))?(?:, type: \\d+)?\\}`, 'm');
  const match = pattern.exec(body);
  if (!match) {
    throw new Error(`Expected field "${field}" (object ref) not found`);
  }
  return { fileID: match[1], guid: match[2] };
}

/** Converts PascalCase Unity scene/level names to the kebab-case ids used by this project (`UseTheObstacle` -> `use-the-obstacle`). */
export function slugify(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

export interface TeleporterRef {
  /** This teleporter's own identity: its Teleporter MonoBehaviour's fileID within the scene. */
  id: string;
  /** This teleporter's own prefab-instance guid, if it's a prefab instance (shape B pairing). */
  ownGuid?: string;
  /** The raw `OtherTeleporter` object-reference field. */
  otherRef: ObjectRef;
}

/**
 * Resolves teleporter pairing from the raw `OtherTeleporter` object references.
 *
 * There are two serialization shapes seen in the source scenes:
 *  - local: `{fileID: X}` - X is the other teleporter's own MonoBehaviour fileID, in this same file.
 *  - cross-prefab: `{fileID: X, guid: Y}` - Y is the other teleporter's own prefab-instance guid
 *    (its GameObject's `m_PrefabParentObject.guid`), not a fileID in this file at all.
 *
 * Returns a map from each teleporter's id to a pairId shared by exactly one other teleporter.
 * Throws if any reference doesn't resolve to exactly one, mutual partner.
 */
export function resolveTeleporterPairs(teleporters: TeleporterRef[]): Map<string, string> {
  const byId = new Map(teleporters.map((t) => [t.id, t]));

  function findPartner(t: TeleporterRef): TeleporterRef {
    const candidates = teleporters.filter((other) => {
      if (other.id === t.id) return false;
      if (t.otherRef.guid) return other.ownGuid === t.otherRef.guid;
      return other.id === t.otherRef.fileID;
    });
    if (candidates.length !== 1) {
      throw new Error(
        `Teleporter ${t.id}: expected exactly one partner matching OtherTeleporter ref, found ${String(candidates.length)}`,
      );
    }
    return candidates[0];
  }

  const pairIds = new Map<string, string>();
  for (const t of teleporters) {
    const partner = findPartner(t);
    const back = findPartner(partner);
    if (back.id !== t.id) {
      throw new Error(`Teleporter ${t.id} and ${partner.id} do not mutually reference each other`);
    }
    const pairId = [t.id, partner.id].sort().join('|');
    pairIds.set(t.id, pairId);
  }

  if (!teleporters.every((t) => byId.has(t.id))) {
    throw new Error('Internal error resolving teleporter pairs');
  }

  return pairIds;
}
