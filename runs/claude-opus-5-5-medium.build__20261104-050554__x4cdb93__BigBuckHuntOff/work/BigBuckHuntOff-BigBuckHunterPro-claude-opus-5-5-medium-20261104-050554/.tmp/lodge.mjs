import { load } from '../tests/lib/load.mjs';
const { B, game } = load();
game.advance(.5); game.go('lodge', { ceremony: true }); game.advance(1);
console.log(game.sceneName, game.errors.map(e=>e.message));
game.input.tap('cancel'); game.advance(.1); console.log(game.sceneName); game.advance(1); console.log(game.sceneName);
