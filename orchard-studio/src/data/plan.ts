/**
 * Everything derived from data/geometry.json, in plan feet: walls, glass, doors, desks, fixtures, zones and
 * collision footprints for each of the four layouts. Builders, collision, the nav grid, the tour and the tests
 * all read from here, so the scene and the rules can never drift apart.
 */
import { CONFIG, type LayoutId } from '../config';
import { A, AP, CEIL_ADC, CEIL_CORRIDOR, G, pointInPolygon, type ArcDef, type RectFt, type V2, type ZoneDef } from './geometry';

export const PLAYER_RADIUS_FT = 0.9;
export const WALL_T = 0.33; // 100 mm partition
export const EXT_WALL_T = 0.66; // 200 mm facade wall
export const GLASS_T = 0.04; // 12 mm
export const DOOR_H = 7.0;
export const ENTRY_DOOR_H = 7.5;

const NON_TODAY: LayoutId[] = ['recommended', 'keep9', 'rejected'];
const ALL: LayoutId[] = ['today', 'recommended', 'keep9', 'rejected'];

/* ───────────────────────────── walls ───────────────────────────── */

export type WallMat = 'wall' | 'steel' | 'lobbyWall';
export interface Opening {
  s0: number; // distance from a, ft
  s1: number;
  h: number; // opening height, ft (wall continues above)
}
export interface Wall {
  id: string;
  a: V2;
  b: V2;
  h0: number;
  h1: number;
  t: number;
  /** Offset of the wall's centre line from a→b along its left normal. The a→b line itself is the specified face. */
  off: number;
  mat: WallMat;
  openings: Opening[];
  collide: boolean;
  area: 'adc' | 'approach' | 'car';
}

const leftNormal = (a: V2, b: V2): V2 => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
};
export const segLen = (a: V2, b: V2) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** A wall whose specified line a→b is the face seen from `inside`; thickness grows away from that point. */
function wallFacing(
  id: string,
  a: V2,
  b: V2,
  inside: V2,
  o: Partial<Pick<Wall, 'h0' | 'h1' | 't' | 'mat' | 'openings' | 'collide' | 'area'>> = {},
): Wall {
  const n = leftNormal(a, b);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const insideIsLeft = (inside[0] - mx) * n[0] + (inside[1] - my) * n[1] > 0;
  const t = o.t ?? WALL_T;
  return {
    id,
    a,
    b,
    h0: o.h0 ?? 0,
    h1: o.h1 ?? CEIL_ADC,
    t,
    off: insideIsLeft ? -t / 2 : t / 2,
    mat: o.mat ?? 'wall',
    openings: o.openings ?? [],
    collide: o.collide ?? true,
    area: o.area ?? 'adc',
  };
}

const sameSeg = (a: V2, b: V2, c: V2, d: V2) =>
  (a[0] === c[0] && a[1] === c[1] && b[0] === d[0] && b[1] === d[1]) || (a[0] === d[0] && a[1] === d[1] && b[0] === c[0] && b[1] === c[1]);

const ENTRY_A: V2 = [A.entryRecess.x0, A.entryRecess.doorPlaneY];
const ENTRY_B: V2 = [A.entryRecess.x1, A.entryRecess.doorPlaneY];
/** The sliding pair covers the middle 2.5 ft; fixed glass sidelights fill the rest of the 5 ft recess (DECISIONS D-05). */
export const ENTRY_LEAF_W = 1.25;
const ENTRY_MID = (ENTRY_A[0] + ENTRY_B[0]) / 2;
export const ENTRY_DOOR_A: V2 = [ENTRY_MID - ENTRY_LEAF_W, ENTRY_A[1]];
export const ENTRY_DOOR_B: V2 = [ENTRY_MID + ENTRY_LEAF_W, ENTRY_A[1]];

/** True facade segments (the rest of the envelope faces the corridor or a recess and gets a thin partition). */
const isFacade = (a: V2, b: V2) => {
  const onSouth = a[1] <= 4 && b[1] <= 4;
  return !onSouth;
};

function envelopeInsidePoint(a: V2, b: V2): V2 {
  const n = leftNormal(a, b);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const left: V2 = [mx + n[0] * 0.2, my + n[1] * 0.2];
  return pointInPolygon(left[0], left[1], A.envelopeInterior) ? left : [mx - n[0] * 0.2, my - n[1] * 0.2];
}

