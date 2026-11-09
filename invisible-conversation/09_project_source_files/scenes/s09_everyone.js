// SCENE 09 — DESIGN FOR EVERYONE. A collaborative canvas in 3D (role cursors, tokens → components → three devices),
// then accessibility shown one idea at a time on a single panel, a quiet helpful-vs-manipulative contrast, WCAG 2.2,
// and the cards drifting into depth as spatial panels before the bloom-out.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, noise1, hash, deg } from '../lib/util.js';
import { text, caps, badge, BADGE, bloom } from '../lib/gfx.js';
import { mat, roundedBox, box, cylinder, plane, floor, makeScreen, AmberPoint, glowSprite, rig } from '../lib/props.js';
import { ROLES, CARD_KINDS, drawCard, drawTokens, drawDeviceScreen, drawCursor, drawMessagePanel, drawA11y } from './s09_everyone.parts.js';

const CH = 9;
const V = new THREE.Vector3();
const BOARD = { x: 0.1, y: 1.36, w: 3.9, h: 1.5 };
const CARD = { w: 0.64, h: 0.4 };
const PANEL = { x: 0.1, y: 1.3, z: 1.9, w: 1.44, h: 0.96 };
const cardPos = (j) => ({ x: -0.4 + (j % 4) * 0.7, y: j < 4 ? 1.62 : 1.1 });

// piecewise keyframe interpolation: keys = [[t, ...values]]
function keyed(keys, t, fn = easeInOut) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b[0]) { const k = fn(seg(t, a[0], b[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], k)); }
  }
  return keys[keys.length - 1].slice(1);
}

