/**
 * Placeholder artwork drawn in code: neutral gradients, clean type, generic UI. No logos. When the owner drops
 * a real file into public/media (and it is listed in the manifest), mediaTexture() uses it instead.
 */
import * as THREE from 'three';
import { hasMedia } from '../data/manifest';
import { canvasTexture, FONT, hasDOM, type Draw } from './text';

const PALETTES: [string, string][] = [
  ['#e9e4dc', '#cfc6b8'],
  ['#dfe6e2', '#b9c8c0'],
  ['#e2e5ec', '#bcc5d6'],
  ['#ece7e1', '#d9c9b4'],
  ['#e6e2ea', '#c7bfd2'],
  ['#e4ebe9', '#c0d0cf'],
  ['#efe9df', '#dccfb9'],
];
export const palette = (i: number) => PALETTES[((i % PALETTES.length) + PALETTES.length) % PALETTES.length];

export function gradient(ctx: CanvasRenderingContext2D, w: number, h: number, i: number, angle = 0.6): void {
  const [a, b] = palette(i);
  const g = ctx.createLinearGradient(0, 0, w * angle, h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};
const ink = '#2a2b2d';
const soft = 'rgba(42,43,45,0.55)';
export function type(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, weight = 500, color = ink, align: CanvasTextAlign = 'left', maxW?: number): void {
  ctx.font = `${weight} ${px}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y, maxW);
}
export function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, maxW: number, weight = 400, color = ink, lh = 1.3, align: CanvasTextAlign = 'left'): number {
  ctx.font = `${weight} ${px}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += px * lh;
    } else line = t;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy + px * lh;
}

/** A poster: big title, small line, soft abstract shapes. */
export const posterArt = (title: string, sub: string, i: number): Draw => (ctx, w, h) => {
  gradient(ctx, w, h, i);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = palette(i + 2)[1];
  ctx.beginPath();
  ctx.arc(w * (0.3 + 0.1 * (i % 3)), h * 0.42, w * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(w * 0.66, h * 0.33, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  wrap(ctx, title, w * 0.09, h * 0.74, w * 0.085, w * 0.82, 600, ink, 1.12);
  type(ctx, sub, w * 0.09, h * 0.93, w * 0.032, 400, soft);
};

/** A generic app or kiosk page. */
export const pageArt = (title: string, sub: string, i: number, page = 0, pages = 1): Draw => (ctx, w, h) => {
  ctx.fillStyle = '#fbfaf8';
  ctx.fillRect(0, 0, w, h);
  const pad = w * 0.08;
  type(ctx, title, pad, h * 0.1, w * 0.07, 600);
  type(ctx, sub, pad, h * 0.1 + w * 0.06, w * 0.036, 400, soft);
  ctx.save();
  rr(ctx, pad, h * 0.19, w - pad * 2, h * 0.36, w * 0.035);
  ctx.clip();
  ctx.translate(pad, h * 0.19);
  gradient(ctx, w - pad * 2, h * 0.36, i + page);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc((w - pad * 2) * (0.3 + 0.2 * (page % 3)), h * 0.2, w * 0.2, 0, 7);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  for (let r = 0; r < 3; r++) {
    const y = h * 0.6 + r * h * 0.085;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    rr(ctx, pad, y, w - pad * 2, h * 0.065, w * 0.02);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    rr(ctx, pad * 1.4, y + h * 0.022, (w - pad * 2) * (0.35 + 0.15 * ((r + page) % 3)), h * 0.014, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    rr(ctx, pad * 1.4, y + h * 0.042, (w - pad * 2) * 0.55, h * 0.008, 3);
    ctx.fill();
  }
  if (pages > 1)
    for (let d = 0; d < pages; d++) {
      ctx.fillStyle = d === page ? ink : 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(w / 2 + (d - (pages - 1) / 2) * w * 0.04, h * 0.94, w * 0.009, 0, 7);
      ctx.fill();
    }
};

/** Wide welcome card for the landing display and the corridor loop. t animates slowly. */
export const loopArt = (headline: string, sub: string, t: number, i = 0): Draw => (ctx, w, h) => {
  gradient(ctx, w, h, i, 1.2);
  for (let k = 0; k < 4; k++) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = k % 2 ? '#ffffff' : palette(i + k + 1)[1];
    ctx.beginPath();
    ctx.arc(w * (0.2 + 0.2 * k + 0.05 * Math.sin(t * 0.25 + k * 1.7)), h * (0.5 + 0.25 * Math.cos(t * 0.2 + k)), h * (0.34 + 0.06 * k), 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  type(ctx, headline, w / 2, h * 0.5, h * 0.13, 600, ink, 'center', w * 0.9);
  type(ctx, sub, w / 2, h * 0.5 + h * 0.11, h * 0.045, 400, soft, 'center', w * 0.9);
};

/** Monitor desktop: neutral editor-like blocks. */
export const desktopArt: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#f4f3f0';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e4e2dd';
  ctx.fillRect(0, 0, w * 0.2, h);
  ctx.fillStyle = '#dcdad4';
  ctx.fillRect(0, 0, w, h * 0.06);
  for (let r = 0; r < 14; r++) {
    ctx.fillStyle = r % 4 === 0 ? 'rgba(60,90,140,0.45)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(w * 0.24 + (r % 3) * w * 0.02, h * 0.12 + r * h * 0.055, w * (0.2 + ((r * 37) % 40) / 100), h * 0.018);
    if (r < 9) {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(w * 0.03, h * 0.12 + r * h * 0.06, w * (0.08 + ((r * 13) % 6) / 100), h * 0.016);
    }
  }
};

/** The PRISM graphic: a calm refracting prism, lines only. */
export const prismArt: Draw = (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const cy = h * 0.52;
  const s = h * 0.3;
  ctx.lineWidth = h * 0.006;
  ctx.strokeStyle = 'rgba(40,42,46,0.85)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 1.05, cy + s * 0.8);
  ctx.lineTo(cx - s * 1.05, cy + s * 0.8);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.04, cy + s * 0.25);
  ctx.lineTo(cx - s * 0.45, cy);
  ctx.stroke();
  const bands = ['#b9a48a', '#a8b59a', '#9db0bd', '#a9a3c0', '#c2a9a0'];
  bands.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = h * 0.012;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.45, cy + (i - 2) * h * 0.012);
    ctx.lineTo(w * 0.96, cy - s * 0.25 + i * h * 0.075);
    ctx.stroke();
  });
  type(ctx, 'PRISM', w * 0.05, h * 0.17, h * 0.1, 300, 'rgba(40,42,46,0.9)');
  type(ctx, 'How we see every engagement', w * 0.05, h * 0.25, h * 0.035, 400, 'rgba(40,42,46,0.6)');
};

