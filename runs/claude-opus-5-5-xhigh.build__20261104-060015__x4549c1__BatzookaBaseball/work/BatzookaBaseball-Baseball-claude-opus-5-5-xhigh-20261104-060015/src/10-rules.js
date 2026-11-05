/* =============================================================================
 * 10-rules: the rules engine, pure logic over the match state BZ.M: the count,
 * outs, runs (with the third-out rule), half-innings, the game's end (walk-offs,
 * skipping the last bottom half, extra innings with the Bonus Runner, SUDDEN
 * BOOM, the mercy rule), the line score and box stats.
 * House rules (what you can't do): no balks, no infield fly rule, no appeals, no
 * interference or obstruction, no check swings, no dropped third strikes, no
 * intentional walks, no substitutions but a pitching change, no arguing.
 * ========================================================================== */
BZ.HOUSE_RULES = ['No balks', 'No infield fly rule', 'No appeals', 'No interference or obstruction calls', 'No check swings: every swing counts',
  'No dropped third strikes', 'No intentional walks', 'Only one substitution: a pitching change', 'No arguing with the umpire (believe us, we tried)'];

BZ.newTeamState = (teamId, side) => {
  const T = BZ.get('teams', teamId);
  return {
    id: teamId, def: T, side, lineup: T.lineup.slice(), order: 0, pitcher: T.ace, bullpen: T.reliever ? [T.reliever] : [],
    runs: 0, hits: 0, errors: 0, meter: 0, turbo: 100, line: [], stamina: {}, humans: [], afterburn: 0, batzookaArmed: false,
    shortCircuit: 0, used: {}
  };
};
BZ.statFor = (M, p) => M.stats[p.id] || (M.stats[p.id] = { name: p.name, team: p.team, AB: 0, H: 0, '2B': 0, '3B': 0, HR: 0, RBI: 0, BB: 0, K: 0, SB: 0, R: 0, IP: 0, PK: 0, PBB: 0, pitches: 0, outsP: 0, catches: 0, dives: 0, robbed: 0, longest: 0 });
BZ.offense = M => M.teams[M.half === 'top' ? 0 : 1];
BZ.defense = M => M.teams[M.half === 'top' ? 1 : 0];
BZ.leadBy = (M) => M.teams[1].runs - M.teams[0].runs;

