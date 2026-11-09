# The Invisible Conversation — How UX & UI Came to Life

A five-minute cinematic documentary (303 s, 1920×1080, 24 fps, English narration) on how user-experience and
user-interface design evolved, from mid-century human factors to AI, voice and spatial interfaces.

## Deliverables (this folder)
| File | What it is |
|---|---|
| `01_final_documentary.mp4` | The finished film, H.264 1080p24 + AAC stereo, −14 LUFS |
| `02_english_narration.wav` | Narration stem, 48 kHz stereo 24-bit |
| `03_english_subtitles.srt` / `04_english_subtitles.vtt` | Sentence-level English subtitles |
| `05_narration_transcript.txt` | Transcript with chapter timecodes |
| `06_historical_sources.csv` | Every historical claim, its verdict, the correction/nuance, and the sources (fact-checked by independent research + adversarial re-check) |
| `07_asset_credits.csv` | Asset register: voice model, fonts, libraries, original score/SFX, and each scene's reconstructions |
| `08_shot_list.csv` | Shot list with timecodes, visuals, historical basis, narration and sound cues |
| `09_project_source_files/` | Everything needed to change and re-render the film (see below) |
| `10_render_settings.txt` | Render/encode/mix settings and the reproduce commands |

## Honest scope notes
* **No archival photographs appear in this build.** The session's network policy blocked Wikimedia Commons, Smithsonian Open Access,
  CERN, museum and archive hosts, so no historical image could be fetched or license-verified. Every historical device, screen and scene
  is therefore a labelled *illustrative reconstruction* (the on-screen badge appears whenever one is in frame), and no real person is
  depicted by likeness — people appear as name cards. To add verified archival plates later: allow `commons.wikimedia.org` and
  `upload.wikimedia.org` in the environment's network settings, fetch the images, record licence/author/URL in `07_asset_credits.csv`,
  and paint them onto a `makePanel()` screen inside the relevant scene.
* **Runtime is 303 s**, inside the brief's ±3 s tolerance: the 699-word script needed the extra seconds for natural pauses and the closing cards.
* Narration is a neural TTS performance (Kokoro-82M, Apache-2.0), not a human actor.
* The master is 1080p; 4K was not rendered (software GPU). The project is resolution-independent.

## Project structure (`09_project_source_files/`)
* `film.html`, `lib/` — deterministic render surface: `stage.js` (renderer/palette), `gfx.js` (2D typography, lower thirds, badges, bloom),
  `props.js` (materials, screens, the amber point, corridor, hand), `util.js` (easing/time), `timing.js` (+ `timing.json`, the narration timeline), `main.js` (orchestrator).
* `scenes/s01…s10` — one module per chapter (+ `.parts.js` helpers). Each exports `{ id, start, end, init, update, draw2d, cues }` and reads all beat times from `T`.
* `tools/` — `preview.mjs` (stills), `render.mjs` (parallel frame render), `export-cues.mjs`, `sync-timing.mjs`, `sections.py`, `shotlist.py`, `assemble.sh` (mix + mux), `qa-workflow.js`.
* `audio/` — `narration.py` (Kokoro pipeline + fitter + subtitles), `music.py` (original score), `sfx.py` (original sound design), `out/` (stems, timing, cues).
* `docs/` — `SCENE_GUIDE.md`, `SCENE_SPECS.md`, `AGENT_BRIEF.md`, `factcheck_raw.json`.

## Changing things
* **Narration text or voice** → edit `CHAPTERS` in `audio/narration.py`, run it, then `node tools/sync-timing.mjs`; scenes re-time themselves.
* **A date/label** → edit the scene module (labels are plain strings in `draw2d`/`init`).
* **Music/SFX** → `audio/music.py` / `audio/sfx.py` (deterministic, re-timeable via `--sections` / `--cues`).
* Re-render with the commands in `10_render_settings.txt`.
