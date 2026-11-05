/* THE MATCH SIMULATION: the state machine, rules, clock, possession and spotting; athletes, movement, turbo, collisions
 * and blocking; the actions (throw, catch, tackle, dive, spin, stiff arm, hurdle, strip, lateral, handoff, kick, late
 * hit) and the ball. World units: 16 = 1 yard, z up. It never reads a rig, a camera or the DOM: the presentation reads
 * its state and its events (FF.bus). Every athlete is moved by an intent (from a human, the AI, the network or a bot). */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, T = FF.T, { clamp } = E, Y = 16;
const END_L = 64, GOAL_L = 224, GOAL_R = 1824, END_R = 1984, SIDE_T = 192, SIDE_B = 1040, MID_Y = 616;

const BIT = { b1: 1, b2: 2, b3: 4, b4: 8, lb: 16, rb: 32 };
FF.BIT = BIT;
const hyp = Math.hypot, r = () => FF.r();
const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
const emit = (n, d) => FF.bus.emit(n, d);
const OFF_SLOTS = ['QB', 'C', 'LG', 'RG', 'RB', 'WR1', 'WR2'], DEF_SLOTS = ['DE1', 'NT', 'DE2', 'LB1', 'LB2', 'CB', 'S'];

const S = FF.sim = {
  FIELD: FF.FIELD, phase: 'IDLE', phaseT: 0, time: 0, athletes: [], all: [], teams: [null, null], score: [0, 0], quarter: 1, clock: 120, qLen: 120,
  poss: 0, dir: [1, -1], los: 0, spotY: MID_Y, down: 1, toGo: 20, ball: null, play: null, calls: [null, null], stats: null, events: [], cheats: {},
  megaNext: -1, mascotOn: -1, superFoot: -1, lights: false, ot: false, over: false, winner: -1, playNo: 0, hub: false, scenario: null, kickoffBy: 0,
  fast: false, step: 0, ended: false
};
FF.sim.dirOf = t => S.dir[t];
/** yards from team t's own goal line to x (its own 20 is 20) */
S.yardline = (x, t) => S.dir[t] > 0 ? (x - GOAL_L) / Y : (GOAL_R - x) / Y;
S.xAt = (yd, t) => S.dir[t] > 0 ? GOAL_L + yd * Y : GOAL_R - yd * Y;
S.goalX = t => S.dir[t] > 0 ? GOAL_R : GOAL_L;      // the goal line team t attacks
S.ownGoalX = t => S.dir[t] > 0 ? GOAL_L : GOAL_R;
S.inEndzone = (x, t) => S.dir[t] > 0 ? x > GOAL_R : x < GOAL_L;   // in the end zone team t attacks
S.inOwnEndzone = (x, t) => S.dir[t] > 0 ? x < GOAL_L : x > GOAL_R;
S.diff = () => FF.DIFF[S.difficulty] || FF.DIFF.pro;

/* ---------------- ATHLETES ---------------- */
let NEXT_ID = 0;
function makeAthlete(team, p) {
  const big = p.pos === 'OL' || p.pos === 'NT' || p.pos === 'DE', rr = p.boss ? 8.5 : big ? 7.5 : 6;
  const a = { id: NEXT_ID++, team, p, r: p.r, name: p.name, num: p.num, slot: p.slot, pos: p.pos, on: false,
    b: new E.Body({ x: MID_Y, y: MID_Y, r: rr, gravity: 700 }), facing: 0, turbo: 1, act: null, pose: 'IDLE', poseU: 0, down: 0, stun: 0,
    ctl: -1, intent: { mx: 0, my: 0, turbo: false, press: 0, held: 0, recv: -1 }, brain: { beh: 'idle' }, mass: 1 + p.r.STR * .15 + (big ? .6 : 0) + (p.boss ? 1.2 : 0),
    hot: 0, heat: 0, dinged: 0, helmetOff: false, eng: null, tryT: 0, slowT: 0, lastHit: 0, cool: 0, burst: 0, specialUsed: {}, stats: null, cpuTag: false };
  a.stats = { rush: 0, rec: 0, pass: 0, tkl: 0, sack: 0, td: 0, int: 0, fum: 0, comp: 0, att: 0, carries: 0, catches: 0, bigHits: 0, lateHits: 0 };
  return a;
}
S.athlete = id => S.all.find(a => a.id === id);
S.onField = t => S.athletes.filter(a => a.team === t);
S.bySlot = (t, slot) => S.athletes.find(a => a.team === t && a.slot === slot);
S.carrier = () => S.ball && S.ball.state === 'held' ? S.ball.holder : null;
S.topSpeed = a => {
  let v = T.speedBase + a.r.SPD * T.speedPerSpd;
  if (S.carrier() === a) v *= T.carrySpeedMult;
  if (a.hot > 0) v *= 1.12;
  if (a.dinged > 0) v *= .9;
  v = FF.bus.mod('speed', v, Object.assign(a, { carrier: S.carrier() === a }));
  return v;
};

/** put team t's unit of `kind` on the field: 'off', 'def', 'punt', 'fg', 'kick' (kickoff team), 'ret' */
function unit(t, kind, kSlot) {
  const team = S.teams[t], roster = S.rosters[t];
  const slots = kind === 'def' || kind === 'kick' ? DEF_SLOTS : OFF_SLOTS;
  const out = [];
  for (const s of slots) {
    let slot = s;
    if (kind === 'kick' && s === 'NT') slot = 'K';
    if ((kind === 'punt' || kind === 'fg') && s === kSlot) slot = 'K';
    const a = roster.find(x => x.p.slot === slot);
    a.slot = slot === 'K' ? 'K' : s; a.role = s; out.push(a);
  }
  void team;
  return out;
}
function setUnits(offKind, defKind, kSlot) {
  for (const a of S.all) { a.on = false; a.eng = null; }
  const o = unit(S.poss, offKind, kSlot), d = unit(1 - S.poss, defKind);
  S.athletes = o.concat(d);
  if (S.unitFilter) { S.athletes = S.athletes.filter(a => !S.unitFilter[a.team] || S.unitFilter[a.team].includes(a.role) || S.unitFilter[a.team].includes(a.slot)); for (const a of S.all) a.on = S.athletes.includes(a); }
  for (const a of S.athletes) { a.on = true; a.act = null; a.down = 0; a.stun = 0; a.eng = null; a.pose = 'IDLE'; a.b.z = 0; a.b.vz = 0; a.brain = { beh: 'formation' }; a.burst = 0; a.slowT = 0; a.tryT = 0; a.cool = 0; }
  benchSpots();
}
// the players off the field stand on their own sideline (near side, home left half, away right half)
function benchSpots() {
  for (const t of [0, 1]) {
    const off = S.rosters[t].filter(a => !a.on);
    off.forEach((a, i) => { a.b.x = (t === 0 ? 560 : 1180) + i * 26; a.b.y = SIDE_B + 70 + (i % 2) * 10; a.b.vx = a.b.vy = 0; a.facing = -Math.PI / 2; a.pose = 'IDLE'; a.act = null; a.down = 0; });
  }
}
/** play coordinates (yards from the spot, x downfield for the offense, y to its right) to the world */
S.toWorld = (x, y, flip = 1, t = S.poss) => [S.los + x * Y * S.dir[t], S.spotY + y * Y * S.dir[t] * flip];
S.fromWorld = (wx, wy, flip = 1, t = S.poss) => [(wx - S.los) / Y * S.dir[t], (wy - S.spotY) / Y * S.dir[t] * flip];

/* ---------------- MATCH SETUP ---------------- */
/** a new match: spec { home, away, stadium, seed, qLen, quarter, clock, score, start, possession, los, down, toGo, difficulty, humans, cheats, weather, hub } */
S.newMatch = (spec) => {
  NEXT_ID = 0;
  FF.rng.seed(spec.seed || 1);
  FF.bus.clearMods();
  S.spec = spec; S.scenario = spec; S.hub = !!spec.hub;
  S.teams = [FF.team(spec.home), FF.team(spec.away)];
  S.rosters = [S.teams[0].roster.map(p => makeAthlete(0, p)), S.teams[1].roster.map(p => makeAthlete(1, p))];
  S.all = S.rosters[0].concat(S.rosters[1]);
  S.score = spec.score ? spec.score.slice() : [0, 0];
  S.qLen = spec.qLen || 120; S.quarter = spec.quarter || 1; S.clock = spec.clock !== undefined ? spec.clock : S.qLen;
  S.dir = S.quarter >= 3 ? [-1, 1] : [1, -1];
  S.difficulty = spec.difficulty || 'pro';
  S.cheats = Object.assign({}, spec.cheats || {});
  S.cards = [spec.cards && spec.cards[0] ? spec.cards[0].slice() : [], spec.cards && spec.cards[1] ? spec.cards[1].slice() : []];
  S.meter = [0, 0]; S.armed = [null, null];
  S.unitFilter = spec.unitFilter || null; S.forceCalls = spec.forceCalls || null; S.calls = [null, null]; S.play = null; S.mascot = null; S.scorer = null; S.patTeam = undefined; S.pendingNext = null; S.halftimeHold = false; S.lightsAt = null; S.lightsDone = false; S.lightsPlays = 0;
  S.time = 0; S.step = 0; S.over = false; S.winner = -1; S.ot = false; S.playNo = 0; S.lights = false; S.megaNext = -1; S.mascotOn = -1; S.superFoot = -1; S.ended = false;
  S.stats = { team: [mkTeamStats(), mkTeamStats()], biggestHit: null, longest: null, highlights: [], drives: 0 };
  S.ball = { state: 'dead', holder: null, x: MID_Y, y: MID_Y, z: 0, vx: 0, vy: 0, vz: 0, t: 0, T: 0, team: 0, body: new E.Body({ x: 0, y: 0, r: 3, bounce: .45, gravity: 600 }), spin: 0, last: null };
  S.halfKick = spec.kicking !== undefined ? spec.kicking : (r() < .5 ? 0 : 1);
  S.poss = 1 - S.halfKick;
  for (const t of [0, 1]) S.rosters[t].forEach(a => { a.b.x = 900; a.b.y = SIDE_B + 60; });
  if (spec.start && typeof spec.start === 'object') {
    S.poss = spec.start.possession; S.down = spec.start.down || 1; S.toGo = spec.start.toGo || T.yardsToGo;
    S.los = S.xAt(spec.start.los || 25, S.poss); S.spotY = MID_Y; S.mode = 'normal';
    setUnits('off', 'def'); placeFormationNow();
    toPhase('PLAYCALL');
  } else if (spec.start === 'kickoff' || !spec.start) {
    S.poss = spec.kicking !== undefined ? spec.kicking : S.halfKick;
    if (spec.start === 'kickoff') setupKickoff(S.poss); else toPhase('COIN', 1.6);
  }
  emit('matchStart', { home: S.teams[0].id, away: S.teams[1].id });
};
function mkTeamStats() { return { yards: 0, pass: 0, rush: 0, to: 0, sacks: 0, tds: 0, fg: 0, bigHits: 0, lateHits: 0, fumblesForced: 0, plays: 0, fills: 0 }; }

function toPhase(p, t = 0) { const from = S.phase; S.phase = p; S.phaseT = t; S.phaseTime = 0; emit('phase', { from, to: p }); }
S.toPhase = toPhase;

