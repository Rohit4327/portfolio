#!/usr/bin/env python3
"""
sfx.py — procedural sound design for "The Invisible Conversation: How UX & UI Came to Life"

Renders
  audio/out/sfx/<cue>.wav       one stereo 48 kHz file per cue-sheet row, peak-normalised to -12 dBFS,
                                with the row's internal timing baked in (t = 0 is the row's start time)
  audio/out/sfx/cue_sheet.csv   name, start, end, file, gain applied in the composite
  audio/out/sfx_bed.wav         composite stem, stereo 48 kHz 24-bit PCM, exactly 300.000 s,
                                peaks at or below -12 dBFS, silence 0.0-0.6 s and 15.0-15.8 s

Everything is synthesized from noise and oscillators with numpy + scipy; no samples.
Deterministic (fixed seed).  Re-render:
    cd 09_project_source_files && python3 audio/sfx.py
"""
import csv
import os
import time
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
DUR = 300.0
N = int(SR * DUR)
SEED = 7340032
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")
SFX_DIR = os.path.join(OUT_DIR, "sfx")
BED_FILE = os.path.join(OUT_DIR, "sfx_bed.wav")
FILE_PEAK_DB = -12.0        # individual files
BED_CEILING_DB = -12.0      # composite

rng = np.random.default_rng(SEED)

# the "amber point" pitch: D5 — sits in every key of the score (D minor, F, C, G, D major)
POINT_HZ = 587.33


# --------------------------------------------------------------------------------------
# toolkit
# --------------------------------------------------------------------------------------
def db(x):
    return 10.0 ** (x / 20.0)


def T(dur):
    n = int(round(dur * SR))
    return n, np.arange(n) / SR


def noise(n):
    return rng.standard_normal(n)


def sos(cut, kind, order=2):
    return signal.butter(order, cut, btype=kind, fs=SR, output="sos")


def bp(x, lo, hi, order=2):
    return signal.sosfilt(sos([lo, hi], "band", order), x)


def lp(x, fc, order=2):
    return signal.sosfilt(sos(fc, "low", order), x)


def hp(x, fc, order=2):
    return signal.sosfilt(sos(fc, "high", order), x)


def expd(t, tau):
    return np.exp(-t / tau)


def asym_hann(n, peak=0.5, power=1.0):
    """rise with a raised cosine to `peak` (fraction), then fall"""
    k = int(np.clip(peak, 0.01, 0.99) * n)
    env = np.empty(n)
    env[:k] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, k))
    env[k:] = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n - k))
    return env ** power


