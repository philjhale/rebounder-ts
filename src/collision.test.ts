import { describe, expect, it } from 'vitest';
import { circleVsBox, circleVsCircle, circleVsSegment, reflect } from './collision';

describe('circleVsBox', () => {
  const box = { position: { x: 0, y: 0 }, width: 4, height: 2, angle: 0 };

  it('returns null when the circle is far from the box', () => {
    expect(circleVsBox({ x: 10, y: 10 }, 0.5, box)).toBeNull();
  });

  it('detects a collision against a flat edge and returns its normal', () => {
    // Circle centred just above the box's top edge (y = 1), overlapping by 0.2.
    const collision = circleVsBox({ x: 0, y: 1.3 }, 0.5, box);
    expect(collision).not.toBeNull();
    expect(collision?.normal.x).toBeCloseTo(0);
    expect(collision?.normal.y).toBeCloseTo(1);
    expect(collision?.penetration).toBeCloseTo(0.2);
  });

  it('detects a collision against a corner and returns the diagonal normal', () => {
    // Circle centred beyond the box's top-right corner (2, 1).
    const collision = circleVsBox({ x: 2.3, y: 1.3 }, 0.5, box);
    expect(collision).not.toBeNull();
    const distance = Math.hypot(0.3, 0.3);
    expect(collision?.normal.x).toBeCloseTo(0.3 / distance);
    expect(collision?.normal.y).toBeCloseTo(0.3 / distance);
    expect(collision?.penetration).toBeCloseTo(0.5 - distance);
  });

  it('pushes out along the nearest face when the centre is inside the box', () => {
    // Box is wider (halfWidth 2) than tall (halfHeight 1), so a centre near
    // the top should push out vertically, the shorter distance.
    const collision = circleVsBox({ x: 0, y: 0.5 }, 0.5, box);
    expect(collision).not.toBeNull();
    expect(collision?.normal).toEqual({ x: 0, y: 1 });
  });
});

describe('circleVsCircle', () => {
  it('returns null when the circles are far apart', () => {
    expect(circleVsCircle({ x: 0, y: 0 }, 0.5, { x: 10, y: 10 }, 0.5)).toBeNull();
  });

  it('detects an overlap and returns the normal pointing away from the other circle', () => {
    // Centres 1 unit apart along x, radii sum to 1.5 -> overlap of 0.5.
    const collision = circleVsCircle({ x: 1, y: 0 }, 1, { x: 0, y: 0 }, 0.5);
    expect(collision).not.toBeNull();
    expect(collision?.normal.x).toBeCloseTo(1);
    expect(collision?.normal.y).toBeCloseTo(0);
    expect(collision?.penetration).toBeCloseTo(0.5);
  });

  it('returns null for circles that are just touching or apart', () => {
    expect(circleVsCircle({ x: 2, y: 0 }, 1, { x: 0, y: 0 }, 1)).toBeNull();
  });
});

describe('circleVsSegment', () => {
  const a = { x: -5, y: 0 };
  const b = { x: 5, y: 0 };

  it('returns null when the circle is far from the segment', () => {
    expect(circleVsSegment({ x: 0, y: 10 }, 0.5, a, b, 0.25)).toBeNull();
  });

  it('detects a collision against the flat middle of the segment', () => {
    // Circle centred just above the segment, overlapping by 0.1.
    const collision = circleVsSegment({ x: 0, y: 0.65 }, 0.5, a, b, 0.25);
    expect(collision).not.toBeNull();
    expect(collision?.normal.x).toBeCloseTo(0);
    expect(collision?.normal.y).toBeCloseTo(1);
    expect(collision?.penetration).toBeCloseTo(0.1);
  });

  it('detects a collision against an endpoint cap, past the segment length', () => {
    // Circle centred beyond b's end, closest point clamps to b.
    const collision = circleVsSegment({ x: 5.5, y: 0.4 }, 0.5, a, b, 0.25);
    expect(collision).not.toBeNull();
    const distance = Math.hypot(0.5, 0.4);
    expect(collision?.normal.x).toBeCloseTo(0.5 / distance);
    expect(collision?.normal.y).toBeCloseTo(0.4 / distance);
    expect(collision?.penetration).toBeCloseTo(0.75 - distance);
  });

  it('returns null for a circle just touching or apart from the segment', () => {
    expect(circleVsSegment({ x: 0, y: 0.75 }, 0.5, a, b, 0.25)).toBeNull();
  });
});

describe('reflect', () => {
  it('mirrors velocity across a vertical surface normal', () => {
    const result = reflect({ x: 1, y: 1 }, { x: 1, y: 0 });
    expect(result.x).toBeCloseTo(-1);
    expect(result.y).toBeCloseTo(1);
  });

  it('mirrors velocity across a horizontal surface normal', () => {
    const result = reflect({ x: 3, y: -2 }, { x: 0, y: 1 });
    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(2);
  });

  it('preserves speed', () => {
    const velocity = { x: 4, y: 3 };
    const result = reflect(velocity, { x: 0.6, y: 0.8 });
    const speedBefore = Math.hypot(velocity.x, velocity.y);
    const speedAfter = Math.hypot(result.x, result.y);
    expect(speedAfter).toBeCloseTo(speedBefore);
  });
});
