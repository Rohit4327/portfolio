# Architecture

## Data flow
```
data/geometry.json  (Section 24, source of truth, plan feet)
        │
src/data/geometry.ts   typed view, toWorld(), FT
src/data/plan.ts       walls, windows, glass, doors, desks, fixtures, zones, footprints, counts  ← per layout
        │
        ├── architecture/, furniture/, zones/   → scenes/studio.ts (one scene graph, parts tagged by layout and mode)
        ├── systems/collision2d.ts, navgrid.ts  → walking, click-to-walk, tour paths
        ├── systems/hotspots.ts, tourStops.ts   → interactions and the guided tour
        └── tests/unit                          → geometry, counts, clearances, reachability
```
Nothing positions an object from a literal: coordinates come from `plan.ts` in feet and go through `placeFt`, `boxFt`, `segBox` or `matrixFt`.

## One scene graph, two scales
`scenes/studio.ts buildStudio()` returns `{ root, parts, doors, workfloor, registry }`. The root sits inside a "world" group:

| Mode | World scale | World position |
|---|---|---|
| Presentation | 1/40 | so the plan extent is centred on the table top |
| Walkthrough | 1 | `WALK_OFFSET`: lift car PL07 stays exactly where it was on the table |
| Dive | `diveScale(e)` (geometric) | pivot fixed at PL07; for Exit to model the pivot is the visitor and travels back to the table |

`scenes/transition/dive.ts applyDive(τ)` is a pure function of dive time, so the entry dive, the reverse and the paused test frame share one code path.

Parts carry `layouts` and `mode` ('model' or 'walk'). `studio.apply(layout, mode)` toggles visibility and sets instance counts. Desks are ordered Project ODC, Garage, the nine, the strip, so each layout draws a prefix of one instanced set (90, 99, 112).

## Draw calls
- `core/build.ts mergeStatic(group)` collapses static meshes to one mesh per material per part.
- `instancePrototype(proto, matrices)` turns a furniture prototype into one InstancedMesh per material.
- `core/materials.ts` holds one instance of every material. Screens and prints with unique artwork are the only per-object materials; photo walls and posters share atlas textures.
- Transmission is on two panes only (entry door leaves, PRISM pane) and only in the walkthrough (`setTransmission`).

## Rendering
- `App.tsx`: `<Canvas frameloop="demand">` in presentation, `"always"` in the walkthrough and the dive. Anything that changes the picture calls `touch()` in `state/runtime.ts`.
- `core/postfx.tsx`: one composer: N8AO (radius scales with the model, 0.02 at 1:40, 0.8 m at 1:1), optional bloom on Ultra, AgX tone mapping, SMAA.
- Shadows: `shadowMap.autoUpdate = false`. `rt.shadowDirty` is set on layout, mode and tier changes.
- `scenes/env.ts`: PMREM environments generated in code (studio softboxes; daytime sky), plus the sky dome shader.
- `core/quality.ts`: tiers from Section 15. Auto starts at High and steps via `PerformanceMonitor`.
- `scenes/presentation/PathTracerStill.tsx`: Ultra only, after 2 s idle, lazy-loaded.

## State
- `state/store.ts` (zustand): mode, layout, quality, labels, inspect, tour, toasts. Changes a few times per interaction, never per frame.
- `state/runtime.ts`: the visitor's pose, open doors, frame counters, nav grid cache. Plain mutable objects read in `useFrame`.
- `scenes/frameHooks.ts`: systems register per-frame callbacks; the stage runs them once per frame.

## Walking
`scenes/walkthrough/WalkControls.ts` moves the visitor in plan feet with `moveAndSlide` (circle vs wall capsules, rectangles and circles). Click-to-walk and the tour use `navgrid.findPath` (A* on a 0.5 ft grid with string pulling). Doors are colliders until their rig is more than 85% open.

## Interactions
`systems/inspect.ts` eases the camera to the hotspot's authored pose and back to the exact walking pose. `systems/interactions/index.ts` registers a controller per hotspot kind (enter, update, action, exit). `ui/Cards.tsx` renders the matching controls. Foosball physics is `systems/interactions/foosballEngine.ts` (deterministic, 240 Hz fixed step).

## UI
One overlay (`ui/Overlay.tsx`). Labels, door tags and hotspot rings are projected in a single `requestAnimationFrame` loop (`ui/project.ts`) and moved with `translate3d`; no React state per frame, no occlusion raycasts. Hover raycasts test only the invisible zone proxies (`zones/proxies.ts`, with BVH).

## QA
`debug/api.ts` installs `window.__studio` in dev and with `?debug=…`. Playwright drives the app only through it (`tests/e2e`). `?debug=plan` renders the orthographic plan check with the floor-plan underlay.
