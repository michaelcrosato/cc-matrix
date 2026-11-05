// Athlete brains: each athlete not held by a human picks a behavior from its play assignment and the play's state and
// turns it into an intent every step. AIs see a delayed world (a history buffer), so jukes and play fakes work on them.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, u = FF.u, F = FF.F, T = FF.T, YD = 16;
const { B1, B2, B3, B4 } = FF.BITS;
const intent = a => { const I = a.intent; I.mx = 0; I.my = 0; I.turbo = false; I.press = 0; I.held = 0; I.recv = -1; I.face = undefined; I.special = false; I.boost = 1; return I; };
/** where o was `delay` seconds ago (what an AI sees) */
const seen = (o, delay) => { const h = o.hist, k = Math.round(delay * 120); if (!h || h.length <= k || k <= 0) return o; const e = h[h.length - 1 - k]; return { x: e[0], y: e[1], vx: e[2], vy: e[3], downT: o.downT, side: o.side }; };
const seek = (I, a, x, y, slow = 6, k = 1) => { const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy); if (d < 1.5) return d; const s = Math.min(1, d / (slow * 4)) * k; I.mx = dx / d * s; I.my = dy / d * s; return d; };
const AI = FF.ai = {};

/** at the snap: every athlete's brain from its assignment */
AI.snap = m => {
  const pl = m.play, off = m.poss, D = m.dir(off), W = m.toWorld, oc = pl.off, flip = pl.flipO ? -1 : 1;
  const P = pts => pts.map(p => W(p, flip));
  for (const a of m.on) {
    const asg = a.assign || {}, br = a.brain = { beh: 'idle', t0: 0 }; br.react = m.diff(a.side).react * T.reactionMult * (.8 + (10 - a.r.AWR) * .04);
    if (a.side === off) {
      if (oc.type === 'kickoff') { br.beh = a.slot === 'K' ? 'kicker' : 'kickHold'; br.lane = a.spot.y; continue; }
      if (a.slot === 'QB' && oc.qb) {
        const q = oc.qb; br.beh = 'qb'; br.q = q;
        if (q.drop) br.drop = W(q.drop, flip); if (q.fake) br.fake = W(q.fake, flip); if (q.keep) { br.path = P(q.keep); }
        if (q.flea) br.flea = W(q.flea.to, flip); if (q.fakeTo) br.fakePath = P([q.fake, q.fakeTo]);
        continue;
      }
      if (oc.fakeKick && a.slot === 'K') { br.beh = 'qb'; br.q = oc.qb; br.drop = W(oc.qb.drop, flip); continue; }
      if (oc.formation === 'fieldgoal' && (a.slot === 'K' || a.slot === 'QB')) { br.beh = 'kickerFG'; continue; }
      if (oc.formation === 'punt' && a.slot === 'K') { br.beh = 'punter'; continue; }
      if (asg.carry) { br.beh = 'carryPath'; br.path = P(asg.carry); br.wait = asg.wait || 0; br.pitchBack = asg.pitchBack; br.scoop = asg.scoop; continue; }
      if (asg.route) { br.beh = 'route'; br.path = P(asg.route); br.after = asg.after || 'settle'; br.trail = asg.trail; br.lateralTo = asg.lateralTo; if (asg.block) { br.beh = 'passBlock'; br.zone = asg.zone; br.then = asg.then; br.at = asg.at; } continue; }
      if (asg.pull) { br.beh = 'pull'; br.path = P(asg.pull); br.then = asg.then; br.kickTarget = asg.target; continue; }
      if (asg.lead) { br.beh = 'lead'; br.leadFor = asg.lead; continue; }
      if (asg.fake) { br.beh = 'fakePath'; br.path = P(asg.fake); continue; }
      if (asg.cover) { br.beh = 'cover'; continue; }
      if (asg.mascotBlock) { br.beh = 'mascotBlock'; continue; }
      if (asg.block === 'pass') { br.beh = 'passBlock'; br.zone = asg.zone; br.then = asg.then; br.at = asg.at; br.to = asg.to ? W(asg.to, flip) : null; br.route = asg.route ? P(asg.route) : null; continue; }
      if (asg.block === 'run') { br.beh = 'runBlock'; br.targetSlot = asg.target; br.climb = asg.climb; br.drive = asg.drive ? [asg.drive[0] * D, asg.drive[1] * D * flip] : [D, 0]; continue; }
      br.beh = 'passBlock'; br.zone = 'mid';
    } else {
      if (oc.type === 'kickoff') { br.beh = a === m.returner ? 'returner' : 'returnHold'; continue; }
      if (asg.ret) { br.beh = 'returner'; continue; }
      if (asg.rush) { br.beh = 'rush'; br.gap = asg.rush; br.jump = asg.jump; br.soft = asg.soft; continue; }
      if (asg.man) { br.beh = 'man'; br.man = m.bySlot[off][asg.man] || null; if (!br.man) { br.beh = 'zone'; br.zone = { x: m.los + D * 8 * YD, y: m.ballY, r: 7 * YD }; } continue; }
      if (asg.zone) { const z = asg.zone; br.beh = 'zone'; const p = { x: m.los + D * z.at[0] * YD, y: m.ballY + D * z.at[1] * (pl.flipD ? -1 : 1) * YD }; br.zone = { x: p.x, y: E.clamp(p.y, F.SIDE_T + 3 * YD, F.SIDE_B - 3 * YD), r: z.r * YD }; continue; }
      if (asg.spy) { br.beh = 'spy'; continue; }
      if (asg.mascot) { br.beh = 'rush'; br.gap = 'A'; continue; }
      br.beh = 'zone'; br.zone = { x: m.los + D * 8 * YD, y: m.ballY, r: 7 * YD };
    }
  }
  for (const x of m.extra) x.brain = { beh: x.side === off ? 'mascotBlock' : 'rush', gap: 'A', react: .1 };
  // a fake fools the defense for a moment (the fumblerooski)
  pl.fooled = oc.fool || 0;
};

