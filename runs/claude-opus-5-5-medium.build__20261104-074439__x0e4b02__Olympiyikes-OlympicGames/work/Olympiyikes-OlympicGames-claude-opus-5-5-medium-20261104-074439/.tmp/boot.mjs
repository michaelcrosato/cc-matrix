import { boot } from '../tests/harness.mjs';
const c = boot({ quiet: false }); const O = c.OLY, game = O.game;
game.advance(.5); console.log('scene', game.sceneName);
game.input.tap('confirm'); game.advance(.6); console.log('scene', game.sceneName);
console.log('errors', game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