/* ---------------- PLAY SETUP ---------------- */
function setupKickoff(kicker) {
  S.poss = kicker; S.mode = 'kickoff'; S.kickSpotYd = S.safetyKick ? 20 : 30; S.safetyKick = false;
  S.los = S.xAt(S.kickSpotYd, kicker); S.spotY = MID_Y; S.down = 1; S.toGo = T.yardsToGo;
  setUnits('kick', 'off');
  S.calls = [null, null]; toPhase('PLAYCALL');
}
S.setupKickoff = setupKickoff;
/** both calls are in: build the play and line up */
S.callsDone = () => {
  const off = S.calls[S.poss], def = S.calls[1 - S.poss];
  S.play = { off, def, t: 0, snapped: false, kind: null, startLos: S.los, startDown: S.down, startToGo: S.toGo, startPoss: S.poss, yards: 0, firstTeam: S.poss, passThrown: false, sackable: true, result: null, events: [] };
  const P = S.play;
  // cards armed on the play-call screen
  for (const t of [0, 1]) { const c = S.calls[t] && S.calls[t].card; if (c) useCard(t, c); }
  if (S.mode === 'kickoff') {
    P.kind = 'kickoff'; P.kick = (off && off.play && off.play.kickoff) || 'deep'; P.ret = (def && def.play) || FF.play('ret_mid');
    placeKickoff();
  } else {
    const op = off.play;
    P.offPlay = op; P.defPlay = def.play; P.flip = off.flip ? -1 : 1; P.dflip = def.flip ? -1 : 1;
    if (op.pat) { P.kind = op.pat === 'kick' ? 'fg' : 'two'; }
    else P.kind = op.type;   // run, pass, punt, fg, kneel
    if (P.kind === 'two') { P.offPlay = off.two || FF.play('slants'); P.kind = P.offPlay.type; P.conversion = true; }
    if (op.pat === 'kick') { P.offPlay = FF.play('field_goal'); P.kind = 'fg'; P.conversion = true; P.xp = true; }
    if (S.mode === 'pat') P.conversion = true;
    const offKind = P.kind === 'punt' ? 'punt' : P.kind === 'fg' ? 'fg' : P.offPlay.kSlot ? 'punt' : 'off';
    setUnits(offKind, 'def', P.offPlay.kSlot);
    if ((P.kind === 'punt' || P.kind === 'fg') && !P.defPlay.kickOnly) P.defPlay = P.kind === 'punt' ? FF.play('punt_return') : FF.play('fg_block');
    if (P.kind !== 'punt' && P.kind !== 'fg' && P.defPlay.kickOnly) P.defPlay = FF.play('cover2');
    placeFormation();
  }
  S.mascot = null;
  if (S.mascotOn >= 0) { S.mascot = { team: S.mascotOn, x: S.los, y: SIDE_B + 20, vx: 0, vy: 0, z: 0, t: 0, done: false }; S.mascotOn = -1; emit('mascotOn', { team: S.mascot.team }); }
  S.presnap = { t: 0, set: false, hikeAt: 0.6 + r() * 1.4, auto: T.autoHike, meter: null };
  Object.assign(S.ball, { state: 'dead', holder: null, x: S.los, y: S.spotY, z: P.kind === 'kickoff' ? 2 : 0, vx: 0, vy: 0, vz: 0, fire: false, golden: false, kickKind: null, possX: undefined, bounce: null });
  FF.bus.emit('presnap', { play: P });
  toPhase('PRESNAP');
};
function useCard(t, id) {
  const card = FF.card(id); if (!card) return;
  const i = S.cards[t].indexOf(id); if (i >= 0 && !S.cheats.unlimitedCards) S.cards[t].splice(i, 1);
  const held = S.athletes.find(a => a.team === t && a.ctl >= 0) || bestPlayer(t);
  card.apply({ team: t, athlete: held });
  S.stats.team[t].cards = (S.stats.team[t].cards || 0) + 1;
  emit('cardUsed', { team: t, card: id, mascot: S.teams[t].mascot.name });
}
S.useCard = useCard;
function bestPlayer(t) { const on = S.onField(t); return on.find(a => a.p.special) || on.find(a => a.slot === 'QB') || on.find(a => a.slot === 'RB') || on[0]; }
S.bestPlayer = bestPlayer;

function placeFormation() {
  const P = S.play, op = P.offPlay, dp = P.defPlay, fo = FF.data.formations[op.formation], fd = FF.data.formations[dp.formation];
  for (const a of S.onField(S.poss)) {
    const key = a.slot === 'K' ? 'K' : a.role, sp = fo[key] || fo[a.role] || [-3, 0];
    const [x, y] = S.toWorld(sp[0], sp[1], P.flip); a.home = [x, y];
    a.assign = (a.slot === 'K' ? op.assign.K : op.assign[a.role]) || { block: 'pass', zone: 'mid' };
  }
  for (const a of S.onField(1 - S.poss)) {
    const sp = fd[a.role] || [5, 0]; let y = sp[1];
    if (typeof y === 'string') { const m = S.bySlot(S.poss, y); y = m ? S.fromWorld(m.home[0], m.home[1], 1)[1] : 0; }
    else y *= P.dflip;
    const [x, wy] = S.toWorld(sp[0], y, 1); a.home = [x, wy];
    a.assign = Object.assign({}, dp.assign[a.role] || { zone: { at: [8, 0], r: 7 } });
    if (a.assign.zone && P.dflip < 0) a.assign.zone = { at: [a.assign.zone.at[0], -a.assign.zone.at[1]], r: a.assign.zone.r };
  }
}
function placeFormationNow() { S.play = S.play || { offPlay: FF.play('hb_dive'), defPlay: FF.play('cover2'), flip: 1, dflip: 1 }; placeFormation(); for (const a of S.athletes) { a.b.x = a.home[0]; a.b.y = a.home[1]; a.facing = a.team === S.poss ? (S.dir[S.poss] > 0 ? 0 : Math.PI) : (S.dir[S.poss] > 0 ? Math.PI : 0); } }
function placeKickoff() {
  const k = S.poss, d = S.dir[k], ys = [-20, -12, -5, 5, 12, 20];
  let i = 0;
  for (const a of S.onField(k)) {
    if (a.slot === 'K') a.home = [S.los - d * 6 * Y, MID_Y];
    else { a.home = [S.los - d * 1 * Y, MID_Y + ys[i++] * Y]; }
    a.assign = { kickCover: true };
  }
  const rt = 1 - k, ret = S.play.ret, hands = ret && ret.hands;
  const goal = S.ownGoalX(rt), rd = S.dir[rt];
  const spots = hands ? { WR1: [12, -6], WR2: [12, 6], RB: [14, 0], QB: [11, -12], C: [11, 0], LG: [11, -3], RG: [11, 3] }
    : { WR1: [-3, 0], RB: [10, ret && ret.lane ? -ret.lane * 8 : 6], WR2: [22, -9], QB: [22, 9], C: [26, 0], LG: [26, -14], RG: [26, 14] };
  for (const a of S.onField(rt)) {
    const sp = spots[a.role] || [20, 0];
    if (hands) a.home = [S.los + d * sp[0] * Y, MID_Y + sp[1] * Y];
    else a.home = [goal + rd * sp[0] * Y, MID_Y + sp[1] * Y];
    a.assign = a.role === 'WR1' ? { returner: true } : { returnBlock: true, lane: ret ? ret.lane : 0 };
  }
}

/* ---------------- THE STEP ---------------- */
S.update = (dt) => {
  if (S.phase === 'IDLE' || S.over && S.phase === 'FINAL' && S.ended) { S.time += dt; return; }
  S.time += dt; S.step++; S.phaseTime = (S.phaseTime || 0) + dt;
  switch (S.phase) {
    case 'COIN': if ((S.phaseT -= dt) <= 0) { emit('coin', { winner: 1 - S.halfKick }); setupKickoff(S.halfKick); } break;
    case 'PLAYCALL': playcallStep(dt); break;
    case 'PRESNAP': presnapStep(dt); break;
    case 'LIVE': liveStep(dt); break;
    case 'DEAD': deadStep(dt); break;
    case 'CELEBRATE': moveAll(dt, true); if ((S.phaseT -= dt) <= 0) afterCelebrate(); break;
    case 'QUARTER': moveAll(dt, true); if ((S.phaseT -= dt) <= 0) nextQuarterGo(); break;
    case 'HALFTIME': moveAll(dt, true); if ((S.phaseT -= dt) <= 0 && !S.halftimeHold) secondHalf(); break;
    case 'FINAL': moveAll(dt, true); break;
  }
};
function playcallStep(dt) {
  moveAll(dt, true);
  // the CPU calls after a human-like delay; the timer picks COACH SAYS for a human that doesn't choose
  for (const t of [0, 1]) {
    if (S.calls[t]) continue;
    if (S.forceCalls && S.forceCalls[t]) { const fc = S.forceCalls[t](); if (fc) { S.calls[t] = fc; continue; } }
    if (!S.isHuman(t) && S.phaseTime > (S.cpuCallDelay || .9)) S.calls[t] = FF.coach.call(t);
  }
  if (S.phaseTime > T.playcallTime + (S.hub ? 3 : 0)) for (const t of [0, 1]) if (!S.calls[t]) S.calls[t] = FF.coach.call(t);
  if (S.calls[0] && S.calls[1]) S.callsDone();
}
S.isHuman = t => !!(FF.control && FF.control.humanOn(t));
S.cheatSide = t => S.cheats.team !== undefined ? S.cheats.team === t : S.isHuman(t);

