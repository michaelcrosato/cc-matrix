// Operation Wolfpack: shared namespace, the screen's geometry, the depth projection and the seeded random streams.
// Every file in src/ adds to WP. The battle (20-battle.js) is plain JavaScript with no DOM, so the tests run it in Node.
(() => {
'use strict';
const WP = (globalThis.WP = globalThis.WP || {});

WP.TITLE = 'Operation Wolfpack';
WP.SOURCE = 'Operation Wolf';

// the buffer is 480 x 270. The battlefield fills the top 234 rows; the bottom strip is the HUD.
WP.W = 480;
WP.H = 270;
WP.PLAY_H = 234;
WP.HZ = 112;      // the horizon's row
WP.CAMH = 50;     // the camera's height above the ground, in world units
WP.FOC = 170;     // focal length: a thing's scale is FOC / its depth

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
WP.clamp = clamp;
WP.lerp = (a, b, t) => a + (b - a) * t;

// the perspective: a ground point at (x, z) seen from the camera at camX
WP.proj = (x, z, camX) => {
  const k = WP.FOC / z;
  return { k, sx: WP.W / 2 + (x - camX) * k, gy: WP.HZ + WP.CAMH * k };
};
// the ground point under a screen pixel (null above the horizon)
WP.unproj = (sx, sy, camX) => {
  if (sy <= WP.HZ + 1) return null;
  const z = (WP.CAMH * WP.FOC) / (sy - WP.HZ);
  return { x: camX + ((sx - WP.W / 2) * z) / WP.FOC, z };
};
// the half width of the view at a depth, in world units
WP.halfWidth = z => (WP.W / 2) * z / WP.FOC;

// the rail: camera x at a distance along the operation, linear between knots [[dist, x], ...]
WP.railX = (knots, d) => {
  if (d <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [d1, x1] = knots[i];
    if (d <= d1) {
      const [d0, x0] = knots[i - 1];
      return x0 + ((x1 - x0) * (d - d0)) / (d1 - d0);
    }
  }
  return knots[knots.length - 1][1];
};

// a seeded random stream (mulberry32): the same seed gives the same battle on every machine
WP.rng = seed => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
WP.hashSeed = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

// the seat colour the crosshair and the HUD use for player 1 (co-op seats would take the others)
WP.SEAT = ['#ff4a3a', '#4ab8ff', '#8aff5a', '#ffd84a'];
})();
