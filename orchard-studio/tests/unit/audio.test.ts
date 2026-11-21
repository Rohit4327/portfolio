import { afterEach, describe, expect, it, vi } from 'vitest';
import { audio, SOUND_NAMES, type AudioState, type SoundName } from '../../src/audio/engine';
import { BEDS, BED_IDS, createBed } from '../../src/audio/beds';
import { FLOOR_MATERIALS, RECIPES, footstepRecipe, getNoise } from '../../src/audio/synth';

/* ------------------------------------------------- minimal fake AudioContext ---- */

interface FakeStats {
  nodes: number;
  starts: number;
  stops: number;
  rampsToZeroOrBelow: number;
  minAttack: number;
}

function makeParam(stats: FakeStats, initial = 1) {
  let lastSetTime: number | null = null;
  const param = {
    value: initial,
    setValueAtTime(v: number, t: number) {
      param.value = v;
      lastSetTime = t;
      return param;
    },
    linearRampToValueAtTime(_v: number, t: number) {
      // An envelope attack is a linear ramp that follows a setValueAtTime.
      if (lastSetTime !== null && t > lastSetTime) stats.minAttack = Math.min(stats.minAttack, t - lastSetTime);
      lastSetTime = null;
      return param;
    },
    exponentialRampToValueAtTime(v: number) {
      if (v <= 0) stats.rampsToZeroOrBelow++;
      return param;
    },
    setTargetAtTime(v: number) {
      param.value = v;
      return param;
    },
    cancelScheduledValues() {
      return param;
    },
  };
  return param;
}

function makeNode(stats: FakeStats): object {
  stats.nodes++;
  const target: Record<string | symbol, unknown> = {
    connect: (dest: unknown) => dest,
    disconnect: () => undefined,
    start: () => {
      stats.starts++;
    },
    stop: () => {
      stats.stops++;
    },
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      // Anything else that is read before being assigned is an AudioParam (gain, frequency, Q, pan...).
      const param = makeParam(stats);
      t[prop] = param;
      return param;
    },
  });
}

function makeContext() {
  const stats: FakeStats = { nodes: 0, starts: 0, stops: 0, rampsToZeroOrBelow: 0, minAttack: Infinity };
  const target: Record<string | symbol, unknown> = {
    currentTime: 0,
    sampleRate: 8000,
    state: 'running',
    destination: makeNode(stats),
    createBuffer: (_channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      return { length, sampleRate, duration: length / sampleRate, getChannelData: () => data };
    },
    resume: () => Promise.resolve(),
    suspend: () => Promise.resolve(),
    decodeAudioData: () => Promise.reject(new Error('not supported in fake')),
  };
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'string' && prop.startsWith('create')) return () => makeNode(stats);
      return undefined;
    },
  });
  return { ctx: ctx as unknown as AudioContext, stats };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/* -------------------------------------------------------------------- tests ---- */

describe('audio engine without a window', () => {
  it('imports cleanly and starts locked with defaults', () => {
    expect(typeof window).toBe('undefined');
    const s = audio.getState();
    expect(s).toMatchObject({ unlocked: false, muted: false, volume: 0.8, music: false, bed: 'none', ducked: false });
  });

  it('play before unlock records a locked event and does not throw', () => {
    const before = audio.events.length;
    expect(() => audio.play('click')).not.toThrow();
    expect(audio.events.length).toBe(before + 1);
    const last = audio.events[audio.events.length - 1];
    expect(last).toMatchObject({ type: 'play', detail: 'click (locked)' });
    expect(typeof last?.t).toBe('number');

    expect(() => audio.footstep('oak')).not.toThrow();
    expect(audio.events[audio.events.length - 1]).toMatchObject({ type: 'footstep', detail: 'oak (locked)' });
  });

  it('unlock is a safe no-op without AudioContext', () => {
    expect(() => {
      audio.unlock();
      audio.unlock();
    }).not.toThrow();
    expect(audio.getState().unlocked).toBe(false);
    expect(audio.events.filter((e) => e.type === 'unlock')).toHaveLength(1);
  });

  it('setMuted / setVolume / setBed / duck update state and notify subscribers', () => {
    const seen: AudioState[] = [];
    const unsubscribe = audio.subscribe((s) => seen.push(s));

    audio.setMuted(true);
    expect(audio.getState().muted).toBe(true);
    audio.setVolume(0.4);
    expect(audio.getState().volume).toBe(0.4);
    audio.setBed('corridor');
    expect(audio.getState().bed).toBe('corridor');
    audio.duck(true);
    expect(audio.getState().ducked).toBe(true);
    audio.setMusic(true);
    expect(audio.getState().music).toBe(true);
    expect(seen).toHaveLength(5);
    expect(seen[seen.length - 1]).toBe(audio.getState());

    audio.setVolume(7);
    expect(audio.getState().volume).toBe(1);
    audio.setVolume(Number.NaN);
    expect(audio.getState().volume).toBe(1);
    expect(() => audio.setProximity({ garage: 0.5, eastGlass: 2 })).not.toThrow();

    const types = audio.events.map((e) => `${e.type}:${e.detail}`);
    expect(types).toEqual(expect.arrayContaining(['mute:on', 'volume:0.40', 'bed:corridor', 'duck:on']));

    unsubscribe();
    const count = seen.length;
    audio.setMuted(false);
    audio.duck(false);
    audio.setBed('none');
    audio.setMusic(false);
    audio.setVolume(0.8);
    expect(seen).toHaveLength(count);
  });

  it('caps the event log at 500 entries, newest last', () => {
    const log = audio.events;
    for (let i = 0; i < 520; i++) audio.play(i % 2 === 0 ? 'hover' : 'toast');
    expect(audio.events).toBe(log);
    expect(audio.events).toHaveLength(500);
    expect(audio.events[499]).toMatchObject({ type: 'play', detail: 'toast (locked)' });
  });
});