function buildWalls(): Wall[] {
  const walls: Wall[] = [];
  // ADC-05 envelope, solid parts. The entry door plane is a door, not a wall.
  A.solidWalls.forEach((line, li) => {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const id = `adc-solid-${li}-${i}`;
      if (sameSeg(a, b, ENTRY_A, ENTRY_B)) {
        walls.push(wallFacing('entry-header', a, b, envelopeInsidePoint(a, b), { h0: ENTRY_DOOR_H, collide: false }));
        continue;
      }
      walls.push(wallFacing(id, a, b, envelopeInsidePoint(a, b), { t: isFacade(a, b) ? EXT_WALL_T : WALL_T }));
    }
  });
  // Window walls: sill below, head above. The glass itself is in windows().
  A.windows.segments.forEach(([a, b], i) => {
    const inside = envelopeInsidePoint(a, b);
    walls.push(wallFacing(`adc-sill-${i}`, a, b, inside, { h1: A.windows.sillFt, t: EXT_WALL_T, collide: false }));
    walls.push(wallFacing(`adc-head-${i}`, a, b, inside, { h0: A.windows.headFt, t: EXT_WALL_T, collide: false }));
  });
  // Meeting rooms. Partition thickness goes into the room so the spine and entry stay exact.
  const [west, east] = A.meetingRooms;
  walls.push(wallFacing('room-west-east-wall', [west.x1, 4], [west.x1, west.y1], [west.x1 + 1, 8]));
  walls.push(
    wallFacing('room-east-north-wall', [east.x0, east.y1], [east.x1, east.y1], [70, east.y1 + 1], {
      openings: [{ s0: east.door.x0 - east.x0, s1: east.door.x1 - east.x0, h: DOOR_H }],
    }),
  );

  // ── Approach (9 ft ceiling) ──
  const c = AP.corridor2000;
  const lob = AP.liftLobby02;
  const core1 = AP.liftCore1;
  const core2 = AP.liftCore2;
  const ln = AP.collabLoungeNorthOfCore1;
  const ls = AP.collabLoungeSouthOfCorridor;
  const ap = (id: string, a: V2, b: V2, inside: V2, o: Parameters<typeof wallFacing>[4] = {}) =>
    walls.push(wallFacing(id, a, b, inside, { h1: CEIL_CORRIDOR, area: 'approach', mat: 'lobbyWall', ...o }));
  const cy = (c.y0 + c.y1) / 2;
  ap('corridor-north', [c.x0, c.y1], [0, c.y1], [-40, 1]); // face set back like the ADC-05 partition (see DECISIONS)
  ap('corridor-south', [AP.southBlock[0].x0, c.y0], [c.x1, c.y0], [0, cy]);
  ap('corridor-east-end', [c.x1, c.y0], [c.x1, c.y1], [c.x1 - 1, cy]);
  ap('corridor-west-end', [c.x0, c.y0], [c.x0, c.y1], [c.x0 + 1, cy]);
  ap('corridor-west-stub', [c.x0, c.y0], [ln.x0, c.y0], [c.x0 + 0.3, cy]);
  // Lift Lobby 02. Its west wall is the 1.1 ft shaft wall of core #1 with the three east-column lift doors.
  const lobMid: V2 = [(lob.x0 + lob.x1) / 2, -30];
  const shaftT = lob.x0 - core1.eastColumnX[1];
  const eastCars = core1.cars.filter((k) => k.column === 'east');
  ap('lobby-west-core1', [lob.x0, core1.y0], [lob.x0, core1.y1], lobMid, {
    t: shaftT,
    openings: eastCars.map((k) => {
      const mid = (k.y0 + k.y1) / 2;
      return { s0: mid - LIFT_DOOR_W / 2 - core1.y0, s1: mid + LIFT_DOOR_W / 2 - core1.y0, h: DOOR_H };
    }),
  });
  ap('lobby-west-upper', [lob.x0, core1.y1], [lob.x0, c.y0], lobMid);
  ap('lobby-east', [lob.x1, lob.y0], [lob.x1, c.y0], lobMid, { t: 0.5 });
  ap('lobby-south', [lob.x0, lob.y0], [lob.x1, lob.y0], lobMid, { t: 0.5 });
  // Context lounges, open to the corridor.
  ap('lounge-n-west', [ln.x0, ln.y0], [ln.x0, c.y0], [ln.x0 + 1, -10]);
  ap('lounge-n-south', [ln.x0, ln.y0], [ln.x1, ln.y0], [-70, -10]);
  ap('lounge-s-south', [ls.x0, ls.y0], [ls.x1, ls.y0], [-35, -10]);
  ap('lounge-s-east', [ls.x1, ls.y0], [ls.x1, c.y0], [-35, -10]);
  void core2;
  // Arrival car PL07: stainless panels.
  const car = arrivalCar();
  const cc: V2 = [(car.x0 + car.x1) / 2, (car.y0 + car.y1) / 2];
  const cw = (id: string, a: V2, b: V2) =>
    walls.push(wallFacing(id, a, b, cc, { h1: CAR_H, t: 0.2, mat: 'steel', area: 'car' }));
  cw('car-west', [car.x0, car.y0], [car.x0, car.y1]);
  cw('car-north', [car.x0, car.y1], [car.x1, car.y1]);
  cw('car-south', [car.x0, car.y0], [car.x1, car.y0]);
  return walls;
}

export const LIFT_DOOR_W = 3.5;
export const CAR_H = 8.0;
export function arrivalCar(): RectFt & { id: string } {
  const core1 = AP.liftCore1;
  const car = core1.cars.find((k) => k.arrival)!;
  return { id: car.id, x0: core1.eastColumnX[0], x1: core1.eastColumnX[1], y0: car.y0, y1: car.y1 };
}
export const WALLS: Wall[] = buildWalls();

/** Invisible colliders that keep visitors out of context spaces. */
export const BLOCKERS: { id: string; a: V2; b: V2 }[] = [
  { id: 'block-lounge-n', a: [AP.collabLoungeNorthOfCore1.x0, AP.corridor2000.y0], b: [AP.collabLoungeNorthOfCore1.x1, AP.corridor2000.y0] },
  { id: 'block-lounge-s', a: [AP.collabLoungeSouthOfCorridor.x0, AP.corridor2000.y0], b: [AP.collabLoungeSouthOfCorridor.x1, AP.corridor2000.y0] },
];

/* ───────────────────────────── windows ───────────────────────────── */

export interface WindowSeg {
  id: string;
  a: V2;
  b: V2;
  sill: number;
  head: number;
  mullions: V2[];
  off: number; // centre offset along left normal (outward)
}
export const WINDOWS: WindowSeg[] = A.windows.segments.map(([a, b], i) => {
  const inside = envelopeInsidePoint(a, b);
  const n = leftNormal(a, b);
  const insideLeft = (inside[0] - (a[0] + b[0]) / 2) * n[0] + (inside[1] - (a[1] + b[1]) / 2) * n[1] > 0;
  const every = A.windows.mullionEveryFt;
  const mullions: V2[] = [a, b];
  const horizontal = a[1] === b[1];
  const lo = Math.min(horizontal ? a[0] : a[1], horizontal ? b[0] : b[1]);
  const hi = Math.max(horizontal ? a[0] : a[1], horizontal ? b[0] : b[1]);
  for (let v = Math.ceil((lo + 0.01) / every) * every; v < hi - 0.01; v += every) mullions.push(horizontal ? [v, a[1]] : [a[0], v]);
  return { id: `window-${i}`, a, b, sill: A.windows.sillFt, head: A.windows.headFt, mullions, off: (insideLeft ? -1 : 1) * (EXT_WALL_T / 2) };
});

