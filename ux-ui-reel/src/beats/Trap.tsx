// BEAT 4 — THE TRAP (52.4 → 72.4 s). A gorgeous glass checkout betrays you with a last-step fee (crack, FRUSTRATING); a plain ivory
// slab finishes in two taps (BRILLIANT); kinetic type HANDSHAKE / RELATIONSHIP (HyperFrames, transparent ProRes) closes the beat.
import React from 'react';
import { AbsoluteFill, Sequence, OffthreadVideo, staticFile } from 'remotion';
import { Stage3D, CameraRig, Rig, useT } from '../lib/Stage3D';
import { Dip, AmberDot } from '../lib/Overlay';
import { Punch, Tag } from '../lib/Type';
import { beat, wordAt, local, sec } from '../timeline';
import { PALETTE } from '../lib/theme';
import { ease, easeOut, easeInOut, easeOutExpo, fadeIO, lerp, clamp, drift, noise1, seg } from '../lib/anim';
import { useCanvasTexture, drawGlassCheckout, drawPlainCheckout, Slab, TapRing, Crack, flicker, uiToLocal, HotPoint, UI_W, UI_H, SLAB_D } from './Trap.parts';

const B = beat('trap');
const L = (s: string, w: string) => local('trap', wordAt(s, w));
const T = {
  slabIn: 0.0,
  tap1: L('Beautiful UI can hide', 'Beautiful') + 0.05,       // Continue (Bag → Delivery)
  tap2: L('Beautiful UI can hide', 'hide') + 0.3,             // Continue (Delivery → Pay)
  tap3: L('stunning checkout', 'checkout') + 0.05,            // Pay step opens
  fee: L('stunning checkout', 'delivery'),                    // the fee line slides in, total jumps
  crack: L('stunning checkout', 'fee') + 0.2,
  punchF: L('stunning checkout', 'fee') + 0.4,
  slab2: L('plain interface', 'plain'),
  tapP1: L('plain interface', 'carry') - 0.25,
  tapP2: L('plain interface', 'carry') + 0.2,
  confirmed: L('plain interface', 'brilliant') + 0.05,
  punchB: L('plain interface', 'brilliant') + 0.3,
  type: L('UI is the handshake', 'UI') - 0.3,                 // HyperFrames clip starts
  handshake: L('UI is the handshake', 'handshake'),
  relationship: L('UI is the handshake', 'relationship'),
  end: B.end - B.start,
};
export const cues = {
  slab_in: B.start + T.slabIn, ui_tap_1: B.start + T.tap1, ui_tap_2: B.start + T.tap2, ui_tap_3: B.start + T.tap3,
  fee_reveal: B.start + T.fee, crack: B.start + T.crack, punch_frustrating: B.start + T.punchF,
  slab2_in: B.start + T.slab2, tap_plain_1: B.start + T.tapP1, tap_plain_2: B.start + T.tapP2, confirmed: B.start + T.confirmed, punch_brilliant: B.start + T.punchB,
  type_handshake: B.start + T.handshake, type_relationship: B.start + T.relationship, transition_point: B.end - 0.45,
};
export const transition = { kind: 'bloom' as const, frames: 14, cx: 540, cy: 960 };
const HF_FRAMES = 6 * 30;                                     // hyperframes/handshake: 6.0 s clip

// UI hotspots (canvas px): the Continue / Pay button centre; plain slab's button centre
const BTN: [number, number] = [UI_W / 2, 1182], PBTN: [number, number] = [UI_W / 2, 846];
const tapK = (t: number, t0: number) => seg(t, t0, t0 + 0.55);
const press = (t: number, t0: number) => fadeIO(t, t0 - 0.06, t0 + 0.3, 0.06, 0.24);

