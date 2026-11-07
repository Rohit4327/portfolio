// SCENE 06 helpers — the 1988 book, the NeXT workstation (cube + monochrome monitor), the NeXTSTEP-style screen pages,
// the 3D network of ivory document cards, the burst network for the hand-off, and the 2D diagram / timeline strip.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { hash, lerp, clamp, seg, easeOut, easeInOut, fadeIO } from '../lib/util.js';
import { mat, roundedBox, box, cylinder, plane, makeScreen } from '../lib/props.js';
import { text, caps, roundRect, measure } from '../lib/gfx.js';

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------------------------------------------------------------- the book (1988) ----------------------------------
function drawCover(x, w, h) {
  x.fillStyle = '#F3EEE2'; x.fillRect(0, 0, w, h);
  // subtle cloth texture: faint deterministic speckle
  x.fillStyle = 'rgba(0,0,0,0.035)'; for (let i = 0; i < 2600; i++) x.fillRect(hash(i + 0.1) * w, hash(i + 0.7) * h, 1.5, 1.5);
  x.fillStyle = PALETTE.amber; x.fillRect(64, 118, 70, 3);
  x.fillStyle = '#12161E'; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  x.font = '600 54px Inter'; x.letterSpacing = '5px';
  ['THE PSYCHOLOGY', 'OF EVERYDAY', 'THINGS'].forEach((l, i) => x.fillText(l, 64, 212 + i * 70));
  x.font = '500 28px Inter'; x.letterSpacing = '4px'; x.fillText('DONALD A. NORMAN', 64, 560);
  x.fillStyle = '#6E7078'; x.font = '400 26px Inter'; x.letterSpacing = '3px'; x.fillText('1988', 64, 612);
}
function drawTitlePage(x, w, h) {
  x.fillStyle = '#F6F2E8'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#2A2F3A'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = '500 26px Inter'; x.letterSpacing = '4px';
  x.fillText('THE PSYCHOLOGY', w / 2, 230); x.fillText('OF EVERYDAY THINGS', w / 2, 270);
  x.fillStyle = PALETTE.amber; x.fillRect(w / 2 - 22, 300, 44, 2);
  x.fillStyle = '#5B6069'; x.font = '400 22px Inter'; x.letterSpacing = '3px'; x.fillText('DONALD A. NORMAN', w / 2, 346);
}
export function makeBook({ w = 0.16, d = 0.235, h = 0.03 } = {}) {
  const g = new THREE.Group(); const coverT = 0.004;
  const cloth = mat.std(0xEDE6D6, { roughness: 0.92 }); const pageMat = mat.std(0xF2EDE1, { roughness: 0.95 });
  const back = box(w, coverT, d, cloth); back.position.set(0, coverT / 2, 0); g.add(back);
  const ph = h - 2 * coverT; const pages = box(w - 0.004, ph, d - 0.006, pageMat); pages.position.set(-0.002, coverT + ph / 2, 0); g.add(pages);
  const titlePage = plane(w - 0.006, d - 0.008, new THREE.MeshStandardMaterial({ map: canvasTex(512, 752, drawTitlePage), roughness: 0.95 }));
  titlePage.rotation.x = -Math.PI / 2; titlePage.position.set(-0.002, coverT + ph + 0.0004, 0); g.add(titlePage);
  const spine = cylinder(h / 2, h / 2, d, cloth, 24); spine.rotation.x = Math.PI / 2; spine.position.set(-w / 2, h / 2, 0); g.add(spine);
  const pivot = new THREE.Group(); pivot.position.set(-w / 2, h - coverT, 0); g.add(pivot);
  const front = box(w, coverT, d, cloth); front.position.set(w / 2, coverT / 2, 0); pivot.add(front);
  const face = plane(w - 0.002, d - 0.002, new THREE.MeshStandardMaterial({ map: canvasTex(512, 752, drawCover), roughness: 0.88 }));
  face.rotation.x = -Math.PI / 2; face.position.set(w / 2, coverT + 0.0004, 0); pivot.add(face);
  g.open = (k) => { k = clamp(k); pivot.rotation.z = Math.PI * k; pivot.position.y = lerp(h - coverT, coverT + 0.006, k); pivot.position.x = -w / 2 - 0.006 * k; };
  g.userData.size = { w, d, h };
  return g;
}

