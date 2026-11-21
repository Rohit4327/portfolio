/** Interactive items per layout: where their white ring sits and the authored inspect pose (Section 8). */
import type { LayoutId } from '../config';
import { CONFIG } from '../config';
import { A, AP, type V2 } from '../data/geometry';
import { CONTENT } from '../data/manifest';
import { FIXTURES, KIOSK_FOOT } from '../data/plan';
import { PROFILE } from '../state/store';

export type HotspotKind =
  | 'poster' | 'corridorScreen' | 'watchGate' | 'prism' | 'landing' | 'kiosk' | 'journey' | 'fivePoint' | 'galleria' | 'headset'
  | 'plinth' | 'voices' | 'board' | 'foosball' | 'selfie' | 'readNote' | 'teamDoor' | 'callPanel';

export interface Pose {
  cam: V2;
  /** Camera height in metres (default eye height). */
  camH?: number;
  look: V2;
  lookH: number; // feet
  fov?: number;
}
export interface Hotspot {
  id: string;
  kind: HotspotKind;
  /** Registry key of the object it belongs to, if any. */
  object?: string;
  index: number;
  pos: V2;
  h: number; // ring height, feet
  title: string;
  lines: string[];
  verb: string;
  /** Null = no camera move (instant actions, pick-up items). */
  pose: Pose | null;
  pages: number;
}

/** Kiosk content order: by default K1..K4; ?profile=newManager|coe swaps it from the manifest. */
export function kioskOrder(): number[] {
  const ids = CONTENT.kiosks.map((k) => k.id);
  const prof = PROFILE && (CONTENT.kioskProfiles as Record<string, string[]>)[PROFILE];
  const order = prof ? prof.map((id) => ids.indexOf(id)).filter((i) => i >= 0) : ids.map((_, i) => i);
  return order.length ? order : ids.map((_, i) => i);
}

