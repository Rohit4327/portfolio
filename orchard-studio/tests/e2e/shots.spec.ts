import { expect, test } from '@playwright/test';
import { LAYOUTS, open, settle, shot, watchConsole } from './helpers';

const only = (process.env.SHOTS ?? '').split(',').filter(Boolean);
const want = (group: string) => !only.length || only.includes(group);

test('plan check: geometry over the floor-plan underlay', async ({ page }) => {
  test.skip(!want('plan'));
  const problems = watchConsole(page);
  for (const view of ['all', 'adc']) {
    await open(page, `debug=plan&view=${view}`);
    for (const layout of LAYOUTS) {
      await page.evaluate((l) => window.__studio.setLayout(l), layout);
      await shot(page, `plan-${view}-${layout}`);
    }
  }
  expect(problems).toEqual([]);
});

test('presentation: one shot per layout, then labels with doors', async ({ page }) => {
  test.skip(!want('presentation'));
  const problems = watchConsole(page);
  await open(page);
  for (const layout of LAYOUTS) {
    await page.evaluate((l) => window.__studio.setLayout(l), layout);
    await page.waitForTimeout(500);
    await shot(page, `presentation-${layout}`);
  }
  await page.evaluate(() => {
    window.__studio.setLayout('recommended');
    window.__studio.setLabels('doors');
  });
  await page.waitForTimeout(500);
  await shot(page, 'presentation-recommended-doors');
  expect(problems).toEqual([]);
});

test('transition: mid-dive frame', async ({ page }) => {
  test.skip(!want('dive'));
  const problems = watchConsole(page);
  await open(page);
  const ok = await page.evaluate(() => {
    const f = window.__studio.ext.diveTo as ((t: number) => void) | undefined;
    f?.(3.3);
    return !!f;
  });
  test.skip(!ok, 'dive not built yet');
  await shot(page, 'dive-mid');
  expect(problems).toEqual([]);
});

const STOPS = [1, 3, 6, 7, 8, 14, 15, 16, 17, 19, 21, 22];
test('walkthrough: tour stops', async ({ page }) => {
  test.skip(!want('walk'));
  const problems = watchConsole(page);
  await open(page);
  await page.evaluate(() => window.__studio.setMode('walkthrough'));
  await settle(page);
  const stops = process.env.STOPS ? process.env.STOPS.split(',').map(Number) : STOPS;
  for (const n of stops) {
    const name = await page.evaluate((k) => window.__studio.goToStop(k), n);
    await page.waitForTimeout(700);
    await shot(page, `walk-${String(n).padStart(2, '0')}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  }
  expect(problems).toEqual([]);
});

// Zone shots for the other three layouts (Checkpoint 2): plan-feet camera poses.
const LAYOUT_VIEWS: Record<string, [string, number, number, number, number][]> = {
  today: [['spine', 22, 14.5, 12, -4], ['bottom-band', 30, 14, -38, -6]],
  keep9: [['make-strip', 70.5, 23.4, 90, -4], ['garage-nine', 60.5, 35.5, 20, -4], ['memory', 65.1, 53.2, 78, 2]],
  rejected: [['make-at-door', 31, 14.5, -28, -6], ['kiosks-at-windows', 62, 33, 5, -2]],
};
test('walkthrough: zone views in Today, Keep 9 seats and Rejected', async ({ page }) => {
  test.skip(!want('layouts'));
  const problems = watchConsole(page);
  await open(page);
  await page.evaluate(() => {
    window.__studio.setMode('walkthrough');
    window.__studio.goToStop(7);
  });
  for (const [layout, views] of Object.entries(LAYOUT_VIEWS)) {
    await page.evaluate((l) => window.__studio.setLayout(l as 'today'), layout);
    for (const [name, x, y, yaw, pitch] of views) {
      await page.evaluate((p) => window.__studio.setCamera({ plan: p }), { x, y, yaw, pitch });
      await page.waitForTimeout(500);
      await shot(page, `layout-${layout}-${name}`);
    }
  }
  expect(problems).toEqual([]);
});
