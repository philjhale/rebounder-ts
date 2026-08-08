import { describe, expect, it } from 'vitest';
import {
  BALL_RADIUS,
  BALL_SPEED,
  LAUNCHER_FIRE_INTERVAL,
  LINE_FLICK_DELETE_SPEED,
  TARGET_DRAIN_INTERVAL,
  TARGET_HIT_THRESHOLD,
  TARGET_RADIUS,
  activeLineColour,
  colourMatches,
  createInitialState,
  updateGame,
  type GameState,
  type PointerInputEvent,
} from './simulation';
import type { Level } from './types';

function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: 'test',
    name: 'Test',
    launchers: [],
    targets: [{ position: { x: 0, y: 0 }, colour: 'Orange' }],
    obstacles: [],
    teleporters: [],
    colourChangers: [],
    lineCounts: { Orange: 0, Blue: 0, Green: 0, Purple: 0 },
    ...overrides,
  };
}

const NO_INPUT = { pointerEvents: [] };

describe('updateGame: launcher firing', () => {
  it('does not fire before the interval elapses', () => {
    const level = makeLevel({
      launchers: [{ position: { x: 0, y: 0 }, colour: 'Orange', enabled: true, angle: 0 }],
    });
    const state = createInitialState(level);

    const next = updateGame(state, NO_INPUT, LAUNCHER_FIRE_INTERVAL - 0.1);

    expect(next.balls).toHaveLength(0);
  });

  it('fires a ball once the interval elapses, in the launcher colour and angle direction', () => {
    const level = makeLevel({
      launchers: [{ position: { x: 2, y: 3 }, colour: 'Blue', enabled: true, angle: 0 }],
    });
    const state = createInitialState(level);

    const next = updateGame(state, NO_INPUT, LAUNCHER_FIRE_INTERVAL);

    expect(next.balls).toHaveLength(1);
    const ball = next.balls[0];
    expect(ball.colour).toBe('Blue');
    expect(ball.position).toEqual({ x: 2, y: 3 });
    // angle 0 fires straight up (+y) at constant BALL_SPEED
    expect(ball.velocity.x).toBeCloseTo(0);
    expect(ball.velocity.y).toBeCloseTo(BALL_SPEED);
  });

  it('fires along the direction implied by a non-zero angle', () => {
    const level = makeLevel({
      launchers: [{ position: { x: 0, y: 0 }, colour: 'Orange', enabled: true, angle: 90 }],
    });
    const state = createInitialState(level);

    const next = updateGame(state, NO_INPUT, LAUNCHER_FIRE_INTERVAL);

    const ball = next.balls[0];
    // angle 90 fires along -x
    expect(ball.velocity.x).toBeCloseTo(-BALL_SPEED);
    expect(ball.velocity.y).toBeCloseTo(0);
  });

  it('does not fire a disabled launcher', () => {
    const level = makeLevel({
      launchers: [{ position: { x: 0, y: 0 }, colour: 'Orange', enabled: false, angle: 0 }],
    });
    const state = createInitialState(level);

    const next = updateGame(state, NO_INPUT, LAUNCHER_FIRE_INTERVAL * 3);

    expect(next.balls).toHaveLength(0);
  });

  it('fires repeatedly, carrying over leftover time so the rate is frame-rate independent', () => {
    const level = makeLevel({
      launchers: [{ position: { x: 0, y: 0 }, colour: 'Orange', enabled: true, angle: 0 }],
    });
    let state = createInitialState(level);

    // Ten small steps summing to just over two full intervals.
    const step = (LAUNCHER_FIRE_INTERVAL * 2.1) / 10;
    for (let i = 0; i < 10; i++) {
      state = updateGame(state, NO_INPUT, step);
    }

    expect(state.balls).toHaveLength(2);
  });
});