// ---------------------------------------------------------------- the NeXT workstation ----------------------------
export function makeNeXT() {
  const g = new THREE.Group();
  const black = mat.std(0x16181c, { roughness: 0.55, metalness: 0.2 });
  const black2 = mat.std(0x0f1114, { roughness: 0.65, metalness: 0.1 });
  const key = mat.std(0x1d2026, { roughness: 0.6 });
  // the cube (approx 30 cm matte black magnesium)
  const cubeG = new THREE.Group();
  const cube = roundedBox(0.305, 0.305, 0.305, 0.004, black); cube.position.set(0, 0.1525, 0); cubeG.add(cube);
  const slot = box(0.1, 0.004, 0.004, mat.std(0x05060a)); slot.position.set(-0.03, 0.255, 0.1525); cubeG.add(slot);
  const slot2 = box(0.1, 0.004, 0.004, mat.std(0x05060a)); slot2.position.set(-0.03, 0.225, 0.1525); cubeG.add(slot2);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, 0.002), mat.cyanGlow(0.8)); led.position.set(0.11, 0.03, 0.1525); cubeG.add(led);
  g.add(cubeG); g.cube = cubeG;
  // the monitor: tilt base, neck, bezel frame with a recessed screen, tapered back
  const mon = new THREE.Group();
  const base = roundedBox(0.30, 0.03, 0.26, 0.006, black); base.position.set(0, 0.015, 0.02); mon.add(base);
  const neck = roundedBox(0.16, 0.06, 0.14, 0.012, black2); neck.position.set(0, 0.055, 0.0); mon.add(neck);
  const fw = 0.42, fh = 0.40, fd = 0.11, ow = 0.346, oh = 0.262, bot = 0.09, top = fh - oh - bot; // frame outer, opening
  const cy = 0.09 + fh / 2; // housing centre y
  const openCy = cy - fh / 2 + bot + oh / 2;
  const fz = 0.07; // housing centre z (front face at fz + fd/2)
  const tb = box(fw, top, fd, black); tb.position.set(0, cy + fh / 2 - top / 2, fz); mon.add(tb);
  const bb = box(fw, bot, fd, black); bb.position.set(0, cy - fh / 2 + bot / 2, fz); mon.add(bb);
  const sw = (fw - ow) / 2;
  const lb = box(sw, oh, fd, black); lb.position.set(-fw / 2 + sw / 2, openCy, fz); mon.add(lb);
  const rb = box(sw, oh, fd, black); rb.position.set(fw / 2 - sw / 2, openCy, fz); mon.add(rb);
  const backBox = roundedBox(0.34, 0.33, 0.27, 0.012, black2); backBox.position.set(0, cy, fz - fd / 2 - 0.13); mon.add(backBox);
  const plate = box(ow, oh, 0.01, mat.std(0x08090c, { roughness: 0.3 })); plate.position.set(0, openCy, fz + fd / 2 - 0.02); mon.add(plate);
  const scr = makeScreen(0.336, 0.252, 1536, 1152, { curve: 0.004 });
  scr.mesh.position.set(0, openCy, fz + fd / 2 - 0.013); mon.add(scr.mesh);
  // small controls on the bottom bezel
  for (let i = 0; i < 2; i++) { const k = cylinder(0.006, 0.006, 0.004, mat.std(0x2a2d33), 16); k.rotation.x = Math.PI / 2; k.position.set(0.12 + i * 0.03, cy - fh / 2 + 0.03, fz + fd / 2 + 0.002); mon.add(k); }
  g.add(mon); g.monitor = mon; g.screen = scr;
  // keyboard: slab + instanced keycaps + space bar
  const kb = new THREE.Group();
  const slab = roundedBox(0.44, 0.022, 0.17, 0.006, black); slab.position.set(0, 0.011, 0); kb.add(slab);
  const cols = 15, rows = 5, pitch = 0.0205;
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.017, 0.006, 0.017), key, cols * rows);
  const M = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { M.makeTranslation((c - (cols - 1) / 2) * pitch - 0.035, 0.025, (r - (rows - 1) / 2) * pitch - 0.012); inst.setMatrixAt(n++, M); }
  inst.castShadow = true; inst.receiveShadow = true; kb.add(inst);
  const space = box(0.12, 0.006, 0.017, key); space.position.set(-0.035, 0.025, 2.5 * pitch - 0.012); kb.add(space);
  const numpad = new THREE.InstancedMesh(new THREE.BoxGeometry(0.017, 0.006, 0.017), key, 12);
  n = 0; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { M.makeTranslation(0.15 + (c - 1) * pitch, 0.025, (r - 1.5) * pitch - 0.012); numpad.setMatrixAt(n++, M); }
  numpad.castShadow = true; kb.add(numpad);
  kb.rotation.x = -0.05; g.add(kb); g.keyboard = kb;
  const mouse = roundedBox(0.062, 0.028, 0.1, 0.012, black); mouse.position.set(0, 0.014, 0); g.add(mouse); g.mouse = mouse;
  return g;
}

