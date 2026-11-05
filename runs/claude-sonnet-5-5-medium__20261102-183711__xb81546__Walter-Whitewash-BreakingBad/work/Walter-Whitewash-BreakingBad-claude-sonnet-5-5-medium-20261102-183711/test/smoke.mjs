import { load } from './_load.mjs';
const { d, game } = load();
game.advance(.5);
console.log(JSON.stringify(game.debug.snapshot()), game.errors.map(e => e.message));
game.go('play', { fresh: true }); game.advance(1);
console.log(JSON.stringify(game.debug.snapshot()), game.errors.map(e => e.message + e.stack));
