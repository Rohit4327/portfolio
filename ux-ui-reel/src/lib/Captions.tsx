// Word-level kinetic captions driven by the narration timing. Current word pops in amber; the group stays until the next group.
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { WORDS, SENTENCES } from '../timeline';
import { PALETTE, FONT } from './theme';
type Group = { words: typeof WORDS; s: number; e: number };
const GROUPS: Group[] = (() => {
  const out: Group[] = [];
  for (const s of SENTENCES) {
    let cur: typeof WORDS = [];
    const flush = () => { if (cur.length) { out.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } };
    for (const w of s.words) {
      cur.push({ ...w, si: s.i });
      const chars = cur.reduce((a, x) => a + x.w.length + 1, 0);
      if (cur.length >= 4 || chars > 22 || /[.!?:]$/.test(w.w)) flush();
    }
    flush();
  }
  return out;
})();
export const Captions: React.FC<{ tAbs: number; y?: number; size?: number; hide?: boolean; align?: 'center' | 'left' }> = ({ tAbs, y = 1430, size = 74, hide = false, align = 'center' }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  if (hide) return null;
  const g = GROUPS.find((x) => tAbs >= x.s - 0.08 && tAbs < x.e + 0.45);
  if (!g) return null;
  const appear = spring({ frame: Math.max(0, Math.round((tAbs - g.s + 0.08) * fps)), fps, config: { damping: 16, stiffness: 220, mass: 0.8 } });
  return (
    <div style={{ position: 'absolute', left: 72, right: 72, top: y, display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: '0 22px', fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.12, letterSpacing: -1.5, transform: `translateY(${(1 - appear) * 22}px)`, opacity: appear, textShadow: '0 6px 30px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)' }}>
      {g.words.map((w, i) => {
        const on = tAbs >= w.s - 0.03; const k = spring({ frame: Math.max(0, Math.round((tAbs - w.s + 0.03) * fps)), fps, config: { damping: 12, stiffness: 260, mass: 0.6 } });
        const sc = on ? 1 + 0.08 * (1 - Math.min(1, k)) : 1;
        return <span key={i} style={{ display: 'inline-block', color: on ? (tAbs < w.e + 0.05 ? PALETTE.amber : PALETTE.ivory) : 'rgba(246,242,232,0.42)', transform: `scale(${sc})`, transformOrigin: '50% 80%' }}>{w.w}</span>;
      })}
    </div>
  );
};
