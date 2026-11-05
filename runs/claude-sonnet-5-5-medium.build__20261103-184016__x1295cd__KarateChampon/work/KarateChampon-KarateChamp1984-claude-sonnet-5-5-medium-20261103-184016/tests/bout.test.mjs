import { fresh, fightBout, run } from './lib/helpers.mjs';
export default async t => {
  const G = fresh(), { KC } = G, Tn = KC.TUNE, { Bout } = KC.test;
  // the phase sequence, with timings x refPace
  const phases = (pace) => { Tn.refPace = pace; const b = new Bout({ ids: ['taro', 'ebi'], seed: 2, ctrl: [null, null] }); b.start(); const seq = [b.phase], at = {}; let n = 0; while (b.phase !== 'fight' && n++ < 20000) { b.step(); if (seq[seq.length - 1] !== b.phase) { seq.push(b.phase); at[b.phase] = b.steps; } } Tn.refPace = 1; return { seq, at, steps: b.steps }; };
  const p1 = phases(1), p2 = phases(2);
  t.check('opening sequence is intro, rei, card, ready, hajime, fight', p1.seq.join() === 'intro,rei,card,ready,hajime,fight', p1.seq.join());
  t.check('refPace x2 doubles the referee timings', Math.abs(p2.steps / p1.steps - 2) < .05, p1.steps + ' vs ' + p2.steps);
  t.check('opening takes about 4.0 s at pace 1', Math.abs(p1.steps / 120 - 4.0) < .3, p1.steps / 120);
  // the clock runs only in the fight phase
  { const b = new Bout({ ids: ['taro', 'ebi'], seed: 2, ctrl: [null, null] }); b.start(); let clockMoved = false, c0 = b.clock; for (let i = 0; i < 700; i++) { b.step(); if (b.phase !== 'fight' && b.clock < c0 - .001) clockMoved = true; } t.check('the clock does not run before BEGIN', !clockMoved); const c1 = b.clock; run(b, 240); t.check('the clock runs in the fight', b.clock < c1 - 1.9 && b.clock > c1 - 2.1, b.clock); }
  // points: half and full toward pointsToWin, best of 3
  const award = (b, side, pts) => { const A = b.f[side], D = b.f[1 - side]; b.pts[side] += pts; };
  { const b = fightBout(G); b.pts[0] = .5; b.nextAward = { side: 0, full: false, pts: 300 }; b.f.forEach(f => { f.frozen = true; }); b.setPhase('award'); b.afterAward(); t.check('a half point does not end the round', b.phase !== 'roundEnd' && b.phase !== 'matchEnd'); }
  { const b = fightBout(G); b.pts[0] = 2; b.nextAward = { side: 0, full: true, pts: 600 }; b.setPhase('award'); b.afterAward(); t.check('reaching 2 points ends the round', b.phase === 'roundEnd' && b.rounds[0] === 1); }
  { const b = fightBout(G); b.endRound(0); let n = 0; while (b.phase !== 'card' && n++ < 4000) b.step(); t.check('round 1 over leads to a new round card', b.phase === 'card' && b.round === 2 && b.pts[0] === 0, b.phase); b.endRound(0); n = 0; while (!b.done && n++ < 8000) b.step(); t.check('winning 2 rounds ends the match', b.done && b.matchWinner === 0 && b.phase === 'done', b.phase); }
  { const b = fightBout(G); b.endRound(0); let n = 0; while (b.phase !== 'card' && n++ < 4000) b.step(); b.endRound(1); n = 0; while (b.phase !== 'card' && n++ < 4000) b.step(); t.check('1-1 goes to a deciding round (round 3)', b.round === 3 && b.rounds.join() === '1,1', b.round); }
  // time-out: a leader wins; a tie goes to hantei with three deterministic votes
  { const b = fightBout(G); b.pts = [.5, 0]; b.clock = .02; run(b, 10); t.check('time out shows TIME!', b.phase === 'time', b.phase); for (let i = 0; i < 110; i++) b.step(); t.check('the leader on points wins at time-out', b.winner === 0 && b.rounds[0] === 1, b.phase + b.winner); }
  const hv = seed => { const b = fightBout(G, ['taro', 'ebi'], { seed }); b.pts = [.5, .5]; b.clock = .02; run(b, 10); let n = 0; while (b.phase !== 'hantei' && n++ < 400) b.step(); return b; };
  { const b = hv(5), c = hv(5), d = hv(6); t.check('a tied time-out goes to hantei', b.phase === 'hantei'); t.check('hantei has 3 votes and a majority', b.hantei.votes.length === 3 && b.hantei.winner === (b.hantei.votes.filter(v => v === 0).length >= 2 ? 0 : 1)); t.check('hantei is deterministic per seed', b.hantei.votes.join() === c.hantei.votes.join()); }
  // time bonus and perfect bonus
  { const b = fightBout(G); b.clock = 17.3; b.endRound(0); t.check('time bonus is 100 per whole second left', b.score[0] >= 1700 && b.roundBonus === 1700, b.roundBonus); }
  { const b = fightBout(G); b.stats[0].raw = 500; b.stats[1].conceded = 0; b.endRound(0); b.rounds[0] = 2; b.winner = 0; const before = b.score[0]; b.afterRoundEnd(); t.check('a perfect match adds 5000', b.score[0] - before === 5000 && b.perfect, b.score[0] - before); }
  // the reset can be skipped with start after 0.6 s of award
  { const b = fightBout(G); b.nextAward = { side: 0, full: false, pts: 200 }; b.pts[0] = .5; b.setPhase('award'); b.beginAward(); run(b, 80); b.skipReq = true; run(b, 20); t.check('start skips the award after 0.6 s', b.phase !== 'award', b.phase); }
  // a scoring hit stops the fight (yame, award, reset) and the fighters go back to their marks
  { const b = fightBout(G); const a = b.f[0], d = b.f[1]; a.x = 150; d.x = 150 + 18 + 12; a.start('roundKick', d, 'n', 'u'); const seen = []; b.on('call', c => seen.push(c.id)); let n = 0; while (n++ < 1500 && !(b.phase === 'ready' && seen.length >= 3)) b.step();
    t.check('a hit ends the exchange with STOP, side, point', seen.slice(0, 3).join() === 'stop,white,half' || seen.slice(0, 3).join() === 'stop,white,full', seen.join()); t.check('fighters return to their marks', Math.abs(a.x - 150) < 1 && Math.abs(d.x - 250) < 1, a.x + ',' + d.x); t.check('score updated', b.pts[0] > 0, b.pts); }
  // the soft-lock guard
  { const b = fightBout(G); let threw = false; b.infiniteTime = false; b.fightSteps = (Tn.clock + 5) * 120 * 4 + 5; try { b.fightStep(); } catch (e) { threw = true; } t.check('the soft-lock guard raises', threw); }
  // pointsToWin slider is live
  { Tn.pointsToWin = 1; const b = fightBout(G); b.pts[0] = .5; b.nextAward = { side: 0, full: false, pts: 300 }; b.pts[0] += .5; b.setPhase('award'); b.afterAward(); Tn.pointsToWin = 2; t.check('pointsToWin 1 ends a round on one point', b.phase === 'roundEnd'); }
  { Tn.clock = 10; const b = fightBout(G); Tn.clock = 30; t.check('clock slider sets the round clock', Math.abs(b.clock - 10) < .1, b.clock); }
};