def fade_io(x, fin, fout):
    """raised-cosine fade in/out (seconds) on a mono or stereo array"""
    n = len(x)
    a = int(min(fin * SR, n // 2))
    r = int(min(fout * SR, n // 2))
    env = np.ones(n)
    if a > 0:
        env[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if r > 0:
        env[n - r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return x * (env if x.ndim == 1 else env[:, None])


def tail(x, frac=0.25):
    return fade_io(x, 0.0, frac * len(x) / SR)


def smooth_curve(points, n):
    """smooth (cosine-interpolated) curve through [(pos 0..1, value), ...] over n samples"""
    xs = np.linspace(0, 1, n)
    ps = np.array([p[0] for p in points])
    vs = np.array([p[1] for p in points])
    out = np.interp(xs, ps, vs)
    # soften the corners
    k = max(3, int(0.03 * n))
    win = np.hanning(k)
    win /= win.sum()
    pad = np.pad(out, (k, k), mode="edge")
    return np.convolve(pad, win, mode="same")[k:-k]


def tv_bandpass(x, fc, q=2.0, block=48):
    """time-varying RBJ bandpass (constant peak gain) — coefficients updated per block"""
    y = np.zeros_like(x)
    zi = np.zeros((1, 2))
    n = len(x)
    for i in range(0, n, block):
        f = float(fc[min(i + block // 2, n - 1)])
        f = min(max(f, 20.0), 0.45 * SR)
        w0 = 2 * np.pi * f / SR
        alpha = np.sin(w0) / (2 * q)
        a0 = 1 + alpha
        s = np.array([[alpha / a0, 0.0, -alpha / a0, 1.0, -2 * np.cos(w0) / a0, (1 - alpha) / a0]])
        y[i:i + block], zi = signal.sosfilt(s, x[i:i + block], zi=zi)
    return y


def partials(t, freqs, decays, amps=None, jitter=0.004):
    """inharmonic cluster of decaying sines (metal / wood bodies)"""
    out = np.zeros_like(t)
    for k, (f, d) in enumerate(zip(freqs, decays)):
        a = 1.0 if amps is None else amps[k]
        f = f * (1 + rng.uniform(-jitter, jitter))
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * expd(t, d)
    return out


def glide(t, f_from, f_to, shape=1.0):
    """phase for a smooth pitch glide"""
    s = (t / t[-1]) ** shape if len(t) > 1 else t
    s = 0.5 - 0.5 * np.cos(np.pi * s)
    f = f_from + (f_to - f_from) * s
    return 2 * np.pi * np.cumsum(f) / SR


def pan(x, p):
    """mono -> stereo, constant power, p in [-1, 1]"""
    gl = np.sqrt((1 - p) / 2) * np.sqrt(2)
    gr = np.sqrt((1 + p) / 2) * np.sqrt(2)
    return np.stack([x * gl, x * gr], axis=1)


def pan_move(x, p_from, p_to):
    p = np.linspace(p_from, p_to, len(x))
    gl = np.sqrt((1 - p) / 2) * np.sqrt(2)
    gr = np.sqrt((1 + p) / 2) * np.sqrt(2)
    return np.stack([x * gl, x * gr], axis=1)


def stereo(x):
    return x if x.ndim == 2 else pan(x, 0.0)


def mix_into(buf, x, t0):
    """add stereo x into stereo buf at t0 (seconds), growing buf if needed"""
    i0 = int(round(t0 * SR))
    need = i0 + len(x)
    if need > len(buf):
        buf = np.concatenate([buf, np.zeros((need - len(buf), 2))], axis=0)
    buf[i0:i0 + len(x)] += x
    return buf


def seq(events, tail_s=0.6):
    """events: [(t_rel, stereo array), ...] -> one stereo array"""
    total = max(t + len(x) / SR for t, x in events) + tail_s
    buf = np.zeros((int(total * SR), 2))
    for t, x in events:
        buf = mix_into(buf, stereo(x), t)
    return buf


def norm(x, peak_db=0.0):
    m = np.max(np.abs(x))
    return x * (db(peak_db) / m) if m > 0 else x


# small room (the hallway) and a tiny "outdoor" reflection
def make_room_ir(rt60=0.42, dur=0.55, lpf=4200, predelay=0.008):
    n, t = T(dur)
    ir = np.zeros((n, 2))
    for ch in range(2):
        nz = lp(noise(n), lpf)
        nz = hp(nz, 160)
        ir[:, ch] = nz * expd(t, rt60 / 6.908)
        for _ in range(5):
            d = int(rng.uniform(0.004, 0.03) * SR)
            ir[d, ch] += rng.uniform(0.2, 0.5) * rng.choice([-1, 1])
    ir = np.concatenate([np.zeros((int(predelay * SR), 2)), ir], axis=0)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


ROOM_IR = None


def room(x, wet=0.25):
    """stereo small-room reverb: dry + wet * (x conv IR); returns the full length incl. tail"""
    global ROOM_IR
    if ROOM_IR is None:
        ROOM_IR = make_room_ir()
    x = stereo(x)
    out = np.zeros((len(x) + len(ROOM_IR) - 1, 2))
    for ch in range(2):
        out[:, ch] = signal.fftconvolve(x[:, ch], ROOM_IR[:, ch]) * 0.3 * wet
    out[:len(x)] += x
    return out


# --------------------------------------------------------------------------------------
# generators
# --------------------------------------------------------------------------------------
def footstep(strength=1.0, outdoor=False):
    n, t = T(0.42)
    f = (72 if not outdoor else 80) * (1 + 1.3 * expd(t, 0.012))
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.05 if not outdoor else 0.035)
    heel = bp(noise(n), 900 if not outdoor else 1300, 4200 if not outdoor else 5500) * expd(t, 0.0035)
    scuff = bp(noise(n), 350, 1600) * expd(t, 0.014)
    toe = np.zeros(n)
    d = int(rng.uniform(0.06, 0.095) * SR)
    toe[d:] = (bp(noise(n - d), 500, 2200) * expd(t[:n - d], 0.006)) * rng.uniform(0.35, 0.55)
    sig = 1.0 * thump + 0.5 * heel + 0.25 * scuff + toe
    sig *= strength
    if outdoor:
        grit = bp(noise(n), 2000, 7000) * expd(t, 0.02) * 0.08
        sig = sig + grit
        return tail(room(pan(sig, 0.0), wet=0.08), 0.2)
    return tail(room(pan(sig, 0.0), wet=0.3), 0.2)


def door_push_thud(hard=1.0):
    n, t = T(1.0)
    f = 46 * (1 + 1.6 * expd(t, 0.022))
    thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.13)
    body = lp(noise(n), 380) * expd(t, 0.05)
    wood = bp(noise(n), 160, 900) * expd(t, 0.028)
    sig = thud + 0.6 * body + 0.45 * wood
    # the metal handle rattles against its stop
    for k, (dly, amp) in enumerate([(0.045, 0.32), (0.105, 0.22), (0.19, 0.13), (0.3, 0.06)]):
        i = int(dly * SR)
        m = n - i
        tt = t[:m]
        ring = partials(tt, [2140, 3320, 5080, 6900], [0.04, 0.035, 0.03, 0.025], [1, 0.7, 0.4, 0.25], 0.01)
        ring += 0.6 * bp(noise(m), 2500, 9000) * expd(tt, 0.002)
        sig[i:] += amp * ring * 0.4
    sig *= hard
    return tail(room(pan(sig, -0.05), wet=0.3), 0.25)


def latch_click(bright=False):
    n, t = T(0.3)
    k = 1.25 if bright else 1.0
    click = bp(noise(n), 1500 * k, 7500 * k) * expd(t, 0.0025)
    metal = partials(t, [1850 * k, 2900 * k, 4400 * k], [0.05, 0.04, 0.03], [1, 0.6, 0.35], 0.01) * 0.35
    i = int(0.035 * SR)
    bolt = np.zeros(n)
    bolt[i:] = bp(noise(n - i), 800, 3200) * expd(t[:n - i], 0.006) * 0.6
    body = lp(noise(n), 600) * expd(t, 0.01) * 0.4
    return click + metal + bolt + body


def hinge_sweep(dur=1.8, bright=False):
    n, t = T(dur)
    k = 1.4 if bright else 1.0
    fc = smooth_curve([(0, 280 * k), (0.35, 820 * k), (0.7, 640 * k), (1.0, 440 * k)], n)
    core = tv_bandpass(noise(n), fc, q=5.0)
    body = tv_bandpass(noise(n), fc * 0.7, q=1.2) * 0.5
    env = asym_hann(n, peak=0.3, power=0.8)
    friction = 1.0 + 0.08 * np.sin(2 * np.pi * 7.0 * t + rng.uniform(0, 6.28)) * np.sin(2 * np.pi * 1.3 * t)
    sig = (norm(core) + 0.5 * norm(body)) * env * friction
    air = norm(lp(noise(n), 900)) * asym_hann(n, peak=0.5) * 0.35
    return sig + air


def door_open(bright=False):
    """latch click then the hinge sweep (and the air moving through the gap)"""
    latch = latch_click(bright)
    sweep = hinge_sweep(1.25 if bright else 1.8, bright)
    ev = [(0.0, pan(latch, 0.1)), (0.18 if bright else 0.2, pan_move(sweep, 0.1, -0.25))]
    s = seq(ev, tail_s=0.5)
    return tail(room(s, wet=0.2 if bright else 0.32), 0.2)


def point_tone(dur=1.2, warm=False, attack=0.3):
    """the amber point: sine + 2nd harmonic, soft attack, gentle fade"""
    n, t = T(dur)
    a = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / attack, 0, 1))
    decay = expd(t, dur / 2.6)
    env = a * decay
    env = fade_io(env, 0, 0.25 * dur)
    out = np.zeros((n, 2))
    for ch, det in enumerate((-0.12, 0.12)):
        f0 = POINT_HZ + det
        vib = 1.0 + 0.0025 * np.sin(2 * np.pi * 4.8 * t) * np.clip((t - 0.25) / 0.6, 0, 1)   # a faint glow
        ph = 2 * np.pi * np.cumsum(f0 * vib) / SR
        sig = np.sin(ph)
        sig += 0.33 * np.sin(2 * ph + 0.4) * expd(t, dur / 3)
        if warm:
            sig += 0.3 * np.sin(0.5 * ph + 0.2)
            sig += 0.07 * np.sin(3 * ph) * expd(t, dur / 4)
        else:
            sig += 0.12 * np.sin(0.5 * ph + 0.2)
        out[:, ch] = sig * env
    return out


def whoosh(dur=1.5, f_pts=((0, 400), (0.45, 2500), (1.0, 800)), peak=0.45, q=1.1,
           pan_from=-0.4, pan_to=0.4, power=1.0, stereo_dec=0.0):
    n, t = T(dur)
    fc = smooth_curve(list(f_pts), n)
    env = asym_hann(n, peak=peak, power=power)
    if stereo_dec > 0:
        l = tv_bandpass(noise(n), fc, q) * env
        r = tv_bandpass(noise(n), fc, q) * env
        m = tv_bandpass(noise(n), fc, q) * env
        return np.stack([m * (1 - stereo_dec) + l * stereo_dec, m * (1 - stereo_dec) + r * stereo_dec], axis=1)
    sig = tv_bandpass(noise(n), fc, q) * env
    return pan_move(sig, pan_from, pan_to)


def switch_click():
    n, t = T(0.25)
    press = bp(noise(n), 2000, 7500) * expd(t, 0.0022)
    snap = bp(noise(n), 500, 2600) * expd(t, 0.007) * 0.7
    f = 190 * (1 + 0.5 * expd(t, 0.008))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.02) * 0.6
    sig = press + snap + body
    i = int(rng.uniform(0.04, 0.055) * SR)
    sig[i:] += 0.5 * (bp(noise(n - i), 1500, 6000) * expd(t[:n - i], 0.002) + 0.4 * body[:n - i])
    return tail(sig, 0.3)


def ratchet_tick(level=1.0):
    n, t = T(0.06)
    return level * (bp(noise(n), 1500, 5500) * expd(t, 0.0025) + 0.5 * np.sin(2 * np.pi * 950 * t) * expd(t, 0.008))


def rotary_dial():
    """wind-up (finger pulls the dial, soft ratchet) -> pause -> return pulses slowing down -> stop"""
    ev = []
    # wind-up whirr
    n, t = T(0.95)
    whirr = bp(noise(n), 500, 2600) * asym_hann(n, 0.4) * 0.22
    ev.append((0.0, pan(whirr, 0.1)))
    tt = 0.08
    k = 0
    while tt < 0.9:
        ev.append((tt, pan(ratchet_tick(0.55 + 0.1 * rng.uniform()), 0.1)))
        tt += 0.11 - 0.004 * k
        k += 1
    # return: pulses slowing, with a soft governor whirr underneath
    t0 = 1.12
    n2, t2 = T(1.9)
    gov = bp(noise(n2), 300, 1300) * (1 - t2 / 1.9) ** 1.5 * 0.2
    ev.append((t0, pan(gov, 0.12)))
    gaps = [0.10, 0.115, 0.13, 0.15, 0.175, 0.205, 0.245, 0.3, 0.37]
    tt = t0
    for g in gaps:
        ev.append((tt, pan(ratchet_tick(0.9), 0.12)))
        tt += g
    # the stop
    n3, t3 = T(0.3)
    f = 210 * (1 + 0.6 * expd(t3, 0.01))
    stop = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t3, 0.03) + bp(noise(n3), 400, 2200) * expd(t3, 0.006) * 0.8
    ev.append((tt, pan(stop * 0.9, 0.12)))
    return room(seq(ev, 0.4), wet=0.15)


def machine_room_ambience(dur=29.0):
    n, t = T(dur)
    out = np.zeros((n, 2))
    hum = (np.sin(2 * np.pi * 48 * t) + 0.5 * np.sin(2 * np.pi * 96 * t + 1) + 0.25 * np.sin(2 * np.pi * 144 * t + 2)
           + 0.1 * np.sin(2 * np.pi * 192 * t))
    hum *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.37 * t)
    for ch in range(2):
        rumble = lp(noise(n), 260) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.09 * t + ch))
        chug = np.zeros(n)
        tt = 0.3
        while tt < dur - 0.3:
            i = int(tt * SR)
            m = min(int(0.12 * SR), n - i)
            chug[i:i + m] += lp(noise(m), 300) * expd(t[:m], 0.03) * 0.5
            tt += 0.52 * rng.uniform(0.97, 1.03)
        out[:, ch] = hum * 0.35 + rumble * 0.6 + chug * 0.6
    return fade_io(out, 3.0, 3.0)


