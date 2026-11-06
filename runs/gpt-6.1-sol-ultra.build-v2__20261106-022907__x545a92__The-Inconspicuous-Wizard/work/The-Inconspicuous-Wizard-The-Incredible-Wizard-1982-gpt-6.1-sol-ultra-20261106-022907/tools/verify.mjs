import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(name + ': ' + e.message);
  }
};
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const run = (label, bin, args) => {
  const r = spawnSync(bin, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0) {
    failures.push(
      label + ': ' + (r.error?.message || out || 'exit ' + r.status),
    );
    return;
  }
  const match = out.match(/(\d+)(?: [A-Za-z -]+)? passed; (\d+) failed/);
  passed += match ? +match[1] : 1;
  if (match && +match[2]) failures.push(label + ': ' + out);
};
const built = spawnSync(process.execPath, ['tools/build.mjs', '--quiet'], {
  cwd: root,
  encoding: 'utf8',
});
if (built.status !== 0) failures.push('build: ' + built.stderr);
for (const p of [
  'content/rooms.js',
  'src/sim.js',
  'src/render.js',
  'src/audio.js',
  'src/network.js',
  'src/main.js',
])
  run('syntax ' + p, process.execPath, ['--check', p]);
run('simulation', process.execPath, ['tests/sim.mjs']);
run('network', process.execPath, ['tests/network.mjs']);
run('native renderer fixture', process.execPath, ['tests/render-smoke.mjs']);
run('native real-state rendering', process.execPath, ['tests/render-real.mjs']);
check('interview schema', () => {
  const a = JSON.parse(read('metadata.json'));
  const keys = [
    'sourceInformation',
    'testingFeedback',
    'engineFeedback',
    'promptFeedback',
    'aiHub',
  ];
  if (JSON.stringify(Object.keys(a)) !== JSON.stringify(keys))
    throw Error('Top-level schema differs');
  const s = [
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
  if (JSON.stringify(Object.keys(a.sourceInformation)) !== JSON.stringify(s))
    throw Error('Source Information fields differ');
  for (const k of s)
    if (typeof a.sourceInformation[k] !== 'string' || !a.sourceInformation[k])
      throw Error('Empty ' + k);
  if (
    a.sourceInformation.usage !== 'added on import' ||
    a.sourceInformation.plan !== 'PLAN.md'
  )
    throw Error('Usage/plan value differs');
  for (const [k, n] of [
    ['testingFeedback', 4],
    ['engineFeedback', 6],
    ['promptFeedback', 4],
  ])
    if (a[k].length !== n || a[k].some((x) => typeof x !== 'string' || !x))
      throw Error('Feedback order/count ' + k);
  const h = a.aiHub,
    hk = [
      'name',
      'tagline',
      'description',
      'type',
      'genre',
      'source',
      'series',
      'players',
      'controls',
      'tags',
    ];
  if (
    JSON.stringify(Object.keys(h)) !== JSON.stringify(hk) ||
    h.type !== 'Game' ||
    h.genre !== 'Shooter' ||
    h.players !== '1–2' ||
    h.tags.length < 3 ||
    h.tags.length > 6 ||
    h.tags.some((t) => t !== t.toLowerCase())
  )
    throw Error('Catalogue schema differs');
});
check('official Hub bytes and script ordering', () => {
  const html = read('game.html'),
    hub = read('vendor/hub/session.js');
  const first = html.match(
    /<meta charset="utf-8"><script>([\s\S]*?)<\/script>/,
  );
  if (!first || first[1] !== hub) throw Error('Official first script changed');
  if (
    !html.includes('hub:session-mode" content="shared-world') ||
    !html.includes('hub:session-players" content="1-2')
  )
    throw Error('Hub metadata missing');
});
check('fully standalone package', () => {
  const html = read('game.html');
  if (/<script[^>]+src=|<link[^>]+href=/i.test(html))
    throw Error('External runtime resource');
  if (
    !html.includes('Source Information') ||
    !html.includes('Testing Feedback') ||
    !html.includes('Engine Feedback') ||
    !html.includes('Prompt Feedback')
  )
    throw Error('Required credits missing');
  if (read('index.html') !== html) throw Error('Development copy differs');
});
const python = '/home/micha/.local/share/pipx/venvs/playwright/bin/python';
for (const script of [
  'tests/audio_browser.py',
  'tests/ui_browser.py',
  'tests/hub_browser.py',
])
  if (existsSync(resolve(root, script))) run(script, python, [script]);
  else failures.push('Missing suite ' + script);
const artifact = read('game.html');
const report = {
  passed,
  failures,
  artifactSHA256: createHash('sha256').update(artifact).digest('hex'),
  date: new Date().toISOString(),
};
writeFileSync(
  resolve(root, 'evidence/verification.json'),
  JSON.stringify(report, null, 2),
);
for (const f of failures) console.error('FAIL ' + f);
console.log(`${passed} passed; ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
