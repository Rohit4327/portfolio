/**
 * Procedural furniture prototypes. Every builder returns a Group in local metres, Y up, front facing +Z, origin on
 * the floor at the footprint centre (desk-top items: origin at the desk surface). They are built only from meshes
 * using the shared material library, with low triangle counts, because each prototype is merged per material and
 * instanced many times (core/build.ts instancePrototype).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, boxGeo, group, plane, roundedBoxGeo } from '../core/build';
import { M } from '../core/materials';
import { FT } from '../data/geometry';

/* ───────────────────────────── geometry helpers ───────────────────────────── */

type P3 = readonly [number, number, number];

/** Rewrite UVs to metres by dominant normal, so tiling textures keep their real scale on non-box parts. */
function metricUVs(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, pos.getX(i), pos.getZ(i));
    else if (ax >= az) uv.setXY(i, pos.getZ(i), pos.getY(i));
    else uv.setXY(i, pos.getX(i), pos.getY(i));
  }
  return g;
}

function at(mat: THREE.Material, g: THREE.BufferGeometry, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * A prism with a rounded-rectangle outline: `a` along X, `b` along Z, thickness `t` along Y, corner radius `r`
 * with `seg` segments per corner. Costs 16·(seg+1) − 4 triangles, far less than a fully rounded box.
 */
function prismGeo(a: number, t: number, b: number, r: number, seg: number): THREE.BufferGeometry {
  const rr = Math.max(1e-4, Math.min(r, a / 2 - 1e-4, b / 2 - 1e-4));
  const sx = [1, -1, -1, 1];
  const sz = [1, 1, -1, -1];
  const ring: { x: number; z: number; nx: number; nz: number }[] = [];
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i <= seg; i++) {
      const th = ((k + i / seg) * Math.PI) / 2;
      const nx = Math.cos(th);
      const nz = Math.sin(th);
      ring.push({ x: sx[k] * (a / 2 - rr) + rr * nx, z: sz[k] * (b / 2 - rr) + rr * nz, nx, nz });
    }
  }
  const n = ring.length;
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const h = t / 2;
  const rows: [number, number][] = [
    [h, 1], // top cap: 0..n-1
    [-h, -1], // bottom cap: n..2n-1
    [h, 0], // side top: 2n..3n-1
    [-h, 0], // side bottom: 3n..4n-1
  ];
  for (const [y, ny] of rows) {
    for (const p of ring) {
      pos.push(p.x, y, p.z);
      if (ny !== 0) nor.push(0, ny, 0);
      else nor.push(p.nx, 0, p.nz);
    }
  }
  for (let i = 1; i < n - 1; i++) {
    idx.push(0, i + 1, i);
    idx.push(n, n + i, n + i + 1);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(2 * n + i, 2 * n + j, 3 * n + i, 2 * n + j, 3 * n + j, 3 * n + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  return g;
}

/** Slab w (X) × h (Y) × d (Z) whose corners are rounded in plan (seen from above). */
function slab(mat: THREE.Material, w: number, h: number, d: number, r: number, seg: number, x = 0, y = 0, z = 0): THREE.Mesh {
  return at(mat, metricUVs(prismGeo(w, h, d, r, seg)), x, y, z);
}
/** Cushion-like bar w (X) × h (Y) × d (Z) whose profile is rounded when seen from the side (constant along X). */
function slabX(mat: THREE.Material, w: number, h: number, d: number, r: number, seg: number, x = 0, y = 0, z = 0): THREE.Mesh {
  return at(mat, metricUVs(prismGeo(h, w, d, r, seg).rotateZ(Math.PI / 2)), x, y, z);
}
/** Bar w (X) × h (Y) × d (Z) whose profile is rounded when seen from the front (constant along Z). */
function slabZ(mat: THREE.Material, w: number, h: number, d: number, r: number, seg: number, x = 0, y = 0, z = 0): THREE.Mesh {
  return at(mat, metricUVs(prismGeo(w, d, h, r, seg).rotateX(Math.PI / 2)), x, y, z);
}

/** Upright cylinder centred at (x, y, z); `open` drops both end caps. */
function tube(mat: THREE.Material, rTop: number, rBottom: number, h: number, seg: number, open: boolean, x = 0, y = 0, z = 0): THREE.Mesh {
  return at(mat, metricUVs(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open)), x, y, z);
}

