/* RULES: the match state BZ.M, the count, outs, forces, scoring (the third-out rule), half-innings, game end (walk-offs,
 * skipping the bottom of the last inning, extra innings with the Bonus Runner, the mercy rule), line scores and stats.
 * Kept: balls/strikes/walks/strikeouts, fouls (a strike unless two; a two-strike foul bunt is a strikeout), HBP, fair and
 * foul, caught flies (fair or foul), tag-ups, force and tag outs, home runs (and off the pole), ground-rule doubles,
 * inside-the-park homers, errors, steals, wild pitches, double plays, walk-offs. Dropped (the House Rules card): balks,
 * the infield fly rule, appeals, interference, check swings, dropped third strikes, intentional walks. Pickoffs and
 * replays are in 19-replay.js. */
const DIFF = {
  rookie: { name: 'ROOKIE', swingSd: .085, aimSd: 4.6, disc: .45, relQ: .5, after: 0, react: .34, pitchMul: .85, assist: 1.25 },
  pro: { name: 'PRO', swingSd: .072, aimSd: 3.6, disc: .6, relQ: .68, after: .3, react: .25, pitchMul: 1, assist: 1 },
  allstar: { name: 'ALL-STAR', swingSd: .052, aimSd: 2.8, disc: .72, relQ: .8, after: .6, react: .19, pitchMul: 1.07, assist: 1 },
  batzooka: { name: 'BATZOOKA', swingSd: .04, aimSd: 2.1, disc: .82, relQ: .9, after: .9, react: .14, pitchMul: 1.15, assist: .9 }
};
const DIFF_ORDER = ['rookie', 'pro', 'allstar', 'batzooka'];
let M = null;

/** a new match. o: { mode, park, away, home, innings, difficulty, seed, ctrl: [[cap, co], [cap, co]] (inputs or null), fast, cheats } */
function newMatch(o) {
  const seed = o.seed === undefined ? (Math.random() * 1e9) >>> 0 : o.seed; BZ.seed(seed);
  const park = PARKS[o.park || TEAMS[o.home || 'HCK'].park];
  const side = (id, s) => {
    const T = TEAMS[id], lineup = lineupOf(T), pitcher = T.roster.find(p => p.pos === 'P');
    return { def: T, lineup, order: 0, pitcher, bullpen: T.roster.filter(p => p.pos === 'RP'), runs: 0, hits: 0, errors: 0, meter: o.meters ? o.meters[s] : 0, turbo: 100, line: [], side: s,
      ctrl: { cap: (o.ctrl && o.ctrl[s] && o.ctrl[s][0]) || null, co: (o.ctrl && o.ctrl[s] && o.ctrl[s][1]) || null }, stamina: {}, upg: (o.upgrades && o.upgrades[s]) || null };
  };
  M = BZ.M = {
    mode: o.mode || 'exhibition', park, parkId: park.id, seed, innings: o.innings || 3, diff: DIFF[o.difficulty || 'pro'], diffId: o.difficulty || 'pro',
    teams: [side(o.away || 'COM', 0), side(o.home || 'HCK', 1)], inning: 1, half: 0, outs: 0, balls: 0, strikes: 0,
    runners: [], fielders: [], ball: null, phase: 'pregame', phaseT: 0, t: 0, play: null, pitch: null, swing: null,
    reticle: { x: 0, z: 17, tx: 0, tz: 17 }, target: { x: 0, z: 17 }, stats: {}, fast: !!o.fast, cheats: Object.assign({}, o.cheats || {}), over: false, winner: -1,
    events: [], lastContact: null, mercy: o.mercy !== false, comeback: o.comeback !== false, rhubarbs: o.rhubarbs !== false, cam: 'plate', moon: null, replay: null,
    hazard: null, wind: { x: 0, y: 0 }, lesson: o.lesson || null, tour: o.tour || null, onEnd: o.onEnd || null, derby: null, bonusRunner: false, armed: false, hype: 0, shows: o.shows !== false,
    pitchCount: 0, superUsed: [false, false], bannerT: 0, banner: null, lineScoreShown: 0, playId: 0, lastPlay: null, boss: null
  };
  if (park.wind) { const a = R() * TAU, s = R() * 12 * TUNE.wind; M.wind = { x: Math.cos(a) * s, y: Math.sin(a) * s }; }
  for (const t of M.teams) { t.stamina[t.pitcher.id] = 100; for (const b of t.bullpen) t.stamina[b.id] = 100; t.line = []; }
  if (o.setup) o.setup(M);
  emit('matchStart', { M });
  return M;
}
const offense = () => M.teams[M.half], defense = () => M.teams[1 - M.half];
const batterNow = () => offense().lineup[offense().order % 9];
const pStat = p => M.stats[p.id] = M.stats[p.id] || { ab: 0, h: 0, d: 0, tr: 0, hr: 0, rbi: 0, bb: 0, k: 0, sb: 0, pk: 0, ip: 0, pitches: 0, r: 0, longest: 0 };
const isHuman = (s, duty) => { const c = M.teams[s].ctrl; return !!(duty === 'field' || duty === 'run' ? (c.co || c.cap) : c.cap); };
const inputOf = (s, duty) => { const c = M.teams[s].ctrl; return duty === 'field' || duty === 'run' ? (c.co || c.cap) : c.cap; };

