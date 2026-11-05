// The live play: movement, turbo, collisions, blocking, actions, the ball's flights (passes, kicks, laterals, loose balls),
// catches and interceptions, tackles (Big Hits, gang tackles, evasions), fumbles, pile-ups and dead-ball checks.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, u = FF.u, F = FF.F, T = FF.T, YD = 16, bus = FF.bus;
const { B1, B2, B3, B4, LB, RB } = FF.BITS;
const M = FF.Match.prototype;
const ACT = {   // [duration, locks movement]
  snap: [.25, true], kickRun: [.55, false], kick: [.6, true], kneel: [.6, true], throw: [.28, false], lateral: [.3, false], handoffGive: [.35, false], handoffTake: [.3, false],
  dive: [1.05, true], spin: [.32, false], stiffArm: [.4, false], hurdle: [.55, false], tackleDive: [.45, true], bigHit: [.35, true], strip: [.3, false],
  jump: [.5, false], diveCatch: [.75, true], lateHit: [.5, true], hold: [9, true], plant: [.35, true], seismic: [.6, true], mudslide: [1.2, false], afterburner: [1, false], getUp: [.7, true]
};
M.topSpeed = function (a) {
  let s = T.speedBase + a.r.SPD * T.speedPerSpd;
  if (a.carry) s *= T.carrySpeedMult;
  const mv = Math.hypot(a.vx, a.vy);
  if (mv > 20) { const d = Math.abs(u.angDiff(a.facing, Math.atan2(a.vy, a.vx))); if (d > 1.75) s *= T.backpedalMult; }
  const surf = this.surface ? this.surface(a.x, a.y) : 'grass';
  if (surf === 'mud') s *= .85; if (this.snow) s *= .95;
  if (a.hot > 0) s *= 1.12; if (a.dinged > 0) s *= .9; if (a.slowT > 0) s *= .75;
  if (a.action && a.action.id === 'spin') s *= .8;
  if (a.action && a.action.id === 'afterburner') s *= 1.35;
  if (a.action && a.action.id === 'mudslide') s *= 1.05;
  s = bus.mod('speed', s, a);
  if (a.mascot) s *= 1.05;
  return s;
};
/** every on-field athlete moves by its intent (or its action) */
M.moveAll = function (dt) {
  const list = this.extra.length ? this.on.concat(this.extra) : this.on;
  for (const a of list) this.moveOne(a, dt);
};
M.moveOne = function (a, dt) {
  // in the air: jumps, dives, launched bodies
  if (a.z > 0 || a.vz) { a.vz -= 700 * dt; a.z += a.vz * dt; if (a.z <= 0) { a.z = 0; const hard = a.vz < -120; a.vz = 0; if (a.flying) { a.flying = false; a.pose = 'down'; a.downT = Math.max(a.downT, a.mega ? 1.6 : 1.1); a.vx *= .3; a.vy *= .3; bus.emit('land', { a, hard, m: this }); } } }
  if (a.downT > 0) {
    a.downT -= dt; const f = Math.exp(-dt * (this.surface && this.surface(a.x, a.y) === 'mud' ? 2.2 : 5)); a.vx *= f; a.vy *= f; a.x += a.vx * dt; a.y += a.vy * dt;
    if (a.downT <= 0) { a.downT = 0; if (this.phase === 'LIVE' || this.phase === 'DEAD') { a.action = { id: 'getUp', t: 0, dur: ACT.getUp[0] }; a.pose = 'getUp'; } }
    else if (!a.flying && a.pose !== 'pile' && a.pose !== 'tackled') a.pose = 'down';
    return;
  }
  if (a.stunT > 0) a.stunT -= dt;
  if (a.slowT > 0) a.slowT -= dt;
  if (a.ghostT > 0) a.ghostT -= dt;
  const act = a.action, lock = act && ACT[act.id] && ACT[act.id][1];
  const I = a.intent, top = this.topSpeed(a);
  let tvx, tvy;
  if (a.engaged) { a.x += a.vx * dt; a.y += a.vy * dt; return; }   // the block's own motion (blocking below)
  if (lock) {
    if (act.id === 'dive' || act.id === 'tackleDive' || act.id === 'bigHit' || act.id === 'diveCatch') {   // a lunge along the facing
      const air = act.id === 'dive' ? .45 : act.id === 'diveCatch' ? .45 : act.id === 'bigHit' ? .35 : .45;
      if (act.t < air) { const sp = top * (act.id === 'bigHit' ? 1.6 : 1.4); tvx = Math.cos(a.facing) * sp; tvy = Math.sin(a.facing) * sp; a.vx = tvx; a.vy = tvy; }
      else { const f = Math.exp(-dt * 6); a.vx *= f; a.vy *= f; }
    } else { const f = Math.exp(-dt * 10); a.vx *= f; a.vy *= f; }
  } else {
    let mx = I.mx || 0, my = I.my || 0; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const turbo = I.turbo && (a.turbo > .02 || a.hot > 0 || this.cheatOn(a, 'infiniteTurbo'));
    let sp = top * (turbo ? T.turboMult : 1) * (I.boost || 1);
    if (a.stunT > 0) sp *= .3;
    tvx = mx * sp; tvy = my * sp;
    const ice = this.surface && this.surface(a.x, a.y) === 'ice', acc = (T.accelBase + a.r.ACC * 30) * (turbo ? 1.3 : 1) * (this.surface && this.surface(a.x, a.y) === 'mud' ? .7 : 1) * (ice ? .5 : 1);
    const dvx = tvx - a.vx, dvy = tvy - a.vy, dl = Math.hypot(dvx, dvy), brake = ml < .1 ? 900 * (ice ? .4 : 1) : acc, step = brake * dt;
    if (dl <= step) { a.vx = tvx; a.vy = tvy; } else { a.vx += dvx / dl * step; a.vy += dvy / dl * step; }
    if (ml > .15 && !(act && act.id === 'spin')) { const want = Math.atan2(my, mx), turn = (Math.hypot(a.vx, a.vy) > 80 ? 9 : 16) * dt; a.facing = E.approachAng(a.facing, I.face !== undefined ? I.face : want, turn); }
    else if (I.face !== undefined) a.facing = E.approachAng(a.facing, I.face, 12 * dt);
    // turbo drains while held and moving, and comes back when not
    if (turbo && ml > .1 && !(a.hot > 0) && !this.cheatOn(a, 'infiniteTurbo')) a.turbo = Math.max(0, a.turbo - T.turboDrain * bus.mod('turbo.drain', 1, a) * (a.ctl === null && !this.ball.holder !== a && this.ball.holder && this.ball.holder.side !== a.side ? .7 : 1) * dt);
    else a.turbo = Math.min(1, a.turbo + T.turboRegen * dt);
    a.turboOn = turbo && ml > .1;
  }
  a.x += a.vx * dt; a.y += a.vy * dt;
  // keep everyone on the map
  a.x = E.clamp(a.x, 20, F.W - 20); a.y = E.clamp(a.y, F.SIDE_T - 3 * YD, F.SIDE_B + 3.5 * YD);
};
M.cheatOn = function (a, name) { return !!this.cheats[name] && ((this.cheatSide === undefined ? this.isHuman(a.side) || this.mode === 'attract' : a.side === this.cheatSide) || this.cheats.both || this.cheats[name + 'All']); };
/** athletes away from a live play: walking, celebrating, getting up (DEAD, CELEBRATE, FINAL) */
M.updateMovers = function (dt, post) {
  const list = this.extra.length ? this.on.concat(this.extra) : this.on;
  if (post) FF.ai.post(this, dt);
  else for (const a of list) { const I = a.intent; I.mx = I.my = 0; I.press = 0; I.turbo = false; }
  for (const a of list) {
    if (a.action) { a.action.t += dt; if (a.action.t >= a.action.dur) { a.action = null; if (a.pose === 'getUp') a.pose = 'idle'; } }
    this.moveOne(a, dt);
  }
  this.updateBallPost(dt);
};
/* ---- collisions: circle against circle; opponents push hard, teammates gently; contacts start engagements ---- */
M.collide = function () {
  const L = this.extra.length ? this.on.concat(this.extra) : this.on, n = L.length;
  for (let i = 0; i < n; i++) {
    const a = L[i]; if (a.downT > 0 || a.z > 10) continue;
    for (let j = i + 1; j < n; j++) {
      const b = L[j]; if (b.downT > 0 || b.z > 10) continue;
      if (a.engaged === b) continue;
      if ((a.ghostT > 0 && a.ghostOf === b) || (b.ghostT > 0 && b.ghostOf === a)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.rad + b.rad;
      if (d >= min || d < 1e-4) continue;
      const opp = a.side !== b.side;
      if ((a.noClip || b.noClip) && opp) continue;
      const nx = dx / d, ny = dy / d, over = min - d, k = opp ? 1 : .35, wa = b.mass / (a.mass + b.mass), wb = a.mass / (a.mass + b.mass);
      a.x -= nx * over * wa * k; a.y -= ny * over * wa * k; b.x += nx * over * wb * k; b.y += ny * over * wb * k;
      if (opp) this.maybeEngage(a, b);
    }
  }
  this.updateBlocks(1 / 120);
};
/** a blocker and a rusher meeting lock up as a pair (not the ball carrier: that's a tackle) */
M.maybeEngage = function (a, b, atSnap) {
  if (this.ball.state === 'held' && (this.ball.holder === a || this.ball.holder === b)) return;
  const pl = this.play; if (!pl || (this.phase !== 'LIVE' && !atSnap)) return;
  const offS = this.ball.holder ? this.ball.holder.side : this.poss;
  const blk = a.side === offS ? a : b, rus = blk === a ? b : a;
  const busy = x => x.action && x.action.id !== 'snap' && x.action.id !== 'shed';
  if (blk.engaged || rus.engaged || busy(blk) || busy(rus) || blk.stunT > 0 || rus.stunT > 0) return;
  if (blk.brain && blk.brain.noBlock) return;
  if (!(blk.brain && /block|lead|pull|wedge|mascot|escort/i.test(blk.brain.beh)) && blk.ctl === null) return;
  if (rus.brain && rus.brain.beh === 'recover') return;
  const shed = T.shedBase * (blk.r.STR / Math.max(1, rus.r.STR)) * (.7 + FF.r() * .6) * (rus.hot > 0 ? .6 : 1);
  blk.engaged = rus; rus.engaged = blk;
  this.blocks = this.blocks || [];
  this.blocks.push({ b: blk, r: rus, t: 0, shed, swim: 0 });
  // a pancake: much stronger blocker, a 15% roll
  if (blk.r.STR - rus.r.STR >= 3 && FF.r() < .15) { this.release(blk, rus); rus.downT = 1.2; rus.pose = 'down'; bus.emit('pancake', { blocker: blk, rusher: rus, m: this }); }
};
/** at the snap the linemen lock up with whoever is across from them */
M.lockLines = function () {
  const off = this.poss, oc = this.play.off; if (oc.type === 'kickoff') return;
  const blockers = this.on.filter(a => a.side === off && a.brain && /block/i.test(a.brain.beh));
  const D = this.dir(off), taken = new Set();
  for (const b of blockers.sort((p, q) => (['C', 'LG', 'RG'].includes(p.slot) ? 0 : 1) - (['C', 'LG', 'RG'].includes(q.slot) ? 0 : 1))) {
    let best = null, bd = 2.6 * YD;
    for (const r of this.on) { if (r.side === off || taken.has(r) || r.brain.beh !== 'rush') continue; const d = Math.hypot(r.x - b.x, r.y - b.y), ahead = (r.x - b.x) * D; if (ahead > 0 && d < bd) { bd = d; best = r; } }
    if (best) { taken.add(best); this.maybeEngage(b, best, true); }
  }
};
M.release = function (b, r) { b.engaged = null; r.engaged = null; if (this.blocks) this.blocks = this.blocks.filter(p => p.b !== b); };
M.updateBlocks = function (dt) {
  if (!this.blocks) return;
  for (const p of this.blocks.slice()) {
    const { b, r } = p; p.t += dt;
    if (b.engaged !== r || r.engaged !== b || b.downT > 0 || r.downT > 0 || this.phase !== 'LIVE') { this.release(b, r); continue; }
    // the rusher's goal: the ball (carrier or passer); the contest moves the pair
    const tgt = this.ball.holder && this.ball.holder.side !== r.side ? this.ball.holder : { x: this.los - this.dir(r.side === this.poss ? 1 - r.side : r.side) * 0, y: this.ballY };
    const ang = Math.atan2(tgt.y - r.y, tgt.x - r.x);
    const spec = this.specialActive(r, 'SNOWPLOW') ? 3 : 1, rushBonus = (r.intent.turbo ? 2 : 0) + (r.hot > 0 ? 2 : 0) + (this.specialActive(r, 'SNOWPLOW') ? 4 : 0);
    let force = (r.r.STR - b.r.STR + rushBonus - (b.brain.drive ? 1.5 : 0)) * T.blockPush * spec;
    const dir = force >= 0 ? ang : (b.brain.drive ? Math.atan2(b.brain.drive[1], b.brain.drive[0]) : ang + Math.PI);
    const sp = Math.min(40, Math.abs(force) * .3);
    const vx = Math.cos(dir) * sp, vy = Math.sin(dir) * sp;
    // hold them 0.8 yd apart, facing each other, sliding along the line with the rusher's stick
    const mx = (b.x + r.x) / 2, my = (b.y + r.y) / 2, sep = .8 * YD, fa = Math.atan2(r.y - b.y, r.x - b.x);
    const side = r.ctl !== null ? (r.intent.mx * -Math.sin(fa) + r.intent.my * Math.cos(fa)) * 25 : 0;
    const nmx = mx + vx * dt - Math.sin(fa) * side * dt, nmy = my + vy * dt + Math.cos(fa) * side * dt;
    b.x = nmx - Math.cos(fa) * sep / 2; b.y = nmy - Math.sin(fa) * sep / 2; r.x = nmx + Math.cos(fa) * sep / 2; r.y = nmy + Math.sin(fa) * sep / 2;
    b.vx = r.vx = vx; b.vy = r.vy = vy; b.facing = fa; r.facing = fa + Math.PI; b.pose = 'block'; r.pose = 'block';
    // a human rusher's swim move: □ repeatedly
    if (r.ctl !== null && (r.intent.press & B3) && p.swim < 6) { p.swim++; p.shed -= .12; r.action = { id: 'strip', t: 0, dur: .2 }; }
    const shedT = bus.mod('shed.t', p.shed, { blocker: b, rusher: r, t: this.play.t });
    if (p.t >= shedT) { this.release(b, r); r.burst = .3; b.stunT = .3; r.pose = 'run'; r.action = { id: 'shed', t: 0, dur: .3 }; bus.emit('shed', { rusher: r, blocker: b, m: this }); }
  }
};
M.specialActive = function (a, name) { return a.special === name && a.specialT > 0; };

/* ---- actions: from each athlete's intent, by context ---- */
M.updateActions = function (dt) {
  const b = this.ball, list = this.extra.length ? this.on.concat(this.extra) : this.on;
  for (const a of list) {
    if (a.specialT > 0) a.specialT -= dt;
    if (a.tackleCD > 0) a.tackleCD -= dt;
    const act = a.action;
    if (act) {
      act.t += dt; a.poseU = Math.min(1, act.t / act.dur);
      this.actionTick(a, act, dt);
      if (a.action === act && act.t >= act.dur) { a.action = null; this.actionEnd(a, act); }
    }
    if (a.downT > 0 || a.engaged) continue;
    const I = a.intent, p = I.press | 0;
    if (!a.action) {
      if (b.holder === a) {
        if (I.recv >= 0 && this.canPass(a)) { this.startThrow(a, I.recv, I.turbo); continue; }
        if (I.special && a.special) { this.trySpecial(a); continue; }
        if (p & B1) { if (this.inOwnEndZoneReturn(a)) { this.dead('touchback', { holder: a, at: this.play.off.type === 'punt' ? 20 : 25 }); continue; } this.startAction(a, 'dive'); continue; }
        if (p & B3) { this.startAction(a, 'spin'); continue; }
        if (p & B2) { this.startAction(a, 'stiffArm'); continue; }
        if (p & B4) { this.startAction(a, 'hurdle'); a.vz = 260; a.z = .5; continue; }
        if ((p & LB) || (p & RB)) { this.tryLateral(a); continue; }
      } else if (b.state === 'pass' && a.side === (b.thrower ? b.thrower.side : this.poss)) {
        if (p & B4) { this.startAction(a, 'jump'); a.vz = 230; a.z = .5; continue; }
        if (p & B1) { this.startAction(a, 'diveCatch'); continue; }
      } else {
        const opp = b.holder && b.holder.side !== a.side;
        if (I.special && a.special) { this.trySpecial(a); continue; }
        if ((p & B1) && I.turbo && (a.turbo >= .15 || a.hot > 0 || this.cheatOn(a, 'infiniteTurbo')) && opp) { if (!(a.hot > 0) && !this.cheatOn(a, 'infiniteTurbo')) a.turbo -= .15; this.startAction(a, 'bigHit'); continue; }
        if (p & B1) { if (b.state === 'loose' || b.state === 'kickLoose') { this.startAction(a, 'dive'); continue; } this.startAction(a, 'tackleDive'); continue; }
        if (p & B3) { this.startAction(a, 'strip'); this.tryStrip(a); continue; }
        if (p & B4) { this.startAction(a, 'jump'); a.vz = 230; a.z = .5; continue; }
      }
    }
  }
};
M.startAction = function (a, id, data) { const d = ACT[id] ? ACT[id][0] : .4; a.action = { id, t: 0, dur: d, data: data || {} }; a.pose = id; a.poseU = 0; bus.emit('action', { a, id, m: this }); return a.action; };
M.actionTick = function (a, act) {
  const b = this.ball;
  if (act.id === 'kickRun') { const K = this.meterK; a.pose = 'run'; const tx = b.x - this.dir(a.side) * 6, ty = b.y; a.facing = this.dir(a.side) > 0 ? 0 : Math.PI; const d = Math.hypot(tx - a.x, ty - a.y); if (d > 2) { a.vx = (tx - a.x) / d * 150; a.vy = (ty - a.y) / d * 150; } else { a.vx = a.vy = 0; } void K; }
  if (act.id === 'dive' && act.t > .45 && !act.landed) { act.landed = true; a.downT = .6; a.pose = 'dive'; if (b.holder === a) { const inEZ = this.inOppEndZone(a); if (!inEZ) this.dead('tackle', { holder: a, dive: true }); } }
  if ((act.id === 'tackleDive' || act.id === 'bigHit') && act.t > (act.id === 'bigHit' ? .35 : .45) && !act.landed) { act.landed = true; if (!act.hit) { a.downT = act.id === 'bigHit' ? 1.0 : .7; a.pose = 'down'; } }
  if (act.id === 'diveCatch' && act.t > .45 && !act.landed) { act.landed = true; a.downT = .5; }
  if (act.id === 'hold') { a.pose = 'hold'; a.vx = a.vy = 0; }
  if (act.id === 'mudslide') { a.pose = 'mudslide'; }
  a.poseT = (a.poseT || 0) + 1 / 120;
};
M.actionEnd = function (a, act) {
  if (act.id === 'kickRun') { this.kickoffKick(a); a.action = { id: 'kick', t: 0, dur: ACT.kick[0] }; a.pose = 'kick'; }
  if (act.id === 'getUp' || act.id === 'shed' || act.id === 'spin' || act.id === 'stiffArm' || act.id === 'hurdle' || act.id === 'lateral' || act.id === 'throw' || act.id === 'strip' || act.id === 'jump') a.pose = a.carry ? 'carry' : 'run';
  if (act.id === 'plant') { this.fieldGoalKick(a); }
};
M.inOppEndZone = function (a) { const g = this.goalX(a.side); return this.dir(a.side) > 0 ? this.ball.x > g : this.ball.x < g; };
M.inOwnEndZoneReturn = function (a) { const k = this.play && (this.play.off.type === 'kickoff' || this.play.off.type === 'punt'); if (!k || a.side === this.poss || this.play.returnStarted) return false; const g = this.ownGoalX(a.side); return this.dir(a.side) > 0 ? a.x < g : a.x > g; };
M.canPass = function (a) {
  const pl = this.play; if (!pl || pl.passed || this.phase !== 'LIVE') return false;
  if (a.side !== this.poss) return false;
  const behind = (a.x - pl.losX) * this.dir(a.side) < 4;
  return behind && (a.slot === 'QB' || (pl.off.fakeKick && a.slot === 'K') || pl.passerOK === a);
};
/** the receivers a passer can throw to, in button order (✕ ○ □) */
M.receivers = function (side = this.poss) { const S = this.bySlot[side] || {}, pl = this.play; let list = ['WR1', 'WR2', 'RB']; if (pl && pl.off.fakeKick) list = ['WR1', 'RB', 'WR2']; return list.map(k => S[k]).filter(a => a && a.onField); };

/* ---- passing ---- */
M.startThrow = function (a, idx, rocket) {
  const pl = this.play, rc = this.receivers(a.side);
  if (idx === 3) { pl.throwAway = true; }
  const target = idx === 3 ? null : rc[idx]; if (idx !== 3 && !target) return;
  a.action = { id: 'throw', t: 0, dur: ACT.throw[0], data: { target, rocket: !!rocket } }; a.pose = 'throw'; a.poseT = 0;
  pl.passed = true;   // committed (one forward pass a play)
  this.pendingThrow = { a, target, rocket: !!rocket, at: ACT.throw[0] * .85 };
};
M.releasePass = function () {
  const pt = this.pendingThrow; this.pendingThrow = null; if (!pt) return;
  const a = pt.a, pl = this.play, b = this.ball; if (b.holder !== a || a.downT > 0) return;
  let target = pt.target, P;
  const golden = this.specialActive(a, 'GOLDEN SPIRAL');
  const speed = pt.rocket ? T.bulletSpeed + a.r.ARM * 10 : T.lobSpeed + a.r.ARM * 8;
  if (!target) {   // thrown away: out of bounds past the nearest sideline
    const sy = a.y < F.MID_Y ? F.SIDE_T - 40 : F.SIDE_B + 40; P = { x: a.x + this.dir(a.side) * 10 * YD, y: sy };
  } else {
    P = { x: target.x, y: target.y };
    for (let k = 0; k < 2; k++) { const d = Math.hypot(P.x - a.x, P.y - a.y), t = d / speed; const vx = target.brain.vx !== undefined ? target.vx : target.vx; P = { x: target.x + vx * t, y: target.y + target.vy * t }; }
    // accuracy: pressure, throwing on the run, the passer's AIM, Hot Streak and Night Vision
    const d = Math.hypot(P.x - a.x, P.y - a.y), press = this.on.some(o => o.side !== a.side && o.downT <= 0 && u.dist(o, a) < 2 * YD) ? T.pressureMult : 1, run = Math.hypot(a.vx, a.vy) > 60 ? 1.25 : 1;
    let sig = T.aimError * d * (1.3 - a.r.AIM * .06) * press * run;
    sig = bus.mod('aim.err', sig, a); if (a.hot > 0) sig *= .6; if (a.special === 'NIGHT VISION') sig *= .8; if (golden || this.cheatOn(a, 'perfectPass')) sig = 0;
    P.x += u.gauss() * sig; P.y += u.gauss() * sig;
    // beyond the arm's range: short
    const max = (T.maxPass + a.r.ARM * 1.5) * YD; if (d > max) { const k = max / d; P.x = a.x + (P.x - a.x) * k; P.y = a.y + (P.y - a.y) * k; }
  }
  P.x = E.clamp(P.x, 0, F.W); P.y = E.clamp(P.y, F.SIDE_T - 60, F.SIDE_B + 60);
  const d = Math.hypot(P.x - a.x, P.y - a.y), t = Math.max(.35, d / speed);
  this.throwBall({ x: a.x, y: a.y, z: 30 }, { x: P.x, y: P.y, z: 20 }, t, pt.rocket ? 'bullet' : 'lob', a, target);
  pl.passer = a; pl.target = target; pl.passType = pt.rocket ? 'bullet' : 'lob'; a.stats.att++;
  b.golden = golden; b.hotPass = a.hot > 0;
  bus.emit('pass', { thrower: a, target, type: pl.passType, m: this });
};
/** the ball's flight from A to B in time t (passes, pitches, snaps, laterals): an arc under the pass gravity */
M.throwBall = function (A, B, t, type, thrower, target) {
  const b = this.ball, g = type === 'snap' || type === 'pitch' || type === 'lateral' ? 600 : T.passGravity, v = E.arc(A, B, g, { time: t });
  b.state = 'pass'; b.x = A.x; b.y = A.y; b.z = A.z; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.g = g;
  b.holder = null; if (thrower) { thrower.carry = null; } b.thrower = thrower; b.target = target; b.type = type; b.t = 0; b.T = t; b.to = B; b.last = thrower; b.deflected = false;
};
M.giveBall = function (a, how) {
  const b = this.ball; if (b.holder && b.holder !== a) b.holder.carry = null;
  b.state = 'held'; b.holder = a; b.last = a; a.carry = a.facing > -Math.PI / 2 && a.facing < Math.PI / 2 ? 'R' : 'L'; a.pose = 'carry';
  const pl = this.play;
  if (pl && !pl.carrier && how !== 'snap') { pl.carrier = a; pl.carrierStart = a.x; }
  if (pl && how !== 'snap') { pl.carrier = a; if (pl.carrierStart === null || pl.carrierStart === undefined) pl.carrierStart = a.x; }
  bus.emit('possess', { a, how, m: this });
};
/* ---- kicks ---- */
M.kickoffKick = function (K) {
  const k = this.meterK, b = this.ball, s = K.side, D = this.dir(s), kind = k.kind;
  let dist, apex;
  const extra = bus.mod('kick.yards', 0, { side: s });
  if (kind === 'onside') { dist = 10 + k.power * 4; apex = 60; }
  else if (kind === 'squib') { dist = 30 + k.power * 10; apex = 20; }
  else { dist = 50 + k.power * 20 + (k.power > .95 ? 3 : 0) + (K.r.KCK - 6) * 1.2 + extra; apex = T.kickoffApex; }
  const ang = k.aim + k.acc * 14 * Math.PI / 180 * (kind === 'deep' ? 1 : .5);
  const L = { x: b.x + Math.cos(ang) * D * dist * YD, y: b.y + Math.sin(ang) * D * dist * YD, z: 0 };
  this.kickFlight(L, apex, kind === 'onside' ? 'onside' : kind === 'squib' ? 'squib' : 'kickoff', K);
  bus.emit('kickoff', { side: s, kind, m: this });
};
M.kickFlight = function (L, apex, kind, kicker) {
  const b = this.ball, v = E.arc({ x: b.x, y: b.y, z: b.z }, L, T.kickGravity, { apex });
  b.state = 'kick'; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.g = T.kickGravity; b.T = v.t; b.t = 0; b.to = L; b.kind = kind; b.holder = null; b.thrower = kicker; b.last = kicker; b.kickFrom = { x: b.x, y: b.y };
  if (kicker) kicker.carry = null;
  this.play.kickT = this.play.t; this.play.kicked = true;
};
M.puntKick = function (P) {
  const k = this.meterK, b = this.ball, D = this.dir(P.side), extra = bus.mod('kick.yards', 0, { side: P.side });
  const dist = 30 + k.power * 25 + (P.r.KCK - 6) * 1.2 + extra, ang = k.aim + k.acc * 14 * Math.PI / 180;
  const L = { x: P.x + Math.cos(ang) * D * dist * YD, y: P.y + Math.sin(ang) * D * dist * YD, z: 0 };
  b.x = P.x + D * 6; b.y = P.y; b.z = 14;
  this.kickFlight(L, T.puntApex, 'punt', P); P.action = { id: 'kick', t: 0, dur: ACT.kick[0] }; P.pose = 'kick';
  bus.emit('punt', { side: P.side, m: this });
};
M.fieldGoalKick = function (K) {
  const k = this.meterK, b = this.ball, s = K.side, D = this.dir(s), extra = bus.mod('kick.yards', 0, { side: s });
  const dist = 25 + k.power * (25 + K.r.KCK * 1.6) + (k.power > .95 ? 2 : 0) + extra, hook = k.acc * 9 * Math.PI / 180, ang = k.aim + hook;
  // blocked: a rusher within 1.2 yd of the kick point before contact
  const rusher = this.on.find(o => o.side !== s && o.downT <= 0 && Math.hypot(o.x - b.x, o.y - b.y) < 1.2 * YD + (o.action && o.action.id === 'jump' ? 8 : 0));
  if (rusher && FF.r() < T.blockChance) { this.ball.state = 'loose'; b.vx = -D * 60 + (FF.r() - .5) * 80; b.vy = (FF.r() - .5) * 100; b.vz = 120; b.last = K; this.play.blocked = true; bus.emit('kickBlocked', { by: rusher, m: this }); K.action = { id: 'kick', t: 0, dur: .6 }; K.pose = 'kick'; return; }
  const L = { x: b.x + Math.cos(ang) * D * dist * YD, y: b.y + Math.sin(ang) * D * dist * YD, z: 0 };
  b.z = 2;
  this.kickFlight(L, T.fgApex, 'fg', K); K.action = { id: 'kick', t: 0, dur: ACT.kick[0] }; K.pose = 'kick';
  this.play.fgYards = this.fgDistance();
  bus.emit('fgKick', { side: s, yards: this.play.fgYards, m: this });
};

/* ---- laterals, strips, specials ---- */
M.tryLateral = function (a) {
  const pl = this.play, back = this.dir(a.side) * -1;
  let best = null, bd = 1e9;
  for (const o of this.on) {
    if (o === a || o.side !== a.side || o.downT > 0) continue;
    const dx = o.x - a.x, dy = o.y - a.y, d = Math.hypot(dx, dy); if (d > 9 * YD || d < 1) continue;
    const ang = Math.abs(u.angDiff(Math.atan2(dy, dx), back > 0 ? 0 : Math.PI)); if (ang > 100 * Math.PI / 180) continue;
    if (d < bd) { bd = d; best = o; }
  }
  a.action = { id: 'lateral', t: 0, dur: ACT.lateral[0] }; a.pose = 'lateral';
  if (best) { const t = E.clamp(bd / 300, .35, .6); this.throwBall({ x: a.x, y: a.y, z: 16 }, { x: best.x + best.vx * t, y: best.y + best.vy * t, z: 16 }, t, 'lateral', a, best); bus.emit('lateral', { from: a, to: best, m: this }); }
  else { const t = .45, to = { x: a.x + back * 3 * YD, y: a.y + (FF.r() - .5) * 3 * YD, z: 0 }; this.throwBall({ x: a.x, y: a.y, z: 16 }, to, t, 'lateral', a, null); this.ball.badLateral = true; }
  pl.laterals = (pl.laterals || 0) + 1;
};
M.tryStrip = function (a) {
  const c = this.ball.holder; if (!c || c.side === a.side || u.dist(a, c) > 1.2 * YD + a.rad) return;
  const p = E.clamp(T.stripChance - c.r.HND * .01, .02, .5);
  if (FF.r() < p) { a.stats.ff++; this.fumble(c, a, Math.atan2(c.y - a.y, c.x - a.x)); bus.emit('strip', { by: a, m: this }); }
};
M.trySpecial = function (a) {
  const s = a.special, key = s + ':' + a.side, used = this.specialsUsed, drive = this.playNo + '_' + this.poss;
  void drive;
  if (s === 'NIGHT VISION') return;
  if (used[key] && used[key].done) return;
  if (!this.specialReady(a)) return;
  used[key] = { done: true, at: this.playNo, drive: this.driveId, half: this.half };
  a.specialT = s === 'MUDSLIDE' ? 1.2 : s === 'AFTERBURNER' ? 1.0 : s === 'SNOWPLOW' ? 1.5 : s === 'GOLDEN SPIRAL' ? 3 : .6;
  if (s === 'MUDSLIDE') this.startAction(a, 'mudslide');
  if (s === 'AFTERBURNER') { a.action = { id: 'afterburner', t: 0, dur: 1 }; }
  if (s === 'SEISMIC SACK') { this.startAction(a, 'seismic'); a.vz = 280; a.z = .5; a.seismicAt = .55; }
  bus.emit('special', { who: a, kind: s, m: this });
};
/** can a's special fire now? */
M.specialReady = function (a) {
  const s = a.special; if (!s || this.phase !== 'LIVE') return false;
  const key = s + ':' + a.side, used = this.specialsUsed[key], b = this.ball;
  if (used) { if (s === 'SEISMIC SACK') { if (used.half === this.half) return false; } else if (s === 'AFTERBURNER') { if (used.at === this.playNo) return false; } else if (used.drive === this.driveId) return false; }
  if (s === 'MUDSLIDE') return b.holder === a;
  if (s === 'AFTERBURNER') return b.holder === a || (b.state === 'pass' && b.target === a) || (a.side === this.poss && !b.holder && this.play.t < 3);
  if (s === 'SNOWPLOW') return !!a.engaged;
  if (s === 'GOLDEN SPIRAL') return b.holder === a && this.canPass(a);
  if (s === 'SEISMIC SACK') return b.holder && b.holder.side !== a.side && u.dist(a, b.holder) < 3 * YD;
  return false;
};

/* ---- the ball ---- */
M.updateBall = function (dt) {
  const b = this.ball, pl = this.play;
  if (this.pendingThrow && this.pendingThrow.a.action && this.pendingThrow.a.action.t >= this.pendingThrow.at) this.releasePass();
  if (b.state === 'held' && b.holder) {
    const h = b.holder; b.x = h.x + Math.cos(h.facing) * 5; b.y = h.y + Math.sin(h.facing) * 5; b.z = h.z + 14; b.vx = h.vx; b.vy = h.vy;
    // the punter and the holder
    if (pl && pl.off.formation === 'punt' && !pl.off.fakeKick && h.slot === 'K' && h.side === this.poss && !pl.kicked) { pl.puntWait = (pl.puntWait || 0) + dt; if (pl.puntWait > .35) this.puntKick(h); }
    if (pl && pl.off.formation === 'fieldgoal' && h.slot === 'QB' && h.side === this.poss && !pl.kicked && !pl.planted) { pl.planted = true; h.action = { id: 'hold', t: 0, dur: 9 }; h.carry = null; b.state = 'placed'; b.holder = null; b.x = h.x + this.dir(h.side) * 6; b.y = h.y; b.z = 2; const K = this.bySlot[this.poss].K; if (K) { K.action = { id: 'plant', t: 0, dur: ACT.plant[0] }; K.pose = 'run'; } }
    return;
  }
  if (b.state === 'placed' || b.state === 'tee' || b.state === 'dead') return;
  if (b.state === 'pass' || b.state === 'kick') {
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= b.g * dt; b.spin += dt * 30;
    if (b.state === 'pass') {
      // a lateral or pitch or snap: whoever it's meant for (or anyone of that side) takes it when it arrives
      if (b.type !== 'lob' && b.type !== 'bullet') {
        if (b.t >= b.T - .02 || b.z <= 4) { const c = b.target && b.target.downT <= 0 && u.dist2(b.x, b.y, b.target.x, b.target.y) < 2 * YD ? b.target : null; if (c) this.giveBall(c, b.type); else { this.looseBall(b.badLateral ? 'badLateral' : 'muff'); } }
        return;
      }
      if (b.t >= b.T) this.resolveCatch();
      else if (b.x < F.END_L - 80 || b.x > F.END_R + 80 || b.y < F.SIDE_T - 120 || b.y > F.SIDE_B + 120) this.incomplete();
      return;
    }
    // a kick in the air
    if (b.kind === 'fg') {
      const end = this.dir(this.poss) > 0 ? F.END_R : F.END_L, crossed = this.dir(this.poss) > 0 ? b.x >= end : b.x <= end;
      if (crossed && !pl.fgJudged) {
        pl.fgJudged = true; const dy = Math.abs(b.y - F.MID_Y), inside = dy < F.UPR && b.z > F.BAR, nearPost = Math.abs(dy - F.UPR) < 3 && b.z > F.BAR - 4;
        let good = inside, doink = false;
        if (nearPost) { doink = true; good = this.forceDoinkIn ? true : FF.r() < .5; }
        if (b.z <= F.BAR + 2 && b.z > F.BAR - 3 && dy < F.UPR) { doink = true; good = FF.r() < .4; }
        this.fgResult = { good, doink, yards: pl.fgYards };
        if (doink) bus.emit('doink', { m: this, x: end, y: b.y, z: b.z });
      }
      if (b.z <= 0) { b.z = 0; this.dead('fg', this.fgResult || { good: false, yards: pl.fgYards }); }
      return;
    }
    // kickoffs and punts: a returner under it fields it
    const R = this.returnerFor();
    if (R && b.z < 34 && b.vz < 0 && R.downT <= 0 && u.dist2(b.x, b.y, R.x, R.y) < 1.4 * YD) {
      if (b.kind === 'punt' && (R.fairCatch || (R.ctl === null && this.on.some(o => o.side !== R.side && u.dist(o, R) < 5 * YD)))) { this.giveBall(R, 'catch'); this.dead('fairCatch', { holder: R }); return; }
      this.giveBall(R, 'catch'); this.play.returnStarted = false; this.play.returner = R; this.play.carrierStart = R.x; bus.emit('fielded', { a: R, m: this }); return;
    }
    if (b.z <= 0) { b.z = 0; this.kickLanded(); }
    if (b.y < F.SIDE_T || b.y > F.SIDE_B) { if (b.z <= 0 || b.kind === 'kickoff') { /* out of bounds on the fly or rolling */ } }
    return;
  }
  if (b.state === 'loose' || b.state === 'kickLoose') this.updateLoose(dt);
};
M.returnerFor = function () { const pl = this.play; if (!pl) return null; return pl.off.type === 'kickoff' || pl.off.formation === 'punt' ? (this.returnerNow || this.returner) : null; };
M.kickLanded = function () {
  const b = this.ball, pl = this.play;
  b.state = 'kickLoose'; b.vz = Math.abs(b.vz) * (b.kind === 'onside' ? .7 : .35); b.vx *= .55; b.vy *= .55; b.landT = 0; b.untouchedT = 0;
  if (b.kind === 'squib' || b.kind === 'onside') b.vz = Math.max(b.vz, b.kind === 'onside' ? 140 : 60);
  bus.emit('kickLanded', { m: this, kind: b.kind });
  // into the end zone: a touchback
  const recv = 1 - this.poss, own = this.ownGoalX(recv), inEZ = this.dir(recv) > 0 ? b.x < own : b.x > own;
  if (inEZ && (b.kind === 'punt' || b.kind === 'kickoff')) { this.dead('touchback', { side: recv, holder: null, at: b.kind === 'punt' ? 20 : 25, x: b.x }); this.result.side = recv; }
  void pl;
};
M.looseBall = function (why) {
  const b = this.ball; b.state = 'loose'; b.holder = null; b.vz = Math.max(40, b.vz || 0); b.g = 600; b.why = why;
  bus.emit('loose', { why, m: this });
};
M.updateLoose = function (dt) {
  const b = this.ball, pl = this.play;
  b.vz -= 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.spin += dt * 20;
  if (b.z <= 0) {
    b.z = 0;
    if (Math.abs(b.vz) > 40) { b.vz = -b.vz * .45; const tw = (FF.r() - .5) * 2 * 25 * Math.PI / 180, sp = Math.hypot(b.vx, b.vy) * (1 + (FF.r() - .5) * .6), an = Math.atan2(b.vy, b.vx) + tw; b.vx = Math.cos(an) * sp; b.vy = Math.sin(an) * sp; bus.emit('bounce', { m: this }); }
    else { b.vz = 0; const f = Math.exp(-dt * 2.4); b.vx *= f; b.vy *= f; }
  }
  // an incomplete pass's bounce, a dead ball: nothing more
  // out of bounds: the side that last had it (a kick: the receiving side at the spot, or its 40 on a kickoff)
  if (b.y < F.SIDE_T || b.y > F.SIDE_B || b.x < F.END_L || b.x > F.END_R) {
    const kick = b.state === 'kickLoose';
    if (kick && pl.off.type === 'kickoff' && !b.touched) { const recv = 1 - this.poss; this.dead('out', { side: recv, x: this.xAt(recv, 40), y: F.MID_Y, holder: null }); this.result.side = recv; return; }
    if (kick) { const recv = b.touched ? (b.last ? b.last.side : 1 - this.poss) : 1 - this.poss; this.dead('out', { side: recv, x: E.clamp(b.x, F.END_L, F.END_R), holder: null }); return; }
    // past an end line: a touchback, or a safety
    if (b.x < F.END_L || b.x > F.END_R) { const last = b.last ? b.last.side : this.poss, ownEnd = this.dir(last) > 0 ? b.x < F.END_L : b.x > F.END_R; if (ownEnd) { this.dead('safety', { holder: null, side: last }); return; } this.dead('touchback', { side: 1 - last, at: 20 }); this.result.side = 1 - last; return; }
    this.dead('out', { side: b.last ? b.last.side : this.poss, holder: null }); return;
  }
  if (b.state === 'kickLoose') {
    b.untouchedT += dt;
    if (!b.touched && Math.hypot(b.vx, b.vy) < 18 && b.untouchedT > .8) { const recv = 1 - this.poss; this.dead('downed', { side: recv, x: b.x, holder: null }); this.result.side = recv; return; }
  }
  // a recovery: feet or a dive on it while it's low
  if (b.z > 8) return;
  const near = [];
  for (const a of this.on) { if (a.downT > .3 && !(a.action && a.action.id === 'dive')) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < a.rad + 5 + (a.action && a.action.id === 'dive' ? 8 : 0)) near.push([a, d]); }
  if (!near.length) return;
  // the kicking team can't recover a kickoff before it has gone 10 yards (unless the receivers touched it)
  const kickOk = a => !(b.state === 'kickLoose' && a.side === this.poss && !b.touched && Math.abs(b.x - b.kickFrom.x) < 10 * YD);
  const cands = near.filter(([a]) => kickOk(a)); if (!cands.length) { b.touched = true; return; }
  const crowd = this.on.filter(a => Math.hypot(a.x - b.x, a.y - b.y) < 1.5 * YD && a.downT <= .3);
  if (crowd.length >= 2 && crowd.some(a => a.side !== crowd[0].side) && b.state === 'loose') { this.startPile(); return; }
  cands.sort((p, q) => p[1] - q[1]); const a = cands[0][0];
  if (b.state === 'kickLoose' && a.side !== this.poss && b.kind !== 'onside' && b.kind !== 'squib') { this.giveBall(a, 'catch'); this.play.returner = a; return; }
  this.recover(a);
};
M.recover = function (a) {
  const b = this.ball, was = b.last ? b.last.side : this.poss;
  this.giveBall(a, 'recover'); b.touched = true;
  bus.emit('recover', { athlete: a, side: a.side, team: this.teams[a.side], lost: was !== a.side, m: this });
  if (a.side !== this.poss && this.play.kind !== 'kickoff') this.play.turnover = true;
};
M.startPile = function () {
  const b = this.ball, pile = this.on.filter(a => Math.hypot(a.x - b.x, a.y - b.y) < 2.5 * YD);
  this.pile = { t: 0, list: pile.map((a, k) => ({ a, d: Math.hypot(a.x - b.x, a.y - b.y), k })), x: b.x, y: b.y };
  pile.forEach((a, k) => { a.pose = 'pile'; a.pileK = k; a.pileZ = (k % 4) * 3; a.downT = 2; a.action = null; a.vx = (b.x - a.x) * 2; a.vy = (b.y - a.y) * 2; });
  b.vx = b.vy = b.vz = 0; this.go('PILE', 1.6); this.stopClock = true;
  bus.emit('pile', { x: b.x, y: b.y, m: this });
};
M.updatePile = function (dt) {
  for (const a of this.on) { a.x += a.vx * dt; a.y += a.vy * dt; a.vx *= Math.exp(-dt * 6); a.vy *= Math.exp(-dt * 6); }
  if (this.phaseT > 0) return;
  const L = this.pile.list, w = e => (1 / (1 + e.d / YD)) * (1 + e.a.r.STR * .1);
  const win = u.pickW(L, w).a;
  this.ball.state = 'held'; this.ball.holder = win; this.ball.last = win;
  bus.emit('pileWon', { side: win.side, team: this.teams[win.side], athlete: win, m: this });
  for (const e of L) { e.a.downT = .8; e.a.pose = 'down'; }
  this.phase = 'LIVE';
  this.dead('tackle', { holder: win, x: this.pile.x, y: this.pile.y });
};
M.updateBallPost = function (dt) {
  const b = this.ball;
  if (b.state === 'held' && b.holder) { const h = b.holder; b.x = h.x + Math.cos(h.facing) * 5; b.y = h.y + Math.sin(h.facing) * 5; b.z = h.z + 14; }
  if (b.state === 'bounce') { b.vz -= 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = Math.abs(b.vz) > 40 ? -b.vz * .4 : 0; b.vx *= .7; b.vy *= .7; } }
  if (b.state === 'pass' || b.state === 'kick') { b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= (b.g || 300) * dt; if (b.z <= 0) { b.z = 0; b.state = 'bounce'; b.vz = 60; } }
};

