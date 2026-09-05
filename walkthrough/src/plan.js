/**
 * plan.js — the single source of truth for the reconstruction.
 *
 * Every position in this file is expressed in REFERENCE-IMAGE PIXELS, measured
 * off the supplied architectural model render (2048 x 1436). Nothing in the rest
 * of the project invents a coordinate: everything is derived from here.
 *
 *   TOP of the reference    -> -Z  (rear, lift lobby side)
 *   BOTTOM of the reference -> +Z  (front edge of the floor plate)
 *   LEFT of the reference   -> -X  (People / Prowess side)
 *   RIGHT of the reference  -> +X  (meeting rooms / Capsule side)
 *
 * Calibration: the four-pod cluster, the lounge sofas and the meeting tables all
 * agree on roughly 67 px per metre in the source render, so one reference pixel
 * is treated as 0.015 m. That puts the floor plate at 26.4 m x 13.5 m.
 */

export const PX = 0.015;          // metres per reference pixel
export const ORIGIN_X = 965;      // reference px that maps to world X = 0
export const ORIGIN_Y = 740;      // reference px that maps to world Z = 0

export const CEIL_H = 3.15;       // finished ceiling height (m)
export const WALL_H = 2.95;       // standard partition height (m)
export const GLASS_H = 2.70;      // glazed partition height (m)

/** reference px -> world metres (X) */
export const wx = (px) => (px - ORIGIN_X) * PX;
/** reference px -> world metres (Z) */
export const wz = (py) => (py - ORIGIN_Y) * PX;
/** reference px length -> metres */
export const wl = (len) => len * PX;
/** reference point -> {x, z} */
export const P = (px, py) => ({ x: wx(px), z: wz(py) });

/* ------------------------------------------------------------------ *
 * FLOOR PLATE
 * ------------------------------------------------------------------ */

export const PLATE = { x0: 85, y0: 290, x1: 1845, y1: 1190 };
export const LOBBY = { x0: 1080, y0: 110, x1: 1450, y1: 290 };

/** The rear facade build-up: clear parapet at y0, glowing blue plane behind it. */
export const REAR = {
  glassY: 290,      // inner face of the rear wall (office side)
  blueY: 202,       // the pale-blue illuminated plane, 1.3 m behind the glass
  shellY: 96,       // outer white shell of the model
};

/* ------------------------------------------------------------------ *
 * ARCHITECTURE — walls are given as [x0, y0, x1, y1] in reference px.
 * Axis-aligned segments only; thickness and height are per-group.
 * ------------------------------------------------------------------ */

export const SHELL_WALLS = [
  [PLATE.x0, PLATE.y0, PLATE.x0, PLATE.y1],       // west
  [PLATE.x0, PLATE.y1, PLATE.x1, PLATE.y1],       // south (front)
  [PLATE.x1, PLATE.y0, PLATE.x1, PLATE.y1],       // east
  [PLATE.x0, PLATE.y0, LOBBY.x0, PLATE.y0],       // rear, west of the lobby
  [LOBBY.x1, PLATE.y0, PLATE.x1, PLATE.y0],       // rear, east of the lobby
  [LOBBY.x0, LOBBY.y0, LOBBY.x0, PLATE.y0],       // lobby west flank
  [LOBBY.x1, LOBBY.y0, LOBBY.x1, PLATE.y0],       // lobby east flank
  [LOBBY.x0, LOBBY.y0, LOBBY.x1, LOBBY.y0],       // lobby rear
];

/** Solid internal partitions. */
export const PARTITIONS = [
  // ---- top-left utility volume -----------------------------------
  [240, 290, 240, 400],           // east wall, opening 400..505
  [85, 505, 240, 505],            // south wall
  // ---- enclosed discussion room ----------------------------------
  [300, 345, 300, 505],
  [300, 345, 500, 345],
  [500, 345, 500, 505],           // east wall, carries the gradient display
  [300, 505, 424, 505],           // south, door at 424..500
  // ---- pantry ----------------------------------------------------
  [545, 345, 545, 505],
  [545, 345, 765, 345],
  [545, 505, 606, 505],           // south, door at 606..700
  [700, 505, 765, 505],
  // ---- central spine wall (pantry east / meeting rooms west) ------
  [765, 345, 765, 800],
  // ---- central meeting rooms -------------------------------------
  [765, 600, 1010, 600],          // room A south
  [765, 615, 1010, 615],          // room B north
  [765, 800, 1010, 800],          // room B south, carries a display
  // ---- People zone media wall ------------------------------------
  [285, 905, 640, 905],
  // ---- People zone timber slat partition -------------------------
  [610, 905, 610, 1155],
  // ---- front-centre L partition ----------------------------------
  [890, 1015, 1055, 1015],
  [890, 1015, 890, 1145],
  // ---- right meeting rooms ---------------------------------------
  [1600, 600, 1845, 600],         // R1 south
  [1610, 605, 1610, 665],         // R2 west, door 665..722
  [1610, 722, 1610, 800],
  [1610, 800, 1845, 800],         // R2 / R3 divider
];

