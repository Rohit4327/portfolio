/** The single R3F scene: one studio graph, two light rigs, and the per-frame director. */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { CONFIG } from '../config';
import { setTransmission } from '../core/materials';
import { TIERS } from '../core/quality';
import { CEIL_ADC, CEIL_CORRIDOR, FT, MODEL_EXTENT } from '../data/geometry';
import { extensions } from '../debug/api';
import { player, rt, touch } from '../state/runtime';
import { useStudio } from '../state/store';
import { captureIfPending } from '../systems/interactions';
import { attachInspectInput } from '../systems/inspect';
import '../systems/zones';
import '../systems/tour';
import { buildStudio } from './studio';
import { applyPlayerCamera, MODEL_ORIGIN, placeWorldForMode, startRise, TABLE_TOP_Y, updateDoors, updateRise } from './director';
import { skyEnv, skyMaterial, studioEnv, sunDirection } from './env';
import { frameHooks } from './frameHooks';
import { PresentationRoom } from './presentation/Room';
import { stage } from './transition/dive';
import { attachWalkInput, updateWalk, walk } from './walkthrough/WalkControls';

/** Default presentation view: pitch 62°, whole table in frame (Section 4.5). */
export const PRES_TARGET = new THREE.Vector3(0, TABLE_TOP_Y + 0.02, 0.03);
export const PRES_DISTANCE = 2.8;
export const PRES_PITCH = THREE.MathUtils.degToRad(62);
export const presHome = () => new THREE.Vector3(0, Math.sin(PRES_PITCH) * PRES_DISTANCE, Math.cos(PRES_PITCH) * PRES_DISTANCE).add(PRES_TARGET);

export const controlsRef: { current: CameraControlsImpl | null } = { current: null };
let controlsInit = false;

export function resetPresentationCamera(animate = true): void {
  const c = controlsRef.current;
  if (!c) return;
  const p = presHome();
  void c.setLookAt(p.x, p.y, p.z, PRES_TARGET.x, PRES_TARGET.y, PRES_TARGET.z, animate && !useStudio.getState().reducedMotion);
  touch(30);
}

RectAreaLightUniformsLib.init();
const haze = new THREE.Fog(0xd9e2ea, 110, 1900);

