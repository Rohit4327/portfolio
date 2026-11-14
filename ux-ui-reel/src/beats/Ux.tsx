// BEAT 3 — UX (30.4 → 52.4 s). The layers fold into the amber point, which draws a journey path through dark space past four
// glass stations (FIND → CHOOSE → PAY → CONFIRM); each question lights one; the camera flies the path while quick DOM inserts
// show navigation, speed, clear words and undo; an email card arrives after CONFIRM; a pull-back reveals the whole path and the
// amber point settles at screen centre for the hand-off.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { Stage3D, CameraRig, Rig, GlowPoint, useT } from '../lib/Stage3D';
import { beat, wordAt, local } from '../timeline';
import { PALETTE } from '../lib/theme';
import { seg, ease, easeOut, easeInOut, fadeIO, lerp, clamp } from '../lib/anim';
import { Cam, project, camLerp } from './Ui.parts';
import { at, tangentAt, STATIONS, STATION_POS, DrawnTube, Station, Collapse, Insert, EmailCard, StationLabel } from './Ux.parts';

const B = beat('ux');
const L = (s: string, w: string) => local('ux', wordAt(s, w));
const T = {
  draw: L('whole journey', 'feel'), drawEnd: L('whole journey', 'journey') + 0.75,
  stations: [L('Can you find it', 'find'), L('Can you find it', 'Finish'), L('Can you find it', 'Trust'), L('Can you find it', 'back')],
  crane: 2.6, travelStart: 5.6, travelEnd: L('Navigation. Speed', 'mistakes') + 0.9,
  inserts: [L('Navigation. Speed', 'Navigation'), L('Navigation. Speed', 'Speed'), L('Navigation. Speed', 'Clear'), L('Navigation. Speed', 'Recovering')],
  email: L('email that arrives', 'email'),
  pull: L('All of it is the experience', 'All'),
  end: B.end - B.start,
};
const INSERT_LIFE = 1.2;
export const cues = {
  path_draw_start: B.start + T.draw, path_draw_end: B.start + T.drawEnd,
  station_1: B.start + T.stations[0], station_2: B.start + T.stations[1], station_3: B.start + T.stations[2], station_4: B.start + T.stations[3],
  insert_1: B.start + T.inserts[0], insert_2: B.start + T.inserts[1], insert_3: B.start + T.inserts[2], insert_4: B.start + T.inserts[3],
  email_in: B.start + T.email, pullback: B.start + T.pull, transition_point: B.end - 0.45,
};
export const transition = { kind: 'bloom' as const, frames: 14, cx: 540, cy: 960 };

