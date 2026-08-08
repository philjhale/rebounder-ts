import { screenToWorld } from './render';
import type { PointerInputEvent } from './simulation';

// Translates the canvas's Pointer Events (unifying mouse and touch) into
// PlayerInput-shaped events in world space. Contains no game rules — it only
// tracks which pointers are currently down and converts coordinates.
export function attachPointerInput(
  canvas: HTMLCanvasElement,
  onEvent: (event: PointerInputEvent) => void,
): () => void {
  const activePointerIds = new Set<number>();

  function toWorld(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return screenToWorld(canvasX, canvasY);
  }

  function handlePointerDown(event: PointerEvent) {
    event.preventDefault();
    activePointerIds.add(event.pointerId);
    canvas.setPointerCapture(event.pointerId);
    onEvent({ type: 'down', pointerId: event.pointerId, position: toWorld(event) });
  }

  function handlePointerMove(event: PointerEvent) {
    if (!activePointerIds.has(event.pointerId)) return;
    onEvent({ type: 'move', pointerId: event.pointerId, position: toWorld(event) });
  }

  function handlePointerUp(event: PointerEvent) {
    if (!activePointerIds.has(event.pointerId)) return;
    activePointerIds.delete(event.pointerId);
    onEvent({ type: 'up', pointerId: event.pointerId, position: toWorld(event) });
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);

  return () => {
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
  };
}
