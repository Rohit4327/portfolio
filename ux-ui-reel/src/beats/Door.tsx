// BEAT 6 — THE DOOR (100.4 → 125.4 s). First-person approach to a flush walnut door with an ambiguous steel disc; push, push,
// pull — it opens; FREEZE; the camera leaves the body and orbits the half-open door while the amber point emerges at the disc and
// 'YOU WEREN'T. / THE DESIGN WAS.' punch in. Then the redesign: the disc dissolves, hinges + a brushed-steel pull bar assemble,
// back to first person, the hand grips the bar, the door opens first time and the camera walks through into soft ivory light.
// The door construction is a port of the documentary's s01_door.js / s10_future.parts.js (wall with a real opening via
// ExtrudeGeometry, hinge group, walnut slab, disc, pull bar on standoffs, three hinge knuckles, back-room light, first-person hand).
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Stage3D, GlowPoint, useT } from '../lib/Stage3D';
import { Dip } from '../lib/Overlay';
import { Punch } from '../lib/Type';
import { beat, sent, wordAt, local } from '../timeline';
import { PALETTE } from '../lib/theme';
import { seg, ease, easeOut, easeIn, easeInOut, fadeIO, lerp, clamp, noise1, pop } from '../lib/anim';

const B = beat('door');
const L = (tAbs: number) => local('door', tAbs);
const deg = (d: number) => (d * Math.PI) / 180;
const END = B.end - B.start;

// ---- timing (local seconds), anchored on the narration ----
const T = {
  walk0: 0.0, walk1: 2.05,
  hit1: L(wordAt('You push', 'push')) + 0.1,            // the first shove lands
  hit2: L(wordAt('You push', 'Nothing')) + 0.15,        // the second shove
  pull: L(wordAt('You pull', 'pull')),                   // the hand moves to the free edge
  pullOpen: L(wordAt('You pull', 'pull')) + 0.1,         // the slab starts to swing
  openEnd: L(wordAt('You pull', 'opens')) + 0.7,         // 62° open
  freeze: L(sent('You feel foolish').start) - 0.06,     // everything stops
  pointAppear: L(sent('You feel foolish').start) + 0.6,
  punch1: L(wordAt('You feel foolish', "weren't")) - 0.15,
  punch2: L(wordAt('You feel foolish', 'design')) - 0.1,
  redesign: L(sent('Now give that door').start),         // door swings shut, light returns
  dissolve: L(wordAt('Now give that door', 'door')) + 0.1,
  assemble: L(wordAt('Now give that door', 'proper')) - 0.45,
  barLand: L(wordAt('Now give that door', 'handle')) + 0.15,
  ret0: L(sent('Now give that door').start) + 0.4, ret1: L(wordAt('Now give that door', 'handle')) + 0.1,
  reach4: L(wordAt('Now give that door', 'handle')) + 0.05,
  cleanOpen: L(wordAt('You open it without', 'without')) - 0.05,
  goal: L(sent("That's the goal").start),
  walkOut0: L(wordAt('You open it without', 'thinking')) + 0.4, walkOut1: 21.0,
  wash0: 18.6, wash1: 22.2,
  tag: 21.2,
  end: END,
};
export const cues = {
  door_footsteps_start: B.start + T.walk0 + 0.15, door_footsteps_end: B.start + T.walk1,
  door_push_thud_1: B.start + T.hit1, door_push_thud_2: B.start + T.hit2,
  door_pull_open: B.start + T.pullOpen,
  freeze: B.start + T.freeze, point_appear: B.start + T.pointAppear,
  bar_assemble: B.start + T.assemble, door_open_clean: B.start + T.cleanOpen,
  footsteps_out_start: B.start + T.walkOut0, footsteps_out_end: B.start + T.walkOut1,
  transition_point: B.end - 16 / 30,
};
export const transition = { kind: 'fade' as const, frames: 16 };

// ---- geometry constants (metres) — identical to the documentary door ----
const DW = 0.92, DH = 2.08, WALL_H = 5.2, WALL_W = 18, HINGE_X = -DW / 2;
const DISC_LOCAL = new THREE.Vector3(DW - 0.2, 1.04, 0.0255);
const EDGE_LOCAL = new THREE.Vector3(0.9, 1.02, 0.03);
const BAR_Y = 1.04, BAR_X0 = 0.3, BAR_X1 = 0.84, STANDOFF = 0.062, BAR_Z = 0.0225 + STANDOFF + 0.012;
const BAR_LOCAL = new THREE.Vector3((BAR_X0 + BAR_X1) / 2, BAR_Y, BAR_Z);
const UP = new THREE.Vector3(0, 1, 0);
const hingeToWorld = (local: THREE.Vector3, angle: number) => local.clone().applyAxisAngle(UP, angle).add(new THREE.Vector3(HINGE_X, 0, 0));

