#!/usr/bin/env bash
# Contact sheets of a vertical video: tools/contact.sh <video> <outdir> [seconds per thumb=2.5]
set -e; v="$1"; out="$2"; step="${3:-2.5}"; mkdir -p "$out"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v"); n=$(python3 -c "import math;print(math.ceil($dur/($step*24)))")
for i in $(seq 0 $((n-1))); do s=$(python3 -c "print($i*$step*24)"); ffmpeg -y -loglevel error -ss $s -t $(python3 -c "print($step*24)") -i "$v" -vf "fps=1/$step,scale=270:-1,drawtext=fontfile=/usr/share/fonts/opentype/inter/Inter-SemiBold.otf:text='%{pts\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=6x4" -frames:v 1 "$out/sheet_$i.png"; done; ls "$out"