BZ.rules = {
  /** a called or swinging strike */
  strike(M, how) {
    M.strikes++;
    BZ.statFor(M, M.pitcher).pitches++;
    if (M.strikes >= 3) { this.strikeout(M, how); return 'K'; }
    BZ.bus.emit('call', { kind: 'strike', how });
    return 'S';
  },
  ball(M) {
    M.balls++;
    BZ.statFor(M, M.pitcher).pitches++;
    if (M.balls >= 4) { this.walk(M); return 'BB'; }
    BZ.bus.emit('call', { kind: 'ball' });
    return 'B';
  },
  foul(M, bunt) {
    BZ.statFor(M, M.pitcher).pitches++;
    if (bunt && M.strikes >= 2) { M.strikes = 3; this.strikeout(M, 'bunt'); return 'K'; }
    if (M.strikes < 2) M.strikes++;
    BZ.bus.emit('call', { kind: 'foul' });
    return 'F';
  },
  strikeout(M, how) {
    BZ.statFor(M, M.batter).AB++; BZ.statFor(M, M.batter).K++; BZ.statFor(M, M.pitcher).PK++;
    BZ.bus.emit('call', { kind: 'strike', how, three: true });
    BZ.bus.emit('strikeout', { batter: M.batter, pitcher: M.pitcher, how });
    this.out(M, 'k', M.batter);
    this.nextBatter(M);
  },
  /** ball four or a hit batter: the batter takes first, forced runners move up */
  walk(M, hbp) {
    BZ.statFor(M, M.batter).BB++; if (!hbp) BZ.statFor(M, M.pitcher).PBB++;
    const moved = this.forceAdvance(M, M.batter);
    BZ.bus.emit(hbp ? 'hbp' : 'walk', { batter: M.batter, pitcher: M.pitcher, scored: moved });
    this.nextBatter(M);
  },
  /** put a new runner on first and push forced runners along (walks, HBP); returns runs scored */
  forceAdvance(M, batter) {
    let runs = 0;
    const B = M.bases; // [1B, 2B, 3B] player or null
    if (B[0]) { if (B[1]) { if (B[2]) { this.score(M, B[2], batter); runs++; } B[2] = B[1]; } B[1] = B[0]; }
    B[0] = batter;
    return runs;
  },
  /** a run scores (rbi credited to the batter when given) */
  score(M, runner, rbiTo) {
    const O = BZ.offense(M); O.runs++; if (M.play && !M.play.done) M.play.runs.push({ id: runner.id, t: M.clock });
    BZ.statFor(M, runner).R++; if (rbiTo) BZ.statFor(M, rbiTo).RBI++;
    const inn = M.inning - 1; O.line[inn] = (O.line[inn] || 0) + 1;
    BZ.bus.emit('run', { runner, team: O.id, score: [M.teams[0].runs, M.teams[1].runs] });
    this.checkLead(M);
    if (this.walkoffNow(M)) { M.walkoff = true; BZ.bus.emit('walkoff', { team: O.id, runner }); }
  },
  /** take a run back (the third-out rule: a force out or the batter-runner out before first ends the inning with no runs) */
  unscore(M, n) {
    const O = BZ.offense(M); const inn = M.inning - 1;
    for (let i = 0; i < n; i++) { O.runs--; O.line[inn] = Math.max(0, (O.line[inn] || 0) - 1); }
    M.walkoff = false;
  },
  checkLead(M) {
    const lead = Math.sign(M.teams[1].runs - M.teams[0].runs);
    if (M._lead !== undefined && lead !== M._lead && lead !== 0) BZ.bus.emit('leadChange', { lead });
    M._lead = lead;
  },
  walkoffNow(M) { return M.half === 'bottom' && M.inning >= M.innings && M.teams[1].runs > M.teams[0].runs; },
  out(M, how, who) {
    M.outs++;
    const D = BZ.defense(M); BZ.statFor(M, D.pitcher).outsP++;
    BZ.bus.emit('out', { how, who, outs: M.outs });
    if (M.play && !M.play.done) M.play.outs.push({ how, id: who && who.id, t: M.clock });
  },
  nextBatter(M) {
    const O = BZ.offense(M); O.order = (O.order + 1) % O.lineup.length;
    M.balls = 0; M.strikes = 0; M.batterUp = true;
  },
  batterNow(M) { const O = BZ.offense(M); return O.lineup[O.order]; },
  /** after the half ends: is the game over? returns null (play on) or { winner: 0 | 1, why } */
  gameOverAfterHalf(M) {
    const a = M.teams[0].runs, h = M.teams[1].runs, n = M.innings;
    // mercy: a 10-run lead after 2 full innings (home leading after the top of the 3rd counts too)
    if (M.mercy && M.inning >= 2 && Math.abs(a - h) >= 10 && (M.half === 'bottom' || (M.half === 'top' && h - a >= 10))) return { winner: a > h ? 0 : 1, why: 'mercy' };
    if (M.half === 'top' && M.inning >= n && h > a) return { winner: 1, why: 'skip' };          // home leads after the top of the last: no bottom half
    if (M.half === 'bottom' && M.inning >= n && a !== h) return { winner: a > h ? 0 : 1, why: 'final' };
    if (M.half === 'bottom' && M.inning >= n + 3 && a === h) return { winner: -1, why: 'boom' };   // SUDDEN BOOM: a home run duel decides it
    return null;
  },
  /** the next half-inning: flip sides, the Bonus Runner in extra innings */
  nextHalf(M) {
    const prev = M.half;
    if (M.half === 'top') M.half = 'bottom'; else { M.half = 'top'; M.inning++; }
    M.outs = 0; M.balls = 0; M.strikes = 0; M.bases = [null, null, null];
    const O = BZ.offense(M); O.line[M.inning - 1] = O.line[M.inning - 1] || 0;
    if (M.inning > M.innings) {   // extra innings: the batter who made the last out of the last inning starts on second
      const last = O.lineup[(O.order + O.lineup.length - 1) % O.lineup.length];
      M.bases[1] = last; M.bonusRunner = true;
    } else M.bonusRunner = false;
    BZ.bus.emit('halfStart', { inning: M.inning, half: M.half, prev });
  },
  /** stats line for the box: AVG etc. */
  avg(s) { return s.AB ? (s.H / s.AB).toFixed(3).replace(/^0/, '') : '.000'; }
};
