/**
 * Small procedural fixtures: seating, display rail, devices, signage and wall hardware.
 * Every builder returns a group in local metres, Y up, front toward +Z. Materials come from M only.
 * The geometry helpers at the top (rounded plates, revolved and extruded profiles) are shared with play.ts.
 */
import * as THREE from 'three';
import { box, cyl, group, plane } from '../core/build';
import { M } from '../core/materials';
import { textPlane } from '../core/text';

const FT = 0.3048;
const DEG = Math.PI / 180;

type V3 = readonly [number, number, number];
/** A profile point: [a, b] where b is height (Y) and a is the radius (revolve) or depth along +Z (extrude). */
export type P2 = readonly [number, number];

/** Collects loose triangles with explicit normals and UVs. */
class TriBuf {
  private readonly p: number[] = [];
  private readonly n: number[] = [];
  private readonly t: number[] = [];
  vert(pos: V3, nor: V3, u: number, v: number): void {
    this.p.push(pos[0], pos[1], pos[2]);
    this.n.push(nor[0], nor[1], nor[2]);
    this.t.push(u, v);
  }
  /** A flat triangle; flipped if needed so its normal points along `toward`. */
  flat(a: V3, b: V3, c: V3, toward: V3): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-12) return;
    nx /= l; ny /= l; nz /= l;
    const flip = nx * toward[0] + ny * toward[1] + nz * toward[2] < 0;
    const nor: V3 = flip ? [-nx, -ny, -nz] : [nx, ny, nz];
    const order = flip ? [a, c, b] : [a, b, c];
    for (const q of order) {
      const ax = Math.abs(nor[0]), ay = Math.abs(nor[1]), az = Math.abs(nor[2]);
      if (ay >= ax && ay >= az) this.vert(q, nor, q[0], q[2]);
      else if (ax >= az) this.vert(q, nor, q[2], q[1]);
      else this.vert(q, nor, q[0], q[1]);
    }
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    return g;
  }
}

/** A closed convex solid from loose triangles, each oriented away from `centre`, flat shaded. */
export function hullGeo(tris: readonly (readonly [V3, V3, V3])[], centre: V3): THREE.BufferGeometry {
  const buf = new TriBuf();
  for (const [a, b, c] of tris) {
    const m: V3 = [(a[0] + b[0] + c[0]) / 3 - centre[0], (a[1] + b[1] + c[1]) / 3 - centre[1], (a[2] + b[2] + c[2]) / 3 - centre[2]];
    buf.flat(a, b, c, m);
  }
  return buf.build();
}

/** A tapered block centred on the origin: wTop x dTop at +h/2, wBot x dBot at -h/2. 12 tris. */
export function frustumGeo(wTop: number, dTop: number, wBot: number, dBot: number, h: number): THREE.BufferGeometry {
  const c = (w: number, d: number, y: number): V3[] => [[-w / 2, y, -d / 2], [w / 2, y, -d / 2], [w / 2, y, d / 2], [-w / 2, y, d / 2]];
  const t = c(wTop, dTop, h / 2);
  const b = c(wBot, dBot, -h / 2);
  const tris: [V3, V3, V3][] = [[t[0], t[1], t[2]], [t[0], t[2], t[3]], [b[0], b[1], b[2]], [b[0], b[2], b[3]]];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    tris.push([b[i], b[j], t[j]], [b[i], t[j], t[i]]);
  }
  return hullGeo(tris, [0, 0, 0]);
}

export interface PlateOptions {
  /** Points per corner arc (default 3). */
  seg?: number;
  /** Chamfer on the front edge, metres. */
  bevel?: number;
  front?: boolean;
  back?: boolean;
}

/**
 * A plate with a rounded-rectangle outline in XY, extruded along Z and centred on the origin.
 * Corner arcs are smooth shaded; the optional bevel softens the front edge.
 */