/* ───────────────────────────── glass ───────────────────────────── */

export type GlassType = 'clear' | 'frosted' | 'frostedBand' | 'frostedTo7' | 'clearEdgeBand';
export interface Glass {
  id: string;
  a: V2;
  b: V2;
  type: GlassType;
  h0: number;
  h1: number;
  layouts: LayoutId[];
  /** Uses real transmission (only the PRISM pane; the entry door leaves are doors). */
  transmission?: boolean;
}

const x33Type: GlassType = CONFIG.x33GlassType === 'frostedTo7ft' ? 'frostedTo7' : CONFIG.x33GlassType === 'clear' ? 'clear' : 'frosted';

function buildGlass(): Glass[] {
  const g: Glass[] = [];
  const add = (id: string, a: V2, b: V2, type: GlassType, layouts: LayoutId[], extra: Partial<Glass> = {}) =>
    g.push({ id, a, b, type, h0: 0, h1: CEIL_ADC, layouts, ...extra });
  const P = A.glassPartitions;
  const entry = P.find((p) => p.id === 'frostedEntryGlass')!;
  const td = A.fixtures.teamDoor;
  const prism = A.fixtures.prismGraphic;
  // Frosted entry glass, split around the team door and the PRISM pane.
  add('frostedEntryGlass-closure', [2, 17], [entry.a[0], 17], 'frosted', NON_TODAY);
  add('frostedEntryGlass-w', entry.a, [td.x0, 17], 'frosted', NON_TODAY);
  add('frostedEntryGlass-m', [td.x1, 17], [prism.x0, 17], 'frosted', NON_TODAY);
  add('frostedEntryGlass-prism', [prism.x0, 17], [prism.x1, 17], 'frosted', NON_TODAY, { transmission: true });
  add('frostedEntryGlass-e', [prism.x1, 17], entry.b, 'frosted', NON_TODAY);
  add('teamDoor-transom', [td.x0, 17], [td.x1, 17], 'frosted', NON_TODAY, { h0: DOOR_H });
  const pg = P.find((p) => p.id === 'projectGarageGlass')!;
  add('projectGarageGlass', pg.a, pg.b, x33Type, NON_TODAY);
  const pn = P.find((p) => p.id === 'projectNorthGlass')!;
  add('projectNorthGlass', pn.a, pn.b, 'frosted', NON_TODAY);
  // Project ODC west side: closed with frosted glass (or the built red-line partition, see futureProvision()).
  const fp = A.futureProvisionLine;
  if (CONFIG.futureProvisionBuilt) {
    add('odcWest-s', [fp.a[0], 17], fp.a, 'frosted', NON_TODAY);
    add('odcWest-n', fp.b, [fp.b[0], 58], 'frosted', NON_TODAY);
  } else add('odcWest', [fp.a[0], 17], [fp.a[0], 58], 'frosted', NON_TODAY);
  // ADC-04 continuation on the west side is closed in this build (envelopeNote), in every layout.
  add('westClosure', [0, 21], [0, 50], 'frosted', ALL);
  // Make Studio glass.
  for (const p of P.filter((q) => q.id.startsWith('makeStudioGlass'))) add(p.id, p.a, p.b, 'clearEdgeBand', ['recommended']);
  G.layouts.keep9.makeStudioGlass.forEach(([a, b], i) => add(`makeStripGlass-${i}`, a, b, 'clearEdgeBand', ['keep9']));
  add('entry-sidelight-w', ENTRY_A, ENTRY_DOOR_A, 'clear', ALL, { h1: ENTRY_DOOR_H });
  add('entry-sidelight-e', ENTRY_DOOR_B, ENTRY_B, 'clear', ALL, { h1: ENTRY_DOOR_H });
  // Meeting room fronts.
  const [west, east] = A.meetingRooms;
  add('room-west-front-w', [west.x0, west.y1], [west.door.x0, west.y1], 'frostedBand', ALL);
  add('room-west-front-e', [west.door.x1, west.y1], [west.x1, west.y1], 'frostedBand', ALL);
  add('room-west-transom', [west.door.x0, west.y1], [west.door.x1, west.y1], 'clear', ALL, { h0: DOOR_H });
  add('room-east-west-face', [east.x0, 4], [east.x0, east.y1], 'frostedBand', ALL);
  return g;
}
export const GLASS: Glass[] = buildGlass();
export const glassFor = (layout: LayoutId) => GLASS.filter((g) => g.layouts.includes(layout));

/* ───────────────────────────── doors ───────────────────────────── */

export type DoorKind = 'slideGlass' | 'swingGlass' | 'swingSolid' | 'flush' | 'fire' | 'lift';
export interface Door {
  id: string;
  a: V2;
  b: V2;
  kind: DoorKind;
  h: number;
  /** How it opens: watch gate, proximity, arrival sequence, or never. */
  opens: 'watch' | 'auto' | 'arrival' | 'never';
  layouts: LayoutId[];
  tooltip?: string;
  /** Collides when closed. Flush context doors sit on solid walls and need no collider. */
  collide: boolean;
  /** Hinge end for swing doors ('a' or 'b') and the side it swings to (+1 = left normal). */
  hinge?: 'a' | 'b';
  swing?: 1 | -1;
}

