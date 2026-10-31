// Reusable 3D props, materials, screens, the amber point, and the time corridor.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PALETTE, QUALITY } from './stage.js';
import { clamp, lerp, hash } from './util.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0, ...o });
export const mat = {
  std,
  graphite: (o) => std(0x1a1f28, { roughness: 0.85, ...o }),
  graphiteLight: (o) => std(0x2a303b, { roughness: 0.8, ...o }),
  ivory: (o) => std(0xF6F2E8, { roughness: 0.85, ...o }),
  ivoryWall: (o) => std(0xE9E3D6, { roughness: 0.95, ...o }),
  beige: (o) => std(0xD9CFB8, { roughness: 0.7, ...o }),
  beigeDark: (o) => std(0xB9AE93, { roughness: 0.7, ...o }),
  steel: (o) => std(0xB8BCC4, { roughness: 0.3, metalness: 0.95, ...o }),
  brushed: (o) => std(0x9EA3AB, { roughness: 0.45, metalness: 0.9, ...o }),
  brass: (o) => std(0xC9A14A, { roughness: 0.35, metalness: 0.95, ...o }),
  darkMetal: (o) => std(0x3a3f47, { roughness: 0.5, metalness: 0.85, ...o }),
  blackPlastic: (o) => std(0x14161a, { roughness: 0.5, ...o }),
  bakelite: (o) => std(0x1b1512, { roughness: 0.35, ...o }),
  wood: (o) => std(0x8b5a2b, { roughness: 0.7, ...o }),
  woodLight: (o) => std(0xC7A072, { roughness: 0.75, ...o }),
  white: (o) => std(0xF2F3F5, { roughness: 0.5, ...o }),
  glassDark: (o) => new THREE.MeshPhysicalMaterial({ color: 0x0a0c10, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, ...o }),
  glassClear: (o) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.25, clearcoat: 1, ...o }),
  emissive: (color, intensity = 1, o = {}) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 1, ...o }),
  amberGlow: (i = 2.5) => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.amber).multiplyScalar(i), toneMapped: false }),
  cyanGlow: (i = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(i), toneMapped: false }),
  basic: (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o }),
};

export const roundedBox = (w, h, d, r = 0.02, material = mat.graphite(), segments = 3) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2, h / 2, d / 2)), material); m.castShadow = true; m.receiveShadow = true; return m;
};
export const box = (w, h, d, material = mat.graphite()) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.castShadow = true; m.receiveShadow = true; return m; };
export const cylinder = (rt, rb, h, material = mat.steel(), seg = 48) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); m.castShadow = true; m.receiveShadow = true; return m; };
export const sphere = (r, material = mat.steel(), seg = 32) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material); m.castShadow = true; return m; };
export const torus = (r, tube, material = mat.steel(), seg = 48) => new THREE.Mesh(new THREE.TorusGeometry(r, tube, 16, seg), material);
export const plane = (w, h, material) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.receiveShadow = true; return m; };
export function floor(size = 60, material = mat.graphite({ roughness: 0.6, metalness: 0.2 })) { const f = plane(size, size, material); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; return f; }

// A drawable screen: 2D canvas -> texture on a plane. Use scr.ctx to paint UI, then scr.update().
export function makeScreen(w, h, pxW = 1024, pxH = Math.round(1024 * h / w), { lit = false, curve = 0 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = pxW; canvas.height = pxH;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, pxW, pxH);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const material = lit ? new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 })
                       : new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, curve ? 24 : 1, curve ? 24 : 1), material);
  if (curve) { const pos = mesh.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / (w / 2), y = pos.getY(i) / (h / 2); pos.setZ(i, curve * (1 - (x * x + y * y) * 0.5)); } mesh.geometry.computeVertexNormals(); }
  return { mesh, canvas, ctx, texture, material, w, h, pxW, pxH, update() { texture.needsUpdate = true; } };
}

