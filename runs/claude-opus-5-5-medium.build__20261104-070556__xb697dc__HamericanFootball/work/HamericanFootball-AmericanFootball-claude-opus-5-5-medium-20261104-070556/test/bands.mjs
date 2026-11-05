// The plan's Play Lab bands (§8.6): every offensive play against the 8 non-kick defenses, Pro, Fiascos vs Mudhogs.
import { lab } from './lab.mjs';
import { load } from './lib/context.mjs';
const n = +process.argv[2] || 12;
const { FF } = load();
const defs = ['cover2', 'man', 'qb_spy', 'lb_blitz', 'zone_blitz', 'fiasco_blitz', 'prevent', 'goal_line'];
let bad = 0; const defMax = {};
for (const p of FF.data.plays.filter(p => p.tab !== 'SPECIAL')) {
  const rows = defs.map(d => lab(p.id, d, n)); const avg = rows.reduce((a, r) => a + r.avg, 0) / rows.length;
  const att = rows.reduce((a, r) => a + r.att, 0), comp = rows.reduce((a, r) => a + (r.comp === '-' ? 0 : r.comp * r.att / 100), 0), sacks = rows.reduce((a, r) => a + r.sacks, 0), stuck = rows.reduce((a, r) => a + r.stuck, 0);
  rows.forEach((r, i) => defMax[defs[i]] = Math.max(defMax[defs[i]] ?? -99, r.avg));
  const pass = p.type === 'pass', cp = att ? comp / att * 100 : 0, sk = sacks / (n * defs.length) * 100;
  const probs = [];
  if (stuck) probs.push('stuck ' + stuck);
  if (avg > 25) probs.push('avg > 25');
  if (pass && p.id !== 'hail_mary' && (cp < 35 || cp > 85)) probs.push('completion ' + cp.toFixed(0) + '%');
  if (p.id === 'hail_mary' && (cp < 5 || cp > 40)) probs.push('hail mary completion ' + cp.toFixed(0) + '%');
  if (pass && sk >= 25) probs.push('sacks ' + sk.toFixed(0) + '%');
  if (!pass && (avg < 1.5 || avg > 9)) probs.push('run avg ' + avg.toFixed(1));
  if (probs.length) bad++;
  console.log((probs.length ? 'OUT ' : 'ok  ') + p.id.padEnd(14) + ' avg ' + avg.toFixed(1) + (pass ? ' comp ' + cp.toFixed(0) + '% sacks ' + sk.toFixed(0) + '%' : '') + (probs.length ? '  <- ' + probs.join(', ') : ''));
}
for (const d of defs) if (defMax[d] < 1) { bad++; console.log('OUT defense ' + d + ' holds every play under 1 yd'); }
console.log(bad ? bad + ' outside the bands' : 'all inside the bands');
