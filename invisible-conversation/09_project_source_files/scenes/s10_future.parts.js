// SCENE 10 helpers — the rebuilt S01 door (now with a pull bar + hinges), the corridor, the spatial-computing set,
// and the 2D voice / conversation drawing. Everything here is deterministic (no Math.random, no clocks).
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { lerp, clamp, noise1, deg, hash } from '../lib/util.js';
import { text, measure, roundRect, fillRoundRect } from '../lib/gfx.js';
import { mat, roundedBox, box, cylinder, sphere, plane, floor, makeScreen, rig, makeCorridor, makeHand } from '../lib/props.js';

// where the lone amber point lives in the "graphite space" set, and the two camera poses used there
export const POINT_HOME = new THREE.Vector3(0, 1.58, -1.12);
export const CAM_HOME = { pos: new THREE.Vector3(0, 1.6, 2.3), look: POINT_HOME.clone() };
export const CAM_SPATIAL = { pos: new THREE.Vector3(-1.08, 1.98, 1.38), look: new THREE.Vector3(0.06, 1.5, -1.0) };

// estimated moment a word is spoken inside a sentence (linear in character position — good to ~0.3 s)
export function wordTime(sentence, needle) {
  const s = sentence.text || ''; const i = s.toLowerCase().indexOf(needle.toLowerCase());
  const f = i < 0 ? 0 : i / Math.max(1, s.length); return lerp(sentence.start, sentence.end, f);
}

// ------------------------------------------------------------------------------------------------------------
// THE DOOR ROOM — copied from scenes/s01_door.js (same wall, frame, floor, slab, lights) with the redesigned
// hardware: a horizontal brushed-steel pull bar on this side and three visible hinge knuckles on the left edge.
export function buildRoom(g) {
  const room = new THREE.Group(); g.add(room);
  rig(room, { key: [2.2, 4.2, 3.2], keyI: 2.4, keyColor: 0xffe9d2, fill: [-3, 2.2, 3], fillI: 0.45, fillColor: 0xd7e6ff, rim: [0, 3, -4], rimI: 0.6, ambient: 0.12 });
  const wallMat = mat.ivoryWall();
  const dw = 0.92, dh = 2.08, wallH = 5.2, wallW = 18;
  // one seamless wall with a real door opening (extruded shape with a hole)
  const shape = new THREE.Shape(); shape.moveTo(-wallW / 2, 0); shape.lineTo(wallW / 2, 0); shape.lineTo(wallW / 2, wallH); shape.lineTo(-wallW / 2, wallH); shape.closePath();
  const hole = new THREE.Path(); hole.moveTo(-dw / 2, 0); hole.lineTo(dw / 2, 0); hole.lineTo(dw / 2, dh); hole.lineTo(-dw / 2, dh); hole.closePath(); shape.holes.push(hole);
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false }), wallMat); wall.position.z = -0.16; wall.receiveShadow = true; wall.castShadow = true; room.add(wall);
  const frameMat = mat.graphite({ roughness: 0.5 });
  for (const sx of [-1, 1]) { const j = box(0.06, dh + 0.06, 0.2, frameMat); j.position.set(sx * (dw / 2 + 0.03), (dh + 0.06) / 2, -0.06); room.add(j); }
  const head = box(dw + 0.12, 0.06, 0.2, frameMat); head.position.set(0, dh + 0.03, -0.06); room.add(head);
  const fl = floor(30, mat.graphite({ roughness: 0.3, metalness: 0.25 })); room.add(fl);
  // the room behind the door: a softly lit ivory space
  const back = plane(18, 6, mat.ivory({ roughness: 1 })); back.position.set(0, 2.4, -3.2); room.add(back);
  const backFloor = floor(18, mat.ivory({ roughness: 0.9 })); backFloor.position.set(0, 0.002, 2.6); room.add(backFloor);
  const backLight = new THREE.PointLight(0xfff0dc, 0, 9, 1.6); backLight.position.set(0.3, 2.2, -1.6); room.add(backLight);
  const backGlow = new THREE.SpotLight(0xfff3e4, 0, 12, deg(40), 0.6, 1.2); backGlow.position.set(0, 2.6, -2.4); backGlow.target.position.set(0, 1, 1.5); room.add(backGlow, backGlow.target);

  // the door: the same flush warm walnut slab, hinged on the left
  const hinge = new THREE.Group(); hinge.position.set(-dw / 2, 0, 0); room.add(hinge);
  const slab = roundedBox(dw - 0.008, dh - 0.01, 0.045, 0.004, mat.std(0x6b4a30, { roughness: 0.55 })); slab.position.set((dw - 0.008) / 2, (dh - 0.01) / 2 + 0.005, 0); hinge.add(slab);

  // NEW: three visible hinge knuckles on the hinge axis (this side), with small leaf plates on the slab
  const steel = mat.std(0xB4B9C2, { roughness: 0.38, metalness: 0.75 });
  const steelDark = mat.std(0x8d929b, { roughness: 0.45, metalness: 0.8 });
  for (const y of [0.32, 1.04, 1.76]) {
    const knuckle = cylinder(0.013, 0.013, 0.13, steel, 24); knuckle.position.set(0.0, y, 0.0225 + 0.013); hinge.add(knuckle);
    for (const yy of [-0.045, 0.045]) { const ring = cylinder(0.0145, 0.0145, 0.004, steelDark, 24); ring.position.set(0.0, y + yy, 0.0225 + 0.013); hinge.add(ring); }
    const leaf = box(0.034, 0.13, 0.003, steelDark); leaf.position.set(0.028, y, 0.0245); hinge.add(leaf);
  }
  // NEW: the horizontal brushed-steel pull bar on two standoffs, at hand height, towards the free edge
  const barY = 1.04, x0 = 0.30, x1 = 0.84, standoffL = 0.062;
  for (const x of [x0 + 0.03, x1 - 0.03]) { const s = cylinder(0.012, 0.012, standoffL, steel, 24); s.rotation.x = Math.PI / 2; s.position.set(x, barY, 0.0225 + standoffL / 2); hinge.add(s); }
  const bar = cylinder(0.016, 0.016, x1 - x0, steel, 32); bar.rotation.z = Math.PI / 2; bar.position.set((x0 + x1) / 2, barY, 0.0225 + standoffL + 0.012); hinge.add(bar);
  for (const x of [x0, x1]) { const cap = sphere(0.016, steel, 20); cap.position.set(x, barY, bar.position.z); hinge.add(cap); }

  const fpHand = makeHand(); fpHand.pose(0.25); fpHand.visible = false; room.add(fpHand);
  return { room, hinge, bar, fpHand, backLight, backGlow, dw, dh, barLocal: new THREE.Vector3((x0 + x1) / 2, barY, bar.position.z) };
}

