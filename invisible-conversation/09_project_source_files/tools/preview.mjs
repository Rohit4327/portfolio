// Render still frames: node tools/preview.mjs --times 1,5.5,20 [--scale 0.5] [--out previews]
import fs from 'node:fs'; import path from 'node:path';
import { startServer, launch, openFilm, renderFrame, captureFrame, ROOT } from './browser.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'] : null).filter(Boolean));
const times = (args.times || '1').split(',').map(Number);
const scale = Number(args.scale || 1); const out = path.resolve(args.out || '/tmp/claude-0/-home-user-portfolio/d072d127-20ba-53c6-bdc3-3548a30f6ed6/scratchpad/previews/misc');
fs.mkdirSync(out, { recursive: true });
const { server, port } = await startServer(); const browser = await launch();
try {
  const { page } = await openFilm(browser, port, { scale, label: 'preview' });
  for (const t of times) {
    const t0 = Date.now(); const id = await renderFrame(page, t, Math.round(t * 24));
    const fp = path.join(out, `t_${t.toFixed(2).padStart(6, '0')}_${id}.png`);
    fs.writeFileSync(fp, await captureFrame(page));
    console.log(`${fp}  (${Date.now() - t0} ms)`);
  }
} finally { await browser.close(); server.close(); }
