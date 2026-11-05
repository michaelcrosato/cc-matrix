import { load, check, finish } from './lib.mjs';
const { game, G, I, E } = load();
game.advance(.5);
check('boots to the title', game.sceneName === 'title', game.sceneName);
console.log(game.errors.map(e => e.message + '\n' + e.stack).join('\n---\n'));
finish(game);