// ------------------------------------------------------------------------------------------------------------
// THE CORRIDOR — identical construction to S01 (the point travels backwards through it this time)
export function buildCorridor(g) {
  const cor = makeCorridor({ length: 90, spacing: 2.4, width: 3.4, height: 2.3, amber: 0.75 });
  const corridor = cor.group; corridor.visible = false; corridor.position.set(0, 1.15, 10); g.add(corridor);
  const corLight = new THREE.PointLight(0xFFAB5B, 0, 7, 1.5); corridor.add(corLight);
  corridor.add(new THREE.AmbientLight(0xffffff, 0.08));
  return { corridor, corLight };
}

// ------------------------------------------------------------------------------------------------------------
// GRAPHITE SPACE + SPATIAL COMPUTING — a floor, an abstract viewer silhouette, five translucent panels in an arc,
// a dark hand silhouette. Panel content is painted once (static canvas textures).
const PANEL_SPECS = [
  { yaw: -56, y: 1.42, w: 0.50, h: 0.34, paint: paintNotes },
  { yaw: -28, y: 1.58, w: 0.60, h: 0.40, paint: paintMessages },
  { yaw: 0, y: 1.62, w: 0.72, h: 0.46, paint: paintMap },
  { yaw: 28, y: 1.58, w: 0.60, h: 0.40, paint: paintCalendar },
  { yaw: 56, y: 1.42, w: 0.50, h: 0.34, paint: paintControls },
];
const HEAD = new THREE.Vector3(0, 1.55, 0), R_ARC = 1.15;

