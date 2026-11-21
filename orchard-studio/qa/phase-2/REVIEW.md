# Phase 2 review: look and performance foundation

Phases 2 to 7 were built in one pass and verified together on the final tree (the owner asked for no checkpoint stops). Screenshots here are from that final `npm run verify`.

## What was built
Material library (`core/materials.ts`, one instance per material), generated PBR textures, colour management (sRGB output, AgX in the composer), sun at azimuth 110° / elevation 45° with a static 4096 shadow map, emissive ceiling slots and panels, three area lights on High and Ultra, N8AO + SMAA, quality tiers, instanced desks, chairs, monitors, screens, laptops, succulents, flexi displays and lab racks.

## Shots: stops 6, 14, 19
| Shot | Matches | Off | Fixed |
|---|---|---|---|
| `walk-06-entry` | Steel header with the sign, glass sliding pair with sidelights, reader with white ring on the east jamb, PRISM visible through the door | Door plate on the west jamb is small at this distance | Left as is: it is a 260 mm plate, readable at 3 m |
| `walk-14-the-reveal` | White walls, clear spine to the east glass, Garage on the left with privacy-filtered monitors, kiosks and Journey wall on the right, Five Point bands on P2 | First pass was blue-grey and flat (sky-coloured ambient, dark ceiling). Second pass was too white, carpet and terrazzo the same value | Neutralised the lighting sky, added warm bounce from below, raised screen brightness, darkened the carpet, raised AO |
| `walk-19-crescent-and-board` | Oak floor, round rug, crescent, board, plinth line with placards, mullion shadows across the floor, city beyond | Rug read dark blue in the first pass; facade texture was a harsh checker | Warmer rug, lower-contrast facade, more haze |

Found late and fixed: the AO radius was meant to follow the model's scale (2 cm on the table, 0.8 m in the walkthrough), but the `N8AO` component ignores the ref used to update it, so the walkthrough ran with the 2 cm radius and had almost no ambient occlusion. It is now driven through the composer's pass list. The same fix turns off N8AO's transparency-aware pass, which was re-drawing about 50 glass meshes per frame.

Still off, not fixed:
- Interiors are lit by image-based light and a hemisphere light, which is not occluded: there is no bounce-light gradient from the windows, so it reads as a clean render rather than a photograph. A lightmap bake (script provided, needs Blender) is the real fix.
- N8AO at half resolution leaves faint mottling on large flat walls in a few shots.
- Oak and terrazzo are generated textures; photographic CC0 maps need the fetch script to run on a networked machine.

## Performance foundation
| Check | Result |
|---|---|
| Draw calls, model view | 192 on High, 184 on Low (limit 200) |
| Draw calls in the walkthrough | See `perf.json` for stops 6, 14 and 19 on High (limit 300). The reveal measured 197 |
| Triangles | 125k to 250k (limit 1.5 M) |
| Render on demand in the model view | Verified: 0 frames rendered while idle in the perf sample |
| Static shadows | `autoUpdate = false`; refreshed on layout, mode and tier changes |
| Frame rate | **Not representative**: software WebGL here. See `perf.json` and the command in the README |

How the draw calls got there: first measurement at the reveal was 498. Fixes: small text and loose devices are drawn only near the visitor; instanced meshes are frustum-culled by their combined bounds; plants are merged per material; the two transmissive panes fall back to plain glass at a distance so the transmission pass (which re-renders the opaque scene) only runs at the entry.
