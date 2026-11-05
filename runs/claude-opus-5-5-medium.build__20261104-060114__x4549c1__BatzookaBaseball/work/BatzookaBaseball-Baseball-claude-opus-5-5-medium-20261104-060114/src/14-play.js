/* THE PLAY AFTER CONTACT: fielders (assignment by intercept time, covers by role, chase, catch, dive, jump, wall climb,
 * throws, relays, force and tag outs) and baserunners (forces, halfway on flies, tag-ups, extra bases by a time race,
 * orders from a human, steals, slides, the bowl-over), and when a play is over. */
const FSPEED = 132, RSPEED = 120, THROW = 600;
const fSpeed = F => FSPEED * statF(F.p.spd) * TUNE.fielderSpeed * (defense().upg ? 1 + .04 * (defense().upg.cleats || 0) : 1) * (F.turbo ? 1.35 * TUNE.turboPower : 1) * (F.human ? 1 : .9 + .1 * TUNE.cpuField);
const rSpeed = r => RSPEED * statF(r.p.spd) * TUNE.runSpeed * (offense().upg ? 1 + .04 * (offense().upg.cleats || 0) : 1) * (r.turbo ? 1.35 * TUNE.turboPower : 1) * (r.burner > 0 ? 1.8 : 1) * (r.human ? 1 : .92 + .08 * TUNE.cpuRun);
const tSpeed = F => THROW * statF(F.p.arm) * TUNE.throwSpeed * (defense().upg ? 1 + .05 * (defense().upg.arm || 0) : 1);
const catchR = F => 9 * statF(F.p.glv) * TUNE.catchRadius * (defense().upg ? 1 + (defense().upg.glove || 0) / 9 : 1);

/** the nine fielders at their spots for the coming pitch */
function setFielders() {
  const D = defense(), dp = M.park.ofDepth;
  const byPos = {}; for (const p of D.def.roster) if (p.pos !== 'RP') byPos[p.pos] = p;
  byPos.P = D.pitcher;
  M.fielders = POS_ORDER.map(pos => {
    const [ox, oy] = POS_SPOTS[pos], deep = ['LF', 'CF', 'RF'].includes(pos) ? dp : 0, d = Math.hypot(ox, oy) || 1;
    const x = HX + ox + (deep ? ox / d * deep : 0), y = HY + oy + (deep ? oy / d * deep : 0);
    const old = M.fielders.find(f => f.pos === pos && f.p === byPos[pos]);
    const F = old || { p: byPos[pos], pos, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, hasBall: false, job: 'idle', rig: null, stun: 0, dive: 0, vz: 0, climb: 0, turbo: false };
    Object.assign(F, { x, y, z: 0, homeX: x, homeY: y, job: 'idle', hasBall: false, tx: x, ty: y, base: 0, stun: 0, dive: 0, climb: 0, vz: 0, react: 0, hold: 0, human: false, cooldown: 0, facing: pos === 'C' ? -Math.PI / 2 : Math.PI / 2 });
    if (!HEADLESS || BZ.cosmetic) F.rig = makeRig(F.p, pos === 'C' ? 'catch' : 'field');
    return F;
  });
}
const fielder = pos => M.fielders.find(f => f.pos === pos);
const holderF = () => M.fielders.find(f => f.hasBall);

