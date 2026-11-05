import { load, until } from '../test/lib/load.mjs';
const errors = [];
const { game, G } = load({ errors });
game.advance(.5);
console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.message));
// an AI vs AI match: make the human a CPU
const cfg = G.quickMatchCfg({ seed: 3 });
cfg.teams[0][0].ctl = { kind: 'ai' }; cfg.teams[0][0].skill = .55;
G.startMatch(cfg); game.advance(1);
console.log('scene', game.sceneName, G.M && G.M.phase);
let last = '', phases = {};
for (let i = 0; i < 400 * 120 && G.M.phase !== 'results'; i++) {
  game.advance(1 / 120);
  const M = G.M; phases[M.phase] = (phases[M.phase] || 0) + 1;
  const s = M.rules.score.join('-'); if (s !== last) { last = s; console.log('t', M.now.toFixed(1), 'score', s, M.lastPoint && M.lastPoint.why, M.lastPoint && M.lastPoint.kind, 'rally', M.lastPoint && M.lastPoint.rally); }
  if (game.errors.length) break;
}
console.log('phase', G.M.phase, 'now', G.M.now.toFixed(1), 'errors', game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')), errors.slice(0, 5));
