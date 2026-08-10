import type { Vec2 } from './types';

// Rotates a point around an origin by angleDegrees, matching LauncherData
// .angle / ObstacleData.angle's convention: 0 is unrotated, clockwise-
// positive (as rendered on screen), and the same formula as
// simulation.ts's launcherDirection.
export function rotatePoint(point: Vec2, angleDegrees: number, origin: Vec2): Vec2 {
  const radians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;

  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}