def card_flick():
    n, t = T(0.09)
    flutter = 1 + 0.6 * np.sin(2 * np.pi * 90 * t) * expd(t, 0.02)
    sig = bp(noise(n), 1500, 6500) * expd(t, 0.012) * flutter
    sig += 0.5 * bp(noise(n), 300, 1200) * expd(t, 0.006)
    return tail(sig, 0.3)


def punch_card_shuffle():
    ev = []
    tt = 0.0
    for k in range(5):
        ev.append((tt, pan(card_flick() * rng.uniform(0.7, 1.0), rng.uniform(-0.2, 0.2))))
        tt += rng.uniform(0.28, 0.45)
    return seq(ev, 0.3)


def teletype_strike(level=1.0):
    n, t = T(0.16)
    click = bp(noise(n), 1200, 6000) * expd(t, 0.003)
    thunk = lp(noise(n), 700) * expd(t, 0.02) * 0.8
    f = 140 * (1 + 0.5 * expd(t, 0.01))
    thunk += np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.03) * 0.5
    ring = np.sin(2 * np.pi * 2450 * t) * expd(t, 0.03) * 0.25 + np.sin(2 * np.pi * 3700 * t) * expd(t, 0.02) * 0.12
    sig = click + thunk + ring
    i = int(0.055 * SR)
    sig[i:] += 0.45 * bp(noise(n - i), 1000, 5000) * expd(t[:n - i], 0.003)
    return tail(sig * level, 0.3)


