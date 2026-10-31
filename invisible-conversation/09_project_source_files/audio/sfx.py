#!/usr/bin/env python3
"""
sfx.py — procedural sound design for "The Invisible Conversation: How UX & UI Came to Life"

Default (storyboard timing):
    cd 09_project_source_files && python3 audio/sfx.py
  renders
    audio/out/sfx/<cue>.wav        one stereo 48 kHz file per cue-sheet row, peak-normalised to -12 dBFS,
                                   with the row's internal timing baked in (t = 0 is the row's start time)
    audio/out/sfx/cue_sheet.csv    name, start, end, file, gain applied in the composite
    audio/out/sfx_bed.wav          composite stem, stereo 48 kHz 24-bit PCM, exactly 300.000 s,
                                   peaks at or below -12 dBFS, silence 0.0-0.6 s and 15.0-15.8 s
    audio/out/sfx_placement.csv    every placed sound (cue, time, generator, gain)

Re-timed to the locked picture:
    python3 audio/sfx.py --cues cues.json --duration 303.0 --out audio/out/sfx_bed.wav
  cues.json = [{"id": "s01", "start": 0, "end": 27.8,
                "cues": {"footstep_1": 0.8, "door_push_thud_1": 5.6, "freeze": 15.3, "point_appear": 16.2, ...}}, ...]
  Cue names are matched against the RULES table below (regex -> generator, gain).  Unknown names are
  logged and skipped.  Era ambiences span chapters 2 (machine room), 3 (CRT) and 4 (auditorium) by scene
  id.  "freeze" places nothing and forces 0.8 s of silence after it.  Writes
    <out dir>/sfx_cues/<scene>_<cue>.wav   each placed sound (-12 dBFS peak)
    <out dir>/sfx_placement.csv            cue, time, generator, gain
    <out>                                  the composite (exactly --duration seconds)

Everything is synthesized from noise and oscillators with numpy + scipy; no samples.
Deterministic (fixed seed).
"""
import argparse
import csv
import json
import os
import re
import sys
import time
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
DEFAULT_DUR = 300.0
SEED = 7340032
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")
BED_FILE = os.path.join(OUT_DIR, "sfx_bed.wav")
FILE_PEAK_DB = -12.0        # individual files
BED_CEILING_DB = -12.0      # composite
FREEZE_GAP = 0.8            # seconds of enforced silence after a "freeze" cue

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
    """smooth curve through [(pos 0..1, value), ...] over n samples"""
    xs = np.linspace(0, 1, n)
    ps = np.array([p[0] for p in points])
    vs = np.array([p[1] for p in points])
    out = np.interp(xs, ps, vs)
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


def door_open(bright=False, sweep_dur=None, with_latch=True):
    """latch click then the hinge sweep (and the air moving through the gap)"""
    if sweep_dur is None:
        sweep_dur = 1.25 if bright else 1.8
    gap = 0.18 if bright else 0.2
    ev = []
    if with_latch:
        ev.append((0.0, pan(latch_click(bright), 0.1)))
        ev.append((gap, pan_move(hinge_sweep(sweep_dur, bright), 0.1, -0.25)))
    else:
        ev.append((0.0, pan_move(hinge_sweep(sweep_dur, bright), 0.1, -0.25)))
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


def dial_wind():
    """the finger pulls the dial round: soft whirr + ratchet ticks (0.95 s)"""
    ev = []
    n, t = T(0.95)
    whirr = bp(noise(n), 500, 2600) * asym_hann(n, 0.4) * 0.22
    ev.append((0.0, pan(whirr, 0.1)))
    tt = 0.08
    k = 0
    while tt < 0.9:
        ev.append((tt, pan(ratchet_tick(0.55 + 0.1 * rng.uniform()), 0.1)))
        tt += 0.11 - 0.004 * k
        k += 1
    return seq(ev, 0.2)


def dial_return():
    """the dial returns: pulses slowing down over a soft governor whirr, then the stop"""
    ev = []
    n2, t2 = T(1.9)
    gov = bp(noise(n2), 300, 1300) * (1 - t2 / 1.9) ** 1.5 * 0.2
    ev.append((0.0, pan(gov, 0.12)))
    gaps = [0.10, 0.115, 0.13, 0.15, 0.175, 0.205, 0.245, 0.3, 0.37]
    tt = 0.0
    for g in gaps:
        ev.append((tt, pan(ratchet_tick(0.9), 0.12)))
        tt += g
    n3, t3 = T(0.3)
    f = 210 * (1 + 0.6 * expd(t3, 0.01))
    stop = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t3, 0.03) + bp(noise(n3), 400, 2200) * expd(t3, 0.006) * 0.8
    ev.append((tt, pan(stop * 0.9, 0.12)))
    return seq(ev, 0.2)


