// SNIPEOUT HD: the core. The SN namespace, units, vector math and frames, random streams, hashes, the live tuning
// registry (dev sliders) and small formatting helpers. Node-safe: nothing here touches the DOM, E.THREE or E.World3D.
(() => {
const E = My3D2dge;
const SN = globalThis.SN = globalThis.SN || {};
SN.VERSION = '1.0.0';
SN.U = 16;                         // engine units per metre
SN.KMH = 3.6 / 16;                 // u/s -> km/h
SN.MPH = 3.6 / 16 / 1.609344;      // u/s -> mph
SN.DT = 1 / 120;
SN.ZUP = [0, 0, 1];
SN.browser = typeof document !== 'undefined' && typeof window !== 'undefined' && !!document.createElement;

/* ---- vectors as plain arrays [x, y, z] ---- */
const V = SN.v = {
  make: (x = 0, y = 0, z = 0) => [x, y, z],
  set: (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; },
  copy: (o, a) => { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; },
  add: (o, a, b) => { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; },
  sub: (o, a, b) => { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; },
  scale: (o, a, k) => { o[0] = a[0] * k; o[1] = a[1] * k; o[2] = a[2] * k; return o; },
  addS: (o, a, b, k) => { o[0] = a[0] + b[0] * k; o[1] = a[1] + b[1] * k; o[2] = a[2] + b[2] * k; return o; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: a => Math.hypot(a[0], a[1], a[2]),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  cross: (o, a, b) => { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; },
  norm: (o, a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; },
  lerp: (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; },
  // rotate a about the unit axis k by angle (Rodrigues)
  rot: (o, a, k, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), d = (a[0] * k[0] + a[1] * k[1] + a[2] * k[2]) * (1 - c);
    const cx = k[1] * a[2] - k[2] * a[1], cy = k[2] * a[0] - k[0] * a[2], cz = k[0] * a[1] - k[1] * a[0];
    // right-hand rotation about k; in the engine's left-handed frame a positive angle about +z turns +x toward +y
    o[0] = a[0] * c + cx * s + k[0] * d; o[1] = a[1] * c + cy * s + k[1] * d; o[2] = a[2] * c + cz * s + k[2] * d; return o;
  },
  // slerp-ish: move unit vector a toward unit vector b by fraction t, renormalized
  toward: (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; const l = Math.hypot(o[0], o[1], o[2]) || 1; o[0] /= l; o[1] /= l; o[2] /= l; return o; }
};
/** the engine frame (left-handed: right = cross(up, forward)); bank > 0 lowers the right edge */
SN.frame = (F, up = SN.ZUP, bank = 0) => {
  const R0 = V.norm([0, 0, 0], V.cross([0, 0, 0], up, F)), U0 = V.cross([0, 0, 0], F, R0), c = Math.cos(bank), s = Math.sin(bank);
  return { F, R: [R0[0] * c - U0[0] * s, R0[1] * c - U0[1] * s, R0[2] * c - U0[2] * s], U: [U0[0] * c + R0[0] * s, U0[1] * c + R0[1] * s, U0[2] * c + R0[2] * s] };
};
SN.clamp = E.clamp; SN.lerp = E.lerp;
SN.wrapAngle = a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
SN.smooth01 = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

/* ---- randomness and hashes: the sim never reads Math.random ---- */
SN.hashString = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
SN.rng = seed => E.rng((typeof seed === 'string' ? SN.hashString(seed) : seed >>> 0) || 1);
const _F32 = new Float32Array(1), _I32 = new Uint32Array(_F32.buffer);
/** FNV-1a over the float32 bits of a list of numbers (World3D's hashNumbers) */
SN.hashNumbers = list => { let h = 0x811c9dc5; for (const n of list) { _F32[0] = n; h ^= _I32[0]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };

/* ---- the live tuning registry: every important gameplay number, as a dev slider with a default ---- */
const Tune = SN.Tune = {
  specs: {}, order: [], T: {},
  def(key, o) { this.specs[key] = Object.assign({ key, step: 0.01, group: 'Misc', label: key }, o); if (!this.order.includes(key)) this.order.push(key); this.T[key] = o.def; return this; },
  reset(key) { if (key) this.T[key] = this.specs[key].def; else for (const k of this.order) this.T[k] = this.specs[k].def; SN.emit && SN.emit('tune', key || '*'); },
  set(key, v) { const s = this.specs[key]; if (!s) return; v = Math.max(s.min, Math.min(s.max, +v)); v = Math.round(v / s.step) * s.step; this.T[key] = +v.toFixed(6); SN.emit && SN.emit('tune', key); },
  isDefault(key) { return Math.abs(this.T[key] - this.specs[key].def) < 1e-9; },
  snapshot() { return Object.assign({}, this.T); },
  load(snap) { for (const k of this.order) if (snap && typeof snap[k] === 'number') this.T[k] = snap[k]; },
  groups() { const g = []; for (const k of this.order) { const G = this.specs[k].group; if (!g.includes(G)) g.push(G); } return g; },
  inGroup(G) { return this.order.filter(k => this.specs[k].group === G); }
};
const D = (group, key, def, min, max, step, label) => Tune.def(key, { group, def, min, max, step, label });
D('HANDLING', 'thrustMul', 1, .5, 2, .05, 'Thrust');
D('HANDLING', 'topSpeedMul', 1, .6, 1.6, .02, 'Top speed');
D('HANDLING', 'dragMul', 1, .5, 2, .05, 'Drag');
D('HANDLING', 'steerRate', 1.9, .8, 3.5, .05, 'Steer rate');
D('HANDLING', 'steerResponse', 9, 2, 20, .5, 'Steer response');
D('HANDLING', 'gripMul', 1, .3, 2, .05, 'Grip');
D('HANDLING', 'airbrakeYaw', 1.4, 0, 3, .05, 'Airbrake turn');
D('HANDLING 2', 'airbrakeDrag', .9, 0, 2, .05, 'Airbrake drag');
D('HANDLING 2', 'gripMaxMul', 1, .4, 2, .05, 'Grip limit');
D('HANDLING 2', 'slipMax', 35, 10, 60, 1, 'Slide angle max');
D('HANDLING 2', 'scrubK', .35, 0, 1, .01, 'Slide scrub');
D('HANDLING 2', 'sideShiftSpeed', 768, 0, 1500, 16, 'Side-shift speed');
D('HANDLING 2', 'shiftDecay', 12, 4, 30, .5, 'Side-shift decay');
D('HOVER', 'hoverHeight', 14, 6, 30, .5, 'Hover height');
D('HOVER', 'hoverStiffness', 220, 60, 600, 5, 'Hover stiffness');
D('HOVER', 'hoverDamping', 28, 5, 60, 1, 'Hover damping');
D('HOVER', 'magnetPull', 1800, 600, 4000, 50, 'Magnet pull');
D('HOVER', 'airGravity', 640, 200, 1500, 10, 'Air gravity');
D('HOVER', 'pitchEffect', 1, 0, 2, .05, 'Pitch effect');
D('WALLS & ENERGY', 'wallBounce', .35, 0, 1, .01, 'Wall bounce');
D('WALLS & ENERGY', 'wallFriction', .25, 0, 1, .01, 'Wall friction');
D('WALLS & ENERGY', 'wallDamage', 1, 0, 3, .05, 'Wall damage');
D('WALLS & ENERGY', 'pitRecharge', 25, 0, 100, 1, 'Pit recharge /s');
D('WALLS & ENERGY', 'rollCost', 10, 0, 30, 1, 'Barrel roll cost');
D('WALLS & ENERGY', 'rollBoost', 1.2, 1, 1.6, .01, 'Barrel roll boost');
D('PADS & WEAPONS', 'padBoost', 1.25, 1, 1.8, .01, 'Speed pad boost');
D('PADS & WEAPONS', 'padBoostTime', .9, .2, 2.5, .05, 'Speed pad time');
D('PADS & WEAPONS', 'weaponDamageMul', 1, 0, 3, .05, 'Weapon damage');
D('PADS & WEAPONS', 'absorbMul', 1, 0, 3, .05, 'Absorb gain');
D('PADS & WEAPONS', 'pickupLuck', 1, 0, 2, .05, 'Pickup position luck');
D('AI', 'aiSkill', 1, .5, 1.2, .01, 'AI skill');
D('AI', 'aiRubberBand', 1, 0, 2, .05, 'AI rubber band');
D('AI', 'aiAggression', 1, 0, 2, .05, 'AI aggression');
D('CAMERA', 'camDistance', 150, 60, 300, 2, 'Chase distance');
D('CAMERA', 'camHeight', 46, 10, 120, 1, 'Chase height');
D('CAMERA', 'camFov', 72, 50, 100, 1, 'Field of view');
D('CAMERA', 'camFovBoost', 16, 0, 40, 1, 'Speed FOV kick');
D('CAMERA', 'camLag', 8, 1, 20, .5, 'Camera lag');

/* ---- cheats (dev mode) and the session's flags ---- */
SN.cheats = { god: false, infiniteWeapon: false, aiWeaponsOff: false, freezeAI: false, ghostAI: false };
SN.flags = { hud: true, debug: false, weather: true, freeCam: false };

/* ---- a tiny event bus for the presentation layer ---- */
const subs = {};
SN.on = (name, fn) => { (subs[name] = subs[name] || []).push(fn); return () => { subs[name] = subs[name].filter(f => f !== fn); }; };
SN.emit = (name, a, b) => { for (const f of (subs[name] || []).slice()) try { f(a, b); } catch (e) { if (E.current) E.current.fail('SN.emit ' + name, e); } };

/* ---- formatting ---- */
SN.fmtTime = (sec, o = {}) => {
  if (!isFinite(sec) || sec < 0) return '--:--.--';
  const m = Math.floor(sec / 60), s = sec - m * 60, cs = Math.floor((s - Math.floor(s)) * 100);
  return (o.noMin && !m ? '' : m + ':') + String(Math.floor(s)).padStart(o.noMin && !m ? 1 : 2, '0') + '.' + String(cs).padStart(2, '0');
};
SN.ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
SN.speedText = (v, units) => units === 'mph' ? Math.round(v * SN.MPH) + ' MPH' : Math.round(v * SN.KMH) + ' KM/H';
SN.pick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
SN.weighted = (rnd, weights) => { let t = 0; for (const w of weights) t += Math.max(0, w); if (t <= 0) return Math.floor(rnd() * weights.length); let x = rnd() * t; for (let i = 0; i < weights.length; i++) { x -= Math.max(0, weights[i]); if (x < 0) return i; } return weights.length - 1; };
SN.hexToRgb = h => { const n = parseInt(h.slice(1), 16); return h.length === 4 ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
SN.mix = (a, b, t) => { const A = SN.hexToRgb(a), B = SN.hexToRgb(b); return '#' + A.map((c, i) => Math.round(c + (B[i] - c) * t).toString(16).padStart(2, '0')).join(''); };
SN.hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
})();
