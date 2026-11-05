/* ---- U: small math and text helpers; RNG: the simulation's and the presentation's random streams. The simulation
 * draws only from RNG.sim (seeded per match), so the same seed and inputs play the same game; particles, crowd and
 * commentary draw from RNG.fx ---- */
const U = (() => {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  /** distance from point (x, y) to segment a-b, and how far along it (0..1) */
  const segPt = (x, y, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((x - ax) * vx + (y - ay) * vy) / l, 0, 1); return { d: Math.hypot(ax + vx * u - x, ay + vy * u - y), u }; };
  /** first time t in 0..1 that a moving point p + v t comes within r of circle c (null if never) */
  const sweepCircle = (x, y, vx, vy, cx, cy, r) => {
    const fx = x - cx, fy = y - cy, a = vx * vx + vy * vy, b = 2 * (fx * vx + fy * vy), c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0; if (a < 1e-9) return null;
    const disc = b * b - 4 * a * c; if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a); return t >= 0 && t <= 1 ? t : null;
  };
  /** a roughly normal number (mean 0, sd 1) from a [0,1) stream */
  const gauss = r => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) * 1.732; };
  /** names for the pixel font: accents dropped, anything else outside ASCII becomes '?' (hub names are never HTML) */
  const sanitize = (s, n = 14) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').trim().slice(0, n) || 'PLAYER';
  const mmss = s => { s = Math.max(0, Math.ceil(s - 1e-6)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const shuffle = (r, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
  const ord = n => ['1ST', '2ND', '3RD'][n - 1] || (n + 'TH');
  const kmh = uPerS => Math.round(uPerS / 16 * 3.6);
  const smooth = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
  return { dist, angTo, angDiff, segPt, sweepCircle, gauss, sanitize, mmss, pick, shuffle, hashStr, fill, ord, kmh, smooth };
})();
const RNG = { sim: E.rng(1), fx: E.rng(2), seedN: 1, seed(n) { RNG.seedN = (n >>> 0) || 1; RNG.sim = E.rng(RNG.seedN); } };

/* ---- Bus: the simulation's events (Appendix B). on(type, fn) hears them for presentation (Fx, Talk, Crowd, the
 * replay's marks); sim(type, fn) for the rules (stats, objectives, BOOM). A network client re-plays the host's events
 * to the presentation only (present(e)) ---- */
const Bus = (() => {
  const pres = {}, rules = {}; let log = [], id = 0;
  const call = (map, e) => { for (const fn of (map[e.type] || []).concat(map['*'] || [])) try { fn(e); } catch (err) { game.fail('event ' + e.type, err); } };
  return {
    on(type, fn) { (pres[type] = pres[type] || []).push(fn); },
    sim(type, fn) { (rules[type] = rules[type] || []).push(fn); },
    emit(type, data = {}) {
      const e = Object.assign({ type, id: ++id, at: game.time }, data);
      log.push(e); if (log.length > 600) log.splice(0, 200);
      call(rules, e); if (!Bus.mute) call(pres, e);
      return e;
    },
    present(e) { call(pres, e); },
    log: () => log, reset() { log = []; }, mute: false, get lastId() { return id; }
  };
})();
