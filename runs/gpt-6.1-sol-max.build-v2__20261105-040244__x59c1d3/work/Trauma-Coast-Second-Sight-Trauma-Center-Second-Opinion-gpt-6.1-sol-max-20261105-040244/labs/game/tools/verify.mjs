/** @file Quiet aggregate verification for the game, using private short socket paths. */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
const fast = process.argv.includes('--fast');
const tmp = mkdtempSync('/tmp/g.');
const chrome = globSync(`${homedir()}/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`)[0];
const env = { ...process.env, TMPDIR: tmp, CHROMIUM_PATH: process.env.CHROMIUM_PATH ?? chrome };
let passed = 0;
const failed = [];
const run = (command, ...args) => spawnSync(command, args, { env, encoding: 'utf8', maxBuffer: 268435456 });
const note = (name, ok, detail = '') => (ok ? passed++ : failed.push(`${name}: ${detail}`));
const tail = (r) => `${r.stdout}${r.stderr}`.trim().split('\n').slice(-5).join(' | ').slice(0, 700);
const step = (name, command, ...args) => {
  const r = run(command, ...args);
  note(name, r.status === 0, tail(r));
};
try {
  step('check', 'npm', 'run', '--silent', 'check');
  const report = 'out/test/report.json';
  rmSync(report, { force: true });
  const r = run('npm', 'test', '--silent');
  if (!existsSync(report)) note('tests', false, tail(r));
  else
    for (const f of JSON.parse(readFileSync(report, 'utf8')).testResults)
      for (const t of f.assertionResults)
        note(
          t.fullName,
          t.status === 'passed',
          String(t.failureMessages?.[0] ?? '')
            .split('\n')[0]
            .slice(0, 300),
        );
  if (!fast) {
    step('bundle', 'npx', 'tsx', 'labs/game/tools/one-file.mts');
    step('replays', 'node', 'x', 'replay', 'labs/game/replays', '--browser', 'sim');
    for (const path of ['labs/game/tools/e2e.mjs', 'labs/game/tools/hub.mjs', 'labs/game/tools/fallback.py'])
      if (existsSync(path)) {
        const b = run(path.endsWith('.py') ? 'python3' : 'node', path);
        const lines = b.stdout.split('\n').filter((l) => l.startsWith('{'));
        for (const line of lines) {
          const t = JSON.parse(line);
          note(t.name, t.ok, t.detail);
        }
        if (b.status !== 0 || lines.length === 0) note(path, false, tail(b));
      }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
for (const f of failed) console.log(`FAIL ${f}`);
console.log(`verify: ${passed} passed, ${failed.length} failed`);
process.exitCode = failed.length ? 1 : 0;
