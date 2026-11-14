// Shared 3D stage: ThreeCanvas + lighting rig + post stack (Bloom, Noise, Vignette; no DoF — too slow under software GL) + a cinematic camera rig.
import React, { useMemo, useRef } from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { easeInOut, lerp, noise1 } from './anim';
import { PALETTE } from './theme';
export type CamKey = { t: number; pos: [number, number, number]; look: [number, number, number]; fov?: number };
/** Interpolates camera keyframes (local seconds). ease: per-segment cubic in-out. handheld: subtle deterministic drift amplitude (world units). */
export const CameraRig: React.FC<{ keys: CamKey[]; t: number; handheld?: number; roll?: number }> = ({ keys, t, handheld = 0, roll = 0 }) => {
  const { camera } = useThree();
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
  if (t < keys[0].t) { a = b = keys[0]; } if (t > keys[keys.length - 1].t) { a = b = keys[keys.length - 1]; }
  const k = a === b ? 0 : easeInOut((t - a.t) / Math.max(1e-6, b.t - a.t));
  const hx = handheld * (noise1(t * 0.7 + 3) - 0.5) * 2, hy = handheld * (noise1(t * 0.9 + 11) - 0.5) * 2;
  const p = new THREE.Vector3(lerp(a.pos[0], b.pos[0], k) + hx, lerp(a.pos[1], b.pos[1], k) + hy, lerp(a.pos[2], b.pos[2], k));
  const l = new THREE.Vector3(lerp(a.look[0], b.look[0], k) + hx * 0.5, lerp(a.look[1], b.look[1], k) + hy * 0.5, lerp(a.look[2], b.look[2], k));
  camera.position.copy(p); camera.lookAt(l);
  if (roll) camera.rotateZ(roll);
  const fov = lerp(a.fov ?? 35, b.fov ?? 35, k);
  const pc = camera as THREE.PerspectiveCamera; if (pc.fov !== fov) { pc.fov = fov; pc.updateProjectionMatrix(); }
  return null;
};
export const Rig: React.FC<{ keyI?: number; keyColor?: string; fillColor?: string; rimColor?: string; ambient?: number; shadow?: boolean }> = ({ keyI = 2.6, keyColor = '#ffe9d2', fillColor = '#cfe3ff', rimColor = '#ffffff', ambient = 0.12, shadow = true }) => (
  <>
    <ambientLight intensity={ambient} />
    <directionalLight position={[3, 6, 4]} intensity={keyI} color={keyColor} castShadow={shadow} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} shadow-normalBias={0.04} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={0.5} shadow-camera-far={20} />
    <directionalLight position={[-5, 2.5, 2]} intensity={0.5} color={fillColor} />
    <directionalLight position={[0, 4, -6]} intensity={1.1} color={rimColor} />
  </>
);
/** The EffectComposer only produces a picture from its second pass; hold Remotion's capture until two passes have run after mount. */
const PrimeComposer: React.FC = () => {
  const { advance } = useThree(); const handle = useRef<number | null>(null); const n = useRef(0); const armed = useRef(false);
  if (handle.current === null) handle.current = delayRender('prime effect composer', { timeoutInMilliseconds: 20000 });
  useFrame(() => {
    n.current += 1;
    if (n.current === 1 && !armed.current) { armed.current = true; setTimeout(() => { try { advance(0); } catch (e) { /* ignore */ } }, 0); }
    if (n.current >= 2 && handle.current !== null) { continueRender(handle.current); handle.current = null; }
  }, -1000);
  React.useEffect(() => { const id = setTimeout(() => { if (handle.current !== null) { continueRender(handle.current); handle.current = null; } }, 4000); return () => clearTimeout(id); }, []);
  return null;
};
export const Post: React.FC<{ bloom?: number; threshold?: number; noise?: number; vignette?: number }> = ({ bloom = 0.8, threshold = 0.62, noise = 0.05, vignette = 0.65 }) => (
  <>
    <PrimeComposer />
    <EffectComposer multisampling={0}>
      <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.2} mipmapBlur />
      <Noise opacity={noise} />
      <Vignette eskil={false} offset={0.18} darkness={vignette} />
    </EffectComposer>
  </>
);
/** Full-frame 3D stage. Children are R3F elements. `t` is local seconds (frame/fps) — pass it so children stay deterministic. */
export const Stage3D: React.FC<{ children: React.ReactNode; background?: string; fog?: [number, number]; post?: boolean; bloom?: number; threshold?: number; cameraFov?: number }> = ({ children, background = PALETTE.graphite, fog, post = true, bloom, threshold, cameraFov = 35 }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: cameraFov, near: 0.05, far: 300, position: [0, 1, 6] }} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }} shadows>
      <color attach="background" args={[background]} />
      {fog ? <fog attach="fog" args={[background, fog[0], fog[1]]} /> : null}
      {children}
      {post ? <Post bloom={bloom} threshold={threshold} /> : null}
    </ThreeCanvas>
  );
};
/** local time in seconds for the current sequence */
export const useT = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return f / fps; };
// --- reusable materials/props (R3F) ---
export const GlowPoint: React.FC<{ position: [number, number, number]; radius?: number; intensity?: number; color?: string }> = ({ position, radius = 0.06, intensity = 1, color = PALETTE.amber }) => {
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(1.6 * intensity), [color, intensity]);
  return (
    <group position={position}>
      <mesh><sphereGeometry args={[radius, 24, 24]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[radius * 0.55, 16, 16]} /><meshBasicMaterial color="#ffe3c2" toneMapped={false} /></mesh>
      <pointLight color={color} intensity={3 * intensity} distance={6} decay={1.8} />
    </group>
  );
};
