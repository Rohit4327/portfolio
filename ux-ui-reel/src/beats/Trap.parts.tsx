// TRAP beat parts: canvas-painted checkout UIs mapped as emissive textures onto 3D glass/ivory slabs, the hairline crack and tap rings.
import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '../lib/theme';
import { clamp, lerp, easeOut, easeOutExpo, easeInOut, noise1 } from '../lib/anim';

export const UI_W = 720, UI_H = 1440;           // canvas px (1:2) → slab face SLAB_W × SLAB_H
export const SLAB_W = 1.1, SLAB_H = 2.2, SLAB_D = 0.075;
export const uiToLocal = (px: number, py: number): [number, number] => [(px / UI_W - 0.5) * SLAB_W, (0.5 - py / UI_H) * SLAB_H];

/** A CanvasTexture repainted on every React render (frames are pure functions of time, so repaint = deterministic). */
export const useCanvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    return { canvas, tex };
  }, [w, h]);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, w, h);
  draw(ctx); tex.needsUpdate = true;
  return tex;
};

const F = (weight: number, size: number, display = false) => `${weight} ${size}px ${display ? "'Inter Display', 'Inter'" : "'Inter'"}, system-ui, sans-serif`;
const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); (ctx as any).roundRect(x, y, w, h, r); };
const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left', spacing = 0) => {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; (ctx as any).letterSpacing = `${spacing}px`; ctx.fillText(s, x, y); (ctx as any).letterSpacing = '0px';
};

