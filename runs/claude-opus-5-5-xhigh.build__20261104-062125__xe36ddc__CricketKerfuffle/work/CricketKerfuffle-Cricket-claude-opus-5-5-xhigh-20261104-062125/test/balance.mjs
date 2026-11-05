// node test/balance.mjs [matches] [difficulty]: CPU v CPU matches on every ground; prints run rate, wickets an over,
// boundary share, extras share, grades and how balls ended (it reports, never gates).
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url), N = +(process.argv[2] || 4), diff = process.argv[3] || 'county';
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'), ctx); vm.runInContext(readFileSync(new URL('dist/game.js', root), 'utf8'), ctx);
const K = ctx.__kerfuffle; K.Tuning.persist = false; K.Tuning.init(); K.Tuning.difficulty = diff;
const tot = { runs: 0, balls: 0, wkts: 0, b4: 0, b6: 0, ex: 0, legal: 0, grades: {}, dead: {}, how: {}, ran: 0, shots: {}, caps: 0, matches: 0, t: 0 };
const pairs = [['ker', 'mud'], ['gen', 'lar'], ['mag', 'thr'], ['lar', 'ker'], ['mud', 'gen']];
let seed = 1;
for (const g of K.GROUND_IDS) for (let i = 0; i < N; i++) {
  const m = new K.Match({ teams: pairs[(i + seed) % pairs.length], ground: g, overs: 2, wickets: 5, seed: seed++, difficulty: diff });
  const off = K.bus.on('timeout', d => { if (d.phase === 'inPlay') tot.caps++; });
  m.start(); let t = 0; while (m.phase !== 'done' && t < 1500) { m.step(1 / 120); t += 1 / 120; }
  off(); tot.matches++; tot.t += t;
  for (const inn of m.innings) { if (inn.posted) continue; tot.runs += inn.runs; tot.balls += inn.balls; tot.wkts += inn.wkts; tot.ex += inn.extras.wd + inn.extras.nb + inn.extras.b + inn.extras.lb;
    for (const r of inn.recs) { if (r.boundary === 4) tot.b4++; if (r.boundary === 6) tot.b6++; tot.ran += r.ran || 0; tot.grades[r.grade || 'none'] = (tot.grades[r.grade || 'none'] || 0) + 1; tot.dead[r.dead] = (tot.dead[r.dead] || 0) + 1; if (r.wicket) tot.how[r.wicket.how] = (tot.how[r.wicket.how] || 0) + 1; if (r.shot) tot.shots[r.shot] = (tot.shots[r.shot] || 0) + 1; } }
}
const ov = tot.balls / 6;
console.log(`${tot.matches} matches (${diff}), ${(tot.t / tot.matches).toFixed(0)} s each: ${(tot.runs / ov).toFixed(1)} runs/over, ${(tot.wkts / ov).toFixed(2)} wkts/over, 4s ${tot.b4} 6s ${tot.b6} (boundary share ${((tot.b4 * 4 + tot.b6 * 6) / tot.runs * 100).toFixed(0)}%), runs run ${tot.ran}, extras ${(tot.ex / tot.runs * 100).toFixed(0)}%, inPlay caps ${tot.caps}`);
console.log('grades', JSON.stringify(tot.grades)); console.log('dead', JSON.stringify(tot.dead)); console.log('out', JSON.stringify(tot.how)); console.log('shots', JSON.stringify(tot.shots));