/** this step's intents for everyone a human doesn't hold */
AI.update = (m, dt) => {
  const list = m.extra.length ? m.on.concat(m.extra) : m.on;
  for (const a of list) {
    if (a.ctl !== null && !a.aiDrive && !FF.autopilot) { if (a.brain && a.brain.beh === 'formation') formation(m, a, intent(a)); continue; }
    const I = intent(a);
    if (a.downT > 0) continue;
    if (m.phase === 'PRESNAP') { formation(m, a, I); continue; }
    think(m, a, I, dt);
  }
};
function formation(m, a, I) {
  if (!a.spot) return; const d = seek(I, a, a.spot.x, a.spot.y, 2);
  I.turbo = d > 60; if (d < 3) { I.mx = I.my = 0; I.face = m.dir(a.side) > 0 ? 0 : Math.PI; }
}

/* ---- the brain: by who has the ball ---- */
function think(m, a, I, dt) {
  const b = m.ball, h = b.holder, pl = m.play, br = a.brain || (a.brain = { beh: 'idle' });
  br.t0 = (br.t0 || 0) + dt;
  if (br.drill) { br.drill(m, a, I, dt); return; }
  if (a.specialT > 0 && a.special === 'SNOWPLOW') I.turbo = true;
  // a loose ball near: everyone dives for it
  if (b.state === 'loose' || b.state === 'kickLoose') {
    const d = Math.hypot(b.x - a.x, b.y - a.y), R = T.pileRadius * YD;
    if (d < R || (b.state === 'kickLoose' && (a === m.returnerNow || a === m.returner || a.side === m.poss || d < 12 * YD))) { recover(m, a, I); return; }
    seek(I, a, b.x, b.y, 4, .7); return;
  }
  if (b.state === 'tee') { if (a.side === m.poss && a.slot !== 'K') { I.face = m.dir(a.side) > 0 ? 0 : Math.PI; } return; }
  if (h === a) { carrier(m, a, I, dt); return; }
  // a kick in the air
  if (b.state === 'kick') { kickAir(m, a, I); return; }
  const hs = h ? h.side : (b.thrower ? b.thrower.side : m.poss);
  if (b.state === 'pass' && (b.type === 'lob' || b.type === 'bullet')) { passAir(m, a, I, dt); return; }
  if (a.side === hs) offense(m, a, I, dt);
  else defense(m, a, I, dt);
}