/** A straight square-ended bar from a to b with a w × d cross-section. */
function beam(mat: THREE.Material, a: P3, b: P3, w: number, d: number): THREE.Mesh {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const m = new THREE.Mesh(boxGeo(w, len, d), mat);
  m.position.copy(va).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** A splayed leg: a box from floor point (x0, y0, z0) to top point (x1, y1, z1) whose ends stay horizontal. */
function leg(mat: THREE.Material, w: number, d: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): THREE.Mesh {
  const h = y1 - y0;
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getY(i) / h + 0.5;
    pos.setXYZ(i, pos.getX(i) + x0 + (x1 - x0) * k, pos.getY(i) + (y0 + y1) / 2, pos.getZ(i) + z0 + (z1 - z0) * k);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(metricUVs(g), mat);
}

/** White worktop with a 10 mm oak edge band showing all round: an oak core with the white face laid 1 mm proud. */
function worktop(x0: number, z0: number, x1: number, z1: number, top: number, thick: number, inset: readonly [number, number, number, number] = [0.01, 0.01, 0.01, 0.01]): THREE.Mesh[] {
  const [l, r, b, f] = inset; // -X, +X, -Z, +Z
  const t = thick - 0.001;
  const wx0 = x0 + l;
  const wx1 = x1 - r;
  const wz0 = z0 + b;
  const wz1 = z1 - f;
  return [
    box(M.oak, x1 - x0, t, z1 - z0, (x0 + x1) / 2, top - 0.001 - t / 2, (z0 + z1) / 2),
    box(M.white, wx1 - wx0, t, wz1 - wz0, (wx0 + wx1) / 2, top - t / 2, (wz0 + wz1) / 2),
  ];
}

const DESK_W = 4 * FT;
const DESK_D = 2 * FT;
const DESK_H = 0.74;
const TOP_T = 0.025;

/* ───────────────────────────── workstation ───────────────────────────── */

/** 4 ft × 2 ft desk, top at 0.74 m: white top with an oak edge band on two slim white side frames. */
export function buildDesk(): THREE.Group {
  const g = group('desk');
  const hw = DESK_W / 2;
  const hd = DESK_D / 2;
  g.add(...worktop(-hw, -hd, hw, hd, DESK_H, TOP_T));
  const under = DESK_H - TOP_T;
  const lx = hw - 0.05;
  const lz = hd - 0.06;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(box(M.white, 0.03, under, 0.05, sx * lx, under / 2, sz * lz));
    g.add(box(M.white, 0.03, 0.04, 2 * lz - 0.05, sx * lx, under - 0.02, 0));
  }
  // rear stretcher ties the two frames together
  g.add(box(M.white, 2 * lx - 0.03, 0.04, 0.02, 0, under - 0.02, -lz));
  return g;
}

/** Low frosted privacy screen that stands on the shared back edge of two desks. */
export function buildDeskScreen(): THREE.Group {
  const h = 1.2 * FT;
  const g = group('deskScreen');
  g.add(box(M.glassFrosted, DESK_W, h, 0.012, 0, DESK_H + h / 2, 0));
  for (const sx of [-1, 1]) g.add(box(M.aluminium, 0.045, 0.035, 0.03, sx * (DESK_W / 2 - 0.18), DESK_H + 0.0175, 0));
  return g;
}

/** Charcoal mesh task chair on a five-star aluminium base. The sitter faces +Z. */
export function buildTaskChair(): THREE.Group {
  const g = group('taskChair');
  // five-star base with castors
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const arm = box(M.aluminiumMatte, 0.034, 0.022, 0.275, s * 0.1475, 0.066, c * 0.1475);
    arm.rotation.y = a;
    const castor = box(M.rubber, 0.028, 0.05, 0.05, s * 0.28, 0.025, c * 0.28);
    castor.rotation.y = a;
    g.add(arm, castor);
  }
  g.add(tube(M.aluminiumMatte, 0.024, 0.03, 0.315, 8, true, 0, 0.0575 + 0.1575, 0));
  // tilt mechanism and the spine that carries the backrest
  g.add(box(M.charcoal, 0.22, 0.03, 0.22, 0, 0.385, 0));
  g.add(box(M.aluminiumMatte, 0.06, 0.02, 0.2, 0, 0.385, -0.195));
  g.add(beam(M.aluminiumMatte, [0, 0.375, -0.285], [0, 0.68, -0.256], 0.06, 0.02));
  g.add(at(M.charcoal, roundedBoxGeo(0.48, 0.06, 0.46, 0.025, 1), 0, 0.43, 0));
  const back = at(M.charcoal, roundedBoxGeo(0.44, 0.44, 0.035, 0.015, 1), 0, 0.73, -0.235);
  back.rotation.x = -0.12;
  g.add(back);
  return g;
}

