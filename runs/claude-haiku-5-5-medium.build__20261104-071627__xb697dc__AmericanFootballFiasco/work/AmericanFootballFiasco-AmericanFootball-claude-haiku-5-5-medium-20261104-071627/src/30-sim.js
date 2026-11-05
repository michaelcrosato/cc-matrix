/* AMERICAN FOOTBALL FIASCO: the match. The downs and the clock, the formations and the play calls, the QB and the throws, the
 * catches and the picks, the runners, the tackles and the Big Hits, fumbles, the score, the phases. Seven a side on the field.
 * Phases: call (the card is picked: the human, or the CPU after a beat) > snap > live > dead (the whistle) > call again;
 * score (a touchdown or a field goal, then the kickoff to the other side), half, final. Everything reads FF.tune, so the Dev
 * sliders change the match as it plays. The rng is seeded, so a test that plays a match gets the same match each time. */
(() => {
'use strict';
const FF = window.FF, E = FF.E, D = FF.data, T = () => FF.tune, A = FF.A, { clamp, lerp, approach } = FF;
const YD = D.YD, G = 260, PI = Math.PI;
const S = FF.sim = {
  cfg: null, all: [], ball: null, phase: 'idle', t: 0, poss: 0, half1: true, los: 880, down: 1, togo: 20, score: [0, 0],
  qtr: 1, clock: 120, play: null, cursor: 0, throwT: 0, target: null, passer: null, msg: '', msgT: 0, over: false,
  streak: [0, 0], blazeT: [0, 0], stats: null, hd: null, hdLock: 0, time: 0, lastCall: null, cpuPick: 0, carryT: 0, goalKick: null,
  fumbled: false, kickCD: 0, rng: Math.random, log: [], tdSide: -1, play0: null
};
const R = () => S.rng();
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0');
S.mmss = mmss;

/* ---- the sides, the directions, the goals ---- */
const atkDir = s => ((s === 0) === S.half1 ? 1 : -1);          // side 0 attacks right in the first half, and side 1 does
const goalX = s => atkDir(s) > 0 ? D.FX1 : D.FX0;
const yardsToGoal = () => Math.abs(goalX(S.poss) - S.los) / YD;
const ownGoalX = s => atkDir(s) > 0 ? D.FX0 : D.FX1;
const own25 = s => ownGoalX(s) + atkDir(s) * 25 * YD;
// a side's controller: the input that plays its human (the local keyboard or pad, a couch player, or a hub player's inputs). CPU sides have none.
const ctrlOf = s => (S.ctrl && S.ctrl[s]) || null;
const isHuman = s => !!ctrlOf(s);
S.atkDir = atkDir; S.goalX = goalX; S.yardsToGoal = yardsToGoal; S.isHuman = isHuman; S.ctrlOf = ctrlOf;

/* ---- the players: seven a side. slot i is OFFENSE[i] on offense and DEFENSE[i] on defense ---- */
function makePlayers(cfg) {
  S.all = [];
  for (let s = 0; s < 2; s++) {
    const tm = s === 0 ? D.TEAMS[0] : D.opponent(cfg.chapter || { opp: 1 });
    for (let i = 0; i < 7; i++) {
      const p = { side: s, slot: i, name: '', x: 0, y: 0, vx: 0, vy: 0, f: 0, stun: 0, down: 0, blockT: 0, tackleCD: 0, cool: 0, route: null, ri: 0, role: '', human: false, team: tm, rig: null, carrierRun: false, runAt: 0 };
      p.rig = new E.Humanoid({ weapon: null, build: i % 3 === 0 ? 'heroic' : 'bulky', size: 1.12, hair: i % 2 ? 'spiky' : 'short', hat: { style: 'helmet', color: tm.helmet }, outfit: 'tunic', sleeves: 'long', colors: { cloth: tm.cloth, pants: tm.pants, hair: ['#3a2418', '#e8c070', '#1e1c1a', '#6a3a22', '#c8402a', '#f0f0f0', '#5a4a2a'][(i + s * 3) % 7], skin: tm.skin, belt: tm.trim, trim: tm.trim, boot: '#1e1c22' } });
      S.all.push(p);
    }
  }
}
// who is on the field for the offense in a formation: the names by slot, from the rosters
const nameFor = (p, onOffense) => {
  const r = p.side === 0 ? (onOffense ? D.ROSTER.FISCOS : D.ROSTER.DEF) : (onOffense ? D.ROSTER.OPP : D.ROSTER.OPPDEF);
  return r[p.slot][0];
};
const roleFor = (p, onOffense) => (onOffense ? D.OFFENSE[p.slot][0] : D.DEFENSE[p.slot][0]);

/* ---- setting up a play: the formation on the line, the ball's place, who is human ---- */
function formation() {
  const a = atkDir(S.poss);
  for (const p of S.all) {
    const off = p.side === S.poss, row = off ? D.OFFENSE[p.slot] : D.DEFENSE[p.slot];
    p.x = S.los + a * row[1] * YD; p.y = D.FYM + row[2] * YD; p.vx = p.vy = 0; p.f = a > 0 ? (off ? 0 : PI) : (off ? PI : 0);
    p.stun = 0; p.down = 0; p.blockT = 0; p.route = null; p.ri = 0; p.role = roleFor(p, off); p.name = nameFor(p, off); p.human = false; p.carrierRun = false; p.tackleCD = 0; p.cool = 0;
  }
  // the human: the offense's QB, or a defender (the nearest to the ball, or the one they switched to)
  S.ball = { x: S.los, y: D.FYM, z: 0, vx: 0, vy: 0, vz: 0, holder: null, mode: 'dead', spin: 0 };
  const qb = S.all.find(p => p.side === S.poss && p.role === 'QB');
  if (qb) { S.ball.holder = qb; }
  if (isHuman(S.poss)) { if (qb) qb.human = true; }
  if (isHuman(1 - S.poss)) pickHumanDefender(true, 1 - S.poss);
}
// the human's defender: the defender nearest the ball (re-chosen when the play starts, then with Switch)
function pickHumanDefender(force, h) {
  if (!isHuman(h) || h === S.poss) return;
  if (!force && S.hdLock > 0) return;
  const defs = S.all.filter(p => p.side === h);
  const b = S.ball;
  const cand = defs.filter(p => !p.down).sort((a, c) => dist(a, b) - dist(c, b));
  if (!cand.length) return;
  const pick = force ? cand[0] : (S.hd && !S.hd.down ? S.hd : cand[0]);
  for (const p of defs) p.human = false;
  pick.human = true; S.hd = pick;
}
// a player joins a side (a couch player, or a hub's): the side's controller, and its man on the field right away
S.joinSide = (s, input) => { S.ctrl = S.ctrl || {}; S.ctrl[s] = input; if (S.ball) { if (s === S.poss) { const qb = S.all.find(p => p.side === S.poss && p.role === 'QB'); if (qb) qb.human = true; } else pickHumanDefender(true, s); } };
S.switchDefender = h => {
  if (!isHuman(h) || h === S.poss) return;
  const defs = S.all.filter(p => p.side === h && !p.down), i = defs.indexOf(S.hd);
  const nxt = defs[(i + 1) % defs.length];
  if (nxt) { for (const p of S.all) if (p.side === h) p.human = false; nxt.human = true; S.hd = nxt; S.hdLock = 3; }
};

/* ---- the calls: the human picks a card; the CPU picks one (weighted, and it punts or kicks on fourth down) ---- */
S.cpuCall = () => {
  if (S.down === 4) {
    const yg = yardsToGoal();
    if (yg <= 38 && (yg < S.togo || R() < .6)) return 'FIELD_GOAL';
    if (yg > 38 || R() < .3) return 'PUNT';
    return 'GO';
  }
  let tot = D.CPU_CALLS.reduce((s, c) => s + c[1], 0), x = R() * tot;
  for (const [k, w] of D.CPU_CALLS) { x -= w; if (x <= 0) return k; }
  return 'RUN_IN';
};
S.pickCall = (key) => {
  if (!key) return;
  if (S.down !== 4 && D.PLAYS[key].kind === 'kick') return;   // (a kick is a fourth-down call)
  S.play = key; S.lastCall = key; S.cursor = D.CARDS.indexOf(key);
  S.phase = 'snap'; S.t = 0; say(D.PLAYS[key].name + '!', 1.0);
  S.play0 = { key, los: S.los };
};

/* ---- the snap, and the live play ---- */
function snap() {
  const p = D.PLAYS[S.play];
  if (S.extras) S.extras.drillSnap();
  S.throwT = 0; S.passer = null; S.target = null; S.qbPressure = 0;
  if (p.kind === 'pass') {
    const qb = S.all.find(q => q.side === S.poss && q.role === 'QB'); S.ball.holder = qb; S.ball.mode = 'held'; qb.f = atkDir(S.poss) > 0 ? 0 : PI; S.passer = qb;
    for (const q of S.all) if (q.side === S.poss && p.routes[q.role]) { q.route = p.routes[q.role].map(([dx, dy]) => [dx, dy]); q.ri = 0; q.origin = [q.x, q.y]; }
    // (the route's waypoints are in yards from the spot the receiver lines up)
  } else if (p.kind === 'run') {
    const rb = S.all.find(q => q.side === S.poss && q.role === p.carrier);
    S.ball.holder = rb; S.ball.mode = 'held'; rb.carrierRun = true; rb.path = p.path.map(([dx, dy]) => [dx, dy]); rb.pi = 0; rb.origin = [rb.x, rb.y];
    rb.f = atkDir(S.poss) > 0 ? 0 : PI;
    const qb = S.all.find(q => q.side === S.poss && q.role === 'QB'); if (qb) { qb.human = false; }
    if (isHuman(S.poss)) { rb.human = true; }
    S.carrier = rb;
  } else {   // a kick: the ball goes up now and lands later (kickStep); the kicking side's players stand still
    const a = atkDir(S.poss), b = S.ball, isFG = S.play === 'FIELD_GOAL';
    S.kickFrom = S.los; S.ball.holder = null; S.ball.mode = 'air';
    const flight = isFG ? 2.0 : 2.2, landX = isFG ? goalX(S.poss) : S.los + a * 40 * YD;
    b.x = S.los; b.y = D.FYM; b.z = 4; b.vx = (landX - S.los) / flight; b.vy = 0; b.vz = .45 * G * flight;
    S.phase = 'kick'; S.t = 0; return;
  }
  S.phase = 'live'; S.t = 0;
  S.msg = '';
}

S.update = dt => {
  S.time += dt; S.t += dt; S.msgT = Math.max(0, S.msgT - dt);
  if (S.extras) S.extras.update(dt); S.hdLock = Math.max(0, S.hdLock - dt); S.kickCD = Math.max(0, S.kickCD - dt);
  for (let s = 0; s < 2; s++) S.blazeT[s] = Math.max(0, S.blazeT[s] - dt);
  if (S.cfg && S.cfg.attract && S.phase === 'idle') return;
  switch (S.phase) {
    case 'call': return callStep(dt);
    case 'snap': if (S.t >= .6) snap(); return;
    case 'live': return liveStep(dt);
    case 'kick': return kickStep(dt);
    case 'dead': if (S.t >= 2.1) return afterPlay(); return;
    case 'score': if (S.t >= 3) { kickoff(1 - S.tdSide); } return;
    case 'half': if (S.t >= 3.5) { S.half1 = false; S.qtr = 3; S.clock = T().quarterSecs; kickoff(1); } return;
    case 'final': S.over = true; return;
  }
};

function callStep(dt) {
  if (S.drill && S.t >= .6) { S.pickCall(S.drill.play); return; }
  if (S.cfg.attract || !isHuman(S.poss)) {
    // the CPU calls it, after a beat (the human, on defense, sees the call on the banner)
    if (S.t >= .9) { S.pickCall(S.cpuCall()); }
    return;
  }
  // the human calls it: the cards. (The input is read in the view; see FF.view)
}
// a kick (punt or field goal) on the ball: it flies, then the other side has it, or it is good
function kickStep(dt) {
  const b = S.ball, p = S.play;
  b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= G * .9 * dt; b.z += b.vz * dt;
  if (b.z <= 0) {
    b.z = 0;
    if (p === 'FIELD_GOAL') {
      const d = Math.abs(goalX(S.poss) - S.kickFrom) / YD + 7, pct = clamp(.94 - Math.max(0, d - 28) * .021, .18, .94);
      if (R() < pct) { S.score[S.poss] += 3; S.stats.fg[S.poss]++; say(D.LINES.fieldGoal[0], 2.4); S.msg = 'FIELD GOAL!'; S.msgT = 2.4; S.phase = 'score'; S.t = 0; S.tdSide = S.poss; FF.cheer(S.poss); }
      else { say(D.LINES.missFG[0], 2.2); S.msg = 'NO GOOD'; S.msgT = 2.2; turnover(S.kickFrom, true); }
    } else {
      const spot = clamp(b.x, D.FX0 + 4, D.FX1 - 4);
      say(D.LINES.punt[0], 2.0); S.msg = 'PUNT'; S.msgT = 1.6; turnover(spot, true);
    }
  }
}
S.kickStep = kickStep;

// after the whistle: the next call, the end of a quarter, the half, or the final whistle
function afterPlay() {
  if (S.clock <= 0 && S.qtr === 2) { S.phase = 'half'; S.t = 0; say(D.LINES.halftime[0], 3); S.msg = 'HALFTIME'; S.msgT = 3.5; return; }
  if (S.clock <= 0 && S.qtr >= 4) { S.phase = 'final'; S.t = 0; say(D.LINES.final[0], 4); return; }
  if (S.clock <= 0) { S.qtr++; S.clock = T().quarterSecs; say(D.LINES.quarter[0], 2.4); S.msg = 'QUARTER ' + S.qtr; S.msgT = 2; }
  S.phase = 'call'; S.t = 0; formation(); if (S.cfg && S.cfg.practice) S.clock = Math.max(S.clock, 60);
}

// the game's hit points: the pitch's stripes and the field beyond
// the whistle: the play is over (the result says why), the field is the new spot
function endPlay(kind, msg, spot) {
  if (S.phase !== 'live') return;
  const a = atkDir(S.poss), gain = (spot - S.los) * a / YD;
  if (S.extras) { S.extras.onEnd(kind, spot); S.extras.logPlay(gain, kind); }
  S.phase = 'dead'; S.t = 0; S.ball.holder = null; S.ball.mode = 'dead'; S.passer = null;
  if (msg) { S.msg = msg; S.msgT = 2; }
  if (kind === 'td') return touchdown(spot);
  if (kind === 'turnover') return turnover(spot, false);
  if (kind === 'out' || kind === 'tackle' || kind === 'run' || kind === 'catch') {
    if (gain >= 15) streak(S.poss, 1);
    S.stats.yards[S.poss] += Math.max(0, Math.round(gain));
  }
  S.los = clamp(spot, D.FX0 + 1, D.FX1 - 1);
  const yg = yardsToGoal();
  if (gain >= S.togo) { S.down = 1; S.togo = Math.min(20, yg); streak(S.poss, 1); say(D.LINES.firstDown[0], 1.8); if (!S.msg) { S.msg = 'FIRST DOWN'; S.msgT = 1.6; } }
  else { S.down++; S.togo -= gain; if (S.down > 4) { turnover(S.los, true); S.msg = 'TURNOVER ON DOWNS'; S.msgT = 2.4; return; } }
  S.clock -= 4;
  if (S.clock <= 0 && S.qtr === 4 && !S.cfg.practice) S.clock = 0;
  if (kind === 'sack') say(D.LINES.sack[0], 1.8);
  if (kind === 'incomplete') say(D.LINES.incomplete[0], 1.6);
}
// a change of possession at a spot: a pick, a fumble recovered, a missed kick, a punt, a turnover on downs
function turnover(spot, kick) {
  if (S.extras) S.extras.onTurnover(S.poss, kick);
  S.phase = 'dead'; S.t = 0; S.ball.holder = null; S.ball.mode = 'dead';
  S.poss = 1 - S.poss; S.los = clamp(spot, D.FX0 + 1, D.FX1 - 1); S.down = 1; S.togo = Math.min(20, yardsToGoal());
  if (!kick) S.stats.turnovers++;
  if (!S.msg) S.msg = 'TURNOVER';
  S.msgT = 2;
  S.hd = null;
}
function touchdown(spot) {
  const s = S.poss; S.score[s] += 6; S.stats.td[s]++; S.tdSide = s;
  if (S.extras) { S.extras.logPlay(0, 'td'); S.extras.onTouchdown(s); }
  S.phase = 'score'; S.t = 0; S.msg = 'TOUCHDOWN!'; S.msgT = 3;
  say(D.LINES.touchdown[0], 3.2); FF.cheer(s, true);
  // the point after: automatic one point, kicked
  if (R() < .92) S.score[s] += 1; S.stats.pat[s]++;
  streak(s, 2);
}
function kickoff(s) {
  S.poss = s; S.los = own25(s); S.down = 1; S.togo = 20; S.phase = 'call'; S.t = 0; formation();
  say(D.LINES.kickoff[0], 1.8);
  if (S.cfg.practice) S.clock = Math.max(S.clock, 60);
}
// the hot streak: the team's momentum. Three in a row (first downs, long gains, touchdowns) sets it blazing for a while
function streak(s, n) {
  if (!S.cfg || S.cfg.attract) return;
  S.streak[s] += n;
  if (S.streak[s] >= 3) { S.streak[s] = 0; S.blazeT[s] = T().hotTime; say(D.LINES.blazing[0], 2.8); FF.P.sparks(S.ball.x, S.ball.y, 10, 12, null, { color: '#ffb347' }); }
}
S.streak = [0, 0];
S.blazing = s => S.blazeT[s] > 0 || (T().infiniteTurbo && isHuman(s)) || !!(S.cfg && S.cfg.attract);
const say = (text, auto) => FF.radio && FF.radio(text, auto);

/* ---- the live play: the moves of seven a side, the ball, the catches, the tackles, the sideline ---- */
function liveStep(dt) {
  const ball = S.ball, p = D.PLAYS[S.play];
  // the clock runs in live play
  S.clock = Math.max(0, S.clock - dt);
  if (p.kind === 'pass' && S.ball.mode === 'held' && ball.holder === S.passer) { S.throwT += dt; }
  // the passer: the human throws (pass), the CPU throws when it is time or the rush is near
  if (p.kind === 'pass' && S.passer && !S.target) passerStep(dt, p);
  // the ball: held (the holder moves it), in the air, or loose
  if (ball.mode === 'air') airStep(dt);
  if (ball.mode === 'loose') looseStep(dt);
  // the players
  for (const q of S.all) moveStep(q, dt, p);
  separate();
  if (ball.mode === 'held' && ball.holder) { const h = ball.holder; ball.x = h.x + Math.cos(h.f) * 5; ball.y = h.y + Math.sin(h.f) * 5; ball.z = 14 + Math.abs(Math.sin(S.time * 14)) * 2; ball.vx = h.vx; ball.vy = h.vy; }
  // the carrier: sidelines, the goal lines, the tackles
  if (ball.mode === 'held' && ball.holder) carrierChecks(dt);
  // a play for the defense on the ball: the human switches, the hit
  if (isHuman(1 - S.poss)) pickHumanDefender(false, 1 - S.poss);
  if (S.phase === 'live' && S.t > 14 && !ball.holder) endPlay('incomplete', 'NOTHING ON IT', S.los);   // (a play that goes nowhere ends)
}
// the passer: the throw is a human's on the button, else at a time, or when a rusher is in the QB's face (throw it away)
function passerStep(dt, p) {
  const qb = S.passer;
  if (!qb || qb.down) return;
  if (qb.human) {
    const I = ctrlOf(qb.side);
    if (I && I.pressed('pass')) {
      I.consume('pass');
      // with the mouse, the click throws to the receiver nearest the point clicked on the field; else the stick or the open man
      const at = I.lastDevice === 'mouse' && FF.game.mouseGround ? FF.game.mouseGround() : null;
      if (at) { const rec = S.all.filter(q => q.side === S.poss && p.targets.includes(q.role)).sort((a, b) => Math.hypot(a.x - at[0], a.y - at[1]) - Math.hypot(b.x - at[0], b.y - at[1]))[0]; if (rec) { throwTo(rec, p); return; } }
      throwTo(chooseReceiver(qb, p), p); return;
    }
    if (S.throwT > T().playClock) { throwTo(bestOpen(qb, p), p); return; }
    return;
  }
  if (S.throwT > .9 + R() * 1.1) { throwTo(bestOpen(qb, p), p); return; }
  const pressure = S.all.some(q => q.side !== S.poss && !q.down && dist(q, qb) < 12);
  if (pressure) { S.pressureT = (S.pressureT || 0) + dt; if (S.pressureT > .2) { throwTo(bestOpen(qb, p), p); S.pressureT = 0; } }
}
// the receiver the stick points at, or the open one (the human's throw)
function chooseReceiver(qb, p) {
  const mv = ctrlOf(S.poss).move(), rec = S.all.filter(q => q.side === S.poss && p.targets.includes(q.role));
  let best = null, bs = -1e9;
  for (const r of rec) {
    const dd = Math.max(0, Math.min(...S.all.filter(d => d.side !== S.poss && !d.down).map(d => dist(d, r))));
    const v = [r.x - qb.x, r.y - qb.y], m = Math.hypot(v[0], v[1]) || 1;
    const align = Math.hypot(mv[0], mv[1]) > .2 ? (v[0] * mv[0] + v[1] * mv[1]) / (m * Math.hypot(mv[0], mv[1])) : 0;
    const s = dd / 40 + align * .8;
    if (s > bs) { bs = s; best = r; }
  }
  return best || rec[0];
}
// the CPU's: the most open of its targets, and the throw away when none is open (a ball thrown into the turf)
function bestOpen(qb, p) {
  const rec = S.all.filter(q => q.side === S.poss && p.targets.includes(q.role));
  let best = null, bs = -1;
  for (const r of rec) {
    const dd = Math.min(...S.all.filter(d => d.side !== S.poss && !d.down).map(d => dist(d, r)));
    if (dd > bs) { bs = dd; best = r; }
  }
  return bs < 7 ? null : best;
}
// a throw: the ball's arc to where the receiver will be, a fair lead; null target = thrown away
function throwTo(rec, p) {
  const qb = S.passer, b = S.ball;
  b.holder = null; S.passer = null;
  if (!rec) { S.target = null; b.mode = 'loose'; b.x = qb.x + Math.cos(qb.f) * 12; b.y = qb.y; b.z = 10; b.vx = Math.cos(qb.f) * 80; b.vy = 0; b.vz = 40; b.thrownAway = true; S.msg = 'THROWN AWAY'; S.msgT = 1; return endPlay('incomplete', 'INCOMPLETE', S.los); }
  const d = dist(qb, rec), tf = clamp(d / 330, .5, 1.5) * (S.extras ? S.extras.throwFactor() : 1), lx = rec.x + (rec.vx || 0) * tf * .7, ly = rec.y + (rec.vy || 0) * tf * .7;
  b.x = qb.x; b.y = qb.y; b.z = 14; b.vx = (lx - qb.x) / tf; b.vy = (ly - qb.y) / tf; b.vz = .5 * G * tf;
  b.mode = 'air'; b.tf = tf; b.t = 0; b.lx = lx; b.ly = ly; b.passer = qb; b.side = S.poss; b.target = rec; S.target = rec; S.stats.pass++;
  qb.f = Math.atan2(ly - qb.y, lx - qb.x);
  rec.human = rec.human || false;
  // the human, once it is thrown, plays the receiver to help the catch (if the human is on the offense)
  if (isHuman(S.poss)) { for (const q of S.all) if (q.side === S.poss) q.human = false; rec.human = true; }
}
// the ball in the air: the catches, the picks, the landing
function airStep(dt) {
  const b = S.ball; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= G * dt; b.z += b.vz * dt;
  if (b.z > 3 && b.vz < 0) {
    // (the ball can be caught from above, when it has dropped into reach)
  }
  if (b.z < 22) {
    for (const q of S.all) {
      if (q.down || q.cool > 0) continue;
      if (Math.hypot(q.x - b.x, q.y - b.y) > 14) continue;
      if (q.side === b.side) {
        const covered = S.all.some(d => d.side !== b.side && !d.down && dist(d, q) < 9);
        if (q !== b.target && Math.hypot(q.x - b.x, q.y - b.y) > 8) continue;
        if (R() < (S.extras ? S.extras.catchChance(covered, covered ? T().catchCovered : T().catchBase) : .9)) return catchBy(q);
        if (covered && R() < .35) return intercepted(q);
      } else if (Math.hypot(q.x - b.x, q.y - b.y) < 9 && R() < T().intercept) return intercepted(q);
    }
  }
  if (b.z <= 0) {
    b.z = 0; b.mode = 'loose'; b.vx *= .4; b.vy *= .4; b.vz = 0;
    if (!S.msg || S.msgT <= 0) { S.msg = 'INCOMPLETE'; S.msgT = 1.6; }
    endPlay('incomplete', 'INCOMPLETE', S.los);
  }
}
function catchBy(q) {
  const b = S.ball; b.mode = 'held'; b.holder = q; b.z = 14; S.target = q; q.cool = .2;
  if (q.side === S.poss) { const gain = (q.x - S.los) * atkDir(S.poss) / YD; if (gain > 15) S.stats.bigGain++; FF.P.sparks(q.x, q.y, 8, 10, null, { color: '#fff4c0' }); }
  q.carrierRun = true; S.carrier = q; S.msg = 'CAUGHT!'; S.msgT = 1;
  if (q.side !== S.poss) return intercepted(q);
  S.carrier = q; if (isHuman(q.side)) { q.human = true; }
  // the rest is a run: the carrier goes on, and it counts as a catch if the play ends with it
  S.catchSpot = q.x;
}
function intercepted(q) {
  const b = S.ball; if (b.mode === 'dead') return; b.mode = 'held'; b.holder = q; S.target = null;
  S.stats.ints++; say(D.LINES.intercept[0], 2.4); S.msg = 'INTERCEPTED!'; S.msgT = 2.4; FF.game.shake(3);
  endPlay('turnover', 'INTERCEPTED!', q.x);
}
// the ball loose on the ground: the nearest who reaches it has it (a pile-up in the grass)
function looseStep(dt) {
  const b = S.ball; b.t = (b.t || 0) + dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.exp(-dt * 2.5); b.vy *= Math.exp(-dt * 2.5);
  b.vz -= G * dt; b.z += b.vz * dt; if (b.z < 0) { b.z = 0; b.vz = -b.vz * .35; if (b.vz < 20) b.vz = 0; }
  if (b.x < D.FX0 - 30 || b.x > D.FX1 + 30 || b.y < D.FY0 || b.y > D.FY1) { return endPlay('out', 'OUT OF BOUNDS', clamp(b.x, D.FX0 + 2, D.FX1 - 2)); }
  let best = null, bd = 1e9;
  for (const q of S.all) { if (q.down || q.cool > 0 || q.stun > 0) continue; const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < 9 && d < bd) { bd = d; best = q; } }
  if (best) {
    b.mode = 'held'; b.holder = best; S.carrier = best; best.carrierRun = true; best.cool = .3;
    if (best.side !== S.poss) { S.msg = 'RECOVERED!'; S.msgT = 1.6; S.stats.recover++; if (S.phase === 'live') { S.phase = 'live'; } return turnover(clamp(b.x, D.FX0 + 1, D.FX1 - 1), true); }
    S.msg = 'RECOVERED'; S.msgT = 1.2;
  }
}
// the carrier: the goal line (a touchdown), the sideline, and the tackle from the defenders in reach
function carrierChecks(dt) {
  const h = S.ball.holder, a = atkDir(S.poss), lineX = goalX(S.poss);
  if (h.side === S.poss && (a > 0 ? h.x >= lineX : h.x <= lineX)) return touchdown(lineX);
  if (h.y < D.FY0 + 2 || h.y > D.FY1 - 2) return endPlay('out', 'OUT OF BOUNDS', clamp(h.x, D.FX0 + 2, D.FX1 - 2));
  for (const d of S.all) {
    if (d.side === S.poss || d.down || d.stun > 0 || d.tackleCD > 0) continue;
    if (dist(d, h) > 10) continue;
    d.tackleCD = .3;
    // a big hit: the human's hit, or a CPU's tackle that lands hard. The carrier's turbo, the luck, and the tune decide it
    const dI = ctrlOf(d.side), hard = d.human && dI && dI.pressed('hit');
    if (hard) { dI.consume('hit'); return bigHit(d, h, 'mega'); }
    const hI = ctrlOf(h.side), breaks = h.human && hI && hI.down('turbo');
    if (R() < T().tackleChance * (breaks ? 1 - T().breakTackle : 1)) {
      if (R() < T().bigHit) return bigHit(d, h, 'tackle');
      return endPlay('tackle', 'TACKLED', h.x);
    }
  }
}
// the Big Hit: the victim flies and is DINGED, the helmet comes off, the crowd roars. A mega hit at speed may cost the ball.
function bigHit(hitter, victim, kind) {
  const spd = Math.hypot(victim.vx, victim.vy), mega = kind === 'mega' && (hitter.human || S.blazing(hitter.side)) || spd > T().megaSpeed;
  const fum = R() < T().fumbleChance * (mega ? 2 : 1), a = Math.atan2(victim.y - hitter.y, victim.x - hitter.x);
  victim.down = mega ? 2.2 : 1.6; victim.vx = Math.cos(a) * 46; victim.vy = Math.sin(a) * 46;
  S.stats.bigHits++; if (mega) S.stats.megaHits++;
  if (S.extras) S.extras.onBigHit(victim, mega, a);
  FF.hitFx(victim.x, victim.y, mega ? 'MEGA HIT!' : 'BIG HIT!', mega ? 'mega' : 'big');
  say((mega ? D.LINES.megaHit : D.LINES.bigHit)[(R() * 3) | 0], 2.4);
  if (fum && S.ball.holder === victim) {
    S.ball.mode = 'loose'; S.ball.holder = null; S.ball.x = victim.x; S.ball.y = victim.y; S.ball.z = 12;
    S.ball.vx = Math.cos(a) * 60; S.ball.vy = Math.sin(a) * 60; S.ball.vz = 110; S.stats.fumbles++;
    say(D.LINES.fumble[0], 2.2); S.msg = 'FUMBLE!'; S.msgT = 2;
    return;
  }
  if (S.ball.holder === victim) return endPlay('tackle', mega ? 'MEGA HIT!' : 'BIG HIT!', victim.x);
  return;
}
// how one player moves in the live play: a human's stick and buttons, or the CPU's brain for its role
function moveStep(q, dt, p) {
  q.cool = Math.max(0, q.cool - dt); q.stun = Math.max(0, q.stun - dt); q.blockT = Math.max(0, q.blockT - dt); q.tackleCD = Math.max(0, q.tackleCD - dt);
  if (q.down > 0) { q.down -= dt; q.vx = approach(q.vx, 0, 500 * dt); q.vy = approach(q.vy, 0, 500 * dt); }
  else {
    let mx = 0, my = 0, sp = 0;
    const off = q.side === S.poss, s = q.side, cpu = s === 0 ? T().cpuSpeed : T().cpuSpeed * (S.cfg.chapter ? S.cfg.chapter.difficulty : 1);
    const h = S.ball.holder === q;
    const I = q.human ? ctrlOf(s) : null;
    if (I) {
      let mv = I.move();
      // the mouse steers: the player runs toward the point the pointer is on the field, when it is clear of the player
      if (I.lastDevice === 'mouse' && FF.game.mouseGround) { const at = FF.game.mouseGround(); const m = at ? Math.hypot(at[0] - q.x, at[1] - q.y) : 0; if (m > 10) mv = [(at[0] - q.x) / m, (at[1] - q.y) / m]; }
      mx = mv[0]; my = mv[1];
      sp = T().runSpeed * (S.blazing(s) ? 1.12 : 1);
      if (h || (!off && h)) { if (I.down('turbo') && (S.blazing(s) || (S.extras && S.extras.turboFree(s)) || S.turbo > 0 || T().infiniteTurbo)) { sp = T().turboSpeed * (S.blazing(s) ? 1.1 : 1); if (!T().infiniteTurbo && !S.blazing(s)) S.turbo = Math.max(0, S.turbo - T().turboDrain * dt); } else S.turbo = Math.min(T().turboMax, (S.turbo || 0) + T().turboRegen * dt); }
      // the juke: a quick sidestep (or a dive, when defending) that buys a moment; a defender it passes is stunned
      if (I.pressed('juke')) { I.consume('juke'); if (!off) { q.vx = (mx || Math.cos(q.f)) * 170; q.vy = (my || Math.sin(q.f)) * 170; q.lunge = .35; } else if (h || q.carrierRun) { q.vx = (mx || Math.cos(q.f)) * 150; q.vy = (my || 0) * 150; q.dodge = .25; q.stunAll = .5; S.stats.juke = (S.stats.juke || 0) + 1; for (const d of S.all) if (d.side !== s && dist(d, q) < 16) d.stun = .5; } }
      // the hit: a human carrier hits the nearest defender in reach (a mega hit at full turbo); a defender's hit is in carrierChecks
      if (I.pressed('hit') && off && h) {
        I.consume('hit'); let near = null, nd = 14;
        for (const d of S.all) if (d.side !== s && !d.down) { const dd = dist(d, q); if (dd < nd) { nd = dd; near = d; } }
        if (near) bigHit(q, near, I.down('turbo') ? 'mega' : 'big');
      }
      if (I.pressed('switch')) { I.consume('switch'); S.switchDefender(s); }
      if (I.pressed('pass') && off && h && S.passer !== h && I.lastDevice !== 'mouse') { I.consume('pass'); S.lateral(h); }
    } else if (!off) {
      // a defender with no human: pursue the carrier, cover, or rush the passer
      const tgt = defenderTarget(q), dx = tgt[0] - q.x, dy = tgt[1] - q.y, m = Math.hypot(dx, dy);
      if (m > 2) { mx = dx / m; my = dy / m; sp = cpu * (q.stun > 0 ? .3 : 1) * (q.blockT > 0 ? .5 : 1) * (S.blazing(s) ? 1.04 : 1); }
    } else {
      const tgt = offenseTarget(q, p), dx = tgt[0] - q.x, dy = tgt[1] - q.y, m = Math.hypot(dx, dy);
      if (m > 2) { mx = dx / m; my = dy / m; sp = cpu * (q.blockT > 0 ? .5 : 1) * (S.blazing(s) ? 1.04 : 1); }
      // (a carrier from the CPU runs at turbo when a defender is close)
      if (h && !q.human) { sp = T().turboSpeed * .95; if (S.all.some(d => d.side !== s && !d.down && dist(d, q) < 24)) sp = T().turboSpeed; }
    }
    if (q.lunge > 0) { q.lunge -= dt; } else if (q.dodge > 0) { q.dodge -= dt; }
    if (q.stun > 0) sp *= .35;
    if (q.blockT > 0) sp *= .6;
    const ax = mx * sp, ay = my * sp;
    if (q.lunge > 0 || q.dodge > 0) { /* keep the lunge or dodge's velocity */ }
    else { q.vx = approach(q.vx, ax, 900 * dt); q.vy = approach(q.vy, ay, 900 * dt); }
    if (Math.hypot(mx, my) > .15 && !(q.lunge > 0 || q.dodge > 0)) q.f = E.approachAng(q.f, Math.atan2(my, mx), dt * 12);
    else if (q.lunge > 0 || q.dodge > 0) q.f = Math.atan2(q.vy, q.vx);
    q.x += q.vx * dt; q.y += q.vy * dt;
  }
  q.x = clamp(q.x, D.FX0 - 160 + 6, D.FX1 + 160 - 6); q.y = clamp(q.y, D.FY0 - 10, D.FY1 + 10);
  rigStep(q, dt);
}
// a player's rig: the pose from the play (a down player lies, a scorer cheers, a carrier runs)
function rigStep(q, dt) {
  const sp = Math.hypot(q.vx, q.vy), cheer = S.phase === 'score' && q.side === S.tdSide;
  // the dance: the scorers alternate the cheer and the hips pose on the beat
  const beat = Math.floor(S.time * 2.2 + q.slot) % 2 ? 'hips' : 'cheer';
  // the dive (a tackle's lunge) crouches and leans into it; the juke leans into the sidestep
  const diving = (q.lunge || 0) > 0, juking = (q.dodge || 0) > 0;
  q.rig.lean = diving ? .45 : juking ? .25 : 0;
  q.rig.update(dt, { x: q.x, y: q.y, z: 0, vx: q.vx, vy: q.vy, facing: q.f, run: clamp(sp / 110, 0, 1), down: q.down > 0 ? 1 : 0, pose: diving && q.down <= 0 ? 'crouch' : cheer && q.down <= 0 ? beat : null, expr: q.down > 0 ? 'wince' : cheer ? 'shout' : null });
}
S.rigStep = rigStep;
// the CPU defense: pursue the carrier (leading it), else rush the passer, cover a receiver, or take the ball
function defenderTarget(q) {
  const h = S.ball.holder;
  if (h) { const lead = .3, tx = h.x + (h.vx || 0) * lead, ty = h.y + (h.vy || 0) * lead; return [tx, ty]; }
  if (S.ball.mode === 'air') return [S.ball.lx || S.ball.x, S.ball.ly || S.ball.y];
  if (S.ball.mode === 'loose') return [S.ball.x, S.ball.y];
  const qb = S.passer || S.all.find(p => p.side === S.poss && p.role === 'QB');
  if (q.role === 'DL1' || q.role === 'DL2' || q.role === 'LB1' || q.role === 'LB2') {
    return qb ? [qb.x, qb.y] : [q.x, q.y];
  }
  if (q.role === 'CB1' || q.role === 'CB2' || q.role === 'S') {
    const rec = S.all.filter(p => p.side === S.poss && p.role.startsWith('WR')).sort((a, b) => dist(a, q) - dist(b, q))[0];
    if (rec) return [rec.x + 4 * atkDir(S.poss) * -1, rec.y];
  }
  return [q.x, q.y];
}
// the CPU offense: the carrier runs its path and then downfield (away from the closest defenders); the receivers run their
// routes; the QB drops back; the blockers block the nearest defender. One rule for everyone that is not the carrier.
function offenseTarget(q, p) {
  const a = atkDir(S.poss);
  if (q.carrierRun && S.ball.holder === q) {
    // the run's path first (the hole, the sweep, the reverse), then downfield, steering away from the defenders close by
    if (q.path && q.pi < q.path.length) {
      const [dx, dy] = q.path[q.pi], tx = q.origin[0] + a * dx * YD, ty = q.origin[1] + dy * YD;
      if (Math.hypot(tx - q.x, ty - q.y) < 6) q.pi++;
      return [tx, ty];
    }
    let gx = a * 4, gy = 0;
    for (const d of S.all) if (d.side !== S.poss && !d.down) { const dd = dist(d, q); if (dd < 36) { gx -= (d.x - q.x) / (dd + 4) * 3; gy -= (d.y - q.y) / (dd + 4) * 3; } }
    const m = Math.hypot(gx, gy) || 1;
    return [q.x + gx / m * 60, q.y + gy / m * 60];
  }
  if (q.role === 'QB') {
    const back = S.passer === q ? 0 : 1;
    const pressured = S.all.some(d => d.side !== S.poss && !d.down && dist(d, q) < 12);
    if (pressured && S.passer === q) return [q.x - a * 40, q.y + (q.y > D.FYM ? -30 : 30)];
    return [S.los - a * 3 * YD * back, D.FYM];
  }
  if (q.route && q.ri < q.route.length) {
    const [dx, dy] = q.route[q.ri], tx = q.origin[0] + a * dx * YD, ty = q.origin[1] + dy * YD;
    if (Math.hypot(tx - q.x, ty - q.y) < 6) q.ri++;
    return [tx, ty];
  }
  if (q.route && q.origin && S.ball.holder !== q) {   // route done: the receiver keeps going downfield
    return [q.x + a * 40, q.y];
  }
  if (q.carrierRun && q.path && q.pi < q.path.length) {   // the run's path, for the RB or the reverse's receiver
    const [dx, dy] = q.path[q.pi], tx = q.origin[0] + a * dx * YD, ty = q.origin[1] + dy * YD;
    if (Math.hypot(tx - q.x, ty - q.y) < 6) q.pi++;
    return [tx, ty];
  }
  // the blockers: the nearest defender in front of them (the line holds it), else the line
  let near = null, nd = 1e9;
  for (const d of S.all) if (d.side !== S.poss && !d.down) { const dd = dist(d, q); if (dd < nd) { nd = dd; near = d; } }
  if (near && nd < 60 && (q.role === 'C' || q.role === 'TE' || q.role === 'RB' || q.role.startsWith('WR'))) {
    near.blockT = .4; return [near.x, near.y];
  }
  return [q.x, q.y];
}
// a human's and a CPU's: no two players stand on each other
function separate() {
  for (let i = 0; i < S.all.length; i++) for (let j = i + 1; j < S.all.length; j++) {
    const a = S.all[i], b = S.all[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 8) { const k = (8 - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
  }
}
// a lateral (any time, as the plan says): the carrier pitches it to the nearest teammate within reach
S.lateral = h => {
  let best = null, bd = 1e9;
  for (const q of S.all) {
    if (q.side !== S.poss || q === h || q.down) continue;
    const d = dist(q, h); if (d < bd && d < 130) { bd = d; best = q; }
  }
  if (!best) return;
  S.passer = h; S.msg = 'LATERAL!'; S.msgT = 1; A.sfx('pass');
  throwTo(best, D.PLAYS[S.play]);
};
/* ---- the match from a start: the cfg says who is human, the chapter, the quarter's length ---- */
S.start = cfg => {
  S.cfg = Object.assign({ human: [0], chapter: D.CHAPTERS[0] }, cfg);
  // who plays which side: a controller per human side (the local input, a couch player, or a hub player); none for the CPU
  S.ctrl = cfg.ctrl || Object.fromEntries((S.cfg.human || []).map(s => [s, FF.game.input]));
  S.rng = E.rng(cfg.seed || 7);
  S.over = false; S.score = [0, 0]; S.qtr = 1; S.clock = S.cfg.chapter.quarter || T().quarterSecs; S.half1 = true;
  if (!S.cfg.chapter.quarter) S.clock = T().quarterSecs;
  S.stats = { yards: [0, 0], td: [0, 0], pat: [0, 0], fg: [0, 0], pass: 0, ints: 0, fumbles: 0, bigHits: 0, megaHits: 0, turnovers: 0, bigGain: 0, recover: 0, juke: 0 };
  S.streak = [0, 0]; S.blazeT = [0, 0]; S.turbo = T().turboMax; if (S.extras) { S.extras.clips = []; S.extras.label = ''; } S.msg = ''; S.msgT = 0; S.hd = null; S.hdLock = 0;
  S.poss = 0; S.los = own25(0); S.down = 1; S.togo = 20;
  makePlayers(S.cfg); S.phase = 'call'; S.t = 0; S.play = null;
  formation();
  if (S.cfg.practice) S.clock = 9999;
  if (S.cfg.drill && S.extras) S.extras.setupDrill(S.cfg.drill);
  say(D.LINES.kickoff[0], 2);
};
// the scripted proof hook: which field the match is on, for tests (read-only)
S.state = () => ({ phase: S.phase, poss: S.poss, los: Math.round(S.los), down: S.down, togo: S.togo, score: S.score.slice(), qtr: S.qtr, clock: Math.round(S.clock), play: S.play, qb: S.all.find(p => p.side === S.poss && p.role === 'QB') ? 1 : 0, half1: S.half1, over: S.over, stats: S.stats });
})();
