/** The single R3F scene: one studio graph, two light rigs, and the per-frame director. */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { CONFIG } from '../config';
import { setTransmission } from '../core/materials';
import { TIERS } from '../core/quality';
import { FT, MODEL_EXTENT } from '../data/geometry';
import { player, rt, touch } from '../state/runtime';
import { useStudio } from '../state/store';
import { buildStudio } from './studio';
import { applyPlayerCamera, MODEL_ORIGIN, placeWorldForMode, startRise, TABLE_TOP_Y, updateDoors, updateRise, WALK_OFFSET } from './director';
import { skyEnv, skyMaterial, studioEnv, sunDirection } from './env';
import { attachWalkInput, updateWalk, walk } from './walkthrough/WalkControls';
import { PresentationRoom } from './presentation/Room';
import { frameHooks } from './frameHooks';

/** Default presentation view: pitch 62°, whole table in frame (Section 4.5). */
export const PRES_TARGET = new THREE.Vector3(0, TABLE_TOP_Y + 0.02, 0.02);
export const PRES_DISTANCE = 3.3;
export const PRES_PITCH = THREE.MathUtils.degToRad(62);
export const presHome = () => new THREE.Vector3(0, Math.sin(PRES_PITCH) * PRES_DISTANCE, Math.cos(PRES_PITCH) * PRES_DISTANCE).add(PRES_TARGET);

let controlsInit = false;
export const controlsRef: { current: CameraControlsImpl | null } = { current: null };

export function resetPresentationCamera(animate = true): void {
  const c = controlsRef.current;
  if (!c) return;
  const p = presHome();
  void c.setLookAt(p.x, p.y, p.z, PRES_TARGET.x, PRES_TARGET.y, PRES_TARGET.z, animate && !useStudio.getState().reducedMotion);
  touch(20);
}

