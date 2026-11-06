import { playCase } from './lib.mjs';
export default async function ({ check, load }) {
  const ctx = load(); const G = ctx.GAME;
  for (const id of (process.env.CASES || 'c1').split(',')) {
    const r = playCase(G, id, { diff: 'Resident', cheat: false });
    check(`bot clears ${id}`, r.S.over === 'won', `${r.S.over} why=${r.S.why} t=${r.t.toFixed(0)} ph=${r.S.ph} vit=${r.S.vitals.toFixed(0)} clock=${r.S.clock.toFixed(0)} log=${r.log.join(' ')} err=${r.S.botError || ''} objs=${r.S.objs.filter(o=>!o.done).map(o=>o.type).join(',')}`);
  }
}
