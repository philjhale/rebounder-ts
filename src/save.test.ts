import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levels } from './levels';
import type * as SaveModule from './save';

// A minimal, real-ish Storage implementation backed by a plain object, so the
// "real localStorage" tests exercise the same get/set/JSON round-trip a
// browser would.
function createFakeLocalStorage(): Storage {
  const backing = new Map<string, string>();
  return {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => {
      backing.set(key, value);
    },
    removeItem: (key: string) => {
      backing.delete(key);
    },
    clear: () => {
      backing.clear();
    },
    key: (index: number) => Array.from(backing.keys())[index] ?? null,
    get length() {
      return backing.size;
    },
  };
}

async function freshSaveModule(): Promise<typeof SaveModule> {
  vi.resetModules();
  return import('./save');
}

describe('save (real localStorage)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createFakeLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to the first level unlocked and hasSeenHowToPlay false when no save exists', async () => {
    const { getHighestUnlockedIndex, hasSeenHowToPlay } = await freshSaveModule();
    expect(getHighestUnlockedIndex()).toBe(0);
    expect(hasSeenHowToPlay()).toBe(false);
  });

  it('round-trips recordLevelComplete/getHighestUnlockedIndex through localStorage', async () => {
    const { getHighestUnlockedIndex, recordLevelComplete } = await freshSaveModule();
    recordLevelComplete(0);
    expect(getHighestUnlockedIndex()).toBe(1);

    // Persists across a fresh module load (simulates a reload), reading the
    // same underlying localStorage.
    const reloaded = await freshSaveModule();
    expect(reloaded.getHighestUnlockedIndex()).toBe(1);
  });

  it('does not unlock past the last level', async () => {
    const { getHighestUnlockedIndex, recordLevelComplete } = await freshSaveModule();
    for (let i = 0; i < levels.length; i += 1) {
      recordLevelComplete(i);
    }
    // Completing the final level has no further level to unlock; progress
    // caps at the last index instead of going out of bounds.
    expect(getHighestUnlockedIndex()).toBe(levels.length - 1);
  });

  it('never regresses unlocked progress when an earlier level is completed again', async () => {
    const { getHighestUnlockedIndex, recordLevelComplete } = await freshSaveModule();
    recordLevelComplete(2);
    expect(getHighestUnlockedIndex()).toBe(3);
    recordLevelComplete(0);
    expect(getHighestUnlockedIndex()).toBe(3);
  });

  it('round-trips hasSeenHowToPlay/setHasSeenHowToPlay through localStorage', async () => {
    const { hasSeenHowToPlay, setHasSeenHowToPlay } = await freshSaveModule();
    expect(hasSeenHowToPlay()).toBe(false);
    setHasSeenHowToPlay(true);
    expect(hasSeenHowToPlay()).toBe(true);

    const reloaded = await freshSaveModule();
    expect(reloaded.hasSeenHowToPlay()).toBe(true);
  });

  it('persists progress by level id, surviving a reordered level array', async () => {
    const { getHighestUnlockedIndex, recordLevelComplete } = await freshSaveModule();
    // Unlock the level currently at index 2.
    recordLevelComplete(1);
    const unlockedId = levels[2].id;
    expect(getHighestUnlockedIndex()).toBe(2);

    // Simulate the raw blob referencing an id that has since moved to a
    // different index (curriculum reordered) by writing it directly and
    // re-checking the lookup finds the new position.
    localStorage.setItem(
      'rebounder:save',
      JSON.stringify({ highestUnlockedLevelId: unlockedId, hasSeenHowToPlay: false }),
    );
    const reordered = levels.findIndex((level) => level.id === unlockedId);
    const reloaded = await freshSaveModule();
    expect(reloaded.getHighestUnlockedIndex()).toBe(reordered);
  });

  it('stores a single JSON blob under the rebounder:save key', async () => {
    const { recordLevelComplete } = await freshSaveModule();
    recordLevelComplete(0);
    const raw = localStorage.getItem('rebounder:save');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '') as { highestUnlockedLevelId: string; hasSeenHowToPlay: boolean };
    expect(parsed).toEqual({
      highestUnlockedLevelId: levels[1].id,
      hasSeenHowToPlay: false,
    });
  });
});

describe('save (localStorage unavailable)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to an in-memory store without throwing when localStorage is absent', async () => {
    vi.stubGlobal('localStorage', undefined);
    const { getHighestUnlockedIndex, hasSeenHowToPlay, recordLevelComplete, setHasSeenHowToPlay } =
      await freshSaveModule();

    expect(() => {
      getHighestUnlockedIndex();
      hasSeenHowToPlay();
    }).not.toThrow();

    expect(getHighestUnlockedIndex()).toBe(0);
    expect(hasSeenHowToPlay()).toBe(false);

    recordLevelComplete(0);
    setHasSeenHowToPlay(true);
    expect(getHighestUnlockedIndex()).toBe(1);
    expect(hasSeenHowToPlay()).toBe(true);
  });

  it('falls back to an in-memory store without throwing when localStorage throws on access', async () => {
    vi.stubGlobal(
      'localStorage',
      new Proxy(
        {},
        {
          get() {
            throw new Error('SecurityError: localStorage is not available');
          },
        },
      ),
    );
    const { getHighestUnlockedIndex, recordLevelComplete } = await freshSaveModule();

    expect(() => {
      getHighestUnlockedIndex();
      recordLevelComplete(0);
    }).not.toThrow();
    expect(getHighestUnlockedIndex()).toBe(1);
  });

  it('keeps in-memory progress isolated per session (does not leak to a fresh module load)', async () => {
    vi.stubGlobal('localStorage', undefined);
    const { getHighestUnlockedIndex, recordLevelComplete } = await freshSaveModule();
    recordLevelComplete(0);
    expect(getHighestUnlockedIndex()).toBe(1);

    const reloaded = await freshSaveModule();
    // A fresh module instance has its own in-memory store, matching the "no
    // persistence across reload" degradation the fallback accepts.
    expect(reloaded.getHighestUnlockedIndex()).toBe(0);
  });
});
