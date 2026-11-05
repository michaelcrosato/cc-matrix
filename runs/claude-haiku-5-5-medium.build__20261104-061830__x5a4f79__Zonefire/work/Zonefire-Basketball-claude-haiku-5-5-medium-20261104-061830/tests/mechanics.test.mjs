// The mechanics (plan §19.2 "mechanics"): turbo, speed by ZOOM, steals, shoves, spins, blocks, Supernova, power-ups,
// juice and subs' basics, the dunk's choice, the alley-oop, the posterized dunk, the boss's overclock and reboot.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const setup = (seed = 1) => {
  const g = loadGame({ seed });
  g.bb.setupMatch({ court: 'skybox', humans: [], qLen: 120 });
  g.S.match.phase = 'live'; g.S.match.dead = false; g.S.match.tipDone = true;
  return g;
};
const near = (a, x, y) => { a.body.x = x; a.body.y = y; a.body.z = 0; };

T('mechanics.turbo drains while held and moving, and refills after it is let go', () => {
  const { bb, S } = setup();
  const p = S.players[0];
  p.cmd = { move: [1, 0], turbo: { down: true }, shoot: {}, pass: {}, shove: {}, oop: {}, taunt: {} };
  p.turbo = 1; p.idle = 0;
  for (let i = 0; i < 120; i++) bb.playerStep(p, 1 / 120);
  const drained = p.turbo;
  expect(drained < .95, `turbo should drain (${drained.toFixed(2)})`);
  p.cmd.turbo.down = false; p.cmd.move = [0, 0];
  for (let i = 0; i < 240; i++) bb.playerStep(p, 1 / 120);
  expect(p.turbo > drained, `turbo should refill (${p.turbo.toFixed(2)} from ${drained.toFixed(2)})`);
});
T('mechanics.run speed grows with ZOOM', () => {
  const { bb, S } = setup();
  const p = S.players[0];
  p.def.ratings.zoom = 2; const slow = bb.playerSpeed(p);
  p.def.ratings.zoom = 10; const fast = bb.playerSpeed(p);
  expect(fast > slow * 1.2, `ZOOM 10 (${fast.toFixed(1)}) should be well above ZOOM 2 (${slow.toFixed(1)})`);
});
T('mechanics.a steal is possible from a defender beside the handler, and never from a spinning handler', () => {
  const { bb, S } = setup(3);
  const h = S.players[0], d = S.players[2];
  S.ball.owner = h; h.hasBall = true; S.ball.state = 'held';
  let got = 0;
  for (let i = 0; i < 400; i++) {
    near(h, 300, 200); near(d, 310, 200); d.cool.steal = 0; d.face = Math.PI; h.face = 0;
    S.ball.owner = h; h.hasBall = true; S.ball.state = 'held';
    if (bb.stealAttempt(d)) { got++; }
    S.ball.owner = null; S.players.forEach(q => q.hasBall = false);
  }
  expect(got > 10 && got < 340, `steal successes ${got}/400: want a real chance, not all or none`);
  h.spinT = .3; S.ball.owner = h; h.hasBall = true; d.cool.steal = 0;
  expect(bb.stealAttempt(d) === false, 'a spinning handler cannot be stolen from');
});
T('mechanics.a shove knocks the target down and costs turbo', () => {
  const { bb, S } = setup(4);
  const p = S.players[2], q = S.players[0];
  near(p, 300, 200); near(q, 310, 200); p.face = 0; p.turbo = 1; p.cool.shove = 0;
  bb.shoveAttempt(p);
  expect(q.knocked > 0, 'the target should be knocked down');
  expect(p.turbo < 1, 'the shove should cost turbo');
});
T('mechanics.a spin move breaks a steal and can break ankles', () => {
  const { bb, S, on } = setup(7);
  const h = S.players[0], d = S.players[2];
  const ank = []; on('ankles', e => ank.push(e));
  near(h, 300, 200); near(d, 310, 200); h.face = 0; h.turbo = 1; h.cool.spin = 0;
  S.ball.owner = h; h.hasBall = true;
  expect(bb.spinMove(h) === true, 'the spin should start');
  expect(ank.length === 1 && d.knocked > 0, 'a defender in front should stumble');
});
T('mechanics.a block only works in the first quarter second of a shot, and a made shot may be blocked', () => {
  const { bb, S } = setup(8);
  const d = S.players[2], sh = S.players[0];
  near(d, 300, 200);
  S.ball.state = 'shot'; S.ball.x = 300; S.ball.y = 200; S.ball.z = 40;
  S.ball.shot = { shooter: sh.slot, made: true, points: 2, rim: 1, age: 1.0, resolved: false };
  expect(bb.blockAttempt(d) === false, 'a late shot cannot be blocked');
  S.ball.shot.age = .1;
  let blocked = 0;
  for (let i = 0; i < 300; i++) { S.ball.state = 'shot'; S.ball.shot = { shooter: sh.slot, made: true, points: 2, rim: 1, age: .1, resolved: false }; d.cool.block = 0; if (bb.blockAttempt(d)) blocked++; }
  expect(blocked > 20 && blocked < 280, `blocks ${blocked}/300 want a chance, not a certainty`);
});
T('mechanics.three straight baskets ignite Supernova, and the other side ends it', () => {
  const { bb, S, on } = setup(9);
  const seen = []; on('supernovaOn', e => seen.push('on')); on('supernovaOff', e => seen.push('off'));
  const p = S.players[0];
  for (let i = 0; i < 3; i++) { S.ball.shot = { shooter: p.slot, made: true, points: 2, rim: 1, age: 0, resolved: false }; bb.emit('goal', { rim: 1, ball: S.ball, x: 0, y: 0, z: 0 }); }
  expect(p.nova, 'Supernova should be on after three');
  const o = S.players[2]; S.ball.shot = { shooter: o.slot, made: true, points: 2, rim: 0, age: 0, resolved: false }; bb.emit('goal', { rim: 0, ball: S.ball, x: 0, y: 0, z: 0 });
  expect(!p.nova && seen.includes('off'), 'the other side\'s basket should end it');
});
T('mechanics.a power-up applies, lasts its time, and ends', () => {
  const { bb, S } = setup(10);
  const p = S.players[0];
  bb.get('powerup', 'rocket').apply(p);
  expect(p.rocket === 15, 'rocket kicks last 15 seconds');
  for (let i = 0; i < 15 * 120 + 2; i++) bb.powerTick(p, 1 / 120);
  expect(p.rocket === 0, 'and then they end');
});
T('mechanics.juice falls with each knockdown', () => {
  const { bb, S } = setup(11);
  const p = S.players[0], before = p.juice;
  bb.knockDown(p, .8);
  expect(p.juice < before, `juice ${p.juice} from ${before}`);
});
T('mechanics.the dunk is chosen from the catalog by distance and SLAM', () => {
  const { bb, S } = setup(12);
  const p = S.players[0];
  p.def.ratings.slam = 2;
  for (let i = 0; i < 40; i++) { const k = bb.pickDunk(p, 40); expect(k.slam <= 2, `a SLAM 2 player got ${k.id}`); }
  p.def.ratings.slam = 9;
  const ids = new Set(); for (let i = 0; i < 80; i++) ids.add(bb.pickDunk(p, 90, { overclock: false, vent: false, behind: false }).id);
  expect(ids.size >= 3, `a SLAM 9 player should get a variety (${[...ids].join(',')})`);
});
T('mechanics.the alley-oop lobs the ball to the receiver', () => {
  const { bb, S } = setup(13);
  const p = S.players[0], m = S.players[1];
  near(p, 500, 250); near(m, 600, 260); S.ball.owner = p; p.hasBall = true;
  bb.alleyOop(p, m);
  expect(S.ball.state === 'pass' && S.ball.to === m.slot && S.ball.oop, 'the ball is lobbed to the receiver');
});
T('mechanics.the Blambots\' overclock turns both bots to Supernova and a reboot follows two knockdowns', () => {
  const { bb, S } = setup(14);
  const bots = S.players.filter(p => p.side === 1);
  bots.forEach(p => { p.team = bb.teamDef('blambots'); });
  S.twist.kind = 'boss';
  bb.overclockOn();
  expect(bots.every(p => p.nova), 'both bots go Supernova');
  const b = bots[0];
  bb.bootKnock(b); bb.bootKnock(b);
  expect(b.reboot > 0, 'two knockdowns in ten seconds reboot the bot');
});
T('mechanics.a wind pushes the ball in flight, with no effect on a made outcome', () => {
  const { bb, S } = setup(15);
  S.twist.wind = 1;
  const v = bb.ballFlight({ x: 100, y: 200, z: 40 }, { x: 150, y: 200, z: 80 }, 30);
  S.twist.wind = 0;
  const v0 = bb.ballFlight({ x: 100, y: 200, z: 40 }, { x: 150, y: 200, z: 80 }, 30);
  expect(v.vx < v0.vx, 'a tailwind must be solved into the launch: the ball is thrown a little less hard');
});