const GlassSlab: React.FC<{ t: number }> = ({ t }) => {
  const step = t >= T.tap3 ? 2 : t >= T.tap2 ? 1 : t >= T.tap1 ? 0 : 0;
  // step index advances 0.12 s after the tap (the UI "answers")
  const s2 = t >= T.tap3 + 0.12 ? 2 : t >= T.tap2 + 0.12 ? 1 : 0;
  const stepK = s2 === 2 ? seg(t, T.tap3 + 0.12, T.tap3 + 0.62) : s2 === 1 ? seg(t, T.tap2 + 0.12, T.tap2 + 0.62) : 1;
  const fee = ease(t, T.fee, T.fee + 0.55, easeOutExpo);
  const red = t >= T.fee + 0.2 ? clamp(seg(t, T.fee + 0.2, T.fee + 0.6)) * (0.45 + 0.55 * flicker(t)) * (1 - 0.35 * seg(t, T.slab2, T.slab2 + 1)) : 0;
  const pr = press(t, T.tap1) + press(t, T.tap2) + press(t, T.tap3);
  const tex = useCanvasTexture(UI_W, UI_H, (ctx) => drawGlassCheckout(ctx, { t, step: s2, stepK, press: pr, fee, red, stepTimes: [T.tap1, T.tap2, T.tap3] }));
  const crackK = ease(t, T.crack, T.crack + 0.7, easeOut);
  void step;
  return (
    <Slab tex={tex} variant="glass" emissive={0.9 - 0.25 * seg(t, T.slab2, T.slab2 + 1)}>
      <TapRing px={BTN[0]} py={BTN[1]} k={tapK(t, T.tap1)} />
      <TapRing px={BTN[0]} py={BTN[1]} k={tapK(t, T.tap2)} />
      <TapRing px={BTN[0]} py={BTN[1]} k={tapK(t, T.tap3)} />
      <Crack k={crackK} glow={red} />
      {/* betrayal light: red-amber flicker from inside the glass */}
      {red > 0 ? <pointLight position={[0.3, -0.4, -0.55]} intensity={34 * red} color="#ff5a3a" distance={6} decay={1.6} /> : null}
    </Slab>
  );
};

const PlainSlab: React.FC<{ t: number }> = ({ t }) => {
  const s = t >= T.confirmed ? 2 : t >= T.tapP1 + 0.1 ? 1 : 0;
  const stepK = s === 2 ? seg(t, T.confirmed, T.confirmed + 0.35) : s === 1 ? seg(t, T.tapP1 + 0.1, T.tapP1 + 0.45) : 1;
  const pr = press(t, T.tapP1) + press(t, T.tapP2);
  const check = ease(t, T.confirmed + 0.05, T.confirmed + 0.8, easeOut);
  const tex = useCanvasTexture(UI_W, UI_H, (ctx) => drawPlainCheckout(ctx, { step: s, stepK, press: pr, check }));
  return (
    <Slab tex={tex} variant="ivory" emissive={0.5}>
      <TapRing px={PBTN[0]} py={PBTN[1]} k={tapK(t, T.tapP1)} color="#8a8f98" />
      <TapRing px={PBTN[0]} py={PBTN[1]} k={tapK(t, T.tapP2)} color="#8a8f98" />
    </Slab>
  );
};

