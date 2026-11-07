// SCENE 05 — THE GRAPHICAL REVOLUTION. An exhibition hall with four reconstructed machines on ivory plinths
// (Alto 1973, Star 1981, Lisa 1983, Macintosh 1984), visited as the narration names them. The amber point arrives as
// the pointer, travels from screen to screen, and finally dives into an opened folder on the Macintosh desktop.
// Every machine and screen is an illustrative reconstruction (badge RECON throughout).
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, noise1, deg } from '../lib/util.js';
import { caps, lowerThird, yearStamp, badge, BADGE, bloom, amberDot } from '../lib/gfx.js';
import { AmberPoint, rig } from '../lib/props.js';
import {
  makeHall, makePlinth, makeAlto, makeStar, makeLisa, makeMac, makeFolder, makeBasket,
  drawAlto, drawStar, drawLisa, drawMac, ALTO_CMDS, ALTO_WIN2, starIconRect, lisaIconRect, LISA_TRASH,
  MAC_MENU, MAC_WIN1, MAC_FOLDER, MAC_TRASH, MAC_FWIN, MAC_ICON,
} from './s05_gui.parts.js';

const CH = 5;
const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const SOURCE = 'Reconstruction after period documentation · not a photograph';

// estimated onset of a word inside a narrated sentence (by character proportion of the recorded sentence)
function wordAt(s, word) { if (!s.text) return s.start; const i = s.text.indexOf(word); return i < 0 ? s.start : s.start + (i / s.text.length) * (s.end - s.start); }
const bez = (p0, p1, p2, p3, k, out) => { const u = 1 - k; return out.set(0, 0, 0).addScaledVector(p0, u * u * u).addScaledVector(p1, 3 * u * u * k).addScaledVector(p2, 3 * u * k * k).addScaledVector(p3, k * k * k); };
// eased point-to-point cursor motion through a list of {t, x, y} waypoints (holds between them)
function path(t, pts) {
  if (t <= pts[0].t) return [pts[0].x, pts[0].y];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (t < b.t) { const k = easeInOut(seg(t, a.t, b.t)); return [lerp(a.x, b.x, k), lerp(a.y, b.y, k)]; } }
  const l = pts[pts.length - 1]; return [l.x, l.y];
}
// paint a screen only when its content key changes
function paint(screen, key, fn) { if (screen._key === key) return; screen._key = key; fn(screen.ctx); screen.update(); }
const q = (x, s = 1) => Math.round(x / s) * s;
// soft darkening behind the lower third so ivory type stays legible over ivory plinths
function shade(ctx, a) { const g = ctx.createRadialGradient(420, H - 110, 0, 420, H - 110, 760); g.addColorStop(0, `rgba(13,16,22,${0.78 * a})`); g.addColorStop(0.55, `rgba(13,16,22,${0.5 * a})`); g.addColorStop(1, 'rgba(13,16,22,0)'); ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, H - 900, 1300, 900); ctx.restore(); }

