// Sim-time generator scripts. A script yields: a number (seconds), a function (until true),
// null (one tick), or a Handle (until it is done). Use yield* to call another generator.
export class Handle {
  constructor(gen) { this.gen = gen; this.wait = null; this.done = false; this.cancelled = false; this.value = undefined; }
  cancel() { this.cancelled = true; this.done = true; if (this.gen.return) { try { this.gen.return(); } catch (e) { /* a finally block threw while tearing down */ } } }
}

export class Scripts {
  constructor() { this.list = []; this.timers = []; }
  run(gen) {
    const h = new Handle(gen);
    this.list.push(h);
    this._step(h);
    return h;
  }
  after(sec, fn) { const t = { left: sec, fn }; this.timers.push(t); return t; }
  cancelTimer(t) { const i = this.timers.indexOf(t); if (i >= 0) this.timers.splice(i, 1); }
  _step(h) {
    if (h.done) return;
    const r = h.gen.next(h.lastValue);
    if (r.done) { h.done = true; h.value = r.value; return; }
    h.wait = r.value;
    if (typeof h.wait === 'number') h.left = h.wait;
  }
  tick(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.left -= dt;
      if (t.left <= 0) { this.timers.splice(i, 1); t.fn(); }
    }
    for (let i = 0; i < this.list.length; i++) {
      const h = this.list[i];
      if (h.done) continue;
      const w = h.wait;
      let go = false;
      if (w === null || w === undefined) go = true;
      else if (typeof w === 'number') { h.left -= dt; go = h.left <= 0; }
      else if (typeof w === 'function') { const v = w(); if (v) { h.lastValue = v; go = true; } }
      else if (w instanceof Handle) { go = w.done; if (go) h.lastValue = w.value; }
      else go = true;
      if (go) this._step(h);
    }
    if (this.list.length && this.list.some((h) => h.done)) this.list = this.list.filter((h) => !h.done);
  }
  clear() { for (const h of this.list) h.cancel(); this.list = []; this.timers = []; }
}
