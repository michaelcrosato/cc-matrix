// Records real play and replays it to the same fingerprint.
import { ok, eq, guarded } from '../lib.mjs';
import { spawnSync } from 'node:child_process';
await guarded(async () => {
  const r = spawnSync('node', ['check.mjs', '--headless', 'game.js', '--keys', 'Enter*2,KeyD*30,Enter*2,Enter*2,KeyD*60,Space*4,KeyD*60,KeyA*60,Digit1*5,KeyQ*4,Escape*2,Escape*2'], { encoding: 'utf8', timeout: 180000 });
  ok(r.status === 0, `check.mjs headless: ${r.stdout}${r.stderr}`.slice(0, 500)); ok(/replayed to the same/.test(r.stdout), 'replay matches');
});
