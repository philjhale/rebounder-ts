// PROTOTYPE — floating bottom-bar switcher for wayfinder ticket #29
// (Canvas2D vs DOM overlay comparison). Not production code.
export type UiVariant = 'canvas' | 'dom';

export function getUiVariant(): UiVariant {
  const param = new URLSearchParams(window.location.search).get('ui');
  return param === 'dom' ? 'dom' : 'canvas';
}

export function mountSwitcher(
  host: HTMLElement,
  initial: UiVariant,
  onChange: (v: UiVariant) => void,
): void {
  const variants: UiVariant[] = ['canvas', 'dom'];
  let current = initial;

  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    background: #111; color: #fff; border: 1px solid #555; border-radius: 999px;
    padding: 6px 14px; display: flex; align-items: center; gap: 12px;
    font: 13px sans-serif; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  `;

  const label = document.createElement('span');
  const setLabel = (v: UiVariant) => {
    label.textContent = v === 'canvas' ? 'A — Canvas2D' : 'B — DOM overlay';
  };
  setLabel(current);

  function cycle(dir: 1 | -1) {
    const idx = variants.indexOf(current);
    current = variants[(idx + dir + variants.length) % variants.length];
    setLabel(current);
    const url = new URL(window.location.href);
    url.searchParams.set('ui', current);
    window.history.replaceState({}, '', url);
    onChange(current);
  }

  const left = document.createElement('button');
  left.textContent = '←';
  left.addEventListener('click', () => {
    cycle(-1);
  });
  const right = document.createElement('button');
  right.textContent = '→';
  right.addEventListener('click', () => {
    cycle(1);
  });
  [left, right].forEach((b) => {
    b.style.cssText = 'cursor: pointer; font-size: 14px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px;';
  });

  bar.append(left, label, right);
  host.appendChild(bar);

  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) return;
    if (e.key === 'ArrowLeft') cycle(-1);
    if (e.key === 'ArrowRight') cycle(1);
  });
}
