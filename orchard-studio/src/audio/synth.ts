/**
 * Synthesised sound recipes. Every sound is built from oscillators, filtered noise and envelopes,
 * scheduled at ctx.currentTime. No audio files are needed.
 *
 * Character: soft, warm, woody, glassy. Every voice has >= 4 ms attack, an exponential release and
 * sits behind a gentle low-pass. No square waves.
 */

export const SOUND_NAMES = [
  'hover',
  'click',
  'layoutSwitch',
  'cardOpen',
  'cardClose',
  'diveSwell',
  'liftChime',
  'liftDoor',
  'badgeAccept',
  'glassDoor',
  'kioskTap',
  'kioskSwipe',
  'devicePickup',
  'qrBeep',
  'orbTone',
  'headsetOn',
  'headsetOff',
  'vitrineTick',
  'castorRoll',
  'penStroke',
  'rodSpin',
  'kick',
  'ballHit',
  'goalChime',
  'shutter',
  'countdownTick',
  'paperUnfold',
  'zoneTone',
  'toast',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];
export type FloorMaterial = 'stone' | 'carpet' | 'oak';
export const FLOOR_MATERIALS: readonly FloorMaterial[] = ['stone', 'carpet', 'oak'];

export interface PlayOpts {
  volume?: number;
  pan?: number;
  rate?: number;
}
export type Recipe = (ctx: BaseAudioContext, dest: AudioNode, opts?: PlayOpts) => void;

/* ------------------------------------------------------------------ noise ---- */

export type NoiseKind = 'white' | 'pink' | 'brown';

const NOISE_SECONDS = 4;
const noiseCache = new WeakMap<BaseAudioContext, Partial<Record<NoiseKind, AudioBuffer>>>();

function fillNoise(data: Float32Array, kind: NoiseKind): void {
  const n = data.length;
  if (n === 0) return;
  if (kind === 'white') {
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return;
  }
  if (kind === 'pink') {
    // Paul Kellet's economy pink filter.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      data[i] = b0 + b1 + b2 + w * 0.1848;
    }
  } else {
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last;
    }
  }
  // Remove the drift between the two ends so the buffer loops without a click, then normalise.
  const first = data[0] ?? 0;
  const drift = (data[n - 1] ?? 0) - first;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const v = (data[i] ?? 0) - (drift * i) / n;
    data[i] = v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  if (peak > 0) {
    const k = 0.9 / peak;
    for (let i = 0; i < n; i++) data[i] = (data[i] ?? 0) * k;
  }
}

/** Shared, cached, loopable mono noise buffer for a context. */
export function getNoise(ctx: BaseAudioContext, kind: NoiseKind = 'white'): AudioBuffer {
  let entry = noiseCache.get(ctx);
  if (!entry) {
    entry = {};
    noiseCache.set(ctx, entry);
  }
  const cached = entry[kind];
  if (cached) return cached;
  const length = Math.max(1, Math.floor(ctx.sampleRate * NOISE_SECONDS));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  fillNoise(buffer.getChannelData(0), kind);
  entry[kind] = buffer;
  return buffer;
}

/* ---------------------------------------------------------------- helpers ---- */

export const MIN_ATTACK = 0.004;
const SILENT = 0.0001;

const rnd = (min: number, max: number): number => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Attack (linear, >= 4 ms) → optional hold → exponential release. Returns the end time. */
export function envelope(
  param: AudioParam,
  t: number,
  attack: number,
  hold: number,
  decay: number,
  peak: number,
): number {
  const a = Math.max(attack, MIN_ATTACK);
  const p = Math.max(peak, SILENT * 2);
  param.setValueAtTime(SILENT, t);
  param.linearRampToValueAtTime(p, t + a);
  if (hold > 0) param.setValueAtTime(p, t + a + hold);
  const end = t + a + Math.max(hold, 0) + Math.max(decay, 0.005);
  param.exponentialRampToValueAtTime(SILENT, end);
  return end;
}

interface Voice {
  ctx: BaseAudioContext;
  /** Recipe output chain input (volume → low-pass → pan → bus). */
  out: AudioNode;
  t: number;
  rate: number;
}

/** Builds the per-sound output chain: volume → gentle low-pass → optional pan → dest. */
function begin(ctx: BaseAudioContext, dest: AudioNode, opts: PlayOpts | undefined, cutoff: number): Voice {
  const volume = clamp(opts?.volume ?? 1, 0, 2);
  const rate = clamp(opts?.rate ?? 1, 0.25, 4);
  const pan = clamp(opts?.pan ?? 0, -1, 1);
  const input = ctx.createGain();
  input.gain.value = volume;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(cutoff * Math.max(rate, 1), 9000);
  lp.Q.value = 0.5;
  input.connect(lp);
  if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    lp.connect(panner);
    panner.connect(dest);
  } else {
    lp.connect(dest);
  }
  return { ctx, out: input, t: ctx.currentTime, rate };
}

