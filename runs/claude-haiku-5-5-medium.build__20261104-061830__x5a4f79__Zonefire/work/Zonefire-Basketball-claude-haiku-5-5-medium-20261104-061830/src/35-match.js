/* ---- THE MATCH (plan §6.3, §4.3): the flow of a game. Phases: 'tipoff' (the jump), 'live' (the clocks run), 'dead' (a made
 * basket or a violation: the clock stops), 'inbound' (the thrower holds the ball and passes after .8 s or on the human's
 * pass), 'break' (after Q1 and Q3 a short card; after Q2 the halftime report; after a tied Q4 an overtime), 'over'.
 * Scoring, possession, the shot clock, quarters, overtime and SUDDEN BLAM are decided here, and only here. ---- */
const INBOUND_WAIT = .8, BREAK_SECS = 6, HALF_SECS = 12, OT_LEN = 60, TIP_SECS = .9, SPONSOR_SECS = 4;
const CENTRE = () => ({ x: OX + MIDX, y: OY + MIDY });

const newMatch = (o = {}) => ({
  phase: 'tipoff', quarter: 1, clock: o.qLen || 120, qLen: o.qLen || 120, shotClock: tune('shotClock'), score: [0, 0],
  poss: null, arrow: 1, tipWinner: HOME, tipT: 0, tipDone: false, dead: false, deadT: 0, deadReason: null,
  pendingSide: null, inboundSpot: null, inboundT: 0, inboundSide: null, shotsInFlight: 0, ot: 0, sudden: false, over: false,
  winner: null, streak: [0, 0], t: 0, mode: o.mode || 'exhibition', quarterScores: [], lastScorer: null, lastBasketT: -9,
  breakT: 0, breakKind: null, goals: [], possessionAt: null
});
/** the clock runs in live play: the ball live, no break, no dead ball */
const clockRuns = m => m.phase === 'live' && !m.dead;

/** possession passes to a side: the shot clock starts again; the same side keeping it (a rebound) doesn't reset it */
const newPossession = side => {
  const m = S.match; if (!m || side === null || side === undefined) return;
  if (m.poss !== side) { m.shotClock = tune('shotClock'); emit('possession', { side }); }
  m.poss = side; m.possessionAt = side;
};
/** the ball is dead: the clock stops; the inbound follows after its wait, from the spot the reason gives */
const deadBall = (reason, side, spot) => {
  const m = S.match; if (!m) return;
  m.dead = true; m.deadT = 0; m.deadReason = reason; m.pendingSide = side; m.inboundSpot = spot || null;
  if (m.phase === 'live') m.phase = 'dead';
  const b = S.ball; if (b.owner) { b.owner.hasBall = false; b.owner = null; }
  b.state = 'dead'; b.vx = b.vy = b.vz = 0;
  emit('deadBall', { reason, side });
};

/** the inbound spot after a basket: behind the baseline under the basket that was scored on (the inbounder defends it) */
const inboundUnder = rim => ({ x: rim === 1 ? OX + CW + 12 : OX - 12, y: RIMW[rim].y });
/** the nearest sideline's spot: a turnover or a violation comes in from the line */
const nearSideline = pt => ({ x: clamp(pt.x, COURT_X0 + 12, COURT_X1 - 12), y: pt.y < CENTRE().y ? COURT_Y0 + 8 : COURT_Y1 - 8 });

/** the thrower: the side's player nearest the spot */
const throwerOf = (side, spot) => S.players.filter(p => p.side === side && p.onCourt)
  .sort((a, b) => Math.hypot(a.body.x - spot.x, a.body.y - spot.y) - Math.hypot(b.body.x - spot.x, b.body.y - spot.y))[0] || null;

