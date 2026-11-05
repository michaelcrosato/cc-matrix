import { load } from '../test/lib/load.mjs';
const { G, game } = load(); game.advance(.5); const I = game.input;
G.go('menu', null, { fade: 0 }); game.advance(.2); const m = G.SCENES.menu; const it = m.layout()[3];
I.feed('move', it.x + 5, it.y + 5); game.advance(.05); I.feed('down', it.x + 5, it.y + 5); game.advance(1/120); I.feed('up', it.x + 5, it.y + 5);
for (let k = 0; k < 4; k++) { game.advance(1/120); console.log(k, JSON.stringify(I.clicked()), game.sceneName, m.focus.i); }
game.advance(.5); console.log(game.sceneName);
