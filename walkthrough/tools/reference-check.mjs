/**
 * reference-check.mjs — offline REFERENCE MATCH verification.
 *
 * Renders the scene from the reference viewpoint in headless Chromium and
 * writes three images next to the reference: the reconstruction on its own, a
 * 50% blend against the source render, and a stacked before/after. Use it after
 * moving anything in src/plan.js.
 *
 *   npm i -D playwright        # once, anywhere on the machine
 *   node walkthrough/tools/reference-check.mjs [outDir]
 *
 * It also flood-fills the collision world from the lift-lobby spawn and reports
 * which zones the player can actually reach.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = process.argv[2] || path.join(HERE, 'out');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.png': 'image/png',
};

fs.mkdirSync(OUT, { recursive: true });

// software GL keeps this working on machines without a GPU; set CHROMIUM_PATH
// if Playwright's own download is not available
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 718 } });

await page.route('**/*', (route) => {
  const url = new URL(route.request().url());
  if (url.hostname !== 'local.test') return route.abort();
  const file = path.join(ROOT, decodeURIComponent(url.pathname));
  try {
    route.fulfill({
      status: 200,
      contentType: MIME[path.extname(file)] || 'application/octet-stream',
      body: fs.readFileSync(file),
    });
  } catch {
    route.fulfill({ status: 404, body: 'not found' });
  }
});

const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });

await page.goto('http://local.test/walkthrough/index.html', { waitUntil: 'commit' });
await page.waitForFunction(() => !!window.WALKTHROUGH, null, { timeout: 180000 });
await page.evaluate(() => {
  window.WALKTHROUGH.setAdaptive(false);
  document.getElementById('skip').click();
});
await page.waitForTimeout(1500);

const png = await page.evaluate(() => {
  const w = window.WALKTHROUGH;
  w.refMode.enter();
  w.refMode.setOpacity(0);
  return w.grab();
});
fs.writeFileSync(path.join(OUT, 'reconstruction.png'), Buffer.from(png.split(',')[1], 'base64'));

const reach = await page.evaluate(() => {
  const c = window.WALKTHROUGH.collision;
  const P = window.WALKTHROUGH.plan;
  const step = 0.08;
  const X0 = -13.4, X1 = 13.4, Z0 = -9.7, Z1 = 7.0;
  const nx = Math.round((X1 - X0) / step), nz = Math.round((Z1 - Z0) / step);
  const legal = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = X0 + i * step, z = Z0 + j * step;
      legal[j * nx + i] = c.reachable(x, z) && !c.hits(x, z) ? 1 : 0;
    }
  }
  const si = Math.round((P.wx(P.LIFT.spawn.x) - X0) / step);
  const sj = Math.round((P.wz(P.LIFT.spawn.y) - Z0) / step);
  const vis = new Uint8Array(nx * nz);
  const q = [[si, sj]];
  vis[sj * nx + si] = 1;
  let count = 1;
  while (q.length) {
    const [i, j] = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const k = b * nx + a;
      if (vis[k] || !legal[k]) continue;
      vis[k] = 1; count++; q.push([a, b]);
    }
  }
  const zones = {
    liftLobby: [1273, 238], rearLounge: [1200, 470], capsuleNorth: [1300, 780],
    capsuleSofa: [1300, 1000], prowess: [478, 900], peopleZone: [520, 1000],
    pantry: [655, 470], discussion: [400, 480], utility: [160, 390],
    meetingA: [830, 560], meetingB: [860, 660], meetingR1: [1640, 560],
    meetingR2: [1650, 700], meetingR3: [1640, 930], frontEdge: [900, 1120],
  };
  const report = {};
  for (const [name, [px, py]] of Object.entries(zones)) {
    const i = Math.round((P.wx(px) - X0) / step), j = Math.round((P.wz(py) - Z0) / step);
    let hit = null;
    for (let r = 0; r <= 22 && !hit; r++) {
      for (let di = -r; di <= r && !hit; di++) {
        for (let dj = -r; dj <= r && !hit; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          if (legal[b * nx + a]) hit = b * nx + a;
        }
      }
    }
    report[name] = hit === null ? 'no floor' : (vis[hit] ? 'reachable' : 'ISOLATED');
  }
  return { walkable: legal.reduce((s, v) => s + v, 0), reachable: count, zones: report };
});

console.log(`walkable cells ${reach.walkable}  reachable ${reach.reachable}`);
for (const [k, v] of Object.entries(reach.zones)) console.log(`  ${k.padEnd(14)} ${v}`);
console.log(problems.length ? problems.join('\n') : 'no console errors');
console.log(`wrote ${path.join(OUT, 'reconstruction.png')}`);
console.log('compare it against walkthrough/assets/reference.jpg, or press V in the app');

await browser.close();