/** the inbound: the thrower stands at the spot and holds the ball (state 'inbound'); the pass comes after its wait */
const startInbound = (side, spot) => {
  const m = S.match, sp = spot || inboundUnder(defendRim(side));
  const th = throwerOf(side, sp); if (!th) return;
  placePlayer(th, sp.x, sp.y, side === HOME ? 0 : PI);
  m.phase = 'inbound'; m.inboundT = 0; m.dead = false; m.inboundSide = side;
  const b = S.ball; b.owner = th; th.hasBall = true; b.state = 'inbound'; b.x = th.body.x; b.y = th.body.y; b.z = 20;
  newPossession(side); m.shotClock = tune('shotClock');
  emit('inbound', { side, slot: th.slot });
};

/** the tip-off (§6.3): the two jumpers (the highest SWAT per side) at the centre; the ball tossed; the winner's side */
const tipOff = () => {
  const m = S.match, c = CENTRE();
  const best = side => S.players.filter(p => p.side === side).sort((a, b) => rate(b, 'swat') - rate(a, 'swat'))[0];
  const jA = best(HOME), jB = best(AWAY);
  for (const p of [jA, jB]) placePlayer(p, c.x + (p.side ? 14 : -14), c.y, p.side ? PI : 0);
  const sa = rate(jA, 'swat') + (S.rng() - .5) * 2, sb = rate(jB, 'swat') + (S.rng() - .5) * 2;
  m.tipWinner = sa >= sb ? HOME : AWAY; m.arrow = 1 - m.tipWinner;   // the team that lost the tip gets Q2 and Q3
  m.jumpers = [jA, jB];
  const b = S.ball; ballPlace(b, c.x, c.y, 40); b.vz = 220; b.state = 'pass'; b.to = null; b.shot = null;
  m.phase = 'tipoff'; m.tipT = 0; m.tipDone = false;
  emit('tipoff', { winner: m.tipWinner });
};
/** the tip's winner catches the ball: the highest of its side (the winner's jumper), and the match goes live */
const finishTip = () => {
  const m = S.match, b = S.ball, r = S.players.filter(p => p.side === m.tipWinner).sort((a, c2) => rate(c2, 'swat') - rate(a, 'swat'))[0];
  b.vx = b.vy = b.vz = 0; b.state = 'held';
  m.phase = 'live'; m.dead = false; m.tipDone = true;
  takeBall(r, 'catch');
};

/** a quarter starts: the inbound from the centre by the alternating arrow (Q2 and Q3 the tip's loser, Q4 the winner) */
const startQuarter = q => {
  const m = S.match; m.quarter = q; m.clock = m.qLen; m.shotClock = tune('shotClock');
  const side = q === 2 || q === 3 ? 1 - m.tipWinner : m.tipWinner;
  startInbound(side, CENTRE());
  emit('quarterStart', { quarter: q });
};

/** a basket (§6.3): the points come from the shot record and its bonuses; the streak counts; the other side inbounds */
const onGoal = ev => {
  const m = S.match, b = ev.ball; if (!m || !b.shot || b.shot.resolved || S.netReplay) return;
  const rec = b.shot, shooter = S.players[rec.shooter]; if (!shooter) return;
  const side = shooter.side;
  let pts = rec.points;
  if (rec.jackpot) pts += tune('jackpotBonus');
  if (rec.dunk) pts = Math.max(pts, 2);
  if (rec.goldBall) pts *= 2;
  rec.resolved = true; rec.scoredPts = pts;
  m.shotsInFlight = Math.max(0, m.shotsInFlight - 1);
  m.score[side] += pts; shooter.stats.fgm++; shooter.stats.pts += pts; if (rec.three) shooter.stats.tpm++;
  m.streak[side] += 1; m.streak[1 - side] = 0; m.lastScorer = shooter.slot; m.lastBasketT = m.t;
  m.goals.push({ side, slot: shooter.slot, points: pts, t: Math.round(m.clock) });
  for (const p of S.players) if (p.side !== side && p.nova) endNova(p, 'score');
  if (!shooter.nova && m.streak[side] >= tune('novaBaskets')) igniteNova(shooter);
  if (shooter.nova) shooter.novaBaskets = (shooter.novaBaskets || 0) + 1;
  b.owner = null;
  emit('basket', { side, slot: shooter.slot, shooter: shooter.id, points: pts, three: !!rec.three, dunk: rec.dunk || null, perfect: !!rec.perfect, streak: m.streak[side], x: b.x, y: b.y, z: b.z });
  if (m.sudden) { endGame(side); return; }
  deadBall('basket', 1 - side, inboundUnder(rec.rim));
};

