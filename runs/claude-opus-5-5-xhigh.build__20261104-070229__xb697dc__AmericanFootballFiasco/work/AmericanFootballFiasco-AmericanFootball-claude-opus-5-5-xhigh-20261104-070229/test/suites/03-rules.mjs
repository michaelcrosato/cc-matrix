import { simCtx, match, until, call } from '../lib/sim.mjs';
export default async ok => {
  const { FF } = simCtx(), YD = 16;
  // a touchdown by a run (god mode on the carrier's side), then the PAT kick, then the kickoff by the scorers
  let m = match(FF, { start: { possession: 0, los: 90, down: 1, toGo: 10 }, cheats: { godMode: true, both: true } }); m.cheatSide = 0; call(m, 'qb_sneak', 'cover2');
  ok('a run scores a touchdown', until(m, m => m.phase === 'CELEBRATE') && m.score[0] === 6, m.score + ' ' + m.phase);
  m.forceCall = { 0: { play: 'pat_kick' }, 1: { play: 'fg_block' } }; m.forceKick = { power: .9, acc: 0 }; m.cheats = {};
  ok('the PAT is kicked', until(m, m => m.score[0] === 7, 40), m.score);
  m.forceCall = null; m.forceKick = null;
  ok('then the scorers kick off', until(m, m => m.phase === 'PRESNAP' && m.play.off.type === 'kickoff', 20) && m.poss === 0);
  // a field goal: good, and its points
  m = match(FF, { start: { possession: 0, los: 75, down: 4, toGo: 10 } }); call(m, 'field_goal', 'cover2'); m.forceKick = { power: .9, acc: 0 };
  ok('a straight 42-yard field goal is good', until(m, m => m.score[0] === 3, 30), m.score + ' ' + JSON.stringify(m.fgResult));
  m = match(FF, { start: { possession: 0, los: 75, down: 4, toGo: 10 } }); call(m, 'field_goal', 'cover2'); m.forceKick = { power: .9, acc: 1 };
  until(m, m => m.phase === 'DEAD' || m.phase === 'CELEBRATE', 30); ok('a hooked field goal is no good, the ball goes over', m.score[0] === 0 && m.poss === 1, m.score + ' poss ' + m.poss);
  // a turnover on downs
  m = match(FF, { start: { possession: 0, los: 30, down: 4, toGo: 15 } }); call(m, 'hb_dive', 'goal_line'); m.forceTackle = true;
  until(m, m => m.phase === 'PLAYCALL' && m.playNo >= 1, 30); ok('a short 4th down turns the ball over', m.poss === 1 && m.down === 1, 'poss ' + m.poss);
  // an incomplete pass: the ball back at the spot, the next down, the clock stopped (no runoff)
  m = match(FF, { start: { possession: 0, los: 40, down: 1, toGo: 20 }, cheats: { forceINT: false } }); call(m, 'deep_post', 'cover2');
  let clock0 = null; until(m, m => { if (m.phase === 'LIVE' && clock0 === null) clock0 = m.clock; return m.phase === 'DEAD'; }, 30);
  const inc = m.result.why === 'incomplete'; until(m, m => m.phase === 'PLAYCALL', 10);
  if (inc) ok('an incompletion: 2nd down at the same spot', m.down === 2 && Math.abs(m.los - m.xAt(0, 40)) < 1, m.down + ' ' + m.spotText());
  // the clock: runs in a live play, runoff after an in-bounds tackle
  m = match(FF, { start: { possession: 0, los: 40 }, quarterLength: 120 }); call(m, 'hb_dive', 'cover2'); m.forceTackle = true;
  const c0 = m.clock; until(m, m => m.phase === 'PLAYCALL' && m.playNo >= 1, 30);
  ok('the clock runs during the play and runs off after an in-bounds tackle', c0 - m.clock >= FF.T.runoff, (c0 - m.clock).toFixed(1));
  // a safety: the carrier tackled in his own end zone
  m = match(FF, { start: { possession: 0, los: 3, down: 1, toGo: 20 } }); call(m, 'hb_dive', 'cover2');
  until(m, m => m.phase === 'LIVE' && m.ball.holder && m.ball.holder.slot === 'RB', 10); const rb = m.ball.holder, tk = m.bySlot[1].LB1; rb.x = m.ownGoalX(0) - m.dir(0) * 3 * YD; tk.x = rb.x + 10; tk.y = rb.y; m.forceTackle = true; m.tackle(tk, rb, 1);
  ok('a tackle in your own end zone is a safety', m.score[1] === 2, m.score + ' ' + (m.result && m.result.why));
  until(m, m => m.phase === 'PLAYCALL', 10); ok('after a safety, the side that gave it up kicks off from its 20', m.callKind === 'kickoff' && m.poss === 0 && Math.abs(m.los - m.xAt(0, 20)) < 1, m.callKind + ' ' + m.poss + ' ' + m.spotText());
  // quarters, halftime, the final
  m = match(FF, { quarterLength: 20, start: 'kickoff' }); until(m, m => m.quarter === 2, 400);
  ok('the first quarter ends into the second', m.quarter === 2);
  until(m, m => m.phase === 'HALFTIME', 400); ok('halftime after the 2nd quarter', m.phase === 'HALFTIME');
  until(m, m => m.quarter === 3, 30); ok('the 3rd quarter starts with the ends switched', m.quarter === 3 && m.dir(0) === -1);
  until(m, m => m.over, 900); ok('the game ends with a final', m.over && m.phase === 'FINAL', m.phase + ' q' + m.quarter);
  // overtime: tied at the end of regulation, sudden death
  m = match(FF, { quarter: 4, clock: 1, score: [7, 7], start: { possession: 0, los: 20 } }); call(m, 'kneel', 'cover2');
  until(m, m => m.ot, 60); ok('tied at the end of regulation: overtime', m.ot && m.quarter === 5);
  // a touchback on a kickoff into the end zone
  m = match(FF, { start: { possession: 0, los: 30, kickoff: true } }); m.forceCall = { 0: { play: 'ko_deep' }, 1: { play: 'ret_mid' } }; m.forceKick = { power: 1, acc: 0 };
  until(m, m => m.phase === 'PLAYCALL' && m.playNo >= 1, 30); ok('a kickoff ends with the other side\'s ball', m.poss === 1, 'poss ' + m.poss);
};
