/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** Lists the files the owner has dropped into public/media, public/audio, public/hdri and public/textures,
 *  so the app can use real content when present and fall back to generated placeholders without 404 probes. */
function availableAssets(): Plugin {
  const scan = () => {
    const out: Record<string, string[]> = {};
    for (const dir of ['media', 'audio', 'hdri', 'textures', 'models']) {
      const p = join(import.meta.dirname, 'public', dir);
      out[dir] = existsSync(p) ? readdirSync(p).filter((f) => !f.startsWith('.') && f !== 'available.json') : [];
    }
    mkdirSync(join(import.meta.dirname, 'public'), { recursive: true });
    writeFileSync(join(import.meta.dirname, 'public', 'available.json'), JSON.stringify(out, null, 1));
  };
  return { name: 'available-assets', buildStart: scan, configureServer: scan };
}

export default defineConfig({
  base: './',
  plugins: [react(), availableAssets()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2500, sourcemap: false },
  server: { port: 5173, strictPort: true },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
