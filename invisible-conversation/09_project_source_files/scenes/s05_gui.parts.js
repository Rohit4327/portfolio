// SCENE 05 helpers — exhibition hall, four reconstructed machines, 1-bit screen drawings, the paper folder and the wastebasket.
// Everything here is a documentary reconstruction built from primitives (world units = metres). Screens are generic
// black-on-white bitmapped UIs drawn in Canvas 2D — not pixel copies of real screenshots.
import * as THREE from 'three';
import { PALETTE } from '../lib/stage.js';
import { clamp, lerp, hash, easeOut } from '../lib/util.js';
import { mat, roundedBox, box, cylinder, plane, floor, makeScreen, torus } from '../lib/props.js';

// ───────────────────────── materials ─────────────────────────
export const M = {
  beige: () => mat.beige({ roughness: 0.62 }),
  beigeDark: () => mat.beigeDark({ roughness: 0.72 }),
  bezel: () => mat.std(0x27231f, { roughness: 0.55 }),
  key: () => mat.std(0xE6DECB, { roughness: 0.6 }),
  plinth: () => mat.ivory({ roughness: 0.82 }),
  plinthBase: () => mat.graphite({ roughness: 0.9 }),
  cable: () => mat.std(0x1a1a1d, { roughness: 0.6 }),
  manila: (o) => mat.std(0xD3BF95, { roughness: 0.92, ...o }),
  paper: (o) => mat.ivory({ roughness: 0.95, ...o }),
};

// ───────────────────────── hall & plinths ─────────────────────────
export function makeHall(g) {
  g.add(floor(44, mat.graphite({ roughness: 0.3, metalness: 0.3 })));
  const wall = plane(44, 8, mat.std(0x151a23, { roughness: 0.96 })); wall.position.set(0, 4, -4.6); wall.receiveShadow = true; g.add(wall);
  // a thin ivory datum rail along the back wall gives the hall a horizon
  const rail = box(44, 0.012, 0.02, mat.std(0x3a4150, { roughness: 0.8 })); rail.position.set(0, 1.9, -4.58); g.add(rail);
}
export function makePlinth(w, h, d) {
  const g = new THREE.Group();
  const base = box(w - 0.08, 0.035, d - 0.08, M.plinthBase()); base.position.y = 0.0175; g.add(base); // shadow gap
  const body = roundedBox(w, h - 0.035, d, 0.006, M.plinth()); body.position.y = 0.035 + (h - 0.035) / 2; g.add(body);
  g.userData.top = h; return g;
}

// ───────────────────────── small parts ─────────────────────────
export function makeKeyboard(w = 0.45, d = 0.18, { rows = 4, cols = 15, h = 0.028 } = {}) {
  const g = new THREE.Group();
  const body = roundedBox(w, h, d, 0.007, M.beige()); body.position.y = h / 2; g.add(body);
  const kw = (w - 0.03) / cols, kd = (d - 0.04) / rows;
  const geo = new THREE.BoxGeometry(kw * 0.82, 0.007, kd * 0.72);
  const inst = new THREE.InstancedMesh(geo, M.key(), rows * cols + 1);
  const m4 = new THREE.Matrix4(); let n = 0;
  const spaceC0 = Math.floor(cols * 0.3), spaceC1 = Math.floor(cols * 0.7);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === rows - 1 && c >= spaceC0 && c <= spaceC1) continue;
    m4.makeTranslation(-w / 2 + 0.015 + kw * (c + 0.5), h + 0.0035, -d / 2 + 0.02 + kd * (r + 0.5)); inst.setMatrixAt(n++, m4);
  }
  const sw = kw * (spaceC1 - spaceC0 + 1);
  m4.compose(new THREE.Vector3(-w / 2 + 0.015 + kw * (spaceC0 + (spaceC1 - spaceC0 + 1) / 2), h + 0.0035, -d / 2 + 0.02 + kd * (rows - 0.5)), new THREE.Quaternion(), new THREE.Vector3(sw / (kw * 0.82) * 0.95, 1, 1));
  inst.setMatrixAt(n++, m4); inst.count = n; inst.castShadow = true; inst.receiveShadow = true; g.add(inst);
  return g;
}
export function makeMouse(buttons = 1, { w = 0.062, h = 0.03, d = 0.1 } = {}) {
  const g = new THREE.Group();
  const body = roundedBox(w, h, d, 0.011, M.beige()); body.position.y = h / 2; g.add(body);
  if (buttons === 1) { const b = roundedBox(w * 0.78, 0.004, d * 0.34, 0.002, M.beigeDark()); b.position.set(0, h + 0.001, -d * 0.24); g.add(b); }
  else { const bw = (w - 0.01) / buttons; for (let i = 0; i < buttons; i++) { const b = roundedBox(bw - 0.004, 0.004, d * 0.34, 0.0015, M.beigeDark()); b.position.set(-w / 2 + 0.005 + bw * (i + 0.5), h + 0.001, -d * 0.24); g.add(b); } }
  return g;
}
export function makeCable(pts, r = 0.0028) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, r, 6, false), M.cable()); m.castShadow = true; return m;
}
function bezelAndScreen(g, sW, sH, pxW, pxH, cx, cy, zFront, lip = 0.018) {
  const bezel = roundedBox(sW + lip * 2, sH + lip * 2, 0.012, 0.006, M.bezel()); bezel.position.set(cx, cy, zFront + 0.004); g.add(bezel);
  const screen = makeScreen(sW, sH, pxW, pxH); screen.mesh.position.set(cx, cy, zFront + 0.0105); g.add(screen.mesh);
  screen.texture.anisotropy = 8; return screen;
}

