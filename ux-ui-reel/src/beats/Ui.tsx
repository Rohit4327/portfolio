// BEAT 2 — UI (8.6 → 30.4 s). The glass phone rises and explodes into its layers on "see and touch"; labels tick on
// Buttons/Type/Colour/Spacing/Motion while the camera orbits ~90°; a close-up of one button shows target, contrast and
// feedback; on "handshake" the layers collapse back and the amber point rides the glass to screen centre for the hand-off.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Stage3D, CameraRig, Rig, GlowPoint, useT } from '../lib/Stage3D';
import { Dip } from '../lib/Overlay';
import { beat, wordAt, local } from '../timeline';
import { PALETTE } from '../lib/theme';
import { seg, ease, easeOut, easeInOut, fadeIO, lerp, clamp } from '../lib/anim';
import { Cam, project, LAYERS, layerK, layerZ, LayerStack, AnchorTag, TouchRing, useCanvasTex, roundRect, FONT_CANVAS, camLerp } from './Ui.parts';

const B = beat('ui');
const L = (s: string, w: string) => local('ui', wordAt(s, w));
const T = {
  explode: L('see and touch', 'see'),
  ticks: [L('Buttons. Type.', 'Buttons'), L('Buttons. Type.', 'Type'), L('Buttons. Type.', 'Colour'), L('Buttons. Type.', 'Spacing'), L('Buttons. Type.', 'Motion')],
  surface: L('answers your hand', 'surface'), answers: L('answers your hand', 'answers'),
  cut: L('Good UI is obvious', 'Good') - 0.1,                 // hard cut to the button close-up
  targets: L('Targets you can hit', 'Targets'), hit: L('Targets you can hit', 'hit'),
  contrast: L('Targets you can hit', 'Contrast'), read: L('Targets you can hit', 'read'),
  feedback: L('Targets you can hit', 'Feedback'), confirms: L('Targets you can hit', 'confirms'),
  back: L('handshake between', "It's") - 0.05,                // cut back to the stack
  collapse: L('handshake between', 'handshake'),
  end: B.end - B.start,
};
// which layer each spoken word labels: Buttons→COMPONENTS, Type→TYPE, Colour→PIXELS, Spacing→GRID, Motion→GLASS
const TICK_LAYER = [1, 2, 4, 3, 0];
export const cues = {
  layers_explode: B.start + T.explode,
  layer_tick_1: B.start + T.ticks[0], layer_tick_2: B.start + T.ticks[1], layer_tick_3: B.start + T.ticks[2], layer_tick_4: B.start + T.ticks[3], layer_tick_5: B.start + T.ticks[4],
  orbit_whoosh: B.start + T.explode + 1.3,
  tap: B.start + T.hit, confirm: B.start + T.confirms,
  layers_collapse: B.start + T.collapse,
  transition_point: B.end - 0.45,
};
export const transition = { kind: 'bloom' as const, frames: 14, cx: 540, cy: 960 };

const POINT_START: [number, number, number] = [0.0, 0.35, 0]; // where the touch lands on the glass (phone-local xy)
const HH = 0.01;

// ---------------------------------------------------------------- camera state (one function, read by the rig and the DOM projector)
const orbitCam = (deg: number, dist: number, y: number, look: [number, number, number], fov: number): Cam => {
  const a = (deg * Math.PI) / 180; return { pos: [Math.sin(a) * dist, y, Math.cos(a) * dist], look, fov };
};
const stackCam = (t: number, pointPos: [number, number, number], explodeK: number): Cam => {
  if (t < T.cut) {
    const k = ease(t, T.explode - 0.1, T.cut, easeInOut);
    return orbitCam(lerp(-60, -14, k), lerp(12.4, 11.8, k), lerp(1.7, 1.1, k), [0, -0.38, 0.95 * explodeK], 28);
  }
  const k = ease(t, T.collapse, T.collapse + 5.2, easeInOut);
  const look: [number, number, number] = [lerp(0, pointPos[0], k), lerp(-0.38, pointPos[1], k), lerp(0.95 * explodeK, pointPos[2], k)];
  return orbitCam(lerp(42, 0, k), lerp(11.6, 9.8, k), lerp(0.9, 0.25, k), look, lerp(28, 27, k));
};
const closeCam = (t: number): Cam => {
  const k = ease(t, T.cut, T.back, easeInOut);
  return camLerp({ pos: [2.3, 1.2, 7.8], look: [0.0, 0.0, 0], fov: 32 }, { pos: [1.4, 0.8, 6.7], look: [0.0, -0.08, 0], fov: 32 }, k);
};

