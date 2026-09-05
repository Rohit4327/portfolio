/**
 * main.js — wires the reconstruction together.
 */
import * as THREE from 'three';
import * as PL from './plan.js';
import { createStage, detectQuality, referencePose, restoreUp } from './scene.js';
import { buildArchitecture, buildTabletop } from './architecture.js';
import { buildZones } from './zones.js';
import { buildCapsule } from './capsule.js';
import { CollisionWorld } from './collision.js';
import { FirstPersonControls } from './controls.js';
import { createMobileControls, isTouchDevice } from './mobile-controls.js';
import { Intro } from './intro.js';
import { createReferenceMode } from './debug-reference.js';
import { createMiniMap } from './minimap.js';

const canvas = document.getElementById('view');
const ui = document.getElementById('ui');
const hint = document.getElementById('hint');
const startCard = document.getElementById('start');
const enterBtn = document.getElementById('enter');
const skipBtn = document.getElementById('skip');
const resetBtn = document.getElementById('reset');
const replayBtn = document.getElementById('replay');
const mapBtn = document.getElementById('map-toggle');
const refBtn = document.getElementById('ref-toggle');
const loading = document.getElementById('loading');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = isTouchDevice();
const quality = detectQuality();

/* ---------------- build ---------------- */
const { renderer, scene, camera, key } = createStage(canvas, quality);
const collision = new CollisionWorld(0.26);
const ctx = { blockers: collision.blockers, walkable: collision.walkable, ceiling: null };

const world = new THREE.Group();
world.name = 'scene';
world.add(buildArchitecture(ctx));
world.add(buildZones(ctx));
world.add(buildCapsule(ctx));
scene.add(world);

const tabletop = buildTabletop();
scene.add(tabletop);

collision.bake();

// nothing in the reconstruction animates, so bake the transforms once and stop
// three.js recomputing ~950 matrices every frame
world.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
world.updateMatrixWorld(true);

const SPAWN = {
  x: PL.wx(PL.LIFT.spawn.x),
  z: PL.wz(PL.LIFT.spawn.y),
  yaw: Math.PI,           // facing +Z, out toward the main office floor
};

const controls = new FirstPersonControls(camera, canvas, collision, {
  eyeHeight: 1.65, walkSpeed: 2.1, runSpeed: 4.0,
});
controls.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);

const intro = new Intro({
  camera, tabletop, ceiling: ctx.ceiling, scene,
  duration: reduceMotion ? 2.2 : 11.5,
});

const mobile = createMobileControls(ui, controls);
mobile.setVisible(false);

const minimap = createMiniMap(ui);
minimap.setVisible(false);

const refMode = createReferenceMode({
  camera,
  host: ui,
  onEnter() {
    controls.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock();
    ctx.ceiling.visible = false;
    tabletop.visible = true;
    refBtn.setAttribute('aria-pressed', 'true');
  },
  onExit() {
    ctx.ceiling.visible = true;
    tabletop.visible = false;
    if (intro.done) {
      controls.enabled = true;
      controls.apply();
    }
    refBtn.setAttribute('aria-pressed', 'false');
  },
});

/* ---------------- resize ---------------- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  refMode.resize();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

/* ---------------- flow ---------------- */
let started = false;

function showHint() {
  hint.textContent = touch
    ? 'Use the arrows to move · Drag to look'
    : 'Use WASD / Arrow Keys to explore · Drag or click to look';
  hint.classList.add('is-on');
  clearTimeout(showHint._t);
  showHint._t = setTimeout(() => hint.classList.remove('is-on'), 6000);
}

function beginExploring() {
  controls.enabled = true;
  controls.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);
  camera.fov = 65;
  camera.updateProjectionMatrix();
  restoreUp(camera);
  mobile.setVisible(touch);
  showHint();
}
intro.onComplete = beginExploring;

function start(skip) {
  if (started) return;
  started = true;
  startCard.classList.add('is-gone');
  ui.classList.add('is-live');
  intro.start();
  if (skip || reduceMotion) intro.skip();
}

enterBtn.addEventListener('click', () => start(false));
skipBtn.addEventListener('click', () => start(true));

resetBtn.addEventListener('click', () => {
  if (refMode.active) refMode.exit();
  controls.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);
  mobile.reset();
  showHint();
});
replayBtn.addEventListener('click', () => {
  if (refMode.active) refMode.exit();
  controls.enabled = false;
  mobile.setVisible(false);
  mobile.reset();
  intro.start();
});
mapBtn.addEventListener('click', () => {
  const on = minimap.toggle();
  mapBtn.setAttribute('aria-pressed', String(on));
});
refBtn.addEventListener('click', () => refMode.toggle());

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const k = e.code;
  if (k === 'KeyR' && started) {
    controls.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);
    mobile.reset();
  } else if (k === 'KeyM') {
    const on = minimap.toggle();
    mapBtn.setAttribute('aria-pressed', String(on));
  } else if (k === 'KeyV') {
    refMode.toggle();
  } else if (k === 'Escape' && document.pointerLockElement) {
    document.exitPointerLock();
  } else if (k === 'Enter' && !started) {
    start(false);
  }
});

controls.onLockChange = (locked) => {
  canvas.classList.toggle('grabbing', locked);
};

/* ---------------- loop ---------------- */
let adaptive = true;
const clock = new THREE.Clock();
let frames = 0, acc = 0, dpr = renderer.getPixelRatio();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (intro.running) intro.update(dt);
  else if (!refMode.active) controls.update(dt);

  if (minimap.visible && intro.done) {
    minimap.draw(controls.position.x, controls.position.z, controls.yaw);
  }

  renderer.render(scene, camera);

  // adaptive resolution: back off only after a sustained stretch under 30 fps
  acc += dt; frames++;
  if (acc > 2.5) {
    const fps = frames / acc;
    if (adaptive && fps < 26 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      if (adaptive && renderer.shadowMap.enabled && fps < 16) {
        renderer.shadowMap.enabled = false;
        key.castShadow = false;
      }
    }
    acc = 0; frames = 0;
  }
  requestAnimationFrame(tick);
}

// prime the first frame from the reference viewpoint so the start card sits
// over the model exactly as the source render shows it
referencePose(camera, window.innerWidth / window.innerHeight);
renderer.compile(scene, camera);
loading.classList.add('is-gone');
tick();

// expose the scene graph for continued refinement
window.WALKTHROUGH = {
  scene, world, camera, controls, collision, plan: PL, refMode, minimap, renderer, intro,
  setAdaptive(v) { adaptive = v; },
  // dev helper: force a synchronous render and read the pixels straight back,
  // used by the offline reference-match comparison script
  grab() { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
};
