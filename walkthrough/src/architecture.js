/**
 * architecture.js — floor plate, shell, partitions, glazing, rear blue feature
 * and the lift lobby. All geometry is driven by plan.js.
 */
import * as THREE from 'three';
import * as PL from './plan.js';
import { mat, screenMaterials, walnutTexture } from './materials.js';
import { roundedBox } from './geom.js';
import { pantryRun, counterRun, flatScreen } from './furniture.js';

const { wx, wz, wl, WALL_H, GLASS_H, CEIL_H, PLATE, LOBBY, REAR } = PL;

/** Build one axis-aligned wall from a reference-pixel segment. */
function wallFromSegment(seg, thickness, height, material, collide, baseY = 0) {
  const [ax, ay, bx, by] = seg;
  const x0 = wx(Math.min(ax, bx)), x1 = wx(Math.max(ax, bx));
  const z0 = wz(Math.min(ay, by)), z1 = wz(Math.max(ay, by));
  const horizontal = Math.abs(bx - ax) > Math.abs(by - ay);
  const w = horizontal ? (x1 - x0) + thickness : thickness;
  const d = horizontal ? thickness : (z1 - z0) + thickness;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), material);
  m.position.set(cx, baseY + height / 2, cz);
  m.castShadow = true;
  m.receiveShadow = true;
  if (collide) collide.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  return m;
}

/** A slim shadow-gap skirting at the base of a wall run - cheap, reads premium. */
function skirting(seg, thickness) {
  return wallFromSegment(seg, thickness + 0.03, 0.085, mat.skirting, null, 0);
}

/** Vertical mullions along a glazed run so the glass reads as architecture. */
function mullions(seg, height, spacing = 1.7) {
  const g = new THREE.Group();
  const [ax, ay, bx, by] = seg;
  const horizontal = Math.abs(bx - ax) > Math.abs(by - ay);
  const a = horizontal ? wx(Math.min(ax, bx)) : wz(Math.min(ay, by));
  const b = horizontal ? wx(Math.max(ax, bx)) : wz(Math.max(ay, by));
  const fixed = horizontal ? wz(ay) : wx(ax);
  const n = Math.max(1, Math.round((b - a) / spacing));
  const geo = new THREE.BoxGeometry(0.045, height, 0.045);
  for (let i = 0; i <= n; i++) {
    const t = a + ((b - a) * i) / n;
    const m = new THREE.Mesh(geo, mat.glassFrame);
    m.position.set(horizontal ? t : fixed, height / 2, horizontal ? fixed : t);
    g.add(m);
  }
  return g;
}

function slab(x0px, y0px, x1px, y1px, y, thickness, material) {
  const w = wl(x1px - x0px), d = wl(y1px - y0px);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), material);
  m.position.set((wx(x0px) + wx(x1px)) / 2, y - thickness / 2, (wz(y0px) + wz(y1px)) / 2);
  m.receiveShadow = true;
  return m;
}

