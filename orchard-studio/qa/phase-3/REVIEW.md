# Phase 3 review: layouts, zones, components

## Shots, Recommended
| Shot | Matches | Off / fixed |
|---|---|---|
| `walk-08-welcome` | 11 ft LED flush in the full-height oak slat panel, welcome card | Stop 8 stands 10 ft away looking up, so the display fills the frame. Position is the spec's |
| `walk-14-the-reveal` | 4 kiosks (zig-zag, screens west), rug, Journey wall, pods | none |
| `walk-15-the-garage` | 42 desks, monitors, laptops, flexi arms, lab rack, screens between pairs; Make Studio glass with vinyl sign; scoreboard, foosball and Wall of Memories beyond | none |
| `walk-16-app-galleria` | Oak rail, backlit title, phones and tablets in cradles with QR cards, hotspot rings | none |
| `walk-17-window-seats` | East window, road, viaduct, blocks, canopy | The seats are below the frame at eye level; the city is plain (see Phase 7) |
| `walk-19-crescent-and-board` | Crescent, rug, board, 8 plinths with vitrines and placards | none |
| `walk-21-memory-corner` | 23 framed photos, mixed sizes on an aligned grid, ficus, wall marker | Placeholder photos are soft gradients by design |
| `walk-22-read-note` | Pedestal, oak stand, folded note with its title | none |

## Shots, other layouts
| Shot | Matches |
|---|---|
| `layout-today-spine`, `layout-today-bottom-band` | 112 desks, two glass GL cubicles, sofa, coffee table, round table with four chairs, no studio glass. Banner: free walk only |
| `layout-keep9-make-strip`, `-garage-nine`, `-memory` | Nine-seat column restored, glass at x = 63.7, two facing benches, smaller board, three plinths (the headset marked Newest), Wall of Voices on the glass |
| `layout-rejected-make-at-door`, `-kiosks-at-windows` | Crescent, board and plinths in the bottom band; kiosks backed onto the east windows; banner: free walk only |

## Interaction tests (`npm run e2e`, all pass)
Layout counts and summary chips · watch gate opens the door · kiosk opens and closes · Galleria device picked up, QR scanned, put back · headset on, Home panel, off · board session start and end · foosball goal against a scripted ball · selfie produces a JPEG · Read Note opens.

## Not built or simplified (also in DECISIONS D-21)
- Kiosk, app and headset tiles show generated pages; manifest image files are not loaded onto them yet.
- Landing display and corridor screen play a generated loop, not a video file. The "Welcome, Name" card works with `?visitor=`.
- No depth of field in inspect poses.
- Foosball has 22 figures, not 26 (D-20). Its feel on a real GPU is untested by hand: only the scripted goal and the engine's unit tests ran.
- The whiteboard, Ask and headset tiles were exercised by tests only as far as opening and closing. Drawing strokes, the typed query and tile windows were not tested by hand.
