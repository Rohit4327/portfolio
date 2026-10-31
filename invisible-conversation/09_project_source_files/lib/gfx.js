// 2D overlay helpers (Canvas 2D). Typography: Inter (installed system-wide). All text is real text rendering.
import { W, H, PALETTE } from './stage.js';
import { clamp, lerp, seg, easeInOut, easeOut, hash } from './util.js';

export const font = (weight, size, family = 'Inter') => `${weight} ${size}px ${family}`;

export function text(ctx, str, x, y, o = {}) {
  const { size = 32, weight = 500, family = 'Inter', color = PALETTE.ivory, align = 'left', baseline = 'alphabetic', tracking = 0, alpha = 1, shadow = 0 } = o;
  if (alpha <= 0 || !str) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font(weight, size, family); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.letterSpacing = tracking ? `${tracking}px` : '0px';
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = shadow; ctx.shadowOffsetY = shadow * 0.3; }
  ctx.fillText(str, x, y); ctx.restore();
}
export function measure(ctx, str, o = {}) {
  const { size = 32, weight = 500, family = 'Inter', tracking = 0 } = o;
  ctx.save(); ctx.font = font(weight, size, family); ctx.letterSpacing = tracking ? `${tracking}px` : '0px';
  const m = ctx.measureText(str); ctx.restore(); return m.width;
}
export function wrapText(ctx, str, maxWidth, o = {}) {
  const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (measure(ctx, test, o) > maxWidth && cur) { lines.push(cur); cur = w; } else cur = test; }
  if (cur) lines.push(cur); return lines;
}
export function paragraph(ctx, str, x, y, maxWidth, o = {}) {
  const lines = wrapText(ctx, str, maxWidth, o); const lh = (o.size || 32) * (o.lineHeight || 1.35);
  lines.forEach((l, i) => text(ctx, l, x, y + i * lh, o)); return lines.length * lh;
}
// Small-caps tracked label, e.g. "HUMAN FACTORS"
export function caps(ctx, str, x, y, o = {}) {
  text(ctx, String(str).toUpperCase(), x, y, { size: 22, weight: 600, color: PALETTE.amber, tracking: 4.2, ...o });
}
// Big year, Inter Display light
export function yearStamp(ctx, year, x, y, alpha = 1, o = {}) {
  text(ctx, year, x, y, { size: 150, weight: 300, family: 'Inter Display', color: PALETTE.ivory, alpha, tracking: -2, ...o });
}
// Elegant lower third: accent bar + title + subtitle (+ optional source line)
export function lowerThird(ctx, { title, sub, source, accent = PALETTE.amber, x = 120, y = H - 150, alpha = 1, width = 900, reveal = 1 }) {
  if (alpha <= 0) return;
  const r = easeOut(clamp(reveal));
  ctx.save(); ctx.globalAlpha *= alpha;
  const barH = 56 * r;
  ctx.fillStyle = accent; ctx.fillRect(x, y - 10 - barH, 3, barH);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 14, y - 80, width * r, 100); ctx.clip();
  text(ctx, title, x + 28, y - 30, { size: 34, weight: 600, color: PALETTE.ivory });
  if (sub) text(ctx, sub, x + 28, y + 4, { size: 22, weight: 400, color: PALETTE.gray });
  ctx.restore();
  if (source) text(ctx, source, x + 28, y + 34, { size: 16, weight: 400, color: PALETTE.gray2, alpha: r });
  ctx.restore();
}
// Outline pill badge used for provenance: "ILLUSTRATIVE RECONSTRUCTION", "CONTEMPORARY VISUALIZATION", "SPECULATIVE CONCEPT"
export function badge(ctx, label, x, y, alpha = 1, o = {}) {
  if (alpha <= 0) return;
  const { color = PALETTE.gray, size = 15, align = 'left' } = o;
  const w = measure(ctx, label, { size, weight: 600, tracking: 2.2 }) + 36, h = 32;
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.save(); ctx.globalAlpha *= alpha; roundRect(ctx, x0, y - h / 2, w, h, 16); ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
  text(ctx, label, x0 + w / 2 - 1, y + size * 0.36, { size, weight: 600, color, align: 'center', tracking: 2.2 });
  ctx.restore();
}
export const BADGE = { RECON: 'ILLUSTRATIVE RECONSTRUCTION', VIS: 'CONTEMPORARY VISUALIZATION', CONCEPT: 'SPECULATIVE CONCEPT', FICTIONAL: 'FICTIONAL EXAMPLE', DIAGRAM: 'DIAGRAM' };

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function fillRoundRect(ctx, x, y, w, h, r, fill, stroke, lw = 1) { roundRect(ctx, x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }

// Centered title card (used for film title and closing)
export function titleCard(ctx, title, sub, alpha = 1, { y = H / 2, color = PALETTE.ivory, size = 92, subColor = PALETTE.amber, tracking = 1 } = {}) {
  if (alpha <= 0) return;
  text(ctx, title, W / 2, y, { size, weight: 300, family: 'Inter Display', color, align: 'center', alpha, tracking });
  if (sub) text(ctx, sub, W / 2, y + size * 0.62, { size: 22, weight: 600, color: subColor, align: 'center', alpha, tracking: 6 });
}
export function vignette(ctx, k = 0.55) {
  if (k <= 0) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
let _noise = null;
function noiseTile() {
  if (_noise) return _noise;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); const img = x.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const v = Math.floor(hash(i + 0.5) * 255); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0); _noise = c; return c;
}
// deterministic film grain keyed on frame index
export function grain(ctx, frame, amount = 0.035) {
  if (amount <= 0) return;
  const tile = noiseTile(); const ox = Math.floor(hash(frame * 1.7 + 3) * 256), oy = Math.floor(hash(frame * 2.3 + 11) * 256);
  ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
  for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(tile, x, y);
  ctx.restore();
}
// Amber bloom transition: k in [0,1] grows from a point at (cx,cy) to cover the screen.
export function bloom(ctx, k, { cx = W / 2, cy = H / 2, color = [255, 171, 91] } = {}) {
  k = clamp(k); if (k <= 0) return;
  const e = easeInOut(k); const r = lerp(10, Math.hypot(W, H) * 0.8, e);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const [R, G, B] = color;
  g.addColorStop(0, `rgba(${R},${G},${B},1)`); g.addColorStop(0.55, `rgba(${R},${G},${B},${0.95 * e})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 2.5); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// Full-screen solid dip (to graphite or ivory)
export function dip(ctx, alpha, color = PALETTE.graphite) { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// Classic arrow pointer (GUI eras). style: 'arrow' (black/white), 'xerox' (hollow), 'hand'
export function cursor(ctx, x, y, { scale = 1, style = 'arrow', alpha = 1, color = '#F2F3F5', outline = '#0D1016' } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  if (style === 'hand') { ctx.beginPath(); roundRect(ctx, -8, -4, 16, 22, 6); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillRect(-3, -14, 6, 14); ctx.strokeRect(-3, -14, 6, 14); }
  else { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 24); ctx.lineTo(6, 19); ctx.lineTo(10, 28); ctx.lineTo(14, 26); ctx.lineTo(10, 18); ctx.lineTo(17, 17); ctx.closePath(); ctx.fillStyle = style === 'xerox' ? 'rgba(0,0,0,0)' : color; ctx.fill(); ctx.strokeStyle = style === 'xerox' ? color : outline; ctx.lineWidth = 1.6; ctx.stroke(); }
  ctx.restore();
}
// Measurement guide (ergonomics diagrams): line with end ticks + centered label
export function dimension(ctx, x1, y1, x2, y2, label, { color = PALETTE.cyan, alpha = 1, size = 18 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1), tx = Math.cos(a + Math.PI / 2) * 7, ty = Math.sin(a + Math.PI / 2) * 7;
  for (const [px, py] of [[x1, y1], [x2, y2]]) { ctx.beginPath(); ctx.moveTo(px - tx, py - ty); ctx.lineTo(px + tx, py + ty); ctx.stroke(); }
  if (label) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const w = measure(ctx, label, { size, weight: 500 }) + 16; fillRoundRect(ctx, mx - w / 2, my - size * 0.9, w, size * 1.5, 4, 'rgba(13,16,22,0.85)'); text(ctx, label, mx, my + size * 0.25, { size, weight: 500, color, align: 'center' }); }
  ctx.restore();
}
export function arrow(ctx, x1, y1, x2, y2, { color = PALETTE.amber, alpha = 1, width = 2, head = 10 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)); ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
}
// Glowing amber dot in 2D (the narrative point when it lives on the overlay)
export function amberDot(ctx, x, y, r = 10, alpha = 1, { color = PALETTE.amber, glow = 6 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * glow); g.addColorStop(0, 'rgba(255,171,91,0.55)'); g.addColorStop(0.3, 'rgba(255,171,91,0.18)'); g.addColorStop(1, 'rgba(255,171,91,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * glow, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFE1BF'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// Subtle caption line at bottom-right for provenance / citations
export function citation(ctx, str, alpha = 1) { text(ctx, str, W - 120, H - 70, { size: 16, weight: 400, color: PALETTE.gray2, align: 'right', alpha }); }
