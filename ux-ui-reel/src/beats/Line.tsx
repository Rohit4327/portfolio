// BEAT 7 — THE LINE (125.4 → 142.2 s). Kinetic type is the hero (HyperFrames segment public/hf/line.mov, GSAP, transparent):
// UI + USABLE / UX + WORTH USING lock in, PIXEL-PERFECT is struck through, FINISH THE TASK underlined, ENJOY glows cyan, then the
// three-line stack. Behind it: a slow CSS-3D parallax of translucent glass panels; over it the amber point lands as every full stop.
// Opens from the ivory light the door beat ends in; hands off to the outro with a 14-frame fade over an identical held frame.
import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { useT } from '../lib/Stage3D';
import { Dip, AmberDot } from '../lib/Overlay';
import { PALETTE } from '../lib/theme';
import { ease, easeOut, lerp } from '../lib/anim';
import { sec } from '../timeline';
import { LINE, W, dotAt, pushScale, PUSH_ORIGIN, GlassPanels, LightPools } from './Line.parts';

export const cues = {
  type_lock_1: LINE.start + W.UI, type_lock_2: LINE.start + W.usable, type_lock_3: LINE.start + W.UX, type_lock_4: LINE.start + W.using,
  strike: LINE.start + W.means, underline: LINE.start + W.task + 0.05, glow: LINE.start + W.enjoy + 0.12,
  stack_1: LINE.start + W.design, stack_2: LINE.start + W.test, stack_3: LINE.start + W.then,
  transition_point: LINE.end - 0.45,
};
export const transition = { kind: 'fade' as const, frames: 14 };

export const Beat: React.FC = () => {
  const t = useT(); const tAbs = LINE.start + t;
  // the set (panels + light pools) emerges from the ivory light and dissolves before the hand-off, leaving graphite + type + point
  const setOut = 1 - ease(t, W.end - 1.2, W.end - 0.4);
  const panels = ease(t, 0.15, 1.6, easeOut) * setOut;
  const ivory = lerp(0.62, 0.07, ease(t, 0.15, 3.2, easeOut)) * setOut;
  const s = pushScale(tAbs); const d = dotAt(t);
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite }}>
      <LightPools t={t} ivory={ivory} cyan={0.08 * panels} />
      <GlassPanels t={t} alpha={panels} />
      {/* type layer + the amber point share the slow push-in */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: `${PUSH_ORIGIN.x}px ${PUSH_ORIGIN.y}px` }}>
        <Sequence from={0} durationInFrames={sec(18)} layout="none">
          <OffthreadVideo src={staticFile('hf/line.mov')} transparent muted style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920 }} />
        </Sequence>
        <AmberDot x={d.x} y={d.y} r={d.r} alpha={d.alpha} />
      </div>
      {/* open from the door's light */}
      <Dip alpha={1 - ease(t, 0, 0.8, easeOut)} color={PALETTE.ivory} />
    </AbsoluteFill>
  );
};
