import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h; const def = O.EVENTS.hockey;
O.meet = O.flow.newMeet({ mode: 'single', events: ['hockey'], players: [], seed: 31 });
const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); ctx.teams[0].skill = .7; ctx.teams[1].skill = .7;
O.sandbox = true; def.start(ctx); let lastScore = 0, saves = 0; const hist = {};
for (let i = 0; i < 60 * 1200 && !def.done(ctx); i++) { for (const a of ath) O.pilot(ctx, a, 1 / 60); const P = ctx.s.puck, pre = { x: P.x, y: P.y, vx: P.vx, vy: P.vy, shot: P.shot, owner: !!P.owner, last: P.last && (P.last.goalie ? 'G' : 'S') + P.last.team }; const g = ctx.s.sk.filter(k => k.goalie).map(k => [k.x.toFixed(0), k.y.toFixed(0)]); def.step(ctx, 1 / 60); const sc = ctx.s.score[0] + ctx.s.score[1]; if (sc !== lastScore) { lastScore = sc; const key = (pre.shot ? 'shot' : 'loose') + ' v=' + Math.round(Math.hypot(pre.vx, pre.vy) / 50) * 50; hist[key] = (hist[key] || 0) + 1; if (sc < 6) console.log('GOAL', JSON.stringify(pre), 'goalies', JSON.stringify(g)); } }
console.log(ctx.s.score, hist);
