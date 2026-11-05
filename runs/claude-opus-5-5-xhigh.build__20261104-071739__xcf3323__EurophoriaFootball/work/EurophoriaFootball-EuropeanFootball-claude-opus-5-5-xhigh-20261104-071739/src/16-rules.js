/* THE RULES (sections 6.11, 6.12): the match's modes, the clock (game minutes, stoppage time), goals, the ball out of
 * play, half time, full time, golden-goal extra time and the shootout. Set pieces are in 17, the referee in 18. */
Object.assign(Match.prototype, {
  setMode(m) { this.mode = m; this.modeT = 0; },
  /** a kickoff: the kicking side's forwards in the circle, everyone else in their own half */
  startKickoff(s, first) {
    this.kickoffSide = s; if (first) this.firstKick = s;
    this.ball.place(P.CX, P.CY, 0); this.setOwner(null); this.ball.inNet = false; EF.Nets.reset();
    this.startSetpiece('kickoff', s, {});
    if (!first) this.emit('kickoffSetup', { side: s });
  },
  /** the clock: half length real seconds = 45 game minutes; stoppage time; the end of a half */
  clockStep(dt) {
    if (this.cheats.freezeClock) return;
    this.clock += dt;
    const H2 = this.half >= 3 ? 60 : this.halfLen, m = this.minute, base = this.half >= 3 ? 105 : this.half * 45;
    if (this.half < 3 && !this.stoppageShown && m >= base - 1) {
      this.stoppage = clamp(Math.round(this.stopT / 12), 1, 5); this.stoppageShown = true;
      this.emit('stoppage', { minutes: this.stoppage }); this.note('+' + this.stoppage, { sub: 'ADDED TIME', dur: 2 });
    }
    const end = this.half >= 3 ? H2 : H2 * (1 + (this.stoppage || 1) / 45);
    if (this.clock >= end) {
      const danger = this.u(0, this.ball.x) > .67 || this.u(1, this.ball.x) > .67;
      if (!danger || this.clock >= end + 15 || this.half >= 3) this.endHalf();
    }
  },
  endHalf() {
    this.setOwner(null); this.ball.vx *= .2; this.ball.vy *= .2; this.setpiece = null;
    if (this.half === 1) { this.setMode('halftime'); this.emit('whistle', { kind: 'half' }); this.emit('half', { half: 1 }); this.note('HALF TIME', { dur: 3 }); return; }
    const level = this.score[0] === this.score[1];
    const goGolden = level && this.half === 2 && (this.draws === 'cup' || this.draws === 'golden');
    const goPens = level && ((this.half === 2 && this.draws === 'penalties') || (this.half === 3 && (this.draws === 'cup' || this.draws === 'golden')));
    if (goGolden) { this.half = 3; this.clock = 0; this.golden = true; this.stopT = 0; this.emit('whistle', { kind: 'end' }); this.emit('extraTime', {}); this.note('GOLDEN GOAL', { sub: 'EXTRA TIME: THE NEXT GOAL WINS IT', dur: 2.6 }); this.startKickoff(this.firstKick, false); return; }
    if (goPens) { this.emit('whistle', { kind: 'end' }); this.startShootout(false); return; }
    this.fullTime();
  },
  secondHalf() {
    this.half = 2; this.clock = 0; this.stopT = 0; this.stoppage = 0; this.stoppageShown = false;
    this.emit('secondHalf', {}); this.startKickoff(1 - this.firstKick, false);
    if (this.stadium.fog2) this.fogTarget = .7;
    if (this.stadium.night2) this.timeOfDay = 'night';
  },
  fullTime() {
    if (this.mode === 'fulltime' || this.over) return;
    this.setMode('fulltime'); this.setOwner(null); this.setpiece = null;
    this.emit('whistle', { kind: 'full' }); this.emit('fulltime', { score: this.score.slice() }); this.note('FULL TIME', { dur: 3 });
  },
  finish() {
    if (this.over) return;
    const pens = this.shootout ? this.shootout.score.slice() : null;
    const w = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : pens ? (pens[0] > pens[1] ? 0 : 1) : -1;
    const per = this.players.map(f => ({ f, r: f.rating + f.goalsN * 1.5 })).sort((a, b) => b.r - a.r);
    const potm = (per.find(p => w < 0 || p.f.side === w) || per[0]).f;
    this.result = { score: this.score.slice(), pens, winner: w, goals: this.goals.slice(), stats: this.stats, potm, minute: Math.floor(this.minute), teams: this.teams.map(t => t.id), stadium: this.stadium.id, golden: this.golden };
    this.over = true; this.setMode('over');
    this.emit('matchOver', { result: this.result });
    if (this.onEnd) try { this.onEnd(this.result); } catch (e) { game.fail('match end', e); }
  },
  /* ---- the ball out of play, a goal, the crowd (section 6.11) ---- */
  ballRules(b, superArrived) {
    const live = this.mode === 'play' || this.mode === 'kickoff' || (this.mode === 'setpiece' && this.setpiece && this.setpiece.taken);
    if (!live) return;
    const cross = P.crossedGoalLine(b);
    if (cross) {
      b.dead = true;
      const gx = cross < 0 ? P.X0 : P.X1, scorer = this.goalX(0) === gx ? 0 : 1;
      if (superArrived || (Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2)) { b.inNet = true; return this.goalScored(scorer); }
      const defending = 1 - scorer, lt = this.lastTouch;
      this.emit('out', { kind: 'goalline', x: b.x, y: b.y, side: scorer, shot: !!b.shot });
      if (b.shot && b.shot.side === scorer) this.emit('nearMiss', { who: this.lastKick, y: b.y, z: b.z });
      if ((lt && lt.side === defending) || this.tipped) { this.tipped = null; return this.restart('corner', scorer, { gx, y: b.y }); }
      return this.restart('goalkick', defending, { gx });
    }
    if (P.overTouchline(b) || (b.z > 18 && (b.y < P.Y0 - 2 || b.y > P.Y1 + 2))) {
      b.dead = true; const side = this.lastTouch ? 1 - this.lastTouch.side : 0;
      this.emit('crowdBall', { x: b.x, y: b.y, z: b.z, north: b.y < P.CY });
      return this.restart('throwback', side, { x: clamp(b.x, P.X0 + 40, P.X1 - 40), north: b.y < P.CY });
    }
  },
  goalScored(s) {
    const b = this.ball, lt = this.lastTouch, own = lt && lt.side !== s;
    const scorer = own ? lt : (this.lastKick && this.lastKick.side === s ? this.lastKick : lt);
    this.score[s]++; b.dead = true; this.setOwner(null); this.setpiece = null; this.advantage = null;
    const g = { side: s, who: scorer, name: scorer ? scorer.data.name : '?', minute: Math.floor(this.minute) + 1, own, super: !!(b.shot && b.shot.super), kind: b.shot && b.shot.air || (b.shot && b.shot.chip ? 'chip' : b.screamer ? 'screamer' : 'shot'), half: this.half, t: this.t, pen: !!(b.shot && b.shot.pen), freekick: !!(b.shot && b.shot.freekick), corner: this.lastCornerT !== undefined && this.t - this.lastCornerT < 6, bus: !!this.bus && this.bus.side !== s };
    this.goals.push(g); if (scorer && !own) { scorer.goalsN++; scorer.rating += 1; if (scorer.human) scorer.human.stats.Goals++; }
    this.addEuphoria(s, 35, 'goal'); this.addEuphoria(1 - s, -10, 'conceded');
    this.passChain = [0, 0];
    this.setMode('goal'); this.lastGoal = g;
    this.emit(own ? 'ownGoal' : 'goal', { who: scorer, side: s, goal: g, x: b.x, y: b.y });
    this.note(own ? 'OWN GOAL!' : this.golden ? 'GOLDEN GOAL!' : 'GOAL!', { sub: g.name + "  " + g.minute + "'", dur: 2.2 });
    // VAR: a goal scored within 3 s of an unpunished foul by the scoring side, by the referee's taste for it
    const lf = this.lastFoul;
    if (lf && !lf.punished && lf.by === s && this.t - lf.t < 3 && this.rng() < this.ref.data.varHappy) this.varPending = { kind: 'goal', foul: lf, goal: g };
    if (this.golden) this.goldenWin = true;
    if (scorer && !own) this.startCelebration(scorer);
  },
  /** goal -> celebrate -> (VAR) -> replay -> kickoff */
  goalStep(dt) {
    this.stopT += dt;
    if (this.mode === 'goal' && this.modeT > 1.3) { this.setMode('celebrate'); this.emit('celebrateStart', { who: this.celebration && this.celebration.who }); }
    else if (this.mode === 'celebrate') {
      this.celebrationStep(dt);
      if (this.modeT > (this.celebration ? this.celebration.dur + 1.2 : 2.4)) this.afterGoal();
    }
  },
  afterGoal() {
    this.endCelebration();
    if (this.varPending) { const v = this.varPending; this.varPending = null; return this.startVar(v); }
    if (this.wantReplay()) { this.setMode('replay'); this.emit('replayStart', { goal: this.lastGoal }); if (!this.replayHook) this.endReplay(); return; }
    this.resumeAfterGoal();
  },
  wantReplay() { return game.settings.replays !== false && this.kind !== 'session' && this.kind !== 'training' && !this.o.noReplay; },
  endReplay() { if (this.mode !== 'replay') return; this.emit('replayEnd', {}); this.resumeAfterGoal(); },
  resumeAfterGoal() {
    if (this.goldenWin) { this.emit('goldenGoal', { side: this.lastGoal.side }); return this.fullTime(); }
    const g = this.lastGoal, s = g ? 1 - g.side : 0;
    if (this.pendingCards && this.pendingCards.length) { this.queued = { kind: 'kickoff', side: s, info: {} }; return this.startCard(); }
    this.startKickoff(s, false);
  },
  /** a restart: cards wait for it, then VAR for a penalty, then the set piece (section 6.10) */
  restart(kind, side, info) {
    this.setOwner(null); this.advantage = null;
    this.emit('whistle', { kind: kind === 'throwback' ? 'none' : 'short', restart: kind });
    const card = this.pendingCards && this.pendingCards.length;
    this.queued = { kind, side, info };
    if (card) return this.startCard();
    if (kind === 'penalty' && !this.o.noVar && this.rng() < Math.max(.5, this.ref.data.varHappy)) return this.startVar({ kind: 'penalty', foul: info.foul, side });
    this.startSetpiece(kind, side, info);
  },
  continueRestart() { const q = this.queued; this.queued = null; if (!q) return this.setMode('play'); if (q.kind === 'kickoff') return this.startKickoff(q.side, false); if (q.kind === 'freekick-overturn') return this.startSetpiece('freekick', q.side, q.info); this.startSetpiece(q.kind, q.side, q.info); },
  /* ---- the shootout (section 6.12): 5 each, alternating, then sudden death; ends early when one side can't catch up ---- */
  startShootout(only) {
    this.setOwner(null); this.setpiece = null; this.golden = false;
    const order = [0, 1].map(s => this.side[s].filter(f => !f.sentOff).slice().sort((a, b) => (a.role === 'GK') - (b.role === 'GK') || b.stat('shoot') - a.stat('shoot')));
    this.shootout = { kicks: [[], []], score: [0, 0], turn: this.firstKick, order, idx: [0, 0], n: 0, state: 'setup', t: 0, sudden: false, winner: null, only: !!only, kick: null };
    this.setMode('shootout'); this.half = this.half < 3 && !only ? this.half : this.half;
    this.shootGoalX = P.X1;
    this.emit('shootoutStart', {}); this.note('PENALTIES', { sub: only ? 'BEST OF FIVE' : 'IT GOES TO A SHOOTOUT', dur: 2 });
    this.nextShootoutKick();
  },
  nextShootoutKick() {
    const S = this.shootout, s = S.turn, taker = S.order[s][S.idx[s] % S.order[s].length], keeper = this.keeper(1 - s) || this.side[1 - s][0];
    S.idx[s]++; S.state = 'setup'; S.t = 0;
    S.kick = new EF.PenaltyKick(this, taker, keeper, { shootout: true, gx: this.shootGoalX });
  },
  shootoutStep(dt) {
    const S = this.shootout; if (!S || S.winner !== null) { if (S && this.modeT > 2.5 && !this.over) this.endShootout(); return; }
    const K = S.kick; if (!K) return;
    K.update(dt);
    if (K.done) {
      S.t += dt;
      if (S.t < 1.4) return;
      const s = S.turn; S.kicks[s].push(K.scored); if (K.scored) S.score[s]++;
      this.emit('shootoutKick', { side: s, scored: K.scored, who: K.taker, panenka: K.panenka, kind: K.outcome });
      // can either side still catch up?
      const n0 = S.kicks[0].length, n1 = S.kicks[1].length, left0 = Math.max(0, 5 - n0), left1 = Math.max(0, 5 - n1);
      if (!S.sudden) {
        if (S.score[0] + left0 < S.score[1] || S.score[1] + left1 < S.score[0]) S.winner = S.score[0] > S.score[1] ? 0 : 1;
        else if (n0 === 5 && n1 === 5) { if (S.score[0] !== S.score[1]) S.winner = S.score[0] > S.score[1] ? 0 : 1; else { S.sudden = true; this.note('SUDDEN DEATH', { dur: 1.6 }); this.emit('suddenDeath', {}); } }
      } else if (n0 === n1 && S.score[0] !== S.score[1]) S.winner = S.score[0] > S.score[1] ? 0 : 1;
      if (S.winner !== null) { this.modeT = 0; this.emit('shootoutEnd', { winner: S.winner, score: S.score.slice() }); this.note(this.teams[S.winner].short + ' WIN ON PENALTIES', { sub: S.score[0] + ' - ' + S.score[1], dur: 2.6 }); return; }
      S.turn = 1 - S.turn; S.n++; this.nextShootoutKick();
    }
  },
  endShootout() { const S = this.shootout; S.kick = null; this.finish(); }
});
