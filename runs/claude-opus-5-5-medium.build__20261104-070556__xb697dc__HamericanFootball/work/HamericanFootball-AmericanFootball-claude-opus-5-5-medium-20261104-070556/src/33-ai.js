/* THE AI: athlete brains (a behavior picked from the play assignment and the phase, re-thought at about 20 Hz,
 * staggered, turned into an intent every step) and the CPU coach (play calling, cards, 4th down, conversions, COACH
 * SAYS). Defenders react to what changed after a delay from their awareness and the difficulty, so play fakes, cutbacks
 * and jukes work against them. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, T = FF.T, S = FF.sim, { clamp } = E, Y = 16, BIT = FF.BIT;
const hyp = Math.hypot, r = () => FF.r(), F = FF.FIELD;
const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
const NONE = () => ({ mx: 0, my: 0, turbo: false, press: 0, recv: -1 });

// what changed last (a new carrier, a pass in the air): defenders see it after their reaction time
let lastSig = '', changeT = 0;
function sig() { const B = S.ball; return B.state + ':' + (B.holder ? B.holder.id : '') + ':' + (B.target ? B.target.id : ''); }
const react = a => S.diff().react * T.reactionMult * (1.25 - a.r.AWR * .05) * (S.isHuman(a.team) ? .5 : 1);
const seen = a => S.time - changeT >= react(a);

function toward(it, a, x, y, slow = 8, sp = 1) {
  const dx = x - a.b.x, dy = y - a.b.y, d = hyp(dx, dy);
  if (d < 1) { it.mx = 0; it.my = 0; return d; }
  const k = Math.min(1, d / slow) * sp; it.mx = dx / d * k; it.my = dy / d * k; return d;
}
const fwd = a => S.dir[a.team];

FF.ai = {
  intent(a, dt) {
    const it = NONE();
    if (a.down > 0 || S.phase !== 'LIVE') return it;
    const s = sig(); if (s !== lastSig) { lastSig = s; changeT = S.time; }
    const br = a.brain, hz = Math.max(1, Math.round(120 / T.aiThinkHz));
    if (!br.init) initBrain(a);
    if ((S.step + a.id) % hz === 0 || br.beh === 'formation') think(a);
    run(a, it, dt);
    return it;
  },
  pursuitPoint, openness, think: a => think(a)
};

/** at the snap: the assignment's waypoints in world space */
function initBrain(a) {
  const br = a.brain, as = a.assign || {}, P = S.play, flip = a.team === S.poss ? (P.flip || 1) : 1;
  br.init = true; br.wp = null; br.i = 0; br.t0 = S.time;
  const pts = as.route || as.carry || as.keep || as.pull;
  if (pts) br.wp = pts.map(p => S.toWorld(p[0], p[1], flip));
  if (as.drop) br.drop = S.toWorld(as.drop[0], as.drop[1], flip);
  if (as.fake) br.fake = S.toWorld(as.fake[0], as.fake[1], flip);
  if (as.release) br.release = { t: as.release[0], at: S.toWorld(as.release[1][0], as.release[1][1], flip) };
  if (as.zone) br.zone = S.toWorld(as.zone.at[0], as.zone.at[1], 1);
  br.lane = (a.b.y - F.MID_Y);
}

