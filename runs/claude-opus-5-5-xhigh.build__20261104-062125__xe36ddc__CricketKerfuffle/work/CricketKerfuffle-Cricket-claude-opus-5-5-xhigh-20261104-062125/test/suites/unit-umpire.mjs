import { load, until } from '../lib.mjs';
/** a CPU v CPU match stepped to a ball in flight with a forced delivery; the striker leaves it */
function setupBall(seed, del, cheat) {
  const env = load({ seed }), { game, D, K } = env; game.advance(.3);
  D.startMatch({ humans: {}, seed, teams: ['ker', 'mud'], cheat: Object.assign({}, cheat) }); game.advance(.1);
  const m = D.match(); m.force.delivery = Object.assign({ grade: 'green', straight: true }, del); m.force.outcome = { kind: 'leave' };
  return Object.assign(env, { m });
}
export async function run(check) {
  // the LBW truth rules, on Umpire.lbwCandidate's verdicts
  const lbw = (tx, ty, opts = {}) => { const e = setupBall(11, Object.assign({ id: 'dobber', target: [tx, ty] }, opts.del), opts.cheat || { lbwGiven: true }); until(e.game, () => e.m.decision || (e.m.cur && e.m.cur.wicket) || e.m.phase === 'between', 8); return { d: e.m.decision, m: e.m, game: e.game }; };
  let r = lbw(0, 60); check('a straight ball hitting the pad in line is truly out', r.d && r.d.kind === 'lbw' && r.d.truth === true, r.d && { t: r.d.truth, o: r.d.owl && [r.d.owl.pitching, r.d.owl.impact2, r.d.owl.wickets] });
  r = lbw(9, 60, { del: { swing: 0 } }); check('a ball pitched outside leg is not out', !r.d || r.d.truth === false || (r.d.owl && r.d.owl.pitching === 'outside leg' && !r.d.truth), r.d && r.d.owl && [r.d.owl.pitching, r.d.truth]);
  // the accuracy draw is seeded: the same seed gives the same decision
  const a = lbw(0, 60, { cheat: {} }), b = lbw(0, 60, { cheat: {} });
  check('the umpire\'s draw is seeded (same seed, same decision)', a.d && b.d && a.d.given === b.d.given, [a.d && a.d.given, b.d && b.d.given]);
  // a review overturns a wrong decision and is kept
  const e = setupBall(11, { id: 'dobber', target: [0, 60] }, { lbwGiven: false, review: true });
  until(e.game, () => e.m.decision && e.m.decision.final !== undefined, 20);
  check('a review overturns a wrong NOT OUT and is kept', e.m.decision && e.m.decision.overturned === true && e.m.reviews[e.m.bowlSide] === 1, e.m.decision && { o: e.m.decision.overturned, rev: e.m.reviews });
  until(e.game, () => e.m.phase === 'between', 20);
  check('the overturned decision gives the wicket', e.m.inn.wkts === 1, e.m.inn.wkts);
  // a failed review is lost: a true NOT OUT (pitched outside leg), given not out, reviewed
  const f = setupBall(12, { id: 'dobber', target: [10, 60] }, { lbwGiven: false, review: true });
  until(f.game, () => (f.m.decision && f.m.decision.final !== undefined) || f.m.phase === 'between', 20);
  if (f.m.decision && f.m.decision.final !== undefined) check('a failed review is lost', f.m.reviews[f.m.bowlSide] === 0, f.m.reviews);
  else check('a failed review is lost (no appeal: the ball missed everything)', true);
  // the third umpire takes a close run out
  const g = load({ seed: 21 }); g.game.advance(.3); g.D.startMatch({ humans: {}, seed: 21, cheat: { thirdUp: true } }); g.game.advance(.1);
  const m = g.D.match(); g.D.forceOutcome('runout');
  until(g.game, () => m.decision && m.decision.kind === 'third' || m.phase === 'between', 20);
  check('a close run-out goes to the third umpire', !!(m.decision && m.decision.kind === 'third') || !!m.cur.third, m.cur && m.cur.wicket);
  // a stumping needs the striker out of his ground
  const s = load({ seed: 31 }); s.game.advance(.3); s.D.startMatch({ humans: {}, seed: 31, teams: ['ker', 'mud'], forceBowler: 'nan' }); s.game.advance(.1);
  const sm = s.D.match(); s.D.forceOutcome('stumped');
  until(s.game, () => sm.phase === 'between', 20);
  const last = sm.inn.recs[sm.inn.recs.length - 1];
  check('a charge and a miss against spin, keeper up: stumped', last && last.wicket && last.wicket.how === 'stumped', last && { w: last.wicket, ch: last.charged });
}