export function roundedPlateGeo(w: number, h: number, d: number, r: number, o: PlateOptions = {}): THREE.BufferGeometry {
  const seg = Math.max(1, o.seg ?? 3);
  const rr = Math.max(1e-4, Math.min(r, w / 2, h / 2));
  const bv = Math.max(0, Math.min(o.bevel ?? 0, rr * 0.9, d / 2));
  const ring: { x: number; y: number; nx: number; ny: number; xi: number; yi: number; u: number }[] = [];
  const corners: P2[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  corners.forEach(([sx, sy], c) => {
    const cx = sx * (w / 2 - rr);
    const cy = sy * (h / 2 - rr);
    for (let i = 0; i <= seg; i++) {
      const a = ((c + i / seg) * Math.PI) / 2;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      ring.push({ x: cx + rr * nx, y: cy + rr * ny, nx, ny, xi: cx + (rr - bv) * nx, yi: cy + (rr - bv) * ny, u: 0 });
    }
  });
  const n = ring.length;
  let run = 0;
  const uEnd: number[] = [];
  for (let i = 0; i < n; i++) {
    ring[i].u = run;
    const q = ring[(i + 1) % n];
    run += Math.hypot(q.x - ring[i].x, q.y - ring[i].y);
    uEnd.push(run);
  }
  const zf = d / 2;
  const zb = -d / 2;
  const zs = zf - bv;
  const buf = new TriBuf();
  const k = Math.SQRT1_2;
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    const u0 = p.u;
    const u1 = uEnd[i];
    const np: V3 = [p.nx, p.ny, 0];
    const nq: V3 = [q.nx, q.ny, 0];
    buf.vert([p.x, p.y, zb], np, u0, zb);
    buf.vert([q.x, q.y, zb], nq, u1, zb);
    buf.vert([q.x, q.y, zs], nq, u1, zs);
    buf.vert([p.x, p.y, zb], np, u0, zb);
    buf.vert([q.x, q.y, zs], nq, u1, zs);
    buf.vert([p.x, p.y, zs], np, u0, zs);
    if (bv > 0) {
      const bp: V3 = [p.nx * k, p.ny * k, k];
      const bq: V3 = [q.nx * k, q.ny * k, k];
      buf.vert([p.x, p.y, zs], bp, u0, zs);
      buf.vert([q.x, q.y, zs], bq, u1, zs);
      buf.vert([q.xi, q.yi, zf], bq, u1, zf);
      buf.vert([p.x, p.y, zs], bp, u0, zs);
      buf.vert([q.xi, q.yi, zf], bq, u1, zf);
      buf.vert([p.xi, p.yi, zf], bp, u0, zf);
    }
  }
  for (let i = 1; i < n - 1; i++) {
    if (o.front !== false) {
      for (const j of [0, i, i + 1]) buf.vert([ring[j].xi, ring[j].yi, zf], [0, 0, 1], ring[j].xi, ring[j].yi);
    }
    if (o.back !== false) {
      for (const j of [0, i + 1, i]) buf.vert([ring[j].x, ring[j].y, zb], [0, 0, -1], ring[j].x, ring[j].y);
    }
  }
  return buf.build();
}

