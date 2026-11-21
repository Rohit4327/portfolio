/** Projection of plan points to screen pixels, shared by every HTML overlay element (one rAF loop, no React state). */
import * as THREE from 'three';
import { FT } from '../data/geometry';
import { stage } from '../scenes/transition/dive';
import { rt } from '../state/runtime';

const v = new THREE.Vector3();
export interface Screen {
  x: number;
  y: number;
  /** Distance from the camera in metres; negative when behind it. */
  d: number;
}
export function projectPlan(x: number, y: number, hFt: number, out: Screen): Screen {
  const cam = rt.camera;
  const world = stage.refs?.world;
  if (!cam || !world || !rt.gl) {
    out.d = -1;
    return out;
  }
  v.set(x * FT, hFt * FT, -y * FT).applyMatrix4(world.matrixWorld);
  out.d = v.distanceTo(cam.position);
  v.project(cam);
  if (v.z > 1) out.d = -1;
  const el = rt.gl.domElement;
  out.x = (v.x * 0.5 + 0.5) * el.clientWidth;
  out.y = (-v.y * 0.5 + 0.5) * el.clientHeight;
  return out;
}

type Tick = () => void;
const ticks = new Set<Tick>();
let running = false;
/** Register a per-frame overlay updater. All overlays share one requestAnimationFrame loop. */
export function onOverlayFrame(t: Tick): () => void {
  ticks.add(t);
  if (!running) {
    running = true;
    const loop = () => {
      for (const f of ticks) f();
      if (ticks.size) requestAnimationFrame(loop);
      else running = false;
    };
    requestAnimationFrame(loop);
  }
  return () => ticks.delete(t);
}
