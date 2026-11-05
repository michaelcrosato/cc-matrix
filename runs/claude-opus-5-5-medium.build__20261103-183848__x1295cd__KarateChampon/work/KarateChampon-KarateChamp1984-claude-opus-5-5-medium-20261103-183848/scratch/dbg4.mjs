import { loadGame } from '../tests/lib/load.mjs';
import { drive } from '../tests/story.test.mjs';
const G = loadGame(), { KC, game } = G; G.adv(.5); let n = 0;
drive(G, { level: 10, lose: { node: 2, n: 1 }, until: () => n >= 1 && game.sceneName === 'fight', onContinue: S => { n++; G.I.tap('confirm'); } });
let last = '';
for (let k = 0; k < 200; k++) { const S = game.scene, B = S.bout; if (!S._auto) { S._auto = true; game.debug.autopilot(0, 10); } const f = B.f; const s = [B.phase, f[0].st, f[0].tech, f[1].st, f[1].tech, B.points, B.roundWins, KC.F.ai[0] && KC.F.ai[0].thought, KC.F.ai[1] && KC.F.ai[1].thought].join(' '); if (s !== last) { console.log((k / 4).toFixed(2), s, f[0].x.toFixed(0), f[1].x.toFixed(0)); last = s; } G.adv(.25); if (game.sceneName !== 'fight') break; }
console.log(KC.TUNE.pointsToWin, KC.DEVT.invincible, KC.Story.s.easier);
