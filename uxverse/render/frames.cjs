// Usage: node frames.cjs <outDir> <t1> <t2> ...  (grabs stills of the film at those seconds)
const path = require('path'), fs = require('fs'), http = require('http');
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { routeExternal } = require('./net.cjs');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg' };
function serve() { return http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0); }
async function open(pw, srv) {
  const b = await pw.chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await routeExternal(p);
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?capture`);
  try { await p.waitForFunction(() => window.__filmReady, null, { timeout: 90000 }); } catch (e) { console.log('NOT READY', errs); process.exit(1); }
  return { b, p, errs };
}
module.exports = { serve, open };
if (require.main === module) (async () => {
  const [outDir, ...ts] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const srv = serve();
  const { b, p, errs } = await open(pw, srv);
  for (const [i, t] of ts.entries()) {
    await p.evaluate((t) => window.__film.render(t), +t);
    await p.screenshot({ path: path.join(outDir, `f_${String(i).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 72, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }
  console.log('errors:', JSON.stringify(errs.slice(0, 10), null, 1));
  await b.close(); srv.close();
})();
