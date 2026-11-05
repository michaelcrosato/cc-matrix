import { boot } from './harness.mjs';
const { game, G } = boot(); const I = game.input;
game.advance(.5); console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.message || e).slice(0, 3));