function think(a) {
  const br = a.brain, B = S.ball, P = S.play, as = a.assign || {}, c = S.carrier(), off = a.team === S.poss;
  br.blocking = false; br.run = false;
  if (!br.init) initBrain(a);
  if (B.state === 'loose' && !B.pile) {
    const near = S.athletes.filter(o => o.down <= 0).sort((p, q) => hyp(p.b.x - B.x, p.b.y - B.y) - hyp(q.b.x - B.x, q.b.y - B.y));
    const rank = near.filter(o => o.team === a.team).indexOf(a);
    if (rank >= 0 && (rank < 3 || hyp(a.b.x - B.x, a.b.y - B.y) < T.pileRadius * Y)) { br.beh = 'recover'; return; }
  }
  if (c === a) {
    if (P.kind === 'kneel') { br.beh = 'kneel'; return; }
    const behind = (a.b.x - S.los) * fwd(a) < Y * .5;
    if ((a.slot === 'QB' || (a.slot === 'K' && P.kind === 'pass')) && a.team === P.startPoss && behind && !P.passThrown && P.kind === 'pass' && !P.scramble) { br.beh = 'qbPass'; return; }
    if ((a.slot === 'K' || a.slot === 'QB') && (P.kind === 'punt' || P.kind === 'fg') && a.team === P.startPoss && !P.kicked) { br.beh = 'kicker'; return; }
    if (a.slot === 'QB' && a.team === P.startPoss && P.kind === 'run' && as.handoff && !P.handed) { br.beh = 'handoff'; return; }
    br.beh = 'carry'; return;
  }
  // kicks in the air and kickoffs
  if (P.kind === 'kickoff' || ((P.kind === 'punt') && (B.state === 'kick' || P.kicked))) {
    if (a.team === P.startPoss) { br.beh = c && c.team !== a.team ? 'pursue' : 'cover'; return; }
    if (as.returner || (P.kind === 'punt' && a.role === 'S')) { br.beh = B.state === 'kick' ? 'field' : c ? 'lead' : 'field'; return; }
    br.beh = 'returnBlock'; br.blocking = true; return;
  }
  if (off) {
    if (B.state === 'pass' && !B.forced && B.target === a) { br.beh = 'catchBall'; return; }
    if (c && c.team === a.team) {
      if (as.lateralTo && P.catcher === a) { br.beh = 'route'; return; }
      if (as.lateralTo === undefined && a.assign && a.assign.route && P.kind === 'pass' && !P.passThrown && c.slot === 'QB') { br.beh = 'route'; return; }
      if (c.slot === 'QB' && P.kind === 'pass' && !P.passThrown && !P.scramble) { br.beh = assignedBeh(a); return; }
      if (c.slot === 'QB' && P.kind === 'run' && !P.handed && as.carry) { br.beh = 'mesh'; return; }
      if (as.pull && !br.pulled) { br.beh = 'pull'; return; }
      br.beh = 'lead'; br.blocking = true; br.run = true; return;
    }
    if (c && c.team !== a.team) { br.beh = 'pursue'; return; }
    if (B.state === 'pass' && !B.forced) { br.beh = a.assign && a.assign.route ? 'route' : 'passBlock'; br.blocking = !a.assign.route; return; }
    br.beh = assignedBeh(a); return;
  }
  // defense
  if (c && c.team !== a.team) {
    const past = (c.b.x - S.los) * fwd(c) > 0 || c.slot !== 'QB' || P.scramble || P.passThrown || P.kind === 'kickoff';
    const fool = P.offPlay && P.offPlay.fool && P.t < P.offPlay.fool;
    if (as.spy && c.slot === 'QB' && !past) { br.beh = 'spy'; return; }
    if ((past && seen(a) && !fool) || dist(c.b, a.b) < 3 * Y) { br.beh = 'pursue'; return; }
    if (as.rush) { br.beh = 'rush'; return; }
  }
  if (B.state === 'pass' && !B.forced && seen(a)) {
    const land = { x: B.tx, y: B.ty }, tleft = Math.max(0, B.T - B.t), reach = S.topSpeed(a) * (tleft + .2);
    if (dist(land, a.b) < reach + 3 * Y) { br.beh = 'ballhawk'; return; }
  }
  if (c && c.team === a.team) { br.beh = 'lead'; br.blocking = true; return; }   // an interception return: block for him
  if (as.rush) { br.beh = 'rush'; return; }
  if (as.man) { br.beh = 'man'; return; }
  if (as.spy) { br.beh = 'spy'; return; }
  if (as.returnBlock) { br.beh = 'hold'; return; }
  br.beh = 'zone';
}
function assignedBeh(a) {
  const as = a.assign || {}, P = S.play, br = a.brain;
  if (as.block === 'pass' || as.cover) {
    if (as.cover && (P.kicked || S.ball.state === 'kick')) return 'cover';
    if (as.release && P.t > as.release[0]) return 'screenLead';
    br.blocking = true; return 'passBlock';
  }
  if (as.block === 'run') { br.blocking = true; br.run = true; return 'runBlock'; }
  if (as.route) return 'route';
  if (as.pull) return 'pull';
  if (as.carry) return 'mesh';
  if (as.hold) return 'holder';
  if (as.fg || as.punt) return 'kicker';
  br.blocking = true; return 'passBlock';
}