def rotary_dial():
    """wind-up -> pause -> return pulses slowing down -> stop"""
    return room(seq([(0.0, dial_wind()), (1.12, dial_return())], 0.3), wet=0.15)


def lever_move():
    """a mechanical lever: friction slide, then the clack at the end of travel"""
    n, t = T(0.9)
    fc = smooth_curve([(0, 300), (0.6, 720), (1.0, 520)], n)
    slide = norm(tv_bandpass(noise(n), fc, 3.0)) * asym_hann(n, 0.55, 1.2) * np.clip(1 - (t - 0.5) / 0.1, 0, 1)
    i = int(0.5 * SR)
    m = n - i
    tt = t[:m]
    f = 180 * (1 + 0.8 * expd(tt, 0.01))
    clack = bp(noise(m), 800, 3200) * expd(tt, 0.003) * 1.2 + np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(tt, 0.04)
    clack += 0.3 * partials(tt, [2400, 3900], [0.05, 0.03], [1, 0.5]) + lp(noise(m), 500) * expd(tt, 0.015) * 0.6
    sig = slide * 0.45
    sig[i:] += clack
    return tail(room(pan(sig, -0.1), wet=0.2), 0.25)


def book_set_down():
    """a heavy book set on a table: soft thump + a flutter of pages"""
    n, t = T(0.8)
    f = 60 * (1 + 1.2 * expd(t, 0.02))
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.1) + lp(noise(n), 500) * expd(t, 0.04) * 0.8
    i = int(0.05 * SR)
    m = int(0.3 * SR)
    tt = t[:m]
    flutter = bp(noise(m), 800, 4000) * (0.6 + 0.4 * np.sin(2 * np.pi * 25 * tt)) * expd(tt, 0.09) * 0.35
    sig = thump
    sig[i:i + m] += flutter
    return tail(room(pan(sig, 0.05), wet=0.22), 0.25)


def tape_reel_spin(dur=2.2):
    """a tape reel spinning up: buzzy motor sweeping up with flutter, hiss swelling"""
    n, t = T(dur)
    f = smooth_curve([(0, 55), (0.5, 100), (1.0, 110)], n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    motor = sum(np.sin(h * ph) / h for h in range(1, 7)) * (0.85 + 0.15 * np.sin(2 * np.pi * 8 * t))
    motor = lp(motor, 1200) * 0.5
    hiss = bp(noise(n), 2000, 6000) * 0.12
    sig = (motor + hiss) * fade_io(np.ones(n), 0.3, 0.5)
    return pan(sig, 0.0)


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
    fd = min(3.0, dur / 3)
    return fade_io(out, fd, fd)


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


def error_beep():
    """an early terminal beep: soft square-ish 880 Hz, 110 ms"""
    n, t = T(0.16)
    env = fade_io(np.ones(n), 0.004, 0.06)
    sig = (np.sin(2 * np.pi * 880 * t) + np.sin(2 * np.pi * 2640 * t) / 3 + np.sin(2 * np.pi * 4400 * t) / 5) * env
    return pan(lp(sig, 6000), 0.0)


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
    fd = min(2.0, dur / 3)
    return fade_io(out, fd, fd)


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
    fd = min(3.0, dur / 3)
    return fade_io(out, fd, fd)


def mouse_click_60s():
    n, t = T(0.3)
    press = bp(noise(n), 1200, 4500) * expd(t, 0.0035)
    wood = np.sin(2 * np.pi * 520 * t) * expd(t, 0.012) * 0.5 + lp(noise(n), 900) * expd(t, 0.01) * 0.4
    sig = press + wood
    i = int(rng.uniform(0.11, 0.14) * SR)
    sig[i:] += 0.6 * (bp(noise(n - i), 1200, 4500) * expd(t[:n - i], 0.003) + wood[:n - i] * 0.7)
    return tail(sig, 0.3)


def keyset_chord():
    """Engelbart's five-key chord keyset: 3-4 soft key strikes within ~35 ms"""
    ev = []
    for k in range(int(rng.integers(3, 5))):
        n, t = T(0.12)
        f = 260 * (1 + 0.4 * expd(t, 0.005)) * rng.uniform(0.95, 1.05)
        key = bp(noise(n), 1000, 4000) * expd(t, 0.003) + 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.014)
        key += lp(noise(n), 700) * expd(t, 0.01) * 0.4
        ev.append((k * rng.uniform(0.008, 0.014), pan(tail(key, 0.3), -0.2 + 0.13 * k)))
    return seq(ev, 0.15)