function presnapStep(dt) {
  const ps = S.presnap, P = S.play; ps.t += dt;
  for (const a of S.athletes) if (a.ctl >= 0 && FF.control) a.intent = FF.control.intent(a);
  for (const a of S.athletes) {   // jog to the spot
    const dx = a.home[0] - a.b.x, dy = a.home[1] - a.b.y, d = hyp(dx, dy);
    const human = a.ctl >= 0 && a.team !== S.poss && ps.t > .8 && P.kind !== 'kickoff';
    if (human) { moveAthlete(a, dt, a.intent); a.b.x = S.dir[S.poss] > 0 ? Math.max(a.b.x, S.los + 6) : Math.min(a.b.x, S.los - 6); continue; }
    const sp = Math.min(d / dt, ps.t < 1.4 ? 260 : 120);
    a.b.vx = d > .5 ? dx / d * sp : 0; a.b.vy = d > .5 ? dy / d * sp : 0;
    if (d < .5 || ps.t > 1.6) { a.b.x = a.home[0]; a.b.y = a.home[1]; a.b.vx = a.b.vy = 0; }
    a.b.x += a.b.vx * dt; a.b.y += a.b.vy * dt;
    const face = P.kind === 'kickoff' ? (a.team === S.poss ? (S.dir[S.poss] > 0 ? 0 : Math.PI) : (S.dir[S.poss] > 0 ? Math.PI : 0)) : (a.team === S.poss ? (S.dir[S.poss] > 0 ? 0 : Math.PI) : (S.dir[S.poss] > 0 ? Math.PI : 0));
    a.facing = d > 4 && ps.t < 1.2 ? Math.atan2(dy, dx) : E.approachAng(a.facing, face, dt * 10);
    a.pose = ps.t > 1.2 ? stancePose(a) : (d > 3 ? 'RUN' : 'IDLE');
  }
  if (ps.t < 1.2) return;
  if (!ps.set) { ps.set = true; ps.setT = ps.t; emit('set', { play: P }); }
  const kicker = S.athletes.find(a => a.slot === 'K' && a.team === S.poss);
  const isKick = P.kind === 'kickoff' || P.kind === 'punt' || P.kind === 'fg';
  const localKick = FF.control && FF.control.humans.some(h => h.team === S.poss && !h.cpu && !h.remote);
  const offHuman = S.isHuman(S.poss) && (!isKick || localKick);
  // humans hike with b1 (a kick play: b1 starts the meter, which hikes); the CPU after its delay; an auto hike when time runs out
  const remoteKicker = isKick && !localKick && S.isHuman(S.poss) && FF.net && FF.net.active;
  if (remoteKicker) {
    const rk = FF.net.remoteKick && FF.net.remoteKick[S.poss];
    if (rk || ps.t - ps.setT > 6) { if (FF.net.remoteKick) FF.net.remoteKick[S.poss] = null; if (P.kind === 'kickoff') { toPhase('LIVE'); P.snapped = true; P.t = 0; } else snap(); FF.kick.cpu(kicker, P.kind, rk || null); }
    return;
  }
  if (offHuman) {
    const q = S.athletes.find(a => a.team === S.poss && a.ctl >= 0);
    const press = q ? q.intent.press : 0;
    ps.auto -= dt;
    if (isKick) {
      if (!FF.kick.active() && ((press & BIT.b1) || ps.auto <= 0)) { FF.kick.start(kicker, P.kind, q && q.ctl); if (P.kind !== 'kickoff') snap(); else { toPhase('LIVE'); P.snapped = true; P.t = 0; } }
    } else if ((press & BIT.b1) || ps.auto <= 0 || (q && q.intent.click === 'hike')) snap();
  } else if (ps.t - ps.setT > ps.hikeAt) {
    if (P.kind === 'kickoff') { toPhase('LIVE'); P.snapped = true; P.t = 0; FF.kick.cpu(kicker, 'kickoff'); }
    else { snap(); if (isKick) FF.kick.cpu(kicker, P.kind); }
  }
}
function stancePose(a) {
  if (S.play.kind === 'kickoff') return 'IDLE';
  if (a.pos === 'OL' || a.pos === 'DE' || a.pos === 'NT') return 'STANCE3';
  if (a.slot === 'QB') return S.play.offPlay && FF.data.formations[S.play.offPlay.formation].QB[0] > -2 ? 'QB_UC' : 'QB_SG';
  if (a.slot === 'K') return 'IDLE';
  return 'STANCE2';
}
function snap() {
  const P = S.play; P.snapped = true; P.t = 0; toPhase('LIVE');
  const c = S.bySlot(S.poss, 'C') || S.athletes.find(a => a.team === S.poss);
  const qb = (P.kind === 'punt') ? S.athletes.find(a => a.team === S.poss && a.slot === 'K') : (S.bySlot(S.poss, 'QB') || S.athletes.find(a => a.team === S.poss && a.slot === 'K'));
  const B = S.ball; B.team = S.poss; B.last = c;
  if (!qb) return;
  const d = dist(c.b, qb.b);
  if (d < 2.2 * Y) giveBall(qb, 'snap');
  else { B.state = 'pass'; B.passType = 'snap'; launchPass(c, qb, d / (P.kind === 'punt' ? .55 : .32), { forced: true, z0: 8, gravity: 300, noErr: true }); }
  c.act = { id: 'snap', t: 0, dur: .25 }; c.pose = 'SNAP';
  emit('snap', { team: S.poss, play: P.offPlay && P.offPlay.id, qb: qb.id });
}

/* ---------------- LIVE ---------------- */
function liveStep(dt) {
  const P = S.play; P.t += dt;
  if (!S.cheats.freezeClock && !(P.kind === 'kickoff' && P.t < .5)) S.clock = Math.max(0, S.clock - dt);
  for (const a of S.athletes) a.intent = a.ctl >= 0 && FF.control ? FF.control.intent(a) : FF.ai.intent(a, dt);
  if (S.netIntents) S.netIntents();
  for (const a of S.athletes) actAthlete(a, dt);
  blocking(dt);
  for (const a of S.athletes) moveAthlete(a, dt, a.intent);
  collide(dt);
  mascotStep(dt);
  ballStep(dt);
  if (S.phase !== 'LIVE') return;
  contacts(dt);
  if (FF.ots) FF.ots.update(dt);
  if (S.phase !== 'LIVE') return;
  bounds();
  if (FF.kick) FF.kick.update(dt);
  if (S.phase === 'LIVE' && P.t > 40) { emit('stuck', {}); deadBall('stuck'); }   // never let a play stall
}
function moveAll(dt, idle) {
  for (const a of S.athletes) {
    if (idle) { a.intent = a.ctl >= 0 && S.phase === 'DEAD' && FF.control ? FF.control.intent(a) : { mx: 0, my: 0, turbo: false, press: 0 }; }
    if (a.act && a.act.id !== 'celebrate' && a.act.id !== 'lateHit') { a.act.t += dt; if (a.act.t > a.act.dur) a.act = null; }
    if (a.down > 0) { a.down -= dt; if (a.down <= 0) { a.down = 0; a.act = { id: 'getUp', t: 0, dur: .7 }; } }
    const m = idle && !(S.phase === 'DEAD' && a.ctl >= 0) ? { mx: 0, my: 0 } : a.intent;
    if (a.down > 0 || (a.act && a.act.id === 'getUp')) { a.b.vx *= .85; a.b.vy *= .85; }
    else moveAthlete(a, dt, m);
    if (a.act && a.act.id === 'celebrate') { a.act.t += dt; if (a.act.t > a.act.dur) a.act = null; }
  }
  for (const a of S.athletes) updatePose(a);
  collide(dt);
}
S.moveAll = moveAll;

/** movement from an intent: speed by rating, turbo, carrying, backpedal, surfaces; actions that lunge set the velocity */
function moveAthlete(a, dt, it) {
  const b = a.b;
  a.slowT = Math.max(0, a.slowT - dt); a.burst = Math.max(0, a.burst - dt); a.cool = Math.max(0, a.cool - dt); a.tryT = Math.max(0, a.tryT - dt);
  if (a.down > 0) { b.vx *= Math.exp(-dt * 6); b.vy *= Math.exp(-dt * 6); integrate(a, dt); return; }
  if (a.eng) { integrate(a, dt); return; }   // a blocking pair moves together (blocking())
  const act = a.act;
  if (act && act.lunge) { integrate(a, dt); return; }
  let top = S.topSpeed(a);
  const want = hyp(it.mx, it.my);
  const turbo = it.turbo && (a.turbo > .02 || a.hot > 0 || S.cheats.infiniteTurbo && (a.ctl >= 0 || S.cheats.team === a.team));
  if (turbo && want > .1) { top *= T.turboMult; if (!(a.hot > 0) && !(S.cheats.infiniteTurbo && (a.ctl >= 0 || S.cheats.team === a.team))) a.turbo = Math.max(0, a.turbo - T.turboDrain * dt); }
  else a.turbo = Math.min(1, a.turbo + T.turboRegen * dt);
  if (a.slowT > 0) top *= .75;
  if (a.burst > 0) top *= 1.2;
  if (a.afterburn > 0) { a.afterburn -= dt; top *= 1.35; }
  if (act && (act.id === 'spin')) top *= .8;
  if (act && act.slow) top *= act.slow;
  let dx = want > 1 ? it.mx / want : it.mx, dy = want > 1 ? it.my / want : it.my;
  if (want > .1) {
    const mv = Math.atan2(dy, dx), back = Math.abs(E.angDiff(mv, a.facing)) > 1.75;
    if (back && a.pos !== 'QB' && a.slot !== 'K') top *= T.backpedalMult;
  }
  const surf = surface(b.x, b.y);
  if (surf === 'mud') top *= .85;
  if (S.weatherKind === 'snow') top *= .95;
  let acc = (T.accelBase + a.r.ACC * 30) * (turbo ? 1.3 : 1);
  if (surf === 'mud') acc *= .7;
  if (surf === 'ice') acc *= .5;
  const tvx = dx * top, tvy = dy * top;
  const ddx = tvx - b.vx, ddy = tvy - b.vy, dd = hyp(ddx, ddy), k = Math.min(1, (want > .1 ? acc : 900) * dt / (dd || 1));
  b.vx += ddx * k; b.vy += ddy * k;
  if (want > .1) {
    const sp = hyp(b.vx, b.vy), rate = sp > 100 ? 9 : 16;
    const target = act && act.id === 'spin' ? a.facing : (Math.abs(E.angDiff(Math.atan2(dy, dx), a.facing)) > 1.75 && (a.pos === 'QB' || a.brain.backpedal) ? a.facing : Math.atan2(dy, dx));
    a.facing = E.approachAng(a.facing, target, rate * dt);
  }
  integrate(a, dt);
}
function integrate(a, dt) {
  const b = a.b;
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (b.z > 0 || b.vz > 0) { b.vz -= 700 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = 0; } }
}
S.surface = surface;
function surface(x, y) { return FF.stadiumSurface ? FF.stadiumSurface(x, y) : 'grass'; }

