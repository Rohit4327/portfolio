// SCENE 07 — THE WEB GOES MOBILE. A crowded 1990s page on a CRT and its restructure, the 1999 keyboard-focus ring,
// a 2007-style multi-touch phone (tap / flick / pinch), and one article reflowing across desktop → tablet → phone (2010).
// The phone screen finally expands into a contemporary design workspace → bloom-out. All pages are fictional.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, hash, noise1, deg } from '../lib/util.js';
import { text, caps, lowerThird, badge, BADGE, bloom, dip, amberDot, cursor, roundRect, fillRoundRect } from '../lib/gfx.js';
import { mat, roundedBox, box, cylinder, plane, makeScreen, AmberPoint, rig } from '../lib/props.js';
import { paintBrowser90, paintCrowded, paintClean, crtFinish, paintHome, paintAlbums, paintGrid, paintPhoto, PHONE_ICON_POS, GRID_THUMB, GRID_H, layoutFor, drawArticle, paintDesktopWindow, drawWorkspace } from './s07_mobile.parts.js';

const CH = 7;
const V = new THREE.Vector3();
const shadowBounds = (light, r, near = 0.05, far = 12) => { const c = light.shadow.camera; c.left = c.bottom = -r; c.right = c.top = r; c.near = near; c.far = far; c.updateProjectionMatrix(); light.shadow.bias = -0.0003; light.shadow.normalBias = r < 0.5 ? 0.004 : 0.02; };
const retarget = (r, group, x, y, z) => { for (const l of [r.key, r.fill, r.rim]) { l.target.position.set(x, y, z); group.add(l.target); } };
const paintOnce = (scr, key, fn) => { if (scr._key === key) return; scr._key = key; fn(scr.ctx, scr.pxW, scr.pxH); scr.update(); };
const offscreen = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const r = fn(c.getContext('2d'), w, h); c._r = r; return c; };
const scaleLayout = (L, s) => { const o = { w: L.w * s, h: L.h * s, mode: L.mode, size: { body: L.size.body * s, lh: L.size.lh * s, title: L.size.title * s, dek: L.size.dek * s, nav: 14 }, blocks: {} }; const sc = (b) => ({ x: b.x * s, y: b.y * s, w: b.w * s, h: b.h * s, a: b.a, size: (b.size ?? 0) * s }); for (const k in L.blocks) { const b = L.blocks[k]; o.blocks[k] = Array.isArray(b) ? b.map(sc) : sc(b); } return o; };
// small transparent canvas-textured plane (icons, markings)
function canvasPlane(w, h, px, fn) { const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w); fn(c.getContext('2d'), c.width, c.height); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false })); }

