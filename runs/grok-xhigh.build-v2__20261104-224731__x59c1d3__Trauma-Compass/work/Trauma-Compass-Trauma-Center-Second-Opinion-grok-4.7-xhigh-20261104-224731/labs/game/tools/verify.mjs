/**
 * @file The one command, `npm run verify`: runs every check quietly and prints only the failures, then one line with
 * the count. `--fast` skips what needs a browser. It sets its own short TMPDIR and CHROMIUM_PATH, so it needs no setup,
 * and removes the temporary folder when done. Exit 0 when nothing failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';

const fast = process.argv.includes('--fast');
const tmp = mkdtempSync('/tmp/g.');
const chrome = globSync(`${homedir()}/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`)[0];
const env = { ...process.env, TMPDIR: tmp, CHROMIUM_PATH: process.env.CHROMIUM_PATH ?? chrome };
const run = (command, ...args) => spawnSync(command, args, { env, encoding: 'utf8', maxBuffer: 2 ** 28 });

let passed = 0;
const failed = [];
const note = (name, ok, detail = '') => (ok ? (passed += 1) : failed.push(`${name}${detail ? `: ${detail}` : ''}`));
const tail = (result) => `${result.stdout}${result.stderr}`.trim().split('\n').slice(-6).join(' | ').slice(0, 600);

/** A step whose exit status is its verdict. */
const step = (name, command, ...args) => {
  const result = run(command, ...args);
  note(name, result.status === 0, tail(result));
};

/** Vitest, counted test by test from the JSON report npm test writes. */
function tests() {
  const report = 'out/test/report.json';
  rmSync(report, { force: true });
  const result = run('npm', 'test', '--silent');
  if (!existsSync(report)) return note('npm test', false, tail(result));
  for (const file of JSON.parse(readFileSync(report, 'utf8')).testResults) {
    for (const test of file.assertionResults) {
      note(
        test.fullName,
        test.status === 'passed',
        String(test.failureMessages?.[0] ?? '')
          .split('\n')[0]
          .slice(0, 300),
      );
    }
  }
}

/** A browser tool: it prints one JSON line per check, { name, ok, detail }. Add e2e and hub runs here. */
function browserTool(path) {
  const result = run('node', path);
  const lines = result.stdout.split('\n').filter((line) => line.startsWith('{'));
  for (const line of lines) {
    const { name, ok, detail } = JSON.parse(line);
    note(name, ok, detail);
  }
  if (result.status !== 0 || lines.length === 0) note(path, false, tail(result));
}

step('npm run check', 'npm', 'run', '--silent', 'check');
tests();
if (!fast) {
  step('replays in Chromium', 'node', 'x', 'replay', 'labs/game/replays', '--browser', 'sim');
  for (const path of ['labs/game/tools/e2e.mjs', 'labs/game/tools/hub.mjs']) if (existsSync(path)) browserTool(path);
}
rmSync(tmp, { recursive: true, force: true });
for (const failure of failed) console.log(`FAIL ${failure}`);
console.log(`verify: ${passed} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
