/** 0.5 ft occupancy grid per layout, with A* and string-pulled paths. All coordinates are plan feet. */
import type { LayoutId } from '../config';
import { MODEL_EXTENT, type V2 } from '../data/geometry';
import { PLAYER_RADIUS_FT } from '../data/plan';
import { buildCollisionWorld, hitTest, type CollisionWorld } from './collision2d';

export const CELL = 0.5;
export interface NavGrid {
  layout: LayoutId;
  w: number;
  h: number;
  /** 1 = blocked for a visitor-sized circle centred on the cell. */
  blocked: Uint8Array;
  world: CollisionWorld;
}

const X0 = MODEL_EXTENT.x0;
const Y0 = MODEL_EXTENT.y0;
export const gridW = Math.round((MODEL_EXTENT.x1 - X0) / CELL);
export const gridH = Math.round((MODEL_EXTENT.y1 - Y0) / CELL);
export const cellX = (i: number) => X0 + (i + 0.5) * CELL;
export const cellY = (j: number) => Y0 + (j + 0.5) * CELL;
export const toCell = (x: number, y: number): [number, number] => [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)];

/** Clearance margin so paths do not graze surfaces. */
const MARGIN = 0.05;

export function buildNavGrid(layout: LayoutId, openDoors: ReadonlySet<string> = new Set()): NavGrid {
  const world = buildCollisionWorld(layout, openDoors);
  const blocked = new Uint8Array(gridW * gridH);
  for (let j = 0; j < gridH; j++)
    for (let i = 0; i < gridW; i++) blocked[j * gridW + i] = hitTest(world, cellX(i), cellY(j), PLAYER_RADIUS_FT + MARGIN) ? 1 : 0;
  return { layout, w: gridW, h: gridH, blocked, world };
}

const isFree = (g: NavGrid, i: number, j: number) => i >= 0 && j >= 0 && i < g.w && j < g.h && g.blocked[j * g.w + i] === 0;

/** Nearest free cell to a point (spiral search up to maxFt). */
export function nearestFree(g: NavGrid, x: number, y: number, maxFt = 6): V2 | null {
  const [ci, cj] = toCell(x, y);
  if (isFree(g, ci, cj)) return [x, y];
  const maxR = Math.ceil(maxFt / CELL);
  let best: V2 | null = null;
  let bd = Infinity;
  for (let r = 1; r <= maxR && !best; r++) {
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (!isFree(g, ci + di, cj + dj)) continue;
        const px = cellX(ci + di);
        const py = cellY(cj + dj);
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < bd) {
          bd = d;
          best = [px, py];
        }
      }
  }
  return best;
}

/** Grid line of sight for a visitor-sized circle. */
export function lineFree(g: NavGrid, a: V2, b: V2): boolean {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(len / (CELL * 0.5)));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    if (hitTest(g.world, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, PLAYER_RADIUS_FT)) return false;
  }
  return true;
}

const SQRT2 = Math.SQRT2;

/** A* from a to b. Returns a smoothed polyline in plan feet (including both ends), or null if unreachable. */
export function findPath(g: NavGrid, from: V2, to: V2): V2[] | null {
  const s = nearestFree(g, from[0], from[1]);
  const e = nearestFree(g, to[0], to[1]);
  if (!s || !e) return null;
  const [si, sj] = toCell(s[0], s[1]);
  const [ei, ej] = toCell(e[0], e[1]);
  const N = g.w * g.h;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  // Binary heap of [f, index].
  const heapF: number[] = [];
  const heapI: number[] = [];
  const push = (f: number, idx: number) => {
    let k = heapF.length;
    heapF.push(f);
    heapI.push(idx);
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heapF[p] <= heapF[k]) break;
      [heapF[p], heapF[k]] = [heapF[k], heapF[p]];
      [heapI[p], heapI[k]] = [heapI[k], heapI[p]];
      k = p;
    }
  };
  const pop = (): number => {
    const top = heapI[0];
    const lf = heapF.pop()!;
    const li = heapI.pop()!;
    if (heapF.length) {
      heapF[0] = lf;
      heapI[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heapF.length && heapF[l] < heapF[m]) m = l;
        if (r < heapF.length && heapF[r] < heapF[m]) m = r;
        if (m === k) break;
        [heapF[m], heapF[k]] = [heapF[k], heapF[m]];
        [heapI[m], heapI[k]] = [heapI[k], heapI[m]];
        k = m;
      }
    }
    return top;
  };
  const hx = (i: number, j: number) => {
    const dx = Math.abs(i - ei);
    const dy = Math.abs(j - ej);
    return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
  };
  const start = sj * g.w + si;
  const goal = ej * g.w + ei;
  gScore[start] = 0;
  push(hx(si, sj), start);
  let found = false;
  while (heapF.length) {
    const cur = pop();
    if (cur === goal) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % g.w;
    const cj = (cur - ci) / g.w;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (!isFree(g, ni, nj)) continue;
        if (di && dj && (!isFree(g, ci + di, cj) || !isFree(g, ci, cj + dj))) continue; // no corner cutting
        const nidx = nj * g.w + ni;
        if (closed[nidx]) continue;
        const cost = gScore[cur] + (di && dj ? SQRT2 : 1);
        if (cost < gScore[nidx]) {
          gScore[nidx] = cost;
          came[nidx] = cur;
          push(cost + hx(ni, nj), nidx);
        }
      }
  }
  if (!found) return null;
  const cells: V2[] = [];
  for (let c = goal; c !== -1; c = came[c]) cells.push([cellX(c % g.w), cellY(Math.floor(c / g.w))]);
  cells.reverse();
  const raw: V2[] = [s, ...cells.slice(1, -1), e];
  // String pulling.
  const out: V2[] = [raw[0]];
  let anchor = 0;
  while (anchor < raw.length - 1) {
    let next = raw.length - 1;
    while (next > anchor + 1 && !lineFree(g, raw[anchor], raw[next])) next--;
    out.push(raw[next]);
    anchor = next;
  }
  return out;
}

export const pathLength = (p: readonly V2[]) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
