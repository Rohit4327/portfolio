// SCENE 09 helpers — texture painters for component cards, the token panel, device screens, cursors and the
// accessibility panel. All painters are pure functions of their arguments (no clock, no Math.random).
import { PALETTE as P } from '../lib/stage.js';
import { clamp, lerp, seg, easeInOut, easeOut, easeOutBack, hash } from '../lib/util.js';
import { roundRect, fillRoundRect } from '../lib/gfx.js';

const F = (w, s, fam = 'Inter') => `${w} ${s}px ${fam}`;
const INK = { surface: '#161B24', surface2: '#1F2632', line: 'rgba(246,242,232,0.10)', line2: 'rgba(246,242,232,0.18)' };
export const ROLES = [
  { name: 'Designer', color: P.amber },
  { name: 'Engineer', color: P.cyan },
  { name: 'Researcher', color: P.ivory },
];
export const CARD_KINDS = ['Button', 'Input', 'Card', 'Navigation', 'Toggle', 'Alert', 'Tabs', 'Chips'];

function label(ctx, s, x, y, o = {}) {
  const { size = 22, weight = 500, color = P.ivory, align = 'left', tracking = 0, family = 'Inter', alpha = 1 } = o;
  if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.font = F(weight, size, family); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = `${tracking}px`; ctx.fillText(s, x, y); ctx.restore();
}
const textW = (ctx, s, size, weight = 500, tracking = 0) => { ctx.save(); ctx.font = F(weight, size); ctx.letterSpacing = `${tracking}px`; const w = ctx.measureText(s).width; ctx.restore(); return w; };