/* ---- catches, interceptions, deflections ---- */
M.resolveCatch = function () {
  const b = this.ball, pl = this.play, thr = b.thrower, offS = thr ? thr.side : this.poss;
  const cands = [];
  for (const a of this.on) {
    if (a.downT > 0 && !(a.action && a.action.id === 'diveCatch')) continue; if (a === thr) continue;
    const act = a.action, jumping = act && act.id === 'jump' && act.t >= .12 && act.t <= .42, diving = act && act.id === 'diveCatch';
    const R = T.catchRadius + (jumping ? 6 : 0) + (diving ? 10 : 0) + (a.ctl !== null ? 3 : 0) + (a === b.target ? 8 : 0) + (a.side !== offS && this.cheatOn(a, 'forceINT') ? 16 : 0), d = Math.hypot(a.x - b.x, a.y - b.y);
    const reach = jumping ? 50 : 34 + a.z;
    if (d <= R && b.z <= reach + 6 && (!diving || b.z < 18)) cands.push({ a, d, jumping, diving });
  }
  cands.sort((p, q) => p.d - q.d);
  const defs = cands.filter(c => c.a.side !== offS), offs = cands.filter(c => c.a.side === offS);
  // each nearest defender: an interception, else a deflection
  for (const c of defs) {
    if (b.golden && !this.cheatOn(c.a, 'forceINT')) { if (FF.r() < .15) return this.deflect(c.a); continue; }
    const rec = b.target, inFront = rec && u.dist(c.a, thr || rec) < u.dist(rec, thr || c.a);
    let pi = T.intBase + .025 * c.a.r.HND + (c.jumping ? .1 : 0) + (inFront ? .08 : 0) - (c.d > 9 ? .08 : 0);
    pi = bus.mod('int.p', pi, { defender: c.a });
    if (this.cheatOn(c.a, 'forceINT')) pi = 1;
    if (this.cheatOn(thr || c.a, 'forceCatch') && thr && this.isHuman(thr.side)) pi = 0;
    if (this.mode === 'attract' && this.cheats.forceCatch) pi = 0;
    if (FF.r() < pi) return this.intercept(c.a);
    if (FF.r() < T.deflectChance * (this.cheats.forceCatch && thr && (this.isHuman(thr.side) || this.mode === 'attract') ? 0 : 1)) return this.deflect(c.a);
  }
  for (const c of offs) {
    const ctx = { receiver: c.a, thrower: thr };
    const nDef = this.on.filter(o => o.side !== offS && o.downT <= 0 && Math.hypot(o.x - c.a.x, o.y - c.a.y) < 14).length;
    let pc = T.catchBase + .03 * c.a.r.HND - T.contestPenalty * nDef - (b.type === 'bullet' ? .1 : 0) + (c.jumping ? .08 : 0) + (c.a.ctl !== null ? .05 : 0);
    if (c.a.hot > 0) pc += .1;
    pc = bus.mod('catch.p', pc, ctx);
    if (this.isHuman(offS) && FF.DIFF[this.difficulty] && this.difficulty === 'rookie' && this.score[1 - offS] - this.score[offS] >= 14) pc += .05;
    if (this.cheatOn(c.a, 'forceCatch') || (this.mode === 'attract' && this.cheats.forceCatch)) pc = 1;
    if (bus.mod('noDrop', 0, ctx)) pc = Math.max(pc, .97);
    if (FF.r() < E.clamp(pc, .05, .99)) return this.caught(c.a);
    if (c === offs[0]) { bus.emit('drop', { receiver: c.a, m: this }); return this.incomplete(true); }
  }
  this.incomplete();
};
M.caught = function (a) {
  const b = this.ball, pl = this.play;
  this.giveBall(a, 'catch'); pl.completed = true; pl.catcher = a; a.stats.rec++; if (pl.passer) pl.passer.stats.comp++;
  pl.carrierStart = pl.losX; pl.carrier = a;
  bus.emit('catch', { receiver: a, yards: Math.round((a.x - pl.losX) * this.dir(a.side) / YD), m: this });
  if (a.action && a.action.id === 'diveCatch') { a.downT = Math.max(a.downT, .4); if (!this.inOppEndZone(a)) this.dead('tackle', { holder: a }); }
  void b;
};
M.intercept = function (d) {
  const pl = this.play; this.giveBall(d, 'int'); d.stats.ints++; pl.turnover = true; pl.intBy = d; pl.carrierStart = d.x;
  bus.emit('int', { defender: d, thrower: this.ball.thrower, m: this });
};
M.deflect = function (d) {
  const b = this.ball; b.deflected = true;
  const to = { x: b.x + (FF.r() - .5) * 4 * YD, y: b.y + (FF.r() - .5) * 4 * YD, z: 18 };
  const t = .5 + FF.r() * .3, v = E.arc({ x: b.x, y: b.y, z: b.z + 10 }, to, 300, { time: t });
  b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.z += 10; b.t = 0; b.T = t; b.to = to; b.target = null; b.type = 'lob';
  bus.emit('deflect', { by: d, m: this });
};
M.incomplete = function (dropped) {
  const b = this.ball; if (this.phase !== 'LIVE') return;
  this.play.incomplete = true;
  bus.emit('incomplete', { dropped: !!dropped, m: this });
  this.dead('incomplete', { holder: null, side: this.poss, x: this.los });
  b.state = 'bounce'; b.vz = 70; b.vx = (FF.rf() - .5) * 80; b.vy = (FF.rf() - .5) * 80; b.z = Math.max(1, b.z);
};

