import raw from '../../data/geometry.json';

/** Typed view of data/geometry.json (Section 24). Units: plan feet. +x east, +y north. */
export type V2 = readonly [number, number];
export interface RectFt {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
export interface Pillar extends RectFt {
  id: string;
}
export interface GlassPartition {
  id: string;
  a: V2;
  b: V2;
  type: string;
}
export interface ZoneDef {
  id: string;
  name?: string;
  polygon: V2[];
}
export interface PlantDef {
  x: number;
  y: number;
  type: string;
  zone: string;
}
export type DeskTuple = [number, number, number, number, string?];
export interface ArcDef {
  center: V2;
  outerR: number;
  innerR: number;
  startDeg: number;
  endDeg: number;
}

export interface GeometryFile {
  adc05: {
    envelopeInterior: V2[];
    ceilingHeightFt: number;
    solidWalls: V2[][];
    windows: { sillFt: number; headFt: number; mullionEveryFt: number; segments: [V2, V2][] };
    pillars: Pillar[];
    glassPartitions: GlassPartition[];
    futureProvisionLine: { a: V2; b: V2 };
    meetingRooms: (RectFt & { id: string; door: { wall: string; x0: number; x1: number } })[];
    entryRecess: RectFt & { doorPlaneY: number; badgeReader: { x: number; y: number; heightFt: number } };
    fireDoorRecess: RectFt & { doorPlaneY: number };
    fireLane: RectFt;
    spine: RectFt;
    desks: {
      projectODC: DeskTuple[];
      garage: DeskTuple[];
      optionalNine_REMOVED: DeskTuple[];
      strip_REMOVED: DeskTuple[];
    };
    zones: ZoneDef[];
    fixtures: {
      landingDisplay: { x0: number; x1: number; bottomFt: number };
      orchardJourneyWall: { x0: number; x1: number; bandBottomFt: number; bandTopFt: number };
      kiosks: { id: string; x: number; y: number }[];
      kioskSpec: { footprintFt: [number, number]; heightFt: number };
      prismGraphic: { x0: number; x1: number; bottomFt: number; topFt: number };
      teamDoor: { x0: number; x1: number };
      appGalleria: { x0: number; x1: number; devices: number; railHeightFt: number };
      vrSeats: { x: number; y: number }[];
      museumPlinths: { x0: number; x1: number; sizeFt: number; heightFt: number; ys: number[]; newestIndex: number };
      crescentSofa: ArcDef & { seatHeightFt: number; backHeightFt: number };
      crescentRug: { center: V2; diameterFt: number };
      collabBoard: RectFt & { demoPositionY: number };
      foosball: RectFt;
      slatCeilingCloud: RectFt & { dropFt: number };
      memoriesWall: { x0: number; x1: number; bottomFt: number; topFt: number };
      readNoteStand: { x: number; y: number };
      plants: PlantDef[];
      selfieDisc: { x: number; y: number; diameterFt: number };
      selfieTripod: { x: number; y: number };
      foosballScoreboard: { x0: number; x1: number; centreHeightFt: number };
      kioskRug: RectFt;
    };
  };
  approach: {
    corridor2000: RectFt & { ceilingHeightFt: number };
    liftCore1: RectFt & {
      cars: { id: string; column: 'west' | 'east'; y0: number; y1: number; arrival?: boolean }[];
      eastColumnX: [number, number];
      westColumnX: [number, number];
    };
    liftLobby02: RectFt;
    liftCore2: RectFt;
    collabLoungeNorthOfCore1: RectFt;
    collabLoungeSouthOfCorridor: RectFt;
    southBlock: { id: string; x0: number; x1: number; door: [number, number] }[];
    northSideRooms: { id: string; x0: number; x1: number }[];
    posterBays: { id: string; x0: number; x1: number; content: string }[];
    visitorPath: V2[];
    fifteenPaxRoom: RectFt;
  };
  doorLabels: { door: string; text: string; at?: V2 | V2[]; where?: string }[];
  layouts: {
    today: {
      furniture: ({ id: string; spec?: string } & Partial<RectFt> & { x?: number; y?: number })[];
      summary: string;
    };
    recommended: { summary: string };
    keep9: {
      makeStudioGlass: [V2, V2][];
      zones: ZoneDef[];
      fixtureChanges: {
        collabBoard: RectFt;
        foosball: RectFt;
        museumPlinths: { x0: number; x1: number; ys: number[] };
        selfieDisc: { x: number; y: number };
        selfieTripod: { x: number; y: number };
        readNoteStand: { x: number; y: number };
        slatCeilingCloud: RectFt;
      };
      summary: string;
    };
    rejected: {
      zones: ZoneDef[];
      fixtures: {
        crescentSofa: ArcDef;
        collabBoard: RectFt;
        museumPlinths: RectFt & { count: number };
        foosball: RectFt;
        kiosks: { id: string; x0: number; x1: number; y: number }[];
        landingDisplay: { x0: number; x1: number; widthFt: number };
      };
      rejectionCard: string;
      summary: string;
    };
  };
}

export const G = raw as unknown as GeometryFile;
export const A = G.adc05;
export const AP = G.approach;

/** 1 ft in metres. */
export const FT = 0.3048;
export const CEIL_ADC = A.ceilingHeightFt;
export const CEIL_CORRIDOR = AP.corridor2000.ceilingHeightFt;
export const EYE_HEIGHT_M = 1.6;

/** Plan feet (x east, y north, h up) to three.js metres: north is -Z. */
export function toWorld<T extends { set(x: number, y: number, z: number): unknown }>(x: number, y: number, hFt: number, out: T): T {
  out.set(x * FT, hFt * FT, -y * FT);
  return out;
}
export const wx = (x: number) => x * FT;
export const wz = (y: number) => -y * FT;
export const wh = (h: number) => h * FT;

/** Model extent on the table (Section 4.3). */
export const MODEL_EXTENT: RectFt = { x0: -80, x1: 80, y0: -55, y1: 62 };

export function pointInPolygon(x: number, y: number, poly: readonly V2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function polygonCentroid(poly: readonly V2[]): V2 {
  let a = 0,
    cx = 0,
    cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    a += f;
    cx += (poly[j][0] + poly[i][0]) * f;
    cy += (poly[j][1] + poly[i][1]) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
export function polygonArea(poly: readonly V2[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return Math.abs(a / 2);
}