// ───────────────────────── machines (origin = plinth top centre, facing +z) ─────────────────────────
export function makeAlto() {
  const g = new THREE.Group();
  const cabW = 0.56, cabH = 0.78, cabD = 0.66, cz = -0.12;
  const cab = roundedBox(cabW, cabH, cabD, 0.012, M.beige()); cab.position.set(0, cabH / 2, cz); g.add(cab);
  const front = cz + cabD / 2;
  const panel = box(cabW - 0.06, 0.17, 0.006, M.beigeDark()); panel.position.set(0, cabH - 0.14, front + 0.003); g.add(panel);
  const slot = box(0.36, 0.012, 0.008, M.bezel()); slot.position.set(0, cabH - 0.115, front + 0.006); g.add(slot);
  const handle = roundedBox(0.09, 0.016, 0.012, 0.004, M.beigeDark()); handle.position.set(0, cabH - 0.185, front + 0.01); g.add(handle);
  for (let i = 0; i < 7; i++) { const v = box(cabW - 0.18, 0.006, 0.004, M.beigeDark()); v.position.set(0, 0.1 + i * 0.034, front + 0.003); g.add(v); }
  // portrait display on top
  const dW = 0.36, dH = 0.46, dD = 0.40;
  const neck = cylinder(0.075, 0.1, 0.05, M.beigeDark(), 32); neck.position.set(0, cabH + 0.025, cz); g.add(neck);
  const housing = roundedBox(dW, dH, dD, 0.016, M.beige()); housing.position.set(0, cabH + 0.05 + dH / 2, cz); g.add(housing);
  const sW = 0.216, sH = 0.288, scy = cabH + 0.05 + dH / 2 + 0.01;
  const screen = bezelAndScreen(g, sW, sH, 606, 808, 0, scy, cz + dD / 2);
  // keyboard + three-button mouse live on a lower desk block (set by the scene)
  const kb = makeKeyboard(0.46, 0.19, { rows: 4, cols: 16 }); const mouse = makeMouse(3);
  return { group: g, screen, kb, mouse, screenCenter: new THREE.Vector3(0, scy, cz + dD / 2 + 0.0105), name: 'alto' };
}
export function makeStar() {
  const g = new THREE.Group();
  const base = roundedBox(0.3, 0.05, 0.3, 0.01, M.beigeDark()); base.position.set(0, 0.025, -0.1); g.add(base);
  const dW = 0.47, dH = 0.40, dD = 0.30, cz = -0.06;
  const housing = roundedBox(dW, dH, dD, 0.016, M.beige()); housing.position.set(0, 0.05 + dH / 2, cz); g.add(housing);
  const rear = roundedBox(dW * 0.78, dH * 0.8, 0.2, 0.02, M.beige()); rear.position.set(0, 0.05 + dH / 2 - 0.01, cz - dD / 2 - 0.08); g.add(rear);
  const sW = 0.345, sH = 0.272, scy = 0.05 + dH / 2 + 0.005;
  const screen = bezelAndScreen(g, sW, sH, 1024, 808, 0, scy, cz + dD / 2);
  const kb = makeKeyboard(0.5, 0.19, { rows: 4, cols: 18 }); kb.position.set(-0.03, 0, 0.3); g.add(kb);
  const mouse = makeMouse(2); mouse.position.set(0.4, 0, 0.3); g.add(mouse);
  g.add(makeCable([[0.4, 0.015, 0.25], [0.42, 0.01, 0.12], [0.36, 0.005, 0.02], [0.3, 0.004, -0.03]]));
  return { group: g, screen, kb, mouse, screenCenter: new THREE.Vector3(0, scy, cz + dD / 2 + 0.0105), name: 'star' };
}
export function makeLisa() {
  const g = new THREE.Group();
  const uW = 0.475, uH = 0.35, uD = 0.39, cz = -0.1;
  const body = roundedBox(uW, uH, uD, 0.012, M.beige()); body.position.set(0, uH / 2, cz); g.add(body);
  const front = cz + uD / 2;
  const sW = 0.244, sH = 0.183, scx = -0.075, scy = uH / 2 + 0.03;
  const screen = bezelAndScreen(g, sW, sH, 960, 720, scx, scy, front, 0.016);
  const bay = box(0.125, 0.19, 0.006, M.beigeDark()); bay.position.set(0.155, uH / 2 + 0.035, front + 0.003); g.add(bay);
  for (const dy of [0.04, -0.035]) { const s = box(0.1, 0.009, 0.006, M.bezel()); s.position.set(0.155, uH / 2 + 0.035 + dy, front + 0.0065); g.add(s); }
  const chin = box(uW - 0.04, 0.006, 0.004, M.beigeDark()); chin.position.set(0, 0.075, front + 0.002); g.add(chin);
  const kb = makeKeyboard(0.47, 0.17, { rows: 4, cols: 17 }); kb.position.set(0, 0, 0.26); g.add(kb);
  const mouse = makeMouse(1); mouse.position.set(0.37, 0, 0.26); g.add(mouse);
  g.add(makeCable([[0.37, 0.015, 0.21], [0.39, 0.01, 0.1], [0.32, 0.005, 0.03], [0.26, 0.004, -0.02]]));
  return { group: g, screen, kb, mouse, screenCenter: new THREE.Vector3(scx, scy, front + 0.0105), name: 'lisa' };
}
export function makeMac() {
  const g = new THREE.Group();
  const uW = 0.245, uH = 0.345, uD = 0.275, cz = -0.05;
  const body = roundedBox(uW, uH, uD, 0.012, M.beige()); body.position.set(0, uH / 2, cz); g.add(body);
  const front = cz + uD / 2;
  const sW = 0.175, sH = 0.117, scy = 0.215;
  const screen = bezelAndScreen(g, sW, sH, 512, 342, 0, scy, front, 0.014);
  const slot = box(0.085, 0.006, 0.006, M.bezel()); slot.position.set(0.05, 0.1, front + 0.003); g.add(slot);
  const groove = box(uW - 0.03, 0.004, 0.004, M.beigeDark()); groove.position.set(0, 0.125, front + 0.002); g.add(groove);
  const kb = makeKeyboard(0.33, 0.15, { rows: 4, cols: 13 }); kb.position.set(0, 0, 0.26); g.add(kb);
  const mouse = makeMouse(1); mouse.position.set(0.29, 0, 0.26); g.add(mouse);
  g.add(makeCable([[0.29, 0.015, 0.21], [0.3, 0.01, 0.12], [0.22, 0.005, 0.06], [0.14, 0.004, 0.0]]));
  return { group: g, screen, kb, mouse, screenCenter: new THREE.Vector3(0, scy, front + 0.0105), name: 'mac' };
}

