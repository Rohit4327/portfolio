/**
 * Exhibit fixtures: kiosks, the landing LED wall, slat panels and clouds, museum plinths, the crescent sofa,
 * rugs and the collaboration board. Every builder returns a group in local metres, Y up, origin on the floor
 * at the footprint centre (unless stated), front facing +Z. Materials come from the shared library only.
 */
import * as THREE from 'three';
import { box, group, plane } from '../core/build';
import { M } from '../core/materials';
import { textPlane } from '../core/text';
import { FT, type ArcDef } from '../data/geometry';

const IN = 0.0254;
const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------------------------------------
// Low-poly geometry helpers (shared with museum.ts)
// ---------------------------------------------------------------------------------------------------------

type V3 = readonly [number, number, number];
interface Vtx {
  p: V3;
  n: V3;
  uv: readonly [number, number];
}

/** Accumulates triangles; winding is fixed up from the supplied normals so callers never think about it. */
class TriBuf {
  private readonly pos: number[] = [];
  private readonly nor: number[] = [];
  private readonly uv: number[] = [];

  tri(a: Vtx, b: Vtx, c: Vtx): void {
    const ux = b.p[0] - a.p[0];
    const uy = b.p[1] - a.p[1];
    const uz = b.p[2] - a.p[2];
    const vx = c.p[0] - a.p[0];
    const vy = c.p[1] - a.p[1];
    const vz = c.p[2] - a.p[2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    if (fx * fx + fy * fy + fz * fz < 1e-18) return; // degenerate (sharp profile corners)
    const d = fx * (a.n[0] + b.n[0] + c.n[0]) + fy * (a.n[1] + b.n[1] + c.n[1]) + fz * (a.n[2] + b.n[2] + c.n[2]);
    for (const v of d >= 0 ? [a, b, c] : [a, c, b]) {
      this.pos.push(v.p[0], v.p[1], v.p[2]);
      this.nor.push(v.n[0], v.n[1], v.n[2]);
      this.uv.push(v.uv[0], v.uv[1]);
    }
  }
  quad(a: Vtx, b: Vtx, c: Vtx, d: Vtx): void {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

/** A point of a convex 2D outline with its outward normal. */
export interface ProfilePt {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

/** Rounded rectangle outline centred on (cx, cy). r = 0 gives sharp corners (two normals per corner). */
export function roundedRectProfile(w: number, h: number, r: number, seg = 2, cx = 0, cy = 0): ProfilePt[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const n = rr > 0 ? Math.max(1, seg) : 1;
  const out: ProfilePt[] = [];
  const corners: readonly (readonly [number, number])[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  corners.forEach(([sx, sy], q) => {
    for (let k = 0; k <= n; k++) {
      const a = (q + k / n) * (Math.PI / 2);
      const c = Math.cos(a);
      const s = Math.sin(a);
      out.push({ x: cx + sx * (w / 2 - rr) + rr * c, y: cy + sy * (h / 2 - rr) + rr * s, nx: c, ny: s });
    }
  });
  return out;
}

export function circleProfile(radius: number, seg: number): ProfilePt[] {
  const out: ProfilePt[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    out.push({ x: radius * Math.cos(a), y: radius * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
  }
  return out;
}

const cumulative = (p: readonly ProfilePt[]): number[] => {
  const len = [0];
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    len.push(len[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return len;
};

/**
 * Upright prism: the outline lives in the XZ plane (profile x -> X, profile y -> Z) and is extruded from y0 to y1.
 * UVs in metres: sides (perimeter, height), caps (x, z).
 */
export function prismGeo(profile: readonly ProfilePt[], y0: number, y1: number, bottomCap = true): THREE.BufferGeometry {
  const t = new TriBuf();
  const len = cumulative(profile);
  const n = profile.length;
  for (let i = 0; i < n; i++) {
    const a = profile[i];
    const b = profile[(i + 1) % n];
    t.quad(
      { p: [a.x, y0, a.y], n: [a.nx, 0, a.ny], uv: [len[i], y0] },
      { p: [b.x, y0, b.y], n: [b.nx, 0, b.ny], uv: [len[i + 1], y0] },
      { p: [b.x, y1, b.y], n: [b.nx, 0, b.ny], uv: [len[i + 1], y1] },
      { p: [a.x, y1, a.y], n: [a.nx, 0, a.ny], uv: [len[i], y1] },
    );
  }
  const cap = (y: number, ny: number) => {
    const v = (q: ProfilePt): Vtx => ({ p: [q.x, y, q.y], n: [0, ny, 0], uv: [q.x, q.y] });
    for (let i = 1; i < n - 1; i++) t.tri(v(profile[0]), v(profile[i]), v(profile[i + 1]));
  };
  cap(y1, 1);
  if (bottomCap) cap(y0, -1);
  return t.build();
}

/**
 * Sweep a convex (radius, height) cross-section around the vertical axis through the origin.
 * Angles are PLAN degrees, counter-clockwise from east: a point at angle a, radius r sits at (r cos a, y, -r sin a).
 */
export function sweepArcGeo(profile: readonly ProfilePt[], a0Deg: number, a1Deg: number, facets: number, caps = true): THREE.BufferGeometry {
  const t = new TriBuf();
  const len = cumulative(profile);
  const n = profile.length;
  const rRef = profile.reduce((s, q) => s + q.x, 0) / n;
  const at = (q: ProfilePt, aDeg: number, v: number): Vtx => {
    const a = aDeg * DEG;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { p: [q.x * c, q.y, -q.x * s], n: [q.nx * c, q.ny, -q.nx * s], uv: [a * rRef, v] };
  };
  const f = Math.max(1, Math.round(facets));
  for (let k = 0; k < f; k++) {
    const aA = a0Deg + ((a1Deg - a0Deg) * k) / f;
    const aB = a0Deg + ((a1Deg - a0Deg) * (k + 1)) / f;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      t.quad(at(profile[i], aA, len[i]), at(profile[j], aA, len[i + 1]), at(profile[j], aB, len[i + 1]), at(profile[i], aB, len[i]));
    }
  }
  if (caps) {
    const cap = (aDeg: number, sign: number) => {
      const a = aDeg * DEG;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nrm: V3 = [sign * s, 0, sign * c];
      const v = (q: ProfilePt): Vtx => ({ p: [q.x * c, q.y, -q.x * s], n: nrm, uv: [q.x, q.y] });
      for (let i = 1; i < n - 1; i++) t.tri(v(profile[0]), v(profile[i]), v(profile[i + 1]));
    };
    cap(a0Deg, 1);
    cap(a1Deg, -1);
  }
  return t.build();
}

/** Box with softly rounded VERTICAL edges, centred at (x, y, z). About 44 triangles at seg 2. */
export function rprism(mat: THREE.Material, w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0, seg = 2): THREE.Mesh {
  const m = new THREE.Mesh(prismGeo(roundedRectProfile(w, d, r, seg), -h / 2, h / 2), mat);
  m.position.set(x, y, z);
  return m;
}

/** A slab whose rounded outline faces +Z (w along X, h along Y, thickness t along Z), centred at (x, y, z). */
export function rslabZ(mat: THREE.Material, w: number, h: number, t: number, r: number, x = 0, y = 0, z = 0, seg = 2): THREE.Mesh {
  const g = prismGeo(roundedRectProfile(w, h, r, seg), -t / 2, t / 2);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

/** A lit screen plane that keeps its own material (not merged). */
function screenPlane(name: string, mat: THREE.Material, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = plane(mat, w, h, x, y, z);
  m.name = name;
  m.userData.noMerge = true;
  return m;
}

// ---------------------------------------------------------------------------------------------------------
// 1. Kiosk
// ---------------------------------------------------------------------------------------------------------

/** Slim brushed-aluminium totem with a 65-inch portrait touch screen on +Z and a numeral on the back. */
export function buildKiosk(numeral: string, topic: string, screenMat: THREE.Material): THREE.Group {
  const W = 3.0 * FT;
  const D = 1.5 * FT;
  const H = 1.89;
  const BASE = 3 * IN;
  const INSET = 0.01;
  const g = group(`kiosk:${numeral}`);

  g.add(box(M.stone, W, BASE, D, 0, BASE / 2, 0));
  const bw = W - INSET * 2;
  const bd = D - INSET * 2;
  const bh = H - BASE;
  g.add(rprism(M.aluminium, bw, bh, bd, 0.02, 0, BASE + bh / 2, 0, 3));

  // Front: black glass slab with the lit portrait screen
  const SW = 0.81;
  const SH = 1.43;
  const SY = 1.05;
  const glassT = 0.008;
  const front = bd / 2;
  g.add(box(M.blackGlass, SW + 0.02, SH + 0.02, glassT, 0, SY, front + glassT / 2));
  g.add(screenPlane('kioskScreen', screenMat, SW, SH, 0, SY, front + glassT + 0.0005));

  // Back: matte panel, numeral and topic
  const panelT = 0.004;
  const panelH = 1.62;
  const panelY = BASE + bh / 2;
  g.add(box(M.aluminiumMatte, bw - 0.06, panelH, panelT, 0, panelY, -front - panelT / 2));
  const tz = -front - panelT - 0.001;
  const num = textPlane(numeral, { w: 0.74, h: 0.5, size: 0.84, weight: 200, color: '#5b5d60' });
  num.position.set(0, 1.32, tz);
  num.rotation.y = Math.PI;
  const top = textPlane(topic, { w: 0.78, h: 0.1, size: 0.5, weight: 500, color: '#5b5d60' });
  top.position.set(0, 0.98, tz);
  top.rotation.y = Math.PI;
  g.add(num, top);
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// 2. Landing display
// ---------------------------------------------------------------------------------------------------------

/** Fine-pitch LED wall. Origin at the bottom centre, back on z = 0, facing +Z. */
export function buildLandingDisplay(widthFt: number, heightFt: number, screenMat: THREE.Material): THREE.Group {
  const w = widthFt * FT;
  const h = heightFt * FT;
  const depth = 0.05;
  const bezel = 0.004;
  const g = group('landingDisplay');
  g.add(box(M.bezel, w, h, depth, 0, h / 2, depth / 2));
  g.add(screenPlane('landingScreen', screenMat, w - bezel * 2, h - bezel * 2, 0, h / 2, depth + 0.0005));
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// 3. Slat wall panel
// ---------------------------------------------------------------------------------------------------------

/** White-oak slat wall panel on felt. Origin bottom centre, back on z = 0. `cutout` is in feet from the front-view bottom-left. */
export function buildSlatPanel(widthFt: number, heightFt: number, cutout: { x0: number; x1: number; y0: number; y1: number } | null): THREE.Group {
  const W = widthFt * FT;
  const H = heightFt * FT;
  const feltT = 0.01;
  const slatW = 2 * IN;
  const slatD = 1 * IN;
  const gap = 1 * IN;
  const g = group('slatPanel');

  // Opening in local metres (x from -W/2, y from 0), clamped to the panel
  const cut = cutout
    ? {
        x0: Math.max(0, Math.min(cutout.x0, cutout.x1) * FT),
        x1: Math.min(W, Math.max(cutout.x0, cutout.x1) * FT),
        y0: Math.max(0, Math.min(cutout.y0, cutout.y1) * FT),
        y1: Math.min(H, Math.max(cutout.y0, cutout.y1) * FT),
      }
    : null;
  const open = cut !== null && cut.x1 > cut.x0 && cut.y1 > cut.y0 ? cut : null;

  /** A box from panel-space extents (x from the left edge, y from the floor). */
  const part = (mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return;
    g.add(box(mat, x1 - x0, y1 - y0, z1 - z0, -W / 2 + (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  };

  if (!open) part(M.felt, 0, W, 0, H, 0, feltT);
  else {
    part(M.felt, 0, open.x0, 0, H, 0, feltT);
    part(M.felt, open.x1, W, 0, H, 0, feltT);
    part(M.felt, open.x0, open.x1, 0, open.y0, 0, feltT);
    part(M.felt, open.x0, open.x1, open.y1, H, 0, feltT);
  }

  const pitch = slatW + gap;
  const count = Math.max(1, Math.floor((W + gap) / pitch + 1e-6));
  const margin = (W - (count * pitch - gap)) / 2;
  for (let i = 0; i < count; i++) {
    const x0 = margin + i * pitch;
    const x1 = x0 + slatW;
    if (open && x1 > open.x0 + 1e-4 && x0 < open.x1 - 1e-4) {
      part(M.oak, x0, x1, 0, open.y0, feltT, feltT + slatD);
      part(M.oak, x0, x1, open.y1, H, feltT, feltT + slatD);
    } else part(M.oak, x0, x1, 0, H, feltT, feltT + slatD);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// 4. Museum plinth
// ---------------------------------------------------------------------------------------------------------

/** White mineral plinth with a glass vitrine, an oak placard and a 'deviceAnchor' on top. */
export function buildPlinth(placard: { year: string; title: string; line: string }, newest: boolean): THREE.Group {
  const S = 1.6 * FT;
  const H = 3.5 * FT;
  const REVEAL = 0.04;
  const g = group(`plinth:${placard.year}`);

  g.add(box(M.oak, S - 0.016, REVEAL, S - 0.016, 0, REVEAL / 2, 0));
  g.add(rprism(M.whiteMineral, S, H - REVEAL, S, 0.006, 0, REVEAL + (H - REVEAL) / 2, 0));

  // Vitrine: four panes and a lid
  const VH = 1.4 * FT;
  const T = 0.006;
  const vs = S - 0.03;
  const sideH = VH - T;
  const sy = H + sideH / 2;
  g.add(box(M.vitrine, vs, sideH, T, 0, sy, vs / 2 - T / 2));
  g.add(box(M.vitrine, vs, sideH, T, 0, sy, -vs / 2 + T / 2));
  g.add(box(M.vitrine, T, sideH, vs - T * 2, vs / 2 - T / 2, sy, 0));
  g.add(box(M.vitrine, T, sideH, vs - T * 2, -vs / 2 + T / 2, sy, 0));
  g.add(box(M.vitrine, vs, T, vs, 0, H + VH - T / 2, 0));

  // Soft light under the device
  g.add(box(newest ? M.vitrineGlowBright : M.vitrineGlow, 0.32, 0.002, 0.32, 0, H + 0.001, 0));
  const anchor = new THREE.Object3D();
  anchor.name = 'deviceAnchor';
  anchor.position.set(0, H + 0.004, 0);
  g.add(anchor);

  // Placard
  const PW = 0.3;
  const PH = 0.11;
  const PT = 0.006;
  const PY = 0.86;
  g.add(box(M.oak, PW, PH, PT, 0, PY, S / 2 + PT / 2));
  const tz = S / 2 + PT + 0.001;
  const year = textPlane(placard.year, { w: PW - 0.02, h: 0.024, size: 0.62, weight: 500, color: '#55504a' });
  year.position.set(0, PY + 0.034, tz);
  const title = textPlane(placard.title, { w: PW - 0.02, h: 0.036, size: 0.62, weight: 600, color: '#2f2c28' });
  title.position.set(0, PY + 0.003, tz);
  const line = textPlane(placard.line, { w: PW - 0.02, h: 0.024, size: 0.56, weight: 400, color: '#55504a' });
  line.position.set(0, PY - 0.032, tz);
  g.add(year, title, line);
  if (newest) {
    const tagMesh = textPlane('Newest', { w: 0.14, h: 0.03, size: 0.6, weight: 600, color: '#6e7074', letterSpacing: 0.08 });
    tagMesh.position.set(0, PY + PH / 2 + 0.026, S / 2 + 0.001);
    g.add(tagMesh);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// 5. Crescent sofa
// ---------------------------------------------------------------------------------------------------------

/** Curved sofa along an annular arc; the group origin is the arc centre on the floor, seats face the centre. */
export function buildCrescentSofa(arc: ArcDef, seatHeightFt: number, backHeightFt: number): THREE.Group {
  const rO = Math.max(arc.outerR, arc.innerR) * FT;
  const rI = Math.min(arc.outerR, arc.innerR) * FT;
  const a0 = Math.min(arc.startDeg, arc.endDeg);
  const a1 = Math.max(arc.startDeg, arc.endDeg);
  const span = a1 - a0;
  const rMid = (rO + rI) / 2;
  const BASE = 3 * IN;
  const seatH = Math.max(seatHeightFt * FT, BASE + 0.1);
  const backH = Math.max(backHeightFt * FT, seatH + 0.1);
  const BACK_T = Math.min(0.2, (rO - rI) * 0.4);
  const MAX_FACET = 6;
  const g = group('crescentSofa');

  // Oak plinth base, inset 40 mm all round
  const inset = 0.04;
  const insetDeg = inset / rMid / DEG;
  const baseProfile = roundedRectProfile(rO - rI - inset * 2, BASE, 0, 1, rMid, BASE / 2);
  g.add(new THREE.Mesh(sweepArcGeo(baseProfile, a0 + insetDeg, a1 - insetDeg, Math.ceil(span / MAX_FACET)), M.oak));

  // Cushion segments of roughly 2 ft at mid radius, 12 mm apart
  const arcLenFt = (span * DEG * rMid) / FT;
  const n = Math.max(1, Math.round(arcLenFt / 2));
  const gapDeg = 0.012 / rMid / DEG;
  const seatR0 = rI;
  const seatR1 = rO - BACK_T - 0.006;
  const seatProfile = roundedRectProfile(seatR1 - seatR0, seatH - BASE, 0.03, 2, (seatR0 + seatR1) / 2, (seatH + BASE) / 2);
  const backProfile = roundedRectProfile(BACK_T, backH - BASE, 0.04, 2, rO - BACK_T / 2, (backH + BASE) / 2);
  for (let k = 0; k < n; k++) {
    const s = a0 + (span * k) / n + (k > 0 ? gapDeg / 2 : 0);
    const e = a0 + (span * (k + 1)) / n - (k < n - 1 ? gapDeg / 2 : 0);
    const facets = Math.ceil((e - s) / MAX_FACET - 1e-6);
    g.add(new THREE.Mesh(sweepArcGeo(seatProfile, s, e, facets), M.fabricGrey));
    g.add(new THREE.Mesh(sweepArcGeo(backProfile, s, e, facets), M.fabricGrey));
  }
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// 6. Rugs
// ---------------------------------------------------------------------------------------------------------

const RUG_T = 0.012;

/** Round wool rug, 12 mm thick. Top-face UVs are in metres (u = x, v = z). */
export function buildRoundRug(diameterFt: number, mat: THREE.Material = M.rug): THREE.Group {
  const g = group('roundRug');
  g.add(new THREE.Mesh(prismGeo(circleProfile((diameterFt * FT) / 2, 48), 0, RUG_T, false), mat));
  return g;
}

/** Rectangular rug (X by Z), 12 mm thick, softly rounded corners. */
export function buildRectRug(widthFt: number, depthFt: number, mat: THREE.Material = M.rugLight): THREE.Group {
  const g = group('rectRug');
  g.add(new THREE.Mesh(prismGeo(roundedRectProfile(widthFt * FT, depthFt * FT, 0.03, 3), 0, RUG_T, false), mat));
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// 7. Slat ceiling cloud
// ---------------------------------------------------------------------------------------------------------

/** White-oak slat ceiling cloud. Origin at the centre of the underside; everything is at y >= 0. */
export function buildSlatCloud(widthFt: number, depthFt: number): THREE.Group {
  const W = widthFt * FT;
  const D = depthFt * FT;
  const slatW = 2 * IN;
  const slatH = 3 * IN;
  const gap = 1 * IN;
  const feltT = 0.02;
  const frame = 0.03;
  const g = group('slatCloud');

  g.add(box(M.felt, W, feltT, D, 0, slatH + feltT / 2, 0));
  // Perimeter frame, the height of the slats
  g.add(box(M.white, W, slatH, frame, 0, slatH / 2, D / 2 - frame / 2));
  g.add(box(M.white, W, slatH, frame, 0, slatH / 2, -D / 2 + frame / 2));
  g.add(box(M.white, frame, slatH, D - frame * 2, W / 2 - frame / 2, slatH / 2, 0));
  g.add(box(M.white, frame, slatH, D - frame * 2, -W / 2 + frame / 2, slatH / 2, 0));

  const innerD = D - frame * 2;
  const len = W - frame * 2;
  const pitch = slatW + gap;
  const count = Math.max(0, Math.floor((innerD - gap) / pitch + 1e-6));
  const first = -(count * pitch - gap) / 2 + slatW / 2;
  for (let i = 0; i < count; i++) g.add(box(M.oak, len, slatH, slatW, 0, slatH / 2, first + i * pitch));
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// 8. Collaboration board
// ---------------------------------------------------------------------------------------------------------

/** 86-inch collaboration display on a white castor stand with a slim oak shelf. */
export function buildCollabBoard(screenMat: THREE.Material): THREE.Group {
  const SW = 1.92;
  const SH = 1.1;
  const SY = 1.35;
  const SD = 0.05;
  const BEZEL = 0.01;
  const g = group('collabBoard');

  g.add(box(M.bezel, SW, SH, SD, 0, SY, 0));
  g.add(screenPlane('boardScreen', screenMat, SW - BEZEL * 2, SH - BEZEL * 2, 0, SY, SD / 2 + 0.0005));

  // Stand: two slim columns behind the screen, a base bar and two feet on castors
  const footY = 0.085;
  const footH = 0.04;
  const colX = 0.55;
  const colD = 0.04;
  const colZ = -SD / 2 - colD / 2;
  const colTop = SY + 0.3;
  const colBottom = footY - footH / 2;
  for (const sx of [-1, 1]) {
    g.add(box(M.white, 0.07, colTop - colBottom, colD, sx * colX, (colTop + colBottom) / 2, colZ));
    g.add(box(M.white, 0.07, footH, 0.3, sx * 0.965, footY, 0));
    for (const sz of [-1, 1]) {
      const castor = new THREE.Mesh(new THREE.CylinderGeometry(0.0325, 0.0325, 0.026, 8), M.rubber);
      castor.rotation.z = Math.PI / 2;
      castor.position.set(sx * 0.965, 0.0325, sz * 0.115);
      g.add(castor);
    }
  }
  g.add(box(M.white, 2.0, footH, 0.07, 0, footY, colZ));

  // Oak shelf below the screen
  g.add(box(M.oak, 1.2, 0.02, 0.18, 0, 0.75, 0.06));
  return g;
}
