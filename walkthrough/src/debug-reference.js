/**
 * debug-reference.js — REFERENCE MATCH MODE.
 * Snaps the camera to the viewpoint of the supplied render and overlays the
 * source image at an adjustable opacity so walls, furniture, the Capsule, the
 * four-pod cluster and the lift lobby can be checked against the original.
 */
import { referencePose, restoreUp } from './scene.js';

export function createReferenceMode({ camera, host, onEnter, onExit }) {
  const overlay = document.createElement('div');
  overlay.className = 'ref-overlay';
  overlay.hidden = true;
  const img = document.createElement('img');
  img.src = './assets/reference.jpg';
  img.alt = 'Supplied architectural reference render';
  img.decoding = 'async';
  overlay.appendChild(img);
  host.appendChild(overlay);

  const panel = document.createElement('div');
  panel.className = 'ref-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="ref-row"><strong>Reference match</strong><button class="ref-close" type="button" aria-label="Exit reference match mode">✕</button></div>
    <label class="ref-row" for="ref-op">Overlay
      <input id="ref-op" type="range" min="0" max="100" value="50" aria-label="Reference overlay opacity">
      <output id="ref-op-out">50%</output>
    </label>
    <p class="ref-hint">0% reconstruction · 100% reference. Press <kbd>V</kbd> to leave.</p>`;
  host.appendChild(panel);

  const slider = panel.querySelector('#ref-op');
  const out = panel.querySelector('#ref-op-out');
  const setOpacity = (v) => {
    img.style.opacity = String(v / 100);
    out.textContent = `${v}%`;
  };
  slider.addEventListener('input', () => setOpacity(+slider.value));
  setOpacity(50);

  let active = false;

  const api = {
    get active() { return active; },
    enter() {
      if (active) return;
      active = true;
      overlay.hidden = false;
      panel.hidden = false;
      referencePose(camera, window.innerWidth / window.innerHeight);
      onEnter?.();
    },
    exit() {
      if (!active) return;
      active = false;
      overlay.hidden = true;
      panel.hidden = true;
      restoreUp(camera);
      camera.fov = 65;
      camera.updateProjectionMatrix();
      onExit?.();
    },
    toggle() { active ? api.exit() : api.enter(); },
    resize() { if (active) referencePose(camera, window.innerWidth / window.innerHeight); },
    setOpacity,
  };

  panel.querySelector('.ref-close').addEventListener('click', () => api.exit());
  return api;
}