/* ---------------- BEHAVIORS → INTENTS ---------------- */
function run(a, it, dt) {
  const br = a.brain, B = S.ball, P = S.play, c = S.carrier(), d0 = fwd(a);
  switch (br.beh) {
    case 'recover': {
      const d = toward(it, a, B.x, B.y, 2); it.turbo = true;
      if (d < 1.4 * Y && B.z < 12 && !a.act) it.press |= BIT.b1;
      break; }
    case 'kneel': if (P.t > .25) { a.down = .8; a.act = null; S.deadBall('down'); } break;
    case 'handoff': { const tgt = br.fake || [a.b.x - d0 * 3 * Y, a.b.y]; toward(it, a, tgt[0], tgt[1], 10, .7); break; }
    case 'mesh': {
      const wp = br.wp, as = a.assign; if (!wp) break;
      if (as.wait && P.t < as.wait) { it.mx = it.my = 0; break; }
      toward(it, a, wp[0][0], wp[0][1], 6, .85); break; }
    case 'qbPass': qbPass(a, it); break;
    case 'carry': carry(a, it); break;
    case 'kicker': { it.mx = it.my = 0; break; }
    case 'holder': { it.mx = it.my = 0; break; }
    case 'route': route(a, it); break;
    case 'catchBall': {
      toward(it, a, B.tx, B.ty, 4); it.turbo = hyp(B.tx - a.b.x, B.ty - a.b.y) > 2 * Y;
      const tl = B.T - B.t, contest = S.athletes.some(o => o.team !== a.team && dist(o.b, a.b) < 2 * Y);
      if (tl < .32 && tl > .18 && contest && !a.act) it.press |= BIT.b4;
      break; }
    case 'passBlock': passBlock(a, it); break;
    case 'runBlock': runBlock(a, it); break;
    case 'pull': {
      const wp = br.wp; if (!wp) { br.beh = 'lead'; break; }
      if (br.i < wp.length && toward(it, a, wp[br.i][0], wp[br.i][1], 4) < 1.2 * Y) br.i++;
      if (br.i >= wp.length) { br.pulled = true; br.beh = 'lead'; }
      it.turbo = true; break; }
    case 'screenLead': { const at = br.release.at; if (toward(it, a, at[0], at[1], 6) < Y) { br.beh = 'lead'; } br.blocking = false; break; }
    case 'lead': lead(a, it); break;
    case 'rush': rush(a, it); break;
    case 'man': man(a, it); break;
    case 'zone': zone(a, it); break;
    case 'spy': { const q = S.bySlot(S.poss, 'QB') || c; if (q) toward(it, a, q.b.x + fwd(q) * 5 * Y, q.b.y, 10); break; }
    case 'ballhawk': {
      toward(it, a, B.tx, B.ty, 3); it.turbo = true;
      const tl = B.T - B.t; if (tl < .3 && tl > .15 && dist({ x: B.tx, y: B.ty }, a.b) < 2.2 * Y && !a.act) it.press |= BIT.b4;
      break; }
    case 'pursue': pursue(a, it); break;
    case 'cover': {   // kick coverage: run the lane downfield, then pursue the returner
      const lane = clamp(br.lane, -22 * Y, 22 * Y), tx = B.state === 'kick' ? B.tx : B.x;
      toward(it, a, tx - d0 * 3 * Y, F.MID_Y + lane * .6, 8); it.turbo = true;
      if (c && c.team !== a.team) br.beh = 'pursue';
      break; }
    case 'field': {   // the returner: under the ball
      if (B.state === 'kick') { toward(it, a, B.tx, B.ty, 2); it.turbo = hyp(B.tx - a.b.x, B.ty - a.b.y) > 4 * Y; }
      else if (B.state === 'loose') toward(it, a, B.x, B.y, 2);
      break; }
    case 'returnBlock': {
      const ret = S.athletes.find(o => o.team === a.team && (o.assign && o.assign.returner || (P.kind === 'punt' && o.role === 'S'))) || c;
      const cov = S.athletes.filter(o => o.team !== a.team && o.down <= 0 && !o.eng).sort((p, q) => dist(p.b, a.b) - dist(q.b, a.b))[0];
      if (cov && (B.state !== 'kick' || dist(cov.b, a.b) < 6 * Y)) { toward(it, a, cov.b.x, cov.b.y, 4); br.blocking = true; }
      else if (ret) toward(it, a, ret.b.x - S.dir[a.team] * -8 * Y, ret.b.y + (a.b.y > ret.b.y ? 3 : -3) * Y, 10, .7);
      break; }
    case 'hold': it.mx = it.my = 0; break;
    default: it.mx = it.my = 0;
  }
  void dt;
}

