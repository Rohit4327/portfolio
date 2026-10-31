#!/usr/bin/env python3
"""Narration pipeline for 'The Invisible Conversation'.
Synthesizes the locked English script sentence by sentence with Kokoro-82M (Apache-2.0 weights) via kokoro-onnx,
fits each chapter into its target window (flexing boundaries a little while keeping the total at 300.0 s),
and writes: 02_english_narration.wav, 03_english_subtitles.srt, 04_english_subtitles.vtt, 05_narration_transcript.txt,
plus audio/out/narration_timing.json (the authoritative animation timeline).
Re-run:  python3 audio/narration.py  [--speed 1.0] [--voice af_heart]
"""
import argparse, json, os, sys, re, math, hashlib
import numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)                   # 09_project_source_files
DELIV = os.path.dirname(PROJ)                  # invisible-conversation
OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
CACHE = os.path.join(OUT, "tts_cache"); os.makedirs(CACHE, exist_ok=True)
SCRATCH = "/tmp/claude-0/-home-user-portfolio/d072d127-20ba-53c6-bdc3-3548a30f6ed6/scratchpad"
MODEL = os.environ.get("KOKORO_MODEL", f"{SCRATCH}/dl/kokoro/package/build/kokoro-quantized.onnx")
VOICES = os.environ.get("KOKORO_VOICES", f"{SCRATCH}/tts/voices-v1.0.npz")
TOTAL = 303.0   # brief: 300 s with ~3 s tolerance; the extra seconds give the closing title cards room to breathe

