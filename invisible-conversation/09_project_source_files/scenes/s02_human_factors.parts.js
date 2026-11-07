// SCENE 02 helpers — mid-century control-desk components (toggle, lamp, knob, gauge, lever, telephone, book, stool, console).
// All objects are built from primitives; world units are metres. Textures are drawn once on canvases (Inter typography).
import * as THREE from 'three';
import { PALETTE } from '../lib/stage.js';
import { mat, roundedBox, box, cylinder, sphere, torus, plane } from '../lib/props.js';
import { deg } from '../lib/util.js';

export const MAT = {
  enamel: mat.std(0x2a3036, { roughness: 0.48, metalness: 0.12 }),      // hammered grey-blue enamel panel
  cabinet: mat.std(0x22272e, { roughness: 0.6, metalness: 0.3 }),
  cabinetLight: mat.std(0x2b313a, { roughness: 0.62, metalness: 0.25 }),
  linoleum: mat.std(0x1a1d22, { roughness: 0.38, metalness: 0.05 }),
  wall: mat.std(0x141922, { roughness: 0.95 }),
  brass: mat.brass({ roughness: 0.32 }),
  steel: mat.steel({ roughness: 0.28 }),
  brushed: mat.brushed(),
  dark: mat.darkMetal(),
  bakelite: mat.bakelite({ roughness: 0.26 }),
  bakeliteBrown: mat.std(0x2b1b13, { roughness: 0.32 }),
  ivory: mat.std(0xE9E3D6, { roughness: 0.6 }),
  needle: mat.std(0x101214, { roughness: 0.5 }),
  lensOff: mat.std(0x3a1a0c, { roughness: 0.22 }),
  lensOn: mat.std(0x4a2a10, { roughness: 0.22, emissive: 0xffd7a3, emissiveIntensity: 1.5 }),
  cloth: mat.std(0x1F2632, { roughness: 0.88 }),
  pages: mat.std(0xE8E0CE, { roughness: 0.92 }),
};

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const Z90 = Math.PI / 2;

// ---------- gauge ----------
const _faceTex = {};
function gaugeFaceTexture(big) {
  const key = big ? 'b' : 's'; if (_faceTex[key]) return _faceTex[key];
  const S = big ? 512 : 384;
  return (_faceTex[key] = canvasTex(S, S, (x, w, h) => {
    const cx = w / 2, cy = h / 2, R = w / 2;
    x.fillStyle = '#E2DBC9'; x.fillRect(0, 0, w, h);
    const gr = x.createRadialGradient(cx, cy, R * 0.25, cx, cy, R); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(70,45,20,0.28)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#17191d'; x.fillStyle = '#17191d'; x.lineCap = 'butt';
    const a0 = deg(225), sweep = deg(270); const r1 = R * 0.78;
    x.lineWidth = S * 0.006; x.beginPath(); x.arc(cx, cy, r1, -a0, -(a0 - sweep), false); x.stroke();
    const n = big ? 10 : 8;
    for (let i = 0; i <= n * 5; i++) {
      const a = a0 - sweep * (i / (n * 5)); const major = i % 5 === 0; const len = major ? R * 0.1 : R * 0.045;
      x.lineWidth = major ? S * 0.008 : S * 0.004;
      x.beginPath(); x.moveTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); x.lineTo(cx + Math.cos(a) * (r1 - len), cy - Math.sin(a) * (r1 - len)); x.stroke();
      if (major) { const k = i / 5; x.font = `600 ${Math.round(S * 0.075)}px Inter`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(k * (big ? 10 : 5)), cx + Math.cos(a) * r1 * 0.74, cy - Math.sin(a) * r1 * 0.74); }
    }
  }));
}
export function makeGauge(r, { big = false } = {}) {
  const g = new THREE.Group();
  const recess = cylinder(r + 0.004, r + 0.004, 0.012, MAT.dark, 48); recess.rotation.x = Z90; recess.position.z = 0.006; g.add(recess);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: gaugeFaceTexture(big), roughness: 0.65 })); face.position.z = 0.0125; face.receiveShadow = true; g.add(face);
  const bezel = torus(r + 0.004, 0.0055, MAT.brass, 64); bezel.position.z = 0.0165; g.add(bezel);
  const nG = new THREE.Group(); nG.position.z = 0.0155; g.add(nG);
  const needle = box(r * 0.9, 0.0032, 0.0012, MAT.needle); needle.position.x = r * 0.9 / 2 - r * 0.14; needle.castShadow = false; nG.add(needle);
  const hub = cylinder(0.0055, 0.0055, 0.004, MAT.brass, 16); hub.rotation.x = Z90; hub.position.z = 0.017; g.add(hub);
  g.userData.needle = nG; return g;
}
// value in [0,1] -> needle angle (sweep 270 degrees clockwise from lower-left)
export const needleAngle = (v) => deg(225) - deg(270) * v;

