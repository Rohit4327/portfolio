#!/usr/bin/env node
/**
 * optimize-assets.mjs: turn everything in assets-raw/ into web-ready files in public/.
 *
 *   npm run assets:optimize
 *   npm run assets:optimize -- --max=4096     # keep 4k sources at 4k (default cap is 2048)
 *   npm run assets:optimize -- --webp         # force the WebP path even if toktx is installed
 *   npm run assets:optimize -- --normal-mode  # toktx --normal_mode for normals (needs a custom shader, see README)
 *
 *   assets-raw/<id>/*.hdr                 -> public/hdri/<file>.hdr           (copied unchanged)
 *   assets-raw/<id>/*.{jpg,jpeg,png}      -> public/textures/<id>_<map>.ktx2  (toktx on PATH)
 *                                         -> public/textures/<id>_<map>.webp  (otherwise, via sharp)
 *   assets-raw/models/*.{glb,gltf}        -> public/models/<name>.glb         (gltf-transform optimize)
 *   public/textures/index.json               lists everything that was produced
 *
 * A file that fails to convert is reported and skipped. The script exits non-zero only on bugs
 * or bad arguments.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'assets-raw');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT = {
  hdri: path.join(PUBLIC_DIR, 'hdri'),
  textures: path.join(PUBLIC_DIR, 'textures'),
  models: path.join(PUBLIC_DIR, 'models'),
};

const BUDGET_BYTES = 60 * 1024 * 1024; // first-load budget
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);
const MODEL_EXT = new Set(['.glb', '.gltf']);
const WEBP_QUALITY = { color: 82, normal: 90, roughness: 90, ao: 90 };

/**
 * File-name tokens -> normalised map name. Covers Poly Haven (oak_veneer_01_nor_gl_2k.jpg) and
 * ambientCG (Wood049_2K-JPG_NormalGL.jpg). Order matters: the DirectX normal must be caught
 * before the generic "nor"/"normal" tokens. `null` means "recognised, deliberately not shipped".
 */
const MAP_PATTERNS = [
  [/(^|[_\-.])(nor_?dx|normal_?dx)([_\-.]|$)/, null],
  [/(^|[_\-.])(disp|displacement|height|bump|arm|metal|metalness|metallic|spec|specular)([_\-.]|$)/, null],
  [/(^|[_\-.])(nor_?gl|normal_?gl|normal|nor|nrm)([_\-.]|$)/, 'normal'],
  [/(^|[_\-.])(rough|roughness)([_\-.]|$)/, 'roughness'],
  [/(^|[_\-.])(ao|ambient_?occlusion)([_\-.]|$)/, 'ao'],
  [/(^|[_\-.])(diff|diffuse|col|color|colour|albedo|base_?color)([_\-.]|$)/, 'color'],
];

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { max: 2048, webp: false, normalMode: false, help: false };
  for (const arg of argv) {
    if (arg === '--webp') opts.webp = true;
    else if (arg === '--normal-mode') opts.normalMode = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--max=')) opts.max = Number(arg.slice(6));
    else throw new UsageError(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(opts.max) || opts.max < 64 || opts.max > 8192) {
    throw new UsageError('--max must be a whole number of pixels between 64 and 8192');
  }
  return opts;
}

const USAGE = `Usage: node tools/optimize-assets.mjs [--max=<px>] [--webp] [--normal-mode]

  --max          longest texture edge in pixels (default 2048, never enlarges)
  --webp         write WebP even when toktx is installed
  --normal-mode  pass --normal_mode to toktx (two-channel normals: needs a shader that rebuilds Z)`;

/** Absolute path of a command on PATH, or null. */
function which(cmd) {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  if (res.status !== 0 || !res.stdout) return null;
  return res.stdout.split(/\r?\n/)[0].trim() || null;
}

/** Runs a command without a shell. Returns { ok, message }. Never throws. */
function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
  if (res.error) return { ok: false, message: res.error.message };
  if (res.status !== 0) {
    const text = `${res.stderr ?? ''}\n${res.stdout ?? ''}`.trim().split(/\r?\n/).filter(Boolean);
    return { ok: false, message: text.slice(-2).join(' | ') || `exit code ${res.status}` };
  }
  return { ok: true, message: '' };
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}

function detectMap(fileName) {
  const base = path.basename(fileName, path.extname(fileName)).toLowerCase();
  for (const [pattern, map] of MAP_PATTERNS) if (pattern.test(base)) return map;
  return undefined;
}

/** "oak_veneer_01_diff_4k.jpg" and "Wood049_2K-JPG_Color.jpg" -> 4 and 2. Unknown -> 0. */
function resolutionOf(fileName) {
  const match = /(?:^|[_\-.])(\d+)k(?:[_\-.]|$)/i.exec(path.basename(fileName));
  return match ? Number(match[1]) : 0;
}

