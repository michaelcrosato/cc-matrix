/* 35-match: one match (PLAN 6.3). Phases: 'tipoff' (REF ROSCOE tosses, the jumpers tap it), 'live' (both clocks run),
 * 'buzzer' (the clock hit zero with a shot in the air), 'dead' (after a basket: celebrate, jog), 'inbound' (the inbounder
 * passes in; the clock starts on the catch), 'sponsor' (a shattered backboard's fake commercial), 'break' (between
 * quarters: the scene shows the card), 'over'. Baskets, the shot clock, Supernova, style points, stats, power-ups. */
const POWERUPS = { floor: [], t: 0 };
function teamPlayers(team) { return S.players.filter(p => p.team === team); }
/** start a match. o: { court, home, away, lineups: [[ids], [ids]], humans: [[slot, input]], quarterLen, quarters, diff: [h, a],
 *  powerups, twists, mode, comeback, score, quarter, clock, tipoff, seed, jackpotAll } */
function newMatch(o) {
  S.rng = E.rng(o.seed !== undefined ? o.seed : (Math.random() * 1e9) | 0); S.fx = E.rng((o.seed || 7) + 99);
  S.mode = o.mode || 'exhibition'; S.court = o.court; S.events = []; S.lastShot = null;
  const teams = [o.home, o.away];
  S.teams = teams.map((id, k) => { const t = get('team', id), lineup = (o.lineups && o.lineups[k]) || t.players.slice(); return { id, lineup: lineup.slice(), bench: [] }; });
  S.players = [];
  for (const k of [0, 1]) for (let i = 0; i < 2; i++) { const p = new Baller(k * 2 + i, k, get('player', S.teams[k].lineup[i]), teams[k]); setSource(p, cpuSource()); S.players.push(p); }
  for (const k of [0, 1]) S.teams[k].bench = [get('player', S.teams[k].lineup[2])].filter(Boolean).map(d => ({ def: d, juice: 1 }));
  for (const [slot, input] of o.humans || []) { const p = S.players[slot]; if (p) { setSource(p, localSource(input)); p.human = (input.player || 1) - 1; } }
  S.ball = newBall();
  const QL = o.quarterLen || 120;
  S.match = { phase: 'tipoff', phaseT: 0, quarter: o.quarter || 1, quarters: o.quarters || 4, quarterLen: QL, clock: o.clock !== undefined ? o.clock : QL, shot: tune('shotClock'),
    score: (o.score || [0, 0]).slice(), poss: -1, arrow: 1, ot: 0, sudden: false, gameT: 0, shatters: 0, gold: [false, false], style: [0, 0], plays: [], diff: (o.diff || [1, 1]).slice(),
    comeback: o.comeback, tournament: !!o.tournament, powerupsOn: o.powerups !== false, twistsOn: o.twists !== false, starred: false, jumpers: [], tossT: 0, inbounder: null,
    deadSpots: null, inboundSpots: null, hubFast: false, breakKind: null, results: null, clutchOn: false, lastScoreT: 0, jackpotAll: !!o.jackpotAll, halfLen: o.halfLen, noOT: !!o.noOT };
  setTune('quarterLength', QL); TUNING.quarterLength.def = QL;
  POWERUPS.floor = []; POWERUPS.t = tune('powerupInterval') * .6;
  setupArena(o.court);
  setupTwists(o.court, S.match.twistsOn, o.jackpotAll);
  if (o.tipoff === false) { formation(); setupInbound(o.firstPoss || 0, 'half'); }
  else startTipoff();
  emit('matchStart', { court: o.court, home: o.home, away: o.away });
  return S.match;
}
/** everyone to their spots for a restart: HOME on the left half, AWAY on the right */
function formation() {
  for (const p of S.players) {
    const k = p.slot % 2, side = p.team === 0 ? -1 : 1;
    p.x = CMX + side * (k ? 90 : 40); p.y = CMY + (k ? 60 : -40) * (p.team === 0 ? 1 : -1); p.z = 0; p.vx = p.vy = p.vz = 0;
    p.setState('run'); p.jump = null; p.dunk = null; p.facing = p.team === 0 ? 0 : PI; p.tipJumped = false;
  }
}
function startTipoff() {
  const M = S.match; formation(); M.phase = 'tipoff'; M.phaseT = 0; M.tossT = -1;
  const jumper = team => teamPlayers(team).slice().sort((a, b) => b.r.swat - a.r.swat)[0];
  M.jumpers = [jumper(0), jumper(1)];
  M.jumpers[0].x = CMX - 9; M.jumpers[0].y = CMY; M.jumpers[1].x = CMX + 9; M.jumpers[1].y = CMY;
  const b = S.ball; b.state = 'dead'; b.owner = null; b.x = CMX; b.y = CMY + 18; b.z = 30; b.vx = b.vy = b.vz = 0; b.shot = null;
  M.ref = M.ref || { rig: castRig('roscoe'), x: CMX, y: CMY + 22 }; M.ref.x = CMX; M.ref.y = CMY + 22; M.ref.out = false;
  emit('tipoff', {});
}
function resetShotClock() { if (S.match) S.match.shot = tune('shotClock'); }
/** the inbound: team passes in; kind 'baseline' (after a basket: from under the basket it defends), 'sideline' (after a
 *  violation, at the ball's x), 'half' (a quarter's start, at half court) */