export function hotspotsFor(layout: LayoutId): Hotspot[] {
  const f = FIXTURES[layout];
  const out: Hotspot[] = [];
  const add = (h: Omit<Hotspot, 'index' | 'pages'> & { index?: number; pages?: number }) => out.push({ index: 0, pages: 1, ...h });
  const c = AP.corridor2000;
  // Corridor
  const bays = Object.fromEntries(AP.posterBays.map((b) => [b.id, b]));
  const posterX = [-25, -21, -17, bays.bayB.x1 - 1.4, bays.bayC.x0 + 1.3];
  posterX.forEach((x, i) =>
    add({ id: `poster-${i}`, kind: 'poster', object: `*:poster-${i}`, index: i, pos: [x, c.y0 + 0.2], h: 5, title: `Poster ${i + 1}`, lines: ['Framed print, 700 × 1000 mm.', 'Drag to pan, scroll or pinch to zoom, double-click to fit.'], verb: 'Inspect', pose: { cam: [x, c.y0 + 4.4], look: [x, c.y0], lookH: 5, fov: 42 } }),
  );
  const sx = (bays.bayB.x0 + bays.bayB.x1) / 2 - 0.25;
  add({ id: 'corridorScreen', kind: 'corridorScreen', object: '*:corridorScreen', pos: [sx, c.y0 + 0.2], h: 5, title: 'TCS, with you for the long run', lines: ['A short loop on the way to the studio.', 'Captions on; sound is off by default.'], verb: 'Watch', pose: { cam: [sx, c.y0 + 5.2], look: [sx, c.y0], lookH: 5, fov: 48 } });
  // Lift lobby call panels: a chime only.
  add({ id: 'callPanel', kind: 'callPanel', pos: [AP.liftLobby02.x0 + 0.2, -29.05], h: 3.6, title: 'Call lift', lines: [], verb: 'Call lift', pose: null });
  // Entry
  const er = A.entryRecess;
  add({ id: 'watchGate', kind: 'watchGate', object: '*:badgeReader', pos: [er.x1 - 0.5, er.doorPlaneY - 0.7], h: er.badgeReader.heightFt, title: `${CONFIG.brandName} · ADC-05`, lines: [], verb: 'Tap watch to enter', pose: null });
  if (layout !== 'today') add({ id: 'teamDoor', kind: 'teamDoor', pos: [5.75, 16.6], h: 3.6, title: 'Project ODC', lines: [], verb: 'Project team only', pose: null });
  if (f.prism) add({ id: 'prism', kind: 'prism', object: `${layout}:prism`, pos: [20, 16.7], h: 4.75, title: 'PRISM', lines: ['Printed on the corridor face of the frosted glass.', 'Drag to pan, scroll or pinch to zoom.'], verb: 'Inspect', pose: { cam: [20, 6.5], look: [20, 17], lookH: 4.75, fov: 62 } });
  if (f.landing) {
    const L = f.landing;
    const cx = (L.x0 + L.x1) / 2;
    const dir = L.wallY === 0 ? 1 : 1;
    add({ id: 'landing', kind: 'landing', object: `${layout}:landing`, pos: [cx, L.wallY + 0.4], h: L.bottom + L.height / 2, title: 'Landing display', lines: ['The welcome loop greets each visitor by name.', 'Add ?visitor=Name to the address to try it.'], verb: 'Play', pose: { cam: [cx, L.wallY + dir * 10.5], look: [cx, L.wallY], lookH: L.bottom + L.height / 2, fov: 55 } });
  }
  const order = kioskOrder();
  f.kiosks.forEach((k, i) => {
    const content = CONTENT.kiosks[order[i % order.length]];
    add({ id: `kiosk-${k.id}`, kind: 'kiosk', object: `${layout}:kiosk-${k.id}`, index: i, pages: content.pages.length, pos: [k.x - KIOSK_FOOT[0] / 2 - 0.15, k.y], h: 4.2, title: content.title, lines: ['Swipe or use Back and Next to turn the pages.', 'Audio is off by default, with captions.'], verb: 'Explore', pose: { cam: [k.x - KIOSK_FOOT[0] / 2 - 3.1, k.y], look: [k.x, k.y], lookH: 3.6, fov: 50 } });
  });
  if (f.journey) add({ id: 'journey', kind: 'journey', object: `${layout}:journey`, pos: [(f.journey.x0 + f.journey.x1) / 2, 0.5], h: 5.25, title: 'Orchard Journey', lines: ['Discover · Design · Build · Connect · Evolve.', 'Reads west to east. Drag to move along the wall.'], verb: 'Inspect', pose: { cam: [f.journey.x0 + 3, 4.6], look: [f.journey.x0 + 3, 0], lookH: 5.25, fov: 55 } });
  if (f.fivePoint) add({ id: 'fivePoint', kind: 'fivePoint', object: `${layout}:fivePoint`, pos: [35, 16.7], h: 4.5, pages: 5, title: 'Five Point Anyone', lines: CONTENT.fivePoint.map((l) => `${l.level} · ${l.name}`), verb: 'Read', pose: { cam: [35, 11.2], look: [35, 17], lookH: 4.6, fov: 62 } });
  if (f.galleria)
    for (let i = 0; i < f.galleria.devices; i++) {
      const G = f.galleria;
      const x = G.x0 + ((i + 0.5) * (G.x1 - G.x0)) / G.devices;
      const app = CONTENT.appGalleria[i % CONTENT.appGalleria.length];
      add({ id: `galleria-${i}`, kind: 'galleria', object: `${layout}:galleria-${i}`, index: i, pages: Math.max(1, app.screens.length), pos: [x, 12.35], h: G.rail + 0.35, title: app.name, lines: [app.tags.join(' · '), 'Swipe through three screens, scan the QR, or put it back.'], verb: 'Pick up', pose: null });
    }
  if (f.sideTable) add({ id: 'headset', kind: 'headset', object: `${layout}:headset`, pos: f.sideTable, h: 2.6, title: 'Spatial headset', lines: ['Passthrough view of the studio with a floating Home panel.', 'You can still look around and walk.'], verb: 'Try the headset', pose: null });
  f.plinths.forEach((p, i) => {
    const info = CONTENT.museum[p.device % CONTENT.museum.length];
    const fx = p.face === 'E' ? 1 : 0;
    const fy = p.face === 'N' ? 1 : 0;
    // Camera sits off to one side so the object is framed in the right part of the view.
    add({ id: `plinth-${i}`, kind: 'plinth', object: `${layout}:plinth-device-${i}`, index: i, pages: f.plinths.length, pos: [p.x + fx * 0.9, p.y + fy * 0.9], h: f.plinthHeight + 0.6, title: `${info.year} · ${info.title}`, lines: [info.text, p.newest ? 'Newest' : ''], verb: 'Inspect', pose: { cam: [p.x + fx * 2.7 + fy * 0.75, p.y + fy * 2.7 + fx * 0.75], camH: 1.36, look: [p.x + fy * 0.75, p.y + fx * 0.75], lookH: f.plinthHeight + 0.55, fov: 38 } });
  });
  if (f.voicesGlass) {
    const V = f.voicesGlass;
    add({ id: 'voices', kind: 'voices', object: `${layout}:voices`, pages: Math.min(6, CONTENT.voices.length), pos: [V.x + 0.3, (V.y0 + V.y1) / 2 + 4.6], h: 6, title: 'Wall of Voices', lines: [], verb: 'Read', pose: { cam: [V.x + 7.5, (V.y0 + V.y1) / 2], look: [V.x, (V.y0 + V.y1) / 2], lookH: 5.6, fov: 62 } });
  }
  if (f.board) {
    const B = f.board;
    const cx = (B.x0 + B.x1) / 2;
    add({ id: 'board', kind: 'board', object: `${layout}:board`, pos: [cx, B.y0 - 0.3], h: 4.4, title: 'Collaboration board', lines: ['Start a session: the board rolls forward and opens a whiteboard.', 'Draw with the mouse or a finger.'], verb: 'Start session', pose: { cam: [cx, B.demoY - 6.4], look: [cx, B.demoY], lookH: 4.3, fov: 58 } });
  }
  if (f.foosball) {
    const F = f.foosball;
    const cx = (F.x0 + F.x1) / 2;
    const cy = (F.y0 + F.y1) / 2;
    const ns = F.axis === 'NS';
    add({ id: 'foosball', kind: 'foosball', object: `${layout}:foosball`, pos: ns ? [F.x0 - 0.3, cy] : [cx, F.y1 + 0.3], h: 3.3, title: 'Foosball', lines: ['First to 5 against the house.', '1 to 4 pick a rod · W/S or arrows slide · Space kicks.'], verb: 'Start match', pose: { cam: ns ? [F.x0 - 2.3, cy] : [cx, F.y1 + 2.3], camH: 1.75, look: [cx, cy], lookH: 2.75, fov: 55 } });
  }
  if (f.tripod && f.selfieDisc) add({ id: 'selfie', kind: 'selfie', object: `${layout}:tripod`, pos: f.tripod, h: 5, title: 'Memory Corner', lines: ['Stand on the disc. A 3-2-1 countdown, then the photo prints.', ''], verb: 'Take a photo', pose: { cam: [f.tripod[0], f.tripod[1] + 0.2], camH: 1.5, look: [f.selfieDisc.x, 60], lookH: 5.2, fov: 62 } });
  if (f.readNote) {
    const n = f.readNote;
    const d: V2 = layout === 'keep9' ? [0, -1] : [0.707, 0.707];
    add({ id: 'readNote', kind: 'readNote', object: `${layout}:readNote`, pos: n, h: 3.9, title: CONTENT.readNote.title, lines: [], verb: 'Read note', pose: { cam: [n[0] + d[0] * 1.9, n[1] + d[1] * 1.9], camH: 1.45, look: n, lookH: 3.7, fov: 45 } });
  }
  return out;
}
/** Hotspot rings show within 8 ft. */
export const HOTSPOT_RANGE_FT = 8;
