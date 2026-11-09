// SCENE 04 helpers — 1968 auditorium, console (keyboard + 5-key keyset + three-button mouse), the 1964 wooden
// prototype exhibit, and the monochrome NLS-style projection screen painter. Everything is a reconstruction.
import * as THREE from 'three';
import { PALETTE } from '../lib/stage.js';
import { hash } from '../lib/util.js';
import { mat, roundedBox, box, cylinder, plane, floor, makeScreen } from '../lib/props.js';

// ---------------------------------------------------------------- screen geometry (shared constants)
export const SCREEN = { w: 6.0, h: 4.5, pxW: 1024, pxH: 768, center: new THREE.Vector3(0, 3.45, -8.2) };
// the right-hand split pane region (canvas px) that detaches as the floating window at the end
export const PANE = { x: 528, y: 96, w: 464, h: 624 };
export const paneWorld = () => ({ w: PANE.w / SCREEN.pxW * SCREEN.w, h: PANE.h / SCREEN.pxH * SCREEN.h, cx: ((PANE.x + PANE.w / 2) / SCREEN.pxW - 0.5) * SCREEN.w, cy: (0.5 - (PANE.y + PANE.h / 2) / SCREEN.pxH) * SCREEN.h });
// canvas uv (0..1) -> world position on the screen surface
export const screenPoint = (u, v, out = new THREE.Vector3()) => out.set(SCREEN.center.x + (u - 0.5) * SCREEN.w, SCREEN.center.y + (0.5 - v) * SCREEN.h, SCREEN.center.z + 0.02);

// ---------------------------------------------------------------- auditorium
export function buildAuditorium() {
  const g = new THREE.Group();
  const dark = mat.graphite({ roughness: 0.9 });
  // raked audience floor + stage platform
  g.add(floor(60, mat.graphite({ roughness: 0.7, metalness: 0.1 })));
  const stage = box(16, 0.6, 5.2, mat.graphite({ roughness: 0.8 })); stage.position.set(0, 0.3, -6.1); stage.castShadow = false; g.add(stage);
  const lip = box(16, 0.02, 0.04, mat.graphiteLight({ roughness: 0.6 })); lip.position.set(0, 0.61, -3.5); lip.castShadow = false; g.add(lip);
  // back wall + screen frame (matte black border)
  const back = plane(30, 12, mat.graphite({ roughness: 1 })); back.position.set(0, 5, -8.35); g.add(back);
  const frame = box(SCREEN.w + 0.36, SCREEN.h + 0.36, 0.1, mat.blackPlastic({ roughness: 0.9 })); frame.position.copy(SCREEN.center).add(new THREE.Vector3(0, 0, -0.08)); frame.castShadow = false; g.add(frame);
  // side walls (soft, barely lit)
  for (const s of [-1, 1]) { const w = plane(26, 12, mat.graphite({ roughness: 1 })); w.rotation.y = -s * Math.PI / 2; w.position.set(s * 9, 5, 0); g.add(w); }
  // seats: instanced backrests + cushions, raked rows
  const rows = 11, perRow = 16, pitch = 0.56, rowPitch = 0.92;
  const n = rows * perRow;
  const backGeo = new THREE.BoxGeometry(0.46, 0.62, 0.07), seatGeo = new THREE.BoxGeometry(0.46, 0.08, 0.44), armGeo = new THREE.BoxGeometry(0.05, 0.22, 0.4);
  const seatMat = mat.std(0x1b1f27, { roughness: 0.95 });
  const backs = new THREE.InstancedMesh(backGeo, seatMat, n), seats = new THREE.InstancedMesh(seatGeo, seatMat, n), arms = new THREE.InstancedMesh(armGeo, seatMat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < perRow; c++) {
    const z = -2.4 + r * rowPitch, y = r * 0.11; const x = (c - (perRow - 1) / 2) * pitch + (c >= perRow / 2 ? 0.5 : -0.5);
    const tilt = -0.14;
    q.setFromEuler(new THREE.Euler(tilt, 0, 0)); p.set(x, y + 0.72, z + 0.2); m.compose(p, q, s1); backs.setMatrixAt(i, m);
    q.identity(); p.set(x, y + 0.44, z); m.compose(p, q, s1); seats.setMatrixAt(i, m);
    p.set(x - 0.255, y + 0.56, z); m.compose(p, q, s1); arms.setMatrixAt(i, m);
    i++;
  }
  for (const im of [backs, seats, arms]) { im.castShadow = false; im.receiveShadow = true; g.add(im); }
  // the floor of the raked seating (steps)
  for (let r = 0; r < rows; r++) { const st = box(10, 0.11, rowPitch, dark); st.position.set(0, r * 0.11 - 0.055 + 0.11, -2.4 + r * rowPitch + 0.1); st.castShadow = false; g.add(st); }
  // projector beam (faint square pyramid of haze from the back of the hall to the screen)
  const beamLen = 17.2; const cone = new THREE.ConeGeometry(1, beamLen, 4, 1, true); cone.rotateY(Math.PI / 4); cone.rotateX(Math.PI / 2);
  // alpha gradient along the beam (bright at the projector, fading toward the screen) via a tiny canvas texture on the cone's v axis
  const gc = document.createElement('canvas'); gc.width = 4; gc.height = 256; const gx = gc.getContext('2d');
  const gg = gx.createLinearGradient(0, 0, 0, 256); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gg.addColorStop(1, 'rgba(255,255,255,0.04)');
  gx.fillStyle = gg; gx.fillRect(0, 0, 4, 256); const gTex = new THREE.CanvasTexture(gc); gTex.colorSpace = THREE.SRGBColorSpace;
  const beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xbfd3cf, map: gTex, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  // apex (+z, the projector) → base at the screen plane; the 4-sided cone's corners sit at radius 1, so half-side = 1/√2
  beam.scale.set(SCREEN.w / 2 * Math.SQRT2 * 1.03, SCREEN.h / 2 * Math.SQRT2 * 1.03, 1);
  beam.position.set(SCREEN.center.x, SCREEN.center.y, SCREEN.center.z + beamLen / 2); g.add(beam);
  const projector = roundedBox(0.34, 0.2, 0.5, 0.02, mat.darkMetal()); projector.position.set(0, SCREEN.center.y, SCREEN.center.z + beamLen + 0.2); projector.castShadow = false; g.add(projector);
  return g;
}

