/* MATCH: one match's flow (tip-off, quarters, the game and shot clocks, possession, inbounds, breaks, overtime and
 * SUDDEN BLAM), Supernova, shatters and the sponsor break, the power-up spawner, the court twists, juice and subs,
 * stats and style points. startMatch(cfg) builds it; matchStep(dt) runs one fixed step. */
const PHASE_LIVE = new Set(['live', 'clockout']);
/** cfg: { court, teams: [{ id, lineup: [3 ids], starters: [2 ids] } x2], mode, quarter (s), periods (4; hub 2),
 *  humans: [{ input | src, slot }], difficulty, powerups, twists, cheats, seed, tour, segment } */
function startMatch(cfg) {
  if (S.testQuarter && cfg.mode !== 'camp') cfg = Object.assign({}, cfg, { quarter: S.testQuarter });
  const seed = cfg.seed !== undefined ? cfg.seed : (Date.now() & 0xffff) ^ 0x5bb;
  S.rng = E.rng(seed); S.fxRng = E.rng(seed ^ 0x9e37);
  S.court = cfg.court; S.mode = cfg.mode || 'exhibition'; S.cheats = Object.assign({}, cfg.cheats || {});
  S.events.length = 0; Caption.clear();
  if (cfg.quarter) setTune('quarterLength', cfg.quarter);
  for (const f of HOOP_FX) Object.assign(f, { bend: 0, bv: 0, net: 0, nv: 0, shattered: false });
  S.players = [];
  cfg.teams.forEach((t, team) => {
    const starters = t.starters || get('team', t.id).players.slice(0, 2);
    starters.forEach((id, k) => S.players.push(makePlayer(team * 2 + k, id, team)));
  });
  S.bench = cfg.teams.map((t, team) => (t.lineup || get('team', t.id).players).filter(id => !(t.starters || get('team', t.id).players.slice(0, 2)).includes(id)).map(id => ({ id, juice: 1 })));
  for (const p of S.players) { p.src = CpuSource(); p.brain = newBrain(p, cfg.difficulty); if (setting('bigHeads') || cheat('bigheads')) setBigHeads(p.rig, true); }
  for (const h of cfg.humans || []) { const p = S.players[h.slot]; if (!p) continue; p.src = h.src || LocalSource(h.input); p.human = h.input || null; p.seat = h.seat; p.tag = h.tag || (h.input ? h.input.name : 'P'); p.tagColor = h.color || (h.input ? h.input.color : '#ffffff'); }
  S.ball = newBall();
  const periods = cfg.periods || 4;
  S.match = {
    cfg, phase: 'tipoff', phaseT: 0, quarter: 1, periods, clock: tune('quarterLength'), shotClock: tune('shotClock'), score: [0, 0], time: 0, arrow: 1, ot: 0, sudden: false,
    streak: { slot: -1, n: 0 }, gold: null, shatters: 0, style: [0, 0], inb: null, jumpers: [], powerups: [], puTimer: 8, wind: null, jackpot: null, twist: null, overclock: 0,
    overclockDone: false, breakT: 0, freeze: false, plays: [], over: false, winner: -1, powerOn: cfg.powerups !== false && !cheat('tournament'), twistOn: cfg.twists !== false && !cheat('notwists') && !cheat('tournament'),
    beeps: 0, clutch: false, sponsorT: 0, sponsorLine: '', firstReboot: false, novaCount: 0, lastScoreTeam: -1
  };
  if (cheat('powerups')) S.match.powerOn = true;
  setupTwist();
  tipoffSetup();
  emit('matchStart', { court: cfg.court, mode: S.mode });
  return S.match;
}
const baselineX = h => h.dir > 0 ? X0 - 8 : X1 + 8;
const teamOf = t => get('team', S.match.cfg.teams[t].id);
const teamName = t => teamOf(t).short;