export function buildSpace(g) {
  const space = new THREE.Group(); g.add(space);
  const lights = rig(space, { key: [-2, 4, 3], keyI: 0.45, keyColor: 0xd6e4f5, fill: [2.5, 1.5, 3], fillI: 0.25, fillColor: 0xffe9d2, rim: [0.4, 3, -3], rimI: 1.4, rimColor: 0x80C9F8, ambient: 0.1, shadows: false });
  const rigBase = { key: 0.45, fill: 0.25, rim: 1.4, ambient: 0.1 };
  // the floor carries the background colour as emissive so the unlit ground melts into graphite space (plus fog in update)
  space.add(floor(24, mat.std(0x1a1f28, { roughness: 0.6, metalness: 0.1, emissive: 0x0D1016, emissiveIntensity: 0.9 })));
  const cyanLight = new THREE.PointLight(0x80C9F8, 0, 4.5, 1.6); cyanLight.position.set(0, 1.85, -0.85); space.add(cyanLight);

  // the viewer: a matte, faceless silhouette standing at the origin facing -z
  const vm = mat.std(0x1b2029, { roughness: 0.95, transparent: true, opacity: 0 });
  const viewer = new THREE.Group(); space.add(viewer);
  const head = sphere(0.105, vm, 24); head.position.set(0, 1.63, 0); viewer.add(head);
  const neck = cylinder(0.042, 0.05, 0.09, vm, 16); neck.position.set(0, 1.5, 0); viewer.add(neck);
  const shoulders = roundedBox(0.46, 0.17, 0.2, 0.07, vm); shoulders.position.set(0, 1.4, 0); viewer.add(shoulders);
  const torso = roundedBox(0.4, 0.58, 0.19, 0.06, vm); torso.position.set(0, 1.05, 0); viewer.add(torso);
  const legs = roundedBox(0.3, 0.8, 0.18, 0.05, vm); legs.position.set(0, 0.4, 0); viewer.add(legs);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.5, 6, 12), vm); armL.position.set(-0.27, 1.05, 0); viewer.add(armL);

  // the panels
  const panels = PANEL_SPECS.map((p, i) => {
    const grp = new THREE.Group(); space.add(grp);
    const pxW = 512, pxH = Math.round(512 * p.h / p.w);
    const scr = makeScreen(p.w, p.h, pxW, pxH); scr.material.transparent = true; scr.material.depthWrite = false; scr.material.opacity = 0;
    scr.ctx.clearRect(0, 0, pxW, pxH); paintGlass(scr.ctx, pxW, pxH); p.paint(scr.ctx, pxW, pxH); scr.update();
    grp.add(scr.mesh);
    const a = deg(p.yaw); const base = new THREE.Vector3(HEAD.x + Math.sin(a) * R_ARC, p.y, HEAD.z - Math.cos(a) * R_ARC);
    return { group: grp, screen: scr, base, yaw: p.yaw, y: p.y, w: p.w, h: p.h, index: i };
  });

  // the hand silhouette (dark, same proportions as the first-person hand)
  const hm = mat.std(0x242932, { roughness: 0.9, transparent: true, opacity: 0 });
  const ghostHand = makeHand(hm); ghostHand.visible = false; space.add(ghostHand);
  return { space, viewer, viewerMat: vm, panels, ghostHand, handMat: hm, cyanLight, spaceLights: lights, spaceLightBase: rigBase };
}

// place a panel on the arc at a given yaw (deg) and height, facing the viewer's head
export function placePanel(p, yaw, y, scale = 1) {
  const a = deg(yaw); p.group.position.set(HEAD.x + Math.sin(a) * R_ARC, y, HEAD.z - Math.cos(a) * R_ARC);
  p.group.lookAt(HEAD.x, y, HEAD.z); p.group.scale.setScalar(Math.max(0.0001, scale));
}

