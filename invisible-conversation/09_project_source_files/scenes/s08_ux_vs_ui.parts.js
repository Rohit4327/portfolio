// SCENE 08 helpers — the fictional shop "Nordlys" (invented brand, abstract products) rendered as a crisp 2D UI,
// plus the component-library tiles used for the closing dissolve. Everything here is a pure function of a state object.
import { PALETTE } from '../lib/stage.js';
import { text, measure, roundRect, fillRoundRect } from '../lib/gfx.js';
import { clamp, lerp, seg, easeOut, easeInOut } from '../lib/util.js';

export const SW = 1320, SH = 824; // slab size in UI pixels (drawn 1:1 on the overlay)
const INK = PALETTE.graphite, INK2 = PALETTE.gray2, INK3 = PALETTE.gray, PAPER = PALETTE.ivory, PAPER2 = PALETTE.ivory2;
const HAIR = 'rgba(13,16,22,0.10)', CARD = 'rgba(255,255,255,0.55)', CARD_HAIR = 'rgba(13,16,22,0.07)';
export const RED = '#E8625A'; // the only non-palette colour: the spec asks for a red ✕ on the hidden-cost step
export const CYAN_D = PALETTE.cyanDeep;

const tx = (ctx, s, x, y, o = {}) => text(ctx, s, x, y, { color: INK, weight: 500, size: 18, ...o });

// ---------------------------------------------------------------- layout (UI px, slab-local)
export const L = {
  nav: { h: 76, brandX: 56, bag: { x: 1236, y: 38 }, search: { x: 1172, y: 38 } },
  pdp: {
    tile: { x: 56, y: 116, w: 520, h: 520 }, col: { x: 640, w: 520 },
    eyebrowY: 164, titleY: 220, priceY: 278, deliveryY: 316, descY: 362, colourY: 442, swatchY: 488,
    btn: { x: 640, y: 544, w: 520, h: 60 }, noteY: 652,
    rowLabelY: 680, thumbY: 704, thumbCells: [56, 456, 856],
  },
  co: {
    stepperY: 130, labelY: 172, steps3: [160, 438, 716], steps2: [300, 576],
    content: { x: 56, y: 206, w: 764, h: 578 }, summary: { x: 868, y: 206, w: 396, h: 352 },
    btn: { x: 88, y: 702, w: 700, h: 60 }, back: { x: 88, y: 262 },
  },
};
// handy centres for the cursor path
export const PT = {
  addBtn: { x: L.pdp.btn.x + L.pdp.btn.w / 2, y: L.pdp.btn.y + L.pdp.btn.h / 2 },
  bag: { x: L.nav.bag.x, y: L.nav.bag.y },
  cont: { x: L.co.btn.x + L.co.btn.w / 2, y: L.co.btn.y + L.co.btn.h / 2 },
  back: { x: L.co.back.x + 70, y: L.co.back.y - 6 },
  delivery: { x: L.pdp.col.x + 110, y: L.pdp.deliveryY - 8 },
  summaryDelivery: { x: L.co.summary.x + L.co.summary.w / 2, y: L.co.summary.y + 232 },
  stepper3: { x: 438, y: L.co.stepperY },
  stepper2: { x: 438, y: L.co.stepperY },
  confirm: { x: L.co.content.x + L.co.content.w / 2, y: L.co.content.y + 190 },
  swatches: { x: L.pdp.col.x + 66, y: L.pdp.swatchY },
  title: { x: L.pdp.col.x + 180, y: L.pdp.titleY - 16 },
};