def screen_text_type(dur=1.0):
    """characters appearing on a 1968 screen: a run of tiny electronic ticks"""
    ev = []
    tt = 0.0
    while tt < dur:
        n, t = T(0.03)
        f = rng.uniform(1500, 2600)
        b = np.sin(2 * np.pi * f * t) * fade_io(np.ones(n), 0.002, 0.02) * rng.uniform(0.5, 1.0)
        ev.append((tt, pan(b, rng.uniform(-0.1, 0.1))))
        tt += rng.uniform(0.06, 0.11)
    return seq(ev, 0.1)


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


def window_open():
    """an 80s GUI window opening: a short rising air + two soft blips"""
    sw = whoosh(0.3, ((0, 600), (0.7, 2400), (1.0, 2000)), peak=0.6, q=1.4, pan_from=-0.1, pan_to=0.1) * 0.5
    return seq([(0.0, sw), (0.12, pan(blip(660, 0.035), -0.1)), (0.2, pan(blip(990, 0.04), 0.1))], 0.15)


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


LINK_PAIRS = [(987.8, 1318.5), (1046.5, 1396.9), (880.0, 1318.5), (1174.7, 1568.0)]


def link_blip(f1, f2):
    ev = [(0.0, pan(blip(f1, 0.045, 0.15), -0.15)), (0.07, pan(blip(f2, 0.05, 0.15), 0.15))]
    n2, t2 = T(0.01)
    pop = bp(noise(n2), 2000, 5000) * expd(t2, 0.0015) * 0.15
    ev.append((0.0, pan(pop, 0.0)))
    return seq(ev, 0.1)


def web_link_blips():
    ev = [(tr, link_blip(*p)) for tr, p in zip([0.0, 2.0, 4.5, 7.0], LINK_PAIRS)]
    return seq(ev, 0.2)


def network_grow(dur=2.5):
    """a network growing: connection blips accelerating and spreading outward, a soft air under it"""
    ev = []
    pitches = [698.5, 880.0, 1046.5, 1174.7, 1396.9, 1568.0, 1760.0, 2093.0, 2349.3]
    tt = 0.0
    gap = 0.4
    for k, f in enumerate(pitches):
        side = (1 if k % 2 else -1) * min(0.8, 0.1 + 0.09 * k)
        ev.append((tt, pan(blip(f, 0.05, 0.15) * (0.9 - 0.04 * k), side)))
        tt += gap
        gap = max(0.12, gap * 0.82)
    n, t = T(dur)
    air = np.stack([bp(noise(n), 3000, 7000), bp(noise(n), 3000, 7000)], axis=1) * asym_hann(n, 0.6)[:, None] * 0.05
    ev.append((0.0, air))
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


def toggle():
    """a settings toggle: tiny click + a quick two-tone 'on'"""
    n, t = T(0.02)
    click = bp(noise(n), 1500, 5000) * expd(t, 0.0015) * 0.6
    return seq([(0.0, pan(click, 0.0)), (0.01, pan(blip(520, 0.03, 0.15), -0.1)), (0.045, pan(blip(780, 0.035, 0.15), 0.1))], 0.1)


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


PROCESS_FREQS = [784.0, 880.0, 987.8, 1046.5, 1174.7, 1318.5, 1480.0, 1568.0]  # G A B C D E F# G (G major)


def confirm_tick(freq):
    n, t = T(0.09)
    click = bp(noise(n), 1500, 6000) * expd(t, 0.0015) * 0.3
    tone = (np.sin(2 * np.pi * freq * t) + 0.15 * np.sin(2 * np.pi * 2 * freq * t)) * (1 - expd(t, 0.003)) * expd(t, 0.025)
    return tail(click + tone, 0.3)