export default {
  id: 's07', title: 'The Web Goes Mobile',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.5, grain: 0.03, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    const C = T.ch(CH); const s = (n, d) => T.sent(CH, n, d);
    const s1 = s('As websites', C.start + 0.7), s2 = s('Accessibility', C.start + 7.3), s3 = s('in 2007', C.start + 14.6), s4 = s('In 2010', C.start + 21.7), s5 = s('no longer', C.start + 27.1);
    const B = (this.B = {
      start: this.start, end: this.end,
      click: this.start + 1.0, netEnd: this.start + 1.9, pushEnd: s1.start + 1.7,
      restructure: s1.start + 5.9, restructureDur: 1.3, calloutDur: 1.3,
      focusForm: s2.start + 1.4, ticks: [0, 1, 2, 3].map((i) => s2.start + 2.1 + i), wcag: s2.end - 1.15,
      cutB: s3.start + 0.35, caps2007: s3.start + 1.0, phoneLabel: s3.start + 1.5, footnote: s3.start + 2.9,
      tap1: s3.start + 2.2, tap2: s3.start + 2.6, flick1: s3.start + 3.1, flick2: s3.start + 3.7, tap3: s3.start + 4.3, pinch: s3.start + 4.8, pinchDur: 1.1,
      cutC: s3.end + 0.3, caps2010: s4.start + 0.4, desktopOn: s4.start + 0.3,
      reflow1: s4.start + 1.4, reflow2: s4.start + 3.0, reflow3: s4.start + 4.5, reflowDur: 0.9, narrowDur: 1.5,
      pushStart: s5.start + 0.6, pushEnd2: s5.start + 2.9, expand: s5.start + 2.3, expandEnd: this.end - 1.0,
    });
    { const base = Math.max(s1.start + 0.6, B.netEnd + 0.3); const sp = (B.restructure - base - B.calloutDur) / 3; B.callouts = [0, 1, 2, 3].map((i) => base + i * sp); }
    this.cues = {
      link_click: B.click, focus_tick_1: B.ticks[0], focus_tick_2: B.ticks[1], focus_tick_3: B.ticks[2], focus_tick_4: B.ticks[3],
      tap_1: B.tap1, tap_2: B.tap2, tap_3: B.tap3, flick_1: B.flick1, flick_2: B.flick2, pinch: B.pinch,
      reflow_1: B.reflow1, reflow_2: B.reflow2, reflow_3: B.reflow3, transition_point: this.end - 0.7,
    };

    // =============== SET A: a mid-1990s CRT monitor on a desk ===============
    const A = (this.setA = new THREE.Group()); g.add(A);
    const rA = rig(A, { key: [1.4, 2.0, 1.6], keyI: 1.25, keyColor: 0xfff0dc, fill: [-2.0, 1.2, 1.4], fillI: 0.35, fillColor: 0xd8e6ff, rim: [0.2, 1.4, -1.6], rimI: 0.8, ambient: 0.09 }); shadowBounds(rA.key, 1.2);
    const desk = plane(6, 3.5, mat.std(0x2a2e36, { roughness: 0.45, metalness: 0.15 })); desk.rotation.x = -Math.PI / 2; desk.position.set(0, 0, 0.4); A.add(desk);
    const wallA = plane(9, 4, mat.std(0x141820, { roughness: 1 })); wallA.position.set(0, 2, -1.2); A.add(wallA);
    const beige = mat.beige({ roughness: 0.62 }), beigeD = mat.beigeDark({ roughness: 0.7 });
    const mon = new THREE.Group(); A.add(mon);
    const base = roundedBox(0.30, 0.024, 0.28, 0.008, beigeD); base.position.set(0, 0.012, 0.0); mon.add(base);
    const dome = cylinder(0.10, 0.125, 0.04, beigeD, 40); dome.position.set(0, 0.044, 0); mon.add(dome);
    const body = roundedBox(0.35, 0.33, 0.34, 0.03, beige); body.position.set(0, 0.245, -0.03); mon.add(body);
    const bezel = roundedBox(0.385, 0.355, 0.05, 0.018, beige); bezel.position.set(0, 0.25, 0.14); mon.add(bezel);
    const scrA = (this.scrA = makeScreen(0.285, 0.214, 1280, 960, { curve: 0.008 })); scrA.mesh.position.set(0, 0.25, 0.1662); mon.add(scrA.mesh);
    const dk = mat.std(0x2a2622, { roughness: 0.8 });
    for (const sy of [-1, 1]) { const b = box(0.305, 0.01, 0.006, dk); b.position.set(0, 0.25 + sy * 0.112, 0.166); mon.add(b); }
    for (const sx of [-1, 1]) { const b = box(0.01, 0.234, 0.006, dk); b.position.set(sx * 0.1475, 0.25, 0.166); mon.add(b); }
    for (const kx of [0.115, 0.14]) { const k = cylinder(0.006, 0.006, 0.006, beigeD, 24); k.rotation.x = Math.PI / 2; k.position.set(kx, 0.085, 0.166); mon.add(k); }
    const led = box(0.008, 0.004, 0.002, mat.emissive(0x66ff88, 2)); led.position.set(-0.13, 0.085, 0.166); mon.add(led);
    this.crtLight = new THREE.PointLight(0xc9d6e8, 0, 1.2, 1.6); this.crtLight.position.set(0, 0.25, 0.36); A.add(this.crtLight);
    const kb = roundedBox(0.44, 0.024, 0.16, 0.006, beige); kb.position.set(0.05, 0.012, 0.47); kb.rotation.y = deg(-3); A.add(kb);
    const keyGeo = new THREE.BoxGeometry(0.0155, 0.008, 0.0155); const keys = new THREE.InstancedMesh(keyGeo, beigeD, 75); const M = new THREE.Matrix4(); let ki = 0;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) { M.makeTranslation(-0.135 + c * 0.019 + (r === 4 && c > 4 && c < 10 ? 0 : 0), 0.028, 0.4 + r * 0.019 + 0.03); M.premultiply(new THREE.Matrix4().makeRotationY(deg(-3))); keys.setMatrixAt(ki++, M); }
    keys.position.set(0.05, 0, 0); keys.castShadow = true; A.add(keys);
    const mouse = roundedBox(0.058, 0.03, 0.095, 0.014, beige); mouse.position.set(0.40, 0.015, 0.45); mouse.rotation.y = deg(12); A.add(mouse);
    // page caches
    this.cBrowser = offscreen(1280, 960, (x, w, h) => paintBrowser90(x, w, h));
    this.cCrowded = offscreen(1280, 960, (x, w, h) => paintCrowded(x, w, h)); this.anchors = this.cCrowded._r;
    this.cClean = offscreen(1280, 960, (x, w, h) => paintClean(x, w, h)); this.controls = this.cClean._r.controls;
    // the network that resolves into the page (overlay)
    this.net = []; for (let i = 0; i < 18; i++) { const a = hash(i + 0.5) * Math.PI * 2, r = 140 + hash(i + 7.2) * 360; this.net.push({ x: W / 2 + Math.cos(a) * r * 1.25, y: H / 2 + Math.sin(a) * r * 0.78, w: 40 + hash(i + 3.3) * 26, h: 26 + hash(i + 9.1) * 16, to: i === 0 ? -1 : Math.floor(hash(i + 11.7) * i), amber: i === 4 }); }

    // =============== SET B: a 2007-style touchscreen phone, lying on a dark slab ===============
    const Bg = (this.setB = new THREE.Group()); g.add(Bg);
    const rB = rig(Bg, { key: [0.45, 0.9, 0.5], keyI: 2.2, keyColor: 0xfff3e4, fill: [-0.6, 0.45, 0.35], fillI: 0.55, fillColor: 0xd6e4ff, rim: [0.1, 0.5, -0.7], rimI: 1.0, ambient: 0.1 }); shadowBounds(rB.key, 0.3, 0.05, 4);
    const slab = plane(3, 3, mat.std(0x15181e, { roughness: 0.7, metalness: 0.05 })); slab.rotation.x = -Math.PI / 2; Bg.add(slab);
    const ph = (this.phone07 = new THREE.Group()); ph.rotation.x = -Math.PI / 2; ph.position.y = 0.0058; Bg.add(ph);
    const alu = mat.brushed({ roughness: 0.38, metalness: 0.9 });
    const pbody = roundedBox(0.061, 0.115, 0.0116, 0.0065, alu, 4); ph.add(pbody);
    const backBlack = roundedBox(0.0612, 0.0225, 0.0118, 0.004, mat.blackPlastic({ roughness: 0.6 })); backBlack.position.set(0, -0.115 / 2 + 0.01125, 0); ph.add(backBlack);
    const glass = roundedBox(0.0585, 0.1125, 0.0014, 0.0045, mat.glassDark({ roughness: 0.08 }), 3); glass.position.z = 0.0058 + 0.0004; ph.add(glass);
    const scrB = (this.scrB = makeScreen(0.0493, 0.074, 640, 960)); scrB.mesh.position.set(0, 0.0005, 0.0058 + 0.0012); ph.add(scrB.mesh);
    const home = cylinder(0.0055, 0.0055, 0.0008, mat.std(0x0c0d10, { roughness: 0.4 }), 32); home.rotation.x = Math.PI / 2; home.position.set(0, -0.0455, 0.0058 + 0.0009); ph.add(home);
    const homeIcon = canvasPlane(0.0046, 0.0046, 64, (x, w, h) => { x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 4; roundRect(x, 8, 8, w - 16, h - 16, 10); x.stroke(); }); homeIcon.position.set(0, -0.0455, 0.0058 + 0.0014); ph.add(homeIcon);
    const ear = box(0.012, 0.0016, 0.0006, mat.std(0x1a1c20, { roughness: 0.6 })); ear.position.set(0, 0.0485, 0.0058 + 0.0012); ph.add(ear);
    this.cHome = offscreen(640, 960, (x, w, h) => paintHome(x, w, h)); this.cAlbums = offscreen(640, 960, (x, w, h) => paintAlbums(x, w, h));
    const pool = new THREE.SpotLight(0xfff0e0, 2.2, 1.6, deg(38), 0.7, 1.2); pool.position.set(0.12, 0.55, 0.18); pool.target.position.set(0, 0, 0); Bg.add(pool, pool.target);
    // a tiny amber point for the phone's scale (no light: at 2 cm any point light blows out the frame)
    this.pointB = new AmberPoint(0.0022, { light: false }); this.pointB.setIntensity(0); Bg.add(this.pointB.group);

    // =============== SET C: desktop monitor, tablet, phone on a table (2010) ===============
    const Cg = (this.setC = new THREE.Group()); g.add(Cg);
    const rC = rig(Cg, { key: [1.2, 2.0, 1.6], keyI: 1.8, keyColor: 0xfff4e6, fill: [-2, 1.0, 1.4], fillI: 0.6, fillColor: 0xcfe3ff, rim: [0, 1.5, -2], rimI: 1.0, rimColor: 0xbfe0ff, ambient: 0.15 }); shadowBounds(rC.key, 1.6);
    const table = roundedBox(2.8, 0.04, 1.3, 0.004, mat.std(0x1b1f27, { roughness: 0.5, metalness: 0.1 })); table.position.set(0, -0.02, 0.1); Cg.add(table);
    const floorC = plane(10, 10, mat.graphite()); floorC.rotation.x = -Math.PI / 2; floorC.position.y = -0.76; Cg.add(floorC);
    const wallC = plane(10, 5, mat.std(0x12161d, { roughness: 1 })); wallC.position.set(0, 1.5, -1.6); Cg.add(wallC);
    const dark = mat.blackPlastic({ roughness: 0.45 }), grey = mat.darkMetal({ roughness: 0.4 });
    // monitor
    const mon2 = new THREE.Group(); mon2.position.set(-0.40, 0, 0); Cg.add(mon2);
    const mbase = roundedBox(0.26, 0.008, 0.18, 0.003, mat.brushed()); mbase.position.set(0, 0.004, -0.02); mon2.add(mbase);
    const neck = box(0.04, 0.12, 0.014, mat.brushed()); neck.position.set(0, 0.068, -0.04); mon2.add(neck);
    const mdisp = roundedBox(0.63, 0.37, 0.018, 0.004, dark); mdisp.position.set(0, 0.27, -0.02); mon2.add(mdisp);
    const scrD = (this.scrD = makeScreen(0.60, 0.3375, 1280, 720)); scrD.mesh.position.set(0, 0.27, -0.0105); mon2.add(scrD.mesh);
    // tablet (portrait, leaning back 12°)
    const tab = new THREE.Group(); tab.position.set(0.16, 0.1225 * Math.cos(deg(12)), 0.10 - 0.1225 * Math.sin(deg(12))); tab.rotation.x = -deg(12); Cg.add(tab);
    tab.add(roundedBox(0.172, 0.245, 0.0075, 0.012, grey));
    const scrT = (this.scrT = makeScreen(0.148, 0.197, 768, 1024)); scrT.mesh.position.z = 0.0039; tab.add(scrT.mesh);
    const tstand = box(0.07, 0.08, 0.04, mat.graphite({ roughness: 0.6 })); tstand.position.set(0.16, 0.04, tab.position.z - 0.045); Cg.add(tstand);
    // phone (modern slab, leaning back 10°)
    const ph2 = (this.phone10 = new THREE.Group()); ph2.position.set(0.46, 0.074 * Math.cos(deg(10)), 0.12 - 0.074 * Math.sin(deg(10))); ph2.rotation.x = -deg(10); Cg.add(ph2);
    ph2.add(roundedBox(0.072, 0.148, 0.0078, 0.010, grey));
    const pglass = roundedBox(0.0705, 0.1465, 0.0012, 0.009, mat.glassDark({ roughness: 0.08 }), 3); pglass.position.z = 0.0039 + 0.0003; ph2.add(pglass);
    const scrP = (this.scrP = makeScreen(0.0655, 0.141, 480, 1040)); scrP.mesh.position.z = 0.0039 + 0.001; ph2.add(scrP.mesh);
    const pstand = box(0.04, 0.05, 0.03, mat.graphite({ roughness: 0.6 })); pstand.position.set(0.46, 0.025, ph2.position.z - 0.03); Cg.add(pstand);
    this.phoneNormal = new THREE.Vector3(0, Math.sin(deg(10)), Math.cos(deg(10)));
    // layouts
    this.L = { d: layoutFor(1280, 656, 3), t: layoutFor(768, 1024, 2), p: layoutFor(480, 1040, 1) };
    this.L.dFull = layoutFor(1280, 720, 3);
    // breakpoint crossing times for the narrowing desktop window (solve easeInOut(k) = target by bisection)
    const solve = (target) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (easeInOut(m) < target) lo = m; else hi = m; } return B.reflow3 + lo * B.narrowDur; };
    this.cross = [solve((1280 - 1000) / (1280 - 600)), solve((1280 - 640) / (1280 - 600))];

    // the amber point (3D)
    this.point = new AmberPoint(0.008, { lightIntensity: 2, lightDistance: 1.2 }); this.point.setIntensity(0); g.add(this.point.group);
  },

  // ---------- phase helpers ----------
  phase(t) { const B = this.B; return t < B.cutB ? 0 : t < B.cutC ? 1 : 2; },
  // project a screen-canvas pixel to the overlay
  proj(scr, cx, cy, cam) { V.set((cx / scr.pxW - 0.5) * scr.w, (0.5 - cy / scr.pxH) * scr.h, 0.0005); scr.mesh.localToWorld(V); V.project(cam); return [(V.x + 1) / 2 * W, (1 - V.y) / 2 * H]; },
  projWorld(p, cam) { V.copy(p).project(cam); return [(V.x + 1) / 2 * W, (1 - V.y) / 2 * H]; },

  // ---------- set A ----------
  camA(t, cam) {
    const B = this.B; const k = easeInOut(seg(t, B.start + 0.2, B.pushEnd));
    const drift = (t - B.pushEnd) * 0.0012;
    cam.position.set(lerp(0.40, 0.04, k) + (k >= 1 ? -drift : 0), lerp(0.47, 0.272, k), lerp(1.05, 0.70, k));
    cam.lookAt(lerp(0.02, 0.0, k), lerp(0.20, 0.262, k), lerp(0.1, 0.166, k));
  },
  updateA(t, cam) {
    const B = this.B; this.camA(t, cam);
    const scr = this.scrA;
    const load = seg(t, B.click + 0.1, B.click + 0.9), rs = seg(t, B.restructure, B.restructure + B.restructureDur);
    const key = load <= 0 ? 'blank' : load < 1 ? 'load' + t.toFixed(3) : rs <= 0 ? 'crowded' : rs < 1 ? 'rs' + t.toFixed(3) : 'clean';
    paintOnce(scr, key, (x, w, h) => {
      x.drawImage(this.cBrowser, 0, 0);
      if (load > 0) { x.save(); x.beginPath(); x.rect(0, 0, w, 170 + (h - 170) * easeOut(load)); x.clip(); x.drawImage(this.cCrowded, 0, 0); x.restore(); }
      if (rs > 0) { const k = easeInOut(rs); x.save(); x.globalAlpha = k; x.drawImage(this.cClean, 0, (1 - k) * 14); x.restore(); }
      crtFinish(x, w, h);
    });
    this.crtLight.intensity = 0.25 + 0.55 * load;
    this.point.group.visible = false;
  },
  drawA(ctx, t, cam) {
    const B = this.B; const scr = this.scrA;
    const sc = this.proj(scr, 640, 480, cam);
    // the network of linked documents resolving into the page
    const nk = easeInOut(seg(t, B.click, B.netEnd)), na = 1 - seg(t, B.netEnd - 0.5, B.netEnd);
    if (na > 0) {
      const pos = this.net.map((n) => [lerp(n.x, sc[0], nk), lerp(n.y, sc[1], nk)]);
      ctx.save(); ctx.globalAlpha = na; ctx.lineWidth = 1.2;
      this.net.forEach((n, i) => { if (n.to < 0) return; const a = pos[i], b = pos[n.to]; ctx.strokeStyle = n.amber || this.net[n.to].amber ? 'rgba(255,171,91,0.7)' : 'rgba(128,201,248,0.45)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      this.net.forEach((n, i) => { const [px, py] = pos[i]; const s = lerp(1, 0.15, nk); const w = n.w * s, h = n.h * s; fillRoundRect(ctx, px - w / 2, py - h / 2, w, h, 3, 'rgba(246,242,232,0.92)'); ctx.fillStyle = 'rgba(90,95,105,0.7)'; for (let l = 0; l < 3; l++) ctx.fillRect(px - w / 2 + 5 * s, py - h / 2 + (7 + l * 6) * s, (w - 10 * s) * (l === 2 ? 0.6 : 1), 1.5 * s); });
      const an = this.net[4]; const ap = pos[4]; amberDot(ctx, ap[0], ap[1], 7 * lerp(1, 0.6, nk), 1, { glow: 5 });
      const ck = seg(t, B.click, B.click + 0.6); if (ck > 0 && ck < 1) { ctx.globalAlpha = na * (1 - ck); ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ap[0], ap[1], 10 + 50 * easeOut(ck), 0, 7); ctx.stroke(); }
      ctx.restore();
    }
    // cursor on the crowded page with the amber point at its hotspot
    const ca = fadeIO(t, B.netEnd - 0.2, B.restructure + 0.5, 0.4, 0.5);
    if (ca > 0) {
      const a = this.anchors.links; const cx = a[0] + 60 + noise1(t * 0.5) * 6, cy = a[1] + 10 + noise1(t * 0.4 + 3) * 4; const [px, py] = this.proj(scr, cx, cy, cam);
      cursor(ctx, px, py, { scale: 1.15, alpha: ca }); amberDot(ctx, px + 1, py + 1, 4.5, ca, { glow: 5 });
    }
    // caption
    const capA = fadeIO(t, B.netEnd + 0.2, B.restructure + 0.9, 0.5, 0.5);
    caps(ctx, 'Mid-1990s web page · fictional · reconstruction', 120, 128, { size: 18, color: PALETTE.gray, tracking: 3, alpha: capA });
    // annotation callouts, one at a time
    const items = [['Unclear links', this.anchors.links, 'L'], ['Crowded layout', this.anchors.crowded, 'R'], ['Poor readability', this.anchors.readability, 'L'], ['Confusing hierarchy', this.anchors.hierarchy, 'R']];
    const edgeL = this.proj(scr, 0, 480, cam)[0], edgeR = this.proj(scr, 1280, 480, cam)[0];
    items.forEach(([label, a, side], i) => {
      const t0 = B.callouts[i]; const al = fadeIO(t, t0, t0 + B.calloutDur, 0.3, 0.3); if (al <= 0) return;
      const [px, py] = this.proj(scr, a[0], a[1], cam); const grow = easeOut(seg(t, t0, t0 + 0.45));
      const endX = side === 'L' ? edgeL - 70 : edgeR + 70; const ex = lerp(px, endX, grow); const lx = endX + (side === 'L' ? -14 : 14);
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, py); ctx.stroke();
      ctx.fillStyle = PALETTE.cyan; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(px, py, 11, 0, 7); ctx.stroke();
      if (grow > 0.6) { const ta = (grow - 0.6) / 0.4; ctx.globalAlpha = al * ta; text(ctx, label, lx, py + 9, { size: 26, weight: 500, color: PALETTE.cyan, align: side === 'L' ? 'right' : 'left' }); }
      ctx.restore();
    });
    // the keyboard-focus ring (the amber point as the era's mechanism)
    const ringA = fadeIO(t, B.focusForm, B.cutB - 0.55, 0.45, 0.35);
    if (ringA > 0) {
      let idx = 0; for (let i = 0; i < 4; i++) if (t >= B.ticks[i]) idx = i + 1;
      const rect = (i) => this.controls[clamp(i, 0, 4)];
      const prev = rect(idx - 1), cur = rect(idx); const mk = idx === 0 ? 1 : easeOut(seg(t, B.ticks[idx - 1], B.ticks[idx - 1] + 0.32));
      const r = prev.map((v, j) => lerp(v, cur[j], mk));
      const p0 = this.proj(scr, r[0] - 6, r[1] - 6, cam), p1 = this.proj(scr, r[0] + r[2] + 6, r[1] + r[3] + 6, cam);
      const x0 = Math.min(p0[0], p1[0]), y0 = Math.min(p0[1], p1[1]), w = Math.abs(p1[0] - p0[0]), h = Math.abs(p1[1] - p0[1]);
      ctx.save(); ctx.globalAlpha = ringA; ctx.shadowColor = 'rgba(255,171,91,0.9)'; ctx.shadowBlur = 18; ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 3.5; roundRect(ctx, x0, y0, w, h, 8); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,171,91,0.1)'; ctx.fill(); ctx.restore();
      // tick pulse
      if (idx > 0) { const pk = seg(t, B.ticks[idx - 1], B.ticks[idx - 1] + 0.4); if (pk < 1) { ctx.save(); ctx.globalAlpha = ringA * (1 - pk) * 0.8; ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2; roundRect(ctx, x0 - 8 * pk, y0 - 8 * pk, w + 16 * pk, h + 16 * pk, 10); ctx.stroke(); ctx.restore(); } }
    }
    // the point gathers from the cursor into the ring, and from the ring to the centre before the cut
    const gather = seg(t, B.restructure + 0.9, B.focusForm + 0.2);
    if (gather > 0 && gather < 1) { const a = this.anchors.links; const p = this.proj(scr, a[0] + 60, a[1] + 10, cam); const c = this.controls[0]; const q = this.proj(scr, c[0] + c[2] / 2, c[1] + c[3] / 2, cam); const k = easeInOut(gather); amberDot(ctx, lerp(p[0], q[0], k), lerp(p[1], q[1], k), 6, 1 - Math.abs(k - 0.5) * 0.4, { glow: 6 }); }
    const leave = seg(t, B.cutB - 0.75, B.cutB - 0.3);
    if (leave > 0 && leave < 1) { const c = this.controls[4]; const q = this.proj(scr, c[0] + c[2] / 2, c[1] + c[3] / 2, cam); const k = easeIn(leave); amberDot(ctx, lerp(q[0], W / 2, k), lerp(q[1], H / 2, k), 8 + 8 * k, 1, { glow: 6 }); }
    // labels
    caps(ctx, '1999 — WCAG 1.0', 120, 128, { alpha: fadeIO(t, B.wcag, B.cutB + 0.4, 0.4, 0.4) });
    badge(ctx, BADGE.RECON, W - 120, H - 70, fadeIO(t, B.netEnd - 0.3, B.cutB, 0.5, 0.4), { align: 'right' });
  },

  // ---------- set B ----------
  phoneState(t) {
    const B = this.B; const st = { screen: 'home', openK: 0, slideK: 0, photoK: 0, scroll: 0, zoom: 1 };
    if (t >= B.tap1) { st.screen = 'albums'; st.openK = seg(t, B.tap1, B.tap1 + 0.35); }
    if (t >= B.tap2) { st.screen = 'grid'; st.slideK = seg(t, B.tap2, B.tap2 + 0.32); }
    if (t >= B.tap3) { st.screen = 'photo'; st.photoK = seg(t, B.tap3, B.tap3 + 0.32); }
    let y = 0; for (const tf of [B.flick1, B.flick2]) { if (t < tf) continue; const dt = t - tf, contact = 0.16; y += dt < contact ? 250 * easeOut(dt / contact) : 250 + 1500 * 0.42 * (1 - Math.exp(-(dt - contact) / 0.42)); }
    st.scroll = clamp(y, 0, GRID_H - 960);
    const pk = easeInOut(seg(t, B.pinch, B.pinch + B.pinchDur)); st.sep = lerp(120, 440, pk); st.zoom = 1 + (st.sep - 120) / 320;
    return st;
  },
  updateB(t, cam) {
    const B = this.B; const st = this.phoneState(t);
    cam.position.set(-0.054 + noise1(t * 0.3) * 0.002, 0.252, 0.088); cam.lookAt(-0.052, 0.006, 0.004);
    const key = st.screen === 'home' ? 'home' : st.screen === 'photo' && st.photoK >= 1 && t >= B.pinch + B.pinchDur ? 'photoEnd' : 'f' + t.toFixed(3);
    paintOnce(this.scrB, key, (x, w, h) => {
      if (st.screen === 'home' || st.openK < 1) x.drawImage(this.cHome, 0, 0);
      if (st.screen === 'albums' || (st.screen === 'grid' && st.slideK < 1)) {
        const [ix, iy] = PHONE_ICON_POS(8); const s = lerp(0.12, 1, easeOut(st.openK)); const sl = st.screen === 'grid' ? -easeInOut(st.slideK) * w * 0.3 : 0;
        x.save(); x.globalAlpha = st.openK; x.translate(ix + sl, iy); x.scale(s, s); x.translate(-ix, -iy); x.drawImage(this.cAlbums, 0, 0); x.restore();
      }
      if (st.screen === 'grid' || (st.screen === 'photo' && st.photoK < 1)) { const sl = (1 - easeInOut(st.slideK)) * w; x.save(); x.translate(sl, 0); paintGrid(x, w, h, st.scroll); x.restore(); }
      if (st.screen === 'photo') { const [tx0, ty0] = GRID_THUMB(22); const ty = ty0 - st.scroll; const s = lerp(0.22, 1, easeOut(st.photoK)); x.save(); x.globalAlpha = st.photoK; x.translate(tx0, ty); x.scale(s, s); x.translate(-tx0, -ty); paintPhoto(x, w, h, { scale: st.zoom, cx: 320, cy: 500 }); x.restore(); }
    });
    // the 3D point descends onto the screen before the first tap, rises after the pinch
    const land = easeInOut(seg(t, B.cutB + 0.2, B.tap1 - 0.15)); const [ix, iy] = PHONE_ICON_POS(8);
    V.set((ix / 640 - 0.5) * 0.0493, (0.5 - iy / 960) * 0.074, 0.001); this.scrB.mesh.localToWorld(V);
    const rise = easeInOut(seg(t, B.pinch + B.pinchDur + 0.25, B.cutC - 0.35));
    this.point.group.visible = false; const P = this.pointB;
    if (t < B.tap1 - 0.05) { P.group.position.set(lerp(-0.02, V.x, land), lerp(0.05, V.y + 0.004, land), lerp(0.02, V.z, land)); P.setIntensity(0.9).setScale(1).pulse(t, 0.06, 1.3); P.group.visible = true; }
    else if (t > B.pinch + B.pinchDur + 0.25) { P.group.position.set(lerp(0.005, -0.01, rise), lerp(0.01, 0.06, rise), lerp(0.0, 0.03, rise)); P.setIntensity(0.4 + 0.6 * rise).setScale(0.8 + 0.6 * rise).pulse(t, 0.06, 1.3); P.group.visible = true; }
    else P.group.visible = false;
  },
  touch(ctx, px, py, alpha, { tapK = -1, r = 26 } = {}) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(255,214,170,0.30)'; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2; ctx.globalAlpha = alpha * 0.85; ctx.stroke();
    if (tapK >= 0 && tapK < 1) { ctx.globalAlpha = alpha * (1 - tapK) * 0.8; ctx.beginPath(); ctx.arc(px, py, r + 30 * easeOut(tapK), 0, 7); ctx.stroke(); }
    ctx.restore(); amberDot(ctx, px, py, 4.5, alpha, { glow: 4 });
  },
  drawB(ctx, t, cam) {
    const B = this.B; const scr = this.scrB; const st = this.phoneState(t);
    const tapAt = (t0, cx, cy) => { const a = fadeIO(t, t0 - 0.12, t0 + 0.42, 0.1, 0.25); if (a <= 0) return; const [px, py] = this.proj(scr, cx, cy, cam); this.touch(ctx, px, py, a, { tapK: seg(t, t0, t0 + 0.4) }); };
    tapAt(B.tap1, ...PHONE_ICON_POS(8));
    tapAt(B.tap2, 300, 128 + 46);
    tapAt(B.tap3, GRID_THUMB(22)[0], GRID_THUMB(22)[1] - st.scroll);
    for (const tf of [B.flick1, B.flick2]) { const a = fadeIO(t, tf - 0.08, tf + 0.36, 0.08, 0.2); if (a <= 0) continue; const k = easeOut(seg(t, tf, tf + 0.16)); const [px, py] = this.proj(scr, 330, lerp(720, 470, k), cam); this.touch(ctx, px, py, a); }
    const pa = fadeIO(t, B.pinch - 0.25, B.pinch + B.pinchDur + 0.35, 0.2, 0.3);
    if (pa > 0) { const d = st.sep / 2; const ang = deg(-38); for (const sg of [-1, 1]) { const [px, py] = this.proj(scr, 320 + sg * Math.cos(ang) * d, 500 + sg * Math.sin(ang) * d, cam); this.touch(ctx, px, py, pa); } }
    // labels
    caps(ctx, '2007 — MULTI-TOUCH GOES MAINSTREAM', 120, 128, { alpha: fadeIO(t, B.caps2007, B.cutC - 0.1, 0.4, 0.4) });
    lowerThird(ctx, { title: 'Original iPhone, announced Jan 2007 (reconstruction)', sub: 'Reconstruction after period documentation · not a photograph', alpha: fadeIO(t, B.phoneLabel, B.cutC - 0.2, 0.5, 0.4), reveal: seg(t, B.phoneLabel, B.phoneLabel + 0.8) });
    text(ctx, 'Multi-touch research predates the iPhone (1980s onward)', 148, H - 92, { size: 18, weight: 400, color: PALETTE.gray, alpha: fadeIO(t, B.footnote, B.cutC - 0.2, 0.5, 0.4) });
    badge(ctx, BADGE.RECON, W - 120, H - 70, fadeIO(t, B.cutB, B.cutC, 0.5, 0.4), { align: 'right' });
  },

  // ---------- set C ----------
  windowWidth(t) { const B = this.B; return lerp(1280, 600, easeInOut(seg(t, B.reflow3, B.reflow3 + B.narrowDur))); },
  pointC(t) {
    const B = this.B; const P = { d: new THREE.Vector3(-0.40, 0.28, 0.05), t: new THREE.Vector3(0.16, 0.15, 0.13), p: new THREE.Vector3(0.46, 0.085, 0.16) };
    const glide = (a, b, t0, dur = 0.55) => a.clone().lerp(b, easeInOut(seg(t, t0 - dur, t0)));
    if (t < B.reflow1) return glide(P.d.clone().add(new THREE.Vector3(0.25, 0.12, 0.15)), P.d, B.desktopOn + 0.6, 0.8);
    if (t < B.reflow2) return glide(P.d, P.t, B.reflow1);
    if (t < B.reflow3 - 0.6) return glide(P.t, P.p, B.reflow2);
    // drags the desktop window edge, then returns to the phone
    const ww = this.windowWidth(t); V.set((ww / 1280 - 0.5) * 0.60, 0.02, 0.02); this.scrD.mesh.localToWorld(V); const edge = V.clone();
    if (t < B.reflow3 + B.narrowDur + 0.2) return glide(P.p, edge, B.reflow3, 0.6);
    return glide(edge, P.p, B.pushStart + 0.7, 0.8);
  },
  updateC(t, cam) {
    const B = this.B;
    // camera: slow drift across the trio, then a push into the phone screen
    const k1 = easeInOut(seg(t, B.cutC, B.pushStart + 0.3)), k2 = easeInOut(seg(t, B.pushStart, B.pushEnd2));
    const p0 = new THREE.Vector3(lerp(0.0, 0.14, k1), lerp(0.43, 0.41, k1), lerp(1.52, 1.42, k1)), l0 = new THREE.Vector3(lerp(0.02, 0.12, k1), lerp(0.2, 0.19, k1), 0);
    const pc = this.phone10.position.clone().add(new THREE.Vector3(0, 0.001, 0.005)); const p1 = pc.clone().addScaledVector(this.phoneNormal, 0.30);
    cam.position.copy(p0.lerp(p1, k2)); cam.lookAt(l0.lerp(pc, k2));
    // desktop: the article in a browser window; narrows live across breakpoints after reflow_3
    const on = seg(t, B.desktopOn, B.desktopOn + 0.6); const ww = this.windowWidth(t);
    const narrowing = t > B.reflow3 && t < B.reflow3 + B.narrowDur + 0.5;
    const keyD = on < 1 ? 'on' + t.toFixed(3) : narrowing ? 'n' + t.toFixed(3) : t <= B.reflow3 ? 'd' : 'dEnd';
    paintOnce(this.scrD, keyD, (x, w, h) => {
      paintDesktopWindow(x, w, h, ww, (pw, phh) => {
        const mode = pw >= 1000 ? 3 : pw >= 640 ? 2 : 1; let LA = layoutFor(pw, phh, mode), LB = LA, k = 0;
        for (const [ci, tc] of this.cross.entries()) { if (t >= tc && t < tc + 0.45) { LA = layoutFor(pw, phh, 3 - ci); LB = layoutFor(pw, phh, 2 - ci); k = seg(t, tc, tc + 0.45); } }
        x.fillStyle = PALETTE.ivory; x.fillRect(0, 0, pw, phh); drawArticle(x, LA, LB, k, { alpha: easeOut(on) });
      });
    });
    // tablet: lights at reflow_1 and reflows from the shrunken desktop page
    const r1 = seg(t, B.reflow1, B.reflow1 + B.reflowDur); const keyT = r1 <= 0 ? 'off' : r1 < 1 ? 't' + t.toFixed(3) : 'on';
    paintOnce(this.scrT, keyT, (x, w, h) => { x.fillStyle = '#05070A'; x.fillRect(0, 0, w, h); if (r1 > 0) { x.save(); x.globalAlpha = seg(r1, 0, 0.25); x.fillStyle = PALETTE.ivory; x.fillRect(0, 0, w, h); drawArticle(x, scaleLayout(this.L.dFull, 0.6), this.L.t, r1); x.restore(); } });
    const r2 = seg(t, B.reflow2, B.reflow2 + B.reflowDur); const keyP = r2 <= 0 ? 'off' : r2 < 1 ? 'p' + t.toFixed(3) : 'on';
    paintOnce(this.scrP, keyP, (x, w, h) => { x.fillStyle = '#05070A'; x.fillRect(0, 0, w, h); if (r2 > 0) { x.save(); x.globalAlpha = seg(r2, 0, 0.25); x.fillStyle = PALETTE.ivory; x.fillRect(0, 0, w, h); drawArticle(x, scaleLayout(this.L.t, 0.625), this.L.p, r2); x.restore(); } });
    // the point
    const pp = this.pointC(t); this.point.group.position.copy(pp);
    const vis = t < B.expand + 0.25; this.point.group.visible = vis;
    this.point.setIntensity(ease(t, B.cutC + 0.1, B.cutC + 0.6, easeOut) * (vis ? 1 : 0)).setScale(1.1).pulse(t, 0.06, 1.3);
  },
  drawC(ctx, t, cam) {
    const B = this.B;
    caps(ctx, '2010 — RESPONSIVE WEB DESIGN', 120, 128, { alpha: fadeIO(t, B.caps2010, B.pushStart + 0.6, 0.4, 0.5) });
    caps(ctx, 'One fictional article · the same layout adapting to three screen widths', 120, 166, { size: 18, color: PALETTE.gray, tracking: 3, alpha: fadeIO(t, B.caps2010 + 0.6, B.pushStart + 0.4, 0.5, 0.5) });
    // the phone screen expands into the design workspace
    const ek = easeInOut(seg(t, B.expand, B.expandEnd));
    let dot = null;
    if (ek > 0) {
      const s = this.scrP; const c = [this.proj(s, 0, 0, cam), this.proj(s, 480, 0, cam), this.proj(s, 0, 1040, cam), this.proj(s, 480, 1040, cam)];
      const x0 = Math.min(...c.map((p) => p[0])), x1 = Math.max(...c.map((p) => p[0])), y0 = Math.min(...c.map((p) => p[1])), y1 = Math.max(...c.map((p) => p[1]));
      const rx = lerp(x0, 0, ek), ry = lerp(y0, 0, ek), rw = lerp(x1 - x0, W, ek), rh = lerp(y1 - y0, H, ek);
      ctx.save(); roundRect(ctx, rx, ry, rw, rh, lerp(14, 0, ek)); ctx.clip();
      // the page itself grows with the window, then dissolves into the workspace
      const k2 = easeInOut(seg(ek, 0.35, 0.85)); const sc = rh / 1040;
      ctx.save(); ctx.translate(rx, ry); ctx.fillStyle = PALETTE.ivory; ctx.fillRect(0, 0, rw, rh); ctx.translate((rw - 480 * sc) / 2, 0); ctx.scale(sc, sc); drawArticle(ctx, this.L.p); ctx.restore();
      drawWorkspace(ctx, W, H, { alpha: k2, layouts: this.L });
      ctx.restore();
      // the point rides on the overlay now: from the phone to the centre of the frame
      const pw = this.projWorld(this.point.group.position, cam); const ck = easeInOut(seg(t, this.end - 1.7, this.end - 0.75));
      dot = [lerp(pw[0], W / 2, ck), lerp(pw[1], H / 2, ck), 7 + 9 * ck];
    }
    if (dot) amberDot(ctx, dot[0], dot[1], dot[2], seg(t, B.expand + 0.1, B.expand + 0.4), { glow: 6 });
    badge(ctx, BADGE.VIS, W - 120, H - 70, fadeIO(t, B.cutC + 0.3, this.end - 0.6, 0.5, 0.4), { align: 'right' });
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera; stage.setBackground(PALETTE.graphite);
    const ph = this.phase(t);
    this.setA.visible = ph === 0; this.setB.visible = ph === 1; this.setC.visible = ph === 2;
    cam.fov = [32, 30, 32][ph]; cam.updateProjectionMatrix();
    stage.setExposure(lerp(0.35, 1, ease(t, B.start, B.start + 0.9, easeOut)));
    if (ph === 0) this.updateA(t, cam); else if (ph === 1) this.updateB(t, cam); else this.updateC(t, cam);
  },

  draw2d(ctx, t, stage) {
    const B = this.B, cam = stage.camera; const ph = this.phase(t);
    if (ph === 0) this.drawA(ctx, t, cam); else if (ph === 1) this.drawB(ctx, t, cam); else this.drawC(ctx, t, cam);
    // dips between sets, the point carried across the cut
    for (const cut of [B.cutB, B.cutC]) { const d = fadeIO(t, cut - 0.4, cut + 0.4, 0.4, 0.4); if (d > 0) { dip(ctx, d, PALETTE.graphite); amberDot(ctx, W / 2, H / 2, 16, seg(t, cut - 0.32, cut - 0.1) * (1 - seg(t, cut + 0.1, cut + 0.4)), { glow: 7 }); } }
    // hand-off blooms
    bloom(ctx, 1 - seg(t, this.start, this.start + 0.8));
    bloom(ctx, seg(t, this.end - 0.7, this.end));
  },
};
