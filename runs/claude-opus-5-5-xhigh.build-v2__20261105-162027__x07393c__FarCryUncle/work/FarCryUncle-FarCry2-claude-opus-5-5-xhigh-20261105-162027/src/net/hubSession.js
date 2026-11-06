// The AI Hub implementation of the one session interface (see session.js).
export function hubSession(info) {
  const hub = window.AIHub;
  return {
    kind: 'hub',
    me: info.me,
    players: info.players,
    host: info.host,
    isHost: info.isHost,
    server: !!info.server,
    limitMs: info.limitMs,
    seed: info.seed,
    time: () => hub.time(),
    rng: (label) => hub.rng(label),
    send: (data, opts) => hub.send(data, opts),
    on: (event, fn) => hub.on(event, fn),
    ready: () => hub.ready(),
    answer: (what) => hub.answer(what),
    finish: (outcome) => hub.finish(outcome),
    fail: (msg) => hub.fail(msg),
  };
}