def process_steps():
    ev = [(2.0 * k, pan(confirm_tick(f), -0.25 + 0.1 * k)) for k, f in enumerate(PROCESS_FREQS[:6])]
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


def reply_chime():
    """the system answers the voice: a soft descending pair (D6 -> A5)"""
    n, t = T(1.1)
    sig = np.zeros(n)
    for f, t0, tau, amp in [(1174.7, 0.0, 0.2, 0.9), (880.0, 0.18, 0.3, 1.0)]:
        i = int(t0 * SR)
        tt = t[:n - i]
        tone = np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)
        sig[i:] += amp * tone * (1 - expd(tt, 0.01)) * expd(tt, tau)
    return pan(lp(sig, 5000), -0.05)


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


def cards_in():
    """the final title cards: a very soft air swell"""
    n, t = T(1.6)
    out = np.stack([lp(noise(n), 1500) + 0.3 * bp(noise(n), 3000, 6000),
                    lp(noise(n), 1500) + 0.3 * bp(noise(n), 3000, 6000)], axis=1)
    return out * asym_hann(n, 0.5, 1.3)[:, None]


def footsteps_seq(times, outdoor=False):
    ev = [(tr, footstep(rng.uniform(0.8, 1.0), outdoor)) for tr in times]
    return seq(ev, 0.3)


def point_variant():
    return point_tone(0.9)


def dial_to_wheel_transition():
    return seq([(0.0, point_tone(0.9)), (0.3, whoosh(1.2, ((0, 300), (0.5, 1800), (1, 600)), peak=0.45, q=1.2) * 0.35)], 0.2)


# --------------------------------------------------------------------------------------
# storyboard cue sheet: (name, start, end, builder, level_db in the composite, note)
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
# cue-name -> generator rules for the picture department's cues.json
# each `make(m, ctx)` returns a list of (offset_s, stereo array, gain_db, generator_name)
# ctx = {"scene": scene dict, "cues": its cues dict, "time": cue time}
# --------------------------------------------------------------------------------------
def _idx(m, default=1):
    try:
        return int(m.group(1))
    except (IndexError, TypeError, ValueError):
        return default


def _one(x, gain, gen, offset=0.0):
    return [(offset, stereo(x), gain, gen)]


def _door_pull(m, ctx):
    start = ctx["time"]
    end = ctx["cues"].get("door_pull_open_end")
    dur = float(np.clip((end - start) - 0.2, 0.6, 4.0)) if end is not None else 1.8
    with_latch = "door_latch_click" not in ctx["cues"]
    return _one(door_open(False, sweep_dur=dur, with_latch=with_latch), -22.0,
                "hinge_sweep" + ("+latch" if with_latch else ""))


def _lightpen(m, ctx):
    k = _idx(m)
    return _one(pan(light_pen_phrase([1.2, 1.6, 1.3][(k - 1) % 3]), -0.1 + 0.1 * ((k - 1) % 3)), -30.0, "light_pen_phrase")


def _process_tick(m, ctx):
    k = _idx(m)
    return _one(pan(confirm_tick(PROCESS_FREQS[(k - 1) % len(PROCESS_FREQS)]), -0.25 + 0.1 * ((k - 1) % 6)), -28.0, "confirm_tick")


def _footsteps_out(m, ctx):
    return (_one(footsteps_seq([0.0, 0.9, 1.8], outdoor=True), -24.0, "footsteps_out")
            + _one(outdoor_air(5.0), -46.0, "outdoor_air", offset=-0.2))


