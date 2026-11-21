/** Studio fixtures for each layout, built from data/plan.ts FIXTURES (Sections 5 and 8). */
import * as THREE from 'three';
import { LAYOUT_IDS, type LayoutId } from '../config';
import { atlasCell, loopArt, pageArt, photoArt, prismArt, setPlaneUV, type as drawType, wrap } from '../core/art';
import { box, boxFt, group, mergeStatic, placeFt, plane } from '../core/build';
import { M, printMaterial, screenMaterial } from '../core/materials';
import { canvasTexture, FONT, textPlane } from '../core/text';
import { A, CEIL_ADC, FT } from '../data/geometry';
import { CONTENT } from '../data/manifest';
import { FIXTURES, type Fixtures, type Side } from '../data/plan';
import { buildCollabBoard, buildCrescentSofa, buildKiosk, buildLandingDisplay, buildPlinth, buildRectRug, buildRoundRug, buildSlatCloud, buildSlatPanel } from '../furniture/exhibits';
import { buildHeadset, buildHeadsetStand, buildMuseumDevice } from '../furniture/museum';
import { buildFoosballTable, buildScoreboard } from '../furniture/play';
import { buildPlanter } from '../furniture/plants';
import { buildCardStand, buildDoorPlate, buildFloorDisc, buildGalleriaRail, buildLoungeChair, buildPhone, buildPhotoFrame, buildSideTable, buildTablet, buildTripod } from '../furniture/smallItems';
import { buildCoffeeTable, buildGLCubicle, buildRoundTable4, buildSofa3 } from '../furniture/workstation';
import type { ViewMode } from '../scenes/studio';

/** Named things the interactions and the UI need to find at runtime. Objects are keyed `${layout}:${id}`. */
export interface Registry {
  objects: Record<string, THREE.Object3D>;
  screens: Record<string, THREE.MeshStandardMaterial>;
}
export interface FixturePart {
  name: string;
  group: THREE.Object3D;
  layouts?: LayoutId[];
  mode?: ViewMode;
  merge?: boolean;
}

const faceDeg: Record<Side, number> = { E: 0, N: 90, W: 180, S: 270 };
export const TABLET_SLOTS = [2, 5];

/** Screen materials are shared across layouts (only one layout is visible at a time). */
export function screen(reg: Registry, key: string, w: number, h: number, draw: Parameters<typeof canvasTexture>[2], intensity?: number): THREE.MeshStandardMaterial {
  if (!reg.screens[key]) reg.screens[key] = screenMaterial(canvasTexture(w, h, draw), intensity);
  return reg.screens[key];
}

const prints: Record<string, THREE.MeshStandardMaterial> = {};
function print(key: string, w: number, h: number, draw: Parameters<typeof canvasTexture>[2], o: { emissive?: number; transparent?: boolean } = {}) {
  if (!prints[key]) prints[key] = printMaterial(canvasTexture(w, h, draw), o);
  return prints[key];
}

const journeyArt: Parameters<typeof canvasTexture>[2] = (ctx, w, h) => {
  ctx.fillStyle = '#faf8f4';
  ctx.fillRect(0, 0, w, h);
  const ch = CONTENT.journey.chapters;
  const ms = CONTENT.journey.milestones;
  ctx.strokeStyle = 'rgba(40,42,46,0.5)';
  ctx.lineWidth = h * 0.008;
  ctx.beginPath();
  ctx.moveTo(w * 0.03, h * 0.62);
  ctx.lineTo(w * 0.97, h * 0.62);
  ctx.stroke();
  ch.forEach((c, i) => {
    const x = w * (0.05 + (i * 0.9) / ch.length);
    drawType(ctx, String(i + 1).padStart(2, '0'), x, h * 0.2, h * 0.07, 400, 'rgba(40,42,46,0.45)');
    drawType(ctx, c, x, h * 0.42, h * 0.17, 300, '#2a2b2d');
    const m = ms[i % ms.length];
    ctx.fillStyle = '#2a2b2d';
    ctx.beginPath();
    ctx.arc(x + h * 0.03, h * 0.62, h * 0.022, 0, 7);
    ctx.fill();
    drawType(ctx, m.year, x, h * 0.78, h * 0.085, 600, '#2a2b2d');
    drawType(ctx, m.label, x, h * 0.9, h * 0.06, 400, 'rgba(40,42,46,0.6)');
  });
};

