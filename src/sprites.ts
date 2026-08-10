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
  'GUI_Pause',
  'GUI_RemainOrange',
  'GUI_RemainBlue',
  'GUI_RemainGreen',
  'GUI_RemainPurple',
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

// Pure frame-selection helper for tk2d-style autoplay-looping sprite
// animations (ColourChanger, Teleporter — see issue #26's research).
// All instances of a given clip play identically: frame choice depends only
// on a single global elapsedTime, never on per-entity state, so there is
// nothing here to store in GameState.
//
// Frame files follow the `{baseName}F{n}` convention (issue #37); only F1
// exists on disk today; the SpriteName cast is intentionally permissive
// about not-yet-extracted frames — loadSprites()/drawSprite() already
// degrade missing entries gracefully (see sprites.ts's loadSprites and
// render.ts's drawSprite, which both no-op/skip on a missing lookup).
export function animatedSpriteName(
  baseName: string,
  frameCount: number,
  fps: number,
  elapsedTime: number,
): SpriteName {
  if (frameCount <= 1) return `${baseName}F1` as SpriteName;

  const rawFrame = Math.floor(elapsedTime * fps);
  const frameIndex = ((rawFrame % frameCount) + frameCount) % frameCount;
  return `${baseName}F${String(frameIndex + 1)}` as SpriteName;
}

export function lineCapSprite(colour: Colour): SpriteName {
  return `LineCap${colour}` as SpriteName;
}

export function lineInnerSprite(colour: Colour): SpriteName {
  return `LineInner${colour}` as SpriteName;
}

export function remainingLinesSprite(colour: Colour): SpriteName {
  return `GUI_Remain${colour}` as SpriteName;
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
