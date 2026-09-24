// Usage: node frames.cjs <outDir> <t1> <t2> ...   (grabs stills at given seconds)
const path = require('path');
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const http = require('http'), fs = require('fs');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const { execFileSync } = require('child_process');
const cacheDir = path.join(require('os').tmpdir(), 'film-cdn-cache');
fs.mkdirSync(cacheDir, { recursive: true });
// Chromium here would send loopback traffic through the egress proxy, so it runs without
// one and external requests (GSAP, Google Fonts) are fetched with curl and cached.
async function routeExternal(page) {
  await page.route(/^https:\/\//, async (route) => {
    const url = route.request().url();
    const key = path.join(cacheDir, Buffer.from(url).toString('base64url').slice(0, 200));
    try {
      if (!fs.existsSync(key)) {
        const out = execFileSync('curl', ['-sS', '-L', '-D', key + '.h', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', url], { maxBuffer: 64 << 20 });
        fs.writeFileSync(key, out);
      }
      const hdr = fs.readFileSync(key + '.h', 'utf8');
      const ct = (hdr.match(/content-type:\s*([^\r\n]+)/gi) || []).pop();
      await route.fulfill({ status: 200, body: fs.readFileSync(key), headers: { 'content-type': ct ? ct.split(/:\s*/)[1] : 'application/octet-stream', 'access-control-allow-origin': '*' } });
    } catch (e) { await route.abort(); }
  });
}
module.exports = { routeExternal };
if (require.main === module) (async () => {
  const [outDir, ...ts] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const port = srv.address().port;
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await routeExternal(p);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:${port}/index.html?capture`);
  try { await p.waitForFunction(() => window.__filmReady, null, { timeout: 30000 }); } catch (e) { console.log("TIMEOUT", errs); process.exit(1); }
  for (const [i, t] of ts.entries()) {
    await p.evaluate((t) => window.__film.render(t), +t);
    await p.screenshot({ path: path.join(outDir, `f_${String(i).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }
  console.log('errors:', JSON.stringify(errs, null, 1));
  await b.close(); srv.close();
})();
