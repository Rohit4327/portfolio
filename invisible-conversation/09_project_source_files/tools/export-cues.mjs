// Collect every scene's `cues` (named visual events, absolute seconds) -> audio/out/visual_cues.json
import fs from 'node:fs'; import path from 'node:path';
import { startServer, launch, openFilm, ROOT } from './browser.mjs';
const { server, port } = await startServer(); const browser = await launch();
try {
  const { page } = await openFilm(browser, port, { label: 'cues' });
  const data = await page.evaluate(() => window.__scenes.map((s) => ({ id: s.id, title: s.title, start: s.start, end: s.end, cues: s.cues || {} })));
  const out = path.join(ROOT, 'audio/out/visual_cues.json'); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 1));
  for (const s of data) console.log(`${s.id} ${s.start.toFixed(2)}-${s.end.toFixed(2)}  cues: ${Object.keys(s.cues).length}`);
  console.log('wrote', out);
} finally { await browser.close(); server.close(); }
