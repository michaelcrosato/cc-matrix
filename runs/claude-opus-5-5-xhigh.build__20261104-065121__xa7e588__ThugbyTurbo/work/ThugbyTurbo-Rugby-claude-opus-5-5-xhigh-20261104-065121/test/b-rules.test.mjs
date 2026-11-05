// ball, laws, contact, breakdown and set pieces: the simulation on its own, driven directly.
import { fresh, match, playWith, clear, assert, eq, G } from './lib/h.mjs';
const L = fresh(), TT = L.TT;
const mk = o => match(TT, o);
export const cases = {
  'a pass flies to its receiver and is caught'() {
    const m = mk(); clear(m, [3, 4]); const p = playWith(m, 3, G.CX, G.CY), r = m.players[4]; r.x = G.CX - 20; r.y = G.CY + 60;
    TT.TUNE.v.catchBase = 1; m.doPass(p, r, false); m.run(1, () => m.ball.st === 'held'); TT.TUNE.reset('catchBase');
    eq(m.ball.holder, 4, 'holder'); assert(!m.ball.fwd, 'not forward');
  },
  'a forward pass is whistled: scrum to the other team'() {
    const m = mk(); clear(m, [3, 4]); const p = playWith(m, 3, G.CX, G.CY), r = m.players[4]; r.x = G.CX + 60; r.y = G.CY + 40;
    TT.TUNE.v.catchBase = 1; m.doPass(p, r, false); TT.TUNE.reset('catchBase');
    m.run(3, () => m.phase === 'scrum');
    eq(m.ev.forwardPass, 1, 'forward pass'); eq(m.phase, 'scrum', 'phase'); eq(m.setp.team, 1, 'the other team feeds');
  },
  'a sprinting flat pass is legal (judged relative to the passer)'() {
    const m = mk(); clear(m, [3, 4]); const p = playWith(m, 3, G.CX, G.CY), r = m.players[4]; r.x = G.CX - 2; r.y = G.CY + 50; p.vx = 150; r.vx = 150;
    m.doPass(p, r, false); assert(!m.ball.fwd, 'a flat pass on the run is not forward');
  },
  'a knock-on: scrum to the other team'() { const m = mk(); const p = playWith(m, 5, G.CX, G.CY); m.knockOn(p); m.run(2, () => m.phase === 'scrum'); eq(m.phase, 'scrum', 'phase'); eq(m.setp.team, 1, 'feed'); },
  'touch: lineout to the team that did not touch it last, at the x it crossed'() {
    const m = mk(); clear(m, [5]); const p = playWith(m, 5, G.CX + 100, G.Y1 - 5); p.vy = 100; m.players[5].I = TT.emptyIntent();
    m.ball.st = 'loose'; m.ball.holder = -1; m.ball.team = 0; m.ball.x = G.CX + 100; m.ball.y = G.Y1 + 3; m.ball.vx = 0; m.ball.vy = 50; m.ball.z = 0;
    m.run(3, () => m.phase === 'lineout');
    eq(m.phase, 'lineout', 'phase'); eq(m.setp.team, 1, 'team'); assert(Math.abs(m.setp.x - (G.CX + 100)) < 4, 'x');
  },
  'dead ball by the attackers: a 22 drop-out to the defenders'() {
    const m = mk(); clear(m, []); playWith(m, 5, G.CX, G.CY); const b = m.ball; b.st = 'loose'; b.holder = -1; b.team = 0; b.x = G.DX1 + 2; b.y = G.CY; b.vx = 10; b.vy = 0;
    m.run(2.5, () => m.phase === 'dropout'); eq(m.phase, 'dropout', 'phase'); eq(m.setp.team, 1, 'the defenders drop out');
  },
  'the oval bounce is the same for the same seed and stays in its bounds'() {
    const run = seed => { const m = mk({ seed }); clear(m, []); playWith(m, 5, G.CX, G.CY); const b = m.ball; b.st = 'air'; b.holder = -1; b.kind = 'punt'; b.x = G.CX; b.y = G.CY; b.z = 40; b.vx = 120; b.vy = 0; b.vz = -60; let maxA = 0; for (let i = 0; i < 120; i++) { m.step(1 / 120); maxA = Math.max(maxA, Math.abs(Math.atan2(b.vy, b.vx))); } return [Math.round(b.x), Math.round(b.y), maxA]; };
    const a = run(11), b = run(11);
    eq(a.join(), b.join(), 'deterministic'); assert(a[2] <= 70 * Math.PI / 180 * 1.0001 + .01, 'bounce angle within 70 degrees');
  },
  'tries only in the in-goal; 5 points, then the conversion from in line'() {
    const m = mk(); clear(m, [6]); const p = playWith(m, 6, G.X1 - 30, G.CY + 150);
    m.doGround(p); eq(p.st, 'free', 'no dive outside the in-goal');
    p.x = G.X1 + 20; m.doGround(p); m.run(1, () => m.phase === 'try');
    eq(m.score[0], 5, 'try'); m.run(4, () => m.phase === 'setkick'); eq(m.phase, 'setkick', 'conversion'); eq(Math.round(m.setp.gy), Math.round(p.y), 'in line with the grounding');
  },
  'scoring values: conversion 2, penalty goal 3, drop goal 3, penalty try 7'() {
    const m = mk(); m.addScore(0, 0, 'x');
    m.setKickSetup(0, G.X1, G.CY, 'conv'); m.setKickResult(true, 'good'); eq(m.score[0], 2, 'conversion');
    m.setKickSetup(1, G.CX, G.CY, 'pen'); m.setKickResult(true, 'good'); eq(m.score[1], 3, 'penalty goal');
    m.phase = 'play'; m.dropGoal(0); eq(m.score[0], 5, 'drop goal');
    const m2 = mk(); const c = playWith(m2, 6, G.X1 - 30, G.CY); m2.penaltyTry(0, c); eq(m2.score[0], 7, 'penalty try');
  },
  'the hooter: the half ends at the next stoppage, not before'() {
    const m = mk({ halfLen: 20 }); clear(m, [5]); const p = playWith(m, 5, G.CX, G.CY); m.clock = 19.9; p.I = TT.emptyIntent();
    m.run(1); assert(m.hooter, 'hooter'); eq(m.phase, 'play', 'play goes on');
    m.knockOn(p); m.run(2, () => m.phase === 'half'); eq(m.phase, 'half', 'half-time at the stoppage');
  },
  'sudden death ends on the first score'() {
    const m = mk({ cup: true }); m.half = 2; m.clock = 60; m.score = [5, 5]; m.endHalf(); assert(m.sudden, 'sudden death'); m.run(30, () => m.phase === 'play');
    const p = playWith(m, 6, G.X1 + 20, G.CY); m.doGround(p); m.run(5, () => m.over); assert(m.over, 'over'); eq(m.result.winner, 0, 'winner');
  },
  'tackle success over 400 tries is near the formula'() {
    let ok = 0; const m = mk({ venue: 'docks' }); clear(m, [5, 12]);
    for (let i = 0; i < 400; i++) { const c = playWith(m, 5, G.CX, G.CY), t = m.players[12]; Object.assign(t, { st: 'free', x: G.CX + 10, y: G.CY, f: Math.PI, cool: 0, charge: -1 }); c.f = 0; c.evade = 0; c.fendT = 0; c.pu = null; c.sup = null; m.contact(t, c, 'tackle'); if (c.st === 'down') ok++; }
    const c = m.players[5], t = m.players[12], exp = TT.TUNE.v.tackleBase * (.9 + .02 * t.tkl - .02 * c.pow);
    assert(Math.abs(ok / 400 - exp) < .07, 'rate ' + (ok / 400).toFixed(2) + ' vs ' + exp.toFixed(2));
  },
  'a full-charge big hit launches the carrier into the air'() {
    const m = mk(); clear(m, [5, 12]); const c = playWith(m, 5, G.CX, G.CY), t = m.players[12]; t.x = G.CX + 10; t.y = G.CY; t.f = Math.PI;
    m.tackled(t, c, 'monster'); eq(c.st, 'launch', 'launched'); const x0 = c.x; m.run(1.2); assert(Math.abs(c.x - x0) > 25, 'flew ' + Math.abs(c.x - x0).toFixed(0));
  },
  'a sidestep makes a tackle meet thin air'() {
    const m = mk(); clear(m, [5, 12]); const c = playWith(m, 5, G.CX, G.CY), t = m.players[12]; t.x = G.CX + 10; t.y = G.CY; t.f = Math.PI;
    m.doStep(c, 1); m.contact(t, c, 'tackle'); assert(c.st !== 'down', 'not tackled'); eq(m.ev.missedTackle, 1, 'missed');
  },
  'BIG UNIT needs two tacklers'() {
    const m = mk({ away: 'meg' }); clear(m, [7, 5, 6]); const c = playWith(m, 7, G.CX, G.CY); assert(c.boss, 'boss');
    const a = m.players[5], b = m.players[6]; Object.assign(a, { x: G.CX - 10, y: G.CY, f: 0 }); Object.assign(b, { x: G.CX - 10, y: G.CY + 8, f: 0 });
    const was = TT.TUNE.v.tackleBase; TT.TUNE.v.tackleBase = 1;
    m.contact(a, c, 'tackle'); assert(c.held > 0 && c.st !== 'down', 'held, not felled'); m.contact(b, c, 'tackle'); eq(c.st, 'down', 'the second brings him down');
    TT.TUNE.v.tackleBase = was;
  },
  'a cheap shot is a penalty when the ref sees it and free when he does not'() {
    const m = mk(); clear(m, [5, 9, 3]); playWith(m, 3, G.CX, G.CY); const p = m.players[9], v = m.players[5];
    Object.assign(m.ref, { x: G.CX - 100, y: G.CY, f: 0 }); Object.assign(p, { x: G.CX - 20, y: G.CY + 60, f: 0 }); Object.assign(v, { x: G.CX - 10, y: G.CY + 60 });
    const seen = m.foul(p, 'offBall'); assert(seen, 'seen: called');
    const m2 = mk(); clear(m2, [5, 9, 3]); playWith(m2, 3, G.CX, G.CY); const p2 = m2.players[9];
    Object.assign(m2.ref, { x: G.CX + 100, y: G.CY, f: 0 }); Object.assign(p2, { x: G.CX - 20, y: G.CY + 60 });
    const seen2 = m2.foul(p2, 'offBall'); assert(!seen2, 'behind his back: not called'); m2.run(.5); eq(m2.ev.foul || 0, 0, 'still not called');
  },
  'the ruck: two attackers vs one, no mashing loses to a CPU at 9/s; mashing 12/s beats a CPU at 6/s'() {
    const setup = (rate, mash) => {
      const m = mk({ seats: [{ kind: 'local', team: 0, input: L.game.input }] }); clear(m, [5, 1, 2, 12]);
      const c = playWith(m, 5, G.CX, G.CY); m.players[1].x = G.CX - 20; m.players[2].x = G.CX - 25; m.players[12].x = G.CX + 20; m.players[12].y = G.CY;
      m.seats[0].pid = 5; c.ctl = 0; TT.TUNE.v.cpuMash = rate;
      m.setSt(c, 'down', 9); c.pin = true; m.startRuck(c); m.setp.go = [[1, 2], [12]];
      let n = 0; while (m.phase === 'ruck' && n < 600) { if (mash && n % Math.round(120 / mash) === 0) m.seats[0].I.pr.x = true; m.seats[0].I.mx = 0; m.step(1 / 120); n++; }
      TT.TUNE.reset('cpuMash');
      return m;
    };
    const a = setup(9, 0); eq(a.ev.turnover, 1, 'no mashing: turned over');
    const b = setup(6, 12); assert(!b.ev.turnover, 'mashing 12/s: kept it'); eq(b.carrier() && b.carrier().team, 0, 'the attack has it');
  },
  'the jackal swings the ruck; hands in the ruck is a foul if seen'() {
    const m = mk(); clear(m, [5, 12]); const c = playWith(m, 5, G.CX, G.CY), d = m.players[12]; d.x = G.CX + 8; d.y = G.CY;
    m.setSt(c, 'down', 9); c.pin = true; m.startRuck(c); const b0 = m.setp.bar; m.jackal(d); assert(m.setp.bar <= b0 - .49, 'swung'); eq(m.ev.jackal, 1, 'jackal');
    const m2 = mk(); clear(m2, [5, 12, 13]); const c2 = playWith(m2, 5, G.CX, G.CY); m2.setSt(c2, 'down', 9); c2.pin = true; m2.startRuck(c2); m2.setp.t = .8; TT.cheats.refStrict = true; m2.jackal(m2.players[13]); TT.cheats.refStrict = false;
    eq(m2.ev.handsInRuck, 1, 'hands in the ruck'); eq(m2.ev.foul, 1, 'called');
  },
  '"use it": the ball held at the base for 3 s is a scrum to the other team'() {
    const m = mk(); clear(m, [3]); m.parked.add(3); const p = playWith(m, 3, G.CX, G.CY); m.useIt = 3; m.useItId = 3; m.useItX = p.x; m.useItY = p.y; p.I = TT.emptyIntent();
    m.run(5, () => m.phase === 'scrum'); eq(m.phase, 'scrum', 'scrum'); eq(m.setp.team, 1, 'other team');
  },
  'scrum timing: perfect, good, and an early engagement is a free kick'() {
    const m = mk(); m.scrumSetup(0, G.CX, G.CY); m.scrumTime(0, .05); eq(m.setp.tq[0], 'PERFECT', 'perfect'); m.scrumTime(1, .2); eq(m.setp.tq[1], 'GOOD', 'good');
    const m2 = mk({ seats: [{ kind: 'local', team: 0, input: L.game.input }] }); m2.scrumSetup(0, G.CX, G.CY); m2.run(1.6);
    m2.seats[0].I.pr.x = true; m2.step(1 / 120); m2.run(1.5, () => m2.phase === 'penalty');
    eq(m2.ev.earlyEngage, 1, 'early'); eq(m2.phase, 'penalty', 'free kick'); assert(m2.setp.free && m2.setp.team === 1, 'to the others');
  },
  'a pushover try near the line'() {
    const m = mk(); m.scrumSetup(0, G.X1 - 40, G.CY); m.setp.sub = 'push'; m.setp.bar = .95; m.phase = 'scrum'; m.scrumResult(); eq(m.ev.pushover, 1, 'pushover'); eq(m.score[0], 5, 'five points');
  },
  'lineout: a not-straight throw is a scrum to the other team; a stolen lineout'() {
    const m = mk({ seats: [{ kind: 'local', team: 0, input: L.game.input }] }); m.lineoutSetup(0, G.CX, G.Y0); m.setp.sub = 'throw'; m.setp.t = .2;
    m.step(1 / 120); m.setp.t = 2.5;   // the needle near an end: outside the band
    m.seats[0].I.pr.x = true; m.step(1 / 120);
    m.run(2, () => m.phase === 'scrum'); eq(m.ev.notStraight, 1, 'not straight'); eq(m.setp && m.setp.team, 1, 'scrum to the others');
    const m2 = mk(); m2.lineoutSetup(0, G.CX, G.Y0); const S = m2.setp; S.calls = [1, 1]; S.q = .6; S.pressT = 1; S.arriveT = 1; m2.lineoutResult(); eq(m2.ev.lineoutWon, 1, 'won'); eq(m2.carrier().team, 1, 'stolen with perfect timing');
  },
  'a kick-off that does not go ten metres is a free kick to the receivers'() {
    const m = mk(); m.goPhase('kickoff'); m.setp.aim = { x: G.CX + 40, y: G.CY }; m.setp.power = .85; m.kickoffKick(m.setp); m.run(4, () => m.phase === 'penalty');
    eq(m.ev.notTen, 1, 'not ten'); eq(m.setp && m.setp.team, 1, 'free kick to the receivers');
  },
  'penalty choices: tap and go, kick at goal, kick for touch'() {
    const a = mk(); a.penaltyAward(0, G.X1 - 150, G.CY, 'x'); a.penaltyChoose(0); eq(a.phase, 'play', 'tap: play'); eq(a.carrier().team, 0, 'tap: ours');
    const b = mk(); b.penaltyAward(0, G.X1 - 150, G.CY, 'x'); b.penaltyChoose(1); eq(b.phase, 'setkick', 'goal: set kick'); eq(b.setp.purpose, 'pen', 'a penalty goal');
    const c = mk(); c.penaltyAward(0, G.CX, G.CY - 100, 'x'); c.penaltyChoose(2); c.run(6, () => c.phase === 'lineout'); eq(c.phase, 'lineout', 'touch: lineout'); eq(c.setp.team, 0, 'our throw');
  },
  'advantage: a foul while they have the ball plays on; no gain brings the penalty back'() {
    const m = mk(); clear(m, [5, 12]); m.parked.add(5); m.parked.add(12); const c = playWith(m, 5, G.CX, G.CY), p = m.players[12]; TT.cheats.refStrict = true; m.foul(p, 'offBall', {}); TT.cheats.refStrict = false;
    assert(m.adv && m.adv.team === 0, 'advantage'); c.I = TT.emptyIntent(); m.run(6, () => m.phase === 'penalty'); eq(m.phase, 'penalty', 'penalty after no gain');
  },
  'set kicks and kick-offs are the human\'s: the seat moves to the kicker'() {
    const m = mk({ seats: [{ kind: 'local', team: 0, input: L.game.input }] }); m.step(1 / 120); const s = m.seats[0];
    m.assign(s, 6); m.setKickSetup(0, G.X1, G.CY, 'conv'); eq(s.pid, m.setp.kicker, 'conversion kicker'); assert(m.players[m.setp.kicker].ctl === 0, 'controlled');
    m.assign(s, 1); m.kickoffTeam = 0; m.goPhase('kickoff'); eq(s.pid, m.setp.kicker, 'kick-off kicker');
  },
  'a yellow card sends a player to the bin; he comes back after the sin bin time'() {
    const m = mk(); clear(m, [5]); playWith(m, 5, G.CX, G.CY); const p = m.players[9]; m.giveCard(p, 'yellow'); eq(p.st, 'bin', 'binned'); m.players[5].I = TT.emptyIntent();
    p.binT = .5; m.run(1); eq(p.st, 'free', 'back'); eq(m.ev.sinBinOut, 1, 'out event');
    m.giveCard(p, 'yellow'); m.giveCard(p, 'yellow'); eq(p.st, 'off', 'second yellow: red');
  }
};
