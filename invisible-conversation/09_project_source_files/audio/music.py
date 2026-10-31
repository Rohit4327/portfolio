#!/usr/bin/env python3
"""
music.py — procedural score for "The Invisible Conversation: How UX & UI Came to Life"

Renders  audio/out/music_bed.wav  (stereo, 48 kHz, 24-bit PCM, exactly 300.000 s by default).

Everything is synthesized from scratch with numpy + scipy (no samples):
  * slow additive pads with per-partial LFOs, 3-voice detune/chorus, stereo spread
    (rendered at 12 kHz and upsampled once: all pad partials live below 5.5 kHz)
  * a felt-piano-like pluck (decaying inharmonic partials + soft noise transient, lowpassed)
  * a deep sub drone that follows the harmonic root
  * soft pulses (distant machine pulse / gentle heartbeat-like ticks), a faint sine
    arpeggio, high "air" noise, a tension riser
  * a synthesized reverb (decaying, darkening noise IR + FFT convolution)
  * section-dependent stereo width, a voice-band EQ dip (1-4 kHz), BS.1770 loudness
    normalisation to -27 LUFS integrated, a safety peak limiter at -6.5 dBFS

Deterministic (fixed seed).  Re-render the storyboard timing:
    cd 09_project_source_files && python3 audio/music.py

Re-time to the locked picture:
    python3 audio/music.py --sections sections.json --duration 303.0 --out audio/out/music_bed.wav

sections.json = {"total": 303.0,
                 "chapters": [{"id": 1, "start": 0.0, "end": 27.8}, ..., {"id": 10, "start": ..., "end": 303.0}],
                 "moments":  {"freeze": 15.3, "title": 21.9, "point_to": 101.2, "ux_lift": 163.4,
                              "checkout_tension": 228.1, "checkout_release": 231.0,
                              "door_open": 291.4, "final_resolve": 296.5}}
The score is written against the storyboard timeline (chapters 1-10 below).  A piecewise-linear
time map is built from the chapter boundaries (by id) and the named moments; every musical event
lands at the equivalent position inside the real chapter (proportional interpolation between
anchors).  Note rhythms, attacks and decays stay in tempo; only onsets and sustained spans move.
"""
import argparse
import json
import os
import sys
import time
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d

# --------------------------------------------------------------------------------------
# constants
# --------------------------------------------------------------------------------------
SR = 48000
DEFAULT_DUR = 300.0
PAD_SR = 12000                 # pads are rendered here, then upsampled x4
PAD_UP = SR // PAD_SR
PIANO_SR = 24000               # piano partials are rendered here, then upsampled x2
SEED = 20260131
BPM = 66.0
BEAT = 60.0 / BPM              # 0.909 s
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")
OUT_FILE = os.path.join(OUT_DIR, "music_bed.wav")

TARGET_LUFS = -27.0
PEAK_CEILING_DB = -6.5

# set in main() from the requested duration
DUR = DEFAULT_DUR
N = int(SR * DUR)
N_PAD = N // PAD_UP

rng = np.random.default_rng(SEED)

# storyboard timeline the score is written against (seconds)
SB_CHAPTERS = {1: (0.0, 24.0), 2: (24.0, 53.0), 3: (53.0, 76.0), 4: (76.0, 108.0), 5: (108.0, 138.0),
               6: (138.0, 168.0), 7: (168.0, 200.0), 8: (200.0, 242.0), 9: (242.0, 273.0), 10: (273.0, 300.0)}
SB_MOMENTS = {"freeze": 15.0, "title": 19.0, "point_to": 100.5, "ux_lift": 160.0,
              "checkout_tension": 224.0, "checkout_release": 227.0, "door_open": 289.5, "final_resolve": 293.0}


