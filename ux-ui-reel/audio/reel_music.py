#!/usr/bin/env python3
"""
reel_music.py — score for the 2:30 vertical reel "UX vs UI — explained"

Renders  audio/out/reel_music.wav  (stereo, 48 kHz, 24-bit PCM, exactly 150.000 s,
integrated -24 LUFS, true peak <= -8 dBFS).

Same palette as the documentary (the instruments are imported, unmodified, from
09_project_source_files/audio/music.py): additive pads, felt piano, the four-note point motif
(D E G A), synthesized hall reverb — plus a felt-not-heard four-on-the-floor sub pulse at 96 BPM,
a hi-hat-like noise tick in the "how it's made" section, soft impacts and risers on the hits.

    cd ux-ui-reel && python3 audio/reel_music.py [--out audio/out/reel_music.wav]
"""
import argparse
import importlib.util
import os
import time
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
DOC_AUDIO = os.path.normpath(os.path.join(HERE, "..", "..", "invisible-conversation", "09_project_source_files", "audio"))


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


M = _load("doc_music", os.path.join(DOC_AUDIO, "music.py"))   # read-only reuse of the film's instruments

SR = M.SR
DUR = 150.0
N = int(SR * DUR)
BPM = 96.0
BEAT = 60.0 / BPM            # 0.625 s
OUT_FILE = os.path.join(HERE, "out", "reel_music.wav")
TARGET_LUFS = -24.0
CEILING_DB = -8.5
SEED = 9601

rng = np.random.default_rng(SEED)
hz, midi, n2m, db = M.hz, M.midi, M.n2m, M.db
add_at, butter_sos, peaking_sos = M.add_at, M.butter_sos, M.peaking_sos


def env_pts(points):
    return M.interp_env(points, n=N)


# --------------------------------------------------------------------------------------
# reel-specific voices
# --------------------------------------------------------------------------------------
def sub_pulse(dur=0.32):
    """felt, not heard: a soft 48 Hz thump with a quick pitch drop"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 48.0 * (1 + 0.9 * np.exp(-t / 0.018))
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.004))
    return M.tail_fade(sig, 0.4)


def hat_tick(open_=False):
    n = int((0.09 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    nz = signal.sosfilt(butter_sos([6000, 11000], "band", 2), nz) * np.exp(-t / (0.03 if open_ else 0.012))
    return M.tail_fade(nz * (1 - np.exp(-t / 0.0008)), 0.4)


def impact(dur=1.6, soft=1.0):
    """soft cinematic hit: low boom + lowpassed noise burst + a short dark tail"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 42.0 * (1 + 1.4 * np.exp(-t / 0.05))
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45)
    nz = rng.standard_normal((n, 2))
    burst = signal.sosfilt(butter_sos(1800 * soft, "low", 2), nz, axis=0) * np.exp(-t / 0.08)[:, None]
    tail = signal.sosfilt(butter_sos(600, "low", 2), rng.standard_normal((n, 2)), axis=0) * np.exp(-t / 0.5)[:, None] * 0.25
    out = np.stack([boom, boom], axis=1) + 0.5 * burst + tail
    out *= (1 - np.exp(-t / 0.002))[:, None]
    r = int(0.3 * n)
    out[n - r:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r)))[:, None]
    return out * 0.5


def riser(dur, lo=200, hi=2200):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal((n, 2))
    nz = signal.sosfilt(butter_sos([lo, hi], "band", 2), nz, axis=0)
    rise = (t / dur) ** 2.4 * (1 - np.exp(-(dur - t) / 0.04))
    return nz * rise[:, None]


