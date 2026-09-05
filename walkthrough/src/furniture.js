/**
 * furniture.js — recognizable objects, not placeholder cubes.
 * Every builder returns a THREE.Group positioned at the world origin with its
 * base on the floor; the zone modules place and rotate them.
 */
import * as THREE from 'three';
import { mat, screenMaterials } from './materials.js';
import { roundedBox, drum, arcBand, roundedTriangle, curvedPanel, lShape, extrude } from './geom.js';

const add = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};

/* ------------------------------------------------------------------ *
 * CHAIR — light frame, soft cream shell. Shared geometry, cheap to repeat.
 * ------------------------------------------------------------------ */
let chairProto = null;
export function chair() {
  if (!chairProto) {
    const g = new THREE.Group();
    add(g, roundedBox(0.54, 0.085, 0.52, 0.10, 0.02), mat.fabricWarm, 0, 0.40, 0);
    const back = add(g, roundedBox(0.52, 0.48, 0.085, 0.09, 0.02), mat.fabricWarm, 0, 0.46, -0.22);
    back.rotation.x = -0.12;
    const legGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6);
    for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.19], [0.2, 0.19]]) {
      const l = new THREE.Mesh(legGeo, mat.metal);
      l.position.set(lx, 0.21, lz);
      l.castShadow = true;
      g.add(l);
    }
    chairProto = g;
  }
  return chairProto.clone();
}

/* ------------------------------------------------------------------ *
 * TABLES
 * ------------------------------------------------------------------ */
export function meetingTable(w, d, h = 0.74) {
  const g = new THREE.Group();
  add(g, roundedBox(w, 0.062, d, 0.07, 0.014), mat.timber, 0, h - 0.062, 0);
  const legW = Math.min(0.62, w * 0.42);
  const off = d / 2 - Math.max(0.42, d * 0.16);
  for (const z of d > 1.6 ? [-off, off] : [0]) {
    add(g, roundedBox(legW, h - 0.07, 0.09, 0.03, 0.01), mat.timberDeep, 0, 0, z);
    add(g, roundedBox(legW * 0.7, 0.05, 0.5, 0.03, 0.01), mat.timberDeep, 0, 0, z);
  }
  if (d > 1.6) add(g, roundedBox(0.1, 0.1, d - 1.0, 0.03, 0.01), mat.timberDeep, 0, h - 0.24, 0);
  return g;
}

export function roundTable(r, h = 0.44) {
  const g = new THREE.Group();
  add(g, drum(r, 0.055, 32), mat.timber, 0, h - 0.055, 0);
  add(g, drum(r * 0.16, h - 0.055, 16), mat.timberDeep, 0, 0, 0);
  add(g, drum(r * 0.52, 0.03, 24), mat.timberDeep, 0, 0, 0);
  return g;
}

export function credenza(w, d, h = 0.72) {
  const g = new THREE.Group();
  add(g, roundedBox(w, h, d, 0.03, 0.012), mat.timber, 0, 0, 0);
  add(g, roundedBox(w - 0.16, 0.14, d - 0.14, 0.02, 0.008), mat.timberDeep, 0, h - 0.2, 0);
  return g;
}

/* ------------------------------------------------------------------ *
 * SOFAS
 * ------------------------------------------------------------------ */
/** Straight sofa, long axis on X, back on -Z. */
export function sofa(len, depth = 0.86, arms = true) {
  const g = new THREE.Group();
  add(g, roundedBox(len, 0.34, depth, 0.09, 0.025), mat.fabric, 0, 0.06, 0);
  const seats = Math.max(1, Math.round(len / 0.85));
  const sw = (len - 0.06) / seats;
  for (let i = 0; i < seats; i++) {
    add(g, roundedBox(sw - 0.03, 0.14, depth - 0.24, 0.06, 0.02), mat.fabricWarm,
      -len / 2 + sw * (i + 0.5), 0.40, 0.06);
  }
  add(g, roundedBox(len, 0.42, 0.2, 0.07, 0.02), mat.fabric, 0, 0.40, -depth / 2 + 0.1);
  if (arms) {
    add(g, roundedBox(0.16, 0.28, depth, 0.06, 0.02), mat.fabric, -len / 2 + 0.08, 0.40, 0);
    add(g, roundedBox(0.16, 0.28, depth, 0.06, 0.02), mat.fabric, len / 2 - 0.08, 0.40, 0);
  }
  return g;
}

