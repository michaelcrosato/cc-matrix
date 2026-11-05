// One command: builds, runs every suite, prints only failures and a one-line count.  node tests/run.mjs [--browser]
import { spawnSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), tmp = path.join(root, 'tmp'); fs.mkdirSync(tmp, { recursive: true });
const env = Object.assign({}, process.env, { TMPDIR: tmp });
const sh = (args, o = {}) => spawnSync('node', args, { cwd: root, env, encoding: 'utf8', timeout: o.timeout || 300000 });
let checks = 0, failed = 0; const fails = [];
const b = sh(['tools/build.mjs']); if (b.status !== 0) { console.log('BUILD FAILED\n' + (b.stdout + b.stderr).trim()); process.exit(1); }
const suites = [['tests/node/sim.test.mjs'], ['tests/node/systems.test.mjs'], ['tests/node/playthrough.test.mjs'], ['tools/validate-content.mjs']];
if (process.argv.includes('--browser')) suites.push(['tests/browser/smoke-check.mjs'], ['tests/browser/full.mjs'], ['tests/browser/hub.mjs', '2'], ['tests/browser/hub.mjs', '4', '&latency=150&jitter=50&loss=5'], ['tests/browser/hub.mjs', '4', '&latency=150&jitter=50&loss=5&scenario=host-leave']);
for (const s of suites) {
  const r = sh(s, { timeout: 420000 }), out = (r.stdout || '') + (r.stderr || '');
  const lines = out.split('\n'); let counted = false;
  for (const l of lines) { if (/^FAIL /.test(l)) fails.push(`[${path.basename(s[0])}] ${l}`); const m = /all (\d+) checks passed/.exec(l) || /(\d+) of (\d+) checks failed/.exec(l); if (m) { counted = true; if (m.length === 2) checks += +m[1]; else { failed += +m[1]; checks += +m[2]; } } else if (/\bPASS \((\d+) checks\)/.test(l)) { checks += +/PASS \((\d+) checks\)/.exec(l)[1]; counted = true; } else if (/: FAIL \(/.test(l)) { failed++; counted = true; } }
  if (!counted) { if (r.status === 0 && /content ok/.test(out)) { checks++; } else { failed++; checks++; fails.push(`[${s.join(' ')}] ${out.trim().split('\n').slice(-3).join(' | ')}`); } }
  else if (r.status && !/FAIL/.test(out)) { failed++; fails.push(`[${s[0]}] exited ${r.status}`); }
}
for (const f of fails) console.log(f);
console.log(failed ? `${failed} of ${checks} checks failed` : `all ${checks} checks passed`);
process.exit(failed ? 1 : 0);
