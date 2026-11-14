// BEAT 5 — HOW IT'S MADE (72.4 → 100.4 s). Six process cards slam into a tilted 3D loop (one per word), the loop turns on "repeat";
// hard cut to a usability-test insert: finger trail + tap heat-map on a glossy prototype, observation notes, the wireframe morphs
// through v1 → v2 → v3, then the polished version dims while the fixed one lights. Amber point hands off at the centre.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Stage3D, CameraRig, Rig, useT } from '../lib/Stage3D';
import { Dip, AmberDot } from '../lib/Overlay';
import { Tag, SlideWords } from '../lib/Type';
import { beat, wordAt, local } from '../timeline';
import { PALETTE, FONT } from '../lib/theme';
import { ease, easeOut, easeInOut, easeOutExpo, fadeIO, lerp, clamp, drift, seg, pop } from '../lib/anim';
import { HotPoint } from './Trap.parts';
import { Card, CARD_W, CARD_H, Phone, PolishedUI, WireUI, FingerTrail, Note, Counter, wireLayout, SCREEN_W, SCREEN_H, BEZEL, type FingerKey } from './Process.parts';

const B = beat('process');
const L = (s: string, w: string) => local('process', wordAt(s, w));
const CARD_T = [L('Research real people', 'Research'), L('Research real people', 'Define'), L('Research real people', 'Design'), L('Research real people', 'Prototype'), L('Research real people', 'Test'), L('Then repeat', 'repeat')];
const LAND = CARD_T.map((x) => x + 0.22);
const T = {
  guess: L('Not by guessing', 'Not'), observe: L('Not by guessing', 'By'),
  turn: L('Then repeat', 'repeat') + 0.45, turnDur: 2.5,
  insert: L('Watching just', 'Watching'), heat: L('Watching just', 'handful'), note: L('Watching just', 'use') + 0.06, note2: L('Watching just', 'prototype') - 0.25,
  morph1: L('Watching just', 'exposes'), morph2: L('Watching just', 'big'),
  fix: L('Fix them', 'Fix') + 0.1, centre: L('Fix them', 'anything') + 0.3,
  end: B.end - B.start,
};
export const cues = {
  card_slam_1: B.start + LAND[0], card_slam_2: B.start + LAND[1], card_slam_3: B.start + LAND[2], card_slam_4: B.start + LAND[3], card_slam_5: B.start + LAND[4], card_slam_6: B.start + LAND[5],
  loop_turn: B.start + T.turn, insert_test: B.start + T.insert, heatmap: B.start + T.heat, note_in: B.start + T.note, morph_1: B.start + T.morph1, morph_2: B.start + T.morph2,
  fix_lights: B.start + T.fix, transition_point: B.end - 0.45,
};
export const transition = { kind: 'bloom' as const, frames: 14, cx: 540, cy: 960 };

