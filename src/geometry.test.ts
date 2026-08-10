import { describe, expect, it } from 'vitest';
import { rotatePoint } from './geometry';

describe('rotatePoint', () => {
  it('leaves a point unchanged at angle 0', () => {
    const result = rotatePoint({ x: 3, y: 4 }, 0, { x: 0, y: 0 });
    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(4);
  });

  it('matches launcherDirection\'s convention: rotating world-up by 90 gives -x', () => {
    // simulation.ts's launcherDirection(90) resolves to (-1, 0) — the same
    // clockwise-positive convention rotatePoint must follow.
    const result = rotatePoint({ x: 0, y: 1 }, 90, { x: 0, y: 0 });
    expect(result.x).toBeCloseTo(-1);
    expect(result.y).toBeCloseTo(0);
  });

  it('rotates a point 180 degrees around a non-origin centre', () => {
    const result = rotatePoint({ x: 5, y: 2 }, 180, { x: 2, y: 2 });
    expect(result.x).toBeCloseTo(-1);
    expect(result.y).toBeCloseTo(2);
  });

  it('rotates a point 270 degrees around a non-origin centre', () => {
    // 270 clockwise == 90 counter-clockwise.
    const result = rotatePoint({ x: 3, y: 0 }, 270, { x: 0, y: 0 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(-3);
  });

  it('is a pure rotation: preserves distance from the origin', () => {
    const origin = { x: 1, y: -2 };
    const point = { x: 4, y: 3 };
    const distanceBefore = Math.hypot(point.x - origin.x, point.y - origin.y);
    const result = rotatePoint(point, 37, origin);
    const distanceAfter = Math.hypot(result.x - origin.x, result.y - origin.y);
    expect(distanceAfter).toBeCloseTo(distanceBefore);
  });
});
