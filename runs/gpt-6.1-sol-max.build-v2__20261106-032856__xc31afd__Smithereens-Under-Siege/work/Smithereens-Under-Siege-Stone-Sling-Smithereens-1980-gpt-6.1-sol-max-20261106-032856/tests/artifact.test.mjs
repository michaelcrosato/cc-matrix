import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { REPORT } from '../src/metadata.js';
export async function run(check) {
  const info = JSON.parse(fs.readFileSync('build-info.json', 'utf8')),
    html = fs.readFileSync('../' + info.base + '.html', 'utf8');
  check(
    'single file contains complete parseable inline scripts and unchanged released first Hub client',
    () => {
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(
        (m) => m[1],
      );
      assert.equal(scripts.length, 3);
      assert.equal(
        scripts[0],
        fs.readFileSync('vendor/hub/lib/hub/session.js', 'utf8'),
      );
      scripts.forEach((s) => new vm.Script(s));
      assert.ok(/<meta charset="utf-8">\s*<script>/.test(html));
    },
  );
  check(
    'artifact bundles every source module and has no runtime path dependency',
    () => {
      const b = JSON.parse(fs.readFileSync('artifacts/build.json', 'utf8'));
      assert.equal(b.modules, 10);
      assert.ok(html.includes('// src/sim.js'));
      assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(html));
      assert.ok(!/file:\/\/\/|\/home\/micha\//.test(html));
      assert.equal(html, fs.readFileSync('artifacts/game.html', 'utf8'));
      assert.ok(html.includes(REPORT.testingFeedback[0]));
      assert.ok(html.includes('MIT License'));
    },
  );
  check(
    'exit interview exact schema, complete catalogue and matching in-game source data',
    () => {
      const r = JSON.parse(fs.readFileSync('../exit-interview.json', 'utf8'));
      assert.deepEqual(r, REPORT);
      assert.deepEqual(Object.keys(r), [
        'sourceInformation',
        'testingFeedback',
        'engineFeedback',
        'promptFeedback',
        'aiHub',
      ]);
      assert.equal(Object.keys(r.sourceInformation).length, 15);
      assert.equal(r.testingFeedback.length, 4);
      assert.equal(r.engineFeedback.length, 6);
      assert.equal(r.promptFeedback.length, 4);
      assert.ok(
        Object.values(r.sourceInformation).every(
          (v) => typeof v === 'string' && v.length > 0,
        ),
      );
      assert.equal(r.sourceInformation.usage, 'added on import');
      assert.equal(r.aiHub.name, info.title);
      assert.equal(r.aiHub.players, '1–2');
      assert.ok(r.aiHub.tags.length >= 3 && r.aiHub.tags.length <= 6);
    },
  );
}
