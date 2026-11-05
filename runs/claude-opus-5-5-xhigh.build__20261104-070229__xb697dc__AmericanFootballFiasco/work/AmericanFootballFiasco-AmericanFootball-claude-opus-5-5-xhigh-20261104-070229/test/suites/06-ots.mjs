import { simCtx, match, until, call } from '../lib/sim.mjs';
export default async ok => {
  const { FF } = simCtx(), bus = FF.bus;
  const m = match(FF); call(m, 'hb_dive', 'cover2'); until(m, m => m.phase === 'LIVE', 8);
  const a = m.bySlot[0].RB;
  for (let k = 0; k < 3; k++) bus.emit('bigRun', { player: a, yards: 20, m });
  ok('three big plays: BLAZING', a.hot > 0, a.heat + ' ' + a.hot);
  const sp = m.topSpeed(a); a.hot = 0; ok('Blazing runs 12% faster', Math.abs(sp / m.topSpeed(a) - 1.12) < .02, sp / m.topSpeed(a)); m.ots.setHot(a, 3, 'streak');
  bus.emit('td', { side: 1, team: m.teams[1], player: m.bySlot[1].S, m }); ok('an opponent\'s TD cools him off', !(a.hot > 0) && a.heat === 0);
  // the Fiasco Meter fills by disasters and deals a card
  const before = m.cards[0].length; m.meter[0] = 90; m.ots.fill(0, 20); ok('a full Fiasco Meter deals a card and empties', m.cards[0].length === before + 1 && m.meter[0] === 0, m.cards[0]);
  // each card's effect is measurable
  const m2 = match(FF, { cards: { 0: ['ROCKET_CLEATS', 'GLUE_GLOVES', 'BRICK_WALL'], 1: ['BUTTERFINGERS', 'MEGA_HIT', 'MASCOT_MAYHEM'] } });
  m2.forceCall = { 0: { play: 'slants', card: 'ROCKET_CLEATS' }, 1: { play: 'cover2', card: 'MASCOT_MAYHEM' } }; until(m2, x => x.phase === 'LIVE', 8);
  const wr = m2.bySlot[0].WR1, s0 = m2.topSpeed(wr); bus.clearMods('card'); const s1 = m2.topSpeed(wr); ok('ROCKET CLEATS: +20% speed', Math.abs(s0 / s1 - 1.2) < .01, s0 / s1);
  ok('MASCOT MAYHEM: the mascot runs on as a 12th player', m2.extra.length === 1 && m2.extra[0].mascot, m2.extra.length);
  bus.addMod('catch.p', { add: -.35, test: x => x.receiver.side !== 1, tag: 'card' }); ok('BUTTERFINGERS: their receivers -35%', Math.abs(bus.mod('catch.p', .66, { receiver: wr }) - .31) < .001); bus.clearMods('card');
  // specials: once a drive, under their conditions
  const m3 = match(FF, { home: 'mudhogs', away: 'fiascos' }); call(m3, 'hb_dive', 'cover2'); until(m3, x => x.phase === 'LIVE' && x.ball.holder && x.ball.holder.slot === 'RB', 6);
  const bertha = m3.ball.holder; ok('Bertha\'s MUDSLIDE is ready with the ball', m3.specialReady(bertha)); m3.trySpecial(bertha); ok('it fires', bertha.specialT > 0);
  ok('and is not ready again this drive', !m3.specialReady(bertha));
  // cosmetics don't change the sim: two runs with and without presentation hash the same
  const run = () => { const mm = match(FF, { seed: 21 }); call(mm, 'hb_sweep', 'man'); for (let i = 0; i < 120 * 8; i++) mm.stepSim(1 / 120); const h = mm.hash(); mm.ots.dispose(); return h; };
  ok('the same seed plays the same (deterministic)', run() === run());
};
