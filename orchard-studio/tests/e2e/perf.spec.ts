import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { open, OUT, settle } from './helpers';

/** Section 15 pass marks. Sampled for SAMPLE_S seconds each; written to qa/latest/perf.json. */
const SAMPLE_S = Number(process.env.PERF_SECONDS ?? 10);

test('performance sample', async ({ page }) => {
  await open(page);
  const gpu = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('webgl2');
    const ext = c?.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(c!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
  const software = /swiftshader|llvmpipe|software/i.test(gpu);
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] });
  });
  type Sample = Record<string, unknown>;
  const sample = async (name: string, drive?: string): Promise<Sample> => {
    await settle(page);
    const r = await page.evaluate(
      async ({ seconds, drive }) => {
        const w = window as unknown as { __long: number[] };
        w.__long.length = 0;
        window.__studio.resetFps();
        const step = drive ? (new Function('t', drive) as (t: number) => void) : null;
        // requestAnimationFrame cadence shows whether the main thread stays free even when nothing is rendered.
        const raf: number[] = [];
        const t0 = performance.now();
        let last = t0;
        await new Promise<void>((done) => {
          const tick = (now: number) => {
            raf.push(now - last);
            last = now;
            step?.((now - t0) / 1000);
            if (now - t0 < seconds * 1000) requestAnimationFrame(tick);
            else done();
          };
          requestAnimationFrame(tick);
        });
        const sorted = [...raf].sort((a, b) => a - b);
        const mean = raf.reduce((a, b) => a + b, 0) / raf.length;
        return {
          rafFpsMean: +(1000 / mean).toFixed(1),
          rafFpsP5: +(1000 / sorted[Math.floor(sorted.length * 0.95)]).toFixed(1),
          rafFrameMsP95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
          rendered: window.__studio.getFps(),
          info: window.__studio.getRendererInfo(),
          longTasks: { count: w.__long.length, maxMs: Math.max(0, ...w.__long) },
        };
      },
      { seconds: SAMPLE_S, drive: drive ?? '' },
    );
    return { name, ...r };
  };
  const results: Sample[] = [];
  results.push(await sample('presentation-idle'));
  results.push(await sample('presentation-orbit', 'window.__studio.ext.orbitStep && window.__studio.ext.orbitStep(t)'));
  const layoutSwitchMs = await page.evaluate(async () => {
    const times: number[] = [];
    for (const l of ['today', 'recommended', 'keep9', 'rejected', 'recommended'] as const) {
      const t0 = performance.now();
      window.__studio.setLayout(l);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      times.push(+(performance.now() - t0).toFixed(1));
    }
    return times;
  });
  await page.evaluate(() => window.__studio.setMode('walkthrough'));
  for (const n of [6, 14, 19]) {
    await page.evaluate((k) => window.__studio.goToStop(k), n);
    results.push(await sample(`walkthrough-stop-${n}`));
  }
  const report = {
    at: new Date().toISOString(),
    renderer: gpu,
    representative: !software,
    note: software
      ? 'NOT REPRESENTATIVE: software WebGL (no GPU in this environment). Run on the target Mac: STUDIO_GPU=1 npm run perf'
      : 'GPU run',
    sampleSeconds: SAMPLE_S,
    targets: { presentationFps: 60, walkthroughFps: 55, layoutSwitchMs: 150, drawCallsPresentation: 200, drawCallsWalkthrough: 300, triangles: 1_500_000 },
    layoutSwitchMs,
    results,
  };
  writeFileSync(`${OUT}/perf.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
});
