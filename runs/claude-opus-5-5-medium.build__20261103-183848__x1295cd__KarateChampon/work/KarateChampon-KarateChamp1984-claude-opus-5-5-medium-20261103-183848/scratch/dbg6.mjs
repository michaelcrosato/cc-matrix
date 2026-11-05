import { loadGame } from '../tests/lib/load.mjs';
import { drive } from '../tests/story.test.mjs';
const G = loadGame(), { KC, game } = G; G.adv(.5);
drive(G, { invincible: true, cpuLevel: 1 });
for (const e of game.errors) console.log(e.message, (e.stack || '').split('\n').slice(0, 4).join(' | '));
console.log(KC.unlocks(), KC.store('unlocks'));