// ---- pure-time model ------------------------------------------------------------------------------------------------
/** the physical clock: runs until the freeze, holds, resumes at the redesign */
const phys = (t: number) => (t < T.freeze ? t : Math.min(t, T.freeze));

const doorAngle = (t: number) => {
  const tp = phys(t);
  const rattle = (hit: number) => { const k = seg(tp, hit, hit + 0.75); return k > 0 && k < 1 ? -deg(0.8) * Math.sin(k * Math.PI * 2.2) * Math.exp(-k * 3.2) : 0; };
  let a = rattle(T.hit1) + rattle(T.hit2);
  a += -deg(62) * easeOut(seg(tp, T.pullOpen, T.openEnd));
  a *= 1 - easeInOut(seg(t, T.redesign, T.redesign + 0.95));                       // the redesign: the slab swings shut
  a += -deg(82) * easeInOut(seg(t, T.cleanOpen, T.cleanOpen + 1.35));              // the clean open
  return a;
};
/** scene light level (the freeze dims the world; the redesign brings it back; the walk-through brightens) */
const lightLevel = (t: number) => {
  const rise = lerp(0.5, 1, ease(t, 0, 1.1, easeOut));
  const dim = 1 - 0.58 * ease(t, T.freeze, T.freeze + 0.7, easeOut) * (1 - ease(t, T.redesign, T.redesign + 1.0, easeInOut));
  const bright = 1 + 0.15 * ease(t, T.walkOut0 + 0.6, T.wash1, easeInOut);
  return rise * dim * bright;
};
type Pose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };
const fpPose = (tp: number): Pose => {
  const k = easeInOut(seg(tp, T.walk0, T.walk1));
  const z = lerp(4.9, 1.62, k), x = lerp(0.34, 0.12, k);
  const walking = fadeIO(tp, T.walk0 - 0.2, T.walk1 + 0.4, 0.4, 0.6);
  const bob = Math.sin((tp - T.walk0) * Math.PI * 2 * 0.95) * 0.012 * walking;
  const sway = Math.sin((tp - T.walk0) * Math.PI * 0.95) * 0.01 * walking;
  const y = 1.62 + bob + (noise1(tp * 0.4) - 0.5) * 0.01;
  const lean = 0.1 * (fadeIO(tp, T.hit1 - 0.45, T.hit1 + 0.3, 0.4, 0.3) + fadeIO(tp, T.hit2 - 0.35, T.hit2 + 0.4, 0.3, 0.4)) - 0.14 * fadeIO(tp, T.pull - 0.2, T.openEnd + 1.2, 0.5, 0.8);
  return { pos: new THREE.Vector3(x + sway, y, z - lean), look: new THREE.Vector3(0.06, 1.12 + (noise1(tp * 0.3 + 7) - 0.5) * 0.02, 0), fov: 60 };
};
const ORBIT_C = new THREE.Vector3(-0.1, 1.05, 0.42);
const orbitPose = (k: number): Pose => {
  const fp = fpPose(T.freeze);
  const a0 = Math.atan2(fp.pos.x - ORBIT_C.x, fp.pos.z - ORBIT_C.z);
  const ang = a0 - k * deg(58);
  const r = lerp(Math.hypot(fp.pos.x - ORBIT_C.x, fp.pos.z - ORBIT_C.z), 2.95, easeOut(k));
  const pos = new THREE.Vector3(ORBIT_C.x + Math.sin(ang) * r, lerp(fp.pos.y, 1.78, k), ORBIT_C.z + Math.cos(ang) * r);
  const look = new THREE.Vector3(lerp(fp.look.x, ORBIT_C.x + 0.05, k), lerp(fp.look.y, 1.08, k), lerp(fp.look.z, ORBIT_C.z - 0.25, k));
  return { pos, look, fov: lerp(60, 46, k) };
};
const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({ pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: lerp(a.fov, b.fov, k) });
const poseAt = (t: number): Pose => {
  let p: Pose;
  if (t < T.freeze) p = fpPose(t);
  else if (t < T.ret0) p = orbitPose(easeInOut(seg(t, T.freeze, T.ret0)));
  else {
    const fp2: Pose = { pos: new THREE.Vector3(0.12, 1.62, 1.62), look: new THREE.Vector3(0.06, 1.12, 0), fov: 60 };
    if (t < T.ret1) p = lerpPose(orbitPose(1), fp2, easeInOut(seg(t, T.ret0, T.ret1)));
    else {
      const lean = 0.12 * fadeIO(t, T.reach4 + 0.3, T.cleanOpen + 1.3, 0.5, 0.7);
      const kw = easeInOut(seg(t, T.walkOut0, T.walkOut1));
      const walking = fadeIO(t, T.walkOut0, T.walkOut1 + 0.4, 0.8, 1.0);
      const bob = Math.sin((t - T.walkOut0) * Math.PI * 2 * 0.9) * 0.012 * walking;
      const z = lerp(1.62, -2.7, kw) - lean;
      p = { pos: new THREE.Vector3(lerp(0.12, 0.04, kw), 1.62 + bob, z), look: new THREE.Vector3(lerp(0.06, 0.02, kw), lerp(1.12, 1.34, kw), lerp(0, z - 5, kw)), fov: lerp(60, 54, kw) };
    }
  }
  // handheld micro-drift (tiny; never shake)
  p.pos.x += (noise1(t * 0.7 + 3) - 0.5) * 0.012; p.pos.y += (noise1(t * 0.9 + 11) - 0.5) * 0.012;
  return p;
};
const frameOf = (p: Pose) => {
  const fwd = p.look.clone().sub(p.pos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  const m = new THREE.Matrix4().lookAt(p.pos, p.look, UP); const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return { fwd, right, up, q };
};
type HandState = { pos: THREE.Vector3; quat: THREE.Quaternion; curl: number; opacity: number; base: THREE.Vector3 };
const handAt = (t: number): HandState | null => {
  // phase 1: first person until the freeze (then frozen in place and fading out while the camera leaves)
  if (t < T.redesign) {
    const tp = phys(t);
    if (tp < T.walk1 - 0.6) return null;
    const opacity = 1 - ease(t, T.freeze + 0.35, T.freeze + 1.1, easeInOut);
    if (opacity <= 0) return null;
    const cam = fpPose(tp); const { fwd, right, up, q } = frameOf(cam);
    const base = cam.pos.clone().addScaledVector(fwd, 0.55).addScaledVector(right, 0.27).addScaledVector(up, -0.35);
    const reach1 = fadeIO(tp, T.hit1 - 0.55, T.hit1 + 0.4, 0.5, 0.38), reach2 = fadeIO(tp, T.hit2 - 0.4, T.hit2 + 0.5, 0.32, 0.45);
    const reach3 = fadeIO(tp, T.pull - 0.6, T.openEnd + 1.4, 0.6, 0.9);
    const pushing = Math.max(reach1, reach2); const pulling = reach3 > pushing;
    const angle = doorAngle(tp);
    let target: THREE.Vector3; let quat: THREE.Quaternion; let curl: number;
    if (pulling) {
      target = hingeToWorld(EDGE_LOCAL, angle).addScaledVector(right, 0.025).addScaledVector(fwd, -0.045);
      quat = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), deg(84))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deg(-10)));
      curl = 0.9;
    } else {
      // the shove: palm flat on the disc, a small forward impulse on each hit
      const shove = 0.03 * (fadeIO(tp, T.hit1 - 0.06, T.hit1 + 0.18, 0.06, 0.18) + fadeIO(tp, T.hit2 - 0.06, T.hit2 + 0.18, 0.06, 0.18));
      target = hingeToWorld(DISC_LOCAL, angle).addScaledVector(fwd, -0.05 + shove).addScaledVector(up, -0.06);
      quat = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deg(-30))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), deg(-12)));
      curl = 0.12 + 0.1 * pushing;
    }
    const reach = Math.max(pushing, reach3);
    const pos = base.clone().lerp(target, easeInOut(reach) * 0.97);
    return { pos, quat, curl, opacity, base };
  }
  // phase 2: the clean pull on the new bar
  const reach = fadeIO(t, T.reach4, T.cleanOpen + 3.2, 0.55, 1.8);
  const opacity2 = 1 - ease(t, T.cleanOpen + 1.15, T.cleanOpen + 1.65, easeInOut);
  if (reach <= 0 || opacity2 <= 0) return null;
  const cam = poseAt(t); const { fwd, right, up, q } = frameOf(cam);
  const base = cam.pos.clone().addScaledVector(fwd, 0.55).addScaledVector(right, 0.27).addScaledVector(up, -0.35);
  const target = hingeToWorld(BAR_LOCAL, doorAngle(t)).addScaledVector(fwd, -0.035).addScaledVector(up, 0.035);
  const quat = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deg(-42))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), deg(-6)));
  const pos = base.clone().lerp(target, easeInOut(reach) * 0.97);
  return { pos, quat, curl: 0.25 + 0.7 * easeInOut(seg(t, T.reach4 + 0.35, T.reach4 + 0.6)), opacity: opacity2, base };
};
/** amber point: emerges at the disc after the freeze, rides the disc as the door shuts, lifts clear for the assembly, then leads us through */
const pointAt = (t: number) => {
  const pa = ease(t, T.pointAppear, T.pointAppear + 1.3, easeOut); if (pa <= 0) return null;
  const disc = hingeToWorld(DISC_LOCAL, doorAngle(t)).add(new THREE.Vector3(0, 0, 0.035));
  // the point marks the spot: it glides from the disc to where the handle belongs and the bar assembles around it
  const mark = hingeToWorld(BAR_LOCAL.clone().add(new THREE.Vector3(0, 0.0, 0.05)), doorAngle(t));
  const lift = easeInOut(seg(t, T.dissolve - 0.1, T.dissolve + 0.8));
  let p = disc.lerp(mark, lift);
  const settle = ease(t, T.assemble + 0.5, T.barLand + 0.3, easeInOut);        // dims as the bar lands
  const cam = poseAt(t); const { fwd } = frameOf(cam);
  const ahead = cam.pos.clone().addScaledVector(fwd, 2.3);
  const lead = easeInOut(seg(t, T.walkOut0 - 0.3, T.walkOut0 + 1.6));
  p = p.lerp(ahead, lead);
  const pulse = 1 + 0.07 * Math.sin(t * 2 * Math.PI * 1.4);
  const grip = ease(t, T.reach4 + 0.25, T.reach4 + 0.55, easeInOut);
  const grow = (1 - 0.45 * settle) * (1 + 1.1 * lead) + 0.6 * ease(t, T.walkOut0 + 1, T.wash1, easeInOut);
  const inten = (0.9 + 0.25 * lift) * (1 - 0.6 * settle) * (1 - 0.8 * grip) * (1 + 4 * lead);
  return { pos: p, intensity: pa * inten * pulse, radius: 0.022 * (1 + 0.5 * pa) * grow * pulse, color: lead > 0.5 ? PALETTE.amberDeep : PALETTE.amber };
};

