// Frame-exact export of "Into the UX-Verse": renders every frame in headless Chromium,
// pipes JPEG frames to ffmpeg, muxes the synthesized score and writes soundtrack.mp3.
// Usage: node render/export.cjs [out.mp4] [fps]
const path = require('path'), fs = require('fs');
const { spawn, execFileSync } = require('child_process');
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { serve, open } = require('./frames.cjs');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'into-the-ux-verse.mp4'));
const FPS = +(process.argv[3] || 30);
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

(async () => {
  const srv = serve();
  const { b, p } = await open(pw, srv);
  const DUR = await p.evaluate(() => window.__film.DUR);
  const wavPath = out.replace(/\.mp4$/, '') + '.wav';
  const n = await p.evaluate(() => window.__film.audio());
  const CH = 3 << 20, fd = fs.openSync(wavPath, 'w');
  for (let i = 0; i < n; i += CH) fs.writeSync(fd, Buffer.from(await p.evaluate(([i, CH]) => window.__film.audioChunk(i, CH), [i, CH]), 'base64'));
  fs.closeSync(fd);
  console.log('audio written', wavPath);
  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wavPath,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-g', '60', '-maxrate', '10M', '-bufsize', '20M',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(DUR * FPS), t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await p.evaluate((t) => window.__film.render(t), i / FPS);
    const jpg = await p.screenshot({ type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await b.close(); srv.close();
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libmp3lame', '-b:a', '192k', path.join(root, 'soundtrack.mp3')]);
  fs.unlinkSync(wavPath);
  console.log('done', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
