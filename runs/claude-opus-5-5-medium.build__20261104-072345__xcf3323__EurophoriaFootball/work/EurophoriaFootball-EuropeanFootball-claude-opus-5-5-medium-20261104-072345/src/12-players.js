/* 12-players: the Footballer: body, stats, stamina, its state machine and every action (pass, through ball, lob, cross,
 * chip, shot with the meter and the sweet spot, aftertouch curl, air moves, skill moves, poke, slide, barge, theatrics),
 * contact and knockdowns. Footballer.step(dt, intent) is the only way a footballer does anything. */
const AIR_KINDS = { header: [22, 40, 260], bicycle: [22, 40, 420], volley: [8, 22, 360], divingHeader: [4, 14, 290] };
class Footballer {
  constructor(m, side, idx, data, role, form) {
    this.m = m; this.side = side; this.idx = idx; this.id = side * 5 + idx; this.data = data; this.role = role; this.gk = role === 'GK';
    this.spec = form.roles[role] || {}; this.form = form;
    this.st = Object.assign({ pace: 70, shoot: 60, pass: 60, tackle: 60, skill: 60, keep: 20, weight: 60, temper: 40 }, data.stats);
    this.body = new E.Body({ x: P.CX, y: P.CY, r: 5, friction: 0, gravity: 700 });
    this.facing = 0; this.stamina = 100; this.state = 'run'; this.stateT = 0; this.act = null; this.cool = 0; this.stun = 0; this.skillCd = 0;
    this.meter = 0; this.charging = false; this.cards = 0; this.sentOff = false; this.human = null; this.goals = 0; this.shots = 0; this.tackles = 0; this.saves = 0;
    this.downT = 0; this.air = null; this.slideHit = null; this.contactT = -9; this.lastSkillT = -9; this.oneTwoT = 0; this.runTo = null; this.botIntent = null;
    this.celebrate = null; this.dejected = false; this.sprinting = false; this.flip = 0; this.lift = 0; this.wrong = 0; this.glow = false; this.curlT = 0;
  }
  get name() { return this.data.name; }
  get dir() { return this.m.dir(this.side); }
  get hasBall() { return this.m.owner === this; }
  speed() {
    const m = this.m, euro = m.euroT[this.side] > 0, hd = m.flags.hairdryer === this.side && m.half === 1 && m.minute < 15 ? 1.1 : 1;
    return EF.T.runSpeed * (.85 + .3 * this.st.pace / 100) * (euro ? 1.12 : 1) * hd * (this.cards && this.m.o.cheatSlow ? .9 : 1);
  }
  setState(s, t = 0) { this.state = s; this.stateT = t; }
  doAct(name, dur) { this.act = { name, t: 0, dur }; }
  /** move toward (x, y) at up to speed (scripted moves: celebrations, set pieces, walk-offs) */
  goTo(x, y, speed, dt) {
    const b = this.body, dx = x - b.x, dy = y - b.y, d = hyp(dx, dy), sp = d > 2 ? Math.min(speed, d * 4) : 0;
    b.vx = approach(b.vx, d > 2 ? dx / d * sp : 0, 700 * dt); b.vy = approach(b.vy, d > 2 ? dy / d * sp : 0, 700 * dt);
    if (sp > 5) this.facing = E.approachAng(this.facing, Math.atan2(dy, dx), dt * 10);
    b.update(dt, this.m.map);
  }
  face(a, dt, rate = 12) { this.facing = E.approachAng(this.facing, a, dt * rate); }

