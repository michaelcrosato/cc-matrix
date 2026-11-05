// an in-process AI Hub: several game copies wired through a fake network (for the net suite)
export async function fakeHub(load, { players = 2 } = {}) {
  const r = { ready: 0, sent: { s: 0, i: 0, e: 0 }, finished: 0, standings: null, maxSnap: 0, clock: -Infinity, copies: [] };
  const info = id => ({ me: id, players: Array.from({ length: players }, (_, i) => ({ id: i, name: 'Player ' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] })), host: 0, isHost: id === 0, server: false, mode: 'shared-world', round: 1, limitMs: 240000, seed: 1234 });
  const rngOf = (label) => { let h = 2166136261; for (const c of label + 1234) h = Math.imul(h ^ c.charCodeAt(0), 16777619); let s = h >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  for (let id = 0; id < players; id++) {
    const handlers = {}, queue = {};
    const hub = {
      active: true, me: id,
      connect: async () => { Object.assign(hub, info(id)); return info(id); },
      ready: () => { r.ready++; }, answer: () => {},
      time: () => r.clock,
      on: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); for (const a of queue[ev] || []) fn(...a); queue[ev] = []; return () => {}; },
      send: (data, o = {}) => {
        const s = JSON.stringify(data); if (data.t) r.sent[data.t] = (r.sent[data.t] || 0) + 1;
        if (data.t === 's') r.maxSnap = Math.max(r.maxSnap, s.length);
        for (const c of r.copies) if (c.id !== id) c.emit('message', JSON.parse(s), id);
        return true;
      },
      finish: o => { r.finished++; r.standings = o.standings; },
      rng: rngOf, progress() {}, result() {}, fail() {}
    };
    const emit = (ev, ...a) => { if (handlers[ev] && handlers[ev].length) for (const f of handlers[ev]) f(...a); else (queue[ev] = queue[ev] || []).push(a); };
    const env = load({ aihub: hub });
    r.copies.push({ id, env, emit, hub });
  }
  // let the boot steps and connect() settle
  for (let k = 0; k < 3; k++) { await new Promise(res => setTimeout(res, 0)); for (const c of r.copies) c.env.game.advance(.05); }
  r.settle = async () => {};
  r.start = () => { r.clock = -3000; for (const c of r.copies) c.emit('start', { in: 3000 }); for (const c of r.copies) c.env.game.advance(1 / 120); };
  r.run = secs => { for (let i = 0; i < secs * 120; i++) { r.clock += 1000 / 120; for (const c of r.copies) c.env.game.advance(1 / 120); } };
  r.timeUp = () => { for (const c of r.copies) c.emit('time-up', { graceMs: 3000 }); };
  const Ms = () => r.copies.map(c => c.env.ctx.__thugby.M);
  r.clientMatches = () => { const [h, c] = Ms(); if (!h || !c) return false; return h.players.every((p, i) => Math.hypot(p.x - c.players[i].x, p.y - c.players[i].y) < 60) && h.score.join() === c.score.join(); };
  r.clientMoved = () => {
    const c = r.copies[1], g = c.env.game, hostTT = r.copies[0].env.TT, [hM] = Ms(), hs = hostTT.seats.find(s => s.netId === 1);
    if (!hs) return false;
    g.input.hold('right');
    let ok = false;
    for (let k = 0; k < 120 * 30 && !ok; k++) { r.run(1 / 120); const p = hM.players[hs.pid]; if (hM.phase === 'play' && p && p.st === 'run' && p.vx > 40 && hs.intent && hs.intent.mx > .9) ok = true; }
    g.input.hold('right', false);
    return ok;
  };
  r.clientLocal = () => {
    const c = r.copies[1], g = c.env.game, cM = c.env.ctx.__thugby.M, [hM] = Ms(), net = c.env.TT.net;
    for (let k = 0; k < 120 * 30; k++) { r.run(1 / 120); if (hM.phase === 'play' && net.ownPid >= 0 && cM.players[net.ownPid].st === 'run') break; }
    const p = cM.players[net.ownPid]; if (!p) return false; const x0 = p.x;
    g.input.hold(p.x < 688 ? 'right' : 'left'); c.env.game.advance(1 / 120 * 6); g.input.hold('right', false); g.input.hold('left', false);
    return Math.abs(p.x - x0) > 1;   // moved within 6 steps, before any snapshot round trip
  };
  r.errors = () => r.copies.reduce((n, c) => n + c.env.game.errors.length, 0);
  r.firstError = () => { for (const c of r.copies) if (c.env.game.errors.length) return String(c.env.game.errors[0].stack || c.env.game.errors[0]); return ''; };
  return r;
}