def teletype_keys():
    ev = []
    tt = 0.0
    k = 0
    while tt < 5.8 and k < 14:
        ev.append((tt, pan(teletype_strike(rng.uniform(0.7, 1.0)), rng.uniform(-0.15, 0.15))))
        gap = rng.choice([0.22, 0.28, 0.35, 0.45, 0.6, 0.9]) * rng.uniform(0.9, 1.1)
        tt += gap
        k += 1
    return room(seq(ev, 0.3), wet=0.12)


def crt_hum(dur=23.0):
    n, t = T(dur)
    hum = (np.sin(2 * np.pi * 60 * t) + 0.6 * np.sin(2 * np.pi * 120 * t + 0.7) + 0.3 * np.sin(2 * np.pi * 180 * t + 1.3)
           + 0.12 * np.sin(2 * np.pi * 240 * t))
    hum *= 0.9 + 0.1 * np.sin(2 * np.pi * 0.21 * t)
    whine = np.sin(2 * np.pi * 15734.0 * t) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.5 * t))
    hiss = hp(noise(n), 5000) * 0.15
    out = np.zeros((n, 2))
    out[:, 0] = hum * 0.6 + whine * 0.12 + hiss * 0.12
    out[:, 1] = hum * 0.6 + whine * 0.12 + hp(noise(n), 5000) * 0.15 * 0.12
    return fade_io(out, 2.0, 2.0)


def light_pen_phrase(dur):
    n, t = T(dur)
    pts = [(0, rng.uniform(450, 600))]
    for k in range(1, 5):
        pts.append((k / 4, rng.uniform(430, 920)))
    f = smooth_curve(pts, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.15 * np.sin(3 * ph) * 0.5
    env = asym_hann(n, peak=0.25, power=0.9)
    sig *= env
    n2, t2 = T(0.02)
    sig[:n2] += bp(noise(n2), 2000, 6000) * expd(t2, 0.002) * 0.15
    return sig


def light_pen_draw():
    ev = [(0.3, pan(light_pen_phrase(1.2), -0.1)), (2.2, pan(light_pen_phrase(1.6), 0.0)),
          (4.3, pan(light_pen_phrase(1.3), 0.1))]
    return seq(ev, 0.3)


def room_air(dur=32.0):
    n, t = T(dur)
    out = np.zeros((n, 2))
    for ch in range(2):
        low = lp(noise(n), 450) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t + ch * 2))
        low *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.15 * t + ch)
        high = bp(noise(n), 3000, 7000) * 0.06 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t + ch))
        out[:, ch] = low + high
    return fade_io(out, 3.0, 3.0)


def mouse_click_60s():
    n, t = T(0.3)
    press = bp(noise(n), 1200, 4500) * expd(t, 0.0035)
    wood = np.sin(2 * np.pi * 520 * t) * expd(t, 0.012) * 0.5 + lp(noise(n), 900) * expd(t, 0.01) * 0.4
    sig = press + wood
    i = int(rng.uniform(0.11, 0.14) * SR)
    sig[i:] += 0.6 * (bp(noise(n - i), 1200, 4500) * expd(t[:n - i], 0.003) + wood[:n - i] * 0.7)
    return tail(sig, 0.3)


def mouse_click_80s():
    n, t = T(0.22)
    press = bp(noise(n), 1800, 6000) * expd(t, 0.003)
    body = np.sin(2 * np.pi * 900 * t) * expd(t, 0.006) * 0.3 + lp(noise(n), 1200) * expd(t, 0.006) * 0.3
    sig = press + body
    i = int(rng.uniform(0.085, 0.1) * SR)
    sig[i:] += 0.5 * (bp(noise(n - i), 1800, 6000) * expd(t[:n - i], 0.0025) + body[:n - i])
    return tail(sig, 0.3)


