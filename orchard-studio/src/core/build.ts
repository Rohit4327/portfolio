/**
 * Mesh-building helpers. Everything is in metres with Y up unless the name ends in Ft (plan feet).
 * Geometry UVs are in metres so the shared tiling textures keep their real-world scale on any size of part.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FT } from '../data/geometry';
import { NO_SHADOW } from './materials';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _e = new THREE.Euler();

/** Rewrite a box-like geometry's UVs to metres (u horizontal along the face, v the other axis). */
function metricBoxUVs(g: THREE.BufferGeometry): THREE.BufferGeometry {
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

export function boxGeo(w: number, h: number, d: number): THREE.BufferGeometry {
  return metricBoxUVs(new THREE.BoxGeometry(w, h, d));
}
/** Box with softly rounded edges (radius in metres). Keep segments low: these get instanced. */
export function roundedBoxGeo(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  return metricBoxUVs(new RoundedBoxGeometry(w, h, d, seg, rr));
}

/** A box mesh centred at (x, y, z). */
export function box(mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
export function rbox(mat: THREE.Material, w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(roundedBoxGeo(w, h, d, r), mat);
  m.position.set(x, y, z);
  return m;
}
/** Upright cylinder centred at (x, y, z). */
export function cyl(mat: THREE.Material, rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 20): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}
/** A flat rectangle facing +Z (use rotation to aim it), UV 0..1. */
export function plane(mat: THREE.Material, w: number, h: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  return m;
}

/** Box from a plan-feet rectangle and a height range in feet. */
export function boxFt(mat: THREE.Material, x0: number, y0: number, x1: number, y1: number, h0: number, h1: number): THREE.Mesh {
  const m = box(mat, Math.abs(x1 - x0) * FT, (h1 - h0) * FT, Math.abs(y1 - y0) * FT, ((x0 + x1) / 2) * FT, ((h0 + h1) / 2) * FT, (-(y0 + y1) / 2) * FT);
  return m;
}

/** Yaw (radians about Y) that points an object's local +Z along a plan direction given in degrees CCW from east. */
export const yawForPlanDeg = (deg: number) => ((deg + 90) * Math.PI) / 180;

/** Place an object at a plan-feet position, with its local +Z (front) facing the plan direction `facingDeg`. */
export function placeFt<T extends THREE.Object3D>(o: T, x: number, y: number, facingDeg = 270, hFt = 0): T {
  o.position.set(x * FT, hFt * FT, -y * FT);
  o.rotation.set(0, yawForPlanDeg(facingDeg), 0);
  return o;
}
export function matrixFt(x: number, y: number, facingDeg = 270, hFt = 0, out = new THREE.Matrix4()): THREE.Matrix4 {
  _e.set(0, yawForPlanDeg(facingDeg), 0);
  _q.setFromEuler(_e);
  return out.compose(_p.set(x * FT, hFt * FT, -y * FT), _q, _s);
}

/** A flat floor/ceiling polygon from plan-feet points at a height in feet. UVs in metres. faceUp=false flips it. */
export function polygonFt(mat: THREE.Material, pts: readonly (readonly [number, number])[], hFt: number, faceUp = true): THREE.Mesh {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * FT, y * FT)));
  const g = new THREE.ShapeGeometry(shape);
  // Shape is in XY; rotate so plan y maps to world -z.
  g.rotateX(faceUp ? -Math.PI / 2 : Math.PI / 2);
  if (!faceUp) g.scale(1, 1, -1);
  if (!faceUp) {
    // scale(…,-1) flipped the winding; restore outward normals facing down
    const idx = g.getIndex()!;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i);
      idx.setX(i, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, mat);
  m.position.y = hFt * FT;
  return m;
}

export interface MergeOptions {
  /** Cast shadows from merged opaque meshes. */
  castShadow?: boolean;
  receiveShadow?: boolean;
}

