import { load } from '../test/lib/load.mjs';
const { G, game } = load(); game.advance(1);
G.go('title', null, { fade: 0 }); game.advance(.5); G.attract.reset(); game.advance(11);
for (let s = 0; s < 120; s++) game.advance(1);
console.log('beat', G.attract.BEATS[G.attract.beat].id, game.sceneName, G.overlay.list.map(o => o.kind), 'active', G.attract.active, 't', G.attract.t);
game.input.tap('confirm'); for (let k = 0; k < 6; k++) { game.advance(1/120); console.log(k, game.sceneName, G.attract.active, game.input.anyPressed()); }
game.advance(1); console.log(game.sceneName, G.attract.active);