interface ToneSpec {
  type?: 'sine' | 'triangle';
  /** Start frequency (Hz). */
  f: number;
  /** Optional end frequency for an exponential glide over the whole note. */
  f2?: number;
  /** Start offset in seconds. */
  at?: number;
  a?: number;
  hold?: number;
  d: number;
  peak: number;
  dest?: AudioNode;
}

function tone(v: Voice, s: ToneSpec): void {
  const t = v.t + (s.at ?? 0);
  const osc = v.ctx.createOscillator();
  osc.type = s.type ?? 'sine';
  const g = v.ctx.createGain();
  const end = envelope(g.gain, t, s.a ?? MIN_ATTACK, s.hold ?? 0, s.d, s.peak);
  osc.frequency.setValueAtTime(s.f * v.rate, t);
  if (s.f2 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, s.f2 * v.rate), end);
  osc.connect(g);
  g.connect(s.dest ?? v.out);
  osc.start(t);
  osc.stop(end + 0.05);
}

interface NoiseSpec {
  kind?: NoiseKind;
  filter?: 'lowpass' | 'bandpass' | 'highpass';
  f: number;
  f2?: number;
  q?: number;
  at?: number;
  a?: number;
  hold?: number;
  d: number;
  peak: number;
  dest?: AudioNode;
}

function noise(v: Voice, s: NoiseSpec): void {
  const t = v.t + (s.at ?? 0);
  const buffer = getNoise(v.ctx, s.kind ?? 'white');
  const src = v.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.playbackRate.value = v.rate;
  const filter = v.ctx.createBiquadFilter();
  filter.type = s.filter ?? 'bandpass';
  filter.Q.value = s.q ?? 0.8;
  const g = v.ctx.createGain();
  const end = envelope(g.gain, t, s.a ?? MIN_ATTACK, s.hold ?? 0, s.d, s.peak);
  filter.frequency.setValueAtTime(s.f, t);
  if (s.f2 !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(10, s.f2), end);
  src.connect(filter);
  filter.connect(g);
  g.connect(s.dest ?? v.out);
  // Random offset into the shared buffer so repeated sounds never sound identical.
  src.start(t, Math.random() * Math.max(0, NOISE_SECONDS - 0.5));
  src.stop(end + 0.05);
}

/** A gain stage whose level wobbles (tremolo / flutter). Route voices into the returned node. */
function wobble(v: Voice, hz: number, depth: number, duration: number): GainNode {
  const stage = v.ctx.createGain();
  stage.gain.value = 1 - depth;
  const lfo = v.ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = hz;
  const amount = v.ctx.createGain();
  amount.gain.value = depth;
  lfo.connect(amount);
  amount.connect(stage.gain);
  stage.connect(v.out);
  lfo.start(v.t);
  lfo.stop(v.t + duration + 0.1);
  return stage;
}

/* ---------------------------------------------------------------- recipes ---- */

const E5 = 659.26;
const A5 = 880;

const hover: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 5000);
  noise(v, { f: 2500, q: 1.4, a: 0.004, d: 0.011, peak: 0.05 });
};

const click: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3500);
  tone(v, { f: 620, f2: 420, a: 0.004, d: 0.056, peak: 0.2 });
  tone(v, { type: 'triangle', f: 210, f2: 170, at: 0.012, a: 0.005, d: 0.035, peak: 0.06 });
};

const layoutSwitch: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4500);
  noise(v, { kind: 'pink', f: 400, f2: 1800, q: 1.1, a: 0.12, d: 0.23, peak: 0.12 });
};

const cardOpen: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3500);
  tone(v, { f: 440, a: 0.006, d: 0.11, peak: 0.13 });
  tone(v, { f: 587.33, at: 0.06, a: 0.006, d: 0.16, peak: 0.12 });
};

const cardClose: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3500);
  tone(v, { f: 587.33, a: 0.006, d: 0.11, peak: 0.12 });
  tone(v, { f: 440, at: 0.06, a: 0.006, d: 0.16, peak: 0.12 });
};