# (display text, speak text or None, pause_after override or None, min absolute start or None)
CHAPTERS = [
 dict(id=1, title="The Question", target=(0,24), lead=1.6, sentences=[
  ("A door stands before you.", None, None, 1.6),
  ("There is no clear handle, so you push.", None, None, 4.6),
  ("Nothing.", None, 0.5, 8.9),
  ("You pull.", None, 0.35, 10.9),
  ("It opens.", None, 0.6, 12.7),
  ("You feel foolish.", None, 0.6, 15.3),
  ("But what if the problem was never you?", None, 0.35, None),
  ("What if it was the design?", None, 0.6, None),
  ("That tiny moment reveals the question behind user experience: can a product make sense to a human being?",
   "That tiny moment reveals the question behind user experience: can a product make sense to a human being?", None, None),
 ]),
 dict(id=2, title="Before Screens", target=(24,53), lead=0.7, sentences=[
  ("Long before apps, people struggled with tools, machines, and everyday objects.", None, None, None),
  ("During the twentieth century, industrial designers and human-factors researchers began asking how controls should fit human bodies and minds.", None, None, None),
  ("In 1955, Henry Dreyfuss published Designing for People, bringing measurements, observation, and testing into the design conversation.",
   "In nineteen fifty-five, Henry Dryfuss published Designing for People, bringing measurements, observation, and testing into the design conversation.", None, None),
  ("Think telephone dials, cockpit switches, and confusing appliances.", None, None, None),
  ("Good design was becoming less about the machine alone, and more about the person using it.", None, None, None),
 ]),
 dict(id=3, title="The Early Computer", target=(53,76), lead=0.7, sentences=[
  ("Early computers demanded that people adapt to them.", None, None, None),
  ("Instructions arrived through punched cards or typed commands.", None, None, None),
  ("Without knowing the language, you were locked out.", None, 0.6, None),
  ("But researchers imagined something different.", None, None, None),
  ("What if information could be seen and moved, not just commanded?", None, 0.5, None),
  ("In 1963, Ivan Sutherland's Sketchpad made it possible to draw directly on a computer screen.",
   "In nineteen sixty-three, Ivan Sutherland's Sketchpad made it possible to draw directly on a computer screen.", None, None),
 ]),
 dict(id=4, title="The Mouse", target=(76,108), lead=0.7, sentences=[
  ("In 1968, Douglas Engelbart and his team stunned an audience with what we now call the Mother of All Demos.",
   "In nineteen sixty-eight, Douglas Engelbart and his team stunned an audience with what we now call the Mother of All Demos.", None, None),
  ("They showed a mouse, linked documents, on-screen editing, and collaboration, long before those ideas felt ordinary.", None, None, None),
  ("The mouse itself had emerged from experiments earlier in the decade; a wooden prototype came in 1964.",
   "The mouse itself had emerged from experiments earlier in the decade; a wooden prototype came in nineteen sixty-four.", None, None),
  ("But the famous 1968 demonstration used a later model.", "But the famous nineteen sixty-eight demonstration used a later model.", 0.5, None),
  ("Computing began to feel like something you could point to, not simply program.", None, None, None),
 ]),
 dict(id=5, title="The Graphical Interface", target=(108,138), lead=0.7, sentences=[
  ("In 1973, Xerox PARC built the Alto, bringing graphical displays, windows, and the mouse into one experimental machine.",
   "In nineteen seventy-three, Zerox Park built the Alto, bringing graphical displays, windows, and the mouse into one experimental machine.", None, None),
  ("Xerox's Star followed in 1981 with a more complete desktop metaphor.", "Zerox's Star followed in nineteen eighty-one with a more complete desktop metaphor.", None, None),
  ("Apple's Lisa arrived in 1983, and the Macintosh in 1984 helped bring graphical interaction to a wider audience.",
   "Apple's Lisa arrived in nineteen eighty-three, and the Macintosh in nineteen eighty-four helped bring graphical interaction to a wider audience.", 0.5, None),
  ("Icons looked like familiar objects.", None, None, None),
  ("A folder held files.", None, None, None),
  ("A trash can meant delete.", None, 0.4, None),
  ("Complex systems borrowed the language of everyday life.", None, None, None),
 ]),
 dict(id=6, title="The Web and UX", target=(138,168), lead=0.7, sentences=[
  ("In 1988, Don Norman explained why everyday objects confuse us.", "In nineteen eighty-eight, Don Norman explained why everyday objects confuse us.", None, None),
  ("A year later, Tim Berners-Lee proposed the World Wide Web at CERN.", "A year later, Tim Berners-Lee proposed the World Wide Web at Sern.", None, None),
  ("By 1991, its first website made linked information navigable.", "By nineteen ninety-one, its first website made linked information navigable.", 0.5, None),
  ("The question now reached beyond operating a machine: could people find what they needed, and feel confident doing it?", None, 0.5, None),
  ("In 1993, Norman helped establish 'user experience' as a professional term at Apple.", "In nineteen ninety-three, Norman helped establish user experience as a professional term at Apple.", None, None),
  ("That experience extended far beyond the screen.", None, None, None),
 ]),
 dict(id=7, title="The Mobile World", target=(168,200), lead=0.7, sentences=[
  ("As websites multiplied, navigation, readability, trust, and speed began to matter as much as appearance.", None, None, None),
  ("Accessibility gained shared standards, including the first Web Content Accessibility Guidelines in 1999.",
   "Accessibility gained shared standards, including the first Web Content Accessibility Guidelines in nineteen ninety-nine.", 0.5, None),
  ("Then, in 2007, the iPhone made touching, flicking, and pinching central to a mainstream mobile interface.",
   "Then, in two thousand seven, the eye-Phone made touching, flicking, and pinching central to a mainstream mobile interface.", None, None),
  ("In 2010, responsive web design offered a way for layouts to adapt to different screens.",
   "In twenty ten, responsive web design offered a way for layouts to adapt to different screens.", None, None),
  ("The interface no longer belonged to one desk or one kind of user.", None, None, None),
 ]),
 dict(id=8, title="UX versus UI", target=(200,242), lead=0.7, sentences=[
  ("So what exactly are UX and UI?", "So what exactly are U X and U I?", 0.5, None),
  ("UI, or user interface, is the layer of controls and feedback: buttons, labels, sounds, color, and interaction patterns.",
   "U I, or user interface, is the layer of controls and feedback: buttons, labels, sounds, color, and interaction patterns.", None, None),
  ("UX, or user experience, is the broader journey: can someone understand it, complete a task, trust the result, and feel in control?",
   "U X, or user experience, is the broader journey: can someone understand it, complete a task, trust the result, and feel in control?", 0.6, None),
  ("Imagine a stunning checkout page that hides the delivery cost until the end.", None, 0.4, None),
  ("Beautiful UI; frustrating UX.", "Beautiful U I; frustrating U X.", 0.7, None),
  ("Designers research real needs, map journeys, sketch options, prototype interactions, and test with people.", None, None, None),
  ("Then they revise.", None, 0.5, None),
  ("Great experiences are not born from guessing.", None, None, None),
  ("They are improved by observing.", None, None, None),
 ]),
 dict(id=9, title="Design for Everyone", target=(242,273), lead=0.7, sentences=[
  ("Today, designers collaborate and use shared components and design systems to keep products consistent.", None, None, None),
  ("Browser-based tools allow teams to design together.", None, 0.5, None),
  ("But progress is not just faster software.", None, None, None),
  ("It is readable text, keyboard access, clear error recovery, and choices that respect attention and privacy.", None, None, None),
  ("Standards such as WCAG 2.2 advance inclusion.", "Standards such as W C A G two point two advance inclusion.", 0.5, None),
  ("What counts is not how polished a screen looks, but who it works for, and who it leaves out.", None, None, None),
 ]),
 dict(id=10, title="The Future", target=(273,303), lead=0.7, tail=6.8, sentences=[
  ("Now interfaces are changing again: conversations with AI, voice commands, spatial computing, and experiences that may not look like screens at all.",
   "Now interfaces are changing again: conversations with A.I., voice commands, spatial computing, and experiences that may not look like screens at all.", 0.5, None),
  ("The tools will change.", None, None, None),
  ("The responsibility will not.", None, 0.5, None),
  ("Find the human problem.", None, None, None),
  ("Design with people, not assumptions.", None, None, None),
  ("Test what you have made.", None, 0.6, None),
  ("And remember that door?", None, 0.4, None),
  ("When it finally opens the way you expect, you barely notice the design.", None, 0.4, None),
  ("That is often the point.", None, None, None),
 ]),
]

