/** ADC-05 and approach architecture built from data/plan.ts: walls, windows, pillars, glass, floors, ceilings. */
import * as THREE from 'three';
import type { LayoutId } from '../config';
import { box, boxFt, group, polygonFt, tag } from '../core/build';
import { M } from '../core/materials';
import { A, AP, CEIL_ADC, CEIL_CORRIDOR, FT, pointInPolygon, type V2 } from '../data/geometry';
import { arrivalCar, CAR_H, floorPatches, GLASS_T, leftNormal, segLen, WALLS, WINDOWS, type Glass, type Wall } from '../data/plan';

const WALL_MAT: Record<Wall['mat'], THREE.Material> = { wall: M.wall, lobbyWall: M.lobbyWall, steel: M.steel };

/** A box along the plan segment a→b: thickness t centred `off` to the left of the line, from h0 to h1 (feet). */
export function segBox(mat: THREE.Material, a: V2, b: V2, t: number, off: number, h0: number, h1: number, extend = 0): THREE.Mesh {
  const len = segLen(a, b) + extend * 2;
  const n = leftNormal(a, b);
  const cx = (a[0] + b[0]) / 2 + n[0] * off;
  const cy = (a[1] + b[1]) / 2 + n[1] * off;
  const m = box(mat, len * FT, (h1 - h0) * FT, t * FT, cx * FT, ((h0 + h1) / 2) * FT, -cy * FT);
  m.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return m;
}
const along = (a: V2, b: V2, s: number): V2 => {
  const l = segLen(a, b);
  return [a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l];
};

export function buildWalls(): THREE.Group {
  const g = group('walls');
  for (const w of WALLS) {
    const mat = WALL_MAT[w.mat];
    const len = segLen(w.a, w.b);
    const ext = w.t / 2;
    const ops = [...w.openings].sort((p, q) => p.s0 - q.s0);
    let s = 0;
    const piece = (s0: number, s1: number, h0: number, h1: number, e0: number, e1: number) => {
      if (s1 - s0 < 1e-4 || h1 - h0 < 1e-4) return;
      const a = along(w.a, w.b, s0 - e0);
      const b = along(w.a, w.b, s1 + e1);
      g.add(tag(segBox(mat, a, b, w.t, w.off, h0, h1), 'wall', w.id, { a: w.a, b: w.b, off: w.off, t: w.t }));
    };
    ops.forEach((o) => {
      piece(s, o.s0, w.h0, w.h1, s === 0 ? ext : 0, 0);
      piece(o.s0, o.s1, Math.max(o.h, w.h0), w.h1, 0, 0);
      s = o.s1;
    });
    piece(s, len, w.h0, w.h1, s === 0 ? ext : 0, ext);
  }
  for (const p of A.pillars) g.add(tag(boxFt(M.pillar, p.x0, p.y0, p.x1, p.y1, 0, CEIL_ADC), 'pillar', p.id, { ...p }));
  return g;
}

export function buildWindows(): THREE.Group {
  const g = group('windows');
  const MULL_W = 0.17;
  const MULL_D = 0.42;
  for (const w of WINDOWS) {
    g.add(tag(segBox(M.glassWindow, w.a, w.b, GLASS_T, w.off, w.sill, w.head), 'window', w.id, { a: w.a, b: w.b }));
    // Slim dark-bronze frame: head and sill rails plus mullions every 5 ft.
    g.add(segBox(M.bronze, w.a, w.b, MULL_D, w.off, w.sill, w.sill + 0.12));
    g.add(segBox(M.bronze, w.a, w.b, MULL_D, w.off, w.head - 0.12, w.head));
    const horizontal = w.a[1] === w.b[1];
    for (const m of w.mullions) {
      const a: V2 = horizontal ? [m[0] - MULL_W / 2, m[1]] : [m[0], m[1] - MULL_W / 2];
      const b: V2 = horizontal ? [m[0] + MULL_W / 2, m[1]] : [m[0], m[1] + MULL_W / 2];
      const off = (horizontal ? Math.sign(w.b[0] - w.a[0]) : Math.sign(w.b[1] - w.a[1])) * w.off;
      g.add(segBox(M.bronze, a, b, MULL_D, off, w.sill, w.head));
    }
  }
  return g;
}

