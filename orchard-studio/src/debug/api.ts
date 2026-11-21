/** window.__studio: the only way tests drive the app, so screenshots and measurements are deterministic (22B.1). */
import * as THREE from 'three';
import type { LayoutId } from '../config';
import { countsFor } from '../data/plan';
import { player, rt, touch } from '../state/runtime';
import { useStudio, type LabelsMode, type Mode } from '../state/store';
import { doorsOpenAt, tourStops } from '../systems/tourStops';
import { setDoor } from '../scenes/director';
import { teleport } from '../scenes/walkthrough/WalkControls';
import { controlsRef } from '../scenes/Stage';
import { audio } from '../audio/engine';

export interface CameraPose {
  /** Presentation: world metres. Walkthrough: plan feet + yaw/pitch degrees. */
  position?: [number, number, number];
  target?: [number, number, number];
  plan?: { x: number; y: number; yaw: number; pitch?: number };
}

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export const extensions: Record<string, unknown> = {};

/** Visible draw items per part, for chasing draw calls (debug only). */
extensions.partsReport = () => {
  const out: Record<string, string> = {};
  const fr = new THREE.Frustum();
  const cam = rt.camera;
  if (cam) fr.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  for (const p of rt.studio?.parts ?? []) {
    if (!p.group.visible) continue;
    let n = 0;
    let inView = 0;
    let trans = 0;
    p.group.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      n++;
      if (!m.frustumCulled || fr.intersectsObject(m)) {
        inView++;
        if (((m.material as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0) trans++;
      }
    });
    out[p.name] = `${inView}/${n}${trans ? ` T${trans}` : ''}`;
  }
  return out;
};

/** Audio state and the engine's event log (unlock, play, bed, duck, mute): how sound is verified without ears. */
extensions.audio = () => ({ state: audio.getState(), events: audio.events.slice(-60) });
extensions.audioDuck = (on: boolean) => audio.duck(on);

export const api = {
  setLayout(id: LayoutId) {
    useStudio.getState().setLayout(id);
    touch(10);
  },
  setMode(mode: Mode) {
    useStudio.getState().set({ mode, inspect: null });
    touch(16);
  },
  setLabels(labels: LabelsMode) {
    useStudio.getState().set({ labels });
  },
  setQuality(q: 'ultra' | 'high' | 'medium' | 'low') {
    useStudio.getState().set({ quality: q, tier: q });
    touch(10);
  },
  /** Jump to tour stop n (1-based) in walkthrough mode, with the doors a visitor would have opened by then. */
  goToStop(n: number) {
    const st = useStudio.getState();
    if (st.mode !== 'walkthrough') st.set({ mode: 'walkthrough' });
    const stops = tourStops(st.layout);
    const s = stops[Math.max(0, Math.min(stops.length - 1, n - 1))];
    for (const d of ['lift-PL07', 'entry']) setDoor(d, doorsOpenAt(n).includes(d), true);
    const yaw = (Math.atan2(s.look[1] - s.cam[1], s.look[0] - s.cam[0]) * 180) / Math.PI;
    const dist = Math.hypot(s.look[1] - s.cam[1], s.look[0] - s.cam[0]) * 0.3048;
    const pitch = s.lookH !== undefined ? (Math.atan2(s.lookH * 0.3048 - 1.6, dist) * 180) / Math.PI : 0;
    teleport(s.cam[0], s.cam[1], yaw, pitch);
    rt.shadowDirty = true;
    touch(6);
    return s.name;
  },
  setCamera(pose: CameraPose) {
    if (pose.plan) teleport(pose.plan.x, pose.plan.y, pose.plan.yaw, pose.plan.pitch ?? 0);
    else if (pose.position && pose.target && controlsRef.current) void controlsRef.current.setLookAt(...pose.position, ...pose.target, false);
    touch(16);
  },
  setDoor(id: string, open: boolean) {
    setDoor(id, open, true);
  },
  getCounts() {
    const st = useStudio.getState();
    const scene = { instanced: 0, meshes: 0 };
    rt.studio?.root.traverseVisible((n) => {
      if ((n as THREE.InstancedMesh).isInstancedMesh) scene.instanced++;
      else if ((n as THREE.Mesh).isMesh) scene.meshes++;
    });
    const deskGroup = rt.studio?.workfloor.prefixGroups[0].group.children[0] as THREE.InstancedMesh | undefined;
    return { layout: st.layout, ...countsFor(st.layout), desksDrawn: deskGroup?.count ?? 0, scene };
  },
  getRendererInfo() {
    const i = rt.gl?.info;
    return i ? { calls: rt.info.calls, triangles: rt.info.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs?.length ?? 0 } : null;
  },
  getFps() {
    const f = rt.frameMs;
    if (!f.length) return { fps: 0, frames: 0 };
    const sorted = [...f].sort((a, b) => a - b);
    const mean = f.reduce((a, b) => a + b, 0) / f.length;
    return { fps: 1000 / mean, frames: f.length, frameMsMean: mean, frameMsP95: sorted[Math.floor(sorted.length * 0.95)], fpsP5: 1000 / sorted[Math.floor(sorted.length * 0.95)] };
  },
  resetFps() {
    rt.frameMs.length = 0;
  },
  getState() {
    const s = useStudio.getState();
    return { mode: s.mode, layout: s.layout, tier: s.tier, labels: s.labels, inspect: s.inspect, tour: s.tour, location: s.location, loading: s.loading, player: { ...player }, openDoors: [...rt.openDoors], dive: rt.dive };
  },
  /** Resolves when assets are loaded, shadows are updated and the picture has stopped changing. */
  async settle(extraFrames = 6) {
    const t0 = performance.now();
    while (!useStudio.getState().loading.done && performance.now() - t0 < 120000) await raf();
    touch(extraFrames);
    while ((rt.frame < rt.dirtyUntilFrame || rt.shadowDirty || (rt.pathTracing && !rt.pathTracingDone)) && performance.now() - t0 < 120000) {
      rt.invalidate();
      await raf();
    }
    await raf();
    return true;
  },
  ext: extensions,
};

export type StudioApi = typeof api;
declare global {
  interface Window {
    __studio: StudioApi;
  }
}
export function installApi(): void {
  window.__studio = api;
}