// ---------------------------------------------------------------- NeXTSTEP-style monochrome screen ------------------
const C = { desk: '#8a8a8a', win: '#ededed', title: '#2c2c2c', ink: '#141414', mid: '#6c6c6c', light: '#c6c6c6', scroll: '#b4b4b4', bar: '#b9b9b9' };
const R = (t, id = null) => ({ t, id });
export const PAGES = [
  { title: 'World Wide Web', heading: 'World Wide Web', blocks: [
    { p: [R('The World Wide Web joins documents held on many computers into one navigable space. Words that are '), R('underlined', 'u'), R(' are links: select one to move to another document.')] },
    { li: [R('What is hypertext?', 'hypertext'), R(' — an introduction')] },
    { li: [R('Documents', 'docs'), R(' — pointers to information available on the web')] },
    { li: [R('People', 'people'), R(' — who is working on the project')] },
    { li: [R('Help', 'help'), R(' — using this browser')] },
  ] },
  { title: 'Hypertext', heading: 'Hypertext', blocks: [
    { p: [R('Hypertext is text with links. A link joins one document to another, so a reader can move from page to page in any order — within one machine, or across the whole '), R('network', 'network'), R('.')] },
    { p: [R('A document may point to many others, and be pointed to from many others. There is no fixed beginning, and no end.')] },
    { li: [R('Documents', 'docs'), R(' — information reachable by following links')] },
    { li: [R('People', 'people'), R(' — who is working on the project')] },
  ] },
  { title: 'Documents on the network', heading: 'Documents on the network', blocks: [
    { p: [R('Information held on many computers, reachable by following links:')] },
    { li: [R('Technical notes', 'tech'), R(' — protocols, formats and software')] },
    { li: [R('Project pages', 'projects'), R(' — the groups and their work')] },
    { li: [R('Experiment documents', 'exp'), R(' — reports, logs and data')] },
    { li: [R('People', 'people'), R(' — who is working on what')] },
  ] },
];

