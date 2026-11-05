// 40-weapon: the pump rifle (a five-round tube: fire, rack, reload), the scope (a lens with sway and a held breath),
// and the call (a few a site: animals stop and look).
class Rifle {
  constructor(p, o = {}) { this.p = p; this.setup(o); }
  setup(o = {}) {
    this.cap = o.tube || Math.round(T('rounds')); this.rounds = this.cap; this.chambered = true; this.rackT = 0; this.reloadT = 0; this.last = -9; this.autoT = -1;
    this.rackTime = o.rack !== undefined ? o.rack : T('rackTime'); this.reloadTime = T('reloadTime'); this.dryT = 0; this.dryCount = 0; this.shells = 0; this.bonus = !!o.tube;
  }
  get busy() { return this.rackT > 0 || this.reloadT > 0; }
  /** fire: true when a round went; false is a dry click (an empty chamber) */
  fire(t) {
    if (this.busy || t - this.last < .1) return null;
    if (!this.chambered) { this.dryT = .3; this.dryCount++; bus.emit('dry', this.p); return false; }
    this.chambered = false; if (!this.infinite) this.rounds = Math.max(0, this.rounds - 1); this.last = t;
    if (this.auto || this.p.autoPump) this.autoT = .12;
    return true;
  }
  /** pump: rack the next round (two clicks), or with the tube empty reload it (five shells) */
  pump() {
    if (this.busy) return false;
    if (this.chambered && this.rounds >= this.cap) return false;
    if (this.rounds > 0 && !this.chambered) { this.rackT = this.rackTime; bus.emit('pump', this.p); return true; }
    if (this.rounds <= 0 || (this.chambered === false && this.rounds === 0)) { this.reloadT = this.reloadTime; this.shells = 0; bus.emit('reload', this.p); return true; }
    return false;
  }
  update(dt) {
    if (this.dryT > 0) this.dryT -= dt;
    if (this.autoT >= 0) { this.autoT -= dt; if (this.autoT < 0) this.pump(); }
    if (this.rackT > 0) { this.rackT -= dt; if (this.rackT <= 0) { this.rackT = 0; this.chambered = true; } }
    if (this.reloadT > 0) {
      const before = this.reloadT; this.reloadT -= dt;
      const step = this.reloadTime / (this.cap + .5), n0 = Math.floor((this.reloadTime - before) / step), n1 = Math.floor((this.reloadTime - Math.max(0, this.reloadT)) / step);
      if (n1 > n0) { this.shells = Math.min(this.cap, n1); bus.emit('shell', this.p); }
      if (this.reloadT <= 0) { this.reloadT = 0; this.rounds = this.cap; this.chambered = true; }
    }
  }
}
class Scope {
  constructor(p) { this.p = p; this.on = false; this.raise = 0; this.breath = T('breath'); this.holding = false; this.shaky = 0; this.t = 0; this.toggle = false; }
  get up() { return this.raise > .6; }
  /** the sway in screen pixels now: a slow figure, much smaller while the breath is held, doubled while it shakes */
  sway() {
    const A = T('sway') * (G.hunt && G.hunt.diff ? G.hunt.diff.sway : 1) * (this.holding ? .15 : 1) * (this.shaky > 0 ? 2 : 1) * this.raise, t = this.t;
    return [A * (.6 * Math.sin(1.3 * t) + .4 * Math.sin(2.9 * t + 1)), A * (.5 * Math.sin(1.7 * t + 2) + .3 * Math.sin(3.3 * t))];
  }
  update(dt, wantOn, wantBreath) {
    this.t += dt;
    const was = this.on; this.on = wantOn;
    if (this.on && !was) bus.emit('scope', this.p);
    this.raise = E.approach(this.raise, this.on ? 1 : 0, dt / .15);
    const max = T('breath');
    if (this.shaky > 0) { this.shaky -= dt; this.holding = false; }
    else if (this.on && wantBreath && this.breath > 0) { if (!this.holding) bus.emit('breathIn', this.p); this.holding = true; this.breath -= dt; if (this.breath <= 0) { this.breath = 0; this.holding = false; this.shaky = 1.5; bus.emit('breathOut', this.p); } }
    else { if (this.holding) bus.emit('breathOut', this.p); this.holding = false; this.breath = Math.min(max, this.breath + dt * 1.2); }
  }
}
class Call {
  constructor(p) { this.p = p; this.reset(); }
  reset() { this.charges = Math.round(T('calls')) + (G.hunt && G.hunt.diff && G.hunt.diff.calls || 0); this.cd = 0; }
  update(dt) { if (this.cd > 0) this.cd -= dt; }
  use() { if (this.charges <= 0 || this.cd > 0) return false; this.charges--; this.cd = 3; return true; }
}
