// browser/enginecheck: the engine author's own checker (handoff/tools/check.mjs, not written for this game) on the shipped
// file, every mission: it plays each for a moment in Chromium, turns through the views, and judges the look against its
// PS1-era bar (distinct colours, flat area, contrast). Each mission must show no errors and draw no look notes
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { NAME } from '../../tools/name.mjs';
export default async function ({ dev, check }) {
  const file = join(dev, '..', NAME + '.html');
  for (const id of ['training', 'm1', 'm2', 'm3']) {
    const out = join(dev, '.enginecheck-' + id);
    const r = spawnSync(process.execPath, [join(dev, 'handoff', 'tools', 'check.mjs'), file + '#' + id, '--out', out], { encoding: 'utf8', timeout: 150000 });
    const txt = (r.stdout || '') + (r.stderr || ''), play = txt.split('\n').find(l => /after play\s+scene mission/.test(l)) || '';
    const colors = +((play.match(/(\d+) colors/) || [])[1] || 0), filled = +((play.match(/(\d+)% filled/) || [])[1] || 0);
    check(`the engine's checker on ${id}: no errors`, r.status === 0 && /\bno errors\b/.test(txt), txt.split('\n').filter(l => /error/i.test(l)).slice(0, 3).join(' | ') || 'exit ' + r.status);
    check(`the engine's checker on ${id}: no look notes against its PS1-era bar (${colors} colours, ${filled}% filled)`, !/look notes/.test(txt) && colors >= 60 && filled >= 80, play.trim());
    rmSync(out, { recursive: true, force: true });
  }
}
