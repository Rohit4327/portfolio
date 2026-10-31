#!/usr/bin/env python3
"""Build 08_shot_list.csv from the narration timeline (lib/timing.json) and the scenes' exported cues (audio/out/visual_cues.json)."""
import json, csv, os
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = os.path.dirname(P)
timing = json.load(open(os.path.join(P, "lib/timing.json")))
cues = {c["id"]: c for c in json.load(open(os.path.join(P, "audio/out/visual_cues.json")))}
SCENES = {
 1: ("The Design Problem", "First-person approach to a flush walnut door with an ambiguous steel disc; push fails twice; pull opens it; freeze; orbit; amber point emerges; dip to the time corridor; main title.", "3D reconstruction (fictional door); corridor; title typography", "No archival material"),
 2: ("Before Screens — Human Factors", "Point becomes a toggle-switch lamp; tracking shot along a mid-century control panel; rotary telephone; confusable levers vs shape-coded fix with measurement guides; Dreyfuss lower third and book reconstruction; dial becomes an input wheel.", "Illustrative reconstructions (panel, telephone, book spine text)", "Dreyfuss, Designing for People, 1955 (verified)"),
 3: ("When Computers Spoke in Commands", "1960s computer room; punched cards; green-phosphor terminal with typed commands and an error; dissolve to a round CRT with a light pen drawing and constraining a square (Sketchpad); last point becomes a cursor.", "Illustrative reconstructions; generic command-line composite", "Sketchpad 1963, Sutherland, TX-2 (verified)"),
 4: ("The Mouse Changes Everything", "1968 auditorium; projection screen with structured text, link following, editing, split-screen collaboration; mouse/cursor close-ups; 1964 wooden prototype (one button) vs 1968 three-button demo mouse; cursor into a window.", "Illustrative reconstructions (NLS-style projection, both mice)", "9 Dec 1968 demo; 1964 prototype built by Bill English (verified)"),
 5: ("The Graphical Revolution", "Exhibition hall: Alto 1973 (experimental), Star 1981 (desktop metaphor, no trash), Lisa 1983 (Wastebasket), Macintosh 1984 (Trash); paper folder → folder icon; wastebasket → trash icon; dive into a folder.", "Illustrative reconstructions of four machines and 1-bit UIs", "Dates and attributions verified; trash icon attributed to Lisa/Mac"),
 6: ("The Web and the Name UX", "Book reconstruction (POET 1988); NeXT cube at CERN; 1989 proposal; first website page reconstruction (Dec 1990/Aug 1991); link into a 3D document network; 1993 'user experience' at Apple; INTERFACE→PRODUCT→SERVICE→EXPERIENCE diagram.", "Illustrative reconstructions; diagram", "Norman 1988/1993; Berners-Lee 1989; info.cern.ch (verified)"),
 7: ("The Web Goes Mobile", "Crowded 1990s page with annotated problems → clearer structure; WCAG 1.0 (1999) keyboard-focus path; 2007 touchscreen phone reconstruction with tap/flick/pinch; 2010 responsive layout reflowing across three devices.", "Fictional pages; illustrative device reconstruction", "WCAG 1.0 1999; iPhone 2007; RWD 2010 (verified)"),
 8: ("UX vs UI — The Big Reveal", "Fictional shop: beautiful UI, hidden delivery cost at the last step; freeze 'BEAUTIFUL UI. FRUSTRATING UX.'; layers of the journey; RESEARCH→DEFINE→IDEATE→PROTOTYPE→TEST→ITERATE; usability observation; redesign; before/after.", "Fictional example; contemporary visualization", "Definitions after NN/g (verified)"),
 9: ("Design for Everyone", "Collaborative canvas with tokens → components → consistent screens; browser-based tools (2010s; Figma 2016); accessibility: focus, text, labels, contrast, error messages, reduced motion, input methods; WCAG 2.2 (2023); helpful vs manipulative choice.", "Contemporary visualization", "Figma Sept 2016; WCAG 2.2 Oct 2023 (verified)"),
 10: ("The Next Interface", "Point becomes a voice waveform; grounded assistant reply; AI conversation cards; spatial panels (labelled speculative); collapse to the point; backwards through the corridor; the same door with a clear pull bar opens first time; soft light; closing cards.", "Contemporary visualization; speculative concept; 3D reconstruction", "No historical claims"),
}
rows = []
for ch in timing["chapters"]:
    n = ch["id"]; title, desc, kind, hist = SCENES[n]; sid = f"s{n:02d}"
    c = cues.get(sid, {}).get("cues", {})
    rows.append(dict(shot=f"{sid}", chapter=n, title=title, start_tc=f"{int(ch['start']//60):02d}:{ch['start']%60:06.3f}", end_tc=f"{int(ch['end']//60):02d}:{ch['end']%60:06.3f}", duration_s=round(ch["end"]-ch["start"],2),
                     visual=desc, visual_category=kind, historical_basis=hist,
                     narration=" ".join(s["text"] for s in ch["sentences"]),
                     first_line_at=ch["sentences"][0]["start"], last_line_end=ch["sentences"][-1]["end"],
                     sound_cues="; ".join(f"{k}@{v:.2f}" for k, v in sorted(c.items(), key=lambda kv: kv[1]) if isinstance(v,(int,float)))))
with open(os.path.join(D, "08_shot_list.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print("wrote 08_shot_list.csv with", len(rows), "shots")
