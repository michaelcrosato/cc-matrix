import { load, until, quickMatch } from '../lib.mjs';
export async function run(check) {
  // running: R1 once for a single, the strike rotates
  let env = load({ seed: 3 }), m = quickMatch(env, { seed: 3, forceBowler: 'terry' });
  until(env.game, () => m.phase === 'setup', 6); m.fieldPreset = 'defensive'; m.placeField(true); const s0 = m.striker.id; env.D.forceOutcome('1');
  until(env.game, () => m.phase === 'inPlay', 8); env.I.tap('run'); until(env.game, () => m.phase === 'between', 12);
  let last = m.inn.recs[m.inn.recs.length - 1]; check('R1 once on a push gives one run', last && last.ran === 1, last && { ran: last.ran, w: last.wicket });
  check('the strike rotates after a single', m.inn.striker !== s0, [s0, m.inn.striker]);
  // R1 twice for two (the mechanic: the fielders sent to the far boundary so the second run is safe)
  const away = mm => { for (const f of mm.fielders) { f.x = f.x * 3; f.y = 160 + (f.y - 160) * 3; f.home = [f.x, f.y]; } mm.planField(); };
  env = load({ seed: 4 }); m = quickMatch(env, { seed: 4, forceBowler: 'terry' });
  until(env.game, () => m.phase === 'setup', 6); env.D.forceOutcome('2');
  until(env.game, () => m.phase === 'inPlay', 8); away(m); env.I.tap('run'); env.game.advance(.8); env.I.tap('run'); until(env.game, () => m.phase === 'between', 16);
  last = m.inn.recs[m.inn.recs.length - 1]; check('R1 twice gives two runs', last && last.ran === 2, last && { ran: last.ran, b: last.boundary, w: last.wicket && last.wicket.how });
  // L1 sends both back
  env = load({ seed: 5 }); m = quickMatch(env, { seed: 5, forceBowler: 'terry' });
  until(env.game, () => m.phase === 'setup', 6); env.D.forceOutcome('1');
  until(env.game, () => m.phase === 'inPlay', 8); away(m); env.I.tap('run'); env.game.advance(.4); env.I.tap('back'); until(env.game, () => m.phase === 'between', 16);
  last = m.inn.recs[m.inn.recs.length - 1]; check('L1 mid-run sends both back (no run)', last && last.ran === 0 && !last.wicket, last && { ran: last.ran, w: last.wicket });
  // the dive: the bat slides the last 20 units
  const b = m.striker; b.y = 300 - 18; b.dive = 0; const no = m.grounded(b, 'B'); b.dive = .5; const yes = m.grounded(b, 'B');
  check('a dive grounds the bat 20 units out (6 without)', !no && yes, [no, yes]);
  // the catch ring: a human fielding side catches with a press at the overlap, drops with none
  const ring = (seed, press) => {
    const e = load({ seed }), mm = quickMatch(e, { seed, battingFirst: 1 }); until(e.game, () => mm.phase === 'pickBowler' || mm.phase === 'setup', 8); if (mm.phase === 'pickBowler') { e.I.tap('confirm'); e.game.advance(.2); }
    until(e.game, () => mm.phase === 'setup', 4); e.D.forceOutcome('caughtHuman'); e.I.tap('shot'); e.game.advance(.1);
    until(e.game, () => !!mm.catchRing || mm.phase === 'between', 10); const had = !!mm.catchRing;
    if (had && press) { const t = mm.catchRing.tc - mm.time; e.game.advance(Math.max(0, t) - 1 / 120); e.I.tap('shot'); }
    until(e.game, () => mm.phase === 'between', 10); const l = mm.inn.recs[mm.inn.recs.length - 1]; return { had, l };
  };
  let rr = ring(7, true); check('a catch chance shows the catch ring to a human fielder', rr.had);
  check('a press at the overlap catches', rr.l && rr.l.wicket && rr.l.wicket.how === 'caught', rr.l && rr.l.wicket);
  rr = ring(7, false); check('no press drops it', rr.l && !(rr.l.wicket && rr.l.wicket.how === 'caught') && rr.l.dropped, rr.l && { w: rr.l.wicket, d: rr.l.dropped });
  // a human throw: Cross throws to the keeper's end; a direct hit with the batter short is out
  env = load({ seed: 8 }); m = quickMatch(env, { seed: 8, battingFirst: 1 }); until(env.game, () => m.phase === 'pickBowler' || m.phase === 'setup', 8); if (m.phase === 'pickBowler') { env.I.tap('confirm'); env.game.advance(.2); }
  until(env.game, () => m.phase === 'setup', 4); env.D.forceOutcome('runout'); m.cfg.cheat.directHit = true; env.I.tap('shot'); env.game.advance(.1);
  until(env.game, () => (m.holder && m.holder !== m.keeper && m.holder !== m.bowler) || m.phase === 'between', 10);
  let threw = false; const off = env.K.bus.on('field:throw', () => { threw = true; });
  if (m.holder) { env.game.advance(.25); env.I.tap('shot'); }
  until(env.game, () => m.phase === 'between', 10); off();
  last = m.inn.recs[m.inn.recs.length - 1]; check('Cross throws in for the human fielder', threw); check('a direct hit with the batter short is a run out', last && last.wicket && last.wicket.how === 'run out', last && last.wicket);
  // overthrows: a wild shy at the keeper's end with nobody minding the stumps runs on
  env = load({ seed: 12 }); env.game.advance(.3); env.D.startMatch({ humans: {}, seed: 12, forceBowler: 'terry' }); env.game.advance(.1); m = env.D.match();
  until(env.game, () => m.phase === 'setup', 8); m.fieldPreset = 'defensive'; m.placeField(true); env.D.forceOutcome('1');
  until(env.game, () => (m.phase === 'inPlay' && !!m.holder && Math.hypot(m.holder.x, m.holder.y) > 90 && Math.hypot(m.holder.x, m.holder.y - 320) > 90) || m.phase === 'between', 12);
  let ot = 0; env.K.bus.on('field:overthrow', () => ot++);
  if (m.holder && m.phase === 'inPlay') { m.throwDecided = true; for (const f of m.fielders) if (f !== m.holder) { f.task = 'hold'; if (f === m.keeper || Math.hypot(f.x, f.y) < 80) { f.x = 300; f.y = -300; } } const nrm = env.K.RNG.normal; env.K.RNG.normal = () => 3; m.throwTo('S', m.holder); env.K.RNG.normal = nrm; for (const f of m.fielders) if (f.task === 'stumpsS') f.task = 'hold'; until(env.game, () => ot > 0 || m.phase !== 'inPlay', 4); }
  check('a missed shy with nobody backing up runs on for overthrows', ot > 0, ot);
  check('no errors', !env.game.errors.length, env.game.errors.map(e => e.message));
}
