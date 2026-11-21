import { expect, test, type Page } from '@playwright/test';
import { LAYOUTS, open, settle, watchConsole } from './helpers';

// Interaction logic does not depend on image quality, so these run on the lightest tier. On software WebGL a frame
// can take seconds; timeScale lets animations and walking cover the same simulated time in fewer frames.
const QUERY = 'debug=1&quality=low';
const inspectKind = (page: Page) => page.evaluate(() => window.__studio.getState().inspect?.kind ?? null);
const data = (page: Page, k: string) => page.evaluate((key) => window.__studio.getState().inspect?.data[key] ?? null, k);
async function walkAt(page: Page, stop: number, scale = 20) {
  await open(page, QUERY);
  await page.evaluate(
    ({ stop, scale }) => {
      window.__studio.ext.timeScale = scale;
      window.__studio.ext.noPopups = true;
      window.__studio.ext.holdDoors = true;
      window.__studio.setMode('walkthrough');
      window.__studio.goToStop(stop);
    },
    { stop, scale },
  );
  await settle(page);
}
const startInspect = (page: Page, id: string) => page.evaluate((h) => (window.__studio.ext.inspect as (id: string) => boolean)(h), id);
const WAIT = { timeout: 240_000 };

test('layout switches update the counts', async ({ page }) => {
  const problems = watchConsole(page);
  await open(page, QUERY);
  const expected = { today: [112, 64, 48], recommended: [90, 42, 48], keep9: [99, 51, 48], rejected: [90, 42, 48] } as const;
  for (const l of LAYOUTS) {
    await page.evaluate((id) => window.__studio.setLayout(id), l);
    await settle(page);
    const c = await page.evaluate(() => window.__studio.getCounts());
    expect([c.desks, c.garageDesks, c.projectDesks]).toEqual([...expected[l]]);
    expect(c.desksDrawn).toBe(expected[l][0]);
    await expect(page.getByTestId('summary-chip')).toContainText(l === 'today' ? '112 desks' : l === 'keep9' ? '51 desks' : l === 'rejected' ? 'Rejected' : '42 desks');
  }
  const rec = await page.evaluate(() => (window.__studio.setLayout('recommended'), window.__studio.getCounts()));
  expect(rec).toMatchObject({ kiosks: 4, plinths: 8, galleriaDevices: 7, vrSeats: 2, plantPods: 11 });
  expect(problems).toEqual([]);
});

test('the watch gate opens the door', async ({ page }) => {
  const problems = watchConsole(page);
  await walkAt(page, 6);
  await page.evaluate(() => window.__studio.setDoor('entry', false));
  expect(await page.evaluate(() => window.__studio.getState().openDoors)).not.toContain('entry');
  expect(await startInspect(page, 'watchGate')).toBe(true);
  await page.waitForFunction(() => window.__studio.getState().openDoors.includes('entry'), undefined, WAIT);
  expect(problems).toEqual([]);
});

test('a kiosk opens and closes; a Galleria device can be picked up and put back', async ({ page }) => {
  const problems = watchConsole(page);
  await walkAt(page, 9);
  await startInspect(page, 'kiosk-K1');
  expect(await inspectKind(page)).toBe('kiosk');
  await expect(page.getByTestId('inspect-card')).toContainText('Tata');
  await page.getByTestId('inspect-back').click();
  expect(await inspectKind(page)).toBeNull();
  await page.evaluate(() => window.__studio.goToStop(16));
  await settle(page);
  await startInspect(page, 'galleria-3');
  expect(await inspectKind(page)).toBe('galleria');
  await page.getByTestId('scan').click();
  await page.waitForFunction(() => window.__studio.getState().inspect?.data.scanned === true, undefined, WAIT);
  await page.getByTestId('put-back').click();
  expect(await inspectKind(page)).toBeNull();
  expect(problems).toEqual([]);
});

test('the headset goes on and comes off', async ({ page }) => {
  const problems = watchConsole(page);
  await walkAt(page, 17);
  await startInspect(page, 'headset');
  await page.waitForFunction(() => window.__studio.getState().inspect?.data.phase === 'home', undefined, WAIT);
  await expect(page.getByTestId('headset-hud')).toHaveAttribute('data-phase', 'home');
  await page.getByTestId('headset-remove').click();
  expect(await inspectKind(page)).toBeNull();
  expect(problems).toEqual([]);
});

test('the board session starts and ends', async ({ page }) => {
  const problems = watchConsole(page);
  await walkAt(page, 19);
  await startInspect(page, 'board');
  await page.getByTestId('board-start').click();
  expect(await data(page, 'session')).toBe(true);
  await page.getByTestId('board-end').click();
  expect(await data(page, 'session')).toBe(false);
  expect(problems).toEqual([]);
});

test('foosball scores a goal against a scripted ball', async ({ page }) => {
  const problems = watchConsole(page);
  await walkAt(page, 20, 1);
  await startInspect(page, 'foosball');
  await page.getByTestId('foos-start').click();
  await page.evaluate(() => (window.__studio.ext.foosScripted as () => unknown)());
  await page.waitForFunction(() => ((window.__studio.ext.foosScore as () => { blue: number } | null)()?.blue ?? 0) >= 1, undefined, WAIT);
  expect(await data(page, 'blue')).toBeGreaterThanOrEqual(1);
  expect(problems).toEqual([]);
});