/* ---- offense without the ball ---- */
function offense(m, a, I, dt) {
  const b = m.ball, h = b.holder, pl = m.play, br = a.brain, D = m.dir(a.side);
  const passerBehind = h && m.canPass(h);
  if (pl.off.type === 'kickoff' && pl.kicked && h) { escort(m, a, I, h); return; }
  if (br.beh === 'returnHold' || br.beh === 'returner') { escort(m, a, I, h); return; }
  // timed changes: a pass blocker who releases (a screen), covers (a punt), or runs a route late
  if (br.then && pl.t >= br.at) {
    if (br.then === 'release' && br.to) { br.beh = 'release'; }
    else if (br.then === 'cover') { br.beh = 'cover'; }
    else if (br.then === 'route' && br.route) { br.beh = 'route'; br.path = br.route; br.after = 'settle'; br.pi = 0; }
    else if (br.then === 'run') { br.beh = 'runBlock'; br.targetSlot = null; br.drive = [D, 0]; }
    br.then = null;
  }
  // the ball has a carrier past the passer stage: everyone blocks for him
  if (h && !passerBehind && h !== a && br.beh !== 'cover' && !(br.beh === 'carryPath' && !pl.handed && !h)) { if (br.beh === 'route' && br.lateralTo === undefined && br.after !== 'trail') { escort(m, a, I, h); return; } if (br.beh !== 'runBlock' && br.beh !== 'pull' && br.beh !== 'lead' && br.beh !== 'fakePath') { escort(m, a, I, h); return; } }
  switch (br.beh) {
    case 'qb': qbNoBall(m, a, I); return;
    case 'carryPath': followPath(m, a, I, .9); if (br.pitchBack && pl.handed && !pl.flea) {} if (br.scoop && !pl.scooped) { seek(I, a, m.ball.x, m.ball.y, 1); } return;
    case 'route': route(m, a, I, dt); return;
    case 'passBlock': passBlock(m, a, I); return;
    case 'runBlock': runBlock(m, a, I); return;
    case 'pull': if (followPath(m, a, I, 1)) { br.beh = br.then === 'kick' ? 'runBlock' : 'lead'; br.targetSlot = br.kickTarget; br.leadFor = 'RB'; } return;
    case 'lead': { const f = m.bySlot[a.side][br.leadFor || 'RB'] || h; if (f) escort(m, a, I, f, true); return; }
    case 'fakePath': followPath(m, a, I, 1); return;
    case 'release': { const d = seek(I, a, br.to.x, br.to.y, 2); if (d < 10) br.beh = 'lead'; br.leadFor = 'RB'; return; }
    case 'cover': cover(m, a, I); return;
    case 'mascotBlock': escort(m, a, I, h || m.bySlot[a.side].QB, true); I.turbo = true; return;
    case 'kickerFG': case 'punter': I.face = D > 0 ? 0 : Math.PI; return;
    case 'kicker': return;
    case 'kickHold': I.face = D > 0 ? 0 : Math.PI; return;
  }
  escort(m, a, I, h);
}
function followPath(m, a, I, k = 1) {
  const br = a.brain; if (!br.path) return true;
  br.pi = br.pi || 0; if (br.wait && m.play.t < br.wait) return false;
  const p = br.path[br.pi]; if (!p) return true;
  const d = Math.hypot(p.x - a.x, p.y - a.y);
  if (d < 8) { br.pi++; if (br.pi >= br.path.length) return true; }
  const q = br.path[Math.min(br.pi, br.path.length - 1)]; seek(I, a, q.x, q.y, .5, k);
  I.turbo = k >= 1;
  return false;
}
function qbNoBall(m, a, I) {
  const br = a.brain, pl = m.play;
  if (br.fakePath && !followPath(m, a, I, .8)) return;
  if (br.flea && pl.handed) { seek(I, a, br.flea.x, br.flea.y, 2); I.face = m.dir(a.side) > 0 ? 0 : Math.PI; return; }
  if (br.fake && pl.handed) { seek(I, a, br.fake.x, br.fake.y, 2, .8); return; }
  const rb = m.bySlot[a.side].RB; if (br.q && br.q.handoff && rb && !pl.handed) { seek(I, a, (a.x + rb.x) / 2, (a.y + rb.y) / 2, 2, .7); return; }
  if (br.drop) seek(I, a, br.drop.x, br.drop.y, 2, .9);
}
function route(m, a, I, dt) {
  const br = a.brain, pl = m.play;
  if (!br.done) { if (followPath(m, a, I, 1)) { br.done = true; br.doneT = pl.t; } br.progress = (br.pi || 0) / Math.max(1, br.path.length); return; }
  br.progress = 1;
  if (br.after === 'block') { escort(m, a, I, m.ball.holder); return; }
  if (br.after === 'wait') { I.face = Math.atan2(m.ball.y - a.y, m.ball.x - a.x); return; }
  if (br.after === 'trail' && br.trail) { const t = m.bySlot[a.side][br.trail]; if (t) { const D = m.dir(a.side); seek(I, a, t.x - D * 3 * YD, t.y + (t.y < F.MID_Y ? 2 : -2) * YD, 2); return; } }
  // settle: find the nearest hole in the zones, face the passer; scramble with him toward his sideline
  const qb = m.ball.holder, D = m.dir(a.side);
  if (qb && Math.abs(qb.vy) > 60) { seek(I, a, a.x + D * 10, E.clamp(a.y + Math.sign(qb.vy) * 40, F.SIDE_T + 20, F.SIDE_B - 20), 3, .7); return; }
  let best = null, bs = -1e9;
  for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2, x = a.x + Math.cos(an) * 2 * YD, y = E.clamp(a.y + Math.sin(an) * 2 * YD, F.SIDE_T + 24, F.SIDE_B - 24); let near = 1e9; for (const o of m.on) if (o.side !== a.side) near = Math.min(near, Math.hypot(o.x - x, o.y - y)); const sc = near + (x - a.x) * D * .2; if (sc > bs) { bs = sc; best = [x, y]; } }
  if (best && bs > 0) seek(I, a, best[0], best[1], 3, .5);
  if (qb) I.face = Math.atan2(qb.y - a.y, qb.x - a.x);
}
/** hold a spot in front of the passer in his zone, mirror the most dangerous rusher there, and engage him */
function passBlock(m, a, I) {
  const qb = m.ball.holder && m.ball.holder.side === a.side ? m.ball.holder : m.bySlot[a.side].QB || m.bySlot[a.side].K, D = m.dir(a.side), pl = m.play;
  if (!qb) return;
  const off = a.brain.zone === 'left' ? -1 : a.brain.zone === 'right' ? 1 : 0, flip = pl.flipO ? -1 : 1;
  const base = { x: qb.x + D * 2 * YD, y: qb.y + D * off * flip * 1.8 * YD };
  let threat = null, td = 1e9;
  for (const o of m.on) { if (o.side === a.side || o.downT > 0 || (o.engaged && o.engaged !== a)) continue; const dq = Math.hypot(o.x - qb.x, o.y - qb.y); if (dq > 10 * YD) continue; const lane = Math.abs((o.y - base.y)) / YD; const sc = dq / YD + lane * .6; if (sc < td) { td = sc; threat = o; } }
  if (threat) { const s = seen(threat, a.brain.react * .5); const x = (s.x + qb.x * 1.5) / 2.5, y = (s.y + qb.y * 1.5) / 2.5; seek(I, a, x, y, .6); I.face = Math.atan2(threat.y - a.y, threat.x - a.x); }
  else seek(I, a, base.x, base.y, 1, .6);
}
function runBlock(m, a, I) {
  const br = a.brain, D = m.dir(a.side);
  let t = br.targetSlot ? m.bySlot[1 - a.side][br.targetSlot] : null;
  if (!t || t.engaged || t.downT > 0) { t = null; let bd = 1e9; for (const o of m.on) { if (o.side === a.side || o.downT > 0 || o.engaged) continue; const d = Math.hypot(o.x - a.x, o.y - a.y) + Math.max(0, (a.x - o.x) * D) * 2; if (d < bd) { bd = d; t = o; } } }
  if (t) { seek(I, a, t.x - D * 4, t.y, .4); I.face = Math.atan2(t.y - a.y, t.x - a.x); I.turbo = true; }
  else seek(I, a, a.x + D * 30, a.y, 2);
  br.drive = br.drive || [D, 0];
}
/** lead the way for f: block the defender most dangerous to him */
function escort(m, a, I, f, lead) {
  if (!f) { const D = m.dir(a.side); seek(I, a, a.x + D * 20, a.y, 3, .5); return; }
  const D = m.dir(f.side);
  let t = null, bs = 1e9;
  for (const o of m.on) { if (o.side === a.side || o.downT > 0 || (o.engaged && o.engaged !== a)) continue; const df = Math.hypot(o.x - f.x, o.y - f.y), ahead = (o.x - f.x) * D; if (df > 14 * YD) continue; const sc = df - Math.max(0, ahead) * .3 + Math.hypot(o.x - a.x, o.y - a.y) * .5; if (sc < bs) { bs = sc; t = o; } }
  if (t) { const x = (t.x * 2 + f.x) / 3, y = (t.y * 2 + f.y) / 3; seek(I, a, x, y, .4); I.turbo = true; I.face = Math.atan2(t.y - a.y, t.x - a.x); a.brain.beh = a.brain.beh === 'returnHold' || a.brain.beh === 'returner' ? a.brain.beh : a.brain.beh; a.brain.blocking = true; }
  else seek(I, a, f.x + D * (lead ? 3 : 6) * YD, f.y + (a.y > f.y ? 2 : -2) * YD, 2);
}
function cover(m, a, I) {
  const b = m.ball, D = m.dir(a.side), h = b.holder;
  if (h && h.side !== a.side) { pursue(m, a, I, h); return; }
  const L = b.state === 'kick' ? b.to : { x: a.x + D * 30 * YD, y: a.y };
  seek(I, a, L.x - D * 3 * YD, E.lerp(a.y, L.y, .4), 2); I.turbo = true;
}

