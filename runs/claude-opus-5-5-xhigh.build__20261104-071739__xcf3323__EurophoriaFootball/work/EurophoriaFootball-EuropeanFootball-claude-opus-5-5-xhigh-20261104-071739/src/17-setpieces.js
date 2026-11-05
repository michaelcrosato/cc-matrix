/* SET PIECES (section 6.11): each restart runs setup (the players placed) -> aim (a human taker gets up to 6 s, then
 * auto) -> take -> play. Kinds: kickoff, goalkick, corner, freekick, penalty, throwback (the crowd throws it back). */
const hasPress = (m, s, a) => { const h = m.humans.find(q => q.side === s && !q.cpu); return h ? h.ctl.peek()[a] : false; };
Object.assign(Match.prototype, {
  humanFor(s) { return this.humans.find(q => q.side === s && !q.cpu) || null; },
  /** a set piece is taken: the placement orders (t 99) end, everyone plays */
  clearPlacement() { for (const f of this.players) { if (f.order && f.order.t > 50) f.order = null; f.frozen = false; } },
  startSetpiece(kind, s, info) {
    const m = this, b = this.ball, dir = this.dir(s), gx = this.goalX(s);
    for (const f of this.players) { f.order = null; f.frozen = false; if (f.state !== 'down' && f.state !== 'launched' && f.state !== 'getup' && !f.sentOff) { f.setState('run'); f.tilt = null; f.clip = null; } f.read = null; f.save = null; f.charging = false; }
    const SP = this.setpiece = { kind, side: s, info, t: 0, stage: 'setup', taker: null, spot: null, taken: false, touched: false, wall: [], ring: null, reticle: null, wait: 0 };
    this.setMode(kind === 'kickoff' ? 'kickoff' : 'setpiece');
    const place = (f, x, y, snap) => { f.order = { to: [clamp(x, P.X0 - 30, P.X1 + 30), clamp(y, P.Y0 + 4, P.Y1 - 4)], t: 99 }; if (snap) { f.body.x = f.order.to[0]; f.body.y = f.order.to[1]; f.body.vx = f.body.vy = 0; } };
    const near = (side, x, y, excl) => this.outfield(side).filter(f => f !== excl && f.state !== 'down').sort((a, c) => H.d2(a.body.x, a.body.y, x, y) - H.d2(c.body.x, c.body.y, x, y))[0];
    if (kind === 'kickoff') {
      b.place(P.CX, P.CY, 0);
      const kickers = this.outfield(s).sort((a, c) => (c.role === 'FWD') - (a.role === 'FWD') || H.d2(a.body.x, a.body.y, P.CX, P.CY) - H.d2(c.body.x, c.body.y, P.CX, P.CY));
      SP.taker = kickers[0] || this.keeper(s) || this.side[s][0];
      for (const f of this.players) { if (f.sentOff) continue; const sp = this.brains[f.side].spot(f); let x = sp[0], y = sp[1]; const own = this.dir(f.side); if ((x - P.CX) * own > -8) x = P.CX - own * 30; if (f.side !== s && H.d2(x, y, P.CX, P.CY) < 72) { const d = H.d2(x, y, P.CX, P.CY) || 1; x = P.CX + (x - P.CX) / d * 72; y = P.CY + (y - P.CY) / d * 72; } if (f.role === 'GK') { x = this.ownGoalX(f.side) + own * 10; y = P.CY; } place(f, x, y, true); f.facing = own > 0 ? 0 : Math.PI; }
      place(SP.taker, P.CX - dir * 7, P.CY, true); SP.taker.facing = dir > 0 ? 0 : Math.PI;
      if (kickers[1]) place(kickers[1], P.CX - dir * 6, P.CY + 22, true);
      SP.setupT = .9; SP.autoT = 3;
    } else if (kind === 'goalkick') {
      const k = this.keeper(s) || near(s, info.gx, P.CY), x = info.gx + this.dir(s) * P.GA_D, y = P.CY + (this.rng() < .5 ? -1 : 1) * 40;
      b.place(x, y, 0); SP.taker = k; place(k, x - this.dir(s) * 6, y, false);
      for (const f of this.players) if (f !== k && !f.sentOff) { const sp = this.brains[f.side].spot(f); let px2 = sp[0]; if (f.side !== s && P.inBoxAt(info.gx, px2, sp[1])) px2 = info.gx + this.dir(s) * (P.BOX_D + 10); place(f, px2, sp[1], false); }
      SP.setupT = 1.1; SP.autoT = 1.4;
    } else if (kind === 'corner') {
      const cy = info.y < P.CY ? P.Y0 + 3 : P.Y1 - 3, cx = info.gx + (info.gx === P.X0 ? 3 : -3), into = info.gx === P.X0 ? 1 : -1;
      b.place(cx, cy, 0); this.lastCornerT = this.t + 3; this.stats.corners[s]++;
      const taker = near(s, cx, cy); SP.taker = taker; place(taker, cx - into * 4, cy + (cy < P.CY ? -5 : 5), true);
      SP.ring = { x: info.gx + into * (P.SPOT + 6), y: P.CY + (cy < P.CY ? -12 : 12) };
      const att = this.outfield(s).filter(f => f !== taker), slots = [[into * 14, (cy < P.CY ? -1 : 1) * 30], [into * 20, (cy < P.CY ? 1 : -1) * 34], [into * (P.SPOT + 4), 0], [into * (P.BOX_D + 16), (cy < P.CY ? 1 : -1) * 30]];
      att.forEach((f, i) => place(f, info.gx + slots[i % 4][0], P.CY + slots[i % 4][1], false));
      const defn = this.outfield(1 - s); defn.forEach((f, i) => { const a = att[i % Math.max(1, att.length)]; const tx = a ? (a.order.to[0] + info.gx) / 2 + into * 2 : info.gx + into * 20, ty = a ? a.order.to[1] + (P.CY - a.order.to[1]) * .2 : P.CY; place(f, tx, ty, false); });
      const k = this.keeper(1 - s); if (k) place(k, info.gx + into * 6, P.CY + (cy < P.CY ? -10 : 10), false);
      const kk = this.keeper(s); if (kk) place(kk, this.ownGoalX(s) + this.dir(s) * 30, P.CY, false);
      SP.setupT = 1.2; SP.autoT = 1.6; SP.into = into; SP.cornerY = cy;
      this.emit('corner', { side: s, x: cx, y: cy });
    } else if (kind === 'freekick' || kind === 'penalty') {
      const fx = clamp(info.x, P.X0 + 6, P.X1 - 6), fy = clamp(info.y, P.Y0 + 6, P.Y1 - 6);
      if (kind === 'penalty') { SP.pen = new EF.PenaltyKick(this, info.taker && !info.taker.sentOff && info.taker.state !== 'off' ? info.taker : this.bestShooter(s), this.keeper(1 - s), { gx, live: true }); SP.taker = SP.pen.taker; this.emit('penaltyAwarded', { side: s }); this.stats.freekicks[s]++; return; }
      b.place(fx, fy, 0); this.stats.freekicks[s]++;
      const dg = H.d2(gx, P.CY, fx, fy), shootable = dg < 320 && Math.abs(fy - P.CY) < 220;
      const taker = this.bestShooter(s, fx, fy); SP.taker = taker; const a = Math.atan2(P.CY - fy, gx - fx);
      place(taker, fx - Math.cos(a) * 10, fy - Math.sin(a) * 10, true); taker.facing = a;
      SP.shootable = shootable; SP.reticle = { y: 0, z: .35 };
      for (const f of this.players) if (f !== taker && !f.sentOff) { const sp = this.brains[f.side].spot(f); let x = sp[0], y = sp[1]; if (f.side !== s && H.d2(x, y, fx, fy) < 40) { const d = H.d2(x, y, fx, fy) || 1; x = fx + (x - fx) / d * 42; y = fy + (y - fy) / d * 42; } if (f.role === 'GK' && f.side !== s) { x = this.ownGoalX(f.side) + this.dir(f.side) * 8; y = P.CY + (fy - P.CY) * .15; } place(f, x, y, false); }
      if (shootable) {   // the wall: two defenders 40 out on the line to goal
        const def = this.outfield(1 - s).sort((p, q) => H.d2(p.body.x, p.body.y, fx, fy) - H.d2(q.body.x, q.body.y, fx, fy)).slice(0, 2);
        def.forEach((f, i) => { const wx = fx + Math.cos(a) * 40 - Math.sin(a) * (i ? 6 : -6), wy = fy + Math.sin(a) * 40 + Math.cos(a) * (i ? 6 : -6); place(f, wx, wy, true); f.facing = a + Math.PI; SP.wall.push(f); });
      }
      SP.setupT = 1.1; SP.autoT = shootable ? 1.8 : 1.2;
      this.emit('freekick', { side: s, x: fx, y: fy, shootable });
    } else if (kind === 'throwback') {
      const y = info.north ? P.Y0 - 18 : P.Y1 + 14, x = info.x, recv = near(s, x, info.north ? P.Y0 + 30 : P.Y1 - 30);
      SP.taker = recv; SP.throwFrom = { x, y, z: info.north ? 40 : 10 }; b.place(x, y, SP.throwFrom.z); b.held = true;
      if (recv) place(recv, x, info.north ? P.Y0 + 26 : P.Y1 - 26, false);
      SP.setupT = .9; SP.autoT = 0;
      this.note('INTO THE CROWD!', { dur: 1.4 });
      this.emit('crowdThrow', { side: s, x, y });
    }
    if (this.mode === 'kickoff') this.emit('kickoffSetup', { side: s });
  },
  bestShooter(s, x, y) { const list = this.outfield(s).filter(f => f.state !== 'down' && f.state !== 'launched'); return list.sort((a, b) => b.stat('shoot') - a.stat('shoot') + (x !== undefined ? (H.d2(a.body.x, a.body.y, x, y) - H.d2(b.body.x, b.body.y, x, y)) * .02 : 0))[0] || this.side[s][0]; },
  setpieceStep(dt) {
    const SP = this.setpiece; if (!SP) { this.setMode('play'); return; }
    SP.t += dt; if (!SP.taken) this.stopT += dt;
    if (SP.pen) { SP.pen.update(dt); if (SP.pen.done && this.setpiece === SP) { this.setpiece = null; this.clearPlacement(); if (this.mode === 'setpiece') this.setMode('play'); } return; }
    const m = this, s = SP.side, b = this.ball, T = SP.taker, h = this.humanFor(s);
    if (SP.stage === 'setup') {
      if (SP.t >= SP.setupT) {
        SP.stage = 'aim'; SP.t = 0;
        for (const f of this.players) if (f.order && f.order.to && H.d2(f.order.to[0], f.order.to[1], f.body.x, f.body.y) > 26 && f !== T) { f.body.x = f.order.to[0]; f.body.y = f.order.to[1]; }
        if (h && T && T.role !== 'GK' && h.fb !== T && (SP.kind !== 'throwback')) this.giveTo(h, T);
        if (SP.kind === 'kickoff') { this.emit('whistle', { kind: 'kickoff' }); this.emit('kickoff', { side: s }); this.note('KICK OFF', { dur: 1 }); }
        if (SP.kind === 'throwback') return this.takeThrowback();
        if (T) { const tp = SP.kind === 'corner' ? [b.x - SP.into * 4, b.y + (b.y < P.CY ? -5 : 5)] : [b.x - Math.cos(T.facing) * 6, b.y - Math.sin(T.facing) * 6]; T.body.x = tp[0]; T.body.y = tp[1]; T.body.vx = T.body.vy = 0; }
      }
      return;
    }
    if (SP.stage !== 'aim' || SP.taken) return;
    const human = h && h.fb === T && T && !h.cpu, limit = human ? (SP.kind === 'corner' ? 4 : 6) : SP.autoT;
    if (SP.kind === 'kickoff' || SP.kind === 'goalkick' || (SP.kind === 'freekick' && !SP.shootable)) {
      // a live restart: the taker has the ball; the other side keeps its distance until it's played
      if (SP.kind === 'goalkick') {
        if (human || (h && T && T.role === 'GK')) {
          const pr = h ? h.ctl.peek() : {};
          if (pr.pass) return this.takeGoalKick('short', pr.move);
          if (pr.lob || pr.shoot) return this.takeGoalKick('long', pr.move);
        }
        if (SP.t >= (h ? 2.6 : limit)) return this.takeGoalKick(this.tactic[s].gimmick === 'routeone' || this.rng() < .3 ? 'long' : 'short');
        return;
      }
      this.setOwner(T, 'restart'); SP.taken = true; this.kickHold = SP.kind === 'kickoff' ? 2.5 : 1.5; this.clearPlacement();
      this.setpiece = null; this.setMode('play'); return;
    }
    if (SP.kind === 'corner') {
      if (human) {
        const mv = h.ctl.peek().move; SP.ring.x = clamp(SP.ring.x + mv[0] * 120 * dt, Math.min(SP.info.gx, SP.info.gx + SP.into * P.BOX_D), Math.max(SP.info.gx, SP.info.gx + SP.into * P.BOX_D)); SP.ring.y = clamp(SP.ring.y + mv[1] * 120 * dt, P.CY - P.BOX_H, P.CY + P.BOX_H);
        const pr = h.ctl.peek(); if (pr.lob || pr.pass) return this.takeCorner('cross', pr.move); if (pr.shoot) return this.takeCorner('short');
        if (SP.t >= limit) return this.takeCorner('cross');
      } else if (SP.t >= limit) {
        const att = this.outfield(s).filter(f => f !== T); const tgt = att[Math.floor(this.rng() * att.length)];
        if (tgt) { SP.ring.x = tgt.order ? tgt.order.to[0] : tgt.body.x; SP.ring.y = tgt.order ? tgt.order.to[1] : tgt.body.y; }
        return this.takeCorner(this.rng() < .15 ? 'short' : 'cross');
      }
      return;
    }
    if (SP.kind === 'freekick') {   // a shootable free kick: the reticle across the frame, power from the shoot button
      const gx = this.goalX(s);
      if (human) {
        const pr = h.ctl.peek(), R = SP.reticle; R.y = clamp(R.y + pr.move[1] * 1.6 * dt * (this.dir(s) > 0 ? 1 : 1), -1, 1); R.z = clamp(R.z - pr.move[0] * this.dir(s) * 1.2 * dt, 0, 1);
        if (pr.pass) return this.takeFreeKick('pass'); if (pr.lob) return this.takeFreeKick('lob');
        if (pr.shootDown) { SP.charge = Math.min(1, (SP.charge || 0) + dt / EF.T.shotChargeTime); T.charging = true; T.charge = SP.charge; }
        else if (SP.charge > 0) return this.takeFreeKick('shoot');
        if (SP.t >= limit + 2) { SP.charge = SP.charge || .7; return this.takeFreeKick('shoot'); }
      } else if (SP.t >= limit) {
        const dg = H.d2(gx, P.CY, b.x, b.y);
        if (dg < 270 || this.rng() < .5) { SP.reticle = { y: (this.rng() < .5 ? -1 : 1) * (.6 + this.rng() * .3), z: .35 + this.rng() * .4 }; SP.charge = .62 + this.rng() * .25; return this.takeFreeKick('shoot'); }
        return this.takeFreeKick(this.rng() < .5 ? 'pass' : 'lob');
      }
    }
  },
  takeGoalKick(how, mv) {
    const SP = this.setpiece, T = SP.taker, b = this.ball, s = SP.side, dir = this.dir(s);
    SP.taken = true; this.setpiece = null; this.setMode('play'); this.clearPlacement();
    const mates = this.outfield(s);
    if (how === 'short') {
      const a = mv && Math.hypot(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : null;
      const t = mates.sort((p, q) => (a !== null ? Math.abs(E.angDiff(H.ang(b, p.body), a)) * 200 : 0) + H.d(p.body, b) - ((a !== null ? Math.abs(E.angDiff(H.ang(b, q.body), a)) * 200 : 0) + H.d(q.body, b)))[0];
      if (t) { const d = H.d(t.body, b), sp = clamp(d * 1.5 + 90, EF.T.passSpeedMin, EF.T.passSpeedMax), an = H.ang(b, t.body); b.kick(Math.cos(an) * sp, Math.sin(an) * sp, 0, { who: T, pass: { from: T, to: t, kind: 'ground' } }); }
    } else {
      const a = mv && Math.hypot(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : (dir > 0 ? 0 : Math.PI) + (this.rng() - .5) * .6, dist = 300 + this.rng() * 120;
      const tx = clamp(b.x + Math.cos(a) * dist, P.X0 + 30, P.X1 - 30), ty = clamp(b.y + Math.sin(a) * dist, P.Y0 + 20, P.Y1 - 20), v = E.arc(b, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 70 });
      b.kick(v.vx, v.vy, v.vz, { who: T, pass: { from: T, to: null, kind: 'goalkick' } });
    }
    T.playKick('shotHard'); this.emit('goalKick', { side: s, how });
  },
  takeCorner(how, mv) {
    const SP = this.setpiece, T = SP.taker, b = this.ball, s = SP.side;
    SP.taken = true; SP.stage = 'taken'; this.setMode('play'); this.setpiece = null; this.clearPlacement();
    if (how === 'short') { const t = this.outfield(s).filter(f => f !== T).sort((p, q) => H.d(p.body, b) - H.d(q.body, b))[0]; if (t) { const a = H.ang(b, t.body), d = H.d(t.body, b); b.kick(Math.cos(a) * clamp(d * 1.5 + 90, 150, 260), Math.sin(a) * clamp(d * 1.5 + 90, 150, 260), 0, { who: T, pass: { from: T, to: t, kind: 'ground' } }); } }
    else {
      const R = SP.ring, v = E.arc(b, { x: R.x + (this.rng() - .5) * 10, y: R.y + (this.rng() - .5) * 10, z: 0 }, EF.T.ballGravity, { apex: 55 });
      const sideSign = mv ? Math.sign(mv[1] || mv[0]) : 0;
      b.kick(v.vx, v.vy, v.vz, { who: T, spin: sideSign * .35, pass: { from: T, to: null, kind: 'cross', land: [R.x, R.y] } });
      const att = this.outfield(s).filter(f => f !== T).sort((p, q) => H.d2(p.body.x, p.body.y, R.x, R.y) - H.d2(q.body.x, q.body.y, R.x, R.y));
      for (const f of att.slice(0, 2)) f.order = { kind: 'meet', to: [R.x + (f === att[0] ? 0 : 18), R.y], t: v.t + .3 };
      const h = this.humanFor(s); if (h && att[0]) this.giveTo(h, att[0]);
      this.emit('cross', { who: T, corner: true });
    }
    T.playKick('chip'); this.emit('cornerTaken', { side: s, how });
    for (const f of this.players) if (f !== T && f.order && f.order.t > 50) f.order = null;
  },
  takeFreeKick(how) {
    const SP = this.setpiece, T = SP.taker, b = this.ball, s = SP.side, gx = this.goalX(s);
    SP.taken = true; this.setMode('play'); this.setpiece = null; T.charging = false; this.clearPlacement();
    for (const f of this.players) if (f.order && f.order.t > 50) f.order = null;
    if (how === 'shoot') {
      const R = SP.reticle, ty = P.CY + R.y * (P.GH - 6), tz = 4 + R.z * (P.BAR - 10), p = SP.charge || .7, speed = 200 + p * (EF.T.shotSpeedMax - 200);
      const d = H.d2(gx, ty, b.x, b.y), t = d / speed, g = EF.T.ballGravity, sig = (100 - T.stat('shoot')) / 100 * .05;
      const a = Math.atan2(ty - b.y, gx - b.x) + H.gauss(this.rng) * sig, vz = (tz + .5 * g * t * t) / t;
      b.kick(Math.cos(a) * speed, Math.sin(a) * speed, vz, { who: T, shot: { side: s, power: p, freekick: true, target: { y: ty, z: tz } } });
      T.curlT = .6; T.playKick('shotHard'); this.stats.shots[s]++;
      for (const w of SP.wall) { w.body.vz = 150; w.body.onGround = false; }   // the wall jumps
      this.emit('shot', { who: T, power: p, freekick: true, x: b.x, y: b.y, speed });
      // the CPU taker bends it round the wall
      if (!this.humanFor(s) || this.humanFor(s).fb !== T) b.spin = (R.y > 0 ? -1 : 1) * this.dir(s) * .5 * (this.rng() < .7 ? 1 : 0);
    } else { this.setOwner(T, 'restart'); const it = EF.Intent.make(); it.move = [this.dir(s), 0]; if (how === 'pass') T.passBall(it, 'ground'); else T.lobBall(it); }
    this.emit('freekickTaken', { side: s, how });
  },
  takeThrowback() {
    const SP = this.setpiece, b = this.ball, T = SP.taker, s = SP.side; SP.taken = true; this.setpiece = null; this.setMode('play'); b.held = false; this.clearPlacement();
    const tx = T ? T.body.x : b.x, ty = T ? T.body.y : P.CY, v = E.arc(b, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 50 });
    b.kick(v.vx, v.vy, v.vz, { pass: { from: null, to: T, kind: 'throwback' } }); this.lastTouch = null; this.lastKick = null;
    if (T) { T.order = { kind: 'meet', to: [tx, ty], t: v.t + .2 }; const h = this.humanFor(s); if (h) this.giveTo(h, T); }
    for (const f of this.players) if (f.order && f.order.t > 50) f.order = null;
    this.emit('throwback', { side: s });
  }
});

