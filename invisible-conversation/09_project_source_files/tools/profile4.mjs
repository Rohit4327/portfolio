import { chromium } from 'playwright';
import { startServer, openFilm, renderFrame } from './browser.mjs';
const { server, port } = await startServer();
const base = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', '--no-sandbox'];
for (const [name, extra] of Object.entries({ 'gpu-compositing': [], 'no-gpu-compositing': ['--disable-gpu-compositing'], 'no-accel2d+no-gpu-comp': ['--disable-accelerated-2d-canvas', '--disable-gpu-compositing'] })) {
  const browser = await chromium.launch({ headless: true, args: [...base, ...extra] });
  try {
    const { page } = await openFilm(browser, port, { query: 'shadows=0', label: name });
    await page.evaluate(() => { window.__stage.scene.environment = null; });
    await renderFrame(page, 30.5, 732);
    const N = 3;
    const time = async (label, fn) => { let s = 0; for (let i = 0; i < N; i++) { const t0 = Date.now(); await fn(i); s += Date.now() - t0; } console.log(`  ${name.padEnd(24)} ${label.padEnd(36)} ${(s / N).toFixed(0)} ms`); };
    await time('renderAt only', (i) => renderFrame(page, 30.5 + i * 0.1, 732 + i));
    await time('renderAt + composite + toDataURL png', async (i) => { await renderFrame(page, 30.5 + i * 0.1, 732 + i); await page.evaluate(() => { const st = window.__stage; const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d'); x.drawImage(st.glCanvas, 0, 0); x.drawImage(st.uiCanvas, 0, 0); return c.toDataURL('image/png').length; }); });
    await time('renderAt + composite + getImageData b64', async (i) => { await renderFrame(page, 30.5 + i * 0.1, 732 + i); await page.evaluate(() => { const st = window.__stage; const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d'); x.drawImage(st.glCanvas, 0, 0); x.drawImage(st.uiCanvas, 0, 0); const d = x.getImageData(0, 0, 1920, 1080).data; let bin = ''; const CH = 0x8000; for (let i = 0; i < d.length; i += CH) bin += String.fromCharCode.apply(null, d.subarray(i, i + CH)); return btoa(bin).length; }); });
    await time('renderAt + screenshot png', async (i) => { await renderFrame(page, 30.5 + i * 0.1, 732 + i); await page.screenshot({ type: 'png' }); });
  } catch (e) { console.log(name, 'FAILED', e.message.slice(0, 200)); }
  await browser.close();
}
server.close();
