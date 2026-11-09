// SCENE 03 — WHEN COMPUTERS SPOKE IN COMMANDS. Tape reel → 1960s computer room → punched cards → a green-phosphor
// terminal (generic composite) that rejects the user → the point escapes the cursor → Sketchpad: round CRT + light pen.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, hash, noise1, deg } from '../lib/util.js';
import { text, caps, lowerThird, yearStamp, badge, BADGE, bloom, dip, amberDot, cursor } from '../lib/gfx.js';
import { rig, AmberPoint, mat, box } from '../lib/props.js';
import { makeRoomShell, makeCabinet, makeTapeDrive, makeCardReader, makeTerminal, makeDesk, makeDeck, makeSketchpadConsole, drawTerminal, drawCRT, CRT_SIZE } from './s03_commands.parts.js';

const CH = 3;
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const POSE = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 };
const SK_OFFSET = new THREE.Vector3(40, 0, 0); // the Sketchpad set lives far from the room

export default {
  id: 's03', title: 'When Computers Spoke in Commands',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.55, grain: 0.045, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    const s = (n, d) => T.sent(CH, n, d).start;
    const start = this.start, end = this.end;
    // ---- beats ----
    const B = (this.B = {
      start, end,
      pull0: start + 0.8, pull1: s('punched cards', 63.4) - 0.2,
      cards0: s('punched cards', 63.4), cards1: s('punched cards', 63.4) + 2.2,
      term0: s('punched cards', 63.4) + 2.2, termFull: s('punched cards', 63.4) + 3.3,
      type1: s('Without knowing', 66.9) - 0.45,
      imagine: s('imagined something', 69.7), seen: s('seen and moved', 72.0),
      dissolve0: s('In 1963', 75.7) - 0.15, dissolve1: s('In 1963', 75.7) + 0.75,
      year: s('In 1963', 75.7),
    });
    B.draw1 = B.dissolve1 + 0.15; B.draw1End = B.draw1 + 1.4;
    B.draw2 = B.draw1End + 0.35; B.draw2End = B.draw2 + 1.2;
    B.snap = B.draw2End + 0.25; B.snapEnd = B.snap + 0.45;
    B.dot = end - 1.95; B.cursor = end - 1.25; B.out = end - 0.7;

    // ---- typing schedule: "LIST FILES" ⏎ → error; "HEL" then the user stops (locked out) ----
    const script = [];
    const keys = [];
    const typeStr = (str, t0, cps = 0.088) => { let t = t0; for (const ch of str) { t += cps + (hash(keys.length + 3.7) - 0.5) * 0.028; script.push({ t, ch }); keys.push(t); } return t; };
    let tt = typeStr('LIST FILES', B.type1); tt += 0.16; script.push({ t: tt, ch: '\n' }); keys.push(tt);
    const err1 = tt + 0.28; script.push({ t: err1, err: '? UNRECOGNIZED COMMAND' });
    tt = typeStr('HEL', err1 + 0.62); // the hesitation: typing stops mid-word
    this.script = script; this.typingStops = tt;
    this.cues = { tape_reel_spin: start + 0.05, card_shuffle: B.cards0 + 0.25, card_feed_end: B.cards1 };
    keys.forEach((k, i) => { this.cues['key_strike_' + (i + 1)] = +k.toFixed(3); });
    this.cues.error_beep = +err1.toFixed(3);
    this.cues.point_emerges = +(B.imagine + 0.3).toFixed(3);
    this.cues.terminal_dissolve = +B.dissolve0.toFixed(3);
    this.cues.lightpen_draw_1 = +B.draw1.toFixed(3); this.cues.lightpen_draw_2 = +B.draw2.toFixed(3); this.cues.lightpen_draw_3 = +B.snap.toFixed(3);
    this.cues.cursor_appears = +B.cursor.toFixed(3);
    this.cues.transition_point = +B.out.toFixed(3);

    // ================= the computer room =================
    const room = (this.room = new THREE.Group()); g.add(room);
    rig(room, { key: [2.6, 5.2, 2.4], keyI: 1.5, keyColor: 0xe2efe9, fill: [-4, 3, 3], fillI: 0.55, fillColor: 0xbfd6e6, rim: [0, 3, -5], rimI: 0.5, rimColor: 0xd8f0e8, ambient: 0.3 });
    makeRoomShell(room);
    // back row: three tape drives (left) + plain cabinets (right)
    this.reels = [];
    [-3.3, -2.4, -1.5].forEach((x, i) => { const td = makeTapeDrive(i); td.group.position.set(x, 0, -3.9); room.add(td.group); this.reels.push(...td.reels.map((r, j) => ({ r, dir: j ? -1 : 1, speed: 1.0 + 0.35 * hash(i + j * 2.1) }))); });
    [-0.4, 0.4, 1.2, 2.0, 2.8, 3.6].forEach((x, i) => { const c = makeCabinet({ seed: i + 1, w: 0.74, lamps: i !== 2 }); c.position.set(x, 0, -3.9); room.add(c); });
    // a second, shorter row at the right side wall (depth cue)
    [-2.8, -1.4, 0.0].forEach((z, i) => { const c = makeCabinet({ seed: 10 + i, w: 0.7, h: 1.7 }); c.position.set(4.6, 0, z); c.rotation.y = -Math.PI / 2; room.add(c); });
    // card reader
    this.reader = makeCardReader(); this.reader.group.position.set(1.9, 0, -1.35); room.add(this.reader.group);
    // desk with the terminal and a card deck
    const desk = makeDesk(); desk.position.set(-0.7, 0, -0.45); room.add(desk);
    this.term = makeTerminal(); this.term.group.position.set(-1.0, 0.74, -0.45); room.add(this.term.group);
    const deck = makeDeck(0.045); deck.position.set(-0.05, 0.74, -0.42); deck.rotation.y = deg(-14); room.add(deck);
    const deck2 = makeDeck(0.02); deck2.position.set(-0.22, 0.74, -0.2); deck2.rotation.y = deg(8); room.add(deck2);
    // screen glow light + a cool lamp over the card reader
    this.termLight = new THREE.PointLight(0x55ff88, 0, 1.4, 1.8); this.termLight.position.set(-1.0, 1.05, -0.05); room.add(this.termLight);
    const readerLight = new THREE.PointLight(0xdff2ea, 0.9, 3.5, 1.6); readerLight.position.set(1.7, 2.3, -0.6); room.add(readerLight);
    this.termKey = '';

    // the amber point: arrives inside the reel hub, then lives on the overlay, then at the light-pen tip
    this.point = new AmberPoint(0.03, { lightIntensity: 2, lightDistance: 3 }); this.point.setIntensity(0); g.add(this.point.group);

    // ================= the Sketchpad set =================
    const sk = (this.sk = new THREE.Group()); sk.position.copy(SK_OFFSET); g.add(sk);
    rig(sk, { key: [1.6, 3.2, 2.2], keyI: 1.2, keyColor: 0xdfeee8, fill: [-2.5, 2, 1.5], fillI: 0.45, fillColor: 0xb9cfe0, rim: [0, 2.5, -3], rimI: 0.7, rimColor: 0xe0f3ec, ambient: 0.22 });
    const skFloor = box(8, 0.02, 8, mat.std(0x2f3836, { roughness: 0.35, metalness: 0.15 })); skFloor.position.y = -0.01; sk.add(skFloor);
    const skWall = box(8, 3.2, 0.1, mat.std(0x5c6a66, { roughness: 0.95 })); skWall.position.set(0, 1.6, -2.4); sk.add(skWall);
    const sideCab = makeCabinet({ seed: 21, w: 0.7, h: 1.8, lamps: false }); sideCab.position.set(-2.0, 0, -1.7); sideCab.rotation.y = deg(30); sk.add(sideCab);
    const td2 = makeTapeDrive(7); td2.group.position.set(1.5, 0, -1.6); td2.group.rotation.y = deg(-20); sk.add(td2.group);
    this.console = makeSketchpadConsole(); sk.add(this.console.group);
    this.crtLight = new THREE.PointLight(0xcfeee0, 0.6, 1.6, 1.8); this.crtLight.position.set(0, 1.35, 0.35); sk.add(this.crtLight);
    // a small instance of the point for the light-pen tip (same identity, closer scale)
    this.point2 = new AmberPoint(0.011, { lightIntensity: 0.6, lightDistance: 0.7 }); this.point2.setIntensity(0); sk.add(this.point2.group);
    this.crtKey = '';
    g.updateMatrixWorld(true);
    this.crtCenter = this.console.screen.mesh.getWorldPosition(new THREE.Vector3());
    // the 2D screen position of the final point/cursor (for the bloom) — static, from the pose at the hand-off
    this.cursor2d = this.project2d(this.skCorner(B.out), this.poseAt(B.out));
    this.cues.transition_cx = Math.round(this.cursor2d.x); this.cues.transition_cy = Math.round(this.cursor2d.y);
  },

  // ---------- terminal state ----------
  termState(t) {
    const lines = ['READY', '>']; let cur = 1; let col = 1;
    for (const e of this.script) {
      if (t < e.t) break;
      if (e.err) { lines.push(e.err); lines.push('>'); cur = lines.length - 1; col = 1; }
      else if (e.ch === '\n') { /* return: handled by the error line */ }
      else { lines[cur] += e.ch; col = lines[cur].length; }
    }
    const blink = Math.floor((t - this.start) * 2.4) % 2 === 0;
    return { lines, cursor: { line: cur, col, on: blink }, key: lines.join('|') + (blink ? '*' : '') };
  },

  // ---------- Sketchpad state (corner positions, drawn edges, pen) ----------
  skState(t) {
    const B = this.B;
    const A = { x: -0.2, y: -0.17 }, Bp = { x: 0.2, y: -0.17 }, C = { x: 0.2, y: 0.19 }, D = { x: -0.2, y: 0.19 };
    const edges = seg(t, B.draw1, B.draw1End) * 4;
    // drag corner C outward (resize), then the constraint snaps B and D to it
    const drag = easeInOut(seg(t, B.draw2, B.draw2End));
    C.x = lerp(0.2, 0.3, drag); C.y = lerp(0.19, 0.27, drag);
    const snap = easeOut(seg(t, B.snap, B.snap + 0.3));
    Bp.x = lerp(0.2, C.x, snap); D.y = lerp(0.19, C.y, snap);
    const pts = [A, Bp, C, D];
    // pen position
    let pen = null, lift = 0;
    if (t < B.draw1) { const k = easeInOut(seg(t, B.dissolve0, B.draw1)); pen = { x: lerp(0, A.x, k), y: lerp(0, A.y, k) }; lift = 0.012 * (1 - k); }
    else if (t < B.draw1End) { const e = Math.min(3, Math.floor(edges)), k = edges - e; const a = pts[e], b = pts[(e + 1) % 4]; pen = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) }; }
    else if (t < B.draw2) { const k = easeInOut(seg(t, B.draw1End, B.draw2)); pen = { x: lerp(A.x, 0.2, k), y: lerp(A.y, 0.19, k) }; lift = 0.01 * Math.sin(k * Math.PI); }
    else if (t < B.dot) { pen = { x: C.x, y: C.y }; }
    else { const k = easeInOut(seg(t, B.dot, B.dot + 0.9)); pen = { x: C.x + 0.55 * k, y: C.y - 0.35 * k }; lift = 0.05 * k; }
    const flash = fadeIO(t, B.snap + 0.1, B.snap + 0.6, 0.06, 0.4);
    const dot = ease(t, B.dot, B.dot + 0.6, easeOut) * (1 - ease(t, B.cursor + 0.1, B.cursor + 0.5, easeInOut));
    return { pts, edges, pen, lift, flash, dot, key: `${edges.toFixed(2)}|${C.x.toFixed(3)}|${C.y.toFixed(3)}|${snap.toFixed(2)}|${pen ? pen.x.toFixed(3) + ',' + pen.y.toFixed(3) : ''}|${flash.toFixed(2)}|${dot.toFixed(2)}` };
  },
  // world position of corner C (the last drawn point) on the CRT at time t
  skCorner(t) {
    const st = this.skState(t); const C = st.pts[2];
    return this.console.screen.mesh.localToWorld(new THREE.Vector3(C.x * CRT_SIZE, C.y * CRT_SIZE, 0.004));
  },

  // ---------- camera ----------
  poseAt(t) {
    const B = this.B;
    const reel = new THREE.Vector3(-3.3 - 0.2, 1.56, -3.9 + 0.38 + 0.028);
    const K = [
      { t: B.start, pos: [reel.x + 0.03, reel.y + 0.01, reel.z + 0.5], look: [reel.x, reel.y, reel.z], fov: 35 },
      { t: B.pull0, pos: [reel.x + 0.03, reel.y + 0.01, reel.z + 0.5], look: [reel.x, reel.y, reel.z], fov: 35 },
      { t: B.pull1, pos: [1.9, 1.78, 2.9], look: [-0.6, 1.0, -1.8], fov: 38 },
      { t: B.cards0 + 1.0, pos: [1.28, 1.38, -0.45], look: [1.7, 1.0, -1.3], fov: 29 },
      { t: B.term0, pos: [1.32, 1.37, -0.5], look: [1.71, 1.0, -1.3], fov: 29 },
      { t: B.term0 + 0.75, pos: [-0.45, 1.12, 0.55], look: [-1.0, 0.955, -0.28], fov: 34 },
      { t: B.termFull, pos: [-1.0, 0.955, -0.28 + 0.355], look: [-1.0, 0.955, -0.28], fov: 35 },
    ];
    let pos, look, fov;
    if (t >= B.dissolve0) {
      // Sketchpad: slow push-in on the round CRT
      const k = easeInOut(seg(t, B.dissolve0, B.end));
      const c = this.crtCenter;
      pos = new THREE.Vector3(c.x + lerp(0.42, 0.34, k), c.y + lerp(0.16, 0.11, k), c.z + lerp(0.98, 0.84, k));
      look = new THREE.Vector3(c.x + 0.01, c.y + 0.0, c.z); fov = 33;
    } else {
      let i = 0; while (i < K.length - 2 && t >= K[i + 1].t) i++;
      const a = K[i], b = K[i + 1]; const k = easeInOut(seg(t, a.t, b.t));
      pos = new THREE.Vector3().fromArray(a.pos).lerp(new THREE.Vector3().fromArray(b.pos), k);
      look = new THREE.Vector3().fromArray(a.look).lerp(new THREE.Vector3().fromArray(b.look), k);
      fov = lerp(a.fov, b.fov, k);
      if (t > K[K.length - 1].t) { pos.fromArray(K[K.length - 1].pos); look.fromArray(K[K.length - 1].look); fov = K[K.length - 1].fov; }
    }
    return { pos, look, fov };
  },
  project2d(worldPt, pose) {
    const cam = new THREE.PerspectiveCamera(pose.fov, W / H, 0.05, 400); cam.position.copy(pose.pos); cam.lookAt(pose.look); cam.updateMatrixWorld(true);
    const p = worldPt.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H };
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera;
    const inSketch = t >= B.dissolve0, inTerm2d = t >= B.termFull - 0.2 && t < B.dissolve0;
    this.room.visible = !inSketch && !inTerm2d; this.sk.visible = inSketch;
    const pose = this.poseAt(t); cam.position.copy(pose.pos); cam.lookAt(pose.look); cam.fov = pose.fov; cam.updateProjectionMatrix();
    stage.setBackground(inSketch ? '#11171a' : '#141b19'); stage.setFog(inSketch ? '#11171a' : '#141b19', 5, 15);
    stage.setExposure(0.92);

    if (this.room.visible) {
      // spinning reels (take-up and supply counter-rotate; a slight start/stop rhythm like a real drive)
      for (const { r, dir, speed } of this.reels) { const w = 1 + 0.35 * Math.sin((t - B.start) * 1.7 * speed); r.rotation.z = dir * (t - B.start) * 2.3 * speed * w; }
      // card feed: the hopper empties over the "punched cards" beat
      const k = ease(t, B.cards0, B.cards1, (x) => x); const phase = k > 0 && k < 1 ? ((t - B.cards0) * 3.2) % 1 : -1;
      this.reader.setFeed(k, phase);
      // the terminal screen shows the same terminal as the overlay later (continuity through the push-in)
      const st = this.termState(t);
      if (st.key !== this.termKey) { this.termKey = st.key; drawTerminal(this.term.screen.ctx, this.term.screen.pxW, this.term.screen.pxH, { lines: st.lines, cursor: st.cursor, scale: 1024 / 1920 * 1.42, glow: 0.9 }); this.term.screen.update(); }
      this.termLight.intensity = 0.25 + 1.3 * ease(t, B.term0, B.termFull);
      // the point: arrives inside the reel hub (the bloom resolves into the spinning reel) and dissolves into it
      const reel = this.reels[0].r.getWorldPosition(V);
      const pa = 1 - ease(t, B.start + 1.0, B.start + 2.4, easeInOut);
      this.point.group.position.copy(reel).add(V2.set(0, 0, 0.06)); this.point.setIntensity(pa * 1.3).setScale(0.9).pulse(t, 0.06, 1.3); this.point.group.visible = pa > 0;
    } else if (inSketch) {
      const st = this.skState(t);
      if (st.key !== this.crtKey) { this.crtKey = st.key; drawCRT(this.console.screen.ctx, this.console.screen.pxW, { pts: st.pts, edges: st.edges, pen: st.pen && t < B.dot + 0.3 ? st.pen : null, flash: st.flash, dot: st.dot, glow: 1 }); this.console.screen.update(); }
      const p = st.pen || { x: 0, y: 0 };
      this.console.placePen(p.x, p.y, st.lift, 1);
      // the point rides at the light-pen tip (the era's mechanism), then stays on the last drawn point
      const tip = this.console.screen.mesh.localToWorld(V.set(p.x * CRT_SIZE, p.y * CRT_SIZE, 0.006));
      const corner = this.skCorner(t);
      const stay = ease(t, B.dot, B.dot + 0.4, easeInOut);
      this.point.group.visible = false;
      this.point2.group.position.copy(tip).lerp(corner, stay).sub(SK_OFFSET);
      const fadeIn = ease(t, B.dissolve0, B.dissolve1 + 0.2, easeInOut);
      const grow = ease(t, B.dot, B.dot + 0.6, easeOut);
      const toCursor = ease(t, B.cursor + 0.1, B.cursor + 0.5, easeInOut);
      this.point2.setIntensity(fadeIn * (0.6 + 0.8 * grow) * (1 - toCursor)).setScale(lerp(0.8, 1.3, grow)).pulse(t, 0.05, 1.4);
      this.point2.group.visible = this.point2.intensity > 0.01;
      this.crtLight.intensity = 0.5 + 0.35 * st.flash;
      this.cursorNow = this.project2d(corner, pose);
    } else {
      this.point.group.visible = false;
    }
    if (!inSketch) this.point2.group.visible = false;
  },

  draw2d(ctx, t) {
    const B = this.B;
    // ----- full-frame terminal (the composite) -----
    const termA = fadeIO(t, B.termFull - 0.2, B.dissolve1, 0.35, B.dissolve1 - B.dissolve0);
    if (termA > 0) {
      const st = this.termState(t);
      const dimK = ease(t, B.imagine, B.seen + 1.5, easeInOut) * 0.35;
      ctx.save();
      // the glow dissolves into a circle (the round CRT) during the hand-over
      const dk = seg(t, B.dissolve0, B.dissolve1);
      if (dk > 0) { const r = lerp(Math.hypot(W, H) * 0.6, H * 0.42, easeInOut(dk)); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.clip(); }
      ctx.globalAlpha = termA;
      drawTerminal(ctx, W, H, { lines: st.lines, cursor: st.cursor, scale: 1, glow: 1 - 0.5 * dk, dim: dimK + 0.6 * dk });
      ctx.restore();
      // the cursor becomes the amber point ("imagined something different"), then moves ("seen and moved")
      const pe = ease(t, B.imagine + 0.3, B.imagine + 1.3, easeOut);
      if (pe > 0) {
        const fs = 38, lh = 60, x0 = Math.round(W * 0.105), y0 = Math.round(H * 0.2);
        ctx.save(); ctx.font = `400 ${fs}px 'DejaVu Sans Mono'`; const cw = ctx.measureText('M').width; ctx.restore();
        const cx0 = x0 + st.cursor.col * cw + cw * 0.5, cy0 = y0 + st.cursor.line * lh - fs * 0.32;
        const mv = easeInOut(seg(t, B.seen, B.seen + 2.6));
        // a gentle arc from the prompt to the centre of the frame, leaving a fading trace (the first gesture)
        const path = (k) => ({ x: lerp(cx0, W / 2, k) + Math.sin(k * Math.PI) * 140, y: lerp(cy0, H / 2, k) - Math.sin(k * Math.PI) * 90 });
        if (mv > 0) { ctx.save(); ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.35 * termA * (1 - seg(t, B.dissolve0, B.dissolve1)); ctx.beginPath(); for (let i = 0; i <= 40; i++) { const p = path(mv * i / 40); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); ctx.restore(); }
        const p = path(mv); const shrink = 1 - 0.55 * seg(t, B.dissolve0, B.dissolve1);
        amberDot(ctx, p.x, p.y, (9 + 5 * mv) * shrink * pe, termA * pe, { glow: 7 });
      }
      // composite caption (in-frame, bottom-left)
      const ca = fadeIO(t, B.termFull + 0.4, B.dissolve0, 0.5, 0.5);
      text(ctx, 'Illustrative reconstruction · early command-line interaction · composite, not one specific machine', 120, H - 70, { size: 18, weight: 400, color: PALETTE.gray, alpha: ca });
    }
    // ----- room lower third -----
    const lt = fadeIO(t, B.pull0 + 0.9, B.cards0 + 0.5, 0.6, 0.5);
    if (lt > 0) lowerThird(ctx, { title: 'A 1960s computer room', sub: 'Tape drives · punched-card reader · keyboard terminal', source: 'Composite reconstruction after period documentation · not a photograph', alpha: lt, reveal: seg(t, B.pull0 + 0.9, B.pull0 + 1.8), width: 820 });
    // ----- Sketchpad labels: only once the narrator reaches "In 1963" -----
    const ya = fadeIO(t, B.year + 0.2, B.out + 0.1, 0.6, 0.5);
    if (ya > 0) {
      const rise = (1 - easeOut(seg(t, B.year + 0.2, B.year + 1.2))) * 14;
      yearStamp(ctx, '1963', 120, 250 + rise, ya, { size: 140 });
      caps(ctx, 'Ivan Sutherland — Sketchpad', 124, 300 + rise, { alpha: ya * seg(t, B.year + 0.5, B.year + 1.0) });
    }
    const la = fadeIO(t, B.year + 1.4, B.out + 0.1, 0.6, 0.5);
    if (la > 0) lowerThird(ctx, { title: 'Sketchpad · MIT Lincoln Laboratory TX-2', sub: 'Light pen drawing on a round CRT (reconstruction)', source: 'Reconstruction after period documentation · not a photograph', alpha: la, reveal: seg(t, B.year + 1.4, B.year + 2.3), width: 900 });
    // ----- the last point becomes an arrow cursor; bloom-out from there -----
    if (t >= B.cursor && this.cursorNow) {
      const ck = ease(t, B.cursor, B.cursor + 0.5, easeOut); const p = this.cursorNow;
      amberDot(ctx, p.x, p.y, 10 * ck, 0.9 * (1 - seg(t, B.out, B.out + 0.3)), { glow: 6 });
      cursor(ctx, p.x, p.y, { scale: 2.0 * ck, alpha: ck, color: PALETTE.amber, outline: '#2a1a08' });
    }
    // ----- provenance badge whenever a reconstruction is on screen -----
    badge(ctx, BADGE.RECON, W - 120, H - 70, fadeIO(t, B.start + 0.8, B.out + 0.2, 0.5, 0.4), { align: 'right' });
    // ----- hand-off blooms -----
    bloom(ctx, 1 - seg(t, B.start, B.start + 0.8));
    const c = this.cursorNow || this.cursor2d;
    bloom(ctx, seg(t, B.out, B.end), { cx: c.x, cy: c.y });
  },
};