// ---------- component card (512 x 320) ----------
// styled: 0 = wireframe (no tokens yet) … 1 = tokens applied. sel: 0..1 selection highlight.
export function drawCard(ctx, w, h, kind, styled, sel = 0) {
  const k = clamp(styled);
  ctx.clearRect(0, 0, w, h);
  fillRoundRect(ctx, 0, 0, w, h, 26, INK.surface);
  // tokens applied: hairline + title in ivory; wireframe: dashed gray outline
  const ink = k > 0.5 ? P.ivory : P.gray, accent = k > 0.5 ? P.cyan : P.gray2, dim = k > 0.5 ? P.gray : P.gray2;
  ctx.save(); roundRect(ctx, 1, 1, w - 2, h - 2, 25); ctx.strokeStyle = k > 0.5 ? `rgba(128,201,248,${0.25 + 0.6 * sel})` : INK.line2; ctx.lineWidth = k > 0.5 ? 2 : 1.5; if (k <= 0.5) ctx.setLineDash([10, 8]); ctx.stroke(); ctx.restore();
  label(ctx, kind.toUpperCase(), 32, 48, { size: 20, weight: 600, color: dim, tracking: 3 });
  const cx = w / 2, cy = h / 2 + 18;
  const wire = (x, y, ww, hh, r = 10) => { ctx.save(); roundRect(ctx, x, y, ww, hh, r); ctx.strokeStyle = INK.line2; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.restore(); };
  switch (kind) {
    case 'Button': {
      if (k > 0.5) { fillRoundRect(ctx, cx - 150, cy - 34, 300, 68, 34, P.cyan); label(ctx, 'Continue', cx, cy + 9, { size: 26, weight: 600, color: P.graphite, align: 'center' }); }
      else { wire(cx - 150, cy - 34, 300, 68, 34); label(ctx, 'Continue', cx, cy + 9, { size: 26, weight: 600, color: P.gray2, align: 'center' }); }
      break;
    }
    case 'Input': {
      label(ctx, 'Email', 48, cy - 44, { size: 20, weight: 500, color: ink });
      if (k > 0.5) { fillRoundRect(ctx, 48, cy - 26, w - 96, 62, 14, INK.surface2, INK.line2, 1.5); } else wire(48, cy - 26, w - 96, 62, 14);
      label(ctx, 'name@example.com', 70, cy + 13, { size: 22, weight: 400, color: dim });
      break;
    }
    case 'Card': {
      if (k > 0.5) { fillRoundRect(ctx, 48, 72, 150, 150, 18, INK.surface2); fillRoundRect(ctx, 78, 102, 90, 90, 45, 'rgba(128,201,248,0.35)'); } else wire(48, 72, 150, 150, 18);
      fillRoundRect(ctx, 224, 90, 220, 18, 9, ink); fillRoundRect(ctx, 224, 124, 160, 14, 7, dim); fillRoundRect(ctx, 224, 150, 190, 14, 7, dim);
      if (k > 0.5) { fillRoundRect(ctx, 224, 186, 120, 36, 18, 'rgba(128,201,248,0.18)'); label(ctx, 'Add', 284, 211, { size: 18, weight: 600, color: P.cyan, align: 'center' }); } else wire(224, 186, 120, 36, 18);
      break;
    }
    case 'Navigation': {
      if (k > 0.5) fillRoundRect(ctx, 40, cy - 30, w - 80, 60, 16, INK.surface2); else wire(40, cy - 30, w - 80, 60, 16);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(74, cy, 10, 0, Math.PI * 2); ctx.fill();
      ['Home', 'Library', 'Teams', 'Settings'].forEach((s, i) => label(ctx, s, 118 + i * 90, cy + 7, { size: 19, weight: i === 0 ? 600 : 400, color: i === 0 ? ink : dim }));
      break;
    }
    case 'Toggle': {
      label(ctx, 'Notifications', 48, cy + 8, { size: 22, weight: 500, color: ink });
      if (k > 0.5) { fillRoundRect(ctx, w - 150, cy - 22, 92, 44, 22, P.cyan); ctx.fillStyle = P.graphite; ctx.beginPath(); ctx.arc(w - 80, cy, 17, 0, Math.PI * 2); ctx.fill(); }
      else { wire(w - 150, cy - 22, 92, 44, 22); ctx.strokeStyle = INK.line2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w - 128, cy, 15, 0, Math.PI * 2); ctx.stroke(); }
      break;
    }
    case 'Alert': {
      if (k > 0.5) fillRoundRect(ctx, 40, cy - 40, w - 80, 80, 16, 'rgba(128,201,248,0.12)', 'rgba(128,201,248,0.4)', 1.5); else wire(40, cy - 40, w - 80, 80, 16);
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(80, cy, 14, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = accent; ctx.fillRect(78.5, cy - 7, 3, 9); ctx.fillRect(78.5, cy + 5, 3, 3);
      label(ctx, 'Changes saved', 114, cy - 4, { size: 20, weight: 600, color: ink }); label(ctx, 'Synced to the shared library', 114, cy + 22, { size: 17, weight: 400, color: dim });
      break;
    }
    case 'Tabs': {
      ['Overview', 'Components', 'Tokens'].forEach((s, i) => { const x = 60 + i * 140; label(ctx, s, x, cy, { size: 20, weight: i === 1 ? 600 : 400, color: i === 1 ? ink : dim }); });
      ctx.fillStyle = INK.line2; ctx.fillRect(48, cy + 18, w - 96, 2);
      ctx.fillStyle = accent; ctx.fillRect(200, cy + 16, textW(ctx, 'Components', 20, 600), 4);
      break;
    }
    case 'Chips': {
      ['Design', 'Mobile', 'Research', 'Web'].forEach((s, i) => { const ww = textW(ctx, s, 18, 500) + 36; const x = 48 + [0, 118, 222, 352][i]; const on = i === 0 || i === 2;
        if (k > 0.5) fillRoundRect(ctx, x, cy - 20, ww, 40, 20, on ? 'rgba(128,201,248,0.18)' : INK.surface2, on ? 'rgba(128,201,248,0.5)' : INK.line2, 1.5); else wire(x, cy - 20, ww, 40, 20);
        label(ctx, s, x + ww / 2, cy + 7, { size: 18, weight: 500, color: k > 0.5 && on ? P.cyan : dim, align: 'center' }); });
      break;
    }
  }
}

// ---------- token panel (512 x 960) ----------
export const TOKEN_COLORS = [P.graphite3, P.ivory, P.cyan, P.amber, P.gray, P.gray2];
export function drawTokens(ctx, w, h, glow = 0) {
  ctx.clearRect(0, 0, w, h);
  fillRoundRect(ctx, 0, 0, w, h, 28, INK.surface, `rgba(128,201,248,${0.18 + 0.5 * glow})`, 2);
  label(ctx, 'DESIGN TOKENS', 36, 58, { size: 22, weight: 600, color: P.cyan, tracking: 3.5 });
  label(ctx, 'Colour', 36, 118, { size: 20, weight: 600, color: P.gray, tracking: 2 });
  TOKEN_COLORS.forEach((c, i) => { const x = 36 + (i % 3) * 150, y = 140 + Math.floor(i / 3) * 110; fillRoundRect(ctx, x, y, 120, 76, 14, c, INK.line2, 1); label(ctx, ['surface', 'text', 'accent', 'point', 'muted', 'hint'][i], x, y + 102, { size: 19, weight: 500, color: P.gray }); });
  label(ctx, 'Type scale', 36, 420, { size: 20, weight: 600, color: P.gray, tracking: 2 });
  [[56, 'Display'], [40, 'Title'], [28, 'Body'], [20, 'Caption']].forEach(([s, n], i) => { const y = 480 + [0, 70, 125, 168][i]; label(ctx, 'Aa', 36, y, { size: s, weight: i < 2 ? 300 : 400, color: P.ivory, family: i < 2 ? 'Inter Display' : 'Inter' }); label(ctx, `${n} · ${s}`, 180, y, { size: 20, weight: 400, color: P.gray }); });
  label(ctx, 'Spacing', 36, 720, { size: 20, weight: 600, color: P.gray, tracking: 2 });
  [8, 16, 24, 40, 64].forEach((s, i) => { const x = 36 + [0, 40, 88, 148, 236][i]; fillRoundRect(ctx, x, 820 - s, s, s, Math.min(6, s / 3), 'rgba(128,201,248,0.28)', 'rgba(128,201,248,0.7)', 1.5); label(ctx, String(s), x + s / 2, 852, { size: 18, weight: 500, color: P.gray, align: 'center' }); });
  label(ctx, 'Radius 14 · Stroke 1.5', 36, 914, { size: 19, weight: 400, color: P.gray2 });
}

