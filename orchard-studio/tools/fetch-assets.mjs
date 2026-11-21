#!/usr/bin/env node
/**
 * fetch-assets.mjs: download a fixed, small list of CC0 assets from Poly Haven into assets-raw/.
 *
 *   npm run assets:fetch                      # 2k, skips files that already exist
 *   npm run assets:fetch -- --force           # re-download everything
 *   npm run assets:fetch -- --res=4k --only=oak_veneer_01
 *   npm run assets:fetch -- --dry-run         # resolve and print URLs, download nothing
 *   npm run assets:fetch -- --maps=color,normal,roughness,ao
 *
 * The app has procedural fallbacks for every asset here, so a failed download is never fatal:
 * this script exits 0 with a summary when the network is unavailable and non-zero only on bugs
 * or bad arguments.
 */
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------------------------
// The asset list. Poly Haven asset ids, all CC0 1.0. Edit here, nowhere else.
// ---------------------------------------------------------------------------------------------
const ASSETS = [
  // HDRIs (.hdr, equirectangular)
  // Replaces the procedural studio environment that lights the presentation room.
  { id: 'studio_small_08', type: 'hdri' },
  // Replaces the procedural gradient sky in walkthrough mode (partly cloudy daytime, no sun disc clutter).
  { id: 'kloofendal_48d_partly_cloudy_puresky', type: 'hdri' },

  // Textures (jpg: colour, OpenGL normal, roughness)
  // Replaces the procedural white-oak grain on the furniture and the table (the app lightens it).
  { id: 'oak_veneer_01', type: 'texture' },
  // Replaces the procedural timber floor boards.
  { id: 'laminate_floor_02', type: 'texture' },
  // Replaces the procedural speckled terrazzo (plinths and hard floor areas).
  { id: 'terrazzo_tiles', type: 'texture' },
  // Replaces the flat-colour painted plaster on the walls and ceiling.
  { id: 'grey_plaster_02', type: 'texture' },
  // Replaces the procedural woven upholstery fabric on the seating.
  { id: 'fabric_pattern_07', type: 'texture' },
];

/**
 * Poly Haven names its maps differently per asset, so each logical map lists the keys to try,
 * matched case-insensitively and in this order. `file` is the suffix used for the local file name
 * (it matches Poly Haven's own naming, which optimize-assets.mjs understands).
 */
const MAP_ALIASES = {
  color: { file: 'diff', keys: ['Diffuse', 'diff', 'Color', 'col', 'albedo', 'base_color', 'basecolor'] },
  normal: { file: 'nor_gl', keys: ['nor_gl', 'Normal', 'normal_gl', 'nor'] },
  roughness: { file: 'rough', keys: ['Rough', 'roughness'] },
  ao: { file: 'ao', keys: ['AO', 'ambient_occlusion', 'ambientocclusion'] },
  arm: { file: 'arm', keys: ['arm'] },
};
const DEFAULT_MAPS = ['color', 'normal', 'roughness'];
const RESOLUTIONS = ['1k', '2k', '4k'];

const API = 'https://api.polyhaven.com';
const USER_AGENT = 'orchard-studio-asset-fetch/1.0';
const API_TIMEOUT_MS = 20_000;
const DOWNLOAD_TIMEOUT_MS = 180_000;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'assets-raw');

// ---------------------------------------------------------------------------------------------

/** Thrown for bad command-line input: prints the message and exits 2 without a stack trace. */
class UsageError extends Error {}

/** A failure that should be reported in the table but must not stop the run. */
class FetchFailure extends Error {
  constructor(message, { network = false } = {}) {
    super(message);
    this.network = network;
  }
}