def blip(freq, dur=0.03, h2=0.2, attack=0.003):
    n, t = T(dur)
    env = (0.5 - 0.5 * np.cos(np.pi * np.clip(t / attack, 0, 1))) * (0.5 + 0.5 * np.cos(np.pi * np.clip((t - attack) / (dur - attack), 0, 1)))
    return (np.sin(2 * np.pi * freq * t) + h2 * np.sin(2 * np.pi * 2 * freq * t)) * env


def folder_morph():
    n, t = T(2.0)
    flutter = np.abs(lp(noise(n), 14)) * 6.0
    rustle = bp(noise(n), 1200, 5500) * flutter * fade_io(np.ones(n), 0.15, 0.0)
    rustle *= np.clip(1 - (t - 0.9) / 0.5, 0, 1)                # paper fades out 0.9-1.4 s
    digital = np.zeros(n)
    i = int(1.25 * SR)
    m = int(0.3 * SR)
    g = glide(t[:m], 600, 1200)
    digital[i:i + m] += np.sin(g) * asym_hann(m, 0.5) * 0.4   # a sine glide "becomes" the icon
    for tt, f in [(1.55, 880), (1.66, 1320)]:
        b = blip(f, 0.035)
        j = int(tt * SR)
        digital[j:j + len(b)] += b
    return pan(norm(rustle) * 0.7, -0.1) + pan(norm(digital) * 0.8, 0.1)


def trash_morph():
    n, t = T(2.0)
    i = int(0.1 * SR)
    m = n - i
    tt = t[:m]
    ring = partials(tt, [1870, 2730, 4310, 6150, 8200], [0.35, 0.3, 0.22, 0.15, 0.1], [1, 0.8, 0.5, 0.3, 0.15], 0.006)
    ring += bp(noise(m), 2000, 9000) * expd(tt, 0.002) * 1.2
    ring += lp(noise(m), 500) * expd(tt, 0.012) * 0.6
    metal = np.zeros(n)
    metal[i:] = ring * np.clip(1 - (t[i:] - 0.9) / 0.6, 0, 1)   # the metal gives way
    digital = np.zeros(n)
    j = int(1.2 * SR)
    k = int(0.5 * SR)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 9 * t[:k])
    digital[j:j + k] += np.sin(2 * np.pi * 1000 * t[:k]) * asym_hann(k, 0.4) * trem * 0.35
    for ts, f in [(1.62, 1000), (1.72, 1000)]:
        b = blip(f, 0.03)
        q = int(ts * SR)
        digital[q:q + len(b)] += b
    return pan(norm(metal) * 0.8, 0.1) + pan(norm(digital) * 0.6, -0.05)


def page_turn():
    n, t = T(0.7)
    env = smooth_curve([(0, 0), (0.35, 0.35), (0.43, 1.0), (0.5, 0.3), (0.75, 0.12), (1, 0)], n)
    sig = bp(noise(n), 700, 5000) * env
    sig += 0.4 * bp(noise(n), 200, 900) * env ** 1.5
    return pan_move(sig, -0.3, 0.3)


def link_blip(f1, f2):
    ev = [(0.0, pan(blip(f1, 0.045, 0.15), -0.15)), (0.07, pan(blip(f2, 0.05, 0.15), 0.15))]
    n2, t2 = T(0.01)
    pop = bp(noise(n2), 2000, 5000) * expd(t2, 0.0015) * 0.15
    ev.append((0.0, pan(pop, 0.0)))
    return seq(ev, 0.1)


def web_link_blips():
    pairs = [(987.8, 1318.5), (1046.5, 1396.9), (880.0, 1318.5), (1174.7, 1568.0)]
    ev = [(tr, link_blip(*p)) for tr, p in zip([0.0, 2.0, 4.5, 7.0], pairs)]
    return seq(ev, 0.2)


def modem_hint():
    """an abstract, musical nod — not a modem recording"""
    n, t = T(2.0)
    sig = np.zeros(n)
    m = int(0.6 * SR)
    tt = t[:m]
    warble = 1 + 0.012 * np.sin(2 * np.pi * 6 * tt)
    ph1 = 2 * np.pi * np.cumsum(1046.5 * warble) / SR
    ph2 = 2 * np.pi * np.cumsum(1318.5 * warble) / SR
    dual = (np.sin(ph1) + np.sin(ph2)) * asym_hann(m, 0.3)
    sig[:m] += dual * 0.4
    i = int(0.8 * SR)
    k = int(0.6 * SR)
    gate = (np.sign(lp(noise(k), 30)) + 1) * 0.5
    sig[i:i + k] += bp(noise(k), 1500, 3500) * gate * asym_hann(k, 0.5) * 0.35
    for ts, f in [(1.5, 1396.9), (1.63, 1046.5), (1.76, 880.0)]:
        b = blip(f, 0.08, 0.1, 0.01)
        q = int(ts * SR)
        sig[q:q + len(b)] += b * 0.5
    return pan(lp(sig, 5000), 0.0)


def touch_tap():
    n, t = T(0.08)
    f = 950 * (1 + 0.3 * expd(t, 0.004))
    wood = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.010) * 0.6
    sig = bp(noise(n), 600, 2600) * expd(t, 0.004) + wood + lp(noise(n), 500) * expd(t, 0.008) * 0.3
    return tail(sig, 0.3)


def swipe(direction=1):
    return whoosh(0.3, ((0, 1200), (0.35, 3000), (1.0, 1600)), peak=0.35, q=1.5,
                  pan_from=-0.5 * direction, pan_to=0.5 * direction)


