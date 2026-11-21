# MASTER PROMPT · Claude Code (Fable 5.2) · Orchard Studio, Bangalore · Photoreal 3D model and walkthrough

You are a senior real-time 3D engineer and an Apple-grade environment artist working as one person inside Claude Code. Build, from an empty repository, a production-quality, photorealistic, fully interactive web experience of a new client studio called **Orchard Studio**. It sits inside ODC ADC-05 at TCS Bangalore, Yeshwanthpur, 9th floor. "Orchard" is the internal name of the client account.

**This document is complete on its own.** Everything you need is here or in the repository files listed in Section 0. You have a real terminal, so you can install packages, run the app, take screenshots with Playwright, read those screenshots, measure performance and commit to git. Use all of that. Never report something as working until you have run it and looked at it.

## 0. Files in this repository

```
MASTER_PROMPT.md                          this document
CLAUDE.md                                 standing project rules (keep it updated)
data/geometry.json                        Section 24 as a file: the source of truth
reference/01_Floor_Plan_Group_402.jpg     architectural floor plan, 8000 × 5556 px
reference/02_Annotated_Route_LiftLobby1_to_Entry.jpg   same plan with the visitor route; lift core #1 circled
reference/03_Excel_Layout_Full_View.png   scaled Excel layout of ADC-05 (sheet Layout)
reference/04_Excel_Layout_Detail_Zoom.png close-up of that sheet: the 1 ft grid and axis numbers
reference/05_Current_Build_Phase2.png     a previous attempt by another tool: what NOT to ship (see Section 0B)
```

If `data/geometry.json` is missing, create it verbatim from the JSON block in Section 24. If it exists, it must equal Section 24; check this with a test.

**Calibration of the plan images (01 and 02):** 45.26 px per ft, with the ADC-05 origin (0,0) at pixel (4299, 2889). If an image is resized, scale both numbers by (new width / 8000).

**Excel convention (03, 04):**
- 1 cell = 1 ft. Column CG covers x 0 to 1; row 62 covers y 0 to 1. The pink dashed grid is 5 ft.
- Black borders are solid walls, blue borders are glass, dark grey cells are pillars, orange cells are meeting rooms.
- Yellow/green checker cells are desks (2 × 4 ft each); white cells are outside the building.

**Source of truth, in order:** `data/geometry.json`, then the Excel screenshots, then the floor plan. If they conflict, follow the geometry and log the conflict in `DECISIONS.md`. Never silently invent, move or rename zones.

## 0A. How you work in Claude Code

1. **Read before you build.** Read this whole document, `CLAUDE.md`, `data/geometry.json`, and look at all five reference images. Then write `docs/PLAN.md`: architecture, module list, risks, and a phase checklist mirroring Section 20.
2. **Track progress.** Keep a task list for the current phase. Tick items only after they are verified.
3. **Git from the first minute.** Run `git init` and make a first commit of the kit files. Commit at the end of every phase with a message like `phase-3: layouts, zones and components (verified)`. Never commit `node_modules`, `dist` or downloaded raw assets above 50 MB (add them to `.gitignore`).
4. **Verification loop, every phase.** Run `npm run verify` (Section 22B): typecheck, lint, unit tests, build, screenshots, performance sample. Open every new screenshot and critique it against that phase's checklist and the quality bar in Section 2. Fix and re-run until it passes. Save the passing screenshots in `qa/phase-N/`.
5. **Checkpoints.** Stop and wait for the owner after Phase 1, Phase 3 and Phase 7 (Section 20). Post the screenshots, the numbers and open questions. Continue only when told to.
6. **Decisions.** When something is ambiguous, pick the option most consistent with Sections 1 and 2, log it in `DECISIONS.md` (date, question, choice, reason), and keep moving. Ask only when a wrong guess would cost more than an hour of rework.
7. **Subagents.** You may delegate independent, well-specified work: the procedural furniture library, the audio engine, the asset fetch and optimise scripts, test writing. You integrate it, review it and verify it yourself.
8. **Network and tools.**
   - You may install npm packages and download CC0 assets (Section 3).
   - Check for optional tools with `which`: `toktx` (KTX-Software), `blender`, `ffmpeg`. Use them if present and fall back gracefully if not, recording what you used in the README.
   - Never install system software without asking.
9. **Honesty.** Report exactly what you verified and how. If a check could not run (for example, no GPU in headless mode), say so and give the owner the exact command to run it on their machine.

## 0B. Lessons from a previous attempt (do not repeat these)

`reference/05_Current_Build_Phase2.png` shows another tool's attempt at this same project. Avoid every one of these failures:
- **Studio missing.** It showed only the shell and desks; none of the studio zones or components existed. The studio is the point; zones are not optional polish.
- **Laggy.** Common causes to avoid from day one: continuous rendering while idle, pixel ratio 2, shadow maps re-rendered every frame, transmission on every glass pane, an always-on path tracer, per-frame React state updates, HTML labels with occlusion raycasts, raycasting the whole scene on hover, and un-instanced repeated furniture.
- **Washed out.**
  - Grey on grey with no light direction.
  - AO invisible because its radius was not scaled for a 1:40 model.
  - Context buildings as prominent as the studio.
  - Probable colour-space mistakes.
  - A haze over everything.
- **Bad framing.** The model filled the whole screen, so the oak table and white room, the whole premise, were invisible.
- **Messy labels.** All labels were stacked on one side, leader lines crossed each other, and they were not in spatial order.
- **Debug text** ("PHASE 2 / MATERIALS & LIGHTING") left in the production UI.

## 1. Context (keep this intent in every decision)

- **Audiences.** Two groups use the studio: TCS Orchard CoE employees, who work in it every day, and new Orchard managers, who visit to see what TCS can do.
- **The sponsor's three asks:**
  1. Build for these two audiences only.
  2. Keep it minimal.
  3. Make it quick to stand up and cheap to run.

  So static pieces (print, vinyl, graphics) are preferred over screens wherever possible.
- **The layout follows seven rules:**
  1. **Team turns left, guests turn right.** The project team's door is at the west end of the frosted glass. Visitors never cross the team's path.
  2. **Keep the 60 ft spine clear.** From the entry you see straight down to the east window. That view pulls people in.
  3. **Reveal, don't expose.** Frosted glass and the PRISM hide the work until pillar P2, then the Garage opens on the left.
  4. **Screens never face or back onto the windows.**
  5. **Loud things go at the far end, behind glass.**
  6. **Static wherever possible.**
  7. **The fire lane stays empty** (x 57 to 62, y 0 to 17).
- **The visitor walk:**
  1. Arrive by lift at Lift Lobby #1.
  2. Walk the TCS corridor.
  3. Badge in at the recessed entry.
  4. The PRISM is straight ahead on the frosted glass.
  5. Turn right: the landing display welcomes the visitor by name.
  6. Four kiosks.
  7. Pass pillar P2: the Garage reveal.
  8. Window Pause: App Galleria and VR seats facing the skyline.
  9. Make Studio: museum and voices, then a session at the board.
  10. Memory Corner: a photo and the closing note.

## 2. Quality bar (non-negotiable)

- **Photoreal, not game-like.** Physically based materials, correct scale, believable light falloff, soft contact shadows, ambient occlusion and accurate glass. A screenshot should be mistakable for an architectural render.
- **Apple design language:**
  - White matte walls, light white-oak (pale beige, fine straight grain), low-iron glass.
  - Brushed aluminium, warm-grey textiles, pale stone floors.
  - Generous negative space and precise alignments. One accent at a time. No clutter.
- **Calm light.** Neutral interior light around 4000 K and morning daylight from the east windows. No coloured mood lighting, neon, lens flares, heavy bloom, vignette, grain or chromatic aberration.
- **Real dimensions.** Model in metres internally. The plan data is in feet (1 ft = 0.3048 m). Eye height 1.6 m. Ceiling 9.5 ft in ADC-05, 9.0 ft in the corridor and lobby.
- **Smooth.** Hit the targets in Section 15 without turning off shadows or AO.
- **No people, no hands, no client logos.**
  - No human figures, mannequins, silhouettes or hands anywhere.
  - Picked-up objects float into a foreground view instead of being held.
  - No Apple logos or trademarks unless the owner supplies them in `/public/media`. Devices are generic, precise, minimal reconstructions.

## 3. Tech stack

Use only free, publicly available tools and assets. Record every asset and its licence in `ATTRIBUTION.md`.

- **Build:** Vite + React 19 + TypeScript, static output (`npm run build` → `dist/`) that runs offline.
- **3D:** latest stable three.js with `@react-three/fiber` and `@react-three/drei`.
- **Post-processing:** `postprocessing` and `@react-three/postprocessing`, `n8ao` for ambient occlusion, then SMAA. No SSR.
- **Photoreal stills:** `three-gpu-pathtracer`, presentation mode only, Ultra tier only (Section 4.7).
- **Interaction and state:** drei `CameraControls` (or `camera-controls`), `zustand`, `troika-three-text` for 3D signage, `maath` for easing. `three-mesh-bvh` for raycasts.
- **Asset pipeline:** glTF/GLB with Meshopt or Draco compression, and KTX2/Basis textures.
- **Free asset sources:**
  - Poly Haven (CC0): HDRIs, textures, some models.
  - ambientCG (CC0): textures.
  - CC0/CC-BY plant models with attribution.
- **Fonts and tooling:** `@fontsource/inter` (OFL, bundled), Vitest, Playwright (use `channel: 'chrome'` for GPU runs), ESLint, Prettier, `@gltf-transform/cli` for Meshopt/Draco and textures.
  - KTX2 needs `toktx` (KTX-Software). If it is missing, fall back to WebP and note it in the README.
- **Asset fetching:** `tools/fetch-assets.mjs` downloads the chosen HDRIs and textures from the public Poly Haven API (CC0) at a fixed resolution, then `tools/optimize-assets.mjs` compresses them into `public/`. Credit Poly Haven and ambientCG in `ATTRIBUTION.md`.
- **Build these yourself, procedurally or as clean low-poly GLBs:** furniture, devices, kiosks, plinths, boards and architecture. Simple forms done precisely look more Apple than downloaded clutter.

## 4. Presentation mode (the model on the table)

### 4.1 Room
- A seamless white cyclorama with no visible corners, and a glossy white floor.
  - Use `MeshReflectorMaterial`: mirror about 0.2, blur about [300, 80], roughness about 0.6, resolution 512.
- Lighting:
  - A soft studio HDRI at low intensity.
  - drei `Lightformer`s: one large overhead softbox, two tall side strips, a faint warm fill.
  - Soft grounded shadows from `AccumulativeShadows` with a finite frame count, then frozen.
- No fog, haze or CSS overlay.

### 4.2 Table
- An Apple Store style solid white-oak table:
  - Top 2.6 × 1.3 m, 50 mm thick, 15 mm edge radius.
  - Two oak leg frames, height 0.86 m.
