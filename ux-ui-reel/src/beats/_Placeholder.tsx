import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useT } from '../lib/Stage3D';
import { PALETTE, FONT } from '../lib/theme';
export const makePlaceholder = (id: string, title: string): React.FC => () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: PALETTE.graphite2, color: PALETTE.ivory, fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 72, top: 300, fontSize: 40, fontWeight: 700, color: PALETTE.amber }}>{id.toUpperCase()}</div>
      <div style={{ position: 'absolute', left: 72, top: 360, fontSize: 56, fontWeight: 800, width: 936 }}>{title}</div>
      <div style={{ position: 'absolute', left: 72, top: 520, fontSize: 36, color: PALETTE.gray }}>placeholder · t = {t.toFixed(2)} s</div>
    </AbsoluteFill>
  );
};
export const cues = {};
