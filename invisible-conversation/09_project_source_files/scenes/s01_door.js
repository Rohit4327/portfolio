// SCENE 01 — THE DESIGN PROBLEM. The confusing door, the freeze, the amber point, the corridor and the title.
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, easeIn, fadeIO, lerp, clamp, noise1, deg } from '../lib/util.js';
import { text, caps, bloom, dip, titleCard, amberDot } from '../lib/gfx.js';
import { mat, roundedBox, box, cylinder, plane, floor, AmberPoint, rig, makeCorridor, makeHand } from '../lib/props.js';

const CH = 1;
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Q = new THREE.Quaternion();

export default {
  id: 's01', title: 'The Design Problem',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null, vignette: 0.55, grain: 0.035, cues: {},

  async init(stage) {
    const g = (this.group = new THREE.Group());
    // ---- timing beats from the narration ----
    const s = (n, d) => T.sent(CH, n, d).start;
    const B = (this.B = {
      reveal: 0.0,
      walk0: 0.6, walk1: 4.4,
      push1: Math.max(4.8, s('so you push', 4.6) + 0.9), // hand reaches the door shortly after "so you push"
      push2: s('Nothing', 8.9) - 0.2,
      pull: s('You pull', 10.9) + 0.2,
      open: s('It opens', 12.7) - 0.3,
      freeze: s('You feel foolish', 15.3) - 0.3,
      pointAppear: s('You feel foolish', 15.3) + 0.9,
      corridor: s('That tiny moment', 21.5) - 0.9,
      title: s('That tiny moment', 21.5) + 0.2,
      end: this.end,
    });
    B.orbitEnd = B.corridor; // orbit lasts from freeze to corridor dip
    this.cues = {
      footstep_1: B.walk0 + 0.2, footstep_2: B.walk0 + 1.1, footstep_3: B.walk0 + 2.0, footstep_4: B.walk0 + 2.9,
      door_push_thud_1: B.push1 + 0.35, door_push_thud_2: B.push2 + 0.35,
      door_latch_click: B.pull + 0.25, door_pull_open_start: B.pull + 0.3, door_pull_open_end: B.open + 1.2,
      freeze: B.freeze, point_appear: B.pointAppear, corridor_whoosh: B.corridor + 0.3, title_in: B.title, transition_point: this.end - 0.7,
    };

    // ---- the room: ivory wall with a real opening, graphite frame, dark polished floor ----
    const room = (this.room = new THREE.Group()); g.add(room);
    rig(room, { key: [2.2, 4.2, 3.2], keyI: 2.4, keyColor: 0xffe9d2, fill: [-3, 2.2, 3], fillI: 0.45, fillColor: 0xd7e6ff, rim: [0, 3, -4], rimI: 0.6, ambient: 0.12 });
    const wallMat = mat.ivoryWall();
    const dw = 0.92, dh = 2.08, wallH = 5.2, wallW = 18;
    // one seamless wall with a real door opening (extruded shape with a hole)
    const shape = new THREE.Shape(); shape.moveTo(-wallW / 2, 0); shape.lineTo(wallW / 2, 0); shape.lineTo(wallW / 2, wallH); shape.lineTo(-wallW / 2, wallH); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(-dw / 2, 0); hole.lineTo(dw / 2, 0); hole.lineTo(dw / 2, dh); hole.lineTo(-dw / 2, dh); hole.closePath(); shape.holes.push(hole);
    const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false }), wallMat); wall.position.z = -0.16; wall.receiveShadow = true; wall.castShadow = true; room.add(wall);
    const frameMat = mat.graphite({ roughness: 0.5 });
    for (const sx of [-1, 1]) { const j = box(0.06, dh + 0.06, 0.2, frameMat); j.position.set(sx * (dw / 2 + 0.03), (dh + 0.06) / 2, -0.06); room.add(j); }
    const head = box(dw + 0.12, 0.06, 0.2, frameMat); head.position.set(0, dh + 0.03, -0.06); room.add(head);
    const fl = floor(30, mat.graphite({ roughness: 0.3, metalness: 0.25 })); room.add(fl);
    // the room behind the door: a softly lit ivory space
    const back = plane(18, 6, mat.ivory({ roughness: 1 })); back.position.set(0, 2.4, -3.2); room.add(back);
    const backFloor = floor(18, mat.ivory({ roughness: 0.9 })); backFloor.position.set(0, 0.002, 2.6); room.add(backFloor);
    this.backLight = new THREE.PointLight(0xfff0dc, 0, 9, 1.6); this.backLight.position.set(0.3, 2.2, -1.6); room.add(this.backLight);
    this.backGlow = new THREE.SpotLight(0xfff3e4, 0, 12, deg(40), 0.6, 1.2); this.backGlow.position.set(0, 2.6, -2.4); this.backGlow.target.position.set(0, 1, 1.5); room.add(this.backGlow, this.backGlow.target);

    // ---- the door: flush warm walnut slab, hinge on the left, one ambiguous brushed-steel disc ----
    const hinge = (this.hinge = new THREE.Group()); hinge.position.set(-dw / 2, 0, 0); room.add(hinge);
    const slab = roundedBox(dw - 0.008, dh - 0.01, 0.045, 0.004, mat.std(0x6b4a30, { roughness: 0.55 })); slab.position.set((dw - 0.008) / 2, (dh - 0.01) / 2 + 0.005, 0); hinge.add(slab);
    // subtle horizontal grain lines (very faint) for a crafted look
    const disc = cylinder(0.052, 0.052, 0.006, mat.brushed(), 48); disc.rotation.x = Math.PI / 2; disc.position.set(dw - 0.2, 1.04, 0.0255); hinge.add(disc); this.disc = disc;
    const discBack = disc.clone(); discBack.position.z = -0.0255; hinge.add(discBack);

    // ---- first-person hand ----
    this.hand = makeHand(); this.hand.pose(0.25); room.add(this.hand);

    // ---- the amber point ----
    this.point = new AmberPoint(0.028, { lightIntensity: 2.5, lightDistance: 5 }); this.point.setIntensity(0); g.add(this.point.group);

    // ---- the corridor (shown after the dip) ----
    const cor = makeCorridor({ length: 90, spacing: 2.4, width: 3.4, height: 2.3, amber: 0.75 });
    this.corridor = cor.group; this.corridor.visible = false; this.corridor.position.set(0, 1.15, 10); g.add(this.corridor);
    this.corLight = new THREE.PointLight(0xFFAB5B, 0, 7, 1.5); this.corridor.add(this.corLight);
    this.corAmbient = new THREE.AmbientLight(0xffffff, 0.08); this.corridor.add(this.corAmbient);
  },

  // first-person camera pose (position, look target) as a pure function of t
  fpPose(t) {
    const B = this.B;
    const k = easeInOut(seg(t, B.walk0, B.walk1));
    const z = lerp(5.2, 1.75, k), x = lerp(0.3, 0.12, k);
    // gentle gait: tiny vertical bob + sway while walking, fading out as we arrive
    const walking = fadeIO(t, B.walk0 - 0.2, B.walk1 + 0.4, 0.4, 0.6);
    const bob = Math.sin((t - B.walk0) * Math.PI * 2 * 0.95) * 0.012 * walking;
    const sway = Math.sin((t - B.walk0) * Math.PI * 0.95) * 0.01 * walking;
    const y = 1.62 + bob + (noise1(t * 0.4) - 0.5) * 0.01;
    // after arriving, lean in slightly during the pushes/pull
    const lean = 0.12 * (fadeIO(t, B.push1 - 0.3, B.push1 + 0.9, 0.4, 0.5) + fadeIO(t, B.push2 - 0.3, B.push2 + 0.9, 0.4, 0.5)) - 0.14 * fadeIO(t, B.pull - 0.2, B.open + 1.2, 0.5, 0.8);
    const pos = new THREE.Vector3(x + sway, y, z - lean);
    const look = new THREE.Vector3(0.08, 1.12 + (noise1(t * 0.3 + 7) - 0.5) * 0.02, 0);
    return { pos, look };
  },

  doorAngle(t) {
    const B = this.B;
    // push attempts: the slab barely moves (rattles) then settles
    const rattle = (t0) => { const k = seg(t, t0 + 0.3, t0 + 1.1); return k > 0 && k < 1 ? -deg(0.6) * Math.sin(k * Math.PI) * Math.exp(-k * 3) : 0; };
    let a = rattle(B.push1) + rattle(B.push2);
    // pull: opens toward the camera (negative rotation about y around the left hinge)
    const open = easeOut(seg(t, B.pull + 0.3, B.open + 1.2));
    a += -deg(62) * open;
    if (t >= B.freeze) { const openF = easeOut(seg(B.freeze, B.pull + 0.3, B.open + 1.2)); a = -deg(62) * openF; }
    return a;
  },

  update(t, stage) {
    const B = this.B, cam = stage.camera;
    cam.fov = t < this.B.corridor ? 50 : 42; cam.updateProjectionMatrix();
    stage.setBackground(PALETTE.graphite);
    const inCorridor = t >= B.corridor;
    this.room.visible = !inCorridor; this.corridor.visible = inCorridor;
    // the freeze: all physical motion evaluates at the freeze instant
    const tp = Math.min(t, B.freeze);

    if (!inCorridor) {
      this.hinge.rotation.y = this.doorAngle(tp);
      // light spilling from the room behind as the door opens
      const open = clamp(-this.hinge.rotation.y / deg(62));
      this.backLight.intensity = 3.5 * open; this.backGlow.intensity = 6 * open;
      // reveal: light rises over the first 1.6 s
      const rev = ease(t, B.reveal, B.reveal + 1.8, easeOut);
      stage.setExposure(lerp(0.0, 1.0, rev) * (inCorridor ? 1 : 1));

      // camera: first person until the freeze, then a slow orbit around the half-open door
      const fp = this.fpPose(tp);
      if (t < B.freeze) { cam.position.copy(fp.pos); cam.lookAt(fp.look); }
      else {
        const k = easeInOut(seg(t, B.freeze, B.orbitEnd));
        const center = new THREE.Vector3(0.0, 1.1, 0.45);
        const a0 = Math.atan2(fp.pos.x - center.x, fp.pos.z - center.z);
        const ang = a0 + k * deg(72); const r = lerp(Math.hypot(fp.pos.x - center.x, fp.pos.z - center.z), 3.0, easeOut(k));
        cam.position.set(center.x + Math.sin(ang) * r, lerp(fp.pos.y, 1.5, k), center.z + Math.cos(ang) * r);
        cam.lookAt(center.x + 0.1, lerp(fp.look.y, 1.1, k), center.z - 0.2);
      }
      // hand: parented to the camera frame, reaches toward the disc for the pushes, grips the edge for the pull
      const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(); const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      const reach1 = fadeIO(tp, B.push1 - 0.6, B.push1 + 1.3, 0.6, 0.5), reach2 = fadeIO(tp, B.push2 - 0.6, B.push2 + 1.3, 0.6, 0.5), reach3 = fadeIO(tp, B.pull - 0.7, B.open + 1.6, 0.7, 0.9);
      const reach = Math.max(reach1, reach2, reach3);
      const visible = tp > B.walk1 - 0.5 && tp < B.open + 2.2 && t < B.corridor;
      this.hand.visible = visible;
      if (visible) {
        const base = cam.position.clone().addScaledVector(fwd, 0.55).addScaledVector(right, 0.26).addScaledVector(up, -0.34);
        const discWorld = this.disc.getWorldPosition(new THREE.Vector3());
        const edgeWorld = new THREE.Vector3(0.9, 1.02, 0.03).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.hinge.rotation.y).add(this.hinge.position);
        const pulling = reach3 > Math.max(reach1, reach2);
        const target = (pulling ? edgeWorld.clone().addScaledVector(right, 0.07) : discWorld).clone().addScaledVector(fwd, pulling ? -0.02 : -0.045).addScaledVector(up, pulling ? 0.0 : -0.06);
        const p = base.lerp(target, easeInOut(reach) * 0.96);
        // pull: the slab moves toward us, so the gripping hand follows the edge
        this.hand.position.copy(p);
        this.hand.quaternion.copy(cam.quaternion);
        if (pulling) { this.hand.rotateZ(deg(84)); this.hand.rotateX(deg(-10)); this.hand.pose(0.9); }
        else { this.hand.rotateX(deg(-28)); this.hand.rotateZ(deg(-12)); this.hand.pose(0.15 + 0.12 * reach); }
      }
      // amber point emerges from the disc after the freeze
      const pa = ease(t, B.pointAppear, B.pointAppear + 1.4, easeOut);
      const discWorld = this.disc.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 0.02));
      const lift = ease(t, B.corridor - 1.6, B.corridor, easeIn);
      this.point.group.position.copy(discWorld).add(new THREE.Vector3(-0.15 * lift, 0.95 * lift, 0.55 * lift));
      this.point.setIntensity(pa * (1 + 0.6 * lift)).setScale(1 + 0.4 * pa + 1.2 * lift).pulse(t, 0.07, 1.4);
      this.point.group.visible = pa > 0;
    } else {
      // the corridor: camera glides forward, the point leads a few metres ahead
      stage.setExposure(1.0);
      stage.setFog(PALETTE.graphite, 6, 42);
      const k = t - B.corridor; const speed = 2.1;
      const zCam = 10 - 1.5 - k * speed;
      cam.position.set(Math.sin(k * 0.35) * 0.05, 0.02 + 1.15 - 1.15 + 0.0, zCam);
      cam.position.y = 0.02 + 1.15 - 1.15; // eye at corridor centre line (corridor group is at y=1.15 → world 1.15); camera in corridor-local terms
      cam.position.y = 1.15 + 0.12;
      const zPt = zCam - 3.2 - Math.min(2.5, k * 0.5);
      const px = Math.sin(k * 1.3) * 0.12, py = 1.15 + Math.sin(k * 0.9 + 1) * 0.08;
      this.point.group.position.set(px, py, zPt);
      // in the last 1.4 s the point rushes toward the camera (motivates the bloom)
      const rush = easeIn(seg(t, this.end - 1.4, this.end - 0.15));
      this.point.group.position.lerp(new THREE.Vector3(0, 1.15 + 0.02, zCam - 0.6), rush);
      this.point.setIntensity(1.1 + rush).setScale(1.9 + rush * 2.5).pulse(t, 0.06, 1.2);
      this.point.group.visible = true;
      this.corLight.position.copy(this.point.group.position).sub(this.corridor.position); this.corLight.intensity = 4;
      cam.lookAt(px * 0.5, 1.15 + 0.55, zCam - 6);
    }
  },

  draw2d(ctx, t) {
    const B = this.B;
    // the opening reveal: from black
    dip(ctx, 1 - ease(t, B.reveal, B.reveal + 1.4, easeOut), '#000');
    // the freeze: a brief, soft darkening pulse marks the stop
    const fz = fadeIO(t, B.freeze, B.freeze + 1.1, 0.08, 0.9); dip(ctx, 0.22 * fz, PALETTE.graphite);
    // dip to graphite into the corridor (the point stays visible via the glow we draw on top)
    const d = fadeIO(t, B.corridor - 0.6, B.corridor + 0.9, 0.6, 0.9); dip(ctx, d, PALETTE.graphite);
    if (d > 0.2) amberDot(ctx, W / 2, H / 2 + 20, 16, d * 0.9, { glow: 8 });
    // title card
    const ta = fadeIO(t, B.title, this.end - 0.6, 0.9, 0.7);
    if (ta > 0) {
      const rise = (1 - easeOut(seg(t, B.title, B.title + 1.2))) * 18;
      titleCard(ctx, 'THE INVISIBLE CONVERSATION', 'HOW UX & UI CAME TO LIFE', ta, { y: H / 2 - 200 + rise, size: 86, tracking: 3 });
      // thin amber rule under the title
      ctx.save(); ctx.globalAlpha = ta * 0.9; ctx.fillStyle = PALETTE.amber; const w = 120 * easeOut(seg(t, B.title + 0.3, B.title + 1.3)); ctx.fillRect(W / 2 - w / 2, H / 2 - 142 + rise, w, 2); ctx.restore();
    }
    // hand-off bloom
    bloom(ctx, seg(t, this.end - 0.7, this.end));
  },
};
