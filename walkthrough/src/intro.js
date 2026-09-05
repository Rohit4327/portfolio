/**
 * intro.js — the cinematic model-to-POV transition.
 *
 * STATE 1  architectural model seen from the supplied reference angle
 * STATE 2  slow approach toward the rear-centre lift lobby
 * STATE 3  the move accelerates
 * STATE 4  the camera crosses the architectural scale boundary
 * STATE 5  the walnut tabletop falls away, the ceiling closes in
 * STATE 6  the camera rotates and lowers toward eye height
 * STATE 7  it settles inside the lift lobby, facing the workspace
 *
 * One continuous camera move — position, orientation and field of view are all
 * interpolated, so there is never a hard cut between model and life size.
 */
import * as THREE from 'three';
import { mat } from './materials.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** eye, target and fov keyframes along normalised time */
const KEYS = [
  { t: 0.00, eye: [0.885, 55.4, -0.33], look: [0.885, 0.00, -0.33], fov: 22, up: 'top' },
  { t: 0.18, eye: [2.40, 42.0, -3.50], look: [4.20, 0.00, -5.50], fov: 25, up: 'blend' },
  { t: 0.42, eye: [4.20, 24.0, -14.5], look: [4.62, 0.80, -6.00], fov: 34, up: 'world' },
  { t: 0.62, eye: [4.62, 12.4, -11.6], look: [4.62, 1.50, -4.60], fov: 46, up: 'world' },
  { t: 0.80, eye: [4.62, 6.40, -9.20], look: [4.62, 1.80, -2.80], fov: 56, up: 'world' },
  { t: 0.92, eye: [4.62, 3.30, -7.90], look: [4.62, 1.70, -2.40], fov: 62, up: 'world' },
  { t: 1.00, eye: [4.62, 1.65, -7.53], look: [4.62, 1.62, -1.60], fov: 65, up: 'world' },
];

const UP_TOP = new THREE.Vector3(0, 0, -1);
const UP_WORLD = new THREE.Vector3(0, 1, 0);

export class Intro {
  constructor({ camera, tabletop, ceiling, scene, duration = 11.5 }) {
    this.camera = camera;
    this.tabletop = tabletop;
    this.ceiling = ceiling;
    this.scene = scene;
    this.duration = duration;
    this.time = 0;
    this.running = false;
    this.done = false;

    this._eye = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._bgFrom = new THREE.Color(0x16110d);
    this._bgTo = new THREE.Color(0xdfe6ea);
  }

  start() {
    this.running = true;
    this.done = false;
    this.time = 0;
    this.tabletop.visible = true;
    this.ceiling.visible = false;
    mat.walnut.transparent = true;
    mat.walnut.opacity = 1;
    mat.ceiling.transparent = true;
    mat.ceiling.opacity = 0;
    mat.ceilingLight.transparent = true;
    mat.ceilingLight.opacity = 0;
    this.scene.background = this._bgFrom.clone();
    this.sample(0);
  }

  /** Timeline shaping: slow at first (state 2), then accelerating (state 3). */
  progress() {
    const raw = Math.min(1, this.time / this.duration);
    return raw < 0.35
      ? easeIn(raw / 0.35) * 0.28
      : 0.28 + easeInOut((raw - 0.35) / 0.65) * 0.72;
  }

  sample(p) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const local = THREE.MathUtils.clamp((p - a.t) / (b.t - a.t), 0, 1);
    const k = easeInOut(local);

    this._eye.set(...a.eye).lerp(new THREE.Vector3(...b.eye), k);
    this._look.set(...a.look).lerp(new THREE.Vector3(...b.look), k);
    const fov = THREE.MathUtils.lerp(a.fov, b.fov, k);

    // the "up" vector rolls from the plan-view convention to world up
    const upBlend = THREE.MathUtils.clamp((p - 0.06) / 0.26, 0, 1);
    this._up.copy(UP_TOP).lerp(UP_WORLD, easeInOut(upBlend)).normalize();
    if (this._up.lengthSq() < 0.01) this._up.copy(UP_WORLD);

    this.camera.position.copy(this._eye);
    this._m.lookAt(this._eye, this._look, this._up);
    this._q.setFromRotationMatrix(this._m);
    this.camera.quaternion.copy(this._q);
    this.camera.up.copy(UP_WORLD);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    /* --- state 4/5: the model dissolves into life-sized architecture --- */
    const tableFade = 1 - THREE.MathUtils.clamp((p - 0.26) / 0.30, 0, 1);
    mat.walnut.opacity = tableFade;
    this.tabletop.visible = tableFade > 0.01;

    const ceilFade = THREE.MathUtils.clamp((p - 0.90) / 0.09, 0, 1);
    this.ceiling.visible = ceilFade > 0.001;
    mat.ceiling.opacity = ceilFade;
    mat.ceilingLight.opacity = ceilFade;

    const bg = THREE.MathUtils.clamp((p - 0.18) / 0.45, 0, 1);
    this.scene.background = this._bgFrom.clone().lerp(this._bgTo, easeOut(bg));
    return p;
  }

  update(dt) {
    if (!this.running) return false;
    this.time += dt;
    const p = this.progress();
    this.sample(p);
    if (p >= 1) this.finish();
    return this.running;
  }

  /** Jump straight to the lift lobby (Skip Intro / prefers-reduced-motion). */
  skip() {
    this.time = this.duration;
    this.sample(1);
    this.finish();
  }

  finish() {
    if (this.done) return;
    this.running = false;
    this.done = true;
    this.tabletop.visible = false;
    this.ceiling.visible = true;
    mat.ceiling.opacity = 1;
    mat.ceilingLight.opacity = 1;
    mat.ceiling.transparent = false;
    mat.ceilingLight.transparent = false;
    this.scene.background = this._bgTo.clone();
    this.onComplete?.();
  }
}