// ---------- device screens (consistent layout assembled with progress k 0..1) ----------
// kind: 'phone' | 'tablet' | 'desktop'. Width/height are texture px.
export function drawDeviceScreen(ctx, w, h, kind, k) {
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = P.graphite; ctx.fillRect(0, 0, w, h);
  const step = (i, n = 7) => easeOut(seg(k, i / n, (i + 1) / n)); // staggered element reveal
  const phone = kind === 'phone', pad = phone ? 28 : 40, s = 1;
  const navH = 56;
  // 0 nav bar
  let a = step(0); if (a > 0) { ctx.save(); ctx.globalAlpha = a; fillRoundRect(ctx, pad, pad, w - pad * 2, navH, 14, INK.surface2); ctx.fillStyle = P.cyan; ctx.beginPath(); ctx.arc(pad + navH / 2, pad + navH / 2, 9, 0, Math.PI * 2); ctx.fill();
    if (!phone) ['Home', 'Library', 'Teams'].forEach((t, i) => label(ctx, t, pad + navH + 10 + i * 96, pad + navH / 2 + 7, { size: 18, weight: i === 0 ? 600 : 400, color: i === 0 ? P.ivory : P.gray }));
    else { ctx.fillStyle = P.ivory; for (let i = 0; i < 3; i++) ctx.fillRect(w - pad - 34, pad + navH / 2 - 9 + i * 8, 22, 2.5); }
    ctx.restore(); }
  // 1 title
  a = step(1); if (a > 0) { label(ctx, 'Library', pad, pad + navH + 62, { size: 36, weight: 300, family: 'Inter Display', color: P.ivory, alpha: a }); label(ctx, 'Shared components, one source', pad, pad + navH + 94, { size: 17, weight: 400, color: P.gray, alpha: a }); }
  // 2–3 cards row (1 on phone, 2 on tablet, 3 on desktop)
  const y0 = pad + navH + 124, n = phone ? 1 : kind === 'tablet' ? 2 : 3, gap = 18, cw = (w - pad * 2 - gap * (n - 1)) / n, ch = 112;
  for (let i = 0; i < n; i++) { a = step(2 + Math.min(i, 1)); if (a <= 0) continue; const x = pad + i * (cw + gap); ctx.save(); ctx.globalAlpha = a; fillRoundRect(ctx, x, y0, cw, ch, 14, INK.surface2); fillRoundRect(ctx, x + 16, y0 + 18, 52, 52, 12, 'rgba(128,201,248,0.3)'); const tw1 = Math.max(40, cw - 110), tw2 = Math.max(28, cw - 150); fillRoundRect(ctx, x + 84, y0 + 26, tw1, 12, 6, P.ivory); fillRoundRect(ctx, x + 84, y0 + 50, tw2, 10, 5, P.gray); fillRoundRect(ctx, x + 16, y0 + 84, 70, 18, 9, 'rgba(128,201,248,0.18)'); ctx.restore(); }
  // 4 input (+ 5 button: stacked on phone, side by side otherwise)
  const yi = y0 + ch + 34, iw = phone ? w - pad * 2 : 300;
  a = step(4); if (a > 0) { ctx.save(); ctx.globalAlpha = a; label(ctx, 'Email', pad, yi, { size: 16, weight: 500, color: P.ivory }); fillRoundRect(ctx, pad, yi + 12, iw, 48, 12, INK.surface2, INK.line2, 1.5); label(ctx, 'name@example.com', pad + 18, yi + 44, { size: 17, weight: 400, color: P.gray }); ctx.restore(); }
  a = step(5); if (a > 0) { ctx.save(); ctx.globalAlpha = a; const bw = phone ? w - pad * 2 : 170, bx = phone ? pad : pad + iw + 18, by = phone ? yi + 80 : yi + 10; fillRoundRect(ctx, bx, by, bw, 52, 26, P.cyan); label(ctx, 'Continue', bx + bw / 2, by + 34, { size: 19, weight: 600, color: P.graphite, align: 'center' }); ctx.restore(); }
  // 6 toggle row where it fits
  const yt = phone ? yi + 170 : yi + 112;
  a = step(6); if (a > 0 && h > yt + 36) { ctx.save(); ctx.globalAlpha = a; label(ctx, 'Notifications', pad, yt + 8, { size: 17, weight: 500, color: P.ivory }); const tx = pad + 150; fillRoundRect(ctx, tx, yt - 12, 56, 32, 16, P.cyan); ctx.fillStyle = P.graphite; ctx.beginPath(); ctx.arc(tx + 40, yt + 4, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}

// ---------- cursor + role label (256 x 96) ----------
export function drawCursor(ctx, w, h, role) {
  ctx.clearRect(0, 0, w, h);
  const c = role.color;
  ctx.save(); ctx.translate(14, 10); ctx.scale(2.1, 2.1);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 24); ctx.lineTo(6, 19); ctx.lineTo(10, 28); ctx.lineTo(14, 26); ctx.lineTo(10, 18); ctx.lineTo(17, 17); ctx.closePath();
  ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = P.graphite; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
  const tw = textW(ctx, role.name, 24, 600) + 32;
  fillRoundRect(ctx, 56, 44, tw, 42, 10, c);
  label(ctx, role.name, 56 + tw / 2, 73, { size: 24, weight: 600, color: P.graphite, align: 'center' });
}

// ---------- small message panel for the spatial/conversational layers (512 x 300) ----------
export function drawMessagePanel(ctx, w, h, variant) {
  ctx.clearRect(0, 0, w, h);
  fillRoundRect(ctx, 0, 0, w, h, 28, 'rgba(31,38,50,0.86)', 'rgba(128,201,248,0.35)', 2);
  if (variant === 0) {
    fillRoundRect(ctx, 36, 48, 300, 70, 24, INK.surface2); label(ctx, 'Can I change the font size?', 60, 92, { size: 22, weight: 400, color: P.ivory });
    fillRoundRect(ctx, 150, 150, 326, 92, 24, 'rgba(128,201,248,0.18)'); label(ctx, 'Yes — text follows your', 174, 190, { size: 22, weight: 400, color: P.ivory }); label(ctx, 'system settings.', 174, 220, { size: 22, weight: 400, color: P.ivory });
  } else if (variant === 1) {
    label(ctx, 'ACCESSIBILITY', 36, 58, { size: 17, weight: 600, color: P.cyan, tracking: 3 });
    [['Contrast', 'AA'], ['Focus order', 'OK'], ['Labels', 'OK'], ['Motion', 'Reduced']].forEach(([a, b], i) => { const y = 112 + i * 46; label(ctx, a, 36, y, { size: 22, weight: 400, color: P.ivory }); label(ctx, b, w - 36, y, { size: 22, weight: 600, color: P.cyan, align: 'right' }); ctx.fillStyle = INK.line; ctx.fillRect(36, y + 14, w - 72, 1); });
  } else {
    label(ctx, 'SPATIAL PANEL', 36, 58, { size: 17, weight: 600, color: P.cyan, tracking: 3 });
    fillRoundRect(ctx, 36, 90, w - 72, 150, 18, INK.surface2); fillRoundRect(ctx, 60, 116, 160, 14, 7, P.ivory); fillRoundRect(ctx, 60, 146, 220, 10, 5, P.gray); fillRoundRect(ctx, 60, 170, 190, 10, 5, P.gray); fillRoundRect(ctx, 60, 200, 110, 26, 13, 'rgba(128,201,248,0.25)');
  }
}

// ---------- the accessibility panel (1536 x 1024) ----------
// Draws one idea at a time. `st` = { idea, k, sub } where idea in
// 'text' | 'focus' | 'error' | 'choice' | 'labels' | 'motion' | 'inputs' and k is the local progress (seconds since the idea began).
const IDEA_TITLE = { text: 'READABLE TEXT', focus: 'KEYBOARD ACCESS', error: 'CLEAR ERROR RECOVERY', choice: 'CHOICES THAT RESPECT ATTENTION', labels: 'LABELS ON ICON BUTTONS', motion: 'REDUCE MOTION', inputs: 'MANY WAYS TO INTERACT' };
const LOREM = ['Your order ships in two days.', 'Track it from your account at any time.', 'Returns are free within thirty days.', 'Questions? Reply to this message and a person will answer.'];

export function drawA11y(ctx, w, h, st, alphaIn = 1) {
  ctx.clearRect(0, 0, w, h);
  fillRoundRect(ctx, 0, 0, w, h, 40, '#121720', 'rgba(246,242,232,0.12)', 2);
  ctx.save(); ctx.globalAlpha = alphaIn;
  const { idea, k } = st;
  const title = IDEA_TITLE[idea] || '';
  const tA = clamp(k / 0.35);
  label(ctx, title, 112, 92, { size: 26, weight: 600, color: P.cyan, tracking: 4.5, alpha: tA });
  ctx.fillStyle = 'rgba(128,201,248,0.35)'; ctx.fillRect(112, 112, 220 * easeOut(tA), 2);
  const bodyY = 180;
  switch (idea) {
    case 'text': {
      // phase A (0–1.5 s): tiny text on long lines becomes larger text on a comfortable measure.
      // phase B (1.5–2.4 s): a low-contrast grey line becomes readable ivory.
      const kA = easeInOut(seg(k, 0.25, 1.45)), kB = easeInOut(seg(k, 1.7, 2.4));
      const size = lerp(22, 40, kA), measure = lerp(w - 144, 900, kA), lh = lerp(1.18, 1.5, kA);
      const words = LOREM.join(' ').split(' '); let line = '', y = bodyY + 90; const lines = [];
      ctx.font = F(400, size); for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > measure && line) { lines.push(line); line = wd; } else line = test; } if (line) lines.push(line);
      lines.forEach((l, i) => label(ctx, l, 72, y + i * size * lh, { size, weight: 400, color: P.ivory }));
      const yc = y + lines.length * size * lh + 30;
      const grey = [lerp(72, 246, kB), lerp(76, 242, kB), lerp(84, 232, kB)].map(Math.round);
      label(ctx, 'Order no. 48213 · Placed 14 May', 72, yc + 30, { size: lerp(19, 28, kA), weight: 400, color: `rgb(${grey.join(',')})` });
      // measure rule + annotation
      const ann = seg(k, 0.9, 1.5) * (1 - seg(k, 1.6, 2.0));
      if (ann > 0) { ctx.save(); ctx.globalAlpha = ann; ctx.strokeStyle = P.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(72, h - 170); ctx.lineTo(72 + measure, h - 170); ctx.stroke(); for (const x of [72, 72 + measure]) { ctx.beginPath(); ctx.moveTo(x, h - 182); ctx.lineTo(x, h - 158); ctx.stroke(); } label(ctx, 'about 60–70 characters per line', 72 + measure / 2, h - 186, { size: 22, weight: 500, color: P.cyan, align: 'center' }); ctx.restore(); }
      const ann2 = seg(k, 2.0, 2.4);
      if (ann2 > 0) label(ctx, 'contrast 2.1 : 1  →  12.6 : 1', 72, h - 160, { size: 22, weight: 500, color: P.cyan, alpha: ann2 });
      break;
    }
    case 'focus': case 'error': {
      // a short form: Name, Email, Password, Continue. Focus ring (amber) hops across the four controls.
      const fx = 72, fw = 760, fields = ['Full name', 'Email', 'Password'];
      const ys = [bodyY + 40, bodyY + 190, bodyY + 340]; const by = bodyY + 500;
      fields.forEach((f, i) => { label(ctx, f, fx, ys[i], { size: 24, weight: 500, color: P.ivory }); fillRoundRect(ctx, fx, ys[i] + 18, fw, 76, 16, INK.surface2, INK.line2, 1.5); label(ctx, ['Alex Rivera', 'alex@example', '••••••••'][i], fx + 26, ys[i] + 66, { size: 26, weight: 400, color: i === 2 ? P.ivory : P.ivory }); });
      fillRoundRect(ctx, fx, by, 260, 72, 36, P.cyan); label(ctx, 'Continue', fx + 130, by + 46, { size: 26, weight: 600, color: P.graphite, align: 'center' });
      if (idea === 'focus') {
        const boxes = [[fx, ys[0] + 18, fw, 76, 16], [fx, ys[1] + 18, fw, 76, 16], [fx, ys[2] + 18, fw, 76, 16], [fx, by, 260, 72, 36]];
        const hop = st.hop; // index 0..3 (may be fractional from the scene for motion)
        const i0 = Math.floor(hop), f = hop - i0, b0 = boxes[Math.min(i0, 3)], b1 = boxes[Math.min(i0 + 1, 3)]; const e = easeInOut(clamp(f));
        const b = b0.map((v, j) => lerp(v, b1[j], e)); const pad = 7;
        ctx.save(); ctx.shadowColor = 'rgba(255,171,91,0.55)'; ctx.shadowBlur = 24; roundRect(ctx, b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2, b[4] + pad); ctx.strokeStyle = P.amber; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
        // keyboard hint
        const kb = clamp(k / 0.6); fillRoundRect(ctx, w - 72 - 150, 56, 150, 50, 12, INK.surface2, INK.line2, 1.5); label(ctx, 'Tab ⇥', w - 72 - 75, 90, { size: 24, weight: 600, color: P.ivory, align: 'center', alpha: kb });
        label(ctx, 'Every control reachable without a mouse', fx, h - 150, { size: 24, weight: 400, color: P.gray, alpha: kb });
      } else {
        // error: first a border-only warning (0–0.7 s), then a real message with text (0.7 s →)
        const kE = seg(k, 0.0, 0.3), kM = easeOut(seg(k, 0.8, 1.3));
        ctx.save(); roundRect(ctx, fx, ys[1] + 18, fw, 76, 16); ctx.strokeStyle = `rgba(232,134,46,${0.9 * kE})`; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        if (kE > 0 && kM < 1) label(ctx, 'colour alone — what went wrong?', fx + fw + 28, ys[1] + 66, { size: 22, weight: 400, color: P.gray2, alpha: kE * (1 - kM) });
        if (kM > 0) {
          ctx.save(); ctx.globalAlpha = kM;
          ctx.strokeStyle = P.amberDeep; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(fx + 14, ys[1] + 124, 11, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = P.amberDeep; ctx.fillRect(fx + 12.5, ys[1] + 117, 3, 8); ctx.fillRect(fx + 12.5, ys[1] + 127, 3, 3);
          label(ctx, 'Enter a valid email address, e.g. name@example.com', fx + 38, ys[1] + 132, { size: 24, weight: 500, color: P.amber });
          ctx.restore();
          label(ctx, 'Says what happened and how to fix it · announced to screen readers', fx, h - 150, { size: 24, weight: 400, color: P.gray, alpha: kM });
        }
      }
      break;
    }
    case 'choice': {
      // two halves: helpful (left) vs manipulative (right). Quiet, not preachy.
      const half = (w - 144 - 60) / 2, lx = 72, rx = 72 + half + 60, top = bodyY - 10, hh = h - top - 110;
      const kL = easeOut(seg(k, 0.1, 0.7)), kR = easeOut(seg(k, 0.9, 1.5)), kX = easeOutBack(seg(k, 2.6, 3.0));
      // left
      ctx.save(); ctx.globalAlpha = kL;
      label(ctx, 'HELPFUL', lx, top + 10, { size: 20, weight: 600, color: P.cyan, tracking: 3.5 });
      fillRoundRect(ctx, lx, top + 40, half, hh - 40, 28, INK.surface2, INK.line2, 1.5);
      label(ctx, 'Email preferences', lx + 40, top + 112, { size: 30, weight: 500, color: P.ivory });
      [['Product updates', true], ['Weekly digest', false]].forEach(([s, on], i) => { const y = top + 180 + i * 72; label(ctx, s, lx + 40, y + 8, { size: 24, weight: 400, color: P.ivory }); fillRoundRect(ctx, lx + half - 112, y - 16, 72, 40, 20, on ? P.cyan : INK.surface, on ? null : INK.line2, 1.5); ctx.fillStyle = on ? P.graphite : P.gray; ctx.beginPath(); ctx.arc(on ? lx + half - 60 : lx + half - 92, y + 4, 14, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = INK.line; ctx.fillRect(lx + 40, top + 330, half - 80, 1);
      label(ctx, 'Unsubscribe from all emails', lx + 40, top + 384, { size: 24, weight: 500, color: P.cyan }); ctx.fillStyle = P.cyan; ctx.fillRect(lx + 40, top + 392, textW(ctx, 'Unsubscribe from all emails', 24, 500), 2);
      ctx.restore();
      // right
      ctx.save(); ctx.globalAlpha = kR;
      label(ctx, 'MANIPULATIVE', rx, top + 10, { size: 20, weight: 600, color: P.gray, tracking: 3.5 });
      fillRoundRect(ctx, rx, top + 40, half, hh - 40, 28, INK.surface2, INK.line2, 1.5);
      label(ctx, 'Wait! Don’t go yet', rx + half / 2, top + 130, { size: 34, weight: 600, color: P.ivory, align: 'center' });
      label(ctx, 'Your 20 % discount will expire', rx + half / 2, top + 172, { size: 22, weight: 400, color: P.gray, align: 'center' });
      fillRoundRect(ctx, rx + 40, top + 220, half - 80, 112, 24, P.ivory); label(ctx, 'KEEP MY DISCOUNT', rx + half / 2, top + 290, { size: 36, weight: 700, color: P.graphite, align: 'center', tracking: 1 });
      label(ctx, 'no thanks', rx + half / 2, top + 384, { size: 15, weight: 400, color: '#3A4049', align: 'center' });
      ctx.restore();
      if (kX > 0) { ctx.save(); ctx.globalAlpha = clamp(kX); ctx.strokeStyle = P.gray; ctx.lineWidth = 3; const cx = rx + half - 36, cy = top + 10 - 8, r = 10 * kX; ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke(); ctx.restore(); }
      break;
    }
    case 'labels': {
      const icons = ['edit', 'delete', 'share', 'search'], names = ['Edit', 'Delete', 'Share', 'Search'];
      const bw = 150, gap = 54, x0 = 72, y0 = bodyY + 90;
      icons.forEach((ic, i) => {
        const x = x0 + i * (bw + gap); fillRoundRect(ctx, x, y0, bw, bw, 30, INK.surface2, INK.line2, 1.5);
        ctx.save(); ctx.strokeStyle = P.ivory; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const cx = x + bw / 2, cy = y0 + bw / 2;
        if (ic === 'edit') { ctx.beginPath(); ctx.moveTo(cx - 24, cy + 24); ctx.lineTo(cx - 24, cy + 8); ctx.lineTo(cx + 14, cy - 30); ctx.lineTo(cx + 30, cy - 14); ctx.lineTo(cx - 8, cy + 24); ctx.closePath(); ctx.stroke(); }
        if (ic === 'delete') { ctx.beginPath(); ctx.rect(cx - 20, cy - 16, 40, 44); ctx.moveTo(cx - 30, cy - 16); ctx.lineTo(cx + 30, cy - 16); ctx.moveTo(cx - 10, cy - 30); ctx.lineTo(cx + 10, cy - 30); ctx.stroke(); }
        if (ic === 'share') { ctx.beginPath(); ctx.arc(cx + 22, cy - 24, 9, 0, 7); ctx.moveTo(cx - 22, cy); ctx.arc(cx - 22, cy, 9, 0, 7); ctx.moveTo(cx + 22, cy + 24); ctx.arc(cx + 22, cy + 24, 9, 0, 7); ctx.moveTo(cx - 14, cy - 4); ctx.lineTo(cx + 14, cy - 20); ctx.moveTo(cx - 14, cy + 4); ctx.lineTo(cx + 14, cy + 20); ctx.stroke(); }
        if (ic === 'search') { ctx.beginPath(); ctx.arc(cx - 6, cy - 6, 20, 0, 7); ctx.moveTo(cx + 9, cy + 9); ctx.lineTo(cx + 28, cy + 28); ctx.stroke(); }
        ctx.restore();
        const la = easeOut(seg(k, 0.5 + i * 0.22, 0.9 + i * 0.22));
        if (la > 0) { const lw = textW(ctx, names[i], 24, 600) + 40; ctx.save(); ctx.globalAlpha = la; fillRoundRect(ctx, x + bw / 2 - lw / 2, y0 + bw + 24 + (1 - la) * 10, lw, 48, 12, P.ivory); label(ctx, names[i], x + bw / 2, y0 + bw + 57 + (1 - la) * 10, { size: 24, weight: 600, color: P.graphite, align: 'center' }); ctx.restore(); }
      });
      const kc = easeOut(seg(k, 1.5, 2.0));
      label(ctx, 'A name for every control — read aloud, shown on hover, searchable', 72, h - 150, { size: 24, weight: 400, color: P.gray, alpha: kc });
      break;
    }
    case 'motion': {
      // a notification card with a bouncing badge; a Reduce-motion toggle flips at st.flip (seconds) and the bounce settles.
      const flipT = st.flip ?? 1.2, on = k >= flipT; const kf = easeInOut(seg(k, flipT, flipT + 0.35));
      const cardX = 72, cardY = bodyY + 60, cardW = 760, cardH = 150;
      fillRoundRect(ctx, cardX, cardY, cardW, cardH, 24, INK.surface2, INK.line2, 1.5);
      label(ctx, 'New comment on “Checkout flow”', cardX + 118, cardY + 66, { size: 26, weight: 500, color: P.ivory });
      label(ctx, 'Researcher · just now', cardX + 118, cardY + 102, { size: 20, weight: 400, color: P.gray });
      // bouncing dot: amplitude decays after the flip
      const bounceT = on ? flipT : k; const amp = 34 * (1 - kf);
      const yb = cardY + 60 - Math.abs(Math.sin(bounceT * Math.PI * 2.2)) * amp;
      ctx.fillStyle = P.cyan; ctx.beginPath(); ctx.arc(cardX + 62, yb + 14, 22, 0, Math.PI * 2); ctx.fill();
      label(ctx, '3', cardX + 62, yb + 23, { size: 24, weight: 700, color: P.graphite, align: 'center' });
      // toggle
      const ty = cardY + cardH + 110; label(ctx, 'Reduce motion', cardX, ty + 10, { size: 28, weight: 500, color: P.ivory });
      const tx = cardX + 300; fillRoundRect(ctx, tx, ty - 22, 96, 54, 27, on ? P.amber : INK.surface2, on ? null : INK.line2, 1.5); ctx.fillStyle = on ? P.graphite : P.gray; ctx.beginPath(); ctx.arc(lerp(tx + 27, tx + 69, kf), ty + 5, 19, 0, Math.PI * 2); ctx.fill();
      label(ctx, on ? 'On' : 'Off', tx + 124, ty + 14, { size: 24, weight: 500, color: on ? P.amber : P.gray });
      label(ctx, 'Animation that moves on its own can be stopped', 72, h - 150, { size: 24, weight: 400, color: P.gray, alpha: clamp(k / 0.6) });
      break;
    }
    case 'inputs': {
      // four input-method badges + three abstract role silhouettes above them
      const names = ['Keyboard', 'Pointer', 'Touch', 'Voice'], n = 4, bw = 250, gap = 44, x0 = (w - (bw * n + gap * (n - 1))) / 2, y0 = bodyY + 300;
      // silhouettes (abstract): head + shoulders, three sizes, ivory/gray tones
      const sil = easeOut(seg(k, 0.1, 0.8));
      [[-1, 0.92], [0, 1], [1, 0.95]].forEach(([dx, s], i) => { const cx = w / 2 + dx * 180, by = bodyY + 220; ctx.save(); ctx.globalAlpha = sil * 0.9; ctx.fillStyle = [P.gray, P.ivory, P.cyan][i]; ctx.beginPath(); ctx.arc(cx, by - 120 * s, 34 * s, 0, Math.PI * 2); ctx.fill(); roundRect(ctx, cx - 66 * s, by - 76 * s, 132 * s, 76 * s, 40 * s); ctx.fill(); ctx.restore(); });
      names.forEach((nm, i) => {
        const a = easeOut(seg(k, 0.6 + i * 0.25, 1.0 + i * 0.25)); if (a <= 0) return;
        const x = x0 + i * (bw + gap); ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 14);
        fillRoundRect(ctx, x, y0, bw, 200, 28, INK.surface2, 'rgba(128,201,248,0.35)', 1.5);
        const cx = x + bw / 2, cy = y0 + 86; ctx.strokeStyle = P.cyan; ctx.fillStyle = P.cyan; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (i === 0) { roundRect(ctx, cx - 48, cy - 26, 96, 56, 10); ctx.stroke(); for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) ctx.fillRect(cx - 36 + c * 16, cy - 14 + r * 14, 8, 6); ctx.fillRect(cx - 28, cy + 14, 56, 5); }
        if (i === 1) { ctx.beginPath(); ctx.moveTo(cx - 14, cy - 30); ctx.lineTo(cx - 14, cy + 22); ctx.lineTo(cx - 2, cy + 11); ctx.lineTo(cx + 8, cy + 32); ctx.lineTo(cx + 18, cy + 27); ctx.lineTo(cx + 8, cy + 7); ctx.lineTo(cx + 24, cy + 5); ctx.closePath(); ctx.stroke(); }
        if (i === 2) { ctx.beginPath(); roundRect(ctx, cx - 10, cy - 34, 20, 50, 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 10, cy + 2); ctx.lineTo(cx - 30, cy + 10); ctx.lineTo(cx - 24, cy + 34); ctx.lineTo(cx + 26, cy + 34); ctx.lineTo(cx + 30, cy + 8); ctx.lineTo(cx + 10, cy); ctx.stroke(); }
        if (i === 3) { [[-30, 14], [-15, 26], [0, 40], [15, 24], [30, 12]].forEach(([dx, hh]) => fillRoundRect(ctx, cx + dx - 4, cy - hh / 2, 8, hh, 4, P.cyan)); }
        label(ctx, nm, cx, y0 + 168, { size: 24, weight: 600, color: P.ivory, align: 'center' }); ctx.restore();
      });
      label(ctx, 'Different people, different ways in — the same interface', w / 2, h - 150, { size: 24, weight: 400, color: P.gray, align: 'center', alpha: easeOut(seg(k, 1.8, 2.3)) });
      break;
    }
  }
  ctx.restore();
}