export default {
  id: 's05', title: 'The Graphical Revolution',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.55, grain: 0.03, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    // ---- beats from the narration ----
    const s1 = T.sent(CH, 'In 1973'), s2 = T.sent(CH, 'Star followed'), s3 = T.sent(CH, 'Lisa arrived'), s4 = T.sent(CH, 'Icons looked'), s5 = T.sent(CH, 'folder held'), s6 = T.sent(CH, 'trash can'), s7 = T.sent(CH, 'Complex systems');
    const B = (this.B = {});
    B.start = this.start; B.end = this.end;
    B.y1973 = wordAt(s1, '1973'); B.alto = wordAt(s1, 'Alto'); B.windows = wordAt(s1, 'windows'); B.mouse = wordAt(s1, 'mouse');
    B.click1 = B.windows - 0.2;
    B.toStar0 = s2.start - 0.8; B.toStar1 = wordAt(s2, 'Star') + 0.3; B.y1981 = wordAt(s2, '1981');
    B.click2 = B.y1981 + 0.1; B.dragEnd = B.click2 + 1.5;
    B.toLisa0 = s3.start - 0.5; B.toLisa1 = wordAt(s3, 'Lisa') + 0.25; B.y1983 = wordAt(s3, '1983'); B.mac = wordAt(s3, 'Macintosh'); B.y1984 = wordAt(s3, '1984');
    B.click3 = B.toLisa1 + 0.7;
    B.toMac0 = B.mac + 0.5; B.toMac1 = B.toMac0 + 1.3; B.click4 = B.toMac1 + 0.6; B.menuRelease = B.click4 + 1.1;
    B.icons = s4.start; B.folder = s5.start + 0.05; B.folderDur = 1.15; B.trash = s6.start + 0.05; B.trashDur = 1.1;
    B.click5 = s7.start + 0.7; B.fwin0 = B.click5 + 0.1; B.fwin1 = B.click5 + 0.65;
    B.dive0 = B.click5; B.dive1 = this.end - 0.3; B.overlay = B.fwin1 + 0.3;
    this.cues = {
      point_arrive: B.start + 0.6, click_1: B.click1, window_open: B.click1 + 0.1, point_travel_1: B.toStar0,
      click_2: B.click2, drag_release: B.dragEnd, point_travel_2: B.toLisa0, click_3: B.click3, point_travel_3: B.toMac0,
      click_4: B.click4, menu_close: B.menuRelease, window_close: B.menuRelease + 0.05,
      folder_morph: B.folder, folder_land: B.folder + B.folderDur, trash_morph: B.trash, trash_land: B.trash + B.trashDur,
      click_5: B.click5, folder_window_open: B.fwin0, dive_start: B.dive0 + 0.3, transition_point: this.end - 0.7,
    };

    // ---- the hall ----
    makeHall(g);
    this.lights = rig(g, { key: [2.5, 6, 4.5], keyI: 1.1, keyColor: 0xfff0dc, fill: [-4, 3, 3], fillI: 0.3, fillColor: 0xd3e2ff, rim: [-1, 4, -5], rimI: 0.8, ambient: 0.1 });
    this.spot = new THREE.SpotLight(0xfff1dd, 0, 9, deg(30), 0.55, 1.5); this.spot.position.set(0, 3.2, 1.1); g.add(this.spot, this.spot.target);

    // ---- four plinths and machines ----
    const X = { alto: -3.6, star: -1.2, lisa: 1.2, mac: 3.6 }; this.X = X;
    // Alto: low plinth with the cabinet + display; keyboard and mouse on a desk block in front
    const pa = makePlinth(1.3, 0.25, 1.05); pa.position.set(X.alto, 0, -0.05); g.add(pa);
    const alto = makeAlto(); alto.group.position.set(X.alto, 0.25, -0.1); g.add(alto.group);
    const desk = makePlinth(0.72, 0.72, 0.42); desk.position.set(X.alto + 0.12, 0, 0.62); g.add(desk);
    alto.kb.position.set(X.alto + 0.02, 0.72, 0.62); alto.mouse.position.set(X.alto + 0.39, 0.72, 0.64); g.add(alto.kb, alto.mouse);
    alto.mouseHome = alto.mouse.position.clone();
    const ps = makePlinth(1.2, 0.75, 0.9); ps.position.set(X.star, 0, 0); g.add(ps);
    const star = makeStar(); star.group.position.set(X.star, 0.75, 0); g.add(star.group);
    const pl = makePlinth(1.2, 0.75, 0.9); pl.position.set(X.lisa, 0, 0); g.add(pl);
    const lisa = makeLisa(); lisa.group.position.set(X.lisa, 0.75, 0); g.add(lisa.group);
    const pm = makePlinth(1.55, 0.75, 0.9); pm.position.set(X.mac - 0.1, 0, 0); g.add(pm);
    const mac = makeMac(); mac.group.position.set(X.mac, 0.75, 0); g.add(mac.group);
    mac.mouseHome = mac.mouse.position.clone();
    this.m = { alto, star, lisa, mac };
    for (const m of Object.values(this.m)) m.mouse.userData.home = m.mouse.position.clone();

    // the everyday objects on the Macintosh plinth (left of the machine)
    this.folder = makeFolder(); this.folder.position.set(X.mac - 0.37, 0.75, 0.08); this.folder.rotation.y = deg(14); g.add(this.folder);
    this.basket = makeBasket(); this.basket.position.set(X.mac + 0.46, 0.75, -0.1); g.add(this.basket);
    this.folderHome = this.folder.position.clone(); this.folderQ0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(14), 0));
    this.folderQ1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    this.basketHome = this.basket.position.clone();

    // ---- the amber point ----
    this.point = new AmberPoint(0.009, { lightIntensity: 1.2, lightDistance: 1.6 }); g.add(this.point.group);

    g.updateMatrixWorld(true);
    // world positions of the screen centres (the camera and the point are choreographed around them)
    const SC = (this.SC = {}); for (const [k, m] of Object.entries(this.m)) SC[k] = m.group.localToWorld(m.screenCenter.clone());

    // ---- camera keyframes (pose reached at t; eased between keys) ----
    const K = (t, c, dp, dl, fov = 32) => ({ t, pos: c.clone().add(new THREE.Vector3(...dp)), look: c.clone().add(new THREE.Vector3(...dl)), fov });
    this.keys = [
      K(B.start, SC.alto, [0, 0, 0.72], [0, 0, 0], 30),
      K(B.start + 1.2, SC.alto, [0, 0, 0.74], [0, 0, 0], 30),
      K(B.windows - 0.6, SC.alto, [-1.55, 0.55, 2.75], [0.5, -0.58, 0], 32),
      K(B.toStar0, SC.alto, [-1.6, 0.54, 2.79], [0.5, -0.59, 0], 32),
      K(B.toStar1, SC.star, [-0.95, 0.38, 1.5], [0.3, -0.1, 0], 32),
      K(B.toLisa0, SC.star, [-0.8, 0.32, 1.25], [0.3, -0.09, 0], 32),
      K(B.toLisa1, SC.lisa, [-0.9, 0.36, 1.32], [0.32, -0.1, 0], 32),
      K(B.toMac0, SC.lisa, [-0.76, 0.3, 1.08], [0.32, -0.09, 0], 32),
      K(B.toMac1, SC.mac, [-0.72, 0.34, 1.18], [-0.1, -0.08, 0], 32),
      K(B.icons, SC.mac, [-0.62, 0.3, 1.1], [-0.06, -0.08, 0], 32),
      K(B.trash + 0.45, SC.mac, [-0.58, 0.28, 1.06], [-0.05, -0.08, 0], 32),
      K(B.click5 - 0.2, SC.mac, [-0.16, 0.12, 0.72], [-0.02, -0.03, 0], 32),
      K(B.fwin1 + 0.15, SC.mac, [0, 0, 0.6], [0, 0, 0], 32),
      K(B.dive1, SC.mac, [0, 0, 0.165], [0, 0, 0], 32),
    ];
  },

  // ───────── camera ─────────
  camPose(t) {
    const K = this.keys; const out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 };
    if (t <= K[0].t) { out.pos.copy(K[0].pos); out.look.copy(K[0].look); out.fov = K[0].fov; return out; }
    for (let i = 0; i < K.length - 1; i++) {
      const a = K[i], b = K[i + 1];
      if (t < b.t) { const k = easeInOut(seg(t, a.t, b.t)); out.pos.lerpVectors(a.pos, b.pos, k); out.look.lerpVectors(a.look, b.look, k); out.fov = lerp(a.fov, b.fov, k); return out; }
    }
    const l = K[K.length - 1]; out.pos.copy(l.pos); out.look.copy(l.look); out.fov = l.fov; return out;
  },
  // which machine the point/cursor lives on, and the travel progress between machines
  focus(t) {
    const B = this.B;
    if (t < B.toStar0) return { from: 'alto', to: 'alto', k: 1 };
    if (t < B.toStar1) return { from: 'alto', to: 'star', k: seg(t, B.toStar0, B.toStar1) };
    if (t < B.toLisa0) return { from: 'star', to: 'star', k: 1 };
    if (t < B.toLisa1) return { from: 'star', to: 'lisa', k: seg(t, B.toLisa0, B.toLisa1) };
    if (t < B.toMac0) return { from: 'lisa', to: 'lisa', k: 1 };
    if (t < B.toMac1) return { from: 'lisa', to: 'mac', k: seg(t, B.toMac0, B.toMac1) };
    return { from: 'mac', to: 'mac', k: 1 };
  },

  // ───────── per-screen state (pure functions of t) ─────────
  altoState(t) {
    const B = this.B; const c0 = ALTO_CMDS[0];
    const [cx, cy] = path(t, [{ t: B.start, x: 303, y: 404 }, { t: B.start + 1.3, x: 303, y: 404 }, { t: B.start + 2.6, x: 250, y: 300 }, { t: B.click1 - 1.6, x: 250, y: 300 }, { t: B.click1 - 0.3, x: c0.x + 26, y: 24 }, { t: B.mouse + 0.1, x: c0.x + 26, y: 24 }, { t: B.mouse + 1.5, x: 400, y: 520 }]);
    const press = t >= B.click1 && t < B.click1 + 0.18;
    const win2 = seg(t, B.click1 + 0.1, B.click1 + 0.6);
    return { cx, cy, press, win2 };
  },
  starState(t) {
    const B = this.B; const doc = starIconRect(0), pr = starIconRect(5);
    const dc = [doc[0] + doc[2] / 2, doc[1] + 40], pc = [pr[0] + pr[2] / 2, pr[1] + 40];
    const [cx, cy] = path(t, [{ t: B.toStar1, x: 560, y: 420 }, { t: B.toStar1 + 0.3, x: 560, y: 420 }, { t: B.click2 - 0.1, x: dc[0], y: dc[1] }, { t: B.click2 + 0.25, x: dc[0], y: dc[1] }, { t: B.dragEnd, x: pc[0], y: pc[1] }, { t: B.dragEnd + 0.4, x: pc[0], y: pc[1] }, { t: B.dragEnd + 1.1, x: 700, y: 400 }]);
    const dragging = t >= B.click2 && t < B.dragEnd;
    const sel = t >= B.click2 && t < B.dragEnd + 0.1 ? 0 : -1;
    const flash = t >= B.dragEnd && t < B.dragEnd + 0.9 && Math.floor((t - B.dragEnd) / 0.15) % 2 === 0;
    return { cx, cy, sel, flash, drag: dragging ? { x: cx + 8, y: cy + 8 } : null };
  },
  lisaState(t) {
    const B = this.B; const r = lisaIconRect(0), tr = LISA_TRASH;
    const [cx, cy] = path(t, [{ t: B.toLisa1, x: 500, y: 380 }, { t: B.toLisa1 + 0.25, x: 500, y: 380 }, { t: B.click3 - 0.1, x: r[0] + 60, y: r[1] + 36 }, { t: B.click3 + 0.5, x: r[0] + 60, y: r[1] + 36 }, { t: B.click3 + 1.5, x: tr[0] + 48, y: tr[1] + 40 }]);
    const sel = t >= B.click3 ? 0 : -1;
    const hoverTrash = t >= B.click3 + 1.45;
    return { cx, cy, sel, hoverTrash };
  },
  macState(t) {
    const B = this.B;
    const fx = MAC_FOLDER[0] + MAC_FOLDER[2] / 2, fy = MAC_FOLDER[1] + MAC_ICON / 2;
    const menuH = 18, menuY0 = 26;
    const [cx, cy] = path(t, [{ t: B.toMac1, x: 250, y: 190 }, { t: B.toMac1 + 0.15, x: 250, y: 190 }, { t: B.click4 - 0.08, x: 24, y: 12 }, { t: B.click4 + 0.15, x: 24, y: 12 }, { t: B.menuRelease - 0.1, x: 40, y: menuY0 + menuH * 3.5 }, { t: B.menuRelease + 0.4, x: 40, y: menuY0 + menuH * 3.5 }, { t: B.menuRelease + 1.3, x: 300, y: 220 }, { t: B.click5 - 0.9, x: 300, y: 220 }, { t: B.click5 - 0.12, x: fx + 6, y: fy + 2 }]);
    const menu = t >= B.click4 && t < B.menuRelease + 0.08 ? seg(t, B.click4, B.click4 + 0.14) : 0;
    const menuSel = menu > 0 && t > B.click4 + 0.2 ? clamp(Math.floor((cy - menuY0) / menuH), 0, MAC_MENU.length - 1) : -1;
    const win1 = t < B.menuRelease + 0.1 ? 1 : 1 - seg(t, B.menuRelease + 0.1, B.menuRelease + 0.5);
    const folderK = this.folderMorph(t).icon, trashK = this.trashMorph(t).icon;
    const folderSel = (t >= B.click5 && t < B.click5 + 0.08) || (t >= B.click5 + 0.16 && t < B.fwin0 + 0.25);
    const fwin = seg(t, B.fwin0, B.fwin1);
    const zoom = 1 + 1.6 * easeIn(seg(t, B.fwin1, B.dive1));
    return { cx, cy, menu, menuSel, win1, folderK, trashK, folderSel, fwin, zoom, showCursor: t < B.fwin1 + 0.5 };
  },
  folderMorph(t) { const k = seg(t, this.B.folder, this.B.folder + this.B.folderDur); return { k, icon: seg(k, 0.78, 1), fade: 1 - seg(k, 0.74, 0.96) }; },
  trashMorph(t) { const k = seg(t, this.B.trash, this.B.trash + this.B.trashDur); return { k, icon: seg(k, 0.78, 1), fade: 1 - seg(k, 0.74, 0.96) }; },

  canvasToWorld(screen, px, py, z = 0.008) { return screen.mesh.localToWorld(new THREE.Vector3((px / screen.pxW - 0.5) * screen.w, (0.5 - py / screen.pxH) * screen.h, z)); },
  cursorWorld(name, t) {
    const m = this.m[name]; const st = name === 'alto' ? this.altoState(t) : name === 'star' ? this.starState(t) : name === 'lisa' ? this.lisaState(t) : this.macState(t);
    return this.canvasToWorld(m.screen, st.cx + 2, st.cy + 3);
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera;
    stage.setBackground(PALETTE.graphite); stage.setFog(PALETTE.graphite, 5, 15); stage.setExposure(1.0);
    this.group.updateMatrixWorld(true);
    // camera
    const cp = this.camPose(t); cam.fov = cp.fov; cam.updateProjectionMatrix(); cam.position.copy(cp.pos); cam.lookAt(cp.look); cam.updateMatrixWorld();
    // museum spot: lights the visited plinth, dips while the eye travels between exhibits
    const f = this.focus(t); const sx = f.k < 0.5 ? this.X[f.from] : this.X[f.to]; const dim = f.from === f.to ? 1 : 1 - Math.sin(f.k * Math.PI) * 0.9;
    this.spot.position.set(sx + 0.3, 3.2, 1.0); this.spot.target.position.set(sx, 0.8, 0); this.spot.intensity = 26 * dim;

    // screens (repainted only when their content changes)
    const a = this.altoState(t), s = this.starState(t), l = this.lisaState(t), m = this.macState(t);
    paint(this.m.alto.screen, `${q(a.cx)}|${q(a.cy)}|${a.press}|${q(a.win2, 0.02)}`, (c) => drawAlto(c, a));
    paint(this.m.star.screen, `${q(s.cx)}|${q(s.cy)}|${s.sel}|${s.flash}|${!!s.drag}`, (c) => drawStar(c, s));
    paint(this.m.lisa.screen, `${q(l.cx)}|${q(l.cy)}|${l.sel}|${l.hoverTrash}`, (c) => drawLisa(c, l));
    paint(this.m.mac.screen, `${q(m.cx)}|${q(m.cy)}|${q(m.menu, 0.05)}|${m.menuSel}|${q(m.win1, 0.02)}|${q(m.folderK, 0.02)}|${q(m.trashK, 0.02)}|${m.folderSel}|${q(m.fwin, 0.02)}|${q(m.zoom, 0.01)}|${m.showCursor}`, (c) => drawMac(c, m));
    // the physical mice slide with their cursors
    const slide = (mach, st, cw, ch) => { const h = mach.mouse.userData.home; mach.mouse.position.set(h.x + (st.cx / cw - 0.5) * 0.09, h.y, h.z + (st.cy / ch - 0.5) * 0.07); };
    slide(this.m.alto, a, 606, 808); slide(this.m.star, s, 1024, 808); slide(this.m.lisa, l, 960, 720); slide(this.m.mac, m, 512, 342);

    // ---- the everyday objects → icons ----
    const fm = this.folderMorph(t);
    if (fm.k <= 0) { this.folder.position.copy(this.folderHome); this.folder.quaternion.copy(this.folderQ0); this.folder.scale.setScalar(1); this.folder.userData.setOpen(0.55 + 0.1 * Math.sin(t * 0.7)); this.folder.userData.setOpacity(1); }
    else {
      const tgt = this.canvasToWorld(this.m.mac.screen, MAC_FOLDER[0] + MAC_FOLDER[2] / 2, MAC_FOLDER[1] + MAC_ICON / 2, 0.012);
      const e = easeInOut(fm.k);
      bez(this.folderHome, this.folderHome.clone().add(new THREE.Vector3(0.0, 0.3, 0.12)), tgt.clone().add(new THREE.Vector3(-0.16, 0.12, 0.22)), tgt, e, this.folder.position);
      this.folder.quaternion.slerpQuaternions(this.folderQ0, this.folderQ1, easeInOut(seg(fm.k, 0.05, 0.75)));
      const sTarget = (MAC_ICON * 0.92 / 512) * this.m.mac.screen.w / 0.24;
      this.folder.scale.setScalar(lerp(1, sTarget, easeInOut(seg(fm.k, 0.05, 0.82))));
      this.folder.userData.setOpen(0.55 * (1 - easeInOut(seg(fm.k, 0, 0.4))));
      this.folder.userData.setOpacity(fm.fade);
    }
    const tm = this.trashMorph(t);
    if (tm.k <= 0) { this.basket.position.copy(this.basketHome); this.basket.scale.setScalar(1); this.basket.rotation.set(0, 0, 0); this.basket.userData.setOpacity(1); }
    else {
      const tgt = this.canvasToWorld(this.m.mac.screen, MAC_TRASH[0] + MAC_TRASH[2] / 2, MAC_TRASH[1], 0.012);
      const e = easeInOut(tm.k);
      bez(this.basketHome, this.basketHome.clone().add(new THREE.Vector3(-0.05, 0.32, 0.12)), tgt.clone().add(new THREE.Vector3(0.1, 0.14, 0.22)), tgt, e, this.basket.position);
      const sTarget = (MAC_ICON * 0.9 / 342) * this.m.mac.screen.h / 0.27;
      const sc = lerp(1, sTarget, easeInOut(seg(tm.k, 0.05, 0.82)));
      this.basket.scale.set(sc, sc, sc * lerp(1, 0.12, seg(tm.k, 0.5, 0.95)));
      this.basket.rotation.y = -e * Math.PI * 0.5;
      this.basket.userData.setOpacity(tm.fade);
    }

    // ---- the amber point: the pointer that travels between machines ----
    const P = this.point;
    if (t < B.overlay) {
      let pos;
      if (f.from === f.to) pos = this.cursorWorld(f.to, t);
      else { const pa = this.cursorWorld(f.from, B[f.to === 'star' ? 'toStar0' : f.to === 'lisa' ? 'toLisa0' : 'toMac0']), pb = this.cursorWorld(f.to, t); const k = easeInOut(f.k); pos = pa.clone().lerp(pb, k); pos.y += Math.sin(k * Math.PI) * 0.28; pos.z += Math.sin(k * Math.PI) * 0.45; }
      const travel = f.from === f.to ? 0 : Math.sin(f.k * Math.PI);
      const arrive = 1 - ease(t, B.start + 0.6, B.start + 1.8, easeOut);
      const clicks = [B.click1, B.click2, B.click3, B.click4, B.click5].reduce((acc, c) => Math.max(acc, fadeIO(t, c - 0.02, c + 0.35, 0.03, 0.3)), 0);
      P.group.position.copy(pos);
      P.setIntensity(0.55 + 0.9 * travel + 0.8 * arrive + 0.5 * clicks).setScale(1 + 1.8 * travel + 1.2 * arrive + 0.5 * clicks).pulse(t, 0.06, 1.3);
      P.group.visible = true;
    } else P.group.visible = false;
  },

  worldToScreen(v, cam) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; },

  draw2d(ctx, t, stage) {
    const B = this.B, cam = stage.camera;
    // ---- the dive: the Macintosh desktop re-drawn crisply on the overlay in the screen's projected rectangle ----
    const ov = seg(t, B.overlay, B.overlay + 0.35);
    if (ov > 0) {
      const scr = this.m.mac.screen; const pts = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([u, v]) => this.worldToScreen(scr.mesh.localToWorld(new THREE.Vector3(u * scr.w, v * scr.h, 0)), cam));
      const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
      const m = this.macState(t);
      ctx.save(); ctx.globalAlpha = ov; ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.translate(x0, y0); ctx.scale((x1 - x0) / 512, (y1 - y0) / 342); drawMac(ctx, m); ctx.restore();
      // the point rides to the centre of the opened folder and swells into the hand-off bloom
      const pc = this.worldToScreen(this.canvasToWorld(scr, m.cx + 2, m.cy + 3), cam);
      const k = easeInOut(seg(t, B.overlay + 0.2, B.end - 0.55));
      const px = lerp(pc[0], W / 2, k), py = lerp(pc[1], H / 2, k);
      amberDot(ctx, px, py, lerp(10, 30, k), 1, { glow: 5 + 3 * k });
    }

    // ---- labels ----
    const yx = 120, yy = 250;
    yearStamp(ctx, '1973', yx, yy, fadeIO(t, B.y1973, B.toStar0 + 0.2, 0.5, 0.5));
    yearStamp(ctx, '1981', yx, yy, fadeIO(t, B.y1981, B.toLisa0 + 0.2, 0.5, 0.5));
    const a83 = fadeIO(t, B.y1983, B.icons - 0.3, 0.5, 0.6), a84 = fadeIO(t, B.y1984, B.icons - 0.3, 0.5, 0.6);
    yearStamp(ctx, '1983', yx, yy, a83);
    if (a84 > 0) { ctx.save(); ctx.globalAlpha = a84 * 0.6; ctx.fillStyle = PALETTE.gray2; ctx.fillRect(yx + 356, yy - 96, 1.5, 100); ctx.restore(); yearStamp(ctx, '1984', yx + 386, yy, a84); }
    const cy2 = 292;
    caps(ctx, 'Xerox Alto', yx + 4, cy2, { alpha: fadeIO(t, B.alto, B.toStar0 + 0.2, 0.5, 0.5) });
    caps(ctx, 'Xerox Star', yx + 4, cy2, { alpha: fadeIO(t, B.toStar1 - 0.3, B.toLisa0 + 0.2, 0.5, 0.5) });
    caps(ctx, 'Apple Lisa', yx + 4, cy2, { alpha: fadeIO(t, B.toLisa1 - 0.3, B.toMac0 + 0.1, 0.5, 0.5) });
    caps(ctx, 'Macintosh', yx + 4, cy2, { alpha: fadeIO(t, B.toMac1 - 0.3, B.icons - 0.3, 0.5, 0.5) });
    caps(ctx, 'Icons as familiar objects', yx + 4, cy2, { alpha: fadeIO(t, B.icons + 0.1, B.click5 - 0.6, 0.5, 0.5) });
    caps(ctx, 'The language of everyday life', yx + 4, cy2, { alpha: fadeIO(t, B.click5 - 0.3, B.overlay + 0.6, 0.5, 0.5) });
    // lower thirds (one at a time; dated facts appear only once the narrator has said the year)
    const lt = (t0, t1, title, sub) => { const al = fadeIO(t, t0, t1, 0.6, 0.5); if (al > 0) { shade(ctx, al); lowerThird(ctx, { title, sub, source: SOURCE, alpha: al, reveal: seg(t, t0, t0 + 0.9) }); } };
    lt(B.alto + 0.4, B.toStar0 + 0.2, 'Experimental research machine', 'Xerox PARC — never sold to the public');
    lt(B.y1981, B.toLisa0 + 0.2, 'Xerox Star 8010', 'Announced April 1981 · desktop metaphor');
    lt(B.y1983, B.toMac1, 'Apple Lisa', 'Announced Jan 1983, shipped June 1983');
    lt(B.toMac1 + 0.3, B.icons - 0.3, 'Macintosh', 'Windows, icons, menu bar, Trash · one-button mouse');
    lt(B.icons + 0.6, B.click5 - 0.4, 'The desktop metaphor', 'A paper folder and a wastebasket become icons on the screen');
    // provenance badge — always, while any reconstruction is on screen
    badge(ctx, BADGE.RECON, W - 120, H - 70, Math.min(seg(t, B.start + 0.5, B.start + 1.2), 1 - seg(t, B.end - 0.6, B.end - 0.2)), { align: 'right', color: ov > 0.5 ? PALETTE.gray2 : PALETTE.gray });

    // ---- hand-off blooms ----
    bloom(ctx, 1 - seg(t, B.start, B.start + 0.8));
    bloom(ctx, seg(t, this.end - 0.7, this.end));
  },
};