function buildDoors(): Door[] {
  const d: Door[] = [];
  const core1 = AP.liftCore1;
  const lob = AP.liftLobby02;
  const c = AP.corridor2000;
  for (const k of core1.cars.filter((q) => q.column === 'east')) {
    const mid = (k.y0 + k.y1) / 2;
    d.push({
      id: `lift-${k.id}`,
      a: [lob.x0, mid - LIFT_DOOR_W / 2],
      b: [lob.x0, mid + LIFT_DOOR_W / 2],
      kind: 'lift',
      h: DOOR_H,
      opens: k.arrival ? 'arrival' : 'never',
      layouts: ALL,
      collide: true,
    });
  }
  d.push({ id: 'entry', a: ENTRY_DOOR_A, b: ENTRY_DOOR_B, kind: 'slideGlass', h: ENTRY_DOOR_H, opens: 'watch', layouts: ALL, collide: true });
  const [west, east] = A.meetingRooms;
  d.push({
    id: 'room-west',
    a: [west.door.x0, west.y1],
    b: [west.door.x1, west.y1],
    kind: 'swingGlass',
    h: DOOR_H,
    opens: 'auto',
    layouts: ALL,
    collide: true,
    hinge: 'b',
    swing: -1,
  });
  d.push({
    id: 'room-east',
    a: [east.door.x0, east.y1],
    b: [east.door.x1, east.y1],
    kind: 'swingSolid',
    h: DOOR_H,
    opens: 'auto',
    layouts: ALL,
    collide: true,
    hinge: 'a',
    swing: -1,
  });
  const td = A.fixtures.teamDoor;
  d.push({
    id: 'team',
    a: [td.x0, 17],
    b: [td.x1, 17],
    kind: 'swingGlass',
    h: DOOR_H,
    opens: 'never',
    layouts: NON_TODAY,
    tooltip: 'Project team only',
    collide: true,
  });
  const fr = A.fireDoorRecess;
  d.push({ id: 'fire-adc05', a: [fr.x0, fr.doorPlaneY], b: [fr.x1, fr.doorPlaneY], kind: 'fire', h: DOOR_H, opens: 'never', layouts: ALL, tooltip: 'Fire exit', collide: false });
  for (const r of AP.southBlock)
    d.push({ id: r.id, a: [r.door[0], c.y0], b: [r.door[1], c.y0], kind: 'flush', h: DOOR_H, opens: 'never', layouts: ALL, tooltip: 'Staff only', collide: false });
  const n = (id: string) => AP.northSideRooms.find((r) => r.id === id)!;
  const acd = n('adc04Acd');
  d.push({ id: 'adc04Acd', a: [acd.x0, c.y1], b: [acd.x1, c.y1], kind: 'flush', h: DOOR_H, opens: 'never', layouts: ALL, tooltip: 'ADC-04 · Restricted', collide: false });
  const fd = n('adc04FireDoor');
  d.push({ id: 'adc04Fire', a: [fd.x0, c.y1], b: [fd.x1, c.y1], kind: 'fire', h: DOOR_H, opens: 'never', layouts: ALL, tooltip: 'Fire exit', collide: false });
  return d;
}
export const DOORS: Door[] = buildDoors();
export const doorsFor = (layout: LayoutId) => DOORS.filter((d) => d.layouts.includes(layout));
export const doorById = (id: string) => DOORS.find((d) => d.id === id)!;

/* ───────────────────────────── desks ───────────────────────────── */

export type DeskSet = 'projectODC' | 'garage' | 'nine' | 'strip';
export type Side = 'E' | 'W' | 'N' | 'S';
export interface Desk {
  set: DeskSet;
  index: number;
  x: number;
  y: number;
  w: number;
  d: number;
  side: Side;
}
/** Strip desks carry no chair side in the data: rows pair back to back at y 29|31 and 39|41 (see DECISIONS). */
const stripSide = (x: number, y: number, w: number): Side => {
  if (w === 2) return 'E';
  return ({ 21: 'N', 29: 'S', 31: 'N', 39: 'S', 41: 'N', 49: 'S' } as Record<number, Side>)[y] ?? (x > 70 ? 'N' : 'S');
};
const D = A.desks;
/** Order matters: layouts show a prefix of this list (90, 99 or 112 desks), so one instanced mesh serves all four. */
export const DESKS: Desk[] = [
  ...D.projectODC.map(([x, y, w, d, s], index): Desk => ({ set: 'projectODC', index, x, y, w, d, side: s as Side })),
  ...D.garage.map(([x, y, w, d, s], index): Desk => ({ set: 'garage', index, x, y, w, d, side: s as Side })),
  ...D.optionalNine_REMOVED.map(([x, y, w, d], index): Desk => ({ set: 'nine', index, x, y, w, d, side: 'W' })),
  ...D.strip_REMOVED.map(([x, y, w, d], index): Desk => ({ set: 'strip', index, x, y, w, d, side: stripSide(x, y, w) })),
];
export const DESK_COUNT: Record<LayoutId, number> = {
  today: DESKS.length,
  recommended: D.projectODC.length + D.garage.length,
  keep9: D.projectODC.length + D.garage.length + D.optionalNine_REMOVED.length,
  rejected: D.projectODC.length + D.garage.length,
};
export const desksFor = (layout: LayoutId) => DESKS.slice(0, DESK_COUNT[layout]);
/** Chair centre for a desk: tucked in, 0.95 ft out from the desk edge. */
export function chairPos(d: Desk): { x: number; y: number; yawDeg: number } {
  const cx = d.x + d.w / 2;
  const cy = d.y + d.d / 2;
  const out = 0.95;
  switch (d.side) {
    case 'E':
      return { x: d.x + d.w + out, y: cy, yawDeg: 180 };
    case 'W':
      return { x: d.x - out, y: cy, yawDeg: 0 };
    case 'N':
      return { x: cx, y: d.y + d.d + out, yawDeg: 270 };
    default:
      return { x: cx, y: d.y - out, yawDeg: 90 };
  }
}
/** Direction (plan) the seated person faces, i.e. from chair toward desk. */
export const sideVec: Record<Side, V2> = { E: [1, 0], W: [-1, 0], N: [0, 1], S: [0, -1] };

