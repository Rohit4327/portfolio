// SCENE 02 — BEFORE SCREENS — HUMAN FACTORS. A mid-century control desk: the point becomes a lamp, the camera tracks the
// controls, two identical levers confuse, the fix slides into reach, Dreyfuss's book is set down, and the telephone dial
// becomes an abstract rotating input wheel for the hand-off.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, easeInOutSine, fadeIO, lerp, clamp, noise1, deg } from '../lib/util.js';
import { text, caps, lowerThird, badge, BADGE, bloom, dip, amberDot, dimension } from '../lib/gfx.js';
import { mat, floor, plane, AmberPoint, rig } from '../lib/props.js';
import { MAT, makeToggle, makeLamp, makeKnob, makeGauge, needleAngle, makeLever, makeBigLever, makePhone, makeBook, makeStool, makeConsole, CONSOLE, DIAL } from './s02_human_factors.parts.js';

const CH = 2;
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
// estimated moment a word is spoken inside a sentence (linear in character offset; sentence times are real)
function wordTime(needle, word) { const s = T.sent(CH, needle); const i = s.text.toLowerCase().indexOf(word.toLowerCase()); const k = i < 0 ? 0 : i / s.text.length; return s.start + k * (s.end - s.start); }
const snap = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // quick quadratic snap for switch throws

