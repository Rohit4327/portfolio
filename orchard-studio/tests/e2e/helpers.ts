import type { Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import type { StudioApi } from '../../src/debug/api';

export const OUT = process.env.STUDIO_OUT ?? 'qa/latest';
mkdirSync(OUT, { recursive: true });

export const LAYOUTS = ['today', 'recommended', 'keep9', 'rejected'] as const;
export type S = StudioApi;

/** Console errors and warnings collected per page (19.5: there must be none). */
export function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const t = m.text();
    // Software-GL notices from headless Chromium are about the test machine, not the app.
    if (/GL Driver Message|GPU stall due to ReadPixels|Automatic fallback to software WebGL|swiftshader|GroupMarkerNotSet/i.test(t)) return;
    problems.push(`${m.type()}: ${t}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

export async function open(page: Page, query = 'debug=1&quality=high', hash = ''): Promise<void> {
  await page.goto(`/?${query}${hash ? `#${hash}` : ''}`);
  await page.waitForFunction(() => !!window.__studio, undefined, { timeout: 120_000 });
  await page.evaluate(() => window.__studio.settle());
}
export const settle = (page: Page) => page.evaluate(() => window.__studio.settle());
export const shot = async (page: Page, name: string) => {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 240_000 });
};