describe('updateGame: ball movement', () => {
  it('moves a ball at constant speed along its velocity', () => {
    const level = makeLevel();
    let state: GameState = { ...createInitialState(level), balls: [{ id: 0, position: { x: 0, y: 0 }, velocity: { x: BALL_SPEED, y: 0 }, colour: 'Orange' }] };

    state = updateGame(state, NO_INPUT, 1);

    const ball = state.balls[0];
    expect(ball.position.x).toBeCloseTo(BALL_SPEED);
    expect(ball.position.y).toBeCloseTo(0);
    expect(Math.hypot(ball.velocity.x, ball.velocity.y)).toBeCloseTo(BALL_SPEED);
  });

  it('is frame-rate independent: many small steps match one big step', () => {
    const level = makeLevel();
    const initialBall = { id: 0, position: { x: 0, y: 0 }, velocity: { x: BALL_SPEED, y: 0 }, colour: 'Orange' as const };

    let bigStepState: GameState = { ...createInitialState(level), balls: [initialBall] };
    bigStepState = updateGame(bigStepState, NO_INPUT, 1);

    let smallStepState: GameState = { ...createInitialState(level), balls: [initialBall] };
    for (let i = 0; i < 10; i++) {
      smallStepState = updateGame(smallStepState, NO_INPUT, 0.1);
    }

    expect(smallStepState.balls[0].position.x).toBeCloseTo(bigStepState.balls[0].position.x);
    expect(smallStepState.balls[0].position.y).toBeCloseTo(bigStepState.balls[0].position.y);
  });
});

describe('colourMatches', () => {
  it('is true for the same colour', () => {
    expect(colourMatches('Orange', 'Orange')).toBe(true);
  });

  it('is false for different colours', () => {
    expect(colourMatches('Orange', 'Blue')).toBe(false);
  });
});

describe('updateGame: target scoring', () => {
  it('increments a target hit count when a same-colour ball reaches it', () => {
    const level = makeLevel({
      targets: [{ position: { x: 5, y: 0 }, colour: 'Orange' }],
    });
    let state: GameState = {
      ...createInitialState(level),
      balls: [
        {
          id: 0,
          position: { x: 5 - TARGET_RADIUS - BALL_RADIUS - 0.01, y: 0 },
          velocity: { x: BALL_SPEED, y: 0 },
          colour: 'Orange',
        },
      ],
    };

    state = updateGame(state, NO_INPUT, 0.05);

    expect(state.targets[0].hits).toBe(1);
  });

  it('bounces the ball but does not score against a different-colour target', () => {
    const level = makeLevel({
      targets: [{ position: { x: 5, y: 0 }, colour: 'Blue' }],
    });
    let state: GameState = {
      ...createInitialState(level),
      balls: [
        {
          id: 0,
          position: { x: 5 - TARGET_RADIUS - BALL_RADIUS - 0.01, y: 0 },
          velocity: { x: BALL_SPEED, y: 0 },
          colour: 'Orange',
        },
      ],
    };

    state = updateGame(state, NO_INPUT, 0.05);

    expect(state.targets[0].hits).toBe(0);
    expect(state.balls[0].velocity.x).toBeLessThan(0);
    expect(Math.hypot(state.balls[0].velocity.x, state.balls[0].velocity.y)).toBeCloseTo(
      BALL_SPEED,
    );
  });

  it('drains one hit after 2 seconds with no further hits', () => {
    const level = makeLevel({ targets: [{ position: { x: 0, y: 0 }, colour: 'Orange' }] });
    let state: GameState = createInitialState(level);
    state = {
      ...state,
      targets: [{ hits: 4, timeSinceLastHitOrDrain: 0 }],
    };

    state = updateGame(state, NO_INPUT, TARGET_DRAIN_INTERVAL);

    expect(state.targets[0].hits).toBe(3);
  });

  it('does not drain a target with zero hits', () => {
    const level = makeLevel({ targets: [{ position: { x: 0, y: 0 }, colour: 'Orange' }] });
    const state = createInitialState(level);

    const next = updateGame(state, NO_INPUT, TARGET_DRAIN_INTERVAL * 5);

    expect(next.targets[0].hits).toBe(0);
  });

  it('reports the level complete once every target is at or above the threshold', () => {
    const level = makeLevel({
      targets: [
        { position: { x: 0, y: 0 }, colour: 'Orange' },
        { position: { x: 10, y: 0 }, colour: 'Blue' },
      ],
    });
    let state: GameState = createInitialState(level);
    state = {
      ...state,
      targets: [
        { hits: TARGET_HIT_THRESHOLD, timeSinceLastHitOrDrain: 0 },
        { hits: TARGET_HIT_THRESHOLD - 1, timeSinceLastHitOrDrain: 0 },
      ],
    };

    let next = updateGame(state, NO_INPUT, 0);
    expect(next.levelComplete).toBe(false);

    state = { ...state, targets: [state.targets[0], { hits: TARGET_HIT_THRESHOLD, timeSinceLastHitOrDrain: 0 }] };
    next = updateGame(state, NO_INPUT, 0);
    expect(next.levelComplete).toBe(true);
  });
});

