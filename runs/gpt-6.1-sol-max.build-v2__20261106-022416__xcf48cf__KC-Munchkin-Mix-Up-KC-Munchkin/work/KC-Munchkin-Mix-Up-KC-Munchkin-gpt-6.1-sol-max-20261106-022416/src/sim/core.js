(function (M) {
  "use strict";
  M.E = My3D2dge;
  M.DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  M.OPP = (d) => (d + 2) % 4;
  M.key = (x, y) => `${x},${y}`;
  M.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  M.copy = (v) => JSON.parse(JSON.stringify(v));
  M.hash = (s) => {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  M.seedValue = (seed) =>
    typeof seed === "number"
      ? seed >>> 0
      : /^\d+$/.test(String(seed))
        ? Number(seed) >>> 0
        : M.hash(seed);
  class RNG {
    constructor(seed) {
      this.state = seed >>> 0;
    }
    next() {
      let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(n) {
      return Math.floor(this.next() * n);
    }
    pick(a) {
      return a[this.int(a.length)];
    }
  }
  M.RNG = RNG;
  M.DEFAULTS = Object.freeze({
    playerSpeed: 6,
    foodBase: 0.6,
    foodFinal: 0.98,
    predatorSpeed: 3.65,
    reaction: 0.13,
    powerDuration: 6,
    gateCadence: 2.6,
    chirpCooldown: 4,
    damageGrace: 0.85,
    lives: 5,
    lifeRestore: 1,
  });
  M.TUNING = [
    ["playerSpeed", "Hero speed", 4, 9, 0.1, "cells/s"],
    ["foodBase", "Snack starting speed", 0.4, 0.85, 0.01, "× hero"],
    ["foodFinal", "Last snack speed", 0.85, 1, 0.01, "× hero"],
    ["predatorSpeed", "Predator speed", 2, 6, 0.1, "cells/s"],
    ["reaction", "Predator decision delay", 0.03, 0.5, 0.01, "s"],
    ["powerDuration", "Bright snack duration", 3, 10, 0.5, "s"],
    ["gateCadence", "Gate quarter turn", 1.6, 5, 0.1, "s"],
    ["chirpCooldown", "Reveal cooldown", 2, 8, 0.25, "s"],
    ["damageGrace", "Team damage grace", 0.3, 2, 0.05, "s"],
    ["lives", "Starting lives (restart)", 1, 9, 1, ""],
    ["lifeRestore", "Life restored per clear", 0, 2, 1, ""],
  ];
  M.foodRatio = (left, tuning = M.DEFAULTS) =>
    tuning.foodBase +
    (Math.max(tuning.foodBase, tuning.foodFinal) - tuning.foodBase) *
      ((12 - M.clamp(left, 1, 12)) / 11) ** 0.8;
  M.cardinal = (v, prior = -1, deadzone = 0.25) => {
    const [x, y] = v;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < deadzone) return -1;
    const ax = Math.abs(x),
      ay = Math.abs(y);
    if (prior >= 0 && Math.abs(ax - ay) < 0.13 && (prior % 2 ? ax : ay) > deadzone)
      return prior % 2 ? (x > 0 ? 1 : 3) : y > 0 ? 2 : 0;
    return ax > ay ? (x > 0 ? 1 : 3) : y > 0 ? 2 : 0;
  };
})((globalThis.Mix = globalThis.Mix || {}));