// ───────────────────────── the everyday objects (morph sources) ─────────────────────────
// Paper folder lying flat; origin at its centre on the surface. Local: x = width (0.24), z = height (0.32), tab on the -z edge.
export function makeFolder() {
  const g = new THREE.Group(); const w = 0.24, d = 0.32, th = 0.004;
  const mats = [];
  const manila = M.manila({ transparent: true }); const paperM = M.paper({ transparent: true }); mats.push(manila, paperM);
  const back = box(w, th, d, manila); back.position.y = th / 2; g.add(back);
  const tab = box(w * 0.36, th, 0.03, manila); tab.position.set(w * 0.2, th / 2, -d / 2 - 0.015); g.add(tab);
  const sheets = box(w * 0.9, 0.006, d * 0.9, paperM); sheets.position.set(0.005, th + 0.003, 0.006); g.add(sheets);
  const hinge = new THREE.Group(); hinge.position.set(-w / 2, th + 0.007, 0); g.add(hinge);
  const cover = box(w, th, d, manila); cover.position.set(w / 2, th / 2, 0); hinge.add(cover);
  g.userData.setOpen = (a) => { hinge.rotation.z = a; };
  g.userData.setOpacity = (o) => { for (const m of mats) { m.opacity = o; m.depthWrite = o > 0.5; } g.visible = o > 0.01; };
  g.userData.size = { w, d };
  return g;
}
// Small office wastebasket (brushed metal, tapered, rolled rim); origin at its base centre.
export function makeBasket() {
  const g = new THREE.Group(); const h = 0.27, rt = 0.105, rb = 0.082;
  const m = mat.brushed({ side: THREE.DoubleSide, transparent: true, roughness: 0.42 });
  const inner = mat.darkMetal({ transparent: true, roughness: 0.6, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 48, 1, true), m); body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(rb - 0.002, 48), inner); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.003; g.add(bottom);
  const rim = torus(rt, 0.005, mat.brushed({ transparent: true, roughness: 0.35 }), 48); rim.rotation.x = Math.PI / 2; rim.position.y = h; rim.castShadow = true; g.add(rim);
  // vertical ribs follow the taper
  const ribGeo = new THREE.BoxGeometry(0.006, h - 0.03, 0.004); const ribs = new THREE.InstancedMesh(ribGeo, mat.brushed({ transparent: true, roughness: 0.5 }), 14);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); const tilt = Math.atan2(rt - rb, h);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const r = (rt + rb) / 2 + 0.003; e.set(tilt, a, 0, 'YXZ'); q.setFromEuler(e); m4.compose(new THREE.Vector3(Math.sin(a) * r, h / 2, Math.cos(a) * r), q, new THREE.Vector3(1, 1, 1)); ribs.setMatrixAt(i, m4); }
  ribs.castShadow = true; g.add(ribs);
  const mats = [m, inner, rim.material, ribs.material];
  g.userData.setOpacity = (o) => { for (const mm of mats) { mm.opacity = o; mm.depthWrite = o > 0.5; } g.visible = o > 0.01; };
  g.userData.size = { w: rt * 2, h };
  return g;
}

