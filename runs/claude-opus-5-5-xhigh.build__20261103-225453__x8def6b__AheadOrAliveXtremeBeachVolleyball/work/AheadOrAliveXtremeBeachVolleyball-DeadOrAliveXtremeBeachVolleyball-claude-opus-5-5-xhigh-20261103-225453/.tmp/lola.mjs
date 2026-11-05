import { load } from '../test/lib/load.mjs';
import { playUntil, finishMatch } from '../test/lib/bots.mjs';
const { game, G } = load({});
game.advance(.3);
for (const me of ['rin', 'lola']) {
  game.go('charselect', null, { fade: 0 }); game.advance(.1); game.scene.pick(me);
  playUntil(G, game, () => game.sceneName === 'match', 120);
  const M = G.M; const r = finishMatch(G, game, true); console.log(me, 'won', r && r.humanWon, r && r.score, M.phase, M.now.toFixed(0), game.sceneName);
  playUntil(G, game, () => game.sceneName === 'map', 90); console.log('scene', game.sceneName);
}
