// The rules engine: pure state and transitions, no drawing, no input. A match is one object (BZ.newMatch); each call
// below moves it on and returns what happened, so the scene, the commentary and the tests all read the same events.
// Kept from baseball: balls, strikes, outs, the four bases with forces, innings, the walk, the strikeout, extra innings,
// the walk-off, and the rule that the home team does not bat in the last half when it is ahead.
// Simplified: runners never steal or tag up (a deep caught fly sends the runner on third home), one throw decides a
// play, and a runner is only forced by the batter (no double-play turns).
BZ.newMatch = (o = {}) => ({
  innings: o.innings || 3, inning: 1, top: true, outs: 0, balls: 0, strikes: 0,
  bases: [null, null, null],                  // who is on 1B, 2B, 3B: the runner's name, or null
  score: [0, 0],
  line: [[], []],                              // runs per inning, per team
  hits: [0, 0], hr: [0, 0], k: [0, 0], walks: [0, 0], errors: [0, 0],
  lineup: [0, 0],                              // the batting order's place, per team (0..8)
  over: false, walkoff: false, extra: false,
  batter: null                                 // the batter's name
});
BZ.battingTeam = S => S.top ? 0 : 1;
BZ.fieldingTeam = S => 1 - BZ.battingTeam(S);
BZ.batterFor = (S, team = BZ.battingTeam(S)) => BZ.TEAMS[team].players[S.lineup[team] % 9];

// Runs for a team this inning, by inning for the line score. A home team that takes the lead in its last chance walks it off.
BZ.addRuns = (S, team, n) => {
  if (n <= 0) return 0;
  S.score[team] += n;
  const L = S.line[team];
  while (L.length < S.inning) L.push(0);
  L[S.inning - 1] = (L[S.inning - 1] || 0) + n;
  if (team === 1 && S.inning >= S.innings && S.score[1] > S.score[0]) { S.over = true; S.walkoff = true; }
  return n;
};

// A plate appearance begins: the next batter of the batting team steps in, and the count starts at 0-0. The order
// moves on here, at the start, so a half-inning change can never move the wrong team's order.
BZ.beginPA = S => {
  const t = BZ.battingTeam(S);
  S.batter = BZ.batterFor(S, t);
  S.lineup[t] = (S.lineup[t] + 1) % 9;
  S.balls = 0; S.strikes = 0;
  return S.batter;
};

// Force the runners ahead: a batter on first pushes any runner who is forced. Returns the runs that score.
BZ.forceAdvance = S => {
  const b = S.bases;
  let runs = 0;
  if (b[0]) {
    if (b[1]) {
      if (b[2]) { runs = 1; }
      b[2] = b[1];
    }
    b[1] = b[0];
  }
  b[0] = S.batter;
  return runs;
};

// Ball four: the batter walks and the forced runners move up.
BZ.walk = S => {
  const t = BZ.battingTeam(S);
  const runs = BZ.forceAdvance(S);
  S.walks[t]++;
  BZ.addRuns(S, t, runs);
  S.balls = 0; S.strikes = 0;
  return { ev: S.over ? 'gameOver' : 'walk', runs, batter: S.batter };
};

// The count. kind: 'ball' | 'strike' (looking or swinging) | 'foul'. Returns the event for the scene and the commentary.
BZ.pitchCount = (S, kind) => {
  if (kind === 'ball') {
    S.balls++;
    if (S.balls >= 4) return BZ.walk(S);
    return { ev: 'ball', count: BZ.countText(S) };
  }
  if (kind === 'strike') {
    S.strikes++;
    if (S.strikes >= 3) { S.k[BZ.battingTeam(S)]++; return BZ.recordOut(S, 'k'); }
    return { ev: 'strike', count: BZ.countText(S) };
  }
  if (kind === 'foul') {
    if (S.strikes < 2) S.strikes++;
    return { ev: 'foul', count: BZ.countText(S) };
  }
  throw new Error('pitchCount: unknown kind ' + kind);
};
BZ.countText = S => S.balls + '-' + S.strikes;

