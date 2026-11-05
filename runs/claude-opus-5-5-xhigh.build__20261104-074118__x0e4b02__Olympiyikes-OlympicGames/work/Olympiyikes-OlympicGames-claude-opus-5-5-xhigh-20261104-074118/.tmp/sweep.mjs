import { boot } from '../tests/harness.mjs';
const [id, key, vals, skills, field] = process.argv.slice(2);
const h = boot(); const { O } = h;
O.flow = { quickMeet: e => ({ mode: 'single', seed: 1, events: [e], players: [], difficulty: 'Normal', medals: {}, yikes: {}, rival: 'TRB' }), eventDone() {} };
const def = O.EVENTS[id];
for (const v of vals.split(',')) { if (key !== '-') O.tune.set(id, key, +v); const line = [key + '=' + v];
  for (const sk of skills.split(',')) { const out = []; for (let seed = 1; seed <= 3; seed++) { O.meet = O.flow.quickMeet(id); O.meet.seed = seed * 101; const ath = O.makeAthletes(def, O.meet); const a = ath[0]; if (sk.startsWith('p')) { a.cheat = 'perfect'; } else a.skill = +sk; if (sk === 'pn') def.turboOk = false; const ctx = O.makeCtx(def, O.meet, ath); def.build && def.build(ctx); for (let r = 0; r < 2; r++) { ctx.round = r; const res = O.simAttempt(ctx, a); out.push(field ? res.info[field] : res.perf); } def.turboOk = undefined; }
    const ok = out.filter(x => x != null); line.push(sk + ':' + (ok.reduce((a, b) => a + b, 0) / ok.length).toFixed(1) + '[' + Math.min(...ok).toFixed(0) + '-' + Math.max(...ok).toFixed(0) + ']'); }
  console.log(line.join('  ')); }