/* ---------------- ACTIONS ---------------- */
const pressed = (a, k) => (a.intent.press & BIT[k]) !== 0;
function actAthlete(a, dt) {
  const act = a.act, B = S.ball;
  if (a.down > 0) { a.down -= dt; if (a.down <= 0) { a.down = 0; a.act = { id: 'getUp', t: 0, dur: .7 }; } updatePose(a); return; }
  if (act) {
    act.t += dt;
    if (act.id === 'throw' && !act.done && act.t >= act.release) { act.done = true; releaseThrow(a, act); }
    if (act.id === 'dive' || act.id === 'tackleDive' || act.id === 'bigHit' || act.id === 'diveCatch') {
      if (act.t > act.air && !act.landed) {
        act.landed = true; act.lunge = false;
        if (act.id === 'dive' && S.carrier() === a) { a.down = .6; deadBall('down'); }
        else if (!act.hit) a.down = act.id === 'bigHit' ? 1.0 : act.id === 'diveCatch' ? .45 : .7;
      }
    }
    if (act.id === 'hurdle' && act.t > .55) act.lunge = false;
    if (act.t >= act.dur) { a.act = null; }
  }
  if (!a.act || a.act.id === 'getUp' && a.act.t >= a.act.dur) {
    if (a.act && a.act.id === 'getUp') a.act = null;
    const carrier = S.carrier() === a, P = S.play;
    if (carrier) {
      // the QB behind the line with a pass play throws; a runner has his moves
      const behind = (a.b.x - S.los) * S.dir[a.team] < Y * .5;
      const canThrow = a.team === P.startPoss && !P.passThrown && behind && (a.slot === 'QB' || (a.slot === 'K' && P.kind === 'pass')) && P.kind !== 'kneel';
      if (canThrow) {
        if (a.intent.recv >= 0) { const recv = receivers(a.team)[a.intent.recv]; if (recv && recv !== a) S.startThrow(a, recv, a.intent.turbo); }
      } else {
        if (pressed(a, 'b1')) startAct(a, 'dive');
        else if (pressed(a, 'b2')) startAct(a, 'stiffArm');
        else if (pressed(a, 'b3') && a.cool <= 0) startAct(a, 'spin');
        else if (pressed(a, 'b4')) startAct(a, 'hurdle');
        else if ((pressed(a, 'lb') || pressed(a, 'rb')) && !(pressed(a, 'lb') && pressed(a, 'rb'))) lateral(a);
      }
      if (pressed(a, 'lb') && pressed(a, 'rb') || a.intent.special) FF.ots && FF.ots.trySpecial(a);
    } else {
      const c = S.carrier(), defending = c && c.team !== a.team;
      if (B.state === 'pass' && B.passType !== 'snap' && B.passType !== 'pitch') {
        if (pressed(a, 'b4')) startAct(a, 'jump');
        else if (pressed(a, 'b1')) startAct(a, a.team === B.team ? 'diveCatch' : 'tackleDive');
      } else if (B.state === 'loose') {
        if (pressed(a, 'b1')) startAct(a, 'tackleDive');
      } else if (defending) {
        if (pressed(a, 'b1')) startAct(a, a.intent.turbo && (a.turbo >= .15 || a.hot > 0) ? 'bigHit' : 'tackleDive');
        else if (pressed(a, 'b3')) { if (a.eng) a.swim = (a.swim || 0) + 1; else startAct(a, 'strip'); }
        else if (pressed(a, 'b4')) startAct(a, 'jump');
      } else if (pressed(a, 'b3') && a.eng) a.swim = (a.swim || 0) + 1;
      if (a.intent.special) FF.ots && FF.ots.trySpecial(a);
    }
  }
  updatePose(a);
}
S.receivers = receivers;
function receivers(t) { return ['WR1', 'WR2', 'RB'].map(s => S.bySlot(t, s)).filter(Boolean); }
function startAct(a, id, extra = {}) {
  const f = a.facing, b = a.b;
  const A = { id, t: 0, dur: .4 };
  switch (id) {
    case 'dive': A.dur = 1.05; A.air = .45; A.lunge = true; { const sp = Math.max(hyp(b.vx, b.vy), 90) * 1.4; b.vx = Math.cos(f) * sp; b.vy = Math.sin(f) * sp; b.vz = 120; b.z = .1; } if (surface(b.x, b.y) === 'mud') { b.vx *= 1.2; b.vy *= 1.2; } break;
    case 'tackleDive': case 'bigHit': {
      A.dur = id === 'bigHit' ? 1.35 : 1.15; A.air = id === 'bigHit' ? .35 : .45; A.lunge = true;
      const tgt = S.carrier() || (S.ball.state === 'loose' ? S.ball : null); let aim = f;
      if (tgt) { const lead = tgt.b ? Math.min(.3, hyp(tgt.b.x - b.x, tgt.b.y - b.y) / 220) : 0; const tx = tgt.b ? tgt.b.x + tgt.b.vx * lead : tgt.x, ty = tgt.b ? tgt.b.y + tgt.b.vy * lead : tgt.y; const d = hyp(tx - b.x, ty - b.y); if (d < 4 * Y) aim = Math.atan2(ty - b.y, tx - b.x); }
      a.facing = aim; const sp = Math.max(hyp(b.vx, b.vy), 110) * (id === 'bigHit' ? 1.6 : 1.35);
      b.vx = Math.cos(aim) * sp; b.vy = Math.sin(aim) * sp; b.vz = 90; b.z = .1;
      if (id === 'bigHit' && !(a.hot > 0)) a.turbo = Math.max(0, a.turbo - .15);
      break; }
    case 'spin': A.dur = .32; a.cool = .8; break;
    case 'stiffArm': A.dur = .4; break;
    case 'hurdle': A.dur = .6; b.vz = 260; b.z = .1; break;
    case 'jump': A.dur = .5; b.vz = 200; b.z = .1; break;
    case 'diveCatch': A.dur = .9; A.air = .45; A.lunge = true; { const sp = Math.max(hyp(b.vx, b.vy), 90) * 1.25; b.vx = Math.cos(f) * sp; b.vy = Math.sin(f) * sp; b.vz = 80; b.z = .1; } break;
    case 'strip': A.dur = .3; tryStrip(a); break;
    case 'lateHit': A.dur = .5; break;
  }
  Object.assign(A, extra); a.act = A;
  emit('act', { a: a.id, act: id });
  return A;
}
S.startAct = startAct;

/* ---------------- PASSING ---------------- */
function startThrow(qb, recv, bullet) {
  qb.act = { id: 'throw', t: 0, dur: .5, release: .26, recv, bullet: !!bullet };
  S.play.passThrown = true; S.play.sackable = false;
}
S.startThrow = startThrow;
function releaseThrow(qb, act) {
  const recv = act.recv, B = S.ball;
  if (S.carrier() !== qb) return;
  const bullet = act.bullet, sp = bullet ? T.bulletSpeed + qb.r.ARM * 10 : T.lobSpeed + qb.r.ARM * 8;
  let t = 0, tx = recv.b.x, ty = recv.b.y;
  for (let i = 0; i < 3; i++) { const d = hyp(tx - qb.b.x, ty - qb.b.y); t = d / sp; tx = recv.b.x + recv.b.vx * t * .95; ty = recv.b.y + recv.b.vy * t * .95; }
  tx = clamp(tx, END_L + 8, END_R - 8); ty = clamp(ty, SIDE_T + 8, SIDE_B - 8);
  // accuracy: pressure, throwing on the run, the QB's aim, specials and the hot streak
  const d = hyp(tx - qb.b.x, ty - qb.b.y);
  const press = S.athletes.some(o => o.team !== qb.team && dist(o.b, qb.b) < 2 * Y && o.down <= 0) ? T.pressureMult : 1;
  const run = hyp(qb.b.vx, qb.b.vy) > 60 ? 1.25 : 1;
  let sig = T.aimError * d * Math.max(.2, 1.3 - qb.r.AIM * .06) * press * run;
  sig = FF.bus.mod('aim.err', sig, { a: qb, team: qb.team });
  if (qb.hot > 0) sig *= .6;
  if (act.golden) sig = 0;
  tx += FF.gauss() * sig; ty += FF.gauss() * sig;
  const maxR = (T.maxPass + qb.r.ARM * 1.5) * Y;
  if (d > maxR) { const k = maxR / d; tx = qb.b.x + (tx - qb.b.x) * k; ty = qb.b.y + (ty - qb.b.y) * k; }
  const tt = Math.max(.25, hyp(tx - qb.b.x, ty - qb.b.y) / sp) * (S.play.offPlay && S.play.offPlay.assign.QB && S.play.offPlay.assign.QB.lob ? 1.25 : 1);
  B.passType = bullet ? 'bullet' : 'lob'; B.golden = !!act.golden; B.fire = qb.hot > 0;
  launchPass(qb, { b: { x: tx, y: ty } }, sp, { target: recv, tx, ty, time: tt });
  qb.stats.att++;
  S.stats.team[qb.team].att = (S.stats.team[qb.team].att || 0) + 1;
  emit('pass', { thrower: qb.id, target: recv.id, type: B.passType, x: tx, y: ty, t: tt });
}
S.releaseThrow = releaseThrow;
/** a ball through the air from a to the point o.tx, o.ty (or to b's spot), arriving at chest height */
function launchPass(a, b, speed, o = {}) {
  const B = S.ball, tx = o.tx !== undefined ? o.tx : b.b.x, ty = o.ty !== undefined ? o.ty : b.b.y;
  const from = { x: a.b.x + Math.cos(a.facing) * 4, y: a.b.y + Math.sin(a.facing) * 4, z: o.z0 || 30 };
  const time = o.time || Math.max(.2, hyp(tx - from.x, ty - from.y) / speed);
  const g = o.gravity || T.passGravity, v = E.arc(from, { x: tx, y: ty, z: 20 }, g, { time });
  Object.assign(B, { state: 'pass', holder: null, x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, t: 0, T: time, g, target: o.target || (b.id !== undefined ? b : null), tx, ty, thrower: a, forced: !!o.forced, resolved: false, deflected: 0, team: a.team, noInt: !!B.golden });
  if (o.forced) B.passType = o.type || 'snap';
  B.from = [from.x, from.y];
}
S.launchPass = launchPass;
function lateral(a) {
  const back = Math.atan2(0, -S.dir[a.team]);
  let best = null, bd = 1e9;
  for (const m of S.onField(a.team)) {
    if (m === a || m.down > 0) continue;
    const d = dist(m.b, a.b), dir = ang(a.b, m.b);
    if (d < 9 * Y && Math.abs(E.angDiff(dir, back)) < 1.75 && d < bd) { bd = d; best = m; }
  }
  if (best) { S.ball.passType = 'pitch'; launchPass(a, best, 260, { forced: true, type: 'pitch', z0: 18, gravity: 400 }); S.ball.target = best; emit('lateral', { from: a.id, to: best.id }); }
  else { // a bad lateral: to the ground behind him, a loose ball
    const tx = a.b.x - S.dir[a.team] * 3 * Y, ty = a.b.y;
    S.ball.passType = 'pitch'; launchPass(a, null, 200, { tx, ty, forced: true, type: 'pitch', z0: 18, gravity: 400 }); S.ball.target = null; S.ball.badLateral = true;
    emit('lateral', { from: a.id, to: -1 });
  }
  a.act = { id: 'lateral', t: 0, dur: .25 };
}
S.lateral = lateral;
function giveBall(a, how) {
  const B = S.ball;
  const prevTeam = B.team;
  B.state = 'held'; B.holder = a; B.team = a.team; B.last = a; B.target = null; B.resolved = false; B.badLateral = false;
  if (!B.possX && B.possX !== 0) B.possX = a.b.x;
  if (how !== 'snap' && how !== 'handoff' && how !== 'pitch') B.possX = a.b.x;
  if (prevTeam !== a.team) B.possX = a.b.x;
  emit('possess', { a: a.id, how, team: a.team });
}
S.giveBall = giveBall;

