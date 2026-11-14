# BEAT GUIDE — "UX vs UI — explained" (vertical reel, 1080×1920, 30 fps, 150 s)

You are building ONE beat of a high-production vertical reel in **Remotion** (React) with **React Three Fiber** for 3D and
**HyperFrames** (HTML + GSAP, rendered to transparent ProRes) for typography-heavy overlays. Every frame is a pure function of
time; no wall clock, no Math.random (use `hash`/`noise1` from `src/lib/anim.ts`).

## Read first (in this order)
1. `docs/SCRIPT.md` (beat sheet + narration), `audio/out/narration_timing.json` (actual sentence AND estimated word times).
2. `src/timeline.ts` — `BEATS`, `beat(id)`, `sent('substring')`, `wordAt('sentence substring','word')`, `local(id, tAbs)`.
3. `src/lib/*` — `Stage3D` (canvas + `Rig` lights + `Post`), `CameraRig` (keyframed cinematic camera), `GlowPoint`, `anim.ts`,
   `Type.tsx` (`SlideWords`, `Punch`, `Tag`, `Pill`), `Overlay.tsx` (`Dip`, `Bloom2D`, `AmberDot`), `Captions.tsx` (global; you do not draw captions).
4. `src/beats/Hook.tsx` — the finished reference beat. Match its structure and quality.
5. `node_modules/hyperframes/dist/docs/*.md` if you build a HyperFrames segment (see below).

## Contract
`src/beats/<Name>.tsx` exports: `Beat: React.FC` (rendered inside a Sequence; `useT()` gives LOCAL seconds from the beat's start),
`cues: Record<string, number>` (ABSOLUTE seconds of every sound-worthy event — compute from `beat(id).start + local`), and optionally
`transition = { kind: 'bloom'|'fade'|'slide'|'wipe', frames, cx, cy }` for the transition INTO the next beat (default amber bloom, 14 frames).
Your beat renders `beatFrames(id) + transition frames`; the last ~0.5 s is covered by the outgoing transition, so land your final image by then.
Do not edit anything outside your beat file (+ optional `src/beats/<Name>.parts.tsx`, `hyperframes/<name>/`).

## Look (non-negotiable)
Palette: graphite #0D1016 background, ivory #F6F2E8 type, amber #FFAB5B (the narrative point / human accent), cyan #80C9F8 (digital accent).
Inter / Inter Display only (installed). Premium product-film realism: glass, brushed metal, matte dark surfaces, soft key + cool fill + rim,
shallow lighting pools, bloom on emissives, grain and vignette are global (do not add your own). Camera: cinematic — slow dollies,
orbits, push-ins, rack-like reveals via `CameraRig` keys with `handheld` 0.005–0.02. No shake, no spinning, no random particles.
Vertical framing: hero objects live in the middle 60% of the frame; keep type inside the safe area (x 72–1008, y 220–1660) and
leave y 1380–1560 free for the global captions unless your beat hides them (then say so).
Hyper-real b-roll means macro shots of believable objects (glass phone, keys, cursor, cards) with real materials — not stock clips.
The amber point must appear (3D `GlowPoint` or DOM `AmberDot`) and lead the eye to the next beat's hand-off.

## Performance budget (software GPU, 4 cores shared)
3D: `Stage3D` with Bloom costs ≈0.6 s/frame; keep geometry simple (< 60k tris), ≤ 2 extra lights, no DepthOfField, no transmission
materials, no Environment maps. DOM-only beats are ≈0.1 s/frame. HyperFrames segments cost nothing at render time (pre-rendered).

## HyperFrames segments (optional, for kinetic type / UI mockups)
Create `hyperframes/<name>/index.html` (root `data-composition-id="root" data-width="1080" data-height="1920" data-fps="30" data-duration="N"`,
`<script src="./gsap.min.js">` — the tool copies gsap in; timelines MUST be `gsap.timeline({ paused: true })` registered as
`window.__timelines['root'] = tl`; body background `transparent`). Render with `npm run hf:render` → `public/hf/<name>.mov`, then
embed with `<OffthreadVideo src={staticFile('hf/<name>.mov')} transparent />` inside a `<Sequence from={...}>` in your beat.
Lint with `node node_modules/hyperframes/bin/hyperframes.mjs lint hyperframes/<name>`.

## Workflow
- Type-check: `npx tsc --noEmit -p tsconfig.json`.
- Stills: `bash tools/still.sh /tmp/claude-0/-home-user-portfolio/d072d127-20ba-53c6-bdc3-3548a30f6ed6/scratchpad/reel/<name> <abs seconds...>`
  (≤ 6 per call; the machine is shared). LOOK at every still (Read tool). Iterate until it looks like a top-tier reel.
- Report: file paths, cues, stills inspected, measured seconds/frame (from the still command timing), deviations.
