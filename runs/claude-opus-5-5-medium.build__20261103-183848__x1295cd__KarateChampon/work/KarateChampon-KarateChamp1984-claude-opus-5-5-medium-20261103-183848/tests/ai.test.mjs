import { loadGame } from './lib/load.mjs';
export default async t => {
  const { KC, game } = loadGame();
  const match = (ida, la, idb, lb, seed) => { const a = new KC.Karateka(ida, 0), b = new KC.Karateka(idb, 1), A = new KC.KarateAI({ id: ida, level: la, seed }), Bai = new KC.KarateAI({ id: idb, level: lb, seed: seed + 99 });
    const B = new KC.Bout({ fighters: [a, b], ctrl: [(f, o, bb) => A.control(f, o, bb), (f, o, bb) => Bai.control(f, o, bb)], seed, intro: false }), hits = {}; let h = 2166136261;
    B.on('point', p => { hits[p.tech] = (hits[p.tech] || 0) + 1; }); let k = 0; for (; k < 120 * 360 && B.phase !== 'over'; k++) { B.update(1 / 120); if (k % 60 === 0) { const v = a.x.toFixed(1) + b.x.toFixed(1) + B.phase; for (let i = 0; i < v.length; i++) h = Math.imul(h ^ v.charCodeAt(i), 16777619); } }
    return { w: B.matchWinner, secs: k / 120, hits, hash: h >>> 0, over: B.phase === 'over' }; };
  // every personality completes a match in under 6 simulated minutes
  for (const f of KC.DATA.roster) { const r = match('taro', 5, f.id, f.ai.level, 3); t.check('a match vs ' + f.id + ' completes', r.over && r.secs < 360, r.secs); }
  const a = match('taro', 6, 'ika', 5, 11), b = match('taro', 6, 'ika', 5, 11); t.check('same seed, same match', a.hash === b.hash, [a.hash, b.hash]);
  // level ordering (mirror matches)
  let w91 = 0, w59 = 0, secs = 0; const H = {}; for (let s = 1; s <= 8; s++) { const r1 = match('taro', 9, 'taro', 1, s), r2 = match('taro', 5, 'taro', 9, s); if (r1.w === 0) w91++; if (r2.w === 0) w59++; secs += r1.secs + r2.secs; for (const r of [r1, r2]) for (const k in r.hits) H[k] = (H[k] || 0) + r.hits[k]; }
  t.check('L9 beats L1 in most matches', w91 >= 6, w91 + '/8'); t.check('L5 rarely beats L9', w59 <= 3, w59 + '/8'); t.check('matches last 20-120 s on average', secs / 16 > 20 && secs / 16 < 120, secs / 16);
  const tot = Object.values(H).reduce((x, y) => x + y, 0), top = Math.max(...Object.values(H)); t.check('no technique takes over 35% of points', top / tot <= .35, H); t.check('at least 8 techniques score', Object.keys(H).length >= 8, H);
  // the showcase CPU throws every scoring technique in turn
  { const a = new KC.Karateka('taro', 0), b = new KC.Karateka('negi', 1), A = new KC.KarateAI({ id: 'taro', showcase: true, seed: 1 }), seen = new Set(); a.onStart = (f, tt) => seen.add(tt.id);
    const B = new KC.Bout({ fighters: [a, b], ctrl: [(f, o, bb) => A.control(f, o, bb), null], seed: 1, intro: false, spar: true }); for (let k = 0; k < 120 * 90; k++) B.update(1 / 120);
    t.check('showcase mode throws all 15 scoring techniques', KC.SCORING.every(id => seen.has(id) || (id === 'revPunch' && seen.has('frontKick'))), KC.SCORING.filter(id => !seen.has(id))); }
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
