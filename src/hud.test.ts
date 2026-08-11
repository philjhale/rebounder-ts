import { describe, expect, it } from 'vitest';
import { layoutRemainingSlots, isSlotEmpty } from './hud';
import type { LineCounts } from './types';

const counts = (overrides: Partial<LineCounts>): LineCounts => ({
  Orange: 0,
  Blue: 0,
  Green: 0,
  Purple: 0,
  ...overrides,
});

describe('layoutRemainingSlots', () => {
  it('renders one slot per remaining line for a single colour', () => {
    expect(layoutRemainingSlots(counts({ Orange: 3 }))).toEqual([
      { colour: 'Orange', indexWithinColour: 0 },
      { colour: 'Orange', indexWithinColour: 1 },
      { colour: 'Orange', indexWithinColour: 2 },
    ]);
  });

  it('omits colours with a count of zero', () => {
    expect(layoutRemainingSlots(counts({ Orange: 3, Blue: 0 }))).toEqual([
      { colour: 'Orange', indexWithinColour: 0 },
      { colour: 'Orange', indexWithinColour: 1 },
      { colour: 'Orange', indexWithinColour: 2 },
    ]);
  });

  it('groups multiple colours in fixed Orange/Blue/Green/Purple order', () => {
    expect(layoutRemainingSlots(counts({ Purple: 1, Orange: 2, Blue: 2 }))).toEqual([
      { colour: 'Orange', indexWithinColour: 0 },
      { colour: 'Orange', indexWithinColour: 1 },
      { colour: 'Blue', indexWithinColour: 0 },
      { colour: 'Blue', indexWithinColour: 1 },
      { colour: 'Purple', indexWithinColour: 0 },
    ]);
  });

  it('renders no slots when every colour is at zero', () => {
    expect(layoutRemainingSlots(counts({}))).toEqual([]);
  });
});

describe('isSlotEmpty', () => {
  const currentCounts = counts({ Orange: 1 });

  it('is filled for a slot within the current remaining count', () => {
    expect(isSlotEmpty(currentCounts, { colour: 'Orange', indexWithinColour: 0 })).toBe(false);
  });

  it('is empty for a slot at or beyond the current remaining count', () => {
    expect(isSlotEmpty(currentCounts, { colour: 'Orange', indexWithinColour: 1 })).toBe(true);
    expect(isSlotEmpty(currentCounts, { colour: 'Orange', indexWithinColour: 2 })).toBe(true);
  });
});
