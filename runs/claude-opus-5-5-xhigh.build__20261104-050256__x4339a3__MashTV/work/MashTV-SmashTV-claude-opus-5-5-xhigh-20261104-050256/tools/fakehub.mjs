// A fake AI Hub for headless tests: N copies on one shared clock, a simulated network (latency ± jitter, loss), the
// client's limits (20 messages a second, bursts of 40, 16 KB), reliable-ordered and unreliable delivery, the card,
// start, leave, time-up and end. Each copy gets an AIHub-compatible object.
export function createHub(o = {}) {
  const n = o.players || 2, server = !!o.server, lat = o.latency ?? 150, jit = o.jitter ?? 50, loss = o.loss ?? .05, seed = o.seed ?? 1234;
  let rs = seed >>> 0; const rnd = () => { rs = (rs + 0x6d2b79f5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const bus = { clock: 0, goAt: null, queue: [], copies: [], log: [], finished: [], answers: [], ended: false, lastRel: {} };
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: ['ROCKET', 'VOLT', 'MOXIE', 'GOLDIE'][i], color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const hostId = server ? n : 0;
  const mk = (me, isServer) => {
    const handlers = {}, pending = {}, stats = { sent: 0, recv: 0, bytes: 0, max: 0, bySec: {}, drops: 0 };
    let tokens = 40, refT = 0, ready = false;
    const emit = (type, args) => { const L = handlers[type]; if (!L || !L.length) { (pending[type] = pending[type] || []).push(args); return; } for (const f of L) f(...args); };
    const H = {
      active: true, me, host: hostId, isHost: me === hostId, server: isServer, players: players.slice(), mode: 'shared-world', seed, round: 1, limitMs: 360000, stats,
      get readyCalled() { return ready; },
      connect() { return new Promise(res => setTimeout(() => res({ me, host: hostId, isHost: me === hostId, server: isServer, players: players.slice(), mode: 'shared-world', seed, round: 1, limitMs: 360000 }), 5)); },
      ready() { ready = true; },
      answer(w) { bus.answers.push([me, w]); },
      time() { return bus.goAt === null ? -Infinity : bus.clock - bus.goAt; },
      on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); const q = pending[type]; if (q) { delete pending[type]; for (const a of q) emit(type, a); } return () => {}; },
      rng(label) { let h = 2166136261; for (const ch of String(label)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } let a = (seed ^ h) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
      send(data, opt = {}) {
        if (bus.ended || H.gone) return false;
        const text = JSON.stringify(data); if (text.length > 16384) { stats.drops++; return false; }
        tokens = Math.min(40, tokens + (bus.clock - refT) / 1000 * 20); refT = bus.clock; if (tokens < 1) { stats.drops++; return false; } tokens--;
        stats.sent++; stats.bytes += text.length; stats.max = Math.max(stats.max, text.length); const sec = Math.floor(bus.clock / 1000); stats.bySec[sec] = (stats.bySec[sec] || 0) + 1;
        const reliable = opt.reliable !== false;
        for (const c of bus.copies) {
          if (c.me === me || c.gone || (opt.to !== undefined && opt.to !== c.me)) continue;
          if (!reliable && rnd() < loss) continue;
          let at = bus.clock + lat + (rnd() * 2 - 1) * jit; const key = me + '>' + c.me;
          if (reliable) { at = Math.max(at, (bus.lastRel[key] || 0) + 1); bus.lastRel[key] = at; }
          bus.queue.push({ at, to: c, data: JSON.parse(text), from: me });
        }
        return true;
      },
      finish(out) { bus.finished.push([me, out]); },
      result() {}, progress() {}, fail(m) { bus.log.push('fail ' + m); }, probe() {}, inspect() { return null; },
      _emit: emit, _deliver(data, from) { stats.recv++; emit('message', [data, from]); },
    };
    return H;
  };
  for (let i = 0; i < n; i++) bus.copies.push(mk(i, false));
  if (server) bus.copies.push(mk(n, true));
  bus.hubs = bus.copies;
  /** advance the shared clock by ms and deliver what is due */
  bus.tick = ms => { bus.clock += ms; const due = bus.queue.filter(q => q.at <= bus.clock).sort((a, b) => a.at - b.at); bus.queue = bus.queue.filter(q => q.at > bus.clock); for (const q of due) if (!q.to.gone) q.to._deliver(q.data, q.from); };
  bus.card = c => { for (const h of bus.copies) h._emit('card', [Object.assign({ left: 8000, paused: false, starting: false, ready: [], asking: 0, asked: false }, c)]); };
  bus.start = () => { bus.goAt = bus.clock + 3000; for (const h of bus.copies) h._emit('start', [{ in: 3000 }]); };
  bus.leave = id => { const h = bus.copies.find(c => c.me === id); if (h) h.gone = true; for (const c of bus.copies) if (!c.gone) c._emit('leave', [{ id, reason: 'left' }]); };
  bus.timeUp = () => { for (const c of bus.copies) if (!c.gone) c._emit('time-up', [{ graceMs: 5000 }]); };
  bus.end = reason => { bus.ended = true; for (const c of bus.copies) if (!c.gone) c._emit('end', [{ reason, standings: null }]); };
  return bus;
}
