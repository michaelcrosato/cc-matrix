// bout: the phase sequence and timings, the clock, points to the round, best of 3, time-outs (a leader; a tie to the judges,
// deterministic), the time bonus, the reset skip, the event order
import { fresh, pair } from './lib/util.mjs';
export default async t => {
  const { KC } = fresh();
  const mk = (rules, seed = 1) => { const [A, B] = pair(KC); const b = new KC.Bout({ fighters: [A, B], seed, rules }); const seen = []; b.bus.on('phase', d => seen.push(d.phase)); return { A, B, b, seen }; };
  const run = (b, s, until) => { for (let i = 0; i < s * 120 && !(until && until()); i++) b.update(1 / 120); };
  // the sequence from the start to the fight
  { const { b, seen } = mk({}); run(b, 6, () => b.phase === 'fight'); t.check('intro, bow, card, ready, begin, fight', seen.slice(0, 5).join() === 'rei,card,ready,hajime,fight', seen.join());
    const t0 = b.clock; run(b, 1); t.check('the clock runs in the fight', Math.abs(t0 - b.clock - 1) < .02, t0 - b.clock); }
  { const { b } = mk({}); KC.TUNE.refPace = 2; let n = 0; for (; n < 2000 && b.phase !== 'fight'; n++) b.update(1 / 120); KC.TUNE.refPace = 1; const { b: b2 } = mk({}); let m = 0; for (; m < 2000 && b2.phase !== 'fight'; m++) b2.update(1 / 120); t.check('the referee pace stretches the phases', n > m * 1.8, n + ' vs ' + m); }
  // points: a full point (an upper lunge) then the round, best of three
  { const { A, B, b } = mk({ pointsToWin: 1, roundsToWin: 2, intro: false }); const calls = []; b.bus.on('call', d => calls.push(d.id));
    for (let r = 0; r < 2; r++) { run(b, 8, () => b.phase === 'fight'); A.x = 150; B.x = 150 + 18 + 56; A.control({ posture: 'r', press: 'u' }); b.update(1 / 120); A.control(null); const clockAt = b.clock; run(b, 1.5, () => b.phase === 'yame'); t.check('round ' + (r + 1) + ': the lunge scores and the referee stops it', b.phase === 'yame' && !!b.award && b.award.tech === 'upLunge', b.phase + ' ' + JSON.stringify(b.award)); run(b, 6, () => b.phase === 'roundEnd'); t.check('round ' + (r + 1) + ' ends with a time bonus', b.phase === 'roundEnd' && b.timeBonus === Math.floor(b.clock) * 100, b.timeBonus); void clockAt; }
    run(b, 8, () => b.phase === 'over'); t.check('two rounds win the match', b.phase === 'over' && b.winner === 0 && b.roundWins[0] === 2, b.phase + ' ' + b.roundWins);
    t.check('the calls: begin, stop, white, full point, white wins', ['begin', 'stop', 'white', 'whiteWins'].every(c => calls.includes(c)), calls.join()); }
  // a half point, then the reset skip
  { const { A, B, b } = mk({ intro: false }); run(b, 8, () => b.phase === 'fight'); A.x = 150; B.x = 150 + 18 + 26; A.control({ posture: 'n', press: 'r' }); b.update(1 / 120); A.control(null); run(b, 3, () => b.phase === 'award');
    t.check('a front kick is a half point', b.points[0] === .5, b.points); b.skip = true; const t0 = b.t; run(b, 2, () => b.phase !== 'award'); t.check('START skips the award after 0.6 s', b.phase === 'reset' && b.t < 1, b.phase); void t0; }
  // time out with a leader; a tie goes to the judges (deterministic per seed)
  { const { A, B, b } = mk({ intro: false, clock: 3 }); run(b, 8, () => b.phase === 'fight'); A.x = 150; B.x = 150 + 18 + 26; A.control({ posture: 'n', press: 'r' }); b.update(1 / 120); A.control(null); run(b, 30, () => b.phase === 'time'); run(b, 2, () => b.phase === 'roundEnd'); t.check('time: the leader on points takes the round', b.phase === 'roundEnd' && b.roundWinner === 0, b.phase); }
  const hantei = seed => { const { b } = mk({ intro: false, clock: 2 }, seed); let whistle = 0; b.bus.on('whistle', () => whistle++); run(b, 20, () => b.phase === 'roundEnd'); return [b.phase, whistle, b.hantei && b.hantei.votes.join(''), b.roundWinner]; };
  { const h1 = hantei(5), h2 = hantei(5); t.check('a tie at time goes to the judges (3 votes)', h1[0] === 'roundEnd' && h1[1] === 1 && h1[2].length === 3, JSON.stringify(h1)); t.check('the decision is the same for the same seed', JSON.stringify(h1) === JSON.stringify(h2)); }
  // the soft-lock guard: the fight never outlasts its clock
  { const { b } = mk({ intro: false, clock: 2 }); run(b, 30); t.check('no bout hangs: a 2 s clock reaches its end', ['roundEnd', 'hantei', 'time', 'matchEnd', 'card', 'over', 'resetRound', 'ready', 'hajime', 'fight', 'rei'].includes(b.phase) && b.round >= 2 || b.phase === 'over', b.phase + ' r' + b.round); }
  // forfeit
  { const { b } = mk({ intro: false }); run(b, 6, () => b.phase === 'fight'); b.forceWin(1); run(b, 5); t.check('a forfeit ends the bout for the other side', b.phase === 'over' && b.winner === 1); }
};