/** Generic 27-inch thin-bezel monitor. Origin at the desk surface, screen faces +Z. */
export function buildMonitor(screenMat: THREE.Material): THREE.Group {
  const w = 0.61;
  const h = 0.36;
  const t = 0.012;
  const cy = 0.33;
  const g = group('monitor');
  g.add(slab(M.aluminium, 0.2, 0.006, 0.16, 0.03, 3, 0, 0.003, -0.02));
  g.add(box(M.aluminium, 0.045, 0.3, 0.012, 0, 0.155, -0.014));
  g.add(box(M.aluminium, 0.07, 0.07, 0.006, 0, 0.29, -0.008));
  g.add(box(M.bezel, w, h, t, 0, cy, 0));
  const screen = plane(screenMat, w - 0.012, h - 0.012, 0, cy, t / 2 + 0.001);
  screen.name = 'screen';
  g.add(screen);
  return g;
}

/** Generic thin aluminium laptop, lid open about 110°. Origin at the desk surface, screen faces +Z. */
export function buildLaptop(screenMat: THREE.Material): THREE.Group {
  const w = 0.304;
  const d = 0.212;
  const g = group('laptop');
  g.add(box(M.aluminium, w, 0.012, d, 0, 0.006, 0));
  const keys = plane(M.bezel, 0.272, 0.1, 0, 0.0128, -0.036);
  keys.rotation.x = -Math.PI / 2;
  g.add(keys);
  const lid = group('lid');
  lid.position.set(0, 0.012, -d / 2 + 0.005);
  lid.rotation.x = (-20 * Math.PI) / 180;
  lid.add(box(M.aluminium, w, 0.2, 0.005, 0, 0.1, -0.0025));
  const screen = plane(screenMat, w - 0.014, 0.186, 0, 0.102, 0.0008);
  screen.name = 'screen';
  lid.add(screen);
  g.add(lid);
  return g;
}

/** Small tabletop succulent in a tiny white pot. Origin at the desk surface. */
export function buildSucculent(): THREE.Group {
  const g = group('succulent');
  const potH = 0.055;
  g.add(tube(M.white, 0.04, 0.031, potH, 8, true, 0, potH / 2, 0));
  const soilY = potH - 0.004;
  const soil = at(M.soil, new THREE.CircleGeometry(0.0395, 8).rotateX(-Math.PI / 2), 0, soilY, 0);
  g.add(soil);
  const rings = [
    { n: 8, len: 0.05, tilt: 1.08, off: 0.012, phase: 0 },
    { n: 7, len: 0.054, tilt: 0.62, off: 0.007, phase: 0.4 },
    { n: 5, len: 0.062, tilt: 0.22, off: 0.003, phase: 0.9 },
  ];
  const leaves: THREE.BufferGeometry[] = [];
  for (const r of rings) {
    for (let i = 0; i < r.n; i++) {
      const leafGeo = new THREE.ConeGeometry(0.014, r.len, 4, 1, true);
      leafGeo.translate(0, r.len / 2, 0).scale(1, 1, 0.45).rotateX(r.tilt).translate(0, soilY, r.off);
      leafGeo.rotateY(r.phase + (i / r.n) * Math.PI * 2);
      leaves.push(leafGeo);
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(leaves, false), M.succulent));
  leaves.forEach((l) => l.dispose());
  return g;
}