const diveSwell: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 2400);
  tone(v, { f: 110, a: 1.6, hold: 0.6, d: 1.8, peak: 0.16 });
  tone(v, { f: 110.9, a: 1.6, hold: 0.6, d: 1.8, peak: 0.16 });
  tone(v, { f: 165.2, a: 1.9, hold: 0.4, d: 1.7, peak: 0.07 });
  noise(v, { kind: 'pink', filter: 'lowpass', f: 380, f2: 1200, q: 0.6, a: 1.8, hold: 0.4, d: 1.8, peak: 0.07 });
};

const liftChime: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4200);
  tone(v, { f: 880, a: 0.006, d: 1.2, peak: 0.2 });
  tone(v, { f: 1320, a: 0.006, d: 0.7, peak: 0.06 });
};

const liftDoor: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 1400);
  noise(v, { kind: 'brown', filter: 'lowpass', f: 260, f2: 380, q: 0.6, a: 0.25, hold: 0.5, d: 0.45, peak: 0.5 });
  tone(v, { f: 90, a: 0.25, hold: 0.5, d: 0.45, peak: 0.05 });
};

const badgeAccept: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4200);
  [E5, A5].forEach((f, i) => {
    const at = i * 0.12;
    tone(v, { f, at, a: 0.006, d: 0.36, peak: 0.17 });
    tone(v, { type: 'triangle', f, at, a: 0.008, d: 0.2, peak: 0.04 });
  });
};

const glassDoor: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3800);
  noise(v, { kind: 'pink', f: 1100, f2: 1300, q: 1.3, a: 0.25, hold: 0.3, d: 0.35, peak: 0.12 });
};

const kioskTap: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4500);
  tone(v, { f: 1300, f2: 1080, a: 0.004, d: 0.05, peak: 0.1 });
  noise(v, { f: 2000, q: 1.2, a: 0.004, d: 0.012, peak: 0.04 });
};

const kioskSwipe: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4500);
  noise(v, { kind: 'pink', f: 900, f2: 2400, q: 1, a: 0.05, d: 0.13, peak: 0.09 });
};

const devicePickup: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3600);
  noise(v, { kind: 'pink', f: 500, f2: 1500, q: 1, a: 0.04, d: 0.13, peak: 0.1 });
  tone(v, { f: 440, f2: 620, at: 0.02, a: 0.01, d: 0.12, peak: 0.07 });
};

const qrBeep: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3800);
  tone(v, { f: 1000, a: 0.008, hold: 0.047, d: 0.035, peak: 0.12 });
};

const orbTone: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3600);
  const shimmer = wobble(v, 5.5, 0.22, 1.3);
  [520, 650, 780].forEach((f, i) => {
    tone(v, { f, at: i * 0.03, a: 0.08, hold: 0.1, d: 1.0, peak: 0.09, dest: shimmer });
  });
};

const headsetOn: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3000);
  tone(v, { f: 180, f2: 58, a: 0.02, d: 0.55, peak: 0.32 });
  noise(v, { kind: 'pink', f: 1500, q: 0.7, a: 0.5, d: 0.4, peak: 0.06 });
};

const headsetOff: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3000);
  noise(v, { kind: 'pink', f: 1500, q: 0.7, a: 0.02, d: 0.6, peak: 0.06 });
  tone(v, { f: 58, f2: 180, at: 0.08, a: 0.3, d: 0.3, peak: 0.26 });
};

const vitrineTick: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 6000);
  tone(v, { f: 2400, a: 0.004, d: 0.05, peak: 0.06 });
  tone(v, { f: 3600, a: 0.004, d: 0.03, peak: 0.025 });
};

const castorRoll: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 900);
  const flutter = wobble(v, 11, 0.18, 1.3);
  noise(v, { kind: 'brown', filter: 'lowpass', f: 200, q: 0.7, a: 0.15, hold: 0.6, d: 0.45, peak: 0.6, dest: flutter });
  noise(v, { kind: 'pink', f: 420, q: 2, a: 0.15, hold: 0.6, d: 0.45, peak: 0.04, dest: flutter });
};

const penStroke: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 6000);
  const dur = rnd(0.08, 0.14);
  noise(v, { f: rnd(2700, 3300), q: 1.5, a: dur * 0.35, d: dur * 0.65, peak: 0.035 });
};

const rodSpin: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4500);
  noise(v, { f: 700, f2: 2600, q: 3, a: 0.03, d: 0.09, peak: 0.16 });
};

const kick: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 2600);
  tone(v, { f: 185, f2: 110, a: 0.004, d: 0.09, peak: 0.4 });
  tone(v, { type: 'triangle', f: 420, a: 0.004, d: 0.04, peak: 0.1 });
  noise(v, { f: 900, q: 1.5, a: 0.004, d: 0.02, peak: 0.08 });
};

