import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h; const def = O.EVENTS.curling; let w = 0; const out = [];
for (let k = 10; k < 30; k++) { O.meet = O.flow.newMeet({ mode: 'single', events: ['curling'], players: [], seed: 100 + k * 17 }); const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); ctx.teams[k % 2].skill = .9; ctx.teams[1 - k % 2].skill = .3; O.sandbox = true; def.start(ctx); for (let i = 0; i < 60 * 1500 && !def.done(ctx); i++) { for (const a of ath) O.pilot(ctx, a, 1 / 60); def.step(ctx, 1 / 60); } O.sandbox = false; const s = ctx.s, hi = k % 2; out.push(s.score[hi] + '-' + s.score[1 - hi]); if (s.score[hi] > s.score[1 - hi]) w++; }
console.log('hi wins', w, out.join(' '));
