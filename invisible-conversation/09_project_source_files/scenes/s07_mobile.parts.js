// SCENE 07 helpers — 2D painters for the screens in "The Web Goes Mobile":
// a crowded mid-1990s page, its clear restructure, a 2007-style touchscreen phone UI, a fluid responsive
// article layout (used by three device screens and the design workspace), and the workspace itself.
// Everything here is Canvas 2D and a pure function of its arguments. All pages are fictional.
import { PALETTE } from '../lib/stage.js';
import { clamp, lerp, seg, easeInOut, easeOut, hash } from '../lib/util.js';
import { roundRect } from '../lib/gfx.js';

const SERIF = 'Liberation Serif', SANS = 'Liberation Sans', MONO = 'DejaVu Sans Mono';

// ---------- tiny text helpers (ctx-local) ----------
export function tx(x, str, px, py, o = {}) {
  const { size = 16, weight = 400, family = 'Inter', color = '#000', align = 'left', baseline = 'alphabetic', alpha = 1, tracking = 0, italic = false, underline = false } = o;
  if (alpha <= 0 || !str) return 0;
  x.save(); x.globalAlpha *= alpha; x.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`; x.fillStyle = color; x.textAlign = align; x.textBaseline = baseline;
  x.letterSpacing = tracking ? `${tracking}px` : '0px';
  x.fillText(str, px, py);
  const w = x.measureText(str).width;
  if (underline) { const x0 = align === 'center' ? px - w / 2 : align === 'right' ? px - w : px; x.fillRect(x0, py + size * 0.1, w, Math.max(1, size / 16)); }
  x.restore(); return w;
}
export function mw(x, str, o = {}) { const { size = 16, weight = 400, family = 'Inter', tracking = 0, italic = false } = o; x.save(); x.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`; x.letterSpacing = tracking ? `${tracking}px` : '0px'; const w = x.measureText(str).width; x.restore(); return w; }
export function wrapLines(x, str, maxW, o) { const words = str.split(' '); const lines = []; let cur = ''; for (const w of words) { const test = cur ? cur + ' ' + w : w; if (mw(x, test, o) > maxW && cur) { lines.push(cur); cur = w; } else cur = test; } if (cur) lines.push(cur); return lines; }
export function para(x, str, px, py, maxW, o = {}) { const lines = wrapLines(x, str, maxW, o); const lh = o.lh || (o.size || 16) * 1.3; lines.forEach((l, i) => tx(x, l, px, py + i * lh, o)); return lines.length * lh; }

// ---------- 1990s window chrome ----------
function bevel(x, px, py, w, h, { sunken = false, fill = '#C0C0C0' } = {}) {
  x.fillStyle = fill; x.fillRect(px, py, w, h);
  const lt = sunken ? '#808080' : '#FFFFFF', rb = sunken ? '#FFFFFF' : '#404040', lt2 = sunken ? '#404040' : '#DFDFDF', rb2 = sunken ? '#DFDFDF' : '#808080';
  x.fillStyle = lt; x.fillRect(px, py, w, 1); x.fillRect(px, py, 1, h);
  x.fillStyle = rb; x.fillRect(px, py + h - 1, w, 1); x.fillRect(px + w - 1, py, 1, h);
  x.fillStyle = lt2; x.fillRect(px + 1, py + 1, w - 2, 1); x.fillRect(px + 1, py + 1, 1, h - 2);
  x.fillStyle = rb2; x.fillRect(px + 1, py + h - 2, w - 2, 1); x.fillRect(px + w - 2, py + 1, 1, h - 2);
}
function hrule(x, px, py, w) { x.fillStyle = '#808080'; x.fillRect(px, py, w, 1); x.fillStyle = '#FFFFFF'; x.fillRect(px, py + 1, w, 1); }
function tableBorder(x, px, py, w, h) { x.fillStyle = '#FFFFFF'; x.fillRect(px, py, w, 1); x.fillRect(px, py, 1, h); x.fillStyle = '#707070'; x.fillRect(px, py + h - 1, w, 1); x.fillRect(px + w - 1, py, 1, h); }
function cellBorder(x, px, py, w, h) { x.fillStyle = '#707070'; x.fillRect(px, py, w, 1); x.fillRect(px, py, 1, h); x.fillStyle = '#FFFFFF'; x.fillRect(px, py + h - 1, w, 1); x.fillRect(px + w - 1, py, 1, h); }

export const BROWSER90 = { title: 'Harbourview Model Railway Club - Home Page', url: 'http://www.harbourview-mrc.example/~club/index.htm' };
export function paintBrowser90(x, W, H, { title, url } = BROWSER90) {
  x.fillStyle = '#C0C0C0'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#000080'); g.addColorStop(1, '#1084D0');
  x.fillStyle = g; x.fillRect(4, 4, W - 8, 30);
  tx(x, title, 14, 27, { size: 20, weight: 700, family: SANS, color: '#fff' });
  for (let i = 0; i < 3; i++) { bevel(x, W - 10 - 26 * (3 - i), 7, 24, 24); }
  x.fillStyle = '#000'; x.fillRect(W - 80, 24, 8, 2); x.fillRect(W - 54, 14, 10, 10); x.fillStyle = '#C0C0C0'; x.fillRect(W - 52, 16, 6, 6);
  let mx = 14; for (const m of ['File', 'Edit', 'View', 'Go', 'Bookmarks', 'Options', 'Directory', 'Window', 'Help']) { mx += tx(x, m, mx, 58, { size: 19, family: SANS }) + 22; }
  const tb = ['Back', 'Forward', 'Home', 'Reload', 'Images', 'Open', 'Print', 'Find', 'Stop']; let bx = 10;
  for (const b of tb) { bevel(x, bx, 72, 86, 46); x.fillStyle = '#606060'; x.fillRect(bx + 33, 78, 20, 14); tx(x, b, bx + 43, 110, { size: 15, family: SANS, align: 'center', color: '#000' }); bx += 90; }
  hrule(x, 4, 124, W - 8);
  tx(x, 'Location:', 14, 150, { size: 18, family: SANS });
  bevel(x, 100, 130, W - 116, 30, { sunken: true, fill: '#FFFFFF' });
  tx(x, url, 108, 152, { size: 18, family: SANS, color: '#000' });
  hrule(x, 4, 166, W - 8);
  // status bar
  bevel(x, 4, H - 30, W - 8, 26, { sunken: true });
  return { top: 170, bottom: H - 34 };
}

