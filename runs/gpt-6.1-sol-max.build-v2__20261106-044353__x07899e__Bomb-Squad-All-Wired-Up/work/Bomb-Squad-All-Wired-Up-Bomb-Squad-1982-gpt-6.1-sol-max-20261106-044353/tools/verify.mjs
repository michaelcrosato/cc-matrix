/* Quiet unified verifier. Focused groups only rerun code they cover. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runModels } from '../tests/model.mjs';
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const runtime = path.join(root, '.cache', 'runtime');
fs.mkdirSync(runtime, { recursive: true });
process.env.TMPDIR = runtime;
const args = process.argv.slice(2),
  groups = new Set(
    args.length
      ? args
      : [
          'sim',
          'engine',
          'browser',
          'campaign',
          'controller',
          'touch',
          'audio',
          'peer',
          'hub',
          'authoring',
          'recovery',
          'package',
        ],
  );
let count = 0;
const failures = [];
if (groups.has('sim') || groups.has('engine')) {
  const r = runModels(groups);
  count += r.passed;
  failures.push(...r.failures);
}
const browsers = [...groups].filter((g) =>
  [
    'browser',
    'campaign',
    'controller',
    'touch',
    'audio',
    'peer',
    'hub',
    'hubplay',
    'authoring',
    'recovery',
    'package',
  ].includes(g),
);
if (browsers.length) {
  const build = spawnSync(process.execPath, ['tools/build.mjs', '--quiet'], { encoding: 'utf8' });
  if (build.status !== 0) failures.push({ name: 'bundle', error: build.stderr || build.stdout });
  else {
    const result = spawnSync(
      '/home/micha/.local/share/pipx/venvs/playwright/bin/python',
      ['tests/browser.py', ...browsers],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
    try {
      const r = JSON.parse(result.stdout);
      count += r.passed;
      failures.push(...r.failures);
    } catch {
      failures.push({ name: 'browser runner', error: result.stderr + '\n' + result.stdout });
    }
  }
}
const result = {
  at: new Date().toISOString(),
  groups: [...groups],
  passed: count,
  failed: failures.length,
  failures,
};
fs.writeFileSync(
  'evidence/verify-' + (args.length ? args.join('-') : 'all') + '.json',
  JSON.stringify(result, null, 2) + '\n',
);
for (const f of failures) process.stdout.write('FAIL ' + f.name + '\n' + f.error + '\n');
process.stdout.write(`${count} checks passed, ${failures.length} failed\n`);
if (failures.length) process.exitCode = 1;
