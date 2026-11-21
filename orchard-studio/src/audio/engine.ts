/**
 * Orchard Studio audio engine: a small WebAudio graph where every sound is synthesised in code.
 *
 *   Master (volume / mute) → soft limiter → destination
 *     ├─ Ambient (very quiet) ← duck ← beds, music
 *     ├─ UI
 *     └─ World
 *
 * Nothing touches AudioContext until unlock() is called from a user gesture. Without a window or
 * an AudioContext (Node tests) every method is a safe no-op that still records events and state.
 */
import { createBed, type Bed, type BedId, type Proximity } from './beds';
import { RECIPES, SOUND_NAMES, footstepRecipe, type FloorMaterial, type PlayOpts, type SoundName } from './synth';

export { SOUND_NAMES };
export type { BedId, FloorMaterial, SoundName };

export interface AudioState {
  unlocked: boolean;
  muted: boolean;
  volume: number;
  music: boolean;
  bed: BedId;
  ducked: boolean;
}

export type AudioEventType =
  'unlock' | 'play' | 'bed' | 'duck' | 'mute' | 'volume' | 'footstep' | 'suspend' | 'resume';

export interface AudioEvent {
  t: number;
  type: string;
  detail: string;
}

/* ---------------------------------------------------------------- tuning ---- */

const STORAGE_KEY = 'orchard.audio';
const MAX_EVENTS = 500;
const BED_FADE = 1.5;
const DUCK_RAMP = 0.3;
const DUCK_LEVEL = 0.3; // -70 %
/** Relative loudness targets: ambient ~ -32, UI ~ -26, world ~ -22 LUFS. */
const BUS_GAIN = { ambient: 0.07, ui: 0.5, world: 0.8, music: 0.35 } as const;

const UI_SOUNDS: ReadonlySet<SoundName> = new Set<SoundName>([
  'hover',
  'click',
  'layoutSwitch',
  'cardOpen',
  'cardClose',
  'toast',
  'zoneTone',
]);

/* ----------------------------------------------------------- persistence ---- */

interface Persisted {
  muted: boolean;
  volume: number;
  music: boolean;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function loadPersisted(): Persisted {
  const out: Persisted = { muted: false, volume: 0.8, music: false };
  if (typeof window === 'undefined') return out;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return out;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return out;
    if (typeof data.muted === 'boolean') out.muted = data.muted;
    if (typeof data.volume === 'number' && Number.isFinite(data.volume)) out.volume = clamp01(data.volume);
    if (typeof data.music === 'boolean') out.music = data.music;
  } catch {
    // storage unavailable or corrupt: defaults
  }
  return out;
}

function savePersisted(s: AudioState): void {
  if (typeof window === 'undefined') return;
  try {
    const data: Persisted = { muted: s.muted, volume: s.volume, music: s.music };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, quota): ignore
  }
}

/* ------------------------------------------------------------------ state ---- */

let state: AudioState = { unlocked: false, ...loadPersisted(), bed: 'none', ducked: false };
const listeners = new Set<(s: AudioState) => void>();
const events: AudioEvent[] = [];
let proximity: Proximity = { garage: 0, eastGlass: 0 };

function log(type: AudioEventType, detail: string): void {
  const t = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0;
  events.push({ t, type, detail });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

function setState(patch: Partial<AudioState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

/* ------------------------------------------------------------------ graph ---- */

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  ambient: GainNode;
  duck: GainNode;
  ui: GainNode;
  world: GainNode;
  music: GainNode;
}

let graph: Graph | null = null;
let currentBed: Bed | null = null;
let hidden = false;
let visibilityBound = false;

const overrides = new Map<SoundName, AudioBuffer>();
let musicUrl: string | null = null;
let musicBuffer: AudioBuffer | null = null;
let musicLoading = false;
let musicSource: AudioBufferSourceNode | null = null;

type AudioContextCtor = new () => AudioContext;

function contextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function buildGraph(ctx: AudioContext): Graph {
  const master = ctx.createGain();
  master.gain.value = state.muted ? 0 : state.volume;
  // Soft safety limiter so stacked sounds never clip.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 12;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.005;
  limiter.release.value = 0.2;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  const bus = (gain: number, dest: AudioNode): GainNode => {
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(dest);
    return g;
  };
  const duck = bus(state.ducked ? DUCK_LEVEL : 1, master);
  const ambient = bus(BUS_GAIN.ambient, duck);
  const music = bus(0, duck);
  const ui = bus(BUS_GAIN.ui, master);
  const world = bus(BUS_GAIN.world, master);
  return { ctx, master, ambient, duck, ui, world, music };
}

function resumeContext(g: Graph): void {
  if (hidden || g.ctx.state === 'running') return;
  try {
    void g.ctx.resume().catch(() => undefined);
  } catch {
    // resume not permitted yet
  }
}

function onVisibilityChange(): void {
  if (!graph || typeof document === 'undefined') return;
  hidden = document.hidden;
  if (hidden) {
    try {
      void graph.ctx.suspend().catch(() => undefined);
    } catch {
      // already closed
    }
    log('suspend', 'hidden');
  } else {
    resumeContext(graph);
    log('resume', 'visible');
  }
}

/** Ramps a param from wherever it currently is to `target` over `seconds`, linearly. */
function rampTo(param: AudioParam, target: number, now: number, seconds: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + seconds);
}