export function buildArchitecture(ctx) {
  const g = new THREE.Group();
  g.name = 'architecture';
  const collide = ctx.blockers;

  /* ---------------- floor plate ---------------- */
  const mainFloor = new THREE.Group(); mainFloor.name = 'mainFloor';
  mainFloor.add(slab(PLATE.x0, PLATE.y0, PLATE.x1, PLATE.y1, 0, 0.24, mat.floor));
  mainFloor.add(slab(LOBBY.x0, LOBBY.y0, LOBBY.x1, PLATE.y0, 0, 0.24, mat.floor));
  // service strip behind the rear glazing that carries the blue light wash
  mainFloor.add(slab(PLATE.x0, REAR.shellY, PLATE.x1, REAR.glassY, 0, 0.24, mat.wallSoft));
  g.add(mainFloor);

  ctx.walkable.push(
    { x0: wx(PLATE.x0), x1: wx(PLATE.x1), z0: wz(PLATE.y0), z1: wz(PLATE.y1) },
    { x0: wx(LOBBY.x0), x1: wx(LOBBY.x1), z0: wz(LOBBY.y0), z1: wz(PLATE.y0) },
  );

  /* ---------------- shell ---------------- */
  const shell = new THREE.Group(); shell.name = 'shell';
  for (const seg of PL.SHELL_WALLS) {
    const isRear = seg[1] === PLATE.y0 && seg[3] === PLATE.y0;
    if (isRear) continue;                       // rear is glazed, handled below
    shell.add(wallFromSegment(seg, 0.24, CEIL_H, mat.wall, collide));
    shell.add(skirting(seg, 0.24));
  }
  g.add(shell);

  /* ---------------- rear blue feature wall ---------------- */
  const rearWall = new THREE.Group(); rearWall.name = 'rearWall';
  const rearSpans = [[PLATE.x0, LOBBY.x0], [LOBBY.x1, PLATE.x1]];
  for (const [a, b] of rearSpans) {
    // clear glazed screen on the office side
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(wl(b - a), GLASS_H, 0.05), mat.glass);
    glass.position.set((wx(a) + wx(b)) / 2, GLASS_H / 2 + 0.05, wz(REAR.glassY));
    glass.renderOrder = 2;
    rearWall.add(glass);
    rearWall.add(wallFromSegment([a, REAR.glassY, b, REAR.glassY], 0.14, 0.18, mat.wall, collide));
    rearWall.add(wallFromSegment([a, REAR.glassY, b, REAR.glassY], 0.14,
      CEIL_H - GLASS_H - 0.05, mat.wall, null, GLASS_H + 0.05));


    // the long pale-blue illuminated plane, set 1.3 m behind the glass
    const blue = new THREE.Mesh(new THREE.BoxGeometry(wl(b - a), 2.25, 0.1), mat.blueWall);
    blue.position.set((wx(a) + wx(b)) / 2, 1.42, wz(REAR.blueY));
    rearWall.add(blue);
    const glow = new THREE.PointLight(0xa8d8f5, 6, 9, 2);
    glow.position.set((wx(a) + wx(b)) / 2, 1.5, wz(REAR.blueY) + 0.5);
    rearWall.add(glow);

    // outer white shell of the model behind the light plane
    rearWall.add(wallFromSegment([a, REAR.shellY, b, REAR.shellY], 0.3, CEIL_H, mat.wall, null));
  }
  g.add(rearWall);

  /* ---------------- partitions ---------------- */
  const partitions = new THREE.Group(); partitions.name = 'partitions';
  for (const seg of PL.PARTITIONS) {
    partitions.add(wallFromSegment(seg, 0.2, WALL_H, mat.wall, collide));
    partitions.add(skirting(seg, 0.2));
  }
  // timber facing on the circulation side of the spine wall and the slat partition
  partitions.add(wallFromSegment([765, 500, 765, 800], 0.06, WALL_H - 0.1,
    mat.timber, null).translateX(-0.13));
  const slat = wallFromSegment([610, 905, 610, 1155], 0.06, WALL_H - 0.1, mat.timber, null);
  slat.translateX(-0.13);
  partitions.add(slat);
  g.add(partitions);

  /* ---------------- glazing ---------------- */
  const glazing = new THREE.Group(); glazing.name = 'glazing';
  for (const seg of PL.GLAZING) {
    const pane = wallFromSegment(seg, 0.04, GLASS_H, mat.glass, collide);
    pane.renderOrder = 2;
    pane.castShadow = false;
    glazing.add(pane);
    // slim head rail so the glass reads as architecture
    glazing.add(wallFromSegment(seg, 0.07, 0.06, mat.glassFrame, null, GLASS_H));
    glazing.add(wallFromSegment(seg, 0.07, 0.05, mat.glassFrame, null, 0));
    glazing.add(mullions(seg, GLASS_H));
    // white bulkhead above the glass
    glazing.add(wallFromSegment(seg, 0.16, CEIL_H - GLASS_H - 0.06, mat.wall, null,
      GLASS_H + 0.06));
  }
  g.add(glazing);

  /* ---------------- lift lobby ---------------- */
  g.add(buildLiftLobby(collide));

  /* ---------------- ceiling ---------------- */
  g.add(buildCeiling(ctx));

  return g;
}

