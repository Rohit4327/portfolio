#!/usr/bin/env python3
"""
reel_sfx.py — sound design for the 2:30 vertical reel "UX vs UI — explained"

Renders  audio/out/reel_sfx.wav  (stereo, 48 kHz, 24-bit PCM, exactly 150.000 s, peak <= -12 dBFS),
plus  audio/out/reel_sfx_placement.csv  and one file per placed sound in  audio/out/reel_sfx_cues/.

    cd ux-ui-reel && python3 audio/reel_sfx.py                                   # storyboard cue list
    cd ux-ui-reel && python3 audio/reel_sfx.py --cues audio/out/visual_cues.json  # picture-locked cues

visual_cues.json uses the documentary's format: [{"id": "s01", "start": 0, "end": 30, "cues": {"thumb_tap_1": 1.2, ...}}, ...].
Cue names are matched against the reel rules below first, then the documentary's rule table
(footstep_N, door_push_thud_N, door_pull_open_start/_end, point_appear, success_chime, ...).  A span cue is
written as <name>_start / <name>_end (path_draw, cursor_ticks, door_footsteps, footsteps_out).
"freeze" places nothing and forces 0.8 s of silence; 0.0-0.5 s is always silent.  Unknown names are logged.

All generators are the documentary's (imported unmodified from 09_project_source_files/audio/sfx.py) or
built here from the same toolkit.  Deterministic.
"""
import argparse
import importlib.util
import json
import os
import re
import sys
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


X = _load("doc_sfx", os.path.join(DOC_AUDIO, "sfx.py"))   # read-only reuse of the film's generators

SR = X.SR
DUR = 150.0
OUT_FILE = os.path.join(HERE, "out", "reel_sfx.wav")
FREEZE_GAP = 0.8
rng = X.rng                                                # one deterministic stream
db, T, noise, bp, lp, hp, expd = X.db, X.T, X.noise, X.bp, X.lp, X.hp, X.expd
pan, pan_move, stereo, seq, norm, tail, blip = X.pan, X.pan_move, X.stereo, X.seq, X.norm, X.tail, X.blip


# --------------------------------------------------------------------------------------
# reel-specific generators (same toolkit)
# --------------------------------------------------------------------------------------
def curve(points, n, k=480):
    """smooth curve through [(pos 0..1, value), ...] with a fixed 10 ms smoothing kernel"""
    xs = np.linspace(0, 1, n)
    out = np.interp(xs, [p[0] for p in points], [p[1] for p in points])
    win = np.hanning(k)
    win /= win.sum()
    return np.convolve(np.pad(out, (k, k), mode="edge"), win, mode="same")[k:-k]


def ui_response():
    """a UI answering a thumb tap: two quick soft blips"""
    return seq([(0.0, pan(blip(880, 0.03, 0.15), -0.1)), (0.06, pan(blip(1320, 0.04, 0.15), 0.1))], 0.1)


def title_hit():
    """the 'UX != UI' hit: soft low boom + bright noise burst + short glassy ring"""
    n, t = T(1.4)
    f = 44 * (1 + 1.5 * expd(t, 0.05))
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.4)
    burst = norm(lp(noise(n), 2500)) * expd(t, 0.06)
    ring = X.partials(t, [1860, 2790, 4190], [0.25, 0.2, 0.15], [1, 0.6, 0.3]) * 0.15
    sig = boom + 0.7 * burst + ring
    return pan(sig * (1 - expd(t, 0.002)), 0.0)


def layers_explode():
    """UI layers flying apart: wide whoosh + scatter of tiny glassy ticks"""
    ev = [(0.0, X.whoosh(1.2, ((0, 500), (0.3, 3200), (1.0, 1200)), peak=0.3, q=1.0, stereo_dec=0.8))]
    for k in range(7):
        ev.append((0.1 + 0.07 * k + rng.uniform(0, 0.03), pan(blip(rng.uniform(1800, 3600), 0.025, 0.2) * 0.5, rng.uniform(-0.8, 0.8))))
    return seq(ev, 0.2)


def layer_tick(k):
    """one layer landing (Buttons/Type/Colour/Spacing/Motion): soft click + rising-pitch blip"""
    f = [880.0, 987.8, 1174.7, 1318.5, 1480.0][(k - 1) % 5]
    n, t = T(0.03)
    click = bp(noise(n), 1500, 6000) * expd(t, 0.0015) * 0.4
    return seq([(0.0, pan(click, 0.0)), (0.0, pan(blip(f, 0.06, 0.15, 0.004), -0.3 + 0.15 * ((k - 1) % 5)))], 0.1)


