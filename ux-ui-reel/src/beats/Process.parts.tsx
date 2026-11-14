// PROCESS beat parts: the six process cards (canvas word textures on glass/ivory slabs) + the DOM usability-test insert
// (phone, polished UI, wireframe UI that morphs through iterations, finger trail, tap heat-map, observation notes).
import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE, FONT, DISPLAY } from '../lib/theme';
import { clamp, lerp, easeInOut, easeOut, easeOutExpo, fadeIO, seg } from '../lib/anim';
import { AmberDot } from '../lib/Overlay';

// ---------------------------------------------------------------- 3D: process cards
export const CARD_W = 1.0, CARD_H = 0.58, CARD_D = 0.05;
export const WORDS = ['RESEARCH', 'DEFINE', 'DESIGN', 'PROTOTYPE', 'TEST', 'REPEAT'];
const makeCardTexture = (word: string, index: number, ivory: boolean, mirror: boolean) => {
  const W = 640, H = 368; const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d')!;
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  if (ivory) { ctx.fillStyle = '#F2EDE2'; ctx.fillRect(0, 0, W, H); }
  else { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1c222c'); g.addColorStop(1, '#0e1218'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); const s = ctx.createLinearGradient(0, 0, W * 0.7, H * 0.5); s.addColorStop(0, 'rgba(255,255,255,0.09)'); s.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = s; ctx.fillRect(0, 0, W, H); }
  ctx.textBaseline = 'alphabetic'; (ctx as any).letterSpacing = '4px';
  ctx.font = `700 24px 'Inter', system-ui, sans-serif`; ctx.fillStyle = PALETTE.amber; ctx.textAlign = 'left'; ctx.fillText(`0${index + 1}`, 44, 70);
  ctx.strokeStyle = ivory ? 'rgba(20,24,30,0.18)' : 'rgba(246,242,232,0.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(112, 62); ctx.lineTo(W - 44, 62); ctx.stroke();
  const size = word.length > 8 ? 92 : 108; (ctx as any).letterSpacing = `${-size * 0.04}px`;
  ctx.font = `800 ${size}px 'Inter Display', 'Inter', system-ui, sans-serif`; ctx.fillStyle = ivory ? '#15181f' : PALETTE.ivory; ctx.textAlign = 'left'; ctx.fillText(word, 40, 250);
  ctx.fillStyle = PALETTE.amber; ctx.fillRect(44, 290, 72, 6);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
};
export const Card: React.FC<{ index: number; flash: number; ivory: boolean; lit?: number }> = ({ index, flash, ivory, lit = 1 }) => {
  const front = useMemo(() => makeCardTexture(WORDS[index], index, ivory, false), [index, ivory]);
  const back = useMemo(() => makeCardTexture(WORDS[index], index, ivory, true), [index, ivory]);
  const em = (ivory ? 0.42 : 0.75) * lit + 0.7 * flash;
  return (
    <group>
      <RoundedBox args={[CARD_W + 0.05, CARD_H + 0.05, CARD_D]} radius={0.035} smoothness={4} castShadow receiveShadow>
        {ivory ? <meshStandardMaterial color="#cfc8ba" roughness={0.7} metalness={0.02} /> : <meshPhysicalMaterial color="#0a0d12" roughness={0.12} metalness={0.3} clearcoat={1} clearcoatRoughness={0.06} />}
      </RoundedBox>
      <mesh position={[0, 0, CARD_D / 2 + 0.001]}><planeGeometry args={[CARD_W, CARD_H]} /><meshStandardMaterial map={front} color={ivory ? '#3a3834' : '#2a2f38'} emissive="#ffffff" emissiveMap={front} emissiveIntensity={em} roughness={0.5} metalness={0.05} /></mesh>
      <mesh position={[0, 0, -CARD_D / 2 - 0.001]} rotation={[0, Math.PI, 0]}><planeGeometry args={[CARD_W, CARD_H]} /><meshStandardMaterial map={back} color={ivory ? '#3a3834' : '#2a2f38'} emissive="#ffffff" emissiveMap={back} emissiveIntensity={em} roughness={0.5} metalness={0.05} /></mesh>
    </group>
  );
};

// ---------------------------------------------------------------- DOM insert
export const SCREEN_W = 372, SCREEN_H = 772, BEZEL = 14;   // base phone: 400 × 800 outer
type Rect = { x: number; y: number; w: number; h: number; o?: number; r?: number };
type Layout = Record<string, Rect>;
export const WIRE: Layout[] = [
  { image: { x: 0, y: 0, w: 372, h: 380, r: 0 }, title: { x: 24, y: 410, w: 220, h: 22 }, sub: { x: 24, y: 446, w: 150, h: 12 }, chip1: { x: 24, y: 490, w: 84, h: 34, r: 17 }, chip2: { x: 116, y: 490, w: 84, h: 34, r: 17 }, chip3: { x: 208, y: 490, w: 84, h: 34, r: 17 }, desc1: { x: 24, y: 554, w: 324, h: 11 }, desc2: { x: 24, y: 576, w: 280, h: 11 }, price: { x: 262, y: 644, w: 86, h: 20, r: 4 }, button: { x: 24, y: 696, w: 236, h: 52, r: 14 } },
  { image: { x: 0, y: 0, w: 372, h: 262, r: 0 }, title: { x: 24, y: 292, w: 220, h: 24 }, sub: { x: 24, y: 378, w: 150, h: 12 }, chip1: { x: 24, y: 420, w: 84, h: 34, r: 17 }, chip2: { x: 116, y: 420, w: 84, h: 34, r: 17 }, chip3: { x: 208, y: 420, w: 84, h: 34, r: 17 }, desc1: { x: 24, y: 486, w: 324, h: 11 }, desc2: { x: 24, y: 508, w: 280, h: 11 }, price: { x: 24, y: 330, w: 128, h: 30, r: 6 }, button: { x: 24, y: 696, w: 324, h: 56, r: 16 } },
  { image: { x: 0, y: 0, w: 372, h: 214, r: 0 }, title: { x: 24, y: 246, w: 236, h: 26 }, sub: { x: 24, y: 358, w: 150, h: 12 }, chip1: { x: 24, y: 400, w: 84, h: 34, r: 17, o: 0 }, chip2: { x: 116, y: 400, w: 84, h: 34, r: 17, o: 0 }, chip3: { x: 208, y: 400, w: 84, h: 34, r: 17, o: 0 }, desc1: { x: 24, y: 406, w: 324, h: 11 }, desc2: { x: 24, y: 428, w: 280, h: 11 }, price: { x: 24, y: 290, w: 176, h: 46, r: 8 }, button: { x: 24, y: 690, w: 324, h: 60, r: 18 } },
];
const mixLayout = (a: Layout, b: Layout, k: number): Layout => { const out: Layout = {}; for (const id of Object.keys(a)) { const p = a[id], q = b[id]; out[id] = { x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), w: lerp(p.w, q.w, k), h: lerp(p.h, q.h, k), r: lerp(p.r ?? 0, q.r ?? 0, k), o: lerp(p.o ?? 1, q.o ?? 1, k) }; } return out; };
/** version as a float: 0 → 1 → 2 with eased transitions */
export const wireLayout = (v: number): Layout => { const i = Math.min(1, Math.floor(v)); const k = easeInOut(clamp(v - i)); return mixLayout(WIRE[i], WIRE[Math.min(2, i + 1)], k); };

