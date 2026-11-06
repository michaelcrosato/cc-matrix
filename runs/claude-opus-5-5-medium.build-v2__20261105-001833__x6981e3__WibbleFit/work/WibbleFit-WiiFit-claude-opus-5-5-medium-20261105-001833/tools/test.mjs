// One command. Prints only failures and one count line. --fast: Node tests only.
import { spawnSync } from 'node:child_process';
const fast = process.argv.includes('--fast'); const root = new URL('..', import.meta.url).pathname;
const run = [['tests/headless/core.mjs'], ['tests/headless/activities.mjs'], ['tests/headless/flow.mjs']];
if (!fast) { spawnSync('node', ['tools/build.mjs'], { cwd: root, stdio: 'ignore' }); run.push(['tests/browser/browser.mjs'], ['tests/browser/hub.mjs']); }
let ok = 0, all = 0, failed = false;
for (const [f] of run) {
  const r = spawnSync('node', [f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  const lines = (r.stdout + r.stderr).split('\n').filter(Boolean), m = lines.map((l) => l.match(/^(\d+)\/(\d+) passed$/)).filter(Boolean).pop();
  for (const l of lines) if (l.startsWith('FAIL')) console.log(l.slice(0, 400));
  if (m) { ok += +m[1]; all += +m[2]; if (m[1] !== m[2]) failed = true; } else { failed = true; console.log(`FAIL ${f} crashed: ${lines.slice(-3).join(' ').slice(0, 400)}`); }
}
console.log(`${ok}/${all} passed`); process.exit(failed ? 1 : 0);
