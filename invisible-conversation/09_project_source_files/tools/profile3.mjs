import { chromium } from 'playwright';
import { startServer, openFilm, renderFrame } from './browser.mjs';
const { server, port } = await startServer();
const base = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', '--no-sandbox'];
const combos = { 'base': [], 'no-accel-2d': ['--disable-accelerated-2d-canvas'], 'no-accel-2d+no-gpu-compositing': ['--disable-accelerated-2d-canvas', '--disable-gpu-compositing'], 'no-gpu-compositing': ['--disable-gpu-compositing'] };
for (const [name, extra] of Object.entries(combos)) {
  const browser = await chromium.launch({ headless: true, args: [...base, ...extra] });
  try {
    const { page } = await openFilm(browser, port, { query: 'shadows=0', label: name });
    await page.evaluate(() => { window.__stage.scene.environment = null; });
    await renderFrame(page, 30.5, 732); await page.screenshot({ type: 'png' });
    let ts = 0, tr = 0; const N = 3;
    for (let i = 0; i < N; i++) { const t0 = Date.now(); await renderFrame(page, 30.5 + i * 0.1, 732 + i); tr += Date.now() - t0; const t1 = Date.now(); await page.screenshot({ type: 'png' }); ts += Date.now() - t1; }
    const gl = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); return gl ? gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL).slice(0, 40) : 'NO WEBGL'; });
    console.log(`${name.padEnd(34)} renderAt ${(tr / N).toFixed(0)} ms  screenshot ${(ts / N).toFixed(0)} ms   [${gl}]`);
  } catch (e) { console.log(`${name.padEnd(34)} FAILED: ${String(e.message).slice(0, 120)}`); }
  await browser.close();
}
server.close();
