// The rules (plan §6.3, §19.2 "rules"): points, dunks, jackpot and gold, goaltending, the shot clock, inbounds, the
// quarter's end, overtime and SUDDEN BLAM, the tip-off and the alternating arrow.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const setup = (seed = 1, extra = {}) => {
  const g = loadGame({ seed });
  g.bb.setupMatch(Object.assign({ court: 'skybox', humans: [], qLen: 120 }, extra));
  g.S.match.phase = 'live'; g.S.match.dead = false; g.S.match.tipDone = true;
  return g;
};
const at = (p, x, y) => { p.body.x = x; p.body.y = y; p.body.z = 0; };

T('rules.a jump shot inside the arc is worth two, beyond it three', () => {
  const { bb, S } = setup();
  const p = S.players[0];
  const rim = 1, R = bb.RIMW[rim];
  at(p, R.x - 100, R.y); expect(bb.shotPoints(p, rim) === 2, 'inside 100 should be a two');
  at(p, R.x - 200, R.y); expect(bb.shotPoints(p, rim) === 3, 'beyond 200 should be a three');
});
T('rules.a made basket scores its points and the other side inbounds from under the rim', () => {
  const { bb, S, on } = setup();
  const got = []; on('basket', e => got.push(e)); on('deadBall', e => got.push(e));
  const p = S.players[0], ball = S.ball;
  ball.shot = { shooter: p.slot, made: true, points: 2, rim: 1, resolved: false, age: 0, three: false, perfect: false };
  S.match.shotsInFlight = 1;
  bb.emit('goal', { rim: 1, ball, x: bb.RIMW[1].x, y: bb.RIMW[1].y, z: 78 });
  expect(S.match.score[0] === 2, `score ${S.match.score}`);
  expect(S.match.phase === 'dead' && S.match.pendingSide === 1, `after a home basket the away side inbounds (pending ${S.match.pendingSide})`);
  expect(got.some(e => e.type === 'basket' && e.points === 2), 'basket event');
});
T('rules.a dunk is worth two and a gold ball doubles the basket', () => {
  const { bb, S } = setup();
  const p = S.players[0], ball = S.ball;
  ball.shot = { shooter: p.slot, made: true, points: 2, dunk: 'hammer', rim: 1, resolved: false, age: 0 };
  bb.emit('goal', { rim: 1, ball, x: 1, y: 1, z: 78 });
  expect(S.match.score[0] === 2, `dunk score ${S.match.score[0]}`);
  const q = S.players[1]; ball.shot = { shooter: q.slot, made: true, points: 2, rim: 1, resolved: false, age: 0, goldBall: true };
  bb.emit('goal', { rim: 1, ball, x: 1, y: 1, z: 78 });
  expect(S.match.score[0] === 6, `a gold ball doubles the next basket: 2 + 4, got ${S.match.score[0]}`);
});
T('rules.the jackpot spot adds its bonus to a made jump shot', () => {
  const { bb, S } = setup();
  const p = S.players[0], ball = S.ball;
  ball.shot = { shooter: p.slot, made: true, points: 2, rim: 1, resolved: false, age: 0, jackpot: true };
  bb.emit('goal', { rim: 1, ball, x: 1, y: 1, z: 78 });
  expect(S.match.score[0] === 4, `jackpot should give 2 + 2, got ${S.match.score[0]}`);
});
T('rules.goaltending counts the basket for the shooter when a defender touches a shot coming down', () => {
  const { bb, S } = setup();
  const shooter = S.players[0], defender = S.players[2], ball = S.ball, R = bb.RIMW[1];
  ball.state = 'shot'; ball.shot = { shooter: shooter.slot, made: false, points: 2, rim: 1, resolved: false, age: .5 };
  ball.x = R.x + 3; ball.y = R.y; ball.z = R.z + 6; ball.vz = -150;
  defender.body.x = R.x + 4; defender.body.y = R.y; defender.body.z = 60;
  const ok = bb.goaltendCheck(defender);
  expect(ok && ball.shot.made === true, 'goaltend should award the basket');
});
T('rules.the shot clock running out is a turnover to the other side', () => {
  const { bb, S, on } = setup();
  const seen = []; on('shotClockViolation', e => seen.push(e));
  S.match.poss = 0; S.match.shotClock = .01;
  bb.matchStep(1 / 120); bb.matchStep(1 / 120);
  expect(seen.length === 1, `violations ${seen.length}`);
  expect(S.match.deadReason === 'shotclock' && S.match.pendingSide === 1, 'the other side inbounds');
});
T('rules.a rim touch resets the shot clock to a full clock', () => {
  const { bb, S } = setup();
  S.match.shotClock = 4; S.ball.state = 'shot';
  bb.emit('rim', { x: 1, y: 1, z: 80, speed: 50, rim: 1 });
  expect(S.match.shotClock === bb.tune('shotClock'), `shot clock ${S.match.shotClock}`);
});
T('rules.a shot released before the buzzer counts: the quarter waits for it', () => {
  const { bb, S } = setup();
  S.match.clock = 0; S.match.shotsInFlight = 1; S.match.quarter = 1;
  for (let i = 0; i < 60; i++) bb.matchStep(1 / 120);
  expect(S.match.quarter === 1 && S.match.phase !== 'break', 'the quarter must wait for a shot in flight');
  S.match.shotsInFlight = 0;
  bb.matchStep(1 / 120);
  expect(S.match.phase === 'break', `the quarter should end once it resolves (phase ${S.match.phase})`);
});
T('rules.a tie after Q4 is overtime, and the third overtime is SUDDEN BLAM', () => {
  const { bb, S, on } = setup();
  const ot = []; on('overtime', e => ot.push(e.n));
  S.match.quarter = 4; S.match.score = [10, 10]; S.match.clock = 0;
  bb.matchStep(1 / 120);
  expect(ot[0] === 1 && S.match.phase === 'break', 'first overtime');
  S.match.ot = 2; S.match.quarter = 5; S.match.score = [20, 20]; S.match.clock = 0; S.match.phase = 'live'; S.match.dead = false; S.match.shotsInFlight = 0;
  bb.matchStep(1 / 120);
  expect(S.match.ot === 3 && S.match.phase === 'break', 'third overtime');
});
T('rules.the tip-off: the winner\'s side gets the ball, and the other side gets Q2 and Q3', () => {
  const { bb, S } = loadGame({ seed: 5 });
  bb.setupMatch({ court: 'skybox', humans: [], qLen: 120 });
  for (let i = 0; i < 200 && S.match.phase !== 'live'; i++) bb.matchStep(1 / 120);
  expect(S.match.phase === 'live', `tip-off should finish (phase ${S.match.phase})`);
  expect(S.ball.owner && S.ball.owner.side === S.match.tipWinner, 'the tip winner holds the ball');
  expect(S.match.arrow === 1 - S.match.tipWinner, 'the arrow is the other side');
});
T('rules.the quarter after Q1 starts with the inbound by the side that lost the tip', () => {
  const { bb, S } = setup(6);
  S.match.tipWinner = 0; S.match.quarter = 1;
  bb.emit('quarterEnd', { quarter: 1 });
  S.match.phase = 'break'; S.match.breakKind = 'quick'; S.match.breakT = 99;
  bb.matchStep(1 / 120);
  expect(S.match.quarter === 2 && S.match.inboundSide === 1, `Q2 inbound by side ${S.match.inboundSide}, want 1 (the tip's loser)`);
});
