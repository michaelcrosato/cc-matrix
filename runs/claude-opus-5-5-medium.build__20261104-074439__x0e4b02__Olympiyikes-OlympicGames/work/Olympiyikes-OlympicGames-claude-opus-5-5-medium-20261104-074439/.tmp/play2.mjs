import { boot } from '../tests/harness.mjs';
import { makeDriver } from '../tests/drive.mjs';
const c = boot({}); const O = c.OLY, game = O.game;
const D = makeDriver(c);
game.advance(.5); game.input.tap('confirm'); game.advance(.5); game.input.tap('confirm'); game.advance(.5);
let last = '', tt = 0;
for (let i = 0; i < 20000 && game.sceneName !== 'title'; i++) { D.step(.1); tt += .1; const x = O.ctx; if (game.sceneName === 'ev:figure' || game.sceneName === 'ev:weights' || (O.meet && O.meet.day >= 7)) { const a = x && (x.cur || x.humans[0]); const k = game.sceneName + ' ' + (x ? x.phase : '') + ' ' + (a && a.S ? a.id + ':' + (a.S.phase || a.S.state || '') : ''); if (k !== last) { console.log(tt.toFixed(1), k); last = k; } } if (tt > 6000) break; }
const x = O.ctx; console.log(game.sceneName, x.phase, x.phaseT, x.turnI, x.turns.length, x.round, x.rounds, x.active.map(a => a.id + ' fin ' + a.fin + ' cur ' + a.cur + ' ' + JSON.stringify({ ph: a.S.phase, dropT: a.S.dropT })));
