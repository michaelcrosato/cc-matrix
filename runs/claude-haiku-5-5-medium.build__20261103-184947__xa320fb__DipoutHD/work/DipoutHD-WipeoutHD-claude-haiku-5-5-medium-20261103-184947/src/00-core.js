// Dipout HD: core namespace, math, seeded random streams, live tuning.
// Sim files are Node-safe: no DOM, no engine, no Math.random, no clocks.
(() => {
  const SN = (globalThis.SN = globalThis.SN || {});
  SN.VERSION = '1.0';
  SN.STEP = 1 / 120;            // fixed sim step, seconds
  SN.KMH = 3.6;                 // m/s -> km/h factor
  SN.G = 14;                    // ballistic gravity, m/s²

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  SN.clamp = clamp;
  SN.lerp = (a, b, t) => a + (b - a) * t;
  SN.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  SN.wrap = (v, L) => ((v % L) + L) % L;
  SN.TAU = Math.PI * 2;

  // Seeded PRNG (mulberry32). One stream per purpose, so order of calls elsewhere never changes a result.
  SN.rng = (seed) => {
    let a = seed >>> 0;
    const f = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + (hi - lo) * f();
    f.int = (lo, hi) => Math.floor(f.range(lo, hi + 1));
    f.pick = (list) => list[Math.floor(f() * list.length) % list.length];
    return f;
  };
  // Hash a string to a 32-bit seed (FNV-1a), so named streams are stable.
  SN.seedOf = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  };
  SN.stream = (seed, name) => SN.rng((seed ^ SN.seedOf(name)) >>> 0);

  // FNV-1a over a list of numbers (Float32 bits), used for determinism checks.
  SN.hashNums = (nums) => {
    const buf = new Float32Array(1), u32 = new Uint32Array(buf.buffer);
    let h = 0x811c9dc5;
    for (const n of nums) {
      buf[0] = n;
      h ^= u32[0]; h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };

  // Vector helpers on plain [x, y, z] arrays (metres, z up).
  SN.v3 = (x, y, z) => [x, y, z];
  SN.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  SN.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  SN.norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // Live gameplay variables (dev sliders). SN.Tune.T.<key> is read by the sim; reset() restores DEFAULTS.
  const DEFAULTS = {
    thrust: 1, topSpeed: 1, grip: 1, hover: 1.1, gravity: 14, energyMax: 100,
    wallDamage: 1, weaponDamage: 1, boostPower: 1, aiSkill: 1, rubberBand: 1,
    lapCount: 3, pickupRate: 1,
  };
  const T = Object.assign({}, DEFAULTS);
  SN.Tune = {
    T,
    DEFAULTS,
    reset() { for (const k of Object.keys(DEFAULTS)) T[k] = DEFAULTS[k]; return T; },
    // Sliders shown in dev mode: [key, label, min, max, step]
    SLIDERS: [
      ['thrust', 'Thrust', 0.5, 1.8, 0.05], ['topSpeed', 'Top speed', 0.6, 1.6, 0.05],
      ['grip', 'Lateral grip', 0.5, 1.8, 0.05], ['hover', 'Hover height', 0.6, 2, 0.05],
      ['gravity', 'Gravity', 4, 30, 0.5], ['energyMax', 'Shield energy', 40, 200, 5],
      ['wallDamage', 'Wall damage', 0, 3, 0.1], ['weaponDamage', 'Weapon damage', 0, 3, 0.1],
      ['boostPower', 'Pad boost', 0, 3, 0.1], ['aiSkill', 'AI skill', 0.4, 1.6, 0.05],
      ['rubberBand', 'Rubber band', 0, 2, 0.1], ['lapCount', 'Laps', 1, 6, 1],
      ['pickupRate', 'Pickup rate', 0, 3, 0.1],
    ],
  };
})();
