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
      expect(colourChanger.width).toBeGreaterThan(0);
      expect(colourChanger.height).toBeGreaterThan(0);
      expect(typeof colourChanger.angle).toBe('number');
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

  it('keeps FirstColourChanger solvable: a single bounce can route the Launcher through the ColourChanger to the Target', () => {
    // Regression test: the original Unity level relies on this ColourChanger
    // being a tall wall (its BoxCollider was hand-resized from the 4-unit
    // prefab default to 25 units), not a small point, so any reasonable
    // single-bounce Line sends the Ball through it on the way to the Target.
    // The converter used to drop that resize, collapsing it to a fixed
    // radius-1 circle centred 2 units below the Launcher's own height - out
    // of reach of any straight path from the Launcher to the Target, making
    // the level unsolvable. Confirm the real box is large enough to still be
    // crossed by a straight path from just above the Launcher to the Target.
    const level = levels.find((l) => l.name === 'FirstColourChanger');
    expect(level).toBeDefined();
    if (!level) throw new Error('expected FirstColourChanger');

    const launcher = level.launchers[0];
    const target = level.targets[0];
    const colourChanger = level.colourChangers[0];

    // A bounce point just above the Launcher, representative of where a
    // single drawn Line would first redirect the Ball.
    const bouncePoint = { x: launcher.position.x, y: launcher.position.y + 1 };

    const samples = 500;
    let crossesColourChanger = false;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = {
        x: bouncePoint.x + (target.position.x - bouncePoint.x) * t,
        y: bouncePoint.y + (target.position.y - bouncePoint.y) * t,
      };
      if (circleVsObstacle(point, 0.01, colourChanger)) {
        crossesColourChanger = true;
        break;
      }
    }

    expect(crossesColourChanger).toBe(true);
  });
});
