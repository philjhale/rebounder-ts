// PROTOTYPE — throwaway code for wayfinder ticket #29 (Canvas2D vs DOM
// overlay for menus/HUD). Not production code.
import type { LineCounts } from '../types';

const COLOUR_HEX: Record<keyof LineCounts, string> = {
  Orange: '#ff8c00',
  Blue: '#1e90ff',
  Green: '#2ecc71',
  Purple: '#9b59b6',
};

export interface DomOverlayHandles {
  setPaused: (paused: boolean) => void;
  setRemaining: (remaining: LineCounts) => void;
  destroy: () => void;
}

export function mountDomOverlay(host: HTMLElement, onResume: () => void): DomOverlayHandles {
  const hud = document.createElement('div');
  hud.className = 'proto-dom-hud';
  hud.style.cssText = `
    position: absolute; top: 10px; left: 10px;
    display: flex; flex-direction: column; gap: 6px;
    font: 14px sans-serif; pointer-events: none;
  `;
  host.appendChild(hud);

  const pauseOverlay = document.createElement('div');
  pauseOverlay.className = 'proto-dom-pause';
  pauseOverlay.style.cssText = `
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.6);
    display: none; align-items: center; justify-content: center;
  `;
  const panel = document.createElement('div');
  panel.style.cssText = `
    background: #2a2a2a; border: 1px solid #555; border-radius: 8px;
    width: 240px; padding: 20px; text-align: center;
  `;
  const title = document.createElement('h2');
  title.textContent = 'Paused';
  title.style.cssText = 'margin: 0 0 16px; color: #eee; font-size: 20px;';
  const resumeButton = document.createElement('button');
  resumeButton.textContent = 'Resume';
  resumeButton.style.cssText = 'font-size: 16px; padding: 8px 20px; cursor: pointer;';
  resumeButton.addEventListener('click', onResume);
  panel.append(title, resumeButton);
  pauseOverlay.appendChild(panel);
  host.appendChild(pauseOverlay);

  return {
    setPaused(paused) {
      pauseOverlay.style.display = paused ? 'flex' : 'none';
    },
    setRemaining(remaining) {
      hud.innerHTML = '';
      (Object.keys(remaining) as (keyof LineCounts)[]).forEach((colour) => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 6px;';
        const swatch = document.createElement('span');
        swatch.style.cssText = `width: 20px; height: 20px; background: ${COLOUR_HEX[colour]}; border: 1px solid #000; display: inline-block;`;
        const count = document.createElement('span');
        count.textContent = String(remaining[colour]);
        count.style.color = '#eee';
        row.append(swatch, count);
        hud.appendChild(row);
      });
    },
    destroy() {
      hud.remove();
      pauseOverlay.remove();
    },
  };
}
