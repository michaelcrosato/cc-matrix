// SNIPEOUT HD core: the SN namespace, units, vector math, frames, random streams, hashing and the live tuning registry
(() => {
const E = My3D2dge;
const SN = globalThis.SN = globalThis.SN || {};
SN.U = 16;                         // engine units per metre
SN.KMH = 0.225;                    // km/h per u/s (3.6 / 16)
SN.DT = 1 / 120;
SN.VERSION = '1.0.0';

/* ---- vectors: plain [x, y, z] arrays (engine axes: x east, y south, z up) ---- */
const V = SN.V = {
  add: (a, b, o = [0, 0, 0]) => (o[0] = a[0] + b[0], o[1] = a[1] + b[1], o[2] = a[2] + b[2], o),
  sub: (a, b, o = [0, 0, 0]) => (o[0] = a[0] - b[0], o[1] = a[1] - b[1], o[2] = a[2] - b[2], o),
  scale: (a, k, o = [0, 0, 0]) => (o[0] = a[0] * k, o[1] = a[1] * k, o[2] = a[2] * k, o),
  addS: (a, b, k, o = a) => (o[0] = a[0] + b[0] * k, o[1] = a[1] + b[1] * k, o[2] = a[2] + b[2] * k, o),
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b, o = [0, 0, 0]) => { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; },
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: (a, o = a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; },
  copy: (a, o = [0, 0, 0]) => (o[0] = a[0], o[1] = a[1], o[2] = a[2], o),
  set: (o, x, y, z) => (o[0] = x, o[1] = y, o[2] = z, o),
  lerp: (a, b, k, o = [0, 0, 0]) => (o[0] = a[0] + (b[0] - a[0]) * k, o[1] = a[1] + (b[1] - a[1]) * k, o[2] = a[2] + (b[2] - a[2]) * k, o),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  /** rotate v about the unit axis k by angle a (Rodrigues) */
  rot: (v, k, a, o = v) => {
    const c = Math.cos(a), s = Math.sin(a), d = (v[0] * k[0] + v[1] * k[1] + v[2] * k[2]) * (1 - c);
    const x = v[0] * c + (k[1] * v[2] - k[2] * v[1]) * s + k[0] * d, y = v[1] * c + (k[2] * v[0] - k[0] * v[2]) * s + k[1] * d, z = v[2] * c + (k[0] * v[1] - k[1] * v[0]) * s + k[2] * d;
    o[0] = x; o[1] = y; o[2] = z; return o;
  },
  /** move unit vector a toward unit vector b by fraction k, renormalised (a cheap slerp for small steps) */
  toward: (a, b, k, o = a) => { o[0] = a[0] + (b[0] - a[0]) * k; o[1] = a[1] + (b[1] - a[1]) * k; o[2] = a[2] + (b[2] - a[2]) * k; return V.norm(o); }
};
/** a frame from a forward vector and an up hint: right = cross(up, F) (the engine's left-handed axes); bank > 0 lowers the right edge */
SN.frame = (F, up = [0, 0, 1], bank = 0) => {
  const R0 = V.norm(V.cross(up, F)), U0 = V.cross(F, R0), c = Math.cos(bank), s = Math.sin(bank);
  return { F, R: [R0[0] * c - U0[0] * s, R0[1] * c - U0[1] * s, R0[2] * c - U0[2] * s], U: [U0[0] * c + R0[0] * s, U0[1] * c + R0[1] * s, U0[2] * c + R0[2] * s] };
};
SN.clamp = E.clamp; SN.lerp = E.lerp;
SN.wrap = (s, L) => ((s % L) + L) % L;
/** the signed short way from a to b along a loop of length L */
SN.wrapDiff = (a, b, L) => { let d = (b - a) % L; if (d > L / 2) d -= L; if (d < -L / 2) d += L; return d; };
SN.hashString = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const F32 = new Float32Array(1), I32 = new Uint32Array(F32.buffer);
/** FNV-1a over the float32 bits of a list of numbers (the same as World3D's hashNumbers) */
SN.hashNumbers = list => { let h = 0x811c9dc5; for (const n of list) { F32[0] = n; h ^= I32[0]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
SN.rng = seed => E.rng(seed >>> 0);
SN.fmtTime = (sec, cs = true) => { if (!(sec >= 0) || !isFinite(sec)) return '-:--.--'; const m = Math.floor(sec / 60), s = sec - m * 60; return m + ':' + (cs ? s.toFixed(2).padStart(5, '0') : String(Math.floor(s)).padStart(2, '0')); };
SN.ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');

/* ---- live tuning (dev mode sliders): SN.Tune.T[key] ---- */
const Tune = SN.Tune = { T: {}, defs: {}, order: [],
  def(key, d) { this.defs[key] = d; this.order.push(key); this.T[key] = d.def; },
  reset(key) { if (key) this.T[key] = this.defs[key].def; else for (const k of this.order) this.T[k] = this.defs[k].def; },
  snapshot() { return Object.assign({}, this.T); },
  load(t) { for (const k of this.order) if (t && typeof t[k] === 'number') this.T[k] = t[k]; },
  groups() { const g = {}; for (const k of this.order) (g[this.defs[k].group] = g[this.defs[k].group] || []).push(k); return g; },
  changed() { return this.order.filter(k => this.T[k] !== this.defs[k].def); }
};
const TUNE = [
  ['Handling', 'thrustMul', 'Thrust', 1, .5, 2, .05], ['Handling', 'topSpeedMul', 'Top speed', 1, .6, 1.6, .05], ['Handling', 'dragMul', 'Drag', 1, .5, 2, .05],
  ['Handling', 'steerRate', 'Steer rate', 1.9, .8, 3.5, .05], ['Handling', 'steerResponse', 'Steer response', 9, 2, 20, .5], ['Handling', 'gripMul', 'Grip', 1, .3, 2, .05],
  ['Handling', 'airbrakeYaw', 'Airbrake turn', 1.4, 0, 3, .05], ['Handling', 'airbrakeDrag', 'Airbrake drag', .9, 0, 2, .05], ['Handling', 'gripMaxMul', 'Grip limit', 1, .4, 2, .05],
  ['Handling', 'slipMax', 'Slip angle', 35, 10, 60, 1], ['Handling', 'scrubK', 'Slide scrub', .35, 0, 1, .01], ['Handling', 'sideShiftSpeed', 'Side-shift', 768, 0, 1500, 16], ['Handling', 'shiftDecay', 'Shift decay', 12, 4, 30, .5],
  ['Hover', 'hoverHeight', 'Hover height', 14, 6, 30, 1], ['Hover', 'hoverStiffness', 'Stiffness', 220, 60, 600, 5], ['Hover', 'hoverDamping', 'Damping', 28, 5, 60, 1],
  ['Hover', 'magnetPull', 'Magnet pull', 1800, 600, 4000, 50], ['Hover', 'airGravity', 'Air gravity', 640, 200, 1500, 10], ['Hover', 'pitchEffect', 'Pitch effect', 1, 0, 2, .05],
  ['Walls & energy', 'wallBounce', 'Wall bounce', .35, 0, 1, .01], ['Walls & energy', 'wallFriction', 'Wall friction', .25, 0, 1, .01], ['Walls & energy', 'wallDamage', 'Wall damage', 1, 0, 3, .05],
  ['Walls & energy', 'pitRecharge', 'Pit recharge', 25, 0, 100, 1], ['Walls & energy', 'rollCost', 'Roll cost', 10, 0, 30, 1], ['Walls & energy', 'rollBoost', 'Roll boost', 1.2, 1, 1.6, .01],
  ['Pads & weapons', 'padBoost', 'Pad boost', 1.25, 1, 1.8, .01], ['Pads & weapons', 'padBoostTime', 'Pad time', .9, .2, 2.5, .05], ['Pads & weapons', 'weaponDamageMul', 'Weapon damage', 1, 0, 3, .05],
  ['Pads & weapons', 'absorbMul', 'Absorb', 1, 0, 3, .05], ['Pads & weapons', 'pickupLuck', 'Pickup luck', 1, 0, 2, .05],
  ['AI', 'aiSkill', 'AI skill', 1, .5, 1.2, .01], ['AI', 'aiRubberBand', 'Rubber band', 1, 0, 2, .05], ['AI', 'aiAggression', 'Aggression', 1, 0, 2, .05],
  ['Camera', 'camDistance', 'Distance', 150, 60, 300, 2], ['Camera', 'camHeight', 'Height', 46, 10, 120, 1], ['Camera', 'camFov', 'Field of view', 72, 50, 100, 1],
  ['Camera', 'camFovBoost', 'Speed FOV', 16, 0, 40, 1], ['Camera', 'camLag', 'Lag', 8, 1, 20, .5]
];
for (const [group, key, label, def, min, max, step] of TUNE) Tune.def(key, { group, label, def, min, max, step });

/* ---- events: SN.on(name, fn) / SN.emit(name, data) for the presentation side ---- */
const bus = {};
SN.on = (name, fn) => { (bus[name] = bus[name] || []).push(fn); return () => { bus[name] = bus[name].filter(f => f !== fn); }; };
SN.emit = (name, d) => { for (const f of bus[name] || []) try { f(d); } catch (e) { if (SN.game) SN.game.fail('event ' + name, e); } };
SN.vpad = [{}, {}, {}, {}];
SN.scenes = SN.scenes || {};        // virtual pads (bots, autopilot, attract): analog control values merged into a player's controls
})();