def glass_arp_note(freq, dur=0.6):
    """glassy pluck: sine + bright 2nd/3rd partials, very fast decay on the upper ones"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.22)
    sig += 0.35 * np.sin(2 * np.pi * 2.0 * freq * t + 0.3) * np.exp(-t / 0.07)
    sig += 0.12 * np.sin(2 * np.pi * 3.01 * freq * t) * np.exp(-t / 0.04)
    sig *= 1 - np.exp(-t / 0.002)
    return M.tail_fade(sig, 0.35) * 0.3


# --------------------------------------------------------------------------------------
def render(out_file):
    t_start = time.time()
    os.makedirs(os.path.dirname(os.path.abspath(out_file)), exist_ok=True)
    PAD_SR, PAD_UP = M.PAD_SR, M.PAD_UP
    pad_lo = np.zeros((N // PAD_UP, 2))
    piano = np.zeros((N, 2), dtype=np.float32)
    rhythm = np.zeros((N, 2), dtype=np.float32)
    fx = np.zeros((N, 2), dtype=np.float32)
    sub = np.zeros((N, 2), dtype=np.float32)

    P_DARK = dict(bright=0.5, nharm=6, detune=6.0, spread=0.7, attack=2.0, release=2.5)
    P_GLASS = dict(bright=0.9, nharm=8, detune=4.0, spread=0.9, attack=0.9, release=2.0)
    P_WIDE = dict(bright=0.7, nharm=7, detune=7.0, spread=1.0, attack=1.5, release=2.5)
    P_TENSE = dict(bright=0.75, nharm=7, detune=5.0, spread=0.6, attack=1.2, release=0.8)
    P_FIRM = dict(bright=0.8, nharm=7, detune=4.0, spread=0.8, attack=0.8, release=2.0)
    P_MYST = dict(bright=0.45, nharm=5, detune=6.0, spread=0.7, attack=2.5, release=3.0)
    P_FINAL = dict(bright=0.75, nharm=7, detune=6.0, spread=0.95, attack=1.5, release=3.0)

    chords = [
        # 0-3: a single low tone (0.6) then the hard hit at 3.0 opens the title pad
        (3.0, 8.0, ["D2", "A2", "D3", "E4"], P_DARK, 0),
        # 8-30 UI: D major, bright and glassy
        (8.0, 13.0, ["D2", "A2", "F#3", "E4", "A4"], P_GLASS, 0),
        (13.0, 18.0, ["A1", "E3", "C#4", "G#4"], P_GLASS, 0),          # A(add7)
        (18.0, 23.0, ["B1", "F#3", "D4", "E4"], P_GLASS, 0),           # Bm(add4)
        (23.0, 30.0, ["G2", "D3", "B3", "A4"], P_GLASS, 0),            # G(add9)
        # 30-52 UX: G major, wide and warm
        (30.0, 36.0, ["G1", "D3", "B3", "E4"], P_WIDE, 1),             # G6
        (36.0, 41.0, ["C2", "G3", "D4", "E4"], P_WIDE, 0),             # C(add9)
        (41.0, 46.0, ["E2", "B2", "D4", "G4"], P_WIDE, 0),             # Em7
        (46.0, 52.0, ["D2", "A2", "F#3", "G4"], P_WIDE, 0),            # D(add4)
        # 52-72 the trap
        (52.0, 58.0, ["E2", "B2", "D3", "G3"], P_DARK, 0),             # Em7
        (58.0, 66.0, ["Ab2", "Eb3", "G3", "C4", "D4"], P_TENSE, 1),    # Abmaj7#11 (tritone Ab-D)
        (66.0, 68.0, ["D2", "A2", "F#3", "E4"], P_FIRM, 0),            # release
        (68.0, 72.0, ["G2", "D3", "B3", "A4"], P_FIRM, 1),             # handshake / relationship
        # 72-100 how it's made: D major loop, most rhythmic
        (72.0, 78.0, ["D2", "A2", "F#3", "E4"], P_FIRM, 0),
        (78.0, 84.0, ["B1", "F#3", "D4", "E4"], P_FIRM, 0),
        (84.0, 90.0, ["G2", "D3", "B3", "A4"], P_FIRM, 0),
        (90.0, 96.0, ["A1", "E3", "C#4", "G4"], P_FIRM, 0),
        (96.0, 100.0, ["D2", "A2", "F#3", "E4", "A4"], P_FIRM, 1),
        # 100-125 the door: sparse, mysterious (D minor), resolve at 118
        (100.0, 108.5, ["D2", "A2", "F3", "E4"], P_MYST, -2),
        (109.3, 118.0, ["D2", "G2", "Bb2", "D3"], P_MYST, -2),
        (118.0, 125.0, ["D2", "A2", "F#3", "E4", "A4"], P_FINAL, 1),   # the proper handle: D major
        # 125-142 the line: full resolution, biggest swell at 130
        (125.0, 130.0, ["G2", "D3", "B3", "E4"], P_FINAL, 0),
        (130.0, 136.0, ["D2", "A2", "F#3", "E4", "A4"], P_FINAL, 2),
        (136.0, 142.0, ["G2", "D3", "B3", "D4"], P_FINAL, 0),
        # outro
        (142.0, 149.5, ["D2", "A2", "F#3", "E4"], P_FINAL, -1),
    ]
    print("pads ...", flush=True)
    for (t0, t1, notes, p, lvl) in chords:
        att, rel = p["attack"], (0.1 if t1 >= 149.0 else p["release"])
        lead = 0.35 * att
        for i, nm in enumerate(notes):
            f = hz(nm)
            g = db(lvl) * (1.0 if i < 2 else 0.75) * (0.8 if f > 400 else 1.0)
            add_at(pad_lo, M.pad_note(f, (t1 - t0) + lead + rel, attack=att, release=rel, bright=p["bright"],
                                      nharm=p["nharm"], detune=p["detune"], spread=p["spread"]),
                   t0 - lead, gain=g, sr=PAD_SR)
    pad = M.fit(signal.resample_poly(pad_lo, PAD_UP, 1, axis=0), N).astype(np.float32)

    # the single low tone at 0.6 (D2 sine, very soft) — the only thing before the hit
    n0 = int(2.6 * SR)
    t0v = np.arange(n0) / SR
    low = (np.sin(2 * np.pi * hz("D2") * t0v) + 0.2 * np.sin(2 * np.pi * hz("D3") * t0v)) * M.smoothstep_env(n0, 0.8, 1.2)
    add_at(fx, low, 0.6, gain=db(-20))

    # ---------------------------------------------------------------- piano / motif
    print("piano ...", flush=True)
    MOTIF, MOTIF_T = [0, 2, 5, 7], [0.0, BEAT / 2, BEAT, 2 * BEAT]

    def motif(t0, root, vel=0.55, stretch=1.0, full=False):
        r = n2m(root)
        degs, times = list(MOTIF), list(MOTIF_T)
        if full:
            degs.append(12)
            times.append(3.5 * BEAT)
        for k, (d, tm) in enumerate(zip(degs, times)):
            add_at(piano, M.felt_piano(midi(r + d), vel=vel * (0.85 + 0.15 * (k == len(degs) - 1))),
                   t0 + tm * stretch, pan=0.12 * (k - 1.5))

    def note(t0, nm, vel=0.4, pan=None):
        m = n2m(nm)
        add_at(piano, M.felt_piano(midi(m), vel=vel), t0, pan=float(np.clip((m - 64) / 30, -0.6, 0.6)) if pan is None else pan)

    motif(3.6, "D4", vel=0.6)                       # title: the point motif answers the hit
    note(8.0, "D3", 0.35, -0.2)
    motif(24.0, "G4", vel=0.42, stretch=0.8)        # UI -> quick motif in G
    motif(30.4, "G4", vel=0.5)                      # UX: warm statement
    note(46.2, "F#4", 0.3)
    note(66.1, "F#4", 0.4, -0.15)                   # release
    note(66.1, "A4", 0.34, 0.15)
    motif(68.2, "G4", vel=0.55)                     # handshake
    for k, tm in enumerate([78, 81, 84, 87, 90, 93]):  # a note on each card
        note(tm + 0.05, ["D5", "E5", "F#5", "A5", "B5", "D6"][k], 0.3)
    note(100.4, "D4", 0.3)
    note(104.0, "A3", 0.25)
    note(118.2, "D5", 0.4, 0.2)                     # the door opens
    note(118.2, "A4", 0.34, -0.2)
    motif(125.6, "D4", vel=0.6, stretch=1.1, full=True)   # the line: full resolution
    motif(131.0, "D5", vel=0.45, stretch=1.1, full=True)  # echoed an octave up at the swell
    note(138.2, "F#4", 0.3)
    note(142.2, "D4", 0.3)
    note(142.2, "A5", 0.22)

    # glassy arpeggio (UI section) — 16ths, D major pentatonic, high register
    print("textures ...", flush=True)
    arp = [n2m(x) for x in ["D5", "E5", "F#5", "A5", "B5", "D6", "A5", "F#5"]]
    tm, k = 8.0, 0
    while tm < 29.6:
        g = db(-27) * np.interp(tm, [8, 9.5, 28, 29.6], [0, 1, 1, 0])
        if k % 8 not in (5,):
            add_at(fx, glass_arp_note(midi(arp[(k * 3) % 8])), tm, gain=g, pan=0.4 * np.sin(k * 0.9))
        tm += BEAT / 4
        k += 1
    # lighter arp continues under UX (every other 16th), one octave lower
    tm, k = 30.0, 0
    while tm < 51.5:
        g = db(-31) * np.interp(tm, [30, 31, 50, 51.5], [0, 1, 1, 0])
        if k % 2 == 0:
            add_at(fx, glass_arp_note(midi(arp[(k * 3) % 8] - 12)), tm, gain=g, pan=0.5 * np.sin(k * 0.7))
        tm += BEAT / 4
        k += 1

    # ---------------------------------------------------------------- pulse (four on the floor, 96 BPM)
    def pulse_run(a, b, gain_db, fade_in=1.0, fade_out=1.0):
        tm, k = a, 0
        while tm < b - 1e-6:
            g = db(gain_db) * np.interp(tm, [a, a + fade_in, b - fade_out, b], [0.6, 1, 1, 0.6])
            add_at(sub, sub_pulse(), tm, gain=g * (1.0 if k % 4 == 0 else 0.9))
            tm += BEAT
            k += 1

    pulse_run(8.0, 58.0, -20)              # UI + UX + trap setup
    pulse_run(58.0, 66.0, -26, 0.5, 0.5)   # ducked through the tension
    pulse_run(66.0, 100.0, -19)            # confident; most present in "how it's made"
    pulse_run(125.0, 142.0, -20, 0.5, 3.0) # the line
    # hi-hat-like tick only in "how it's made": 8ths, accents off-beat
    tm, k = 72.0, 0
    while tm < 99.9:
        g = db(-34) * np.interp(tm, [72, 73, 98.5, 99.9], [0, 1, 1, 0]) * (1.0 if k % 2 else 0.55)
        add_at(rhythm, hat_tick(open_=(k % 8 == 7)), tm, gain=g, pan=0.3 * (1 if k % 2 else -1))
        tm += BEAT / 2
        k += 1

    # ---------------------------------------------------------------- hits, impacts, risers
    add_at(fx, riser(2.4, 150, 1800), 0.6, gain=db(-24))       # into the title hit
    add_at(fx, impact(2.0, soft=1.2), 3.0, gain=db(6))         # HARD HIT (title)
    add_at(fx, riser(1.6), 6.4, gain=db(-30))                  # into the pulse
    add_at(fx, impact(1.2, soft=0.8), 30.0, gain=db(-20))      # UX section
    add_at(fx, riser(7.6, 180, 2600), 58.3, gain=db(-27))      # the trap riser 58.3 -> 65.9
    add_at(fx, impact(1.4, soft=0.9), 66.0, gain=db(-17))      # release
    add_at(fx, impact(1.0, soft=0.7), 68.0, gain=db(-22))      # handshake
    add_at(fx, riser(1.8), 70.2, gain=db(-30))
    add_at(fx, impact(1.2, soft=0.8), 72.0, gain=db(-19))      # how it's made
    for tm in [78, 81, 84, 87, 90, 93]:                        # six soft impacts
        add_at(fx, impact(0.9, soft=0.7), tm, gain=db(-24))
    add_at(fx, impact(1.6, soft=0.5), 100.0, gain=db(-24))     # the door (pulse drops out)
    add_at(fx, impact(1.4, soft=0.8), 118.0, gain=db(-20))     # warm resolve
    add_at(fx, riser(4.6, 150, 2000), 125.4, gain=db(-26))     # into the biggest swell
    add_at(fx, impact(2.0, soft=1.0), 130.0, gain=db(-14))     # biggest swell
    add_at(fx, M.air_noise(17.0), 125.0, gain=db(-10))         # air on the line
    add_at(fx, M.air_noise(22.0), 8.0, gain=db(-16))           # a little glassy air in the UI section

    # ---------------------------------------------------------------- mix + master
    print("mix ...", flush=True)
    width = env_pts([(0, 0.6), (8, 1.0), (30, 1.3), (52, 1.0), (58, 0.7), (66, 1.0), (100, 0.7), (118, 1.1), (125, 1.3), (150, 1.3)]).astype(np.float32)
    dry = pad + piano + rhythm + fx
    mid = 0.5 * (dry[:, 0] + dry[:, 1])
    side = 0.5 * (dry[:, 0] - dry[:, 1]) * width
    dry[:, 0], dry[:, 1] = mid + side, mid - side
    ir = M.make_reverb_ir(rt60=2.2, dur=3.0)
    send = pad * 0.5 + piano * 0.55 + rhythm * 0.15 + fx * 0.4
    wet = np.zeros((N, 2), dtype=np.float32)
    for ch in range(2):
        wet[:, ch] = signal.oaconvolve(send[:, ch].astype(np.float64), ir[:, ch])[:N].astype(np.float32)
    wet = signal.sosfilt(butter_sos(180, "high", 2), wet, axis=0).astype(np.float32)
    mix = (dry + wet * 0.5 + sub).astype(np.float64)

    mix = signal.sosfilt(butter_sos(28, "high", 2), mix, axis=0)
    mix = signal.sosfilt(peaking_sos(2300.0, -4.0, 0.7), mix, axis=0)      # voice-band dip
    mix = signal.sosfilt(butter_sos(16000, "low", 2), mix, axis=0)
    arc = env_pts([(0, -4), (3, 0), (8, 0), (30, 0.5), (52, -0.5), (58, -1.0), (66, 1.0), (72, 2.0), (99, 2.0), (100, -3.0),
                   (108, -3.0), (118, 0.5), (125, 0.5), (130, 2.0), (136, 1.0), (142, -1.0), (150, -1.0)])
    mix *= (10 ** (arc / 20))[:, None]

    mix[int(108.5 * SR):int(109.3 * SR)] = 0.0                               # the freeze
    fade = env_pts([(0, 1), (142.5, 1), (149.3, 0), (150, 0)])
    mix *= (np.where(fade > 0, 0.5 - 0.5 * np.cos(np.pi * fade), 0.0))[:, None]
    mix[int(149.5 * SR):] = 0.0
    mix[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))[:, None]

    lufs = M.integrated_lufs(mix)
    mix *= db(TARGET_LUFS - lufs)
    mix, limited = M.peak_limiter(mix, CEILING_DB)
    mix -= mix.mean(axis=0, keepdims=True)
    mix[int(149.5 * SR):] = 0.0
    mix[int(108.5 * SR):int(109.3 * SR)] = 0.0
    out_lufs = M.integrated_lufs(mix)
    print(f"pre-gain {lufs:.2f} LUFS, limiter engaged: {limited}")
    print(f"result: {out_lufs:.2f} LUFS integrated, peak {20*np.log10(np.max(np.abs(mix))):.2f} dBFS, {len(mix)} frames = {len(mix)/SR:.3f} s")
    sf.write(out_file, mix, SR, subtype="PCM_24")
    print(f"wrote {out_file} ({time.time()-t_start:.1f} s)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT_FILE)
    render(ap.parse_args().out)
