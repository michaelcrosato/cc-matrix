// the one command: node tests/run.mjs   (prints only failures and a one-line count)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
let bad = 0, total = 0; const lines = [];
for (const f of ['events.mjs', 'flow.mjs', 'misc.mjs']) {
  const r = spawnSync(process.execPath, [path.join(here, f)], { encoding: 'utf8', timeout: 600000 });
  const txt = (r.stdout || '') + (r.stderr || '');
  for (const l of txt.split('\n')) { if (l.startsWith('FAIL')) lines.push(f + ': ' + l); const m = /(\d+) of (\d+) \w+ checks FAILED/.exec(l), p = /all (\d+) \w+ (?:event )?checks passed/.exec(l); if (m) { bad += +m[1]; total += +m[2]; } else if (p) total += +p[1]; }
  if (r.status !== 0 && !/FAILED/.test(txt)) { lines.push(f + ': crashed ' + txt.slice(-300)); bad++; }
}
if (lines.length) console.log(lines.join('\n'));
console.log(bad ? `${bad} of ${total} checks FAILED` : `all ${total} checks passed`); process.exit(bad ? 1 : 0);
