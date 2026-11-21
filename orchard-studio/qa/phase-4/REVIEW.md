# Phase 4 review: door labels, plants, sound

| Item | Result |
|---|---|
| Door plates | 12 plates at 5 ft: three stores, ADC-04 ACD, both fire doors, the entry, both discussion rooms, the team door, Window Pause and Memory Corner markers (`walk-06-entry`, `walk-21-memory-corner`). Room names come from `CONFIG.roomNames` |
| Model door tags | `presentation-recommended-doors`: tags sit on their doors. Neighbouring tags overlap at the default zoom (the three stores; Window Pause against Room B) and separate when zoomed in |
| Lift indicators and sign | `walk-01-lift-lobby-1`: "09" lit in the car, "Orchard Studio ↑" opposite PL07 |
| Plants | 11 pods in Recommended (ficus, olive, low pods, mid planter, corner pods) with cut-out leaf cards. Clearance tests pass: no plant in the spine, the fire lane, a door swing or furniture |
| Sound | Engine with Master, Ambient, UI and World buses, every sound synthesised. e2e test passes on the event log: unlock on first gesture, click logged, mute persisted to localStorage, duck on and off, bed switches to `corridor` when the visitor is there |

Off, not fixed:
- **Nobody has listened to the audio.** Levels and timbre were set by reasoning, checked only through the event log and unit tests (47 pass). Expect to tune gains by ear.
- Plants are merged per material rather than instanced (fewer draw calls; noted in DECISIONS).
- The fire-exit plate for ADC-05 is on the east room's glass face, because the door itself spans the whole recess.
