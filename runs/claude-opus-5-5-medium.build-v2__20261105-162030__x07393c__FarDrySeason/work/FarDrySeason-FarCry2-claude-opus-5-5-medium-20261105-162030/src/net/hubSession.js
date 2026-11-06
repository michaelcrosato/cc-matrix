// A session inside the AI Hub.
export function hubSession(info) {
  const H = window.AIHub, handlers = new Map();
  const on = (ev, fn) => H.on(ev, fn);
  return {
    kind: 'hub', me: info.me, players: info.players, host: info.host, isHost: info.isHost, server: !!info.server, seed: info.seed,
    time: () => H.time(), rng: (label) => H.rng(label), send: (data, o) => H.send(data, o), on, ready: () => H.ready(), answer: (w) => H.answer(w), finish: (o) => H.finish(o), fail: (m) => H.fail(m), handlers,
  };
}
