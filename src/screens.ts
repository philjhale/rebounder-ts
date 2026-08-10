/**
 * Render functions for the menu-flow screens that are static DOM/CSS chrome
 * (ADR 0006) with no game-loop or picker state of their own: `title`,
 * `howToPlay`, `credits`, and `allLevelsComplete`. The `picker` screen is
 * `renderLevelPicker` (levelPicker.ts) and the `level` screen (plus its
 * Pause/Level Complete overlays) lives in main.ts alongside the game loop
 * it's coupled to. main.ts's `Screen` state machine owns when each of these
 * is shown.
 */

export interface TitleScreenOptions {
  onPlay: () => void;
  onHowToPlay: () => void;
  onCredits: () => void;
}

export function renderTitleScreen(container: HTMLElement, options: TitleScreenOptions): void {
  container.innerHTML = `
    <div class="menu-screen" data-testid="title-screen">
      <h1>Rebounder</h1>
      <button type="button" class="menu-screen__button" data-action="play">Play</button>
      <button type="button" class="menu-screen__button" data-action="how-to-play">How To Play</button>
      <button type="button" class="menu-screen__button" data-action="credits">Credits</button>
    </div>
  `;

  container
    .querySelector<HTMLButtonElement>('[data-action="play"]')
    ?.addEventListener('click', options.onPlay);
  container
    .querySelector<HTMLButtonElement>('[data-action="how-to-play"]')
    ?.addEventListener('click', options.onHowToPlay);
  container
    .querySelector<HTMLButtonElement>('[data-action="credits"]')
    ?.addEventListener('click', options.onCredits);
}

export interface HowToPlayScreenOptions {
  onContinue: () => void;
}

export function renderHowToPlayScreen(
  container: HTMLElement,
  options: HowToPlayScreenOptions,
): void {
  container.innerHTML = `
    <div class="menu-screen" data-testid="how-to-play-screen">
      <h1>How To Play</h1>
      <p>Drag from a Line's end to rotate it, or drag its middle to move it. Lines deflect
      Balls of their own colour into matching Targets.</p>
      <p>Tap a Launcher to toggle every Launcher on the level on or off. Press and hold a
      Launcher, then release, to clear every Ball currently in play.</p>
      <p>Get every Target to 5 hits at once to complete the level.</p>
      <button type="button" class="menu-screen__button" data-action="continue">Continue</button>
    </div>
  `;

  container
    .querySelector<HTMLButtonElement>('[data-action="continue"]')
    ?.addEventListener('click', options.onContinue);
}

export interface CreditsScreenOptions {
  onBack: () => void;
}

export function renderCreditsScreen(container: HTMLElement, options: CreditsScreenOptions): void {
  container.innerHTML = `
    <div class="menu-screen" data-testid="credits-screen">
      <h1>Credits</h1>
      <p>Rebounder — a browser port of the original Unity game.</p>
      <button type="button" class="menu-screen__button" data-action="back">Back</button>
    </div>
  `;

  container
    .querySelector<HTMLButtonElement>('[data-action="back"]')
    ?.addEventListener('click', options.onBack);
}

export interface AllLevelsCompleteScreenOptions {
  onBackToLevels: () => void;
}

export function renderAllLevelsCompleteScreen(
  container: HTMLElement,
  options: AllLevelsCompleteScreenOptions,
): void {
  container.innerHTML = `
    <div class="menu-screen" data-testid="all-levels-complete-screen">
      <h1>All Levels Complete!</h1>
      <p>You've finished every level in Rebounder.</p>
      <button type="button" class="menu-screen__button" data-action="back-to-levels">Back to Levels</button>
    </div>
  `;

  container
    .querySelector<HTMLButtonElement>('[data-action="back-to-levels"]')
    ?.addEventListener('click', options.onBackToLevels);
}
