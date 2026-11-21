import { expect, test } from '@playwright/test';
import { LAYOUTS, open, settle, watchConsole } from './helpers';

test('layout switches update the counts', async ({ page }) => {
  const problems = watchConsole(page);
  await open(page);
  const expected = { today: [112, 64, 48], recommended: [90, 42, 48], keep9: [99, 51, 48], rejected: [90, 42, 48] } as const;
  for (const l of LAYOUTS) {
    await page.evaluate((id) => window.__studio.setLayout(id), l);
    await settle(page);
    const c = await page.evaluate(() => window.__studio.getCounts());
    expect([c.desks, c.garageDesks, c.projectDesks]).toEqual([...expected[l]]);
    expect(c.desksDrawn).toBe(expected[l][0]);
  }
  expect(problems).toEqual([]);
});
