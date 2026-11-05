import { boot } from '../tests/harness.mjs';
const id = process.argv[2]; const c = boot({ hash: '#ev/' + id }); const O = c.OLY, game = O.game;
game.advance(.3); O.Dev.cheats.autopilot = true;
let last = '';
for (let i = 0; i < 3000; i++) { game.advance(.1); const x = O.ctx; if (!x) continue; const a = x.cur || x.humans[0]; const k = game.sceneName + ' ' + x.phase + ' r' + x.round + ' ' + (a ? a.id + ':' + (a.S.phase || a.S.state || a.S.stage || '') : ''); if (k !== last) { console.log((i/10).toFixed(1), k); last = k; } if (game.sceneName === 'results') break; }
console.log('errors', game.errors.map(e => e.message));
