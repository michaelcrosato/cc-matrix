import { loadGame } from './load.mjs';
const { ctx, SM } = loadGame();
const game = ctx.__smashby.game;
const snap = () => game.debug.snapshot();
game.advance(.5);
game.go('match', SM.attractData());
let t0 = Date.now(), scenes = {}, last = '', secs = 0;
for (let i = 0; i < 3000 && secs < 900; i++) {
  game.advance(1); secs++;
  const s = snap().scene;
  if (s !== last) { console.log('t=' + secs + 's scene ->', s, 'score', JSON.stringify(snap().score), 'phase', snap().phase); last = s; }
  scenes[s] = (scenes[s] || 0) + 1;
  if (s === 'title') break;
}
const errs = (game.errors || []).map(e => e.message || String(e));
console.log('done in', Date.now() - t0, 'ms; errors', errs.length, errs.slice(0, 3));
console.log('stats', JSON.stringify(snap().stats));
