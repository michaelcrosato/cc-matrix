import { G } from './sim.mjs';
const { createMatch } = G;
G.RNG.play = G.mkrng(7);
const M = createMatch({ overs: 2, wickets: 3, diff: 1, chaos: 'none' }); M.start();
let n = 0;
G.on('contact', e => { if (n++ < 6) console.log('contact', JSON.stringify(e)); });
G.on('pickup', e => { console.log('  pickup by', e.id, 'at t', M.t.toFixed(2), 'ball', M.ball.x | 0, M.ball.y | 0); });
G.on('ball:end', e => { if (n < 7) console.log('  end', e.kind, e.runs, 't', M.t.toFixed(2)); });
let st = 0; while (!M.over && st < 120 * 100 && n < 7) { M.step(1 / 120, {}); st++; }