/* ---------------- THE BALL ---------------- */
function ballStep(dt) {
  const B = S.ball, P = S.play;
  if (B.state === 'held') {
    const h = B.holder; B.x = h.b.x + Math.cos(h.facing) * 6; B.y = h.b.y + Math.sin(h.facing) * 6; B.z = h.b.z + 14; B.vx = h.b.vx; B.vy = h.b.vy;
    // handoffs, pitches and the flea flicker, scheduled by the play
    if (P && P.kind !== 'kickoff') runPlayScript(h, dt);
    return;
  }
  if (B.state === 'pass') {
    B.t += dt; B.x += B.vx * dt; B.y += B.vy * dt; B.vz -= B.g * dt; B.z += B.vz * dt;
    if (B.forced && B.target && B.t >= B.T - .02) {   // snaps and pitches: caught by their man (nearly always)
      const tg = B.target;
      if (dist(tg.b, B) < 2.5 * Y && tg.down <= 0 && (B.passType !== 'pitch' || r() < .97)) { giveBall(tg, B.passType === 'pitch' ? 'pitch' : 'snap'); if (B.passType === 'snap' && P.kind === 'pass') { /* QB */ } return; }
      return loose(B.x, B.y, 6, B.vx * .3, B.vy * .3, 60, 'muff');
    }
    if (B.forced && !B.target && B.z <= 2) return loose(B.x, B.y, 2, B.vx * .4, B.vy * .4, 50, 'badLateral');
    if (!B.forced && B.vz < 0 && B.z <= 40 && !B.resolved) resolveCatch();
    if (B.state === 'pass' && B.z <= 0) {
      if (B.forced) return loose(B.x, B.y, 0, B.vx * .4, B.vy * .4, 40, 'muff');
      incomplete();
    }
    if (B.state === 'pass' && (B.y < SIDE_T - 40 || B.y > SIDE_B + 40)) incomplete();
    return;
  }
  if (B.state === 'kick') {
    B.t += dt; B.x += B.vx * dt; B.y += B.vy * dt; B.vz -= B.g * dt; B.z += B.vz * dt; B.spin += dt * 10;
    if (FF.kick && FF.kick.flight(dt)) return;
    if (B.z <= 0) { B.z = 0; loose(B.x, B.y, 0, B.vx * .6, B.vy * .6, Math.abs(B.vz) * .45, 'kickLand'); }
    return;
  }
  if (B.state === 'loose') {
    const bd = B.body; bd.update(dt, null);
    if (bd.bounced) { const a0 = Math.atan2(bd.vy, bd.vx) + (r() - .5) * .87, sp = hyp(bd.vx, bd.vy) * (.7 + r() * .6); bd.vx = Math.cos(a0) * sp; bd.vy = Math.sin(a0) * sp; emit('bounce', {}); }
    if (bd.z <= .5) { const f = Math.exp(-dt * 1.6); bd.vx *= f; bd.vy *= f; }
    B.x = bd.x; B.y = bd.y; B.z = bd.z; B.t += dt; B.spin += dt * 8;
    if (B.pile) return pileStep(dt);
    // recovery: the first whose feet or dive touch it while low
    if (B.z <= 8 && B.t > .15) {
      const near = S.athletes.filter(a => a.down <= 0 || (a.act && a.act.id === 'tackleDive')).filter(a => hyp(a.b.x - B.x, a.b.y - B.y) < (a.act && a.act.lunge ? 12 : 8));
      if (near.length) {
        const crowd = S.athletes.filter(a => hyp(a.b.x - B.x, a.b.y - B.y) < 1.5 * Y);
        if (crowd.length >= 2 && !B.noPile) return startPile(crowd);
        recover(near[0]);
      }
    }
    if (B.kickLand && B.t > 3.5) { recoverNearest(); }
    return;
  }
}
function runPlayScript(h, dt) {
  const P = S.play, qa = P.offPlay && P.offPlay.assign.QB;
  if (!P.offPlay || P.passThrown) return;
  if (h.slot === 'QB' && qa && h.team === P.startPoss) {
    if (qa.handoff && !P.handed && P.t >= qa.at) {
      const to = S.bySlot(h.team, qa.handoff);
      if (to) { P.handed = true; if (dist(to.b, h.b) < 2 * Y) { giveBall(to, 'handoff'); h.act = { id: 'handoff', t: 0, dur: .35 }; to.act = { id: 'handoffTake', t: 0, dur: .35 }; emit('handoff', { from: h.id, to: to.id }); } else { S.ball.passType = 'pitch'; launchPass(h, to, 240, { forced: true, type: 'pitch', z0: 18, gravity: 400 }); S.ball.target = to; } }
    }
    if (qa.pitch && !P.handed && P.t >= qa.at) { const to = S.bySlot(h.team, qa.pitch); if (to) { P.handed = true; S.ball.passType = 'pitch'; launchPass(h, to, 250, { forced: true, type: 'pitch', z0: 18, gravity: 400 }); S.ball.target = to; } }
  }
  if (h.slot === 'RB' && qa && qa.flea && !P.flea && P.t >= qa.flea) { const qb = S.bySlot(h.team, 'QB'); if (qb) { P.flea = true; S.ball.passType = 'pitch'; launchPass(h, qb, 240, { forced: true, type: 'pitch', z0: 18, gravity: 400 }); S.ball.target = qb; P.fleaBack = true; } }
}
function loose(x, y, z, vx, vy, vz, why) {
  const B = S.ball, bd = B.body;
  B.state = 'loose'; B.holder = null; B.t = 0; B.pile = null; B.kickLand = why === 'kickLand'; B.noPile = why === 'kickLand';
  bd.x = x; bd.y = y; bd.z = Math.max(0, z); bd.vx = vx; bd.vy = vy; bd.vz = vz; bd.onGround = false;
  B.x = x; B.y = y; B.z = bd.z;
  if (why !== 'kickLand' && why !== 'blocked') emit('loose', { why, x, y });
}
S.loose = loose;
function recover(a) {
  const B = S.ball, was = B.team, P = S.play;
  B.pile = null;
  if (B.kickLand && P.kind === 'kickoff' && a.team === S.poss && !P.onsideLegal) {
    // a deep kick recovered by the kicking team is downed where it is
    giveBall(a, 'recover'); emit('recover', { a: a.id, team: a.team, player: a.name }); deadBall('downed'); return;
  }
  if (B.kickLand && P.kind === 'punt' && a.team === S.poss) { giveBall(a, 'recover'); deadBall('downed'); return; }
  giveBall(a, 'recover');
  if (B.kickLand && a.team !== S.poss) { a.act = null; return; }   // the returner picks it up
  emit('recover', { a: a.id, team: a.team, player: a.name, team_name: S.teams[a.team].short, lost: was !== a.team });
  if (S.inOwnEndzone(a.b.x, a.team) && was !== a.team) { /* will be a touchback or safety at the dead ball */ }
  // a recovery on the ground is down by contact if he dove on it
  if (a.act && a.act.lunge) { a.down = .6; deadBall('recovered'); }
}
function recoverNearest() { let best = null, bd = 1e9; for (const a of S.athletes) { const d = hyp(a.b.x - S.ball.x, a.b.y - S.ball.y); if (d < bd) { bd = d; best = a; } } if (best) { const B = S.ball; B.kickLand = false; giveBall(best, 'recover'); deadBall('downed'); } }
function startPile(crowd) {
  const B = S.ball; B.pile = { t: 0, who: crowd.map(a => ({ a, d: hyp(a.b.x - B.x, a.b.y - B.y) })) };
  for (const a of crowd) { a.down = 1.8; a.act = { id: 'pile', t: 0, dur: 1.8 }; a.b.vx = (B.x - a.b.x) * 2; a.b.vy = (B.y - a.b.y) * 2; }
  B.body.vx = B.body.vy = 0;
  emit('pile', { x: B.x, y: B.y, n: crowd.length });
}
function pileStep(dt) {
  const B = S.ball, P = B.pile; P.t += dt;
  for (const w of P.who) { w.a.b.x += (B.x - w.a.b.x) * Math.min(1, dt * 4) * .5; w.a.b.y += (B.y - w.a.b.y) * Math.min(1, dt * 4) * .5; }
  if (P.t < 1.6) return;
  let tot = 0; const ws = P.who.map(w => { const v = (1 / (1 + w.d / 8)) * (1 + w.a.r.STR * .08); tot += v; return v; });
  let pick = r() * tot, win = P.who[0].a;
  for (let i = 0; i < ws.length; i++) { pick -= ws[i]; if (pick <= 0) { win = P.who[i].a; break; } }
  const was = B.team; B.pile = null; giveBall(win, 'recover');
  emit('recover', { a: win.id, team: win.team, player: win.name, team_name: S.teams[win.team].short, pile: true, lost: was !== win.team });
  deadBall('pile');
}

/* ---------------- CATCHES ---------------- */
function resolveCatch() {
  const B = S.ball, cand = [];
  for (const a of S.athletes) {
    if (a === B.thrower && B.deflected === 0) continue;
    if (a.team === B.team && (a.pos === 'OL') ) continue;   // linemen are not eligible receivers
    if (a.down > 0 && !(a.act && a.act.id === 'diveCatch')) continue;
    const act = a.act, jumping = act && act.id === 'jump' && act.t > .08 && act.t < .45, diving = act && act.id === 'diveCatch';
    const rad = T.catchRadius + (jumping ? 6 : 0) + (diving && B.z < 14 ? 10 : 0) + (a.ctl >= 0 && a.team === B.team ? 3 : 0);
    const reach = 34 + (jumping ? 16 : 0) + a.b.z;
    const d = hyp(a.b.x - B.x, a.b.y - B.y);
    if (d <= rad && B.z <= reach && B.z >= a.b.z - 4) cand.push({ a, d, jumping, diving });
  }
  if (!cand.length) return;
  B.resolved = true;
  cand.sort((p, q) => p.d - q.d);
  const offense = B.team;
  const defs = cand.filter(c => c.a.team !== offense), offs = cand.filter(c => c.a.team === offense);
  // defenders roll first: an interception, else a deflection
  for (const c of defs) {
    if (B.noInt || S.cheats.godMode && S.cheatSide(offense) && !S.cheats.forceINT) { if (B.golden && r() < .15) return deflect(c.a); continue; }
    const front = offs[0] ? dist(c.a.b, { x: B.tx, y: B.ty }) < dist(offs[0].a.b, { x: B.tx, y: B.ty }) : true;
    let pi = T.intBase + .022 * c.a.r.HND + (c.jumping ? .10 : 0) + (front ? .06 : 0) - (c.d > 10 ? .05 : 0);
    pi = FF.bus.mod('int.p', pi, { a: c.a, team: c.a.team });
    if (S.cheats.forceINT || (S.cheats.alwaysINT && S.cheatSide(c.a.team))) pi = 1;
    if (S.cheats.forceCatch && S.cheatSide(offense)) pi = 0;
    if (r() < pi) return intercept(c.a);
    if (!(S.cheats.forceCatch && S.cheatSide(offense)) && r() < T.deflectChance * (offs.length ? 1 : .6)) return deflect(c.a);
  }
  if (!offs.length) { B.resolved = false; return; }
  const c = offs[0], a = c.a;
  const contested = S.athletes.filter(o => o.team !== offense && hyp(o.b.x - B.x, o.b.y - B.y) < 14).length;
  let pc = T.catchBase + .03 * a.r.HND - T.contestPenalty * contested - (B.passType === 'bullet' ? .10 : 0) + (c.jumping ? .08 : 0);
  if (a.ctl >= 0) pc += .06;
  if (a.hot > 0) pc += .1;
  pc = FF.bus.mod('catch.p', pc, { a, team: a.team });
  if (FF.bus.mod('drop.no', 0, { a, team: a.team }) > 0) pc = Math.max(pc, .98);
  if (S.cheats.forceCatch && S.cheatSide(offense) || S.cheats.alwaysCatch && S.cheatSide(a.team)) pc = 1;
  if (B.target && B.target !== a) pc -= .08;
  if (r() < clamp(pc, .05, .99)) return caught(a);
  emit('drop', { a: a.id, player: a.name, team: a.team });
  incomplete(true);
}
function deflect(a) {
  const B = S.ball; B.deflected++; B.resolved = false;
  const an = r() * 6.283; B.vx = Math.cos(an) * (30 + r() * 50); B.vy = Math.sin(an) * (30 + r() * 50); B.vz = 90 + r() * 70; B.z = Math.max(B.z, 20);
  B.target = null; B.thrower = a;
  emit('deflect', { a: a.id, player: a.name });
}
function caught(a) {
  const B = S.ball, yards = Math.round((a.b.x - S.los) * S.dir[a.team] / Y);
  B.caughtAt = a.b.x; giveBall(a, 'catch');
  const qb = S.athletes.find(q => q.slot === 'QB' && q.team === a.team) || B.thrower;
  if (qb && qb.stats) qb.stats.comp++;
  S.stats.team[a.team].comp = (S.stats.team[a.team].comp || 0) + 1;
  a.stats.catches++;
  S.play.catchX = a.b.x; S.play.catcher = a; S.play.passer = qb;
  emit('catch', { receiver: a.id, a: a.id, player: a.name, yards, team: a.team });
}
function intercept(a) {
  const B = S.ball; giveBall(a, 'int'); a.stats.int++;
  S.stats.team[1 - a.team].to++;
  S.play.turnover = true;
  emit('int', { defender: a.id, a: a.id, player: a.name, team: a.team, qb: B.thrower && B.thrower.id });
}
function incomplete(drop) {
  const B = S.ball;
  if (S.play && S.play.kind === 'kickoff') return;
  B.state = 'dead'; B.bounce = { x: B.x, y: B.y, t: 0 };
  if (!drop) emit('incomplete', { team: B.team });
  else emit('incomplete', { team: B.team, drop: true });
  deadBall('incomplete');
}

