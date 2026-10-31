// Shared: static server for the project root + headless Chromium (SwiftShader WebGL) + film page.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.css': 'text/css', '.wasm': 'application/wasm' };
export function startServer(root = ROOT) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let fp = path.normalize(path.join(root, url));
      if (!fp.startsWith(root)) { res.writeHead(403); return res.end(); }
      fs.stat(fp, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404); return res.end('not found ' + url); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(fp).pipe(res);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ server: srv, port: srv.address().port }));
  });
}
export async function launch() {
  return chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-compositing', '--disable-dev-shm-usage', '--no-sandbox', '--js-flags=--max-old-space-size=4096'] });
}
export async function openFilm(browser, port, { scale = 1, label = 'page', query = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(String(e.message || e)); console.error(`[${label}] pageerror:`, e.message); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[${label}] console.${m.type()}:`, m.text()); });
  await page.goto(`http://127.0.0.1:${port}/film.html${query ? '?' + query : ''}`, { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  const errs = await page.evaluate(() => window.__errors);
  if (errs.length) throw new Error('page init errors: ' + errs.join(' | '));
  return { page, ctx, errors };
}
export async function renderFrame(page, t, frame) {
  const id = await page.evaluate(([t, f]) => window.renderAt(t, f), [t, frame]);
  const errs = await page.evaluate(() => { const e = window.__errors.splice(0); return e; });
  if (errs.length) throw new Error(`render error at t=${t}: ` + errs.join(' | '));
  return id;
}

// Composite GL + UI canvases in-page and return a PNG buffer (much faster than page.screenshot under SwiftShader).
export async function captureFrame(page) {
  const dataUrl = await page.evaluate(() => {
    const st = window.__stage;
    if (!window.__cap) { const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; window.__cap = c; }
    const c = window.__cap, x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 1920, 1080); x.drawImage(st.glCanvas, 0, 0, 1920, 1080); x.drawImage(st.uiCanvas, 0, 0, 1920, 1080);
    return c.toDataURL('image/png');
  });
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
}