def pinch_zoom():
    n, t = T(0.5)
    env = fade_io(np.ones(n), 0.03, 0.14)
    a = np.sin(glide(t, 620, 930, 1.0)) * env
    b = np.sin(glide(t, 930, 1395, 1.0)) * env * 0.7
    return pan(a, -0.2) + pan(b, 0.2)


def settle(level=1.0):
    n, t = T(0.3)
    puff = lp(noise(n), 2200) * expd(t, 0.03) * 0.5
    ph = glide(t, 700, 590, 1.0)
    tone = (np.sin(ph) + 0.2 * np.sin(2 * ph)) * fade_io(np.ones(n), 0.01, 0.18) * 0.6
    i = int(0.1 * SR)
    thump = np.zeros(n)
    thump[i:] = np.sin(2 * np.pi * 150 * t[:n - i]) * expd(t[:n - i], 0.03) * 0.4
    return tail((puff + tone + thump) * level, 0.3)


def layout_reflow():
    ev = [(0.3, pan(settle(), -0.3)), (1.4, pan(settle(0.9), 0.0)), (2.5, pan(settle(0.85), 0.3))]
    return seq(ev, 0.3)


def ui_tap_modern():
    n, t = T(0.06)
    click = bp(noise(n), 2000, 7000) * expd(t, 0.0015)
    b = blip(1800, 0.014, 0.1, 0.001)
    sig = click * 0.7
    sig[:len(b)] += b * 0.8
    return tail(sig, 0.3)


def error_buzz():
    n, t = T(0.34)
    sig = np.zeros(n)
    for k, (f, t0) in enumerate([(196.0, 0.0), (164.8, 0.155)]):
        i = int(t0 * SR)
        m = int(0.17 * SR)
        tt = t[:m]
        env = fade_io(np.ones(m), 0.015, 0.045)
        tone = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt) + 0.1 * np.sin(2 * np.pi * 3 * f * tt)
        sig[i:i + m] += tone * env
    return pan(lp(sig, 1500), 0.0)


def freeze_sting():
    n, t = T(1.6)
    a = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / 0.3, 0, 1))
    tone = (np.sin(2 * np.pi * 293.66 * t) + np.sin(2 * np.pi * 296.6 * t + 1) + 0.3 * np.sin(2 * np.pi * 146.83 * t)) * a
    tone *= fade_io(np.ones(n), 0.0, 0.5)
    sw = bp(noise(n), 300, 2000) * smooth_curve([(0, 0), (0.7, 1.0), (0.85, 0.3), (1, 0)], n) ** 1.5
    return pan(norm(tone) * 0.8, -0.1) + pan(norm(sw) * 0.5, 0.1)


def confirm_tick(freq):
    n, t = T(0.09)
    click = bp(noise(n), 1500, 6000) * expd(t, 0.0015) * 0.3
    tone = (np.sin(2 * np.pi * freq * t) + 0.15 * np.sin(2 * np.pi * 2 * freq * t)) * (1 - expd(t, 0.003)) * expd(t, 0.025)
    return tail(click + tone, 0.3)


def process_steps():
    freqs = [784.0, 880.0, 987.8, 1046.5, 1174.7, 1318.5]  # G A B C D E (G major)
    ev = [(2.0 * k, pan(confirm_tick(f), -0.25 + 0.1 * k)) for k, f in enumerate(freqs)]
    return seq(ev, 0.2)


def success_chime():
    n, t = T(1.2)
    sig = np.zeros(n)
    for f, t0, tau, amp in [(784.0, 0.0, 0.18, 1.0), (1174.7, 0.16, 0.26, 0.9), (1568.0, 0.16, 0.12, 0.12)]:
        i = int(t0 * SR)
        tt = t[:n - i]
        tone = (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt) + 0.05 * np.sin(2 * np.pi * 3 * f * tt))
        sig[i:] += amp * tone * (1 - expd(tt, 0.008)) * expd(tt, tau)
    return pan(lp(sig, 5000), 0.05)


def cursor_tick():
    n, t = T(0.03)
    return bp(noise(n), 1500, 5000) * expd(t, 0.0015) + 0.4 * np.sin(2 * np.pi * 1300 * t) * expd(t, 0.006)


def collab_cursors():
    ev = []
    tt = 0.2
    while tt < 5.8:
        ev.append((tt, pan(cursor_tick() * rng.uniform(0.5, 1.0), rng.uniform(-0.6, 0.6))))
        tt += rng.uniform(0.35, 1.1)
    return seq(ev, 0.2)


def focus_tick():
    n, t = T(0.1)
    f = 320 * (1 + 0.4 * expd(t, 0.005))
    thock = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.012) * 0.7
    return tail(bp(noise(n), 800, 3000) * expd(t, 0.004) + thock + lp(noise(n), 600) * expd(t, 0.01) * 0.3, 0.3)


def voice_wave_tone():
    n, t = T(3.0)
    drift = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * t) + 0.002 * np.sin(2 * np.pi * 1.9 * t)
    ph = 2 * np.pi * np.cumsum(330.0 * drift) / SR
    tone = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 4.5 * t)
    breath = bp(noise(n), 1200, 2800) * 0.08 * trem
    sig = (tone * trem + breath) * fade_io(np.ones(n), 0.6, 0.8)
    return pan(lp(sig, 4000), 0.0)


def spatial_whoosh():
    n, t = T(1.6)
    fc = smooth_curve([(0, 500), (0.4, 2400), (1.0, 900)], n)
    env = asym_hann(n, 0.4)
    m = tv_bandpass(noise(n), fc, 0.9) * env
    l = tv_bandpass(noise(n), fc, 0.9) * env
    r = tv_bandpass(noise(n), fc, 0.9) * env
    w = np.clip(t / 1.0, 0, 1)   # opens from mono to wide
    return np.stack([m * (1 - w) + l * w, m * (1 - w) + r * w], axis=1)


