import { circleVsBox, reflect } from './collision';
import type { Colour, Level, Vec2 } from './types';

export const BALL_SPEED = 7;
export const BALL_RADIUS = 0.5;
export const LAUNCHER_FIRE_INTERVAL = 1.5;

export interface Ball {
  id: number;
  position: Vec2;
  velocity: Vec2;
  colour: Colour;
}

export interface LauncherRuntimeState {
  timeUntilNextShot: number;
}

export interface GameState {
  level: Level;
  balls: Ball[];
  launchers: LauncherRuntimeState[];
  nextBallId: number;
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
    nextBallId: 0,
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

function stepBall(ball: Ball, level: Level, deltaTime: number): Ball {
  let position = {
    x: ball.position.x + ball.velocity.x * deltaTime,
    y: ball.position.y + ball.velocity.y * deltaTime,
  };
  let velocity = ball.velocity;

  for (const obstacle of level.obstacles) {
    const collision = circleVsBox(position, BALL_RADIUS, obstacle);
    if (!collision) continue;

    const movingIntoSurface =
      velocity.x * collision.normal.x + velocity.y * collision.normal.y < 0;
    if (!movingIntoSurface) continue;

    velocity = reflect(velocity, collision.normal);
    position = {
      x: position.x + collision.normal.x * collision.penetration,
      y: position.y + collision.normal.y * collision.penetration,
    };
  }

  return { ...ball, position, velocity: renormalize(velocity, BALL_SPEED) };
}

export function updateGame(state: GameState, _input: PlayerInput, deltaTime: number): GameState {
  const { balls: firedBalls, launchers, nextBallId } = fireLaunchers(state, deltaTime);
  const balls = [...state.balls.map((ball) => stepBall(ball, state.level, deltaTime)), ...firedBalls];

  return { level: state.level, balls, launchers, nextBallId };
}
