// SCENE 10 — THE NEXT INTERFACE (finale). The point becomes a voice waveform, a conversation, a spatial interface;
// collapses back to the point; travels backwards through the corridor to the same door — now with a clear pull bar —
// which opens on the first pull into soft natural light. Closing cards, fade to black by T.total.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, noise1, deg } from '../lib/util.js';
import { text, caps, badge, BADGE, bloom, dip, amberDot, titleCard } from '../lib/gfx.js';
import { AmberPoint } from '../lib/props.js';
import { buildRoom, buildCorridor, buildSpace, placePanel, wordTime, drawWave, drawCard, drawReply, drawTyping, cardWidth, replyWidth, POINT_HOME, CAM_HOME, CAM_SPATIAL } from './s10_future.parts.js';

const CH = 10;
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const IVORY_RGB = [246, 242, 232];
const CREDITS = ['Narration: Kokoro-82M neural voice (Apache-2.0)', 'Score & sound design: original, synthesized for this film', 'All historical devices shown are illustrative reconstructions', 'Rendered with Three.js in Chromium', '2026'];

export default {
  id: 's10', title: 'The Next Interface',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.5, grain: 0.03, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    // ---- beats from the narration (every time read through T) ----
    const ch = T.ch(CH); const S = (n) => T.sent(CH, n);
    const s1 = S('changing again'), sTools = S('tools will change'), sFind = S('Find the human'), sDesign = S('Design with people'), sTest = S('Test what'), sDoor = S('remember that door'), sOpens = S('finally opens'), sPoint = S('often the point');
    const sents = ch.sentences || []; const lastEnd = sents.length ? sents[sents.length - 1].end : this.end - 1;
    const B = (this.B = {});
    B.voice = this.start + 1.7;                       // point → waveform
    B.question = B.voice + 0.45; B.reply = B.voice + 1.55;
    B.thread = B.voice + 2.5;                          // waveform → conversation thread
    B.q2 = B.thread + 0.8; B.typing = B.thread + 1.15; B.a2 = B.thread + 1.85;
    B.spatial = Math.max(B.thread + 2.4, wordTime(s1, 'spatial computing') + 0.3);
    B.handUp = B.spatial + 1.2; B.grab = B.spatial + 1.9; B.moveEnd = B.grab + 1.25; B.release = B.moveEnd + 0.25;
    B.collapse = Math.max(B.release + 0.2, sTools.start + 0.1); B.collapseEnd = B.collapse + 1.3;
    B.corridor = Math.max(B.collapseEnd + 0.8, sFind.start - 0.5);
    B.credo = [sFind.start, sDesign.start, sTest.start];
    B.door = Math.max(B.corridor + 3.5, sDoor.start - 0.3);
    B.handIn = sDoor.start + 0.4; B.grip = Math.max(B.handIn + 0.6, sDoor.end + 0.05);
    B.open = Math.max(B.grip + 0.3, sOpens.start + 0.1); B.openEnd = B.open + 1.25; B.releaseDoor = B.open + 0.6;
    B.walk = B.open + 1.1; B.walkEnd = B.walk + 1.8;
    B.light0 = B.walk + 0.8; B.light1 = B.light0 + 0.8;   // ivory light fills the frame
    B.finalPoint = Math.max(B.light1 + 0.6, sPoint.start);
    // closing cards: adaptive to the room left before T.total (see report). Field: ivory for the first card,
    // graphite for the title/credits; black by T.total.
    const total = Math.max(T.total, this.end); const avail = total - B.light1; const c1s = B.light1 + 0.3;
    if (avail >= 10.5) { const c1e = Math.max(c1s + 3.4, lastEnd + 3.0); B.cards = [['people', c1s, c1e], ['title', c1e, c1e + 3.4], ['credits', c1e + 3.4, total - 0.1]]; }
    else if (avail >= 6.4) { const c1e = c1s + Math.max(3.0, (avail - 0.4) * 0.45); B.cards = [['people', c1s, c1e], ['titleCredits', c1e, total - 0.1]]; }
    else B.cards = [['people', c1s, total - 0.1]];
    B.total = total;
    this.cues = {
      voice_wave: B.voice, reply_chime: B.reply, spatial_whoosh: B.spatial + 0.1, corridor_return: B.corridor + 0.2,
      door_open_clean: B.open, footsteps_out: B.walk + 0.1, cards_in: c1s, final_point_tone: B.finalPoint,
    };

    // ---- sets ----
    Object.assign(this, buildRoom(g)); this.room.visible = false;
    Object.assign(this, buildCorridor(g));
    Object.assign(this, buildSpace(g));
    this.point = new AmberPoint(0.028, { lightIntensity: 2.5, lightDistance: 5 }); this.point.setIntensity(0); g.add(this.point.group);
  },

  // ---- first-person pose at the door ----
  doorPose(t) {
    const B = this.B;
    const arrive = easeInOut(seg(t, B.door, B.door + 1.3));
    let z = lerp(2.3, 1.78, arrive), x = lerp(0.16, 0.12, arrive);
    const lean = 0.13 * fadeIO(t, B.grip - 0.3, B.releaseDoor + 0.6, 0.5, 0.6); z += lean; // lean back on the pull
    const wk = easeInOut(seg(t, B.walk, B.walkEnd)); const walking = fadeIO(t, B.walk - 0.2, B.walkEnd + 0.3, 0.4, 0.5);
    z = lerp(z, -1.5, wk); x = lerp(x, 0.06, wk);
    const bob = Math.sin((t - B.walk) * Math.PI * 2 * 0.95) * 0.012 * walking;
    const y = 1.62 + bob + (noise1(t * 0.4) - 0.5) * 0.01;
    const pos = new THREE.Vector3(x + Math.sin((t - B.walk) * Math.PI * 0.95) * 0.01 * walking, y, z);
    const look = new THREE.Vector3(lerp(0.08, 0.0, wk), lerp(1.12, 1.5, wk) + (noise1(t * 0.3 + 7) - 0.5) * 0.02, lerp(0, -3.2, wk));
    return { pos, look };
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera;
    stage.setBackground(PALETTE.graphite);
    const phase = t < B.corridor ? 'space' : t < B.door ? 'corridor' : 'door';
    this.space.visible = phase === 'space'; this.corridor.visible = phase === 'corridor'; this.room.visible = phase === 'door';
    const lightK = seg(t, B.light0, B.light1);
    this.vignette = lerp(0.5, 0.08, lightK); this.grain = lerp(0.03, 0.016, lightK);

    if (phase === 'space') {
      cam.fov = 38; cam.updateProjectionMatrix(); stage.setExposure(1.0); stage.setFog(PALETTE.graphite, 3.5, 15);
      // camera: home framing → over-the-shoulder for the spatial set → back home for the lone point
      const toSpatial = easeInOut(seg(t, B.voice + 0.4, B.spatial - 0.3)) * (1 - easeInOut(seg(t, B.collapse + 0.2, B.collapseEnd + 0.4)));
      const drift = ease(t, this.start, B.voice + 0.3, easeInOut) * 0.18;
      V.copy(CAM_HOME.pos).add(V2.set(0, 0, -drift)).lerp(CAM_SPATIAL.pos, toSpatial); cam.position.copy(V);
      V3.copy(CAM_HOME.look).lerp(CAM_SPATIAL.look, toSpatial); cam.lookAt(V3);

      // the panels sweep out of the point, the hand grabs one and moves it, then everything folds back into the point
      const sweep = seg(t, B.spatial, B.spatial + 1.0), fold = seg(t, B.collapse, B.collapseEnd);
      const handK = easeInOut(seg(t, B.handUp, B.grab)), moveK = easeInOut(seg(t, B.grab + 0.1, B.moveEnd)), away = easeInOut(seg(t, B.release, B.release + 0.7));
      const present = fadeIO(t, B.spatial - 0.01, B.collapseEnd + 0.01, 0.6, 0.8);
      this.viewerMat.opacity = present; this.handMat.opacity = present;
      this.cyanLight.intensity = 1.3 * present;
      for (const k of ['key', 'fill', 'rim', 'ambient']) this.spaceLights[k].intensity = this.spaceLightBase[k] * present; // graphite space is dark except for the point

      // the hand: rises from the viewer's right side to the right-centre panel, pinches, moves it left and up, lets go
      const handRest = V.set(0.3, 0.95, 0.1), handReach = V2.set(0.5, 1.52, -0.78);
      const handMove = V3.set(0.5 - 0.2 * moveK, 1.52 + 0.3 * moveK, -0.78);
      const hp = handRest.clone().lerp(handReach, handK).lerp(handMove, moveK > 0 ? 1 : 0).lerp(handRest, away);
      this.ghostHand.visible = present > 0 && t > B.handUp - 0.1 && t < B.release + 0.8;
      this.ghostHand.position.copy(hp); this.ghostHand.rotation.set(deg(-68), deg(-14), deg(-8)); this.ghostHand.pose(0.25 + 0.55 * clamp(seg(t, B.grab - 0.15, B.grab + 0.1)) * (1 - away));
      // the amber point: alone at home, then a focus dot riding the fingertips, then home again (computed BEFORE the
      // panels, which sweep out of it — never read state left over from the previous frame)
      const onHand = handK * (1 - away);
      const lonePresence = 1 - ease(t, B.voice, B.voice + 0.35, easeInOut) + ease(t, B.spatial - 0.1, B.spatial + 0.4, easeOut);
      V.copy(POINT_HOME).lerp(V2.copy(hp).add(V3.set(0.0, 0.07, -0.11)), onHand);
      this.point.group.position.copy(V);
      const returned = ease(t, B.collapseEnd, B.collapseEnd + 1.0, easeOut);
      this.point.setIntensity(clamp(lonePresence) * (1 + 0.5 * returned)).setScale((1.35 - 0.55 * onHand + 0.4 * returned)).pulse(t, 0.07, 1.4);
      this.point.group.visible = this.point.intensity > 0.01;
      for (const p of this.panels) {
        const k = easeOut(clamp((sweep * 1.3) - p.index * 0.07)) * (1 - easeIn(clamp((fold * 1.4) - (4 - p.index) * 0.08)));
        let yaw = p.yaw, y = p.y, sc = 1;
        if (p.index === 3) { yaw = p.yaw - 10 * moveK; y = p.y + 0.3 * moveK; sc = 1 + 0.05 * clamp(seg(t, B.grab - 0.1, B.grab + 0.2)) * (1 - away); }
        placePanel(p, yaw, y, k * sc);
        p.group.position.lerp(this.point.group.position, 1 - k); p.screen.material.opacity = k;
      }
    } else if (phase === 'corridor') {
      // backwards through the corridor: the camera faces the way it came (−z) while moving +z, the point leads
      cam.fov = 42; cam.updateProjectionMatrix(); stage.setExposure(1.0); stage.setFog(PALETTE.graphite, 6, 42);
      const k = t - B.corridor, speed = 2.0; const zCam = -4.5 + k * speed;
      cam.position.set(Math.sin(k * 0.35) * 0.05, 1.15 + 0.12, zCam);
      const zPt = zCam - 3.2 - Math.min(2.0, k * 0.4);
      const px = Math.sin(k * 1.3) * 0.12, py = 1.15 + Math.sin(k * 0.9 + 1) * 0.08;
      this.point.group.position.set(px, py, zPt);
      this.point.setIntensity(1.1).setScale(1.9).pulse(t, 0.06, 1.2); this.point.group.visible = true;
      this.corLight.position.copy(this.point.group.position).sub(this.corridor.position); this.corLight.intensity = 4;
      cam.lookAt(px * 0.5, 1.15 + 0.55, zCam - 6);
      this.ghostHand.visible = false; this.fpHand.visible = false;
    } else {
      // the door, first person. Same camera language as S01.
      cam.fov = 50; cam.updateProjectionMatrix();
      const fp = this.doorPose(t); cam.position.copy(fp.pos); cam.lookAt(fp.look);
      const open = easeOut(seg(t, B.open, B.openEnd)); this.hinge.rotation.y = -deg(96) * open;
      const through = ease(t, B.walk, B.walkEnd, easeInOut);
      this.backLight.intensity = 3.5 * open + 10 * through; this.backGlow.intensity = 6 * open + 14 * through;
      stage.setExposure(lerp(1.0, 2.4, easeIn(seg(t, B.light0 - 0.4, B.light1))));
      // the hand: enters from lower right, grips the bar from above, follows the bar as the door swings, lets go
      const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); const right = new THREE.Vector3().crossVectors(fwd, UP).normalize(); const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      const reach = easeInOut(seg(t, B.handIn, B.grip)), letGo = easeInOut(seg(t, B.releaseDoor, B.releaseDoor + 0.55));
      const visible = t > B.handIn && t < B.releaseDoor + 0.6;
      this.fpHand.visible = visible; this.fpHand.pose(0.3 + 0.6 * clamp(seg(t, B.grip - 0.2, B.grip + 0.05)) * (1 - letGo));
      if (visible) {
        const base = cam.position.clone().addScaledVector(fwd, 0.5).addScaledVector(right, 0.28).addScaledVector(up, -0.4);
        const barWorld = this.barLocal.clone().applyAxisAngle(UP, this.hinge.rotation.y).add(this.hinge.position);
        const target = barWorld.clone().addScaledVector(fwd, -0.075).addScaledVector(up, 0.07).addScaledVector(right, 0.03);
        const p = base.clone().lerp(target, reach).lerp(base.clone().addScaledVector(up, -0.25), letGo);
        this.fpHand.position.copy(p); this.fpHand.quaternion.copy(cam.quaternion); this.fpHand.rotateX(deg(-64)); this.fpHand.rotateZ(deg(-16)); this.fpHand.rotateY(deg(10));
      }
      // the point arrives on the bar (its light warms the steel) and fades as the hand takes over
      const onBar = fadeIO(t, B.door, B.handIn + 0.5, 0.9, 0.5);
      const barWorld = this.barLocal.clone().applyAxisAngle(UP, this.hinge.rotation.y).add(this.hinge.position);
      this.point.group.position.copy(barWorld).addScaledVector(fwd, -0.05);
      this.point.setIntensity(onBar * 0.9).setScale(0.9).pulse(t, 0.07, 1.4); this.point.group.visible = onBar > 0.01;
    }
  },

  draw2d(ctx, t) {
    const B = this.B, cx = W / 2, cy = H / 2;
    if (t < B.corridor) {
      // ---- voice: the point stretches into a waveform; the question; the reply ----
      const waveIn = ease(t, B.voice, B.voice + 0.6, easeOut), waveOut = ease(t, B.thread, B.thread + 0.5, easeInOut);
      const ext = waveIn * (1 - waveOut); const speaking = fadeIO(t, B.voice + 0.15, B.reply - 0.15, 0.3, 0.35), answering = fadeIO(t, B.reply, B.thread + 0.2, 0.3, 0.4);
      const amp = 48 * (0.55 + 0.45 * noise1(t * 7)) * speaking + 20 * (0.7 + 0.3 * Math.sin(t * 9)) * answering;
      const waveA = fadeIO(t, B.voice, B.thread + 0.5, 0.2, 0.4);
      if (waveA > 0) { if (ext < 0.06) amberDot(ctx, cx, cy, 11, waveA, { glow: 7 }); drawWave(ctx, cx, cy, t, Math.max(ext, 0.02), amp, waveA); }
      // layout morph: centred voice exchange → chat column
      const k = easeInOut(seg(t, B.thread, B.thread + 0.7)); const colL = cx - 390, colR = cx + 390;
      const qa = fadeIO(t, B.question, B.spatial + 0.2, 0.45, 0.5), ra = fadeIO(t, B.reply, B.spatial + 0.2, 0.45, 0.5);
      const qRise = (1 - easeOut(seg(t, B.question, B.question + 0.6))) * 16, rRise = (1 - easeOut(seg(t, B.reply, B.reply + 0.6))) * 16;
      // Q1: centred above the wave → right-aligned at the top of the column
      const Q1 = 'When does the pharmacy close today?'; const q1w = cardWidth(ctx, Q1), r1w = replyWidth(ctx);
      drawCard(ctx, Q1, lerp(cx - q1w / 2, colR - q1w, k), lerp(cy - 150, cy - 230, k), { style: 'user', anchor: 'left', alpha: qa, rise: qRise });
      drawReply(ctx, lerp(cx - r1w / 2, colL, k), lerp(cy + 150, cy - 120, k), { anchor: 'left', alpha: ra, rise: rRise });
      // Q2 / typing / A2
      const q2a = fadeIO(t, B.q2, B.spatial + 0.2, 0.45, 0.5); drawCard(ctx, 'Is it open on Sunday too?', colR, cy + 10, { style: 'user', anchor: 'right', alpha: q2a, rise: (1 - easeOut(seg(t, B.q2, B.q2 + 0.6))) * 16 });
      const tya = fadeIO(t, B.typing, B.a2 + 0.1, 0.3, 0.2); drawTyping(ctx, colL, cy + 120, t, tya);
      const a2a = fadeIO(t, B.a2, B.spatial + 0.2, 0.4, 0.5); drawCard(ctx, 'Yes — 10:00 to 16:00 on Sundays. Want a reminder?', colL, cy + 120, { style: 'assistant', anchor: 'left', alpha: a2a, rise: (1 - easeOut(seg(t, B.a2, B.a2 + 0.6))) * 16 });
      // labels + badges (one of each at a time)
      caps(ctx, 'VOICE & CONVERSATIONAL INTERFACES', 120, 128, { alpha: fadeIO(t, B.question, B.spatial, 0.5, 0.5) });
      badge(ctx, BADGE.VIS, W - 120, H - 70, fadeIO(t, B.question, B.spatial + 0.1, 0.5, 0.5), { align: 'right' });
      const sl = fadeIO(t, B.spatial + 0.35, B.collapse + 0.5, 0.5, 0.5);
      if (sl > 0) { ctx.save(); ctx.globalAlpha = sl; ctx.fillStyle = PALETTE.cyan; ctx.fillRect(120, 108, 34, 2); ctx.restore(); text(ctx, 'Spatial computing — emerging, not yet mainstream', 120, 138, { size: 26, weight: 500, color: PALETTE.ivory, alpha: sl }); }
      badge(ctx, BADGE.CONCEPT, W - 120, H - 70, fadeIO(t, B.spatial + 0.35, B.collapse + 0.6, 0.5, 0.5), { align: 'right' });
    }
    // ---- dips: into the corridor and out to the door (the point persists on the overlay) ----
    const d1 = fadeIO(t, B.corridor - 0.5, B.corridor + 0.9, 0.5, 0.9); dip(ctx, d1, PALETTE.graphite); if (d1 > 0.2) amberDot(ctx, cx, cy + 20, 16, d1 * 0.9, { glow: 8 });
    const d2 = fadeIO(t, B.door - 0.5, B.door + 1.0, 0.5, 1.0); dip(ctx, d2, PALETTE.graphite); if (d2 > 0.2) amberDot(ctx, cx, cy + 20, 14, d2 * 0.9, { glow: 8 });
    // ---- the credo, one line as the narrator says it, stacked ----
    if (t > B.corridor && t < B.door) {
      const lines = ['Find the human problem.', 'Design with people, not assumptions.', 'Test what you have made.'];
      lines.forEach((s, i) => { const a = fadeIO(t, B.credo[i], B.door - 0.35, 0.5, 0.45); if (a > 0) text(ctx, s, cx, cy + 236 + i * 58 - (1 - easeOut(seg(t, B.credo[i], B.credo[i] + 0.8))) * 12, { size: 36, weight: 400, family: 'Inter Display', color: PALETTE.ivory, align: 'center', alpha: a * 0.94, tracking: 0.5 }); });
    }
    // ---- into the light: ivory bloom, then the closing cards ----
    if (t >= B.light0 - 0.1) {
      bloom(ctx, seg(t, B.light0, B.light1), { cx, cy: cy - 40, color: IVORY_RGB });
      dip(ctx, seg(t, B.light1 - 0.25, B.light1 + 0.05), PALETTE.ivory);
      // the field turns graphite once the first card ends (title / credits sit on graphite like the opening title)
      const c1 = B.cards[0]; const toGraphite = B.cards.length > 1 ? seg(t, c1[2] - 0.35, c1[2] + 0.35) : 0; dip(ctx, toGraphite, PALETTE.graphite);
      for (const [kind, t0, t1] of B.cards) {
        const a = fadeIO(t, t0, t1, 0.7, 0.5); if (a <= 0) continue;
        const rise = (1 - easeOut(seg(t, t0, t0 + 1.2))) * 14;
        if (kind === 'people') {
          text(ctx, 'DESIGN BEGINS WITH PEOPLE.', cx, cy + 22 + rise, { size: 76, weight: 400, family: 'Inter Display', color: PALETTE.graphite, align: 'center', alpha: a * 0.94, tracking: 3 });
        } else if (kind === 'title') {
          titleCard(ctx, 'THE INVISIBLE CONVERSATION', 'HOW UX & UI CAME TO LIFE', a, { y: cy - 10 + rise, size: 86, tracking: 3 });
          ctx.save(); ctx.globalAlpha = a * 0.9; ctx.fillStyle = PALETTE.amber; const w = 120 * easeOut(seg(t, t0 + 0.3, t0 + 1.3)); ctx.fillRect(cx - w / 2, cy + 48 + rise, w, 2); ctx.restore();
        } else if (kind === 'credits' || kind === 'titleCredits') {
          const combined = kind === 'titleCredits'; const y0 = combined ? cy + 70 : cy - 60;
          if (combined) titleCard(ctx, 'THE INVISIBLE CONVERSATION', 'HOW UX & UI CAME TO LIFE', a, { y: cy - 110 + rise, size: 86, tracking: 3 });
          CREDITS.forEach((s, i) => text(ctx, s, cx, y0 + i * 34 + rise, { size: 20, weight: 400, color: i === CREDITS.length - 1 ? PALETTE.gray2 : PALETTE.gray, align: 'center', alpha: a }));
        }
      }
      // fade to black by T.total (the final point outlives the field by a breath)
      const toBlack = seg(t, B.total - 0.8, B.total - 0.08); dip(ctx, toBlack, '#000');
      const fp = ease(t, B.finalPoint, B.finalPoint + 0.9, easeOut) * (1 - seg(t, B.total - 0.4, B.total - 0.05));
      if (fp > 0) amberDot(ctx, cx, cy - 92, 9 + 2 * Math.sin(t * 3), fp, { glow: 7 });
    }
    // ---- hand-off: the previous scene's bloom resolves into the lone point ----
    bloom(ctx, 1 - seg(t, this.start, this.start + 0.8));
  },
};
