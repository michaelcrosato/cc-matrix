// soloSession: the same interface as the hub's, for playing Cash Run on your own with hired guns.
export const BOT_NAMES = ['IRIS', 'MOSS', 'TEAL'];
export function soloSession(g) {
  const ls = new Map(); const emit = (ev, ...a) => (ls.get(ev) || []).forEach((f) => f(...a));
  const colors = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
  const players = [{ id: 0, name: 'YOU', color: colors[0], bot: false }, ...BOT_NAMES.map((n, i) => ({ id: i + 1, name: n, color: colors[i + 1], bot: true }))];
  let t = -3000, started = false, over = false;
  const S = {
    kind: 'solo', me: 0, players, host: 0, isHost: true, server: false, limitMs: 360000, seed: 12345,
    time: () => (started ? t : -Infinity), rng: (label) => { let h = 7; for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; }; },
    send() { return false; }, on(ev, f) { if (!ls.has(ev)) ls.set(ev, []); ls.get(ev).push(f); }, ready() { started = true; emit('start', { in: 3000 }); },
    answer() {}, fail() {}, progress() {},
    finish(res) { if (over) return; over = true; S.results = res; g.round?.showResults?.(res); },
    tick(dtMs) { if (!started || over) return; t += dtMs; if (t >= S.limitMs && !S.timeUp) { S.timeUp = true; emit('time-up', { graceMs: 5000 }); } },
    emit,
  };
  return S;
}
