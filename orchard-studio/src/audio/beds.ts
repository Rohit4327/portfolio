/**
 * Looping ambient beds, built from looping noise buffers and slow oscillators.
 * Each bed returns { node, stop }. `node.gain` is reserved for the engine's crossfade;
 * internal levels are set on inner nodes.
 */
import { envelope, getNoise, type NoiseKind } from './synth';

export type BedId = 'none' | 'presentation' | 'liftLobby' | 'corridor' | 'studio';
export type ActiveBedId = Exclude<BedId, 'none'>;
export const BED_IDS: readonly ActiveBedId[] = ['presentation', 'liftLobby', 'corridor', 'studio'];

export interface Proximity {
  garage: number;
  eastGlass: number;
}

export interface Bed {
  node: GainNode;
  stop(): void;
  /** Only the studio bed has positional layers. */
  setProximity?(p: Proximity): void;
}

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
const rnd = (min: number, max: number): number => min + Math.random() * (max - min);

/** Bookkeeping shared by all beds: sources to stop, timers to clear. */
class Rig {
  readonly node: GainNode;
  private sources: AudioScheduledSourceNode[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private stopped = false;

  constructor(readonly ctx: BaseAudioContext) {
    this.node = ctx.createGain();
  }

  get running(): boolean {
    return !this.stopped && ctx_running(this.ctx);
  }

  gain(value: number, dest: AudioNode = this.node): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    g.connect(dest);
    return g;
  }

  /** Looping filtered noise into `dest`. */
  noise(kind: NoiseKind, type: BiquadFilterType, freq: number, q: number, level: number, dest: AudioNode): GainNode {
    const src = this.ctx.createBufferSource();
    src.buffer = getNoise(this.ctx, kind);
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = this.gain(level, dest);
    src.connect(filter);
    filter.connect(g);
    src.start(this.ctx.currentTime, Math.random() * 2);
    this.sources.push(src);
    return g;
  }

  /** Steady sine into `dest`. */
  hum(freq: number, level: number, dest: AudioNode): GainNode {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = this.gain(level, dest);
    osc.connect(g);
    osc.start();
    this.sources.push(osc);
    return g;
  }

  /** Slow sine LFO added onto a param (e.g. a gain) for swells and drift. */
  lfo(hz: number, depth: number, target: AudioParam): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const amount = this.ctx.createGain();
    amount.gain.value = depth;
    osc.connect(amount);
    amount.connect(target);
    osc.start();
    this.sources.push(osc);
  }

  /** Repeats `fn` with a fresh random delay each time until the bed stops. */
  every(delayMs: () => number, fn: () => void): void {
    const schedule = (): void => {
      if (this.stopped) return;
      const id = setTimeout(() => {
        this.timers.delete(id);
        if (this.stopped) return;
        // Skip while the context is suspended (hidden tab) so nothing piles up at one timestamp.
        if (this.running) fn();
        schedule();
      }, delayMs());
      this.timers.add(id);
    };
    schedule();
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.timers.forEach((id) => clearTimeout(id));
    this.timers.clear();
    for (const s of this.sources) {
      try {
        s.stop();
        s.disconnect();
      } catch {
        // already stopped
      }
    }
    this.sources = [];
    try {
      this.node.disconnect();
    } catch {
      // not connected
    }
  }
}

function ctx_running(ctx: BaseAudioContext): boolean {
  return ctx.state === 'running';
}

/** Soft room tone: very low brown noise and a faint 60 Hz. */
function roomTone(rig: Rig, level: number): void {
  rig.noise('brown', 'lowpass', 220, 0.5, 0.9 * level, rig.node);
  rig.hum(60, 0.02 * level, rig.node);
}

function presentation(ctx: BaseAudioContext): Bed {
  const rig = new Rig(ctx);
  roomTone(rig, 1);
  return { node: rig.node, stop: () => rig.stop() };
}