export type GlassState = { t: number; step: number; stepK: number; press: number; fee: number; red: number; stepTimes: number[] };
/** The gorgeous dark-glass checkout ("AUREL", abstract product "Orb"). Steps: 0 Bag → 1 Delivery → 2 Pay. */
export const drawGlassCheckout = (ctx: CanvasRenderingContext2D, s: GlassState) => {
  const W = UI_W, H = UI_H, P = 56;
  // background: deep graphite with soft cyan / amber light pools
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#171c26'); bg.addColorStop(1, '#0b0e14'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(140, 120, 10, 140, 120, 620); g.addColorStop(0, 'rgba(128,201,248,0.22)'); g.addColorStop(1, 'rgba(128,201,248,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W - 60, H - 200, 10, W - 60, H - 200, 700); g.addColorStop(0, 'rgba(255,171,91,0.14)'); g.addColorStop(1, 'rgba(255,171,91,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // header
  text(ctx, 'AUREL', P, 112, F(800, 30), PALETTE.ivory, 'left', 9);
  text(ctx, 'Checkout', W - P, 112, F(500, 26), 'rgba(246,242,232,0.55)', 'right');
  // step indicator
  const steps = ['Bag', 'Delivery', 'Pay']; const sx = [P + 10, W / 2, W - P - 10];
  ctx.strokeStyle = 'rgba(246,242,232,0.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx[0], 186); ctx.lineTo(sx[2], 186); ctx.stroke();
  const prog = clamp(s.step - 1 + s.stepK, 0, 2) / 2;
  ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx[0], 186); ctx.lineTo(lerp(sx[0], sx[2], prog), 186); ctx.stroke();
  steps.forEach((name, i) => {
    const active = i <= s.step; ctx.beginPath(); ctx.arc(sx[i], 186, active ? 9 : 6, 0, Math.PI * 2); ctx.fillStyle = active ? PALETTE.amber : '#2a313d'; ctx.fill();
    if (active) { ctx.beginPath(); ctx.arc(sx[i], 186, 16, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,171,91,0.18)'; ctx.fill(); }
    text(ctx, name, sx[i], 236, F(600, 22), active ? PALETTE.ivory : 'rgba(246,242,232,0.4)', 'center', 1);
  });
  // content area (slides between steps)
  const drawStep = (step: number, dx: number, alpha: number) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(dx, 0);
    const btn = (label: string, y: number) => {
      const hot = s.step === step ? s.press : 0;
      ctx.shadowColor = `rgba(255,171,91,${0.45 + 0.4 * hot})`; ctx.shadowBlur = 48 + 40 * hot; ctx.shadowOffsetY = 16;
      const bg2 = ctx.createLinearGradient(P, y, W - P, y + 104); bg2.addColorStop(0, hot ? '#ffd29a' : '#ffbe78'); bg2.addColorStop(1, hot ? '#ffa964' : '#f0923d');
      rr(ctx, P, y, W - 2 * P, 104, 30); ctx.fillStyle = bg2; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      text(ctx, label, W / 2, y + 66, F(700, 32), '#1a1410', 'center');
    };
    const card = (y: number, h: number) => { rr(ctx, P, y, W - 2 * P, h, 32); ctx.fillStyle = 'rgba(255,255,255,0.055)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1.5; ctx.stroke(); };
    const orb = (x: number, y: number, r: number) => {
      const og = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r); og.addColorStop(0, '#ffe2bf'); og.addColorStop(0.35, '#ffab5b'); og.addColorStop(0.72, '#c96a7a'); og.addColorStop(1, '#4b3a8e');
      ctx.shadowColor = 'rgba(255,171,91,0.5)'; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = og; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    };
    const row = (label: string, value: string, y: number, strong = false, color?: string) => {
      text(ctx, label, P + 8, y, F(strong ? 700 : 500, strong ? 30 : 26), strong ? PALETTE.ivory : 'rgba(246,242,232,0.62)');
      text(ctx, value, W - P - 8, y, F(strong ? 800 : 600, strong ? 34 : 26), color ?? PALETTE.ivory, 'right');
    };
    const field = (label: string, value: string, y: number) => { rr(ctx, P, y, W - 2 * P, 112, 26); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); text(ctx, label.toUpperCase(), P + 28, y + 40, F(600, 17), 'rgba(246,242,232,0.42)', 'left', 2); text(ctx, value, P + 28, y + 84, F(500, 27), PALETTE.ivory); };
    if (step === 0) {
      card(300, 360); orb(P + 110, 480, 92);
      text(ctx, 'Orb', P + 240, 430, F(700, 36), PALETTE.ivory); text(ctx, 'Studio Edition', P + 240, 476, F(500, 26), 'rgba(246,242,232,0.6)');
      text(ctx, 'Matte graphite · 1 ×', P + 240, 530, F(500, 23), 'rgba(246,242,232,0.42)'); text(ctx, '€89.00', W - P - 32, 620, F(800, 38), PALETTE.ivory, 'right');
      card(700, 100); text(ctx, 'Gift wrap', P + 32, 760, F(600, 27), PALETTE.ivory); rr(ctx, W - P - 108, 726, 76, 44, 22); ctx.fillStyle = '#2a313d'; ctx.fill(); ctx.beginPath(); ctx.arc(W - P - 86, 748, 17, 0, Math.PI * 2); ctx.fillStyle = PALETTE.ivory; ctx.fill();
      field('Promo code', 'AUREL-10', 830);
      row('Subtotal', '€89.00', 1010, true);
      btn('Continue', 1130);
    } else if (step === 1) {
      text(ctx, 'Delivery', P, 340, F(700, 44, true), PALETTE.ivory);
      field('Name', 'Mara Lindqvist', 390); field('Address', 'Linnégatan 4, 114 47 Stockholm', 530);
      const opt = (y: number, title: string, sub: string, on: boolean) => { card(y, 110); ctx.beginPath(); ctx.arc(P + 44, y + 55, 14, 0, Math.PI * 2); ctx.strokeStyle = on ? PALETTE.amber : 'rgba(246,242,232,0.3)'; ctx.lineWidth = 3; ctx.stroke(); if (on) { ctx.beginPath(); ctx.arc(P + 44, y + 55, 7, 0, Math.PI * 2); ctx.fillStyle = PALETTE.amber; ctx.fill(); } text(ctx, title, P + 84, y + 50, F(600, 27), PALETTE.ivory); text(ctx, sub, P + 84, y + 84, F(500, 22), 'rgba(246,242,232,0.5)'); };
      opt(700, 'Standard', '2 – 3 days', true); opt(830, 'Express', 'Tomorrow before noon', false);
      btn('Continue', 1130);
    } else {
      text(ctx, 'Pay', P, 340, F(700, 44, true), PALETTE.ivory);
      // card graphic
      const cg = ctx.createLinearGradient(P, 390, W - P, 560); cg.addColorStop(0, '#2b3443'); cg.addColorStop(1, '#141a24'); rr(ctx, P, 390, W - 2 * P, 170, 30); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5; ctx.stroke();
      rr(ctx, P + 36, 426, 56, 40, 8); ctx.fillStyle = '#d9c38a'; ctx.fill(); text(ctx, '••••  ••••  ••••  4821', P + 36, 532, F(600, 27), PALETTE.ivory, 'left', 2); text(ctx, 'VISA', W - P - 36, 440, F(800, 22), 'rgba(246,242,232,0.7)', 'right', 2);
      // summary (fee row slides in; rows below shift)
      const feeK = s.fee; const shift = 74 * feeK;
      row('Orb · Studio Edition', '€89.00', 680);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P + 8, 712); ctx.lineTo(W - P - 8, 712); ctx.stroke();
      if (feeK > 0) { ctx.save(); ctx.globalAlpha = alpha * clamp(feeK * 1.6); ctx.translate((1 - feeK) * 320, 0); row('Delivery', '€14.90', 762, false, '#ff8e62'); ctx.restore(); }
      const jumped = feeK > 0.55; const popK = 1 + 0.22 * (1 - clamp((feeK - 0.55) / 0.45)) * (jumped ? 1 : 0);
      text(ctx, 'Total', P + 8, 776 + shift, F(700, 30), PALETTE.ivory);
      ctx.save(); ctx.translate(W - P - 8, 776 + shift); ctx.scale(popK, popK); text(ctx, jumped ? '€103.90' : '€89.00', 0, 0, F(800, 40), jumped ? '#ff8e62' : PALETTE.ivory, 'right'); ctx.restore();
      text(ctx, 'Incl. VAT · 30-day returns', P + 8, 830 + shift, F(500, 21), 'rgba(246,242,232,0.4)');
      btn(jumped ? 'Pay €103.90' : 'Pay €89.00', 1130);
    }
    ctx.restore();
  };
  if (s.stepK < 1 && s.step > 0) { const k = easeInOut(s.stepK); drawStep(s.step - 1, -W * 0.5 * k, 1 - k); drawStep(s.step, W * 0.6 * (1 - k), k); } else drawStep(s.step, 0, 1);
  // betrayal: red-amber vignette flicker when the fee lands
  if (s.red > 0) { const rg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.34, W / 2, H * 0.55, H * 0.82); rg.addColorStop(0, 'rgba(255,80,50,0)'); rg.addColorStop(1, `rgba(255,70,40,${0.42 * s.red})`); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
  // glass sheen
  const sh = ctx.createLinearGradient(0, 0, W, H * 0.5); sh.addColorStop(0, 'rgba(255,255,255,0.07)'); sh.addColorStop(0.45, 'rgba(255,255,255,0.0)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
};

