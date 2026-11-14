// BEAT 8 — OUTRO (142.2 → 150.0 s). Opens on the line beat's held frame (same segment, same push, same point), the amber point
// collapses the stacked type into itself and flares; a clean title card UX vs UI / EXPLAINED with the amber rule, the point lands
// as the final full stop, a small credit line, and a fade to black by 150.0 s (the composition ends there — no bloom-out).
import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { useT } from '../lib/Stage3D';
import { Dip, AmberDot } from '../lib/Overlay';
import { Punch, SlideWords } from '../lib/Type';
import { PALETTE, FONT } from '../lib/theme';
import { beat, sec, wordAt, local } from '../timeline';
import { ease, easeIn, easeOut, easeInOut, seg, clamp, lerp } from '../lib/anim';
import { LINE, W, dotAt, pushScale, pushed, PUSH_ORIGIN } from './Line.parts';

const B = beat('outro');
const T = {
  collapse: 0.5,                                              // after the 14-frame fade from the line beat has fully landed
  flare: 0.88,
  title: Math.max(0.95, local('outro', wordAt('UX and UI', 'explained')) - 0.18),  // 'UX vs UI' lands just ahead of "explained"
  rule: 1.08, explained: 1.22, dot_land: 1.55,
  credit: 2.4,
  fade: 6.4, black: 7.6,
};
export const cues = { collapse: B.start + T.collapse, title_in: B.start + T.title, credit_in: B.start + T.credit, fade_out: B.start + T.fade };

// title geometry (Inter Display 800; widths measured in Chrome): UX 349 · vs 117 · UI 232, gaps 36 → 770 wide, centred
const TITLE = { ux: 155, vs: 540, ui: 693, top: 700, vsTop: 830, rule: 980, explainedTop: 1010 };
const END_DOT = { x: 950, y: 1129, r: 10.5 };                // the full stop of EXPLAINED (150 px)

export const Beat: React.FC = () => {
  const t = useT(); const tAbs = B.start + t;
  const tLine = (LINE.end - LINE.start) + t;                   // the line segment keeps running underneath
  const s = pushScale(tAbs);
  const k = ease(t, T.collapse, T.flare + 0.04, easeIn);       // collapse progress
  const dLine = dotAt(tLine); const anchor = pushed(dLine, s);
  // the point: rides the stack's last full stop, swells at the flare, then travels to the final full stop
  const travel = ease(t, T.flare + 0.3, T.dot_land, easeInOut);
  const spike = Math.sin(Math.PI * seg(t, T.flare - 0.05, T.flare + 0.14));   // a short flare, not a bloom-out
  const px = lerp(anchor.x, END_DOT.x, travel), py = lerp(anchor.y, END_DOT.y, travel) - 60 * Math.sin(Math.PI * travel);
  const pr = lerp(dLine.r * s, END_DOT.r * (1 + 0.05 * Math.sin(t * 5.2)), travel) + 30 * spike + 14 * k;
  const ring = seg(t, T.flare - 0.02, T.flare + 0.55); const ringR = lerp(16, 520, easeOut(ring));
  const ruleW = 770 * ease(t, T.rule, T.rule + 0.45, easeOut);
  const credit = ease(t, T.credit, T.credit + 0.5, easeOut);
  const dip = ease(t, T.fade, T.black, easeInOut);
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      {/* the line beat's end state (same frames of the same segment) collapsing into the point */}
      {k < 1 ? (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: `${PUSH_ORIGIN.x}px ${PUSH_ORIGIN.y}px` }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 - k}, ${1 - k * k})`, transformOrigin: `${dLine.x}px ${dLine.y}px`, opacity: 1 - ease(k, 0.72, 1), filter: k > 0 ? `blur(${k * 10}px)` : undefined }}>
            <Sequence from={0} durationInFrames={sec(1.1)} layout="none">
              <OffthreadVideo src={staticFile('hf/line.mov')} startFrom={sec(LINE.end - LINE.start)} transparent muted style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920 }} />
            </Sequence>
          </div>
        </div>
      ) : null}
      {/* shock ring from the flare */}
      {ring > 0 && ring < 1 ? <div style={{ position: 'absolute', left: anchor.x - ringR, top: anchor.y - ringR, width: ringR * 2, height: ringR * 2, borderRadius: '50%', border: `${lerp(5, 1, ring)}px solid rgba(255,171,91,${0.55 * Math.pow(1 - ring, 1.6)})`, boxShadow: `0 0 ${24 * (1 - ring)}px rgba(255,171,91,${0.22 * (1 - ring)})` }} /> : null}
      {/* title card */}
      <Punch text="UX" tStart={T.title} x={TITLE.ux} y={TITLE.top} size={260} align="left" color={PALETTE.ivory} />
      <Punch text="vs" tStart={T.title + 0.07} x={TITLE.vs} y={TITLE.vsTop} size={110} align="left" color={PALETTE.amber} weight={700} />
      <Punch text="UI" tStart={T.title + 0.13} x={TITLE.ui} y={TITLE.top} size={260} align="left" color={PALETTE.cyan} />
      <div style={{ position: 'absolute', left: TITLE.ux, top: TITLE.rule, width: ruleW, height: 3, borderRadius: 2, background: PALETTE.amber }} />
      <SlideWords text="EXPLAINED" tStart={T.explained} x={72} y={TITLE.explainedTop} width={936} size={150} align="center" tracking={-4.5} color={PALETTE.ivory} />
      {/* credit */}
      <div style={{ position: 'absolute', left: 72, width: 936, top: 1250, textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 24, lineHeight: 1.7, letterSpacing: 0.4, color: PALETTE.gray, opacity: credit, transform: `translateY(${(1 - credit) * 10}px)` }}>
        Made with Remotion · HyperFrames · Three.js<br />Kokoro voice (Apache-2.0) · original score
      </div>
      {/* the amber point */}
      <AmberDot x={px} y={py} r={pr} alpha={1} glow={7} />
      {spike > 0 ? <Dip alpha={0.14 * spike} color={PALETTE.ivory} /> : null}
      {/* fade to black by 150.0 s */}
      <Dip alpha={dip} color="#000" />
    </AbsoluteFill>
  );
};
