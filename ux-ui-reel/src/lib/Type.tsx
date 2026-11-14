// Kinetic typography primitives (DOM). All animate from local time `t` (seconds) or remotion springs.
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { PALETTE, FONT, DISPLAY } from './theme';
import { clamp, easeOut, fadeIO } from './anim';
/** A line of words that slide up out of a mask, one word after another, starting at tStart (local s). */
export const SlideWords: React.FC<{ text: string; tStart: number; tEnd?: number; x?: number; y?: number; size?: number; weight?: number; color?: string; align?: 'left' | 'center' | 'right'; stagger?: number; family?: string; tracking?: number; width?: number }> = ({ text, tStart, tEnd = 1e9, x = 72, y = 800, size = 120, weight = 800, color = PALETTE.ivory, align = 'left', stagger = 0.07, family = DISPLAY, tracking = -4, width = 936 }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  const out = tEnd < 1e8 ? 1 - clamp((t - tEnd) / 0.35) : 1; if (out <= 0 || t < tStart) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', gap: `0 ${size * 0.22}px`, fontFamily: family, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: tracking, color, opacity: out }}>
      {text.split(' ').map((w, i) => {
        const k = spring({ frame: frame - Math.round((tStart + i * stagger) * fps), fps, config: { damping: 15, stiffness: 180, mass: 0.9 } });
        return <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.12 }}><span style={{ display: 'inline-block', transform: `translateY(${(1 - k) * 110}%)`, opacity: clamp(k * 1.4) }}>{w}</span></span>;
      })}
    </div>
  );
};
/** Small tracked caps label (section tag) */
export const Tag: React.FC<{ text: string; t: number; tStart: number; tEnd?: number; x?: number; y?: number; color?: string; size?: number }> = ({ text, t, tStart, tEnd = 1e9, x = 72, y = 300, color = PALETTE.amber, size = 26 }) => {
  const a = fadeIO(t, tStart, tEnd, 0.35, 0.3); if (a <= 0) return null;
  return <div style={{ position: 'absolute', left: x, top: y, fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: size * 0.22, color, opacity: a, transform: `translateY(${(1 - easeOut(clamp((t - tStart) / 0.35))) * 10}px)` }}>{text.toUpperCase()}</div>;
};
/** Big number/word punch with slight overshoot */
export const Punch: React.FC<{ text: string; tStart: number; tEnd?: number; x?: number; y?: number; size?: number; color?: string; weight?: number; align?: 'left' | 'center' }> = ({ text, tStart, tEnd = 1e9, x = 540, y = 900, size = 200, color = PALETTE.ivory, weight = 800, align = 'center' }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  if (t < tStart) return null; const k = spring({ frame: frame - Math.round(tStart * fps), fps, config: { damping: 11, stiffness: 240, mass: 0.7 } });
  const out = 1 - clamp((t - tEnd) / 0.3); if (out <= 0) return null;
  return <div style={{ position: 'absolute', left: align === 'center' ? 0 : x, right: align === 'center' ? 0 : undefined, top: y, textAlign: align, fontFamily: DISPLAY, fontWeight: weight, fontSize: size, letterSpacing: -size * 0.04, lineHeight: 0.95, color, transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.5) * out, transformOrigin: align === 'center' ? '50% 50%' : '0% 50%' }}>{text}</div>;
};
/** Pill badge (provenance / category) */
export const Pill: React.FC<{ text: string; x?: number; y?: number; alpha?: number; color?: string }> = ({ text, x = 72, y = 1700, alpha = 1, color = PALETTE.gray }) => (
  <div style={{ position: 'absolute', left: x, top: y, padding: '10px 18px', border: `1.5px solid ${color}`, borderRadius: 999, fontFamily: FONT, fontWeight: 700, fontSize: 18, letterSpacing: 3, color, opacity: alpha }}>{text.toUpperCase()}</div>
);