/* ---- contacts: tackles and their evasions ---- */
M.checkContacts = function (dt) {
  const b = this.ball, c = b.holder; if (b.state !== 'held' || !c || this.phase !== 'LIVE') { this.gang = null; return; }
  if (this.cheatOn(c, 'godMode') && c.side === (this.godSide !== undefined ? this.godSide : c.side)) return;
  const list = this.extra.length ? this.on.concat(this.extra) : this.on;
  const hits = [];
  for (const t of list) {
    if (t.side === c.side || t.downT > 0 || t.engaged || t.tackleCD > 0 || t.stunT > 0) continue;
    if (t === c) continue;
    const d = Math.hypot(t.x - c.x, t.y - c.y), lunge = t.action && (t.action.id === 'tackleDive' || t.action.id === 'bigHit' || t.action.id === 'seismic');
    if (d > t.rad + c.rad + 7 + (lunge ? 6 : 0)) continue;
    if (Math.abs(t.z - c.z) > 22 && !(c.action && c.action.id === 'hurdle')) continue;
    hits.push(t);
  }
  if (!hits.length) return;
  if (!this.gang || this.gang.c !== c || this.t - this.gang.t > .3) this.gang = { c, t: this.t, n: 0 };
  for (const t of hits) { this.gang.n++; if (this.tackle(t, c, this.gang.n)) return; }
};
M.tackle = function (t, c, n) {
  t.tackleCD = .45;
  const act = t.action, big = act && act.id === 'bigHit', lunge = act && (act.id === 'tackleDive' || big), seismic = act && act.id === 'seismic';
  const ang = Math.atan2(c.y - t.y, c.x - t.x), fromBehind = Math.abs(u.angDiff(c.facing, ang)) < 70 * Math.PI / 180;
  const ca = c.action;
  // evasions first: a spin's window, a stiff arm in front, a hurdle over a low dive, a mudslide
  if (ca && ca.id === 'spin' && ca.t <= T.spinWindow && !fromBehind) { this.evaded(c, t, 'spin'); return false; }
  if (ca && ca.id === 'hurdle' && c.z > 6 && act && (act.id === 'tackleDive')) { this.evaded(c, t, 'hurdle'); return false; }
  if (c.special === 'MUDSLIDE' && c.specialT > 0 && !(big && !fromBehind)) { t.downT = 1.2; t.pose = 'down'; t.fallBack = true; t.vx = Math.cos(ang) * 120; t.vy = Math.sin(ang) * 120; c.specialT = 0; bus.emit('bowled', { by: c, who: t, m: this }); return false; }
  const D = this.diff(t.side);
  let p = T.tackleBase + .03 * t.r.TCK - .015 * c.r.STR - .012 * c.r.ACC + (fromBehind ? .15 : 0) + (big ? T.bigHitBonus : 0) + (c.z > 4 || (ca && ca.id === 'dive') ? .25 : 0) - (lunge ? 0 : .08);
  if (n > 1) p += T.gangBonus * (n - 1);
  if (ca && ca.id === 'stiffArm' && !fromBehind && Math.abs(u.angDiff(c.facing, ang + Math.PI)) < 60 * Math.PI / 180) p -= T.stiffBonus;
  if (c.hot > 0) p -= .15; if (t.hot > 0) p += .15;
  if (!this.isHuman(t.side)) p *= D.tackle;
  if (this.isHuman(c.side) && this.difficulty === 'rookie' && this.score[1 - c.side] - this.score[c.side] >= 14) p -= .04;
  p = bus.mod('tackle.p', p, { tackler: t, carrier: c });
  if (seismic) p = 1;
  if (this.cheatOn(t, 'noTackle') && !this.isHuman(t.side)) p = 0;
  p = E.clamp(p, .15, .97);
  if (this.cheats.noTackleCPU && this.cheatOn(c, 'noTackleCPU')) p = 0;
  if (this.cheatOn(c, 'godMode')) p = 0;
  if (this.forceTackle) p = 1;
  if (FF.r() >= p) {
    // a broken tackle: the carrier stumbles; the tackler's lunge carries on
    c.slowT = .3; if (lunge) { act.landed = true; t.downT = big ? 1 : .7; t.pose = 'down'; } else if (ca && ca.id === 'stiffArm') { t.downT = .6; t.pose = 'down'; t.fallBack = true; t.ghostT = .6; t.ghostOf = c; } else { t.stunT = .25; }
    if (Math.hypot(c.vx, c.vy) > this.topSpeed(c) * .6) bus.emit('brokenTackle', { carrier: c, tackler: t, m: this });
    return false;
  }
  return this.tackled(t, c, { big, ang, fromBehind, act });
};
M.evaded = function (c, t, how) { t.tackleCD = .6; t.ghostT = .6; t.ghostOf = c; if (t.action && (t.action.id === 'tackleDive' || t.action.id === 'bigHit')) { t.action.landed = true; t.downT = .8; t.pose = 'down'; } else t.stunT = .4; bus.emit('evade', { carrier: c, tackler: t, how, m: this }); };
M.tackled = function (t, c, o) {
  const pl = this.play, b = this.ball;
  let mega = false;
  if (o.big) { if (bus.mod('mega', 0, { tackler: t })) { mega = true; bus.clearMods('card'); } else if (t.hot > 0 && FF.r() < 1 / 6) mega = true; if (this.forceMega) { mega = true; this.forceMega = false; } }
  t.stats.tackles++; t.tackleCD = 1;
  if (o.act) { o.act.hit = true; o.act.landed = true; }
  const sack = pl.passer === null && c.slot === (pl.off.fakeKick ? 'K' : 'QB') && c.side === this.poss && !pl.passed && (c.x - pl.losX) * this.dir(c.side) < 0 && !pl.handed;
  // the fumble roll
  let fp = T.fumbleBase * (o.big ? 3 : 1) * (this.weatherWet ? 1.6 : 1) * (1 - c.r.HND * .05) * (mega ? 20 : 1);
  if (t.hot > 0 && o.big) fp *= 2;
  fp = bus.mod('fumble.p', fp, { tackler: t, carrier: c });
  if (this.cheatOn(t, 'forceFumble')) fp = 1;
  if (this.forceFumbleNext) { fp = 1; this.forceFumbleNext = false; }
  if (this.cheatOn(c, 'godMode') || this.cheats.noFumble) fp = 0;
  if (mega) fp = Math.max(fp, .6);
  const hitX = c.x, hitY = c.y;
  // the carrier goes down: a Big Hit launches him
  c.action = null; c.fallBack = !o.fromBehind; c.pose = 'tackled'; c.poseU = 0;
  if (o.big || mega) {
    const L = T.bigHitLaunch * (mega ? 1.6 : 1); c.vx = Math.cos(o.ang) * L; c.vy = Math.sin(o.ang) * L; c.vz = 150 * (mega ? 1.4 : 1); c.z = 1; c.flying = true; c.mega = mega; c.pose = 'fly'; c.downT = 2.5;
    t.stats.bigHits++; const launch = Math.round(L * .6 / YD); t.stats.launch = Math.max(t.stats.launch, launch); this.stats[t.side].bigHit = Math.max(this.stats[t.side].bigHit, launch);
    c.bigHitsDrive++; if (mega || c.bigHitsDrive >= 2) { c.dinged = 2; bus.emit('dinged', { a: c, m: this }); }
    if (mega || FF.r() < .25) { c.helmetOff = true; bus.emit('helmet', { a: c, ang: o.ang, m: this }); }
    bus.emit(mega ? 'megaHit' : 'bigHit', { tackler: t, carrier: c, player: t, x: hitX, y: hitY, z: 14, ang: o.ang, mega, m: this });
  } else { c.downT = 1.0; c.vx = Math.cos(o.ang) * 40; c.vy = Math.sin(o.ang) * 40; bus.emit('tackle', { tackler: t, carrier: c, x: hitX, y: hitY, m: this }); }
  // the tackler lands on him
  t.vx = Math.cos(o.ang) * 60; t.vy = Math.sin(o.ang) * 60; if (!t.action || t.action.id !== 'bigHit') t.downT = Math.max(t.downT, .6); else t.downT = .5; t.pose = 'down';
  if (sack) { pl.sack = true; t.stats.sacks++; this.stats[t.side].sacks++; bus.emit('sack', { defender: t, qb: c, player: t, m: this }); }
  if (sack) fp *= .5;   // (a sack's fumble half as often)
  if (FF.r() < fp) { t.stats.ff++; this.fumble(c, t, o.ang); return true; }
  // the ball is dead where he was hit (forward progress)
  if (this.ownEndZone(c.side, hitX)) { this.dead('safety', { holder: c, x: hitX }); return true; }
  this.dead('tackle', { holder: c, x: hitX, y: hitY });
  return true;
};
M.ownEndZone = function (s, x) { return this.dir(s) > 0 ? x < F.GOAL_L : x > F.GOAL_R; };
M.fumble = function (c, by, ang) {
  const b = this.ball; c.carry = null; c.stats.fumbles++;
  b.state = 'loose'; b.holder = null; b.last = c; const sp = 60 + FF.r() * 60;
  b.vx = Math.cos(ang) * sp + (FF.r() - .5) * 60; b.vy = Math.sin(ang) * sp + (FF.r() - .5) * 60; b.vz = 60 + FF.r() * 50; b.z = Math.max(b.z, 12); b.g = 600; b.why = 'fumble';
  this.play.fumbled = true;
  bus.emit('fumble', { carrier: c, forcer: by, m: this });
  if (!(c.downT > 0)) { c.downT = .6; c.pose = 'down'; }
};

