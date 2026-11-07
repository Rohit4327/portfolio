// SCENE 03 helpers — 1960s computer-room props, the keyboard terminal, the Sketchpad console + light pen,
// and the two screen painters (green-phosphor terminal, round vector CRT). All geometry from primitives; metres.
import * as THREE from 'three';
import { PALETTE } from '../lib/stage.js';
import { hash, hash2, clamp, lerp, deg } from '../lib/util.js';
import { mat, roundedBox, box, cylinder, plane, floor, makeScreen, torus } from '../lib/props.js';

// ---- cool fluorescent lab palette (3D materials) ----
export const M = {
  cabinet: () => mat.std(0x9aa39f, { roughness: 0.55 }),
  cabinetDark: () => mat.std(0x5f6a67, { roughness: 0.6 }),
  panel: () => mat.std(0x343d3b, { roughness: 0.45, metalness: 0.25 }),
  plinth: () => mat.std(0x1e2325, { roughness: 0.75 }),
  wall: () => mat.std(0x6f7d78, { roughness: 0.95 }),
  floorTile: () => mat.std(0x3f4947, { roughness: 0.32, metalness: 0.18 }),
  lampOff: () => mat.std(0x2a2622, { roughness: 0.4 }),
  lampAmber: () => mat.emissive(0xffb86a, 1.4),
  lampGreen: () => mat.emissive(0x9fffb0, 1.1),
  tube: () => mat.emissive(0xe6f5ee, 2.2),
  tape: () => mat.std(0x4a3626, { roughness: 0.45, metalness: 0.25 }),
  flange: () => mat.std(0x454b52, { roughness: 0.35, metalness: 0.5 }),
  glass: () => mat.std(0x141c1a, { roughness: 0.2, metalness: 0.5 }),
  desk: () => mat.std(0x7f8d87, { roughness: 0.5, metalness: 0.05 }),
  housing: () => mat.std(0xb8b3a5, { roughness: 0.6 }),
  bezel: () => mat.std(0x2b2926, { roughness: 0.5 }),
  key: () => mat.std(0x2e2f31, { roughness: 0.55 }),
  cardBeige: () => mat.std(0xd9cfb8, { roughness: 0.8 }),
  cardEdge: () => mat.std(0xc4b99f, { roughness: 0.85 }),
  console: () => mat.std(0x8e9893, { roughness: 0.55 }),
  consoleDark: () => mat.std(0x4a5452, { roughness: 0.5, metalness: 0.2 }),
  pen: () => mat.std(0x1c1f22, { roughness: 0.35, metalness: 0.6 }),
  cable: () => mat.std(0x151719, { roughness: 0.6 }),
};

// ---- a generic punched card texture (80-column feel, no specific brand layout), one corner cut ----
let _cardTex = null;
export function cardTexture() {
  if (_cardTex) return _cardTex;
  const w = 752, h = 334; const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#D9CFB8'; x.fillRect(0, 0, w, h);
  // faint printed column grid
  x.fillStyle = 'rgba(120,100,70,0.18)';
  for (let col = 0; col < 80; col++) { const px = 22 + col * 9; for (let row = 0; row < 12; row++) { const py = 24 + row * 25; x.fillRect(px, py, 5, 11); } }
  // punched holes (sparse, deterministic)
  x.fillStyle = '#17150f';
  for (let col = 0; col < 80; col++) for (let row = 0; row < 12; row++) { if (hash2(col, row) < 0.13) { const px = 22 + col * 9, py = 24 + row * 25; x.fillRect(px, py, 5, 11); } }
  // corner cut (top-left) → transparent
  x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(0, 0); x.lineTo(30, 0); x.lineTo(0, 30); x.closePath(); x.fill();
  x.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; _cardTex = tex; return tex;
}
export const CARD_W = 0.187, CARD_H = 0.083;
export function makeCard() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshStandardMaterial({ map: cardTexture(), transparent: true, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }));
  m.castShadow = false; m.receiveShadow = true; return m;
}
// a deck of cards lying flat (box) with a textured top card; height in metres
export function makeDeck(h = 0.05) {
  const g = new THREE.Group();
  const body = box(CARD_W, h, CARD_H, M.cardEdge()); body.position.y = h / 2; g.add(body);
  const top = makeCard(); top.rotation.x = -Math.PI / 2; top.position.y = h + 0.0006; g.add(top);
  g.userData.body = body; g.userData.top = top;
  g.setHeight = (hh) => { hh = Math.max(0.002, hh); body.scale.y = hh / h; body.position.y = hh / 2; top.position.y = hh + 0.0006; };
  return g;
}