// ---------------------------------------------------------------- the button close-up stage
const ButtonStage: React.FC<{ t: number }> = ({ t }) => {
  const grow = ease(t, T.targets + 0.05, T.targets + 0.7, easeOut);
  const press = Math.max(fadeIO(t, T.hit - 0.04, T.hit + 0.3, 0.05, 0.22), fadeIO(t, T.feedback - 0.04, T.feedback + 0.34, 0.05, 0.24));
  const readK = t >= T.read ? 1 : 0; const confirmed = t >= T.confirms;
  const confK = ease(t, T.confirms, T.confirms + 0.4, easeOut);
  const bScale = lerp(0.56, 1.0, grow);
  const labelTex = useCanvasTex(720, 220, `btn-${readK}-${confirmed ? 1 : 0}`, (ctx, w, h) => {
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    if (!confirmed) { ctx.fillStyle = readK ? '#F6F2E8' : '#6a6f78'; ctx.font = `700 76px ${FONT_CANVAS}`; ctx.fillText('Confirm order', w / 2, h / 2); return; }
    ctx.fillStyle = '#F6F2E8'; ctx.font = `700 76px ${FONT_CANVAS}`; ctx.fillText('Confirmed', w / 2 + 62, h / 2);
    ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(118, h / 2 + 4); ctx.lineTo(154, h / 2 + 38); ctx.lineTo(214, h / 2 - 32); ctx.stroke();
  });
  const panelTex = useCanvasTex(1100, 640, 'panel', (ctx, w, h) => {
    ctx.textBaseline = 'top'; ctx.fillStyle = '#F6F2E8'; ctx.font = `800 54px ${FONT_CANVAS}`; ctx.fillText('Delivery', 60, 56);
    ctx.globalAlpha = 0.55; ctx.font = `500 30px ${FONT_CANVAS}`; ctx.fillText('Ada Lindqvist · Nygatan 14 · Göteborg', 60, 130);
    ctx.fillText('Arrives Thursday · Free', 60, 176); ctx.globalAlpha = 0.25; ctx.fillRect(60, 236, w - 120, 2);
  });
  const targetTex = useCanvasTex(640, 220, 'target', (ctx, w, h) => { ctx.strokeStyle = '#80C9F8'; ctx.lineWidth = 4; ctx.setLineDash([14, 12]); roundRect(ctx, 6, 6, w - 12, h - 12, 56); ctx.stroke(); });
  const btnColor = confirmed ? '#1b2330' : '#1F2632';
  return (
    <group>
      {/* a dark glass card with the delivery copy */}
      <RoundedBox args={[2.5, 1.6, 0.05]} radius={0.08} smoothness={5} castShadow receiveShadow>
        <meshPhysicalMaterial color="#10141b" roughness={0.18} metalness={0.2} clearcoat={1} clearcoatRoughness={0.08} />
      </RoundedBox>
      <mesh position={[0, 0.22, 0.027]}><planeGeometry args={[2.3, 1.34]} /><meshBasicMaterial map={panelTex} transparent depthWrite={false} toneMapped={false} color="#d8d4ca" /></mesh>
      {/* the button: grows to a comfortable target, darkens on press, confirms with a check */}
      <group position={[0, -0.3, 0.028]} scale={[bScale, bScale, 1]}>
        <RoundedBox args={[1.16, 0.34, 0.03]} radius={0.09} smoothness={5} position={[0, 0, 0.015]} castShadow>
          <meshStandardMaterial color={btnColor} emissive={confirmed ? PALETTE.amber : '#2a3342'} emissiveIntensity={confirmed ? 0.08 + 0.1 * confK : 0.28 - 0.2 * press} roughness={0.3} metalness={0.15} />
        </RoundedBox>
        <mesh position={[0, 0, 0.034]}><planeGeometry args={[1.1, 0.336]} /><meshBasicMaterial map={labelTex} transparent depthWrite={false} toneMapped={false} color={new THREE.Color('#ffffff').multiplyScalar(1 - 0.35 * press)} /></mesh>
        {/* amber confirm edge */}
        {confirmed ? <mesh position={[0, 0, 0.0325]}><planeGeometry args={[1.2, 0.38]} /><meshBasicMaterial map={targetTex} color={PALETTE.amber} transparent opacity={0.9 * confK} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh> : null}
        {/* target outline */}
        <mesh position={[0, 0, 0.0325]}><planeGeometry args={[1.3, 0.44]} /><meshBasicMaterial map={targetTex} transparent opacity={0.85 * fadeIO(t, T.cut + 0.5, T.contrast, 0.35, 0.4)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      </group>
      <TouchRing t={t} t0={T.hit} position={[0.1, -0.3, 0.085]} scale={0.9} />
      <TouchRing t={t} t0={T.feedback} position={[-0.05, -0.31, 0.085]} scale={0.9} />
      {/* response ripple on confirm */}
      <mesh position={[0, -0.3, 0.083]} scale={[1 + 2.4 * confK, 1 + 2.4 * confK, 1]}><ringGeometry args={[0.2, 0.212, 64]} /><meshBasicMaterial color={PALETTE.amber} transparent opacity={0.8 * (1 - confK) * (confirmed ? 1 : 0)} toneMapped={false} /></mesh>
    </group>
  );
};

// ---------------------------------------------------------------- callout row: PIXELS · GRID · TYPE · COMPONENTS · GLASS with leaders to the layers
const ROW = [4, 3, 2, 1, 0]; // layer indices left→right as they appear on screen for a camera left of frontal
const ROW_W = [131, 87, 87, 218, 109]; const ROW_Y = 262;
const LabelRow: React.FC<{ t: number; cam: Cam; hh: number; rise: number; bob: number[]; ks: number[] }> = ({ t, cam, hh, rise, bob, ks }) => {
  const total = ROW_W.reduce((a, b) => a + b, 0); const gap = (936 - total) / (ROW.length - 1);
  let x = 72; const items = ROW.map((li, r) => { const cx = x + ROW_W[r] / 2; x += ROW_W[r] + gap; return { li, cx, w: ROW_W[r] }; });
  return (
    <>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
        {items.map(({ li, cx }) => {
          const t0 = T.ticks[TICK_LAYER.indexOf(li)]; const a = fadeIO(t, t0, T.cut - 0.1, 0.3, 0.25); if (a <= 0) return null;
          const k = easeOut(seg(t, t0 + 0.05, t0 + 0.45));
          const p = project(cam, [0, 1.52 + rise + bob[li], layerZ(li, ks[li])], t, hh);
          const x2 = lerp(cx, p.x, k), y2 = lerp(ROW_Y + 26, p.y, k);
          return (<g key={li} opacity={a}>
            <line x1={cx} y1={ROW_Y + 26} x2={x2} y2={y2} stroke="rgba(246,242,232,0.5)" strokeWidth={2} />
            <circle cx={p.x} cy={p.y} r={6} fill={PALETTE.amber} opacity={k} style={{ filter: 'drop-shadow(0 0 8px rgba(255,171,91,0.9))' }} />
          </g>);
        })}
      </svg>
      {items.map(({ li, cx, w }) => {
        const t0 = T.ticks[TICK_LAYER.indexOf(li)]; const a = fadeIO(t, t0, T.cut - 0.1, 0.3, 0.25); if (a <= 0) return null;
        const k = easeOut(seg(t, t0, t0 + 0.35)); const hot = t < t0 + 0.6;
        return <div key={li} style={{ position: 'absolute', left: cx - w / 2 - 20, width: w + 40, top: ROW_Y - 14 + (1 - k) * 12, textAlign: 'center', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: 24, letterSpacing: 5, color: hot ? PALETTE.amber : li === 0 ? PALETTE.cyan : PALETTE.ivory, opacity: a, textShadow: '0 2px 12px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}>{LAYERS[li].label}</div>;
      })}
    </>
  );
};

// ---------------------------------------------------------------- the beat
export const Beat: React.FC = () => {
  const t = useT();
  const inClose = t >= T.cut && t < T.back;
  // phone rise + layer explode / collapse
  const rise = lerp(-3.4, 0, ease(t, 0.0, 0.95, easeOut));
  const ks = LAYERS.map((_, i) => layerK(t, T.explode, T.collapse, i));
  // "answers your hand": a pulse that travels from the glass down through the layers
  const glows = LAYERS.map((_, i) => fadeIO(t, T.answers + i * 0.09, T.answers + i * 0.09 + 0.5, 0.12, 0.38) * 0.9 + fadeIO(t, T.ticks[TICK_LAYER.indexOf(i)] ?? -9, (T.ticks[TICK_LAYER.indexOf(i)] ?? -9) + 0.6, 0.1, 0.5) * 0.6);
  // "Motion": the stack ripples once
  const bob = LAYERS.map((_, i) => 0.06 * Math.sin(Math.PI * seg(t, T.ticks[4] + i * 0.07, T.ticks[4] + i * 0.07 + 0.55)));
  // amber point rides on the glass: lands on "surface", slides to the centre after the collapse
  const glassZ = layerZ(0, ks[0]) + 0.03;
  const slide = ease(t, T.collapse + 1.9, T.collapse + 4.1, easeInOut);
  const pointPos: [number, number, number] = [lerp(POINT_START[0], 0, slide), lerp(POINT_START[1], 0, slide) + bob[0], glassZ];
  const pointA = inClose ? 0 : fadeIO(t, T.surface, T.end + 2, 0.25, 0.1);
  const explodeK = ks.reduce((a, b) => a + b, 0) / ks.length;
  const cam = inClose ? closeCam(t) : stackCam(t, pointPos, explodeK);
  const hh = HH * (1 - ease(t, T.end - 2.6, T.end - 1.1, easeInOut));
  const camT = t; // the rig's handheld noise runs on local time
  const cut = fadeIO(t, T.cut - 0.02, T.cut + 0.2, 0.02, 0.18) * 0.55 + fadeIO(t, T.back - 0.02, T.back + 0.2, 0.02, 0.18) * 0.45;
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      <Stage3D background="#06080b" fog={inClose ? [9, 18] : [9, 20]} bloom={0.75} threshold={0.72}>
        <CameraRig keys={[{ t: camT, pos: cam.pos, look: cam.look, fov: cam.fov }]} t={camT} handheld={inClose ? 0.008 : hh} />
        <Rig keyI={2.1} keyColor="#ffdcb8" rimColor={PALETTE.cyan} ambient={0.1} />
        <pointLight position={inClose ? [-1.6, 1.0, 1.6] : [-2.6, 2.4, -1.8]} intensity={inClose ? 9 : 14} color={PALETTE.cyan} distance={10} />
        <pointLight position={inClose ? [1.4, -0.6, 1.8] : [3.2, 0.6, 3.6]} intensity={inClose ? 4 : 6} color={PALETTE.amber} distance={9} />
        {inClose ? (
          <ButtonStage t={t} />
        ) : (
          <group position={[0, rise, 0]}>
            <LayerStack ks={ks} glows={glows} bob={bob} cta={fadeIO(t, T.answers + 0.1, T.answers + 0.8, 0.1, 0.4)} />
            <TouchRing t={t} t0={T.surface} position={[POINT_START[0], POINT_START[1], glassZ + 0.01]} />
            {pointA > 0 ? <GlowPoint position={[pointPos[0], pointPos[1], pointPos[2]]} radius={0.055} intensity={0.9 * pointA + 0.1 * Math.sin(t * 6)} /> : null}
          </group>
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, inClose ? -1.4 : -2.4, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#0b0e13" roughness={0.25} metalness={0.4} /></mesh>
      </Stage3D>
      {/* layer labels: a callout row at the top, each with a leader line down to its layer's top edge (screen order is stable while the orbit stays left of frontal) */}
      {!inClose && t < T.back ? <LabelRow t={t} cam={cam} hh={hh} rise={rise} bob={bob} ks={ks} /> : null}
      {inClose ? (() => {
        const p = project(cam, [0, -0.5, 0.08], camT, 0.008);
        const tag1 = fadeIO(t, T.targets, T.contrast - 0.05, 0.25, 0.2), tag2 = fadeIO(t, T.contrast, T.feedback - 0.05, 0.25, 0.2), tag3 = fadeIO(t, T.confirms, T.back, 0.25, 0.2);
        return (<>
          <AnchorTag x={p.x} y={p.y} text="TARGET" sub={t >= T.targets + 0.5 ? '48 px · comfortable' : '28 px · too small'} a={tag1} lead={40} side="down" color={PALETTE.cyan} />
          <AnchorTag x={p.x} y={p.y} text="CONTRAST" sub={t >= T.read ? '12.6 : 1 · readable' : '2.9 : 1 · fails'} a={tag2} lead={40} side="down" color={t >= T.read ? PALETTE.ivory : PALETTE.gray} />
          <AnchorTag x={p.x} y={p.y} text="CONFIRMED" sub="feedback in 80 ms" a={tag3} lead={40} side="down" color={PALETTE.amber} />
        </>);
      })() : null}
      <Dip alpha={cut} color={PALETTE.ivory} />
    </AbsoluteFill>
  );
};
