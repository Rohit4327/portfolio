// Shared pieces for the LINE and OUTRO beats: the amber point's path over the kinetic type (it lands as every full stop),
// the slow push-in applied to the type layer, and the DOM-3D glass panel parallax behind the type.
// Layout constants mirror hyperframes/line/index.html (text widths measured in Chrome: Inter Display 800, tracking −0.04em).
import React from 'react';
import { PALETTE } from '../lib/theme';
import { clamp, easeInOut, lerp, seg, noise1 } from '../lib/anim';
import { beat, wordAt, local } from '../timeline';

export const LINE = beat('line');
const L = (sentence: string, word: string) => local('line', wordAt(sentence, word));
/** word times, LOCAL to the line beat (identical to the W table in the HyperFrames segment) */
export const W = {
  UI: L('UI makes a product', 'UI'), usable: L('UI makes a product', 'usable'), UX: L('UI makes a product', 'UX'), worth: L('UI makes a product', 'worth'), using: L('UI makes a product', 'using'),
  pixel: L('Pixel-perfect means', 'Pixel-perfect'), means: L('Pixel-perfect means', 'means'), nothing: L('Pixel-perfect means', 'nothing'), finish: L('Pixel-perfect means', 'finish'), task: L('Pixel-perfect means', 'task'),
  and: L('flawless flow', 'And'), flawless: L('flawless flow', 'flawless'), flow: L('flawless flow', 'flow'), needs: L('flawless flow', 'needs'), interface: L('flawless flow', 'interface'), enjoy: L('flawless flow', 'enjoy'),
  design: L('Design both', 'Design'), both: L('Design both', 'both'), test: L('Design both', 'Test'), people: L('Design both', 'people'), then: L('Design both', 'Then'), again: L('Design both', 'again'),
  end: LINE.end - LINE.start,
};

/** The amber point: arrival keyframes (local s). `d` = travel time before arrival. Positions are full stops / rule tips. */
type Key = { t: number; x: number; y: number; r: number; d: number; arc?: number };
export const DOT_KEYS: Key[] = [
  { t: -1, x: 540, y: 960, r: 20, d: 0 },                        // the door beat hands the point off from the centre (its 16-frame fade)
  { t: W.usable + 0.25, x: 636, y: 759, r: 11, d: 0.7, arc: -130 }, // ...then one glide to the full stop of USABLE.
  { t: W.using + 0.26, x: 995, y: 1303, r: 10, d: 0.38, arc: 90 }, // WORTH USING.
  { t: W.means, x: 72, y: 495, r: 9, d: 0.5, arc: -120 },         // strike 1 start
  { t: W.means + 0.26, x: 629, y: 495, r: 9, d: 0.26 },           // strike 1 end
  { t: W.nothing, x: 72, y: 695, r: 9, d: 0.08 },                 // strike 2 start
  { t: W.nothing + 0.28, x: 866, y: 695, r: 9, d: 0.28 },         // strike 2 end
  { t: W.task + 0.05, x: 72, y: 1213, r: 9, d: 0.5, arc: 110 },   // underline start
  { t: W.task + 0.45, x: 831, y: 1213, r: 9, d: 0.4 },            // underline end
  { t: W.interface, x: 72, y: 801, r: 9, d: 0.5, arc: -140 },     // cyan hairline start
  { t: W.interface + 0.45, x: 502, y: 801, r: 9, d: 0.45 },       // cyan hairline end
  { t: W.enjoy + 0.3, x: 933, y: 1074, r: 18, d: 0.3, arc: 60 },  // ENJOY.
  { t: W.design - 0.02, x: 72, y: 557, r: 9, d: 0.4, arc: -160 }, // amber rule start
  { t: W.design + 0.48, x: 1008, y: 557, r: 9, d: 0.5 },          // amber rule end
  { t: W.both + 0.28, x: 783, y: 689, r: 9, d: 0.2, arc: 30 },    // DESIGN BOTH.
  { t: W.people + 0.16, x: 778, y: 967, r: 9, d: 0.25, arc: 40 }, // REAL PEOPLE.
  { t: W.again + 0.16, x: 699, y: 1129, r: 9, d: 0.25, arc: 40 }, // DO IT AGAIN.
];
export const dotAt = (t: number) => {
  const K = DOT_KEYS; let i = 0; while (i < K.length - 1 && t >= K[i + 1].t) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  const pulse = 1 + 0.06 * Math.sin(t * 5.2) + 0.02 * (noise1(t * 2.3) - 0.5);
  if (a === b || t < b.t - b.d) return { x: a.x, y: a.y, r: a.r * pulse, alpha: clamp((t + 0.1) / 0.45) };
  const k = easeInOut(seg(t, b.t - b.d, b.t)); const bump = Math.sin(Math.PI * k) * (b.arc ?? 0);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1; const nx = -dy / len, ny = dx / len;
  return { x: lerp(a.x, b.x, k) + nx * bump, y: lerp(a.y, b.y, k) + ny * bump, r: lerp(a.r, b.r, k) * pulse * (1 + 0.25 * Math.sin(Math.PI * k)), alpha: 1 };
};
/** slow push-in on the type layer across the final hold (absolute s) — the outro keeps the end value so its first frames match */
export const PUSH_ORIGIN = { x: 540, y: 860 };
export const pushScale = (tAbs: number) => 1 + 0.035 * easeInOut(seg(tAbs, LINE.end - 2.6, LINE.end));
export const pushed = (p: { x: number; y: number }, s: number) => ({ x: PUSH_ORIGIN.x + (p.x - PUSH_ORIGIN.x) * s, y: PUSH_ORIGIN.y + (p.y - PUSH_ORIGIN.y) * s });

