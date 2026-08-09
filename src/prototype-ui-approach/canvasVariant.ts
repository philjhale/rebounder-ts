// PROTOTYPE — throwaway code for wayfinder ticket #29 (Canvas2D vs DOM
// overlay for menus/HUD). Not production code.
import type { LineCounts } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../render';

const COLOUR_HEX: Record<keyof LineCounts, string> = {
  Orange: '#ff8c00',
  Blue: '#1e90ff',
  Green: '#2ecc71',
  Purple: '#9b59b6',
};

const RESUME_BUTTON = { x: CANVAS_WIDTH / 2 - 60, y: CANVAS_HEIGHT / 2 + 20, width: 120, height: 40 };

export function drawPauseOverlayCanvas(ctx: CanvasRenderingContext2D, paused: boolean) {
  if (!paused) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const panelW = 240;
  const panelH = 160;
  const panelX = CANVAS_WIDTH / 2 - panelW / 2;
  const panelY = CANVAS_HEIGHT / 2 - panelH / 2;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = '#eee';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Paused', CANVAS_WIDTH / 2, panelY + 40);

  ctx.fillStyle = '#444';
  ctx.fillRect(RESUME_BUTTON.x, RESUME_BUTTON.y, RESUME_BUTTON.width, RESUME_BUTTON.height);
  ctx.strokeStyle = '#888';
  ctx.strokeRect(RESUME_BUTTON.x, RESUME_BUTTON.y, RESUME_BUTTON.width, RESUME_BUTTON.height);
  ctx.fillStyle = '#eee';
  ctx.font = '16px sans-serif';
  ctx.fillText('Resume', CANVAS_WIDTH / 2, RESUME_BUTTON.y + 25);

  ctx.restore();
}

export function hitTestResumeButton(x: number, y: number): boolean {
  return (
    x >= RESUME_BUTTON.x &&
    x <= RESUME_BUTTON.x + RESUME_BUTTON.width &&
    y >= RESUME_BUTTON.y &&
    y <= RESUME_BUTTON.y + RESUME_BUTTON.height
  );
}

export function drawRemainingLinesHudCanvas(ctx: CanvasRenderingContext2D, remaining: LineCounts) {
  const colours = Object.keys(remaining) as (keyof LineCounts)[];
  const boxSize = 20;
  const gap = 8;
  const startX = 10;
  const startY = 10;
  ctx.save();
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  colours.forEach((colour, i) => {
    const x = startX;
    const y = startY + i * (boxSize + gap);
    ctx.fillStyle = COLOUR_HEX[colour];
    ctx.fillRect(x, y, boxSize, boxSize);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x, y, boxSize, boxSize);
    ctx.fillStyle = '#eee';
    ctx.fillText(String(remaining[colour]), x + boxSize + 6, y + boxSize / 2);
  });
  ctx.restore();
}