// ---------------------------------------------------------------- the demo console (desk, keyboard, keyset, three-button mouse, small display, chair)
export function buildConsole(screenMaterial) {
  const g = new THREE.Group();
  const walnut = mat.std(0x4a3222, { roughness: 0.55 });
  const top = roundedBox(1.7, 0.04, 0.8, 0.008, walnut); top.position.y = 0.72; g.add(top);
  const leg = mat.darkMetal({ roughness: 0.4 });
  for (const sx of [-1, 1]) { const l = box(0.04, 0.7, 0.7, leg); l.position.set(sx * 0.8, 0.35, 0); g.add(l); const foot = box(0.06, 0.02, 0.76, leg); foot.position.set(sx * 0.8, 0.01, 0); g.add(foot); }
  const modesty = box(1.56, 0.4, 0.02, walnut); modesty.position.set(0, 0.5, -0.3); g.add(modesty);
  const deskY = 0.74;
  // keyboard (typewriter-style): sloped body with instanced keycaps
  const kb = new THREE.Group(); kb.position.set(-0.05, deskY, 0.12); g.add(kb);
  const kbBody = roundedBox(0.44, 0.035, 0.17, 0.006, mat.std(0x2b2f36, { roughness: 0.6 })); kbBody.position.y = 0.0175; kb.add(kbBody);
  const capGeo = new THREE.BoxGeometry(0.016, 0.008, 0.016); const capMat = mat.std(0xd9d2c3, { roughness: 0.5 });
  const rowsK = 4, colsK = 13; const caps = new THREE.InstancedMesh(capGeo, capMat, rowsK * colsK); let i = 0; const M = new THREE.Matrix4();
  for (let r = 0; r < rowsK; r++) for (let c = 0; c < colsK; c++) { M.makeTranslation((c - 6) * 0.0315 + (r % 2) * 0.008 - 0.004, 0.035 + 0.004 + r * 0.004, -0.055 + r * 0.034); caps.setMatrixAt(i++, M); }
  caps.castShadow = true; kb.add(caps);
  const space = box(0.19, 0.008, 0.016, capMat); space.position.set(0.0, 0.035 + 0.004 + 4 * 0.004, -0.055 + 4 * 0.034 - 0.006); kb.add(space);
  // 5-key chord keyset (left of the keyboard): small sloped base with five long keys
  const ks = new THREE.Group(); ks.position.set(-0.46, deskY, 0.14); g.add(ks);
  const ksBody = roundedBox(0.16, 0.028, 0.1, 0.006, mat.std(0x2b2f36, { roughness: 0.6 })); ksBody.position.y = 0.014; ks.add(ksBody);
  const keys = [];
  for (let k = 0; k < 5; k++) { const key = roundedBox(0.022, 0.01, 0.06, 0.003, capMat); key.position.set((k - 2) * 0.029, 0.028 + 0.005, 0.0); ks.add(key); keys.push(key); }
  ks.userData.keys = keys;
  // three-button mouse (1968 demonstration model: rounded shell, three narrow buttons at the front, cord)
  const mouse = makeThreeButtonMouse(); mouse.position.set(0.52, deskY, 0.1); g.add(mouse);
  // small display on the desk, showing the same picture as the projection
  const mon = new THREE.Group(); mon.position.set(0.05, deskY, -0.22); g.add(mon);
  const housing = roundedBox(0.4, 0.3, 0.3, 0.012, mat.std(0x3a3d44, { roughness: 0.55 })); housing.position.set(0, 0.17, -0.02); mon.add(housing);
  const bezel = roundedBox(0.36, 0.26, 0.02, 0.006, mat.blackPlastic()); bezel.position.set(0, 0.17, 0.14); mon.add(bezel);
  const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), screenMaterial); monScreen.position.set(0, 0.17, 0.151); mon.add(monScreen);
  const stand = cylinder(0.05, 0.08, 0.03, mat.darkMetal()); stand.position.set(0, 0.015, -0.02); mon.add(stand);
  // an empty chair behind the desk (the operator is not depicted)
  const chair = new THREE.Group(); chair.position.set(0.02, 0, -0.78); chair.rotation.y = Math.PI; g.add(chair);
  const seat = roundedBox(0.46, 0.06, 0.44, 0.01, mat.std(0x23272e, { roughness: 0.8 })); seat.position.y = 0.46; chair.add(seat);
  const cb = roundedBox(0.44, 0.42, 0.05, 0.01, mat.std(0x23272e, { roughness: 0.8 })); cb.position.set(0, 0.72, 0.21); cb.rotation.x = -0.1; chair.add(cb);
  const post = cylinder(0.02, 0.02, 0.42, mat.darkMetal()); post.position.y = 0.22; chair.add(post);
  const base = cylinder(0.22, 0.24, 0.02, mat.darkMetal()); base.position.y = 0.01; chair.add(base);
  g.userData = { keyset: ks, mouse, keyboard: kb, deskY };
  return g;
}

