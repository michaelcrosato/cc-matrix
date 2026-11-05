import { boot } from '../tests/harness.mjs';
const c = boot(); const O = c.OLY, game = O.game; game.advance(10.5); game.advance(120);
console.log(game.sceneName, O.Attract.on, O.Attract.segT, game.paused);
game.input.tap('confirm'); game.advance(1/120); console.log('pressed?', game.input.pressed('confirm'), game.input.anyPressed()); game.advance(.6);
console.log(game.sceneName, O.Attract.on);
