import './style.css';
import { levels } from './levels';
import { loadSprites } from './sprites';
import { renderLevel, CANVAS_WIDTH, CANVAS_HEIGHT } from './render';
import type { Level } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;

function showPicker() {
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
      if (level) showLevel(level);
    });
  });
}

async function showLevel(level: Level) {
  app.innerHTML = `
    <button class="back-button">&larr; Levels</button>
    <canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
  `;

  app.querySelector('.back-button')!.addEventListener('click', showPicker);

  const canvas = app.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const sprites = await loadSprites();
  renderLevel(ctx, level, sprites);
}

showPicker();
