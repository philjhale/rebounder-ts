import { describe, expect, it } from 'vitest';
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
  type TeleporterRef,
} from './unity-yaml';

describe('quaternionToAngleDegrees', () => {
  it('is 0 for the identity quaternion', () => {
    expect(quaternionToAngleDegrees(0, 1)).toBe(0);
  });

  it('recovers a 45 degree rotation, ignoring float noise', () => {
    expect(quaternionToAngleDegrees(0.382683456, 0.923879504)).toBe(45);
  });

  it('recovers a -45 degree rotation', () => {
    expect(quaternionToAngleDegrees(-0.382683456, 0.923879504)).toBe(-45);
  });

  it('recovers a 90 degree rotation', () => {
    expect(quaternionToAngleDegrees(0.707106829, 0.707106709)).toBe(90);
  });

  it('normalizes a 180 degree rotation to within (-180, 180]', () => {
    expect(quaternionToAngleDegrees(1, 0)).toBe(180);
  });

  it('recovers a 135 degree rotation', () => {
    expect(quaternionToAngleDegrees(0.923879564, 0.382683307)).toBe(135);
  });
});

describe('parseUnityBlocks', () => {
  const fixture = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &100
GameObject:
  m_Name: Foo
  m_TagString: Untagged
--- !u!4 &101
Transform:
  m_LocalPosition: {x: 1, y: 2, z: 0}
`;

  it('splits the file into blocks keyed by fileID, with type and body', () => {
    const blocks = parseUnityBlocks(fixture);
    expect([...blocks.keys()].sort()).toEqual(['100', '101']);
    expect(blocks.get('100')?.type).toBe('1');
    expect(blocks.get('100')?.body).toContain('m_Name: Foo');
    expect(blocks.get('101')?.type).toBe('4');
    expect(blocks.get('101')?.body).toContain('m_LocalPosition');
  });

  it('joins a wrapped continuation line back onto its field', () => {
    const wrapped = `--- !u!114 &200
MonoBehaviour:
  m_PrefabParentObject: {fileID: 11400008, guid: c63be9580527444ec99c3a36d1f0eb32,
    type: 2}
  Colour: 3
`;
    const blocks = parseUnityBlocks(wrapped);
    const block = blocks.get('200');
    expect(block).toBeDefined();
    const ref = parseObjectRefField(block?.body ?? '', 'm_PrefabParentObject');
    expect(ref).toEqual({ fileID: '11400008', guid: 'c63be9580527444ec99c3a36d1f0eb32' });
  });
});

describe('parseVec2Field / parseQuaternionZW / parseNumberField / parseObjectRefField', () => {
  const body = `  m_LocalPosition: {x: -9, y: -9, z: 0}
  m_LocalRotation: {x: 0, y: 0, z: .382683456, w: .923879504}
  Colour: 3
  OtherTeleporter: {fileID: 1589520149}
`;

  it('parses a Vec2 field', () => {
    expect(parseVec2Field(body, 'm_LocalPosition')).toEqual({ x: -9, y: -9 });
  });

  it('parses a quaternion field down to z/w', () => {
    expect(parseQuaternionZW(body, 'm_LocalRotation')).toEqual({ z: 0.382683456, w: 0.923879504 });
  });

  it('parses a bare number field', () => {
    expect(parseNumberField(body, 'Colour')).toBe(3);
  });

  it('parses a local (fileID-only) object ref', () => {
    expect(parseObjectRefField(body, 'OtherTeleporter')).toEqual({ fileID: '1589520149', guid: undefined });
  });

  it('throws when the field is missing', () => {
    expect(() => parseVec2Field(body, 'NoSuchField')).toThrow();
  });
});

describe('parseMeshColliderPositionsXY', () => {
  it('extracts x/y from each point in a meshColliderPositions list', () => {
    const body = `  meshColliderPositions:
  - {x: 0, y: .03125, z: -6}
  - {x: -.5, y: -.5, z: -6}
  - {x: .5, y: .5, z: 6}
  meshColliderMesh: {fileID: 123}
`;
    expect(parseMeshColliderPositionsXY(body)).toEqual([
      { x: 0, y: 0.03125 },
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
    ]);
  });

  it('returns an empty array when the field is absent', () => {
    expect(parseMeshColliderPositionsXY('  someOtherField: 1\n')).toEqual([]);
  });
});

describe('slugify', () => {
  it.each([
    ['Scene1', 'scene1'],
    ['UseTheObstacle', 'use-the-obstacle'],
    ['FirstTeleporter', 'first-teleporter'],
    ['FirstColourChanger', 'first-colour-changer'],
    ['FirstColouredLine', 'first-coloured-line'],
    ['ThreeVerticalLines', 'three-vertical-lines'],
    ['DownUpDownUp1', 'down-up-down-up1'],
    ['Scene2a', 'scene2a'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('resolveTeleporterPairs', () => {
  it('pairs two teleporters referencing each other by local fileID', () => {
    const teleporters: TeleporterRef[] = [
      { id: 'A', otherRef: { fileID: 'B' } },
      { id: 'B', otherRef: { fileID: 'A' } },
    ];
    const pairs = resolveTeleporterPairs(teleporters);
    expect(pairs.get('A')).toBe(pairs.get('B'));
  });

  it('pairs two teleporters referencing each other by prefab-instance guid', () => {
    const teleporters: TeleporterRef[] = [
      { id: 'A', ownGuid: 'guid-a', otherRef: { fileID: '11400000', guid: 'guid-b' } },
      { id: 'B', ownGuid: 'guid-b', otherRef: { fileID: '11400000', guid: 'guid-a' } },
    ];
    const pairs = resolveTeleporterPairs(teleporters);
    expect(pairs.get('A')).toBe(pairs.get('B'));
  });

  it('assigns distinct pairIds to distinct pairs in a multi-teleporter scene', () => {
    const teleporters: TeleporterRef[] = [
      { id: 'A', otherRef: { fileID: 'B' } },
      { id: 'B', otherRef: { fileID: 'A' } },
      { id: 'C', otherRef: { fileID: 'D' } },
      { id: 'D', otherRef: { fileID: 'C' } },
    ];
    const pairs = resolveTeleporterPairs(teleporters);
    expect(pairs.get('A')).toBe(pairs.get('B'));
    expect(pairs.get('C')).toBe(pairs.get('D'));
    expect(pairs.get('A')).not.toBe(pairs.get('C'));
  });

  it('throws when a reference does not resolve to exactly one partner', () => {
    const teleporters: TeleporterRef[] = [
      { id: 'A', otherRef: { fileID: 'missing' } },
      { id: 'B', otherRef: { fileID: 'A' } },
    ];
    expect(() => resolveTeleporterPairs(teleporters)).toThrow();
  });

  it('throws when references are not mutual', () => {
    const teleporters: TeleporterRef[] = [
      { id: 'A', otherRef: { fileID: 'B' } },
      { id: 'B', otherRef: { fileID: 'C' } },
      { id: 'C', otherRef: { fileID: 'B' } },
    ];
    expect(() => resolveTeleporterPairs(teleporters)).toThrow();
  });
});
