import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
let count = 0;
const failures = [];
const check = (name, fn) => {
  count++;
  try {
    fn();
  } catch (e) {
    failures.push({ name, error: e.message });
  }
};
try {
  execFileSync(process.execPath, ['tools/build.mjs'], { stdio: 'pipe' });
} catch (e) {
  failures.push({ name: 'build', error: String(e.stderr || e.message) });
}
const manifest = JSON.parse(fs.readFileSync('artifacts/build.json', 'utf8'));
check(
  'single-file package parses and carries pristine first Hub client',
  () => {
    const html = fs.readFileSync(path.join('..', manifest.file), 'utf8'),
      scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        (m) => m[1],
      );
    if (scripts.length !== 9)
      throw new Error('Unexpected script count ' + scripts.length);
    if (
      scripts[0].trim() !==
      fs.readFileSync('vendor/ai-hub/lib/hub/session.js', 'utf8').trim()
    )
      throw new Error('Hub client modified');
    for (const [i, s] of scripts.entries())
      new vm.Script(s, { filename: 'shipping-script-' + i });
    if (
      /<script[^>]+src=|<audio|<img[^>]+src=/i.test(
        html.replace(/<script>[\s\S]*?<\/script>/g, ''),
      )
    )
      throw new Error('Unexpected asset dependency');
  },
);
check('exact interview schema and catalogue', () => {
  const r = JSON.parse(fs.readFileSync('../exit-interview.json', 'utf8'));
  const keys = [
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
  ];
  if (Object.keys(r.sourceInformation).sort().join() !== keys.sort().join())
    throw new Error('Source Information fields differ');
  for (const k of keys)
    if (
      typeof r.sourceInformation[k] !== 'string' ||
      !r.sourceInformation[k].trim()
    )
      throw new Error('Empty ' + k);
  for (const [k, n] of [
    ['testingFeedback', 4],
    ['engineFeedback', 6],
    ['promptFeedback', 4],
  ])
    if (
      r[k].length !== n ||
      r[k].some((v) => typeof v !== 'string' || !v.trim())
    )
      throw new Error('Invalid ' + k);
  if (
    r.sourceInformation.usage !== 'added on import' ||
    r.aiHub.name !== manifest.title ||
    r.aiHub.tags.length < 3 ||
    r.aiHub.tags.length > 6
  )
    throw new Error('Catalogue identity/usage/tags');
});
for (const [name, program, args] of [
  ['rules', process.execPath, ['tests/rules.mjs']],
  ['network', process.execPath, ['tests/network.mjs']],
  [
    'browser',
    '/home/micha/.local/share/pipx/venvs/playwright/bin/python',
    ['tools/browser-check.py'],
  ],
]) {
  try {
    const out = execFileSync(program, args, {
      encoding: 'utf8',
      maxBuffer: 12 * 1024 * 1024,
      timeout: 420000,
    });
    const r = JSON.parse(out);
    count += r.tests;
    failures.push(...r.failures.map((f) => ({ ...f, suite: name })));
  } catch (e) {
    count++;
    failures.push({
      name,
      suite: name,
      error: String(e.stderr || e.stdout || e.stack || e),
    });
  }
}
fs.writeFileSync(
  'artifacts/verification.json',
  JSON.stringify(
    { tests: count, passed: count - failures.length, failures },
    null,
    2,
  ),
);
for (const f of failures)
  process.stdout.write(
    'FAIL ' + (f.suite ? f.suite + ': ' : '') + f.name + '\n' + f.error + '\n',
  );
process.stdout.write(
  `${count - failures.length}/${count} checks passed; ${failures.length} failures.\n`,
);
process.exitCode = failures.length ? 1 : 0;
