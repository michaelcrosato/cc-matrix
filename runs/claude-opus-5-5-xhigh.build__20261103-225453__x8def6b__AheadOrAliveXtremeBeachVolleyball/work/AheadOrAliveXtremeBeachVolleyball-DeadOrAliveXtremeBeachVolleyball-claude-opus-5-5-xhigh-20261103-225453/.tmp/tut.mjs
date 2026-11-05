import { load } from '../test/lib/load.mjs';
import { playUntil, finishMatch } from '../test/lib/bots.mjs';
const { game, G } = load({});
game.advance(.3);
game.go('charselect', null, { fade: 0 }); game.advance(.1); game.scene.pick('ingrid');
playUntil(G, game, () => game.sceneName === 'match', 120);
const r = finishMatch(G, game, true); console.log('won', r && r.humanWon, game.sceneName);
for (let i = 0; i < 120 * 60; i++) { const D = G.talk; if (i % 360 === 0) console.log((i / 120).toFixed(1), game.sceneName, D && D.open, D && D.name, game.scene.job && game.scene.job.done, G.state.slot); if (D && D.open && D.modal && i % 6 === 0) game.input.tap('confirm'); game.advance(1 / 120); if (game.sceneName === 'map') { console.log('map at', i / 120); break; } }
console.log(game.errors.map(e => e.message));
