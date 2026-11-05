/* ---- THE LAWS: open play, the clock and the hooter, touch and dead balls, scoring, knock-ons and forward passes, the
 * referee (who calls only what he sees), fouls, advantage, cards and the sin bin ---- */
Object.assign(Match.prototype, {
  ph_play(dt) {
    this.clockStep(dt);
    this.stepPlayers(dt);
    this.hangStep();
    const wasAir = this.ball.st === 'air';
    this.stepBall(dt);
    if (wasAir && this.ball.st === 'loose') this.spillLanded();
    if (this.phase !== 'play') return;
    this.catchStep();
    if (this.phase !== 'play') return;
    this.carrierChecks(dt);
    if (this.phase !== 'play') return;
    this.outOfPlay();
    if (this.phase !== 'play') return;
    this.advStep(dt);
    this.foulChecks(dt);
  },
  clockStep(dt) {
    if (TT.cheats.noClock || this.o.noClock) return;
    if (this.sudden) { this.suddenT += dt; if (!this.o.cup && this.suddenT >= 120 && !this.hooter) { this.hooter = true; this.emit('hooter', {}); } return; }
    this.clock += dt;
    if (!this.hooter && this.clock >= this.halfLen) { this.hooter = true; this.emit('hooter', {}); this.banner('HOOTER!', { color: '#ff6a3a' }); }
    for (const p of this.players) if (p.st === 'bin') { p.binT -= dt; }
  },
  /** the clock shown: sevens time, 0:00 to 7:00 a half */
  tvClock() { return Math.min(420, this.clock * 420 / this.halfLen); },
  /* ---- the carrier: tackled (offload, then the ruck), the in-goal, line breaks, metres, "use it" ---- */
  carrierChecks(dt) {
    const c = this.carrier(); if (!c) return;
    const d = this.dir[c.team];
    if (c.prevX !== undefined && FREE[c.st]) { const g = (c.x - c.prevX) * d; if (g > 0) { this.stats[c.team].metres += g; c.metres += g; } }
    c.prevX = c.x;
    if (c.stagger > 0) { c.stagger -= dt; c.vx *= .97; c.vy *= .97; }
    if (c.st === 'down' && c.pin) {
      c.tackledT = (c.tackledT || 0) + dt;
      if (this.inGoal(c.team, c.x)) return this.tryScored(c, c.x, c.y, c.dived ? 'dive' : 'tackled');
      if (this.inOwnGoal(c)) { this.whistle('held', () => this.scrumSetup(1 - c.team, this.ownLine(c.team) + d * G.L5, c.y, '5m')); return; }
      // the offload: in the first moments of the tackle, L1 / R1 (or the CPU's choice) pops it to a supporter
      if (c.tackledT < .15 && !c.offTried) {
        let side = 0;
        if (c.ctl >= 0) { if (c.I.pr.l1) side = -1; else if (c.I.pr.r1) side = 1; }
        else if (this.rng() < (this.teams[c.team].style.pass * .25) * dt * 60 / 9) side = this.rng() < .5 ? -1 : 1;
        if (side) {
          c.offTried = true;
          const r = this.legalReceivers(c, 0).filter(q => dist(q, c) < 50).sort((a, b) => dist(a, c) - dist(b, c))[0];
          if (r) { c.pin = false; this.doPass(c, r, false, true); this.setSt(c, 'down', .8); return; }
        }
      }
      if (c.tackledT >= .45) return this.startRuck(c);
      return;
    }
    c.offTried = false;
    if (c.st === 'down' && c.dived && this.inGoal(c.team, c.x)) return this.tryScored(c, c.x, c.y, 'dive');
    if (FREE[c.st] && this.inGoal(c.team, c.x)) {
      c.inGoalT += dt;
      const deadLine = d > 0 ? G.DX1 : G.DX0;
      if (c.inGoalT > 2.5 || Math.abs(c.x - deadLine) < 16) return this.tryScored(c, c.x, c.y, 'walk');
    } else c.inGoalT = 0;
    // a line break: past every opponent but the last man
    if (!this.breakDone && FREE[c.st]) {
      const foes = this.players.filter(q => q.team !== c.team && this.standing(q));
      const behind = foes.filter(q => (q.x - c.x) * d < -4).length;
      if (foes.length > 2 && behind >= foes.length - 1 && this.adv1(c.team, c.x) > -G.W / 2 + 120) {
        this.breakDone = true; this.stats[c.team].breaks++; c.breaks++; this.hypeAdd(c.team, 8); this.emit('lineBreak', { id: c.id });
        this.tryRun = { id: c.id, x: c.x, t: this.t };
      }
    }
    // "USE IT!": the ball at the base of a ruck must be played within three seconds
    if (this.useIt > 0 && c.id === this.useItId) {
      if (dist2(c.x, c.y, this.useItX, this.useItY) > 18 || c.st !== 'free') this.useIt = 0;
      else { this.useIt -= dt; if (this.useIt <= 0) { this.refCall('useIt'); this.whistle('useIt', () => this.scrumSetup(1 - c.team, c.x, c.y)); } }
    }
  },
  inOwnGoal(c) { return this.dir[c.team] > 0 ? c.x < G.X0 : c.x > G.X1; },
  /* ---- touch, touch-in-goal and the dead-ball lines ---- */
  outOfPlay() {
    const b = this.ball, c = this.carrier();
    if (c) {
      if (FREE[c.st] && (c.y < G.Y0 || c.y > G.Y1) && c.x > G.DX0 && c.x < G.DX1) {
        if (c.x >= G.X0 && c.x <= G.X1) return this.touch(1 - c.team, c.x, c.y < G.Y0 ? G.Y0 : G.Y1, false);
        return this.deadBall(c.team, c.x);
      }
      if (FREE[c.st] && (c.x < G.DX0 || c.x > G.DX1)) return this.deadBall(c.team, c.x);
      return;
    }
    if (b.st !== 'air' && b.st !== 'loose') return;
    if (b.y < G.Y0 || b.y > G.Y1) {
      if (b.x >= G.X0 && b.x <= G.X1) {
        const fromPen = this.kickForTouch !== undefined && this.kickForTouch === b.team && b.kind !== 'spill';
        const team = fromPen ? b.team : 1 - b.team;
        if (b.kind === 'kickoff') return this.whistle('kickoffOut', () => this.scrumSetup(1 - b.team, G.CX, G.CY));
        this.kickForTouch = undefined;
        return this.touch(team, b.x, b.y < G.Y0 ? G.Y0 : G.Y1, b.kind === 'punt' || b.kind === 'bomb' || b.kind === 'grubber');
      }
      return this.deadBall(b.team, b.x);
    }
    if (b.x < G.DX0 || b.x > G.DX1) return this.deadBall(b.team, b.x);
  },
  touch(team, x, y, kicked) {
    const lx = clamp(x, G.X0 + G.L5, G.X1 - G.L5);
    this.emit(kicked ? 'kickTouch' : 'touch', { team, x: lx, y });
    this.refCall('touch');
    this.whistle('touch', () => this.lineoutSetup(team, lx, y));
  },
  /** the ball dead beyond a dead-ball line (or touch-in-goal): put there by the attackers, a 22 drop-out; by the
   *  defenders, a 5 m scrum to the attackers */
  deadBall(lastTeam, x) {
    const east = x > G.CX, attackers = this.dir[0] > 0 === east ? 0 : 1, defenders = 1 - attackers;
    if (lastTeam === attackers) { this.emit('deadBall', { team: defenders }); this.refCall('drop'); this.whistle('dead', () => this.dropoutSetup(defenders)); }
    else { this.emit('deadBall', { team: attackers }); this.whistle('dead', () => this.scrumSetup(attackers, this.ownLine(defenders) + this.dir[defenders] * G.L5, this.ball.y, '5m')); }
  },
  /** kicks at the posts are judged as they cross the try line: between the uprights and over the crossbar */
  postCheck(b, x0) {
    const line = this.oppLine(b.aimTeam);
    if ((x0 - line) * (b.x - line) > 0) return;
    const dy = Math.abs(b.y - G.CY);
    const team = b.aimTeam; b.aimTeam = -1;
    if (Math.abs(dy - G.POSTW) < 2.5 && b.z < G.POSTH && b.z > 2) {
      b.vx = -b.vx * .4; b.vy = (this.rng() - .5) * 80; b.x = line - this.dir[team] * 2;
      this.emit('doink', { team });
      if (b.kind === 'setkick') this.pendingKick = 'doink';
      return;
    }
    const good = dy < G.POSTW && b.z > G.BAR;
    if (b.kind === 'drop') { if (good) this.dropGoal(team); else this.emit('dropMiss', { team }); }
    else if (b.kind === 'setkick') this.pendingKick = good ? 'good' : 'miss';
  },
  /* ---- scoring ---- */
  addScore(team, pts, how) {
    this.score[team] += pts; this.lastScore = team; this.emit('score', { team, pts, how });
    if (this.adv && this.adv.team === team) { this.adv = null; this.emit('advOver', {}); }
    // ON FIRE ends when the other team scores
    for (const p of this.players) if (p.team !== team && p.fire > 0) { p.fire = 0; this.emit('fireOut', { id: p.id }); }
    for (const p of this.players) if (p.team !== team) this.triesRow[p.id] = 0;
  },
  tryScored(p, x, y, how) {
    if (this.phase !== 'play' && this.phase !== 'scrum') return;
    const pts = how === 'penalty' ? 7 : 5;
    this.addScore(p.team, pts, 'try');
    this.stats[p.team].tries++; p.tries++;
    this.triesRow[p.id] = (this.triesRow[p.id] || 0) + 1;
    const run = this.tryRun && this.tryRun.id === p.id ? Math.abs(p.x - this.tryRun.x) : 0;
    this.ball.st = 'dead'; this.ball.holder = p.id;
    this.hypeAdd(p.team, 15);
    this.emit('try', { id: p.id, team: p.team, x, y, how, run });
    this.refCall('try'); this.ref.signal = 'try'; this.ref.sigT = 2;
    if (this.triesRow[p.id] >= 2 && !(p.fire > 0)) { p.fire = 90; this.emit('onFire', { id: p.id }); }
    const replay = how === 'pushover' || run >= 200 || this.breakDone || this.lastSuperTry || this.o.replays === 'All tries';
    if (replay) this.replayAsk = { kind: 'try', id: p.id, t: this.t, force: true };
    this.lastSuperTry = false;
    this.goPhase('try'); this.tryAt = { x, y, team: p.team, how, id: p.id };
    for (const q of this.players) if (q.team === p.team && this.onPitch(q)) { if (q.st !== 'down') this.setSt(q, 'cele'); q.a.cele = (q.slot * 3 + this.score[p.team]) % 6; }
    this.setSt(p, 'cele'); p.a.cele = p.slot % 6;
    if (this.sudden) this.suddenWin = p.team;
  },
  ph_try(dt) {
    this.stepPlayers(dt, false); this.stepBall(dt);
    if (this.phaseT > 2.6) {
      const at = this.tryAt;
      if (this.sudden) return this.fullTime();
      if (at.how === 'penalty') return this.afterScore(at.team);
      this.setKickSetup(at.team, at.x, at.y, 'conv');
    }
  },
  dropGoal(team) {
    this.addScore(team, 3, 'drop'); this.hypeAdd(team, 10);
    this.emit('dropGoal', { team, id: this.ball.from });
    this.replayAsk = { kind: 'drop', id: this.ball.from, t: this.t };
    this.ball.st = 'dead';
    this.whistle('drop', () => this.afterScore(team), 1.6);
  },
  /** after any score: sudden death ends; the hooter ends the half; else the scoring team kicks off */
  afterScore(scorer) {
    if (this.sudden && this.lastScore >= 0) return this.fullTime();
    if (this.hooter) return this.endHalf();
    this.kickoffTeam = scorer;
    this.goPhase('kickoff');
  },
  /* ---- stoppages ---- */
  /** the whistle: play stops, a beat, then next() (the hooter ends the half instead) */
  whistle(kind, next, wait = 1.1) {
    this.ball.st = this.ball.st === 'held' ? 'held' : 'dead';
    this.adv = null; this.useIt = 0; this.breakDone = false;
    this.emit('whistle', { kind });
    this.pending = next; this.goPhase('dead'); this.deadWait = wait;
    for (const p of this.players) { p.charge = -1; if (p.sup && p.sup.kind === 'hurricane') this.endSuper(p); }
  },
  ph_dead(dt) {
    this.stepPlayers(dt, false); this.hangStep();
    if (this.ball.st === 'air' || this.ball.st === 'loose') this.stepBall(dt);
    if (this.phaseT >= this.deadWait) this.afterDead();
  },
  afterDead() {
    const next = this.pending; this.pending = null;
    for (const p of this.players) { if (p.st === 'down' && p.pin) { p.pin = false; this.setSt(p, 'up', .4); } if (p.hanging >= 0 && p.hanging !== undefined) { p.hanging = -1; this.setSt(p, 'free'); } p.held = 0; }
    if (this.hooter && !this.sudden) return this.endHalf();
    if (this.sudden && this.hooter) return this.fullTime();
    if (next) next(); else this.restartPlay(this.poss, this.ball.x, this.ball.y);
  },
  knockOn(q, fromSpill) {
    const b = this.ball;
    b.st = 'dead'; b.holder = -1;
    this.emit('knockOn', { id: q.id, team: q.team });
    this.refCall('knockOn');
    this.whistle('knockOn', () => this.scrumSetup(1 - q.team, b.x, b.y));
  },
  forwardPass(fromId, x, y) {
    const p = this.players[fromId], team = p ? p.team : this.ball.team;
    this.ball.st = 'dead'; this.ball.holder = -1;
    this.emit('forwardPass', { id: fromId, team });
    this.refCall('forward');
    this.whistle('forward', () => this.scrumSetup(1 - team, x, y));
  },
  /** play goes on from (x, y) with team's nearest player holding the ball (a tap, the end of a set piece) */
  restartPlay(team, x, y) {
    const p = this.players.filter(q => q.team === team && this.standing(q)).sort((a, b) => dist2(a.x, a.y, x, y) - dist2(b.x, b.y, x, y))[0];
    for (const q of this.players) if (q.st === 'set' || q.st === 'ruck' || q.st === 'cele') this.setSt(q, 'free');
    this.setp = null; this.goPhase('play');
    if (p) { p.x = clamp(x, G.DX0 + 10, G.DX1 - 10); p.y = clamp(y, G.Y0 + 10, G.Y1 - 10); this.give(p, 'restart'); }
  },
  /* ---- the half, full time and sudden death ---- */
  endHalf() {
    this.hooter = false;
    if (this.half === 1) {
      this.goPhase('half'); this.ball.st = 'dead';
      this.emit('halftime', { score: this.score.slice() });
      return;
    }
    const level = this.score[0] === this.score[1];
    if (level && !this.sudden && (this.o.cup || this.o.sudden)) return this.suddenDeath();
    this.fullTime();
  },
  ph_half(dt) {
    this.stepPlayers(dt, false);
    const go = this.seats.some(s => s.I.pr.x || s.I.pr.ci) || this.phaseT > (this.o.cup ? 9 : 7) || this.o.attract || this.o.session || this.o.drill;
    if (go && this.phaseT > 1.5) this.secondHalf();
  },
  secondHalf() {
    this.half = 2; this.clock = 0; this.hooter = false; this.dir = [this.dir[0] * -1, this.dir[1] * -1];
    this.kickoffTeam = 1; this.emit('secondHalf', {});
    this.goPhase('kickoff');
  },
  suddenDeath() {
    this.sudden = true; this.suddenT = 0; this.hooter = false;
    this.emit('suddenDeath', {}); this.banner('GOLDEN POINT!', { color: '#ffd040' });
    this.kickoffTeam = 0; this.goPhase('kickoff');
  },
  fullTime() {
    if (this.over) return;
    this.over = true; this.goPhase('full');
    const w = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
    this.result = { winner: w, score: this.score.slice() };
    for (const p of this.players) if (this.onPitch(p)) { if (p.team === w) { this.setSt(p, 'cele'); p.a.cele = p.slot % 6; } else if (w >= 0) { this.setSt(p, 'free'); p.a.sad = 1; } }
    this.emit('fulltime', { winner: w, score: this.score.slice() });
  },
  ph_full(dt) { this.stepPlayers(dt, false); },
  /* ---- the referee: runs behind play on the far side, turns to the ball, calls what he sees ---- */
  refStep(dt) {
    const R = this.ref;
    R.callT = Math.max(0, R.callT - dt); R.sigT = Math.max(0, R.sigT - dt); if (R.sigT <= 0) R.signal = this.adv ? 'advantage' : '';
    if (R.down > 0) { R.down -= dt; R.vx = R.vy = 0; if (R.down <= 0) { R.down = 0; this.emit('refUp', {}); } return; }
    const b = this.ball, t = this.poss, d = this.dir[t] || 1;
    let tx = b.x - d * 50, ty = Math.min(b.y, G.CY) - 40;
    if (this.setp && this.setp.kind === 'setkick') { tx = this.oppLine(this.setp.team) + this.dir[this.setp.team] * 20; ty = G.CY - 60; }
    ty = clamp(ty, G.Y0 - 20, G.Y1 - 40); tx = clamp(tx, G.DX0, G.DX1);
    // steer round players
    for (const p of this.players) if (this.onPitch(p) && dist(p, R) < 18) { const a = angTo(p, R); tx += Math.cos(a) * 20; ty += Math.sin(a) * 20; }
    const dx = tx - R.x, dy = ty - R.y, dd = Math.hypot(dx, dy), sp = dd > 4 ? Math.min(95, dd * 3) : 0;
    R.vx = approach(R.vx, dd ? dx / dd * sp : 0, 500 * dt); R.vy = approach(R.vy, dd ? dy / dd * sp : 0, 500 * dt);
    R.x += R.vx * dt; R.y += R.vy * dt;
    R.f = E.approachAng(R.f, Math.atan2(b.y - R.y, b.x - R.x), dt * 4);
  },
  /** does the referee see p now? (the setting cheats aside) */
  refSees(p) {
    if (this.ref.down > 0 || TT.cheats.refBlind) return false;
    if (TT.cheats.refStrict) return true;
    const R = this.ref, d = dist(R, p);
    if (d > TUNE.v.refRange) return false;
    return Math.abs(angDiff(R.f, angTo(R, p))) <= TUNE.v.refFov / 2;
  },
  /** a foul by p: called only if the referee sees it (now, or 0.3 s later as he turns); returns whether it was seen */
  foul(p, kind, o = {}) {
    if (this.ref.down > 0) { this.emit('foulUnseen', { id: p.id, kind, refDown: true }); return false; }
    if (this.refSees(p)) { this.callFoul(p, kind, o); return true; }
    (this.foulsLater || (this.foulsLater = [])).push({ id: p.id, kind, o, t: this.t + .3 });
    return false;
  },
  foulChecks() {
    if (!this.foulsLater || !this.foulsLater.length) return;
    const due = this.foulsLater.filter(f => f.t <= this.t); this.foulsLater = this.foulsLater.filter(f => f.t > this.t);
    for (const f of due) { const p = this.players[f.id]; if (p && this.refSees(p) && this.phase === 'play') { this.callFoul(p, f.kind, f.o); return; } }
  },
  callFoul(p, kind, o) {
    const victim = 1 - p.team;
    const card = kind === 'highShot' || (kind === 'offBall' && (p.cheap >= 2 || this.rng() < .35)) ? 'yellow' : null;
    this.emit('foul', { id: p.id, kind, card });
    this.refCall(kind === 'highShot' ? 'highShot' : kind === 'offBall' ? 'offBall' : kind === 'hands' ? 'hands' : kind === 'offside' ? 'offside' : 'penalty');
    this.stats[p.team].pens++;
    const c = this.carrier();
    // a penalty try: a foul on a carrier close to the line with no defender between him and it
    if (c && c.team === victim && o.victim === c.id && this.adv1(victim, c.x) > G.W / 2 - 60 && !this.players.some(q => q.team === p.team && this.standing(q) && (q.x - c.x) * this.dir[victim] > 0 && Math.abs(q.y - c.y) < 60)) {
      if (card) this.giveCard(p, card);
      return this.penaltyTry(victim, c);
    }
    if (this.phase === 'play' && c && c.team === victim && kind !== 'hands') {
      this.adv = { team: victim, t: 5, x0: c.x, mark: { x: p.x, y: p.y }, kind, offender: p.id, card };
      this.ref.signal = 'advantage'; this.ref.sigT = 5; this.refCall('advantage');
      this.emit('advantage', { team: victim });
      return;
    }
    if (card) this.giveCard(p, card);
    this.penaltyAward(victim, p.x, p.y, kind);
  },
  penaltyTry(team, c) {
    this.ball.st = 'held'; this.ball.holder = c.id;
    this.emit('penTry', { team });
    this.ref.signal = 'try'; this.ref.sigT = 2;
    this.tryScored(c, this.oppLine(team), G.CY, 'penalty');
  },
  advStep(dt) {
    const A = this.adv; if (!A) return;
    A.t -= dt;
    const c = this.carrier();
    const gained = c && c.team === A.team ? (c.x - A.x0) * this.dir[A.team] : 0;
    if (gained >= 100) { this.adv = null; this.ref.signal = ''; if (A.card) this.giveCard(this.players[A.offender], A.card); this.emit('advOver', { team: A.team }); this.refCall('playOn'); return; }
    const lost = (c && c.team !== A.team) || (this.ball.st === 'loose' && this.ball.team !== A.team && this.ball.t > .6);
    if (lost || A.t <= 0) {
      this.adv = null;
      const off = this.players[A.offender];
      if (A.card && off) this.giveCard(off, A.card);
      this.penaltyAward(A.team, A.mark.x, A.mark.y, A.kind);
    }
  },
  /** a yellow card: the sin bin (an actual bin); a second: red, off for the match */
  giveCard(p, card) {
    if (!p || !this.onPitch(p)) return;
    p.yellow++;
    const red = p.yellow >= 2;
    if (this.ball.holder === p.id && this.ball.st === 'held') { this.ball.st = 'dead'; this.ball.holder = -1; }
    if (p.ctl >= 0) { const s = this.seats[p.ctl]; p.ctl = -1; if (s) s.pid = -1; }
    if (red) { this.setSt(p, 'off'); p.red = true; }
    else { this.setSt(p, 'bin'); p.binT = TUNE.v.sinBin; }
    p.x = G.CX + 60 + (p.team ? 10 : -10); p.y = G.Y1 + 30; p.vx = p.vy = 0;
    this.stats[p.team].cards++;
    this.ref.card = red ? 'red' : 'yellow'; this.ref.signal = 'card'; this.ref.sigT = 2.4;
    this.emit('card', { id: p.id, team: p.team, red });
    this.banner(red ? 'RED CARD!' : 'SIN BIN!', { color: red ? '#ff3a3a' : '#ffd040' });
  },
  binStep(p, dt) {
    p.vx = p.vy = 0;
    if (p.st === 'bin' && p.binT <= 0) {
      this.setSt(p, 'free'); p.x = G.CX + 40 * (p.team ? 1 : -1); p.y = G.Y1 + 14;
      this.emit('sinBinOut', { id: p.id });
    }
  },
  statsStep(dt) {
    if (this.phase !== 'play' && this.phase !== 'ruck') return;
    const c = this.carrier();
    if (c) this.stats[c.team].poss += dt;
    const b = this.ball;
    for (const t of [0, 1]) if (this.adv1(t, b.x) > 0) this.stats[t].terr += dt;
  }
});
