/* GOALKEEPERS (section 6.8): positioning comes from the team brain; here the keeper reads shots after his reaction
 * time, dives, catches, parries and tips, claims crosses, smothers at a forward's feet and gives the ball out. */
const _emit0 = Match.prototype.emit;
Match.prototype.emit = function (type, ev = {}) { if (type === 'shot') this.keeperRead(ev); return _emit0.call(this, type, ev); };
/** a shot is struck: the keeper it is aimed at reads it (his reaction time, by his keep stat and difficulty) */
Match.prototype.keeperRead = function (ev) {
  const s = ev.side !== undefined ? ev.side : ev.who && ev.who.side, k = this.keeper(1 - s); if (!k || k.state === 'down') return;
  const cpu = !this.hasHuman(1 - s) || this.kind === 'attract', base = cpu ? this.diff.keeper : EF.T.keeperReaction;
  const jit = 1 + (this.rng() - .5) * .8 * (1 - k.stat('keep') / 100);
  k.read = { t: Math.max(.04, base * jit * (ev.screamer ? 1.3 : 1) * (EF.T.keeperReaction / .18)), speed: ev.speed || Math.hypot(this.ball.vx, this.ball.vy), screamer: !!ev.screamer, from: ev.who, chip: !!ev.chip };
  k.save = null;
};
Object.assign(Footballer.prototype, {
  keeperReach() { const m = this.m, eu = m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0; return EF.T.keeperReach * (eu ? 1.3 : 1) * (this.data.boss ? 1.4 : 1) * (m.cheats['keeper' + this.side] ? 2 : 1); },
  /** the keeper's own decisions each step (he is never a human's in open play) */
  keeperAct(it, dt) {
    const m = this.m, b = m.ball, B = this.body, gx = m.ownGoalX(this.side);
    if (m.owner === this) { if (this.inOwnBox() || this.holding) return this.keeperHold(dt); const it2 = EF.Intent.make(); it2.move = [m.dir(this.side), 0]; return this.lobBall(it2); }
    if (this.read) {
      this.read.t -= dt;
      if (this.read.t <= 0) { const r = this.read; this.read = null; this.keeperDecide(r); }
      return;
    }
    if (m.owner || b.superPath || b.held) {
      // the smother: a forward through on goal, at his feet
      const c = m.owner;
      if (c && c.side !== this.side && H.d(c.body, B) < 13 && P.inBoxAt(gx, c.body.x, c.body.y) && this.cool <= 0) {
        this.setState('smother', .55); this.tilt = { axis: 'right', angle: 0, pivot: 'feet' }; this.facing = H.ang(B, c.body);
        const R = m.rng(); if (R < .35 + .4 * (this.stat('keep') - c.stat('skill')) / 100 + (m.cheats['keeper' + this.side] ? 1 : 0)) { m.setOwner(this, 'smother'); this.holding = true; m.addEuphoria(this.side, 6, 'save'); m.emit('save', { who: this, kind: 'smother', shooter: c }); m.stats.saves[this.side]++; }
        else { this.cool = .8; m.emit('smotherMiss', { who: this }); }
      }
      return;
    }
    // a loose ball in the air over his area: claim it
    if (b.z > 6 && b.z < 36 && P.inBoxAt(gx, b.x, b.y) && H.d(b, B) < 14 && this.cool <= 0) {
      const att = m.side[1 - this.side].some(o => H.d(o.body, b) < H.d(B, b) - 4);
      if (!att || m.rng() < this.stat('keep') / 140) { m.setOwner(this, 'catch'); this.holding = true; this.clip = null; m.emit('catch', { who: this, kind: 'cross' }); m.stats.saves[this.side]++; return; }
    }
    // a shot already flying at goal that he never read (a deflection): read it now
    if (b.shot && b.shot.side !== this.side && !this.save && Math.sign(b.vx) === Math.sign(gx - b.x) && Math.abs(b.vx) > 120 && Math.abs(b.x - gx) < 260) this.read = { t: .12, speed: b.speed(), screamer: b.screamer };
    if (this.save) this.keeperSaveStep(dt);
  },
  /** where the shot meets him, how well he reaches it (q), and so the outcome (section 6.8) */
  keeperDecide(r) {
    const m = this.m, b = m.ball, B = this.body, gx = m.ownGoalX(this.side); if (m.owner || b.superPath) return;
    const c = b.crossing(B.x) || b.crossing(gx); if (!c) return;
    const atLine = b.crossing(gx) || c, onTarget = Math.abs(atLine.y - P.CY) < P.GH + 1 && atLine.z < P.BAR + 1;
    const dy = c.y - B.y, need = Math.max(0, Math.abs(dy) - 6), reach = this.keeperReach() + 12, cover = Math.min(reach, 260 * Math.max(.05, c.t) * 1.15 + 10);
    let q = need <= 4 ? 1 - need / 20 : Math.pow(clamp(1.25 - need / Math.max(1, cover), 0, 1), .7);
    if (c.z > 30) q *= .7; if (r.chip) q *= .55;
    const speed = r.speed, sf = Math.max(.3, 1 - (speed - 200) / 600);
    let Q = q * sf * this.stat('keep') / 100 * (r.screamer ? .75 : 1) * (this.data.boss ? 1.25 : 1) + (m.rng() - .5) * .2;
    if (m.cheats['keeper' + this.side]) Q = 1;
    if (m.cheats['nokeeper' + this.side]) Q = 0;
    let outcome = Q > .7 && speed < 260 ? 'catch' : Q > .35 ? (c.z > 24 || Math.abs(c.y - P.CY) > P.GH - 10 ? 'tip' : 'parry') : 'miss';
    if (this.data.boss && speed < 300 && q > .45) outcome = 'catch';   // the Vault catches anything under 300 he reaches
    if (!onTarget) outcome = Math.abs(atLine.y - P.CY) < P.GH + 14 && q > .5 && m.rng() < .3 ? 'tip' : 'leave';
    this.save = { outcome, at: c.t, t: 0, y: c.y, z: c.z, dy, q: Q };
    if (Math.abs(dy) >= 9 || c.z > 30) {   // a dive: lateral speed to meet it, tilted about his forward axis
      const v = clamp(dy / Math.max(c.t, .12), -260, 260), right = Math.sign(Math.cos(this.facing) * dy || 1);
      B.vx = 0; B.vy = v; this.diveV = v; this.diveSign = right; this.diveHigh = c.z > 18;
      this.setState('keeper-dive', Math.max(.35, c.t) + .5);
      m.emit('keeperDive', { who: this, high: this.diveHigh, dir: Math.sign(dy) });
    }
  },
  keeperSaveStep(dt) {
    const m = this.m, b = m.ball, S = this.save; if (!S) return; S.t += dt;
    if (m.owner || b.superPath) { this.save = null; return; }
    if (S.t < S.at - .01) return;
    const hands = [this.body.x, this.body.y + (this.state === 'keeper-dive' ? Math.sign(S.dy) * 6 : 0)], d = H.d2(b.x, b.y, hands[0], hands[1]);
    this.save = null;
    if (S.outcome === 'miss' || S.outcome === 'leave' || d > 30) { m.emit('keeperBeaten', { who: this }); return; }
    const gx = m.ownGoalX(this.side), out = gx === P.X0 ? 1 : -1, sp = b.speed();
    if (S.outcome === 'catch') {
      m.setOwner(this, 'catch'); this.holding = true; m.stats.saves[this.side]++;
      m.addEuphoria(this.side, b.screamer ? 10 : 6, 'save'); m.emit('save', { who: this, kind: 'catch', shooter: m.lastKick }); m.emit('catch', { who: this, kind: 'shot' });
    } else if (S.outcome === 'parry') {
      const away = Math.sign(b.y - P.CY) || (m.rng() < .5 ? -1 : 1), k = .4 + m.rng() * .2;
      b.vx = out * sp * k * .7; b.vy = away * sp * k * .7; b.vz = 40 + m.rng() * 40; b.spin = 0; b.shot = null; b.pass = null; m.touch(this);
      m.stats.saves[this.side]++; m.addEuphoria(this.side, 6, 'save'); m.emit('save', { who: this, kind: 'parry', shooter: m.lastKick }); m.emit('parry', { who: this });
    } else if (S.outcome === 'tip') {   // over the bar or round the post: a corner
      const high = S.z > 20; b.shot = null; b.pass = null; m.touch(this); m.tipped = this;
      if (high) { b.vz = 160; b.vx = -out * Math.max(60, Math.abs(b.vx) * .5); }
      else { b.vy = (Math.sign(b.y - P.CY) || 1) * 160; b.vx = -out * 80; }
      m.stats.saves[this.side]++; m.addEuphoria(this.side, 6, 'save'); m.emit('save', { who: this, kind: 'tip', shooter: m.lastKick }); m.emit('tip', { who: this });
    }
  },
  /** dives, holding, throws and the smother: the keeper's own states */
  keeperState(dt) {
    const m = this.m, B = this.body, s = this.state;
    if (s === 'keeper-dive') {
      const u = clamp(this.stT / Math.max(.2, this.stDur - .5), 0, 1);
      B.vy = (this.diveV || 0) * (1 - u * .8); B.vx = approach(B.vx, 0, 600 * dt);
      const lift = this.diveHigh ? 14 * Math.sin(Math.min(1, u * 1.2) * Math.PI) : 2 * Math.sin(u * Math.PI);
      this.tilt = { axis: 'forward', angle: this.diveSign * (this.diveHigh ? 1.35 : 1.55) * Math.min(1, u * 2.2), pivot: 'feet', lift };
      this.look.pose = 'cast';
      if (this.save) this.keeperSaveStep(dt);
      if (this.stT >= this.stDur) { this.tilt = { axis: 'forward', angle: this.diveSign * 1.5, pivot: 'feet' }; this.setState('down'); this.downT = .5; this.clip = null; this.afterDive = true; }
    } else if (s === 'smother') {
      const u = clamp(this.stT / this.stDur, 0, 1); this.tilt = { axis: 'right', angle: 1.35 * Math.min(1, u * 2.5), pivot: 'feet', lift: 2 };
      B.vx = Math.cos(this.facing) * 90 * (1 - u); B.vy = Math.sin(this.facing) * 90 * (1 - u);
      if (this.stT >= this.stDur) { this.setState(m.owner === this ? 'run' : 'down', 0); this.downT = .45; this.tilt = null; }
    } else if (s === 'keeper-throw') {
      B.vx = approach(B.vx, 0, 600 * dt); B.vy = approach(B.vy, 0, 600 * dt);
      if (this.stT > .32 && this.throwPending) { const t = this.throwPending; this.throwPending = null; this.holding = false; m.ball.kick(t.vx, t.vy, t.vz, { who: this, pass: { from: this, to: t.to, kind: 'throw' }, cool: .5 }); m.emit('keeperThrow', { who: this, to: t.to }); }
      if (this.stT >= this.stDur) { this.setState('run'); this.clip = null; }
    } else this.setState('run');
    if (s !== 'keeper-dive' && this.save) this.keeperSaveStep(dt);
  },
  /** holding the ball: up to 2 s (the human side may throw with pass or kick long with shoot), then the AI gives it out */
  keeperHold(dt) {
    const m = this.m, B = this.body; this.holding = true; this.holdT = (this.holdT || 0) + dt; this.tilt = null;
    B.vx = approach(B.vx, 0, 500 * dt); B.vy = approach(B.vy, 0, 500 * dt);
    this.facing = E.approachAng(this.facing, m.dir(this.side) > 0 ? 0 : Math.PI, dt * 6);
    const h = m.humans.find(q => q.side === this.side && !q.cpu), wait = h && m.kind !== 'attract' ? 2 : 1.1;
    let how = null, dir = null;
    if (h && h.ctl && this.holdT > .35) { const pr = h.ctl.peek(); if (pr.pass) { how = 'throw'; dir = pr.move; } else if (pr.shoot || pr.lob) { how = 'kick'; dir = pr.move; } }
    if (!how && this.holdT >= wait) how = m.tactic[this.side].gimmick === 'routeone' || m.rng() < .25 ? 'kick' : 'throw';
    if (!how) return;
    this.holdT = 0;
    const mates = m.outfield(this.side), dirA = dir && Math.hypot(dir[0], dir[1]) > .3 ? Math.atan2(dir[1], dir[0]) : null;
    if (how === 'throw') {
      const open = mates.map(f => ({ f, open: Math.min(...m.outfield(1 - this.side).map(o => H.d(o.body, f.body)).concat([200])), d: H.d(f.body, B), a: H.ang(B, f.body) }))
        .filter(o => o.open > 26).sort((a, c) => (dirA !== null ? Math.abs(E.angDiff(a.a, dirA)) * 120 : 0) + a.d - ((dirA !== null ? Math.abs(E.angDiff(c.a, dirA)) * 120 : 0) + c.d));
      const t = open[0] ? open[0].f : mates[0]; if (!t) return;
      const near = H.d(t.body, B) < 120, v = E.arc({ x: B.x, y: B.y, z: 10 }, { x: t.body.x + t.body.vx * .3, y: t.body.y + t.body.vy * .3, z: 0 }, EF.T.ballGravity, near ? { apex: 11 } : { apex: 28 });
      this.throwPending = { vx: v.vx, vy: v.vy, vz: v.vz, to: t }; this.setState('keeper-throw', .7); this.clip = { name: 'OverhandThrow', t: 0, w: 1, mask: 'upper' };
      m.setOwner(null); m.ball.held = true; const hp = this.handPoint(); m.ball.place(hp[0], hp[1], hp[2]); m.ball.held = true;
      setTimeoutBall(m, this, .32);
    } else {
      const fwd = mates.slice().sort((a, c) => m.u(this.side, c.body.x) - m.u(this.side, a.body.x))[0];
      const dist = 300 + m.rng() * 150, a = dirA !== null ? dirA : fwd ? H.ang(B, fwd.body) : (m.dir(this.side) > 0 ? 0 : Math.PI);
      const tx = clamp(B.x + Math.cos(a) * dist, P.X0 + 30, P.X1 - 30), ty = clamp(B.y + Math.sin(a) * dist * .6, P.Y0 + 20, P.Y1 - 20);
      const v = E.arc({ x: B.x, y: B.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 75 });
      this.holding = false; m.setOwner(null); m.ball.place(B.x + Math.cos(a) * 6, B.y + Math.sin(a) * 6, 0);
      m.ball.kick(v.vx, v.vy, v.vz, { who: this, pass: { from: this, to: fwd || null, kind: 'goalkick' }, cool: .5 });
      this.playKick('shotHard'); this.setState('kick', .3); m.emit('keeperKick', { who: this });
    }
  }
});
/** the throw's release waits for the arm: the ball rides in his hand until then */
function setTimeoutBall(m, k) { m.ball.heldBy = k; }