// ---- panel painters (ivory / cyan line-art on dark glass) ----
function paintGlass(x, w, h) {
  x.save(); roundRect(x, 2, 2, w - 4, h - 4, 30); x.fillStyle = 'rgba(22,27,36,0.66)'; x.fill();
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(128,201,248,0.14)'); g.addColorStop(1, 'rgba(128,201,248,0.03)'); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(128,201,248,0.7)'; x.lineWidth = 3; x.stroke(); x.restore();
}
function pTitle(x, str, w) { x.save(); x.font = '600 24px Inter'; x.letterSpacing = '3px'; x.fillStyle = 'rgba(246,242,232,0.62)'; x.fillText(str.toUpperCase(), 40, 56); x.restore(); }
function paintNotes(x, w, h) {
  pTitle(x, 'Notes', w); x.save(); x.fillStyle = 'rgba(246,242,232,0.42)';
  [0.78, 0.62, 0.7, 0.4].forEach((f, i) => { roundRect(x, 40, 98 + i * 46, (w - 80) * f, 14, 7); x.fill(); }); x.restore();
}
function paintMessages(x, w, h) {
  pTitle(x, 'Messages', w); x.save();
  const rows = [[0, 0.52], [1, 0.4], [0, 0.6]];
  rows.forEach(([side, f], i) => { const bw = (w - 80) * f, y = 92 + i * 66; const bx = side ? w - 40 - bw : 40; roundRect(x, bx, y, bw, 46, 20); x.fillStyle = side ? 'rgba(233,227,214,0.9)' : 'rgba(255,255,255,0.14)'; x.fill(); x.fillStyle = side ? 'rgba(13,16,22,0.5)' : 'rgba(246,242,232,0.5)'; roundRect(x, bx + 22, y + 18, bw - 44, 10, 5); x.fill(); });
  x.restore();
}
function paintMap(x, w, h) {
  pTitle(x, 'Nearby', w); x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = 'rgba(246,242,232,0.26)'; x.lineWidth = 10;
  const streets = [[[40, 150], [200, 140], [330, 170], [w - 40, 160]], [[150, 80], [170, 200], [160, h - 40]], [[40, 250], [250, 240], [w - 40, 262]], [[360, 70], [380, 180], [350, h - 40]]];
  for (const s of streets) { x.beginPath(); s.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke(); }
  x.strokeStyle = PALETTE.cyan; x.lineWidth = 6; x.beginPath(); x.moveTo(120, h - 62); x.lineTo(165, 200); x.lineTo(340, 172); x.lineTo(372, 118); x.stroke();
  x.fillStyle = PALETTE.ivory; x.beginPath(); x.arc(120, h - 62, 11, 0, Math.PI * 2); x.fill();
  x.fillStyle = PALETTE.amber; x.beginPath(); x.arc(372, 118, 14, 0, Math.PI * 2); x.fill();
  x.font = '600 26px Inter'; x.fillStyle = PALETTE.ivory; x.fillText('12 min', 396, 128); x.restore();
}
function paintCalendar(x, w, h) {
  pTitle(x, 'Sunday', w); x.save();
  const cols = 7, rows = 4, cw = (w - 80) / cols, ch = 44, y0 = 88;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const cx = 40 + c * cw + 4, cy = y0 + r * (ch + 6); roundRect(x, cx, cy, cw - 8, ch, 8); const hot = r === 1 && c === 6; x.fillStyle = hot ? PALETTE.amber : 'rgba(255,255,255,0.08)'; x.fill(); if (hash(r * 7 + c + 0.5) > 0.7 && !hot) { x.fillStyle = 'rgba(128,201,248,0.7)'; roundRect(x, cx + 10, cy + ch - 12, cw - 28, 4, 2); x.fill(); } }
  x.restore();
}
function paintControls(x, w, h) {
  pTitle(x, 'Controls', w); x.save();
  [[0.66, 100], [0.3, 160]].forEach(([f, y]) => { x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, y); x.lineTo(w - 40, y); x.stroke(); x.strokeStyle = PALETTE.cyan; x.beginPath(); x.moveTo(40, y); x.lineTo(40 + (w - 80) * f, y); x.stroke(); x.fillStyle = PALETTE.ivory; x.beginPath(); x.arc(40 + (w - 80) * f, y, 13, 0, Math.PI * 2); x.fill(); });
  roundRect(x, 40, 212, 84, 42, 21); x.fillStyle = PALETTE.cyan; x.fill(); x.fillStyle = PALETTE.ivory; x.beginPath(); x.arc(103, 233, 16, 0, Math.PI * 2); x.fill();
  x.restore();
}