/** A flat rounded rectangle facing +Z, centred on the origin. unitUV maps the bounding box to 0..1 (for screens). */
export function roundedRectGeo(w: number, h: number, r: number, seg = 2, unitUV = false): THREE.BufferGeometry {
  const g = roundedPlateGeo(w, h, 0, r, { seg, back: false });
  // d = 0 collapses the side band; keep only the cap (the last n - 2 triangles).
  const n = 4 * (Math.max(1, seg) + 1);
  const keep = (n - 2) * 3;
  const pos = g.getAttribute('position');
  const start = pos.count - keep;
  const out = new THREE.BufferGeometry();
  const p: number[] = [];
  const nn: number[] = [];
  const uv: number[] = [];
  for (let i = start; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    p.push(x, y, 0);
    nn.push(0, 0, 1);
    if (unitUV) uv.push(x / w + 0.5, y / h + 0.5);
    else uv.push(x, y);
  }
  g.dispose();
  out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

/** A rounded plate mesh whose back sits on z = 0 (wall-mounted parts), centred in X and Y. */
export function plate(mat: THREE.Material, w: number, h: number, d: number, r: number, o: PlateOptions = {}): THREE.Mesh {
  const g = roundedPlateGeo(w, h, d, r, o);
  g.translate(0, 0, d / 2);
  return new THREE.Mesh(g, mat);
}

interface SweepOptions {
  /** Join the last profile point back to the first. */
  closed?: boolean;
  /** Close both ends with the triangulated profile. */
  caps?: boolean;
  /** Length of the sweep in metres, for UVs. */
  uLen?: number;
}

/**
 * Sweep a 2D profile through `sections` steps. Frame convention: with the sweep direction as +X, profile `a`
 * as +Z and `b` as +Y, a profile drawn counter-clockwise (a to the right, b up) gets outward normals.
 * Corners sharper than 60 degrees stay crisp; shallower ones are smooth shaded.
 */
function sweep(profile: readonly P2[], sections: number, at: (a: number, b: number, j: number) => V3, dir: (na: number, nb: number, j: number) => V3, o: SweepOptions): THREE.BufferGeometry {
  const n = profile.length;
  const segs = o.closed ? n : n - 1;
  const sn: (P2 | null)[] = [];
  const vAt: number[] = [0];
  for (let k = 0; k < segs; k++) {
    const p = profile[k];
    const q = profile[(k + 1) % n];
    const da = q[0] - p[0];
    const db = q[1] - p[1];
    const l = Math.hypot(da, db);
    sn.push(l < 1e-9 ? null : [db / l, -da / l]);
    vAt.push(vAt[k] + l);
  }
  const blend = (k: number, other: number): P2 => {
    const s = sn[k] as P2;
    let nb: P2 | null = null;
    if (other >= 0 && other < segs) nb = sn[other];
    else if (o.closed) nb = sn[(other + segs) % segs];
    if (!nb || s[0] * nb[0] + s[1] * nb[1] < 0.5) return s;
    const x = s[0] + nb[0];
    const y = s[1] + nb[1];
    const l = Math.hypot(x, y);
    return [x / l, y / l];
  };
  const same = (p: V3, q: V3) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 < 1e-14;
  const buf = new TriBuf();
  const uLen = o.uLen ?? 1;
  for (let k = 0; k < segs; k++) {
    if (!sn[k]) continue;
    const p = profile[k];
    const q = profile[(k + 1) % n];
    const n0 = blend(k, k - 1);
    const n1 = blend(k, k + 1);
    for (let j = 0; j < sections; j++) {
      const A = at(p[0], p[1], j);
      const B = at(p[0], p[1], j + 1);
      const C = at(q[0], q[1], j + 1);
      const D = at(q[0], q[1], j);
      const nA = dir(n0[0], n0[1], j);
      const nB = dir(n0[0], n0[1], j + 1);
      const nC = dir(n1[0], n1[1], j + 1);
      const nD = dir(n1[0], n1[1], j);
      const u0 = (j / sections) * uLen;
      const u1 = ((j + 1) / sections) * uLen;
      if (!same(A, B)) {
        buf.vert(A, nA, u0, vAt[k]);
        buf.vert(B, nB, u1, vAt[k]);
        buf.vert(C, nC, u1, vAt[k + 1]);
      }
      if (!same(C, D)) {
        buf.vert(A, nA, u0, vAt[k]);
        buf.vert(C, nC, u1, vAt[k + 1]);
        buf.vert(D, nD, u0, vAt[k + 1]);
      }
    }
  }
  if (o.caps) {
    const faces = THREE.ShapeUtils.triangulateShape(profile.map(([a, b]) => new THREE.Vector2(a, b)), []);
    for (const end of [0, sections]) {
      const inner = end === 0 ? 1 : sections - 1;
      const p0 = at(profile[0][0], profile[0][1], end);
      const p1 = at(profile[0][0], profile[0][1], inner);
      const pm = at(profile[n >> 1][0], profile[n >> 1][1], end);
      const pn = at(profile[n >> 1][0], profile[n >> 1][1], inner);
      const out: V3 = [p0[0] - p1[0] + pm[0] - pn[0], p0[1] - p1[1] + pm[1] - pn[1], p0[2] - p1[2] + pm[2] - pn[2]];
      for (const f of faces) buf.flat(at(profile[f[0]][0], profile[f[0]][1], end), at(profile[f[1]][0], profile[f[1]][1], end), at(profile[f[2]][0], profile[f[2]][1], end), out);
    }
  }
  return buf.build();
}

export interface RevolveOptions {
  /** Start angle and sweep in radians, measured from +Z toward +X. Default is a full turn. */
  phi0?: number;
  phiLen?: number;
  closed?: boolean;
  caps?: boolean;
  /** Reshape a point per angle (used to lower the arms of the tub chair). */
  warp?: (phi: number, r: number, y: number) => P2;
}

/**
 * Revolve a [radius, y] profile about the Y axis. Draw the profile counter-clockwise (up the outside,
 * inward across the top, down the inside) for outward normals.
 */
export function revolveGeo(profile: readonly P2[], seg: number, o: RevolveOptions = {}): THREE.BufferGeometry {
  const phi0 = o.phi0 ?? 0;
  const phiLen = o.phiLen ?? Math.PI * 2;
  const rMax = profile.reduce((m, p) => Math.max(m, p[0]), 0);
  const phi = (j: number) => phi0 + (phiLen * j) / seg;
  return sweep(
    profile,
    seg,
    (a, b, j) => {
      const f = phi(j);
      const [r, y] = o.warp ? o.warp(f, a, b) : [a, b];
      return [r * Math.sin(f), y, r * Math.cos(f)];
    },
    (na, nb, j) => {
      const f = phi(j);
      return [na * Math.sin(f), nb, na * Math.cos(f)];
    },
    { closed: o.closed, caps: o.caps, uLen: rMax * phiLen },
  );
}

/** Extrude a [z, y] profile along X from x0 to x1. Counter-clockwise (z right, y up) gives outward normals. */
export function extrudeXGeo(profile: readonly P2[], x0: number, x1: number, o: { closed?: boolean; caps?: boolean } = {}): THREE.BufferGeometry {
  return sweep(profile, 1, (a, b, j) => [j === 0 ? x0 : x1, b, a], (na, nb) => [0, nb, na], { closed: o.closed, caps: o.caps, uLen: x1 - x0 });
}

/** A slim round strut between two points (open ended). */
function strut(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 6): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg, 1, true), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

