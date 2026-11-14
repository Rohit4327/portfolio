#!/usr/bin/env python3
"""Reel narration: Kokoro-82M, sentence-level synthesis placed on beat anchors; outputs narration.wav (48k stereo),
narration_timing.json (sentences + estimated word timings for kinetic captions)."""
import os, re, json, hashlib, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
S = "/tmp/claude-0/-home-user-portfolio/d072d127-20ba-53c6-bdc3-3548a30f6ed6/scratchpad"
MODEL = f"{S}/dl/kokoro/package/build/kokoro-quantized.onnx"; VOICES = f"{S}/tts/voices-v1.0.npz"
TOTAL = 150.0; SR = 24000
# (text, speak-override, min start time) — anchors are the beat sheet; sentences flow after each anchor
LINES = [
 ("You've used a thousand apps.", None, 0.8),
 ("You only remember the ones that felt effortless.", None, None),
 ("That feeling has a name — and it's two names.", "That feeling has a name, and it's two names.", None),
 ("UI is what you see and touch.", "U I is what you see and touch.", 8.6),
 ("Buttons. Type. Colour. Spacing. Motion.", None, None),
 ("The surface that answers your hand.", None, None),
 ("Good UI is obvious.", "Good U I is obvious.", 16.6),
 ("Targets you can hit. Contrast you can read. Feedback that confirms every action.", None, None),
 ("It's the handshake between a person and a machine.", None, None),
 ("UX is what you feel across the whole journey.", "U X is what you feel across the whole journey.", 30.4),
 ("Can you find it? Finish it? Trust it? Would you come back?", None, None),
 ("Navigation. Speed. Clear words. Recovering from mistakes.", None, 38.6),
 ("Even the email that arrives after you pay.", None, None),
 ("All of it is the experience.", None, None),
 ("Here's the trap.", None, 52.4),
 ("Beautiful UI can hide a frustrating UX.", "Beautiful U I can hide a frustrating U X.", None),
 ("A stunning checkout that reveals the delivery fee on the last step looks great and feels like a betrayal.", None, None),
 ("And a plain interface can carry a brilliant experience, because it gets out of your way.", None, None),
 ("UI is the handshake. UX is the relationship.", "U I is the handshake. U X is the relationship.", None),
 ("So how is great experience actually made?", None, 72.4),
 ("Not by guessing. By observing.", None, None),
 ("Research real people. Define the real problem. Design options. Prototype fast. Test with users.", None, None),
 ("Then repeat — because the first version is never the last.", "Then repeat, because the first version is never the last.", None),
 ("Watching just a handful of people use your prototype exposes most of the big problems.", None, 89.4),
 ("Fix them before you polish anything.", None, None),
 ("Think of a door with no clear handle.", None, 100.4),
 ("You push. Nothing.", None, None),
 ("You pull. It opens.", None, None),
 ("You feel foolish. You weren't. The design was.", None, None),
 ("Now give that door a proper handle.", None, 112.4),
 ("You open it without thinking.", None, None),
 ("That's the goal: design so clear you never notice it.", None, None),
 ("UI makes a product usable. UX makes it worth using.", "U I makes a product usable. U X makes it worth using.", 125.4),
 ("Pixel-perfect means nothing if people can't finish the task.", None, None),
 ("And a flawless flow still needs an interface people enjoy.", None, None),
 ("Design both. Test with real people. Then do it again.", None, None),
 ("UX and UI — explained.", "U X and U I. Explained.", 142.2),
]
GAP = 0.3
def main(voice="af_heart", speed=1.0):
    from kokoro_onnx import Kokoro
    k = Kokoro(MODEL, VOICES)
    cache = os.path.join(OUT, "cache"); os.makedirs(cache, exist_ok=True)
    items = []
    for text, speak, at in LINES:
        txt = speak or text; key = hashlib.sha1(f"{voice}|{speed}|{txt}".encode()).hexdigest()[:16]; fn = os.path.join(cache, key + ".npy")
        if os.path.exists(fn): a = np.load(fn)
        else:
            a, sr = k.create(txt, voice=voice, speed=speed, lang="en-us", trim=True); a = np.asarray(a, np.float32)
            thr = 10 ** (-45 / 20); idx = np.where(np.abs(a) > thr)[0]
            if len(idx): a = a[max(0, idx[0] - 240): min(len(a), idx[-1] + 480)]
            np.save(fn, a); print(f"  synth {len(a)/SR:5.2f}s  {text[:60]}", flush=True)
        items.append(dict(text=text, audio=a, dur=len(a) / SR, at=at))
    # layout
    cur = 0.0
    for it in items:
        if it["at"] is not None: cur = max(cur, it["at"])
        it["start"] = cur; it["end"] = cur + it["dur"]; cur = it["end"] + GAP
    if cur > TOTAL: raise SystemExit(f"narration overruns: {cur:.1f} s > {TOTAL}")
    track = np.zeros(int(TOTAL * SR), np.float32); tgt = 10 ** (-20 / 20)
    for it in items:
        a = it["audio"].copy(); rms = float(np.sqrt(np.mean(a ** 2)) + 1e-9); a *= np.clip(tgt / rms, 10 ** (-3 / 20), 10 ** (3 / 20))
        f = int(0.006 * SR); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
        s = int(round(it["start"] * SR)); track[s:s + len(a)] += a[: len(track) - s]
    sos = butter(2, 70, "hp", fs=SR, output="sos"); track = sosfilt(sos, track).astype(np.float32)
    t48 = resample_poly(track, 2, 1).astype(np.float32); t48 *= (10 ** (-3 / 20)) / (np.abs(t48).max() + 1e-9)
    sf.write(os.path.join(OUT, "narration.wav"), np.stack([t48, t48], 1), 48000, subtype="PCM_24")
    # word timings: proportional to characters (punctuation adds a small pause weight)
    sentences = []
    for i, it in enumerate(items):
        words = it["text"].split(); weights = []
        for w in words:
            core = len(re.sub(r"[^A-Za-z0-9']", "", w)); pause = 0.9 if re.search(r"[.!?]$", w) else (0.45 if re.search(r"[,;:—]$", w) else 0.0)
            weights.append(max(1.0, core) + 0.6 + pause * 3)
        tot = sum(weights); t = it["start"]; ws = []
        for w, wt in zip(words, weights):
            d = (it["end"] - it["start"]) * wt / tot; ws.append(dict(w=w, s=round(t, 3), e=round(t + d, 3))); t += d
        sentences.append(dict(i=i, text=it["text"], start=round(it["start"], 3), end=round(it["end"], 3), words=ws))
    json.dump(dict(total=TOTAL, voice=voice, speed=speed, sentences=sentences), open(os.path.join(OUT, "narration_timing.json"), "w"), indent=1)
    print("\n".join(f"{s['start']:6.2f}-{s['end']:6.2f}  {s['text']}" for s in sentences)); print("last end", sentences[-1]["end"])
if __name__ == "__main__": main()