/* ---- the tip-off ---- */
function tipoffSetup() {
  const m = S.match; m.phase = 'tipoff'; m.phaseT = 0;
  const jumpers = [0, 1].map(t => S.players.filter(p => p.team === t).sort((a, c) => rate(c, 'swat') - rate(a, 'swat'))[0]);
  m.jumpers = jumpers; m.tip = { tossed: false, done: false };
  for (const p of S.players) {
    const j = jumpers.includes(p), dir = p.team === 0 ? -1 : 1;
    p.x = XM + dir * (j ? 9 : 70); p.y = YM + (j ? 0 : (p.slot % 2 ? 50 : -50)); p.z = 0; p.vx = p.vy = p.vz = 0; p.state = 'run'; p.facing = p.team === 0 ? 0 : Math.PI; p.jump = null; p.dunk = null;
  }
  const b = S.ball; Object.assign(b, { x: XM, y: YM + 14, z: 36, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, shot: null, pass: null });
  Caption.call('tipoff', {}, { force: true });
}
function tipoffStep(dt) {
  const m = S.match, b = S.ball, tip = m.tip;
  if (!tip.tossed && m.phaseT > .8) { tip.tossed = true; b.state = 'dead'; b.x = XM; b.y = YM; b.vz = Math.sqrt(2 * tune('ballGravity') * 84); sfxAt('whistle', XM); sting('tip'); m.tipT = 0; }
  if (!tip.tossed) { b.z = 36; return; }
  m.tipT += dt;
  // the ball: straight up and down; the jumpers' hands meet it near its top
  const g = tune('ballGravity'); b.vz -= g * dt; b.z += b.vz * dt;
  if (!tip.done && b.vz < 0 && b.z < 104) {
    tip.done = true;
    const sc = m.jumpers.map(p => p.jump ? -Math.abs(handsZ(p) - b.z) + S.rng() * 3 : -999);
    const win = sc[0] === sc[1] ? (S.rng() < .5 ? 0 : 1) : sc[0] > sc[1] ? 0 : 1, wp = m.jumpers[win], to = mate(wp);
    b.state = 'loose'; b.lastTeam = win; m.arrow = 1 - win;
    passTo(wp, to, 'chest', { time: .45, tz: 26, tip: true }); S.ball.x = XM + (win === 0 ? -2 : 2); S.ball.z = Math.max(S.ball.z, 90);
    m.phase = 'live'; m.shotClock = tune('shotClock');
    emit('tipoff', { team: win, slot: wp.slot });
  }
  if (b.z < BALL_R) { b.z = BALL_R; b.vz = 0; }
}

/* ---- inbounds: after a basket under the hoop the scoring team attacked; elsewhere after a violation or a break ---- */
function inboundSetup(team, x, y, o = {}) {
  const m = S.match, b = S.ball;
  m.phase = 'inbound'; m.phaseT = 0;
  const near = S.players.filter(p => p.team === team).sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y));
  const who = near[0], to = near[1], dir = attackHoop(team).dir;
  m.inb = { team, who, to, x, y, t: o.wait !== undefined ? o.wait : .8, rx: clamp(x + dir * 70, X0 + 40, X1 - 40), ry: y < YM - 100 ? y + 70 : y > YM + 100 ? y - 70 : YM + (S.rng() - .5) * 80 };
  who.x = x; who.y = y; who.z = 0; who.vx = who.vy = 0; who.state = 'inbound'; who.jump = null; who.dunk = null; who.facing = Math.atan2(m.inb.ry - y, m.inb.rx - x);
  b.owner = who; b.state = 'held'; b.shot = null; b.pass = null; b.lastTeam = team; b.touched = false;
  m.shotClock = tune('shotClock');
  emit('inbound', { team, slot: who.slot });
}
function inboundStep(dt) {
  const m = S.match, I = m.inb, b = S.ball;
  for (const f of S.players) if (f.team !== I.team) { const d = Math.hypot(f.x - I.x, f.y - I.y); if (d < 24) { const a = Math.atan2(f.y - I.y, f.x - I.x); f.x = I.x + Math.cos(a) * 24; f.y = I.y + Math.sin(a) * 24; } }
  if (m.phaseT > .35) I.t -= dt;
  if (I.t <= 0 && b.owner === I.who) {
    I.who.state = 'run'; m.phase = 'live'; b.state = 'held';
    passTo(I.who, I.to, 'chest');
  }
}