// ---- lamp grid helper ----
function lampGrid(g, x0, y0, z, rows, cols, dx, dy, seed, litRate = 0.45) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = hash(seed * 13.1 + r * 7.7 + c * 3.3);
    const m = v < litRate ? (v < litRate * 0.3 ? M.lampGreen() : M.lampAmber()) : M.lampOff();
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.011, 0.006), m); l.position.set(x0 + c * dx, y0 - r * dy, z); g.add(l);
  }
}

// ---- plain mainframe cabinet ----
export function makeCabinet({ w = 0.7, h = 1.9, d = 0.75, seed = 0, lamps = true } = {}) {
  const g = new THREE.Group();
  const body = roundedBox(w, h, d, 0.012, M.cabinet()); body.position.y = h / 2 + 0.06; g.add(body);
  const plinth = box(w - 0.04, 0.06, d - 0.04, M.plinth()); plinth.position.y = 0.03; g.add(plinth);
  // recessed dark upper panel with lamps, lower door with a seam
  const fp = box(w - 0.12, h * 0.36, 0.012, M.panel()); fp.position.set(0, h * 0.74 + 0.06, d / 2 + 0.002); g.add(fp);
  if (lamps) lampGrid(g, -(w - 0.12) / 2 + 0.06, h * 0.74 + 0.06 + h * 0.13, d / 2 + 0.012, 5, Math.max(3, Math.floor((w - 0.24) / 0.045)), 0.045, 0.034, seed);
  const seam = box(w - 0.12, 0.004, 0.004, M.cabinetDark()); seam.position.set(0, h * 0.5 + 0.06, d / 2 + 0.001); g.add(seam);
  const vent = box(w - 0.2, 0.08, 0.006, M.cabinetDark()); vent.position.set(0, 0.22, d / 2 + 0.001); g.add(vent);
  const plate = box(0.12, 0.028, 0.004, mat.ivory({ roughness: 0.6 })); plate.position.set(-(w / 2) + 0.12, h * 0.74 + 0.06 + h * 0.2 + 0.02, d / 2 + 0.01); g.add(plate);
  return g;
}

