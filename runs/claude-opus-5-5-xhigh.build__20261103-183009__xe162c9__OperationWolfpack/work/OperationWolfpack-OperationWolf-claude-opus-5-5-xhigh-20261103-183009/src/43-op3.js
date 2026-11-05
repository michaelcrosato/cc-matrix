// OP 3: PALM VILLAGE (noon; civilians and windows). Sideways rail 0 -> 3000 at 15 u/s; holds at 1600 (APC), 2600 (plaza).
(() => {
const E = My3D2dge, WP = globalThis.WP, L = WP.Layout;
L.seed(303);
const houses = [];
// a street of whitewashed houses with tile roofs at depth 230: h1..h12 (their windows and doors are openings)
[60, 250, 440, 640, 860, 1060, 1260, 1460, 1690, 1990, 2190, 2420].forEach((x, i) => houses.push(L.one('villageHouse', x, 236 + (i % 2) * 18, { house: 'h' + (i + 1), size: 1 })));
const scenery = [
  houses,
  L.row('palm', -200, 3200, 340, { every: 95, jitter: 40, dj: 40, size: [1.1, 1.5], turn: 1 }),
  L.row('fishingBoat', -300, 3200, 760, { every: 260, jitter: 120, dj: 80, size: [1, 1.3], turn: 3 }),
  [L.one('chapelTower', 1800, 450, { size: 1.1 }), L.one('fountain', 2800, 220, { size: 1.2 }), L.one('well', 1180, 150), L.one('marketStall', 700, 160), L.one('marketStall', 760, 168, { facing: Math.PI / 2 + .2 }),
    L.one('marketStall', 2050, 150), L.one('cart', 520, 120, { facing: .3 }), L.one('cart', 1560, 130, { facing: 2.6 }), L.one('marketStall', 2700, 170), L.one('marketStall', 2930, 160, { facing: Math.PI / 2 - .3 })],
  L.row('bush', -100, 3100, 96, { every: 230, jitter: 80, size: [.8, 1.1] })
];
const sea = (x, y, D, t) => {
  if (D > 600) { const r = Math.sin(x * .03 + t * .8) + Math.sin(y * .05 - t * .6); return r > 1.5 ? 0xffd8c870 : 0xffb8a03a; }
  if (D > 560) return 0xffc8e0e8;
  return WP.FLOORS.village(x, y, D, t);
};
WP.defStage({
  id: 'op3', n: 3, name: 'PALM VILLAGE', music: 'op3', time: 'noon',
  sky: { sky: ['#3a7ad8', '#6aa8e8', '#b8dcf4'], sun: { x: .3, y: .25, r: 14, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .3, height: .12, parallax: .05 }, { kind: 'hills', color: '#5a8a6a', y: .86, height: .1, parallax: .08 }, { kind: 'sea', color: '#3aa0b8', y: .94 }] },
  fog: { color: '#c8e0ec', near: 500, far: 1800 }, grade: { mul: '#fff8ec', add: '#0a0600' },
  floor: sea, outside: '#3aa0b8', cam: { h: 27, pitch: 6, fov: 60 },
  rail: [{ d: 0, x: 0, y: WP.Y0, angle: -Math.PI / 2 }, { d: 3000, x: 3000, y: WP.Y0 }],
  speed: 15,
  holds: [{ d: 1600, until: 'vehicle', max: 30 }, { d: 2600, until: 'boss' }],
  reinfAt: 2600,
  scenery,
  props: [['crate', 'cv1', 320, 120], ['barrel', 'bv1', 980, 140], ['crate', 'cv2', 1330, 118, { drop: 'medkit' }], ['ammoCrate', 'av1', 1880, 130], ['crate', 'cv3', 2480, 126], ['barrel', 'bv2', 2120, 130], ['sandbags', 'sbP', 2720, 120, { size: 1.2 }]],
  beats: [
    { at: 0, radio: 'op3.go' },
    { at: 50, tip: 'tip.civilians', spawn: [['villager', { side: 'R', dz: 140, flee: true, n: 2, gap: .6 }], ['rifleman', { beh: 'window', opening: 'h1w2' }], ['rifleman', { beh: 'window', opening: 'h2w1', delay: .8 }], ['rifleman', { beh: 'window', opening: 'h2w2', delay: 1.6 }]] },
    { at: 200, spawn: [['chicken', { side: 'R', dz: 110, carry: 'mag' }], ['chicken', { side: 'R', dz: 125, carry: 'ration', delay: .4 }], ['chicken', { side: 'L', dz: 118, delay: .2 }], ['rifleman', { side: 'L', dz: 190, n: 2, gap: .8, beh: 'cross', stops: 1 }]] },
    { at: 350, spawn: [['jeep', { side: 'R', dz: 230, beh: 'cross' }], ['villager', { side: 'L', dz: 120, delay: .5 }]] },
    { at: 500, spawn: [['grenadier', { beh: 'roof', lxs: [-40, 120], dz: 240, z: 46, n: 2, gap: .7, cycles: 3 }], ['medic', { side: 'R', dz: 110, pair: true }], ['medic', { side: 'R', dz: 110, off: 46, pair: true }]] },
    { at: 680, spawn: [['officer', { lx: 30, dz: 175, beh: 'officer', noWalk: true }], ['rifleman', { beh: 'popup', lxs: [-110, -60, 60, 110], dz: 172, n: 4, gap: .5, cycles: 2 }]] },
    { at: 850, spawn: [['pig', { side: 'L', dz: 120, carry: 'gbox' }], ['knife', { beh: 'advance', opening: 'h5d', stopD: 80 }], ['knife', { beh: 'advance', opening: 'h6d', stopD: 84, delay: 1 }]] },
    { at: 1000, spawn: [['truck', { side: 'L', dz: 290, beh: 'truck' }], ['villager', { side: 'R', dz: 150, flee: true, n: 3, gap: .5 }]] },
    { at: 1200, spawn: [['brute', { lx: 40, dz: 160, beh: 'stand', cycles: 3 }], ['reporter', { side: 'L', dz: 120 }]] },
    { at: 1400, spawn: [['rifleman', { side: 'L', dzs: [150, 220, 180], n: 3, gap: .7, beh: 'cross', stops: 1 }], ['rifleman', { side: 'R', dzs: [200, 160], n: 2, gap: .9, beh: 'cross', stops: 1 }], ['villager', { side: 'L', dz: 130, delay: 1 }], ['villager', { side: 'R', dz: 175, delay: 2.2 }]] },
    { at: 1600, hold: 1600, spawn: [['apc', { side: 'R', dz: 300, beh: 'apc' }]] },
    { at: 1800, spawn: [['sniper', { x: 1800 - 6, y: WP.Y0 - 450 + 12, z: 60, beh: 'snipe' }], ['sniper', { x: 1800 + 6, y: WP.Y0 - 450 + 12, z: 60, beh: 'snipe', delay: 1.2 }], ['rifleman', { beh: 'window', opening: 'h9w1' }], ['rifleman', { beh: 'window', opening: 'h9w2', delay: .6 }], ['rifleman', { beh: 'window', opening: 'h8w2', delay: 1.2 }]] },
    { at: 2000, spawn: [['jeep', { side: 'L', dz: 210, beh: 'cross' }]], run: (sim, b) => { for (let i = 0; i < sim.count(3); i++) sim.spawn('para', { lx: -120 + i * 120, dz: 200 + (i % 2) * 30, z: 170, beat: b }); sim.spawn('cargoPlane', { side: 'R', dz: 520, z: 200, beh: 'flyover', dir: -1 }); } },
    { at: 2200, tip: 'tip.dynamite', props: [['crate', 'cdyn', 2300, 140, { drop: 'dynamite' }]], spawn: [['rifleman', { side: 'R', dzs: [150, 180, 210], n: 3, gap: .5, beh: 'cross', stops: 1 }], ['rifleman', { beh: 'window', opening: 'h11w1' }], ['rifleman', { beh: 'window', opening: 'h11w2', delay: .5 }], ['rifleman', { beh: 'window', opening: 'h12w1', delay: 1 }], ['villager', { side: 'L', dz: 400, delay: 1 }]] },
    { at: 2400, spawn: [['knife', { beh: 'advance', opening: 'h12d', stopD: 78 }], ['knife', { side: 'R', dz: 130, beh: 'advance', delay: .8 }], ['grenadier', { beh: 'roof', lxs: [0, 140], dz: 236, z: 46, n: 2, gap: .5 }], ['villager', { side: 'R', dz: 140, flee: true, n: 2, gap: .7 }]] },
    { at: 2600 }
  ],
  quotas: { soldier: 38, vehicle: 4 }, boss: 'warthog', perk: 'villageLiberated', clearHeal: 40,
  reinforce: { soldier: ['rifleman', 'rifleman', 'grenadier', 'knife'], vehicle: 'jeep' },
  ambient: [['chicken', 150, 140, 'mag'], ['seagull', 400, 600], ['villager', 900, 160], ['pig', 1500, 130, 'ration'], ['seagull', 2200, 640], ['villager', 2500, 150]],
  attract: [{ d: 1390, seconds: 20 }]
});
})();
