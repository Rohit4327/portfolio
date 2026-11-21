/**
 * Procedural PBR textures, generated in code as DataTextures so the build runs offline, has no licensing
 * footprint and also works under Node for the geometry tests. If the owner runs `npm run assets:fetch`,
 * the CC0 Poly Haven maps listed in public/available.json replace these at load (see core/materials.ts).
 */
import * as THREE from 'three';

function hash(x: number, y: number, s: number): number {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + s * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Tileable value noise: period (px, py) lattice cells. */
function vnoise(x: number, y: number, px: number, py: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const w = (i: number, p: number) => ((i % p) + p) % p;
  const a = hash(w(xi, px), w(yi, py), seed);
  const b = hash(w(xi + 1, px), w(yi, py), seed);
  const c = hash(w(xi, px), w(yi + 1, py), seed);
  const d = hash(w(xi + 1, px), w(yi + 1, py), seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(u: number, v: number, fx: number, fy: number, oct: number, seed: number): number {
  let s = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    s += amp * vnoise(u * fx, v * fy, fx, fy, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    fx *= 2;
    fy *= 2;
  }
  return s / norm;
}

type Px = (u: number, v: number, x: number, y: number) => [number, number, number, number?];
function make(size: number, fn: Px, srgb: boolean, repeatM: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = fn(x / size, y / size, x, y);
      const i = (y * size + x) * 4;
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = a === undefined ? 255 : Math.max(0, Math.min(255, a));
    }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  // UVs across the project are in metres, so repeat = 1 / (metres covered by one tile).
  t.repeat.set(1 / repeatM, 1 / repeatM);
  t.needsUpdate = true;
  return t;
}

/** Height field → tangent-space normal map. */
function normalFrom(size: number, h: (u: number, v: number) => number, strength: number, repeatM: number): THREE.DataTexture {
  const e = 1 / size;
  return make(
    size,
    (u, v) => {
      const dx = (h(u + e, v) - h(u - e, v)) * strength;
      const dy = (h(u, v + e) - h(u, v - e)) * strength;
      const l = Math.hypot(dx, dy, 1);
      return [(-dx / l) * 127 + 128, (-dy / l) * 127 + 128, (1 / l) * 127 + 128];
    },
    false,
    repeatM,
  );
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pale white-oak: fine straight grain along U. `planks` adds board seams (floor). */
export function oakTextures(planks: boolean) {
  const size = 1024;
  const tile = planks ? 2.4 : 1.6;
  const grain = (u: number, v: number) => {
    const board = planks ? Math.floor(v * 16) : 0;
    const uo = u + board * 0.37;
    const streak = fbm(uo, v, 3, 96, 4, 11 + board);
    const fine = fbm(uo, v, 8, 512, 2, 31 + board);
    const tone = planks ? hash(board, 0, 5) * 0.10 - 0.05 : 0;
    return { g: streak * 0.7 + fine * 0.3, tone, board };
  };
  const map = make(
    size,
    (u, v) => {
      const { g, tone } = grain(u, v);
      const t = g * 0.26 + tone;
      let r = mix(226, 196, t);
      let gg = mix(205, 170, t);
      let b = mix(170, 130, t);
      if (planks) {
        const seam = Math.abs(((v * 16) % 1) - 0.5) > 0.488 ? 0.86 : 1;
        const bi = Math.floor(v * 16);
        const end = Math.abs((((u + hash(bi, 1, 9)) * 2) % 1) - 0.5) > 0.4985 ? 0.86 : 1;
        r *= seam * end;
        gg *= seam * end;
        b *= seam * end;
      }
      return [r, gg, b];
    },
    true,
    tile,
  );
  const rough = make(
    512,
    (u, v) => {
      const { g } = grain(u, v);
      const x = 115 + g * 40;
      return [x, x, x];
    },
    false,
    tile,
  );
  return { map, roughnessMap: rough };
}

/** Light terrazzo: warm white matrix with small grey and sand chips. One tile covers 1.5 m. */
export function terrazzoTextures() {
  const size = 1024;
  const cells = 72;
  const map = make(
    size,
    (u, v) => {
      const base = 226 + fbm(u, v, 6, 6, 3, 3) * 8;
      let r = base;
      let g = base - 2;
      let b = base - 7;
      const cx = Math.floor(u * cells);
      const cy = Math.floor(v * cells);
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const gx = (((cx + i) % cells) + cells) % cells;
          const gy = (((cy + j) % cells) + cells) % cells;
          if (hash(gx, gy, 71) > 0.62) continue;
          const px = (cx + i + 0.2 + hash(gx, gy, 1) * 0.6) / cells;
          const py = (cy + j + 0.2 + hash(gx, gy, 2) * 0.6) / cells;
          const rad = (0.12 + hash(gx, gy, 3) * 0.3) / cells;
          const ang = hash(gx, gy, 4) * 3.14;
          const dx = u - px;
          const dy = v - py;
          const ex = dx * Math.cos(ang) + dy * Math.sin(ang);
          const ey = (-dx * Math.sin(ang) + dy * Math.cos(ang)) * 1.7;
          if (ex * ex + ey * ey < rad * rad) {
            const k = hash(gx, gy, 5);
            if (k < 0.45) [r, g, b] = [196, 196, 194];
            else if (k < 0.75) [r, g, b] = [212, 200, 180];
            else if (k < 0.92) [r, g, b] = [168, 168, 170];
            else [r, g, b] = [240, 238, 232];
          }
        }
      return [r, g, b];
    },
    true,
    1.5,
  );
  return { map };
}

/** Warm-grey carpet tiles, 0.6 m, with a fine loop texture. */
export function carpetTextures() {
  const size = 512;
  const h = (u: number, v: number) => fbm(u, v, 128, 128, 2, 9);
  const map = make(
    size,
    (u, v) => {
      const tile = (Math.floor(u * 2) + Math.floor(v * 2)) % 2;
      const n = h(u, v);
      const seam = Math.abs(((u * 2) % 1) - 0.5) > 0.495 || Math.abs(((v * 2) % 1) - 0.5) > 0.495 ? 0.9 : 1;
      const base = (124 + n * 34 + tile * 5) * seam;
      return [base, base - 5, base - 13];
    },
    true,
    1.2,
  );
  const normalMap = normalFrom(size, h, 2.2, 1.2);
  return { map, normalMap };
}

/** Large-format pale porcelain, 1.2 m tiles with a hairline joint. */
export function porcelainTextures() {
  const map = make(
    512,
    (u, v) => {
      const joint = Math.abs(u - 0.5) > 0.4975 || Math.abs(v - 0.5) > 0.4975 ? 0.88 : 1;
      const veil = fbm(u, v, 3, 3, 4, 21) * 7;
      const b = (224 + veil) * joint;
      return [b, b - 1, b - 5];
    },
    true,
    1.2,
  );
  return { map };
}

/** Faint noise normal for frosted glass and satin plastics. */
export function noiseNormal(repeatM = 0.25, strength = 1.2) {
  return normalFrom(256, (u, v) => fbm(u, v, 64, 64, 2, 41), strength, repeatM);
}

/** Boucle / wool: bumpy weave. */
export function fabricTextures(repeatM = 0.35) {
  const h = (u: number, v: number) => fbm(u, v, 48, 48, 3, 55);
  const map = make(
    256,
    (u, v) => {
      const n = 200 + h(u, v) * 55;
      return [n, n, n];
    },
    true,
    repeatM,
  );
  return { map, normalMap: normalFrom(256, h, 3.0, repeatM) };
}

/** Brushed metal: anisotropic streaks along U in roughness. */
export function brushedRoughness() {
  return make(
    256,
    (u, v) => {
      const x = 90 + fbm(u, v, 2, 256, 3, 77) * 70;
      return [x, x, x];
    },
    false,
    0.4,
  );
}

/** A single leaf with alpha, for cutout foliage cards. */
export function leafTexture(tone: 'ficus' | 'olive' | 'mixed') {
  const size = 128;
  const t = make(
    size,
    (u, v) => {
      const x = (u - 0.5) * 2;
      const y = v;
      const half = (tone === 'olive' ? 0.3 : 0.52) * Math.sin(Math.PI * Math.pow(y, 0.8)) * (1 - y * 0.25);
      const inside = Math.abs(x) < half && y > 0.02 && y < 0.98;
      const vein = Math.abs(x) < 0.03 ? 1.18 : 1 + Math.sin((Math.abs(x) * 3 + y * 6) * 6) * 0.03;
      const n = fbm(u, v, 8, 8, 2, 5) * 0.2 + 0.9;
      const base = tone === 'olive' ? [112, 128, 96] : tone === 'mixed' ? [70, 118, 62] : [48, 104, 52];
      return [base[0] * vein * n, base[1] * vein * n, base[2] * vein * n, inside ? 255 : 0];
    },
    true,
    1,
  );
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1, 1);
  return t;
}

/** Curtain-wall facade for the procedural city: glass grid, tileable. Emissive mask in a second texture. */
export function facadeTextures() {
  // 8 x 8 window bays per tile: pale mullion grid over softly varied glass. Low contrast so the city stays calm.
  const map = make(
    256,
    (u, v) => {
      const cu = (u * 8) % 1;
      const cv = (v * 8) % 1;
      const frame = cu < 0.1 || cv < 0.2;
      const k = hash(Math.floor(u * 8), Math.floor(v * 8), 3);
      if (frame) return [206, 205, 201];
      const g = 152 + k * 22;
      return [g * 0.93, g * 0.98, g * 1.04];
    },
    true,
    1,
  );
  const emissiveMap = make(
    256,
    (u, v) => {
      const cu = (u * 8) % 1;
      const cv = (v * 8) % 1;
      const lit = hash(Math.floor(u * 8), Math.floor(v * 8), 9) > 0.8 && cu > 0.12 && cv > 0.24;
      return lit ? [255, 236, 200] : [0, 0, 0];
    },
    true,
    1,
  );
  return { map, emissiveMap };
}
