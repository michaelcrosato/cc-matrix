// One command: `node tests/run.mjs` prints only failures and a one-line count.  `--only sim|play|browser|hub|sheets`
import { spawnSync } from 'node:child_process'; import { resolve, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const SUITES = [['build', ['tools/build.mjs']], ['sim', ['tests/sim/sim.mjs']], ['play', ['tests/play/playthrough.mjs']], ['motion', ['tests/play/motion.mjs']], ['browser', ['tests/browser.mjs']], ['hub', ['tests/hub-run.mjs']], ['sheets', ['tests/sheets.mjs']], ['visit', ['tests/visit-test.mjs']]];
let total = 0, bad = 0; const lines = [];
for (const [name, args] of SUITES) {
  if (only && name !== only && name !== 'build') continue; const r = spawnSync('node', args, { cwd: dir, encoding: 'utf8', timeout: 1500000 }); const out = (r.stdout ?? '') + (r.stderr ?? '');
  const m = /(\d+) (?:checks?|scenarios?), (\d+) failures?/.exec(out); if (m) { total += +m[1]; bad += +m[2]; } else if (name !== 'build') { bad++; lines.push(`FAIL ${name}: no summary`); }
  for (const l of out.split('\n')) if (/^FAIL|Error:|ERROR/.test(l)) lines.push(`[${name}] ${l.slice(0, 220)}`); if (r.status && !m && name === 'build') { bad++; lines.push('FAIL build'); }
}
console.log(lines.join('\n')); console.log(`${total} checks, ${bad} failures${only ? ' (' + only + ')' : ''}`); process.exit(bad ? 1 : 0);
