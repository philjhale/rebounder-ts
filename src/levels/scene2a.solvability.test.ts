import { describe, expect, it } from 'vitest';
import { createInitialState, updateGame, type PlayerInput } from '../simulation';
import type { Level } from '../types';
import scene2a from './scene2a.json';

// Regression coverage for a level actually shipped to players: none of the
// other level tests (schema shape in levels.test.ts, synthetic fixtures in
// simulation.test.ts) simulate a real level end-to-end, so nothing catches a
// future change (e.g. to collision, obstacle data, or launcher angle) that
// makes a level physically uncompletable. This line placement was verified
// to complete the level both headlessly and by driving the actual UI in a
// browser.
describe('Scene2a solvability', () => {
  it('can be completed by banking the launcher\'s ball under the tall obstacle with one Orange line', () => {
    let state = createInitialState(scene2a as Level);

    const line: PlayerInput = {
      pointerEvents: [
        { type: 'down', pointerId: 1, position: { x: -6.253972091038223, y: -7.881192795994139 } },
        { type: 'move', pointerId: 1, position: { x: 1.2539720910382237, y: -5.118807204005861 } },
        { type: 'up', pointerId: 1, position: { x: 1.2539720910382237, y: -5.118807204005861 } },
      ],
    };
    state = updateGame(state, line, 0);
    expect(state.lines).toHaveLength(1);

    const dt = 1 / 60;
    for (let i = 0; i < 60 * 20 && !state.levelComplete; i++) {
      state = updateGame(state, { pointerEvents: [] }, dt);
    }

    expect(state.levelComplete).toBe(true);
  });
});
