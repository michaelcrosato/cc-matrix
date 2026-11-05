// An in-process AI Hub for tests: n copies of the game, each with an AIHub stand-in (connect, ready, answer, time, on,
// send, finish, rng), wired through a simulated network (latency, jitter, loss for unreliable messages).
import { fresh } from './h.mjs';
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export async function hub(n, o = {}) {
  const { latency = 30, jitter = 0, loss = 0, server = false, limitMs = 0, seed = 4242 } = o;
  const now = { ms: 0 }, rnd = mulberry(seed), queue = [], ready = new Set(), finished = [], copies = [], sentBytes = [];
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: ['Ana', 'Bo', 'Céline', 'Dev'][i], color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const host = server ? n : 0;
  let startAt = Infinity, ended = false;
  const make = me => {
    const handlers = {}, pending = {};
    const api = {
      active: true, version: '1.4.0', me,
      connect: async q => { api.mode = q.mode; api.card = q.card; return { me, players, host, isHost: me === host, server: server && me === host, mode: q.mode, round: 1, limitMs, seed }; },
      ready() { ready.add(me); if (ready.size === copies.length) { startAt = now.ms + 3000; for (const c of copies) c.api._emit('start', { in: 3000 }); } },
      answer(a) { api.answers = (api.answers || []).concat(a); },
      time: () => startAt === Infinity ? -Infinity : now.ms - startAt,
      on(ev, f) { (handlers[ev] = handlers[ev] || []).push(f); const p = pending[ev]; if (p) { delete pending[ev]; for (const a of p) f(...a); } return () => { handlers[ev] = handlers[ev].filter(g => g !== f); }; },
      _emit(ev, ...a) { if (handlers[ev] && handlers[ev].length) for (const f of handlers[ev].slice()) f(...a); else (pending[ev] = pending[ev] || []).push(a); },
      send(data, q = {}) {
        const json = JSON.stringify(data); if (q.reliable === false) sentBytes.push([me, json.length]);
        for (const c of copies) { if (c.me === me || c.gone || (q.to !== undefined && q.to !== c.me)) continue; if (q.reliable === false && rnd() < loss) continue; queue.push({ at: now.ms + latency + jitter * (rnd() * 2 - 1) * (q.reliable === false ? 1 : 0), to: c.me, from: me, data: JSON.parse(json) }); }
        api.sent = (api.sent || 0) + 1; return true;
      },
      finish(r) { finished.push(Object.assign({ from: me }, r)); },
      rng(label) { return mulberry(hash(seed + ':' + label)); },
      progress() {}, result() {}, fail(m) { api.failed = m; }
    };
    return api;
  };
  const ids = players.map(p => p.id).concat(server ? [n] : []);
  for (const me of ids) { const api = make(me); const L = fresh({ AIHub: api }); copies.push({ me, api, L, gone: false }); }
  await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  const H = {
    copies, finished, sentBytes, now, players,
    copy: me => copies.find(c => c.me === me),
    step(dt = 1 / 120) {
      now.ms += dt * 1000;
      for (const c of copies) if (!c.gone) c.L.game.advance(dt);
      queue.sort((a, b) => a.at - b.at);
      while (queue.length && queue[0].at <= now.ms) { const q = queue.shift(); const c = copies.find(k => k.me === q.to); if (c && !c.gone) c.api._emit('message', q.data, q.from); }
    },
    run(s) { const n0 = Math.round(s * 120); for (let i = 0; i < n0; i++) H.step(); },
    card(left = 10000) { for (const c of copies) c.api._emit('card', { left, paused: false, starting: false, ready: [...ready], asking: 0, asked: false }); },
    leave(id, reason = 'left') { const c = H.copy(id); c.gone = true; for (const k of copies) if (!k.gone) k.api._emit('leave', { id, reason }); },
    timeUp(graceMs = 5000) { for (const c of copies) if (!c.gone) c.api._emit('time-up', { graceMs }); },
    end(reason = 'finished') { ended = true; for (const c of copies) if (!c.gone) c.api._emit('end', { reason, standings: finished.length ? finished[0].standings : [] }); }
  };
  return H;
}
