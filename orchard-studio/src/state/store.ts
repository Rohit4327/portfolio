import { create } from 'zustand';
import { CONFIG, LAYOUT_IDS, type LayoutId, type QualityTier } from '../config';

export type Mode = 'presentation' | 'transition' | 'walkthrough';
export type LabelsMode = 'zones' | 'doors' | 'off';
export type Tier = Exclude<QualityTier, 'auto'>;
export interface Toast {
  id: number;
  text: string;
}
export interface InspectState {
  /** Hotspot id being inspected. */
  id: string;
  kind: string;
  title: string;
  lines: string[];
  /** Index within a multi-item hotspot (kiosk page, plinth, device screen). */
  page: number;
  pages: number;
  /** Extra per-interaction state the cards read. */
  data: Record<string, unknown>;
}

const hashLayout = (): LayoutId => {
  if (typeof location === 'undefined') return CONFIG.defaultLayout;
  const h = location.hash.replace('#', '') as LayoutId;
  return LAYOUT_IDS.includes(h) ? h : CONFIG.defaultLayout;
};
const params = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
export const DEBUG = params.get('debug');
export const VISITOR = params.get('visitor');
export const PROFILE = params.get('profile');
const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface StudioState {
  mode: Mode;
  layout: LayoutId;
  quality: QualityTier;
  tier: Tier;
  labels: LabelsMode;
  hoverZone: string | null;
  activeZone: string | null;
  inspect: InspectState | null;
  tour: { active: boolean; paused: boolean; stop: number };
  location: string;
  toasts: Toast[];
  reducedMotion: boolean;
  autoOrbit: boolean;
  underlay: boolean;
  settingsOpen: boolean;
  layoutSheetOpen: boolean;
  mapExpanded: boolean;
  loading: { progress: number; done: boolean };
  pointerLocked: boolean;
  refining: number; // path-tracer samples, 0 when raster
  hint: string | null;
  set: (p: Partial<StudioState>) => void;
  setLayout: (l: LayoutId) => void;
  toast: (text: string) => void;
}

let toastId = 1;
export const useStudio = create<StudioState>((set, get) => ({
  mode: 'presentation',
  layout: hashLayout(),
  quality: (params.get('quality') as QualityTier) || CONFIG.quality,
  tier: 'high',
  labels: 'zones',
  hoverZone: null,
  activeZone: null,
  inspect: null,
  tour: { active: false, paused: false, stop: 0 },
  location: '',
  toasts: [],
  reducedMotion: prefersReduced,
  autoOrbit: false,
  underlay: false,
  settingsOpen: false,
  layoutSheetOpen: false,
  mapExpanded: false,
  loading: { progress: 0, done: false },
  pointerLocked: false,
  refining: 0,
  hint: null,
  set: (p) => set(p),
  setLayout: (layout) => {
    if (get().layout === layout) return;
    set({ layout, activeZone: null, hoverZone: null });
    try {
      history.replaceState(null, '', `${location.pathname}${location.search}#${layout}`);
    } catch {}
  },
  toast: (text) => {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-2), { id, text }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2600);
  },
}));
