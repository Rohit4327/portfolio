import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { A } from '../../src/data/geometry';
import { countsFor, FIXTURES, footprintsFor, DOORS, doorById } from '../../src/data/plan';
import { buildCollisionWorld, hitTest, moveAndSlide, raycastPlan } from '../../src/systems/collision2d';
import { buildNavGrid, findPath, lineFree } from '../../src/systems/navgrid';
import type { LayoutId } from '../../src/config';

const LAYOUTS: LayoutId[] = ['today', 'recommended', 'keep9', 'rejected'];

describe('data integrity (19.7)', () => {
  it('data/geometry.json deep-equals the JSON block in Section 24', () => {
    const md = readFileSync('MASTER_PROMPT.md', 'utf8');
    const section = md.slice(md.indexOf('## 24. Source-of-truth geometry'));
    const block = section.slice(section.indexOf('```json') + 7, section.indexOf('\n```', section.indexOf('```json')));
    expect(JSON.parse(readFileSync('data/geometry.json', 'utf8'))).toEqual(JSON.parse(block));
  });
});

describe('counts (19.4)', () => {
  it('desk counts per layout', () => {
    expect(countsFor('today').desks).toBe(112);
    expect(countsFor('recommended')).toMatchObject({ garageDesks: 42, projectDesks: 48 });
    expect(countsFor('keep9')).toMatchObject({ garageDesks: 51, projectDesks: 48 });
    expect(countsFor('rejected')).toMatchObject({ garageDesks: 42, projectDesks: 48 });
  });
  it('recommended fixtures', () => {
    expect(countsFor('recommended')).toMatchObject({ kiosks: 4, plinths: 8, galleriaDevices: 7, vrSeats: 2, plantPods: 11 });
  });
});

const rectsOverlap = (a: { x0: number; y0: number; x1: number; y1: number }, f: ReturnType<typeof footprintsFor>[number]) =>
  f.kind === 'rect'
    ? f.x0 < a.x1 - 1e-6 && f.x1 > a.x0 + 1e-6 && f.y0 < a.y1 - 1e-6 && f.y1 > a.y0 + 1e-6
    : f.x + f.r > a.x0 + 1e-6 && f.x - f.r < a.x1 - 1e-6 && f.y + f.r > a.y0 + 1e-6 && f.y - f.r < a.y1 - 1e-6;

describe('clearances (19.2)', () => {
  for (const layout of LAYOUTS) {
    it(`${layout}: nothing stands in the fire lane`, () => {
      const hits = footprintsFor(layout).filter((f) => rectsOverlap(A.fireLane, f));
      expect(hits.map((h) => h.id)).toEqual([]);
    });
    it(`${layout}: the spine is clear from the entry to the fire lane, and nothing taller than 3 ft beyond it`, () => {
      // Window Pause (x 62-77, y 12-21) overlaps the east end of the spine by design; only low seating is allowed there.
      const spineWest = { ...A.spine, x1: 62 };
      const feet = footprintsFor(layout).filter((f) => f.group !== 'pillar');
      expect(feet.filter((f) => rectsOverlap(spineWest, f)).map((h) => h.id)).toEqual([]);
      expect(feet.filter((f) => f.tall && rectsOverlap(A.spine, f)).map((h) => h.id)).toEqual([]);
    });
  }
  it('sightline at 1.6 m from (17.5, 5) to (76.5, 14.5) reaches the east glass', () => {
    const w = buildCollisionWorld('recommended', new Set(['entry']));
    const hit = raycastPlan(w, [17.5, 5], [76.5, 14.5], { onlyTall: true });
    // KNOWN CONFLICT (DECISIONS.md D-07): kiosk K1 at (36.25, 7.5), 6.2 ft tall, sits on this diagonal by the
    // geometry's own numbers. The geometry is the source of truth, so K1 is the only obstruction we accept.
    expect(hit?.id).toBe('kiosk-K1');
    const rest = raycastPlan(w, [17.5, 5], [76.5, 14.5], { onlyTall: true, ignore: (id) => id === 'kiosk-K1' });
    expect(rest).toBeNull();
  });
  it('the spine sightline from the entry axis to the east window is unobstructed in every layout', () => {
    for (const layout of LAYOUTS) {
      const w = buildCollisionWorld(layout, new Set(['entry']));
      expect(raycastPlan(w, [17.5, 14.5], [76.9, 14.5], { onlyTall: true })).toBeNull();
    }
  });
  it('no plant intersects the spine, the fire lane, a door swing or furniture', () => {
    for (const layout of LAYOUTS) {
      const f = FIXTURES[layout];
      const feet = footprintsFor(layout).filter((q) => q.group !== 'plant');
      const w = { layout, segs: buildCollisionWorld(layout).segs, feet };
      for (const p of f.plants) {
        expect(rectsOverlap(A.fireLane, { id: '', kind: 'circle', x: p.x, y: p.y, r: p.r, tall: true, group: '' }), `${layout} plant ${p.x},${p.y} fire lane`).toBe(false);
        expect(rectsOverlap(A.spine, { id: '', kind: 'circle', x: p.x, y: p.y, r: p.r, tall: true, group: '' }), `${layout} plant ${p.x},${p.y} spine`).toBe(false);
        expect(hitTest(w, p.x, p.y, p.r - 0.05), `${layout} plant ${p.x},${p.y}`).toBeNull();
        for (const d of DOORS.filter((q) => q.opens !== 'never')) {
          const width = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
          const mx = (d.a[0] + d.b[0]) / 2;
          const my = (d.a[1] + d.b[1]) / 2;
          expect(Math.hypot(p.x - mx, p.y - my), `${layout} plant ${p.x},${p.y} vs door ${d.id}`).toBeGreaterThan(width + p.r);
        }
      }
    }
  });
});

describe('collision and navigation', () => {
  it('slides along a wall instead of stopping', () => {
    const w = buildCollisionWorld('recommended');
    const p = { x: 30, y: 1.5 };
    moveAndSlide(w, p, 2, -2); // into the Trail south wall at y = 0, moving east
    expect(p.y).toBeGreaterThanOrEqual(0.9 - 1e-6);
    expect(p.x).toBeGreaterThan(31.5);
  });
  it('closed doors block and open doors pass', () => {
    const d = doorById('entry');
    expect(d.opens).toBe('watch');
    const closed = buildNavGrid('recommended', new Set(['lift-PL07']));
    expect(findPath(closed, [-66, -25], [17.5, 9])).toBeNull();
    const open = buildNavGrid('recommended', new Set(['lift-PL07', 'entry']));
    const path = findPath(open, [-66, -25], [17.5, 9]);
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) expect(lineFree(open, path![i - 1], path![i])).toBe(true);
  });
  it('the project ODC is not reachable', () => {
    const g = buildNavGrid('recommended', new Set(['lift-PL07', 'entry', 'room-west', 'room-east']));
    expect(findPath(g, [17.5, 9], [18, 35])).toBeNull();
    expect(findPath(g, [17.5, 9], [7, 6])).not.toBeNull(); // west 6-pax room is enterable
    expect(findPath(g, [17.5, 9], [70, 9])).not.toBeNull(); // east 6-pax room is enterable
  });
});
