export const meta = {
  name: 'documentary-scene-qa',
  description: 'Review every rendered scene against the guide and specs, fix blockers, then verify scene hand-offs',
  phases: [
    { title: 'Review', detail: 'one reviewer per scene inspects stills across the scene' },
    { title: 'Fix', detail: 'fixers patch blocker/major issues and re-preview' },
    { title: 'Transitions', detail: 'check bloom hand-offs at every chapter boundary' },
  ],
}
const ROOT = '/home/user/portfolio/invisible-conversation/09_project_source_files'
const PREV = '/tmp/claude-0/-home-user-portfolio/d072d127-20ba-53c6-bdc3-3548a30f6ed6/scratchpad/previews/qa'
const SCENES = args && args.scenes ? args.scenes : ['s01','s02','s03','s04','s05','s06','s07','s08','s09','s10']
const FILES = { s01:'s01_door.js', s02:'s02_human_factors.js', s03:'s03_commands.js', s04:'s04_mouse.js', s05:'s05_gui.js', s06:'s06_web_ux.js', s07:'s07_mobile.js', s08:'s08_ux_vs_ui.js', s09:'s09_everyone.js', s10:'s10_future.js' }

const REVIEW_SCHEMA = { type:'object', properties:{ scene:{type:'string'}, pass:{type:'boolean'}, ms_per_frame:{type:'number'}, stills:{type:'array', items:{type:'string'}},
  issues:{ type:'array', items:{ type:'object', properties:{ severity:{type:'string', enum:['blocker','major','minor']}, time:{type:'number'}, description:{type:'string'}, fix_hint:{type:'string'} }, required:['severity','time','description'] } } }, required:['scene','pass','issues'] }
const FIX_SCHEMA = { type:'object', properties:{ scene:{type:'string'}, fixed:{type:'array', items:{type:'string'}}, not_fixed:{type:'array', items:{type:'string'}}, stills:{type:'array', items:{type:'string'}} }, required:['scene','fixed','not_fixed'] }

const common = `Project root: ${ROOT}. Read docs/SCENE_GUIDE.md and the relevant section of docs/SCENE_SPECS.md first. The timeline is lib/timing.json (chapter start/end, sentence times). Render stills with: cd ${ROOT} && node tools/preview.mjs --times <comma list> --out ${PREV}/<scene> and then Read the PNG files (they are 1920x1080). The machine has 4 CPU cores shared with other agents: render at most 8 stills per call. Return only the structured output.`

const reviewed = await pipeline(SCENES,
  (id) => agent(`You are the documentary's picture editor doing quality control on scene ${id} (file scenes/${FILES[id]}). ${common}
Render ~12 stills spread across the scene: start+0.2, start+0.9, every narration-sentence start from lib/timing.json for this chapter (+0.4 s), two mid-shots, end-1.0, end-0.2. Inspect each still carefully for: (1) historical honesty — every reconstruction carries the provenance badge; no invented dates/labels beyond SCENE_SPECS; wrong attributions (e.g. trash icon on the Xerox Star; wooden mouse on the 1968 demo desk); (2) legibility — text >= 18 px, not overlapping, not clipped, on-palette; important labels visible long enough (check the code for durations); (3) composition — clear focal point, no floating/clipping/z-fighting geometry, no blown-out whites or pitch-black frames (except intentional dips), amber point present and consistent; (4) sync — year/label appears at or after its sentence start, not before (check code against timing.json); (5) transitions — bloom-in in the first 0.8 s and bloom-out in the last 0.7 s, as the guide requires (s01 has no bloom-in; s10 ends with a fade instead of a bloom); (6) performance — ms/frame from the preview log must be < 1500. Also run 'node --check scenes/${FILES[id]}'. Classify issues: blocker (wrong fact/attribution, missing badge, broken render, unreadable text, missing bloom), major (ugly composition, mistimed reveal > 0.5 s, clipping), minor (polish). pass=true only if there are no blockers and no majors.`,
    { label:`review:${id}`, phase:'Review', schema: REVIEW_SCHEMA }),
  (rev, id) => {
    if (!rev) return null
    const serious = rev.issues.filter(i => i.severity !== 'minor')
    if (!serious.length) return { review: rev, fix: null }
    return agent(`You are the scene builder for ${id} (file scenes/${FILES[id]}). A picture editor found these issues (fix every blocker and major; minors if cheap):\n${serious.map(i => `- [${i.severity}] t=${i.time}s: ${i.description}${i.fix_hint ? ' (hint: ' + i.fix_hint + ')' : ''}`).join('\n')}\nMinor notes: ${rev.issues.filter(i=>i.severity==='minor').map(i=>i.description).join(' | ') || 'none'}\n${common}\nEdit ONLY scenes/${FILES[id]} (and its .parts.js if it exists). Keep the scene's contract (id, start/end from T.ch, cues, bloom hand-offs). After editing, run node --check and re-render stills at the problem times to confirm each fix visually. Report what you fixed and what you could not.`,
      { label:`fix:${id}`, phase:'Fix', schema: FIX_SCHEMA }).then(fix => ({ review: rev, fix }))
  })

phase('Transitions')
const trans = await agent(`You are checking the hand-offs between all ten scenes of the film. ${common}
For each boundary between consecutive chapters (use lib/timing.json chapter end times E): render stills at E-0.05 and E+0.05 and E+0.5 (eight boundaries at a time max per call). The frame just before E must be dominated by the amber bloom (screen mostly amber/ivory, point grown), and E+0.05 must still be bloom-covered and then resolve by E+0.8 into the next scene's opening image. Also check that no frame is pure black at a boundary (except intentional dips) and that the amber tone matches. Return structured issues per boundary, with the scene id to fix and a concrete fix hint (e.g. 'bloom-out missing in s04 draw2d; add bloom(ctx, seg(t, this.end-0.7, this.end))').`,
  { label:'transitions', phase:'Transitions', schema: { type:'object', properties:{ boundaries:{ type:'array', items:{ type:'object', properties:{ at:{type:'number'}, from:{type:'string'}, to:{type:'string'}, ok:{type:'boolean'}, issue:{type:'string'}, fix_scene:{type:'string'}, fix_hint:{type:'string'} }, required:['at','from','to','ok'] } } }, required:['boundaries'] } })

const transFixes = trans ? await parallel(trans.boundaries.filter(b => !b.ok && b.fix_scene).map(b => () =>
  agent(`Fix a hand-off problem in scene ${b.fix_scene} (file scenes/${FILES[b.fix_scene]}): at t=${b.at}s between ${b.from} and ${b.to}: ${b.issue}. Hint: ${b.fix_hint || ''}. ${common} Edit only that scene file, keep its contract, re-render stills at ${b.at - 0.05}, ${b.at + 0.05}, ${b.at + 0.5} to confirm, and report.`,
    { label:`fix-transition:${b.fix_scene}`, phase:'Transitions', schema: FIX_SCHEMA }))) : []

log(`QA complete: ${reviewed.filter(Boolean).length} scenes reviewed, ${reviewed.filter(r => r && r.fix).length} fixed, ${transFixes.filter(Boolean).length} transition fixes`)
return { reviewed, transitions: trans, transFixes }
