// node tests/run.mjs [filter] [--browser] [--hub] [--balance]: every headless suite, in parallel processes; prints only
// failures and one line: "N passed, M failed (T s)". Exit code 1 on any failure.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2), filter = args.find(a => !a.startsWith('--'));
const files = readdirSync(here).filter(f => f.endsWith('.test.mjs') && (!filter || f.includes(filter)));
if (args.includes('--browser')) files.push(...readdirSync(join(here, 'browser')).filter(f => f.endsWith('.mjs')).map(f => 'browser/' + f));
if (args.includes('--hub')) files.push('hub/harness.mjs');
const t0 = Date.now(); let pass = 0, fail = 0, i = 0;
const one = f => new Promise(res => {
  const p = spawn(process.execPath, [join(here, f)], { env: Object.assign({}, process.env, { TMPDIR: join(here, '..', '.tmp') }) }); let buf = '', err = '';
  p.stdout.on('data', d => buf += d); p.stderr.on('data', d => err += d);
  p.on('close', code => {
    let n = 0; for (const line of buf.split('\n')) { if (!line.trim()) continue; let r; try { r = JSON.parse(line); } catch { continue; } n++; if (r.pass) pass++; else { fail++; console.log('FAIL ' + r.suite + ' / ' + r.name + (r.detail ? ': ' + r.detail : '')); } }
    if (code !== 0 && !n) { fail++; console.log('FAIL ' + f + ' crashed: ' + err.slice(-800)); }
    res();
  });
});
const N = Math.min(4, files.length), workers = Array.from({ length: N }, async () => { while (i < files.length) await one(files[i++]); });
await Promise.all(workers);
console.log(pass + ' passed, ' + fail + ' failed (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(fail ? 1 : 0);
