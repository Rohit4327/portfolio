// SCENE 04 — THE MOUSE CHANGES EVERYTHING. A dark 1968 auditorium, a glowing monochrome projection, the console with
// keyboard + five-key keyset + three-button mouse, the 1964 wooden prototype as a separate exhibit, and the window that
// detaches from the screen. Everything here is an illustrative reconstruction (badge on screen throughout).
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, noise1, deg } from '../lib/util.js';
import { caps, lowerThird, yearStamp, badge, BADGE, bloom, amberDot } from '../lib/gfx.js';
import { AmberPoint, rig, makeScreen } from '../lib/props.js';
import { SCREEN, PANE, paneWorld, screenPoint, buildAuditorium, buildConsole, buildExhibit, makeProjection, drawProjection, paintWindow, LINK_UV, WORD_UV, INSERT } from './s04_mouse.parts.js';

const CH = 4;
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const EXHIBIT_POS = new THREE.Vector3(60, 0, 0);
const CONSOLE_POS = new THREE.Vector3(0.1, 0.6, -5.3);
const MOUSE_HOME = new THREE.Vector3(0.52, 0.74, 0.1); // console-local
const PANE_UV = { u: (PANE.x + PANE.w / 2) / SCREEN.pxW, v: (PANE.y + PANE.h / 2) / SCREEN.pxH };

