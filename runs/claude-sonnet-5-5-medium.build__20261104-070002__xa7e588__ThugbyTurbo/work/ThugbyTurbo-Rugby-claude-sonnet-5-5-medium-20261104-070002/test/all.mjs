// node test/all.mjs — runs every suite; prints only failures and one count line
import { spawnSync } from 'node:child_process';
let total = 0, bad = 0; const out = [];
for (const f of ['run.mjs', 'browser.mjs', 'playthrough.mjs', 'mouse.mjs', 'dev.mjs', 'pad.mjs', 'hub.mjs']) { const r = spawnSync('node', ['test/' + f], { encoding: 'utf8', cwd: new URL('../', import.meta.url).pathname, timeout: 900000 }); const t = (r.stdout + r.stderr).trim(); const m = t.match(/(\d+) (?:FAILED|checks|browser|playthrough|hub)/); if (r.status !== 0) { bad++; out.push(f + ':\n' + t.split('\n').slice(-8).join('\n')); } total += +(t.match(/all (\d+)/) || [0, 0])[1]; }
console.log(bad ? out.join('\n') + '\nFAILED suites: ' + bad : 'all ' + total + ' checks passed across 7 suites'); process.exit(bad ? 1 : 0);
