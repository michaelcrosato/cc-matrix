// Motion over time: while walking, leg and arm joints swing; idle, they settle; the player actually travels.
import { boot, newGame, step, T } from './lib.mjs';
const { e, g } = await boot(); await newGame(g, e);
const j = g.player.actor.joints; const sample = async (n) => { const L = [], A = [], X = []; for (let i = 0; i < n; i++) { await step(e, 3); L.push(j.LegR.rotation.x); A.push(j.ArmR.rotation.x); X.push(g.player.pos.x); } return { L, A, X }; };
const rng = (a) => Math.max(...a) - Math.min(...a);
e.input.setKey('KeyD', true); const w = await sample(40); e.input.setKey('KeyD', false);
T.ok(rng(w.L) > 0.3, 'walking swings the leg: range ' + rng(w.L).toFixed(2));
T.ok(rng(w.A) > 0.15, 'walking swings the arm: range ' + rng(w.A).toFixed(2));
T.ok(w.X[39] - w.X[0] > 1, 'the player travels while walking: ' + (w.X[39] - w.X[0]).toFixed(1));
await step(e, 60); const s = await sample(20);
T.ok(rng(s.L) < 0.08, 'standing still settles the leg: range ' + rng(s.L).toFixed(3));
console.log(T.count + ' checks, ' + T.fails + ' failures');
