import { circleVsBox, circleVsCircle, circleVsSegment, reflect, type Collision } from './collision';
import type { Colour, Level, LineCounts, Vec2 } from './types';

export const BALL_SPEED = 7;
export const BALL_RADIUS = 0.5;
export const LAUNCHER_FIRE_INTERVAL = 1.5;
export const TARGET_RADIUS = 1;
export const TARGET_HIT_THRESHOLD = 5;
export const TARGET_DRAIN_INTERVAL = 2;

// Half the width of a drawn Line's collidable/drawable body.
export const LINE_RADIUS = 0.25;
// How close a pointer-down must land to a LineHandle to grab it, rather than
// grabbing the LineMiddle or drawing a new Line.
export const LINE_HANDLE_GRAB_RADIUS = 0.75;
// Release speed (world units/sec) above which ending a drag deletes the Line
// instead of just letting go of it, mirroring the original's flick-to-delete.
export const LINE_FLICK_DELETE_SPEED = 15;
// A Line released at or below this length (e.g. a tap with no drag) is
// discarded rather than left behind as an invisible sliver still consuming
// its Colour's LineCounts budget.
export const LINE_MIN_LENGTH = 0.5;

// Lines are always drawn in one of the four colours LineCounts budgets —
// never 'None', which only applies to un-coloured Balls/Targets/Launchers.
export type LineColour = Exclude<Colour, 'None'>;

const COLOUR_PRIORITY: LineColour[] = ['Orange', 'Blue', 'Green', 'Purple'];

// The Colour newly-drawn Lines are tagged with: the first Colour (in a fixed
// priority order) that still has LineCounts budget remaining.
export function activeLineColour(remaining: LineCounts): LineColour {
  return COLOUR_PRIORITY.find((colour) => remaining[colour] > 0) ?? 'Orange';
}

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

export interface Line {
  id: number;
  colour: LineColour;
  a: Vec2;
  b: Vec2;
}

// Which end of a Line is being dragged. 'a'/'b' rotate the Line around the
// other endpoint; 'middle' translates both endpoints together.
export type LineDragTarget = 'a' | 'b' | 'middle';

export interface LineDragState {
  pointerId: number;
  lineId: number;
  target: LineDragTarget;
  lastPointerPosition: Vec2;
  pointerVelocity: Vec2;
}

export interface GameState {
  level: Level;
  balls: Ball[];
  launchers: LauncherRuntimeState[];
  targets: TargetRuntimeState[];
  lines: Line[];
  remainingLineCounts: LineCounts;
  nextBallId: number;
  nextLineId: number;
  drag: LineDragState | null;
  levelComplete: boolean;
}

export type PointerInputEvent =
  | { type: 'down'; pointerId: number; position: Vec2 }
  | { type: 'move'; pointerId: number; position: Vec2 }
  | { type: 'up'; pointerId: number; position: Vec2 };

export interface PlayerInput {
  pointerEvents: PointerInputEvent[];
}

export function createInitialState(level: Level): GameState {
  return {
    level,
    balls: [],
    launchers: level.launchers.map(() => ({ timeUntilNextShot: LAUNCHER_FIRE_INTERVAL })),
    targets: level.targets.map(() => ({ hits: 0, timeSinceLastHitOrDrain: 0 })),
    lines: [],
    remainingLineCounts: { ...level.lineCounts },
    nextBallId: 0,
    nextLineId: 0,
    drag: null,
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

function stepBall(ball: Ball, level: Level, lines: Line[], deltaTime: number): BallStepResult {
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

  // Lines bounce Balls physically regardless of Colour match — only scoring
  // against Targets is Colour-gated.
  for (const line of lines) {
    const collision = circleVsSegment(position, BALL_RADIUS, line.a, line.b, LINE_RADIUS);
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

function distance(p: Vec2, q: Vec2): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

function closestPointOnSegment(point: Vec2, a: Vec2, b: Vec2): Vec2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared === 0) return a;

  const t = Math.min(Math.max(((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSquared, 0), 1);
  return { x: a.x + abx * t, y: a.y + aby * t };
}

interface HandleHit {
  lineId: number;
  target: 'a' | 'b';
}

// Finds the nearest LineHandle within grab range of a pointer-down position,
// searching most-recently-drawn Lines first so overlapping Lines resolve
// predictably.
function hitTestHandle(lines: Line[], position: Vec2): HandleHit | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (distance(position, line.a) <= LINE_HANDLE_GRAB_RADIUS) return { lineId: line.id, target: 'a' };
    if (distance(position, line.b) <= LINE_HANDLE_GRAB_RADIUS) return { lineId: line.id, target: 'b' };
  }
  return null;
}

function hitTestMiddle(lines: Line[], position: Vec2): number | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const closest = closestPointOnSegment(position, line.a, line.b);
    if (distance(position, closest) <= LINE_RADIUS) return line.id;
  }
  return null;
}