// ---- tape drive: tall cabinet, two reels behind a glass door, vacuum columns, control row ----
export function makeTapeDrive(seed = 0) {
  const g = new THREE.Group(); const w = 0.82, h = 1.96, d = 0.76;
  const body = roundedBox(w, h, d, 0.012, M.cabinet()); body.position.y = h / 2 + 0.06; g.add(body);
  const plinth = box(w - 0.04, 0.06, d - 0.04, M.plinth()); plinth.position.y = 0.03; g.add(plinth);
  // upper recess (dark glass) and frame
  const recess = box(w - 0.1, 0.82, 0.03, M.glass()); recess.position.set(0, 1.5, d / 2 - 0.012); g.add(recess);
  const frame = box(w - 0.08, 0.014, 0.02, M.bezel()); frame.position.set(0, 1.5 + 0.41, d / 2 + 0.004); g.add(frame);
  const frame2 = frame.clone(); frame2.position.y = 1.5 - 0.41; g.add(frame2);
  const reels = [];
  for (const sx of [-1, 1]) {
    const r = new THREE.Group(); r.position.set(sx * 0.2, 1.56, d / 2 + 0.028);
    const flange = cylinder(0.14, 0.14, 0.012, M.flange(), 40); flange.rotation.x = Math.PI / 2; r.add(flange);
    const tr = sx < 0 ? 0.118 : 0.075; const tape = cylinder(tr, tr, 0.034, M.tape(), 36); tape.rotation.x = Math.PI / 2; tape.position.z = 0.012; r.add(tape);
    const hub = cylinder(0.034, 0.034, 0.05, mat.brushed(), 24); hub.rotation.x = Math.PI / 2; hub.position.z = 0.02; r.add(hub);
    for (let i = 0; i < 3; i++) { const s = box(0.21, 0.014, 0.004, mat.ivory({ roughness: 0.5 })); s.rotation.z = i * Math.PI / 3 + (sx < 0 ? 0.3 : 0.9); s.position.z = 0.031; r.add(s); }
    g.add(r); reels.push(r);
  }
  // tape path across the top + two guide rollers + vacuum columns
  const band = box(0.34, 0.012, 0.004, M.tape()); band.position.set(0, 1.56 + 0.128, d / 2 + 0.05); g.add(band);
  for (const sx of [-1, 1]) { const roller = cylinder(0.018, 0.018, 0.03, mat.brushed(), 16); roller.rotation.x = Math.PI / 2; roller.position.set(sx * 0.07, 1.56 - 0.2, d / 2 + 0.035); g.add(roller); }
  for (const sx of [-1, 1]) { const col = box(0.07, 0.42, 0.01, M.panel()); col.position.set(sx * 0.12, 0.98, d / 2 + 0.004); g.add(col); const tapeIn = box(0.012, 0.3, 0.006, M.tape()); tapeIn.position.set(sx * 0.12, 1.0, d / 2 + 0.01); g.add(tapeIn); }
  // control row
  const ctl = box(w - 0.16, 0.06, 0.01, M.panel()); ctl.position.set(0, 0.66, d / 2 + 0.003); g.add(ctl);
  lampGrid(g, -0.24, 0.66, d / 2 + 0.012, 1, 8, 0.06, 0.03, seed + 5, 0.6);
  return { group: g, reels };
}

// ---- card reader: low unit with input hopper (deck + weight), slot, output stacker ----
export function makeCardReader() {
  const g = new THREE.Group(); const w = 1.05, h = 0.86, d = 0.7;
  const body = roundedBox(w, h, d, 0.012, M.cabinet()); body.position.y = h / 2 + 0.05; g.add(body);
  const plinth = box(w - 0.04, 0.05, d - 0.04, M.plinth()); plinth.position.y = 0.025; g.add(plinth);
  const top = box(w, 0.02, d, M.cabinetDark()); top.position.y = h + 0.06; g.add(top);
  // input hopper (left): a tilted tray with side rails
  const hop = new THREE.Group(); hop.position.set(-0.3, h + 0.07, 0.02); hop.rotation.x = -deg(22); g.add(hop);
  const tray = box(0.24, 0.012, 0.12, M.panel()); tray.position.y = -0.006; hop.add(tray);
  for (const sx of [-1, 1]) { const rail = box(0.012, 0.09, 0.12, M.bezel()); rail.position.set(sx * 0.115, 0.04, 0); hop.add(rail); }
  const deckIn = makeDeck(0.09); hop.add(deckIn);
  const weight = box(0.16, 0.012, 0.07, M.bezel()); hop.add(weight);
  // throat / slot in the middle
  const slot = box(0.21, 0.006, 0.09, M.plinth()); slot.position.set(-0.05, h + 0.075, 0.02); g.add(slot);
  const throat = box(0.22, 0.05, 0.06, M.panel()); throat.position.set(-0.05, h + 0.09, 0.02); g.add(throat);
  // output stacker (right): a tray with a growing deck
  const stk = new THREE.Group(); stk.position.set(0.3, h + 0.07, 0.02); g.add(stk);
  const tray2 = box(0.24, 0.012, 0.12, M.panel()); tray2.position.y = -0.006; stk.add(tray2);
  for (const sx of [-1, 1]) { const rail = box(0.012, 0.07, 0.12, M.bezel()); rail.position.set(sx * 0.115, 0.03, 0); stk.add(rail); }
  const deckOut = makeDeck(0.09); stk.add(deckOut);
  // moving card
  const card = makeCard(); card.rotation.x = -Math.PI / 2; g.add(card);
  // control buttons on the front
  const ctl = box(0.5, 0.05, 0.01, M.panel()); ctl.position.set(0.1, h - 0.08, d / 2 + 0.003); g.add(ctl);
  lampGrid(g, -0.08, h - 0.08, d / 2 + 0.012, 1, 6, 0.06, 0.03, 31, 0.5);
  const api = { group: g, deckIn, deckOut, card, weight, hop, stk };
  // k = fraction fed (0..1); phase = card in flight (0..1) or -1 for none
  api.setFeed = (k, phase) => {
    const hIn = 0.09 * (1 - k), hOut = 0.09 * k;
    deckIn.setHeight(hIn); weight.position.y = hIn + 0.008;
    deckOut.setHeight(hOut); deckOut.visible = hOut > 0.003;
    if (phase < 0) { card.visible = false; return; }
    card.visible = true;
    // from the hopper throat to the stacker: a short arc
    const x = lerp(-0.2, 0.22, phase), y = h + 0.09 + Math.sin(phase * Math.PI) * 0.075 + 0.004, z = 0.02;
    card.position.set(x, y, z); card.rotation.set(-Math.PI / 2 + Math.sin(phase * Math.PI) * 0.5, 0, 0);
  };
  return api;
}

