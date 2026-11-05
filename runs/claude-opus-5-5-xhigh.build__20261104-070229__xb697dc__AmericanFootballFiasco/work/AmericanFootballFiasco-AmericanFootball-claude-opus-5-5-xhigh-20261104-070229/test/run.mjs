// The one command: node test/run.mjs [suite ...] [--browser] [--seed n]. Prints only failures ("FAIL suite › test:
// detail") and one final line "N passed, M failed (12.3 s)". Exit code 1 on any failure.
import { readdirSync } from 'node:fs';
const args = process.argv.slice(2), browser = args.includes('--browser'), want = args.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
const seedArg = args.indexOf('--seed'); globalThis.TEST_SEED = seedArg >= 0 ? +args[seedArg + 1] : 1;
const dir = new URL('./suites/', import.meta.url);
let files = readdirSync(dir).filter(f => f.endsWith('.mjs')).sort();
files = files.filter(f => want.length ? want.includes(f.replace(/^\d+-/, '').replace('.mjs', '')) : true);
let pass = 0, fail = 0; const t0 = Date.now();
for (const f of files) {
  const name = f.replace(/^\d+-/, '').replace('.mjs', '');
  const ok = (what, cond, detail = '') => { if (cond) pass++; else { fail++; console.log('FAIL ' + name + ' › ' + what + (detail ? ': ' + String(detail).slice(0, 400) : '')); } return !!cond; };
  try { const mod = await import(new URL(f, dir)); await mod.default(ok); }
  catch (e) { fail++; console.log('FAIL ' + name + ' › threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e)); }
}
// --browser: the bundle in Chromium (features.mjs) and the AI Hub harness (hub.mjs); each prints its failures and a count
if (browser) {
  const { spawnSync } = await import('node:child_process');
  for (const [name, f] of [['browser', 'features.mjs'], ['hub', 'hub.mjs']]) {
    const r = spawnSync(process.execPath, [new URL('./browser/' + f, import.meta.url).pathname], { encoding: 'utf8', timeout: 900000 });
    const out = (r.stdout || '') + (r.stderr || ''), fails = out.split('\n').filter(l => /^FAIL/.test(l)), m = out.match(/(\d+) passed, (\d+) failed/);
    for (const l of fails) console.log('FAIL ' + name + ' › ' + l.replace(/^FAIL:? ?/, ''));
    if (m) { pass += +m[1]; fail += +m[2]; } else { const p = (out.match(/^PASS/gm) || []).length; pass += p; if (r.status !== 0 && !fails.length) { fail++; console.log('FAIL ' + name + ' › exit ' + r.status + ': ' + out.trim().split('\n').slice(-3).join(' / ')); } else fail += fails.length; }
  }
}
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