// ---------------------------------------------------------------- glyphs
function bagGlyph(ctx, x, y, color = INK, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
  roundRect(ctx, -11, -5, 22, 19, 4); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -5, 6.5, Math.PI, 0); ctx.stroke(); ctx.restore();
}
function searchGlyph(ctx, x, y, color = INK) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x - 2, y - 2, 7.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 3.5, y + 3.5); ctx.lineTo(x + 9, y + 9); ctx.stroke(); ctx.restore();
}
function lockGlyph(ctx, x, y, color = INK2) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y - 4, 5, Math.PI, 0); ctx.stroke(); fillRoundRect(ctx, x - 7.5, y - 4, 15, 11, 2.5, color); ctx.restore();
}
export function checkGlyph(ctx, x, y, s = 1, color = PAPER, lw = 2.4) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  ctx.moveTo(x - 6 * s, y); ctx.lineTo(x - 1.5 * s, y + 4.5 * s); ctx.lineTo(x + 7 * s, y - 5 * s); ctx.stroke(); ctx.restore();
}
export function crossGlyph(ctx, x, y, s = 1, color = RED, lw = 2.4) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(x - 5 * s, y - 5 * s); ctx.lineTo(x + 5 * s, y + 5 * s); ctx.moveTo(x + 5 * s, y - 5 * s); ctx.lineTo(x - 5 * s, y + 5 * s); ctx.stroke(); ctx.restore();
}
function radio(ctx, x, y, on) {
  ctx.save(); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.strokeStyle = on ? CYAN_D : INK3; ctx.stroke();
  if (on) { ctx.fillStyle = CYAN_D; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
}
function hairline(ctx, x, y, w, color = HAIR) { ctx.save(); ctx.fillStyle = color; ctx.fillRect(x, y, w, 1); ctx.restore(); }
function truckGlyph(ctx, x, y, color = INK2) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.rect(x - 9, y - 6, 11, 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2, y - 3); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 9, y); ctx.lineTo(x + 9, y + 3); ctx.lineTo(x + 2, y + 3); ctx.stroke();
  ctx.fillStyle = color; for (const cx of [x - 5, x + 5]) { ctx.beginPath(); ctx.arc(cx, y + 4.5, 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
}

// ---------------------------------------------------------------- product art (abstract, soft gradients)
export function lampArt(ctx, x, y, w, h, r = 22) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h); g.addColorStop(0, '#EFE9DC'); g.addColorStop(1, PALETTE.beige);
  fillRoundRect(ctx, x, y, w, h, r, g);
  ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip();
  const cx = x + w / 2, cy = y + h * 0.42;
  const rg = ctx.createRadialGradient(cx, cy + h * 0.02, 1, cx, cy + h * 0.02, w * 0.5);
  rg.addColorStop(0, 'rgba(255,171,91,0.6)'); rg.addColorStop(0.45, 'rgba(255,171,91,0.16)'); rg.addColorStop(1, 'rgba(255,171,91,0)');
  ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
  // stem, then base over it
  fillRoundRect(ctx, cx - w * 0.012, cy + h * 0.06, w * 0.024, h * 0.80 - (cy - y), w * 0.012, PALETTE.graphite3);
  ctx.fillStyle = 'rgba(13,16,22,0.12)'; ctx.beginPath(); ctx.ellipse(cx, y + h * 0.86, w * 0.2, h * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(cx, y + h * 0.845, w * 0.16, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  // shade: a soft dome
  ctx.shadowColor = 'rgba(13,16,22,0.22)'; ctx.shadowBlur = w * 0.08; ctx.shadowOffsetY = h * 0.03;
  ctx.fillStyle = '#FBF7EE'; ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.03, w * 0.3, h * 0.165, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const sg = ctx.createLinearGradient(0, cy - h * 0.2, 0, cy + h * 0.14); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,171,91,0.35)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.03, w * 0.3, h * 0.165, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function throwArt(ctx, x, y, w, h, r = 14) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, PALETTE.beige); g.addColorStop(1, '#EFE9DC');
  fillRoundRect(ctx, x, y, w, h, r, g); ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip();
  ctx.strokeStyle = 'rgba(201,191,166,0.75)'; ctx.lineWidth = w * 0.09;
  for (let i = -1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * w * 0.32, y + h); ctx.lineTo(x + i * w * 0.32 + w * 0.6, y); ctx.stroke(); }
  ctx.restore();
}
function carafeArt(ctx, x, y, w, h, r = 14) {
  fillRoundRect(ctx, x, y, w, h, r, PAPER2); ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y); g.addColorStop(0, PALETTE.graphite3); g.addColorStop(1, PALETTE.gray);
  const bw = w * 0.42, bh = h * 0.66; ctx.fillStyle = g; roundRect(ctx, x + w / 2 - bw / 2, y + h * 0.22, bw, bh, bw * 0.3); ctx.fill();
  fillRoundRect(ctx, x + w / 2 - bw * 0.22, y + h * 0.1, bw * 0.44, h * 0.16, 4, PALETTE.graphite3);
  ctx.restore();
}
function trayArt(ctx, x, y, w, h, r = 14) {
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(128,201,248,0.45)'); g.addColorStop(1, PAPER2);
  fillRoundRect(ctx, x, y, w, h, r, g); ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip();
  fillRoundRect(ctx, x + w * 0.18, y + h * 0.3, w * 0.64, h * 0.42, 10, '#F3EFE6'); fillRoundRect(ctx, x + w * 0.24, y + h * 0.36, w * 0.52, h * 0.3, 7, 'rgba(128,201,248,0.25)');
  ctx.restore();
}
const THUMBS = [['Fjell Throw', '€120', throwArt], ['Dusk Carafe', '€48', carafeArt], ['Skog Tray', '€36', trayArt]];