describe('updateGame: obstacle collision', () => {
  it('bounces a ball off an obstacle, preserving speed', () => {
    const level = makeLevel({
      obstacles: [{ position: { x: 5, y: 0 }, width: 2, height: 10 }],
    });
    let state: GameState = {
      ...createInitialState(level),
      balls: [
        {
          id: 0,
          position: { x: 5 - 1 - BALL_RADIUS - 0.01, y: 0 },
          velocity: { x: BALL_SPEED, y: 0 },
          colour: 'Orange',
        },
      ],
    };

    state = updateGame(state, NO_INPUT, 0.05);

    const ball = state.balls[0];
    expect(ball.velocity.x).toBeLessThan(0);
    expect(Math.hypot(ball.velocity.x, ball.velocity.y)).toBeCloseTo(BALL_SPEED);
    // pushed back out of the obstacle, not left overlapping it
    expect(ball.position.x).toBeLessThan(5 - 1 - BALL_RADIUS + 0.01);
  });

  it('leaves a ball moving away from an obstacle untouched', () => {
    const level = makeLevel({
      obstacles: [{ position: { x: 5, y: 0 }, width: 2, height: 10 }],
    });
    let state: GameState = {
      ...createInitialState(level),
      balls: [
        { id: 0, position: { x: 10, y: 0 }, velocity: { x: BALL_SPEED, y: 0 }, colour: 'Orange' },
      ],
    };

    state = updateGame(state, NO_INPUT, 0.1);

    const ball = state.balls[0];
    expect(ball.velocity.x).toBeCloseTo(BALL_SPEED);
  });
});

function withPointerEvents(events: PointerInputEvent[]) {
  return { pointerEvents: events };
}

describe('activeLineColour', () => {
  it('picks the first colour (Orange, Blue, Green, Purple) with remaining budget', () => {
    expect(activeLineColour({ Orange: 0, Blue: 2, Green: 1, Purple: 0 })).toBe('Blue');
  });

  it('falls back to Orange when no colour has remaining budget', () => {
    expect(activeLineColour({ Orange: 0, Blue: 0, Green: 0, Purple: 0 })).toBe('Orange');
  });
});

describe('updateGame: drawing Lines', () => {
  it('draws a new Line in the active colour when dragging on empty space', () => {
    const level = makeLevel({ lineCounts: { Orange: 1, Blue: 0, Green: 0, Purple: 0 } });
    let state: GameState = createInitialState(level);

    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );

    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].colour).toBe('Orange');
    expect(state.remainingLineCounts.Orange).toBe(0);
  });

  it('stretches the Line to follow the pointer while dragging', () => {
    const level = makeLevel({ lineCounts: { Orange: 1, Blue: 0, Green: 0, Purple: 0 } });
    let state: GameState = createInitialState(level);

    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );
    state = updateGame(
      state,
      withPointerEvents([{ type: 'move', pointerId: 1, position: { x: 5, y: 0 } }]),
      0.016,
    );

    expect(state.lines[0].a).toEqual({ x: 0, y: 0 });
    expect(state.lines[0].b).toEqual({ x: 5, y: 0 });
  });

  it('rejects drawing a new Line once the colour budget is exhausted', () => {
    const level = makeLevel({ lineCounts: { Orange: 0, Blue: 0, Green: 0, Purple: 0 } });
    let state: GameState = createInitialState(level);

    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );

    expect(state.lines).toHaveLength(0);
    expect(state.drag).toBeNull();
  });
});

describe('updateGame: rotating and repositioning Lines', () => {
  function makeStateWithLine(): GameState {
    const level = makeLevel({ lineCounts: { Orange: 1, Blue: 0, Green: 0, Purple: 0 } });
    let state = createInitialState(level);
    state = {
      ...state,
      lines: [{ id: 0, colour: 'Orange', a: { x: -2, y: 0 }, b: { x: 2, y: 0 } }],
      nextLineId: 1,
    };
    return state;
  }

  it('dragging a LineHandle rotates the Line around its other end', () => {
    let state = makeStateWithLine();

    // Grab the handle at b (2, 0) and move it, leaving a (-2, 0) fixed.
    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 2, y: 0 } }]),
      0.016,
    );
    state = updateGame(
      state,
      withPointerEvents([{ type: 'move', pointerId: 1, position: { x: 0, y: 4 } }]),
      0.016,
    );

    expect(state.lines[0].a).toEqual({ x: -2, y: 0 });
    expect(state.lines[0].b).toEqual({ x: 0, y: 4 });
  });

  it('dragging the LineMiddle translates both endpoints without changing the angle', () => {
    let state = makeStateWithLine();

    // Grab the middle at the segment's centre (0, 0) and drag it.
    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );
    state = updateGame(
      state,
      withPointerEvents([{ type: 'move', pointerId: 1, position: { x: 1, y: 3 } }]),
      0.016,
    );

    expect(state.lines[0].a).toEqual({ x: -1, y: 3 });
    expect(state.lines[0].b).toEqual({ x: 3, y: 3 });
  });
});

