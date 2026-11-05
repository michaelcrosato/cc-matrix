// A fake AI Hub for headless netcode tests: N copies of the game in vm contexts share a bus with latency, unreliable
// loss, the 20/s (burst 40) send limiter and the card -> start -> time-up -> end flow. The clock is advanced by the test.
export function makeHub(n, o = {}) {
  const latency = o.latency || 0, loss = o.loss || 0, server = !!o.server;
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: 'P' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const copies = [];
  const hub = { now: -Infinity, t: 0, copies, sent: [], finished: null, ended: false, msgs: [] };
  let seedR = 12345;
  const rng = label => { let h = 2166136261; for (const c of String(label) + seedR) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } let s = h >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const total = n + (server ? 1 : 0);
  for (let k = 0; k < total; k++) {
    const me = k < n ? k : n, isServer = k >= n, host = server ? n : 0;
    const handlers = {}, queued = {};
    const c = { me, handlers, sent: 0, recv: 0, ready: false, answers: [], bucket: 40, lastT: 0, gone: false };
    const emit = (ev, ...a) => { if (c.gone) return; const hs = handlers[ev]; if (hs && hs.length) hs.forEach(f => f(...a)); else (queued[ev] = queued[ev] || []).push(a); };
    c.emit = emit;
    c.api = {
      active: true, seeded: false, version: '1.4.0',
      connect: async () => ({ me, players, host, isHost: me === host, server: isServer, mode: 'shared-world', round: 1, limitMs: o.limitMs || 300000, seed: 7 }),
      ready: () => { c.ready = true; },
      answer: a => c.answers.push(a),
      on: (ev, f) => { (handlers[ev] = handlers[ev] || []).push(f); for (const a of queued[ev] || []) f(...a); delete queued[ev]; return () => {}; },
      time: () => hub.now,
      rng,
      send: (data, opt = {}) => {
        if (hub.ended || c.gone) return false;
        const t = hub.t; c.bucket = Math.min(40, c.bucket + (t - c.lastT) * 20); c.lastT = t;
        if (c.bucket < 1) return false; c.bucket--;
        const s = JSON.stringify(data); if (s.length > 16384) throw new Error('message too big');
        c.sent++; hub.sent.push({ from: me, size: s.length, reliable: opt.reliable !== false, t, type: data.t });
        for (const d of copies) { if (d === c || d.gone) continue; if (opt.to !== undefined && d.me !== opt.to) continue; if (opt.reliable === false && Math.random() < loss) continue; hub.msgs.push({ at: t + latency, to: d, data: JSON.parse(s), from: me }); }
        return true;
      },
      finish: r => { if (me !== host) throw new Error('only the host finishes'); hub.finished = r; },
      progress() {}, result() {}, fail: m => { throw new Error('fail: ' + m); }
    };
    copies.push(c);
  }
  hub.step = dt => { hub.t += dt; const due = hub.msgs.filter(m => m.at <= hub.t); hub.msgs = hub.msgs.filter(m => m.at > hub.t); for (const m of due) { if (!m.to.gone) { m.to.recv++; m.to.emit('message', m.data, m.from); } } };
  hub.card = left => { for (const c of copies) c.emit('card', { left, paused: false, starting: false, ready: copies.filter(x => x.answers.includes('ready')).map(x => x.me), asking: 0, asked: false }); };
  hub.start = () => { hub.now = -3000; for (const c of copies) c.emit('start', { in: 3000 }); };
  hub.leave = id => { const c = copies.find(x => x.me === id); if (c) c.gone = true; for (const d of copies) if (!d.gone) d.emit('leave', { id, reason: 'left' }); };
  hub.timeUp = () => { for (const c of copies) c.emit('time-up', { graceMs: 5000 }); };
  hub.end = reason => { hub.ended = true; for (const c of copies) c.emit('end', { reason: reason || 'finished', standings: hub.finished ? hub.finished.standings : [] }); };
  return hub;
}