// ---- R3F pieces ------------------------------------------------------------------------------------------------------
const SKIN = '#C9A58B';
const Hand: React.FC<{ h: HandState }> = ({ h }) => {
  const fx = [-0.033, -0.011, 0.011, 0.033], fl = [0.07, 0.08, 0.075, 0.06];
  const mat = { color: SKIN, roughness: 0.75, transparent: h.opacity < 1, opacity: h.opacity } as const;
  // forearm: from the wrist back toward the (off-frame) shoulder base
  const wrist = new THREE.Vector3(0, -0.16, 0).applyQuaternion(h.quat).add(h.pos);
  const dir = h.base.clone().sub(wrist); const len = Math.max(0.05, dir.length()); dir.normalize();
  const mid = wrist.clone().addScaledVector(dir, len / 2); const fq = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  return (
    <group>
      <group position={h.pos} quaternion={h.quat}>
        <RoundedBox args={[0.09, 0.1, 0.03]} radius={0.012} smoothness={3} castShadow><meshStandardMaterial {...mat} /></RoundedBox>
        {fx.map((x, i) => (
          <group key={i} position={[x, 0.05, 0]} rotation={[-h.curl * 1.2, 0, 0]}>
            <mesh position={[0, fl[i] / 2, 0]} castShadow><capsuleGeometry args={[0.0095, fl[i], 4, 10]} /><meshStandardMaterial {...mat} /></mesh>
          </group>
        ))}
        <group position={[-0.05, -0.01, 0.005]} rotation={[-h.curl * 0.6, 0, 0.9]}>
          <mesh position={[0, 0.0275, 0]} castShadow><capsuleGeometry args={[0.011, 0.055, 4, 10]} /><meshStandardMaterial {...mat} /></mesh>
        </group>
        <mesh position={[0, -0.1, 0]} castShadow><capsuleGeometry args={[0.03, 0.12, 4, 12]} /><meshStandardMaterial {...mat} /></mesh>
      </group>
      <mesh position={mid} quaternion={fq} scale={[1, len, 1]} castShadow><cylinderGeometry args={[0.036, 0.042, 1, 14]} /><meshStandardMaterial {...mat} /></mesh>
    </group>
  );
};
const Cam: React.FC<{ p: Pose }> = ({ p }) => {
  const { camera } = useThree();
  camera.position.copy(p.pos); camera.lookAt(p.look);
  const pc = camera as THREE.PerspectiveCamera; if (pc.fov !== p.fov) { pc.fov = p.fov; pc.updateProjectionMatrix(); }
  return null;
};
const STEEL = { color: '#B4B9C2', roughness: 0.36, metalness: 0.62 } as const;
const STEEL_DK = { color: '#8d929b', roughness: 0.45, metalness: 0.7 } as const;
const Room: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const wallGeo = useMemo(() => {
    const shape = new THREE.Shape(); shape.moveTo(-WALL_W / 2, 0); shape.lineTo(WALL_W / 2, 0); shape.lineTo(WALL_W / 2, WALL_H); shape.lineTo(-WALL_W / 2, WALL_H); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(-DW / 2, 0); hole.lineTo(DW / 2, 0); hole.lineTo(DW / 2, DH); hole.lineTo(-DW / 2, DH); hole.closePath(); shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  }, []);
  const angle = doorAngle(t);
  const open = clamp(-angle / deg(62));
  const Lv = lightLevel(t);
  const wash = ease(t, T.wash0, T.wash1, easeInOut);
  const backI = (0.8 + 1.5 * open) * (1 + 0.5 * ease(t, T.walkOut0, T.wash1, easeInOut)) * (t < T.redesign ? Math.min(1, Lv + 0.35) : 1);
  const backEm = 0.08 + 0.18 * open + 0.12 * ease(t, T.walkOut0, T.wash1, easeInOut) + 0.2 * wash;
  // the ambiguous disc dissolves on "that door"; the hardware springs in on "a proper handle"
  const dissolve = easeIn(seg(t, T.dissolve, T.dissolve + 0.5));
  const spring = (i: number, delay = 0) => pop(frame, fps, T.assemble + delay, { damping: 12 + i, stiffness: 190, mass: 0.8 });
  const kn = [0, 1, 2].map((i) => (t >= T.assemble + i * 0.1 ? spring(i, i * 0.1) : 0));
  const so = [0, 1].map((i) => (t >= T.assemble + 0.34 + i * 0.08 ? spring(i, 0.34 + i * 0.08) : 0));
  const kb = t >= T.assemble + 0.5 ? spring(1, 0.5) : 0;
  const kc = [0, 1].map((i) => (t >= T.assemble + 0.72 + i * 0.07 ? spring(2, 0.72 + i * 0.07) : 0));
  const hand = handAt(t);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  return (
    <group>
      {/* lights: warm key (the one shadow light), cool fill, rim — scaled by the scene light level */}
      <ambientLight intensity={0.09 * Lv} />
      <directionalLight position={[2.2, 4.2, 3.2]} intensity={1.9 * Lv} color="#ffe9d2" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} shadow-normalBias={0.09} shadow-camera-left={-2.6} shadow-camera-right={2.6} shadow-camera-top={3} shadow-camera-bottom={-2.2} shadow-camera-near={0.5} shadow-camera-far={20} />
      <directionalLight position={[-3, 2.2, 3]} intensity={0.7 * (0.4 + 0.6 * Lv)} color="#d7e6ff" />
      {/* a warm pool of light on the door and the wall around it (replaces the rim light, which a solid wall would hide) */}
      <spotLight position={[1.1, 3.9, 2.6]} target={spotTarget} angle={0.5} penumbra={0.75} intensity={9 * Lv} color="#ffe2c4" distance={12} decay={1.4} />
      <primitive object={spotTarget} position={[-0.05, 1.0, 0]} />
      {/* back-room light (extra light 1) */}
      <pointLight position={[0.3, 3.1, -2.6]} intensity={backI * 0.85} color="#ffe6c8" distance={10} decay={1.6} />
      {/* the ivory wall with a real opening, graphite jambs + head, dark polished floor */}
      <mesh geometry={wallGeo} position={[0, 0, -0.16]} castShadow receiveShadow><meshStandardMaterial color="#E3DCCD" roughness={0.95} /></mesh>
      {[-1, 1].map((sx) => (<mesh key={sx} position={[sx * (DW / 2 + 0.025), (DH + 0.06) / 2 - 0.005, -0.06]} castShadow receiveShadow><boxGeometry args={[0.06, DH + 0.06, 0.2]} /><meshStandardMaterial color="#1a1f28" roughness={0.5} /></mesh>))}
      <mesh position={[0, DH + 0.025, -0.06]} castShadow receiveShadow><boxGeometry args={[DW + 0.1, 0.06, 0.2]} /><meshStandardMaterial color="#1a1f28" roughness={0.5} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 7]} receiveShadow><planeGeometry args={[30, 14]} /><meshStandardMaterial color="#1a1f28" roughness={0.3} metalness={0.25} /></mesh>
      {/* the room behind: a softly lit ivory space (emissive rises for the walk-through) */}
      <mesh position={[0, 2.6, -6.2]}><planeGeometry args={[20, 7]} /><meshStandardMaterial color="#F6F2E8" roughness={1} emissive="#F6F2E8" emissiveIntensity={backEm} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -3.2]}><planeGeometry args={[20, 6.1]} /><meshStandardMaterial color="#F6F2E8" roughness={0.9} emissive="#F6F2E8" emissiveIntensity={backEm * 0.72} /></mesh>
      {[-1, 1].map((sx) => (<mesh key={sx} rotation={[0, -sx * Math.PI / 2, 0]} position={[sx * 2.9, 2.6, -3.2]}><planeGeometry args={[6.1, 7]} /><meshStandardMaterial color="#F6F2E8" roughness={1} emissive="#F6F2E8" emissiveIntensity={backEm * 0.85} /></mesh>))}
      {/* the door: hinge group on the left, flush walnut slab */}
      <group position={[HINGE_X, 0, 0]} rotation={[0, angle, 0]}>
        <RoundedBox args={[DW - 0.008, DH - 0.01, 0.045]} radius={0.004} smoothness={2} position={[(DW - 0.008) / 2, (DH - 0.01) / 2 + 0.005, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#5c3d26" roughness={0.58} />
        </RoundedBox>
        {/* the ambiguous brushed-steel disc (both faces) */}
        {dissolve < 1 ? [0.0255, -0.0255].map((z) => (
          <mesh key={z} position={[DISC_LOCAL.x, DISC_LOCAL.y, z]} rotation={[Math.PI / 2, 0, 0]} scale={[1 - dissolve, 1, 1 - dissolve]} castShadow>
            <cylinderGeometry args={[0.052, 0.052, 0.006, 48]} /><meshStandardMaterial color="#9EA3AB" roughness={0.42} metalness={0.7} transparent={dissolve > 0} opacity={1 - dissolve} />
          </mesh>)) : null}
        {/* NEW: three visible hinge knuckles with leaf plates (spring in from the hinge axis) */}
        {[0.32, 1.04, 1.76].map((y, i) => kn[i] > 0 ? (
          <group key={y} position={[0, y, 0.0225 + 0.013 + 0.28 * (1 - kn[i])]} scale={[kn[i], kn[i], kn[i]]}>
            <mesh castShadow><cylinderGeometry args={[0.013, 0.013, 0.13, 20]} /><meshStandardMaterial {...STEEL} /></mesh>
            {[-0.045, 0.045].map((yy) => (<mesh key={yy} position={[0, yy, 0]}><cylinderGeometry args={[0.0145, 0.0145, 0.004, 20]} /><meshStandardMaterial {...STEEL_DK} /></mesh>))}
            <mesh position={[0.028, 0, -0.011]}><boxGeometry args={[0.034, 0.13, 0.003]} /><meshStandardMaterial {...STEEL_DK} /></mesh>
          </group>) : null)}
        {/* NEW: the horizontal brushed-steel pull bar on two standoffs (standoffs grow out of the slab, the bar flies in from the right) */}
        {[BAR_X0 + 0.03, BAR_X1 - 0.03].map((x, i) => so[i] > 0 ? (
          <mesh key={x} position={[x, BAR_Y, 0.0225 + (STANDOFF * so[i]) / 2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, so[i], 1]} castShadow><cylinderGeometry args={[0.012, 0.012, STANDOFF, 20]} /><meshStandardMaterial {...STEEL} /></mesh>) : null)}
        {kb > 0 ? (
          <mesh position={[(BAR_X0 + BAR_X1) / 2 + 0.7 * (1 - kb), BAR_Y, BAR_Z + 0.25 * (1 - kb)]} rotation={[0, 0, Math.PI / 2]} scale={[1, kb, 1]} castShadow><cylinderGeometry args={[0.016, 0.016, BAR_X1 - BAR_X0, 28]} /><meshStandardMaterial {...STEEL} /></mesh>) : null}
        {[BAR_X0, BAR_X1].map((x, i) => kc[i] > 0 ? (<mesh key={x} position={[x, BAR_Y, BAR_Z]} scale={[kc[i], kc[i], kc[i]]} castShadow><sphereGeometry args={[0.016, 18, 18]} /><meshStandardMaterial {...STEEL} /></mesh>) : null)}
      </group>
      {hand ? <Hand h={hand} /> : null}
    </group>
  );
};