/* ---- the count ---- */
function callBall() {
  M.balls++; pStat(defense().pitcher).pitches++;
  if (M.balls >= 4) { emit('call', { kind: 'ball', four: true }); walk(); return 'walk'; }
  emit('call', { kind: 'ball' }); return 'ball';
}
function callStrike(swinging, bunt) {
  M.strikes++;
  if (M.strikes >= 3) { const b = batterNow(); pStat(b).ab++; pStat(b).k++; pStat(defense().pitcher).k = (pStat(defense().pitcher).k || 0) + 1; emit('call', { kind: 'strike', swinging, three: true }); emit('strikeout', { batter: b, swinging, pitcher: defense().pitcher }); meterGain(1 - M.half, 12, 'strikeout'); outMade('k', null); return 'k'; }
  emit('call', { kind: 'strike', swinging }); return 'strike';
}
function callFoul(bunt) {
  if (M.strikes < 2) { M.strikes++; emit('call', { kind: 'foul' }); return 'foul'; }
  if (bunt) return callStrike(true, true);
  emit('call', { kind: 'foul', two: true }); return 'foul';
}
/** a walk (or a hit-by-pitch): the batter takes first, and the force chain pushes runners up */
function walk(hbp) {
  const b = batterNow(); pStat(b).bb++;
  const runOn = [0, 1, 2].map(i => runnerOn(i + 1));
  let push = true; const moves = [];
  for (let i = 0; i < 3 && push; i++) { if (runOn[i]) moves.push(runOn[i]); else push = false; }
  for (let i = moves.length - 1; i >= 0; i--) { const r = moves[i]; if (r.base === 3) scoreRun(r, true); else { r.base++; r.target = r.base; placeRunner(r); } }
  addRunner(b, 1);
  emit(hbp ? 'hbp' : 'walk', { batter: b });
  nextBatter();
}
function runnerOn(base) { return M.runners.find(r => r.base === base && r.state !== 'out' && r.state !== 'scored'); }
function addRunner(p, base) { const r = { p, base, target: base, prog: 0, state: 'onBase', x: 0, y: 0, forced: false, mustTag: false, tagBase: base, lead: 0, turbo: false, slide: 0, rig: null, steal: false, safeT: 0 }; placeRunner(r); M.runners.push(r); return r; }
function placeRunner(r) { const b = basePos(r.base); r.x = b.x; r.y = b.y; r.prog = 0; r.target = r.base; r.state = 'onBase'; }
function nextBatter() { const o = offense(); o.order = (o.order + 1) % 9; M.balls = 0; M.strikes = 0; M.armed = false; emit('batterUp', { batter: batterNow() }); }

