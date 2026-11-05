/* =============================================================================
 * 14-play: the live ball. Fielders (assignment at contact by earliest intercept,
 * cover roles, chase, catch, dive, jump, wall climb, throws, cutoffs, forces,
 * tags, rundowns) and baserunners (forces, tag-ups, halfway on flies, the time
 * race, orders, steals, slides, the bowl-over), outs, runs and the third-out
 * rule, and when a play is over. Pure simulation: no drawing here.
 * ========================================================================== */
const FSPD = 116, RSPD = 152, THROW = 500;
BZ.makeFielder = (M, pl, pos) => {
  const p = M.park, d = BZ.FIELD_POS[pos], deep = (pos === 'LF' || pos === 'CF' || pos === 'RF') ? (p.depth || 0) : 0;
  const hx = p.H.x + d[0] * (1 + deep / 900), hy = p.H.y + d[1] - deep * (pos === 'CF' ? 1 : .8);
  return { pos, player: pl, x: hx, y: hy, z: 0, vx: 0, vy: 0, vz: 0, facing: Math.PI / 2, home: { x: hx, y: hy }, state: 'set', tx: hx, ty: hy, role: 'idle', has: false, react: 0, stT: 0, tried: -1, human: null, turbo: false, throwT: 0, climbH: 0, dives: 0 };
};
BZ.fielderSpeed = (M, f) => {
  const T = M.teamOf(f.player), up = M.upgrades && M.upgradeTeam === T.side ? 1 + .04 * (M.upgrades.cleats || 0) : 1;
  return FSPD * BZ.factor(f.player.spd) * TUNE.fielderSpeed * (f.turbo ? 1.35 * TUNE.turboPower + (1 - TUNE.turboPower) : 1) * up * (f.human ? 1 : 1);
};
BZ.throwSpeed = (M, f, power = .8) => {
  const T = M.teamOf(f.player), up = M.upgrades && M.upgradeTeam === T.side ? 1 + .05 * (M.upgrades.arms || 0) : 1;
  return THROW * BZ.factor(f.player.arm) * (.85 + .35 * power) * TUNE.throwSpeed * up;
};
/** a throw's speed over a distance: long throws arc and lose pace (a Laser Arm never does) */
BZ.throwPace = (M, f, d, power = .8, laser = false) => laser ? 1400 : BZ.throwSpeed(M, f, power) * (d > 400 ? Math.pow(400 / d, .25) : 1);
BZ.catchReach = (M, f) => {
  const T = M.teamOf(f.player), up = M.upgrades && M.upgradeTeam === T.side ? (M.upgrades.gloves || 0) : 0;
  return 9 * BZ.factor(f.player.glv) * TUNE.catchRadius + up;
};
BZ.runSpeed = (M, r) => {
  const T = BZ.offense(M), up = M.upgrades && M.upgradeTeam === T.side ? 1 + .04 * (M.upgrades.cleats || 0) : 1;
  return RSPD * BZ.factor(r.player.spd) * TUNE.runSpeed * (r.turbo ? 1 + .25 * TUNE.turboPower : 1) * (T.afterburn > 0 ? 1.8 : 1) * up * (r.slideBoost ? 1.1 : 1);
};
/** a runner's world position from his progress p along the basepaths (0 home, 1 first, ... 4 home) */
BZ.runnerPos = (M, p) => {
  const P = M.park, i = clamp(Math.floor(p), 0, 3), f = clamp(p - i, 0, 1), a = P.base(i), b = P.base(i + 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
};

BZ.play = {
  /** start a live play from the bases (kind: 'batted' | 'steal' | 'wild' | 'pickoff') */
  begin(M, kind, o = {}) {
    const P = M.park;
    M.play = { kind, t: 0, runs: [], outs: [], caughtFly: false, error: false, settleT: 0, done: false, deadReason: null, version: -1, pred: null, chaser: null, touchedBy: null, hit: o.hit || null, batterOut: false, hrPending: false, lastMove: 0, contact: o.contact || null, startOuts: M.outs, bowl: false };
    M.runners = [];
    for (let i = 2; i >= 0; i--) if (M.bases[i]) {
      const lead = (M.leads && M.leads[i + 1]) || 0, rn = { player: M.bases[i], p: i + 1 + lead, base: i + 1, start: i + 1, goal: i + 1, state: 'base', forced: false, mustTag: 0, isBatter: false, turbo: false, slide: 0, orderT: 0, steal: !!(M.steals && M.steals[i + 1]) };
      M.runners.push(rn);
    }
    if (kind === 'batted') {
      M.runners.push({ player: M.batter, p: 0, base: 0, start: 0, goal: 1, state: 'run', forced: true, mustTag: 0, isBatter: true, turbo: false, slide: 0, delay: .35, orderT: 0 });
      this.computeForces(M);
    }
    for (const f of M.fielders) { f.react = this.reaction(M, f); f.tried = -1; f.state = f.state === 'set' ? 'set' : f.state; f.climbH = 0; f.z = 0; f.vz = 0; }
    M.ball.version++;
  },
  reaction(M, f) {
    if (f.human || M.cheatFreeze) return 0;
    const lv = M.teams[BZ.defense(M).side].humans.length ? 'pro' : (M.cpuLevel || M.difficulty || 'pro');
    const base = { rookie: .34, pro: .25, allstar: .19, batzooka: .14 }[lv] || .25, of = ['LF', 'CF', 'RF'].includes(f.pos) ? .18 : 0;
    return (base + of) / Math.max(.3, TUNE.cpuField);
  },
  /** forced runners: a chain from the batter */
  computeForces(M) {
    const occ = b => M.runners.find(r => r.state !== 'out' && r.state !== 'scored' && r.start === b);
    // the batter-runner forces first; a runner on b is forced when every base below him is taken
    let f = true;
    for (let b = 1; b <= 3; b++) { const r = occ(b); if (!r) f = false; else r.forced = f; }
    const batter = M.runners.find(r => r.isBatter); if (batter) batter.forced = true;
    if (!batter) for (const r of M.runners) r.forced = false;
  },
  liveRunners(M) { return M.runners.filter(r => r.state !== 'out' && r.state !== 'scored'); },

  /* ---------------- the ball and the fielders ---------------- */
  replan(M) {
    const b = M.ball, P = M.park;
    if (b.mode === 'held' || b.mode === 'dead' || b.mode === 'none') { M.play.pred = null; return; }
    M.play.pred = BZ.predict(b, P, 7); M.play.version = b.version;
    this.assign(M);
  },
  /** who chases (the earliest intercept) and who covers what */
  assign(M) {
    const pred = M.play.pred, P = M.park, b = M.ball, D = M.fielders; if (!pred) return;
    const thrown = b.mode === 'thrown';
    let best = null, bestT = 1e9, bestPt = null;
    for (const f of D) {
      if (f.state === 'down') continue;
      const sp = BZ.fielderSpeed(M, f) * 1.0, rx = f.react;
      let got = null;
      for (const s of pred.samples) {
        if (s.z > (f.pos === 'C' ? 30 : 34) && !(s.vz < 0 && s.z < 80 && P.jumpMul > 1.5)) continue;
        if (!BZ.inField(P, s.x - P.H.x, s.y - P.H.y) && P.beyond(s.x, s.y) > 0) continue;
        const d = Math.max(0, Math.hypot(s.x - f.x, s.y - f.y) - BZ.catchReach(M, f) * .8);
        if (rx + d / sp <= s.t) { got = s; break; }
      }
      const tt = got ? got.t : (pred.stop.t + Math.hypot(pred.stop.x - f.x, pred.stop.y - f.y) / sp);
      const pt = got || pred.stop;
      if (thrown) continue;
      if (tt < bestT) { bestT = tt; best = f; bestPt = pt; }
    }
    if (thrown) return;   // a throw keeps the receivers as they are
    // a ball heading over the fence: the outfielder nearest the wall point climbs for it
    M.play.robPoint = null;
    if (pred.hr && pred.hrAt) {
      const hz = pred.hrAt.z, th = BZ.theta(pred.hrAt.x - P.H.x, pred.hrAt.y - P.H.y), Hf = P.Hf(th);
      if (hz < Hf + 26 + (M.offenseHaunt ? 0 : 0) + (BZ.defense(M).id === 'haunts' ? 40 : 0)) {
        let nf = null, nd = 1e9; for (const f of D) { if (!['LF', 'CF', 'RF'].includes(f.pos)) continue; const d = Math.hypot(f.x - pred.hrAt.x, f.y - pred.hrAt.y); if (d < nd) { nd = d; nf = f; } }
        if (nf && nd / BZ.fielderSpeed(M, nf) + nf.react < pred.hrT + .1) { best = nf; bestPt = { x: pred.hrAt.x, y: pred.hrAt.y, t: pred.hrT }; M.play.robPoint = { x: pred.hrAt.x, y: pred.hrAt.y, z: hz, t: pred.hrT, f: nf }; }
      }
    }
    M.play.chaser = best;
    if (best && bestPt) { best.role = 'chase'; best.tx = bestPt.x; best.ty = bestPt.y; best.catchAt = bestPt; }
    // cover roles
    const to = pred.land || pred.stop, side = (to.x - P.H.x) < 0 ? 'left' : 'right', deep = Math.hypot(to.x - P.H.x, to.y - P.H.y) > 520;
    const get = pos => D.find(f => f.pos === pos);
    const cover = (pos, base) => { const f = get(pos); if (!f || f === best || f.has) return false; const bp = P.base(base); f.role = 'cover'; f.coverBase = base; f.tx = bp.x + (base === 1 ? -6 : base === 3 ? 6 : 0); f.ty = bp.y + (base === 2 ? 6 : 0); return true; };
    for (const f of D) if (f !== best && !f.has) { f.role = 'idle'; f.coverBase = 0; f.tx = f.home.x; f.ty = f.home.y; }
    if (!cover('1B', 1)) cover('P', 1);
    if (side === 'left') { if (!cover('2B', 2)) cover('SS', 2); } else { if (!cover('SS', 2)) cover('2B', 2); }
    if (!cover('3B', 3)) cover('SS', 3);
    if (!cover('C', 4)) cover('P', 4);
    if (deep) {   // the cutoff man goes out halfway to the ball
      const cf = get(side === 'left' ? 'SS' : '2B');
      if (cf && cf !== best && cf.role !== 'cover') { cf.role = 'cutoff'; cf.tx = P.H.x + (to.x - P.H.x) * .55; cf.ty = P.H.y + (to.y - P.H.y) * .55; }
      else if (cf && cf.role === 'cover' && cf.coverBase === 2) { const o2 = get(side === 'left' ? '2B' : 'SS'); if (o2 && o2 !== best && o2.role !== 'chase') { o2.role = 'cutoff'; o2.tx = P.H.x + (to.x - P.H.x) * .55; o2.ty = P.H.y + (to.y - P.H.y) * .55; } }
      const p = get('P'); if (p && p !== best && p.role === 'idle') { p.role = 'backup'; p.tx = P.H.x + (side === 'left' ? -60 : 0); p.ty = P.H.y + (side === 'left' ? -150 : 30); }
    }
    // the nearest outfielder backs up the chaser
    if (best && ['LF', 'CF', 'RF'].includes(best.pos)) { const nb = D.filter(f => ['LF', 'CF', 'RF'].includes(f.pos) && f !== best).sort((a, b2) => Math.hypot(a.x - best.tx, a.y - best.ty) - Math.hypot(b2.x - best.tx, b2.y - best.ty))[0]; if (nb) { nb.role = 'backup'; nb.tx = best.tx + (best.tx - P.H.x) * .08 + (nb.x - best.tx) * .3; nb.ty = best.ty + (best.ty - P.H.y) * .08; } }
  },
  /** the fielder's base cover point */
  basePt(M, b) { const p = M.park.base(b); return { x: p.x, y: p.y }; },
  holder(M) { return M.fielders.find(f => f.has) || null; },
  /** give the ball to a fielder */
  give(M, f, how) {
    const b = M.ball;
    for (const o of M.fielders) o.has = false;
    f.has = true; b.mode = 'held'; b.holder = f; b.vx = b.vy = b.vz = 0; b.spin = 0; b.boost = 0; b.version++;
    f.state = f.state === 'dive' ? 'prone' : f.state === 'climb' || f.state === 'jump' ? f.state : 'hold';
    f.holdT = 0; f.decideT = f.human ? 0 : (how === 'ground' && ['LF', 'CF', 'RF'].includes(f.pos) ? .38 : how === 'ground' ? .07 : .2); f.throwT = 0; f.throwTo = 0;
    M.play.pred = null;
    BZ.bus.emit('fielded', { pos: f.pos, how });
  },
  /** a catch attempt (once per ball version per fielder) */
  tryCatch(M, f) {
    const b = M.ball, P = M.park;
    if (f.has || f.state === 'down' || f.state === 'prone' && !f.has) return false;
    const reach = BZ.catchReach(M, f) + (f.state === 'dive' ? 9 : 0), d = Math.hypot(b.x - f.x, b.y - f.y);
    let top = f.state === 'dive' ? 14 : 34 + f.z;
    if (f.state === 'climb') top = f.z + 34;
    if (f.pos === 'C' && b.mode !== 'batted') top = 40;
    if (d > reach || b.z > top || b.z < f.z - 6) return false;
    if (f.tried === b.version) return false;
    f.tried = b.version;
    const speed = Math.hypot(b.vx, b.vy, b.vz), human = !!f.human;
    let p = .992 + .004 * (f.player.glv - 5) - (speed > 600 ? clamp((speed - 600) / 600 * .06 + .03, .03, .08) : 0) - (f.state === 'dive' ? .04 : 0);
    if (!human) p -= ({ rookie: .02, pro: .008, allstar: .004, batzooka: .002 }[M.cpuLevel || 'pro'] || .008) / Math.max(.3, TUNE.cpuField);
    if (b.mode === 'thrown') p = .995;
    if (M.cheats && M.cheats.surehands && (human || M.attract)) p = 1;
    const T = M.teamOf(f.player); if (M.upgrades && M.upgradeTeam === T.side) p += .02 * (M.upgrades.gloves || 0);
    p = clamp(p, .5, .995);
    const wasFly = b.mode === 'batted' && !b.bounced, wall = f.state === 'climb', dive = f.state === 'dive';
    if (BZ.R() < p) {
      // fair or foul when a fielder first touches a pending ball
      if (b.mode === 'batted' && b.fair === 'pending' && !wasFly) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      if (b.mode === 'batted' && !wasFly && b.fair === 'foul') { this.foulBall(M, 'touched'); return true; }
      b.touched = true;
      this.give(M, f, wasFly ? 'fly' : 'ground');
      if (wasFly) {
        M.play.caughtFly = true;
        BZ.statFor(M, f.player).catches++;
        if (dive) BZ.statFor(M, f.player).dives++;
        if (wall) BZ.statFor(M, f.player).robbed++;
        BZ.bus.emit('catch', { fly: true, dive, wall, pos: f.pos, player: f.player, robbed: wall && M.play.robPoint });
        this.flyOut(M, f);
      } else if (dive) BZ.bus.emit('catch', { fly: false, dive: true, pos: f.pos, player: f.player });
      else if (b.mode !== 'thrown') BZ.bus.emit('catch', { fly: false, pos: f.pos });
      return true;
    }
    // an error: the ball pops loose
    const a = BZ.R() * TAU;
    b.vx = Math.cos(a) * 60; b.vy = Math.sin(a) * 60; b.vz = 80; b.z = Math.max(b.z, 4); b.touched = true;
    if (b.mode === 'batted' && b.fair === 'pending') b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
    b.mode = 'loose'; b.version++; b.bounced = Math.max(1, b.bounced);
    M.play.error = true; BZ.defense(M).errors++;
    BZ.bus.emit('drop', { pos: f.pos, player: f.player });
    BZ.bus.emit('error', { pos: f.pos });
    return false;
  },
  flyOut(M, f) {
    const bat = M.runners.find(r => r.isBatter);
    if (bat) { bat.state = 'out'; M.play.batterOut = true; }
    BZ.statFor(M, M.batter).AB++;
    BZ.rules.out(M, 'fly', M.batter);
    // runners must go back and touch before advancing; no one is forced any more
    for (const r of this.liveRunners(M)) { r.forced = false; if (r.p > r.start + .001) { r.mustTag = r.start; r.goal = r.start; } }
    if (M.outs >= 3) this.thirdOut(M, 'fly', bat);
  },
  foulBall(M, why) {
    M.play.done = true; M.play.deadReason = 'foul'; M.ball.mode = 'dead'; M.ball.fair = 'foul';
    M.play.foul = why || true;
  },
  thirdOut(M, how, runner) {
    // the third-out rule: no runs on a force out, or when the batter-runner is out before reaching first
    const batterBefore = runner && runner.isBatter && runner.base < 1;
    if (how === 'force' || how === 'fly' || batterBefore) { if (M.play.runs.length) { BZ.rules.unscore(M, M.play.runs.length); for (const r of M.runners) if (r.state === 'scored') r.state = 'cancel'; M.play.runs = []; } }
    M.play.done = true; M.play.deadReason = 'third';
  },
  /** a runner is out */
  runnerOut(M, r, how, f) {
    r.state = 'out';
    if (r.isBatter && r.base < 1) { BZ.statFor(M, M.batter).AB++; M.play.batterOut = true; }
    BZ.rules.out(M, how, r.player);
    BZ.bus.emit('runnerOut', { how, runner: r.player, pos: f && f.pos, base: Math.round(r.goal) });
    if (M.play.outs.length >= 2 && !M.play.dpSaid) { M.play.dpSaid = true; BZ.bus.emit('doublePlay', { triple: M.play.outs.length >= 3 }); }
    // a force out of a trailing runner takes the force off the runners ahead? (no: forces hold while the batter-runner is alive)
    if (r.isBatter) for (const o of this.liveRunners(M)) o.forced = false;
    if (M.outs >= 3) this.thirdOut(M, how, r);
  },

  /* ---------------- the step ---------------- */
  update(M, dt) {
    const pl = M.play, b = M.ball, P = M.park;
    if (!pl || pl.done) return;
    pl.t += dt;
    if (b.mode === 'batted' || b.mode === 'thrown' || b.mode === 'loose') {
      if (pl.version !== b.version) this.replan(M);
      const carried = BZ.hazard && BZ.hazard.preBall && BZ.hazard.preBall(M, b, dt);   // a gull carrying the ball, say
      const ev = carried ? [] : BZ.ballStep(b, P, dt, { trail: true });
      if (BZ.hazard && BZ.hazard.onBall) BZ.hazard.onBall(M, b, dt, ev);
      this.ballEvents(M, ev);
      if (pl.done) return;
    }
    this.fielders(M, dt);
    if (pl.done) return;
    BZ.runners.update(M, dt);
    if (pl.done) return;
    this.checkOuts(M);
    if (pl.done) return;
    this.checkOver(M, dt);
  },
  ballEvents(M, ev) {
    const b = M.ball, P = M.park, pl = M.play;
    if (!ev.length) return;
    if (ev.includes('pole') || ev.includes('hr')) { if (b.mode === 'batted' && !b.touched && b.fair !== 'foul') { this.homeRun(M, ev.includes('pole')); return; } }
    if (ev.includes('grd') && b.mode === 'batted' && b.fair !== 'foul') { this.groundRule(M); return; }
    if (ev.includes('dead')) {
      if (b.mode === 'batted' && (b.fair === 'pending' || b.fair === 'foul')) { this.foulBall(M, 'out of play'); return; }
      // a fair ball or a throw out of play: two bases from where the runners started (simplified: the ball is dead)
      pl.done = true; pl.deadReason = 'outOfPlay'; b.mode = 'dead';
      for (const r of this.liveRunners(M)) { r.goal = Math.min(4, Math.max(Math.ceil(r.p - .001), r.start + (r.isBatter ? 2 : 1))); r.p = r.goal; r.base = r.goal; if (r.goal >= 4) this.scoreRunner(M, r); else r.state = 'base'; }
      BZ.bus.emit('deadBall', {});
      return;
    }
    if (b.mode === 'thrown' && (ev.includes('land') || ev.includes('bounce') || ev.includes('stop') || ev.includes('wall') || ev.includes('fence'))) { b.mode = 'loose'; b.version++; b.fair = 'fair'; }
    if (ev.includes('land') && b.mode === 'batted') {
      if (b.fair === 'pending' && BZ.pastBags(P, b.x, b.y)) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      if (b.fair === 'foul' && !b.touched) { this.foulBall(M, 'landed foul'); return; }
      BZ.bus.emit('land', { x: b.x, y: b.y, fair: b.fair });
      // a fly that drops: forced runners must go now
      for (const r of this.liveRunners(M)) r.landSeen = true;
    }
    if (ev.includes('fence')) { BZ.bus.emit('fenceHit', { x: b.x, y: b.y }); if (b.fair === 'pending') b.fair = 'fair'; }
    if (ev.includes('wall') && b.mode === 'batted' && b.fair === 'pending') { this.foulBall(M, 'wall'); return; }
    if (b.mode === 'batted' && b.fair === 'pending' && b.bounced) {
      if (BZ.pastBags(P, b.x, b.y)) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      else if (ev.includes('stop')) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      if (b.fair === 'foul') { this.foulBall(M, 'rolled foul'); return; }
    }
    if (ev.includes('bounce') || ev.includes('fence') || ev.includes('wall')) b.version++;
    if (ev.includes('stop')) b.version++;
  },
  homeRun(M, pole) {
    const b = M.ball, P = M.park, pl = M.play;
    const dist = BZ.carry(b, P).dist;
    pl.done = true; pl.deadReason = 'hr'; pl.hr = { dist: BZ.feet(dist), pole, batzooka: !!(pl.contact && pl.contact.zooka), x: b.x, y: b.y, z: b.z };
    b.mode = 'dead';
    // everyone scores
    const rbiTo = M.batter, list = this.liveRunners(M).sort((a, c) => c.p - a.p);
    for (const r of list) { r.goal = 4; r.trot = true; this.scoreRunner(M, r, rbiTo); }
    const s = BZ.statFor(M, M.batter); s.AB++; s.H++; s.HR++; s.longest = Math.max(s.longest, BZ.feet(dist));
    BZ.offense(M).hits++;
    BZ.bus.emit('homer', { batter: M.batter, dist: BZ.feet(dist), pole, batzooka: pl.hr.batzooka, x: b.x, y: b.y, runs: list.length });
  },
  groundRule(M) {
    const pl = M.play; pl.done = true; pl.deadReason = 'grd'; M.ball.mode = 'dead';
    for (const r of this.liveRunners(M)) { const to = Math.min(4, r.start + 2); r.goal = to; r.p = to; r.base = to; if (to >= 4) this.scoreRunner(M, r, M.batter); else r.state = 'base'; }
    const s = BZ.statFor(M, M.batter); s.AB++; s.H++; s['2B']++; BZ.offense(M).hits++;
    pl.hitCredited = 2;
    BZ.bus.emit('groundRuleDouble', { batter: M.batter });
  },
  scoreRunner(M, r, rbiTo) {
    if (r.state === 'scored') return;
    r.state = 'scored'; r.p = 4;
    BZ.rules.score(M, r.player, rbiTo === undefined ? (M.play.error ? null : M.batter) : rbiTo);
  },

  /* ---------------- fielders ---------------- */
  fielders(M, dt) {
    const b = M.ball, P = M.park, pl = M.play;
    for (const f of M.fielders) {
      f.stT += dt;
      if (M.cheats.freezeAI && !f.human) { f.vx = f.vy = 0; if (!f.has && (b.mode === 'batted' || b.mode === 'thrown' || b.mode === 'loose')) this.tryCatch(M, f); if (pl.done) return; continue; }
      if (f.react > 0) { f.react -= dt; f.vx = f.vy = 0; continue; }
      // vertical: jumps and climbs
      if (f.state === 'jump') { f.vz -= 700 * dt; f.z += f.vz * dt; if (f.z <= 0) { f.z = 0; f.vz = 0; f.state = f.has ? 'hold' : 'run'; } }
      if (f.state === 'climb') { if (f.stT < .45) f.z = Math.min(f.climbH, f.z + 140 * dt); else { f.z = Math.max(0, f.z - 120 * dt); if (f.z <= 0) f.state = f.has ? 'hold' : 'run'; } }
      if (f.state === 'dive') { const sp = 22 / .35; f.x += Math.cos(f.facing) * sp * dt; f.y += Math.sin(f.facing) * sp * dt; if (f.stT > .35) { f.state = 'prone'; f.stT = 0; } }
      if (f.state === 'prone') { if (f.stT > .6) { f.state = f.has ? 'hold' : 'run'; f.stT = 0; } }
      if (f.state === 'down') { if (f.stT > 1.2) { f.state = 'run'; } continue; }
      // catching
      if (!f.has && (b.mode === 'batted' || b.mode === 'thrown' || b.mode === 'loose')) {
        if (this.tryCatch(M, f) && pl.done) return;
        if (pl.done) return;
      }
      if (f.state === 'dive' || f.state === 'prone' || f.state === 'climb') { this.clampToField(M, f); continue; }
      if (f.has) { this.holderStep(M, f, dt); this.clampToField(M, f); if (f.has) { b.x = f.x; b.y = f.y; b.z = 18 + f.z; } continue; }
      // moving: humans by the stick (and the assist), the CPU to its target
      let tx = f.tx, ty = f.ty;
      if (f.role === 'chase' && (b.mode === 'loose' || (b.mode === 'batted' && b.bounced))) {
        // a ball on the ground: coming this way, step into its path (its closest approach); going away, run it down
        const vs2 = b.vx * b.vx + b.vy * b.vy, rx = f.x - b.x, ry = f.y - b.y, ts = vs2 > 1 ? (rx * b.vx + ry * b.vy) / vs2 : 0;
        if (ts > .05) { tx = b.x + b.vx * ts; ty = b.y + b.vy * ts; }
        else { const lead = .2; tx = b.x + b.vx * lead; ty = b.y + b.vy * lead; }
      }
      if (f.role === 'chase' && pl.robPoint && pl.robPoint.f === f) { tx = pl.robPoint.x; ty = pl.robPoint.y; }
      if (f.human) { const done = BZ.ctl.fielderMove(M, f, dt, tx, ty); if (done) { this.clampToField(M, f); continue; } }
      if (f.role === 'cover' || f.role === 'chase' || f.role === 'cutoff' || f.role === 'backup' || f.role === 'idle') {
        f.turbo = !f.human && f.role === 'chase' && Math.hypot(tx - f.x, ty - f.y) > 120 && BZ.defense(M).turbo > 20;
        if (f.turbo) BZ.defense(M).turbo = Math.max(0, BZ.defense(M).turbo - 40 * TUNE.turboDrain * dt);
        const arrived = BZ.moveTo(f, tx, ty, BZ.fielderSpeed(M, f), dt);
        f.state = arrived ? 'set' : 'run';
        if (arrived && f.role === 'chase' && b.mode !== 'held') f.facing = Math.atan2(b.y - f.y, b.x - f.x);
      }
      // the CPU's athletic moves: the wall climb, the dive, the jump
      if (!f.human && f.role === 'chase') this.cpuMoves(M, f);
      this.clampToField(M, f);
    }
  },
  cpuMoves(M, f) {
    const b = M.ball, P = M.park, pl = M.play;
    if (b.mode !== 'batted' || f.state !== 'run' && f.state !== 'set') return;
    // the climb: near the wall, a ball coming down over it
    if (pl.robPoint && pl.robPoint.f === f && !f.climbed) {
      const d = Math.hypot(f.x - pl.robPoint.x, f.y - pl.robPoint.y), tleft = pl.robPoint.t - pl.t;
      if (d < 20 && tleft < .5) this.climb(M, f);
      return;
    }
    // the dive: only when the ball will pass by out of reach (its closest approach), but within a lunge
    const vs = Math.hypot(b.vx, b.vy), reach = BZ.catchReach(M, f);
    if (b.z < 18 && !f.dives && vs > 60) {
      const rx = b.x - f.x, ry = b.y - f.y, ts = -(rx * b.vx + ry * b.vy) / (vs * vs);
      if (ts > 0 && ts < .35) { const cx = rx + b.vx * ts, cy = ry + b.vy * ts, dmin = Math.hypot(cx, cy); if (dmin > reach * .95 && dmin < reach + 20) this.dive(M, f, Math.atan2(cy, cx)); }
    }
    // the jump: a line drive going over the glove (flat, not a fly coming down)
    if (b.z > 30 && b.z < 64 && !f.jumped && f.z === 0 && Math.abs(b.vz) < vs * .45) {
      const rx = b.x - f.x, ry = b.y - f.y, ts = -(rx * b.vx + ry * b.vy) / Math.max(1, vs * vs);
      if (ts > 0 && ts < .25 && Math.hypot(rx + b.vx * ts, ry + b.vy * ts) < reach && b.z + b.vz * ts > 34) this.jump(M, f);
    }
  },
  dive(M, f, dir) { if (f.state === 'dive' || f.state === 'prone') return; f.state = 'dive'; f.stT = 0; f.facing = dir; f.dives++; BZ.bus.emit('dive', { pos: f.pos }); },
  jump(M, f) { if (f.z > 0) return; f.state = 'jump'; f.vz = 260 * M.park.jumpMul; f.jumped = true; BZ.bus.emit('jump', { pos: f.pos }); },
  climb(M, f) {
    const P = M.park, th = BZ.theta(f.x - P.H.x, f.y - P.H.y), Hf = P.Hf(th);
    f.state = 'climb'; f.stT = 0; f.climbed = true; f.climbH = Hf + (BZ.defense(M).id === 'haunts' ? 40 : 0) + (P.jumpMul > 1.5 ? 30 : 0);
    f.facing = Math.atan2(-(f.y - P.H.y), -(f.x - P.H.x)) + Math.PI;
    BZ.bus.emit('climb', { pos: f.pos });
  },
  clampToField(M, f) {
    const P = M.park, dx = f.x - P.H.x, dy = f.y - P.H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy);
    if (dy < 0 && Math.abs(th) <= P.span) { const R = P.R(th) - 5; if (r > R && !(M.cheats && M.cheats.noclip)) { f.x = P.H.x + dx / r * R; f.y = P.H.y + dy / r * R; } }
    const oL = BZ.outL(dx, dy), oR = BZ.outR(dx, dy);
    if (oL > 66) { f.x += Math.SQRT1_2 * (oL - 66); f.y -= Math.SQRT1_2 * (oL - 66); }
    if (oR > 66) { f.x -= Math.SQRT1_2 * (oR - 66); f.y -= Math.SQRT1_2 * (oR - 66); }
    const dx2 = f.x - P.H.x, dy2 = f.y - P.H.y, r2 = Math.hypot(dx2, dy2);
    if (BZ.outL(dx2, dy2) > 0 && BZ.outR(dx2, dy2) > 0 && r2 > 104) { f.x = P.H.x + dx2 / r2 * 104; f.y = P.H.y + dy2 / r2 * 104; }
  },
  /** the fielder with the ball: the CPU decides; a human throws with the base buttons */
  holderStep(M, f, dt) {
    const pl = M.play;
    f.holdT += dt;
    if (f.throwT > 0) {   // winding up a throw
      f.throwT -= dt;
      if (f.throwT <= 0) this.release(M, f);
      return;
    }
    if (f.human && !(BZ.game.settings.fielding === 'auto' && !f.humanOverride)) { BZ.ctl.holder(M, f, dt); return; }
    f.decideT -= dt; if (f.decideT > 0) return;
    f.decideT = .15;
    const act = BZ.ai.holderDecision(M, f);
    if (!act) return;
    if (act.kind === 'throw') this.startThrow(M, f, act.base, act.power || .8, act.laser, act.to);
    else if (act.kind === 'run') { f.runTo = act; BZ.moveTo(f, act.x, act.y, BZ.fielderSpeed(M, f), dt * 1.5); f.state = 'run'; }
    void pl;
  },
  /** start a throw to a base (1..4) or to a fielder (o.to) */
  startThrow(M, f, base, power = .8, laser = false, to = null) {
    if (f.throwT > 0 || !f.has) return;
    f.throwBase = base; f.throwPower = power; f.throwLaser = laser; f.throwTarget = to;
    f.throwT = M.fast ? .05 : ['LF', 'CF', 'RF'].includes(f.pos) ? .24 : .17; f.state = 'throw'; f.stT = 0;
    const tgt = to || this.basePt(M, base); f.facing = Math.atan2(tgt.y - f.y, tgt.x - f.x);
    if (laser) { const T = BZ.defense(M); T.meter = Math.max(0, T.meter - 50); BZ.bus.emit('super', { kind: 'laser', pos: f.pos }); }
  },
  release(M, f) {
    const b = M.ball, P = M.park, base = f.throwBase, power = f.throwPower;
    let to = f.throwTarget ? { x: f.throwTarget.x, y: f.throwTarget.y } : this.basePt(M, base);
    const rec = f.throwTarget || this.receiverFor(M, base, f);
    // a throw to a base goes to the bag: the receiver gets there (a throw to a fielder leads him)
    if (f.throwTarget && rec && (rec.vx || rec.vy)) { const tt = Math.hypot(to.x - f.x, to.y - f.y) / (f.throwLaser ? 1400 : BZ.throwSpeed(M, f, power)); to = { x: to.x + rec.vx * tt, y: to.y + rec.vy * tt }; }
    let wild = false;
    if (!f.throwLaser && power > .85) { const pw = (power - .85) * .8 + (f.player.arm < 5 ? .05 : 0); if (BZ.R() < pw) wild = true; }
    if (wild) { const a = BZ.R() * TAU, d = 30 + BZ.R() * 30; to = { x: to.x + Math.cos(a) * d, y: to.y + Math.sin(a) * d }; M.play.wildThrow = true; BZ.defense(M).errors++; BZ.bus.emit('throwError', { pos: f.pos }); M.play.error = true; }
    const sp = BZ.throwPace(M, f, Math.hypot(to.x - f.x, to.y - f.y), power, f.throwLaser);
    f.has = false; f.state = 'set'; f.stT = 0;
    BZ.throwBall(b, P, { x: f.x, y: f.y, z: 24 }, { x: to.x, y: to.y, z: 22 }, sp);
    b.thrownBy = f; b.throwBase = base; b.laser = !!f.throwLaser; f.tried = b.version;
    M.play.lastThrow = { base, from: f.pos, at: M.play.t, eta: M.play.t + Math.hypot(to.x - f.x, to.y - f.y) / sp };
    if (rec) { rec.role = 'cover'; rec.coverBase = base || 0; if (!f.throwTarget) { const bp = this.basePt(M, base); rec.tx = bp.x; rec.ty = bp.y; } }
    BZ.bus.emit('throw', { from: f.pos, base, laser: !!f.throwLaser, wild });
  },
  /** the fielder who takes a throw at a base: whoever covers it, else the nearest */
  receiverFor(M, base, not) {
    const bp = this.basePt(M, base);
    let best = M.fielders.find(f => f !== not && f.role === 'cover' && f.coverBase === base);
    if (!best) { let bd = 1e9; for (const f of M.fielders) { if (f === not) continue; const d = Math.hypot(f.x - bp.x, f.y - bp.y); if (d < bd) { bd = d; best = f; } } }
    return best;
  },

  /* ---------------- outs on the bases ---------------- */
  checkOuts(M) {
    const h = this.holder(M), P = M.park, pl = M.play;
    if (!h) return;
    for (const r of this.liveRunners(M)) {
      if (r.state === 'out' || r.state === 'scored' || r.delay > 0) continue;
      // a force: the fielder with the ball on the base before the forced runner gets there
      if (r.forced) {
        const fb = r.start + 1, bp = P.base(fb);
        if (r.p < fb - .001 && Math.hypot(h.x - bp.x, h.y - bp.y) < 8) { this.runnerOut(M, r, 'force', h); if (pl.done) return; continue; }
      }
      // doubled off: back to the base he must touch before the throw gets there
      if (r.mustTag && r.p > r.mustTag + .001) {
        const bp = P.base(r.mustTag);
        if (Math.hypot(h.x - bp.x, h.y - bp.y) < 8 && M.ball.mode === 'held') { this.runnerOut(M, r, 'doubled', h); if (pl.done) return; continue; }
      }
      // a tag: a runner off his base within reach of the ball
      const onBase = Math.abs(r.p - Math.round(r.p)) < .02 && !(r.isBatter && r.p < .5);
      const rp = BZ.runnerPos(M, r.p);
      if (!onBase && Math.hypot(h.x - rp.x, h.y - rp.y) < 10) {
        // the bowl-over at home: a runner on turbo against the catcher
        if (r.p > 3.85 && h.pos === 'C' && r.turbo && !r.bowled) {
          r.bowled = true; pl.bowl = true;
          const rr = r.player.pow + 1 + Math.floor(BZ.R() * 6), cr = h.player.pow + 1 + Math.floor(BZ.R() * 6) + 1;
          BZ.bus.emit('bowlOver', { runner: r.player, catcher: h.player, won: rr > cr });
          if (rr > cr) { h.state = 'down'; h.stT = 0; h.has = false; const b = M.ball; b.mode = 'loose'; b.x = h.x; b.y = h.y; b.z = 10; b.vx = (BZ.R() - .5) * 120; b.vy = 60 + BZ.R() * 40; b.vz = 90; b.version++; M.play.error = true; r.p = 4; this.scoreRunner(M, r); continue; }
          this.runnerOut(M, r, 'tag', h); if (pl.done) return; continue;
        }
        this.runnerOut(M, r, 'tag', h); h.tagT = .3; BZ.bus.emit('tag', { pos: h.pos }); if (pl.done) return;
      }
    }
  },
  /** is the play over? (the ball held in the infield with no runner moving for 0.6 s, or held long with nothing doing) */
  checkOver(M, dt) {
    const pl = M.play, b = M.ball, P = M.park;
    if (pl.done) return;
    const live = this.liveRunners(M);
    const moving = live.some(r => r.state === 'run' || Math.abs(r.p - Math.round(r.p)) > .02 || r.delay > 0);
    const h = this.holder(M);
    if (b.mode === 'held' && h && h.throwT <= 0) {
      const inf = Math.hypot(h.x - P.H.x, h.y - P.H.y) < 470;
      if (!moving) pl.settleT += dt; else pl.settleT = 0;
      if ((inf && pl.settleT >= .6) || pl.settleT >= 2.2) { this.finish(M); return; }
    } else pl.settleT = 0;
    if (pl.t > 25) {   // the safety net: everyone to the nearest base
      for (const r of live) { const nb = clamp(Math.round(r.p), r.isBatter ? 1 : r.base, 4); r.p = nb; r.base = nb; r.goal = nb; if (nb >= 4) this.scoreRunner(M, r); else r.state = 'base'; }
      this.finish(M, 'timeout');
    }
  },
  finish(M, why) { M.play.done = true; M.play.deadReason = M.play.deadReason || why || 'settled'; }
};