test('the selfie produces an image and the Read Note opens', async ({ page }) => {
  const problems = watchConsole(page);
  await walkAt(page, 21);
  await startInspect(page, 'selfie');
  await page.getByTestId('shoot').click();
  await page.waitForFunction(() => String(window.__studio.getState().inspect?.data.url ?? '').startsWith('data:image/jpeg'), undefined, WAIT);
  await expect(page.getByTestId('selfie-print')).toBeVisible();
  expect(String(await data(page, 'url')).length).toBeGreaterThan(5000);
  await page.evaluate(() => window.__studio.goToStop(22));
  await settle(page);
  await startInspect(page, 'readNote');
  await page.waitForFunction(() => window.__studio.getState().inspect?.data.open === true, undefined, WAIT);
  await expect(page.getByTestId('inspect-card')).toContainText('Placeholder closing note');
  expect(problems).toEqual([]);
});

for (const layout of ['recommended', 'keep9'] as const)
  test(`the tour runs from stop 1 to 22 without collisions (${layout})`, async ({ page }) => {
    const problems = watchConsole(page);
    await open(page, QUERY, layout);
    await page.evaluate(() => {
      const s = window.__studio;
      s.ext.timeScale = 30;
      s.ext.dwellScale = 0.02;
      s.ext.tourTest = true;
      s.ext.holdDoors = true;
      s.setMode('walkthrough');
      s.goToStop(1);
      s.setDoor('lift-PL07', false);
      s.setDoor('entry', false);
    });
    await settle(page);
    await page.evaluate(() => (window.__studio.ext.startTour as (n: number) => void)(1));
    type T = { visited: number[]; collisions: number; active: boolean };
    await page.waitForFunction(() => (window.__studio.ext.tourState as () => T)().visited.includes(22), undefined, { timeout: 12 * 60_000 });
    const t = await page.evaluate(() => (window.__studio.ext.tourState as () => T)());
    expect(t.visited).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
    expect(t.collisions).toBe(0);
    // The doors played their real interactions on the way.
    expect(await page.evaluate(() => window.__studio.getState().openDoors)).toEqual(expect.arrayContaining(['lift-PL07', 'entry']));
    expect(problems).toEqual([]);
  });

test('audio unlocks on the first gesture, mutes, ducks and switches beds (event log)', async ({ page }) => {
  const problems = watchConsole(page);
  await open(page, QUERY);
  type A = { state: { unlocked: boolean; muted: boolean; ducked: boolean; bed: string; volume: number }; events: { type: string; detail: string }[] };
  const audio = () => page.evaluate(() => (window.__studio.ext.audio as () => A)());
  expect((await audio()).state.unlocked).toBe(false);
  await page.getByTestId('labels-btn').click(); // first user gesture
  await page.waitForFunction(() => (window.__studio.ext.audio as () => A)().state.unlocked, undefined, WAIT);
  let a = await audio();
  expect(a.events.some((e) => e.type === 'unlock')).toBe(true);
  expect(a.events.some((e) => e.type === 'play' && e.detail.startsWith('click'))).toBe(true);
  expect(a.state.bed).toBe('presentation');
  // Mute persists.
  await page.getByTestId('settings-btn').click();
  await page.getByRole('switch', { name: 'Sound' }).click();
  expect((await audio()).state.muted).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('orchard.audio') ?? '{}').muted)).toBe(true);
  await page.getByRole('switch', { name: 'Sound' }).click();
  // Ducking while media with sound plays.
  await page.evaluate(() => (window.__studio.ext.audioDuck as (on: boolean) => void)(true));
  expect((await audio()).state.ducked).toBe(true);
  await page.evaluate(() => (window.__studio.ext.audioDuck as (on: boolean) => void)(false));
  // Zone beds follow the visitor.
  await page.evaluate(() => {
    window.__studio.setMode('walkthrough');
    window.__studio.goToStop(3);
  });
  await page.waitForFunction(() => (window.__studio.ext.audio as () => A)().state.bed === 'corridor', undefined, WAIT);
  a = await audio();
  expect(a.events.some((e) => e.type === 'bed')).toBe(true);
  expect(problems).toEqual([]);
});

test('Start experience dives into the lift, the doors open, and Exit to model returns to the table', async ({ page }) => {
  const problems = watchConsole(page);
  await open(page, QUERY);
  await page.evaluate(() => (window.__studio.ext.timeScale = 30));
  await page.getByTestId('start').click();
  await page.waitForFunction(() => window.__studio.getState().mode === 'walkthrough', undefined, WAIT);
  const s = await page.evaluate(() => window.__studio.getState());
  expect(s.dive).toBe(1);
  expect(Math.round(s.player.x)).toBe(-66);
  await page.waitForFunction(() => window.__studio.getState().openDoors.includes('lift-PL07'), undefined, WAIT);
  await expect(page.locator('.pill.loc')).toContainText('Lift Lobby');
  await page.getByTestId('exit-model').click();
  await page.waitForFunction(() => window.__studio.getState().mode === 'presentation', undefined, WAIT);
  expect((await page.evaluate(() => window.__studio.getState())).dive).toBe(0);
  await expect(page.getByTestId('start')).toBeVisible();
  expect(problems).toEqual([]);
});
