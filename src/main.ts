import './style.css';
import { levels } from './levels';
import { loadSprites } from './sprites';
import { renderLevel, CANVAS_WIDTH, CANVAS_HEIGHT } from './render';
import { attachPointerInput } from './input';
import { createInitialState, updateGame, type GameState, type PointerInputEvent } from './simulation';
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

  app.innerHTML = `
    <h1>Rebounder</h1>
    <ul class="level-picker">
      ${levels
        .map((level) => `<li><button data-level-id="${level.id}">${level.name}</button></li>`)
        .join('')}
    </ul>
  `;

  app.querySelectorAll<HTMLButtonElement>('button[data-level-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const level = levels.find((l) => l.id === button.dataset.levelId);
      if (level) void showLevel(level);
    });
  });
}

async function showLevel(level: Level) {
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

  function tick(time: number) {
    if (stopped) return;
    const deltaTime = lastTime === null ? 0 : (time - lastTime) / 1000;
    lastTime = time;

    state = updateGame(state, { pointerEvents: pendingPointerEvents }, deltaTime);
    pendingPointerEvents = [];
    renderLevel(ctx, level, sprites, state.balls, state.targets, state.lines);

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
