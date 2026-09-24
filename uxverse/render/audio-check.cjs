// Renders the soundtrack headless and prints loudness per section (sanity check for the mix).
const path = require('path'), fs = require('fs'), http = require('http');
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { routeExternal } = require('./net.cjs');
const root = path.resolve(__dirname, '..');
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0]); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200); fs.createReadStream(f).pipe(r); }).listen(0);
  const b = await pw.chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  await routeExternal(p);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?capture`);
  await p.waitForFunction(() => window.__filmReady);
  const t0 = Date.now();
  const res = await p.evaluate(async () => {
    const buf = await Score.render(F.CUES, F.DUR, 48000);
    const d = buf.getChannelData(0), sr = buf.sampleRate, out = [];
    for (let s = 0; s < F.DUR; s += 4) {
      let sum = 0, pk = 0; const a = s * sr, e = Math.min(d.length, (s + 4) * sr);
      for (let i = a; i < e; i++) { sum += d[i] * d[i]; pk = Math.max(pk, Math.abs(d[i])); }
      out.push([s, (20 * Math.log10(Math.sqrt(sum / (e - a)) + 1e-9)).toFixed(1), pk.toFixed(2)]);
    }
    return out;
  });
  console.log('render ms', Date.now() - t0);
  console.log(res.map(([s, r, p]) => `${String(s).padStart(3)}s rms ${r} dB  peak ${p}`).join('\n'));
  await b.close(); srv.close();
})();
