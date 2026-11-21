/** Lift Lobby 02, the TCS corridor, the entry and the two meeting rooms (Section 7): shared by every layout. */
import * as THREE from 'three';
import { CONFIG } from '../config';
import { atlasCell, loopArt, pageArt, posterArt, setPlaneUV } from '../core/art';
import { boxFt, group, instancePrototype, matrixFt, placeFt } from '../core/build';
import { M, printMaterial } from '../core/materials';
import { canvasTexture, textPlane } from '../core/text';
import { A, AP } from '../data/geometry';
import { CONTENT } from '../data/manifest';
import { arrivalCar, DOOR_H, ENTRY_DOOR_H, LIFT_DOOR_W } from '../data/plan';
import { buildArmchair, buildLowBench, buildCoffeeTable, buildMeetingChair, buildMeetingTable, buildWallDisplay } from '../furniture/workstation';
import { buildBadgeReader, buildDoorPlate, buildFloorIndicator, buildLiftCallPanel, buildPosterFrame } from '../furniture/smallItems';
import { screen, type Registry } from './fixtures';

const POSTER_W = 0.7;
const POSTER_H = 1.0;

export function buildApproachDetails(reg: Registry): THREE.Group {
  const g = group('approach-details');
  const R = (id: string, o: THREE.Object3D) => {
    reg.objects[`*:${id}`] = o;
    o.name = id;
    return o;
  };
  const c = AP.corridor2000;
  const lob = AP.liftLobby02;
  const core1 = AP.liftCore1;
  const car = arrivalCar();

  // ── Lift lobby: stainless portals, floor indicators, call panels ──
  const eastCars = core1.cars.filter((k) => k.column === 'east');
  eastCars.forEach((k, i) => {
    const mid = (k.y0 + k.y1) / 2;
    const y0 = mid - LIFT_DOOR_W / 2;
    const y1 = mid + LIFT_DOOR_W / 2;
    // Portal lining through the 1.1 ft shaft wall.
    g.add(boxFt(M.steel, car.x1, y0 - 0.12, lob.x0 + 0.04, y0, 0, DOOR_H + 0.12));
    g.add(boxFt(M.steel, car.x1, y1, lob.x0 + 0.04, y1 + 0.12, 0, DOOR_H + 0.12));
    g.add(boxFt(M.steel, car.x1, y0, lob.x0 + 0.04, y1, DOOR_H, DOOR_H + 0.12));
    const label = k.id.startsWith('PL') ? k.id : `PL${i === 1 ? '09' : '10'}`;
    g.add(placeFt(buildFloorIndicator(`${label}   09`), lob.x0 + 0.02, mid, 0, DOOR_H + 0.75));
    if (i < eastCars.length - 1) g.add(R(`callPanel-${i}`, placeFt(buildLiftCallPanel(), lob.x0 + 0.02, y0 - 2.3, 0, 3.6)));
  });
  // Car interior: control strip with "09" lit, handrail.
  g.add(boxFt(M.steel, car.x1 - 0.12, car.y0 + 0.5, car.x1 - 0.02, car.y0 + 1.3, 2.8, 5.4));
  const nine = textPlane('09', { w: 0.14, h: 0.08, color: '#ffb648', bg: '#060708', weight: 600, size: 0.7 });
  (nine.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#ffffff');
  (nine.material as THREE.MeshStandardMaterial).emissiveMap = (nine.material as THREE.MeshStandardMaterial).map;
  g.add(placeFt(nine, car.x1 - 0.13, car.y0 + 0.9, 180, 5.0));
  g.add(boxFt(M.steel, car.x0 + 0.25, car.y0 + 0.6, car.x0 + 0.35, car.y1 - 0.6, 2.9, 3.0));
  // Wall sign opposite PL07, and a wayfinding plate where the lobby meets the corridor.
  const sign = textPlane(`${CONFIG.brandName}  ↑`, { w: 1.9, h: 0.3, color: '#2a2b2d', weight: 500, size: 0.42, sub: 'Lift Lobby 02 · Level 09', ppm: 700 });
  g.add(boxFt(M.white, lob.x1 - 0.06, -28.4, lob.x1, -21.6, 4.6, 5.9));
  g.add(R('lobbySign', placeFt(sign, lob.x1 - 0.07, (car.y0 + car.y1) / 2, 180, 5.25)));
  const way = textPlane(`${CONFIG.brandName}  →`, { w: 1.5, h: 0.22, color: '#2a2b2d', weight: 500, size: 0.5, ppm: 800 });
  g.add(boxFt(M.white, -54.2, c.y1 - 0.39, -48.8, c.y1 - 0.33, 4.8, 5.8));
  g.add(placeFt(way, -51.5, c.y1 - 0.4, 270, 5.3));

  // ── Corridor poster bays (south wall) ──
  const posters: { x: number; title: string; file?: string }[] = [];
  const bays = Object.fromEntries(AP.posterBays.map((b) => [b.id, b]));
  const titles = ['Building on belief', 'Engineering at scale', 'People first', 'With you for the long run', 'This way to the studio'];
  const files = CONTENT.corridorPosters.flatMap((b) => b.items);
  [-25, -21, -17].forEach((x, i) => posters.push({ x, title: titles[i], file: files[i] }));
  posters.push({ x: bays.bayB.x1 - 1.4, title: titles[3], file: files[3] });
  posters.push({ x: bays.bayC.x0 + 1.3, title: titles[4], file: files[4] });
  const atlas = printMaterial(canvasTexture(1750, 500, (ctx, w, h) => posters.forEach((p, i) => atlasCell(posterArt(p.title, 'TCS', i), i / 5, 0, 1 / 5, 1)(ctx, w, h))));
  posters.forEach((p, i) => {
    const fr = buildPosterFrame(POSTER_W, POSTER_H, atlas);
    const pr = fr.getObjectByName('print') as THREE.Mesh;
    delete pr.userData.noMerge;
    setPlaneUV(pr.geometry, i / 5, 0, 1 / 5, 1);
    g.add(R(`poster-${i}`, placeFt(fr, p.x, c.y0 + 0.01, 90, 5.0)));
  });
  // Bay B: 55" screen at 5 ft centre in a flush oak surround, with a caption plate.
  const sx = (bays.bayB.x0 + bays.bayB.x1) / 2 - 0.25;
  g.add(boxFt(M.oak, sx - 2.35, c.y0, sx + 2.35, c.y0 + 0.1, 3.3, 6.7));
  const loop = screen(reg, 'corridorScreen', 768, 432, loopArt('TCS, with you for the long run', 'Placeholder loop', 0, 3));
  g.add(R('corridorScreen', placeFt(buildWallDisplay(55, loop), sx, c.y0 + 0.11, 90, 5.0)));
  const cap = textPlane('TCS, with you for the long run', { w: 0.42, h: 0.05, color: '#4a4b4d', bg: '#f5f5f3', size: 0.42, ppm: 2400 });
  g.add(placeFt(cap, sx, c.y0 + 0.115, 90, 3.05));
  // Bay C: wayfinding arrow.
  const arrow = textPlane(`→  ${CONFIG.brandName}`, { w: 0.62, h: 0.16, color: '#2a2b2d', bg: '#f5f5f3', size: 0.42, ppm: 1400 });
  g.add(placeFt(arrow, bays.bayC.x1 - 1.1, c.y0 + 0.02, 90, 5.0));

  // ── Entry: brushed steel header with the sign, badge reader on the east jamb ──
  const er = A.entryRecess;
  g.add(boxFt(M.steel, er.x0 + 0.33, er.doorPlaneY - 0.42, er.x1 - 0.33, er.doorPlaneY - 0.33, ENTRY_DOOR_H, ENTRY_DOOR_H + 1.1));
  const hdr = textPlane(`${CONFIG.brandName} · ADC-05`, { w: 1.15, h: 0.14, color: '#2a2b2d', weight: 500, size: 0.56, ppm: 1200 });
  g.add(R('entrySign', placeFt(hdr, 17.5, er.doorPlaneY - 0.43, 270, ENTRY_DOOR_H + 0.55)));
  // The data puts the reader at y = 4.3, which is inside the door; it is mounted on the east jamb just outside (D-17).
  g.add(R('badgeReader', placeFt(buildBadgeReader(), er.x1 - 0.34, er.doorPlaneY - 0.7, 180, er.badgeReader.heightFt)));

  // ── Meeting rooms: 8 x 3.5 ft oak table, six chairs, 65" display on the south wall ──
  const chairM: THREE.Matrix4[] = [];
  for (const r of A.meetingRooms) {
    const cx = (r.x0 + r.x1) / 2;
    const cy = 5.6;
    g.add(placeFt(buildMeetingTable(), cx, cy, 90));
    for (const dx of [-2.6, 0, 2.6]) {
      chairM.push(matrixFt(cx + dx, cy + 2.7, 270));
      chairM.push(matrixFt(cx + dx, cy - 2.7, 90));
    }
    const deck = screen(reg, `deck-${r.id}`, 640, 360, pageArt('Quarterly review', 'Placeholder deck', r.id.includes('West') ? 2 : 4));
    g.add(placeFt(buildWallDisplay(65, deck), cx, r.y0 + 0.02, 90, 4.9));
  }
  // ── Door plates (Section 9): slim matte-white plates beside each door at 5 ft ──
  const names = CONFIG.roomNames;
  const plates: [string, number, number, number, ('exit' | 'lock' | 'none')?][] = [
    ['IT Store / Staff only', -9.7, c.y0 + 0.01, 90],
    ['Admin Store / Staff only', 5.3, c.y0 + 0.01, 90],
    ['LV Room / Staff only', 9.0, c.y0 + 0.01, 90],
    ['ADC-04 / Restricted', -5.3, c.y1 - 0.34, 270, 'lock'],
    ['Fire Exit', -38.1, c.y1 - 0.34, 270, 'exit'],
    [`${CONFIG.brandName} · ADC-05 / Tap watch to enter`, er.x0 + 0.34, er.doorPlaneY - 0.75, 0],
    [names[0], 10.8, 12.03, 90],
    [names[1], 66.25, 12.01, 90],
    ['Fire Exit', 61.96, 4.7, 180, 'exit'],
    ['Window Pause', 66.99, 19, 180],
    ['Memory Corner', 60.3, 59.99, 270],
  ];
  for (const [text, x, y, deg, pic] of plates) g.add(placeFt(buildDoorPlate(text, pic ?? 'none'), x, y, deg, 5));

  const dyn = group('approach-instanced');
  dyn.userData.dynamic = true;
  dyn.add(instancePrototype(buildMeetingChair(), chairM, { name: 'meetingChairs' }));

  // ── Context lounges: armchairs, round tables, a low bench ──
  const ln = AP.collabLoungeNorthOfCore1;
  const ls = AP.collabLoungeSouthOfCorridor;
  const arm: THREE.Matrix4[] = [];
  const lcx = (ln.x0 + ln.x1) / 2;
  for (const [dx, dy, deg] of [[-5, -2.6, 0], [-5, -6.4, 0], [4.4, -2.6, 180], [4.4, -6.4, 180]] as const) arm.push(matrixFt(lcx + dx, c.y0 + dy, deg));
  const scx = (ls.x0 + ls.x1) / 2;
  for (const [dx, dy, deg] of [[-3.2, -2.6, 0], [-3.2, -6.2, 0], [3.2, -2.6, 180], [3.2, -6.2, 180]] as const) arm.push(matrixFt(scx + dx, c.y0 + dy, deg));
  dyn.add(instancePrototype(buildArmchair(), arm, { name: 'armchairs' }));
  dyn.add(instancePrototype(buildCoffeeTable(), [matrixFt(lcx - 0.3, c.y0 - 2.6), matrixFt(lcx - 0.3, c.y0 - 6.4), matrixFt(scx, c.y0 - 4.4)], { name: 'loungeTables' }));
  g.add(placeFt(buildLowBench(2.4), lcx, ln.y0 + 1.0, 90));
  g.add(dyn);
  return g;
}
