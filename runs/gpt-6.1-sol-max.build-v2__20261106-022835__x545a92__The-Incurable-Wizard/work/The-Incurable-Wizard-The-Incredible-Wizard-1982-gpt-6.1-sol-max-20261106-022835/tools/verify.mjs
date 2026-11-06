import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { core } from '../tests/core.mjs';

let count = 0,
  failed = 0;
const evidence = { date: new Date().toISOString(), campaigns: [], checks: [] };
const test = (name, fn) => {
  count++;
  try {
    fn();
    evidence.checks.push({ name, pass: true });
  } catch (e) {
    failed++;
    evidence.checks.push({ name, pass: false, error: e.message });
    console.log('FAIL ' + name + ': ' + e.message);
  }
};
core(test, evidence);
if (!process.argv.includes('--core')) {
  test('build final self-contained package', () => {
    const r = spawnSync(process.execPath, ['tools/build.mjs'], {
      encoding: 'utf8',
    });
    if (r.status) throw Error(r.stdout + r.stderr);
  });
  test('final artifact, first Hub script bytes, interview schema', () => {
    const name = process.cwd().split('/').pop() + '.html',
      html = fs.readFileSync(name, 'utf8'),
      hub = fs.readFileSync('vendor/session.js', 'utf8');
    if (
      !html.startsWith(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><script>' +
          hub +
          '</script>',
      )
    )
      throw Error('client ordering/bytes');
    if (fs.readFileSync('../' + name, 'utf8') !== html)
      throw Error('different test package');
    const data = JSON.parse(fs.readFileSync('../exit-interview.json', 'utf8'));
    for (const k of [
      'date',
      'source',
      'plan',
      'genre',
      'perspective',
      'tech',
      'artDirection',
      'animation',
      'audio',
      'online',
      'testing',
      'research',
      'environment',
      'model',
      'usage',
    ])
      if (
        typeof data.sourceInformation[k] !== 'string' ||
        !data.sourceInformation[k]
      )
        throw Error('sourceInformation ' + k);
    for (const [k, n] of [
      ['testingFeedback', 4],
      ['engineFeedback', 6],
      ['promptFeedback', 4],
    ])
      if (
        data[k].length !== n ||
        data[k].some((v) => typeof v !== 'string' || !v)
      )
        throw Error(k);
    if (
      data.sourceInformation.usage !== 'added on import' ||
      data.aiHub.tags.length > 6
    )
      throw Error('metadata');
  });
  if (!process.argv.includes('--no-browser')) {
    const r = spawnSync(
      '/home/micha/.local/share/pipx/venvs/playwright/bin/python',
      ['tests/browser.py'],
      { encoding: 'utf8', timeout: 400000, maxBuffer: 4e6 },
    );
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.status) {
      failed++;
      console.log('FAIL browser suite: ' + (r.stderr || 'exit ' + r.status));
    }
    try {
      const d = JSON.parse(
        fs.readFileSync('evidence/browser-results.json', 'utf8'),
      );
      count += d.count;
      failed += d.failed;
      evidence.browser = d;
    } catch (e) {
      failed++;
      console.log('FAIL browser evidence: ' + e.message);
    }
  }
}
fs.writeFileSync(
  'evidence/verification.json',
  JSON.stringify({ ...evidence, count, failed }, null, 2) + '\n',
);
console.log(`${count} checks, ${failed} failures`);
process.exitCode = failed ? 1 : 0;
