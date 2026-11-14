// Parts for the UX beat: the journey curve, a tube drawn progressively via drawRange, glass stations with canvas icons,
// and the DOM inserts (nav bar, loading bar, plain words, undo toast, email card) that sit inside the 3D frame.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE, FONT } from '../lib/theme';
import { clamp, lerp, easeOut, easeInOut, seg, fadeIO } from '../lib/anim';
import { useCanvasTex, roundRect } from './Ui.parts';

// ------------------------------------------------------------------ the journey
export const PTS: [number, number, number][] = [
  [0.0, -2.2, 0.0], [-1.4, -1.6, -1.0], [-1.2, -0.85, -2.0], [0.5, -0.25, -2.9], [1.3, 0.42, -3.7],
  [0.5, 1.0, -4.5], [-1.2, 1.45, -5.3], [-0.9, 2.2, -6.1], [0.6, 2.7, -6.9], [1.5, 3.25, -7.7],
];
export const CURVE = new THREE.CatmullRomCurve3(PTS.map((p) => new THREE.Vector3(...p)), false, 'centripetal', 0.5);
export const STATIONS = [
  { id: 'find', n: '01', label: 'FIND', u: 0.2 },
  { id: 'choose', n: '02', label: 'CHOOSE', u: 0.42 },
  { id: 'pay', n: '03', label: 'PAY', u: 0.635 },
  { id: 'confirm', n: '04', label: 'CONFIRM', u: 0.85 },
] as const;
export const at = (u: number): [number, number, number] => { const p = CURVE.getPointAt(clamp(u)); return [p.x, p.y, p.z]; };
export const tangentAt = (u: number) => CURVE.getTangentAt(clamp(u));
export const STATION_POS = STATIONS.map((s) => at(s.u));
const SEGS = 420, RADIAL = 10;

/** The amber path, drawn progressively (0..1) via drawRange on an indexed TubeGeometry, with a soft additive halo. */
export const DrawnTube: React.FC<{ progress: number; glow?: number }> = ({ progress, glow = 1 }) => {
  const core = useMemo(() => new THREE.TubeGeometry(CURVE, SEGS, 0.034, RADIAL, false), []);
  const halo = useMemo(() => new THREE.TubeGeometry(CURVE, SEGS, 0.09, RADIAL, false), []);
  const count = Math.max(0, Math.floor(clamp(progress) * SEGS)) * RADIAL * 6;
  useLayoutEffect(() => { core.setDrawRange(0, count); halo.setDrawRange(0, count); }, [core, halo, count]);
  const c = useMemo(() => new THREE.Color(PALETTE.amber).multiplyScalar(1.25 * glow), [glow]);
  if (count <= 0) return null;
  return (
    <group>
      <mesh geometry={core}><meshBasicMaterial color={c} toneMapped={false} /></mesh>
      <mesh position={at(0)}><sphereGeometry args={[0.034, 12, 12]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
      <mesh geometry={halo}><meshBasicMaterial color={PALETTE.amber} transparent opacity={0.13 * glow} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  );
};

/** A floating glass station: clear slab, a frame that lights amber, and a canvas icon */
export const Station: React.FC<{ id: string; position: [number, number, number]; lit: number; pulse: number; near?: number }> = ({ id, position, lit, pulse, near = 0 }) => {
  const frame = useCanvasTex(500, 300, 'station-frame', (ctx, w, h) => { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.globalAlpha = 1; roundRect(ctx, 6, 6, w - 12, h - 12, 40); ctx.stroke(); ctx.lineWidth = 16; ctx.globalAlpha = 0.16; roundRect(ctx, 12, 12, w - 24, h - 24, 36); ctx.stroke(); });
  const icon = useCanvasTex(256, 256, `icon-${id}`, (ctx, w, h) => {
    ctx.strokeStyle = '#F6F2E8'; ctx.fillStyle = '#F6F2E8'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'find') { ctx.beginPath(); ctx.arc(112, 112, 60, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(158, 158); ctx.lineTo(210, 210); ctx.stroke(); }
    if (id === 'choose') { roundRect(ctx, 36, 60, 80, 136, 14); ctx.stroke(); roundRect(ctx, 140, 60, 80, 136, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(160, 128); ctx.lineTo(176, 146); ctx.lineTo(204, 110); ctx.stroke(); }
    if (id === 'pay') { roundRect(ctx, 30, 66, 196, 124, 18); ctx.stroke(); ctx.fillRect(30, 96, 196, 22); roundRect(ctx, 56, 142, 54, 18, 6); ctx.fill(); }
    if (id === 'confirm') { ctx.beginPath(); ctx.arc(128, 128, 84, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(88, 132); ctx.lineTo(116, 160); ctx.lineTo(172, 100); ctx.stroke(); }
  });
  const frameCol = useMemo(() => new THREE.Color('#5b6675').lerp(new THREE.Color(PALETTE.amber), lit).multiplyScalar(0.55 + 0.85 * lit + 0.3 * near), [lit, near]);
  return (
    <group position={position}>
      <RoundedBox args={[1.0, 0.6, 0.045]} radius={0.07} smoothness={5} castShadow>
        <meshPhysicalMaterial color="#9cc4e6" transparent opacity={0.16 + 0.1 * lit} roughness={0.05} metalness={0} clearcoat={1} clearcoatRoughness={0.04} depthWrite={false} side={THREE.DoubleSide} />
      </RoundedBox>
      <mesh position={[0, 0, 0.026]}><planeGeometry args={[1.0, 0.6]} /><meshBasicMaterial map={frame} color={frameCol} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0, 0.03]}><planeGeometry args={[0.34, 0.34]} /><meshBasicMaterial map={icon} color={new THREE.Color('#ffffff').multiplyScalar(0.45 + 0.6 * lit)} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      {/* amber flare inside the slab when lit */}
      <mesh position={[0, 0, 0.02]}><planeGeometry args={[0.96, 0.56]} /><meshBasicMaterial color={PALETTE.amber} transparent opacity={0.1 * lit} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      {/* pulse ring on light-up */}
      {pulse > 0 && pulse < 1 ? <mesh position={[0, 0, 0.035]} scale={[1 + 1.6 * pulse, 1 + 1.6 * pulse, 1]}><ringGeometry args={[0.34, 0.352, 64]} /><meshBasicMaterial color={PALETTE.amber} transparent opacity={0.9 * (1 - pulse)} toneMapped={false} side={THREE.DoubleSide} /></mesh> : null}
    </group>
  );
};

/** three glass slivers collapsing into the point at the start (the UI layers folding away) */
export const Collapse: React.FC<{ k: number; position: [number, number, number] }> = ({ k, position }) => {
  if (k >= 1) return null;
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => { const e = easeInOut(clamp(k * 1.15 - i * 0.07)); const s = 1 - e; return (
        <mesh key={i} position={[0, 0, (0.4 - i * 0.35) * s]} scale={[0.8 * s + 0.001, 1.6 * s + 0.001, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshPhysicalMaterial color="#cfe6ff" transparent opacity={0.22 * s} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>); })}
    </group>
  );
};

