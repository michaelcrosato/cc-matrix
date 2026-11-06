/** Quiet release gate. Owns only child processes and loopback servers it starts. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { networkTests } from '../tests/network-unit.mjs';
import { runSimulationTests } from '../tests/sim.test.mjs';
import { findClients } from '../vendor/hub-repo/scripts/lib/hub-client.mjs';
import { artifact } from './build.mjs';
import { root } from './load.mjs';

let count = 0;
const failures = [];
const test = (name, fn) => {
  count++;
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
};
const hash = (s) => createHash('sha256').update(s).digest('hex');
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');
const model = JSON.parse(read('docs/feedback.json'));
const config = JSON.parse(read('../build-config.json'));
const html = fs.readFileSync(artifact, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
test('exact deliverable filename', () => assert.equal(path.basename(artifact), config.slug + '.html'));
test('reproducible development bundle', () => assert.equal(hash(html), hash(read('index.html'))));
test('brand and title', () => {
  assert.ok(html.includes(`<title>${config.title}</title>`));
  assert.equal(model.aiHub.name, config.title);
  assert.equal(PD.TITLE, config.title);
});
test('pristine released first Hub client', () => {
  const clients = findClients(html);
  assert.equal(clients.length, 1);
  assert.ok(clients[0].pristine && clients[0].complete);
  assert.equal(clients[0].version, '1.4.0');
  assert.equal(scripts[0].trim(), read('vendor/hub/session.js').trim());
  assert.match(html, /^<!doctype html>\s*<html[^>]*><head><meta charset="utf-8">\s*<script>/i);
});
test('unmodified native engine', () =>
  assert.equal(
    hash(read('vendor/engine/my-3d2dge.js')),
    hash(read('vendor/engine-repo/dist/handoff/my-3d2dge.js')),
  ));
test('native engine version', () => assert.equal(My3D2dge.version, '0.89.1'));
test('all embedded scripts parse', () => {
  assert.equal(scripts.length, 12);
  for (const [i, code] of scripts.entries()) new vm.Script(code, { filename: `bundle-script-${i}` });
});
for (const [key, value] of Object.entries({
  session: '1',
  'session-players': '1-2',
  'session-mode': 'shared-world',
  'session-minutes': '15',
})) {
  test('Hub metadata ' + key, () => assert.ok(html.includes(`<meta name="hub:${key}" content="${value}">`)));
}
test('Hub instruction metadata', () => {
  for (const key of ['goal', 'howto'])
    assert.match(html, new RegExp(`<meta name="hub:session-${key}" content="[^"]{20,}"`));
});
test('standalone bundle has no relative imports', () => {
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|type="module"|<audio|<img\s/i);
});
test('feedback exact top-level schema', () =>
  assert.deepEqual(
    Object.keys(model).sort(),
    ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'].sort(),
  ));
test('source information schema and values', () => {
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
  assert.deepEqual(Object.keys(model.sourceInformation).sort(), keys.sort());
  for (const [key, value] of Object.entries(model.sourceInformation))
    assert.ok(typeof value === 'string' && value.trim(), key);
  assert.equal(model.sourceInformation.usage, 'added on import');
  assert.equal(model.sourceInformation.plan, 'PLAN.md');
  assert.equal(model.sourceInformation.model, 'OpenAI, gpt-6.1-sol, reasoning effort max');
});
for (const [field, length] of [
  ['testingFeedback', 4],
  ['engineFeedback', 6],
  ['promptFeedback', 4],
])
  test(field + ' exact answers', () => {
    assert.equal(model[field].length, length);
    assert.ok(model[field].every((v) => typeof v === 'string' && v.trim()));
  });
test('catalogue schema', () => {
  assert.deepEqual(
    Object.keys(model.aiHub).sort(),
    [
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
    ].sort(),
  );
  assert.equal(model.aiHub.type, 'Game');
  assert.equal(model.aiHub.genre, 'Platformer');
  assert.equal(model.aiHub.players, '1–2');
  assert.ok(model.aiHub.tags.length >= 3 && model.aiHub.tags.length <= 6);
  assert.ok(model.aiHub.tags.every((t) => t === t.toLowerCase()));
});
test('feedback shipped consistently', () => {
  assert.deepEqual(JSON.parse(read('../exit-interview.json')), model);
  const embedded = html.match(/globalThis\.PD=\{FEEDBACK:(.*)\};<\/script>/)[1];
  assert.deepEqual(JSON.parse(embedded), model);
});
test('required handoff and authoring docs', () => {
  for (const name of [
    'research',
    'dependencies',
    'authoring',
    'decisions',
    'testing',
    'network',
    'audio',
    'assets',
  ])
    assert.ok(fs.statSync(path.join(root, 'docs', name + '.md')).size > 100, name);
});
test('measured defect feedback matches ledger', () => {
  const ledger = JSON.parse(read('docs/issues.json'));
  const total = ledger.filter((i) => i.product && i.fixed).length,
    critical = ledger.filter((i) => i.product && i.fixed && i.critical).length;
  assert.ok(model.testingFeedback[0].startsWith(String(total) + ' '));
  assert.ok(model.testingFeedback[1].startsWith(String(critical) + ' '));
});
test('coded assets only in source tree', () => {
  const walk = (p) =>
    fs
      .readdirSync(p, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(p, e.name)) : [e.name]));
  assert.ok(walk(path.join(root, 'src')).every((n) => !/\.(mp3|ogg|wav|flac|png|jpe?g|webp|gif)$/i.test(n)));
});
const merge = (result) => {
  count += result.count;
  failures.push(...result.failures);
};
merge(await runSimulationTests());
merge(await networkTests());

function browser(script, args = []) {
  return new Promise((resolve) => {
    const executable = '/home/micha/.local/share/pipx/venvs/playwright/bin/python';
    const child = spawn(executable, ['-u', path.join(root, 'tests', script), ...args], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '',
      errors = '';
    child.stdout.on('data', (b) => {
      output += b;
    });
    child.stderr.on('data', (b) => {
      errors += b;
    });
    const timeout = setTimeout(() => child.kill('SIGTERM'), 25 * 60 * 1000);
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ count: 1, failures: [script + ': ' + error.message] });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      try {
        const result = JSON.parse(output.trim().split('\n').at(-1));
        if (!Array.isArray(result.failures) || !Number.isInteger(result.count))
          throw Error('bad result schema');
        if (code && !result.failures.length)
          result.failures.push(`${script}: exit ${code}; ${errors.slice(-2000)}`);
        resolve(result);
      } catch (error) {
        resolve({
          count: 1,
          failures: [`${script}: ${error.message}\n${output.slice(-2000)}\n${errors.slice(-3000)}`],
        });
      }
    });
  });
}
merge(await browser('input-browser.py', [artifact]));
merge(await browser('hub-browser.py', ['--full']));
fs.writeFileSync(
  path.join(root, 'docs/evidence/verification.json'),
  JSON.stringify(
    {
      date: new Date().toISOString(),
      artifact: path.basename(artifact),
      sha256: hash(html),
      count,
      failures,
    },
    null,
    2,
  ) + '\n',
);
for (const failure of failures) console.error(failure);
console.log(`${count} checks; ${failures.length} failures.`);
if (failures.length) process.exitCode = 1;
