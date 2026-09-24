# Hello, World · portfolio film

A 3:04 kinetic typography film about going from engineering to design, and working in the gap between design and code. It's all JavaScript: GSAP drives the picture, and the soundtrack is synthesized with the Web Audio API from the same timeline, so every sound effect lands on its frame.

- `SCRIPT.md` has the full script, scene by scene, with timings and sound notes.
- `index.html` is the player: play/pause, scrubber with chapter ticks, mute, fullscreen. Keys: space, ←/→ (5s), M, F.
- `film.js` holds the whole film as one paused GSAP timeline. Every scene is a function (`S0` to `S9`) with absolute times in seconds.
- `score.js` holds the soundtrack: 120 BPM, Dm9 / Bbmaj9 / Fmaj9 / Cadd9, drums and synths built from oscillators and noise.
- `soundtrack.mp3` is the pre-rendered score. The player loads it and falls back to live synthesis if it's missing.

## Watch it

Serve the folder (any static server works) and open `index.html`:

```
npx serve explainer
```

Opening the file straight from disk also works, but the page then synthesizes the soundtrack itself, which takes about 10 seconds.

## Export the MP4

Needs Node, Playwright's Chromium and ffmpeg (with libx264 and aac) on your PATH.

```
node explainer/render/export.cjs explainer/hello-world.mp4 30
```

This renders every frame deterministically (it seeks the timeline, it doesn't record the screen), pipes the frames to ffmpeg, muxes the soundtrack, and rewrites `soundtrack.mp3`. **Re-run it after any edit to `film.js` or `score.js`**, or the web soundtrack will drift out of sync with the picture.

`render/frames.cjs <outDir> 12 45.5 130` grabs stills at the given seconds, which is handy for checking a scene without exporting everything.

## Editing

- To change copy, edit the strings in the scene functions in `film.js`. Lines are set in three voices: `mono amber` (engineer), `serif` (designer), `sans` / `grad` (you, the bridge).
- To change timing, every `rise`, `sink`, `fadeIn` call takes an absolute time. Sound effects are emitted with `cue(time, type)` next to the visual they belong to, so they follow automatically.
- Music sections live in the arrangement in `score.js`, also in absolute seconds. Scene cuts sit on 2-second bar lines.
