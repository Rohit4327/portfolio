/*
 * Score for "Into the UX-Verse": a synthesized, cinematic space score in A minor.
 * Pipe organ, ticking clock, string ostinato, BRAAAM brass, taiko, choir and
 * Shepard-tone risers; piano, pizzicato and music box for the paper chapter.
 * Rendered offline in 12-second windows (each with its own effects and a 6s tail),
 * summed, then run through one master compressor, so it stays fast to build.
 */
window.Score = (() => {
  const BEAT = 0.5, BAR = 2;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PROG = [
    { b: 45, n: [57, 60, 64, 71] }, // Am(add9)
    { b: 41, n: [57, 60, 65, 69] }, // F
    { b: 48, n: [55, 60, 64, 67] }, // C
    { b: 43, n: [55, 59, 62, 67] }, // G
  ];
  const FIN = [[180, { b: 45, n: [57, 60, 64, 69] }], [181.6, { b: 41, n: [53, 57, 60, 65, 69] }], [185.6, { b: 43, n: [55, 59, 62, 67, 71] }], [189.6, { b: 45, n: [57, 61, 64, 69, 73] }]];
  function chordAt(t) {
    if (t >= 180) { let c = FIN[0][1]; for (const [s, ch] of FIN) if (t >= s - 1e-6) c = ch; return c; }
    return PROG[Math.floor(t / 4 + 1e-6) % 4];
  }
  const BOX = [[0, 76], [1, 79], [1.5, 81], [2.5, 79], [3, 76], [4, 74], [5, 72], [6, 69], [7, 72]];

  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function build(ctx, cues, DUR, w0, w1, shared) {
    const R = rng(2026 + Math.round(w0));
    const master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    const music = ctx.createGain(); music.gain.value = 0.75; music.connect(master);
    const drums = ctx.createGain(); drums.gain.value = 0.9; drums.connect(master);
    const sfxB = ctx.createGain(); sfxB.gain.value = 0.85; sfxB.connect(master);
    const verb = ctx.createConvolver(); verb.buffer = shared.ir;
    const verbIn = ctx.createGain(); const verbOut = ctx.createGain(); verbOut.gain.value = 0.42;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);
    const nb = shared.noise;
    const real = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const imag = new Float32Array([0, 1, 0.62, 0.34, 0.3, 0.1, 0.16, 0.02, 0.1, 0.02, 0.05, 0, 0.04, 0, 0, 0, 0.03]);
    const organWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    // ---- helpers ----
    const osc = (type, f, t0, t1) => { const o = ctx.createOscillator(); if (type === 'organ') o.setPeriodicWave(organWave); else o.type = type; o.frequency.setValueAtTime(f, t0); o.start(t0); o.stop(t1); return o; };
    const noise = (t0, t1) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t0, R() * 1.5); s.stop(t1); return s; };
    const gain = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const pan = (p) => { const s = ctx.createStereoPanner(); s.pan.value = p; return s; };
    const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
    const send = (node, amt) => { const s = gain(amt); node.connect(s); s.connect(verbIn); };
    const perc = (g, t, peak, decay, attack = 0.002) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); };
    const env = (g, t, peak, a, hold, r) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.linearRampToValueAtTime(0, t + a + hold + r); };
    const shaper = (k = 3) => { const w = ctx.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } w.curve = c; return w; };

    // ---- instruments ----
    function organ(t, notes, dur, v = 1, bright = 3200) {
      notes.forEach((m, i) => {
        const g = gain(0), lp = filt('lowpass', bright, 0.5), p = pan(((i / Math.max(1, notes.length - 1)) - 0.5) * 0.6);
        env(g, t, 0.05 * v, 0.28, Math.max(0.05, dur - 0.28), 1.6);
        [0, 4].forEach((c) => { const o = osc('organ', mtof(m), t, t + dur + 1.8); o.detune.value = c; o.connect(lp); });
        chain(lp, g, p, music); send(g, 0.75);
      });
    }
    function strings(t, m, len, v = 1, acc = 1) {
      const lp = filt('lowpass', 900 + 2200 * v * acc, 0.8), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * v * acc, t + 0.006); g.gain.exponentialRampToValueAtTime(0.02 * v * acc, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.06);
      [-7, 0, 7].forEach((c) => { const o = osc('sawtooth', mtof(m), t, t + len + 0.1); o.detune.value = c; o.connect(lp); });
      chain(lp, g, music); send(g, 0.3);
    }
    function pad(t, notes, dur, v = 1) {
      notes.forEach((m, i) => {
        const lp = filt('lowpass', 1600, 0.4), g = gain(0);
        env(g, t, 0.022 * v, 0.9, Math.max(0.1, dur - 0.9), 1.6);
        [-9, 9].forEach((c) => { const o = osc('sawtooth', mtof(m), t, t + dur + 1.8); o.detune.value = c; o.connect(lp); });
        chain(lp, g, pan((i % 2 ? 0.3 : -0.3)), music); send(g, 0.6);
      });
    }
    function choir(t, notes, dur, v = 1) {
      notes.forEach((m, i) => {
        const sum = gain(1), g = gain(0);
        const lfo = osc('sine', 4.6 + i * 0.3, t, t + dur + 2), lg = gain(9);
        [-6, 6].forEach((c) => {
          const o = osc('sawtooth', mtof(m), t, t + dur + 2); o.detune.value = c; chain(lfo, lg, o.detune);
          [[800, 9, 1], [1150, 11, 0.5], [2900, 13, 0.25]].forEach(([f, q, a]) => { const bp = filt('bandpass', f, q), ag = gain(a); chain(o, bp, ag, sum); });
        });
        env(g, t, 0.05 * v, 1.1, Math.max(0.1, dur - 1.1), 1.8);
        chain(sum, g, pan(i % 2 ? 0.35 : -0.35), music); send(g, 0.85);
      });
    }
    function braam(t, root = 33, dur = 2.4, v = 1, third = 0) {
      const ws = shaper(4), lp = filt('lowpass', 180, 1.2), g = gain(0);
      lp.frequency.setValueAtTime(160, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 0.22); lp.frequency.exponentialRampToValueAtTime(700, t + dur);
      env(g, t, 0.34 * v, 0.05, Math.max(0.1, dur - 0.05), 1.4);
      [root, root + 7, root + 12, ...(third ? [root + 12 + third] : [])].forEach((m) => {
        [['sawtooth', 0], ['sawtooth', 14], ['square', -10]].forEach(([ty, c]) => { const o = osc(ty, mtof(m), t, t + dur + 1.5); o.detune.value = c; o.connect(ws); });
      });
      chain(ws, lp, g, music); send(g, 0.65);
      const sb = osc('sine', mtof(root - 12), t, t + dur + 1.5), sg = gain(0); env(sg, t, 0.45 * v, 0.03, dur, 1.2); chain(sb, sg, music);
    }
    function taiko(t, v = 1, f0 = 92) {
      const o = osc('sine', f0, t, t + 0.9); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + 0.25);
      const g = gain(0); perc(g, t, 0.9 * v, 0.7); chain(o, g, drums); send(g, 0.35);
      const n = noise(t, t + 0.3), bp = filt('bandpass', 190, 1), gn = gain(0); perc(gn, t, 0.5 * v, 0.2); chain(n, bp, gn, drums); send(gn, 0.4);
    }
    function crash(t, v = 1) {
      const n = noise(t, t + 3), hp = filt('highpass', 5200, 0.5), g = gain(0); perc(g, t, 0.16 * v, 2.6); chain(n, hp, g, pan(0.2), drums); send(g, 0.4);
    }
    function tick(t, v = 1, f = 2400) {
      const n = noise(t, t + 0.04), hp = filt('highpass', 5000), g = gain(0); perc(g, t, 0.28 * v, 0.014, 0.001); chain(n, hp, g, sfxB);
      const o = osc('sine', f, t, t + 0.05), og = gain(0); perc(og, t, 0.12 * v, 0.02, 0.001); chain(o, og, sfxB);
      send(g, 0.2);
    }
    function piano(t, m, len = 1, v = 1) {
      const f = mtof(m), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.04 * v, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 1.4);
      const o = osc('sine', f, t, t + len + 1.5), o2 = osc('triangle', f * 2, t, t + len + 1.5), g2 = gain(0.16);
      o.connect(g); chain(o2, g2, g); chain(g, pan((m - 64) / 40), music); send(g, 0.55);
    }
    function pizz(t, m, v = 1) {
      const o = osc('triangle', mtof(m), t, t + 0.4), lp = filt('lowpass', 2400, 2), g = gain(0);
      lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(400, t + 0.2);
      perc(g, t, 0.18 * v, 0.28); chain(o, lp, g, pan((R() - 0.5) * 0.6), music); send(g, 0.35);
    }
    function mbox(t, m, v = 1) {
      const o = osc('sine', mtof(m), t, t + 1.6), o2 = osc('sine', mtof(m) * 4.02, t, t + 0.6), g = gain(0), g2 = gain(0);
      perc(g, t, 0.1 * v, 1.4); perc(g2, t, 0.02 * v, 0.3); o.connect(g); o2.connect(g2); g2.connect(g); chain(g, pan(0.25), music); send(g, 0.6);
    }
    function shepard(t0, t1, v = 1, dir = 1) {
      const N = 7, pts = 48;
      for (let k = 0; k < N; k++) {
        const fr = new Float32Array(pts), am = new Float32Array(pts);
        for (let i = 0; i < pts; i++) { const u = i / (pts - 1), pos = (k + (dir > 0 ? u : 1 - u)) / N; fr[i] = 55 * Math.pow(2, pos * N); am[i] = Math.pow(Math.sin(Math.PI * pos), 2) * 0.05 * v * (0.3 + 0.7 * u); }
        const o = osc('sine', fr[0], t0, t1 + 0.05), g = gain(0);
        o.frequency.setValueCurveAtTime(fr, t0, t1 - t0); g.gain.setValueCurveAtTime(am, t0, t1 - t0);
        chain(o, g, music); send(g, 0.5);
      }
    }
    function rumble(t, dur = 5, v = 1) {
      const n = noise(t, t + dur + 0.2), lp = filt('lowpass', 110, 0.8), g = gain(0);
      env(g, t, 0.7 * v, dur * 0.3, dur * 0.4, dur * 0.3); chain(n, lp, g, sfxB);
      const o = osc('sine', 32, t, t + dur + 0.2), og = gain(0); env(og, t, 0.3 * v, dur * 0.3, dur * 0.4, dur * 0.3); chain(o, og, sfxB);
    }
    function whoosh(t, dur = 0.6, v = 1) {
      const n = noise(t, t + dur + 0.05), bp = filt('bandpass', 400, 1.3);
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3400, t + dur * 0.55); bp.frequency.exponentialRampToValueAtTime(600, t + dur);
      const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.36 * v, t + dur * 0.55); g.gain.linearRampToValueAtTime(0, t + dur);
      const p = pan(-0.7); p.pan.linearRampToValueAtTime(0.7, t + dur); chain(n, bp, g, p, sfxB); send(g, 0.3);
    }
    function impact(t, v = 1) {
      const o = osc('sine', 110, t, t + 2); o.frequency.exponentialRampToValueAtTime(28, t + 0.6);
      const g = gain(0); perc(g, t, 1.0 * v, 1.6); chain(o, g, sfxB); send(g, 0.4);
      const n = noise(t, t + 1.6), lp = filt('lowpass', 1400); lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(180, t + 1.2);
      const gn = gain(0); perc(gn, t, 0.55 * v, 1.2); chain(n, lp, gn, sfxB); send(gn, 0.9);
    }
    const blip = (t, m, v = 1, d = 0.07) => { const o = osc('square', mtof(m), t, t + d + 0.02), lp = filt('lowpass', 3200), g = gain(0); perc(g, t, 0.06 * v, d, 0.001); chain(o, lp, g, pan((R() - 0.5) * 0.6), sfxB); };
    const sine = (t, f1, f2, d, v, dest = sfxB) => { const o = osc('sine', f1, t, t + d + 0.05); if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + d); const g = gain(0); perc(g, t, v, d, 0.004); chain(o, g, dest); send(g, 0.25); };
    const nburst = (t, d, f, q, v, type = 'bandpass') => { const n = noise(t, t + d + 0.05), b = filt(type, f, q), g = gain(0); perc(g, t, v, d, 0.002); chain(n, b, g, sfxB); return g; };

    const FX = {
      key: (t, v = 1) => { nburst(t, 0.022, 3200 + R() * 2200, 1.6, 0.33 * v); sine(t, 190, 190, 0.02, 0.1 * v); },
      scramble: (t, d = 0.5) => { const n = Math.floor(d * 34); for (let i = 0; i < n; i++) blip(t + i / 34, 76 + Math.floor(R() * 20), 0.45, 0.022); },
      pop: (t, v = 1) => sine(t, 480, 1250, 0.09, 0.26 * v),
      hit: (t, v = 1) => { taiko(t, 0.8 * v); impact(t, 0.35 * v); },
      titlehit: (t, v = 1) => { braam(t, 33, 1.3, 0.8 * v); taiko(t, v); crash(t, 0.9 * v); },
      braam: (t, v = 1) => { braam(t, 33, 2.6, v); impact(t, 0.6 * v); },
      boom: (t, v = 1) => { impact(t, 1.1 * v); taiko(t, v, 70); crash(t, v); nburst(t, 0.9, 700, 0.6, 0.4 * v, 'lowpass'); },
      rip: (t, v = 1) => { for (let i = 0; i < 26; i++) { const s = t + i * 0.035 + R() * 0.02; nburst(s, 0.03, 1800 + R() * 3000, 2, (0.25 + 0.2 * Math.sin(i)) * v); } whoosh(t + 0.2, 0.9, 0.7 * v); },
      whoosh: (t, d = 0.6, v = 1) => whoosh(t, d, v),
      snip: (t, v = 1) => { nburst(t, 0.03, 5000, 2, 0.3 * v, 'highpass'); nburst(t + 0.06, 0.03, 6000, 2, 0.25 * v, 'highpass'); },
      rustle: (t, d = 0.6) => { for (let i = 0; i < d * 30; i++) nburst(t + i / 30 + R() * 0.02, 0.04, 2400 + R() * 2400, 1.2, 0.08 + R() * 0.08); },
      boing: (t, v = 1) => { const o = osc('sine', 260, t, t + 0.4); o.frequency.linearRampToValueAtTime(520, t + 0.08); o.frequency.linearRampToValueAtTime(330, t + 0.3); const g = gain(0); perc(g, t, 0.14 * v, 0.3); chain(o, g, sfxB); },
      stamp: (t, v = 1) => { sine(t, 150, 50, 0.35, 0.7 * v); nburst(t, 0.15, 1800, 0.7, 0.3 * v, 'lowpass'); },
      argh: (t, v = 1) => { taiko(t, 0.7 * v, 80); [110, 116].forEach((f) => { const o = osc('sawtooth', f, t, t + 0.5), lp = filt('lowpass', 1200), g = gain(0); env(g, t, 0.08 * v, 0.01, 0.35, 0.1); chain(o, lp, g, sfxB); }); },
      ding: (t, v = 1) => { [1318.5, 2637, 3951].forEach((f, i) => sine(t, f, f, 1.6 - i * 0.4, [0.16, 0.06, 0.03][i] * v)); },
      clink: (t, v = 1) => { [2200, 3310, 4870].forEach((f) => sine(t, f, f, 0.25, 0.05 * v)); },
      pin: (t, v = 1) => { sine(t, 3000, 3000, 0.05, 0.1 * v); nburst(t, 0.02, 4000, 2, 0.15 * v); },
      count: (t, v = 1, i = 0) => { sine(t, i === 2 ? 1320 : 880, i === 2 ? 1320 : 880, 0.22, 0.2 * v); taiko(t, 0.4 * v); },
      jet: (t, d = 1, v = 1) => { const n = noise(t, t + d + 0.1), bp = filt('bandpass', 500, 0.8); bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(1600, t + d * 0.4); bp.frequency.exponentialRampToValueAtTime(500, t + d); const g = gain(0); env(g, t, 0.25 * v, d * 0.2, d * 0.5, d * 0.3); chain(n, bp, g, sfxB); },
      land: (t, v = 1) => { sine(t, 130, 55, 0.25, 0.5 * v); nburst(t, 0.12, 900, 0.8, 0.2 * v, 'lowpass'); },
      twinkle: (t, v = 1) => { [88, 91, 95, 100].forEach((m, i) => sine(t + i * 0.06, mtof(m), mtof(m), 0.5, 0.05 * v)); },
      panel: (t, v = 1) => { whoosh(t - 0.05, 0.35, 0.6 * v); taiko(t + 0.25, 0.35 * v, 120); },
      stitch: (t, v = 1) => { nburst(t, 0.03, 6000, 3, 0.16 * v, 'highpass'); sine(t, 1800, 1400, 0.03, 0.05 * v); },
      lawhit: (t, v = 1, i = 0) => { taiko(t, 0.9 * v); braam(t, [33, 36, 31, 33, 29, 33][i % 6], 0.55, 0.45 * v); },
      boop: (t, v = 1) => sine(t, 380, 900, 0.14, 0.3 * v),
      whiff: (t, v = 1) => { const n = noise(t, t + 0.6), bp = filt('bandpass', 3000, 1.2); bp.frequency.setValueAtTime(3000, t); bp.frequency.exponentialRampToValueAtTime(300, t + 0.5); const g = gain(0); env(g, t, 0.2 * v, 0.05, 0.2, 0.3); chain(n, bp, g, sfxB); },
      snap: (t, v = 1) => { nburst(t, 0.02, 3000, 2, 0.4 * v); sine(t + 0.01, 700, 1400, 0.08, 0.2 * v); },
      morph: (t, v = 1) => sine(t, 300, 1200, 0.5, 0.18 * v),
      snore: (t, v = 1) => { const n = noise(t, t + 1.4), lp = filt('lowpass', 500, 4), g = gain(0); lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(900, t + 0.6); lp.frequency.linearRampToValueAtTime(250, t + 1.3); env(g, t, 0.18 * v, 0.5, 0.3, 0.5); chain(n, lp, g, sfxB); },
      stathit: (t, v = 1, i = 0) => { taiko(t, 0.9 * v); braam(t, [33, 36, 38, 40][i % 4], 0.5, 0.4 * v); crash(t, 0.4 * v); },
      tick: (t, v = 1, f = 2400) => tick(t, v, f),
      blip: (t, v = 1, i = 0) => { blip(t, 84 + [0, 3, 5, 7, 10, 12, 15, 17][i % 8], 1.6 * v, 0.08); blip(t + 0.06, 96 + [0, 3, 5, 7, 10, 12, 15, 17][i % 8], 0.9 * v, 0.05); },
      zonehit: (t, v = 1) => { taiko(t, 0.45 * v, 110); sine(t, mtof(88), mtof(88), 0.8, 0.05 * v); },
      page: (t, v = 1) => { whoosh(t, 0.5, 0.6 * v); for (let i = 0; i < 8; i++) nburst(t + 0.05 + i * 0.04, 0.03, 2500 + R() * 2000, 1.4, 0.1 * v); },
      suck: (t, v = 1) => { const n = noise(t, t + 0.9), lp = filt('lowpass', 300, 2), g = gain(0); lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(3000, t + 0.75); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18 * v, t + 0.75); g.gain.linearRampToValueAtTime(0, t + 0.8); chain(n, lp, g, sfxB); },
      drone: () => {},
      drop: (t, v = 1) => { braam(t, 33, 3.2, 1.25 * v); impact(t, v); taiko(t, v, 70); crash(t, v); },
      token: (t, v = 1, i = 0) => { const m = [81, 84, 88, 91][i % 4]; sine(t, mtof(m), mtof(m), 0.5, 0.1 * v); sine(t, mtof(m + 12), mtof(m + 12), 0.25, 0.05 * v); },
      flag: (t, v = 1) => { whoosh(t, 0.35, 0.6 * v); nburst(t + 0.3, 0.06, 1400, 1.2, 0.3 * v); },
      star: (t, v = 1, i = 0) => { const m = 81 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26][i % 12]; sine(t, mtof(m), mtof(m), 0.6, 0.05 * v); },
      endhit: (t, v = 1) => { braam(t, 33, 3.6, 1.1 * v, 4); impact(t, 0.8 * v); taiko(t, v, 70); crash(t, v); },
      rumble: (t, d = 5, v = 1) => rumble(t, d, v),
      argh2: () => {},
    };

    // ---- windowing: only events that start in [w0, w1), shifted so w0 is zero ----
    const X = {};
    const inst = { organ, strings, pad, choir, braam, taiko, crash, tick, piano, pizz, mbox, rumble, whoosh, impact };
    Object.entries(inst).forEach(([k, fn]) => { X[k] = (t, ...a) => { if (t >= w0 && t < w1 && t < DUR) fn(t - w0, ...a); }; });
    X.shepard = (t0, t1, v, dir) => { if (t0 >= w0 && t0 < w1) shepard(t0 - w0, t1 - w0, v, dir); };
    arrange(X, DUR);
    cues.forEach(([t, type, a, b]) => { const fn = FX[type]; if (fn && t >= w0 && t < w1 && t < DUR) fn(t - w0, a, b); });
  }

  function arrange(X, DUR) {
    const { organ, strings, pad, choir, braam, taiko, crash, tick, piano, pizz, mbox, rumble, whoosh, shepard } = X;
    const every = (a, b, step, fn) => { let i = 0; for (let t = a; t < b - 1e-6; t += step, i++) fn(t, i); };
    const chords = (a, b, fn) => { let t = a; while (t < b - 1e-6) { const next = Math.min(b, (Math.floor(t / 4 + 1e-6) + 1) * 4); fn(t, chordAt(t), next - t); t = next; } };
    const OST = [0, 0, 12, 0, 7, 0, 12, 7, 0, 0, 12, 0, 7, 0, 12, 7];
    const ACC = [1, 0.55, 0.6, 1, 0.55, 0.6, 1, 0.6, 1, 0.55, 0.6, 1, 0.55, 0.6, 1, 0.6];
    function ostinato(a, b, v = 1) { every(a, b, BEAT / 4, (t, i) => { const c = chordAt(t); strings(t, c.b + OST[i % 16] - 12 + 12, 0.11, v, ACC[i % 16]); }); }
    function organArp(a, b, v = 1, oct = 12) { const P = [0, 2, 1, 3, 2, 1, 3, 2]; every(a, b, BEAT / 2, (t, i) => { const c = chordAt(t); organ(t, [c.n[P[i % 8] % c.n.length] + oct], 0.22, 0.55 * v, 4200); }); }
    function taikoGroove(a, b, v = 1, busy = false) { every(a, b, BAR, (t) => { taiko(t, v); taiko(t + 1.0, 0.7 * v); if (busy) { taiko(t + 0.75, 0.45 * v, 120); taiko(t + 1.5, 0.5 * v, 110); taiko(t + 1.75, 0.4 * v, 120); } }); }

    // 00 signal: clock, drone, a riser that never stops climbing
    every(0.5, 8, 1, (t) => tick(t, 0.9));
    organ(0.8, [45, 52], 7.2, 1.3, 1500);
    shepard(2.6, 8.0, 0.9, 1);
    rumble(4.0, 4.2, 0.5);
    whoosh(8.0, 2.0, 1.1);
    // 01 title
    chords(10, 21.4, (t, c, d) => { organ(t, c.n, d, 1); pad(t, [c.b], d, 0.9); });
    chords(12.2, 21.4, (t, c, d) => choir(t, c.n.slice(0, 3), d, 0.8));
    organArp(12, 20, 0.7);
    every(12, 20, BAR, (t) => taiko(t, 0.35, 80));
    // 02 paper: piano, pizzicato, music box
    chords(22, 44, (t, c, d) => { piano(t, c.b, d, 1.7); piano(t + 0.02, c.n[1] + 12, d, 0.9); pad(t, c.n.slice(0, 3), d, 0.9); every(t, t + d, BEAT, (s, i) => pizz(s, c.n[i % c.n.length] + 12, i % 2 ? 1.5 : 2.1)); });
    [22, 26, 30, 39.2].forEach((p, k) => BOX.forEach(([bt, m]) => mbox(p + bt * BEAT, m + (k === 3 ? 12 : 0), k === 3 ? 2.6 : 2.2)));
    chords(33.4, 37.2, (t, c, d) => organ(t, [c.b - 12, c.b - 11], d, 0.4, 900));
    chords(44, 48, (t, c, d) => every(t, t + d, BEAT / 2, (s, i) => pizz(s, c.n[i % c.n.length] + 12, 1.8)));
    shepard(44.0, 48.0, 1, 1);
    every(46, 48, BEAT / 4, (t, i) => taiko(t, 0.2 + i * 0.03, 120));
    // 03 liftoff
    ostinato(48.4, 56, 0.85);
    chords(50, 56, (t, c, d) => { organ(t, c.n, d, 0.9); choir(t, c.n.slice(0, 3), d, 0.7); });
    taikoGroove(48.4, 56, 0.8);
    // 04 orbit
    ostinato(56, 76.5, 0.8);
    chords(56, 77, (t, c, d) => { organ(t, c.n, d, 0.75); pad(t, [c.b - 12], d, 0.8); });
    chords(60, 77, (t, c, d) => choir(t, c.n.slice(1, 4), d, 0.55));
    organArp(64, 76, 0.5);
    every(56, 76, BAR, (t) => taiko(t, 0.5, 86));
    braam(69.2, 36, 1.6, 0.55, 4);
    // 05 laws
    ostinato(78, 102.6, 0.95);
    chords(78, 103.4, (t, c, d) => { organ(t, c.n, d, 0.8); pad(t, [c.b - 12], d, 0.9); });
    chords(82, 102.4, (t, c, d) => choir(t, c.n.slice(0, 3), d, 0.6));
    taikoGroove(82, 102.4, 0.7, true);
    // 06 mothership
    chords(104, 112, (t, c, d) => { pad(t, [c.b - 24, c.b - 12], d, 1.2); organ(t, [c.b - 12, c.b - 5], d, 0.6, 1200); });
    every(106, 112, BAR, (t) => taiko(t, 0.7, 64));
    ostinato(112, 118, 0.9);
    chords(112, 126, (t, c, d) => { organ(t, c.n, d, 0.8); choir(t, c.n.slice(0, 3), d, 0.6); });
    taikoGroove(112, 118, 0.75);
    organArp(118, 126, 1.2);
    chords(118, 126, (t, c, d) => pad(t, c.n.slice(0, 3), d, 1.2));
    ostinato(126, 129.6, 0.8);
    shepard(127.0, 129.6, 0.8, 1);
    // 07 orchard: wonder
    organArp(130, 154.4, 1.8);
    chords(130, 154.4, (t, c, d) => { choir(t, c.n.slice(0, 3), d, 1.3); pad(t, [c.b - 12, c.b], d, 1.3); });
    chords(136, 150, (t, c, d) => organ(t, [c.b, c.b + 7, c.b + 12], d, 1.0, 2200));
    tick(155.4, 1.2); tick(155.9, 0.9);
    chords(156.2, 160, (t, c, d) => { organ(t, c.n, d, 1); choir(t, c.n.slice(0, 3), d, 0.9); });
    ostinato(156.4, 159.8, 0.9);
    taiko(156.4, 0.9); taiko(157.4, 0.6); taiko(158.4, 0.8); taiko(159.4, 0.6);
    // 08 black hole: dread, ticking faster, a falling riser, then silence and the drop
    organ(160, [33, 34, 45], 10, 0.9, 700);
    pad(160, [21, 22], 10, 1.4);
    every(160, 164, 1, (t) => tick(t, 1));
    every(164, 167, 0.5, (t) => tick(t, 1));
    every(167, 169.5, 0.25, (t) => tick(t, 1));
    every(169.5, 170, 0.125, (t) => tick(t, 1));
    shepard(162, 170, 1, -1);
    ostinato(170.5, 178.8, 1);
    chords(170.5, 179.2, (t, c, d) => { organ(t, c.n, d, 1.1); choir(t, c.n.slice(0, 3), d, 0.9); pad(t, [c.b - 12], d, 1); });
    taikoGroove(170.5, 178.8, 1, true);
    every(172.5, 178.8, 4, (t) => braam(t, chordAt(t).b - 12, 0.9, 0.5));
    // 09 good experiences: F, G, then A major
    organ(180, [57, 60, 64], 1.6, 0.6);
    chords(181.6, 189.6, (t, c, d) => { organ(t, c.n, d, 0.9); choir(t, c.n.slice(0, 3), d, 0.8); strings(t, c.b, d - 0.1, 0.5, 1); });
    every(186, 189.6, BEAT / 2, (t, i) => taiko(t, 0.25 + i * 0.05, 100));
    shepard(186.4, 189.6, 0.8, 1);
    organ(189.6, [57, 61, 64, 69, 73], 8.2, 1.2);
    choir(189.6, [61, 64, 69], 8.2, 1);
    pad(189.6, [33, 45], 8.2, 1.2);
    every(190.4, 197.6, BEAT / 2, (t, i) => organ(t, [[69, 73, 76, 81, 76, 73][i % 6]], 0.22, 0.45, 4200));
    tick(198.8, 1.1);
  }

  const WIN = 12, TAIL = 7;
  async function render(cues, DUR, sampleRate = 48000, onProgress) {
    const R = rng(11);
    const irLen = Math.floor(sampleRate * 3.4);
    const ir = new AudioBuffer({ numberOfChannels: 2, length: irLen, sampleRate });
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / irLen, 3.0); }
    const noise = new AudioBuffer({ numberOfChannels: 1, length: sampleRate * 2, sampleRate });
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
    const shared = { ir, noise };
    const total = Math.ceil(sampleRate * DUR);
    const mix = [new Float32Array(total), new Float32Array(total)];
    const wins = []; for (let w0 = 0; w0 < DUR; w0 += WIN) wins.push(w0);
    let done = 0;
    await Promise.all(wins.map(async (w0) => {
      const w1 = Math.min(DUR, w0 + WIN);
      const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * (w1 - w0 + TAIL)), sampleRate);
      build(ctx, cues, DUR, w0, w1, shared);
      const b = await ctx.startRendering();
      const off = Math.round(w0 * sampleRate);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c), m = mix[c]; const n = Math.min(d.length, total - off); for (let i = 0; i < n; i++) m[off + i] += d[i]; }
      done++; if (onProgress) onProgress(done / wins.length);
    }));
    const fadeN = Math.round(1.6 * sampleRate);
    for (let c = 0; c < 2; c++) for (let i = 0; i < fadeN; i++) mix[c][total - 1 - i] *= i / fadeN;
    const pre = new AudioBuffer({ numberOfChannels: 2, length: total, sampleRate });
    pre.copyToChannel(mix[0], 0); pre.copyToChannel(mix[1], 1);
    const mctx = new OfflineAudioContext(2, total, sampleRate);
    const src = mctx.createBufferSource(); src.buffer = pre;
    const comp = mctx.createDynamicsCompressor();
    comp.threshold.value = -24; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.006; comp.release.value = 0.25;
    src.connect(comp); comp.connect(mctx.destination); src.start(0);
    const buf = await mctx.startRendering();
    let peak = 0;
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
    const k = peak > 0 ? 0.89 / peak : 1;
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
    return buf;
  }

  function toWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
    ws(36, 'data'); out.setUint32(40, len * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Uint8Array(out.buffer);
  }

  return { render, toWav };
})();