export default {
  id: 's04', title: 'The Mouse Changes Everything',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.6, grain: 0.04, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    // ---- beats from the narration ----
    const S1 = T.sent(CH, 'In 1968', 83.2), S2 = T.sent(CH, 'They showed', 90.1), S3 = T.sent(CH, 'wooden prototype', 97.1), S4 = T.sent(CH, 'later model', 104.1), S5 = T.sent(CH, 'point to', 108.3);
    const wordAt = (s, i, n) => s.start + (s.end - s.start) * (i / n); // rough position of word i of n inside a sentence
    const B = (this.B = {
      year: S1.start,                              // "In 1968" → yearStamp
      engelbart: wordAt(S1, 2, 19) + 0.1,         // "Douglas Engelbart" → lower third
      demos: wordAt(S1, 12, 19),                  // "what we now call" → caps 'THE MOTHER OF ALL DEMOS'
      shotB1: S2.start - 0.1,                     // close on the mouse: "They showed a mouse"
      move1: [S2.start + 0.1, S2.start + 1.6],    // cursor → link
      shotB2: S2.start + 1.75,                    // the screen full-frame
      click1: S2.start + 2.0,                     // link followed
      shotC1: S3.start,                           // console three-quarter view: "emerged from experiments"
      shotC2: S3.start + (S3.end - S3.start) * 0.47, // exhibit: "a wooden prototype came in 1964"
      shotD: S4.start + 0.25,                     // "used a later model" → three-button mouse close-up
      shotE: S5.start + 0.2,                      // "something you could point to" → the screen, the window
      end: this.end,
    });
    B.move2 = [B.click1 + 0.35, B.click1 + 1.05];
    B.click2 = B.click1 + 1.3;                     // selects the word
    B.typeStart = B.click2 + 0.3; B.typeStep = 0.085; B.typeEnd = B.typeStart + INSERT.length * B.typeStep;
    B.chord = B.typeEnd + 0.2; B.split = B.chord + 0.15;
    B.move3 = [B.shotD + 0.5, B.shotD + 1.6]; B.click3 = B.shotD + 1.85;
    B.move4 = [B.shotE + 0.15, B.shotE + 0.95]; B.click4 = B.shotE + 1.1;
    B.detach = [B.click4 + 0.1, B.click4 + 1.5]; B.fly = [B.click4 + 0.45, this.end - 0.12];
    B.protoLabel = B.shotC2 + 0.3; B.threeLabel = B.shotD + 0.35;
    this.cues = {
      mouse_click_1: B.click1, mouse_click_2: B.click2, mouse_click_3: B.click3, mouse_click_4: B.click4,
      keyset_chord: B.chord, screen_text_type: B.typeStart, screen_split: B.split, window_detach: B.detach[0],
      cut_mouse_closeup: B.shotB1, cut_screen: B.shotB2, cut_console: B.shotC1, cut_prototype: B.shotC2, cut_three_button: B.shotD, cut_window: B.shotE,
      transition_point: this.end - 0.7,
    };

    // ---- the hall ----
    const hall = (this.hall = new THREE.Group()); g.add(hall);
    hall.add(buildAuditorium());
    rig(hall, { key: [-2, 6, -1], keyI: 0.35, keyColor: 0xcfd8e0, fill: [-4, 3, 4], fillI: 0.12, fillColor: 0xc9d6e8, rim: [0, 4.5, -9], rimI: 0.9, rimColor: 0xd6e4dc, ambient: 0.05, shadows: false });
    // projection spill: a cool point light at the screen, lighting the stage and the first rows
    const spill = new THREE.PointLight(0xcfe0d8, 5.5, 15, 1.5); spill.position.set(0, 3.6, -7.7); hall.add(spill);
    // desk light: warm spot over the console, the one shadow-casting light of the hall
    const spot = new THREE.SpotLight(0xffe3c4, 22, 9, deg(26), 0.55, 1.3); spot.position.set(1.2, 4.3, -4.3); spot.target.position.copy(CONSOLE_POS).add(new THREE.Vector3(0.1, 0.74, 0.05));
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.015; spot.shadow.camera.near = 0.5; spot.shadow.camera.far = 10; hall.add(spot, spot.target);

    // the projection screen + its content
    this.scr = makeProjection(); hall.add(this.scr.mesh);
    const console_ = (this.console = buildConsole(this.scr.material)); console_.position.copy(CONSOLE_POS); hall.add(console_);
    this.mouse = console_.userData.mouse; this.keyset = console_.userData.keyset;
    // the floating window (the right split pane, detached)
    const pw = paneWorld(); this.pw = pw;
    this.win = makeScreen(pw.w, pw.h, 512, Math.round(512 * pw.h / pw.w)); this.win.mesh.visible = false; hall.add(this.win.mesh);
    this.winPainted = false;

    // ---- the exhibit (far away, its own lights) ----
    this.exhibit = buildExhibit(); this.exhibit.position.copy(EXHIBIT_POS); this.exhibit.visible = false; g.add(this.exhibit);

    // ---- the amber point: becomes the on-screen cursor ----
    this.point = new AmberPoint(0.03, { light: false }); g.add(this.point.group);
  },

  // cursor position on the projection (canvas uv), pure function of t
  cursorUV(t, tremor = true) {
    const B = this.B;
    const moves = [[B.move1, LINK_UV], [B.move2, WORD_UV], [B.move3, { u: 0.42, v: 0.5 }], [B.move4, PANE_UV]];
    let u = 0.55, v = 0.5;
    for (const [[t0, t1], to] of moves) {
      if (t <= t0) break;
      const k = easeInOut(seg(t, t0, t1)); const arc = Math.sin(k * Math.PI) * 0.025;
      const nu = lerp(u, to.u, k), nv = lerp(v, to.v, k) - arc; u = nu; v = nv;
      if (t < t1) break;
    }
    // tiny hand tremor while idle on the desk
    if (tremor) { u += (noise1(t * 1.7) - 0.5) * 0.004; v += (noise1(t * 1.3 + 9) - 0.5) * 0.004; }
    return { u, v };
  },

  screenState(t) {
    const B = this.B;
    const mode = t < B.click1 ? 'outline' : t < B.split ? 'linked' : 'split';
    const sel = t >= B.click2 && t < B.typeStart;
    const typed = t < B.typeStart ? 0 : Math.min(INSERT.length, Math.floor((t - B.typeStart) / B.typeStep) + 1);
    const c = this.cursorUV(t, false); const q = (x) => Math.round(x * 256) / 256;
    return { mode, sel, typed, detached: t >= B.detach[0], cur: { u: q(c.u), v: q(c.v) } };
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera;
    cam.fov = 35; cam.updateProjectionMatrix();
    stage.setBackground(PALETTE.graphite); stage.setExposure(1.0);
    const inExhibit = t >= B.shotC2 && t < B.shotD;
    this.hall.visible = !inExhibit; this.exhibit.visible = inExhibit;

    // ---- screen content (redrawn only when its state key changes) ----
    const st = this.screenState(t); drawProjection(this.scr, st);
    if (st.detached && !this.winPainted) { paintWindow(this.win, this.scr); this.winPainted = true; }

    // ---- cursor → mouse on the desk, clicks, keyset chord ----
    const cur = this.cursorUV(t);
    this.mouse.position.set(MOUSE_HOME.x + (cur.u - 0.55) * 0.22, MOUSE_HOME.y, MOUSE_HOME.z + (cur.v - 0.5) * 0.16);
    this.mouse.rotation.y = (cur.u - 0.55) * -0.25;
    const press = (tc) => fadeIO(t, tc - 0.05, tc + 0.2, 0.05, 0.14);
    const btn = this.mouse.userData.buttons;
    btn[0].position.y = 0.048 - 0.0035 * Math.max(press(B.click1), press(B.click2), press(B.click4));
    btn[1].position.y = 0.048 - 0.0035 * press(B.click3);
    const chord = fadeIO(t, B.chord - 0.05, B.chord + 0.35, 0.06, 0.2);
    this.keyset.userData.keys.forEach((k, i) => { k.position.y = 0.033 - ([1, 0, 1, 1, 0][i] ? 0.004 * chord : 0); });

    // ---- the floating window ----
    const det = easeInOut(seg(t, B.detach[0], B.detach[1]));
    const drift = easeIn(seg(t, B.detach[1], this.end)) * 0.35;
    const winPos = V3.set(SCREEN.center.x + this.pw.cx, SCREEN.center.y + this.pw.cy, SCREEN.center.z + 0.03 + det * 1.55 + drift);
    this.win.mesh.visible = st.detached; this.win.mesh.position.copy(winPos);
    this.win.mesh.rotation.y = -0.06 * det;

    // ---- the amber point rides the cursor (and then the window) ----
    const pScale = t < B.shotB1 ? 1.6 : (t >= B.shotB2 && t < B.shotC1) || t >= B.shotE ? 0.55 : 1.0;
    screenPoint(cur.u, cur.v, V); if (st.detached) V.copy(winPos).add(new THREE.Vector3(0, 0, 0.03)).lerp(V.clone(), 1 - det);
    const pulseIn = ease(t, this.start + 0.4, this.start + 1.6, easeOut);
    const rush = easeIn(seg(t, this.end - 1.3, this.end - 0.1));
    this.point.group.position.copy(V);
    this.point.setIntensity(inExhibit ? 0 : lerp(0.6, 1.0, pulseIn) * (1 + 0.3 * Math.max(press(B.click1), press(B.click2), press(B.click4))) + rush * 0.8).setScale(pScale * (1 + rush * 2.2)).pulse(t, 0.06, 1.3);
    this.point.group.visible = !inExhibit;

    // ---- camera: one still-ish composition per beat, slow drifts inside each ----
    const look = V2;
    if (t < B.shotB1) {           // A: back of the hall, over the seats, the glowing screen
      const k = seg(t, this.start, B.shotB1);
      cam.position.set(lerp(0.7, 0.45, k), lerp(2.45, 2.3, k), lerp(7.6, 6.3, k));
      screenPoint(0.55, 0.5, look);                    // the cursor at the start sits dead centre
    } else if (t < B.shotB2) {    // B1: the three-button mouse moving, the screen glowing behind
      const k = seg(t, B.shotB1, B.shotB2);
      this.mouse.getWorldPosition(look);
      cam.position.set(look.x + lerp(0.34, 0.3, k), look.y + 0.26, look.z + lerp(0.5, 0.46, k));
      look.x -= 0.2; look.y += 0.07; look.z -= 0.12;
    } else if (t < B.shotC1) {    // B2: the projection full-frame — link, edit, split
      const k = seg(t, B.shotB2, B.shotC1);
      cam.fov = 38; cam.updateProjectionMatrix();
      cam.position.set(lerp(0.3, 0.2, k), lerp(3.4, 3.45, k), lerp(-0.9, -1.4, k));
      look.set(0.05, 3.45, SCREEN.center.z);
    } else if (t < B.shotC2) {    // C1: the whole console — keyset, keyboard, mouse, display
      const k = seg(t, B.shotC1, B.shotC2);
      cam.position.set(lerp(-1.15, -1.0, k), lerp(2.25, 2.2, k), lerp(-3.85, -3.95, k));
      look.copy(CONSOLE_POS).add(new THREE.Vector3(0.1, 0.78, 0.05));
    } else if (t < B.shotD) {     // C2: the 1964 wooden prototype on its plinth
      const k = seg(t, B.shotC2, B.shotD); const a = lerp(-0.1, 0.1, k);
      look.copy(EXHIBIT_POS).add(new THREE.Vector3(0, 0.955, 0));
      cam.position.set(look.x + Math.sin(a) * 0.4, 1.0 + 0.02 * k, look.z + Math.cos(a) * 0.4);
    } else if (t < B.shotE) {     // D: the three-button mouse from the front
      const k = seg(t, B.shotD, B.shotE);
      this.mouse.getWorldPosition(look);
      cam.position.set(look.x - lerp(0.1, 0.14, k), look.y + 0.15, look.z - lerp(0.33, 0.31, k));
      look.y += 0.015;
    } else {                      // E: the screen, the window detaches, we fly into it
      cam.fov = 38; cam.updateProjectionMatrix();
      const k = easeInOut(seg(t, B.fly[0], B.fly[1]));
      const p0 = new THREE.Vector3(0.2, 3.45, -1.4), l0 = new THREE.Vector3(0.05, 3.45, SCREEN.center.z);
      const p1 = winPos.clone().add(new THREE.Vector3(0.0, 0.0, 1.05));
      cam.position.lerpVectors(p0, p1, k); look.lerpVectors(l0, winPos, Math.min(1, k * 1.4));
    }
    cam.lookAt(look);
    // projected centre of the floating window (bloom-out origin)
    cam.updateMatrixWorld(); V.copy(winPos).project(cam);
    this.winXY = { x: (V.x + 1) / 2 * W, y: (1 - V.y) / 2 * H };
  },

  draw2d(ctx, t) {
    const B = this.B, src = 'Reconstruction after period documentation · not a photograph';
    const inExhibit = t >= B.shotC2 && t < B.shotD;
    // the point resolving out of the bloom into the on-screen cursor
    const settle = 1 - ease(t, this.start + 0.5, this.start + 1.8, easeOut);
    if (settle > 0) amberDot(ctx, W / 2, H / 2, 14 * settle + 4, settle, { glow: 6 });
    // year + lower third + caps
    yearStamp(ctx, '1968', 120, 250, fadeIO(t, B.year, B.demos + 0.2, 0.5, 0.6));
    const lt1 = fadeIO(t, B.engelbart, B.shotB1 - 0.15, 0.5, 0.5);
    if (lt1 > 0) lowerThird(ctx, { title: 'DOUGLAS ENGELBART', sub: 'SRI Augmentation Research Center · 9 Dec 1968, San Francisco', source: src, alpha: lt1, reveal: seg(t, B.engelbart, B.engelbart + 0.8) });
    const cp = fadeIO(t, B.demos, B.shotB2 - 0.2, 0.5, 0.5);
    if (cp > 0) caps(ctx, '1968 — THE MOTHER OF ALL DEMOS', W - 120, H - 124, { alpha: cp, align: 'right' });
    const lt2 = fadeIO(t, B.protoLabel, B.shotD - 0.1, 0.5, 0.4);
    if (lt2 > 0) lowerThird(ctx, { title: 'FIRST MOUSE PROTOTYPE · 1964', sub: 'Wooden shell · built by Bill English, 1964 · concept Douglas Engelbart', source: src, alpha: lt2, reveal: seg(t, B.protoLabel, B.protoLabel + 0.8) });
    const lt3 = fadeIO(t, B.threeLabel, B.shotE - 0.15, 0.5, 0.4);
    if (lt3 > 0) lowerThird(ctx, { title: 'THREE-BUTTON MOUSE', sub: 'Used in the 1968 demonstration (reconstruction)', source: src, alpha: lt3, reveal: seg(t, B.threeLabel, B.threeLabel + 0.8) });
    // provenance badge throughout
    badge(ctx, BADGE.RECON, W - 120, H - 70, 0.9 * seg(t, this.start + 0.6, this.start + 1.4) * (1 - seg(t, this.end - 0.7, this.end - 0.3)), { align: 'right' });
    // hand-off blooms
    bloom(ctx, 1 - seg(t, this.start, this.start + 0.8));
    const xy = this.winXY || { x: W / 2, y: H / 2 };
    bloom(ctx, seg(t, this.end - 0.7, this.end), { cx: clamp(xy.x, 0, W), cy: clamp(xy.y, 0, H) });
  },
};