/** Low bench / plinth seat. */
export function bench(w, d, h = 0.45) {
  const g = new THREE.Group();
  add(g, roundedBox(w, h - 0.06, d, 0.05, 0.015), mat.fabric, 0, 0, 0);
  add(g, roundedBox(w - 0.05, 0.09, d - 0.05, 0.04, 0.015), mat.fabricWarm, 0, h - 0.09, 0);
  return g;
}

/** Small lounge chair / cube seat. */
export function loungeCube(s = 0.72) {
  const g = new THREE.Group();
  add(g, roundedBox(s, 0.34, s * 0.92, 0.08, 0.025), mat.fabric, 0, 0.02, 0);
  add(g, roundedBox(s, 0.30, 0.16, 0.06, 0.02), mat.fabricWarm, 0, 0.34, -s * 0.38);
  return g;
}

/* ------------------------------------------------------------------ *
 * PROWESS POD — high-backed C-shaped lounge shell.
 * Built facing "north-west open": the shell wraps the -X and -Z sides and the
 * C opens toward +X / +Z. Rotate to face the central table.
 * ------------------------------------------------------------------ */
export function prowessPod(w, d) {
  const g = new THREE.Group();
  const T = 0.46;               // white shell thickness
  const SHELL_H = 1.44;         // high outer back
  const BANQ_T = 0.62;          // upholstered banquette depth
  const BANQ_H = 1.04;

  // white outer shell: a thick L closing the two outer faces, its outer corner
  // heavily rounded, opening toward the central table
  const shell = new THREE.Mesh(
    extrude(lShape(w, d, T, 0.74, 0.34), SHELL_H, 0.035), mat.shellWhite);
  shell.name = 'shell';
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // cream banquette, its outer faces sitting on the inside of the shell
  const inner = -w / 2 + T;                       // shell inner face (x and z)
  const bw = w - T - 0.16;
  const bc = inner + bw / 2;
  const back = new THREE.Mesh(
    extrude(lShape(bw, bw, BANQ_T, 0.40, 0.16), BANQ_H, 0.03), mat.fabricWarm);
  back.position.set(bc, 0, bc);
  back.castShadow = true;
  back.receiveShadow = true;
  g.add(back);

  // seat cushions step proud of the back, toward the open corner
  const sw = bw - 0.14;
  const sc = bc + 0.13;
  const seat = new THREE.Mesh(
    extrude(lShape(sw, sw, BANQ_T - 0.12, 0.34, 0.14), 0.43, 0.03), mat.fabric);
  seat.position.set(sc, 0, sc);
  seat.castShadow = true;
  g.add(seat);

  // loose cushion block in the open corner, facing the central table
  add(g, roundedBox(0.6, 0.44, 0.6, 0.10, 0.03), mat.fabricWarm,
    w / 2 - 0.46, 0, d / 2 - 0.46);
  return g;
}

/* ------------------------------------------------------------------ *
 * CURVED PRESENTATION COUNTER (People zone)
 * ------------------------------------------------------------------ */
export function curvedCounter(r0, r1, a0, a1, h = 1.05) {
  const g = new THREE.Group();
  add(g, arcBand(r0, r1, a0, a1, h, 56), mat.shellWhite, 0, 0, 0);
  add(g, arcBand(r0 - 0.06, r1 + 0.06, a0, a1, 0.05, 56), mat.shellWhite, 0, h, 0);
  // inner working shelf
  add(g, arcBand(r0 - 0.42, r0 + 0.02, a0 + 0.08, a1 - 0.08, 0.74, 40), mat.timber, 0, 0, 0);
  return g;
}

/* ------------------------------------------------------------------ *
 * PLANTS — instanced-friendly, small architectural greenery.
 * ------------------------------------------------------------------ */
let plantProto = null;
export function plant(scale = 1) {
  if (!plantProto) {
    const g = new THREE.Group();
    add(g, drum(0.16, 0.24, 12), mat.shellWhite, 0, 0, 0);
    add(g, drum(0.145, 0.03, 12), mat.soil, 0, 0.22, 0);
    const leaf = new THREE.SphereGeometry(0.13, 6, 4);
    let i = 0;
    for (const [x, y, z, s] of [
      [0, 0.40, 0, 1.25], [0.12, 0.33, 0.07, 0.9], [-0.11, 0.34, -0.06, 0.95],
      [0.05, 0.30, -0.13, 0.8], [-0.07, 0.31, 0.12, 0.85], [0, 0.50, 0.02, 0.7],
    ]) {
      const m = new THREE.Mesh(leaf, i++ % 2 ? mat.leaf : mat.leafDark);
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      m.castShadow = true;
      g.add(m);
    }
    plantProto = g;
  }
  const c = plantProto.clone();
  c.scale.setScalar(scale);
  return c;
}