// ---------------------------------------------------------------- 3D loop
const R = 1.2, TILT = -0.55;
const angle = (i: number) => Math.PI / 2 - (i * Math.PI) / 3;       // clockwise from the top
const turnAt = (t: number) => Math.PI * 2 * easeInOut(seg(t, T.turn, T.turn + T.turnDur));
/** ring-plane point (angle a, lift z) → world, through the group's rotation [TILT, 0, -θ] (Euler XYZ: Z first, then X) */
const ringToWorld = (a: number, z: number, th: number, rad = R): [number, number, number] => {
  const x = rad * Math.cos(a), y = rad * Math.sin(a); const c = Math.cos(-th), s = Math.sin(-th); const x1 = x * c - y * s, y1 = x * s + y * c;
  const cx = Math.cos(TILT), sx = Math.sin(TILT); return [x1, y1 * cx - z * sx, y1 * sx + z * cx];
};
const Loop: React.FC<{ t: number; frame: number; fps: number }> = ({ t, frame, fps }) => {
  const th = turnAt(t);
  // amber arc grows to meet each landing card; closes into a full loop on "repeat"
  let arc = 0; for (let i = 1; i < 6; i++) arc += (Math.PI / 3) * ease(t, LAND[i] - 0.28, LAND[i] + 0.02, easeOut);
  arc += (Math.PI / 3) * ease(t, T.turn - 0.1, T.turn + 0.5, easeInOut);
  const guide = t < LAND[0] ? 0.35 + 0.25 * ease(t, 0, 1.2) : 0.6;
  return (
    <group rotation={[TILT, 0, -th]}>
      {/* the loop: a dark metal ring (guide) + the amber emissive arc */}
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[-1, 1, 1]}><torusGeometry args={[R, 0.012, 10, 180]} /><meshStandardMaterial color="#3a4250" roughness={0.35} metalness={0.9} emissive="#2a313d" emissiveIntensity={guide} /></mesh>
      {arc > 0.01 ? <mesh rotation={[0, 0, Math.PI / 2]} scale={[-1, 1, 1]} position={[0, 0, 0.004]}><torusGeometry args={[R, 0.016, 10, 200, Math.min(Math.PI * 2, arc)]} /><meshBasicMaterial color={ARC_COLOR} toneMapped={false} /></mesh> : null}
      {WORDS_IDX.map((i) => {
        const a = angle(i); const k = pop(frame, fps, CARD_T[i], { damping: 13, stiffness: 210, mass: 0.9 }); if (t < CARD_T[i]) return null;
        const flash = fadeIO(t, LAND[i], LAND[i] + 0.45, 0.04, 0.4); const rip = seg(t, LAND[i], LAND[i] + 0.7);
        return (
          <group key={i} position={[R * Math.cos(a), R * Math.sin(a), 0]} rotation={[0, 0, th]}>
            {rip < 1 ? <mesh position={[0, 0, 0.01]} rotation={[0, 0, -th]}><ringGeometry args={[0.25 + 0.75 * easeOut(rip), 0.27 + 0.75 * easeOut(rip), 64]} /><meshBasicMaterial color={PALETTE.amber} transparent opacity={0.8 * (1 - rip)} toneMapped={false} /></mesh> : null}
            <group rotation={[-TILT, 0, 0]} position={[0, 0, 4.2 * (1 - k)]} scale={[1 + 0.3 * (1 - k), 1 + 0.3 * (1 - k), 1]}><Card index={i} ivory={i % 2 === 0} flash={flash} /></group>
          </group>
        );
      })}
    </group>
  );
};
const WORDS_IDX = [0, 1, 2, 3, 4, 5];
const ARC_COLOR = new THREE.Color(PALETTE.amber).multiplyScalar(1.5);
const Point3D: React.FC<{ t: number }> = ({ t }) => {
  const th = turnAt(t);
  let p: [number, number, number];
  if (t < CARD_T[0] - 0.3) {
    // observing: a slow lap around the empty loop
    const lap = ease(t, 0.5, CARD_T[0] - 0.3, easeInOut); p = ringToWorld(Math.PI / 2 - lap * Math.PI * 2, 0.12, 0, R + 0.08);
  } else if (t < T.turn + T.turnDur + 1.2) {
    // anticipation: the point arrives at each slot just before its card slams onto it, then rides the loop through the turn
    let a = angle(0), lift = 0.05;
    for (let i = 1; i < 6; i++) { const k = ease(t, CARD_T[i] - 0.3, CARD_T[i] - 0.02, easeInOut); a = lerp(a, angle(i), k); }
    for (let i = 0; i < 6; i++) lift += 0.22 * fadeIO(t, LAND[i] - 0.04, LAND[i] + 0.35, 0.03, 0.3);
    p = ringToWorld(a, 0.05 + lift, th);
  } else {
    const k = ease(t, T.turn + T.turnDur + 1.2, T.insert - 0.1, easeInOut); const a0 = ringToWorld(angle(5), 0.05, th); p = [lerp(a0[0], 0, k), lerp(a0[1], 0, k), lerp(a0[2], 0.4, k)];
  }
  const d = drift(t, 0.02, 0.6, 5); const pulse = 1 + 0.08 * Math.sin(t * 6);
  return <HotPoint position={[p[0] + d.x, p[1] + d.y, p[2]]} radius={0.05 * pulse} intensity={1} />;
};

