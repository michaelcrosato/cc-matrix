import { load, until, quickMatch } from '../lib.mjs';
function bowl(seed) {
  const env = load({ seed }), { game, I } = env, m = quickMatch(env, { seed, battingFirst: 1 });
  until(game, () => m.phase === 'pickBowler' || m.phase === 'setup', 8);
  if (m.phase === 'pickBowler') { I.tap('confirm'); game.advance(.2); }
  until(game, () => m.phase === 'setup', 4);
  return { env, m };
}
/** start a run-up with delivery 1 and press at meter position u (null: no press) */
function deliver(env, m, u, after) {
  const { game, I } = env; I.tap('shot'); game.advance(.05);
  if (m.phase !== 'runup') return false;
  const f = m.env && env.K.T('meterSpeed'), start = m.meter.start, tPress = u === null ? null : start + (u <= .5 ? u / 2 / f : (1 - u) / 2 / f + .5 / f);
  if (tPress !== null) { game.advance(Math.max(0, tPress - m.pt) - 1 / 120); I.tap('shot'); }
  if (after) after();
  until(game, () => m.phase !== 'runup' && m.phase !== 'flight', 6);
  return true;
}
export async function run(check) {
  let { env, m } = bowl(1);
  check('the human bowls (setup waits for a delivery)', m.phase === 'setup' && !!m.bowlerInput(), m.phase);
  const fam = m.bowlerFamily(); env.I.tap('shot'); env.game.advance(.05);
  check('the run-up takes the family\'s time (' + fam + ')', Math.abs(m.runupTime - env.K.FAMILY[fam].runup) < .01, m.runupTime);
  until(env.game, () => m.phase === 'between', 10);
  ({ env, m } = bowl(2)); m.marker = [-6, 100];
  deliver(env, m, .5); const c = m.cur;
  check('a green release pitches near the marker', c.meter === 'green' && c.pitch && Math.hypot(c.pitch[0] - (-6), c.pitch[1] - 100) < 8, { meter: c.meter, pitch: c.pitch });
  until(env.game, () => m.phase === 'setup', 10);
  deliver(env, m, .97); check('the far-right tip oversteps: a no-ball', m.cur.extras.nb === 1 && m.cur.noBall === 'overstep', { meter: m.cur.meter, nb: m.cur.extras });
  until(env.game, () => m.phase === 'setup', 10); check('a free hit follows', m.inn.freeHit === true);
  deliver(env, m, null); check('no press auto-releases amber', m.cur.meter === 'amber', m.cur.meter);
  until(env.game, () => m.phase === 'setup', 10);
  m.marker = [0, 90]; deliver(env, m, .5, () => { until(env.game, () => m.phase === 'flight', 3); env.I.hold('right'); env.game.advance(.3); env.I.hold('right', false); });
  check('aftertouch right moves the ball +x', m.cur.aftertouch > 0 && m.cur.pitch && m.cur.pitch[0] - m.cur.target[0] > 3, { at: m.cur.aftertouch, pitch: m.cur.pitch, target: m.cur.target });
  until(env.game, () => m.phase === 'setup', 10);
  const before = m.fieldPreset, homes = JSON.stringify(m.fielders.map(f => f.home)); env.I.tap('run'); env.game.advance(.1);
  check('run cycles the field preset and moves the fielders', m.fieldPreset !== before && JSON.stringify(m.fielders.map(f => f.home)) !== homes, [before, m.fieldPreset]);
  const rx = m.releasePoint().x; env.I.tap('back'); env.game.advance(.1);
  check('back switches over / round the wicket (the release moves across)', m.overRound === 'round' && m.releasePoint().x !== rx && m.releasePoint().x > 0, [m.overRound, rx, m.releasePoint().x]);
  check('no errors', !env.game.errors.length, env.game.errors.map(e => e.message));
}
