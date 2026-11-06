/** @file tests/game/verify.mjs: the one command, node tests/game/verify.mjs [sim|page|hub|final], which prints only failures and a one-line count. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, globSync, rmSync, writeFileSync } from 'node:fs';

process.env.CHROMIUM_PATH ??= globSync(
  '/home/micha/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell',
)[0];
const asked = process.argv[2];
let [passed, failed] = [0, 0];
const say = (line) => {
  failed += 1;
  console.log(line);
};
const tier = (file) => {
  if (!existsSync(file)) return say(`FAIL ${file} is missing`);
  const run = spawnSync('node', [file], { encoding: 'utf8', maxBuffer: 1e8 });
  const lines = `${run.stdout}${run.stderr}`
    .split('\n')
    .filter((line) => line.startsWith('FAIL') || line.startsWith('COUNT'));
  for (const line of lines) {
    if (line.startsWith('FAIL')) console.log(line);
    else [passed, failed] = [passed + Number(line.split(' ')[1]), failed + Number(line.split(' ')[2])];
  }
  if (!lines.some((line) => line.startsWith('COUNT')))
    say(`FAIL ${file} ended early: ${`${run.stdout}${run.stderr}`.slice(-400)}`);
};
const tiers = {
  sim() {
    mkdirSync('out/test', { recursive: true });
    rmSync('out/test/verify.json', { force: true });
    const run = spawnSync(
      'npx',
      [
        'vitest',
        'run',
        '--reporter=json',
        '--reporter=./tests/game/progress.mjs',
        '--outputFile=out/test/verify.json',
        ...(process.env.VERIFY_FILTER ? ['--testNamePattern', process.env.VERIFY_FILTER] : []),
      ],
      {
        encoding: 'utf8',
        maxBuffer: 1e8,
      },
    );
    if (!existsSync('out/test/verify.json')) {
      say(`FAIL simulation runner ended before writing results: ${String(run.stderr).slice(-300)}`);
      return;
    }
    for (const file of JSON.parse(readFileSync('out/test/verify.json', 'utf8')).testResults) {
      if (!file.assertionResults.length && file.status === 'failed')
        say(`FAIL ${file.name}: ${String(file.message).split('\n')[0]}`);
      for (const test of file.assertionResults) {
        if (test.status === 'passed') passed += 1;
        else if (test.status === 'failed')
          say(`FAIL ${test.fullName}: ${String(test.failureMessages?.[0]).split('\n')[0]}`);
      }
    }
  },
  page: () => tier('tests/game/page.mjs'),
  hub: () => {
    tier('tests/game/hub.mjs');
    tier('tests/game/standalone.mjs');
  },
  final: () => tier('tests/game/final.mjs'),
};
if (asked === 'protocol') tier('tests/game/hub.mjs');
else if (asked === 'net') tier('tests/game/standalone.mjs');
else for (const [name, run] of Object.entries(tiers)) if (!asked || asked === name) run();
writeFileSync(`out/test/summary-${asked ?? 'all'}.json`, JSON.stringify({ passed, failed, tier: asked ?? 'all' }));
console.log(`verify: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