/* ───────────────────────────── fixtures per layout ───────────────────────────── */

export type PlantKind = 'ficusTall' | 'olive' | 'lowPod' | 'midPlanter' | 'cornerPod';
export interface Plant {
  x: number;
  y: number;
  kind: PlantKind;
  r: number;
  zone: string;
}
export interface PlinthPos {
  x: number; // centre
  y: number;
  device: number; // index into the eight museum devices
  newest: boolean;
  /** Direction the placard faces. */
  face: Side;
}
export interface KioskPos {
  id: string;
  x: number;
  y: number;
}
export interface Fixtures {
  landing: { x0: number; x1: number; bottom: number; height: number; wallY: number; faces: 'N'; slat: [number, number] | null } | null;
  journey: { x0: number; x1: number; bottom: number; top: number } | null;
  kiosks: KioskPos[];
  kioskRug: RectFt | null;
  prism: { x0: number; x1: number; bottom: number; top: number } | null;
  fivePoint: boolean;
  galleria: { x0: number; x1: number; rail: number; devices: number } | null;
  vrSeats: V2[];
  sideTable: V2 | null;
  plinths: PlinthPos[];
  plinthSize: number;
  plinthHeight: number;
  sofas: ArcDef[];
  rug: { center: V2; d: number } | null;
  board: (RectFt & { demoY: number }) | null;
  foosball: (RectFt & { axis: 'NS' | 'EW' }) | null;
  scoreboard: { x0: number; x1: number; y: number; h: number } | null;
  cloud: (RectFt & { drop: number }) | null;
  memories: { x0: number; x1: number; bottom: number; top: number } | null;
  selfieDisc: { x: number; y: number; d: number } | null;
  tripod: V2 | null;
  readNote: V2 | null;
  voicesGlass: { x: number; y0: number; y1: number } | null;
  makeSign: { x: number; y: number } | null;
  plants: Plant[];
  today: typeof G.layouts.today.furniture;
}

const plantKind = (t: string): { kind: PlantKind; r: number } =>
  t.startsWith('tall') ? { kind: 'ficusTall', r: 0.8 } : t.startsWith('olive') ? { kind: 'olive', r: 0.9 } : t.startsWith('low') ? { kind: 'lowPod', r: 0.75 } : t.startsWith('mid') ? { kind: 'midPlanter', r: 0.6 } : { kind: 'cornerPod', r: 0.5 };
const ALL_PLANTS: Plant[] = A.fixtures.plants.map((p) => ({ x: p.x, y: p.y, zone: p.zone, ...plantKind(p.type) }));

export function kioskPositions(count = CONFIG.kioskCount): KioskPos[] {
  const base = A.fixtures.kiosks;
  if (count === base.length) return base.map((k) => ({ ...k }));
  const x0 = base[0].x;
  const x1 = base[base.length - 1].x;
  return Array.from({ length: count }, (_, i) => ({ id: `K${i + 1}`, x: x0 + (i * (x1 - x0)) / (count - 1), y: base[i % 2].y }));
}

const F = A.fixtures;
const LANDING_ASPECT = 16 / 9;

function fixturesRecommended(): Fixtures {
  const mp = F.museumPlinths;
  const voices = A.glassPartitions.find((p) => p.id === 'makeStudioGlassSouth')!;
  return {
    landing: { x0: F.landingDisplay.x0, x1: F.landingDisplay.x1, bottom: F.landingDisplay.bottomFt, height: (F.landingDisplay.x1 - F.landingDisplay.x0) / LANDING_ASPECT, wallY: 0, faces: 'N', slat: [20.5, 33.5] },
    journey: { x0: F.orchardJourneyWall.x0, x1: F.orchardJourneyWall.x1, bottom: F.orchardJourneyWall.bandBottomFt, top: F.orchardJourneyWall.bandTopFt },
    kiosks: kioskPositions(),
    kioskRug: F.kioskRug,
    prism: { x0: F.prismGraphic.x0, x1: F.prismGraphic.x1, bottom: F.prismGraphic.bottomFt, top: F.prismGraphic.topFt },
    fivePoint: true,
    galleria: { x0: F.appGalleria.x0, x1: F.appGalleria.x1, rail: F.appGalleria.railHeightFt, devices: F.appGalleria.devices },
    vrSeats: F.vrSeats.map((s) => [s.x, s.y] as V2),
    sideTable: [F.vrSeats[0].x, (F.vrSeats[0].y + F.vrSeats[1].y) / 2],
    plinths: mp.ys.map((y, i) => ({ x: (mp.x0 + mp.x1) / 2, y: y + mp.sizeFt / 2, device: i, newest: i === mp.newestIndex, face: 'E' as Side })),
    plinthSize: mp.sizeFt,
    plinthHeight: mp.heightFt,
    sofas: [F.crescentSofa],
    rug: { center: F.crescentRug.center, d: F.crescentRug.diameterFt },
    board: { ...F.collabBoard, demoY: F.collabBoard.demoPositionY },
    foosball: { ...F.foosball, axis: 'NS' },
    scoreboard: { x0: F.foosballScoreboard.x0, x1: F.foosballScoreboard.x1, y: 51, h: F.foosballScoreboard.centreHeightFt },
    cloud: { ...F.slatCeilingCloud, drop: F.slatCeilingCloud.dropFt },
    memories: { x0: F.memoriesWall.x0, x1: F.memoriesWall.x1, bottom: F.memoriesWall.bottomFt, top: F.memoriesWall.topFt },
    selfieDisc: { x: F.selfieDisc.x, y: F.selfieDisc.y, d: F.selfieDisc.diameterFt },
    tripod: [F.selfieTripod.x, F.selfieTripod.y],
    readNote: [F.readNoteStand.x, F.readNoteStand.y],
    voicesGlass: { x: voices.a[0], y0: voices.a[1], y1: voices.b[1] },
    makeSign: { x: 58, y: 35.5 },
    plants: ALL_PLANTS,
    today: [],
  };
}

