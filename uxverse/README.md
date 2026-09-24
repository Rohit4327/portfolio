# Into the UX-Verse

A 3:20 portfolio film for Rohit Patle: a space adventure told in three visual worlds that share one clock.

- **3D space** (three.js): toon shading, ink outlines, and a comic-print post pass with halftone dots, CMYK-style misregistration and grain.
- **Cut paper** (SVG): the Nagpur chapter runs at 8fps, and every piece boils like real stop motion.
- **Comic layer** (DOM): caption boxes, speech bubbles, onomatopoeia, panels and page curls. Rohit is an SVG rig animated on twos (12fps), the way Spider-Verse animates its characters.

The score is synthesized in the browser with Web Audio: organ, ticking clock, string ostinato, BRAAAM brass, taiko, choir and Shepard-tone risers. It's rendered from the same timeline as the picture, so every hit lands on its frame.

## Files

| File | What it holds |
|---|---|
| `SCRIPT.md` | The beat sheet: every chapter, line and sound cue with its time |
| `index.html` | Player page: play/pause, scrubber with chapter ticks, mute, fullscreen (keys: space, ←/→, M, F) |
| `js/core.js` | The three clocks, comic helpers, FX canvas, and `render(t)` |
| `js/scenes.js` | Chapters 00, 01 and 03 to 09 |
| `js/paper.js` | Chapter 02, Planet Nagpur, in cut paper |
| `js/space3d.js` | Every 3D shot and the comic post-processing shader |
| `js/rohit.js` | The character rig: poses, expressions, jetpack, helmet, patches, flag |
| `js/score.js` | The soundtrack and all sound effects |
| `soundtrack.mp3` | The pre-rendered score. The player falls back to live synthesis if it's missing |

## Watch it

```
npx serve uxverse
```

Then open the printed URL. Opening `index.html` straight from disk also works, but the page will synthesize the score itself (about 10 seconds).

## Export

Needs Node, Playwright's Chromium and ffmpeg with libx264, aac and libmp3lame.

```
node uxverse/render/export.cjs uxverse/into-the-ux-verse.mp4 30
```

Every frame is rendered by seeking the timeline, not by recording the screen, so the MP4 is frame-exact. The export also rewrites `soundtrack.mp3`. **Re-run it after editing any scene or the score**, or the web player's audio will drift from the picture.

`node uxverse/render/frames.cjs <outDir> 12 45.5 130` grabs stills at the given seconds. `node uxverse/render/audio-check.cjs` prints loudness per 4-second slice.

## Editing

- Copy lives in the scene functions. Times are absolute seconds on the master clock.
- `F.cue(time, 'type')` places a sound effect next to the visual it belongs to. The score reads the cue list, so effects follow edits automatically.
- Character moves go through `poseTo`, `place`, `wave` and `talk` on the character clock. Pose presets live in `js/rohit.js`.