export const photoArt = (i: number): Draw => (ctx, w, h) => {
  gradient(ctx, w, h, i * 3 + 1, 0.3 + (i % 4) * 0.3);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(w * (0.25 + ((i * 7) % 10) / 20), h * (0.3 + ((i * 3) % 10) / 25), Math.min(w, h) * 0.28, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = palette(i + 3)[1];
  ctx.fillRect(0, h * (0.62 + (i % 3) * 0.06), w, h);
  ctx.globalAlpha = 1;
};

/** Texture from an owner-supplied file when present, otherwise the placeholder drawing. */
export function mediaTexture(path: string | undefined, w: number, h: number, placeholder: Draw): THREE.Texture {
  if (hasDOM && hasMedia(path) && /\.(jpe?g|png|webp)$/i.test(path)) {
    const t = new THREE.TextureLoader().load(`./${path}`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  return canvasTexture(w, h, placeholder);
}

/** Draw into a sub-rectangle of an atlas canvas (u0,v0 top-left in 0..1). */
export const atlasCell = (draw: Draw, u0: number, v0: number, uw: number, vh: number): Draw => (ctx, w, h) => {
  ctx.save();
  ctx.translate(u0 * w, v0 * h);
  ctx.beginPath();
  ctx.rect(0, 0, uw * w, vh * h);
  ctx.clip();
  draw(ctx, uw * w, vh * h);
  ctx.restore();
};
/** Point a PlaneGeometry's UVs at an atlas cell. */
export function setPlaneUV(geo: THREE.BufferGeometry, u0: number, v0: number, uw: number, vh: number): void {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * uw, 1 - v0 - vh + uv.getY(i) * vh);
  uv.needsUpdate = true;
}
