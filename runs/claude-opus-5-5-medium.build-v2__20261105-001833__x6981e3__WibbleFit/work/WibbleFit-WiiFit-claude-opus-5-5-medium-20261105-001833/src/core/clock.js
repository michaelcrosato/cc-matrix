// Real seconds, for menus and overlays that keep running at timeScale 0.
// Manual stepping counts frames, so tests are exact. Never used for gameplay.
export class RealClock {
  last = null; dt = 1 / 60; t = 0;
  tick(engine, fallback = 1 / 60) {
    if (engine.manual || typeof performance === 'undefined') { this.dt = fallback; this.last = null; }
    else { const n = performance.now(); this.dt = this.last === null ? fallback : Math.min(0.25, (n - this.last) / 1000); this.last = n; }
    this.t += this.dt;
    return this.dt;
  }
}
// The Step Class beat clock: the song's clock when audio runs, otherwise game time.
export class BeatClock {
  time = 0; audio = null; barOffset = 0; synced = false;
  attach(audio) { this.audio = audio; }
  advance(dt) { this.time += dt; }
  read() {
    const a = this.audio, s = a?.song, c = a?.context;
    if (s && c && c.state === 'running' && s.start >= 0 && s.parsed?.stepTime) {
      this.synced = true;
      return c.currentTime - s.start + this.barOffset;
    }
    this.synced = false;
    return this.time;
  }
  sync(t) { this.time = t; }
}
