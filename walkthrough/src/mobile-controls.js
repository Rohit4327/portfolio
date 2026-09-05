/**
 * mobile-controls.js — translucent on-screen D-pad for phones and tablets.
 * Pointer Events with capture, so a thumb can hold forward on the left while
 * the other thumb drags to look on the right. Diagonals work because more than
 * one arrow can be held at once.
 */
const DIRS = {
  up: { z: 1, label: 'Move forward' },
  down: { z: -1, label: 'Move backward' },
  left: { x: -1, label: 'Strafe left' },
  right: { x: 1, label: 'Strafe right' },
};

export function createMobileControls(root, controls) {
  const pad = document.createElement('div');
  pad.className = 'dpad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Movement controls');

  const active = new Set();
  const buttons = {};

  const sync = () => {
    let x = 0, z = 0;
    for (const d of active) { x += DIRS[d].x || 0; z += DIRS[d].z || 0; }
    const len = Math.hypot(x, z);
    controls.touchMove.x = len > 1 ? x / len : x;
    controls.touchMove.z = len > 1 ? z / len : z;
  };

  for (const name of Object.keys(DIRS)) {
    const b = document.createElement('button');
    b.className = `dpad-btn dpad-${name}`;
    b.type = 'button';
    b.setAttribute('aria-label', DIRS[name].label);
    b.innerHTML = `<span aria-hidden="true">${
      { up: '▲', down: '▼', left: '◀', right: '▶' }[name]}</span>`;

    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      b.setPointerCapture?.(e.pointerId);
      active.add(name);
      b.classList.add('is-down');
      sync();
    };
    const release = (e) => {
      e.preventDefault();
      e.stopPropagation();
      active.delete(name);
      b.classList.remove('is-down');
      sync();
    };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('pointerleave', (e) => { if (!b.hasPointerCapture?.(e.pointerId)) release(e); });
    b.addEventListener('lostpointercapture', release);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    // keyboard accessibility: the D-pad is focusable and works on Enter/Space
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { active.add(name); sync(); }
    });
    b.addEventListener('keyup', () => { active.delete(name); sync(); });
    buttons[name] = b;
    pad.appendChild(b);
  }

  // sprint toggle for touch
  const run = document.createElement('button');
  run.className = 'dpad-run';
  run.type = 'button';
  run.textContent = 'RUN';
  run.setAttribute('aria-pressed', 'false');
  run.addEventListener('click', (e) => {
    e.stopPropagation();
    controls.boost = !controls.boost;
    run.classList.toggle('is-on', controls.boost);
    run.setAttribute('aria-pressed', String(!!controls.boost));
  });
  pad.appendChild(run);

  root.appendChild(pad);

  return {
    element: pad,
    reset() { active.clear(); sync(); Object.values(buttons).forEach((b) => b.classList.remove('is-down')); },
    setVisible(v) { pad.style.display = v ? '' : 'none'; },
  };
}

export const isTouchDevice = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
  navigator.maxTouchPoints > 1;