/* =============================================================================
 * baserunners
 * ========================================================================== */
BZ.runners = {
  update(M, dt) {
    const pl = M.play, P = M.park, O = BZ.offense(M);
    if (O.afterburn > 0) O.afterburn -= dt;
    const live = BZ.play.liveRunners(M).sort((a, b) => b.p - a.p);
    for (let i = 0; i < live.length; i++) {
      const r = live[i];
      if (r.delay > 0) { r.delay -= dt; continue; }
      r.orderT = Math.max(0, r.orderT - dt);
      // decide (the CPU, or the auto baserunning for a human side; orders win for a moment)
      r.decideT = (r.decideT || 0) - dt;
      if (r.decideT <= 0 && r.orderT <= 0) { r.decideT = .1; BZ.ai.runnerDecide(M, r, live); }
      // never pass the runner ahead
      const ahead = live[i - 1];
      if (ahead && ahead.state !== 'scored') { const cap = ahead.goal - 1; if (r.goal > cap) r.goal = Math.max(r.isBatter ? 1 : r.start, cap); }
      if (r.forced) r.goal = Math.max(r.goal, r.start + 1);
      // move along the basepaths
      const dir = Math.sign(r.goal - r.p);
      r.runT = dir !== 0 ? (r.runT || 0) + dt : 0;                     // from a standstill a runner needs a moment to reach full speed
      const sp = BZ.runSpeed(M, r) / 300 * (dir > 0 ? Math.min(1, r.isBatter && r.p < 1 ? .4 + r.runT * .66 : .55 + r.runT) : .85);   // out of the box a batter needs most of a second to reach full speed
      if (dir !== 0) {
        r.state = 'run';
        r.turbo = (r.turboHeld || (!r.human && BZ.ai.runnerTurbo(M, r))) && O.turbo > 0;
        if (r.turbo) O.turbo = Math.max(0, O.turbo - 40 * TUNE.turboDrain * dt);
        const before = r.p;
        r.p += dir * sp * dt;
        if ((dir > 0 && r.p >= r.goal) || (dir < 0 && r.p <= r.goal)) r.p = r.goal;
        // touching a base
        const fb = Math.floor(before + 1e-6), fa = Math.floor(r.p + 1e-6);
        if (dir > 0 && fa > fb) this.touch(M, r, fa);
        if (dir < 0 && Math.ceil(r.p - 1e-6) < Math.ceil(before - 1e-6)) this.touch(M, r, Math.ceil(r.p - 1e-6));
        if (r.state === 'scored' || r.state === 'out') continue;
        if (r.tagged && M.play.caughtFly && dir > 0 && !r.tagSaid) { r.tagSaid = true; BZ.bus.emit('tagUp', { runner: r.player }); }
        // the slide: near a base on a close play
        const nb = dir > 0 ? Math.ceil(r.p - 1e-6) : Math.floor(r.p + 1e-6), dist = Math.abs(nb - r.p) * 300;
        if (!r.slide && dist < 28 && dist > 2 && Math.round(r.goal) === nb && BZ.play.holder(M) && nb < 4 + 1) { const h = BZ.play.holder(M), bp = P.base(nb); if (Math.hypot(h.x - bp.x, h.y - bp.y) < 80) { r.slide = .45; BZ.bus.emit('slide', { runner: r.player, headfirst: !!r.headfirst }); } }
      } else if (Math.abs(r.p - Math.round(r.p)) < .001) { r.state = r.p >= 4 ? 'scored' : 'base'; r.turbo = false; }
      else { r.state = 'lead'; r.turbo = false; }
      if (r.slide > 0) r.slide -= dt;
    }
  },
  touch(M, r, base) {
    if (base > r.base) r.base = base;
    if (r.mustTag && base === r.mustTag) { r.mustTag = 0; r.tagged = true; BZ.bus.emit('tagUp', { runner: r.player }); }
    if (base >= 4 && r.p >= 4) {
      // a run, unless a fly is still in the air and the runner left early (he goes back)
      const b = M.ball;
      if (b.mode === 'batted' && !b.bounced && !b.touched && M.outs < 2 && !r.isBatter) { r.p = 3.98; r.goal = 3; return; }
      BZ.play.scoreRunner(M, r);
      return;
    }
    if (base === 1 && r.isBatter) BZ.bus.emit('safeFirst', { runner: r.player });
    if (r.steal && base === r.start + 1) { r.steal = false; r.stoleBase = true; }
  },
  /** put the runners back on the bases once the play is over */
  settle(M) {
    const B = [null, null, null], P = M.play;
    for (const r of M.runners) {
      if (r.state === 'out' || r.state === 'scored' || r.state === 'cancel') continue;
      let b = clamp(Math.round(r.p), 0, 3);
      if (r.isBatter && b < 1) b = 1;
      if (b >= 1 && !B[b - 1]) B[b - 1] = r.player;
      else { for (let k = b; k <= 3; k++) if (!B[k - 1]) { B[k - 1] = r.player; break; } }
      if (r.stoleBase) { BZ.statFor(M, r.player).SB++; BZ.bus.emit('steal', { ok: true, runner: r.player }); }
    }
    M.bases = B;
    void P;
  }
};