/* ---- a step ---- */
function matchStep(dt) {
  const m = S.match; if (!m) return;
  m.phaseT += dt;
  if (m.phase === 'over') { m.overT = (m.overT || 0) + dt; for (const p of S.players) { p.cmd = emptyCmd(); playerStep(p, dt); } ballStep(dt); return; }
  if (m.phase === 'break' || m.phase === 'sponsor') { if (m.phase === 'sponsor') sponsorStep(dt); else breakStep(dt); return; }
  // commands, then players
  for (const p of S.players) { if (m.phase === 'scored' && !p.human) { p.cmd = emptyCmd(); brainStep(p, true); } else p.src.read(p); }
  for (const p of S.players) playerStep(p, dt);
  separate();
  for (const p of S.players) { if (isAir(p)) blockCheck(p); grabCheck(p); }
  if (m.phase === 'tipoff') tipoffStep(dt); else ballStep(dt);
  if (S.ball.shot) S.ball.shot.t += dt;
  if (m.phase === 'inbound') inboundStep(dt);
  if (m.phase === 'scored' && m.phaseT > .9) afterScore();
  // the clocks run only while the ball is live
  if (m.phase === 'live' && !m.sudden) {
    if (!cheat('freezeClock')) m.clock -= dt;
    if (!cheat('freezeShot') && owner()) m.shotClock -= dt;
    const sc = Math.ceil(m.shotClock); if (m.shotClock < 3.05 && sc !== m.beeps && sc >= 0) { m.beeps = sc; sfxAt('shotclock_beep'); }
    if (m.shotClock <= 0 && owner()) shotClockViolation();
    if (m.clock <= 10 && !m.clutchSaid && m.quarter >= m.periods && Math.abs(m.score[0] - m.score[1]) <= 6) { m.clutchSaid = true; Caption.call('clutch'); }
    if (m.clock <= 30 && m.quarter >= m.periods && Math.abs(m.score[0] - m.score[1]) <= 6 && !m.clutch) { m.clutch = true; layer('clutch', 1); try { A.tempo((A.pos.bpm || 120) + 6); } catch (e) { /* no song */ } }
    if (m.clock <= 0) { m.clock = 0; m.phase = 'clockout'; m.phaseT = 0; sfxAt('buzzer'); sting('buzzer'); }
  }
  if (m.phase === 'clockout') {   // a shot in the air when the buzzer sounds still counts
    const b = S.ball, flying = b.state === 'shot' || (b.state === 'loose' && b.shot && !b.touched && b.z > 20) || S.players.some(p => p.state === 'dunk' || (p.state === 'jumpshot' && hasBall(p)));
    if (!flying && m.phaseT > .3) endPeriod();
  }
  if (m.phase === 'live' || m.phase === 'clockout') { m.time += dt; powerupStep(dt); twistStep(dt); novaStep(dt); }
  for (const p of S.players) if (p.powerup) { p.powerup.t -= dt; if (p.powerup.t <= 0) endPowerup(p); }
}

/* ---- baskets ---- */
function onBasket(team, shooter, ev) {
  const m = S.match;
  if (m.phase === 'live') { m.phase = 'scored'; m.phaseT = 0; }
  m.lastScoreTeam = team;
  // Supernova: a player's streak of team baskets; the other team's basket breaks it
  for (const p of S.players) if (p.team !== team && p.nova) novaOff(p);
  if (shooter) {
    if (m.streak.slot === shooter.slot) m.streak.n++; else m.streak = { slot: shooter.slot, n: 1 };
    if (shooter.nova) { shooter.nova.baskets++; if (shooter.nova.baskets > tune('novaMaxBaskets')) novaOff(shooter); }
    else if (m.streak.n >= tune('novaBaskets')) novaOn(shooter);
  } else m.streak = { slot: -1, n: 0 };
  // style points
  const add = (v, what) => { m.style[team] += v; m.plays.push({ v, what, name: shooter ? shooter.name : '', team }); };
  if (ev.dunk) { const dk = get('dunk', ev.dunkId || '') || null; add(200 + (dk ? dk.bonus : 0), 'dunk'); }
  if (ev.three) add(150, 'three'); if (ev.alleyoop) add(250, 'alley-oop'); if (ev.putback) add(150, 'putback'); if (ev.jackpot) add(250, 'jackpot');
  if (ev.buzzer) Caption.call('buzzer', { name: shooter && shooter.name }, { force: true });
  if (m.sudden) { m.phase = 'scored'; m.phaseT = 0; m.endAfterScore = true; }
  Crowd.hype(ev.dunk ? .35 : .15);
}
function afterScore() {
  const m = S.match;
  if (m.endAfterScore) return endGame();
  if (m.clock <= 0 && !m.sudden) return endPeriod();
  if (m.pendingSponsor) { m.pendingSponsor = false; return sponsorStart(); }
  if (S.mode === 'camp') return lessonStep(true);   // Camp: the drill resets with the ball back where the lesson wants it
  const team = 1 - m.lastScoreTeam, h = defendHoop(team);
  inboundSetup(team, baselineX(h), YM + (S.rng() < .5 ? 26 : -26));
}
function shotClockViolation() {
  const m = S.match, o = owner(), team = o ? 1 - o.team : 1 - (S.ball.lastTeam || 0);
  sfxAt('buzzer'); Caption.call('shotClock'); emit('shotClockViolation', { team: 1 - team });
  if (o && o.state === 'jumpshot') o.state = 'air';
  inboundSetup(team, clamp(S.ball.x, X0 + 30, X1 - 30), S.ball.y < YM ? Y0 - 10 : Y1 + 10);
}