def orbit_whoosh():
    """a layer orbiting round the frame: whoosh circling L -> R -> L"""
    n, t = T(2.0)
    fc = curve([(0, 600), (0.5, 2000), (1.0, 700)], n)
    sig = X.tv_bandpass(noise(n), fc, 1.2) * X.asym_hann(n, 0.5)
    p = np.sin(2 * np.pi * 0.5 * t) * 0.8
    gl = np.sqrt((1 - p) / 2) * np.sqrt(2)
    gr = np.sqrt((1 + p) / 2) * np.sqrt(2)
    return np.stack([sig * gl, sig * gr], axis=1)


def layers_collapse():
    """layers snapping back into one screen: reverse-shaped whoosh + settle"""
    n, t = T(0.7)
    fc = curve([(0, 800), (1.0, 2600)], n)
    sw = X.tv_bandpass(noise(n), fc, 1.0) * (t / 0.7) ** 2 * (1 - np.exp(-(0.7 - t) / 0.03))
    return seq([(0.0, pan_move(sw, -0.6, 0.0) + pan_move(sw, 0.6, 0.0)), (0.7, pan(X.settle(1.0), 0.0))], 0.2)


def path_draw(dur=7.0):
    """a soft tone following a drawn line: slow rise with a gentle wobble, airy"""
    n, t = T(dur)
    f = curve([(0, 440), (0.4, 560), (0.7, 640), (1.0, 880)], n) * (1 + 0.004 * np.sin(2 * np.pi * 0.9 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.25 * np.sin(2 * ph)) * X.fade_io(np.ones(n), 0.4, 0.6)
    scratch = norm(bp(noise(n), 2000, 6000)) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return pan_move(tone + scratch, -0.5, 0.5)


def path_break():
    """the line snapping: soft glassy crack"""
    n, t = T(0.6)
    crack = bp(noise(n), 2500, 9000) * expd(t, 0.004)
    shards = X.partials(t, [3100, 4700, 6300, 8100], [0.12, 0.09, 0.07, 0.05], [1, 0.7, 0.5, 0.3], 0.01) * 0.5
    return pan(lp(crack + shards, 9000), 0.1)


def split_whoosh():
    """the screen splitting in two: whoosh that diverges L and R"""
    n, t = T(0.9)
    fc = curve([(0, 700), (0.4, 2600), (1.0, 900)], n)
    l = X.tv_bandpass(noise(n), fc, 1.0) * X.asym_hann(n, 0.35)
    r = X.tv_bandpass(noise(n), fc, 1.0) * X.asym_hann(n, 0.35)
    return pan_move(l, 0.0, -0.9) + pan_move(r, 0.0, 0.9)


def type_hit(heavy=False):
    """a word locking onto the screen: soft thump + tight click (+ low body when heavy)"""
    n, t = T(0.6)
    f = (70 if heavy else 95) * (1 + 0.8 * expd(t, 0.02))
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.16 if heavy else 0.1)
    click = bp(noise(n), 1500, 6000) * expd(t, 0.002) * 0.7
    body = lp(noise(n), 700) * expd(t, 0.03) * 0.6
    return pan(tail((thump + click + body) * (1 - expd(t, 0.0015)), 0.3), 0.0)


def card_slam():
    """a process card landing: soft slap + low thud + paper edge"""
    n, t = T(0.5)
    f = 85 * (1 + 0.9 * expd(t, 0.015))
    thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(t, 0.08)
    slap = lp(noise(n), 1800) * expd(t, 0.012)
    edge = bp(noise(n), 2000, 6000) * expd(t, 0.004) * 0.5
    return pan(tail((thud + 0.8 * slap + edge) * (1 - expd(t, 0.0015)), 0.3), 0.0)


def cursor_ticks(dur=4.0):
    ev = []
    tt = 0.1
    while tt < dur - 0.2:
        ev.append((tt, pan(X.cursor_tick() * rng.uniform(0.5, 1.0), rng.uniform(-0.6, 0.6))))
        tt += rng.uniform(0.3, 0.9)
    return seq(ev, 0.1)