/* ---- the ball carrier: the play's path, then free running ---- */
function carrier(m, a, I, dt) {
  const br = a.brain, pl = m.play, D = m.dir(a.side), b = m.ball;
  // a passer behind the line
  if (m.canPass(a) && (pl.off.type === 'pass' || pl.off.fakeKick || (br.q && br.q.flea && pl.flea)) && !pl.passed) { qbPass(m, a, I, dt); return; }
  if (br.beh === 'punter' || br.beh === 'kickerFG') return;
  // the QB on a run play: to the mesh point until he hands it off (or sets it down)
  if (br.beh === 'qb' && br.q && (br.q.handoff || br.q.setDown) && !pl.handed && !pl.setDown) { qbNoBall(m, a, I); return; }
  // a returner in his own end zone, deep: he takes a knee (the sim decides); a kick returner starts upfield
  if (br.path && br.beh === 'carryPath' && !br.free) { if (followPath(m, a, I, 1)) br.free = true; else { evasive(m, a, I); return; } }
  if (br.beh === 'qb' && br.path && !br.free) { if (followPath(m, a, I, 1)) br.free = true; else return; }
  // the hook & lateral: pitch to the trailer when he's close behind
  if (br.lateralTo && !pl.lateraled) { const tr = m.bySlot[a.side][br.lateralTo]; if (tr && (tr.x - a.x) * D < 0 && u.dist(tr, a) < 4 * YD && pl.completed) { pl.lateraled = true; I.press |= FF.BITS.LB; return; } }
  // the CPU flea-flicker RB pitches back
  if (br.pitchBack && pl.t >= br.pitchBack && !pl.flea) return;
  freeRun(m, a, I, dt);
  // a special: Bertha's mudslide, Zap's afterburner
  if (a.special === 'MUDSLIDE' && m.specialReady(a) && m.on.some(o => o.side !== a.side && o.downT <= 0 && Math.hypot(o.x - a.x, o.y - a.y) < 3 * YD && (o.x - a.x) * D > 0)) I.special = true;
  if (a.special === 'AFTERBURNER' && m.specialReady(a) && !m.on.some(o => o.side !== a.side && o.downT <= 0 && Math.hypot(o.x - a.x, o.y - a.y) < 3 * YD)) I.special = true;
  evasive(m, a, I);
}
function freeRun(m, a, I, dt) {
  const br = a.brain, D = m.dir(a.side), react = (br.react || .25) * .6;
  br.frT = (br.frT || 0) - dt;
  if (br.frT <= 0 || !br.dir) {
    br.frT = .1; let best = null, bs = -1e9;
    for (let k = 0; k < 16; k++) {
      const an = k / 16 * Math.PI * 2, dx = Math.cos(an), dy = Math.sin(an);
      let sc = dx * D * 4.5 - (dx * D < -.3 ? 2 : 0);
      const px = a.x + dx * 2.5 * YD, py = a.y + dy * 2.5 * YD;
      for (const o of m.on) {
        if (o.side === a.side || o.downT > 0 || o.engaged) continue;
        const s = seen(o, react), d = Math.max(.5, Math.hypot(s.x - px, s.y - py) / YD); if (d > 8) continue;
        const close = Math.max(.2, ((a.x - s.x) * (s.vx || 0) + (a.y - s.y) * (s.vy || 0)) / (Math.hypot(a.x - s.x, a.y - s.y) || 1) / 80 + 1);
        sc -= close * 7 / (d * d);
      }
      const edge = Math.min(py - F.SIDE_T, F.SIDE_B - py) / YD; if (edge < 3) sc -= (3 - edge) * 1.6;
      if (br.dir && Math.abs(u.angDiff(an, br.dir)) < .5) sc += .35;   // hysteresis
      if (sc > bs) { bs = sc; best = an; }
    }
    br.dir = best;
  }
  I.mx = Math.cos(br.dir); I.my = Math.sin(br.dir);
  let near = 1e9, behind = false; for (const o of m.on) { if (o.side === a.side || o.downT > 0) continue; const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < near) near = d; if (d < 5 * YD && (o.x - a.x) * D < 0 && Math.hypot(o.vx, o.vy) > 80) behind = true; }
  I.turbo = near > 4 * YD || behind || a.turbo > .6;
}
/** dodge a tackler closing in: hurdle a diver, stiff-arm one in front, spin away from one at the side */
function evasive(m, a, I) {
  const br = a.brain; br.moveT = (br.moveT || 0) - 1 / 120; if (br.moveT > 0 || a.action) return;
  const R = FF.r;
  for (const o of m.on) {
    if (o.side === a.side || o.downT > 0 || o.engaged) continue;
    const d = Math.hypot(o.x - a.x, o.y - a.y); if (d > 1.6 * YD + o.rad) continue;
    const closing = ((a.x - o.x) * o.vx + (a.y - o.y) * o.vy) / (d || 1); if (closing < 20) continue;
    const ang = Math.abs(u.angDiff(a.facing, Math.atan2(o.y - a.y, o.x - a.x)));
    const k = m.diff(a.side).tackle > 1 ? 1.15 : 1;
    br.moveT = .8;
    if (o.action && o.action.id === 'tackleDive') { if (R() < (.12 + a.r.ACC * .02) * k) I.press |= B4; }
    else if (ang < .9) { if (R() < (.1 + a.r.STR * .02) * k) I.press |= B2; }
    else if (ang < 2.2) { if (R() < (.1 + a.r.ACC * .02) * k) I.press |= B3; }
    return;
  }
}
/** the QB: drop back, read in order, throw to the first open man; at 2.8 s or with a rusher close, the best, a scramble or a throwaway */
function qbPass(m, a, I, dt) {
  const br = a.brain, pl = m.play, D = m.dir(a.side), q = br.q || pl.off.qb || {}, readT = q.readT || .8;
  if (br.drop && !br.dropped) { const d = seek(I, a, br.drop.x, br.drop.y, 1.5, .9); if (d < 6 || pl.t > 1.6) br.dropped = true; I.face = D > 0 ? 0 : Math.PI; }
  else if (br.scramble) { freeRun(m, a, I, dt); }
  else { I.face = D > 0 ? 0 : Math.PI; }
  // a rusher in his face: step up or slide away
  const rush = m.on.filter(o => o.side !== a.side && o.downT <= 0 && !o.engaged && Math.hypot(o.x - a.x, o.y - a.y) < 3 * YD);
  if (rush.length && !br.scramble) { const r0 = rush[0], an = Math.atan2(a.y - r0.y, a.x - r0.x); I.mx = Math.cos(an) * .8; I.my = Math.sin(an) * .8; }
  const tAfter = pl.t - (pl.passStartT || 0);
  if (pl.t < readT && !(rush.length && pl.t > .5)) return;
  br.readT2 = (br.readT2 || 0) - dt; if (br.readT2 > 0) return; br.readT2 = .1;
  const rc = m.receivers(a.side), reads = (q.reads || ['WR1', 'WR2', 'RB']).map(s => m.bySlot[a.side][s]).filter(Boolean);
  const diffOpen = m.diff(a.side).open * (T.aiOpen / 3) * (a.special === 'NIGHT VISION' ? .8 : 1);
  const golden = a.special === 'GOLDEN SPIRAL' && m.specialReady(a);
  let best = null, bo = -1e9;
  for (const r of reads) {
    if (r.downT > 0) continue;
    const o = openness(m, a, r) + (a.special === 'NIGHT VISION' ? 1 : 0), prog = r.brain.progress === undefined ? 1 : r.brain.progress;
    if (o > bo) { bo = o; best = r; }
    if (o > diffOpen && prog >= .4) { throwTo(m, a, I, r, o, golden); return; }
  }
  const pressure = rush.some(o => Math.hypot(o.x - a.x, o.y - a.y) < 2 * YD);
  if (pl.t > 2.8 || pressure) {
    if (best && bo > 1) { throwTo(m, a, I, best, bo, golden); return; }
    if (!br.scramble && FF.r() < .55) { br.scramble = true; return; }
    if ((m.difficulty !== 'rookie' || m.isHuman(1 - a.side)) && pl.t > 3.4) { I.recv = 3; return; }
    if (pl.t > 3.6 && best) { throwTo(m, a, I, best, bo, golden); return; }
  }
  void tAfter; void rc;
}
function throwTo(m, a, I, r, open, golden) {
  const rc = m.receivers(a.side), idx = rc.indexOf(r); if (idx < 0) return;
  I.recv = idx; const d = Math.hypot(r.x - a.x, r.y - a.y) / YD;
  I.turbo = d < 18 && open < 5;   // a rocket into a tight window
  if (golden) I.special = true;
}
/** how open a receiver is: the nearest defender to where the ball would meet him, minus a lane penalty, in yards */
function openness(m, qb, r) {
  const sp = T.lobSpeed + qb.r.ARM * 8, d = Math.hypot(r.x - qb.x, r.y - qb.y), t = d / sp, P = { x: r.x + r.vx * t, y: r.y + r.vy * t };
  let near = 1e9, lane = 0;
  for (const o of m.on) {
    if (o.side === qb.side || o.downT > 0) continue;
    const dd = Math.hypot(o.x - P.x, o.y - P.y); if (dd < near) near = dd;
    const dq = Math.hypot(o.x - qb.x, o.y - qb.y), L = Math.hypot(P.x - qb.x, P.y - qb.y) || 1;
    if (dq > Math.max(6 * YD, L * .45) && dq < L + YD && u.segDist(o, qb, P) < 1.6 * YD) lane += 1;   // (the ball sails over the line: only defenders out in the lane count)
  }
  return near / YD - lane * 2 + (r.ctl !== null ? 1 : 0);
}