export default {
  id: 's02', title: 'Before Screens — Human Factors',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.55, grain: 0.04, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    const start = this.start, end = this.end;
    // ---------------- beats (absolute seconds; all derived from the recorded narration) ----------------
    const s1 = T.sent(CH, 'Long before apps'), s2 = T.sent(CH, 'twentieth century'), s3 = T.sent(CH, 'Henry Dreyfuss'), s4 = T.sent(CH, 'telephone dials'), s5 = T.sent(CH, 'Good design');
    const B = (this.B = {
      pointLand: start + 1.1,
      click1: Math.max(start + 1.2, s1.start + 0.45), click2: Math.max(start + 1.95, s1.start + 1.2), click3: Math.max(start + 2.65, s1.start + 1.9),
      bigLever: s1.start + 2.7,
      pointLeaveLamp: s2.start - 1.7,
      camLevers: s2.start + 0.45,
      leverLabels: s2.start + 0.85,
      wrongLever: s2.start + 1.35, leverBack: s2.start + 3.05,
      dimIdent: [s2.start + 1.85, s2.start + 4.25],
      humanFactors: wordTime('twentieth century', 'human-factors') - 0.1,
      morph: s2.start + 4.3,
      camWide: s2.start + 4.95,
      slide: s2.start + 5.45,
      figure: s2.start + 6.15,
      ergonomics: wordTime('twentieth century', 'human bodies') - 0.35,
      figureOut: s3.start - 0.2,
      camBook: s3.start - 0.1,
      dreyfuss: wordTime('Henry Dreyfuss', 'Henry') - 0.1,
      bookDrop: wordTime('Henry Dreyfuss', 'Henry') + 0.05,
      bookLand: wordTime('Henry Dreyfuss', 'Henry') + 0.85,
      designing: wordTime('Henry Dreyfuss', 'Designing') - 0.1,
      camPhone: s4.start - 0.4,
      phoneLabel: s4.start + 0.25,
      dial1: s4.start + 0.95, dial1Hold: s4.start + 1.7, dial1Return: s4.start + 1.95, dial1End: s4.start + 2.75,
      camDial: s5.start + 0.3,
      dial2: s5.start + 1.3, dial2Hold: s5.start + 2.15, dial2Return: s5.start + 2.35,
      wheelXfade: [end - 2.45, end - 1.45],
      spiral: [end - 1.5, end - 0.65],
      transition: end - 0.7,
    });
    this.cues = {
      point_land: B.pointLand, switch_click_1: B.click1, switch_click_2: B.click2, switch_click_3: B.click3,
      lever_move: B.bigLever + 0.1, point_lift_off: B.pointLeaveLamp,
      wrong_lever_pull: B.wrongLever + 0.08, wrong_lever_return: B.leverBack + 0.1,
      knob_morph: B.morph, lever_slide_1: B.slide, lever_slide_2: B.slide + 0.3, figure_draw: B.figure,
      book_set_down: B.bookLand, dial_wind: B.dial1, dial_return: B.dial1Return, dial_wind_2: B.dial2, dial_return_2: B.dial2Return,
      wheel_spin_up: B.wheelXfade[0], transition_point: B.transition, transition_cx: W / 2, transition_cy: H / 2,
    };

    // ---------------- lighting: warm tungsten key (shadows), cool fill, rim; a tungsten desk spot; the point's own light ----------------
    const L = rig(g, { key: [2.0, 3.6, 2.6], keyI: 2.5, keyColor: 0xffd3a2, fill: [-3.5, 2.2, 2.5], fillI: 0.32, fillColor: 0xbfd3ff, rim: [-1.2, 3.2, -3.5], rimI: 1.1, rimColor: 0xfff4e6, ambient: 0.1 });
    const sc = L.key.shadow.camera; sc.left = sc.bottom = -2.4; sc.right = sc.top = 2.4; sc.near = 0.5; sc.far = 14; sc.updateProjectionMatrix(); L.key.shadow.bias = -0.0004; L.key.shadow.normalBias = 0.015;
    const spot = new THREE.SpotLight(0xffc48a, 4.5, 7, deg(42), 0.65, 1.3); spot.position.set(0.7, 2.3, 0.9); spot.target.position.set(0.3, 0.8, 0.0); g.add(spot, spot.target);

    // ---------------- the room ----------------
    g.add(floor(30, mat.graphite({ roughness: 0.32, metalness: 0.3 })));
    const wall = plane(16, 6, MAT.wall); wall.position.set(0, 3, -2.8); g.add(wall);
    const con = makeConsole(); g.add(con.group); this.con = con;
    const slope = con.slope, upright = con.upright;

    // ---------------- toggle row + lamps ----------------
    this.toggles = []; this.lamps = [];
    const tU = (i) => -1.25 + 0.11 * i;
    const onAt = { 0: -Infinity, 1: -Infinity, 6: -Infinity, 2: B.click1, 3: B.click2, 4: B.click3 }; // others stay off
    for (let i = 0; i < 8; i++) {
      const tg = makeToggle(); tg.position.set(tU(i), 0.12, 0); slope.add(tg); tg.userData.onTime = onAt[i] ?? Infinity; this.toggles.push(tg);
      const lp = makeLamp(); lp.position.set(tU(i), 0.225, 0); slope.add(lp); lp.userData.onTime = onAt[i] ?? Infinity; this.lamps.push(lp);
    }
    // thin engraved line under the row (ivory)
    const rule = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.0025), new THREE.MeshBasicMaterial({ color: 0xcfc8b8 })); rule.position.set(tU(3.5), 0.08, 0.0008); slope.add(rule);
    // ---------------- knobs ----------------
    this.knobs = [];
    [-0.36, -0.2, -0.04].forEach((u, i) => { const k = makeKnob(); k.position.set(u, 0.165, 0); k.rotation.z = deg(-60 + 45 * i); slope.add(k); this.knobs.push(k); });
    // ---------------- the two identical levers (gear / flaps) ----------------
    this.lever = { gear: makeLever(), flaps: makeLever() };
    this.leverPos = { gear: { from: [0.30, 0.31], to: [0.22, 0.13] }, flaps: { from: [0.42, 0.31], to: [0.56, 0.13] } };
    for (const k of ['gear', 'flaps']) { const lv = this.lever[k]; lv.position.set(...this.leverPos[k].from, 0); slope.add(lv); }
    // ---------------- big quadrant lever ----------------
    this.big = makeBigLever(); this.big.position.set(0.95, 0.2, 0); slope.add(this.big);
    // ---------------- gauges on the upright ----------------
    this.gauges = [];
    [[-1.22, 0.062], [-0.97, 0.062], [-0.72, 0.062], [-0.47, 0.062], [0.3, 0.1], [0.72, 0.1], [1.12, 0.062], [1.37, 0.062]].forEach(([u, r], i) => { const ga = makeGauge(r, { big: r > 0.08 }); ga.position.set(u, 0.29, 0); upright.add(ga); ga.userData.i = i; this.gauges.push(ga); });
    // ---------------- telephone, book, stool ----------------
    this.phone = makePhone(); this.phone.position.set(1.15, CONSOLE.deskY, 0.17); this.phone.rotation.y = deg(-6); g.add(this.phone);
    this.book = makeBook(); this.bookRest = vec(0.40, CONSOLE.deskY, 0.185); this.book.position.copy(this.bookRest); this.book.rotation.y = deg(-12); this.book.visible = false; g.add(this.book);
    this.stool = makeStool(); this.stool.position.set(0.39, 0, 0.88); g.add(this.stool);

    // ---------------- the amber point ----------------
    this.point = new AmberPoint(0.011, { lightIntensity: 2.5, lightDistance: 2.2 }); g.add(this.point.group);
    // the halos sit millimetres in front of tilted panels: never depth-clip them (otherwise the quad cuts a hard line into the panel)
    this.point.halo.material.depthTest = false; this.point.halo2.material.depthTest = false; this.point.halo.renderOrder = this.point.halo2.renderOrder = 10;

    // ---------------- world anchors (computed once) ----------------
    g.updateMatrixWorld(true);
    const n = vec(0, Math.cos(CONSOLE.slopeAngle), Math.sin(CONSOLE.slopeAngle)); // slope face normal
    this.slopeN = n;
    this.lampW = slope.localToWorld(vec(tU(2), 0.225, 0.014));
    const gripFrom = (k) => slope.localToWorld(vec(this.leverPos[k].from[0], this.leverPos[k].from[1], 0.106));
    const gripTo = (k) => slope.localToWorld(vec(this.leverPos[k].to[0], this.leverPos[k].to[1], 0.106));
    this.hoverLevers = gripFrom('gear').add(gripFrom('flaps')).multiplyScalar(0.5).add(vec(0, 0.075, 0.06));
    this.hoverGear = gripTo('gear').add(vec(0, 0.065, 0.045));
    this.hoverBook = this.bookRest.clone().add(vec(-0.02, 0.17, -0.05));
    this.dialC = this.phone.userData.dial.getWorldPosition(new THREE.Vector3());
    this.dialN = vec(0, 0, 1).applyQuaternion(this.phone.userData.dial.getWorldQuaternion(new THREE.Quaternion()));
    // the operator (profile diagram at x = xs, facing -z)
    const xs = 0.39; this.figure = { xs, hip: vec(xs, 0.475, 0.80), shoulder: vec(xs, 0.99, 0.70), head: vec(xs, 1.165, 0.66), headR: 0.095, knee: vec(xs, 0.49, 0.38), ankle: vec(xs, 0.02, 0.41), toe: vec(xs, 0.0, 0.25), reach: 0.68, upper: 0.33, fore: 0.36 };

    // ---------------- camera keyframes ----------------
    const levMid = gripFrom('gear').add(gripFrom('flaps')).multiplyScalar(0.5);
    const K = (t, pos, look, fov = 35) => ({ t, pos, look, fov });
    const lampCam = this.lampW.clone().addScaledVector(n, 0.52).add(vec(0.15, -0.02, 0.03));
    this.keys = [
      K(start, lampCam, this.lampW.clone(), 35),
      K(start + 1.7, lampCam, this.lampW.clone(), 35),
      K(B.bigLever + 0.3, vec(-0.42, 1.42, 1.3), vec(-0.3, 1.0, -0.15), 35),
      K(B.camLevers, vec(0.56, 1.3, 0.62), levMid.clone().add(vec(-0.01, -0.03, 0)), 35),
      K(B.camWide - 0.1, vec(0.56, 1.3, 0.62), levMid.clone().add(vec(-0.01, -0.03, 0)), 35),
      K(B.camWide + 1.4, vec(2.0, 1.55, 2.35), vec(0.32, 0.9, 0.22), 36),
      K(B.camBook, vec(2.0, 1.55, 2.35), vec(0.32, 0.9, 0.22), 36),
      K(B.camBook + 1.25, vec(0.1, 1.32, 0.86), this.bookRest.clone().add(vec(-0.01, 0.015, 0.0)), 35),
      K(B.camPhone, vec(0.1, 1.32, 0.86), this.bookRest.clone().add(vec(-0.01, 0.015, 0.0)), 35),
      K(B.camPhone + 1.2, this.dialC.clone().addScaledVector(this.dialN, 0.7).add(vec(-0.26, 0.04, 0.0)), this.dialC.clone().add(vec(0, 0.015, 0)), 35),
      K(B.camDial, this.dialC.clone().addScaledVector(this.dialN, 0.7).add(vec(-0.26, 0.04, 0.0)), this.dialC.clone().add(vec(0, 0.015, 0)), 35),
      K(B.camDial + 2.8, this.dialC.clone().addScaledVector(this.dialN, 0.158), this.dialC.clone(), 35),
      K(end + 1, this.dialC.clone().addScaledVector(this.dialN, 0.158), this.dialC.clone(), 35),
    ];
  },

  camPose(t) {
    const ks = this.keys; let i = 0; while (i < ks.length - 2 && t >= ks[i + 1].t) i++;
    const a = ks[i], b = ks[i + 1]; const k = easeInOutSine(seg(t, a.t, b.t));
    return { pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: lerp(a.fov, b.fov, k) };
  },

  // finger-wheel angle (radians, about the dial normal; negative = clockwise wind)
  wheelAngle(t) {
    const B = this.B; const travel1 = -(DIAL.hole0 + DIAL.step * 2 - DIAL.stop); // from hole "3" to the stop
    if (t < B.dial1) return 0;
    if (t < B.dial1Hold) return travel1 * easeInOut(seg(t, B.dial1, B.dial1Hold));
    if (t < B.dial1Return) return travel1;
    if (t < B.dial1End) return travel1 * (1 - seg(t, B.dial1Return, B.dial1End));
    if (t < B.dial2) return 0;
    if (t < B.dial2Hold) return travel1 * easeInOut(seg(t, B.dial2, B.dial2Hold));
    if (t < B.dial2Return) return travel1;
    // the spring return never stops: it becomes the rotating input wheel (accelerating gently)
    const tau = t - B.dial2Return; return travel1 + deg(170) * tau + deg(38) * tau * tau;
  },

  // the amber point's world position + scale as a pure function of t
  pointPose(t, gripGear) {
    const B = this.B; const arc = (a, b, k, lift = 0.1) => a.clone().lerp(b, easeInOut(k)).add(vec(0, Math.sin(k * Math.PI) * lift, 0));
    const bob = (amp) => vec(0, Math.sin(t * 1.7) * amp, 0);
    const holeW = this.phone.userData.holeMarker.getWorldPosition(V3).clone();
    if (t < B.pointLand) { const k = seg(t, this.start, B.pointLand); return { p: this.lampW.clone().addScaledVector(this.slopeN, 0.05 * (1 - easeOut(k))), s: lerp(1.6, 1.0, easeOut(k)), i: 1.0 }; }
    if (t < B.pointLeaveLamp) return { p: this.lampW.clone(), s: 1.0, i: 1.0 };
    if (t < B.camLevers - 0.2) { const k = seg(t, B.pointLeaveLamp, B.camLevers - 0.2); return { p: arc(this.lampW, this.hoverLevers, k, 0.1), s: lerp(1.0, 0.8, k), i: 1.0 }; }
    if (t < B.slide) return { p: this.hoverLevers.clone().add(bob(0.006)), s: 0.8, i: 1.0 };
    const gearHover = gripGear.clone().add(vec(0, 0.065, 0.045));
    if (t < B.slide + 1.3) { const k = seg(t, B.slide, B.slide + 1.3); return { p: arc(this.hoverLevers, gearHover, k, 0.03), s: lerp(0.8, 1.1, k), i: 1.0 }; }
    if (t < B.camBook) return { p: gearHover.add(bob(0.006)), s: 1.1, i: 1.0 };
    if (t < B.camBook + 1.1) return { p: arc(this.hoverGear, this.hoverBook.clone().add(vec(0, 0.1, 0)), seg(t, B.camBook, B.camBook + 1.1), 0.12), s: 1.1, i: 1.0 };
    if (t < B.bookLand) return { p: this.hoverBook.clone().add(vec(0, 0.1 * (1 - easeInOut(seg(t, B.bookDrop, B.bookLand))), 0)), s: 1.1, i: 1.0 };
    if (t < B.camPhone) return { p: this.hoverBook.clone().add(bob(0.005)), s: 1.1, i: 1.0 };
    if (t < B.camPhone + 1.0) { const k = seg(t, B.camPhone, B.camPhone + 1.0); return { p: arc(this.hoverBook, holeW, k, 0.12), s: lerp(1.1, 0.42, easeInOut(k)), i: 1.0 }; }
    const s = lerp(0.42, 0.33, ease(t, B.camDial, B.camDial + 2.8));
    return { p: holeW, s, i: 1.0 };
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera;
    stage.setBackground(PALETTE.graphite); stage.setFog(PALETTE.graphite, 1.6, 9.5); stage.setExposure(1.0);
    const cp = this.camPose(t); cam.position.copy(cp.pos); cam.fov = cp.fov; cam.updateProjectionMatrix(); cam.lookAt(cp.look);

    // toggles & lamps
    this.toggles.forEach((tg, i) => { const k = snap(seg(t, tg.userData.onTime, tg.userData.onTime + 0.14)); tg.userData.pivot.rotation.x = lerp(deg(28), deg(-20), k); });
    this.lamps.forEach((lp, i) => { const on = t >= lp.userData.onTime + 0.07; lp.userData.lens.material = on ? MAT.lensOn : MAT.lensOff; if (i === 2) { lp.userData.lens.visible = t >= B.pointLeaveLamp; lp.userData.lens.material = MAT.lensOff; } });
    // gauges: slow drift; the big ones respond to the big lever
    const bigK = ease(t, B.bigLever + 0.15, B.bigLever + 1.6, easeOut);
    this.gauges.forEach((ga) => { const i = ga.userData.i; const base = 0.28 + 0.36 * noise1(t * 0.22 + i * 3.7); const v = ga.position.x > 0.2 && ga.position.x < 0.9 ? base * 0.55 + 0.3 * bigK : base; ga.userData.needle.rotation.z = needleAngle(clamp(v)); });
    this.big.userData.pivot.rotation.x = lerp(deg(30), deg(-22), easeInOut(seg(t, B.bigLever, B.bigLever + 0.9)));
    // the two levers: wrong pull + return; morph; slide
    const wrong = easeInOut(seg(t, B.wrongLever, B.wrongLever + 0.4)) * (1 - easeInOut(seg(t, B.leverBack, B.leverBack + 0.7)));
    this.lever.flaps.userData.pivot.rotation.x = lerp(deg(26), deg(-26), wrong);
    this.lever.gear.userData.pivot.rotation.x = deg(26);
    const m = ease(t, B.morph, B.morph + 0.8);
    for (const k of ['gear', 'flaps']) {
      const lv = this.lever[k], ud = lv.userData; ud.ball.scale.setScalar(Math.max(0.001, 1 - easeIn(m)));
      const coded = k === 'gear' ? ud.wheel : ud.flap; coded.scale.setScalar(Math.max(0.001, easeOut(m)));
      const t0 = B.slide + (k === 'gear' ? 0 : 0.3); const sk = easeInOut(seg(t, t0, t0 + 1.1)); const P = this.leverPos[k];
      lv.position.set(lerp(P.from[0], P.to[0], sk), lerp(P.from[1], P.to[1], sk), 0);
    }
    // book: descends and sets down
    const bk = seg(t, B.bookDrop, B.bookLand); this.book.visible = t >= B.bookDrop;
    this.book.position.copy(this.bookRest).add(vec(0, 0.2 * (1 - easeOut(bk)), 0)); this.book.rotation.set(0, deg(-12) - deg(6) * (1 - easeOut(bk)), deg(-4) * (1 - easeOut(bk)));
    // finger wheel
    this.phone.userData.wheel.rotation.z = this.wheelAngle(t);
    this.phone.updateMatrixWorld(true);
    // the point
    const gripGear = this.lever.gear.userData.gripG.getWorldPosition(V2); this.group.updateMatrixWorld(true);
    const pp = this.pointPose(t, gripGear);
    this.point.group.position.copy(pp.p); this.point.setScale(pp.s).setIntensity(pp.i).pulse(t, 0.06, 1.3);
    this.point.light.intensity = 1.15 * pp.i; // gentler than the default: the panel is close and would blow out
    this.point.group.visible = t < B.wheelXfade[1];
  },

  // project a world point to overlay pixels
  proj(v, cam) { const p = V.copy(v).project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; },

  drawFigure(ctx, t, cam, alpha, gripGear) {
    const F = this.figure, B = this.B; if (alpha <= 0) return;
    const P = (v) => this.proj(v, cam);
    // reach-limited hand: the arm goes toward the grip but stops at the reach radius
    const toGrip = gripGear.clone().sub(F.shoulder); const d = Math.min(toGrip.length(), F.upper + F.fore - 0.015); const hand = F.shoulder.clone().addScaledVector(toGrip.normalize(), d);
    const a = F.upper, b = F.fore, x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    const axis = hand.clone().sub(F.shoulder).normalize(); const down = vec(0, -1, 0); const perp = down.sub(axis.clone().multiplyScalar(down.dot(axis))).normalize();
    const elbow = F.shoulder.clone().addScaledVector(axis, x).addScaledVector(perp, h);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = PALETTE.ivory; ctx.fillStyle = PALETTE.ivory; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const draw = (pts) => { ctx.beginPath(); pts.forEach((v, i) => { const [sx, sy] = P(v); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke(); };
    const k = ease(t, B.figure, B.figure + 0.9, easeOut); // draw-on
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const hb = F.head.clone().add(vec(0, -F.headR, 0));
    draw([F.toe, F.ankle, F.knee, F.hip, F.shoulder, hb]);
    draw([F.shoulder, elbow, hand]);
    const [hx, hy] = P(F.head); const [tx, ty] = P(F.head.clone().add(vec(0, F.headR, 0))); const hr = Math.hypot(tx - hx, ty - hy);
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.stroke();
    for (const j of [F.shoulder, elbow, F.hip, F.knee]) { const [jx, jy] = P(j); ctx.beginPath(); ctx.arc(jx, jy, 3.2, 0, Math.PI * 2); ctx.fill(); }
    // reach arcs (in the operator's profile plane, centred on the shoulder)
    const sweep = ease(t, B.figure + 0.5, B.figure + 1.5, easeInOut);
    const arcPts = (r, a0, a1, nn = 40) => { const out = []; for (let i = 0; i <= nn; i++) { const th = lerp(a0, a1, i / nn); out.push(F.shoulder.clone().add(vec(0, Math.sin(th) * r, -Math.cos(th) * r))); } return out; };
    ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 1.6;
    if (sweep > 0) { draw(arcPts(F.reach, deg(-80), lerp(deg(-80), deg(70), sweep))); ctx.setLineDash([6, 8]); ctx.globalAlpha *= 0.55; draw(arcPts(F.reach * 0.68, deg(-80), lerp(deg(-80), deg(70), sweep))); ctx.setLineDash([]); }
    ctx.restore(); ctx.restore();
    return { hand, elbow };
  },

  draw2d(ctx, t, stage) {
    const B = this.B, cam = stage.camera, start = this.start, end = this.end;
    const P = (v) => this.proj(v, cam);
    const gripW = { gear: this.lever.gear.userData.gripG.getWorldPosition(new THREE.Vector3()), flaps: this.lever.flaps.userData.gripG.getWorldPosition(new THREE.Vector3()) };
    // ---- lever labels, identical-grips dimension, measurement guides ----
    const la = fadeIO(t, B.leverLabels, B.figureOut + 0.2, 0.5, 0.5);
    if (la > 0) {
      const dimA = fadeIO(t, B.dimIdent[0], B.dimIdent[1], 0.5, 0.5);
      const pts = { gear: P(gripW.gear), flaps: P(gripW.flaps) };
      for (const k of ['gear', 'flaps']) { const [x, y] = pts[k]; const lift = k === 'gear' ? 0 : 0; caps(ctx, k, x, y - 44 - lift, { size: 22, color: PALETTE.cyan, align: 'center', tracking: 3.5, alpha: la }); ctx.save(); ctx.globalAlpha = la * 0.8; ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y - 36); ctx.lineTo(x, y - 22); ctx.stroke(); ctx.restore(); }
      if (dimA > 0) { const yd = Math.max(pts.gear[1], pts.flaps[1]) + 120; ctx.save(); ctx.globalAlpha = dimA * 0.5; ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 1; ctx.setLineDash([3, 5]); for (const k of ['gear', 'flaps']) { ctx.beginPath(); ctx.moveTo(pts[k][0], pts[k][1] + 40); ctx.lineTo(pts[k][0], yd - 8); ctx.stroke(); } ctx.restore(); dimension(ctx, pts.gear[0], yd, pts.flaps[0], yd, 'IDENTICAL GRIPS', { alpha: dimA, size: 18 }); }
    }
    // ---- the operator diagram + reach arcs + measurement guides (wide shot) ----
    const fa = fadeIO(t, B.figure, B.figureOut + 0.5, 0.4, 0.5);
    if (fa > 0) {
      this.drawFigure(ctx, t, cam, fa, gripW.gear);
      const da = fadeIO(t, B.figure + 1.5, B.figureOut + 0.5, 0.5, 0.5);
      if (da > 0) {
        const F = this.figure; const [sx, sy] = P(F.shoulder), [gx, gy] = P(gripW.gear);
        dimension(ctx, sx, sy, gx, gy, 'REACH', { alpha: da, size: 18 });
        const [fx, fy] = P(vec(F.xs, 0, 0.9)), [hx, hy] = P(vec(F.xs, F.head.y + F.headR, 0.9));
        dimension(ctx, fx, fy, hx, hy, 'HEIGHT', { alpha: da * 0.9, size: 18 });
      }
    }
    // ---- caps labels (one at a time, top-left) ----
    const label = (str, t0, t1) => { const a = fadeIO(t, t0, t1, 0.5, 0.5); if (a > 0) { const rise = (1 - easeOut(seg(t, t0, t0 + 0.6))) * 8; caps(ctx, str, 120, 132 + rise, { alpha: a }); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = PALETTE.amber; ctx.fillRect(120, 146 + rise, 28 * easeOut(seg(t, t0, t0 + 0.8)), 2); ctx.restore(); } };
    label('HUMAN FACTORS', B.humanFactors, B.humanFactors + 3.2);
    label('ERGONOMICS', B.ergonomics, B.dreyfuss + 0.7);
    label('DESIGNING FOR PEOPLE — 1955', B.designing, B.designing + 4.7);
    // ---- lower thirds ----
    const dA = fadeIO(t, B.dreyfuss, B.dreyfuss + 5.6, 0.5, 0.6);
    if (dA > 0) lowerThird(ctx, { title: 'HENRY DREYFUSS', sub: 'Industrial designer · Designing for People, 1955', source: 'Book reconstruction · original cover not reproduced', alpha: dA, reveal: seg(t, B.dreyfuss, B.dreyfuss + 1.0) });
    const pA = fadeIO(t, B.phoneLabel, B.camDial + 0.4, 0.5, 0.6);
    if (pA > 0) lowerThird(ctx, { title: 'Rotary desk telephone, mid-20th century', sub: 'Illustrative reconstruction · no specific model depicted', alpha: pA, reveal: seg(t, B.phoneLabel, B.phoneLabel + 1.0) });
    // ---- provenance badge while any reconstruction is on screen ----
    badge(ctx, BADGE.RECON, W - 120, H - 70, fadeIO(t, start + 0.8, B.wheelXfade[0] + 0.5, 0.5, 0.5), { align: 'right' });
    // ---- the dial becomes an abstract rotating input wheel ----
    const xf = ease(t, B.wheelXfade[0], B.wheelXfade[1]);
    if (xf > 0) {
      dip(ctx, xf, PALETTE.graphite);
      const c = P(this.dialC); const cx = c[0], cy = c[1];
      const wheel = this.phone.userData.wheel; const holes = [];
      for (let i = 0; i < 10; i++) { const a = DIAL.hole0 + DIAL.step * i; holes.push(P(wheel.localToWorld(vec(Math.cos(a) * DIAL.holeRad, Math.sin(a) * DIAL.holeRad, 0.004)))); }
      const R = holes.reduce((s, h) => s + Math.hypot(h[0] - cx, h[1] - cy), 0) / 10;
      ctx.save(); ctx.globalAlpha = xf; ctx.strokeStyle = PALETTE.ivory; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = xf * 0.85; ctx.lineWidth = 1.5;
      for (const h of holes) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(h[0], h[1]); ctx.stroke(); }
      ctx.globalAlpha = xf; ctx.beginPath(); ctx.arc(cx, cy, R * 0.09, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = xf * 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      // the point rides the rim, then spirals into the hub
      const hp = P(this.phone.userData.holeMarker.getWorldPosition(new THREE.Vector3()));
      const sp = easeIn(seg(t, B.spiral[0], B.spiral[1]));
      const px = lerp(hp[0], cx, sp), py = lerp(hp[1], cy, sp);
      amberDot(ctx, px, py, lerp(14, 22, sp), Math.min(1, xf * 1.5), { glow: 7 });
    }
    // ---- hand-off blooms ----
    bloom(ctx, 1 - seg(t, start, start + 0.8));
    bloom(ctx, seg(t, end - 0.7, end));
  },
};