/** The amber point: rides the glass taps, hops to the ivory slab, then is handed to the DOM dot for the type segment. */
const Point: React.FC<{ t: number; g1: { p: [number, number, number]; r: [number, number, number] }; g2: { p: [number, number, number]; r: [number, number, number] } }> = ({ t, g1, g2 }) => {
  // world-space position of a UI point on a slab
  const [bx, by] = uiToLocal(BTN[0], BTN[1]), [px, py] = uiToLocal(PBTN[0], PBTN[1]);
  const onSlab = (g: { p: [number, number, number]; r: [number, number, number] }, lx: number, ly: number, lz: number) => {
    const cy = Math.cos(g.r[1]), sy = Math.sin(g.r[1]), cx = Math.cos(g.r[0]), sx = Math.sin(g.r[0]);
    // three.js Euler 'XYZ' = Rx·Ry·Rz applied to the vector: Y rotation hits the point before X (Z tilt is negligible here)
    const x1 = lx * cy + lz * sy, z1 = -lx * sy + lz * cy; const y2 = ly * cx - z1 * sx, z2 = ly * sx + z1 * cx;
    return [g.p[0] + x1, g.p[1] + y2, g.p[2] + z2] as [number, number, number];
  };
  const idle1 = onSlab(g1, bx + 0.47, by + 0.14, SLAB_D / 2 + 0.06), hit1 = onSlab(g1, bx, by, SLAB_D / 2 + 0.03);
  const idle2 = onSlab(g2, px + 0.46, py + 0.2, SLAB_D / 2 + 0.06), hit2 = onSlab(g2, px, py, SLAB_D / 2 + 0.03);
  const hop = ease(t, T.slab2 + 0.35, T.slab2 + 0.9, easeInOut);
  const mix = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  let p: [number, number, number];
  if (t < T.slab2 + 0.35) {
    // approach each glass tap over 0.35 s, rest on the button through the press, lift back to idle
    let k = 0; for (const t0 of [T.tap1, T.tap2, T.tap3]) k = Math.max(k, Math.min(ease(t, t0 - 0.38, t0 - 0.02, easeInOut), 1 - ease(t, t0 + 0.2, t0 + 0.6, easeInOut)));
    p = mix(idle1, hit1, k);
  } else {
    let k = 0; for (const t0 of [T.tapP1, T.tapP2]) k = Math.max(k, Math.min(ease(t, t0 - 0.3, t0 - 0.02, easeInOut), 1 - ease(t, t0 + 0.18, t0 + 0.5, easeInOut)));
    p = mix(mix(idle1, idle2, hop), hit2, k * hop);
  }
  const d = drift(t, 0.02, 0.6, 3); p = [p[0] + d.x, p[1] + d.y, p[2]];
  const vis = 1 - seg(t, T.type + 0.3, T.type + 0.9); if (vis <= 0) return null;
  const pulse = 1 + 0.08 * Math.sin(t * 6);
  return <HotPoint position={p} radius={0.048 * pulse * (0.4 + 0.6 * vis)} intensity={vis} />;
};