// ───────────────────────── 1-bit screen drawing ─────────────────────────
export const INK = '#0D1016', PAPER = '#F2F3F5';
let _tile50 = null, _tile25 = null;
function tile(kind) {
  if (kind === 50) { if (!_tile50) { const c = document.createElement('canvas'); c.width = c.height = 2; const x = c.getContext('2d'); x.fillStyle = PAPER; x.fillRect(0, 0, 2, 2); x.fillStyle = INK; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1); _tile50 = c; } return _tile50; }
  if (!_tile25) { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.fillStyle = PAPER; x.fillRect(0, 0, 4, 4); x.fillStyle = INK; x.fillRect(0, 0, 1, 1); x.fillRect(2, 2, 1, 1); _tile25 = c; } return _tile25;
}
export const dither = (ctx, kind = 50) => ctx.createPattern(tile(kind), 'repeat');
export function paper(ctx, w, h) { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h); ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; }
export function ink(ctx, str, x, y, size = 14, weight = 400, align = 'left', family = 'Inter') { ctx.fillStyle = INK; ctx.font = `${weight} ${size}px ${family}`; ctx.textAlign = align; ctx.fillText(str, x, y); ctx.textAlign = 'left'; }
export function invert(ctx, x, y, w, h) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h); ctx.restore(); }
const lw = (s) => Math.max(1.5, s / 22);

