import { load } from '../tests/lib/load.mjs';
const { B, E, game } = load();
const s = () => game.debug.snapshot();
game.advance(1);
console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.message));
game.input.tap('start'); game.advance(1); console.log('scene', game.sceneName);
game.input.tap('confirm'); game.advance(1); console.log('scene', game.sceneName, JSON.stringify(s()).slice(0, 300));
for (let i = 0; i < 20; i++) { game.input.tap('confirm'); game.advance(1); }
console.log(JSON.stringify(s()).slice(0, 400), game.errors.map(e => e.message + e.stack).slice(0, 3));
