/**
 * controls.js — custom first-person controller.
 * Pointer Lock when available, click-and-drag as a fallback, keyboard on WASD
 * and the arrow keys, Shift to move faster, R to return to the lift lobby.
 * Movement is acceleration-based with smooth deceleration; no head bob unless
 * it is explicitly enabled.
 */
import * as THREE from 'three';

const KEY_FWD = new Set(['KeyW', 'ArrowUp']);
const KEY_BACK = new Set(['KeyS', 'ArrowDown']);
const KEY_LEFT = new Set(['KeyA', 'ArrowLeft']);
const KEY_RIGHT = new Set(['KeyD', 'ArrowRight']);

export class FirstPersonControls {
  constructor(camera, dom, collision, opts = {}) {
    this.camera = camera;
    this.dom = dom;
    this.collision = collision;
    this.enabled = false;

    this.eyeHeight = opts.eyeHeight ?? 1.65;
    this.walkSpeed = opts.walkSpeed ?? 2.1;
    this.runSpeed = opts.runSpeed ?? 4.0;
    this.accel = 14;
    this.damping = 11;
    this.lookSpeed = 0.0022;
    this.headBob = false;

    this.position = new THREE.Vector3(0, this.eyeHeight, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this._bob = 0;

    this.keys = new Set();
    this.touchMove = { x: 0, z: 0 };
    this.pointerLocked = false;
    this._dragging = false;
    this._last = { x: 0, y: 0 };
    this._lookPointerId = null;

    this._bind();
  }

  _bind() {
    const dom = this.dom;

    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      if (e.code === 'Escape') return;
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());

    // --- pointer lock -------------------------------------------------
    this._onLockChange = () => {
      this.pointerLocked = document.pointerLockElement === dom;
      dom.classList.toggle('is-locked', this.pointerLocked);
      this.onLockChange?.(this.pointerLocked);
    };
    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('pointerlockerror', () => { this.pointerLocked = false; });

    this._onMouseMove = (e) => {
      if (!this.enabled || !this.pointerLocked) return;
      this.targetYaw -= e.movementX * this.lookSpeed;
      this.targetPitch -= e.movementY * this.lookSpeed;
      this._clampPitch();
    };
    document.addEventListener('mousemove', this._onMouseMove);

    // --- click / drag fallback + touch look ---------------------------
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (!this.pointerLocked && this.wantPointerLock !== false) {
          dom.requestPointerLock?.();
        }
        this._dragging = true;
        this._last = { x: e.clientX, y: e.clientY };
      } else {
        // touch: only the right half of the screen drives the camera
        if (e.clientX < window.innerWidth * 0.36 && window.innerWidth < 1024) return;
        this._lookPointerId = e.pointerId;
        this._last = { x: e.clientX, y: e.clientY };
      }
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (!this._dragging || this.pointerLocked) return;
      } else if (e.pointerId !== this._lookPointerId) return;
      const dx = e.clientX - this._last.x, dy = e.clientY - this._last.y;
      this._last = { x: e.clientX, y: e.clientY };
      const s = e.pointerType === 'mouse' ? 0.0032 : 0.0042;
      this.targetYaw -= dx * s;
      this.targetPitch -= dy * s;
      this._clampPitch();
    });
    const release = (e) => {
      if (e.pointerType === 'mouse') this._dragging = false;
      else if (e.pointerId === this._lookPointerId) this._lookPointerId = null;
    };
    dom.addEventListener('pointerup', release);
    dom.addEventListener('pointercancel', release);
    dom.addEventListener('pointerleave', release);
  }

  _clampPitch() {
    const lim = Math.PI / 2 - 0.08;
    this.targetPitch = Math.max(-lim, Math.min(lim, this.targetPitch));
  }

  teleport(x, z, yaw = Math.PI, pitch = 0) {
    const s = this.collision.snap(x, z);
    this.position.set(s.x, this.eyeHeight, s.z);
    this.yaw = this.targetYaw = yaw;
    this.pitch = this.targetPitch = pitch;
    this.velocity.set(0, 0, 0);
    this.apply();
  }

  apply() {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  /** Combined desired direction from keyboard + on-screen arrows. */
  inputVector() {
    let f = this.touchMove.z, s = this.touchMove.x;
    for (const k of this.keys) {
      if (KEY_FWD.has(k)) f += 1;
      else if (KEY_BACK.has(k)) f -= 1;
      else if (KEY_LEFT.has(k)) s -= 1;
      else if (KEY_RIGHT.has(k)) s += 1;
    }
    const len = Math.hypot(f, s);
    return len > 1 ? { f: f / len, s: s / len } : { f, s };
  }

  update(dt) {
    if (!this.enabled) return;
    dt = Math.min(dt, 0.05);

    // smoothed look
    const k = 1 - Math.exp(-18 * dt);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;

    const { f, s } = this.inputVector();
    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.boost;
    const speed = running ? this.runSpeed : this.walkSpeed;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward is -Z in view space
    const wishX = (-sin * f + cos * s) * speed;
    const wishZ = (-cos * f - sin * s) * speed;

    const a = this.accel * dt;
    this.velocity.x += (wishX - this.velocity.x) * Math.min(1, a);
    this.velocity.z += (wishZ - this.velocity.z) * Math.min(1, a);
    if (!f && !s) {
      const d = Math.exp(-this.damping * dt);
      this.velocity.x *= d;
      this.velocity.z *= d;
      if (Math.abs(this.velocity.x) < 0.002) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.002) this.velocity.z = 0;
    }

    const moved = this.collision.move(
      this.position.x, this.position.z, this.velocity.x * dt, this.velocity.z * dt);
    if (moved.x === this.position.x) this.velocity.x *= 0.2;
    if (moved.z === this.position.z) this.velocity.z *= 0.2;
    this.position.x = moved.x;
    this.position.z = moved.z;

    let y = this.eyeHeight;
    if (this.headBob) {
      const sp = Math.hypot(this.velocity.x, this.velocity.z);
      this._bob += dt * sp * 6.2;
      y += Math.sin(this._bob) * 0.014 * Math.min(1, sp / 2);
    }
    this.position.y = y;
    this.apply();
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
  }
}
