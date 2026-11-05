// play one event live through the runner with the human autopiloted (the real input path); print the results
import { boot } from './harness.mjs';
const id = process.argv[2] || 'figure', perfect = process.argv[3] === 'perfect';
const h = boot(); const { O, game } = h;
O.meet = O.flow.newMeet({ mode: 'single', events: [id], players: [{ nation: 'SUN', input: game.input }], seed: 42 });
game.start({ scenes: O.scenes, scene: 'ev:' + id }); game.advance(.1);
O.autoAll = true; if (perfect) O.Dev = Object.assign(O.Dev || {}, { perfect: true });
let res = null; const orig = O.flow.eventDone; O.flow.eventDone = r => { res = r; };
const ok = h.until(() => res, 400, .1);
const ctx = O.Run.ctx;
console.log(id, ok ? '' : 'TIMEOUT phase=' + ctx.phase + ' sub=' + (ctx.s && ctx.s.phase), 'errors', h.errors().slice(0, 3).join(' | '));
if (res) for (const r of res.rows.slice(0, 8)) console.log(' ', r.rank, r.nation, r.human ? 'HUMAN' : '', r.display, r.notes.join(','));
if (id === 'figure' && ctx.s && ctx.s.rh) console.log('  counts', JSON.stringify(ctx.s.rh.counts), 'maxCombo', ctx.s.rh.maxCombo, 'total', ctx.s.rh.total);
if (id === 'figure' && ctx.s && ctx.s.rh) console.log('  missed', ctx.s.rh.notes.filter(n => !n.call && (n.j === 'miss' || n.dropped)).map(n => n.lane + '@' + n.step + (n.end > n.step ? 'h' + (n.end - n.step) : '') + (n.dropped ? 'D' : '')).join(' '));
