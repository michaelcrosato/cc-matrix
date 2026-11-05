// A fake AI Hub for the net tests: N copies of the game, each given its own AIHub object, joined by a bus with latency,
// jitter and loss for unreliable messages, in-order reliable delivery, a 20/s burst-40 limiter, the 16 KB limit, and the
// card -> start -> time-up -> end flow on a shared virtual clock.
export function makeHub(n, o = {}) {
  const H = { now: 0, n, players: [], copies: [], queue: [], startAt: null, finished: null, ended: false, log: [], sent: {}, server: !!o.server, hostLeft: false, limitMs: o.limitMs || 200000, rngSeed: o.seed || 12345 };
  const ids = [...Array(n).keys()];
  H.players = ids.map(i => ({ id: i, name: 'P' + i, color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const rand = (() => { let s = 99; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
  const mkRng = label => { let h = H.rngSeed; for (const ch of label) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; };
  const copies = (H.server ? [-1] : []).concat(ids);
  for (const me of copies) {
    const handlers = {}, pend = [], bucket = { t: 0, tokens: 40 };
    const api = {
      active: true, seeded: false, me, isHost: me === (H.server ? -1 : 0), host: H.server ? -1 : 0, server: me === -1, players: H.players,
      connect: async () => { const info = { me, players: H.players, host: H.server ? -1 : 0, isHost: me === (H.server ? -1 : 0), server: me === -1, mode: 'shared-world', round: 1, limitMs: H.limitMs, seed: H.rngSeed }; Object.assign(api, info); return info; },
      ready() { api._ready = true; }, answer(a) { H.log.push(['answer', me, a]); },
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); for (const p of pend.filter(p => p[0] === ev)) fn(...p[1]); return () => {}; },
      time() { return H.startAt === null ? -Infinity : H.now - H.startAt - 3000; },
      rng: mkRng,
      send(data, opt = {}) {
        if (H.ended || api._left) return false;
        const js = JSON.stringify(data); if (js.length > 16384) return false;
        bucket.tokens = Math.min(40, bucket.tokens + (H.now - bucket.t) / 1000 * 20); bucket.t = H.now; if (bucket.tokens < 1) { H.log.push(['limited', me]); return false; } bucket.tokens--;
        (H.sent[me] = H.sent[me] || []).push({ t: H.now, len: js.length, kind: data.t, reliable: opt.reliable !== false });
        const tos = opt.to !== undefined ? [opt.to] : copies.filter(c => c !== me);
        for (const to of tos) { if (opt.reliable === false && (rand() < (o.loss || 0) || js.length > 1200 && rand() < .3)) continue; const lat = (o.latency || 0) + (rand() - .5) * 2 * (o.jitter || 0); H.queue.push({ at: H.now + Math.max(0, lat), to, from: me, data: JSON.parse(js), rel: opt.reliable !== false }); }
        return true;
      },
      finish(r) { if (H.finished) H.log.push(['finish twice']); H.finished = r; H.log.push(['finish', me, JSON.stringify(r.standings)]); },
      result() {}, progress() {}, fail(msg) { H.log.push(['fail', me, msg]); },
      _emit(ev, ...args) { if (handlers[ev]) for (const f of handlers[ev]) f(...args); else pend.push([ev, args]); }
    };
    H.copies.push({ me, api });
  }
  H.api = me => H.copies.find(c => c.me === me).api;
  H.tick = ms => {
    H.now += ms;
    H.queue.sort((a, b) => a.at - b.at);
    while (H.queue.length && H.queue[0].at <= H.now) { const q = H.queue.shift(); const c = H.copies.find(c => c.me === q.to); if (c && !c.api._left && !H.ended) c.api._emit('message', q.data, q.from); }
    if (H.startAt === null && H.copies.every(c => c.api._ready)) { H.startAt = H.now; for (const c of H.copies) c.api._emit('start', { in: 3000 }); }
    if (!H.ended && H.finished) { H.ended = true; for (const c of H.copies) if (!c.api._left) c.api._emit('end', { reason: 'finished', standings: H.finished.standings }); }
  };
  H.timeUp = () => { for (const c of H.copies) if (!c.api._left) c.api._emit('time-up', { graceMs: 5000 }); };
  H.leave = id => { const c = H.copies.find(c => c.me === id); c.api._left = true; for (const d of H.copies) if (d.me !== id && !d.api._left) d.api._emit('leave', { id, reason: 'left' }); if (id === (H.server ? -1 : 0)) { H.ended = true; for (const d of H.copies) if (!d.api._left) d.api._emit('end', { reason: 'host-left' }); } };
  return H;
}
