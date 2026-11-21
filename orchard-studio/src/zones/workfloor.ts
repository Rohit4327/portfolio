/**
 * Every desk on the floor as instanced meshes. The desk list is ordered so each layout shows a prefix of it
 * (90, 99 or 112), which lets one set of instanced meshes serve all four layouts by changing `count`.
 */
import * as THREE from 'three';
import type { LayoutId } from '../config';
import { box, group, instancePrototype, matrixFt, tag } from '../core/build';
import { M } from '../core/materials';
import { FT } from '../data/geometry';
import { chairPos, DESKS, sideVec, type Desk, type Side } from '../data/plan';
import { screenMaterial } from '../core/materials';
import { canvasTexture } from '../core/text';
import { desktopArt } from '../core/art';
import { buildDesk, buildDeskScreen, buildFlexiArm, buildLabRack, buildLaptop, buildMonitor, buildSucculent, buildTaskChair } from '../furniture/workstation';

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

let monitorMat: THREE.MeshStandardMaterial | null = null;
/** One shared screen material for every desk monitor, with a privacy-filter falloff at oblique angles (8.2). */
export function monitorMaterial(): THREE.MeshStandardMaterial {
  if (monitorMat) return monitorMat;
  const m = screenMaterial(canvasTexture(512, 288, desktopArt), 1.3);
  m.name = 'monitorScreen';
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float privacy = smoothstep(0.42, 0.86, abs(dot(normalize(vViewPosition), normalize(vNormal))));
       totalEmissiveRadiance *= mix(0.06, 1.0, privacy);`,
    );
  };
  return (monitorMat = m);
}

const along: Record<Side, [number, number]> = { E: [0, 1], W: [0, -1], N: [-1, 0], S: [1, 0] };
const DESK_H_FT = DESK_TOP_M / FT;

function detailedProtos(): WorkfloorProtos {
  const mat = monitorMaterial();
  const isWork = (d: Desk) => d.set !== 'projectODC';
  return {
    desk: buildDesk(),
    chair: buildTaskChair(),
    extras(add) {
      const at = (d: Desk, back: number, side: number, facing = sideDeg[d.side], h = DESK_H_FT) => {
        const [cx, cy] = deskCentre(d);
        const sv = sideVec[d.side];
        const al = along[d.side];
        return matrixFt(cx - sv[0] * back + al[0] * side, cy - sv[1] * back + al[1] * side, facing, h);
      };
      const all = DESKS.map((d, i) => ({ d, i }));
      add('monitors', buildMonitor(mat), all.map(({ d, i }) => ({ desk: i, m: at(d, 0.45, 0) })));
      add('deskScreens', buildDeskScreen(), all.map(({ d, i }) => ({ desk: i, m: at(d, 0.97, 0, sideDeg[d.side], 0) })));
      add('laptops', buildLaptop(mat), all.filter(({ d }) => isWork(d) && d.index % 3 === 0).map(({ d, i }) => ({ desk: i, m: at(d, -0.25, 1.15, sideDeg[d.side] + 18) })));
      add('succulents', buildSucculent(), all.filter(({ d }) => d.set !== 'strip' && d.side === 'E' && d.index % 4 === 1).map(({ d, i }) => ({ desk: i, m: at(d, 0.7, -1.6) })));
      // Flexi displays at each cluster end, facing the central aisle (y 33 to 38); lab racks on the aisle-end desks.
      const ends = all.filter(({ d }) => isWork(d) && d.w === 2 && (d.y === 29 || d.y === 38));
      add('flexi', buildFlexiArm(mat), ends.filter(({ d }) => d.side === 'E' || d.set === 'nine').map(({ d, i }) => ({ desk: i, m: matrixFt(d.set === 'nine' ? d.x + 1 : d.x === 33 ? 33.5 : d.x, d.y === 29 ? 32.85 : 38.15, d.y === 29 ? 90 : 270, DESK_H_FT) })));
      add('labRacks', buildLabRack(), ends.filter(({ d }) => d.side === 'W' && d.set === 'garage').map(({ d, i }) => ({ desk: i, m: matrixFt(d.x + 0.9, d.y === 29 ? 32.4 : 38.6, 180, DESK_H_FT) })));
    },
  };
}