function parseArgs(argv) {
  const opts = { force: false, dryRun: false, res: '2k', only: null, maps: DEFAULT_MAPS, help: false };
  for (const arg of argv) {
    if (arg === '--force') opts.force = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--res=')) opts.res = arg.slice(6).toLowerCase();
    else if (arg.startsWith('--only=')) opts.only = splitList(arg.slice(7));
    else if (arg.startsWith('--maps=')) opts.maps = splitList(arg.slice(7)).map((m) => m.toLowerCase());
    else throw new UsageError(`unknown argument: ${arg}`);
  }
  if (!RESOLUTIONS.includes(opts.res)) {
    throw new UsageError(`--res must be one of ${RESOLUTIONS.join(', ')} (got "${opts.res}")`);
  }
  const badMaps = opts.maps.filter((m) => !(m in MAP_ALIASES));
  if (badMaps.length || opts.maps.length === 0) {
    throw new UsageError(`--maps accepts ${Object.keys(MAP_ALIASES).join(', ')} (got "${opts.maps.join(',')}")`);
  }
  if (opts.only) {
    const known = new Set(ASSETS.map((a) => a.id));
    const unknown = opts.only.filter((id) => !known.has(id));
    if (unknown.length || opts.only.length === 0) {
      throw new UsageError(
        `--only has ids that are not in the asset list: ${unknown.join(', ') || '(empty)'}\n` +
          `known ids: ${[...known].join(', ')}`,
      );
    }
  }
  return opts;
}

const splitList = (s) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const USAGE = `Usage: node tools/fetch-assets.mjs [--force] [--res=1k|2k|4k] [--only=<id,id>] [--maps=<map,map>] [--dry-run]

  --force     re-download files that already exist
  --res       resolution for every selected asset (default 2k)
  --only      restrict to these asset ids
  --maps      texture maps to fetch (default ${DEFAULT_MAPS.join(',')}; also: ao, arm)
  --dry-run   resolve and print the download URLs, write nothing

Assets: ${ASSETS.map((a) => a.id).join(', ')}`;

/** Case-insensitive lookup of the first matching key. */
function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  const byLower = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), k]));
  for (const key of keys) {
    const real = byLower.get(key.toLowerCase());
    if (real !== undefined) return obj[real];
  }
  return undefined;
}

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

/** Turns anything fetch() can throw into a FetchFailure with a short, readable reason. */
function describeNetworkError(err) {
  if (err instanceof FetchFailure) return err;
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    return new FetchFailure('timed out', { network: true });
  }
  const code = err?.cause?.code ?? err?.code;
  const detail = code ?? err?.cause?.message ?? err?.message ?? String(err);
  return new FetchFailure(`network unavailable (${detail})`, { network: true });
}

async function request(url, timeoutMs) {
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw describeNetworkError(err);
  }
  if (res.status === 404) throw new FetchFailure('not found on Poly Haven (404)');
  if (!res.ok) throw new FetchFailure(`HTTP ${res.status}`);
  return res;
}

async function getFilesJson(id) {
  const res = await request(`${API}/files/${encodeURIComponent(id)}`, API_TIMEOUT_MS);
  try {
    return await res.json();
  } catch (err) {
    if (err instanceof SyntaxError) throw new FetchFailure('API did not return JSON');
    throw describeNetworkError(err);
  }
}

/** The local files an asset should produce. Names are deterministic so the cache check needs no network. */
function plannedFiles(asset, opts) {
  if (asset.type === 'hdri') {
    return [{ map: 'hdri', name: `${asset.id}_${opts.res}.hdr` }];
  }
  return opts.maps.map((map) => ({ map, name: `${asset.id}_${MAP_ALIASES[map].file}_${opts.res}.jpg` }));
}

/** Finds { url, size, md5 } for one planned file inside the /files JSON, or throws a FetchFailure. */
function resolveSource(asset, planned, json, res) {
  if (asset.type === 'hdri') {
    const entry = pick(pick(pick(json, ['hdri']), [res]), ['hdr']);
    if (!entry?.url) throw new FetchFailure(`no ${res} .hdr in the API response`);
    return entry;
  }
  const byRes = pick(json, MAP_ALIASES[planned.map].keys);
  if (!byRes) throw new FetchFailure(`no ${planned.map} map`);
  const entry = pick(pick(byRes, [res]), ['jpg']);
  if (!entry?.url) throw new FetchFailure(`no ${res} jpg for ${planned.map}`);
  return entry;
}

