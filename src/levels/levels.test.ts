import { describe, expect, it } from 'vitest';
import { levels } from './index';
import type { Colour } from '../types';
import { circleVsObstacle } from '../collision';

const VALID_COLOURS: Colour[] = ['Orange', 'Blue', 'Green', 'Purple', 'None'];

function expectVec2(value: unknown) {
  expect(value).toMatchObject({
    x: expect.any(Number) as unknown,
    y: expect.any(Number) as unknown,
  });
}

describe('level data', () => {
  it('ships all 60 active curriculum levels, each with a unique id', () => {
    expect(levels.length).toBe(60);
    expect(new Set(levels.map((l) => l.id)).size).toBe(60);
  });

  it.each(levels)('$name conforms to the fixed-field Level schema', (level) => {
    expect(typeof level.id).toBe('string');
    expect(typeof level.name).toBe('string');

    for (const launcher of level.launchers) {
      expectVec2(launcher.position);
      expect(VALID_COLOURS).toContain(launcher.colour);
      expect(typeof launcher.enabled).toBe('boolean');
      expect(typeof launcher.angle).toBe('number');
    }

    for (const target of level.targets) {
      expectVec2(target.position);
      expect(VALID_COLOURS).toContain(target.colour);
    }

    for (const obstacle of level.obstacles) {
      expectVec2(obstacle.position);
      expect(obstacle.width).toBeGreaterThan(0);
      expect(obstacle.height).toBeGreaterThan(0);
      expect(typeof obstacle.angle).toBe('number');
    }

    for (const colourChanger of level.colourChangers) {
      expectVec2(colourChanger.position);
      expect(VALID_COLOURS).toContain(colourChanger.colour);
    }

    expect(level.lineCounts.Orange).toBeGreaterThanOrEqual(0);
    expect(level.lineCounts.Blue).toBeGreaterThanOrEqual(0);
    expect(level.lineCounts.Green).toBeGreaterThanOrEqual(0);
    expect(level.lineCounts.Purple).toBeGreaterThanOrEqual(0);
  });

  it('pairs every teleporter with exactly one other teleporter sharing its pairId', () => {
    for (const level of levels) {
      const byPair = new Map<string, number>();
      for (const teleporter of level.teleporters) {
        expectVec2(teleporter.position);
        byPair.set(teleporter.pairId, (byPair.get(teleporter.pairId) ?? 0) + 1);
      }
      for (const count of byPair.values()) {
        expect(count).toBe(2);
      }
    }
  });

  it('has at least one launcher and one target per level', () => {
    for (const level of levels) {
      expect(level.launchers.length).toBeGreaterThan(0);
      expect(level.targets.length).toBeGreaterThan(0);
    }
  });

  it('includes at least one level with a rotated (non-zero angle) obstacle', () => {
    const rotatedObstacles = levels.flatMap((l) => l.obstacles).filter((o) => o.angle !== 0);
    expect(rotatedObstacles.length).toBeGreaterThan(0);
  });

  it('excludes the two levels commented out in LevelOrderHelper.cs', () => {
    const ids = levels.map((l) => l.name);
    expect(ids).not.toContain('UpDraft');
    expect(ids).not.toContain('OverTheEdge');
  });

  it('produces a sane collision against a real rotated obstacle', () => {
    // fill-in-the-blanks has several 45-degree-rotated, tall/thin obstacles.
    // Pick one and place a ball just touching one of its long edges, in the
    // obstacle's own rotated frame, to confirm circleVsObstacle handles a
    // converter-authored rotated obstacle sanely (unit normal, positive
    // penetration, pointing away from the obstacle's centre).
    const level = levels.find((l) => l.name === 'FillInTheBlanks');
    expect(level).toBeDefined();
    const obstacle = level?.obstacles.find((o) => o.angle === 45);
    expect(obstacle).toBeDefined();
    if (!obstacle) throw new Error('expected a 45-degree obstacle');

    const radius = 0.3;
    // Half-width along the obstacle's local x-axis, plus a slight overlap,
    // offset along the 45-degree direction from the obstacle's centre.
    const reach = obstacle.width / 2 + radius - 0.05;
    const direction = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    const ballPosition = {
      x: obstacle.position.x + direction.x * reach,
      y: obstacle.position.y + direction.y * reach,
    };

    const collision = circleVsObstacle(ballPosition, radius, obstacle);
    expect(collision).not.toBeNull();
    if (!collision) throw new Error('expected a collision');

    const normalLength = Math.hypot(collision.normal.x, collision.normal.y);
    expect(normalLength).toBeCloseTo(1);
    expect(collision.penetration).toBeGreaterThan(0);
    // The normal should point away from the obstacle's centre, back towards
    // the ball, not into the obstacle.
    const dot = collision.normal.x * direction.x + collision.normal.y * direction.y;
    expect(dot).toBeGreaterThan(0);
  });
});