def morph_whoosh():
    return X.whoosh(0.7, ((0, 500), (0.5, 2400), (1.0, 1000)), peak=0.45, q=1.1, pan_from=-0.3, pan_to=0.3)


def footsteps_span(dur, outdoor=False):
    k = max(2, int(round(dur / 0.85)))
    times = np.linspace(0.05, max(0.1, dur - 0.5), k)
    return X.footsteps_seq(list(times), outdoor=outdoor)


# --------------------------------------------------------------------------------------
# rules: (regex, make(m, ctx) -> [(offset, stereo, gain_db, generator)])
# --------------------------------------------------------------------------------------
def _idx(m):
    try:
        return int(m.group(1))
    except (IndexError, TypeError, ValueError):
        return 1


def _one(x, gain, gen, offset=0.0):
    return [(offset, stereo(x), gain, gen)]


def _span(ctx, base, default):
    """duration of a <base>_start cue from its <base>_end sibling"""
    end = ctx["cues"].get(base + "_end")
    return float(np.clip(end - ctx["time"], 0.5, 20.0)) if end is not None else default


REEL_RULES = [
    (r"thumb_tap(_\d+)?",           lambda m, c: _one(pan(X.touch_tap(), 0.0), -26.0, "touch_tap")),
    (r"ui_response(_\d+)?",         lambda m, c: _one(ui_response(), -28.0, "ui_response")),
    (r"title_hit",                  lambda m, c: _one(title_hit(), -16.0, "title_hit")),
    (r"layers_explode",             lambda m, c: _one(layers_explode(), -24.0, "layers_explode")),
    (r"layer_tick_(\d+)",           lambda m, c: _one(layer_tick(_idx(m)), -26.0, "layer_tick")),
    (r"orbit_whoosh(_\d+)?",        lambda m, c: _one(orbit_whoosh(), -30.0, "orbit_whoosh")),
    (r"layers_collapse",            lambda m, c: _one(layers_collapse(), -26.0, "layers_collapse")),
    (r"path_draw_start",            lambda m, c: _one(path_draw(_span(c, "path_draw", 7.0)), -32.0, "path_draw")),
    (r"path_draw_end",              None),
    (r"fee_reveal",                 lambda m, c: _one(X.error_buzz(), -24.0, "error_buzz")),
    (r"path_break",                 lambda m, c: _one(path_break(), -28.0, "path_break")),
    (r"split_whoosh",               lambda m, c: _one(split_whoosh(), -28.0, "split_whoosh")),
    (r"checkout_tap_(\d+)",         lambda m, c: _one(pan(X.ui_tap_modern(), -0.2 + 0.13 * ((_idx(m) - 1) % 4)), -28.0, "ui_tap_modern")),
    (r"type_hit(_\d+)?",            lambda m, c: _one(type_hit(False), -22.0, "type_hit")),
    (r"type_lock(_\d+)?",           lambda m, c: _one(type_hit(True), -20.0, "type_lock")),
    (r"card_slam(_\d+)?",           lambda m, c: _one(card_slam(), -22.0, "card_slam")),
    (r"cursor_ticks_start",         lambda m, c: _one(cursor_ticks(_span(c, "cursor_ticks", 4.0)), -36.0, "cursor_ticks")),
    (r"cursor_ticks_end",           None),
    (r"morph_whoosh(_\d+)?",        lambda m, c: _one(morph_whoosh(), -30.0, "morph_whoosh")),
    (r"door_footsteps_start",       lambda m, c: _one(footsteps_span(_span(c, "door_footsteps", 2.4)), -24.0, "footsteps")),
    (r"door_footsteps_end",         None),
    (r"door_pull_open",             lambda m, c: _one(X.door_open(False), -22.0, "door_open")),
    (r"footsteps_out_start",        lambda m, c: _one(footsteps_span(_span(c, "footsteps_out", 2.0), outdoor=True), -24.0, "footsteps_out")
                                                 + _one(X.outdoor_air(4.0), -46.0, "outdoor_air")),
    (r"footsteps_out_end",          None),
    (r"outro_point_tone",           lambda m, c: _one(X.point_tone(3.0, warm=True, attack=0.6), -22.0, "point_tone_warm")),
]
REEL_RULES = [(re.compile(p), mk) for p, mk in REEL_RULES]


