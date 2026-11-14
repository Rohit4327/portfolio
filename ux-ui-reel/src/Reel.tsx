// Master composition: beats laid end-to-end with @remotion/transitions, plus the global captions + grain/vignette overlays.
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, fade, slide, wipe, amberBloom } from './lib/transitions';
import { BEATS, sec, beatFrames } from './timeline';
import { beats } from './beats';
import { Captions } from './lib/Captions';
import { Grain, VignetteOverlay } from './lib/Overlay';
const presentation = (b: (typeof BEATS)[number]) => {
  const tr = beats[b.id].transition ?? { kind: 'bloom' as const, frames: 14 };
  const p: any = tr.kind === 'fade' ? fade() : tr.kind === 'slide' ? slide({ direction: 'from-bottom' }) : tr.kind === 'wipe' ? wipe({ direction: 'from-top-left' }) : amberBloom({ cx: tr.cx, cy: tr.cy });
  return { p, frames: tr.frames ?? 14 };
};
export const Reel: React.FC<{ captions?: boolean }> = ({ captions = true }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const tAbs = frame / fps;
  return (
    <AbsoluteFill style={{ background: '#0D1016' }}>
      <TransitionSeries>
        {BEATS.map((b, i) => {
          const last = i === BEATS.length - 1; const { p, frames } = presentation(b);
          const Comp = beats[b.id].Beat;
          // sequence length = beat length + the transition that follows it, so every beat starts at its absolute time
          return (
            <React.Fragment key={b.id}>
              <TransitionSeries.Sequence durationInFrames={beatFrames(b.id) + (last ? 0 : frames)}>
                <Comp />
              </TransitionSeries.Sequence>
              {!last ? <TransitionSeries.Transition presentation={p} timing={linearTiming({ durationInFrames: frames })} /> : null}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
      {captions ? <Captions tAbs={tAbs} /> : null}
      <VignetteOverlay k={0.45} />
      <Grain amount={0.06} />
    </AbsoluteFill>
  );
};