// ---- keyboard terminal (generic composite, not a specific model) ----
export function makeTerminal() {
  const g = new THREE.Group();
  const housing = roundedBox(0.46, 0.36, 0.44, 0.018, M.housing()); housing.position.set(0, 0.18 + 0.02, -0.05); g.add(housing);
  const feet = box(0.4, 0.02, 0.36, M.bezel()); feet.position.set(0, 0.01, -0.05); g.add(feet);
  const screen = makeScreen(0.30, 0.225, 1024, 768);
  screen.mesh.position.set(0, 0.215, 0.1705); g.add(screen.mesh);
  // bezel ring around the screen (four bars, slight inset)
  const bz = M.bezel();
  const bt = box(0.34, 0.02, 0.012, bz); bt.position.set(0, 0.215 + 0.1225, 0.168); g.add(bt);
  const bb = bt.clone(); bb.position.y = 0.215 - 0.1225; g.add(bb);
  const bl = box(0.02, 0.265, 0.012, bz); bl.position.set(-0.16, 0.215, 0.168); g.add(bl);
  const br = bl.clone(); br.position.x = 0.16; g.add(br);
  // keyboard wedge in front with keys
  const kb = new THREE.Group(); kb.position.set(0, 0.0, 0.265); kb.rotation.x = -deg(6); g.add(kb);
  const wedge = roundedBox(0.44, 0.03, 0.17, 0.006, M.housing()); wedge.position.y = 0.015; kb.add(wedge);
  const keyGeo = new THREE.BoxGeometry(0.016, 0.008, 0.016); const keyMat = M.key();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) {
    if (r === 3 && c > 2 && c < 10) continue; // space bar area
    const k = new THREE.Mesh(keyGeo, keyMat); k.position.set(-0.12 + c * 0.02 + r * 0.005, 0.034, -0.045 + r * 0.021); k.castShadow = true; kb.add(k);
  }
  const space = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.008, 0.016), keyMat); space.position.set(0.012, 0.034, -0.045 + 3 * 0.021); kb.add(space);
  return { group: g, screen };
}

// ---- desk ----
export function makeDesk(w = 1.7, d = 0.8, h = 0.74) {
  const g = new THREE.Group();
  const top = roundedBox(w, 0.035, d, 0.004, M.desk()); top.position.y = h - 0.0175; g.add(top);
  const legMat = mat.darkMetal();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = box(0.04, h - 0.035, 0.04, legMat); l.position.set(sx * (w / 2 - 0.08), (h - 0.035) / 2, sz * (d / 2 - 0.08)); g.add(l); }
  const rail = box(w - 0.2, 0.06, 0.03, legMat); rail.position.set(0, h - 0.08, -d / 2 + 0.08); g.add(rail);
  return g;
}