- Finish: pale honey-beige satin with straight grain along the length. `MeshPhysicalMaterial` with roughness about 0.45 and clearcoat 0.15 (clearcoat roughness 0.4).
- No visible texture tiling.

### 4.3 Architectural model
- **Scale 1:40.** The model covers plan x −80 to +80 ft and y −55 to +62 ft (about 1.22 × 0.89 m), on a 10 mm white base board with a 5 mm reveal.
- **Style:** a museum-quality architectural model.
  - Matte white walls, full height, ceiling removed.
  - Thin clear acrylic for clear glass; frosted acrylic for frosted glass.
  - Floors read by zone: warm oak in the Make Studio, light terrazzo in the Trail and spine, warm mid-grey carpet in the Garage and Project ODC, pale grey in the corridor and lobby.
  - Furniture in white and oak at model scale, plus plant pods.
- **Hierarchy:**
  - ADC-05 is the hero, at full detail.
  - Lift Lobby #1 / Lift Lobby 02, the corridor and the poster bays are medium detail.
  - Context massing (ADC-04, lift cores, store rooms, toilets, AHU) is desaturated cool grey at 60% opacity with walls cut at 1.2 m, so ADC-05 stands out.
- Engrave "#1" beside lift core #1 on the base board.

### 4.4 Look (crisp, never washed out)
- **Colour management:** albedo and emissive maps in `SRGBColorSpace`, data maps linear, `renderer.outputColorSpace = SRGBColorSpace`. AgX tone mapping, exposure 0.9 to 1.0.
- **AO at model scale:** at 1:40 the N8AO radius must be tiny, about 0.02 to 0.03 world units. Switch to walkthrough values at full scale.
- **Key light:** a soft directional light from upper-left at about 55° elevation, so walls cast readable shadows into rooms. Environment intensity about 0.4.
- **Values:** walls bright white with AO, desks white, chairs charcoal. The studio fixtures add the warm oak and soft colour.

### 4.5 Camera and framing
- By default the whole table is visible with about 12% margin and the white room around it. The model fills about 60% of the viewport width.
- Near-top view with depth: pitch 62°, slight perspective.
- Orbit, pan and zoom within limits. Double-click resets.
- Auto-orbit is OFF by default; there is an option for 0.3°/s.