/* ---- Supernova ---- */
function novaOn(p) {
  const m = S.match; p.nova = { baskets: 0, t: 0 }; p.stats.NOVA++; m.novaCount++;
  sfxAt('nova_on', p.x); sting('nova'); layer('nova', 1); P.ring(p.x, p.y, 4, 40, '#c080ff', .6); P.fire(p.x, p.y, 20, 20);
  Caption.call('novaOn', { name: p.name }, { force: true }); emit('supernovaOn', { slot: p.slot, name: p.name });
  m.style[p.team] += 300; m.plays.push({ v: 300, what: 'supernova', name: p.name, team: p.team }); Crowd.hype(.4);
}
function novaOff(p) { if (!p.nova) return; p.nova = null; if (!S.players.some(q => q.nova)) layer('nova', 0); Caption.call('novaOff', { name: p.name }); emit('supernovaOff', { slot: p.slot }); }
function novaStep(dt) {
  const m = S.match;
  for (const p of S.players) if (p.nova) { p.nova.t += dt; if (p.nova.t > tune('novaTime') && !(m.overclock > 0 && p.def.team === 'blambots')) novaOff(p); }
  if (m.overclock > 0) { m.overclock -= dt; if (m.overclock <= 0) { for (const p of S.players) if (p.def.team === 'blambots' && p.nova) novaOff(p); layer('overclock', 0); } }
}

/* ---- shatter and the sponsor break ---- */
function shatterBoard(i, p) {
  const m = S.match, h = HOOPS[i]; m.shatters++; HOOP_FX[i].shattered = true; p.stats.SHT++;
  P.bits(h.board, YM, 86, 60, ['#cfe4ff', '#ffffff', '#8ac8ff']); P.glints(h.board, YM, 86, 30, '#ffffff'); P.ring(h.board, YM, 4, 50, '#cfe4ff', .5);
  sfxAt('shatter', h.x); sting('shatter'); game.freeze(.15); game.flash('#e0f0ff', .12, .8); game.shake(6); rumble(1, .4);
  if (!game.settings.motion) { slowMo(.3, .5); }
  Caption.call('shatter', { name: p.name }, { force: true });
  emit('shatter', { slot: p.slot, hoop: i, name: p.name });
  m.style[p.team] += 1000; m.plays.push({ v: 1000, what: 'shatter', name: p.name, team: p.team });
  m.pendingSponsor = true; Crowd.hype(.6);
}
function sponsorStart() { const m = S.match; m.phase = 'sponsor'; m.sponsorT = 0; m.sponsorLine = SPONSOR_BREAKS[(m.shatters - 1) % SPONSOR_BREAKS.length]; sting('sponsor'); emit('sponsorBreak', {}); }
function sponsorStep(dt) {
  const m = S.match; m.sponsorT += dt;
  if (m.sponsorT > 4) { for (const f of HOOP_FX) f.shattered = false; const team = 1 - m.lastScoreTeam, h = defendHoop(team); inboundSetup(team, baselineX(h), YM + 26); }
}

