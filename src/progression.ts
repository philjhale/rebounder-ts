import { getHighestUnlockedIndex, recordLevelComplete } from './save';

/**
 * Derived picker state for a single level, relative to the current frontier
 * pointer:
 * - `done`: the player has completed it (and may replay it).
 * - `current`: the frontier — the furthest level unlocked but not yet
 *   completed.
 * - `locked`: not yet reachable.
 */
export type LevelState = 'done' | 'current' | 'locked';

/**
 * Pure gating step. Given the current "highest unlocked" pointer and the
 * index of a level that was just completed, compute the new pointer.
 *
 * Progression is strictly linear: completing level `completedIndex` unlocks
 * `completedIndex + 1`. The pointer is monotonic — replaying an earlier
 * level (or re-completing one at/behind the frontier) never moves it
 * backwards.
 *
 * This function knows nothing about storage or the level array's length;
 * callers that need to clamp to the last level (see #41's
 * `recordLevelComplete`) do so themselves.
 */
export function computeNextPointer(currentPointer: number, completedIndex: number): number {
  return Math.max(currentPointer, completedIndex + 1);
}

/**
 * Pure derivation of a level's picker state from the frontier pointer.
 * Every level with `levelIndex <= pointer` is playable (done or current);
 * anything past it is locked.
 */
export function getLevelState(pointer: number, levelIndex: number): LevelState {
  if (levelIndex < pointer) return 'done';
  if (levelIndex === pointer) return 'current';
  return 'locked';
}

/** Whether `levelIndex` is currently playable (done or current, not locked). */
export function isPlayable(pointer: number, levelIndex: number): boolean {
  return levelIndex <= pointer;
}

/**
 * Current frontier pointer, read from #41's save API. This is the only
 * place progression state is persisted — there is no separate storage
 * mechanism for the picker.
 */
export function getFrontierPointer(): number {
  return getHighestUnlockedIndex();
}

/**
 * Record that the level at `index` was completed, persisting via #41's save
 * API (`recordLevelComplete`), which itself applies `computeNextPointer`'s
 * logic and clamps to the level array's bounds.
 */
export function completeLevel(index: number): void {
  recordLevelComplete(index);
}
