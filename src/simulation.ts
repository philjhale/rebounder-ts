import { circleVsBox, circleVsCircle, reflect, type Collision } from './collision';
import type { Colour, Level, Vec2 } from './types';

export const BALL_SPEED = 7;
export const BALL_RADIUS = 0.5;
export const LAUNCHER_FIRE_INTERVAL = 1.5;
export const TARGET_RADIUS = 1;
export const TARGET_HIT_THRESHOLD = 5;
export const TARGET_DRAIN_INTERVAL = 2;

export interface Ball {
  id: number;
  position: Vec2;
  velocity: Vec2;
  colour: Colour;
}

export interface LauncherRuntimeState {
  timeUntilNextShot: number;
}

export interface TargetRuntimeState {
  hits: number;
  timeSinceLastHitOrDrain: number;
}

export interface GameState {
  level: Level;
  balls: Ball[];
  launchers: LauncherRuntimeState[];
  targets: TargetRuntimeState[];
  nextBallId: number;
  levelComplete: boolean;
}

// No player interactions are wired up yet (Lines, Launcher taps) — this
// stays empty until those tickets add fields, but the param is already part
// of updateGame's signature so callers/tests don't need to change later.
export type PlayerInput = Record<string, never>;

export function createInitialState(level: Level): GameState {
  return {
    level,
    balls: [],
    launchers: level.launchers.map(() => ({ timeUntilNextShot: LAUNCHER_FIRE_INTERVAL })),
    targets: level.targets.map(() => ({ hits: 0, timeSinceLastHitOrDrain: 0 })),
    nextBallId: 0,
    levelComplete: false,
  };
}

function launcherDirection(angleDegrees: number): Vec2 {
  const radians = (angleDegrees * Math.PI) / 180;
  return { x: -Math.sin(radians), y: Math.cos(radians) };
}

function fireLaunchers(
  state: GameState,
  deltaTime: number,
): { balls: Ball[]; launchers: LauncherRuntimeState[]; nextBallId: number } {
  const newBalls: Ball[] = [];
  let nextBallId = state.nextBallId;

  const launchers = state.level.launchers.map((launcherData, index) => {
    const runtime = state.launchers[index];
    if (!launcherData.enabled) return runtime;

    let timeUntilNextShot = runtime.timeUntilNextShot - deltaTime;
    if (timeUntilNextShot <= 0) {
      const direction = launcherDirection(launcherData.angle);
      newBalls.push({
        id: nextBallId++,
        position: { ...launcherData.position },
        velocity: { x: direction.x * BALL_SPEED, y: direction.y * BALL_SPEED },
        colour: launcherData.colour,
      });
      timeUntilNextShot += LAUNCHER_FIRE_INTERVAL;
    }

    return { timeUntilNextShot };
  });

  return { balls: newBalls, launchers, nextBallId };
}

function renormalize(velocity: Vec2, speed: number): Vec2 {
  const magnitude = Math.hypot(velocity.x, velocity.y);
  if (magnitude === 0) return velocity;
  return { x: (velocity.x / magnitude) * speed, y: (velocity.y / magnitude) * speed };
}

// A Ball only scores against a Target of the same Colour — physical bounce
// happens regardless of colour, this rule gates scoring only.
export function colourMatches(a: Colour, b: Colour): boolean {
  return a === b;
}

interface BounceResult {
  position: Vec2;
  velocity: Vec2;
}

// Applies a bounce off a collision surface (reflect + push out of overlap),
// but only when the ball is moving into the surface — a ball already moving
// away from a shallow overlap is left untouched.
function resolveBounce(position: Vec2, velocity: Vec2, collision: Collision): BounceResult | null {
  const movingIntoSurface = velocity.x * collision.normal.x + velocity.y * collision.normal.y < 0;
  if (!movingIntoSurface) return null;

  return {
    velocity: reflect(velocity, collision.normal),
    position: {
      x: position.x + collision.normal.x * collision.penetration,
      y: position.y + collision.normal.y * collision.penetration,
    },
  };
}

interface BallStepResult {
  ball: Ball;
  hitTargetIndices: number[];
}

function stepBall(ball: Ball, level: Level, deltaTime: number): BallStepResult {
  let position = {
    x: ball.position.x + ball.velocity.x * deltaTime,
    y: ball.position.y + ball.velocity.y * deltaTime,
  };
  let velocity = ball.velocity;

  for (const obstacle of level.obstacles) {
    const collision = circleVsBox(position, BALL_RADIUS, obstacle);
    if (!collision) continue;

    const bounce = resolveBounce(position, velocity, collision);
    if (!bounce) continue;
    ({ position, velocity } = bounce);
  }

  const hitTargetIndices: number[] = [];
  level.targets.forEach((target, index) => {
    const collision = circleVsCircle(position, BALL_RADIUS, target.position, TARGET_RADIUS);
    if (!collision) return;

    const bounce = resolveBounce(position, velocity, collision);
    if (!bounce) return;
    ({ position, velocity } = bounce);

    if (colourMatches(target.colour, ball.colour)) hitTargetIndices.push(index);
  });

  return {
    ball: { ...ball, position, velocity: renormalize(velocity, BALL_SPEED) },
    hitTargetIndices,
  };
}

function stepTargets(
  targets: TargetRuntimeState[],
  hitTargetIndices: Set<number>,
  deltaTime: number,
): TargetRuntimeState[] {
  return targets.map((target, index) => {
    if (hitTargetIndices.has(index)) {
      return { hits: target.hits + 1, timeSinceLastHitOrDrain: 0 };
    }

    if (target.hits === 0) return target;

    let hits = target.hits;
    let timeSinceLastHitOrDrain = target.timeSinceLastHitOrDrain + deltaTime;
    while (hits > 0 && timeSinceLastHitOrDrain >= TARGET_DRAIN_INTERVAL) {
      hits -= 1;
      timeSinceLastHitOrDrain -= TARGET_DRAIN_INTERVAL;
    }

    return { hits, timeSinceLastHitOrDrain };
  });
}

export function updateGame(state: GameState, _input: PlayerInput, deltaTime: number): GameState {
  const { balls: firedBalls, launchers, nextBallId } = fireLaunchers(state, deltaTime);

  const stepped = state.balls.map((ball) => stepBall(ball, state.level, deltaTime));
  const balls = [...stepped.map((result) => result.ball), ...firedBalls];
  const hitTargetIndices = new Set(stepped.flatMap((result) => result.hitTargetIndices));

  const targets = stepTargets(state.targets, hitTargetIndices, deltaTime);
  const levelComplete = targets.every((target) => target.hits >= TARGET_HIT_THRESHOLD);

  return { level: state.level, balls, launchers, targets, nextBallId, levelComplete };
}
