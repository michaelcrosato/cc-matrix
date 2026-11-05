/* 22-players: a volleyball player: movement (no crossing the net), actions with rig states, the jump for attacks and
 * blocks, the dive, calls; a human's controller (the stick, the timing judge, aiming by stick or mouse); the plan
 * (where and when her next contact is) is set by the match. */
G.Player = class {
  constructor(M, idx, side, slot, spec) {
    this.M = M; this.idx = idx; this.side = side; this.slot = slot; this.id = spec.id; this.spec = spec;
    const c = G.CAST[spec.id]; this.cast = c; this.stats0 = c.stats || { POW: 5, TEC: 5, SPD: 5, JMP: 5 };
    this.rig = G.anim.rig(G.makeRig(spec.id, { suit: spec.suit, acc: spec.acc }));
    this.input = spec.input || null; this.human = !!spec.input || !!spec.human; this.seat = spec.seat; this.color = spec.color; this.name = spec.name || c.short;
    this.x = side ? G.COURT.X1 - 60 : G.COURT.X0 + 60; this.y = G.COURT.CY + (slot ? 30 : -30); this.z = 0; this.vx = 0; this.vy = 0; this.facing = side ? Math.PI : 0;
    this.act = null; this.lock = 0; this.call = 'auto'; this.callT = 0; this.callText = ''; this.plan = null; this.pressed = false; this.judge = null; this.popT = 0;
    this.jump = null; this.dive = null; this.stats = G.Rules.newStats(); this.aiT = 0; this.cpuControl = false; this.base = spec.base === undefined ? .5 : spec.base; this.chem = spec.chem || 1;
  }
  get dir() { return this.side ? -1 : 1; }
  get speed() { return G.T.runSpeed * (.86 + .03 * this.stats0.SPD) * (this.human && !this.cpuControl ? 1 : G.T.aiSpeedMul); }
  get reach() { return G.T.reach + .4 * this.stats0.TEC; }
  get attackH() { return 50 * this.rig.o.size / 1.25 + 12 + 1.2 * this.stats0.JMP - 8; }
  get standReach() { return 46 * this.rig.o.size / 1.25; }
  get jumpMax() { return 12 + 1.2 * this.stats0.JMP; }
  get isHuman() { return this.human && !this.cpuControl && !this.M.cpuAll && (!!this.input || this.remote || this.viewOnly); }
  /** how long from leaving the ground to the top of the jump */
  get rise() { return .38; }
  setAct(kind, dur, o = {}) { this.act = Object.assign({ kind, t0: this.M.clock, dur }, o); }
  /** hand height of a block at time t (0 when not blocking) */
  handTop(t) { const j = this.jump; if (!j || j.kind !== 'block') return 0; return this.standReach + this.jumpZ(t); }
  jumpZ(t) {
    const j = this.jump; if (!j) return 0; const u = t - j.t0, rise = j.rise, hold = j.hold, fall = j.fall, H = j.h;
    if (u < 0) return 0; if (u < rise) return H * E.ease.outQuad(u / rise); if (u < rise + hold) return H; if (u < rise + hold + fall) return H * (1 - E.ease.inQuad((u - rise - hold) / fall)); return 0;
  }
  startJump(t0, kind, rise = .38, hold = .12, fall = .3) { this.jump = { t0, kind, rise, hold, fall, h: this.jumpMax * (kind === 'block' ? .85 : 1) }; }
  /** a step: movement toward a target (the AI's or auto-run) or from the stick */
  update(dt) {
    const M = this.M, t = M.clock, C = G.COURT;
    this.lock = Math.max(0, this.lock - dt); this.callT = Math.max(0, this.callT - dt); this.popT = Math.max(0, this.popT - dt);
    if (this.remote || this.viewOnly) { this.z = Math.max(this.jumpZ(t), this.netZ || 0); if (this.jump && t - this.jump.t0 > this.jump.rise + this.jump.hold + this.jump.fall) this.jump = null; this.animate(dt); return; }
    let mx = 0, my = 0, sp = this.speed;
    const busy = M.phase === 'coin';
    if (this.dive && t - this.dive.t0 < .22) { mx = this.dive.dx; my = this.dive.dy; sp = 190; }
    else if (this.dive && t - this.dive.t0 < .52) { const k = 1 - (t - this.dive.t0 - .22) / .3; mx = this.dive.dx * k; my = this.dive.dy * k; sp = 120; }
    else if (this.dive && t - this.dive.t0 < .97) { mx = my = 0; }
    else {
      if (this.dive) this.dive = null;
      const tgt = this.moveTarget, I = this.isHuman ? this.input : null;
      let stick = [0, 0];
      if (I && this.lock <= 0 && !M.replaying) { const m = I.move(); if (Math.hypot(m[0], m[1]) > .15) stick = G.game.view.screenDirToGround(m[0], m[1]).slice(0, 2).map(v => v * Math.min(1, Math.hypot(m[0], m[1]))); }
      if (stick[0] || stick[1]) { mx = stick[0]; my = stick[1]; }
      else if (tgt && (!I || (G.setting('autoRun') !== false && this.plan) || M.phase === 'intro' || M.phase === 'point')) {
        const dx = tgt[0] - this.x, dy = tgt[1] - this.y, d = Math.hypot(dx, dy), k = I ? G.T.autoMove : 1;
        if (d > 1.5) { const f = Math.min(1, d / 10); mx = dx / d * f * k; my = dy / d * f * k; }
      }
      if (this.jump && this.jumpZ(t) > 0) { mx *= .3; my *= .3; }
      if (this.lock > 0) { mx *= .2; my *= .2; }
    }
    if (busy) { mx = my = 0; }
    this.vx = G.approach(this.vx, mx * sp, 900 * dt); this.vy = G.approach(this.vy, my * sp, 900 * dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    // never past the net plane; inside the beach
    const lim = C.NET_X - this.dir * 6;
    if (this.side === 0) this.x = Math.min(this.x, lim); else this.x = Math.max(this.x, lim);
    this.x = clamp(this.x, 40, C.W - 40); this.y = clamp(this.y, 70, C.H - 30);
    this.z = this.jumpZ(t); if (this.jump && t - this.jump.t0 > this.jump.rise + this.jump.hold + this.jump.fall) { this.jump = null; this.rig.land(.4); }
    // face the ball while it is live, else where she runs
    const b = M.ballPos, sp2 = Math.hypot(this.vx, this.vy);
    let face = this.facing;
    if (M.phase === 'rally' || M.phase === 'toss') { if (b) face = Math.atan2(b[1] - this.y, b[0] - this.x); }
    else if (sp2 > 10) face = Math.atan2(this.vy, this.vx);
    else if (M.phase === 'serveSetup') face = this.side ? Math.PI : 0;
    if (this.faceTo !== undefined && this.faceTo !== null) face = this.faceTo;
    this.facing = E.approachAng(this.facing, face, dt * 10);
    this.animate(dt);
  }
  animate(dt) {
    const M = this.M, t = M.aclock, a = this.act, rig = this.rig;
    let vb = null, pose = null, expr = null, flip = 0, down = 0, crouch = false, hop = 0;
    if (a) {
      const u = (t - a.t0) / a.dur;
      if (u >= 1) this.act = null;
      else {
        vb = { kind: a.kind, u: clamp(u, 0, 1), w: G.anim.weight(clamp(u, 0, 1), a.win || .15, a.wout || .2), aim: a.aim };
        pose = a.pose || G.anim.pose(a.kind); expr = a.expr || null;
        if (a.kind === 'dive') { down = clamp(u < .3 ? u / .3 : u > .8 ? (1 - u) / .2 : 1, 0, 1) * .85; }
        if (a.flip) flip = clamp(u, 0, 1);
        if (a.hop) hop = Math.abs(Math.sin(u * Math.PI * 3)) * a.hop;
        if (a.kind === 'dig' || a.kind === 'bump') crouch = true;
      }
    }
    if (!vb && (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss') && !(M.server === this && M.phase !== 'rally')) { vb = { kind: 'ready', u: 0, w: .8 }; crouch = M.phase === 'rally'; }
    rig.vb = vb;
    rig.update(dt, { x: this.x, y: this.y, z: this.z + hop, vx: this.vx, vy: this.vy, facing: this.facing, air: this.z > 2 || flip > 0, pose, expr, flip, down, crouch });
  }
  get moveTarget() { return this.plan ? this.plan.P : this.home; }
  /** a dive toward the stick, or toward the plan's point */
  startDive() {
    if (this.dive || (this.jump && this.z > 1)) return false;
    const I = this.isHuman ? this.input : null; let d = [Math.cos(this.facing), Math.sin(this.facing)];
    if (I) { const m = I.move(); if (Math.hypot(m[0], m[1]) > .2) d = G.game.view.screenDirToGround(m[0], m[1]); else if (this.plan) { const dx = this.plan.P[0] - this.x, dy = this.plan.P[1] - this.y, l = Math.hypot(dx, dy) || 1; d = [dx / l, dy / l]; } }
    else if (this.plan) { const dx = this.plan.P[0] - this.x, dy = this.plan.P[1] - this.y, l = Math.hypot(dx, dy) || 1; d = [dx / l, dy / l]; }
    const l = Math.hypot(d[0], d[1]) || 1; this.dive = { t0: this.M.clock, dx: d[0] / l, dy: d[1] / l };
    this.facing = Math.atan2(d[1], d[0]); this.setAct('dive', .97, { win: .1, wout: .25 });
    G.sfx('dive'); G.fx.sand(this.x, this.y, 10); if (this.isHuman && this.input) this.input.rumble(.3, .15);
    return true;
  }
  /** dive reach bonus while lunging */
  get diveBonus() { return this.dive && this.M.clock - this.dive.t0 < .5 ? G.T.diveReach : 0; }
  cycleCall() {
    this.call = this.call === 'auto' ? 'mine' : this.call === 'mine' ? 'yours' : 'auto';
    this.callText = this.call === 'mine' ? 'MINE!' : this.call === 'yours' ? 'YOURS!' : 'AUTO'; this.callT = 1;
    if (this.call !== 'auto') { G.voice.say(this.call === 'mine' ? 'Mine!' : 'Yours!', this.id); this.setAct('call', .5); }
  }
  shout(text) { this.callText = text; this.callT = .9; G.voice.say(text.charAt(0) + text.slice(1).toLowerCase(), this.id); }
  /** the aim point on the other side from the stick or the mouse; zones: depth short / mid / deep, lateral line / centre / cross */
  aimPoint(kind) {
    const C = G.COURT, s = this.side, I = this.isHuman ? this.input : null, d = this.dir;
    let depth = 2, lat = 0;
    if (I) {
      if ((I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') && G.mouseAim && this.idx === this.M.mouseOwner) {
        const mg = G.game.mouseGround && G.game.mouseGround();
        if (mg && (s === 0 ? mg[0] > C.NET_X : mg[0] < C.NET_X)) return [clamp(mg[0], C.X0 + 6, C.X1 - 6), clamp(mg[1], C.Y0 + 6, C.Y1 - 6)];
      }
      const m = I.move();
      if (Math.hypot(m[0], m[1]) > .3) { const g = G.game.view.screenDirToGround(m[0], m[1]), along = g[0] * d; depth = along > .45 ? 0 : along < -.45 ? 2 : 1; lat = Math.abs(g[1]) > .4 ? Math.sign(g[1]) : 0; if (Math.abs(along) <= .45 && !lat) depth = 1; }
    }
    return G.zonePoint(s, depth, lat);
  }
};
/** a point in one of the nine zones of the other side's court: depth 0 short, 1 mid, 2 deep; lat -1, 0, 1 (y) */
G.zonePoint = (s, depth, lat) => { const C = G.COURT, d = s ? -1 : 1; return [C.NET_X + d * [28, 70, 108][depth], C.CY + lat * 44]; };