function qbPass(a, it) {
  const br = a.brain, P = S.play, as = a.assign || {}, t = P.t;
  const drop = br.drop || [a.b.x - fwd(a) * 5 * Y, a.b.y];
  const dd = toward(it, a, drop[0], drop[1], 6, .9);
  if (P.fleaBack && !br.fleaT) br.fleaT = t;
  const readT = (as.readT || .8) * (P.passThrown ? 99 : 1), openNeed = (S.diff().open + (a.p.special === 'nightvision' ? -1 : 0)) * (S.isHuman(a.team) ? .8 : 1);
  if (as.flea && !P.fleaBack) return;
  if (t < readT && !(br.fleaT && t > br.fleaT + .4)) return;
  const recvs = S.receivers(a.team), reads = (as.reads || ['WR1', 'WR2', 'RB']).map(s => recvs.find(x => x.slot === s)).filter(Boolean);
  const pressure = S.athletes.some(o => o.team !== a.team && o.down <= 0 && !o.eng && dist(o.b, a.b) < 2.2 * Y);
  let best = null, bo = -99;
  for (const rv of reads) {
    if (rv.down > 0) continue;
    const o = openness(a, rv), prog = rv.brain.wp ? rv.brain.i / rv.brain.wp.length : 1;
    if (o > bo) { bo = o; best = rv; }
    if (o > openNeed * Y && prog >= .4 && (t > readT + .2 || o > openNeed * Y * 1.5)) { throwTo(a, rv, o); return; }
  }
  if (t > 2.8 || (pressure && t > readT * .6)) {
    if (best && bo > Y) throwTo(a, best, bo);
    else if (t > 3.6 || pressure) { if (best && bo > -1 * Y) throwTo(a, best, bo); else { P.scramble = true; a.brain.beh = 'carry'; } }
  }
  void dd;
}
function throwTo(a, rv, o) {
  const i = S.receivers(a.team).indexOf(rv);
  if (i < 0) return;
  const d = dist(rv.b, a.b), bullet = d < 22 * Y && o < 4 * Y;
  a.intent.recv = i; a.intent.turbo = bullet;
  S.startThrow(a, rv, bullet);
}
/** how open a receiver is: the nearest defender's distance to his arrival point, minus 8 a defender near the lane */
function openness(qb, rv) {
  const sp = T.lobSpeed + qb.r.ARM * 8, d = dist(rv.b, qb.b), t = d / sp;
  const px = rv.b.x + rv.b.vx * t, py = rv.b.y + rv.b.vy * t;
  let near = 1e9, lane = 0;
  for (const o of S.athletes) {
    if (o.team === qb.team || o.down > 0) continue;
    near = Math.min(near, hyp(o.b.x - px, o.b.y - py));
    const sd = segDist(o.b, qb.b, { x: px, y: py }); if (sd < 3 * Y && hyp(o.b.x - qb.b.x, o.b.y - qb.b.y) > 3 * Y) lane++;
  }
  return near - lane * 8;
}
const segDist = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return hyp(a.x + vx * u - o.x, a.y + vy * u - o.y); };