/** translucent glass panels in a CSS-3D stage, drifting with a slow dolly + a breath of handheld; cyan/ivory edges */
const PANELS = [
  { x: -560, y: -520, z: -900, w: 620, h: 860, ry: 22, rx: -4, blur: 3, a: 0.9, seed: 1 },
  { x: 420, y: -700, z: -650, w: 520, h: 720, ry: -18, rx: 6, blur: 2.5, a: 0.85, seed: 2 },
  { x: 380, y: 300, z: -400, w: 460, h: 640, ry: -26, rx: -3, blur: 1.5, a: 0.9, seed: 3 },
  { x: -620, y: 420, z: -250, w: 540, h: 720, ry: 20, rx: 5, blur: 1, a: 0.85, seed: 4 },
  { x: -300, y: -120, z: 260, w: 420, h: 560, ry: 30, rx: -8, blur: 7, a: 0.55, seed: 5 },
  { x: 560, y: 900, z: 380, w: 480, h: 420, ry: -34, rx: 10, blur: 9, a: 0.5, seed: 6 },
];
export const GlassPanels: React.FC<{ t: number; alpha: number }> = ({ t, alpha }) => {
  if (alpha <= 0) return null;
  const rotY = (noise1(t * 0.18 + 2) - 0.5) * 3.2, rotX = (noise1(t * 0.15 + 9) - 0.5) * 2.2;
  const dolly = -40 + 120 * seg(t, 0, W.end + 0.6) + (noise1(t * 0.3 + 5) - 0.5) * 20;
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 1500, perspectiveOrigin: '50% 46%', opacity: alpha, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 540, top: 960, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translateZ(${dolly}px) rotateX(${rotX}deg) rotateY(${rotY}deg)` }}>
        {PANELS.map((p, i) => {
          const fx = (noise1(t * 0.12 + p.seed * 7.1) - 0.5) * 60, fy = (noise1(t * 0.1 + p.seed * 3.3) - 0.5) * 70;
          const spec = 10 + 80 * noise1(t * 0.07 + p.seed);
          return (
            <div key={i} style={{ position: 'absolute', left: p.x + fx, top: p.y + fy, width: p.w, height: p.h, transform: `translateZ(${p.z}px) rotateY(${p.ry}deg) rotateX(${p.rx}deg)`, borderRadius: 34, opacity: p.a, filter: `blur(${p.blur}px)`,
              background: 'linear-gradient(158deg, rgba(246,242,232,0.075) 0%, rgba(128,201,248,0.035) 42%, rgba(128,201,248,0.0) 70%, rgba(246,242,232,0.03) 100%)',
              boxShadow: 'inset 0 0 0 1.5px rgba(128,201,248,0.22), inset 0 2px 0 rgba(246,242,232,0.42), inset -2px 0 0 rgba(128,201,248,0.14), 0 60px 140px rgba(0,0,0,0.45)' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 34, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: `${spec}%`, top: -40, width: 70, height: p.h + 80, transform: 'skewX(-18deg)', background: 'linear-gradient(90deg, rgba(246,242,232,0) 0%, rgba(246,242,232,0.11) 50%, rgba(246,242,232,0) 100%)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', background: 'linear-gradient(180deg, rgba(128,201,248,0) 0%, rgba(128,201,248,0.05) 100%)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
/** soft lighting pools (the ivory light the door beat ended in, decaying; a cool cyan fill low right) */
export const LightPools: React.FC<{ t: number; ivory: number; cyan?: number }> = ({ t, ivory, cyan = 0.07 }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: ivory, background: `radial-gradient(ellipse 760px 980px at ${260 + (noise1(t * 0.2) - 0.5) * 60}px 420px, rgba(246,242,232,0.85) 0%, rgba(246,242,232,0.25) 40%, rgba(246,242,232,0) 100%)` }} />
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: cyan, background: 'radial-gradient(ellipse 700px 900px at 900px 1500px, rgba(128,201,248,0.9) 0%, rgba(128,201,248,0) 100%)' }} />
  </>
);
export const AMBER = PALETTE.amber;
