# Phase 5 review: presentation mode and the dive

## Shots
| Shot | Matches | Off / fixed |
|---|---|---|
| `presentation-recommended` | White room, oak table, 1:40 model on a white base board with "#1" engraved by lift core #1; ADC-05 at full detail, context as pale low massing; wordmark, pill, settings, segmented control with summary chip, dock; eight numbered labels in two columns with non-crossing leaders, two greyed context labels | First pass: model only 41% of the width and 434 draw calls. Fixed: camera distance 2.8 m (model about half the width) and 184 draw calls |
| `presentation-today`, `-keep9`, `-rejected` | Each layout's desks, glass and fixtures; chip text per layout; Rejected has the muted red tag and its card text | none |
| `presentation-recommended-doors` | Door tags on their doors | Some overlap at default zoom (Phase 4) |
| `dive-mid` (t = 3.3 s, paused) | Camera above lift core #1 looking down, model part-way through its scale-up, table and room fading, no cut | none |

## Conflicts and simplifications
- Framing: whole table in view and model at 60% width cannot both hold (D-19).
- No reflector floor, no `AccumulativeShadows`, no drei `Lightformer`s: a satin white floor, the key light's static shadow map plus AO, and code-generated softboxes prefiltered with PMREM (D-21).
- The Project ODC label's leader crosses the model because the label sits in the left column for balance.
- Tiny items (Galleria devices, museum devices, foosball rods, the headset, all small text) are hidden at 1:40 to stay inside 200 draw calls.

## Dive
The e2e test "Start experience dives into the lift, the doors open, and Exit to model returns to the table" passes: mode goes presentation → transition → walkthrough at (-66, -25), the lift door opens, the location pill reads Lift Lobby, and Exit to model returns to presentation with the scale back at 1:40.

"No hitch over 50 ms" could **not** be measured here: every frame takes seconds on software WebGL.
