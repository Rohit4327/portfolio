/**
 * The foosball table and its wall scoreboard. The table is built from the shared constants in foosballSpec.ts
 * so that the physics engine, the renderer and this model agree on every dimension.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, group, plane, roundedBoxGeo } from '../core/build';
import { M } from '../core/materials';
import { FOOS, RODS } from '../systems/interactions/foosballSpec';
import { frustumGeo, hullGeo, plate, roundedPlateGeo } from './smallItems';

type V3 = readonly [number, number, number];

/** Merge geometries that may mix indexed and loose triangles into one position/normal/uv geometry. */
function fuse(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const loose = parts.map((g) => {
    const out = g.getIndex() ? g.toNonIndexed() : g;
    for (const name of Object.keys(out.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') out.deleteAttribute(name);
    return out;
  });
  const merged = mergeGeometries(loose, false);
  if (!merged) throw new Error('play: could not merge geometry');
  return merged;
}

/** A cylinder lying along X, centred at x. */
function xCyl(r: number, len: number, x: number, seg: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, 0, 0);
  return g;
}

/**
 * One abstract playing piece, modelled hanging straight down from the rod axis (its local origin):
 * a rounded torso around the rod, a small head above and a foot that widens to the toe.
 * The foot ends FOOS.rodY - 0.005 below the axis.
 */
function figureGeo(): THREE.BufferGeometry {
  const footEnd = -(FOOS.rodY - 0.005);
  const torsoTop = 0.016;
  const torsoBottom = -0.03;
  const torso = roundedPlateGeo(FOOS.figureW, 0.02, torsoTop - torsoBottom, 0.006, { seg: 2 });
  torso.rotateX(-Math.PI / 2);
  torso.translate(0, (torsoTop + torsoBottom) / 2, 0);
  const head = new THREE.SphereGeometry(0.011, 8, 5);
  head.translate(0, 0.024, 0);
  const footH = torsoBottom - footEnd;
  const foot = frustumGeo(0.02, 0.014, FOOS.figureW, FOOS.figureFootDepth, footH);
  foot.translate(0, footEnd + footH / 2, 0);
  return fuse([torso, head, foot]);
}

/** Corner ball-return ramp: a low wedge that slopes from the corner down to the field. */
function rampGeo(sx: number, sz: number): THREE.BufferGeometry {
  const leg = 0.05;
  const h = 0.012;
  const cx = (sx * FOOS.fieldW) / 2;
  const cz = (sz * FOOS.fieldL) / 2;
  const c0: V3 = [cx, 0, cz];
  const c1: V3 = [cx, h, cz];
  const a: V3 = [cx - sx * leg, 0, cz];
  const b: V3 = [cx, 0, cz - sz * leg];
  return hullGeo([[c1, a, b], [c0, c1, a], [c0, b, c1], [c0, a, b]], [cx - sx * leg * 0.25, h * 0.25, cz - sz * leg * 0.25]);
}

/**
 * Foosball table. Origin on the floor at the cabinet centre, long axis along Z (blue goal at -Z, amber at +Z).
 * The child group `foosDynamic` sits at the centre of the playfield surface and holds `rod0`..`rod7` and `ball`.
 */
export function buildFoosballTable(): THREE.Group {
  const g = group('foosballTable');
  const { cabinetL, cabinetW, cabinetH, fieldL, fieldW, fieldY, wallH, goalW } = FOOS;
  const bodyY = 0.45;
  const liner = 0.006;
  const goalH = 0.07;
  const goalDepth = 0.09;
  const innerX = fieldW / 2 + liner; // oak starts here
  const innerZ = fieldL / 2 + goalDepth;
  const deckY = fieldY - 0.01;
  const wallTop = fieldY + wallH;

  // Cabinet shell: a softly rounded oak ring from the body underside to the top rim, open in the middle.
  const hw = cabinetW / 2;
  const hl = cabinetL / 2;
  const r = 0.02;
  const outline = new THREE.Shape();
  outline.moveTo(-hw + r, -hl);
  outline.lineTo(hw - r, -hl);
  outline.absarc(hw - r, -hl + r, r, -Math.PI / 2, 0, false);
  outline.lineTo(hw, hl - r);
  outline.absarc(hw - r, hl - r, r, 0, Math.PI / 2, false);
  outline.lineTo(-hw + r, hl);
  outline.absarc(-hw + r, hl - r, r, Math.PI / 2, Math.PI, false);
  outline.lineTo(-hw, -hl + r);
  outline.absarc(-hw + r, -hl + r, r, Math.PI, Math.PI * 1.5, false);
  const hole = new THREE.Path();
  hole.moveTo(-innerX, -innerZ);
  hole.lineTo(-innerX, innerZ);
  hole.lineTo(innerX, innerZ);
  hole.lineTo(innerX, -innerZ);
  hole.closePath();
  outline.holes.push(hole);
  const shell = new THREE.ExtrudeGeometry(outline, { depth: cabinetH - bodyY, bevelEnabled: false, curveSegments: 3 });
  shell.rotateX(-Math.PI / 2);
  shell.translate(0, bodyY, 0);
  g.add(new THREE.Mesh(shell, M.oak));
  g.add(box(M.oak, innerX * 2, 0.02, innerZ * 2, 0, bodyY + 0.01, 0));

  // Legs with levelling feet.
  const legW = 0.08;
  const footH = 0.025;
  const legGeo = roundedBoxGeo(legW, bodyY - footH, legW, 0.008, 1);
  const footGeo = new THREE.CylinderGeometry(0.024, 0.028, footH, 12);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (hw - legW / 2 - 0.006);
      const z = sz * (hl - legW / 2 - 0.006);
      const leg = new THREE.Mesh(legGeo, M.oak);
      leg.position.set(x, footH + (bodyY - footH) / 2, z);
      const foot = new THREE.Mesh(footGeo, M.aluminium);
      foot.position.set(x, footH / 2, z);
      g.add(leg, foot);
    }
  }

  // Playfield and markings (6 mm vinyl, 0.5 mm proud).
  g.add(box(M.field, fieldW, 0.01, fieldL, 0, fieldY - 0.005, 0));
  const markY = fieldY + 0.0005;
  const line = 0.006;
  const mark = (w: number, d: number, x: number, z: number) => {
    const m = plane(M.vinylWhite, w, d, x, markY, z);
    m.rotation.x = -Math.PI / 2;
    g.add(m);
  };
  mark(fieldW, line, 0, 0);
  const circle = new THREE.Mesh(new THREE.RingGeometry(0.09 - line / 2, 0.09 + line / 2, 32, 1), M.vinylWhite);
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = markY;
  g.add(circle);
  const penW = 0.34;
  const penD = 0.13;
  for (const s of [-1, 1]) {
    mark(penW, line, 0, s * (fieldL / 2 - penD));
    for (const sx of [-1, 1]) mark(line, penD - line / 2, sx * (penW / 2 - line / 2), s * (fieldL / 2 - penD / 2 - line / 4));
  }

  // White liners on the side walls, rising wallH above the field.
  const linerH = wallTop - deckY;
  const linerY = deckY + linerH / 2;
  for (const sx of [-1, 1]) g.add(box(M.white, liner, linerH, fieldL + liner * 2, sx * (fieldW / 2 + liner / 2), linerY, 0));

  // End walls: oak cheeks either side of the goal mouth, a lintel over it, white liners facing the field,
  // and a goal box behind with a white floor and frosted "net" panels.
  const cheekW = innerX - goalW / 2;
  const cheekD = goalDepth - liner;
  const rimH = cabinetH - deckY;
  for (const s of [-1, 1]) {
    const zFace = s * (fieldL / 2 + liner / 2);
    const zBlock = s * (fieldL / 2 + liner + cheekD / 2);
    for (const sx of [-1, 1]) {
      g.add(box(M.oak, cheekW, rimH, cheekD, sx * (goalW / 2 + cheekW / 2), deckY + rimH / 2, zBlock));
      g.add(box(M.white, fieldW / 2 - goalW / 2, linerH, liner, sx * (goalW / 2 + (fieldW / 2 - goalW / 2) / 2), linerY, zFace));
      const side = plane(M.glassFrosted, cheekD - 0.004, goalH, sx * (goalW / 2 - 0.002), fieldY + goalH / 2, zBlock - s * 0.002);
      side.rotation.y = Math.PI / 2;
      g.add(side);
    }
    const lintelY0 = fieldY + goalH;
    g.add(box(M.oak, goalW, cabinetH - lintelY0, cheekD, 0, (cabinetH + lintelY0) / 2, zBlock));
    g.add(box(M.white, goalW, wallTop - lintelY0, liner, 0, (wallTop + lintelY0) / 2, zFace));
    g.add(box(M.white, goalW, 0.01, goalDepth, 0, fieldY - 0.005, s * (fieldL / 2 + goalDepth / 2)));
    g.add(plane(M.glassFrosted, goalW - 0.004, goalH, 0, fieldY + goalH / 2, s * (innerZ - 0.004)));
  }

  // Corner ball-return ramps.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const ramp = new THREE.Mesh(rampGeo(sx, sz), M.white);
      ramp.position.y = fieldY;
      g.add(ramp);
    }
  }

  // Rod bushings on the outside of the cabinet.
  const bushT = 0.004;
  const bushGeo = xCyl(0.015, bushT, 0, 10);
  for (const spec of RODS) {
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(bushGeo, M.aluminium);
      b.position.set(sx * (hw + bushT / 2), fieldY + FOOS.rodY, spec.z);
      g.add(b);
    }
  }

  // Everything that moves, in the table-local frame of foosballSpec.ts (origin: centre of the playfield surface).
  const dyn = group('foosDynamic');
  dyn.userData.dynamic = true;
  dyn.position.set(0, fieldY, 0);
  const rodLen = cabinetW + 0.42;
  const gripLen = 0.11;
  const gripOverlap = 0.006;
  const piece = figureGeo();
  const capGeo = (side: number) => fuse([xCyl(FOOS.rodR, rodLen, 0, 8), xCyl(0.011, 0.012, side * (rodLen / 2 + 0.003), 8)]);
  const steel = { blue: capGeo(-1), amber: capGeo(1) };
  const gripGeo = xCyl(0.016, gripLen, 0, 12);
  RODS.forEach((spec, i) => {
    const rod = group(`rod${i}`);
    rod.position.set(0, FOOS.rodY, spec.z);
    rod.userData.team = spec.team;
    rod.userData.figures = spec.count;
    // Blue plays from the +X side, amber from -X: grip on the player's end, cap on the other.
    const side = spec.team === 'blue' ? 1 : -1;
    const bar = new THREE.Mesh(steel[spec.team], M.chrome);
    bar.name = 'bar';
    const grip = new THREE.Mesh(gripGeo, M.rubber);
    grip.name = 'grip';
    grip.position.x = side * (rodLen / 2 - gripOverlap + gripLen / 2);
    rod.add(bar, grip);
    for (let k = 0; k < spec.count; k++) {
      const fig = new THREE.Mesh(piece, spec.team === 'blue' ? M.teamBlue : M.teamAmber);
      fig.name = `figure${k}`;
      fig.position.x = (k - (spec.count - 1) / 2) * spec.spacing;
      rod.add(fig);
    }
    dyn.add(rod);
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(FOOS.ballR, 16, 10), M.ball);
  ball.name = 'ball';
  ball.position.set(0, FOOS.ballR, 0);
  dyn.add(ball);
  g.add(dyn);
  return g;
}

/** Wall-mounted digital scoreboard, 0.61 x 0.244 m, 30 mm deep. Origin at its centre, back on z = 0. */
export function buildScoreboard(screenMat: THREE.Material): THREE.Group {
  const g = group('scoreboard');
  const w = 2 * 0.3048;
  const h = 0.8 * 0.3048;
  const d = 0.03;
  g.add(plate(M.bezel, w, h, d, 0.012, { seg: 3, bevel: 0.003, back: false }));
  const screen = plane(screenMat, w - 0.024, h - 0.024, 0, 0, d + 0.0005);
  screen.name = 'scoreScreen';
  screen.userData.noMerge = true;
  g.add(screen);
  return g;
}
