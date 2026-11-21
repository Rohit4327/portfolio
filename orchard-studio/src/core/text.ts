/** Canvas-drawn textures for signage, placards and placeholder artwork. Under Node (tests) these return blanks. */
import * as THREE from 'three';

export const hasDOM = typeof document !== 'undefined';
export const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvasTexture(w: number, h: number, draw: Draw, o: { srgb?: boolean; mip?: boolean } = {}): THREE.Texture {
  if (!hasDOM) {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    t.needsUpdate = true;
    return t;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = o.mip !== false;
  t.minFilter = o.mip !== false ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  return t;
}

/** Redraw an existing canvas texture. */
export function redraw(t: THREE.Texture, draw: Draw): void {
  const c = t.image as HTMLCanvasElement | undefined;
  if (!hasDOM || !c || !('getContext' in c)) return;
  draw(c.getContext('2d')!, c.width, c.height);
  t.needsUpdate = true;
}

export interface LabelOptions {
  /** Plane size in metres. */
  w: number;
  h: number;
  color?: string;
  bg?: string | null;
  weight?: number;
  /** Font size as a fraction of the plane height. */
  size?: number;
  align?: 'left' | 'center' | 'right';
  sub?: string;
  /** Pixels per metre of the backing canvas. */
  ppm?: number;
  letterSpacing?: number;
}

/** A small text plane (door plates, placards, numerals). Transparent background unless bg is given. */
export function textPlane(text: string, o: LabelOptions): THREE.Mesh {
  const ppm = o.ppm ?? 1400;
  const cw = Math.min(2048, Math.max(32, Math.round(o.w * ppm)));
  const chh = Math.min(2048, Math.max(32, Math.round(o.h * ppm)));
  const tex = canvasTexture(cw, chh, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    if (o.bg) {
      ctx.fillStyle = o.bg;
      ctx.fillRect(0, 0, w, h);
    }
    const size = (o.size ?? 0.5) * h;
    ctx.fillStyle = o.color ?? '#3a3b3d';
    ctx.textBaseline = 'middle';
    ctx.textAlign = o.align ?? 'center';
    ctx.font = `${o.weight ?? 500} ${size}px ${FONT}`;
    if (o.letterSpacing && 'letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${o.letterSpacing * size}px`;
    const x = o.align === 'left' ? h * 0.25 : o.align === 'right' ? w - h * 0.25 : w / 2;
    const lines = text.split('\n');
    const lh = size * 1.25;
    const total = lines.length * lh + (o.sub ? size * 0.75 : 0);
    lines.forEach((ln, i) => ctx.fillText(ln, x, h / 2 - total / 2 + lh * (i + 0.5), w * 0.94));
    if (o.sub) {
      ctx.font = `400 ${size * 0.5}px ${FONT}`;
      ctx.globalAlpha = 0.7;
      ctx.fillText(o.sub, x, h / 2 + total / 2 - size * 0.3, w * 0.94);
    }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: !o.bg, alphaTest: o.bg ? 0 : 0.03, roughness: 0.85, depthWrite: !!o.bg });
  mat.name = 'text';
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), mat);
  mesh.userData.noMerge = true;
  mesh.userData.text = text;
  mesh.renderOrder = 3;
  return mesh;
}