/* ---- scoring ---- */
function scoreRun(r, earned) {
  r.state = 'scored'; const o = offense(); o.runs++; o.line[M.inning - 1] = (o.line[M.inning - 1] || 0) + 1; pStat(r.p).r++;
  if (M.play) M.play.runs.push(r); if (M.play && M.play.batter && !M.play.noRbi) pStat(M.play.batter).rbi++; else if (!M.play) pStat(batterNow()).rbi++;
  emit('run', { runner: r.p, team: M.half });
  const lead = M.teams[0].runs - M.teams[1].runs, before = lead + (M.half ? 1 : -1);
  if (M.half === 1 && M.inning >= M.innings && M.teams[1].runs > M.teams[0].runs) M.walkoff = true;
  if (Math.sign(before) !== Math.sign(lead)) emit(lead === 0 ? 'tieGame' : 'leadChange', {});
}
/** an out: how ('k', 'fly', 'force', 'tag', 'cs' ...); r the runner (or null for the batter on a strikeout) */
function outMade(how, r, forceType) {
  M.outs++;
  if (r) r.state = 'out';
  emit('out', { how, runner: r && r.p, outs: M.outs });
  if (M.play) M.play.outs.push({ how, force: !!forceType, r });
  if (M.outs >= 3 && M.play && forceType) {   // the third out a force (or the batter-runner before first): no runs on the play
    for (const s of M.play.runs) { const o = offense(); o.runs--; o.line[M.inning - 1]--; s.state = 'out'; }
    M.play.runs = []; M.walkoff = false;
  }
  if (how === 'k') { nextBatter(); }
}
function meterGain(s, n, why) {
  const t = M.teams[s]; if (!t) return;
  let k = TUNE.meterGain * (t.upg ? 1 + .1 * (t.upg.hype || 0) : 1);
  if (M.comeback && M.teams[1 - s].runs - t.runs >= 3) k *= 1.5;
  const was = t.meter; t.meter = clamp(t.meter + n * k, 0, 100);
  if (M.cheats.infMeter) t.meter = 100;
  if (was < 100 && t.meter >= 100) emit('meterFull', { team: s });
  emit('meter', { team: s, value: t.meter, why });
}

/* ---- half-innings and the end of the game ---- */
function halfOver() {
  const o = offense(); o.line[M.inning - 1] = o.line[M.inning - 1] || 0;
  emit('halfEnd', { inning: M.inning, half: M.half });
  M.runners = []; M.outs = 0; M.balls = 0; M.strikes = 0; M.armed = false;
  if (gameOverCheck(true)) return true;
  if (M.half === 0) M.half = 1; else { M.half = 0; M.inning++; emit('inningEnd', {}); }
  if (M.half === 1 && M.inning >= M.innings && M.teams[1].runs > M.teams[0].runs) return gameOverCheck(true);
  if (M.inning > M.innings) { M.bonusRunner = true; }
  return false;
}
/** the game is over: after the top of the last inning with the home team ahead, after any full last inning not tied,
 *  on a walk-off, or by the mercy rule (10 runs after two full innings) */
function gameOverCheck(atHalfEnd) {
  const [a, h] = [M.teams[0].runs, M.teams[1].runs];
  let over = false;
  if (M.walkoff) over = true;
  else if (atHalfEnd && M.inning >= M.innings) {
    if (M.half === 0 && h > a) over = true;
    if (M.half === 1 && a !== h) over = true;
  }
  if (!over && atHalfEnd && M.mercy && M.innings > 2 && M.inning >= 2 && M.half === 1 && Math.abs(a - h) >= 10) over = true;
  if (!over && M.inning > M.innings + 3 && atHalfEnd && M.half === 1 && a !== h) over = true;
  if (over) { M.over = true; M.winner = a > h ? 0 : 1; emit('gameEnd', { winner: M.winner, walkoff: !!M.walkoff }); }
  return over;
}