export function Stage() {
  const { gl, scene, camera, invalidate } = useThree();
  const mode = useStudio((s) => s.mode);
  const layout = useStudio((s) => s.layout);
  const tier = useStudio((s) => s.tier);
  const autoOrbit = useStudio((s) => s.autoOrbit);
  const spec = TIERS[tier];
  const world = useRef<THREE.Group>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);

  const studio = useMemo(() => buildStudio(), []);
  const sunDir = useMemo(() => sunDirection(CONFIG.timeOfDay, CONFIG.windowFacing), []);
  const envs = useMemo(() => ({ studio: studioEnv(gl), sky: skyEnv(gl, sunDir) }), [gl, sunDir]);
  const sky = useMemo(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMaterial(sunDir));
    m.name = 'sky';
    m.frustumCulled = false;
    m.renderOrder = -10;
    return m;
  }, [sunDir]);

  useEffect(() => {
    rt.studio = studio;
    rt.gl = gl;
    rt.scene = scene;
    rt.camera = camera as THREE.PerspectiveCamera;
    rt.invalidate = invalidate;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.shadowMap.autoUpdate = false;
    useStudio.getState().set({ loading: { progress: 0.7, done: false } });
    const off = attachWalkInput(gl.domElement);
    return off;
  }, [studio, gl, scene, camera, invalidate]);

  // Layout or mode changed: toggle parts, refresh the static shadow map once.
  useEffect(() => {
    const walkMode = mode === 'walkthrough';
    studio.apply(layout, walkMode ? 'walk' : 'model');
    if (mode !== 'transition' && world.current) placeWorldForMode(world.current, walkMode);
    if (mode !== 'transition') rt.dive = walkMode ? 1 : 0;
    startRise();
    setTransmission(walkMode);
    scene.environment = walkMode ? envs.sky : envs.studio;
    scene.environmentIntensity = walkMode ? 0.55 : 0.4;
    walk.enabled = walkMode;
    const cam = camera as THREE.PerspectiveCamera;
    if (walkMode) {
      cam.fov = 60;
      cam.near = 0.08;
      cam.far = 2500;
    } else if (mode === 'presentation') {
      cam.fov = 30;
      cam.near = 0.05;
      cam.far = 120;
    }
    cam.updateProjectionMatrix();
    rt.shadowDirty = true;
    touch(12);
  }, [studio, layout, mode, scene, envs, camera]);

  useEffect(() => {
    rt.shadowDirty = true;
    touch(8);
  }, [tier]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    rt.frame++;
    const m = useStudio.getState().mode;
    let active = false;
    if (updateDoors(dt)) active = true;
    if (updateRise(dt)) active = true;
    for (const h of frameHooks) if (h(dt)) active = true;
    if (m === 'walkthrough') {
      if (!useStudio.getState().inspect || frameHooks.walkWhileInspecting) {
        if (updateWalk(dt)) active = true;
      }
      if (!frameHooks.cameraOverride) applyPlayerCamera(camera as THREE.PerspectiveCamera);
    }
    if (rt.shadowDirty) {
      gl.shadowMap.needsUpdate = true;
      rt.shadowDirty = false;
      active = true;
    }
    // Render on demand in presentation; continuous while anything moves.
    if (active || rt.frame < rt.dirtyUntilFrame || m === 'transition') invalidate();
  }, -1);

  const cx = ((MODEL_EXTENT.x0 + MODEL_EXTENT.x1) / 2) * FT;
  const cz = (-(MODEL_EXTENT.y0 + MODEL_EXTENT.y1) / 2) * FT;
  const walkMode = mode === 'walkthrough';
  return (
    <>
      <group ref={world} position={MODEL_ORIGIN} scale={1 / 40}>
        <primitive object={studio.root} />
        {/* Walkthrough sun: fitted to the whole floor plate, static shadow map. */}
        <directionalLight
          ref={sun}
          visible={walkMode}
          castShadow
          intensity={4.2}
          color="#fff3e2"
          position={[cx + sunDir.x * 70, sunDir.y * 70, cz + sunDir.z * 70]}
          shadow-mapSize={[spec.shadowWalk, spec.shadowWalk]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
          shadow-radius={3}
        >
          <orthographicCamera attach="shadow-camera" args={[-27, 27, 22, -22, 10, 130]} />
        </directionalLight>
        <object3D position={[cx, 0, cz]} ref={(o) => void (o && sun.current && (sun.current.target = o))} />
        <hemisphereLight visible={walkMode} args={['#ffffff', '#d8d4cc', 0.55]} />
        <primitive object={sky} visible={walkMode} />
      </group>
      {/* Presentation key light: upper left, 55° elevation, soft. */}
      <directionalLight
        ref={key}
        visible={!walkMode}
        castShadow
        intensity={2.4}
        position={[PRES_TARGET.x - 1.5, PRES_TARGET.y + 3.2, PRES_TARGET.z - 1.65]}
        shadow-mapSize={[spec.shadowModel, spec.shadowModel]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.002}
        shadow-radius={5}
      >
        <orthographicCamera attach="shadow-camera" args={[-1.7, 1.7, 1.2, -1.2, 0.5, 8]} />
      </directionalLight>
      <object3D position={PRES_TARGET} ref={(o) => void (o && key.current && (key.current.target = o))} />
      <PresentationRoom visible={!walkMode} />
      <CameraControls
        ref={(c) => {
          controlsRef.current = c;
          if (c && !controlsInit) {
            controlsInit = true;
            const p = presHome();
            void c.setLookAt(p.x, p.y, p.z, PRES_TARGET.x, PRES_TARGET.y, PRES_TARGET.z, false);
          }
        }}
        makeDefault
        enabled={mode === 'presentation'}
        minDistance={0.45}
        maxDistance={5.5}
        minPolarAngle={0.05}
        maxPolarAngle={1.42}
        smoothTime={0.25}
        draggingSmoothTime={0.08}
        azimuthRotateSpeed={autoOrbit ? 1 : 1}
        onChange={() => touch(3)}
      />
    </>
  );
}
export { WALK_OFFSET, player };