  step(dt, it, live) {
    const m = this.m, b = this.body;
    this.cool = Math.max(0, this.cool - dt); this.stun = Math.max(0, this.stun - dt); this.skillCd = Math.max(0, this.skillCd - dt); this.oneTwoT = Math.max(0, this.oneTwoT - dt);
    this.stateT += dt; this.curlT = Math.max(0, this.curlT - dt); this.wrong = Math.max(0, this.wrong - dt);
    if (this.act) { this.act.t += dt; if (this.act.t >= this.act.dur) this.act = null; }
    this.glow = m.euroT[this.side] > 0;
    if (this.sentOff) { this.offStep(dt); return; }
    if (this.gk && keeperStep(this, dt, it, live)) return;
    switch (this.state) {
      case 'down': this.decel(dt, 500); if (this.stateT >= this.downT) { this.setState('getup'); this.downT = .35; } b.update(dt, m.map); return;
      case 'getup': this.decel(dt, 600); if (this.stateT >= .35) this.setState('run'); b.update(dt, m.map); return;
      case 'launched': this.flip = Math.min(1, this.stateT / .6); b.update(dt, m.map); if (b.onGround && this.stateT > .15) { this.setState('down'); this.downT = .9 + m.rng() * .5; this.flip = 0; m.emit('knockdown', { who: this.id, x: b.x, y: b.y, kind: 'land' }); } return;
      case 'dive': this.diveStep(dt); return;
      case 'slide': this.slideStep(dt); return;
      case 'poke': this.pokeStep(dt); return;
      case 'barge': this.bargeStep(dt); return;
      case 'air': this.airStep(dt); return;
      case 'skill': this.skillStep(dt, it); return;
      case 'stunned': this.decel(dt, 400); b.update(dt, m.map); if (this.stateT >= this.downT) this.setState('run'); return;
    }
    if (!live || this.celebrate || this.dejected) {
      if (!live && !this.celebrate && !this.dejected && m.mode !== 'goal') this.decel(dt, 500);
      if (m.mode === 'setpiece' || m.mode === 'kickoff') return;   // set pieces move them
      if (!this.celebrate && !this.dejected) b.update(dt, m.map);
      this.regen(dt, false); return;
    }
    // ---- running, with or without the ball ----
    const mv = it.move || [0, 0], ml = hyp(mv[0], mv[1]);
    const wantSprint = !!it.sprint && ml > .2, euro = m.euroT[this.side] > 0, inf = m.cheats['stamina' + this.side] || m.o.infStamina;
    let mul = 1;
    this.sprinting = false;
    if (wantSprint && (this.stamina > 0 || euro || inf)) { mul = this.stamina < 25 && !euro && !inf ? 1.15 : EF.T.sprintMul; if (this.hasBall) mul *= .93; this.sprinting = true; }
    const sp = this.speed() * mul * (this.hasBall ? .95 : 1) * (this.wrong > 0 ? .5 : 1);
    const acc = EF.T.accel;
    b.vx = approach(b.vx, mv[0] * sp, acc * dt); b.vy = approach(b.vy, mv[1] * sp, acc * dt);
    if (ml > .2) {
      const want = Math.atan2(mv[1], mv[0]), turn = Math.abs(E.angDiff(this.facing, want));
      if (this.hasBall && turn > 1.75) { b.vx *= .985; b.vy *= .985; }
      this.face(want, dt, this.hasBall ? 9 : 14);
    } else if (it.faceTo) this.face(it.faceTo, dt, 8);
    this.regen(dt, this.sprinting && !euro && !inf);
    b.update(dt, m.map);
    this.actions(dt, it);
    this.pickup();
  }
  decel(dt, k) { const b = this.body; b.vx = approach(b.vx, 0, k * dt); b.vy = approach(b.vy, 0, k * dt); }
  regen(dt, sprinting) {
    if (sprinting) { this.stamina = Math.max(0, this.stamina - EF.T.staminaDrain * dt); this.restT = 0; return; }
    this.restT = (this.restT || 0) + dt;
    if (this.restT > .5) this.stamina = Math.min(100, this.stamina + EF.T.staminaRegen * dt * (this.m.euph[this.side] >= 34 ? 1.25 : 1) * (this.m.buff.regen[this.side] || 1));
  }
  /** a loose ball within reach becomes his */
  pickup() {
    const m = this.m, b = m.ball;
    if (m.owner || m.mode !== 'play' || this.cool > 0 || this.stun > 0 || b.superPath || m.superFlight) return;
    if (this.state !== 'run') return;
    if (m.kickHold > 0 && m.sp && this.side !== m.sp.side) return;
    const d = hyp(b.x - this.body.x, b.y - this.body.y), sp = hyp(b.vx, b.vy);
    // a block: an opponent's shot hits him and flies off (often out for a corner)
    if (b.kind === 'shot' && m.last && m.last.side !== this.side && !this.gk && sp > EF.T.trapSpeed && d < 7 && b.z < 16 && m.t - (b.kickT || 0) > .08) {
      const a = Math.atan2(b.vy, b.vx) + (m.rng() < .5 ? -1 : 1) * (.6 + m.rng() * .9), k = .35 + m.rng() * .25;
      b.vx = Math.cos(a) * sp * k; b.vy = Math.sin(a) * sp * k; b.vz = 30 + m.rng() * 60; b.onGround = false; b.kind = 'block'; m.last = this; m.lastTouch = this.side; this.cool = .3;
      if (m.shot) m.shot.done = true; m.emit('block', { who: this.id, side: this.side }); m.gain(this.side, 4, 'block'); return;
    }
    if (b.z >= 9) return;
    if (d < (sp > EF.T.trapSpeed ? 4.5 : 9)) {
      // an opponent's moving pass: intercepted, or deflected off his shins
      const pass = b.to && m.last && m.last.side !== this.side && sp > 60;
      if (pass && m.rng() * 100 > this.st.tackle + 30) {
        const a = Math.atan2(b.vy, b.vx) + (m.rng() - .5) * 1.5; b.vx = Math.cos(a) * sp * .55; b.vy = Math.sin(a) * sp * .55; b.to = null; m.last = this; this.cool = .25;
        m.emit('deflect', { who: this.id }); return;
      }
      if (sp > EF.T.trapSpeed * .8) { const k = 4 + (100 - this.st.skill) / 100 * 6; this.body.vx *= .7; this.body.vy *= .7; }
      m.takeBall(this);
    }
  }

