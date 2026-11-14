#!/usr/bin/env bash
# Mix narration + score + SFX (side-chain ducked), loudnorm to -14 LUFS, mux with the rendered video -> out/ux_ui_reel.mp4
set -euo pipefail; cd "$(dirname "$0")/.."
VIDEO="${1:-out/reel_video.mp4}"; NARR=audio/out/narration.wav; MUSIC=audio/out/reel_music.wav; SFX=audio/out/reel_sfx.wav
MIX=audio/out/reel_mix.wav; OUT=out/ux_ui_reel.mp4; mkdir -p out
for f in "$VIDEO" "$NARR" "$MUSIC" "$SFX"; do [ -f "$f" ] || { echo "missing $f"; exit 1; }; done
ffmpeg -y -loglevel error -i "$NARR" -i "$MUSIC" -i "$SFX" -filter_complex "
 [0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=3[n][nsc1][nsc2];
 [1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[m0];
 [2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[s0];
 [m0][nsc1]sidechaincompress=threshold=0.02:ratio=3.5:attack=50:release=600:makeup=1[m];
 [s0][nsc2]sidechaincompress=threshold=0.03:ratio=2:attack=30:release=350:makeup=1[s];
 [n][m][s]amix=inputs=3:weights=1 1 1:normalize=0:duration=longest[mix];
 [mix]loudnorm=I=-14:TP=-1.5:LRA=9:print_format=summary[out]" -map "[out]" -ar 48000 -c:a pcm_s24le "$MIX" 2>&1 | grep -E "Input Integrated|Output Integrated|Output True Peak" || true
ffmpeg -y -loglevel error -i "$VIDEO" -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -profile:v high -level 4.1 -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$OUT"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of default=nw=1 "$OUT"
ffmpeg -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+I:|Peak:" | tail -2