def midi(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def db(x):
    return 10.0 ** (x / 20.0)


_NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
         "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def n2m(name):
    """'F#3' -> midi number"""
    if name[1] in "#b":
        return _NOTE[name[:2]] + 12 * (int(name[2:]) + 1)
    return _NOTE[name[0]] + 12 * (int(name[1:]) + 1)


def hz(name):
    return midi(n2m(name))


# --------------------------------------------------------------------------------------
# time map: storyboard seconds -> picture seconds
# --------------------------------------------------------------------------------------
class TimeMap:
    def __init__(self, knots):
        knots = sorted(knots)
        self.sb = np.array([k[0] for k in knots], dtype=float)
        self.ac = np.array([k[1] for k in knots], dtype=float)
        if np.any(np.diff(self.sb) <= 0) or np.any(np.diff(self.ac) <= 0):
            raise SystemExit("time map is not monotonic:\n" + self.table())
        self.total = float(self.ac[-1])

    def __call__(self, t):
        return float(np.interp(t, self.sb, self.ac)) if np.isscalar(t) else np.interp(t, self.sb, self.ac)

    def inv(self, t):
        return float(np.interp(t, self.ac, self.sb))

    def table(self):
        return "\n".join(f"  storyboard {a:7.2f} s  ->  picture {b:7.2f} s" for a, b in zip(self.sb, self.ac))


def build_timemap(sections_path=None, duration=None):
    """
    No sections: identity up to the final cards (293 s); the final-cards chapter stretches to
    `duration` if one is given.  With sections: chapter starts by id + named moments are anchors.
    """
    if sections_path is None:
        total = DEFAULT_DUR if duration is None else float(duration)
        knots = [(0.0, 0.0), (293.0, 293.0), (300.0, total)] if total != 300.0 else [(0.0, 0.0), (300.0, 300.0)]
        return TimeMap(knots)
    with open(sections_path) as fh:
        sec = json.load(fh)
    total = float(sec.get("total", 0.0) or 0.0)
    if duration is not None:
        if total and abs(total - float(duration)) > 1e-3:
            print(f"warning: --duration {duration} overrides sections total {total}", file=sys.stderr)
        total = float(duration)
    chapters = {int(c["id"]): (float(c["start"]), float(c["end"])) for c in sec.get("chapters", [])}
    if not total:
        total = max(e for _, e in chapters.values())
    knots = [(0.0, 0.0)]
    for cid, (s, e) in chapters.items():
        if cid not in SB_CHAPTERS:
            print(f"warning: unknown chapter id {cid} ignored", file=sys.stderr)
            continue
        if cid > 1:
            knots.append((SB_CHAPTERS[cid][0], s))
    knots.append((300.0, total))
    for name, t in sec.get("moments", {}).items():
        if name not in SB_MOMENTS:
            print(f"warning: unknown moment '{name}' ignored", file=sys.stderr)
            continue
        knots.append((SB_MOMENTS[name], float(t)))
    # de-duplicate storyboard anchors (a moment that coincides with a chapter start)
    uniq = {}
    for a, b in knots:
        uniq[a] = b
    return TimeMap(list(uniq.items()))


# --------------------------------------------------------------------------------------
# small DSP helpers
# --------------------------------------------------------------------------------------
def smoothstep_env(n, attack, release, sr=SR):
    """raised-cosine attack and release envelope of n samples"""
    env = np.ones(n)
    a = int(min(attack * sr, n // 2))
    r = int(min(release * sr, n // 2))
    if a > 0:
        env[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if r > 0:
        env[n - r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return env


def tail_fade(sig, frac=0.3):
    """raised-cosine fade over the last `frac` of a one-shot so it never ends on a step"""
    n = len(sig)
    r = int(n * frac)
    if r > 1:
        sig[n - r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return sig


def add_at(bus, sig, t0, gain=1.0, pan=None, sr=SR):
    """add a mono or stereo signal into the (n,2) bus starting at time t0 (seconds)"""
    n_bus = len(bus)
    i0 = int(round(t0 * sr))
    if i0 >= n_bus:
        return
    if sig.ndim == 1:
        if pan is None:
            pan = 0.0
        gl = np.sqrt((1.0 - pan) / 2.0) * np.sqrt(2.0)
        gr = np.sqrt((1.0 + pan) / 2.0) * np.sqrt(2.0)
        st = np.stack([sig * gl, sig * gr], axis=1)
    else:
        st = sig
    if i0 < 0:
        st = st[-i0:]
        i0 = 0
    n = min(len(st), n_bus - i0)
    if n <= 0:
        return
    bus[i0:i0 + n] += (st[:n] * gain).astype(bus.dtype)


def butter_sos(cut, kind, order=2, sr=SR):
    return signal.butter(order, cut, btype=kind, fs=sr, output="sos")


def peaking_sos(f0, gain_db, q, sr=SR):
    """RBJ peaking EQ as an sos section"""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / (2 * q)
    b0 = 1 + alpha * A
    b1 = -2 * np.cos(w0)
    b2 = 1 - alpha * A
    a0 = 1 + alpha / A
    a1 = -2 * np.cos(w0)
    a2 = 1 - alpha / A
    return np.array([[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]])


def interp_env(points, n=None, sr=SR):
    """piecewise-linear envelope over the whole timeline from [(t, v), ...]"""
    if n is None:
        n = N
    ts = np.array([p[0] for p in points], dtype=float)
    vs = np.array([p[1] for p in points], dtype=float)
    t = np.arange(n) / sr
    return np.interp(t, ts, vs)


def fit(x, n):
    """trim or zero-pad along axis 0 to exactly n frames"""
    if len(x) >= n:
        return x[:n]
    return np.concatenate([x, np.zeros((n - len(x),) + x.shape[1:], dtype=x.dtype)], axis=0)


# --------------------------------------------------------------------------------------
# instruments
# --------------------------------------------------------------------------------------
def pad_note(freq, dur, attack=2.5, release=3.0, bright=1.0, nharm=7,
             detune=5.0, spread=0.7, lfo_rate=0.07, sr=PAD_SR):
    """
    Slowly evolving additive pad voice.  Three detuned copies (-d, 0, +d cents) are
    spread across the stereo field, each partial breathes with its own slow LFO.
    Returns (n, 2) array at `sr`.
    """
    n = int(dur * sr)
    t = np.arange(n) / sr
    out = np.zeros((n, 2))
    pans = (-spread, 0.0, spread)
    for d, pan in zip((-detune, 0.0, detune), pans):
        f = freq * 2.0 ** (d / 1200.0)
        drift = 1.0 + 0.0006 * np.sin(2 * np.pi * rng.uniform(0.02, 0.06) * t + rng.uniform(0, 6.28))
        phase = 2 * np.pi * np.cumsum(f * drift) / sr
        sig = np.zeros(n)
        for h in range(1, nharm + 1):
            if f * h > 0.45 * sr:
                break
            base = 1.0 / h ** 1.7
            if h > 1:
                base *= bright
            lfo = 0.65 + 0.35 * np.sin(2 * np.pi * lfo_rate * (0.6 + 0.5 * np.sqrt(h)) * t + rng.uniform(0, 6.28))
            sig += base * lfo * np.sin(h * phase + rng.uniform(0, 6.28))
        gl = np.sqrt((1.0 - pan) / 2.0)
        gr = np.sqrt((1.0 + pan) / 2.0)
        out[:, 0] += gl * sig
        out[:, 1] += gr * sig
    out *= smoothstep_env(n, attack, release, sr)[:, None]
    return out * 0.33


def felt_piano(freq, vel=0.6):
    """
    Felt-piano-like pluck: sum of exponentially decaying partials with slight
    inharmonicity, a soft lowpassed noise transient, a tiny hammer thump and a gentle
    lowpass.  Rendered at PIANO_SR and upsampled.  Mono at 48 kHz.
    """
    sr = PIANO_SR
    B = 0.00025
    tau1 = float(np.clip(1.9 * (220.0 / freq) ** 0.45, 0.35, 3.2))
    dur = float(np.clip(4.6 * tau1, 2.0, 9.0))
    n = int(dur * sr)
    t = np.arange(n) / sr
    sig = np.zeros(n)
    h = 1
    while True:
        fh = freq * h * np.sqrt(1 + B * h * h)
        if fh > 4200 or h > 14:
            break
        amp = (1.0 / h ** 1.25) * (1.0 - 0.25 * (h % 2 == 0))
        amp *= rng.uniform(0.85, 1.0)
        tau = tau1 / (1.0 + 0.45 * (h - 1))
        sig += amp * np.exp(-t / tau) * np.sin(2 * np.pi * fh * t + rng.uniform(0, 6.28))
        h += 1
    sig *= 1.0 - np.exp(-t / 0.006)                      # soft attack
    nt = int(0.05 * sr)                                  # felt / hammer noise transient
    noise = rng.standard_normal(nt)
    noise = signal.sosfilt(butter_sos(1400, "low", 2, sr), noise) * np.exp(-np.arange(nt) / (0.010 * sr))
    sig[:nt] += 0.9 * noise
    th = int(0.08 * sr)                                  # tiny hammer thump
    sig[:th] += 0.35 * np.exp(-np.arange(th) / (0.025 * sr)) * np.sin(2 * np.pi * 95.0 * t[:th])
    sig = signal.sosfilt(butter_sos(2600 + 0.4 * freq, "low", 2, sr), sig)   # the felt
    sig = tail_fade(sig, 0.3)
    sig = signal.resample_poly(sig, SR // sr, 1)
    return sig * vel * 0.22


def soft_pluck(freq, dur=1.0, vel=0.4):
    """clean soft sine-ish pluck (kalimba-like), for the mobile ostinato"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.28)
    sig += 0.18 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t / 0.08)
    sig *= 1.0 - np.exp(-t / 0.004)
    return tail_fade(sig, 0.35) * vel * 0.3


def tick(freq=180.0, dur=0.3, noise_amt=0.3, decay=0.07, noise_band=(600, 2200)):
    """soft pulse 'tock': decaying sine + tiny filtered noise"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * t * (1 + 0.25 * np.exp(-t / 0.01))) * np.exp(-t / decay)
    nz = rng.standard_normal(n)
    nz = signal.sosfilt(butter_sos(list(noise_band), "band", 2), nz) * np.exp(-t / 0.012)
    sig = body + noise_amt * nz
    sig *= 1.0 - np.exp(-t / 0.0015)
    return tail_fade(sig, 0.4)


def machine_thump(dur=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 52.0 * (1 + 0.6 * np.exp(-t / 0.03))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    nz = rng.standard_normal(n)
    nz = signal.sosfilt(butter_sos([180, 650], "band", 2), nz) * np.exp(-t / 0.03)
    return tail_fade((body + 0.25 * nz) * (1.0 - np.exp(-t / 0.003)), 0.4)


def sine_blip(freq, dur=0.5, vel=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t) + 0.06 * np.sin(2 * np.pi * 3 * freq * t)
    sig *= np.exp(-t / 0.14) * (1.0 - np.exp(-t / 0.008))
    return tail_fade(sig, 0.4) * vel


def air_noise(dur, lo=4500, hi=10500, lfo=0.09):
    """decorrelated stereo high 'air'"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for ch in range(2):
        nz = rng.standard_normal(n)
        nz = signal.sosfilt(butter_sos([lo, hi], "band", 2), nz)
        mod = 0.55 + 0.45 * np.sin(2 * np.pi * lfo * t + rng.uniform(0, 6.28))
        mod *= 0.7 + 0.3 * np.sin(2 * np.pi * lfo * 2.7 * t + rng.uniform(0, 6.28))
        out[:, ch] = nz * mod
    out *= smoothstep_env(n, 4.0, 4.0)[:, None]
    return out * 0.02


def make_reverb_ir(rt60=2.7, dur=3.8, predelay=0.024):
    """stereo IR: decaying, progressively darker noise + a few early reflections"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for ch in range(2):
        nz = rng.standard_normal(n)
        lp_bright = signal.sosfilt(butter_sos(6500, "low", 2), nz)
        lp_dark = signal.sosfilt(butter_sos(1400, "low", 2), nz)
        w = np.clip(t / (0.55 * dur), 0, 1) ** 0.8
        tail = (lp_bright * (1 - w) + lp_dark * w) * np.exp(-6.908 * t / (rt60 * (1.0 + 0.04 * ch)))
        er = np.zeros(n)
        for _ in range(7):
            d = int(rng.uniform(0.008, 0.075) * SR)
            er[d] += rng.uniform(0.25, 0.6) * rng.choice([-1, 1])
        er = signal.sosfilt(butter_sos(5000, "low", 2), er)
        ir[:, ch] = tail * 0.08 + er
    pd = np.zeros((int(predelay * SR), 2))
    ir = np.concatenate([pd, ir], axis=0)
    ir = signal.sosfilt(butter_sos(140, "high", 2), ir, axis=0)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)  # unit energy per channel
    return ir


# --------------------------------------------------------------------------------------
# loudness (ITU-R BS.1770-4) and limiting
# --------------------------------------------------------------------------------------
def k_weight(x):
    # 48 kHz coefficients from BS.1770 (pre-filter shelf + RLB high-pass)
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    y = signal.lfilter(b1, a1, x, axis=0)
    y = signal.lfilter(b2, a2, y, axis=0)
    return y


def integrated_lufs(x):
    """gated integrated loudness of an (n, 2) float array"""
    y = k_weight(x.astype(np.float64))
    blk = int(0.4 * SR)
    hop = int(0.1 * SR)
    p = y ** 2
    cs = np.concatenate([np.zeros((1, 2)), np.cumsum(p, axis=0)], axis=0)
    starts = np.arange(0, len(y) - blk + 1, hop)
    ms = (cs[starts + blk] - cs[starts]) / blk
    lk = -0.691 + 10 * np.log10(np.sum(ms, axis=1) + 1e-20)
    keep = lk > -70.0
    if not np.any(keep):
        return -np.inf
    rel = -0.691 + 10 * np.log10(np.mean(np.sum(ms[keep], axis=1))) - 10.0
    keep2 = keep & (lk > rel)
    if not np.any(keep2):
        return -np.inf
    return -0.691 + 10 * np.log10(np.mean(np.sum(ms[keep2], axis=1)))


def peak_limiter(x, ceiling_db=-6.5, look_ms=6.0, release_ms=120.0):
    """transparent safety limiter (rarely engaged): lookahead max envelope -> smoothed gain"""
    ceiling = db(ceiling_db)
    look = int(look_ms / 1000 * SR)
    peak = np.max(np.abs(x), axis=1)
    if peak.max() <= ceiling:
        return x, False
    env = maximum_filter1d(peak, size=2 * look + 1, mode="nearest")
    g = np.minimum(1.0, ceiling / np.maximum(env, 1e-9))
    g = minimum_filter1d(g, size=2 * look + 1, mode="nearest")      # hold
    a = np.exp(-1.0 / (release_ms / 1000 * SR))
    g_s = signal.lfilter([1 - a], [1, -a], g)                       # release smoothing
    g_s = np.minimum(g_s, g)
    g_s = signal.lfilter([1 - a], [1, -a], g_s[::-1])[::-1]          # symmetric smoothing (attack)
    g_s = np.minimum(g_s, g)
    return x * g_s[:, None], True


# --------------------------------------------------------------------------------------
# the score
# --------------------------------------------------------------------------------------
def render(W, out_file):
    """W maps storyboard seconds -> picture seconds; W.total is the output length"""
    global DUR, N, N_PAD
    DUR = W.total
    N = int(round(SR * DUR))
    N_PAD = (N + PAD_UP - 1) // PAD_UP
    t_start = time.time()
    os.makedirs(os.path.dirname(os.path.abspath(out_file)), exist_ok=True)

    def lap(msg):
        print(f"[{time.time() - t_start:6.1f} s] {msg}", flush=True)

    total = DUR
    t_freeze = W(15.0)
    end_cards = total - 0.5                        # the final chord ends here; zeros after it

    pad_lo = np.zeros((N_PAD, 2), dtype=np.float64)   # pads at 12 kHz
    piano_bus = np.zeros((N, 2), dtype=np.float32)
    pulse_bus = np.zeros((N, 2), dtype=np.float32)
    sub_bus = np.zeros((N, 2), dtype=np.float32)
    misc_bus = np.zeros((N, 2), dtype=np.float32)      # arps, air, risers, room tone, realisation tone

    # ---------------------------------------------------------------- 0. room tone (0 -> freeze)
    n_rt = int(t_freeze * SR)
    rt = rng.standard_normal((n_rt, 2))
    rt = signal.sosfilt(butter_sos(160, "low", 2), rt, axis=0)
    rt_env = smoothstep_env(n_rt, 1.5, 1.0)             # reaches zero exactly at the freeze
    add_at(misc_bus, rt * rt_env[:, None], 0.0, gain=db(-20))   # ~ -62 dBFS after normalisation

    # ---------------------------------------------------------------- 1. realisation tone (freeze + 0.5 s)
    n_tone = int(9.0 * SR)
    tt = np.arange(n_tone) / SR
    tone = np.sin(2 * np.pi * hz("A3") * tt) + 0.25 * np.sin(2 * np.pi * hz("A4") * tt + 1.0)
    tone *= (0.9 + 0.1 * np.sin(2 * np.pi * 0.35 * tt))
    tone *= smoothstep_env(n_tone, 1.6, 4.0)
    add_at(misc_bus, tone, t_freeze + 0.5, gain=db(-24))

    # ---------------------------------------------------------------- 2. chord map (storyboard seconds)
    # Key path: D dorian/minor -> F major (76) -> C (160) -> G (168) -> D major (273):
    # the second half climbs the circle of fifths, and the film ends in the parallel major
    # of the key it began in.
    P_MYST = dict(bright=0.55, nharm=6, detune=6.0, spread=0.75, attack=3.0, release=3.5)
    P_COOL = dict(bright=0.35, nharm=4, detune=2.5, spread=0.3, attack=2.5, release=3.0)
    P_WARM = dict(bright=0.7, nharm=7, detune=5.0, spread=0.8, attack=2.2, release=3.0)
    P_BRIGHT = dict(bright=0.85, nharm=7, detune=5.0, spread=0.85, attack=1.8, release=2.8)
    P_AIR = dict(bright=0.75, nharm=8, detune=7.0, spread=1.0, attack=3.0, release=3.5)
    P_CLEAN = dict(bright=0.65, nharm=6, detune=4.0, spread=0.8, attack=1.6, release=2.5)
    P_FIRM = dict(bright=0.75, nharm=7, detune=4.0, spread=0.75, attack=1.2, release=2.2)
    P_INTIM = dict(bright=0.5, nharm=5, detune=4.0, spread=0.7, attack=2.5, release=3.5)
    P_FINAL = dict(bright=0.7, nharm=7, detune=6.0, spread=0.9, attack=2.5, release=3.5)
    P_TENSE = dict(bright=0.7, nharm=7, detune=5.0, spread=0.6, attack=1.8, release=1.2)

    chords = [
        # ---- title (D minor, mysterious)
        (19.0, 24.0, ["D2", "A2", "D3", "E4"], P_MYST, -3),
        # ---- before screens 24-53 (D dorian)
        (24.0, 31.3, ["D2", "A2", "D3", "F3", "E4"], P_MYST, 0),      # Dm9
        (31.3, 38.5, ["D2", "G2", "D3", "B3", "E4"], P_MYST, 0),      # G/D   (dorian IV)
        (38.5, 45.8, ["D2", "A2", "C3", "F3", "A3"], P_MYST, 0),      # Dm7
        (45.8, 53.0, ["C3", "G3", "E4"], P_MYST, -1),                 # C/D   (ambiguous)
        # ---- early computing 53-76 (cooler, D aeolian, thin)
        (53.0, 60.7, ["D2", "A2", "D3", "F3"], P_COOL, 0),            # Dm
        (60.7, 68.0, ["D2", "G2", "Bb2", "D3"], P_COOL, 0),           # Gm/D  (darker iv)
        (68.0, 76.0, ["C3", "G3", "D4", "E4"], P_COOL, 0),            # C(add9)/D -> prepares the lift
        # ---- the mouse 76-108 (F major: the lift)
        (76.0, 84.0, ["F2", "C3", "A3", "E4", "G4"], P_WARM, 1),      # Fmaj9
        (84.0, 92.0, ["E2", "G3", "C4", "E4"], P_WARM, 0),            # C/E
        (92.0, 100.0, ["D2", "A2", "C4", "F4"], P_WARM, 0),           # Dm7
        (100.0, 108.0, ["Bb1", "F3", "C4", "D4"], P_WARM, 0),         # Bb(add9)  (leitmotif over it)
        # ---- graphical revolution 108-138 (F major, brighter)
        (108.0, 115.5, ["F2", "C3", "A3", "G4"], P_BRIGHT, 0),        # F(add9)
        (115.5, 123.0, ["G2", "D3", "F3", "Bb3"], P_BRIGHT, 0),       # Gm7
        (123.0, 130.5, ["Bb2", "F3", "C4", "D4"], P_BRIGHT, 0),       # Bb(add9)
        (130.5, 138.0, ["C3", "G3", "D4", "E4"], P_BRIGHT, 0),        # C(add9)
        # ---- the web 138-168 (expansive, F lydian -> lift to C at 160)
        (138.0, 145.5, ["F2", "C3", "E4", "G4", "A4"], P_AIR, 0),     # Fmaj9 (open)
        (145.5, 153.0, ["F2", "G3", "B3", "D4"], P_AIR, 0),           # G/F   (lydian #4)
        (153.0, 160.0, ["D2", "A2", "E3", "F3", "A4"], P_AIR, 0),     # Dm9
        (160.0, 168.0, ["C2", "G3", "D4", "E4", "G4"], P_AIR, 1),     # C(add9)  <- soft lift
        # ---- mobile 168-200 (G major, lighter/cleaner)
        (168.0, 176.0, ["G2", "D3", "B3", "A4"], P_CLEAN, 0),         # G(add9)
        (176.0, 184.0, ["F#2", "A3", "D4"], P_CLEAN, 0),              # D/F#
        (184.0, 192.0, ["E2", "B2", "D4", "G4"], P_CLEAN, 0),         # Em7
        (192.0, 200.0, ["C2", "G3", "D4", "E4"], P_CLEAN, 0),         # C(add9)
        # ---- UX vs UI 200-242 (G major, confident)
        (200.0, 208.0, ["G2", "D3", "B3", "A4"], P_FIRM, 1),          # G(add9)
        (208.0, 216.0, ["E2", "B2", "D4", "G4"], P_FIRM, 0),          # Em7
        (216.0, 224.0, ["C2", "G3", "D4", "E4"], P_FIRM, 0),          # C(add9)
        (224.0, 227.0, ["Ab2", "Eb3", "G3", "C4", "D4"], P_TENSE, 1), # Abmaj7#11 (tension: Ab-D tritone)
        (227.0, 231.5, ["D2", "A2", "F#3", "E4"], P_FIRM, 0),         # D(add9)  release
        (231.5, 236.5, ["G2", "D3", "B3", "A4"], P_FIRM, 0),          # G(add9)
        (236.5, 242.0, ["C2", "G3", "D4", "E4"], P_FIRM, 0),          # C(add9)
        # ---- design for everyone 242-273 (E minor / G, intimate)
        (242.0, 250.0, ["E2", "B2", "D3", "F#3", "G3"], P_INTIM, 0),  # Em9
        (250.0, 258.0, ["C2", "G3", "D4", "E4"], P_INTIM, 0),         # C(add9)
        (258.0, 265.5, ["B1", "G3", "D4"], P_INTIM, 0),               # G/B
        (265.5, 271.0, ["A1", "E3", "D4"], P_INTIM, 0),               # Asus4
        (271.0, 273.0, ["A1", "E3", "C#4"], P_INTIM, 0),              # A  -> resolves to D at 273
        # ---- the future / the door 273-293 (D major: home, now in the major)
        (273.0, 281.0, ["D2", "A2", "F#3", "E4"], P_FINAL, 1),        # D(add9)
        (281.0, 287.0, ["D2", "G3", "B3", "D4"], P_FINAL, 0),         # G/D   (plagal)
        (287.0, 293.0, ["D2", "A2", "F#3", "E4", "A4"], P_FINAL, 0),  # D(add9)
        # ---- final cards 293 -> end (faded by the master fade)
        (293.0, None, ["D2", "A2", "F#3", "E4"], P_FINAL, -2),
    ]

    lap("rendering pads")
    for (t0, t1, notes, p, lvl) in chords:
        att = p["attack"]
        final = t1 is None
        rel = 0.1 if final else p["release"]
        a0 = W(t0)
        a1 = end_cards if final else W(t1)
        lead = 0.35 * att                      # start a little early so the change lands on the cue
        dur = (a1 - a0) + lead + rel
        for i, nm in enumerate(notes):
            f = hz(nm)
            g = db(lvl) * (1.0 if i < 2 else 0.75) * (0.8 if f > 400 else 1.0)
            voice = pad_note(f, dur, attack=att, release=rel, bright=p["bright"], nharm=p["nharm"],
                             detune=p["detune"], spread=p["spread"])
            add_at(pad_lo, voice, a0 - lead, gain=g, sr=PAD_SR)
    pad_bus = fit(signal.resample_poly(pad_lo, PAD_UP, 1, axis=0), N).astype(np.float32)
    del pad_lo

    # ---------------------------------------------------------------- 3. sub drone
    lap("rendering sub")
    sub_roots = [  # (storyboard time, root)  - glides over 0.4 s before each change
        (19.0, "D1"), (53.0, "D1"), (76.0, "F1"), (84.0, "C2"), (92.0, "D1"), (100.0, "Bb1"),
        (108.0, "F1"), (115.5, "G1"), (123.0, "Bb1"), (130.5, "C2"), (138.0, "F1"), (160.0, "C2"),
        (168.0, "G1"), (176.0, "D2"), (184.0, "E1"), (192.0, "C2"), (200.0, "G1"), (208.0, "E1"),
        (216.0, "C2"), (224.0, "Ab1"), (227.0, "D2"), (231.5, "G1"), (236.5, "C2"), (242.0, "E1"),
        (250.0, "C2"), (258.0, "G1"), (265.5, "A1"), (273.0, "D1"),
    ]
    sub_roots = [(W(tm), nm) for tm, nm in sub_roots] + [(total - 1.0, "D1")]
    pts = []
    for i, (tm, nm) in enumerate(sub_roots):
        if i > 0:
            pts.append((tm - 0.4, hz(sub_roots[i - 1][1])))
        pts.append((tm, hz(nm)))
    f_track = interp_env(pts)
    phase = 2 * np.pi * np.cumsum(f_track) / SR
    t_all = np.arange(N) / SR
    sub = np.sin(phase) + 0.3 * np.sin(2 * phase + 0.5)      # a little 2nd harmonic for small speakers
    sub *= 0.88 + 0.12 * np.sin(2 * np.pi * 0.05 * t_all)
    sub_env_pts = [
        (0, 0), (19.0, 0), (24.0, 0.25), (30.0, 0.9), (53.0, 0.9), (56.0, 0.55), (74.0, 0.55),
        (76.0, 0.9), (108.0, 0.9), (138.0, 1.0), (168.0, 0.75), (200.0, 0.9), (224.0, 0.7),
        (227.0, 0.9), (242.0, 0.9), (246.0, 0.45), (271.0, 0.45), (273.0, 0.9), (293.0, 0.8),
    ]
    sub_env = interp_env([(W(tm), v) for tm, v in sub_env_pts] + [(total - 1.0, 0.0)])
    sub_bus[:, 0] = (sub * sub_env * db(-15)).astype(np.float32)
    sub_bus[:, 1] = sub_bus[:, 0]
    del phase, sub, f_track, t_all

    # ---------------------------------------------------------------- 4. the point motif (leitmotif)
    lap("rendering piano")
    MOTIF = [0, 2, 5, 7]                       # scale degrees 1 2 4 5  (D E G A in D)
    MOTIF_T = [0.0, BEAT / 2, BEAT, 2 * BEAT]  # eighth, eighth, quarter, held

    def motif(t0, root_name, vel=0.55, stretch=1.0, full=False, pan_center=0.0):
        base = W(t0)
        root = n2m(root_name)
        degs = list(MOTIF)
        times = list(MOTIF_T)
        if full:                               # ... and up to the octave: the resolved form
            degs.append(12)
            times.append(3.5 * BEAT)
        for k, (d, tm) in enumerate(zip(degs, times)):
            v = vel * (0.85 + 0.15 * (k == len(degs) - 1))
            pan = pan_center + 0.12 * (k - 1.5)
            add_at(piano_bus, felt_piano(midi(root + d), vel=v), base + tm * stretch, pan=pan)

    def note(t0, name, vel=0.45, pan=None):
        m = n2m(name)
        if pan is None:
            pan = float(np.clip((m - 64) / 30.0, -0.6, 0.6))
        add_at(piano_bus, felt_piano(midi(m), vel=vel), W(t0), pan=pan)

    # title reveal: the point motif appears
    motif(19.6, "D4", vel=0.55)
    note(22.4, "D3", vel=0.25)
    # mechanical era: a few distant echoes
    note(36.0, "A3", vel=0.22)
    note(40.2, "F3", vel=0.2)
    note(47.6, "E4", vel=0.2)
    # the mouse: the lift at 76.0 and the leitmotif at "point to" (~100-104)
    note(76.0, "F2", vel=0.42, pan=-0.2)
    note(76.0, "C3", vel=0.32, pan=0.1)
    note(80.3, "A3", vel=0.22)
    note(88.6, "E4", vel=0.2)
    motif(100.5, "F4", vel=0.6)
    note(104.6, "F3", vel=0.25)
    # graphical revolution: brighter high figures
    for tm, nm in [(109.8, "A4"), (111.6, "C5"), (113.5, "F5"), (117.3, "D5"), (119.1, "F5"),
                   (121.0, "Bb4"), (122.8, "D5"), (124.6, "F5"), (126.5, "C5"), (128.3, "D5"),
                   (130.1, "Bb4"), (132.0, "E5"), (133.8, "G5"), (135.6, "C5")]:
        note(tm, nm, vel=0.26)
    note(114.4, "G4", vel=0.3)                 # motif fragment (2 4 5)
    note(114.85, "Bb4", vel=0.3)
    note(115.3, "C5", vel=0.34)
    # the web: wide, sparse high notes; soft lift at 160 with the motif echoed in C
    for tm, nm, v in [(140.6, "A5", 0.2), (147.2, "B4", 0.2), (151.0, "D5", 0.18), (155.5, "A4", 0.2)]:
        note(tm, nm, v)
    note(160.2, "E5", vel=0.3, pan=0.25)
    note(160.2, "G5", vel=0.26, pan=-0.25)
    motif(161.2, "C5", vel=0.38, stretch=1.15)
    # mobile: quick light motif in G
    motif(176.4, "G4", vel=0.38, stretch=0.8)
    note(193.2, "E5", vel=0.24)
    # UX vs UI: the confident statement
    motif(200.5, "G4", vel=0.66)
    note(200.5, "G3", vel=0.4, pan=-0.2)
    note(212.0, "B4", vel=0.3)
    note(216.4, "E5", vel=0.26)
    # release after the tension cue
    note(227.2, "F#4", vel=0.36, pan=-0.15)
    note(227.2, "A4", vel=0.3, pan=0.15)
    note(233.0, "D5", vel=0.26)
    note(237.0, "E5", vel=0.24)
    note(239.1, "G5", vel=0.3)                 # under the success chime
    # design for everyone: intimate, sparse; motif fragment in E minor
    motif(244.0, "E4", vel=0.36, stretch=1.3, pan_center=-0.1)
    for tm, nm, v in [(251.5, "G4", 0.3), (254.5, "E5", 0.26), (257.0, "D5", 0.24), (259.4, "B4", 0.3),
                      (262.5, "G5", 0.24), (266.2, "E5", 0.26), (269.0, "C#5", 0.3), (271.4, "E5", 0.26)]:
        note(tm, nm, v)
    # the future: the leitmotif resolves fully in D major (1 2 4 5 8)
    motif(274.6, "D4", vel=0.6, stretch=1.3, full=True)
    note(281.4, "F#4", vel=0.3, pan=-0.2)
    note(281.4, "A4", vel=0.26, pan=0.2)
    note(284.5, "B4", vel=0.26)
    # the door opens cleanly: a final high dyad, then the chord carries the cards
    note(289.6, "D5", vel=0.36, pan=0.2)
    note(289.6, "A4", vel=0.3, pan=-0.2)
    note(293.2, "D4", vel=0.3)
    note(293.2, "F#5", vel=0.22)

    # ---------------------------------------------------------------- 5. textures
    lap("rendering textures")

    def ramp(tm, sb_pts, vals):
        """gain ramp defined at storyboard times, evaluated at picture time tm"""
        return float(np.interp(tm, [W(p) for p in sb_pts], vals))

    # 5a. distant machine pulse 24-53 (period = 2 beats, drifting slightly)
    tm = W(24.4)
    while tm < W(52.5):
        g = db(-30) * ramp(tm, [24, 29, 48, 52.5], [0.0, 1.0, 1.0, 0.0]) * rng.uniform(0.8, 1.0)
        add_at(pulse_bus, machine_thump(), tm, gain=g, pan=rng.uniform(-0.15, 0.15))
        tm += 2 * BEAT * rng.uniform(0.985, 1.015)

    # 5b. faint electronic sine arpeggio 55-75.5 (mono-ish)
    arp_pool = [n2m(x) for x in ["D5", "F5", "A5", "C6", "D6", "A5", "G5"]]
    tm = W(55.0)
    k = 0
    while tm < W(75.3):
        g = db(-33) * ramp(tm, [55, 59, 72.5, 75.3], [0.0, 1.0, 1.0, 0.0])
        m = arp_pool[(k * 3 + (k // 7)) % len(arp_pool)]
        if rng.uniform() < 0.82:
            add_at(misc_bus, sine_blip(midi(m), vel=0.5), tm, gain=g, pan=rng.uniform(-0.08, 0.08))
        tm += BEAT / 2
        k += 1

    # 5c. gentle rhythmic pulse 108-138 (soft 'tock' on beats, lighter on 2 & 4)
    tm = W(108.0)
    b = 0
    while tm < W(137.6):
        strength = 1.0 if b % 4 == 0 else (0.55 if b % 2 == 0 else 0.38)
        g = db(-33) * strength * ramp(tm, [108, 111, 135, 137.6], [0.0, 1.0, 1.0, 0.0])
        add_at(pulse_bus, tick(freq=165.0), tm, gain=g, pan=0.18 * (1 if b % 2 else -1))
        tm += BEAT
        b += 1

    # 5d. the web: high air 138-168 (extra wide); a faint shimmer under the finale
    add_at(misc_bus, air_noise(W(168.0) - W(138.0)), W(138.0), gain=db(-8))
    add_at(misc_bus, air_noise(W(293.0) - W(277.0), lo=5000, hi=9000), W(277.0), gain=db(-14))

    # 5e. mobile: light pluck ostinato (dotted-eighth motion) + soft high ticks 168-200
    mob_chords = {168: ["G4", "B4", "D5", "A5"], 176: ["F#4", "A4", "D5", "E5"],
                  184: ["E4", "G4", "B4", "D5"], 192: ["E4", "G4", "C5", "D5"]}
    tm = W(168.0)
    k = 0
    while tm < W(199.4):
        sb = W.inv(tm)
        base = int(np.clip(168 + 8 * int((sb - 168) // 8), 168, 192))
        pool = mob_chords[base]
        nm = pool[(k * 2 + k // 3) % len(pool)]
        g = db(-31) * ramp(tm, [168, 171, 197, 199.4], [0.0, 1.0, 1.0, 0.0])
        if rng.uniform() < 0.85:
            add_at(pulse_bus, soft_pluck(hz(nm), vel=0.5), tm, gain=g, pan=0.35 * np.sin(k * 1.3))
        tm += 0.75 * BEAT
        k += 1
    tm = W(168.0)
    b = 0
    while tm < W(199.4):
        g = db(-38) * (1.0 if b % 2 == 0 else 0.6) * ramp(tm, [168, 171, 197, 199.4], [0, 1, 1, 0])
        add_at(pulse_bus, tick(freq=520.0, dur=0.15, decay=0.03, noise_amt=0.5, noise_band=(1500, 4000)),
               tm, gain=g, pan=0.25 * (1 if b % 2 else -1))
        tm += BEAT / 2
        b += 1

    # 5f. UX vs UI: more present pulse 200-242 (quarter 'tock' + low pulse on 1 and 3), ducked at the tension
    tm = W(200.0)
    b = 0
    while tm < W(241.6):
        env_p = ramp(tm, [200, 202, 223.5, 224.2, 227.0, 228.0, 240, 241.6], [0, 1, 1, 0.15, 0.15, 1, 1, 0])
        strength = 1.0 if b % 4 == 0 else (0.6 if b % 2 == 0 else 0.42)
        add_at(pulse_bus, tick(freq=150.0, decay=0.08, noise_amt=0.25), tm,
               gain=db(-30) * strength * env_p, pan=0.15 * (1 if b % 2 else -1))
        if b % 2 == 0:
            add_at(pulse_bus, machine_thump(dur=0.5), tm, gain=db(-34) * env_p, pan=0.0)
        tm += BEAT
        b += 1

    # 5g. tension riser (checkout_tension -> checkout_release): filtered noise swell + beating low tone
    r_dur = max(0.8, W(227.0) - W(224.0) - 0.1)
    n_r = int(r_dur * SR)
    tr = np.arange(n_r) / SR
    nz = rng.standard_normal((n_r, 2))
    nz = signal.sosfilt(butter_sos([220, 1600], "band", 2), nz, axis=0)
    rise = (tr / r_dur) ** 2.2
    swell = rise * (1 - np.exp(-(r_dur - tr) / 0.05))
    riser = nz * swell[:, None]
    beat_tone = np.sin(2 * np.pi * hz("D3") * tr) + np.sin(2 * np.pi * (hz("D3") * 1.012) * tr)
    riser[:, 0] += 0.5 * beat_tone * swell
    riser[:, 1] += 0.5 * beat_tone * swell
    add_at(misc_bus, riser, W(224.0), gain=db(-36))

    # ---------------------------------------------------------------- 6. mix
    lap("mixing")
    width_pts = [
        (0, 0.6), (19, 0.6), (24, 0.85), (53, 0.85), (55, 0.35), (74, 0.35), (76, 0.95), (108, 1.0),
        (138, 1.0), (141, 1.25), (166, 1.25), (168, 1.0), (200, 0.9), (242, 0.8), (273, 1.15), (300, 1.15),
    ]
    width = interp_env([(W(tm), v) for tm, v in width_pts]).astype(np.float32)

    dry = pad_bus + piano_bus + pulse_bus + misc_bus
    mid = 0.5 * (dry[:, 0] + dry[:, 1])
    side = 0.5 * (dry[:, 0] - dry[:, 1]) * width
    dry[:, 0] = mid + side
    dry[:, 1] = mid - side

    lap("reverb")
    ir = make_reverb_ir()
    send = pad_bus * 0.55 + piano_bus * 0.6 + pulse_bus * 0.3 + misc_bus * 0.35
    smid = 0.5 * (send[:, 0] + send[:, 1])
    sside = 0.5 * (send[:, 0] - send[:, 1]) * width
    send[:, 0] = smid + sside
    send[:, 1] = smid - sside
    del smid, sside, mid, side, pad_bus, piano_bus, pulse_bus, misc_bus
    wet = np.zeros((N, 2), dtype=np.float32)
    for ch in range(2):
        wet[:, ch] = signal.oaconvolve(send[:, ch].astype(np.float64), ir[:, ch])[:N].astype(np.float32)
    del send
    wet = signal.sosfilt(butter_sos(160, "high", 2), wet, axis=0).astype(np.float32)

    mix = (dry + wet * 0.55 + sub_bus).astype(np.float64)
    del dry, wet, sub_bus

    # ---------------------------------------------------------------- 7. master chain
    lap("master")
    mix = signal.sosfilt(butter_sos(28, "high", 2), mix, axis=0)                 # DC / rumble
    mix = signal.sosfilt(peaking_sos(2300.0, -4.5, 0.7), mix, axis=0)           # voice-band dip (1-4 kHz)
    mix = signal.sosfilt(peaking_sos(420.0, -1.5, 1.0), mix, axis=0)            # a touch of mud control
    mix = signal.sosfilt(butter_sos(15000, "low", 2), mix, axis=0)              # nothing hissy above 15 k

    # the dynamic arc of the film (dB), smooth section-to-section level automation
    arc_pts = [
        (0, 0), (19, -2.0), (24, 0.0), (53, 0.0), (55, -2.5), (74, -2.5), (76, 0.5), (108, 0.5),
        (110, 0.5), (138, 0.8), (158, 0.8), (160, 1.8), (166, 1.8), (168, -0.5), (200, -0.5),
        (201, 1.0), (223.5, 1.0), (224.5, 0.0), (227.0, 0.0), (227.5, 1.2), (242, 1.2), (244, -2.5),
        (271, -2.5), (273, -0.5), (281, 1.8), (287, 0.5), (293, 0.0), (300, 0.0),
    ]
    arc_db = interp_env([(W(tm), v) for tm, v in arc_pts])
    mix *= (10.0 ** (arc_db / 20.0))[:, None]

    # hard guarantees around the cues
    mix[int(t_freeze * SR):int((t_freeze + 0.45) * SR)] = 0.0                   # the freeze
    fade_start = min(W(293.5), total - 1.5)
    fade = interp_env([(0, 1), (fade_start, 1), (total - 0.7, 0), (total, 0)])   # master fade
    fade = np.where(fade > 0, 0.5 - 0.5 * np.cos(np.pi * fade), 0.0)
    mix *= fade[:, None]
    mix[int(end_cards * SR):] = 0.0
    mix[:int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]

    # loudness normalisation + safety limiter
    lufs = integrated_lufs(mix)
    gain = db(TARGET_LUFS - lufs)
    mix *= gain
    mix, limited = peak_limiter(mix, PEAK_CEILING_DB)
    mix -= np.mean(mix, axis=0, keepdims=True)
    mix[int(end_cards * SR):] = 0.0
    lufs_out = integrated_lufs(mix) if limited else TARGET_LUFS
    peak = np.max(np.abs(mix))
    print(f"pre-gain loudness {lufs:.2f} LUFS -> gain {20*np.log10(gain):+.2f} dB, limiter engaged: {limited}")
    print(f"result: {lufs_out:.2f} LUFS integrated, peak {20*np.log10(peak):.2f} dBFS, "
          f"{len(mix)} frames = {len(mix)/SR:.3f} s")

    sf.write(out_file, mix.astype(np.float64), SR, subtype="PCM_24")
    lap(f"wrote {out_file}")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sections", help="sections.json from the locked picture (chapters by id + moments)")
    ap.add_argument("--duration", type=float, help="output length in seconds (default: sections total, else 300.0)")
    ap.add_argument("--out", default=OUT_FILE, help="output wav path")
    args = ap.parse_args(argv)
    W = build_timemap(args.sections, args.duration)
    if args.sections or args.duration:
        print("time map (storyboard -> picture):\n" + W.table())
    render(W, args.out)


if __name__ == "__main__":
    main()
