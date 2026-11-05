import { boot } from './harness.mjs';
const { G } = boot(); const C = G.Campaign;
const diff = process.argv[2] || 'Normal'; const res = {}; let total = 0;
for (let realm = 0; realm < 4; realm++) for (let seed = 1; seed <= 5; seed++) {
  const S = C.create({ human: realm, seed: seed * 17 + realm, difficulty: diff }); let n = 0;
  while (!S.over && n++ < 30) {
    C.startTidings(S); if (S.over) break;
    C.aiMuster(S, S.human); C.aiMarch(S, S.human);
    const nb = G.ADJ[0].filter(c => S.castles[c].owner === S.human);
    if (nb.length) { const mk = C.marchersFor(S, S.human, 0); if (mk.length) C.declare(S, S.human, 0, mk.slice(0, 2).map(k => k.id)); }
    else { const t = C.targetsFor(S, S.human).filter(x => [13, 14, 15, 16, 0].includes(x)); for (const x of t.slice(0, 2)) { const mk = C.marchersFor(S, S.human, x); if (mk.length) C.declare(S, S.human, x, mk.slice(0, 2).map(k => k.id)); } }
    C.endMuster(S); C.resolveAI(S, true); if (S.over) break; C.endSeason(S);
  }
  const k = S.over ? S.over.kind : 'running'; res[k] = (res[k] || 0) + 1; total++;
  if (process.argv[3]) console.log('realm', realm, 'seed', seed, k, 'turn', S.turn, 'castles', C.castlesOf(S, S.human).length, 'candle', S.candle);
}
console.log(diff, JSON.stringify(res), 'of', total);
