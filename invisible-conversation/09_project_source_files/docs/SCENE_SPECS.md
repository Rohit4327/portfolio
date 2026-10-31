# SCENE SPECS (fact-checked). Read SCENE_GUIDE.md first. Times below are STORYBOARD targets; actual chapter
# boundaries come from lib/timing.json (T.ch(n)) and sentence times from T.sent(n, '...'). Narration text per
# chapter is in lib/timing.json. Hand-off bloom centre is (W/2, H/2) unless stated.

## S02 — BEFORE SCREENS — HUMAN FACTORS   (chapter 2; file scenes/s02_human_factors.js; id 's02')
Receive the point (bloom-in). The point lands on a mechanical TOGGLE SWITCH on a mid-century control panel and becomes its
amber indicator lamp. Camera tracks slowly along a realistic industrial control desk: rows of toggle switches, round gauges
with needles, rotary knobs, a large lever, brass/steel/bakelite, warm tungsten key light, graphite background, soft haze
(fog). Then a ROTARY TELEPHONE on the desk (bakelite body, finger-wheel dial with 10 holes, handset) — label it only as
"Rotary desk telephone, mid-20th century" (do NOT attribute it to Dreyfuss; the model 302 attribution is disputed).
Show the human-factors idea: a badly placed control confuses an operator — e.g. two identical levers side by side (gear vs
flap, after WWII cockpit research) with a cyan dimension/measurement overlay; then animate the fix: shape-coded knobs and
repositioned controls sliding into ergonomic reach, with transparent 3D measurement guides (dimension()) showing reach/
height. Draw an ORIGINAL simple human-figure silhouette (no copying of Dreyfuss's Joe/Josephine drawings) with reach arcs.
On the narration 'In 1955, Henry Dreyfuss' show a lower third: title 'HENRY DREYFUSS', sub 'Industrial designer · Designing
for People, 1955' and a 3D reconstruction of a closed hardback book on the desk whose spine/cover carries only the TEXT
"DESIGNING FOR PEOPLE / HENRY DREYFUSS / 1955" in Inter (an illustrative reconstruction — the real cover is not reproduced).
Overlays (caps labels, one at a time, ≥3 s each): 'HUMAN FACTORS', 'ERGONOMICS', 'DESIGNING FOR PEOPLE — 1955'. Badge RECON
while any reconstruction is on screen. Transition: the telephone dial fills frame and rotates; the finger-wheel's circular
motion becomes an abstract rotating input wheel (spokes + amber point at the rim) — bloom-out from the wheel centre.
Cues to export: switch_click_1..3, dial_wind, dial_return, lever_move, book_set_down, transition_point.

## S03 — WHEN COMPUTERS SPOKE IN COMMANDS   (chapter 3; file scenes/s03_commands.js; id 's03')
Bloom-in on the rotating wheel which becomes a spinning tape reel in a 1960s computer room: grey cabinets, tape drives,
a punched-card reader, a desk with a card deck and a keyboard terminal. Era look: cool fluorescent grey-green, slight grain.
Punched cards: beige rectangles with rows of rectangular holes (80-column feel, generic — do not reproduce a specific
brand's layout), one corner cut. A card deck is fed; then a dark terminal fills the screen: green phosphor monospace text
('DejaVu Sans Mono'), a prompt, typed commands appearing character by character, an error line like
`? UNRECOGNIZED COMMAND` (generic — not attributed to a specific OS), a blinking cursor; the user hesitates (typing stops).
Make clear this is a composite ("Illustrative reconstruction · early command-line interaction") — not one specific machine.
On 'In 1963, Ivan Sutherland's Sketchpad': the terminal glow dissolves into a round CRT (circular 9-inch-style screen) on a
console with a LIGHT PEN; a hand-free light pen (a slim cylinder on a cable) draws a square on the screen in white vector
lines, then drags a corner to resize the shape, then constrains it (lines snap). Labels: yearStamp '1963', caps 'IVAN
SUTHERLAND — SKETCHPAD', lower third 'Sketchpad · MIT Lincoln Laboratory TX-2 · light pen drawing (reconstruction)'. Do NOT
claim Sutherland invented the light pen. Badge RECON throughout. Transition: the last drawn point on the CRT becomes a
bright dot → becomes an arrow cursor; bloom-out at that dot's screen position (store cx,cy in cues too).
Cues: tape_reel_spin, card_shuffle, key_strike_1..N (list each), error_beep, lightpen_draw_1..3, transition_point.

## S04 — THE MOUSE CHANGES EVERYTHING   (chapter 4; file scenes/s04_mouse.js; id 's04')
Bloom-in: the cursor dot sits on a large projection screen in a dark 1968 auditorium (rows of seat silhouettes, a stage,
a console with a keyboard, a 5-key chord keyset and a MOUSE). yearStamp '1968' on the narration 'In 1968'. Lower third on
'Douglas Engelbart': 'DOUGLAS ENGELBART · SRI Augmentation Research Center · 9 Dec 1968, San Francisco'. caps overlay:
'1968 — THE MOTHER OF ALL DEMOS' (narration: "what we now call" — the name came later; fine to show as the modern name).
Projection screen (makeScreen) shows a monochrome NLS-style view: structured outline text, a link being followed, text
being edited (words inserted), and a split view with a second collaborator's text. Close-ups: mouse moving on the desk and
the cursor moving in sync; a click selects a word. Keep the on-screen look generic monochrome CRT/projection — a
reconstruction, not a screenshot. MOUSE HISTORY (mandatory distinction): on 'a wooden prototype came in 1964' show a small
3D reconstruction of a wooden-block mouse with ONE button and two perpendicular wheels underneath, labelled 'First mouse
prototype · wooden shell · built by Bill English, 1964 · concept Douglas Engelbart' with badge RECON. On 'the famous 1968
demonstration used a later model' pan to the demo-table mouse: a rounded box with THREE buttons, labelled 'Three-button
mouse used in the 1968 demonstration (reconstruction)'. Never place the wooden one on the demo desk. Also show the
'windows' as split screen areas — not overlapping draggable windows. Transition: the cursor moves to a rectangular
area on the screen which detaches as a floating window; the camera flies into it; bloom-out at the window centre.
Cues: mouse_click_1..4, keyset_chord, screen_text_type, transition_point.

## S05 — THE GRAPHICAL REVOLUTION   (chapter 5; file scenes/s05_gui.js; id 's05')
A premium exhibition hall (graphite floor, ivory plinths, soft museum spots). Four reconstructed machines on plinths, visited
in sequence as the narration names them: 1973 XEROX ALTO (tall vertical/portrait monochrome display on a separate cabinet,
keyboard, three-button mouse; label 'Experimental research machine, Xerox PARC — never sold to the public'), 1981 XEROX STAR
(landscape bitmapped display, 8010 desktop with document + folder + in/out basket + printer icons — NO wastebasket; label
'Xerox Star 8010 · announced April 1981 · desktop metaphor'), 1983 APPLE LISA (beige unit with built-in landscape screen; show
document icons and a WASTEBASKET icon — the trash first appeared commercially here; label 'Announced Jan 1983, shipped June
1983'), 1984 MACINTOSH (compact beige all-in-one, small screen, one-button mouse; windows, icons, menu bar, Trash). Screens via
makeScreen with black-on-white 1-bit style UI drawn in Canvas (generic, not pixel copies of real screenshots). yearStamp +
caps label for each. Demonstrate: point-and-click (cursor arrow), a window opening, a folder opening, direct manipulation
(drag an icon). Mandatory morphs: a 3D PAPER FOLDER on a plinth lifts and flattens into the on-screen folder icon (during
'A folder held files'); a small 3D WASTEBASKET becomes the on-screen trash icon (during 'A trash can meant delete') — show the
trash on the Lisa/Mac screens, not the Star. Badge RECON always. Avoid implying Apple invented GUI/mouse (the sequence itself
shows PARC first). Transition: the on-screen folder opens and the camera dives in; its contents become a landscape of
connected documents → bloom-out centre.
Cues: click_1..5, window_open, folder_morph, trash_morph, transition_point.

## S06 — THE WEB AND THE NAME "UX"   (chapter 6; file scenes/s06_web_ux.js; id 's06')
Open on a 3D hardback BOOK reconstruction on a graphite table: cover text only 'THE PSYCHOLOGY OF EVERYDAY THINGS · DONALD
A. NORMAN · 1988' (Inter; label 'Book reconstruction · 1988 · retitled The Design of Everyday Things in 1990'). Lower third
'DON NORMAN · Cognitive scientist · The Psychology of Everyday Things (1988)'. On 'A year later, Tim Berners-Lee': a NeXT
Computer reconstruction — a matte black magnesium CUBE (approx 30 cm) with a separate monochrome monitor, labelled 'NeXT
Computer at CERN · the first web server (reconstruction)'; lower third 'TIM BERNERS-LEE · CERN · Information Management: A
Proposal, March 1989'. caps: '1989 — THE WORLD WIDE WEB PROPOSAL'. On 'By 1991, its first website': the monitor shows a
reconstruction of an early hypertext browser page: plain text, underlined links; label 'info.cern.ch · first website ·
running from Dec 1990, announced publicly Aug 1991 (reconstruction)'. Then the amber point becomes a LINK: the camera
follows the link into a 3D network of linked documents (ivory cards with grey text lines connected by thin cyan/amber
lines). On 'In 1993, Norman helped establish': caps '1993 — "USER EXPERIENCE"' and lower third 'Don Norman · User
Experience Architect · Apple, 1993'. Then the diagram: four nested rounded frames / labels animating outward:
INTERFACE → PRODUCT → SERVICE → ENTIRE EXPERIENCE (badge DIAGRAM). Make clear the NAME became established after decades of
earlier human-centred work (e.g. a faint timeline strip 1955 · 1963 · 1968 · 1973 · 1988 · 1993 at the bottom).
Transition: one hyperlink expands into a growing 3D network of websites → bloom-out centre.
Cues: page_turn, link_click_1..3, network_grow, transition_point.

## S07 — THE WEB GOES MOBILE   (chapter 7; file scenes/s07_mobile.js; id 's07')
Bloom-in on the network, which becomes a mid-1990s web page on a CRT monitor reconstruction: busy layout, many links,
small grey text, crowded table layout, poor hierarchy (generic fictional page, not a real site). Demonstrate problems with
cyan annotation callouts (one at a time): 'Unclear links', 'Crowded layout', 'Poor readability', 'Confusing hierarchy'.
Then the page restructures into a clear layout (headings, spacing, readable type) with a calm transition. On 'first Web Content
Accessibility Guidelines in 1999': caps '1999 — WCAG 1.0' + an animated KEYBOARD-FOCUS ring (amber rounded rectangle)
tabbing through links/buttons in order; show larger text and good contrast. On 'in 2007, the iPhone': a reconstruction of
a 2007-style touchscreen smartphone (rounded black slab, 3.5-inch screen, single home button, aluminium back) — label
'Original iPhone, announced Jan 2007 (reconstruction)'; caps '2007 — MULTI-TOUCH GOES MAINSTREAM'. Animate a finger touch
indicator (translucent circle): tap, flick (list scroll with inertia), pinch-to-zoom (two circles). Add the one-line footnote
'Multi-touch research predates the iPhone (1980s onward)'. On 'In 2010, responsive web design': caps '2010 — RESPONSIVE WEB
DESIGN'; show ONE layout (a simple fictional article page) fluidly reflowing from a desktop monitor to a tablet to a phone
(three device frames in 3D, content reflows: columns collapse, images scale, nav becomes a menu). Badges RECON/VIS as
appropriate. Transition: the phone screen expands to fill the frame and becomes a contemporary product-design workspace →
bloom-out centre.
Cues: link_click, focus_tick_1..4, tap_1..3, flick_1..2, pinch, reflow_1..3, transition_point.

## S08 — UX VS UI — THE BIG REVEAL   (chapter 8; file scenes/s08_ux_vs_ui.js; id 's08')
Bloom-in on a modern, beautiful FICTIONAL online shop ("Nordlys Goods" or similar invented name; badge FICTIONAL EXAMPLE).
Render it as a large 2D UI on the overlay (or a makeScreen on a floating glass slab): elegant typography, product cards with
soft gradients (abstract product shapes, no real brands), a clear 'Add to bag' button, hover/tap feedback, a 3-step checkout
(Bag → Delivery → Pay). On 'So what exactly are UX and UI?' show two caps labels appearing: 'UI — USER INTERFACE' with
sub 'controls and feedback: buttons, labels, sounds, colour, interaction patterns' and 'UX — USER EXPERIENCE' with sub
'the broader journey: understand, complete, trust, feel in control' (on their sentences). The user adds an item, proceeds to
checkout; at the final 'Pay' step a previously hidden 'Delivery €14.90' line appears and the total jumps; a cursor/finger
hesitates, moves toward 'Back'. FREEZE on 'Beautiful UI; frustrating UX.': big caps 'BEAUTIFUL UI.' then 'FRUSTRATING UX.'
Camera pulls back: the screen explodes into layered planes (in 3D) labelled: User expectations · Information architecture
· Navigation flow · Decision points · Content clarity · Trust · Accessibility · Error handling (reveal gradually, ≤2 visible
at once + a faint stack). Then the process ribbon on 'Designers research real needs…': RESEARCH → DEFINE THE PROBLEM →
IDEATE → PROTOTYPE → TEST → ITERATE (six nodes lighting in sequence; badge CONTEMPORARY VISUALIZATION). Show a usability-
test observation: a small 'observation note' card ('Participant 3: "Where did the delivery cost come from?"') and sticky-note
tags. Redesign: delivery cost shown on the product page and in the bag; a 2-step checkout; the user completes the purchase
with clear feedback ('Order confirmed'). Before/after journey strips side by side (red ✕ at the hidden-cost step vs green ✓).
Do NOT reduce UI to decoration: show that the button's feedback states affect the experience. Transition: the confirmed
checkout dissolves into a component library grid → bloom-out centre.
Cues: ui_tap_1..5, error_reveal, freeze_sting, process_tick_1..6, success_chime, transition_point.

## S09 — DESIGN FOR EVERYONE   (chapter 9; file scenes/s09_everyone.js; id 's09')
A contemporary design workspace: a large canvas in 3D space with component cards (buttons, inputs, cards, nav) and three
collaborator cursors (named by role only: 'Designer', 'Engineer', 'Researcher' — no real names). Show DESIGN TOKENS
(colour swatches, type scale, spacing) flowing into components, then components assembling consistent screens on three
devices (phone/tablet/desktop frames). Caps on 'Browser-based tools allow teams to design together': 'BROWSER-BASED
COLLABORATIVE DESIGN — 2010s' with sub 'e.g. Figma, public release September 2016' (text only; no logos). Then ACCESSIBILITY:
one idea at a time: keyboard focus ring moving through a form; text size and line length improving; clear labels appearing
on icon-only buttons; contrast fixed (a low-contrast grey text becomes readable); an accessible error message ('Enter a
valid email address, e.g. name@example.com') replacing a red-only border; a 'Reduce motion' toggle that stops a bouncing
animation; multiple input methods (keyboard, pointer, touch, voice) as four small icons/badges. On 'Standards such as WCAG
2.2': caps 'WCAG 2.2 — 2023' (W3C Recommendation, 5 Oct 2023). Depict people only as abstract silhouettes/roles — never
stereotyped portrayals of disability; show that different people interact differently via the input-method icons.
Ethical design contrast (short): 'Helpful choice' — a clear 'Unsubscribe' link vs 'Manipulative choice' — a tiny grey
'no thanks' under a huge 'KEEP MY DISCOUNT' button; mark the manipulative one with a quiet ✕. Non-preachy, 4-5 s total.
Badge CONTEMPORARY VISUALIZATION. Transition: interface cards separate into floating layers that drift into depth → they
become conversational/spatial panels → bloom-out centre.
Cues: collab_tick_1..3, focus_tick_1..4, toggle, transition_point.

## S10 — THE NEXT INTERFACE   (chapter 10; file scenes/s10_future.js; id 's10')
Bloom-in: the amber point returns alone in graphite space and becomes a VOICE WAVEFORM (amber line) as a person (abstract
silhouette or just a caption bubble) asks a plain question ('When does the pharmacy close today?'); a reply card answers
clearly ('Open until 20:00 · 12 min walk') — badge CONTEMPORARY VISUALIZATION (present-day capability). Then the waveform
becomes an AI conversational thread (two rounded message cards; keep it grounded). Then a SPATIAL interface: translucent
panels arranged in 3D around a viewer position, a hand silhouette moving a panel (badge SPECULATIVE CONCEPT for anything not
mainstream; label 'Spatial computing — emerging, not yet mainstream'). Then everything collapses back into the single amber
point, which travels BACKWARDS through the corridor (makeCorridor; camera moving +z or the corridor reversed) — reuse the
S01 corridor look. On 'And remember that door?': we return to the SAME door as S01 (rebuild it: same walnut slab, ivory wall,
graphite frame) but now with a clear affordance: a horizontal brushed-steel PULL BAR on this side (and visible hinges). First
person: the hand grips the bar and the door opens immediately on the first pull; the camera moves through into soft warm
natural light (ivory/white bloom, not amber). Closing cards (on the overlay, centered, Inter Display): 'DESIGN BEGINS WITH
PEOPLE.' (hold ≥3 s after the last narration sentence), then 'THE INVISIBLE CONVERSATION' + 'HOW UX & UI CAME TO LIFE', then
a concise credit card (small text, ≤5 lines): 'Narration: Kokoro-82M neural voice (Apache-2.0) · Score & sound design:
original, synthesized for this film · All historical devices shown are illustrative reconstructions · Rendered with
Three.js in Chromium · 2026', then fade to black by T.total. No bloom-out at the end (fade to black instead).
Cues: voice_wave, reply_chime, spatial_whoosh, corridor_return, door_open_clean, footsteps_out, final_point_tone, cards_in.
