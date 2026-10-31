import { startServer, launch, openFilm, renderFrame } from './browser.mjs';
const { server, port } = await startServer(); const browser = await launch();
const variants = [ '', 'aa=0', 'shadows=0', 'aa=0&shadows=0', 'shadowSize=512', 'soft=1' ];
try {
  for (const q of variants) {
    const { page } = await openFilm(browser, port, { query: q, label: q || 'default' });
    await renderFrame(page, 30.5, 732); // warm
    const N = 3; let tr = 0, ts = 0;
    for (let i = 0; i < N; i++) {
      const t0 = Date.now(); await page.evaluate((t) => { const s = window.__stage; const sc = window.__scenes.find(x => x.id === 's02'); sc.update(t, s); s.render(); }, 30.5 + i * 0.1); tr += Date.now() - t0;
      const t1 = Date.now(); await page.screenshot({ type: 'png' }); ts += Date.now() - t1;
    }
    console.log(`${(q || 'default').padEnd(22)} render ${(tr / N).toFixed(0)} ms   screenshot ${(ts / N).toFixed(0)} ms`);
    await page.context().close();
  }
} finally { await browser.close(); server.close(); }
