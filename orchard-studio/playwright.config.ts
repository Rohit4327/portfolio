import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Cloud/CI containers ship a pinned Chromium at this path; on the owner's machine we use system Chrome with the GPU.
const pinned = '/opt/pw-browsers/chromium';
const useGpu = process.env.STUDIO_GPU === '1' || !existsSync(pinned);
const launchOptions = useGpu
  ? { channel: 'chrome' as const, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=default'] }
  : {
      executablePath: pinned,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 15 * 60_000,
  expect: { timeout: 60_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    headless: !useGpu || process.env.STUDIO_HEADED !== '1',
    launchOptions,
    trace: 'off',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