// Lays out runs with word wrap. draw=false only measures. Returns { y, links:[{id,x,y,w,h}] } (link rects are per line).
function runs(ctx, items, x, y, maxW, lh, font, draw, state, hiId) {
  ctx.font = font; let cx = x, cy = y; const links = []; let cur = null;
  const flush = () => { if (cur) { cur.w = cx - cur.x; links.push(cur); cur = null; } };
  for (const run of items) {
    const words = run.t.split(/(\s+)/);
    for (const wd of words) {
      if (!wd) continue; const ww = ctx.measureText(wd).width;
      if (wd.trim() && cx + ww > x + maxW) { flush(); cx = x; cy += lh; }
      if (run.id && !cur && wd.trim()) cur = { id: run.id, x: cx, y: cy - lh * 0.72, h: lh * 0.92 };
      if (draw) {
        const pressed = run.id && state.pressed === run.id;
        ctx.fillStyle = pressed ? '#f4f4f4' : C.ink; ctx.fillText(wd, cx, cy);
        if (run.id && wd.trim()) { ctx.fillStyle = pressed ? '#f4f4f4' : C.ink; ctx.fillRect(cx, cy + 7, ww, run.id === hiId ? 4 : 2.5); }
      }
      cx += ww;
    }
    flush();
  }
  return { y: cy, links };
}
function drawChrome(ctx, Wpx, Hpx, title) {
  ctx.fillStyle = C.desk; ctx.fillRect(0, 0, Wpx, Hpx);
  // application menu (top-left) and dock (right): neutral grey stand-ins, no text
  ctx.fillStyle = C.title; ctx.fillRect(26, 26, 214, 46);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = '#d4d4d4'; ctx.fillRect(26, 74 + i * 48, 214, 46); ctx.fillStyle = '#5a5a5a'; ctx.fillRect(40, 74 + i * 48 + 18, 60 + (i * 37) % 70, 10); }
  for (let i = 0; i < 5; i++) { ctx.fillStyle = '#a4a4a4'; ctx.fillRect(Wpx - 118, 26 + i * 104, 92, 92); ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.strokeRect(Wpx - 118, 26 + i * 104, 92, 92); ctx.fillStyle = '#6c6c6c'; ctx.fillRect(Wpx - 118 + 26, 26 + i * 104 + 26, 40, 40); }
  const wx = 290, wy = 64, ww = 1180, wh = 1036;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(wx + 12, wy + 14, ww, wh);
  ctx.fillStyle = '#000'; ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
  ctx.fillStyle = C.title; ctx.fillRect(wx, wy, ww, 50);
  ctx.fillStyle = '#e8e8e8'; ctx.font = '500 28px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px'; ctx.fillText(title, wx + ww / 2, wy + 25);
  ctx.fillStyle = '#bdbdbd'; ctx.fillRect(wx + 14, wy + 14, 22, 22); ctx.fillRect(wx + ww - 36, wy + 14, 22, 22);
  ctx.fillStyle = C.title; ctx.fillRect(wx + 19, wy + 19, 12, 12); ctx.fillRect(wx + ww - 31, wy + 24, 12, 2);
  ctx.fillStyle = C.win; ctx.fillRect(wx, wy + 50, ww, wh - 50);
  ctx.fillStyle = C.scroll; ctx.fillRect(wx, wy + 50, 30, wh - 50);
  ctx.fillStyle = '#e4e4e4'; ctx.fillRect(wx + 6, wy + 72, 18, 300); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.strokeRect(wx + 6, wy + 72, 18, 300);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  return { x0: wx + 30 + 64, y0: wy + 50 + 92, cw: ww - 30 - 128 };
}
// state: { mode:'proposal'|'web', page, hover:id|null, pressed:id|null }
export function drawNextScreen(ctx, Wpx, Hpx, state) {
  if (state.mode === 'proposal') {
    const { x0, y0, cw } = drawChrome(ctx, Wpx, Hpx, 'Information Management: A Proposal');
    ctx.fillStyle = C.ink; ctx.font = '600 54px Inter'; ctx.fillText('Information Management:', x0, y0); ctx.fillText('A Proposal', x0, y0 + 64);
    ctx.fillStyle = C.mid; ctx.font = '400 30px Inter'; ctx.fillText('CERN · March 1989', x0, y0 + 122);
    ctx.fillStyle = '#b4b4b4';
    for (let i = 0; i < 11; i++) { const wdt = cw * (0.62 + 0.36 * hash(i + 3.3)) * (i === 4 || i === 10 ? 0.55 : 1); roundRect(ctx, x0, y0 + 176 + i * 40, wdt, 14, 4); ctx.fill(); }
    // a generic boxes-and-arrows sketch (no labels)
    const bx = x0 + 40, by = y0 + 650; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    const nodes = [[0, 0], [250, -60], [250, 90], [520, 0], [520, 160], [140, 190]];
    const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [0, 5], [5, 4]];
    for (const [a, b] of edges) { const A = nodes[a], B = nodes[b]; ctx.beginPath(); ctx.moveTo(bx + A[0] + 70, by + A[1] + 24); ctx.lineTo(bx + B[0] + 70, by + B[1] + 24); ctx.stroke(); }
    for (const [nx, ny] of nodes) { ctx.fillStyle = C.win; roundRect(ctx, bx + nx, by + ny, 140, 48, 24); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9a9a9a'; ctx.fillRect(bx + nx + 30, by + ny + 19, 80, 10); }
    return { links: [] };
  }
  const pg = PAGES[state.page]; const { x0, y0, cw } = drawChrome(ctx, Wpx, Hpx, pg.title);
  ctx.fillStyle = C.ink; ctx.font = '600 58px Inter'; ctx.fillText(pg.heading, x0, y0);
  ctx.fillStyle = C.ink; ctx.fillRect(x0, y0 + 26, cw, 2);
  let y = y0 + 104; const links = []; const body = '400 36px Inter', lh = 50;
  for (const b of pg.blocks) {
    if (b.p) { const m = runs(ctx, b.p, x0, y, cw, lh, body, false, state); drawHighlight(ctx, m.links, state); const r = runs(ctx, b.p, x0, y, cw, lh, body, true, state, state.hover); links.push(...r.links); y = r.y + lh + 22; }
    if (b.li) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x0 + 22, y - 12, 6, 0, Math.PI * 2); ctx.fill(); const m = runs(ctx, b.li, x0 + 56, y, cw - 56, lh, body, false, state); drawHighlight(ctx, m.links, state); const r = runs(ctx, b.li, x0 + 56, y, cw - 56, lh, body, true, state, state.hover); links.push(...r.links); y = r.y + lh + 6; }
  }
  return { links };
}
function drawHighlight(ctx, links, state) { for (const l of links) if (state.pressed && l.id === state.pressed) { ctx.fillStyle = C.ink; ctx.fillRect(l.x - 6, l.y - 2, l.w + 12, l.h + 8); } }