  /* ---- with the ball and without it ---- */
  actions(dt, it) {
    const m = this.m, has = this.hasBall, b = m.ball;
    if (this.cool > 0 && !this.charging) return;
    // aftertouch: just after a shot, the stick across the ball's path curls it
    if (this.curlT > 0 && m.last === this && !m.owner && it.move && !it.bot) {
      const sp = hyp(b.vx, b.vy) || 1, across = (it.move[0] * -b.vy + it.move[1] * b.vx) / sp;
      if (Math.abs(across) > .3) { b.spin = clamp(b.spin + across * EF.T.curlStrength * dt, -1.6, 1.6); if (!this.curled) { this.curled = true; m.emit('curl', { who: this.id }); } }
    }
    if (has) {
      if (this.oneTwoT > 0 && this.oneTwoTo && this.oneTwoT - dt <= 0) { this.passTo(this.oneTwoTo, 'pass', true); return; }
      const P_ = it.pass || {}, S = it.shoot || {}, L = it.lob || {}, T = it.through || {}, K = it.skill || {}, D = it.dive || {};
      if (S.down) {
        if (!this.charging) { this.charging = true; this.meter = 0; }
        const k = (m.euph[this.side] >= 67 ? 1.2 : 1) / EF.T.shotChargeTime;
        this.meter = Math.min(1, this.meter + dt * k);
        if (!it.bot || this.meter < (it.power || 0)) return;
      }
      if (this.charging && (!S.down || (it.bot && this.meter >= (it.power || 0)))) { this.charging = false; const p = this.meter; this.meter = 0; this.shoot(p, it); return; }
      if (P_.pressed) { if (it.sw && it.sw.down) this.oneTwo(it); else this.pass(it); return; }
      if (T.pressed) { this.through(it); return; }
      if (L.pressed) { this.lob(it); return; }
      if (K.pressed) { this.skill(it); return; }
      if (D.pressed) { this.theatrics(); return; }
      return;
    }
    this.charging = false; this.meter = 0;
    const win = (it.pass && it.pass.pressed) || (it.shoot && it.shoot.pressed) || it.airTry ? airWindow(this) : null;
    if (win && ((it.shoot && it.shoot.pressed) || (it.pass && it.pass.pressed) || it.airTry)) { this.startAir(win, it.airTry ? (it.airMode || 'shoot') : it.pass && it.pass.pressed ? 'pass' : 'shoot', it); return; }
    if (m.kickHold > 0 && m.sp && this.side !== m.sp.side) return;
    if (it.pass && it.pass.pressed) { this.poke(); return; }
    if (it.shoot && it.shoot.pressed) { this.slide(it); return; }
    if (it.lob && it.lob.pressed) { this.barge(); return; }
    if (it.dive && it.dive.pressed) { this.theatrics(); return; }
  }
  aimDir(it) {
    if (it.aim && hyp(it.aim[0], it.aim[1]) > .1) return Math.atan2(it.aim[1], it.aim[0]);
    if (it.move && hyp(it.move[0], it.move[1]) > .2) return Math.atan2(it.move[1], it.move[0]);
    return this.facing;
  }
  /** the teammate a pass goes to: the one the direction points at, within the pass assist's cone */
  pickReceiver(a, it, o = {}) {
    const m = this.m, b = this.body;
    if (it.target != null) { const t = m.players.find(p => p.id === it.target && p.side === this.side && p !== this); if (t) return t; }
    if (it.passTo != null) { const t = m.players.find(p => p.id === it.passTo); if (t && t !== this) return t; }
    const assist = { off: 20, low: 35, high: EF.T.passAssistDeg }[it.assist || game.settings.passAssist || 'high'] * PI / 180;
    let best = null, bs = -9;
    for (const t of m.side[this.side]) {
      if (t === this || t.sentOff || t.state === 'off') continue;
      const ta = Math.atan2(t.body.y - b.y, t.body.x - b.x), da = Math.abs(E.angDiff(a, ta));
      if (t.gk && Math.cos(E.angDiff(a, Math.atan2(0, -this.dir))) < .6) continue;
      if (da > Math.max(assist, .15)) continue;
      const d = dist(t.body, b), open = Math.min(1, nearestFoe(m, t, this.side) / 40);
      const s = Math.cos(da) - d / 1200 + .15 * open + (o.forward ? (t.body.x - b.x) * this.dir / 400 : 0);
      if (s > bs) { bs = s; best = t; }
    }
    return best;
  }
  pressure() { return nearestFoe(this.m, this, this.side) < 12; }
  pass(it) {
    const a = this.aimDir(it), r = it.aimPoint && it.target == null ? null : this.pickReceiver(a, it);
    if (r) return this.passTo(r, 'pass', false, it);
    const sp = 210; this.kickDir(a, sp, 0, 'pass', null, it.aimPoint);
  }
  passTo(r, kind, oneTwoReturn, it = {}) {
    const m = this.m, b = this.body, d0 = dist(r.body, b), sp = clamp(d0 * 1.5 + 90, EF.T.passSpeedMin, EF.T.passSpeedMax);
    // lead him: where he will be when a rolling ball (slowed by the surface) gets there
    const k = EF.T.ballFriction * m.surfaceAt(b.x, b.y)[0], arrive = d => (d * k / sp < .92 ? -Math.log(1 - d * k / sp) / k : d / sp * 2.5);
    let tx = r.body.x, ty = r.body.y;
    for (let i = 0; i < 3; i++) { const t = arrive(hyp(tx - b.x, ty - b.y)); tx = r.body.x + r.body.vx * t; ty = r.body.y + r.body.vy * t; }
    const err = (100 - this.st.pass) / 100 * .06 * (this.pressure() ? 2 : 1) * (m.buff.passAcc[this.side] || 1);
    const a = Math.atan2(ty - b.y, tx - b.x) + gauss(m.rng) * err;
    this.kickDir(a, sp, 0, kind, r);
    if (oneTwoReturn) { this.oneTwoTo = null; }
  }
  kickDir(a, sp, vz, kind, to, point) {
    const m = this.m;
    if (point) { a = Math.atan2(point.y - this.body.y, point.x - this.body.x); sp = clamp(hyp(point.x - this.body.x, point.y - this.body.y) * 1.5 + 90, EF.T.passSpeedMin, EF.T.passSpeedMax); }
    m.kickBall(this, Math.cos(a) * sp, Math.sin(a) * sp, vz, kind, to);
    this.facing = a; this.doAct('pass', .3);
    m.stats[this.side].passes++;
    m.emit('pass', { side: this.side, who: this.id, to: to ? to.id : null, kind });
  }
  oneTwo(it) {
    const a = this.aimDir(it), r = this.pickReceiver(a, it);
    if (!r || dist(r.body, this.body) > 220) return this.pass(it);
    this.passTo(r, 'pass');
    this.m.ball.oneTwo = { from: this, mate: r };
    const g = { x: this.m.goalX(this.side), y: P.CY }, ga = angTo(this.body, g);
    this.runTo = { x: this.body.x + Math.cos(ga) * 70, y: this.body.y + Math.sin(ga) * 50, t: 1.6 };
  }
  through(it) {
    const m = this.m, a = this.aimDir(it), r = this.pickReceiver(a, it, { forward: true });
    if (!r) return this.pass(it);
    const g = { x: m.goalX(this.side), y: P.CY }, ga = angTo(r.body, g), lead = 50 + m.rng() * 40;
    let tx = r.body.x + Math.cos(ga) * lead, ty = r.body.y + Math.sin(ga) * lead * .6;[tx, ty] = P.clampField(tx, ty, 14);
    const d = hyp(tx - this.body.x, ty - this.body.y), tr = hyp(tx - r.body.x, ty - r.body.y) / (r.speed() * 1.2) + .2;
    const sp = clamp(d / tr * 1.15, 160, 330);
    const err = (100 - this.st.pass) / 100 * .05;
    this.kickDir(Math.atan2(ty - this.body.y, tx - this.body.x) + gauss(m.rng) * err, sp, 0, 'through', r);
    r.runTo = { x: tx, y: ty, t: 1.4 };
  }
  lob(it) {
    const m = this.m, b = this.body, gx = m.goalX(this.side), dg = hyp(gx - b.x, P.CY - b.y), k = m.keeper[1 - this.side];
    let tx, ty, apex, kind = 'lob', to = null;
    if (dg < 170 && k && Math.abs(k.body.x - gx) > 24 && !it.aimPoint) {   // a chip over the keeper
      tx = gx - this.dir * 6; ty = P.CY + clamp(b.y - P.CY, -30, 30) * .3; apex = 45; kind = 'chip';
      const v = E.arc({ x: m.ball.x, y: m.ball.y, z: 0 }, { x: tx, y: ty, z: 20 }, EF.T.ballGravity, { apex });
      m.kickBall(this, v.vx, v.vy, v.vz, 'chip', null); this.doAct('chip', .35);
      this.shots++; m.stats[this.side].shots++;
      m.shot = { by: this, side: this.side, t0: m.t, kind: 'chip', speed: hyp(v.vx, v.vy), done: false };
      m.emit('shot', { side: this.side, who: this.id, power: .4, kind: 'chip' }); if (k) keeperRead(k, m.shot); return;
    }
    const u = P.toUV(this.dir, b.x, b.y)[0], wide = Math.abs(b.y - P.CY) > 150;
    if (it.aimPoint) { tx = it.aimPoint.x; ty = it.aimPoint.y; }
    else if (wide && u > .68) {   // a cross toward the penalty spot, or the teammate nearest it
      const spot = { x: gx - this.dir * P.SPOT, y: P.CY };
      to = m.side[this.side].filter(t => t !== this && !t.gk && !t.sentOff).sort((p, q) => dist(p.body, spot) - dist(q.body, spot))[0];
      tx = to ? lerp(to.body.x, spot.x, .4) : spot.x; ty = to ? lerp(to.body.y, spot.y, .5) : spot.y; kind = 'cross';
      if (to) to.runTo = { x: tx, y: ty, t: 1.6 };
    } else {
      to = this.pickReceiver(this.aimDir(it), it, { forward: true });
      if (to) { const lead = .55; tx = to.body.x + to.body.vx * lead; ty = to.body.y + to.body.vy * lead; }
      else { const a = this.aimDir(it); tx = b.x + Math.cos(a) * 160; ty = b.y + Math.sin(a) * 160; }
    }
    [tx, ty] = P.clampField(tx, ty, 8);
    const d = hyp(tx - b.x, ty - b.y); apex = kind === 'cross' ? 55 : d > 250 ? 55 : 30;
    const v = E.arc({ x: m.ball.x, y: m.ball.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex });
    const err = (100 - this.st.pass) / 100 * .04;
    const c = Math.cos(gauss(m.rng) * err), s = Math.sin(gauss(m.rng) * err);
    m.kickBall(this, v.vx * c - v.vy * s, v.vx * s + v.vy * c, v.vz, kind, to); this.doAct('chip', .35);
    m.stats[this.side].passes++;
    m.emit('pass', { side: this.side, who: this.id, to: to ? to.id : null, kind });
  }
  /** a shot from the meter: power 0..1; aimed across the goal mouth */
  shoot(p, it, from) {
    const m = this.m, b = this.body, side = this.side;
    if (m.euroT[side] > 0 && !m.superUsed[side] && p >= .9 && !m.cheats.pure) { startSuper(m, this, it); return; }
    const gx = m.goalX(side), k = m.keeper[1 - side];
    let aimY;
    if (it.aimPoint) aimY = clamp((it.aimPoint.y - P.CY) / (P.GH - 6), -1, 1);
    else if (it.aimY != null) aimY = it.aimY;
    else {
      const mv = it.move || [0, 0], across = mv[1];
      if (Math.abs(across) > .25) aimY = clamp(across * 1.2, -1, 1);
      else if ((it.assist || game.settings.shotAssist) !== 'off') aimY = k && k.body.y > P.CY ? -.75 : .75;
      else aimY = 0;
    }
    const ty = P.CY + aimY * (P.GH - 6), sweet = p >= .78 && p <= .9;
    let sp = 180 + p * (EF.T.shotSpeedMax - 180); if (sweet) sp *= 1.15;
    let vz = 25 + p * 90; if (p > .95 && m.rng() < .5) vz += 40;
    const across = Math.abs(E.angDiff(this.facing, Math.atan2(ty - b.y, gx - b.x))) > 1.75;
    const err = (100 - this.st.shoot) / 100 * .08 + (this.pressure() ? .04 : 0) + (across ? .05 : 0);
    const a = Math.atan2(ty - b.y, gx - b.x) + gauss(m.rng) * err;
    const dgx = Math.abs(gx - b.x); if (dgx < 120) vz *= .55 + dgx / 270;   // (close in: kept down)
    m.kickBall(this, Math.cos(a) * sp, Math.sin(a) * sp, vz, 'shot', null);
    this.facing = a; this.doAct(p > .7 ? 'shotHard' : 'shot', .4); this.curlT = .4; this.curled = false;
    if (sweet) game.headless || m.o.silent || m.session ? null : game.freeze(.05);
    registerShot(m, this, sp, sweet, 'shot', p);
  }