// Sprite glow texture (radial gradient)
let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,230,200,0.85)'); g.addColorStop(0.4, 'rgba(255,171,91,0.35)'); g.addColorStop(1, 'rgba(255,171,91,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); _glowTex = new THREE.CanvasTexture(c); _glowTex.colorSpace = THREE.SRGBColorSpace; return _glowTex;
}
export function glowSprite(color = PALETTE.amber, size = 1, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}

// The narrative guide: a glowing amber point. Keep its identity: warm core, soft halo, casts amber light.
export class AmberPoint {
  constructor(radius = 0.04, { light = true, lightIntensity = 3, lightDistance = 8 } = {}) {
    this.group = new THREE.Group(); this.radius = radius;
    this.core = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 24), mat.amberGlow(1.7)); this.group.add(this.core);
    this.inner = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.55, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe3c2, toneMapped: false })); this.group.add(this.inner);
    this.halo = glowSprite(PALETTE.amber, radius * 14, 0.9); this.group.add(this.halo);
    this.halo2 = glowSprite(PALETTE.amber, radius * 36, 0.25); this.group.add(this.halo2);
    this.light = light ? new THREE.PointLight(0xFFAB5B, lightIntensity, lightDistance, 1.8) : null; if (this.light) this.group.add(this.light);
    this.intensity = 1;
  }
  set(x, y, z) { this.group.position.set(x, y, z); return this; }
  setIntensity(k) { k = clamp(k, 0, 2); this.intensity = k; this.halo.material.opacity = 0.9 * k; this.halo2.material.opacity = 0.25 * k; this.core.visible = k > 0.02; this.inner.visible = k > 0.02; this.halo.visible = k > 0.01; this.halo2.visible = k > 0.01; if (this.light) this.light.intensity = 3 * k; return this; }
  setScale(s) { this.group.scale.setScalar(s); return this; }
  pulse(t, amt = 0.08, speed = 1.6) { const p = 1 + amt * Math.sin(t * speed * Math.PI * 2); this.halo.scale.set(this.radius * 14 * p, this.radius * 14 * p, 1); return this; }
}

