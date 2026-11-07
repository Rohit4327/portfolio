// SCENE 06 — THE WEB AND THE NAME "UX". The 1988 book on a graphite table, the NeXT cube at CERN, the first website,
// the point becomes a link and leads into a 3D network of documents, then 1993: "user experience" and the nested diagram.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, noise1, deg } from '../lib/util.js';
import { text, caps, lowerThird, badge, BADGE, bloom, dip, amberDot } from '../lib/gfx.js';
import { mat, box, plane, floor, AmberPoint, rig } from '../lib/props.js';
import { makeBook, makeNeXT, drawNextScreen, cardTextures, makeNetwork, makeBurst, drawDiagram, drawTimeline } from './s06_web_ux.parts.js';

const CH = 6;
const V = new THREE.Vector3(), V2 = new THREE.Vector3();
// piecewise camera keyframes: [{t, p:[x,y,z], l:[x,y,z]}] eased between neighbours
function keyCam(t, keys, cam) {
  let i = 0; while (i < keys.length - 1 && t >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = a === b ? 0 : easeInOut(seg(t, a.t, b.t));
  cam.position.set(lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k), lerp(a.p[2], b.p[2], k));
  V.set(lerp(a.l[0], b.l[0], k), lerp(a.l[1], b.l[1], k), lerp(a.l[2], b.l[2], k)); return V;
}