function pixelBanner(x, px, py, w, h, label) {
  const c = document.createElement('canvas'); c.width = Math.round(w / 4); c.height = Math.round(h / 4); const cx = c.getContext('2d');
  cx.fillStyle = '#006040'; cx.fillRect(0, 0, c.width, c.height); cx.fillStyle = '#FFD400'; cx.fillRect(0, c.height - 4, c.width, 2);
  cx.font = `700 ${Math.round(c.height * 0.55)}px ${SANS}`; cx.fillStyle = '#FFFFFF'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(label, c.width / 2, c.height / 2 - 1);
  x.save(); x.imageSmoothingEnabled = false; x.drawImage(c, px, py, w, h); x.restore();
}
function stripes(x, px, py, w, h) { x.save(); x.beginPath(); x.rect(px, py, w, h); x.clip(); x.fillStyle = '#FFD400'; x.fillRect(px, py, w, h); x.fillStyle = '#000'; for (let i = -h; i < w + h; i += 24) { x.beginPath(); x.moveTo(px + i, py); x.lineTo(px + i + 12, py); x.lineTo(px + i + 12 - h, py + h); x.lineTo(px + i - h, py + h); x.closePath(); x.fill(); } x.restore(); }
function counter(x, px, py, digits) { x.fillStyle = '#000'; x.fillRect(px, py, digits.length * 18 + 10, 30); tx(x, digits, px + 5, py + 23, { size: 22, family: MONO, color: '#33FF66' }); }

// The crowded mid-1990s page. Fictional club site. Returns anchor points (canvas px) for the four annotations.
export function paintCrowded(x, W, H) {
  const { top, bottom } = paintBrowser90(x, W, H);
  tx(x, 'Document: Done', 12, H - 11, { size: 15, family: SANS, color: '#000' });
  const L = 12, R = W - 12, T0 = top + 8;
  tableBorder(x, L, T0, R - L, bottom - T0 - 4);
  // banner row
  const y0 = T0 + 2; cellBorder(x, L + 2, y0, R - L - 4, 150);
  pixelBanner(x, W / 2 - 360, y0 + 8, 720, 56, 'HARBOURVIEW MODEL RAILWAY CLUB');
  tx(x, '*** Welcome to the Harbourview Model Railway Club Home Page!!! ***', W / 2, y0 + 100, { size: 26, weight: 700, italic: true, family: SERIF, color: '#800000', align: 'center' });
  tx(x, 'NEW!', W / 2 - 520, y0 + 100, { size: 16, weight: 700, family: SANS, color: '#FF0000' });
  tx(x, 'Updated!', W / 2 + 470, y0 + 100, { size: 16, weight: 700, family: SANS, color: '#FF0000' });
  tx(x, 'You are visitor number', W / 2 - 110, y0 + 136, { size: 17, family: SERIF, color: '#404040', align: 'right' });
  counter(x, W / 2 - 100, y0 + 114, '004512');
  tx(x, 'since this page went online', W / 2 + 30, y0 + 136, { size: 17, family: SERIF, color: '#404040' });
  // three columns
  const y1 = y0 + 152, colH = bottom - 4 - y1 - 56;
  const c1 = [L + 2, 300], c2 = [L + 302, 580], c3 = [L + 882, R - L - 886];
  // left: link list on pale yellow
  x.fillStyle = '#FFFFCC'; x.fillRect(c1[0], y1, c1[1], colH); cellBorder(x, c1[0], y1, c1[1], colH);
  tx(x, 'Contents', c1[0] + 12, y1 + 34, { size: 22, weight: 700, family: SERIF, underline: true });
  const links = ['Click here for What\'s New!', 'Members Area', 'Club History', 'Layout Photos (under construction)', 'Meeting Times', 'Newsletter Archive', 'Links to Other Pages', 'Sign our Guestbook!', 'E-mail the Webmaster', 'Frequently Asked Questions', 'Model Scales Explained', 'Swap Meet Information', 'Download Section', 'Click Here!', 'Back to Top'];
  let ly = y1 + 68; const linkAnchor = [c1[0] + 40, ly - 8];
  links.forEach((l, i) => { tx(x, '•', c1[0] + 14, ly, { size: 20, family: SERIF }); tx(x, l, c1[0] + 30, ly, { size: 20, family: SERIF, color: i % 4 === 2 ? '#551A8B' : '#0000EE', underline: true }); ly += 30; });
  hrule(x, c1[0] + 10, ly + 4, c1[1] - 20);
  tx(x, 'This page is best viewed at 800x600', c1[0] + 12, ly + 32, { size: 15, italic: true, family: SERIF, color: '#707070' });
  tx(x, 'with 256 colours or more.', c1[0] + 12, ly + 52, { size: 15, italic: true, family: SERIF, color: '#707070' });
  // centre: grey small text
  cellBorder(x, c2[0], y1, c2[1], colH);
  let cy = y1 + 36;
  tx(x, 'About The Club', c2[0] + 12, cy, { size: 23, weight: 700, family: SERIF }); cy += 24;
  const grey = { size: 17, family: SERIF, color: '#6E6E6E', lh: 20 };
  const p1 = 'The Harbourview Model Railway Club meets every Thursday evening in the club rooms on Harbour Road. We have members of all ages and experience, and we operate layouts in several scales. New members are always welcome, so please come along to one of our open evenings, or click here to send e-mail to the membership secretary for more information about joining the club.';
  cy += para(x, p1, c2[0] + 12, cy, c2[1] - 24, grey) + 6;
  const readAnchor = [c2[0] + c2[1] / 2, cy - 40];
  tx(x, 'What\'s New', c2[0] + 12, cy + 14, { size: 19, italic: true, family: SERIF, underline: true, color: '#004000' }); cy += 36;
  const p2 = 'The exhibition layout has been rewired and the signalling now works from the control panel. Photographs will be added soon (under construction). The newsletter archive has moved: click here. Please note the new meeting times below. Thanks to everyone who helped at the open day!';
  cy += para(x, p2, c2[0] + 12, cy, c2[1] - 24, grey) + 10;
  // nested table of meeting times
  const ny = cy; const nw = c2[1] - 24; tableBorder(x, c2[0] + 12, ny, nw, 118);
  const rows = [['Thursday', '7:30 pm - 10:00 pm', 'Club rooms'], ['Saturday', '2:00 pm - 5:00 pm', 'Running session'], ['First Sunday', '10:00 am - 1:00 pm', 'Work party']];
  rows.forEach((r, i) => { const ry = ny + 2 + i * 38; cellBorder(x, c2[0] + 14, ry, 150, 36); cellBorder(x, c2[0] + 164, ry, 200, 36); cellBorder(x, c2[0] + 364, ry, nw - 352, 36); tx(x, r[0], c2[0] + 22, ry + 24, { size: 16, weight: 700, family: SERIF }); tx(x, r[1], c2[0] + 172, ry + 24, { size: 16, family: SERIF, color: '#505050' }); tx(x, r[2], c2[0] + 372, ry + 24, { size: 16, family: SERIF, color: '#505050' }); });
  cy = ny + 130; const crowdAnchor = [c2[0] + c2[1] / 2 + 60, ny + 60];
  stripes(x, c2[0] + 12, cy, nw, 14);
  tx(x, 'This page is under construction!', c2[0] + 12, cy + 38, { size: 18, weight: 700, family: SERIF, color: '#FF0000' });
  tx(x, 'Last updated: 14 March', c2[0] + 12, cy + 62, { size: 15, family: SERIF, color: '#707070', italic: true });
  const p3 = 'Links to this page are welcome. The club is not responsible for the content of external pages. Problems with this page? E-mail the webmaster. Best viewed with any browser.';
  cy += 80; cy += para(x, p3, c2[0] + 12, cy, c2[1] - 24, { size: 15, family: SERIF, color: '#808080', lh: 18 });
  // right: quick links, form, on pale green
  x.fillStyle = '#CCFFCC'; x.fillRect(c3[0], y1, c3[1], colH); cellBorder(x, c3[0], y1, c3[1], colH);
  tx(x, 'QUICK LINKS', c3[0] + c3[1] / 2, y1 + 34, { size: 19, weight: 700, family: SERIF, align: 'center', underline: true });
  let qy = y1 + 66; const hierAnchor = [c3[0] + c3[1] / 2, y1 + 24];
  ['Home', 'Home Page', 'Main Index', 'Welcome', 'Site Map', 'Links', 'More Links', 'Other Clubs'].forEach((l, i) => { tx(x, l, c3[0] + c3[1] / 2, qy, { size: 19, family: SERIF, color: i === 3 ? '#551A8B' : '#0000EE', underline: true, align: 'center' }); qy += 27; });
  hrule(x, c3[0] + 10, qy, c3[1] - 20); qy += 30;
  tx(x, 'Join our mailing list:', c3[0] + 12, qy, { size: 19, weight: 700, family: SERIF }); qy += 14;
  bevel(x, c3[0] + 12, qy, c3[1] - 120, 30, { sunken: true, fill: '#FFFFFF' }); bevel(x, c3[0] + c3[1] - 100, qy, 86, 30); tx(x, 'Submit', c3[0] + c3[1] - 57, qy + 21, { size: 16, family: SANS, align: 'center' }); qy += 56;
  tx(x, 'Sign the Guestbook!', c3[0] + c3[1] / 2, qy, { size: 21, weight: 700, family: SERIF, color: '#FF0000', align: 'center', underline: true }); qy += 36;
  tx(x, 'Members only:', c3[0] + 12, qy, { size: 18, weight: 700, italic: true, family: SERIF }); qy += 14;
  tx(x, 'Name', c3[0] + 12, qy + 21, { size: 16, family: SANS }); bevel(x, c3[0] + 70, qy, c3[1] - 84, 28, { sunken: true, fill: '#FFFFFF' }); qy += 36;
  tx(x, 'Pass', c3[0] + 12, qy + 21, { size: 16, family: SANS }); bevel(x, c3[0] + 70, qy, c3[1] - 84, 28, { sunken: true, fill: '#FFFFFF' }); qy += 40;
  bevel(x, c3[0] + 70, qy, 80, 30); tx(x, 'Login', c3[0] + 110, qy + 21, { size: 16, family: SANS, align: 'center' }); qy += 60;
  tx(x, 'E-mail the Webmaster', c3[0] + c3[1] / 2, qy, { size: 18, family: SERIF, color: '#0000EE', underline: true, align: 'center' });
  // footer
  const fy = y1 + colH; cellBorder(x, L + 2, fy, R - L - 4, 54);
  tx(x, 'Harbourview Model Railway Club  ·  All rights reserved  ·  Page maintained by the club webmaster  ·  Mail: webmaster@harbourview-mrc.example', W / 2, fy + 24, { size: 14, family: SERIF, color: '#808080', align: 'center' });
  tx(x, 'Home | What\'s New | Members | History | Photos | Meetings | Newsletter | Links | Guestbook | E-mail | FAQ | Scales | Swap Meet | Downloads | Top', W / 2, fy + 44, { size: 14, family: SERIF, color: '#0000EE', align: 'center' });
  return { links: linkAnchor, crowded: crowdAnchor, readability: readAnchor, hierarchy: hierAnchor };
}