/** Phone frame; children are placed in screen coordinates (SCREEN_W × SCREEN_H). */
export const Phone: React.FC<{ x: number; y: number; scale: number; glow?: number; dim?: number; children?: React.ReactNode; screenBg?: string }> = ({ x, y, scale, glow = 0, dim = 0, children, screenBg = '#0f131a' }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: SCREEN_W + BEZEL * 2, height: SCREEN_H + BEZEL * 2, transform: `scale(${scale})`, transformOrigin: '0 0', borderRadius: 54, background: '#171c25', border: '2px solid #2a3140', boxShadow: `0 40px 90px rgba(0,0,0,0.55), 0 0 ${60 * glow}px rgba(255,171,91,${0.45 * glow}), inset 0 0 0 1px rgba(255,255,255,0.05)`, opacity: 1 - 0.68 * dim, filter: dim > 0 ? `grayscale(${0.85 * dim}) brightness(${1 - 0.5 * dim})` : undefined }}>
    <div style={{ position: 'absolute', left: BEZEL, top: BEZEL, width: SCREEN_W, height: SCREEN_H, borderRadius: 42, overflow: 'hidden', background: screenBg }}>{children}</div>
  </div>
);

/** The polished, glossy v1 product page (what the participants were tested on). */
export const PolishedUI: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, color: PALETTE.ivory }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: 380, background: 'linear-gradient(135deg, #ffbf7a 0%, #e07c7a 45%, #4b3a8e 100%)' }}>
      <div style={{ position: 'absolute', left: 86, top: 70, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle at 36% 32%, #ffe8cc 0%, #ffab5b 30%, #b45f78 68%, #352a6b 100%)', boxShadow: '0 30px 60px rgba(30,10,60,0.45)' }} />
      <div style={{ position: 'absolute', left: 0, top: 300, width: SCREEN_W, height: 80, background: 'linear-gradient(180deg, rgba(15,19,26,0) 0%, #0f131a 100%)' }} />
    </div>
    <div style={{ position: 'absolute', left: 24, top: 404, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Orb · Studio Edition</div>
    <div style={{ position: 'absolute', left: 24, top: 440, fontSize: 14, color: PALETTE.gray }}>Matte graphite · ambient light</div>
    {['Graphite', 'Sand', 'Moss'].map((c, i) => <div key={c} style={{ position: 'absolute', left: 24 + i * 92, top: 490, width: 84, height: 34, borderRadius: 17, border: `1px solid ${i === 0 ? PALETTE.amber : 'rgba(246,242,232,0.22)'}`, color: i === 0 ? PALETTE.amber : PALETTE.ivory, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{c}</div>)}
    <div style={{ position: 'absolute', left: 24, top: 548, width: 324, fontSize: 12.5, lineHeight: '22px', color: 'rgba(246,242,232,0.6)' }}>A quiet light for focused evenings. Dims with a touch, wakes with a wave.</div>
    <div style={{ position: 'absolute', right: 24, top: 646, fontSize: 13, color: 'rgba(246,242,232,0.42)' }}>from €89.00</div>
    <div style={{ position: 'absolute', left: 24, top: 696, width: 236, height: 52, borderRadius: 14, background: 'linear-gradient(90deg, #ffbe78, #f0923d)', color: '#1a1410', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px rgba(255,171,91,0.35)' }}>Add to bag</div>
  </div>
);

/** Wireframe product page at a (float) iteration; lit 0→1 turns the outlines amber/ivory with glow. */
export const WireUI: React.FC<{ v: number; lit: number }> = ({ v, lit }) => {
  const L = wireLayout(v); const base = `rgba(138,143,152,${lerp(0.9, 0.35, lit)})`; const ink = lit > 0 ? `rgba(246,242,232,${0.35 + 0.65 * lit})` : base;
  const amber = `rgba(255,171,91,${0.4 + 0.6 * lit})`; const glow = lit > 0 ? `0 0 ${18 * lit}px rgba(255,171,91,${0.45 * lit})` : undefined;
  const box = (r: Rect, style: React.CSSProperties = {}) => ({ position: 'absolute' as const, left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: r.r ?? 0, opacity: r.o ?? 1, boxSizing: 'border-box' as const, ...style });
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, background: lit > 0 ? `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,171,91,${0.1 * lit}) 0%, rgba(255,171,91,0) 70%)` : undefined }}>
      <div style={box(L.image, { border: `2px solid ${ink}`, borderTop: 'none', borderLeft: 'none', borderRight: 'none' })}>
        <svg width={L.image.w} height={L.image.h} style={{ position: 'absolute', inset: 0 }}><line x1={0} y1={0} x2={L.image.w} y2={L.image.h} stroke={ink} strokeWidth={1.5} /><line x1={L.image.w} y1={0} x2={0} y2={L.image.h} stroke={ink} strokeWidth={1.5} /></svg>
      </div>
      <div style={box(L.title, { background: ink, borderRadius: 4 })} />
      <div style={box(L.sub, { background: base, borderRadius: 3, opacity: 0.6 * (L.sub.o ?? 1) })} />
      {['chip1', 'chip2', 'chip3'].map((id) => <div key={id} style={box(L[id], { border: `2px solid ${base}` })} />)}
      <div style={box(L.desc1, { background: base, borderRadius: 3, opacity: 0.5 })} /><div style={box(L.desc2, { background: base, borderRadius: 3, opacity: 0.5 })} />
      <div style={box(L.price, { border: `2px solid ${amber}`, boxShadow: glow, color: amber, fontSize: lerp(11, 24, clamp(v / 2)), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: -0.5 })}>€89</div>
      <div style={box(L.button, { border: `2px solid ${ink}`, boxShadow: glow, display: 'flex', alignItems: 'center', justifyContent: 'center' })}><div style={{ width: L.button.w * 0.45, height: 10, borderRadius: 5, background: ink }} /></div>
    </div>
  );
};

// finger path over the polished screen (screen coords): keyframes [time, x, y, tap?]
export type FingerKey = { t: number; x: number; y: number; tap?: boolean };
export const fingerAt = (keys: FingerKey[], t: number) => {
  if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t >= a.t && t <= b.t) { const k = easeInOut(seg(t, a.t, b.t)); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) }; } }
  const l = keys[keys.length - 1]; return { x: l.x, y: l.y };
};
/** Cyan trail (fading polyline) + tap rings + amber heat blobs; fingertip is the amber point (rendered by the beat). */
export const FingerTrail: React.FC<{ keys: FingerKey[]; t: number; alpha: number }> = ({ keys, t, alpha }) => {
  const pos = fingerAt(keys, t); const visited = keys.filter((k) => k.t <= t);
  const pts = [...visited.map((k) => ({ x: k.x, y: k.y, t: k.t })), { ...pos, t }];
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: alpha, pointerEvents: 'none' }}>
      {/* heat-map: soft amber blobs accumulate at each tap */}
      {visited.filter((k) => k.tap).map((k, i) => { const g = easeOut(seg(t, k.t, k.t + 0.6)); const r = 95 * (0.6 + 0.4 * g); return <div key={i} style={{ position: 'absolute', left: k.x - r, top: k.y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', mixBlendMode: 'screen', opacity: 0.75 * g, background: 'radial-gradient(circle, rgba(255,171,91,0.95) 0%, rgba(255,140,70,0.55) 30%, rgba(255,120,60,0.18) 60%, rgba(255,120,60,0) 100%)' }} />; })}
      <svg width={SCREEN_W} height={SCREEN_H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {pts.slice(1).map((p, i) => { const a = pts[i]; const age = t - p.t; const o = clamp(1 - age / 2.2) * 0.85; return o > 0 ? <line key={i} x1={a.x} y1={a.y} x2={p.x} y2={p.y} stroke={PALETTE.cyan} strokeWidth={3} strokeLinecap="round" opacity={o} /> : null; })}
        {visited.filter((k) => k.tap).map((k, i) => { const g = seg(t, k.t, k.t + 0.5); return g < 1 ? <circle key={i} cx={k.x} cy={k.y} r={10 + 34 * easeOut(g)} fill="none" stroke={PALETTE.cyan} strokeWidth={2.5} opacity={1 - g} /> : null; })}
      </svg>
    </div>
  );
};

/** Observation note card (sticky-note feel, Inter) */
export const Note: React.FC<{ t: number; tIn: number; tOut: number; x: number; y: number; who: string; text: string; time: string; rot?: number }> = ({ t, tIn, tOut, x, y, who, text, time, rot = -3 }) => {
  const k = easeOutExpo(seg(t, tIn, tIn + 0.55)); const out = 1 - seg(t, tOut, tOut + 0.3); if (k <= 0 || out <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x + (1 - k) * 160, top: y, width: 490, boxSizing: 'border-box', padding: '26px 30px 28px', borderRadius: 22, background: '#F6F2E8', color: '#15181f', fontFamily: FONT, transform: `rotate(${rot}deg) translateY(${(1 - k) * 20}px)`, opacity: Math.min(1, k * 1.4) * out, boxShadow: '0 30px 70px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 3, color: PALETTE.amberDeep }}>{who}</span><span style={{ fontSize: 18, fontWeight: 600, color: PALETTE.gray2 }}>{time}</span></div>
      <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.12 }}>{text}</div>
    </div>
  );
};

/** Iteration counter: tracked label + big version number that flips through a mask */
export const Counter: React.FC<{ v: number; x: number; y: number; alpha: number }> = ({ v, x, y, alpha }) => {
  const i = Math.min(2, Math.floor(v + 0.001)); const k = clamp(v - i); const slide = easeOutExpo(clamp(k / 0.45)); const prev = Math.max(0, i - 1);
  const show = k > 0 && k < 0.45 && i > 0;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: alpha, fontFamily: DISPLAY, color: PALETTE.ivory }}>
      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, letterSpacing: 5, color: PALETTE.gray, marginBottom: 2 }}>ITERATION</div>
      <div style={{ position: 'relative', height: 96, overflow: 'hidden', width: 160 }}>
        {show ? <div style={{ position: 'absolute', top: 0, fontSize: 92, fontWeight: 800, letterSpacing: -4, lineHeight: '96px', transform: `translateY(${-slide * 100}%)`, opacity: 1 - slide }}>v{prev + 1}</div> : null}
        <div style={{ position: 'absolute', top: 0, fontSize: 92, fontWeight: 800, letterSpacing: -4, lineHeight: '96px', transform: show ? `translateY(${(1 - slide) * 100}%)` : undefined, color: i === 2 ? PALETTE.amber : PALETTE.ivory }}>v{i + 1}</div>
      </div>
    </div>
  );
};
export { AmberDot, fadeIO };