const CHANNEL_H = 0.1;
/** One glass partition with its channels. Frosted layers sit a hair proud of the clear pane so nothing z-fights. */
export function buildGlassPane(gl: Glass): THREE.Group {
  const g = group(`glass:${gl.id}`);
  const proud = GLASS_T * 1.8;
  const inset = 2 / 12;
  const len = segLen(gl.a, gl.b);
  const sub = (s0: number, s1: number): [V2, V2] => [along(gl.a, gl.b, s0), along(gl.a, gl.b, s1)];
  const full = (mat: THREE.Material, t = GLASS_T) => segBox(mat, gl.a, gl.b, t, 0, gl.h0, gl.h1);
  switch (gl.type) {
    case 'clear':
      g.add(full(M.glassClear));
      break;
    case 'frosted': {
      if (gl.transmission) {
        g.add(full(M.glassPrism));
        break;
      }
      g.add(full(M.glassClear));
      const [a, b] = len > 1 ? sub(inset, len - inset) : sub(0, len);
      g.add(segBox(M.glassFrosted, a, b, proud, 0, gl.h0 + (gl.h0 === 0 ? inset : 0), gl.h1 - inset));
      break;
    }
    case 'frostedBand':
      g.add(full(M.glassClear));
      g.add(segBox(M.glassBand, gl.a, gl.b, proud, 0, 3, 6));
      break;
    case 'frostedTo7':
      g.add(full(M.glassClear));
      g.add(segBox(M.glassFrosted, gl.a, gl.b, proud, 0, inset, 7));
      break;
    case 'clearEdgeBand': {
      g.add(full(M.glassClear));
      g.add(segBox(M.glassBand, gl.a, gl.b, proud, 0, gl.h0 + CHANNEL_H, gl.h0 + CHANNEL_H + inset));
      const [a0, b0] = sub(0, inset);
      const [a1, b1] = sub(len - inset, len);
      g.add(segBox(M.glassBand, a0, b0, proud, 0, gl.h0 + CHANNEL_H, gl.h1 - CHANNEL_H));
      g.add(segBox(M.glassBand, a1, b1, proud, 0, gl.h0 + CHANNEL_H, gl.h1 - CHANNEL_H));
      break;
    }
  }
  // Slim aluminium channels at floor and head so the glass reads.
  if (gl.h0 === 0) g.add(segBox(M.aluminium, gl.a, gl.b, 0.14, 0, 0, CHANNEL_H));
  g.add(segBox(M.aluminium, gl.a, gl.b, 0.14, 0, gl.h1 - CHANNEL_H, gl.h1));
  tag(g, 'glass', gl.id, { a: gl.a, b: gl.b, type: gl.type });
  return g;
}

const rect = (x0: number, y0: number, x1: number, y1: number): V2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const LIFT = 0.012; // feet between stacked floor finishes

/** Floors shared by every layout: terrazzo base in ADC-05, porcelain in the approach. */
export function buildBaseFloors(): THREE.Group {
  const g = group('floors');
  const c = AP.corridor2000;
  const lob = AP.liftLobby02;
  const car = arrivalCar();
  g.add(tag(polygonFt(M.terrazzo, A.envelopeInterior, 0), 'floor', 'adc-terrazzo'));
  g.add(polygonFt(M.porcelain, rect(c.x0, c.y0 - 0.2, c.x1, c.y1), 0));
  g.add(polygonFt(M.porcelain, rect(A.entryRecess.x0, 0, A.entryRecess.x1, A.entryRecess.y1), 0));
  g.add(polygonFt(M.porcelain, rect(A.fireDoorRecess.x0, 0, A.fireDoorRecess.x1, A.fireDoorRecess.y1), 0));
  g.add(polygonFt(M.porcelain, rect(lob.x0 - 1.2, lob.y0, lob.x1, c.y0 - 0.2), 0));
  g.add(polygonFt(M.porcelain, rect(car.x0, car.y0, car.x1 + 0.1, car.y1), 0));
  const ln = AP.collabLoungeNorthOfCore1;
  const ls = AP.collabLoungeSouthOfCorridor;
  g.add(polygonFt(M.carpet, rect(ln.x0, ln.y0, ln.x1 - 1.2, c.y0 - 0.2), 0));
  g.add(polygonFt(M.carpet, rect(ls.x0, ls.y0, ls.x1, c.y0 - 0.2), 0));
  // Threshold strips at the two recesses.
  g.add(boxFt(M.floorStrip, A.entryRecess.x0, 3.95, A.entryRecess.x1, 4.05, 0, 0.02));
  return g;
}

/** Floor finishes that change with the layout, with a 6 mm stainless strip at every change of material. */
export function buildFloorPatches(layout: LayoutId): THREE.Group {
  const g = group(`floorPatches:${layout}`);
  const STRIP = 0.02;
  floorPatches(layout).forEach((p, i) => {
    const mat = p.mat === 'oak' ? M.oakFloor : M.carpet;
    g.add(tag(polygonFt(mat, p.polygon, LIFT * (i + 1)), 'floorPatch', p.id));
    for (let k = 0; k < p.polygon.length; k++) {
      const a = p.polygon[k];
      const b = p.polygon[(k + 1) % p.polygon.length];
      const n = leftNormal(a, b);
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const inside = (d: number) => pointInPolygon(mx + n[0] * d, my + n[1] * d, A.envelopeInterior);
      if (inside(0.4) && inside(-0.4)) g.add(segBox(M.floorStrip, a, b, STRIP, 0, 0, LIFT * (i + 1) + 0.008));
    }
  });
  return g;
}

