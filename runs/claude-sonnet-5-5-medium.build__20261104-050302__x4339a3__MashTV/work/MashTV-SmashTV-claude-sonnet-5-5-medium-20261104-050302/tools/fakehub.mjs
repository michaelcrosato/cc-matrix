// An AIHub-compatible fake for tests: N copies, a shared clock driven by the test loop, latency/jitter/loss, a 20/s limiter with bursts of 40, a 16 KB cap,
// reliable-ordered vs unreliable delivery. Mirrors lib/hub/README.md (client 1.4.0).
export class FakeNet {
  constructor(o = {}) {
    this.n = o.players || 2; this.server = !!o.server; this.latency = o.latency ?? 150; this.jitter = o.jitter ?? 50; this.loss = o.loss ?? .05; this.now = 0; this.seed = o.seed || 99;
    this.q = []; this.copies = []; this.startAt = null; this.record = null; this.limitMs = o.limitMs || 360000; this.rnd = mulberry(1234); this.stats = { sent: [], recv: [], maxBytes: 0, dropped: 0, rate: 0 };
    const total = this.n + (this.server ? 1 : 0);
    for (let i = 0; i < total; i++) this.copies.push(this.makeHub(i));
  }
  makeHub(i) {
    const net = this, isServer = net.server && i === net.n, id = isServer ? 99 : i, handlers = {}, pending = {}, state = { ready: false, tokens: 40, last: 0, sent: 0, recv: 0, bytes: 0, maxBytes: 0, answers: [] };
    const players = Array.from({ length: net.n }, (_, k) => ({ id: k, name: 'Player' + (k + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][k] }));
    const fire = (ev, arg, arg2) => { const hs = handlers[ev]; if (!hs || !hs.length) { (pending[ev] = pending[ev] || []).push([arg, arg2]); return; } for (const h of hs.slice()) h(arg, arg2); };
    const hub = {
      version: '1.4.0', protocol: 1, active: true, me: isServer ? 99 : id, host: net.server ? 99 : 0, isHost: net.server ? isServer : i === 0, server: isServer, players, mode: 'shared-world', seed: net.seed, limitMs: net.limitMs, round: 1, splash: true, seeded: false, _state: state, _fire: fire,
      connect(o) { hub.card = !!(o && o.card); return Promise.resolve(Object.assign({}, { me: hub.me, host: hub.host, isHost: hub.isHost, server: hub.server, players, mode: 'shared-world', round: 1, limitMs: net.limitMs, seed: net.seed })); },
      ready() { state.ready = true; }, answer(a) { state.answers.push(a); if (a === 'ready') net.readySet.add(id); },
      time() { return net.startAt === null ? -Infinity : net.now - net.startAt - 3000; },
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); if (pending[ev]) { const p = pending[ev]; delete pending[ev]; for (const a of p) fn(a[0], a[1]); } return () => { handlers[ev] = (handlers[ev] || []).filter(h => h !== fn); }; },
      send(data, o = {}) {
        const s = JSON.stringify(data); if (s.length > 16384) { net.stats.dropped++; throw new Error('message over 16 KB: ' + s.length); }
        const t = net.now; state.tokens = Math.min(40, state.tokens + (t - state.last) / 1000 * 20); state.last = t; if (state.tokens < 1) { net.stats.dropped++; return false; } state.tokens--;
        state.sent++; state.bytes += s.length; state.maxBytes = Math.max(state.maxBytes, s.length); net.stats.maxBytes = Math.max(net.stats.maxBytes, s.length);
        const reliable = o.reliable !== false; for (const c of net.copies) { if (c === hub) continue; if (o.to !== undefined && o.to !== c.me) continue; if (!reliable && net.rnd() < net.loss) continue; net.q.push({ at: t + net.latency + (net.rnd() * 2 - 1) * net.jitter, order: net.q.length, reliable, to: c, from: id, data: JSON.parse(s) }); }
        return true;
      },
      progress() {}, result() {}, rng(l) { return mulberry(net.seed + l.length); },
      finish(r) { if (hub.isHost && !net.record) { net.record = { status: 'played', reason: 'finished', finish: r, at: net.now }; net.endAll('finished', r.standings); } },
      fail() {}
    };
    return hub;
  }
  begin() { this.readySet = new Set(); }
  startRound() { this.startAt = this.now; for (const c of this.copies) c._fire('start', { in: 3000 }); }
  cardTick() { for (const c of this.copies) c._fire('card', { left: 20000 - this.now, paused: false, starting: false, ready: [...this.readySet], asking: 0, asked: false }); }
  endAll(reason, standings) { for (const c of this.copies) if (!c.ended) { c.ended = true; c._fire('end', { reason, standings }); } }
  leave(id) { for (const c of this.copies) if (c.me !== id) c._fire('leave', { id, reason: 'left' }); }
  timeUp() { for (const c of this.copies) c._fire('time-up', { graceMs: 5000 }); this.timeUpAt = this.now; }
  tick(ms) {
    this.now += ms; this.q.sort((a, b) => a.at - b.at || a.order - b.order);
    while (this.q.length && this.q[0].at <= this.now) { const m = this.q.shift(); m.to._state.recv++; m.to._fire('message', m.data, m.from); }
    if (this.timeUpAt && !this.record && this.now - this.timeUpAt > 5000) { this.record = { status: 'void', reason: 'time-up' }; this.endAll('void', []); }
  }
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
