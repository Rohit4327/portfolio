// Timing + math helpers. All animation is a pure function of t (seconds).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const mix = lerp;
export const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
// progress in [0,1] between t0 and t1 (clamped)
export const seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
export const easeInOut = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // cubic
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k) => k * k * k;
export const easeOutExpo = (k) => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k);
export const easeOutBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
export const easeInOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;
// eased progress between t0 and t1
export const ease = (t, t0, t1, fn = easeInOut) => fn(seg(t, t0, t1));
// 1 while inside [t0,t1], fading in over `fi` seconds at the start and out over `fo` seconds at the end
export const window01 = (t, t0, t1, fi = 0.5, fo = 0.5) => {
  if (t < t0 || t > t1) return 0;
  return Math.min(seg(t, t0, t0 + fi), seg(t1, t, t - fo) ? 1 - seg(t, t1 - fo, t1) : 1);
};
export const fadeIO = (t, t0, t1, fi = 0.5, fo = 0.5) => {
  if (t <= t0 || t >= t1) return 0;
  const a = clamp((t - t0) / fi), b = clamp((t1 - t) / fo);
  return Math.min(a, b);
};
// deterministic hash noise in [0,1)
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const hash2 = (x, y) => hash(x * 7.13 + y * 157.31);
// smooth 1D noise (value noise) for subtle organic motion
export const noise1 = (x) => { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
export const fmt2 = (n) => String(n).padStart(2, '0');
export const deg = (d) => d * Math.PI / 180;
