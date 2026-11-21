/** Walkthrough HUD: hotspot rings, dock, minimap, toasts, tour caption, touch joystick. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { extensions } from '../debug/api';
import { MODEL_EXTENT } from '../data/geometry';
import { A, AP } from '../data/geometry';
import { desksFor, FIXTURES, zonesFor, PLAYER_RADIUS_FT } from '../data/plan';
import { exitToModel } from '../scenes/transition/dive';
import { walk } from '../scenes/walkthrough/WalkControls';
import { navFor, player, rt } from '../state/runtime';
import { useStudio } from '../state/store';
import { hitTest } from '../systems/collision2d';
import { hotspotsFor, HOTSPOT_RANGE_FT, type Hotspot } from '../systems/hotspots';
import { startInspect } from '../systems/inspect';
import { nearestFree } from '../systems/navgrid';
import { pauseTour, resumeTour, startTour, tour, tourAvailable, tourStep } from '../systems/tour';
import { tourStops } from '../systems/tourStops';
import { Icon } from './icons';
import { onOverlayFrame, projectPlan, type Screen } from './project';

/** White hotspot rings for items within 8 ft, projected in the shared overlay loop. */
export function Hotspots() {
  const layout = useStudio((s) => s.layout);
  const inspecting = useStudio((s) => !!s.inspect);
  const list = useMemo(() => hotspotsFor(layout), [layout]);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    extensions.hotspots = () => list;
    extensions.inspect = (id: string) => {
      const h = list.find((q) => q.id === id);
      if (h) startInspect(h);
      return !!h;
    };
    const s: Screen = { x: 0, y: 0, d: 0 };
    let nearest: Hotspot | null = null;
    const key = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearest && !useStudio.getState().inspect) startInspect(nearest);
    };
    window.addEventListener('keydown', key);
    const off = onOverlayFrame(() => {
      const el = root.current;
      if (!el || !rt.gl) return;
      const W = rt.gl.domElement.clientWidth;
      const H = rt.gl.domElement.clientHeight;
      let best = Infinity;
      nearest = null;
      list.forEach((h, i) => {
        const n = el.children[i] as HTMLElement;
        const d = Math.hypot(h.pos[0] - player.x, h.pos[1] - player.y);
        let show = d < HOTSPOT_RANGE_FT;
        if (show) {
          projectPlan(h.pos[0], h.pos[1], h.h, s);
          show = s.d > 0 && s.x > 0 && s.x < W && s.y > 0 && s.y < H;
          if (show) {
            n.style.transform = `translate3d(${Math.round(s.x)}px, ${Math.round(s.y)}px, 0) translate(-50%, -50%)`;
            const c = Math.hypot(s.x - W / 2, s.y - H / 2) + d * 20;
            if (c < best) {
              best = c;
              nearest = h;
            }
          }
        }
        n.style.opacity = show ? '1' : '0';
        n.style.pointerEvents = show ? 'auto' : 'none';
      });
    });
    return () => {
      off();
      window.removeEventListener('keydown', key);
    };
  }, [list]);
  return (
    <div ref={root} className="hotspots" style={{ display: inspecting ? 'none' : undefined }}>
      {list.map((h) => (
        <button key={h.id} className="hotspot" data-hotspot={h.id} onMouseEnter={() => audio.play('hover')} onClick={() => startInspect(h)}>
          <i />
          <span>{h.verb}</span>
        </button>
      ))}
    </div>
  );
}

const MAP = 148;
/** Circular, north-up minimap tinted with the active layout's zones. Click to expand. */
export function Minimap() {
  const layout = useStudio((s) => s.layout);
  const expanded = useStudio((s) => s.mapExpanded);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = expanded ? 420 : MAP;
  const base = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 840;
    const ctx = c.getContext('2d')!;
    const e = MODEL_EXTENT;
    const k = c.width / (e.x1 - e.x0);
    const X = (x: number) => (x - e.x0) * k;
    const Y = (y: number) => (e.y1 + 21.5 - y) * k;
    ctx.fillStyle = '#f6f5f2';
    ctx.fillRect(0, 0, c.width, c.height);
    const poly = (pts: readonly (readonly [number, number])[], fill: string) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    const cr = AP.corridor2000;
    const lob = AP.liftLobby02;
    poly([[cr.x0, cr.y0], [cr.x1, cr.y0], [cr.x1, cr.y1], [cr.x0, cr.y1]], '#e3e1dc');
    poly([[lob.x0 - 8, lob.y0], [lob.x1, lob.y0], [lob.x1, cr.y0], [lob.x0 - 8, cr.y0]], '#e3e1dc');
    poly(A.envelopeInterior, '#ebe9e4');
    const tints: Record<string, string> = { trail: '#d9d2c4', makeAtDoor: '#d9d2c4', garage: '#cfd6d8', windowPause: '#cddbd4', makeStudio: '#e4d6bf', makeStrip: '#e4d6bf', kioskStrip: '#e4d6bf', memoryCorner: '#dcd3e0', projectODC: '#dedede' };
    for (const z of zonesFor(layout)) if (tints[z.id]) poly(z.polygon, tints[z.id]);
    ctx.fillStyle = 'rgba(40,42,46,0.28)';
    for (const d of desksFor(layout)) ctx.fillRect(X(d.x), Y(d.y + d.d), d.w * k, d.d * k);
    ctx.fillStyle = '#8b8b88';
    for (const p of A.pillars) ctx.fillRect(X(p.x0), Y(p.y1), (p.x1 - p.x0) * k, (p.y1 - p.y0) * k);
    ctx.fillStyle = 'rgba(40,42,46,0.5)';
    for (const kq of FIXTURES[layout].kiosks) ctx.fillRect(X(kq.x - 0.75), Y(kq.y + 1.5), 1.5 * k, 3 * k);
    if (tourAvailable())
      for (const s of tourStops(layout)) {
        ctx.beginPath();
        ctx.arc(X(s.cam[0]), Y(s.cam[1]), 3.4, 0, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(40,42,46,0.7)';
        ctx.stroke();
      }
    return { c, X, Y, k };
  }, [layout]);
  useEffect(
    () =>
      onOverlayFrame(() => {
        const cv = canvas.current;
        if (!cv) return;
        const ctx = cv.getContext('2d')!;
        const S = cv.width;
        ctx.clearRect(0, 0, S, S);
        ctx.save();
        ctx.beginPath();
        ctx.arc(S / 2, S / 2, S / 2, 0, 7);
        ctx.clip();
        // Collapsed: follow the visitor at a readable scale. Expanded: the whole floor.
        const zoom = expanded ? S / 840 : (S / 840) * 3.1;
        const px = expanded ? 420 : base.X(player.x);
        const py = expanded ? 420 : base.Y(player.y);
        ctx.translate(S / 2 - px * zoom, S / 2 - py * zoom);
        ctx.scale(zoom, zoom);
        ctx.drawImage(base.c, 0, 0);
        ctx.translate(base.X(player.x), base.Y(player.y));
        ctx.rotate((-player.yaw * Math.PI) / 180 + Math.PI / 2);
        const a = 7 / Math.sqrt(zoom / (S / 840));
        ctx.beginPath();
        ctx.moveTo(0, -a * 1.3);
        ctx.lineTo(a, a);
        ctx.lineTo(0, a * 0.5);
        ctx.lineTo(-a, a);
        ctx.closePath();
        ctx.fillStyle = '#1d1d1f';
        ctx.fill();
        ctx.restore();
      }),
    [base, expanded],
  );
  return (
    <button className={`minimap${expanded ? ' big' : ''}`} style={{ width: size, height: size }} onClick={() => useStudio.getState().set({ mapExpanded: !expanded })} aria-label="Map">
      <canvas ref={canvas} width={size * 2} height={size * 2} />
      <b>N</b>
    </button>
  );
}