/** 32-inch monitor on an articulating arm clamped to the desk edge. Origin at the desk surface, at the clamp. */
export function buildFlexiArm(screenMat: THREE.Material): THREE.Group {
  const w = 0.71;
  const h = 0.41;
  const cy = 0.45;
  const pz = 0.14; // panel centre
  const g = group('flexiArm');
  // C-clamp gripping the desk edge (the edge sits at z = -0.045)
  g.add(box(M.aluminium, 0.07, 0.008, 0.09, 0, 0.004, 0));
  g.add(box(M.aluminium, 0.07, 0.07, 0.008, 0, -0.027, -0.049));
  g.add(box(M.aluminium, 0.07, 0.008, 0.05, 0, -0.058, -0.024));
  g.add(tube(M.aluminium, 0.016, 0.016, 0.292, 8, false, 0, 0.008 + 0.146, 0));
  // two-link arm: a level reach out to the elbow, then a rising link back to the head
  g.add(beam(M.aluminium, [0, 0.265, 0], [0.17, 0.265, 0.05], 0.032, 0.032));
  g.add(tube(M.aluminium, 0.02, 0.02, 0.066, 8, false, 0.17, 0.277, 0.05));
  g.add(beam(M.aluminium, [0.17, 0.294, 0.05], [0, cy, pz - 0.028], 0.032, 0.032));
  g.add(box(M.aluminium, 0.04, 0.06, 0.03, 0, cy, pz - 0.028));
  g.add(box(M.aluminium, 0.11, 0.11, 0.008, 0, cy, pz - 0.01));
  g.add(box(M.bezel, w, h, 0.012, 0, cy, pz));
  const screen = plane(screenMat, w - 0.012, h - 0.012, 0, cy, pz + 0.007);
  screen.name = 'screen';
  g.add(screen);
  return g;
}

/** Aluminium charging rack with 2 tablets and 4 phones standing in slots. Origin at the desk surface. */
export function buildLabRack(): THREE.Group {
  const g = group('labRack');
  const baseT = 0.012;
  g.add(box(M.aluminium, 0.4, baseT, 0.18, 0, baseT / 2, 0));
  const pitch = 0.063;
  const x0 = -0.198 + 0.002;
  for (let i = 0; i < 7; i++) g.add(box(M.aluminium, 0.004, 0.06, 0.13, x0 + i * pitch, baseT + 0.03, 0));
  for (let i = 0; i < 6; i++) {
    const tablet = i < 2;
    const t = tablet ? 0.007 : 0.008;
    const h = tablet ? 0.205 : 0.15;
    const d = tablet ? 0.15 : 0.072;
    // each device rests against the divider on its left
    const x = x0 + i * pitch + 0.002 + t / 2 + 0.0005;
    const y = baseT + h / 2;
    g.add(box(M.aluminium, t, h, d, x, y, 0));
    for (const s of [-1, 1]) {
      const glass = plane(M.blackGlass, d - 0.006, h - 0.006, x + s * (t / 2 + 0.0005), y, 0);
      glass.rotation.y = (s * Math.PI) / 2;
      g.add(glass);
    }
  }
  return g;
}

/* ───────────────────────────── meeting rooms ───────────────────────────── */

/** 8 × 3.5 ft oak meeting table on two oak leg frames, top at 0.74 m. */
export function buildMeetingTable(): THREE.Group {
  const w = 8 * FT;
  const d = 3.5 * FT;
  const t = 0.04;
  const g = group('meetingTable');
  g.add(slab(M.oak, w, t, d, 0.05, 3, 0, DESK_H - t / 2, 0));
  const under = DESK_H - t;
  const fx = w / 2 - 0.38;
  const fz = d / 2 - 0.13;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(box(M.oak, 0.07, under, 0.07, sx * fx, under / 2, sz * fz));
    g.add(box(M.oak, 0.07, 0.05, 2 * fz - 0.07, sx * fx, under - 0.025, 0));
  }
  return g;
}

/** White upholstered meeting chair on four slim splayed legs. The sitter faces +Z. */
export function buildMeetingChair(): THREE.Group {
  const g = group('meetingChair');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(leg(M.aluminiumMatte, 0.02, 0.02, sx * 0.225, 0, sz * 0.215, sx * 0.19, 0.4, sz * 0.18));
    g.add(box(M.aluminiumMatte, 0.02, 0.02, 0.36, sx * 0.19, 0.385, 0));
  }
  g.add(at(M.fabricWhite, roundedBoxGeo(0.46, 0.07, 0.45, 0.03, 1), 0, 0.425, 0));
  const back = at(M.fabricWhite, roundedBoxGeo(0.44, 0.4, 0.05, 0.022, 1), 0, 0.62, -0.215);
  back.rotation.x = -0.1;
  g.add(back);
  return g;
}

