/**
 * Every desk on the floor as instanced meshes. The desk list is ordered so each layout shows a prefix of it
 * (90, 99 or 112), which lets one set of instanced meshes serve all four layouts by changing `count`.
 */
import * as THREE from 'three';
import type { LayoutId } from '../config';
import { box, group, instancePrototype, matrixFt, tag } from '../core/build';
import { M } from '../core/materials';
import { FT } from '../data/geometry';
import { chairPos, DESKS, type Desk, type Side } from '../data/plan';

export interface PrefixGroup {
  group: THREE.Group;
  /** Instances to draw given how many desks the layout shows. */
  countFor(deskCount: number, layout: LayoutId): number;
}
export interface Workfloor {
  group: THREE.Group;
  prefixGroups: PrefixGroup[];
}

export const DESK_TOP_M = 0.74;
export const sideDeg: Record<Side, number> = { E: 0, N: 90, W: 180, S: 270 };
export const deskCentre = (d: Desk): [number, number] => [d.x + d.w / 2, d.y + d.d / 2];

/** Blockout prototypes (Phase 1): a slab on four legs and a chair-sized block. */
function blockDesk(): THREE.Group {
  const g = group('desk');
  g.add(box(M.white, 4 * FT, 0.03, 2 * FT, 0, DESK_TOP_M - 0.015, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(M.white, 0.04, DESK_TOP_M - 0.03, 0.04, sx * (2 * FT - 0.05), (DESK_TOP_M - 0.03) / 2, sz * (FT - 0.05)));
  return g;
}
function blockChair(): THREE.Group {
  const g = group('chair');
  g.add(box(M.charcoal, 0.48, 0.08, 0.46, 0, 0.44, 0));
  g.add(box(M.charcoal, 0.46, 0.5, 0.06, 0, 0.72, -0.22));
  g.add(box(M.aluminiumMatte, 0.06, 0.4, 0.06, 0, 0.2, 0));
  return g;
}

export interface WorkfloorProtos {
  desk: THREE.Object3D;
  chair: THREE.Object3D;
  extras?: (add: (name: string, proto: THREE.Object3D, items: { desk: number; m: THREE.Matrix4; layouts?: LayoutId[] }[]) => void) => void;
}

export function buildWorkfloorFrom(p: WorkfloorProtos): Workfloor {
  const g = group('workfloor');
  const prefixGroups: PrefixGroup[] = [];
  const deskM = DESKS.map((d) => matrixFt(...deskCentre(d), sideDeg[d.side]));
  const chairM = DESKS.map((d) => {
    const c = chairPos(d);
    return matrixFt(c.x, c.y, c.yawDeg);
  });
  const desks = instancePrototype(p.desk, deskM, { name: 'desks' });
  tag(desks, 'desks', 'all', { matrices: deskM });
  const chairs = instancePrototype(p.chair, chairM, { name: 'chairs' });
  g.add(desks, chairs);
  prefixGroups.push({ group: desks, countFor: (n) => n }, { group: chairs, countFor: (n) => n });
  p.extras?.((name, proto, items) => {
    // Items must be sorted by desk index so a desk-count prefix is an item prefix.
    const sorted = [...items].sort((a, b) => a.desk - b.desk);
    const inst = instancePrototype(proto, sorted.map((i) => i.m), { name });
    g.add(inst);
    prefixGroups.push({
      group: inst,
      countFor: (n, layout) => {
        let c = 0;
        for (const it of sorted) {
          if (it.desk >= n || (it.layouts && !it.layouts.includes(layout))) break;
          c++;
        }
        return c;
      },
    });
  });
  return { group: g, prefixGroups };
}

export function buildWorkfloor(blockout: boolean): Workfloor {
  if (blockout) return buildWorkfloorFrom({ desk: blockDesk(), chair: blockChair() });
  return buildWorkfloorFrom(detailedProtos());
}

/** Replaced in Phase 3 by the detailed furniture set (see zones/workfloorDetail.ts). */
let detailedProtos: () => WorkfloorProtos = () => ({ desk: blockDesk(), chair: blockChair() });
export function setDetailedProtos(f: () => WorkfloorProtos): void {
  detailedProtos = f;
}
