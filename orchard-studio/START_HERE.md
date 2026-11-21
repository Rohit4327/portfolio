# Start here

1. Unzip this folder somewhere on your Mac, e.g. ~/Projects/orchard-studio
2. Open Terminal in that folder and run: claude
3. Switch the model to Fable 5.2 (use /model)
4. Paste the contents of KICKOFF.txt as your first message
5. Approve installs when asked (npm packages, Playwright browsers). Keep Chrome installed: the performance test uses it.

Claude Code will stop at three checkpoints (after Phase 1, 3 and 7) and show you screenshots before continuing.
To continue after a checkpoint, reply: "Approved, continue to the next checkpoint." To change something, describe it and ask it to fix before continuing.

Files:
- MASTER_PROMPT.md: the full spec (about 11,900 words)
- CLAUDE.md: standing rules Claude Code reads every session
- data/geometry.json: every wall, desk, zone, fixture, door label and layout, in feet
- reference/: floor plan, annotated route, Excel layout screenshots, and the previous attempt to avoid
