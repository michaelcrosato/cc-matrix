import { playCase } from './lib.mjs';
export default async function ({ check, load }) {
  const ctx = load(); const G = ctx.GAME;
  for (const n of [1, 2, 3, 4]) {
    const def = G.grandRounds(n); G.CASES.gr = def;
    const r = playCase(G, 'gr', { players: n, def, maxT: 400 });
    check(`grand rounds with ${n} bot(s) finishes`, r.S.over === 'won', `${r.S.over} ph=${r.S.ph} t=${r.t.toFixed(0)} vit=${r.S.vitals.toFixed(0)} objs=${r.S.objs.filter(o => !o.done).map(o => o.type).join(',')} err=${r.S.botError || ''} scores=${r.S.pl.map(p => p.score)}`);
  }
}
