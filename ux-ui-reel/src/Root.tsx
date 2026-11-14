import React from 'react';
import { Composition, Sequence, AbsoluteFill } from 'remotion';
import { Reel } from './Reel';
import { Debug } from './Debug';
import { BEATS, FPS, WIDTH, HEIGHT, TOTAL, sec, beatFrames, beat } from './timeline';
import { beats } from './beats';
import { Captions } from './lib/Captions';
import { Grain, VignetteOverlay } from './lib/Overlay';
import { useCurrentFrame, useVideoConfig } from 'remotion';
// Single-beat preview composition (captions included, absolute-time aware)
const BeatOnly: React.FC<{ id: string }> = ({ id }) => {
  const b = beat(id as any); const Comp = beats[b.id].Beat; const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  return (<AbsoluteFill style={{ background: '#0D1016' }}><Comp /><Captions tAbs={b.start + frame / fps} /><VignetteOverlay k={0.45} /><Grain amount={0.06} /></AbsoluteFill>);
};
export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={sec(TOTAL)} fps={FPS} width={WIDTH} height={HEIGHT} />
    {BEATS.map((b) => (<Composition key={b.id} id={`beat-${b.id}`} component={BeatOnly} defaultProps={{ id: b.id }} durationInFrames={beatFrames(b.id)} fps={FPS} width={WIDTH} height={HEIGHT} />))}
    {['plain','glopts','bg','fog','shadows','post','glopts+bg+fog+shadows+post'].map((m) => (<Composition key={m} id={`dbg-${m.replace(/\+/g,'-')}`} component={Debug} defaultProps={{ mode: m }} durationInFrames={10} fps={30} width={1080} height={1920} />))}
  </>
);
