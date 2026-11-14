# Audio — *UX vs UI — explained* (2:30 vertical reel)

Original, deterministic numpy/scipy synthesis (no samples). The reel reuses the documentary's
instruments and SFX generators by importing them read-only from
`../invisible-conversation/09_project_source_files/audio/` (`music.py`, `sfx.py` — unmodified).

## Files

| Path | What it is |
|---|---|
| `audio/reel_music.py` | Score → `audio/out/reel_music.wav` (stereo 48 kHz 24-bit, exactly 150.000 s, integrated −24 LUFS, true peak ≤ −8 dBFS). |
| `audio/reel_sfx.py` | SFX → `audio/out/reel_sfx.wav` (same format, peak ≤ −12 dBFS), `audio/out/reel_sfx_placement.csv`, one file per placed sound in `audio/out/reel_sfx_cues/`. |

## Render

```bash
cd ux-ui-reel
python3 audio/reel_music.py                                   # ~12 s
python3 audio/reel_sfx.py                                     # storyboard cue list, ~3 s
python3 audio/reel_sfx.py --cues audio/out/visual_cues.json   # picture-locked cues (same JSON format as the film)
```

Measured: music −24.0 LUFS integrated, LRA 8.6 LU, true peak −10.0 dBFS, DC 0; SFX −33.8 LUFS, peak
−17.0 dBFS; both exactly 150.000 s; music + SFX summed peak −10.0 dBFS (no clipping). Silence 0–0.5 s,
hard silence at the freeze (108.5–109.3), music digital zero from 149.5 s.

## The score (96 BPM, D major home)

Same palette as the film — additive pads, felt piano, the four-note **point motif** (D E G A, 1-2-4-5),
synthesized hall — plus a *felt-not-heard* four-on-the-floor 48 Hz sub pulse from 8.0 s, a hi-hat-like
noise tick only in "how it's made", soft impacts/risers on the hits, and a glassy 16th-note arpeggio in
the UI section.

| s | section | music |
|---|---|---|
| 0–3 | cold open | near-silence; single low D2 tone at 0.6; riser into the hit |
| 3.0 | **HARD HIT** "UX ≠ UI" | impact + dark D pad; motif answers at 3.6; pulse enters 8.0 |
| 8–30 | UI | D major, bright/glassy: D – A – Bm – G, glass arpeggio, quick motif in G at 24 |
| 30–52 | UX | G major, wide and warm: G6 – C(add9) – Em7 – D(add4); warm motif at 30.4 |
| 52–72 | the trap | Em7; **tension 58–66** Abmaj7#11 (Ab–D tritone) + 7.6 s riser, pulse ducked; **release 66** D(add9) impact; confident G at 68 (handshake) with motif |
| 72–100 | how it's made | most rhythmic: pulse + tick, D – Bm – G – A loop; six soft impacts + piano notes at 78/81/84/87/90/93 |
| 100–125 | the door | pulse out at 100; sparse D minor; **freeze silence 108.5–109.3**; warm D major resolve + impact at 118 |
| 125–142 | the line | pulse returns; motif resolves fully (1-2-4-5-8) at 125.6 and an octave up at 131; **biggest swell 130** |
| 142–150 | outro | sustained D(add9), fade to digital zero by 149.5 |

## SFX cue table (default storyboard list)

thumb_tap 1.2/1.9 · ui_response 2.1 · title_hit 3.0 · layers_explode 9.5 · layer_tick 11–15 (×5, rising) ·
orbit_whoosh 20.0 · layers_collapse 30.5 · path_draw 33.0–40.0 · split_whoosh 53.0 · fee_reveal 58.5 ·
path_break 59.2 · checkout_tap 60.5/62.0/63.5/65.0 · success_chime 66.2 · type_hit 68.0/70.0 · card_slam
78–93 (×6) · cursor_ticks 94–98 · morph_whoosh 96/98 · door_footsteps 100.6–103 · door_push_thud 104/106 ·
door_pull_open 108.0 · freeze 108.5 · point_appear 109.6 · door_open_clean 118.0 · footsteps_out 120–122 ·
type_lock 126.0/128.5 · outro_point_tone 142.5.

Cue names in `visual_cues.json` (`[{"id","start","end","cues":{name: time}}]`) match the reel rules first, then
the film's table (`footstep_N`, `door_push_thud_N`, `point_appear`, `success_chime`, …). Spans are written as
`<name>_start` / `<name>_end` (`path_draw`, `cursor_ticks`, `door_footsteps`, `footsteps_out`). Reel-specific
generators and composite gains (dBFS peak): thumb_tap → touch tap −26 · ui_response −28 · title_hit −16 ·
layers_explode −24 · layer_tick_N −26 (pitch rises with N) · orbit_whoosh −30 · layers_collapse −26 ·
path_draw −32 · fee_reveal → error tone −24 · path_break −28 · split_whoosh −28 · checkout_tap_N −28 ·
type_hit −22 · type_lock −20 · card_slam −22 · cursor_ticks −36 · morph_whoosh −30 · door_footsteps −24 ·
door_pull_open −22 · footsteps_out −24 (+ outdoor air −46) · outro_point_tone −22. Unknown names are logged
to stderr and skipped; `freeze` forces 0.8 s of silence.
