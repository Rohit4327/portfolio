// Orchestrator: window.renderAt(t, frame) renders the film frame at time t (seconds).
import { Stage, W, H, FPS } from './stage.js';
import { loadScenes } from '../scenes/index.js';
import { vignette, grain } from './gfx.js';

const stage = new Stage(document.getElementById('gl'), document.getElementById('ui'));
window.__stage = stage; let scenes = []; window.__scenes = scenes;
const ready = (async () => {
  await document.fonts.ready;
  scenes = await loadScenes(); window.__scenes = scenes;
  for (const s of scenes) { await s.init(stage); if (s.group) { s.group.visible = false; stage.scene.add(s.group); } }
  return true;
})();
window.__ready = ready;
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));

export function ownerAt(t) {
  let owner = scenes.find((s) => t >= s.start && t < s.end);
  if (!owner) owner = t < scenes[0].start ? scenes[0] : scenes[scenes.length - 1];
  return owner;
}
window.renderAt = async (t, frame) => {
  await ready;
  stage.frame = frame ?? Math.round(t * FPS);
  const owner = ownerAt(t);
  for (const s of scenes) if (s.group) s.group.visible = s === owner;
  // scene may own helper groups (e.g. shared corridor): visible only when it asks
  stage.scene.fog = null; stage.renderer.toneMappingExposure = 1.0;
  owner.update(t, stage);
  stage.render();
  stage.clearUI();
  const ctx = stage.ui;
  ctx.save(); if (owner.draw2d) owner.draw2d(ctx, t, stage); ctx.restore();
  vignette(ctx, owner.vignette ?? 0.5);
  grain(ctx, stage.frame, owner.grain ?? 0.03);
  return owner.id;
};
