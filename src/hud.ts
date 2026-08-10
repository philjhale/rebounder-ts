import type { LineCounts } from './types';
import { remainingLinesSprite } from './sprites';
import { required } from './dom';

const HUD_COLOURS = ['Orange', 'Blue', 'Green', 'Purple'] as const;

export interface HudOptions {
  onPause: () => void;
}

export interface Hud {
  /** Refreshes the remaining-line indicators. Call every frame from the game loop. */
  update: (counts: LineCounts) => void;
}

/**
 * Renders the in-game HUD (per-colour remaining-line indicators top-left,
 * pause button top-right) into `container`, replacing its contents.
 *
 * A stable 4-slot layout is always rendered — colours a level doesn't use
 * simply count down to (and stay at) zero, greyed out. The HUD owns no
 * gameplay state of its own; `update()` is a pure read of the caller's
 * `GameState.remainingLineCounts` each frame (issue #46).
 */
export function renderHud(container: HTMLElement, options: HudOptions): Hud {
  container.innerHTML = `
    <div class="hud__remaining" data-testid="hud-remaining">
      ${HUD_COLOURS.map(
        (colour) => `
        <div class="hud__remaining-slot" data-testid="hud-remaining-${colour}">
          <img class="hud__remaining-icon" src="/sprites/${remainingLinesSprite(colour)}.png" alt="${colour}" />
          <span class="hud__remaining-count" data-testid="hud-remaining-count-${colour}"></span>
        </div>
      `,
      ).join('')}
    </div>
    <button type="button" class="hud__pause-button" data-testid="hud-pause-button" aria-label="Pause">
      <img src="/sprites/GUI_Pause.png" alt="" />
    </button>
  `;

  const pauseButton = required(
    container.querySelector<HTMLButtonElement>('[data-testid="hud-pause-button"]'),
    'hud-pause-button element not found after render',
  );
  pauseButton.addEventListener('click', options.onPause);

  const slots = HUD_COLOURS.map((colour) => ({
    colour,
    slot: required(
      container.querySelector<HTMLDivElement>(`[data-testid="hud-remaining-${colour}"]`),
      `hud-remaining-${colour} element not found after render`,
    ),
    count: required(
      container.querySelector<HTMLSpanElement>(`[data-testid="hud-remaining-count-${colour}"]`),
      `hud-remaining-count-${colour} element not found after render`,
    ),
  }));

  function update(counts: LineCounts): void {
    for (const { colour, slot, count } of slots) {
      const remaining = counts[colour];
      count.textContent = String(remaining);
      slot.classList.toggle('hud__remaining-slot--empty', remaining <= 0);
    }
  }

  return { update };
}
