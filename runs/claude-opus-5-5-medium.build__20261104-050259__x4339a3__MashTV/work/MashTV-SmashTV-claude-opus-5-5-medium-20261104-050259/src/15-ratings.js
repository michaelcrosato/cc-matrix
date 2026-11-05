// ---------------------------------------------------------------- ratings: the show's heartbeat (shared by the team)
MT.Ratings = class Ratings {
  constructor() { this.R = 30; this.since = 0; this.prime = 0; this.primeCd = 0; this.low = 0; this.stuntDone = false; this.applause = 0; this.nearT = 0; this.nearN = 0; this.kills = []; this.primeCount = 0; }
  get X() { if (this.prime > 0) return 5; const R = this.R; return R < 20 ? 1 : R < 40 ? 2 : R < 60 ? 3 : R < 80 ? 4 : 5; }
  gain(v, W, why) {
    if (v <= 0) return; v *= MT.T.ratingsGain; if (v <= 0) return;
    this.R = Math.min(100, this.R + v); this.since = 0; if (v >= 4) this.applause = 1.2;
    if (this.R >= 100 && this.prime <= 0 && this.primeCd <= 0 && W) this.startPrime(W);
  }
  lose(v) { if (this.prime > 0) return; this.R = Math.max(0, this.R - v); }
  startPrime(W) { this.prime = MT.T.primeTime; this.primeCount++; W.event('prime', {}); W.primeShower(); }
  kill(W) {   // multi-kill: +2 for each kill past 2 within 0.4 s
    const t = MT.game.time; this.kills.push(t); while (this.kills.length && t - this.kills[0] > .4) this.kills.shift();
    if (this.kills.length > 2) { this.gain(2, W); if (this.kills.length === 3 || this.kills.length === 6 || this.kills.length === 10) W.event('multi', { n: this.kills.length }); }
  }
  near(W) { const t = MT.game.time; if (t - this.nearT > 1) { this.nearT = t; this.nearN = 0; } if (this.nearN < 3) { this.nearN++; this.gain(.5, W); } }
  update(dt, W, waves) {
    this.applause = Math.max(0, this.applause - dt); this.primeCd = Math.max(0, this.primeCd - dt);
    if (this.prime > 0) { this.prime -= dt; this.R = 100; if (this.prime <= 0) { this.prime = 0; this.R = 60; this.primeCd = 20; W.event('primeEnd', {}); } return; }
    this.since += dt; if (this.since > 2.5) this.R = Math.max(0, this.R - MT.T.ratingsDecay * dt);
    if (waves && !this.stuntDone) { if (this.R < 5) { this.low += dt; if (this.low >= 10) { this.stuntDone = true; this.low = 0; W.stunt(); this.gain(15, W); } } else this.low = 0; }
  }
};
