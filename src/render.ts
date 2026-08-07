import type { Level } from './types';
import {
  ballSprite,
  colourChangerSprite,
  launcherInnerSprite,
  launcherSprite,
  targetSprite,
  type SpriteName,
} from './sprites';
import type { ObstacleData } from './types';
import { BALL_RADIUS, type Ball } from './simulation';

export const WORLD_WIDTH = 40;
export const WORLD_HEIGHT = 36;
export const PIXELS_PER_UNIT = 20;

export const CANVAS_WIDTH = WORLD_WIDTH * PIXELS_PER_UNIT;
export const CANVAS_HEIGHT = WORLD_HEIGHT * PIXELS_PER_UNIT;

// World space is Unity-style: origin at centre, +y up. Canvas space has
// origin top-left, +y down.
function worldToScreen(x: number, y: number): { x: number; y: number } {
  return {
    x: CANVAS_WIDTH / 2 + x * PIXELS_PER_UNIT,
    y: CANVAS_HEIGHT / 2 - y * PIXELS_PER_UNIT,
  };
}

// The original sprites are tk2d-atlas-packed and cropped to tight,
// inconsistent pixel bounds (e.g. a Target is 8x48px, a Launcher is
// 32x32px) — the pixel-to-world scale that made them line up isn't present
// in this repo. Each sprite is instead drawn at a fixed world-unit size for
// its longer edge, preserving its own aspect ratio.
const SPRITE_WORLD_SIZE: Record<
  'Launcher' | 'Target' | 'ColourChanger' | 'Teleporter' | 'Ball',
  number
> = {
  Launcher: 2.4,
  Target: 3,
  ColourChanger: 2,
  Teleporter: 2,
  Ball: BALL_RADIUS * 2,
};

function drawImageCentred(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  worldX: number,
  worldY: number,
  scale: number,
) {
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const screen = worldToScreen(worldX, worldY);
  ctx.drawImage(image, screen.x - drawWidth / 2, screen.y - drawHeight / 2, drawWidth, drawHeight);
}

function scaleToFit(image: HTMLImageElement, targetWorldSize: number): number {
  const longerEdgePx = Math.max(image.width, image.height);
  return (targetWorldSize * PIXELS_PER_UNIT) / longerEdgePx;
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprites: Map<SpriteName, HTMLImageElement>,
  name: SpriteName,
  worldX: number,
  worldY: number,
  category: keyof typeof SPRITE_WORLD_SIZE,
) {
  const image = sprites.get(name);
  if (!image) return;

  drawImageCentred(ctx, image, worldX, worldY, scaleToFit(image, SPRITE_WORLD_SIZE[category]));
}

// Obstacle.png is a small square tile, one world unit per repeat, meant to
// be tiled across the obstacle's authored width/height rather than stretched.
function drawObstacle(
  ctx: CanvasRenderingContext2D,
  sprites: Map<SpriteName, HTMLImageElement>,
  obstacle: ObstacleData,
) {
  const widthPx = obstacle.width * PIXELS_PER_UNIT;
  const heightPx = obstacle.height * PIXELS_PER_UNIT;
  const screen = worldToScreen(obstacle.position.x, obstacle.position.y);

  const image = sprites.get('Obstacle');
  if (!image) return;

  const tile = document.createElement('canvas');
  tile.width = PIXELS_PER_UNIT;
  tile.height = PIXELS_PER_UNIT;
  tile.getContext('2d')!.drawImage(image, 0, 0, PIXELS_PER_UNIT, PIXELS_PER_UNIT);
  const pattern = ctx.createPattern(tile, 'repeat')!;

  ctx.save();
  ctx.translate(screen.x - widthPx / 2, screen.y - heightPx / 2);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.restore();
}

// Launcher is two layered sprites in the original (an outer housing plus a
// coloured inner nozzle) — both must share the outer sprite's scale so the
// inner nozzle doesn't get independently re-normalized to the same target size.
function drawLauncher(
  ctx: CanvasRenderingContext2D,
  sprites: Map<SpriteName, HTMLImageElement>,
  outerName: SpriteName,
  innerName: SpriteName,
  worldX: number,
  worldY: number,
) {
  const outer = sprites.get(outerName);
  if (!outer) return;

  const scale = scaleToFit(outer, SPRITE_WORLD_SIZE.Launcher);
  drawImageCentred(ctx, outer, worldX, worldY, scale);

  const inner = sprites.get(innerName);
  if (inner) drawImageCentred(ctx, inner, worldX, worldY, scale);
}

export function renderLevel(
  ctx: CanvasRenderingContext2D,
  level: Level,
  sprites: Map<SpriteName, HTMLImageElement>,
  balls: Ball[] = [],
) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const obstacle of level.obstacles) {
    drawObstacle(ctx, sprites, obstacle);
  }

  for (const teleporter of level.teleporters) {
    drawSprite(
      ctx,
      sprites,
      'TeleporterClubF1',
      teleporter.position.x,
      teleporter.position.y,
      'Teleporter',
    );
  }

  for (const colourChanger of level.colourChangers) {
    drawSprite(
      ctx,
      sprites,
      colourChangerSprite(colourChanger.colour),
      colourChanger.position.x,
      colourChanger.position.y,
      'ColourChanger',
    );
  }

  for (const target of level.targets) {
    drawSprite(
      ctx,
      sprites,
      targetSprite(target.colour),
      target.position.x,
      target.position.y,
      'Target',
    );
  }

  for (const launcher of level.launchers) {
    drawLauncher(
      ctx,
      sprites,
      launcherSprite(launcher.colour),
      launcherInnerSprite(launcher.colour),
      launcher.position.x,
      launcher.position.y,
    );
  }

  for (const ball of balls) {
    drawSprite(ctx, sprites, ballSprite(ball.colour), ball.position.x, ball.position.y, 'Ball');
  }
}
