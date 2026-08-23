# Kudos Portal

A standalone recognition and Wall-of-Fame management application. Open
`Kudos_Portal.html` directly in a browser — everything is inlined, nothing is
fetched, and it works from `file://`.

## Layout

| Path | What it is |
| --- | --- |
| `Kudos_Portal.html` | The deliverable. |
| `src/kudos-portal.dc.html` | Editable source: markup template, then the component logic. |
| `build/bundle-shell.html` | The self-extracting bundle wrapper (fonts, runtime, logo) with the app replaced by a placeholder. |
| `build.py` | Injects `src/` into the shell and writes `Kudos_Portal.html`. |
| `tools/typefloor.py` | The one-shot type-floor pass, kept for provenance. |

```
python3 kudos-portal/build.py
```

## The signed-off shell

Three areas are frozen: the global top bar, the product rail, and the
Showcase / My Wall / Admin strip. Nothing in the redesign restyles them.

Every redesign rule is either opt-in through a class or scoped below the
shell, and the frozen regions are verified by pixel comparison against the
original bundle — collapsed and expanded rail, as Viewer and as Account Admin.
Two changes touch shell markup, both repairs rather than restyling:

* attributes only — `aria-current` on the rail and the strip, `data-pop` so the
  outside-click dismissal can find a popover, `id` on the app root so a dialog
  can hide it from assistive technology;
* below 720px the two shell bands scroll inside themselves instead of dragging
  the page sideways, because their controls are sized for a desktop and are
  not ours to resize.

## Review tooling

The role/reach switch and the spec-pin overlay are not part of the product.
They live behind a gate:

* append `?dev=1` to the URL, or
* press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Alt</kbd> + <kbd>D</kbd>.

With the gate open, a review bar appears bottom-right and spec identifiers
(`SH-01`, `DEV-05`, `ACC-01` …) render in drawer eyebrows, note text and the
Admin tab strip. With it closed none of that reaches the interface. Account
profile switching also stays available from the profile menu, where it reads
as product UI rather than as a dashed prototype block.

## Vocabulary

One word per object, per the model's own rules:

* **Program** — the unit of competition. "Portfolio" is retired.
* **Display** — the managed Wall-of-Fame screen. "Device ID" survives only as
  the hardware identifier field on one.
* Scene → Template → Playlist → Schedule → Display is the object chain, and
  each of the first three reads as its own kind of thing in the library.

## Verification

`Kudos_Portal.html` is checked headlessly on every change:

* every major flow across the shell, Showcase, My Wall and all six Admin
  sections, asserting outcomes and failing on any console error;
* no horizontal page scroll and no console errors at 1920×1080, 1728×1117,
  1440×900, 1366×768, 1024×768, 768 tablet and 390 phone;
* table header and rows agree on which columns are showing at every
  breakpoint, and both stack into labelled records below 820px;
* the three frozen shell regions render byte-identical to the original.