async function download(source, dest) {
  const res = await request(source.url, DOWNLOAD_TIMEOUT_MS);
  const tmp = `${dest}.part`;
  const hash = createHash('md5');
  try {
    const body = Readable.fromWeb(res.body);
    body.on('data', (chunk) => hash.update(chunk));
    await pipeline(body, createWriteStream(tmp));
    const bytes = await sizeOf(tmp);
    if (bytes === 0) throw new FetchFailure('empty response');
    if (Number.isFinite(source.size) && source.size !== bytes) {
      throw new FetchFailure(`size mismatch (${bytes} of ${source.size} bytes)`, { network: true });
    }
    if (typeof source.md5 === 'string' && source.md5.toLowerCase() !== hash.digest('hex')) {
      throw new FetchFailure('checksum mismatch');
    }
    await rename(tmp, dest);
    return bytes;
  } catch (err) {
    await rm(tmp, { force: true });
    throw err instanceof FetchFailure ? err : describeNetworkError(err);
  }
}

async function processAsset(asset, opts) {
  const dir = path.join(RAW_DIR, asset.id);
  const planned = plannedFiles(asset, opts);
  const result = { id: asset.id, type: asset.type, res: opts.res, files: [], bytes: 0, status: '', reason: '' };

  // Cache check first: it works offline.
  const missing = [];
  for (const p of planned) {
    const bytes = opts.force || opts.dryRun ? 0 : await sizeOf(path.join(dir, p.name));
    if (bytes > 0) {
      result.files.push({ map: p.map, name: p.name, bytes, cached: true });
      result.bytes += bytes;
    } else {
      missing.push(p);
    }
  }
  if (missing.length === 0) {
    result.status = 'cached';
    return result;
  }

  let json;
  try {
    json = await getFilesJson(asset.id);
  } catch (err) {
    result.status = 'failed';
    result.reason = err.message;
    result.network = Boolean(err.network);
    return result;
  }

  const problems = [];
  let downloaded = 0;
  for (const p of missing) {
    try {
      const source = resolveSource(asset, p, json, opts.res);
      if (opts.dryRun) {
        result.files.push({ map: p.map, name: p.name, bytes: source.size ?? 0, url: source.url });
        result.bytes += source.size ?? 0;
        continue;
      }
      await mkdir(dir, { recursive: true });
      const bytes = await download(source, path.join(dir, p.name));
      result.files.push({ map: p.map, name: p.name, bytes, url: source.url });
      result.bytes += bytes;
      downloaded += 1;
    } catch (err) {
      if (!(err instanceof FetchFailure)) throw err;
      problems.push(`${p.map}: ${err.message}`);
      if (err.network) {
        result.network = true;
        break;
      }
    }
  }

  if (!opts.dryRun && result.files.length > 0) {
    await writeFile(path.join(dir, 'LICENSE.txt'), `CC0 1.0, Poly Haven, https://polyhaven.com/a/${asset.id}\n`);
  }

  if (problems.length === 0) result.status = opts.dryRun ? 'dry-run' : downloaded ? 'downloaded' : 'cached';
  else result.status = result.files.length ? 'partial' : 'failed';
  result.reason = problems.join('; ');
  return result;
}