/** Glazed partitions (clear glass, readable frames). */
export const GLAZING = [
  [765, 345, 1010, 345],          // central room A north
  [1010, 345, 1010, 452],         // central room A east, door 452..520
  [1010, 520, 1010, 600],
  [1010, 615, 1010, 706],         // central room B east, door 706..760
  [1010, 760, 1010, 800],
  [1600, 345, 1845, 345],         // meeting R1
  [1600, 345, 1600, 470],         // door 470..530
  [1600, 530, 1600, 600],
  [1610, 805, 1610, 895],         // meeting R3, door 895..965
  [1610, 965, 1610, 1110],
  [1610, 1110, 1845, 1110],
];

/* ------------------------------------------------------------------ *
 * LIFT LOBBY
 * ------------------------------------------------------------------ */

export const LIFT = {
  banks: [
    { x0: 1092, x1: 1244, y: LOBBY.y0, doors: [[1104, 1164], [1176, 1236]] },
    { x0: 1292, x1: 1442, y: LOBBY.y0, doors: [[1300, 1358], [1372, 1430]] },
  ],
  pier: { x0: 1250, y0: 110, x1: 1286, y1: 196 },
  // pale timber wing walls that step forward into the arrival space,
  // framing three generous openings onto the office floor
  fins: [
    [1128, 200, 1146, 290],
    [1214, 200, 1232, 290],
    [1314, 200, 1332, 290],
    [1400, 200, 1418, 290],
  ],
  spawn: { x: 1273, y: 238 },     // centre of the arrival circulation
};

/* ------------------------------------------------------------------ *
 * FURNITURE — grouped by zone, all in reference px.
 * ------------------------------------------------------------------ */

export const PROWESS = {
  // four high-backed C-shaped lounge pods; `open` is the direction the C faces
  pods: [
    { x0: 275, y0: 550, x1: 412, y1: 684, open: 'se' },
    { x0: 545, y0: 550, x1: 682, y1: 684, open: 'sw' },
    { x0: 275, y0: 702, x1: 412, y1: 836, open: 'ne' },
    { x0: 545, y0: 702, x1: 682, y1: 836, open: 'nw' },
  ],
  table: { x: 478, y: 692, r: 64, rot: -1.32 },   // rounded triangular timber table
  inlay: { x: 478, y: 693, r: 146, rot: Math.PI / 4 },
  innerChairs: [
    { x: 494, y: 648, rot: 2.7 }, { x: 526, y: 674, rot: 3.6 },
    { x: 520, y: 716, rot: 4.3 }, { x: 484, y: 736, rot: 5.3 },
    { x: 436, y: 722, rot: 0.4 }, { x: 422, y: 666, rot: 1.4 },
  ],
  outerChairs: [
    { x: 258, y: 572, rot: 1.57 }, { x: 258, y: 620, rot: 1.57 },
    { x: 258, y: 730, rot: 1.57 }, { x: 258, y: 778, rot: 1.57 },
    { x: 302, y: 524, rot: 3.14 }, { x: 348, y: 524, rot: 3.14 },
    { x: 592, y: 524, rot: 3.14 }, { x: 638, y: 524, rot: 3.14 },
    { x: 318, y: 860, rot: 0 },    { x: 366, y: 860, rot: 0 },
    { x: 590, y: 860, rot: 0 },    { x: 636, y: 860, rot: 0 },
  ],
  display: { x0: 300, x1: 562, y: 905, facing: 'n' },   // wall display facing the pods
};

