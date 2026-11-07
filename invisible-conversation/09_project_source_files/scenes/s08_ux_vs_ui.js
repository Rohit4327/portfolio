// SCENE 08 — UX VS UI — THE BIG REVEAL. A beautiful fictional shop, the hidden delivery cost, the freeze, the journey
// layers, the design process ribbon, a usability observation, the redesign, before/after, and the component grid.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, noise1, deg } from '../lib/util.js';
import { text, caps, badge, BADGE, bloom, dip, amberDot, roundRect, fillRoundRect, measure, wrapText } from '../lib/gfx.js';
import { mat, roundedBox, rig, makeScreen } from '../lib/props.js';
import { SW, SH, L, PT, RED, drawShop, drawComponent, COMPONENTS, checkGlyph, crossGlyph } from './s08_ux_vs_ui.parts.js';

const CH = 8;
const SX = 480, SY = 128;                       // the slab's rectangle on the overlay (W×H = 1920×1080)
const D = 3.0, FOV = 35;                        // frontal camera distance / fov (slab projects exactly onto SX,SY,SW,SH)
const WPP = 2 * D * Math.tan(deg(FOV / 2)) / H; // world units per overlay pixel at the slab plane
const SLAB_W = SW * WPP, SLAB_H = SH * WPP, SLAB_X = (SX + SW / 2 - W / 2) * WPP, SLAB_Y = (H / 2 - (SY + SH / 2)) * WPP;
const LAYERS = ['User expectations', 'Information architecture', 'Navigation flow', 'Decision points', 'Content clarity', 'Trust', 'Accessibility', 'Error handling'];
const PROCESS = ['Research', 'Define the problem', 'Ideate', 'Prototype', 'Test', 'Iterate'];
const COLX = 120; // left exhibition-label column
const V3 = new THREE.Vector3();

function pathPos(K, t) {
  if (t <= K[0][0]) return { x: K[0][1], y: K[0][2] };
  for (let i = 0; i < K.length - 1; i++) {
    const a = K[i], b = K[i + 1];
    if (t >= a[0] && t < b[0]) { const k = easeInOut(seg(t, a[0], b[0])); return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k) }; }
  }
  const l = K[K.length - 1]; return { x: l[1], y: l[2] };
}