export function win(ctx, x, y, w, h, title, { style = 'bar', titleH = 26, font = 15, scrollbar = false } = {}) {
  ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  if (style === 'bar') {
    ctx.fillStyle = INK; ctx.fillRect(x, y, w, titleH);
    ctx.fillStyle = PAPER; ctx.font = `600 ${font}px Inter`; ctx.textAlign = 'left'; ctx.fillText(title, x + 12, y + titleH * 0.68);
    // close box (white square) at the right
    ctx.fillRect(x + w - titleH + 7, y + 7, titleH - 14, titleH - 14);
  } else {
    ctx.fillStyle = INK; for (let yy = y + 5; yy < y + titleH - 3; yy += 4) ctx.fillRect(x + 3, yy, w - 6, 1.6);
    ctx.fillRect(x, y + titleH - 2, w, 2);
    ctx.font = `600 ${font}px Inter`; const tw = ctx.measureText(title).width + 20;
    ctx.fillStyle = PAPER; ctx.fillRect(x + w / 2 - tw / 2, y + 2, tw, titleH - 4);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(title, x + w / 2, y + titleH * 0.68); ctx.textAlign = 'left';
    ctx.fillStyle = PAPER; ctx.fillRect(x + 8, y + 5, titleH - 10, titleH - 10); ctx.strokeRect(x + 9, y + 6, titleH - 12, titleH - 12);
  }
  if (scrollbar) { const sx = x + w - 16; ctx.fillStyle = dither(ctx, 50); ctx.fillRect(sx, y + titleH, 16, h - titleH); ctx.fillStyle = INK; ctx.fillRect(sx, y + titleH, 2, h - titleH); ctx.fillStyle = PAPER; ctx.fillRect(sx + 3, y + titleH + 10, 11, 40); ctx.strokeRect(sx + 3, y + titleH + 10, 11, 40); }
}
export function textLines(ctx, lines, x, y, size = 16, lh = 1.5, weight = 400, family = 'Inter') {
  ctx.fillStyle = INK; ctx.font = `${weight} ${size}px ${family}`; ctx.textAlign = 'left';
  lines.forEach((l, i) => { if (!l) return; if (l.startsWith('#')) { ctx.font = `700 ${size * 1.15}px ${family}`; ctx.fillText(l.slice(1), x, y + i * size * lh); ctx.font = `${weight} ${size}px ${family}`; } else ctx.fillText(l, x, y + i * size * lh); });
}
// ---- icons: all drawn inside the square [x, x+s] × [y, y+s]
export function iconDoc(ctx, x, y, s, { lines = true, fill = PAPER } = {}) {
  const w = s * 0.76, h = s * 0.98, f = s * 0.26, x0 = x + (s - w) / 2, y0 = y + (s - h) / 2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + w - f, y0); ctx.lineTo(x0 + w, y0 + f); ctx.lineTo(x0 + w, y0 + h); ctx.lineTo(x0, y0 + h); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw(s); ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0 + w - f, y0); ctx.lineTo(x0 + w - f, y0 + f); ctx.lineTo(x0 + w, y0 + f); ctx.stroke();
  if (lines) { ctx.fillStyle = INK; const t = Math.max(1, s / 30); for (let i = 0; i < 5; i++) ctx.fillRect(x0 + s * 0.11, y0 + s * (0.4 + i * 0.1), w - s * 0.22 - (i === 4 ? s * 0.22 : 0), t); }
}
export function iconPad(ctx, x, y, s) { iconDoc(ctx, x + s * 0.06, y - s * 0.03, s, { lines: false }); iconDoc(ctx, x, y + s * 0.03, s); }
export function iconFolder(ctx, x, y, s, { fill = PAPER } = {}) {
  const bx = x + s * 0.04, by = y + s * 0.26, bw = s * 0.92, bh = s * 0.56, tabW = s * 0.42, tabH = s * 0.1;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - tabH); ctx.lineTo(bx + tabW - tabH * 0.8, by - tabH); ctx.lineTo(bx + tabW, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw(s); ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, by + s * 0.1); ctx.lineTo(bx + bw, by + s * 0.1); ctx.stroke();
}
export function iconTray(ctx, x, y, s, dir = 'in') {
  const fx = x + s * 0.06, fy = y + s * 0.6, fw = s * 0.66, fh = s * 0.26, dx = s * 0.2, dy = s * 0.16; ctx.lineWidth = lw(s); ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + dx, fy - dy); ctx.lineTo(fx + dx + fw, fy - dy); ctx.lineTo(fx + fw, fy); ctx.closePath(); ctx.fillStyle = dither(ctx, 50); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx + fw, fy); ctx.lineTo(fx + fw + dx, fy - dy); ctx.lineTo(fx + fw + dx, fy - dy + fh); ctx.lineTo(fx + fw, fy + fh); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.fillRect(fx, fy, fw, fh); ctx.strokeRect(fx, fy, fw, fh);
  const ax = fx + dx * 0.5 + fw * 0.5, a0 = y + s * 0.06, a1 = fy - dy - s * 0.05;
  ctx.beginPath(); ctx.moveTo(ax, a0); ctx.lineTo(ax, a1); ctx.stroke();
  const hy = dir === 'in' ? a1 : a0, sgn = dir === 'in' ? -1 : 1, hs = s * 0.1;
  ctx.beginPath(); ctx.moveTo(ax, hy); ctx.lineTo(ax - hs, hy + sgn * hs); ctx.lineTo(ax + hs, hy + sgn * hs); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
}
export function iconPrinter(ctx, x, y, s) {
  ctx.lineWidth = lw(s); ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.52); ctx.lineTo(x + s * 0.4, y + s * 0.08); ctx.lineTo(x + s * 0.86, y + s * 0.08); ctx.lineTo(x + s * 0.76, y + s * 0.52); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; const t = Math.max(1, s / 30); for (let i = 0; i < 3; i++) ctx.fillRect(x + s * (0.45 - i * 0.025), y + s * (0.18 + i * 0.1), s * 0.3, t);
  ctx.fillStyle = PAPER; ctx.fillRect(x + s * 0.06, y + s * 0.52, s * 0.88, s * 0.36); ctx.strokeRect(x + s * 0.06, y + s * 0.52, s * 0.88, s * 0.36);
  ctx.fillStyle = INK; ctx.fillRect(x + s * 0.16, y + s * 0.62, s * 0.56, s * 0.05); ctx.fillRect(x + s * 0.78, y + s * 0.62, s * 0.08, s * 0.05);
  ctx.fillStyle = dither(ctx, 50); ctx.fillRect(x + s * 0.06, y + s * 0.74, s * 0.88, s * 0.14);
}
export function iconTrash(ctx, x, y, s) {
  ctx.lineWidth = lw(s); ctx.strokeStyle = INK;
  ctx.fillStyle = PAPER; ctx.fillRect(x + s * 0.42, y + s * 0.05, s * 0.16, s * 0.08); ctx.strokeRect(x + s * 0.42, y + s * 0.05, s * 0.16, s * 0.08);
  ctx.fillRect(x + s * 0.16, y + s * 0.12, s * 0.68, s * 0.1); ctx.strokeRect(x + s * 0.16, y + s * 0.12, s * 0.68, s * 0.1);
  ctx.beginPath(); ctx.moveTo(x + s * 0.22, y + s * 0.22); ctx.lineTo(x + s * 0.78, y + s * 0.22); ctx.lineTo(x + s * 0.72, y + s * 0.95); ctx.lineTo(x + s * 0.28, y + s * 0.95); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
  ctx.beginPath(); for (let i = 1; i <= 4; i++) { const k = i / 5; const x0 = x + s * (0.22 + 0.56 * k), x1 = x + s * (0.28 + 0.44 * k); ctx.moveTo(x0, y + s * 0.28); ctx.lineTo(x1, y + s * 0.89); } ctx.stroke();
}
export function iconDisk(ctx, x, y, s) {
  ctx.lineWidth = lw(s); ctx.strokeStyle = INK; ctx.fillStyle = PAPER;
  ctx.fillRect(x + s * 0.12, y + s * 0.08, s * 0.76, s * 0.84); ctx.strokeRect(x + s * 0.12, y + s * 0.08, s * 0.76, s * 0.84);
  ctx.strokeRect(x + s * 0.26, y + s * 0.56, s * 0.48, s * 0.3); ctx.fillStyle = INK; ctx.fillRect(x + s * 0.36, y + s * 0.08, s * 0.28, s * 0.22); ctx.fillStyle = PAPER; ctx.fillRect(x + s * 0.5, y + s * 0.12, s * 0.08, s * 0.14);
}
export function cursorArrow(ctx, x, y, k = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.5, 13.5); ctx.lineTo(7.5, 20); ctx.lineTo(10.5, 18.6); ctx.lineTo(7.5, 12.5); ctx.lineTo(12.5, 12); ctx.closePath();
  ctx.fillStyle = INK; ctx.fill(); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.6; ctx.lineJoin = 'miter'; ctx.stroke(); ctx.restore();
}
// Classic "zoom" transition: dotted outlines travelling from rect r0 to rect r1 (k 0..1)
export function zoomRects(ctx, r0, r1, k) {
  ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = INK;
  for (const d of [0, -0.14, -0.28]) { const kk = clamp(k + d); if (kk <= 0) continue; const e = easeOut(kk); ctx.strokeRect(lerp(r0[0], r1[0], e), lerp(r0[1], r1[1], e), lerp(r0[2], r1[2], e), lerp(r0[3], r1[3], e)); }
  ctx.restore();
}
export function label(ctx, str, cx, y, size = 14) { ctx.fillStyle = INK; ctx.font = `500 ${size}px Inter`; ctx.textAlign = 'center'; ctx.fillText(str, cx, y); ctx.textAlign = 'left'; }
export function labelW(ctx, str, size = 14) { ctx.font = `500 ${size}px Inter`; return ctx.measureText(str).width; }

