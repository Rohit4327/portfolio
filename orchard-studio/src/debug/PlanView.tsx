/** ?debug=plan: orthographic top view in plan feet with reference/01 as a 50% underlay (22B.2). */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { FT } from '../data/geometry';
import { rt, touch } from '../state/runtime';
import { useStudio } from '../state/store';
import { buildStudio } from '../scenes/studio';

/** Calibration of reference/01 (Section 0): 45.26 px per ft at 8000 px wide, origin at pixel (4299, 2889). */
const PX_PER_FT = 45.26;
const ORIGIN_PX = [4299, 2889];
const IMG = [8000, 5556];

function Plan({ view }: { view: string }) {
  const { camera, size, gl, scene, invalidate } = useThree();
  const layout = useStudio((s) => s.layout);
  const studio = useMemo(() => buildStudio(), []);
  const underlay = useMemo(() => {
    const tex = new THREE.TextureLoader().load('./debug/plan-underlay.jpg', () => {
      useStudio.getState().set({ loading: { progress: 1, done: true } });
      touch(6);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const wFt = IMG[0] / PX_PER_FT;
    const hFt = IMG[1] / PX_PER_FT;
    const x0 = -ORIGIN_PX[0] / PX_PER_FT;
    const yTop = ORIGIN_PX[1] / PX_PER_FT;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wFt * FT, hFt * FT), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthTest: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + wFt / 2) * FT, 6, -(yTop - hFt / 2) * FT);
    m.renderOrder = 100;
    return m;
  }, []);
  useEffect(() => {
    rt.studio = studio;
    rt.gl = gl;
    rt.scene = scene;
    rt.invalidate = invalidate;
    rt.shadowDirty = false;
    scene.background = new THREE.Color(0xffffff);
  }, [studio, gl, scene, invalidate]);
  useEffect(() => {
    studio.apply(layout, 'model');
    for (const p of studio.parts) if (p.name === 'context') p.group.visible = false;
    // Flat debug colours so every element reads against the drawing: walls red, glass blue, pillars dark, doors green.
    const flat = new Map<string, THREE.Material>();
    const colour = (name: string): number | null =>
      /^(wall|lobbyWall|steel)$/.test(name) ? 0xd6402b : /^glass(Clear|Frosted|Band|Prism|Door)$/.test(name) ? 0x1677d2 : name === 'glassWindow' ? 0x12a5b8 : name === 'pillar' ? 0x333333 : /^(doorGrey|exitGreen)$/.test(name) ? 0x1f9d57 : name === 'bronze' ? 0x0b6f7d : null;
    studio.root.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh || Array.isArray(m.material)) return;
      const c = colour(m.material.name);
      if (c === null) return;
      if (!flat.has(m.material.name)) flat.set(m.material.name, new THREE.MeshBasicMaterial({ color: c }));
      m.material = flat.get(m.material.name)!;
    });
    touch(6);
  }, [studio, layout]);
  useEffect(() => {
    // Whole model extent, or ADC-05 only with ?view=adc
    const [x0, x1, y0, y1] = view === 'adc' ? [-6, 81, -9, 63] : view === 'approach' ? [-80, 32, -55, 8] : [-80, 80, -55, 62];
    const cam = camera as THREE.OrthographicCamera;
    const wM = (x1 - x0) * FT;
    const hM = (y1 - y0) * FT;
    const zoom = Math.min(size.width / wM, size.height / hM);
    cam.left = -size.width / 2;
    cam.right = size.width / 2;
    cam.top = size.height / 2;
    cam.bottom = -size.height / 2;
    cam.zoom = zoom;
    cam.position.set(((x0 + x1) / 2) * FT, 50, (-(y0 + y1) / 2) * FT);
    cam.up.set(0, 0, -1);
    cam.lookAt(((x0 + x1) / 2) * FT, 0, (-(y0 + y1) / 2) * FT);
    cam.near = 1;
    cam.far = 200;
    cam.updateProjectionMatrix();
    touch(6);
  }, [camera, size, view]);
  return (
    <>
      <ambientLight intensity={2.2} />
      <directionalLight position={[10, 40, 10]} intensity={1.2} />
      <primitive object={studio.root} />
      <primitive object={underlay} />
    </>
  );
}

export function PlanView() {
  const view = new URLSearchParams(location.search).get('view') ?? 'all';
  return (
    <Canvas orthographic frameloop="demand" dpr={1} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={() => (rt.frame = 0)}>
      <Plan view={view} />
      <FrameCounter />
    </Canvas>
  );
}
function FrameCounter() {
  const { invalidate } = useThree();
  useEffect(() => {
    let id = 0;
    const tick = () => {
      rt.frame++;
      if (rt.frame < rt.dirtyUntilFrame) invalidate();
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [invalidate]);
  return null;
}
