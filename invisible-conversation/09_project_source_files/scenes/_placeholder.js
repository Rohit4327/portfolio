// Placeholder scene factory (replaced by real scenes). Keeps the pipeline testable end to end.
import * as THREE from 'three';
import { PALETTE } from '../lib/stage.js';
import { text, caps } from '../lib/gfx.js';
import { AmberPoint, rig, floor, roundedBox, mat } from '../lib/props.js';
import { seg, easeInOut } from '../lib/util.js';
export function placeholder(id, title, start, end) {
  return {
    id, title, start, end, group: null, point: null,
    async init(stage) {
      this.group = new THREE.Group();
      rig(this.group); this.group.add(floor(40));
      const b = roundedBox(1, 1, 1, 0.08, mat.beige()); b.position.y = 0.5; this.group.add(b); this.box = b;
      this.point = new AmberPoint(0.05); this.group.add(this.point.group);
    },
    update(t, stage) {
      const k = seg(t, this.start, this.end);
      this.box.rotation.y = k * Math.PI * 2;
      this.point.set(Math.cos(k * 6.28) * 1.6, 0.9 + Math.sin(k * 12.56) * 0.2, Math.sin(k * 6.28) * 1.6).pulse(t);
      stage.camera.position.set(3.5 * Math.cos(k * 0.6), 2.2, 3.5 * Math.sin(k * 0.6) + 2); stage.camera.lookAt(0, 0.6, 0);
    },
    draw2d(ctx, t) {
      caps(ctx, `${id} — ${title}`, 120, 120);
      text(ctx, `t = ${t.toFixed(2)} s`, 120, 170, { size: 28, color: PALETTE.gray });
    },
  };
}
