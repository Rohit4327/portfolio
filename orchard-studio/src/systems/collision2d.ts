/** Plan-space collision (feet): a circle against wall segments and furniture footprints, with wall sliding. */
import type { LayoutId } from '../config';
import type { V2 } from '../data/geometry';
import { collisionSegments, footprintsFor, PLAYER_RADIUS_FT, type CollSeg, type Footprint } from '../data/plan';

export interface CollisionWorld {
  layout: LayoutId;
  segs: CollSeg[];
  feet: Footprint[];
}

export function buildCollisionWorld(layout: LayoutId, openDoors: ReadonlySet<string> = new Set()): CollisionWorld {
  return { layout, segs: collisionSegments(layout, openDoors), feet: footprintsFor(layout) };
}

/** Closest point on segment ab to p, written to out. Returns squared distance. */
function closestOnSeg(px: number, py: number, a: V2, b: V2, out: { x: number; y: number }): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  out.x = a[0] + dx * t;
  out.y = a[1] + dy * t;
  const ex = px - out.x;
  const ey = py - out.y;
  return ex * ex + ey * ey;
}

const tmp = { x: 0, y: 0 };

/** Penetration of a circle (x, y, r) into the world: returns the id hit or null. */
export function hitTest(w: CollisionWorld, x: number, y: number, r = PLAYER_RADIUS_FT): string | null {
  for (const s of w.segs) {
    const rr = r + s.r;
    if (closestOnSeg(x, y, s.a, s.b, tmp) < rr * rr - 1e-9) return s.id;
  }
  for (const f of w.feet) {
    if (f.kind === 'circle') {
      const rr = r + f.r;
      const dx = x - f.x;
      const dy = y - f.y;
      if (dx * dx + dy * dy < rr * rr - 1e-9) return f.id;
    } else {
      const cx = x < f.x0 ? f.x0 : x > f.x1 ? f.x1 : x;
      const cy = y < f.y0 ? f.y0 : y > f.y1 ? f.y1 : y;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < r * r - 1e-9) return f.id;
    }
  }
  return null;
}

/**
 * Move a circle by (dx, dy) and push it out of anything it touches. Because each contact only removes the
 * component of motion into the surface, the visitor slides along walls instead of stopping dead.
 */
export function moveAndSlide(w: CollisionWorld, pos: { x: number; y: number }, dx: number, dy: number, r = PLAYER_RADIUS_FT): void {
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (r * 0.5)));
  for (let s = 0; s < steps; s++) {
    pos.x += dx / steps;
    pos.y += dy / steps;
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (const seg of w.segs) {
        const rr = r + seg.r;
        const d2 = closestOnSeg(pos.x, pos.y, seg.a, seg.b, tmp);
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2);
          if (d > 1e-6) {
            pos.x += ((pos.x - tmp.x) / d) * (rr - d);
            pos.y += ((pos.y - tmp.y) / d) * (rr - d);
          } else {
            const nx = -(seg.b[1] - seg.a[1]);
            const ny = seg.b[0] - seg.a[0];
            const nl = Math.hypot(nx, ny) || 1;
            pos.x += (nx / nl) * rr;
            pos.y += (ny / nl) * rr;
          }
          moved = true;
        }
      }
      for (const f of w.feet) {
        if (f.kind === 'circle') {
          const rr = r + f.r;
          const ex = pos.x - f.x;
          const ey = pos.y - f.y;
          const d2 = ex * ex + ey * ey;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 1e-6;
            pos.x += (ex / d) * (rr - d);
            pos.y += (ey / d) * (rr - d);
            moved = true;
          }
        } else {
          const cx = pos.x < f.x0 ? f.x0 : pos.x > f.x1 ? f.x1 : pos.x;
          const cy = pos.y < f.y0 ? f.y0 : pos.y > f.y1 ? f.y1 : pos.y;
          const ex = pos.x - cx;
          const ey = pos.y - cy;
          const d2 = ex * ex + ey * ey;
          if (d2 < r * r) {
            if (d2 > 1e-10) {
              const d = Math.sqrt(d2);
              pos.x += (ex / d) * (r - d);
              pos.y += (ey / d) * (r - d);
            } else {
              // Centre is inside the rectangle: leave through the nearest face.
              const l = pos.x - f.x0;
              const rgt = f.x1 - pos.x;
              const b = pos.y - f.y0;
              const t = f.y1 - pos.y;
              const m = Math.min(l, rgt, b, t);
              if (m === l) pos.x = f.x0 - r;
              else if (m === rgt) pos.x = f.x1 + r;
              else if (m === b) pos.y = f.y0 - r;
              else pos.y = f.y1 + r;
            }
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }
}

/** First thing a plan-space ray (zero radius) from a to b touches among obstacles taller than the given flag. */
export function raycastPlan(w: CollisionWorld, a: V2, b: V2, opts: { onlyTall?: boolean; ignore?: (id: string) => boolean } = {}): { id: string; t: number } | null {
  let best: { id: string; t: number } | null = null;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const n = Math.ceil(len / 0.05);
  for (let i = 0; i <= n && !best; i++) {
    const t = i / n;
    const x = a[0] + dx * t;
    const y = a[1] + dy * t;
    for (const s of w.segs) {
      if (opts.ignore?.(s.id)) continue;
      if (closestOnSeg(x, y, s.a, s.b, tmp) <= s.r * s.r) {
        best = { id: s.id, t };
        break;
      }
    }
    if (best) break;
    for (const f of w.feet) {
      if (opts.onlyTall && !f.tall) continue;
      if (opts.ignore?.(f.id)) continue;
      const inside = f.kind === 'circle' ? (x - f.x) ** 2 + (y - f.y) ** 2 <= f.r * f.r : x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1;
      if (inside) {
        best = { id: f.id, t };
        break;
      }
    }
  }
  return best;
}