/* ---- the period's end, breaks, overtime, the final ---- */
function endPeriod() {
  const m = S.match;
  if (m.quarter >= m.periods && m.score[0] !== m.score[1]) return endGame();
  if (m.quarter >= m.periods) {   // tied: overtime, twice, then SUDDEN BLAM (the next basket wins)
    if (m.ot >= 2 || S.mode === 'hub') { m.sudden = true; Caption.call('sudden', {}, { force: true }); emit('overtime', { sudden: true }); sfxAt('horn'); m.quarter++; return inboundSetup(m.arrow, XM, Y1 + 10, { wait: 1.2 }); }
    m.ot++; m.quarter++; m.clock = 60; Caption.call('overtime', {}, { force: true }); emit('overtime', { ot: m.ot }); sfxAt('horn');
    tipoffSetup(); return;
  }
  m.phase = 'break'; m.phaseT = 0; m.breakT = S.mode === 'hub' ? 3 : m.quarter === m.periods / 2 ? 12 : 6; m.breakKind = m.quarter === m.periods / 2 ? 'halftime' : 'quarter';
  if (S.mode === 'attract') m.breakT = 2;
  emit(m.breakKind === 'halftime' ? 'halftime' : 'quarterEnd', { quarter: m.quarter });
  Caption.call(m.breakKind === 'halftime' ? 'halftime' : 'quarterEnd', {}, { force: true });
  m.gag = HALFTIME_GAGS[Math.floor(S.fxRng() * HALFTIME_GAGS.length)];
  if (m.breakKind === 'halftime' && S.mode !== 'hub' && S.mode !== 'attract') music('halftime');
  // juice: rest on the bench, a breather on court; CPU teams bench the most tired
  for (const p of S.players) p.juice = Math.min(1, p.juice + .25);
  for (const t of [0, 1]) for (const bn of S.bench[t]) bn.juice = Math.min(1, bn.juice + .5);
  if (S.mode !== 'hub' && S.mode !== 'attract' && S.mode !== 'camp') for (const t of [0, 1]) { const tired = S.players.filter(p => p.team === t && !p.human).sort((a, c) => a.juice - c.juice)[0]; const bn = S.bench[t].sort((a, c) => c.juice - a.juice)[0]; if (tired && bn && bn.juice > tired.juice + .15) substitute(tired, bn.id); }
}
function substitute(p, id) {
  const t = p.team, bi = S.bench[t].findIndex(b => b.id === id); if (bi < 0) return;
  const bn = S.bench[t][bi], np = makePlayer(p.slot, id, t);
  Object.assign(np, { x: p.x, y: p.y, juice: bn.juice, src: p.src, human: p.human, seat: p.seat, tag: p.tag, tagColor: p.tagColor });
  np.brain = newBrain(np, S.match.cfg.difficulty); if (setting('bigHeads') || cheat('bigheads')) setBigHeads(np.rig, true);
  S.bench[t][bi] = { id: p.id, juice: p.juice }; S.players[p.slot] = np;
  emit('sub', { team: t, out: p.id, in: id });
}
function breakStep(dt) {
  const m = S.match; m.breakT -= dt;
  if (m.breakT <= 0 && !m.holdBreak) {
    m.quarter++; m.clock = tune('quarterLength'); m.clutch = false; m.clutchSaid = false;
    if (m.breakKind === 'halftime' && S.mode !== 'hub' && S.mode !== 'attract') music(get('court', S.court).music);
    setupTwistQuarter();
    if (m.cfg.boss && m.quarter === 4 && !m.overclockDone) overclock();
    const team = m.arrow; m.arrow = 1 - m.arrow;
    for (const p of S.players) { p.x = XM + (p.team === team ? -1 : 1) * attackHoop(team).dir * 50 + (p.slot % 2 ? 0 : 0); p.y = YM + (p.slot % 2 ? 60 : -60); p.vx = p.vy = 0; p.z = 0; p.state = 'run'; p.jump = null; }
    inboundSetup(team, XM, Y1 + 10, { wait: 1 });
  }
}
function endGame() {
  const m = S.match; if (m.over) return;
  m.over = true; m.phase = 'over'; m.overT = 0; m.winner = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
  sfxAt('buzzer'); for (const p of S.players) { p.celebrate = p.team === m.winner ? 6 : 0; p.celebKind = p.def.taunt; p.nova = null; }
  if (m.winner >= 0) { m.style[m.winner] += 2000 + 50 * Math.abs(m.score[0] - m.score[1]); Caption.call('final', { team: teamName(m.winner) }, { force: true }); }
  layer('nova', 0); layer('overclock', 0);
  emit('gameEnd', { score: m.score.slice(), winner: m.winner });
}

