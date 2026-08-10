import './style.css';
import { loadSprites } from './sprites';
import { renderLevel, CANVAS_WIDTH, CANVAS_HEIGHT } from './render';
import { attachPointerInput } from './input';
import { createInitialState, updateGame, type GameState, type PointerInputEvent } from './simulation';
import { completeLevel } from './progression';
import { renderLevelPicker } from './levelPicker';
import {
  renderTitleScreen,
  renderHowToPlayScreen,
  renderCreditsScreen,
  renderAllLevelsCompleteScreen,
} from './screens';
import { hasSeenHowToPlay, setHasSeenHowToPlay } from './save';
import { levels } from './levels';
import { required } from './dom';

const app = required(document.querySelector<HTMLDivElement>('#app'), '#app element not found');

let activeGameLoop: { stop: () => void } | null = null;

type Screen =
  | { name: 'title' }
  | { name: 'howToPlay' }
  | { name: 'credits' }
  | { name: 'picker' }
  | { name: 'level'; index: number }
  | { name: 'allLevelsComplete' };

function goTo(screen: Screen): void {
  activeGameLoop?.stop();
  activeGameLoop = null;

  switch (screen.name) {
    case 'title':
      renderTitleScreen(app, {
        onPlay: () => { goTo({ name: 'picker' }); },
        onHowToPlay: () => { goTo({ name: 'howToPlay' }); },
        onCredits: () => { goTo({ name: 'credits' }); },
      });
      return;
    case 'howToPlay':
      renderHowToPlayScreen(app, {
        onContinue: () => {
          setHasSeenHowToPlay(true);
          goTo({ name: 'title' });
        },
      });
      return;
    case 'credits':
      renderCreditsScreen(app, { onBack: () => { goTo({ name: 'title' }); } });
      return;
    case 'picker':
      renderLevelPicker(app, {
        onSelectLevel: (_level, index) => { goTo({ name: 'level', index }); },
        onBack: () => { goTo({ name: 'title' }); },
      });
      return;
    case 'level':
      void showLevel(screen.index);
      return;
    case 'allLevelsComplete':
      renderAllLevelsCompleteScreen(app, { onBackToLevels: () => { goTo({ name: 'picker' }); } });
      return;
  }
}

async function showLevel(index: number): Promise<void> {
  const level = levels[index];

  app.innerHTML = `
    <div class="level-screen">
      <button type="button" class="back-button">&larr; Levels</button>
      <canvas width="${String(CANVAS_WIDTH)}" height="${String(CANVAS_HEIGHT)}"></canvas>
      <div class="overlay overlay--hidden" data-testid="pause-overlay">
        <div class="overlay__panel">
          <h2>Paused</h2>
          <button type="button" class="overlay__button" data-action="resume">Resume</button>
          <button type="button" class="overlay__button" data-action="restart">Restart</button>
          <button type="button" class="overlay__button" data-action="back-to-levels">Back to Levels</button>
        </div>
      </div>
      <div class="overlay overlay--hidden" data-testid="level-complete-overlay">
        <div class="overlay__panel">
          <h2>Level Complete!</h2>
          <button type="button" class="overlay__button" data-action="next-level">Next Level</button>
          <button type="button" class="overlay__button" data-action="back-to-levels">Back to Levels</button>
        </div>
      </div>
    </div>
  `;

  const backButton = required(
    app.querySelector<HTMLButtonElement>('.back-button'),
    '.back-button element not found',
  );
  backButton.addEventListener('click', () => { goTo({ name: 'picker' }); });

  const canvas = required(
    app.querySelector<HTMLCanvasElement>('canvas'),
    'canvas element not found',
  );
  const ctx = required(canvas.getContext('2d'), 'could not get 2d context');

  const pauseOverlay = required(
    app.querySelector<HTMLDivElement>('[data-testid="pause-overlay"]'),
    'pause-overlay element not found',
  );
  const completeOverlay = required(
    app.querySelector<HTMLDivElement>('[data-testid="level-complete-overlay"]'),
    'level-complete-overlay element not found',
  );

  function requireAction(overlay: HTMLElement, action: string): HTMLButtonElement {
    return required(
      overlay.querySelector<HTMLButtonElement>(`[data-action="${action}"]`),
      `[data-action="${action}"] element not found`,
    );
  }

  const sprites = await loadSprites();

  let state: GameState = createInitialState(level);
  let stopped = false;
  let paused = false;
  let lastTime: number | null = null;
  let pendingPointerEvents: PointerInputEvent[] = [];

  const detachPointerInput = attachPointerInput(canvas, (event) => {
    if (paused || state.levelComplete) return;
    pendingPointerEvents.push(event);
  });

  let completionRecorded = false;

  function openPause(): void {
    if (paused || state.levelComplete) return;
    paused = true;
    pauseOverlay.classList.remove('overlay--hidden');
  }

  function closePause(): void {
    paused = false;
    pauseOverlay.classList.add('overlay--hidden');
    // Drop the stale rAF timestamp so the next tick doesn't compute a huge
    // deltaTime spanning the paused wall-clock time.
    lastTime = null;
  }

  // Restart resets in-memory GameState only — no interaction with the save
  // module, per #45's spec (restart is a pure gameplay reset).
  function restartLevel(): void {
    state = createInitialState(level);
    completionRecorded = false;
    pendingPointerEvents = [];
    closePause();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || state.levelComplete) return;
    if (paused) closePause();
    else openPause();
  }
  window.addEventListener('keydown', handleKeydown);

  requireAction(pauseOverlay, 'resume').addEventListener('click', closePause);
  requireAction(pauseOverlay, 'restart').addEventListener('click', restartLevel);
  requireAction(pauseOverlay, 'back-to-levels').addEventListener('click', () => { goTo({ name: 'picker' }); });

  requireAction(completeOverlay, 'next-level').addEventListener('click', () => {
    const nextIndex = index + 1;
    if (nextIndex >= levels.length) goTo({ name: 'allLevelsComplete' });
    else goTo({ name: 'level', index: nextIndex });
  });
  requireAction(completeOverlay, 'back-to-levels').addEventListener('click', () => { goTo({ name: 'picker' }); });

  function tick(time: number) {
    if (stopped) return;

    if (!paused) {
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

      // Record progress once, on the transition into completion, and show
      // the Level Complete overlay (the canvas stays mounted underneath it).
      if (!wasComplete && state.levelComplete && !completionRecorded) {
        completionRecorded = true;
        completeLevel(index);
        completeOverlay.classList.remove('overlay--hidden');
      }
    }

    requestAnimationFrame(tick);
  }

  activeGameLoop = {
    stop: () => {
      stopped = true;
      detachPointerInput();
      window.removeEventListener('keydown', handleKeydown);
    },
  };
  requestAnimationFrame(tick);
}

goTo(hasSeenHowToPlay() ? { name: 'title' } : { name: 'howToPlay' });