describe('recipes', () => {
  it('has a recipe for every SoundName and nothing else', () => {
    expect(SOUND_NAMES).toHaveLength(29);
    expect(new Set(SOUND_NAMES).size).toBe(SOUND_NAMES.length);
    expect(Object.keys(RECIPES).sort()).toEqual([...SOUND_NAMES].sort());
    for (const name of SOUND_NAMES) expect(typeof RECIPES[name]).toBe('function');
  });

  it('shares one cached noise buffer per context and kind', () => {
    const a = makeContext();
    const b = makeContext();
    expect(getNoise(a.ctx, 'pink')).toBe(getNoise(a.ctx, 'pink'));
    expect(getNoise(a.ctx, 'pink')).not.toBe(getNoise(a.ctx, 'brown'));
    expect(getNoise(a.ctx, 'white')).not.toBe(getNoise(b.ctx, 'white'));
    const data = getNoise(a.ctx, 'brown').getChannelData(0);
    expect(data.every((v) => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true);
    expect(data.some((v) => v !== 0)).toBe(true);
  });

  it.each(SOUND_NAMES.map((n) => [n] as const))('%s schedules without throwing', (name: SoundName) => {
    const { ctx, stats } = makeContext();
    expect(() => RECIPES[name](ctx, ctx.destination)).not.toThrow();
    expect(() => RECIPES[name](ctx, ctx.destination, { volume: 0.5, pan: -0.4, rate: 1.2 })).not.toThrow();
    expect(stats.starts).toBeGreaterThan(0);
    // every started source is also scheduled to stop
    expect(stats.stops).toBe(stats.starts);
    // exponential ramps never target zero (which would throw in a real context)
    expect(stats.rampsToZeroOrBelow).toBe(0);
    // no harsh transients: attack of at least 4 ms
    expect(stats.minAttack).toBeGreaterThanOrEqual(0.004 - 1e-9);
  });

  it.each(FLOOR_MATERIALS.map((m) => [m] as const))('footstep on %s schedules without throwing', (material) => {
    const { ctx, stats } = makeContext();
    for (let i = 0; i < 5; i++) expect(() => footstepRecipe(material)(ctx, ctx.destination)).not.toThrow();
    expect(stats.starts).toBeGreaterThan(0);
    expect(stats.stops).toBe(stats.starts);
    expect(stats.minAttack).toBeGreaterThanOrEqual(0.004 - 1e-9);
  });
});

describe('beds', () => {
  it('has a factory for every bed except none', () => {
    expect(Object.keys(BEDS).sort()).toEqual([...BED_IDS].sort());
  });

  it.each(BED_IDS.map((b) => [b] as const))('%s builds, runs its timers and stops cleanly', (id) => {
    vi.useFakeTimers();
    const { ctx, stats } = makeContext();
    const bed = createBed(ctx, id, { garage: 1, eastGlass: 0.5 });
    expect(bed.node).toBeDefined();
    expect(stats.starts).toBeGreaterThan(0);
    const looping = stats.starts;

    expect(() => bed.setProximity?.({ garage: 0.7, eastGlass: 3 })).not.toThrow();
    // long enough for the lobby chime (40-70 s) and plenty of keyboard ticks
    expect(() => vi.advanceTimersByTime(150_000)).not.toThrow();
    if (id === 'liftLobby' || id === 'studio') expect(stats.starts).toBeGreaterThan(looping);
    expect(stats.rampsToZeroOrBelow).toBe(0);

    expect(() => {
      bed.stop();
      bed.stop();
    }).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('only the studio bed has positional layers', () => {
    const { ctx } = makeContext();
    const made = BED_IDS.map((id) => [id, createBed(ctx, id)] as const);
    for (const [id, bed] of made) {
      expect(typeof bed.setProximity).toBe(id === 'studio' ? 'function' : 'undefined');
      bed.stop();
    }
  });
});

describe('audio engine with a (fake) browser', () => {
  it('unlocks lazily, persists settings, plays, crossfades beds and pauses when hidden', async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const fake = makeContext();
    let constructed = 0;
    let suspends = 0;
    let resumes = 0;
    const target = fake.ctx as unknown as Record<string, unknown>;
    target.suspend = () => {
      suspends++;
      return Promise.resolve();
    };
    target.resume = () => {
      resumes++;
      return Promise.resolve();
    };
    const FakeAudioContext = function () {
      constructed++;
      return fake.ctx;
    };

    const store = new Map<string, string>([['orchard.audio', JSON.stringify({ muted: true, volume: 0.35 })]]);
    const localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const handlers = new Map<string, () => void>();
    const doc = {
      hidden: false,
      addEventListener: (type: string, fn: () => void) => void handlers.set(type, fn),
    };
    const fetched: string[] = [];
    vi.stubGlobal('window', { AudioContext: FakeAudioContext, localStorage });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('fetch', (url: string) => {
      fetched.push(url);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ audio: ['.gitkeep'] }) });
    });

    const { audio: a } = await import('../../src/audio/engine');

    // nothing constructed at import time or before unlock
    expect(constructed).toBe(0);
    expect(a.getState()).toMatchObject({ unlocked: false, muted: true, volume: 0.35, music: false });
    a.setBed('studio');
    a.play('click');
    expect(constructed).toBe(0);
    expect(a.events[a.events.length - 1]).toMatchObject({ type: 'play', detail: 'click (locked)' });

    a.unlock();
    a.unlock();
    expect(constructed).toBe(1);
    expect(a.getState().unlocked).toBe(true);
    expect(a.events.filter((e) => e.type === 'unlock')).toEqual([expect.objectContaining({ detail: 'ok' })]);
    expect(handlers.has('visibilitychange')).toBe(true);

    // manifest.json is not listed in available.json, so it is never requested
    await vi.advanceTimersByTimeAsync(10);
    expect(fetched).toEqual(['./available.json']);

    const startsBefore = fake.stats.starts;
    for (const name of SOUND_NAMES) a.play(name, { pan: 0.2 });
    a.footstep('stone');
    expect(fake.stats.starts).toBeGreaterThan(startsBefore);
    expect(a.events[a.events.length - 1]).toMatchObject({ type: 'footstep', detail: 'stone' });

    a.setProximity({ garage: 1, eastGlass: 1 });
    a.setBed('corridor');
    a.setBed('liftLobby');
    a.setBed('none');
    a.duck(true);
    a.setMusic(true);
    a.setMuted(false);
    a.setVolume(0.6);
    expect(JSON.parse(store.get('orchard.audio') ?? '{}')).toEqual({ muted: false, volume: 0.6, music: true });

    doc.hidden = true;
    handlers.get('visibilitychange')?.();
    expect(suspends).toBe(1);
    expect(a.events[a.events.length - 1]).toMatchObject({ type: 'suspend' });
    const startsHidden = fake.stats.starts;
    a.play('liftChime');
    expect(fake.stats.starts).toBe(startsHidden);

    target.state = 'suspended';
    doc.hidden = false;
    handlers.get('visibilitychange')?.();
    expect(resumes).toBeGreaterThanOrEqual(1);
    expect(a.events[a.events.length - 1]).toMatchObject({ type: 'resume' });

    // old beds are stopped after the crossfade and leave no timers behind
    await vi.advanceTimersByTimeAsync(2000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('survives a throwing localStorage', async () => {
    vi.resetModules();
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    vi.stubGlobal('window', { localStorage: broken });
    const { audio: a } = await import('../../src/audio/engine');
    expect(a.getState()).toMatchObject({ muted: false, volume: 0.8, music: false });
    expect(() => {
      a.setMuted(true);
      a.setVolume(0.2);
      a.setMusic(true);
      a.unlock();
    }).not.toThrow();
    expect(a.getState()).toMatchObject({ muted: true, volume: 0.2, music: true, unlocked: false });
  });
});
