// node tools/test.mjs [--sim] [--headless] [--browser] [--hub]: prints only failures and one count line.
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2); const filter = args.filter((a) => a.startsWith('--')).map((a) => a.slice(2)); const only = args.find((a) => !a.startsWith('--'));
const tiers = filter.length ? filter : ['sim', 'headless', 'browser', 'hub'];
let pass = 0; let fail = 0; const lines = [];
for (const tier of tiers) {
  const dir = join(dev, 'tests', tier); if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.test.mjs') && (!only || n.includes(only))).sort()) {
    const r = spawnSync('node', [join(dir, f)], { cwd: dev, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 3000000 });
    const out = (r.stdout ?? '') + (r.stderr ?? '');
    const m = /RESULT (\d+) (\d+)/.exec(out);
    pass += m ? Number(m[1]) : 0; const fl = m ? Number(m[2]) : 1; fail += fl;
    if (fl || r.status !== 0) { lines.push(`--- ${tier}/${f} (exit ${r.status})`); lines.push(out.split('\n').filter((l) => !l.startsWith('RESULT')).slice(-30).join('\n').slice(0, 4000)); if (!fl) fail++; }
  }
}
if (lines.length) console.log(lines.join('\n'));
console.log(`${fail ? 'FAIL' : 'OK'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