const fivePointArt: Parameters<typeof canvasTexture>[2] = (ctx, w, h) => {
  const tints = ['#e5e1da', '#dde5da', '#dae1e7', '#e2dde8', '#ece4d2'];
  CONTENT.fivePoint.forEach((l, i) => {
    const y0 = h - ((i + 1) * h) / 5;
    ctx.fillStyle = tints[i];
    ctx.fillRect(0, y0, w, h / 5 + 1);
    drawType(ctx, l.level, w * 0.08, y0 + h * 0.105, h * 0.055, 300, 'rgba(40,42,46,0.85)');
    drawType(ctx, l.name, w * 0.08, y0 + h * 0.14, h * 0.018, 500, 'rgba(40,42,46,0.6)', 'left', w * 0.84);
  });
};

const voicesArt: Parameters<typeof canvasTexture>[2] = (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const v = CONTENT.voices.slice(0, 6);
  v.forEach((q, i) => {
    const x0 = (i * w) / v.length + w * 0.012;
    const cw = w / v.length - w * 0.03;
    const yEnd = wrap(ctx, `“${q.quote}”`, x0, h * 0.26, h * 0.13, cw, 400, '#ffffff', 1.25);
    ctx.font = `500 ${h * 0.08}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`${q.by} · ${q.role}`, x0, Math.min(h * 0.95, yEnd + h * 0.04));
  });
};

function buildLayout(layout: LayoutId, f: Fixtures, reg: Registry): { stat: THREE.Group; dyn: THREE.Group; cloud: THREE.Group | null } {
  const g = group(`fixtures:${layout}`);
  const dyn = group(`fixtures-dyn:${layout}`);
  dyn.userData.dynamic = true;
  const R = (id: string, o: THREE.Object3D) => {
    reg.objects[`${layout}:${id}`] = o;
    o.name = id;
    return o;
  };
  /** Move a dynamic object to where an anchor inside the static group sits. */
  const adopt = (o: THREE.Object3D, anchor: THREE.Object3D) => {
    anchor.updateWorldMatrix(true, false);
    o.applyMatrix4(anchor.matrixWorld);
    o.userData.home = { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() };
    dyn.add(o);
    return o;
  };

  if (layout !== 'today') g.add(placeFt(buildDoorPlate('Project ODC / Team only', 'lock'), 8.2, 17 - 0.05, 270, 5));

  // ── The Trail ──
  if (f.landing) {
    const L = f.landing;
    const cx = (L.x0 + L.x1) / 2;
    const mat = screen(reg, 'landing', 1024, 576, loopArt(`Welcome to ${CONTENT.brandName}`, 'ADC-05 · Level 09 · Bangalore', 0));
    if (L.slat) {
      const pw = L.slat[1] - L.slat[0];
      g.add(placeFt(buildSlatPanel(pw, CEIL_ADC, { x0: L.x0 - L.slat[0], x1: L.x1 - L.slat[0], y0: L.bottom, y1: L.bottom + L.height }), (L.slat[0] + L.slat[1]) / 2, L.wallY + 0.01, 90));
    }
    g.add(R('landing', placeFt(buildLandingDisplay(L.x1 - L.x0, L.height, mat), cx, L.wallY + 0.02, 90, L.bottom)));
  }
  if (f.journey) {
    const J = f.journey;
    const w = J.x1 - J.x0;
    const h = J.top - J.bottom;
    const edge = boxFt(M.oak, J.x0 - 0.08, 0.0, J.x1 + 0.08, 0.14, J.bottom - 0.08, J.top + 0.08);
    const band = plane(print('journey', 2048, 232, journeyArt, { emissive: 0.35 }), w * FT, h * FT);
    band.userData.noMerge = true;
    placeFt(band, (J.x0 + J.x1) / 2, 0.15, 90, (J.bottom + J.top) / 2);
    g.add(edge, R('journey', band));
  }
  f.kiosks.forEach((k, i) => {
    const title = CONTENT.kiosks[i % CONTENT.kiosks.length].title;
    const mat = screen(reg, `kiosk-${k.id}`, 512, 904, pageArt(title, 'Touch to explore', i, 0, 1));
    g.add(R(`kiosk-${k.id}`, placeFt(buildKiosk(String(i + 1).padStart(2, '0'), title, mat), k.x, k.y, 180)));
  });
  if (f.kioskRug) {
    const r = f.kioskRug;
    g.add(placeFt(buildRectRug(r.x1 - r.x0, r.y1 - r.y0), (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 90));
  }
  if (f.prism) {
    const P = f.prism;
    const p = plane(print('prism', 2048, 606, prismArt, { transparent: true }), (P.x1 - P.x0) * FT, (P.top - P.bottom) * FT);
    p.userData.noMerge = true;
    p.renderOrder = 4;
    g.add(R('prism', placeFt(p, (P.x0 + P.x1) / 2, 17 - 0.06, 270, (P.bottom + P.top) / 2)));
  }
  if (f.fivePoint) {
    const p2 = A.pillars.find((p) => p.id === 'P2')!;
    const mat = print('fivePoint', 256, 1024, fivePointArt);
    const w = (p2.x1 - p2.x0) * FT;
    const cx = (p2.x0 + p2.x1) / 2;
    const cy = (p2.y0 + p2.y1) / 2;
    const fp = group('fivePoint');
    for (const [deg, dx, dy] of [[0, 2, 0], [90, 0, 2], [180, -2, 0], [270, 0, -2]] as const) {
      const pl = plane(mat, w, CEIL_ADC * FT);
      placeFt(pl, cx + dx * 1.004, cy + dy * 1.004, deg, CEIL_ADC / 2);
      fp.add(pl);
    }
    g.add(R('fivePoint', fp));
  }

  // ── Window Pause ──
  if (f.galleria) {
    const G = f.galleria;
    const rail = buildGalleriaRail(G.x1 - G.x0, G.devices);
    placeFt(rail, (G.x0 + G.x1) / 2, 12.0, 90, G.rail);
    g.add(R('galleria', rail));
    g.updateMatrixWorld(true);
    for (let i = 0; i < G.devices; i++) {
      const app = CONTENT.appGalleria[i % CONTENT.appGalleria.length];
      const tablet = TABLET_SLOTS.includes(i);
      const mat = screen(reg, `galleria-${i}`, tablet ? 360 : 256, tablet ? 496 : 532, pageArt(app.name, app.tags.join(' · '), i + 2, 0, 3));
      const dev = tablet ? buildTablet(mat) : buildPhone(mat);
      dev.traverse((n) => delete n.userData.noMerge);
      mergeStatic(dev);
      dev.userData.dynamic = true;
      adopt(R(`galleria-${i}`, dev), rail.getObjectByName(`cradle${i}`)!);
    }
  }
  f.vrSeats.forEach((s, i) => g.add(R(`vrSeat-${i}`, placeFt(buildLoungeChair(), s[0], s[1], 0))));
  if (f.sideTable) {
    g.add(placeFt(buildSideTable(), f.sideTable[0], f.sideTable[1], 0));
    const stand = placeFt(buildHeadsetStand(), f.sideTable[0], f.sideTable[1], 0, 0.5 / FT);
    g.add(stand);
    g.updateMatrixWorld(true);
    const hs = buildHeadset();
    mergeStatic(hs);
    hs.userData.dynamic = true;
    adopt(R('headset', hs), stand.getObjectByName('headsetAnchor')!);
  }

  // ── Make Studio ──
  f.plinths.forEach((p, i) => {
    const info = CONTENT.museum[p.device % CONTENT.museum.length];
    const pl = placeFt(buildPlinth({ year: info.year, title: info.title, line: info.text }, p.newest), p.x, p.y, faceDeg[p.face]);
    g.add(R(`plinth-${i}`, pl));
    g.updateMatrixWorld(true);
    const dev = buildMuseumDevice(p.device);
    mergeStatic(dev);
    dev.userData.dynamic = true;
    adopt(R(`plinth-device-${i}`, dev), pl.getObjectByName('deviceAnchor')!);
  });
  if (f.voicesGlass) {
    const V = f.voicesGlass;
    const mat = print('voices', 2048, 340, voicesArt, { transparent: true });
    const len = V.y1 - V.y0 - 1;
    const wall = group('voices');
    for (const [deg, off] of [[0, 0.05], [180, -0.05]] as const) {
      const p = plane(mat, len * FT, 2 * FT);
      p.userData.noMerge = true;
      p.renderOrder = 4;
      wall.add(placeFt(p, V.x + off, (V.y0 + V.y1) / 2, deg, 6));
    }
    // A small QR card at 4.5 ft beside each quote.
    const n = Math.min(6, CONTENT.voices.length);
    for (let i = 0; i < n; i++) {
      const y = V.y0 + 0.5 + ((i + 0.08) * len) / n;
      for (const s of [-1, 1]) wall.add(boxFt(M.white, V.x + s * 0.05, y, V.x + s * 0.07, y + 0.28, 4.36, 4.64));
    }
    g.add(R('voices', wall));
  }
  if (f.makeSign) {
    const S = f.makeSign;
    // The sign needs glass to sit on: a clear transom over the 5 ft opening carries the vinyl (DECISIONS D-18).
    g.add(boxFt(M.glassClear, S.x - 0.02, 33, S.x + 0.02, 38, 7.0, CEIL_ADC));
    g.add(boxFt(M.aluminium, S.x - 0.07, 33, S.x + 0.07, 38, 6.94, 7.02));
    for (const [deg, off] of [[0, 0.04], [180, -0.04]] as const) {
      const t = textPlane('Make Studio', { w: 3.4 * FT, h: 0.62 * FT, color: '#ffffff', weight: 500, size: 0.62, ppm: 500 });
      g.add(placeFt(t, S.x + off, S.y, deg, 7.75));
    }
  }
  f.sofas.forEach((s, i) => {
    const sofa = buildCrescentSofa(s, A.fixtures.crescentSofa.seatHeightFt, A.fixtures.crescentSofa.backHeightFt);
    sofa.position.set(s.center[0] * FT, 0, -s.center[1] * FT);
    g.add(R(`sofa-${i}`, sofa));
  });
  if (f.rug) {
    const r = buildRoundRug(f.rug.d);
    r.position.set(f.rug.center[0] * FT, 0.004, -f.rug.center[1] * FT);
    g.add(r);
  }
  if (f.board) {
    const B = f.board;
    const mat = screen(reg, 'board', 1024, 586, loopArt('Collaboration board', 'Start a session', 0, 2));
    const b = buildCollabBoard(mat);
    b.userData.dynamic = true;
    placeFt(b, (B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 270);
    b.userData.home = { p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() };
    dyn.add(R('board', b));
  }
  if (f.foosball) {
    const F = f.foosball;
    const t = buildFoosballTable();
    placeFt(t, (F.x0 + F.x1) / 2, (F.y0 + F.y1) / 2, F.axis === 'NS' ? 90 : 0);
    const fd = t.getObjectByName('foosDynamic')!;
    // Collapse each rod to one mesh per material so the table costs few draw calls.
    for (const rod of fd.children) if (rod.name.startsWith('rod')) mergeStatic(rod);
    g.add(R('foosball', t));
  }
  if (f.scoreboard) {
    const S = f.scoreboard;
    const mat = screen(reg, 'scoreboard', 256, 104, scoreArt(0, 0), 1.2);
    g.add(R('scoreboard', placeFt(buildScoreboard(mat), (S.x0 + S.x1) / 2, S.y - 0.02, 270, S.h)));
  }

  // ── Memory Corner ──
  if (f.memories) g.add(R('memories', memoriesWall(f.memories)));
  if (f.selfieDisc) g.add(placeFt(buildFloorDisc(f.selfieDisc.d, 'Stand here'), f.selfieDisc.x, f.selfieDisc.y, 90));
  if (f.tripod) {
    const mat = screen(reg, 'tripod', 256, 186, loopArt('Take a photo', '', 0, 5));
    g.add(R('tripod', placeFt(buildTripod(mat), f.tripod[0], f.tripod[1], 90)));
  }
  if (f.readNote) {
    const st = buildCardStand();
    const facing = layout === 'keep9' ? 270 : 45;
    g.add(R('readNote', placeFt(st, f.readNote[0], f.readNote[1], facing)));
  }

  // ── Plant pods: merged with the rest of the zone per material (a handful of draw calls for all of them) ──
  const plants = group('plants');
  f.plants.forEach((p, i) => plants.add(placeFt(buildPlanter(p.kind), p.x, p.y, (i * 77) % 360)));
  plants.userData.plan = { kind: 'plants', id: layout, count: f.plants.length };
  g.add(plants);

  // ── Today's furniture ──
  for (const t of f.today) {
    if (t.x0 !== undefined && t.x1 !== undefined && t.y0 !== undefined && t.y1 !== undefined) g.add(placeFt(buildGLCubicle(t.x1 - t.x0, t.y1 - t.y0), (t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2, 90));
    else if (t.id === 'centreCollabSofa') g.add(placeFt(buildSofa3(), t.x!, 1.7, 90));
    else if (t.id === 'centreCollabCoffeeTable') g.add(placeFt(buildCoffeeTable(), t.x!, t.y!, 0));
    else g.add(placeFt(buildRoundTable4(), t.x!, t.y!, 0));
  }
  if (layout === 'today') {
    // Future-provision line: dashed red on the floor at x = 3.
    const fp = A.futureProvisionLine;
    for (let y = fp.a[1]; y < fp.b[1]; y += 2) g.add(boxFt(M.redLine, fp.a[0] - 0.06, y, fp.a[0] + 0.06, Math.min(fp.b[1], y + 1.2), 0.015, 0.03));
  }

  let cloud: THREE.Group | null = null;
  if (f.cloud) {
    const C = f.cloud;
    cloud = buildSlatCloud(C.x1 - C.x0, C.y1 - C.y0);
    placeFt(cloud, (C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, 90, CEIL_ADC - C.drop);
  }
  return { stat: g, dyn, cloud };
}

export function scoreArt(blue: number, amber: number): Parameters<typeof canvasTexture>[2] {
  return (ctx, w, h) => {
    ctx.fillStyle = '#050607';
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = `600 ${h * 0.66}px ${FONT}`;
    ctx.fillStyle = '#7fb0ee';
    ctx.fillText(String(blue), w * 0.27, h * 0.54);
    ctx.fillStyle = '#ffc45e';
    ctx.fillText(String(amber), w * 0.73, h * 0.54);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(':', w * 0.5, h * 0.5);
  };
}

/** About 24 photos in thin oak frames, mixed sizes on an aligned grid, sharing one atlas texture. */
function memoriesWall(m: NonNullable<Fixtures['memories']>): THREE.Group {
  const g = group('memories');
  const cols = Math.max(4, Math.round((m.x1 - m.x0) / 1.0));
  const rows = 6;
  const cw = (m.x1 - m.x0) / cols;
  const chh = (m.top - m.bottom) / rows;
  const used = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const cells: { c: number; r: number; w: number; h: number }[] = [];
  const sizes: [number, number][] = [[2, 2], [2, 1], [1, 2], [1, 1], [2, 2], [1, 1], [2, 1], [1, 2]];
  let k = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (used[r][c]) continue;
      let [w, h] = sizes[k++ % sizes.length];
      const fits = (ww: number, hh: number) => {
        if (c + ww > cols || r + hh > rows) return false;
        for (let y = r; y < r + hh; y++) for (let x = c; x < c + ww; x++) if (used[y][x]) return false;
        return true;
      };
      if (!fits(w, h)) [w, h] = fits(1, 2) ? [1, 2] : fits(2, 1) ? [2, 1] : [1, 1];
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) used[y][x] = true;
      cells.push({ c, r, w, h });
    }
  const A_COLS = 6;
  const A_ROWS = Math.ceil(cells.length / A_COLS);
  const key = `memories-${cells.length}`;
  const mat = print(key, 1536, 256 * A_ROWS, (ctx, w, h) => cells.forEach((_, i) => atlasCell(photoArt(i), (i % A_COLS) / A_COLS, Math.floor(i / A_COLS) / A_ROWS, 1 / A_COLS, 1 / A_ROWS)(ctx, w, h)));
  const GAP = 0.09;
  cells.forEach((cell, i) => {
    const fw = (cell.w * cw - GAP) * FT;
    const fh = (cell.h * chh - GAP) * FT;
    const fr = buildPhotoFrame(fw, fh, mat);
    const pr = fr.getObjectByName('print') as THREE.Mesh;
    delete pr.userData.noMerge;
    setPlaneUV(pr.geometry, (i % A_COLS) / A_COLS, Math.floor(i / A_COLS) / A_ROWS, 1 / A_COLS, 1 / A_ROWS);
    placeFt(fr, m.x0 + (cell.c + cell.w / 2) * cw, 60 - 0.02, 270, m.top - (cell.r + cell.h / 2) * chh);
    g.add(fr);
  });
  g.userData.count = cells.length;
  return g;
}

export function buildFixtureParts(reg: Registry): FixturePart[] {
  const parts: FixturePart[] = [];
  for (const layout of LAYOUT_IDS) {
    const { stat, dyn, cloud } = buildLayout(layout, FIXTURES[layout], reg);
    parts.push({ name: `fixtures:${layout}`, group: stat, layouts: [layout] });
    parts.push({ name: `fixtures-dyn:${layout}`, group: dyn, layouts: [layout], merge: false });
    if (cloud) parts.push({ name: `cloud:${layout}`, group: cloud, layouts: [layout], mode: 'walk' });
  }
  return parts;
}
export { box };