/* ---- assignment at contact ---- */
function interceptOf(F, pred, react) {
  const sp = fSpeed(F);
  for (const s of pred.samples) {
    if (s.z > 34 && !(s.z < 70 && F.pos !== 'C')) continue;
    if (s.z > 34) continue;
    const r = rOf(s.x, s.y), th = thetaOf(s.x, s.y);
    if (Math.abs(th) <= D45 && r > fenceR(M.park, th) - 4) continue;
    const ft = react + Math.hypot(s.x - F.x, s.y - F.y) / sp;
    if (ft <= s.t + .02) return { t: s.t, x: s.x, y: s.y };
  }
  const e = pred.end || pred.land; return { t: react + Math.hypot(e.x - F.x, e.y - F.y) / sp + 5, x: e.x, y: e.y };
}
function assignFielders(keepChaser) {
  if (!M.fielders.length) setFielders();
  const b = M.ball, pred = b.pred = predict(b, 6), react = M.diff.react / Math.max(.3, TUNE.cpuField);
  let best = null;
  for (const F of M.fielders) {
    if (F.pos === 'C' && rOf(pred.land.x, pred.land.y) > 120) continue;
    if (F.pos === 'P' && rOf(pred.land.x, pred.land.y) > 380 && b.z < 1) continue;
    const it = interceptOf(F, pred, F.human ? 0 : react);
    F.it = it; if (!best || it.t < best.it.t) best = F;
  }
  const th = thetaOf(pred.land.x, pred.land.y), deep = rOf(pred.land.x, pred.land.y) > 520;
  if (!best) best = nearestTo(pred.land.x, pred.land.y, null);
  const chaser = keepChaser && M.fielders.find(f => f.job === 'chase') || best;
  for (const F of M.fielders) { if (F.job !== 'chase' || F !== chaser) F.job = 'idle'; F.base = 0; }
  chaser.job = 'chase'; chaser.react = chaser.human ? 0 : react;
  const cover = (pos, base) => { const F = fielder(pos); if (F && F !== chaser) { F.job = 'cover'; F.base = base; } };
  cover('C', 4); cover('3B', 3); cover('1B', 1);
  if (chaser.pos === '1B') cover('P', 1);
  if (th < 0) { cover('2B', 2); if (chaser.pos === '3B') cover('SS', 3); else if (deep) { const F = fielder('SS'); if (F && F !== chaser) { F.job = 'cutoff'; } } }
  else { cover('SS', 2); if (deep) { const F = fielder('2B'); if (F && F !== chaser) F.job = 'cutoff'; } }
  if (chaser.pos === '2B' || chaser.pos === 'SS') cover(chaser.pos === '2B' ? 'SS' : '2B', 2);
  if (chaser.pos === '3B') cover('SS', 3);
  if (chaser.pos === 'C') cover('P', 4);
  for (const F of M.fielders) if (F.job === 'idle' && ['LF', 'CF', 'RF'].includes(F.pos)) F.job = 'backup';
  emit('chaser', { pos: chaser.pos });
  return chaser;
}

/* ---- the defense's human: who they control, and switching (L1) ---- */
function defHumanInput() { return inputOf(1 - M.half, 'field'); }
function pickControlled() {
  const I = defHumanInput(); for (const F of M.fielders) F.human = false;
  if (!I || M.cheats.autoplay) return null;
  const h = holderF(); const c = h || M.fielders.find(f => f.job === 'chase') || null;
  if (c) c.human = true; return c;
}

