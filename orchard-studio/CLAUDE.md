# Orchard Studio: project rules (read every session)

Photoreal web 3D model and walkthrough of Orchard Studio, ADC-05, TCS Bangalore (Yeshwanthpur, 9th floor).
Full spec: `MASTER_PROMPT.md`. Geometry source of truth: `data/geometry.json` (plan feet, origin = ADC-05 SW interior corner, +x east, +y north; world = (x*0.3048, h*0.3048, -y*0.3048)).

## Always
- Follow MASTER_PROMPT.md. If the geometry, the Excel screenshots and the floor plan disagree, the geometry wins; log it in DECISIONS.md.
- Default layout is Recommended. Four layouts: today, recommended, keep9, rejected.
- Apple-grade calm: white, light oak, low-iron glass, soft daylight. No people, no hands, no client logos, no neon, no gaming effects.
- Keep the spine (y 12-17, x 15-77) and the fire lane (x 57-62, y 0-17) clear in every layout.
- Done means verified: `npm run verify` green, screenshots read and reviewed in qa/phase-N/REVIEW.md, perf compared with Section 15.
- Stop at checkpoints after Phase 1, 3 and 7 and wait for the owner.
- Commit at the end of each phase: `phase-N: <summary> (verified)`.

## Performance rules (non-negotiable)
- Render on demand in presentation mode; DPR 1.0-1.5; shadow maps static (autoUpdate=false).
- Transmission only on the entry door and PRISM glass; path tracer Ultra-only after idle.
- Instance every repeated object; one material instance per material (core/materials.ts).
- No setState or allocations in useFrame; one HTML label overlay; hover raycasts only on zone proxies.
- Layout switches toggle prebuilt groups, never rebuild.

## Commands
- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm run test` · `npm run e2e`
- `npm run shots` (qa/latest) · `npm run perf` (qa/latest/perf.json) · `npm run verify` (all of the above)
- Debug: `?debug=1` (perf overlay), `?debug=plan` (ortho plan camera + floor plan underlay at 45.26 px/ft, origin px 4299,2889)

## Status (keep updated)
- Current phase: 0 (not started)
- Open questions: room names (default Discussion Room A / B), music track (off until supplied), window orientation (assumed east)
