# Attribution

Everything that ships in this repository was written or generated for it. No third-party models, photographs or audio files are included.

## Shipped by default
| Asset | Source | Licence |
|---|---|---|
| All 3D geometry (architecture, furniture, devices, plants, city) | Built procedurally in `src/architecture`, `src/furniture`, `src/zones`, `src/scenes` | Project code |
| All textures (oak, terrazzo, carpet, porcelain, fabric, frosted-glass normal, leaves, facade) | Generated in code: `src/core/textures.ts` | Project code |
| Studio light and daytime sky (image-based lighting) | Generated in code: `src/scenes/env.ts` | Project code |
| All sound | Synthesised with WebAudio: `src/audio/synth.ts`, `src/audio/beds.ts` | Project code |
| Placeholder artwork (posters, kiosk pages, app screens, PRISM, photos) | Drawn in code: `src/core/art.ts` | Project code |
| Inter typeface | `@fontsource/inter` (Rasmus Andersson) | SIL Open Font License 1.1 |

Devices in the museum and the Galleria are generic, logo-free reconstructions. There are no client logos or trademarks anywhere.

## Optional, fetched by the owner (`npm run assets:fetch`)
Not in the repository. If you run the fetch script on a machine with network access, these CC0 assets are downloaded to `assets-raw/` (git-ignored) with a `LICENSE.txt` beside each:

| Asset id | Type | Source | Licence |
|---|---|---|---|
| `studio_small_08` | HDRI, presentation light | Poly Haven, https://polyhaven.com/a/studio_small_08 | CC0 1.0 |
| `kloofendal_48d_partly_cloudy_puresky` | HDRI, walkthrough sky | Poly Haven | CC0 1.0 |
| `oak_veneer_01`, `laminate_floor_02`, `terrazzo_tiles`, `grey_plaster_02`, `fabric_pattern_07` | PBR textures | Poly Haven | CC0 1.0 |

The asset ids could not be checked against the live API from the build environment (no network access to Poly Haven there). A missing id is reported and skipped.

ambientCG (CC0) textures can be added by hand: see `tools/README.md`.

## Libraries
three.js, React, React Three Fiber, drei, postprocessing, n8ao, three-gpu-pathtracer, three-mesh-bvh, camera-controls, zustand, troika-three-text, maath (all MIT), Vite (MIT), Playwright (Apache 2.0), Vitest (MIT).
