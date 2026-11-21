/** Presentation labels: two columns sorted by anchor height so leaders never cross; door tags; zone hover and click. */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { FT, polygonCentroid } from '../data/geometry';
import { zonesFor } from '../data/plan';
import { controlsRef } from '../scenes/Stage';
import { stage } from '../scenes/transition/dive';
import { rt, touch } from '../state/runtime';
import { useStudio } from '../state/store';
import { tintZones, zoneProxies } from '../zones/proxies';
import { onOverlayFrame, projectPlan, type Screen } from './project';
import { doorTags } from './zoneText';

const ROW = 46;
const MARGIN = 28;
const LABEL_W = 212;

export function focusZone(id: string): void {
  const st = useStudio.getState();
  const z = zonesFor(st.layout).find((q) => q.id === id);
  const c = controlsRef.current;
  const world = stage.refs?.world;
  if (!z || !c || !world) return;
  const [cx, cy] = polygonCentroid(z.polygon);
  const p = new THREE.Vector3(cx * FT, 0, -cy * FT).applyMatrix4(world.matrixWorld);
  // Ease the camera onto the zone (0.8 s) from the same side it is looking from now.
  c.smoothTime = 0.2;
  void c.setLookAt(p.x, p.y + 0.95, p.z + 0.62, p.x, p.y, p.z, !st.reducedMotion);
  st.set({ activeZone: id });
  audio.play('cardOpen');
  touch(60);
}

