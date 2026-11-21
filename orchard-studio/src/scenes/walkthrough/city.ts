/**
 * The view from the 9th floor (Section 11), built procedurally and merged into a handful of meshes: a road
 * below the east facade, an elevated metro viaduct about 60 m out, mid-rise blocks, a few towers and tree canopy.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M } from '../../core/materials';
import { FT } from '../../data/geometry';

/** Eye level is about 31 m above the street, so the street is this far below the studio floor. */
export const STREET_Y = -(31 - 1.6);
const FLOOR_H = 3.3;
const BAY_W = 3.2;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A box whose side UVs count window bays and floors, so one tiling facade texture fits any building. */
function tower(w: number, h: number, d: number, x: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.getAttribute('uv');
  const nor = g.getAttribute('normal');
  for (let i = 0; i < uv.count; i++) {
    const side = Math.abs(nor.getY(i)) < 0.5;
    const width = Math.abs(nor.getX(i)) > 0.5 ? d : w;
    if (side) uv.setXY(i, (uv.getX(i) * width) / (BAY_W * 8), (uv.getY(i) * h) / (FLOOR_H * 8));
    else uv.setXY(i, 0.02, 0.02); // roofs sample a frame pixel: plain grey
  }
  g.translate(x, STREET_Y + h / 2, z);
  return g;
}

export function buildCity(simple = false): THREE.Group {
  const g = new THREE.Group();
  g.name = 'city';
  const rnd = mulberry(20261121);
  const east = 77 * FT;
  const blocks: THREE.BufferGeometry[] = [];
  const podiums: THREE.BufferGeometry[] = [];
  const trees: THREE.BufferGeometry[] = [];
  const n = simple ? 70 : 230;
  for (let i = 0; i < n; i++) {
    // Denser to the east (the hero view), thinner around the other sides; nothing within 45 m of the facade.
    const eastSide = rnd() < 0.62;
    const ang = eastSide ? (rnd() - 0.5) * 1.9 : rnd() * Math.PI * 2;
    const dist = 150 + Math.pow(rnd(), 1.4) * (simple ? 700 : 1100);
    const x = east + Math.cos(ang) * dist;
    const z = -9 + Math.sin(ang) * dist;
    if (x > east - 40 && x < east + 86 && Math.abs(z) < 2000 && Math.abs(x - (east + 60)) < 16) continue; // keep the viaduct corridor clear
    if (x < east + 40 && x > -40 && z > -40 && z < 30) continue; // our own building
    const isTower = rnd() < 0.09;
    const floors = isTower ? 25 + Math.floor(rnd() * 11) : 6 + Math.floor(Math.pow(rnd(), 1.6) * 14);
    const w = (isTower ? 22 : 18) + rnd() * 26;
    const d = (isTower ? 22 : 16) + rnd() * 24;
    blocks.push(tower(w, floors * FLOOR_H, d, x, z));
    if (rnd() < 0.5) podiums.push(new THREE.BoxGeometry(w + 8, 7, d + 8).translate(x, STREET_Y + 3.5, z));
  }
  // Tree canopy along the road and scattered between blocks.
  const tn = simple ? 60 : 260;
  for (let i = 0; i < tn; i++) {
    const along = (rnd() - 0.5) * 900;
    const row = rnd() < 0.5;
    const x = row ? east + (rnd() < 0.5 ? 14 : 38) + rnd() * 3 : east + 20 + rnd() * 700;
    const z = row ? along : (rnd() - 0.5) * 900;
    const r = 3 + rnd() * 3;
    trees.push(new THREE.IcosahedronGeometry(r, 1).scale(1, 0.75, 1).translate(x, STREET_Y + 6 + rnd() * 3, z));
  }
  const add = (geos: THREE.BufferGeometry[], mat: THREE.Material, name: string) => {
    if (!geos.length) return;
    const m = new THREE.Mesh(mergeGeometries(geos.map((q) => (q.index ? q.toNonIndexed() : q)), false)!, mat);
    m.name = name;
    m.userData.noMerge = true;
    m.castShadow = m.receiveShadow = false;
    g.add(m);
    geos.forEach((q) => q.dispose());
  };
  add(blocks, M.facade, 'city-blocks');
  add(podiums, M.cityConcrete, 'city-podiums');
  add(trees, M.cityTree, 'city-trees');
  // Ground, the road directly below, and the metro viaduct running parallel about 60 m out.
  const ground: THREE.BufferGeometry[] = [new THREE.BoxGeometry(4000, 1, 4000).translate(east, STREET_Y - 0.5, 0)];
  add(ground, M.cityConcrete, 'city-ground');
  const road: THREE.BufferGeometry[] = [new THREE.BoxGeometry(18, 0.2, 2400).translate(east + 24, STREET_Y + 0.1, 0), new THREE.BoxGeometry(2400, 0.2, 12).translate(east + 300, STREET_Y + 0.1, -160)];
  add(road, M.cityRoad, 'city-road');
  const via: THREE.BufferGeometry[] = [new THREE.BoxGeometry(9, 1.6, 2400).translate(east + 60, STREET_Y + 12.5, 0), new THREE.BoxGeometry(9.6, 1.1, 2400).translate(east + 60, STREET_Y + 13.6, 0).scale(1, 1, 1)];
  for (let z = -1150; z <= 1150; z += 28) via.push(new THREE.BoxGeometry(2.2, 12, 2.2).translate(east + 60, STREET_Y + 6, z));
  add(via, M.cityConcrete, 'city-viaduct');
  return g;
}