const P0 = at(0);
const CENTRE: [number, number, number] = [0.1, 0.5, -3.9];      // where the point settles (and where the pull-back looks)
const HH = 0.01;
// ---------------------------------------------------------------- camera: one function for the rig and the DOM projector
const travelCam = (u: number): Cam => {
  // a dolly tracking alongside the journey (the stations face +z), looking a little ahead, banking with the curve
  const p = at(u); const l = at(Math.min(1, u + 0.1)); const tg = tangentAt(u);
  return { pos: [p[0] + 0.5, p[1] + 0.9, p[2] + 5.5], look: [l[0], l[1] + 0.25, l[2]], fov: 42, roll: -0.18 * tg.x };
};
const A0: Cam = { pos: [P0[0], P0[1] + 0.25, P0[2] + 3.4], look: [P0[0], P0[1], P0[2]], fov: 38, roll: 0 };
const A1: Cam = { pos: [1.6, -0.3, 6.6], look: [0, 1.2, -4.4], fov: 40, roll: 0 };
const A2: Cam = { pos: [1.2, -0.1, 6.2], look: [0, 1.3, -4.4], fov: 40, roll: 0 };
const U_TRAVEL: [number, number] = [0.1, 0.72];
const PULL: Cam = { pos: [0.3, 0.6, 9.6], look: CENTRE, fov: 46, roll: 0 };
const camState = (t: number): Cam => {
  if (t < T.crane) return camLerp(A0, A1, ease(t, 0.35, T.crane, easeInOut));
  if (t < T.travelStart) return camLerp(A1, A2, ease(t, T.crane, T.travelStart, easeInOut));
  if (t < T.travelEnd) {
    const u = lerp(U_TRAVEL[0], U_TRAVEL[1], ease(t, T.travelStart, T.travelEnd, easeInOut));
    return camLerp(A2, travelCam(u), ease(t, T.travelStart, T.travelStart + 1.6, easeInOut));
  }
  const hold = travelCam(lerp(U_TRAVEL[1], U_TRAVEL[1] + 0.03, ease(t, T.travelEnd, T.pull, easeInOut)));
  if (t < T.pull) return hold;
  return camLerp(travelCam(U_TRAVEL[1] + 0.03), PULL, ease(t, T.pull, T.pull + 4.6, easeInOut));
};
const dist = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const Beat: React.FC = () => {
  const t = useT();
  const cam = camState(t);
  const hh = HH * (1 - ease(t, T.end - 2.6, T.end - 1.1, easeInOut));
  const collapseK = ease(t, 0.0, 0.75, easeInOut);
  const progress = ease(t, T.draw, T.drawEnd, easeInOut);
  // the amber point: draws the path, waits at its end, then settles to the centre for the hand-off
  const settle = ease(t, T.pull + 1.4, T.pull + 5.0, easeInOut);
  const head = at(progress); const pt: [number, number, number] = [lerp(head[0], CENTRE[0], settle), lerp(head[1], CENTRE[1], settle), lerp(head[2], CENTRE[2], settle)];
  const lit = STATIONS.map((_, i) => ease(t, T.stations[i], T.stations[i] + 0.35, easeOut));
  const pulse = STATIONS.map((_, i) => seg(t, T.stations[i], T.stations[i] + 0.7));
  const hasStations = progress > 0.05;
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      <Stage3D background="#06080b" fog={[7, 26]} bloom={0.8} threshold={0.7}>
        <CameraRig keys={[{ t, pos: cam.pos, look: cam.look, fov: cam.fov }]} t={t} handheld={hh} roll={cam.roll} />
        <Rig keyI={1.6} keyColor="#ffdcb8" rimColor={PALETTE.cyan} ambient={0.08} shadow={false} />
        <pointLight position={[-2.5, 1.5, -4.5]} intensity={10} color={PALETTE.cyan} distance={12} />
        <pointLight position={[2.5, 3.5, -7.5]} intensity={6} color={PALETTE.cyan} distance={10} />
        <Collapse k={collapseK} position={P0} />
        <DrawnTube progress={progress} glow={1} />
        {hasStations ? STATIONS.map((s, i) => {
          const vis = clamp((progress - s.u) / 0.06); if (vis <= 0) return null;
          const near = clamp(1 - dist(cam.pos, STATION_POS[i]) / 3.5);
          return <group key={s.id} scale={[0.6 + 0.4 * easeOut(vis), 0.6 + 0.4 * easeOut(vis), 1]} position={STATION_POS[i]}><Station id={s.id} position={[0, 0, 0]} lit={lit[i]} pulse={pulse[i]} near={near} /></group>;
        }) : null}
        <GlowPoint position={pt} radius={0.06} intensity={0.85 + 0.25 * collapseK + 0.08 * Math.sin(t * 6)} />
      </Stage3D>
      {/* station labels anchored above each slab (hidden when behind or under the camera) */}
      {hasStations ? STATIONS.map((s, i) => {
        const vis = clamp((progress - s.u) / 0.06); if (vis <= 0) return null;
        const p = project(cam, [STATION_POS[i][0], STATION_POS[i][1] + 0.5, STATION_POS[i][2]], t, hh);
        const d = dist(cam.pos, STATION_POS[i]); const a = Math.min(vis, clamp((d - 1.4) / 0.8)) * (p.visible ? 1 : 0);
        return <StationLabel key={s.id} x={p.x} y={p.y} n={s.n} text={s.label} lit={lit[i]} a={a} />;
      }) : null}
      {/* quick inserts: two alternating slots in the upper half */}
      <Insert kind="nav" age={t - T.inserts[0]} life={INSERT_LIFE} y={330} />
      <Insert kind="speed" age={t - T.inserts[1]} life={INSERT_LIFE} y={640} />
      <Insert kind="words" age={t - T.inserts[2]} life={INSERT_LIFE} y={330} />
      <Insert kind="undo" age={t - T.inserts[3]} life={INSERT_LIFE} y={640} />
      {/* the email after you pay */}
      <EmailCard age={t - T.email} life={T.pull + 0.35 - T.email} x={440} y={560} />
    </AbsoluteFill>
  );
};