const isDynamic = (o: THREE.Object3D, root: THREE.Object3D): boolean => {
  for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return true;
  return false;
};

/**
 * Collapse every static mesh under `root` into one mesh per material (world transforms baked relative to root).
 * Anything under a node flagged userData.dynamic, plus instanced meshes, lines and sprites, is left alone.
 * This is what keeps draw calls near the material count.
 */
export function mergeStatic(root: THREE.Object3D, o: MergeOptions = {}): THREE.Object3D {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Mesh[] = [];
  root.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material)) return;
    if (isDynamic(mesh, root) || mesh.userData.noMerge || !mesh.visible) return;
    let g = mesh.geometry.clone();
    _m.multiplyMatrices(inv, mesh.matrixWorld);
    g.applyMatrix4(_m);
    if (_m.determinant() < 0) {
      // mirrored: flip winding
      const idx = g.getIndex();
      if (idx) for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i);
        idx.setX(i, idx.getX(i + 2));
        idx.setX(i + 2, a);
      }
    }
    if (g.getIndex()) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const list = buckets.get(mesh.material) ?? [];
    list.push(g);
    buckets.set(mesh.material, list);
    remove.push(mesh);
  });
  for (const m of remove) {
    m.parent?.remove(m);
    m.geometry.dispose();
  }
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = `merged:${mat.name}`;
    const opaque = !NO_SHADOW.has(mat) && !mat.transparent;
    mesh.castShadow = (o.castShadow ?? true) && opaque;
    mesh.receiveShadow = (o.receiveShadow ?? true) && !NO_SHADOW.has(mat);
    if (mat.transparent) mesh.renderOrder = 2;
    root.add(mesh);
  }
  return root;
}

/**
 * Turn a prototype group (a piece of furniture) into instanced meshes, one per material, drawn at each matrix.
 * `matrices` are in the parent's space. Returns a group whose children are the InstancedMeshes.
 */
export function instancePrototype(proto: THREE.Object3D, matrices: readonly THREE.Matrix4[], o: MergeOptions & { name?: string } = {}): THREE.Group {
  const out = new THREE.Group();
  out.name = o.name ?? `instanced:${proto.name}`;
  const flat = mergeStatic(proto.clone(true));
  flat.updateMatrixWorld(true);
  for (const child of flat.children) {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) continue;
    const mat = mesh.material as THREE.Material;
    const inst = new THREE.InstancedMesh(mesh.geometry, mat, Math.max(1, matrices.length));
    inst.name = `inst:${proto.name}:${mat.name}`;
    matrices.forEach((mx, i) => inst.setMatrixAt(i, mx));
    inst.count = matrices.length;
    inst.instanceMatrix.needsUpdate = true;
    const opaque = !NO_SHADOW.has(mat) && !mat.transparent;
    inst.castShadow = (o.castShadow ?? true) && opaque;
    inst.receiveShadow = (o.receiveShadow ?? true) && !NO_SHADOW.has(mat);
    // Cull by the bounds of all instances (a superset when a layout draws a prefix).
    inst.computeBoundingSphere();
    inst.computeBoundingBox();
    inst.userData.total = matrices.length;
    out.add(inst);
  }
  return out;
}
/** Set how many instances of an instanced group are drawn (layouts show a prefix of the list). */
export function setInstanceCount(group: THREE.Object3D, count: number): void {
  for (const c of group.children) {
    const inst = c as THREE.InstancedMesh;
    if (inst.isInstancedMesh) inst.count = Math.min(count, inst.userData.total as number);
  }
}

/** Tag an object with the plan data it represents, so tests can read geometry back from the scene graph. */
export function tag<T extends THREE.Object3D>(o: T, kind: string, id: string, extra: Record<string, unknown> = {}): T {
  o.userData.plan = { kind, id, ...extra };
  o.name = o.name || `${kind}:${id}`;
  return o;
}

export function group(name: string, ...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  if (children.length) g.add(...children);
  return g;
}
