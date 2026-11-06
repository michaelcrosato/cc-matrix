// AI Hub glue: ghost mode. Sends our lane's state every 100 ms from a setInterval (not tied to rendering), receives the others.
import { SEAT_COLORS_HEX } from './seats.js';
export const hub = () => (typeof globalThis !== 'undefined' ? globalThis.AIHub : null);

export class Net {
  constructor(app) {
    this.app = app; this.info = app.session; this.timer = null; this.ghosts = new Map(); this.left = new Set(); this.sent = 0; this.recv = 0;
    this.cardState = { left: null, ready: [], paused: false, starting: false, asked: false, asking: 0 };
    this.started = false; this.ended = false; this.timeUp = false; this.provider = null; this.offs = [];
    const H = hub(); if (!H) return;
    this.offs.push(H.on('card', (c) => { this.cardState = { ...this.cardState, ...c }; }));
    this.offs.push(H.on('start', (s) => { this.started = true; this.startIn = s?.in ?? 3000; this.begin(() => ({ a: -1, x: 0, y: 0, c: 0, t: 0, s: 0, total: 0, label: 'Ready' })); this.app.onHubStart?.(s); }));
    this.offs.push(H.on('message', (data, from) => this.onMessage(data, from)));
    this.offs.push(H.on('leave', (l) => { this.left.add(l.id); this.app.onHubLeave?.(l); }));
    this.offs.push(H.on('time-up', () => { this.timeUp = true; this.app.onHubTimeUp?.(); }));
    this.offs.push(H.on('end', (e) => { this.ended = true; this.stop(); this.app.onHubEnd?.(e); }));
  }
  get me() { return this.info?.me ?? 0; }
  get players() { return this.info?.players ?? []; }
  time() { const H = hub(); const t = H?.time?.(); return t == null || t === -Infinity ? -Infinity : t / 1000; }
  rng(label) { return hub()?.rng?.(label) ?? Math.random; }
  answer(a) { hub()?.answer?.(a); }
  ghost(id) { let g = this.ghosts.get(id); if (!g) { g = { x: 0, y: 0, c: 0, t: 0, s: 0, a: -1, seen: false }; this.ghosts.set(id, g); } return g; }
  onMessage(d, from) { if (!d || this.ended) return; this.recv++; const g = this.ghost(from); Object.assign(g, { x: d.x ?? 0, y: d.y ?? 0, c: d.c ?? 0, t: d.t ?? 0, s: d.s ?? 0, a: d.a ?? -1, seen: true }); }
  /** Begin sending at 100 ms, as soon as `start` arrives, even with score 0. provider() -> { a, x, y, c, t, s, label }. */
  begin(provider) {
    this.provider = provider; if (this.timer || this.ended) return;
    const tick = () => {
      if (this.ended) return; const H = hub(); if (!H) return;
      const p = this.provider?.(); if (!p) return;
      try { H.send({ a: p.a, x: +p.x.toFixed(3), y: +p.y.toFixed(3), c: p.c, t: +p.t.toFixed(2), s: Math.round(p.s) }, { reliable: false }); this.sent++; } catch { /* */ }
      try { H.progress({ score: Math.round(p.total ?? p.s), label: p.label ?? '' }); } catch { /* */ }
    };
    tick(); this.timer = setInterval(tick, 100);
  }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  result(payload) { if (this.resultSent || this.ended) return; this.resultSent = true; try { hub()?.result?.(payload); } catch { /* */ } }
  dispose() { this.stop(); for (const o of this.offs) { try { o?.(); } catch { /* */ } } }
}
