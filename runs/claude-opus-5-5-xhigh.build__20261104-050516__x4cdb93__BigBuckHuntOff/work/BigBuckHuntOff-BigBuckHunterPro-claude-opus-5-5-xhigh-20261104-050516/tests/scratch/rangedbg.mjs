import { load } from '../lib/load.mjs';
const L = load({}), X = L.game.debug.internals, D = L.game.debug; L.step(1);
X.startHunt({ mode: 'range', hunt: 'range', seed: 3 }); L.step(.6); const H = X.G.hunt; D.bot(true, { skill: 'expert', cheat: true });
for (let t = 0; t < 200; t += 1) { L.step(1); const B = H.bonus; const k = H.seg && H.seg.kind; if (t % 4 === 0 || k !== 'range') console.log('t', t, k, 'st', H.seg && H.seg.kind === 'range' && X.HUD.cap ? '' : '', 'cap', X.HUD.cap && X.HUD.cap.text, 'targets', B ? B.targets.filter(T => T.alive).map(T => T.kind).join(',') : '-', 'shots', B && B.shots, 'scoped', H.players[0].scope.up); if (k !== 'range') break; }
console.log(L.errs());
