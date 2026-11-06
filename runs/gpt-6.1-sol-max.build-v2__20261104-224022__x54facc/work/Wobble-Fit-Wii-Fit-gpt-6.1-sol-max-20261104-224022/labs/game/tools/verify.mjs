/** @file One quiet verification entry: objective suites, cross-runtime replays, browser input and the real Hub harness. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const dir = resolve('out/verify');
mkdirSync(dir, { recursive: true });
let passed = 0,
  failed = 0;
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
function run(name, command, args, count) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 600000,
    env: {
      ...process.env,
      PLAYWRIGHT_HOST_PLATFORM_OVERRIDE: 'ubuntu24.04-x64',
      CHROMIUM_PATH:
        process.env.CHROMIUM_PATH ??
        '/home/micha/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  writeFileSync(`${dir}/${name}.log`, output);
  if (result.status !== 0) {
    failed++;
    console.log(`FAIL ${name}\n${output.trim()}`);
    return false;
  }
  passed += typeof count === 'function' ? count() : count;
  return true;
}
run('static', 'npm', ['run', 'check'], 4);
run('simulation-audio', 'npm', ['test', '--', '--maxWorkers=1'], () => json('out/test/report.json').numPassedTests);
run('cross-runtime', 'node', ['x', 'replay', 'labs/game/replays', '--browser', 'sim', '--runs', '2'], 14);
run('metadata', 'node', ['--import', 'tsx', 'labs/game/tools/export-report.ts'], 1);
try {
  const file = '../Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html',
    html = readFileSync(file, 'utf8');
  const client = readFileSync('labs/game/hub/session-client.txt', 'utf8');
  const hash = createHash('sha256').update(client.trimEnd()).digest('hex');
  if (hash !== '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a' || !html.includes(client))
    throw Error('The Hub client differs from its unmodified source.');
  if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html))
    throw Error('The build has an external script or style.');
  if (/data:audio\//.test(html)) throw Error('The build contains an audio recording.');
  const report = json('../exit-interview.json');
  if (report.sourceInformation.usage !== 'added on import' || report.aiHub.name !== 'Wobble Fit')
    throw Error('Exit interview fields do not match the game.');
  passed += 4;
} catch (error) {
  failed++;
  console.log(`FAIL package: ${error.message}`);
}
if (!process.argv.includes('--quick')) {
  run(
    'browser',
    'python3',
    ['-u', 'labs/game/tools/browser-check.py'],
    () => json('out/game/browser-report.json').passed,
  );
  run('hub', 'python3', ['-u', 'labs/game/tools/hub-check.py'], () => json('out/game/hub-report.json').passed);
  if (existsSync('labs/game/tools/viewport-check.py'))
    run(
      'viewport',
      'python3',
      ['-u', 'labs/game/tools/viewport-check.py'],
      () => json('out/game/viewport-report.json').passed,
    );
}
writeFileSync(`${dir}/report.json`, JSON.stringify({ passed, failed }, null, 2) + '\n');
console.log(`${passed} checks passed; ${failed} failed`);
process.exit(failed ? 1 : 0);
