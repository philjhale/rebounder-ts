import { describe, expect, it } from 'vitest';
import { levels } from './index';
import type { Colour } from '../types';

const VALID_COLOURS: Colour[] = ['Orange', 'Blue', 'Green', 'Purple', 'None'];

function expectVec2(value: unknown) {
  expect(value).toMatchObject({
    x: expect.any(Number) as unknown,
    y: expect.any(Number) as unknown,
  });
}

describe('level data', () => {
  it('ships exactly the 5 prototype levels', () => {
    expect(levels.map((l) => l.id).sort()).toEqual(
      [
        'scene1',
        'use-the-obstacle',
        'first-teleporter',
        'first-colour-changer',
        'first-coloured-line',
      ].sort(),
    );
  });

  it.each(levels)('$name conforms to the fixed-field Level schema', (level) => {
    expect(typeof level.id).toBe('string');
    expect(typeof level.name).toBe('string');

    for (const launcher of level.launchers) {
      expectVec2(launcher.position);
      expect(VALID_COLOURS).toContain(launcher.colour);
      expect(typeof launcher.enabled).toBe('boolean');
    }

    for (const target of level.targets) {
      expectVec2(target.position);
      expect(VALID_COLOURS).toContain(target.colour);
    }

    for (const obstacle of level.obstacles) {
      expectVec2(obstacle.position);
      expect(obstacle.width).toBeGreaterThan(0);
      expect(obstacle.height).toBeGreaterThan(0);
    }

    for (const colourChanger of level.colourChangers) {
      expectVec2(colourChanger.position);
      expect(VALID_COLOURS).toContain(colourChanger.colour);
    }

    expect(level.lineCounts.Orange).toBeGreaterThanOrEqual(0);
    expect(level.lineCounts.Blue).toBeGreaterThanOrEqual(0);
    expect(level.lineCounts.Green).toBeGreaterThanOrEqual(0);
    expect(level.lineCounts.Purple).toBeGreaterThanOrEqual(0);
  });

  it('pairs every teleporter with exactly one other teleporter sharing its pairId', () => {
    for (const level of levels) {
      const byPair = new Map<string, number>();
      for (const teleporter of level.teleporters) {
        expectVec2(teleporter.position);
        byPair.set(teleporter.pairId, (byPair.get(teleporter.pairId) ?? 0) + 1);
      }
      for (const count of byPair.values()) {
        expect(count).toBe(2);
      }
    }
  });

  it('has at least one launcher and one target per level', () => {
    for (const level of levels) {
      expect(level.launchers.length).toBeGreaterThan(0);
      expect(level.targets.length).toBeGreaterThan(0);
    }
  });
});