const safeName = (s) => s.replace(/[^A-Za-z0-9_-]+/g, '_');
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const relPublic = (file) => path.relative(PUBLIC_DIR, file).split(path.sep).join('/');

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

/** sharp is a devDependency; load it lazily so a missing install is a clear message, not a crash at import. */
let sharpModule;
async function loadSharp() {
  if (sharpModule === undefined) {
    try {
      sharpModule = (await import('sharp')).default;
    } catch {
      sharpModule = null;
    }
  }
  return sharpModule;
}

async function toWebp(job, opts) {
  const sharp = await loadSharp();
  if (!sharp) throw new Error('sharp is not installed (run npm install)');
  const out = path.join(OUT.textures, `${job.id}_${job.map}.webp`);
  await sharp(job.source)
    .rotate() // honour EXIF orientation, then drop the metadata
    .resize({ width: opts.max, height: opts.max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY[job.map], effort: 5, smartSubsample: job.map === 'color' })
    .toFile(out);
  return { file: out, format: 'webp' };
}

async function toKtx2(job, opts, toktx, tmpDir) {
  const out = path.join(OUT.textures, `${job.id}_${job.map}.ktx2`);
  let input = job.source;

  // toktx reads JPEG and PNG directly. Only go through sharp when the source is larger than the cap.
  const sharp = await loadSharp();
  if (sharp) {
    const meta = await sharp(job.source).metadata();
    if (Math.max(meta.width ?? 0, meta.height ?? 0) > opts.max) {
      input = path.join(tmpDir, `${job.id}_${job.map}.png`);
      await sharp(job.source).resize({ width: opts.max, height: opts.max, fit: 'inside' }).png().toFile(input);
    }
  }

  const args = ['--t2', '--genmipmap'];
  if (job.map === 'normal') {
    // UASTC keeps normals clean; RDO + zstd bring the file size back down.
    args.push('--encode', 'uastc', '--uastc_quality', '2', '--uastc_rdo_l', '1', '--zcmp', '18');
    args.push('--assign_oetf', 'linear');
    if (opts.normalMode) args.push('--normal_mode');
  } else if (job.map === 'color') {
    args.push('--encode', 'etc1s', '--clevel', '4', '--qlevel', '255', '--assign_oetf', 'srgb');
  } else {
    args.push('--encode', 'etc1s', '--clevel', '4', '--qlevel', '255', '--assign_oetf', 'linear');
  }
  args.push(out, input);

  const res = run(toktx, args);
  if (!res.ok) {
    await rm(out, { force: true });
    throw new Error(`toktx: ${res.message}`);
  }
  return { file: out, format: 'ktx2' };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return;
  }

  if (!existsSync(RAW_DIR)) {
    console.log('nothing to optimise: run npm run assets:fetch first');
    return;
  }

  const tools = { toktx: which('toktx'), ffmpeg: which('ffmpeg'), blender: which('blender') };
  console.log('Tools:');
  console.log(`  toktx    ${tools.toktx ?? 'not found (textures are written as WebP)'}`);
  console.log(`  ffmpeg   ${tools.ffmpeg ?? 'not found (not needed by the app)'}`);
  console.log(`  blender  ${tools.blender ?? 'not found (only needed for tools/bake_lightmaps.py)'}`);
  console.log('');

  const useKtx = Boolean(tools.toktx) && !opts.webp;
  const modelsDir = path.join(RAW_DIR, 'models');
  const files = await walk(RAW_DIR);

  const hdris = [];
  const models = [];
  const textureJobs = new Map(); // "<id>/<map>" -> job, keeping the highest-resolution source
  const notes = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const inModels = file.startsWith(modelsDir + path.sep);
    if (inModels) {
      if (MODEL_EXT.has(ext)) models.push(file);
      continue; // textures and .bin next to a .gltf belong to the model
    }
    if (ext === '.hdr') {
      hdris.push(file);
      continue;
    }
    if (!IMAGE_EXT.has(ext)) continue;
    const dir = path.dirname(file);
    if (dir === RAW_DIR) {
      notes.push(`skipped ${rel(file)}: put textures in assets-raw/<name>/`);
      continue;
    }
    const map = detectMap(file);
    if (map === undefined) {
      notes.push(`skipped ${rel(file)}: cannot tell which map this is from the file name`);
      continue;
    }
    if (map === null) continue; // displacement, DirectX normal, arm: not used by the app
    const id = safeName(path.basename(dir));
    const key = `${id}/${map}`;
    const job = { id, map, source: file, res: resolutionOf(file) };
    const existing = textureJobs.get(key);
    if (!existing || job.res > existing.res) textureJobs.set(key, job);
  }

  if (hdris.length + models.length + textureJobs.size === 0) {
    console.log(
      'nothing to optimise: assets-raw/ has no .hdr, texture or model files. Run npm run assets:fetch first.',
    );
    return;
  }

  const produced = []; // { file, type, id, map, source, format, bytes }
  const failures = [];
  const record = async (entry) => produced.push({ ...entry, bytes: (await stat(entry.file)).size });

  // HDRIs: three's RGBELoader reads Radiance .hdr directly, so copy unchanged.
  if (hdris.length) await mkdir(OUT.hdri, { recursive: true });
  for (const source of hdris) {
    const out = path.join(OUT.hdri, path.basename(source));
    try {
      await copyFile(source, out);
      await record({ file: out, type: 'hdri', id: path.basename(source, '.hdr'), source, format: 'hdr' });
    } catch (err) {
      failures.push(`${rel(source)}: ${err.message}`);
    }
  }

  // Textures.
  if (textureJobs.size) {
    await mkdir(OUT.textures, { recursive: true });
    if (!useKtx) {
      console.log(
        tools.toktx
          ? '--webp given: writing WebP instead of KTX2\n'
          : 'toktx not found: wrote WebP fallback (install KTX-Software for KTX2, see tools/README.md)\n',
      );
    }
    const tmpDir = useKtx ? await mkdtemp(path.join(os.tmpdir(), 'orchard-ktx-')) : null;
    try {
      for (const job of textureJobs.values()) {
        try {
          const result = useKtx ? await toKtx2(job, opts, tools.toktx, tmpDir) : await toWebp(job, opts);
          // Remove the same map in the other format so the app never sees a stale twin.
          const other = path.join(OUT.textures, `${job.id}_${job.map}.${result.format === 'ktx2' ? 'webp' : 'ktx2'}`);
          await rm(other, { force: true });
          await record({ ...result, type: 'texture', id: job.id, map: job.map, source: job.source });
        } catch (err) {
          failures.push(`${rel(job.source)}: ${err.message}`);
        }
      }
    } finally {
      if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
    }
  }

  // Models: Meshopt geometry, WebP textures. Uses the project's own gltf-transform.
  if (models.length) {
    await mkdir(OUT.models, { recursive: true });
    const localBin = path.join(
      ROOT,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'gltf-transform.cmd' : 'gltf-transform',
    );
    const [cmd, prefix] = existsSync(localBin) ? [localBin, []] : ['npx', ['gltf-transform']];
    for (const source of models) {
      const name = safeName(path.basename(source, path.extname(source)));
      const out = path.join(OUT.models, `${name}.glb`);
      const res = run(cmd, [...prefix, 'optimize', source, out, '--compress', 'meshopt', '--texture-compress', 'webp']);
      if (res.ok && existsSync(out)) {
        await record({ file: out, type: 'model', id: name, source, format: 'glb' });
      } else {
        failures.push(`${rel(source)}: gltf-transform: ${res.message || 'no output written'}`);
      }
    }
  }

  // Manifest. Paths are relative to public/, which is the web root.
  await mkdir(OUT.textures, { recursive: true });
  const total = produced.reduce((sum, p) => sum + p.bytes, 0);
  const index = {
    generatedAt: new Date().toISOString(),
    textureFormat: useKtx ? 'ktx2' : 'webp',
    totalBytes: total,
    files: produced.map((p) => ({
      file: relPublic(p.file),
      type: p.type,
      id: p.id,
      ...(p.map ? { map: p.map } : {}),
      source: rel(p.source),
      format: p.format,
      bytes: p.bytes,
    })),
  };
  await writeFile(path.join(OUT.textures, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

  // Summary.
  if (produced.length) {
    printTable(
      ['output', 'format', 'bytes', 'source'],
      produced.map((p) => [rel(p.file), p.format, formatBytes(p.bytes), rel(p.source)]),
    );
    console.log('');
  }
  for (const note of notes) console.log(`note: ${note}`);
  for (const failure of failures) console.log(`failed: ${failure}`);
  console.log(
    `${produced.length} file(s) written, ${formatBytes(total)} total` +
      `${failures.length ? `, ${failures.length} failed` : ''}. Manifest: ${rel(path.join(OUT.textures, 'index.json'))}`,
  );
  if (total > BUDGET_BYTES) {
    console.log(
      `WARNING: ${formatBytes(total)} is over the ${formatBytes(BUDGET_BYTES)} first-load budget. ` +
        'Fetch fewer assets, use --res=1k for the HDRIs, or lower --max.',
    );
  }
}

main().catch((err) => {
  if (err instanceof UsageError) {
    console.error(`optimize-assets: ${err.message}\n\n${USAGE}`);
    process.exit(2);
  }
  console.error(err);
  process.exit(1);
});
