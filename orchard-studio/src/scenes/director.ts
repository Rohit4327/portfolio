/**
 * World placement and per-frame motion shared by all modes: where the 1:40 model sits on the table, how the
 * same scene graph scales up to full size about a pivot, doors easing, and layout parts rising into place.
 */
import * as THREE from 'three';
import { EYE_HEIGHT_M, FT, MODEL_EXTENT } from '../data/geometry';
import { arrivalCar } from '../data/plan';
import { MODEL_SCALE } from '../architecture/context';
import { player, rt, touch } from '../state/runtime';
import { useStudio } from '../state/store';

/** Table top surface height (0.86 m leg frames + 50 mm top). */
export const TABLE_TOP_Y = 0.91;
export const TABLE_SIZE = { w: 2.6, d: 1.3, t: 0.05 };
/** 10 mm board + 5 mm reveal under the model floor. */
const BOARD_STACK = 0.0155;

const extentCentre = new THREE.Vector3(((MODEL_EXTENT.x0 + MODEL_EXTENT.x1) / 2) * FT, 0, (-(MODEL_EXTENT.y0 + MODEL_EXTENT.y1) / 2) * FT);
/** World position of the model root in presentation mode. */
export const MODEL_ORIGIN = new THREE.Vector3(-extentCentre.x * MODEL_SCALE, TABLE_TOP_Y + BOARD_STACK, -extentCentre.z * MODEL_SCALE);
const car = arrivalCar();
/** Dive pivot: centre of lift car PL07 at floor level, in model-local metres. */
export const CAR_PIVOT = new THREE.Vector3(((car.x0 + car.x1) / 2) * FT, 0, (-(car.y0 + car.y1) / 2) * FT);
/** Where a model-local point sits on the table. */
export const tablePos = (local: THREE.Vector3, out = new THREE.Vector3()) => out.copy(local).multiplyScalar(MODEL_SCALE).add(MODEL_ORIGIN);
/** Root offset in walkthrough mode: full scale, with PL07 exactly where it was on the table (so the dive has no cut). */
export const WALK_OFFSET = tablePos(CAR_PIVOT).sub(CAR_PIVOT);

const _v = new THREE.Vector3();
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Scale for dive progress e (0 table … 1 full size). Geometric, so the zoom feels even. */
export const diveScale = (e: number) => MODEL_SCALE * Math.pow(1 / MODEL_SCALE, e);

/** Place the world group at scale s so that model-local `pivot` sits at `pivotWorld`. */
export function placeWorld(world: THREE.Object3D, s: number, pivot: THREE.Vector3, pivotWorld: THREE.Vector3): void {
  world.scale.setScalar(s);
  world.position.copy(pivotWorld).sub(_v.copy(pivot).multiplyScalar(s));
  world.updateMatrixWorld(true);
}
export function placeWorldForMode(world: THREE.Object3D, walk: boolean): void {
  if (walk) {
    world.scale.setScalar(1);
    world.position.copy(WALK_OFFSET);
  } else {
    world.scale.setScalar(MODEL_SCALE);
    world.position.copy(MODEL_ORIGIN);
  }
  world.updateMatrixWorld(true);
}

/** Plan feet + height in metres → world position in walkthrough space. */
export function walkWorld(x: number, y: number, hM: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(x * FT + WALK_OFFSET.x, hM + WALK_OFFSET.y, -y * FT + WALK_OFFSET.z);
}
/** Inverse of walkWorld for points on the floor plane. */
export function worldToPlan(p: THREE.Vector3): [number, number] {
  return [(p.x - WALK_OFFSET.x) / FT, -(p.z - WALK_OFFSET.z) / FT];
}

/** Put the camera at the visitor's eye. */
export function applyPlayerCamera(cam: THREE.PerspectiveCamera): void {
  walkWorld(player.x, player.y, EYE_HEIGHT_M, cam.position);
  cam.rotation.order = 'YXZ';
  cam.rotation.set(THREE.MathUtils.degToRad(player.pitch), THREE.MathUtils.degToRad(player.yaw - 90), 0);
}

/* ── doors ── */
const doorTarget = new Map<string, number>();
const DOOR_SECONDS: Record<string, number> = { lift: 1.2, slideGlass: 0.9, swingGlass: 0.7, swingSolid: 0.7 };
export function setDoor(id: string, open: boolean, instant = false): void {
  doorTarget.set(id, open ? 1 : 0);
  const rig = rt.studio?.doors[id];
  if (rig && instant) {
    rig.set(open ? 1 : 0);
    syncDoorCollision(id, open);
  }
  touch(6);
}
export const isDoorOpen = (id: string) => rt.openDoors.has(id);
function syncDoorCollision(id: string, open: boolean) {
  if (open) rt.openDoors.add(id);
  else rt.openDoors.delete(id);
}
export function updateDoors(dt: number): boolean {
  const s = rt.studio;
  if (!s) return false;
  let moving = false;
  for (const [id, target] of doorTarget) {
    const rig = s.doors[id];
    if (!rig || rig.f === target) continue;
    const dur = DOOR_SECONDS[rig.door.kind] ?? 0.8;
    const step = dt / dur;
    const f = target > rig.f ? Math.min(target, rig.f + step) : Math.max(target, rig.f - step);
    rig.set(f);
    // Passable once mostly open; solid again as soon as it starts to close.
    syncDoorCollision(id, f > 0.85 && target === 1);
    moving = true;
  }
  return moving;
}

/* ── layout parts rising into place (Section 5) ── */
const RISE_M = 0.06;
const RISE_S = 0.35;
let riseT = 1;
export function startRise(): void {
  const s = rt.studio;
  if (!s || !s.entering.length) return;
  if (useStudio.getState().reducedMotion) {
    for (const p of s.entering) p.group.position.y = 0;
    return;
  }
  riseT = 0;
  for (const p of s.entering) p.group.position.y = -RISE_M;
}
export function updateRise(dt: number): boolean {
  const s = rt.studio;
  if (!s || riseT >= 1) return false;
  riseT = Math.min(1, riseT + dt / RISE_S);
  const y = -RISE_M * (1 - easeInOutCubic(riseT));
  for (const p of s.entering) p.group.position.y = y;
  if (riseT >= 1) rt.shadowDirty = true;
  return true;
}
