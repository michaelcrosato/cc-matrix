import { load } from '../tests/lib.mjs';
import { botStep } from '../tests/bot.mjs';
const { game, G } = load(''); game.advance(.2);
G.Story.cur = { n: 1, attempt: 1, choice: { tactic: 'grit' } };
game.go('match', G.Story.config(1, { onOver: () => {}, intros: false }), { fade: 0 }); game.advance(.1);
const all = []; G.Bus.on('*', e => all.push(e)); let i = 0; const M = G.M;
while (!M.finished && i++ < 30 * 60 * 14) { botStep(G, game); if (M.phase === 'intermission') game.input.tap('deke'); if (M.phase === 'replay') game.input.tap('confirm'); game.advance(1 / 30); }
const ot = all.filter(e => e.type === 'shot' && e.kind === 'onetimer');
console.log('onetimer shots by team', [0, 1].map(t => ot.filter(e => e.team === t).length), 'onGoal', ot.filter(e => e.onGoal).length, 'passes team0', all.filter(e => e.type === 'pass' && e.team === 0).length, 'goals', all.filter(e => e.type === 'goal').map(e => e.team + ':' + e.kind).join(' '));
const saves = all.filter(e => e.type === 'save'); console.log('saves', saves.length);