/** Wall-mounted 16:9 display. Origin at the display centre, back on z = 0, faces +Z, 40 mm deep. */
export function buildWallDisplay(diagonalInch: number, screenMat: THREE.Material): THREE.Group {
  const diag = diagonalInch * 0.0254;
  const k = Math.hypot(16, 9);
  const sw = (diag * 16) / k;
  const sh = (diag * 9) / k;
  const bezel = 0.008;
  const depth = 0.04;
  const g = group(`wallDisplay${Math.round(diagonalInch)}`);
  g.add(box(M.bezel, sw + 2 * bezel, sh + 2 * bezel, depth, 0, 0, depth / 2));
  const screen = plane(screenMat, sw, sh, 0, 0, depth + 0.001);
  screen.name = 'screen';
  g.add(screen);
  return g;
}

/* ───────────────────────────── "Today" layout ───────────────────────────── */

/**
 * Group-leader cubicle: 1.37 m partitions (white below, glass above, aluminium caps and posts) with a 0.9 m door
 * gap on +Z, an L-shaped desk, the leader's chair facing the door and two visitor chairs.
 */
export function buildGLCubicle(widthFt: number, depthFt: number): THREE.Group {
  const W = widthFt * FT;
  const D = depthFt * FT;
  const hx = W / 2;
  const hz = D / 2;
  const T = 0.05; // partition and post thickness
  const H = 4.5 * FT;
  const HL = 0.9;
  const CAP = 0.02;
  const g = group('glCubicle');

  const post = (x: number, z: number) => g.add(box(M.aluminium, T, H, T, x, H / 2, z));
  /** A partition run centred on a line parallel to X (alongX) or Z, from a0 to a1 at the cross-axis position c. */
  const run = (a0: number, a1: number, c: number, alongX: boolean) => {
    const len = a1 - a0;
    if (len < 0.02) return;
    const mid = (a0 + a1) / 2;
    const gh = H - HL - CAP;
    const parts: [THREE.Material, number, number, number][] = [
      [M.white, HL, T, HL / 2],
      [M.glassClear, gh, 0.01, HL + gh / 2],
      [M.aluminium, CAP, 0.03, H - CAP / 2],
    ];
    for (const [mat, h, t, y] of parts) g.add(alongX ? box(mat, len, h, t, mid, y, c) : box(mat, t, h, len, c, y, mid));
  };
  const cx = hx - T / 2;
  const cz = hz - T / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(sx * cx, sz * cz);
  run(-hx + T, hx - T, -cz, true);
  run(-hz + T, hz - T, -cx, false);
  run(-hz + T, hz - T, cx, false);
  const door = Math.max(0.6, Math.min(0.9, W - 4 * T - 0.1));
  for (const sx of [-1, 1]) {
    post(sx * (door / 2 + T / 2), cz);
    if (sx < 0) run(-hx + T, -door / 2 - T, cz, true);
    else run(door / 2 + T, hx - T, cz, true);
  }

  // L-shaped desk: the main top faces the door, the return runs back along the -X partition
  const ix = hx - T;
  const iz = hz - T;
  const deskD = 0.7;
  const retW = 0.5;
  const behind = Math.max(0.75, Math.min(1.05, 2 * iz - deskD - 1.0));
  const zBack = -iz + behind;
  const zFront = zBack + deskD;
  const dx0 = -ix + 0.02;
  const dx1 = dx0 + Math.max(1.1, Math.min(1.8, 2 * ix - 0.02 - 0.65));
  const rz0 = -iz + 0.02;
  g.add(...worktop(dx0, zBack, dx1, zFront, DESK_H, TOP_T));
  g.add(...worktop(dx0, rz0, dx0 + retW, zBack, DESK_H, TOP_T, [0.01, 0.01, 0.01, -0.01]));
  const under = DESK_H - TOP_T;
  const legs: [number, number][] = [
    [dx0 + 0.05, zFront - 0.05],
    [dx1 - 0.05, zFront - 0.05],
    [dx1 - 0.05, zBack + 0.05],
    [dx0 + 0.05, rz0 + 0.05],
    [dx0 + retW - 0.05, rz0 + 0.05],
  ];
  for (const [x, z] of legs) g.add(box(M.white, 0.04, under, 0.04, x, under / 2, z));

  const seatX = (dx0 + retW + dx1) / 2;
  const leader = buildTaskChair();
  leader.position.set(seatX, 0, zBack - 0.32);
  g.add(leader);
  for (const s of [-1, 1]) {
    const visitor = buildMeetingChair();
    visitor.position.set(seatX + s * 0.33, 0, zFront + 0.4);
    visitor.rotation.y = Math.PI;
    g.add(visitor);
  }
  return g;
}

/* ───────────────────────────── lounge ───────────────────────────── */

