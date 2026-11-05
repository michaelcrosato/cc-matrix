/* THE MATCH: its phases (pregame, halfStart, walkUp, select, windup, flight, afterPitch, inPlay, homer, playOver,
 * halfEnd, rhubarb, final), the human and CPU sides of the duel at the plate, steals, wild pitches, the home-run trot,
 * and the update order. The simulation runs only in matchUpdate (fixed steps); drawing only reads M. */
const PH = { pregame: 2.2, halfStart: 1.6, walkUp: .9, afterPitch: .8, playOver: 1.1, halfEnd: 2.4, homer: 4.2 };
const phT = k => M.fast ? 0 : PH[k];
function setPhase(p) { M.phase = p; M.phaseT = 0; emit('phase', { phase: p }); }
const batIn = () => inputOf(M.half, 'bat'), pitIn = () => inputOf(1 - M.half, 'pitch');
const autoBat = () => !batIn() || M.cheats.autoplay, autoPit = () => !pitIn() || M.cheats.autoplay;

function matchUpdate(dt) {
  if (!M || M.over && M.phase === 'final') return;
  M.t += dt; M.phaseT += dt; if (M.play) M.play.t += dt;
  for (const t of M.teams) { if (M.cheats.infMeter) t.meter = 100; if (M.cheats.infTurbo) t.turbo = 100; }
  hazardStep(dt);
  if (M.derby) { derbyTick(dt); if (M.derby.done && M.phase !== 'final' && M.phase !== 'inPlay') return toFinal(); }
  switch (M.phase) {
    case 'pregame': if (M.phaseT >= phT('pregame') || skipPressed()) { setPhase('halfStart'); halfStartSetup(); } break;
    case 'halfStart': if (M.phaseT >= phT('halfStart') || skipPressed()) { setPhase('walkUp'); emit('batterUp', { batter: batterNow() }); } break;
    case 'walkUp': reticleStep(dt); if (M.phaseT >= phT('walkUp')) beginSelect(); break;
    case 'select': selectStep(dt); break;
    case 'windup': windupStep(dt); break;
    case 'flight': flightStep(dt); break;
    case 'afterPitch': reticleStep(dt); if (M.phaseT >= phT('afterPitch')) afterPitchDone(); break;
    case 'inPlay': inPlayStep(dt); recordFrame(dt); break;
    case 'homer': homerStep(dt); recordFrame(dt); break;
    case 'playOver': if (M.phaseT >= phT('playOver')) playOverDone(); else { fieldersIdle(dt); } break;
    case 'halfEnd': if (M.phaseT >= phT('halfEnd') + (M.show ? M.show.len : 0) || (M.phaseT > .6 && skipPressed())) halfEndDone(); break;
    case 'rhubarb': rhubarbStep(dt); break;
    case 'replay': replayStep(dt); break;
  }
  for (const t of M.teams) t.turbo = Math.min(100, t.turbo + 10 * dt);
}
function skipPressed() { if (M.fast) return true; for (const I of game.players) if (I.pressed('south') || I.pressed('confirm')) { I.consumeAll(); return true; } return false; }
function halfStartSetup() {
  setFielders(); M.runners = []; M.burnUsed = false;
  if (M.bonusRunner && !M.derby) { const o = offense(), prev = o.lineup[(o.order + 8) % 9]; addRunner(prev, 2); emit('bonusRunner', {}); }
  emit('halfStart', { inning: M.inning, half: M.half });
  if (M.boss && M.boss.circuit > 0) M.boss.circuit--;
}
function beginSelect() {
  setPhase('select'); M.pickTried = false; M.pitch = null; M.swing = null; M.ball = null; M.bunting = false; M.cpuSel = null; M.cpuBat = null; M.relPress = null; M.sel = M.sel || 0;
  for (const r of M.runners) { r.steal = false; r.lead = 0; }
  const D = defense(), pit = D.pitcher;
  // the CPU calls the bullpen when its pitcher is spent
  if (!pitIn() && stamOf(1 - M.half, pit) < 20 && D.bullpen.length) pitchingChange(1 - M.half);
  else if (pitIn() && stamOf(1 - M.half, pit) < 20 && D.bullpen.length && !M.toldBullpen) { M.toldBullpen = true; emit('bullpenReady', {}); }
  for (const t of M.teams) t.turbo = Math.min(100, t.turbo + 15);
  // the Tour's scripted Rhubarb at Caldera Field: Iggy plunks one in the 2nd inning
  if (M.tour && M.tour.scriptedRhubarb && !M.tour.rhubarbDone && M.inning >= Math.min(2, M.innings) && M.rhubarbs && !M.fast) { M.tour.rhubarbDone = true; emit('hbpHit', { hard: true, scripted: true }); startRhubarb(() => { walk(true); return 'walk'; }, batterNow()); return; }
  M.target.x = 0; M.target.z = 17; M.reticle.x = 0; M.reticle.z = 17;
}
function pitchingChange(s) {
  const T = M.teams[s]; if (!T.bullpen.length) return false;
  const old = T.pitcher; T.pitcher = T.bullpen.shift(); T.stamina[T.pitcher.id] = T.stamina[T.pitcher.id] || 100;
  const F = M.fielders.find(f => f.pos === 'P'); if (F && s === 1 - M.half) { F.p = T.pitcher; F.rig = HEADLESS && !BZ.cosmetic ? null : makeRig(T.pitcher, 'field'); }
  emit('pitchingChange', { team: s, out: old, in: T.pitcher }); return true;
}