export function makeThreeButtonMouse() {
  const g = new THREE.Group();
  const shellMat = mat.std(0xd9d0bc, { roughness: 0.5 });
  const shell = roundedBox(0.078, 0.042, 0.118, 0.013, shellMat, 4); shell.position.y = 0.021 + 0.004; g.add(shell);
  const base = roundedBox(0.076, 0.008, 0.116, 0.003, mat.std(0x2a2d33, { roughness: 0.6 })); base.position.y = 0.004; g.add(base);
  const buttons = [];
  for (let i = 0; i < 3; i++) { const b = roundedBox(0.02, 0.008, 0.036, 0.003, mat.std(0xc9bfa8, { roughness: 0.45 })); b.position.set((i - 1) * 0.0245, 0.042 + 0.004 + 0.002, -0.036); g.add(b); buttons.push(b); }
  g.userData.buttons = buttons;
  // cord: a gently curving tube leaving the front
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, -0.058), new THREE.Vector3(0.0, 0.016, -0.14), new THREE.Vector3(-0.06, 0.01, -0.26), new THREE.Vector3(-0.2, 0.004, -0.34)]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0032, 8, false), mat.std(0x2a2a2e, { roughness: 0.55 })); cord.castShadow = true; g.add(cord);
  return g;
}

// 1964 wooden prototype: a hand-sized wooden block, one button on top, two perpendicular metal wheels underneath.
export function makeWoodenMouse() {
  const g = new THREE.Group();
  // wood grain: a small canvas texture of soft streaks (deterministic)
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#a06c3c'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) { const y = hash(i + 0.7) * 256, w = 1 + hash(i + 3.1) * 3, a = 0.08 + hash(i + 9.2) * 0.2; x.fillStyle = `rgba(70,40,18,${a})`; x.fillRect(0, y, 256, w); }
  for (let i = 0; i < 40; i++) { const y = hash(i + 21.3) * 256; x.fillStyle = `rgba(230,190,140,${0.05 + hash(i + 5.5) * 0.1})`; x.fillRect(0, y, 256, 1.5); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const wood = mat.std(0xffffff, { map: tex, roughness: 0.7 });
  const LIFT = 0.016;                                   // the block rides on its wheels: a visible gap underneath
  const body = roundedBox(0.1, 0.066, 0.118, 0.005, wood, 3); body.position.y = LIFT + 0.004 + 0.033; g.add(body);
  const plate = box(0.098, 0.004, 0.116, mat.darkMetal({ roughness: 0.5 })); plate.position.y = LIFT + 0.002; g.add(plate);
  const button = roundedBox(0.022, 0.009, 0.022, 0.002, mat.std(0xb8322a, { roughness: 0.5 })); button.position.set(-0.028, LIFT + 0.004 + 0.066 + 0.0045, -0.03); g.add(button); g.userData.button = button;
  // two wheels, perpendicular: one rolls along z (axis x), one along x (axis z); they protrude beneath the plate
  const wheelMat = mat.brushed();
  const r = 0.026;
  const w1 = cylinder(r, r, 0.005, wheelMat, 40); w1.rotation.z = Math.PI / 2; w1.position.set(0.0, r, 0.03); g.add(w1);
  const w2 = cylinder(r, r, 0.005, wheelMat, 40); w2.rotation.x = Math.PI / 2; w2.position.set(-0.025, r, -0.025); g.add(w2);
  // small third contact (a pin) so the block sits level on its wheels
  const pin = cylinder(0.004, 0.004, LIFT, mat.darkMetal()); pin.position.set(0.035, LIFT / 2, -0.04); g.add(pin);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.0, LIFT + 0.055, -0.058), new THREE.Vector3(0.0, LIFT + 0.05, -0.1), new THREE.Vector3(-0.03, 0.02, -0.17), new THREE.Vector3(-0.09, 0.0035, -0.24), new THREE.Vector3(-0.17, 0.0035, -0.27)]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.0035, 8, false), mat.std(0x2a2a2e, { roughness: 0.55 })); cord.castShadow = true; g.add(cord);
  return g;
}

