# Phase 7 review: polish and final verification

## Final `npm run verify`
See `verify.json` and `perf.json` in this folder.

## Exterior city (`walk-17-window-seats`, `walk-15-the-garage`)
Matches: road below, viaduct on piers about 60 m out, mid-rise blocks and a few towers, tree canopy, distance haze, sky with soft cloud.
Off: it is a massing-level city. Facades are one tiling grid texture, there are no vehicles or street detail, and trees are low-poly blobs. It reads as calm background, not as a photograph.

## Path-traced stills
Implemented for Ultra in presentation mode (2 s idle, up to 256 samples, BVH in a worker, any input returns to raster). **Not verified**: software WebGL cannot run it in reasonable time, so it has never been seen working. Treat it as untested code behind a guard that falls back to raster on error.

## Lightmap bake
`tools/bake_lightmaps.py` is provided. Blender is not available here, so it is untested and its output is not wired into the app.

## Against the quality bar (Section 2)
- **Photoreal:** not reached. The result is a clean, well-lit architectural visualisation. A screenshot would not be mistaken for a photograph. The gaps are bounce light (needs the bake), photographic textures (needs the fetch), and material micro-detail.
- **Apple design language:** largely there: white, pale oak, brushed aluminium, warm grey textiles, generous space, one accent.
- **Calm light, no effects:** yes.
- **Real dimensions:** yes, from `data/geometry.json`, tested to 2 cm.
- **Smooth:** unknown until measured on a GPU. Draw calls and triangles are inside budget.
- **No people, hands or logos:** yes.

## Final numbers against Section 15
Sampled by `npm run perf` on **software WebGL (SwiftShader, no GPU)**. Frame rates are not representative and are not compared with the targets. Draw calls and triangles do not depend on the GPU.

| Measure | Target | Result | Verdict |
|---|---|---|---|
| Model view, idle: frames rendered in 10 s | render on demand | 0 (main thread free at 60 rAF/s) | Pass |
| Model view draw calls | ≤ 200 | 192 | Pass |
| Walkthrough draw calls, stop 6 / 14 / 19 | ≤ 300 | 229 / 188 / 160 | Pass |
| Visible triangles | ≤ 1.5 M | 107k model, 128k to 247k walkthrough | Pass |
| Model view fps, idle and orbiting | ≥ 60 | not measurable here | **Unverified** |
| Walkthrough fps at stops 6, 14, 19 | ≥ 55 | 0.3 to 0.5 on software WebGL | **Unverified** |
| Layout switch | < 150 ms | 24 ms for the switch itself when no frame is pending; 1.3 to 1.4 s here when the measurement includes a software-rendered frame | **Unverified** |
| Long tasks over 50 ms during interaction | none | every software frame is a long task | **Unverified** |
| First-load download | < 60 MB | `dist/` is about 3.6 MB (1 MB of it the debug floor plan) | Pass |

Run on the target Mac: `npm run build && STUDIO_GPU=1 npm run perf`.
