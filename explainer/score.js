/*
 * Soundtrack for "Hello, World".
 * Everything is synthesized with the Web Audio API and rendered offline into one
 * AudioBuffer, so music and sound effects line up exactly with the animation clock.
 * 120 BPM: one beat = 0.5s, one bar = 2s. Progression Dm9 / Bbmaj9 / Fmaj9 / Cadd9.
 */
window.Score = (() => {
  const BEAT = 0.5;
  const BAR = 2;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const PROG = [
    { b: 38, n: [53, 57, 60, 64] }, // Dm9
    { b: 34, n: [50, 53, 57, 60] }, // Bbmaj9
    { b: 41, n: [55, 57, 60, 64] }, // Fmaj9
    { b: 36, n: [55, 60, 62, 64] }, // Cadd9
  ];
  const chordAt = (t) => PROG[Math.floor(t / BAR + 1e-6) % 4];

  // The motif that comes back in the pivot (keys) and the bridge (plucks).
  // [beat offset in a 4-bar phrase, midi, length in beats]
  const MOTIF = [
    [0, 69, 2], [1.5, 72, 1], [2.5, 74, 1.5], [4, 72, 2], [5.5, 69, 1], [6.5, 67, 1.5],
    [8, 67, 2], [9.5, 69, 1], [10.5, 72, 1.5], [12, 69, 3], [14.5, 65, 1.5],
  ];

  function rng(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Builds the events that start inside [w0, w1), shifted so w0 is time zero.
  // Rendering short windows keeps the live node count small; the windows are summed later.
  function build(ctx, cues, DUR, w0, w1, shared) {
    const R = rng(1997 + Math.round(w0));
    const sr = ctx.sampleRate;

    // ---------- buses ----------
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    const music = ctx.createGain(); music.gain.value = 0.8; music.connect(master);
    const drums = ctx.createGain(); drums.gain.value = 0.85; drums.connect(master);
    const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);

    // reverb
    const verb = ctx.createConvolver(); verb.buffer = shared.ir;
    const verbIn = ctx.createGain(); verbIn.gain.value = 1;
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.32;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);

    // dotted-eighth delay
    const dl = ctx.createDelay(2); dl.delayTime.value = 0.375;
    const dlIn = ctx.createGain(); dlIn.gain.value = 1;
    const fb = ctx.createGain(); fb.gain.value = 0.36;
    const dlTone = ctx.createBiquadFilter(); dlTone.type = 'lowpass'; dlTone.frequency.value = 2800;
    const dlOut = ctx.createGain(); dlOut.gain.value = 0.5;
    dlIn.connect(dl); dl.connect(dlTone); dlTone.connect(fb); fb.connect(dl);
    dlTone.connect(dlOut); dlOut.connect(master); dlOut.connect(verbIn);

    // shared noise
    const nb = shared.noise;

    // ---------- helpers ----------
    const osc = (type, f, t0, t1) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0);
      o.start(t0); o.stop(t1); return o;
    };
    const noise = (t0, t1) => {
      const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
      s.start(t0, R() * 1.5); s.stop(t1); return s;
    };
    const gain = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const pan = (p) => { const s = ctx.createStereoPanner(); s.pan.value = p; return s; };
    const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
    const perc = (g, t, peak, decay, attack = 0.002) => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };
    const inRange = () => true;

    // ---------- drums ----------
    function kick(t, v = 1) {
      if (!inRange(t)) return;
      const o = osc('sine', 150, t, t + 0.6);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
      const g = gain(0); perc(g, t, 0.95 * v, 0.42);
      chain(o, g, drums);
      const n = noise(t, t + 0.03); const f = filt('highpass', 2500); const gn = gain(0); perc(gn, t, 0.18 * v, 0.012);
      chain(n, f, gn, drums);
    }
    function clap(t, v = 1) {
      if (!inRange(t)) return;
      const n = noise(t, t + 0.4); const f = filt('bandpass', 1500, 0.9); const g = gain(0);
      g.gain.setValueAtTime(0, t);
      [0, 0.011, 0.023].forEach((o) => { g.gain.linearRampToValueAtTime(0.5 * v, t + o + 0.001); g.gain.linearRampToValueAtTime(0.08 * v, t + o + 0.009); });
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      const s = gain(0.25);
      chain(n, f, g, drums); g.connect(s); s.connect(verbIn);
    }
    function hat(t, v = 1, open = false) {
      if (!inRange(t)) return;
      const n = noise(t, t + 0.35); const f = filt('highpass', open ? 6500 : 8000); const g = gain(0);
      perc(g, t, 0.16 * v, open ? 0.2 : 0.035);
      chain(n, f, g, pan((R() - 0.5) * 0.5), drums);
    }

    // ---------- tonal ----------
    function bass(t, m, dur, v = 1) {
      if (!inRange(t)) return;
      const f = mtof(m);
      const o1 = osc('sawtooth', f, t, t + dur + 0.1);
      const o2 = osc('sine', f / 2, t, t + dur + 0.1);
      const lp = filt('lowpass', 900, 3);
      lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(180, t + Math.min(dur, 0.35));
      const g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.008);
      g.gain.setValueAtTime(0.2 * v, t + dur - 0.03); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
      const g2 = gain(1.6); chain(o1, lp, g, music); chain(o2, g2, g);
    }
    function sub(t, m, dur, v = 1) {
      if (!inRange(t)) return;
      const o = osc('sine', mtof(m), t, t + dur + 0.5);
      const g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3 * v, t + 0.3);
      g.gain.setValueAtTime(0.3 * v, t + dur - 0.2); g.gain.linearRampToValueAtTime(0, t + dur + 0.4);
      chain(o, g, music);
    }
    function pad(t, notes, dur, v = 1, bright = 1400) {
      if (!inRange(t)) return;
      notes.forEach((m, i) => {
        const f = mtof(m);
        const p = pan(((i / (notes.length - 1 || 1)) - 0.5) * 0.7);
        const lp = filt('lowpass', bright, 0.6);
        const g = gain(0);
        const a = Math.min(0.7, dur * 0.35);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.034 * v, t + a);
        g.gain.setValueAtTime(0.034 * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 1.1);
        [-8, 8].forEach((c) => { const o = osc('sawtooth', f, t, t + dur + 1.2); o.detune.value = c; o.connect(lp); });
        chain(lp, g, p, music);
        const s = gain(0.55); g.connect(s); s.connect(verbIn);
      });
    }
    function pluck(t, m, v = 1, dur = 0.35, send = 0.35) {
      if (!inRange(t)) return;
      const o = osc('triangle', mtof(m), t, t + dur + 0.1);
      const o2 = osc('square', mtof(m), t, t + dur + 0.1);
      const g2 = gain(0.25);
      const lp = filt('lowpass', 4200, 2); lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur);
      const g = gain(0); perc(g, t, 0.16 * v, dur);
      o.connect(lp); chain(o2, g2, lp); chain(lp, g, music);
      const s = gain(send); g.connect(s); s.connect(dlIn);
    }
    function blip(t, m, v = 1, dur = 0.09) {
      if (!inRange(t)) return;
      const o = osc('square', mtof(m), t, t + dur + 0.02);
      const lp = filt('lowpass', 3000);
      const g = gain(0); perc(g, t, 0.07 * v, dur, 0.001);
      chain(o, lp, g, pan((R() - 0.5) * 0.6), music);
    }
    function keys(t, m, len, v = 1) {
      if (!inRange(t)) return;
      const f = mtof(m);
      const o = osc('sine', f, t, t + len + 2);
      const o2 = osc('triangle', f * 2, t, t + len + 2);
      const g2 = gain(0.18);
      const g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2 * v, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.05 * v, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + 1.6);
      o.connect(g); chain(o2, g2, g); g.connect(music);
      const s = gain(0.7); g.connect(s); s.connect(verbIn);
    }

    // ---------- fx ----------
    function riser(t0, t1, v = 1) {
      const n = noise(t0, t1 + 0.02); const bp = filt('bandpass', 300, 2.2);
      bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(8000, t1);
      const g = gain(0); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35 * v, t1);
      g.gain.setValueAtTime(0, t1 + 0.01);
      chain(n, bp, g, sfx);
      const o = osc('sawtooth', 110, t0, t1 + 0.02); o.frequency.exponentialRampToValueAtTime(880, t1);
      const lp = filt('lowpass', 1800); const go = gain(0);
      go.gain.setValueAtTime(0, t0); go.gain.linearRampToValueAtTime(0.06 * v, t1); go.gain.setValueAtTime(0, t1 + 0.01);
      chain(o, lp, go, sfx);
      const s = gain(0.5); g.connect(s); s.connect(verbIn);
    }
    function impact(t, v = 1) {
      const o = osc('sine', 120, t, t + 2); o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
      const g = gain(0); perc(g, t, 1.0 * v, 1.5);
      chain(o, g, sfx);
      const n = noise(t, t + 1.5); const lp = filt('lowpass', 1400); lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.2);
      const gn = gain(0); perc(gn, t, 0.5 * v, 1.2);
      chain(n, lp, gn, sfx);
      const s = gain(0.9); gn.connect(s); s.connect(verbIn);
      const s2 = gain(0.4); g.connect(s2); s2.connect(verbIn);
    }
    function whoosh(t, dur = 0.6, v = 1) {
      const n = noise(t, t + dur + 0.05); const bp = filt('bandpass', 400, 1.4);
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.55); bp.frequency.exponentialRampToValueAtTime(600, t + dur);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * v, t + dur * 0.55); g.gain.linearRampToValueAtTime(0, t + dur);
      const p = pan(-0.7); p.pan.linearRampToValueAtTime(0.7, t + dur);
      chain(n, bp, g, p, sfx);
      const s = gain(0.3); g.connect(s); s.connect(verbIn);
    }
    function keyClick(t, v = 1) {
      const n = noise(t, t + 0.05); const bp = filt('bandpass', 3000 + R() * 2500, 1.8);
      const g = gain(0); perc(g, t, 0.35 * v * (0.7 + R() * 0.3), 0.022, 0.001);
      chain(n, bp, g, pan((R() - 0.5) * 0.4), sfx);
      const o = osc('sine', 180 + R() * 60, t, t + 0.04); const go = gain(0); perc(go, t, 0.12 * v, 0.02, 0.001);
      chain(o, go, sfx);
    }
    function thunk(t, v = 1) {
      const o = osc('sine', 220, t, t + 0.25); o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
      const g = gain(0); perc(g, t, 0.45 * v, 0.2); chain(o, g, sfx);
      keyClick(t, 1.2 * v);
    }
    function pop(t, v = 1) {
      const o = osc('sine', 500, t, t + 0.14); o.frequency.exponentialRampToValueAtTime(1300, t + 0.06);
      const g = gain(0); perc(g, t, 0.28 * v, 0.1, 0.003); chain(o, g, sfx);
      const s = gain(0.2); g.connect(s); s.connect(verbIn);
    }
    function tick(t, v = 1, f = 2200) {
      const o = osc('sine', f, t, t + 0.06); const g = gain(0); perc(g, t, 0.16 * v, 0.04, 0.001);
      chain(o, g, pan((R() - 0.5) * 0.5), sfx);
    }
    function glitch(t, dur = 0.5, v = 1) {
      const n = Math.floor(dur / 0.03);
      const ws = ctx.createWaveShaper();
      const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.round(x * 4) / 4; }
      ws.curve = curve;
      const out = gain(0.8 * v); chain(ws, out, sfx);
      for (let i = 0; i < n; i++) {
        const s = t + i * 0.03 + R() * 0.01;
        const len = 0.015 + R() * 0.025;
        if (R() < 0.6) {
          const o = osc('square', 60 + R() * 1800, s, s + len); const g = gain(0);
          g.gain.setValueAtTime(0.13, s); g.gain.setValueAtTime(0, s + len - 0.001);
          chain(o, g, pan(R() < 0.5 ? -0.6 : 0.6), ws);
        } else {
          const nn = noise(s, s + len); const g = gain(0); g.gain.setValueAtTime(0.12, s); g.gain.setValueAtTime(0, s + len - 0.001);
          chain(nn, g, ws);
        }
      }
    }
    function errorBuzz(t, v = 1) {
      [110, 116.5].forEach((f) => {
        const o = osc('square', f, t, t + 0.42); const lp = filt('lowpass', 1400);
        const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.01);
        g.gain.setValueAtTime(0.13 * v, t + 0.34); g.gain.linearRampToValueAtTime(0, t + 0.4);
        chain(o, lp, g, sfx);
      });
    }
    function shimmer(t, dur = 2.5, v = 1) {
      [81, 84, 88, 93, 96].forEach((m, i) => {
        const o = osc('sine', mtof(m), t, t + dur + 1.5);
        const lfo = osc('sine', 5 + i * 0.7, t, t + dur + 1.5); const lg = gain(mtof(m) * 0.004); chain(lfo, lg, o.frequency);
        const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03 * v, t + dur * 0.6);
        g.gain.linearRampToValueAtTime(0, t + dur + 1.2);
        chain(o, g, pan((i / 4 - 0.5) * 0.9), sfx);
        const s = gain(0.9); g.connect(s); s.connect(verbIn);
      });
    }
    function strike(t, v = 1) {
      const n = noise(t, t + 0.3); const bp = filt('bandpass', 5000, 3);
      bp.frequency.setValueAtTime(6000, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.22);
      const g = gain(0); perc(g, t, 0.35 * v, 0.22, 0.004);
      chain(n, bp, g, sfx);
    }
    function stamp(t, v = 1) {
      const o = osc('sine', 160, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
      const g = gain(0); perc(g, t, 0.7 * v, 0.35); chain(o, g, sfx);
      const n = noise(t, t + 0.2); const lp = filt('lowpass', 2000); const gn = gain(0); perc(gn, t, 0.3 * v, 0.12);
      chain(n, lp, gn, sfx);
      const s = gain(0.4); gn.connect(s); s.connect(verbIn);
    }
    function sweep(t, dur = 0.8, v = 1) {
      const o = osc('sine', 300, t, t + dur + 0.1); o.frequency.exponentialRampToValueAtTime(2600, t + dur);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1 * v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
      chain(o, g, sfx);
      whoosh(t, dur, 0.5 * v);
    }
    function success(t, v = 1) {
      pluck(t, 76, 1.4 * v, 0.3, 0.5); pluck(t + 0.09, 81, 1.4 * v, 0.5, 0.5);
    }
    function fall(t, v = 1) {
      const o = osc('sine', 900, t, t + 1.4); o.frequency.exponentialRampToValueAtTime(60, t + 1.3);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14 * v, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 1.3);
      chain(o, g, sfx);
      for (let i = 0; i < 18; i++) tick(t + 0.35 + R() * 0.9, 0.5, 400 + R() * 900);
    }
    function scramble(t, dur = 0.5, v = 1) {
      const n = Math.floor(dur * 36);
      for (let i = 0; i < n; i++) blip(t + i / 36, 72 + Math.floor(R() * 24), 0.5 * v, 0.025);
    }
    function flap(t, dur = 1, v = 1) {
      const n = Math.floor(dur * 32);
      for (let i = 0; i < n; i++) {
        const s = t + i / 32 + R() * 0.01;
        const nn = noise(s, s + 0.03); const bp = filt('bandpass', 1800 + R() * 1400, 2); const g = gain(0); perc(g, s, 0.22 * v, 0.018, 0.001);
        chain(nn, bp, g, sfx);
      }
    }
    function dissolve(t, v = 1) {
      const n = noise(t, t + 1.6); const hp = filt('highpass', 2000); hp.frequency.setValueAtTime(9000, t); hp.frequency.exponentialRampToValueAtTime(1200, t + 1.4);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14 * v, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 1.5);
      chain(n, hp, g, sfx);
      const s = gain(0.6); g.connect(s); s.connect(verbIn);
      shimmer(t, 1.2, 0.6 * v);
    }

    // ---------- windowing ----------
    const raw = { kick, clap, hat, bass, sub, pad, pluck, blip, keys, impact, whoosh, keyClick, thunk, pop, tick, glitch, errorBuzz, shimmer, strike, stamp, sweep, success, fall, scramble, flap, dissolve };
    const X = {};
    Object.entries(raw).forEach(([k, f]) => { X[k] = (t, ...a) => { if (t >= w0 && t < w1 && t < DUR) f(t - w0, ...a); }; });
    X.riser = (t0, t1, v) => { if (t0 >= w0 && t0 < w1) riser(t0 - w0, t1 - w0, v); };
    arrange(X, cues, DUR);
  }

  function arrange({ kick, clap, hat, bass, sub, pad, pluck, blip, keys, impact, whoosh, keyClick, thunk, pop, tick, glitch, errorBuzz, shimmer, strike, stamp, sweep, success, fall, scramble, flap, dissolve, riser }, cues, DUR) {
    // ---------- arrangement ----------
    const bars = (a, b, fn) => { for (let t = a; t < b - 1e-6; t += BAR) fn(t, chordAt(t)); };
    const beats = (a, b, step, fn) => { let i = 0; for (let t = a; t < b - 1e-6; t += step, i++) fn(t, i); };

    // 00 cold open: low drone, then a swell into the title
    sub(0.3, 26, 11.2, 0.4);
    sub(0.3, 38, 11.2, 0.22);
    shimmer(9.1, 2.6, 1.2);
    riser(10.2, 12, 0.9);

    // title
    bars(12, 22, (t, c) => {
      pad(t, c.n, BAR, 0.9, 1300); sub(t, c.b - 12, BAR, 0.8);
      kick(t, 0.55);
      [0, 1, 2, 3].forEach((i) => pluck(t + i * BEAT, c.n[(i + 1) % 4] + 12, 0.7, 0.4, 0.4));
    });

    // 01 origin: engineering arps, half-time drums
    bars(22, 36.6, (t, c) => {
      pad(t, c.n, BAR, 0.6, 900); bass(t, c.b, 0.9, 0.9); bass(t + 1.25, c.b, 0.6, 0.7);
      kick(t, 0.8); kick(t + 1, 0.7);
      beats(t, t + BAR, BEAT / 2, (s, i) => { hat(s, i % 2 ? 0.35 : 0.6); blip(s, c.n[[0, 1, 2, 3, 2, 1, 3, 2][i % 8]] + 12, i % 4 === 0 ? 1.2 : 0.8); });
    });
    bars(36, 42, (t, c) => { pad(t, c.n, BAR, 0.5, 700); sub(t, c.b - 12, BAR, 0.6); });

    // 02 pivot: breakdown, keys motif, then build
    bars(42, 62, (t, c) => { pad(t, c.n, BAR, 0.75, 1100); sub(t, c.b - 12, BAR, 0.6); });
    for (let p = 42; p < 60; p += 8) MOTIF.forEach(([b, m, l]) => { const s = p + b * BEAT; if (s < 61.5) keys(s, m, l * BEAT, 0.9); });
    beats(50, 62, 1, (t) => kick(t, 0.45));
    beats(54, 62, BEAT / 2, (t, i) => hat(t, i % 2 ? 0.25 : 0.4));
    riser(60.8, 64, 1);
    beats(62, 63, BEAT / 2, (t) => clap(t, 0.5));
    beats(63, 64, BEAT / 4, (t, i) => clap(t, 0.4 + i * 0.06));

    // groove used by freelance, atos, bridge and close
    function groove(a, b, o = {}) {
      const { v = 1, bright = 1800, arp = true, lead = false } = o;
      bars(a, b, (t, c) => {
        pad(t, c.n, BAR, 0.8 * v, bright);
        beats(t, t + BAR, BEAT, (s, i) => { kick(s, 0.95 * v); if (i % 2) clap(s, 0.55 * v); hat(s + BEAT / 2, 0.7 * v, true); });
        beats(t, t + BAR, BEAT / 4, (s, i) => { if (i % 2) hat(s, 0.3 * v); });
        beats(t, t + BAR, BEAT / 2, (s, i) => bass(s, c.b + (i % 4 === 3 ? 12 : 0), 0.22, 0.95 * v));
        if (arp) beats(t, t + BAR, BEAT / 2, (s, i) => pluck(s, c.n[[0, 2, 1, 3][i % 4]] + 12, 0.55 * v, 0.25, 0.3));
      });
      if (lead) for (let p = a; p < b; p += 8) MOTIF.forEach(([bt, m, l]) => { const s = p + bt * BEAT; if (s < b - 0.2) pluck(s, m + 12, 1.1 * v, Math.min(0.8, l * BEAT), 0.55); });
    }

    // 03 freelance + 04 atos
    impact(64, 0.7);
    groove(64, 80, { v: 0.9, bright: 1500 });
    groove(80, 103, { v: 1, bright: 2200 });
    bars(103, 108, (t, c) => { pad(t, c.n, BAR, 0.7, 1300); sub(t, c.b - 12, BAR, 0.6); beats(t, t + BAR, BEAT, (s) => hat(s, 0.4)); });
    riser(106.2, 108, 0.6);

    // 05 the gap: heartbeat and a dissonant pad
    bars(108, 127.5, (t) => {
      pad(t, [50, 51, 57], BAR, 0.8, 800);
      sub(t, 26, BAR, 0.7);
      kick(t, 0.8); kick(t + 0.2, 0.55);
      beats(t, t + BAR, BEAT, (s) => tick(s, 0.5, 3200));
    });
    riser(125.9, 127.5, 0.7);

    // 06 the bridge: the drop on "both."
    impact(129, 1.1);
    groove(129, 151.5, { v: 1.05, bright: 3000, lead: true });

    // 07 off the clock: chiptune
    bars(152, 164, (t, c) => {
      pad(t, c.n, BAR, 0.8, 1200);
      beats(t, t + BAR, BEAT / 4, (s, i) => blip(s, c.n[[0, 1, 2, 3][i % 4]] + (i % 8 < 4 ? 12 : 24), 2.6, 0.07));
      beats(t, t + BAR, BEAT, (s, i) => { kick(s, i % 2 ? 0.6 : 0.85); if (i % 2) clap(s, 0.5); hat(s + BEAT / 2, 0.6, true); });
      beats(t, t + BAR, BEAT / 2, (s) => blip(s, c.b + 12, 3.2, 0.18));
      sub(t, c.b - 12, BAR, 0.6);
    });

    // close
    groove(164, 173, { v: 0.75, bright: 1600, arp: false });
    bars(172, 175, (t, c) => pad(t, c.n, BAR, 0.6, 1200));
    riser(173.4, 175, 0.8);
    impact(175, 1);
    pad(175, [53, 57, 60, 64, 67], 6.5, 1.2, 1600);
    sub(175, 29, 6.5, 0.9);
    [0, 0.5, 1, 1.5, 2.5, 3].forEach((o, i) => keys(175.5 + o, [65, 69, 72, 76, 72, 77][i], 1.5, 0.7));

    // ---------- sound effects from the picture ----------
    const FX = { key: keyClick, thunk, pop, tick, glitch, error: errorBuzz, shimmer, strike, stamp, sweep, success, fall, scramble, flap, dissolve, whoosh, impact, riser: (t, d) => riser(t, t + d) };
    cues.forEach(([t, type, a, b]) => { const f = FX[type]; if (f && t < DUR) f(t, a, b); });
  }

  const WIN = 12, TAIL = 6;
  async function render(cues, DUR, sampleRate = 48000, onProgress) {
    const R = rng(7);
    const irLen = Math.floor(sampleRate * 2.8);
    const ir = new AudioBuffer({ numberOfChannels: 2, length: irLen, sampleRate });
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / irLen, 3.4); }
    const noise = new AudioBuffer({ numberOfChannels: 1, length: sampleRate * 2, sampleRate });
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
    const shared = { ir, noise };

    const total = Math.ceil(sampleRate * DUR);
    const mix = [new Float32Array(total), new Float32Array(total)];
    const wins = [];
    for (let w0 = 0; w0 < DUR; w0 += WIN) wins.push(w0);
    let done = 0;
    await Promise.all(wins.map(async (w0) => {
      const w1 = Math.min(DUR, w0 + WIN);
      const len = Math.ceil(sampleRate * (w1 - w0 + TAIL));
      const ctx = new OfflineAudioContext(2, len, sampleRate);
      build(ctx, cues, DUR, w0, w1, shared);
      const b = await ctx.startRendering();
      const off = Math.round(w0 * sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c), m = mix[c];
        const n = Math.min(d.length, total - off);
        for (let i = 0; i < n; i++) m[off + i] += d[i];
      }
      done++;
      if (onProgress) onProgress(done / wins.length);
    }));

    // master bus: fade out, then one compressor pass over the summed mix
    const fadeN = Math.round(1.2 * sampleRate);
    for (let c = 0; c < 2; c++) for (let i = 0; i < fadeN; i++) mix[c][total - 1 - i] *= i / fadeN;
    const pre = new AudioBuffer({ numberOfChannels: 2, length: total, sampleRate });
    pre.copyToChannel(mix[0], 0); pre.copyToChannel(mix[1], 1);
    const mctx = new OfflineAudioContext(2, total, sampleRate);
    const src = mctx.createBufferSource(); src.buffer = pre;
    const comp = mctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    src.connect(comp); comp.connect(mctx.destination); src.start(0);
    const buf = await mctx.startRendering();
    // normalize to -1 dBFS
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
    const k = peak > 0 ? 0.89 / peak : 1;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
    return buf;
  }

  function toWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
    ws(36, 'data'); out.setUint32(40, len * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Uint8Array(out.buffer);
  }

  return { render, toWav };
})();