const mesh = (g: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
};

// ---------------------------------------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------------------------------------

/** Swivel tub lounge chair, 0.762 m diameter, 0.78 m tall, seat at 0.42 m. Open toward +Z. */
export function buildLoungeChair(): THREE.Group {
  const g = group('loungeChair');
  const seatBase = 0.3;
  const half = 125 * DEG;
  // The back is full height behind the sitter and eases down into arms toward the opening.
  const warp = (phi: number, r: number, y: number): P2 => {
    if (y <= seatBase) return [r, y];
    const d = Math.min(1, Math.abs(phi - Math.PI) / half);
    const t = Math.min(1, Math.max(0, (d - 0.3) / 0.7));
    const s = 1 - 0.3 * t * t * (3 - 2 * t);
    return [r, seatBase + (y - seatBase) * s];
  };
  // Pedestal
  g.add(mesh(revolveGeo([[0.28, 0], [0.275, 0.012], [0, 0.012]], 20), M.aluminium));
  g.add(mesh(revolveGeo([[0.03, 0.012], [0.03, 0.2], [0.045, 0.25]], 10), M.aluminium));
  // Oak tub: underside dish, then the shell wrapping 250 degrees around the back.
  g.add(mesh(revolveGeo([[0.02, 0.245], [0.29, 0.255], [0.335, 0.28], [0.335, 0.3], [0.298, 0.3]], 20), M.oak));
  g.add(mesh(revolveGeo([[0.337, 0.3], [0.381, 0.765], [0.371, 0.78], [0.356, 0.78], [0.346, 0.765], [0.305, 0.3]], 22, { phi0: 55 * DEG, phiLen: 250 * DEG, caps: true, warp }), M.oak));
  // Upholstery: seat cushion and the inner back pad.
  g.add(mesh(revolveGeo([[0.3, 0.3], [0.312, 0.385], [0.3, 0.412], [0.27, 0.42], [0, 0.42]], 20), M.fabricGrey));
  g.add(mesh(revolveGeo([[0.343, 0.72], [0.33, 0.745], [0.31, 0.74], [0.272, 0.4], [0.312, 0.4]], 20, { phi0: 58 * DEG, phiLen: 244 * DEG, caps: true, warp }), M.fabricGrey));
  return g;
}

