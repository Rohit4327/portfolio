/**
 * capsule.js — the rounded-rectangle transparent enclosure at centre-right.
 * The single most important landmark on the plan, so it is built as a real
 * curved shell with a bowed display, a U-shaped sofa and corner planting.
 */
import * as THREE from 'three';
import * as PL from './plan.js';
import { mat } from './materials.js';
import { roundedBox } from './geom.js';
import {
  roundTable, loungeCube, bench, plant, capsuleScreen, credenza, sofa,
} from './furniture.js';

const { wx, wz, wl, GLASS_H } = PL;

function straightGlass(g, cx, cz, len, axis, collide) {
  const w = axis === 'x' ? len : 0.05;
  const d = axis === 'x' ? 0.05 : len;
  const pane = new THREE.Mesh(new THREE.BoxGeometry(w, GLASS_H, d), mat.glass);
  pane.position.set(cx, GLASS_H / 2 + 0.04, cz);
  pane.renderOrder = 2;
  g.add(pane);
  for (const [y, h] of [[0.02, 0.05], [GLASS_H + 0.04, 0.05]]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(axis === 'x' ? len : 0.07, h, axis === 'x' ? 0.07 : len),
      mat.glassFrame);
    rail.position.set(cx, y + h / 2, cz);
    g.add(rail);
  }
  if (collide) {
    collide.push({
      x0: cx - w / 2 - 0.05, x1: cx + w / 2 + 0.05,
      z0: cz - d / 2 - 0.05, z1: cz + d / 2 + 0.05,
    });
  }
}

function cornerGlass(g, cx, cz, r, a0, collide) {
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, GLASS_H, 14, 1, true, a0, Math.PI / 2), mat.glass);
  shell.position.set(cx, GLASS_H / 2 + 0.04, cz);
  shell.renderOrder = 2;
  g.add(shell);
  for (const [y, h] of [[0.02, 0.05], [GLASS_H + 0.04, 0.05]]) {
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.035, 6, 10, Math.PI / 2), mat.glassFrame);
    rail.rotation.x = -Math.PI / 2;
    rail.rotation.z = -(a0 + Math.PI / 2) + Math.PI / 2;
    rail.position.set(cx, y + h / 2, cz);
    g.add(rail);
  }
  // approximate the curve for collision with three short chords
  if (collide) {
    for (let i = 0; i < 6; i++) {
      const a = a0 + (Math.PI / 2) * ((i + 0.5) / 6);
      const px = cx + Math.sin(a) * r, pz = cz + Math.cos(a) * r;
      collide.push({ x0: px - 0.16, x1: px + 0.16, z0: pz - 0.16, z1: pz + 0.16 });
    }
  }
}

