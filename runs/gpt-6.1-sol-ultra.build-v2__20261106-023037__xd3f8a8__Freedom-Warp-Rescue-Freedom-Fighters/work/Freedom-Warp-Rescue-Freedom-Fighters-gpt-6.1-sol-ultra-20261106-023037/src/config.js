/* Freedom Warp Rescue · validated, live balance. */
(() => {
  "use strict";
  const F = (globalThis.FWR = globalThis.FWR || {});
  F.BUILD = "FWR-20261106-023037";
  F.TITLE = "Freedom Warp Rescue";
  F.STEP = 1 / 120;
  F.SCHEMA = {
    shipSpeed: [220, 80, 450, 5],
    acceleration: [1650, 300, 4000, 50],
    braking: [2200, 300, 5000, 50],
    warpSpeed: [700, 300, 1500, 10],
    warpDuration: [0.45, 0.15, 1, 0.05],
    warpCost: [60, 10, 100, 5],
    energyRegen: [24, 5, 100, 1],
    maxHull: [3, 1, 12, 1],
    damageGrace: [1.25, 0.3, 4, 0.05],
    fireRate: [8, 2, 16, 1],
    bulletDamage: [1, 0.25, 5, 0.25],
    rescueRadius: [38, 20, 70, 1],
    crystalHp: [3, 2, 10, 1],
    mineArm: [0.8, 0.3, 3, 0.1],
    enemyWarning: [1.35, 1, 4, 0.05],
    enemyHealth: [1, 0.25, 4, 0.25],
    pressure: [1, 0.25, 2, 0.05],
    bossHealth: [1, 0.25, 4, 0.25],
    aimAssist: [0.15, 0, 0.6, 0.01],
  };
  F.DEFAULTS = Object.freeze(
    Object.fromEntries(Object.entries(F.SCHEMA).map(([k, v]) => [k, v[0]])),
  );
  F.validateConfig = (input) =>
    Object.fromEntries(
      Object.entries(F.SCHEMA).map(([k, s]) => {
        const v = Number(input?.[k]);
        return [
          k,
          Number.isFinite(v)
            ? Math.max(s[1], Math.min(s[2], s[3] === 1 ? Math.round(v) : v))
            : s[0],
        ];
      }),
    );
  F.neutral = () => ({ mx: 0, my: 0, ax: 0, ay: 0, fire: false, burst: false });
  F.normalizeIntent = (input) => {
    const out = F.neutral();
    for (const k of ["mx", "my", "ax", "ay"])
      out[k] =
        typeof input?.[k] === "number" && Number.isFinite(input[k])
          ? Math.max(-1, Math.min(1, input[k]))
          : 0;
    for (const pair of [
      ["mx", "my"],
      ["ax", "ay"],
    ]) {
      const n = Math.hypot(out[pair[0]], out[pair[1]]);
      if (n > 1) {
        out[pair[0]] /= n;
        out[pair[1]] /= n;
      }
    }
    out.fire = input?.fire === true;
    out.burst = input?.burst === true;
    return out;
  };
  F.resolveRoles = (seats, inputs) => {
    const p = F.normalizeIntent(inputs?.[seats[0]]),
      n = seats.length > 1 ? F.normalizeIntent(inputs?.[seats[1]]) : p;
    return {
      mx: p.mx,
      my: p.my,
      ax: n.ax,
      ay: n.ay,
      dx: n.mx,
      dy: n.my,
      fire: p.fire || n.fire,
      burst: n.burst,
    };
  };
})();
