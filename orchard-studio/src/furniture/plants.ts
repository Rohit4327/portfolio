/**
 * Procedural plant pods. Each plant is a softly tapered planter with a soil disc, bark limbs merged into one mesh,
 * and foliage built as a single geometry of folded leaf cards (two quads in a shallow V, UV 0..1 with the stem at
 * v = 0) so a whole plant costs three or four draw calls before instancing. Everything is placed by a seeded
 * generator, so a given kind always grows the same plant.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { group } from '../core/build';
import { M } from '../core/materials';
import { FT } from '../data/geometry';
import type { PlantKind } from '../data/plan';

export type { PlantKind };

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UP = new THREE.Vector3(0, 1, 0);
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp3 = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);
const jitter = (rng: Rng, s: number) => v3((rng() - 0.5) * 2 * s, (rng() - 0.5) * 2 * s, (rng() - 0.5) * 2 * s);
/** Evenly spread unit vector i of n (Fibonacci sphere). */
function fib(i: number, n: number, phase: number): THREE.Vector3 {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const a = i * GOLDEN + phase;
  return v3(Math.cos(a) * r, y, Math.sin(a) * r);
}
const bezier = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) =>
  v3().addScaledVector(a, (1 - t) * (1 - t)).addScaledVector(c, 2 * t * (1 - t)).addScaledVector(b, t * t);

/* ───────────────────────────── leaf cards ───────────────────────────── */

interface LeafStyle {
  mat: THREE.Material;
  /** Visible leaf length and width in metres. */
  len: number;
  width: number;
  /** Fraction of the card width the texture's leaf shape fills. */
  fill: number;
  /** Fold angle of each half, radians. */
  fold: number;
}

class Foliage {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];
  private idx: number[] = [];
  private x = v3();
  private z = v3();
  private p = v3();
  private n = v3();
  count = 0;

  /** Add one folded card with its stem at `at`, growing along unit vector `dir`, `len` long and `card` wide. */
  add(at: THREE.Vector3, dir: THREE.Vector3, len: number, card: number, fold: number, roll: number): void {
    const { x, z, p, n } = this;
    x.crossVectors(dir, Math.abs(dir.y) > 0.98 ? v3(1, 0, 0) : UP).normalize();
    z.crossVectors(x, dir).normalize(); // the leaf's upper face
    if (roll !== 0) {
      x.applyAxisAngle(dir, roll);
      z.applyAxisAngle(dir, roll);
    }
    const hw = (card / 2) * Math.cos(fold);
    const lift = (card / 2) * Math.sin(fold);
    for (const s of [-1, 1]) {
      const base = this.pos.length / 3;
      // edge-stem, mid-stem, mid-tip, edge-tip
      const corners: [number, number, number, number][] = [
        [s * hw, lift, 0, s < 0 ? 0 : 1],
        [0, 0, 0, 0.5],
        [0, 0, len, 0.5],
        [s * hw, lift, len, s < 0 ? 0 : 1],
      ];
      n.set(0, 0, 0).addScaledVector(x, -s * Math.sin(fold)).addScaledVector(z, Math.cos(fold));
      for (const [cx, cz, cl, u] of corners) {
        p.copy(at).addScaledVector(x, cx).addScaledVector(z, cz).addScaledVector(dir, cl);
        this.pos.push(p.x, p.y, p.z);
        this.nor.push(n.x, n.y, n.z);
        this.uv.push(u, cl > 0 ? 1 : 0);
      }
      if (s < 0) this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else this.idx.push(base + 1, base, base + 3, base + 1, base + 3, base + 2);
    }
    this.count++;
  }

  mesh(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    const m = new THREE.Mesh(g, mat);
    m.name = 'foliage';
    return m;
  }
}