export const PEOPLE = {
  counter: { x: 450, y: 1035, r0: 100, r1: 138, a0: -1.83, a1: 1.83 },
  counterChairs: [
    { x: 450, y: 1035, r: 84, a: -0.82 }, { x: 450, y: 1035, r: 84, a: -0.27 },
    { x: 450, y: 1035, r: 84, a: 0.27 },  { x: 450, y: 1035, r: 84, a: 0.82 },
  ],
  inlay: { x: 450, y: 1036, r: 140 },
  tiers: [
    { x0: 85, y0: 990, x1: 235, y1: 1150, h: 0.90 },
    { x0: 235, y0: 1010, x1: 355, y1: 1150, h: 0.58 },
    { x0: 85, y0: 1150, x1: 495, y1: 1190, h: 0.28 },
  ],
  drums: [
    { x: 275, y: 1020, r: 38, h: 0.46, base: 0.58, tone: 'white' },
    { x: 280, y: 1112, r: 40, h: 0.46, base: 0.58, tone: 'white' },
    { x: 313, y: 1058, r: 20, h: 0.40, base: 0.58, tone: 'timber' },
  ],
  stool: { x: 357, y: 1180, r: 22, h: 0.44 },
  bench: { x0: 640, y0: 1128, x1: 880, y1: 1172, h: 0.45 },
  benchDrums: [{ x: 758, y: 1150, r: 17 }, { x: 788, y: 1150, r: 17 }],
  stair: { x0: 560, y0: 1140, x1: 700, y1: 1192 },
};

export const WEST_WALL = {
  desks: [
    { x0: 100, y0: 532, x1: 188, y1: 622 },
    { x0: 100, y0: 788, x1: 188, y1: 872 },
  ],
  deskChairs: [
    { x: 208, y: 560, rot: -1.57 }, { x: 208, y: 602, rot: -1.57 },
    { x: 208, y: 812, rot: -1.57 }, { x: 208, y: 856, rot: -1.57 },
  ],
  screens: [
    { y0: 532, y1: 624, kind: 'dark' },
    { y0: 662, y1: 782, kind: 'amber' },
    { y0: 788, y1: 874, kind: 'dark' },
  ],
};

export const CENTRAL_ROOMS = [
  {
    id: 'centralMeetingA',
    room: { x0: 765, y0: 345, x1: 1010, y1: 600 },
    table: { x: 882, y: 478, w: 105, d: 185 },
    seats: { west: 4, east: 4, south: 1, north: 0 },
  },
  {
    id: 'centralMeetingB',
    room: { x0: 765, y0: 615, x1: 1010, y1: 800 },
    table: { x: 893, y: 700, w: 112, d: 92 },
    seats: { west: 1, east: 1, south: 2, north: 2 },
  },
];

export const RIGHT_ROOMS = [
  {
    id: 'meetingR1',
    room: { x0: 1600, y0: 345, x1: 1845, y1: 600 },
    table: { x: 1727, y: 480, w: 138, d: 176 },
    seats: { west: 4, east: 4, south: 1, north: 0 },
    credenza: { x0: 1602, y0: 556, x1: 1700, y1: 598 },
  },
  {
    id: 'meetingR2',
    room: { x0: 1610, y0: 605, x1: 1845, y1: 800 },
    table: { x: 1740, y: 706, w: 102, d: 84 },
    seats: { west: 1, east: 0, south: 2, north: 2 },
    credenza: { x0: 1612, y0: 607, x1: 1700, y1: 648 },
    credenza2: { x0: 1792, y0: 688, x1: 1843, y1: 762 },
  },
  {
    id: 'meetingR3',
    room: { x0: 1610, y0: 805, x1: 1845, y1: 1110 },
    table: { x: 1737, y: 960, w: 146, d: 228 },
    seats: { west: 5, east: 5, south: 1, north: 0 },
    credenza: { x0: 1612, y0: 807, x1: 1700, y1: 850 },
    tablePlant: { x: 1745, y: 952 },
  },
];

export const CAPSULE = {
  shell: { x0: 1118, y0: 556, x1: 1487, y1: 1118, r: 56 },
  door: { side: 'w', y0: 880, y1: 1000 },
  screen: { x0: 1150, x1: 1452, y: 622, sag: 26, h: 1.42, base: 0.86 },
  planters: [
    { x: 1148, y: 626 }, { x: 1458, y: 626 },
    { x: 1148, y: 1046 }, { x: 1458, y: 1046 },
  ],
  plinths: [
    { x0: 1126, y0: 706, x1: 1186, y1: 780 },
    { x0: 1436, y0: 706, x1: 1484, y1: 780 },
  ],
  roundTables: [
    { x: 1301, y: 742, r: 39, h: 0.44 },
    { x: 1355, y: 1042, r: 37, h: 0.44 },
  ],
  chairs: [
    { x: 1258, y: 800, rot: 0.5 },
    { x: 1332, y: 816, rot: -0.4 },
    { x: 1262, y: 1012, rot: 3.0 },
  ],
  // shallow U-shaped sofa opening toward the screen (north)
  sofaU: [
    { x: 1200, y: 856 }, { x: 1268, y: 944 },
    { x: 1352, y: 950 }, { x: 1420, y: 858 },
  ],
  southBench: { x0: 1234, y0: 1082, x1: 1422, y1: 1116 },
  southDisplay: { x0: 1276, x1: 1410, y: 1128 },
};