/** Round oak side table, 0.488 m diameter, 0.5 m tall. */
export function buildSideTable(): THREE.Group {
  const g = group('sideTable');
  const r = (1.6 * FT) / 2;
  g.add(mesh(revolveGeo([[0.02, 0.475], [r - 0.005, 0.475], [r, 0.4875], [r - 0.005, 0.5], [0, 0.5]], 24), M.oak));
  g.add(mesh(revolveGeo([[0.016, 0.01], [0.016, 0.475]], 8), M.aluminium));
  g.add(mesh(revolveGeo([[0.16, 0], [0.154, 0.01], [0, 0.01]], 20), M.aluminium));
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// App Galleria rail
// ---------------------------------------------------------------------------------------------------------

const arc = (cz: number, cy: number, r: number, a0: number, a1: number, n: number, skipFirst = false): P2[] => {
  const out: P2[] = [];
  for (let i = skipFirst ? 1 : 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cz + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
};

/** Device lean on the rail: 70 degrees from horizontal. */
const CRADLE_LEAN = 20 * DEG;
/** Where a device's bottom-centre rests, relative to the rail origin. */
const CRADLE_Z = 0.095;
const CRADLE_Y = 0.005;

/** Solid aluminium cradle cross-section in [z, y]: a flat-bottomed block with a tilted slot and back support. */
function cradleProfile(): P2[] {
  const u: P2 = [-Math.sin(CRADLE_LEAN), Math.cos(CRADLE_LEAN)]; // device "up"
  const nn: P2 = [Math.cos(CRADLE_LEAN), Math.sin(CRADLE_LEAN)]; // device screen normal
  const at = (n: number, t: number): P2 => [CRADLE_Z + nn[0] * n + u[0] * t, CRADLE_Y + nn[1] * n + u[1] * t];
  const top = at(-0.0075, 0.07);
  const backFoot: P2 = [top[0] + (u[0] / u[1]) * -top[1], 0];
  return [backFoot, [CRADLE_Z + 0.012, 0], [CRADLE_Z + 0.012, 0.012], at(0.005, 0.012), at(0.005, 0), at(-0.005, 0), at(-0.005, 0.07), top];
}

/**
 * Wall-mounted white-oak display rail. Origin: centre of the rail top at the wall plane; the rail projects to +Z.
 * Each slot has a cradle, an empty `cradle${i}` anchor for a device, and a QR card to its right.
 */
export function buildGalleriaRail(lengthFt: number, slots: number): THREE.Group {
  const g = group('galleriaRail');
  const L = lengthFt * FT;
  const depth = 0.15;
  const thick = 0.045;
  const r = 0.01;
  // Rail: square back against the wall, softly rounded front edge.
  const railProfile: P2[] = [[0, -thick], ...arc(depth - r, -thick + r, r, -Math.PI / 2, 0, 3), ...arc(depth - r, -r, r, 0, Math.PI / 2, 3), [0, 0]];
  g.add(mesh(extrudeXGeo(railProfile, -L / 2, L / 2, { caps: true }), M.oak));
  // Three slim gusset brackets tucked under the rail.
  const gusset: P2[] = [[0, -thick - 0.07], [0.11, -thick], [0, -thick]];
  for (const bx of [-L * 0.38, 0, L * 0.38]) g.add(mesh(extrudeXGeo(gusset, bx - 0.006, bx + 0.006, { closed: true, caps: true }), M.aluminium));

  const n = Math.max(0, Math.floor(slots));
  const spacing = n > 0 ? L / n : 0;
  const lightCells = Math.max(0, Math.min(6, Math.floor(((800 - 70) / Math.max(1, n) - 44) / 2)));
  const profile = cradleProfile();
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + spacing * (i + 0.5);
    g.add(mesh(extrudeXGeo(profile, x - 0.03, x + 0.03, { closed: true, caps: true }), M.aluminium));
    const anchor = new THREE.Object3D();
    anchor.name = `cradle${i}`;
    anchor.position.set(x, CRADLE_Y, CRADLE_Z);
    anchor.rotation.x = -CRADLE_LEAN;
    g.add(anchor);

    // QR card on a small foot, 60 mm to the right of the cradle.
    const card = group(`qrCard${i}`);
    card.position.set(x + 0.06, 0, 0.1);
    card.add(box(M.aluminium, 0.03, 0.004, 0.014, 0, 0.002, 0));
    const face = group('face');
    face.position.y = 0.004;
    face.rotation.x = -12 * DEG;
    face.add(plane(M.paper, 0.045, 0.045, 0, 0.0225, 0));
    face.add(plane(M.bezel, 0.035, 0.035, 0, 0.0225, 0.0004));
    const cell = 0.007;
    for (let k = 0; k < lightCells; k++) {
      const idx = (i * 9 + 4 + k * 7) % 25;
      const cx = (idx % 5) - 2;
      const cy = Math.floor(idx / 5) - 2;
      face.add(plane(M.white, cell * 0.86, cell * 0.86, cx * cell, 0.0225 + cy * cell, 0.0008));
    }
    card.add(face);
    g.add(card);
  }

  // Backlit title strip above the rail.
  g.add(box(M.lightPanel, 0.9, 0.07, 0.008, 0, 0.62, 0.004));
  const title = textPlane('App Galleria', { w: 0.6, h: 0.07, color: '#4a4b4d', weight: 500, size: 0.57 });
  title.position.set(0, 0.62, 0.009);
  g.add(title);
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------------------------------------

/** A slab device centred on the origin (screen toward +Z): aluminium body, black glass front, lit screen. 64 tris. */
function device(w: number, h: number, d: number, r: number, bezel: number, screenMat: THREE.Material, screenName: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(roundedPlateGeo(w, h, d, r, { seg: 2 }), M.aluminium));
  const rim = 0.0015;
  g.add(mesh(roundedRectGeo(w - rim * 2, h - rim * 2, r - rim, 2), M.blackGlass, 0, 0, d / 2 + 0.0005));
  const screen = mesh(roundedRectGeo(w - bezel * 2, h - bezel * 2, Math.max(0.002, r - bezel), 2, true), screenMat, 0, 0, d / 2 + 0.001);
  screen.name = screenName;
  screen.userData.noMerge = true;
  g.add(screen);
  return g;
}

/** Generic phone, 71 x 147 x 8 mm. Origin at the bottom-centre (centred in thickness), standing along +Y. */
export function buildPhone(screenMat: THREE.Material): THREE.Group {
  const g = device(0.071, 0.147, 0.008, 0.009, 0.003, screenMat, 'screen');
  g.name = 'phone';
  for (const c of g.children) c.position.y += 0.147 / 2;
  return g;
}

/** Generic tablet in portrait, 180 x 248 x 7 mm. Origin at the bottom-centre (centred in thickness). */
export function buildTablet(screenMat: THREE.Material): THREE.Group {
  const g = device(0.18, 0.248, 0.007, 0.012, 0.009, screenMat, 'screen');
  g.name = 'tablet';
  for (const c of g.children) c.position.y += 0.248 / 2;
  return g;
}

/** Slim tripod holding a landscape tablet with its centre at 5 ft; the lit screen faces +Z (toward the subject). */
export function buildTripod(screenMat: THREE.Material): THREE.Group {
  const g = group('tripod');
  const hubY = 1.0;
  const centreY = 5 * FT;
  for (const deg of [60, 180, 300]) {
    const a = deg * DEG;
    const foot = new THREE.Vector3(0.29 * Math.sin(a), 0.012, 0.29 * Math.cos(a));
    g.add(strut(M.charcoal, new THREE.Vector3(0.02 * Math.sin(a), hubY, 0.02 * Math.cos(a)), foot, 0.011));
    g.add(box(M.rubber, 0.03, 0.014, 0.03, 0.293 * Math.sin(a), 0.007, 0.293 * Math.cos(a)));
  }
  g.add(cyl(M.charcoal, 0.03, 0.034, 0.06, 0, hubY, 0, 8));
  g.add(cyl(M.aluminiumMatte, 0.011, 0.011, 0.44, 0, hubY + 0.22, 0, 8));
  g.add(box(M.charcoal, 0.04, 0.04, 0.034, 0, 1.45, -0.002));
  // Clamp: a spine behind the tablet with a hook over the top and bottom edges.
  g.add(box(M.charcoal, 0.09, 0.2, 0.006, 0, centreY - 0.003, 0.0135));
  for (const s of [-1, 1]) g.add(box(M.charcoal, 0.05, 0.005, 0.0165, 0, centreY + s * 0.0925, 0.01875));
  const tablet = device(0.248, 0.18, 0.007, 0.012, 0.009, screenMat, 'tripodScreen');
  tablet.name = 'tripodTablet';
  tablet.position.set(0, centreY, 0.02);
  g.add(tablet);
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// Card stand, floor disc, frames
// ---------------------------------------------------------------------------------------------------------

/** White mineral pedestal with an oak card stand and a folded note card (`noteCard` > `noteLeft` / `noteRight`). */
export function buildCardStand(): THREE.Group {
  const g = group('cardStand');
  g.add(box(M.oak, 0.26, 0.03, 0.26, 0, 0.015, 0));
  g.add(box(M.whiteMineral, 0.28, 0.97, 0.28, 0, 0.03 + 0.485, 0));
  const top = 1.0;
  const lean = 10 * DEG;
  const u: P2 = [-Math.sin(lean), Math.cos(lean)];
  const nn: P2 = [Math.cos(lean), Math.sin(lean)];
  const slotY = 0.006;
  const sw = 0.012; // half slot width: wide enough for the part-open card
  const at = (n: number, t: number): P2 => [nn[0] * n + u[0] * t, slotY + nn[1] * n + u[1] * t];
  const wedge: P2[] = [[-0.04, 0], [0.04, 0], [0.04, 0.008], at(sw, 0.014), at(sw, 0), at(-sw, 0), at(-sw, 0.014), [-0.04, 0.008]];
  g.add(mesh(extrudeXGeo(wedge, -0.035, 0.035, { closed: true, caps: true }), M.oak, 0, top, 0));

  const cw = 0.105;
  const ch = 0.148;
  const open = 15 * DEG;
  const card = group('noteCard');
  card.userData.dynamic = true;
  card.position.set(0, top + slotY, 0);
  card.rotation.x = -lean;
  // The fold is the card's left edge. noteRight is the back half; noteLeft is the front cover, which lies to the
  // left when rotation.y = 0 (card fully open) and closes over the back half as rotation.y approaches 180 degrees.
  const right = group('noteRight');
  right.position.set(-cw / 2, 0, 0);
  right.rotation.y = open / 2;
  right.add(plane(M.paper, cw, ch, cw / 2, ch / 2, 0));
  const left = group('noteLeft');
  left.position.set(-cw / 2, 0, 0);
  left.rotation.y = Math.PI - open / 2;
  left.add(plane(M.paper, cw, ch, -cw / 2, ch / 2, 0));
  const label = textPlane('A note to\ntake with you', { w: 0.09, h: 0.03, color: '#4a4b4d', weight: 500, size: 0.3, ppm: 3000 });
  label.position.set(-cw / 2, ch * 0.6, -0.0006);
  label.rotation.y = Math.PI;
  left.add(label);
  card.add(left, right);
  g.add(card);
  return g;
}

/** Light-oak floor disc with engraved text, read upright by someone standing on the -Z side looking toward +Z. */
export function buildFloorDisc(diameterFt: number, text: string): THREE.Group {
  const g = group('floorDisc');
  const d = diameterFt * FT;
  g.add(cyl(M.oak, d / 2, d / 2, 0.008, 0, 0.004, 0, 48));
  const w = d * 0.72;
  const label = textPlane(text, { w, h: w * 0.18, color: '#8a7a62', weight: 500, size: 0.6 });
  label.position.set(0, 0.009, 0);
  label.rotation.set(-Math.PI / 2, 0, Math.PI);
  g.add(label);
  return g;
}

/** Four box rails forming a rectangular frame of outer size w x h, back on z = 0. */
function frameRails(mat: THREE.Material, w: number, h: number, bar: number, depth: number): THREE.Mesh[] {
  return [
    box(mat, w, bar, depth, 0, h / 2 - bar / 2, depth / 2),
    box(mat, w, bar, depth, 0, -h / 2 + bar / 2, depth / 2),
    box(mat, bar, h - bar * 2, depth, -w / 2 + bar / 2, 0, depth / 2),
    box(mat, bar, h - bar * 2, depth, w / 2 - bar / 2, 0, depth / 2),
  ];
}

/** Thin oak frame of outer size wM x hM around a print. Origin at the centre, back on z = 0. */
export function buildPhotoFrame(wM: number, hM: number, printMat: THREE.Material): THREE.Group {
  const g = group('photoFrame', ...frameRails(M.oak, wM, hM, 0.012, 0.018));
  const print = plane(printMat, wM - 0.024, hM - 0.024, 0, 0, 0.012);
  print.name = 'print';
  print.userData.noMerge = true;
  g.add(print);
  return g;
}

/** Dark aluminium poster frame of outer size wM x hM with glazing and a slim picture light above. */
export function buildPosterFrame(wM: number, hM: number, printMat: THREE.Material): THREE.Group {
  const g = group('posterFrame', ...frameRails(M.bronze, wM, hM, 0.01, 0.025));
  const print = plane(printMat, wM - 0.02, hM - 0.02, 0, 0, 0.017);
  print.name = 'print';
  print.userData.noMerge = true;
  g.add(print);
  g.add(plane(M.vitrine, wM - 0.02, hM - 0.02, 0, 0, 0.019));
  // Picture light: a slim bar 0.1 m off the wall, 0.08 m above the frame, glowing on its underside.
  const barL = wM * 0.6;
  const barY = hM / 2 + 0.08;
  g.add(box(M.bronze, barL, 0.014, 0.014, 0, barY, 0.1));
  for (const s of [-1, 1]) g.add(box(M.bronze, 0.008, 0.008, 0.094, s * barL * 0.3, barY, 0.047));
  const glow = plane(M.lightSlot, barL - 0.02, 0.008, 0, barY - 0.0075, 0.1);
  glow.rotation.x = Math.PI / 2;
  g.add(glow);
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// Signage and wall hardware
// ---------------------------------------------------------------------------------------------------------

/**
 * Slim matte-white door plate. A second, smaller line comes from text after '\n' or ' / '.
 * 'exit' adds a green square at the left, 'lock' a small dark dot.
 */
export function buildDoorPlate(text: string, pictogram: 'exit' | 'lock' | 'none' = 'none'): THREE.Group {
  const g = group('doorPlate');
  const W = 0.26;
  const H = 0.085;
  const D = 0.005;
  g.add(plate(M.white, W, H, D, 0.006, { seg: 2, back: false }));
  let main = text;
  let sub: string | undefined;
  const nl = text.indexOf('\n');
  const slash = text.indexOf(' / ');
  if (nl >= 0) {
    main = text.slice(0, nl);
    sub = text.slice(nl + 1);
  } else if (slash >= 0) {
    main = text.slice(0, slash);
    sub = text.slice(slash + 3);
  }
  const margin = 0.0175;
  let left = -W / 2; // left edge of the text plane; textPlane pads left-aligned text by a quarter of its height
  if (pictogram === 'exit') {
    g.add(plane(M.exitGreen, 0.05, 0.05, -W / 2 + margin + 0.025, 0, D + 0.0005));
    left = -W / 2 + margin + 0.05 + 0.008 - margin;
  } else if (pictogram === 'lock') {
    const dot = mesh(new THREE.CircleGeometry(0.007, 12), M.bezel, -W / 2 + margin + 0.007, 0, D + 0.0005);
    g.add(dot);
    left = -W / 2 + margin + 0.014 + 0.008 - margin;
  }
  const th = sub ? 0.075 : 0.07;
  const tw = W / 2 - 0.004 - left;
  const label = textPlane(main, { w: tw, h: th, color: '#4a4b4d', weight: 500, size: (sub ? 0.02 : 0.022) / th, align: 'left', sub, ppm: 3000 });
  label.position.set(left + tw / 2, 0, D + 0.0008);
  g.add(label);
  return g;
}

/** Black glass badge reader with a lit ring (`readerRing`, swapped to M.ringGreen at runtime). */
export function buildBadgeReader(): THREE.Group {
  const g = group('badgeReader');
  g.add(plate(M.blackGlass, 0.09, 0.13, 0.012, 0.012, { seg: 3, bevel: 0.002, back: false }));
  const tube = 0.0015;
  const ringGeo = new THREE.TorusGeometry(0.028 - tube, tube, 6, 32);
  ringGeo.scale(1, 1, 0.6);
  const ring = mesh(ringGeo, M.ringWhite, 0, 0.014, 0.012);
  ring.name = 'readerRing';
  ring.userData.dynamic = true;
  ring.userData.noMerge = true;
  g.add(ring);
  return g;
}

/** Generic smartwatch graphic at life size (no arm): aluminium body, glass face, crown and two band stubs. */
export function buildWatch(): THREE.Group {
  const g = group('watch');
  const w = 0.038;
  const h = 0.045;
  const d = 0.01;
  g.add(mesh(roundedPlateGeo(w, h, d, 0.0095, { seg: 3, bevel: 0.0015 }), M.aluminium));
  g.add(mesh(roundedRectGeo(w - 0.004, h - 0.004, 0.008, 3), M.blackGlass, 0, 0, d / 2 + 0.0002));
  const crown = new THREE.CylinderGeometry(0.003, 0.003, 0.003, 8);
  crown.rotateZ(Math.PI / 2);
  g.add(mesh(crown, M.aluminium, w / 2 + 0.0012, 0.006, 0));
  // Band stubs leave the top and bottom of the case and curl away behind it.
  const R = 0.028;
  const t = 0.00125;
  const a0 = -6 * DEG;
  const a1 = 72 * DEG;
  const cy = h / 2 - 0.002;
  const upper: P2[] = [...arc(-R, cy, R + t, a0, a1, 5), ...arc(-R, cy, R - t, a1, a0, 5)];
  const lower: P2[] = upper.map(([z, y]): P2 => [z, -y]).reverse();
  for (const prof of [upper, lower]) g.add(mesh(extrudeXGeo(prof, -0.011, 0.011, { closed: true, caps: true }), M.fabricWhite));
  return g;
}

/** Slim stainless lift call panel with two lit buttons in a group named `callButtons`. */
export function buildLiftCallPanel(): THREE.Group {
  const g = group('liftCallPanel');
  g.add(plate(M.steel, 0.09, 0.22, 0.006, 0.004, { seg: 2, back: false }));
  const buttons = group('callButtons');
  buttons.userData.dynamic = true;
  for (const s of [-1, 1]) {
    const geo = new THREE.CylinderGeometry(0.013, 0.013, 0.003, 20);
    geo.rotateX(Math.PI / 2);
    buttons.add(mesh(geo, M.ringWhite, 0, s * 0.028, 0.0075));
  }
  g.add(buttons);
  return g;
}

/** Black glass lift floor indicator with amber text, e.g. "PL07   09". */
export function buildFloorIndicator(text: string): THREE.Group {
  const g = group('floorIndicator');
  g.add(plate(M.blackGlass, 0.28, 0.1, 0.015, 0.008, { seg: 2, bevel: 0.002, back: false }));
  const label = textPlane(text, { w: 0.26, h: 0.08, color: '#ffb648', weight: 600, size: 0.5, letterSpacing: 0.04 });
  // An LED readout glows: let the text light itself with its own artwork.
  const mat = label.material as THREE.MeshStandardMaterial;
  mat.emissive.set(0xffffff);
  mat.emissiveMap = mat.map;
  mat.emissiveIntensity = 1.2;
  label.position.set(0, 0, 0.0158);
  g.add(label);
  return g;
}
