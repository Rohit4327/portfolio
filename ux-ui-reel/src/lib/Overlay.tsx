// 2D overlays rendered in the DOM above the 3D/HTML layers: film grain (deterministic per frame), vignette, dips and the amber bloom.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { PALETTE } from './theme';
import { clamp, easeInOut, lerp } from './anim';
export const Grain: React.FC<{ amount?: number }> = ({ amount = 0.07 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity: amount }}>
      <svg width="100%" height="100%"><filter id={`g${f}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 977} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter><rect width="100%" height="100%" filter={`url(#g${f})`} /></svg>
    </AbsoluteFill>
  );
};
export const VignetteOverlay: React.FC<{ k?: number }> = ({ k = 0.5 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${k}) 100%)` }} />
);
export const Dip: React.FC<{ alpha: number; color?: string }> = ({ alpha, color = PALETTE.graphite }) => (alpha <= 0 ? null : <AbsoluteFill style={{ background: color, opacity: clamp(alpha), pointerEvents: 'none' }} />);
/** The film's signature amber bloom: k 0→1 grows from (cx,cy) to cover the frame. */
export const Bloom2D: React.FC<{ k: number; cx?: number; cy?: number }> = ({ k, cx = 540, cy = 960 }) => {
  k = clamp(k); if (k <= 0) return null;
  const e = easeInOut(k); const r = lerp(16, 2600, e);
  return <AbsoluteFill style={{ pointerEvents: 'none', opacity: Math.min(1, k * 2.5), background: `radial-gradient(circle ${r}px at ${cx}px ${cy}px, rgba(255,171,91,1) 0%, rgba(255,171,91,${0.95 * e}) 55%, rgba(255,171,91,0) 100%)` }} />;
};
/** Soft amber point as a DOM element (for 2D beats) */
export const AmberDot: React.FC<{ x: number; y: number; r?: number; alpha?: number; glow?: number }> = ({ x, y, r = 14, alpha = 1, glow = 7 }) => (
  <div style={{ position: 'absolute', left: x - r * glow, top: y - r * glow, width: r * glow * 2, height: r * glow * 2, pointerEvents: 'none', opacity: alpha, background: `radial-gradient(circle, rgba(255,225,191,1) 0 ${r * 0.5}px, rgba(255,171,91,1) ${r * 0.72}px, rgba(255,171,91,0.55) ${r}px, rgba(255,171,91,0.18) ${r * 2.2}px, rgba(255,171,91,0) ${r * glow}px)`, borderRadius: '50%' }} />
);
