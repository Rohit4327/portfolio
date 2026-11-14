import { interpolate, spring, Easing } from 'remotion';
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const seg = (t: number, t0: number, t1: number) => clamp((t - t0) / (t1 - t0));
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k: number) => k * k * k;
export const easeOutExpo = (k: number) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
export const ease = (t: number, t0: number, t1: number, fn = easeInOut) => fn(seg(t, t0, t1));
/** 1 inside [t0,t1] with fades; 0 outside */
export const fadeIO = (t: number, t0: number, t1: number, fi = 0.4, fo = 0.4) => (t <= t0 || t >= t1 ? 0 : Math.min(clamp((t - t0) / fi), clamp((t1 - t) / fo)));
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const noise1 = (x: number) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
/** deterministic handheld drift (world units or px) */
export const drift = (t: number, amp = 1, speed = 0.4, seed = 0) => ({ x: (noise1(t * speed + seed) - 0.5) * 2 * amp, y: (noise1(t * speed * 1.3 + seed + 17) - 0.5) * 2 * amp });
/** remotion spring helper on a local-time basis: progress 0..1 that starts at tStart (seconds) */
export const pop = (frame: number, fps: number, tStart: number, opts: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - Math.round(tStart * fps), fps, config: { damping: opts.damping ?? 14, stiffness: opts.stiffness ?? 170, mass: opts.mass ?? 0.9 } });
export const smooth = (frame: number, fromF: number, toF: number, a = 0, b = 1) => interpolate(frame, [fromF, toF], [a, b], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
