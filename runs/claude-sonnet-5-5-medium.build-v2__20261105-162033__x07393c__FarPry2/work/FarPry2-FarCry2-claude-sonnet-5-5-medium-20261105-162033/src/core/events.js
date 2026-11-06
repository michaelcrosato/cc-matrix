// Tiny emitter used across systems (ledger counts, mission steps, audio stingers).
export class Events {
  constructor() { this.h = new Map(); }
  on(ev, fn) { if (!this.h.has(ev)) this.h.set(ev, []); this.h.get(ev).push(fn); return () => this.h.set(ev, this.h.get(ev).filter((f) => f !== fn)); }
  emit(ev, a, b, c) { const l = this.h.get(ev); if (l) for (const f of l.slice()) f(a, b, c); }
  clear() { this.h.clear(); }
}