/* ---- power-ups on the floor ---- */
function powerupStep(dt) {
  const m = S.match; if (!m.powerOn) return;
  m.puTimer -= dt;
  const max = S.mode === 'attract' ? 2 : 1;
  if (m.puTimer <= 0 && m.powerups.length < max) {
    m.puTimer = tune('powerupInterval') + (S.rng() - .5) * 12 * (S.mode === 'attract' ? .2 : 1) * (S.mode === 'attract' ? 0 : 1);
    if (S.mode === 'attract' || cheat('puFast')) m.puTimer = 5;
    spawnPowerup(POWERUPS[Math.floor(S.rng() * POWERUPS.length)]);
  }
  for (const pu of m.powerups) pu.t -= dt;
  m.powerups = m.powerups.filter(pu => {
    if (pu.t <= 0) return false;
    for (const p of S.players) if (!isAir(p) && p.state !== 'knocked' && Math.hypot(p.x - pu.x, p.y - pu.y) < 12) { givePowerup(p, pu.id); Caption.call(pu.id, { name: p.name }); return false; }
    return true;
  });
}
function spawnPowerup(id, x, y) {
  const m = S.match;
  if (x === undefined) { for (let k = 0; k < 10; k++) { x = X0 + 100 + S.rng() * (CW - 200); y = Y0 + 40 + S.rng() * (CH - 80); if (!(m.twist && m.twist.slicks && m.twist.slicks.some(s => Math.hypot(x - s.x, y - s.y) < 40))) break; } }
  m.powerups.push({ id, x, y, t: 10 }); P.ring(x, y, 2, 20, get('powerup', id).color, .5); P.glints(x, y, 6, 8, '#ffffff'); sfxAt('pu_spawn', x);
  emit('powerupSpawn', { id, x: Math.round(x), y: Math.round(y) });
}

