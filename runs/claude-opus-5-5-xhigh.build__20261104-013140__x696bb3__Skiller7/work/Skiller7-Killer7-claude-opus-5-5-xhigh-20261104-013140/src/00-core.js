/* SKILLER7 — core: the namespace, the event bus, registries, seeded random streams, units and small math.
 * Everything in src/ and content/ is concatenated into one classic script (tools/build.mjs) that defines globalThis.S7
 * and starts nothing; S7.start() (src/99-start.js) makes the game. The sim never touches three.js or the DOM. */
const E = My3D2dge;
const S7 = globalThis.S7 = globalThis.S7 || {};
S7.E = E;
S7.VERSION = '1.0.0';
S7.BUILD = typeof __S7_BUILD__ !== 'undefined' ? __S7_BUILD__ : 'dev';
const M = S7.M = 16;                         // world units per metre (one tile)
const TAU = Math.PI * 2;
const { clamp, lerp } = E;
const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';

/* ---- the event bus: the sim emits, audio, effects, the HUD and tutorials listen (they never change sim state) ---- */
S7.bus = {
  _h: {},
  on(type, fn) { (this._h[type] = this._h[type] || []).push(fn); return () => this.off(type, fn); },
  off(type, fn) { const l = this._h[type]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(type, data) { const l = this._h[type]; if (!l) return; for (const fn of l.slice()) { try { fn(data || {}); } catch (e) { if (S7.game) S7.game.fail('bus:' + type, e); else throw e; } } },
  clear() { this._h = {}; }
};

/* ---- registries: content is data (areas, personas, weapons, enemies, items, beats, songs, voices) ---- */
S7.AREAS = {}; S7.PERSONAS = {}; S7.WEAPONS = {}; S7.ENEMIES = {}; S7.ITEMS = {}; S7.BEATS = {}; S7.SONGS = {}; S7.VOICES = {};
S7.TALKS = {}; S7.PEOPLE = {};
S7.area = (id, def) => { def.id = id; S7.AREAS[id] = def; return def; };
S7.persona = (id, def) => { def.id = id; S7.PERSONAS[id] = def; return def; };
S7.weapon = (id, def) => { def.id = id; S7.WEAPONS[id] = def; return def; };
S7.enemy = (id, def) => { def.id = id; S7.ENEMIES[id] = def; return def; };
S7.item = (id, def) => { def.id = id; S7.ITEMS[id] = def; return def; };
S7.beat = (id, fn) => { S7.BEATS[id] = fn; return fn; };
S7.song = (id, def) => { S7.SONGS[id] = def; return def; };
S7.voice = (id, def) => { S7.VOICES[id] = def; return def; };
/** a conversation: a list of lines [speaker, text] or { card } / { choice } entries (content/story) */
S7.talk = (id, lines) => { S7.TALKS[id] = lines; return lines; };
S7.person = (id, def) => { def.id = id; S7.PEOPLE[id] = def; return def; };

/* ---- seeded random streams: the sim draws only from these (never Math.random), so a seed and inputs give one game ---- */
S7.RNG = {
  seed: 7,
  streams: {},
  reset(seed) { this.seed = seed >>> 0; this.streams = {}; },
  /** a named stream: S7.rng('spawn')() -> [0, 1) */
  get(name) {
    let s = this.streams[name];
    if (!s) { let h = 2166136261 ^ this.seed; for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619); s = this.streams[name] = { n: 0, st: h >>> 0 }; }
    return s;
  },
  next(name) {   // mulberry32 on the stream's state
    const s = this.get(name); s.n++;
    let t = (s.st = (s.st + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  state() { const o = {}; for (const k in this.streams) o[k] = this.streams[k].st; return o; }
};
S7.rnd = name => S7.RNG.next(name);
S7.range = (name, a, b) => a + (b - a) * S7.RNG.next(name);
S7.pick = (name, list) => list[Math.floor(S7.RNG.next(name) * list.length) % list.length];

/* ---- math ---- */
const V = S7.V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  dist2: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
  /** the unit direction of yaw (from +x toward +y) and pitch (up positive) */
  dir: (yaw, pitch) => [Math.cos(yaw) * Math.cos(pitch), Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch)],
  lerp3: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
};
/** the shortest signed angle from a to b */
S7.angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
S7.wrapAng = a => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
/** a ray (origin o, unit dir d) against a sphere (centre c, radius r): the distance along the ray, or -1 */
S7.raySphere = (o, d, c, r) => {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
  if (h < 0) return -1;
  const s = Math.sqrt(h), t0 = -b - s, t1 = -b + s;
  return t0 >= 0 ? t0 : t1 >= 0 ? 0 : -1;
};
/** a ray against a vertical capsule (feet at c, height h, radius r): the distance, or -1 */
S7.rayCapsule = (o, d, c, h, r) => {
  // nearest approach between the ray and the segment c..c+h (z), then a sphere test there
  let best = -1;
  const steps = Math.max(2, Math.ceil(h / r));
  for (let i = 0; i <= steps; i++) {
    const z = c[2] + r + (h - 2 * r) * (i / steps);
    const t = S7.raySphere(o, d, [c[0], c[1], z], r);
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
};
/** distance from point p to segment a-b (3D) */
S7.segDist = (p, a, b) => {
  const ab = V.sub(b, a), t = clamp(V.dot(V.sub(p, a), ab) / (V.dot(ab, ab) || 1), 0, 1);
  return V.dist(p, V.add(a, V.mul(ab, t)));
};
S7.ease = { out: t => 1 - (1 - t) * (1 - t), inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, smooth: t => t * t * (3 - 2 * t) };
/** a stable 32-bit hash of numbers and strings (the sim hash) */
S7.hashOf = (list) => {
  let h = 2166136261;
  const mix = v => { h = Math.imul(h ^ (v & 0xffff), 16777619); h = Math.imul(h ^ (v >>> 16), 16777619); };
  for (const x of list) {
    if (typeof x === 'number') mix(Math.round(x * 64) | 0);
    else if (typeof x === 'string') for (let i = 0; i < x.length; i++) mix(x.charCodeAt(i));
    else if (typeof x === 'boolean') mix(x ? 1 : 2);
    else mix(0);
  }
  return (h >>> 0).toString(16);
};
/** format seconds as m:ss.t */
S7.fmtTime = (s, tenths = true) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + (tenths ? r.toFixed(1) : Math.floor(r)); };
/** a tile coordinate list [x, y, z?] (metres) to world units, z defaulting to null */
S7.tw = t => [t[0] * M, t[1] * M, t.length > 2 && t[2] !== null && t[2] !== undefined ? t[2] * M : null];
S7.storeGet = (k, d) => { try { if (typeof localStorage === 'undefined') return d; const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
S7.storeSet = (k, v) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: kept for the visit */ } };
S7.HAS_DOM = HAS_DOM;
S7.THINGS3D = {}; S7.SPOT3D = {};