describe('updateGame: deleting Lines', () => {
  it('deletes a flicked Line and refunds its LineCounts budget', () => {
    const level = makeLevel({ lineCounts: { Orange: 1, Blue: 0, Green: 0, Purple: 0 } });
    let state: GameState = createInitialState(level);
    state = {
      ...state,
      lines: [{ id: 0, colour: 'Orange', a: { x: -2, y: 0 }, b: { x: 2, y: 0 } }],
      remainingLineCounts: { Orange: 0, Blue: 0, Green: 0, Purple: 0 },
      nextLineId: 1,
    };

    // Grab the middle, then release it moving far enough in one small
    // deltaTime to exceed the flick-delete speed threshold.
    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );
    const flickDistance = (LINE_FLICK_DELETE_SPEED + 5) * 0.016;
    state = updateGame(
      state,
      withPointerEvents([{ type: 'up', pointerId: 1, position: { x: flickDistance, y: 0 } }]),
      0.016,
    );

    expect(state.lines).toHaveLength(0);
    expect(state.remainingLineCounts.Orange).toBe(1);
    expect(state.drag).toBeNull();
  });

  it('discards a Line released too short to be useful (e.g. a tap with no drag), refunding its budget', () => {
    const level = makeLevel({ lineCounts: { Orange: 1, Blue: 0, Green: 0, Purple: 0 } });
    let state: GameState = createInitialState(level);

    // A tap on empty space with no drag in between: down and up at the same position.
    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );
    state = updateGame(
      state,
      withPointerEvents([{ type: 'up', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );

    expect(state.lines).toHaveLength(0);
    expect(state.remainingLineCounts.Orange).toBe(1);
  });

  it('lets go of a slowly-released Line without deleting it', () => {
    const level = makeLevel({ lineCounts: { Orange: 1, Blue: 0, Green: 0, Purple: 0 } });
    let state: GameState = createInitialState(level);
    state = {
      ...state,
      lines: [{ id: 0, colour: 'Orange', a: { x: -2, y: 0 }, b: { x: 2, y: 0 } }],
      remainingLineCounts: { Orange: 0, Blue: 0, Green: 0, Purple: 0 },
      nextLineId: 1,
    };

    state = updateGame(
      state,
      withPointerEvents([{ type: 'down', pointerId: 1, position: { x: 0, y: 0 } }]),
      0.016,
    );
    state = updateGame(
      state,
      withPointerEvents([{ type: 'up', pointerId: 1, position: { x: 0.01, y: 0 } }]),
      0.016,
    );

    expect(state.lines).toHaveLength(1);
    expect(state.remainingLineCounts.Orange).toBe(0);
  });
});

describe('updateGame: Balls vs Lines', () => {
  it('bounces a Ball off a Line regardless of colour match, preserving speed', () => {
    const level = makeLevel({ lineCounts: { Orange: 0, Blue: 0, Green: 0, Purple: 0 } });
    let state: GameState = createInitialState(level);
    state = {
      ...state,
      lines: [{ id: 0, colour: 'Blue', a: { x: 5, y: -5 }, b: { x: 5, y: 5 } }],
      balls: [
        {
          id: 0,
          position: { x: 5 - 0.25 - BALL_RADIUS - 0.01, y: 0 },
          velocity: { x: BALL_SPEED, y: 0 },
          colour: 'Orange',
        },
      ],
    };

    state = updateGame(state, NO_INPUT, 0.05);

    const ball = state.balls[0];
    expect(ball.velocity.x).toBeLessThan(0);
    expect(Math.hypot(ball.velocity.x, ball.velocity.y)).toBeCloseTo(BALL_SPEED);
  });
});