  /* ---- air moves: header, bicycle kick, volley, diving header ---- */
  startAir(win, mode, it) {
    const m = this.m, b = this.body, gx = m.goalX(this.side), toGoal = Math.atan2(P.CY - b.y, gx - b.x), faceGoal = Math.abs(E.angDiff(this.facing, toGoal)) < 1.92;
    let kind;
    if (win.z >= 22) kind = faceGoal || mode === 'pass' ? 'header' : 'bicycle';
    else if (win.z >= 8) kind = 'volley';
    else kind = this.sprinting ? 'divingHeader' : 'volley';
    if (win.z < 8 && !this.sprinting) kind = 'volley';
    this.air = { kind, mode, t: 0, x: win.x, y: win.y, z: win.z, it };
    this.setState('air');
    if (kind === 'header' && win.z > 28) b.jump(150);
    if (kind === 'bicycle') { b.jump(140); m.emit('slowmo', { k: .35, t: .4 }); }
    m.emit('air', { who: this.id, kind });
  }
  airStep(dt) {
    const m = this.m, b = this.body, a = this.air, ball = m.ball; a.t += dt;
    const dx = a.x - b.x, dy = a.y - b.y, d = hyp(dx, dy);
    if (d > 3 && a.t < .4) { const sp = Math.min(220, d / Math.max(.05, .4 - a.t)); b.vx = dx / d * sp; b.vy = dy / d * sp; } else this.decel(dt, 600);
    if (a.kind === 'divingHeader') this.lift = Math.min(1, a.t / .2);
    b.update(dt, m.map);
    const [lo, hi] = AIR_KINDS[a.kind];
    const bd = hyp(ball.x - b.x, ball.y - b.y), contactZ = ball.z - b.z;
    if (!m.owner && !ball.superPath && bd < 11 && contactZ > lo - 6 && contactZ < hi + 10 && m.mode === 'play') {
      this.airContact(); return;
    }
    if (a.t > .6) { this.air = null; this.lift = 0; if (a.kind === 'divingHeader' || a.kind === 'bicycle') { this.setState('down'); this.downT = .5; } else this.setState('run'); }
  }
  airContact() {
    const m = this.m, a = this.air, b = this.body, side = this.side, it = a.it || {};
    const [, , baseSp] = AIR_KINDS[a.kind], gx = m.goalX(side);
    m.last = this; m.lastTouch = side; m.owner = null;
    if (a.mode === 'clear') {   // a defender heads it away, upfield and wide
      const ang = Math.atan2((m.ball.y < P.CY ? -1 : 1) * .7, this.dir), sp = 200 + m.rng() * 60;
      m.kickBall(this, Math.cos(ang) * sp, Math.sin(ang) * sp, 90 + m.rng() * 40, 'clear', null); this.doAct(a.kind === 'header' ? 'header' : 'volley', .3);
      m.emit('clearance', { side, who: this.id });
    } else if (a.mode === 'pass') {   // cushioned to a teammate
      const r = this.pickReceiver(this.aimDir(it), it);
      const tx = r ? r.body.x : b.x + Math.cos(this.facing) * 60, ty = r ? r.body.y : b.y + Math.sin(this.facing) * 60;
      const v = E.arc({ x: m.ball.x, y: m.ball.y, z: m.ball.z }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: m.ball.z + 10 });
      m.kickBall(this, v.vx, v.vy, v.vz, 'pass', r); this.doAct(a.kind === 'header' ? 'header' : 'volley', .3);
      m.emit('pass', { side, who: this.id, to: r ? r.id : null, kind: 'pass' });
    } else {
      const mv = it.move || [0, 0];
      let aimY = it.aimY != null ? it.aimY : Math.abs(mv[1]) > .25 ? clamp(mv[1] * 1.2, -1, 1) : (m.keeper[1 - side].body.y > P.CY ? -.7 : .7);
      const ty = P.CY + aimY * (P.GH - 6), q = 1 - Math.min(1, hyp(a.x - b.x, a.y - b.y) / 14);
      const err = (100 - this.st.shoot) / 100 * .1 + (1 - q) * .08 + (a.kind === 'bicycle' ? .05 : 0);
      const ang = Math.atan2(ty - m.ball.y, gx - m.ball.x) + gauss(m.rng) * err;
      const sp = baseSp * (.85 + m.rng() * .3), vz = a.kind === 'header' || a.kind === 'divingHeader' ? -40 + m.rng() * 60 : 20 + m.rng() * 40;
      m.kickBall(this, Math.cos(ang) * sp, Math.sin(ang) * sp, vz, 'shot', null);
      this.doAct(a.kind, .4);
      registerShot(m, this, sp, false, a.kind, .7);
      m.emit(a.kind === 'divingHeader' ? 'header' : a.kind, { who: this.id, side });
    }
    this.air = null; this.lift = 0; this.cool = .3;
    if (a.kind === 'divingHeader' || a.kind === 'bicycle') { this.setState('down'); this.downT = .7; } else this.setState('run');
  }

  /* ---- skill moves ---- */
  skill(it) {
    const m = this.m; if (this.skillCd > 0) return;
    const b = this.body, mv = it.move || [0, 0], ml = hyp(mv[0], mv[1]), fx = Math.cos(this.facing), fy = Math.sin(this.facing);
    const fwd = ml > .3 ? (mv[0] * fx + mv[1] * fy) / ml : 0, side = ml > .3 ? (mv[0] * -fy + mv[1] * fx) / ml : 0;
    const foe = m.side[1 - this.side].filter(o => !o.sentOff && o.state !== 'down').map(o => ({ o, d: dist(o.body, b), a: Math.abs(E.angDiff(this.facing, angTo(b, o.body))) })).filter(e => e.a < .9).sort((p, q) => p.d - q.d)[0];
    let kind = it.skillKind;
    if (!kind) {
      if (m.t - this.lastSkillT < .3 && this.lastSkill !== 'rainbow') kind = 'rainbow';
      else if (fwd < -.5) kind = 'spin';
      else if (Math.abs(side) > .5) kind = 'stepover';
      else if (foe && foe.d < 16) kind = 'nutmeg';
      else if (fwd > .5 && (!foe || foe.d > 40)) kind = 'knockon';
      else kind = foe && foe.d < 22 ? 'nutmeg' : 'stepover';
    }
    this.lastSkillT = m.t; this.lastSkill = kind; this.skillCd = .6; this.stamina = Math.max(0, this.stamina - 8);
    const S = { stepover: .35, spin: .45, rainbow: .3, nutmeg: .3, knockon: .15 }[kind];
    this.skillK = { kind, foe: foe && foe.d < (kind === 'rainbow' ? 24 : kind === 'nutmeg' ? 18 : 22) ? foe.o : null, side: sgn(side) || 1, done: false };
    this.setState('skill'); this.doAct(kind, S);
    m.emit('skill', { who: this.id, side: this.side, kind });
  }
  skillStep(dt, it) {
    const m = this.m, b = this.body, k = this.skillK, dur = this.act ? this.act.dur : .3;
    const fx = Math.cos(this.facing), fy = Math.sin(this.facing);
    this.decel(dt, 300);
    if (!k.done && this.stateT >= dur * .5) {
      k.done = true;
      const o = k.foe, skill = this.st.skill, r = m.rng();
      if (k.kind === 'stepover') {
        const ch = clamp(.35 + .5 * (skill - (o ? o.st.tackle : 50)) / 100, .15, .9);
        if (o && r < ch) { o.wrongFoot(.4); m.gain(this.side, 8, 'skill'); m.emit('skillWin', { who: this.id, kind: 'stepover' }); }
        b.vx += -fy * k.side * 90; b.vy += fx * k.side * 90;
      } else if (k.kind === 'nutmeg') {
        const ch = .45 + .4 * skill / 100;
        if (o && r < ch) {
          const ball = m.ball; m.owner = null; ball.vx = fx * 120; ball.vy = fy * 120; ball.to = this; ball.kind = 'nutmeg'; this.cool = .15; m.last = this;
          o.wrongFoot(.5); b.vx += -fy * 70 + fx * 60; b.vy += fx * 70 + fy * 60;
          m.gain(this.side, 12, 'nutmeg'); m.emit('nutmeg', { who: this.id, side: this.side, victim: o.id }); m.emit('skillWin', { who: this.id, kind: 'nutmeg' });
        } else if (o) { m.takeBall(o); m.emit('skillFail', { who: this.id }); }
      } else if (k.kind === 'spin') { m.gain(this.side, 6, 'skill'); this.facing = Math.atan2(-fy, -fx); m.emit('skillWin', { who: this.id, kind: 'spin' }); }
      else if (k.kind === 'rainbow') {
        const ball = m.ball; m.owner = null; ball.vx = fx * 60; ball.vy = fy * 60; ball.vz = 110; ball.onGround = false; ball.to = this; ball.kind = 'rainbow'; m.last = this; this.cool = .2;
        if (o) o.wrongFoot(.6);
        m.gain(this.side, 12, 'rainbow'); m.emit('rainbow', { who: this.id, side: this.side }); m.emit('skillWin', { who: this.id, kind: 'rainbow' });
      } else if (k.kind === 'knockon') {
        const ball = m.ball; m.owner = null; ball.vx = fx * 150; ball.vy = fy * 150; ball.to = this; ball.kind = 'knockon'; m.last = this; this.cool = .2;
        m.gain(this.side, 2, 'skill');
      }
    }
    if (k.kind === 'spin' && !k.done) b.vx = b.vy = 0;
    b.update(dt, m.map);
    if (this.stateT >= dur) { this.setState('run'); if (k.kind !== 'nutmeg' && k.kind !== 'rainbow' && k.kind !== 'knockon' && !m.owner && dist(m.ball, b) < 14) {} }
  }
  wrongFoot(t) { if (this.gk) return; this.setState('stunned'); this.downT = t; this.wrong = t; this.m.emit('wrongFoot', { who: this.id }); }

  /* ---- defending ---- */
  poke() { this.setState('poke'); this.doAct('poke', .25); this.pokeDone = false; this.m.emit('poke', { who: this.id }); }
  pokeStep(dt) {
    const m = this.m, b = this.body; this.decel(dt, 500); b.update(dt, m.map);
    if (!this.pokeDone && this.stateT > .08) {
      this.pokeDone = true;
      const reach = EF.T.tackleReach * (m.euroT[this.side] > 0 ? 1.25 : 1) * (m.buff.tackle[this.side] || 1);
      const toe = { x: b.x + Math.cos(this.facing) * reach, y: b.y + Math.sin(this.facing) * reach }, ball = m.ball, o = m.owner;
      const ballNear = hyp(ball.x - toe.x, ball.y - toe.y) < 6 && ball.z < 8;
      if (ballNear && (!o || o.side !== this.side)) {
        if (o) { m.owner = null; o.stun = .25; this.tackleWon(o, false); }
        m.last = this; m.lastTouch = this.side; ball.vx = Math.cos(this.facing) * 80 + b.vx * .3; ball.vy = Math.sin(this.facing) * 80 + b.vy * .3; ball.to = null; ball.kind = 'tackle';
        this.cool = 0;
      } else if (o && o.side !== this.side && dist(o.body, toe) < 7) {
        m.contact(this, o, { closing: hyp(b.vx - o.body.vx, b.vy - o.body.vy) + 40, kind: 'poke' });
      } else m.emit('tackleFailed', { who: this.id });
    }
    if (this.stateT > .25 + (this.pokeDone ? .15 : 0)) this.setState('run');
  }
  slide(it) {
    const m = this.m, b = this.body, mv = it.move || [0, 0];
    const a = hyp(mv[0], mv[1]) > .2 ? Math.atan2(mv[1], mv[0]) : this.facing; this.facing = a;
    const sp = EF.T.slideSpeed * (m.surface === 'wet' ? 1.25 : 1);
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
    this.setState('slide'); this.doAct('slide', .55); this.slideHit = { ball: false, men: new Set() };
    m.emit('slide', { who: this.id, side: this.side });
  }
  slideStep(dt) {
    const m = this.m, b = this.body, f = Math.exp(-dt * 3); b.vx *= f; b.vy *= f;
    b.update(dt, m.map);
    if (this.stateT < .45) {
      const fx = Math.cos(this.facing), fy = Math.sin(this.facing), tip = { x: b.x + fx * 10, y: b.y + fy * 10 };
      const ball = m.ball, o = m.owner;
      const capsule = p => segDist(p, b, tip);
      if (!this.slideHit.ball && ball.z < 8 && capsule(ball) < 6 && (!o || o.side !== this.side)) {
        this.slideHit.ball = true;
        if (o) { m.owner = null; o.stun = .4; this.tackleWon(o, true); }
        ball.vx = fx * 150; ball.vy = fy * 150; ball.vz = 20; ball.onGround = false; ball.to = null; ball.kind = 'tackle'; m.last = this; m.lastTouch = this.side; this.cool = .3;
      }
      for (const v of m.side[1 - this.side]) {
        if (v.sentOff || v.gk && v.state === 'keeper-hold' || this.slideHit.men.has(v) || !['run', 'skill', 'poke', 'barge', 'stunned'].includes(v.state)) continue;
        if (capsule(v.body) < 8) {
          this.slideHit.men.add(v);
          const closing = hyp(b.vx - v.body.vx, b.vy - v.body.vy) + 60;
          if (this.slideHit.ball) { if (m.rng() < .4) v.knock('stumble'); continue; }
          v.knock('launch', this.facing);
          m.contact(this, v, { closing, kind: 'slide' });
        }
      }
    }
    if (this.stateT >= .6) this.setState('run');
  }
  barge() {
    const b = this.body; b.vx += Math.cos(this.facing) * 60; b.vy += Math.sin(this.facing) * 60;
    this.setState('barge'); this.doAct('barge', .3); this.bargeDone = false; this.m.emit('barge', { who: this.id });
  }
  bargeStep(dt) {
    const m = this.m, b = this.body; this.decel(dt, 200); b.update(dt, m.map);
    if (!this.bargeDone && this.stateT > .08 && this.stateT < .25) {
      const sh = { x: b.x + Math.cos(this.facing) * 6, y: b.y + Math.sin(this.facing) * 6 }, o = m.owner;
      for (const v of m.side[1 - this.side]) {
        if (v.sentOff || v.gk || hyp(v.body.x - sh.x, v.body.y - sh.y) > 9) continue;
        this.bargeDone = true;
        const behind = Math.abs(E.angDiff(v.facing, angTo(v.body, b))) > 2.1;
        if (behind) { m.contact(this, v, { closing: 160, kind: 'barge', behind: true }); v.knock('down'); break; }
        if (this.st.weight + m.rng() * 30 > v.st.weight + m.rng() * 30) {
          v.knock('stumble'); if (o === v) { m.owner = null; const ball = m.ball; ball.vx = Math.cos(this.facing) * 60; ball.vy = Math.sin(this.facing) * 60; ball.to = null; m.last = this; this.tackleWon(v, false); }
          m.emit('bargeWin', { who: this.id, victim: v.id });
        } else { this.knock('stumble'); m.emit('bargeFail', { who: this.id }); }
        break;
      }
    }
    if (this.stateT > .3) this.setState('run');
  }
  tackleWon(victim, slide) {
    const m = this.m; this.tackles++; m.stats[this.side].tackles++;
    m.gain(this.side, slide ? 8 : 6, 'tackle'); m.emit('tackleWon', { who: this.id, side: this.side, victim: victim.id, slide });
  }
  knock(kind, angle) {
    const m = this.m, b = this.body;
    if (this.gk && this.state.startsWith('keeper')) return;
    if (m.owner === this) { m.owner = null; const ball = m.ball; ball.vx = b.vx * .6 + (angle != null ? Math.cos(angle) * 50 : 0); ball.vy = b.vy * .6 + (angle != null ? Math.sin(angle) * 50 : 0); ball.to = null; }
    this.charging = false; this.meter = 0; this.air = null; this.lift = 0;
    this.contactT = m.t;
    if (kind === 'launch') { this.setState('launched'); b.vz = 120; b.onGround = false; b.z = Math.max(b.z, 1); if (angle != null) { b.vx = Math.cos(angle) * 70; b.vy = Math.sin(angle) * 70; } m.emit('launch', { who: this.id, x: b.x, y: b.y }); }
    else if (kind === 'down') { this.setState('down'); this.downT = .8 + m.rng() * .6; m.emit('knockdown', { who: this.id, x: b.x, y: b.y, kind }); }
    else { this.setState('stunned'); this.downT = .4; }
  }
  theatrics() {
    const m = this.m; this.setState('dive'); this.diveJudged = false; this.doAct('dive', 1.2);
    const b = this.body; b.vx = Math.cos(this.facing) * 90; b.vy = Math.sin(this.facing) * 90; b.vz = 60; b.onGround = false;
    if (m.owner === this) { m.owner = null; m.ball.vx = b.vx * .5; m.ball.vy = b.vy * .5; m.ball.to = null; }
    m.emit('dive', { who: this.id, side: this.side });
  }
  diveStep(dt) {
    const m = this.m, b = this.body; if (b.onGround) this.decel(dt, 260); b.update(dt, m.map);
    if (!this.diveJudged && this.stateT > .3) { this.diveJudged = true; judgeDive(m, this); }
    if (this.stateT >= 1.2) { this.setState('getup'); }
  }
  offStep(dt) {
    const b = this.body;
    if (this.state !== 'off') return;
    if (this.stateT < 6) { this.goTo(P.CX + 20, P.Y1 + 30, 50, dt); this.stateT += 0; }
    if (hyp(b.x - P.CX - 20, b.y - P.Y1 - 30) < 8) { b.x = -9999; b.y = -9999; this.state = 'gone'; }
  }
}
EF.Footballer = Footballer;
function nearestFoe(m, f, side) { let d = 999; for (const o of m.side[1 - side]) if (!o.sentOff) d = Math.min(d, dist(o.body, f.body)); return d; }
EF.nearestFoe = nearestFoe;
/** where the ball will be: a quick integration (gravity, bounces, rolling, curl) for t seconds, sampled every step */
function predictBall(m, T = .6, step = 1 / 60) {
  const b = m.ball, out = []; let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, spin = b.spin || 0;
  const g = b.gravity || EF.T.ballGravity, [fr] = m.surfaceAt(x, y);
  for (let t = step; t <= T + 1e-6; t += step) {
    const sp = hyp(vx, vy); if (spin && sp > 20) { const k = spin * step, ovx = vx; vx += -vy * k; vy += ovx * k; spin *= Math.exp(-step * 1.4); }
    if (z <= .5 && vz <= 0) { const f = Math.exp(-step * EF.T.ballFriction * fr); vx *= f; vy *= f; }
    x += vx * step; y += vy * step; vz -= g * step; z += vz * step;
    if (z < 0) { z = 0; vz = Math.abs(vz) > 30 ? -vz * (b.bounce || .55) : 0; }
    out.push({ t, x, y, z });
  }
  return out;
}
EF.predictBall = predictBall;
/** the air-ball window: a point on the ball's coming path a footballer can reach, with the ball between 4 and 40 high */
function airWindow(f) {
  const m = f.m, b = m.ball;
  if (m.owner || b.superPath || (b.z < 4 && b.vz < 40)) return null;
  if (f.state !== 'run' || f.gk) return null;
  const path = predictBall(m, .6, 1 / 30), sp = f.speed() * 1.2;
  for (const p of path) {
    if (p.z < 4 || p.z > 40) continue;
    const d = hyp(p.x - f.body.x, p.y - f.body.y);
    if (d <= 10 + p.t * sp && d < 46) return p;
  }
  return null;
}
EF.airWindow = airWindow;
/** a shot: the keeper reads it, stats count it, the crowd leans in */
function registerShot(m, f, sp, sweet, kind, p) {
  const side = f.side, gx = m.goalX(side), path = predictBall(m, 1.6, 1 / 60);
  let cross = null;
  for (const q of path) if ((gx > P.CX ? q.x >= gx : q.x <= gx)) { cross = q; break; }
  const onTarget = !!cross && Math.abs(cross.y - P.CY) < P.GH - 2 && cross.z < P.BAR - 1;
  f.shots++; m.stats[side].shots++; if (onTarget) m.stats[side].onTarget++;
  m.shot = { by: f, side, t0: m.t, kind, speed: sp, sweet, onTarget, cross, done: false, read: false };
  m.emit('shot', { side, who: f.id, power: p, sweet, kind, onTarget, speed: sp });
  if (onTarget) { m.gain(side, 5 + (sweet ? 4 : 0), 'onTarget'); m.emit('onTarget', { side, who: f.id }); }
  if (sweet) m.emit('screamer', { side, who: f.id });
  const k = m.keeper[1 - side]; if (k) keeperRead(k, m.shot);
}
EF.registerShot = registerShot;
