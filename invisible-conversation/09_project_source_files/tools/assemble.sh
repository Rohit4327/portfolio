#!/usr/bin/env bash
# Final assembly: video (renders/film_video.mp4) + narration + music + sfx -> 01_final_documentary.mp4 (1080p24 H.264/AAC, -14 LUFS)
set -euo pipefail
P="$(cd "$(dirname "$0")/.." && pwd)"; D="$(dirname "$P")"
VIDEO="${1:-$P/../renders/film_video.mp4}"
NARR="$D/02_english_narration.wav"; MUSIC="$P/audio/out/music_bed.wav"; SFX="$P/audio/out/sfx_bed.wav"
OUT="$D/01_final_documentary.mp4"; MIX="$P/audio/out/final_mix.wav"
for f in "$VIDEO" "$NARR" "$MUSIC" "$SFX"; do [ -f "$f" ] || { echo "missing $f"; exit 1; }; done
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
echo "video duration: $DUR s"
# 1) mix: narration dominant; music/sfx ducked under speech with sidechain compression; then loudness-normalise to -14 LUFS / -1.5 dBTP
ffmpeg -y -loglevel error -i "$NARR" -i "$MUSIC" -i "$SFX" -filter_complex "
 [0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0,asplit=3[n][nsc1][nsc2];
 [1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.9[m0];
 [2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[s0];
 [m0][nsc1]sidechaincompress=threshold=0.02:ratio=4:attack=60:release=700:makeup=1[m];
 [s0][nsc2]sidechaincompress=threshold=0.03:ratio=2.5:attack=30:release=400:makeup=1[s];
 [n][m][s]amix=inputs=3:weights=1 0.9 0.9:normalize=0:duration=longest[mix];
 [mix]loudnorm=I=-14:TP=-1.5:LRA=11:print_format=summary[out]" -map "[out]" -ar 48000 -c:a pcm_s24le "$MIX"
# 2) mux with video; H.264 high profile, AAC 192k; faststart
ffmpeg -y -loglevel error -i "$VIDEO" -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -level 4.1 -r 24 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest -t "$DUR" "$OUT"
echo "== $OUT"; ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,sample_rate,channels -of default=nw=1 "$OUT"
ffmpeg -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|LRA:|Peak:" | tail -3