function applyPointerDown(state: GameState, pointerId: number, position: Vec2): GameState {
  if (state.drag) return state;

  const handleHit = hitTestHandle(state.lines, position);
  if (handleHit) {
    return { ...state, drag: startDrag(pointerId, handleHit.lineId, handleHit.target, position) };
  }

  const middleHitId = hitTestMiddle(state.lines, position);
  if (middleHitId !== null) {
    return { ...state, drag: startDrag(pointerId, middleHitId, 'middle', position) };
  }

  const colour = activeLineColour(state.remainingLineCounts);
  if (state.remainingLineCounts[colour] <= 0) return state;

  const newLine: Line = { id: state.nextLineId, colour, a: position, b: position };
  return {
    ...state,
    lines: [...state.lines, newLine],
    nextLineId: state.nextLineId + 1,
    remainingLineCounts: { ...state.remainingLineCounts, [colour]: state.remainingLineCounts[colour] - 1 },
    drag: startDrag(pointerId, newLine.id, 'b', position),
  };
}

function startDrag(pointerId: number, lineId: number, target: LineDragTarget, position: Vec2): LineDragState {
  return { pointerId, lineId, target, lastPointerPosition: position, pointerVelocity: { x: 0, y: 0 } };
}

function moveDraggedLine(
  drag: LineDragState,
  lines: Line[],
  position: Vec2,
  deltaTime: number,
): { lines: Line[]; drag: LineDragState } {
  const updatedLines = lines.map((line) => {
    if (line.id !== drag.lineId) return line;
    if (drag.target === 'a') return { ...line, a: position };
    if (drag.target === 'b') return { ...line, b: position };

    const dx = position.x - drag.lastPointerPosition.x;
    const dy = position.y - drag.lastPointerPosition.y;
    return {
      ...line,
      a: { x: line.a.x + dx, y: line.a.y + dy },
      b: { x: line.b.x + dx, y: line.b.y + dy },
    };
  });

  const pointerVelocity =
    deltaTime > 0
      ? {
          x: (position.x - drag.lastPointerPosition.x) / deltaTime,
          y: (position.y - drag.lastPointerPosition.y) / deltaTime,
        }
      : { x: 0, y: 0 };

  return { lines: updatedLines, drag: { ...drag, lastPointerPosition: position, pointerVelocity } };
}

function applyPointerMove(state: GameState, pointerId: number, position: Vec2, deltaTime: number): GameState {
  if (!state.drag || state.drag.pointerId !== pointerId) return state;

  const { lines, drag } = moveDraggedLine(state.drag, state.lines, position, deltaTime);
  return { ...state, lines, drag };
}

function applyPointerUp(state: GameState, pointerId: number, position: Vec2, deltaTime: number): GameState {
  if (!state.drag || state.drag.pointerId !== pointerId) return state;

  const { lines, drag } = moveDraggedLine(state.drag, state.lines, position, deltaTime);
  const flickSpeed = Math.hypot(drag.pointerVelocity.x, drag.pointerVelocity.y);
  const draggedLine = lines.find((line) => line.id === drag.lineId);
  const tooShort = draggedLine ? distance(draggedLine.a, draggedLine.b) < LINE_MIN_LENGTH : false;

  if (flickSpeed > LINE_FLICK_DELETE_SPEED || tooShort) {
    const deletedLine = draggedLine;
    return {
      ...state,
      lines: lines.filter((line) => line.id !== drag.lineId),
      remainingLineCounts: deletedLine
        ? {
            ...state.remainingLineCounts,
            [deletedLine.colour]: state.remainingLineCounts[deletedLine.colour] + 1,
          }
        : state.remainingLineCounts,
      drag: null,
    };
  }

  return { ...state, lines, drag: null };
}

function applyPointerInput(state: GameState, input: PlayerInput, deltaTime: number): GameState {
  return input.pointerEvents.reduce((current, event) => {
    switch (event.type) {
      case 'down':
        return applyPointerDown(current, event.pointerId, event.position);
      case 'move':
        return applyPointerMove(current, event.pointerId, event.position, deltaTime);
      case 'up':
        return applyPointerUp(current, event.pointerId, event.position, deltaTime);
    }
  }, state);
}

export function updateGame(state: GameState, input: PlayerInput, deltaTime: number): GameState {
  const afterInput = applyPointerInput(state, input, deltaTime);

  const { balls: firedBalls, launchers, nextBallId } = fireLaunchers(afterInput, deltaTime);

  const stepped = afterInput.balls.map((ball) => stepBall(ball, afterInput.level, afterInput.lines, deltaTime));
  const balls = [...stepped.map((result) => result.ball), ...firedBalls];
  const hitTargetIndices = new Set(stepped.flatMap((result) => result.hitTargetIndices));

  const targets = stepTargets(afterInput.targets, hitTargetIndices, deltaTime);
  const levelComplete = targets.every((target) => target.hits >= TARGET_HIT_THRESHOLD);

  return {
    level: afterInput.level,
    balls,
    launchers,
    targets,
    lines: afterInput.lines,
    remainingLineCounts: afterInput.remainingLineCounts,
    nextBallId,
    nextLineId: afterInput.nextLineId,
    drag: afterInput.drag,
    levelComplete,
  };
}