// The restructured page: same site, clear hierarchy, readable type, high contrast. Returns focusable control rects.
export function paintClean(x, W, H) {
  const { top, bottom } = paintBrowser90(x, W, H);
  tx(x, 'Document: Done', 12, H - 11, { size: 15, family: SANS, color: '#000' });
  x.fillStyle = '#FFFFFF'; x.fillRect(4, top, W - 8, bottom - top);
  const M = 84, blue = '#0033AA', ink = '#1A1A1A';
  tx(x, 'Harbourview Model Railway Club', M, top + 86, { size: 44, weight: 700, family: SANS, color: ink });
  tx(x, 'A friendly club for model railway enthusiasts of every age and scale.', M, top + 122, { size: 21, family: SANS, color: '#555555' });
  x.fillStyle = '#DDDDDD'; x.fillRect(M, top + 150, W - 2 * M, 2);
  const nav = ['Home', 'About the club', 'Events', 'Gallery', 'Contact']; const navRects = []; let nx = M;
  for (const n of nav) { const w = mw(x, n, { size: 22, weight: 700, family: SANS }); navRects.push([nx - 12, top + 166, w + 24, 44]); tx(x, n, nx, top + 196, { size: 22, weight: 700, family: SANS, color: blue, underline: true }); nx += w + 54; }
  x.fillStyle = '#DDDDDD'; x.fillRect(M, top + 220, W - 2 * M, 1);
  // main column
  const mainW = 700; let my = top + 290;
  tx(x, 'Welcome', M, my, { size: 32, weight: 700, family: SANS, color: ink }); my += 36;
  const body = { size: 23, family: SANS, color: '#222222', lh: 34 };
  my += para(x, 'We are a club of model railway enthusiasts based in Harbourview. Our layouts run in several scales, and visitors are welcome at every open evening.', M, my, mainW, body) + 16;
  my += para(x, 'Meetings are held on Thursday evenings in the club rooms on Harbour Road. New members can join at any meeting.', M, my, mainW, body) + 10;
  const lk = 'Read our newsletter'; const lkw = mw(x, lk, { size: 23, family: SANS });
  tx(x, lk, M, my + 28, { size: 23, family: SANS, color: blue, underline: true }); const linkRect = [M - 8, my + 2, lkw + 16, 40];
  tx(x, 'for news from the layouts and the workshop.', M + lkw + 8, my + 28, { size: 23, family: SANS, color: '#222222' }); my += 80;
  roundRect(x, M, my, 236, 56, 5); x.fillStyle = blue; x.fill(); tx(x, 'Join the club', M + 118, my + 37, { size: 22, weight: 700, family: SANS, color: '#fff', align: 'center' });
  const btnRect = [M, my, 236, 56];
  // sidebar card
  const sx = W - M - 360, sy = top + 262, sw = 360;
  x.fillStyle = '#F4F4F4'; x.fillRect(sx, sy, sw, 300); x.strokeStyle = '#D0D0D0'; x.lineWidth = 1; x.strokeRect(sx + 0.5, sy + 0.5, sw - 1, 299);
  // simple picture: rails converging
  x.save(); x.beginPath(); x.rect(sx, sy, sw, 150); x.clip(); const sk = x.createLinearGradient(0, sy, 0, sy + 150); sk.addColorStop(0, '#DCE4EA'); sk.addColorStop(1, '#B9C3CC'); x.fillStyle = sk; x.fillRect(sx, sy, sw, 150);
  x.strokeStyle = '#60666C'; x.lineWidth = 3; x.beginPath(); x.moveTo(sx + 60, sy + 150); x.lineTo(sx + 172, sy + 60); x.moveTo(sx + 300, sy + 150); x.lineTo(sx + 188, sy + 60); x.stroke();
  x.lineWidth = 2; for (let i = 0; i < 9; i++) { const k = i / 9; const yy = sy + 150 - k * 88; const half = lerp(130, 10, k); x.beginPath(); x.moveTo(sx + 180 - half, yy); x.lineTo(sx + 180 + half, yy); x.stroke(); } x.restore();
  tx(x, 'Next open evening', sx + 20, sy + 190, { size: 22, weight: 700, family: SANS, color: ink });
  tx(x, 'Thursday, 7:30 pm', sx + 20, sy + 224, { size: 20, family: SANS, color: '#333' });
  tx(x, 'Club rooms, Harbour Road', sx + 20, sy + 252, { size: 20, family: SANS, color: '#333' });
  tx(x, 'Directions', sx + 20, sy + 284, { size: 20, family: SANS, color: blue, underline: true });
  // footer
  x.fillStyle = '#DDDDDD'; x.fillRect(M, bottom - 60, W - 2 * M, 1);
  tx(x, 'Contact  ·  Accessibility  ·  Site map', M, bottom - 26, { size: 18, family: SANS, color: '#555' });
  return { controls: [navRects[0], navRects[1], navRects[2], linkRect, btnRect] };
}