function setupInbound(team, kind, atX) {
  const M = S.match, rim = defendRim(team), dir = -rim.side;   // dir: the way the team attacks
  let ix, iy, rx, ry;
  if (kind === 'baseline') { ix = rim.side < 0 ? OX - 14 : OX + CW + 14; iy = CMY + 34; rx = ix + dir * 76; ry = CMY - 26; }
  else if (kind === 'sideline') { ix = clamp(atX === undefined ? CMX : atX, OX + 40, OX + CW - 40); iy = OY + CH + 14; rx = ix + dir * 30; ry = OY + CH - 54; }
  else { ix = CMX; iy = OY + CH + 14; rx = CMX + dir * 46; ry = OY + CH - 60; }
  const mates = teamPlayers(team), inb = mates.slice().sort((a, b) => dist2(a.x, a.y, ix, iy) - dist2(b.x, b.y, ix, iy))[0], rec = mates.find(q => q !== inb);
  if (kind === 'half') formationFor(team);
  inb.x = ix; inb.y = iy; inb.z = 0; inb.vx = inb.vy = 0; inb.setState('inbound'); inb.facing = Math.atan2(ry - iy, rx - ix);
  if (rec && (kind === 'half' || dist2(rec.x, rec.y, rx, ry) > 180)) { rec.x = rx; rec.y = ry; }
  for (const q of S.players) if (q !== inb && q.state !== 'knock') { q.jump = null; q.dunk = null; if (q.state !== 'run' && q.state !== 'cele') q.setState('run'); }
  const b = S.ball; b.state = 'held'; b.owner = inb; b.shot = null; b.pass = null; b.vx = b.vy = b.vz = 0; b.scored = false;
  M.phase = 'inbound'; M.phaseT = 0; M.inbounder = inb; M.poss = team; resetShotClock();
  M.inboundSpots = {}; if (rec) M.inboundSpots[rec.slot] = [rx, ry];
  for (const q of teamPlayers(1 - team)) { const k = q.slot % 2; M.inboundSpots[q.slot] = [rx + dir * (k ? 70 : 24), ry + (k ? 50 : 10)]; }
  emit('inbound', { team, kind, slot: inb.slot });
}
function formationFor(team) {
  for (const p of S.players) { const k = p.slot % 2;
    const own = defendRim(p.team); p.x = lerp(own.x, CMX, p.team === team ? 1.1 : .7) + (k ? 30 : -10) * -own.side; p.y = CMY + (k ? 50 : -40); p.vx = p.vy = 0; p.z = 0; p.setState('run'); p.jump = null; p.dunk = null; }
}
/** a basket through rim i (o.goaltend: awarded) */
function onBasket(i, o = {}) {
  const M = S.match, b = S.ball; if (!M || M.phase === 'dead' || M.phase === 'over' || M.phase === 'break' || M.phase === 'sponsor') return;
  const team = i === 1 ? 0 : 1, sh = b.shot && b.shot.team === team ? b.shot : null;
  const shooter = sh ? sh.shooter : (b.lastTouch && b.lastTouch.team === team ? b.lastTouch : teamPlayers(team)[0]);
  let pts = sh ? sh.points : 2; const base = pts;
  const jackpot = !!(sh && sh.jackpot && !sh.dunk), gold = M.gold[team];
  if (jackpot) pts += tune('jackpotBonus');
  if (gold) { pts *= 2; M.gold[team] = false; for (const p of teamPlayers(team)) if (p.pu && p.pu.id === 'gold') endPowerup(p, true); }
  M.score[team] += pts; shooter.stats.PTS += pts; shooter.stats.FGM++;
  if (sh && sh.points === 3) shooter.stats.TPM++;
  if (sh && sh.dunk) shooter.stats.DNK++;
  if (shooter.lastPassFrom && shooter.lastPassT < 3 && shooter.lastPassFrom.team === team && shooter.lastPassFrom !== shooter && !(sh && sh.oop)) shooter.lastPassFrom.stats.AST++;
  shooter.lastPassFrom = null;
  const buzzer = M.phase === 'buzzer' || (M.clock < 1 && M.phase === 'live');
  // heat and SUPERNOVA
  for (const q of teamPlayers(1 - team)) { q.heat = 0; if (q.nova > 0) novaOff(q); }
  if (shooter.nova > 0) { shooter.novaBaskets--; if (shooter.novaBaskets <= 0) novaOff(shooter); }
  else { shooter.heat++; if (shooter.heat >= tune('novaBaskets')) novaOn(shooter); }
  const kind = sh && sh.dunk ? 'dunk' : sh && sh.points === 3 ? 'three' : sh && sh.layup ? 'layup' : 'jumper';
  emit('basket', { team, pts, base, slot: shooter.slot, name: shooter.name, kind, dunk: sh && sh.dunk, three: !!(sh && sh.points === 3), jackpot, gold, perfect: !!(sh && sh.perfect), buzzer,
    goaltend: !!o.goaltend, oop: !!(sh && sh.oop), putback: !!(sh && sh.putback), dist: sh ? sh.dist : 0, airball: false, score: M.score.slice(), deep: !!(sh && sh.dist > THREE_R + 60) });
  if (jackpot) emit('jackpot', { slot: shooter.slot, name: shooter.name, team });
  M.lastScoreT = M.gameT; M.lastScorer = shooter;
  b.state = 'dead'; b.owner = null; b.shot = null;
  if (M.sudden) { endGame(); return; }
  M.endAfterDead = buzzer && M.clock <= 0;
  M.phase = 'dead'; M.phaseT = 0; M.inboundTeam = 1 - team; M.inboundKind = 'baseline';
  const dir = RIMS[i].side;
  M.deadSpots = {};
  for (const q of S.players) { const k = q.slot % 2; M.deadSpots[q.slot] = q.team === team ? [CMX - dir * (k ? 110 : 50), CMY + (k ? 50 : -40)] : [RIMS[i].x - dir * (k ? 90 : 20), CMY + (k ? -30 : 40)]; }
  if (shooter.source && shooter.source.kind === 'cpu' && shooter.state === 'run') startCele(shooter);
  shooter.celePending = shooter.source && shooter.source.kind === 'cpu';
}
function novaOn(p) { p.nova = tune('novaTime'); p.novaBaskets = tune('novaMaxBaskets'); p.heat = 0; p.stats.NOVA++; emit('supernovaOn', { slot: p.slot, name: p.name, team: p.team }); }
function novaOff(p) { if (p.nova <= 0) return; p.nova = 0; p.novaBaskets = 0; emit('supernovaOff', { slot: p.slot, name: p.name, team: p.team }); }
function shatterGlass(i, by) {
  const M = S.match, H = ARENA.hoops[i]; if (!H || !H.glass) return; H.glass = false; M.shatters++; by.stats.SHT++;
  M.sponsorPending = { rim: i, t: 0, line: SPONSOR_BREAKS[(M.shatters - 1) % SPONSOR_BREAKS.length] };
  emit('shatter', { slot: by.slot, name: by.name, rim: i, x: BOARD_X[i], y: CMY, z: 86 });
}
function endPowerup(p, used) { if (!p.pu) return; const id = p.pu.id; p.pu = null; emit('powerupEnd', { slot: p.slot, id, used: !!used }); }
function grantPowerup(p, id) {
  const def = get('powerup', id); if (!def) return;
  if (def.team) { S.match.gold[p.team] = true; }
  p.pu = { id, t: def.seconds, shots: def.shots || 0, uses: def.uses || 0 };
  emit('powerupPick', { slot: p.slot, name: p.name, id, team: p.team });
}
function spawnPowerup(id, x, y) {
  if (!id) { const ids = PU_ORDER; id = ids[Math.floor(S.rng() * ids.length)]; }
  for (let tries = 0; tries < 20 && (x === undefined || twistHazardAt(x, y)); tries++) { x = OX + 60 + S.rng() * (CW - 120); y = OY + 30 + S.rng() * (CH - 60); }
  const u = { id, x, y, t: 10, born: 0 }; POWERUPS.floor.push(u); emit('powerupSpawn', { id, x, y }); return u;
}
function powerupStep(dt) {
  const M = S.match, max = S.attract ? 2 : 1;
  for (const u of POWERUPS.floor) { u.t -= dt; u.born += dt; for (const p of S.players) if (p.z < 8 && dist2(p.x, p.y, u.x, u.y) < 11 && p.state !== 'knock' && u.t > 0) { grantPowerup(p, u.id); u.t = -1; break; } }
  E.prune(POWERUPS.floor, u => u.t <= 0);
  if (!M.powerupsOn || M.phase !== 'live') return;
  POWERUPS.t -= dt * (S.cheats.fastPowerups ? 4.4 : 1);
  if (POWERUPS.t <= 0) { POWERUPS.t = tune('powerupInterval') + (S.rng() - .5) * 12; if (POWERUPS.floor.length < max) spawnPowerup(); }
}
/** a quarter's end: the next quarter, halftime, overtime, Sudden Blam or the final */
function quarterEnd() {
  const M = S.match; sfx('buzzer'); emit('quarterEnd', { quarter: M.quarter, score: M.score.slice() });
  for (const p of S.players) { p.order = null; if (p.state === 'inbound') p.setState('run'); }
  const tied = M.score[0] === M.score[1], regEnd = M.quarter >= M.quarters;
  if (regEnd && !tied) return endGame();
  if (regEnd && tied && M.noOT) return endGame();
  if (regEnd && tied) {
    if (M.ot >= 2 || M.halfLen) { M.sudden = true; M.ot++; emit('suddenBlam', {}); M.phase = 'break'; M.breakKind = 'ot'; M.phaseT = 0; return; }
    M.ot++; emit('overtime', { ot: M.ot }); M.phase = 'break'; M.breakKind = 'ot'; M.phaseT = 0; return;
  }
  M.phase = 'break'; M.breakKind = M.quarter === Math.floor(M.quarters / 2) ? 'half' : 'quarter'; M.phaseT = 0;
  if (M.breakKind === 'half') emit('halftime', { score: M.score.slice() });
}
/** after the break card: the next period */
function nextPeriod() {
  const M = S.match;
  for (const p of S.players) { p.juice = Math.min(1, p.juice + .25); p.nova = p.nova > 0 ? p.nova : 0; }
  for (const t of S.teams) for (const bp of t.bench) bp.juice = Math.min(1, bp.juice + .5);
  M.quarter++;
  if (M.ot > 0) { M.clock = M.sudden ? 9999 : 60; M.quarterLen = M.clock; startTipoff(); emit('periodStart', { quarter: M.quarter, ot: M.ot, sudden: M.sudden }); return; }
  M.clock = M.quarterLen; const tl = M.tipLoser === undefined ? 1 : M.tipLoser, team = M.quarter === 2 || M.quarter === 3 ? tl : 1 - tl; M.arrow = team;
  if (TWIST.oil) placeSlicks();
  setupInbound(team, 'half');
  emit('periodStart', { quarter: M.quarter });
}
function endGame() {
  const M = S.match; M.phase = 'over'; M.phaseT = 0; S.ball.state = 'dead'; S.ball.owner = null;
  const w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1; M.winner = w;
  if (w >= 0) { M.style[w] += 2000 + 50 * Math.abs(M.score[0] - M.score[1]); for (const p of teamPlayers(w)) if (p.state === 'run') startCele(p); }
  sfx('buzzer'); emit('gameEnd', { winner: w, score: M.score.slice() });
}
/** subs (PLAN 6.14): swap an on-court player with the bench player */
function substitute(slot) {
  const p = S.players[slot], T = S.teams[p.team], bp = T.bench[0]; if (!bp) return null;
  const q = new Baller(slot, p.team, bp.def, p.teamId); q.juice = bp.juice; q.source = p.source; q.human = p.human; q.x = p.x; q.y = p.y; q.facing = p.facing;
  T.bench[0] = { def: p.def, juice: p.juice }; S.players[slot] = q; emit('sub', { slot, out: p.def.id, in: q.def.id }); return q;
}
function cpuSubs() { for (const T of [0, 1]) { const humans = teamPlayers(T).some(q => q.human !== null && q.human !== undefined); if (humans) continue; const tired = teamPlayers(T).slice().sort((a, b) => a.juice - b.juice)[0], bp = S.teams[T].bench[0]; if (tired && bp && bp.juice > tired.juice + .15) substitute(tired.slot); } }