// A museum-style exhibit vignette for the prototype: dark plinth, wedge cradle, one soft key light. Placed far from the hall.
export function buildExhibit() {
  const g = new THREE.Group();
  g.add(floor(14, mat.graphite({ roughness: 0.4, metalness: 0.3 })));
  const plinth = roundedBox(0.7, 0.9, 0.7, 0.006, mat.std(0x171b22, { roughness: 0.85 })); plinth.position.y = 0.45; g.add(plinth);
  const topPad = roundedBox(0.62, 0.012, 0.62, 0.004, mat.std(0x101318, { roughness: 1 })); topPad.position.y = 0.906; g.add(topPad);
  // the object sits upright on the plinth; a low camera shows the wheels beneath the block
  const cradle = new THREE.Group(); cradle.position.set(0, 0.912, 0); cradle.rotation.set(0, 0.42, 0); g.add(cradle);
  const mouse = makeWoodenMouse(); cradle.add(mouse);
  const key = new THREE.SpotLight(0xfff0dc, 34, 8, Math.PI / 11, 0.7, 1.4); key.position.set(-0.9, 2.3, 1.0); key.target.position.set(0, 0.95, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; g.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xcfe3ff, 0.35); fill.position.set(1.5, 1.5, 1.5); g.add(fill);
  const rim = new THREE.PointLight(0xffd9a8, 2.5, 4, 1.6); rim.position.set(0.5, 1.4, -0.7); g.add(rim);
  g.add(new THREE.AmbientLight(0xffffff, 0.06));
  g.userData = { mouse, cradle };
  return g;
}