// ---- the room shell: floor, walls, ceiling with fluorescent tubes ----
export function makeRoomShell(g) {
  const fl = floor(16, M.floorTile()); g.add(fl);
  // tile grooves: a few thin lines across the floor for scale (cheap boxes)
  const groove = mat.std(0x2c3432, { roughness: 0.5 });
  for (let i = -6; i <= 6; i++) { const gx = box(0.006, 0.002, 16, groove); gx.position.set(i * 0.9, 0.001, 0); g.add(gx); const gz = box(16, 0.002, 0.006, groove); gz.position.set(0, 0.001, i * 0.9 - 0.4); g.add(gz); }
  const back = plane(16, 3.2, M.wall()); back.position.set(0, 1.6, -4.3); g.add(back);
  const left = plane(14, 3.2, M.wall()); left.rotation.y = Math.PI / 2; left.position.set(-5.2, 1.6, -1); g.add(left);
  const right = plane(14, 3.2, M.wall()); right.rotation.y = -Math.PI / 2; right.position.set(5.2, 1.6, -1); g.add(right);
  const ceil = plane(16, 14, mat.std(0x3b4443, { roughness: 1, emissive: 0x222a28, emissiveIntensity: 0.6 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.0, -1); g.add(ceil);
  // fluorescent fixtures (emissive only)
  for (const z of [-3.4, -1.6, 0.4, 2.2]) for (const x of [-2.4, 0.4, 3.2]) {
    const trough = box(1.3, 0.05, 0.22, mat.std(0xd8dcd9, { roughness: 0.6 })); trough.position.set(x, 2.975, z); g.add(trough);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.012, 0.14), M.tube()); tube.position.set(x, 2.945, z); g.add(tube);
  }
  // a dado line along the back wall
  const dado = box(16, 0.04, 0.02, M.cabinetDark()); dado.position.set(0, 0.95, -4.29); g.add(dado);
}

