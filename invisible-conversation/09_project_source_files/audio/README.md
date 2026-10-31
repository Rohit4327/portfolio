# Audio — *The Invisible Conversation: How UX & UI Came to Life*

Original score and sound design for the 5-minute (300.000 s) documentary. Everything is
synthesized procedurally in Python (numpy + scipy; soundfile for writing) — no samples, no
downloads, no copyrighted material. Both scripts are deterministic (fixed seeds) and
re-render in about one minute on 4 cores, producing byte-identical files every time.

## Files

| Path | What it is |
|---|---|
| `audio/music.py` | Renders the score → `audio/out/music_bed.wav` (stereo, 48 kHz, 24-bit PCM WAV, exactly 300.000 s). |
| `audio/sfx.py` | Renders every sound effect → `audio/out/sfx/<cue>.wav` (one file per cue-sheet row, stereo 48 kHz, peak-normalised to −12 dBFS, the row's internal timing baked in) plus the composite stem `audio/out/sfx_bed.wav` (stereo 48 kHz 24-bit PCM, exactly 300.000 s) and `audio/out/sfx/cue_sheet.csv`. |
| `audio/out/music_bed.wav` | Music stem. Integrated loudness −27.0 LUFS, true peak −11.5 dBFS, LRA ≈ 6.7 LU, no DC. Silent until 15.5 s (faint room tone 0–15 s at ≈ −66 dBFS), hard silence 15.00–15.45 s (the freeze), fades to silence by 299.3 s, digital zero from 299.5 s. |
| `audio/out/sfx_bed.wav` | SFX stem with every cue placed at its time. Peak −18.8 dBFS (spec: ≤ −12), exact zeros 0.0–0.6 s and 15.0–15.8 s. Integrated ≈ −36.5 LUFS. |

Both stems are mixed to sit under a narrator at ≈ −16 LUFS. Summing both stems peaks below −8 dBFS, so nothing clips when they are laid together.

## Re-render

```bash
cd 09_project_source_files
python3 audio/music.py && python3 audio/sfx.py
```

Verify (optional):

```bash
ffmpeg -i audio/out/music_bed.wav -af ebur128=peak=true -f null -     # integrated LUFS, true peak
ffmpeg -i audio/out/music_bed.wav -af astats -f null -                # peak / RMS / DC
```

Requirements: `python3`, `numpy`, `scipy`, `soundfile`. Output `.wav` files are git-ignored.

## The score

**Palette.** Slow additive pads (3 detuned voices per note, every partial breathing on its own
sub-0.1 Hz LFO, stereo-spread), a felt-piano pluck (decaying inharmonic partials + soft
hammer-noise transient, lowpassed), a deep sub drone following the harmonic root, soft pulses
(a distant machine thump, heartbeat-like "tocks", kalimba-like plucks), a faint sine arpeggio,
high "air" noise, and a synthesized hall (decaying, progressively darker noise impulse response,
FFT-convolved). Master: 28 Hz high-pass, −4.5 dB voice-band dip at 2.3 kHz (Q 0.7), 15 kHz
low-pass, section-wise level and stereo-width automation, BS.1770 normalisation to −27 LUFS, a
safety limiter at −6.5 dBFS that never engages.

**Tempo.** 66 BPM feel (beat = 0.909 s). Chords move every 2 bars (≈ 7–8 s).

**The point motif (leitmotif).** Four ascending notes on scale degrees **1 – 2 – 4 – 5** (D E G A
in D), rhythm eighth–eighth–quarter–held. It is the "amber point" of the film: it appears at the
title (19.6 s, D minor), returns at "point to" (100.5 s, in F), echoes at the "user experience"
lift (161.2 s, in C), is stated confidently at the UX-vs-UI chapter (200.5 s, in G), whispers in
E minor for accessibility (244 s), and resolves fully — extended up to the octave, 1 2 4 5 **8** —
at 274.6 s in D major.

**Key path.** The film opens in **D minor / D Dorian** and ends in **D major**. The second half
climbs the circle of fifths one "lift" at a time: F major (76 s, the mouse) → C (160 s, the web
lift) → G (168 s, mobile; UX vs UI; accessibility) → D major (273 s, the door opens).

| Time (s) | Chapter | Key / colour | What happens musically |
|---|---|---|---|
| 0–15 | The door | — | Faint low room tone only (≈ −66 dBFS). No music. |
| 15.0–15.45 | Freeze | — | Hard silence. |
| 15.5–19 | Realisation | A | A single very quiet sustained tone (A3 + faint octave) fades in. |
| 19–24 | Title | D minor | Pad swell (D–A–D–E), the point motif on felt piano at 19.6. |
| 24–53 | Before screens | D Dorian | Dm9 → G/D (Dorian IV) → Dm7 → C/D. Warm, low, analog; a distant machine thump every 2 beats (not a beat). |
| 53–76 | Early computing | D Aeolian, thin | Dm → Gm/D → C(add9)/D. Sparser, cooler, width narrowed to near-mono, faint sine arpeggio (D minor pentatonic). |
| 76–108 | The mouse (1968) | **F major** (lift at 76.0) | Fmaj9 → C/E → Dm7 → Bb(add9). Low piano F2+C3 marks the lift; leitmotif over Bb at 100.5–103. |
| 108–138 | Graphical revolution | F major, brighter | F → Gm7 → Bb(add9) → C(add9). Gentle "tock" pulse on beats, high piano figures, motif fragment at 114.4. |
| 138–168 | The web | F Lydian → **C** (lift at 160.0) | Fmaj9 → G/F (#4) → Dm9 → C(add9). Widest stereo, high air; piano dyad + motif echo in C at 160.2 / 161.2. |
| 168–200 | Mobile | **G major** | G(add9) → D/F# → Em7 → C(add9). Lighter: dotted-eighth kalimba-like plucks, soft high ticks, quick motif in G at 176.4. |
| 200–242 | UX vs UI | G major, confident | G → Em7 → C; **tension 224–227**: Abmaj7#11 (Ab–D tritone) with a noise riser, pulse ducked; **release 227**: D(add9) → G → C. Motif statement at 200.5. |
| 242–273 | Design for everyone | E minor / G, intimate | Em9 → C(add9) → G/B → Asus4 → A. Sub and pad thinned, sparse single piano notes, motif in E minor at 244. |
| 273–293 | The future / the door | **D major** | D(add9) → G/D → D(add9). Leitmotif resolves (1 2 4 5 8) at 274.6; swell to 281, settle; high D5+A4 dyad as the door opens (289.6). |
| 293–299.5 | Final cards | D major | Sustained D(add9) pad fading to silence by 299.3; zeros from 299.5. |

## SFX cue sheet

All cues are synthesized from noise and oscillators. "Gain" is the peak level of the cue in
`sfx_bed.wav`; the individual file is the same sound at −12 dBFS peak. Repeated cues
(`transition_point`) share one file. The amber point tone is D5 (587.33 Hz) — a chord tone in every key of the score.

| Cue | Time (s) | Gain (dBFS) | File | Sound |
|---|---|---|---|---|
| door_approach_footsteps | 0.6–3.8 | −24 | `sfx/door_approach_footsteps.wav` | Four slow footsteps on a hard floor (pitch-dropping thump + heel click + toe tap, small-room reverb). |
| door_push_thud | 5.5, 8.5 | −20 / −19 | `sfx/door_push_thud*.wav` | Heavy door pushed but not opening: low thud + metal handle rattle. |
| door_pull_open | 11.5–13.5 | −22 | `sfx/door_pull_open.wav` | Latch click, then a smooth time-varying-bandpass hinge sweep with moving air. |
| (freeze) | 15.0–15.8 | — | — | No SFX. |
| point_appear | 16.0 | −22 | `sfx/point_appear.wav` | The amber point: sine + 2nd harmonic, 0.3 s attack, 1.2 s. |
| corridor_whoosh | 19.0 | −30 | `sfx/corridor_whoosh.wav` | Airy bandpass-sweep whoosh, 1.5 s, panned L→R. |
| switch_click | 24.5, 27.0, 29.5 | −22 | `sfx/switch_click*.wav` | Toggle switch: bright click + snap + body, release contact ~45 ms later. |
| rotary_dial | 31.0–34.0 | −24 | `sfx/rotary_dial.wav` | Wind-up whirr with soft ratchet, pause, return pulses slowing down, stop clunk. |
| machine_room_ambience | 24.0–53.0 | −42 | `sfx/machine_room_ambience.wav` | 48 Hz hum stack + rumble + a faint periodic chug; 3 s fades. |
| dial_to_wheel_transition | 52.0–53.5 | −30 | `sfx/dial_to_wheel_transition.wav` | Point variant + soft whoosh. |
| punch_card_shuffle | 54.0–56.0 | −26 | `sfx/punch_card_shuffle.wav` | Five paper card flicks. |
| teletype_keys | 57.0–63.0 | −22 | `sfx/teletype_keys.wav` | 14 irregular mechanical strikes (click + thunk + metallic ring + release). |
| crt_hum | 53.0–76.0 | −46 | `sfx/crt_hum.wav` | 60 Hz hum stack + faint 15.7 kHz whine + hiss; 2 s fades. |
| light_pen_draw | 68.0–74.0 | −30 | `sfx/light_pen_draw.wav` | Three gliding electronic phrases (68.3, 70.2, 72.3). |
| transition_point | 75.5, 107.5, 137.5, 167.5, 199.5, 241.5, 272.5 | −30 | `sfx/transition_point.wav` | Quieter 0.9 s point variant. |
| audience_room_tone | 76.0–108.0 | −46 | `sfx/audience_room_tone.wav` | Large-room air (low noise + faint high air, slow modulation). |
| mouse_clicks | 84.0, 86.5, 92.0, 95.0 | −26 | `sfx/mouse_clicks.wav` | 1960s microswitch in a wooden shell, press + release. |
| gui_clicks_and_blips | 112, 118, 124, 130, 134 (clicks); 128, 133 (blips) | −26 | `sfx/gui_clicks_and_blips.wav` | 1980s plastic clicks; 30 ms / 25 ms sine blips. |
| folder_morph | 126.0–128.0 | −28 | `sfx/folder_morph.wav` | Paper rustle fading into a sine glide and two blips. |
| trash_morph | 131.0–133.0 | −28 | `sfx/trash_morph.wav` | Inharmonic metal tap giving way to a tremolo sine and blips. |
| page_turn | 138.5 | −28 | `sfx/page_turn.wav` | Lift–flick–settle filtered noise. |
| modem_hint | 146.0–148.0 | −38 | `sfx/modem_hint.wav` | Abstract warbling dual tone (C6+E6), gated whisper, three descending blips — not a modem recording. |
| web_link_blips | 150.0, 152.0, 154.5, 157.0 | −30 | `sfx/web_link_blips.wav` | Two-note connection blips. |
| touch_taps | 184.0, 185.0, 186.5 | −28 | `sfx/touch_taps.wav` | Short woody taps. |
| swipe_whoosh | 187.5, 189.0 | −32 | `sfx/swipe_whoosh.wav` | Tiny 0.3 s swipes, L→R then R→L. |
| pinch_zoom | 190.5 | −30 | `sfx/pinch_zoom.wav` | Two rising tones (620→930, 930→1395 Hz). |
| layout_reflow | 194.3, 195.4, 196.5 | −30 | `sfx/layout_reflow.wav` | Three "settle" sounds (puff + falling minor third + soft thump). |
| shop_ui_clicks | 204, 208, 212, 216, 220 | −28 | `sfx/shop_ui_clicks.wav` | Clean modern taps (click + 1.8 kHz blip). |
| error_buzz | 225.5 | −24 | `sfx/error_buzz.wav` | Soft descending G3→E3 two-note tone, lowpassed, 340 ms. |
| freeze_sting | 226.5 | −28 | `sfx/freeze_sting.wav` | Beating D4 tone + filtered noise swell, 1.6 s. |
| process_steps | 232, 234, 236, 238, 240, 242 | −28 | `sfx/process_steps.wav` | Six confirmation ticks rising G A B C D E. |
| success_chime | 239.0 | −26 | `sfx/success_chime.wav` | Warm G5→D6 chime. |
| collab_cursors | 246.0–252.0 | −36 | `sfx/collab_cursors.wav` | Sparse tiny UI ticks, scattered in the stereo field. |
| focus_ring_tick | 258, 259, 260, 261 | −30 | `sfx/focus_ring_tick.wav` | Tab-key feel: click + 320 Hz thock. |
| voice_wave_tone | 274.0–277.0 | −32 | `sfx/voice_wave_tone.wav` | E4 tone with 4.5 Hz tremolo and a breath of noise. |
| spatial_whoosh | 281.0 | −30 | `sfx/spatial_whoosh.wav` | Whoosh that opens from mono to fully decorrelated wide. |
| corridor_return_whoosh | 285.0–287.0 | −30 | `sfx/corridor_return_whoosh.wav` | Reverse-shaped airy whoosh, R→L. |
| door_open_clean | 289.5 | −22 | `sfx/door_open_clean.wav` | Latch + brighter, quicker hinge sweep, drier room. |
| footsteps_out | 291.2, 292.1, 293.0 | −24 | `sfx/footsteps_out.wav` | Three brighter, drier footsteps into open air. |
| outdoor_air | 291.0–296.0 | −46 | `sfx/outdoor_air.wav` | Faint wind-like low noise + high air. |
| final_point_tone | 294.0–297.0 | −22 | `sfx/final_point_tone.wav` | The amber point, 3 s, warmest (adds sub-octave), fading. |

Peak ceiling of the composite is enforced at −12 dBFS (measured −18.8 dBFS). The composite is
high-passed at 25 Hz and DC-free.
