import type { LineCounts } from './types';
import { remainingLinesSprite, spritePath } from './sprites';
import { required } from './dom';

const PAUSE_ICON_PATH = spritePath('GUI_Pause');

const HUD_COLOURS = ['Orange', 'Blue', 'Green', 'Purple'] as const;

export interface HudOptions {
  onPause: () => void;
}

export interface Hud {
  /** Refreshes the remaining-line indicators. Call every frame from the game loop. */
  update: (counts: LineCounts) => void;
}

export interface RemainingSlot {
  colour: keyof LineCounts;
  /** This slot's position among slots of the same colour, e.g. the 2nd Orange slot is 1. */
  indexWithinColour: number;
}

/**
 * The initial HUD layout for a level's line budget: one slot per Line the
 * player starts with, grouped by Colour in fixed Orange/Blue/Green/Purple
 * order. Colours with a count of zero contribute no slots.
 */
export function layoutRemainingSlots(counts: LineCounts): RemainingSlot[] {
  return HUD_COLOURS.flatMap((colour) =>
    Array.from({ length: counts[colour] }, (_, indexWithinColour) => ({ colour, indexWithinColour })),
  );
}

/** Whether a given slot should render as used up, given the current remaining counts. */
export function isSlotEmpty(counts: LineCounts, { colour, indexWithinColour }: RemainingSlot): boolean {
  return indexWithinColour >= counts[colour];
}

function slotTestId({ colour, indexWithinColour }: RemainingSlot): string {
  return `hud-remaining-${colour}-${String(indexWithinColour)}`;
}

/**
 * Renders the in-game HUD (per-Line remaining indicators top-left, grouped
 * by Colour; pause button top-right) into `container`, replacing its
 * contents.
 *
 * The slot layout is fixed at render time from `initialCounts` — one slot
 * per Line the player starts the level with — and never grows or shrinks.
 * `update()` only toggles individual slots empty as their Line is drawn; it
 * is a pure read of the caller's `GameState.remainingLineCounts` each frame
 * (issue #46).
 */
export function renderHud(container: HTMLElement, options: HudOptions, initialCounts: LineCounts): Hud {
  const layout = layoutRemainingSlots(initialCounts);

  container.innerHTML = `
    <div class="hud__remaining" data-testid="hud-remaining">
      ${layout
        .map(
          (remainingSlot) => `
        <div class="hud__remaining-slot" data-testid="${slotTestId(remainingSlot)}">
          <img class="hud__remaining-icon" src="${spritePath(remainingLinesSprite(remainingSlot.colour))}" alt="${remainingSlot.colour}" />
        </div>
      `,
        )
        .join('')}
    </div>
    <button type="button" class="hud__pause-button" data-testid="hud-pause-button" aria-label="Pause">
      <img src="${PAUSE_ICON_PATH}" alt="" />
    </button>
  `;

  const pauseButton = required(
    container.querySelector<HTMLButtonElement>('[data-testid="hud-pause-button"]'),
    'hud-pause-button element not found after render',
  );
  pauseButton.addEventListener('click', options.onPause);

  const slots = layout.map((remainingSlot) => ({
    remainingSlot,
    slot: required(
      container.querySelector<HTMLDivElement>(`[data-testid="${slotTestId(remainingSlot)}"]`),
      `${slotTestId(remainingSlot)} element not found after render`,
    ),
  }));

  function update(counts: LineCounts): void {
    for (const { remainingSlot, slot } of slots) {
      slot.classList.toggle('hud__remaining-slot--empty', isSlotEmpty(counts, remainingSlot));
    }
  }

  return { update };
}
