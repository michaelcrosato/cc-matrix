// 00-core.js: the TC namespace, units, seeded RNG streams, the tuning table (TUNE, frozen defaults, and the live `tune`
// that the dev panel edits), difficulty and the registries (def / get). Reads nothing; every other fragment reads this.
const TC = {
  name: 'Sublime Crisis 3',
  short: 'SUBLIME3',
  source: 'Time Crisis 3',
  U: 16,                       // world units per metre
  DT: 1 / 120,                 // the engine's fixed step
  registry: { material: {}, weapon: {}, enemy: {}, boss: {}, stage: {}, scene: {}, speaker: {}, song: {}, intel: {} },
  def(kind, id, spec) { TC.registry[kind][id] = Object.assign({ id }, spec); return TC.registry[kind][id]; },
  get(kind, id) {
    const e = TC.registry[kind][id];
    if (!e) throw new Error('no ' + kind + ' "' + id + '"');
    return e;
  },
  has(kind, id) { return !!TC.registry[kind][id]; },
};

// Seeded RNG streams: each stream is a mulberry32 generator seeded from the run seed and the stream's name, so one
// stream's draws never shift another's.
TC.hash = function (str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
TC.stream = function (seed, name) {
  let a = (seed ^ TC.hash(name)) >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  return f;
};

// Live tuning. TUNE is the frozen default table; `tune` is a deep copy the dev panel edits and Reset restores from TUNE.
// Every value that the dev panel shows lives here, addressed by a dotted path ('enemy.hpMul').
TC.TUNE = Object.freeze({
  player: {
    godMode: false, infiniteAmmo: false, lives: 0, iframes: 1.5, coverIn: 0.12, coverOut: 0.15, reload: 0.30,
    padSpeed: 1.6, aimAssist: 0.6, startSpecials: 0,
  },
  weapon: {
    handgunDmg: 1, mgRate: 12, mgDmg: 0.45, shotPellets: 8, shotSpread: 5.5, glRadius: 48, glDmg: 6, ammoMul: 1,
  },
  enemy: {
    hpMul: 1, threatMul: 1, telegraphMul: 1, fireMul: 1, maxThreats: 1, minGap: 0.35, reactMul: 1, bossHpMul: 1,
  },
  time: {
    freeze: false, sceneMul: 1, eliteBonus: 2, refill: 0.6, gameSpeed: 1,
  },
  view: {
    fov: 55, hitVolumes: false, colliders: false, aiLabels: false, threatDebug: false, perf: false, hideHud: false, threatBig: false,
  },
});
TC.tune = JSON.parse(JSON.stringify(TC.TUNE));
TC.tuneGet = function (path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), TC.tune);
};
TC.tuneSet = function (path, v) {
  const ks = path.split('.'), last = ks.pop();
  let o = TC.tune;
  for (const k of ks) o = o[k];
  o[last] = v;
};
TC.tuneReset = function () { TC.tune = JSON.parse(JSON.stringify(TC.TUNE)); };
TC.tuneChanged = function (path) { return TC.tuneGet(path) !== TC.tuneGetFrom(TC.TUNE, path); };
TC.tuneGetFrom = function (obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
};

// Difficulty: lives, TIME multiplier, threat multiplier, boss time.
TC.DIFF = {
  Easy: { lives: 7, time: 1.25, threat: 0.7, threats: -1 },
  Normal: { lives: 5, time: 1, threat: 1, threats: 0 },
  Hard: { lives: 3, time: 0.85, threat: 1.25, threats: 1 },
};

TC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
TC.lerp = (a, b, t) => a + (b - a) * t;
TC.smooth = t => { t = TC.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
TC.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
TC.fmt = n => Math.round(n).toLocaleString('en-US');