/** Long architectural planter trough filled with low greenery. */
export function planterTrough(w, d, count) {
  const g = new THREE.Group();
  add(g, roundedBox(w, 0.42, d, 0.05, 0.015), mat.shellWhite, 0, 0, 0);
  add(g, roundedBox(w - 0.1, 0.04, d - 0.1, 0.03, 0.01), mat.soil, 0, 0.4, 0);
  const leaf = new THREE.SphereGeometry(0.12, 6, 4);
  const dummy = new THREE.Object3D();
  const inst = new THREE.InstancedMesh(leaf, mat.leaf, count * 3);
  let n = 0;
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + (w / count) * (i + 0.5);
    for (let j = 0; j < 3; j++) {
      dummy.position.set(x + (Math.random() - 0.5) * 0.14, 0.46 + j * 0.07,
        (Math.random() - 0.5) * (d - 0.2));
      dummy.scale.setScalar(0.85 + Math.random() * 0.5 - j * 0.12);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      inst.setMatrixAt(n++, dummy.matrix);
    }
  }
  inst.castShadow = true;
  g.add(inst);
  return g;
}

/* ------------------------------------------------------------------ *
 * SCREENS
 * ------------------------------------------------------------------ */
export function flatScreen(w, h, kind = 'dark') {
  const g = new THREE.Group();
  const S = screenMaterials();
  add(g, roundedBox(w, h, 0.05, 0.01, 0.005), mat.screen, 0, 0, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06),
    S[kind] || S.dark);
  face.position.set(0, h / 2, 0.031);
  g.add(face);
  return g;
}

/** The Capsule's bowed display, concave toward the room. */
let capsuleFace = null;
export function capsuleScreen(width, height, sag) {
  const g = new THREE.Group();
  const S = screenMaterials();
  if (!capsuleFace) {
    capsuleFace = S.capsule.clone();
    capsuleFace.side = THREE.DoubleSide;
    capsuleFace.emissiveIntensity = 1.15;
  }
  const geo = curvedPanel(width, height, sag, 36);
  // dark bezel, very slightly larger and pushed back
  const bezel = new THREE.Mesh(geo, mat.screen);
  bezel.material = mat.screen;
  bezel.rotation.y = Math.PI;
  bezel.scale.set(1.03, 1.09, 1.03);
  bezel.position.y = -0.045;
  g.add(bezel);
  // luminous face; the panel bows away from the room so the concave side faces in
  const face = new THREE.Mesh(geo, capsuleFace);
  face.rotation.y = Math.PI;
  face.position.z = -0.03;
  g.add(face);
  return g;
}

/* ------------------------------------------------------------------ *
 * PANTRY JOINERY
 * ------------------------------------------------------------------ */
export function pantryRun(w, d, h) {
  const g = new THREE.Group();
  add(g, roundedBox(w, h, d, 0.02, 0.008), mat.timber, 0, 0, 0);
  // open shelf niches
  const bays = Math.max(2, Math.round(w / 0.72));
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + (w / bays) * (i + 0.5);
    add(g, roundedBox(w / bays - 0.09, 0.6, 0.05, 0.01, 0.004), mat.timberDeep,
      x, 1.24, d / 2 - 0.03);
    add(g, roundedBox(w / bays - 0.12, 0.03, 0.24, 0.01, 0.004), mat.shellWhite,
      x, 1.52, d / 2 - 0.14);
  }
  return g;
}

export function counterRun(w, d, h = 0.92) {
  const g = new THREE.Group();
  add(g, roundedBox(w, h - 0.05, d, 0.02, 0.008), mat.timber, 0, 0, 0);
  add(g, roundedBox(w + 0.03, 0.05, d + 0.03, 0.015, 0.006), mat.shellWhite, 0, h - 0.05, 0);
  return g;
}

/* ------------------------------------------------------------------ *
 * TIERED TIMBER PLATFORM (People zone)
 * ------------------------------------------------------------------ */
export function tier(w, d, h) {
  const g = new THREE.Group();
  add(g, roundedBox(w, h, d, 0.03, 0.012), mat.timber, 0, 0, 0);
  add(g, roundedBox(w - 0.02, 0.028, d - 0.02, 0.02, 0.008), mat.timberDeep, 0, h - 0.028, 0);
  return g;
}

export { roundedTriangle, drum, roundedBox, arcBand };