export function Stage() {
  const { gl, scene, camera, invalidate } = useThree();
  const mode = useStudio((s) => s.mode);
  const layout = useStudio((s) => s.layout);
  const tier = useStudio((s) => s.tier);
  const spec = TIERS[tier];
  // Area lights are costly per pixel: High and Ultra only (?lights=0 turns them off for profiling).
  const areaLights = (tier === 'ultra' || tier === 'high') && new URLSearchParams(location.search).get('lights') !== '0';
  const world = useRef<THREE.Group>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const room = useRef<THREE.Group>(null);
  const walkRig = useRef<THREE.Group>(null);

  const studio = useMemo(() => buildStudio(), []);
  const sunDir = useMemo(() => sunDirection(CONFIG.timeOfDay, CONFIG.windowFacing), []);
  const envs = useMemo(() => ({ studio: studioEnv(gl), sky: skyEnv(gl, sunDir) }), [gl, sunDir]);
  const sky = useMemo(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), skyMaterial(sunDir));
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
    // The composer draws several passes per frame; count them all and reset once per frame ourselves.
    gl.info.autoReset = false;
    useStudio.getState().set({ loading: { progress: 0.8, done: false } });
    const offWalk = attachWalkInput(gl.domElement);
    const offInspect = attachInspectInput(gl.domElement);
    const home = presHome();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(home, PRES_TARGET, new THREE.Vector3(0, 1, 0)));
    stage.refs = {
      world: world.current!,
      key: key.current!,
      sun: sun.current!,
      room: room.current!,
      presHome: { p: home, q },
      setLook(walkLook) {
        const st = useStudio.getState();
        studio.apply(st.layout, walkLook ? 'walk' : 'model');
        setTransmission(walkLook);
        scene.environment = walkLook ? envs.sky : envs.studio;
        scene.environmentIntensity = walkLook ? 0.8 : 0.4;
        // Light atmospheric haze over the distant city only; it starts well beyond the interior.
        scene.fog = walkLook ? haze : null;
        key.current!.visible = !walkLook;
        if (walkRig.current) walkRig.current.visible = walkLook;
        rt.shadowDirty = true;
      },
      syncControls() {
        const c = controlsRef.current;
        if (c) void c.setLookAt(home.x, home.y, home.z, PRES_TARGET.x, PRES_TARGET.y, PRES_TARGET.z, false);
      },
    };
    // Scripted orbit for the performance sample and the auto-orbit option.
    extensions.orbitStep = () => {
      const c = controlsRef.current;
      if (c) void c.rotate(THREE.MathUtils.degToRad(0.5), 0, false);
      touch(2);
    };
    return () => {
      offWalk();
      offInspect();
    };
  }, [studio, gl, scene, camera, invalidate, envs]);

  // Layout or mode changed: toggle parts and refresh the static shadow map once. The dive drives itself.
  useEffect(() => {
    if (mode === 'transition') return;
    const walkMode = mode === 'walkthrough';
    stage.refs?.setLook(walkMode);
    if (world.current) placeWorldForMode(world.current, walkMode);
    rt.dive = walkMode ? 1 : 0;
    startRise();
    walk.enabled = walkMode;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = walkMode ? 60 : 30;
    cam.near = walkMode ? 0.08 : 0.02;
    cam.far = walkMode ? 2500 : 120;
    cam.updateProjectionMatrix();
    touch(10);
  }, [studio, layout, mode, camera]);

  useEffect(() => {
    rt.shadowDirty = true;
    touch(8);
  }, [tier]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1) * ((extensions.timeScale as number | undefined) ?? 1);
    rt.frame++;
    rt.info.calls = gl.info.render.calls;
    rt.info.triangles = gl.info.render.triangles;
    gl.info.reset();
    const st = useStudio.getState();
    let active = false;
    if (updateDoors(dt)) active = true;
    if (updateRise(dt)) active = true;
    for (const h of frameHooks) if (h(dt)) active = true;
    if (st.mode === 'walkthrough') {
      if (!st.inspect || frameHooks.walkWhileInspecting) {
        if (updateWalk(dt)) active = true;
      }
      if (!frameHooks.cameraOverride) applyPlayerCamera(camera as THREE.PerspectiveCamera);
      if (rt.frame % 6 === 0 || rt.frame < rt.dirtyUntilFrame) studio.updateNear(player.x * FT, -player.y * FT);
    } else if (st.mode === 'presentation' && st.autoOrbit && controlsRef.current) {
      // Optional 0.3°/s auto-orbit (off by default).
      void controlsRef.current.rotate(THREE.MathUtils.degToRad(0.3) * dt, 0, false);
      active = true;
    }
    if (rt.shadowDirty) {
      gl.shadowMap.needsUpdate = true;
      rt.shadowDirty = false;
      active = true;
    }
    // Render on demand: only ask for another frame while something is moving.
    if (active || rt.frame < rt.dirtyUntilFrame) invalidate();
  }, -1);
  // After the composer (priority 1) has drawn: capture a selfie frame if one was requested.
  useFrame(() => captureIfPending(), 3);

  const cx = ((MODEL_EXTENT.x0 + MODEL_EXTENT.x1) / 2) * FT;
  const cz = (-(MODEL_EXTENT.y0 + MODEL_EXTENT.y1) / 2) * FT;
  const down: [number, number, number] = [-Math.PI / 2, 0, 0];
  return (
    <>
      <group ref={world} position={MODEL_ORIGIN} scale={1 / 40}>
        <primitive object={studio.root} />
        <group ref={walkRig} visible={false}>
          {/* Sun: fitted to the floor plate, static shadow map (updated only on layout or tier change). */}
          <directionalLight
            ref={sun}
            castShadow
            intensity={5.2}
            color="#fff1dc"
            position={[cx + sunDir.x * 70, sunDir.y * 70, cz + sunDir.z * 70]}
            shadow-mapSize={[spec.shadowWalk, spec.shadowWalk]}
            shadow-bias={-0.0005}
            shadow-normalBias={0.04}
            shadow-radius={2.5}
          >
            <orthographicCamera attach="shadow-camera" args={[-27, 27, 22, -22, 10, 130]} />
          </directionalLight>
          <object3D position={[cx, 0, cz]} ref={(o) => void (o && sun.current && (sun.current.target = o))} />
          <hemisphereLight args={['#fffdf8', '#ebe5da', 0.95]} />
          {areaLights ? (
            <>
          {/* A few area lights paired with the emissive ceiling panels, for soft speculars. */}
          <rectAreaLight args={['#fff4e6', 5.5, 35 * FT, 9 * FT]} position={[38.5 * FT, (CEIL_ADC - 0.1) * FT, -6.5 * FT]} rotation={down} />
          <rectAreaLight args={['#fff1e0', 4.5, 100 * FT, 3 * FT]} position={[-24 * FT, (CEIL_CORRIDOR - 0.1) * FT, 3.3 * FT]} rotation={down} />
          <rectAreaLight args={['#fff1e0', 4.0, 12 * FT, 40 * FT]} position={[-51.5 * FT, (CEIL_CORRIDOR - 0.1) * FT, 29 * FT]} rotation={down} />
            </>
          ) : null}
          <primitive object={sky} />
        </group>
      </group>
      {/* Presentation key light: upper left, 55° elevation, soft. */}
      <directionalLight
        ref={key}
        castShadow
        intensity={2.6}
        position={[PRES_TARGET.x - 1.5, PRES_TARGET.y + 3.2, PRES_TARGET.z - 1.65]}
        shadow-mapSize={[spec.shadowModel, spec.shadowModel]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.002}
        shadow-radius={4}
      >
        <orthographicCamera attach="shadow-camera" args={[-1.7, 1.7, 1.2, -1.2, 0.5, 8]} />
      </directionalLight>
      <object3D position={PRES_TARGET} ref={(o) => void (o && key.current && (key.current.target = o))} />
      <group ref={room}>
        <PresentationRoom />
      </group>
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
        onChange={() => touch(3)}
      />
    </>
  );
}
