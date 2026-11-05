import { load } from './lib.mjs'; const { game, G } = load(); const { Match, Flow, Bus } = G; game.advance(.1);
const c = {}; Bus.on('*', e => { c[e.type] = (c[e.type] || 0) + 1; });
let out = [];
for (let g = 0; g < 4; g++) { const m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, periodLen: 90, diff: 1, shootout: false, ot: false, seed: 20 + g, noReplay: true }); const dist = []; Bus.on('shot', e => dist.push(Math.hypot(Sim_.oppGoalX(m, e.s.side) - e.s.x, 400 - e.s.y) | 0)); const Sim_ = G.Sim; for (let i = 0; i < 120 * 280 && !m.over; i++) Flow.step(m, 1 / 120); out.push(dist.slice(0, 14).join(',')); }
console.log(JSON.stringify(c)); console.log(out.join('\n'));
