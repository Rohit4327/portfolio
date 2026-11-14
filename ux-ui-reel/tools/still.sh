#!/usr/bin/env bash
# Render stills of the whole reel at absolute seconds:  tools/still.sh <outdir> 1.2 5 12.5 ...
set -e; cd "$(dirname "$0")/.."; out="$1"; shift; mkdir -p "$out"
for t in "$@"; do f=$(python3 -c "print(round($t*30))"); npx remotion still src/index.ts Reel "$out/t_$(printf '%07.2f' $t).png" --frame "$f" 2>&1 | grep -iE "error|Could not" | head -3; echo "$out/t_$(printf '%07.2f' $t).png"; done