// ---------------------------------------------------------------- controls
// state: default | hover | pressed | added | processing | confirmed | ghost ; k: 0..1 for pop animations; spin: angle
export function button(ctx, r, label, state = 'default', { k = 1, spin = 0, size = 20, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2; let scale = 1, dy = 0, fill = INK;
  if (state === 'hover') { fill = PALETTE.graphite3; dy = -2; ctx.shadowColor = 'rgba(13,16,22,0.28)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10; }
  if (state === 'pressed') { fill = PALETTE.graphite2; scale = 0.972; }
  if (state === 'added') { scale = 1 + 0.045 * Math.sin(Math.PI * clamp(k)); }
  ctx.translate(cx, cy + dy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
  if (state === 'ghost') { fillRoundRect(ctx, r.x, r.y, r.w, r.h, 14, null, INK, 1.5); tx(ctx, label, cx, cy + 7, { size, weight: 600, align: 'center' }); ctx.restore(); return; }
  fillRoundRect(ctx, r.x, r.y, r.w, r.h, 14, fill); ctx.shadowColor = 'transparent';
  if (state === 'added' || state === 'confirmed') {
    const w = measure(ctx, label, { size, weight: 600 }); const x0 = cx - (w + 34) / 2;
    const pop = state === 'added' ? easeOut(clamp(k * 1.6)) : 1;
    ctx.save(); ctx.translate(x0 + 11, cy); ctx.scale(pop, pop); ctx.fillStyle = PALETTE.green; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, 0, 0.5, 0.85, INK, 2.2); ctx.restore();
    tx(ctx, label, x0 + 34, cy + 7, { size, weight: 600, color: PAPER });
  } else if (state === 'processing') {
    const w = measure(ctx, label, { size, weight: 600 }); const x0 = cx - (w + 34) / 2;
    ctx.save(); ctx.strokeStyle = PAPER; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x0 + 11, cy, 9, spin, spin + Math.PI * 1.4); ctx.stroke(); ctx.restore();
    tx(ctx, label, x0 + 34, cy + 7, { size, weight: 600, color: PAPER });
  } else tx(ctx, label, cx, cy + 7, { size, weight: 600, color: PAPER, align: 'center' });
  ctx.restore();
}
function field(ctx, x, y, w, label, value, { h = 52, mono = false, right = null, placeholder = false } = {}) {
  tx(ctx, label, x, y, { size: 18, color: INK2, weight: 500 });
  fillRoundRect(ctx, x, y + 14, w, h, 10, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2);
  tx(ctx, value, x + 18, y + 14 + h / 2 + 7, { size: 19, weight: 500, tracking: mono ? 1 : 0, color: placeholder ? INK3 : INK });
  if (right) right(x + w - 22, y + 14 + h / 2);
}
function option(ctx, x, y, w, label, price, on) {
  fillRoundRect(ctx, x, y, w, 56, 12, on ? 'rgba(128,201,248,0.10)' : 'rgba(255,255,255,0.5)', on ? CYAN_D : 'rgba(13,16,22,0.14)', on ? 1.6 : 1.2);
  radio(ctx, x + 28, y + 28, on); tx(ctx, label, x + 52, y + 35, { size: 19, weight: on ? 600 : 500 });
  if (price) tx(ctx, price, x + w - 22, y + 35, { size: 19, weight: 600, align: 'right' });
}
function cardGlyph(ctx, x, y) { ctx.save(); ctx.strokeStyle = INK2; ctx.lineWidth = 1.6; roundRect(ctx, x - 13, y - 9, 26, 18, 3); ctx.stroke(); ctx.fillStyle = INK2; ctx.fillRect(x - 13, y - 4, 26, 3.5); ctx.restore(); }

// ---------------------------------------------------------------- the shop
function nav(ctx, S) {
  const h = L.nav.h;
  tx(ctx, 'NORDLYS', L.nav.brandX, 47, { size: 20, weight: 700, tracking: 5.5 });
  if (S.view === 'pdp') {
    const items = ['Lighting', 'Textiles', 'Objects', 'Journal']; let x = 520;
    for (const [i, it] of items.entries()) { const cur = i === 0; tx(ctx, it, x, 46, { size: 18, weight: cur ? 600 : 500, color: cur ? INK : INK2 }); if (cur) { ctx.fillStyle = INK; ctx.fillRect(x, 56, measure(ctx, it, { size: 18, weight: 600 }), 1.5); } x += measure(ctx, it, { size: 18, weight: 500 }) + 44; }
  } else {
    tx(ctx, S.view === 'checkout' ? (S.redesign ? 'Checkout · 2 steps' : 'Checkout') : '', 660, 46, { size: 18, weight: 600, align: 'center' });
    lockGlyph(ctx, 1178, 40); tx(ctx, 'Secure', 1192, 46, { size: 18, color: INK2 });
  }
  if (S.view === 'pdp') searchGlyph(ctx, L.nav.search.x, L.nav.search.y);
  bagGlyph(ctx, L.nav.bag.x, L.nav.bag.y);
  if (S.bag > 0) { const b = L.nav.bag; const pop = 1 + 0.25 * Math.sin(Math.PI * clamp(S.bagK ?? 1)); ctx.save(); ctx.translate(b.x + 13, b.y - 11); ctx.scale(pop, pop); ctx.fillStyle = PALETTE.amber; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); tx(ctx, String(S.bag), 0, 5.5, { size: 15, weight: 700, align: 'center' }); ctx.restore(); }
  hairline(ctx, 0, h, SW);
}

