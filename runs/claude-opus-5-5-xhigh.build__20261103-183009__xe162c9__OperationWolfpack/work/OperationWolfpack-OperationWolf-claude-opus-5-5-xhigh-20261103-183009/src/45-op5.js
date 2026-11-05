// OP 5: THE KENNEL (night and rain; the breakout). Sideways 0 -> 2800 at 14 u/s; a yaw pan into the yard at 1500-1700.
(() => {
const E = My3D2dge, WP = globalThis.WP, L = WP.Layout;
L.seed(505);
const FIRE = [16, 70, '#ffa050'], FLOOD = [62, 90, '#e8f0ff'];
const scenery = [
  L.row('barbedFence', -100, 3000, 80, { every: 33 }), L.row('barbedFence', -100, 3000, 100, { every: 33 }),
  L.row('barracks', 100, 2600, 330, { every: 420, jitter: 40, dj: 20, size: [1, 1.1] }),
  [L.one('watchtower', 400, 290), L.one('watchtower', 1000, 300), L.one('watchtower', 1950, 290), L.one('cageBlock', 1640, 210), L.one('flagpole', 1250, 260), L.one('gate', 1200, 120, { size: 1.2 }),
    L.one('campfireDrum', 260, 140, { light: FIRE }), L.one('campfireDrum', 820, 150, { light: FIRE }), L.one('campfireDrum', 1360, 140, { light: FIRE }), L.one('campfireDrum', 2160, 150, { light: FIRE }), L.one('campfireDrum', 2560, 140, { light: FIRE }),
    L.one('floodlight', 700, 220, { light: FLOOD }), L.one('floodlight', 1500, 230, { light: FLOOD }), L.one('floodlight', 2400, 220, { light: FLOOD })],
  L.row('rock', -200, 3000, 640, { every: 160, jitter: 80, dj: 80, size: [1.5, 2.6], turn: 3 }),
  L.row('pine', -200, 3000, 900, { every: 90, jitter: 40, dj: 100, size: [1.2, 1.8] })
];
WP.defStage({
  id: 'op5', n: 5, name: 'THE KENNEL', music: 'op5', time: 'night', darkness: .75, rain: .8, lightning: true,
  sky: { sky: ['#04060c', '#0a1020', '#141a30'], stars: 0, layers: [{ kind: 'clouds', color: '#1a2034', y: .3, height: .2, parallax: .05 }, { kind: 'mountains', color: '#080a14', y: .78, height: .3, parallax: .06, seed: 12 }] },
  fog: { color: '#0a0e1a', near: 300, far: 1300 }, grade: { mul: '#c8d0f0', add: '#000208' },
  floor: 'kennel', outside: '#141418', cam: { h: 26, pitch: 6, fov: 60 },
  rail: [{ d: 0, x: 0, y: WP.Y0, angle: -Math.PI / 2 }, { d: 1500, x: 1500, y: WP.Y0, angle: -Math.PI / 2 }, { d: 1700, x: 1700, y: WP.Y0, angle: -Math.PI / 2 + .26 }, { d: 2800, x: 2800, y: WP.Y0, angle: -Math.PI / 2 + .26 }],
  speed: 14,
  holds: [{ d: 1450, until: 'escort', max: 70 }, { d: 2500, until: 'boss' }],
  reinfAt: 2500,
  scenery,
  props: [
    ['searchlight', 'sl1', 400, 290, { z: 92, sweep: [-160, 120], phase: 0 }], ['searchlight', 'sl2', 1000, 300, { z: 92, sweep: [-120, 160], phase: 2 }], ['searchlight', 'sl3', 1950, 290, { z: 92, sweep: [-160, 140], phase: 4 }],
    ['crate', 'k1', 330, 120, { drop: 'flare' }], ['crate', 'k2', 900, 116], ['ammoCrate', 'k3', 1300, 126], ['crate', 'k4', 1880, 120, { drop: 'medkit' }], ['barrel', 'kb1', 1120, 130], ['barrel', 'kb2', 2300, 128], ['sandbags', 'ksb', 2180, 110, { size: 1.2 }]
  ],
  beats: [
    { at: 0, radio: 'op5.go', tip: 'tip.searchlight' },
    { at: 60, spawn: [['rifleman', { side: 'R', dz: 160, n: 3, gap: 1, beh: 'patrol', stops: 1 }]] },
    { at: 250, tip: 'tip.flare', spawn: [['rifleman', { side: 'L', dz: 190, n: 3, gap: .7, beh: 'cross', stops: 1 }]] },
    { at: 420, spawn: [['jeep', { side: 'R', dz: 220, beh: 'cross' }]] },
    { at: 600, spawn: [['sniper', { x: 1000, y: WP.Y0 - 292, z: 90, beh: 'snipe' }], ['grenadier', { side: 'L', dz: 170, n: 2, gap: .8, beh: 'cross', stops: 1 }]] },
    { at: 800, spawn: [['rifleman', { side: 'R', dzs: [150, 190], n: 4, gap: .6, beh: 'cross', stops: 1 }], ['knife', { lxs: [-40, 50], dz: 92, n: 2, gap: .9, beh: 'advance', stopD: 68 }]] },
    { at: 1000, spawn: [['brute', { beh: 'stand', lx: -30, dz: 150, cycles: 3 }]] },
    { at: 1200, spawn: [['truck', { lx: -(260), dz: 200, beh: 'truck', dir: 1 }]] },
    { at: 1450, hold: 1450, radio: 'op5.breakout', tip: 'tip.escort', run: (sim, b) => WP.Op5.breakout(sim, b) },
    { at: 1750, spawn: [['rifleman', { side: 'L', dzs: [150, 200, 240], n: 4, gap: .6, beh: 'cross', stops: 1 }]] },
    { at: 1950, spawn: [['jeep', { side: 'R', dz: 210, beh: 'cross' }]] },
    { at: 2200, spawn: [['rifleman', { side: 'R', dzs: [150, 180, 210, 240], n: 5, gap: .5, beh: 'cross', stops: 1 }], ['grenadier', { beh: 'popup', cover: 'ksb', n: 2, gap: .6, cycles: 2 }]] },
    { at: 2500 }
  ],
  quotas: { soldier: 35, vehicle: 3 }, boss: 'tusk', perk: 'hostagesFreed', clearHeal: 10, hostages: true,
  reinforce: { soldier: ['rifleman', 'rifleman', 'grenadier', 'knife'], vehicle: 'jeep' },
  attract: [{ d: 1440, seconds: 25 }]
});
WP.Op5 = {
  /** the breakout: cells open one by one, 8 s apart; each hostage runs to the breach, chased by two riflemen; tower MGs fire */
  breakout(sim, b) {
    const n = 5, from = sim.stage.toWorld(1630, 170), goal = sim.stage.toWorld(1240, 150);
    sim.flags.escort = { n, done: 0 };
    for (const [x, d] of [[1250, 296], [1950, 286]]) { const w = sim.stage.toWorld(x, d); const g = sim.spawn('rifleman', { x: w[0], y: w[1], z: 90, beh: 'tower', cycles: 99, beat: b }); if (g) g.tower = true; }
    for (let i = 0; i < n; i++) {
      sim.after(.5 + i * 8, () => {
        const h = sim.spawn('hostage', { x: from[0] - i * 22, y: from[1] + (i % 2) * 12, who: i, goal: [goal[0], goal[1] + (i % 3) * 8], wait: 1.2 });
        if (!h) return; h.from = [h.x, h.y];
        sim.after(1.6, () => { for (let k = 0; k < 2; k++) { const w = sim.stage.toWorld(1720 + k * 30, 210 + k * 20); sim.spawn('rifleman', { x: w[0], y: w[1], beh: 'chase', target: h.id, beat: b }); } });
      });
    }
  },
  step(sim) {
    const f = sim.flags.escort; if (!f || sim.flags.escortDone) return;
    const hs = sim.ents.filter(e => e.type === 'hostage');
    const resolved = sim.hostages.saved + sim.hostages.lost;
    if (resolved >= f.n || (sim.hold && sim.hold.t > 66 && !hs.some(h => !h.saved && !h.lost && h.st === 'run'))) {
      // anyone still in the cells when the hold ends is lost
      for (const h of hs) if (!h.saved && !h.lost) { h.lost = true; sim.hostages.lost++; sim.ev('hostageLost', { id: h.id, who: h.who, why: 'time' }); }
      sim.flags.escortDone = true; sim.radio('hostage.free0');
    }
  }
};
WP.STAGE.op5.step = sim => WP.Op5.step(sim);
})();
