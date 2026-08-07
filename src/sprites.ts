import type { Colour } from './types';

const SPRITE_NAMES = [
  'BallOrange',
  'BallBlue',
  'BallGreen',
  'BallPurple',
  'LauncherOrange',
  'LauncherBlue',
  'LauncherGreen',
  'LauncherPurple',
  'LauncherInnerOrange',
  'LauncherInnerBlue',
  'LauncherInnerGreen',
  'LauncherInnerPurple',
  'TargetOrange',
  'TargetBlue',
  'TargetGreen',
  'TargetPurple',
  'TargetHitOrange',
  'TargetHitBlue',
  'TargetHitGreen',
  'TargetHitPurple',
  'Obstacle',
  'ColourChangerOrangeF1',
  'ColourChangerBlueF1',
  'ColourChangerGreenF1',
  'ColourChangerPurpleF1',
  'TeleporterClubF1',
  'LineCapOrange',
  'LineCapBlue',
  'LineCapGreen',
  'LineCapPurple',
  'LineInnerOrange',
  'LineInnerBlue',
  'LineInnerGreen',
  'LineInnerPurple',
] as const;

export type SpriteName = (typeof SPRITE_NAMES)[number];

export function ballSprite(colour: Colour): SpriteName {
  return `Ball${colour}` as SpriteName;
}

export function launcherSprite(colour: Colour): SpriteName {
  return `Launcher${colour}` as SpriteName;
}

export function launcherInnerSprite(colour: Colour): SpriteName {
  return `LauncherInner${colour}` as SpriteName;
}

export function targetSprite(colour: Colour): SpriteName {
  return `Target${colour}` as SpriteName;
}

export function targetHitSprite(colour: Colour): SpriteName {
  return `TargetHit${colour}` as SpriteName;
}

export function colourChangerSprite(colour: Colour): SpriteName {
  return `ColourChanger${colour}F1` as SpriteName;
}

export function lineCapSprite(colour: Colour): SpriteName {
  return `LineCap${colour}` as SpriteName;
}

export function lineInnerSprite(colour: Colour): SpriteName {
  return `LineInner${colour}` as SpriteName;
}

export async function loadSprites(): Promise<Map<SpriteName, HTMLImageElement>> {
  const entries = await Promise.all(
    SPRITE_NAMES.map(
      (name) =>
        new Promise<[SpriteName, HTMLImageElement]>((resolve, reject) => {
          const image = new Image();
          image.onload = () => { resolve([name, image]); };
          image.onerror = () => { reject(new Error(`Failed to load sprite: ${name}`)); };
          image.src = `/sprites/${name}.png`;
        }),
    ),
  );

  return new Map(entries);
}
