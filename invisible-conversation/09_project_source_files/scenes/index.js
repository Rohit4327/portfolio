// Scene registry. Each scene module default-exports { id, title, start, end, init, update, draw2d, cues }.
// Missing scene files fall back to a placeholder so the page always loads while scenes are being built in parallel.
import { placeholder } from './_placeholder.js';
import { T } from '../lib/timing.js';
const LIST = [
  [1, './s01_door.js', 'The Design Problem'],
  [2, './s02_human_factors.js', 'Before Screens — Human Factors'],
  [3, './s03_commands.js', 'When Computers Spoke in Commands'],
  [4, './s04_mouse.js', 'The Mouse Changes Everything'],
  [5, './s05_gui.js', 'The Graphical Revolution'],
  [6, './s06_web_ux.js', 'The Web and the Name UX'],
  [7, './s07_mobile.js', 'The Web Goes Mobile'],
  [8, './s08_ux_vs_ui.js', 'UX vs UI — The Big Reveal'],
  [9, './s09_everyone.js', 'Design for Everyone'],
  [10, './s10_future.js', 'The Next Interface'],
];
export async function loadScenes() {
  const out = [];
  for (const [n, path, title] of LIST) {
    const id = 's' + String(n).padStart(2, '0');
    try { const m = await import(path); if (!m.default) throw new Error('no default export'); out.push(m.default); }
    catch (e) { console.warn(`[scenes] ${path} not available (${e.message}); using placeholder`); out.push(placeholder(id, title, T.ch(n).start, T.ch(n).end)); }
  }
  return out;
}
