// Ghosts: compact recordings of a run ([t, x, y, z, facing, pose, extra] at 20 Hz), interpolated for playback. Used for
// the leader's run in the downhill and bobsled, the previous thrower's flight, your best local run, and the AI Hub's
// other players (whose samples arrive over the network in the same shape).
(() => {
'use strict';
const O = OLY;
O.Ghost = {
  rec() { return { s: [], t: 0, next: 0 }; },
  /** add a sample when due: O.Ghost.push(track, t, [x, y, z, facing, pose, extra]) */
  push(tr, t, v) { if (!tr || t < tr.next) return; tr.next = t + .05; if (tr.s.length < 3000) tr.s.push([+t.toFixed(3)].concat(v.map(n => typeof n === 'number' ? +n.toFixed(2) : n))); },
  /** the interpolated sample at time t (null before the first) */
  at(tr, t) {
    const s = tr && (tr.s || tr); if (!s || !s.length) return null;
    if (t <= s[0][0]) return s[0]; if (t >= s[s.length - 1][0]) return s[s.length - 1];
    let lo = 0, hi = s.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m][0] <= t) lo = m; else hi = m; }
    const a = s[lo], b = s[hi], k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    return a.map((v, i) => typeof v === 'number' && typeof b[i] === 'number' && i !== 5 ? v + (b[i] - v) * k : (k < .5 ? v : b[i]));
  },
  save(ev, tr) { if (!O.meet || O.meet.mode === 'attract' || O.inHub) return; O.store.set('ghost:' + ev, { s: tr.s.slice(0, 3000) }); },
  load(ev) { return O.store.get('ghost:' + ev, null); },
  clearAll() { for (const id of Object.keys(O.EVENTS)) O.store.set('ghost:' + id, null); }
};
})();