function fixturesKeep9(): Fixtures {
  const r = fixturesRecommended();
  const ch = G.layouts.keep9.fixtureChanges;
  const mp = ch.museumPlinths;
  const glassX = G.layouts.keep9.makeStudioGlass[0][0][0];
  const devices = [4, 5, 7]; // first touchscreen phone, first tablet, spatial headset
  return {
    ...r,
    plinths: mp.ys.map((y, i) => ({ x: (mp.x0 + mp.x1) / 2, y: y + r.plinthSize / 2, device: devices[i], newest: devices[i] === 7, face: 'E' as Side })),
    // "two facing curved benches centred (70.5,30): outerR 4.2, innerR 2.6, spans 125-235 deg and -55-55 deg"
    sofas: [
      { center: [70.5, 30], outerR: 4.2, innerR: 2.6, startDeg: 125, endDeg: 235 },
      { center: [70.5, 30], outerR: 4.2, innerR: 2.6, startDeg: -55, endDeg: 55 },
    ],
    rug: { center: [70.5, 30], d: 12 },
    board: { ...ch.collabBoard, demoY: 34.0 },
    foosball: { ...ch.foosball, axis: 'NS' },
    scoreboard: { x0: 72, x1: 74, y: 51, h: F.foosballScoreboard.centreHeightFt },
    cloud: { ...ch.slatCeilingCloud, drop: F.slatCeilingCloud.dropFt },
    memories: { x0: 64.5, x1: 69, bottom: F.memoriesWall.bottomFt, top: F.memoriesWall.topFt },
    selfieDisc: { x: ch.selfieDisc.x, y: ch.selfieDisc.y, d: F.selfieDisc.diameterFt },
    tripod: [ch.selfieTripod.x, ch.selfieTripod.y],
    readNote: [ch.readNoteStand.x, ch.readNoteStand.y],
    voicesGlass: { x: glassX, y0: 21, y1: 33 },
    makeSign: { x: glassX, y: 35.5 },
    // The museum-line pod would sit in the restored desk column's chair zone.
    plants: ALL_PLANTS.filter((p) => !(p.x === 59.2 && p.y === 50.2)),
  };
}

function fixturesRejected(): Fixtures {
  const r = fixturesRecommended();
  const f = G.layouts.rejected.fixtures;
  const mp = f.museumPlinths;
  const devices = [0, 3, 4, 5, 7];
  const size = r.plinthSize;
  const ld = f.landingDisplay;
  return {
    ...r,
    landing: { x0: ld.x0, x1: ld.x1, bottom: F.landingDisplay.bottomFt, height: (ld.x1 - ld.x0) / LANDING_ASPECT, wallY: 12, faces: 'N', slat: null },
    kiosks: f.kiosks.map((k) => ({ id: k.id, x: (k.x0 + k.x1) / 2, y: k.y })),
    kioskRug: null,
    galleria: null,
    plinths: devices.map((device, i) => ({
      x: mp.x0 + size / 2 + (i * (mp.x1 - mp.x0 - size)) / (devices.length - 1),
      y: (mp.y0 + mp.y1) / 2,
      device,
      newest: device === 7,
      face: 'N' as Side,
    })),
    sofas: [f.crescentSofa],
    rug: null,
    board: { ...f.collabBoard, demoY: f.collabBoard.y0 + 0.5 },
    foosball: { ...f.foosball, axis: 'EW' },
    scoreboard: null,
    cloud: null,
    voicesGlass: null,
    makeSign: null,
    plants: ALL_PLANTS.filter((p) => !(p.x === 50.0 && p.y === 9.8) && !(p.x === 76.0 && p.y === 22.2)),
  };
}

function fixturesToday(): Fixtures {
  return {
    landing: null,
    journey: null,
    kiosks: [],
    kioskRug: null,
    prism: null,
    fivePoint: false,
    galleria: null,
    vrSeats: [],
    sideTable: null,
    plinths: [],
    plinthSize: F.museumPlinths.sizeFt,
    plinthHeight: F.museumPlinths.heightFt,
    sofas: [],
    rug: null,
    board: null,
    foosball: null,
    scoreboard: null,
    cloud: null,
    memories: null,
    selfieDisc: null,
    tripod: null,
    readNote: null,
    voicesGlass: null,
    makeSign: null,
    plants: ALL_PLANTS.filter((p) => p.zone.startsWith('Lift') || p.zone.includes('6-pax')),
    today: G.layouts.today.furniture,
  };
}

export const FIXTURES: Record<LayoutId, Fixtures> = {
  today: fixturesToday(),
  recommended: fixturesRecommended(),
  keep9: fixturesKeep9(),
  rejected: fixturesRejected(),
};

/* ───────────────────────────── zones ───────────────────────────── */