/* ---- defense ---- */
function defense(m, a, I, dt) {
  const b = m.ball, h = b.holder, pl = m.play, br = a.brain, D = m.dir(1 - a.side);
  if (pl.off.type === 'kickoff' || br.beh === 'cover' || br.beh === 'kickHold' || br.beh === 'kicker') { if (h) pursue(m, a, I, h); else cover(m, a, I); return; }
  const qbStage = h && m.canPass(h) && !pl.passed && pl.off.type !== 'run';
  if (pl.fooled > 0 && pl.t < pl.fooled) { const rb = m.bySlot[1 - a.side].RB; if (rb) { pursue(m, a, I, rb); return; } }
  if (!h) { const qb = m.bySlot[1 - a.side].QB; if (qb) rushTo(m, a, I, qb); return; }
  // force: a runner bouncing wide behind the line meets a play-side defender setting the edge outside him
  if (!qbStage && h.slot !== 'QB' && (br.beh === 'zone' || br.beh === 'man' || br.beh === 'spy') && pl.off.type !== 'kickoff') {
    const Dc = m.dir(h.side), wide = h.y - m.ballY, sg = Math.sign(wide), losX = pl.losX;
    if (Math.abs(wide) > 3.5 * YD && (h.x - losX) * Dc < 3 * YD && Math.sign(a.y - m.ballY) === sg && Math.hypot(a.x - h.x, a.y - h.y) < 16 * YD) {
      const d = Math.hypot(a.x - h.x, a.y - h.y);
      if (d > 2.5 * YD) { seek(I, a, Math.max(losX * Dc, (h.x + h.vx * .4) * Dc + YD) * Dc + 0, h.y + h.vy * .4 + sg * 1.5 * YD, .2); I.turbo = true; br.forced = true; return; }
    }
  }
  if (!qbStage || br.beh === 'pursue') { if (h.x !== undefined && (br.beh !== 'man' && br.beh !== 'zone' || !qbStage)) { pursue(m, a, I, h); return; } }
  switch (br.beh) {
    case 'rush': rushTo(m, a, I, h); if (br.jump && m.meterK && m.play.kicked === false && m.play.t > .7) I.press |= B4; return;
    case 'man': manCover(m, a, I); return;
    case 'zone': zoneCover(m, a, I); return;
    case 'spy': { const q = seen(h, br.react); seek(I, a, q.x + D * 5 * YD, q.y, 1, .8); if ((h.x - pl.losX) * D > 0) br.beh = 'pursue'; return; }
    case 'returner': case 'returnHold': if (h.side !== a.side) pursue(m, a, I, h); return;
  }
  pursue(m, a, I, h);
}
function rushTo(m, a, I, t) {
  const br = a.brain, D = m.dir(1 - a.side), s = seen(t, br.react * .5);
  if (a.engaged) { I.mx = (s.x - a.x); I.my = (s.y - a.y); const l = Math.hypot(I.mx, I.my) || 1; I.mx /= l; I.my /= l; I.turbo = true; if (a.special === 'SNOWPLOW' && m.specialReady(a)) I.special = true; return; }
  let gx = s.x, gy = s.y;
  if (br.gap === 'contain' || br.gap === 'C') { const side = a.y < m.ballY ? -1 : 1; if (Math.abs(a.x - t.x) > 3 * YD) gy = t.y + side * 3 * YD; }
  if (br.soft && m.play.t < 1.2) { seek(I, a, m.los - D * YD, a.y, 2, .6); return; }
  seek(I, a, gx, gy, .3); I.turbo = true;
  tackleDecision(m, a, I, t);
  if (a.special === 'SEISMIC SACK' && m.specialReady(a)) I.special = true;
}
function manCover(m, a, I) {
  const br = a.brain, r = br.man, D = m.dir(1 - a.side); if (!r) { zoneCover(m, a, I); return; }
  const s = seen(r, br.react), cush = T.cushion * m.diff(a.side).cushion * YD * (Math.abs(r.x - m.goalX(r.side)) < 10 * YD ? .6 : 1);
  seek(I, a, s.x + s.vx * .25 + D * cush, s.y + s.vy * .25, .5); I.turbo = Math.hypot(r.vx, r.vy) > 100;
}
function zoneCover(m, a, I) {
  const br = a.brain, z = br.zone, D = m.dir(1 - a.side);
  let threat = null, bs = -1e9;
  for (const o of m.on) { if (o.side === a.side || !['WR1', 'WR2', 'RB'].includes(o.slot)) continue; const s = seen(o, br.react), d = Math.hypot(s.x - z.x, s.y - z.y); if (d > z.r + 3 * YD) continue; const sc = -d + ((s.x - m.los) * D) * .3; if (sc > bs) { bs = sc; threat = s; } }
  if (threat) seek(I, a, (threat.x + z.x) / 2 + D * YD, (threat.y * 2 + z.y) / 3, .5);
  else seek(I, a, z.x, z.y, 1, .8);
  const qb = m.ball.holder; if (qb) I.face = Math.atan2(qb.y - a.y, qb.x - a.x);
}
/** head for the intercept point; tackle (dive or Big Hit) when close and lined up */
function pursue(m, a, I, c) {
  const br = a.brain, s = seen(c, br.react * .6), sp = m.topSpeed(a) * (a.turbo > .1 ? T.turboMult : 1), Dc = m.dir(c.side);
  let ip = u.intercept(a, sp, s, s.vx || 0, s.vy || 0, 2.5);
  const d = Math.hypot(s.x - a.x, s.y - a.y), ahead = (a.x - s.x) * Dc;   // > 0: the defender is between the carrier and the goal
  if (!ip) { const lead = E.clamp(d / sp, .2, 1.1); ip = { x: s.x + (s.vx || 0) * lead, y: s.y + (s.vy || 0) * lead }; }
  // keep leverage: a defender goal-side of the carrier squares up in front of him instead of overrunning him
  if (ahead > 0 && d > 2 * YD) { ip.x = s.x + Dc * Math.min(ahead, Math.max(2 * YD, d * .5)); }
  // scrape: a defender who isn't rushing stays on his side of the line while the carrier is still behind it
  const losX = m.play ? m.play.losX : m.los, behindLos = (s.x - losX) * Dc < 0;
  if (behindLos && br.beh !== 'rush' && d > 3 * YD) { const minX = losX + Dc * 1.2 * YD; if ((ip.x - minX) * Dc < 0) ip.x = minX; }
  if (!m.isHuman(a.side) && !behindLos) I.boost = ahead < 0 ? 1.13 : 1.05;   // (arcade catch-up: a CPU pursuer chasing from behind runs a little faster)
  const x = E.clamp(ip.x, F.END_L - 20, F.END_R + 20), y = E.clamp(ip.y, F.SIDE_T - 10, F.SIDE_B + 10);
  seek(I, a, x, y, .2); I.turbo = true;
  tackleDecision(m, a, I, c);
}
function tackleDecision(m, a, I, c) {
  if (!c || a.action || c.side === a.side || m.ball.holder !== c) return;
  const d = Math.hypot(c.x - a.x, c.y - a.y), pred = { x: c.x + c.vx * .2, y: c.y + c.vy * .2 };
  const ang = Math.abs(u.angDiff(a.facing, Math.atan2(pred.y - a.y, pred.x - a.x)));
  if (d < 1.9 * YD + c.rad && ang < 40 * Math.PI / 180 && FF.r() < .3) {
    const big = (a.turbo >= .15 || a.hot > 0) && FF.r() < (.08 + a.r.TCK * .02) * (a.hot > 0 ? 1.5 : 1);
    I.press |= B1; if (big) I.turbo = true;
  }
}
/* ---- the ball in the air ---- */
function passAir(m, a, I, dt) {
  const b = m.ball, br = a.brain, L = b.to, offS = b.thrower ? b.thrower.side : m.poss;
  const tLeft = Math.max(0, b.T - b.t), dl = Math.hypot(L.x - a.x, L.y - a.y);
  if (a.side === offS) {
    if (a === b.target) { seek(I, a, L.x, L.y, .4); I.turbo = true; if (tLeft < .32 && tLeft > .12 && dl < 2.2 * YD && b.z > 30 && FF.r() < .3) I.press |= B4; return; }
    if (br.beh === 'route' && !br.done) { followPath(m, a, I, 1); return; }
    seek(I, a, L.x, L.y, 2, .7); return;
  }
  // defenders break on the ball after their reaction time
  br.airT = (br.airT || 0) + dt; if (m.cheatOn(a, 'forceINT')) br.airT = Math.max(br.airT, br.react || 0);   // (Always intercept: break on the throw at once)
  if (br.airT < br.react) { if (br.beh === 'man') manCover(m, a, I); else if (br.beh === 'zone') zoneCover(m, a, I); return; }
  const reach = Math.hypot(L.x - a.x, L.y - a.y) < m.topSpeed(a) * T.turboMult * tLeft + 3 * YD;
  if (reach || br.beh !== 'rush') { seek(I, a, L.x, L.y, .3); I.turbo = true; if (dl < 2 * YD && tLeft < .3 && tLeft > .1 && FF.r() < .3) I.press |= B4; }
  else { const qb = m.bySlot[1 - a.side].QB; if (qb) seek(I, a, L.x, L.y, 1, .6); }
}
function kickAir(m, a, I) {
  const b = m.ball, L = b.to, R = m.returnerFor();
  if (a.side !== m.poss) {
    if (a === R) { seek(I, a, L.x, L.y, .3); I.turbo = true; return; }
    // the wedge forms in front of the returner
    if (R) { const D = m.dir(a.side), k = (a.id % 3) - 1; seek(I, a, R.x + D * 9 * YD, R.y + k * 3 * YD, 2, .8); }
    return;
  }
  // coverage: lanes downfield toward the landing point
  const D = m.dir(a.side), lane = a.brain.lane !== undefined ? a.brain.lane : a.y;
  seek(I, a, L.x - D * 4 * YD, E.lerp(lane, L.y, .55), 2); I.turbo = true;
}
function recover(m, a, I) {
  const b = m.ball, d = Math.hypot(b.x - a.x, b.y - a.y);
  seek(I, a, b.x + b.vx * .15, b.y + b.vy * .15, .1); I.turbo = true;
  if (d < 2 * YD && d > a.rad + 2 && b.z < 8 && !a.action && FF.r() < .08) I.press |= B1;
}

