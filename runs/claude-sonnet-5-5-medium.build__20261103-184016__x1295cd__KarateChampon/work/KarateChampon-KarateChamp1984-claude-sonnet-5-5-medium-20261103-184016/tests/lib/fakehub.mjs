// an in-process AI Hub: a bus with a shared clock, latency, jitter, loss and the 20/s limiter; each copy is a game in its own vm context
import { loadGame } from './load.mjs';
export class Bus {
  constructor(o = {}) { this.o = Object.assign({ latency: 0, jitter: 0, loss: 0, n: 2, server: false }, o); this.now = -3000; this.copies = []; this.q = []; this.rnd = (() => { let s = 12345; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })(); this.finished = null; this.ended = false; this.log = []; this.startAt = null; }
  addCopy(id, role) {
    const bus = this, listeners = {}, pending = [], sent = []; const players = Array.from({ length: this.o.n }, (_, i) => ({ id: i, name: 'Player' + i, color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
    const hub = { active: true, me: role === 'server' ? 99 : id, players, host: 0, isHost: role === 'host' || role === 'server', server: role === 'server', mode: 'shared-world', round: 1, seed: 7, limitMs: 300000,
      connect(o) { hub.connectOpts = o; return Promise.resolve(hub); }, ready() { hub.readied = true; }, answer(a) { hub.answers = (hub.answers || []).concat(a); }, time() { return bus.startAt === null ? -Infinity : bus.now; },
      on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); (pending.filter(p => p[0] === ev)).forEach(p => fn(...p[1])); return () => { }; },
      emit(ev, ...a) { if (listeners[ev]) listeners[ev].forEach(fn => fn(...a)); else pending.push([ev, a]); },
      send(data, o = {}) { if (bus.ended && !hub.allowAfterEnd) { hub.sentAfterEnd = (hub.sentAfterEnd || 0) + 1; return false; } const now = bus.now; hub.stamps = (hub.stamps || []).filter(t => now - t < 1000); hub.tokens = hub.tokens === undefined ? 40 : hub.tokens; hub.tokens = Math.min(40, hub.tokens + (now - (hub.lastTok || now)) / 50); hub.lastTok = now; if (hub.tokens < 1) { hub.dropped = (hub.dropped || 0) + 1; return false; } hub.tokens--; const js = JSON.stringify(data); if (js.length > 16384) { hub.oversize = (hub.oversize || 0) + 1; return false; } hub.stamps.push(now); hub.max = Math.max(hub.max || 0, hub.stamps.length); sent.push(now); bus.route(hub.me, JSON.parse(js), o); return true; },
      finish(r) { bus.finished = r; bus.log.push('finish'); }, rng() { return () => .5; }, seeded: false, fail() { } };
    this.copies.push({ id, role, hub, sent }); return hub;
  }
  route(from, data, o) { for (const c of this.copies) { if (c.hub.me === from) continue; if (o.to !== undefined && c.hub.me !== o.to) continue; if (!o.reliable && o.reliable !== undefined && this.rnd() < this.o.loss) continue; const at = this.now + this.o.latency + this.rnd() * this.o.jitter; this.q.push({ at, c, data, from }); } this.q.sort((a, b) => a.at - b.at); }
  pump() { while (this.q.length && this.q[0].at <= this.now) { const m = this.q.shift(); if (!this.ended) m.c.hub.emit('message', m.data, m.from); } }
}
/** spin up copies: roles = ['host', 'guest', ...] ; returns { bus, games } with the game scene 'session' running */
export async function session(o = {}) {
  const roles = o.roles || ['host', 'guest'], bus = new Bus(Object.assign({ n: roles.filter(r => r !== 'server').length }, o)), games = [];
  roles.forEach((r, i) => { const id = r === 'server' ? 99 : roles.slice(0, i).filter(x => x !== 'server').length; let hubRef; const G = loadGame({ pre: ctx => { hubRef = bus.addCopy(id, r); ctx.AIHub = hubRef; } }); G.hub = hubRef; G.role = r; G.pid = id; games.push(G); });
  return { bus, games };
}
export const tick = (S, ms = 16.67, nsteps = 1) => { for (let i = 0; i < nsteps; i++) { S.bus.now += ms; S.bus.pump(); S.games.forEach(G => G.game.advance(ms / 1000)); } };
