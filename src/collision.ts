import type { ObstacleData, Vec2 } from './types';

export interface Collision {
  normal: Vec2;
  penetration: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Circle vs axis-aligned box. Returns null when the circle doesn't overlap
// the box, otherwise the surface normal to push the circle out along and how
// far to push it, measured from the box's nearest edge (or, when the
// circle's centre is inside the box, from the nearest face).
export function circleVsBox(centre: Vec2, radius: number, box: ObstacleData): Collision | null {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  const dx = centre.x - box.position.x;
  const dy = centre.y - box.position.y;

  const closestX = clamp(dx, -halfWidth, halfWidth);
  const closestY = clamp(dy, -halfHeight, halfHeight);
  const diffX = dx - closestX;
  const diffY = dy - closestY;
  const distanceSquared = diffX * diffX + diffY * diffY;

  if (distanceSquared > radius * radius) return null;

  if (distanceSquared > 0) {
    const distance = Math.sqrt(distanceSquared);
    return {
      normal: { x: diffX / distance, y: diffY / distance },
      penetration: radius - distance,
    };
  }

  const overlapX = halfWidth - Math.abs(dx);
  const overlapY = halfHeight - Math.abs(dy);
  const signX = dx < 0 ? -1 : 1;
  const signY = dy < 0 ? -1 : 1;

  if (overlapX < overlapY) {
    return { normal: { x: signX, y: 0 }, penetration: overlapX + radius };
  }
  return { normal: { x: 0, y: signY }, penetration: overlapY + radius };
}

// Circle vs circle. Returns null when the circles don't overlap, otherwise
// the normal pointing from the second circle's centre towards the first, and
// how far to push the first circle out along it.
export function circleVsCircle(
  centre: Vec2,
  radius: number,
  otherCentre: Vec2,
  otherRadius: number,
): Collision | null {
  const dx = centre.x - otherCentre.x;
  const dy = centre.y - otherCentre.y;
  const distanceSquared = dx * dx + dy * dy;
  const radiiSum = radius + otherRadius;

  if (distanceSquared >= radiiSum * radiiSum) return null;

  const distance = Math.sqrt(distanceSquared);
  if (distance === 0) return { normal: { x: 1, y: 0 }, penetration: radiiSum };

  return {
    normal: { x: dx / distance, y: dy / distance },
    penetration: radiiSum - distance,
  };
}

// Reflects velocity across a surface normal, matching physical bounce
// (mirrors incoming direction, preserves speed).
export function reflect(velocity: Vec2, normal: Vec2): Vec2 {
  const dot = velocity.x * normal.x + velocity.y * normal.y;
  return {
    x: velocity.x - 2 * dot * normal.x,
    y: velocity.y - 2 * dot * normal.y,
  };
}
