/** One session shape for the hub, a solo table, and a same-computer link. */

function emitter() {
  const map = new Map();
  return {
    on(ev, fn) {
      const list = map.get(ev) || [];
      list.push(fn);
      map.set(ev, list);
    },
    emit(ev, payload, from) {
      for (const fn of map.get(ev) || []) fn(payload, from);
    },
  };
}

export function soloSession(rng) {
  const bus = emitter();
  const players = [0, 1, 2, 3].map((id) => ({
    id,
    name: id === 0 ? 'ASTER' : 'MERC ' + id,
    color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][id],
  }));
  const session = {
    kind: 'solo',
    me: 0,
    players,
    host: 0,
    isHost: true,
    server: false,
    seed: 1,
    ended: false,
    outcome: null,
    t: 0,
    time() { return session.t; },
    rng() { return { next: () => rng.next() }; },
    send() {},
    on: bus.on,
    emit: bus.emit,
    ready() {},
    answer() {},
    finish(outcome) {
      if (session.ended) return;
      session.outcome = outcome;
      session.ended = true;
    },
    fail() {},
  };
  return session;
}

export function hubSession(info) {
  const bus = emitter();
  const hub = globalThis.AIHub;
  const session = {
    kind: 'hub',
    me: info.me,
    players: info.players,
    host: info.host,
    isHost: !!info.isHost,
    server: !!info.server,
    seed: info.seed,
    ended: false,
    readied: false,
    time() { return hub.time(); },
    rng(label) {
      const fn = hub.rng(label);
      return { next: () => fn() };
    },
    send(data, opt) {
      if (session.ended) return false;
      return hub.send(data, opt);
    },
    on: bus.on,
    ready() {
      if (session.readied) return;
      session.readied = true;
      hub.ready();
    },
    answer(what) { hub.answer(what); },
    finish(outcome) {
      if (session.ended || !session.isHost) return;
      hub.finish(outcome);
    },
    fail(msg) { hub.fail(msg); },
  };
  for (const ev of ['card', 'start', 'time-up', 'end', 'leave', 'message']) {
    hub.on(ev, (payload, from) => {
      if (ev === 'end') session.ended = true;
      bus.emit(ev, payload, from);
    });
  }
  return session;
}

export function linkSession(role, rng) {
  const bus = emitter();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('a-cry-too-far-link-v1') : null;
  let me = role === 'host' ? 0 : 1;
  const session = {
    kind: 'link',
    me,
    players: [
      { id: 0, name: 'HOST', color: '#e8443a' },
      { id: 1, name: 'JOIN', color: '#3b82f6' },
    ],
    host: 0,
    isHost: role === 'host',
    server: false,
    seed: 1,
    ended: false,
    outcome: null,
    started: false,
    time() { return 0; },
    rng() { return { next: () => rng.next() }; },
    send(data) {
      if (session.ended || !channel) return;
      channel.postMessage({ from: session.me, data });
    },
    on: bus.on,
    emit: bus.emit,
    ready() {},
    answer() {},
    finish(outcome) {
      if (session.ended) return;
      session.outcome = outcome;
      session.send({ t: 'finish', outcome });
      session.ended = true;
    },
    fail() {},
    close() { channel?.close(); },
  };
  if (channel) {
    channel.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg || msg.from === session.me) return;
      if (msg.t === 'start' && !session.started) {
        session.started = true;
        session.seed = msg.seed;
        bus.emit('start', msg);
      } else if (msg.data) bus.emit('message', msg.data, msg.from);
    };
  }
  session.post = (msg) => channel?.postMessage({ ...msg, from: session.me });
  return session;
}
