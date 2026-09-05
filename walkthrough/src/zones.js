/**
 * zones.js — places every furniture group from plan.js into the world.
 * Named groups mirror the zoning of the reference so the scene stays editable:
 *   prowessZone / peopleZone / pantry / discussionRoom / centralMeetingRooms /
 *   rightMeetingRooms / rearLounge / vegetation / frontMedia
 */
import * as THREE from 'three';
import * as PL from './plan.js';
import { mat, screenMaterials } from './materials.js';
import { roundedBox, drum, roundedTriangle } from './geom.js';
import {
  chair, meetingTable, roundTable, credenza, sofa, bench, loungeCube,
  prowessPod, curvedCounter, plant, planterTrough, flatScreen,
  pantryRun, counterRun, tier,
} from './furniture.js';

const { wx, wz, wl } = PL;
const V = (px, py) => new THREE.Vector3(wx(px), 0, wz(py));

function block(collide, x0, y0, x1, y1, pad = 0) {
  collide.push({
    x0: wx(Math.min(x0, x1)) - pad, x1: wx(Math.max(x0, x1)) + pad,
    z0: wz(Math.min(y0, y1)) - pad, z1: wz(Math.max(y0, y1)) + pad,
  });
}

/** Seats a rectangular table according to a {west,east,north,south} count. */
function seatTable(group, collide, t, seats) {
  const w = wl(t.w), d = wl(t.d);
  const cx = wx(t.x), cz = wz(t.y);
  // chairs are light and movable, so they are not part of the collision world -
  // tables, cabinetry, sofas, pods, walls and glass all still block.
  const put = (x, z, rot) => {
    const c = chair();
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    group.add(c);
  };
  const spread = (n, span) => Array.from({ length: n },
    (_, i) => -span / 2 + (span / n) * (i + 0.5));
  for (const z of spread(seats.west || 0, d - 0.35)) put(cx - w / 2 - 0.36, cz + z, Math.PI / 2);
  for (const z of spread(seats.east || 0, d - 0.35)) put(cx + w / 2 + 0.36, cz + z, -Math.PI / 2);
  for (const x of spread(seats.north || 0, w - 0.35)) put(cx + x, cz - d / 2 - 0.36, Math.PI);
  for (const x of spread(seats.south || 0, w - 0.35)) put(cx + x, cz + d / 2 + 0.36, 0);
}

function buildMeetingRoom(spec, collide) {
  const g = new THREE.Group();
  g.name = spec.id;
  const t = meetingTable(wl(spec.table.w), wl(spec.table.d));
  t.position.set(wx(spec.table.x), 0, wz(spec.table.y));
  g.add(t);
  block(collide, spec.table.x - spec.table.w / 2, spec.table.y - spec.table.d / 2,
    spec.table.x + spec.table.w / 2, spec.table.y + spec.table.d / 2);
  seatTable(g, collide, spec.table, spec.seats);
  for (const key of ['credenza', 'credenza2']) {
    const c = spec[key];
    if (!c) continue;
    const m = credenza(wl(c.x1 - c.x0), wl(c.y1 - c.y0), 0.74);
    m.position.set((wx(c.x0) + wx(c.x1)) / 2, 0, (wz(c.y0) + wz(c.y1)) / 2);
    g.add(m);
    block(collide, c.x0, c.y0, c.x1, c.y1);
  }
  if (spec.tablePlant) {
    const p = plant(0.8);
    p.position.set(wx(spec.tablePlant.x), 0.74, wz(spec.tablePlant.y));
    g.add(p);
  }
  return g;
}

/* ------------------------------------------------------------------ */