/** Keep a leaf inside a cylinder of radius maxR between minY and maxY by sliding its stem, never by resizing it. */
function fit(at: THREE.Vector3, dir: THREE.Vector3, len: number, halfCard: number, maxR: number, minY: number, maxY: number): void {
  if (dir.y < -0.4) {
    dir.y = -0.4;
    dir.normalize();
  }
  const lim = maxR - halfCard;
  const tx = at.x + dir.x * len;
  const tz = at.z + dir.z * len;
  const rt = Math.hypot(tx, tz);
  if (rt > lim) {
    at.x = (tx * lim) / rt - dir.x * len;
    at.z = (tz * lim) / rt - dir.z * len;
  }
  const rs = Math.hypot(at.x, at.z);
  if (rs > lim) {
    at.x *= lim / rs;
    at.z *= lim / rs;
    // the leaf now points back across the plant; turn it tangential so its tip stays inside too
    const rt2 = Math.hypot(at.x + dir.x * len, at.z + dir.z * len);
    if (rt2 > lim) {
      const k = (at.x * dir.x + at.z * dir.z) / (lim * lim);
      dir.x -= at.x * k * 1.6;
      dir.z -= at.z * k * 1.6;
      dir.normalize();
    }
  }
  const top = Math.max(at.y, at.y + dir.y * len) + halfCard * 0.5;
  if (top > maxY) at.y -= top - maxY;
  const low = Math.min(at.y, at.y + dir.y * len);
  if (low < minY) at.y += minY - low;
}

/* ───────────────────────────── limbs and pots ───────────────────────────── */

/** A tapered six-sided limb from a to b. */
function limb(out: THREE.BufferGeometry[], a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number): void {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) return;
  const g = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  g.translate(a.x, a.y, a.z);
  out.push(g);
}
/** A limb that follows a curve in `steps` pieces, tapering from r0 to r1. */
function curvedLimb(out: THREE.BufferGeometry[], f: (t: number) => THREE.Vector3, steps: number, r0: number, r1: number): void {
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    limb(out, f(t0), f(t1), r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1);
  }
}

interface Pot {
  r: number;
  h: number;
  mat: THREE.Material;
  /** A rounder, bowl-like wall instead of the straight taper. */
  bowl?: boolean;
}
const RIM = 0.016;
const SOIL_DROP = 0.03;

function addPot(g: THREE.Group, pot: Pot): number {
  const { r, h } = pot;
  const wall = pot.bowl
    ? [
        [0.7, 0],
        [0.9, 0.22],
        [1, 0.6],
        [0.97, 1],
      ]
    : [
        [0.8, 0],
        [0.9, 0.36],
        [0.965, 0.72],
        [1, 1],
      ];
  const top = wall[wall.length - 1][0] * r;
  const profile = wall.map(([k, y]) => new THREE.Vector2(k * r, y * h));
  profile.push(new THREE.Vector2(top - RIM, h), new THREE.Vector2(top - RIM, h - SOIL_DROP));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), pot.mat);
  body.name = 'pot';
  const soilY = h - SOIL_DROP;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(top - RIM, 24).rotateX(-Math.PI / 2), M.soil);
  soil.position.y = soilY;
  soil.name = 'soil';
  g.add(body, soil);
  return soilY;
}

function addBark(g: THREE.Group, limbs: THREE.BufferGeometry[]): void {
  if (!limbs.length) return;
  const mesh = new THREE.Mesh(mergeGeometries(limbs, false), M.bark);
  mesh.name = 'limbs';
  limbs.forEach((l) => l.dispose());
  g.add(mesh);
}

/* ───────────────────────────── trees ───────────────────────────── */

interface TreeSpec {
  seed: number;
  pot: Pot;
  trunks: number;
  /** How far the trunk tops lean out from the centre, metres. */
  lean: number;
  trunkTop: number;
  trunkR: number;
  crownY: number;
  crownRx: number;
  crownRy: number;
  primaries: number;
  twigs: number;
  leaves: number;
  leaf: LeafStyle;
  /** Positive hangs the leaves, negative lifts them. */
  droop: number;
  maxR: number;
  maxY: number;
}