function pdp(ctx, S) {
  const P = L.pdp, c = P.col;
  lampArt(ctx, P.tile.x, P.tile.y, P.tile.w, P.tile.h);
  fillRoundRect(ctx, P.tile.x + 20, P.tile.y + 20, 58, 30, 15, INK); tx(ctx, 'NEW', P.tile.x + 49, P.tile.y + 41, { size: 15, weight: 700, color: PAPER, align: 'center', tracking: 2 });
  tx(ctx, 'LIGHTING · TABLE', c.x, P.eyebrowY, { size: 17, weight: 600, color: INK2, tracking: 3 });
  tx(ctx, 'Aurora Table Lamp', c.x, P.titleY, { size: 44, weight: 500, family: 'Inter Display' });
  tx(ctx, '€89', c.x, P.priceY, { size: 28, weight: 500 });
  if (S.redesign) { truckGlyph(ctx, c.x + 10, P.deliveryY - 6); tx(ctx, 'Delivery €14.90 · 2–3 days', c.x + 30, P.deliveryY, { size: 19, weight: 500 }); }
  tx(ctx, 'Hand-blown opal glass on a turned oak base.', c.x, P.descY, { size: 19, color: INK2, weight: 400 });
  tx(ctx, 'Warm, dimmable light for evenings in.', c.x, P.descY + 28, { size: 19, color: INK2, weight: 400 });
  tx(ctx, 'Colour — Opal', c.x, P.colourY, { size: 18, color: INK2 });
  const sw = [[PAPER2, 'rgba(13,16,22,0.25)'], [INK, null], [PALETTE.beige2, null]];
  sw.forEach(([f, st], i) => { const x = c.x + 17 + i * 58, y = P.swatchY; ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); if (st) { ctx.strokeStyle = st; ctx.lineWidth = 1; ctx.stroke(); } if (i === 0) { ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.stroke(); } });
  button(ctx, P.btn, S.btn === 'added' ? 'Added to bag' : 'Add to bag  ·  €89', S.btn, { k: S.addedK ?? 1 });
  checkGlyph(ctx, c.x + 8, P.noteY - 6, 0.8, INK2, 1.8); tx(ctx, 'Free returns within 30 days', c.x + 26, P.noteY, { size: 18, color: INK2 });
  tx(ctx, 'Also in Lighting', P.tile.x, P.rowLabelY, { size: 18, weight: 600 });
  THUMBS.forEach(([name, price, art], i) => { const x = P.thumbCells[i]; art(ctx, x, P.thumbY, 96, 96); tx(ctx, name, x + 116, P.thumbY + 44, { size: 19, weight: 600 }); tx(ctx, price, x + 116, P.thumbY + 72, { size: 18, color: INK2 }); });
}