// CRT finishing: faint scanlines + edge darkening, drawn over the page.
export function crtFinish(x, W, H, k = 1) {
  x.save(); x.globalAlpha = 0.09 * k; x.fillStyle = '#000'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  x.globalAlpha = k; const g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
}

// ---------- 2007-style touchscreen phone UI (640 x 960 canvas = 2x of a 320 x 480 screen) ----------
const ICONS = [
  ['Weather', ['#5FB3F0', '#1E6FC0'], 'sun'], ['Notes', ['#F7E27C', '#E2BE37'], 'lines'], ['Camera', ['#7E8690', '#3C4149'], 'lens'], ['Maps', ['#CDE0A4', '#7FA85C'], 'pin'],
  ['Clock', ['#3E434B', '#15181D'], 'clock'], ['Calendar', ['#F4F4F4', '#D8D8D8'], 'cal'], ['Settings', ['#9AA0A8', '#50565E'], 'cog'], ['Music', ['#F6A24C', '#E0661E'], 'note'],
  ['Photos', ['#4FB8B0', '#1F7F7A'], 'photo'], ['Messages', ['#7BD66A', '#2E9A3C'], 'bubble'], ['Calculator', ['#8F96A0', '#4A5059'], 'grid'], ['Compass', ['#4D7DBE', '#23457C'], 'compass'],
];
const DOCK = [['Phone', ['#7BD66A', '#2E9A3C'], 'handset'], ['Mail', ['#6FB2F2', '#2466C0'], 'mail'], ['Browser', ['#5A9AE6', '#2A5CB0'], 'compass'], ['Music', ['#F6A24C', '#E0661E'], 'note']];
function glyph(x, kind, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.strokeStyle = 'rgba(255,255,255,0.92)'; x.fillStyle = 'rgba(255,255,255,0.92)'; x.lineWidth = s * 0.09; x.lineCap = 'round';
  const r = s * 0.3;
  switch (kind) {
    case 'sun': x.beginPath(); x.arc(0, 0, r * 0.55, 0, 7); x.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); x.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1); x.stroke(); } break;
    case 'lines': x.fillStyle = 'rgba(60,50,20,0.55)'; for (let i = -1; i <= 1; i++) x.fillRect(-r, i * r * 0.6 - s * 0.03, r * 2 * (i === 1 ? 0.6 : 1), s * 0.06); break;
    case 'lens': x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.45, 0, 7); x.fill(); break;
    case 'pin': x.beginPath(); x.arc(0, -r * 0.3, r * 0.55, Math.PI, 0); x.lineTo(0, r * 0.9); x.closePath(); x.fillStyle = '#C0392B'; x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -r * 0.3, r * 0.22, 0, 7); x.fill(); break;
    case 'clock': x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -r * 0.7); x.moveTo(0, 0); x.lineTo(r * 0.5, r * 0.2); x.stroke(); break;
    case 'cal': x.fillStyle = '#D84A3A'; x.fillRect(-s * 0.5, -s * 0.5, s, s * 0.26); x.fillStyle = '#333'; x.font = `700 ${s * 0.42}px Inter`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('15', 0, s * 0.12); break;
    case 'cog': for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); x.lineTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05); x.stroke(); } x.beginPath(); x.arc(0, 0, r * 0.7, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.28, 0, 7); x.fill(); break;
    case 'note': x.beginPath(); x.ellipse(-r * 0.35, r * 0.5, r * 0.32, r * 0.24, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(-r * 0.05, r * 0.5); x.lineTo(-r * 0.05, -r * 0.8); x.lineTo(r * 0.6, -r * 0.6); x.stroke(); break;
    case 'photo': x.beginPath(); x.moveTo(-r, r * 0.7); x.lineTo(-r * 0.3, -r * 0.2); x.lineTo(r * 0.1, r * 0.3); x.lineTo(r * 0.45, 0); x.lineTo(r, r * 0.7); x.closePath(); x.fill(); x.beginPath(); x.arc(r * 0.55, -r * 0.55, r * 0.22, 0, 7); x.fill(); break;
    case 'bubble': x.beginPath(); roundRect(x, -r, -r * 0.75, r * 2, r * 1.3, r * 0.5); x.fill(); x.beginPath(); x.moveTo(-r * 0.5, r * 0.5); x.lineTo(-r * 0.7, r * 1.0); x.lineTo(-r * 0.1, r * 0.55); x.fill(); break;
    case 'grid': for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) x.fillRect(-r + i * r * 0.75, -r + j * r * 0.75, r * 0.55, r * 0.55); break;
    case 'compass': x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.beginPath(); x.moveTo(0, -r * 0.8); x.lineTo(r * 0.25, 0); x.lineTo(0, r * 0.8); x.lineTo(-r * 0.25, 0); x.closePath(); x.fill(); break;
    case 'handset': x.lineWidth = s * 0.16; x.beginPath(); x.arc(0, r * 0.1, r * 0.7, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke(); break;
    case 'mail': x.beginPath(); roundRect(x, -r, -r * 0.65, r * 2, r * 1.3, r * 0.12); x.fill(); x.strokeStyle = '#2466C0'; x.lineWidth = s * 0.06; x.beginPath(); x.moveTo(-r, -r * 0.6); x.lineTo(0, r * 0.15); x.lineTo(r, -r * 0.6); x.stroke(); break;
  }
  x.restore();
}
function appIcon(x, cx, cy, s, [c0, c1], kind) {
  x.save(); const r = s * 0.2; roundRect(x, cx - s / 2, cy - s / 2, s, s, r); x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = s * 0.1; x.shadowOffsetY = s * 0.04; const g = x.createLinearGradient(0, cy - s / 2, 0, cy + s / 2); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fill(); x.restore();
  glyph(x, kind, cx, cy, s);
  roundRect(x, cx - s / 2, cy - s / 2, s, s, r); x.clip();
  const h = x.createLinearGradient(0, cy - s / 2, 0, cy); h.addColorStop(0, 'rgba(255,255,255,0.42)'); h.addColorStop(1, 'rgba(255,255,255,0.08)'); x.fillStyle = h; x.beginPath(); x.ellipse(cx, cy - s * 0.5, s * 0.62, s * 0.5, 0, 0, 7); x.fill();
  x.restore();
}
function statusBar(x, W) {
  const g = x.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, '#3A3F47'); g.addColorStop(1, '#15181D'); x.fillStyle = g; x.fillRect(0, 0, W, 40);
  for (let i = 0; i < 5; i++) { x.fillStyle = i < 4 ? '#F2F3F5' : 'rgba(242,243,245,0.3)'; x.beginPath(); x.arc(16 + i * 16, 20, 5, 0, 7); x.fill(); }
  tx(x, '10:15', W / 2, 28, { size: 24, weight: 700, family: 'Inter', color: '#F2F3F5', align: 'center' });
  roundRect(x, W - 62, 10, 48, 20, 4); x.strokeStyle = '#F2F3F5'; x.lineWidth = 2; x.stroke(); x.fillStyle = '#9CFF9C'; x.fillRect(W - 59, 13, 36, 14); x.fillStyle = '#F2F3F5'; x.fillRect(W - 13, 15, 3, 10);
}
export const PHONE_ICON_POS = (i) => [92 + (i % 4) * 152, 150 + Math.floor(i / 4) * 176];
export function paintHome(x, W, H) {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1C2A44'); g.addColorStop(0.6, '#0B1222'); g.addColorStop(1, '#05080F'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  ICONS.forEach((ic, i) => { const [cx, cy] = PHONE_ICON_POS(i); appIcon(x, cx, cy, 114, ic[1], ic[2]); tx(x, ic[0], cx, cy + 92, { size: 22, weight: 500, family: 'Inter', color: '#F2F3F5', align: 'center' }); });
  // dock
  const dg = x.createLinearGradient(0, H - 190, 0, H); dg.addColorStop(0, 'rgba(140,150,170,0.35)'); dg.addColorStop(1, 'rgba(40,46,58,0.6)'); x.fillStyle = dg; x.fillRect(0, H - 190, W, 190); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, H - 190, W, 1);
  DOCK.forEach((ic, i) => { const cx = 92 + i * 152, cy = H - 110; appIcon(x, cx, cy, 114, ic[1], ic[2]); tx(x, ic[0], cx, cy + 88, { size: 22, weight: 500, family: 'Inter', color: '#F2F3F5', align: 'center' }); });
  statusBar(x, W);
}
function navBar(x, W, title, back) {
  const g = x.createLinearGradient(0, 40, 0, 128); g.addColorStop(0, '#8A9CBB'); g.addColorStop(0.5, '#6A80A6'); g.addColorStop(1, '#55698E'); x.fillStyle = g; x.fillRect(0, 40, W, 88); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 127, W, 1);
  if (back) { x.save(); x.fillStyle = '#4A5F85'; x.beginPath(); x.moveTo(14, 84); x.lineTo(34, 60); x.lineTo(34 + mw(x, back, { size: 24, weight: 600 }) + 24, 60); x.lineTo(34 + mw(x, back, { size: 24, weight: 600 }) + 24, 108); x.lineTo(34, 108); x.closePath(); x.fill(); x.restore(); tx(x, back, 46, 92, { size: 24, weight: 600, family: 'Inter', color: '#fff' }); }
  tx(x, title, W / 2, 93, { size: 30, weight: 700, family: 'Inter', color: '#fff', align: 'center' });
}
function thumb(x, px, py, s, seed) {
  const hue = [[ '#5C8DB8', '#1F3F66'], ['#7CA98A', '#2E5A43'], ['#D9A066', '#7B4E26'], ['#9FB7C9', '#4A6275'], ['#C7B08A', '#6A5636']][Math.floor(hash(seed) * 5)];
  const g = x.createLinearGradient(0, py, 0, py + s); g.addColorStop(0, hue[0]); g.addColorStop(1, hue[1]); x.fillStyle = g; x.fillRect(px, py, s, s);
  const hz = py + s * (0.45 + hash(seed + 1) * 0.3); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(px, hz, s, s - (hz - py));
  if (hash(seed + 2) > 0.5) { x.fillStyle = 'rgba(255,230,190,0.8)'; x.beginPath(); x.arc(px + s * (0.3 + hash(seed + 3) * 0.4), hz - s * 0.2, s * 0.07, 0, 7); x.fill(); }
}
const ALBUMS = ['Harbour walk', 'Tidal flats', 'Lighthouse', 'Market day', 'Boats', 'Winter storms', 'Seawall', 'Dunes', 'Fog', 'Low tide', 'Night pier', 'Shorebirds', 'Salt marsh', 'Ferries'];
export function paintAlbums(x, W, H) {
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
  ALBUMS.forEach((a, i) => { const y = 128 + i * 92; x.fillStyle = i % 2 ? '#F7F7F7' : '#FFFFFF'; x.fillRect(0, y, W, 92); x.fillStyle = '#E0E0E0'; x.fillRect(0, y + 91, W, 1); thumb(x, 14, y + 10, 72, i * 3.1 + 0.4); tx(x, a, 104, y + 52, { size: 26, weight: 600, family: 'Inter', color: '#1a1a1a' }); tx(x, `(${12 + Math.floor(hash(i + 9) * 60)})`, 104 + mw(x, a, { size: 26, weight: 600 }) + 10, y + 52, { size: 22, family: 'Inter', color: '#8A8F98' }); x.strokeStyle = '#B0B4BA'; x.lineWidth = 3; x.beginPath(); x.moveTo(W - 34, y + 36); x.lineTo(W - 22, y + 46); x.lineTo(W - 34, y + 56); x.stroke(); });
  navBar(x, W, 'Albums', 'Photos'); statusBar(x, W);
}
export const GRID_ROWS = 12, GRID_H = 128 + GRID_ROWS * 154 + 8;
export function paintGrid(x, W, H, scroll) {
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
  x.save(); x.beginPath(); x.rect(0, 128, W, H - 128); x.clip(); x.translate(0, -scroll);
  for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < 4; c++) { const i = r * 4 + c; thumb(x, 10 + c * 156, 136 + r * 154, 148, i * 1.7 + 2.3); }
  x.restore();
  navBar(x, W, 'Harbour walk', 'Albums'); statusBar(x, W);
}
export const GRID_THUMB = (i) => [10 + (i % 4) * 156 + 74, 136 + Math.floor(i / 4) * 154 + 74];
// the opened photo: abstract harbour at dusk
export function paintPhoto(x, W, H, { scale = 1, cx = W / 2, cy = H / 2 } = {}) {
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const iw = W, ih = Math.round(W * 0.75), iy = (H - ih) / 2;
  x.save(); x.translate(cx, cy); x.scale(scale, scale); x.translate(-cx, -cy);
  const sky = x.createLinearGradient(0, iy, 0, iy + ih * 0.62); sky.addColorStop(0, '#2B3F66'); sky.addColorStop(0.7, '#C98A5E'); sky.addColorStop(1, '#F0C8A0'); x.fillStyle = sky; x.fillRect(0, iy, iw, ih * 0.62);
  x.fillStyle = 'rgba(255,220,170,0.9)'; x.beginPath(); x.arc(iw * 0.62, iy + ih * 0.5, iw * 0.05, 0, 7); x.fill();
  x.fillStyle = '#1C2630'; x.beginPath(); x.moveTo(0, iy + ih * 0.62); x.lineTo(iw * 0.2, iy + ih * 0.55); x.lineTo(iw * 0.35, iy + ih * 0.6); x.lineTo(iw * 0.5, iy + ih * 0.53); x.lineTo(iw * 0.8, iy + ih * 0.6); x.lineTo(iw, iy + ih * 0.57); x.lineTo(iw, iy + ih * 0.64); x.lineTo(0, iy + ih * 0.64); x.fill();
  const sea = x.createLinearGradient(0, iy + ih * 0.62, 0, iy + ih); sea.addColorStop(0, '#6B5A4E'); sea.addColorStop(0.3, '#2F3E52'); sea.addColorStop(1, '#101722'); x.fillStyle = sea; x.fillRect(0, iy + ih * 0.62, iw, ih * 0.38);
  x.fillStyle = 'rgba(255,200,150,0.35)'; for (let i = 0; i < 14; i++) { const yy = iy + ih * (0.64 + i * 0.024); x.fillRect(iw * 0.62 - 20 - i * 3, yy, 40 + i * 6, 2); }
  x.fillStyle = '#0D1016'; x.fillRect(iw * 0.08, iy + ih * 0.58, iw * 0.3, ih * 0.03); for (let i = 0; i < 6; i++) x.fillRect(iw * (0.1 + i * 0.05), iy + ih * 0.6, 4, ih * 0.09);
  x.restore();
}

