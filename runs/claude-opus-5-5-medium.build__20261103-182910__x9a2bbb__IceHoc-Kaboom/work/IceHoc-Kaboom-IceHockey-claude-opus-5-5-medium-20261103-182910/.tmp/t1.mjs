import { load } from '../tests/lib.mjs';
let t0 = Date.now();
const { game, G, snap } = load('');
console.log('loaded', Date.now() - t0); t0 = Date.now();
game.advance(1/120); console.log('1 step', Date.now() - t0, snap().scene); t0 = Date.now();
game.advance(.5); console.log('.5s', Date.now() - t0, game.errors.map(e=>e.message)); 