/* ---- the penalty kick (section 6.11), shared by penalties in play and the shootout ---- */
class PenaltyKick {
  constructor(m, taker, keeper, o) {
    this.m = m; this.taker = taker; this.keeper = keeper; this.o = o; this.gx = o.gx; this.dir = Math.sign(o.gx - P.CX); this.spot = { x: o.gx - this.dir * P.SPOT, y: P.CY };
    this.state = 'setup'; this.t = 0; this.cursor = { x: 0, y: .3 }; this.power = 0; this.charging = false; this.done = false; this.scored = false; this.outcome = null; this.panenka = false;
    this.guess = null; this.dived = false; this.diveT = 0; this.kickT = 0; this.early = false;
    const b = m.ball; b.place(this.spot.x, this.spot.y, 0); m.setOwner(null);
    for (const f of m.players) { if (f.sentOff) continue; f.order = null; f.read = null; f.save = null; f.setState('run'); f.tilt = null; f.clip = null; }
    // everyone else outside the box and arc; in a shootout, at the halfway line
    for (const f of m.players) {
      if (f === taker || f === keeper || f.sentOff) continue;
      let x, y;
      if (o.shootout) { x = P.CX + (f.side ? 1 : -1) * 6 * (1 + f.idx % 3); y = P.CY + (f.idx - 2) * 14 + (f.side ? 6 : -6); }
      else { x = o.gx - this.dir * (P.BOX_D + 14 + (f.idx % 2) * 18); y = P.CY + (f.idx - 2) * 34 + (f.side ? 9 : -9); }
      f.body.x = x; f.body.y = y; f.body.vx = f.body.vy = 0; f.facing = this.dir > 0 ? 0 : Math.PI; f.frozen = true; f.order = { to: [x, y], t: 99 };
    }
    taker.body.x = this.spot.x - this.dir * 16; taker.body.y = P.CY; taker.facing = this.dir > 0 ? 0 : Math.PI; taker.frozen = true; taker.order = { to: [taker.body.x, taker.body.y], t: 99 };
    if (keeper) { keeper.body.x = o.gx - this.dir * 3; keeper.body.y = P.CY; keeper.facing = this.dir > 0 ? Math.PI : 0; keeper.frozen = true; keeper.order = { to: [keeper.body.x, P.CY], t: 99 }; }
    this.hT = m.humanFor(taker.side); this.hK = keeper ? m.humanFor(keeper.side) : null;
    if (this.hT && taker.role !== 'GK') m.giveTo(this.hT, taker);
    m.emit('penaltySetup', { who: taker, keeper, shootout: !!o.shootout });
  }
  update(dt) {
    const m = this.m, b = m.ball, T = this.taker, K = this.keeper; this.t += dt;
    if (this.state === 'setup') { if (this.t > 1) { this.state = 'aim'; this.t = 0; m.emit('whistle', { kind: 'short' }); } return; }
    if (this.state === 'aim') {
      const humanT = this.hT && !this.hT.cpu, humanK = this.hK && !this.hK.cpu;
      if (humanT) {
        const pr = this.hT.ctl.peek(); this.cursor.x = clamp(this.cursor.x + pr.move[1] * 1.8 * dt, -1, 1); this.cursor.y = clamp(this.cursor.y - pr.move[0] * this.dir * 1.4 * dt + (pr.move[1] === 0 ? 0 : 0), 0, 1);
        if (pr.shootDown) { this.charging = true; this.power = Math.min(1, this.power + dt / EF.T.shotChargeTime); T.charging = true; T.charge = this.power; }
        else if (this.charging) this.runUp();
        else if (this.t > 6) { this.power = .65; this.runUp(); }
      } else if (this.t > .9 + (T.idx % 3) * .25) {
        const R = m.rng; this.cursor.x = [-1, -.85, 0, .85, 1][Math.floor(R() * 5)] * (.75 + R() * .25); this.cursor.y = R() < .4 ? .8 : .2;
        this.power = R() < .08 ? .12 : .45 + R() * .5; if (m.forcePanenka && !m.panenkaDone && m.shootout && m.shootout.n >= 2) { m.panenkaDone = true; this.power = .12; } if (this.power < .2) this.cursor.x = 0; this.runUp();
      }
      if (humanK) this.keeperHuman(dt);
      return;
    }
    if (this.state === 'runup') {
      if (this.hK && !this.hK.cpu) this.keeperHuman(dt);
      const u = this.t / .5; T.order = { to: [lerp(this.spot.x - this.dir * 16, this.spot.x - this.dir * 5, Math.min(1, u)), P.CY], t: 99 };
      if (this.t >= .5) this.strike();
      return;
    }
    if (this.state === 'flight') {
      this.kickT += dt;
      if (K && !this.dived && (!this.hK || this.hK.cpu)) this.cpuDive();
      if (K && !this.resolved && Math.sign(b.x - (K.body.x - this.dir * 2)) === this.dir) this.resolve();
      if (!this.o.live) {
        // the shootout keeps the ball: it is scored once over the line between the posts, else missed when it stops or leaves
        if (!this.outcome || this.outcome === 'goal') {
          b.update(dt);
          if (P.crossedGoalLine(b) && Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2) { this.scored = true; this.outcome = 'goal'; b.inNet = true; if (!this.done) { this.done = true; m.emit('goal', { who: T, side: T.side, shootout: true, x: b.x, y: b.y }); } }
          else if (P.crossedGoalLine(b) || this.kickT > 2.5) { if (!this.done) { this.done = true; this.outcome = this.outcome || 'miss'; m.emit('penaltyMiss', { who: T, how: b.z > P.BAR ? 'over' : 'wide' }); } }
        } else { b.update(dt); if (!this.done && this.kickT > .8) this.done = true; }
      } else if (this.resolved || this.kickT > .8) this.done = true;
    }
  }
  keeperHuman() {
    const pr = this.hK.ctl.peek(), mv = pr.move; this.keeperAim = { x: mv[1], high: mv[0] * -this.dir > .4 };
    if (pr.pass && !this.dived) { this.guess = { col: Math.abs(mv[1]) < .35 ? 0 : Math.sign(mv[1]), high: this.keeperAim.high }; this.dive(); if (this.state === 'aim' || (this.state === 'runup' && this.t < .25)) { this.early = true; this.m.emit('keeperEarly', {}); } }
  }
  runUp() {
    this.state = 'runup'; this.t = 0; this.taker.charging = false; const m = this.m;
    if (this.early && this.guess && (!this.hT || this.hT.cpu) && m.rng() < .6) { this.cursor.x = -this.guess.col * .9 || (m.rng() < .5 ? -.9 : .9); }   // the CPU taker sees an early dive and changes sides
    m.emit('penaltyRun', { who: this.taker });
  }
  strike() {
    const m = this.m, b = m.ball, T = this.taker, p = this.power, cx = this.cursor.x, high = this.cursor.y > .55;
    this.state = 'flight'; this.t = 0; this.kickT = 0;
    let ty = P.CY + cx * (P.GH - 8), tz = high ? 24 : 5, speed = 200 + p * 220;
    if (p < .2 && Math.abs(cx) < .35) { this.panenka = true; speed = 120; ty = P.CY; tz = 16; }
    if (p > .9 && m.rng() < .25) tz = P.BAR + 14;
    const sig = (100 - T.stat('shoot')) / 100 * .03; ty += H.gauss(m.rng) * sig * 120;
    const d = H.d2(this.gx, ty, b.x, b.y), t = d / speed, g = EF.T.ballGravity, a = Math.atan2(ty - b.y, this.gx - b.x);
    const vz = this.panenka ? (tz + .5 * g * t * t) / t : (tz + .5 * g * t * t) / t;
    b.kick(Math.cos(a) * speed, Math.sin(a) * speed, vz, { who: T, shot: { side: T.side, power: p, pen: true, target: { y: ty, z: tz } } });
    this.target = { y: ty, z: tz, speed }; T.playKick('penalty'); T.frozen = false; T.order = null;
    m.stats.shots[T.side]++; if (T.human) T.human.stats.Shots++;
    m.emit('penaltyTaken', { who: T, panenka: this.panenka, shootout: !!this.o.shootout });
    if (K_has(this)) this.keeper.read = null;
    if (this.o.live) { if (m.setpiece) m.setpiece.taken = true; for (const f of m.players) { if (f !== this.keeper) { f.frozen = false; f.order = null; } } }
  }
  cpuDive() {
    const m = this.m, K = this.keeper; if (this.kickT < .02) return;
    const R = m.rng, diff = m.diff, smart = diff.acc - .5;
    let col = R() < .26 ? 0 : R() < .5 ? -1 : 1;
    if (R() < smart * .6) col = Math.abs(this.target.y - P.CY) < 14 ? 0 : Math.sign(this.target.y - P.CY);
    this.guess = { col, high: R() < .35 }; this.dive();
  }
  dive() {
    const K = this.keeper, g = this.guess; this.dived = true; if (!K) return;
    K.frozen = false; K.order = null;
    if (g.col === 0) { K.setState('run'); K.look.pose = 'guard'; return; }
    K.diveV = g.col * 230; K.diveSign = Math.sign(Math.cos(K.facing) * g.col) || 1; K.diveHigh = g.high; K.save = null; K.read = null;
    K.setState('keeper-dive', .7); this.m.emit('keeperDive', { who: K, high: g.high, dir: g.col });
  }
  /** the keeper's dive meets the ball, or not (section 6.11: by the keeper rules, with the dive committed) */
  resolve() {
    const m = this.m, b = m.ball, K = this.keeper; this.resolved = true; if (!K) return;
    const onTarget = Math.abs(this.target.y - P.CY) < P.GH - 1 && this.target.z < P.BAR - 1;
    if (!onTarget) { this.outcome = this.target.z >= P.BAR ? 'over' : 'wide'; return; }
    const col = Math.abs(this.target.y - P.CY) < 14 ? 0 : Math.sign(this.target.y - P.CY), g = this.guess || { col: 9 };
    let saved = false;
    if (this.panenka) saved = g.col === 0 && m.rng() < .85;
    else if (g.col === col) { const hi = this.target.z > 16; saved = m.rng() < clamp(.55 + .35 * K.stat('keep') / 100 - this.power * .25 + (hi === !!g.high ? .1 : -.25), .05, .95); }
    if (m.cheats['keeper' + K.side]) saved = true;
    if (m.cheats['nokeeper' + K.side]) saved = false;
    if (saved) {
      this.outcome = 'saved';
      const away = this.dir * -1; b.vx = away * 120; b.vy = (m.rng() - .5) * 160; b.vz = 60; b.shot = null; m.touch(K);
      m.stats.saves[K.side]++; m.addEuphoria(K.side, 10, 'save'); m.emit('save', { who: K, kind: 'penalty', shooter: this.taker });
      if (this.o.shootout) { this.done = true; }
    } else this.outcome = 'goal';
  }
}
const K_has = pk => !!pk.keeper;
EF.PenaltyKick = PenaltyKick;
