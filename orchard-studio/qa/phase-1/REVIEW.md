# Phase 0 and 1 review: bootstrap and blockout

`npm run verify`: typecheck, lint, 83 unit tests, build, shots, e2e and perf all pass (see `verify.json`).

## Plan-check shots (`plan-all-*`, `plan-adc-*`, one per layout)
Orthographic top view in plan feet with `reference/01` at 50%, calibrated at 45.26 px/ft, origin pixel (4299, 2889). Walls red, glass blue, pillars dark.

| Element | Result |
|---|---|
| ADC-05 envelope, both recess notches, the stepped north-east corner | On the drawn walls, within about 2 px at 15 px/ft |
| Pillars P1 to P6 | On the drawn column hatches |
| Both 6-pax rooms | West room on the drawing. East room on the drawing |
| Desks (Recommended 90, Keep 9 99, Today 112) | Columns land on the drawn desk blocks |
| Corridor, Lift Lobby 02, lift car PL07, the two lounges | On the drawing |
| Entry and fire door recesses | On the drawn ACD and FIRE DOOR pockets |

Off, and what was done:
- Today's 13 strip desks are 4 × 2 ft rows in the geometry; the drawing shows 2 × 4 ft columns there. Geometry wins (DECISIONS D-16). Not changed.
- First plan shots were white on white. Fixed: flat debug colours per element type in `?debug=plan`.
- `settle()` never resolved in the plan view (a shadow flag was never cleared), so each shot waited two minutes. Fixed.

## Walkthrough blockout shots (stops 3, 7, 14)
- Geometry reads correctly: corridor with the ADC-04 fire door, the spine running clear to the east window, east room glass with its frosted band, the fire door with exit sign, sun patches on the floor at Window Pause.
- Off (expected at blockout, addressed in Phase 2): flat blue-grey cast, no material definition, block furniture.

## Tests
- Data integrity, counts, fire lane, spine, sightline, plant clearance, wall sliding, door gating, ODC not reachable, geometry read back from the scene graph within 2 cm, tour reachability for Recommended and Keep 9: all pass.
- Known conflict pinned by a test: kiosk K1 blocks the (17.5, 5) → (76.5, 14.5) ray (DECISIONS D-07).

## Performance
Software WebGL in this environment (no GPU): numbers are **not representative**. Run `STUDIO_GPU=1 npm run perf` on the target Mac.
