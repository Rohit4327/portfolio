# Floor Walkthrough

An interactive first-person reconstruction of the supplied architectural floor
model. Everything is rebuilt in 3D from the reference render — you start in the
lift lobby and walk the floor.

## Run it locally

The project is plain ES modules with a locally vendored Three.js, so it needs a
static server (opening `index.html` from `file://` will not work — module
imports are blocked by CORS).

```bash
# from the repository root
python3 -m http.server 8000
# then open http://localhost:8000/walkthrough/
```

Any static server works: `npx serve .`, `php -S localhost:8000`, VS Code Live
Server. No build step, no bundler, no npm install.

## Controls

**Desktop**

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` or arrow keys | walk / strafe |
| `Shift` | walk faster |
| mouse | click the viewport to capture the pointer, then move to look; drag also works |
| `Esc` | release the pointer |
| `R` | return to the lift lobby |
| `M` | toggle the floor-plan navigator |
| `V` | reference match mode |

**Touch**

Translucent arrows sit in the lower left; drag anywhere on the right half of the
screen to look around. Hold an arrow with one thumb and drag with the other —
diagonals work because more than one arrow can be held at once. `RUN` toggles
the faster walk speed.

**Accessibility** — every control is a real focusable button with a label, and
`prefers-reduced-motion` shortens the cinematic intro to a direct cut into the
lift lobby.

## Reference match mode

Press `V` (or the *Reference* chip). The camera snaps to the viewpoint of the
supplied render and the source image is overlaid with an opacity slider:

- **0%** — the reconstruction alone
- **50%** — comparison
- **100%** — the reference alone

This is how the layout was calibrated and how it should be checked after any
change to `src/plan.js`.

There is an offline version of the same check:

```bash
npm i -D playwright && npx playwright install chromium
node walkthrough/tools/reference-check.mjs
```

(If Playwright cannot download its own browser, point it at one you already
have: `CHROMIUM_PATH=/path/to/chromium node walkthrough/tools/reference-check.mjs`.)

It renders the reference viewpoint headlessly, flood-fills the collision world
from the lift-lobby spawn and reports whether every zone is still reachable.

## How the reconstruction is organised

`src/plan.js` is the single source of truth. Every wall, table, pod and planter
is stored in **reference-image pixels** measured off the supplied render, and
two helpers (`wx`, `wz`) map those into world metres. Nothing else in the
project invents a coordinate.

```
1 reference px = 0.015 m      floor plate = 26.4 m x 13.5 m
top of the image    -> -Z     rear / lift-lobby side
bottom of the image -> +Z     front edge of the floor plate
left of the image   -> -X     People / Prowess side
right of the image  -> +X     meeting rooms / Capsule side
```

The scale comes from cross-checking three things in the source render that have
known real sizes — the lounge sofas, the meeting tables and the four lounge pods
— which all agree on roughly 67 px per metre.

### Scene graph

```
scene
├── architecture
│   ├── mainFloor          floor plate + lift-lobby floor + rear service strip
│   ├── shell              perimeter walls
│   ├── rearWall           clear screen + pale-blue illuminated plane behind it
│   ├── partitions         solid internal walls, with skirtings
│   ├── glazing            glass partitions, head/foot rails and mullions
│   ├── liftLobby          two lift banks, central pier, pale timber wing walls
│   └── ceiling            soffit + recessed light panels
├── zones
│   ├── prowessZone        pod01..pod04, centralTable, floor inlay, chairs
│   ├── peopleZone         curved counter, tiered timber platform, drums, bench
│   ├── westWall           workstations and wall displays on the west elevation
│   ├── pantry             tall cabinetry, worktop, island
│   ├── discussionRoom     table, seating, gradient display
│   ├── utility            top-left service volume
│   ├── centralMeetingRooms
│   ├── rightMeetingRooms  R1 / R2 / R3 plus the magenta feature display
│   ├── rearLounge         four sofas + two round tables
│   ├── frontMedia
│   ├── wallScreens
│   └── vegetation         loose plants + the long front planter run
└── capsule
    ├── glassShell         straight runs + four quarter-round corners
    ├── curvedDisplay      bowed screen, concave toward the room
    ├── sofa               U-shaped seating facing the screen
    ├── tables, plinths, chairs
    └── planters           one in each internal corner
```

### Files

| File | Responsibility |
| --- | --- |
| `src/plan.js` | the measured plan — edit this to move anything |
| `src/geom.js` | rounded boxes, arcs, L-profiles, curved panels |
| `src/materials.js` | the material language and the screen artwork |
| `src/architecture.js` | floor, shell, partitions, glazing, lift lobby, ceiling, tabletop |
| `src/furniture.js` | chairs, tables, sofas, pods, counters, planting |
| `src/capsule.js` | the Capsule, built separately because it is the landmark |
| `src/zones.js` | places every furniture group from the plan |
| `src/collision.js` | the collision world (walkable rects + blockers) |
| `src/controls.js` | first-person controller |
| `src/mobile-controls.js` | on-screen D-pad |
| `src/intro.js` | the model-to-POV cinematic |
| `src/debug-reference.js` | reference match mode |
| `src/minimap.js` | collapsible floor-plan navigator |
| `src/scene.js` | renderer, lighting, reference camera |
| `src/main.js` | wiring |

## Collision

Collision is a separate representation from the render geometry: a list of
walkable rectangles (the floor plate and the lift lobby) and a list of blocking
axis-aligned boxes, bucketed into a uniform grid. The player is a 0.26 m-radius
cylinder resolved one axis at a time so movement slides along walls instead of
sticking.

Walls, glass, tables, cabinetry, sofas, the pods and the planters all block.
Chairs do not — they are light, movable furniture, and blocking them sealed off
every meeting room. Real door openings and circulation gaps stay traversable;
none of them were widened to make walking easier.

## Performance

- one shared material per finish, ~950 meshes, geometry cached and reused
- instanced greenery in the long planter runs
- device pixel ratio capped per quality tier, shadow map sized per tier
- adaptive fallback: sustained low frame rates drop DPR first, then shadows
- `?q=low`, `?q=medium` or `?q=high` on the URL forces a tier for testing

## Third party

`vendor/three.module.min.js` is Three.js r169, vendored so the sandbox runs with
no network access and no install step. MIT licensed, copyright the Three.js
authors — the licence header is preserved at the top of the file.

## Editing the reconstruction

1. Change a position in `src/plan.js` (reference pixels, not metres).
2. Reload and press `V`.
3. Set the overlay to 50% and check the change against the source render.

Because the coordinate map is normalised, moving a room only means editing the
numbers it is built from — no geometry is hand-placed anywhere else.
