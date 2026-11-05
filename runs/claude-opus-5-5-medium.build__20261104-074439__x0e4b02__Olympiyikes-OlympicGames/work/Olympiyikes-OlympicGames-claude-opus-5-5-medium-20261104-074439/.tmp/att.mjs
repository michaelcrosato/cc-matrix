import { boot } from '../tests/harness.mjs';
const c = boot(); const O = c.OLY, game = O.game; game.advance(10.5); let last = '', t0 = Date.now();
for (let i = 0; i < 2000; i++) { game.advance(.25); const k = game.sceneName + ' ' + (O.ctx && game.sceneName.startsWith('ev:') ? O.ctx.phase : ''); if (k !== last) { console.log((i/4).toFixed(1), k, Date.now() - t0); last = k; } }
console.log(game.errors.map(e => e.message));
