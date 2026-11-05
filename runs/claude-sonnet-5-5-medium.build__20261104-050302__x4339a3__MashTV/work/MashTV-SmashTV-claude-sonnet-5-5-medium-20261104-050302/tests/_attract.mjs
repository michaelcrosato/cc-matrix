import { load } from './lib.mjs';
const { game, MT } = load();
game.advance(.5);
console.log('scene', game.sceneName);
game.advance(10.5);
console.log('after 10.5s idle:', game.sceneName);
for (let i = 0; i < 12; i++) { game.advance(10); const s = game.scene; console.log(i * 10 + 10, game.sceneName, s.idx, s.R && (s.R.room || s.R.kind), game.errors.length); }
console.log(game.errors.map(e => (e.message || e) + ' ' + (e.stack ? e.stack.split('\n')[1] : '')).slice(0, 5));
game.input.tap('confirm'); game.advance(.5); console.log('after input:', game.sceneName);