// ───────────────────────── the four screens (pure functions of a state object) ─────────────────────────
const ALTO_MEMO = ['#Memo', '', 'To:  Display group', 'From:  Research staff', 'Subject:  Window layout', '', 'The page is shown as it will print:', 'headings, body text and figures are', 'drawn point by point on the display.', '', 'Each window shows one document.', 'Windows may be moved, sized and', 'layered on top of one another.', '', 'The pointer follows the hand.', 'Select by pointing, then pressing', 'a mouse button.'];
export const ALTO_CMDS = [{ s: 'Open', x: 30 }, { s: 'Edit', x: 120 }, { s: 'Find', x: 200 }, { s: 'Print', x: 282 }, { s: 'Quit', x: 372 }];
export const ALTO_WIN2 = [150, 330, 428, 420];
export function drawAlto(ctx, st) {
  paper(ctx, 606, 808);
  ctx.font = '600 19px Inter'; ctx.fillStyle = INK; for (const c of ALTO_CMDS) ctx.fillText(c.s, c.x, 30);
  ctx.fillRect(0, 44, 606, 2);
  if (st.press) { const c = ALTO_CMDS[0]; invert(ctx, c.x - 8, 10, 68, 28); }
  win(ctx, 24, 66, 558, 560, 'Memo', { style: 'bar', titleH: 30, font: 17, scrollbar: true });
  textLines(ctx, ALTO_MEMO, 44, 136, 19, 1.42);
  if (st.win2 > 0 && st.win2 < 1) zoomRects(ctx, [ALTO_CMDS[0].x - 8, 10, 68, 28], ALTO_WIN2, st.win2);
  if (st.win2 >= 1) {
    const [x, y, w, h] = ALTO_WIN2; win(ctx, x, y, w, h, 'Drawing', { style: 'bar', titleH: 30, font: 17 });
    // tool strip
    ctx.fillStyle = INK; ctx.fillRect(x + 2, y + 30, 44, h - 32); ctx.fillStyle = PAPER; for (let i = 0; i < 6; i++) ctx.fillRect(x + 10, y + 42 + i * 40, 28, 28);
    ctx.fillStyle = INK; ctx.fillRect(x + 16, y + 48, 16, 16); ctx.beginPath(); ctx.arc(x + 24, y + 96, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 12, y + 150); ctx.lineTo(x + 36, y + 126); ctx.stroke();
    // the drawing itself
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(x + 90, y + 80, 170, 120);
    ctx.beginPath(); ctx.arc(x + 300, y + 150, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 90, y + 260); ctx.lineTo(x + 380, y + 360); ctx.stroke();
    ctx.fillStyle = dither(ctx, 50); ctx.fillRect(x + 120, y + 250, 120, 80); ctx.strokeRect(x + 120, y + 250, 120, 80);
    ctx.fillStyle = INK; ctx.fillRect(x + 90, y + 80 + 120 - 4, 170, 4);
  }
  if (st.showCursor !== false) cursorArrow(ctx, st.cx, st.cy, 1.3);
}

