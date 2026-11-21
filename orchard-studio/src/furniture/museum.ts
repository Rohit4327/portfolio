/**
 * Museum pieces: eight generic, logo-free milestone personal devices sized for the plinth vitrines
 * (each inside 0.36 x 0.36 x 0.38 m, origin at the base centre, front +Z), plus the life-size spatial headset.
 */
import * as THREE from 'three';
import { box, cyl, group } from '../core/build';
import { M } from '../core/materials';
import { roundedRectProfile, rprism, rslabZ, sweepArcGeo } from './exhibits';

export const MUSEUM_DEVICE_NAMES: string[] = [
  'Beige early desktop',
  'Compact all-in-one',
  'Translucent coloured all-in-one',
  'Click-wheel music player',
  'First touchscreen phone',
  'First tablet',
  'Smartwatch',
  'Spatial headset',
];

/** A flat fascia (w x h, thickness t along Z) with a rectangular opening centred at (ox, oy). Centred on the origin. */
function fascia(mat: THREE.Material, w: number, h: number, t: number, ow: number, oh: number, ox: number, oy: number): THREE.Group {
  const g = group('fascia');
  const l = ox - ow / 2;
  const r = ox + ow / 2;
  const b = oy - oh / 2;
  const tp = oy + oh / 2;
  g.add(box(mat, l + w / 2, h, t, (-w / 2 + l) / 2, 0, 0));
  g.add(box(mat, w / 2 - r, h, t, (w / 2 + r) / 2, 0, 0));
  g.add(box(mat, ow, h / 2 - tp, t, ox, (h / 2 + tp) / 2, 0));
  g.add(box(mat, ow, b + h / 2, t, ox, (-h / 2 + b) / 2, 0));
  return g;
}

/**
 * A slim aluminium easel: base plate, front lip and rear post. `device` has its origin at its bottom centre and is
 * centred on its own thickness; it is leaned back by `tilt` radians.
 */
function onEasel(device: THREE.Object3D, w: number, h: number, t: number, tilt: number): THREE.Group {
  const g = group('easel');
  const plateT = 0.006;
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  const yp = h * 0.55;
  const postY = yp * c - (t / 2) * s;
  const postZ = -yp * s - (t / 2) * c;
  const front = t / 2 + 0.014;
  const back = postZ - 0.02;
  const zf = -(front + back) / 2;
  g.add(rprism(M.aluminium, Math.max(0.08, w * 0.7), plateT, front - back, 0.01, 0, plateT / 2, 0));
  g.add(box(M.aluminium, Math.max(0.05, w * 0.45), 0.012, 0.005, 0, plateT + 0.006, zf + t / 2 + 0.005));
  g.add(box(M.aluminium, 0.02, postY, 0.006, 0, plateT + postY / 2, zf + postZ - 0.003));
  device.position.set(0, plateT + (t / 2) * s, zf);
  device.rotation.x = -tilt;
  g.add(device);
  return g;
}

function earlyDesktop(): THREE.Group {
  const g = group('museum:earlyDesktop');
  // Base unit with a floppy slot
  g.add(rprism(M.beigePlastic, 0.32, 0.065, 0.22, 0.008, 0, 0.0325, -0.06));
  g.add(box(M.blackGlass, 0.1, 0.006, 0.002, 0.07, 0.038, 0.051));
  // CRT: shell, recessed tube face, raised front frame
  g.add(box(M.beigePlastic, 0.15, 0.012, 0.13, 0, 0.071, -0.07));
  g.add(box(M.beigePlastic, 0.24, 0.19, 0.19, 0, 0.172, -0.075));
  g.add(box(M.blackGlass, 0.17, 0.13, 0.002, 0, 0.177, 0.021));
  const frame = fascia(M.beigePlastic, 0.24, 0.19, 0.012, 0.17, 0.13, 0, 0.005);
  frame.position.set(0, 0.172, 0.026);
  g.add(frame);
  // Separate keyboard
  g.add(box(M.beigePlastic, 0.27, 0.016, 0.085, 0, 0.008, 0.128));
  g.add(box(M.beigePlastic, 0.25, 0.004, 0.058, 0, 0.018, 0.126));
  return g;
}

function compactAllInOne(): THREE.Group {
  const g = group('museum:compactAllInOne');
  const W = 0.215;
  const H = 0.3;
  const RING = 0.012;
  const bodyH = H - RING;
  g.add(box(M.beigePlastic, W, bodyH, 0.22, 0, bodyH / 2, -0.01));
  // Front fascia with the small recessed screen and the disk slot below it
  const front = fascia(M.beigePlastic, W, bodyH, 0.01, 0.125, 0.095, 0, 0.068);
  front.position.set(0, bodyH / 2, 0.105);
  g.add(front);
  g.add(box(M.blackGlass, 0.125, 0.095, 0.002, 0, bodyH / 2 + 0.068, 0.101));
  g.add(box(M.blackGlass, 0.07, 0.006, 0.002, 0.04, 0.1, 0.111));
  // Top ring leaving the carry-handle recess at the rear
  const top = fascia(M.beigePlastic, W, 0.23, RING, 0.1, 0.035, 0, 0.065);
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, bodyH + RING / 2, -0.005);
  g.add(top);
  return g;
}

