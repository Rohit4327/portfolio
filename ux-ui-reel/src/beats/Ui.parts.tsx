// Parts for the UI beat (and shared with UX): a per-frame camera state that both the R3F camera and the DOM projector read,
// canvas-drawn textures (type, grid, pixels, labels) and the exploded-phone layer stack rebuilt from the Hook's glass phone.
import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '../lib/theme';
import { noise1, clamp, hash, lerp, fadeIO, ease, easeOut, easeInOut, seg } from '../lib/anim';

export type Cam = { pos: [number, number, number]; look: [number, number, number]; fov: number; roll?: number };
const W = 1080, H = 1920;
/** Projects a world point to reel pixels with exactly the camera CameraRig builds from the same key (incl. its handheld drift). */
export const project = (cam: Cam, p: [number, number, number], t: number, handheld = 0) => {
  const hx = handheld * (noise1(t * 0.7 + 3) - 0.5) * 2, hy = handheld * (noise1(t * 0.9 + 11) - 0.5) * 2;
  const c = new THREE.PerspectiveCamera(cam.fov, W / H, 0.05, 300);
  c.position.set(cam.pos[0] + hx, cam.pos[1] + hy, cam.pos[2]);
  c.lookAt(cam.look[0] + hx * 0.5, cam.look[1] + hy * 0.5, cam.look[2]);
  if (cam.roll) c.rotateZ(cam.roll);
  c.updateMatrixWorld(true); c.updateProjectionMatrix();
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(c);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, depth: v.z, visible: v.z > -1 && v.z < 1 };
};
export const FONT_CANVAS = "'Inter', 'Inter Display', system-ui, sans-serif";
/** A canvas-drawn texture, memoised on `key` (string) so animated states re-draw only when they change. */
export const useCanvasTex = (w: number, h: number, key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) =>
  useMemo(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, w, h); draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, h]);
export const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};

// ------------------------------------------------------------------ the phone and its layers
export const SCREEN_W = 1.38, SCREEN_H = 2.96;             // screen plane size (from the Hook phone)
export const BODY_Z = 0.0615;                              // screen surface z on the body
/** app layout in screen uv (0..1, v down) shared by the component slabs, the type layer and the pixel layer */
export const UI_RECTS = [
  { id: 'hero', u: 0.08, v: 0.17, w: 0.84, h: 0.26, color: '#2a3240', r: 0.03 },
  { id: 'chip', u: 0.12, v: 0.2, w: 0.2, h: 0.035, color: PALETTE.cyan, r: 0.017 },
  { id: 'cardA', u: 0.08, v: 0.47, w: 0.4, h: 0.17, color: '#1f2632', r: 0.03 },
  { id: 'cardB', u: 0.52, v: 0.47, w: 0.4, h: 0.17, color: '#1f2632', r: 0.03 },
  { id: 'cta', u: 0.08, v: 0.835, w: 0.84, h: 0.075, color: PALETTE.amber, r: 0.035 },
  { id: 'tabs', u: 0.0, v: 0.945, w: 1, h: 0.055, color: '#161b24', r: 0 },
];
export const uvToXY = (u: number, v: number): [number, number] => [(u - 0.5) * SCREEN_W, (0.5 - v) * SCREEN_H];

/** The Hook's glass phone body (black glass slab + chrome rim), without the screen content. */
export const PhoneBody: React.FC = () => (
  <group>
    <RoundedBox args={[1.5, 3.1, 0.12]} radius={0.09} smoothness={6} castShadow receiveShadow>
      <meshPhysicalMaterial color="#07090d" roughness={0.12} metalness={0.25} clearcoat={1} clearcoatRoughness={0.06} />
    </RoundedBox>
    <RoundedBox args={[1.54, 3.14, 0.1]} radius={0.1} smoothness={6} position={[0, 0, -0.012]}>
      <meshStandardMaterial color="#b9bcc3" roughness={0.3} metalness={0.95} />
    </RoundedBox>
    <mesh position={[0, 0, BODY_Z]}><planeGeometry args={[SCREEN_W, SCREEN_H]} /><meshStandardMaterial color="#0f131a" roughness={0.35} emissive="#0f131a" emissiveIntensity={0.6} /></mesh>
  </group>
);