/* ---- before the pitch: the pitcher picks (a face button; R1 the super); the batter may arm the Batzooka or order a steal ---- */
function selectStep(dt) {
  reticleStep(dt);
  const s = 1 - M.half, D = defense(), pit = D.pitcher, list = pitchesOf(pit);
  // the offense: Batzooka (R1), steals (L1 held + a base button)
  const BI = batIn();
  if (BI && !M.cheats.autoplay) {
    if (BI.pressed('r1') && offense().meter >= 100 && !M.armed) { M.armed = true; emit('armed', {}); sfx('charge'); }
    else if (BI.pressed('r1') && offense().meter < 100) { for (const r of M.runners) if (r.state === 'onBase' && r.base < 3) r.lead = 12; emit('lead', {}); }
    if (BI.down('l1')) { const b = basePressed(BI); if (b >= 2) { const r = runnerOn(b - 1); if (r && !runnerOn(b)) { r.steal = true; emit('stealCall', { base: b }); } } }
  } else if (!M.cpuStealDone) {
    M.cpuStealDone = true;
    const r1 = runnerOn(1), r2 = runnerOn(2);
    if (r1 && !r2 && r1.p.spd >= 7 && M.outs < 2 && R() < .14 * TUNE.cpuRun) r1.steal = true;
    if (offense().meter >= 100 && !M.cheats.noCpuSuper && (M.runners.length || M.inning >= M.innings) && R() < .7) M.armed = true;
  }
  leadStep();
  if (autoPit()) {
    if (!M.cpuSel && !M.derby && !M.pickTried && !(M.force && M.force.nextPitch)) { M.pickTried = true; const r1 = runnerOn(1); if (r1 && r1.p.spd >= 7 && R() < .05 + (r1.lead ? .25 : 0)) tryPickoff(1, true); }
    if (!M.cpuSel) M.cpuSel = M.derby ? derbyPitchChoice() : Object.assign(cpuPitchChoice(), { wait: M.fast ? 0 : .5 + R() * .5 });
    M.cpuSel.wait -= dt; if (M.cpuSel.wait <= 0) startWindup(M.cpuSel.type, true);
    return;
  }
  const I = pitIn();
  const slots = ['south', 'east', 'west', 'north'];
  if (I.down('l1')) { const b = basePressed(I); if (b && b < 4) { I.consumeAll(); tryPickoff(b, false); } return; }
  if (I.lastDevice === 'mouse' && I.pressed('south')) { I.consume('south'); startWindup(list[M.sel] || 'heater', false, 'south'); return; }
  for (let i = 0; i < 4; i++) if (I.pressed(slots[i]) || I.pressed('num' + (i + 1))) { M.sel = i; I.consume(slots[i]); startWindup(list[i] || 'heater', false, slots[i]); return; }
  if ((I.pressed('r1') || I.pressed('num5')) && D.meter >= 100) { startWindup(TEAMS[pit.team].superPitch, false, 'r1'); return; }
  // the mouse wheel picks a pitch, the left button throws it
  if (BZ.wheel) { M.sel = (M.sel + BZ.wheel + 4) % 4; BZ.wheel = 0; sfx('menu'); }
}
function startWindup(type, cpu, btn) {
  setPhase('windup'); M.pitchType = type; M.relBtn = btn; M.relPress = null;
  const pit = defense().pitcher, tempo = clamp(1.1 - .02 * pit.vel, .8, 1.1) * (M.boss && M.boss.circuit > 0 && TEAMS[pit.team].boss ? 1.3 : 1);
  M.windT = M.fast ? 0 : .9 * tempo;
  if (cpu) { M.target.x = M.cpuSel.x; M.target.z = M.cpuSel.z; }
  else if (game.settings.pitchAssist === 'auto') { const c = cpuPitchChoice(); M.target.x = clamp(c.x, -7, 7); M.target.z = c.z; }
  for (const r of M.runners) if (r.steal) { r.state = 'running'; r.target = r.base + 1; r.from = r.base; r.forced = false; r.tagBase = r.base; }
  emit('windup', { type, cpu });
}
function windupStep(dt) {
  reticleStep(dt);
  const I = autoPit() ? null : pitIn();
  if (I) {
    const mv = I.move(); M.target.x = clamp(M.target.x + mv[0] * 22 * dt, -14, 14); M.target.z = clamp(M.target.z - mv[1] * 22 * dt, 1, 36);
    if (I === game.input && I.lastDevice === 'mouse' && BZ.zoneFromPointer) { const z = BZ.zoneFromPointer(); if (z) { M.target.x = clamp(z[0], -14, 14); M.target.z = clamp(z[1], 1, 36); } }
    const ringStart = M.windT - .45;
    if (M.relPress === null && M.phaseT >= ringStart - .05 && (I.pressed('south') || I.pressed('east') || I.pressed('west') || I.pressed('north') || I.pressed('r1') || [1, 2, 3, 4, 5].some(n => I.pressed('num' + n)))) M.relPress = M.phaseT;
  }
  for (const r of M.runners) if (r.steal && r.state === 'running') runnerAdvanceTick(r, dt);
  if (M.phaseT >= M.windT) {
    let q;
    if (autoPit()) q = M.cpuSel ? M.cpuSel.q : .7;
    else if (M.relPress === null) q = .3;
    else { const e = Math.abs(M.relPress - M.windT), w = .04 * TUNE.releaseWindow; q = e <= w ? 1 : clamp(1 - (e - w) / (.2 - w), 0, 1); }
    M.relQ = q;
    const forced = M.force && M.force.nextPitch; if (forced) M.force.nextPitch = null;
    throwPitch(forced ? forced.type || M.pitchType : M.pitchType, forced && forced.x !== undefined ? forced.x : M.target.x, forced && forced.z !== undefined ? forced.z : M.target.z, forced && forced.q !== undefined ? forced.q : q, { cpu: autoPit(), forced: !!forced, x: forced && forced.x, z: forced && forced.z });
    setPhase('flight');
    if (autoBat()) M.cpuBat = cpuBatPlan();
  }
}
function runnerAdvanceTick(r, dt) { const bp = basePos(r.target), dx = bp.x - r.x, dy = bp.y - r.y, d = Math.hypot(dx, dy), sp = rSpeed(r); if (d > 1) { r.x += dx / d * Math.min(d, sp * dt); r.y += dy / d * Math.min(d, sp * dt); r.facing = Math.atan2(dy, dx); } }

