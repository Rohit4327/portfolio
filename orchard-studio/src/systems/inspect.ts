/**
 * Inspect framework: ease the camera to a hotspot's authored pose (0.8 s), run that hotspot's controller, and on
 * Back return to the exact walking pose.
 */
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { EYE_HEIGHT_M, FT } from '../data/geometry';
import { addFrameHook, frameHooks } from '../scenes/frameHooks';
import { applyPlayerCamera, easeInOutCubic, walkWorld } from '../scenes/director';
import { rt, touch } from '../state/runtime';
import { useStudio, type InspectState } from '../state/store';
import type { Hotspot, HotspotKind } from './hotspots';

export interface Controller {
  enter?(h: Hotspot): void;
  exit?(h: Hotspot): void;
  /** Return true while animating. */
  update?(dt: number, h: Hotspot): boolean;
  action?(name: string, arg: unknown, h: Hotspot): void;
  /** Inspect kinds whose view can be panned and zoomed by dragging. */
  panZoom?: boolean;
  /** Instant interactions never enter the inspect state. */
  instant?(h: Hotspot): void;
}
export const controllers: Partial<Record<HotspotKind, Controller>> = {};

const fromP = new THREE.Vector3();
const fromQ = new THREE.Quaternion();
const toP = new THREE.Vector3();
const toQ = new THREE.Quaternion();
const look = new THREE.Vector3();
const m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.PerspectiveCamera();
const right = new THREE.Vector3();
const upv = new THREE.Vector3();
const fwd = new THREE.Vector3();

export const inspect = {
  current: null as Hotspot | null,
  t: 1,
  dur: 0.8,
  returning: false,
  fromFov: 60,
  toFov: 60,
  /** Pan (metres, in the view plane) and zoom (1 = authored distance) for pan/zoom kinds. */
  pan: { x: 0, y: 0 },
  zoom: 1,
  dist: 1,
};

export function patch(data: Record<string, unknown>): void {
  const s = useStudio.getState();
  if (s.inspect) s.set({ inspect: { ...s.inspect, data: { ...s.inspect.data, ...data } } });
}
export function setPage(page: number): void {
  const s = useStudio.getState();
  if (s.inspect) s.set({ inspect: { ...s.inspect, page: Math.max(0, Math.min(s.inspect.pages - 1, page)) } });
}

/** Aim toP/toQ at a pose. */
export function setTargetPose(cam: readonly [number, number], camH: number, lookAt: readonly [number, number], lookHft: number): void {
  walkWorld(cam[0], cam[1], camH, toP);
  walkWorld(lookAt[0], lookAt[1], lookHft * FT, look);
  m.lookAt(toP, look, UP);
  toQ.setFromRotationMatrix(m);
  inspect.dist = toP.distanceTo(look);
}
export function retarget(dur = 0.6): void {
  const cam = rt.camera!;
  fromP.copy(cam.position);
  fromQ.copy(cam.quaternion);
  inspect.fromFov = cam.fov;
  inspect.t = 0;
  inspect.dur = dur;
}

export function startInspect(h: Hotspot): void {
  const st = useStudio.getState();
  const ctl = controllers[h.kind];
  if (!rt.camera || st.mode !== 'walkthrough') return;
  if (ctl?.instant) {
    ctl.instant(h);
    return;
  }
  if (st.inspect) endInspect(true);
  inspect.current = h;
  inspect.returning = false;
  inspect.pan.x = inspect.pan.y = 0;
  inspect.zoom = 1;
  const cam = rt.camera;
  if (h.pose) {
    setTargetPose(h.pose.cam, h.pose.camH ?? EYE_HEIGHT_M, h.pose.look, h.pose.lookH);
    inspect.toFov = h.pose.fov ?? 60;
    retarget(st.reducedMotion ? 0.01 : 0.8);
    frameHooks.cameraOverride = true;
  }
  void cam;
  const state: InspectState = { id: h.id, kind: h.kind, title: h.title, lines: h.lines, page: h.kind === 'plinth' ? h.index : 0, pages: h.pages, data: {} };
  st.set({ inspect: state });
  audio.play('cardOpen');
  ctl?.enter?.(h);
  touch(8);
}