function applyMaster(g: Graph): void {
  g.master.gain.setTargetAtTime(state.muted ? 0 : state.volume, g.ctx.currentTime, 0.03);
}

function applyBed(g: Graph, id: BedId): void {
  const now = g.ctx.currentTime;
  const old = currentBed;
  currentBed = null;
  if (old) {
    rampTo(old.node.gain, 0, now, BED_FADE);
    setTimeout(() => old.stop(), (BED_FADE + 0.1) * 1000);
  }
  if (id === 'none') return;
  const bed = createBed(g.ctx, id, proximity);
  bed.node.gain.setValueAtTime(0, now);
  bed.node.gain.linearRampToValueAtTime(1, now + BED_FADE);
  bed.node.connect(g.ambient);
  currentBed = bed;
}

/* --------------------------------------------------------- file overrides ---- */

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: unknown = await res.json();
  return data;
}

async function fetchBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Resolves a manifest path to a URL, only if the file is listed in available.json (so no 404s). */
function resolveAsset(path: unknown, available: readonly string[]): string | null {
  if (typeof path !== 'string' || path.length === 0) return null;
  const rel = path.replace(/^\.?\//, '');
  const file = rel.startsWith('audio/') ? rel.slice('audio/'.length) : rel;
  if (!available.includes(file)) return null;
  return `./audio/${file}`;
}

const isSoundName = (name: string): name is SoundName => (SOUND_NAMES as readonly string[]).includes(name);

async function loadOverrides(g: Graph): Promise<void> {
  if (typeof fetch !== 'function') return;
  try {
    const available = await fetchJson('./available.json');
    if (!isRecord(available) || !Array.isArray(available.audio)) return;
    const files = available.audio.filter((f): f is string => typeof f === 'string');
    if (!files.includes('manifest.json')) return;

    const manifest = await fetchJson('./audio/manifest.json');
    if (!isRecord(manifest)) return;

    musicUrl = resolveAsset(manifest.music, files);
    syncMusic();

    if (isRecord(manifest.sounds)) {
      await Promise.all(
        Object.entries(manifest.sounds).map(async ([name, path]) => {
          if (!isSoundName(name)) return;
          const url = resolveAsset(path, files);
          if (!url) return;
          const buffer = await fetchBuffer(g.ctx, url);
          if (buffer) overrides.set(name, buffer);
        }),
      );
    }
  } catch {
    // offline or malformed manifest: synthesised sounds remain in use
  }
}

function playBuffer(g: Graph, buffer: AudioBuffer, dest: AudioNode, opts: PlayOpts | undefined): void {
  const src = g.ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = Math.min(4, Math.max(0.25, opts?.rate ?? 1));
  const gain = g.ctx.createGain();
  gain.gain.value = Math.min(2, Math.max(0, opts?.volume ?? 1));
  src.connect(gain);
  const pan = opts?.pan ?? 0;
  if (pan !== 0 && typeof g.ctx.createStereoPanner === 'function') {
    const panner = g.ctx.createStereoPanner();
    panner.pan.value = Math.min(1, Math.max(-1, pan));
    gain.connect(panner);
    panner.connect(dest);
  } else {
    gain.connect(dest);
  }
  src.start();
}

/** Starts or stops the optional music loop to match state. Silent unless a music file is supplied. */
function syncMusic(): void {
  const g = graph;
  if (!g) return;
  const now = g.ctx.currentTime;
  if (!state.music || !musicUrl) {
    const src = musicSource;
    if (!src) return;
    musicSource = null;
    rampTo(g.music.gain, 0, now, 1);
    setTimeout(() => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // already stopped
      }
    }, 1100);
    return;
  }
  if (musicSource) return;
  if (!musicBuffer) {
    if (musicLoading) return;
    musicLoading = true;
    void fetchBuffer(g.ctx, musicUrl).then((buffer) => {
      musicLoading = false;
      if (!buffer) {
        musicUrl = null;
        return;
      }
      musicBuffer = buffer;
      syncMusic();
    });
    return;
  }
  const src = g.ctx.createBufferSource();
  src.buffer = musicBuffer;
  src.loop = true;
  src.connect(g.music);
  src.start();
  musicSource = src;
  rampTo(g.music.gain, BUS_GAIN.music, now, 1.5);
}