export function buildZones(ctx) {
  const root = new THREE.Group();
  root.name = 'zones';
  const collide = ctx.blockers;
  const S = screenMaterials();

  /* ---------------- PROWESS / POD CLUSTER ---------------- */
  const prowess = new THREE.Group(); prowess.name = 'prowessZone';
  const rotFor = { se: 0, ne: Math.PI / 2, sw: -Math.PI / 2, nw: Math.PI };
  PL.PROWESS.pods.forEach((p, i) => {
    const w = wl(p.x1 - p.x0), d = wl(p.y1 - p.y0);
    const pod = prowessPod(w, d);
    pod.name = `pod0${i + 1}`;
    pod.position.set((wx(p.x0) + wx(p.x1)) / 2, 0, (wz(p.y0) + wz(p.y1)) / 2);
    pod.rotation.y = rotFor[p.open];
    prowess.add(pod);
    block(collide, p.x0, p.y0, p.x1, p.y1);
  });

  const pt = PL.PROWESS.table;
  const centralTable = new THREE.Group(); centralTable.name = 'centralTable';
  const top = new THREE.Mesh(roundedTriangle(wl(pt.r), 0.05), mat.timber);
  top.position.set(wx(pt.x), 0.70, wz(pt.y));
  top.rotation.y = pt.rot;
  top.castShadow = true;
  centralTable.add(top);
  const stem = new THREE.Mesh(drum(wl(pt.r) * 0.2, 0.70, 14), mat.timberDeep);
  stem.position.set(wx(pt.x), 0, wz(pt.y));
  centralTable.add(stem);
  const foot = new THREE.Mesh(drum(wl(pt.r) * 0.5, 0.035, 20), mat.timberDeep);
  foot.position.set(wx(pt.x), 0, wz(pt.y));
  centralTable.add(foot);
  prowess.add(centralTable);
  block(collide, pt.x - pt.r, pt.y - pt.r, pt.x + pt.r, pt.y + pt.r);

  // subtle rotated floor inlay under the cluster
  const inlay = new THREE.Mesh(
    new THREE.PlaneGeometry(wl(PL.PROWESS.inlay.r), wl(PL.PROWESS.inlay.r)), mat.floorInlay);
  inlay.rotation.x = -Math.PI / 2;
  inlay.rotation.z = PL.PROWESS.inlay.rot;
  inlay.position.set(wx(PL.PROWESS.inlay.x), 0.004, wz(PL.PROWESS.inlay.y));
  inlay.receiveShadow = true;
  prowess.add(inlay);

  for (const c of [...PL.PROWESS.innerChairs, ...PL.PROWESS.outerChairs]) {
    const m = chair();
    m.position.set(wx(c.x), 0, wz(c.y));
    m.rotation.y = c.rot;
    prowess.add(m);
  }
  root.add(prowess);

  /* ---------------- PEOPLE / PRESENTATION ---------------- */
  const people = new THREE.Group(); people.name = 'peopleZone';
  const cc = PL.PEOPLE.counter;
  const counter = curvedCounter(wl(cc.r0), wl(cc.r1), cc.a0, cc.a1, 1.05);
  counter.position.set(wx(cc.x), 0, wz(cc.y));
  people.add(counter);
  // collision ring approximating the crescent
  for (let i = 0; i <= 14; i++) {
    const a = cc.a0 + (cc.a1 - cc.a0) * (i / 14);
    const rx = wx(cc.x) + Math.cos(a) * wl((cc.r0 + cc.r1) / 2);
    const rz = wz(cc.y) + Math.sin(a) * wl((cc.r0 + cc.r1) / 2);
    collide.push({ x0: rx - 0.28, x1: rx + 0.28, z0: rz - 0.28, z1: rz + 0.28 });
  }
  for (const s of PL.PEOPLE.counterChairs) {
    const m = chair();
    const px = wx(s.x) + Math.cos(s.a) * wl(s.r);
    const pz = wz(s.y) + Math.sin(s.a) * wl(s.r);
    m.position.set(px, 0, pz);
    m.rotation.y = -s.a + Math.PI / 2;
    people.add(m);
  }
  const circle = new THREE.Mesh(new THREE.CircleGeometry(wl(PL.PEOPLE.inlay.r), 48),
    mat.floorInlay);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(wx(PL.PEOPLE.inlay.x), 0.003, wz(PL.PEOPLE.inlay.y));
  circle.receiveShadow = true;
  people.add(circle);

  for (const t of PL.PEOPLE.tiers) {
    const m = tier(wl(t.x1 - t.x0), wl(t.y1 - t.y0), t.h);
    m.position.set((wx(t.x0) + wx(t.x1)) / 2, 0, (wz(t.y0) + wz(t.y1)) / 2);
    people.add(m);
    block(collide, t.x0, t.y0, t.x1, t.y1);
  }
  for (const d of PL.PEOPLE.drums) {
    const m = new THREE.Mesh(drum(wl(d.r), d.h, 22),
      d.tone === 'timber' ? mat.timber : mat.shellWhite);
    m.position.set(wx(d.x), d.base ?? 0, wz(d.y));
    m.castShadow = true;
    people.add(m);
  }
  const st = PL.PEOPLE.stool;
  const stool = new THREE.Mesh(drum(wl(st.r), st.h, 20), mat.shellWhite);
  stool.position.set(wx(st.x), 0, wz(st.y));
  people.add(stool);

  const pb = PL.PEOPLE.bench;
  const pbm = bench(wl(pb.x1 - pb.x0), wl(pb.y1 - pb.y0), pb.h);
  pbm.position.set((wx(pb.x0) + wx(pb.x1)) / 2, 0, (wz(pb.y0) + wz(pb.y1)) / 2);
  people.add(pbm);
  block(collide, pb.x0, pb.y0, pb.x1, pb.y1);
  for (const d of PL.PEOPLE.benchDrums) {
    const m = new THREE.Mesh(drum(wl(d.r), 0.12, 16), mat.screen);
    m.position.set(wx(d.x), pb.h, wz(d.y));
    people.add(m);
  }

  // stepped element at the front edge
  const sr = PL.PEOPLE.stair;
  const treads = 5, tw = wl(sr.x1 - sr.x0), td = wl(sr.y1 - sr.y0) / treads;
  for (let i = 0; i < treads; i++) {
    const h = 0.12 + i * 0.11;
    const m = new THREE.Mesh(roundedBox(tw, h, td, 0.015, 0.006), mat.timber);
    m.position.set((wx(sr.x0) + wx(sr.x1)) / 2, 0,
      wz(sr.y1) - td * (i + 0.5));
    m.receiveShadow = true;
    m.castShadow = true;
    people.add(m);
  }
  block(collide, sr.x0, sr.y0, sr.x1, sr.y1);
  root.add(people);

  /* ---------------- WEST WALL WORKSTATIONS ---------------- */
  const west = new THREE.Group(); west.name = 'westWall';
  for (const d of PL.WEST_WALL.desks) {
    const m = counterRun(wl(d.x1 - d.x0), wl(d.y1 - d.y0), 0.74);
    m.position.set((wx(d.x0) + wx(d.x1)) / 2, 0, (wz(d.y0) + wz(d.y1)) / 2);
    west.add(m);
    block(collide, d.x0, d.y0, d.x1, d.y1);
  }
  for (const c of PL.WEST_WALL.deskChairs) {
    const m = chair();
    m.position.set(wx(c.x), 0, wz(c.y));
    m.rotation.y = c.rot;
    west.add(m);
  }
  for (const s of PL.WEST_WALL.screens) {
    const h = s.kind === 'amber' ? 1.35 : 1.05;
    const m = flatScreen(wl(s.y1 - s.y0), h, s.kind);
    m.rotation.y = Math.PI / 2;
    m.position.set(wx(PL.PLATE.x0) + 0.14, s.kind === 'amber' ? 0.55 : 0.85,
      (wz(s.y0) + wz(s.y1)) / 2);
    west.add(m);
  }
  root.add(west);

  /* ---------------- PANTRY ---------------- */
  const pantry = new THREE.Group(); pantry.name = 'pantry';
  const PT = PL.PANTRY;
  const tall = pantryRun(wl(PT.tallRun.x1 - PT.tallRun.x0), wl(PT.tallRun.y1 - PT.tallRun.y0), 2.25);
  tall.position.set((wx(PT.tallRun.x0) + wx(PT.tallRun.x1)) / 2, 0,
    (wz(PT.tallRun.y0) + wz(PT.tallRun.y1)) / 2);
  pantry.add(tall);
  block(collide, PT.tallRun.x0, PT.tallRun.y0, PT.tallRun.x1, PT.tallRun.y1);
  const ctr = counterRun(wl(PT.counter.x1 - PT.counter.x0), wl(PT.counter.y1 - PT.counter.y0));
  ctr.position.set((wx(PT.counter.x0) + wx(PT.counter.x1)) / 2, 0,
    (wz(PT.counter.y0) + wz(PT.counter.y1)) / 2);
  pantry.add(ctr);
  block(collide, PT.counter.x0, PT.counter.y0, PT.counter.x1, PT.counter.y1);
  const island = counterRun(wl(PT.island.x1 - PT.island.x0), wl(PT.island.y1 - PT.island.y0), 0.94);
  island.position.set((wx(PT.island.x0) + wx(PT.island.x1)) / 2, 0,
    (wz(PT.island.y0) + wz(PT.island.y1)) / 2);
  pantry.add(island);
  block(collide, PT.island.x0, PT.island.y0, PT.island.x1, PT.island.y1);
  const app = new THREE.Mesh(roundedBox(0.42, 0.46, 0.36, 0.03, 0.01), mat.screen);
  app.position.set(wx(PT.appliance.x), 0.92, wz(PT.appliance.y));
  pantry.add(app);
  root.add(pantry);

  /* ---------------- ENCLOSED DISCUSSION ROOM ---------------- */
  const disc = new THREE.Group(); disc.name = 'discussionRoom';
  const D = PL.DISCUSSION;
  const dt = meetingTable(wl(D.table.w), wl(D.table.d));
  dt.position.set(wx(D.table.x), 0, wz(D.table.y));
  disc.add(dt);
  block(collide, D.table.x - D.table.w / 2, D.table.y - D.table.d / 2,
    D.table.x + D.table.w / 2, D.table.y + D.table.d / 2);
  seatTable(disc, collide, D.table, D.seats);
  const dscr = flatScreen(wl(D.display.w), D.display.h, D.display.kind);
  dscr.rotation.y = -Math.PI / 2;
  dscr.position.set(wx(D.display.x) - 0.12, 0.55, wz(D.display.y));
  disc.add(dscr);
  root.add(disc);

  /* ---------------- UTILITY VOLUME ---------------- */
  const util = new THREE.Group(); util.name = 'utility';
  for (const s of PL.UTILITY.shelves) {
    const m = credenza(wl(s.x1 - s.x0), wl(s.y1 - s.y0), s.h);
    m.position.set((wx(s.x0) + wx(s.x1)) / 2, 0, (wz(s.y0) + wz(s.y1)) / 2);
    util.add(m);
    block(collide, s.x0, s.y0, s.x1, s.y1);
  }
  root.add(util);

  /* ---------------- MEETING ROOMS ---------------- */
  const centralRooms = new THREE.Group(); centralRooms.name = 'centralMeetingRooms';
  for (const spec of PL.CENTRAL_ROOMS) centralRooms.add(buildMeetingRoom(spec, collide));
  root.add(centralRooms);

  const rightRooms = new THREE.Group(); rightRooms.name = 'rightMeetingRooms';
  for (const spec of PL.RIGHT_ROOMS) rightRooms.add(buildMeetingRoom(spec, collide));
  // magenta feature display on the east wall of meeting R3
  const mag = flatScreen(3.0, 1.9, 'magenta');
  mag.rotation.y = -Math.PI / 2;
  mag.position.set(wx(PL.PLATE.x1) - 0.14, 0.65, wz(950));
  rightRooms.add(mag);
  root.add(rightRooms);

  /* ---------------- REAR LOUNGE ---------------- */
  const lounge = new THREE.Group(); lounge.name = 'rearLounge';
  for (const s of PL.REAR_LOUNGE.sofas) {
    const m = sofa(wl(s.len), 0.86);
    m.position.set(wx(s.x), 0, wz(s.y));
    m.rotation.y = { n: 0, s: Math.PI, w: -Math.PI / 2, e: Math.PI / 2 }[s.back];
    lounge.add(m);
    const halfL = wl(s.len) / 2, halfD = 0.45;
    const ex = s.dir === 'h' ? halfL : halfD;
    const ez = s.dir === 'h' ? halfD : halfL;
    collide.push({ x0: wx(s.x) - ex, x1: wx(s.x) + ex, z0: wz(s.y) - ez, z1: wz(s.y) + ez });
  }
  for (const t of PL.REAR_LOUNGE.tables) {
    const m = roundTable(wl(t.r), t.h);
    m.position.set(wx(t.x), 0, wz(t.y));
    lounge.add(m);
    // round tables block on their true circle, not their bounding square
    const rr = wl(t.r) * 0.8;
    collide.push({ x0: wx(t.x) - rr, x1: wx(t.x) + rr, z0: wz(t.y) - rr, z1: wz(t.y) + rr });
  }
  root.add(lounge);

  /* ---------------- FRONT MEDIA ---------------- */
  const frontMedia = new THREE.Group(); frontMedia.name = 'frontMedia';
  const fb = PL.FRONT_MEDIA.bench;
  const fbm = new THREE.Mesh(
    roundedBox(wl(fb.x1 - fb.x0), fb.h, wl(fb.y1 - fb.y0), 0.03, 0.012), mat.timber);
  fbm.position.set((wx(fb.x0) + wx(fb.x1)) / 2, 0, (wz(fb.y0) + wz(fb.y1)) / 2);
  fbm.castShadow = true;
  frontMedia.add(fbm);
  block(collide, fb.x0, fb.y0, fb.x1, fb.y1);
  root.add(frontMedia);

  /* ---------------- WALL SCREENS ---------------- */
  const screens = new THREE.Group(); screens.name = 'wallScreens';
  for (const s of PL.SCREENS) {
    const m = flatScreen(wl(s.x1 - s.x0), s.h, s.kind);
    m.position.set((wx(s.x0) + wx(s.x1)) / 2, s.base, wz(s.y) + (s.facing === 'n' ? -0.12 : 0.12));
    m.rotation.y = s.facing === 'n' ? Math.PI : 0;
    screens.add(m);
  }
  root.add(screens);

  /* ---------------- VEGETATION ---------------- */
  const veg = new THREE.Group(); veg.name = 'vegetation';
  for (const p of PL.PLANTS) {
    const m = plant(1);
    m.position.set(wx(p.x), 0, wz(p.y));
    veg.add(m);
    collide.push({ x0: wx(p.x) - 0.16, x1: wx(p.x) + 0.16, z0: wz(p.y) - 0.16, z1: wz(p.y) + 0.16 });
  }
  const fp = PL.FRONT_PLANTER;
  const trough = planterTrough(wl(fp.x1 - fp.x0), wl(fp.y1 - fp.y0), fp.count);
  trough.position.set((wx(fp.x0) + wx(fp.x1)) / 2, 0, (wz(fp.y0) + wz(fp.y1)) / 2);
  veg.add(trough);
  block(collide, fp.x0, fp.y0, fp.x1, fp.y1);
  for (const p of PL.PLANTERS) {
    const t = planterTrough(wl(p.x1 - p.x0), wl(p.y1 - p.y0), 4);
    t.position.set((wx(p.x0) + wx(p.x1)) / 2, 0, (wz(p.y0) + wz(p.y1)) / 2);
    veg.add(t);
    block(collide, p.x0, p.y0, p.x1, p.y1);
  }
  root.add(veg);

  return root;
}
