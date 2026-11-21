/**
 * The dive (Section 6): one scene graph scales from 1:40 to 1:1 about a pivot while the camera moves. No cut.
 * applyDive(τ) is a pure function of time, so the same code runs the entry dive, the reverse "Exit to model",
 * and the paused mid-dive test frame.
 */
import * as THREE from 'three';
import { audio } from '../../audio/engine';
import { extensions } from '../../debug/api';
import { EYE_HEIGHT_M, FT } from '../../data/geometry';
import { player, rt, touch } from '../../state/runtime';
import { useStudio } from '../../state/store';
import { addFrameHook, frameHooks } from '../frameHooks';
import { CAR_PIVOT, clamp01, diveScale, easeInOutCubic, placeWorld, setDoor, tablePos, WALK_OFFSET } from '../director';
import { teleport } from '../walkthrough/WalkControls';
import { tourStops } from '../../systems/tourStops';

export const DIVE_T = { fade: 0.4, glide: 2.0, descend: 4.6, end: 5.5 };
const HOVER_M = 0.35;

export interface StageRefs {
  world: THREE.Object3D;
  key: THREE.DirectionalLight;
  sun: THREE.DirectionalLight;
  room: THREE.Object3D;
  /** Switch environment, lights and part visibility between the model look and the walkthrough look. */
  setLook(walk: boolean): void;
  presHome: { p: THREE.Vector3; q: THREE.Quaternion };
  syncControls(): void;
}
export const stage: { refs: StageRefs | null } = { refs: null };

const dive = {
  active: false,
  t: 0,
  dir: 1 as 1 | -1,
  pivot: new THREE.Vector3(),
  startP: new THREE.Vector3(),
  startQ: new THREE.Quaternion(),
  walkP: new THREE.Vector3(),
  walkQ: new THREE.Quaternion(),
  look: false,
};
const hoverP = new THREE.Vector3();
const downQ = new THREE.Quaternion();
const pivW = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const mat = new THREE.Matrix4();
const fadeMats: THREE.Material[] = [];

function setRoomOpacity(o: number): void {
  const r = stage.refs!.room;
  if (!fadeMats.length)
    r.traverse((n) => {
      const m = (n as THREE.Mesh).material as THREE.Material | undefined;
      if (m && !fadeMats.includes(m)) fadeMats.push(m);
    });
  for (const m of fadeMats) {
    m.transparent = o < 1;
    m.opacity = o;
    m.depthWrite = o >= 1;
  }
  r.visible = o > 0.001;
}

/** Pose everything for dive time τ (seconds, 0 = presentation home … 5.5 = standing in the lift). */
export function applyDive(tau: number): void {
  const R = stage.refs;
  const cam = rt.camera;
  if (!R || !cam) return;
  const e1 = easeInOutCubic(clamp01((tau - DIVE_T.fade) / (DIVE_T.glide - DIVE_T.fade)));
  const e2 = easeInOutCubic(clamp01((tau - DIVE_T.glide) / (DIVE_T.descend - DIVE_T.glide)));
  rt.dive = e2;
  const s = diveScale(e2);
  // The pivot stays where it was on the table for the entry dive; for the exit it travels back to the table.
  tablePos(dive.pivot, a);
  b.copy(dive.pivot).add(WALK_OFFSET);
  pivW.lerpVectors(a, b, e2);
  placeWorld(R.world, s, dive.pivot, pivW);
  // Camera: glide to a hover above the pivot looking down, then descend to the walking eye.
  hoverP.copy(a).add(b.set(0, HOVER_M, 0));
  // Looking straight down with screen-up toward the walking view direction, so the final tilt-up has no roll.
  b.set(0, 0, -1).applyQuaternion(dive.walkQ);
  mat.lookAt(hoverP, a.set(hoverP.x, hoverP.y - 1, hoverP.z), b);
  downQ.setFromRotationMatrix(mat);
  if (tau <= DIVE_T.glide) {
    cam.position.lerpVectors(dive.startP, hoverP, e1);
    cam.quaternion.slerpQuaternions(dive.startQ, downQ, e1);
  } else {
    cam.position.lerpVectors(hoverP, dive.walkP, e2);
    const tilt = easeInOutCubic(clamp01((tau - 3.3) / (DIVE_T.descend - 3.3)));
    cam.quaternion.slerpQuaternions(downQ, dive.walkQ, tilt);
  }
  const fov = 30 + (60 - 30) * e2;
  cam.fov = fov;
  cam.near = 0.02 + 0.06 * e2;
  cam.far = 120 + 2380 * e2;
  cam.updateProjectionMatrix();
  // The table and room fade out; walkthrough light and sky take over once the camera is under the car ceiling.
  setRoomOpacity(1 - clamp01((tau - DIVE_T.glide) / 1.5));
  R.key.shadow.intensity = 1 - clamp01((tau - DIVE_T.glide) / 0.5);
  const walkLook = s > 0.62;
  if (walkLook !== dive.look) {
    dive.look = walkLook;
    R.setLook(walkLook);
  }
}