// ---------- toggle switch (bat handle, hex nut) ----------
export function makeToggle() {
  const g = new THREE.Group();
  const washer = cylinder(0.0165, 0.0165, 0.002, MAT.brushed, 32); washer.rotation.x = Z90; washer.position.z = 0.001; g.add(washer);
  const nut = cylinder(0.0128, 0.0128, 0.006, MAT.brushed, 6); nut.rotation.x = Z90; nut.position.z = 0.005; g.add(nut);
  const bush = cylinder(0.0072, 0.0072, 0.007, MAT.steel, 24); bush.rotation.x = Z90; bush.position.z = 0.0105; g.add(bush);
  const pivot = new THREE.Group(); pivot.position.z = 0.012; g.add(pivot);
  const bat = cylinder(0.0046, 0.0028, 0.034, MAT.steel, 20); bat.rotation.x = Z90; bat.position.z = 0.017; pivot.add(bat);
  const tip = sphere(0.0052, MAT.steel, 16); tip.position.z = 0.034; pivot.add(tip);
  g.userData.pivot = pivot; return g;
}
// ---------- indicator lamp ----------
export function makeLamp() {
  const g = new THREE.Group();
  const bezel = cylinder(0.0125, 0.0115, 0.009, MAT.brass, 32); bezel.rotation.x = Z90; bezel.position.z = 0.0045; g.add(bezel);
  const lens = sphere(0.0085, MAT.lensOff, 20); lens.scale.z = 0.7; lens.position.z = 0.009; g.add(lens);
  g.userData.lens = lens; return g;
}
// ---------- rotary knob (bakelite, skirted, pointer) ----------
let _scaleTex = null;
function knobScaleTexture() {
  if (_scaleTex) return _scaleTex;
  return (_scaleTex = canvasTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); const cx = w / 2, cy = h / 2; x.strokeStyle = 'rgba(233,227,214,0.95)';
    const a0 = deg(225), sweep = deg(270);
    for (let i = 0; i <= 20; i++) { const a = a0 - sweep * i / 20; const major = i % 4 === 0; const r0 = 100, r1 = major ? 124 : 114; x.lineWidth = major ? 5 : 3; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); x.stroke(); }
  }));
}
export function makeKnob() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CircleGeometry(0.037, 40), new THREE.MeshStandardMaterial({ map: knobScaleTexture(), transparent: true, roughness: 0.7, depthWrite: false })); ring.position.z = 0.0012; g.add(ring);
  const skirt = cylinder(0.025, 0.0275, 0.006, MAT.bakelite, 40); skirt.rotation.x = Z90; skirt.position.z = 0.003; g.add(skirt);
  const body = cylinder(0.0185, 0.0215, 0.018, MAT.bakelite, 40); body.rotation.x = Z90; body.position.z = 0.015; g.add(body);
  const cap = cylinder(0.0185, 0.0185, 0.002, MAT.bakeliteBrown, 40); cap.rotation.x = Z90; cap.position.z = 0.025; g.add(cap);
  const pointer = box(0.0035, 0.017, 0.0016, MAT.ivory); pointer.position.set(0, 0.0085, 0.0262); pointer.castShadow = false; g.add(pointer);
  return g;
}
// ---------- small lever (gear / flaps): plate, slot, pivoting rod, swappable grips ----------
export function makeLever() {
  const g = new THREE.Group();
  const plate = roundedBox(0.032, 0.1, 0.005, 0.002, MAT.dark); plate.position.z = 0.0025; g.add(plate);
  const slot = box(0.008, 0.08, 0.002, mat.std(0x07080a, { roughness: 0.9 })); slot.position.z = 0.0055; slot.castShadow = false; g.add(slot);
  const pivot = new THREE.Group(); pivot.position.z = 0.0; g.add(pivot);
  const rod = cylinder(0.0042, 0.0042, 0.1, MAT.steel, 16); rod.rotation.x = Z90; rod.position.z = 0.05; pivot.add(rod);
  const gripG = new THREE.Group(); gripG.position.z = 0.106; pivot.add(gripG);
  const ball = sphere(0.0155, MAT.bakelite, 24); gripG.add(ball);
  const wheel = new THREE.Group();
  const tyre = torus(0.0125, 0.0058, MAT.bakelite, 32); tyre.rotation.y = Z90; tyre.castShadow = true; wheel.add(tyre);
  const hubW = cylinder(0.0075, 0.0075, 0.013, MAT.brushed, 20); hubW.rotation.z = Z90; wheel.add(hubW);
  wheel.scale.setScalar(0.001); gripG.add(wheel);
  const flap = roundedBox(0.052, 0.009, 0.026, 0.0035, MAT.bakelite); flap.scale.setScalar(0.001); gripG.add(flap);
  g.userData = { pivot, ball, wheel, flap, gripG }; return g;
}
// ---------- big quadrant lever ----------
export function makeBigLever() {
  const g = new THREE.Group();
  const shape = new THREE.Shape(); shape.moveTo(-0.075, 0); shape.absarc(0, 0, 0.075, Math.PI, 0, true); shape.lineTo(-0.075, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 32 });
  // shape (sx, sy, sz) -> local (y, z, x): the half-disc stands out of the panel along the slope
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  const quad = new THREE.Mesh(geo, MAT.dark); quad.castShadow = true; quad.receiveShadow = true; quad.position.x = -0.011; g.add(quad);
  const arc = torus(0.075, 0.0025, MAT.brass, 48); arc.rotation.y = Z90; arc.position.x = 0.0; g.add(arc);
  const pivot = new THREE.Group(); g.add(pivot);
  const rod = cylinder(0.008, 0.0075, 0.25, MAT.steel, 20); rod.rotation.x = Z90; rod.position.z = 0.125; pivot.add(rod);
  const collar = cylinder(0.014, 0.014, 0.02, MAT.brass, 20); collar.rotation.x = Z90; collar.position.z = 0.11; pivot.add(collar);
  const ball = sphere(0.031, MAT.bakelite, 28); ball.position.z = 0.26; pivot.add(ball);
  const boss = cylinder(0.016, 0.016, 0.03, MAT.brass, 24); boss.rotation.z = Z90; g.add(boss);
  g.userData.pivot = pivot; return g;
}
// ---------- rotary telephone ----------
let _dialTex = null;
export const DIAL = { r: 0.041, holeR: 0.0068, holeRad: 0.0295, hole0: deg(50), step: deg(30), stop: deg(-20) };
function dialPlateTexture() {
  if (_dialTex) return _dialTex;
  return (_dialTex = canvasTex(512, 512, (x, w, h) => {
    const cx = w / 2, cy = h / 2, R = w / 2;
    x.fillStyle = '#E6DFCF'; x.fillRect(0, 0, w, h);
    const gr = x.createRadialGradient(cx, cy, R * 0.2, cx, cy, R); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,40,20,0.25)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = '#15171a'; x.font = '600 58px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const rr = DIAL.holeRad / DIAL.r * R;
    for (let i = 0; i < 10; i++) { const a = DIAL.hole0 + DIAL.step * i; x.fillText(String((i + 1) % 10), cx + Math.cos(a) * rr, cy - Math.sin(a) * rr + 2); }
  }));
}
export function makePhone() {
  const g = new THREE.Group(); // origin at desk surface under the body centre; faces +z
  // body: extruded side profile with a true sloped front, bevelled edges
  const prof = new THREE.Shape(); prof.moveTo(-0.1, 0.004); prof.lineTo(0.1, 0.004); prof.lineTo(0.1, 0.046); prof.lineTo(0.0, 0.118); prof.lineTo(-0.1, 0.118); prof.lineTo(-0.1, 0.004); prof.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: 0.19, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.009, bevelSegments: 5, curveSegments: 8 });
  bodyGeo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0))); // shape x -> z, extrusion -> -x
  bodyGeo.translate(0.095, 0.006, 0);
  const body = new THREE.Mesh(bodyGeo, MAT.bakelite); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const foot = roundedBox(0.2, 0.01, 0.19, 0.004, MAT.bakeliteBrown); foot.position.y = 0.004; g.add(foot);
  // cradle + handset
  for (const sx of [-1, 1]) { const prong = roundedBox(0.018, 0.034, 0.05, 0.006, MAT.bakelite); prong.position.set(sx * 0.066, 0.118 + 0.017 + 0.006, -0.055); g.add(prong); }
  const hs = new THREE.Group(); hs.position.set(0, 0.118 + 0.034 + 0.02, -0.055); g.add(hs);
  const bar = cylinder(0.0115, 0.0115, 0.2, MAT.bakelite, 20); bar.rotation.z = Z90; hs.add(bar);
  for (const sx of [-1, 1]) { const cup = cylinder(0.03, 0.026, 0.038, MAT.bakelite, 32); cup.position.set(sx * 0.1, -0.012, 0); cup.rotation.z = sx * deg(8); hs.add(cup); const grille = cylinder(0.02, 0.02, 0.003, MAT.bakeliteBrown, 24); grille.position.set(sx * 0.1 + sx * 0.002, -0.032, 0); grille.rotation.z = sx * deg(8); hs.add(grille); }
  // cord: smooth sag from the body to the desk behind
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.1, 0.03, -0.04), new THREE.Vector3(-0.15, 0.006, -0.06), new THREE.Vector3(-0.19, 0.004, -0.1), new THREE.Vector3(-0.22, 0.004, -0.12)]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0035, 8, false), MAT.bakeliteBrown); cord.castShadow = true; g.add(cord);
  // dial on the sloped face (slope 36 deg above horizontal -> rotation.x = -54 deg)
  const dial = new THREE.Group(); dial.position.set(0, 0.088 + 0.0105 * 0.81, 0.05 + 0.0105 * 0.59); dial.rotation.x = -deg(54); g.add(dial);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(DIAL.r + 0.004, 48), new THREE.MeshStandardMaterial({ map: dialPlateTexture(), roughness: 0.6 })); plate.position.z = 0.0015; plate.receiveShadow = true; dial.add(plate);
  const bezel = torus(DIAL.r + 0.0045, 0.0022, MAT.brass, 56); bezel.position.z = 0.0025; dial.add(bezel);
  // finger wheel: ring with 10 real holes
  const ws = new THREE.Shape(); ws.absarc(0, 0, DIAL.r - 0.0015, 0, Math.PI * 2, false);
  const inner = new THREE.Path(); inner.absarc(0, 0, 0.0145, 0, Math.PI * 2, true); ws.holes.push(inner);
  for (let i = 0; i < 10; i++) { const a = DIAL.hole0 + DIAL.step * i; const p = new THREE.Path(); p.absarc(Math.cos(a) * DIAL.holeRad, Math.sin(a) * DIAL.holeRad, DIAL.holeR, 0, Math.PI * 2, true); ws.holes.push(p); }
  const wheel = new THREE.Mesh(new THREE.ExtrudeGeometry(ws, { depth: 0.0038, bevelEnabled: false, curveSegments: 22 }), mat.bakelite({ roughness: 0.2 })); wheel.castShadow = true; wheel.receiveShadow = true; wheel.position.z = 0.0045; dial.add(wheel);
  const holeMarker = new THREE.Object3D(); const ha = DIAL.hole0 + DIAL.step * 2; holeMarker.position.set(Math.cos(ha) * DIAL.holeRad, Math.sin(ha) * DIAL.holeRad, 0.004); wheel.add(holeMarker);
  const card = new THREE.Mesh(new THREE.CircleGeometry(0.0135, 32), MAT.ivory); card.position.z = 0.003; dial.add(card);
  const screw = cylinder(0.0028, 0.0028, 0.006, MAT.steel, 12); screw.rotation.x = Z90; screw.position.z = 0.006; dial.add(screw);
  const stop = new THREE.Group(); stop.position.set(Math.cos(DIAL.stop) * (DIAL.r + 0.001), Math.sin(DIAL.stop) * (DIAL.r + 0.001), 0.008); stop.rotation.z = DIAL.stop; dial.add(stop);
  const stopArm = roundedBox(0.011, 0.0055, 0.0075, 0.002, MAT.steel); stopArm.position.x = -0.0045; stop.add(stopArm);
  const stopPost = cylinder(0.0028, 0.0028, 0.012, MAT.steel, 12); stopPost.rotation.x = Z90; stopPost.position.set(0.002, 0, -0.003); stop.add(stopPost);
  g.userData = { dial, wheel, holeMarker }; return g;
}
// ---------- closed hardback book (illustrative reconstruction; text only) ----------
function coverTexture() {
  return canvasTex(512, 752, (x, w, h) => {
    x.fillStyle = '#1F2632'; x.fillRect(0, 0, w, h);
    x.fillStyle = PALETTE.amber; x.fillRect(72, 118, 368, 3);
    x.fillStyle = '#F6F2E8'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.font = '300 78px "Inter Display"'; x.letterSpacing = '3px'; x.fillText('DESIGNING', w / 2, 232); x.fillText('FOR PEOPLE', w / 2, 322);
    x.font = '600 28px Inter'; x.letterSpacing = '7px'; x.globalAlpha = 0.9; x.fillText('HENRY DREYFUSS', w / 2, 430); x.globalAlpha = 1;
    x.fillStyle = PALETTE.amber; x.font = '400 34px Inter'; x.letterSpacing = '2px'; x.fillText('1955', w / 2, 672);
  });
}
function spineTexture() {
  return canvasTex(1024, 128, (x, w, h) => {
    x.fillStyle = '#1F2632'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#F6F2E8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '500 52px Inter'; x.letterSpacing = '6px';
    x.fillText('DESIGNING FOR PEOPLE   ·   HENRY DREYFUSS   ·   1955', w / 2, h / 2 + 2);
  });
}
export function makeBook() {
  const g = new THREE.Group(); const BW = 0.16, BD = 0.235, BH = 0.03;
  const pages = box(BW - 0.012, BH - 0.007, BD - 0.008, MAT.pages); pages.position.set(0.004, BH / 2, 0); g.add(pages);
  const top = roundedBox(BW, 0.0045, BD, 0.0015, MAT.cloth); top.position.set(0, BH - 0.00225, 0); g.add(top);
  const bottom = roundedBox(BW, 0.0045, BD, 0.0015, MAT.cloth); bottom.position.set(0, 0.00225, 0); g.add(bottom);
  const spine = roundedBox(0.007, BH, BD, 0.0025, MAT.cloth); spine.position.set(-BW / 2 + 0.0035, BH / 2, 0); g.add(spine);
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.014, BD - 0.014), new THREE.MeshStandardMaterial({ map: coverTexture(), roughness: 0.88 })); cover.rotation.x = -Z90; cover.position.set(0.004, BH + 0.0004, 0); cover.receiveShadow = true; g.add(cover);
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(BD - 0.012, BH - 0.007), new THREE.MeshStandardMaterial({ map: spineTexture(), roughness: 0.88 })); sp.rotation.y = -Z90; sp.position.set(-BW / 2 - 0.0004, BH / 2, 0); g.add(sp);
  return g;
}
// ---------- operator stool ----------
export function makeStool() {
  const g = new THREE.Group();
  const base = cylinder(0.2, 0.21, 0.018, MAT.dark, 40); base.position.y = 0.009; g.add(base);
  const col = cylinder(0.019, 0.022, 0.42, MAT.steel, 24); col.position.y = 0.23; g.add(col);
  const seat = cylinder(0.17, 0.16, 0.035, MAT.bakeliteBrown, 48); seat.position.y = 0.4475; g.add(seat);
  return g;
}
// ---------- the console: cabinet, desk top, sloped panel, upright panel, cheeks ----------
export const CONSOLE = { deskY: 0.76, slopeAngle: deg(40), slopeLen: 0.39, uprightLen: 0.55, width: 3.2 };
export function makeConsole() {
  const g = new THREE.Group(); const Wd = CONSOLE.width;
  const kick = box(Wd - 0.1, 0.08, 0.6, mat.std(0x101216, { roughness: 0.9 })); kick.position.set(0, 0.04, -0.1); g.add(kick);
  const body = box(Wd, 0.66, 0.72, MAT.cabinet); body.position.set(0, 0.41, -0.06); g.add(body);
  for (const x of [-1.05, 0, 1.05]) { const door = roundedBox(0.98, 0.5, 0.012, 0.004, MAT.cabinetLight); door.position.set(x, 0.42, 0.306); g.add(door); const pull = cylinder(0.006, 0.006, 0.09, MAT.brass, 12); pull.position.set(x + 0.4, 0.42, 0.318); pull.castShadow = false; g.add(pull); }
  const top = box(Wd + 0.04, 0.025, 0.27, MAT.linoleum); top.position.set(0, CONSOLE.deskY - 0.0125, 0.175); g.add(top);
  const strip = box(Wd + 0.04, 0.009, 0.009, MAT.brass); strip.position.set(0, CONSOLE.deskY - 0.006, 0.312); strip.castShadow = false; g.add(strip);
  // sloped panel group: local x along the desk, local y up the slope, local z = face normal
  const slope = new THREE.Group(); slope.position.set(0, CONSOLE.deskY, 0.05); slope.rotation.x = CONSOLE.slopeAngle - Z90; g.add(slope);
  const sface = box(Wd, CONSOLE.slopeLen, 0.03, MAT.enamel); sface.position.set(0, CONSOLE.slopeLen / 2, -0.015); slope.add(sface);
  const sTrim = box(Wd, 0.006, 0.004, MAT.brass); sTrim.position.set(0, 0.004, 0.002); sTrim.castShadow = false; slope.add(sTrim);
  const topY = CONSOLE.deskY + Math.sin(CONSOLE.slopeAngle) * CONSOLE.slopeLen, topZ = 0.05 - Math.cos(CONSOLE.slopeAngle) * CONSOLE.slopeLen;
  const upright = new THREE.Group(); upright.position.set(0, topY, topZ); upright.rotation.x = -deg(10); g.add(upright);
  const uface = box(Wd, CONSOLE.uprightLen, 0.03, MAT.enamel); uface.position.set(0, CONSOLE.uprightLen / 2, -0.015); upright.add(uface);
  const seam = box(Wd, 0.005, 0.004, MAT.brass); seam.position.set(0, 0.003, 0.002); seam.castShadow = false; upright.add(seam);
  const uTopY = topY + Math.cos(deg(10)) * CONSOLE.uprightLen, uTopZ = topZ - Math.sin(deg(10)) * CONSOLE.uprightLen;
  const cap = box(Wd + 0.07, 0.03, 0.15, MAT.cabinet); cap.position.set(0, uTopY + 0.01, uTopZ - 0.045); g.add(cap);
  const backFill = box(Wd, uTopY - 0.74, 0.08, MAT.cabinet); backFill.position.set(0, (uTopY + 0.74) / 2, uTopZ - 0.08); g.add(backFill);
  // side cheeks (extruded profile in z,y)
  const prof = new THREE.Shape(); prof.moveTo(0.31, 0.74); prof.lineTo(0.05, 0.74); prof.lineTo(0.05, CONSOLE.deskY); prof.lineTo(topZ, topY); prof.lineTo(uTopZ, uTopY + 0.0); prof.lineTo(uTopZ - 0.12, uTopY); prof.lineTo(uTopZ - 0.12, 0.74); prof.closePath();
  const cgeo = new THREE.ExtrudeGeometry(prof, { depth: 0.035, bevelEnabled: false });
  cgeo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)));
  for (const sx of [-1, 1]) { const cheek = new THREE.Mesh(cgeo, MAT.cabinet); cheek.castShadow = true; cheek.receiveShadow = true; cheek.position.x = sx > 0 ? Wd / 2 + 0.035 : -Wd / 2; g.add(cheek); }
  return { group: g, slope, upright, topY, topZ, uTopY };
}
