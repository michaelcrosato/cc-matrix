// OP 4: POWDER KEG DEPOT (dusk; explosions). Sideways 0 -> 3000 at 16 u/s; railway tracks at depth 260; the boss arena.
(() => {
const E = My3D2dge, WP = globalThis.WP, L = WP.Layout;
L.seed(404);
const scenery = [
  L.row('shed', -200, 3200, 470, { every: 230, jitter: 60, dj: 40, size: [1, 1.2] }),
  L.row('crane', 200, 3000, 600, { every: 700, jitter: 100 }),
  [L.one('waterTower', 1600, 400), L.one('warehouse', 2400, 330), L.one('floodlight', 700, 200, { light: [62, 60, '#fff0c0'] }), L.one('floodlight', 1500, 210, { light: [62, 60, '#fff0c0'] }), L.one('floodlight', 2300, 200, { light: [62, 60, '#fff0c0'] }),
    L.one('trainTrackBuffer', -60, 268), L.one('flatcar', 600, 268, { facing: 0 }), L.one('flatcar', 1220, 268, { facing: 0 }), L.one('trainCar', 1900, 268, { facing: 0 })],
  L.row('ammoCrate', 100, 2900, 140, { every: 310, jitter: 90, dj: 10, size: [1, 1.2], turn: .6 }),
  L.row('barbedFence', -100, 3000, 104, { every: 33 }),
  L.row('palm', -200, 3200, 820, { every: 150, jitter: 80, dj: 120, size: [1, 1.4], turn: 1 })
];
const dusk = (x, y, D, t) => { const c = WP.FLOORS.depot(x, y, D, t); return D > 300 && E.noise2(x / 9 + t, y / 9) > .985 ? 0xff40a0ff : c; };
WP.defStage({
  id: 'op4', n: 4, name: 'POWDER KEG DEPOT', music: 'op4', time: 'dusk',
  sky: { sky: ['#2a1a4a', '#6a2a5a', '#c8503a', '#f8983a'], sun: { x: .2, y: .84, r: 22, color: '#ffb060' }, stars: 14, starsY: .3, layers: [{ kind: 'clouds', color: '#a84a5a', y: .34, height: .12, parallax: .05 }, { kind: 'city', color: '#2a1a2a', y: .84, height: .16, parallax: .08, seed: 5 }, { kind: 'hills', color: '#1a1020', y: .93, height: .08, parallax: .12 }] },
  fog: { color: '#6a3a4a', near: 380, far: 1500 }, grade: { mul: '#ffd8c0', add: '#140408' },
  floor: dusk, outside: '#3a2a2a', cam: { h: 28, pitch: 6, fov: 60 },
  rail: [{ d: 0, x: 0, y: WP.Y0, angle: -Math.PI / 2 }, { d: 2700, x: 2700, y: WP.Y0 }],
  speed: 16,
  holds: [{ d: 950, until: 'air', max: 25 }, { d: 2000, until: 'air', max: 25 }, { d: 2700, until: 'boss' }],
  scenery,
  props: [
    ['fuelTank', 'ftA', 120, 190], ['fuelTank', 'ft1', 1840, 180], ['fuelTank', 'ft2', 1900, 186], ['fuelTank', 'ft3', 1960, 180], ['fuelTank', 'ft4', 1110, 420, { size: 1.3 }],
    ['crate', 'c1', 290, 150], ['crate', 'c2', 308, 152], ['ammoCrate', 'ac1', 480, 120], ['barrel', 'b1', 820, 140], ['barrel', 'b2', 836, 146], ['barrel', 'b3', 1460, 130],
    ['sandbags', 'sb1', 860, 150, { size: 1.3 }], ['sandbags', 'sb2', 2210, 130], ['ammoWagon', 'aw1', 2560, 248, { facing: 0 }], ['ammoWagon', 'aw2', 2700, 248, { facing: 0 }], ['ammoWagon', 'aw3', 2840, 248, { facing: 0 }],
    ['crate', 'c3', 2470, 160, { drop: 'ration' }], ['barrel', 'b4', 2640, 150], ['crate', 'c5', 1280, 130, { drop: 'medkit' }], ['crate', 'c6', 2060, 124, { drop: 'ration' }], ['ammoCrate', 'ac2', 1020, 118], ['ammoCrate', 'ac3', 2560, 122], ['ammoCrate', 'ac4', 1720, 112], ['crate', 'c7', 600, 126, { drop: 'mag' }]
  ],
  beats: [
    { at: 0, radio: 'op4.go' },
    { at: 60, spawn: [['rifleman', { side: 'R', dz: 220, n: 4, gap: .6, beh: 'cross', stops: 1 }]] },
    { at: 220, props: [['ammoCrate', 'rpgc1', 330, 200], ['ammoCrate', 'rpgc2', 420, 196]], spawn: [['rpg', { x: 330, y: WP.Y0 - 210, z: 14, beh: 'stand', kneelFire: true, cycles: 3 }], ['rpg', { x: 420, y: WP.Y0 - 206, z: 14, beh: 'stand', kneelFire: true, cycles: 3, delay: .8 }]] },
    { at: 400, spawn: [['jeep', { side: 'L', dz: 240, beh: 'cross' }], ['mortar', { lx: -60, dz: 650 }], ['mortar', { lx: -40, dz: 650, loader: true }]] },
    { at: 560, radio: 'cargo.in', run: (sim, b) => { const c = sim.spawn('cargoPlane', { side: 'L', dz: 420, z: 190, beh: 'flyover', dir: 1, beat: b }); c.drops = [[90, 'para', 2], [200, 'crate', 1], [300, 'para', 3]]; } },
    { at: 760, spawn: [['brute', { beh: 'popup', cover: 'sb1', cycles: 3 }], ['rifleman', { beh: 'popup', cover: 'sb1', n: 3, gap: .5, cycles: 2 }]] },
    { at: 950, hold: 950, radio: 'air.in', spawn: [['heli', { lx: -120, dz: 900, z: 80, beh: 'heli' }]] },
    { at: 1150, spawn: [['forklift', { side: 'R', dz: 160, beh: 'cross', carry: 'gbox' }], ['rifleman', { side: 'L', dz: 230, n: 3, gap: .7, beh: 'cross', stops: 1 }]] },
    { at: 1350, spawn: [['apc', { side: 'R', dz: 300, beh: 'apc', stayT: 14 }]] },
    { at: 1600, spawn: [['sniper', { x: 1600, y: WP.Y0 - 392, z: 92, beh: 'snipe' }], ['rifleman', { side: 'L', dzs: [170, 230], n: 4, gap: .6, beh: 'cross', stops: 1 }]] },
    { at: 1800, tip: 'tip.barrel', spawn: [['rifleman', { lxs: [-30, -10, 30, 50, 90, 110], dz: 166, n: 6, gap: .2, beh: 'stand', cycles: 2 }]] },
    { at: 2000, hold: 2000, spawn: [['heli', { lx: 140, dz: 900, z: 70, beh: 'heli' }], ['rpg', { beh: 'popup', cover: 'sb2', n: 2, gap: .7, cycles: 3, kneelFire: true }]] },
    { at: 2200, spawn: [['knife', { side: 'R', dz: 110, beh: 'advance', n: 2, gap: .8 }], ['officer', { side: 'L', dz: 190, beh: 'officer' }]] },
    { at: 2400, spawn: [['jeep', { side: 'R', dz: 200, beh: 'cross' }], ['rifleman', { x: 2400 - 51, y: WP.Y0 - 300 + 36, beh: 'dismount', dir: -1, n: 2, gap: .6 }], ['rifleman', { x: 2400 + 51, y: WP.Y0 - 300 + 36, beh: 'dismount', dir: 1, n: 2, gap: .6 }]] },
    { at: 2700 }
  ],
  quotas: { soldier: 37, vehicle: 3, air: 2 }, boss: 'ironHog', perk: 'suppliesSeized', clearHeal: 10,
  reinforce: { soldier: ['rifleman', 'rifleman', 'grenadier', 'rpg'], vehicle: 'jeep' },
  ambient: [['seagull', 300, 700], ['seagull', 1700, 640]],
  attract: [{ d: 1790, seconds: 20 }]
});
})();
