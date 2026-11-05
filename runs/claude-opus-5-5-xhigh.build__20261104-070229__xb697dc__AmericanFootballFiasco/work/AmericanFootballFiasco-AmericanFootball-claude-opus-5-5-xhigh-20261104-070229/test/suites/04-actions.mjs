import { simCtx, match, until, call } from '../lib/sim.mjs';
export default async ok => {
  const { FF, E } = simCtx(), YD = 16, T = FF.T;
  const m = match(FF); call(m, 'hb_dive', 'cover2'); until(m, m => m.phase === 'LIVE', 10);
  const a = m.bySlot[0].WR1, b = m.bySlot[1].NT;
  ok('top speed follows SPD', m.topSpeed(a) > m.topSpeed(b), m.topSpeed(a) + ' vs ' + m.topSpeed(b));
  // turbo: faster, it drains while held and comes back
  a.turbo = 1; a.intent = Object.assign(FF.blankIntent(), { mx: 1, turbo: true }); a.action = null; a.downT = 0; a.engaged = null;
  for (let i = 0; i < 120; i++) m.moveOne(a, 1 / 120);
  ok('turbo goes faster than the top speed', Math.hypot(a.vx, a.vy) > m.topSpeed(a) * 1.1, Math.hypot(a.vx, a.vy));
  ok('turbo drains while held', a.turbo < .7, a.turbo);
  const t0 = a.turbo; a.intent.turbo = false; for (let i = 0; i < 120; i++) m.moveOne(a, 1 / 120); ok('turbo comes back when let go', a.turbo > t0, a.turbo);
  // collisions separate opponents
  const o = m.bySlot[1].LB1; o.x = a.x + 2; o.y = a.y; o.engaged = null; a.engaged = null; m.collide(); ok('collision pushes opponents apart', Math.hypot(o.x - a.x, o.y - a.y) >= a.rad + o.rad - .5, Math.hypot(o.x - a.x, o.y - a.y));
  // a perfect pass lands where it was aimed
  const m2 = match(FF, { cheats: { perfectPass: true, both: true } }); call(m2, 'slants', 'cover2'); until(m2, m => m.phase === 'LIVE' && m.ball.state === 'held' && m.ball.holder.slot === 'QB', 10);
  const qb = m2.ball.holder; m2.startThrow(qb, 0, false); until(m2, m => m.ball.state === 'pass' && (m.ball.type === 'lob'), 2); const L = m2.ball.to;
  let landed = null; until(m2, m => { if (m.ball.state === 'pass' && m.ball.t >= m.ball.T - 1 / 120) landed = { x: m.ball.x + m.ball.vx / 120, y: m.ball.y + m.ball.vy / 120 }; return m.ball.state !== 'pass'; }, 4);
  ok('a pass with no aim error lands within a unit of its target', landed && Math.hypot(landed.x - L.x, landed.y - L.y) < 4, JSON.stringify(landed) + ' vs ' + JSON.stringify(L));
  // the Big Hit: it launches the carrier; its fumble roll is about 3x a normal tackle's (seeded Monte Carlo)
  const fum = big => { let n = 0; for (let s = 0; s < 400; s++) { const mm = match(FF, { seed: 1000 + s }); call(mm, 'hb_dive', 'cover2'); until(mm, x => x.phase === 'LIVE' && x.ball.holder && x.ball.holder.slot === 'RB', 6); const c = mm.ball.holder; if (!c) continue; const t = mm.bySlot[1].LB1; t.x = c.x + 10; t.y = c.y; t.action = big ? { id: 'bigHit', t: .1, dur: .35 } : null; mm.forceTackle = true; mm.tackle(t, c, 1); if (mm.play.fumbled) n++; mm.ots.dispose(); } return n / 400; };
  const T0 = T.fumbleBase; FF.T.fumbleBase = .05; const pn = fum(false), pb = fum(true); FF.T.fumbleBase = T0;
  ok('a Big Hit fumbles about 3x as often', pb > pn * 2 && pb < pn * 4.5, pn.toFixed(3) + ' vs ' + pb.toFixed(3));
  // a spin evades a frontal tackle inside its window, not after it
  const ev = (late) => { const mm = match(FF, { seed: 5 }); call(mm, 'hb_dive', 'cover2'); until(mm, x => x.phase === 'LIVE' && x.ball.holder && x.ball.holder.slot === 'RB', 6); const c = mm.ball.holder, t = mm.bySlot[1].LB1; c.facing = 0; t.x = c.x + 12; t.y = c.y; c.action = { id: 'spin', t: late ? .3 : .05, dur: .32 }; mm.forceTackle = true; mm.tackle(t, c, 1); const r = mm.phase; mm.ots.dispose(); return r; };
  ok('a spin evades a frontal tackle in its window', ev(false) === 'LIVE', ev(false));
  ok('a spin past its window doesn\'t', ev(true) !== 'LIVE', ev(true));
  // the 3-press kick meter: power, then accuracy, then the kick
  const mk = match(FF, { start: { possession: 0, los: 75, down: 4 }, humans: { 0: [0], 1: [] } }); mk.forceCall = { 0: { play: 'field_goal' }, 1: { play: 'cover2' } };
  until(mk, x => x.phase === 'PLAYCALL', 2); mk.callPlay(0, 'field_goal'); mk.callPlay(1, 'cover2');
  until(mk, x => x.phase === 'PRESNAP' && x.set, 5); mk.meterPress = true; mk.stepSim(1 / 120); ok('press 1 starts the power needle', mk.meterK.stage === 1);
  for (let i = 0; i < 40; i++) mk.stepSim(1 / 120); mk.meterPress = true; mk.stepSim(1 / 120); ok('press 2 sets the power', mk.meterK.stage === 2 && mk.meterK.power > 0);
  for (let i = 0; i < 30; i++) mk.stepSim(1 / 120); mk.meterPress = true; mk.stepSim(1 / 120); ok('press 3 sets the aim and kicks', mk.phase === 'LIVE' && mk.meterK.done);
  // the late-hit window after the whistle
  const ml = match(FF); call(ml, 'hb_dive', 'cover2'); ml.forceTackle = true; until(ml, x => x.phase === 'DEAD', 10);
  const v = ml.on.find(x => x.side === 1 && x.downT <= 0), l = ml.on.find(x => x.side === 0); l.downT = 0; l.action = null; l.x = v.x + 10; l.y = v.y;
  ok('a late hit lands within the window', ml.lateHit(l), ml.lateHitT);
  ml.lateHitT = 0; ok('and not after it', !ml.lateHit(ml.on.find(x => x.side === 1 && x.downT <= 0 && x !== v) || l));
  void E;
};
