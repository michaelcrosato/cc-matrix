#!/usr/bin/env node
// One command: prints only failures and a final line "N passed, M failed". --only <name>, --fast skips browsers.
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null, fast = args.includes('--fast');
const node = ['units', 'reach', 'ai', 'setpieces', 'attract', 'coop', 'playthrough'], browser = ['browser', 'hub'];
let pass = 0, fail = 0; const run = (cmd, a, name) => { const r = spawnSync(cmd, a, { encoding: 'utf8', timeout: 900000, cwd: new URL('..', import.meta.url).pathname, maxBuffer: 1 << 26 }); const out = (r.stdout ?? '') + (r.stderr ?? ''); const all = [...out.matchAll(/(\d+) passed, (\d+) failed/g)]; if (all.length) { for (const m of all) { pass += +m[1]; fail += +m[2]; } const L = out.split('\n'); L.forEach((l, i) => { if (/^FAIL/.test(l)) console.log(`${name}: ${l.slice(0, 400)}${L[i + 1]?.startsWith('[') ? ' ' + L.slice(i + 1, i + 7).join(' ').slice(0, 300) : ''}`); }); } else { fail++; console.log(`${name}: crashed: ${out.split('\n').filter((l) => /Error|error/.test(l)).slice(0, 4).join(' | ').slice(0, 600)}`); } };
for (const s of node) if (!only || only === s) run('node', [`tests/node/${s}.mjs`], s);
if (!fast && (!only || only === 'kit')) { const r = spawnSync('node', ['check.mjs', '--keys', 'KeyW*30'], { encoding: 'utf8', timeout: 300000, cwd: new URL('..', import.meta.url).pathname }); if (r.status === 0) pass++; else { fail++; console.log('kit: FAIL check.mjs', (r.stdout ?? '').slice(0, 300)); } }
if (!fast) { if (!only || browser.includes(only)) { if (!only) spawnSync('node', ['tools/build.mjs'], { cwd: new URL('..', import.meta.url).pathname }); for (const s of browser) if (!only || only === s) run('python3', [`tests/browser/${s}.py`], s); } }
if (!fast && (!only || only === 'firefox')) run('bash', ['tests/browser/firefox.sh'], 'firefox');
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