export interface Zone {
  id: string;
  name: string;
  polygon: V2[];
  /** 1-based label number, or 0 for greyed context labels. */
  n: number;
  context?: boolean;
  floor?: 'terrazzo' | 'oak' | 'carpet' | 'porcelain';
}
const rectPoly = (r: RectFt): V2[] => [
  [r.x0, r.y0],
  [r.x1, r.y0],
  [r.x1, r.y1],
  [r.x0, r.y1],
];
const APPROACH_ZONES: Zone[] = [
  { id: 'liftLobby', name: 'Lift Lobby (#1)', n: 1, polygon: rectPoly({ ...AP.liftLobby02, y1: AP.corridor2000.y0 }) },
  { id: 'corridor', name: 'TCS Corridor', n: 2, polygon: rectPoly(AP.corridor2000) },
  { id: 'entry', name: 'Entry', n: 3, polygon: [[15, 0], [20, 0], [20, 12], [15, 12]] },
];
const CONTEXT_ZONES: Zone[] = [
  { id: 'projectODC', name: 'Project ODC (secure)', n: 0, context: true, polygon: A.zones.find((z) => z.id === 'projectODC')!.polygon },
  { id: 'fifteenPax', name: '15-pax room (formal sessions)', n: 0, context: true, polygon: rectPoly(AP.fifteenPaxRoom) },
];
const ZONE_NUM: Record<string, number> = { trail: 4, makeAtDoor: 4, garage: 5, windowPause: 6, makeStudio: 7, makeStrip: 7, kioskStrip: 7, memoryCorner: 8 };
const baseName = (id: string) => A.zones.find((z) => z.id === id)?.name ?? id;
const studioZones = (defs: ZoneDef[]): Zone[] =>
  defs
    .filter((z) => z.id !== 'projectODC')
    .map((z) => ({ id: z.id, name: z.name ?? baseName(z.id), polygon: z.polygon, n: ZONE_NUM[z.id] ?? 0 }))
    .sort((p, q) => p.n - q.n);

export const ZONES: Record<LayoutId, Zone[]> = {
  today: [...APPROACH_ZONES, { id: 'openFloor', name: 'ADC-05 open floor', n: 4, polygon: A.envelopeInterior as V2[] }, CONTEXT_ZONES[1]],
  recommended: [...APPROACH_ZONES, ...studioZones(A.zones), ...CONTEXT_ZONES],
  keep9: [...APPROACH_ZONES, ...studioZones(G.layouts.keep9.zones), ...CONTEXT_ZONES],
  rejected: [...APPROACH_ZONES, ...studioZones(G.layouts.rejected.zones), ...CONTEXT_ZONES],
};
export const zonesFor = (layout: LayoutId) => ZONES[layout];

export const SUMMARY: Record<LayoutId, string> = {
  today: G.layouts.today.summary,
  recommended: G.layouts.recommended.summary,
  keep9: G.layouts.keep9.summary,
  rejected: G.layouts.rejected.rejectionCard,
};

/** Floor finish patches above the terrazzo base, per layout (plan polygons). */
export function floorPatches(layout: LayoutId): { id: string; mat: 'oak' | 'carpet'; polygon: V2[] }[] {
  const north: V2[] = [[35, 60], [35, 58], [0, 58]];
  if (layout === 'today') return [{ id: 'carpet-open', mat: 'carpet', polygon: [[0, 17], [77, 17], [77, 51], [71, 51], [71, 55], [69, 55], [69, 60], ...north] }];
  const gx = layout === 'keep9' ? G.layouts.keep9.makeStudioGlass[0][0][0] : 58;
  return [
    { id: 'carpet-work', mat: 'carpet', polygon: [[0, 17], [gx, 17], [gx, 60], ...north] },
    { id: 'oak-make', mat: 'oak', polygon: [[gx, 21], [77, 21], [77, 51], [gx, 51]] },
  ];
}

/* ───────────────────────────── collision footprints ───────────────────────────── */

export type Footprint =
  | { id: string; kind: 'rect'; x0: number; y0: number; x1: number; y1: number; tall: boolean; group: string }
  | { id: string; kind: 'circle'; x: number; y: number; r: number; tall: boolean; group: string };

export const KIOSK_FOOT = F.kioskSpec.footprintFt; // [depth along x, width along y]
const CHAIR_REACH = 1.2;

export function deskFootprint(d: Desk): Footprint {
  const e = { x0: d.x, y0: d.y, x1: d.x + d.w, y1: d.y + d.d };
  if (d.side === 'E') e.x1 += CHAIR_REACH;
  if (d.side === 'W') e.x0 -= CHAIR_REACH;
  if (d.side === 'N') e.y1 += CHAIR_REACH;
  if (d.side === 'S') e.y0 -= CHAIR_REACH;
  return { id: `desk-${d.set}-${d.index}`, kind: 'rect', ...e, tall: true, group: 'desk' };
}

export function arcCircles(s: ArcDef, id: string): Footprint[] {
  const rm = (s.outerR + s.innerR) / 2;
  const rr = (s.outerR - s.innerR) / 2;
  const span = ((s.endDeg - s.startDeg) * Math.PI) / 180;
  const n = Math.max(2, Math.ceil((span * rm) / (rr * 1.1)));
  const out: Footprint[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (s.startDeg * Math.PI) / 180 + (span * i) / n;
    out.push({ id: `${id}-${i}`, kind: 'circle', x: s.center[0] + Math.cos(a) * rm, y: s.center[1] + Math.sin(a) * rm, r: rr, tall: false, group: 'sofa' });
  }
  return out;
}

