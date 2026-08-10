import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeNextPointer, getLevelState, isPlayable } from './progression';

describe('computeNextPointer', () => {
  it('completing level N unlocks exactly up to N+1', () => {
    expect(computeNextPointer(0, 0)).toBe(1);
    expect(computeNextPointer(1, 1)).toBe(2);
    expect(computeNextPointer(5, 5)).toBe(6);
  });

  it('replaying an earlier level does not change the pointer', () => {
    expect(computeNextPointer(3, 0)).toBe(3);
    expect(computeNextPointer(3, 1)).toBe(3);
    expect(computeNextPointer(3, 2)).toBe(3);
  });

  it('re-completing the frontier level again is a no-op beyond the normal advance', () => {
    expect(computeNextPointer(3, 3)).toBe(4);
    // Completing it a second time from the new pointer doesn't advance twice.
    expect(computeNextPointer(4, 3)).toBe(4);
  });

  it('the pointer never decreases, for any current pointer/completed index pair', () => {
    for (let pointer = 0; pointer < 10; pointer += 1) {
      for (let completed = 0; completed < 10; completed += 1) {
        expect(computeNextPointer(pointer, completed)).toBeGreaterThanOrEqual(pointer);
      }
    }
  });
});

describe('getLevelState', () => {
  it('marks indices below the pointer as done', () => {
    expect(getLevelState(3, 0)).toBe('done');
    expect(getLevelState(3, 1)).toBe('done');
    expect(getLevelState(3, 2)).toBe('done');
  });

  it('marks the index at the pointer as current', () => {
    expect(getLevelState(3, 3)).toBe('current');
  });

  it('marks indices above the pointer as locked', () => {
    expect(getLevelState(3, 4)).toBe('locked');
    expect(getLevelState(3, 59)).toBe('locked');
  });

  it('at the very start (pointer 0), only level 0 is current and the rest are locked', () => {
    expect(getLevelState(0, 0)).toBe('current');
    expect(getLevelState(0, 1)).toBe('locked');
  });
});

describe('isPlayable', () => {
  it('is true for done and current levels, false for locked levels', () => {
    expect(isPlayable(3, 0)).toBe(true);
    expect(isPlayable(3, 3)).toBe(true);
    expect(isPlayable(3, 4)).toBe(false);
  });
});

describe('getFrontierPointer / completeLevel (delegation to the save module)', () => {
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

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('completeLevel persists through save.recordLevelComplete, with no separate storage', async () => {
    vi.stubGlobal('localStorage', createFakeLocalStorage());
    vi.resetModules();
    const progression = await import('./progression');
    const save = await import('./save');

    expect(progression.getFrontierPointer()).toBe(0);
    progression.completeLevel(0);
    expect(progression.getFrontierPointer()).toBe(1);
    // Same underlying value as save's own accessor — no parallel store.
    expect(save.getHighestUnlockedIndex()).toBe(1);
  });

  it('replaying an already-completed level through completeLevel does not move the pointer back', async () => {
    vi.stubGlobal('localStorage', createFakeLocalStorage());
    vi.resetModules();
    const progression = await import('./progression');

    progression.completeLevel(2);
    expect(progression.getFrontierPointer()).toBe(3);
    progression.completeLevel(0);
    expect(progression.getFrontierPointer()).toBe(3);
  });
});
