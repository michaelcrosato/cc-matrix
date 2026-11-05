import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.2); const I = game.input;
G.Drills.start(2); game.advance(.8); const all = []; G.Bus.on('*', e => all.push(e));
const M = G.M, s = M.humans[0].s;
for (let k = 0; k < 12; k++) { const m = M.skaters.find(o => o.team === 0 && o !== s); console.log(k, 'owner', M.puck.owner && M.puck.owner.id, 'me', s.id, 'mate', m.id, Math.round(m.x), Math.round(m.y), 'humanS', M.humans[0].s.id); if (M.puck.owner === s) I.tap('pass'); game.advance(1); }
console.log(all.filter(e => ['pass', 'pass_complete', 'possession', 'intercept'].includes(e.type)).map(e => e.type + ':' + (e.from || e.by) + '>' + (e.to || '')).join(' '));