def reverse_whoosh():
    n, t = T(2.0)
    fc = smooth_curve([(0, 400), (1.0, 1900)], n)
    env = (t / 2.0) ** 2.5 * (1 - np.exp(-(2.0 - t) / 0.06))
    sig = hp(tv_bandpass(noise(n), fc, 0.8), 300) * env
    return pan_move(sig, 0.4, -0.4)


def outdoor_air(dur=5.0):
    n, t = T(dur)
    out = np.zeros((n, 2))
    for ch in range(2):
        wind = lp(noise(n), 700) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t + ch * 1.5)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t))
        high = bp(noise(n), 2500, 7000) * 0.08
        out[:, ch] = wind + high
    return fade_io(out, 1.0, 2.0)


def footsteps_seq(times, outdoor=False):
    ev = [(tr, footstep(rng.uniform(0.8, 1.0), outdoor)) for tr in times]
    return seq(ev, 0.3)


def point_variant():
    return point_tone(0.9)


def dial_to_wheel_transition():
    return seq([(0.0, point_tone(0.9)), (0.3, whoosh(1.2, ((0, 300), (0.5, 1800), (1, 600)), peak=0.45, q=1.2) * 0.35)], 0.2)


# --------------------------------------------------------------------------------------
# cue sheet: (name, start, end, builder, level_db in the composite, note)
# --------------------------------------------------------------------------------------
def cue_sheet():
    tp = ("transition_point", point_variant, -30.0, "amber point, quiet variant (scene transition)")
    return [
        ("door_approach_footsteps", 0.6, 3.8, lambda: footsteps_seq([0.1, 1.05, 2.0, 2.95]), -24.0, "four soft footsteps on a hard floor"),
        ("door_push_thud", 5.5, 6.5, lambda: door_push_thud(1.0), -20.0, "heavy door pushed, does not open; handle rattle"),
        ("door_push_thud_2", 8.5, 9.5, lambda: door_push_thud(1.1), -19.0, "second push, slightly harder"),
        ("door_pull_open", 11.5, 13.5, lambda: door_open(False), -22.0, "latch click, smooth hinge sweep"),
        ("point_appear", 16.0, 17.2, lambda: point_tone(1.2), -22.0, "the amber point (sine + 2nd harmonic)"),
        ("corridor_whoosh", 19.0, 20.5, lambda: whoosh(1.5), -30.0, "airy whoosh"),
        ("switch_click", 24.5, 24.8, switch_click, -22.0, "toggle switch"),
        ("switch_click_2", 27.0, 27.3, switch_click, -22.5, "toggle switch"),
        ("switch_click_3", 29.5, 29.8, switch_click, -22.0, "toggle switch"),
        ("rotary_dial", 31.0, 34.0, rotary_dial, -24.0, "wind-up ratchet, return pulses slowing, stop"),
        ("machine_room_ambience", 24.0, 53.0, lambda: machine_room_ambience(29.0), -42.0, "faint low mechanical hum bed"),
        ("dial_to_wheel_transition", 52.0, 53.5, dial_to_wheel_transition, -30.0, "point variant + soft whoosh"),
        ("punch_card_shuffle", 54.0, 56.0, punch_card_shuffle, -26.0, "paper card flicks"),
        ("teletype_keys", 57.0, 63.0, teletype_keys, -22.0, "irregular mechanical key strikes"),
        ("crt_hum", 53.0, 76.0, lambda: crt_hum(23.0), -46.0, "60 Hz hum + faint 15.7 kHz whine"),
        ("light_pen_draw", 68.0, 74.0, light_pen_draw, -30.0, "three gliding electronic phrases"),
        (tp[0], 75.5, 76.4, tp[1], tp[2], tp[3]),
        ("audience_room_tone", 76.0, 108.0, lambda: room_air(32.0), -46.0, "large room air"),
        ("mouse_clicks", 84.0, 95.3, lambda: seq([(0.0, pan(mouse_click_60s(), -0.1)), (2.5, pan(mouse_click_60s(), -0.05)),
                                                   (8.0, pan(mouse_click_60s(), 0.0)), (11.0, pan(mouse_click_60s(), 0.05))], 0.2),
         -26.0, "1960s microswitch in a wooden shell"),
        (tp[0], 107.5, 108.4, tp[1], tp[2], tp[3]),
        ("gui_clicks_and_blips", 112.0, 134.3, lambda: seq([(0.0, pan(mouse_click_80s(), -0.1)), (6.0, pan(mouse_click_80s(), 0.1)),
                                                             (12.0, pan(mouse_click_80s(), -0.05)), (18.0, pan(mouse_click_80s(), 0.05)),
                                                             (22.0, pan(mouse_click_80s(), 0.0)),
                                                             (16.0, pan(blip(1200, 0.03), 0.1)), (21.0, pan(blip(1600, 0.025), -0.1))], 0.2),
         -26.0, "1980s plastic clicks; UI blips at 128.0 and 133.0"),
        ("folder_morph", 126.0, 128.0, folder_morph, -28.0, "paper rustle morphing into a digital blip"),
        ("trash_morph", 131.0, 133.0, trash_morph, -28.0, "metal wastebasket tap morphing to a blip"),
        (tp[0], 137.5, 138.4, tp[1], tp[2], tp[3]),
        ("page_turn", 138.5, 139.2, page_turn, -28.0, "soft page turn"),
        ("modem_hint", 146.0, 148.0, modem_hint, -38.0, "abstract musical nod to a handshake"),
        ("web_link_blips", 150.0, 157.2, web_link_blips, -30.0, "two-note connection blips"),
        (tp[0], 167.5, 168.4, tp[1], tp[2], tp[3]),
        ("touch_taps", 184.0, 186.6, lambda: seq([(0.0, pan(touch_tap(), -0.1)), (1.0, pan(touch_tap(), 0.0)), (2.5, pan(touch_tap(), 0.1))], 0.2),
         -28.0, "soft woody touchscreen taps"),
        ("swipe_whoosh", 187.5, 189.3, lambda: seq([(0.0, swipe(1)), (1.5, swipe(-1))], 0.1), -32.0, "two tiny swipes"),
        ("pinch_zoom", 190.5, 191.0, pinch_zoom, -30.0, "gentle rising two-tone"),
        ("layout_reflow", 194.0, 197.0, layout_reflow, -30.0, "three soft settles"),
        (tp[0], 199.5, 200.4, tp[1], tp[2], tp[3]),
        ("shop_ui_clicks", 204.0, 220.1, lambda: seq([(4.0 * k, pan(ui_tap_modern(), -0.2 + 0.1 * k)) for k in range(5)], 0.2),
         -28.0, "clean modern UI taps"),
        ("error_buzz", 225.5, 225.85, error_buzz, -24.0, "soft descending two-note 'wrong' tone"),
        ("freeze_sting", 226.5, 228.0, freeze_sting, -28.0, "beating sustained tone + noise swell"),
        ("process_steps", 232.0, 242.1, process_steps, -28.0, "six rising confirmation ticks"),
        ("success_chime", 239.0, 240.2, success_chime, -26.0, "warm two-note chime (G5 -> D6)"),
        (tp[0], 241.5, 242.4, tp[1], tp[2], tp[3]),
        ("collab_cursors", 246.0, 252.0, collab_cursors, -36.0, "sparse collaborator ticks"),
        ("focus_ring_tick", 258.0, 261.1, lambda: seq([(float(k), pan(focus_tick(), -0.15 + 0.1 * k)) for k in range(4)], 0.2),
         -30.0, "tab-key focus ticks"),
        (tp[0], 272.5, 273.4, tp[1], tp[2], tp[3]),
        ("voice_wave_tone", 274.0, 277.0, voice_wave_tone, -32.0, "airy tone with slow tremolo"),
        ("spatial_whoosh", 281.0, 282.6, spatial_whoosh, -30.0, "mono-to-wide whoosh"),
        ("corridor_return_whoosh", 285.0, 287.0, reverse_whoosh, -30.0, "reverse-feel airy whoosh"),
        ("door_open_clean", 289.5, 291.0, lambda: door_open(True), -22.0, "latch + brighter, quicker hinge sweep"),
        ("footsteps_out", 291.0, 293.5, lambda: footsteps_seq([0.2, 1.1, 2.0], outdoor=True), -24.0, "three footsteps into open air"),
        ("outdoor_air", 291.0, 296.0, lambda: outdoor_air(5.0), -46.0, "faint open-air tone"),
        ("final_point_tone", 294.0, 297.0, lambda: point_tone(3.0, warm=True, attack=0.6), -22.0, "the amber point, longest and warmest"),
    ]


