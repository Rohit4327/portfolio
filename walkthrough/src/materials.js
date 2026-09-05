/**
 * materials.js — the material language of the reference render.
 * Everything is shared: one instance per finish, reused across the whole scene.
 */
import * as THREE from 'three';

const M = (Ctor, opts) => new Ctor(opts);

/* --- palette ------------------------------------------------------ */
export const COLORS = {
  floor:      0xded8cb,
  wall:       0xefebe3,
  wallSoft:   0xeeeae3,
  timber:     0xd1bb95,
  timberDeep: 0xb69c72,
  fabric:     0xe3d7bf,
  fabricWarm: 0xd0be9e,
  metal:      0xb9b4ac,
  glass:      0xdfe9ec,
  screen:     0x14151a,
  blueWall:   0x9fd4f2,
  leaf:       0x5f7f4a,
  leafDark:   0x46603a,
  walnut:     0x6b4a2f,
};

export const mat = {
  floor: M(THREE.MeshStandardMaterial, {
    color: COLORS.floor, roughness: 0.82, metalness: 0.0,
  }),
  floorInlay: M(THREE.MeshStandardMaterial, {
    color: 0xd7d0c1, roughness: 0.7, metalness: 0.0,
  }),
  wall: M(THREE.MeshStandardMaterial, {
    color: COLORS.wall, roughness: 0.92, metalness: 0.0,
  }),
  wallSoft: M(THREE.MeshStandardMaterial, {
    color: COLORS.wallSoft, roughness: 0.94, metalness: 0.0,
  }),
  ceiling: M(THREE.MeshStandardMaterial, {
    color: 0xf2f0ea, roughness: 0.97, metalness: 0.0, side: THREE.DoubleSide,
  }),
  ceilingLight: M(THREE.MeshStandardMaterial, {
    color: 0xfffbf3, emissive: 0xfff2dd, emissiveIntensity: 0.30, roughness: 1,
  }),
  skirting: M(THREE.MeshStandardMaterial, {
    color: 0xcfc7b8, roughness: 0.85, metalness: 0.0,
  }),
  timber: M(THREE.MeshStandardMaterial, {
    color: COLORS.timber, roughness: 0.68, metalness: 0.0,
  }),
  timberDeep: M(THREE.MeshStandardMaterial, {
    color: COLORS.timberDeep, roughness: 0.66, metalness: 0.0,
  }),
  fabric: M(THREE.MeshStandardMaterial, {
    color: COLORS.fabric, roughness: 0.95, metalness: 0.0,
  }),
  fabricWarm: M(THREE.MeshStandardMaterial, {
    color: COLORS.fabricWarm, roughness: 0.95, metalness: 0.0,
  }),
  shellWhite: M(THREE.MeshStandardMaterial, {
    color: 0xf4f1ea, roughness: 0.55, metalness: 0.0,
  }),
  metal: M(THREE.MeshStandardMaterial, {
    color: COLORS.metal, roughness: 0.4, metalness: 0.75,
  }),
  glass: M(THREE.MeshPhysicalMaterial, {
    color: COLORS.glass, roughness: 0.05, metalness: 0.0,
    transparent: true, opacity: 0.26, transmission: 0.0,
    side: THREE.DoubleSide, depthWrite: false,
    envMapIntensity: 1.1, clearcoat: 1.0, clearcoatRoughness: 0.03,
  }),
  glassFrame: M(THREE.MeshStandardMaterial, {
    color: 0xbdb9b1, roughness: 0.32, metalness: 0.65,
  }),
  screen: M(THREE.MeshStandardMaterial, {
    color: COLORS.screen, roughness: 0.28, metalness: 0.2,
  }),
  blueWall: M(THREE.MeshStandardMaterial, {
    color: COLORS.blueWall, emissive: 0x8fcdf0, emissiveIntensity: 0.55,
    roughness: 1.0,
  }),
  leaf: M(THREE.MeshStandardMaterial, {
    color: COLORS.leaf, roughness: 0.85, flatShading: true,
  }),
  leafDark: M(THREE.MeshStandardMaterial, {
    color: COLORS.leafDark, roughness: 0.85, flatShading: true,
  }),
  soil: M(THREE.MeshStandardMaterial, { color: 0x3f382f, roughness: 1 }),
  walnut: M(THREE.MeshStandardMaterial, {
    color: COLORS.walnut, roughness: 0.55, metalness: 0.0,
  }),
};

/* --- luminous screen artwork -------------------------------------- */

function gradientTexture(stops, w = 512, h = 256, vertical = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0c10';
  g.fillRect(0, 0, w, h);
  const grad = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** the violet / blue ribbon that runs across the Capsule display */
function capsuleTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#08080d';
  g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 5; i++) {
    const grad = g.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0.00, 'rgba(20,22,40,0)');
    grad.addColorStop(0.22, 'rgba(78,64,190,0.55)');
    grad.addColorStop(0.44, 'rgba(126,96,236,0.75)');
    grad.addColorStop(0.62, 'rgba(86,150,240,0.70)');
    grad.addColorStop(0.82, 'rgba(46,88,190,0.40)');
    grad.addColorStop(1.00, 'rgba(16,18,34,0)');
    g.strokeStyle = grad;
    g.lineWidth = 16 - i * 2.4;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = 148 + Math.sin(x / 150 + i * 0.55) * (34 - i * 4) - i * 9;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = '18px sans-serif';
  g.fillText('· · ·  ARRIVAL  · · ·', 470, 78);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let cache = null;
export function screenMaterials() {
  if (cache) return cache;
  const emissive = (map, intensity = 0.9) => new THREE.MeshStandardMaterial({
    color: 0x1a1b20, map, emissive: 0xffffff, emissiveMap: map,
    emissiveIntensity: intensity, roughness: 0.3, metalness: 0.1,
  });
  cache = {
    dark: mat.screen,
    capsule: emissive(capsuleTexture(), 1.0),
    amber: emissive(gradientTexture([
      [0.0, '#150c1a'], [0.30, '#c9852f'],
      [0.56, '#c25f33'], [0.80, '#6a3aa4'], [1.0, '#1d1238'],
    ], 256, 512, true), 0.55),
    spectrum: emissive(gradientTexture([
      [0.0, '#07070c'], [0.30, '#12a8b4'], [0.52, '#3865bc'],
      [0.74, '#8c34a8'], [1.0, '#0a070f'],
    ]), 0.6),
    magenta: emissive(gradientTexture([
      [0.0, '#160722'], [0.34, '#3c1470'], [0.58, '#6d2288'],
      [0.78, '#8d2f6d'], [1.0, '#1c0a26'],
    ], 256, 512, true), 0.45),
  };
  return cache;
}

/** Procedural dark-walnut grain for the tabletop the model sits on. */
export function walnutTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#5b3d26';
  g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 240; i++) {
    const y = Math.random() * 512;
    const amp = 3 + Math.random() * 9;
    g.strokeStyle = `rgba(${28 + Math.random() * 60},${16 + Math.random() * 34},${8 + Math.random() * 22},${0.10 + Math.random() * 0.32})`;
    g.lineWidth = 0.6 + Math.random() * 3.4;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 12) {
      const yy = y + Math.sin(x / (60 + i % 40) + i) * amp;
      x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
  // plank joints
  g.strokeStyle = 'rgba(20,12,6,0.5)';
  g.lineWidth = 2;
  for (const y of [96, 232, 372]) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

export function disposeMaterials() {
  Object.values(mat).forEach((m) => m.dispose && m.dispose());
}
