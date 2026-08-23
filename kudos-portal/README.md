# Kudos Portal

Standalone build of the Kudos Portal prototype.

| Path | What it is |
| --- | --- |
| `Kudos_Portal.html` | The deliverable. Open it directly in a browser — no server, no network. |
| `src/kudos-portal.dc.html` | Editable application source: markup template + component logic. |
| `build/bundle-shell.html` | The self-extracting bundle wrapper (fonts, runtime, logo) with the app replaced by a placeholder. |
| `build.py` | Injects `src/` into the shell and writes `Kudos_Portal.html`. |

## Build

```
python3 kudos-portal/build.py
```

Everything is inlined, so the built file works from `file://` with no network access.
