// 5.4 and 5.5: running, the call, the catch ring, throws, run-outs, overthrows
export default ({ boot, suite, until }) => {
  const s = suite();
  const start = (cfg) => { const B = boot(); B.D.setTuning('seam', 0); if (cfg.humans) cfg.humans = cfg.humans.map(h => h.map(x => x === null ? B.game.input : x)); B.D.startMatch(Object.assign({ mode: 'quick', ground: 'green', overs: 2, wickets: 5, seed: 8, kerfuffle: false }, cfg)); until(B.game, () => B.D.match() && B.D.snapshot().scene === 'match', 3); B.m = B.D.match(); B.m.cfg.noReplays = true; return B; };
  // a human batter calls a single after a push: one run, the strike rotates
  let B = start({ teams: ['ker', 'mud'], humans: [[null], []], batFirst: 'ker' });
  until(B.game, () => B.m.state === 'setup', 20, 1 / 120); B.m.forceNext('one'); const r0 = B.m.lastRec;
  until(B.game, () => B.m.state === 'inPlay', 8, 1 / 120); const st = B.m.I.strikeCard; B.game.advance(.1); B.I.tap('run');
  until(B.game, () => B.m.runs >= 1 || B.m.state !== 'inPlay', 6, 1 / 120); B.I.tap('back');
  until(B.game, () => B.m.lastRec !== r0, 25, 1 / 120);
  s.ok('a push and one call of the run: one run, the strike rotates', B.m.lastRec && B.m.lastRec.runs === 1 && B.m.I.strikeCard !== st, B.m.lastRec && [B.m.lastRec.runs, B.m.deadWhy]);
  // the forced outcomes play through the real machinery: a single, a run-out, a catch, a six, a four
  B = start({ teams: ['ker', 'mud'], humans: [[], []] });
  const run = (kind, o) => { until(B.game, () => B.m.state === 'setup', 25, 1 / 120); B.m.forceNext(kind, o); const r0 = B.m.lastRec; until(B.game, () => B.m.lastRec !== r0, 30, 1 / 120); return B.m.lastRec; };
  let r = run('runout'); s.ok('a forced run-out: the batter running in is out, run out', r && r.wicket && r.wicket.how === 'run out', r && [r.wicket, B.m.deadWhy]);
  r = run('caught'); s.ok('a forced catch is caught', r && r.wicket && r.wicket.how === 'caught', r && r.wicket);
  r = run('six'); s.ok('a forced six clears the rope on the full', r && r.boundary === 6, r && [r.boundary, r.runs]);
  r = run('four'); s.ok('a forced four reaches the rope along the ground', r && r.boundary === 4, r && [r.boundary, r.runs]);
  r = run('bowled'); s.ok('a forced bowled hits the stumps', r && r.wicket && r.wicket.how === 'bowled', r && r.wicket);
  r = run('lbw'); s.ok('a forced lbw is given out', r && r.wicket && r.wicket.how === 'lbw', r && [r.wicket, B.m.decision]);
  s.noErrors(B.game);
  // the catch ring: a human fielding side presses as the rings meet
  const ring = press => { const C = start({ teams: ['mud', 'ker'], humans: [[], [null]], batFirst: 'mud' }); C.m.cfg.assist = 'Manual';
    until(C.game, () => C.m.needBowler, 10, 1 / 60); C.I.tap('confirm'); until(C.game, () => C.m.state === 'setup', 5, 1 / 60);
    C.m.forceNext('caught'); C.I.tap('shot'); until(C.game, () => C.m.contact, 6, 1 / 120); C.m.sideFlags = null;
    until(C.game, () => C.m.catchQTE, 1, 1 / 120); const q = C.m.catchQTE;
    if (q && press) { until(C.game, () => C.m.t >= q.tCatch - .02, 4, 1 / 240); C.I.tap('shot'); }
    until(C.game, () => C.m.state === 'dead' || C.m.state === 'between', 8, 1 / 120); return { C, q, r: C.m.ballRec || C.m.lastRec };
  };
  let R = ring(true); s.ok('the catch ring appears for an aerial chance', !!R.q); s.ok('a press as the rings meet takes the catch', R.r && R.r.wicket && R.r.wicket.how === 'caught', R.r && [R.r.wicket, R.C.m.deadWhy]);
  R = ring(false); s.ok('no press: dropped', R.r ? !(R.r.wicket && R.r.wicket.how === 'caught') : true, R.r && R.r.wicket);
  // throws: a human fielder throws to the end he picks
  const C = start({ teams: ['mud', 'ker'], humans: [[], [null]], batFirst: 'mud' }); C.m.cfg.assist = 'Manual';
  until(C.game, () => C.m.needBowler, 10, 1 / 60); C.I.tap('confirm'); until(C.game, () => C.m.state === 'setup', 5, 1 / 60);
  C.m.forceNext('one'); C.I.tap('shot'); until(C.game, () => C.m.fielders.some(f => f.hasBall), 10, 1 / 120);
  let thrown = null; const off = C.D.BUS.subs; C.game.advance(.35); (off.throw = off.throw || []).push(d => { thrown = d; }); C.I.tap('loft'); until(C.game, () => thrown, 2, 1 / 120);
  s.ok("the human's □/K throws to the bowler's end", thrown && thrown.end === 1, thrown);
  s.noErrors(C.game);
};