export default {
  id: 's06', title: 'The Web and the Name UX',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.5, grain: 0.03, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    const s = (n, d) => T.sent(CH, n, d).start;
    const start = this.start, end = this.end;
    const B = (this.B = {
      start, end,
      norman: s('In 1988', start + 0.7),
      tbl: s('A year later', start + 5.5),
      web: s('By 1991', start + 9.45),
      q: s('The question now', start + 14.2),
      ux: s('In 1993', start + 21.0),
      beyondS: s('That experience', start + 26.6),
    });
    B.pageTurn = B.norman + 2.3;
    B.travel0 = B.tbl - 0.7; B.travel1 = B.tbl + 1.1;
    B.push0 = B.web - 0.3; B.push1 = B.web + 3.2;
    B.click1 = B.web + 1.55; B.click2 = B.web + 2.75; B.click3 = B.web + 3.95;
    B.dive0 = B.click3 + 0.2; B.net0 = B.dive0 + 1.0;
    B.hop = [B.net0 + 0.4, B.net0 + 1.8, B.net0 + 3.3, B.net0 + 4.9];
    B.centre = B.net0 + 6.3;
    B.diag1 = B.ux + 2.0; B.diag2 = B.diag1 + 0.9; B.diag3 = B.diag2 + 0.9; B.diag4 = B.beyondS - 0.4; B.beyond = B.beyondS + 0.4;
    B.tlIn = B.ux + 4.0;
    B.grow = end - 1.9;
    this.cues = {
      point_land: B.norman - 0.2, page_turn: B.pageTurn, point_lift: B.travel0, point_arrive_screen: B.travel1 + 0.3,
      link_click_1: B.click1, link_click_2: B.click2, link_click_3: B.click3, dive: B.dive0, network_in: B.net0,
      hop_1: B.hop[0], hop_2: B.hop[1], hop_3: B.hop[2], hop_4: B.hop[3], point_to_centre: B.centre,
      ux_label: B.ux, diagram_1: B.diag1, diagram_2: B.diag2, diagram_3: B.diag3, diagram_4: B.diag4, beyond_screen: B.beyond,
      network_grow: B.grow, transition_point: end - 0.7,
    };

    // ---------------- the desk: graphite table in a dark room ----------------
    const desk = (this.desk = new THREE.Group()); g.add(desk);
    rig(desk, { key: [1.6, 3.0, 2.2], keyI: 2.1, keyColor: 0xffe9d2, fill: [-2.6, 2.0, 2.6], fillI: 0.4, fillColor: 0xd7e6ff, rim: [0.4, 2.6, -3], rimI: 0.9, ambient: 0.1 });
    const top = box(3.4, 0.04, 1.0, mat.graphite({ roughness: 0.32, metalness: 0.25 })); top.position.set(0, 0.73, 0); desk.add(top);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = box(0.04, 0.71, 0.04, mat.graphite({ roughness: 0.5 })); leg.position.set(sx * 1.55, 0.355, sz * 0.42); desk.add(leg); }
    desk.add(floor(30, mat.graphite({ roughness: 0.6, metalness: 0.15 })));
    const wall = plane(12, 4, mat.graphiteLight({ roughness: 0.95 })); wall.position.set(0, 1.6, -1.7); desk.add(wall);
    // book
    this.book = makeBook(); this.book.position.set(-0.95, 0.75, 0.1); this.book.rotation.y = 0.16; desk.add(this.book);
    // NeXT workstation
    const nx = (this.next = makeNeXT()); desk.add(nx);
    nx.monitor.position.set(0.5, 0.75, -0.1); nx.monitor.rotation.y = -0.03;
    nx.cube.position.set(1.17, 0.75, -0.14); nx.cube.rotation.y = -0.08;
    nx.keyboard.position.set(0.47, 0.75, 0.33); nx.mouse.position.set(0.8, 0.75, 0.33); nx.mouse.rotation.y = 0.25;
    this.scr = nx.screen; this.scrKey = '';
    this.glow = new THREE.PointLight(0xb9c4cf, 0.55, 1.3, 1.6); this.glow.position.set(0.5, 1.05, 0.25); desk.add(this.glow);
    // link positions per page (canvas px) → world
    this.pageLinks = [];
    for (let p = 0; p < 3; p++) this.pageLinks.push(drawNextScreen(this.scr.ctx, this.scr.pxW, this.scr.pxH, { mode: 'web', page: p, hover: null, pressed: null }).links);
    this.clicks = [{ page: 0, id: 'hypertext' }, { page: 1, id: 'network' }, { page: 2, id: 'projects' }];

    // ---------------- the amber point ----------------
    this.point = new AmberPoint(0.009, { lightIntensity: 1.2, lightDistance: 1.4 }); g.add(this.point.group);

    // ---------------- the network of documents ----------------
    const net = (this.net = new THREE.Group()); g.add(net); net.visible = false;
    rig(net, { key: [3, 6, 5], keyI: 1.5, keyColor: 0xfff2e0, fill: [-5, 3, 4], fillI: 0.55, fillColor: 0xcfe3ff, rim: [0, 4, -8], rimI: 0.8, ambient: 0.28, shadows: false });
    const tex = cardTextures(4);
    this.path = [[-0.95, 1.55, 1.0], [0.85, 1.1, -1.5], [-0.5, 1.85, -3.8], [1.15, 1.3, -6.1]];
    this.cards = makeNetwork(tex, this.path); net.add(this.cards);
    this.burst = makeBurst(tex); this.burst.visible = false; net.add(this.burst);
  },

  linkWorld(click) {
    const r = this.pageLinks[click.page].find((l) => l.id === click.id); const scr = this.scr;
    const lx = ((r.x - 8) / scr.pxW - 0.5) * scr.w, ly = (0.5 - (r.y + r.h * 0.98) / scr.pxH) * scr.h;
    return scr.mesh.localToWorld(new THREE.Vector3(lx, ly, 0.012));
  },

  screenState(t) {
    const B = this.B;
    if (t < B.web - 0.15) return { mode: 'proposal', page: 0, hover: null, pressed: null };
    let page = 0; let pressed = null, hover = null;
    for (let i = 0; i < 3; i++) { const c = B['click' + (i + 1)]; if (t >= c + 0.22 && i < 2) page = i + 1; if (t >= c && t < c + 0.22) pressed = this.clicks[i].id; }
    const cur = this.clicks[page]; const arrive = page === 0 ? B.web + 0.9 : B['click' + page] + 0.8;
    if (t >= arrive && !pressed) hover = cur.id;
    if (t >= B.click3) { page = 2; pressed = t < B.click3 + 0.22 ? 'projects' : null; hover = pressed ? null : 'projects'; }
    return { mode: 'web', page, hover, pressed };
  },

  pointDesk(t) {
    const B = this.B; const out = new THREE.Vector3();
    const bookPt = this.book.localToWorld(new THREE.Vector3(0.052, 0.03, -0.092));
    const openPt = this.book.localToWorld(new THREE.Vector3(0.0, 0.032, -0.085));
    const screenHome = this.scr.mesh.localToWorld(new THREE.Vector3(0.02, 0.09, 0.012));
    if (t < B.travel0) {
      const land = easeOut(seg(t, B.start, B.norman + 0.2));
      const hover = 0.11 * (1 - land) + 0.012;
      out.copy(bookPt).add(new THREE.Vector3(0, hover, 0));
      const op = easeInOut(seg(t, B.pageTurn, B.pageTurn + 1.3)); out.lerp(openPt.clone().add(new THREE.Vector3(0, 0.02, 0)), op);
      return out;
    }
    if (t < B.web + 0.9) {
      const k = easeInOut(seg(t, B.travel0, B.travel1 + 0.3));
      const a = openPt.clone().add(new THREE.Vector3(0, 0.02, 0)); const arc = Math.sin(k * Math.PI) * 0.35;
      out.lerpVectors(a, screenHome, k); out.y += arc; return out;
    }
    // link to link on the screen
    const seqT = [B.web + 0.9, B.click1 + 0.8, B.click2 + 0.8];
    let from = screenHome, to = this.linkWorld(this.clicks[0]), t0 = B.web + 0.2, t1 = B.web + 0.9;
    for (let i = 0; i < 3; i++) if (t >= B['click' + (i + 1)] + 0.22 && i < 2) { from = this.linkWorld(this.clicks[i]); to = this.linkWorld(this.clicks[i + 1]); t0 = B['click' + (i + 1)] + 0.22; t1 = seqT[i + 1]; }
    const k = easeInOut(seg(t, t0, t1)); out.lerpVectors(from, to, k); out.y += Math.sin(k * Math.PI) * 0.015; return out;
  },

  pointNet(t) {
    const B = this.B; const P = this.cards.pathPos; const out = new THREE.Vector3();
    const camZ = this.netZ(t);
    const centreP = new THREE.Vector3(Math.sin((t - B.net0) * 0.25) * 0.05, 1.3, camZ - 2.6);
    if (t < B.hop[0]) { const k = easeOut(seg(t, B.net0, B.hop[0])); out.lerpVectors(new THREE.Vector3(0, 1.3, camZ - 2.0), P[0], k); return out; }
    for (let i = 0; i < P.length; i++) {
      const t0 = B.hop[i], t1 = i + 1 < P.length ? B.hop[i + 1] : B.centre;
      if (t >= t0 && t < t1) {
        const dwell = 0.35; const k = easeInOut(seg(t, t0 + dwell, t1)); const dst = i + 1 < P.length ? P[i + 1] : centreP;
        out.lerpVectors(P[i], dst, k); out.y += Math.sin(k * Math.PI) * 0.25; return out;
      }
    }
    return centreP;
  },
  netZ(t) { const B = this.B; return lerp(4.5, -7.0, easeInOut(seg(t, B.net0, B.diag1))) + lerp(0, -1.2, easeInOut(seg(t, B.diag1, B.grow))); },

  update(t, stage) {
    const B = this.B, cam = stage.camera; const inNet = t >= B.net0;
    stage.setBackground(PALETTE.graphite);
    this.desk.visible = !inNet; this.net.visible = inNet;
    if (!inNet) {
      cam.fov = 32; cam.updateProjectionMatrix(); stage.setFog(PALETTE.graphite, 2.4, 7.5); stage.setExposure(1.0);
      this.book.open(easeInOut(seg(t, B.pageTurn, B.pageTurn + 1.3)));
      // screen content (redrawn only when state changes)
      const st = this.screenState(t); const key = `${st.mode}|${st.page}|${st.hover}|${st.pressed}`;
      if (key !== this.scrKey) { drawNextScreen(this.scr.ctx, this.scr.pxW, this.scr.pxH, st); this.scr.update(); this.scrKey = key; }
      // camera
      const lw = this.linkWorld(this.clicks[2]);
      const keys = [
        { t: B.start, p: [-1.16, 1.3, 0.46], l: [-0.95, 0.76, 0.08] },
        { t: B.travel0, p: [-1.13, 1.24, 0.42], l: [-0.95, 0.76, 0.08] },
        { t: B.travel1, p: [0.78, 1.2, 1.9], l: [0.64, 0.98, -0.05] },
        { t: B.push0, p: [0.7, 1.16, 1.72], l: [0.6, 1.0, -0.05] },
        { t: B.push1, p: [0.515, 1.075, 0.69], l: [0.5, 1.06, 0.0] },
        { t: B.dive0, p: [0.515, 1.075, 0.69], l: [0.5, 1.06, 0.0] },
        { t: B.net0, p: [lw.x, lw.y, lw.z + 0.2], l: [lw.x, lw.y, lw.z] },
      ];
      const look = keyCam(t, keys, cam);
      // tiny handheld-free breathing (no shake): slow drift
      cam.position.y += (noise1(t * 0.3 + 3) - 0.5) * 0.004;
      cam.lookAt(look);
      // the point
      const p = this.pointDesk(t); this.point.group.position.copy(p);
      const near = seg(t, B.travel1, B.push1); // smaller as we get closer to the screen
      const dive = easeIn(seg(t, B.dive0, B.net0));
      this.point.setIntensity(1.0 + 0.3 * dive).setScale(lerp(0.75, 0.32, near) * (1 + 2.2 * dive)).pulse(t, 0.07, 1.3);
      this.point.light.intensity = lerp(2.2, 0.5, near) * (1 + 2 * dive); this.point.light.distance = lerp(1.2, 0.5, near) + 0.6 * dive;
      this.glow.intensity = 0.55;
    } else {
      cam.fov = 40; cam.updateProjectionMatrix(); stage.setFog(PALETTE.graphite, 4, 17);
      const dim = fadeIO(t, B.ux - 0.5, B.grow + 0.6, 1.0, 0.6); stage.setExposure(lerp(1.0, 0.42, dim));
      const z = this.netZ(t); const k = t - B.net0;
      cam.position.set(Math.sin(k * 0.22) * 0.25, 1.32 + Math.sin(k * 0.17 + 1) * 0.06, z);
      cam.lookAt(Math.sin(k * 0.22 + 0.6) * 0.12, 1.3, z - 6);
      const p = this.pointNet(t); this.point.group.position.copy(p);
      const grow = easeIn(seg(t, B.grow, B.end - 0.15));
      this.point.setIntensity(1.1 + 0.9 * grow).setScale(2.4 + 0.8 * Math.max(0, dim - grow) + 9 * grow).pulse(t, 0.06, 1.2);
      this.point.light.distance = 3.5; this.point.light.intensity = 3 * this.point.intensity;
      // the burst network grows out of the point at the end
      this.burst.visible = t >= B.grow;
      if (this.burst.visible) { this.burst.position.copy(p); this.burst.set(easeOut(seg(t, B.grow, B.end - 0.1)), cam); }
    }
  },

  draw2d(ctx, t) {
    const B = this.B;
    const subA = (t0, t1) => fadeIO(t, t0, t1, 0.5, 0.5);
    // ---- 1988: the book ----
    let a = subA(B.norman, B.travel0 + 0.2);
    if (a > 0) {
      caps(ctx, '1988 — The Psychology of Everyday Things', 120, 120, { alpha: a });
      lowerThird(ctx, { title: 'DON NORMAN', sub: 'Cognitive scientist · The Psychology of Everyday Things (1988)', source: 'Book reconstruction · 1988 · retitled The Design of Everyday Things in 1990', alpha: a, reveal: seg(t, B.norman, B.norman + 0.8) });
    }
    // ---- 1989: the proposal ----
    a = subA(B.tbl, B.web - 0.1);
    if (a > 0) {
      caps(ctx, '1989 — The World Wide Web Proposal', 120, 120, { alpha: a });
      lowerThird(ctx, { title: 'TIM BERNERS-LEE', sub: 'CERN · Information Management: A Proposal, March 1989', source: 'NeXT Computer at CERN · the first web server (reconstruction)', alpha: a, reveal: seg(t, B.tbl, B.tbl + 0.8) });
    }
    // ---- 1991: the first website ----
    a = subA(B.web, B.dive0 + 0.3);
    if (a > 0) {
      caps(ctx, 'info.cern.ch — The First Website', 120, 120, { alpha: a });
      text(ctx, 'running from Dec 1990 · announced publicly Aug 1991 · reconstruction', 120, 154, { size: 20, weight: 400, color: PALETTE.gray, alpha: a });
    }
    // provenance badges
    badge(ctx, BADGE.RECON, W - 120, H - 70, fadeIO(t, B.start + 0.3, B.net0, 0.6, 0.4), { align: 'right' });
    badge(ctx, BADGE.VIS, W - 120, H - 70, fadeIO(t, B.net0 + 0.5, B.diag1, 0.6, 0.4), { align: 'right' });
    badge(ctx, BADGE.DIAGRAM, W - 120, H - 70, fadeIO(t, B.diag1, B.grow + 0.3, 0.6, 0.4), { align: 'right' });
    // ---- the dive into the link: amber swell + dip hides the cut into the network ----
    const d = fadeIO(t, B.dive0 + 0.35, B.net0 + 0.9, 0.65, 0.9); dip(ctx, d, PALETTE.graphite);
    if (d > 0.1) { const sw = 1 + 2.5 * easeIn(seg(t, B.dive0 + 0.4, B.net0)); amberDot(ctx, W / 2, H / 2, 12 * sw, Math.min(1, d * 1.4) * (1 - seg(t, B.net0 + 0.1, B.net0 + 0.9)), { glow: 9 }); }
    // ---- 1993: the name ----
    a = subA(B.ux, B.ux + 4.4);
    if (a > 0) {
      caps(ctx, '1993 — "User Experience"', 120, 120, { alpha: a });
      lowerThird(ctx, { title: 'DON NORMAN', sub: 'User Experience Architect · Apple, 1993', alpha: a, reveal: seg(t, B.ux, B.ux + 0.8) });
    }
    // ---- the diagram + timeline strip ----
    drawDiagram(ctx, t, B, fadeIO(t, B.diag1 - 0.1, B.grow + 0.5, 0.3, 0.5));
    drawTimeline(ctx, t, B.tlIn, fadeIO(t, B.tlIn, B.grow + 0.3, 0.5, 0.5));
    // ---- hand-off ----
    bloom(ctx, 1 - seg(t, B.start, B.start + 0.8));
    bloom(ctx, seg(t, B.end - 0.7, B.end));
  },
};
