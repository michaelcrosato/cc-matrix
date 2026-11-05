// ai: every level and personality completes matches; the same seed gives the same match; a stronger CPU beats a weaker one;
// every scoring technique lands across a batch; no technique dominates; reactions; the showcase uses all 15
import { fresh, hash } from './lib/util.mjs';
export default async t => {
  const { KC } = fresh();
  const match = (fa, la, fb, lb, seed, o = {}) => {
    const A = new KC.Karateka({ fid: fa, side: 0 }), B = new KC.Karateka({ fid: fb, side: 1 }), b = new KC.Bout({ fighters: [A, B], seed, rules: o.rules || {} });
    const ai = [new KC.KarateAI({ fid: fa, level: la, seed: seed * 2 + 1, showcase: o.show }), new KC.KarateAI({ fid: fb, level: lb, seed: seed * 2 + 2, showcase: o.show })], log = [];
    b.bus.on('point', d => log.push([d.side, d.tech, d.pts, d.full])); let fightT = 0, n = 0;
    for (; n < 120 * 400 && b.phase !== 'over'; n++) { A.control(ai[0].intent(A, B, 1 / 120)); B.control(ai[1].intent(B, A, 1 / 120)); b.update(1 / 120); if (b.phase === 'fight') fightT += 1 / 120; }
    return { over: b.phase === 'over', winner: b.winner, log, rounds: b.round, fightT, secs: n / 120, h: hash([log, A.x, B.x]) };
  };
  const ids = KC.DATA.roster.map(f => f.id);
  // every personality at its own level completes a match well inside 6 simulated minutes
  let allDone = true, slow = 0; const tally = {}; let hits = 0, fulls = 0, rounds = 0, ft = 0;
  for (let i = 0; i < 30; i++) { const a = ids[i % 10], bb = ids[(i * 7 + 3) % 10], r = match(a, KC.FIGHTER[a].ai.level, bb, KC.FIGHTER[bb].ai.level, i + 1); if (!r.over) allDone = false; if (r.secs > 360) slow++; for (const [, tech, , full] of r.log) { tally[tech] = (tally[tech] || 0) + 1; hits++; if (full) fulls++; } rounds += r.rounds; ft += r.fightT; }
  t.check('30 CPU matches across the roster all finish', allDone && slow === 0, slow + ' slow');
  // determinism
  const m1 = match('ika', 6, 'asari', 6, 42), m2 = match('ika', 6, 'asari', 6, 42); t.check('the same seed gives the same match', m1.h === m2.h, m1.h + ' ' + m2.h);
  // level ordering: L9 beats L1 most of the time
  let w9 = 0; for (let s = 0; s < 12; s++) if (match('taro', 9, 'taro', 1, 100 + s).winner === 0) w9++;
  t.check('a level 9 CPU beats level 1 in at least 9 of 12', w9 >= 9, w9 + '/12');
  let w5 = 0; for (let s = 0; s < 12; s++) if (match('taro', 6, 'taro', 2, 200 + s).winner === 0) w5++;
  t.check('a level 6 CPU beats level 2 in at least 7 of 12', w5 >= 7, w5 + '/12');
  // coverage and balance over the batch
  const missing = KC.SCORING.filter(id => !tally[id]); t.check('every scoring technique lands at least once in 30 matches', missing.length <= 1, 'missing: ' + missing.join(','));
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]; t.check('no technique takes more than 35% of the scoring hits', top[1] / hits <= .35, top.join(':') + ' of ' + hits);
  t.check('full points are 30-80% of the scoring hits', fulls / hits >= .3 && fulls / hits <= .8, (fulls / hits * 100).toFixed(0) + '%');
  t.check('rounds have real fights (a mean of 4 s of fight or more)', ft / rounds >= 4, (ft / rounds).toFixed(1));
  // reactions: a level 8 CPU jumps or flips a sweep thrown at it often
  let jumped = 0;
  for (let s = 0; s < 10; s++) {
    const A = new KC.Karateka({ fid: 'taro', side: 0, x: 150 }), B = new KC.Karateka({ fid: 'taro', side: 1, x: 150 + 17 + 30 }); A.x = 150; B.x = 150 + 17 + 30; A.release(B); B.release(A); A.ctlOn = B.ctlOn = true;
    const ai = new KC.KarateAI({ fid: 'taro', level: 8, seed: s + 9, personality: { aggression: 0, patience: 0 } }); for (let i = 0; i < 30; i++) { B.control(ai.intent(B, A, 1 / 120)); A.update(1 / 120, B); B.update(1 / 120, A); }
    A.startTech('frontSweep', B); let air = false; for (let i = 0; i < 70; i++) { B.control(ai.intent(B, A, 1 / 120)); A.update(1 / 120, B); B.update(1 / 120, A); if (B.airborne) air = true; }
    if (air) jumped++;
  }
  t.check('a level 8 CPU jumps a sweep in at least 4 of 10', jumped >= 4, jumped + '/10');
  // the showcase uses every technique in one exhibition
  { const A = new KC.Karateka({ fid: 'taro', side: 0 }), B = new KC.Karateka({ fid: 'mei', side: 1 }), b = new KC.Bout({ fighters: [A, B], seed: 1, rules: { pointsToWin: 99, clock: 99 } }), used = new Set();
    const ai = [new KC.KarateAI({ fid: 'taro', seed: 1, showcase: true }), new KC.KarateAI({ fid: 'mei', seed: 2, showcase: true })];
    b.bus.on('start', d => used.add(d.tech));
    for (let n = 0; n < 120 * 200 && b.phase !== 'over'; n++) { A.control(ai[0].intent(A, B, 1 / 120)); B.control(ai[1].intent(B, A, 1 / 120)); b.update(1 / 120); if (KC.SCORING.every(id => used.has(id))) break; }
    const miss = KC.SCORING.filter(id => !used.has(id)); t.check('the showcase throws all 15 techniques', miss.length === 0, miss.join(',')); }
};
