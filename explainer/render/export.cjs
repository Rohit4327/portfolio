// Frame-exact export: renders every frame of the film in headless Chromium, pipes
// the frames to ffmpeg, and muxes the synthesized soundtrack.
// Usage: node render/export.cjs [out.mp4] [fps]
const path = require('path'), fs = require('fs'), http = require('http');
const { spawn, execFileSync } = require('child_process');
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { routeExternal } = require('./frames.cjs');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'hello-world.mp4'));
const FPS = +(process.argv[3] || 30);
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0]); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await routeExternal(p);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?capture`);
  await p.waitForFunction(() => window.__filmReady, null, { timeout: 60000 });
  const DUR = await p.evaluate(() => window.__film.DUR);

  // soundtrack
  const wavPath = out.replace(/\.mp4$/, '') + '.wav';
  const n = await p.evaluate(() => window.__film.audio());
  const CH = 3 << 20;
  const fd = fs.openSync(wavPath, 'w');
  for (let i = 0; i < n; i += CH) fs.writeSync(fd, Buffer.from(await p.evaluate(([i, CH]) => window.__film.audioChunk(i, CH), [i, CH]), 'base64'));
  fs.closeSync(fd);
  console.log('audio written', wavPath);

  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', wavPath,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-g', '60', '-maxrate', '8M', '-bufsize', '16M',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const frames = Math.round(DUR * FPS);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await p.evaluate((t) => window.__film.render(t), i / FPS);
    const jpg = await p.screenshot({ type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await b.close(); srv.close();
  // web copy of the soundtrack so the page can skip synthesis
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'aac', '-b:a', '160k', path.join(root, 'soundtrack.m4a')]);
  fs.unlinkSync(wavPath);
  console.log('done', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
