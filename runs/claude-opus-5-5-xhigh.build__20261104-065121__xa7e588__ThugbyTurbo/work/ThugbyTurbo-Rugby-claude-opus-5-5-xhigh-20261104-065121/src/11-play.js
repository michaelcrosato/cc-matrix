/* ---- OPEN PLAY: what a player's buttons do (with the ball and without it), passing, kicking, catching and contact ---- */
Object.assign(Match.prototype, {
  /** one free player's buttons this step (humans) or commands (the CPU brain: I.cmd) */
  actions(p, I, dt) {
    const b = this.ball, has = b.st === 'held' && b.holder === p.id;
    if (has) this.carrierActions(p, I, dt); else this.defenderActions(p, I, dt);
  },
  carrierActions(p, I, dt) {
    const cmd = I.cmd, t = this.t;
    if (this.phase !== 'play') return;
    p.charge = -1;
    if (cmd) {   // the CPU's (and the attract director's) decisions
      if (cmd.pass !== undefined) { const r = typeof cmd.pass === 'number' ? this.players[cmd.pass] : this.passTarget(p, cmd.pass, cmd.long); if (r) this.doPass(p, r, !!cmd.long); else this.dummy(p, cmd.pass); }
      else if (cmd.kick) this.doKick(p, cmd.kick.kind, cmd.kick.x, cmd.kick.y, cmd.kick.power, cmd.kick.touch ? { exact: true, apex: 45 } : {});
      else if (cmd.step) this.doStep(p, cmd.step);
      else if (cmd.spin) this.doSpin(p);
      else if (cmd.fend) this.doFend(p);
      else if (cmd.super) this.doSuper(p);
      else if (cmd.ground) this.doGround(p);
      return;
    }
    // L1 / R1: a tap passes short (on letting go), held past .25 s it passes long (at once)
    for (const k of ['l1', 'r1']) {
      if (I.pr[k]) p.pressT[k] = t;
      if (p.pressT[k] !== undefined && p.pressT[k] !== null) {
        const held = t - p.pressT[k], side = k === 'l1' ? -1 : 1;
        if (I.rl[k] || !I.hd[k] || held >= .25) {
          p.pressT[k] = null;
          if (p.cool > 0 && held < .25) continue;
          const r = this.passTarget(p, side, held >= .25);
          if (r) this.doPass(p, r, held >= .25); else this.dummy(p, side);
          return;
        }
      }
    }
    if (I.click !== null && I.click >= 0) { const r = this.players[I.click]; if (r && r.team === p.team && r.id !== p.id && this.standing(r)) { this.doPass(p, r, dist(p, r) > 110); return; } }
    if (I.mkick && I.mkick.done) { this.mouseKick(p, I.mkick); return; }
    // O: a tap is a grubber; held, the meter fills (the stick aims; pulled back is a bomb; in their 22, a drop goal)
    if (I.pr.ci) { p.pk = 0.0001; p.pkT = t; p.pkDir = p.f; }
    if (p.pk > 0) {
      const held = t - p.pkT;
      if (I.hd.ci && !I.rl.ci) { p.pk = clamp(held / .9, .0001, 1); p.pkMode = this.kickMode(p, I); return; }
      p.pk = 0;
      if (held < .2) { const a = this.stickAim(p, I, PI / 4); return this.doKick(p, 'grubber', p.x + Math.cos(a) * 170, p.y + Math.sin(a) * 170, .5); }
      return this.kickByMode(p, this.kickMode(p, I), Math.min(1, held / .9), I);
    }
    if (I.pr.x) {
      if (this.inGoal(p.team, p.x)) return this.doGround(p);
      if (t - p.lastStep < .3 && p.st === 'step') return this.doSpin(p);   // a second tap during the sidestep: a spin
      p.lastStep = t;
      const side = Math.abs(I.my) > .3 || Math.abs(I.mx) > .3 ? this.stickSide(p, I) : this.awaySide(p);
      return this.doStep(p, side);
    }
    if (I.pr.sq) return this.doFend(p);
    if (I.pr.tri) return this.doSuper(p);
  },
  /** which side (+1 / -1, perpendicular to the run, +1 = to the runner's right) the stick says */
  stickSide(p, I) { const rx = -Math.sin(p.f), ry = Math.cos(p.f); return (I.mx * rx + I.my * ry) >= 0 ? 1 : -1; },
  awaySide(p) {
    const d = this.nearestFoe(p); if (!d) return 1;
    const rx = -Math.sin(p.f), ry = Math.cos(p.f); return ((d.x - p.x) * rx + (d.y - p.y) * ry) > 0 ? -1 : 1;
  },
  nearestFoe(p, max = 1e9) { let best = null, bd = max; for (const q of this.players) if (q.team !== p.team && this.standing(q)) { const d = dist(p, q); if (d < bd) { bd = d; best = q; } } return best; },
  /** the stick's direction as a kick's aim, within a cone either side of the attack direction */
  stickAim(p, I, cone) {
    const fwd = this.dir[p.team] > 0 ? 0 : PI;
    if (Math.hypot(I.mx, I.my) < .3) return fwd;
    let a = Math.atan2(I.my, I.mx), d = angDiff(fwd, a);
    if (Math.abs(d) > PI / 2 + .2) return fwd + (d > 0 ? cone : -cone) * .3;   // pulled back: straight (a bomb uses this)
    return fwd + clamp(d, -cone, cone);
  },
  /** what a held kick is: a drop goal in range facing the posts; a bomb with the stick pulled back; else a punt */
  kickMode(p, I) {
    const back = (I.mx * this.dir[p.team]) < -.5;
    if (back) return 'bomb';
    const gx = this.oppLine(p.team), dg = dist2(p.x, p.y, gx, G.CY), facing = Math.abs(angDiff(p.f, Math.atan2(G.CY - p.y, gx - p.x))) < 1.2;
    const in22 = this.adv1(p.team, p.x) > G.W / 2 - G.L22;
    const toTouch = Math.abs(I.my) > .6 && Math.abs(I.mx) < .5;
    if ((in22 || (dg < 300 && facing)) && !toTouch) return 'drop';
    return 'punt';
  },
  kickByMode(p, mode, power, I) {
    if (mode === 'drop') { const gx = this.oppLine(p.team), a = Math.atan2(G.CY - p.y, gx - p.x) + clamp(I.my * this.dir[p.team], -1, 1) * 8 * PI / 180; return this.doKick(p, 'drop', p.x + Math.cos(a) * 200, p.y + Math.sin(a) * 200, power); }
    const a = this.stickAim(p, I, 70 * PI / 180), dist0 = 300;
    return this.doKick(p, mode === 'bomb' ? 'bomb' : 'punt', p.x + Math.cos(a) * dist0, p.y + Math.sin(a) * dist0, power);
  },
  /** the mouse: right button held and let go kicks toward the cursor (the meter fills toward it) */
  mouseKick(p, mk) {
    const gx = this.oppLine(p.team), facing = Math.abs(angDiff(p.f, Math.atan2(G.CY - p.y, gx - p.x))) < 1.2;
    const in22 = this.adv1(p.team, p.x) > G.W / 2 - G.L22, toPosts = Math.abs(mk.y - G.CY) < 60 && Math.abs(mk.x - gx) < 80;
    if ((in22 || facing) && toPosts) return this.doKick(p, 'drop', mk.x, mk.y, mk.power);
    const d = dist2(p.x, p.y, mk.x, mk.y);
    if (mk.power < .2 || d < 150) return this.doKick(p, 'grubber', mk.x, mk.y, .5);
    return this.doKick(p, (mk.x - p.x) * this.dir[p.team] < -10 ? 'bomb' : 'punt', mk.x, mk.y, mk.power, { exact: true });
  },
  /* ---- passing ---- */
  /** legal receivers: teammates not in front of the passer, within 220, standing; side -1 up the screen, +1 down */
  legalReceivers(p, side) {
    const d = this.dir[p.team];
    return this.players.filter(r => r.team === p.team && r.id !== p.id && this.standing(r) && FREE[r.st] && !(this.parked && this.parked.has(r.id)) && (r.x - p.x) * d <= 4 && dist(p, r) < 220 && (!side || (r.y - p.y) * side > 0));
  },
  passTarget(p, side, long) {
    let L = this.legalReceivers(p, side);
    if (!L.length && (this.o.passAssist !== false)) L = this.legalReceivers(p, -side);
    if (!L.length) return null;
    L.sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y));
    const near = L.filter(r => Math.abs(r.y - p.y) < 110 || dist(p, r) < 110);
    if (long) return L[1] || L[0];
    return near[0] || L[0];
  },
  doPass(p, r, long, offload) {
    const sp = (long ? 300 : TUNE.v.passSpeed) * (offload ? .8 : 1);
    let tx = r.x, ty = r.y;
    for (let k = 0; k < 2; k++) { const tt = dist2(p.x, p.y, tx, ty) / sp; tx = r.x + r.vx * tt * .9; ty = r.y + r.vy * tt * .9; }
    const tt = Math.max(.12, dist2(p.x, p.y, tx, ty) / sp);
    const v = E.arc({ x: this.ball.x, y: this.ball.y, z: 14 }, { x: tx, y: ty, z: 14 }, 600, { time: tt });
    this.release(p, v.vx, v.vy, v.vz, 'pass', r.id);
    this.ball.long = !!long; this.ball.offload = !!offload;
    // forward, judged as the law does, relative to the passer's own run
    this.ball.fwd = ((v.vx - p.vx) * this.dir[p.team]) > 4;
    this.setSt(p, 'pass', .22); p.a.act = long ? 'passL' : 'pass'; p.a.u = 0; p.a.side = (r.y - p.y) > 0 ? 1 : -1;
    this.stats[p.team].passes++; this.lastPassT = this.t;
    this.emit('pass', { id: p.id, to: r.id, long: !!long, offload: !!offload, fwd: this.ball.fwd });
    if (offload) { this.stats[p.team].offloads++; this.hypeAdd(p.team, 6); this.emit('offload', { id: p.id }); }
    if (p.sup && p.sup.kind === 'thunder') this.endSuper(p);
  },
  /** a pass button with nobody there: the carrier sells it, and defenders who see it may buy it */
  dummy(p, side) {
    if (p.cool > 0) return;
    p.cool = .4; this.setSt(p, 'pass', .2); p.a.act = 'dummy'; p.a.u = 0; p.a.side = side;
    let sold = 0;
    for (const q of this.players) if (q.team !== p.team && this.standing(q) && dist(p, q) < 40 && Math.abs(angDiff(q.f, angTo(q, p))) < 1.2 && this.rng() < .4) { q.ai.buy = .3; q.ai.buySide = side; sold++; if (q.st === 'free') { q.vx *= .3; q.vy *= .3; q.f += side * .8; } }
    if (sold) { this.hypeAdd(p.team, 4 * sold); this.emit('dummy', { id: p.id, sold }); }
  },
  /* ---- kicking ---- */
  doKick(p, kind, tx, ty, power = .7, o = {}) {
    const kck = Math.min(10, p.kck), mega = !!(this.megaBoot && this.megaBoot[p.team] > 0), fire = p.fire > 0;
    let a = Math.atan2(ty - p.y, tx - p.x), d = dist2(p.x, p.y, tx, ty), vz, apex;
    const sweet = power > .9 || mega;
    const hook = sweet ? 0 : (this.rng() * 2 - 1) * (11 - kck) * PI / 180 * (1 - power * .5);
    if (kind === 'grubber') { d = clamp(d, 120, 200); a += hook * .5; const sp = d * 1.25; this.release(p, Math.cos(a) * sp, Math.sin(a) * sp, 40, 'grubber'); this.ball.z = 3; }
    else {
      let len = lerp(120, TUNE.v.kickMax, power) * (.75 + .03 * kck);
      if (o.exact) len = Math.min(len, d * 1.02);
      if (sweet) len *= 1.08; if (mega) len *= 1.6; if (fire) len *= 1.2;
      apex = o.apex || (kind === 'bomb' ? 150 : kind === 'drop' ? 55 + power * 25 : 60 + power * 50);
      if (kind === 'bomb') len *= .5;
      if (kind === 'drop') a += hook * .6; else a += hook;
      const lx = p.x + Math.cos(a) * len, ly = p.y + Math.sin(a) * len;
      const v = E.arc({ x: p.x, y: p.y, z: 8 }, { x: lx, y: ly, z: 0 }, 600, { apex });
      this.release(p, v.vx, v.vy, v.vz, kind); this.ball.z = 8;
      if (kind === 'drop') this.ball.aimTeam = p.team;
    }
    this.ball.mega = mega; this.ball.power = power;
    if (mega) this.megaBoot[p.team] = 0;
    this.setSt(p, 'kick', .35); p.a.act = kind === 'drop' ? 'drop' : 'kick'; p.a.u = 0;
    this.stats[p.team].kicks++; this.lastKickT = this.t;
    this.emit('kick', { id: p.id, kind, power, mega, x: p.x, y: p.y });
    if (p.sup && p.sup.kind === 'thunder') this.endSuper(p);
  },
  /* ---- running moves ---- */
  doStep(p, side) {
    if (p.stepCd > 0) return;
    const rx = -Math.sin(p.f) * side, ry = Math.cos(p.f) * side, sp = this.speedOf(p) * .9;
    p.vx = Math.cos(p.f) * sp * .7 + rx * TUNE.v.sidestepPower; p.vy = Math.sin(p.f) * sp * .7 + ry * TUNE.v.sidestepPower;
    this.setSt(p, 'step', .22); p.evade = TUNE.v.sidestepEvade; p.stepCd = .6; p.a.act = 'step'; p.a.side = side; p.a.u = 0;
    this.emit('sidestep', { id: p.id, side });
  },
  doSpin(p) {
    this.setSt(p, 'spin', .4); p.evade = .4; p.stepCd = .8; p.a.act = 'spin'; p.a.u = 0; p.spinBeat = 0;
    this.emit('spin', { id: p.id });
  },
  doFend(p) {
    if (p.fendCd > 0) return;
    p.fendT = TUNE.v.fendWindow * (p.fire > 0 ? 1.5 : 1); p.fendCd = .8; p.a.act = 'fend'; p.a.u = 0; p.a.fendT = .5;
    this.emit('fendOut', { id: p.id });
  },
  /** grounding in the in-goal: a dive, then the try */
  doGround(p) {
    if (!this.inGoal(p.team, p.x)) return;
    const d = this.dir[p.team];
    this.setSt(p, 'tdive', .45); p.vx = d * 110 + p.vx * .3; p.vy *= .5; p.a.act = 'tdive'; p.a.u = 0; p.dived = true;
    this.hypeAdd(p.team, 3);
  },
  /* ---- without the ball ---- */
  defenderActions(p, I, dt) {
    const cmd = I.cmd, t = this.t;
    if (this.phase !== 'play') { p.charge = -1; return; }
    if (cmd) {
      if (cmd.tackle) this.doTackle(p, false);
      else if (cmd.big) { if (p.charge < 0) { p.charge = 0; p.chargeT = 0; } if (cmd.big === 'go') this.doTackle(p, true, p.charge); }
      else if (cmd.dive) this.doDive(p);
      else if (cmd.super) this.doSuper(p);
      else if (cmd.cheap !== undefined) { const v = this.players[cmd.cheap]; if (v) this.cheapShot(p, v); }
      else if (cmd.jackal) this.jackal(p);
      return;
    }
    if (I.pr.x) { p.pressT.x = t; }
    if (p.pressT.x !== null && p.pressT.x !== undefined) {
      const held = t - p.pressT.x;
      if (I.hd.x && !I.rl.x) { if (held > .15 && p.charge < 0) { p.charge = 0; p.chargeT = 0; this.emit('chargeStart', { id: p.id }); } }
      else { p.pressT.x = null; if (p.charge >= 0) this.doTackle(p, true, p.charge); else this.doTackle(p, false); }
    }
    if (I.pr.sq) { if (this.phase === 'ruck') this.jackal(p); else this.doDive(p); }
    if (I.pr.tri) this.doSuper(p);
  },
  chargeStep(p, dt) {
    if (!FREE[p.st]) { p.charge = -1; return; }
    p.chargeT += dt; p.charge = Math.min(1, p.chargeT / TUNE.v.bigHitCharge);
    // the CPU lets go itself when the carrier is close (its decision sets cmd.big = 'go')
  },
  /** a tackle (or, held and let go, a big hit). No carrier in reach: a shoulder on a man without the ball, or a whiff */
  doTackle(p, big, ch = 0) {
    const c = this.carrier(), over = p.chargeT > 1.2;
    p.charge = -1; const chT = p.chargeT; p.chargeT = 0;
    if (p.cool > 0 || !FREE[p.st]) return;
    const range = (big ? 18 : TUNE.v.tackleRange) + (c ? (c.size - 1) * 8 : 0) + (p.size - 1) * 6;
    if (!c || c.team === p.team || dist(p, c) > range + 4 || (Math.abs(angDiff(p.f, angTo(p, c))) > 70 * PI / 180 && !(c.held > 0))) {
      // a man without the ball, in front and close: a cheap shot (a foul if the referee sees it)
      const v = this.players.find(q => q.team !== p.team && this.standing(q) && q !== c && dist(p, q) < 14 + (q.size - 1) * 6 && Math.abs(angDiff(p.f, angTo(p, q))) < 1.2);
      if (v && !big) return this.cheapShot(p, v);
      // a whiff: a short lunge at nothing
      this.setSt(p, 'lunge', .18); p.vx = Math.cos(p.f) * 120; p.vy = Math.sin(p.f) * 120; p.a.act = 'lunge'; p.a.u = 0; p.cool = .4;
      if (c && c.team !== p.team && dist(p, c) < 34) { this.stats[p.team].missed++; this.emit('missedTackle', { id: p.id, on: c.id }); }
      if (big) { this.setSt(p, 'down', 1.0); p.a.act = 'sprawl'; }
      return;
    }
    this.contact(p, c, big ? (ch >= 1 ? 'monster' : 'big') : 'tackle', { over: over && big, charge: ch, chT });
  },
  /** tackler p meets carrier c: kind 'tackle' | 'big' | 'monster' | 'dive' | 'hurricane' */
  contact(p, c, kind, o = {}) {
    const front = Math.abs(angDiff(c.f, angTo(c, p))) < 1.0;   // the tackler meets him head on
    const D = this.diffs[p.team], human = this.isHumanTeam(p.team) && p.ctl >= 0;
    // a sidestep or spin in its window: the tackle meets thin air
    if (c.evade > 0 && kind !== 'hurricane') {
      this.setSt(p, 'stumble', .5); p.vx *= .2; p.vy *= .2; p.a.act = 'whiff';
      this.stats[p.team].missed++; this.hypeAdd(c.team, 6); this.emit('missedTackle', { id: p.id, on: c.id, beaten: true });
      if (kind === 'monster' || kind === 'big' || kind === 'dive') this.setSt(p, 'down', kind === 'dive' ? 1.2 : 1.0);
      return;
    }
    // THUNDER RUN: unstoppable; tacklers bounce off like skittles
    if (c.sup && c.sup.kind === 'thunder' && kind !== 'hurricane') return this.skittle(p, c);
    if (TT.cheats.god && this.isHumanTeam(c.team) && !this.isHumanTeam(p.team)) return this.brokenTackle(p, c);
    const iron = p.pu && p.pu.kind === 'iron', cIron = c.pu && c.pu.kind === 'iron';
    // the fend: the stiff arm out
    if (c.fendT > 0 && kind !== 'hurricane' && !iron) {
      let beat = TUNE.v.fendBeat + .03 * (Math.min(12, c.pow) - Math.min(10, p.tkl));
      if (kind === 'big' || kind === 'monster') beat /= 2;
      if (cIron || c.boss) beat = 1;
      if (this.rng() < beat) return this.fended(p, c);
    }
    let chance;
    if (kind === 'hurricane' || iron) chance = 1;
    else if (kind === 'big' || kind === 'monster') chance = .7 + .2 * (o.charge || 0);
    else chance = TUNE.v.tackleBase * (.9 + .02 * Math.min(10, p.tkl) - .02 * Math.min(12, c.pow)) + (front ? 0 : .1) + (human ? 0 : D.tackle) - (this.turboActive(c) ? .05 : 0) + (kind === 'dive' ? .05 : 0) + (this.inMud(c) ? .1 : 0);
    if (c.pu && c.pu.kind === 'grease' && kind !== 'hurricane') chance *= .3;
    if (c.fire > 0 && kind !== 'hurricane') chance *= .6;
    if (cIron && kind !== 'hurricane') chance *= .5;
    if (this.rng() >= chance) return this.brokenTackle(p, c, kind);
    // the boss is held, not felled, by one man: a second within a second brings him down
    if (c.boss && kind !== 'hurricane' && !(c.held > 0 && c.holdBy !== p.id)) return this.gangHold(p, c);
    if (o.over && front && kind !== 'hurricane') this.foul(p, 'highShot', { victim: c.id });
    this.tackled(p, c, kind === 'big' && iron ? 'monster' : kind, o);
  },
  tackled(p, c, kind, o = {}) {
    const d = angTo(p, c);
    this.stats[p.team].tackles++; p.tackles++;
    c.held = 0; c.holdBy = -1;
    if (c.sup) this.endSuper(c);
    if (kind === 'monster' || kind === 'hurricane') return this.monsterHit(p, c, kind);
    if (kind === 'big') {
      this.stats[p.team].bigHits++; this.hypeAdd(p.team, 10);
      this.setSt(p, 'lunge', .12); p.a.act = 'hit'; p.a.u = 0; p.vx = Math.cos(d) * 60; p.vy = Math.sin(d) * 60;
      this.setSt(c, 'down', 9); c.pin = true; c.tackledT = 0; c.vx = Math.cos(d) * 90; c.vy = Math.sin(d) * 90; c.a.act = 'hitBack';
      this.emit('bigHit', { id: p.id, on: c.id, x: c.x, y: c.y });
    } else {
      this.hypeAdd(p.team, 4);
      this.setSt(p, 'lunge', .14); p.a.act = kind === 'dive' ? 'dive' : 'tackle'; p.a.u = 0; p.vx = Math.cos(d) * 50; p.vy = Math.sin(d) * 50;
      this.setSt(c, 'down', 9); c.pin = true; c.tackledT = 0; c.vx *= .4; c.vy *= .4; c.a.act = 'tackled';
      this.emit(kind === 'dive' ? 'diveTackle' : 'tackle', { id: p.id, on: c.id, x: c.x, y: c.y });
    }
    p.tackleBy = c.id; c.tackler = p.id; p.afterTackle = .55;
  },
  /** a full-charge hit (or HURRICANE HIT): the carrier launched, flipped, the ball maybe loose */
  monsterHit(p, c, kind) {
    const d = angTo(p, c), L = TUNE.v.bigHitLaunch * (kind === 'hurricane' ? 1.4 : 1), dist0 = (30 + this.rng() * 30) * L;
    this.stats[p.team].monsters++; this.stats[p.team].bigHits++; p.monsters++;
    this.hypeAdd(p.team, 16);
    this.setSt(p, 'lunge', .14); p.a.act = 'hit'; p.a.u = 0; p.vx = Math.cos(d) * 40; p.vy = Math.sin(d) * 40;
    const tAir = .55 + .1 * L;
    this.setSt(c, 'launch', tAir); c.vx = Math.cos(d) * dist0 / tAir; c.vy = Math.sin(d) * dist0 / tAir; c.vz = 300 * tAir / 2 + 20 * L; c.z = 1; c.a.act = 'launch'; c.launchFrom = [c.x, c.y]; c.launchBy = p.id;
    const spill = kind === 'hurricane' || this.rng() < TUNE.v.spillChance;
    this.emit('monsterHit', { id: p.id, on: c.id, x: c.x, y: c.y, kind });
    if (kind === 'hurricane') { for (const q of this.players) if (q !== c && q !== p && this.standing(q) && dist(q, c) < 30) this.knockDown(q, 1.0, angTo(c, q)); this.endSuper(p); }
    if (spill && this.ball.holder === c.id) {
      const b = this.ball, fwdK = this.rng() < .5 ? 1 : -1;
      b.st = 'air'; b.holder = -1; b.kind = 'spill'; b.from = c.id; b.team = c.team; b.t = 0;
      b.vx = c.vx * .5 + this.dir[c.team] * fwdK * 40; b.vy = c.vy * .5 + (this.rng() - .5) * 60; b.vz = 120; b.z = 18;
      b.spillFwd = fwdK > 0; b.spillTeam = c.team;
      this.emit('spillHit', { id: c.id });
    } else c.pin = true;
    c.tackler = p.id;
    if (kind !== 'hurricane') this.replayAsk = { kind: 'monster', id: c.id, t: this.t };
  },
  launchStep(p, dt) {
    p.vz -= 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; this.bound(p);
    p.a.flip = clamp(p.stT / p.stDur, 0, 1);
    // flying bodies flatten whoever they hit, the referee included
    for (const q of this.players) if (q !== p && q.id !== p.launchBy && this.standing(q) && dist(q, p) < 12 && p.z < 40) this.knockDown(q, 1.0, Math.atan2(p.vy, p.vx));
    if (!this.ref.down && dist(this.ref, p) < 12 && p.z < 40) this.refDown();
    if (p.z <= 0 && p.vz < 0) {
      p.z = 0; p.vz = 0; p.vx *= .5; p.vy *= .5; p.a.flip = 0;
      const flown = p.launchFrom ? dist2(p.x, p.y, p.launchFrom[0], p.launchFrom[1]) : 0;
      const by = this.players[p.launchBy]; if (by) by.hitBest = Math.max(by.hitBest, metres(flown));
      this.emit('land', { id: p.id, x: p.x, y: p.y, metres: metres(flown) });
      this.setSt(p, 'down', this.ball.holder === p.id ? 9 : 1.2); p.a.act = 'landed'; p.pin = this.ball.holder === p.id; p.tackledT = .3;
    }
  },
  knockDown(q, t, a) {
    if (q.st === 'bin' || q.st === 'off') return;
    this.setSt(q, 'down', t); q.vx = Math.cos(a) * 70; q.vy = Math.sin(a) * 70; q.a.act = 'flat'; q.charge = -1;
    if (this.ball.holder === q.id && this.ball.st === 'held') this.spillFrom(q, false);
    this.emit('knocked', { id: q.id });
  },
  skittle(p, c) {
    const a = angTo(c, p) + (this.rng() - .5);
    this.setSt(p, 'launch', .45); p.vx = Math.cos(a) * 110; p.vy = Math.sin(a) * 110; p.vz = 150; p.z = 1; p.a.act = 'launch'; p.launchBy = c.id; p.launchFrom = [p.x, p.y];
    this.hypeAdd(c.team, 3); this.emit('skittle', { id: p.id, by: c.id });
  },
  brokenTackle(p, c, kind) {
    this.setSt(p, 'down', kind === 'big' || kind === 'monster' ? 1.0 : .6); p.a.act = 'flat'; p.vx *= .2; p.vy *= .2;
    c.vx *= .6; c.vy *= .6; c.stagger = .4;
    this.stats[p.team].missed++; this.hypeAdd(c.team, 5);
    this.emit('brokenTackle', { id: p.id, on: c.id });
  },
  fended(p, c) {
    const a = angTo(c, p), push = c.boss ? 40 : 20;
    this.setSt(p, 'down', .8); p.vx = Math.cos(a) * push * 4; p.vy = Math.sin(a) * push * 4; p.a.act = 'fended';
    c.a.act = 'fend'; c.a.u = .5; this.hypeAdd(c.team, 6);
    this.emit('fend', { id: c.id, on: p.id });
  },
  gangHold(p, c) {
    c.held = 1.5; c.holdBy = p.id;
    this.setSt(p, 'set'); p.hanging = c.id; p.a.act = 'hang'; p.a.u = 0;
    this.emit('gangHold', { id: p.id, on: c.id });
  },
  gangShrug(c) {
    const h = this.players[c.holdBy]; c.holdBy = -1; c.held = 0;
    if (h && h.hanging === c.id) { h.hanging = -1; const a = angTo(c, h); this.setSt(h, 'launch', .4); h.vx = Math.cos(a) * 100; h.vy = Math.sin(a) * 100; h.vz = 130; h.z = 1; h.launchBy = c.id; h.launchFrom = [h.x, h.y]; this.emit('shrug', { id: c.id, off: h.id }); }
  },
  /** the hanging tackler is dragged along */
  hangStep() {
    for (const h of this.players) if (h.hanging >= 0 && h.hanging !== undefined && h.st === 'set') {
      const c = this.players[h.hanging];
      if (!c || !(c.held > 0)) { h.hanging = -1; this.setSt(h, 'down', .6); continue; }
      h.x = c.x - Math.cos(c.f) * 6; h.y = c.y - Math.sin(c.f) * 6 + 3; h.f = c.f;
    }
  },
  doDive(p) {
    if (p.cool > 0 || !FREE[p.st]) return;
    const sp = TUNE.v.diveRange / .35;
    this.setSt(p, 'dive', .35); p.vx = Math.cos(p.f) * sp + p.vx * .3; p.vy = Math.sin(p.f) * sp + p.vy * .3; p.vz = 60; p.z = 1; p.a.act = 'dive'; p.cool = .5; p.diveHit = false;
    this.emit('dive', { id: p.id });
  },
  diveStep(p, dt) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 600 * dt; p.z = Math.max(0, p.z + p.vz * dt); this.bound(p);
    const c = this.carrier();
    if (!p.diveHit && c && c.team !== p.team && FREE[c.st] && dist(p, c) < 10 + (c.size - 1) * 6) { p.diveHit = true; this.contact(p, c, 'dive'); if (p.st !== 'dive') return; }
    if (p.stT >= p.stDur) { this.setSt(p, 'down', p.diveHit ? .6 : 1.2); p.z = 0; p.a.act = 'flat'; }
  },
  /** a shoulder on a man without the ball: flattened; a foul only if the referee sees it */
  cheapShot(p, v) {
    const a = angTo(p, v);
    this.setSt(p, 'lunge', .14); p.vx = Math.cos(a) * 60; p.vy = Math.sin(a) * 60; p.a.act = 'shoulder'; p.cool = .6;
    this.setSt(v, 'down', 1.6); v.vx = Math.cos(a) * 80; v.vy = Math.sin(a) * 80; v.a.act = 'flat';
    if (this.ball.holder === v.id && this.ball.st === 'held') this.spillFrom(v, false);
    p.cheap++;
    this.emit('cheapShot', { id: p.id, on: v.id });
    const seen = this.foul(p, 'offBall', { victim: v.id });
    if (!seen) { this.hypeAdd(p.team, 8); this.emit('cheapUnseen', { id: p.id }); }
  },
  /** the ball knocked out of a carrier's hands: loose, and forward of him a knock-on */
  spillFrom(c, fwd) {
    const b = this.ball, d = this.dir[c.team];
    b.st = 'air'; b.holder = -1; b.kind = 'spill'; b.from = c.id; b.team = c.team; b.t = 0;
    b.vx = d * (fwd ? 60 : -30) + (this.rng() - .5) * 40; b.vy = (this.rng() - .5) * 60; b.vz = 70; b.z = 14;
    b.spillFwd = fwd; b.spillTeam = c.team;
  },
  /* ---- catching, gathering and interceptions ---- */
  catchStep() {
    const b = this.ball;
    if (b.st !== 'air' && b.st !== 'loose') return;
    if (b.t < .08 && b.from >= 0) return;
    if (b.st === 'air' && b.kind !== 'pass' && b.kind !== 'spill' && b.vz > 0 && b.t < .45) return;   // a kick still climbing off the boot
    const reachZ = b.st === 'air' ? 30 : 9;
    // interceptions: a pass that flies past an opponent below head height
    if (b.st === 'air' && b.kind === 'pass') {
      for (const q of this.players) {
        if (q.team === b.team || !FREE[q.st] || b.tried[q.id] || b.z > 24) continue;
        const d = dist2(q.x, q.y, b.x, b.y), human = q.ctl >= 0;
        const lane = human && q.I.hd && q.I.hd.x ? 12 : 10;
        if (d > lane) continue;
        b.tried[q.id] = 1;
        const chance = human ? (q.I.hd && q.I.hd.x ? .45 : .05) : .15 * this.diffs[q.team].intercept;
        if (this.rng() < chance) { this.give(q, 'intercept'); this.hypeAdd(q.team, 12); this.stats[q.team].turnovers++; this.emit('interception', { id: q.id }); return; }
      }
    }
    // the intended receiver first, then whoever is nearest
    const cands = this.players.filter(q => FREE[q.st] && q.cool <= 0 && b.z < reachZ + (q.size - 1) * 10).map(q => [q, dist2(q.x, q.y, b.x, b.y)]).filter(([q, d]) => d < (b.st === 'loose' ? (Math.hypot(b.vx, b.vy) > 210 ? 4.5 : 9) : 10) + (q.size - 1) * 6);
    if (!cands.length) return;
    cands.sort((a, c) => (a[0].id === b.to ? -1 : 0) - (c[0].id === b.to ? -1 : 0) || a[1] - c[1]);
    const [q] = cands[0];
    if (b.tried[q.id] && b.st === 'air') return;
    b.tried[q.id] = 1;
    if (b.st === 'air') this.tryCatch(q, cands); else this.gather(q);
  },
  tryCatch(q, cands) {
    const b = this.ball, from = this.players[b.from];
    if (b.kind === 'kickoff' && this.kickoffCheck(q)) return;
    let chance;
    if (b.kind === 'pass') {
      chance = TUNE.v.catchBase * (.9 + .01 * q.hnd) - (b.long ? .06 : 0) - (b.offload ? .1 : 0) - (this.players.some(o => o.team !== q.team && this.standing(o) && dist(o, q) < 20) ? TUNE.v.pressurePenalty : 0) - (this.rain ? .06 : 0);
      if (q.fire > 0 || (from && from.fire > 0)) chance = 1;
      if (q.team !== b.team) chance *= .7;
    } else {
      chance = .82 + .015 * q.hnd - (this.rain ? .06 : 0);
      // a contested high ball: the chaser and the receiver both up for it
      const rival = cands.find(([o]) => o.team !== q.team);
      if (rival && (b.kind === 'bomb' || b.kind === 'kickoff' || b.kind === 'punt')) {
        const [o] = rival, sq = (p0) => (p0.ctl >= 0 ? (p0.I.hd.x ? .65 : .45) : .5 - this.diffs[p0.team].sigma * .6) + .02 * p0.hnd + this.rng() * .35;
        const win = sq(q) >= sq(o) ? q : o, lose = win === q ? o : q;
        this.knockDown(lose, .7, angTo(win, lose));
        this.emit('contest', { id: win.id, beat: lose.id });
        q = win;
      }
    }
    if (q.ctl >= 0 && b.kind !== 'pass' && q.I.hd.x) chance += .05;
    if (this.rng() < chance) {
      const wasFwd = b.kind === 'pass' && b.fwd;
      if (wasFwd && q.team === b.team) return this.forwardPass(b.from, q.x, q.y);
      const kind = b.kind, how = kind === 'pass' ? (q.team === b.team ? 'pass' : 'intercept') : 'kick';
      this.give(q, how);
      if (how === 'intercept') { this.hypeAdd(q.team, 12); this.stats[q.team].turnovers++; this.emit('interception', { id: q.id }); }
      if (kind !== 'pass') { this.emit('kickCaught', { id: q.id }); q.a.act = 'highCatch'; q.a.u = 0; }
      return;
    }
    // dropped: forward off the hands is a knock-on, else it spills loose
    const fwd = this.rng() < .5;
    if (fwd) return this.knockOn(q);
    b.vx = (this.rng() - .5) * 60 - this.dir[q.team] * 30; b.vy = (this.rng() - .5) * 60; b.vz = 40; b.st = 'air'; b.kind = 'spill'; b.from = q.id; b.team = q.team; b.t = 0; b.spillFwd = false; b.spillTeam = q.team;
    this.emit('fumble', { id: q.id });
  },
  /** a loose ball picked up (a sprinting gather may be fumbled forward) */
  gather(q) {
    const b = this.ball;
    if (b.kind === 'kickoff' && this.kickoffCheck(q)) return;
    if (this.turboActive(q) && Math.hypot(q.vx, q.vy) > this.speedOf(q) * 1.2 && q.hnd < 8 && this.rng() < .15) return this.knockOn(q);
    const fromSpill = b.kind === 'spill' || b.kind === 'grubber';
    this.give(q, 'gather');
    if (fromSpill && b.spillTeam !== undefined && b.spillTeam !== q.team) { this.stats[q.team].turnovers++; this.emit('turnover', { id: q.id, how: 'loose' }); }
    // an attacker gathering a loose ball in the opponents' in-goal has grounded it: a try
    if (this.inGoal(q.team, q.x) && b.st === 'held') this.tryScored(q, q.x, q.y, 'ground');
  },
  /** a spill that went forward: the knock-on is called when it lands or is gathered */
  spillLanded() {
    const b = this.ball;
    if (b.kind === 'spill' && b.spillFwd) { const c = this.players[b.from]; b.spillFwd = false; if (c) this.knockOn(c, true); }
  }
});
