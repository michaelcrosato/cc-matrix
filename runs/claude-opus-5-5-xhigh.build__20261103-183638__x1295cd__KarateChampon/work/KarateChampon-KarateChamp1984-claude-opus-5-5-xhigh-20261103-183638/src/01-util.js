/* ---- UTIL: hashing, seeded streams, formatting, a tiny event bus ---- */
KC.hash = s => { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
KC.rng = seed => E.rng((seed >>> 0) || 1);
KC.pad = (n, w = 7) => String(Math.max(0, Math.round(n))).padStart(w, '0');
KC.commas = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// a name from outside (the AI Hub) for the pixel font: upper case, the font's characters only, 10 at most, never HTML
KC.cleanName = s => String(s || '').toUpperCase().replace(/[^A-Z0-9 .\-!?']/g, '?').slice(0, 10) || 'PLAYER';
KC.ease = { out: t => 1 - (1 - t) * (1 - t), inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
// a small event bus: on(name, fn) -> off(); emit(name, data)
KC.Bus = class {
  constructor() { this._h = {}; }
  on(k, fn) { (this._h[k] || (this._h[k] = [])).push(fn); return () => { this._h[k] = this._h[k].filter(f => f !== fn); }; }
  emit(k, d) { const L = this._h[k]; if (L) for (const f of L.slice()) f(d); const A = this._h['*']; if (A) for (const f of A.slice()) f(k, d); }
};
// directions: screen ('l', 'r', 'u', 'd', 'n') and relative to the foe ('f' toward, 'b' away, 'u', 'd', 'n')
KC.relDir = (d, face) => d === 'l' ? (face < 0 ? 'f' : 'b') : d === 'r' ? (face > 0 ? 'f' : 'b') : d;
KC.scrDir = (d, face) => d === 'f' ? (face > 0 ? 'r' : 'l') : d === 'b' ? (face > 0 ? 'l' : 'r') : d;
KC.DIRS = ['n', 'u', 'd', 'l', 'r'];
KC.store = {
  get: (k, d) => { try { const v = E.store.get('kc:' + k, d); return v === undefined ? d : v; } catch (e) { return d; } },
  set: (k, v) => { try { E.store.set('kc:' + k, v); } catch (e) { /* storage blocked: kept for the visit by E.store */ } }
};