def wc(s): return len(re.findall(r"[A-Za-z0-9']+", s))

def synth_all(k, voice, speed, lang):
    """Synthesize every sentence (cached by hash). Returns dict key->(audio float32 @24k)."""
    out = {}
    for ch in CHAPTERS:
        for (disp, speak, _p, _a) in ch["sentences"]:
            txt = speak or disp
            key = hashlib.sha1(f"{voice}|{speed:.3f}|{lang}|{txt}".encode()).hexdigest()[:16]
            fn = os.path.join(CACHE, key + ".npy")
            if os.path.exists(fn):
                out[txt] = np.load(fn); continue
            audio, sr = k.create(txt, voice=voice, speed=speed, lang=lang, trim=True)
            assert sr == 24000
            # light extra trim at -45 dBFS
            a = np.asarray(audio, dtype=np.float32)
            thr = 10 ** (-45 / 20)
            idx = np.where(np.abs(a) > thr)[0]
            if len(idx): a = a[max(0, idx[0] - 240): min(len(a), idx[-1] + 480)]
            np.save(fn, a); out[txt] = a
            print(f"  synth {len(a)/sr:5.2f}s  {txt[:60]}", flush=True)
    return out

def fit(audios, speed_note):
    """Lay sentences on the 300 s timeline. Returns chapters with absolute times."""
    SR = 24000
    GAP, GAPQ, TAIL = 0.32, 0.5, 0.9
    plan = []
    for ch in CHAPTERS:
        items = []
        for (disp, speak, pause, at) in ch["sentences"]:
            a = audios[speak or disp]
            g = pause if pause is not None else (GAPQ if disp.rstrip().endswith("?") else GAP)
            items.append(dict(text=disp, speak=speak or disp, dur=len(a) / SR, gap=g, at=at, words=wc(disp)))
        speech = sum(i["dur"] for i in items); gaps = sum(i["gap"] for i in items[:-1])
        tail = ch.get("tail", TAIL)
        plan.append(dict(ch=ch, items=items, tail=tail, req=ch["lead"] + speech + gaps + tail, speech=speech, words=sum(i["words"] for i in items)))
    req = sum(p["req"] for p in plan)
    slack = TOTAL - req
    print(f"[{speed_note}] required {req:.1f}s of {TOTAL:.0f}s -> slack {slack:+.1f}s")
    if slack < 0: return None
    # distribute slack: first toward chapters whose required length is below the brief target (to stay near storyboard),
    # then proportionally by word count. Keep gaps natural (<= +0.35 s extra per gap), remainder becomes chapter tail.
    tw = sum(p["words"] for p in plan)
    for p in plan:
        tgt = p["ch"]["target"][1] - p["ch"]["target"][0]
        p["extra"] = 0.0
    remaining = slack
    # pass 1: bring short chapters up toward their target length
    for p in plan:
        tgt = p["ch"]["target"][1] - p["ch"]["target"][0]
        want = max(0.0, tgt - p["req"])
        give = min(want, remaining * (want / max(1e-6, sum(max(0.0, (q["ch"]["target"][1]-q["ch"]["target"][0]) - q["req"]) for q in plan))))
        p["extra"] += give
    remaining = slack - sum(p["extra"] for p in plan)
    # pass 2: proportional by words
    for p in plan: p["extra"] += remaining * p["words"] / tw
    # lay out
    t = 0.0
    for p in plan:
        ch = p["ch"]; p["start"] = t
        n_gaps = max(1, len(p["items"]) - 1)
        extra_gap = min(0.35, p["extra"] * 0.6 / n_gaps)   # 60% of extra into gaps (capped), rest into tail
        cur = t + ch["lead"]
        for i, it in enumerate(p["items"]):
            if it["at"] is not None: cur = max(cur, it["at"])
            it["start"] = cur; it["end"] = cur + it["dur"]
            cur = it["end"] + it["gap"] + (extra_gap if i < len(p["items"]) - 1 else 0)
        p["end"] = t + p["req"] + p["extra"]
        # if anchors pushed speech past the chapter end, extend chapter (rare; only ch1 has anchors)
        last_end = p["items"][-1]["end"]
        if last_end + p["tail"] > p["end"]: p["end"] = last_end + p["tail"]
        t = p["end"]
    # final chapter absorbs rounding so the film is exactly TOTAL
    plan[-1]["end"] = TOTAL
    return plan

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="af_heart"); ap.add_argument("--speed", type=float, default=1.06)
    ap.add_argument("--lang", default="en-us"); ap.add_argument("--max-speed", type=float, default=1.12)
    args = ap.parse_args()
    from kokoro_onnx import Kokoro
    k = Kokoro(MODEL, VOICES)
    speed = args.speed; plan = None
    for attempt in range(4):
        print(f"== synthesizing at speed {speed:.3f} (voice {args.voice})", flush=True)
        audios = synth_all(k, args.voice, speed, args.lang)
        plan = fit(audios, f"speed {speed:.3f}")
        if plan: break
        speed = min(args.max_speed, round(speed * 1.035, 3))
        if attempt == 3: sys.exit("could not fit narration into 300 s")
    SR = 24000
    # ---- assemble narration track at 24 kHz then resample to 48 kHz ----
    track = np.zeros(int(TOTAL * SR) + SR, dtype=np.float32)
    # loudness-consistency: scale each sentence toward a common RMS (-20 dBFS), within +-3 dB
    tgt_rms = 10 ** (-20 / 20)
    for p in plan:
        for it in p["items"]:
            a = audios[it["speak"]].copy()
            rms = float(np.sqrt(np.mean(a ** 2)) + 1e-9)
            g = np.clip(tgt_rms / rms, 10 ** (-3 / 20), 10 ** (3 / 20)); a *= g
            # 6 ms fades to avoid clicks
            f = int(0.006 * SR); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
            s = int(round(it["start"] * SR)); track[s:s + len(a)] += a
    track = track[: int(TOTAL * SR)]
    # gentle high-pass at 70 Hz, then resample to 48 kHz
    sos = butter(2, 70, "hp", fs=SR, output="sos"); track = sosfilt(sos, track).astype(np.float32)
    t48 = resample_poly(track, 2, 1).astype(np.float32)
    peak = float(np.abs(t48).max()); t48 *= (10 ** (-3 / 20)) / peak  # peak -3 dBFS
    stereo = np.stack([t48, t48], axis=1)
    wav_path = os.path.join(DELIV, "02_english_narration.wav")
    sf.write(wav_path, stereo, 48000, subtype="PCM_24")
    # ---- timing json ----
    timing = dict(total=TOTAL, voice=args.voice, speed=speed, engine="Kokoro-82M v1.0 (quantized ONNX) via kokoro-onnx", sample_rate=48000,
                  chapters=[dict(id=p["ch"]["id"], title=p["ch"]["title"], start=round(p["start"], 3), end=round(p["end"], 3),
                                 target=list(p["ch"]["target"]), words=p["words"],
                                 sentences=[dict(text=i["text"], start=round(i["start"], 3), end=round(i["end"], 3)) for i in p["items"]]) for p in plan])
    with open(os.path.join(OUT, "narration_timing.json"), "w") as f: json.dump(timing, f, indent=1)
    # ---- subtitles ----
    def ts(x, sep=","):
        h = int(x // 3600); m = int(x % 3600 // 60); s = int(x % 60); ms = int(round((x - int(x)) * 1000))
        if ms == 1000: ms = 999
        return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"
    def wrap(s, n=42):
        if len(s) <= n: return [s]
        words = s.split(); lines = [""]
        for w in words:
            if len(lines[-1]) + len(w) + 1 > n and lines[-1]: lines.append(w)
            else: lines[-1] = (lines[-1] + " " + w).strip()
        return lines
    cues = []
    for p in plan:
        for it in p["items"]:
            text, st, en = it["text"], it["start"], it["end"]
            if len(text) > 84:
                # split at clause boundary nearest middle
                cands = [m.end() for m in re.finditer(r"[,;:]\s", text)]
                if cands:
                    cut = min(cands, key=lambda c: abs(c - len(text) / 2))
                    a, b = text[:cut].strip(), text[cut:].strip()
                    ta = st + (en - st) * len(a) / len(text)
                    cues.append((st, ta - 0.05, a)); cues.append((ta, en, b)); continue
            cues.append((st, en, text))
    # extend short cues to >= 1.0 s where possible without overlapping the next
    fixed = []
    for i, (st, en, tx) in enumerate(cues):
        nxt = cues[i + 1][0] if i + 1 < len(cues) else TOTAL
        en2 = max(en, min(st + 1.2, nxt - 0.05)); fixed.append((st, en2, tx))
    with open(os.path.join(DELIV, "03_english_subtitles.srt"), "w") as f:
        for i, (st, en, tx) in enumerate(fixed, 1):
            f.write(f"{i}\n{ts(st)} --> {ts(en)}\n" + "\n".join(wrap(tx)) + "\n\n")
    with open(os.path.join(DELIV, "04_english_subtitles.vtt"), "w") as f:
        f.write("WEBVTT\n\n")
        for i, (st, en, tx) in enumerate(fixed, 1):
            f.write(f"{i}\n{ts(st,'.')} --> {ts(en,'.')}\n" + "\n".join(wrap(tx)) + "\n\n")
    with open(os.path.join(DELIV, "05_narration_transcript.txt"), "w") as f:
        f.write("THE INVISIBLE CONVERSATION — How UX & UI Came to Life\nEnglish narration transcript (timecodes = actual spoken start of each chapter)\n\n")
        for p in plan:
            f.write(f"[{ts(p['items'][0]['start'],'.')[:-4]}] {p['ch']['id']:02d}. {p['ch']['title'].upper()}\n")
            f.write(" ".join(i["text"] for i in p["items"]) + "\n\n")
    # ---- report ----
    print("\nCHAPTER TIMING (actual vs storyboard target):")
    for p in plan:
        tg = p["ch"]["target"]; print(f"  {p['ch']['id']:02d} {p['ch']['title']:24s} {p['start']:6.2f}-{p['end']:6.2f}  (target {tg[0]:3d}-{tg[1]:3d})  speech {p['speech']:5.1f}s words {p['words']:3d}")
    tot_words = sum(p["words"] for p in plan); tot_speech = sum(p["speech"] for p in plan)
    print(f"  words {tot_words}, speech {tot_speech:.1f}s, speaking rate {tot_words/tot_speech*60:.0f} wpm (gross {tot_words/TOTAL*60:.0f} wpm), speed {speed}")
    print("wrote", wav_path)

if __name__ == "__main__": main()