// ---------------------------------------------------------------- DOM insert
const FINGER: FingerKey[] = [
  { t: T.insert + 0.15, x: 190, y: 640 }, { t: T.insert + 0.55, x: 150, y: 170 }, { t: T.heat, x: 250, y: 140, tap: true }, { t: T.heat + 0.33, x: 200, y: 300, tap: true },
  { t: T.heat + 0.66, x: 66, y: 507, tap: true }, { t: T.heat + 0.95, x: 158, y: 507, tap: true }, { t: T.heat + 1.3, x: 240, y: 230, tap: true }, { t: T.heat + 1.65, x: 140, y: 200, tap: true },
  { t: T.heat + 2.0, x: 200, y: 120, tap: true }, { t: T.morph1 - 0.05, x: 230, y: 260 },
];
const Insert: React.FC<{ t: number }> = ({ t }) => {
  const m = ease(t, T.morph1, T.morph1 + 0.6, easeInOut);                                  // single phone → two phones
  const px = lerp(290, 72, m), py = lerp(330, 390, m), ps = lerp(1.25, 1.0, m);
  const wireIn = easeOutExpo(seg(t, T.morph1 + 0.05, T.morph1 + 0.6)); const v = seg(t, T.morph1 + 0.35, T.morph1 + 1.0) + seg(t, T.morph2, T.morph2 + 0.65);
  const dim = ease(t, T.fix, T.fix + 0.7, easeInOut), lit = ease(t, T.fix + 0.1, T.fix + 0.8, easeInOut);
  const trailA = 1 - seg(t, T.morph1, T.morph1 + 0.5);
  // the amber point: fingertip → the wireframe's price box → the centre for the hand-off
  const f = (() => { const k = FINGER; if (t <= k[0].t) return { x: k[0].x, y: k[0].y }; for (let i = 0; i < k.length - 1; i++) if (t >= k[i].t && t <= k[i + 1].t) { const q = easeInOut(seg(t, k[i].t, k[i + 1].t)); return { x: lerp(k[i].x, k[i + 1].x, q), y: lerp(k[i].y, k[i + 1].y, q) }; } return { x: k[k.length - 1].x, y: k[k.length - 1].y }; })();
  const fingerPage = { x: px + (BEZEL + f.x) * ps, y: py + (BEZEL + f.y) * ps };
  const pr = wireLayout(v).price; const pricePage = { x: 608 + BEZEL + pr.x + pr.w / 2, y: 390 + BEZEL + pr.y + pr.h / 2 };
  const toPrice = ease(t, T.morph1 + 0.3, T.morph1 + 0.9, easeInOut), toCentre = ease(t, T.centre, T.centre + 1.0, easeInOut);
  const dot = { x: lerp(lerp(fingerPage.x, pricePage.x, toPrice), 540, toCentre), y: lerp(lerp(fingerPage.y, pricePage.y, toPrice), 960, toCentre) };
  const pulse = 1 + 0.07 * Math.sin(t * 5.5); const dd = drift(t, 2.5, 0.5, 4);
  const labelA = ease(t, T.fix + 0.25, T.fix + 0.6, easeOut); const strike = ease(t, T.fix + 0.5, T.fix + 0.9, easeOut);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 50% at 50% 28%, #171c25 0%, #0D1016 70%)' }}>
      <Tag text="usability test · 5 participants" t={t} tStart={T.insert + 0.1} tEnd={T.morph1 - 0.05} x={72} y={250} color={PALETTE.amber} />
      <Tag text="prototype · iterate" t={t} tStart={T.morph1 + 0.15} tEnd={T.fix - 0.05} x={72} y={250} color={PALETTE.amber} />
      <Tag text="fix first · polish later" t={t} tStart={T.fix + 0.15} x={72} y={250} color={PALETTE.amber} />
      {/* polished prototype (tested, then dimmed) */}
      <Phone x={px} y={py} scale={ps} dim={dim}>
        <PolishedUI />
        <FingerTrail keys={FINGER} t={t} alpha={trailA} />
      </Phone>
      {/* wireframe iterations (lit on "fix") */}
      {wireIn > 0 ? (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${(1 - wireIn) * 320}px)`, opacity: Math.min(1, wireIn * 1.5) }}>
          <Phone x={608} y={390} scale={1} glow={lit}><WireUI v={v} lit={lit} /></Phone>
          <Counter v={v} x={612} y={236} alpha={wireIn} />
        </div>) : null}
      {/* verdict labels under the phones */}
      <div style={{ position: 'absolute', left: 72, top: 1222, width: 400, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: PALETTE.gray, opacity: labelA }}>POLISHED<div style={{ position: 'absolute', left: 120, top: 16, height: 3, width: 160 * strike, background: PALETTE.gray }} /></div>
      <div style={{ position: 'absolute', left: 608, top: 1222, width: 400, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: PALETTE.amber, opacity: labelA, textShadow: '0 0 24px rgba(255,171,91,0.5)' }}>FIXED</div>
      {/* observation notes */}
      <Note t={t} tIn={T.note} tOut={T.morph1 - 0.1} x={500} y={1150} who="P3" text="couldn't find the price" time="00:42" />
      <Note t={t} tIn={T.note2} tOut={T.morph1 - 0.1} x={470} y={975} who="P1" text="tapped the photo 4×" time="01:10" rot={2} />
      <AmberDot x={dot.x + dd.x * toCentre} y={dot.y + dd.y * toCentre} r={11 * pulse} alpha={fadeIO(t, T.insert + 0.05, T.end + 2, 0.25, 0.1)} />
    </AbsoluteFill>
  );
};

export const Beat: React.FC = () => {
  const t = useT(); const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const in3D = t < T.insert;
  const keys = [
    { t: 0.0, pos: [-1.3, 1.5, 12.0] as [number, number, number], look: [0, -0.15, 0] as [number, number, number], fov: 34 },
    { t: CARD_T[0], pos: [-0.6, 1.6, 11.6] as [number, number, number], look: [0, -0.15, 0] as [number, number, number], fov: 34 },
    { t: T.turn, pos: [0.8, 1.8, 11.4] as [number, number, number], look: [0, -0.15, 0] as [number, number, number], fov: 34 },
    { t: T.turn + T.turnDur, pos: [0.2, 1.3, 11.2] as [number, number, number], look: [0, -0.15, 0] as [number, number, number], fov: 34 },
    { t: T.insert, pos: [0.0, 0.9, 9.3] as [number, number, number], look: [0, -0.12, 0] as [number, number, number], fov: 34 },
  ];
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      {in3D ? (
        <Stage3D background="#07090d" fog={[10, 19]} bloom={0.85} threshold={0.7}>
          <CameraRig keys={keys} t={t} handheld={0.014} />
          <Rig keyI={2.3} ambient={0.1} />
          <spotLight position={[1.2, 4.5, 3.5]} angle={0.6} penumbra={0.9} intensity={70} color="#fff0dd" distance={14} castShadow={false} />
          <pointLight position={[-3.2, 0.8, 2.5]} intensity={10} color={PALETTE.cyan} distance={9} />
          <pointLight position={[3.0, -1.0, 2.0]} intensity={5} color={PALETTE.amber} distance={8} />
          <Loop t={t} frame={frame} fps={fps} />
          <Point3D t={t} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#0b0e13" roughness={0.3} metalness={0.35} /></mesh>
        </Stage3D>
      ) : <Insert t={t} />}
      {in3D ? (
        <>
          <Tag text="how it's made" t={t} tStart={0.3} tEnd={CARD_T[0] - 0.2} x={72} y={248} color={PALETTE.amber} />
          <SlideWords text="Not guessed." tStart={T.guess} tEnd={CARD_T[0] - 0.3} x={72} y={300} size={72} color={PALETTE.gray} />
          <SlideWords text="Observed." tStart={T.observe} tEnd={CARD_T[0] - 0.3} x={72} y={392} size={72} color={PALETTE.amber} />
          <Tag text="the loop" t={t} tStart={CARD_T[0] + 0.2} tEnd={T.insert} x={72} y={248} color={PALETTE.amber} />
        </>
      ) : null}
      {/* hard cut into the insert: ivory flash */}
      <Dip alpha={fadeIO(t, T.insert - 0.02, T.insert + 0.24, 0.02, 0.22) * 0.8} color={PALETTE.ivory} />
    </AbsoluteFill>
  );
};
