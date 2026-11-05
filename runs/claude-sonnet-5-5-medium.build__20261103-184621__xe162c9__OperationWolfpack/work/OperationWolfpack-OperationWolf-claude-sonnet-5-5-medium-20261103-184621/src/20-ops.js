// The four operations as data: floors, skies, rails, beats, quotas, bosses. A new operation is a new entry here.
(() => {
const E = My3D2dge, WP = globalThis.WP;
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, s) => { const gx = x / s, gy = y / s, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
WP.hash = hash; WP.vn = vn;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];

// floors: world (x, y) -> [r, g, b]
const floors = {
  hill(x, y) {   // grass hill with a dirt road along x at y -190..-250
    const n = vn(x, y, 14) * .5 + vn(x, y, 40) * .5, g = mix([86, 120, 58], [122, 150, 70], n);
    const rd = Math.abs(y + 220); let c = g;
    if (rd < 34) { const t = rd < 26 ? 1 : 1 - (rd - 26) / 8; c = mix(g, mix([150, 112, 76], [176, 134, 92], vn(x, y, 9)), t); }
    if (((x / 22) | 0) % 5 === 0 && rd < 3) c = sh(c, 1.08);
    return sh(c, .92 + hash(x | 0, y | 0) * .08);
  },
  river(x, y) {  // a river down the middle (x -150..150) with muddy banks and jungle floor
    const wob = Math.sin(y / 90) * 24, ax = Math.abs(x - wob);
    const n = vn(x, y, 12) * .6 + vn(x, y, 36) * .4;
    if (ax < 150) { const w = mix([40, 96, 110], [70, 140, 150], vn(x * .6, y * 1.4 + 0, 11) * .6 + .2); return sh(w, .92 + Math.sin(y / 5 + x / 9) * .04); }
    if (ax < 175) return mix([110, 96, 60], [140, 120, 72], n);
    return mix([40, 84, 44], [70, 120, 56], n);
  },
  village(x, y) {
    const n = vn(x, y, 12) * .6 + vn(x, y, 34) * .4, rd = Math.abs(y + 210);
    let c = mix([176, 150, 94], [204, 176, 114], n);
    if (rd > 70) c = mix(c, mix([96, 132, 64], [126, 156, 76], n), Math.min(1, (rd - 70) / 20));
    if (rd < 38) c = sh(c, .88 + vn(x, y, 5) * .1);
    return c;
  },
  kennel(x, y) {
    const n = vn(x, y, 10) * .6 + vn(x, y, 30) * .4, rd = Math.abs(y + 215);
    let c = mix([74, 70, 62], [104, 98, 84], n);
    if (rd > 80) c = mix(c, mix([48, 62, 40], [66, 82, 50], n), Math.min(1, (rd - 80) / 25));
    if (((x / 30) | 0) % 3 === 0 && rd < 40) c = sh(c, .9);
    return c;
  }
};
WP.FLOORS = floors;

// scenery generator: [{ k, x, y, s }] sorted by the travel coordinate
const gen = (seed, o) => {
  const r = WP.mulberry(seed), out = [];
  for (const rule of o) {
    const [kind, from, to, every, ymin, ymax, jitter = 0] = rule;
    for (let a = from; a < to; a += every * (.6 + r() * .8)) {
      const b = ymin + r() * (ymax - ymin);
      out.push({ k: kind, a, b, s: .85 + r() * .4, v: r() });
    }
  }
  return out;
};

const L = (side, dz) => ({ side, dz });

// ================= OP 1 : RADIO HILL ====================================================
WP.STAGES.push({
  id: 'op1', n: 1, name: 'RADIO HILL', card: 'DESTROY THE ENEMY RADIO MASTS', music: 'op1',
  sky: { sky: ['#2a2450', '#8a4a72', '#ee9470', '#f8cf90'], sun: { x: .72, y: .6, r: 20, color: '#ffe0a8' }, layers: [{ kind: 'mountains', color: '#6a4666', y: .55, height: .13, parallax: .1 }, { kind: 'hills', color: '#4f4a62', y: .62, height: .08, parallax: .2 }] },
  fog: { color: '#e8a884', near: 380, far: 1700 }, grade: { mul: '#fff0e0' }, floor: 'hill',
  cam: { h: 28, pitch: 6 }, travel: 'x', x0: 0, y0: 0, len: 2300, speed: 16,
  holds: [{ d: 300, max: 24 }, { d: 700, max: 26 }, { d: 1000, max: 26 }, { d: 1200, max: 30 }, { d: 1700, max: 26 }, { d: 2100, max: 26 }],
  quotas: { soldier: 40, vehicle: 3, air: 1 }, objective: 'masts', boss: 'bigear', bossSay: 'op1.boss', clearHeal: 15, animals: ['goat'],
  reinforce: { soldier: ['rifleman', 'rifleman', 'knifer'], vehicle: ['jeep'], air: ['heli'] },
  setup: [['mast', { lx: 620, dz: 330, world: true }], ['mast', { lx: 1380, dz: 360, world: true }], ['mast', { lx: 2050, dz: 330, world: true }],
    ['fuel', { lx: 900, dz: 270, world: true }], ['barrel', { lx: 300, dz: 190, world: true }], ['barrel', { lx: 316, dz: 186, world: true }], ['crate', { lx: 520, dz: 140, world: true }], ['crate', { lx: 1200, dz: 150, world: true }]],
  beats: [
    { at: 0, say: 'op1.go', card: 'OPERATION 1: RADIO HILL' },
    { at: 30, spawn: [['rifleman', { side: 'R', n: 3, gap: .9, dz: 230 }]] },
    { at: 120, spawn: [['popper', { lx: -90, dz: 200 }], ['popper', { lx: 80, dz: 190 }], ['rifleman', { side: 'L', n: 2, gap: 1, dz: 240 }]] },
    { at: 240, spawn: [['rifleman', { side: 'R', n: 3, gap: .8, alt: true, dz: 210 }], ['knifer', { side: 'R', n: 2, gap: 1.4, dz: 150 }]] },
    { at: 420, spawn: [['jeep', { side: 'R', dz: 230 }], ['rifleman', { side: 'L', n: 2, gap: 1, dz: 200 }]] },
    { at: 600, spawn: [['popper', { lx: -110, dz: 210 }], ['popper', { lx: 20, dz: 230 }], ['popper', { lx: 120, dz: 200 }], ['grenadier', { side: 'L', dz: 260 }]] },
    { at: 780, spawn: [['sniper', { lx: -140, dz: 360, z: 36 }], ['rifleman', { side: 'R', n: 3, gap: .9, dz: 220 }]] },
    { at: 940, spawn: [['heavy', { side: 'L', dz: 200 }], ['rifleman', { side: 'R', n: 2, gap: 1, dz: 230 }]] },
    { at: 1090, say: 'op1.air', spawn: [['heli', { lx: 0, dz: 420, side: 'R' }]] },
    { at: 1250, spawn: [['knifer', { side: 'L', n: 3, gap: 1, alt: true, dz: 150 }], ['popper', { lx: 60, dz: 220 }], ['popper', { lx: -70, dz: 200 }]] },
    { at: 1450, spawn: [['jeep', { side: 'L', dz: 240 }], ['grenadier', { side: 'R', dz: 250 }]] },
    { at: 1620, spawn: [['heavy', { side: 'R', dz: 210 }], ['rifleman', { side: 'L', n: 3, gap: .8, dz: 220 }], ['sniper', { lx: 130, dz: 380, z: 36 }]] },
    { at: 1900, spawn: [['rifleman', { side: 'R', n: 4, gap: .7, alt: true, dz: 220 }], ['knifer', { side: 'L', n: 2, gap: 1, dz: 150 }]] },
    { at: 2060, spawn: [['jeep', { side: 'R', dz: 220 }], ['popper', { lx: -50, dz: 210 }], ['popper', { lx: 90, dz: 200 }]] }
  ],
  scenery: () => gen(11, [['palm', -200, 2800, 55, 75, 130], ['palm', -200, 2800, 70, -170, -140], ['bush', -200, 2800, 28, 50, 130], ['hut', 100, 2600, 260, -330, -280], ['rock', 0, 2800, 90, -300, -200], ['tower', 300, 2600, 520, -420, -380]])
});

// ================= OP 2 : MANGROVE RUN ==================================================
WP.STAGES.push({
  id: 'op2', n: 2, name: 'MANGROVE RUN', card: 'SINK THE RIVER PATROL', music: 'op2',
  sky: { sky: ['#17324a', '#3c7890', '#8cc0b0', '#d6e6b8'], sun: { x: .3, y: .55, r: 16, color: '#fff2c0' }, layers: [{ kind: 'forest', color: '#244a38', y: .6, height: .1, parallax: .15 }, { kind: 'clouds', color: '#c8e0d0', y: .3, height: .06, parallax: .3 }] },
  fog: { color: '#a8cdb8', near: 300, far: 1500 }, grade: { mul: '#e8fff0' }, floor: 'river',
  cam: { h: 26, pitch: 5 }, travel: 'y', x0: 0, y0: 0, len: 1700, speed: 18,
  holds: [{ d: 280, max: 24 }, { d: 640, max: 26 }, { d: 960, max: 26 }, { d: 1300, max: 26 }],
  quotas: { soldier: 16, vehicle: 14 }, boss: 'riverhog', bossSay: 'op2.boss', clearHeal: 15, refill: true, animals: ['hen'],
  reinforce: { soldier: ['rifleman', 'popper'], vehicle: ['skiff', 'boat'] },
  setup: [['crate', { lx: -170, dz: 120, world: true }], ['barrel', { lx: 190, dz: 160, world: true }]],
  beats: [
    { at: 0, say: 'op2.go', card: 'OPERATION 2: MANGROVE RUN' },
    { at: 40, spawn: [['skiff', { lx: -50, dz: 520, n: 2, gap: 1.6 }], ['rifleman', { side: 'R', dz: 210, n: 2, gap: 1 }]] },
    { at: 160, say: 'op2.canoe', spawn: [['canoe', { side: 'L', dz: 180 }], ['boat', { lx: 60, dz: 560 }]] },
    { at: 340, spawn: [['rifleman', { side: 'L', n: 3, gap: .9, dz: 230 }], ['skiff', { lx: 40, dz: 540, n: 2, gap: 1.2 }]] },
    { at: 520, spawn: [['boat', { lx: -60, dz: 560 }], ['popper', { lx: 160, dz: 220 }], ['popper', { lx: -170, dz: 230 }]] },
    { at: 700, spawn: [['canoe', { side: 'R', dz: 200 }], ['skiff', { lx: 0, dz: 520, n: 3, gap: 1.2 }], ['knifer', { side: 'L', dz: 170 }]] },
    { at: 880, spawn: [['boat', { lx: 40, dz: 560, n: 2, gap: 3 }], ['rifleman', { side: 'R', n: 3, gap: .8, dz: 210 }]] },
    { at: 1050, spawn: [['grenadier', { side: 'L', dz: 260 }], ['sniper', { lx: 170, dz: 340, z: 30 }], ['skiff', { lx: -30, dz: 500, n: 2, gap: 1 }]] },
    { at: 1200, spawn: [['heavy', { side: 'R', dz: 220 }], ['rifleman', { side: 'L', n: 3, gap: .8, dz: 220 }]] },
    { at: 1380, spawn: [['boat', { lx: -40, dz: 560 }], ['skiff', { lx: 50, dz: 520, n: 2, gap: 1 }], ['popper', { lx: -170, dz: 210 }]] }
  ],
  scenery: () => gen(22, [['mangrove', -100, 2000, 24, 160, 330], ['mangrove', -100, 2000, 24, -330, -165], ['reeds', -100, 2000, 18, 150, 190], ['reeds', -100, 2000, 18, -190, -150], ['hut', 200, 1900, 300, 190, 260]])
});

// ================= OP 3 : PALM VILLAGE ==================================================
WP.STAGES.push({
  id: 'op3', n: 3, name: 'PALM VILLAGE', card: 'CLEAR THE VILLAGE. SPARE THE VILLAGERS', music: 'op3',
  sky: { sky: ['#2c6aa8', '#58a0d4', '#9ccce8', '#e8f0e0'], sun: { x: .5, y: .3, r: 18, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .3, height: .05, parallax: .3 }, { kind: 'hills', color: '#5a8a58', y: .62, height: .09, parallax: .15 }] },
  fog: { color: '#cfe4d8', near: 400, far: 1800 }, grade: { mul: '#ffffff' }, floor: 'village',
  cam: { h: 28, pitch: 6 }, travel: 'x', x0: 0, y0: 0, len: 2000, speed: 16,
  holds: [{ d: 320, max: 26 }, { d: 700, max: 26 }, { d: 1100, max: 28 }, { d: 1500, max: 28 }],
  quotas: { soldier: 30, vehicle: 3, air: 1 }, boss: 'butcher', bossSay: 'op3.boss', clearHeal: 45, animals: ['goat', 'hen'],
  reinforce: { soldier: ['rifleman', 'popper', 'knifer'], vehicle: ['jeep'], air: ['heli'] },
  setup: [['fuel', { lx: 740, dz: 260, world: true }], ['crate', { lx: 400, dz: 140, world: true }], ['barrel', { lx: 1100, dz: 180, world: true }], ['barrel', { lx: 1116, dz: 176, world: true }], ['crate', { lx: 1500, dz: 150, world: true }]],
  beats: [
    { at: 0, say: 'op3.go', card: 'OPERATION 3: PALM VILLAGE' },
    { at: 40, spawn: [['civ', { side: 'L', dz: 170, n: 3, gap: 2.2 }], ['rifleman', { side: 'R', n: 3, gap: .9, dz: 220 }]] },
    { at: 200, say: 'op3.civ', spawn: [['popper', { lx: -100, dz: 200 }], ['popper', { lx: 90, dz: 210 }], ['civ', { side: 'R', dz: 150, n: 2, gap: 1.8 }]] },
    { at: 380, spawn: [['jeep', { side: 'R', dz: 230 }], ['civ', { side: 'L', dz: 190, n: 2, gap: 1.5 }], ['goat', { side: 'L', dz: 120 }]] },
    { at: 560, spawn: [['knifer', { side: 'L', n: 2, gap: 1.3, dz: 150 }], ['rifleman', { side: 'R', n: 3, gap: .9, dz: 210 }], ['civ', { side: 'R', dz: 170, n: 2, gap: 2 }]] },
    { at: 800, spawn: [['grenadier', { side: 'R', dz: 250 }], ['heavy', { side: 'L', dz: 210 }], ['civ', { side: 'L', dz: 140, n: 2, gap: 1.8 }]] },
    { at: 980, spawn: [['heli', { lx: 0, side: 'L', dz: 420 }], ['popper', { lx: 0, dz: 220 }], ['hen', { side: 'R', dz: 110 }]] },
    { at: 1180, spawn: [['jeep', { side: 'L', dz: 240 }], ['rifleman', { side: 'R', n: 3, gap: .8, dz: 220 }], ['civ', { side: 'R', dz: 180, n: 3, gap: 1.6 }]] },
    { at: 1340, spawn: [['sniper', { lx: -130, dz: 350, z: 34 }], ['popper', { lx: 60, dz: 200 }], ['popper', { lx: -80, dz: 220 }], ['knifer', { side: 'R', dz: 150, n: 2, gap: 1.2 }]] },
    { at: 1600, spawn: [['jeep', { side: 'R', dz: 220 }], ['heavy', { side: 'L', dz: 220 }], ['civ', { side: 'L', dz: 160, n: 2, gap: 1.4 }]] }
  ],
  scenery: () => gen(33, [['hut', -100, 2400, 120, -330, -280], ['hut', -100, 2400, 150, -420, -360], ['palm', -200, 2600, 60, 75, 130], ['palm', -200, 2600, 80, -350, -300], ['bush', -200, 2600, 40, 50, 120], ['lamp', 0, 2400, 200, -160, -150]])
});