/** the game is over: the winner's side, or null for a tie at time-up (the hub's round) */
const endGame = winner => {
  const m = S.match; if (!m || m.over) return;
  m.over = true; m.phase = 'over'; m.winner = winner; m.dead = true; S.ball.state = 'dead';
  emit('gameEnd', { winner, score: m.score.slice() });
};

/** a quarter's end: the clock is zero and no shot is in flight (a shot released before the buzzer counts) */
const quarterEnd = () => {
  const m = S.match; m.quarterScores.push(m.score.slice());
  emit('quarterEnd', { quarter: m.quarter, score: m.score.slice() });
  const tied = m.score[0] === m.score[1];
  if (m.quarter === 2) { m.breakKind = 'half'; m.breakT = 0; m.phase = 'break'; emit('halftime', { score: m.score.slice() }); return; }
  if (m.quarter === 1 || m.quarter === 3) { m.breakKind = 'quick'; m.breakT = 0; m.phase = 'break'; return; }
  if (tied) { m.ot++; m.breakKind = 'ot'; m.breakT = 0; m.phase = 'break'; emit('overtime', { n: m.ot }); return; }
  endGame(m.score[0] > m.score[1] ? HOME : AWAY);
};

/** the match's own step: clocks, phases, the dead ball's wait, the inbounds and the shot clock */
const matchRules = dt => {
  const m = S.match, b = S.ball;
  m.t += dt;
  if (m.over) return;
  if (m.phase === 'tipoff') { m.tipT += dt; if (m.tipT >= TIP_SECS && !m.tipDone) finishTip(); return; }
  if (m.phase === 'break') {
    if (!m.subsDone) { m.subsDone = true; subsAtBreak(); }
    m.breakT += dt;
    const need = m.breakKind === 'half' ? HALF_SECS : m.breakKind === 'ot' ? 3 : BREAK_SECS;
    if (m.breakT < need) return;
    m.breakT = 0;
    if (m.breakKind === 'ot') {
      m.quarter = 4 + m.ot; m.clock = OT_LEN; m.sudden = m.ot >= 2;   // the third overtime is SUDDEN BLAM
      startInbound(m.tipWinner, CENTRE());
      return;
    }
    m.subsDone = false;
    startQuarter(m.quarter + 1);
    return;
  }
  if (m.phase === 'dead') {
    m.deadT += dt;
    if (m.sponsorPending && m.deadReason === 'basket') { m.sponsorPending = false; m.sponsorOn = true; m.deadReason = 'sponsor'; }
    const wait = m.deadReason === 'sponsor' ? SPONSOR_SECS : INBOUND_WAIT;
    if (m.deadT >= wait) { m.sponsorOn = false; startInbound(m.pendingSide, m.inboundSpot); }
    return;
  }
  if (m.phase === 'inbound') {
    m.inboundT += dt;
    const th = b.owner;
    if (!th) { if (b.state !== 'inbound') m.phase = 'live'; return; }   // a pass already went: the match is live
    if (m.inboundT >= INBOUND_WAIT || (th.human && th.cmd.pass.pressed)) {
      const to = passBall(th, teammateOf(th));
      if (to) m.phase = 'live';
      if (to) { m.dead = false; }
    }
    return;
  }
  if (m.phase !== 'live') return;
  if (clockRuns(m)) { if (!S.cheats.freezeClock) m.clock = Math.max(0, m.clock - dt); if (m.poss !== null && !S.cheats.freezeShot) m.shotClock -= dt; }
  if (m.clock <= 0) m.zeroT = (m.zeroT || 0) + dt; else m.zeroT = 0;
  if (m.clock <= 0 && (m.shotsInFlight === 0 || m.zeroT > 6) && !m.dead) { m.clock = 0; m.shotsInFlight = 0; m.zeroT = 0; quarterEnd(); return; }   // (a shot still open after the buzzer by 6 s is let go)
  if (m.shotClock <= 0 && m.poss !== null && !m.dead) {
    m.shotClock = 0; emit('shotClockViolation', { side: m.poss });
    const spot = nearSideline(b.owner ? b.owner.body : b);
    deadBall('shotclock', 1 - m.poss, spot);
  }
};