/* ---- the court twists ---- */
function setupTwist() {
  const m = S.match, court = get('court', S.court), kind = court.twist;
  m.twist = null; m.jackpot = null; m.wind = null;
  if (m.twistOn && kind !== 'boss') m.twist = { kind, next: 8 * tune('hazardInterval'), bombs: [], slicks: null, gustT: 0, ventT: 0, ventOn: false, w: 0 };
  if (m.cfg.boss) m.twist = { kind: 'boss', bombs: [] };
  if ((kind === 'jackpot' && m.twistOn) || (setting('jackpotAll') && m.twistOn && S.mode === 'exhibition')) moveJackpot();
  setupTwistQuarter();
}
function setupTwistQuarter() {
  const m = S.match, t = m.twist; if (!t || t.kind !== 'oil') return;
  t.slicks = [];
  for (let k = 0; k < 3; k++) {
    let x, y; for (let n = 0; n < 20; n++) { x = X0 + 60 + S.rng() * (CW - 120); y = Y0 + 30 + S.rng() * (CH - 60); if (Math.hypot(x - XM, y - YM) > 70 && !inKey(x, y)) break; }
    t.slicks.push({ x, y, rx: 20 + S.rng() * 16, ry: 12 + S.rng() * 8 });
  }
}
function moveJackpot() {
  const m = S.match, team = S.rng() < .5 ? 0 : 1, h = attackHoop(team), a = (S.rng() - .5) * 2.2 + (h.dir > 0 ? 0 : Math.PI), d = 50 + S.rng() * 70;
  m.jackpot = { x: clamp(h.x + Math.cos(a) * d, X0 + 20, X1 - 20), y: clamp(h.y + Math.sin(a) * d, Y0 + 20, Y1 - 20), t: 20 };
  emit('jackpotMove', {});
}
function twistStep(dt) {
  const m = S.match, t = m.twist;
  if (m.jackpot) { m.jackpot.t -= dt; if (m.jackpot.t <= 0) moveJackpot(); }
  if (!t) return;
  if (t.kind === 'wind') {
    t.next -= dt;
    if (t.next <= 0 && t.gustT <= 0) { t.gustT = 4; t.next = (15 + S.rng() * 10) * tune('hazardInterval'); const a = (S.rng() < .5 ? 0 : Math.PI) + (S.rng() - .5) * .87; t.wa = a; t.wp = .5 + S.rng() * .5; sfxAt('wind_gust'); Caption.call('wind'); emit('twist', { kind: 'gust' }); }
    if (t.gustT > 0) { t.gustT -= dt; const env = Math.sin(clamp(1 - t.gustT / 4, 0, 1) * Math.PI); t.w = env * t.wp; m.wind = { x: Math.cos(t.wa) * t.w * tune('windStrength'), y: Math.sin(t.wa) * t.w * tune('windStrength') }; }
    else { t.w = 0; m.wind = null; }
  }
  if (t.kind === 'eruption') {
    t.next -= dt; t.ventT += dt;
    t.ventOn = (t.ventT % 5) > 3;
    if (t.ventOn && !t.puffed) { t.puffed = true; for (const v of VENTS) P.smoke(v.x, v.y, 0, 6, { size: 1.4, color: '#f0f0f0' }); sfxAt('vent_puff', VENTS[0].x, { vol: .5 }); }
    if (!t.ventOn) t.puffed = false;
    if (t.next <= 0) {
      t.next = (25 + S.rng() * 10) * tune('hazardInterval'); game.shake(1.5); sfxAt('rumble'); Caption.call('eruption'); emit('twist', { kind: 'eruption' });
      const b = S.ball; for (let k = 0; k < 3; k++) { const near = k === 0; t.bombs.push({ x: near ? clamp(b.x + (S.rng() - .5) * 30, X0 + 20, X1 - 20) : X0 + 40 + S.rng() * (CW - 80), y: near ? clamp(b.y + (S.rng() - .5) * 30, Y0 + 20, Y1 - 20) : Y0 + 30 + S.rng() * (CH - 60), t: 1.2 + k, max: 1.2 + k }); }
      sfxAt('bomb_whistle');
    }
    for (const bm of t.bombs) {
      bm.t -= dt;
      if (bm.t <= 0 && !bm.hit) {
        bm.hit = true; P.explosion(bm.x, bm.y, 0, 1.4, { freeze: false, shake: 2 }); P.fire(bm.x, bm.y, 4, 12);
        for (const p of S.players) if (Math.hypot(p.x - bm.x, p.y - bm.y) < 22 && p.z < 20) { const had = hasBall(p); knockDown(p, .8, null); if (had) fumble(p, null); }
      }
    }
    t.bombs = t.bombs.filter(bm => bm.t > -.5);
  }
  if (t.kind === 'boss' && m.cfg.boss && !m.overclockDone && m.quarter === 3) {
    const bots = m.cfg.teams.findIndex(x => x.id === 'blambots');
    if (bots >= 0 && m.score[1 - bots] - m.score[bots] >= 8) overclock();
  }
}
function overclock() {
  const m = S.match; m.overclockDone = true; m.overclock = 30;
  for (const p of S.players) if (p.def.team === 'blambots') { p.nova = { baskets: -99, t: 0 }; P.sparks(p.x, p.y, 30, 12, null, { color: '#ff3a2a' }); }
  layer('overclock', 1); sfxAt('servo'); Caption.call('overclock', {}, { force: true });
  storyCaptions('overclock');
  emit('twist', { kind: 'overclock' });
}
function storyCaptions(key) {
  const lines = IN_PLAY_STORY[key]; if (!lines) return;
  const team = S.mode === 'tour' && S.progress ? get('team', S.progress.tour.team).short : 'HUMANS';
  lines.forEach(([who, text], i) => game.after(i * 3.2, () => Caption.show(who, fill(text, { team }), { big: true })));
}
on('reboot', () => { const m = S.match; Caption.call('reboot', { name: '' }); if (m && !m.firstReboot) { m.firstReboot = true; storyCaptions('reboot'); } });

/* ---- stats and style points from events ---- */
const STYLE = { block: 100, steal: 80, posterized: 200, ankles: 100 };
on('*', ev => {
  const m = S.match; if (!m) return;
  const p = ev.slot !== undefined && ev.slot >= 0 ? S.players[ev.slot] : null;
  if (STYLE[ev.type] && p) { m.style[p.team] += STYLE[ev.type]; m.plays.push({ v: STYLE[ev.type], what: ev.type, name: p.name, team: p.team }); }
});