const ballHit: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 5000);
  tone(v, { f: 900, f2: 620, a: 0.004, d: 0.035, peak: 0.22 });
  tone(v, { type: 'triangle', f: 1700, a: 0.004, d: 0.02, peak: 0.06 });
  noise(v, { f: 2500, q: 1.2, a: 0.004, d: 0.012, peak: 0.06 });
};

const goalChime: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 5000);
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const at = i * 0.11;
    tone(v, { f, at, a: 0.006, d: 0.5 + i * 0.15, peak: 0.16 });
    tone(v, { f: f * 2, at, a: 0.006, d: 0.25, peak: 0.035 });
  });
};

const shutter: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3200);
  [0, 0.04].forEach((at, i) => {
    noise(v, { filter: 'lowpass', f: i === 0 ? 2200 : 1700, q: 0.7, at, a: 0.004, d: 0.03, peak: 0.22 });
    tone(v, { f: i === 0 ? 160 : 130, at, a: 0.004, d: 0.025, peak: 0.08 });
  });
};

const countdownTick: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4200);
  tone(v, { f: 820, a: 0.004, d: 0.06, peak: 0.24 });
  tone(v, { f: 1640, a: 0.004, d: 0.03, peak: 0.05 });
  noise(v, { f: 1200, q: 2, a: 0.004, d: 0.01, peak: 0.04 });
};

const paperUnfold: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 6500);
  noise(v, { kind: 'pink', f: 2600, q: 0.8, a: 0.08, hold: 0.2, d: 0.22, peak: 0.02 });
  const grains = 22;
  for (let i = 0; i < grains; i++) {
    const at = (i / grains) * 0.45 + rnd(0, 0.02);
    noise(v, { f: rnd(2200, 4600), q: rnd(1, 3), at, a: 0.004, d: rnd(0.012, 0.04), peak: rnd(0.02, 0.09) });
  }
};

const zoneTone: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 2400);
  tone(v, { f: 330, a: 0.06, d: 0.54, peak: 0.06 });
};

const toast: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3800);
  tone(v, { f: 740, f2: 880, a: 0.006, d: 0.12, peak: 0.1 });
};

export const RECIPES: Record<SoundName, Recipe> = {
  hover,
  click,
  layoutSwitch,
  cardOpen,
  cardClose,
  diveSwell,
  liftChime,
  liftDoor,
  badgeAccept,
  glassDoor,
  kioskTap,
  kioskSwipe,
  devicePickup,
  qrBeep,
  orbTone,
  headsetOn,
  headsetOff,
  vitrineTick,
  castorRoll,
  penStroke,
  rodSpin,
  kick,
  ballHit,
  goalChime,
  shutter,
  countdownTick,
  paperUnfold,
  zoneTone,
  toast,
};

/* -------------------------------------------------------------- footsteps ---- */

const stoneStep: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 4500);
  tone(v, { f: 95, f2: 60, a: 0.004, d: 0.07, peak: 0.3 });
  noise(v, { kind: 'pink', filter: 'lowpass', f: 420, q: 0.7, a: 0.004, d: 0.04, peak: 0.16 });
  noise(v, { f: 3200, q: 1.5, at: 0.003, a: 0.004, d: 0.012, peak: 0.03 });
};

const carpetStep: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 500);
  tone(v, { f: 80, f2: 55, a: 0.008, d: 0.09, peak: 0.2 });
  noise(v, { kind: 'brown', filter: 'lowpass', f: 250, q: 0.6, a: 0.008, d: 0.08, peak: 0.4 });
};

const oakStep: Recipe = (ctx, dest, opts) => {
  const v = begin(ctx, dest, opts, 3000);
  tone(v, { f: 170, f2: 122, a: 0.004, d: 0.1, peak: 0.28 });
  tone(v, { type: 'triangle', f: 340, a: 0.004, d: 0.06, peak: 0.07 });
  noise(v, { f: 700, q: 4, a: 0.004, d: 0.03, peak: 0.12 });
};

const STEPS: Record<FloorMaterial, Recipe> = { stone: stoneStep, carpet: carpetStep, oak: oakStep };

/** Footstep for a floor material, with slight random pitch and level variation per step. */
export function footstepRecipe(material: FloorMaterial): Recipe {
  const base = STEPS[material];
  return (ctx, dest, opts) => {
    base(ctx, dest, {
      volume: (opts?.volume ?? 1) * rnd(0.82, 1),
      rate: (opts?.rate ?? 1) * rnd(0.92, 1.08),
      pan: opts?.pan ?? rnd(-0.06, 0.06),
    });
  };
}
