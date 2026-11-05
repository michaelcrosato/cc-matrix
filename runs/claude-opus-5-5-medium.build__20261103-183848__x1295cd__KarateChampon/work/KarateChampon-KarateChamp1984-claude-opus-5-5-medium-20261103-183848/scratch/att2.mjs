import { loadGame } from '../tests/lib/load.mjs';
const G = loadGame(), { KC, game, I } = G; G.adv(.3); game.go('attract', { loop: 1 }, { fade: 0 }); G.adv(3);
console.log(game.sceneName, KC.Attract.on); I.tap('confirm'); G.adv(1 / 120); console.log(game.sceneName, KC.Attract.on); G.adv(1); console.log(game.sceneName, KC.Attract.on, game.errors.map(e => e.message));