// ---- Sketchpad-style console with a round CRT and a light pen on a cable ----
export const CRT_SIZE = 0.34;
export function makeSketchpadConsole() {
  const g = new THREE.Group();
  // console body: a wide desk-height unit with a sloped front control panel
  const body = roundedBox(1.6, 0.74, 0.9, 0.012, M.console()); body.position.set(0, 0.37 + 0.04, -0.1); g.add(body);
  const plinth = box(1.5, 0.04, 0.8, M.plinth()); plinth.position.set(0, 0.02, -0.1); g.add(plinth);
  const slope = new THREE.Group(); slope.position.set(0, 0.78, 0.26); slope.rotation.x = -deg(18); g.add(slope);
  const sp = roundedBox(1.5, 0.03, 0.26, 0.004, M.consoleDark()); slope.add(sp);
  // toggle switches on the left of the slope, pushbuttons on the right
  for (let i = 0; i < 10; i++) { const base = cylinder(0.009, 0.009, 0.006, mat.brushed(), 12); base.position.set(-0.62 + i * 0.05, 0.018, 0.02); slope.add(base); const lever = cylinder(0.0025, 0.0035, 0.03, mat.brushed(), 8); lever.position.set(-0.62 + i * 0.05, 0.03, 0.02); lever.rotation.x = (hash(i + 2) < 0.5 ? 1 : -1) * deg(25); slope.add(lever); }
  for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.022), hash(i * 3.1 + 7) < 0.3 ? M.lampAmber() : mat.std(0xd9d9d2, { roughness: 0.5 })); b.position.set(0.18 + (i % 6) * 0.05, 0.02, -0.04 + Math.floor(i / 6) * 0.06); slope.add(b); }
  // display housing on top, tilted back
  const hz = new THREE.Group(); hz.position.set(0, 0.78 + 0.33, -0.25); hz.rotation.x = -deg(9); g.add(hz);
  const housing = roundedBox(0.66, 0.64, 0.6, 0.02, M.housing()); hz.add(housing);
  const face = box(0.6, 0.58, 0.012, M.bezel()); face.position.z = 0.305; hz.add(face);
  const screen = makeScreen(CRT_SIZE, CRT_SIZE, 1024, 1024);
  screen.mesh.position.set(0, 0.0, 0.312); hz.add(screen.mesh);
  const ring = torus(CRT_SIZE * 0.48, 0.02, M.bezel(), 64); ring.position.z = 0.318; hz.add(ring);
  const ring2 = torus(CRT_SIZE * 0.48 + 0.022, 0.006, mat.brushed(), 64); ring2.position.z = 0.312; hz.add(ring2);
  // small label plate + two knobs under the screen
  const plate = box(0.16, 0.026, 0.004, mat.ivory({ roughness: 0.6 })); plate.position.set(-0.19, -0.255, 0.313); hz.add(plate);
  for (let i = 0; i < 3; i++) { const k = cylinder(0.016, 0.018, 0.02, M.key(), 20); k.rotation.x = Math.PI / 2; k.position.set(0.12 + i * 0.07, -0.255, 0.318); hz.add(k); }
  // the light pen: a slim cylinder; tip at the group origin, body along +y
  const pen = new THREE.Group();
  const pbody = cylinder(0.0075, 0.0085, 0.15, M.pen(), 20); pbody.position.y = 0.09; pen.add(pbody);
  const tip = cylinder(0.003, 0.0075, 0.015, mat.brushed(), 12); tip.position.y = 0.0075; pen.add(tip);
  const grip = cylinder(0.0095, 0.0095, 0.03, mat.ivory({ roughness: 0.4 }), 20); grip.position.y = 0.05; pen.add(grip);
  const tail = cylinder(0.0055, 0.0055, 0.02, M.cable(), 12); tail.position.y = 0.175; pen.add(tail);
  g.add(pen);
  const cable = new THREE.Mesh(new THREE.BufferGeometry(), M.cable()); cable.castShadow = true; g.add(cable);
  const api = { group: g, screen, pen, cable, hz };
  const anchor = new THREE.Vector3(0.62, 0.8, 0.18); // where the cable disappears into the console
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
  // place the pen so its tip touches screen point (u,v) in [-0.5,0.5]², leaning toward +x/−y; lift = metres off the glass
  api.placePen = (u, v, lift = 0, lean = 1) => {
    const p = tmpA.set(u * CRT_SIZE, v * CRT_SIZE, 0.004 + lift); screen.mesh.localToWorld(p); g.worldToLocal(p);
    const n = tmpB.set(0, 0, 1).transformDirection(screen.mesh.matrixWorld); // screen normal (world == group local here)
    const dir = tmpC.copy(n).multiplyScalar(1).add(new THREE.Vector3(0.62 * lean, -0.42 * lean, 0)).normalize();
    pen.position.copy(p); pen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    // cable: from the pen tail, sagging, to the console anchor
    const tail = p.clone().addScaledVector(dir, 0.185);
    const mid1 = tail.clone().addScaledVector(dir, 0.08).add(new THREE.Vector3(0.05, -0.08, 0.02));
    const mid2 = new THREE.Vector3((tail.x + anchor.x) / 2 + 0.05, Math.min(tail.y, anchor.y) - 0.12, (tail.z + anchor.z) / 2 + 0.06);
    const curve = new THREE.CatmullRomCurve3([tail, mid1, mid2, anchor]);
    const old = cable.geometry; cable.geometry = new THREE.TubeGeometry(curve, 40, 0.0035, 8, false); old.dispose();
  };
  return api;
}

// ---- screen painters ----
let _scan = null;
function scanPattern(ctx) {
  if (_scan) return _scan;
  const c = document.createElement('canvas'); c.width = 4; c.height = 4; const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.0)'; x.fillRect(0, 0, 4, 4); x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, 3, 4, 1);
  _scan = ctx.createPattern(c, 'repeat'); return _scan;
}
// Green-phosphor terminal. lines: array of strings; cursor: {line, col, on}; alpha: overall; scale: px scale (1 = 1920-wide)
export function drawTerminal(ctx, w, h, { lines = [], cursor = null, glow = 1, scale = 1, dim = 0 } = {}) {
  ctx.save();
  ctx.fillStyle = '#040806'; ctx.fillRect(0, 0, w, h);
  // phosphor field: a faint green-grey pool brighter in the middle
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, `rgba(28,52,38,${0.55 * glow})`); g.addColorStop(1, 'rgba(6,12,9,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const fs = Math.round(38 * scale), lh = Math.round(60 * scale), x0 = Math.round(w * 0.105), y0 = Math.round(h * 0.2);
  ctx.font = `400 ${fs}px 'DejaVu Sans Mono'`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const cw = ctx.measureText('M').width;
  const green = PALETTE.crtGreen;
  ctx.shadowColor = 'rgba(51,255,102,0.85)'; ctx.shadowBlur = 16 * scale * glow;
  ctx.fillStyle = green;
  lines.forEach((ln, i) => { if (ln) ctx.fillText(ln, x0, y0 + i * lh); });
  if (cursor && cursor.on) { ctx.fillRect(x0 + cursor.col * cw + 2 * scale, y0 + cursor.line * lh - fs * 0.78, cw * 0.9, fs * 0.92); }
  ctx.shadowBlur = 0;
  // second pass: brighter core for crispness
  ctx.fillStyle = '#B9FFC9'; ctx.globalAlpha = 0.55;
  lines.forEach((ln, i) => { if (ln) ctx.fillText(ln, x0, y0 + i * lh); });
  ctx.globalAlpha = 1;
  // scanlines + curved-glass vignette
  ctx.fillStyle = scanPattern(ctx); ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.98);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  if (dim > 0) { ctx.fillStyle = `rgba(2,4,3,${clamp(dim)})`; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}

