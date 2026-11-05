import { load } from '../test/lib/load.mjs';
const errors = [];
const { game, G } = load({ errors });
game.advance(.5);
console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.message));
for (const b of [1, 2, 3]) console.log('rtp bet', b, G.Slots.rtp(100000, b).toFixed(3));