export type PlainState = { step: number; stepK: number; press: number; check: number };
/** The plain ivory checkout: no decoration, two taps, immediate confirmation. */
export const drawPlainCheckout = (ctx: CanvasRenderingContext2D, s: PlainState) => {
  const W = UI_W, H = UI_H, P = 64; const ink = '#15181f', mute = '#6b6f78';
  ctx.fillStyle = '#F6F2E8'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'Orb Studio', P, 128, F(700, 30), ink); text(ctx, 'Checkout', W - P, 128, F(500, 26), mute, 'right');
  ctx.strokeStyle = '#d9d3c6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P, 170); ctx.lineTo(W - P, 170); ctx.stroke();
  const btn = (label: string, y: number, hot: number) => { rr(ctx, P, y, W - 2 * P, 112, 18); ctx.fillStyle = hot > 0 ? `rgb(${Math.round(21 + 60 * hot)},${Math.round(24 + 60 * hot)},${Math.round(31 + 60 * hot)})` : ink; ctx.fill(); text(ctx, label, W / 2, y + 70, F(700, 32), '#F6F2E8', 'center'); };
  const drawStep = (step: number, dy: number, alpha: number) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, dy);
    if (step === 0) {
      ctx.beginPath(); ctx.arc(P + 60, 330, 60, 0, Math.PI * 2); ctx.fillStyle = '#2a2f38'; ctx.fill();
      text(ctx, 'Orb · Studio Edition', P + 150, 318, F(700, 36), ink); text(ctx, 'Matte graphite', P + 150, 362, F(500, 26), mute);
      text(ctx, '€89.00', P, 520, F(800, 72, true), ink); text(ctx, 'Delivery included · arrives Thursday', P, 572, F(500, 27), mute);
      text(ctx, 'Visa ···· 4821 · Linnégatan 4', P, 700, F(500, 27), mute);
      btn('Buy now · €89.00', 790, s.step === 0 ? s.press : 0);
    } else if (step === 1) {
      text(ctx, 'Confirm order', P, 330, F(700, 44, true), ink);
      text(ctx, 'Orb · Studio Edition', P, 430, F(600, 30), ink); text(ctx, '€89.00', W - P, 430, F(700, 30), ink, 'right');
      text(ctx, 'Delivery', P, 490, F(500, 28), mute); text(ctx, 'Included', W - P, 490, F(600, 28), ink, 'right');
      ctx.strokeStyle = '#d9d3c6'; ctx.beginPath(); ctx.moveTo(P, 540); ctx.lineTo(W - P, 540); ctx.stroke();
      text(ctx, 'Total', P, 610, F(700, 32), ink); text(ctx, '€89.00', W - P, 610, F(800, 40), ink, 'right');
      btn('Confirm', 790, s.step === 1 ? s.press : 0);
    } else {
      const k = s.check; const cx = W / 2, cy = 560, r = 118;
      ctx.lineCap = 'round'; ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(k * 1.5)); ctx.stroke();
      const ck = clamp((k - 0.45) / 0.55); if (ck > 0) { ctx.strokeStyle = ink; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(cx - 52, cy + 4); const mx = cx - 10, my = cy + 46; if (ck < 0.4) { const q = ck / 0.4; ctx.lineTo(lerp(cx - 52, mx, q), lerp(cy + 4, my, q)); } else { ctx.lineTo(mx, my); const q = (ck - 0.4) / 0.6; ctx.lineTo(lerp(mx, cx + 66, q), lerp(my, cy - 54, q)); } ctx.stroke(); }
      ctx.save(); ctx.globalAlpha = alpha * clamp(k * 1.2); text(ctx, 'Order confirmed', W / 2, 800, F(800, 52, true), ink, 'center'); text(ctx, 'Arrives Thursday · receipt sent', W / 2, 856, F(500, 27), mute, 'center'); ctx.restore();
    }
    ctx.restore();
  };
  if (s.stepK < 1 && s.step > 0) { const k = easeOutExpo(s.stepK); drawStep(s.step - 1, -H * 0.25 * k, 1 - k); drawStep(s.step, H * 0.3 * (1 - k), k); } else drawStep(s.step, 0, 1);
};

