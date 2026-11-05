// OP 1: RADIO HILL (dawn; teaches everything). Sideways rail 0 -> 2700 at 16 u/s.
(() => {
const WP = globalThis.WP, L = WP.Layout;
L.seed(101);
const scenery = [
  // far: palms, rocks, the sea's edge
  L.row('palm', -300, 3100, 900, { every: 110, jitter: 60, dj: 200, size: [1.1, 1.6], turn: 1 }),
  L.row('rock', -300, 3100, 700, { every: 170, jitter: 80, dj: 120, size: [1.2, 2.4], turn: 3 }),
  L.row('bush', -300, 3100, 520, { every: 90, jitter: 50, dj: 80, size: [1, 1.8] }),
  // mid: the camp's tents, the radar building and dish, fuel drums
  L.row('tent', 300, 700, 260, { every: 130, jitter: 20, dj: 20, size: [1.2, 1.3], turn: .3 }),
  [L.one('radarHut', 2550, 420, { size: 1.4 }), L.one('radarDish', 2600, 440, { size: 1.5 }), L.one('tent', 1250, 300, { size: 1.3 }), L.one('tent', 1850, 280, { size: 1.3, facing: 1.3 })],
  L.row('palm', -100, 2900, 360, { every: 260, jitter: 90, dj: 50, size: [1, 1.3], turn: 1 }),
  // near: barbed wire posts, rocks, bushes
  L.row('barbedFence', -100, 2900, 132, { every: 33, jitter: 0 }),
  L.row('rock', 0, 2900, 58, { every: 340, jitter: 120, size: [.8, 1.2], turn: 3 }),
  L.row('bush', -100, 2900, 64, { every: 160, jitter: 60, dj: 8, size: [.7, 1] })
];
WP.defStage({
  id: 'op1', n: 1, name: 'RADIO HILL', music: 'op1', time: 'dawn',
  sky: { sky: ['#1d1a3a', '#4e2c5e', '#a8506e', '#e88a6a', '#f6c48c'], sun: { x: .72, y: .78, r: 16, color: '#ffd6a0' }, stars: 20, starsY: .3,
    layers: [{ kind: 'clouds', color: '#d88a8a', y: .3, height: .1, parallax: .05 }, { kind: 'mountains', color: '#5a3a5e', y: .62, height: .22, parallax: .08 }, { kind: 'hills', color: '#6e4a62', y: .82, height: .12, parallax: .14 }, { kind: 'sea', color: '#9a6a82', y: .93 }] },
  fog: { color: '#d8907a', near: 380, far: 1700 }, grade: { mul: '#fff0e6', add: '#100408' },
  floor: 'hill', outside: '#8a7a3a', cam: { h: 28, pitch: 6, fov: 60 },
  rail: [{ d: 0, x: 0, y: WP.Y0, angle: -Math.PI / 2 }, { d: 2700, x: 2700, y: WP.Y0 }],
  speed: 16,
  holds: [{ d: 520, until: 'vehicle', max: 15 }, { d: 905, until: 'prop:m1', max: 8 }, { d: 1505, until: 'prop:m2', max: 8 }, { d: 1720, until: 'air', max: 30 }, { d: 2160, until: 'prop:m3', max: 8 }, { d: 2700, until: 'boss' }],
  scenery,
  props: [
    ['sandbags', 'sbA', 230, 110, { size: 1.2 }], ['sandbags', 'sbB', 620, 100], ['sandbags', 'sbC', 880, 118, { size: 1.2 }], ['sandbags', 'sbD', 1450, 105],
    ['sandbags', 'sbE', 1990, 170, { size: 1.3 }], ['sandbags', 'sbF', 2500, 110], ['sandbags', 'sbM', 1440, 600, { size: 1.4 }], ['sandbags', 'sbG', 2780, 112],
    ['mast', 'm1', 900, 380], ['mast', 'm2', 1500, 420], ['mast', 'm3', 2150, 360],
    ['ammoCrate', 'ac1', 330, 236], ['ammoCrate', 'ac2', 1660, 160], ['crate', 'cr1', 1120, 150], ['crate', 'cr2', 2380, 130],
    ['wreck', 'wj', 1000, 150, { shapeId: 'jeepWreck', facing: .4 }], ['barrel', 'rb0', 760, 128]
  ],
  beats: [
    { at: 0, radio: 'op1.go', tip: 'tip.aim' },
    { at: 40, spawn: [['rifleman', { side: 'R', dz: 200, n: 3, gap: .8, beh: 'cross', stops: 1, exact: true }]] },
    { at: 160, spawn: [['rifleman', { beh: 'popup', cover: 'sbA', n: 2, gap: .5, cycles: 2 }], ['goat', { side: 'R', dz: 130, carry: 'mag' }]] },
    { at: 300, spawn: [['grenadier', { beh: 'popup', cover: 'sbB', cycles: 2 }], ['rifleman', { side: 'L', dz: 240, n: 2, gap: .9, beh: 'cross', stops: 1 }]] },
    { at: 420, props: [['crate', 'c4a', 470, 120, { drop: 'mag' }], ['crate', 'c4b', 520, 126, { drop: 'gren' }], ['crate', 'c4c', 570, 118, { drop: 'ration' }]] },
    { at: 520, hold: 520, tip: 'tip.grenade', spawn: [['jeep', { side: 'R', dz: 250, beh: 'cross' }]], run: sim => sim.tip('tip.vehicle') },
    { at: 680, spawn: [['knife', { beh: 'advance', lx: 60, dz: 120, stopD: 66 }], ['rifleman', { side: 'L', dz: 300, n: 2, gap: .5, beh: 'sprint' }]] },
    { at: 820, tip: 'tip.mast', spawn: [['sniper', { x: 905, y: WP.Y0 - 372, z: 90, beh: 'snipe' }], ['rifleman', { beh: 'popup', cover: 'sbC', n: 3, gap: .6, cycles: 2 }]] },
    { at: 1000, spawn: [['truck', { side: 'R', dz: 300, beh: 'truck' }]] },
    { at: 1180, spawn: [['officer', { side: 'R', dz: 180, beh: 'officer' }], ['rifleman', { side: 'L', dz: 200, n: 2, gap: .6, beh: 'cross', stops: 1 }]] },
    { at: 1350, spawn: [['mortar', { x: 1430, y: WP.Y0 - 590, beh: 'mortar' }], ['mortar', { x: 1452, y: WP.Y0 - 590, beh: 'mortar', loader: true }]] },
    { at: 1500, spawn: [['rifleman', { side: 'L', dzs: [150, 260], n: 2, gap: .7, beh: 'cross', stops: 1 }], ['rifleman', { side: 'R', dzs: [180, 230], n: 2, gap: .7, beh: 'cross', stops: 1 }]], props: [['barrel', 'rb1', 1540, 170], ['barrel', 'rb2', 1556, 176]] },
    { at: 1720, hold: 1720, radio: 'air.in', spawn: [['heli', { lx: 160, dz: 900, z: 70, beh: 'heli' }]] },
    { at: 1900, tip: 'tip.headshot', spawn: [['brute', { beh: 'popup', cover: 'sbE', cycles: 3 }], ['grenadier', { side: 'R', dz: 200, n: 2, gap: .8, beh: 'cross', stops: 1 }]] },
    { at: 2080, run: (sim, b) => { const h = sim.ents.find(e => e.type === 'heli' && !e.dead); for (let i = 0; i < sim.count(4); i++) { const lx = -150 + i * 100; if (h) { const w = [h.x + (i - 1.5) * 20, h.y]; sim.spawn('para', { x: w[0], y: w[1], z: Math.max(90, h.z - 10), beat: b }); } else sim.spawn('para', { lx, dz: 200 + (i % 2) * 40, z: 170, beat: b }); } if (!h) { sim.spawn('cargoPlane', { side: 'L', dz: 520, z: 200, beh: 'flyover', dir: 1 }); sim.radio('cargo.in'); } } },
    { at: 2250, spawn: [['jeep', { side: 'L', dz: 220, beh: 'cross' }], ['rifleman', { side: 'R', dz: 190, n: 3, gap: .7, beh: 'cross', stops: 1 }]], props: [['crate', 'cfury', 2340, 140, { drop: 'fury' }]], run: sim => sim.after(2, () => sim.tip('tip.fury')) },
    { at: 2450, spawn: [['knife', { beh: 'popup', cover: 'sbF', n: 2, gap: .4, cycles: 2 }], ['rifleman', { side: 'L', dz: 230, n: 3, gap: .7, beh: 'cross', stops: 1 }]] },
    { at: 2700 }
  ],
  quotas: { soldier: 36, vehicle: 3, air: 1 }, objective: { kind: 'masts', ids: ['m1', 'm2', 'm3'] },
  boss: 'bigEar', perk: 'commsDown', clearHeal: 10, animals: ['goat'],
  reinforce: { soldier: ['rifleman', 'rifleman', 'grenadier', 'knife'], vehicle: 'jeep' },
  ambient: [['goat', 200, 140, 'mag'], ['goat', 1200, 150, 'gren'], ['seagull', 600, 400], ['seagull', 2000, 500]],
  attract: [{ d: 1500, seconds: 25 }]
});
})();