// ================= OP 4 : THE KENNEL ====================================================
WP.STAGES.push({
  id: 'op4', n: 4, name: 'THE KENNEL', card: 'BREAK THE HOSTAGES OUT', music: 'op4',
  sky: { sky: ['#0a0c24', '#241c48', '#54306a', '#a4506a'], stars: true, moon: { x: .22, y: .22, r: 10, color: '#f4eed0' }, layers: [{ kind: 'mountains', color: '#1a1830', y: .6, height: .12, parallax: .1 }] },
  fog: { color: '#3a2a4a', near: 300, far: 1500 }, grade: { mul: '#c8c0ff' }, floor: 'kennel', dark: true,
  cam: { h: 28, pitch: 6 }, travel: 'x', x0: 0, y0: 0, len: 1700, speed: 15,
  holds: [{ d: 300, max: 28 }, { d: 700, max: 30 }, { d: 1100, max: 30 }, { d: 1450, max: 30 }],
  quotas: { soldier: 32, vehicle: 1 }, boss: 'kragg', bossSay: 'op4.boss', clearHeal: 0, animals: ['goat'],
  reinforce: { soldier: ['rifleman', 'popper', 'knifer', 'heavy'], vehicle: ['jeep'] },
  setup: [['crate', { lx: 380, dz: 140, world: true }], ['fuel', { lx: 1000, dz: 270, world: true }], ['crate', { lx: 1350, dz: 150, world: true }], ['barrel', { lx: 700, dz: 190, world: true }]],
  beats: [
    { at: 0, say: 'op4.go', card: 'OPERATION 4: THE KENNEL' },
    { at: 50, spawn: [['rifleman', { side: 'R', n: 3, gap: .9, dz: 220 }], ['popper', { lx: -80, dz: 200 }], ['popper', { lx: 90, dz: 210 }]] },
    { at: 230, say: 'op4.run', spawn: [['hostage', { side: 'L', dz: 170, n: 2, gap: 2.5 }], ['rifleman', { side: 'R', n: 3, gap: 1, dz: 215 }], ['knifer', { side: 'R', dz: 160, n: 1 }]] },
    { at: 430, spawn: [['sniper', { lx: 130, dz: 350, z: 34 }], ['heavy', { side: 'R', dz: 220 }], ['popper', { lx: -50, dz: 215 }]] },
    { at: 620, spawn: [['hostage', { side: 'L', dz: 190, n: 1 }], ['rifleman', { side: 'R', n: 3, gap: .8, dz: 210 }], ['grenadier', { side: 'R', dz: 250 }]] },
    { at: 860, spawn: [['jeep', { side: 'R', dz: 230 }], ['knifer', { side: 'L', n: 2, gap: 1.2, dz: 150 }]] },
    { at: 1020, spawn: [['hostage', { side: 'L', dz: 180, n: 2, gap: 2 }], ['heavy', { side: 'R', dz: 210 }], ['rifleman', { side: 'R', n: 3, gap: .9, dz: 225 }]] },
    { at: 1250, spawn: [['popper', { lx: -90, dz: 200 }], ['popper', { lx: 0, dz: 225 }], ['popper', { lx: 100, dz: 205 }], ['sniper', { lx: -130, dz: 360, z: 34 }]] },
    { at: 1400, spawn: [['rifleman', { side: 'L', n: 4, gap: .7, alt: true, dz: 220 }], ['heavy', { side: 'R', dz: 220 }]] }
  ],
  scenery: () => gen(44, [['fence', -100, 2000, 40, -300, -290], ['fence', -100, 2000, 40, -140, -136], ['tower', 100, 1900, 360, -330, -320], ['lamp', 0, 2000, 150, -150, -140], ['bush', -100, 2000, 60, 40, 130], ['hut', 150, 1800, 340, -360, -340]])
});
for (const s of WP.STAGES) { s.scen = null; s.getScenery = function () { if (!this.scen) this.scen = this.scenery().sort((a, b) => a.a - b.a); return this.scen; }; }
})();
