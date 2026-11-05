import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game } = G, TUNE = KC.TUNE;
  const mk = (o = {}) => { const a = new KC.Karateka('taro', 0), b = new KC.Karateka('negi', 1); const B = new KC.Bout(Object.assign({ fighters: [a, b], seed: 4 }, o)); return B; };
  // the phase sequence from the intro
  { const B = mk(), seen = []; B.on('phase', p => seen.push(p)); for (let k = 0; k < 120 * 8 && B.phase !== 'fight'; k++) B.update(1 / 120);
    t.check('intro -> rei -> card -> ready -> hajime -> fight', ['rei', 'card', 'ready', 'hajime', 'fight'].every((p, i) => seen[i] === p), seen); t.check('BEGIN is called', B.calls.includes('begin')); }
  // the clock runs only in fight
  { const B = mk({ intro: false }); for (let k = 0; k < 120 * 3; k++) B.update(1 / 120); const c0 = B.clock; t.check('clock running in fight', B.phase === 'fight' && c0 < TUNE.clock, [B.phase, c0]); B.points[0] = 1; B.lastPoint = { side: 0, full: true }; B.enterPhase('yame'); B.update(1 / 120); const c1 = B.clock; for (let k = 0; k < 100; k++) B.update(1 / 120); t.check('clock stopped outside fight', B.clock === c1, [c1, B.clock]); }
  // a scoring hit: yame, award, the score, reset to the marks
  { const B = mk({ intro: false }), pts = []; B.on('point', p => pts.push(p)); for (let k = 0; k < 120 * 3; k++) B.update(1 / 120);
    const [a, b] = B.f; a.x = 150; b.x = 150 + (a.w + b.w) / 2 + 28; a.start('roundKick', b); for (let k = 0; k < 120 * 6 && B.phase !== 'ready'; k++) B.update(1 / 120);
    t.check('a full point is scored', pts.length === 1 && pts[0].full && B.points[0] === 1, [pts, B.points]); t.check('calls STOP, WHITE, FULL POINT', ['stop', 'white', 'full'].every(c => B.calls.includes(c)), B.calls); t.check('back at the marks', B.phase === 'ready' && Math.abs(a.x - 150) < 1 && Math.abs(b.x - 250) < 1, [B.phase, a.x, b.x]); }
  // time-out: the leader wins; a tie goes to the judges (deterministic)
  { const B = mk({ intro: false, clock: 2 }); B.points = [.5, 0]; let k = 0; for (; k < 120 * 8 && B.phase !== 'roundEnd'; k++) B.update(1 / 120); t.check('time-out: the leader wins the round', B.phase === 'roundEnd' && B.winner === 0 && B.calls.includes('time'), [B.phase, B.winner]); }
  const hantei = seed => { const B = mk({ intro: false, clock: 1.5, seed }); for (let k = 0; k < 120 * 8 && B.phase !== 'roundEnd'; k++) B.update(1 / 120); return [B.calls.includes('judges'), B.votes && B.votes.join(''), B.winner]; };
  const h1 = hantei(9), h2 = hantei(9); t.check('a tie at time-out goes to the judges, 3 votes', h1[0] && h1[1].length === 3, h1); t.check('hantei is deterministic per seed', JSON.stringify(h1) === JSON.stringify(h2));
  // best of 3, the time bonus, a perfect match
  { const B = mk({ intro: false }), ev = []; B.on('roundEnd', e => ev.push(e)); B.on('matchEnd', e => ev.push(e)); for (let r = 0; r < 2; r++) { for (let k = 0; k < 120 * 6 && B.phase !== 'fight'; k++) B.update(1 / 120); B.forceRound(0); for (let k = 0; k < 120 * 4 && B.phase === 'roundEnd'; k++) B.update(1 / 120); }
    for (let k = 0; k < 120 * 8 && B.phase !== 'over'; k++) B.update(1 / 120); const me = ev.find(e => e.perfect !== undefined);
    t.check('two rounds win the match', B.phase === 'over' && me && me.winner === 0, [B.phase, B.roundWins]); t.check('a time bonus with each round', ev[0].bonus > 0, ev[0]); t.check('a perfect match (nothing conceded)', me && me.perfect); }
  // aiuchi: both land within 6 steps -> no point
  { const B = mk({ intro: false }); for (let k = 0; k < 120 * 3; k++) B.update(1 / 120); const [a, b] = B.f; a.x = 180; b.x = 180 + (a.w + b.w) / 2 + 8; a.start('revPunch', b); b.start('revPunch', a); for (let k = 0; k < 120 * 3 && B.phase !== 'ready'; k++) B.update(1 / 120);
    t.check('simultaneous hits: AIUCHI, no point', B.calls.includes('aiuchi') && B.points[0] === 0 && B.points[1] === 0, [B.calls, B.points]); }
  // the reset skip and the soft-lock guard
  { const B = mk({ intro: false }); B.lastPoint = { side: 0, full: false, pts: 300 }; B.points = [.5, 0]; B.enterPhase('award'); B.skip = true; for (let k = 0; k < 80; k++) B.update(1 / 120); t.check('start skips the award after .6 s', B.phase === 'reset' || B.phase === 'ready', B.phase); }
  { const B = mk({ intro: false }); B.phase = 'fight'; B.fightT = TUNE.clock + 6; let threw = false; try { B.detect(); } catch (e) { threw = /soft-lock/.test(e.message); } t.check('soft-lock guard raises an error', threw); }
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
