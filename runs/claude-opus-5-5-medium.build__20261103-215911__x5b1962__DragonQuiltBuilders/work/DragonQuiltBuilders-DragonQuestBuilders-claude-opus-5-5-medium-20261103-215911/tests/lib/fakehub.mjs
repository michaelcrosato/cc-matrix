// An in-process stand-in for the AI Hub: N copies, a shared clock, seeded latency, jitter and loss on unreliable messages.
export class Bus {
  constructor(n, o = {}) { this.n = n; this.t = 0; this.q = []; this.copies = []; this.lat = o.latency || 0; this.jit = o.jitter || 0; this.loss = o.loss || 0; this.seed = 12345; this.server = !!o.server; this.startAt = Infinity; this.log = []; this.finished = []; this.limitMs = o.limitMs || 8 * 60000; }
  rnd() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }
  hub(i) {
    const bus = this, h = { handlers: {}, sent: [], answers: [], readyCalled: 0 };
    const players = []; for (let k = 0; k < this.n; k++) if (!(bus.server && k === 0)) players.push({ id: k, name: 'P' + k + 'é', color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][k % 4] });
    const info = { me: i, players, host: 0, isHost: i === 0, server: bus.server && i === 0, mode: 'shared-world', round: 1, limitMs: bus.limitMs, seed: 7 };
    const AIHub = {
      active: true, version: 'fake',
      connect: () => Promise.resolve(info), ready: () => { h.readyCalled++; }, answer: a => h.answers.push(a),
      time: () => bus.startAt === Infinity ? -Infinity : (bus.t - bus.startAt) * 1000,
      on: (ev, fn) => { (h.handlers[ev] = h.handlers[ev] || []).push(fn); return () => {}; },
      send: (data, o = {}) => { const s = JSON.stringify(data); h.sent.push({ t: bus.t, size: s.length, reliable: o.reliable !== false }); if (h.left) return false; const to = o.to === undefined ? null : o.to; for (let k = 0; k < bus.n; k++) { if (k === i || (to !== null && to !== k) || bus.copies[k].left) continue; if (o.reliable === false && bus.rnd() < bus.loss) continue; const d = (bus.lat + (bus.rnd() * 2 - 1) * bus.jit) / 1000; bus.q.push({ at: bus.t + Math.max(0, d), to: k, from: i, data: JSON.parse(s), seq: bus.q.length }); } return true; },
      rng: label => { let s = 99 + label.length; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; },
      finish: r => { bus.finished.push({ from: i, r, t: bus.t }); },
      progress() {}, result() {}, fail: m => bus.log.push('fail ' + m), seeded: false
    };
    h.AIHub = AIHub; h.emit = (ev, ...a) => { for (const fn of h.handlers[ev] || []) fn(...a); };
    this.copies[i] = h; return AIHub;
  }
  // deliver what is due (reliable messages keep their order per sender)
  step(dt) { this.t += dt; const due = this.q.filter(m => m.at <= this.t).sort((a, b) => a.at - b.at || a.seq - b.seq); this.q = this.q.filter(m => m.at > this.t); for (const m of due) if (!this.copies[m.to].left) this.copies[m.to].emit('message', m.data, m.from); }
  start() { this.startAt = this.t + 3; for (const c of this.copies) c.emit('start', { in: 3000 }); }
  card(o) { for (const c of this.copies) c.emit('card', Object.assign({ left: 10000, paused: false, starting: false, ready: [], asking: 0, asked: false }, o)); }
  leave(id) { this.copies[id].left = true; for (const c of this.copies) if (!c.left) c.emit('leave', { id, reason: 'left' }); }
  timeUp() { for (const c of this.copies) if (!c.left) c.emit('time-up', { graceMs: 5000 }); }
  end(reason) { for (const c of this.copies) if (!c.left) c.emit('end', { reason, standings: this.finished[0] && this.finished[0].r.standings }); }
}