// ---------------------------------------------------------------- network of document cards -------------------------
function drawCard(x, w, h, seed) {
  x.fillStyle = '#F6F2E8'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#2A2F3A'; x.fillRect(22, 26, w * (0.42 + 0.3 * hash(seed + 1)), 9);
  x.fillStyle = PALETTE.amber; x.fillRect(22, 44, 26, 2);
  const n = 11 + Math.floor(hash(seed + 2) * 4); let y = 66;
  for (let i = 0; i < n; i++) {
    const link = hash(seed + 10 + i) < 0.18; const wd = (w - 44) * (link ? 0.3 + 0.3 * hash(seed + 30 + i) : 0.62 + 0.36 * hash(seed + 50 + i)) * ((i % 5 === 4) ? 0.55 : 1);
    x.fillStyle = link ? '#3F97D6' : '#A3A6AD'; x.fillRect(22, y, wd, 5); if (link) x.fillRect(22, y + 8, wd, 1.5);
    y += (i % 5 === 4) ? 30 : 17;
  }
}
export function cardTextures(n = 4) { const out = []; for (let i = 0; i < n; i++) out.push(canvasTex(256, 336, (x, w, h) => drawCard(x, w, h, i * 7.7 + 1))); return out; }

// Builds the drifting network: cards in a corridor-shaped volume + line links. The first `path.length` cards are the
// amber path (where the point hops).
export function makeNetwork(textures, path) {
  const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(0.32, 0.42); const cards = []; const mats = textures.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }));
  const pos = [];
  path.forEach((p) => pos.push(new THREE.Vector3(...p)));
  const N = 58;
  for (let i = pos.length; i < N; i++) {
    const z = 4 - (i / N) * 18 + (hash(i + 0.2) - 0.5) * 1.2;
    const side = hash(i + 0.5) < 0.5 ? -1 : 1; const x = side * (1.3 + hash(i + 0.9) * 3.0); const y = 0.3 + hash(i + 1.3) * 2.4;
    pos.push(new THREE.Vector3(x, y, z));
  }
  pos.forEach((p, i) => {
    const m = new THREE.Mesh(geo, mats[i % mats.length]); m.position.copy(p);
    m.rotation.set((hash(i + 2.1) - 0.5) * 0.35, (hash(i + 2.7) - 0.5) * 0.7, (hash(i + 3.3) - 0.5) * 0.12);
    if (i < path.length) m.rotation.set((hash(i + 2.1) - 0.5) * 0.12, (hash(i + 2.7) - 0.5) * 0.25, 0);
    m.castShadow = false; m.receiveShadow = false; g.add(m); cards.push(m);
  });
  // links: each card to its two nearest neighbours (cyan); the path chain (amber)
  const cyanPts = [], amberPts = [];
  for (let i = 0; i < pos.length; i++) {
    const d = pos.map((q, j) => [q.distanceTo(pos[i]), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 2);
    for (const [, j] of d) if (j > i || !(i < path.length && j < path.length)) cyanPts.push(pos[i].x, pos[i].y, pos[i].z, pos[j].x, pos[j].y, pos[j].z);
  }
  for (let i = 0; i + 1 < path.length; i++) amberPts.push(pos[i].x, pos[i].y, pos[i].z, pos[i + 1].x, pos[i + 1].y, pos[i + 1].z);
  const mk = (pts, color, opacity) => { const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false })); };
  g.add(mk(cyanPts, 0x80C9F8, 0.38)); const amber = mk(amberPts, 0xFFAB5B, 0.9); g.add(amber);
  // small cyan node dots at card centres
  const dotGeo = new THREE.SphereGeometry(0.012, 8, 8); const dotMat = mat.cyanGlow(1.2);
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, pos.length); const M = new THREE.Matrix4();
  pos.forEach((p, i) => { M.makeTranslation(p.x, p.y - 0.22, p.z + 0.002); dots.setMatrixAt(i, M); }); g.add(dots);
  g.cards = cards; g.pathPos = pos.slice(0, path.length); g.amberLines = amber;
  return g;
}