RULES = [
    # pattern                           gain   generator                        make
    (r"footstep_(\d+)",                 lambda m, c: _one(footstep(rng.uniform(0.85, 1.0)), -24.0, "footstep")),
    (r"footsteps_out",                  _footsteps_out),
    (r"door_push_thud_(\d+)",           lambda m, c: _one(door_push_thud(1.0 + 0.1 * (_idx(m) - 1)), -20.0 + 1.0 * (_idx(m) - 1), "door_push_thud")),
    (r"door_latch_click",               lambda m, c: _one(pan(latch_click(False), 0.1), -22.0, "latch_click")),
    (r"door_pull_open_start",           _door_pull),
    (r"door_pull_open_end",             None),                       # consumed by door_pull_open_start
    (r"door_open_clean",                lambda m, c: _one(door_open(True), -22.0, "door_open_clean")),
    (r"freeze",                         None),                       # silence gap, handled by the renderer
    (r"point_appear",                   lambda m, c: _one(point_tone(1.2), -22.0, "point_tone")),
    (r"transition_point",               lambda m, c: _one(point_tone(0.9), -30.0, "point_tone_quiet")),
    (r"final_point_tone",               lambda m, c: _one(point_tone(3.0, warm=True, attack=0.6), -22.0, "point_tone_warm")),
    (r"corridor_whoosh",                lambda m, c: _one(whoosh(1.5), -30.0, "whoosh")),
    (r"spatial_whoosh",                 lambda m, c: _one(spatial_whoosh(), -30.0, "spatial_whoosh")),
    (r"corridor_return(_whoosh)?",      lambda m, c: _one(reverse_whoosh(), -30.0, "reverse_whoosh")),
    (r"switch_click_(\d+)",             lambda m, c: _one(switch_click(), -22.0, "switch_click")),
    (r"dial_wind",                      lambda m, c: _one(room(dial_wind(), 0.15), -24.0, "dial_wind")),
    (r"dial_return",                    lambda m, c: _one(room(dial_return(), 0.15), -24.0, "dial_return")),
    (r"lever_move",                     lambda m, c: _one(lever_move(), -24.0, "lever_move")),
    (r"book_set_down",                  lambda m, c: _one(book_set_down(), -24.0, "book_set_down")),
    (r"tape_reel_spin",                 lambda m, c: _one(tape_reel_spin(), -34.0, "tape_reel_spin")),
    (r"card_shuffle",                   lambda m, c: _one(punch_card_shuffle(), -26.0, "punch_card_shuffle")),
    (r"key_strike_(\d+)",               lambda m, c: _one(pan(teletype_strike(rng.uniform(0.7, 1.0)), rng.uniform(-0.15, 0.15)), -22.0, "teletype_strike")),
    (r"error_beep",                     lambda m, c: _one(error_beep(), -28.0, "error_beep")),
    (r"lightpen_draw_(\d+)",            _lightpen),
    (r"mouse_click_(\d+)",              lambda m, c: _one(pan(mouse_click_60s(), -0.1 + 0.05 * (_idx(m) % 4)), -26.0, "mouse_click_60s")),
    (r"keyset_chord",                   lambda m, c: _one(keyset_chord(), -26.0, "keyset_chord")),
    (r"screen_text_type",               lambda m, c: _one(screen_text_type(), -32.0, "screen_text_type")),
    (r"click_(\d+)",                    lambda m, c: _one(pan(mouse_click_80s(), -0.1 + 0.05 * (_idx(m) % 4)), -26.0, "mouse_click_80s")),
    (r"window_open",                    lambda m, c: _one(window_open(), -28.0, "window_open")),
    (r"folder_morph",                   lambda m, c: _one(folder_morph(), -28.0, "folder_morph")),
    (r"trash_morph",                    lambda m, c: _one(trash_morph(), -28.0, "trash_morph")),
    (r"page_turn",                      lambda m, c: _one(page_turn(), -28.0, "page_turn")),
    (r"link_click_(\d+)",               lambda m, c: _one(link_blip(*LINK_PAIRS[(_idx(m) - 1) % len(LINK_PAIRS)]), -30.0, "link_blip")),
    (r"network_grow",                   lambda m, c: _one(network_grow(), -30.0, "network_grow")),
    (r"modem_hint",                     lambda m, c: _one(modem_hint(), -38.0, "modem_hint")),
    (r"focus_tick_(\d+)",               lambda m, c: _one(pan(focus_tick(), -0.15 + 0.1 * ((_idx(m) - 1) % 4)), -30.0, "focus_tick")),
    (r"tap_(\d+)",                      lambda m, c: _one(pan(touch_tap(), -0.1 + 0.1 * ((_idx(m) - 1) % 3)), -28.0, "touch_tap")),
    (r"flick_(\d+)",                    lambda m, c: _one(swipe(1 if _idx(m) % 2 else -1), -32.0, "swipe")),
    (r"pinch",                          lambda m, c: _one(pinch_zoom(), -30.0, "pinch_zoom")),
    (r"reflow_(\d+)",                   lambda m, c: _one(pan(settle(1.0 - 0.07 * ((_idx(m) - 1) % 3)), -0.3 + 0.3 * ((_idx(m) - 1) % 3)), -30.0, "settle")),
    (r"ui_tap_(\d+)",                   lambda m, c: _one(pan(ui_tap_modern(), -0.2 + 0.1 * ((_idx(m) - 1) % 5)), -28.0, "ui_tap_modern")),
    (r"error_reveal",                   lambda m, c: _one(error_buzz(), -24.0, "error_buzz")),
    (r"freeze_sting",                   lambda m, c: _one(freeze_sting(), -28.0, "freeze_sting")),
    (r"process_tick_(\d+)",             _process_tick),
    (r"success_chime",                  lambda m, c: _one(success_chime(), -26.0, "success_chime")),
    (r"collab_tick_(\d+)",              lambda m, c: _one(pan(cursor_tick() * rng.uniform(0.6, 1.0), rng.uniform(-0.6, 0.6)), -36.0, "cursor_tick")),
    (r"toggle",                         lambda m, c: _one(toggle(), -28.0, "toggle")),
    (r"voice_wave",                     lambda m, c: _one(voice_wave_tone(), -32.0, "voice_wave_tone")),
    (r"reply_chime",                    lambda m, c: _one(reply_chime(), -26.0, "reply_chime")),
    (r"cards_in",                       lambda m, c: _one(cards_in(), -36.0, "cards_in")),
]
RULES = [(re.compile(p), mk) for p, mk in RULES]

