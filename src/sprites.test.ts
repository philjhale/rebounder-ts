import { describe, expect, it } from 'vitest';
import { animatedSpriteName } from './sprites';

describe('animatedSpriteName', () => {
  it('returns frame 1 at elapsedTime 0', () => {
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0)).toBe('ColourChangerOrangeF1');
  });

  it('advances one frame per 1/fps seconds', () => {
    // fps 10 -> one frame every 0.1s.
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.1)).toBe('ColourChangerOrangeF2');
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.2)).toBe('ColourChangerOrangeF3');
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.3)).toBe('ColourChangerOrangeF4');
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.4)).toBe('ColourChangerOrangeF5');
  });

  it('stays on a frame until the next fps boundary', () => {
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.15)).toBe('ColourChangerOrangeF2');
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.19)).toBe('ColourChangerOrangeF2');
  });

  it('loops back to frame 1 after completing a full cycle (wraparound)', () => {
    // 5 frames at 10fps -> a full cycle is 0.5s.
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.5)).toBe('ColourChangerOrangeF1');
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 0.6)).toBe('ColourChangerOrangeF2');
  });

  it('wraps repeatedly across many cycles', () => {
    // 10 cycles (5s) plus 0.2s -> should equal frame at 0.2s.
    expect(animatedSpriteName('ColourChangerOrange', 5, 10, 5.2)).toBe('ColourChangerOrangeF3');
  });

  it('supports a different frameCount/fps combination (Teleporter: 4 frames @ 10fps)', () => {
    expect(animatedSpriteName('TeleporterClub', 4, 10, 0)).toBe('TeleporterClubF1');
    expect(animatedSpriteName('TeleporterClub', 4, 10, 0.1)).toBe('TeleporterClubF2');
    expect(animatedSpriteName('TeleporterClub', 4, 10, 0.3)).toBe('TeleporterClubF4');
    expect(animatedSpriteName('TeleporterClub', 4, 10, 0.4)).toBe('TeleporterClubF1');
  });

  it('handles a single-frame animation by always returning frame 1', () => {
    expect(animatedSpriteName('Solo', 1, 10, 0)).toBe('SoloF1');
    expect(animatedSpriteName('Solo', 1, 10, 1.23)).toBe('SoloF1');
  });

  it('does not crash or produce NaN when fps is 0', () => {
    expect(animatedSpriteName('ColourChangerOrange', 5, 0, 1)).toBe('ColourChangerOrangeF1');
  });
});