/* ---- each step of the defense ---- */
function fieldersStep(dt) {
  const b = M.ball, I = defHumanInput(), setting = game.settings.fielding || 'assisted';
  for (const F of M.fielders) {
    F.cooldown = Math.max(0, F.cooldown - dt); F.stun = Math.max(0, F.stun - dt); F.react = Math.max(0, F.react - dt);
    let tx = F.homeX, ty = F.homeY, run = 0, manual = false;
    if (F.human && I && setting !== 'auto' && !M.cheats.autoplay) {
      const mv = I.move(); F.turbo = I.down('l2') && turboUse(1 - M.half, dt);
      if (Math.hypot(mv[0], mv[1]) > .2 || setting === 'manual') { manual = true; const sp = fSpeed(F); F.vx = mv[0] * sp; F.vy = mv[1] * sp; }
    } else F.turbo = false;
    if (F.hasBall) {
      if (!manual) { F.vx = approach(F.vx, 0, 600 * dt); F.vy = approach(F.vy, 0, 600 * dt); if (F.runTo) { tx = F.runTo.x; ty = F.runTo.y; run = 1; } else { tx = F.x; ty = F.y; } }
    } else if (F.job === 'chase' && b && b.mode !== 'held' && b.mode !== 'dead') {
      if (F.react <= 0) { const it = F.it || { x: b.x, y: b.y }; tx = it.x; ty = it.y; run = 1; if (Math.hypot(b.x - F.x, b.y - F.y) < 40 && b.z < 40) { tx = b.x; ty = b.y; } }
      else { tx = F.x; ty = F.y; }
    } else if (F.job === 'cover') { const bp = basePos(F.base), off = F.base === 1 ? [-6, 0] : F.base === 3 ? [6, 0] : F.base === 4 ? [0, 8] : [0, 6]; tx = bp.x + off[0]; ty = bp.y + off[1]; run = 1; }
    else if (F.job === 'cutoff') { const ch = M.fielders.find(f => f.job === 'chase') || F; const tb = basePos(2); tx = lerp(ch.x, tb.x, .5); ty = lerp(ch.y, tb.y, .5); run = 1; }
    else if (F.job === 'backup' && b) { tx = lerp(F.homeX, b.x, .4); ty = lerp(F.homeY, b.y, .4); run = 1; }
    else if (F.job === 'tag' && F.tagRunner) { tx = F.tagRunner.x; ty = F.tagRunner.y; run = 1; }
    if (!manual) {
      if (F.stun > 0 || F.dive > 0) { /* sliding */ } else {
        const dx = tx - F.x, dy = ty - F.y, d = Math.hypot(dx, dy), sp = run ? fSpeed(F) : fSpeed(F) * .6;
        if (d > 2) { const v = Math.min(sp, d / dt); F.vx = approach(F.vx, dx / d * v, 1200 * dt); F.vy = approach(F.vy, dy / d * v, 1200 * dt); } else { F.vx = approach(F.vx, 0, 900 * dt); F.vy = approach(F.vy, 0, 900 * dt); }
      }
    }
    if (F.dive > 0) { F.dive -= dt; F.vx *= Math.exp(-dt * 3); F.vy *= Math.exp(-dt * 3); }
    F.x += F.vx * dt; F.y += F.vy * dt;
    // fielders stay inside the fence
    const th = thetaOf(F.x, F.y), r = rOf(F.x, F.y);
    if (Math.abs(th) <= D45 && !M.cheats.noclip) { const R0 = fenceR(M.park, th) - 6; if (r > R0) { F.x = HX + (F.x - HX) / r * R0; F.y = HY + (F.y - HY) / r * R0; } }
    // jumping and the wall climb
    if (F.vz || F.z > 0) { F.vz -= 700 * M.park.gravityMul * dt; F.z += F.vz * dt; if (F.z <= 0) { F.z = 0; F.vz = 0; F.climb = 0; } }
    if (Math.hypot(F.vx, F.vy) > 8) F.facing = Math.atan2(F.vy, F.vx);
    else if (b) F.facing = E.approachAng(F.facing, Math.atan2(b.y - F.y, b.x - F.x), dt * 6);
    // a human's athletic moves: dive (R2), jump or wall climb (R1)
    if (F.human && I && !F.hasBall && F.stun <= 0) {
      if (I.pressed('r2') && F.dive <= 0 && F.z === 0) { F.dive = .55; const a = F.facing; F.vx = Math.cos(a) * 190; F.vy = Math.sin(a) * 190; emit('dive', { pos: F.pos }); sfx('slide'); }
      if (I.pressed('r1') && F.z === 0) jumpOrClimb(F);
    }
    // CPU athletics: dive for a ball just out of reach, climb for a ball heading over the wall
    if (!F.human && F.job === 'chase' && b && b.mode === 'batted' && !b.bounced && F.z === 0 && F.dive <= 0) {
      const d = Math.hypot(b.x - F.x, b.y - F.y), cr = catchR(F);
      if (b.z < 30 && b.vz < 0 && d > cr && d < cr + 26 && b.z > 3 && R() < .5 * TUNE.cpuField) { const a = Math.atan2(b.y - F.y, b.x - F.x); F.dive = .55; F.vx = Math.cos(a) * 190; F.vy = Math.sin(a) * 190; emit('dive', { pos: F.pos }); }
      const thb = thetaOf(b.x, b.y), Rb = fenceR(M.park, clamp(thb, -D45, D45));
      if (Math.abs(thb) < D45 && rOf(F.x, F.y) > Rb - 30 && d < 40 && b.z > 30 && b.z < fenceH(M.park, thb) + 40 && rOf(b.x, b.y) > Rb - 50 && R() < .25 * TUNE.cpuField) jumpOrClimb(F);
    }
    if (b && !F.hasBall && F.stun <= 0 && (F.job === 'chase' || Math.hypot(b.x - F.x, b.y - F.y) < 14 || F.job === 'cover' || F.human)) tryCatch(F, b);
  }
}
function jumpOrClimb(F) {
  const th = thetaOf(F.x, F.y), R0 = fenceR(M.park, clamp(th, -D45, D45));
  if (Math.abs(th) <= D45 && rOf(F.x, F.y) > R0 - 24) { F.climb = 1; F.vz = 330 * (M.park.jumpMul > 1 ? 1.5 : 1) + (M.park.id === 'boneyard' && F.p.team === 'HMH' ? 60 : 0); emit('climb', { pos: F.pos }); sfx('slide', { pitch: 1.6 }); }
  else { F.vz = 260 * M.park.jumpMul; emit('jump', { pos: F.pos }); }
}
/** reach: the glove's height range, bigger in a jump, a climb or a dive */
function tryCatch(F, b) {
  if (b.mode === 'held' || b.mode === 'dead' || F.cooldown > 0) return;
  if (b.mode === 'thrown' && b.to !== F && Math.hypot(b.x - F.x, b.y - F.y) > 10) return;
  const d = Math.hypot(b.x - F.x, b.y - F.y), cr = catchR(F) * (F.dive > 0 ? 1.6 : 1), zTop = F.z + (F.climb ? 40 : F.z > 0 ? 36 : 34);
  if (d > cr || b.z > zTop || b.z < F.z - 4) return;
  if (b.mode === 'thrown') { if (b.t < b.T * .7 && b.to === F) return; return receive(F, b); }
  const air = !b.bounced && !b.touched, fast = Math.hypot(b.vx, b.vy, b.vz);
  let p = clamp(.985 + .006 * (F.p.glv - 5) - (fast > 600 ? .05 + (fast - 600) / 4000 : 0) - (F.dive > 0 ? .08 : 0) - (F.human ? 0 : .02 * (1 - TUNE.cpuField)) + (defense().upg ? .02 * (defense().upg.glove || 0) : 0), .5, .995);
  if (!air) p = Math.min(.995, p + .005);
  if (M.cheats.noErrors) p = 1;
  if (R() > p) { // an error: the ball pops loose
    b.touched = true; b.vz = 80; const a = R() * TAU; b.vx = Math.cos(a) * 60; b.vy = Math.sin(a) * 60; b.z = Math.max(b.z, 4); b.rolling = false; b.bounced = true;
    F.stun = .6; F.cooldown = .5; defense().errors++; if (M.play) M.play.error = true; emit('error', { pos: F.pos, x: F.x, y: F.y }); sfx('clang');
    if (b.fair === null) b.fair = Math.abs(thetaOf(b.x, b.y)) <= D45;
    return;
  }
  if (b.fair === null) b.fair = Math.abs(thetaOf(b.x, b.y)) <= D45;
  const wasFair = b.fair;
  holdBall(F, b);
  if (M.play && !M.play.firstFielder) M.play.firstFielder = F.pos;
  if (air && M.play) {
    M.play.caughtFly = true; emit('catch', { fly: true, dive: F.dive > 0, wall: F.climb > 0, pos: F.pos, robbed: F.climb > 0 && F.z > fenceH(M.park, thetaOf(F.x, F.y)) - 10, foul: !wasFair });
    sfx('glove'); flyCaught(F);
  } else { emit('fielded', { pos: F.pos }); sfx('glove'); if (!wasFair && M.play) { M.ball.foulDead = true; } }
}
function holdBall(F, b) {
  for (const f of M.fielders) f.hasBall = false;
  F.hasBall = true; b.mode = 'held'; b.holder = F; b.vx = b.vy = b.vz = 0; F.hold = 0; F.thinking = .06 + (F.human ? 0 : M.diff.react * .3); F.job = 'hold'; F.runTo = null; F.tagRunner = null;
  if (M.fielders.some(f => f.human)) pickControlled();
}
function receive(F, b) {
  const ok = M.cheats.noErrors || R() < .985 + .004 * (F.p.glv - 5);
  if (!ok) { b.mode = 'batted'; b.touched = true; b.bounced = true; b.vx = (R() - .5) * 120; b.vy = (R() - .5) * 120; b.vz = 40; defense().errors++; if (M.play) M.play.error = true; emit('error', { pos: F.pos, x: F.x, y: F.y }); F.stun = .4; F.cooldown = .4; assignFielders(); return; }
  holdBall(F, b); sfx('mitt'); emit('received', { pos: F.pos });
  outsAtBase(F);
}
/** the fielder with the ball at a base: force outs; and tags on runners within reach */
function outsAtBase(F) {
  for (let base = 1; base <= 4; base++) {
    const bp = basePos(base); if (Math.hypot(F.x - bp.x, F.y - bp.y) > 10) continue;
    for (const r of M.runners) {
      if (r.state === 'out' || r.state === 'scored') continue;
      const forcedHere = (r.forced && r.target === base && r.state === 'running') || (r.mustTag && r.tagBase === base && !r.tagged && r.state !== 'onBase');
      if (forcedHere) { const tgt = r.mustTag ? 'doubled' : 'force'; runnerOut(r, tgt, true); }
    }
  }
}
function tagCheck(F) {
  for (const r of M.runners) {
    if (r.state !== 'running' && r.state !== 'returning') continue;
    if (Math.hypot(r.x - F.x, r.y - F.y) < 10 && !onABase(r)) runnerOut(r, 'tag', r.forced && r.p === M.play?.batter && r.base === 0);
  }
}
const onABase = r => { for (let b = 1; b <= 4; b++) { const bp = basePos(b); if (Math.hypot(r.x - bp.x, r.y - bp.y) < 5) return true; } return false; };
function runnerOut(r, how, force) {
  if (r.state === 'out') return;
  const batterBefore1st = M.play && r.p === M.play.batter && r.base === 0;
  outMade(how, r, force || batterBefore1st);
  emit(how === 'tag' ? 'tagOut' : 'forceOut', { runner: r.p, base: r.target });
  if (M.play) { M.play.outCount = (M.play.outCount || 0) + 1; if (M.play.outCount === 2) emit('doublePlay', {}); if (M.play.outCount === 3) emit('triplePlay', {}); }
  sfx('ump');
}
function flyCaught(F) {
  const bat = M.runners.find(r => M.play && r.p === M.play.batter && r.state !== 'out');
  if (bat) { bat.forced = false; runnerOut(bat, 'fly', false); }
  else outMade('fly', null, false);
  for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored' && r !== bat) { r.mustTag = true; r.forced = false; if (r.base !== r.tagBase || r.prog > 0) { r.order = null; sendBack(r); } else { r.tagged = true; r.state = 'onBase'; } }
  meterGain(1 - M.half, F.dive > 0 || F.climb > 0 ? 20 : 3, 'catch');
}

