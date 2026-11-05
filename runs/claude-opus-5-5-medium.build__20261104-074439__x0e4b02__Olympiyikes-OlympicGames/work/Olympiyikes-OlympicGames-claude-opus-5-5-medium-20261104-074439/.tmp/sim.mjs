import { boot } from '../tests/harness.mjs';
const c = boot({ quiet: false });
const O = c.OLY, game = O.game;
O.flow = { quickMeet: id => ({ mode: 'single', seed: 1, players: [], difficulty: 'Normal' }), eventDone() {} };
const id = process.argv[2], seeds = +(process.argv[3] || 1);
for (let sd = 1; sd <= seeds; sd++) {
O.meet = { mode: 'single', seed: sd, players: [], difficulty: 'Normal' };
const def = O.EVENTS[id];
const ctx = O.makeCtx(def, O.meet, { sandbox: true });
for (const a of ctx.athletes) a.mash = new O.Mash();
if (process.argv[4] === 'perfect') ctx.athletes[0].pilot.cheat = 'perfect';
if (process.argv[4]) { const k = +process.argv[4]; if (!isNaN(k)) ctx.athletes[0].pilot.skill = k; }
def.build && def.build(ctx);
const out = [];
if (def.format.type === 'race') { ctx.active = ctx.athletes.slice(); def.start(ctx); O.runToEnd(ctx, 80); for (const a of ctx.athletes) out.push([a.id, a.pilot.skill.toFixed(2), a.cur, a.notes.join(',')]); }
else if (def.format.type === 'attempts') { for (const a of ctx.athletes) { const vs = []; for (let r = 0; r < def.format.rounds; r++) { ctx.round = r; vs.push(O.simAttempt(ctx, a)); a.attempts.push(vs[vs.length-1]); } out.push([a.id, a.pilot.skill.toFixed(2), vs.map(v => v == null ? 'x' : (+v).toFixed(2)).join(' '), a.notes.join(',')]); } }
console.log('seed', sd); for (const o of out) console.log(o.join('  '));
}
console.log('errors', game.errors.length, game.errors.map(e => e.where + ': ' + e.message));