### 4.6 UI (presentation)
- **Top-left:** wordmark `CONFIG.brandName` with "Yeshwanthpur, Bangalore" underneath.
- **Top-right:** an "ADC-05 · Level 09" pill and a settings icon.
- **Top-centre:** the layout segmented control (Section 5) with its summary chip.
- **Bottom-centre:** a frosted dock with the primary **Start experience** button, plus Reset and Labels. The Labels button cycles Zones → Zones + Doors → Off.
- **Zone labels:**
  - Two columns, left and right, each sorted by its anchor's screen y so leader lines never cross. Leaders are short and anchored on the active layout's zone centroids.
  - Numbered 01 Lift Lobby (#1), 02 TCS Corridor, 03 Entry, 04 The Trail, 05 The Garage, 06 Window Pause, 07 Make Studio, 08 Memory Corner.
  - Greyed context labels: Project ODC (secure) and 15-pax room (formal sessions).
- **Hover** tints the zone floor at 15% and dims the others.
- **Click** on a label or zone eases the camera onto that zone (0.8 s) and opens a frosted zone card bottom-left: name, size, components list and a one-line "why here" (text in Section 8), plus Close.
- **Settings sheet:**
  - Quality: Auto, Ultra, High, Medium, Low
  - Sound on/off and volume; Music on/off
  - Reduce motion
  - Floor-plan underlay (debug only)
- **Production hygiene:** no phase names or dev text in production UI. Debug overlays appear only with `?debug=1`.
- **Loading:** a loading screen with a progress percentage and "Preparing the studio". Walkthrough assets stream in the background while the visitor is in presentation mode.

### 4.7 Photoreal stills
On the Ultra tier only, after 2 s of idle camera, switch to `three-gpu-pathtracer`:
- Accumulate up to 256 samples with a small "refining" indicator.
- Build the BVH once in a worker and cache it; rebuild only on a layout change.
- Any input returns to raster instantly.
- Never use it in walkthrough mode.

## 5. Layouts: four switchable states, Recommended by default

**Control:** a segmented control `[Today] [Recommended] [Keep 9 seats] [Rejected]`, with keys 1 to 4.
- Recommended is selected on load. Save the choice in the URL hash (`#today`, `#recommended`, `#keep9`, `#rejected`).
- A summary chip below the control updates per layout.

**Behaviour:**
- Build all four layouts at load as hidden groups and toggle their visibility. Never rebuild on switch.
- On switching, fixtures fade and rise 6 cm into place over 0.35 s (instant with reduced motion). Labels, zone tints and the minimap update, and a soft switch sound plays.
- In the walkthrough, the same control lives in the Layout sheet. If the visitor stands inside a newly occupied footprint, nudge them to the nearest free point.
- The guided tour runs for Recommended and Keep 9 seats. For Today and Rejected, free walk only, with a small banner explaining why.

**The four layouts** (full data in Section 24 under `layouts`):

| Layout | What it contains | Summary chip |
|---|---|---|
| **Today** | ADC-05 as it stands: all 112 desks (including the 13 strip desks and the 9-seat column), Arun's GL cubicle, the centre collab and Prasanna's GL cubicle in the bottom band. No new glass. The red future-provision line is dashed at x = 3. | "112 desks · 2 GL cubicles · no studio" |
| **Recommended** | Sections 7 and 8 exactly. | "Garage 42 desks · Make Studio 19 × 30 ft · play area about 1,225 sq ft" |
| **Keep 9 seats** | The 9-seat column restored. Make glass at x = 63.7. A 13 ft Make strip with two facing curved benches instead of the crescent, a smaller board, 3 plinths and a smaller Memory Corner. | "Garage 51 desks · Make strip 13 ft wide · play area about 970 sq ft" |
| **Rejected** | Make and Feel at the door (crescent, board, 5 plinths and foosball in the bottom band). Kiosks along the east windows with their backs to the glass. Landing display on the east room's north face. No Make Studio glass. | Shown with a muted red "Rejected" tag and the card "No daylight for the Make zone · loudest zone at the entry · kiosks backed onto the windows". |

## 6. The transition into the model

The model and the full-scale interior are one scene graph. The dive animates the model group's scale from 1/40 to 1 about a pivot at the centre of lift car PL07 while the camera moves. There is no cut.

| Time | What happens |
|---|---|
| 0.0 to 0.4 s | Labels and dock fade out. |
| 0.4 to 2.0 s | The camera glides to 0.35 m above lift core #1, looking down. |
| 2.0 to 4.6 s | The camera descends into car PL07 while the model scales to 1. The table and room fade out; walkthrough lighting, sky and post fade in. The camera ends at eye height 1.6 m inside the car, facing east toward the closed doors. |
| 4.6 to 5.5 s | A lift chime plays and the doors slide open (1.2 s). The location pill shows "Lift Lobby #1". |

Ease with `easeInOutCubic`. Reduced motion: a 0.6 s crossfade to the open-door view. **Exit to model** reverses the animation about the visitor's current position.

## 7. Walkthrough: architecture

### 7.1 Lift Lobby #1 and Lift Lobby 02
Positions are in Section 24, `approach`.

- **Lift core #1** has six cars in two columns: PL02, PL07, a middle pair, PL06 and PL11.
  - East-column cars open east into **Lift Lobby 02**. The visitor arrives in **PL07**, the north car of the east column.
  - Doors are brushed stainless, centre-opening, 3.5 × 7 ft.
  - Car interior: stainless panels, pale stone floor, LED ceiling panel, a control strip with "09" lit.
- **Lobby:**
  - Large-format pale porcelain floor with a soft sheen, white walls, linear light slots.
  - A floor indicator over each door and slim call buttons. The call panel only plays a chime.
  - Wall sign "Orchard Studio ↑" opposite PL07.
  - Two tall planters.
  - Context: lift core 2 forms the east side; the curved collab lounge sits north of core #1.

### 7.2 The walk to the studio
Follow `approach.visitorPath`, which matches the drawn route in `reference/02_Annotated_Route_LiftLobby1_to_Entry.jpg`:
1. Exit PL07 east and turn north. Walk about 22 ft to the 2000 mm corridor.
2. Turn right (east) and walk about 69 ft along the corridor centreline (y −3.3).
3. At the entry recess (x 15 to 20), turn left (north). The door is set 4 ft back at y = 4.

### 7.3 The TCS corridor
- Clear width 2000 mm, 9.0 ft ceiling, pale porcelain floor, warm-white linear light.
- **South wall** (y −6.56) is solid: the IT store, admin store and LV room, with flush grey doors at the listed positions.
- **Poster bays on the south wall:**
  - Bay A: 3 framed posters (700 × 1000 mm).
  - Bay B: a 55" screen at 5 ft centre in a flush oak surround, playing a "TCS, with you for the long run" loop, with a small caption plate, plus 1 poster.
  - Bay C: 1 poster plus a wayfinding arrow.
  - Frames are thin dark aluminium with low-reflect glass, each with a slim picture light.
  - Content comes from the manifest, with placeholders until real artwork is supplied.
- **North side:** the fronts of ADC-04's rooms, then the ADC-05 west 6-pax room. Context only, not enterable.
- **Interaction:** inspecting a poster squares the camera up. Drag pans, wheel or pinch zooms, double-click fits.

### 7.4 Entry (recess x 15 to 20, door plane y = 4)
- Two-leaf frameless glass sliding door, with a brushed steel header carrying the "Orchard Studio · ADC-05" sign.
- A reader on the east jamb at 3.6 ft: a small black glass panel with a soft white ring.
- **"Tap watch to enter":**
  1. A watch graphic rises into the lower right of the view and moves to the reader.
  2. The ring turns green and a two-note chime plays.
  3. The leaves slide open over 0.9 s, then close 4 s after the visitor passes.
- The tour uses the same sequence.

### 7.5 ADC-05 shell (data in Section 24, `adc05`)
- **Envelope and windows:**
  - Solid walls as listed. Windows have a 1 ft sill, 9 ft head and slim dark-bronze mullions every 5 ft.
  - The east windows (x = 77) are the hero view.
- **Pillars** P1 to P6: 4 ft square, white plaster, floor to ceiling.
- **Ceiling:**
  - White acoustic ceiling at 9.5 ft, with linear light slots running east-west every 6 ft over the Garage and Trail.
  - A stretched-fabric light panel over the Trail (x 21 to 56, y 2 to 11).
  - A white-oak slat cloud over the crescent.
- **Floors:**
  - Terrazzo in the Trail, spine, Window Pause and Memory Corner.
  - Oak planks running east-west in the Make Studio.
  - Warm-grey carpet tiles in the Garage and Project ODC.
  - A 6 mm stainless strip at every change of material.
- **Glass:** 12 mm low-iron with slim aluminium channels.
  - Clear glass: a thin physical material with opacity about 0.1, strong environment reflection and slim aluminium caps, so it reads.
  - Frosted glass: white at opacity about 0.55, roughness 0.35, a faint noise normal map and a crisp 2 in clear border.
  - Transmission is used on only two panes (the entry door and the PRISM glass), at `transmissionResolutionScale` 0.5.
- **Project ODC** (x 3 to 33, y 17 to 58):
  - 48 desks seen as soft shapes through frosted glass.
  - Not walkable. The team door is locked; its tooltip reads "Project team only".
  - Its west side is closed with frosted glass unless `CONFIG.futureProvisionBuilt` says otherwise.
- **Meeting rooms:**
  - West 6-pax (enterable): glass front with a frosted band from 3 to 6 ft and its door on the north wall at x 11.5 to 14.5. Inside, an 8 × 3.5 ft oak table, 6 white upholstered chairs and a 65" display on the south wall showing a placeholder deck.
  - East 6-pax: the same furniture. Its door is on the north wall at **x 62.3 to 66.0**, and the App Galleria is on the rest of that wall.
- **Fire lane** (x 57 to 62, y 0 to 17): empty, leading to the recessed fire door, with exit signage.
- **Spine** (y 12 to 17, x 15 to 77): clear end to end.

## 8. Walkthrough: zones and components (Recommended)

**Rules for every component:**
- Real scale and PBR materials, with content from `public/media/manifest.json` and tasteful placeholders.
- Every interactive item has a white hotspot ring within 8 ft and an authored inspect pose (0.8 s ease, light depth of field).
- A frosted info card shows the title, two lines and a media slot, with Back and Next.
- Back always returns to the exact walking pose.

### 8.1 The Trail (x 20 to 57, y 0 to 12): Orientation and Show, merged
Zone card: "37 × 12 ft · landing display, 4 kiosks, Orchard Journey · first space you see when you turn right; solid wall for screens; screens face west so sound travels away from the Garage."

- **Landing display:**
  - An 11 × 6.2 ft fine-pitch LED with a 4 mm bezel, flush in a full-height white-oak slat panel (x 20.5 to 33.5), bottom at 2.5 ft.
  - It plays the welcome loop. With `?visitor=Name` it shows a "Welcome, Name" title card for 8 s in every loop.
  - Inspect opens a full-view player with play, pause and mute.
- **Kiosks K1 to K4** (positions in Section 24):
  - Slim brushed-aluminium totems, 1.5 ft deep × 3.0 ft wide, 6.2 ft tall, on a 3 in pale stone base.
  - 65" portrait touch screens facing **west**.
  - Each matte aluminium back carries a large thin numeral (01 to 04) and its topic name.
  - **Screen UI:** an idle attract loop that wakes as you approach, then a title, a hero image, 3 to 5 swipeable pages, progress dots and a back control.
  - **Content:** K1 Tata (group heritage), K2 TCS (milestones, AI momentum), K3 TCS and Orchard West Coast (team story), K4 Pollinator (idle screen, then "Explore Pollinator" pages).
  - `?profile=newManager` or `?profile=coe` swaps the page order from the manifest.
  - `CONFIG.kioskCount` from 4 to 6 re-spaces the kiosks evenly between x 36 and 54, keeping the zig-zag.
- **Orchard Journey wall:**
  - South wall x 34 to 56: a backlit printed band from 4.0 to 6.5 ft with an oak edge.
  - Five chapters, Discover · Design · Build · Connect · Evolve, with year markers. It reads west to east.
  - Inspect pans along the wall.
- **PRISM:** a printed graphic on the corridor face of the frosted entry glass (x 9 to 31, from 1.5 to 8 ft), inspectable with pan and zoom.
- **Rug:** a soft warm-light-grey wool rug under the kiosks. Kiosk audio is off by default, with captions.

### 8.2 The Garage (x 33 to 58, y 17 to 58): Work, 42 desks
Zone card: "25 × 41 ft · 42 desks · zero construction; open to the spine so visitors see real work."

- **Desks** (Section 24, `desks.garage`):
  - White tops with a 10 mm oak edge on slim white legs, and a 1.2 ft low frosted screen between back-to-back pairs.
  - A generic 27" thin-bezel monitor on an aluminium stand on every desk, and a laptop on one desk in three.
  - Charcoal mesh chairs on the given side, and tabletop succulents on every second pair.
- **Flexi displays:** one 32" monitor on an articulating arm at each cluster end, facing the central aisle (y 33 to 38).
- **Lab machines:** a small aluminium charging rack of test phones and tablets on the aisle-end desk of each cluster.
- **Five Point Anyone on pillar P2:**
  - Five bands from floor to ceiling, L1 at the bottom to L5 at the top.
  - Subtle tints on white: warm grey, sage, blue-grey, lilac-grey, sand.
  - Level numbers and names from the manifest on all four faces.
  - Inspect opens a card explaining each level.
- Monitors facing the spine darken at oblique angles (a privacy-filter effect).

### 8.3 Window Pause (x 62 to 77, y 12 to 21): App Galleria and VR
Zone card: "15 × 9 ft · the spine ends at this window; pick up an app, try the headset, take in the skyline."

- **App Galleria** on the east room's north face, **x 66.5 to 76.5**:
  - A 10 ft white-oak rail at 3.8 ft, with a thin backlit "App Galleria" title above it.
  - 7 devices (5 phones, 2 tablets) in slim aluminium cradles, screens on with app screenshots, each with a small QR card.
  - **Pick up:** the device floats into the foreground and shows 3 swipeable app screens.
  - **Scan QR:** a scan animation, then the app's manifest URL opens in a new tab.
  - **Ask:** a Siri-style glowing orb at the bottom of the view and a typed query ("Show me apps built for retail"). Matching devices on the rail glow.
  - **Put back:** the device returns to its cradle.
- **VR seats:**
  - Two swivel lounge chairs (oak shell, warm grey upholstery, 2.5 ft diameter) at the listed points, facing the east glass.
  - A 1.6 ft round oak side table between them holds the headset on a stand.
  - **"Try the headset":**
    1. The headset rises toward the camera, the view fades to black and holds 1 s.
    2. It returns at the same pose in "passthrough": the live scene with a soft translucent dim.
    3. After 2 s, a floating glass Home panel with 6 app tiles appears. A tile opens a floating window with an image or video.
    4. The visitor can still look around and walk. "Remove headset" fades back and returns the headset to its stand.

### 8.4 Make Studio (x 58 to 77, y 21 to 51): Make and Feel
Zone card: "19 × 30 ft · best light and the view; crescent and board make a near-square for sessions; board perpendicular to the windows, so no glare."

- **Glass:** clear at x = 58 with a 2 in frosted edge band. A vinyl "Make Studio" sign at 6.5 ft over the y 33 to 38 opening.
- **Museum** (8 plinths at x 58.4 to 60, at the y values in Section 24):
  - Plinths 1.6 × 1.6 × 3.5 ft, white mineral with an oak base reveal, and a 1.4 ft low-iron vitrine with a soft internal light.
  - Generic, logo-free device reconstructions in date order from south to north:
    1. beige early desktop
    2. compact all-in-one
    3. translucent coloured all-in-one
    4. white music player with a click wheel
    5. first touchscreen phone
    6. first tablet
    7. smartwatch
    8. spatial headset, marked "Newest" with a brighter vitrine
  - An oak placard on each plinth's front face: year, name, one line from the manifest.
  - **Inspect:** the object turns slowly in its vitrine, framed in the right part of the view, with the placard card on the left. Previous and Next move along the plinths.
- **Wall of Voices:**
  - 4 to 6 client quotes as white vinyl on the glass between 5 and 7 ft, printed double-sided so they read correctly from both sides. Quote 2 to 3 lines, with a smaller author line.
  - A small QR card at 4.5 ft beside each quote.
  - Inspect opens a card with the quote, name and role, and a Play control for the video.
- **Crescent sofa** (Section 24 geometry):
  - Warm grey boucle in segmented cushions on a 3 in oak plinth base. Seat 1.5 ft, back 2.6 ft.
  - A 16 ft round warm-grey wool rug, and the white-oak slat ceiling cloud above (dropped 1 ft, acoustic felt behind).
- **Collaboration board:**
  - An 86" display (6.3 × 3.6 ft) on a white castor stand with a slim oak shelf, parked at y 40.2 to 41.2 facing south.
  - **"Start session":** the board rolls to y = 36 over 1.2 s and opens a whiteboard with sticky notes and a pen. Drawing is by mouse or touch on a canvas texture, with Clear.
  - **"End session"** rolls it back.
- **Foosball** (Section 24 position):
  - An oak cabinet 56 × 30 in and 36 in tall, a sage-green field with white markings, and 8 chrome rods with rubber grips.
  - 26 figures: blue against amber, each team with 1 keeper, 2 defence, 5 midfield and 3 attack. Corner ball returns and goals with nets.
  - A small digital scoreboard on the solid wall at y = 51, x 72 to 74, at 6 ft.
  - **"Start match":** first to 5 against an AI.
    - Controls: 1 to 4 pick keeper, defence, midfield or attack; W/S or the arrows slide; Space kicks.
    - Touch buttons on mobile, plus pause and restart.
    - Physics at a 240 Hz fixed step. The AI has bounded aiming error. The HUD and the physical scoreboard share the score.
    - X or Back returns to the walking pose.
  - If time runs short, ship it inspectable but static and log that in `DECISIONS.md`.

### 8.5 Memory Corner (x 58 to 69, y 51 to 60): Selfie and Memories
Zone card: "About 10 × 9 ft · a quiet dead end with north daylight; the visit ends on a high note."

- **Wall of Memories:** about 24 photos in thin oak frames on the north wall (x 61 to 69, from 2.5 to 8.5 ft), mixed sizes on an aligned grid.
- **Selfie:** a 2 ft light-oak floor disc engraved "Stand here" at (65.0, 58.0), and a slim tripod with a tablet at (65.0, 53.5) facing north.
  - **"Take a photo":**
    1. The camera moves to the tripod's view and a 3-2-1 countdown plays.
    2. A shutter flash. Capture the frame only at the shutter, with no continuous render target and the same tone mapping as the scene.
    3. An instant-print card slides up showing the photo with "Orchard Studio" and the date.
    4. Offer Download, with a right-click or long-press save fallback if the host blocks downloads.
- **Read Note:** a small oak card stand on a slim pedestal at (59.2, 52.0).
  - **"Read note":** the card lifts and unfolds with a paper sound, showing "A note to take with you" from the manifest.
  - It ends with "Back to model" and "Restart tour".

### 8.6 Do not add
Nothing that is not in this document. In particular:
- no podcast area or staircase seating
- no Wall of Fame or Watcher's Wall
- no demo booths or conveyors
- no display pods or travellator seating
- no store gallery
- no tablet-assistant exhibit
- no capsule room or digital frosting wall
- no plant booth, pantry, awards shelf or extra posters
- no extra meeting rooms

## 9. Door labels (every door)

**Walkthrough:** a slim matte-white plate beside each door at 5 ft, with dark grey Inter Medium text and a pictogram where useful. It is readable at 3 m and brightens on hover.

**Model mode:** tiny engraved tags at each door, shown with Labels → "Zones + Doors" or automatically when zoomed close.

The full list with positions is `doorLabels` in Section 24. Room names come from `CONFIG.roomNames`.

## 10. Plant pods

Pale stone or matte white planters with ficus, olive and low mixed greens. Realistic leaves with alpha cutout and soft translucency.
- Instanced in both the model and the walkthrough.
- Positions are `adc05.fixtures.plants` in Section 24, plus tabletop succulents on every second back-to-back desk pair.
- A plant may never intersect the spine, the fire lane, a door swing or a tour path. Add a test for this.

## 11. Exterior view (east windows)

- The building is on the 9th floor, so eye level is about 31 m above the street.
- **Outside to the east:**
  - A road directly below.
  - An elevated metro viaduct running parallel about 60 m out.
  - Mid-rise blocks (6 to 20 floors) and a few towers (25 to 35 floors).
  - Tree canopy and light atmospheric haze.
- Build it procedurally:
  - Instanced boxes with tiled curtain-wall facade textures and glass reflectance.
  - Window-grid emissive at very low strength.
  - Distance fog under a CC0 partly cloudy daytime HDRI sky.
- Keep it cheap: low-poly or impostors beyond 200 m.

## 12. Lighting and post-processing (walkthrough)

- **Sun:** `CONFIG.timeOfDay` 10:30 with `CONFIG.windowFacing` 'east' gives an azimuth of about 110° and an elevation of about 45°.
  - A DirectionalLight with soft shadows: a 4096 map fitted to ADC-05, `shadowMap.autoUpdate = false`, updated only when the layout or the sun changes.
  - Mullion shadow patterns fall across the Make Studio and Window Pause floors.
- **Interior:** ceiling slots and fabric panels are emissive, paired with a few `RectAreaLight`s for soft speculars. Fill comes from the sky PMREM.
- **Tone and post:** AgX tone mapping, exposure balanced so the windows are bright but not blown out.
  - N8AO (half resolution, 8 samples on High), then SMAA.
  - Bloom on Ultra only, threshold high and strength ≤ 0.15, on screens only.
  - No vignette, grain or chromatic aberration.
- **Optional baked tier:** if Blender is available in your environment, provide `tools/bake_lightmaps.py` to bake AO and indirect lighting to a lightmap on UV2 for Ultra. If not, say so in the README.

## 13. Navigation and interaction (walkthrough)

- **Desktop:**
  - WASD or arrows to walk at 1.3 m/s; Shift is 2.2 m/s.
  - Mouse look with pointer lock and smoothing 0.12. FOV 60, no head bob.
  - Click on the floor to walk there (A* on a 0.5 ft occupancy grid built from Section 24), with a soft target ring.
  - E or click interacts.
- **Touch:** left joystick, right-side drag to look, tap the floor to walk, tap hotspots.
- **Collision:** 2D, in plan space, against the walls, glass, pillars and furniture footprints, with player radius 0.9 ft.
  - The visitor slides along walls instead of stopping dead.
  - Doors are closed colliders until opened. The project ODC and the corridor rooms are blocked.
- **Dock:** location pill · tour previous / play-pause / next · Map · Layout · Sound · Exit to model.
- **Minimap:** top-right, circular, north up, tinted with the active layout's zones, with a visitor arrow and stop dots. Click to expand.
- **Zone entry toast:** "Entering The Trail" and so on, with 350 ms hysteresis.

## 14. Guided tour (Recommended; Keep 9 seats uses the same order with its own positions)

Camera at eye height. Positions in plan feet.

| # | Stop | Camera | Look at | Action |
|---|---|---|---|---|
| 1 | Lift Lobby #1 | (−66, −25) in PL07 | east | Doors open, step out |
| 2 | Lift Lobby 02 | (−51.5, −24) | (−51.5, −6) | Wayfinding sign |
| 3 | TCS corridor | (−51.5, −3.3) | (0, −3.3) | Start corridor walk |
| 4 | Posters, bay A | (−21, −2.5) | (−21, −6.56) | Inspect |
| 5 | With you for the long run | (−4.5, −2.5) | (−4.5, −6.56) | Screen plays |
| 6 | Entry | (17.5, −2) | (17.5, 4) | Watch tap, door opens |
| 7 | PRISM | (17.5, 9) | (20, 17) | PRISM |
| 8 | Welcome | (24, 10) | (27, 0) | Landing display greets visitor |
| 9 to 12 | Kiosks K1 to K4 | 3.5 ft west of each kiosk | Its screen | Kiosk UI |
| 13 | Orchard Journey | (45, 9) | (45, 0) | Timeline |
| 14 | The reveal | (31, 14.5) | East along the spine | Garage opens on the left |
| 15 | The Garage | (47, 35.5) | North-east | Workstations |
| 16 | App Galleria | (71.0, 15.2) | (71.5, 12) | Pick up a device |
| 17 | Window seats | (70.5, 15.0) | (77, 16.5) | Headset passthrough |
| 18 | Museum and Voices | (61.5, 27) | (58.4, 27) | Plinth inspect |
| 19 | Crescent and board | (69, 22.5) | (69, 41) | Board rolls forward, session |
| 20 | Foosball | (68, 47) | (72, 47) | Inspect or play |
| 21 | Memory Corner | (63, 53) | (65, 60) | Take a photo |
| 22 | Read Note | (60.5, 53.5) | (59.2, 52) | Closing note, then Exit to model |

- Walk at 1.1 m/s and dwell 4 to 6 s per stop, with a caption card.
- Any input pauses the tour; Resume continues from the nearest stop.
- Doors and the badge reader play their real interactions.
- Waypoints stay inside the walkable area, use doors, never cut the fire lane diagonally and never clip furniture.

## 15. Performance (smooth without losing realism)

Design for these from the first commit, and profile with r3f-perf or stats-gl (`?debug=1`) and `npm run perf`:
1. **Render on demand in presentation mode.** Render continuously only while the camera moves, a transition plays or the auto-orbit runs.
2. **Pixel ratio:** `AdaptiveDpr` with `PerformanceMonitor`, between 1.0 and 1.5. Never 2.
3. **Static shadows:** `autoUpdate = false`, with tight frustums (2048 in presentation, 4096 in walkthrough) and frozen accumulative contact shadows.
4. **Limited transmission:** only the two panes named in 7.5.
5. **Path tracer:** Ultra only, after idle, with a cached BVH.
6. **One composer:** N8AO at half resolution, SMAA, no SSR.
7. **Instancing:** instance every repeated object (desks, chairs, monitors, laptops, plants, mullions, ceiling lights, city blocks) and merge static architecture per material. Draw calls ≤ 200 in presentation and ≤ 300 in walkthrough. Visible triangles ≤ 1.5 M.
8. **Labels:** one HTML overlay layer, projected in one rAF loop and applied with translate3d. No drei `Html occlude`, and no React setState per frame (use refs and zustand transient updates).
9. **Hover:** raycast only against invisible zone proxy meshes with BVH, throttled to rAF.
10. **Layouts:** all four prebuilt and toggled by visibility (Section 5).
11. **Textures:** KTX2 with mipmaps, anisotropy 4 to 8, 2K maximum. 4K only for the table top on Ultra. First-load download under 60 MB. Lazy-load everything after the lift lobby during the dive.

**Quality tiers** (Auto picks via `PerformanceMonitor`; the user can override):

| Tier | Shadows | AO | Reflections | Pixel ratio | Extras |
|---|---|---|---|---|---|
| Ultra | 4096 | N8AO high | Reflector 1024 | 1.5 | Path-traced stills, optional lightmap |
| High (default) | 4096 | N8AO half-res | Reflector 512 | 1.5 | None |
| Medium | 2048 | N8AO low | Environment only | 1.25 | None |
| Low | 1024 | Off | Environment only | 1.0 | Simplified city |

**Pass marks** (M1/M2 laptop, Chrome):
- Presentation idle and orbiting: ≥ 60 fps, GPU ≤ 8 ms.
- Walkthrough at the entry, the Garage reveal and the Make Studio: ≥ 55 fps.
- Layout switch: < 150 ms. No long tasks over 50 ms during interaction.

## 16. Sound (ambient always on, plus interaction sounds)

A small WebAudio engine with Master, Ambient, UI and World buses. Synthesise every sound in code by default, so it works offline with no licensing. Optional file overrides come from `public/audio/manifest.json` (CC0 or Pixabay licence only, credited in `ATTRIBUTION.md`).

**Rules:**
- Audio unlocks on the first user gesture.
- Mute and volume persist (localStorage inside try/catch). Pause when the tab is hidden.
- Ambient ducks by 70% while media with sound plays.
- Zone beds crossfade over 1.5 s.
- Levels: ambient about −32 LUFS, UI about −26, world about −22. No harsh transients.

**Ambient beds:**
- Presentation: soft room tone + an optional calm music bed (`CONFIG.music`; off if no track is supplied).
- Lift lobby: hum + a distant chime every 40 to 70 s.
- Corridor: HVAC air.
- Studio: room tone + very faint positional keyboard and murmur near the Garage + filtered city traffic near the east glass.

**Interaction sounds:**
- UI: hover tick, click, layout-switch whoosh, card open and close.
- Arrival: dive swell, lift chime, door slide.
- Footsteps per floor material (stone, carpet, oak), one step every 0.55 m.
- Entry: badge accept chime, glass door slide.
- Kiosk tap and swipe.
- App Galleria: device pick-up, QR beep, orb tone.
- Headset in and out.
- Vitrine tick when a plinth is inspected.
- Board: castor roll, pen stroke.
- Foosball: rod spin, kick, ball hit, goal chime.
- Shutter and countdown ticks.
- Paper unfold.
- Zone entry: very soft tone.

## 17. Content manifest (`public/media/manifest.json`)

Ship tasteful placeholders (neutral gradients, clean type, generic UI screens, no fake client logos). The owner swaps content without touching code.

```json
{
  "brandName": "Orchard Studio",
  "roomNames": ["Discussion Room A · 6", "Discussion Room B · 6"],
  "welcomeLoop": "media/welcome.mp4",
  "corridorPosters": [{"bay":"bayA","items":["media/tcs-poster-1.jpg","media/tcs-poster-2.jpg","media/tcs-poster-3.jpg"]},{"bay":"bayB","screen":"media/tcs-long-run.mp4","items":["media/tcs-poster-4.jpg"]},{"bay":"bayC","items":["media/tcs-poster-5.jpg"]}],
  "prism": "media/prism.jpg",
  "kiosks": [{"id":"K1","title":"Tata","pages":["media/k1-1.jpg"]},{"id":"K2","title":"TCS","pages":["media/k2-1.jpg"]},{"id":"K3","title":"TCS and Orchard, West Coast","pages":["media/k3-1.jpg"]},{"id":"K4","title":"Pollinator","pages":["media/k4-1.jpg"]}],
  "kioskProfiles": {"newManager":["K3","K2","K1","K4"],"coe":["K4","K2","K3","K1"]},
  "journey": {"chapters":["Discover","Design","Build","Connect","Evolve"],"milestones":[{"year":"2001","label":"Placeholder"},{"year":"2026","label":"Placeholder"}]},
  "fivePoint": [{"level":"L1","name":"Placeholder"},{"level":"L2","name":"Placeholder"},{"level":"L3","name":"Placeholder"},{"level":"L4","name":"Placeholder"},{"level":"L5","name":"Placeholder"}],
  "appGalleria": [{"name":"App 1","screens":["media/app1-1.png"],"url":"https://example.com","tags":["retail"]}],
  "headsetApps": [{"name":"Tile 1","media":"media/vr-1.jpg"}],
  "museum": [{"title":"Placeholder device","year":"1984","text":"One line."}],
  "voices": [{"quote":"Placeholder quote.","by":"Name","role":"Role","video":"media/voice1.mp4"}],
  "memories": ["media/memory-01.jpg"],
  "readNote": {"title":"A note to take with you","body":"Placeholder closing note."}
}
```

## 18. Configuration (`src/config.ts`): open decisions as switches

```ts
export const CONFIG = {
  brandName: 'Orchard Studio',          // or 'Orchard Dojo'
  defaultLayout: 'recommended',         // 'today' | 'recommended' | 'keep9' | 'rejected'
  futureProvisionBuilt: false,          // red-line partition at x=3
  x33GlassType: 'frostedTo7ft',         // 'frosted' | 'clear' | 'frostedTo7ft'
  kioskCount: 4,                        // 4 to 6, re-spaced between x 36 and 54
  roomNames: ['Discussion Room A · 6', 'Discussion Room B · 6'],
  windowFacing: 'east',                 // drives sun direction
  timeOfDay: '10:30',
  music: false,                         // true only if public/audio/music.* is supplied
  quality: 'auto',
};
```

## 19. Tests (automated; run before delivering)

These are unit and e2e tests. The screenshot review and performance sampling are in Section 22B. All of them run in `npm run verify`.


1. **Geometry:** every wall, glass line, pillar, desk and fixture matches Section 24 within 2 cm, read back from the scene graph.
2. **Clearances:**
   - Nothing intersects the fire lane, and the spine stays clear.
   - A ray at 1.6 m from (17.5, 5) to (76.5, 14.5) reaches the east glass unobstructed.
   - No plant blocks a path or a door swing.
3. **Reachability:** every tour stop and hotspot is reachable from the lift car in Recommended and Keep 9 seats, with doors opened in sequence. No tour segment intersects a collider.
4. **Counts:**
   - Today: 112 desks.
   - Recommended: 42 Garage + 48 Project ODC.
   - Keep 9 seats: 51 + 48.
   - Rejected: 42 + 48.
   - In Recommended: 4 kiosks, 8 plinths, 7 Galleria devices, 2 VR seats, 11 plant pods.
5. **Runtime:** no console errors or warnings. `npm run build` passes and `dist/` runs offline.
6. **Performance:** the Section 15 pass marks, reported as numbers.
7. **Data integrity:** `data/geometry.json` parses and deep-equals the JSON block in Section 24 of `MASTER_PROMPT.md`.

## 20. Build order, commits and checkpoints

| Phase | Work | Must pass before moving on |
|---|---|---|
| **0 · Bootstrap** | Repo, tooling, scripts, `docs/PLAN.md`, `window.__studio` stub, debug overlays, `data/geometry.json` check. | `verify` runs (with empty scenes). |
| **1 · Blockout** | Walkthrough-scale architecture from the geometry: shell, glass, pillars, doors, rooms, lift core #1, Lift Lobby 02, corridor, all desks for the four layouts as simple blocks; collision, navgrid, walk controls; `?debug=plan` underlay. | Plan-check shots align with the underlay. Collision and reachability tests pass. **CHECKPOINT 1:** show plan-check shots, three walkthrough blockout shots and the test results. |
| **2 · Look and performance foundation** | Material library, colour management, sun and interior lights, shadow policy, postfx, quality tiers, instancing. Performance baseline recorded. | Walkthrough shots read as photoreal. Perf meets Section 15 at stops 6, 14 and 19. |
| **3 · Layouts, zones, components** | Sections 5, 7 and 8 in full, including every interaction, plus the Today and Rejected furniture. | All counts tests pass. Interaction e2e tests pass. Shots of every zone pass review. **CHECKPOINT 2:** show all zone shots for each layout. |
| **4 · Door labels, plants, sound** | Sections 9, 10 and 16. | Clearance tests pass. Audio unlock, mute and duck verified (log events in debug). |
| **5 · Presentation mode and the dive** | Section 4 (room, table, model, look, framing, UI, labels solver, zone cards) and Section 6. | Presentation shots per layout pass review. The dive runs smoothly with no hitch over 50 ms. |
| **6 · Tour, minimap, dock, toasts** | Sections 13 and 14. | The tour e2e runs end to end with no collisions. |
| **7 · Polish** | Exterior city, path-traced stills (Ultra), optional lightmap bake, README, ATTRIBUTION, DECISIONS, final `verify`. | Everything green. **CHECKPOINT 3:** the final report (Section 21). |

Commit at the end of every phase. If you discover a defect from an earlier phase, fix it there first, re-run `verify`, then continue.

## 21. Deliverables

- **Repository:** the layout in Section 22A, committed per phase, with a clean `git log`.
- **Documents:**
  - `README.md`: run, build, configure, swap content, optional tools used, and how to run `npm run perf` on the owner's Mac.
  - `ATTRIBUTION.md`.
  - `DECISIONS.md` (every assumption and conflict).
  - `docs/PLAN.md`, `docs/ARCHITECTURE.md`.
  - `qa/phase-N/REVIEW.md` for every phase.
- **Screenshots at 1920 × 1080:**
  - all 4 layouts in presentation mode;
  - Labels set to Zones + Doors;
  - mid-dive;
  - lift doors opening;
  - corridor;
  - entry with PRISM;
  - Trail;
  - Garage reveal;
  - Window Pause;
  - Make Studio;
  - Memory Corner.
- **Verification report:** the final `npm run verify` output, the test results and `qa/latest/perf.json`, summarised in a table against Section 15. If WebGL rendering or audio playback cannot be verified in your environment, say so plainly. Do not claim visual checks you could not do.

## 22. Final reminders

- **Follow the numbers.** Section 24 wins over intuition.
- **Restraint is the design.** If a detail does not make the space calmer, clearer or more real, leave it out.
- **Keep the paths clear.** The spine and the fire lane stay empty, and the east view stays open.
- **No people, no hands, no client logos.** No neon or gaming effects.
- **Done means verified.** Run it, screenshot it, look at it, measure it. Then say it is done.

## 22A. Code architecture and repository layout

**Stack defaults:** TypeScript strict (no `any`), ESLint + Prettier, Vite, React 19, R3F, drei, zustand. Fonts come from `@fontsource/inter` (OFL), bundled so the app works offline.

```
src/
  main.tsx, App.tsx               mode switch: presentation | transition | walkthrough
  config.ts                       Section 18
  data/geometry.ts                typed loader + helpers for data/geometry.json (toWorld, polygons, desks by layout)
  data/manifest.ts                typed loader for public/media/manifest.json with placeholder fallback
  core/renderer.ts                colour management, tone mapping, shadow policy, DPR policy
  core/quality.ts                 tiers, PerformanceMonitor wiring, AdaptiveDpr
  core/postfx.tsx                 one composer: N8AO, SMAA, (Ultra) bloom
  core/materials.ts               shared PBR material library (one instance per material, never per mesh)
  core/instancing.ts              helpers for InstancedMesh with per-instance colour and transform
  state/store.ts                  zustand: mode, layout, quality, audio, tour, inspect target (transient updates for per-frame data)
  scenes/presentation/            Room, Table, ModelRoot (scale group), LabelsOverlay anchors, PathTracerStill
  scenes/transition/              DiveDirector (scale about PL07, camera path, fades)
  scenes/walkthrough/             WalkthroughRoot, Sky, City, SunRig, InteriorLights
  architecture/                   Walls (from segments), Windows + mullions, Pillars, Glass (clear/frosted), Ceiling, Floors, Doors (sliding/swing, animated), Approach (lift core, lobby, corridor)
  furniture/                      Desk, TaskChair, Monitor, Laptop, FlexiArm, LabRack, Kiosk, LandingDisplay, Plinth+Vitrine, MuseumDevices, CrescentSofa, Rug, SlatCloud, CollabBoard, Foosball, LoungeChair, SideTable, Headset, GalleriaRail+Devices, Tripod, CardStand, Planter (ficus/olive/low/succulent), Signage plate, Poster frame
  zones/                          Trail, Garage, WindowPause, MakeStudio, MemoryCorner, ProjectODC, MeetingRooms, TodayFurniture, RejectedFurniture
  layouts/                        LayoutGroups (four prebuilt groups, visibility toggles, rise/fade animation)
  systems/
    collision2d.ts                plan-space circle vs segments/polygons, wall sliding
    navgrid.ts                    0.5 ft occupancy grid per layout + A*
    hotspots.ts                   registry, proximity, rings, inspect poses
    zones.ts                      zone polygons per layout, point-in-polygon with hysteresis, toasts
    tour.ts                       stop list, waypoint paths, director (walk, dwell, actions)
    interactions/                 watchGate, kiosk, galleria, headset, board, foosball (engine + AI), selfie, readNote
  audio/                          engine (buses, unlock, ducking, persistence), synth recipes (each sound as a function), zone beds
  ui/                             TopBar, LayoutSwitcher, SummaryChip, Dock (both modes), LabelsOverlay (two-column solver), ZoneCard, InspectCard, SettingsSheet, Minimap, Toasts, Loading
  debug/                          ?debug=1 overlay (r3f-perf/stats-gl, renderer.info), ?debug=plan (ortho plan camera + image underlay)
public/media/ (manifest + placeholders), public/audio/, public/hdri/, public/textures/, public/models/
tools/        fetch-assets.mjs (Poly Haven API, CC0), optimize-assets.mjs (gltf-transform, KTX2 or WebP fallback), bake_lightmaps.py (optional, Blender)
tests/        unit (vitest): geometry, counts, collision, navgrid reachability, plant and fire-lane clearance, manifest schema
              e2e (playwright): shots.spec.ts, perf.spec.ts, interactions.spec.ts
qa/           phase-N/ screenshots, perf.json per run
docs/         PLAN.md, ARCHITECTURE.md
```

**Coding rules:**
- No allocations inside `useFrame`: reuse vectors and quaternions.
- No React setState per frame.
- Dispose geometries, materials and textures when a group is truly removed. Layout switches only toggle visibility.
- Every repeated object is instanced.
- Materials come only from `core/materials.ts`.
- Coordinates are always produced by `toWorld()` from plan feet. No magic numbers in components: read `data/geometry.json` or name the constant with its plan meaning.

**package.json scripts:**

| Script | What it does |
|---|---|
| `dev` | Vite dev server |
| `build` | Production build |
| `preview` | Serve `dist/` |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint |
| `test` | Vitest unit tests |
| `e2e` | Playwright |
| `shots` | Playwright screenshots into `qa/latest/` |
| `perf` | Playwright performance sample into `qa/latest/perf.json` |
| `assets:fetch` | Download CC0 assets |
| `assets:optimize` | Compress models and textures |
| `verify` | typecheck + lint + test + build + shots + perf, failing on any error |

## 22B. QA tooling and the verification loop

1. **Expose state for tests.** In dev and with `?debug=1`, put `window.__studio` on the page:
   - `setLayout(id)`, `setMode(mode)`, `goToStop(n)`, `setCamera(pose)`, `getCounts()`, `getRendererInfo()`, `getFps()`, `settle()`.
   - `settle()` resolves when assets are loaded, shadows are updated and the path tracer is idle.
   - Playwright drives the app only through this API, so shots are deterministic.
2. **Screenshot set (`npm run shots`, 1920 × 1080, deviceScaleFactor 1):**
   - Presentation: one shot per layout (today, recommended, keep9, rejected), then recommended with Labels set to Zones + Doors.
   - Transition: the mid-dive frame (t = 3.3 s, paused).
   - Walkthrough: tour stops 1, 3, 6, 7, 8, 14, 15, 16, 17, 19, 21, 22.
   - Plan check: `?debug=plan`, an orthographic top camera aligned to plan feet, with `reference/01_Floor_Plan_Group_402.jpg` as a 50% underlay at the Section 0 calibration. One shot per layout.
3. **Read every screenshot yourself.** For each one, write a short critique in `qa/phase-N/REVIEW.md`:
   - What matches the spec.
   - What is off (geometry, materials, light, clutter, labels).
   - What you fixed.

   In plan-check shots, the walls, glass lines, pillars, doors and both 6-pax rooms must sit on the underlay drawing to within a few pixels. If they do not, fix the geometry pipeline, never the data.
4. **Performance (`npm run perf`).**
   - Run with Playwright using the system Chrome (`channel: 'chrome'`) with the GPU enabled.
   - Sample 10 s each: presentation idle, presentation orbit (a scripted camera path), and walkthrough at stops 6, 14 and 19.
   - Record fps (mean, p5), frame time p95, `renderer.info` (draw calls, triangles, textures, geometries) and JS long tasks.
   - Write the results to `qa/latest/perf.json` and compare them with Section 15.
   - If the environment is headless or has no GPU, label the numbers "not representative" and give the owner the one-line command to run the same script on their Mac.
5. **Interaction tests (`npm run e2e`):**
   - The watch gate opens the door.
   - A kiosk opens and closes.
   - A Galleria device can be picked up and put back.
   - The headset goes on and comes off.
   - The board session starts and ends.
   - Foosball scores a goal against a scripted ball.
   - The selfie produces an image.
   - The Read Note opens.
   - Layout switches update the counts.
   - The tour runs from stop 1 to 22 without collisions.
6. **A phase passes only when** `npm run verify` is green, every screenshot review has no open "off" items for that phase, and the performance numbers meet Section 15 (or are explicitly marked "not representative", with the owner's command provided).

## 23. How to read Section 24 (`data/geometry.json`)

- Units are feet. Origin (0,0) is the ADC-05 south-west interior corner. +x is east, +y is north.
- Convert to three.js with `world = (x*0.3048, h*0.3048, -y*0.3048)`.
- Desk arrays are `[x, y, width, depth, chairSide]` with (x, y) the desk's south-west corner. Back-to-back pairs share a centre line.
- Arrays with the suffix `_REMOVED` are used only by the Today and Keep 9 seats layouts.
- `layouts` defines what changes per layout. Everything not mentioned stays as Recommended.

## 24. Source-of-truth geometry

```json
{
  "_units": "Feet. Plan coordinates. Origin (0,0) = ADC-05 south-west interior corner (= Excel Layout cell CG62 corner). +x = east, +y = north. Convert with world = (x*0.3048, height_m, -y*0.3048) so north is -Z in three.js.",
  "adc05": {
    "envelopeInterior": [
      [0,0], [15,0], [15,4], [20,4], [20,0], [57,0], [57,4], [62,4], [62,0], [77,0], [77,51], [71,51],
      [71,55], [69,55], [69,60], [35,60], [35,58], [0,58]
    ],
    "envelopeNote": "The 15-20 notch is the recessed ACD entry (door plane at y=4). The 57-62 notch is the recessed fire door (door plane at y=4). West side between y=17 and y=54 continues into ADC-04 (project team) and is closed off by frosted glass in this build.",
    "ceilingHeightFt": 9.5,
    "solidWalls": [
      [[0,17], [0,0], [15,0], [15,4], [20,4], [20,0], [57,0], [57,4], [62,4], [62,0], [77,0], [77,4]],
      [[77,9], [77,12]],
      [[77,25], [77,28]],
      [[77,43], [77,47]],
      [[77,51], [71,51], [71,55], [69,55], [69,60], [61,60]],
      [[45,60], [41,60]],
      [[37,60], [35,60], [35,58]],
      [[0,54], [0,58]]
    ],
    "windows": {
      "sillFt": 1.0,
      "headFt": 9.0,
      "mullionEveryFt": 5,
      "segments": [
        [[77,4], [77,9]],
        [[77,12], [77,25]],
        [[77,28], [77,43]],
        [[77,47], [77,51]],
        [[45,60], [61,60]],
        [[37,60], [41,60]],
        [[0,58], [35,58]]
      ],
      "note": "East windows (x=77) face the road, metro line and towers: this is the hero view. North windows on y=60 and y=58."
    },
    "pillars": [
      {"id": "P1", "x0": -2, "y0": 17, "x1": 2, "y1": 21},
      {
        "id": "P2",
        "x0": 33,
        "y0": 17,
        "x1": 37,
        "y1": 21,
        "role": "Five Point Anyone levels L1-L5, floor to ceiling"
      },
      {"id": "P3", "x0": 67, "y0": 17, "x1": 71, "y1": 21},
      {"id": "P4", "x0": -2, "y0": 50, "x1": 2, "y1": 54},
      {"id": "P5", "x0": 33, "y0": 50, "x1": 37, "y1": 54},
      {"id": "P6", "x0": 67, "y0": 51, "x1": 71, "y1": 55}
    ],
    "glassPartitions": [
      {
        "id": "frostedEntryGlass",
        "a": [3, 17],
        "b": [33, 17],
        "type": "frosted",
        "fullHeight": true,
        "note": "Faces the entry. Carries the PRISM graphic x 9-31. Glass team door x 4-7.5 (locked, project team only)."
      },
      {
        "id": "projectGarageGlass",
        "a": [33, 21],
        "b": [33, 50],
        "type": "CONFIG x33GlassType (default frosted to 7 ft, clear above)",
        "fullHeight": true,
        "note": "Runs exactly between back-to-back desks."
      },
      {"id": "projectNorthGlass", "a": [35, 54], "b": [35, 58], "type": "frosted", "fullHeight": true},
      {
        "id": "makeStudioGlassSouth",
        "a": [58, 21],
        "b": [58, 33],
        "type": "clear",
        "fullHeight": true,
        "note": "Wall of Voices quotes as white vinyl lettering between 5 and 7 ft."
      },
      {
        "id": "makeStudioGlassNorth",
        "a": [58, 38],
        "b": [58, 51],
        "type": "clear",
        "fullHeight": true,
        "note": "Opening y 33-38 aligns with the central aisle."
      }
    ],
    "futureProvisionLine": {
      "a": [3, 21],
      "b": [3, 50],
      "builtByDefault": false,
      "note": "Red-line growth position. CONFIG futureProvisionBuilt. When false, close the project ODC's west side with frosted glass anyway so visitors cannot enter."
    },
    "meetingRooms": [
      {
        "id": "room6paxWest",
        "x0": 0,
        "y0": 0,
        "x1": 15,
        "y1": 12,
        "door": {"wall": "north", "x0": 11.5, "x1": 14.5},
        "front": "glass with frosted band 3-6 ft"
      },
      {
        "id": "room6paxEast",
        "x0": 62,
        "y0": 0,
        "x1": 77,
        "y1": 12,
        "door": {"wall": "north", "x0": 62.3, "x1": 66.0},
        "front": "north face solid (App Galleria x 66.5-76.5 is mounted on it, door at x 62.3-66.0), west face glass with frosted band"
      }
    ],
    "entryRecess": {"x0": 15, "x1": 20, "y0": 0, "y1": 4, "doorPlaneY": 4, "badgeReader": {"x": 19.6, "y": 4.3, "heightFt": 3.6}},
    "fireDoorRecess": {"x0": 57, "x1": 62, "y0": 0, "y1": 4, "doorPlaneY": 4},
    "fireLane": {"x0": 57, "x1": 62, "y0": 0, "y1": 17, "rule": "Nothing may be placed here."},
    "spine": {
      "x0": 15,
      "x1": 77,
      "y0": 12,
      "y1": 17,
      "rule": "Keep clear end to end. Sightline from the entry recess to the east window must be unobstructed above 3 ft."
    },
    "desks": {
      "projectODC": [
        [3,17,2,4,"E"], [3,21,2,4,"E"], [3,25,2,4,"E"], [3,29,2,4,"E"], [3,38,2,4,"E"], [3,42,2,4,"E"],
        [3,46,2,4,"E"], [3,50,2,4,"E"], [11,17,2,4,"W"], [11,21,2,4,"W"], [11,25,2,4,"W"], [11,29,2,4,"W"],
        [11,38,2,4,"W"], [11,42,2,4,"W"], [11,46,2,4,"W"], [11,50,2,4,"W"], [13,17,2,4,"E"], [13,21,2,4,"E"],
        [13,25,2,4,"E"], [13,29,2,4,"E"], [13,38,2,4,"E"], [13,42,2,4,"E"], [13,46,2,4,"E"], [13,50,2,4,"E"],
        [21,17,2,4,"W"], [21,21,2,4,"W"], [21,25,2,4,"W"], [21,29,2,4,"W"], [21,38,2,4,"W"], [21,42,2,4,"W"],
        [21,46,2,4,"W"], [21,50,2,4,"W"], [23,17,2,4,"E"], [23,21,2,4,"E"], [23,25,2,4,"E"], [23,29,2,4,"E"],
        [23,38,2,4,"E"], [23,42,2,4,"E"], [23,46,2,4,"E"], [23,50,2,4,"E"], [31,17,2,4,"E"], [31,21,2,4,"W"],
        [31,25,2,4,"W"], [31,29,2,4,"W"], [31,38,2,4,"W"], [31,42,2,4,"W"], [31,46,2,4,"W"], [31,50,2,4,"E"]
      ],
      "garage": [
        [33,21,2,4,"E"], [33,25,2,4,"E"], [33,29,2,4,"E"], [33,38,2,4,"E"], [33,42,2,4,"E"], [33,46,2,4,"E"],
        [41,17,2,4,"W"], [41,21,2,4,"W"], [41,25,2,4,"W"], [41,29,2,4,"W"], [41,38,2,4,"W"], [41,42,2,4,"W"],
        [41,46,2,4,"W"], [41,50,2,4,"W"], [41,54,2,4,"W"], [43,17,2,4,"E"], [43,21,2,4,"E"], [43,25,2,4,"E"],
        [43,29,2,4,"E"], [43,38,2,4,"E"], [43,42,2,4,"E"], [43,46,2,4,"E"], [43,50,2,4,"E"], [43,54,2,4,"E"],
        [51,17,2,4,"W"], [51,21,2,4,"W"], [51,25,2,4,"W"], [51,29,2,4,"W"], [51,38,2,4,"W"], [51,42,2,4,"W"],
        [51,46,2,4,"W"], [51,50,2,4,"W"], [51,54,2,4,"W"], [53,17,2,4,"E"], [53,21,2,4,"E"], [53,25,2,4,"E"],
        [53,29,2,4,"E"], [53,38,2,4,"E"], [53,42,2,4,"E"], [53,46,2,4,"E"], [53,50,2,4,"E"], [53,54,2,4,"E"]
      ],
      "optionalNine_REMOVED": [
        [61,17,2,4], [61,21,2,4], [61,25,2,4], [61,29,2,4], [61,38,2,4], [61,42,2,4], [61,46,2,4],
        [61,50,2,4], [61,54,2,4]
      ],
      "strip_REMOVED": [
        [67,21,4,2], [67,29,4,2], [67,31,4,2], [67,39,4,2], [67,41,4,2], [67,49,4,2], [71,17,2,4],
        [71,21,4,2], [71,29,4,2], [71,31,4,2], [71,39,4,2], [71,41,4,2], [71,49,4,2]
      ]
    },
    "deskSpec": {
      "vertical": "2 ft wide x 4 ft deep (x by y), back-to-back pairs, chair on the side given (W/E)",
      "horizontal": "4 x 2 ft (strip, removed)"
    },
    "zones": [
      {"id": "trail", "name": "The Trail", "polygon": [[20,0], [57,0], [57,12], [20,12]]},
      {
        "id": "garage",
        "name": "The Garage",
        "polygon": [[33,17], [58,17], [58,58], [37,58], [37,54], [35,54], [35,58], [33,58]]
      },
      {
        "id": "windowPause",
        "name": "Window Pause",
        "polygon": [[62,12], [77,12], [77,21], [71,21], [71,17], [67,17], [67,21], [62,21]]
      },
      {"id": "makeStudio", "name": "Make Studio", "polygon": [[58,21], [77,21], [77,51], [58,51]]},
      {
        "id": "memoryCorner",
        "name": "Memory Corner",
        "polygon": [[58,51], [67,51], [67,55], [69,55], [69,60], [58,60]]
      },
      {
        "id": "projectODC",
        "name": "Project ODC (secure, not enterable)",
        "polygon": [[3,17], [33,17], [33,58], [3,58]]
      }
    ],
    "fixtures": {
      "landingDisplay": {
        "wall": "south y=0",
        "x0": 21.5,
        "x1": 32.5,
        "bottomFt": 2.5,
        "aspect": "16:9",
        "type": "fine-pitch LED, set in an oak slat panel x 20.5-33.5"
      },
      "orchardJourneyWall": {
        "wall": "south y=0",
        "x0": 34,
        "x1": 56,
        "bandBottomFt": 4.0,
        "bandTopFt": 6.5,
        "type": "printed timeline on a thin backlit oak-edged panel, reads west to east"
      },
      "kiosks": [
        {"id": "K1", "x": 36.25, "y": 7.5},
        {"id": "K2", "x": 41.75, "y": 4.5},
        {"id": "K3", "x": 47.25, "y": 7.5},
        {"id": "K4", "x": 52.75, "y": 4.5}
      ],
      "kioskSpec": {
        "footprintFt": [1.5, 3.0],
        "screen": "65 inch portrait touch display",
        "facing": "west (screen normal = -x)",
        "heightFt": 6.2,
        "content": "K1 Tata, K2 TCS, K3 TCS and Orchard West Coast, K4 Pollinator; swappable via manifest"
      },
      "prismGraphic": {"on": "frostedEntryGlass", "x0": 9, "x1": 31, "bottomFt": 1.5, "topFt": 8.0, "face": "south"},
      "teamDoor": {"on": "frostedEntryGlass", "x0": 4, "x1": 7.5, "type": "frameless glass swing door, locked"},
      "fivePointPillar": {"pillar": "P2", "levels": 5, "note": "five horizontal bands, L1 at floor to L5 at ceiling, all four faces"},
      "appGalleria": {
        "wall": "north face of room6paxEast, y=12",
        "x0": 66.5,
        "x1": 76.5,
        "devices": 7,
        "mix": "5 phones, 2 tablets",
        "railHeightFt": 3.8,
        "note": "OVERRIDE of earlier x 63-76: the room door occupies x 62.3-66.0"
      },
      "vrSeats": [{"x": 74.6, "y": 14.6}, {"x": 74.6, "y": 18.6}],
      "vrSeatSpec": "swivel lounge chairs, 2.5 ft diameter, facing east to the glass; small round side table with a spatial headset on a stand",
      "museumPlinths": {
        "x0": 58.4,
        "x1": 60.0,
        "sizeFt": 1.6,
        "heightFt": 3.5,
        "ys": [22.4, 25.0, 27.6, 30.2, 39.4, 42.0, 44.6, 47.2],
        "newestIndex": 7,
        "type": "white plinth, low-iron glass vitrine top, oak base reveal"
      },
      "crescentSofa": {
        "center": [69, 31],
        "outerR": 6.0,
        "innerR": 3.6,
        "startDeg": 198,
        "endDeg": 342,
        "seats": "6 to 8",
        "opening": "north toward the board",
        "seatHeightFt": 1.5,
        "backHeightFt": 2.6
      },
      "crescentRug": {"center": [69, 31], "diameterFt": 16, "type": "round wool, warm grey"},
      "collabBoard": {
        "x0": 65.5,
        "x1": 72.5,
        "y0": 40.2,
        "y1": 41.2,
        "facing": "south",
        "screen": "86 to 98 inch on a castor stand",
        "demoPositionY": 36.0,
        "note": "Perpendicular to the windows. Rolls to y=36 for demos."
      },
      "foosball": {
        "x0": 70.75,
        "x1": 73.25,
        "y0": 44.5,
        "y1": 49.5,
        "longAxis": "north-south",
        "players": "stand east and west"
      },
      "slatCeilingCloud": {
        "x0": 61,
        "x1": 77,
        "y0": 23,
        "y1": 43,
        "dropFt": 1.0,
        "type": "white oak slats 2 in wide, 1 in gaps, acoustic felt behind"
      },
      "memoriesWall": {
        "wall": "north y=60",
        "x0": 61,
        "x1": 69,
        "bottomFt": 2.5,
        "topFt": 8.5,
        "type": "photo mosaic in thin oak frames"
      },
      "readNoteStand": {"x": 59.2, "y": 52.0, "type": "small oak card stand: A note to take with you"},
      "plants": [
        {"x": -58.5, "y": -9.0, "type": "tall planter (ficus)", "zone": "Lift Lobby 02"},
        {"x": -44.5, "y": -9.0, "type": "tall planter (ficus)", "zone": "Lift Lobby 02"},
        {"x": 21.2, "y": 10.8, "type": "olive tree, low planter", "zone": "Trail entrance"},
        {"x": 39.0, "y": 9.8, "type": "low pod 1.5 ft", "zone": "Trail"},
        {"x": 50.0, "y": 9.8, "type": "low pod 1.5 ft", "zone": "Trail"},
        {"x": 76.0, "y": 22.2, "type": "low pod 1.5 ft", "zone": "Window Pause corner"},
        {"x": 59.2, "y": 50.2, "type": "low pod 1.5 ft", "zone": "Make Studio, museum line north end"},
        {"x": 76.2, "y": 50.3, "type": "mid planter r 0.6 ft", "zone": "Make Studio north-east"},
        {"x": 59.5, "y": 58.8, "type": "tall ficus", "zone": "Memory Corner"},
        {"x": 1.2, "y": 10.8, "type": "small corner pod", "zone": "west 6-pax room"},
        {"x": 75.8, "y": 1.2, "type": "small corner pod", "zone": "east 6-pax room"}
      ],
      "selfieDisc": {"x": 65.0, "y": 58.0, "diameterFt": 2.0, "engraving": "Stand here"},
      "selfieTripod": {"x": 65.0, "y": 53.5, "facing": "north", "device": "tablet on a slim tripod at 5 ft"},
      "foosballScoreboard": {"wall": "y=51 (solid, x 71-77)", "x0": 72, "x1": 74, "centreHeightFt": 6.0},
      "kioskRug": {"x0": 34, "x1": 56, "y0": 2, "y1": 11, "type": "wool, warm light grey"},
      "tabletopPlants": "small succulents on every second back-to-back desk pair (Garage and Project ODC)"
    }
  },
  "approach": {
    "_source": "Measured from 01_Floor_Plan_Group_402.jpg (8000 x 5556 px) at 45.26 px per ft, ADC-05 origin at pixel (4299, 2889). Accuracy about 1 ft. Overlay the image to confirm.",
    "corridor2000": {"y0": -6.56, "y1": 0.0, "x0": -78, "x1": 30, "clearWidthMm": 2000, "ceilingHeightFt": 9.0},
    "liftCore1": {
      "label": "#1",
      "x0": -77.3,
      "x1": -60.4,
      "y0": -51.5,
      "y1": -16.2,
      "cars": [
        {"id": "PL02", "column": "west", "y0": -28.8, "y1": -21.2},
        {"id": "PL07", "column": "east", "y0": -28.8, "y1": -21.2, "arrival": true},
        {"id": "car-mid-west", "column": "west", "y0": -37.7, "y1": -29.6},
        {"id": "car-mid-east", "column": "east", "y0": -37.7, "y1": -29.6},
        {"id": "PL06", "column": "west", "y0": -46.9, "y1": -38.8},
        {"id": "PL11", "column": "east", "y0": -46.9, "y1": -38.8}
      ],
      "eastColumnX": [-68.8, -61.5],
      "westColumnX": [-76.2, -68.8],
      "note": "East-column cars open east into Lift Lobby 02. Shafts at the north and south ends."
    },
    "liftLobby02": {
      "x0": -60.4,
      "x1": -42.7,
      "y0": -51.5,
      "y1": -6.56,
      "note": "Opens north into the 2000 mm corridor. Second lift core (PL16) forms its east side."
    },
    "liftCore2": {"x0": -42.7, "x1": -34.2, "y0": -46.0, "y1": -16.5},
    "collabLoungeNorthOfCore1": {
      "x0": -77.3,
      "x1": -60.4,
      "y0": -16.2,
      "y1": -6.56,
      "type": "curved-front lounge: 4 armchairs, 2 round tables, low bench"
    },
    "collabLoungeSouthOfCorridor": {"x0": -42.7, "x1": -28.8, "y0": -16.0, "y1": -6.56},
    "southBlock": [
      {"id": "itStore", "x0": -28.8, "x1": -10.0, "door": [-13.5, -10.4]},
      {"id": "adminStore", "x0": -10.0, "x1": 5.0, "door": [1.5, 4.6]},
      {"id": "lvRoom", "x0": 5.0, "x1": 12.7, "door": [9.6, 12.3]}
    ],
    "southBlockNote": "These rooms form the corridor's south wall at y=-6.56 (solid). Doors are flush grey panels.",
    "northSideRooms": [
      {"id": "adc04FireDoor", "x0": -43.8, "x1": -38.8},
      {"id": "adc04Collab", "x0": -38.8, "x1": -29.2},
      {"id": "adc04Room6pax", "x0": -29.2, "x1": -14.2},
      {"id": "adc04GlCubicle", "x0": -13.8, "x1": -5.0},
      {"id": "adc04Acd", "x0": -4.6, "x1": -0.4},
      {"id": "adc05Room6paxWest", "x0": 0, "x1": 15},
      {"id": "adc05EntryRecess", "x0": 15, "x1": 20}
    ],
    "posterBays": [
      {"id": "bayA", "wall": "south y=-6.56", "x0": -27.0, "x1": -15.0, "content": "3 framed TCS posters"},
      {
        "id": "bayB",
        "wall": "south y=-6.56",
        "x0": -9.0,
        "x1": 0.5,
        "content": "55 inch screen: TCS, with you for the long run (center) + 1 poster"
      },
      {
        "id": "bayC",
        "wall": "south y=-6.56",
        "x0": 5.0,
        "x1": 9.0,
        "content": "1 framed poster + Orchard Studio wayfinding arrow"
      }
    ],
    "visitorPath": [[-66,-25], [-58,-25], [-51.5,-25], [-51.5,-3.3], [17.5,-3.3], [17.5,2.0], [17.5,8.0]],
    "fifteenPaxRoom": {
      "x0": -56.5,
      "x1": -38.4,
      "y0": 18.5,
      "y1": 44.0,
      "note": "In ADC-04. Replaces the Capsule for formal sessions. Model it as context in the table model; not walkable."
    }
  },
  "doorLabels": [
    {
      "door": "lift cars (core #1)",
      "text": "PL02 / PL07 / PL06 / PL11 / middle pair + Level 09",
      "where": "above each car door"
    },
    {"door": "Lift Lobby 02", "text": "Lift Lobby 02 + Orchard Studio ↑", "where": "wall opposite PL07"},
    {"door": "IT Store", "text": "IT Store · Staff only", "at": [-11.95, -6.56]},
    {"door": "Admin Store", "text": "Admin Store · Staff only", "at": [3.05, -6.56]},
    {"door": "LV Room", "text": "LV Room · Staff only", "at": [10.95, -6.56]},
    {"door": "ADC-04 ACD", "text": "ADC-04 · Restricted", "at": [-2.5, 0]},
    {"door": "ADC-04 fire door", "text": "Fire Exit", "at": [-41.3, 0]},
    {"door": "ADC-05 entry", "text": "Orchard Studio · ADC-05 / Tap watch to enter", "at": [17.5, 4]},
    {"door": "west 6-pax room", "text": "CONFIG.roomNames[0] (default: Discussion Room A · 6)", "at": [13.0, 12]},
    {"door": "east 6-pax room", "text": "CONFIG.roomNames[1] (default: Discussion Room B · 6)", "at": [64.15, 12]},
    {"door": "team door", "text": "Project ODC · Team only", "at": [5.75, 17]},
    {"door": "ADC-05 fire door", "text": "Fire Exit (green pictogram)", "at": [59.5, 4]},
    {"door": "Make Studio opening", "text": "Make Studio (vinyl on glass)", "at": [58, 35.5]},
    {
      "door": "zone markers",
      "text": "Window Pause / Memory Corner (small wall markers)",
      "at": [[62.5,13.5], [61,59.6]]
    },
    {"door": "15-pax room (model only)", "text": "15-pax Meeting Room", "where": "ADC-04"}
  ],
  "layouts": {
    "today": {
      "desks": "all: projectODC + garage + optionalNine_REMOVED + strip_REMOVED (112)",
      "glass": "none of the new partitions; future-provision line dashed red at x=3",
      "furniture": [
        {
          "id": "glCubicleArun",
          "x0": 21,
          "x1": 28,
          "y0": 1,
          "y1": 11,
          "spec": "4.5 ft glass partitions, L-desk, 2 visitor chairs"
        },
        {"id": "centreCollabSofa", "x": 38, "y": 2.5, "spec": "3-seat sofa against the south wall"},
        {"id": "centreCollabCoffeeTable", "x": 38, "y": 6.0},
        {"id": "centreCollabRoundTable", "x": 43.5, "y": 8.5, "spec": "round table with 4 chairs"},
        {"id": "glCubiclePrasanna", "x0": 49, "x1": 56, "y0": 1, "y1": 11, "spec": "same as Arun's"}
      ],
      "studioFixtures": "none",
      "summary": "112 desks · 2 GL cubicles · no studio"
    },
    "recommended": {
      "desks": "projectODC (48) + garage (42)",
      "fixtures": "adc05.fixtures",
      "zones": "adc05.zones",
      "summary": "Garage 42 desks · Make Studio 19 × 30 ft · play area about 1,225 sq ft",
      "default": true
    },
    "keep9": {
      "desks": "projectODC (48) + garage (42) + optionalNine_REMOVED restored (9, chairs W) = 51 in the Garage",
      "makeStudioGlass": [[[63.7,21], [63.7,33]], [[63.7,38], [63.7,51]]],
      "zones": [
        {"id": "trail", "polygon": [[20,0], [57,0], [57,12], [20,12]]},
        {
          "id": "windowPause",
          "polygon": [[62,12], [77,12], [77,21], [71,21], [71,17], [67,17], [67,21], [64,21], [64,17], [62,17]]
        },
        {"id": "makeStrip", "name": "Make Strip", "polygon": [[64,21], [77,21], [77,51], [64,51]]},
        {"id": "memoryCorner", "polygon": [[64,55], [69,55], [69,60], [64,60]]},
        {"id": "garage", "polygon": [[33,17], [64,17], [64,58], [37,58], [37,54], [35,54], [35,58], [33,58]]}
      ],
      "fixtureChanges": {
        "crescentSofa": "REPLACED by two facing curved benches centred (70.5,30): outerR 4.2, innerR 2.6, spans 125-235 deg and -55-55 deg",
        "collabBoard": {"x0": 67.5, "x1": 73.5, "y0": 36.4, "y1": 37.4, "facing": "south"},
        "foosball": {"x0": 69.25, "x1": 71.75, "y0": 42.5, "y1": 47.5},
        "museumPlinths": {"x0": 64.4, "x1": 66.0, "ys": [22.4, 25.0, 27.6]},
        "selfieDisc": {"x": 66.5, "y": 58.6},
        "selfieTripod": {"x": 66.5, "y": 55.6},
        "readNoteStand": {"x": 64.8, "y": 56.0},
        "slatCeilingCloud": {"x0": 64, "x1": 77, "y0": 23, "y1": 40},
        "others": "Trail, Window Pause, Garage, landing display, kiosks unchanged"
      },
      "summary": "Garage 51 desks · Make strip 13 ft wide · play area about 970 sq ft"
    },
    "rejected": {
      "desks": "projectODC (48) + garage (42)",
      "glass": "same project split as recommended; NO Make Studio glass at x=58",
      "zones": [
        {"id": "makeAtDoor", "name": "Make + Feel at the door", "polygon": [[20,0], [57,0], [57,12], [20,12]]},
        {"id": "kioskStrip", "name": "Kiosks along the windows", "polygon": [[58,21], [77,21], [77,51], [58,51]]},
        {"id": "windowPause", "polygon": [[62,12], [77,12], [77,21], [71,21], [71,17], [67,17], [67,21], [62,21]]},
        {"id": "memoryCorner", "polygon": [[58,51], [67,51], [67,55], [69,55], [69,60], [58,60]]},
        {"id": "garage", "polygon": [[33,17], [58,17], [58,58], [37,58], [37,54], [35,54], [35,58], [33,58]]}
      ],
      "fixtures": {
        "crescentSofa": {"center": [47, 8.2], "outerR": 6.0, "innerR": 3.6, "startDeg": 198, "endDeg": 342},
        "collabBoard": {"x0": 43.5, "x1": 50.5, "y0": 10.3, "y1": 11.3, "facing": "south"},
        "museumPlinths": {"alongSouthWall": true, "x0": 22, "x1": 32, "y0": 0.6, "y1": 2.2, "count": 5},
        "foosball": {"x0": 23, "x1": 28, "y0": 6.5, "y1": 9.0},
        "kiosks": [
          {"id": "K1", "x0": 75.0, "x1": 76.5, "y": 24},
          {"id": "K2", "x0": 75.0, "x1": 76.5, "y": 30},
          {"id": "K3", "x0": 75.0, "x1": 76.5, "y": 36},
          {"id": "K4", "x0": 75.0, "x1": 76.5, "y": 42}
        ],
        "kioskFacing": "west (backs to the glass)",
        "landingDisplay": {"wall": "north face of room6paxEast, y=12", "x0": 67, "x1": 76, "widthFt": 9},
        "memoryCorner": "as recommended",
        "noAppGalleria": true
      },
      "rejectionCard": "No daylight for the Make zone · loudest zone at the entry · kiosks backed onto the windows",
      "summary": "Rejected: Make + Feel at the door"
    }
  }
}
```