export function endInspect(immediate = false): void {
  const h = inspect.current;
  const st = useStudio.getState();
  if (!h) {
    if (st.inspect) st.set({ inspect: null });
    return;
  }
  controllers[h.kind]?.exit?.(h);
  inspect.current = null;
  st.set({ inspect: null });
  frameHooks.walkWhileInspecting = false;
  audio.play('cardClose');
  if (h.pose && rt.camera) {
    if (immediate || st.reducedMotion) {
      frameHooks.cameraOverride = false;
      rt.camera.fov = 60;
      rt.camera.updateProjectionMatrix();
    } else {
      // Back always returns to the exact walking pose.
      applyPlayerCamera(tmp);
      fromP.copy(rt.camera.position);
      fromQ.copy(rt.camera.quaternion);
      toP.copy(tmp.position);
      toQ.copy(tmp.quaternion);
      inspect.fromFov = rt.camera.fov;
      inspect.toFov = 60;
      inspect.t = 0;
      inspect.dur = 0.6;
      inspect.returning = true;
      inspect.pan.x = inspect.pan.y = 0;
      inspect.zoom = 1;
    }
  }
  touch(8);
}

export function inspectAction(name: string, arg?: unknown): void {
  const h = inspect.current;
  if (h) controllers[h.kind]?.action?.(name, arg, h);
  touch(6);
}

addFrameHook((dt) => {
  const cam = rt.camera;
  if (!cam) return false;
  const h = inspect.current;
  let active = false;
  if (frameHooks.cameraOverride && (h?.pose || inspect.returning)) {
    if (inspect.t < 1) {
      inspect.t = Math.min(1, inspect.t + dt / inspect.dur);
      active = true;
    }
    const e = easeInOutCubic(inspect.t);
    cam.position.lerpVectors(fromP, toP, e);
    cam.quaternion.slerpQuaternions(fromQ, toQ, e);
    const fov = inspect.fromFov + (inspect.toFov - inspect.fromFov) * e;
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    if (h && (inspect.pan.x || inspect.pan.y || inspect.zoom !== 1)) {
      right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      upv.set(0, 1, 0).applyQuaternion(cam.quaternion);
      fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
      cam.position.addScaledVector(right, inspect.pan.x).addScaledVector(upv, inspect.pan.y).addScaledVector(fwd, inspect.dist * (1 - 1 / inspect.zoom));
    }
    if (inspect.returning && inspect.t >= 1) {
      inspect.returning = false;
      frameHooks.cameraOverride = false;
    }
  }
  if (h && controllers[h.kind]?.update?.(dt, h)) active = true;
  return active;
});

/** Pointer handling for pan/zoom kinds (posters, PRISM, journey): drag pans, wheel or pinch zooms, double-click fits. */
export function attachInspectInput(el: HTMLElement): () => void {
  let down = false;
  let lx = 0;
  let ly = 0;
  const ok = () => !!inspect.current && !!controllers[inspect.current.kind]?.panZoom;
  const pd = (e: PointerEvent) => {
    if (!ok()) return;
    down = true;
    lx = e.clientX;
    ly = e.clientY;
  };
  const pm = (e: PointerEvent) => {
    if (!down || !ok()) return;
    const k = (inspect.dist / inspect.zoom) * 0.0016;
    inspect.pan.x = THREE.MathUtils.clamp(inspect.pan.x - (e.clientX - lx) * k, -4, 4);
    inspect.pan.y = THREE.MathUtils.clamp(inspect.pan.y + (e.clientY - ly) * k, -1, 1);
    lx = e.clientX;
    ly = e.clientY;
    touch(3);
  };
  const pu = () => (down = false);
  const wheel = (e: WheelEvent) => {
    if (!ok()) return;
    inspect.zoom = THREE.MathUtils.clamp(inspect.zoom * Math.exp(-e.deltaY * 0.0015), 1, 4);
    touch(3);
  };
  const dbl = () => {
    if (!ok()) return;
    inspect.pan.x = inspect.pan.y = 0;
    inspect.zoom = 1;
    touch(3);
  };
  el.addEventListener('pointerdown', pd);
  window.addEventListener('pointermove', pm);
  window.addEventListener('pointerup', pu);
  el.addEventListener('wheel', wheel, { passive: true });
  el.addEventListener('dblclick', dbl);
  return () => {
    el.removeEventListener('pointerdown', pd);
    window.removeEventListener('pointermove', pm);
    window.removeEventListener('pointerup', pu);
    el.removeEventListener('wheel', wheel);
    el.removeEventListener('dblclick', dbl);
  };
}
