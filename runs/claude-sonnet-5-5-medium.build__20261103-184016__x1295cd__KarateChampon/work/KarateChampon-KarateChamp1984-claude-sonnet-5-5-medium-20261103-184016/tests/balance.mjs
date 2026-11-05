import { fresh } from './lib/helpers.mjs';
const G = fresh(), { KC } = G, { Bout, KarateAI } = KC.test;
export function match(idA, lA, idB, lB, seed, swap) {
  const ids = swap ? [idB, idA] : [idA, idB], lv = swap ? [lB, lA] : [lA, lB];
  const ais = ids.map((id, i) => new KarateAI({ id, level: lv[i], seed: seed * 2 + i }));
  const b = new Bout({ ids, seed, ctrl: ais.map(a => (m, f, bo) => a.intent(m, f, bo)) }); b.start(); const hits = {};
  b.on('point', p => { hits[p.tech] = hits[p.tech] || { n: 0, full: 0 }; hits[p.tech].n++; if (p.full) hits[p.tech].full++; });
  let n = 0; while (!b.done && n < 120 * 600) { b.update(1 / 120); n++; }
  const w = swap ? 1 - b.matchWinner : b.matchWinner; return { w, secs: n / 120, rounds: b.rounds, hits };
}
if (process.argv[1].endsWith('balance.mjs')) {
  const N = +process.argv[2] || 12;
  for (const [la, idb, lb] of [[5, 'taro', 1], [5, 'taro', 2], [5, 'taro', 3], [5, 'taro', 5], [5, 'taro', 9]]) {
    let w = 0, secs = 0; for (let s = 1; s <= N; s++) { const r = match('taro', la, idb, lb, s, s % 2 === 0); w += r.w === 0 ? 1 : 0; secs += r.secs; } console.log(`taro L${la} vs ${idb} L${lb}: ${w}/${N} wins, mean ${(secs / N).toFixed(0)}s`);
  }
  const cov = {}; let full = 0, tot = 0; const pool = ['taro','kamaboko','negi','ebi','kikurage','ika','buta','asari','kyabetsu','mei']; for (let s = 1; s <= 60; s++) { const r = match(pool[s % 10], 5, pool[(s * 3 + 1) % 10], 5, 100 + s, s % 2); for (const k in r.hits) { cov[k] = (cov[k] || 0) + r.hits[k].n; full += r.hits[k].full; tot += r.hits[k].n; } }
  console.log('coverage', JSON.stringify(cov), 'full share', (full / tot).toFixed(2), 'total', tot);
}