export const STAR_ICONS = [
  { kind: 'doc', name: 'Report' }, { kind: 'doc', name: 'Letter' }, { kind: 'folder', name: 'Projects' },
  { kind: 'in', name: 'In Basket' }, { kind: 'out', name: 'Out Basket' }, { kind: 'printer', name: 'Printer' },
];
export const starIconRect = (i) => [884, 62 + i * 122, 112, 108];
const STAR_TEXT = ['#Quarterly report', '', 'Summary', 'The new system places documents,', 'folders and devices on one surface.', 'Work is organised the way a desk is:', 'papers are picked up, moved and put', 'down again.', '', 'Printing', 'To print, move a document onto the', 'printer. To send it, move it to the', 'out basket. Incoming mail waits in the', 'in basket.', '', 'Filing', 'Documents are kept in folders; folders', 'may be kept in other folders.'];
export function drawStar(ctx, st) {
  paper(ctx, 1024, 808);
  // faint desktop texture (sparse dither) is period-typical; keep paper clean for legibility
  win(ctx, 36, 48, 560, 712, 'Quarterly report', { style: 'bar', titleH: 32, font: 18, scrollbar: true });
  textLines(ctx, STAR_TEXT, 60, 122, 19, 1.5);
  // a small drawing frame inside the report
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(330, 560, 220, 150); ctx.fillStyle = dither(ctx, 50); ctx.fillRect(350, 650, 40, 50); ctx.fillRect(410, 610, 40, 90); ctx.fillRect(470, 590, 40, 110); ctx.fillStyle = INK;
  STAR_ICONS.forEach((ic, i) => {
    const [x, y, w, h] = starIconRect(i); const s = 64, ix = x + (w - s) / 2, iy = y + 4;
    if (ic.kind === 'doc') iconDoc(ctx, ix, iy, s); else if (ic.kind === 'folder') iconFolder(ctx, ix, iy, s, { fill: dither(ctx, 25) }); else if (ic.kind === 'in') iconTray(ctx, ix, iy, s, 'in'); else if (ic.kind === 'out') iconTray(ctx, ix, iy, s, 'out'); else iconPrinter(ctx, ix, iy, s);
    label(ctx, ic.name, x + w / 2, y + s + 30, 16);
    if (st.sel === i || (st.flash && i === 5)) invert(ctx, x, y, w, h);
  });
  if (st.drag) { ctx.save(); ctx.globalAlpha = 0.9; ctx.setLineDash([3, 3]); iconDoc(ctx, st.drag.x - 32, st.drag.y - 32, 64, { lines: false }); ctx.restore(); }
  if (st.showCursor !== false) cursorArrow(ctx, st.cx, st.cy, 1.5);
}

export const LISA_ICONS = [{ kind: 'pad', name: 'Letter' }, { kind: 'pad', name: 'Memo' }, { kind: 'folder', name: 'Projects' }];
export const lisaIconRect = (i) => [30, 60 + i * 120, 120, 104];
export const LISA_TRASH = [850, 598, 96, 100];
const LISA_TEXT = ['#Letter', '', 'Dear colleague,', '', 'The desk you see on this screen works', 'like the one in front of you. Pick a', 'document up, open it, read it, put it', 'away in a folder.', '', 'When a paper is no longer needed,', 'drop it in the wastebasket.', '', 'Yours,'];
export function drawLisa(ctx, st) {
  paper(ctx, 960, 720);
  ctx.font = '600 18px Inter'; ctx.fillStyle = INK; let mx = 24; for (const m of ['File/Print', 'Edit', 'Housekeeping']) { ctx.fillText(m, mx, 26); mx += ctx.measureText(m).width + 36; }
  ctx.fillRect(0, 38, 960, 2);
  LISA_ICONS.forEach((ic, i) => { const [x, y, w, h] = lisaIconRect(i); const s = 60, ix = x + (w - s) / 2, iy = y + 2; if (ic.kind === 'pad') iconPad(ctx, ix, iy, s); else iconFolder(ctx, ix, iy, s); label(ctx, ic.name, x + w / 2, y + s + 28, 16); if (st.sel === i) invert(ctx, x, y, w, h); });
  win(ctx, 210, 84, 600, 500, 'Letter', { style: 'bar', titleH: 30, font: 17, scrollbar: true });
  textLines(ctx, LISA_TEXT, 236, 150, 19, 1.5);
  iconDisk(ctx, 870, 56, 60); label(ctx, 'Disk', 900, 146, 16);
  { const [x, y, w, h] = LISA_TRASH; iconTrash(ctx, x + (w - 64) / 2, y + 2, 64); label(ctx, 'Wastebasket', x + w / 2, y + 94, 16); if (st.hoverTrash) invert(ctx, x, y, w, h); }
  if (st.showCursor !== false) cursorArrow(ctx, st.cx, st.cy, 1.5);
}