export function footprintsFor(layout: LayoutId): Footprint[] {
  const f = FIXTURES[layout];
  const out: Footprint[] = [];
  const rect = (id: string, x0: number, y0: number, x1: number, y1: number, group: string, tall = true) => out.push({ id, kind: 'rect', x0, y0, x1, y1, tall, group });
  const circle = (id: string, x: number, y: number, r: number, group: string, tall = true) => out.push({ id, kind: 'circle', x, y, r, tall, group });
  for (const p of A.pillars) rect(`pillar-${p.id}`, p.x0, p.y0, p.x1, p.y1, 'pillar');
  for (const d of desksFor(layout)) out.push(deskFootprint(d));
  for (const k of f.kiosks) rect(`kiosk-${k.id}`, k.x - KIOSK_FOOT[0] / 2, k.y - KIOSK_FOOT[1] / 2, k.x + KIOSK_FOOT[0] / 2, k.y + KIOSK_FOOT[1] / 2, 'kiosk');
  f.plinths.forEach((p, i) => rect(`plinth-${i}`, p.x - f.plinthSize / 2, p.y - f.plinthSize / 2, p.x + f.plinthSize / 2, p.y + f.plinthSize / 2, 'plinth'));
  f.sofas.forEach((s, i) => out.push(...arcCircles(s, `sofa-${i}`)));
  if (f.board) rect('board', f.board.x0, f.board.y0, f.board.x1, f.board.y1, 'board');
  if (f.foosball) rect('foosball', f.foosball.x0, f.foosball.y0, f.foosball.x1, f.foosball.y1, 'foosball');
  f.vrSeats.forEach((s, i) => circle(`vrSeat-${i}`, s[0], s[1], 1.25, 'vrSeat', false));
  if (f.sideTable) circle('sideTable', f.sideTable[0], f.sideTable[1], 0.8, 'sideTable', false);
  if (f.tripod) circle('tripod', f.tripod[0], f.tripod[1], 0.7, 'tripod');
  if (f.readNote) circle('readNote', f.readNote[0], f.readNote[1], 0.45, 'readNote');
  f.plants.forEach((p, i) => circle(`plant-${i}`, p.x, p.y, p.r, 'plant', p.kind !== 'lowPod' && p.kind !== 'cornerPod'));
  // Meeting room tables (8 x 3.5 ft, long axis east-west) with chairs.
  for (const r of A.meetingRooms) {
    const cx = (r.x0 + r.x1) / 2;
    const cy = r.y0 + 5.6;
    rect(`table-${r.id}`, cx - 4, cy - 3.6, cx + 4, cy + 3.6, 'meetingTable', false);
  }
  for (const t of f.today) {
    if (t.x0 !== undefined && t.x1 !== undefined && t.y0 !== undefined && t.y1 !== undefined) rect(t.id, t.x0, t.y0, t.x1, t.y1, 'today');
    else if (t.id === 'centreCollabSofa') rect(t.id, t.x! - 3.5, 0.2, t.x! + 3.5, t.y! + 1.4, 'today', false);
    else if (t.id === 'centreCollabCoffeeTable') circle(t.id, t.x!, t.y!, 1.2, 'today', false);
    else circle(t.id, t.x!, t.y!, 3.4, 'today', false);
  }
  // Lobby lift-core context is walled; approach planters are in plants.
  return out;
}

/** Collision segments: walls (minus openings), windows, glass, blockers and closed doors. */
export interface CollSeg {
  id: string;
  a: V2;
  b: V2;
  /** Half thickness in feet. */
  r: number;
}
export function collisionSegments(layout: LayoutId, openDoors: ReadonlySet<string> = new Set()): CollSeg[] {
  const out: CollSeg[] = [];
  for (const w of WALLS) {
    if (!w.collide) continue;
    const n = leftNormal(w.a, w.b);
    const len = segLen(w.a, w.b);
    const ux = (w.b[0] - w.a[0]) / len;
    const uy = (w.b[1] - w.a[1]) / len;
    const pt = (s: number): V2 => [w.a[0] + ux * s + n[0] * w.off, w.a[1] + uy * s + n[1] * w.off];
    // Capsule ends are pulled in by the half thickness so a thick wall ends flush at a door jamb.
    const hr = w.t / 2;
    const piece = (id: string, s0: number, s1: number) => {
      const inset = s1 - s0 > 2 * hr ? hr : 0;
      out.push({ id, a: pt(s0 + inset), b: pt(s1 - inset), r: hr });
    };
    let s = 0;
    const ops = [...w.openings].sort((p, q) => p.s0 - q.s0);
    ops.forEach((o, i) => {
      if (o.s0 > s + 1e-6) piece(`${w.id}#${i}`, s, o.s0);
      s = o.s1;
    });
    if (len > s + 1e-6) piece(`${w.id}#e`, s, len);
  }
  for (const w of WINDOWS) out.push({ id: w.id, a: w.a, b: w.b, r: 0.05 });
  for (const g of glassFor(layout)) if (g.h0 < 3) out.push({ id: g.id, a: g.a, b: g.b, r: GLASS_T });
  for (const b of BLOCKERS) out.push({ id: b.id, a: b.a, b: b.b, r: 0.05 });
  for (const d of doorsFor(layout)) if (d.collide && !openDoors.has(d.id)) out.push({ id: `door-${d.id}`, a: d.a, b: d.b, r: 0.08 });
  return out;
}

/** Spec counts for the layout (Section 19.4), derived from the same data the scene is built from. */
export function countsFor(layout: LayoutId) {
  const f = FIXTURES[layout];
  const desks = desksFor(layout);
  return {
    desks: desks.length,
    garageDesks: desks.filter((d) => d.set !== 'projectODC').length,
    projectDesks: desks.filter((d) => d.set === 'projectODC').length,
    kiosks: f.kiosks.length,
    plinths: f.plinths.length,
    galleriaDevices: f.galleria?.devices ?? 0,
    vrSeats: f.vrSeats.length,
    plantPods: f.plants.length,
  };
}

export { leftNormal, rectPoly };