function liftLobby(ctx: BaseAudioContext): Bed {
  const rig = new Rig(ctx);
  rig.noise('brown', 'lowpass', 300, 0.5, 0.45, rig.node);
  const hum = rig.gain(1);
  rig.hum(100, 0.11, hum);
  rig.hum(200, 0.035, hum);
  rig.lfo(0.09, 0.12, hum.gain);

  // A distant, soft chime every 40-70 s.
  rig.every(
    () => rnd(40_000, 70_000),
    () => {
      const t = ctx.currentTime;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      lp.connect(rig.node);
      for (const [freq, peak, decay] of [
        [784, 0.1, 2.6],
        [1176, 0.03, 1.4],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        const end = envelope(g.gain, t, 0.03, 0, decay, peak);
        osc.connect(g);
        g.connect(lp);
        osc.start(t);
        osc.stop(end + 0.05);
      }
    },
  );
  return { node: rig.node, stop: () => rig.stop() };
}

function corridor(ctx: BaseAudioContext): Bed {
  const rig = new Rig(ctx);
  // HVAC air: band-passed noise centred between 300 and 900 Hz, breathing very slowly.
  const air = rig.noise('pink', 'bandpass', 520, 0.7, 0.55, rig.node);
  rig.lfo(0.07, 0.07, air.gain);
  rig.noise('brown', 'lowpass', 160, 0.5, 0.35, rig.node);
  return { node: rig.node, stop: () => rig.stop() };
}

function studio(ctx: BaseAudioContext, initial?: Proximity): Bed {
  const rig = new Rig(ctx);
  roomTone(rig, 0.8);
  rig.noise('pink', 'lowpass', 1800, 0.5, 0.03, rig.node);

  // Garage layer: a low wordless murmur plus sparse, very faint keyboard ticks.
  let garageLevel = clamp01(initial?.garage ?? 0);
  const garage = rig.gain(garageLevel);
  const murmur = rig.noise('pink', 'bandpass', 320, 0.9, 0.32, garage);
  rig.lfo(0.23, 0.1, murmur.gain);
  rig.lfo(0.61, 0.07, murmur.gain);
  const murmurHigh = rig.noise('pink', 'bandpass', 440, 1.4, 0.12, garage);
  rig.lfo(0.37, 0.07, murmurHigh.gain);

  rig.every(
    // Typing comes in little runs with pauses between them.
    () => (Math.random() < 0.72 ? rnd(90, 260) : rnd(700, 2600)),
    () => {
      if (garageLevel < 0.02) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = getNoise(ctx, 'white');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = rnd(1700, 2900);
      bp.Q.value = 1.6;
      const g = ctx.createGain();
      const end = envelope(g.gain, t, 0.004, 0, rnd(0.008, 0.016), rnd(0.04, 0.1));
      src.connect(bp);
      bp.connect(g);
      g.connect(garage);
      src.start(t, Math.random() * 3);
      src.stop(end + 0.03);
    },
  );

  // East glass layer: filtered city traffic, low-passed brown noise with slow swells.
  const east = rig.gain(clamp01(initial?.eastGlass ?? 0));
  const traffic = rig.noise('brown', 'lowpass', 180, 0.5, 0.75, east);
  rig.lfo(0.05, 0.22, traffic.gain);
  rig.lfo(0.013, 0.18, traffic.gain);
  rig.noise('pink', 'bandpass', 600, 0.6, 0.04, east);

  return {
    node: rig.node,
    stop: () => rig.stop(),
    setProximity(p) {
      garageLevel = clamp01(p.garage);
      const now = ctx.currentTime;
      garage.gain.setTargetAtTime(garageLevel, now, 0.25);
      east.gain.setTargetAtTime(clamp01(p.eastGlass), now, 0.25);
    },
  };
}

export const BEDS: Record<ActiveBedId, (ctx: BaseAudioContext, proximity?: Proximity) => Bed> = {
  presentation,
  liftLobby,
  corridor,
  studio,
};

export function createBed(ctx: BaseAudioContext, id: ActiveBedId, proximity?: Proximity): Bed {
  return BEDS[id](ctx, proximity);
}
