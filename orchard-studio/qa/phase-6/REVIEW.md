# Phase 6 review: tour, minimap, dock, toasts

| Item | Result |
|---|---|
| Guided tour, Recommended | e2e passes: stops 1 to 22 visited in order, 0 collisions, lift door and watch gate played on the way |
| Guided tour, Keep 9 seats | e2e passes: same order with its own positions, 0 collisions |
| Today, Rejected | Free walk only, with the banner (`layout-today-*`, `layout-rejected-*`) |
| Tour paths | A* on the 0.5 ft grid with string pulling; unit test confirms every segment is clear of colliders with doors opened in sequence |
| Dock | Location pill, previous / play-pause / next, Map, Layout, Sound, Exit to model (all walkthrough shots) |
| Minimap | Top right, circular, north up, zone tints, desks, stop dots, visitor arrow; click expands |
| Zone toasts | "Entering …" after 350 ms in the new zone; location names unit-tested |
| Controls | WASD and arrows, Shift, drag look, L for pointer lock, click-to-walk with A*, E to interact, touch joystick |

Off, not fixed:
- Pause on input and Resume from the nearest stop are implemented but only the unattended run is tested.
- Walking feel, look smoothing and the touch joystick have not been tried on a real device.
- Pointer lock is opt-in with L rather than the default (D-15).
