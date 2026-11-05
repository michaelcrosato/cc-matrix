// 5.2: human bowling: the bowler picker, the marker, the release meter, oversteps and free hits, aftertouch, the field
export default ({ boot, suite, until }) => {
  const s = suite();
  const setup = () => {
    const B = boot(); const { D, game } = B; D.setTuning('seam', 0); D.setTuning('swing', 0);
    D.startMatch({ mode: 'quick', teams: ['mud', 'ker'], ground: 'green', overs: 2, wickets: 5, seed: 6, humans: [[], [game.input]], kerfuffle: false, batFirst: 'mud' });
    until(game, () => D.match() && D.snapshot().scene === 'match', 3, 1 / 60); const m = D.match(); m.cfg.noReplays = true; return Object.assign(B, { m, s });
  };
  let B = setup(); const { m, game, I, D } = B;
  until(game, () => m.needBowler, 10, 1 / 60);
  s.ok('a human captain gets the bowler picker', !!m.needBowler && m.needBowler.length >= 2);
  I.tap('right'); game.advance(.05); I.tap('confirm'); game.advance(.1);
  s.ok('confirm picks the bowler', !m.needBowler && m.I.bowler, m.I.bowler);
  until(game, () => m.state === 'setup', 5, 1 / 60);
  const pre = m.fieldPreset[m.bowlT]; I.tap('run'); game.advance(.05);
  s.ok('R1 cycles the field preset', m.fieldPreset[m.bowlT] !== pre, [pre, m.fieldPreset[m.bowlT]]);
  const ov = m.overRound; I.tap('back'); game.advance(.05); s.ok('L1 switches over or round the wicket', m.overRound !== ov);
  I.tap('back'); game.advance(.05);
  m.marker.x = -4; m.marker.y = 90;
  I.tap('shot'); game.advance(.05);
  s.ok('a delivery button starts the run-up', m.state === 'runup');
  const fam = D.DELIVERIES[m.del.id].fam;
  s.ok('the run-up lasts its family\'s time', Math.abs(m.runupDur - ({ pace: 2, swing: 1.7, medium: 1.5, spin: .9 })[fam]) < 1e-6, [fam, m.runupDur]);
  until(game, () => m.meter && m.meter.on && Math.abs(m.meter.p - .5) < .02, 3, 1 / 240);
  I.tap('shot'); game.advance(1 / 120); game.advance(1 / 120);
  s.ok('a press in the centre of the meter is green', m.meter.lock === 'green', m.meter);
  const mk = [m.marker.x, m.marker.y];
  until(game, () => m.ball.pitched || m.state === 'inPlay' || m.state === 'dead', 4, 1 / 120);
  s.ok('a green release pitches within 3 units of the marker', Math.hypot(m.ball.pitchX - mk[0], m.ball.pitchY - mk[1]) < 3.2, [m.ball.pitchX, m.ball.pitchY, mk]);
  until(game, () => m.state === 'between' || m.state === 'break', 30, 1 / 60);
  // the red tip: an overstep, a no-ball and a free hit
  until(game, () => m.state === 'setup', 10, 1 / 60); I.tap('shot'); game.advance(.05);
  until(game, () => m.meter && m.meter.on && m.meter.p > .96, 3, 1 / 240); I.tap('shot'); game.advance(1 / 60);
  s.ok('a press on the red tip is an overstep', m.meter.lock === 'over', m.meter.lock);
  until(game, () => m.state === 'flight', 3, 1 / 120); s.ok('an overstep is a no-ball', m.noBall);
  until(game, () => m.state === 'between', 30, 1 / 60); s.ok('the next ball is a FREE HIT', m.I.freeHit);
  // no press: amber
  until(game, () => m.state === 'setup', 10, 1 / 60); I.tap('shot'); game.advance(.05);
  until(game, () => m.state === 'flight', 4, 1 / 120);
  s.ok('no press on the meter is an amber release', m.delInfo.grade === 'amber', m.delInfo.grade);
  until(game, () => m.state === 'between', 30, 1 / 60);
  // aftertouch: the stick right after release moves the pitch point +x
  const pitchWith = hold => { until(game, () => m.state === 'setup', 10, 1 / 60); m.marker.x = 0; m.marker.y = 120; I.tap('shot'); game.advance(.05); until(game, () => m.meter && m.meter.on && Math.abs(m.meter.p - .5) < .02, 3, 1 / 240); I.tap('shot'); until(game, () => m.state === 'flight', 3, 1 / 240); if (hold) I.hold('right'); game.advance(.25); I.hold('right', false); until(game, () => m.ball.pitched || m.state !== 'flight', 3, 1 / 120); const x = m.ball.pitchX; until(game, () => m.state === 'between' || m.state === 'break', 30, 1 / 60); return x; };
  const a = pitchWith(false), b = pitchWith(true);
  s.ok('aftertouch to the right moves the pitching point +x', b > a + 1.5, [a, b]);
  B.s.noErrors(game);
};
