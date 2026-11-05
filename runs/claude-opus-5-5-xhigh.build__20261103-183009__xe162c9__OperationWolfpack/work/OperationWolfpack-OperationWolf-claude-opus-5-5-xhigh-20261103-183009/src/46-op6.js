// OP 6: LAST FLIGHT OUT (sunrise storm; boarding, takeoff, the gunship). Part A: the apron, sideways 0 -> 2000 at 18.
// Part B: the cut to OLD HOWLER's open ramp, looking back while the plane runs, lifts off and climbs; HYENA ONE.
(() => {
const E = My3D2dge, WP = globalThis.WP, L = WP.Layout, { clamp, lerp } = WP;
L.seed(606);
const LIGHTS = [4, 22, '#ffd84a'];
const scenery = [
  [L.one('hangar', 200, 330), L.one('hangar', 900, 330), L.one('hangar', 1600, 330), L.one('controlTower', 1200, 500), L.one('radarDish', 1420, 520, { size: 1.3 }), L.one('windsock', 1040, 260),
    L.one('propPlane', 540, 250, { facing: .4 }), L.one('propPlane', 1300, 260, { facing: 2.8 }), L.one('cargoPlane', 2060, 190, { facing: -Math.PI / 2 + .25, tag: 'howler' })],
  L.row('runwayLight', -100, 2200, 150, { every: 60, light: LIGHTS }), L.row('runwayLight', -100, 2200, 240, { every: 60, light: LIGHTS }),
  L.row('palm', -200, 2400, 700, { every: 120, jitter: 60, dj: 100, size: [1.1, 1.5], turn: 1 }),
  L.row('ammoCrate', 100, 1900, 120, { every: 380, jitter: 100, turn: .8 })
];
const runwayB = (x, y, D, t) => {   // part B: the runway running north under the plane, the jungle and the coast beyond
  const ax = Math.abs(x);
  if (ax < 70) { let c = WP.floorS(WP.FLOOR_TEX.asphalt, x, y); if (ax < 2 && ((y | 0) % 80 + 80) % 80 < 40) c = 0xffe8e8e8; if (ax > 64) c = 0xffd8d8d8; return c; }
  if (ax < 90) return 0xff5a7a4a;
  const n = E.noise2(x / 300, y / 300) * .7 + E.noise2(x / 60, y / 60) * .3;
  if (x > 1800 + Math.sin(y / 400) * 200) { const r = Math.sin(x * .02 + t) + Math.sin(y * .03 - t * .7); return r > 1.5 ? 0xffc8a070 : 0xff9a6a3a; }
  return n > .55 ? 0xff2a5a2a : n > .45 ? 0xff3a6a32 : 0xff2e4a26;
};
const SKY = { sky: ['#2a2a3a', '#4a4a5a', '#8a6a6a', '#c8907a'], sun: { x: .8, y: .82, r: 16, color: '#ffd0a0' }, layers: [{ kind: 'clouds', color: '#3a3a48', y: .2, height: .22, parallax: .05 }, { kind: 'clouds', color: '#5a5060', y: .45, height: .14, parallax: .08 }, { kind: 'hills', color: '#2a3a2a', y: .86, height: .1, parallax: .1 }] };
WP.defStage({
  id: 'op6', n: 6, name: 'LAST FLIGHT OUT', music: 'op6', time: 'sunrise', rain: .35, lightning: true,
  sky: SKY, fog: { color: '#6a6a72', near: 400, far: 1500 }, grade: { mul: '#e8e8f0', add: '#08060a' },
  floor: 'apron', outside: '#3a3c40', cam: { h: 28, pitch: 6, fov: 60 },
  rail: [{ d: 0, x: 0, y: WP.Y0, angle: -Math.PI / 2 }, { d: 2000, x: 2000, y: WP.Y0 }],
  speed: 18,
  holds: [{ d: 450, until: 'air', max: 25 }, { d: 850, until: 'vehicle', max: 40 }, { d: 1500, until: 'escort', max: 45 }, { d: 2000, until: 'flag', flag: 'boarded' }],
  scenery,
  props: [['fuelTruck', 'fu1', 700, 220, { facing: 0 }], ['fuelTruck', 'fu2', 1840, 230, { facing: Math.PI }], ['barrel', 'ob1', 320, 140], ['barrel', 'ob2', 336, 146], ['crate', 'oc1', 1100, 120], ['ammoCrate', 'oc2', 1720, 130], ['sandbags', 'osb', 1280, 120, { size: 1.3 }]],
  beats: [
    { at: 0, radio: 'op6.go' },
    { at: 60, spawn: [['rifleman', { x: 200 - 30, y: WP.Y0 - 330 + 50, beh: 'dismount', dir: -1, n: 2, gap: .7 }], ['rifleman', { x: 200 + 30, y: WP.Y0 - 330 + 50, beh: 'dismount', dir: 1, n: 2, gap: .7 }]] },
    { at: 250, spawn: [['jeep', { side: 'R', dz: 200, beh: 'cross' }], ['jeep', { side: 'L', dz: 170, beh: 'cross', delay: 1.5 }]] },
    { at: 450, hold: 450, radio: 'air.in', spawn: [['heli', { lx: 100, dz: 900, z: 80, beh: 'heli' }]] },
    { at: 650, spawn: [['rpg', { x: 700 - 20, y: WP.Y0 - 220, z: 30, beh: 'stand', kneelFire: true, cycles: 3 }], ['rpg', { x: 700 + 20, y: WP.Y0 - 220, z: 30, beh: 'stand', kneelFire: true, cycles: 3, delay: .8 }]] },
    { at: 850, hold: 850, radio: 'tank.in', spawn: [['tank', { x: 900, y: WP.Y0 - 345, beh: 'tank', rollD: 70 }]] },
    { at: 1100, run: (sim, b) => { for (let i = 0; i < sim.count(5); i++) sim.spawn('para', { lx: -200 + i * 100, dz: 190 + (i % 2) * 40, z: 170, beat: b }); sim.spawn('sniper', { x: 1194, y: WP.Y0 - 488, z: 108, beh: 'snipe', beat: b }); sim.spawn('sniper', { x: 1206, y: WP.Y0 - 488, z: 108, beh: 'snipe', beat: b }); } },
    { at: 1300, spawn: [['apc', { side: 'R', dz: 280, beh: 'apc', stayT: 12 }]] },
    { at: 1500, hold: 1500, radio: 'op6.escort', run: (sim, b) => WP.Op6.escort(sim, b) },
    { at: 1900, spawn: [['rifleman', { side: 'R', dzs: [150, 200], n: 4, gap: .5, beh: 'cross', stops: 1 }], ['knife', { side: 'L', dz: 110, beh: 'advance', n: 2, gap: .8 }]] },
    { at: 2000, run: sim => WP.Op6.board(sim) }
  ],
  quotas: { soldier: 27, vehicle: 4, air: 2 }, boss: null, perk: null, clearHeal: 0, hostages: true,
  reinforce: { soldier: ['rifleman', 'rifleman', 'grenadier', 'knife'], vehicle: 'jeep' },
  attract: [{ partB: true, seconds: 30 }]
});
// ---------- part B: the takeoff ----------
const B = WP.defStage({
  id: 'op6b', n: 6, name: 'LAST FLIGHT OUT', music: 'op6b', time: 'sunrise', rain: .25,
  sky: SKY, fog: { color: '#7a7078', near: 500, far: 2200 }, grade: { mul: '#f0e8f0', add: '#08060a' },
  floor: runwayB, forward: true, outside: '#2e4a26', cam: { h: 28, pitch: 6, fov: 60 },
  rail: [{ d: 0, x: 0, y: WP.Y0, angle: Math.PI / 2 }, { d: 40000, x: 0, y: WP.Y0 - 40000, angle: Math.PI / 2 }],
  speed: 30, holds: [],
  scenery: [],
  props: [],
  beats: [
    { time: 0, radio: 'op6.chase', run: (sim, b) => { for (let i = 0; i < 3; i++) sim.spawn('jeep', { anchor: 'cam', lx: (i - 1) * 60, dz: 260 + i * 40, beh: 'chaseCam', noQuota: true, beat: b }); } },
    { time: 10, radio: 'op6.sam', run: sim => { sim.spawn('samtruck', { anchor: 'cam', lx: 90, dz: 520, beh: 'sam' }); } },
    { time: 20, radio: 'op6.hang', run: sim => { for (const e of sim.ents) if (e.type === 'jeep' || e.type === 'samtruck') e.leave = true; } },
    { time: 30, run: sim => { sim.flags.bossCalled = true; WP.Bosses.start(sim, 'hyenaOne'); } }
  ],
  quotas: {}, boss: 'hyenaOne', perk: null, clearHeal: 0, hostages: true,
  speedAt(sim) { const t = sim.t - (sim.partT || 0); return lerp(30, 90, clamp(t / 20, 0, 1)); },
  camFx(sim, c) {
    const t = sim.t - (sim.partT || 0), u = WP.smooth(clamp((t - 20) / 15, 0, 1));
    c.h = lerp(28, 260, u) + (t < 20 ? Math.sin(t * 22) * .5 * (t / 20) : Math.sin(t * 1.3) * 2);
    c.pitch = lerp(6, 28, u);
  },
  overlay(g) {   // the ramp's edge and the hold's frame (the plane we ride), screen space
    const y = WP.PLAY_H - 18, px = E.px;
    px.poly(g, [[0, y], [WP.W, y], [WP.W, WP.PLAY_H], [0, WP.PLAY_H]], '#2a3020'); px.rect(g, 0, y, WP.W, 2, '#5a6a4a');
    for (let x = -20 + ((WP.time * 40) % 40); x < WP.W; x += 40) px.poly(g, [[x, y + 4], [x + 16, y + 4], [x + 10, y + 12], [x - 6, y + 12]], '#e0b040');
    px.poly(g, [[0, 0], [26, 0], [16, y], [0, y]], '#1e2418'); px.poly(g, [[WP.W, 0], [WP.W - 26, 0], [WP.W - 16, y], [WP.W, y]], '#1e2418');
  },
  drawExtra(m7, world, R) {
    // the runway's lights near the camera
    const P = world.view.P;
    // runway lights along both edges, near the camera
    const a0 = Math.floor((WP.Y0 - P.y) / 60) * 60;
    for (let a = a0 - 1200; a < a0 + 60; a += 60) for (const x of [-78, 78]) m7.add(x, WP.Y0 - a, 0, (g, sx, sy, k) => { E.px.rect(g, sx - k, sy - 2 * k, Math.max(1, 2 * k), Math.max(1, 2 * k), '#ffd84a'); E.px.blend(g, .5, 'add', () => E.px.disc(g, sx, sy - k, Math.max(2, 3 * k), '#ffb040')); });

  }
});
WP.Op6 = {
  /** the boarding escort: a friendly truck drops off the hostages, who run to the ramp; 10 attackers; VULTURE #2 strafes */
  escort(sim, b) {
    const n = sim.hostages.n; sim.flags.escort = { n, done: 0 };
    const truck = sim.spawn('friendTruck', { side: 'L', dz: 170, beh: 'friendTruck', dir: 1 });
    truck.onStop = (s, e) => {
      for (let i = 0; i < n; i++) s.after(.6 * i, () => { const h = s.spawn('hostage', { x: e.x + 10 - i * 8, y: e.y + 10, who: i, goal: s.stage.toWorld(2050 - 30 + i * 8, 160), wait: .4 }); if (h) { h.from = [h.x, h.y]; } });
      s.after(1.5, () => { for (let i = 0; i < Math.min(10, n * 2); i++) { const hs = s.ents.filter(q => q.type === 'hostage' && !q.saved && !q.lost); const h = hs[i % Math.max(1, hs.length)]; s.spawn('rifleman', { side: i % 2 ? 'R' : 'L', dz: 150 + (i % 3) * 20, beh: 'chase', target: h ? h.id : null, beat: b }); } for (let i = 0; i < 10 - Math.min(10, n * 2); i++) s.spawn('rifleman', { x: 1600 + (i - 2) * 24, y: WP.Y0 - 300, beh: 'dismount', dir: i % 2 ? 1 : -1, beat: b }); });
    };
    sim.after(6, () => sim.spawn('heli', { lx: -140, dz: 900, z: 70, beh: 'heli' }));
    if (!n) sim.after(15, () => { sim.flags.escortDone = true; });
  },
  step(sim) {
    const f = sim.flags.escort; if (!f || sim.flags.escortDone) return;
    if (sim.hostages.saved + sim.hostages.lost >= f.n && f.n > 0) { sim.flags.escortDone = true; sim.radio('hostage.board'); }
  },
  /** the end of part A: wait for the quotas, then the cut to the ramp */
  board(sim) {
    const go = () => { if (sim.quotasMet() || sim.flags.forceBoard) { sim.flags.boarded = true; sim.radio('op6.board'); sim.ev('cut', { text: WP.TEXT['op6.board'].text }); sim.after(1.5, () => WP.Op6.partB(sim)); } else sim.after(.5, go); };
    sim.flags.boardT = sim.t; go();
  },
  partB(sim) { sim.swapStage(B, 'B'); for (const p of sim.players) if (p.down) { p.down = false; p.damage = 50; } }
};
WP.STAGE.op6.step = sim => { WP.Op6.step(sim); if (sim.flags.boardT !== undefined && !sim.flags.boarded && sim.t - sim.flags.boardT > 60) sim.flags.forceBoard = true; };
})();