// Macintosh desktop, 512×342. Drawn at native scale; the overlay re-draws it crisply at any size via ctx.scale.
export const MAC_MENU = ['New Folder', 'Open', 'Print', 'Close', 'Get Info', 'Duplicate', 'Eject'];
export const MAC_WIN1 = [56, 48, 300, 186];
export const MAC_FOLDER = [96, 136, 56, 70];   // icon slot incl. label
export const MAC_TRASH = [436, 262, 60, 74];
export const MAC_FWIN = [6, 28, 500, 308];
export const MAC_ICON = 44;
// the "landscape" of connected documents inside the opened folder
export const NET = (() => {
  const names = ['Notes', 'Letter', 'Memo', 'Budget', 'Plan', 'Draft', 'List', 'Report', 'Sketch'];
  const nodes = names.map((name, i) => { const col = i % 3, row = Math.floor(i / 3); const j = i === 4 ? 0 : 1; return { name, x: 256 + (col - 1) * 150 + (hash(i + 0.13) - 0.5) * 44 * j, y: 182 + (row - 1) * 92 + (hash(i + 0.71) - 0.5) * 30 * j }; });
  const edges = []; for (let i = 0; i < 9; i++) { if (i % 3 < 2) edges.push([i, i + 1]); if (i < 6) edges.push([i, i + 3]); } edges.push([0, 4], [4, 8], [2, 4], [4, 6]);
  return { nodes, edges };
})();
export function drawMac(ctx, st) {
  paper(ctx, 512, 342);
  // menu bar
  ctx.font = '600 13px Inter'; ctx.fillStyle = INK; const menuX = [14, 52, 90, 128]; ['File', 'Edit', 'View', 'Special'].forEach((m, i) => ctx.fillText(m, menuX[i], 14));
  ctx.fillRect(0, 20, 512, 1.5);
  iconDisk(ctx, 460, 28, 36); label(ctx, 'Disk', 478, 76, 10);
  // window 1 (Documents) — zooms shut when win1 < 1
  if (st.win1 >= 1) {
    const [x, y, w, h] = MAC_WIN1; win(ctx, x, y, w, h, 'Documents', { style: 'lines', titleH: 19, font: 12, scrollbar: true });
    ctx.fillStyle = INK; ctx.font = '400 10px Inter'; ctx.fillText('3 items', x + 10, y + 32); ctx.fillRect(x + 2, y + 38, w - 4, 1);
    ['Letter', 'Notes', 'Memo'].forEach((n, i) => { const ix = x + 28 + i * 86, iy = y + 56; iconDoc(ctx, ix, iy, 38); label(ctx, n, ix + 19, iy + 54, 10); });
  } else if (st.win1 > 0) zoomRects(ctx, MAC_WIN1, [MAC_WIN1[0] + 130, MAC_WIN1[1] + 80, 40, 26], 1 - st.win1);
  // folder icon (arrives by morph)
  if (st.folderK > 0) {
    const [x, y, w] = MAC_FOLDER; const s = MAC_ICON * clamp(st.folderK), cx = x + w / 2, cy = y + MAC_ICON / 2;
    iconFolder(ctx, cx - s / 2, cy - s / 2, s);
    if (st.folderK >= 1) label(ctx, 'Folder', cx, y + MAC_ICON + 14, 10);
    if (st.folderSel) invert(ctx, x - 4, y - 2, w + 8, MAC_ICON + 20);
  }
  // trash (arrives by morph)
  if (st.trashK > 0) {
    const [x, y, w] = MAC_TRASH; const s = MAC_ICON * clamp(st.trashK), cx = x + w / 2, cy = y + MAC_ICON / 2;
    iconTrash(ctx, cx - s / 2, cy - s / 2, s);
    if (st.trashK >= 1) label(ctx, 'Trash', cx, y + MAC_ICON + 14, 10);
  }
  // the File menu
  if (st.menu > 0) {
    const mx = 8, my = 20, mw = 108, ih = 18, mh = MAC_MENU.length * ih + 8;
    invert(ctx, menuX[0] - 8, 2, 36, 18);
    ctx.save(); ctx.beginPath(); ctx.rect(mx - 2, my, mw + 6, mh * clamp(st.menu) + 4); ctx.clip();
    ctx.fillStyle = PAPER; ctx.fillRect(mx, my, mw, mh); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.strokeRect(mx + 0.75, my + 0.75, mw - 1.5, mh - 1.5);
    ctx.fillStyle = INK; ctx.fillRect(mx + 2, my + mh, mw, 2); ctx.fillRect(mx + mw, my + 2, 2, mh); // drop shadow
    ctx.font = '400 12px Inter'; MAC_MENU.forEach((m, i) => { ctx.fillStyle = INK; ctx.fillText(m, mx + 12, my + 6 + ih * (i + 0.72)); });
    if (st.menuSel >= 0) invert(ctx, mx + 1, my + 5 + ih * st.menuSel, mw - 2, ih);
    ctx.restore();
  }
  // the folder window opening → the connected documents
  if (st.fwin > 0 && st.fwin < 1) zoomRects(ctx, [MAC_FOLDER[0], MAC_FOLDER[1], MAC_FOLDER[2], MAC_ICON], MAC_FWIN, st.fwin);
  if (st.fwin >= 1) {
    const [x, y, w, h] = MAC_FWIN; win(ctx, x, y, w, h, 'Folder', { style: 'lines', titleH: 19, font: 12 });
    ctx.fillStyle = INK; ctx.font = '400 10px Inter'; ctx.fillText('9 items', x + 10, y + 32); ctx.fillRect(x + 2, y + 38, w - 4, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 40, w - 4, h - 42); ctx.clip();
    const z = st.zoom || 1; ctx.translate(256, 182); ctx.scale(z, z); ctx.translate(-256, -182);
    ctx.lineWidth = 1.5 / Math.sqrt(z); ctx.strokeStyle = INK; ctx.beginPath(); for (const [a, b] of NET.edges) { const A = NET.nodes[a], B = NET.nodes[b]; ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); } ctx.stroke();
    for (const n of NET.nodes) { const s = 36; ctx.fillStyle = PAPER; ctx.fillRect(n.x - s * 0.42, n.y - s * 0.52, s * 0.84, s * 1.04); iconDoc(ctx, n.x - s / 2, n.y - s / 2, s); const lwid = labelW(ctx, n.name, 10) + 6; ctx.fillStyle = PAPER; ctx.fillRect(n.x - lwid / 2, n.y + s * 0.56, lwid, 12); label(ctx, n.name, n.x, n.y + s * 0.56 + 10, 10); }
    ctx.restore();
  }
  if (st.showCursor !== false) cursorArrow(ctx, st.cx, st.cy, 1);
}
