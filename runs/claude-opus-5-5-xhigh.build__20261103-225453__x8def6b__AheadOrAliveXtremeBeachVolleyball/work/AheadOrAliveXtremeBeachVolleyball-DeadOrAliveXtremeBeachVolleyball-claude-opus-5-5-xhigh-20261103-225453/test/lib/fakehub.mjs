// A fake AI Hub in Node: N copies of the game on one virtual clock, messages delayed by latency and jitter, unreliable
// ones lost at a rate. The host is copy 0 (or a server copy with no player of its own).
import { load } from './load.mjs';
export function makeSession(n, o = {}) {
  const S = { T: 0, copies: [], queue: [], startAt: null, latency: o.latency ?? 150, jitter: o.jitter ?? 50, loss: o.loss ?? .05, rng: mulberry(o.seed || 7), finished: null, sent: [], ended: false };
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: 'P' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const copies = o.server ? [{ me: 99, server: true }].concat(players.map(p => ({ me: p.id }))) : players.map(p => ({ me: p.id }));
  const hostMe = o.server ? 99 : 0;
  for (const c of copies) {
    const handlers = {}, held = [];
    const hub = {
      active: true, version: 'fake', me: c.me, players, host: hostMe, isHost: c.me === hostMe, server: !!c.server, seed: 1234, mode: 'shared-world',
      connect() { return Promise.resolve({ me: c.me, players, host: hostMe, isHost: c.me === hostMe, server: !!c.server, mode: 'shared-world', round: 1, limitMs: 300000, seed: 1234 }); },
      ready() { c.ready = true; }, answer(w) { c.answers = (c.answers || []).concat(w); },
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; },
      emit(ev, ...a) { for (const f of handlers[ev] || []) f(...a); },
      send(data, opts = {}) { if (S.ended) return false; const json = JSON.stringify(data), rel = opts.reliable !== false; S.sent.push({ from: c.me, at: S.T, bytes: json.length, rel }); if (!rel && S.rng() < S.loss) return true; for (const d of S.copies) if (d !== c && (opts.to === undefined || opts.to === d.me) && !d.left) S.queue.push({ to: d, from: c.me, data: JSON.parse(json), at: S.T + S.latency + (S.rng() * 2 - 1) * S.jitter, rel }); return true; },
      time() { return S.startAt === null ? -Infinity : S.T - S.startAt - 3000; },
      rng(label) { let h = 2166136261; for (const ch of label + ':1234') h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return mulberry(h >>> 0); },
      finish(out) { if (c.me === hostMe && !S.finished) S.finished = { out, T: S.T }; },
      result() {}, progress() {}, fail() {}
    };
    c.hub = hub; c.handlers = handlers;
    const L = load({ hub, perfNow: () => S.T, errors: [] }); c.game = L.game; c.G = L.G; c.E = L.E;
    S.copies.push(c);
  }
  S.flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  S.step = (dt = 1 / 120) => {
    S.T += dt * 1000;
    // deliver what is due; reliable messages in order per sender
    const due = S.queue.filter(m => m.at <= S.T).sort((a, b) => a.at - b.at); S.queue = S.queue.filter(m => m.at > S.T);
    for (const m of due) if (!m.to.left) m.to.hub.emit('message', m.data, m.from);
    for (const c of S.copies) if (!c.left) c.game.advance(dt);
  };
  S.start = () => { S.startAt = S.T; for (const c of S.copies) c.hub.emit('start', { in: 3000 }); };
  S.card = () => { for (const c of S.copies) c.hub.emit('card', { left: 5000, paused: false, starting: false, ready: [], asking: 0, asked: false }); };
  S.leave = id => { const c = S.copies.find(q => q.me === id); if (c) c.left = true; for (const d of S.copies) if (!d.left) d.hub.emit('leave', { id, reason: 'left' }); };
  S.timeUp = () => { for (const c of S.copies) if (!c.left) c.hub.emit('time-up', { graceMs: 5000 }); };
  S.end = () => { S.ended = true; for (const c of S.copies) if (!c.left) c.hub.emit('end', { reason: 'finished', standings: S.finished ? S.finished.out.standings : [] }); };
  return S;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
