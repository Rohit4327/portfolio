# Mutant X Design System

The design system behind Kudos Portal, Pollinator, People Tracker and Demand
Tracker. Tokens, components, patterns and developer handoff, extracted from the
shipping Kudos Portal v2 build.

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080     # then visit http://localhost:8080/design-system/
```

## What's here

| File | Purpose |
|---|---|
| `index.html` | The documentation site. Three independently scrolling panels, 45 sections, live specimens. |
| `assets/mx-tokens.css` | **214 design tokens** as CSS custom properties. The single source of truth. |
| `assets/mx-components.css` | 25 components. Reads only from tokens — zero hard-coded values. |
| `assets/icons.svg` | 68 line icons, 24×24, 1.7px stroke. Inline once per document. |
| `assets/tokens.json` | The same tokens in W3C Design Tokens format, for Style Dictionary / Figma Variables / Tailwind. |
| `assets/docs.css` | Chrome for the docs site only. Not part of the shipped system. |
| `assets/docs.js` | Docs runtime: nav filter, dual scroll-spy, live specimens. Not shipped. |

## Using it in a product

```html
<link rel="stylesheet" href="/mx/mx-tokens.css">      <!-- order matters -->
<link rel="stylesheet" href="/mx/mx-components.css">
<div hidden><!-- contents of icons.svg --></div>
<body class="mx-scope" data-motion="auto">
```

Reference the semantic aliases (`var(--mx-surface)`, `var(--mx-text-2)`), never
the raw ramp steps. That is what makes a retheme a one-file change.

## Foundations at a glance

- **Typeface** — San Francisco (`-apple-system` stack). SF Pro Text below 20px,
  SF Pro Display at and above it, switched by the OS.
- **Colour** — one warm neutral ramp (27), one orange accent (18), four status
  trios (16), six categorical hues (12), plus dark render surfaces.
- **Space** — 4px base, 14 named steps.
- **Radius** — 7 steps, proportional to surface size.
- **Elevation** — 12 levels; every raised surface also carries a 1px border.
- **Motion** — 4 durations, 3 curves, one `data-motion` switch with three states.
- **Layer** — one z-index ladder, 11 rungs.

## Regenerating `tokens.json`

It is generated from `mx-tokens.css` and must never be edited by hand. Any
script that parses `--mx-*: value;` declarations out of `:root` and groups them
by prefix will reproduce it.

## Known drift

The `#drift` section of the docs lists eight places where the shipping product
does not yet match this document, with impact and a proposal for each. Read it
before assuming an inconsistency you find in production is a bug.

---

Version 1.0.0 · Owner: Design Systems
