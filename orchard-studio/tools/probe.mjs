// Dev probe: node tools/probe.mjs "<query>" "<js>" — evaluates js after settle and prints the result.
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const [query = 'debug=1&quality=high', js = ''] = process.argv.slice(2);
const pinned = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : { channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver/.test(m.text())) console.log(`[${m.type()}]`, m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')));
await page.goto(`http://localhost:4173/?${query}`);
await page.waitForFunction(() => !!window.__studio, undefined, { timeout: 120000 });
await page.evaluate(() => window.__studio.settle());
const r = await page.evaluate(`(async () => { ${js} })()`);
console.log(JSON.stringify(r, null, 1));
await browser.close();