# era ambiences by chapter id: (generator(dur), gain, name)
AMBIENCES = {2: (machine_room_ambience, -42.0, "machine_room_ambience"),
             3: (crt_hum, -46.0, "crt_hum"),
             4: (room_air, -46.0, "audience_room_tone")}


def match_rule(name):
    for pat, mk in RULES:
        m = pat.fullmatch(name)
        if m:
            return m, mk
    return None, None


def scene_number(scene_id):
    m = re.search(r"(\d+)", str(scene_id))
    return int(m.group(1)) if m else None


# --------------------------------------------------------------------------------------
# rendering
# --------------------------------------------------------------------------------------
def place(bed, x, t0, gain_db):
    i0 = int(round(t0 * SR))
    if i0 < 0:
        x = x[-i0:]
        i0 = 0
    n = min(len(x), len(bed) - i0)
    if n > 0:
        bed[i0:i0 + n] += x[:n] * db(gain_db)


def finish_bed(bed, silences, out_path):
    """silence windows, 25 Hz high-pass, end fade, -12 dBFS ceiling, DC removal, write"""
    n = len(bed)
    for a, b in silences:
        bed[int(a * SR):int(b * SR)] = 0.0
    bed = signal.sosfilt(sos(25, "high", 2), bed, axis=0)
    for a, b in silences:
        bed[int(a * SR):int(b * SR)] = 0.0
    k = int(0.4 * SR)
    bed[n - k:] *= np.linspace(1, 0, k)[:, None]
    peak = np.max(np.abs(bed))
    if peak > db(BED_CEILING_DB):
        bed *= db(BED_CEILING_DB) / peak
    bed -= bed.mean(axis=0, keepdims=True)
    for a, b in silences:
        bed[int(a * SR):int(b * SR)] = 0.0
    sf.write(out_path, bed.astype(np.float64), SR, subtype="PCM_24")
    return bed


def write_placements(path, rows):
    with open(path, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["cue", "time_s", "generator", "gain_db", "file"])
        for r in rows:
            w.writerow(r)