function translucentAllInOne(): THREE.Group {
  const g = group('museum:translucentAllInOne');
  const CY = 0.175;
  // Rounded translucent back: a sphere with its pole to the rear, cut off where the fascia sits
  const shell = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, 2.153);
  shell.rotateX(-Math.PI / 2);
  shell.scale(0.15, 0.15, 0.16);
  const back = new THREE.Mesh(shell, M.tealTranslucent);
  back.position.set(0, CY, -0.015);
  g.add(back);
  // White front fascia, screen and slot
  g.add(rslabZ(M.whitePlastic, 0.25, 0.25, 0.03, 0.08, 0, CY, 0.085, 3));
  g.add(rslabZ(M.blackGlass, 0.17, 0.13, 0.004, 0.02, 0, CY + 0.022, 0.102));
  g.add(box(M.blackGlass, 0.06, 0.005, 0.002, 0, CY - 0.078, 0.101));
  // Foot
  g.add(cyl(M.tealTranslucent, 0.095, 0.105, 0.045, 0, 0.0225, -0.01, 16));
  return g;
}

function musicPlayer(): THREE.Group {
  // 2.2x life size: 61 x 102 x 18 mm
  const W = 0.134;
  const H = 0.224;
  const T = 0.04;
  const d = group('player');
  d.add(rslabZ(M.whitePlastic, W, H, 0.022, 0.014, 0, H / 2, 0.009, 3));
  d.add(rslabZ(M.aluminium, W, H, 0.018, 0.014, 0, H / 2, -0.011, 3));
  d.add(rslabZ(M.blackGlass, 0.09, 0.07, 0.002, 0.006, 0, 0.163, 0.021));
  const wheel = new THREE.Mesh(new THREE.RingGeometry(0.017, 0.043, 24), M.aluminiumMatte);
  wheel.position.set(0, 0.066, 0.0206);
  d.add(wheel);
  const g = onEasel(d, W, H, T, 0.14);
  g.name = 'museum:musicPlayer';
  return g;
}

function touchPhone(): THREE.Group {
  // 2x life size: 62 x 115 x 11.6 mm
  const W = 0.124;
  const H = 0.23;
  const T = 0.024;
  const d = group('phone');
  d.add(rslabZ(M.aluminium, W, H, 0.02, 0.024, 0, H / 2, -0.002, 3));
  d.add(rslabZ(M.blackGlass, W - 0.006, H - 0.006, 0.004, 0.021, 0, H / 2, 0.01, 3));
  const home = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), M.bezel);
  home.position.set(0, 0.024, 0.0124);
  d.add(home);
  const g = onEasel(d, W, H, T, 0.21);
  g.name = 'museum:touchPhone';
  return g;
}

function firstTablet(): THREE.Group {
  const W = 0.24;
  const H = 0.3;
  const T = 0.014;
  const d = group('tablet');
  d.add(rslabZ(M.aluminium, W, H, 0.011, 0.016, 0, H / 2, -0.0015, 3));
  d.add(rslabZ(M.blackGlass, W - 0.005, H - 0.005, 0.003, 0.014, 0, H / 2, 0.0055, 3));
  const home = new THREE.Mesh(new THREE.CircleGeometry(0.007, 16), M.bezel);
  home.position.set(0, 0.014, 0.0074);
  d.add(home);
  const g = onEasel(d, W, H, T, (15 * Math.PI) / 180);
  g.name = 'museum:firstTablet';
  return g;
}

function smartwatch(): THREE.Group {
  // 3x life size
  const g = group('museum:smartwatch');
  const baseT = 0.01;
  const R = 0.07;
  const TUBE = 0.005;
  const SQUASH = 0.8;
  const cy = baseT + R + TUBE;
  g.add(rprism(M.whitePlastic, 0.13, baseT, 0.15, 0.02, 0, baseT / 2, 0));
  // Band loop around a small cushion
  const loop = new THREE.TorusGeometry(R, TUBE, 6, 24);
  loop.rotateY(Math.PI / 2);
  loop.scale(8, 1, SQUASH);
  const band = new THREE.Mesh(loop, M.fabricWhite);
  band.position.set(0, cy, 0);
  g.add(band);
  const pad = new THREE.CylinderGeometry(R - TUBE, R - TUBE, 0.07, 16);
  pad.rotateZ(Math.PI / 2);
  pad.scale(1, 1, SQUASH);
  const cushion = new THREE.Mesh(pad, M.fabricGrey);
  cushion.position.set(0, cy, 0);
  g.add(cushion);
  // Watch body, glass, crown and side button
  const bz = R * SQUASH + 0.013;
  g.add(rslabZ(M.aluminium, 0.108, 0.126, 0.03, 0.03, 0, cy, bz, 3));
  g.add(rslabZ(M.blackGlass, 0.1, 0.118, 0.004, 0.027, 0, cy, bz + 0.017, 3));
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), M.aluminium);
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.059, cy + 0.028, bz);
  g.add(crown);
  g.add(box(M.aluminium, 0.005, 0.034, 0.01, 0.0555, cy - 0.022, bz));
  return g;
}