/* ---- dead-ball checks: touchdowns, out of bounds, safeties, kneels, touchbacks ---- */
M.checkDead = function (dt) {
  if (this.phase !== 'LIVE') return;
  const b = this.ball, c = b.holder;
  if (b.state === 'held' && c) {
    // a seismic slam lands
    for (const a of this.on) if (a.seismicAt && a.action && a.action.id === 'seismic' && a.action.t >= a.seismicAt) { a.seismicAt = 0; this.seismic(a); if (this.phase !== 'LIVE') return; }
    if (this.inOppEndZone(c) && b.z < 60) { this.dead('td', { holder: c }); return; }
    if (c.y < F.SIDE_T || c.y > F.SIDE_B) { const x = c.x; if (this.ownEndZone(c.side, x) && !this.returnCatchInEZ(c)) { this.dead('safety', { holder: c, x }); return; } this.play.out = true; this.dead('out', { holder: c, x, y: E.clamp(c.y, F.SIDE_T, F.SIDE_B) }); return; }
    if ((this.dir(c.side) > 0 && c.x < F.END_L) || (this.dir(c.side) < 0 && c.x > F.END_R)) { if (this.returnCatchInEZ(c)) { this.dead('touchback', { holder: c, at: this.play.off.type === 'punt' ? 20 : 25 }); return; } this.dead('safety', { holder: c }); return; }
    if (c.action && c.action.id === 'kneel' && c.action.t > .4) { this.dead('kneel', { holder: c }); return; }
    // a returner who waits in his own end zone: a touchback
    if (this.inOwnEndZoneReturn(c)) {
      const pl = this.play; pl.ezWait = (pl.ezWait || 0) + dt;
      const deep = Math.abs(c.x - this.ownGoalX(c.side)) / YD;
      if (pl.ezWait > 1.5 || (c.ctl === null && deep > 4 && pl.ezWait > .3 && !this.forceReturn)) { this.dead('touchback', { holder: c, at: pl.off.type === 'punt' ? 20 : 25 }); return; }
    } else if (this.play.returner === c) this.play.returnStarted = true;
  }
  if (this.play && this.play.t > 25 && this.mode !== 'drill') { this.dead(b.holder ? 'tackle' : 'incomplete', { holder: b.holder }); }
};
M.returnCatchInEZ = function (c) { return this.play && (this.play.off.type === 'kickoff' || this.play.off.formation === 'punt') && c.side !== this.poss && !this.play.returnStarted; };
M.seismic = function (a) {
  const hit = this.on.filter(o => o !== a && Math.hypot(o.x - a.x, o.y - a.y) < 2.5 * YD && o.downT <= 0);
  bus.emit('seismic', { who: a, x: a.x, y: a.y, m: this });
  const c = this.ball.holder;
  for (const o of hit) { o.downT = 1.2; o.pose = 'down'; o.fallBack = true; const an = Math.atan2(o.y - a.y, o.x - a.x); o.vx = Math.cos(an) * 90; o.vy = Math.sin(an) * 90; }
  if (c && hit.includes(c) && c.side !== a.side) { a.action.hit = true; this.tackled(a, c, { big: true, ang: Math.atan2(c.y - a.y, c.x - a.x), fromBehind: false, act: a.action }); }
};
/* ---- after the whistle: late hits ---- */
M.lateHit = function (a, force) {
  if (!force && (this.phase !== 'DEAD' || this.lateHitT <= 0 || !FF.game.settings.lateHits)) return false;
  const v = this.on.filter(o => o.side !== a.side && o.downT <= 0 && Math.hypot(o.x - a.x, o.y - a.y) < 2.2 * YD).sort((p, q) => u.dist(a, p) - u.dist(a, q))[0];
  if (!v || a.downT > 0) return false;
  a.action = { id: 'lateHit', t: 0, dur: .5 }; a.pose = 'bigHit'; const an = Math.atan2(v.y - a.y, v.x - a.x); a.facing = an;
  v.downT = 1.2; v.pose = 'tackled'; v.fallBack = true; v.vx = Math.cos(an) * 110; v.vy = Math.sin(an) * 110; v.vz = 80; v.z = 1;
  this.stats[a.side].lateHits++; this.lateHitT = 0;
  bus.emit('lateHit', { by: a, victim: v, player: a, m: this });
  return true;
};
})();