/* ---- throws ---- */
function throwTo(F, base, o = {}) {
  const b = M.ball, bp = basePos(base), recv = coverAt(base) || nearestTo(bp.x, bp.y, F);
  const laser = !!o.laser, sp = laser ? 1400 : tSpeed(F) * (o.power === undefined ? 1 : .85 + .35 * o.power);
  let tx = bp.x, ty = bp.y; const wildP = laser ? 0 : (o.power > .85 ? (o.power - .85) * .8 : 0) + (F.human ? 0 : .01 * (1.2 - TUNE.cpuField));
  if (R() < wildP && !M.cheats.noErrors) { const a = R() * TAU, m = 30 + R() * 30; tx += Math.cos(a) * m; ty += Math.sin(a) * m; o.wild = true; }
  const d = Math.hypot(tx - F.x, ty - F.y), T = Math.max(.12, d / sp);
  F.hasBall = false; F.cooldown = .4; F.throwAnim = .35; F.job = 'idle';
  Object.assign(b, { mode: 'thrown', from: { x: F.x, y: F.y, z: 22 }, toPt: { x: tx, y: ty, z: 20 }, T, t: 0, to: recv, holder: null, laser, x: F.x, y: F.y, z: 22, apexT: laser ? 2 : clamp(d / 40, 6, 40) });
  if (recv && recv !== F) { recv.job = 'cover'; recv.base = base; }
  emit('throw', { base, laser, wild: !!o.wild, from: F.pos }); sfx(laser ? 'laser' : 'whoosh', { pitch: 1.3 });
}
const coverAt = base => M.fielders.find(f => f.job === 'cover' && f.base === base && !f.hasBall);
const nearestTo = (x, y, not) => M.fielders.filter(f => f !== not).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
function thrownStep(b, dt) {
  b.t += dt; const u = Math.min(1, b.t / b.T);
  b.x = lerp(b.from.x, b.toPt.x, u); b.y = lerp(b.from.y, b.toPt.y, u); b.z = lerp(b.from.z, b.toPt.z, u) + 4 * u * (1 - u) * b.apexT;
  b.vx = (b.toPt.x - b.from.x) / b.T; b.vy = (b.toPt.y - b.from.y) / b.T; b.vz = 0;
  if (u >= 1) { // nobody took it: it drops and rolls on
    const recv = b.to; if (recv && Math.hypot(recv.x - b.x, recv.y - b.y) < catchR(recv) + 6 && !recv.hasBall) return receive(recv, b);
    b.mode = 'batted'; b.bounced = true; b.touched = true; b.vz = 30; b.vx *= .3; b.vy *= .3; b.rolling = false; b.fair = true; assignFielders();
  }
}
/** the CPU's (and the assisted human's) choice of throw: the lead runner it can get, else hold the runners */
function decideThrow(F) {
  const opts = [];
  for (const r of M.runners) {
    if (r.state !== 'running' && r.state !== 'returning') continue;
    const tb = r.state === 'returning' ? r.tagBase : r.target, bp = basePos(tb), rt = runnerTimeLeft(r);
    const nearBase = Math.hypot(F.x - bp.x, F.y - bp.y) < 8;
    const tt = nearBase ? 0 : .22 + Math.hypot(F.x - bp.x, F.y - bp.y) / tSpeed(F);
    const forced = (r.forced && r.state === 'running') || (r.mustTag && r.state === 'returning');
    const need = forced ? 0 : .35;   // a tag needs the ball there a bit sooner
    if (tt + need < rt) opts.push({ base: tb, score: tb * 10 + (forced ? 5 : 0) - tt, r, nearBase });
  }
  opts.sort((a, b) => b.score - a.score);
  if (opts.length) return opts[0];
  const lead = M.runners.filter(r => r.state === 'running').sort((a, b) => b.target - a.target)[0];
  if (lead && rOf(F.x, F.y) > 470) return { base: Math.min(4, lead.target + (lead.prog > .6 ? 1 : 0)), hold: true };
  if (rOf(F.x, F.y) > 470) return { base: 2, hold: true };
  return null;
}
function holderStep(F, dt) {
  const b = M.ball; b.x = F.x + Math.cos(F.facing) * 4; b.y = F.y + Math.sin(F.facing) * 4; b.z = F.z + 16;
  F.hold += dt; F.thinking -= dt;
  outsAtBase(F); tagCheck(F);
  const I = F.human ? defHumanInput() : null;
  if (I) {
    const base = basePressed(I), laser = I.down('r1') && defense().meter >= 50;
    if (base) { if (laser) { defense().meter -= M.cheats.infMeter ? 0 : 50; emit('super', { kind: 'laser', team: 1 - M.half }); } throwTo(F, base, { laser, power: .7 }); return; }
    const mb = mouseBase(I); if (mb) { throwTo(F, mb, { power: .7 }); return; }
    if ((game.settings.fielding || 'assisted') === 'manual' || F.hold < 1.6) return;
  }
  if (F.thinking > 0) return;
  const choice = decideThrow(F);
  if (!choice) { F.runTo = null; return; }
  if (choice.nearBase) { const bp = basePos(choice.base); F.runTo = { x: bp.x, y: bp.y }; return; }
  // close enough to run it there itself (a tag or a force on the bag)
  const bp = basePos(choice.base);
  if (Math.hypot(F.x - bp.x, F.y - bp.y) < 30 && !choice.hold) { F.runTo = { x: bp.x, y: bp.y }; return; }
  if (choice.hold && F.hold < .5) return;
  if (choice.hold && rOf(F.x, F.y) < 470) return;
  throwTo(F, choice.base, { power: .75 });
}
/** the mouse: a click on a base in the field throws there (only on a base: a stray click never throws) */
function mouseBase(I) {
  if (I !== game.input || !BZ.mouseWorld) return 0;
  const c = I.clicked && I.clicked(); if (!c) return 0;
  const w = BZ.mouseWorld(c[0], c[1]); if (!w) return 0;
  for (let k = 1; k <= 4; k++) { const bp = basePos(k); if (Math.hypot(w[0] - bp.x, w[1] - bp.y) < 30) return k; }
  return 0;
}