export function buildCapsule(ctx) {
  const g = new THREE.Group();
  g.name = 'capsule';
  const C = PL.CAPSULE;
  const collide = ctx.blockers;

  const x0 = wx(C.shell.x0), x1 = wx(C.shell.x1);
  const z0 = wz(C.shell.y0), z1 = wz(C.shell.y1);
  const r = wl(C.shell.r);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  /* ---- glass shell ---- */
  const glassShell = new THREE.Group(); glassShell.name = 'glassShell';
  const spanX = (x1 - r) - (x0 + r);
  const spanZ = (z1 - r) - (z0 + r);
  straightGlass(glassShell, cx, z0, spanX, 'x', collide);              // north
  straightGlass(glassShell, cx, z1, spanX, 'x', collide);              // south
  straightGlass(glassShell, x1, cz, spanZ, 'z', collide);              // east

  // west face is split by the entrance
  const dz0 = wz(C.door.y0), dz1 = wz(C.door.y1);
  const wTop = dz0 - (z0 + r), wBot = (z1 - r) - dz1;
  straightGlass(glassShell, x0, (z0 + r + dz0) / 2, wTop, 'z', collide);
  straightGlass(glassShell, x0, (dz1 + z1 - r) / 2, wBot, 'z', collide);
  // entrance reveal
  for (const dz of [dz0, dz1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, GLASS_H + 0.1, 0.14), mat.shellWhite);
    jamb.position.set(x0, (GLASS_H + 0.1) / 2, dz);
    glassShell.add(jamb);
  }

  cornerGlass(glassShell, x0 + r, z0 + r, r, Math.PI, collide);
  cornerGlass(glassShell, x1 - r, z0 + r, r, Math.PI / 2, collide);
  cornerGlass(glassShell, x1 - r, z1 - r, r, 0, collide);
  cornerGlass(glassShell, x0 + r, z1 - r, r, -Math.PI / 2, collide);
  g.add(glassShell);

  /* ---- curved display at the north end ---- */
  const s = C.screen;
  const screenGroup = new THREE.Group(); screenGroup.name = 'curvedDisplay';
  const scr = capsuleScreen(wl(s.x1 - s.x0), s.h, wl(s.sag));
  scr.position.set((wx(s.x0) + wx(s.x1)) / 2, s.base, wz(s.y));
  scr.rotation.x = -0.20;          // canted back, as in the reference render
  screenGroup.add(scr);
  const plinth = new THREE.Mesh(
    roundedBox(wl(s.x1 - s.x0) * 0.94, s.base, 0.42, 0.05, 0.02), mat.shellWhite);
  plinth.position.set((wx(s.x0) + wx(s.x1)) / 2, 0, wz(s.y) + 0.12);
  plinth.castShadow = true;
  screenGroup.add(plinth);
  const wash = new THREE.PointLight(0x7f8fe0, 4.5, 7, 2);
  wash.position.set((wx(s.x0) + wx(s.x1)) / 2, 1.6, wz(s.y) + 1.1);
  screenGroup.add(wash);
  g.add(screenGroup);
  // only the plinth under the display is a real obstruction
  collide.push({
    x0: wx(s.x0) + 0.14, x1: wx(s.x1) - 0.14,
    z0: wz(s.y) - 0.09, z1: wz(s.y) + 0.33,
  });

  /* ---- U-shaped sofa facing the display ---- */
  const sofaGroup = new THREE.Group(); sofaGroup.name = 'sofa';
  const pts = C.sofaU.map((p) => new THREE.Vector3(wx(p.x), 0, wz(p.y)));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = a.distanceTo(b);
    // no arms on the runs, and + PI so the backs land on the outside of the U
    const seg = sofa(len + 0.34, 0.92, false);
    seg.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    seg.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x) + Math.PI;
    sofaGroup.add(seg);
    // trace the sofa run with small boxes rather than one fat bounding box,
    // so the diagonal arms do not swallow the floor around them
    const steps = Math.max(2, Math.round(len / 0.45));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
      collide.push({ x0: px - 0.34, x1: px + 0.34, z0: pz - 0.34, z1: pz + 0.34 });
    }
  }
  // outer arms close the two open ends of the U
  for (const [end, other] of [[pts[0], pts[1]], [pts[3], pts[2]]]) {
    const arm = new THREE.Mesh(roundedBox(0.4, 0.68, 0.98, 0.12, 0.03), mat.fabric);
    arm.position.set(end.x, 0, end.z);
    arm.rotation.y = -Math.atan2(other.z - end.z, other.x - end.x) + Math.PI;
    arm.castShadow = true;
    sofaGroup.add(arm);
  }
  g.add(sofaGroup);

  /* ---- tables, chairs, plinths ---- */
  const tables = new THREE.Group(); tables.name = 'tables';
  for (const t of C.roundTables) {
    const m = roundTable(wl(t.r), t.h);
    m.position.set(wx(t.x), 0, wz(t.y));
    tables.add(m);
    const rr = wl(t.r) * 0.8;
    collide.push({ x0: wx(t.x) - rr, x1: wx(t.x) + rr, z0: wz(t.y) - rr, z1: wz(t.y) + rr });
  }
  g.add(tables);

  for (const c of C.chairs) {
    const m = loungeCube(0.74);
    m.position.set(wx(c.x), 0, wz(c.y));
    m.rotation.y = c.rot;
    g.add(m);
    collide.push({ x0: wx(c.x) - 0.34, x1: wx(c.x) + 0.34, z0: wz(c.y) - 0.34, z1: wz(c.y) + 0.34 });
  }

  for (const p of C.plinths) {
    const w = wl(p.x1 - p.x0), d = wl(p.y1 - p.y0);
    const m = credenza(w, d, 0.94);
    m.position.set((wx(p.x0) + wx(p.x1)) / 2, 0, (wz(p.y0) + wz(p.y1)) / 2);
    g.add(m);
    collide.push({ x0: wx(p.x0), x1: wx(p.x1), z0: wz(p.y0), z1: wz(p.y1) });
  }

  const sb = C.southBench;
  const b = bench(wl(sb.x1 - sb.x0), wl(sb.y1 - sb.y0), 0.46);
  b.position.set((wx(sb.x0) + wx(sb.x1)) / 2, 0, (wz(sb.y0) + wz(sb.y1)) / 2);
  g.add(b);
  collide.push({ x0: wx(sb.x0), x1: wx(sb.x1), z0: wz(sb.y0), z1: wz(sb.y1) });

  const sd = C.southDisplay;
  const disp = new THREE.Mesh(
    roundedBox(wl(sd.x1 - sd.x0), 0.34, 0.16, 0.02, 0.008), mat.screen);
  disp.position.set((wx(sd.x0) + wx(sd.x1)) / 2, 0.06, wz(sd.y));
  g.add(disp);

  /* ---- corner planting ---- */
  const planters = new THREE.Group(); planters.name = 'planters';
  for (const p of C.planters) {
    const trough = new THREE.Mesh(roundedBox(0.62, 0.40, 0.62, 0.06, 0.02), mat.shellWhite);
    trough.position.set(wx(p.x), 0, wz(p.y));
    trough.castShadow = true;
    planters.add(trough);
    const pl = plant(1.05);
    pl.position.set(wx(p.x), 0.34, wz(p.y));
    planters.add(pl);
    collide.push({ x0: wx(p.x) - 0.34, x1: wx(p.x) + 0.34, z0: wz(p.y) - 0.34, z1: wz(p.y) + 0.34 });
  }
  g.add(planters);

  return g;
}
