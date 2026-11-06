// One command: prints only failures and one count line. --fast runs the Node tests only.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(DEV);
const args = process.argv.slice(2);
const fast = args.includes('--fast');
const only = args.filter((a) => !a.startsWith('--'));

function run(file, timeout = 560000) {
  return new Promise((resolve) => {
    const child = spawn('node', [file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { child.kill('SIGTERM'); }, timeout);
    child.on('close', (code) => {
      clearTimeout(timer);
      const m = /@@RESULTS (.*)/.exec(out);
      if (m) resolve(JSON.parse(m[1]));
      else resolve([{ name: file, ok: false, detail: `exit ${code}: ${(err || out).slice(-600)}` }]);
    });
  });
}

const headless = readdirSync('tests/headless').filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => `tests/headless/${f}`);
const browser = readdirSync('tests/browser').filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => `tests/browser/${f}`);
const pick = (list) => (only.length ? list.filter((f) => only.some((o) => f.includes(o))) : list);

const results = [];
// Node tests are cheap: a few at once. Browsers one at a time: the machine is shared.
const queue = pick(headless);
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) { const r = await run(queue.shift()); results.push(...r); }
}));
if (!fast) {
  if (!only.length || pick(browser).length) {
    await new Promise((r) => spawn('node', ['tools/build.mjs'], { stdio: 'inherit' }).on('close', r));
  }
  for (const f of pick(browser)) { const r = await run(f); results.push(...r); }
}
for (const r of results) if (!r.ok) console.log(`FAIL ${r.name}\n     ${r.detail ?? ''}`);
console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
