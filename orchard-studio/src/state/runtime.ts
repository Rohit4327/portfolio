/**
 * Per-frame, non-React state. Anything that changes every frame lives here (plain mutable objects) so the
 * render loop never calls setState.
 */
import type * as THREE from 'three';
import type { LayoutId } from '../config';
import type { Studio } from '../scenes/studio';
import { buildNavGrid, type NavGrid } from '../systems/navgrid';

export const player = {
  /** Plan feet. */
  x: -66,
  y: -25,
  /** Heading in plan degrees CCW from east, pitch in degrees (+ up). */
  yaw: 0,
  pitch: 0,
  /** Metres walked, for footsteps. */
  odometer: 0,
  moving: false,
};

export interface Runtime {
  studio: Studio | null;
  gl: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  invalidate: () => void;
  /** Frames rendered since start, and since the last change that needed settling. */
  frame: number;
  dirtyUntilFrame: number;
  fps: number;
  frameMs: number[];
  openDoors: Set<string>;
  nav: Map<string, NavGrid>;
  /** Set by the dive director: 0 = model on the table, 1 = full-scale walkthrough. */
  dive: number;
  pathTracing: boolean;
  shadowDirty: boolean;
}

export const rt: Runtime = {
  studio: null,
  gl: null,
  scene: null,
  camera: null,
  invalidate: () => {},
  frame: 0,
  dirtyUntilFrame: 8,
  fps: 0,
  frameMs: [],
  openDoors: new Set(),
  nav: new Map(),
  dive: 0,
  pathTracing: false,
  shadowDirty: true,
};

/** Mark the picture as changed: render and count a few frames before settle() resolves. */
export function touch(frames = 4): void {
  rt.dirtyUntilFrame = Math.max(rt.dirtyUntilFrame, rt.frame + frames);
  rt.invalidate();
}

/** Nav grid for the layout with the doors that are open right now (cached per door set). */
export function navFor(layout: LayoutId): NavGrid {
  const key = `${layout}|${[...rt.openDoors].sort().join(',')}`;
  let g = rt.nav.get(key);
  if (!g) {
    g = buildNavGrid(layout, rt.openDoors);
    if (rt.nav.size > 24) rt.nav.clear();
    rt.nav.set(key, g);
  }
  return g;
}