/* ---- after the whistle: walk it off, celebrate, cheer, sulk ---- */
AI.post = (m, dt) => {
  const list = m.extra.length ? m.on.concat(m.extra) : m.on, b = m.ball;
  for (const a of list) {
    if (a.ctl !== null && m.phase === 'DEAD') continue;
    const I = intent(a);
    if (a.downT > 0 || a.flying) continue;
    if (m.phase === 'CELEBRATE' || m.phase === 'FINAL') { celebrate(m, a, I); continue; }
    const f = Math.exp(-dt * 2); a.vx *= f; a.vy *= f;
    if (b.holder !== a && !a.action && Math.hypot(b.x - a.x, b.y - a.y) > 30) I.face = Math.atan2(b.y - a.y, b.x - a.x);
    // AI late hits, by team personality
    if (m.phase === 'DEAD' && m.lateHitT > 0 && !a.lateTried && !m.isHuman(a.side)) { a.lateTried = true; if (FF.r() < (m.teams[a.side].ai.lateHit || 0) * .3) m.lateHit(a); }
    if (a.pose !== 'tackled' && a.pose !== 'getUp' && !a.action) a.pose = a.carry ? 'carry' : Math.hypot(a.vx, a.vy) > 10 ? 'run' : 'idle';
  }
  if (m.phase !== 'DEAD') for (const a of list) a.lateTried = false;
};
function celebrate(m, a, I) {
  const w = m.phase === 'FINAL' ? m.winner : (m.result && m.result.side !== undefined ? (m.lastScoreSide !== undefined ? m.lastScoreSide : m.poss) : m.poss);
  a.poseT = (a.poseT || 0) + 1 / 120;
  if (a.celebrating) return;
  const b = m.ball;
  if (m.phase === 'CELEBRATE' && b.holder === a) { a.pose = 'celebrate'; a.dance = a.dance === undefined ? Math.floor(FF.r() * 6) : a.dance; a.vx = a.vy = 0; return; }
  if (a.side === w) {
    const sc = b.holder && b.holder.side === w ? b.holder : null;
    if (sc && Math.hypot(sc.x - a.x, sc.y - a.y) > 3 * YD && m.phase === 'CELEBRATE') { seek(I, a, sc.x, sc.y, 2, .7); a.pose = 'run'; }
    else { a.vx = a.vy = 0; a.pose = 'cheer'; }
  } else if (w === -1) { a.vx = a.vy = 0; a.pose = 'idle'; }
  else { a.vx = a.vy = 0; a.pose = 'dejected'; a.dejK = a.id; }
}
})();
