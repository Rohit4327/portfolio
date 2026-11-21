/** Presentation-only context: the base board, cool-grey massing cut at 1.2 m, and the "#1" engraving. */
import * as THREE from 'three';
import { boxFt, group } from '../core/build';
import { M } from '../core/materials';
import { textPlane } from '../core/text';
import { AP, FT, MODEL_EXTENT, type RectFt } from '../data/geometry';
import { segBox } from './shell';

/** 1:40 → a 10 mm board is 0.4 m at full scale, the 5 mm reveal is 0.2 m. */
export const MODEL_SCALE = 1 / 40;
export const BOARD_T_M = 0.01 / MODEL_SCALE;
export const BOARD_REVEAL_M = 0.005 / MODEL_SCALE;
const CUT_FT = 1.2 / FT;
const T = 0.5;

function room(g: THREE.Group, r: RectFt, h = CUT_FT) {
  g.add(segBox(M.context, [r.x0, r.y0], [r.x1, r.y0], T, 0, 0, h));
  g.add(segBox(M.context, [r.x0, r.y1], [r.x1, r.y1], T, 0, 0, h));
  g.add(segBox(M.context, [r.x0, r.y0 + T / 2], [r.x0, r.y1 - T / 2], T, 0, 0, h));
  g.add(segBox(M.context, [r.x1, r.y0 + T / 2], [r.x1, r.y1 - T / 2], T, 0, 0, h));
}

/** Approximate context footprints read off reference/01 (about 1 ft accuracy; massing only). */
export const CONTEXT_ROOMS: (RectFt & { id: string })[] = [
  { id: 'adc04', x0: -78, x1: -0.6, y0: 0.4, y1: 58 },
  { id: 'fifteenPax', ...AP.fifteenPaxRoom },
  ...AP.northSideRooms.filter((r) => r.id.startsWith('adc04')).map((r) => ({ id: r.id, x0: r.x0, x1: r.x1, y0: 0.4, y1: 12 })),
  { id: 'huddleA', x0: -77, x1: -66, y0: 44, y1: 56 },
  { id: 'huddleB', x0: -66, x1: -56.5, y0: 44, y1: 56 },
  { id: 'breakout', x0: -77.5, x1: -57, y0: 6, y1: 43.5 },
  { id: 'liftCore2', ...AP.liftCore2 },
  ...AP.southBlock.map((r) => ({ id: r.id, x0: r.x0, x1: r.x1, y0: -16, y1: -6.9 })),
  { id: 'toilets', x0: -34.2, x1: 12.7, y0: -51.5, y1: -16 },
  { id: 'ahu', x0: 13.4, x1: 55, y0: -54, y1: -7 },
  { id: 'adc06', x0: 56, x1: 78, y0: -54, y1: -7 },
];

export function buildContext(): THREE.Group {
  const g = group('context');
  const e = MODEL_EXTENT;
  // Base board with a shadow-gap reveal underneath.
  const board = boxFt(M.baseBoard, e.x0, e.y0, e.x1, e.y1, -(BOARD_T_M / FT) - 0.02, -0.02);
  board.userData.noMerge = true;
  board.receiveShadow = true;
  board.castShadow = true;
  board.name = 'baseBoard';
  g.add(board);
  const rv = BOARD_REVEAL_M / FT;
  const reveal = boxFt(M.engrave, e.x0 + rv, e.y0 + rv, e.x1 - rv, e.y1 - rv, -(BOARD_T_M + BOARD_REVEAL_M) / FT - 0.02, -(BOARD_T_M / FT) - 0.02);
  reveal.userData.noMerge = true;
  g.add(reveal);
  for (const r of CONTEXT_ROOMS) room(g, r);
  // Lift core #1: shaft walls and car bays as massing (the arrival car itself is real geometry).
  const c = AP.liftCore1;
  room(g, { x0: c.x0, x1: c.x1 - 1.1, y0: c.y0, y1: c.y1 });
  for (const car of c.cars) {
    const [x0, x1] = car.column === 'east' ? c.eastColumnX : c.westColumnX;
    if (!car.arrival) room(g, { x0, x1, y0: car.y0, y1: car.y1 }, CUT_FT * 0.9);
  }
  // "#1" engraved beside lift core #1 on the base board.
  const eng = textPlane('#1', { w: 7 * FT, h: 3.4 * FT, color: '#b4b3af', weight: 300, size: 0.9, ppm: 60 });
  eng.rotation.x = -Math.PI / 2;
  eng.position.set(((c.x0 + c.x1) / 2) * FT, 0.0, -(c.y0 - 1.9) * FT);
  eng.name = 'engrave#1';
  g.add(eng);
  return g;
}
