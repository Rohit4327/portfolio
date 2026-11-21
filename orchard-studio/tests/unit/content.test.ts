import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LayoutId } from '../../src/config';
import { FIXTURES, countsFor } from '../../src/data/plan';
import { hotspotsFor } from '../../src/systems/hotspots';
import { buildNavGrid, cellX, cellY, toCell } from '../../src/systems/navgrid';
import { buildStudio } from '../../src/scenes/studio';
import { zoneAt, locationName } from '../../src/systems/zones';
import { zonesFor } from '../../src/data/plan';
import { tourStops } from '../../src/systems/tourStops';

describe('content manifest schema (Section 17)', () => {
  const m = JSON.parse(readFileSync('public/media/manifest.json', 'utf8'));
  it('has every section the app reads', () => {
    for (const k of ['brandName', 'roomNames', 'welcomeLoop', 'corridorPosters', 'prism', 'kiosks', 'kioskProfiles', 'journey', 'fivePoint', 'appGalleria', 'headsetApps', 'museum', 'voices', 'memories', 'readNote']) expect(m, k).toHaveProperty(k);
    expect(m.roomNames).toHaveLength(2);
    expect(m.kiosks.map((k: { id: string }) => k.id)).toEqual(['K1', 'K2', 'K3', 'K4']);
    for (const k of m.kiosks) expect(k.pages.length).toBeGreaterThanOrEqual(3);
    for (const k of m.kiosks) expect(k.pages.length).toBeLessThanOrEqual(5);
    expect(m.journey.chapters).toEqual(['Discover', 'Design', 'Build', 'Connect', 'Evolve']);
    expect(m.fivePoint.map((l: { level: string }) => l.level)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    expect(m.museum).toHaveLength(8);
    expect(m.voices.length).toBeGreaterThanOrEqual(4);
    expect(m.voices.length).toBeLessThanOrEqual(6);
    expect(m.headsetApps).toHaveLength(6);
    for (const p of Object.values(m.kioskProfiles) as string[][]) expect([...p].sort()).toEqual(['K1', 'K2', 'K3', 'K4']);
  });
  it('contains no client marks', () => {
    expect(JSON.stringify(m)).not.toMatch(/apple|iphone|ipad|imac|ipod|vision pro|siri/i);
  });
});

describe('hotspots (19.3)', () => {
  for (const layout of ['recommended', 'keep9', 'rejected', 'today'] as LayoutId[]) {
    it(`${layout}: every hotspot can be reached to within its 8 ft ring range`, () => {
      const g = buildNavGrid(layout, new Set(['lift-PL07', 'entry', 'room-west', 'room-east']));
      const list = hotspotsFor(layout);
      if (layout === 'recommended') expect(list.filter((h) => h.kind === 'galleria')).toHaveLength(7);
      if (layout === 'recommended') expect(list.filter((h) => h.kind === 'plinth')).toHaveLength(8);
      // Flood the walkable floor from the lift car, then require each hotspot to be within ring range of it.
      const start = toCell(-66, -25);
      const seen = new Uint8Array(g.w * g.h);
      const queue = [start[1] * g.w + start[0]];
      seen[queue[0]] = 1;
      while (queue.length) {
        const c = queue.pop()!;
        const i = c % g.w;
        const j = (c - i) / g.w;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= g.w || nj >= g.h) continue;
          const k = nj * g.w + ni;
          if (seen[k] || g.blocked[k]) continue;
          seen[k] = 1;
          queue.push(k);
        }
      }
      for (const h of list) {
        let best = Infinity;
        const [ci, cj] = toCell(h.pos[0], h.pos[1]);
        for (let dj = -12; dj <= 12; dj++)
          for (let di = -12; di <= 12; di++) {
            const i = ci + di;
            const j = cj + dj;
            if (i < 0 || j < 0 || i >= g.w || j >= g.h || !seen[j * g.w + i]) continue;
            best = Math.min(best, Math.hypot(cellX(i) - h.pos[0], cellY(j) - h.pos[1]));
          }
        expect(best, `${h.id} is ${best.toFixed(1)} ft from the nearest reachable floor`).toBeLessThan(5);
      }
    });
  }
});

describe('scene contents match the counts (19.4)', () => {
  const studio = buildStudio({ merge: false });
  const find = (layout: string, prefix: string) => Object.keys(studio.registry.objects).filter((k) => k.startsWith(`${layout}:${prefix}`));
  it('recommended: 4 kiosks, 8 plinths, 7 Galleria devices, 2 VR seats, 11 plant pods in the scene graph', () => {
    expect(find('recommended', 'kiosk-')).toHaveLength(4);
    expect(find('recommended', 'plinth-device-')).toHaveLength(8);
    expect(find('recommended', 'galleria-')).toHaveLength(7);
    expect(find('recommended', 'vrSeat-')).toHaveLength(2);
    let plants = 0;
    studio.root.traverse((n) => {
      const p = n.userData.plan as { kind?: string; id?: string; count?: number } | undefined;
      if (p?.kind === 'plants' && p.id === 'recommended') plants = p.count ?? 0;
    });
    expect(plants).toBe(11);
    expect(countsFor('recommended').plantPods).toBe(11);
  });
  it('today has no studio fixtures; rejected has no Galleria and five plinths; keep9 has three plinths and two benches', () => {
    expect(find('today', 'kiosk-')).toHaveLength(0);
    expect(find('today', 'plinth-')).toHaveLength(0);
    expect(find('rejected', 'galleria')).toHaveLength(0);
    expect(find('rejected', 'plinth-device-')).toHaveLength(5);
    expect(find('keep9', 'plinth-device-')).toHaveLength(3);
    expect(FIXTURES.keep9.sofas).toHaveLength(2);
  });
  it('about 24 photos on the Wall of Memories', () => {
    const n = studio.registry.objects['recommended:memories'].userData.count as number;
    expect(n).toBeGreaterThanOrEqual(20);
    expect(n).toBeLessThanOrEqual(30);
  });
});

describe('zones', () => {
  it('names where the visitor is', () => {
    const z = zonesFor('recommended');
    expect(zoneAt(40, 6, z)?.id).toBe('trail');
    expect(zoneAt(68, 30, z)?.id).toBe('makeStudio');
    expect(zoneAt(18, 30, z)).toBeNull(); // Project ODC is context: not enterable
    expect(locationName(-66, -25, z)).toBe('Lift Lobby #1');
    expect(locationName(-10, -3, z)).toBe('TCS Corridor');
    const stops = tourStops('recommended');
    expect(locationName(stops[20].cam[0], stops[20].cam[1], z)).toBe('Memory Corner');
  });
});