/* ---- the reticle: the stick (eased), or the mouse placing it; the CPU's moves to its read ---- */
function reticleStep(dt) {
  const I = autoBat() ? null : batIn(), ret = M.reticle;
  if (I) {
    const mv = I.move(); ret.x = clamp(ret.x + mv[0] * 80 * dt, -12, 12); ret.z = clamp(ret.z - mv[1] * 80 * dt, 3, 31);
    if (I === game.input && I.lastDevice === 'mouse' && BZ.zoneFromPointer) { const z = BZ.zoneFromPointer(); if (z) { ret.x = clamp(z[0], -12, 12); ret.z = clamp(z[1], 3, 31); } }
  } else if (M.cpuBat && M.pitch && M.pitch.t > M.cpuBat.react) {
    const [ax, az] = M.cpuBat.aim, d = Math.hypot(ax - ret.x, az - ret.z), s = 160 * dt;
    if (d > s) { ret.x += (ax - ret.x) / d * s; ret.z += (az - ret.z) / d * s; } else { ret.x = ax; ret.z = az; }
  } else if (!I) { ret.x = approach(ret.x, 0, 30 * dt); ret.z = approach(ret.z, 17, 30 * dt); }
}

/* ---- the pitch in flight: swings, bunts, aftertouch, the crossing and the call ---- */
function flightStep(dt) {
  const pt = M.pitch; pt.t += dt; const u = pt.t / pt.T;
  reticleStep(dt);
  for (const r of M.runners) if (r.steal && r.state === 'running') runnerAdvanceTick(r, dt);
  // aftertouch: the first 40% of the flight
  const PI_ = autoPit() ? null : pitIn();
  if (u < .4) {
    if (PI_) { const mv = PI_.move(), lim = 4 * statF(pt.by.brk) * TUNE.aftertouch, k = 14 * TUNE.aftertouch * dt; if (Math.hypot(mv[0], mv[1]) > .3) { pt.after += dt; pt.cross.x = clamp(pt.cross.x + mv[0] * k, HX + M.target.x - lim - 6, HX + M.target.x + lim + 6); pt.cross.z = clamp(pt.cross.z - mv[1] * k * .75, M.target.z - 3 - 6, M.target.z + 3 + 6); } }
    else if (M.cpuSel && R() < M.diff.after * dt * 2) pt.cross.x += (R() - .5) * 2;
  }
  // the batter
  const BI = autoBat() ? null : batIn();
  if (BI) {
    if (BI.down('north') && !M.swing) { M.bunting = true; }
    else M.bunting = false;
    if (!M.swing && !M.bunting) { if (BI.pressed('south')) startSwing('contact', true); else if (BI.pressed('west')) startSwing('power', true); }
  } else if (M.cpuBat && M.cpuBat.swing) {
    if (M.cpuBat.kind === 'bunt') M.bunting = u > .3;
    else if (!M.swing && pt.t >= M.cpuBat.at) startSwing(M.cpuBat.kind, false);
  }
  if (M.swing && !M.swing.done && pt.t >= M.swing.at + SWINGS[M.swing.kind].delay) {
    M.swing.done = true; const res = resolveSwing();
    if (res === 'contact') return contactMade();
    if (res === 'foul') { if (M.derby) { derbyOut('FOUL TIP'); return endPitch('out'); } const c = callFoul(false); M.swing.result = 'foul'; return endPitch(c); }
  }
  if (u >= 1 && !pt.crossed) {
    pt.crossed = true;
    if (M.bunting) { const res = resolveBunt(); M.swing = { kind: 'bunt', done: true, at: pt.t }; if (res === 'contact') return contactMade(); M.swing.result = 'miss'; }
  }
  // the call waits for a late swing still on its way (a swing inside the window can still connect after the crossing)
  if (pt.crossed && !pt.called && !(M.swing && !M.swing.done)) {
    pt.called = true; const cr = pitchPos(pt, 1), b = batterNow();
    emit('pitchCross', { x: cr.x - HX, z: cr.z, inZone: inZone(cr.x, cr.z, b) });
    M.lastCross = { x: cr.x - HX, z: cr.z, t: M.t };
    if (M.derby) return derbyCross(cr, !!M.swing, inZone(cr.x, cr.z, b));
    if (M.swing && M.swing.kind === 'bunt') { pt.call = callStrike(true, true); }
    else if (M.swing) { pt.call = callStrike(true); if (M.swing.kind === 'batzooka') emit('fizzle', {}); }
    else if (hitsBatter(cr.x, cr.z, b)) { pt.call = 'hbp'; return hitByPitch(); }
    else pt.call = inZone(cr.x, cr.z, b) ? callStrike(false) : callBall();
  }
  if (u >= 1.12 && pt.called) {
    const cr = pitchPos(pt, 1), wild = (Math.abs(cr.x - HX) > 16 || cr.z < 2 || cr.z > 36);
    sfx('mitt'); emit('caught', {});
    if (wild && M.runners.some(r => r.state === 'onBase') && R() < .35 * (1 - (defense().def.roster.find(p => p.pos === 'C').glv) / 10) && !M.derby) { wildPitch(); }
    endPitch(pt.call);
  }
}
function wildPitch() {
  emit('wildPitch', {});
  for (const r of M.runners.slice().sort((a, b) => b.base - a.base)) if (r.state === 'onBase') { if (r.base === 3) scoreRun(r); else if (!runnerOn(r.base + 1)) { r.base++; placeRunner(r); } }
}
function hitByPitch() {
  const hard = M.pitch.speed >= .9 * BASE_SPEED; sfx('thump'); game.shake(2);
  emit('hbpHit', { hard });
  const b = batterNow();
  if (M.rhubarbs && hard && (R() < TUNE.rhubarbChance || M.forceRhubarb || (M.tour && M.tour.scriptedRhubarb && !M.tour.rhubarbDone))) { if (M.tour) M.tour.rhubarbDone = true; M.forceRhubarb = false; startRhubarb(() => { walk(true); return 'walk'; }, b); return; }
  walk(true); endPitch('walk');
}
function endPitch(call) { M.lastCall = call; checkWalkoff(); setPhase('afterPitch'); }
function checkWalkoff() { if (M.walkoff && !M.over) { M.over = true; M.winner = 1; emit('gameEnd', { winner: 1, walkoff: true }); emit('walkoff', { team: 1 }); } }
function afterPitchDone() {
  // a steal: the catcher has the ball and throws
  const stealing = M.runners.filter(r => r.steal && r.state === 'running');
  if (stealing.length && M.outs < 3) { startStealPlay(); return; }
  for (const r of M.runners) if (r.steal) { r.steal = false; }
  if (M.derby) { if (M.derby.done) return toFinal(); M.balls = 0; M.strikes = 0; return beginSelect(); }
  if (M.outs >= 3) return toHalfEnd();
  if (M.over) return toFinal();
  if (M.lastCall === 'walk' || M.lastCall === 'k' || M.lastCall === 'hbp') { setPhase('walkUp'); M.cpuStealDone = false; return; }
  beginSelect();
}
function startStealPlay() {
  const C = fielder('C'), b = M.ball = { x: C.x, y: C.y, z: 16, vx: 0, vy: 0, vz: 0, mode: 'held', holder: C, bounced: true, touched: true, fair: true, trail: [], t: 0 };
  M.play = { batter: batterNow(), runs: [], outs: [], steal: true, noRbi: true, t: 0, id: ++M.playId };
  for (const F of M.fielders) { F.job = 'idle'; F.hasBall = false; }
  C.hasBall = true; C.hold = 0; C.thinking = M.diff.react; b.holder = C;
  const r = M.runners.find(r => r.steal && r.state === 'running'), base = r ? r.target : 2;
  // the covering man: the second baseman takes a steal of second against a righty, the shortstop against a lefty
  const F = fielder(base === 2 ? (batterNow().bats === 'L' ? 'SS' : '2B') : base === 3 ? '3B' : 'C'); if (F) { F.job = 'cover'; F.base = base; }
  for (const r of M.runners) r.startBase = r.base;
  pickControlled(); M.cam = 'broadcast'; setPhase('inPlay');
}