/* ---------------- TACKLES ---------------- */
function contacts(dt) {
  const c = S.carrier(), B = S.ball, P = S.play;
  if (!c) return;
  if (c.down > 0) return;
  const gang = [];
  for (const d of S.athletes) {
    if (d.team === c.team || d.down > 0) continue;
    const reach = c.b.r + d.b.r + (d.act && d.act.lunge ? 6 : 4) + (d.eng ? -1 : 0);
    const dd = dist(d.b, c.b);
    if (dd > reach || Math.abs(d.b.z - c.b.z) > 26) continue;
    if (d.tryT > 0) continue;
    if (S.cheats.noTackle && S.cheatSide(c.team) || S.cheats.godMode && S.cheatSide(c.team) && !(S.cheats.forceFumble)) { d.tryT = .4; if (d.act && d.act.lunge) { d.act.hit = true; d.act.lunge = false; d.down = .6; } continue; }
    if (S.cheats.noCpuTackle && !S.isHuman(d.team)) { d.tryT = .4; continue; }
    gang.push({ d, dd });
  }
  if (!gang.length) return;
  for (const { d } of gang) { d.tryT = .45; if (d.eng) { d.armTackle = true; release(d.eng); } if (tackle(d, c, gang.length) || S.phase !== 'LIVE' || S.carrier() !== c) return; }
  void dt; void B; void P;
}
function tackle(d, c, n) {
  const act = d.act, big = act && act.id === 'bigHit' && act.lunge, lunge = act && act.lunge, P = S.play;
  const hitAng = Math.atan2(c.b.y - d.b.y, c.b.x - d.b.x), fromBehind = Math.abs(E.angDiff(hitAng, c.facing)) < 1.2;
  // evasions first: the spin's window (not from behind), a stiff arm in front, a hurdle over a low dive
  const ca = c.act;
  if (ca && ca.id === 'spin' && ca.t < T.spinWindow && !fromBehind) { evaded(d, c, 'spin'); return false; }
  if (ca && ca.id === 'hurdle' && c.b.z > 10 && lunge && !big) { evaded(d, c, 'hurdle'); return false; }
  if (FF.ots && FF.ots.special && FF.ots.special.evade && FF.ots.special.evade(d, c, big)) return false;
  const front = Math.abs(E.angDiff(hitAng + Math.PI, c.facing)) < 1.05;
  let p = T.tackleBase + .03 * d.r.TCK - .015 * c.r.STR - .012 * c.r.ACC + (fromBehind ? .15 : 0) + (big ? T.bigHitBonus : 0) + ((ca && (ca.id === 'dive' || ca.id === 'hurdle')) ? .25 : 0) + (n > 1 ? T.gangBonus * (n - 1) : 0) - (d.armTackle ? .2 : 0);
  d.armTackle = false;
  if (ca && ca.id === 'stiffArm' && front && ca.t < .3) p -= T.stiffBonus;
  if (c.hot > 0) p -= .15;
  if (d.hot > 0) p += .15;
  if (!S.isHuman(d.team)) p *= S.diff().tackle;
  if (S.diff().rubber && S.isHuman(c.team) && S.score[1 - c.team] - S.score[c.team] >= 14) p -= .04;
  p = FF.bus.mod('tackle.p', p, { d, c, big });
  if (S.cheats.godMode && S.cheatSide(c.team)) p = 0;
  p = clamp(p, .15, .97);
  if (S.cheats.forceFumble) p = 1;
  if (r() >= p) {   // broken
    if (lunge) { act.hit = true; act.lunge = false; d.down = big ? 1.0 : .7; d.b.vx *= .3; d.b.vy *= .3; }
    else { d.slowT = .3; }
    c.slowT = .3;
    if (ca && ca.id === 'stiffArm' && front) { d.down = .6; d.b.vx = Math.cos(c.facing) * 60; d.b.vy = Math.sin(c.facing) * 60; }
    if (hyp(c.b.vx, c.b.vy) > S.topSpeed(c) * .6) emit('brokenTackle', { a: c.id, d: d.id, player: c.name });
    return false;
  }
  // a tackle: the carrier goes down where he is; a big hit launches him
  const mega = big && (S.megaNext === d.team || (d.hot > 0 && r() < 1 / 6));
  if (S.megaNext === d.team && !big) { /* a card's mega hit waits for a big hit or the first tackle */ }
  const megaAny = mega || (S.megaNext === d.team);
  if (S.megaNext === d.team) S.megaNext = -1;
  if (lunge) { act.hit = true; act.lunge = false; }
  d.down = .9; d.b.vx *= .2; d.b.vy *= .2;
  const yards = Math.round((c.b.x - P.startLos) * S.dir[P.startPoss] / Y);
  d.stats.tkl++;
  let launch = 0;
  if (big || megaAny) {
    const k = megaAny ? 1.6 : 1; launch = T.bigHitLaunch * k;
    c.b.vx = Math.cos(hitAng) * launch; c.b.vy = Math.sin(hitAng) * launch; c.b.vz = 150 * k; c.b.z = 1; c.fly = { t: 0, mega: megaAny, x0: c.b.x, y0: c.b.y };
    c.down = megaAny ? 1.8 : 1.4; d.stats.bigHits++; S.stats.team[d.team].bigHits++;
  } else { c.down = 1.1; c.b.vx = Math.cos(hitAng) * 40; c.b.vy = Math.sin(hitAng) * 40; }
  c.act = null; c.tackledFrom = fromBehind ? 'behind' : 'front';
  // the fumble roll at the moment of the hit
  let fp = T.fumbleBase * (big ? 3 : 1) * (megaAny ? 6 : 1) * (S.weatherKind ? 1.6 : 1) * (1 - c.r.HND * .05);
  if (megaAny) fp = Math.max(fp, .6);
  if (big && d.hot > 0) fp *= 2;
  fp = FF.bus.mod('fumble.p', fp, { d, c, big });
  if (S.cheats.forceFumble) { fp = 1; S.cheats.forceFumble = false; }
  if (S.cheats.godMode && S.cheatSide(c.team)) fp = 0;
  const sack = c.slot === 'QB' && P.sackable && !P.passThrown && (c.b.x - S.los) * S.dir[c.team] < 0 && c.team === P.startPoss && (P.kind === 'pass');
  const ev = { tackler: d.id, d: d.id, a: c.id, carrier: c.id, player: d.name, victim: c.name, bigHit: big, mega: megaAny, yards, x: c.b.x, y: c.b.y, z: c.b.z + 18, angle: hitAng, team: d.team, launch };
  if (big || megaAny) emit(megaAny ? 'megaHit' : 'bigHit', ev);
  if (r() < fp && P.kind !== 'kneel') {
    const an = hitAng + (r() - .5) * 1.2;
    loose(c.b.x, c.b.y, 16, Math.cos(an) * (60 + r() * 60), Math.sin(an) * (60 + r() * 60), 60 + r() * 50, 'fumble');
    c.stats.fum++; S.stats.team[d.team].fumblesForced++;
    emit('fumble', { carrier: c.id, a: c.id, forcer: d.id, player: c.name, team: c.team });
    return true;
  }
  if (sack) { d.stats.sack++; S.stats.team[d.team].sacks++; emit('sack', { defender: d.id, a: d.id, qb: c.id, player: d.name, team: d.team }); }
  emit('tackle', ev);
  S.ball.tackleX = c.b.x;
  deadBall('tackle', { x: c.b.x });
  return true;
}
S.tryTackle = (d, c) => tackle(d, c, 1);
function evaded(d, c, how) {
  if (d.act && d.act.lunge) { d.act.hit = true; d.act.lunge = false; d.down = .7; }
  d.tryT = .6;
  emit('evade', { a: c.id, d: d.id, how, player: c.name });
}
function tryStrip(a) {
  const c = S.carrier(); if (!c || c.team === a.team || dist(c.b, a.b) > 1.2 * Y) return;
  let p = T.stripChance - c.r.HND * .01; p = FF.bus.mod('fumble.p', p, { d: a, c, strip: true });
  if (S.cheats.godMode && S.cheatSide(c.team)) p = 0;
  if (r() < p) { loose(c.b.x, c.b.y, 14, Math.cos(a.facing) * 70, Math.sin(a.facing) * 70, 70, 'strip'); c.stats.fum++; emit('fumble', { carrier: c.id, a: c.id, forcer: a.id, player: c.name, team: c.team, strip: true }); }
}