// 3D text label plane (canvas texture). Returns a mesh of given world height.
export function textPlane(str, { size = 0.25, color = PALETTE.ivory, weight = 500, family = 'Inter', bg = null, padding = 0.3, tracking = 0, align = 'center' } = {}) {
  const px = 128; const c = document.createElement('canvas'); const x = c.getContext('2d');
  x.font = `${weight} ${px}px ${family}`; x.letterSpacing = `${tracking * px}px`; const w = Math.ceil(x.measureText(str).width + px * padding * 2); const h = Math.ceil(px * 1.5);
  c.width = w; c.height = h; const ctx = c.getContext('2d'); if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.font = `${weight} ${px}px ${family}`; ctx.letterSpacing = `${tracking * px}px`; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(str, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * w / h, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
  return m;
}

// Standard lighting rig for a scene group
export function rig(group, { key = [4, 6, 4], keyI = 2.2, keyColor = 0xfff2e0, fill = [-5, 3, 2], fillI = 0.5, fillColor = 0xcfe3ff, rim = [0, 4, -6], rimI = 1.2, rimColor = 0xffffff, ambient = 0.15, shadows = true, shadowSize = QUALITY.shadowSize } = {}) {
  const k = new THREE.DirectionalLight(keyColor, keyI); k.position.set(...key); k.castShadow = shadows;
  if (shadows) { k.shadow.mapSize.set(shadowSize, shadowSize); k.shadow.camera.near = 0.5; k.shadow.camera.far = 40; k.shadow.camera.left = k.shadow.camera.bottom = -8; k.shadow.camera.right = k.shadow.camera.top = 8; k.shadow.bias = -0.0005; k.shadow.normalBias = 0.02; }
  const f = new THREE.DirectionalLight(fillColor, fillI); f.position.set(...fill);
  const r = new THREE.DirectionalLight(rimColor, rimI); r.position.set(...rim);
  const a = new THREE.AmbientLight(0xffffff, ambient);
  group.add(k, f, r, a); return { key: k, fill: f, rim: r, ambient: a };
}

// The time corridor: a long dark tunnel of thin luminous frames the point travels through between eras.
export function makeCorridor({ length = 80, spacing = 2.4, width = 3.2, height = 2.2, amber = 0.6, cyan = 0.0 } = {}) {
  const g = new THREE.Group();
  const frameMat = mat.graphiteLight({ roughness: 0.4, metalness: 0.6 });
  const edgeA = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.amber).multiplyScalar(1.6), toneMapped: false });
  const edgeC = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(1.4), toneMapped: false });
  const n = Math.floor(length / spacing);
  for (let i = 0; i < n; i++) {
    const z = -i * spacing; const f = new THREE.Group(); f.position.z = z;
    const t = 0.06;
    const top = box(width, t, t, frameMat); top.position.y = height / 2; const bot = box(width, t, t, frameMat); bot.position.y = -height / 2;
    const l = box(t, height, t, frameMat); l.position.x = -width / 2; const r = box(t, height, t, frameMat); r.position.x = width / 2;
    f.add(top, bot, l, r);
    // luminous inner edge strip (amber near, shifting to cyan far)
    const k = i / n; const useC = hash(i + 0.3) < cyan * k;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width - t, 0.012, 0.012), useC ? edgeC : edgeA); strip.position.y = height / 2 - t;
    strip.material = strip.material.clone(); strip.material.opacity = 1; strip.visible = hash(i) < amber + 0.3;
    f.add(strip);
    g.add(f);
  }
  const fl = plane(width + 2, length + 10, mat.graphite({ roughness: 0.25, metalness: 0.6 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, -height / 2 - 0.03, -length / 2); fl.receiveShadow = true; g.add(fl);
  const ceil = plane(width + 2, length + 10, mat.graphite({ roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, height / 2 + 0.03, -length / 2); g.add(ceil);
  for (const s of [-1, 1]) { const wall = plane(length + 10, height + 2, mat.graphite({ roughness: 0.9 })); wall.rotation.y = -s * Math.PI / 2; wall.position.set(s * (width / 2 + 1), 0, -length / 2); g.add(wall); }
  return { group: g, length, spacing, width, height };
}

// Archival/reconstruction panel: a framed plate standing in space (ivory frame, dark mat). Paint content via panel.screen.ctx.
export function makePanel(w = 1.6, h = 1.0, { frame = 0.03, pxW = 1024 } = {}) {
  const g = new THREE.Group();
  const back = roundedBox(w + frame * 2, h + frame * 2, 0.04, 0.01, mat.ivory({ roughness: 0.6 })); back.position.z = -0.025; g.add(back);
  const screen = makeScreen(w, h, pxW, Math.round(pxW * h / w)); screen.mesh.position.z = 0.0; g.add(screen.mesh);
  return { group: g, screen, w, h };
}

// Simple stylized hand (first-person): palm + 5 finger capsules; matte warm material. Returns group with .pose(k) for push/pull.
export function makeHand(material = std(0xC9A58B, { roughness: 0.75 })) {
  const g = new THREE.Group();
  const palm = roundedBox(0.09, 0.1, 0.03, 0.012, material); g.add(palm);
  const fingers = [];
  const fx = [-0.033, -0.011, 0.011, 0.033], fl = [0.07, 0.08, 0.075, 0.06];
  fx.forEach((x, i) => { const f = new THREE.Group(); f.position.set(x, 0.05, 0); const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, fl[i], 6, 12), material); seg.position.y = fl[i] / 2; seg.castShadow = true; f.add(seg); g.add(f); fingers.push(f); });
  const thumb = new THREE.Group(); thumb.position.set(-0.05, -0.01, 0.005); const tseg = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.055, 6, 12), material); tseg.position.y = 0.0275; tseg.castShadow = true; thumb.add(tseg); thumb.rotation.z = 0.9; g.add(thumb);
  const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 6, 16), material); wrist.position.y = -0.1; g.add(wrist);
  g.userData.fingers = fingers; g.userData.thumb = thumb;
  g.pose = (curl) => { fingers.forEach((f) => { f.rotation.x = -curl * 1.2; }); thumb.rotation.x = -curl * 0.6; };
  return g;
}
