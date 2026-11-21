import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { A, FT } from '../../src/data/geometry';
import { DESKS, GLASS, WALLS, WINDOWS, DESK_COUNT } from '../../src/data/plan';
import { buildStudio } from '../../src/scenes/studio';
import { hitTest } from '../../src/systems/collision2d';
import { buildNavGrid, findPath, lineFree } from '../../src/systems/navgrid';
import { doorsOpenAt, tourStops, TOUR_LAYOUTS } from '../../src/systems/tourStops';
import type { LayoutId } from '../../src/config';

const TOL = 0.02; // metres (19.1)
const studio = buildStudio({ merge: false });
studio.root.updateMatrixWorld(true);

function tagged(kind: string): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  studio.root.traverse((n) => {
    if ((n.userData.plan as { kind?: string } | undefined)?.kind === kind) out.push(n);
  });
  return out;
}
const bbox = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
/** Perpendicular coordinate (world metres) of an axis-aligned plan line. */
const lineCoord = (a: readonly number[], b: readonly number[]) => (a[0] === b[0] ? { axis: 'x' as const, v: a[0] * FT } : { axis: 'z' as const, v: -a[1] * FT });

describe('geometry read back from the scene graph (19.1)', () => {
  it('every wall has a face on its specified line', () => {
    const meshes = tagged('wall');
    expect(meshes.length).toBeGreaterThanOrEqual(WALLS.length);
    for (const w of WALLS) {
      const mine = meshes.filter((m) => (m.userData.plan as { id: string }).id === w.id);
      expect(mine.length, w.id).toBeGreaterThan(0);
      const { axis, v } = lineCoord(w.a, w.b);
      for (const m of mine) {
        const b = bbox(m);
        const d = Math.min(Math.abs(b.min[axis] - v), Math.abs(b.max[axis] - v));
        expect(d, `${w.id} face`).toBeLessThan(TOL);
      }
    }
  });
  it('every pillar matches its rectangle and runs floor to ceiling', () => {
    for (const p of A.pillars) {
      const m = tagged('pillar').find((q) => (q.userData.plan as { id: string }).id === p.id)!;
      const b = bbox(m);
      expect(Math.abs(b.min.x - p.x0 * FT)).toBeLessThan(TOL);
      expect(Math.abs(b.max.x - p.x1 * FT)).toBeLessThan(TOL);
      expect(Math.abs(b.max.z - -p.y0 * FT)).toBeLessThan(TOL);
      expect(Math.abs(b.min.z - -p.y1 * FT)).toBeLessThan(TOL);
      expect(Math.abs(b.max.y - A.ceilingHeightFt * FT)).toBeLessThan(TOL);
    }
  });
  it('every glass line and window sits on its line', () => {
    const glass = tagged('glass');
    for (const g of GLASS) {
      const m = glass.find((q) => (q.userData.plan as { id: string }).id === g.id);
      expect(m, g.id).toBeTruthy();
      const { axis, v } = lineCoord(g.a, g.b);
      const b = bbox(m!);
      expect(Math.abs((b.min[axis] + b.max[axis]) / 2 - v), g.id).toBeLessThan(TOL);
      const other = axis === 'x' ? 'z' : 'x';
      const lo = axis === 'x' ? -Math.max(g.a[1], g.b[1]) * FT : Math.min(g.a[0], g.b[0]) * FT;
      const hi = axis === 'x' ? -Math.min(g.a[1], g.b[1]) * FT : Math.max(g.a[0], g.b[0]) * FT;
      expect(Math.abs(b.min[other] - lo), `${g.id} start`).toBeLessThan(TOL);
      expect(Math.abs(b.max[other] - hi), `${g.id} end`).toBeLessThan(TOL);
    }
    const wins = tagged('window');
    for (const w of WINDOWS) {
      const m = wins.find((q) => (q.userData.plan as { id: string }).id === w.id)!;
      const { axis, v } = lineCoord(w.a, w.b);
      const b = bbox(m);
      // Window glass sits in the middle of the facade wall, outside the interior line.
      expect(Math.abs((b.min[axis] + b.max[axis]) / 2 - v)).toBeLessThan(0.33 * FT + TOL);
      expect(Math.abs(b.min.y - w.sill * FT)).toBeLessThan(TOL);
      expect(Math.abs(b.max.y - w.head * FT)).toBeLessThan(TOL);
    }
  });
  it('every desk instance is at its plan position and the right size', () => {
    const desks = tagged('desks')[0] as THREE.Group;
    const inst = desks.children[0] as THREE.InstancedMesh;
    expect(inst.userData.total).toBe(DESKS.length);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    // Combined bounds of the prototype's parts.
    const proto = new THREE.Box3();
    for (const c of desks.children) {
      const g = (c as THREE.InstancedMesh).geometry;
      g.computeBoundingBox();
      proto.union(g.boundingBox!);
    }
    DESKS.forEach((d, i) => {
      inst.getMatrixAt(i, m);
      m.decompose(p, q, s);
      expect(Math.abs(p.x - (d.x + d.w / 2) * FT), `desk ${i} x`).toBeLessThan(TOL);
      expect(Math.abs(p.z + (d.y + d.d / 2) * FT), `desk ${i} y`).toBeLessThan(TOL);
      const world = proto.clone().applyMatrix4(m);
      expect(Math.abs(world.max.x - world.min.x - d.w * FT), `desk ${i} w`).toBeLessThan(TOL);
      expect(Math.abs(world.max.z - world.min.z - d.d * FT), `desk ${i} d`).toBeLessThan(TOL);
    });
  });
  it('layout switches change instance counts and part visibility without rebuilding', () => {
    const before = studio.root.children.length;
    for (const l of ['today', 'recommended', 'keep9', 'rejected'] as LayoutId[]) {
      studio.apply(l, 'walk');
      const inst = (tagged('desks')[0] as THREE.Group).children[0] as THREE.InstancedMesh;
      expect(inst.count).toBe(DESK_COUNT[l]);
    }
    expect(studio.root.children.length).toBe(before);
    studio.apply('today', 'walk');
    expect(studio.parts.find((p) => p.name.startsWith('glass:recommended+keep9'))!.group.visible).toBe(false);
    studio.apply('recommended', 'model');
    expect(studio.parts.find((p) => p.name === 'ceilings')!.group.visible).toBe(false);
    expect(studio.parts.find((p) => p.name === 'context')!.group.visible).toBe(true);
  });
});

