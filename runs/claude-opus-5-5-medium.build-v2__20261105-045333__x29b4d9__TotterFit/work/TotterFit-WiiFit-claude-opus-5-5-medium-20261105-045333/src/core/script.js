// Generator scripts on sim time. yield seconds | yield () => bool | yield generator.
export class Scripts {
  constructor() { this.list = []; this.after = []; this.time = 0; }
  run(gen, tag) { const s = { stack: [gen], wait: 0, until: null, tag }; this.list.push(s); return s; }
  killTag(tag) { this.list = this.list.filter(s => s.tag !== tag); }
  kill(s) { const i = this.list.indexOf(s); if (i >= 0) this.list.splice(i, 1); }
  clear() { this.list.length = 0; this.after.length = 0; }
  later(sec, fn) { this.after.push({ at: this.time + sec, fn }); }
  tick(dt) {
    this.time += dt;
    for (let i = this.after.length - 1; i >= 0; i--) if (this.after[i].at <= this.time) { const a = this.after[i]; this.after.splice(i, 1); a.fn(); }
    for (const s of [...this.list]) this.step(s, dt);
  }
  step(s, dt) {
    if (s.wait > 0) { s.wait -= dt; if (s.wait > 0) return; s.wait = 0; }
    if (s.until) { if (!s.until()) return; s.until = null; }
    for (let guard = 0; guard < 64; guard++) {
      const top = s.stack[s.stack.length - 1];
      if (!top) { this.kill(s); return; }
      const r = top.next();
      if (!this.list.includes(s)) return;
      if (r.done) { s.stack.pop(); continue; }
      const v = r.value;
      if (typeof v === 'number') { if (v > 0) { s.wait = v; return; } continue; }
      if (typeof v === 'function') { if (v()) continue; s.until = v; return; }
      if (v && typeof v.next === 'function') { s.stack.push(v); continue; }
      return; // a bare yield waits one tick
    }
  }
}
