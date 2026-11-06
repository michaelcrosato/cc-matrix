// linkSession: two windows of one browser play Cash Run through a BroadcastChannel. Same interface as the hub's session.
const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
export function openLobby(role) {
  const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('game-link-v1') : null;
  const L = { role, ch, state: 'open', joined: false, peer: null, start: null, token: String((typeof performance !== 'undefined' ? performance.now() : 0) + role) + Math.floor(Date.now() % 100000) };
  if (ch) ch.onmessage = (ev) => {
    const m = ev.data; if (!m || m.k === 'g') return;
    if (role === 'host' && m.k === 'join' && !L.joined) { L.joined = true; L.peer = m.token; ch.postMessage({ k: 'welcome', to: m.token }); }
    else if (role === 'join' && m.k === 'welcome' && m.to === L.token) { L.joined = true; }
    else if (role === 'join' && m.k === 'start') { L.start = m; }
    else if (role === 'host' && m.k === 'join') ch.postMessage({ k: 'welcome', to: m.token });
  };
  L.poll = () => { if (role === 'join' && !L.joined) ch?.postMessage({ k: 'join', token: L.token }); };
  L.go = () => { if (role !== 'host' || !L.joined) return null; const m = { k: 'start', base: Date.now() + 500, seed: 4242 }; ch.postMessage(m); L.start = m; return m; };
  L.close = () => { try { ch?.close(); } catch { /* closed */ } };
  return L;
}
export function linkSession(g, L) {
  const host = L.role === 'host', ch = L.ch; const ls = new Map(); const emit = (ev, ...a) => (ls.get(ev) || []).forEach((f) => f(...a));
  const players = [{ id: 0, name: 'HOST', color: COLORS[0] }, { id: 1, name: 'GUEST', color: COLORS[1] }]; const me = host ? 0 : 1;
  const base = L.start.base; let timeUp = false, over = false, started = false;
  ch.onmessage = (ev) => {
    const m = ev.data; if (!m) return;
    if (m.k === 'g' && (m.to === undefined || m.to === me) && m.from !== me) emit('message', m.d, m.from);
    else if (m.k === 'end') { if (!over) { over = true; S.results = m.res; emit('end', { reason: 'finished' }); g.round?.showResults?.(m.res); } }
  };
  const S = {
    kind: 'link', me, players, host: 0, isHost: host, server: false, limitMs: 360000, seed: L.start.seed,
    time: () => (started ? Date.now() - base - 3000 : -Infinity), rng: (label) => { let h = L.start.seed; for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }; },
    send(d, o = {}) { ch.postMessage({ k: 'g', from: me, to: o.to, d }); return true; }, on(ev, f) { if (!ls.has(ev)) ls.set(ev, []); ls.get(ev).push(f); }, ready() { started = true; emit('start', { in: 3000 }); },
    answer() {}, fail() {}, progress() {},
    finish(res) { if (over) return; over = true; S.results = res; ch.postMessage({ k: 'end', res }); g.round?.showResults?.(res); },
    tick() { if (host && started && !timeUp && S.time() >= S.limitMs) { timeUp = true; emit('time-up', { graceMs: 5000 }); } },
    emit,
  };
  return S;
}
