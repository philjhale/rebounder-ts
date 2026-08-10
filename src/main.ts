import './style.css';
import { loadSprites } from './sprites';
import { renderLevel, CANVAS_WIDTH, CANVAS_HEIGHT } from './render';
import { attachPointerInput } from './input';
import { createInitialState, updateGame, type GameState, type PointerInputEvent } from './simulation';
import { completeLevel } from './progression';
import { renderLevelPicker } from './levelPicker';
import type { Level } from './types';

function required<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message);
  return value;
}

const app = required(document.querySelector<HTMLDivElement>('#app'), '#app element not found');

let activeGameLoop: { stop: () => void } | null = null;

function showPicker() {
  activeGameLoop?.stop();
  activeGameLoop = null;

  renderLevelPicker(app, {
    onSelectLevel: (level, index) => void showLevel(level, index),
  });
}

async function showLevel(level: Level, index: number) {
  app.innerHTML = `
    <button class="back-button">&larr; Levels</button>
    <canvas width="${String(CANVAS_WIDTH)}" height="${String(CANVAS_HEIGHT)}"></canvas>
  `;

  const backButton = required(
    app.querySelector<HTMLButtonElement>('.back-button'),
    '.back-button element not found',
  );
  backButton.addEventListener('click', showPicker);

  const canvas = required(
    app.querySelector<HTMLCanvasElement>('canvas'),
    'canvas element not found',
  );
  const ctx = required(canvas.getContext('2d'), 'could not get 2d context');
  const sprites = await loadSprites();

  let state: GameState = createInitialState(level);
  let stopped = false;
  let lastTime: number | null = null;
  let pendingPointerEvents: PointerInputEvent[] = [];

  const detachPointerInput = attachPointerInput(canvas, (event) => {
    pendingPointerEvents.push(event);
  });

  let completionRecorded = false;

  function tick(time: number) {
    if (stopped) return;
    const deltaTime = lastTime === null ? 0 : (time - lastTime) / 1000;
    lastTime = time;

    const wasComplete = state.levelComplete;
    state = updateGame(state, { pointerEvents: pendingPointerEvents }, deltaTime);
    pendingPointerEvents = [];
    // `time` is the rAF-supplied DOMHighResTimeStamp (ms since page load) —
    // reused directly as the animator's elapsed-time clock rather than
    // introducing a second accumulator, since animation is presentation-only
    // and doesn't need to reset with level/game state (see animatedSpriteName
    // in sprites.ts).
    renderLevel(ctx, level, sprites, state.balls, state.targets, state.lines, time / 1000);

    // Record progress once, on the transition into completion, so the
    // picker (issue #44) reflects the newly-unlocked level on return. #45
    // (menu flow) owns any "level complete" screen/transition — this just
    // persists the gating pointer via #41's save API.
    if (!wasComplete && state.levelComplete && !completionRecorded) {
      completionRecorded = true;
      completeLevel(index);
    }

    requestAnimationFrame(tick);
  }

  activeGameLoop = {
    stop: () => {
      stopped = true;
      detachPointerInput();
    },
  };
  requestAnimationFrame(tick);
}

showPicker();
