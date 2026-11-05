// Fielding: nine fielders in their home spots, one chaser at a time (the one nearest where the ball will be), catches
// in the air, pickups on the ground, and the throw that decides a play. Pure: the scene draws the fielders and the ball.
//
// A play: the ball is struck (time 0). A fielder who reaches it in time catches it (a fly, low enough) or picks it up (a
// grounder). The throw goes to a base; it is out if it gets there before the runner. Runners move the way the hit or the
// play sends them. The human fielder can steer the chaser, dive (a wider catch, at the price of a stumble) and choose the
// base for a throw by pressing a direction in the moment after the pick-up.
BZ.FIELD = {
  P:  { x: 768, y: 969 }, C: { x: 768, y: 1150 },
  '1B': { x: 915, y: 955 }, '2B': { x: 868, y: 858 }, SS: { x: 668, y: 858 }, '3B': { x: 621, y: 955 },
  LF: { x: 380, y: 585 }, CF: { x: 768, y: 430 }, RF: { x: 1156, y: 585 }
};
BZ.ROLES = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
BZ.CATCH_Z = 14;   // a fly is caught as it comes down through this height (U, about 6 ft)
BZ.makeFielders = () => BZ.ROLES.map(role => ({ role, x: BZ.FIELD[role].x, y: BZ.FIELD[role].y, hx: BZ.FIELD[role].x, hy: BZ.FIELD[role].y,
  human: false, dive: 0, face: 0 }));

// A runner's time to cover one base (the basepath is 90 ft).
BZ.runTime = (u = BZ.BASE_U) => u / (BZ.TUNE.runSpeed * BZ.FT);

// The move toward a point at a speed (U/s), and the step taken.
const stepToward = (f, tx, ty, speed, dt) => {
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const s = Math.min(d, speed * dt);
  f.x += dx / d * s; f.y += dy / d * s;
  f.face = Math.atan2(dy, dx);
};

