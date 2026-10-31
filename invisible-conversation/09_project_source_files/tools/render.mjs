// Full render: node tools/render.mjs --from 0 --to 300 --fps 24 --workers 4 --out ../renders/film_video.mp4 [--crf 14] [--scale 1]
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { once } from 'node:events';
import { startServer, launch, openFilm, renderFrame, captureFrame, ROOT } from './browser.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'] : null).filter(Boolean));
const from = Number(args.from ?? 0), to = Number(args.to ?? 300), fps = Number(args.fps ?? 24), workers = Number(args.workers ?? 4);
const crf = Number(args.crf ?? 14), scale = Number(args.scale ?? 1);
const out = path.resolve(args.out || path.join(ROOT, '..', 'renders', 'film_video.mp4'));
const tmp = path.join(path.dirname(out), 'chunks'); fs.mkdirSync(tmp, { recursive: true });
const total = Math.round((to - from) * fps); const per = Math.ceil(total / workers);
console.log(`render ${total} frames (${from}s→${to}s @${fps}) with ${workers} workers → ${out}`);
const { server, port } = await startServer(); const browser = await launch();
const started = Date.now(); let done = 0;
async function worker(i) {
  const f0 = i * per, f1 = Math.min(total, (i + 1) * per); if (f0 >= f1) return null;
  const chunk = path.join(tmp, `chunk_${String(i).padStart(2, '0')}.mp4`);
  const { page } = await openFilm(browser, port, { scale, label: `w${i}` });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', chunk], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = f0; f < f1; f++) {
    const t = from + f / fps;
    await renderFrame(page, t, f);
    const buf = await captureFrame(page);
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    done++;
    if (done % 48 === 0 || f === f1 - 1) { const el = (Date.now() - started) / 1000; const rate = done / el; console.log(`  ${done}/${total} frames  ${(done / total * 100).toFixed(1)}%  ${rate.toFixed(2)} fps  ETA ${((total - done) / rate / 60).toFixed(1)} min`); }
  }
  ff.stdin.end(); await once(ff, 'close'); await page.context().close();
  return chunk;
}
try {
  const chunks = (await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)))).filter(Boolean);
  const list = path.join(tmp, 'list.txt'); fs.writeFileSync(list, chunks.map((c) => `file '${c}'`).join('\n'));
  const cat = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' });
  await once(cat, 'close');
  console.log(`done in ${((Date.now() - started) / 60000).toFixed(1)} min → ${out}`);
} finally { await browser.close(); server.close(); }
