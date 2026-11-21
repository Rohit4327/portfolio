# Orchard Studio: build plan

## Architecture in one page
- **One scene graph, two scales.** `scenes/studio.ts` builds the whole floor once, in metres, from `data/plan.ts` (which derives everything from `data/geometry.json`). The same graph sits on the oak table at 1:40 and is the full-scale walkthrough. The dive scales it about lift car PL07; there is no second model and no cut.
- **Data first.** `data/plan.ts` turns Section 24 into walls, glass, doors, desks, fixtures, zones and collision footprints for each layout. Builders, collision, the nav grid, the tour and the tests all read that one module.
- **Imperative builders, React shell.** Geometry is plain three.js (`architecture/`, `furniture/`, `zones/`), mounted through one `<primitive>`. React Three Fiber owns the canvas, composer and controls. React state never changes per frame: per-frame data lives in `state/runtime.ts`.
- **Parts, not rebuilds.** Every piece is a part tagged with its layouts and mode. A layout switch toggles visibility and instance counts. Desks are ordered so each layout draws a prefix (90 / 99 / 112) of one instanced set.
- **Draw calls by construction.** Static meshes are merged per material per part (`core/build.ts mergeStatic`); repeated furniture is instanced from prototypes (`instancePrototype`). One material instance per material (`core/materials.ts`).
- **Render on demand.** Presentation uses `frameloop="demand"`; anything that changes the picture calls `touch()`. The walkthrough renders continuously.
- **Static shadows.** `shadowMap.autoUpdate = false`; a dirty flag refreshes the map on layout, mode or tier changes only.
- **Deterministic QA.** `window.__studio` (dev and `?debug=…`) drives every test: `setLayout`, `setMode`, `goToStop`, `setCamera`, `getCounts`, `getRendererInfo`, `getFps`, `settle`.

## Modules
| Area | Files |
|---|---|
| Data | `data/geometry.ts` (typed JSON, `toWorld`), `data/plan.ts` (derived plan), `data/manifest.ts` (content) |
| Core | `core/materials.ts`, `core/textures.ts` (procedural PBR), `core/build.ts` (helpers, merge, instancing), `core/text.ts`, `core/postfx.tsx`, `core/quality.ts` |
| Architecture | `architecture/shell.ts` (walls, windows, glass, floors, ceilings), `doors.ts`, `context.ts` (table-model massing) |
| Furniture | `furniture/workstation.ts`, `plants.ts`, `exhibits.ts`, `museum.ts`, `play.ts`, `smallItems.ts` |
| Zones | `zones/workfloor.ts` (instanced desks), `zones/fixtures.ts` (studio zones per layout), `zones/approach.ts` (lobby, corridor, entry) |
| Scenes | `scenes/studio.ts`, `Stage.tsx`, `director.ts`, `env.ts`, `presentation/`, `transition/`, `walkthrough/` |
| Systems | `collision2d.ts`, `navgrid.ts`, `hotspots.ts`, `zones.ts`, `tour.ts`, `interactions/*` |
| Audio | `audio/engine.ts`, `synth.ts`, `beds.ts` |
| UI | `ui/*` (one overlay layer) |
| QA | `debug/api.ts`, `debug/PlanView.tsx`, `tests/unit`, `tests/e2e`, `tools/verify.mjs` |

## Risks
| Risk | Mitigation |
|---|---|
| No GPU in the build environment (software WebGL) | Screenshots still render; perf numbers are labelled not representative, with the one-line command for the owner's Mac |
| No network to Poly Haven here | Procedural textures and sky ship as the default; `npm run assets:fetch` upgrades to CC0 maps on the owner's machine |
| Draw-call budget with transmission (re-renders opaque scene) | Transmission on two panes only, walkthrough only; merge per material; instancing |
| Spec conflicts (sightline vs kiosk K1, 26 vs 22 foosball figures, framing numbers) | Geometry wins; each conflict logged in DECISIONS.md and pinned by a test |
| Path tracer cannot be verified without a GPU | Ultra-only, behind a guard; reported as unverified |
| Scope (seven phases, many interactions) | Independent modules delegated (furniture, audio, foosball engine, asset scripts) and integrated behind typed contracts |

## Phase checklist (Section 20)
- [x] **0 Bootstrap**: repo, tooling, scripts, plan, `window.__studio`, debug overlays, geometry check
- [x] **1 Blockout**: shell, glass, pillars, doors, rooms, lift core, lobby, corridor, block desks for four layouts, collision, nav grid, walk controls, `?debug=plan`
- [ ] **2 Look and performance foundation**: materials, colour management, sun and interior light, shadow policy, post, tiers, instancing, perf baseline
- [ ] **3 Layouts, zones, components**: Sections 5, 7, 8 with interactions; Today and Rejected furniture
- [ ] **4 Door labels, plants, sound**: Sections 9, 10, 16
- [ ] **5 Presentation mode and the dive**: Sections 4 and 6
- [ ] **6 Tour, minimap, dock, toasts**: Sections 13 and 14
- [ ] **7 Polish**: city, path-traced stills, docs, final verify
