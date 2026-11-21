/**
 * Walkthrough input: WASD / arrows, Shift to hurry, drag (or pointer lock) to look, click the floor to walk
 * there, touch joystick + drag. Movement is in plan feet through collision2d, so the visitor slides along walls.
 */
import * as THREE from 'three';
import { FT } from '../../data/geometry';
import { moveAndSlide } from '../../systems/collision2d';
import { findPath } from '../../systems/navgrid';
import { navFor, player, rt } from '../../state/runtime';
import { useStudio } from '../../state/store';
import { WALK_OFFSET, worldToPlan } from '../director';

const WALK_MPS = 1.3;
const RUN_MPS = 2.2;
const LOOK_SMOOTH = 0.12;
const DRAG_DEG_PER_PX = 0.16;

export interface WalkTarget {
  path: [number, number][];
  i: number;
  speed: number;
  onArrive?: () => void;
  /** Turn the view along the path while walking. */
  steer: boolean;
}

export const walk = {
  enabled: false,
  keys: new Set<string>(),
  joy: { x: 0, y: 0 },
  /** Look targets, smoothed into player.yaw / pitch. */
  yawT: 0,
  pitchT: 0,
  target: null as WalkTarget | null,
  /** Soft ring shown at the click-to-walk destination (plan feet), or null. */
  ring: null as [number, number] | null,
  onUserInput: (() => {}) as () => void,
  onStep: ((_m: number) => {}) as (metres: number) => void,
};

export function lookAtPlan(x: number, y: number, hFt?: number): void {
  walk.yawT = (Math.atan2(y - player.y, x - player.x) * 180) / Math.PI;
  if (hFt !== undefined) {
    const d = Math.hypot(x - player.x, y - player.y) * FT;
    walk.pitchT = (Math.atan2(hFt * FT - 1.6, d) * 180) / Math.PI;
  } else walk.pitchT = 0;
}
export function teleport(x: number, y: number, yawDeg: number, pitchDeg = 0): void {
  player.x = x;
  player.y = y;
  player.yaw = walk.yawT = yawDeg;
  player.pitch = walk.pitchT = pitchDeg;
  walk.target = null;
  walk.ring = null;
}
/** Walk to a plan point along an A* path. Returns false if it cannot be reached. */
export function walkTo(x: number, y: number, o: { speed?: number; onArrive?: () => void; steer?: boolean; ring?: boolean } = {}): boolean {
  const g = navFor(useStudio.getState().layout);
  const path = findPath(g, [player.x, player.y], [x, y]);
  if (!path) return false;
  walk.target = { path: path as [number, number][], i: 1, speed: o.speed ?? WALK_MPS, onArrive: o.onArrive, steer: o.steer ?? true };
  walk.ring = o.ring ? [path[path.length - 1][0], path[path.length - 1][1]] : null;
  return true;
}

const angDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;
const pos = { x: 0, y: 0 };