// ---------- fluid responsive article ----------
export const ARTICLE = {
  brand: 'MERIDIAN', nav: ['Journal', 'Places', 'Field notes', 'Maps', 'About'], kicker: 'FIELD NOTES',
  title: 'Where the tide writes the map', dek: 'Six hours, twice a day, the harbour floor becomes a landscape you can walk.', byline: 'Meridian Journal · 6 min read',
  body: [
    'At low tide the harbour floor becomes a landscape you can walk. Channels braid across the flats, and the water that left two hours ago has drawn a new map in the mud.',
    'We followed the seawall at dawn to watch it happen. Oystercatchers worked the shallows; a ferry idled beyond the bar, waiting for depth. The town behind us was still asleep.',
    'Fishermen here read the flats the way others read a timetable. They know which channels hold water, where the sand turns soft, and how long a crossing can safely take.',
    'By mid-morning the tide had turned. The map dissolved as quickly as it was drawn, and the harbour was a harbour again, full and ordinary, until the next time the water went out.',
  ],
  side: { title: 'RELATED', items: ['Logbooks of the lighthouse keepers', 'Mapping the salt marsh', 'A field guide to shorebirds'] },
};
// Layout as a pure function of width/height/column mode. mode: 3 = desktop, 2 = tablet, 1 = phone.
export function layoutFor(w, h, mode) {
  const m = mode === 3 ? Math.round(w * 0.05) : mode === 2 ? 40 : 24;
  const navH = mode === 1 ? 56 : 68;
  const L = { w, h, mode, m, navH, blocks: {} };
  const B = L.blocks;
  B.nav = { x: 0, y: 0, w, h: navH };
  B.brand = { x: m, y: navH / 2, w: 120, h: 20 };
  const linkW = mode === 1 ? 0 : 1; B.links = ARTICLE.nav.map((n, i) => ({ x: w - m - (ARTICLE.nav.length - 1 - i) * (mode === 3 ? 92 : 84) - 60, y: navH / 2, w: 60 * linkW, h: 16, a: mode === 1 ? 0 : 1 }));
  B.menu = { x: w - m - 22, y: navH / 2, w: 22, h: 16, a: mode === 1 ? 1 : 0 };
  const top = navH + (mode === 3 ? 32 : 24);
  if (mode === 3) {
    const heroW = Math.round((w - 2 * m) * 0.6), heroH = Math.round(heroW * 0.5);
    B.hero = { x: m, y: top, w: heroW, h: heroH };
    const tx0 = m + heroW + 36, tw = w - m - tx0;
    B.kicker = { x: tx0, y: top + 24, w: tw, h: 12 };
    B.title = { x: tx0, y: top + 48, w: tw, h: 0, size: 42 };
    B.dek = { x: tx0, y: top + 48 + 3 * 46 + 16, w: tw, h: 0, size: 18 };
    B.byline = { x: tx0, y: top + heroH - 10, w: tw, h: 12 };
    const by = top + heroH + 36, sideW = Math.round((w - 2 * m) * 0.26), gap = 36;
    const colW = Math.round((w - 2 * m - sideW - gap * 2) / 2);
    B.cols = [{ x: m, y: by, w: colW, h: h - by - 24 }, { x: m + colW + gap, y: by, w: colW, h: h - by - 24 }];
    B.side = { x: w - m - sideW, y: by, w: sideW, h: 190 };
    L.size = { body: 15, lh: 23, title: 42, dek: 18, nav: 14 };
  } else if (mode === 2) {
    const heroW = w - 2 * m, heroH = Math.round(heroW * 0.42);
    B.hero = { x: m, y: top, w: heroW, h: heroH };
    B.kicker = { x: m, y: top + heroH + 40, w: heroW, h: 12 };
    B.title = { x: m, y: top + heroH + 64, w: heroW, h: 0, size: 38 };
    B.dek = { x: m, y: top + heroH + 64 + 2 * 44 + 12, w: heroW, h: 0, size: 18 };
    B.byline = { x: m, y: top + heroH + 64 + 2 * 44 + 12 + 2 * 26 + 10, w: heroW, h: 12 };
    const by = B.byline.y + 36, gap = 32, colW = Math.round((heroW - gap) / 2);
    B.cols = [{ x: m, y: by, w: colW, h: 300 }, { x: m + colW + gap, y: by, w: colW, h: 300 }];
    B.side = { x: m, y: by + 320, w: heroW, h: 150 };
    L.size = { body: 15, lh: 23, title: 38, dek: 18, nav: 14 };
  } else {
    const heroW = w - 2 * m, heroH = Math.round(heroW * 0.56);
    B.hero = { x: m, y: top, w: heroW, h: heroH };
    B.kicker = { x: m, y: top + heroH + 34, w: heroW, h: 12 };
    B.title = { x: m, y: top + heroH + 58, w: heroW, h: 0, size: 34 };
    B.dek = { x: m, y: top + heroH + 58 + 3 * 40 + 8, w: heroW, h: 0, size: 17 };
    B.byline = { x: m, y: top + heroH + 58 + 3 * 40 + 8 + 2 * 24 + 10, w: heroW, h: 12 };
    const by = B.byline.y + 34;
    B.cols = [{ x: m, y: by, w: heroW, h: Math.max(240, h - by - 230) }];
    B.side = { x: m, y: B.cols[0].y + B.cols[0].h + 24, w: heroW, h: 170 };
    L.size = { body: 17, lh: 26, title: 34, dek: 17, nav: 14 };
  }
  return L;
}
const lr = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), a: lerp(a.a ?? 1, b.a ?? 1, k), size: lerp(a.size ?? 0, b.size ?? 0, k) });
function heroImage(x, r) {
  x.save(); roundRect(x, r.x, r.y, r.w, r.h, 6); x.clip();
  const sky = x.createLinearGradient(0, r.y, 0, r.y + r.h * 0.6); sky.addColorStop(0, '#9DB7CC'); sky.addColorStop(1, '#E9E3D6'); x.fillStyle = sky; x.fillRect(r.x, r.y, r.w, r.h);
  x.fillStyle = '#5F7488'; x.beginPath(); x.moveTo(r.x, r.y + r.h * 0.62); x.bezierCurveTo(r.x + r.w * 0.3, r.y + r.h * 0.5, r.x + r.w * 0.55, r.y + r.h * 0.7, r.x + r.w, r.y + r.h * 0.56); x.lineTo(r.x + r.w, r.y + r.h * 0.66); x.lineTo(r.x, r.y + r.h * 0.66); x.fill();
  const sea = x.createLinearGradient(0, r.y + r.h * 0.6, 0, r.y + r.h); sea.addColorStop(0, '#C9CFC8'); sea.addColorStop(1, '#6F7F8A'); x.fillStyle = sea; x.fillRect(r.x, r.y + r.h * 0.64, r.w, r.h * 0.36);
  x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 1.2; for (let i = 0; i < 5; i++) { x.beginPath(); const yy = r.y + r.h * (0.7 + i * 0.06); x.moveTo(r.x, yy); x.bezierCurveTo(r.x + r.w * 0.4, yy - r.h * 0.03, r.x + r.w * 0.6, yy + r.h * 0.03, r.x + r.w, yy); x.stroke(); }
  x.fillStyle = 'rgba(255,240,220,0.85)'; x.beginPath(); x.arc(r.x + r.w * 0.72, r.y + r.h * 0.3, r.h * 0.06, 0, 7); x.fill();
  x.restore();
}
// Draw the article, blending layouts A -> B at k (k=0 draws A exactly). Column text crossfades at the midpoint.
export function drawArticle(x, LA, LB = LA, k = 0, { alpha = 1 } = {}) {
  const A = LA.blocks, Bb = LB.blocks; const kk = easeInOut(clamp(k)); const S = { body: lerp(LA.size.body, LB.size.body, kk), lh: lerp(LA.size.lh, LB.size.lh, kk), nav: 14 };
  const w = lerp(LA.w, LB.w, kk), h = lerp(LA.h, LB.h, kk);
  x.save(); x.globalAlpha *= alpha;
  x.fillStyle = PALETTE.ivory; x.fillRect(0, 0, w, h);
  const ink = '#232832', grey = '#6B7079';
  // nav
  const nav = lr(A.nav, Bb.nav, kk); x.fillStyle = '#EFEAE0'; x.fillRect(0, 0, w, nav.h); x.fillStyle = '#DAD3C5'; x.fillRect(0, nav.h - 1, w, 1);
  const br = lr(A.brand, Bb.brand, kk); tx(x, ARTICLE.brand, br.x, br.y + 6, { size: 16, weight: 700, color: ink, tracking: 3 });
  A.links.forEach((la, i) => { const l = lr(la, Bb.links[i], kk); if (l.a > 0.01) tx(x, ARTICLE.nav[i], l.x, l.y + 5, { size: S.nav, weight: 500, color: ink, alpha: l.a }); });
  const mn = lr(A.menu, Bb.menu, kk); if (mn.a > 0.01) { x.save(); x.globalAlpha *= mn.a; x.fillStyle = ink; for (let i = -1; i <= 1; i++) x.fillRect(mn.x, mn.y + i * 6 - 1, 22, 2); x.restore(); }
  // hero
  heroImage(x, lr(A.hero, Bb.hero, kk));
  const kc = lr(A.kicker, Bb.kicker, kk); tx(x, ARTICLE.kicker, kc.x, kc.y, { size: 11, weight: 700, color: PALETTE.cyanDeep, tracking: 2.2 });
  const tt = lr(A.title, Bb.title, kk); const tsz = tt.size; const tl = wrapLines(x, ARTICLE.title, tt.w, { size: tsz, weight: 500, family: 'Inter Display' }); tl.forEach((l, i) => tx(x, l, tt.x, tt.y + i * tsz * 1.08, { size: tsz, weight: 500, family: 'Inter Display', color: ink, tracking: -0.5 }));
  const dk = lr(A.dek, Bb.dek, kk); para(x, ARTICLE.dek, dk.x, dk.y, dk.w, { size: dk.size, color: grey, lh: dk.size * 1.4 });
  const bl = lr(A.byline, Bb.byline, kk); tx(x, ARTICLE.byline, bl.x, bl.y, { size: 12, weight: 500, color: grey, tracking: 0.5 });
  // body columns: flow through the columns of whichever layout is nearer; crossfade text around the midpoint
  const useB = kk >= 0.5; const cols = useB ? Bb.cols : A.cols, other = useB ? A.cols : Bb.cols;
  const textA = 1 - clamp(Math.abs(kk - 0.5) * 2 < 0.35 ? 1 - Math.abs(kk - 0.5) * 2 / 0.35 : 0);
  const rects = cols.map((c, i) => { const o = other[Math.min(i, other.length - 1)]; return useB ? lr(o, c, kk) : lr(c, o, kk); });
  // columns that only exist in the other layout fade away
  for (let i = cols.length; i < other.length; i++) { const o = other[i], c = cols[cols.length - 1]; const r = useB ? lr(o, c, kk) : lr(c, o, kk); x.save(); x.globalAlpha *= 0.25 * (useB ? 1 - kk : kk) * 2; x.fillStyle = '#DAD3C5'; x.fillRect(r.x, r.y, r.w, 2); x.restore(); }
  const o = { size: S.body, color: ink, lh: S.lh, alpha: textA };
  let ci = 0, cy = rects[0].y + S.body; const paras = ARTICLE.body.slice();
  x.save(); x.globalAlpha *= textA;
  outer: for (const p of paras) {
    const lines = wrapLines(x, p, rects[ci].w, o);
    for (const l of lines) { if (cy > rects[ci].y + rects[ci].h) { ci++; if (ci >= rects.length) break outer; cy = rects[ci].y + S.body; } tx(x, l, rects[ci].x, cy, { size: S.body, color: ink }); cy += S.lh; }
    cy += S.lh * 0.6;
  }
  x.restore();
  // sidebar card
  const sd = lr(A.side, Bb.side, kk); x.save(); roundRect(x, sd.x, sd.y, sd.w, sd.h, 6); x.fillStyle = '#EDE7DA'; x.fill();
  tx(x, ARTICLE.side.title, sd.x + 18, sd.y + 30, { size: 11, weight: 700, color: grey, tracking: 2.2 });
  ARTICLE.side.items.forEach((it, i) => { const ls = wrapLines(x, it, sd.w - 36, { size: 14, weight: 500 }); tx(x, ls[0] + (ls.length > 1 ? '…' : ''), sd.x + 18, sd.y + 58 + i * 30, { size: 14, weight: 500, color: ink }); x.fillStyle = '#DAD3C5'; x.fillRect(sd.x + 18, sd.y + 68 + i * 30, sd.w - 36, 1); });
  if (sd.h > 150) { roundRect(x, sd.x + 18, sd.y + sd.h - 44, 110, 28, 4); x.fillStyle = ink; x.fill(); tx(x, 'Subscribe', sd.x + 73, sd.y + sd.h - 25, { size: 12, weight: 600, color: PALETTE.ivory, align: 'center' }); }
  x.restore();
  x.restore();
}
// A 2010-style browser window around the article on the desktop screen (light chrome). Window width ww inside a W x H screen.
export function paintDesktopWindow(x, W, H, ww, drawPage) {
  const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1C222C'); bg.addColorStop(1, '#0E1218'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const wx = 0, wy = 0, chrome = 64;
  x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 30; x.fillStyle = '#E6E8EB'; x.fillRect(wx, wy, ww, H); x.restore();
  x.fillStyle = '#DADDE1'; x.fillRect(wx, wy, ww, 30); x.fillStyle = '#E6E8EB'; roundRect(x, wx + 12, wy + 6, 180, 24, 5); x.fill(); tx(x, 'Meridian — Field notes', wx + 24, wy + 23, { size: 12, weight: 500, color: '#333' });
  x.fillStyle = '#FFFFFF'; roundRect(x, wx + 12, wy + 36, ww - 24, 22, 4); x.fill(); tx(x, 'meridian-journal.example/field-notes/where-the-tide-writes-the-map', wx + 22, wy + 51, { size: 12, color: '#555' });
  x.save(); x.beginPath(); x.rect(wx, wy + chrome, ww, H - chrome); x.clip(); x.translate(wx, wy + chrome); drawPage(ww, H - chrome); x.restore();
}