// Round vector CRT (1024² canvas). pts: corner list [{x,y}] in [-0.5,0.5]; edges: number of edges drawn (fractional);
// pen: {x,y} tracking cross or null; flash: 0..1 (snap); dot: 0..1 (final point brightening)
export function drawCRT(ctx, S, { pts = [], edges = 0, closed = true, pen = null, flash = 0, dot = 0, glow = 1 } = {}) {
  const c = S / 2, R = S * 0.47;
  ctx.save();
  ctx.fillStyle = '#0a0b0c'; ctx.fillRect(0, 0, S, S);
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createRadialGradient(c - S * 0.06, c - S * 0.08, S * 0.05, c, c, R);
  g.addColorStop(0, '#1b2622'); g.addColorStop(0.7, '#0f1715'); g.addColorStop(1, '#070b0a'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const P = (p) => [c + p.x * S * 0.88, c - p.y * S * 0.88];
  const n = pts.length;
  const segs = closed ? n : n - 1;
  const stroke = (lw, col, blur) => {
    if (n < 2 || edges <= 0) return;
    ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = col; ctx.shadowBlur = blur;
    ctx.beginPath();
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n]; const k = clamp(edges - i); if (k <= 0) break;
      const [ax, ay] = P(a), [bx, by] = P(b); if (i === 0) ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, k), lerp(ay, by, k));
    }
    ctx.stroke();
  };
  stroke(9, `rgba(170,230,210,${0.35 * glow})`, 26);
  stroke(3.2, `rgba(236,250,246,${0.98 * glow})`, 8);
  stroke(1.4, '#ffffff', 0);
  // snap flash
  if (flash > 0) { ctx.shadowBlur = 0; ctx.fillStyle = `rgba(220,255,240,${0.28 * flash})`; ctx.fillRect(0, 0, S, S); }
  // tracking cross under the pen
  if (pen) { const [px, py] = P(pen); ctx.shadowColor = 'rgba(236,250,246,0.9)'; ctx.shadowBlur = 10; ctx.strokeStyle = '#f4fffa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 16, py); ctx.lineTo(px + 16, py); ctx.moveTo(px, py - 16); ctx.lineTo(px, py + 16); ctx.stroke(); ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke(); }
  // final bright dot (the point)
  if (dot > 0 && n) { const [px, py] = P(pts[2]); const rg = ctx.createRadialGradient(px, py, 0, px, py, 60 * dot + 10); rg.addColorStop(0, `rgba(255,236,210,${dot})`); rg.addColorStop(0.25, `rgba(255,171,91,${0.7 * dot})`); rg.addColorStop(1, 'rgba(255,171,91,0)'); ctx.shadowBlur = 0; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, 60 * dot + 10, 0, Math.PI * 2); ctx.fill(); }
  ctx.shadowBlur = 0;
  // subtle scanlines + glass vignette
  ctx.fillStyle = scanPattern(ctx); ctx.globalAlpha = 0.6; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(c, c, R * 0.6, c, c, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
  ctx.restore();
}