export default {
  id: 's09', title: 'Design for Everyone',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.5, grain: 0.028, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    const S = (n) => T.sent(CH, n);
    const s1 = S('Today, designers'), s2 = S('Browser-based'), s3 = S('But progress'), s4 = S('It is readable'), s5 = S('Standards such as'), s6 = S('What counts');
    const B = (this.B = {
      tokens: s1.start + 1.6,                 // tokens flow into the components
      ticks: [s1.start + 0.85, s1.start + 2.05, s1.start + 3.25],
      devices: s1.start + 3.5,                // the three device frames rise
      assemble: s1.start + 3.9,               // screens assemble (→ +2.2 s)
      caps: s2.start,                         // BROWSER-BASED COLLABORATIVE DESIGN — 2010s
      capsOut: s3.start - 0.1,
      a11yIn: s3.start,                       // canvas recedes, the accessibility panel comes forward
      text: s4.start,                         // readable text + contrast
      focus: s4.start + 2.45,                 // keyboard focus ring
      error: s4.start + 3.95,                 // accessible error message
      choice: s4.start + 5.15,                // helpful vs manipulative (≈ 4.2 s)
      labels: s5.start + 2.55,                // labels on icon-only buttons
      motion: s5.start + 4.15,                // reduce-motion toggle
      inputs: s6.start + 1.55,                // four input methods + silhouettes
      wcag: s5.start, wcagOut: s5.start + 3.9,
      layers: this.end - 1.95,                // cards separate into spatial layers
      end: this.end,
    });
    B.hops = [B.focus + 0.1, B.focus + 0.46, B.focus + 0.82, B.focus + 1.18];
    B.flip = B.motion + 0.95;
    this.cues = {
      collab_tick_1: B.ticks[0], collab_tick_2: B.ticks[1], collab_tick_3: B.ticks[2],
      tokens_flow: B.tokens, devices_rise: B.devices, screens_assemble: B.assemble, caps_in: B.caps,
      panel_in: B.a11yIn + 0.4,
      focus_tick_1: B.hops[0], focus_tick_2: B.hops[1], focus_tick_3: B.hops[2], focus_tick_4: B.hops[3],
      error_message: B.error + 0.8, choice_mark: B.choice + 2.7, toggle: B.flip, layers_drift: B.layers,
      transition_point: this.end - 0.7,
    };

    rig(g, { key: [2.5, 5, 4.5], keyI: 1.6, keyColor: 0xf3f0ff, fill: [-4, 2.5, 3.5], fillI: 0.35, fillColor: 0xbfe0ff, rim: [0, 3, -5], rimI: 0.8, ambient: 0.16 });
    this.keyLight = new THREE.PointLight(0x80C9F8, 0.9, 9, 1.4); this.keyLight.position.set(0.2, 2.4, 2.4); g.add(this.keyLight);
    g.add(floor(40, mat.graphite({ roughness: 0.38, metalness: 0.2 })));

    // ---- the canvas board: dark slab with a faint dot grid ----
    const grid = document.createElement('canvas'); grid.width = grid.height = 128; const gx = grid.getContext('2d'); gx.fillStyle = '#10141b'; gx.fillRect(0, 0, 128, 128); gx.fillStyle = 'rgba(246,242,232,0.16)'; gx.beginPath(); gx.arc(64, 64, 2, 0, 7); gx.fill();
    const gridTex = new THREE.CanvasTexture(grid); gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(BOARD.w / 0.1, BOARD.h / 0.1); gridTex.colorSpace = THREE.SRGBColorSpace;
    const board = roundedBox(BOARD.w, BOARD.h, 0.04, 0.02, new THREE.MeshStandardMaterial({ color: 0xffffff, map: gridTex, roughness: 0.55, metalness: 0.1 })); board.position.set(BOARD.x, BOARD.y, -0.02); g.add(board); this.board = board;
    const edge = roundedBox(BOARD.w + 0.04, BOARD.h + 0.04, 0.03, 0.02, mat.graphiteLight({ roughness: 0.4, metalness: 0.5 })); edge.position.set(BOARD.x, BOARD.y, -0.045); g.add(edge);

    // ---- token panel ----
    const tk = (this.tokens = { group: new THREE.Group(), key: '' });
    tk.group.position.set(-1.3, 1.36, 0.03);
    tk.group.add(roundedBox(0.64, 1.18, 0.025, 0.012, mat.graphiteLight({ roughness: 0.5 })));
    tk.screen = makeScreen(0.62, 1.1625, 512, 960); tk.screen.mesh.position.z = 0.014; tk.group.add(tk.screen.mesh); g.add(tk.group);

    // ---- component cards ----
    this.cards = CARD_KINDS.map((kind, j) => {
      const c = { kind, group: new THREE.Group(), key: '', styled: false };
      const p = cardPos(j); c.group.position.set(p.x, p.y, 0.035); c.home = c.group.position.clone();
      c.back = roundedBox(CARD.w, CARD.h, 0.025, 0.012, mat.graphiteLight({ roughness: 0.5 })); c.group.add(c.back);
      c.screen = makeScreen(0.62, 0.3875, 512, 320); c.screen.mesh.position.z = 0.014; c.group.add(c.screen.mesh);
      g.add(c.group); return c;
    });

    // ---- cursors (role-named) + the amber point as the Designer's cursor ----
    this.cursors = ROLES.map((role, i) => {
      const scr = makeScreen(0.34, 0.1275, 256, 96); drawCursor(scr.ctx, 256, 96, role); scr.update();
      scr.material.transparent = true; scr.material.depthWrite = false;
      const grp = new THREE.Group(); scr.mesh.position.set(0.34 * (0.5 - 14 / 256), -0.1275 * (0.5 - 10 / 96), 0); grp.add(scr.mesh); grp.position.z = 0.09; g.add(grp);
      return { role, group: grp, screen: scr };
    });
    this.point = new AmberPoint(0.022, { lightIntensity: 2, lightDistance: 3 }); g.add(this.point.group);

    // ---- flowing pellets (tokens → cards, cards → devices) ----
    this.pellets = [];
    for (let j = 0; j < 16; j++) { const sp = glowSprite(PALETTE.cyan, 0.16, 0.9); const core = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 12), mat.cyanGlow(1.8)); const grp = new THREE.Group(); grp.add(sp, core); grp.visible = false; g.add(grp); this.pellets.push(grp); }

    // ---- devices: phone / tablet / desktop in front of the board ----
    const dev = (this.devices = []);
    const mk = (kind, x, w, h, sw, sh, px, py, yc, extra) => {
      const grp = new THREE.Group(); grp.position.set(x, yc, 0.75);
      const body = roundedBox(w, h, 0.03, kind === 'desktop' ? 0.012 : 0.03, mat.darkMetal({ roughness: 0.35, metalness: 0.7 })); grp.add(body);
      const scr = makeScreen(sw, sh, px, py); scr.mesh.position.z = 0.016; grp.add(scr.mesh);
      if (extra) extra(grp);
      g.add(grp); const d = { kind, group: grp, screen: scr, key: '', yc }; dev.push(d); return d;
    };
    mk('tablet', -0.85, 0.46, 0.62, 0.42, 0.56, 384, 512, 0.31);
    mk('desktop', 0.2, 0.94, 0.58, 0.9, 0.52, 768, 444, 0.55, (grp) => { const neck = box(0.06, 0.2, 0.03, mat.darkMetal()); neck.position.set(0, -0.38, -0.01); grp.add(neck); const foot = roundedBox(0.36, 0.015, 0.16, 0.006, mat.darkMetal()); foot.position.set(0, -0.545, 0.02); grp.add(foot); });
    mk('phone', 1.25, 0.21, 0.43, 0.19, 0.4, 256, 540, 0.215);

    // ---- dimmer between the canvas and the accessibility panel ----
    this.dimmer = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ color: 0x0D1016, transparent: true, opacity: 0, depthWrite: false })); this.dimmer.position.set(0, 1.3, 0.9); g.add(this.dimmer);

    // ---- the accessibility panel ----
    const pn = (this.panel = { group: new THREE.Group(), key: '' });
    pn.group.position.set(PANEL.x, PANEL.y, PANEL.z);
    pn.back = roundedBox(PANEL.w + 0.05, PANEL.h + 0.05, 0.03, 0.015, mat.graphiteLight({ roughness: 0.45, metalness: 0.4, transparent: true })); pn.group.add(pn.back);
    pn.screen = makeScreen(PANEL.w, PANEL.h, 1536, 1024); pn.screen.mesh.position.z = 0.016; pn.screen.material.transparent = true; pn.group.add(pn.screen.mesh); g.add(pn.group);

    // ---- spatial layers for the hand-off ----
    this.layers = [];
    const L = [[-0.85, 1.62, -0.15, 0.5], [0.8, 1.6, -0.35, -0.45], [-0.75, 0.9, -0.5, 0.35], [0.95, 0.95, -0.65, -0.35], [0.15, 1.9, -0.85, 0.0], [-1.3, 1.3, -0.95, 0.6]];
    L.forEach((p, i) => {
      const grp = new THREE.Group(); let mesh;
      if (i < 3) { const scr = makeScreen(0.8, 0.47, 512, 300); drawMessagePanel(scr.ctx, 512, 300, i); scr.update(); scr.material.transparent = true; scr.material.depthWrite = false; mesh = scr.mesh; grp.userData.mat = scr.material; }
      else { mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), new THREE.MeshBasicMaterial({ color: 0x1F2632, transparent: true, opacity: 0.8, depthWrite: false })); const ed = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x80C9F8, transparent: true, opacity: 0.6 })); grp.add(ed); grp.userData.edge = ed.material; grp.userData.mat = mesh.material; }
      grp.add(mesh); grp.visible = false; grp.userData.target = p; g.add(grp); this.layers.push(grp);
    });
  },

  // cursor paths: waypoints [t, x, y] over the board
  cursorPos(i, t) {
    const B = this.B, t0 = this.start;
    const paths = [
      [[t0, -0.9, 1.0], [B.ticks[0], 0.3, 1.5], [B.ticks[1], 1.0, 1.0], [B.ticks[2], 1.7, 1.52], [B.devices + 1.2, 1.3, 0.85], [B.a11yIn, 0.45, 1.2], [B.a11yIn + 1.5, 0.3, 1.1]],
      [[t0, 1.9, 0.75], [B.ticks[0] + 0.6, 1.0, 1.55], [B.ticks[1] + 1.0, -0.3, 1.05], [B.caps + 1.0, 0.9, 1.3], [B.a11yIn + 1.5, 1.6, 0.95]],
      [[t0, -1.2, 1.95], [B.tokens + 0.3, -1.35, 1.35], [B.devices + 0.9, -0.45, 1.6], [B.caps + 1.6, -0.95, 1.0], [B.a11yIn + 1.5, -1.45, 1.5]],
    ];
    const [x, y] = keyed(paths[i], t);
    const n = 0.03; return [x + (noise1(t * 0.7 + i * 11) - 0.5) * n, y + (noise1(t * 0.6 + i * 23 + 5) - 0.5) * n];
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera;
    cam.fov = 35; cam.updateProjectionMatrix();
    stage.setBackground(PALETTE.graphite); stage.setFog(PALETTE.graphite, 8, 26);

    // ---- camera ----
    const K = [
      [this.start, 0.1, 1.45, 4.6, 0.1, 1.35, 0], [B.devices - 0.2, 0.3, 1.5, 4.3, 0.2, 1.3, 0],
      [B.assemble + 1.3, 0.35, 1.15, 3.5, 0.2, 0.7, 0.75], [B.a11yIn - 0.3, -0.1, 1.75, 5.7, 0.2, 1.1, 0.3],
      [B.text, PANEL.x, PANEL.y, PANEL.z + 1.8, PANEL.x, PANEL.y, PANEL.z], [B.layers, PANEL.x + 0.06, PANEL.y + 0.04, PANEL.z + 1.76, PANEL.x, PANEL.y, PANEL.z],
      [this.end, PANEL.x, PANEL.y, PANEL.z + 2.0, PANEL.x, PANEL.y, PANEL.z],
    ];
    const c = keyed(K, t); cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]);

    // ---- cursors + amber point ----
    const curA = 1 - ease(t, B.a11yIn + 0.6, B.a11yIn + 1.8);
    this.cursors.forEach((cu, i) => { const [x, y] = this.cursorPos(i, t); cu.group.position.set(x, y, 0.09); cu.group.visible = curA > 0.01; cu.screen.material.opacity = curA; });
    // the three collaborators are visible; one idea at a time → a click selects a card
    const clickCard = [1, 6, 3];
    this.cards.forEach((cd, j) => {
      const styled = seg(t, B.tokens + 0.35 + j * 0.12, B.tokens + 0.5 + j * 0.12) > 0.99;
      let sel = 0; clickCard.forEach((cj, i) => { if (cj === j) sel = Math.max(sel, fadeIO(t, B.ticks[i], B.ticks[i] + 1.4, 0.12, 0.6)); });
      const press = clickCard.map((cj, i) => cj === j ? Math.sin(Math.PI * seg(t, B.ticks[i], B.ticks[i] + 0.25)) : 0).reduce((a, b) => Math.max(a, b), 0);
      const key = `${styled ? 1 : 0}|${Math.round(sel * 10)}`;
      if (key !== cd.key) { cd.key = key; drawCard(cd.screen.ctx, 512, 320, cd.kind, styled ? 1 : 0, sel); cd.screen.update(); }
      // after the hand-off begins, the cards are hidden behind the dimmer anyway
      cd.group.position.copy(cd.home); cd.group.position.z = cd.home.z - 0.012 * press; cd.group.scale.setScalar(1 - 0.02 * press);
    });
    const tkGlow = fadeIO(t, B.tokens - 0.4, B.tokens + 1.6, 0.4, 0.6); const tkKey = String(Math.round(tkGlow * 8));
    if (tkKey !== this.tokens.key) { this.tokens.key = tkKey; drawTokens(this.tokens.screen.ctx, 512, 960, tkGlow); this.tokens.screen.update(); }

    // ---- pellets: tokens → cards, then cards → devices ----
    this.pellets.forEach((p, j) => {
      let vis = false;
      if (j < 8) { const t0 = B.tokens + j * 0.12, k = seg(t, t0, t0 + 0.5); if (k > 0 && k < 1) { vis = true; const e = easeInOut(k); const cp = cardPos(j); V.set(lerp(-1.0, cp.x, e), lerp(1.3, cp.y, e) + Math.sin(k * Math.PI) * 0.18, 0.1 + Math.sin(k * Math.PI) * 0.12); p.position.copy(V); } }
      else { const i = j - 8, t0 = B.assemble - 0.3 + i * 0.16, k = seg(t, t0, t0 + 0.65); if (k > 0 && k < 1) { vis = true; const e = easeInOut(k); const cp = cardPos(i), d = this.devices[i % 3]; V.set(lerp(cp.x, d.group.position.x, e), lerp(cp.y, d.yc, e) + Math.sin(k * Math.PI) * 0.15, lerp(0.08, 0.78, e)); p.position.copy(V); } }
      p.visible = vis; if (vis) p.scale.setScalar(1 + 0.25 * Math.sin(t * 9 + j));
    });

    // ---- devices rise, screens assemble consistently ----
    const rise = ease(t, B.devices, B.devices + 0.9, easeOut);
    this.devices.forEach((d, i) => {
      const dr = ease(t, B.devices + i * 0.15, B.devices + 0.9 + i * 0.15, easeOut);
      d.group.position.y = lerp(d.yc - 0.75, d.yc, dr); d.group.visible = dr > 0.001;
      const k = ease(t, B.assemble + i * 0.12, B.assemble + 2.2 + i * 0.12, easeOut); const key = String(Math.round(k * 48));
      if (key !== d.key) { d.key = key; drawDeviceScreen(d.screen.ctx, d.screen.pxW, d.screen.pxH, d.kind, k); d.screen.update(); }
    });
    this.keyLight.intensity = 0.9 + 0.5 * rise;

    // ---- the canvas recedes behind a dimmer; the accessibility panel comes forward ----
    const dim = ease(t, B.a11yIn, B.a11yIn + 1.4); this.dimmer.material.opacity = 0.82 * dim; this.dimmer.visible = dim > 0;
    const pIn = ease(t, B.a11yIn + 0.5, B.a11yIn + 1.7, easeOut), pOut = ease(t, B.layers, B.layers + 0.8);
    const pA = pIn * (1 - pOut);
    this.panel.group.visible = pA > 0.001;
    this.panel.group.position.set(PANEL.x, lerp(PANEL.y - 0.35, PANEL.y, pIn), lerp(PANEL.z - 0.6, PANEL.z, pIn) + 0.5 * easeIn(pOut));
    this.panel.back.material.opacity = pA; this.panel.screen.material.opacity = pA;
    if (this.panel.group.visible) {
      // which idea is on screen
      let st; const q = (x) => Math.round(x * 48) / 48;
      if (t < B.focus) st = { idea: 'text', k: q(t - B.text) };
      else if (t < B.error) { const hop = B.hops.slice(1).reduce((a, h) => a + seg(t, h, h + 0.2), 0); st = { idea: 'focus', k: q(t - B.focus), hop: q(hop) }; }
      else if (t < B.choice) st = { idea: 'error', k: q(t - B.error) };
      else if (t < B.labels) st = { idea: 'choice', k: q(t - B.choice) };
      else if (t < B.motion) st = { idea: 'labels', k: q(t - B.labels) };
      else if (t < B.inputs) st = { idea: 'motion', k: q(t - B.motion), flip: B.flip - B.motion };
      else st = { idea: 'inputs', k: q(t - B.inputs) };
      const key = JSON.stringify(st);
      if (key !== this.panel.key) { this.panel.key = key; drawA11y(this.panel.screen.ctx, 1536, 1024, st, 1); this.panel.screen.update(); }
    }

    // ---- amber point: Designer's cursor → the panel's idea marker → centre for the bloom ----
    const [dx, dy] = this.cursorPos(0, t);
    const toPanel = ease(t, B.a11yIn + 0.3, B.text - 0.2);
    const markerY = PANEL.y + PANEL.h / 2 - 0.082, markerX = PANEL.x - PANEL.w / 2 + 0.05;
    V.set(lerp(dx, markerX, toPanel), lerp(dy, markerY, toPanel), lerp(0.1, PANEL.z + 0.03, easeOut(toPanel)) + 0.45 * Math.sin(Math.PI * toPanel));
    const toCentre = ease(t, B.layers + 0.2, this.end - 0.25, easeInOut);
    V.lerp(new THREE.Vector3(PANEL.x, PANEL.y, PANEL.z + 0.45), toCentre);
    this.point.group.position.copy(V);
    const focusDip = fadeIO(t, B.focus, B.error, 0.3, 0.3); // the point lends itself to the focus ring
    this.point.setIntensity(lerp(1, 0.25, focusDip) * (1 + 0.8 * toCentre)).setScale(1 + 0.4 * toPanel + 2.2 * easeIn(toCentre)).pulse(t, 0.08, 1.3);

    // ---- spatial layers for the hand-off ----
    const lk = seg(t, B.layers, this.end - 0.3);
    this.layers.forEach((l, i) => {
      const k = easeInOut(seg(lk, i * 0.06, 0.7 + i * 0.06)); l.visible = k > 0.001;
      const [tx, ty, tz, ry] = l.userData.target;
      l.position.set(lerp(PANEL.x + (i % 2 ? 0.25 : -0.25), tx, k), lerp(PANEL.y + (i < 3 ? 0.15 : -0.15), ty, k), lerp(PANEL.z, PANEL.z + tz, k));
      l.rotation.y = ry * k; l.rotation.x = (i === 4 ? 0.25 : -0.05) * k;
      const a = Math.min(1, k * 2.5) * (i < 3 ? 1 : 0.8); l.userData.mat.opacity = a; if (l.userData.edge) l.userData.edge.opacity = 0.7 * Math.min(1, k * 2.5);
    });
    stage.setExposure(1.0);
  },

  draw2d(ctx, t) {
    const B = this.B;
    // bloom-in from the previous chapter
    bloom(ctx, 1 - seg(t, this.start, this.start + 0.8));
    // provenance badge
    badge(ctx, BADGE.VIS, W - 120, H - 70, fadeIO(t, this.start + 0.9, this.end - 0.75, 0.5, 0.5), { align: 'right' });
    // era label on 'Browser-based tools allow teams to design together'
    const ca = fadeIO(t, B.caps, B.capsOut, 0.45, 0.45);
    if (ca > 0) { caps(ctx, 'Browser-based collaborative design — 2010s', 120, H - 150, { alpha: ca }); text(ctx, 'e.g. Figma, public release September 2016', 120, H - 116, { size: 22, weight: 400, color: PALETTE.gray, alpha: ca }); }
    // WCAG on 'Standards such as WCAG 2.2'
    const wa = fadeIO(t, B.wcag, B.wcagOut, 0.45, 0.45);
    if (wa > 0) { caps(ctx, 'WCAG 2.2 — 2023', 120, H - 150, { alpha: wa, color: PALETTE.cyan }); text(ctx, 'W3C Recommendation, 5 October 2023', 120, H - 116, { size: 22, weight: 400, color: PALETTE.gray, alpha: wa }); }
    // hand-off bloom
    bloom(ctx, seg(t, this.end - 0.7, this.end));
  },
};
