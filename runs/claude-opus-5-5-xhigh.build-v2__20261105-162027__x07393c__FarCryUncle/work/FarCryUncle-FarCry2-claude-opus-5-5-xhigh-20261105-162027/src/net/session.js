// One interface, three implementations, so round code never knows which: hub (hubSession.js), solo and link.
// { kind, me, players:[{id,name,color}], host, isHost, server, time(), rng(label), send(data,{to,reliable}), on(event,fn), ready(), answer(what), finish(outcome), fail(msg) }
import { Rng } from '../../pixel-engine.js';
export const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
class Emitter {
  handlers = new Map();
  on(ev, fn) { if (!this.handlers.has(ev)) this.handlers.set(ev, new Set()); this.handlers.get(ev).add(fn); return () => this.handlers.get(ev).delete(fn); }
  fire(ev, ...args) { const s = this.handlers.get(ev); if (s) for (const fn of [...s]) fn(...args); }
}
/** On its own: host is you, the other seats are AI mercs, with our own results screen. */
export function soloSession(seed = 1) {
  const em = new Emitter();
  let startAt = null, elapsed = 0;
  const s = {
    kind: 'solo', me: 0, players: [{ id: 0, name: 'YOU', color: SEAT_COLORS[0] }, { id: 1, name: 'INES', color: SEAT_COLORS[1], ai: true }, { id: 2, name: 'DOV', color: SEAT_COLORS[2], ai: true }, { id: 3, name: 'MAGS', color: SEAT_COLORS[3], ai: true }],
    host: 0, isHost: true, server: false, limitMs: 360000, seed,
    time: () => (startAt === null ? -Infinity : elapsed),
    rng: (label) => { const r = new Rng(`${seed}:${label}`); return () => r.next(); },
    send() { return true; }, on: (ev, fn) => em.on(ev, fn), ready() {}, answer() {}, finish(outcome) { s.outcome = outcome; em.fire('end', { reason: 'finished', standings: outcome.standings }); }, fail() {},
    /** Driven by the game's fixed step so tests can run it fast. */
    advance(dtMs) {
      if (startAt === null) { startAt = 0; elapsed = -3000; em.fire('start', { in: 3000 }); return; }
      elapsed += dtMs;
      if (elapsed >= s.limitMs && !s.timeUpSent) { s.timeUpSent = true; em.fire('time-up', { graceMs: 5000 }); }
    },
  };
  return s;
}
/** On its own with a friend on the same computer: BroadcastChannel between two windows. */
export function linkSession(role, name = 'PLAYER') {
  const em = new Emitter();
  const ch = new BroadcastChannel('game-link-v1');
  const uid = `${Date.now().toString(36)}${Math.floor(performance.now()).toString(36)}`;
  let base = null, started = false;
  const s = {
    kind: 'link', role, me: role === 'host' ? 0 : -1, players: role === 'host' ? [{ id: 0, name: 'HOST', color: SEAT_COLORS[0] }] : [], host: 0, isHost: role === 'host', server: false, limitMs: 360000, seed: 1,
    joined: false,
    time: () => (base === null ? -Infinity : Date.now() - base),
    rng: (label) => { const r = new Rng(`${s.seed}:${label}`); return () => r.next(); },
    send(data, o = {}) { ch.postMessage({ k: 'm', from: s.me, to: o.to ?? null, data }); return true; }, on: (ev, fn) => em.on(ev, fn), ready() {}, answer() {},
    finish(outcome) { s.outcome = outcome; ch.postMessage({ k: 'end', outcome }); em.fire('end', { reason: 'finished', standings: outcome.standings }); }, fail() {},
    begin() { if (!s.isHost || started) return; started = true; base = Date.now() + 3000; s.seed = base % 100000; ch.postMessage({ k: 'start', base, seed: s.seed, players: s.players }); em.fire('start', { in: 3000 }); },
    advance() { if (started && s.time() >= s.limitMs && !s.timeUpSent) { s.timeUpSent = true; em.fire('time-up', { graceMs: 5000 }); } },
    close() { ch.close(); },
  };
  ch.onmessage = (e) => {
    const m = e.data;
    if (m.k === 'hello' && s.isHost && !started && s.players.length < 4) {
      const id = s.players.length;
      s.players.push({ id, name: `PLAYER ${id + 1}`, color: SEAT_COLORS[id], uid: m.uid });
      ch.postMessage({ k: 'welcome', uid: m.uid, id, players: s.players });
      em.fire('lobby');
    } else if (m.k === 'welcome' && m.uid === uid) { s.me = m.id; s.players = m.players; s.joined = true; em.fire('lobby'); }
    else if (m.k === 'welcome' && s.joined) { s.players = m.players; em.fire('lobby'); }
    else if (m.k === 'start' && !s.isHost) { base = m.base; s.seed = m.seed; s.players = m.players; started = true; em.fire('start', { in: base - Date.now() }); }
    else if (m.k === 'm' && (m.to == null || m.to === s.me) && m.from !== s.me) em.fire('message', m.data, m.from);
    else if (m.k === 'end' && !s.isHost) { s.outcome = m.outcome; em.fire('end', { reason: 'finished', standings: m.outcome.standings }); }
  };
  if (role !== 'host') { const hello = () => { if (!s.joined) ch.postMessage({ k: 'hello', uid }); }; hello(); s.helloTimer = setInterval(hello, 500); }
  return s;
}