// ------------------------------------------------------------------ DOM inserts
const CARD: React.CSSProperties = { position: 'absolute', left: 130, width: 820, boxSizing: 'border-box', padding: '26px 34px 30px', borderRadius: 28, background: 'rgba(14,18,25,0.86)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)', backdropFilter: 'blur(18px)', fontFamily: FONT, color: PALETTE.ivory };
const Label: React.FC<{ text: string }> = ({ text }) => <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 5, color: PALETTE.amber, marginBottom: 18 }}>{text}</div>;
const Check: React.FC<{ k: number; color?: string; size?: number }> = ({ k, color = PALETTE.amber, size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M7 18 L14 25 L27 10" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - easeOut(clamp(k)))} /></svg>
);
/** Insert card: `age` seconds since it appeared, `life` total seconds; slides up in, fades out. */
export const Insert: React.FC<{ kind: 'nav' | 'speed' | 'words' | 'undo'; age: number; life: number; y: number }> = ({ kind, age, life, y }) => {
  if (age < 0 || age > life) return null;
  const inK = easeOut(seg(age, 0, 0.26)), outK = seg(age, life - 0.24, life);
  const a = inK * (1 - outK); const ty = (1 - inK) * 34 - outK * 18;
  const body = (() => {
    if (kind === 'nav') {
      const tabs = ['Home', 'Search', 'Bag', 'You']; const sel = easeInOut(seg(age, 0.3, 0.75)); const x = lerp(0, 1, sel);
      return (<>
        <Label text="NAVIGATION" />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '14px 10px 10px', borderRadius: 18, background: 'rgba(255,255,255,0.05)' }}>
          {tabs.map((tb, i) => { const on = i === 1 ? sel : i === 0 ? 1 - sel : 0; return (
            <div key={tb} style={{ width: 160, textAlign: 'center', color: `rgba(246,242,232,${0.45 + 0.55 * on})`, fontWeight: 600, fontSize: 24 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, margin: '0 auto 8px', background: on > 0.5 ? PALETTE.amber : 'rgba(246,242,232,0.35)', opacity: 0.6 + 0.4 * on }} />{tb}
            </div>); })}
          <div style={{ position: 'absolute', left: 10 + 20 + x * 170, bottom: 2, width: 120, height: 4, borderRadius: 2, background: PALETTE.amber, boxShadow: '0 0 12px rgba(255,171,91,0.8)' }} />
        </div>
      </>);
    }
    if (kind === 'speed') {
      const p = easeOut(seg(age, 0.12, 0.62)); const done = age > 0.66;
      return (<>
        <Label text="SPEED" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 30, fontWeight: 600 }}>
          <span>{done ? 'Your bag is ready' : 'Loading your bag'}</span>
          <span style={{ color: done ? PALETTE.amber : PALETTE.gray, fontVariantNumeric: 'tabular-nums', fontSize: 26 }}>{done ? <><Check k={(age - 0.66) * 4} /> 0.4 s</> : `${(p * 0.4).toFixed(2)} s`}</span>
        </div>
        <div style={{ marginTop: 18, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${PALETTE.amberDeep}, ${PALETTE.amber})`, boxShadow: '0 0 16px rgba(255,171,91,0.7)' }} /></div>
      </>);
    }
    if (kind === 'words') {
      const strike = easeOut(seg(age, 0.28, 0.62)); const plain = easeOut(seg(age, 0.5, 0.85));
      return (<>
        <Label text="CLEAR WORDS" />
        <div style={{ position: 'relative', fontSize: 26, fontWeight: 500, color: PALETTE.gray, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: -0.5, opacity: 1 - 0.5 * plain }}>
          ERR_AUTH_401: credential validation failed
          <div style={{ position: 'absolute', left: 0, top: '52%', height: 3, width: `${strike * 100}%`, background: PALETTE.amber }} />
        </div>
        <div style={{ marginTop: 14, fontSize: 36, fontWeight: 700, color: PALETTE.ivory, opacity: plain, transform: `translateY(${(1 - plain) * 14}px)` }}>Wrong password. Try again.</div>
      </>);
    }
    const tap = seg(age, 0.5, 0.95); const restored = age > 0.78; const rk = (age - 0.78) * 4;
    return (<>
      <Label text="RECOVERING FROM MISTAKES" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 26px', borderRadius: 18, background: 'rgba(255,255,255,0.06)', fontSize: 30, fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>{restored ? <><Check k={rk} /> Message restored</> : 'Message deleted'}</span>
        <span style={{ position: 'relative', color: PALETTE.amber, fontWeight: 800, letterSpacing: 1, opacity: restored ? 0.35 : 1 }}>Undo
          {tap > 0 && tap < 1 ? <span style={{ position: 'absolute', left: '50%', top: '50%', width: 30 + 120 * tap, height: 30 + 120 * tap, marginLeft: -(15 + 60 * tap), marginTop: -(15 + 60 * tap), borderRadius: '50%', border: `3px solid rgba(255,217,176,${0.9 * (1 - tap)})` }} /> : null}
        </span>
      </div>
    </>);
  })();
  return <div style={{ ...CARD, top: y, opacity: a, transform: `translateY(${ty}px)` }}>{body}</div>;
};
/** the email that arrives after you pay: a small envelope card sliding in from the right */
export const EmailCard: React.FC<{ age: number; life: number; x: number; y: number }> = ({ age, life, x, y }) => {
  if (age < 0 || age > life) return null;
  const inK = easeOut(seg(age, 0, 0.4)), outK = seg(age, life - 0.3, life); const a = inK * (1 - outK);
  const check = seg(age, 0.6, 1.0);
  return (
    <div style={{ position: 'absolute', left: x + (1 - inK) * 140, top: y, width: 560, boxSizing: 'border-box', padding: '22px 26px', borderRadius: 24, background: 'rgba(14,18,25,0.88)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)', backdropFilter: 'blur(18px)', fontFamily: FONT, color: PALETTE.ivory, opacity: a, display: 'flex', gap: 22, alignItems: 'center' }}>
      <div style={{ width: 86, height: 86, borderRadius: 20, background: 'rgba(255,171,91,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <svg width={48} height={48} viewBox="0 0 48 48"><rect x={5} y={11} width={38} height={26} rx={5} fill="none" stroke={PALETTE.amber} strokeWidth={3} /><path d="M6 14 L24 27 L42 14" fill="none" stroke={PALETTE.amber} strokeWidth={3} strokeLinejoin="round" /></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: PALETTE.gray, marginBottom: 6 }}>NEW EMAIL</div>
        <div style={{ fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>Order confirmed <Check k={check} size={28} /></div>
        <div style={{ fontSize: 22, color: PALETTE.gray, marginTop: 4 }}>Receipt #48213 · arrives Thursday</div>
      </div>
    </div>
  );
};
/** centred station label anchored above a projected point */
export const StationLabel: React.FC<{ x: number; y: number; n: string; text: string; lit: number; a: number }> = ({ x, y, n, text, lit, a }) => {
  if (a <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x - 200, width: 400, top: y - 20, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: lit > 0.5 ? PALETTE.ivory : 'rgba(246,242,232,0.55)', opacity: a, textShadow: '0 2px 14px rgba(0,0,0,0.85)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
      <span style={{ color: lit > 0.5 ? PALETTE.amber : PALETTE.gray, marginRight: 14 }}>{n}</span>{text}
    </div>
  );
};
export { fadeIO };