export function WalkDock() {
  const location = useStudio((s) => s.location);
  const t = useStudio((s) => s.tour);
  const layout = useStudio((s) => s.layout);
  const muted = useAudioMuted();
  const set = useStudio.getState().set;
  const canTour = tourAvailable();
  void layout;
  return (
    <div className="dock walk">
      <div className="pill loc">
        <i className="live" />
        {location || 'Level 09'}
      </div>
      <span className="sep" />
      <button className="ico" disabled={!canTour} onClick={() => tourStep(-1)} aria-label="Previous stop">
        <Icon n="prev" />
      </button>
      <button className="ico" disabled={!canTour} data-testid="tour-play" onClick={() => (t.active && !t.paused ? pauseTour() : t.active ? resumeTour() : startTour(1))} aria-label="Play or pause tour">
        <Icon n={t.active && !t.paused ? 'pause' : 'play'} />
      </button>
      <button className="ico" disabled={!canTour} onClick={() => tourStep(1)} aria-label="Next stop">
        <Icon n="next" />
      </button>
      <span className="sep" />
      <button className="txt" onClick={() => set({ mapExpanded: !useStudio.getState().mapExpanded })}>
        Map
      </button>
      <button className="txt" onClick={() => set({ layoutSheetOpen: !useStudio.getState().layoutSheetOpen })}>
        Layout
      </button>
      <button className="txt" onClick={() => audio.setMuted(!muted)}>
        {muted ? 'Sound off' : 'Sound on'}
      </button>
      <span className="sep" />
      <button className="txt strong" data-testid="exit-model" onClick={exitToModel}>
        Exit to model
      </button>
    </div>
  );
}

export function useAudioMuted(): boolean {
  const [m, setM] = useState(audio.getState().muted);
  useEffect(() => audio.subscribe((s) => setM(s.muted)), []);
  return m;
}

export function TourCaption() {
  const t = useStudio((s) => s.tour);
  const layout = useStudio((s) => s.layout);
  if (!tourAvailable()) return <div className="banner">Guided tour is available in Recommended and Keep 9 seats. {layout === 'today' ? 'Today' : 'Rejected'} is free walk only.</div>;
  if (!t.active) return null;
  const s = tourStops(layout)[t.stop - 1];
  return (
    <div className="caption">
      <small>
        Stop {t.stop} of 22 {t.paused ? '· paused' : ''}
      </small>
      <b>{s?.name}</b>
      <p>{tour.caption || s?.caption}</p>
      {t.paused ? (
        <button className="txt strong" onClick={resumeTour}>
          Resume
        </button>
      ) : null}
    </div>
  );
}

export function Toasts() {
  const toasts = useStudio((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Left joystick on touch devices (the look drag is handled on the canvas). */
export function Joystick() {
  const knob = useRef<HTMLElement>(null);
  useEffect(
    () =>
      onOverlayFrame(() => {
        if (knob.current) knob.current.style.transform = `translate(${walk.joy.x * 22}px, ${walk.joy.y * 22}px)`;
      }),
    [],
  );
  return (
    <div className="joystick" aria-hidden>
      <i ref={knob} />
    </div>
  );
}

/** If a layout switch puts furniture where the visitor stands, nudge them to the nearest free point (Section 5). */
export function nudgeIfBlocked(): void {
  const g = navFor(useStudio.getState().layout);
  if (!hitTest(g.world, player.x, player.y, PLAYER_RADIUS_FT)) return;
  const p = nearestFree(g, player.x, player.y, 12);
  if (p) {
    player.x = p[0];
    player.y = p[1];
    walk.target = null;
  }
}