describe('reachability (19.3)', () => {
  for (const layout of TOUR_LAYOUTS) {
    it(`${layout}: every tour stop is reachable from the lift car with doors opened in sequence, and no segment hits a collider`, () => {
      const stops = tourStops(layout);
      expect(stops.length).toBe(22);
      let prev = stops[0].cam;
      for (const s of stops) {
        const g = buildNavGridCached(layout, doorsOpenAt(s.n));
        expect(hitTest(g.world, s.cam[0], s.cam[1]), `stop ${s.n} ${s.name} stands inside ${hitTest(g.world, s.cam[0], s.cam[1])}`).toBeNull();
        const path = findPath(g, prev, s.cam);
        expect(path, `stop ${s.n} ${s.name} unreachable`).not.toBeNull();
        for (let i = 1; i < path!.length; i++) expect(lineFree(g, path![i - 1], path![i]), `stop ${s.n} segment ${i}`).toBe(true);
        prev = s.cam;
      }
    });
  }
  it('today and rejected: the whole public floor is walkable from the entry', () => {
    for (const layout of ['today', 'rejected'] as LayoutId[]) {
      const g = buildNavGridCached(layout, ['lift-PL07', 'entry']);
      expect(findPath(g, [-66, -25], [17.5, 9]), layout).not.toBeNull();
      expect(findPath(g, [17.5, 9], [74, 14.5]), layout).not.toBeNull();
    }
  });
});

const cache = new Map<string, ReturnType<typeof buildNavGrid>>();
function buildNavGridCached(layout: LayoutId, doors: string[]) {
  const k = `${layout}|${doors.join()}`;
  if (!cache.has(k)) cache.set(k, buildNavGrid(layout, new Set(doors)));
  return cache.get(k)!;
}