function buildLiftLobby(collide) {
  const g = new THREE.Group(); g.name = 'liftLobby';
  const L = PL.LIFT;

  for (const bank of L.banks) {
    // pale timber lift-bank wall
    const w = wl(bank.x1 - bank.x0);
    const panel = new THREE.Mesh(roundedBox(w, 2.85, 0.34, 0.02, 0.01), mat.timber);
    panel.position.set((wx(bank.x0) + wx(bank.x1)) / 2, 0, wz(bank.y) + 0.17);
    panel.castShadow = true; panel.receiveShadow = true;
    g.add(panel);
    collide.push({
      x0: wx(bank.x0), x1: wx(bank.x1),
      z0: wz(bank.y), z1: wz(bank.y) + 0.36,
    });
    for (const [d0, d1] of bank.doors) {
      const dw = wl(d1 - d0);
      const door = new THREE.Mesh(new THREE.BoxGeometry(dw, 2.35, 0.04), mat.metal);
      door.position.set((wx(d0) + wx(d1)) / 2, 1.18, wz(bank.y) + 0.35);
      g.add(door);
      const split = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.35, 0.02), mat.wallSoft);
      split.position.set((wx(d0) + wx(d1)) / 2, 1.18, wz(bank.y) + 0.375);
      g.add(split);
      const surround = new THREE.Mesh(
        new THREE.BoxGeometry(dw + 0.14, 2.5, 0.05), mat.shellWhite);
      surround.position.set((wx(d0) + wx(d1)) / 2, 1.25, wz(bank.y) + 0.33);
      g.add(surround);
    }
  }

  // central white pier between the two banks
  const p = L.pier;
  const pier = new THREE.Mesh(
    roundedBox(wl(p.x1 - p.x0), 2.9, wl(p.y1 - p.y0), 0.03, 0.012), mat.shellWhite);
  pier.position.set((wx(p.x0) + wx(p.x1)) / 2, 0, (wz(p.y0) + wz(p.y1)) / 2);
  pier.castShadow = true;
  g.add(pier);
  collide.push({ x0: wx(p.x0), x1: wx(p.x1), z0: wz(p.y0), z1: wz(p.y1) });

  // pale timber wing walls stepping forward into the arrival space
  for (const [x0, y0, x1, y1] of L.fins) {
    const fin = new THREE.Mesh(
      roundedBox(wl(x1 - x0), 2.85, wl(y1 - y0), 0.02, 0.01), mat.timber);
    fin.position.set((wx(x0) + wx(x1)) / 2, 0, (wz(y0) + wz(y1)) / 2);
    fin.castShadow = true; fin.receiveShadow = true;
    g.add(fin);
    collide.push({ x0: wx(x0), x1: wx(x1), z0: wz(y0), z1: wz(y1) });
  }

  // warm downlight in the arrival space
  const l = new THREE.PointLight(0xfff0dc, 9, 11, 2);
  l.position.set(wx(L.spawn.x), 2.7, wz(L.spawn.y));
  g.add(l);
  return g;
}

function buildCeiling(ctx) {
  const g = new THREE.Group(); g.name = 'ceiling';
  const w = wl(PLATE.x1 - PLATE.x0), d = wl(PLATE.y1 - PLATE.y0);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.ceiling);
  plane.rotation.x = Math.PI / 2;
  plane.position.set((wx(PLATE.x0) + wx(PLATE.x1)) / 2, CEIL_H,
    (wz(PLATE.y0) + wz(PLATE.y1)) / 2);
  g.add(plane);
  const lob = new THREE.Mesh(
    new THREE.PlaneGeometry(wl(LOBBY.x1 - LOBBY.x0), wl(PLATE.y0 - LOBBY.y0)), mat.ceiling);
  lob.rotation.x = Math.PI / 2;
  lob.position.set((wx(LOBBY.x0) + wx(LOBBY.x1)) / 2, CEIL_H,
    (wz(LOBBY.y0) + wz(PLATE.y0)) / 2);
  g.add(lob);

  // recessed linear light panels on a calm grid
  const panel = new THREE.PlaneGeometry(3.2, 0.34);
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 4; j++) {
      const x = wx(PLATE.x0) + 2.2 + i * 3.65;
      const z = wz(PLATE.y0) + 1.9 + j * 3.3;
      const m = new THREE.Mesh(panel, mat.ceilingLight);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, CEIL_H - 0.012, z);
      g.add(m);
    }
  }
  ctx.ceiling = g;
  return g;
}

/** The dark walnut tabletop the scale model sits on — only used by the intro. */
export function buildTabletop() {
  const g = new THREE.Group();
  g.name = 'tabletop';
  if (!mat.walnut.map) {
    mat.walnut.map = walnutTexture();
    mat.walnut.color.setHex(0xffffff);
    mat.walnut.needsUpdate = true;
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(96, 2.4, 62), mat.walnut);
  top.position.set(0, -1.32, 0);
  top.receiveShadow = true;
  g.add(top);
  // white model base under the floor plate
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(wl(PLATE.x1 - PLATE.x0) + 1.2, 0.5,
      wl(PLATE.y1 - REAR.shellY) + 1.0), mat.shellWhite);
  base.position.set((wx(PLATE.x0) + wx(PLATE.x1)) / 2, -0.37,
    (wz(REAR.shellY) + wz(PLATE.y1)) / 2);
  g.add(base);
  return g;
}

export { flatScreen, pantryRun, counterRun };