/** Pixel layer: a dot-matrix that samples the app layout at low resolution */
export const PixelLayer: React.FC<{ glow: number }> = ({ glow }) => {
  const tex = useCanvasTex(552, 1184, 'pixels', (ctx, w, h) => {
    const cell = 12; const cols = Math.floor(w / cell), rows = Math.floor(h / cell);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
      let col = '#2b3340'; let a = 0.35 + 0.25 * hash(i * 131 + j * 7);
      for (const r of UI_RECTS) if (u >= r.u && u <= r.u + r.w && v >= r.v && v <= r.v + r.h) { col = r.color; a = 0.75 + 0.25 * hash(i + j * 1000); }
      ctx.fillStyle = col; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(i * cell + cell / 2, j * cell + cell / 2, cell * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  });
  return (
    <mesh><planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshStandardMaterial color="#070a0f" roughness={0.5} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.42 + 0.5 * glow} />
    </mesh>
  );
};
/** Grid layer: cyan layout guides (12 columns, margins, baselines) — additive so it reads as light, not paint */
export const GridLayer: React.FC<{ glow: number }> = ({ glow }) => {
  const tex = useCanvasTex(552, 1184, 'grid', (ctx, w, h) => {
    ctx.strokeStyle = '#80C9F8'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5;
    const m = w * 0.08, gutter = 8, cols = 6; const cw = (w - 2 * m - gutter * (cols - 1)) / cols;
    for (let i = 0; i < cols; i++) { const x = m + i * (cw + gutter); ctx.globalAlpha = 0.09; ctx.fillStyle = "#80C9F8"; ctx.fillRect(x, 0, cw, h); ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.moveTo(x + cw, 0); ctx.lineTo(x + cw, h); ctx.stroke(); }
    ctx.globalAlpha = 0.28; for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
    for (const r of UI_RECTS) { ctx.globalAlpha = 0.55; ctx.setLineDash([6, 6]); ctx.strokeRect(r.u * w, r.v * h, r.w * w, r.h * h); ctx.setLineDash([]); }
  });
  return (
    <mesh><planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial map={tex} color={new THREE.Color('#9fd6ff').multiplyScalar(0.55 + 0.6 * glow)} transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};
/** Type layer: the app's words only */
export const TypeLayer: React.FC<{ glow: number }> = ({ glow }) => {
  const tex = useCanvasTex(828, 1776, 'type', (ctx, w, h) => {
    ctx.fillStyle = '#F6F2E8'; ctx.textBaseline = 'top';
    ctx.font = `800 54px ${FONT_CANVAS}`; ctx.fillText('Order summary', w * 0.08, h * 0.085);
    ctx.font = `500 26px ${FONT_CANVAS}`; ctx.globalAlpha = 0.6; ctx.fillText('3 items · ships today', w * 0.08, h * 0.125);
    ctx.globalAlpha = 1; ctx.font = `700 24px ${FONT_CANVAS}`; ctx.fillStyle = '#0D1016'; ctx.fillText('NEW', w * 0.14, h * 0.205);
    ctx.fillStyle = '#F6F2E8'; ctx.font = `700 40px ${FONT_CANVAS}`; ctx.fillText('Studio Lamp', w * 0.12, h * 0.33); ctx.font = `500 28px ${FONT_CANVAS}`; ctx.globalAlpha = 0.7; ctx.fillText('€ 129', w * 0.12, h * 0.365);
    ctx.globalAlpha = 1; ctx.font = `600 30px ${FONT_CANVAS}`; ctx.fillText('Delivery', w * 0.12, h * 0.5); ctx.fillText('Returns', w * 0.56, h * 0.5);
    ctx.globalAlpha = 0.7; ctx.font = `500 26px ${FONT_CANVAS}`; ctx.fillText('Free · Thu', w * 0.12, h * 0.535); ctx.fillText('30 days', w * 0.56, h * 0.535);
    ctx.globalAlpha = 1; ctx.font = `500 32px ${FONT_CANVAS}`; const lines = ['Subtotal', 'Tax', 'Total']; const vals = ['€ 129.00', '€ 24.51', '€ 153.51'];
    lines.forEach((l, i) => { ctx.globalAlpha = i === 2 ? 1 : 0.65; ctx.font = `${i === 2 ? 800 : 500} 32px ${FONT_CANVAS}`; ctx.textAlign = 'left'; ctx.fillText(l, w * 0.08, h * (0.68 + i * 0.045)); ctx.textAlign = 'right'; ctx.fillText(vals[i], w * 0.92, h * (0.68 + i * 0.045)); });
    ctx.textAlign = 'center'; ctx.globalAlpha = 1; ctx.fillStyle = '#1a1208'; ctx.font = `800 38px ${FONT_CANVAS}`; ctx.fillText('Pay now', w * 0.5, h * 0.853);
    ctx.fillStyle = '#F6F2E8'; ctx.globalAlpha = 0.55; ctx.font = `600 20px ${FONT_CANVAS}`; ['Home', 'Search', 'Bag', 'You'].forEach((s, i) => ctx.fillText(s, w * (0.125 + i * 0.25), h * 0.965));
  });
  return (
    <mesh><planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial map={tex} color={new THREE.Color('#ffffff').multiplyScalar(0.78 + 0.5 * glow)} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};
/** Components layer: thin emissive slabs (cards, chip, CTA, tab bar) floating in place */
export const ComponentLayer: React.FC<{ glow: number; cta?: number }> = ({ glow, cta = 0 }) => (
  <group>
    {UI_RECTS.map((r) => {
      const [x, y] = uvToXY(r.u + r.w / 2, r.v + r.h / 2); const w = r.w * SCREEN_W, h = r.h * SCREEN_H;
      const isCta = r.id === 'cta', isChip = r.id === 'chip';
      const ei = (isCta ? 0.34 + 0.22 * cta : isChip ? 0.3 : 0.16) + 0.35 * glow;
      return (
        <RoundedBox key={r.id} args={[w, h, isChip ? 0.012 : 0.022]} radius={Math.min(r.r * SCREEN_W, h / 2 - 0.001)} smoothness={4} position={[x, y, isChip ? 0.02 : 0]} castShadow>
          <meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={ei} roughness={0.35} metalness={0.1} />
        </RoundedBox>
      );
    })}
  </group>
);
/** Glass layer: the cover glass as a clear slab with a bright edge */
export const GlassLayer: React.FC<{ glow: number }> = ({ glow }) => {
  const edge = useCanvasTex(552, 1184, 'glassedge', (ctx, w, h) => { ctx.strokeStyle = '#dff1ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; roundRect(ctx, 4, 4, w - 8, h - 8, 34); ctx.stroke(); ctx.lineWidth = 10; ctx.globalAlpha = 0.18; roundRect(ctx, 8, 8, w - 16, h - 16, 32); ctx.stroke(); });
  return (
    <group>
      <RoundedBox args={[1.46, 3.04, 0.03]} radius={0.06} smoothness={5}>
        <meshPhysicalMaterial color="#cfe6ff" transparent opacity={0.16 + 0.2 * glow} roughness={0.04} metalness={0} clearcoat={1} clearcoatRoughness={0.03} depthWrite={false} side={THREE.DoubleSide} />
      </RoundedBox>
      <mesh position={[0, 0, 0.017]}><planeGeometry args={[1.46, 3.04]} /><meshBasicMaterial map={edge} color={new THREE.Color('#bfe3ff').multiplyScalar(0.55 + 0.7 * glow)} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  );
};
/** touch ring + fingertip disc, as in the Hook (no hands) */
export const TouchRing: React.FC<{ t: number; t0: number; position: [number, number, number]; color?: string; scale?: number }> = ({ t, t0, position, color = '#ffd9b0', scale = 1 }) => {
  const k = ease(t, t0, t0 + 0.55, easeOut); if (!(t >= t0 && t < t0 + 0.6)) return null;
  return (
    <group position={position} scale={[scale, scale, 1]}>
      <mesh scale={[1 + 2.6 * k, 1 + 2.6 * k, 1]}><ringGeometry args={[0.11, 0.122, 64]} /><meshBasicMaterial color={color} transparent opacity={0.9 * (1 - k)} toneMapped={false} /></mesh>
      <mesh><circleGeometry args={[0.09 * (1 - 0.5 * k), 48]} /><meshBasicMaterial color="#ffe9d2" transparent opacity={0.35 * (1 - k)} toneMapped={false} /></mesh>
    </group>
  );
};
/** layer order front→back and their exploded z offsets above the body screen */
export const LAYERS = [
  { id: 'glass', label: 'GLASS', z: 2.0 },
  { id: 'components', label: 'COMPONENTS', z: 1.5 },
  { id: 'type', label: 'TYPE', z: 1.0 },
  { id: 'grid', label: 'GRID', z: 0.55 },
  { id: 'pixels', label: 'PIXELS', z: 0.2 },
] as const;
export type LayerId = (typeof LAYERS)[number]['id'];
/** explode amount per layer: soft in-out with a small stagger so the front layers leave last and land last */
export const layerK = (t: number, tExplode: number, tCollapse: number, i: number, dur = 1.4) => {
  const i2 = LAYERS.length - 1 - i; // back layers move first
  const up = ease(t, tExplode + i2 * 0.07, tExplode + i2 * 0.07 + dur, easeInOut);
  const down = ease(t, tCollapse + i * 0.06, tCollapse + i * 0.06 + dur * 0.9, easeInOut);
  return up * (1 - down);
};
export const layerZ = (i: number, k: number) => BODY_Z + 0.004 * (LAYERS.length - i) + LAYERS[i].z * k;

/** The exploded phone: body + the five layers positioned by their explode amounts. glows: per-layer pulse 0..1. */
export const LayerStack: React.FC<{ ks: number[]; glows: number[]; bob?: number[]; cta?: number }> = ({ ks, glows, bob = [0, 0, 0, 0, 0], cta = 0 }) => (
  <group>
    <PhoneBody />
    {LAYERS.map((L, i) => (
      <group key={L.id} position={[0, bob[i], layerZ(i, ks[i])]}>
        {L.id === 'glass' ? <GlassLayer glow={glows[i]} /> : L.id === 'components' ? <ComponentLayer glow={glows[i]} cta={cta} /> : L.id === 'type' ? <TypeLayer glow={glows[i]} /> : L.id === 'grid' ? <GridLayer glow={glows[i]} /> : <PixelLayer glow={glows[i]} />}
      </group>
    ))}
  </group>
);

// ------------------------------------------------------------------ DOM: a tag anchored to a projected 3D point
export const AnchorTag: React.FC<{ x: number; y: number; text: string; a: number; lead?: number; color?: string; side?: 'left' | 'right' | 'down'; sub?: string }> = ({ x, y, text, a, lead = 70, color = PALETTE.ivory, side = 'right', sub }) => {
  if (a <= 0) return null; const k = easeOut(clamp(a));
  const font = { whiteSpace: 'nowrap' as const, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: 6, color, textShadow: '0 2px 12px rgba(0,0,0,0.8)' };
  const subEl = sub ? <div style={{ fontSize: 20, letterSpacing: 2, fontWeight: 500, color: PALETTE.gray, marginTop: 2 }}>{sub}</div> : null;
  if (side === 'down') return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: Math.min(1, a * 1.5), pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -5, top: -5, width: 10, height: 10, borderRadius: 5, background: PALETTE.amber, boxShadow: '0 0 14px rgba(255,171,91,0.9)' }} />
      <div style={{ position: 'absolute', left: -1, top: 0, width: 2, height: lead * k, background: 'rgba(246,242,232,0.55)' }} />
      <div style={{ position: 'absolute', left: -300, width: 600, top: lead * k + 12, textAlign: 'center', ...font, transform: `translateY(${(1 - k) * 10}px)` }}>{text}{subEl}</div>
    </div>
  );
  const dir = side === 'right' ? 1 : -1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: Math.min(1, a * 1.5), pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -5, top: -5, width: 10, height: 10, borderRadius: 5, background: PALETTE.amber, boxShadow: '0 0 14px rgba(255,171,91,0.9)' }} />
      <div style={{ position: 'absolute', left: dir > 0 ? 0 : -lead * k, top: -1, width: lead * k, height: 2, background: 'rgba(246,242,232,0.55)' }} />
      <div style={{ position: 'absolute', left: dir > 0 ? lead * k + 14 : undefined, right: dir > 0 ? undefined : lead * k + 14, top: -19, ...font, transform: `translateX(${(1 - k) * 12 * dir}px)`, textAlign: dir > 0 ? 'left' : 'right' }}>{text}{subEl}</div>
    </div>
  );
};
export const camLerp = (a: Cam, b: Cam, k: number): Cam => ({ pos: [lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k)], look: [lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k), lerp(a.look[2], b.look[2], k)], fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) });
export { fadeIO, seg };