/** the ball carrier: the play's path while it is open, then free running (16 directions scored), and evasive moves */
function carry(a, it) {
  const br = a.brain, P = S.play, d0 = fwd(a), gx = S.goalX(a.team);
  // a pass play's receiver after the catch who should lateral (HOOK & LATERAL)
  if (a.assign && a.assign.lateralTo && P.catcher === a && !br.latDone) {
    const m = S.bySlot(a.team, a.assign.lateralTo);
    if (m && (m.b.x - a.b.x) * d0 < 0 && dist(m.b, a.b) < 4 * Y) { br.latDone = true; S.lateral(a); return; }
  }
  // path following for designed runs
  if (br.wp && a.assign && (a.assign.carry || a.assign.keep) && br.i < br.wp.length && !P.passThrown && P.t < 3) {
    const p = br.wp[br.i]; if (toward(it, a, p[0], p[1], 4) < 1.3 * Y) br.i++;
    const threat = S.athletes.some(o => o.team !== a.team && o.down <= 0 && !o.eng && dist(o.b, a.b) < 2.2 * Y);
    if (!threat) { it.turbo = br.i > 1; evade(a, it); return; }
  }
  // free running: forward, minus threats, minus the sidelines
  let best = 0, bs = -1e9;
  for (let k = 0; k < 16; k++) {
    const an = k / 16 * 6.2832, dx = Math.cos(an), dy = Math.sin(an);
    let s = dx * d0 * 1.0;
    const px = a.b.x + dx * 3 * Y, py = a.b.y + dy * 3 * Y;
    for (const o of S.athletes) {
      if (o.team === a.team || o.down > 0) continue;
      const od = hyp(o.b.x - px, o.b.y - py) / Y;
      if (od < 8) s -= (o.eng ? .3 : 1.4) / Math.max(.6, od * od) * 4;
    }
    if (py < F.SIDE_T + 2 * Y || py > F.SIDE_B - 2 * Y) s -= 2;
    for (const m of S.athletes) if (m.team === a.team && m !== a && hyp(m.b.x - px, m.b.y - py) < Y) s -= .2;
    if (Math.abs(E.angDiff(an, br.lastAn === undefined ? an : br.lastAn)) < .5) s += .25;   // hysteresis
    if (s > bs) { bs = s; best = an; }
  }
  br.lastAn = best;
  // a QB scrambling still looks to throw while behind the line
  if (a.slot === 'QB' && P.scramble && !P.passThrown && (a.b.x - S.los) * d0 < 0) {
    const recvs = S.receivers(a.team); for (const rv of recvs) if (openness(a, rv) > 3 * Y && r() < .05) { throwTo(a, rv, 4 * Y); return; }
  }
  it.mx = Math.cos(best); it.my = Math.sin(best);
  const near = S.athletes.filter(o => o.team !== a.team && o.down <= 0 && !o.eng).map(o => dist(o.b, a.b)).sort((x, y) => x - y)[0] || 1e9;
  it.turbo = (near < 7 * Y && a.turbo > .2) || a.turbo > .7;
  // dive into the end zone
  if (Math.abs(gx - a.b.x) < 2.6 * Y && near < 2.5 * Y && !a.act) it.press |= BIT.b1;
  evade(a, it);
}
function evade(a, it) {
  const br = a.brain; if (a.act || (br.moveT && S.time - br.moveT < .8)) return;
  for (const o of S.athletes) {
    if (o.team === a.team || o.down > 0 || o.eng) continue;
    const d = dist(o.b, a.b); if (d > 1.6 * Y) continue;
    const toA = Math.atan2(a.b.y - o.b.y, a.b.x - o.b.x), closing = (o.b.vx * Math.cos(toA) + o.b.vy * Math.sin(toA)) > 20;
    if (!closing && !(o.act && o.act.lunge)) continue;
    const side = Math.abs(E.angDiff(toA + Math.PI, a.facing)), k = S.isHuman(a.team) ? .5 : S.diff().tackle;
    br.moveT = S.time;
    if (o.act && o.act.lunge && (o.act.id === 'tackleDive') && r() < (.25 + a.r.ACC * .03) * k) it.press |= BIT.b4;
    else if (side < .9 && r() < (.2 + a.r.STR * .03) * k) it.press |= BIT.b2;
    else if (side >= .9 && r() < (.2 + a.r.ACC * .03) * k) it.press |= BIT.b3;
    else if (a.p.special && !(a.specialUsed.drive)) it.special = true;
    return;
  }
}
function route(a, it) {
  const br = a.brain, P = S.play, as = a.assign || {};
  if (as.wait && P.t < as.wait) { passBlock(a, it); return; }
  const wp = br.wp;
  if (wp && br.i < wp.length) {
    const p = wp[br.i], d = toward(it, a, p[0], p[1], 3);
    if (d < .9 * Y) { br.i++; if (br.i < wp.length) a.slowT = Math.max(a.slowT, .1); }
    it.turbo = br.i > 0 && a.turbo > .4;
    return;
  }
  // settle: drift away from the nearest defender, facing the QB
  const qb = S.bySlot(a.team, 'QB') || S.carrier();
  const def = S.athletes.filter(o => o.team !== a.team).sort((p, q) => dist(p.b, a.b) - dist(q.b, a.b))[0];
  if (def && dist(def.b, a.b) < 4 * Y) { const an = Math.atan2(a.b.y - def.b.y, a.b.x - def.b.x); it.mx = Math.cos(an) * .5; it.my = Math.sin(an) * .5; }
  if (P.scramble && qb) { it.my = Math.sign(qb.b.y - a.b.y) * .4; }
  if (as.settleAt) { it.mx = it.my = 0; }
}
function passBlock(a, it) {
  const qb = S.carrier() && S.carrier().team === a.team ? S.carrier() : S.bySlot(a.team, 'QB') || S.bySlot(a.team, 'K');
  if (!qb) return;
  const d0 = fwd(a), z = a.assign && a.assign.zone, off = z === 'left' ? -1.6 : z === 'right' ? 1.6 : 0, flip = S.play.flip || 1;
  let sx = qb.b.x + d0 * 2 * Y, sy = qb.b.y + off * Y * d0 * flip;
  // mirror the most dangerous unblocked rusher in the zone
  let dng = null, dd = 1e9;
  for (const o of S.athletes) {
    if (o.team === a.team || o.down > 0 || (o.eng && o.eng.blk !== a)) continue;
    const dq = dist(o.b, qb.b); if (dq > 9 * Y) continue;
    const across = (o.b.y - qb.b.y) * d0 * flip;
    if ((z === 'left' && across > Y) || (z === 'right' && across < -Y)) continue;
    if (dq < dd) { dd = dq; dng = o; }
  }
  if (dng) { sx = (dng.b.x + qb.b.x) / 2 + (dng.b.x - qb.b.x) * .3; sy = (dng.b.y + qb.b.y) / 2 + (dng.b.y - qb.b.y) * .3; }
  toward(it, a, sx, sy, 6);
  a.brain.blocking = true;
}
function runBlock(a, it) {
  const as = a.assign || {}, tgt = as.target ? S.bySlot(1 - a.team, as.target) : null, c = S.carrier();
  let t = tgt && tgt.down <= 0 && !(tgt.eng && tgt.eng.blk !== a) ? tgt : null;
  if (!t) t = nearestFoe(a, c);
  a.brain.blocking = true; a.brain.run = true; a.brain.target = t;
  const flip = S.play.flip || 1;
  if (as.drive) a.brain.drive = Math.atan2(as.drive[1] * fwd(a) * flip, as.drive[0] * fwd(a));
  if (t) toward(it, a, t.b.x - fwd(a) * .5 * Y, t.b.y, 3);
}
function lead(a, it) {
  const c = S.carrier(); if (!c) return;
  const t = nearestFoe(a, c, true);
  a.brain.blocking = true; a.brain.run = true; a.brain.target = t;
  if (t) toward(it, a, (t.b.x + c.b.x) / 2, (t.b.y + c.b.y) / 2, 3);
  else toward(it, a, c.b.x + fwd(c) * 4 * Y, c.b.y, 6);
  it.turbo = dist(a.b, c.b) > 4 * Y;
}
function nearestFoe(a, c, ahead) {
  let best = null, bd = 1e9;
  for (const o of S.athletes) {
    if (o.team === a.team || o.down > 0 || (o.eng && o.eng.blk !== a)) continue;
    if (ahead && c && (o.b.x - c.b.x) * fwd(c) < -Y) continue;
    const d = dist(o.b, a.b) + (c ? dist(o.b, c.b) * .6 : 0);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function rush(a, it) {
  const as = a.assign || {}, qb = S.carrier() || S.bySlot(S.poss, 'QB') || S.bySlot(S.poss, 'K'), P = S.play;
  if (!qb) return;
  if (a.eng) { it.mx = (qb.b.x - a.b.x) / 100; it.my = (qb.b.y - a.b.y) / 100; if ((S.step + a.id) % 14 === 0) it.press |= BIT.b3; return; }
  const gap = { A: .8, B: 2.3, C: 4.2, contain: 7.5 }[as.rush] || 2, side = Math.sign(a.b.y - S.spotY) || 1;
  const gx = S.los - fwd(qb) * .5 * Y, gy = S.spotY + side * gap * Y;
  const pastGap = (a.b.x - S.los) * fwd(qb) < -.3 * Y || P.t > 1.2;
  if (!pastGap) toward(it, a, gx, gy, 3);
  else pursueTo(a, it, qb);
  it.turbo = pastGap;
  if (as.jump && P.kind === 'fg' && P.t > .5 && P.t < 1.2 && !a.act) it.press |= BIT.b4;
  tackleDecision(a, it, qb);
}
function man(a, it) {
  const tg = S.bySlot(S.poss, a.assign.man);
  if (!tg) return zone(a, it);
  const cush = T.cushion * S.diff().cushion * (S.yardline(tg.b.x, S.poss) > 85 ? .5 : 1) * Y, d0 = fwd(tg);
  const t = .3, px = tg.b.x + tg.b.vx * t, py = tg.b.y + tg.b.vy * t;
  toward(it, a, px + d0 * cush, py, 4); it.turbo = dist(a.b, tg.b) > 3 * Y;
  a.brain.backpedal = true;
}
function zone(a, it) {
  const br = a.brain, z = a.assign && a.assign.zone; if (!br.zone) { const p = S.toWorld(8, 0); br.zone = p; }
  const zr = ((z && z.r) || 7) * Y, d0 = fwd(S.bySlot(S.poss, 'QB') || a);
  let threat = null, tv = -1e9;
  for (const rv of S.receivers(S.poss)) {
    const d = hyp(rv.b.x - br.zone[0], rv.b.y - br.zone[1]); if (d > zr + 3 * Y) continue;
    const v = -(d / Y) + (rv.b.x - S.los) * d0 / Y * .3; if (v > tv) { tv = v; threat = rv; }
  }
  if (threat) toward(it, a, threat.b.x + d0 * T.cushion * Y * S.diff().cushion, (threat.b.y + br.zone[1]) / 2, 4);
  else toward(it, a, br.zone[0], br.zone[1], 6);
  a.brain.backpedal = true;
}
function pursue(a, it) {
  const c = S.carrier(); if (!c) return;
  pursueTo(a, it, c); tackleDecision(a, it, c);
}
function pursueTo(a, it, c) {
  const p = pursuitPoint(a, c);
  toward(it, a, p[0], p[1], 2); it.turbo = dist(a.b, c.b) < 10 * Y;
}
/** the intercept point: the smallest t with |c + v t - d| <= speed t, solved in 0.05 s steps up to 3 s */
function pursuitPoint(a, c) {
  const ahead = (a.b.x - c.b.x) * S.dir[c.team] > 0;   // still between him and the goal: take the cut-off angle
  const sp = S.topSpeed(a) * (a.turbo > .2 ? 1.1 : .95), lag = S.isHuman(c.team) ? .7 : 1;
  if (ahead && !S.isHuman(c.team)) { const d = Math.hypot(a.b.x - c.b.x, a.b.y - c.b.y); if (d > 3 * Y) return [c.b.x + S.dir[c.team] * Math.min(d * .5, 6 * Y), clamp(c.b.y + c.b.vy * .45, F.SIDE_T, F.SIDE_B)]; }
  for (let t = .05; t <= 3; t += .05) {
    const px = c.b.x + c.b.vx * t * lag, py = clamp(c.b.y + c.b.vy * t * lag, F.SIDE_T, F.SIDE_B);
    if (hyp(px - a.b.x, py - a.b.y) <= sp * t) return [px, py];
  }
  return [c.b.x + c.b.vx * 1.5, c.b.y + c.b.vy * 1.5];
}
function tackleDecision(a, it, c) {
  if (!c || a.act || S.carrier() !== c || c.team === a.team) return;
  const d = dist(a.b, c.b);
  if (d > 1.8 * Y || c.b.z > 20) return;
  const p = pursuitPoint(a, c), an = Math.abs(E.angDiff(Math.atan2(p[1] - a.b.y, p[0] - a.b.x), a.facing));
  if (an > .61 && d > 1 * Y) return;
  const bigRoll = (.2 + a.r.TCK * .03) * (a.hot > 0 ? 1.5 : 1);
  const ux = (c.b.x - a.b.x) / (d || 1), uy = (c.b.y - a.b.y) / (d || 1), closing = (a.b.vx - c.b.vx) * ux + (a.b.vy - c.b.vy) * uy;
  if (d < (S.isHuman(c.team) ? 1.4 : 1.6) * Y && (closing > 35 || d < 1.05 * Y)) { it.press |= BIT.b1; it.turbo = (a.turbo >= .15 || a.hot > 0) && r() < bigRoll; }
}

/* ---------------- THE COACH ---------------- */
const pick = (list, wf) => { let tot = 0; const w = list.map(x => { const v = Math.max(0, wf(x)); tot += v; return v; }); let k = r() * tot; for (let i = 0; i < list.length; i++) { k -= w[i]; if (k <= 0) return list[i]; } return list[list.length - 1]; };
function situation(t) {
  const off = t === S.poss, yl = S.yardline(S.los, S.poss), lead = S.score[t] - S.score[1 - t];
  const timeLeft = S.quarter >= 4 || S.ot ? S.clock : S.quarter === 2 ? S.clock : S.clock + S.qLen * (4 - S.quarter);
  const halfLeft = S.quarter === 2 || S.quarter >= 4 ? S.clock : 999;
  return { off, team: t, down: S.down, toGo: S.toGo, yl, lead, trailing: lead < 0, trailingBy: -lead, timeLeft, halfLeft, quarter: S.quarter, redZone: yl > 80, pass: false, fgYards: Math.round(100 - yl + 17), pat: S.mode === 'pat' };
}
FF.coach = {
  situation,
  /** the call for team t: { play, flip, card } (COACH SAYS for a human) */
  call(t) {
    const c = situation(t), team = S.teams[t];
    if (S.mode === 'kickoff') {
      if (t === S.poss) return { play: FF.data.kickoffs[c.trailingBy >= 1 && c.halfLeft < 90 && S.quarter >= 4 ? 2 : r() < .08 ? 1 : 0] };
      return { play: FF.data.returns[c.lead > 0 && c.halfLeft < 90 && S.quarter >= 4 ? 3 : Math.floor(r() * 3)] };
    }
    if (S.mode === 'pat') {
      if (t === S.poss) { const two = S.quarter >= 3 && [2, 5, 9, 10, 12].includes(c.trailingBy); const p = two ? FF.data.pats[1] : FF.data.pats[0]; return { play: p, two: two ? pick(FF.data.plays.filter(p => p.tab === 'PASS'), () => 1) : null }; }
      return { play: FF.play('fg_block') };
    }
    const card = this.cardFor(t, c);
    if (c.off) return Object.assign(this.offense(t, c, team), { card });
    return Object.assign(this.defense(t, c, team), { card });
  },
  offense(t, c, team) {
    const A = team.ai, plays = FF.data.plays.filter(p => p.tab !== 'SPECIAL');
    if (c.down === 4) {
      const fgYd = 100 - c.yl + 17, kck = S.rosters[t].find(a => a.slot === 'K').r.KCK;
      const late = c.trailing && c.timeLeft < 120 && S.quarter >= 4;
      if (!late && fgYd <= T.cpuFgRange + kck && !(c.trailingBy > 3 && c.timeLeft < 60)) return { play: FF.play('field_goal') };
      if (!(c.toGo <= 3 && c.yl > 50) && !late) return { play: r() < .05 && c.toGo <= 5 ? FF.play('fake_punt') : FF.play('punt') };
    }
    if (c.lead >= 9 && c.halfLeft < 60 && S.quarter >= 4) return { play: FF.play('kneel') };
    const w = p => {
      let v = p.tab === 'RUN' ? A.run : p.tab === 'PASS' ? A.pass : A.trick;
      if (p.id === 'hail_mary') v *= c.timeLeft < 15 && c.trailing ? 30 : .1;
      if (p.id === 'qb_sneak') v *= c.toGo <= 2 ? 3 : .2;
      if ((c.down >= 3 && c.toGo >= 10) && p.type === 'pass') v *= 2.5;
      if (c.toGo < 3 && (p.type === 'run' || (p.tags || []).includes('quick'))) v *= 2;
      if (c.yl > 95 && (p.type === 'run' || p.id === 'slants')) v *= 2;
      if (c.trailing && c.halfLeft < 60 && (p.tags || []).includes('sideline')) v *= 3;
      if (c.lead >= 9 && c.halfLeft < 120 && p.type === 'run') v *= 2;
      return v;
    };
    const p = pick(plays, w);
    return { play: p, flip: r() < .5 };
  },
  defense(t, c, team) {
    const A = team.ai, list = FF.data.dplays.filter(p => !p.kickOnly);
    const o = situation(S.poss);
    const w = p => {
      let v = 1;
      if (p.blitz) v *= A.blitz * 3 * (o.down >= 3 && o.toGo >= 10 ? 1.8 : 1);
      if (p.id === 'goal_line') v *= o.yl > 96 ? 5 : .05;
      if (p.id === 'prevent') v *= c.lead > 0 && c.halfLeft < 60 ? 4 : .2;
      return v * (.8 + r() * .4);
    };
    return { play: pick(list, w), flip: r() < .5 };
  },
  cardFor(t, c) {
    if (S.isHuman(t) || !S.cards[t] || !S.cards[t].length) return null;
    if (S.lastCpuCard !== undefined && S.playNo - S.lastCpuCard < 3) return null;
    for (const id of S.cards[t]) {
      const card = FF.card(id); if (!card) continue;
      const fits = card.side === 'any' || (card.side === 'off') === c.off && card.side !== 'kick';
      if (fits && card.cpu(c)) { S.lastCpuCard = S.playNo; return id; }
    }
    return null;
  }
};
})();
