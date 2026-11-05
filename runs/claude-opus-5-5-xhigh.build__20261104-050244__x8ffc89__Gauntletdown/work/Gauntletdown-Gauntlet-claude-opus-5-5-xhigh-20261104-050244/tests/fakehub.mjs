// A fake AI Hub for Node: N game copies on one virtual clock, a simulated network (latency, jitter, loss, reliable
// messages in order), the card, the start, time-up and the end, and a log of every message for the checks.
import { boot, seeded } from './lib.mjs';
export function hubRound(o = {}) {
  const n = o.players || 2, R = seeded(o.seed || 99), net = { now: 0, q: [], log: [], finishes: [], ends: [], copies: [], startAt: Infinity, playAt: Infinity };
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: ['Ana', 'Bo', 'Cy', 'Di'][i], color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const server = !!o.server, hostId = server ? 9 : 0;
  const copyIds = server ? [...players.map(p => p.id), 9] : players.map(p => p.id);
  for (const me of copyIds) {
    const handlers = {}, pending = {};
    const hub = {
      active: true, version: '1.4.0', protocol: 1, me, host: hostId, isHost: me === hostId, server: server && me === hostId, players: players.slice(), mode: 'shared-world', seed: 4242, limitMs: o.limitMs || 360000, round: 1, seeded: false,
      connect() { return Promise.resolve({ me, host: hostId, isHost: me === hostId, server: server && me === hostId, players: players.slice(), mode: 'shared-world', seed: 4242, limitMs: hub.limitMs, round: 1 }); },
      ready() { copy.ready = true; }, answer(a) { copy.answers.push(a); },
      time() { return net.now < net.startAt ? -Infinity : net.now - net.playAt; },
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); for (const a of pending[ev] || []) fn(...a); delete pending[ev]; return () => {}; },
      emit(ev, ...a) { if (copy.gone) return; if (!handlers[ev]) { (pending[ev] = pending[ev] || []).push(a); return; } for (const fn of handlers[ev]) fn(...a); },
      send(data, opts = {}) {
        if (copy.ended || copy.gone) return false;
        const text = JSON.stringify(data); if (text.length > 16384) { copy.oversize++; return false; }
        const sec = Math.floor(net.now / 1000); copy.perSec[sec] = (copy.perSec[sec] || 0) + 1;
        const reliable = opts.reliable !== false;
        for (const c of net.copies) {
          if (c === copy || c.gone || (opts.to !== undefined && opts.to !== null && c.me !== opts.to)) continue;
          if (!reliable && R() < (o.loss || 0) / 100) { net.log.push({ from: me, to: c.me, t: data.t, lost: true }); continue; }
          let at = net.now + (o.latency || 0) + R() * (o.jitter || 0);
          if (reliable) { const last = c.lastReliable[me] || 0; at = Math.max(at, last + .01); c.lastReliable[me] = at; }
          net.q.push({ at, to: c, from: me, data: JSON.parse(text) });
        }
        net.log.push({ from: me, t: data.t, bytes: text.length, reliable, at: net.now });
        copy.sent++; return true;
      },
      finish(r) { net.finishes.push({ by: me, at: net.now, r }); },
      rng(label) { return seeded(4242 + label.length * 7); }, fail() { }
    };
    const copy = { me, hub, ready: false, answers: [], sent: 0, perSec: {}, oversize: 0, lastReliable: {}, ended: false, gone: false };
    copy.t = boot({ hub, seed: 100 + me });
    net.copies.push(copy);
  }
  const deliver = () => { net.q.sort((a, b) => a.at - b.at); while (net.q.length && net.q[0].at <= net.now) { const m = net.q.shift(); if (!m.to.gone && !m.to.ended) m.to.hub.emit('message', m.data, m.from); } };
  net.step = async (secs = 1 / 60) => {
    const k = Math.round(secs * 60);
    for (let i = 0; i < k; i++) { net.now += 1000 / 60; for (const c of net.copies) if (!c.gone) c.t.game.advance(1 / 60); deliver(); await null; }
  };
  net.card = () => { for (const c of net.copies) c.hub.emit('card', { left: 10000, paused: false, starting: false, ready: net.copies.filter(q => q.answers.includes('ready')).map(q => q.me), asking: 0, asked: false }); };
  net.start = () => { net.startAt = net.now; net.playAt = net.now + 3000; for (const c of net.copies) c.hub.emit('start', { in: 3000 }); };
  net.timeUp = () => { for (const c of net.copies) c.hub.emit('time-up', { graceMs: 5000 }); };
  net.end = (reason = 'finished', standings = null) => { for (const c of net.copies) { if (c.gone) continue; c.hub.emit('end', { reason, standings }); c.ended = true; } };
  net.leave = id => { const c = net.copies.find(q => q.me === id); if (c) c.gone = true; for (const q of net.copies) if (!q.gone) { q.hub.players = q.hub.players.filter(p => p.id !== id); q.hub.emit('leave', { id, reason: 'left' }); } };
  net.copy = id => net.copies.find(c => c.me === id);
  return net;
}
