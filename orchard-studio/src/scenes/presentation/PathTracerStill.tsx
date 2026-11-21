/**
 * Photoreal stills (4.7): Ultra tier, presentation mode only. After 2 s without input the view is refined with
 * three-gpu-pathtracer up to 256 samples; any input returns to raster instantly. The BVH is built once in a
 * worker and rebuilt only when the layout changes. Dynamically imported so other tiers never download it.
 */
import { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { rt } from '../../state/runtime';
import { useStudio } from '../../state/store';

const IDLE_MS = 2000;
const MAX_SAMPLES = 256;

interface Tracer {
  samples: number;
  renderSample(): void;
  setBVHWorker(w: unknown): void;
  setSceneAsync(scene: THREE.Scene, camera: THREE.Camera): Promise<void>;
  updateCamera(): void;
  dispose(): void;
  tiles: THREE.Vector2;
  renderScale: number;
  minSamples: number;
  fadeDuration: number;
}

const state = { tracer: null as Tracer | null, builtFor: '', building: false, failed: false, lastSamples: 0 };

export function PathTracerStill() {
  const { gl, scene, camera, invalidate } = useThree();
  const tier = useStudio((s) => s.tier);
  const mode = useStudio((s) => s.mode);
  const layout = useStudio((s) => s.layout);
  const on = tier === 'ultra' && mode === 'presentation';

  useEffect(() => {
    if (!on) stop(gl);
    return () => stop(gl);
  }, [on, gl]);
  useEffect(() => {
    // A layout change invalidates the cached BVH.
    state.builtFor = '';
  }, [layout]);

  useFrame(() => {
    if (!on || state.failed) return;
    const idle = performance.now() - rt.lastTouch > IDLE_MS;
    if (!idle) {
      if (rt.pathTracing) stop(gl);
      return;
    }
    if (!state.tracer || state.builtFor !== layout) {
      if (!state.building) void build(gl, scene, camera, layout).then(() => invalidate());
      return;
    }
    if (!rt.pathTracing) {
      rt.pathTracing = true;
      gl.toneMapping = THREE.AgXToneMapping; // the tracer's own output pass needs the renderer's tone mapping
      state.tracer.updateCamera();
    }
    if (state.tracer.samples < MAX_SAMPLES) {
      state.tracer.renderSample();
      const n = Math.floor(state.tracer.samples);
      if (n !== state.lastSamples) {
        state.lastSamples = n;
        useStudio.getState().set({ refining: n });
      }
      invalidate();
    } else if (rt.pathTracing) {
      // Finished: hold the converged image without spending more frames.
      state.tracer.renderSample();
      rt.pathTracingDone = true;
    }
  }, 4);
  return null;
}

async function build(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, layout: string): Promise<void> {
  state.building = true;
  try {
    const [{ WebGLPathTracer }, { ParallelMeshBVHWorker }] = await Promise.all([import('three-gpu-pathtracer'), import('three-mesh-bvh/worker')]);
    if (!state.tracer) {
      const t = new WebGLPathTracer(gl) as unknown as Tracer;
      t.setBVHWorker(new ParallelMeshBVHWorker());
      t.tiles.set(3, 3);
      t.renderScale = 1;
      t.minSamples = 1;
      t.fadeDuration = 300;
      state.tracer = t;
    }
    await state.tracer.setSceneAsync(scene, camera);
    state.builtFor = layout;
  } catch (e) {
    // No float render targets, a lost context or an unsupported material: stay on raster.
    state.failed = true;
    console.info('Path-traced stills unavailable on this device; staying on raster.', e);
  } finally {
    state.building = false;
  }
}

function stop(gl: THREE.WebGLRenderer): void {
  if (!rt.pathTracing && !rt.pathTracingDone) return;
  rt.pathTracing = false;
  rt.pathTracingDone = false;
  state.lastSamples = 0;
  gl.toneMapping = THREE.NoToneMapping;
  useStudio.getState().set({ refining: 0 });
}