// ------------------------------------------------------------------------------------------------------------
// 2D: the voice waveform and the conversation cards
// amber speech line centred at (cx, cy); ext = horizontal extent 0..1 (0 = a dot), amp in px
export function drawWave(ctx, cx, cy, t, ext, amp, alpha, seed = 0) {
  if (alpha <= 0) return;
  const halfW = 300 * ext;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,171,91,0.6)'; ctx.shadowBlur = 22;
  const n = 110;
  for (const [sign, a, lw] of [[1, 1, 3], [-1, 0.42, 2]]) {
    ctx.beginPath(); ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = lw; ctx.globalAlpha = alpha * a;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = cx - halfW + 2 * halfW * u; const env = Math.pow(Math.sin(u * Math.PI), 0.8);
      const w = Math.sin(u * 31 + t * 19 + seed) * 0.5 + Math.sin(u * 57 - t * 29 + seed * 2) * 0.3 + (noise1(u * 8 + t * 7 + seed) - 0.5) * 0.9;
      const y = cy + sign * Math.abs(w) * amp * env; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// width of a card/reply as drawCard/drawReply would lay it out (for continuous slides)
export function cardWidth(ctx, str, style = 'user', size = 30) { return measure(ctx, str, { size, weight: 500 }) + 60 + (style === 'assistant' ? 30 : 0); }
export function replyWidth(ctx) { return measure(ctx, 'Open until 20:00', { size: 30, weight: 600 }) + measure(ctx, '  ·  12 min walk', { size: 30, weight: 500 }) + 90; }

// a rounded message card. style 'user' = ivory bubble with graphite text; 'assistant' = graphite card, ivory text, amber dot.
// anchor: 'center' | 'left' | 'right' (x is the anchor edge). Returns {x0, y0, w, h}.
export function drawCard(ctx, str, x, y, { style = 'user', anchor = 'center', alpha = 1, size = 30, rise = 0 } = {}) {
  if (alpha <= 0) return null;
  const padX = 30, padY = 20, dot = style === 'assistant' ? 30 : 0;
  const tw = measure(ctx, str, { size, weight: 500 }); const w = tw + padX * 2 + dot, h = size * 1.25 + padY * 2;
  const x0 = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x; const y0 = y - h / 2 + rise;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  fillRoundRect(ctx, x0, y0, w, h, 22, style === 'user' ? PALETTE.ivory2 : PALETTE.graphite3);
  ctx.shadowColor = 'transparent';
  if (style === 'assistant') { roundRect(ctx, x0, y0, w, h, 22); ctx.strokeStyle = 'rgba(246,242,232,0.12)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = PALETTE.amber; ctx.beginPath(); ctx.arc(x0 + padX + 6, y0 + h / 2, 6, 0, Math.PI * 2); ctx.fill(); }
  text(ctx, str, x0 + padX + dot, y0 + h / 2 + size * 0.36, { size, weight: 500, color: style === 'user' ? PALETTE.graphite : PALETTE.ivory });
  ctx.restore();
  return { x0, y0, w, h };
}

// the reply card: "Open until 20:00 · 12 min walk" with a two-tone emphasis
export function drawReply(ctx, x, y, { anchor = 'center', alpha = 1, rise = 0 } = {}) {
  if (alpha <= 0) return null;
  const size = 30, a = 'Open until 20:00', b = '  ·  12 min walk', padX = 30, padY = 20, dot = 30;
  const wa = measure(ctx, a, { size, weight: 600 }), wb = measure(ctx, b, { size, weight: 500 });
  const w = wa + wb + padX * 2 + dot, h = size * 1.25 + padY * 2;
  const x0 = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x; const y0 = y - h / 2 + rise;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  fillRoundRect(ctx, x0, y0, w, h, 22, PALETTE.graphite3); ctx.shadowColor = 'transparent';
  roundRect(ctx, x0, y0, w, h, 22); ctx.strokeStyle = 'rgba(246,242,232,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = PALETTE.amber; ctx.beginPath(); ctx.arc(x0 + padX + 6, y0 + h / 2, 6, 0, Math.PI * 2); ctx.fill();
  const ty = y0 + h / 2 + size * 0.36;
  text(ctx, a, x0 + padX + dot, ty, { size, weight: 600, color: PALETTE.ivory });
  text(ctx, b, x0 + padX + dot + wa, ty, { size, weight: 500, color: PALETTE.gray });
  ctx.restore();
  return { x0, y0, w, h };
}

// typing indicator (assistant): three dots breathing in sequence
export function drawTyping(ctx, x, y, t, alpha = 1) {
  if (alpha <= 0) return;
  const w = 104, h = 58, x0 = x, y0 = y - h / 2;
  ctx.save(); ctx.globalAlpha *= alpha; fillRoundRect(ctx, x0, y0, w, h, 22, PALETTE.graphite3);
  for (let i = 0; i < 3; i++) { const k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 7 - i * 1.1)); ctx.fillStyle = `rgba(246,242,232,${k})`; ctx.beginPath(); ctx.arc(x0 + 30 + i * 22, y, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