export function Labels() {
  const layout = useStudio((s) => s.layout);
  const labels = useStudio((s) => s.labels);
  const hover = useStudio((s) => s.hoverZone);
  const zones = useMemo(() => zonesFor(layout), [layout]);
  const doors = useMemo(doorTags, []);
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    tintZones(layout, hover);
    touch(4);
    return () => tintZones(layout, null);
  }, [layout, hover]);

  // Hover: raycast only against the zone proxies (BVH), at most once per animation frame.
  useEffect(() => {
    const el = rt.gl?.domElement;
    if (!el) return;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let pending: PointerEvent | null = null;
    let downAt: [number, number] | null = null;
    const pick = (e: { clientX: number; clientY: number }): string | null => {
      if (!rt.camera) return null;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, rt.camera);
      (ray as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
      let best: string | null = null;
      let bd = Infinity;
      for (const p of zoneProxies[useStudio.getState().layout]) {
        const hit = ray.intersectObject(p.mesh, false)[0];
        // Studio zones sit inside the broad approach polygons: prefer the later (more specific) zone on ties.
        if (hit && hit.distance <= bd + 1e-4) {
          bd = hit.distance;
          best = p.id;
        }
      }
      return best;
    };
    const move = (e: PointerEvent) => (pending = e);
    const down = (e: PointerEvent) => (downAt = [e.clientX, e.clientY]);
    const up = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
      const id = pick(e);
      if (id) focusZone(id);
    };
    const leave = () => useStudio.getState().set({ hoverZone: null });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', leave);
    const off = onOverlayFrame(() => {
      if (!pending) return;
      const id = pick(pending);
      pending = null;
      if (id !== useStudio.getState().hoverZone) {
        useStudio.getState().set({ hoverZone: id });
        if (id) audio.play('hover');
      }
    });
    return () => {
      off();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  // Two-column solver, run in the shared overlay loop and applied with translate3d (no React state per frame).
  useEffect(() => {
    const s: Screen = { x: 0, y: 0, d: 0 };
    const anchors = zones.map((z) => polygonCentroid(z.polygon));
    return onOverlayFrame(() => {
      const el = root.current;
      const lines = svg.current;
      if (!el || !lines || !rt.gl) return;
      const W = rt.gl.domElement.clientWidth;
      const H = rt.gl.domElement.clientHeight;
      const pts = anchors.map((a, i) => {
        projectPlan(a[0], a[1], 1, s);
        return { i, x: s.x, y: s.y, ok: s.d > 0 };
      });
      const mid = pts.reduce((m, p) => m + p.x, 0) / Math.max(1, pts.length);
      for (const side of [0, 1]) {
        const col = pts.filter((p) => (p.x < mid ? 0 : 1) === side).sort((a, b) => a.y - b.y);
        // Place each label at its anchor's height, then push apart to a minimum row spacing, top to bottom.
        const ys = col.map((p) => p.y);
        for (let k = 1; k < ys.length; k++) ys[k] = Math.max(ys[k], ys[k - 1] + ROW);
        const over = ys.length ? ys[ys.length - 1] - (H - 150) : 0;
        if (over > 0) for (let k = 0; k < ys.length; k++) ys[k] -= over;
        for (let k = ys.length - 2; k >= 0; k--) ys[k] = Math.min(ys[k], ys[k + 1] - ROW);
        col.forEach((p, k) => {
          const node = el.children[p.i] as HTMLElement | undefined;
          const line = lines.children[p.i] as SVGPolylineElement | undefined;
          if (!node || !line) return;
          const y = Math.max(96, ys[k]);
          const lx = side === 0 ? Math.max(MARGIN, Math.min(p.x - 300, W * 0.2 - LABEL_W / 2)) : Math.min(W - MARGIN - LABEL_W, Math.max(p.x + 90, W * 0.8 - LABEL_W / 2));
          node.style.transform = `translate3d(${Math.round(lx)}px, ${Math.round(y - 17)}px, 0)`;
          node.style.opacity = p.ok ? '1' : '0';
          const ex = side === 0 ? lx + node.offsetWidth + 6 : lx - 6;
          const elbow = side === 0 ? Math.min(p.x - 14, ex + 60) : Math.max(p.x + 14, ex - 60);
          line.setAttribute('points', `${ex},${y} ${elbow},${y} ${p.x},${p.y}`);
          line.style.opacity = p.ok ? '1' : '0';
          (lines.children[anchors.length + p.i] as SVGCircleElement | undefined)?.setAttribute('transform', `translate(${p.x} ${p.y})`);
        });
      }
      // Door tags sit on their doors; shown in "Zones + Doors" or automatically when zoomed in close.
      const tags = el.parentElement?.querySelector('.door-tags') as HTMLElement | null;
      if (tags) {
        const close = (controlsRef.current?.distance ?? 9) < 1.25;
        const show = useStudio.getState().labels === 'doors' || (close && useStudio.getState().labels !== 'off');
        tags.style.opacity = show ? '1' : '0';
        if (show)
          doors.forEach((d, i) => {
            projectPlan(d.at[0], d.at[1], 1.5, s);
            const n = tags.children[i] as HTMLElement;
            n.style.transform = `translate3d(${Math.round(s.x)}px, ${Math.round(s.y)}px, 0) translate(-50%, -50%)`;
          });
      }
    });
  }, [zones, doors]);

  const off = labels === 'off';
  return (
    <div className="labels" style={{ opacity: off ? 0 : 1, pointerEvents: off ? 'none' : undefined }}>
      <svg ref={svg} className="leaders">
        {zones.map((z) => (
          <polyline key={z.id} className={z.context ? 'ctx' : ''} />
        ))}
        {zones.map((z) => (
          <circle key={z.id} r={3} className={z.context ? 'ctx' : ''} />
        ))}
      </svg>
      <div ref={root}>
        {zones.map((z) => (
          <button
            key={z.id}
            className={`label${z.context ? ' ctx' : ''}${hover === z.id ? ' on' : ''}`}
            onMouseEnter={() => useStudio.getState().set({ hoverZone: z.id })}
            onMouseLeave={() => useStudio.getState().set({ hoverZone: null })}
            onClick={() => focusZone(z.id)}
          >
            {z.n ? <i>{String(z.n).padStart(2, '0')}</i> : <i className="dot" />}
            <span>{z.name}</span>
          </button>
        ))}
      </div>
      <div className="door-tags">
        {doors.map((d, i) => (
          <span key={i}>{d.text}</span>
        ))}
      </div>
    </div>
  );
}
