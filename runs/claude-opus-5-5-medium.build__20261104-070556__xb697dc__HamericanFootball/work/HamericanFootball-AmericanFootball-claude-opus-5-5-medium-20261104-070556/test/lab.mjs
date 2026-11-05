// Play Lab: n plays of an offense vs a defense from midfield, 1st & 20, both CPU; prints the averages per play.
import { load } from './lib/context.mjs';
const { FF, game } = load();
const S = FF.sim;
export function lab(off, def, n = 30, seed = 1) {
  const out = { yards: 0, comp: 0, att: 0, sacks: 0, ints: 0, fum: 0, tds: 0, time: 0, max: 0, stuck: 0, n };
  for (let i = 0; i < n; i++) {
    S.newMatch({ home: 'fiascos', away: 'mudhogs', seed: seed * 1000 + i, qLen: 600, start: { possession: 0, los: 50, down: 1, toGo: 20 } });
    const ev = {}; const un = FF.bus.on('*', e => { ev[e.ev] = (ev[e.ev] || 0) + 1; });
    S.calls = [{ play: FF.play(off), flip: i % 2 === 1 }, { play: FF.play(def), flip: false }]; S.callsDone();
    let k = 0; const los = S.los;
    while (S.phase !== 'DEAD' && S.phase !== 'CELEBRATE' && k < 120 * 45) { S.update(1 / 120); k++; }
    un();
    const P = S.play, res = P.result || {};
    let yd = res.type === 'td' ? Math.round((S.goalX(0) - los) / 16) : res.x !== undefined ? (res.x - los) / 16 : 0;
    if (S.ball.team !== 0) yd = Math.min(yd, 0);
    out.yards += yd; out.time += P.t; out.max = Math.max(out.max, P.t); if (P.t > 25) out.stuck++;
    out.att += ev.pass ? 1 : 0; out.comp += ev.catch && !ev.int ? 1 : 0; out.sacks += ev.sack || 0; out.ints += ev.int || 0; out.fum += ev.fumble || 0; out.tds += res.type === 'td' ? 1 : 0;
  }
  const r = x => Math.round(x * 10) / 10;
  return { off, def, avg: r(out.yards / n), comp: out.att ? r(out.comp / out.att * 100) : '-', att: out.att, sacks: out.sacks, ints: out.ints, fum: out.fum, tds: out.tds, t: r(out.time / n), max: r(out.max), stuck: out.stuck, errors: game.errors.length };
}
if (process.argv[1].endsWith('lab.mjs')) {
  const offs = process.argv[2] ? process.argv[2].split(',') : FF.data.plays.filter(p => p.tab !== 'SPECIAL').map(p => p.id);
  const defs = process.argv[3] ? process.argv[3].split(',') : ['cover2', 'man', 'lb_blitz', 'prevent'];
  const n = +process.argv[4] || 12;
  for (const o of offs) { const rows = defs.map(d => lab(o, d, n)); const avg = rows.reduce((a, r) => a + r.avg, 0) / rows.length; console.log(o.padEnd(14), 'avg', avg.toFixed(1), rows.map(r => `${r.def}:${r.avg}y c${r.comp}% s${r.sacks} i${r.ints} f${r.fum} td${r.tds} t${r.t}/${r.max}${r.stuck ? ' STUCK' + r.stuck : ''}`).join('  ')); }
}
