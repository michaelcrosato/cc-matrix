// check-environment.mjs: this computer's file in environments/, dated, its checked part replaced each time and the
// rest (written by hand) kept. node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'check-environment.mjs');

test('check-environment.mjs writes this computer\'s file, dated, and keeps what was written by hand', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'matrix-env-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const check = () => spawnSync(process.execPath, [SCRIPT, '--quick', '--dir', dir], { encoding: 'utf8', timeout: 60000 });
  let r = check();
  assert.equal(r.status, 0, r.stderr);
  const file = path.join(dir, `${os.hostname().replace(/[^\w.-]/g, '-')}.md`);
  let text = fs.readFileSync(file, 'utf8');
  assert.match(text, /^# .+: what this computer has\n/);
  assert.match(text, /Checked \d{4}-\d\d-\d\d \d\d:\d\d \(.+\) by node check-environment\.mjs --quick/);
  assert.match(text, /- \*\*Computer:\*\* .+, \d+ cores, \d+ GB RAM/);
  assert.match(text, /- \*\*Tools:\*\* .*node \d+\.\d+/);
  assert.match(text, /## What this computer doesn't have[\s\S]*No physical controller[\s\S]*## Sharing this computer/);
  // What's written by hand outside the markers stays; the checked part is replaced, never added again.
  fs.writeFileSync(file, text.replace('## Sharing this computer', '- **No VR headset.**\n\n## Sharing this computer').replace(/- \*\*Tools:\*\*.*\n/, '- **Tools:** stale\n'));
  r = check();
  assert.equal(r.status, 0, r.stderr);
  text = fs.readFileSync(file, 'utf8');
  assert.match(text, /No VR headset/);
  assert.doesNotMatch(text, /Tools:\*\* stale/);
  assert.equal(text.split('<!-- /checked -->').length, 2);
});
