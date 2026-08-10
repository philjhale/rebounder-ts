import { levels } from './levels';
import { getFrontierPointer, getLevelState } from './progression';
import type { Level } from './types';

export interface LevelPickerOptions {
  /** Invoked when the player picks a done or current (playable) level. */
  onSelectLevel: (level: Level, index: number) => void;
  /** Invoked when the player navigates back to the title screen. */
  onBack: () => void;
}

/**
 * Renders the level picker overlay (ADR 0006: DOM-over-canvas UI chrome)
 * into `container`, replacing its contents.
 *
 * This is a self-contained render function, not a mounted component with
 * its own lifecycle or app-level navigation state — issue #45 (menu flow)
 * owns deciding when the picker is shown/hidden. Call it again (e.g. after
 * returning from a level) to refresh state against the latest save data.
 *
 * Locked levels render with no click handler attached at all, so they are
 * non-interactive by construction rather than merely disabled via CSS.
 */
export function renderLevelPicker(container: HTMLElement, options: LevelPickerOptions): void {
  const pointer = getFrontierPointer();

  container.innerHTML = `
    <button type="button" class="back-button" data-testid="picker-back-button">&larr; Title</button>
    <h1>Rebounder</h1>
    <ul class="level-picker" data-testid="level-picker"></ul>
  `;

  const backButton = container.querySelector<HTMLButtonElement>('[data-testid="picker-back-button"]');
  if (!backButton) throw new Error('picker-back-button element not found after render');
  backButton.addEventListener('click', options.onBack);

  const list = container.querySelector<HTMLUListElement>('.level-picker');
  if (!list) throw new Error('.level-picker element not found after render');

  let frontierIndex = -1;

  levels.forEach((level, index) => {
    const state = getLevelState(pointer, index);

    const item = document.createElement('li');
    item.className = `level-picker__entry level-picker__entry--${state}`;
    item.dataset.levelState = state;

    if (state === 'locked') {
      // Fully non-interactive: no button, no click handler — not just a
      // disabled/greyed-out control.
      const label = document.createElement('span');
      label.className = 'level-picker__label';
      label.textContent = level.name;
      item.appendChild(label);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'level-picker__button';
      button.dataset.levelId = level.id;
      button.textContent = level.name;
      button.addEventListener('click', () => {
        options.onSelectLevel(level, index);
      });
      item.appendChild(button);
    }

    list.appendChild(item);

    if (state === 'current') {
      frontierIndex = index;
    }
  });

  if (frontierIndex >= 0) {
    list.children[frontierIndex].scrollIntoView({ block: 'center' });
  }
}