def match_rule(name):
    for pat, mk in REEL_RULES + X.RULES:
        m = pat.fullmatch(name)
        if m:
            return m, mk
    return None, None


# storyboard cue list (default mode), one scene
STORYBOARD = [{
    "id": "reel", "start": 0.0, "end": 150.0, "cues": {
        "thumb_tap_1": 1.2, "thumb_tap_2": 1.9, "ui_response": 2.1, "title_hit": 3.0,
        "layers_explode": 9.5, "layer_tick_1": 11.0, "layer_tick_2": 12.0, "layer_tick_3": 13.0, "layer_tick_4": 14.0, "layer_tick_5": 15.0,
        "orbit_whoosh": 20.0, "layers_collapse": 30.5, "path_draw_start": 33.0, "path_draw_end": 40.0,
        "split_whoosh": 53.0, "fee_reveal": 58.5, "path_break": 59.2,
        "checkout_tap_1": 60.5, "checkout_tap_2": 62.0, "checkout_tap_3": 63.5, "checkout_tap_4": 65.0,
        "success_chime": 66.2, "type_hit_1": 68.0, "type_hit_2": 70.0,
        "card_slam_1": 78.0, "card_slam_2": 81.0, "card_slam_3": 84.0, "card_slam_4": 87.0, "card_slam_5": 90.0, "card_slam_6": 93.0,
        "cursor_ticks_start": 94.0, "cursor_ticks_end": 98.0, "morph_whoosh_1": 96.0, "morph_whoosh_2": 98.0,
        "door_footsteps_start": 100.6, "door_footsteps_end": 103.0, "door_push_thud_1": 104.0, "door_push_thud_2": 106.0,
        "door_pull_open": 108.0, "freeze": 108.5, "point_appear": 109.6, "door_open_clean": 118.0,
        "footsteps_out_start": 120.0, "footsteps_out_end": 122.0, "type_lock_1": 126.0, "type_lock_2": 128.5,
        "outro_point_tone": 142.5,
    }}]


def render(scenes, out_path, duration):
    t0 = time.time()
    out_dir = os.path.dirname(os.path.abspath(out_path))
    cue_dir = os.path.join(out_dir, "reel_sfx_cues")
    os.makedirs(cue_dir, exist_ok=True)
    n_total = int(round(duration * SR))
    bed = np.zeros((n_total, 2))
    placements, unknown, silences = [], [], [(0.0, 0.5)]
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
                continue
            items = mk(m, {"scene": s, "cues": cues, "time": t})
            for off, x, gain, gen in items:
                x = np.nan_to_num(norm(x, 0.0))
                fname = f"{s['id']}_{name}" + (f"_{gen}" if len(items) > 1 else "") + ".wav"
                sf.write(os.path.join(cue_dir, fname), x * db(X.FILE_PEAK_DB), SR, subtype="PCM_24")
                X.place(bed, x, t + off, gain)
                placements.append((f"{s['id']}:{name}", f"{t + off:.3f}", gen, gain, f"reel_sfx_cues/{fname}"))
    bed = X.finish_bed(bed, silences, out_path)
    placements.sort(key=lambda r: float(r[1]))
    X.write_placements(os.path.join(out_dir, "reel_sfx_placement.csv"), placements)
    for sid, name, t in unknown:
        print(f"unknown cue skipped: {sid} '{name}' at {t:.2f} s", file=sys.stderr)
    n_placed = sum(1 for p in placements if p[2] != "silence")
    print(f"placed {n_placed} sounds; {len(unknown)} unknown cue(s) skipped")
    print(f"composite peak {20*np.log10(np.max(np.abs(bed))+1e-12):.2f} dBFS, {len(bed)} frames = {len(bed)/SR:.3f} s")
    print(f"wrote {out_path} and {os.path.join(out_dir, 'reel_sfx_placement.csv')}  ({time.time()-t0:.1f} s)")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cues", help="visual_cues.json from picture (scenes with cue name -> time)")
    ap.add_argument("--duration", type=float, default=None)
    ap.add_argument("--out", default=OUT_FILE)
    args = ap.parse_args(argv)
    if args.cues:
        with open(args.cues) as fh:
            scenes = json.load(fh)
        duration = args.duration or max(float(s["end"]) for s in scenes)
    else:
        scenes, duration = STORYBOARD, (args.duration or DUR)
    render(scenes, args.out, duration)


if __name__ == "__main__":
    main()
