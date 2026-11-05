import { loadGame } from '../tests/lib/load.mjs';
const { KC, game } = loadGame();
const [ida = 'taro', idb = 'taro', pairs = '5:1,5:5,5:9,9:1,10:3'] = process.argv.slice(2);
function match(la, lb, seed) {
  const a = new KC.Karateka(ida, 0), b = new KC.Karateka(idb, 1), A = new KC.KarateAI({ id: ida, level: la, seed }), Bai = new KC.KarateAI({ id: idb, level: lb, seed: seed + 99 });
  const B = new KC.Bout({ fighters: [a, b], ctrl: [(f, o, bb) => A.control(f, o, bb), (f, o, bb) => Bai.control(f, o, bb)], seed, intro: false });
  const hits = {}; B.on('point', p => { hits[p.tech] = (hits[p.tech] || 0) + 1; });
  let k = 0; for (; k < 120 * 400 && B.phase !== 'over'; k++) B.update(1 / 120);
  return { w: B.matchWinner, secs: k / 120, hits };
}
for (const pr of pairs.split(',')) { const [la, lb] = pr.split(':').map(Number); let w = 0, secs = 0; const H = {}; for (let s = 1; s <= 10; s++) { const r = match(la, lb, s); if (r.w === 0) w++; secs += r.secs; for (const k in r.hits) H[k] = (H[k] || 0) + r.hits[k]; } console.log(ida, la, 'vs', idb, lb, 'wins', w + '/10', 'avg s', (secs / 10).toFixed(0), JSON.stringify(H)); }
console.log('errors', game.errors.map(e => e.message));
