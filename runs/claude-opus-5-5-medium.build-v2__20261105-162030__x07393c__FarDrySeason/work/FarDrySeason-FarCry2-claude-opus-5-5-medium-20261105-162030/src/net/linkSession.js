import { rngOf } from '../core/rng.js';
import { COLORS, Emitter } from './session.js';

/** On your own with a friend on one computer: BroadcastChannel between two windows. */
export function linkSession({ host: isHost, name }) {
  const e = Emitter(), ch = new BroadcastChannel('game-link-v1'), me = isHost ? 0 : 1;
  const s = { kind: 'link', me, players: [{ id: 0, name: 'HOST', color: COLORS[0] }, { id: 1, name: 'GUEST', color: COLORS[1] }], host: 0, isHost, server: false, seed: 11, base: null, joined: false, started: false,
    time: () => (s.base === null ? -Infinity : Date.now() - s.base), rng: (l) => rngOf(s.seed, l),
    send(data, o = {}) { ch.postMessage({ t: 'd', from: me, to: o.to ?? null, data }); return true; }, on: e.on, ready() {}, answer() {}, fail() {},
    finish(o) { ch.postMessage({ t: 'end', standings: o.standings, scores: o.scores }); e.emit('end', { reason: 'finished', standings: o.standings, scores: o.scores }); },
    start() { if (!isHost || s.started) return; s.started = true; s.base = Date.now() + 3000; ch.postMessage({ t: 'start', base: s.base, seed: s.seed }); e.emit('start', { in: 3000 }); },
    close() { ch.postMessage({ t: 'bye', from: me }); ch.close(); }, emit: e.emit };
  ch.onmessage = (ev) => {
    const m = ev.data;
    if (m.t === 'hello' && isHost) { s.joined = true; ch.postMessage({ t: 'welcome' }); e.emit('joined'); }
    if (m.t === 'welcome' && !isHost) { s.joined = true; e.emit('joined'); }
    if (m.t === 'start') { s.base = m.base; s.seed = m.seed; s.started = true; e.emit('start', { in: m.base - Date.now() }); }
    if (m.t === 'd' && m.from !== me && (m.to === null || m.to === me)) e.emit('message', m.data, m.from);
    if (m.t === 'bye') e.emit('leave', { id: m.from, reason: 'left' });
    if (m.t === 'end') e.emit('end', { reason: 'finished', standings: m.standings, scores: m.scores });
  };
  if (!isHost) { const hi = setInterval(() => { if (s.joined) clearInterval(hi); else ch.postMessage({ t: 'hello', name }); }, 300); }
  return s;
}
