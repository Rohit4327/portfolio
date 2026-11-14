#!/usr/bin/env bash
# Render every HyperFrames composition in hyperframes/<name>/index.html to public/hf/<name>.mov (ProRes 4444 with alpha).
set -e; cd "$(dirname "$0")/.."; mkdir -p public/hf
for d in hyperframes/*/; do n=$(basename "$d"); [ -f "$d/index.html" ] || continue; cp -f node_modules/gsap/dist/gsap.min.js "$d/gsap.min.js"; echo "== $n"; (cd "$d" && node ../../node_modules/hyperframes/bin/hyperframes.mjs render -o "../../public/hf/$n.mov" --format mov --no-browser-gpu -q looks 2>&1 | grep -E "Render complete|✗|Failed" | tail -2); done
