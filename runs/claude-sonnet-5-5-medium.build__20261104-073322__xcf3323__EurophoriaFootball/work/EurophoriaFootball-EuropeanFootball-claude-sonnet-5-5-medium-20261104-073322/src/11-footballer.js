/* ============ 11-footballer: the player entity, its actions, the keeper ============ */
const angDiff = E.angDiff;
EF.Footballer = class Footballer {
  constructor(M, side, slot, data, role) {
    this.M = M; this.side = side; this.slot = slot; this.data = data; this.role = role; this.id = side * 5 + slot; this.name = data.name;
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.facing = side === 0 ? 0 : Math.PI;
    this.stamina = 1; this.state = 'run'; this.stateT = 0; this.action = null; this.actionT = 0; this.actionDur = 0; this.cool = 0; this.stun = 0; this.downT = 0; this.cards = 0; this.sentOff = false;
    this.human = null; this.ctl = null; this.charge = 0; this.charging = false; this.buf = {}; this.aftertouch = 0; this.immune = 0; this.slideHit = false; this.sprinting = false; this.lowStamina = false;
    this.spot = [0, 0]; this.ai = { t: 0, plan: null, hold: 0, release: false, pressed: null, lastDecision: 0 }; this.pose = null; this.expr = null; this.skillDir = 0; this.celebrate = 0; this.prevOwner = false;
    this.k = { keep: 0, diveDir: 0, diveT: 0, outcome: null, holdT: 0, shotId: -1, tx: 0, ty: 0, tz: 0 }; this.lastFouled = -9; this.diveT = 0; this.jump = 0; this.hopT = 0; this.tilt = 0; this.tiltAxis = 0; this.mark = null; this.name3 = data.name.split(' ').pop();
  }
  get st() { return this.data; }
  get isGK() { return this.role === 'GK'; }
  get hasBall() { return this.M.ball.owner === this; }
  speedMax() {
    const T = EF.T, M = this.M, pace = .86 + (this.data.pace || 70) / 100 * .26;
    let s = T.runSpeed * pace * (this.sprinting ? T.sprintMul : 1) * (this.hasBall ? .94 : 1);
    if (M.europhoria && M.europhoria.side === this.side) s *= 1.18;
    if (M.talkBuff(this.side, 'hairdryer')) s *= 1.1;
    if (this.sprinting && this.lowStamina) s *= .8;
    if (M.stadium.snow) s *= .92; if (M.stadium.wet) s *= .97;
    if (this.isGK) s *= .9;
    return s * (this.side === 1 ? M.aiSpeed : 1);
  }
  /** one step: read the intent, do what it says */
  step(dt, intent) {
    const M = this.M, T = EF.T, ball = M.ball;
    this.cool = Math.max(0, this.cool - dt); this.immune = Math.max(0, this.immune - dt); this.celebrate = Math.max(0, this.celebrate - dt); this.aftertouch = Math.max(0, this.aftertouch - dt);
    this.jump = Math.max(0, this.jump - dt * 3);
    for (const a in this.buf) this.buf[a] = Math.max(0, this.buf[a] - dt);
    if (this.sentOff) { this.vx = this.vy = 0; return; }
    if (EF.dev.stamina && this.human !== null) { this.stamina = 1; this.lowStamina = false; }
    if (intent) { if (intent.euphoria) M.tryEuphoria(this.side); for (const a of EF.ACTIONS) if (intent[a].pressed) this.buf[a] = .13; }
    this.stateT += dt;
    // physics of being down, flying or stunned
    if (this.z > 0 || this.vz !== 0) { this.vz -= 640 * dt; this.z += this.vz * dt; if (this.z <= 0) { this.z = 0; this.vz = 0; if (this.state === 'flying') { this.state = 'down'; this.stateT = 0; M.emit('thud', { x: this.x, y: this.y, who: this.id }); } } }
    if (this.state === 'down') { this.downT -= dt; this.vx *= Math.exp(-dt * 5); this.vy *= Math.exp(-dt * 5); if (this.downT <= 0) { this.state = 'run'; this.stateT = 0; this.stun = 0; } this.integrate(dt); return; }
    if (this.state === 'flying') { this.integrate(dt); return; }
    if (this.state === 'diving') { this.vx *= Math.exp(-dt * 4); this.vy *= Math.exp(-dt * 4); this.diveT -= dt; if (this.diveT <= 0) { this.state = 'run'; this.stateT = 0; } this.integrate(dt); return; }
    if (this.state === 'slide') return this.slideStep(dt);
    if (this.state === 'barge') { this.bargeStep(dt); return; }
    if (this.state === 'keeperDive') { this.integrate(dt); this.k.diveT -= dt; if (this.k.diveT <= 0) { this.state = this.k.holding ? 'hold' : 'run'; this.stateT = 0; } return; }
    this.stun = Math.max(0, this.stun - dt);
    if (this.isGK && !this.human && M.mode !== 'penaltyHuman') return this.keeperStep(dt);
    if (this.stun > 0 || !intent) { this.vx = approach(this.vx, 0, 700 * dt); this.vy = approach(this.vy, 0, 700 * dt); this.integrate(dt); return; }
    // ---- run ----
    const mv = intent.move, ml = Math.min(1, Math.hypot(mv[0], mv[1]));
    this.sprinting = intent.sprint && ml > .2 && (!this.lowStamina);
    if (this.sprinting && ml > .2) this.stamina = Math.max(0, this.stamina - T.staminaDrain * dt * (this.M.stadium.snow ? 1.2 : 1) * (M.europhoria && M.europhoria.side === this.side ? .4 : 1));
    else this.stamina = Math.min(1, this.stamina + T.staminaRegen * dt * (M.talkBuff(this.side, 'shoulder') ? 1.25 : 1) * (ml < .2 ? 1.6 : 1));
    if (this.stamina <= .02) this.lowStamina = true; else if (this.stamina > .3) this.lowStamina = false;
    const sp = this.speedMax() * (this.state === 'skill' ? 1.1 : 1);
    const dx = mv[0] / (ml || 1) * ml * sp, dy = mv[1] / (ml || 1) * ml * sp, ac = T.accel * dt * (this.M.stadium.wet ? .85 : 1);
    if (this.state === 'skill') { if (this.stateT > this.actionDur) { this.state = 'run'; this.stateT = 0; this.action = null; } }
    else if (this.state === 'kick') { if (this.stateT > .22) { this.state = 'run'; this.stateT = 0; this.action = null; } }
    else if (this.state === 'air') { if (this.stateT > this.actionDur) { this.state = 'run'; this.stateT = 0; this.action = null; } }
    this.vx = approach(this.vx, dx, ac); this.vy = approach(this.vy, dy, ac);
    if (ml > .25) this.facing = E.approachAng(this.facing, Math.atan2(mv[1], mv[0]), dt * (this.hasBall ? 9 : 13));
    this.integrate(dt);
    this.act(intent, dt);
  }
  integrate(dt) {
    const M = this.M, P = Pitch; this.x += this.vx * dt; this.y += this.vy * dt;
    const lim = this.isGK ? [P.X0 - 6, P.X1 + 6, P.Y0 + 2, P.Y1 - 2] : [P.X0 - 24, P.X1 + 24, P.Y0 - 14, P.Y1 + 14];
    if (this.isGK) { this.x = clamp(this.x, this.side === 0 ? P.X0 - 4 : P.X1 - 120, this.side === 0 ? P.X0 + 120 : P.X1 + 4); this.y = clamp(this.y, lim[2], lim[3]); }
    else { this.x = clamp(this.x, lim[0], lim[1]); this.y = clamp(this.y, lim[2], lim[3]); }
  }
  aimDir(intent) {
    if (intent.aimPoint) return Math.atan2(intent.aimPoint.y - this.y, intent.aimPoint.x - this.x);
    const m = intent.move; return Math.hypot(m[0], m[1]) > .3 ? Math.atan2(m[1], m[0]) : this.facing;
  }
  /** the buttons */
  act(intent, dt) {
    const M = this.M, ball = M.ball, T = EF.T, own = this.hasBall;
    const want = a => this.buf[a] > 0, use = a => { this.buf[a] = 0; };
    if (intent.euphoria) M.tryEuphoria(this.side);
    if (this.state !== 'run' && this.state !== 'skill') return;
    if (own) {
      if (this.state === 'skill') return;
      if (want('pass') && this.cool <= 0) { use('pass'); return this.doPass(intent, false); }
      if (want('through') && this.cool <= 0) { use('through'); return this.doPass(intent, true); }
      if (want('lob') && this.cool <= 0) { use('lob'); return this.doLob(intent); }
      if (want('skill') && this.cool <= 0) { use('skill'); return this.doSkill(intent); }
      if (want('dive')) { use('dive'); return this.doDive(); }
      // the shot: hold to charge, release to shoot
      if (intent.shoot.down) { this.charging = true; this.charge = Math.min(1.6, this.charge + dt / T.chargeTime); }
      else if (this.charging) { this.charging = false; const c = this.charge; this.charge = 0; if (this.cool <= 0) this.doShot(intent, c); }
      return;
    }
    this.charging = false; this.charge = 0;
    const loose = !ball.owner;
    // air moves on a loose ball in reach
    if (loose && this.cool <= 0 && ball.z > 5 && ball.z < 40 && (want('shoot') || want('pass') || want('lob') || want('through'))) {
      const d = Math.hypot(ball.x - this.x, ball.y - this.y);
      if (d < 34) { const a = want('shoot') ? 'shoot' : want('pass') ? 'pass' : 'lob'; if (this.doAir(intent, a, d)) { use(a); return; } }
    }
    if (want('pass') && this.cool <= 0 && this.state === 'run') { use('pass'); return this.doPoke(); }
    if (want('shoot') && this.cool <= 0) { use('shoot'); return this.doSlide(intent); }
    if (want('lob') && this.cool <= 0) { use('lob'); return this.doBarge(intent); }
    if (want('dive')) { use('dive'); return this.doDive(); }
    if (want('through') || want('sw')) { use('through'); use('sw'); M.requestSwitch(this); }
  }
  /* ---- kicks ---- */
  mates() { return this.M.F.filter(f => f.side === this.side && f !== this && !f.sentOff); }
  pickMate(dir, through, aimPoint) {
    let best = null, bs = -9;
    for (const m of this.mates()) {
      if (m.isGK && !this.isGK && Math.hypot(m.x - this.x, m.y - this.y) > 90) continue;
      const a = Math.atan2(m.y - this.y, m.x - this.x), d = Math.hypot(m.x - this.x, m.y - this.y); if (d < 14) continue;
      let s;
      if (aimPoint) s = -Math.hypot(m.x - aimPoint.x, m.y - aimPoint.y) / 40;
      else { const ad = Math.abs(angDiff(a, dir)); if (ad > 1.25) continue; s = Math.cos(ad) * 1.4 - d / 420 + (through ? ((m.x - this.x) * (this.side ? -1 : 1)) / 600 : 0); }
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  }
  inaccuracy(extra = 0) {
    const M = this.M, pr = M.pressure(this), skill = (this.data.pass || 70) / 100, e = (1.05 - skill) * .22 + pr * .05 + extra;
    return (M.rng() - .5) * 2 * e * (this.side === 1 ? 1 / EF.T.aiSkill : 1) * (M.talkBuff(this.side, 'board') ? .8 : 1);
  }
  release(vx, vy, vz, o = {}) {
    const ball = this.M.ball; ball.owner = null; ball.prev = ball.last; ball.last = this; ball.vx = vx; ball.vy = vy; ball.vz = vz; ball.spin = 0; ball.shotBy = null;
    ball.x += Math.cos(this.facing) * 2; ball.y += Math.sin(this.facing) * 2; ball.z = Math.max(ball.z, .1);
    this.cool = o.cool === undefined ? .28 : o.cool; this.state = 'kick'; this.stateT = 0; this.action = o.action || 'pass'; this.actionDur = .25; this.charging = false; this.charge = 0;
    ball.target = o.target || null; ball.passer = o.passer ? this : null; ball.tpass = this.M.t;
  }
  doPass(intent, through) {
    const M = this.M, T = EF.T; let dir = this.aimDir(intent);
    const m = this.pickMate(dir, through, intent.aimPoint || null) || (intent.target && intent.target.side === this.side ? intent.target : null);
    let ta, d, sp;
    if (m) {
      const dd = Math.hypot(m.x - this.x, m.y - this.y); sp = clamp(dd * 1.55 + 110, 170, T.passSpeed * (through ? 1.12 : 1));
      const lead = through ? 62 : (dd / sp) * .8 * Math.hypot(m.vx, m.vy) / Math.max(1, Math.hypot(m.vx, m.vy)); let tx = m.x + m.vx * (dd / sp) * .85, ty = m.y + m.vy * (dd / sp) * .85;
      if (through) { const fx = this.side === 0 ? 1 : -1, ml = Math.hypot(m.vx, m.vy); tx = m.x + (ml > 20 ? m.vx / ml : fx) * 58; ty = m.y + (ml > 20 ? m.vy / ml : 0) * 58; }
      ta = Math.atan2(ty - this.y, tx - this.x);
    } else { ta = dir; sp = T.passSpeed * .85; }
    ta += this.inaccuracy(); this.facing = ta;
    this.release(Math.cos(ta) * sp, Math.sin(ta) * sp, 0, { target: m, passer: true, action: through ? 'through' : 'pass' });
    this.M.ball.passTo = m; M.emit('pass', { who: this.id, side: this.side, x: this.x, y: this.y, to: m ? m.id : -1, through, power: sp / 300 });
    if (intent.sw.down && m) M.oneTwo = { f: this, mate: m, t: M.t };
  }
  doLob(intent) {
    const M = this.M, dir = this.aimDir(intent), fx = this.side === 0 ? 1 : -1, wide = Math.abs(this.y - CY) > 100 && (this.x - CX) * fx > 60;
    let m = this.pickMate(dir, false, intent.aimPoint || null) || (intent.target && intent.target.side === this.side ? intent.target : null), tx, ty;
    if (wide && !m) m = this.mates().filter(f => !f.isGK).sort((a, b) => Math.hypot(a.x - Pitch.goalX(this.side) + fx * 40, a.y - CY) - Math.hypot(b.x - Pitch.goalX(this.side) + fx * 40, b.y - CY))[0];
    if (m) { tx = m.x + m.vx * .5; ty = m.y + m.vy * .5; if (wide) { tx = Pitch.goalX(this.side) - fx * 56; ty = CY + (m.y - CY) * .3; } } else { tx = this.x + Math.cos(dir) * 190; ty = this.y + Math.sin(dir) * 190; }
    tx += (M.rng() - .5) * 20 * (1.05 - (this.data.pass || 70) / 100); ty += (M.rng() - .5) * 20;
    const dd = Math.hypot(tx - this.x, ty - this.y), tf = clamp(dd / 210, .55, 1.25), vz = .5 * Pitch.GRAV * tf, a = Math.atan2(ty - this.y, tx - this.x), sp = dd / tf;
    this.facing = a; this.release(Math.cos(a) * sp, Math.sin(a) * sp, vz, { target: m, passer: true, action: 'lob' });
    M.emit('lob', { who: this.id, side: this.side, x: this.x, y: this.y, cross: wide, to: m ? m.id : -1 });
  }
  /** a shot from the meter (c 0..1.6) */
  doShot(intent, c, forced) {
    const M = this.M, T = EF.T, gx = Pitch.goalX(this.side), fx = this.side === 0 ? 1 : -1, mv = intent.move;
    c = clamp(c, .12, 1.6); const over = c > 1.15, sweet = c > .72 && c < .95;
    let aimY = Math.hypot(mv[0], mv[1]) > .25 ? clamp(mv[1], -1, 1) : (intent.aimPoint ? clamp((intent.aimPoint.y - CY) / GH, -1.1, 1.1) : 0);
    if (intent.aim) aimY = clamp(intent.aim[1], -1, 1);
    let gy = CY + aimY * (GH - 4), a = Math.atan2(gy - this.y, gx - this.x);
    const toGoal = Math.abs(angDiff(a, this.facing)), aimDir = this.aimDir(intent);
    if (toGoal > 1.35 && Math.abs(angDiff(aimDir, a)) > 1.1) a = aimDir;   // a shot the other way is a clearance
    const sup = M.europhoria && M.europhoria.side === this.side && !forced && c > .35;
    let sp = T.shotMin + (T.shotMax - T.shotMin) * Math.min(1, c) * (this.data.shoot ? .75 + this.data.shoot / 280 : 1);
    if (sup) sp *= T.superPower;
    let err = (1.05 - (this.data.shoot || 70) / 100) * .08 + M.pressure(this) * .03 + (over ? .1 : 0) - (sweet ? .04 : 0); if (this.side === 1) err /= T.aiSkill; if (sup) err *= .4;
    a += (M.rng() - .5) * 2 * err;
    let vz = 22 + 120 * Math.min(1, c) * Math.min(1, c) * M.rng() + (over ? 90 : 0);
    if (Pitch.inBox(this.x, this.y, 1 - this.side) === false && Math.hypot(gx - this.x, CY - this.y) > 230) vz += 24;
    this.facing = a; this.release(Math.cos(a) * sp, Math.sin(a) * sp, vz, { action: 'shot', cool: .35 });
    const ball = M.ball; ball.shotBy = this; ball.shotT = 0; ball.shotId = (ball.shotId || 0) + 1; ball.screamer = c > .85 && Math.hypot(gx - this.x, CY - this.y) > 150; this.aftertouch = .5;
    ball.shotAimY = gy;
    if (sup) { const sd = EF.get('super', M.teams[this.side].data.superId) || EF.get('super', 'wobble'); ball.path = { type: sd.path, t: 0, dur: 1.2, ph: M.rng() * 6 }; ball.superT = 1.4; ball.sup = sd; ball.decoys = sd.decoys || 0; M.useEuphoria(this.side); }
    else ball.sup = null;
    M.emit('shot', { who: this.id, side: this.side, x: this.x, y: this.y, power: Math.min(1, c), sweet, sup: !!sup, name: sup ? (EF.get('super', M.teams[this.side].data.superId) || {}).name : '' });
    if (sup) M.emit('superStrike', { who: this.id, side: this.side, x: this.x, y: this.y, name: ball.sup.name, color: ball.sup.color });
  }
  doAir(intent, a, d) {
    const M = this.M, ball = M.ball, gx = Pitch.goalX(this.side), toBall = Math.atan2(ball.y - this.y, ball.x - this.x), behind = Math.abs(angDiff(toBall, this.facing)) > 1.9 && ball.z > 12;
    let kind = ball.z > 15 ? 'header' : 'volley'; if (d > 18 && ball.z < 24) kind = 'divingHeader'; if (behind && a === 'shoot') kind = 'bicycle';
    const fx = this.side === 0 ? 1 : -1;
    if (kind === 'divingHeader') { this.vx += Math.cos(toBall) * 110; this.vy += Math.sin(toBall) * 110; }
    this.facing = kind === 'bicycle' ? Math.atan2(CY - this.y, gx - this.x) : toBall;
    let ta, sp, vz = 20 + M.rng() * 30;
    const dir = this.aimDir(intent);
    if (a === 'shoot') { const gy = CY + clamp(intent.move[1], -1, 1) * (GH - 6); ta = Math.atan2(gy - this.y, gx - this.x) + (M.rng() - .5) * (kind === 'bicycle' ? .25 : .12) * (1.15 - (this.data.shoot || 70) / 100); sp = (kind === 'volley' ? 340 : kind === 'bicycle' ? 360 : 290) * (.85 + (this.data.shoot || 70) / 330); if (kind === 'header' || kind === 'divingHeader') sp *= (this.data.name === 'NORMAN NEEDHAM' ? 1.2 : 1); }
    else { const m = this.pickMate(dir, false, intent.aimPoint || null); ta = m ? Math.atan2(m.y - this.y, m.x - this.x) : this.facing; sp = m ? clamp(Math.hypot(m.x - this.x, m.y - this.y) * 1.6 + 110, 160, 280) : 200; if (a === 'lob') vz = 150; }
    this.release(Math.cos(ta) * sp, Math.sin(ta) * sp, vz, { action: kind, cool: .45, passer: a !== 'shoot', target: null });
    ball.x = this.x + Math.cos(ta) * 4; ball.y = this.y + Math.sin(ta) * 4;
    this.state = 'air'; this.stateT = 0; this.actionDur = kind === 'bicycle' ? .6 : .42; this.jump = .8; this.tilt = kind === 'bicycle' ? 1 : kind === 'divingHeader' ? .8 : 0; this.hopT = this.actionDur;
    if (a === 'shoot') { ball.shotBy = this; ball.shotT = 0; ball.shotId = (ball.shotId || 0) + 1; ball.sup = null; ball.shotAimY = CY; ball.screamer = false; }
    M.emit(kind === 'bicycle' ? 'bicycle' : kind === 'volley' ? 'volley' : 'header', { who: this.id, side: this.side, x: this.x, y: this.y, shot: a === 'shoot' });
    ball.headerBy = this.id; ball.headerT = M.t; ball.headerKind = kind;
    return true;
  }
  /* ---- skill moves ---- */
  doSkill(intent) {
    const M = this.M, mv = intent.move, ml = Math.hypot(mv[0], mv[1]), ball = M.ball;
    const rel = ml > .3 ? angDiff(Math.atan2(mv[1], mv[0]), this.facing) : null;
    const foe = M.F.filter(f => f.side !== this.side && !f.sentOff && f.state !== 'down').map(f => [f, Math.hypot(f.x - this.x, f.y - this.y), Math.abs(angDiff(Math.atan2(f.y - this.y, f.x - this.x), this.facing))]).filter(([, d, a]) => d < 30 && a < .8).sort((a, b) => a[1] - b[1])[0];
    this.state = 'skill'; this.stateT = 0; this.cool = .35; this.immune = .5;
    if (rel !== null && Math.abs(rel) < .8) {
      if (foe) { this.action = 'nutmeg'; this.actionDur = .4; const f = foe[0]; f.stun = .6; f.facing += .1; ball.owner = null; ball.last = this; const a = this.facing; ball.x = this.x + Math.cos(a) * 12; ball.y = this.y + Math.sin(a) * 12; ball.vx = Math.cos(a) * 150; ball.vy = Math.sin(a) * 150; ball.vz = 0; ball.passTo = null; this.vx += Math.cos(a) * 70; this.vy += Math.sin(a) * 70; M.emit('nutmeg', { who: this.id, side: this.side, x: this.x, y: this.y, victim: f.id }); }
      else { this.action = 'rainbow'; this.actionDur = .55; ball.owner = null; ball.last = this; ball.vx = Math.cos(this.facing) * 110; ball.vy = Math.sin(this.facing) * 110; ball.vz = 210; ball.z = 1; this.vx += Math.cos(this.facing) * 60; this.vy += Math.sin(this.facing) * 60; this.cool = .2; M.emit('rainbow', { who: this.id, side: this.side, x: this.x, y: this.y }); }
    } else if (rel !== null && Math.abs(rel) > 2.3) { this.action = 'spin'; this.actionDur = .4; this.facing += Math.PI; this.vx = Math.cos(this.facing) * 70; this.vy = Math.sin(this.facing) * 70; M.emit('skill', { who: this.id, side: this.side, x: this.x, y: this.y, move: 'spin' }); }
    else { this.action = 'stepover'; this.actionDur = .38; this.skillDir = rel !== null ? Math.sign(rel) : (M.rng() < .5 ? 1 : -1); const a = this.facing + this.skillDir * 1.57; this.vx += Math.cos(a) * 95; this.vy += Math.sin(a) * 95; M.emit('skill', { who: this.id, side: this.side, x: this.x, y: this.y, move: 'stepover' }); }
  }
  /* ---- defending ---- */
  doPoke() {
    const M = this.M, o = M.ball.owner; this.state = 'kick'; this.stateT = 0; this.action = 'poke'; this.actionDur = .22; this.cool = .45;
    if (!o || o.side === this.side) return;
    const d = Math.hypot(o.x - this.x, o.y - this.y), ang = Math.abs(angDiff(Math.atan2(o.y - this.y, o.x - this.x), this.facing));
    if (d < 17 && ang < 1.2) M.resolveTackle(this, o, 'poke');
    else { this.cool = .6; }
  }
  doSlide(intent) {
    const T = EF.T; if (this.stamina < .03) return;
    this.state = 'slide'; this.stateT = 0; this.action = 'slide'; this.slideHit = false; this.cool = .9; this.slideDir = Math.hypot(intent.move[0], intent.move[1]) > .3 ? Math.atan2(intent.move[1], intent.move[0]) : this.facing; this.facing = this.slideDir;
    const sp = T.slideSpeed * (this.M.talkBuff(this.side, 'hairdryer') ? 1.1 : 1); this.vx = Math.cos(this.slideDir) * sp; this.vy = Math.sin(this.slideDir) * sp; this.M.emit('slide', { who: this.id, side: this.side, x: this.x, y: this.y });
  }
  slideStep(dt) {
    const M = this.M, ball = M.ball; this.vx *= Math.exp(-dt * 3.2); this.vy *= Math.exp(-dt * 3.2); this.integrate(dt);
    if (!this.slideHit) {
      const o = ball.owner;
      if (o && o.side !== this.side && Math.hypot(o.x - this.x, o.y - this.y) < 13) { this.slideHit = true; M.resolveTackle(this, o, 'slide'); }
      else {
        const v = M.F.find(f => f.side !== this.side && !f.sentOff && f !== o && f.state !== 'down' && f.state !== 'flying' && Math.hypot(f.x - this.x, f.y - this.y) < 11);
        if (v && this.stateT > .05) { this.slideHit = true; M.resolveTackle(this, v, 'slideNoBall'); }
        else if (!o && ball.z < 8 && Math.hypot(ball.x - this.x, ball.y - this.y) < 11) { this.slideHit = true; ball.last = this; ball.vx = Math.cos(this.slideDir) * 170; ball.vy = Math.sin(this.slideDir) * 170; ball.vz = 20; M.emit('clearance', { who: this.id, side: this.side }); M.tackleWon(this, null); }
      }
    }
    if (this.stateT > .42) { this.state = 'down'; this.downT = .35; this.stateT = 0; this.action = 'slideEnd'; }
  }
  doBarge(intent) {
    this.state = 'barge'; this.stateT = 0; this.action = 'barge'; this.slideHit = false; this.cool = .8; const a = Math.hypot(intent.move[0], intent.move[1]) > .3 ? Math.atan2(intent.move[1], intent.move[0]) : this.facing; this.facing = a; this.vx = Math.cos(a) * 150; this.vy = Math.sin(a) * 150; this.M.emit('barge', { who: this.id, side: this.side, x: this.x, y: this.y });
  }
  bargeStep(dt) {
    const M = this.M; this.vx *= Math.exp(-dt * 3); this.vy *= Math.exp(-dt * 3); this.integrate(dt);
    if (!this.slideHit) { const v = M.F.find(f => f.side !== this.side && !f.sentOff && f.state !== 'down' && f.state !== 'flying' && Math.hypot(f.x - this.x, f.y - this.y) < 12); if (v) { this.slideHit = true; M.resolveTackle(this, v, 'barge'); } }
    if (this.stateT > .3) { this.state = 'run'; this.stateT = 0; this.action = null; }
  }
  doDive() {
    const M = this.M; if (this.diveT > 0) return; this.state = 'diving'; this.diveT = 1.1; this.stateT = 0; this.action = 'dive'; this.cool = .5; M.resolveDive(this);
  }
  knock(from, power) {
    const T = EF.T, a = Math.atan2(this.y - from.y, this.x - from.x); this.state = 'flying'; this.stateT = 0; this.downT = 1.15; this.vx = Math.cos(a) * 120 * power; this.vy = Math.sin(a) * 120 * power; this.vz = 150 * power * T.knockAir; this.z = Math.max(this.z, .1); this.charging = false; this.charge = 0;
  }
  /* ---- the keeper (AI) ---- */
  keeperStep(dt) {
    const M = this.M, ball = M.ball, k = this.k, P = Pitch, gx = P.ownGoalX(this.side), dir = this.side === 0 ? 1 : -1, T = EF.T;
    const reach = 24 * T.keeperReach * (this.data.boss ? 1.4 : 1) * (this.data.size ? Math.sqrt(this.data.size) : 1) * .9;
    if (this.state === 'hold') {
      k.holdT -= dt; ball.x = this.x + dir * 6; ball.y = this.y; ball.z = 10; this.vx = this.vy = 0; this.stateT += dt;
      if (this.human && M.humanCtl(this.human)) return;
      if (k.holdT <= 0) this.distribute();
      return;
    }
    let tx, ty;
    const bd = Math.hypot(ball.x - gx, ball.y - CY), shotNow = ball.shotBy && ball.shotBy.side !== this.side && ball.shotT < 1.6;
    // incoming shot?
    if (!ball.owner && (Math.abs(ball.vx) > 80) && ((ball.vx * dir) < 0)) {
      const t = (gx - ball.x) / ball.vx;
      if (t > 0 && t < 1.2) {
        const yy = ball.y + ball.vy * t, zz = ball.z + ball.vz * t - .5 * P.GRAV * t * t;
        if (Math.abs(yy - CY) < GH + 14 && zz < P.BAR + 14 && zz > -4 && ball.shotId !== k.shotId && ball.speed() > 120) { k.shotId = ball.shotId; this.decideSave(t, yy, Math.max(0, zz)); }
      }
    }
    if (k.outcome && (ball.owner || ball.shotId !== k.shotId)) k.outcome = null;
    if (k.outcome) {
      // dive toward the ball's arrival, then act when it is within reach
      this.state = 'keeperDive'; k.diveT = .55; const tdx = k.tx - this.x, tdy = k.ty - this.y, d = Math.hypot(tdx, tdy) || 1, sp = 260 * T.keeperSkill; this.vx = tdx / d * Math.min(sp, d * 6); this.vy = tdy / d * Math.min(sp, d * 6); this.facing = Math.atan2(k.ty - CY, dir * 40) * 0 + (dir > 0 ? 0 : Math.PI);
      this.tilt = Math.sign(k.ty - this.y) || 1; k.dived = true; this.hopT = .5; M.emit('keeperDive', { who: this.id, side: this.side });
      return;
    }
    // positioning: on the line between the ball and the goal centre
    const bx = ball.x, by = ball.y, adv = clamp(bd * .17, 5, 40);
    tx = gx + dir * adv; ty = CY + (by - CY) * clamp(adv * .016 + .52, .45, .95); ty = clamp(ty, CY - GH + 6, CY + GH - 6);
    // sweep: a loose ball in the box closer to the keeper than anyone
    if (!ball.owner && Pitch.inBox(ball.x, ball.y, this.side) && ball.z < 20 && ball.speed() < 140 && M.nearestTo(ball.x, ball.y, f => !f.isGK && !f.sentOff) && this.canClaim()) { tx = ball.x; ty = ball.y; }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy), sp = 78 * (.8 + this.data.keep / 220) * T.keeperSkill;
    this.vx = approach(this.vx, d > 3 ? dx / d * Math.min(sp, d * 6) : 0, 900 * dt); this.vy = approach(this.vy, d > 3 ? dy / d * Math.min(sp, d * 6) : 0, 900 * dt); this.facing = E.approachAng(this.facing, Math.atan2(ball.y - this.y, ball.x - this.x), dt * 8); this.integrate(dt);
    // claim a loose ball
    if (!ball.owner && ball.z < 22 && M.mode === 'play' && Math.hypot(ball.x - this.x, ball.y - this.y) < 11 && ball.speed() < 190 && this.cool <= 0 && !(ball.last === this && ball.passTo)) this.catchBall(false);
  }
  canClaim() { const M = this.M, b = M.ball; const mine = Math.hypot(b.x - this.x, b.y - this.y); return !M.F.some(f => f.side !== this.side && !f.sentOff && Math.hypot(b.x - f.x, b.y - f.y) < mine * .8); }
  decideSave(t, yy, zz) {
    const M = this.M, k = this.k, T = EF.T, ball = M.ball, skill = (this.data.keep || 60) / 100 * T.keeperSkill, reach = 24 * T.keeperReach * (this.data.boss ? 1.5 : 1) * Math.sqrt(this.data.size || 1) * .9;
    const dist = Math.abs(yy - this.y), sp = ball.speed();
    let eff = reach * (.55 + skill * .6) + 10; if (ball.sup) eff *= .72; if (sp > 380) eff *= .9; if (this.data.boss && sp < 300) eff = 999;
    const catchable = sp < 270 * (.7 + skill * .5) && zz < 26, onFrame = Math.abs(yy - CY) < GH - 1 && zz < Pitch.BAR;
    k.tx = this.x + (this.side === 0 ? 1 : -1) * 3; k.ty = clamp(yy, CY - GH + 4, CY + GH - 4); k.tz = zz;
    if (!onFrame) { k.outcome = 'miss'; k.ty = clamp(yy, CY - GH + 6, CY + GH - 6); return; }
    if (dist > eff + 2) k.outcome = 'beat'; else if (catchable && dist < eff * .7) k.outcome = 'catch'; else k.outcome = 'parry';
    k.eta = M.t + t;
    // a super strike goes to the Save Duel: the outcome is the duel's
    if (ball.sup && onFrame) { k.outcome = null; M.startDuel(this, ball, t, k); }
  }
  /** called by the Match each step: the ball reaches the keeper's hands */
  keeperContact() {
    const M = this.M, ball = M.ball, k = this.k; if (!k.outcome || ball.owner) return;
    const d = Math.hypot(ball.x - this.x, ball.y - this.y), dz = Math.abs(ball.z - 12);
    if (d < 20 + (this.data.boss ? 12 : 0) && (dz < 26 || k.outcome === 'parry')) {
      const o = k.outcome; k.outcome = null;
      if (o === 'catch') { this.catchBall(true); }
      else if (o === 'parry') { const dir = this.side === 0 ? 1 : -1; const up = ball.y < this.y ? -1 : 1; ball.vx = dir * (80 + M.rng() * 90); ball.vy = up * (60 + M.rng() * 130) * (M.rng() < .5 ? 1 : -1); ball.vz = 60 + M.rng() * 80; ball.spin = 0; ball.path = null; ball.last = this; ball.shotBy = null; ball.sup = null; M.emit('save', { who: this.id, side: this.side, x: this.x, y: this.y, parry: true, shooter: ball.lastShooter }); M.afterSave(this, false); }
    }
  }
  catchBall(forced) {
    const M = this.M, ball = M.ball, dir = this.side === 0 ? 1 : -1; ball.owner = this; ball.prev = ball.last; ball.last = this; ball.path = null; ball.spin = 0; ball.vx = ball.vy = ball.vz = 0; ball.passTo = null;
    this.state = 'hold'; this.stateT = 0; this.k.holdT = 1.2 + M.rng() * .8; this.facing = dir > 0 ? 0 : Math.PI; this.vx = this.vy = 0;
    if (forced || (ball.shotBy && ball.shotBy.side !== this.side)) M.emit('save', { who: this.id, side: this.side, x: this.x, y: this.y, parry: false, catch: true, shooter: ball.shotBy ? ball.shotBy.id : -1 });
    ball.shotBy = null; ball.sup = null; M.afterSave(this, true);
  }
  distribute() {
    const M = this.M, ball = M.ball, tac = EF.get('tactic', M.teams[this.side].data.tactic), dir = this.side === 0 ? 1 : -1;
    const mates = this.mates().filter(f => !f.isGK); let tgt = null;
    if (M.rng() < (tac.longBall || .1) + .1) { // long kick
      tgt = mates.sort((a, b) => (b.x - a.x) * dir)[0]; const tx = tgt ? tgt.x : this.x + dir * 280, ty = tgt ? tgt.y : CY; const dd = Math.hypot(tx - this.x, ty - this.y), tf = clamp(dd / 240, .8, 1.5), a = Math.atan2(ty - this.y, tx - this.x);
      ball.owner = null; ball.vx = Math.cos(a) * dd / tf; ball.vy = Math.sin(a) * dd / tf; ball.vz = .5 * Pitch.GRAV * tf; ball.last = this; ball.passTo = tgt; this.cool = .5; M.emit('goalKick', { who: this.id, side: this.side, long: true });
    } else {
      tgt = mates.filter(f => Math.hypot(f.x - this.x, f.y - this.y) < 220).sort((a, b) => M.openness(b) - M.openness(a))[0] || mates[0]; const a = Math.atan2(tgt.y - this.y, tgt.x - this.x), dd = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      ball.owner = null; ball.vx = Math.cos(a) * clamp(dd * 1.5 + 100, 160, 240); ball.vy = Math.sin(a) * clamp(dd * 1.5 + 100, 160, 240); ball.vz = 0; ball.last = this; ball.passTo = tgt; this.cool = .5; M.emit('throw', { who: this.id, side: this.side });
    }
    ball.target = tgt; ball.tpass = M.t; ball.passer = this; this.state = 'run'; this.stateT = 0;
  }
};