// Burst network for the hand-off: cards fly out radially from a centre; lines from the centre. call burst.set(k, cam)
export function makeBurst(textures, n = 44) {
  const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(0.24, 0.315);
  const mats = textures.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }));
  const dirs = [], cards = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const yy = 1 - (i / (n - 1)) * 2 * 0.86; const r = Math.sqrt(1 - yy * yy); const th = golden * i;
    const d = new THREE.Vector3(Math.cos(th) * r, yy, Math.sin(th) * r * 0.35 + 0.05); d.normalize(); dirs.push(d);
    const m = new THREE.Mesh(geo, mats[i % mats.length]); g.add(m); cards.push(m);
  }
  const pts = new Float32Array(n * 6); const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: 0x80C9F8, transparent: true, opacity: 0.7, toneMapped: false })); g.add(lines);
  const lines2 = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: 0xFFAB5B, transparent: true, opacity: 0.35, toneMapped: false })); lines2.scale.setScalar(0.55); g.add(lines2);
  g.set = (k, cam) => {
    const R = 0.1 + 3.6 * k;
    cards.forEach((m, i) => {
      const r = R * (0.45 + 0.55 * hash(i + 4.4)); const d = dirs[i];
      m.position.copy(d).multiplyScalar(r); const s = clamp(k * 3 - hash(i + 5.5) * 0.8); m.scale.setScalar(Math.max(0.001, s)); m.quaternion.copy(cam.quaternion);
      pts[i * 6] = 0; pts[i * 6 + 1] = 0; pts[i * 6 + 2] = 0; pts[i * 6 + 3] = m.position.x; pts[i * 6 + 4] = m.position.y; pts[i * 6 + 5] = m.position.z;
    });
    bg.attributes.position.needsUpdate = true;
  };
  return g;
}