function begin(dir: 1 | -1): void {
  const R = stage.refs!;
  const cam = rt.camera!;
  const st = useStudio.getState();
  frameHooks.cameraOverride = true;
  dive.dir = dir;
  dive.active = true;
  if (dir === 1) {
    const s1 = tourStops(st.layout)[0];
    dive.pivot.copy(CAR_PIVOT);
    dive.startP.copy(cam.position);
    dive.startQ.copy(cam.quaternion);
    dive.walkP.set(s1.cam[0] * FT, EYE_HEIGHT_M, -s1.cam[1] * FT).add(WALK_OFFSET);
    dive.walkQ.setFromEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(0 - 90), 0, 'YXZ'));
    dive.t = 0;
    dive.look = false;
  } else {
    dive.pivot.set(player.x * FT, 0, -player.y * FT);
    dive.walkP.copy(cam.position);
    dive.walkQ.copy(cam.quaternion);
    dive.startP.copy(R.presHome.p);
    dive.startQ.copy(R.presHome.q);
    dive.t = DIVE_T.descend;
    dive.look = true;
  }
  st.set({ mode: 'transition', inspect: null, activeZone: null, hoverZone: null });
}

function finish(): void {
  const st = useStudio.getState();
  const R = stage.refs!;
  dive.active = false;
  frameHooks.cameraOverride = false;
  if (dive.dir === 1) {
    const s1 = tourStops(st.layout)[0];
    teleport(s1.cam[0], s1.cam[1], 0);
    st.set({ mode: 'walkthrough', location: 'Lift Lobby #1' });
    // 4.6 to 5.5 s: the chime, then the doors slide open (1.2 s).
    audio.play('liftChime');
    audio.play('liftDoor');
    setDoor('lift-PL07', true);
  } else {
    setRoomOpacity(1);
    R.key.shadow.intensity = 1;
    for (const d of ['lift-PL07', 'entry']) setDoor(d, false, true);
    st.set({ mode: 'presentation' });
    R.syncControls();
  }
  rt.shadowDirty = true;
  touch(12);
}

/** Start experience. */
export function startDive(): void {
  const st = useStudio.getState();
  if (st.mode !== 'presentation' || dive.active || !stage.refs) return;
  audio.play('diveSwell');
  if (st.reducedMotion) return crossfade(1);
  begin(1);
}
/** Exit to model: the same animation in reverse, about the visitor's current position. */
export function exitToModel(): void {
  const st = useStudio.getState();
  if (st.mode !== 'walkthrough' || dive.active || !stage.refs) return;
  st.set({ tour: { active: false, paused: false, stop: 0 } });
  if (st.reducedMotion) return crossfade(-1);
  begin(-1);
}
/** Reduced motion: a 0.6 s crossfade straight to the destination view. */
function crossfade(dir: 1 | -1): void {
  const st = useStudio.getState();
  st.set({ hint: 'fade' });
  setTimeout(() => {
    begin(dir);
    dive.t = dir === 1 ? DIVE_T.descend : DIVE_T.fade;
    applyDive(dive.t);
    finish();
    setTimeout(() => useStudio.getState().set({ hint: null }), 300);
  }, 300);
}

addFrameHook((dt) => {
  if (!dive.active || extensions.divePaused) return dive.active;
  dive.t += dt * dive.dir;
  const done = dive.dir === 1 ? dive.t >= DIVE_T.descend : dive.t <= 0;
  applyDive(Math.max(0, Math.min(DIVE_T.descend, dive.t)));
  if (done) finish();
  return true;
});

/** Test hook: jump to dive time τ and hold there (22B.2 mid-dive frame at t = 3.3 s). */
extensions.diveTo = (tau: number) => {
  if (!stage.refs || !rt.camera) return;
  if (!dive.active) begin(1);
  extensions.divePaused = true;
  dive.t = tau;
  applyDive(tau);
  rt.shadowDirty = true;
  touch(10);
};
extensions.diveResume = () => {
  extensions.divePaused = false;
};
