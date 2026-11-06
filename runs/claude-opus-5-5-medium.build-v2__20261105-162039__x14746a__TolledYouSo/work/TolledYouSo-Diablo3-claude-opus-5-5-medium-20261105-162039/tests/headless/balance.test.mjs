// Balance report: bot campaigns in the pure sim must hit the targets for level, length and legendaries, with no softlock.
import { spawnSync } from 'node:child_process';
import { ok, guarded } from '../lib.mjs';
await guarded(async () => {
  const r = spawnSync('node', ['tools/report.mjs', '--assert'], { encoding: 'utf8', timeout: 460000, env: { ...process.env, SEEDS: '11,23,47' } });
  const lines = r.stdout.split('\n').filter((l) => /TARGET|SOFTLOCK|REPORT/.test(l));
  ok(r.status === 0, lines.join(' ').slice(0, 600));
});