/* ---- contact: the ball is live ---- */
function contactMade() {
  const b = M.ball; M.cam = 'broadcast'; sfx(b.kind === 'batzooka' ? 'krakoom' : b.Q > .6 ? 'crack' : 'tink');
  if (!M.fast) { game.freeze(b.kind === 'batzooka' ? .14 : .06); if (b.kind === 'batzooka') game.flash('#ffd36a', .15); else game.flash('#ffffff', .05, .5); game.shake(b.kind === 'batzooka' ? 6 : 1.5); for (const I of game.players) I.rumble(b.Q, .12); }
  meterGain(M.half, 6 + 9 * b.Q, 'contact');
  for (const r of M.runners) { r.startBase = r.base; r.startX = r.x; r.startY = r.y; }
  if (M.derby) { setPhase('inPlay'); return; }
  startRunners(); assignFielders(); pickControlled();
  setPhase('inPlay');
}
function inPlayStep(dt) {
  const b = M.ball;
  if (M.derby) return derbyBallStep(dt);
  if (b.mode === 'batted') {
    const ev = ballStep(b, dt, false);
    if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 24) b.trail.shift(); }
    hazardBall(b, dt);
    if (ev === 'homer' || ev === 'pole') return homeRun(ev === 'pole');
    if (ev === 'grd') return groundRuleDouble();
    if (ev === 'outFoul' || (b.fair === false && (b.bounced || b.stopped))) return foulBall();
    if (ev === 'fence') { emit('fenceHit', {}); sfx('clang'); assignFielders(true); }
    if (b.bounced && !b.reassigned) { b.reassigned = true; assignFielders(true); }
    M.retarget = (M.retarget || 0) - dt; if (M.retarget <= 0) { M.retarget = .25; const ch = M.fielders.find(f => f.job === 'chase'); if (ch) { const pr = predict(b, 4); ch.it = interceptOf(ch, pr, 0); } }
    if (M.play) M.play.maxR = Math.max(M.play.maxR, rOf(b.x, b.y));
  } else if (b.mode === 'thrown') thrownStep(b, dt);
  if (b.mode === 'held') { const F = b.holder; if (F) holderStep(F, dt); if (M.ball.foulDead) return foulBall(); }
  fieldersStep(dt);
  runnersStep(dt);
  if (M.outs >= 3) return endPlay();
  if (M.walkoff) return endPlay();
  // over: the ball held in the infield (or by the pitcher) and nobody running for 0.6 s
  const moving = M.runners.some(r => r.state === 'running' || r.state === 'returning' || r.delay > 0);
  const h = holderF();
  if (h && !moving && (rOf(h.x, h.y) < 470 || h.pos === 'P')) { M.quiet = (M.quiet || 0) + dt; if (M.quiet > .6 || M.fast) return endPlay(); } else M.quiet = 0;
  if (h && moving && h.hold > 4 && rOf(h.x, h.y) < 470) { // a rundown that never ends: the runner takes the nearer base
    for (const r of M.runners) if (r.state === 'running' || r.state === 'returning') { const nb = runnerTimeLeft(r) < 1.5 ? (r.state === 'returning' ? r.tagBase : r.target) : r.base; r.base = nb; if (nb === 4) scoreRun(r); else placeRunner(r); }
  }
  if (M.play && (M.play.t > 20 || (M.play.t > 9 && h && rOf(h.x, h.y) < 470))) { for (const r of M.runners) if (r.state === 'running' || r.state === 'returning') { r.base = Math.max(r.base, r.state === 'returning' ? r.tagBase : r.base); if (r.base === 4) scoreRun(r); else placeRunner(r); } endPlay(); }
}
function fieldersIdle(dt) {
  for (const F of M.fielders) { const dx = F.homeX - F.x, dy = F.homeY - F.y, d = Math.hypot(dx, dy); if (d > 3) { F.x += dx / d * Math.min(d, 90 * dt); F.y += dy / d * Math.min(d, 90 * dt); F.facing = Math.atan2(dy, dx); } F.vx = d > 3 ? dx / d * 90 : 0; F.vy = d > 3 ? dy / d * 90 : 0; F.z = Math.max(0, F.z - 200 * dt); }
}
function foulBall() {
  M.ball.mode = 'dead'; sfx('ump');
  M.runners = M.runners.filter(r => r.p !== (M.play && M.play.batter) && r.state !== 'out');
  for (const r of M.runners) { r.base = r.startBase; placeRunner(r); r.steal = false; }
  const c = callFoul(M.ball.kind === 'bunt'); M.play = null; M.cam = 'broadcast';
  for (const F of M.fielders) F.hasBall = false;
  endPitch(c);
}
function groundRuleDouble() {
  M.ball.mode = 'dead'; emit('groundRuleDouble', {});
  const bat = M.play.batter;
  for (const r of M.runners.filter(r => r.state !== 'out' && r.state !== 'scored')) {
    if (r.p === bat) { r.base = 2; placeRunner(r); continue; }
    const nb = r.startBase + 2; if (nb >= 4) scoreRun(r); else { r.base = nb; placeRunner(r); }
  }
  for (const r of M.runners) if (r.p === bat) r.reached = 2;
  endPlay();
}
function homeRun(pole) {
  const b = M.ball; b.mode = 'homer'; b.homerT = 0;
  const dist = carryFeet(b), bat = M.play.batter;
  M.play.hr = { dist, pole, batzooka: b.kind === 'batzooka' };
  pStat(bat).longest = Math.max(pStat(bat).longest, dist);
  emit('homer', { batter: bat, dist, batzooka: b.kind === 'batzooka', pole, x: b.x, y: b.y, team: M.half });
  meterGain(M.half, 25, 'homer');
  M.cam = M.fast ? 'broadcast' : 'moonshot'; setPhase('homer');
  if (!M.fast) { game.flash('#fff6c0', .1); sting('homer'); }
}
function homerStep(dt) {
  const b = M.ball, slow = M.phaseT < 2.2 && !M.fast;
  game.timeScale = slow ? .45 * TUNE.gameSpeed : TUNE.gameSpeed;
  if (b.z > -20) { b.vz -= 520 * M.park.gravityMul * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 30) b.trail.shift(); } }
  if (M.phaseT > 2.2 && M.cam === 'moonshot') { M.cam = 'broadcast'; emit('fireworks', { x: b.x, y: b.y }); }
  // the trot: the batter and runners jog the bases
  if (M.phaseT > 2.2 || M.fast) for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored') {
    if (r.state === 'onBase' || r.state === 'running') { r.state = 'running'; r.forced = false; r.order = 'go'; }
    if (r.delay > 0) r.delay = 0;
    const bp = basePos(r.target), dx = bp.x - r.x, dy = bp.y - r.y, d = Math.hypot(dx, dy), sp = 260;
    if (d <= sp * dt || M.fast) { r.x = bp.x; r.y = bp.y; r.base = r.target; if (r.target >= 4) scoreRun(r); else r.target++; }
    else { r.x += dx / d * sp * dt; r.y += dy / d * sp * dt; r.facing = Math.atan2(dy, dx); }
  }
  fieldersIdle(dt * .5);
  const left = M.runners.some(r => r.state !== 'out' && r.state !== 'scored');
  if ((!left && M.phaseT > 2.5) || M.phaseT > 9 || (M.phaseT > 2.4 && skipPressed())) {
    for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored') scoreRun(r);
    game.timeScale = TUNE.gameSpeed; endPlay();
  }
}
/** the play is over: what the batter got, then the next batter (or the side retired, or the end) */
function endPlay() {
  const P_ = M.play; game.timeScale = TUNE.gameSpeed;
  if (P_ && !P_.steal) {
    const bat = P_.batter, st = pStat(bat), br = M.runners.find(r => r.p === bat);
    st.ab++;
    let hit = 0;
    if (P_.hr) hit = 4;
    else if (br && br.state !== 'out' && !P_.caughtFly && !P_.error) hit = br.state === 'scored' ? 4 : br.reached || br.base || 1;
    if (P_.outs.some(o => o.r && o.r.p !== bat && o.force)) hit = 0;
    if (hit) { offense().hits++; st.h++; if (hit === 2) st.d++; if (hit === 3) st.tr++; if (hit === 4) st.hr++; P_.hit = hit; emit('hit', { bases: hit, batter: bat, inside: hit === 4 && !P_.hr }); meterGain(M.half, hit === 1 ? 10 : hit < 4 ? 15 : 0, 'hit'); }
    nextBatter();
  }
  for (const r of M.runners) { r.steal = false; if (r.state === 'running' || r.state === 'returning') { r.base = r.state === 'returning' ? r.tagBase : r.base; placeRunner(r); } }
  M.runners = M.runners.filter(r => r.state !== 'out' && r.state !== 'scored');
  for (const r of M.runners) { r.forced = false; r.mustTag = false; r.order = null; r.slid = false; r.delay = 0; }
  M.lastPlay = P_; M.play = null; M.quiet = 0; M.cpuStealDone = false;
  if (M.ball) M.ball.mode = M.ball.mode === 'homer' ? 'dead' : M.ball.mode;
  for (const F of M.fielders) { F.job = 'idle'; F.human = false; F.runTo = null; }
  checkWalkoff();
  emit('playOver', { hit: P_ && P_.hit });
  if (M.pendingRhubarb && !M.fast) { M.pendingRhubarb = false; startRhubarb(null, null); return; }
  if (P_ && P_.big && !M.fast && !M.lesson && !M.derby && (game.settings.replays || 'big') !== 'off' && REPLAY_LOG.length > 10) return startReplay();
  setPhase('playOver');
}
function playOverDone() {
  if (M.over) return toFinal();
  if (M.outs >= 3) return toHalfEnd();
  M.ball = null; M.cam = 'plate'; setPhase('walkUp');
}
function toHalfEnd() {
  M.cam = 'broadcast'; setPhase('halfEnd'); M.show = M.shows && !M.fast && !M.derby && !M.lesson ? pickShow() : null; sting('inning');
}
function halfEndDone() {
  M.show = null;
  if (halfOver() || M.over) return toFinal();
  setPhase('halfStart'); halfStartSetup(); M.cam = 'plate';
}
function toFinal() {
  if (!M.over) { M.over = true; M.winner = M.teams[0].runs > M.teams[1].runs ? 0 : 1; emit('gameEnd', { winner: M.winner }); }
  setPhase('final'); game.timeScale = TUNE.gameSpeed;
  if (M.onEnd) { const f = M.onEnd; M.onEnd = null; f(M); }
}
