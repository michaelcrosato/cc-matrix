// The day clock (one day = tuning dayMinutes real minutes; the story starts on Day 1 at 08:00), lighting by hour, regional
// ambience (the Fraying's purple, the dark tunnel), weather, and sleeping through the night.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
class Clock {
  constructor(ctx) { this.ctx = ctx; this.day = 1; this.hour = 8; this.frozen = false; this.phase = 'day'; this._lastPhase = null; this.weather = null; this.region = null; this.ambientOverride = null; }
  get total() { return (this.day - 1) * 24 + this.hour; }
  get isNight() { return this.hour >= 19 || this.hour < 5; }
  get isDay() { return this.hour >= 6 && this.hour < 19; }
  get label() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60 / 10) * 10; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
  setHour(h, day) { if (day !== undefined) this.day = day; this.hour = ((h % 24) + 24) % 24; this.applyLight(true); }
  update(dt) {
    const ctx = this.ctx;
    if (!this.frozen && !ctx.dev.freezeTime && !ctx.modal) {
      const k = 24 / (DQ.tune('dayMinutes') * 60);
      this.hour += dt * k; if (this.hour >= 24) { this.hour -= 24; this.day++; ctx.events.emit('newDay', { day: this.day }); }
    }
    const ph = this.hour >= 5 && this.hour < 7 ? 'dawn' : this.hour >= 7 && this.hour < 17 ? 'day' : this.hour >= 17 && this.hour < 19 ? 'dusk' : 'night';
    if (ph !== this._lastPhase) { const was = this._lastPhase; this._lastPhase = ph; this.phase = ph; if (was) ctx.events.emit('timeOfDay', { phase: ph, from: was }); }
    this.applyLight();
    this.updateWeather(dt);
  }
  /** ambient light and tint by hour, with a region's own over it */
  lightAt(h) {
    const key = [[0, .3], [4.5, .3], [6, .7], [7, 1], [16.5, 1], [18, .7], [19.5, .32], [24, .3]];
    for (let i = 0; i < key.length - 1; i++) if (h >= key[i][0] && h <= key[i + 1][0]) { const u = (h - key[i][0]) / (key[i + 1][0] - key[i][0]); return E.lerp(key[i][1], key[i + 1][1], u); }
    return 1;
  }
  applyLight(force) {
    const G = DQ.game, L = G.lights, ctx = this.ctx; if (!L) return;
    L.enabled = true;
    let a = this.lightAt(this.hour), dark = this.isNight ? [12, 14, 46] : this.phase === 'dawn' || this.phase === 'dusk' ? [46, 20, 34] : [10, 6, 24];
    const b = ctx.builder, reg = b ? DQ.regionAt(b.cx, b.cy, ctx) : null; this.region = reg;
    if (reg && reg.ambient) { a = Math.min(a, reg.ambient); dark = [38, 14, 52]; }
    // the dark tunnel in Lint Hollow, until a torch lights it
    if (b && !ctx.flags.tunnelLit && b.cx >= 43 && b.cx <= 51 && b.cy >= 40 && b.cy <= 43 && b.L <= 10) a = Math.min(a, .15);
    if (this.ambientOverride !== null) a = this.ambientOverride;
    const key = a.toFixed(2) + dark.join(',');
    if (key !== this._lk || force) { this._lk = key; L.ambient = a; L.darkness = .92; L.tint = .4; const d = L.dark; if (!d || d[0] !== dark[0] || d[1] !== dark[1] || d[2] !== dark[2]) { L.dark = dark; if (L.refresh && !G.headless) L.refresh(); } }
  }
  updateWeather(dt) {
    const G = DQ.game, reg = this.region; let want = null;
    if (reg && reg.weather === 'ash') want = { kind: 'ash', amount: .7, wind: .2 };
    else if (reg && reg.rain && ((this.day === 2 && this.hour > 13 && this.hour < 17) || (this.day === 4 && this.hour > 7 && this.hour < 11))) want = { kind: 'rain', amount: .5, wind: .2 };
    const key = want ? want.kind : null;
    if (key !== this.weather) { this.weather = key; G.weather = want; }
  }
  /** sleep: fade to black, a jingle, time jumps to 06:00 */
  canSleep(b) {
    if (!(this.hour >= 19 || this.hour < 5)) return 'It\'s not bedtime yet!';
    const ms = this.ctx.monsters ? this.ctx.monsters.list : []; if (ms.some(m => !m.dead && Math.hypot(m.x - b.x, m.y - b.y) < 8 * T)) return 'You can\'t sleep with monsters nearby!';
    return null;
  }
  sleepToMorning() { if (this.hour >= 6) this.day++; this.hour = 6; this.applyLight(true); this.ctx.events.emit('slept', { day: this.day }); this.ctx.events.emit('newDay', { day: this.day }); }
  serialize() { return { day: this.day, hour: this.hour }; }
  load(d) { if (d) { this.day = d.day; this.hour = d.hour; } this.applyLight(true); }
}
DQ.Clock = Clock;
})();