# --------------------------------------------------------------------------------------
def main():
    t0 = time.time()
    os.makedirs(SFX_DIR, exist_ok=True)
    bed = np.zeros((N, 2), dtype=np.float64)
    rows = []
    rendered = {}
    for (name, start, end, build, level, note) in cue_sheet():
        if name in rendered:
            x = rendered[name]
        else:
            x = norm(stereo(build()), 0.0)
            x = np.nan_to_num(x)
            rendered[name] = x
            sf.write(os.path.join(SFX_DIR, f"{name}.wav"), (x * db(FILE_PEAK_DB)).astype(np.float64), SR, subtype="PCM_24")
        i0 = int(round(start * SR))
        n = min(len(x), N - i0)
        bed[i0:i0 + n] += x[:n] * db(level)
        rows.append((name, start, end, f"sfx/{name}.wav", level, f"{len(x)/SR:.2f}", note))

    # guarantees: absolute silence 0.0-0.6 and 15.0-15.8, exact length, DC-free, ceiling
    bed[:int(0.6 * SR)] = 0.0
    bed[int(15.0 * SR):int(15.8 * SR)] = 0.0
    bed = signal.sosfilt(sos(25, "high", 2), bed, axis=0)
    bed[:int(0.6 * SR)] = 0.0
    bed[int(15.0 * SR):int(15.8 * SR)] = 0.0
    bed[int(299.6 * SR):] *= np.linspace(1, 0, N - int(299.6 * SR))[:, None]
    peak = np.max(np.abs(bed))
    if peak > db(BED_CEILING_DB):
        bed *= db(BED_CEILING_DB) / peak
    bed -= bed.mean(axis=0, keepdims=True)
    bed[:int(0.6 * SR)] = 0.0
    bed[int(15.0 * SR):int(15.8 * SR)] = 0.0
    sf.write(BED_FILE, bed.astype(np.float64), SR, subtype="PCM_24")

    with open(os.path.join(SFX_DIR, "cue_sheet.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["cue", "start_s", "end_s", "file", "gain_db_in_composite", "file_len_s", "description"])
        for r in rows:
            w.writerow(r)

    print(f"composite peak {20*np.log10(np.max(np.abs(bed))):.2f} dBFS, {len(bed)} frames = {len(bed)/SR:.3f} s")
    print(f"wrote {BED_FILE} and {len(rendered)} files in {SFX_DIR}  ({time.time()-t0:.1f} s)")


if __name__ == "__main__":
    main()
