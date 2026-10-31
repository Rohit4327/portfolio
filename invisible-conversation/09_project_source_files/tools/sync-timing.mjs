// Copies audio/out/narration_timing.json -> lib/timing.json (served to the render page).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'audio/out/narration_timing.json'), dst = path.join(root, 'lib/timing.json');
if (!fs.existsSync(src)) { console.error('missing', src); process.exit(1); }
fs.copyFileSync(src, dst); const t = JSON.parse(fs.readFileSync(dst, 'utf8'));
for (const c of t.chapters) console.log(`ch${String(c.id).padStart(2,'0')} ${c.start.toFixed(2).padStart(7)} - ${c.end.toFixed(2).padStart(7)}  ${c.title}`);