/* ---- the step ---- */
function matchStep(dt) {
  const M = S.match, b = S.ball; if (!M) return;
  M.phaseT += dt; M.gameT += dt;
  if (M.phase === 'break' || M.phase === 'over' && M.phaseT > 6) { animAll(dt); updateArena(dt, TWIST.windOn ? TWIST.windX : 0); return; }
  // commands
  for (const p of S.players) {
    const c = p.source ? p.source.read(p, dt) : blankCmd();
    if (M.phase === 'tipoff' && !M.jumpers.includes(p)) { c.mx = c.my = 0; }
    if (M.phase === 'tipoff') { c.mx = c.my = 0; c.passP = c.shoveP = c.oopP = false; }
    if (M.phase === 'inbound' && p === M.inbounder && p.has) { if ((c.passP && M.phaseT > .25) || (p.source && p.source.kind !== 'cpu' && M.phaseT > 2.5)) inboundPass(p); }
    if (M.phase === 'sponsor' || M.phase === 'over') { c.shootP = c.passP = c.shoveP = c.oopP = false; if (M.phase === 'sponsor') c.mx = c.my = 0; }
    if (p.state === 'frozen') { c.mx = c.my = 0; }
    p.cmd = c;
  }
  for (const p of S.players) playerStep(p, dt);
  separate(dt);
  if (M.phase === 'inbound') { const inb = M.inbounder; for (const q of teamPlayers(1 - inb.team)) { const d = dist2(q.x, q.y, inb.x, inb.y); if (d < 24 && d > .1) { q.x = inb.x + (q.x - inb.x) / d * 24; q.y = inb.y + (q.y - inb.y) / d * 24; } } }
  animAll(dt);
  // the ball
  if (b.state === 'held' || b.state === 'dunk') ballHeldStep(dt); else if (b.state === 'pass') passStep(dt); else ballPhysics(dt);
  if (M.phase !== 'tipoff') catchStep(dt); else tipStep(dt);
  // the clocks
  if (M.phase === 'live') {
    if (!S.dev.freezeClock && !M.sudden && !M.practice) M.clock -= dt;
    if (!S.dev.freezeShot && !M.practice && b.state === 'held') M.shot -= dt;
    for (const p of S.players) if (p.nova > 0) { p.nova -= dt; if (p.nova <= 0) { p.nova = 1e-9; novaOff(p); } }
    if (M.shot <= 0 && b.state === 'held') { sfx('buzzer'); const tm = b.owner.team, x = b.owner.x; emit('shotClockViolation', { team: tm }); b.state = 'dead'; setupInbound(1 - tm, 'sideline', x); }
    else if (M.clock <= 0) { M.clock = 0; if (b.state === 'shot' || (b.state === 'loose' && b.shot && !b.shot.rimmed && !b.shot.blocked)) { M.phase = 'buzzer'; M.phaseT = 0; sfx('buzzer'); } else quarterEnd(); }
    if (!M.clutchOn && M.quarter >= M.quarters && M.clock < 30 && Math.abs(M.score[0] - M.score[1]) <= 6) { M.clutchOn = true; emit('clutch', {}); }
  } else if (M.phase === 'buzzer') {
    if (b.state !== 'shot' && (!b.shot || b.shot.rimmed || b.shot.blocked || b.z <= BALL_R + 1) || M.phaseT > 3) { if (M.phase === 'buzzer') quarterEnd(); }
  } else if (M.phase === 'dead') {
    for (const p of S.players) if (p.celePending && p.state === 'run' && p.z === 0) { p.celePending = false; startCele(p); }
    if (M.phaseT > 1.1 && M.endAfterDead && !M.sponsorPending) { M.endAfterDead = false; quarterEnd(); }
    else if (M.phaseT > 1.1 && !M.sponsorPending) setupInbound(M.inboundTeam, M.inboundKind);
    if (M.sponsorPending && M.phaseT > .9) { M.phase = 'sponsor'; M.phaseT = 0; emit('sponsorBreak', { line: M.sponsorPending.line, rim: M.sponsorPending.rim }); }
  } else if (M.phase === 'sponsor') {
    if (M.phaseT > 4.2) { ARENA.hoops[M.sponsorPending.rim].glass = true; M.sponsorPending = null; if (M.endAfterDead) { M.endAfterDead = false; quarterEnd(); } else setupInbound(M.inboundTeam, M.inboundKind); }
  } else if (M.phase === 'inbound') {
    if (b.state === 'held' && b.owner !== M.inbounder) { M.phase = 'live'; M.phaseT = 0; M.inbounder.setState('run'); M.inbounder = null; }
    else if (b.state === 'loose') { M.phase = 'live'; if (M.inbounder) M.inbounder.setState('run'); M.inbounder = null; }
  } else if (M.phase === 'over') {
    for (const p of S.players) if (p.state === 'run' && M.winner === p.team && p.st > 1.5) startCele(p);
  }
  if (M.phase === 'live' && b.state === 'shot' && b.shot && !b.shot.made && b.z < 30 && b.shot.rimmed) b.state = 'loose';
  if (M.phase !== 'over') { twistStep(dt); powerupStep(dt); }
  updateArena(dt, TWIST.windOn ? TWIST.windX : 0);
}
function animAll(dt) { for (const p of S.players) animStep(p, dt); if (S.match && S.match.ref) refStep(dt); }
function inboundPass(p) {
  const rec = p.mate; if (!rec || !p.has) return;
  passBall(p, rec, 'inbound'); const ps = S.ball.pass; ps.arc = 14;
  ps.laneOk = true; p.setState('run'); p.x += Math.cos(p.facing) * 4;
}
/** the tip-off: the toss, the jumpers' taps */
function tipStep(dt) {
  const M = S.match, b = S.ball;
  if (M.tossT < 0 && M.phaseT > .7) { M.tossT = 0; b.x = CMX; b.y = CMY; b.z = 34; b.vz = Math.sqrt(2 * tune('ballGravity') * (120 - 34)); b.vx = b.vy = 0; b.state = 'dead'; sfx('whistle'); }
  if (M.tossT >= 0) M.tossT += dt;
  for (const j of M.jumpers) {
    if (j.state !== 'air' || M.tossT < 0) continue;
    const h = [j.x, j.y, j.z + j.reach()];
    if (Math.hypot(h[0] - b.x, h[1] - b.y, h[2] - b.z) < 13) {
      const mate = j.mate, to = mate || j, v = E.arc({ x: b.x, y: b.y, z: b.z }, { x: to.x, y: to.y, z: 30 }, tune('ballGravity'), { apex: 12 });
      b.state = 'loose'; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.lastTouch = j; b.noCatch = .3; b.noCatchBy = j;
      M.phase = 'live'; M.phaseT = 0; M.tipLoser = 1 - j.team; M.arrow = 1 - j.team; sfx('steal', { vol: .4 });
      emit('tipWin', { slot: j.slot, name: j.name, team: j.team }); return;
    }
  }
  if (M.tossT > 1.2 && b.z < 50 && b.vz < 0) { b.state = 'loose'; M.phase = 'live'; M.tipLoser = 1; M.arrow = 1; emit('tipWin', { slot: -1, team: -1 }); }
}
function refStep(dt) {
  const M = S.match, R = M.ref; if (!R) return;
  if (M.phase !== 'tipoff') { R.out = true; R.y = approach(R.y, OY + CH + 70, 90 * dt); }
  const tossing = M.phase === 'tipoff' && M.phaseT > .45 && M.phaseT < .9;
  R.rig.bb.pose = tossing ? { R: [3, 2, 44], L: [3, -2, 40] } : M.phase === 'tipoff' ? { R: [6, 2, 24], L: [6, -2, 24] } : null; R.rig.bb.w = approach(R.rig.bb.w, R.rig.bb.pose ? 1 : 0, dt * 10);
  R.rig.update(dt, { x: R.x, y: R.y, z: 0, vx: R.out ? 0 : 0, vy: R.out && R.y < OY + CH + 68 ? 90 : 0, facing: R.out ? PI / 2 : -PI / 2 });
  if (M.phase === 'tipoff' && S.ball.state === 'dead' && M.tossT < 0) { const w = R.rig.worldOffset(V3.lerp(R.rig.J.handR || [0, 0, 30], R.rig.J.handL || [0, 0, 30], .5)); S.ball.x = R.x + w[0]; S.ball.y = R.y + w[1]; S.ball.z = w[2] + 3; }
}
