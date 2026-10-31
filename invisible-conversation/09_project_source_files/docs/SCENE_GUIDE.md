# SCENE GUIDE — The Invisible Conversation (How UX & UI Came to Life)

You are building ONE chapter of a 300-second cinematic documentary that is rendered deterministically, frame by frame,
from a single web page (`film.html`) with Three.js (WebGL via SwiftShader, software) + a Canvas 2D overlay. Every frame is a pure
function of film time `t` (seconds). Nothing may depend on wall-clock time or Math.random.

## 0. Non-negotiables
1. **Historical honesty.** Our network is blocked for Wikimedia Commons, museums and archives, so this build has **no archival
   photographs**. Every historical device, screen or scene you depict is a *documentary reconstruction* and MUST carry the
   on-screen provenance badge `BADGE.RECON` ("ILLUSTRATIVE RECONSTRUCTION") while it is on screen (bottom-right by convention:
   `badge(ctx, BADGE.RECON, W-120, H-70, alpha, {align:'right'})`). Modern/fictional UI uses `BADGE.VIS` or `BADGE.FICTIONAL`;
   future ideas use `BADGE.CONCEPT`. Never render a human face or a likeness of a real person. Real people are represented by
   name cards / lower thirds (`lowerThird`) only.
2. **No invented facts.** Use only the dates/labels listed in your scene spec (they were fact-checked). Do not add new dates,
   names, model numbers or "first" claims.
3. **Visual identity.** Palette from `PALETTE` only (graphite #0D1016 background, ivory #F6F2E8, amber #FFAB5B = the narrative
   point and human-era accent, cyan #80C9F8 = digital-era accent). Typography: Inter / Inter Display only (installed; use the
   helpers in `lib/gfx.js`). Premium minimalist product film + museum exhibition. No PowerPoint look, no random particles,
   no camera shake, no spinning, no constant zooms, no stock-footage vibe. Transitions are motivated by objects/the point.
4. **The amber point** (narrative guide) must appear in your scene (receive it at the start, hand it off at the end) and keep its
   identity (warm core + soft halo). In 3D use `new AmberPoint(radius)` (add `.group` to your group); on the overlay use `amberDot`.
   Scenes transform it into the era's interaction mechanism (switch, dial, cursor, link, touch, focus ring, waveform) and
   back again.
5. **Transitions (hand-off contract).** Your scene owns the frame for `t in [start, end)`. In the LAST 0.7 s call
   `bloom(ctx, seg(t, end-0.7, end), {cx, cy})` so the amber point swells to fill the screen; in the FIRST 0.8 s of your scene
   call `bloom(ctx, 1 - seg(t, start, start+0.8), {cx, cy})` so the previous scene's bloom resolves into your opening image.
   Default `cx,cy = W/2, H/2` unless your spec says otherwise. (Scene 01 has no bloom-in; scene 10 ends with its own fade.)
   Make the moments BEFORE the bloom-out visually motivate it: the point travels/accelerates toward (cx, cy).
6. **Narration sync.** Import `T` from `../lib/timing.js`. `T.ch(n)` → `{start,end,sentences:[{text,start,end}]}` (actual spoken
   times from the recorded narration). `T.sent(n, 'substring of the sentence')` → `{start,end}`. Reveal a year/label when the
   narrator says it (± 0.3 s), never before. Keep important labels on screen ≥ 3 s. Your scene `start`/`end` MUST be
   `T.ch(n).start` / `T.ch(n).end`.
7. **Legibility.** Text ≥ 18 px (captions) / ≥ 22 px (labels). One idea on screen at a time: at most one lower third + one
   label + the badge. Fade text in/out over 0.4–0.6 s (`fadeIO`). Historical screens must be readable: hold still ≥ 2 s.
