// One interface, three implementations (hub, solo, link) so round code never knows which.
export function hubSession(info) {
  const A = globalThis.AIHub;
  const ls = new Map();
  const emit = (ev, ...a) => (ls.get(ev) || []).forEach((f) => f(...a));
  for (const ev of ['card', 'start', 'message', 'leave', 'time-up', 'end']) A.on(ev, (...a) => emit(ev, ...a));
  return {
    kind: 'hub', me: info.me, players: info.players, host: info.host, isHost: info.isHost, server: !!info.server, limitMs: info.limitMs, seed: info.seed,
    time: () => A.time(), rng: (l) => A.rng(l),
    send: (d, o) => A.send(d, o), on: (ev, f) => { if (!ls.has(ev)) ls.set(ev, []); ls.get(ev).push(f); },
    ready: () => A.ready(), answer: (w) => A.answer(w), finish: (o) => A.finish(o), fail: (m) => A.fail(m),
    progress: (o) => A.progress?.(o),
  };
}