/* ---- baserunners ---- */
function runnerTimeLeft(r) {
  const tb = r.state === 'returning' ? r.tagBase : r.target, bp = basePos(tb);
  return Math.hypot(bp.x - r.x, bp.y - r.y) / rSpeed(r);
}
function sendBack(r) { r.state = 'returning'; r.from = r.base; }
function startRunners() {
  const bat = batterNow();
  for (const r of M.runners) { r.tagBase = r.base; r.mustTag = false; r.tagged = false; r.order = null; r.halfway = false; r.startBase = r.base; }
  const occ = [1, 2, 3].map(k => !!runnerOn(k));
  const br = addRunner(bat, 0); br.target = 1; br.state = 'running'; br.forced = true; br.delay = .35; br.startBase = 0; br.tagBase = 0;
  for (const r of M.runners) if (r !== br) r.forced = r.base === 1 || (r.base === 2 && occ[0]) || (r.base === 3 && occ[0] && occ[1]);
  const air = M.ball && M.ball.vz > 60 && !M.ball.bounced;
  for (const r of M.runners) if (r !== br) {
    r.from = r.base;
    if (air) { r.halfway = true; r.state = 'running'; r.target = r.base + 1; }
    else if (r.forced || r.steal) { r.state = 'running'; r.target = r.base + 1; }
    else { r.state = 'onBase'; }
  }
  pStat(bat);
}
function runnersStep(dt) {
  const I = inputOf(M.half, 'run'), b = M.ball;
  // human orders: R1 all go, L1 all back; with a base button only the runner heading there
  if (I && !M.cheats.autoplay && M.phase === 'inPlay') {
    const go = I.pressed('r1'), back = I.pressed('l1'), base = basePressed(I);
    if (go || back) {
      for (const r of M.runners) if (r.state === 'onBase' || r.state === 'running' || r.state === 'returning') {
        if (base && r.target !== base && r.base + 1 !== base) continue;
        r.order = go ? 'go' : 'back'; if (go && r.state === 'onBase' && r.base < 4) { r.state = 'running'; r.target = r.base + 1; r.from = r.base; r.halfway = false; }
        if (back && (r.state === 'running') && !r.forced) sendBack(r);
      }
      if (go) emit('order', { go: true }); else emit('order', { go: false });
    }
    const mb = mouseBase(I); if (mb) { const r = M.runners.find(r => (r.state === 'onBase' || r.state === 'running') && (r.base + 1 === mb || r.target === mb)); if (r) { r.order = 'go'; if (r.state === 'onBase') { r.state = 'running'; r.target = mb; r.from = r.base; r.halfway = false; } emit('order', { go: true }); } }
    const burner = I.down('r1') && I.down('l2') && offense().meter >= 50 && !M.burnUsed;
    if (burner) { M.burnUsed = true; offense().meter -= M.cheats.infMeter ? 0 : 50; for (const r of M.runners) r.burner = 3; emit('super', { kind: 'burners', team: M.half }); sfx('rocket'); }
  }
  for (const r of M.runners) {
    if (r.state === 'out' || r.state === 'scored') continue;
    r.human = !!I; r.burner = Math.max(0, (r.burner || 0) - dt);
    r.turbo = (I && I.down('l2') && turboUse(M.half, dt)) || (!I && r.state === 'running' && runnerTimeLeft(r) < 1.2 && offense().turbo > 30 && turboUse(M.half, dt));
    if (r.delay > 0) { r.delay -= dt; continue; }
    if (r.state === 'onBase') {
      if (r.mustTag) r.tagged = true;
      // AI: tag up after a deep catch, or advance when the ball is loose in the outfield
      if (!r.order && !(I && game.settings.baserunning === 'manual') && aiShouldGo(r)) { r.state = 'running'; r.target = Math.min(4, r.base + 1); r.from = r.base; r.mustTag = false; }
      continue;
    }
    if (r.state === 'running' && r.halfway && !r.order) {
      const from = basePos(r.base), to = basePos(r.target), seg = Math.hypot(to.x - from.x, to.y - from.y), done = Math.hypot(r.x - from.x, r.y - from.y) / seg;
      if (b && b.mode === 'batted' && !b.bounced && !b.touched) { if (done > .35) continue; }
      else r.halfway = false;
    }
    if (r.state === 'running' && !r.forced && !r.order && b && b.mode === 'held' && aiShouldReturn(r)) sendBack(r);
    const tb = r.state === 'returning' ? r.tagBase : r.target, bp = basePos(tb), dx = bp.x - r.x, dy = bp.y - r.y, d = Math.hypot(dx, dy), sp = rSpeed(r);
    if (d <= sp * dt + .5) {
      r.x = bp.x; r.y = bp.y;
      if (r.state === 'returning') { r.base = tb; r.state = 'onBase'; r.tagged = true; r.order = null; continue; }
      r.base = tb; r.forced = false; r.order = r.order === 'go' ? null : r.order; r.halfway = false;
      if (tb === 4) { scoreRun(r); continue; }
      r.state = 'onBase';
      if (r.p === M.play?.batter) r.reached = tb;
      // keep going? (the AI's time race)
      if (!r.order && !(I && game.settings.baserunning === 'manual') && aiShouldGo(r)) { r.state = 'running'; r.target = tb + 1; r.from = tb; }
      continue;
    }
    if (d < 28 && !r.slid && holderNear(bp, 120)) { r.slid = true; r.slide = .5; emit('slide', { base: tb }); sfx('slide'); }
    if (r.slide > 0) r.slide -= dt;
    r.x += dx / d * sp * dt; r.y += dy / d * sp * dt; r.facing = Math.atan2(dy, dx);
    // the bowl-over at home: a turbo runner into a catcher holding the ball
    if (tb === 4 && r.turbo && d < 14) { const C = M.fielders.find(f => f.hasBall && Math.hypot(f.x - bp.x, f.y - bp.y) < 14); if (C) bowlOver(r, C); }
  }
}
const holderNear = (bp, d) => { const h = holderF(); const b = M.ball; return (h && Math.hypot(h.x - bp.x, h.y - bp.y) < d) || (b && b.mode === 'thrown' && Math.hypot(b.toPt.x - bp.x, b.toPt.y - bp.y) < 20); };
function bowlOver(r, C) {
  const roll = r.p.pow + 1 + Math.floor(R() * 6), def = C.p.pow + 2 + Math.floor(R() * 6);
  emit('bowlOver', { runner: r.p, won: roll > def }); sfx('crash'); game.shake(4); meterGain(roll > def ? M.half : 1 - M.half, 10, 'collision');
  if (roll > def) { C.hasBall = false; C.stun = 1.2; const b = M.ball; b.mode = 'batted'; b.bounced = true; b.touched = true; b.vx = (R() - .5) * 140; b.vy = 60; b.vz = 70; b.z = 10; }
  else { runnerOut(r, 'tag', false); }
  if (M.rhubarbs && R() < .25 * TUNE.rhubarbChance / .4) M.pendingRhubarb = true;
}
/** the AI runner's time race: go if it beats the ball to the next base by its margin */
function aiShouldGo(r) {
  if (r.base >= 4) return false;
  const next = r.base + 1, occ = M.runners.find(o => o !== r && o.state !== 'out' && o.state !== 'scored' && (o.base === next && o.state === 'onBase'));
  if (occ) return false;
  if (r.mustTag && !r.tagged) return false;
  const b = M.ball; if (!b || b.mode === 'dead') return false;
  const bp = basePos(next), rt = Math.hypot(bp.x - r.x, bp.y - r.y) / rSpeed(r);
  let bt;
  if (b.mode === 'held') { const h = holderF(); bt = h ? .3 + Math.hypot(h.x - bp.x, h.y - bp.y) / tSpeed(h) : 0; if (h && rOf(h.x, h.y) < 470 && r.mustTag !== true) bt = Math.min(bt, 1); }
  else if (b.mode === 'thrown') bt = (b.T - b.t) + Math.hypot(b.toPt.x - bp.x, b.toPt.y - bp.y) / THROW;
  else { if (!b.bounced && !b.touched) return false; const ch = M.fielders.find(f => f.job === 'chase') || nearestTo(b.x, b.y); bt = Math.hypot(ch.x - b.x, ch.y - b.y) / FSPEED + .4 + Math.hypot(b.x - bp.x, b.y - bp.y) / THROW; }
  const margin = (r.mustTag ? .1 : .45) / Math.max(.4, TUNE.cpuRun) + (next === 4 ? .15 : 0);
  return rt + margin < bt;
}
function aiShouldReturn(r) {
  const h = holderF(); if (!h) return false;
  const bp = basePos(r.target), back = basePos(r.base), ahead = Math.hypot(bp.x - r.x, bp.y - r.y) / rSpeed(r), ball = .25 + Math.hypot(h.x - bp.x, h.y - bp.y) / tSpeed(h);
  const behind = Math.hypot(back.x - r.x, back.y - r.y) / rSpeed(r);
  return ahead > ball + .1 && behind < ahead;
}
function turboUse(s, dt) { const t = M.teams[s]; if (M.cheats.infTurbo) return true; if (t.turbo <= 0) return false; t.turbo = Math.max(0, t.turbo - 40 * TUNE.turboDrain * dt); return true; }