def render_default(out_path, duration):
    t0 = time.time()
    out_dir = os.path.dirname(os.path.abspath(out_path))
    sfx_dir = os.path.join(out_dir, "sfx")
    os.makedirs(sfx_dir, exist_ok=True)
    n_total = int(round(duration * SR))
    bed = np.zeros((n_total, 2), dtype=np.float64)
    rows = []
    placements = []
    rendered = {}
    for (name, start, end, build, level, note) in cue_sheet():
        if name in rendered:
            x = rendered[name]
        else:
            x = norm(stereo(build()), 0.0)
            x = np.nan_to_num(x)
            rendered[name] = x
            sf.write(os.path.join(sfx_dir, f"{name}.wav"), (x * db(FILE_PEAK_DB)).astype(np.float64), SR, subtype="PCM_24")
        place(bed, x, start, level)
        rows.append((name, start, end, f"sfx/{name}.wav", level, f"{len(x)/SR:.2f}", note))
        gen = getattr(build, "__name__", name)
        placements.append((name, f"{start:.3f}", name if gen == "<lambda>" else gen, level, f"sfx/{name}.wav"))

    bed = finish_bed(bed, [(0.0, 0.6), (15.0, 15.8)], out_path)

    with open(os.path.join(sfx_dir, "cue_sheet.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["cue", "start_s", "end_s", "file", "gain_db_in_composite", "file_len_s", "description"])
        for r in rows:
            w.writerow(r)
    write_placements(os.path.join(out_dir, "sfx_placement.csv"), placements)
    print(f"composite peak {20*np.log10(np.max(np.abs(bed))):.2f} dBFS, {len(bed)} frames = {len(bed)/SR:.3f} s")
    print(f"wrote {out_path} and {len(rendered)} files in {sfx_dir}  ({time.time()-t0:.1f} s)")


def render_from_cues(cues_path, out_path, duration):
    t0 = time.time()
    with open(cues_path) as fh:
        scenes = json.load(fh)
    if duration is None:
        duration = max(float(s["end"]) for s in scenes)
    out_dir = os.path.dirname(os.path.abspath(out_path))
    cue_dir = os.path.join(out_dir, "sfx_cues")
    os.makedirs(cue_dir, exist_ok=True)
    n_total = int(round(duration * SR))
    bed = np.zeros((n_total, 2), dtype=np.float64)
    placements = []
    unknown = []
    silences = [(0.0, 0.6)]

    def emit(sid, cue, t, items):
        multi = len(items) > 1
        for off, x, gain, gen in items:
            x = np.nan_to_num(norm(x, 0.0))
            fname = f"{sid}_{cue}" + (f"_{gen}" if multi else "") + ".wav"
            sf.write(os.path.join(cue_dir, fname), (x * db(FILE_PEAK_DB)).astype(np.float64), SR, subtype="PCM_24")
            place(bed, x, t + off, gain)
            placements.append((f"{sid}:{cue}", f"{t + off:.3f}", gen, gain, f"sfx_cues/{fname}"))

    # era ambiences spanning their chapters
    for s in scenes:
        num = scene_number(s["id"])
        if num in AMBIENCES:
            gen, gain, name = AMBIENCES[num]
            dur = float(s["end"]) - float(s["start"])
            if dur > 0.5:
                emit(s["id"], name, float(s["start"]), [(0.0, gen(dur), gain, name)])

    # cues, in time order
    for s in scenes:
        cues = s.get("cues", {})
        for name, t in sorted(cues.items(), key=lambda kv: float(kv[1])):
            t = float(t)
            if name == "freeze":
                silences.append((t, t + FREEZE_GAP))
                placements.append((f"{s['id']}:freeze", f"{t:.3f}", "silence", "", ""))
                continue
            m, mk = match_rule(name)
            if m is None:
                unknown.append((s["id"], name, t))
                continue
            if mk is None:
                continue                          # consumed by a sibling cue
            ctx = {"scene": s, "cues": cues, "time": t}
            emit(s["id"], name, t, mk(m, ctx))

    bed = finish_bed(bed, silences, out_path)
    placements.sort(key=lambda r: float(r[1]))
    write_placements(os.path.join(out_dir, "sfx_placement.csv"), placements)
    for sid, name, t in unknown:
        print(f"unknown cue skipped: {sid} '{name}' at {t:.2f} s", file=sys.stderr)
    n_placed = sum(1 for p in placements if p[2] != "silence")
    print(f"placed {n_placed} sounds from {len(scenes)} scenes; {len(unknown)} unknown cue(s) skipped")
    print(f"composite peak {20*np.log10(np.max(np.abs(bed))+1e-12):.2f} dBFS, {len(bed)} frames = {len(bed)/SR:.3f} s")
    print(f"wrote {out_path}, {os.path.join(out_dir, 'sfx_placement.csv')} and {n_placed} files in {cue_dir}  ({time.time()-t0:.1f} s)")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cues", help="cues.json from the picture department (scenes with cue name -> time)")
    ap.add_argument("--duration", type=float, help="output length in seconds (default: 300.0, or the last scene end with --cues)")
    ap.add_argument("--out", default=BED_FILE, help="composite output wav path")
    args = ap.parse_args(argv)
    if args.cues:
        render_from_cues(args.cues, args.out, args.duration)
    else:
        render_default(args.out, DEFAULT_DUR if args.duration is None else args.duration)


if __name__ == "__main__":
    main()