export const REAR_LOUNGE = {
  sofas: [
    { x: 1132, y: 465, len: 130, dir: 'v', back: 'w' },
    { x: 1466, y: 462, len: 130, dir: 'v', back: 'e' },
    { x: 1317, y: 405, len: 164, dir: 'h', back: 'n' },
    { x: 1322, y: 526, len: 146, dir: 'h', back: 's' },
  ],
  tables: [
    { x: 1256, y: 470, r: 38, h: 0.42 },
    { x: 1358, y: 466, r: 37, h: 0.42 },
  ],
  plants: [{ x: 1122, y: 366 }, { x: 1440, y: 366 }],
};

export const PANTRY = {
  room: { x0: 545, y0: 345, x1: 765, y1: 505 },
  tallRun: { x0: 550, y0: 348, x1: 760, y1: 398 },   // full-height cabinetry
  counter: { x0: 550, y0: 398, x1: 760, y1: 442 },   // worktop
  island: { x0: 556, y0: 452, x1: 620, y1: 486 },
  appliance: { x: 672, y: 412 },
};

export const DISCUSSION = {
  room: { x0: 300, y0: 345, x1: 500, y1: 505 },
  table: { x: 388, y: 408, w: 78, d: 52 },
  seats: { west: 0, east: 0, north: 2, south: 2 },
  plant: { x: 478, y: 372 },
  display: { x: 500, y: 452, w: 110, h: 1.55, facing: 'w', kind: 'amber' },
};

export const UTILITY = {
  room: { x0: 85, y0: 290, x1: 240, y1: 505 },
  shelves: [
    { x0: 88, y0: 300, x1: 236, y1: 336, h: 1.90 },
    { x0: 88, y0: 344, x1: 150, y1: 470, h: 0.95 },
    { x0: 88, y0: 470, x1: 190, y1: 502, h: 0.92 },
  ],
};

export const FRONT_MEDIA = {
  screen: { x0: 940, x1: 1050, y: 1015, facing: 's' },
  bench: { x0: 858, y0: 1098, x1: 1052, y1: 1146, h: 0.46 },
};

/** long architectural planter along the front-right edge */
export const FRONT_PLANTER = { x0: 1150, y0: 1150, x1: 1855, y1: 1190, count: 40 };

export const PLANTERS = [
  { x0: 1596, y0: 1104, x1: 1702, y1: 1156 },   // outside meeting R3
];

/** loose architectural greenery (px positions) */
export const PLANTS = [
  { x: 770, y: 570 }, { x: 770, y: 662 }, { x: 770, y: 836 }, { x: 958, y: 830 },
  { x: 478, y: 372 }, { x: 140, y: 965 }, { x: 1122, y: 366 }, { x: 1440, y: 366 },
  { x: 1825, y: 640 }, { x: 1826, y: 838 }, { x: 1822, y: 588 }, { x: 1650, y: 1128 },
  { x: 610, y: 942 },
];

/** dark / luminous screens mounted on partitions (px) */
export const SCREENS = [
  { x0: 300, x1: 400, y: 903, facing: 'n', h: 0.92, base: 1.05, kind: 'dark' },
  { x0: 402, x1: 562, y: 903, facing: 'n', h: 0.92, base: 1.05, kind: 'spectrum' },
  { x0: 812, x1: 936, y: 802, facing: 's', h: 0.86, base: 1.05, kind: 'dark' },
  { x0: 940, x1: 1050, y: 1017, facing: 's', h: 0.62, base: 1.05, kind: 'dark' },
  { x0: 1722, x1: 1800, y: 803, facing: 's', h: 0.70, base: 1.10, kind: 'dark' },
];

/** the camera that reproduces the supplied reference viewpoint */
export const REFERENCE_CAMERA = {
  fov: 16.6,
  height: 74,
  aim: { x: 0.885, z: -0.33 },
};