/** Advance the visitor. Returns true if anything moved (so the frame must render). */
export function updateWalk(dt: number): boolean {
  const k = walk.keys;
  let fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - walk.joy.y;
  let strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + walk.joy.x;
  const manual = Math.abs(fwd) > 0.05 || Math.abs(strafe) > 0.05;
  let dx = 0;
  let dy = 0;
  if (manual && walk.enabled) {
    if (walk.target) {
      walk.target = null;
      walk.ring = null;
    }
    const l = Math.hypot(fwd, strafe);
    if (l > 1) {
      fwd /= l;
      strafe /= l;
    }
    const sp = ((k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_MPS : WALK_MPS) / FT) * dt;
    const a = (player.yaw * Math.PI) / 180;
    dx = (Math.cos(a) * fwd + Math.sin(a) * strafe) * sp;
    dy = (Math.sin(a) * fwd - Math.cos(a) * strafe) * sp;
  } else if (walk.target) {
    const t = walk.target;
    let budget = (t.speed / FT) * dt;
    pos.x = player.x;
    pos.y = player.y;
    while (budget > 0 && t.i < t.path.length) {
      const [tx, ty] = t.path[t.i];
      const d = Math.hypot(tx - pos.x, ty - pos.y);
      if (d <= budget) {
        pos.x = tx;
        pos.y = ty;
        budget -= d;
        t.i++;
      } else {
        pos.x += ((tx - pos.x) / d) * budget;
        pos.y += ((ty - pos.y) / d) * budget;
        budget = 0;
      }
    }
    dx = pos.x - player.x;
    dy = pos.y - player.y;
    if (t.steer && (dx || dy)) {
      walk.yawT = (Math.atan2(dy, dx) * 180) / Math.PI;
      walk.pitchT = 0;
    }
    if (t.i >= t.path.length) {
      walk.target = null;
      walk.ring = null;
      t.onArrive?.();
    }
  }
  let moved = false;
  if (dx || dy) {
    const bx = player.x;
    const by = player.y;
    pos.x = bx;
    pos.y = by;
    moveAndSlide(navFor(useStudio.getState().layout).world, pos, dx, dy);
    player.x = pos.x;
    player.y = pos.y;
    const m = Math.hypot(player.x - bx, player.y - by) * FT;
    if (m > 1e-5) {
      player.odometer += m;
      walk.onStep(m);
      moved = true;
    }
  }
  player.moving = moved;
  // Smoothed look (0.12 → critically damped feel, frame-rate independent).
  const kk = 1 - Math.pow(LOOK_SMOOTH, dt * 12);
  const dyaw = angDiff(walk.yawT, player.yaw);
  const dpitch = walk.pitchT - player.pitch;
  if (Math.abs(dyaw) > 0.01 || Math.abs(dpitch) > 0.01) {
    player.yaw += dyaw * kk;
    player.pitch += dpitch * kk;
    moved = true;
  }
  return moved;
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

/** Attach DOM listeners. Returns a cleanup function. */
export function attachWalkInput(el: HTMLElement): () => void {
  let dragging = false;
  let dragDist = 0;
  let lastX = 0;
  let lastY = 0;
  let pointerId = -1;
  let joyId = -1;
  let joyX = 0;
  let joyY = 0;
  const look = (mx: number, my: number) => {
    walk.yawT -= mx * DRAG_DEG_PER_PX;
    walk.pitchT = Math.max(-70, Math.min(70, walk.pitchT - my * DRAG_DEG_PER_PX));
    if (walk.target && !walk.target.steer) return;
    if (walk.target) walk.target.steer = false;
  };
  const active = () => walk.enabled && !useStudio.getState().inspect;
  const down = (e: PointerEvent) => {
    if (!active()) return;
    walk.onUserInput();
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.4 && e.clientY > window.innerHeight * 0.45 && joyId < 0) {
      joyId = e.pointerId;
      joyX = e.clientX;
      joyY = e.clientY;
      return;
    }
    dragging = true;
    dragDist = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    pointerId = e.pointerId;
  };
  const move = (e: PointerEvent) => {
    if (!active()) return;
    if (e.pointerId === joyId) {
      walk.joy.x = Math.max(-1, Math.min(1, (e.clientX - joyX) / 60));
      walk.joy.y = Math.max(-1, Math.min(1, (e.clientY - joyY) / 60));
      return;
    }
    if (document.pointerLockElement === el) {
      look(e.movementX, e.movementY);
      rt.invalidate();
      return;
    }
    if (!dragging || e.pointerId !== pointerId) return;
    const mx = e.clientX - lastX;
    const my = e.clientY - lastY;
    dragDist += Math.abs(mx) + Math.abs(my);
    lastX = e.clientX;
    lastY = e.clientY;
    if (dragDist > 4) look(-mx, -my);
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId === joyId) {
      joyId = -1;
      walk.joy.x = walk.joy.y = 0;
      return;
    }
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    if (!active() || dragDist > 6 || !rt.camera) return;
    // A click, not a drag: walk to the floor point under the pointer.
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, rt.camera);
    plane.constant = -WALK_OFFSET.y;
    if (ray.ray.intersectPlane(plane, hit) && hit.distanceTo(rt.camera.position) < 40) {
      const [px, py] = worldToPlan(hit);
      walkTo(px, py, { ring: true });
    }
  };
  const key = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.type === 'keydown') {
      walk.keys.add(e.code);
      if (active()) {
        walk.onUserInput();
        if (e.code === 'KeyL') {
          if (document.pointerLockElement === el) document.exitPointerLock();
          else void el.requestPointerLock?.();
        }
      }
    } else walk.keys.delete(e.code);
  };
  const lock = () => useStudio.getState().set({ pointerLocked: document.pointerLockElement === el });
  const blur = () => walk.keys.clear();
  el.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', key);
  window.addEventListener('keyup', key);
  window.addEventListener('blur', blur);
  document.addEventListener('pointerlockchange', lock);
  return () => {
    el.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    window.removeEventListener('keydown', key);
    window.removeEventListener('keyup', key);
    window.removeEventListener('blur', blur);
    document.removeEventListener('pointerlockchange', lock);
  };
}