// Headset proportions (life size, metres), measured from the vertical axis the visor curves around.
const HS = {
  rGlass: 0.135,
  rFrameOut: 0.132,
  rFrameIn: 0.108,
  rSealIn: 0.04,
  height: 0.094,
  halfSpan: 45,
  /** z of the visor+seal centre: the headset origin. */
  centreZ: 0.0825,
};

/** Life-size spatial headset, no stand. Origin at the visor centre, visor front faces +Z. */
export function buildHeadset(): THREE.Group {
  const g = group('headset');
  const front = 270;
  const add = (mat: THREE.Material, geo: THREE.BufferGeometry) => {
    geo.translate(0, 0, -HS.centreZ);
    g.add(new THREE.Mesh(geo, mat));
  };
  // Aluminium frame, softly rounded
  const frame = roundedRectProfile(HS.rFrameOut - HS.rFrameIn, HS.height, 0.011, 2, (HS.rFrameOut + HS.rFrameIn) / 2, 0);
  add(M.aluminium, sweepArcGeo(frame, front - HS.halfSpan, front + HS.halfSpan, 10));
  // Curved dark glass front
  const glass = roundedRectProfile(HS.rGlass - HS.rFrameOut + 0.002, HS.height - 0.01, 0, 1, (HS.rGlass + HS.rFrameOut - 0.002) / 2, 0);
  add(M.blackGlass, sweepArcGeo(glass, front - HS.halfSpan + 2, front + HS.halfSpan - 2, 10));
  // Fabric light seal towards the face
  const seal = roundedRectProfile(HS.rFrameIn - HS.rSealIn + 0.002, HS.height - 0.014, 0, 1, (HS.rFrameIn + HS.rSealIn + 0.002) / 2, 0);
  add(M.fabricGrey, sweepArcGeo(seal, front - 42, front + 42, 8));
  // Knit headband loop round the back of the head
  const bandProfile = roundedRectProfile(0.007, 0.046, 0, 1, 0.1035, 0);
  const band = sweepArcGeo(bandProfile, front + 42, front + 318, 18);
  band.scale(0.88, 1, 1);
  add(M.fabricGrey, band);
  return g;
}

/** Slim aluminium stand, 0.22 m tall. 'headsetAnchor' is where the headset's origin goes so it rests on the cradle. */
export function buildHeadsetStand(): THREE.Group {
  const g = group('headsetStand');
  const H = 0.22;
  g.add(cyl(M.aluminium, 0.055, 0.055, 0.006, 0, 0.003, 0, 20));
  g.add(cyl(M.aluminium, 0.005, 0.005, H - 0.014, 0, 0.006 + (H - 0.014) / 2, 0, 8));
  g.add(box(M.aluminium, 0.07, 0.008, 0.03, 0, H - 0.004, 0));
  const anchor = new THREE.Object3D();
  anchor.name = 'headsetAnchor';
  anchor.position.set(0, H + HS.height / 2, 0);
  g.add(anchor);
  return g;
}

function spatialHeadset(): THREE.Group {
  const SCALE = 1.4;
  const g = group('museum:spatialHeadset');
  const stand = buildHeadsetStand();
  // Centre the visor-plus-band footprint on the plinth
  const frontZ = (HS.rGlass - HS.centreZ) * SCALE;
  const backZ = (-0.107 - HS.centreZ) * SCALE;
  stand.position.z = -(frontZ + backZ) / 2;
  const headset = buildHeadset();
  headset.scale.setScalar(SCALE);
  headset.position.set(0, 0.22 + (HS.height / 2) * SCALE, stand.position.z);
  g.add(stand, headset);
  return g;
}

const BUILDERS: readonly (() => THREE.Group)[] = [earlyDesktop, compactAllInOne, translucentAllInOne, musicPlayer, touchPhone, firstTablet, smartwatch, spatialHeadset];

/** Milestone device `index` (0..7, clamped), fitted to the plinth vitrine. */
export function buildMuseumDevice(index: number): THREE.Group {
  const i = Math.min(BUILDERS.length - 1, Math.max(0, Math.floor(index)));
  return BUILDERS[i]();
}