// ---------- the contemporary design workspace (full-frame overlay, 1920 x 1080) ----------
export function drawWorkspace(x, W, H, { alpha = 1, t = 0, layouts } = {}) {
  if (alpha <= 0) return;
  x.save(); x.globalAlpha *= alpha;
  x.fillStyle = '#11151C'; x.fillRect(0, 0, W, H);
  const LP = 290, RP = 320, TB = 52;
  // dotted canvas
  x.fillStyle = 'rgba(255,255,255,0.05)'; for (let yy = TB + 20; yy < H; yy += 28) for (let xx = LP + 20; xx < W - RP; xx += 28) x.fillRect(xx, yy, 1.5, 1.5);
  // panels
  x.fillStyle = PALETTE.graphite2; x.fillRect(0, 0, LP, H); x.fillRect(W - RP, 0, RP, H); x.fillRect(0, 0, W, TB);
  x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(LP, 0, 1, H); x.fillRect(W - RP, 0, 1, H); x.fillRect(0, TB, W, 1);
  // top bar
  tx(x, 'Meridian — article · responsive layout', W / 2, 32, { size: 15, weight: 500, color: PALETTE.gray, align: 'center' });
  x.strokeStyle = PALETTE.gray; x.lineWidth = 1.5; x.fillStyle = PALETTE.gray;
  x.beginPath(); x.moveTo(28, 18); x.lineTo(28, 34); x.lineTo(33, 30); x.lineTo(37, 36); x.lineTo(39, 35); x.lineTo(36, 29); x.lineTo(41, 28); x.closePath(); x.fill();
  x.strokeRect(66.5, 18.5, 14, 14); tx(x, 'T', 110, 32, { size: 17, weight: 600, color: PALETTE.gray, align: 'center' }); x.beginPath(); x.arc(146, 26, 7, 0, 7); x.stroke();
  // layers
  tx(x, 'LAYERS', 24, 86, { size: 12, weight: 700, color: PALETTE.gray2, tracking: 2.4 });
  const layers = [['Article · responsive', 0, true], ['Header', 1], ['Navigation', 2], ['Hero image', 1], ['Headline', 1], ['Body · columns', 1], ['Sidebar', 1], ['Footer', 1]];
  layers.forEach(([n, d, page], i) => { const yy = 118 + i * 34; if (i === 6) { x.fillStyle = 'rgba(128,201,248,0.12)'; x.fillRect(12, yy - 20, LP - 24, 30); } x.strokeStyle = i === 6 ? PALETTE.cyan : PALETTE.gray2; x.lineWidth = 1.2; x.strokeRect(24.5 + d * 18, yy - 11.5, 12, 10); tx(x, n, 46 + d * 18, yy, { size: 15, weight: page ? 600 : 400, color: i === 6 ? PALETTE.cyan : page ? PALETTE.ivory : 'rgba(246,242,232,0.78)' }); });
  // right panel: design properties
  tx(x, 'DESIGN', W - RP + 24, 86, { size: 12, weight: 700, color: PALETTE.gray2, tracking: 2.4 });
  const props = [['Width', 'Fill container'], ['Height', 'Hug contents'], ['Auto layout', 'Vertical · 24'], ['Constraints', 'Scale'], ['Fill', 'Ivory'], ['Type', 'Inter'], ['Effects', 'None']];
  props.forEach(([k, v], i) => { const yy = 124 + i * 48; tx(x, k, W - RP + 24, yy, { size: 13, weight: 500, color: PALETTE.gray }); roundRect(x, W - RP + 120, yy - 17, RP - 144, 26, 4); x.fillStyle = 'rgba(255,255,255,0.05)'; x.fill(); tx(x, v, W - RP + 130, yy, { size: 13, weight: 500, color: PALETTE.ivory }); if (i === 2) { roundRect(x, W - 60, yy - 12, 30, 16, 8); x.fillStyle = PALETTE.cyan; x.fill(); x.fillStyle = PALETTE.graphite; x.beginPath(); x.arc(W - 38, yy - 4, 6, 0, 7); x.fill(); } });
  // artboards
  if (layouts) {
    const boards = [['DESKTOP', layouts.d, 0.42], ['TABLET', layouts.t, 0.26], ['PHONE', layouts.p, 0.26]];
    let bx = LP + 70; const by = TB + 120;
    boards.forEach(([label, L, s], i) => {
      const bw = L.w * s, bh = L.h * s; const sel = i === 2;
      tx(x, label, bx, by - 14, { size: 12, weight: 700, color: sel ? PALETTE.cyan : PALETTE.gray2, tracking: 2.2 });
      x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 24; x.fillStyle = PALETTE.ivory; x.fillRect(bx, by, bw, bh); x.restore();
      x.save(); x.translate(bx, by); x.scale(s, s); x.beginPath(); x.rect(0, 0, L.w, L.h); x.clip(); drawArticle(x, L); x.restore();
      if (sel) { x.strokeStyle = PALETTE.cyan; x.lineWidth = 1.5; x.strokeRect(bx - 1, by - 1, bw + 2, bh + 2); for (const [hx, hy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) { x.fillStyle = PALETTE.ivory; x.fillRect(hx - 4, hy - 4, 8, 8); x.strokeRect(hx - 4, hy - 4, 8, 8); } }
      bx += bw + 54;
    });
  }
  x.restore();
}
