# Orchard Studio

A web model and walkthrough of Orchard Studio, ODC ADC-05, TCS Bangalore (Yeshwanthpur, Level 09). You start in a white room with a 1:40 architectural model on an oak table, switch between four layouts, then dive into the model and walk it at full scale: lift lobby, corridor, entry, the Trail, the Garage, Window Pause, Make Studio and Memory Corner.

The full specification is `MASTER_PROMPT.md`. Every dimension comes from `data/geometry.json`.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serves dist/ on http://localhost:4173
```
`dist/` is fully static and works offline: no external requests, fonts bundled.

## Controls
| Where | Input |
|---|---|
| Model | Drag to orbit, right-drag or two fingers to pan, wheel or pinch to zoom, double-click to reset. Keys 1 to 4 switch layout. Click a label or a zone for its card. |
| Walkthrough | WASD or arrows to walk, Shift to hurry, drag to look (L toggles pointer lock), click the floor to walk there, E or click a white ring to interact, Esc or X to step back. |
| Touch | Left thumb joystick, drag on the right to look, tap the floor to walk, tap rings. |

## URL options
| Option | Effect |
|---|---|
| `#today` `#recommended` `#keep9` `#rejected` | Layout (also saved when you switch) |
| `?visitor=Name` | The landing display shows "Welcome, Name" |
| `?profile=newManager` or `?profile=coe` | Kiosk content order from the manifest |
| `?quality=ultra\|high\|medium\|low` | Fix the quality tier (default is Auto) |
| `?debug=1` | Renderer numbers and `window.__studio` |
| `?debug=plan` (`&view=adc`) | Orthographic plan check with the floor plan as a 50% underlay |

## Configure
Open decisions are switches in `src/config.ts`: brand name, default layout, future-provision partition, the x = 33 glass type, kiosk count (4 to 6), room names, window facing and time of day (sun direction), music, quality.

## Swap content
Edit `public/media/manifest.json` and drop files into `public/media/`. Anything missing falls back to a generated placeholder, so you can replace content one file at a time. Rebuild (or restart the dev server) after adding files: the build lists what is present in `public/available.json` so the app never requests a file that is not there.

Images (`.jpg`, `.png`, `.webp`) are picked up for posters, the PRISM graphic, kiosk pages, app screens and memories. Video entries in the manifest are reserved: the landing display and corridor screen currently play a generated loop (see Limitations).

Sound is synthesised. To override a sound or add a music bed, add files to `public/audio/` with a `manifest.json` (`{ "sounds": { "click": "audio/click.mp3" }, "music": "audio/music.mp3" }`), set `music: true` in `src/config.ts`, and credit the files in `ATTRIBUTION.md` (CC0 or Pixabay licence only).

## Optional assets and tools
The app ships with textures, lighting and sky generated in code. For photographic CC0 maps:
```bash
npm run assets:fetch      # Poly Haven HDRIs and textures into assets-raw/
npm run assets:optimize   # into public/ (KTX2 if toktx is installed, otherwise WebP)
```
| Tool | Used for | In the build environment |
|---|---|---|
| `toktx` (KTX-Software) | KTX2 textures | Not present: WebP fallback scripted, not run |
| `blender` | `tools/bake_lightmaps.py`, optional lightmap bake for Ultra | Not present: script provided, untested |
| `ffmpeg` | Not required | Present, unused |
| Poly Haven network access | `assets:fetch` | Blocked: nothing was downloaded |

Details in `tools/README.md`. Wiring fetched maps into `core/materials.ts` is not done yet: the scripts produce the files and `public/textures/index.json`; the materials still use the generated textures.

## Verify
```bash
npm run verify     # typecheck, lint, unit tests, build, screenshots, interaction tests, performance sample
npm run shots      # screenshots only, into qa/latest/
npm run e2e        # interaction tests
npm run perf       # performance sample, into qa/latest/perf.json
```
Tests drive the app through `window.__studio` (`setLayout`, `setMode`, `goToStop`, `setCamera`, `getCounts`, `getRendererInfo`, `getFps`, `settle`).

### Performance on your Mac
The numbers in `qa/` were sampled on software WebGL (no GPU) and are **not representative**. On the target machine, with Chrome installed:
```bash
npm run build && STUDIO_GPU=1 npm run perf
```
This launches system Chrome with the GPU and writes `qa/latest/perf.json` to compare with Section 15 of the spec. `STUDIO_GPU=1 npm run shots` retakes the screenshots the same way.

## Repository
```
data/geometry.json     source of truth (plan feet)
src/data               typed geometry, derived plan, content manifest
src/core               materials, generated textures, build helpers, post-processing, quality tiers
src/architecture       walls, windows, glass, floors, ceilings, doors, table-model context
src/furniture          procedural furniture, devices, plants
src/zones              instanced work floor, studio fixtures per layout, approach details
src/scenes             studio assembly, stage, dive, walk controls, city, lighting
src/systems            collision, nav grid, hotspots, inspect, interactions, tour, zones
src/audio              WebAudio engine, synthesised sounds, ambient beds
src/ui                 the HTML overlay
tests/unit, tests/e2e  Vitest and Playwright
qa/phase-N             reviewed screenshots and numbers per phase
docs/                  PLAN.md, ARCHITECTURE.md
DECISIONS.md           every assumption and spec conflict
```
The floor plan image used by `?debug=plan` is copied to `public/debug/plan-underlay.jpg` (by `node tools/make-underlay.mjs`) and therefore ships in `dist/`. Delete that file before publishing if the plan should not be public.
