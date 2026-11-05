import { load } from '../test/lib/load.mjs';
import { playUntil } from '../test/lib/bots.mjs';
const { game, G } = load({});
game.advance(.3);
G.debugTools.goto('location', { loc: 'pool' }); game.advance(.5);
game.go('poolhop', { from: 'pool' }, { fade: 0 }); game.advance(.05); const P = game.scene; P.bot = true;
for (let i = 0; i < 120 * 30; i++) { if (i % 240 === 0) console.log((i / 120).toFixed(1), P.state, 'beat', P.beat().toFixed(2), 'i', P.i, 'falls', P.falls, 'b0', P.b0, 'pos', JSON.stringify(G.game.audio.pos && { t: +G.game.audio.pos.t.toFixed(2), playing: G.game.audio.pos.playing })); game.advance(1 / 120); if (P.state === 'results') { console.log('results', JSON.stringify(P.result)); break; } }