// The defense for one play: the state machine from the strike to the base. Call step(dt, human) every fixed step.
// human: { team: bool (the defense is human), move: [x, y] (the stick, screen directions), dive: bool, pick: 'first'|'second'|'third'|null }.
BZ.Play = class Play {
  constructor(S, ball, fielders) {
    this.S = S; this.ball = ball; this.F = fielders;
    this.phase = 'flight';          // 'flight' | 'fielded' | 'throw' | 'over'
    this.chaser = null; this.holder = null; this.target = null;
    this.pickT = 0; this.throwT = 0; this.throwStart = null; this.throwEnd = null;
    this.diveT = 0; this.events = []; this.result = null;
    this.depth = 0;  // distance from home of the catch or the pick-up, in feet
  }

  // The fielder whose job this ball is: the nearest one to where it will be (its landing point while it's in the air).
  pickChaser() {
    const b = this.ball;
    // a fly is run to where it will be at the height a glove catches it, not to the ground under it
    const L = b.phase === 'air' && !b.landed ? BZ.predictLanding(b, BZ.CATCH_Z) : { x: b.x + b.vx * .3, y: b.y + b.vy * .3 };
    let best = null, bd = Infinity;
    for (const f of this.F) {
      if (f.role === 'P' || f.role === 'C') continue;
      const d = Math.hypot(f.x - L.x, f.y - L.y) - (this.chaser === f ? 30 : 0);   // a little hysteresis, so it doesn't flicker
      if (d < bd) { bd = d; best = f; }
    }
    this.chaser = best; this.L = L;
    return best;
  }

  step(dt, human = {}) {
    if (this.phase === 'over') return this.events;
    if (this.phase === 'flight') this.flight(dt, human);
    else if (this.phase === 'fielded') this.fielded(dt, human);
    else if (this.phase === 'throw') this.throwing(dt);
    return this.events;
  }

  flight(dt, human) {
    const b = this.ball;
    this.t = (this.t || 0) + dt;
    const chaser = this.pickChaser();
    // the fielders take a moment to read the ball off the bat; a human's chaser moves at once
    const ready = this.t >= BZ.TUNE.reactTime;
    for (const f of this.F) {
      if (f.role === 'P' || f.role === 'C') continue;
      if (!ready && !(f === chaser && f.human)) { if (f.dive > 0) f.dive -= dt; continue; }
      if (f === chaser && f.human) {
        // a human fielder: auto-runs to the spot, and the stick steers from there
        const sp = BZ.TUNE.fielderSpeed * (f.dive > 0 ? 1.35 : 1);
        const mx = human.move ? human.move[0] : 0, my = human.move ? human.move[1] : 0;
        f.x += mx * sp * dt * .9; f.y += my * sp * dt * .9;
        stepToward(f, this.L.x, this.L.y, sp * .55, dt);
      } else if (f === chaser) {
        stepToward(f, this.L.x, this.L.y, BZ.TUNE.fielderSpeed * (f.dive > 0 ? 1.35 : 1), dt);
      } else {
        const k = .22;
        stepToward(f, f.hx + (this.L.x - f.hx) * k, f.hy + (this.L.y - f.hy) * k, BZ.TUNE.fielderSpeed * .8, dt);
      }
      if (f.dive > 0) f.dive -= dt;
    }
    if (human.dive && chaser && chaser.human && chaser.dive <= 0) chaser.dive = .45;
    BZ.stepBall(b, dt);

    if (b.landed && !b.fair && !b.caught) {
      // a foul ball: no play, the count takes it
      this.end({ kind: 'foul' });
      return;
    }
    if (!b.landed && b.z <= BZ.CATCH_Z + 6 && chaser) {
      // a fly ball low enough to catch, under a fielder's glove
      const reach = BZ.TUNE.catchReach * BZ.FT * 2.2 * (chaser.dive > 0 ? 1.8 : 1);
      if (Math.hypot(chaser.x - b.x, chaser.y - b.y) <= reach) {
        b.caught = true;
        this.depth = BZ.ft(Math.hypot(b.x - BZ.HX, b.y - BZ.HY));
        this.holder = chaser;
        this.events.push({ type: 'caught', at: { x: b.x, y: b.y }, depth: this.depth, fielder: chaser.role });
        this.end({ kind: 'caught', deep: this.depth >= 250 });
        return;
      }
    }
    if (b.landed && b.z <= 1 && chaser) {
      // a grounder that the chaser reaches while it's on the ground: picked up
      const reach = BZ.TUNE.catchReach * BZ.FT * (chaser.dive > 0 ? 1.8 : 1) + 4;
      if (Math.hypot(chaser.x - b.x, chaser.y - b.y) <= reach) {
        this.holder = chaser; this.phase = 'fielded'; this.pickT = b.t;
        this.depth = BZ.ft(Math.hypot(b.x - BZ.HX, b.y - BZ.HY));
        b.vx = 0; b.vy = 0; b.vz = 0; b.phase = 'dead'; b.stopped = true;
        this.events.push({ type: 'fielded', fielder: chaser.role, at: { x: chaser.x, y: chaser.y } });
        return;
      }
    }
    if (b.stopped && !b.caught && this.phase === 'flight') {
      // nobody got it: the ball is a hit, decided by where it stopped
      this.end({ kind: 'hit', type: BZ.ballResult(b) });
    }
  }

  // The fielder holds the ball for a moment: the human can pick a base; otherwise the CPU chooses.
  fielded(dt, human) {
    this.holderT = (this.holderT || 0) + dt;
    const pick = human.pick && this.holder && this.holder.human ? human.pick : null;
    if (pick !== null || this.holderT > .55 || (this.holder && !this.holder.human)) {
      this.target = this.chooseTarget(pick);
      this.phase = 'throw';
      const base = BZ.bases()[this.target];
      const dist = Math.hypot(base.x - this.holder.x, base.y - this.holder.y);
      this.throwStart = this.pickT + this.holderT;
      this.throwEnd = this.throwStart + .18 + dist / BZ.TUNE.throwSpeed;
      this.events.push({ type: 'throw', target: this.target, from: this.holder.role });
    }
  }

  // Throws go where a runner is forced, or to first. A human's pick is honoured only where it is a real force.
  chooseTarget(pick) {
    const b = this.S.bases;
    const want = { first: 0, second: 1, third: 2 }[pick];
    if (want === 1 && b[0]) return 1;
    if (want === 2 && b[0] && b[1]) return 2;
    if (want === 0) return 0;
    if (b[0] && !b[1]) return 1;
    return 0;
  }

  throwing(dt) {
    this.throwT = (this.throwT || 0) + dt;
    if (this.throwT < this.throwEnd - this.throwStart) return;
    this.end({ kind: 'throw', target: this.target });
  }

  // The play is over: the rules decide the outs, the runs and the next base state, in a fixed order.
  end(res) {
    this.phase = 'over';
    const S = this.S;
    let out = null;
    if (res.kind === 'foul') out = { kind: 'foul' };
    else if (res.kind === 'caught') out = Object.assign({ kind: 'caught' }, BZ.caughtFly(S, res.deep));
    else if (res.kind === 'hit') { BZ.hit(S, res.type); out = { kind: 'hit', type: res.type }; }
    else if (res.kind === 'throw') {
      // The throw's arrival against the runner's: all times are from the strike. A runner forced toward the throw's base
      // is out if the ball gets there first; the batter is out at first on the same test.
      const tt = this.throwEnd - this.pickT;
      const arrive = BZ.runTime();
      const forcedRunner = res.target > 0 && !!S.bases[res.target - 1];
      const batterOut = res.target === 0 && tt < arrive;
      const runnerOut = forcedRunner && tt < arrive;
      const r = BZ.groundPlay(S, res.target, { batterOut, runnerOut });
      out = { kind: 'ground', target: res.target, batterOut, runnerOut, tt, r };
    }
    this.result = out;
    this.events.push({ type: 'resolved', out });
  }
};
