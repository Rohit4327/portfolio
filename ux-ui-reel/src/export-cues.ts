// node --import tsx src/export-cues.ts  -> audio/out/visual_cues.json  (absolute seconds, one entry per beat)
import fs from 'node:fs';
import { BEATS } from './timeline';
import { beats } from './beats';
const out = BEATS.map((b) => ({ id: b.id, start: b.start, end: b.end, cues: beats[b.id].cues || {} }));
fs.mkdirSync('audio/out', { recursive: true }); fs.writeFileSync('audio/out/visual_cues.json', JSON.stringify(out, null, 1));
for (const o of out) console.log(`${o.id.padEnd(8)} ${o.start.toFixed(2)}-${o.end.toFixed(2)}  cues: ${Object.keys(o.cues).length}`);
