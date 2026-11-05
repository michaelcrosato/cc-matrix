import { boot } from '../tests/harness.mjs';
import { makeDriver } from '../tests/drive.mjs';
const c = boot({}); const O = c.OLY, game = O.game; const t0 = Date.now();
const D = makeDriver(c);
game.advance(.5); game.input.tap('confirm'); game.advance(.5);   // title → menu
// menu: THE GAMES is item 0 (no save) → confirm
game.input.tap('confirm'); game.advance(.5);
let lastDay = -1;
for (let i = 0; i < 80000 && game.sceneName !== 'title'; i++) { D.step(.1); const m = O.meet; if (m && m.day !== lastDay) { lastDay = m.day; console.log('day', m.day, game.sceneName, ((Date.now() - t0) / 1000).toFixed(1) + 's'); } if (game.errors.length) break; }
console.log(D.log.join(' > '));
const m = O.meet; console.log('end scene', game.sceneName, 'medals', m && JSON.stringify(m.medals), 'errors', game.errors.map(e => e.where + ': ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
