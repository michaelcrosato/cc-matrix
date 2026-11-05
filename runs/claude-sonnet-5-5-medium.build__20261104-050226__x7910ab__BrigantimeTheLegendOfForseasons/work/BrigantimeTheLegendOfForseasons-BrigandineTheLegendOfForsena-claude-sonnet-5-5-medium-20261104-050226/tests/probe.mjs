import { G } from './sim.mjs';
const t0 = Date.now();
// skirmish AI vs AI
let w = [0, 0], bells = 0;
for (let s = 1; s <= 20; s++) { const sp = G.makeSkirmish(s, { ai: true }); const S = G.Battle.create(sp); G.BattleAI.auto(S); w[S.winner]++; bells += S.bell; if (S.reason === 'stalled') console.log('stalled', s); }
console.log('skirmish att/def wins', w, 'avg bell', bells / 20, Date.now() - t0, 'ms');
// campaign all AI (human = 0 but we also let AI march for human realm)
for (const seed of [1, 2, 3]) {
  const S = G.Campaign.create({ human: 0, seed }); let n = 0;
  while (!S.over && n++ < 20) {
    G.Campaign.startTidings(S);
    G.Campaign.aiMuster(S, 0); G.Campaign.aiMarch(S, 0); G.Campaign.endMuster(S);
    G.Campaign.resolveAI(S, true);
    if (S.over) break; G.Campaign.endSeason ? 0 : 0;
    if (S.candle != null && S.candle <= 0) { S.over = { won: false, kind: 'candle' }; }
  }
  console.log('seed', seed, 'turns', S.turn, JSON.stringify(S.over), 'owners', S.castles.map(c => c.owner).join(''), 'mana', S.realms.map(r => r.mana).join(','), 'battles', S.stats.battles);
}
console.log(Date.now() - t0, 'ms');