/** Ceilings, light slots and the Trail light panel. Walkthrough only: the table model has its ceiling removed. */
export function buildCeilings(): THREE.Group {
  const g = group('ceilings');
  const c = AP.corridor2000;
  const lob = AP.liftLobby02;
  const car = arrivalCar();
  g.add(tag(polygonFt(M.ceiling, A.envelopeInterior, CEIL_ADC, false), 'ceiling', 'adc'));
  g.add(polygonFt(M.ceiling, rect(c.x0, c.y0, c.x1, c.y1), CEIL_CORRIDOR, false));
  g.add(polygonFt(M.ceiling, rect(A.entryRecess.x0, 0, A.entryRecess.x1, 4), CEIL_CORRIDOR, false));
  g.add(polygonFt(M.ceiling, rect(A.fireDoorRecess.x0, 0, A.fireDoorRecess.x1, 4), CEIL_CORRIDOR, false));
  g.add(polygonFt(M.ceiling, rect(lob.x0, lob.y0, lob.x1, c.y0), CEIL_CORRIDOR, false));
  g.add(polygonFt(M.ceiling, rect(AP.collabLoungeNorthOfCore1.x0, AP.collabLoungeNorthOfCore1.y0, AP.collabLoungeNorthOfCore1.x1, c.y0), CEIL_CORRIDOR, false));
  g.add(polygonFt(M.ceiling, rect(AP.collabLoungeSouthOfCorridor.x0, AP.collabLoungeSouthOfCorridor.y0, AP.collabLoungeSouthOfCorridor.x1, c.y0), CEIL_CORRIDOR, false));
  // Lift car: stainless ceiling with an LED panel.
  g.add(polygonFt(M.steel, rect(car.x0, car.y0, car.x1, car.y1), CAR_H, false));
  g.add(boxFt(M.lightPanel, car.x0 + 1.2, car.y0 + 1.2, car.x1 - 1.2, car.y1 - 1.2, CAR_H - 0.06, CAR_H - 0.01));
  // Lift door portal soffit.
  g.add(polygonFt(M.steel, rect(car.x1, car.y0, lob.x0, car.y1), 7.0, false));
  const slot = (x0: number, y0: number, x1: number, y1: number, h: number) => g.add(boxFt(M.lightSlot, x0, y0, x1, y1, h - 0.03, h - 0.005));
  const SW = 0.3;
  // Linear slots running east-west every 6 ft over the work floor, plus one line down the spine.
  for (let y = 20; y <= 56; y += 6) {
    slot(34.5, y - SW / 2, 57, y + SW / 2, CEIL_ADC);
    slot(4, y - SW / 2, 32, y + SW / 2, CEIL_ADC);
  }
  slot(16, 14.5 - SW / 2, 61, 14.5 + SW / 2, CEIL_ADC);
  // Stretched-fabric light panel over the Trail.
  g.add(tag(boxFt(M.lightPanel, 21, 2, 56, 11, CEIL_ADC - 0.06, CEIL_ADC - 0.01), 'lightPanel', 'trail'));
  // Meeting rooms.
  for (const r of A.meetingRooms) slot(r.x0 + 2.5, 5.6 - SW / 2, r.x1 - 2.5, 5.6 + SW / 2, CEIL_ADC);
  // Corridor and lobby.
  const cy = (c.y0 + c.y1) / 2;
  slot(c.x0 + 2, cy - SW / 2, c.x1 - 2, cy + SW / 2, CEIL_CORRIDOR);
  slot(lob.x0 + 5 - SW / 2, lob.y0 + 3, lob.x0 + 5 + SW / 2, c.y0 - 3, CEIL_CORRIDOR);
  slot(lob.x1 - 5 - SW / 2, lob.y0 + 3, lob.x1 - 5 + SW / 2, c.y0 - 3, CEIL_CORRIDOR);
  return g;
}

/** Thin opaque roof slab above the ceilings so the sun only enters through the windows (shadow caster only). */
export function buildRoofOccluder(): THREE.Mesh {
  const m = boxFt(M.ceiling, -80, -55, 78.5, 61, CEIL_ADC + 0.4, CEIL_ADC + 0.8);
  m.name = 'roofOccluder';
  m.userData.noMerge = true;
  m.castShadow = true;
  return m;
}
