import { fresh, fightBout, run } from './lib/helpers.mjs';
export default async t => {
  const G = fresh(), { KC } = G, { Bout, KarateAI } = KC.test;
  const play = (idA, lA, idB, lB, seed, swap, cap = 120 * 400) => {
    const ids = swap ? [idB, idA] : [idA, idB], lv = swap ? [lB, lA] : [lA, lB], ais = ids.map((id, i) => new KarateAI({ id, level: lv[i], seed: seed * 2 + i }));
    const b = new Bout({ ids, seed, ctrl: ais.map(a => (m, f, bo) => a.intent(m, f, bo)) }); b.start(); const hits = {}, hash = []; b.on('point', p => { hits[p.tech] = hits[p.tech] || { n: 0, full: 0 }; hits[p.tech].n++; if (p.full) hits[p.tech].full++; });
    let n = 0; while (!b.done && n < cap) { b.update(1 / 120); n++; if (n % 120 === 0) hash.push(Math.round(b.f[0].x) + ':' + Math.round(b.f[1].x) + ':' + b.pts.join('/') + b.phase); }
    return { done: b.done, w: b.done ? (swap ? 1 - b.matchWinner : b.matchWinner) : -1, secs: n / 120, rounds: b.rounds.slice(), hits, hash: hash.join('|') };
  };
  // every personality at an easy and a hard level completes inside 6 simulated minutes
  const ids = KC.ROSTER.map(f => f.id);
  for (const id of ids.slice(1)) for (const L of [1, 10]) { const r = play(id, L, 'taro', 5, 7 + L, false); t.check(`${id} L${L} finishes a match under 6 min`, r.done && r.secs < 360, r.secs); }
  { const a = play('negi', 6, 'ebi', 4, 21, false), b = play('negi', 6, 'ebi', 4, 21, false); t.check('same seed gives the same match', a.hash === b.hash && a.rounds.join() === b.rounds.join()); const c = play('negi', 6, 'ebi', 4, 22, false); t.check('another seed plays differently', c.hash !== a.hash); }
  // level ordering: the Autopilot (taro L5) against the same personality at L1-3, L5 and L9, sides swapped
  let w13 = 0, n13 = 0, w5 = 0, n5 = 0, w9 = 0, n9 = 0, secsSum = 0, rounds = 0;
  for (let s = 1; s <= 14; s++) for (const L of [1, 2, 3]) { const r = play('taro', 5, 'taro', L, s * 5 + L, s % 2 === 0); n13++; if (r.w === 0) w13++; }
  for (let s = 1; s <= 24; s++) { const r = play('taro', 5, 'taro', 5, 500 + s, s % 2 === 0); n5++; if (r.w === 0) w5++; secsSum += r.secs; rounds += r.rounds[0] + r.rounds[1]; const q = play('taro', 5, 'taro', 9, 900 + s, s % 2 === 0); n9++; if (q.w === 0) w9++; }
  t.check(`L5 beats L1-3 in at least 70% (got ${(100 * w13 / n13).toFixed(0)}%)`, w13 / n13 >= .7); t.check(`L5 vs L5 is even, 30-70% (got ${(100 * w5 / n5).toFixed(0)}%)`, w5 / n5 >= .3 && w5 / n5 <= .7); t.check(`L5 loses to L9 (won ${(100 * w9 / n9).toFixed(0)}%, at most 25%)`, w9 / n9 <= .25);
  t.check(`mean round length 15-45 s at equal level (got ${(secsSum / Math.max(1, rounds)).toFixed(0)})`, secsSum / Math.max(1, rounds) >= 15 && secsSum / Math.max(1, rounds) <= 45);
  // coverage across 60 seeded CPU-vs-CPU matches
  { const cov = {}, pool = ids; let full = 0, tot = 0; for (let s = 1; s <= 60; s++) { const r = play(pool[s % 10], 5, pool[(s * 3 + 1) % 10], 5, 100 + s, s % 2, 120 * 200); for (const k in r.hits) { cov[k] = (cov[k] || 0) + r.hits[k].n; full += r.hits[k].full; tot += r.hits[k].n; } }
    const missing = KC.SCORING.filter(x => !cov[x.id]).map(x => x.id); t.check('at least 14 of 15 scoring techniques land across 60 matches (missing: ' + missing.join() + ')', missing.length <= 1);
    const maxShare = Math.max(...Object.values(cov)) / tot; t.check(`no technique has more than 35% of hits (max ${(maxShare * 100).toFixed(0)}%)`, maxShare <= .35); t.check(`full points are 30-75% of hits (${(100 * full / tot).toFixed(0)}%)`, full / tot >= .3 && full / tot <= .75); }
  // reaction: a level-8 CPU answers a front sweep (low) with a jump at least half the time
  { let jumped = 0, N = 24; for (let s = 0; s < N; s++) { const b = fightBout(G, ['taro', 'negi'], { seed: s }); const ai = new KarateAI({ id: 'negi', level: 8, seed: s + 3 }); b.ctrl = [null, (m, f, bo) => ai.intent(m, f, bo)]; b.f[0].x = 150; b.f[1].x = 150 + 18 + 30; b.f[0].frozen = b.f[1].frozen = false; run(b, 30); b.f[0].start('frontSweep', b.f[1], 'n', 'd'); let did = false; for (let i = 0; i < 90 && !b.pending; i++) { b.update(1 / 120); const t2 = b.f[1].tech; if (t2 && ['jump', 'jumpSide', 'frontFlip', 'backFlip', 'jumpBack', 'backRoll'].includes(t2.id)) did = true; } if (did) jumped++; } t.check(`L8 answers a sweep with a jump or flip in at least 50% (${jumped}/${N})`, jumped >= N * .5); }
  // showcase mode cycles through all 15 scoring techniques inside one exhibition
  { const ais = [new KarateAI({ id: 'taro', mode: 'showcase', seed: 1 }), new KarateAI({ id: 'ebi', mode: 'showcase', seed: 2, start: 7 })]; const b = new Bout({ ids: ['taro', 'ebi'], seed: 1, ctrl: ais.map(a => (m, f, bo) => a.intent(m, f, bo)), single: true }); b.start(); b.invincible = [true, true]; b.infiniteTime = true; const seen = new Set();
    for (let i = 0; i < 120 * 600; i++) { b.update(1 / 120); for (const f of b.f) if (f.tech && f.t === 1) seen.add(f.tech.id); } const miss = KC.SCORING.filter(x => !seen.has(x.id)).map(x => x.id); t.check('showcase mode throws all 15 techniques (missing: ' + miss.join() + ')', miss.length === 0); }
};
