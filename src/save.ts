import { levels } from './levels';

const STORAGE_KEY = 'rebounder:save';

interface SaveData {
  highestUnlockedLevelId: string;
  hasSeenHowToPlay: boolean;
}

function defaultSave(): SaveData {
  return {
    highestUnlockedLevelId: levels[0].id,
    hasSeenHowToPlay: false,
  };
}

// In-memory fallback used for the whole session when localStorage throws or
// is absent (e.g. private browsing). Not persisted across reloads — that
// degradation is accepted, see ADR 0008.
const memoryStore = new Map<string, string>();

function readStorageValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function writeStorageValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.highestUnlockedLevelId === 'string' &&
    typeof candidate.hasSeenHowToPlay === 'boolean'
  );
}

function loadSave(): SaveData {
  const raw = readStorageValue(STORAGE_KEY);
  if (raw === null) return defaultSave();
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSaveData(parsed) ? parsed : defaultSave();
  } catch {
    return defaultSave();
  }
}

function writeSave(data: SaveData): void {
  writeStorageValue(STORAGE_KEY, JSON.stringify(data));
}

/** Index into `levels` of the highest level the player has unlocked. */
export function getHighestUnlockedIndex(): number {
  const data = loadSave();
  const index = levels.findIndex((level) => level.id === data.highestUnlockedLevelId);
  return index === -1 ? 0 : index;
}

/**
 * Record that the level at `index` was completed, unlocking the next level
 * if it isn't already unlocked. Never regresses existing progress.
 */
export function recordLevelComplete(index: number): void {
  const nextIndex = index + 1;
  if (nextIndex < 0 || nextIndex >= levels.length) return;

  const currentUnlockedIndex = getHighestUnlockedIndex();
  if (nextIndex <= currentUnlockedIndex) return;

  const data = loadSave();
  data.highestUnlockedLevelId = levels[nextIndex].id;
  writeSave(data);
}

export function hasSeenHowToPlay(): boolean {
  return loadSave().hasSeenHowToPlay;
}

export function setHasSeenHowToPlay(seen: boolean): void {
  const data = loadSave();
  data.hasSeenHowToPlay = seen;
  writeSave(data);
}