// ---------------------------------------------------------------- NLS-style monochrome projection content
const INK = '#dfe9df', INK_DIM = '#8f9c90', BG = '#121612', BG2 = '#1a201a';
const MONO = (px) => `400 ${px}px 'DejaVu Sans Mono'`;
export function makeProjection() {
  const scr = makeScreen(SCREEN.w, SCREEN.h, SCREEN.pxW, SCREEN.pxH);
  scr.mesh.position.copy(SCREEN.center); scr.key = null;
  return scr;
}
const OUTLINE = [
  ['1', 'AUGMENTING HUMAN INTELLECT'],
  ['1A', '  a display, a keyboard, a keyset and a mouse'],
  ['1B', '  text is structured as numbered statements'],
  ['2', 'LINKED DOCUMENTS'],
  ['2A', '  point at a link to jump to it   > SEE 3A'],
  ['3', 'ON-SCREEN EDITING'],
  ['3A', '  words can be inserted, deleted and moved'],
  ['4', 'COLLABORATION'],
  ['4A', '  two people share one document'],
];
export const LINK_UV = { u: 0.735, v: 0.405 };   // where "> SEE 3A" sits (click target 1)
export const WORD_UV = { u: 0.315, v: 0.385 };   // the word "responds" in the linked view (click target 2)
export const INSERT = 'instantly ';
// state: { mode: 'outline'|'linked'|'split', typed, sel, detached }
export function stateKey(s) { return `${s.mode}|${s.typed}|${s.sel ? 1 : 0}|${s.detached ? 1 : 0}|${s.cur ? s.cur.u + ',' + s.cur.v : ''}`; }
export function drawProjection(scr, s) {
  const key = stateKey(s); if (scr.key === key) return; scr.key = key;
  const { ctx, pxW: Wp, pxH: Hp } = scr;
  // projected black level with a soft hot-spot in the centre
  const g = ctx.createRadialGradient(Wp / 2, Hp / 2, 60, Wp / 2, Hp / 2, Wp * 0.75); g.addColorStop(0, BG2); g.addColorStop(1, BG);
  ctx.fillStyle = g; ctx.fillRect(0, 0, Wp, Hp);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  // header
  ctx.fillStyle = INK; ctx.font = MONO(22);
  const title = s.mode === 'outline' ? 'NLS   FILE: DEMO   STATEMENT VIEW' : s.mode === 'linked' ? 'NLS   FILE: DEMO   STATEMENT 3A' : 'NLS   FILE: DEMO   SPLIT VIEW';
  ctx.fillText(title, 64, 56);
  ctx.fillStyle = INK_DIM; ctx.textAlign = 'right'; ctx.fillText(s.mode === 'linked' ? 'LINK FOLLOWED' : s.mode === 'split' ? 'TWO USERS' : 'MOUSE + KEYSET', Wp - 64, 56); ctx.textAlign = 'left';
  ctx.fillStyle = INK_DIM; ctx.fillRect(64, 72, Wp - 128, 1);
  if (s.mode === 'outline') {
    ctx.font = MONO(26); let y = 130;
    for (const [n, line] of OUTLINE) { const head = n.length === 1; ctx.fillStyle = head ? INK : INK_DIM; ctx.fillText(n, 64, y); ctx.fillStyle = INK; ctx.fillText(line, 120, y); y += head ? 44 : 50; if (n === '1B' || n === '2A' || n === '3A') y += 14; }
    // the link is underlined (what the mouse will point at)
    ctx.fillStyle = INK; ctx.fillRect(Wp * LINK_UV.u - 60, Hp * LINK_UV.v + 10, 118, 2);
  } else {
    const typedStr = INSERT.slice(0, Math.max(0, Math.min(INSERT.length, s.typed)));
    const col = s.mode === 'split' ? 0.5 : 1; const px = s.mode === 'split' ? 22 : 26;
    const x0 = 64, cw = (s.mode === 'split' ? PANE.x - 40 : Wp - 128);
    ctx.font = MONO(px);
    if (s.mode === 'split') { ctx.fillStyle = INK_DIM; ctx.font = `600 18px Inter`; ctx.letterSpacing = '3px'; ctx.fillText('WORKSTATION A', x0, 118); ctx.letterSpacing = '0px'; ctx.font = MONO(px); }
    let y = s.mode === 'split' ? 172 : 130;
    const lh = px * 1.75;
    ctx.fillStyle = INK; ctx.fillText('3A', x0, y); ctx.fillText('ON-SCREEN EDITING', x0 + 56, y); y += lh + 10;
    const lines = s.mode === 'split' ? ['words can be inserted,', 'deleted and moved'] : ['words can be inserted, deleted and moved'];
    for (const l of lines) { ctx.fillText(l, x0 + 56, y); y += lh; }
    // the edited sentence: "the text responds [instantly ]as you point"
    const a = 'the text ', w = 'responds', b = ' as you point';
    const cwid = ctx.measureText('M').width;
    if (s.mode === 'split') {
      ctx.fillText(a + w, x0 + 56, y); if (s.sel) { ctx.fillStyle = INK; ctx.fillRect(x0 + 56 + a.length * cwid, y - px * 0.85, w.length * cwid, px * 1.15); ctx.fillStyle = BG; ctx.fillText(w, x0 + 56 + a.length * cwid, y); ctx.fillStyle = INK; }
      y += lh; ctx.fillText((typedStr + b.trimStart()).trim(), x0 + 56, y); y += lh;
    } else {
      ctx.fillText(a, x0 + 56, y);
      const xw = x0 + 56 + a.length * cwid;
      if (s.sel) { ctx.fillRect(xw, y - px * 0.85, w.length * cwid, px * 1.15); ctx.fillStyle = BG; ctx.fillText(w, xw, y); ctx.fillStyle = INK; } else ctx.fillText(w, xw, y);
      const xi = xw + w.length * cwid + cwid;
      ctx.fillText(typedStr, xi, y);
      const xb = xi + typedStr.length * cwid;
      if (typedStr.length > 0 && typedStr.length < INSERT.length) { ctx.fillRect(xb, y - px * 0.85, 3, px * 1.15); }
      ctx.fillText(b.trimStart(), xb, y); y += lh;
    }
    ctx.fillStyle = INK_DIM; ctx.fillText(s.mode === 'split' ? 'the display follows the' : 'the display follows the pointer as it moves', x0 + 56, y); y += lh;
    if (s.mode === 'split') { ctx.fillText('pointer as it moves', x0 + 56, y); y += lh; }
    if (s.mode === 'split') {
      // divider + second user's pane
      ctx.fillStyle = INK_DIM; ctx.fillRect(PANE.x - 20, 96, 1, PANE.h);
      drawPane(ctx, PANE.x, PANE.y, s.detached);
    }
  }
  // the tracking spot ("bug"): a small bright block that follows the mouse (the amber point sits on it on the big screen)
  if (s.cur) { ctx.fillStyle = INK; ctx.globalAlpha = 0.85; ctx.fillRect(s.cur.u * Wp - 5, s.cur.v * Hp - 9, 10, 16); ctx.globalAlpha = 1; }
  // footer status line
  ctx.fillStyle = INK_DIM; ctx.font = MONO(18); ctx.fillText(s.mode === 'outline' ? 'C:  COMMAND   J:  JUMP   I:  INSERT' : s.mode === 'linked' ? 'J:  JUMP   I:  INSERT   R:  REPLACE' : 'SHARED SCREEN   BOTH POINTERS VISIBLE', 64, Hp - 40);
  scr.update();
}
function drawPane(ctx, x, y, detached) {
  if (detached) { ctx.save(); ctx.strokeStyle = INK_DIM; ctx.setLineDash([8, 8]); ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, PANE.w - 1, PANE.h - 1); ctx.restore(); return; }
  ctx.fillStyle = INK_DIM; ctx.font = `600 18px Inter`; ctx.letterSpacing = '3px'; ctx.fillText('WORKSTATION B  ·  SHARED VIEW', x + 20, 118); ctx.letterSpacing = '0px';
  ctx.font = MONO(22); const lh = 22 * 1.75; let yy = 172;
  ctx.fillStyle = INK; ctx.fillText('4A', x + 20, yy); ctx.fillText('COLLABORATION', x + 76, yy); yy += lh + 10;
  for (const l of ['two people, one document', 'each sees what the other', 'points at and types']) { ctx.fillText(l, x + 76, yy); yy += lh; }
  yy += 10; ctx.fillStyle = INK_DIM; ctx.fillText('second pointer:', x + 76, yy); ctx.fillStyle = INK; ctx.fillRect(x + 76 + 16 * 13.2, yy - 18, 12, 22); yy += lh;
  ctx.fillStyle = INK_DIM; ctx.fillText('the text responds', x + 76, yy); yy += lh; ctx.fillText('instantly as you point', x + 76, yy);
}
// Paint the floating-window canvas from the main projection's right pane (plus a thin frame)
export function paintWindow(win, scr) {
  const { ctx, pxW: Wp, pxH: Hp } = win;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, Wp, Hp);
  // draw the pane as it was before detaching: temporarily render pane content into the window canvas
  ctx.save(); ctx.scale(Wp / PANE.w, Hp / PANE.h); ctx.translate(-PANE.x, -PANE.y); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; drawPane(ctx, PANE.x, PANE.y, false); ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, Wp - 3, Hp - 3);
  win.update();
}
export const INKS = { INK, INK_DIM, BG };