export default {
  id: 's08', title: 'UX vs UI — The Big Reveal',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.42, grain: 0.028, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    const S = (n) => T.sent(CH, n), f = (s, k) => s.start + (s.end - s.start) * k;
    const s2 = S('UI, or user interface'), s3 = S('UX, or user experience'), s4 = S('Imagine a stunning'), s5 = S('Beautiful UI'), s6 = S('Designers research'), s7 = S('Then they revise'), s8 = S('not born from guessing'), s9 = S('improved by observing');
    const B = (this.B = {
      start: this.start, end: this.end,
      uiLabel: s2.start + 0.1, statesIn: s2.start + 0.7, toBtn0: s2.start + 0.6, toBtn1: s2.start + 1.9, tap1: f(s2, 0.32),
      call: [f(s2, 0.49), f(s2, 0.575), f(s2, 0.73)],
      uxLabel: s3.start + 0.1, phrases: [f(s3, 0.47), f(s3, 0.60), f(s3, 0.75), f(s3, 0.92)],
      tap2: s3.start + 1.1, tap3: s3.start + 3.1, tap4: s3.start + 6.2,
      reveal: f(s4, 0.71), freeze: s5.start, caps2: f(s5, 0.5), capsOut: s6.start - 0.05,
      pull: s5.end - 0.1,
      ribbonIn: s6.start + 0.05, ticks: [f(s6, 0.08), f(s6, 0.28), f(s6, 0.44), f(s6, 0.60), f(s6, 0.82), s7.start + 0.1],
      ret0: s7.start + 0.15, ret1: s7.start + 0.85,
      tap6: s8.start + 0.3, tap7: s8.start + 1.3, tap5: f(s8, 0.92),
      strips: s9.start + 0.3, dis0: this.end - 1.45,
    });
    B.note = B.ticks[4] + 0.1; B.confirmed = B.tap5 + 0.6; B.pullEnd = B.pull + 2.4;
    this.cues = {
      ui_tap_1: B.tap1, ui_tap_2: B.tap2, ui_tap_3: B.tap3, ui_tap_4: B.tap4, ui_tap_5: B.tap5,
      ui_tap_6: B.tap6, ui_tap_7: B.tap7, // redesign: open bag, continue to payment (extra cues)
      error_reveal: B.reveal, freeze_sting: B.freeze, caps_frustrating: B.caps2,
      layers_pull_back: B.pull, process_tick_1: B.ticks[0], process_tick_2: B.ticks[1], process_tick_3: B.ticks[2], process_tick_4: B.ticks[3], process_tick_5: B.ticks[4], process_tick_6: B.ticks[5],
      observation_note: B.note, success_chime: B.confirmed, grid_dissolve: B.dis0, transition_point: this.end - 0.7,
    };
    // cursor paths (slab-local UI px): the amber point as the touch/pointer mechanism
    const A = PT.addBtn, G = PT.bag, C = PT.cont, K = PT.back;
    this.K1 = [[B.start, 480, 412], [B.start + 1.7, 850, 330], [B.toBtn0, 850, 330], [B.toBtn1, A.x, A.y], [B.tap1 + 0.6, A.x, A.y], [B.tap1 + 1.7, 1010, 660], [B.tap2 - 0.9, 1010, 660], [B.tap2 - 0.2, G.x, G.y], [B.tap2 + 0.9, G.x, G.y], [B.tap3 - 0.25, C.x, C.y], [B.tap3 + 0.7, C.x, C.y], [B.tap3 + 1.5, 320, 470], [B.tap4 - 1.1, 320, 470], [B.tap4 - 0.25, C.x, C.y], [B.tap4 + 0.9, C.x, C.y], [B.tap4 + 1.9, 620, 540], [B.reveal - 1.5, 620, 540], [B.reveal - 0.35, C.x, C.y], [B.reveal + 0.9, C.x, C.y], [B.freeze + 0.35, K.x, K.y]];
    this.K2 = [[B.ret1, 920, 330], [B.tap6 - 0.5, 920, 330], [B.tap6 - 0.1, G.x, G.y], [B.tap7 - 0.5, G.x, G.y], [B.tap7 - 0.1, C.x, C.y], [B.confirmed + 0.6, C.x, C.y], [B.dis0 + 0.55, 480, 412]];
    this.tapsA = [B.tap1, B.tap2, B.tap3, B.tap4]; this.tapsR = [B.tap6, B.tap7, B.tap5];

    // ---- offscreen UI canvas (drawn 1:1 onto the overlay)
    this.uiCanvas = document.createElement('canvas'); this.uiCanvas.width = SW; this.uiCanvas.height = SH; this.uiCtx = this.uiCanvas.getContext('2d');

    // ---- 3D: the glass slab carrying the frozen UI, and eight journey layers behind it
    rig(g, { key: [2, 3, 4], keyI: 1.4, fill: [-3, 1, 3], fillI: 0.5, rim: [0, 2, -5], rimI: 0.8, ambient: 0.25, shadows: false });
    const sg = (this.slabGroup = new THREE.Group()); sg.position.set(SLAB_X, SLAB_Y, 0); g.add(sg);
    this.slab = makeScreen(SLAB_W, SLAB_H, 2048, Math.round(2048 * SLAB_H / SLAB_W)); this.slab.material.transparent = true; sg.add(this.slab.mesh);
    const back = roundedBox(SLAB_W + 0.03, SLAB_H + 0.03, 0.03, 0.012, mat.graphiteLight({ roughness: 0.45, metalness: 0.4 })); back.position.z = -0.018; back.castShadow = back.receiveShadow = false; sg.add(back);
    // frozen UI into the slab texture (state at the freeze instant), with rounded corners
    { const c = this.slab.ctx, s = this.slab.pxW / SW; c.clearRect(0, 0, this.slab.pxW, this.slab.pxH); c.save(); c.scale(s, s); roundRect(c, 0, 0, SW, SH, 18); c.clip(); drawShop(c, this.uiStateA(B.freeze)); c.restore(); this.slab.update(); }
    // layer planes: shared glassy texture
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = 320; const lx = lc.getContext('2d');
    const lg = lx.createLinearGradient(0, 0, 0, 320); lg.addColorStop(0, 'rgba(70,82,104,0.62)'); lg.addColorStop(1, 'rgba(31,38,50,0.55)');
    roundRect(lx, 2, 2, 508, 316, 10); lx.fillStyle = lg; lx.fill(); lx.strokeStyle = 'rgba(128,201,248,0.75)'; lx.lineWidth = 2.5; lx.stroke();
    const ltex = new THREE.CanvasTexture(lc); ltex.colorSpace = THREE.SRGBColorSpace;
    this.layers = LAYERS.map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(SLAB_W, SLAB_H), new THREE.MeshBasicMaterial({ map: ltex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity: 0 })); sg.add(m); return m; });
  },

  // ---------------------------------------------------------------- state as a pure function of t
  cursorA(t) { const B = this.B; const p = pathPos(this.K1, Math.min(t, B.freeze)); const idle = 1 - fadeIO(t, B.toBtn0, B.freeze, 0.1, 0.1) * 0.6; p.x += (noise1(t * 0.7) - 0.5) * 10 * idle; p.y += (noise1(t * 0.6 + 9) - 0.5) * 8 * idle; const hes = fadeIO(t, B.reveal + 0.15, B.reveal + 1.0, 0.1, 0.2); p.x += (noise1(t * 6) - 0.5) * 14 * hes; p.y += (noise1(t * 5.3 + 3) - 0.5) * 10 * hes - 10 * hes; return p; },
  cursorR(t) { const p = pathPos(this.K2, t); p.x += (noise1(t * 0.7) - 0.5) * 4; p.y += (noise1(t * 0.6 + 9) - 0.5) * 4; return p; },
  uiStateA(t) {
    const B = this.B; t = Math.min(t, B.freeze);
    const S = { view: 'pdp', redesign: false, step: 0, bag: 0, btn: 'default', reveal: 0, pay: 'idle' };
    const c = this.cursorA(t); const inRect = (r) => c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h;
    if (t >= B.tap1 + 0.16) { S.btn = 'added'; S.addedK = seg(t, B.tap1 + 0.16, B.tap1 + 0.75); } else if (t >= B.tap1) S.btn = 'pressed'; else if (inRect(L.pdp.btn)) S.btn = 'hover';
    if (t >= B.tap1 + 0.3) { S.bag = 1; S.bagK = seg(t, B.tap1 + 0.3, B.tap1 + 0.75); }
    const coIn = B.tap2 + 0.2, delIn = B.tap3 + 0.2, payIn = B.tap4 + 0.2;
    if (t >= coIn) { S.view = 'checkout'; S.viewK = seg(t, coIn, coIn + 0.4); }
    S.step = t >= payIn ? 2 : t >= delIn ? 1 : 0; S.stepK = S.step === 2 ? seg(t, payIn, payIn + 0.35) : S.step === 1 ? seg(t, delIn, delIn + 0.35) : 1;
    const tapFor = S.step === 0 ? B.tap3 : S.step === 1 ? B.tap4 : Infinity;
    if (S.view === 'checkout') { if (t >= tapFor && t < tapFor + 0.16) S.contBtn = 'pressed'; else if (t < tapFor && inRect(L.co.btn)) S.contBtn = 'hover'; }
    S.reveal = seg(t, B.reveal, B.reveal + 0.7);
    return S;
  },
  uiStateR(t) {
    const B = this.B; const S = { view: 'pdp', redesign: true, step: 0, bag: 1, btn: 'default', pay: 'idle' };
    const c = this.cursorR(t); const inRect = (r) => c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h;
    const coIn = B.tap6 + 0.2, payIn = B.tap7 + 0.2;
    if (t >= coIn) { S.view = 'checkout'; S.viewK = seg(t, coIn, coIn + 0.4); }
    S.step = t >= payIn ? 1 : 0; S.stepK = S.step === 1 ? seg(t, payIn, payIn + 0.35) : 1;
    if (S.view === 'checkout' && S.step === 0) { if (t >= B.tap7 && t < B.tap7 + 0.16) S.contBtn = 'pressed'; else if (t < B.tap7 && inRect(L.co.btn)) S.contBtn = 'hover'; }
    if (S.step === 1) {
      if (t >= B.confirmed) { S.pay = 'confirmed'; S.confirmK = seg(t, B.confirmed, B.confirmed + 0.6); }
      else if (t >= B.tap5 + 0.16) { S.pay = 'processing'; S.spin = (t - B.tap5) * 9; }
      else if (t >= B.tap5) S.pay = 'pressed'; else if (inRect(L.co.btn)) S.contBtn = 'hover';
    }
    return S;
  },
  phase(t) { const B = this.B; return t < B.pull ? 'shop' : t < B.ret1 ? 'layers' : 'redesign'; },

  // ---------------------------------------------------------------- 3D
  update(t, stage) {
    const B = this.B, cam = stage.camera; cam.fov = FOV; cam.updateProjectionMatrix(); stage.setBackground(PALETTE.graphite);
    const in3d = this.phase(t) === 'layers'; this.slabGroup.visible = in3d;
    // camera: frontal (exact overlay match) → three-quarter pull-back → slow push → back to frontal
    const k = easeInOut(seg(t, B.pull, B.pullEnd)), drift = seg(t, B.pullEnd, B.ret0), r = easeInOut(seg(t, B.ret0, B.ret1));
    const p1 = new THREE.Vector3(2.55 - 0.2 * drift, 1.15 + 0.05 * drift, 4.75 - 0.3 * drift), l1 = new THREE.Vector3(0.2, -0.12, -1.3);
    const pos = new THREE.Vector3(0, 0, D).lerp(p1, k).lerp(new THREE.Vector3(0, 0, D), r), look = new THREE.Vector3(0, 0, 0).lerp(l1, k).lerp(new THREE.Vector3(0, 0, 0), r);
    cam.position.copy(pos); cam.lookAt(look);
    if (!in3d) return;
    stage.setFog(PALETTE.graphite, 5.5, 13);
    const e = easeOut(seg(t, B.pull + 0.25, B.pull + 2.3)) * (1 - r);
    this.layers.forEach((m, i) => { m.position.set(0.02 * i * e, 0.075 * (i + 1) * e, -0.44 * (i + 1) * e); m.material.opacity = clamp(e * 1.6) * (0.9 - i * 0.07); m.visible = e > 0.001; });
  },
  // screen position of a point given in slab-local world units (x right, y up from the slab centre; z depth)
  project(cam, x, y, z) { V3.set(SLAB_X + x, SLAB_Y + y, z).project(cam); return { x: (V3.x + 1) / 2 * W, y: (1 - V3.y) / 2 * H }; },

  // ---------------------------------------------------------------- overlay pieces
  drawSlabUI(ctx, S, alpha = 1) {
    const u = this.uiCtx; u.setTransform(1, 0, 0, 1, 0, 0); u.clearRect(0, 0, SW, SH); drawShop(u, S);
    ctx.save(); ctx.globalAlpha *= alpha;
    const gl = ctx.createRadialGradient(SX + SW / 2, SY + SH / 2, SH * 0.3, SX + SW / 2, SY + SH / 2, SW * 0.75); gl.addColorStop(0, 'rgba(246,242,232,0.10)'); gl.addColorStop(1, 'rgba(246,242,232,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    roundRect(ctx, SX, SY, SW, SH, 18); ctx.clip(); ctx.drawImage(this.uiCanvas, SX, SY); ctx.restore();
  },
  drawCursor(ctx, p, t, taps, alpha = 1) {
    if (alpha <= 0) return; const x = SX + p.x, y = SY + p.y;
    ctx.save(); ctx.globalAlpha *= alpha;
    let press = 0;
    for (const tp of taps) { const k = seg(t, tp, tp + 0.55); if (k > 0 && k < 1) { ctx.strokeStyle = `rgba(255,171,91,${(1 - k) * 0.85})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, lerp(12, 46, easeOut(k)), 0, Math.PI * 2); ctx.stroke(); } press = Math.max(press, fadeIO(t, tp - 0.08, tp + 0.22, 0.08, 0.14)); }
    amberDot(ctx, x, y, 7 - 2 * press, 1, { glow: 5.5 });
    ctx.strokeStyle = `rgba(246,242,232,${0.8})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 15 - 5 * press, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  },
  ring(ctx, r, alpha, label) { // cyan callout ring over a slab-local rect (+ optional small tag)
    if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 1.6; roundRect(ctx, SX + r.x, SY + r.y, r.w, r.h, 12); ctx.stroke();
    if (label) { const w = measure(ctx, label, { size: 15, weight: 700, tracking: 2 }) + 24, x0 = SX + r.x + r.w + 14, y0 = SY + r.y + r.h / 2; fillRoundRect(ctx, x0, y0 - 13, w, 26, 13, PALETTE.cyan); text(ctx, label, x0 + w / 2, y0 + 5, { size: 15, weight: 700, color: PALETTE.graphite, align: 'center', tracking: 2 }); }
    ctx.restore();
  },
  defBlock(ctx, big, sub, y, alpha, rise = 0) {
    text(ctx, big, COLX - 6, y + rise, { size: 124, weight: 300, family: 'Inter Display', alpha, tracking: -3 });
    caps(ctx, sub, COLX, y + 44 + rise, { alpha });
  },
  node(ctx, x, y, state, label, alpha, tag) { // journey node: 'done' | 'now' | 'todo' | 'fail' | 'ok'
    ctx.save(); ctx.globalAlpha *= alpha; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
    if (state === 'done') { ctx.fillStyle = PALETTE.ivory; ctx.fill(); checkGlyph(ctx, x, y + 0.5, 0.62, PALETTE.graphite, 1.8); }
    else if (state === 'now') { ctx.strokeStyle = PALETTE.amber; ctx.stroke(); amberDot(ctx, x, y, 4.5, 1, { glow: 4 }); }
    else if (state === 'fail') { ctx.fillStyle = RED; ctx.fill(); crossGlyph(ctx, x, y, 0.75, PALETTE.graphite, 2); }
    else if (state === 'ok') { ctx.fillStyle = PALETTE.green; ctx.fill(); checkGlyph(ctx, x, y + 0.5, 0.62, PALETTE.graphite, 1.8); }
    else { ctx.strokeStyle = PALETTE.gray2; ctx.stroke(); }
    text(ctx, label, x + 22, y + 6, { size: 18, weight: state === 'todo' ? 400 : 500, color: state === 'todo' ? PALETTE.gray : PALETTE.ivory });
    if (tag) { const w = measure(ctx, tag, { size: 15, weight: 700, tracking: 1.5 }) + 18; const tx0 = x + 22 + measure(ctx, label, { size: 18, weight: 500 }) + 12; fillRoundRect(ctx, tx0, y - 11, w, 22, 11, state === 'fail' ? RED : PALETTE.green); text(ctx, tag, tx0 + w / 2, y + 5, { size: 15, weight: 700, color: PALETTE.graphite, align: 'center', tracking: 1.5 }); }
    ctx.restore();
  },
  leftShop(ctx, t) { // exhibition label column during the shop phase
    const B = this.B;
    // UI definition + live feedback states
    const aUI = fadeIO(t, B.uiLabel, B.uxLabel - 0.05, 0.5, 0.35);
    if (aUI > 0) {
      const rise = (1 - easeOut(seg(t, B.uiLabel, B.uiLabel + 0.9))) * 16;
      this.defBlock(ctx, 'UI', 'User interface', 300, aUI, rise);
      const lines = wrapText(ctx, 'The layer of controls and feedback: buttons, labels, sounds, colour, interaction patterns.', 310, { size: 20, weight: 400 });
      lines.forEach((l, i) => text(ctx, l, COLX, 386 + i * 29 + rise, { size: 20, weight: 400, color: PALETTE.gray, alpha: aUI }));
      const aS = fadeIO(t, B.statesIn, B.uxLabel - 0.05, 0.5, 0.35);
      if (aS > 0) {
        const S = this.uiStateA(t); const states = [['default', 'Default'], ['hover', 'Hover'], ['pressed', 'Pressed'], ['added', 'Added']];
        caps(ctx, 'Feedback states', COLX, 548, { alpha: aS, size: 15, color: PALETTE.gray, tracking: 3 });
        states.forEach(([st, name], i) => {
          const y = 574 + i * 60, live = S.btn === st, a = aS * fadeIO(t, B.statesIn + i * 0.1, 1e9, 0.3, 1);
          ctx.save(); ctx.globalAlpha *= a; fillRoundRect(ctx, COLX + 18, y, 150, 48, 10, PALETTE.ivory);
          this.uiCtx.setTransform(1, 0, 0, 1, 0, 0); // mini button rendered via the shared button style
          ctx.translate(0, 0); const r = { x: COLX + 32, y: y + 9, w: 122, h: 30 };
          // draw directly on the overlay with the parts button (ivory tile beneath)
          this._miniButton(ctx, r, st);
          text(ctx, name, COLX + 186, y + 30, { size: 18, weight: live ? 600 : 400, color: live ? PALETTE.ivory : PALETTE.gray });
          if (live) amberDot(ctx, COLX + 2, y + 24, 4.5, 1, { glow: 4 });
          ctx.restore();
        });
      }
    }
    // UX definition + live journey
    const aUX = fadeIO(t, B.uxLabel, B.freeze + 0.2, 0.5, 0.4);
    if (aUX > 0) {
      const rise = (1 - easeOut(seg(t, B.uxLabel, B.uxLabel + 0.9))) * 16;
      this.defBlock(ctx, 'UX', 'User experience', 300, aUX, rise);
      text(ctx, 'The broader journey:', COLX, 386 + rise, { size: 20, weight: 400, color: PALETTE.gray, alpha: aUX });
      ['understand it', 'complete a task', 'trust the result', 'feel in control'].forEach((p, i) => { const a = aUX * fadeIO(t, B.phrases[i], 1e9, 0.35, 1); if (a > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PALETTE.amber; ctx.fillRect(COLX, 417 + i * 30 + rise, 10, 2); text(ctx, p, COLX + 22, 423 + i * 30 + rise, { size: 20, weight: 500, color: PALETTE.ivory }); ctx.restore(); } });
      const aJ = aUX * fadeIO(t, B.uxLabel + 0.5, 1e9, 0.5, 1);
      if (aJ > 0) {
        caps(ctx, 'The journey', COLX, 572, { alpha: aJ, size: 15, color: PALETTE.gray, tracking: 3 });
        const tf = Math.min(t, B.freeze); const steps = [['Browse', -1e9], ['Add to bag', B.tap1 + 0.2], ['Bag', B.tap2 + 0.2], ['Delivery', B.tap3 + 0.2], ['Pay', B.tap4 + 0.2]];
        const failK = seg(tf, B.reveal + 0.25, B.reveal + 0.6);
        ctx.save(); ctx.globalAlpha *= aJ; ctx.fillStyle = 'rgba(138,143,152,0.35)'; ctx.fillRect(COLX + 8, 604, 1.5, 4 * 46); ctx.restore();
        steps.forEach(([name, at], i) => {
          const y = 604 + i * 46; let st = 'todo'; const next = steps[i + 1]; if (tf >= at) st = next && tf >= next[1] ? 'done' : 'now';
          if (i === 4 && failK > 0) st = 'fail';
          this.node(ctx, COLX + 9, y, st, name, aJ, st === 'fail' ? 'HIDDEN COST' : null);
        });
      }
    }
  },
  _miniButton(ctx, r, st) {
    // small replica of the shop button states (ivory tile already drawn)
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2; ctx.save(); let fill = PALETTE.graphite, dy = 0, sc = 1;
    if (st === 'hover') { fill = PALETTE.graphite3; dy = -1.5; ctx.shadowColor = 'rgba(13,16,22,0.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5; }
    if (st === 'pressed') { fill = PALETTE.graphite2; sc = 0.95; }
    ctx.translate(cx, cy + dy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); fillRoundRect(ctx, r.x, r.y, r.w, r.h, 8, fill); ctx.shadowColor = 'transparent';
    if (st === 'added') { ctx.fillStyle = PALETTE.green; ctx.beginPath(); ctx.arc(cx - 34, cy, 7, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, cx - 34, cy + 0.5, 0.55, PALETTE.graphite, 1.6); text(ctx, 'Added', cx - 22, cy + 5, { size: 14, weight: 600, color: PALETTE.ivory }); }
    else text(ctx, 'Add to bag', cx, cy + 5, { size: 14, weight: 600, color: PALETTE.ivory, align: 'center' });
    ctx.restore();
  },
  callouts(ctx, t) { // cyan rings on the sentence "buttons, labels, … colour"
    const B = this.B, c = L.pdp.col, P = L.pdp;
    const items = [[{ x: P.btn.x - 8, y: P.btn.y - 8, w: P.btn.w + 16, h: P.btn.h + 16 }, 'BUTTON'], [{ x: c.x - 12, y: P.eyebrowY - 26, w: 420, h: 110 }, 'LABELS'], [{ x: c.x - 10, y: P.swatchY - 30, w: 170, h: 60 }, 'COLOUR']];
    items.forEach(([r, tag], i) => this.ring(ctx, r, fadeIO(t, B.call[i], B.call[i] + 0.8, 0.22, 0.28), tag));
  },
  layerLabels(ctx, t, cam) {
    const B = this.B;
    for (let p = 0; p < 4; p++) {
      const t0 = B.pull + 0.55 + p * 1.0, a = fadeIO(t, t0, t0 + 1.02, 0.28, 0.3); if (a <= 0) continue;
      for (const i of [p, p + 4]) {
        const m = this.layers[i]; const s = this.project(cam, m.position.x - SLAB_W / 2, m.position.y + SLAB_H / 2, m.position.z);
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PALETTE.cyan; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(128,201,248,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 26, s.y - 18); ctx.lineTo(s.x - 40, s.y - 18); ctx.stroke();
        text(ctx, LAYERS[i], s.x - 48, s.y - 12, { size: 22, weight: 600, color: PALETTE.ivory, tracking: 0.5, align: 'right' }); ctx.restore();
      }
    }
  },
  ribbon(ctx, t) {
    const B = this.B, a = fadeIO(t, B.ribbonIn, B.ret1 + 0.15, 0.5, 0.45); if (a <= 0) return;
    const y = 918, x0 = 330, x1 = 1590, n = PROCESS.length, xs = PROCESS.map((_, i) => x0 + i * (x1 - x0) / (n - 1));
    ctx.save(); ctx.globalAlpha *= a;
    ctx.strokeStyle = 'rgba(138,143,152,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs[0], y); ctx.lineTo(xs[n - 1], y); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const lit = t >= B.ticks[i], k = seg(t, B.ticks[i], B.ticks[i] + 0.5);
      if (lit && i < n - 1) { const pr = seg(t, B.ticks[i] + 0.1, B.ticks[i + 1]); ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs[i], y); ctx.lineTo(lerp(xs[i], xs[i + 1], pr), y); ctx.stroke(); }
      if (lit) { const pop = 1 + 0.5 * Math.sin(Math.PI * k); amberDot(ctx, xs[i], y, 8 * pop, 1, { glow: 4.5 }); }
      else { ctx.fillStyle = PALETTE.graphite; ctx.beginPath(); ctx.arc(xs[i], y, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = PALETTE.gray2; ctx.lineWidth = 1.6; ctx.stroke(); }
      caps(ctx, PROCESS[i], xs[i], y + 46, { size: 18, color: lit ? PALETTE.ivory : PALETTE.gray2, align: 'center', tracking: 2.6, weight: 600 });
    }
    ctx.restore();
  },
  noteCard(ctx, t) {
    const B = this.B, a = fadeIO(t, B.note, B.ret0 + 0.35, 0.45, 0.35); if (a <= 0) return;
    const x = 1310, y = 170, w = 470, h = 236, rise = (1 - easeOut(seg(t, B.note, B.note + 0.7))) * 14;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + w / 2, y + h / 2 + rise); ctx.rotate(deg(-1.6)); ctx.translate(-w / 2, -h / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; fillRoundRect(ctx, 0, 0, w, h, 8, PALETTE.ivory); ctx.shadowColor = 'transparent';
    ctx.fillStyle = PALETTE.amber; ctx.fillRect(0, 0, w, 5);
    text(ctx, 'USABILITY TEST · PARTICIPANT 3', 32, 48, { size: 16, weight: 700, color: PALETTE.gray2, tracking: 2.5 });
    text(ctx, '“Where did the delivery', 32, 100, { size: 30, weight: 500, family: 'Inter Display', color: PALETTE.graphite });
    text(ctx, 'cost come from?”', 32, 138, { size: 30, weight: 500, family: 'Inter Display', color: PALETTE.graphite });
    let cx = 32; for (const tag of ['hidden cost', 'surprise', 'lost trust']) { const tw = measure(ctx, tag, { size: 17, weight: 600 }) + 26; fillRoundRect(ctx, cx, 174, tw, 32, 16, PALETTE.beige); text(ctx, tag, cx + tw / 2, 196, { size: 17, weight: 600, color: PALETTE.graphite, align: 'center' }); cx += tw + 10; }
    ctx.restore();
  },
  leftRedesign(ctx, t) {
    const B = this.B;
    const items = [['Delivery cost shown up front', B.ret1 + 0.25], ['Two steps instead of three', B.tap6 + 0.55], ['Clear confirmation', B.confirmed + 0.1]];
    const aH = fadeIO(t, items[0][1] - 0.1, B.dis0 + 0.3, 0.4, 0.3);
    if (aH > 0) {
      caps(ctx, 'Revised', COLX, 300, { alpha: aH });
      items.forEach(([s, at], i) => { const a = fadeIO(t, at, B.dis0 + 0.3, 0.4, 0.3); if (a <= 0) return; const y = 352 + i * 44, rise = (1 - easeOut(seg(t, at, at + 0.6))) * 10;
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PALETTE.cyan; ctx.beginPath(); ctx.arc(COLX + 10, y - 6 + rise, 10, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, COLX + 10, y - 5.5 + rise, 0.7, PALETTE.graphite, 2);
        text(ctx, s, COLX + 32, y + rise, { size: 21, weight: 500, color: PALETTE.ivory }); ctx.restore(); });
    }
    const aS = fadeIO(t, B.strips, B.dis0 + 0.3, 0.5, 0.3);
    if (aS > 0) {
      const y0 = 560, before = ['Browse', 'Add to bag', 'Bag', 'Delivery', 'Pay'], after = ['Browse', 'Add to bag', 'Bag & delivery', 'Pay'];
      caps(ctx, 'Before', COLX, y0 - 30, { alpha: aS, size: 15, color: PALETTE.gray, tracking: 3 }); caps(ctx, 'After', COLX + 190, y0 - 30, { alpha: aS, size: 15, color: PALETTE.cyan, tracking: 3 });
      ctx.save(); ctx.globalAlpha *= aS; ctx.fillStyle = 'rgba(138,143,152,0.35)'; ctx.fillRect(COLX + 8, y0, 1.5, 4 * 44); ctx.fillRect(COLX + 198, y0, 1.5, 3 * 44); ctx.restore();
      before.forEach((n, i) => { const a = aS * fadeIO(t, B.strips + i * 0.08, 1e9, 0.3, 1); const fail = i === 4; this.node(ctx, COLX + 9, y0 + i * 44, fail ? 'fail' : 'done', n, a, null); });
      after.forEach((n, i) => { const a = aS * fadeIO(t, B.strips + 0.35 + i * 0.08, 1e9, 0.3, 1); const ok = i === 3; this.node(ctx, COLX + 199, y0 + i * 44, ok ? 'ok' : 'done', n, a, null); });
    }
  },
  dissolve(ctx, t) { // the confirmed checkout breaks into a component-library grid
    const B = this.B, k1 = easeInOut(seg(t, B.dis0, B.dis0 + 0.5)); if (k1 <= 0) return false;
    const cols = 6, rows = 4, cw = SW / cols, ch = SH / rows, TW = 284, TH = 214;
    this.uiCtx.setTransform(1, 0, 0, 1, 0, 0); this.uiCtx.clearRect(0, 0, SW, SH); drawShop(this.uiCtx, this.uiStateR(t));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, scx = SX + (c + 0.5) * cw, scy = SY + (r + 0.5) * ch, tcx = (c + 0.5) * W / cols, tcy = (r + 0.5) * H / rows;
      const dist = Math.hypot((scx - (SX + SW / 2)) / SW, (scy - (SY + SH / 2)) / SH) * 1.6;
      const k2 = easeInOut(seg(t, B.dis0 + 0.18 + 0.22 * dist, B.dis0 + 0.62 + 0.22 * dist));
      const x = lerp(scx, tcx, k2), y = lerp(scy, tcy, k2), w = lerp(cw * (1 - 0.1 * k1), TW, k2), h = lerp(ch * (1 - 0.1 * k1), TH, k2);
      ctx.save(); roundRect(ctx, x - w / 2, y - h / 2, w, h, lerp(4, 14, k1)); ctx.clip();
      if (k2 < 1) { ctx.save(); ctx.globalAlpha *= 1 - k2; ctx.drawImage(this.uiCanvas, c * cw, r * ch, cw, ch, x - w / 2, y - h / 2, w, h); ctx.restore(); }
      if (k2 > 0) {
        ctx.save(); ctx.globalAlpha *= k2; fillRoundRect(ctx, x - w / 2, y - h / 2, w, h, 14, 'rgba(31,38,50,0.96)', 'rgba(246,242,232,0.12)', 1);
        const iw = w - 20, ih = h - 56; fillRoundRect(ctx, x - iw / 2, y - h / 2 + 10, iw, ih, 10, PALETTE.ivory);
        ctx.save(); ctx.translate(x - iw / 2, y - h / 2 + 10); roundRect(ctx, 0, 0, iw, ih, 10); ctx.clip(); drawComponent(ctx, i, iw, ih); ctx.restore();
        text(ctx, COMPONENTS[i], x, y + h / 2 - 17, { size: 17, weight: 500, color: PALETTE.gray, align: 'center' }); ctx.restore();
      }
      ctx.restore();
    }
    return true;
  },

  // ---------------------------------------------------------------- overlay
  draw2d(ctx, t, stage) {
    const B = this.B, ph = this.phase(t), cam = stage.camera;
    if (ph === 'shop') {
      this.drawSlabUI(ctx, this.uiStateA(t));
      this.callouts(ctx, Math.min(t, B.freeze));
      this.drawCursor(ctx, this.cursorA(t), Math.min(t, B.freeze), this.tapsA);
      this.leftShop(ctx, t);
      badge(ctx, BADGE.FICTIONAL, W - 120, H - 70, fadeIO(t, B.start + 0.6, B.pull + 0.2, 0.5, 0.3), { align: 'right' });
    }
    if (ph === 'layers') {
      // the slab is now 3D; the point lifts off the frozen "Back" link and hovers in front of the stack
      const k = easeInOut(seg(t, B.pull, B.pullEnd)), r = easeInOut(seg(t, B.ret0, B.ret1));
      const c = this.cursorA(B.freeze); const onSlab = this.project(cam, (c.x - SW / 2) * WPP, (SH / 2 - c.y) * WPP, 0.02 + 0.35 * k * (1 - r));
      const hover = Math.sin(t * 1.4) * 6 * k * (1 - r);
      amberDot(ctx, onSlab.x, onSlab.y + hover, 8 + 3 * k * (1 - r), 1, { glow: 6 });
      this.layerLabels(ctx, t, cam);
      this.ribbon(ctx, t); this.noteCard(ctx, t);
      badge(ctx, BADGE.VIS, W - 120, H - 70, fadeIO(t, B.pull + 0.3, B.ret1, 0.5, 0.3), { align: 'right' });
    }
    if (ph === 'redesign') {
      const dis = this.dissolve(ctx, t);
      if (!dis) {
        const S = this.uiStateR(t); const xf = seg(t, B.ret1, B.ret1 + 0.45);
        if (xf < 1) this.drawSlabUI(ctx, this.uiStateA(B.freeze), 1); // the broken checkout still visible for a beat
        this.drawSlabUI(ctx, S, easeOut(xf));
        // cyan rings on what changed
        const P = L.pdp, c = L.pdp.col;
        if (S.view === 'pdp') this.ring(ctx, { x: c.x - 4, y: P.deliveryY - 30, w: 300, h: 46 }, fadeIO(t, B.ret1 + 0.35, B.tap6 + 0.25, 0.3, 0.25), null);
        if (S.view === 'checkout' && S.step === 0) this.ring(ctx, { x: 200, y: L.co.stepperY - 34, w: 476, h: 90 }, fadeIO(t, B.tap6 + 0.6, B.tap7, 0.3, 0.25), null);
        if (S.view === 'checkout' && S.step === 0) this.ring(ctx, { x: L.co.summary.x + 16, y: PT.summaryDelivery.y - 24, w: L.co.summary.w - 32, h: 38 }, fadeIO(t, B.tap6 + 0.6, B.tap7, 0.3, 0.25), null);
        if (S.pay === 'confirmed') this.ring(ctx, { x: L.co.content.x + 150, y: L.co.content.y + 120, w: L.co.content.w - 300, h: 270 }, fadeIO(t, B.confirmed + 0.35, B.dis0, 0.3, 0.3), null);
        this.drawCursor(ctx, this.cursorR(t), t, this.tapsR, easeOut(xf));
      } else {
        const c = this.cursorR(t); amberDot(ctx, SX + c.x, SY + c.y, 8 + 10 * seg(t, B.dis0, this.end - 0.7), 1, { glow: 6 });
      }
      this.leftRedesign(ctx, t);
      badge(ctx, BADGE.FICTIONAL, W - 120, H - 70, fadeIO(t, B.ret1 + 0.3, B.dis0 + 0.35, 0.5, 0.3), { align: 'right' });
    }
    // the freeze: soft pulse + dim, then the two statements
    dip(ctx, 0.2 * fadeIO(t, B.freeze, B.freeze + 1.0, 0.08, 0.9), PALETTE.graphite);
    dip(ctx, 0.64 * fadeIO(t, B.freeze + 0.08, B.pull + 0.7, 0.45, 0.6), PALETTE.graphite);
    const a1 = fadeIO(t, B.freeze + 0.12, B.capsOut, 0.45, 0.4), a2 = fadeIO(t, B.caps2, B.capsOut, 0.45, 0.4);
    if (a1 > 0) { const rise = (1 - easeOut(seg(t, B.freeze + 0.12, B.freeze + 1.0))) * 18; text(ctx, 'BEAUTIFUL UI.', W / 2, 500 + rise, { size: 118, weight: 300, family: 'Inter Display', color: PALETTE.ivory, align: 'center', alpha: a1, tracking: 2, shadow: 24 }); }
    if (a2 > 0) { const rise = (1 - easeOut(seg(t, B.caps2, B.caps2 + 0.9))) * 18; text(ctx, 'FRUSTRATING UX.', W / 2, 640 + rise, { size: 118, weight: 300, family: 'Inter Display', color: PALETTE.amber, align: 'center', alpha: a2, tracking: 2, shadow: 24 }); }
    // hand-off blooms
    bloom(ctx, 1 - seg(t, B.start, B.start + 0.8));
    bloom(ctx, seg(t, this.end - 0.7, this.end));
  },
};