8. **Performance budget.** < 1.2 s per frame in `node tools/preview.mjs` (includes capture). Image-based lighting is disabled
   (too slow in software). Use `rig()` (key/fill/rim/ambient) plus at most 2 extra point/spot lights; at most ONE
   shadow-casting light (rig's key), shadow map ≤ 1024; no `transmission` materials; keep geometry < 150k triangles;
   screens via `makeScreen` (canvas textures) — redraw their canvas only when content changes (check a cached key).
9. **Determinism.** Use `hash()`/`noise1()` from `lib/util.js` for any pseudo-randomness. No `Math.random`, `Date`, `performance`.
10. **Files.** Write ONLY your scene file `scenes/sNN_<name>.js` (+ optionally `scenes/sNN_<name>.parts.js` for helpers).
    Do not edit `lib/*`, `tools/*`, `scenes/index.js` or other scenes. `scenes/index.js` imports your default export by the
    exact filename given in your spec.

## 1. Scene module contract
```js
import * as THREE from 'three';
import { W, H, PALETTE } from '../lib/stage.js';
import { T } from '../lib/timing.js';
import { seg, ease, easeInOut, easeOut, fadeIO, lerp, clamp, hash, noise1, deg } from '../lib/util.js';
import { text, caps, lowerThird, yearStamp, badge, BADGE, bloom, dip, amberDot, cursor, dimension, arrow, roundRect, fillRoundRect, paragraph, measure, wrapText, titleCard, citation } from '../lib/gfx.js';
import { mat, roundedBox, box, cylinder, sphere, torus, plane, floor, makeScreen, AmberPoint, glowSprite, textPlane, rig, makeCorridor, makePanel, makeHand } from '../lib/props.js';

const CH = 4; // chapter number
export default {
  id: 's04', title: 'The Mouse Changes Everything',
  start: T.ch(CH).start, end: T.ch(CH).end,
  group: null,                // THREE.Group added to the scene by the orchestrator; visibility toggled automatically
  vignette: 0.5, grain: 0.03, // optional overrides
  cues: {},                   // REQUIRED: named visual events for the sound designer, filled in init() with absolute times
  async init(stage) { this.group = new THREE.Group(); /* build everything once; store refs on this */ },
  update(t, stage) { /* animate objects + stage.camera as a pure function of t; call stage.camera.lookAt(...) */ },
  draw2d(ctx, t, stage) { /* overlay: labels, lower thirds, badge, 2D UI demos, bloom in/out */ },
};
```
Camera: `stage.camera` is a PerspectiveCamera (fov 35 default; set `stage.camera.fov = 28; stage.camera.updateProjectionMatrix()` if you
change it — set it every frame since other scenes may change it). `stage.setBackground(hex)` / `stage.setFog(hex, near, far)`
/ `stage.setExposure(e)` may be called in `update` (fog & exposure are reset each frame by the orchestrator, background is not — set it
every frame in update if you need a non-graphite background).
World scale: 1 unit = 1 metre. Put objects near the origin; camera typically 1–6 m away.

## 2. Workflow
1. Read `lib/stage.js`, `lib/util.js`, `lib/gfx.js`, `lib/props.js`, `lib/timing.json` (actual narration times) and the finished
   reference scene `scenes/s01_door.js`.
2. Write your scene, then preview stills:
   `cd /home/user/portfolio/invisible-conversation/09_project_source_files && node tools/preview.mjs --times <t1,t2,...> --out /tmp/claude-0/-home-user-portfolio/d072d127-20ba-53c6-bdc3-3548a30f6ed6/scratchpad/previews/<sNN>`
   then LOOK at the PNGs (Read tool). Preview at least: start+0.3, start+1.5, each narration beat, each reveal, mid-shot, end-1.0, end-0.2.
   Fix anything ugly, illegible, clipping, floating, mis-timed, or off-palette. Iterate until it looks like a premium documentary.
3. Export cues: your `cues` object must name every sound-worthy event with its absolute time, e.g.
   `{ switch_click_1: 25.4, dial_wind: 31.2, transition_point: end-0.7 }`. The sound designer places SFX from these.
4. Report: list your cues, the preview PNGs you inspected, measured ms/frame, and anything you could not do.

## 3. Era look & sound motifs (for visual decisions)
1940s–50s warm industrial light, brass/steel/bakelite, muted archival tones · 1960s monochrome CRT phosphor (green/white), lab grey,
grain · 1970s–80s computer beige, monochrome bitmapped GUI, black-on-white screens · 1990s early web typography (Times-like text on
grey/white, blue underlined links), limited colours · 2000s–10s glass displays, touch, responsive layouts · 2020s refined materials,
dimensional information, cyan accents. No holograms before the 2020s chapter.

## 4. Provenance labels (exact strings)
`ILLUSTRATIVE RECONSTRUCTION` (any historical object/screen) · `CONTEMPORARY VISUALIZATION` (modern process/diagram) ·
`FICTIONAL EXAMPLE` (the shop in scene 08) · `SPECULATIVE CONCEPT` (future ideas in scene 10) · `DIAGRAM`.
Lower-third source lines (when a specific historical object is shown), e.g. `Reconstruction after period documentation · not a photograph`.
