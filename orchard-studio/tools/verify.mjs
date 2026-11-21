// npm run verify: typecheck + lint + unit tests + build + screenshots + interactions + perf. Fails on the first error.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const steps = [
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['lint', 'npm', ['run', 'lint']],
  ['test', 'npm', ['run', 'test']],
  ['build', 'npm', ['run', 'build']],
  ['shots', 'npm', ['run', 'shots']],
  ['e2e', 'npm', ['run', 'e2e']],
  ['perf', 'npm', ['run', 'perf']],
];
const only = process.argv.slice(2);
const results = [];
for (const [name, cmd, args] of steps) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  console.log(`\n━━ verify: ${name} ━━`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  const seconds = Math.round((Date.now() - t0) / 100) / 10;
  results.push({ step: name, ok: r.status === 0, seconds });
  if (r.status !== 0) break;
}
mkdirSync('qa/latest', { recursive: true });
writeFileSync('qa/latest/verify.json', JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
console.log('\n━━ verify summary ━━');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.step.padEnd(10)} ${r.seconds}s`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