function stepper(ctx, xs, labels, cur, allDone = false) {
  const y = L.co.stepperY;
  for (let i = 0; i < xs.length - 1; i++) { const done = allDone || i < cur; ctx.fillStyle = done ? INK : 'rgba(13,16,22,0.14)'; ctx.fillRect(xs[i] + 20, y - 1, xs[i + 1] - xs[i] - 40, 2); }
  xs.forEach((x, i) => {
    const done = allDone || i < cur, now = !allDone && i === cur;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2);
    if (done) { ctx.fillStyle = INK; ctx.fill(); checkGlyph(ctx, x, y + 0.5, 0.95, PAPER, 2.2); }
    else if (now) { ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke(); tx(ctx, String(i + 1), x, y + 6, { size: 16, weight: 700, align: 'center' }); }
    else { ctx.fillStyle = 'rgba(13,16,22,0.08)'; ctx.fill(); tx(ctx, String(i + 1), x, y + 6, { size: 16, weight: 600, align: 'center', color: INK3 }); }
    tx(ctx, labels[i], x, L.co.labelY, { size: 18, weight: done || now ? 600 : 500, color: done || now ? INK : INK3, align: 'center' });
  });
}

function itemRow(ctx, x, y, big = true) {
  if (big) {
    lampArt(ctx, x, y, 112, 112, 14);
    tx(ctx, 'Aurora Table Lamp', x + 132, y + 38, { size: 20, weight: 600 }); tx(ctx, 'Opal · Table lamp', x + 132, y + 66, { size: 18, color: INK2 });
    // quantity stepper
    fillRoundRect(ctx, x + 132, y + 80, 36, 32, 8, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2); tx(ctx, '−', x + 150, y + 102, { size: 20, align: 'center', color: INK2 });
    tx(ctx, '1', x + 188, y + 102, { size: 18, weight: 600, align: 'center' });
    fillRoundRect(ctx, x + 208, y + 80, 36, 32, 8, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2); tx(ctx, '+', x + 226, y + 102, { size: 20, align: 'center', color: INK2 });
  } else {
    lampArt(ctx, x, y, 56, 56, 9);
    tx(ctx, 'Aurora Table Lamp', x + 72, y + 24, { size: 18, weight: 600 }); tx(ctx, 'Opal · Qty 1', x + 72, y + 48, { size: 18, color: INK2 });
  }
}

function summary(ctx, S) {
  const s = L.co.summary, x = s.x + 32, w = s.w - 64, right = s.x + s.w - 32;
  fillRoundRect(ctx, s.x, s.y, s.w, s.h, 18, CARD, CARD_HAIR, 1);
  tx(ctx, 'Order summary', x, s.y + 52, { size: 20, weight: 600 });
  itemRow(ctx, x, s.y + 76, false); tx(ctx, '€89.00', right, s.y + 100, { size: 18, weight: 600, align: 'right' });
  hairline(ctx, x, s.y + 156, w);
  const rowY = s.y + 196; tx(ctx, 'Subtotal', x, rowY, { size: 18, color: INK2 }); tx(ctx, '€89.00', right, rowY, { size: 18, align: 'right' });
  const dY = s.y + 232; const k = S.redesign ? 1 : clamp(S.reveal ?? 0);
  if (!S.redesign && k > 0 && k < 1) { ctx.save(); ctx.globalAlpha *= Math.sin(k * Math.PI) * 0.5; fillRoundRect(ctx, x - 12, dY - 24, w + 24, 36, 8, PALETTE.amber); ctx.restore(); }
  tx(ctx, 'Delivery', x, dY, { size: 18, color: INK2 });
  if (S.redesign) tx(ctx, '€14.90', right, dY, { size: 18, align: 'right' });
  else {
    if (k < 1) tx(ctx, '—', right, dY, { size: 18, align: 'right', color: INK3, alpha: 1 - k });
    if (k > 0) tx(ctx, '€14.90', right + 14 * (1 - easeOut(k)), dY, { size: 18, weight: 600, align: 'right', color: PALETTE.amberDeep, alpha: easeOut(k) });
  }
  hairline(ctx, x, s.y + 262, w);
  const tY = s.y + 306; tx(ctx, 'Total', x, tY, { size: 22, weight: 600 });
  const total = S.redesign ? 103.9 : lerp(89, 103.9, easeOut(seg(k, 0.35, 1)));
  tx(ctx, '€' + total.toFixed(2), right, tY, { size: 22, weight: 600, align: 'right', color: !S.redesign && k > 0.35 && k < 1 ? PALETTE.amberDeep : INK });
}