/* ---------------- BLOCKING ---------------- */
function blocking(dt) {
  const P = S.play;
  for (const a of S.athletes) {
    if (a.eng) continue;
    if (!a.brain.blocking || a.down > 0) continue;
    // engage: a rusher within 1.5 yd that the blocker faces, or touching
    let best = null, bd = 1e9;
    for (const o of S.athletes) {
      if (o.team === a.team || o.eng || o.down > 0 || S.carrier() === o || o.slot === 'K') continue;
      const d = dist(o.b, a.b);
      if (d > 1.5 * Y) continue;
      const facing = Math.abs(E.angDiff(ang(a.b, o.b), a.facing)) < 1.4;
      if (d < a.b.r + o.b.r + 2 || facing) { if (d < bd) { bd = d; best = o; } }
    }
    if (best && (!a.brain.target || a.brain.target === best || bd < a.b.r + best.b.r + 3)) engage(a, best);
  }
  for (const a of S.athletes) {
    const e = a.eng; if (!e || e.blk !== a) continue;
    const blk = e.blk, rsh = e.rsh;
    e.t += dt;
    const cc = S.carrier(); if (cc && cc.team === blk.team && hyp(cc.b.x - rsh.b.x, cc.b.y - rsh.b.y) < 2.5 * Y) e.t += dt * 2;
    if (cc && cc.team === blk.team && cc.slot !== 'QB' && hyp(cc.b.x - rsh.b.x, cc.b.y - rsh.b.y) > 5 * Y && e.t > .5) { release(e); rsh.burst = .3; continue; }   // the runner is gone: the block breaks off   // a runner going by: the rusher fights off the block
    if (blk.down > 0 || rsh.down > 0 || S.carrier() === blk || S.carrier() === rsh) { release(e); continue; }
    // the rusher's goal: the QB or the carrier
    const goal = S.carrier() || S.bySlot(S.poss, 'QB') || S.ball;
    const gx = goal.b ? goal.b.x : goal.x, gy = goal.b ? goal.b.y : goal.y;
    const ga = Math.atan2(gy - rsh.b.y, gx - rsh.b.x);
    let push = T.blockPush * (clamp(rsh.r.STR - blk.r.STR, -4, 4) + (rsh.intent.turbo ? 1 : 0) + (e.run ? -2.5 : .5) + (rsh.snowplow > 0 ? 12 : 0));
    const dirA = push >= 0 ? ga : (e.drive !== undefined ? e.drive : ga + Math.PI);
    const sp = Math.abs(push);
    const cx = (blk.b.x + rsh.b.x) / 2 + Math.cos(dirA) * sp * dt, cy = (blk.b.y + rsh.b.y) / 2 + Math.sin(dirA) * sp * dt;
    // the pair: 0.8 yd apart, facing each other, the blocker between the rusher and his goal; drift laterally with the rusher's intent
    const side = (rsh.intent.mx * -Math.sin(ga) + rsh.intent.my * Math.cos(ga)) * 20 * dt;
    const hx = Math.cos(ga) * .4 * Y, hy = Math.sin(ga) * .4 * Y;   // the blocker sits between the rusher and his goal
    blk.b.x = cx + hx; blk.b.y = cy + hy; rsh.b.x = cx - hx - Math.sin(ga) * side; rsh.b.y = cy - hy + Math.cos(ga) * side;
    rsh.b.vx = blk.b.vx = Math.cos(dirA) * sp; rsh.b.vy = blk.b.vy = Math.sin(dirA) * sp;
    blk.facing = Math.atan2(rsh.b.y - blk.b.y, rsh.b.x - blk.b.x); rsh.facing = blk.facing + Math.PI;
    // the shed: the rusher's timer (shortened by mashing the swim button)
    if (rsh.swim) { e.shed -= .12 * Math.min(rsh.swim, 6); rsh.swim = 0; }
    const hold = FF.bus.mod('shed.t', 0, { blockerTeam: blk.team, t: e.t });
    if (e.t > e.shed + hold) { release(e); rsh.burst = .3; blk.slowT = .3; rsh.shedAt = S.time; emit('shed', { a: rsh.id, b: blk.id }); }
    else if (e.pancake === undefined) {
      e.pancake = blk.r.STR - rsh.r.STR >= 3 && r() < .15;
      if (e.pancake) { release(e); rsh.down = 1.2; emit('pancake', { a: blk.id, d: rsh.id, player: blk.name }); }
    }
  }
  void P;
}
function engage(blk, rsh) {
  const e = { blk, rsh, t: 0, shed: T.shedBase * (blk.r.STR / Math.max(1, rsh.r.STR)) * (.7 + r() * .6) * (blk.pos === 'WR' || blk.pos === 'RB' ? .45 : 1), run: blk.brain.run, drive: blk.brain.drive };
  if (rsh.snowplow > 0) e.shed = .4;
  blk.eng = e; rsh.eng = e; blk.pose = 'BLOCK'; rsh.pose = 'BLOCK';
}
function release(e) { if (e.blk.eng === e) e.blk.eng = null; if (e.rsh.eng === e) e.rsh.eng = null; e.blk.engCool = .4; }
S.release = release;

/* ---------------- COLLISIONS ---------------- */
function collide() {
  const L = S.athletes, n = L.length;
  for (let i = 0; i < n; i++) {
    const a = L[i]; if (a.b.z > 12) continue;
    for (let j = i + 1; j < n; j++) {
      const b = L[j]; if (b.b.z > 12) continue;
      if (a.eng && a.eng === b.eng) continue;
      const dx = b.b.x - a.b.x, dy = b.b.y - a.b.y, d = hyp(dx, dy), min = a.b.r + b.b.r;
      if (d >= min || d < 1e-6) continue;
      if (a.down > 0 && b.down > 0) continue;
      const cr = S.ball && S.ball.holder, soft = a.team === b.team ? (a === cr || b === cr ? .08 : .35) : 1, ov = (min - d) * soft, nx = dx / d, ny = dy / d;
      const ma = a.down > 0 ? 50 : a.mass, mb = b.down > 0 ? 50 : b.mass, ka = mb / (ma + mb), kb = ma / (ma + mb);
      a.b.x -= nx * ov * ka; a.b.y -= ny * ov * ka; b.b.x += nx * ov * kb; b.b.y += ny * ov * kb;
    }
  }
}

/* ---------------- THE MASCOT (Mascot Mayhem: a 12th player for one play) ---------------- */
function mascotStep(dt) {
  const m = S.mascot; if (!m || m.done) return;
  m.t += dt;
  const off = m.team === S.poss, qb = S.bySlot(S.poss, 'QB'), c = S.carrier();
  let tx, ty;
  if (off) { const d = S.athletes.filter(a => a.team !== m.team && a.down <= 0).sort((p, q) => dist(p.b, c ? c.b : m) - dist(q.b, c ? c.b : m))[0]; if (d) { tx = d.b.x; ty = d.b.y; } }
  else { const t = c || qb; if (t) { tx = t.b.x; ty = t.b.y; } }
  if (tx === undefined) return;
  const a0 = Math.atan2(ty - m.y, tx - m.x), sp = 170;
  m.vx = Math.cos(a0) * sp; m.vy = Math.sin(a0) * sp; m.x += m.vx * dt; m.y += m.vy * dt;
  if (hyp(tx - m.x, ty - m.y) < 12 && m.t > .4) {
    const vic = S.athletes.find(a => hyp(a.b.x - tx, a.b.y - ty) < 2 && a.down <= 0);
    if (vic) {
      if (!off && S.carrier() === vic) { vic.down = 1.1; vic.b.vz = 120; vic.b.z = 1; emit('mascotHit', { team: m.team, a: vic.id, sack: vic.slot === 'QB' }); if (vic.slot === 'QB' && !S.play.passThrown) { S.stats.team[m.team].sacks++; emit('sack', { defender: -1, qb: vic.id, player: S.teams[m.team].mascot.name, team: m.team }); } deadBall('tackle', { x: vic.b.x }); m.done = true; }
      else if (off) { vic.down = 1.2; m.hits = (m.hits || 0) + 1; emit('mascotHit', { team: m.team, a: vic.id }); if (m.hits >= 2) m.done = true; }
    }
  }
}

/* ---------------- BOUNDS, SCORES ---------------- */
function bounds() {
  const c = S.carrier(); if (!c) { // a loose ball out of bounds belongs to who had it last
    const B = S.ball;
    if (B.state === 'loose' && (B.y < SIDE_T || B.y > SIDE_B || B.x < END_L || B.x > END_R)) {
      if (B.kickLand) return kickOut();
      const last = B.last || S.athletes.find(a => a.team === B.team);
      if (last) { B.state = 'held'; B.holder = last; B.team = last.team; }
      deadBall('oob', { x: clamp(B.x, END_L, END_R) });
    }
    return;
  }
  const B = S.ball, t = c.team;
  if (S.inEndzone(c.b.x, t)) return touchdown(c);
  if (c.b.y < SIDE_T || c.b.y > SIDE_B || c.b.x < END_L || c.b.x > END_R) { emit('outOfBounds', { a: c.id }); deadBall('oob', { x: clamp(c.b.x, END_L, END_R) }); }
  // touchback: a returner who kneels (b1) in his own end zone, or stays 1.5 s there after a kick
  const P = S.play;
  if ((P.kind === 'kickoff' || P.kind === 'punt') && t !== P.startPoss && S.inOwnEndzone(c.b.x, t) && S.inOwnEndzone(B.possX, t)) {
    c.ezT = (c.ezT || 0) + 1 / 120;
    if ((c.intent.press & BIT.b1) || c.ezT > 1.5 || (!S.isHuman(t) && c.ezT > .3 && c.brain.kneel)) touchback(t);
  } else c.ezT = 0;
}
function kickOut() {
  const P = S.play, rt = 1 - P.startPoss;
  emit('kickOut', {});
  S.ball.state = 'dead';
  if (P.kind === 'kickoff') return endPlay({ type: 'newPoss', team: rt, yd: 40 });
  return endPlay({ type: 'newPoss', team: rt, x: clamp(S.ball.x, GOAL_L + Y, GOAL_R - Y) });
}
function touchback(t) { emit('touchback', { team: t }); S.ball.state = 'dead'; endPlay({ type: 'newPoss', team: t, yd: S.play.kind === 'kickoff' ? 25 : 20 }); }
function touchdown(c) {
  const t = c.team, P = S.play;
  if (P.conversion) { S.score[t] += 2; emit('twoGood', { team: t }); S.ball.state = 'dead'; return endPlay({ type: 'conversion', team: t }); }
  S.score[t] += 6; c.stats.td++; S.stats.team[t].tds++;
  const yards = Math.round((c.b.x - P.startLos) * S.dir[P.startPoss] / Y);
  const how = P.turnover || t !== P.startPoss ? 'return' : S.play.catcher === c ? 'catch' : 'run';
  S.ball.state = 'dead'; S.ball.holder = c;
  emit('td', { scorer: c.id, a: c.id, player: c.name, team: t, how, yards: Math.abs(yards), score: S.score.slice() });
  if (S.ot) { S.winner = t; }
  endPlay({ type: 'td', team: t, scorer: c });
}
S.touchdown = touchdown;

/** the ball is dead: refs signal, late hits are allowed for a moment, then the spot and downs update */
function deadBall(why, o = {}) {
  if (S.phase !== 'LIVE') return;
  const B = S.ball, P = S.play, c = S.carrier();
  let x = o.x !== undefined ? o.x : c ? c.b.x : B.x;
  if (FF.kick) FF.kick.cancel();
  if (why === 'incomplete' || why === 'stuck') return endPlay({ type: 'incomplete' });
  const t = c ? c.team : B.team;
  // a carrier downed in his own end zone: a touchback after a kick or an interception there, else a safety
  if (c && S.inOwnEndzone(x, t)) {
    if (t !== P.startPoss && (S.inOwnEndzone(B.possX, t))) return touchback(t);
    if (P.conversion) return endPlay({ type: 'conversion', team: -1 });
    S.score[1 - t] += 2; emit('safety', { team: 1 - t, a: c.id }); S.stats.team[1 - t].safeties = 1;
    return endPlay({ type: 'safety', team: 1 - t, against: t });
  }
  if (c && S.inEndzone(x, t)) return touchdown(c);
  B.state = 'dead';
  endPlay({ type: why === 'oob' ? 'oob' : 'down', team: t, x });
}
S.deadBall = deadBall;

function endPlay(res) {
  const P = S.play; P.result = res;
  const deadT = res.type === 'td' ? .5 : 1.4;
  if (S.phase === 'LIVE') toPhase('DEAD', deadT);
  else S.phaseT = deadT;
  S.lateWindow = T.lateHitWindow;
  FF.bus.endPlay();
  P.endT = S.time;
  const c = S.carrier();
  // yards for stats
  if (res.x !== undefined && P.kind !== 'kickoff' && P.kind !== 'punt' && P.kind !== 'fg' && res.team === P.startPoss) {
    const yd = Math.round((res.x - P.startLos) * S.dir[P.startPoss] / Y);
    P.yards = yd;
    const st = S.stats.team[P.startPoss]; st.yards += yd; st.plays++;
    if (P.catcher) { st.pass += yd; P.catcher.stats.rec += yd; if (P.passer) P.passer.stats.pass += yd; }
    else if (c) { st.rush += yd; c.stats.rush += yd; c.stats.carries++; }
    if (!S.stats.longest || yd > S.stats.longest.yards) S.stats.longest = { yards: yd, name: (P.catcher || c || {}).name, team: P.startPoss };
  }
  if (res.type === 'td' && res.scorer) { const yd = Math.round((res.scorer.b.x - P.startLos) * S.dir[P.startPoss] / Y); if (res.team === P.startPoss) { const st = S.stats.team[res.team]; st.yards += yd; if (P.catcher) { st.pass += yd; } else st.rush += yd; if (!S.stats.longest || yd > S.stats.longest.yards) S.stats.longest = { yards: yd, name: res.scorer.name, team: res.team }; } }
  emit('dead', { res, play: P });
}
S.endPlay = endPlay;

