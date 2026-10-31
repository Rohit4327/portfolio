#!/usr/bin/env python3
"""lib/timing.json -> audio/out/sections.json (chapter boundaries + musical moments derived from the recorded narration)."""
import json, os
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t = json.load(open(os.path.join(P, "lib/timing.json")))
def sent(ch, needle):
    c = next(c for c in t["chapters"] if c["id"] == ch)
    return next(s for s in c["sentences"] if needle.lower() in s["text"].lower())
def word_at(s, word):
    """approximate time a word is spoken, proportional to its character position"""
    txt = s["text"]; i = txt.lower().find(word.lower()); frac = (i / len(txt)) if i >= 0 else 0.5
    return s["start"] + (s["end"] - s["start"]) * frac
m = {
    "freeze": round(sent(1, "You feel foolish")["start"] - 0.3, 3),
    "title": round(sent(1, "That tiny moment")["start"] + 0.2, 3),
    "point_to": round(word_at(sent(4, "Computing began to feel"), "point to"), 3),
    "ux_lift": round(sent(6, "In 1993")["start"], 3),
    "checkout_tension": round(sent(8, "Imagine a stunning checkout")["end"] - 0.2, 3),
    "checkout_release": round(sent(8, "Beautiful UI")["end"] + 0.6, 3),
    "door_open": round(sent(10, "When it finally opens")["start"] + 0.5, 3),
    "final_resolve": round(sent(10, "That is often the point")["end"] + 0.4, 3),
}
out = {"total": t["total"], "chapters": [{"id": c["id"], "start": c["start"], "end": c["end"]} for c in t["chapters"]], "moments": m}
os.makedirs(os.path.join(P, "audio/out"), exist_ok=True)
json.dump(out, open(os.path.join(P, "audio/out/sections.json"), "w"), indent=1)
print(json.dumps(out["moments"], indent=1)); print("chapters:", [(c["id"], c["start"], c["end"]) for c in out["chapters"]])