function checkoutContent(ctx, S) {
  const c = L.co.content, x = c.x + 32, w = c.w - 64, btn = L.co.btn;
  fillRoundRect(ctx, c.x, c.y, c.w, c.h, 18, CARD, CARD_HAIR, 1);
  const step = S.step, R = S.redesign;
  if (!R && step === 0) {
    tx(ctx, 'Your bag', x, c.y + 56, { size: 26, weight: 600 }); itemRow(ctx, x, c.y + 94, true); tx(ctx, '€89.00', x + w, c.y + 132, { size: 20, weight: 600, align: 'right' });
    hairline(ctx, x, c.y + 240, w);
    field(ctx, x, c.y + 274, w, 'Gift note or promo code', 'Optional', { placeholder: true });
    button(ctx, btn, 'Continue to delivery', S.contBtn || 'default');
  } else if (!R && step === 1) {
    tx(ctx, 'Delivery', x, c.y + 56, { size: 26, weight: 600 });
    const cw = (w - 32) / 2;
    field(ctx, x, c.y + 94, cw, 'Full name', 'Ida Lund'); field(ctx, x + cw + 32, c.y + 94, cw, 'Email', 'ida@example.com');
    field(ctx, x, c.y + 190, cw, 'Street', 'Storgata 12'); field(ctx, x + cw + 32, c.y + 190, cw, 'Postcode & city', '0155 Oslo');
    tx(ctx, 'Delivery method', x, c.y + 322, { size: 20, weight: 600 });
    option(ctx, x, c.y + 342, w, 'Standard · 2–3 days', null, true); option(ctx, x, c.y + 410, w, 'Express · next day', null, false);
    button(ctx, btn, 'Continue to payment', S.contBtn || 'default');
  } else if (R && step === 0) {
    tx(ctx, 'Bag & delivery', x, c.y + 56, { size: 26, weight: 600 }); itemRow(ctx, x, c.y + 94, true); tx(ctx, '€89.00', x + w, c.y + 132, { size: 20, weight: 600, align: 'right' });
    hairline(ctx, x, c.y + 240, w);
    tx(ctx, 'Deliver to', x, c.y + 276, { size: 18, color: INK2 }); tx(ctx, 'Ida Lund · Storgata 12, 0155 Oslo', x, c.y + 304, { size: 19, weight: 500 }); tx(ctx, 'Change', x + w, c.y + 304, { size: 18, weight: 600, color: CYAN_D, align: 'right' });
    tx(ctx, 'Delivery method', x, c.y + 352, { size: 20, weight: 600 });
    option(ctx, x, c.y + 372, w, 'Standard · 2–3 days', '€14.90', true); option(ctx, x, c.y + 440, w, 'Express · next day', '€24.90', false);
    button(ctx, btn, 'Continue to payment  ·  €103.90', S.contBtn || 'default');
  } else if (S.pay === 'confirmed') {
    const k = easeOut(clamp(S.confirmK ?? 1)), cx = c.x + c.w / 2, cy = c.y + 190;
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(cx, cy); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, 0, 2, 2.6, PALETTE.green, 5); ctx.restore();
    tx(ctx, 'Order confirmed', cx, cy + 100, { size: 32, weight: 600, align: 'center', alpha: k });
    tx(ctx, 'Thank you, Ida. Your lamp ships in 2–3 days.', cx, cy + 138, { size: 19, color: INK2, align: 'center', alpha: k });
    tx(ctx, 'Order NG-20481 · Receipt sent to ida@example.com', cx, cy + 168, { size: 18, color: INK3, align: 'center', alpha: k });
    button(ctx, btn, 'Continue shopping', 'ghost', { alpha: k });
  } else { // payment (both designs)
    tx(ctx, '←  Back', L.co.back.x, L.co.back.y, { size: 18, weight: 500, color: S.backHover ? INK : INK2 });
    tx(ctx, 'Payment', x, c.y + 104, { size: 26, weight: 600 });
    field(ctx, x, c.y + 142, w, 'Card number', '4242  4242  4242  4242', { mono: true, right: (px, py) => cardGlyph(ctx, px, py) });
    const cw = (w - 32) / 2;
    field(ctx, x, c.y + 238, cw, 'Expiry', '08 / 28'); field(ctx, x + cw + 32, c.y + 238, cw, 'Security code', '•••');
    field(ctx, x, c.y + 334, w, 'Name on card', 'Ida Lund');
    const label = R ? 'Pay €103.90' : ((S.reveal ?? 0) > 0.6 ? 'Pay €103.90' : 'Pay €89.00');
    const st = S.pay === 'pressed' ? 'pressed' : S.pay === 'processing' ? 'processing' : (S.contBtn || 'default');
    button(ctx, btn, st === 'processing' ? 'Processing' : label, st, { spin: S.spin || 0 });
  }
}