/* -------------------------------------------------------------------- API ---- */

export const audio = {
  /** Create/resume the AudioContext. Safe to call many times; must be called from a user gesture. */
  unlock(): void {
    if (graph) {
      resumeContext(graph);
      return;
    }
    const Ctor = contextCtor();
    if (!Ctor) {
      // No WebAudio here (Node, very old browser): stay locked, note it once.
      if (!events.some((e) => e.type === 'unlock')) log('unlock', 'unavailable');
      return;
    }
    let g: Graph;
    try {
      g = buildGraph(new Ctor());
    } catch {
      log('unlock', 'failed');
      return;
    }
    graph = g;
    if (typeof document !== 'undefined') {
      hidden = document.hidden === true;
      if (!visibilityBound) {
        visibilityBound = true;
        document.addEventListener('visibilitychange', onVisibilityChange);
      }
    }
    resumeContext(g);
    log('unlock', 'ok');
    setState({ unlocked: true });
    if (state.bed !== 'none') applyBed(g, state.bed);
    void loadOverrides(g);
  },

  play(name: SoundName, opts?: { volume?: number; pan?: number; rate?: number }): void {
    const g = graph;
    if (!g || !state.unlocked) {
      log('play', `${name} (locked)`);
      return;
    }
    log('play', name);
    if (hidden) return; // context suspended: do not queue sounds for later
    const dest = UI_SOUNDS.has(name) ? g.ui : g.world;
    try {
      const buffer = overrides.get(name);
      if (buffer) playBuffer(g, buffer, dest, opts);
      else RECIPES[name](g.ctx, dest, opts);
    } catch {
      // never let a sound break the app
    }
  },

  footstep(material: FloorMaterial): void {
    const g = graph;
    if (!g || !state.unlocked) {
      log('footstep', `${material} (locked)`);
      return;
    }
    log('footstep', material);
    if (hidden) return;
    try {
      footstepRecipe(material)(g.ctx, g.world);
    } catch {
      // never let a sound break the app
    }
  },

  /** Crossfades zone beds over 1.5 s. Remembered before unlock and started on unlock. */
  setBed(bed: BedId): void {
    if (bed === state.bed) return;
    log('bed', bed);
    setState({ bed });
    if (graph) applyBed(graph, bed);
  },

  /** 0..1 proximity gains for the positional studio layers. */
  setProximity(p: { garage: number; eastGlass: number }): void {
    proximity = {
      garage: Number.isFinite(p.garage) ? clamp01(p.garage) : 0,
      eastGlass: Number.isFinite(p.eastGlass) ? clamp01(p.eastGlass) : 0,
    };
    currentBed?.setProximity?.(proximity);
  },

  /** Ambient bus -70 % while media with sound plays (0.3 s ramp). */
  duck(on: boolean): void {
    if (on === state.ducked) return;
    log('duck', on ? 'on' : 'off');
    setState({ ducked: on });
    if (graph) rampTo(graph.duck.gain, on ? DUCK_LEVEL : 1, graph.ctx.currentTime, DUCK_RAMP);
  },

  setMuted(muted: boolean): void {
    if (muted === state.muted) return;
    log('mute', muted ? 'on' : 'off');
    setState({ muted });
    savePersisted(state);
    if (graph) applyMaster(graph);
  },

  /** 0..1 master volume. */
  setVolume(v: number): void {
    if (!Number.isFinite(v)) return;
    const volume = clamp01(v);
    if (volume === state.volume) return;
    log('volume', volume.toFixed(2));
    setState({ volume });
    savePersisted(state);
    if (graph) applyMaster(graph);
  },

  /** Only audible if a music file is supplied via public/audio/manifest.json. */
  setMusic(on: boolean): void {
    if (on === state.music) return;
    setState({ music: on });
    savePersisted(state);
    syncMusic();
  },

  /** Stable snapshot: the same object is returned until something changes. */
  getState(): AudioState {
    return state;
  },

  subscribe(fn: (s: AudioState) => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  /** Debug log of everything that happened, newest last. Always recorded (cap 500). */
  events,
};