export const Beat: React.FC = () => {
  const t = useT();
  const inType = t >= T.type;
  // slab choreography: slab 1 front-and-centre → recedes left/back when the ivory slab arrives → both drift back under the type
  const k2 = ease(t, T.slab2, T.slab2 + 1.1, easeInOut), k3 = ease(t, T.type, T.type + 1.4, easeInOut);
  const inK = ease(t, T.slabIn, T.slabIn + 0.9, easeOutExpo);
  const g1 = {
    p: [lerp(lerp(0.15, 0.0, inK), -1.2, k2) + lerp(0, -0.5, k3), lerp(lerp(-0.25, 0.08, inK), 0.42, k2) + lerp(0, 0.3, k3), lerp(0, -2.1, k2) + lerp(0, -1.4, k3)] as [number, number, number],
    r: [0.13 - 0.05 * k2, lerp(0.6, 0.38, inK) + 0.55 * k2 + 0.25 * k3, -0.04 + 0.03 * k2] as [number, number, number],
  };
  const e2 = easeOutExpo(seg(t, T.slab2, T.slab2 + 1.0));
  const g2 = {
    p: [lerp(2.4, 0.22, e2) + lerp(0, 1.15, k3), lerp(-1.3, -0.02, e2) + lerp(0, -0.2, k3), lerp(1.4, 0.35, e2) + lerp(0, -2.6, k3)] as [number, number, number],
    r: [0.05, lerp(0.7, 0.1, e2) + 0.35 * k3, -0.03 + 0.02 * e2] as [number, number, number],
  };
  const keys = [
    { t: 0.0, pos: [1.5, 0.95, 8.1] as [number, number, number], look: [0.0, -0.12, 0] as [number, number, number], fov: 30 },
    { t: T.slab2, pos: [0.85, 0.6, 8.4] as [number, number, number], look: [0.0, -0.08, 0] as [number, number, number], fov: 30 },
    { t: T.slab2 + 1.2, pos: [0.6, 0.55, 8.5] as [number, number, number], look: [0.2, -0.12, 0.2] as [number, number, number], fov: 30 },
    { t: T.type, pos: [0.6, 0.55, 8.5] as [number, number, number], look: [0.2, -0.12, 0.2] as [number, number, number], fov: 30 },
    { t: T.type + 1.6, pos: [0.1, 0.75, 9.9] as [number, number, number], look: [0.0, -0.05, -0.6] as [number, number, number], fov: 30 },
  ];
  const red = t >= T.fee + 0.2 ? seg(t, T.fee + 0.2, T.fee + 0.6) * flicker(t) * (1 - 0.6 * k2) : 0;
  // hand-off dot: rides the connecting line of the type down to the centre (540, 960)
  const lineK = ease(t, T.type + 1.0, T.type + 2.2, easeInOut);
  const dotY = lerp(745, 960, lineK), dotA = fadeIO(t, T.type + 0.7, T.end + 2, 0.4, 0.1);
  const pulse = 1 + 0.07 * Math.sin(t * 5.5);
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      <Stage3D background="#07090d" fog={[9, 17]} bloom={0.8 + 0.5 * red} threshold={0.7}>
        <CameraRig keys={keys} t={t} handheld={0.012} />
        <Rig keyI={2.4} ambient={0.1} />
        <spotLight position={[1.4, 3.4, 2.6]} angle={0.55} penumbra={0.85} intensity={55} color="#fff0dd" distance={11} castShadow={false} />
        <pointLight position={[-2.6, 1.2, 2.2]} intensity={9} color={PALETTE.cyan} distance={8} />
        <pointLight position={[2.4, -0.4, 2.0]} intensity={5} color={PALETTE.amber} distance={7} />
        <group position={g1.p} rotation={g1.r}><GlassSlab t={t} /></group>
        {t >= T.slab2 - 0.05 ? <group position={g2.p} rotation={g2.r}><PlainSlab t={t} /></group> : null}
        <Point t={t} g1={g1} g2={g2} />
        {/* dark matte floor far below: shallow light pools, long soft shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.75, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#0b0e13" roughness={0.3} metalness={0.35} /></mesh>
      </Stage3D>
      {/* section tag + punches (top band, clear of the slab and the captions) */}
      <Tag text="the trap" t={t} tStart={0.35} tEnd={T.punchF - 0.1} x={72} y={248} color={PALETTE.amber} />
      <Punch text="FRUSTRATING" tStart={T.punchF} tEnd={T.slab2 - 0.1} y={226} size={122} color="#ff8e62" />
      <Punch text="BRILLIANT" tStart={T.punchB} tEnd={T.type + 0.5} y={226} size={122} color={PALETTE.amber} />
      {/* betrayal flash on the crack */}
      <Dip alpha={fadeIO(t, T.crack - 0.02, T.crack + 0.3, 0.03, 0.27) * 0.35} color="#ff6a3c" />
      {/* the type segment: 3D dims, kinetic type rides on top */}
      <Dip alpha={0.62 * ease(t, T.type, T.type + 1.0, easeInOut)} color="#07090d" />
      {inType ? (
        <Sequence from={sec(T.type)} durationInFrames={HF_FRAMES} layout="none">
          <OffthreadVideo src={staticFile('hf/handshake.mov')} transparent style={{ position: 'absolute', inset: 0, width: 1080, height: 1920 }} />
        </Sequence>
      ) : null}
      <AmberDot x={540 + drift(t, 3, 0.5, 2).x} y={dotY + drift(t, 3, 0.5, 9).y} r={11 * pulse} alpha={dotA} />
      {/* open with a hard cut: a 3-frame ivory flash then the slab is simply there */}
      <Dip alpha={fadeIO(t, -0.02, 0.22, 0.02, 0.2) * 0.75} color={PALETTE.ivory} />
    </AbsoluteFill>
  );
};