// Draws the whole slab (0..SW × 0..SH) for state S into ctx (caller sets the transform/clip).
export function drawShop(ctx, S) {
  ctx.save();
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SW, SH);
  // very soft warm wash in the corner for depth
  const g = ctx.createRadialGradient(SW * 0.15, SH * 0.1, 10, SW * 0.15, SH * 0.1, SW * 0.9); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  nav(ctx, S);
  const k = clamp(S.viewK ?? 1); // crossfade from pdp to checkout
  if (S.view === 'pdp') pdp(ctx, S);
  else {
    if (k < 1) { ctx.save(); ctx.globalAlpha *= 1 - k; pdp(ctx, { ...S, view: 'pdp', btn: 'added', addedK: 1 }); ctx.restore(); }
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, 16 * (1 - easeOut(k)));
    const sk = clamp(S.stepK ?? 1);
    if (S.redesign) stepper(ctx, L.co.steps2, ['Bag & delivery', 'Pay'], S.step, S.pay === 'confirmed');
    else stepper(ctx, L.co.steps3, ['Bag', 'Delivery', 'Pay'], S.step);
    ctx.save(); ctx.globalAlpha *= sk; ctx.translate(14 * (1 - easeOut(sk)), 0); checkoutContent(ctx, S); ctx.restore();
    summary(ctx, S);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- component library tiles (closing dissolve)
