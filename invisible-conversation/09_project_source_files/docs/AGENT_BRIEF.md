# Brief for scene builders

You are one of ten specialists building a chapter of "The Invisible Conversation — How UX & UI Came to Life", a 5-minute
cinematic documentary rendered deterministically from a web page. Your output is ONE scene module. Other specialists build
the other chapters in parallel; the orchestrator (`lib/main.js`) assembles them. Follow these documents in this order:

1. `docs/SCENE_GUIDE.md` — contract, rules, visual identity, provenance labels, hand-off bloom, performance budget.
2. `docs/SCENE_SPECS.md` — YOUR scene's storyboard (fact-checked). Use only the facts/labels written there.
3. `scenes/s01_door.js` — the finished reference scene (study how it uses T, beats, cues, props, camera, draw2d, bloom).
4. `lib/stage.js`, `lib/util.js`, `lib/gfx.js`, `lib/props.js` — the API you build with (read them fully; they are short).
5. `lib/timing.json` — the ACTUAL narration timeline (chapter start/end and every sentence's start/end).

Project root: /home/user/portfolio/invisible-conversation/09_project_source_files (run all node commands from here).
Preview stills: `node tools/preview.mjs --times 25.3,27,31.5 --out /tmp/claude-0/-home-user-portfolio/d072d127-20ba-53c6-bdc3-3548a30f6ed6/scratchpad/previews/<your scene id>`
then Read the PNGs. Preview often; the machine has 4 cores shared with other builders, so render ≤ 8 stills per call.
Half-size previews are faster: add `--scale 0.5` (text looks smaller; use full scale for final checks).
If the page fails to load you will see `page init errors` — fix your syntax error first (node can't type-check: run
`node --check scenes/<file>.js` for syntax).

Quality bar: this is going to be watched. Every still you produce should look like a frame from a premium documentary:
intentional composition, one focal point, soft directional light, legible type, nothing floating or clipping, nothing
off-palette. Build real 3D objects from primitives with believable proportions (world units are metres). Draw screens and
UI with care (alignment, spacing, hierarchy). Prefer fewer, better elements.

Deliver a finished module. When done, reply with: (1) the file path, (2) the list of cues you export (name: time),
(3) the preview PNG paths you inspected, (4) measured ms/frame from the preview log, (5) any deviation from the spec and why.
