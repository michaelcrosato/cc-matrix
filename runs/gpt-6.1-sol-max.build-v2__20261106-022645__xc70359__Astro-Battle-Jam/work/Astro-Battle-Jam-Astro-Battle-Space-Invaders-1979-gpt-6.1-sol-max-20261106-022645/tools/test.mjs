import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selected = process.argv.slice(2);
const suites = [
  ['simulation', 'node', ['tests/sim.mjs']],
  ['engine', 'node', ['tests/engine.mjs']],
  ['session', 'node', ['tests/session.mjs']],
  ['browser', '/home/micha/.local/share/pipx/venvs/playwright/bin/python', ['tests/browser.py']],
  ['hub', '/home/micha/.local/share/pipx/venvs/playwright/bin/python', ['tests/hub.py']]
];
let checks = 0, failed = 0; const results = [];
for (const [name, cmd, args] of suites) {
  if (selected.length && !selected.includes(name)) continue;
  const p = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 4e6 });
  if (p.error) { console.error('FAIL ' + name + ': ' + p.error.message); failed++; continue; }
  const lines = p.stdout.trim().split('\n'); let result;
  try { result = JSON.parse(lines.at(-1)); } catch {}
  if (result?.count !== undefined) { checks += result.count; failed += result.failed; results.push(result); }
  else { failed++; console.error('FAIL ' + name + ': no suite result'); }
  if (p.status !== 0) { if (!result?.failed) failed++; if (p.stderr.trim()) console.error(p.stderr.trim()); if (!result) console.error(p.stdout.slice(-5000)); }
}
if (!selected.length) {
  const artifact = path.join(path.dirname(cwd), path.basename(cwd) + '.html');
  const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  writeFileSync(path.join(cwd, 'evidence/verification.json'), JSON.stringify({ command: 'node tools/test.mjs', checks, failures: failed, suites: results, artifact: path.basename(artifact), artifactSHA256: hash(artifact), interviewSHA256: hash(path.join(path.dirname(cwd), 'exit-interview.json')), engineSHA256: hash(path.join(cwd, 'vendor/engine/my-3d2dge.js')), hubSHA256: hash(path.join(cwd, 'vendor/hub/session.js')), checkedAt: new Date().toISOString() }, null, 2) + '\n');
}
console.log(`${checks} checks, ${failed} failures`);
process.exitCode = failed ? 1 : 0;
