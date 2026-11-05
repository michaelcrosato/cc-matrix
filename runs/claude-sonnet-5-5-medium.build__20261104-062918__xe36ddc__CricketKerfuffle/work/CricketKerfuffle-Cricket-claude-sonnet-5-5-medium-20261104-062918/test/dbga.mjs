import { loadGame } from './lib.mjs';
const { game, D } = loadGame(); game.advance(.5); D.scenes.about.enter(); 
// paginate through the real scene code with a fake renderer
let titles = []; const r = { W: 427, H: 240, overlay: f => f({}), sky() {}, text() {} };
const ex = D; game.go('about'); game.advance(1);
console.log(game.sceneName);
