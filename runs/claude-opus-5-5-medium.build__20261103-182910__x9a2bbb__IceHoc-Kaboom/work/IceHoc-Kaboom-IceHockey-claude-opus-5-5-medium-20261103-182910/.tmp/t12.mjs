import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.2);
G.Story.cur = { n: 5, attempt: 2, choice: { doris: 'early' } };
game.go('match', G.Story.config(5, { onOver: () => {}, intros: false }), { fade: 0 }); game.advance(.1);
const M = G.M; let last = '';
for (let i = 0; i < 30 * 60 * 10 && !M.finished; i++) { if (M.phase === 'intermission') game.input.tap('deke'); game.advance(1 / 30); const k = M.period + ' ' + M.phase; if (k !== last) { last = k; console.log(k, Math.round(M.clock), M.boostOn, M.organDone, M.cfg.boss, M.cfg.doris); } }
