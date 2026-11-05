// A fake AI Hub for headless network tests: N copies on an in-process bus with seeded latency, jitter and loss on
// unreliable messages, the card, start, time(), leave, time-up, end and rng.
export function makeBus(n, o = {}) {
  let seed = o.seed || 7; const R = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const bus = { now: 0, startAt: Infinity, queue: [], hubs: [], finished: [], ended: false, lat: o.latency || 0, jit: o.jitter || 0, loss: o.loss || 0, stats: [] };
  const server = !!o.server, players = Array.from({ length: n }, (_, i) => ({ id: i, name: 'P' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const copies = server ? n + 1 : n;
  for (let k = 0; k < copies; k++) {
    const me = server && k === n ? 99 : k, handlers = {}, pending = {}, sent = [];
    const hub = {
      active: true, version: '1.4.0', me, isHost: server ? me === 99 : me === 0, server: server && me === 99, players, mode: 'shared-world', limitMs: o.limitMs || 60000, seed: 1234, host: server ? 99 : 0,
      readyCalled: false, answers: [], gone: false, ended: false,
      connect(opts) { hub.opts = opts; return Promise.resolve({ me, players, host: hub.host, isHost: hub.isHost, server: hub.server, mode: 'shared-world', round: 1, limitMs: hub.limitMs, seed: 1234 }); },
      ready() { hub.readyCalled = true; },
      answer(a) { hub.answers.push(a); },
      time() { return bus.now < bus.startAt ? (bus.startAt === Infinity ? -Infinity : bus.now - bus.startAt) : bus.now - bus.startAt; },
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); for (const a of pending[ev] || []) fn(...a); pending[ev] = []; return () => { handlers[ev] = handlers[ev].filter(f => f !== fn); }; },
      emit(ev, ...a) { if (handlers[ev] && handlers[ev].length) for (const f of handlers[ev].slice()) f(...a); else (pending[ev] = pending[ev] || []).push(a); },
      send(data, so = {}) {
        if (hub.gone || hub.ended) return false; const txt = JSON.stringify(data); sent.push({ t: bus.now, bytes: txt.length, reliable: so.reliable !== false });
        for (const h of bus.hubs) { if (h === hub || h.gone || (so.to !== undefined && h.me !== so.to)) continue; const rel = so.reliable !== false; if (!rel && R() < bus.loss) continue; const d = rel ? bus.lat : Math.max(0, bus.lat + (R() * 2 - 1) * bus.jit); bus.queue.push({ at: bus.now + d, to: h, data: JSON.parse(txt), from: me, rel }); }
        return true;
      },
      finish(r) { bus.finished.push({ from: me, r, t: bus.now }); },
      progress() {}, result() {}, fail(m) { bus.failed = m; },
      rng(label) { let s = 99; for (const c of String(label)) s = (s * 31 + c.charCodeAt(0)) | 0; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; },
      sent
    };
    bus.hubs.push(hub);
  }
  bus.step = ms => { bus.now += ms; bus.queue.sort((a, b) => a.at - b.at); while (bus.queue.length && bus.queue[0].at <= bus.now) { const m = bus.queue.shift(); if (!m.to.gone && !m.to.ended) m.to.emit('message', m.data, m.from); } };
  bus.start = () => { bus.startAt = bus.now + 3000; for (const h of bus.hubs) h.emit('start', { in: 3000 }); };
  bus.card = left => { for (const h of bus.hubs) h.emit('card', { left, paused: false, starting: false, ready: [], asking: 0, asked: false }); };
  bus.leave = id => { const h = bus.hubs.find(q => q.me === id); h.gone = true; for (const q of bus.hubs) if (!q.gone) q.emit('leave', { id, reason: 'left' }); };
  bus.timeUp = () => { for (const h of bus.hubs) if (!h.gone) h.emit('time-up', { graceMs: 5000 }); };
  bus.end = reason => { bus.ended = true; for (const h of bus.hubs) if (!h.gone) { h.ended = true; h.emit('end', { reason, standings: bus.finished[0] ? bus.finished[0].r.standings : [] }); } };
  return bus;
}
