// BEAT 1 — THE HOOK (0 → 8.6 s). Macro of a glass phone in the dark; a thumb taps; the UI answers; hard cut to the title UX ≠ UI.
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Stage3D, CameraRig, Rig, GlowPoint, useT } from '../lib/Stage3D';
import { Dip, AmberDot } from '../lib/Overlay';
import { Punch, Tag } from '../lib/Type';
import { beat, sent, wordAt, local } from '../timeline';
import { PALETTE, DISPLAY } from '../lib/theme';
import { seg, ease, easeOut, easeIn, fadeIO, lerp, clamp, drift } from '../lib/anim';

const B = beat('hook');
const T = {
  reveal: 0.0,
  tap1: 1.2, tap2: 1.95, respond: 2.15,
  title: 3.0,                                   // hard cut to the title
  split: local('hook', wordAt('two names', 'two')), // "two names" → the words separate
  end: B.end - B.start,
};
export const cues = { thumb_tap_1: B.start + T.tap1, thumb_tap_2: B.start + T.tap2, ui_response: B.start + T.respond, title_hit: B.start + T.title, title_split: B.start + T.split, transition_point: B.end - 0.45 };
export const transition = { kind: 'bloom' as const, frames: 14 };

const Phone: React.FC<{ t: number }> = ({ t }) => {
  const resp = ease(t, T.respond, T.respond + 0.45, easeOut);
  const press1 = fadeIO(t, T.tap1 - 0.08, T.tap1 + 0.22, 0.08, 0.14), press2 = fadeIO(t, T.tap2 - 0.08, T.tap2 + 0.22, 0.08, 0.14);
  const cards = [[-0.42, 0.95], [0.0, 0.95], [0.42, 0.95], [-0.42, 0.35], [0.0, 0.35], [0.42, 0.35], [-0.42, -0.25], [0.0, -0.25], [0.42, -0.25]];
  return (
    <group rotation={[-Math.PI / 2 + 0.08, 0, -0.35]} position={[0, 0, 0]}>
      {/* body: black glass slab with a chrome rim */}
      <RoundedBox args={[1.5, 3.1, 0.12]} radius={0.09} smoothness={6} castShadow receiveShadow>
        <meshPhysicalMaterial color="#07090d" roughness={0.12} metalness={0.25} clearcoat={1} clearcoatRoughness={0.06} />
      </RoundedBox>
      <RoundedBox args={[1.54, 3.14, 0.1]} radius={0.1} smoothness={6} position={[0, 0, -0.012]}>
        <meshStandardMaterial color="#b9bcc3" roughness={0.3} metalness={0.95} />
      </RoundedBox>
      {/* screen */}
      <mesh position={[0, 0, 0.0615]}><planeGeometry args={[1.38, 2.96]} /><meshStandardMaterial color="#0f131a" roughness={0.35} emissive="#0f131a" emissiveIntensity={0.6} /></mesh>
      {/* app cards; the tapped one expands into a sheet on respond */}
      {cards.map(([x, y], i) => {
        const isHit = i === 4; const s = isHit ? 1 + 0.65 * resp : 1 - 0.12 * resp; const fade = isHit ? 1 : 1 - 0.55 * resp;
        const col = i % 3 === 1 ? PALETTE.amber : i % 2 ? PALETTE.cyan : '#2a3240';
        return (
          <mesh key={i} position={[x * (isHit ? 1 - resp : 1), y + (isHit ? -resp * 0.6 : 0), 0.066 + (isHit ? 0.004 : 0)]} scale={[s * 0.36, s * 0.36, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={isHit ? 0.32 + 0.25 * (press1 + press2) + 0.1 * resp : 0.28 * fade} transparent opacity={fade} />
          </mesh>
        );
      })}
      {/* touch indicator: a faint fingertip disc + expanding ring on each tap (no hand: product-film convention) */}
      {[T.tap1, T.tap2].map((t0, i) => { const k = ease(t, t0, t0 + 0.55, easeOut); const on = t >= t0 && t < t0 + 0.6; return on ? (
        <group key={i} position={[0, 0.35, 0.084]}>
          <mesh scale={[1 + 2.6 * k, 1 + 2.6 * k, 1]}><ringGeometry args={[0.11, 0.122, 64]} /><meshBasicMaterial color="#ffd9b0" transparent opacity={0.9 * (1 - k)} toneMapped={false} /></mesh>
          <mesh><circleGeometry args={[0.09 * (1 - 0.5 * k), 48]} /><meshBasicMaterial color="#ffe9d2" transparent opacity={0.35 * (1 - k)} toneMapped={false} /></mesh>
        </group>) : null; })}
      {/* response ripple */}
      <mesh position={[0, 0.35, 0.082]} scale={[1 + 2.2 * resp, 1 + 2.2 * resp, 1]}><ringGeometry args={[0.16, 0.172, 64]} /><meshBasicMaterial color={PALETTE.amber} transparent opacity={0.8 * (1 - resp)} toneMapped={false} /></mesh>
    </group>
  );
};
export const Beat: React.FC = () => {
  const t = useT(); const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const inMacro = t < T.title;
  const keys = [
    { t: 0.0, pos: [2.6, 6.2, 4.6] as [number, number, number], look: [0.0, 0.0, 0.1] as [number, number, number], fov: 24 },
    { t: 3.0, pos: [1.9, 4.9, 3.4] as [number, number, number], look: [0.0, 0.05, 0.1] as [number, number, number], fov: 24 },
  ];
  const splitK = ease(t, T.split, T.split + 0.7, easeOut);
  const pulse = 1 + 0.06 * Math.sin(t * 5);
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      {inMacro ? (
        <Stage3D background="#06080b" fog={[7, 14]} bloom={0.75} threshold={0.72}>
          <CameraRig keys={keys} t={t} handheld={0.012} />
          <Rig keyI={2.2} ambient={0.08} />
          <pointLight position={[-2.2, 1.6, 1.8]} intensity={10} color={PALETTE.cyan} distance={7} />
          <pointLight position={[2.0, 1.2, 1.4]} intensity={6} color={PALETTE.amber} distance={6} />
          <spotLight position={[0.6, 3.2, 1.2]} angle={0.5} penumbra={0.8} intensity={40} color="#fff1dc" distance={9} castShadow={false} />
          <Phone t={t} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]} receiveShadow><planeGeometry args={[24, 24]} /><meshStandardMaterial color="#0b0e13" roughness={0.22} metalness={0.4} /></mesh>
        </Stage3D>
      ) : (
        <AbsoluteFill style={{ background: PALETTE.graphite }}>
          {/* title: UX ≠ UI punches in; on "two names" the two words drift apart */}
          <Punch text="UX" tStart={T.title} x={0} y={520 - splitK * 120} size={300} color={PALETTE.ivory} />
          <Punch text="≠" tStart={T.title + 0.08} y={790} size={220} color={PALETTE.amber} />
          <Punch text="UI" tStart={T.title + 0.16} y={1050 + splitK * 110} size={300} color={PALETTE.cyan} />
          <Tag text="user experience" t={t} tStart={T.split + 0.1} x={372} y={470 - splitK * 120} color={PALETTE.gray} />
          <Tag text="user interface" t={t} tStart={T.split + 0.25} x={400} y={1372 + splitK * 110} color={PALETTE.gray} />
          <AmberDot x={540 + drift(t, 6, 0.5).x} y={870 + drift(t, 6, 0.5, 7).y} r={10 * pulse} alpha={fadeIO(t, T.title + 0.1, T.end + 1, 0.3, 0.1)} />
        </AbsoluteFill>
      )}
      {/* open from black */}
      <Dip alpha={1 - ease(t, 0, 0.9, easeOut)} color="#000" />
      {/* hard-cut flash on the title hit */}
      <Dip alpha={fadeIO(t, T.title - 0.02, T.title + 0.25, 0.02, 0.23) * 0.85} color={PALETTE.ivory} />
    </AbsoluteFill>
  );
};
