import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
mkdirSync('evidence', { recursive: true });
const build = spawnSync(process.execPath, ['tools/build.mjs', '--quiet'], { encoding: 'utf8' });
if (build.status !== 0) {
  console.log('FAIL build: ' + (build.stderr || build.stdout));
  console.log('0 passed, 1 failed (1 check)');
  process.exit(1);
}
const suite = process.argv[2] || 'all';
let result = [];
if (['all', 'sim'].includes(suite)) {
  try {
    const { simulation } = await import('../tests/simulation.mjs');
    result.push(...simulation());
  } catch (e) {
    result.push({ name: 'simulation runner', pass: false, detail: e.stack });
  }
}
if (['all', 'browser', 'hub', 'hub-gameplay', 'browser-input', 'pad', 'visual'].includes(suite)) {
  const child = spawnSync(
    '/home/micha/.local/share/pipx/venvs/playwright/bin/python',
    ['tests/browser.py', suite],
    { encoding: 'utf8', timeout: 300000 },
  );
  try {
    result.push(...JSON.parse(child.stdout));
  } catch (_) {
    result.push({
      name: `${suite} runner`,
      pass: false,
      detail: child.stderr || child.stdout || String(child.error),
    });
  }
}
if (['all', 'assets'].includes(suite)) {
  const child = spawnSync(
    process.execPath,
    ['vendor/engine/tools/asset-sheet.mjs', 'src/view/assets.js', '--out', 'evidence/assets', '--json'],
    { encoding: 'utf8', timeout: 120000 },
  );
  try {
    const report = JSON.parse(child.stdout);
    writeFileSync('evidence/asset-sheet-report.json', JSON.stringify(report, null, 2));
    result.push({
      name: 'native asset sheets render all seven original shapes without engine problems',
      pass: child.status === 0 && !report.problems.length && report.shapes.length === 7,
      detail: child.stderr || JSON.stringify(report.problems),
    });
  } catch (_) {
    result.push({ name: 'native asset sheets', pass: false, detail: child.stderr || child.stdout });
  }
}
const sourceHash = createHash('sha256')
  .update(readFileSync('../' + JSON.parse(readFileSync('project.json', 'utf8')).base + '.html'))
  .digest('hex');
writeFileSync(
  `evidence/${suite}-latest.json`,
  JSON.stringify({ suite, sourceHash, results: result }, null, 2),
);
for (const r of result) if (!r.pass) console.log(`FAIL ${r.name}: ${String(r.detail || '').slice(0, 14000)}`);
const failed = result.filter((r) => !r.pass).length;
console.log(`${result.length - failed} passed, ${failed} failed (${result.length} checks)`);
process.exitCode = failed ? 1 : 0;