export const Beat: React.FC = () => {
  const t = useT();
  const pose = poseAt(t);
  const pt = pointAt(t);
  const wash = ease(t, T.wash0 - 0.2, T.wash1 - 0.6, easeInOut);
  const dotA = clamp((wash - 0.08) / 0.4);
  const pulse = 1 + 0.06 * Math.sin(t * 2 * Math.PI * 1.4);
  const freezePulse = fadeIO(t, T.freeze, T.freeze + 1.0, 0.06, 0.9);
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      <Stage3D background="#0D1016" bloom={0.7} threshold={0.78}>
        <Cam p={pose} />
        <Room t={t} />
        {pt ? <GlowPoint position={[pt.pos.x, pt.pos.y, pt.pos.z]} radius={pt.radius} intensity={pt.intensity} color={pt.color} /> : null}
      </Stage3D>
      {/* the freeze: a soft darkening pulse marks the stop */}
      <Dip alpha={0.18 * freezePulse} color={PALETTE.graphite} />
      {/* 'YOU WEREN'T.' / 'THE DESIGN WAS.' punch in on their words, held until the redesign */}
      <AbsoluteFill style={{ filter: 'drop-shadow(0 10px 36px rgba(0,0,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
        <Punch text="YOU WEREN'T." tStart={T.punch1} tEnd={T.redesign} y={300} size={108} color={PALETTE.ivory} />
        <Punch text="THE DESIGN WAS." tStart={T.punch2} tEnd={T.redesign} y={430} size={108} color={PALETTE.amber} />
      </AbsoluteFill>
      {/* the walk into the light: ivory wash; the amber point hands off from the centre */}
      <Dip alpha={0.94 * wash} color={PALETTE.ivory} />
      {(() => { const a = fadeIO(t, T.tag, END - 0.7, 0.5, 0.4); return a > 0 ? (
        <div style={{ position: 'absolute', left: 72, right: 72, top: 1110 + (1 - easeOut(clamp((t - T.tag) / 0.5))) * 12, textAlign: 'center', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: 24, letterSpacing: 5.5, color: PALETTE.gray2, opacity: a }}>DESIGN SO CLEAR YOU NEVER NOTICE IT</div>) : null; })()}
      {dotA > 0 ? (() => { const r = 25 * pulse, g = r * 9; return (
        <div style={{ position: 'absolute', left: 540 - g, top: 960 - g, width: g * 2, height: g * 2, borderRadius: '50%', opacity: dotA, pointerEvents: 'none', background: `radial-gradient(circle, #ffe3c8 0 ${r * 0.12}px, ${PALETTE.amber} ${r * 0.24}px ${r}px, rgba(255,171,91,0.5) ${r * 1.3}px, rgba(255,171,91,0.14) ${r * 2.8}px, rgba(255,171,91,0) ${g}px)` }} />); })() : null}
    </AbsoluteFill>
  );
};