function deadStep(dt) {
  moveAll(dt, true);
  if (FF.ots) FF.ots.update(dt);
  S.lateWindow -= dt;
  if (S.lateWindow > 0 && FF.ots) FF.ots.lateHits();
  if ((S.phaseT -= dt) > 0) return;
  resolvePlay();
}
/** downs, distance, possession and what comes next */
function resolvePlay() {
  const P = S.play, res = P.result, B = S.ball;
  const prevPoss = P.startPoss;
  const runoff = (res.type === 'down') && !(S.clock < 30 && (S.quarter === 2 || S.quarter === 4));
  for (const a of S.all) { a.turbo = Math.min(1, a.turbo + T.turboDeadRefill); }
  if (FF.ots) FF.ots.afterPlay(P, res);
  if (res.type === 'td') { S.mode = 'pat'; S.patTeam = res.team; S.scorer = res.scorer; if (FF.ots && res.scorer) FF.ots.dance(res.scorer); toPhase('CELEBRATE', 3.5); return; }
  if (res.type === 'conversion' || (P.conversion && res.type !== 'fg')) { if (P.conversion && res.type !== 'conversion' && res.type !== 'fg') emit('twoFail', {}); return afterScore(S.patTeam); }
  if (res.type === 'fg') {
    if (P.conversion) return afterScore(S.patTeam);
    if (res.good) return afterScore(prevPoss);
    // a miss: the other side takes over at the spot of the kick (or its 20)
    const x = S.yardline(P.startLos, prevPoss) > 80 ? S.xAt(20, 1 - prevPoss) : P.startLos - S.dir[prevPoss] * 7 * Y;
    return newPossession(1 - prevPoss, x);
  }
  if (res.type === 'safety') { S.safetyKick = true; return checkClock(() => setupKickoff(res.against)); }
  if (res.type === 'newPoss') return checkClock(() => newPossession(res.team, res.yd !== undefined ? S.xAt(res.yd, res.team) : res.x));
  let t = res.type === 'incomplete' ? prevPoss : (res.team !== undefined ? res.team : B.team);
  if (P.kind === 'kickoff' || P.kind === 'punt') {
    // a return: the receiving team's ball where it died (a kicking team recovery keeps it)
    return checkClock(() => newPossession(t, res.x !== undefined ? res.x : B.x));
  }
  if (t !== prevPoss) { S.stats.team[prevPoss].to += P.turnover ? 0 : 1; return checkClock(() => newPossession(t, res.x)); }
  // the same side: downs and distance
  let spot = res.type === 'incomplete' ? P.startLos : res.x;
  if (P.kind === 'kneel') spot = P.startLos - S.dir[prevPoss] * Y;
  const gained = (spot - P.startLos) * S.dir[prevPoss] / Y;
  S.los = clamp(spot, GOAL_L + Y * .5, GOAL_R - Y * .5); S.spotY = clamp(B.y || MID_Y, MID_Y - FF.FIELD.HASH, MID_Y + FF.FIELD.HASH);
  if (gained >= S.toGo - 1e-6) { S.down = 1; S.toGo = Math.min(T.yardsToGo, Math.round(100 - S.yardline(S.los, prevPoss))); emit('firstDown', { team: prevPoss }); }
  else {
    S.down++; S.toGo = Math.round((S.toGo - gained) * 10) / 10;
    if (S.down > 4) { emit('turnoverOnDowns', { team: prevPoss }); S.stats.team[prevPoss].to++; return checkClock(() => newPossession(1 - prevPoss, S.los)); }
  }
  S.toGo = Math.max(1, Math.round(S.toGo));
  if (runoff && !S.cheats.freezeClock) S.clock = Math.max(0, S.clock - T.runoff);
  checkClock(() => { S.mode = 'normal'; nextSnap(); });
}
function nextSnap() { if (S.afterPlayHook) S.afterPlayHook(); setUnits('off', 'def'); S.calls = [null, null]; S.playNo++; toPhase('PLAYCALL'); emit('downs', { down: S.down, toGo: S.toGo, team: S.poss }); }
function newPossession(t, x) {
  S.poss = t; S.mode = 'normal';
  S.los = clamp(x, GOAL_L + Y, GOAL_R - Y); S.spotY = clamp(S.ball.y || MID_Y, MID_Y - FF.FIELD.HASH, MID_Y + FF.FIELD.HASH);
  S.down = 1; S.toGo = Math.min(T.yardsToGo, Math.round(100 - S.yardline(S.los, t)));
  S.stats.drives++;
  emit('possession', { team: t });
  nextSnap();
}
S.newPossession = newPossession;
function afterCelebrate() {
  if (S.ot && S.winner >= 0) return final();
  S.mode = 'pat'; S.poss = S.patTeam; S.down = 1; S.toGo = 3;
  S.los = S.xAt(97, S.poss); S.spotY = MID_Y;
  setUnits('off', 'def'); S.calls = [null, null]; toPhase('PLAYCALL');
}
S.afterCelebrate = afterCelebrate;
function afterScore(scorer) {
  if (S.ot) { S.winner = scorer; return final(); }
  checkClock(() => setupKickoff(scorer));
}
/** the clock at zero ends the quarter (the play has been played out) */
function checkClock(next) {
  if (S.ot && S.winner >= 0) return final();
  if (S.clock > 0) return next();
  S.pendingNext = next;
  if (S.quarter === 2 && !S.hubHalf) return halftime();
  if (S.quarter >= 4 || (S.hubHalf && S.quarter >= 2)) {
    if (S.score[0] === S.score[1] && !S.ot && !S.hubHalf && !S.noOT) return overtime();
    return final();
  }
  emit('quarterEnd', { q: S.quarter }); toPhase('QUARTER', 1.6);
}
S.checkClock = checkClock;
function nextQuarterGo() { S.quarter++; S.clock = S.qLen; const n = S.pendingNext; S.pendingNext = null; emit('quarterStart', { q: S.quarter }); n && n(); }
function halftime() { emit('halftime', { score: S.score.slice() }); S.halftimeHold = !!S.halftimeHook; toPhase('HALFTIME', 3); if (S.halftimeHook) S.halftimeHook(); }
S.secondHalf = secondHalf;
function secondHalf() {
  S.halftimeHold = false; S.quarter = 3; S.clock = S.qLen; S.dir = [-1, 1]; S.pendingNext = null;
  emit('quarterStart', { q: 3 }); setupKickoff(1 - S.halfKick);
}
function overtime() {
  S.ot = true; S.quarter = 5; S.clock = S.qLen; S.pendingNext = null;
  emit('overtime', {}); S.dir = r() < .5 ? [1, -1] : [-1, 1];
  toPhase('COIN', 1.6); S.halfKick = r() < .5 ? 0 : 1;
}
function final() {
  if (S.over) return;
  S.over = true; S.winner = S.score[0] > S.score[1] ? 0 : S.score[1] > S.score[0] ? 1 : -1;
  toPhase('FINAL'); emit('final', { winner: S.winner, score: S.score.slice() });
  for (const a of S.athletes) { a.pose = a.team === S.winner ? 'CHEER' : 'DEJECTED'; }
}
S.final = final;
S.finishNow = winner => { if (winner === 0 || winner === 1) { if (S.score[winner] <= S.score[1 - winner]) S.score[winner] = S.score[1 - winner] + 7; } toPhase('LIVE'); final(); };

/* ---------------- POSES (codes the presentation turns into animation) ---------------- */
function updatePose(a) {
  const act = a.act, B = S.ball;
  a.poseU = act ? clamp(act.t / act.dur, 0, 1) : 0;
  if (a.fly) { a.fly.t += 1 / 120; if (a.b.z <= 0 && a.fly.t > .2) { const d = hyp(a.b.x - a.fly.x0, a.b.y - a.fly.y0) / Y; S.recordHit && S.recordHit(a, d, a.fly.mega); a.fly = null; } }
  if (a.fly) { a.pose = 'FLY'; return; }
  if (B && B.pile && act && act.id === 'pile') { a.pose = 'PILE'; return; }
  if (a.down > 0) { a.pose = a.tackledFrom ? 'TACKLED' : 'DOWN'; return; }
  if (S.phase === 'FINAL') { a.pose = a.team === S.winner ? 'CHEER' : S.winner < 0 ? 'IDLE' : 'DEJECTED'; return; }
  if (S.phase === 'CELEBRATE' && !(act && act.id === 'celebrate')) { a.pose = a.team === S.patTeam ? (S.scorer && hyp(a.b.x - S.scorer.b.x, a.b.y - S.scorer.b.y) < 8 * Y ? 'CHEER' : 'IDLE') : 'DEJECTED'; return; }
  if (act) {
    const map = { throw: 'THROW', dive: 'DIVE', tackleDive: 'TACKLE_DIVE', bigHit: 'BIGHIT', spin: 'SPIN', stiffArm: 'STIFFARM', hurdle: 'HURDLE', jump: 'JUMP', diveCatch: 'DIVE_CATCH', strip: 'STRIP', lateral: 'LATERAL', handoff: 'HANDOFF_GIVE', handoffTake: 'HANDOFF_TAKE', snap: 'SNAP', kick: 'KICK', getUp: 'GETUP', celebrate: 'CELEBRATE', lateHit: 'BIGHIT', hold: 'HOLD', seismic: 'SEISMIC', mudslide: 'MUDSLIDE' };
    a.pose = map[act.id] || 'IDLE'; return;
  }
  a.tackledFrom = null;
  if (a.eng) { a.pose = 'BLOCK'; return; }
  if (S.phase === 'PRESNAP' && S.presnap && S.presnap.t > 1.2) return;
  if (S.carrier() === a) { a.pose = 'CARRY'; return; }
  if (B && B.state === 'pass' && !B.forced && a.team === B.team && B.target === a) { a.pose = 'CATCH_READY'; return; }
  a.pose = hyp(a.b.vx, a.b.vy) > 12 ? 'RUN' : 'IDLE';
}
S.updatePose = updatePose;

/* ---------------- STATE HASH (tests: determinism, replays never touch the sim) ---------------- */
S.hash = () => {
  let h = 2166136261; const mix = v => { h ^= (Math.round(v * 10) | 0); h = Math.imul(h, 16777619) >>> 0; };
  for (const a of S.athletes) { mix(a.b.x); mix(a.b.y); mix(a.b.z); mix(a.facing); }
  mix(S.ball.x); mix(S.ball.y); mix(S.ball.z); mix(S.score[0]); mix(S.score[1]); mix(S.clock); mix(S.down); mix(S.los);
  return h >>> 0;
};
})();