/** the shot clock resets when a shot touches the rim (§6.3) */
on('rim', ev => { const m = S.match; if (m && S.ball.state === 'shot' && m.shotClock < tune('shotClock')) m.shotClock = tune('shotClock'); });
on('goal', onGoal);

/* ---- SUBSTITUTIONS (plan §6.14, §11.4): at each break every side's players get back a quarter of their juice. A CPU side
 * subs by itself: its tired player (the lowest juice, below .7) comes off for the bench player. A human side gets the SUB
 * screen on the break card: up and down choose who comes off (the court's two), left and right choose who comes on (the
 * bench), ✕ makes the change, ○ keeps the team as it is. The break's clock runs out and the team stays as it was. The
 * incoming player is fresh and takes the same input or brain as the one it replaces. Hub rounds have no subs. ---- */
const subOptions = side => {
  const ros = rosterOf(S.teams[side].id), on = S.players.filter(p => p.side === side && p.onCourt);
  const onIds = on.map(p => p.id), bench = ros.filter(r => !onIds.includes(r.id));
  return { on, bench };
};
const subCandidate = side => {
  const { on, bench } = subOptions(side);
  const tired = on.slice().sort((a, b) => a.juice - b.juice)[0];
  if (!tired || tired.juice >= .7 || !bench.length) return null;
  return { tired, bench: bench[0] };
};
const doSub = (side, c) => {
  const { tired, bench } = c;
  const np = makePlayer(tired.slot, bench.id, side);
  np.input = tired.input; np.human = tired.human; np.brain = tired.brain; np.device = tired.device;
  np.body.x = tired.body.x; np.body.y = tired.body.y; np.face = tired.face;
  if (tired.hasBall) { S.ball.owner = np; np.hasBall = true; }
  np.stats = tired.stats;
  S.players[tired.slot] = np;
  emit('sub', { slot: np.slot, side, off: tired.id, on: bench.id });
};
const sideHasHuman = side => S.players.some(p => p.side === side && p.human);
const subsAtBreak = () => {
  if (S.match && S.match.mode === 'hub') return;
  S.match.subUI = {};
  for (const side of [HOME, AWAY]) {
    for (const p of S.players.filter(q => q.side === side)) p.juice = Math.min(1, p.juice + .25);
    if (sideHasHuman(side)) { if (subOptions(side).bench.length) S.match.subUI[side] = { offI: 0, benchI: 0 }; }
    else { const c = subCandidate(side); if (c) doSub(side, c); }
  }
};
/** the SUB screen's step: a human of the side moves the choice and makes or skips the change */
const subUIStep = () => {
  const m = S.match; if (!m || !m.subUI || m.phase !== 'break') return;
  for (const side of [HOME, AWAY]) {
    const u = m.subUI[side]; if (!u) continue;
    const I = game.players.find(x => x && S.players.some(p => p.side === side && p.human && p.input === x));
    if (!I) { delete m.subUI[side]; continue; }
    const { on, bench } = subOptions(side);
    if (!on.length || !bench.length) { delete m.subUI[side]; continue; }
    if (I.pressed('up') || I.pressed('down')) u.offI = (u.offI + 1) % on.length;
    if (I.pressed('right') || I.pressed('left')) u.benchI = (u.benchI + 1) % bench.length;
    if (I.pressed('confirm')) { I.consume('confirm'); doSub(side, { tired: on[u.offI % on.length], bench: bench[u.benchI % bench.length] }); delete m.subUI[side]; }
    else if (I.pressed('cancel')) { delete m.subUI[side]; }
  }
};
