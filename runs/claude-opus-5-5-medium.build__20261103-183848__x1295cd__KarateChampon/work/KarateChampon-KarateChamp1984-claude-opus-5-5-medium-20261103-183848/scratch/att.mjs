import { loadGame } from '../tests/lib/load.mjs';
const G = loadGame(), { KC, game } = G; G.adv(.3); game.go('attract', { loop: 1 }, { fade: 0 }); G.adv(.3);
let last = '';
for (let k = 0; k < 120 * 50 && game.sceneName === 'fight'; k++) { G.adv(1 / 120); const S = game.scene, B = S.bout, D = S.d.director; const s = [B.phase, D.ex, D.prog, B.f[0].st, B.f[0].tech, B.f[1].st, B.f[1].tech, B.points].join(' '); if (s !== last) { console.log((k / 120).toFixed(2), s, B.f[0].x.toFixed(0), B.f[1].x.toFixed(0), B.calls[B.calls.length - 1]); last = s; } }
