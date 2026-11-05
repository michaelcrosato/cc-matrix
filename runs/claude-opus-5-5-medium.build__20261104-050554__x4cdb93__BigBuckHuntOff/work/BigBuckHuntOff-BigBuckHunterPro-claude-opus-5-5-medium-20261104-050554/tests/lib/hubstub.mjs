// a fake AIHub: a controllable clock, events, and a record of what the game called
export function hubStub(o = {}) {
  const ev = {}, calls = { ready: 0, answer: [], progress: [], result: [], send: [] };
  let clock = -Infinity;
  const players = o.players || [{ id: 0, name: 'Ada', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }];
  const rngs = {};
  const mk = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hub = {
    active: true, me: o.me || 0, players, seeded: true,
    connect(opts) { calls.connect = opts; return Promise.resolve({ me: hub.me, players, host: 0, isHost: hub.me === 0, mode: 'ghost', round: o.round || 1, limitMs: 240000, seed: 1234 }); },
    ready() { calls.ready++; }, answer(a) { calls.answer.push(a); },
    time() { return clock; }, on(e, fn) { (ev[e] || (ev[e] = [])).push(fn); return () => {}; },
    progress(p) { calls.progress.push([clock, p]); }, result(r) { calls.result.push(r); },
    send(d, opt) { calls.send.push([clock, d, opt]); return true; }, rng(label) { return rngs[label] || (rngs[label] = mk(label.length * 977 + 1234)); }
  };
  return { hub, calls, emit: (e, ...a) => (ev[e] || []).forEach(f => f(...a)), setTime: ms => { clock = ms; } };
}