/** Three-seat sofa, 2.1 × 0.9 m: warm grey cushions on a low oak plinth. Faces +Z. */
export function buildSofa3(): THREE.Group {
  const w = 2.1;
  const d = 0.9;
  const arm = 0.12;
  const g = group('sofa3');
  g.add(box(M.oak, w - 0.08, 0.1, d - 0.08, 0, 0.05, 0));
  g.add(box(M.fabricGrey, w, 0.14, d, 0, 0.17, 0));
  for (const sx of [-1, 1]) g.add(box(M.fabricGrey, arm, 0.36, d, sx * (w / 2 - arm / 2), 0.42, 0));
  const inner = w - 2 * arm;
  g.add(box(M.fabricGrey, inner, 0.51, 0.12, 0, 0.495, -d / 2 + 0.06));
  const cw = inner / 3;
  for (let i = -1; i <= 1; i++) {
    g.add(slabX(M.fabricGrey, cw - 0.006, 0.18, 0.78, 0.05, 2, i * cw, 0.33, 0.06));
    const back = slabX(M.fabricGrey, cw - 0.006, 0.32, 0.14, 0.05, 1, i * cw, 0.575, -0.255);
    back.rotation.x = -0.14;
    g.add(back);
  }
  return g;
}

/** Round oak coffee table, 0.7 m across and 0.38 m tall, on three slim splayed legs. */
export function buildCoffeeTable(): THREE.Group {
  const h = 0.38;
  const t = 0.03;
  const g = group('coffeeTable');
  g.add(tube(M.oak, 0.35, 0.35, t, 28, false, 0, h - t / 2, 0));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    g.add(leg(M.oak, 0.03, 0.03, s * 0.275, 0, c * 0.275, s * 0.2, h - t, c * 0.2));
  }
  return g;
}

/** Round white pedestal table, 1.1 m across, with four meeting chairs facing the centre. */
export function buildRoundTable4(): THREE.Group {
  const t = 0.03;
  const g = group('roundTable4');
  g.add(tube(M.white, 0.55, 0.55, t, 28, false, 0, DESK_H - t / 2, 0));
  g.add(tube(M.aluminiumMatte, 0.04, 0.04, DESK_H - t - 0.012, 10, true, 0, 0.012 + (DESK_H - t - 0.012) / 2, 0));
  g.add(tube(M.aluminiumMatte, 0.27, 0.29, 0.012, 20, false, 0, 0.006, 0));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const chair = buildMeetingChair();
    chair.position.set(Math.sin(a) * 0.75, 0, Math.cos(a) * 0.75);
    chair.rotation.y = a + Math.PI;
    g.add(chair);
  }
  return g;
}

/** Lounge armchair, 0.75 m footprint: warm grey shell on slim oak legs. Faces +Z. */
export function buildArmchair(): THREE.Group {
  const s = 0.75;
  const g = group('armchair');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(leg(M.oak, 0.03, 0.03, sx * 0.33, 0, sz * 0.33, sx * 0.29, 0.19, sz * 0.29));
    g.add(slabZ(M.fabricGrey, 0.12, 0.3, s, 0.045, 2, sx * (s / 2 - 0.06), 0.43, 0));
  }
  g.add(box(M.fabricGrey, s - 0.02, 0.12, s - 0.02, 0, 0.24, 0));
  g.add(slabX(M.fabricGrey, 0.51, 0.47, 0.14, 0.05, 2, 0, 0.515, -s / 2 + 0.07));
  g.add(slabX(M.fabricGrey, 0.506, 0.13, 0.57, 0.045, 2, 0, 0.355, 0.09));
  const cushion = slabX(M.fabricGrey, 0.49, 0.3, 0.1, 0.04, 2, 0, 0.58, -0.195);
  cushion.rotation.x = -0.15;
  g.add(cushion);
  return g;
}

/** Low upholstered bench, 0.45 m deep and 0.42 m tall: warm grey cushion on a recessed oak plinth. Long axis X. */
export function buildLowBench(lengthM: number): THREE.Group {
  const d = 0.45;
  const plinthH = 0.26;
  const g = group('lowBench');
  g.add(box(M.oak, Math.max(0.1, lengthM - 0.08), plinthH, d - 0.08, 0, plinthH / 2, 0));
  g.add(slabX(M.fabricGrey, lengthM, 0.42 - plinthH, d, 0.04, 3, 0, (0.42 + plinthH) / 2, 0));
  return g;
}
