// Ad-hoc screenshot helper for development: node tools/shot.mjs <out.png> "<query>" "<js to eval>" [waitMs]
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const [out, query = 'debug=1&quality=high', js = '', wait = '300'] = process.argv.slice(2);
const pinned = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : { channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
const lap = (s) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`);
await page.goto(`http://localhost:4173/?${query}`);
await page.waitForFunction(() => !!window.__studio, undefined, { timeout: 120000 });
lap('api');
await page.evaluate(() => window.__studio.settle());
lap('settled');
if (js) {
  const r = await page.evaluate(`(async () => { ${js} })()`);
  if (r !== undefined) console.log(JSON.stringify(r));
  await page.waitForTimeout(Number(wait));
  await page.evaluate(() => window.__studio.settle());
  lap('js+settle');
}
await page.screenshot({ path: out, timeout: 240000 });
lap('shot');
await browser.close();
