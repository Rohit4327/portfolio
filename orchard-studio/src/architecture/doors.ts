/** Doors: animated rigs (lift, sliding glass entry, swing) and static context doors. */
import * as THREE from 'three';
import { box, group, tag } from '../core/build';
import { M } from '../core/materials';
import { FT, type V2 } from '../data/geometry';
import { DOORS, ENTRY_LEAF_W, leftNormal, segLen, WALLS, type Door } from '../data/plan';
import { segBox } from './shell';

export interface DoorRig {
  id: string;
  door: Door;
  group: THREE.Group;
  /** 0 closed … 1 open. */
  set(f: number): void;
  f: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Offsets (along the left normal) of the two faces of the wall a door sits in, if any. */
function wallFaces(d: Door): [number, number] {
  const mx = (d.a[0] + d.b[0]) / 2;
  const my = (d.a[1] + d.b[1]) / 2;
  for (const w of WALLS) {
    const l = segLen(w.a, w.b);
    const ux = (w.b[0] - w.a[0]) / l;
    const uy = (w.b[1] - w.a[1]) / l;
    const s = (mx - w.a[0]) * ux + (my - w.a[1]) * uy;
    const perp = Math.abs((mx - w.a[0]) * -uy + (my - w.a[1]) * ux);
    if (perp < 1e-6 && s > 0 && s < l && w.h0 === 0) {
      // Express in the door's own left-normal frame.
      const nd = leftNormal(d.a, d.b);
      const nw = leftNormal(w.a, w.b);
      const sign = nd[0] * nw[0] + nd[1] * nw[1] >= 0 ? 1 : -1;
      return [sign * (w.off - w.t / 2), sign * (w.off + w.t / 2)].sort((p, q) => p - q) as [number, number];
    }
  }
  return [-0.02, 0.02];
}

function handle(len = 1.2): THREE.Mesh {
  return box(M.aluminium, 0.02, len * FT, 0.03);
}

function liftDoor(d: Door): DoorRig {
  const g = group(`door:${d.id}`);
  g.userData.dynamic = true;
  const [inner] = wallFaces(d);
  const w = segLen(d.a, d.b);
  const mid = (inner + 0) / 2; // panels run in the middle of the shaft wall
  const leaves = [-1, 1].map((sgn) => {
    const leaf = box(M.steel, (w / 2) * FT, d.h * FT, 0.04);
    leaf.castShadow = true;
    const holder = new THREE.Group();
    holder.add(leaf);
    holder.userData.sgn = sgn;
    g.add(holder);
    return holder;
  });
  const n = leftNormal(d.a, d.b);
  const cx = (d.a[0] + d.b[0]) / 2 + n[0] * mid;
  const cy = (d.a[1] + d.b[1]) / 2 + n[1] * mid;
  g.position.set(cx * FT, (d.h / 2) * FT, -cy * FT);
  g.rotation.y = Math.atan2(d.b[1] - d.a[1], d.b[0] - d.a[0]);
  const rig: DoorRig = {
    id: d.id,
    door: d,
    group: g,
    f: 0,
    set(f) {
      rig.f = f;
      const e = ease(f);
      for (const h of leaves) h.position.x = (h.userData.sgn as number) * (w / 4 + (e * w) / 2) * FT;
    },
  };
  rig.set(0);
  return rig;
}

function slideGlass(d: Door): DoorRig {
  const g = group(`door:${d.id}`);
  g.userData.dynamic = true;
  const w = segLen(d.a, d.b);
  const leaves = [-1, 1].map((sgn) => {
    const holder = new THREE.Group();
    const leaf = box(M.glassDoor, (w / 2) * FT, d.h * FT, 0.012);
    const far = box(M.glassClear, (w / 2) * FT, d.h * FT, 0.012);
    leaf.userData.noMerge = far.userData.noMerge = true;
    leaf.userData.transmissiveAlt = far;
    leaf.userData.transmissiveRange = 9;
    far.visible = false;
    holder.add(far);
    const rail = box(M.aluminium, (w / 2) * FT, 0.05, 0.03, 0, (d.h / 2) * FT - 0.025, 0);
    const shoe = box(M.aluminium, (w / 2) * FT, 0.04, 0.03, 0, -(d.h / 2) * FT + 0.02, 0);
    const pull = handle(1.4);
    pull.position.set(-sgn * ((w / 4) * FT - 0.06), 0, 0.03);
    holder.add(leaf, rail, shoe, pull);
    holder.userData.sgn = sgn;
    g.add(holder);
    return holder;
  });
  const n = leftNormal(d.a, d.b);
  const off = 0.12; // just inside the door plane, so the leaves slide behind the fixed sidelights
  g.position.set(((d.a[0] + d.b[0]) / 2 + n[0] * off) * FT, (d.h / 2) * FT, -((d.a[1] + d.b[1]) / 2 + n[1] * off) * FT);
  g.rotation.y = Math.atan2(d.b[1] - d.a[1], d.b[0] - d.a[0]);
  const rig: DoorRig = {
    id: d.id,
    door: d,
    group: g,
    f: 0,
    set(f) {
      rig.f = f;
      const e = ease(f);
      for (const h of leaves) h.position.x = (h.userData.sgn as number) * (w / 4 + e * ENTRY_LEAF_W) * FT;
    },
  };
  rig.set(0);
  return rig;
}

function swing(d: Door): DoorRig {
  const g = group(`door:${d.id}`);
  g.userData.dynamic = true;
  const w = segLen(d.a, d.b);
  const hingeAtA = d.hinge !== 'b';
  const H = hingeAtA ? d.a : d.b;
  const O = hingeAtA ? d.b : d.a;
  const solid = d.kind === 'swingSolid';
  const leaf = box(solid ? M.white : M.glassClear, w * FT - 0.01, d.h * FT - 0.01, solid ? 0.045 : 0.012, (w / 2) * FT, 0, 0);
  leaf.castShadow = solid;
  const pull = handle(solid ? 0.5 : 1.3);
  pull.position.set(w * FT - 0.09, solid ? -0.05 : 0, 0.045);
  const pull2 = pull.clone();
  pull2.position.z = -0.045;
  g.add(leaf, pull, pull2);
  if (!solid) g.add(box(M.aluminium, w * FT - 0.01, 0.06, 0.03, (w / 2) * FT, -(d.h / 2) * FT + 0.03, 0));
  g.position.set(H[0] * FT, (d.h / 2) * FT, -H[1] * FT);
  const base = Math.atan2(O[1] - H[1], O[0] - H[0]);
  const dir = (d.swing ?? 1) * (hingeAtA ? 1 : -1);
  const rig: DoorRig = {
    id: d.id,
    door: d,
    group: g,
    f: 0,
    set(f) {
      rig.f = f;
      g.rotation.y = base + dir * ease(f) * THREE.MathUtils.degToRad(86);
    },
  };
  rig.set(0);
  return rig;
}

/** Static flush and fire doors: a panel on each face of the wall they sit in. */
function staticDoor(d: Door): THREE.Group {
  const g = group(`door:${d.id}`);
  const faces = wallFaces(d);
  const fire = d.kind === 'fire';
  const w = segLen(d.a, d.b);
  const mid = (s: number): V2 => [d.a[0] + ((d.b[0] - d.a[0]) * s) / w, d.a[1] + ((d.b[1] - d.a[1]) * s) / w];
  for (const [i, f] of faces.entries()) {
    const out = i === 0 ? -1 : 1;
    const off = f + out * 0.015;
    // Slim frame, then the leaf (two leaves for wide fire doors).
    g.add(segBox(M.aluminiumMatte, d.a, d.b, 0.03, f + out * 0.008, 0, d.h + 0.12, 0.1));
    const leaves = fire && w > 4 ? 2 : 1;
    for (let k = 0; k < leaves; k++) {
      const a = mid((w * k) / leaves + 0.03);
      const b = mid((w * (k + 1)) / leaves - 0.03);
      g.add(segBox(M.doorGrey, a, b, 0.04, off, 0.03, d.h));
      if (fire) g.add(segBox(M.blackGlass, mid((w * (k + 0.5)) / leaves - 0.25), mid((w * (k + 0.5)) / leaves + 0.25), 0.05, off, 3.6, 6.0));
    }
    const hx = mid(leaves === 2 ? w / 2 - 0.25 : w - 0.35);
    const hx2 = mid(leaves === 2 ? w / 2 + 0.25 : w - 0.3);
    g.add(segBox(M.aluminium, hx, hx2, 0.08, off + out * 0.04, 3.3, 3.4));
    if (fire) g.add(segBox(M.exitGreen, mid(w / 2 - 0.7), mid(w / 2 + 0.7), 0.06, f + out * 0.03, d.h + 0.25, d.h + 0.75));
  }
  return tag(g, 'door', d.id);
}

function teamDoor(d: Door): THREE.Group {
  const g = group(`door:${d.id}`);
  g.add(segBox(M.glassFrosted, d.a, d.b, 0.045, 0, 0.04, d.h - 0.02));
  const w = segLen(d.a, d.b);
  const at = (s: number): V2 => [d.a[0] + ((d.b[0] - d.a[0]) * s) / w, d.a[1]];
  for (const side of [-1, 1]) g.add(segBox(M.aluminium, at(w - 0.42), at(w - 0.34), 0.07, side * 0.07, 2.6, 4.4));
  g.add(segBox(M.aluminium, d.a, d.b, 0.1, 0, d.h - 0.02, d.h + 0.06));
  return tag(g, 'door', d.id);
}

export function buildDoors(): { rigs: Record<string, DoorRig>; statics: THREE.Group; teamDoor: THREE.Group } {
  const rigs: Record<string, DoorRig> = {};
  const statics = group('doors-static');
  let team = group('door:team');
  for (const d of DOORS) {
    if (d.kind === 'lift') rigs[d.id] = liftDoor(d);
    else if (d.kind === 'slideGlass') rigs[d.id] = slideGlass(d);
    else if (d.id === 'team') team = teamDoor(d);
    else if (d.kind === 'swingGlass' || d.kind === 'swingSolid') rigs[d.id] = swing(d);
    else statics.add(staticDoor(d));
  }
  return { rigs, statics, teamDoor: team };
}
