import './style.css';
import { levels } from './levels';
import { loadSprites } from './sprites';
import { renderLevel, CANVAS_WIDTH, CANVAS_HEIGHT } from './render';
import { attachPointerInput } from './input';
import { createInitialState, updateGame, type GameState, type PointerInputEvent } from './simulation';
import type { Level } from './types';
// PROTOTYPE — wayfinder ticket #29 (Canvas2D vs DOM overlay). Throwaway.
import { drawPauseOverlayCanvas, drawRemainingLinesHudCanvas, hitTestResumeButton } from './prototype-ui-approach/canvasVariant';
import { mountDomOverlay, type DomOverlayHandles } from './prototype-ui-approach/domVariant';
import { getUiVariant, mountSwitcher, type UiVariant } from './prototype-ui-approach/switcher';

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
    <button class="prototype-pause-toggle">Toggle Pause (prototype)</button>
    <div class="prototype-canvas-host" style="position: relative;">
      <canvas width="${String(CANVAS_WIDTH)}" height="${String(CANVAS_HEIGHT)}"></canvas>
    </div>
  `;

  const backButton = required(
    app.querySelector<HTMLButtonElement>('.back-button'),
    '.back-button element not found',
  );
  backButton.addEventListener('click', showPicker);

  const canvasHost = required(
    app.querySelector<HTMLDivElement>('.prototype-canvas-host'),
    '.prototype-canvas-host element not found',
  );
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

  // PROTOTYPE — wayfinder ticket #29. `paused` here is a standalone toggle
  // for comparing overlay approaches, not a real pause feature.
  let paused = false;
  let uiVariant: UiVariant = getUiVariant();
  let domOverlay: DomOverlayHandles | null = null;

  function resume() {
    paused = false;
  }

  function teardownDomOverlay() {
    domOverlay?.destroy();
    domOverlay = null;
  }

  function setupVariant(variant: UiVariant) {
    teardownDomOverlay();
    if (variant === 'dom') {
      domOverlay = mountDomOverlay(canvasHost, resume);
    }
  }

  setupVariant(uiVariant);

  const pauseToggle = required(
    app.querySelector<HTMLButtonElement>('.prototype-pause-toggle'),
    '.prototype-pause-toggle element not found',
  );
  pauseToggle.addEventListener('click', () => {
    paused = !paused;
  });

  mountSwitcher(app, uiVariant, (variant) => {
    uiVariant = variant;
    setupVariant(variant);
  });

  const detachPointerInput = attachPointerInput(canvas, (event) => {
    pendingPointerEvents.push(event);
  });

  canvas.addEventListener('click', (event) => {
    if (uiVariant !== 'canvas' || !paused) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    if (hitTestResumeButton(x, y)) resume();
  });

  function tick(time: number) {
    if (stopped) return;
    const deltaTime = lastTime === null ? 0 : (time - lastTime) / 1000;
    lastTime = time;

    if (!paused) {
      state = updateGame(state, { pointerEvents: pendingPointerEvents }, deltaTime);
    }
    pendingPointerEvents = [];
    renderLevel(ctx, level, sprites, state.balls, state.targets, state.lines);

    if (uiVariant === 'canvas') {
      drawRemainingLinesHudCanvas(ctx, state.remainingLineCounts);
      drawPauseOverlayCanvas(ctx, paused);
    } else {
      domOverlay?.setRemaining(state.remainingLineCounts);
      domOverlay?.setPaused(paused);
    }

    requestAnimationFrame(tick);
  }

  activeGameLoop = {
    stop: () => {
      stopped = true;
      detachPointerInput();
      teardownDomOverlay();
    },
  };
  requestAnimationFrame(tick);
}

showPicker();
