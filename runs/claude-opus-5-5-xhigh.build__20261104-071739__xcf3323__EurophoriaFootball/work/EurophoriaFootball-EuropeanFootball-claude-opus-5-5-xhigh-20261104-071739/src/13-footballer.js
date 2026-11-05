/* THE FOOTBALLER (sections 6.3 - 6.7): a Body with stats and stamina, driven by one Intent a step (Footballer.act is the
 * only way he does anything). The state machine: run, kick, poke, slide, barge, skill, air, down, launched, getup,
 * dive (theatrics), celebrate, keeper-dive, keeper-hold, off (sent off), setpiece. The presentation reads `look`. */
const B0 = () => ({ down: false, pressed: false, released: false });
EF.Intent = {
  make() { return { move: [0, 0], aim: null, aimPoint: null, sprint: false, pass: B0(), shoot: B0(), lob: B0(), through: B0(), skill: B0(), sw: B0(), dive: B0(), euphoria: false, target: null, air: null, power: null, keeperDive: null, cel: -1 }; },
  idle: null
};
EF.Intent.idle = EF.Intent.make();
class Footballer {
  constructor(m, side, idx, data, slot) {
    this.m = m; this.side = side; this.idx = idx; this.data = data; this.slot = slot; this.team = m.teams[side];
    this.role = data.pos === 'GK' ? 'GK' : String(slot).replace(/[LR]$/, '');
    this.body = new E.Body({ x: P.CX, y: P.CY, r: 5, friction: 0, gravity: 700 });
    this.facing = side ? Math.PI : 0; this.stamina = 100; this.state = 'run'; this.stT = 0; this.action = null;
    this.cool = 0; this.stun = 0; this.downT = 0; this.invuln = 0; this.cards = 0; this.sentOff = false; this.ghost = false; this.human = null;
    this.charge = 0; this.charging = false; this.kickName = null; this.kickT = 0; this.kickDur = 0; this.tilt = null; this.pose = null; this.expr = null;
    this.contactT = -9; this.contactBy = null; this.stride = 0; this.sprinting = false; this.skillCool = 0; this.curlT = 0; this.ownT = 0; this.lastTouchT = -9;
    this.order = null; this.frozen = false; this.holding = false; this.clip = null; this.glow = 0; this.sweat = false; this.lastIntent = EF.Intent.idle;
    this.look = { pose: null, expr: null, tilt: null, down: 0, air: false, sprint: false, hurt: false, spin: 0, clip: null };
    this.rating = 6; this.goalsN = 0;
  }
  get name() { return this.data.name; }
  get short() { const n = this.data.short || this.data.name.split(' ').slice(-1)[0]; return n; }
  stat(k) {
    const v = (this.data.stats && this.data.stats[k]) || 50, m = this.m, b = m.buffs[this.side];
    let x = v;
    if (k === 'pass' && b.pass) x += b.pass;
    if (k === 'tackle' && b.hairdryer && m.minute < 15) x += 10;
    return x;
  }
  get x() { return this.body.x; } get y() { return this.body.y; }
  hasBall() { return this.m.owner === this; }
  inOwnBox() { return P.inBoxAt(this.m.ownGoalX(this.side), this.body.x, this.body.y); }
  canTake() { const s = this.state; return !this.sentOff && !this.ghost && this.cool <= 0 && this.stun <= 0 && s !== 'down' && s !== 'launched' && s !== 'getup' && s !== 'dive' && s !== 'celebrate' && s !== 'off' && s !== 'keeper-dive' && !this.frozen && this.body.z < 10; }
  handPoint() { const B = this.body; return [B.x + Math.cos(this.facing) * 4, B.y + Math.sin(this.facing) * 4, B.z + 12]; }
  idleIntent() { const it = EF.Intent.make(); if (this.order && this.order.to) { const d = H.d2(this.order.to[0], this.order.to[1], this.body.x, this.body.y); if (d > 3) it.move = [(this.order.to[0] - this.body.x) / d, (this.order.to[1] - this.body.y) / d]; if (d < 30) { it.move[0] *= d / 30; it.move[1] *= d / 30; } } return it; }
  setState(s, dur) { this.state = s; this.stT = 0; this.stDur = dur || 0; }
  playKick(name, dur) { this.kickName = name; this.kickT = 0; this.kickDur = dur || (EF.KICKS[name] ? EF.KICKS[name].total : .35); }
  speedMax(it) {
    const T = EF.T, m = this.m, eu = m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0;
    let v = T.runSpeed * (.85 + .3 * this.stat('pace') / 100);
    const tired = this.stamina < 25 && !eu && !m.cheats['stamina' + this.side];
    if (it && it.sprint && this.state === 'run') { v *= tired ? 1.15 : this.hasBall() ? T.sprintMul - .1 : T.sprintMul; }
    if (eu) v *= 1.12;
    if (m.buffs[this.side].hairdryer && m.minute < 15) v *= 1.1;
    if (this.role === 'GK') v *= .95;
    if (!m.hasHuman(this.side) && m.humans.length && m.kind !== 'attract') v *= m.diff.pace || 1;   // difficulty: the CPU's pace
    if (m.surface === 'snow') v *= .94;
    return v;
  }
  /* ---- the step ---- */
  step(dt, it, frozen) {
    const m = this.m, B = this.body, T = EF.T;
    this.cool = Math.max(0, this.cool - dt); this.stun = Math.max(0, this.stun - dt); this.invuln = Math.max(0, this.invuln - dt);
    this.skillCool = Math.max(0, this.skillCool - dt); this.curlT = Math.max(0, this.curlT - dt); this.stT += dt; this.kickT += dt;
    if (this.kickName && this.kickT > this.kickDur) this.kickName = null;
    this.lastIntent = it;
    if (this.ghost && !this.sentOff) return;
    if (this.sentOff) { if (!this.ghost) this.walkOff(dt); return; }
    const s = this.state;
    let want = [0, 0], max = 0;
    if (s === 'run' || s === 'kick' || s === 'setpiece') {
      max = this.speedMax(it); want = it.move;
      if (this.stun > 0) max *= .35;
      if (this.turnSlow > 0) { this.turnSlow -= dt; max *= .7; }
      if (s === 'kick' && this.stT > (this.stDur || .12)) this.setState('run');
      if (this.role === 'GK' && this.keeperMove) max *= this.keeperMove;
      const vx = want[0] * max, vy = want[1] * max, acc = T.accel * (frozen ? .7 : 1);
      B.vx = approach(B.vx, vx, acc * dt); B.vy = approach(B.vy, vy, acc * dt);
      const mv = Math.hypot(want[0], want[1]);
      if (mv > .2) {
        const a = Math.atan2(want[1], want[0]), was = this.facing;
        this.facing = E.approachAng(this.facing, a, dt * (this.hasBall() ? 9 : 14));
        if (this.hasBall() && Math.abs(E.angDiff(was, a)) > 1.75 && !this.turnSlow) this.turnSlow = .2;
      } else if (it.aim && !this.hasBall()) this.facing = E.approachAng(this.facing, Math.atan2(it.aim[1], it.aim[0]), dt * 10);
      if (s !== 'setpiece' && !frozen) this.act(it, dt);
    } else this.stateStep(dt, it);
    // stamina: sprinting drains, rest regains (faster at 34+ Euphoria, with the arm round the shoulder)
    const sp = Math.hypot(B.vx, B.vy), eu = m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0;
    this.sprinting = !!it.sprint && sp > T.runSpeed * .9 && (s === 'run' || s === 'kick');
    if (this.sprinting && !eu && !m.cheats['stamina' + this.side] && m.kind !== 'attract') { this.stamina = Math.max(0, this.stamina - T.staminaDrain * dt); this.restT = 0; }
    else { this.restT = (this.restT || 0) + dt; if (this.restT > .5) this.stamina = Math.min(100, this.stamina + T.staminaRegen * dt * (m.euphoria[this.side] >= 34 ? 1.25 : 1) * (m.buffs[this.side].regen || 1)); }
    this.sweat = this.stamina < 25;
    this.stride += dt * sp / 7;
    B.update(dt, m.pitch.map);
    // the pitch's limits for bodies: the field, the aprons, not the stands
    B.x = clamp(B.x, P.END_W + 20, P.END_E - 20); B.y = clamp(B.y, P.Y0 - 10, P.Y1 + 30);
    this.updateLook(dt, it);
  }
  /** the special states: timers, motion, contacts */
  stateStep(dt, it) {
    const m = this.m, B = this.body, s = this.state, brake = k => { B.vx = approach(B.vx, 0, k * dt); B.vy = approach(B.vy, 0, k * dt); };
    if (s === 'down') { brake(500); this.downT -= dt; if (this.downT <= 0) this.setState('getup', .5); }
    else if (s === 'getup') { brake(600); if (this.stT >= this.stDur) { this.setState('run'); this.tilt = null; this.clip = null; } }
    else if (s === 'launched') {
      this.spinA = (this.spinA || 0) + dt * 15;
      if (B.onGround && this.stT > .2) { this.setState('down'); this.downT = .9 + m.rng() * .5; brake(2000); m.emit('knockdown', { who: this, x: B.x, y: B.y, power: 1 }); }
    }
    else if (s === 'slide') this.slideStep(dt);
    else if (s === 'poke') this.pokeStep(dt);
    else if (s === 'barge') this.bargeStep(dt);
    else if (s === 'skill') this.skillStep(dt, it);
    else if (s === 'air') this.airStep(dt);
    else if (s === 'dive') { const f = Math.exp(-dt * 3.5); B.vx *= f; B.vy *= f; if (this.stT > 1.2) this.setState('getup', .5); }
    else if (s === 'keeper-dive' || s === 'keeper-hold' || s === 'keeper-throw' || s === 'smother') this.keeperState(dt, it);
    else if (s === 'super') this.superHold(dt);
    else if (s === 'stumble') { brake(300); if (this.stT > .4) this.setState('run'); }
    else this.setState('run');
  }
  /** the presentation's view of him (rig state), set each step so replays and clients see the same */
  updateLook(dt, it) {
    const L = this.look, s = this.state, B = this.body;
    L.sprint = this.sprinting; L.hurt = this.stun > 0 || s === 'stumble'; L.air = B.z > 2 && s !== 'keeper-dive' && s !== 'launched' && s !== 'air';
    L.pose = this.pose || (this.role === 'GK' && s === 'run' && H.d(B, this.m.ball) < 220 && !this.hasBall() ? 'guard' : null);
    L.expr = this.expr || (s === 'down' || s === 'launched' || s === 'dive' ? 'wince' : this.charging ? 'shout' : null);
    L.down = s === 'down' ? 1 : s === 'getup' ? Math.max(0, 1 - this.stT / .45) : s === 'dive' && this.stT > .45 ? 1 : 0;
    if (this.clip) this.clip.t += dt * (this.clip.speed || 1);
    L.tilt = this.tilt; L.clip = this.clip; L.proc = this.proc || null;
    L.spin = this.spinT > 0 ? this.spinA : 0;
    if (this.spinT > 0) this.spinT -= dt;
  }
  walkOff(dt) {
    const B = this.body, tx = P.CX - 60, ty = P.Y1 + 34, d = H.d2(tx, ty, B.x, B.y);
    if (d < 6) { this.ghost = true; B.x = -999; B.y = -999; return; }
    B.vx = (tx - B.x) / d * 50; B.vy = (ty - B.y) / d * 50; this.facing = Math.atan2(B.vy, B.vx); B.x += B.vx * dt; B.y += B.vy * dt;
    this.state = 'off'; this.look.pose = null; this.look.expr = 'angry'; this.stride += dt * 7;
  }
  /* ---- the buttons (section 2.1): with the ball and without it ---- */
  act(it, dt) {
    const m = this.m;
    if (it.euphoria) m.triggerEuphoria(this.side, this);
    if (this.role === 'GK' && !this.human) { this.keeperAct && this.keeperAct(it, dt); return; }
    if (this.hasBall()) {
      if (it.shoot.down || (this.charging && !it.shoot.released)) {
        if (!this.charging) { this.charging = true; this.charge = 0; }
        const k = (m.euphoria[this.side] >= 67 ? 1.25 : 1) / EF.T.shotChargeTime;
        this.charge = Math.min(1, this.charge + dt * k);
        if (it.power !== null && it.power !== undefined && this.charge >= it.power) return this.shoot(this.charge, it);
        if (!it.shoot.down) return this.shoot(this.charge, it);
        return;
      }
      if (this.charging) return this.shoot(this.charge, it);
      if (this.cool > 0) return;
      if (it.pass.pressed) return it.sw.down && this.human ? this.passBall(it, 'oneTwo') : this.passBall(it, 'ground');
      if (it.through.pressed) return this.passBall(it, 'through');
      if (it.lob.pressed) return this.lobBall(it);
      if (it.skill.pressed) return this.skillMove(it);
      if (it.dive.pressed) return this.theatrics();
      return;
    }
    this.charging = false; this.charge = 0;
    // the air-ball window: shoot finishes, pass cushions (section 6.5)
    if ((it.shoot.pressed || it.pass.pressed || it.air) && this.canTake() !== undefined) {
      const w = this.airWindow();
      if (w && (it.air || it.shoot.pressed || it.pass.pressed)) return this.airMove(w, it.air ? it.air : it.pass.pressed ? 'cushion' : 'finish', it);
    }
    if (this.cool > 0) return;
    const opp = m.owner && m.owner.side !== this.side, loose = !m.owner;
    if (it.pass.pressed && (opp || loose)) return this.poke();
    if (it.shoot.pressed && (opp || loose)) return this.slide(it);
    if (it.lob.pressed) return this.barge();
    if ((it.through.pressed || it.sw.pressed) && this.human) return m.switchHuman(this.human, it.sw.pressed && this.human.fb === this && false);
    if (it.dive.pressed) return this.theatrics();
  }
  /* ---- passing (section 6.4) ---- */
  /** the receiver for a pass in direction dir: the teammate it points at, within the assist cone */
  receiver(dir, kind) {
    const m = this.m, B = this.body, assist = game.settings.passAssist, cone = (assist === 'off' ? 20 : assist === 'low' ? 35 : EF.T.passAssistDeg) * Math.PI / 180;
    const d0 = Math.atan2(dir[1], dir[0]), backward = Math.cos(d0) * m.dir(this.side) < -.5;
    let best = null, bs = -1e9;
    for (const f of m.side[this.side]) {
      if (f === this || f.sentOff || f.state === 'down' || f.state === 'launched') continue;
      if (f.role === 'GK' && !backward) continue;
      const a = Math.atan2(f.body.y - B.y, f.body.x - B.x), da = Math.abs(E.angDiff(a, d0)); if (da > cone) continue;
      const d = H.d(f.body, B), opp = m.side[1 - this.side].reduce((mn, o) => Math.min(mn, H.d(o.body, f.body)), 999), open = Math.min(1, opp / 40);
      const sc = Math.cos(da) - d / 1200 + .15 * open + (kind === 'through' && f.role === 'FWD' ? .1 : 0);
      if (sc > bs) { bs = sc; best = f; }
    }
    return best;
  }
  pressure() { const B = this.body; return this.m.side[1 - this.side].some(o => !o.sentOff && H.d(o.body, B) < 12); }
  passBall(it, kind) {
    const m = this.m, B = this.body, b = m.ball, T = EF.T;
    const dir = it.aim || (Math.hypot(it.move[0], it.move[1]) > .2 ? it.move : [Math.cos(this.facing), Math.sin(this.facing)]);
    let to = it.target && it.target.side === this.side && it.target !== this ? it.target : this.receiver(dir, kind);
    let tx, ty, sp;
    if (it.aimPoint && !it.target && !to) { tx = it.aimPoint.x; ty = it.aimPoint.y; }
    if (to) {
      const d = H.d(to.body, B);
      if (kind === 'through') {
        const runDir = m.dir(this.side), lead = 50 + m.rng() * 40;
        tx = to.body.x + runDir * lead + to.body.vx * .3; ty = to.body.y + to.body.vy * .4;
        to.order = { kind: 'run', to: [tx, ty], t: 1.6 };
      } else {   // lead him by the ball's real travel time (it slows as it rolls)
        const kf = T.ballFriction * (EF.SURF[m.surface] || EF.SURF.grass).fr, tTo = (dd, v) => { const q = 1 - dd * kf / v; return q > .05 ? -Math.log(q) / kf : dd / v * 2.5; };
        tx = to.body.x; ty = to.body.y;
        for (let i = 0; i < 3; i++) { const dd = H.d2(tx, ty, B.x, B.y); sp = clamp(dd * 1.5 + 90, T.passSpeedMin, T.passSpeedMax); const tt = tTo(dd, sp); tx = to.body.x + to.body.vx * tt; ty = to.body.y + to.body.vy * tt; }
      }
    } else if (tx === undefined) { tx = B.x + dir[0] * 120; ty = B.y + dir[1] * 120; }
    tx = clamp(tx, P.X0 - 20, P.X1 + 20); ty = clamp(ty, P.Y0 + 4, P.Y1 - 4);
    const d = H.d2(tx, ty, B.x, B.y); if (!sp) sp = clamp(d * 1.5 + 90, T.passSpeedMin, T.passSpeedMax) * (kind === 'through' ? 1.05 : 1);
    let a = Math.atan2(ty - B.y, tx - B.x);
    const sig = (100 - this.stat('pass')) / 100 * .06 * (this.pressure() ? 2 : 1); a += H.gauss(m.rng) * sig;
    b.kick(Math.cos(a) * sp, Math.sin(a) * sp, 0, { who: this, pass: { from: this, to, kind: kind === 'oneTwo' ? 'oneTwo' : kind, oneTwo: kind === 'oneTwo' } });
    this.facing = a; this.playKick('pass'); this.setState('kick', .12);
    m.stats.passes[this.side]++;
    if (kind === 'oneTwo' && to) { to.order = { kind: 'oneTwo', back: this, t: 2.5 }; this.order = { kind: 'run', to: [B.x + m.dir(this.side) * 110, B.y], t: 1.2 }; }
    m.emit('pass', { who: this, to, kind });
    this.useAction(kind === 'through' ? 'through' : 'pass');
  }
  lobBall(it) {
    const m = this.m, B = this.body, b = m.ball, gx = m.goalX(this.side), dg = H.d2(gx, P.CY, B.x, B.y), k = m.keeper(1 - this.side);
    // a chip over the keeper when he's off his line
    if (dg < 160 && k && Math.abs(k.body.x - gx) > 24 && !it.target) {
      const tx = gx - m.dir(this.side) * 4, ty = clamp(P.CY + (it.move[1] || 0) * 20, P.CY - P.GH + 8, P.CY + P.GH - 8);
      const v = E.arc({ x: B.x, y: B.y, z: 0 }, { x: tx, y: ty, z: P.BAR - 8 }, EF.T.ballGravity, { apex: 45 });
      b.kick(v.vx, v.vy, v.vz, { who: this, shot: { side: this.side, power: .5, chip: true, target: { y: ty, z: P.BAR - 8 } } });
      this.playKick('chip'); this.setState('kick', .15); m.stats.shots[this.side]++; m.emit('shot', { who: this, power: .5, chip: true, x: B.x, y: B.y }); this.useAction('lob'); return;
    }
    const wide = Math.abs(B.y - P.CY) > 150 && this.m.u(this.side, B.x) > .7;
    const dir = it.aim || (Math.hypot(it.move[0], it.move[1]) > .2 ? it.move : [Math.cos(this.facing), Math.sin(this.facing)]);
    let to = it.target && it.target.side === this.side ? it.target : null, tx, ty, kind = 'lob';
    if (!to && wide && !it.aimPoint) {   // a cross: to the penalty spot area, or the teammate nearest it
      kind = 'cross'; const spot = { x: gx - m.dir(this.side) * (P.SPOT + 10), y: P.CY };
      to = m.side[this.side].filter(f => f !== this && f.role !== 'GK' && !f.sentOff).sort((a2, c) => H.d(a2.body, spot) - H.d(c.body, spot))[0] || null;
      tx = spot.x + (to ? (to.body.x - spot.x) * .5 : 0); ty = spot.y + (to ? (to.body.y - spot.y) * .5 : 0);
    } else if (it.aimPoint && !to) { tx = it.aimPoint.x; ty = it.aimPoint.y; }
    else { to = to || this.receiver(dir, 'lob'); if (to) { const lead = .55; tx = to.body.x + to.body.vx * lead; ty = to.body.y + to.body.vy * lead; } else { tx = B.x + dir[0] * 160; ty = B.y + dir[1] * 160; } }
    tx = clamp(tx, P.X0 - 10, P.X1 + 10); ty = clamp(ty, P.Y0 + 6, P.Y1 - 6);
    const d = H.d2(tx, ty, B.x, B.y), sig = (100 - this.stat('pass')) / 100 * 18;
    tx += H.gauss(m.rng) * sig; ty += H.gauss(m.rng) * sig;
    const v = E.arc({ x: B.x, y: B.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: kind === 'cross' ? 55 : d > 250 ? 55 : 30 });
    b.kick(v.vx, v.vy, v.vz, { who: this, pass: { from: this, to, kind, land: [tx, ty] } });
    if (to) to.order = { kind: 'meet', to: [tx, ty], t: v.t + .4 };
    this.facing = Math.atan2(ty - B.y, tx - B.x); this.playKick('chip'); this.setState('kick', .15);
    m.stats.passes[this.side]++; m.emit('pass', { who: this, to, kind }); if (kind === 'cross') m.emit('cross', { who: this });
    this.useAction('lob');
  }
  /* ---- shooting (section 6.5) ---- */
  shoot(p, it) {
    const m = this.m, B = this.body, b = m.ball, T = EF.T, gx = m.goalX(this.side), k = m.keeper(1 - this.side);
    this.charging = false; this.charge = 0;
    // a super strike: charged to 0.9 in the side's Europhoria
    if (m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0 && !m.superUsed && p >= .9 && !m.pure) return m.superStrike(this, it);
    let ty;
    const ay = it.aim ? it.aim[1] : it.move[1];
    if (it.aimPoint) ty = clamp(it.aimPoint.y, P.CY - P.GH + 5, P.CY + P.GH - 5);
    else if (Math.abs(ay) > .25) ty = P.CY + clamp(ay, -1, 1) * (P.GH - 6);
    else if (game.settings.shotAssist !== false && k) ty = P.CY + (k.body.y > P.CY ? -1 : 1) * (P.GH - 9);
    else ty = P.CY + (m.rng() - .5) * 20;
    const screamer = p >= .78 && p <= .9 && !m.pure, speed = (180 + p * (T.shotSpeedMax - 180)) * (screamer ? 1.15 : 1);
    let tz = 3 + p * 22 + (it.lift || 0); if (p > .95 && m.rng() < .5) tz += 26;
    const d = H.d2(gx, ty, B.x, B.y); let a = Math.atan2(ty - B.y, gx - B.x);
    const across = Math.abs(E.angDiff(a, this.facing)) > 1.75;
    const cpu = !this.human || this.human.cpu, sig = ((100 - this.stat('shoot')) / 100 * .08 + (this.pressure() ? .04 : 0) + (across ? .05 : 0)) * (cpu && !m.hasHuman(this.side) ? m.diff.shotErr || 1 : 1);
    a += H.gauss(m.rng) * sig; tz = Math.max(1, tz + H.gauss(m.rng) * sig * 60);
    const t = d / speed, g = T.ballGravity, vz = Math.max(10, (tz + .5 * g * t * t) / t);
    b.kick(Math.cos(a) * speed, Math.sin(a) * speed, Math.min(vz, 170), { who: this, shot: { side: this.side, power: p, target: { y: ty, z: tz }, screamer }, screamer });
    this.facing = a; this.curlT = .4; this.playKick(p > .7 ? 'shotHard' : 'shot'); this.setState('kick', .18);
    m.stats.shots[this.side]++; if (this.human) this.human.stats.Shots++;
    m.emit('shot', { who: this, power: p, screamer, target: { y: ty, z: tz }, x: B.x, y: B.y, speed });
    this.useAction('shoot');
  }
  /** aftertouch: the stick across the ball's path just after a shot curls it */
  aftertouch(stick, dt) {
    const b = this.m.ball; if (this.curlT <= 0 || this.m.owner || b.superPath || this.m.lastKick !== this) return;
    const sp = Math.hypot(b.vx, b.vy) || 1, across = (stick[0] * -b.vy + stick[1] * b.vx) / sp;
    if (Math.abs(across) > .3) { b.spin = clamp(b.spin + across * EF.T.curlStrength * dt, -1.6, 1.6); if (!this._curled) { this._curled = true; this.m.emit('curl', { who: this }); } }
    if (this.curlT <= dt) this._curled = false;
  }
  /* ---- air moves: headers, volleys, bicycle kicks, diving headers (section 6.5) ---- */
  airWindow() {
    const m = this.m, b = m.ball; if (m.owner || b.superPath || b.held) return null;
    const B = this.body;
    for (let t = 0; t <= .6; t += 1 / 30) {
      const p = b.predict(t), d = H.d2(p.x, p.y, B.x, B.y);
      if (p.z >= 4 && p.z <= 40 && d <= 7 + 150 * t) return { t, x: p.x, y: p.y, z: p.z, d };
    }
    return null;
  }
  airMove(w, intent, it) {
    const m = this.m, B = this.body, gx = m.goalX(this.side), toGoal = Math.atan2(P.CY - B.y, gx - B.x);
    const facingGoal = Math.abs(E.angDiff(this.facing, toGoal)) < 1.92, sprint = it.sprint;
    let kind;
    if (w.z > 22) kind = facingGoal || intent === 'cushion' ? 'header' : 'bicycle';
    else if (w.z >= 8) kind = 'volley';
    else kind = sprint ? 'divingHeader' : 'volley';
    if (w.z < 14 && w.z >= 4 && sprint && intent === 'finish' && m.rng() < .5 && kind !== 'volley') kind = 'divingHeader';
    this.air = { kind, intent, tc: Math.max(.08, w.t), x: w.x, y: w.y, z: w.z, done: false, sx: B.x, sy: B.y, aim: it.aimPoint, ay: it.aim ? it.aim[1] : it.move[1] };
    this.setState('air', this.air.tc + .55);
    if (kind === 'bicycle') { m.slow(.35, .55); this.facing = toGoal + Math.PI; }
    else if (kind !== 'divingHeader') this.facing = Math.atan2(w.y - B.y, w.x - B.x) * .3 + toGoal * .7;
    m.emit('air', { who: this, kind });
    this.useAction('air');
  }
  airStep(dt) {
    const m = this.m, B = this.body, A = this.air, b = m.ball; if (!A) { this.setState('run'); return; }
    const tLeft = A.tc - this.stT;
    if (!A.done) {
      const d = H.d2(A.x, A.y, B.x, B.y), need = tLeft > .02 ? Math.min(240, d / tLeft) : 0, a = Math.atan2(A.y - B.y, A.x - B.x);
      B.vx = Math.cos(a) * need; B.vy = Math.sin(a) * need;
      if (A.kind === 'header' && A.z > 28 && B.onGround && tLeft < .3) B.vz = 150;
      if (A.kind === 'divingHeader') { this.tilt = { axis: 'right', angle: clamp(this.stT / A.tc, 0, 1) * 1.3, pivot: 'hips', lift: 6 }; this.facing = a; }
      if (A.kind === 'bicycle') this.tilt = { axis: 'right', angle: -clamp(this.stT / A.tc, 0, 1) * 2.4, pivot: 'hips', lift: 4 + 10 * Math.sin(clamp(this.stT / A.tc, 0, 1) * Math.PI / 2) };
      if (A.kind === 'header') this.tilt = { axis: 'right', angle: .35 * Math.sin(clamp(this.stT / A.tc, 0, 1.4) * Math.PI), pivot: 'feet' };
      if (tLeft <= 0) {
        A.done = true;
        const dd = Math.hypot(b.x - B.x, b.y - B.y), dz = Math.abs(b.z - (A.kind === 'header' ? B.z + 26 : A.kind === 'bicycle' ? 22 : A.kind === 'divingHeader' ? 8 : 12));
        if (dd < 14 && dz < 20 && !m.owner && !b.superPath) this.airStrike(A, dd + dz * .3);
        else m.emit('airMiss', { who: this, kind: A.kind });
        if (A.kind === 'bicycle' || A.kind === 'divingHeader') { this.setState('down'); this.downT = .7; this.clip = null; }
      }
    } else {
      const f = Math.exp(-dt * 6); B.vx *= f; B.vy *= f;
      if (this.stT > this.stDur) { this.setState('run'); this.tilt = null; }
    }
  }
  airStrike(A, miss) {
    const m = this.m, B = this.body, b = m.ball, gx = m.goalX(this.side), k = m.keeper(1 - this.side);
    const q = clamp(1 - miss / 20, .2, 1), atGoal = A.intent === 'finish' && Math.abs(gx - B.x) < 330;
    let speed = { header: 240, bicycle: 420, volley: 340, divingHeader: 290 }[A.kind] * (.85 + .25 * q), tx, ty, tz;
    if (atGoal) {
      tx = gx; ty = A.aim ? clamp(A.aim.y, P.CY - P.GH + 5, P.CY + P.GH - 5) : Math.abs(A.ay) > .25 ? P.CY + clamp(A.ay, -1, 1) * (P.GH - 6) : k ? P.CY + (k.body.y > P.CY ? -1 : 1) * (P.GH - 10) : P.CY;
      tz = A.kind === 'header' ? 6 : A.kind === 'bicycle' ? 18 : 10;
      const err = (1 - q) * .12 + (100 - this.stat('shoot')) / 100 * .06, a = Math.atan2(ty - B.y, tx - B.x) + H.gauss(m.rng) * err;
      const d = H.d2(tx, ty, B.x, B.y), t = d / speed, g = EF.T.ballGravity, vz = clamp((tz - b.z + .5 * g * t * t) / t, -120, 160);
      b.kick(Math.cos(a) * speed, Math.sin(a) * speed, vz, { who: this, shot: { side: this.side, power: .8, air: A.kind, target: { y: ty, z: tz } } });
      m.stats.shots[this.side]++; if (this.human) this.human.stats.Shots++;
      m.emit('shot', { who: this, power: .8, air: A.kind, x: B.x, y: B.y, speed });
    } else {   // a cushioned header or volley to a teammate, or a clearance up the pitch
      const mate = this.receiver([m.dir(this.side), 0], 'lob');
      if (mate && A.intent === 'cushion') { const v = E.arc({ x: b.x, y: b.y, z: b.z }, { x: mate.body.x, y: mate.body.y, z: 0 }, EF.T.ballGravity, { apex: Math.max(b.z + 8, 20) }); b.kick(v.vx, v.vy, v.vz, { who: this, pass: { from: this, to: mate, kind: 'air' } }); }
      else { const a = (m.dir(this.side) > 0 ? 0 : Math.PI) + (m.rng() - .5) * 1.2; b.kick(Math.cos(a) * 260, Math.sin(a) * 260, 140, { who: this, pass: { from: this, to: null, kind: 'clear' } }); }
    }
    this.cool = .3; this.playKick(A.kind === 'volley' ? 'volley' : A.kind === 'bicycle' ? 'bicycle' : 'header');
    if (A.kind === 'header' || A.kind === 'divingHeader') m.stats.headers[this.side]++;
    m.emit(A.kind === 'divingHeader' ? 'header' : A.kind, { who: this, atGoal, quality: q, x: b.x, y: b.y, z: b.z });
  }
  /* ---- skill moves (section 6.6) ---- */
  skillMove(it) {
    const m = this.m; if (this.skillCool > 0 || this.state !== 'run') { if (this.state === 'skill' && this.skill && this.stT < .3 && this.skill.kind !== 'rainbow' && this.skill.kind !== 'spin') this.startSkill('rainbow'); return; }
    const mv = Math.hypot(it.move[0], it.move[1]) > .3 ? Math.atan2(it.move[1], it.move[0]) : null, rel = mv === null ? null : E.angDiff(mv, this.facing);
    const front = this.defenderAhead(16, .5);
    let kind;
    if (rel === null) kind = front ? 'nutmeg' : 'stepover';
    else if (Math.abs(rel) > 2.36) kind = 'spin';
    else if (Math.abs(rel) < .7) kind = front ? 'nutmeg' : this.defenderAhead(40, .9) ? 'stepover' : 'knockon';
    else kind = 'stepover';
    this.startSkill(kind, rel !== null && rel < 0 ? -1 : 1);
  }
  defenderAhead(range, cone) { const B = this.body; return this.m.side[1 - this.side].find(o => !o.sentOff && o.state !== 'down' && H.d(o.body, B) < range && Math.abs(E.angDiff(H.ang(B, o.body), this.facing)) < cone) || null; }
  startSkill(kind, sideSign = 1) {
    const m = this.m; this.skill = { kind, sign: sideSign, resolved: false, victim: null };
    const dur = { stepover: .35, nutmeg: .4, spin: .45, rainbow: .5, knockon: .3 }[kind];
    this.setState('skill', dur); this.skillCool = .6; this.stamina = Math.max(0, this.stamina - 8);
    if (kind === 'spin') { this.spinT = .45; this.spinA = 0; this.invuln = .45; }
    this.playKick(kind === 'rainbow' ? 'rainbow' : kind === 'stepover' ? 'stepover' : 'touch');
    m.emit('skillStart', { who: this, kind });
    this.useAction('skill');
  }
  skillStep(dt, it) {
    const m = this.m, B = this.body, S = this.skill, b = m.ball, f = this.facing; if (!S) { this.setState('run'); return; }
    const u = this.stT / this.stDur, sp = this.speedMax(it) * .7;
    if (S.kind === 'spin') { this.spinA = -u * TAU; B.vx = Math.cos(f) * sp * .5; B.vy = Math.sin(f) * sp * .5; }
    else if (S.kind === 'stepover') { const side = f + S.sign * Math.PI / 2; B.vx = Math.cos(f) * sp * .6 + (u > .6 ? Math.cos(side) * 60 : 0); B.vy = Math.sin(f) * sp * .6 + (u > .6 ? Math.sin(side) * 60 : 0); }
    else { B.vx = Math.cos(f) * sp; B.vy = Math.sin(f) * sp; }
    if (!S.resolved && u > .5) {
      S.resolved = true; const R = m.rng;
      if (S.kind === 'stepover') {
        const d = this.defenderAhead(22, .8);
        if (d) { const ch = clamp(.35 + .5 * (this.stat('skill') - d.stat('tackle')) / 100, .15, .9); if (R() < ch) { d.stumble(.4, S.sign); this.burst = 12; m.addEuphoria(this.side, 8, 'skill'); m.stats.skills[this.side]++; m.emit('skill', { who: this, kind: 'stepover', victim: d }); } else m.emit('skillFail', { who: this, kind: 'stepover' }); }
        else { m.addEuphoria(this.side, 3, 'skill'); m.emit('skill', { who: this, kind: 'stepover' }); }
      } else if (S.kind === 'nutmeg') {
        const d = this.defenderAhead(20, .6);
        if (d && this.hasBall()) {
          if (R() < .45 + .4 * this.stat('skill') / 100) {   // through the legs: the ball rolls past him, you go round
            m.setOwner(null); b.x = d.body.x + Math.cos(f) * 2; b.y = d.body.y + Math.sin(f) * 2; b.vx = Math.cos(f) * 120; b.vy = Math.sin(f) * 120; b.vz = 0;
            d.stumble(.6, 1); d.cool = .6; this.order = { kind: 'run', to: [d.body.x + Math.cos(f) * 30, d.body.y + Math.sin(f) * 30 + 14 * S.sign], t: .6 };
            m.addEuphoria(this.side, 12, 'nutmeg'); m.stats.nutmegs[this.side]++; m.stats.skills[this.side]++; m.emit('nutmeg', { who: this, victim: d }); m.emit('skill', { who: this, kind: 'nutmeg', victim: d });
          } else { m.setOwner(d, 'tackle'); this.stumble(.4, 1); m.emit('skillFail', { who: this, kind: 'nutmeg', victim: d }); }
        } else m.emit('skill', { who: this, kind: 'nutmeg' });
      } else if (S.kind === 'spin') { m.addEuphoria(this.side, 6, 'skill'); m.stats.skills[this.side]++; m.emit('skill', { who: this, kind: 'spin' }); }
      else if (S.kind === 'rainbow') {
        if (this.hasBall()) {
          const d = this.defenderAhead(24, .9); m.setOwner(null); b.kick(Math.cos(f) * 75, Math.sin(f) * 75, 110, { who: this, cool: .25 });
          if (d) { d.stumble(.6, 1); d.cool = .6; }
          m.addEuphoria(this.side, 12, 'rainbow'); m.stats.skills[this.side]++; m.emit('rainbow', { who: this, victim: d }); m.emit('skill', { who: this, kind: 'rainbow', victim: d });
        }
      } else if (S.kind === 'knockon') {
        if (this.hasBall()) { m.setOwner(null); b.kick(Math.cos(f) * 130, Math.sin(f) * 130, 0, { who: this, cool: .2 }); this.order = { kind: 'chase', t: .8 }; m.addEuphoria(this.side, 2, 'skill'); m.emit('skill', { who: this, kind: 'knockon' }); }
      }
    }
    if (this.stT >= this.stDur) {
      if (this.burst) { const side = f + S.sign * Math.PI / 2; B.x += Math.cos(side) * this.burst * .6; B.y += Math.sin(side) * this.burst * .6; this.burst = 0; }
      this.skill = null; this.spinT = 0; this.setState('run');
    }
  }
  stumble(t, sign) { this.setState('stumble', t); this.stun = t; this.clip = { name: sign < 0 ? 'Dodge_left' : 'Dodge_right', t: 0, w: .7 }; this.m.emit('stumble', { who: this }); }
  /* ---- defending (section 6.7) ---- */
  poke() { this.setState('poke', .25); this.pokeHit = false; this.playKick('poke'); this.useAction('tackle'); this.m.emit('poke', { who: this }); }
  pokeStep(dt) {
    const m = this.m, B = this.body, b = m.ball, reach = EF.T.tackleReach * (m.europhoria && m.europhoria.side === this.side ? 1.25 : 1);
    B.vx = approach(B.vx, Math.cos(this.facing) * 40, 900 * dt); B.vy = approach(B.vy, Math.sin(this.facing) * 40, 900 * dt);
    if (!this.pokeHit && this.stT > .08) {
      this.pokeHit = true;
      const toe = [B.x + Math.cos(this.facing) * 6, B.y + Math.sin(this.facing) * 6], c = m.owner;
      const db = H.d2(b.x, b.y, toe[0], toe[1]);
      if (db < reach && b.z < 8 && (!c || (c.side !== this.side && c.invuln <= 0))) {
        if (c) { c.contactT = m.t; c.contactBy = this; c.cool = .35; }
        m.setOwner(null); const a = this.facing + (m.rng() - .5) * .8; b.kick(Math.cos(a) * 90, Math.sin(a) * 90, 10, { who: this, cool: .05 });
        m.stats.tackles[this.side]++; if (this.human) this.human.stats.Tackles++;
        m.emit('tackleWon', { who: this, victim: c, kind: 'poke' }); if (c) m.addEuphoria(this.side, 6, 'tackle');
      } else if (c && c.side !== this.side && H.d(c.body, { x: toe[0], y: toe[1] }) < 9) {
        c.contactT = m.t; c.contactBy = this; m.ref.judge(this, c, { kind: 'poke', speed: Math.hypot(B.vx, B.vy) + 60 });
      } else { this.stun = .3; m.emit('tackleFailed', { who: this, kind: 'poke' }); }
    }
    if (this.stT >= this.stDur) this.setState('run');
  }
  slide(it) {
    const m = this.m, B = this.body, wet = m.surface === 'wet' ? 1.25 : 1, sp = EF.T.slideSpeed * wet;
    const dir = it && Math.hypot(it.move[0], it.move[1]) > .3 ? Math.atan2(it.move[1], it.move[0]) : this.facing;
    this.facing = dir; B.vx = Math.cos(dir) * sp; B.vy = Math.sin(dir) * sp;
    this.setState('slide', .45 * wet + .6); this.slideHit = new Set(); this.slideBall = false;
    this.clip = { name: 'Slide_Loop', t: 0, w: 1 };
    m.emit('slide', { who: this }); this.useAction('slide');
  }
  slideStep(dt) {
    const m = this.m, B = this.body, b = m.ball, moving = this.stT < this.stDur - .6;
    const f = Math.exp(-3 * dt); B.vx *= f; B.vy *= f;
    if (!moving) { B.vx = approach(B.vx, 0, 400 * dt); B.vy = approach(B.vy, 0, 400 * dt); }
    if (moving) {
      // the capsule along the feet: ball first is fair; man first is a foul (and he's launched)
      const fx = B.x + Math.cos(this.facing) * 12, fy = B.y + Math.sin(this.facing) * 12, seg = { x: fx, y: fy };
      const ballOwned = m.owner && m.owner.side !== this.side;
      if (!this.slideBall && b.z < 8 && (!m.owner || ballOwned) && H.segDist(b, B, seg) < 4 + b.r && (!m.owner || m.owner.invuln <= 0)) {
        this.slideBall = true; const victim = m.owner;
        if (victim) { victim.contactT = m.t; victim.contactBy = this; }
        m.setOwner(null); b.kick(Math.cos(this.facing) * 150, Math.sin(this.facing) * 150, 20, { who: this, cool: .2 });
        m.stats.tackles[this.side]++; if (this.human) this.human.stats.Tackles++;
        m.emit('tackleWon', { who: this, victim, kind: 'slide' }); m.addEuphoria(this.side, victim ? 8 : 4, 'tackle');
        if (victim && H.d(victim.body, B) < 10 && m.rng() < .5) victim.knock(this.facing, .6, 'slide');
      }
      for (const o of m.side[1 - this.side]) {
        if (o.sentOff || this.slideHit.has(o) || o.state === 'down' || o.state === 'launched' || o.invuln > 0) continue;
        if (H.segDist(o.body, B, seg) < 4 + o.body.r && Math.abs(o.body.z) < 6) {
          this.slideHit.add(o); o.contactT = m.t; o.contactBy = this;
          const late = !this.slideBall;
          if (late) { m.ref.judge(this, o, { kind: 'slide', speed: Math.hypot(B.vx, B.vy), late: o.lastTouchT < m.t - .4 && !o.hasBall() }); o.launch(this.facing); }
        }
      }
    }
    if (this.stT >= this.stDur) { this.setState('run'); this.clip = null; }
  }
  barge() { const B = this.body; this.setState('barge', .3); B.vx += Math.cos(this.facing) * 60; B.vy += Math.sin(this.facing) * 60; this.bargeHit = false; this.useAction('barge'); this.m.emit('barge', { who: this }); }
  bargeStep(dt) {
    const m = this.m, B = this.body; B.vx = approach(B.vx, 0, 200 * dt); B.vy = approach(B.vy, 0, 200 * dt);
    if (!this.bargeHit && this.stT > .08) {
      const sh = { x: B.x + Math.cos(this.facing) * 5, y: B.y + Math.sin(this.facing) * 5 };
      for (const o of m.side[1 - this.side]) {
        if (o.sentOff || o.state === 'down' || H.d(o.body, sh) > 7 + o.body.r) continue;
        this.bargeHit = true; o.contactT = m.t; o.contactBy = this;
        const behind = Math.abs(E.angDiff(H.ang(o.body, B), o.facing)) > 2.1;
        if (behind) m.ref.judge(this, o, { kind: 'barge', speed: Math.hypot(B.vx, B.vy) + 40, fromBehind: true });
        const R = m.rng;
        if (this.stat('weight') + R() * 30 > o.stat('weight') + R() * 30 && o.invuln <= 0) {
          if (o.hasBall()) { m.setOwner(null); const a = H.ang(B, o.body); m.ball.kick(Math.cos(a) * 60, Math.sin(a) * 60, 10, { who: this, cool: .1 }); m.emit('tackleWon', { who: this, victim: o, kind: 'barge' }); m.stats.tackles[this.side]++; m.addEuphoria(this.side, 6, 'tackle'); if (this.human) this.human.stats.Tackles++; }
          if (this.stat('weight') > 85 && R() < .35) o.knock(H.ang(B, o.body), .7, 'barge'); else o.stumble(.4, R() < .5 ? -1 : 1);
          o.body.vx += Math.cos(this.facing) * 80; o.body.vy += Math.sin(this.facing) * 80;
        } else { B.vx = -Math.cos(this.facing) * 60; B.vy = -Math.sin(this.facing) * 60; this.stun = .3; m.emit('bargeBounce', { who: this, victim: o }); }
        m.emit('bargeHit', { who: this, victim: o }); break;
      }
    }
    if (this.stT >= this.stDur) this.setState('run');
  }
  /** knocked down: power 1+ launches him (a cartwheel through the air), less puts him down */
  knock(angle, power, cause) {
    const m = this.m; if (this.sentOff || this.state === 'down' || this.state === 'launched') return;
    if (m.owner === this) m.setOwner(null);
    if (power >= 1) return this.launch(angle);
    this.setState('down'); this.downT = .8 + power * .6; this.body.vx = Math.cos(angle) * 60 * power; this.body.vy = Math.sin(angle) * 60 * power;
    this.clip = null; this.charging = false; m.emit('knockdown', { who: this, cause, power, x: this.body.x, y: this.body.y });
  }
  launch(angle) {
    const m = this.m; if (m.owner === this) m.setOwner(null);
    const B = this.body; B.vz = 120; B.onGround = false; B.vx = Math.cos(angle) * 110; B.vy = Math.sin(angle) * 110; this.spinA = 0;
    this.setState('launched'); this.charging = false; this.tilt = { axis: 'forward', angle: 0, pivot: 'hips' }; this.clip = null;
    m.emit('launched', { who: this, x: B.x, y: B.y });
  }
  /** a collision at speed (section 6.7): the slower one goes down */
  /* ---- theatrics (section 6.10) ---- */
  theatrics() {
    const m = this.m; if (this.state !== 'run' && this.state !== 'kick') return;
    if (m.owner === this) m.setOwner(null);
    const B = this.body; B.vx = Math.cos(this.facing) * 110; B.vy = Math.sin(this.facing) * 110;
    this.setState('dive', 1.2); this.tilt = { axis: 'right', angle: 0, pivot: 'hips' }; this.charging = false;
    m.ref.judgeDive(this); m.emit('dive', { who: this, x: B.x, y: B.y }); this.useAction('dive');
  }
  /** a human's first uses of each action (the prompts While learning) */
  useAction(a) { if (this.human) this.human.used[a] = (this.human.used[a] || 0) + 1; }
}
EF.Footballer = Footballer;
/* a body-to-body collision at a closing speed over 220 knocks the slower one down */
Match.prototype.collide = function (a, b, cs) {
  if (a.invuln > 0 || b.invuln > 0 || this.mode !== 'play') return;
  const slow = Math.hypot(a.body.vx, a.body.vy) < Math.hypot(b.body.vx, b.body.vy) ? a : b, fast = slow === a ? b : a;
  if (slow.side === fast.side || slow.state !== 'run') return;
  slow.contactT = this.t; slow.contactBy = fast;
  if (cs > 260) { slow.knock(H.ang(fast.body, slow.body), .6, 'collision'); this.ref.judge(fast, slow, { kind: 'collision', speed: cs * .6 }); }
};
