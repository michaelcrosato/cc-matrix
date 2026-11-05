// ---- ratings: the show's heartbeat, shared by the team: a multiplier, Prime Time, and the producers' stunts ----
class Ratings {
  constructor(R = 15) { this.R = R; this.prime = 0; this.primeCD = 0; this.since = 99; this.lowT = 0; this.stuntDone = false; this.primeCount = 0; this.nearT = 0; this.nearN = 0; }
  get X() { if (this.prime > 0) return 5; const R = this.R; return R < 20 ? 1 : R < 40 ? 2 : R < 60 ? 3 : R < 80 ? 4 : 5; }
  /** a gain (× the ratingsGain slider): prime time starts at 100 */
  add(v, world) {
    if (!(v > 0)) return 0;
    const g = v * MT.T.ratingsGain; if (g <= 0) return 0;
    this.R = Math.min(100, this.R + g); this.since = 0;
    if (this.R >= 100 && this.prime <= 0 && this.primeCD <= 0 && world) world.startPrime();
    return g;
  }
  lose(v) { this.R = Math.max(0, this.R - v); }
  /** each step during play: decay after 2.5 s without a gain; prime time runs down; a stall brings on a stunt */
  step(dt, world, waves) {
    this.since += dt; this.primeCD = Math.max(0, this.primeCD - dt);
    if (this.prime > 0) { this.prime -= dt; this.R = 100; if (this.prime <= 0) { this.prime = 0; this.R = 60; this.primeCD = 20; world.event('primeEnd', {}); } return; }
    if (this.since > 2.5) this.R = Math.max(0, this.R - MT.T.ratingsDecay * dt);
    if (waves && this.R < 5) { this.lowT += dt; if (this.lowT >= 10 && !this.stuntDone) { this.stuntDone = true; this.lowT = 0; world.stunt(); } } else this.lowT = 0;
  }
  /** a near miss: +.5, at most 3 a second */
  near(world) { this.nearT += 0; const now = world.time; if (this._nw !== Math.floor(now)) { this._nw = Math.floor(now); this.nearN = 0; } if (this.nearN >= 3) return 0; this.nearN++; return this.add(.5, world); }
}
MT.Ratings = Ratings;
