import { loadGame } from '../tests/lib/load.mjs';
import { drive } from '../tests/story.test.mjs';
const G = loadGame(), { KC, game } = G; G.adv(.5);
drive(G, { until: () => KC.Story.s && KC.Story.s.node === 5 && game.sceneName === 'fight' });
let last = '';
for (let k = 0; k < 400; k++) { const S = game.scene, B = S.bout; if (!S._auto) { S._auto = true; game.debug.autopilot(0, 10); } const f = B.f; const s = [game.sceneName, B.phase, f[0].st, f[0].tech, f[1].st, f[1].tech, B.points, B.roundWins, !!S.result].join(' '); if (s !== last) { console.log((k / 4).toFixed(2), s, f[0].x.toFixed(0), f[1].x.toFixed(0), f[0].z.toFixed(0), f[1].z.toFixed(0)); last = s; } G.adv(.25); if (game.sceneName !== 'fight') break; }
console.log(game.errors.map(e => e.message));