// One out. Three outs end the half-inning. The event says whether it ended.
BZ.recordOut = (S, why = 'out') => {
  S.outs++;
  S.balls = 0; S.strikes = 0;
  const ev = { ev: why === 'k' ? 'k' : 'out', why, batter: S.batter };
  if (S.outs >= 3) return Object.assign(ev, BZ.endHalf(S));
  return ev;
};

// The half-inning ends: the bases clear, and the match moves to the next half or ends.
BZ.endHalf = S => {
  const wasTop = S.top;
  S.outs = 0; S.bases = [null, null, null];
  if (wasTop) {
    if (S.inning >= S.innings && S.score[1] > S.score[0]) { S.over = true; return { end: 'gameOver' }; }
    S.top = false;
    return { end: 'halfOver' };
  }
  if (S.inning >= S.innings && S.score[0] !== S.score[1]) { S.over = true; return { end: 'gameOver' }; }
  S.top = true; S.inning++;
  if (S.inning > S.innings) S.extra = true;
  return { end: 'inningOver' };
};

// A hit. type: 'single' | 'double' | 'triple' | 'hr'. Runners go the way the hit sends them; returns the runs.
BZ.hit = (S, type) => {
  const t = BZ.battingTeam(S), b = S.bases, batter = S.batter;
  let runs = 0;
  if (type === 'hr') {
    for (let i = 0; i < 3; i++) if (b[i]) { runs++; b[i] = null; }
    runs++;
    S.hr[t]++;
  } else if (type === 'triple') {
    for (let i = 0; i < 3; i++) if (b[i]) { runs++; b[i] = null; }
    b[2] = batter;
  } else if (type === 'double') {
    if (b[2]) { runs++; b[2] = null; }
    if (b[1]) { runs++; b[1] = null; }
    if (b[0]) { b[2] = b[0]; b[0] = null; }
    b[1] = batter;
  } else {
    if (b[2]) { runs++; b[2] = null; }
    if (b[1]) { b[2] = b[1]; b[1] = null; }
    if (b[0]) { b[1] = b[0]; b[0] = null; }
    b[0] = batter;
  }
  S.hits[t]++;
  BZ.addRuns(S, t, runs);
  return runs;
};

// A caught ball: an out. A deep fly lets the runner on third tag up and score.
BZ.caughtFly = (S, deep) => {
  const t = BZ.battingTeam(S);
  let runs = 0;
  if (deep && S.bases[2]) { runs = 1; S.bases[2] = null; }
  BZ.addRuns(S, t, runs);
  return Object.assign(BZ.recordOut(S, 'fly'), { runs });
};

// The play after a fielded ground ball. target: 0 (first), 1 (second) or 2 (third) is where the throw goes.
// batterOut: the throw beat the batter to first. runnerOut: the throw beat the forced runner to that base.
BZ.groundPlay = (S, target, { batterOut, runnerOut }) => {
  const t = BZ.battingTeam(S);
  if (target === 0 && batterOut) {
    const o = BZ.recordOut(S, 'ground');
    return Object.assign(o, { runs: 0 });
  }
  if (target > 0 && runnerOut) {
    S.bases[target - 1] = null;
    const o = BZ.recordOut(S, 'force');
    if (o.end) return Object.assign(o, { runs: 0 });
  }
  const runs = BZ.forceAdvance(S);
  BZ.addRuns(S, t, runs);
  return { ev: runnerOut || batterOut ? 'forceOut' : 'safe', runs, batter: S.batter };
};

// The line score as rows of text, for the results screen.
// A cell is the runs in that inning once the team has batted in it, blank before. The visitors have batted in inning n
// once the match is past the top of it; the home team once it is past the bottom of it (or is in the top of the next).
BZ.lineScore = S => {
  const cols = Math.max(S.innings, S.inning, S.line[0].length, S.line[1].length);
  const cell = (team, n) => {   // n: 1-based inning
    const done = team === 0 ? (S.inning > n || (S.inning === n && !S.top)) : S.inning > n;
    if (!done && !(S.line[team][n - 1] > 0)) return '';
    return String(S.line[team][n - 1] || 0);
  };
  const row = team => Array.from({ length: cols }, (_, i) => cell(team, i + 1));
  return { cols, away: row(0), home: row(1), R: S.score.slice(), H: S.hits.slice() };
};
