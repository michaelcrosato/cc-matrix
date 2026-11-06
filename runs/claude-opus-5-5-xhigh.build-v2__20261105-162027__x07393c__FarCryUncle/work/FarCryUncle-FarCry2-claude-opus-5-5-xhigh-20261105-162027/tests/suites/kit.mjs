// The kit's own tools, as its guide asks before handing back: the headless replay, the real page, the model sheets.
import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/paths.mjs';
export const name = 'kit';
export const covers = ['src', 'pixel-engine.js', 'check.mjs', 'index.html'];
const check = (...args) => spawnSync('node', ['check.mjs', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 400000, maxBuffer: 1 << 26 });
const tail = (r) => `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').filter((l) => l.length < 300).slice(-6).join(' | ');
export async function run(t) {
  const keys = 'Enter*2,KeyW*30,Enter*2,KeyS*10,Enter*4';
  const h = check('--headless', 'src/game.js', '--keys', keys);
  t.eq('check.mjs --headless: plays and replays the same', h.status, 0, tail(h));
  const s = check('--sheets', 'src/art/models.js');
  t.eq('check.mjs --sheets: no model problems', s.status, 0, tail(s));
  const p = check('index.html', '--keys', keys);
  t.eq('check.mjs: the page runs, draws a real picture', p.status, 0, tail(p));
}