// ---------------------------------------------------------------- 2D: nested diagram + timeline strip ----------------
export function drawDiagram(ctx, t, B, alpha) {
  if (alpha <= 0) return;
  const cx = W / 2, cy = H / 2 + 14;
  const L = [
    { label: 'INTERFACE', w: 330, h: 186, t0: B.diag1, color: PALETTE.amber },
    { label: 'PRODUCT', w: 660, h: 372, t0: B.diag2, color: PALETTE.ivory },
    { label: 'SERVICE', w: 990, h: 558, t0: B.diag3, color: PALETTE.ivory },
    { label: 'ENTIRE EXPERIENCE', w: 1340, h: 730, t0: B.diag4, color: PALETTE.ivory },
  ];
  ctx.save(); ctx.globalAlpha *= alpha;
  L.forEach((lv, i) => {
    const k = easeOut(seg(t, lv.t0, lv.t0 + 0.9)); if (k <= 0) return;
    const prev = i ? L[i - 1] : { w: 0, h: 0 };
    let w = lerp(prev.w, lv.w, k), h = lerp(prev.h, lv.h, k);
    if (i === 3) { const bk = easeInOut(seg(t, B.beyond, B.beyond + 1.8)); w = lerp(w, 2700, bk); h = lerp(h, 1540, bk); }
    const x = cx - w / 2, y = cy - h / 2;
    ctx.strokeStyle = lv.color; ctx.globalAlpha = alpha * (i === 0 ? 0.95 : 0.6); ctx.lineWidth = i === 0 ? 1.8 : 1.3;
    roundRect(ctx, x, y, w, h, 22); ctx.stroke();
    const la = seg(t, lv.t0 + 0.45, lv.t0 + 0.95); if (la > 0) {
      const ly = Math.max(y, 64); const tw = measure(ctx, lv.label, { size: 20, weight: 600, tracking: 4.2 });
      ctx.globalAlpha = alpha * la; ctx.fillStyle = PALETTE.graphite; ctx.fillRect(cx - tw / 2 - 16, ly - 14, tw + 32, 28);
      caps(ctx, lv.label, cx, ly + 7, { size: 20, color: lv.color, align: 'center', tracking: 4.2 });
    }
  });
  ctx.restore();
}
export function drawTimeline(ctx, t, t0, alpha) {
  if (alpha <= 0) return;
  const years = [1955, 1963, 1968, 1973, 1988, 1993]; const x0 = W / 2 - 540, x1 = W / 2 + 540, y = H - 78;
  const px = (yr) => lerp(x0, x1, (yr - 1955) / (1993 - 1955));
  const grow = easeOut(seg(t, t0, t0 + 1.4));
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = PALETTE.gray2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, grow), y); ctx.stroke();
  years.forEach((yr, i) => {
    const k = seg(grow, (yr - 1955) / 38 - 0.02, (yr - 1955) / 38 + 0.08); if (k <= 0) return;
    const x = px(yr); const last = i === years.length - 1;
    ctx.globalAlpha = alpha * k; ctx.fillStyle = last ? PALETTE.amber : PALETTE.gray; ctx.fillRect(x - 0.5, y - 7, 1, 14);
    text(ctx, String(yr), x, y + 32, { size: 18, weight: last ? 600 : 500, color: last ? PALETTE.amber : PALETTE.gray, align: 'center', tracking: 1 });
  });
  ctx.globalAlpha = alpha * seg(grow, 0.75, 1);
  caps(ctx, 'decades of human-centred work before the name', x0, y - 20, { size: 18, color: PALETTE.gray2, tracking: 3.2 });
  ctx.restore();
}
