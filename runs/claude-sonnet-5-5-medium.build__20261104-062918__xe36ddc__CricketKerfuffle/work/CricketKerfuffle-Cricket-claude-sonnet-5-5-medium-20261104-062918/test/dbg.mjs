import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ctx = { console, setTimeout, clearTimeout }; vm.createContext(ctx);
for (const f of ['../engine/my-3d2dge.js', '../dist/game.js']) vm.runInContext(readFileSync(new URL(f, import.meta.url), 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, I = game.input, D = game.debug;
game.advance(.5);
D.startMatch({ mode: 'quick', overs: 1, wickets: 2, diff: 1, opp: 'witt', ground: 'green', chaos: 'all', seed: 99 }); game.advance(1);
for (let i = 0; i < 12; i++) { game.advance(1); const M = D.match(); console.log(i, D.snapshot().scene, M && M.ph, M && M.t.toFixed(2), game.time.toFixed(2), game.paused, game.errors.length && game.errors[0].message); }
