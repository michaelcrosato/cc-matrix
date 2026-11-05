import { boot } from '../tests/harness.mjs';
const c = boot({ hash: '#games/day/9' }); const O = c.OLY, game = O.game;
game.advance(.3); O.Dev.cheats.autopilot = true; let last = '';
for (let i = 0; i < 1500; i++) { if (!game.sceneName.startsWith('ev:')) game.input.tap('confirm'); game.advance(.1); const x = O.ctx; if (!x || !game.sceneName.startsWith('ev:')) continue; const a = x.cur; if (!a || !a.human) continue; const s = a.S; const k = s.phase + ' kg' + s.kg + ' cap' + (s.cap|0) + (s.bal ? ' b' + s.bal.b.toFixed(2) : '') + (s.jerkJ ? ' ' + s.jerkJ : ''); if (k.split(' b')[0] !== last.split(' b')[0]) { console.log((i/10).toFixed(1), k, 'h', (s.h||0).toFixed(2), 'rate', a.mash.rate.toFixed(1)); last = k; } if (game.sceneName === 'results') break; }