/** Glass slab body + rim + emissive screen carrying a canvas texture. */
export const Slab: React.FC<{ tex: THREE.Texture; variant: 'glass' | 'ivory'; emissive?: number; children?: React.ReactNode }> = ({ tex, variant, emissive = 0.85, children }) => (
  <group>
    {variant === 'glass' ? (
      <>
        <RoundedBox args={[SLAB_W + 0.08, SLAB_H + 0.08, SLAB_D]} radius={0.07} smoothness={5} castShadow receiveShadow>
          <meshPhysicalMaterial color="#0a0d12" roughness={0.1} metalness={0.3} clearcoat={1} clearcoatRoughness={0.05} />
        </RoundedBox>
        <RoundedBox args={[SLAB_W + 0.11, SLAB_H + 0.11, SLAB_D - 0.012]} radius={0.075} smoothness={5} position={[0, 0, -0.008]}>
          <meshStandardMaterial color="#b6bac3" roughness={0.28} metalness={0.95} />
        </RoundedBox>
      </>
    ) : (
      <RoundedBox args={[SLAB_W + 0.08, SLAB_H + 0.08, SLAB_D]} radius={0.05} smoothness={5} castShadow receiveShadow>
        <meshStandardMaterial color="#cfc8ba" roughness={0.7} metalness={0.02} />
      </RoundedBox>
    )}
    <mesh position={[0, 0, SLAB_D / 2 + 0.001]}>
      <planeGeometry args={[SLAB_W, SLAB_H]} />
      <meshStandardMaterial map={tex} color={variant === 'glass' ? '#2a2f38' : '#3a3834'} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={emissive} roughness={variant === 'glass' ? 0.34 : 0.6} metalness={0.05} />
    </mesh>
    {children}
  </group>
);

