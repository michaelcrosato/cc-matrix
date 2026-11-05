/* ---- RUNNING AND FIELDING (the ball in play).
 * Running: each batter moves on his own: a goal end (S = the striker's, B = the bowler's), a lane (x +-10), runs
 * counted as both complete a crossing. The human presses run (R1 / Space) to go, again at the crease to turn for
 * another, back (L1 / Shift) to send both back; run near the crease while a throw is coming dives (the bat slides the
 * last 20 units). The AI partner follows the human's call; in co-op both must call within 0.4 s or it's a mix-up.
 * Fielding: on contact the predictor samples the ball every 0.05 s; each fielder's earliest interception picks the
 * chaser (the best) and the backup (the next); the keeper and bowler go to their stumps; the rest hold. Catches:
 * the CPU by a probability, the human by the catch ring (an outer ring shrinking onto an inner one). Throws go by
 * E.arc with an error; a direct hit breaks the stumps; a missed shy with nobody backing up gives overthrows. ---- */
const END_Y = { S: G.CREASE_S, B: G.CREASE_B };
const LANE = { S: 10, B: -10 };
Object.assign(Match.prototype, {
  /* ---- running ---- */
  planRunning(hit) {
    this.running = { calls: [], again: false, runs: 0, started: false, mix: null, t: 0, hit };
    for (const b of this.batters) { b.home = b === this.striker ? 'S' : 'B'; b.goal = null; b.left = null; b.crossings = 0; b.dive = 0; b.slip = 0; b.lane = b.home === 'S' ? LANE.S * (this.hand > 0 ? 1 : -1) : LANE.B * (this.hand > 0 ? 1 : -1); }
    this.callT = 0;
  },
  otherEnd(e) { return e === 'S' ? 'B' : 'S'; },
  grounded(b, end) {
    const reach = b.dive > 0 ? 20 : 6;
    return end === 'S' ? b.y <= END_Y.S + reach : b.y >= END_Y.B - reach;
  },
  /** the end a batter is at (grounded) or null */
  batterEnd(b) { return this.grounded(b, 'S') ? 'S' : this.grounded(b, 'B') ? 'B' : null; },
  startRun(b) {
    if (!this.running || b.goal || this.cur.wicket) return;
    const from = this.batterEnd(b) || b.home;
    b.goal = this.otherEnd(from); b.left = from; b.home = from; b.from = from; b.turning = b.goal ? (b.crossings > 0 ? .25 : 0) : 0;
    if (this.flags.banana > 0 && !this.flags.bananaUsed) { this.flags.bananaUsed = true; this.flags.banana = 0; b.slip = 1; this.emit('item:used', { id: 'banana' }); }
    if (this.flags.forceRunOut) b.slip = 1.4;   // (a scripted run-out: a hesitant start, a yard short)
    this.running.started = true;
    b.anim = { kind: 'run', t: 0 };
  },
  sendBack(b) { if (!b.goal) return; const back = b.left; if (!back) return; b.goal = back; b.turning = .25; },
  /** the human's calls (run / again / dive / back), the AI's, then each batter's legs */
  stepRunning(dt) {
    const R = this.running; if (!R) return;
    R.t += dt;
    const H = this.humansOf(this.bat), autoRun = this.cfg.running === 'auto' || this.cfg.cheat.autoBat;
    if (H.length && !autoRun) {
      for (const b of this.batters) {
        const I = this.batterInput(b), partner = b === this.striker ? this.nonStriker : this.striker, coop = H.length > 1;
        if (!I) continue;
        if (!coop && b !== this.striker) continue;   // one human: the striker's input calls for both
        if (I.pressed('run')) {
          I.consume('run');
          const near = b.goal && Math.abs(b.y - END_Y[b.goal]) < 50, threat = this.thrown || (this.holder && this.holder !== this.keeper);
          if (b.goal && near && threat && b.dive <= 0) { b.dive = .6; this.emit('run:dive', {}); coverage.mark('dive'); }
          else if (!b.goal) { this.startRun(b); this.emit('run:call', { call: 'YES', who: b.id }); if (!coop) this.startRun(partner); else if (!partner.goal) R.mix = { t: .4, caller: b }; }
          else { R.again = true; b.again = true; if (!coop) partner.again = true; }
        }
        if (I.pressed('back')) { I.consume('back'); this.sendBack(b); this.emit('run:call', { call: 'NO', who: b.id }); if (!coop) this.sendBack(partner); }
      }
      if (R.mix) { R.mix.t -= dt; const p = R.mix.caller === this.striker ? this.nonStriker : this.striker; if (p.goal) R.mix = null; else if (R.mix.t <= 0) { this.emit('run:mixup', {}); coverage.mark('mixup'); R.mix = null; } }
    } else AI.stepRunning(this, dt);
    const sp = T('runSpeed') * (this.ground.runSlow || 1) * (this.flags.sandwich === this.bat ? 1.1 : 1) * (this.weather === 'rain' ? .85 : 1);
    for (const b of this.batters) {
      // a batter out of his ground with no run on (a charge that missed) walks back and grounds the bat
      if (!b.goal && !(b.turning > 0) && !this.batterEnd(b) && this.stumpT === null) { const e = Math.abs(b.y - END_Y.S) < Math.abs(b.y - END_Y.B) ? 'S' : 'B'; b.y = approach(b.y, END_Y[e] + (e === 'S' ? -2 : 2), T('runSpeed') * .6 * dt); }
      if (b.dive > 0) b.dive = Math.max(0, b.dive - dt);
      if (b.slip > 0) b.slip = Math.max(0, b.slip - dt);
      if (b.turning > 0) { b.turning -= dt; b.vy = approach(b.vy, 0, 1200 * dt); b.y += b.vy * dt; continue; }
      if (!b.goal) { b.vy = approach(b.vy, 0, 900 * dt); b.y += b.vy * dt; b.oneHand = false; continue; }
      const ty = END_Y[b.goal] + (b.goal === 'S' ? -6 : 6), dir = sign(ty - b.y), v = sp * (b.slip > 0 ? .6 : 1);
      b.vy = approach(b.vy, dir * v, 600 * dt); b.y += b.vy * dt; b.x = approach(b.x, b.lane, 40 * dt);
      b.facing = dir > 0 ? Math.PI / 2 : -Math.PI / 2; b.anim = { kind: b.dive > 0 ? 'dive' : b.slip > 0 ? 'slip' : 'run', t: (b.anim && b.anim.t) || 0 }; b.oneHand = true;
      if ((dir > 0 && b.y >= END_Y.B) || (dir < 0 && b.y <= END_Y.S)) {
        if (b.goal !== b.from) b.crossings++;   // arriving back where the run began (sent back) is no run
        b.home = b.goal; b.left = this.otherEnd(b.goal); b.from = b.goal;
        if (b.dive > 0) b.down = .6;
        b.goal = null;
        const done = Math.min(this.striker.crossings, this.nonStriker.crossings);
        if (done > R.runs && this.striker.home !== this.nonStriker.home) { R.runs = done; this.cur.ran = done; this.emit('runs', { n: done }); }
        if (b.again) { b.again = false; this.startRun(b); }
      }
    }
    R.again = false;
  },
  endRunning(dead) {
    if (!this.running) return;
    for (const b of this.batters) { b.goal = null; b.vy = 0; b.oneHand = false; }
    if (dead) this.running = null;
  },
  anyRunning() { return this.batters.some(b => b.goal || (b.turning > 0)); },
  /* ---- fielding: the plan ---- */
  planField() {
    const b = this.ball;
    if (b.phase === 'dead' || this.holder) { this.samples = []; this.assign(null); return; }
    this.samples = Ball.predict(b, 7, this.env, 6, c => this.outside(c.x, c.y));
    const fs = T('fieldSpeed'), best = [];
    for (const a of this.fielders) {
      if (a.stun > 0) continue;
      const v = fs * (.85 + ((a.p.field && a.p.field.speed) || 5) * .03) * (a.bees ? .7 : 1);
      let found = null;
      for (const s of this.samples) {
        if (this.outside(s.x, s.y)) break;
        const reach = s.z <= 6 ? 6 : s.z <= 40 && s.carried ? 9 : -1; if (reach < 0) continue;
        const d = hyp(a.x - s.x, a.y - s.y);
        if (d <= v * Math.max(0, s.t - .18) + reach) { found = s; break; }
      }
      if (found) best.push({ a, s: found });
    }
    best.sort((p, q) => p.s.t - q.s.t);
    this.assign(best);
  },
  assign(best) {
    for (const a of this.fielders) { a.task = 'hold'; a.chase = null; }
    if (this.bowler) this.bowler.task = 'stumpsB';
    this.keeper.task = 'stumpsS';
    if (!best) return;
    const last = this.samples[this.samples.length - 1];
    let chaser = best[0] ? best[0].a : null, point = best[0] ? best[0].s : null;
    if (!chaser && last) {   // nobody gets there before the rope: the nearest deep fielder chases anyway (it reads well)
      chaser = this.fielders.filter(f => f !== this.keeper).sort((p, q) => hyp(p.x - last.x, p.y - last.y) - hyp(q.x - last.x, q.y - last.y))[0]; point = last;
    }
    if (chaser) { chaser.task = 'chase'; chaser.chase = point; this.chaser = chaser; }
    const second = best.find(e => e.a !== chaser);
    if (second && second.a !== this.keeper) { second.a.task = 'backup'; second.a.chase = second.s; }
    if (chaser === this.keeper) { const k2 = this.fielders.find(f => f.pos === 'slip1' || f.pos === 'shortleg'); if (k2) k2.task = 'stumpsS'; }
    if (chaser === this.bowler) { const mo = this.fielders.find(f => f.pos === 'midoff' || f.pos === 'midon'); if (mo) mo.task = 'stumpsB'; }
    // the human catch ring: an aerial interception (a catch chance) for a human fielding side
    const F = this.fielderInput();
    if (chaser && point && point.carried && point.z >= 2 && point.z <= 40 && F && !this.catchRing) {
      const p = this.catchP(chaser, point);
      if (!(this.cfg.fielding === 'assisted' && p > .85)) { this.catchRing = { tc: this.time + point.t, t0: this.time + Math.max(0, point.t - T('catchRing')), fielder: chaser, press: null, juggle: 0, p }; this.emit('catch:ring', { fielder: chaser.id }); }
    }
  },
  catchP(a, s) {
    const c = (a.p.field && a.p.field.catch) || 5, sp = hyp(s.vx || 0, s.vy || 0, s.vz || 0), dive = hyp(a.x - s.x, a.y - s.y) > T('fieldSpeed') * Math.max(0, s.t - .18) ? 1 : 0;
    const dm = { village: .92, county: 1, test: 1.03, kerfuffle: 1.03 }[this.cfg.difficulty] || 1;
    return clamp((.55 + c * .045) * dm - .2 * (sp / 400) - .25 * dive, .05, .97);
  },
  /* ---- the ball in play ---- */
  phase_inPlay(dt) {
    const b = this.ball;
    this.stepRunning(dt);
    // the ball: held, thrown or loose
    if (this.holder) { const h = this.holder; b.x = h.x + Math.cos(h.facing) * 3; b.y = h.y + Math.sin(h.facing) * 3; b.z = 14; b.vx = b.vy = b.vz = 0; }
    else {
      const y0 = b.y, x0 = b.x, z0 = b.z;
      Ball.step(b, dt, this.env);
      this.netCollide(x0, y0, z0);
      this.checkTargets(x0, y0, z0);
      this.checkTokens();
      this.chaosBall(dt);
      if (this.thrown) this.stepThrow(x0, y0, z0);
      if (this.phase !== 'inPlay') return;
      if (this.outside(b.x, b.y) && !this.thrown) return this.boundary();
      if (this.thrown && this.outside(b.x, b.y)) return this.boundary(true);
    }
    // the stumping: the keeper whips the bails off unless the striker is back in his ground
    if (this.stumpT !== undefined && this.stumpT !== null) {
      this.stumpT -= dt;
      const s = this.striker;
      if (this.returnToCrease || (!this.strikerInput() || this.cfg.cheat.autoBat) && this.pt > .15) { s.y = approach(s.y, G.CREASE_S, T('runSpeed') * dt); s.anim = { kind: 'run', t: this.pt }; }
      if (this.stumpT <= 0) {
        this.stumpT = null; this.keeper.anim = { kind: 'stump', t: 0 };
        this.emit('stumps:broken', { end: 'S', how: 'stumped' });
        if (s.y > G.CREASE_S + 6) { const margin = (s.y - G.CREASE_S - 6) / T('runSpeed'); if (margin < .15) this.cur.third = { kind: 'stumped', margin }; return this.wicketNow('stumped', s.id, this.keeper.p.short.toLowerCase()); }
        return this.deadBall('settled');
      }
      return;
    }
    // the catch ring (a human fielding side)
    const CR = this.catchRing, F = this.fielderInput();
    if (CR && F && this.time >= CR.t0 && CR.press === null && (F.pressed('shot') || F.pressed('confirm'))) { F.consume('shot'); CR.press = this.time; }
    // fielders
    const fs = T('fieldSpeed');
    for (const a of this.fielders) {
      if (a.stun > 0) { a.stun -= dt; continue; }
      if (a === this.holder) continue;
      const v = fs * (.85 + ((a.p.field && a.p.field.speed) || 5) * .03) * (a.bees ? .7 : 1);
      if (a.task === 'chase' && !this.holder && !this.thrown) {
        const man = this.cfg.fielding === 'manual' && F && a === this.chaser;
        if (man) { const mv = F.move(), d = K.view ? K.view.screenDirToGround(mv[0], mv[1]) : mv; if (hyp(d[0], d[1]) > .1) { a.vx = d[0] * v; a.vy = d[1] * v; a.x += a.vx * dt; a.y += a.vy * dt; a.facing = Math.atan2(d[1], d[0]); a.anim = { kind: 'chase', t: this.pt }; } else this.moveActor(a, b.x, b.y, v * .5, dt); }
        else { const near = hyp(a.x - b.x, a.y - b.y) < 40 || !a.chase; this.moveActor(a, near ? b.x : a.chase.x, near ? b.y : a.chase.y, v, dt); a.anim = { kind: 'chase', t: this.pt }; }
      } else if (a.task === 'backup' && a.chase && !this.holder) { this.moveActor(a, a.chase.x + (a.chase.x - this.striker.x) * .12, a.chase.y + (a.chase.y - this.striker.y) * .12, v * .9, dt); a.anim = { kind: 'chase', t: this.pt }; }
      else if (a.task === 'stumpsS') { this.moveActor(a, a === this.keeper ? 0 : -8, -8, v * 1.1, dt); a.anim = { kind: 'ready', t: 0 }; }
      else if (a.task === 'stumpsB') { this.moveActor(a, a === this.bowler ? 4 : 10, G.BOWL_Y + 8, v, dt); a.anim = { kind: 'ready', t: 0 }; }
      else { a.anim = { kind: 'ready', t: 0 }; }
      // reaching the ball
      if (!this.holder && !this.thrown && a.task !== 'hold' && this.phase === 'inPlay') this.tryField(a, dt);
      if (this.phase !== 'inPlay') return;
    }
    // a thrown ball reaching a fielder (a relay or the keeper's take is handled by stepThrow)
    if (this.holder) this.holderStep(dt);
    // settled: dead ball
    const h = this.holder, still = !this.anyRunning() && this.batters.every(bt => this.batterEnd(bt));
    if (h && still) {
      this.settleT += dt;
      const nearStumps = h === this.keeper || h === this.bowler || hyp(h.x, h.y) < 32 || hyp(h.x, h.y - G.BOWL_Y) < 32;
      if (this.settleT > (nearStumps ? .8 : 1.6)) return this.deadBall('settled');
    } else this.settleT = 0;
    if (!this.holder && !this.thrown && b.rolling && b.vx === 0 && b.vy === 0 && this.pt > 4) { const near = this.fielders.slice().sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y))[0]; if (near && near.task !== 'chase') { near.task = 'chase'; near.chase = { x: b.x, y: b.y, t: 1 }; } }
    if ((this.pt > 1 && Math.floor(this.pt * 2) !== Math.floor((this.pt - dt) * 2)) && !this.holder && !this.thrown) this.planField();
  },
  /** a fielder near the ball: a catch (carried, in the air), a stop on the ground, a misfield, or it passes through */
  tryField(a, dt) {
    const b = this.ball, d = hyp(a.x - b.x, a.y - b.y), aerial = b.carried && b.z >= 2 && b.z <= 40, ground = b.z <= 8;
    const CR = this.catchRing, ringMine = CR && CR.fielder === a;
    if (ringMine && (aerial || CR.holding)) {
      const w = T('catchWindow') / 1000;
      if (CR.press !== null && (d <= 9 || CR.holding)) return this.resolveRing(a);
      if (this.time < CR.tc - .02) return;
      if (this.time < CR.tc + w) { CR.holding = true; b.x = a.x + Math.cos(a.facing) * 4; b.y = a.y + Math.sin(a.facing) * 4; b.z = Math.max(b.z, 12); b.vx = b.vy = b.vz = 0; b.carried = true; a.anim = { kind: 'catch', t: 0 }; return; }
      return this.resolveRing(a);
    }
    if (!(d <= (aerial ? 9 : 6) && (aerial || ground))) return;
    if (a.ghost && this.flags.ghostPhase && this.flags.ghostPhase.id === a.id) { if (!a.phased) { a.phased = true; this.emit('chaos:phase', { who: a.p.name }); coverage.mark('ghostphase'); } return; }
    if (a.passed) return;   // the ball went through this one: it can't touch it again
    if (b.passThrough > 0) { a.passed = true; b.passThrough--; this.emit('fx:passThrough', { who: a.p.name }); return; }
    if (aerial) {
      const guaranteed = this.useItem(this.bowlSide, 'sticky', 'catch') || this.flags.tray > 0 || this.cfg.cheat.catches || this.cfg.cheat.catchesOnce;
      this.cfg.cheat.catchesOnce = false;
      if (this.flags.tray > 0) this.flags.tray = 0;
      const p = this.catchP(a, Object.assign({ t: .3, vx: b.vx, vy: b.vy, vz: b.vz }, b));
      if (guaranteed || RNG.play() < p) return this.caught(a, d > 6);
      return this.dropped(a);
    }
    // a ground stop (a misfield lets it through)
    const mis = (1 - ((a.p.field && a.p.field.ground) || 5) / 10) * .1;
    if (!this.cfg.cheat.catches && RNG.play() < mis && hyp(b.vx, b.vy) > 80) { a.stun = .4; b.vx *= .55; b.vy *= .55; a.anim = { kind: 'fumble', t: 0 }; this.emit('field:misfield', { who: a.p.short }); this.planField(); return; }
    if (d > 4 && hyp(b.vx, b.vy) > 120) { a.anim = { kind: 'divestop', t: 0 }; a.down = .5; this.emit('field:dive', {}); }
    this.gather(a);
  },
  gather(a) {
    const b = this.ball; this.holder = a; a.ball = true; a.gatherT = this.time; b.vx = b.vy = b.vz = 0; b.rolling = false; b.carried = false;
    if (a.anim.kind !== 'divestop') a.anim = { kind: 'gather', t: 0 };
    this.catchRing = null;
    this.emit('field:gather', { who: a.p.short });
    this.throwDecided = false;
  },
  resolveRing(a) {
    const CR = this.catchRing, w = T('catchWindow') / 1000, d = CR.press === null ? Infinity : Math.abs(CR.press - CR.tc);
    const guaranteed = this.useItem(this.bowlSide, 'sticky', 'catch') || this.flags.tray > 0;
    if (this.flags.tray > 0) this.flags.tray = 0;
    this.catchRing = null;
    if (guaranteed || d <= w) { const screamer = d <= w * .35 && hyp(a.x - this.ball.x, a.y - this.ball.y) > 5; return this.caught(a, screamer, d <= w * .35 ? 'perfect' : 'good'); }
    if (d <= w * 2.2 && !CR.juggle) { this.emit('catch:juggle', {}); if (RNG.play() < .5) return this.caught(a, false, 'juggle'); }
    return this.dropped(a);
  },
  caught(a, dive, grade) {
    const b = this.ball; this.holder = a; a.ball = true; b.vx = b.vy = b.vz = 0; b.phase = 'dead';
    a.anim = { kind: dive ? 'divecatch' : 'catch', t: 0 }; if (dive) a.down = .8;
    this.cur.catchGrade = grade || null; this.cur.screamer = !!dive && grade === 'perfect';
    if (this.cur.screamer) this.emit('catch:screamer', { who: a.p.short });
    const behind = (a === this.keeper || (a.pos && a.pos.startsWith('slip'))) && this.contact && this.contact.edge === 'outside';
    if (behind) { Umpire.appealCaughtBehind(this, true, a); return; }
    // a catch where the ball touched the ground within 0.05 s goes upstairs
    if (b.groundAt !== null && b.groundAt !== undefined && Math.abs(b.age - b.groundAt) < .05) this.cur.third = { kind: 'caught', margin: Math.abs(b.age - b.groundAt) };
    this.wicketNow('caught', this.striker.id, a === this.keeper ? 'wk ' + a.p.short.toLowerCase() : a.p.short.toLowerCase(), { catcher: a.id, dive: !!dive });
  },
  dropped(a) {
    const b = this.ball; a.anim = { kind: 'drop', t: 0 }; a.stun = .5;
    const ang = RNG.play() * TAU; b.vx = Math.cos(ang) * 40 + b.vx * .15; b.vy = Math.sin(ang) * 40 + b.vy * .15; b.vz = 30; b.carried = false;
    this.cur.dropped = (this.cur.dropped || 0) + 1;
    this.emit('catch:dropped', { who: a.p.short }); coverage.mark('dropped');
    this.planField();
  },
  /* ---- throws ---- */
  holderStep(dt) {
    const h = this.holder, F = this.fielderInput(), human = F && this.cfg.fielding !== 'auto';
    if (this.stumpT !== null && this.stumpT !== undefined) return;
    const since = this.time - (h.gatherT || 0);
    if (since < .22) return;
    const running = this.anyRunning();
    if (h === this.keeper || h === this.bowler) {
      // at the stumps: break them if a batter is short of his ground at this end
      const end = h === this.keeper ? 'S' : 'B', ey = end === 'S' ? 0 : G.BOWL_Y;
      if (hyp(h.x, h.y - ey) < 16 && this.runOutCandidate(end)) { this.breakStumps(end, h, false); return; }
      if (running && !this.throwDecided && hyp(h.x, h.y - ey) >= 16) { const o = this.bestThrow(h); if (o) this.throwTo(o, h); }
      return;
    }
    if (human) {
      const ends = { shot: 'S', loft: 'B', block: 'K' }, pick = Object.keys(ends).find(k => F.pressed(k));
      let to = pick ? ends[pick] : null;
      const clk = K.clickEnd && K.clickEnd(F); if (clk) to = clk;
      if (to) { F.consume(pick || 'shot'); this.throwTo(to, h, since < .52); return; }
      if (since > 1.6) this.throwTo('K', h);
      return;
    }
    if (this.throwDecided) return;
    const o = this.bestThrow(h);
    if (o) this.throwTo(o, h, false);
    else if (!running && since > .6) { this.throwDecided = true; if (hyp(h.x, h.y) > 80 && hyp(h.x, h.y - G.BOWL_Y) > 80) this.throwTo('K', h); }
  },
  /** the end with the best run-out chance (CPU), or null when there's no point throwing yet */
  bestThrow(h) {
    let best = null, bm = -Infinity;
    for (const end of ['S', 'B']) {
      const sy = end === 'S' ? 0 : G.BOWL_Y, d = hyp(h.x, h.y - sy), tt = .25 + d / T('throwSpeed');
      const runner = this.batters.find(b => b.goal === end);
      if (!runner) continue;
      const tb = Math.abs(runner.y - END_Y[end]) / T('runSpeed');
      if (tb - tt > bm) { bm = tb - tt; best = end; }
    }
    if (best && bm > -.4) return best;
    if (this.anyRunning()) return hyp(h.x, h.y) < hyp(h.x, h.y - G.BOWL_Y) ? 'S' : 'B';
    return null;
  },
  /** throw to the striker's end (S), the bowler's (B) or a lob to the keeper (K); rocket: a quick release is 20% faster */
  throwTo(to, h, rocket) {
    const b = this.ball; this.throwDecided = true;
    const end = to === 'K' ? 'S' : to, sy = end === 'S' ? 0 : G.BOWL_Y, d = hyp(h.x, h.y - sy);
    const err = to === 'K' ? 0 : RNG.normal() * T('throwError') * d / 480 * (1.3 - ((h.p.field && h.p.field.throw) || 5) * .06) * (this.cfg.cheat.directHit || this.cfg.cheat.directHitOnce ? 0 : 1);
    const tgt = to === 'K' ? { x: this.keeper.x, y: this.keeper.y, z: 12 } : { x: err, y: sy + (end === 'S' ? 1 : -1) * Math.abs(err) * .2, z: 6 };
    const speed = T('throwSpeed') * (rocket ? 1.2 : 1) * (.8 + ((h.p.field && h.p.field.throw) || 5) * .04);
    const v = E.arc({ x: b.x, y: b.y, z: 14 }, tgt, this.env.g, { speed });
    Object.assign(b, { z: 14, vx: v.vx, vy: v.vy, vz: v.vz, phase: 'hit', carried: false, rolling: false });
    // a throw flies past the stumps by design: aim beyond them so a miss runs on
    this.holder = null; h.ball = false; h.anim = { kind: 'throw', t: 0 };
    this.thrown = { to, end, from: h, t: 0, lob: to === 'K', rocket, side: sign(b.y - sy) || 1 };
    this.emit('field:throw', { to, rocket });
  },
  stepThrow(x0, y0, z0) {
    const b = this.ball, th = this.thrown, end = th.end, sy = end === 'S' ? 0 : G.BOWL_Y;
    th.t += 1 / 120;
    // a direct hit: the ball's path crosses the stumps
    const crossed = (y0 - sy) * (b.y - sy) <= 0;
    if (crossed && !th.lob) {
      const f = (y0 - sy) / ((y0 - b.y) || 1e-6), x = lerp(x0, b.x, f), z = lerp(z0, b.z, f);
      if (Math.abs(x) <= G.STUMP_HALF + G.BALL_R && z <= G.STUMP_H + 1) { b.vx *= .3; b.vy *= -.2; this.thrown = null; this.emit('field:directHit', {}); coverage.mark('directhit'); return this.breakStumps(end, th.from, true); }
    }
    // the keeper or bowler (or whoever minds the stumps) takes it
    const minders = this.fielders.filter(a => a !== th.from && (a.task === (end === 'S' ? 'stumpsS' : 'stumpsB') || (th.lob && a === this.keeper)));
    for (const m of minders) if (hyp(m.x - b.x, m.y - b.y) < 12 && b.z < 30) { this.thrown = null; this.gather(m); m.gatherT = this.time - .2; return; }
    // a missed shy with nobody backing up: overthrows
    const past = (b.y - sy) * th.side < -20;   // gone beyond the stumps, whichever side it came from
    if (past && th.t > .1) { this.thrown = null; this.cur.overthrows = true; this.emit('field:overthrow', {}); coverage.mark('overthrow'); b.vx *= .7; b.vy *= .7; this.planField(); }
    if (th.t > 3) { this.thrown = null; this.planField(); }
  },
  /** the batter short of his ground at an end, if any (making for it, or having left it) */
  runOutCandidate(end) {
    const heading = this.batters.filter(b => b.goal === end && !this.grounded(b, end));
    if (heading.length) return heading.sort((p, q) => Math.abs(p.y - END_Y[end]) - Math.abs(q.y - END_Y[end]))[0];
    if (this.batters.some(b => this.grounded(b, end))) return null;
    const left = this.batters.filter(b => b.left === end && !this.grounded(b, end));
    return left[0] || null;
  },
  breakStumps(end, by, direct) {
    this.emit('stumps:broken', { end, how: direct ? 'direct' : 'gathered' });
    const out = this.runOutCandidate(end);
    if (!out) { if (this.holder !== by && !this.holder) { /* it runs on, or the minder picks it up */ } this.settleT = 0; return; }
    const reach = out.dive > 0 ? 20 : 6, short = Math.abs(out.y - END_Y[end]) - reach, margin = Math.max(0, short) / T('runSpeed');
    if (margin < .15 || this.cfg.cheat.thirdUp) { this.cur.third = { kind: 'run out', margin: Math.min(margin, .12) }; this.cfg.cheat.thirdUp = false; }
    this.wicketNow('run out', out.id, by && by.p ? by.p.short.toLowerCase() : null, { end: end === 'S' ? 'striker' : 'bowler', direct: !!direct });
  },
  /* ---- the Nets: the practice lane's back net (y -40, x within 26) and its side nets (x +-26, y -40 to 40) stop a ball
   * behind or beside the batter; it drops at the net's foot ---- */
  netCollide(x0, y0, z0) {
    if (!this.ground.nets) return false;
    const b = this.ball, H = 50, Y0 = -40, Y1 = 40, X = 26;
    if (b.z > H) return false;
    if (y0 > Y0 && b.y <= Y0 && Math.abs(b.x) <= X) { b.y = Y0 + .5; b.vy = Math.abs(b.vy) * .15; b.vx *= .3; b.vz = Math.min(b.vz, 0); b.carried = false; this.emit('net:hit', { side: 'back' }); coverage.mark('net'); return true; }
    for (const s of [-1, 1]) if ((x0 - s * X) * (b.x - s * X) <= 0 && b.y >= Y0 && b.y <= Y1 && Math.abs(x0) < X + 1) { b.x = s * (X - .5); b.vx = -b.vx * .15; b.vy *= .3; b.carried = false; this.emit('net:hit', { side: s < 0 ? 'left' : 'right' }); coverage.mark('net'); return true; }
    return false;
  },
  /* ---- the rope ---- */
  boundary(viaThrow) {
    const b = this.ball, six = b.carried && !viaThrow, n = six ? 6 : 4;
    this.cur.boundary = n; this.cur.ran = 0;
    this.emit('boundary', { n, contact: !!this.cur.contact, x: b.x, y: b.y });
    coverage.mark(six ? 'six' : 'four');
    if (!this.cur.contact) coverage.mark('byes4');
    // the ball keeps flying for the show (into the stands, a target, the sea or the pub)
    this.ballFlying = six ? 2.5 : 1;
    this.deadBall('boundary');
  }
});
