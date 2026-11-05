// A fake AI Hub for the online suite: n copies of the game in their own vm contexts, one shared virtual clock, messages
// delivered after latency +- jitter (unreliable ones lost at the loss rate; reliable ones in order), the client's limits
// (16 KB, 20 a second with bursts of 40), the card, start, leave, time-up and end. hub.copies[i] = { game, KC, client }.
import { load } from './load.mjs';
export function makeHub(n, o = {}) {
  const H = { now: 0, q: [], copies: [], startAt: null, answers: { ready: new Set(), more: new Set() }, finished: null, ended: false, issues: [], rnd: 1 };
  const rand = () => { H.rnd = (H.rnd * 16807) % 2147483647; return H.rnd / 2147483647; };
  const server = !!o.server, ids = Array.from({ length: n }, (_, i) => i), players = ids.map(i => ({ id: i, name: 'Player ' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const hostId = server ? 99 : 0, copyIds = server ? [99].concat(ids) : ids.slice();
  const mkClient = me => {
    const h = {}, pend = {}, sent = []; let rate = [];
    const C = {
      active: true, version: '1.4.0', me, players, host: hostId, isHost: me === hostId, server: server && me === hostId, mode: 'shared-world', seed: 1234, round: 1, limitMs: 300000, seeded: false,
      connect(opts) { C.caps = opts; return Promise.resolve({ me, players, host: hostId, isHost: me === hostId, server: server && me === hostId, mode: 'shared-world', round: 1, limitMs: 300000, seed: 1234 }); },
      ready() { C.isReady = true; }, answer(a) { H.answers[a] && H.answers[a].add(me); },
      on(ev, fn) { (h[ev] = h[ev] || []).push(fn); if (pend[ev]) { const p = pend[ev]; delete pend[ev]; for (const a of p) fn(...a); } return () => {}; },
      emit(ev, ...a) { if (h[ev] && h[ev].length) for (const f of h[ev]) f(...a); else (pend[ev] = pend[ev] || []).push(a); },
      time() { return H.startAt === null ? -Infinity : H.now - H.startAt; },
      send(data, so = {}) {
        if (H.ended || C.gone) return false; const s = JSON.stringify(data); if (s.length > 16384) { H.issues.push(me + ': message over 16 KB'); return false; }
        rate = rate.filter(t => H.now - t < 1000); if (rate.length >= 20) { H.issues.push(me + ': over 20 messages a second'); return false; } rate.push(H.now); C.sentN = (C.sentN || 0) + 1; sent.push(s.length);
        for (const to of copyIds) { if (to === me || (so.to !== undefined && so.to !== to)) continue; const rel = so.reliable !== false; if (!rel && rand() < (o.loss || 0) / 100) continue; let at = H.now + (o.latency || 0) + (rand() * 2 - 1) * (o.jitter || 0); if (rel) { const last = H.q.filter(m => m.to === to && m.from === me && m.rel).reduce((a, m) => Math.max(a, m.at), 0); at = Math.max(at, last); } H.q.push({ at, to, from: me, data: JSON.parse(s), rel }); }
        return true;
      },
      finish(r) { if (me !== hostId) H.issues.push(me + ': finish() from a non-host'); H.finished = r; H.endAll('finished', r.standings); },
      rng(label) { let x = 7; for (const c of String(label)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; }; },
      progress() {}, result() {}, fail(m) { H.issues.push(me + ': fail ' + m); }, sent
    };
    return C;
  };
  for (const id of copyIds) { const client = mkClient(id), L = load({ hub: client, clock: () => H.now }); L.game.fadeTime = 0; H.copies.push(Object.assign(L, { client, id })); }
  H.copy = id => H.copies.find(c => c.id === id);
  H.endAll = (reason, standings) => { if (H.ended) return; H.ended = true; for (const c of H.copies) if (!c.client.gone) c.client.emit('end', { reason, standings }); };
  H.card = () => { const ready = [...H.answers.ready]; for (const c of H.copies) c.client.emit('card', { left: Math.max(0, 15000 - H.now), paused: false, starting: false, ready, asking: 0, asked: false }); };
  H.start = () => { H.startAt = H.now + 3000; for (const c of H.copies) c.client.emit('start', { in: 3000 }); };
  H.leave = id => { const c = H.copy(id); c.client.gone = true; H.q = H.q.filter(m => m.to !== id && m.from !== id); for (const x of H.copies) if (!x.client.gone) x.client.emit('leave', { id, reason: 'left' }); if (id === hostId) H.endAll('host-left', null); };
  H.timeUp = () => { for (const c of H.copies) if (!c.client.gone) c.client.emit('time-up', { graceMs: 3000 }); };
  H.step = (dt = 1 / 120) => {
    H.now += dt * 1000;
    const due = H.q.filter(m => m.at <= H.now).sort((a, b) => a.at - b.at); H.q = H.q.filter(m => m.at > H.now);
    for (const m of due) { const c = H.copy(m.to); if (c && !c.client.gone) c.client.emit('message', m.data, m.from); }
    for (const c of H.copies) if (!c.client.gone) c.game.advance(dt);
  };
  H.run = (s, until) => { for (let i = 0; i < s * 120 && !(until && until()); i++) H.step(); };
  H.settle = () => new Promise(r => setTimeout(r, 0));
  return H;
}