/** Fingertip disc + expanding ring at a UI point. k 0→1 over the tap. */
export const TapRing: React.FC<{ px: number; py: number; k: number; color?: string }> = ({ px, py, k, color = '#ffd9b0' }) => {
  if (k <= 0 || k >= 1) return null; const [x, y] = uiToLocal(px, py);
  return (
    <group position={[x, y, SLAB_D / 2 + 0.012]}>
      <mesh scale={[1 + 2.4 * k, 1 + 2.4 * k, 1]}><ringGeometry args={[0.07, 0.078, 48]} /><meshBasicMaterial color={color} transparent opacity={0.9 * (1 - k)} toneMapped={false} /></mesh>
      <mesh><circleGeometry args={[0.06 * (1 - 0.5 * k), 32]} /><meshBasicMaterial color="#ffe9d2" transparent opacity={0.4 * (1 - k)} toneMapped={false} /></mesh>
    </group>
  );
};

const CRACK: [number, number][] = [[0.6, 1.16], [0.5, 0.98], [0.42, 0.9], [0.31, 0.64], [0.25, 0.6], [0.13, 0.33], [0.05, 0.28], [-0.04, 0.02], [-0.07, -0.02], [-0.16, -0.26], [-0.2, -0.3], [-0.27, -0.55]];
const BRANCH: [number, number][] = [[0.31, 0.64], [0.14, 0.7], [0.02, 0.86]];
/** Hairline emissive crack across the glass; k 0→1 draws it from the top-right edge down. */
export const Crack: React.FC<{ k: number; glow: number }> = ({ k, glow }) => {
  if (k <= 0) return null;
  const segs = (pts: [number, number][], k0: number, k1: number) => {
    const n = pts.length - 1; const out: React.ReactNode[] = [];
    const kk = clamp((k - k0) / (k1 - k0));
    for (let i = 0; i < n; i++) {
      const si = i / n, ei = (i + 1) / n; if (kk <= si) break; const f = clamp((kk - si) / (ei - si));
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const ex = lerp(x0, x1, f), ey = lerp(y0, y1, f);
      const len = Math.hypot(ex - x0, ey - y0), ang = Math.atan2(ey - y0, ex - x0); const mx = (x0 + ex) / 2, my = (y0 + ey) / 2;
      out.push(
        <group key={`${k0}-${i}`} position={[mx, my, SLAB_D / 2 + 0.004]} rotation={[0, 0, ang]}>
          <mesh><planeGeometry args={[len + 0.004, 0.01]} /><meshBasicMaterial color="#000000" transparent opacity={0.4} /></mesh>
          <mesh position={[0, 0, 0.001]}><planeGeometry args={[len + 0.002, 0.0045]} /><meshBasicMaterial color={new THREE.Color('#ffb48a').multiplyScalar(1.3 + 1.6 * glow)} toneMapped={false} /></mesh>
        </group>);
    }
    return out;
  };
  return <group>{segs(CRACK, 0, 1)}{segs(BRANCH, 0.35, 0.8)}</group>;
};

/** The narrative amber point in 3D: white-hot core (blooms), amber shell, soft amber light. */
export const HotPoint: React.FC<{ position: [number, number, number]; radius?: number; intensity?: number }> = ({ position, radius = 0.045, intensity = 1 }) => (
  <group position={position}>
    <mesh><sphereGeometry args={[radius * 0.55, 20, 20]} /><meshBasicMaterial color={new THREE.Color('#fff3e2').multiplyScalar(2.2 * intensity)} toneMapped={false} /></mesh>
    <mesh><sphereGeometry args={[radius, 24, 24]} /><meshBasicMaterial color={new THREE.Color(PALETTE.amber).multiplyScalar(1.5 * intensity)} transparent opacity={0.6} toneMapped={false} depthWrite={false} /></mesh>
    <pointLight color={PALETTE.amber} intensity={2.2 * intensity} distance={5} decay={1.8} />
  </group>
);
/** deterministic red-amber flicker 0..1 */
export const flicker = (t: number, seed = 0) => clamp(0.35 + 0.65 * noise1(t * 16 + seed) * (0.6 + 0.4 * noise1(t * 41 + seed + 5)));
export { easeOut };