function buildTree(name: string, o: TreeSpec): THREE.Group {
  const rng = mulberry32(o.seed);
  const g = group(name);
  const soilY = addPot(g, o.pot);
  const limbs: THREE.BufferGeometry[] = [];
  const centre = v3(0, o.crownY, 0);
  const radii = v3(o.crownRx, o.crownRy, o.crownRx);

  const trunks: ((t: number) => THREE.Vector3)[] = [];
  const phase = rng() * Math.PI * 2;
  for (let k = 0; k < o.trunks; k++) {
    const a = phase + (k / o.trunks) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const out = v3(Math.cos(a), 0, Math.sin(a));
    const spread = o.trunks > 1 ? 0.035 : 0;
    const base = out.clone().multiplyScalar(spread).setY(soilY - 0.02);
    const top = out.clone().multiplyScalar(o.lean * (0.75 + rng() * 0.5)).setY(o.trunkTop * (0.93 + rng() * 0.09));
    const ctrl = lerp3(base, top, 0.5).add(v3((rng() - 0.5) * 0.09, 0, (rng() - 0.5) * 0.09)).addScaledVector(out, -o.lean * 0.3);
    const f = (t: number) => bezier(base, ctrl, top, t);
    trunks.push(f);
    curvedLimb(limbs, f, 4, o.trunkR, o.trunkR * 0.55);
  }

  // primary branches reach from the trunk tops to an inner shell of the crown
  const primaries: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  for (let i = 0; i < o.primaries; i++) {
    const b = fib(i, o.primaries, phase).multiply(radii).multiplyScalar(0.5 + rng() * 0.12).add(centre);
    let best = trunks[0];
    let bestD = Infinity;
    for (const f of trunks) {
      const d = f(1).distanceToSquared(b);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    const a = best(0.72 + rng() * 0.28);
    primaries.push({ a, b });
    limb(limbs, a, b, o.trunkR * 0.42, o.trunkR * 0.22);
  }

  // twigs carry the leaves out to the crown surface
  const twigs: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  for (let i = 0; i < o.twigs; i++) {
    const b = fib(i, o.twigs, phase + 1.3).multiply(radii).multiplyScalar(0.84 + rng() * 0.16).add(centre);
    let best = primaries[0];
    let bestD = Infinity;
    for (const p of primaries) {
      const d = p.b.distanceToSquared(b);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const a = lerp3(best.a, best.b, 0.55 + rng() * 0.45);
    twigs.push({ a, b });
    limb(limbs, a, b, o.trunkR * 0.2, o.trunkR * 0.08);
  }
  addBark(g, limbs);

  const fol = new Foliage();
  const card = o.leaf.width / o.leaf.fill;
  for (let i = 0; i < o.leaves; i++) {
    const tw = twigs[i % twigs.length];
    const t = 0.18 + 0.86 * Math.pow(rng(), 0.75);
    const at = lerp3(tw.a, tw.b, t).add(jitter(rng, 0.025));
    const along = tw.b.clone().sub(tw.a).normalize();
    const outward = at.clone().sub(centre).divide(radii).normalize();
    const dir = along.multiplyScalar(0.55).addScaledVector(outward, 0.6).add(jitter(rng, 0.75));
    dir.y -= o.droop;
    dir.normalize();
    const len = o.leaf.len * (0.85 + rng() * 0.3);
    fit(at, dir, len, card / 2, o.maxR, soilY + 0.25, o.maxY);
    fol.add(at, dir, len, card * (0.9 + rng() * 0.2), o.leaf.fold, (rng() - 0.5) * 1.2);
  }
  g.add(fol.mesh(o.leaf.mat));
  return g;
}

/* ───────────────────────────── low planting ───────────────────────────── */

interface MoundSpec {
  seed: number;
  pot: Pot;
  stems: number;
  stemSteps: number;
  /** Total height of the plant above the floor. */
  top: number;
  /** How much shorter the outer stems are than the centre ones (0 = column, 0.6 = dome). */
  dome: number;
  /** How strongly outer leaves arch outwards and down. */
  arch: number;
  leaves: number;
  leaf: LeafStyle;
  maxR: number;
}

function buildMound(name: string, o: MoundSpec): THREE.Group {
  const rng = mulberry32(o.seed);
  const g = group(name);
  const soilY = addPot(g, o.pot);
  const limbs: THREE.BufferGeometry[] = [];
  const reach = o.maxR - o.leaf.len * 0.55;
  const rise = o.top - soilY - o.leaf.len * 0.3;
  const stems: { f: (t: number) => THREE.Vector3; out: THREE.Vector3; k: number }[] = [];
  const phase = rng() * Math.PI * 2;
  for (let i = 0; i < o.stems; i++) {
    const k = Math.sqrt((i + 0.5) / o.stems); // 0 centre .. 1 edge
    const a = phase + i * GOLDEN + (rng() - 0.5) * 0.3;
    const out = v3(Math.cos(a), 0, Math.sin(a));
    const base = out.clone().multiplyScalar(o.pot.r * 0.5 * k).setY(soilY - 0.01);
    const h = rise * (1 - o.dome * k * k) * (0.82 + rng() * 0.18);
    const tip = out.clone().multiplyScalar(reach * k).setY(soilY + h);
    const ctrl = base.clone().addScaledVector(out, reach * k * 0.15).setY(soilY + h * 0.85);
    const f = (t: number) => bezier(base, ctrl, tip, t);
    stems.push({ f, out, k });
    curvedLimb(limbs, f, o.stemSteps, 0.006, 0.0025);
  }
  addBark(g, limbs);

  const fol = new Foliage();
  const card = o.leaf.width / o.leaf.fill;
  for (let i = 0; i < o.leaves; i++) {
    const s = stems[i % stems.length];
    const t = 0.16 + 0.84 * Math.pow(rng(), 0.7);
    const at = s.f(t);
    const tangent = s.f(Math.min(1, t + 0.05)).sub(s.f(Math.max(0, t - 0.05))).normalize();
    // leaves leave the stem to alternating sides, further out towards the rim
    const side = v3(-s.out.z, 0, s.out.x).multiplyScalar(i % 2 ? 1 : -1);
    const dir = tangent.multiplyScalar(0.45).addScaledVector(s.out, 0.35 + o.arch * s.k).addScaledVector(side, 0.45).add(jitter(rng, 0.55));
    dir.y += 0.35 - o.arch * s.k * (0.4 + t * 0.9);
    dir.normalize();
    const len = o.leaf.len * (0.8 + rng() * 0.4);
    fit(at, dir, len, card / 2, o.maxR, soilY + 0.015, o.top);
    fol.add(at, dir, len, card * (0.9 + rng() * 0.2), o.leaf.fold, (rng() - 0.5) * 0.9);
  }
  g.add(fol.mesh(o.leaf.mat));
  return g;
}

/* ───────────────────────────── kinds ───────────────────────────── */

export function buildPlanter(kind: PlantKind): THREE.Group {
  switch (kind) {
    case 'ficusTall':
      return buildTree('plant:ficusTall', {
        seed: 0x51f1c05,
        pot: { r: 0.8 * FT, h: 0.55, mat: M.stone },
        trunks: 1,
        lean: 0.03,
        trunkTop: 1.22,
        trunkR: 0.021,
        crownY: 1.47,
        crownRx: 0.4,
        crownRy: 0.47,
        primaries: 8,
        twigs: 26,
        leaves: 260,
        leaf: { mat: M.leafFicus, len: 0.09, width: 0.05, fill: 0.52, fold: 0.3 },
        droop: 0.3,
        maxR: 0.53,
        maxY: 2.0,
      });
    case 'olive':
      return buildTree('plant:olive', {
        seed: 0x0117e,
        pot: { r: 0.9 * FT, h: 0.4, mat: M.stone },
        trunks: 3,
        lean: 0.17,
        trunkTop: 1.12,
        trunkR: 0.017,
        crownY: 1.4,
        crownRx: 0.46,
        crownRy: 0.43,
        primaries: 9,
        twigs: 34,
        leaves: 300,
        leaf: { mat: M.leafOlive, len: 0.07, width: 0.016, fill: 0.3, fold: 0.22 },
        droop: -0.15,
        maxR: 0.55,
        maxY: 1.9,
      });
    case 'lowPod':
      return buildMound('plant:lowPod', {
        seed: 0x10b0d,
        pot: { r: 0.75 * FT, h: 0.4, mat: M.white, bowl: true },
        stems: 22,
        stemSteps: 2,
        top: 0.75,
        dome: 0.55,
        arch: 0.75,
        leaves: 160,
        leaf: { mat: M.leafMixed, len: 0.12, width: 0.05, fill: 0.52, fold: 0.28 },
        maxR: 0.75 * FT * 1.55,
      });
    case 'midPlanter':
      return buildMound('plant:midPlanter', {
        seed: 0x3a1d,
        pot: { r: 0.6 * FT, h: 0.5, mat: M.white },
        stems: 12,
        stemSteps: 3,
        top: 1.3,
        dome: 0.32,
        arch: 0.3,
        leaves: 180,
        leaf: { mat: M.leafFicus, len: 0.1, width: 0.055, fill: 0.52, fold: 0.3 },
        maxR: 0.6 * FT * 1.55,
      });
    case 'cornerPod':
      return buildMound('plant:cornerPod', {
        seed: 0xc0de7,
        pot: { r: 0.5 * FT, h: 0.35, mat: M.stone, bowl: true },
        stems: 16,
        stemSteps: 2,
        top: 0.8,
        dome: 0.5,
        arch: 0.6,
        leaves: 110,
        leaf: { mat: M.leafMixed, len: 0.1, width: 0.045, fill: 0.52, fold: 0.28 },
        maxR: 0.5 * FT * 1.55,
      });
  }
}