function formatBytes(n) {
  if (!n) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function printTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) =>
    cells
      .map((c, i) => String(c).padEnd(widths[i]))
      .join('  ')
      .trimEnd();
  console.log(line(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of rows) console.log(line(row));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return;
  }

  const selected = ASSETS.filter((a) => !opts.only || opts.only.includes(a.id));
  console.log(
    `Poly Haven fetch: ${selected.length} asset(s) at ${opts.res}` +
      `${opts.force ? ', forced' : ''}${opts.dryRun ? ', dry run' : ''} -> ${path.relative(ROOT, RAW_DIR)}/\n`,
  );

  const results = [];
  let networkDown = false;
  for (const asset of selected) {
    if (networkDown) {
      // One connection-level failure is enough: do not wait for a timeout per asset. Cached files still count.
      const planned = plannedFiles(asset, opts);
      const sizes = await Promise.all(
        planned.map((p) => (opts.force || opts.dryRun ? 0 : sizeOf(path.join(RAW_DIR, asset.id, p.name)))),
      );
      const files = planned.map((p, i) => ({ ...p, bytes: sizes[i], cached: true })).filter((f) => f.bytes > 0);
      const complete = files.length === planned.length;
      results.push({
        id: asset.id,
        type: asset.type,
        res: opts.res,
        files,
        bytes: files.reduce((sum, f) => sum + f.bytes, 0),
        status: complete ? 'cached' : 'failed',
        reason: complete ? '' : 'skipped, network unavailable',
        network: !complete,
      });
      continue;
    }
    process.stdout.write(`  ${asset.id} ... `);
    const result = await processAsset(asset, opts);
    console.log(result.status + (result.reason ? ` (${result.reason})` : ''));
    if (opts.dryRun) for (const f of result.files) console.log(`      ${f.map.padEnd(9)} ${f.url}`);
    if (result.network) networkDown = true;
    results.push(result);
  }

  console.log('');
  printTable(
    ['asset', 'files', 'bytes', 'status'],
    results.map((r) => [r.id, r.files.length, formatBytes(r.bytes), r.reason ? `${r.status}: ${r.reason}` : r.status]),
  );

  const ok = results.filter((r) => r.files.length > 0);
  const failed = results.filter((r) => r.status === 'failed' || r.status === 'partial');
  const total = results.reduce((sum, r) => sum + r.bytes, 0);

  // Record what is usable on disk. Never created on a dry run, and never as the only thing in assets-raw/.
  if (!opts.dryRun && ok.length > 0) {
    const manifest = {
      source: 'https://polyhaven.com',
      license: 'CC0 1.0',
      fetchedAt: new Date().toISOString(),
      assets: ok.map((r) => ({
        id: r.id,
        type: r.type,
        resolution: r.res,
        page: `https://polyhaven.com/a/${r.id}`,
        files: r.files.map((f) => ({ map: f.map, file: `${r.id}/${f.name}`, bytes: f.bytes })),
      })),
    };
    await mkdir(RAW_DIR, { recursive: true });
    await writeFile(path.join(RAW_DIR, 'fetched.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  console.log('');
  if (opts.dryRun) {
    console.log(
      `Dry run: ${ok.length} of ${results.length} asset(s) resolved, ${formatBytes(total)}. Nothing was written.`,
    );
  } else {
    console.log(`${ok.length} of ${results.length} asset(s) available locally, ${formatBytes(total)}.`);
  }
  if (networkDown) {
    console.log(
      'Network unavailable: could not reach api.polyhaven.com, so nothing new was downloaded.\n' +
        'That is fine. The app runs fully on its built-in procedural textures and sky.\n' +
        'Run "npm run assets:fetch" again when you are online.',
    );
  } else if (failed.length > 0) {
    console.log(
      `${failed.length} asset(s) could not be fetched completely (see the status column).\n` +
        'The app falls back to its procedural version for anything missing.',
    );
  }
  if (!opts.dryRun && ok.length > 0) console.log('Next: npm run assets:optimize');
}

main().catch((err) => {
  if (err instanceof UsageError) {
    console.error(`fetch-assets: ${err.message}\n\n${USAGE}`);
    process.exit(2);
  }
  console.error(err);
  process.exit(1);
});
