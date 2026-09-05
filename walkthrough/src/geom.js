/**
 * geom.js — small library of premium-feeling primitives.
 * Rounded boxes, extruded profiles, arcs and rounded rectangles, so the
 * architecture reads as bevelled joinery rather than crude cubes.
 */
import * as THREE from 'three';

const cache = new Map();
const key = (...a) => a.map((n) => (typeof n === 'number' ? n.toFixed(4) : n)).join('|');

/** Rounded rectangle shape in the XY plane, centred on the origin. */
export function roundedRectShape(w, d, r) {
  r = Math.min(r, w / 2 - 0.001, d / 2 - 0.001);
  const s = new THREE.Shape();
  const x = w / 2, y = d / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);  s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r);   s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y);  s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/**
 * A box with rounded plan corners and a soft bevel top and bottom.
 * Returned geometry is centred in X/Z and sits with its base at y = 0.
 */
export function roundedBox(w, h, d, r = 0.04, bevel = 0.012) {
  const k = key('rb', w, h, d, r, bevel);
  if (cache.has(k)) return cache.get(k);
  const b = Math.min(bevel, h / 2.5, r * 0.9);
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w, d, r), {
    depth: Math.max(h - b * 2, 0.001),
    bevelEnabled: b > 0.0005,
    bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 6,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b, 0);
  g.computeVertexNormals();
  cache.set(k, g);
  return g;
}

/** Simple cylinder with its base at y = 0. */
export function drum(r, h, seg = 24) {
  const k = key('dr', r, h, seg);
  if (cache.has(k)) return cache.get(k);
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(0, h / 2, 0);
  cache.set(k, g);
  return g;
}

/**
 * An extruded arc band (annulus sector) lying in the XZ plane, base at y = 0.
 * a0/a1 in radians, measured the same way as the reference image
 * (0 = +X, increasing toward +Z).
 */
export function arcBand(r0, r1, a0, a1, h, seg = 48) {
  const k = key('ab', r0, r1, a0, a1, h, seg);
  if (cache.has(k)) return cache.get(k);
  const s = new THREE.Shape();
  // shape Y is negated because the extrusion is rotated -90 deg about X,
  // which maps shape +Y onto world -Z. This keeps arc angles in the same
  // convention as the reference image (0 = +X/east, increasing toward +Z/south).
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg);
    i === 0 ? s.moveTo(Math.cos(a) * r1, -Math.sin(a) * r1)
            : s.lineTo(Math.cos(a) * r1, -Math.sin(a) * r1);
  }
  for (let i = seg; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / seg);
    s.lineTo(Math.cos(a) * r0, -Math.sin(a) * r0);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h - 0.02, bevelEnabled: true, bevelSize: 0.01,
    bevelThickness: 0.01, bevelSegments: 1, curveSegments: 4,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.01, 0);
  g.computeVertexNormals();
  cache.set(k, g);
  return g;
}

/** Rounded-triangle slab (the Prowess central table top). */
export function roundedTriangle(r, h, corner = 0.28) {
  const k = key('rt', r, h, corner);
  if (cache.has(k)) return cache.get(k);
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const s = new THREE.Shape();
  const round = corner * r;
  for (let i = 0; i < 3; i++) {
    const p = pts[i], nx = pts[(i + 1) % 3], pv = pts[(i + 2) % 3];
    const toPrev = pv.clone().sub(p).normalize().multiplyScalar(round);
    const toNext = nx.clone().sub(p).normalize().multiplyScalar(round);
    const a = p.clone().add(toPrev), b = p.clone().add(toNext);
    i === 0 ? s.moveTo(a.x, a.y) : s.lineTo(a.x, a.y);
    s.quadraticCurveTo(p.x, p.y, b.x, b.y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h - 0.02, bevelEnabled: true, bevelSize: 0.01,
    bevelThickness: 0.01, bevelSegments: 1, curveSegments: 8,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.01, 0);
  g.computeVertexNormals();
  cache.set(k, g);
  return g;
}

/**
 * Rounded-rectangle tube: the Capsule's glass shell and its slim head/foot rails.
 * `hollow` builds an open ring with wall thickness `t`.
 */
export function roundedRingWall(w, d, r, h, t, gap) {
  const outer = roundedRectShape(w, d, r);
  const inner = roundedRectShape(w - t * 2, d - t * 2, Math.max(r - t, 0.01));
  const shape = outer;
  shape.holes.push(new THREE.Path(inner.getPoints(64).reverse()));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h, bevelEnabled: false, curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Curved display panel: a bowed rectangle, base at y = 0, centred at x = 0. */
export function curvedPanel(width, height, sag, seg = 28) {
  const k = key('cp', width, height, sag, seg);
  if (cache.has(k)) return cache.get(k);
  const half = width / 2;
  const R = (half * half + sag * sag) / (2 * sag);
  const span = 2 * Math.asin(half / R);
  const g = new THREE.CylinderGeometry(R, R, height, seg, 1, true, -span / 2, span);
  g.translate(0, height / 2, -R + sag);
  cache.set(k, g);
  return g;
}

/**
 * L-shaped lounge-pod profile: two thick arms meeting at a heavily rounded
 * outer corner, open on the opposite corner. Built so that after the standard
 * -90 deg X rotation the arms sit on the world -X (west) and -Z (north) faces
 * and the pod opens toward +X / +Z.
 */
export function lShape(w, d, t, R, r) {
  R = Math.min(R, w - t - 0.05, d - t - 0.05);
  r = Math.min(r, R * 0.55);
  const hw = w / 2, hd = d / 2;
  const s = new THREE.Shape();
  s.moveTo(hw, hd);
  s.lineTo(-hw + R, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - R);
  s.lineTo(-hw, -hd + 0.06);
  s.quadraticCurveTo(-hw, -hd, -hw + 0.06, -hd);
  s.lineTo(-hw + t, -hd);
  s.lineTo(-hw + t, hd - t - r);
  s.quadraticCurveTo(-hw + t, hd - t, -hw + t + r, hd - t);
  s.lineTo(hw - 0.06, hd - t);
  s.quadraticCurveTo(hw, hd - t, hw, hd - t + 0.06);
  s.closePath();
  return s;
}

/** Extrude any Shape into a slab sitting on y = 0. */
export function extrude(shape, h, bevel = 0.02) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(h - bevel * 2, 0.01), bevelEnabled: bevel > 0.001,
    bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 8,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  g.computeVertexNormals();
  return g;
}

export function disposeGeom() {
  cache.forEach((g) => g.dispose());
  cache.clear();
}
