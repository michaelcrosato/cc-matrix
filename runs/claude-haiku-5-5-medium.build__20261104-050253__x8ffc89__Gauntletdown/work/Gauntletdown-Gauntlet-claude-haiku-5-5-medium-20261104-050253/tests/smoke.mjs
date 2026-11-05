import { boot } from './lib.mjs';
const { game, I, snap } = boot();
game.advance(.5);
console.log('scene after boot', snap().scene, 'errors', game.errors.length, game.errors.slice(0,3).map(e=>e.message||e));