export const COMPONENTS = [
  'Button / Default', 'Button / Hover', 'Button / Pressed', 'Button / Added', 'Input / Filled', 'Radio / Selected',
  'Stepper / Done', 'Price / Delivery shown', 'Swatches', 'Bag / Count', 'Status / Confirmed', 'Link / Back',
  'Quantity', 'Summary row', 'Checkbox', 'Nav / Item', 'Card / Thumbnail', 'Lock / Secure',
  'Tag / Chip', 'Progress / 2 steps', 'Field / Label', 'Check / Success', 'Search', 'Button / Ghost',
];
export function drawComponent(ctx, i, w, h) {
  // draws component i inside a w×h ivory surface at (0,0)
  const cx = w / 2, cy = h / 2; const b = { x: cx - 78, y: cy - 20, w: 156, h: 40 };
  switch (i % COMPONENTS.length) {
    case 0: button(ctx, b, 'Add to bag', 'default', { size: 16 }); break;
    case 1: button(ctx, b, 'Add to bag', 'hover', { size: 16 }); break;
    case 2: button(ctx, b, 'Add to bag', 'pressed', { size: 16 }); break;
    case 3: button(ctx, b, 'Added', 'added', { size: 16, k: 1 }); break;
    case 4: fillRoundRect(ctx, cx - 90, cy - 20, 180, 40, 9, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2); tx(ctx, 'Ida Lund', cx - 76, cy + 6, { size: 16 }); break;
    case 5: radio(ctx, cx - 60, cy, true); tx(ctx, 'Standard · 2–3 days', cx - 42, cy + 6, { size: 16, weight: 600 }); break;
    case 6: ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx - 40, cy, 14, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, cx - 40, cy, 0.85, PAPER, 2); ctx.fillStyle = INK; ctx.fillRect(cx - 20, cy - 1, 40, 2); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(cx + 40, cy, 14, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); tx(ctx, '2', cx + 40, cy + 5, { size: 14, weight: 700, align: 'center' }); break;
    case 7: tx(ctx, '€89', cx - 70, cy - 2, { size: 24, weight: 500 }); truckGlyph(ctx, cx - 60, cy + 22); tx(ctx, 'Delivery €14.90', cx - 44, cy + 28, { size: 15 }); break;
    case 8: [[PAPER2, 'rgba(13,16,22,0.25)'], [INK, null], [PALETTE.beige2, null]].forEach(([f, st], j) => { const x = cx - 50 + j * 50; ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, cy, 15, 0, Math.PI * 2); ctx.fill(); if (st) { ctx.strokeStyle = st; ctx.lineWidth = 1; ctx.stroke(); } if (j === 0) { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, cy, 20, 0, Math.PI * 2); ctx.stroke(); } }); break;
    case 9: bagGlyph(ctx, cx, cy + 4, INK, 1.4); ctx.fillStyle = PALETTE.amber; ctx.beginPath(); ctx.arc(cx + 17, cy - 12, 11, 0, Math.PI * 2); ctx.fill(); tx(ctx, '1', cx + 17, cy - 6.5, { size: 14, weight: 700, align: 'center' }); break;
    case 10: ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx - 64, cy, 16, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, cx - 64, cy + 1, 1, PALETTE.green, 2.4); tx(ctx, 'Order confirmed', cx - 38, cy + 6, { size: 17, weight: 600 }); break;
    case 11: tx(ctx, '←  Back', cx, cy + 6, { size: 17, align: 'center', color: INK2 }); break;
    case 12: fillRoundRect(ctx, cx - 56, cy - 16, 32, 32, 8, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2); tx(ctx, '−', cx - 40, cy + 6, { size: 18, align: 'center', color: INK2 }); tx(ctx, '1', cx, cy + 6, { size: 17, weight: 600, align: 'center' }); fillRoundRect(ctx, cx + 24, cy - 16, 32, 32, 8, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2); tx(ctx, '+', cx + 40, cy + 6, { size: 18, align: 'center', color: INK2 }); break;
    case 13: tx(ctx, 'Total', cx - 80, cy + 6, { size: 17, weight: 600 }); tx(ctx, '€103.90', cx + 80, cy + 6, { size: 17, weight: 600, align: 'right' }); hairline(ctx, cx - 80, cy - 22, 160); break;
    case 14: fillRoundRect(ctx, cx - 70, cy - 11, 22, 22, 6, INK); checkGlyph(ctx, cx - 59, cy + 0.5, 0.8, PAPER, 2); tx(ctx, 'Save my details', cx - 38, cy + 6, { size: 16 }); break;
    case 15: tx(ctx, 'Lighting', cx - 40, cy + 6, { size: 16, weight: 600 }); ctx.fillStyle = INK; ctx.fillRect(cx - 40, cy + 14, measure(ctx, 'Lighting', { size: 16, weight: 600 }), 1.5); tx(ctx, 'Textiles', cx + 30, cy + 6, { size: 16, color: INK2 }); break;
    case 16: lampArt(ctx, cx - 76, cy - 30, 60, 60, 9); tx(ctx, 'Aurora Lamp', cx - 4, cy - 2, { size: 15, weight: 600 }); tx(ctx, '€89', cx - 4, cy + 20, { size: 15, color: INK2 }); break;
    case 17: lockGlyph(ctx, cx - 44, cy + 2); tx(ctx, 'Secure checkout', cx - 30, cy + 6, { size: 16, color: INK2 }); break;
    case 18: fillRoundRect(ctx, cx - 70, cy - 14, 64, 28, 14, INK); tx(ctx, 'NEW', cx - 38, cy + 5, { size: 13, weight: 700, color: PAPER, align: 'center', tracking: 2 }); fillRoundRect(ctx, cx + 2, cy - 14, 70, 28, 14, 'rgba(13,16,22,0.08)'); tx(ctx, 'Opal', cx + 37, cy + 5, { size: 14, weight: 600, align: 'center' }); break;
    case 19: ctx.fillStyle = INK; ctx.fillRect(cx - 60, cy - 1, 120, 2); for (const [j, x] of [[0, cx - 60], [1, cx + 60]]) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, cy, 12, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, x, cy, 0.7, PAPER, 2); } tx(ctx, 'Bag & delivery', cx - 60, cy + 32, { size: 13, align: 'center' }); tx(ctx, 'Pay', cx + 60, cy + 32, { size: 13, align: 'center' }); break;
    case 20: tx(ctx, 'Full name', cx - 80, cy - 12, { size: 14, color: INK2 }); fillRoundRect(ctx, cx - 80, cy - 2, 160, 34, 8, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2); break;
    case 21: ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill(); checkGlyph(ctx, cx, cy + 1, 1.4, PALETTE.green, 3); break;
    case 22: fillRoundRect(ctx, cx - 80, cy - 18, 160, 36, 18, 'rgba(255,255,255,0.7)', 'rgba(13,16,22,0.16)', 1.2); searchGlyph(ctx, cx - 56, cy + 2, INK2); tx(ctx, 'Search', cx - 38, cy + 6, { size: 15, color: INK3 }); break;
    default: button(ctx, b, 'Continue shopping', 'ghost', { size: 15 }); break;
  }
}
