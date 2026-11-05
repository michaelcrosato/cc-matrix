// OP 2: MANGROVE RUN (misty morning; a forward rail up a river). The river is 220 wide (|x| < 110); along = Y0 - y.
(() => {
const E = My3D2dge, WP = globalThis.WP, L = WP.Layout, { px } = E;
L.seed(202);
const W = (lx, along) => [lx, WP.Y0 - along];
const S = WP.floorS, T = WP.FLOOR_TEX;
const channel = (x, along) => (x > 100 && x < 520 && along > 660 && along < 760) || (x < -100 && x > -520 && along > 2060 && along < 2160);
const water = (x, y) => { const a = WP.Y0 - y; return Math.abs(x) < 110 || channel(x, a) || (a > 3500 && Math.abs(x) < 400); };
const RIVER = (x, y, D, t) => {
  const a = WP.Y0 - y, ax = Math.abs(x);
  if (water(x, y)) {
    const r = Math.sin(x * .08 + t * 1.6) + Math.sin(y * .05 + t * 2.2) + Math.sin((x + y) * .03 - t);
    const n = E.noise2(x / 26, (y + t * 30) / 26);
    let c = n > .55 ? 0xff3a5a4a : 0xff2e4e40; if (r > 2.2) c = 0xff7a9a8a; else if (r > 1.6) c = 0xff4a6a5a;
    if (ax > 96 && ax < 110 && !channel(x, a)) c = WP.lerpPk(c, 0xff22364a, .5);
    return c;
  }
  if (ax < 140) { let c = S(T.mud, x, y); if (((x * 3 + y * 7) | 0) % 23 === 0) c = 0xff1a2a3a; return c; }
  return E.noise2(x / 50, y / 50) > .5 ? S(T.leaves, x, y) : S(T.mud, x, y);
};
const banks = [];
for (const side of [-1, 1]) {
  for (let a = -100; a < 3600; a += 70) {
    const R = L.R;
    if (channel(side * 200, a)) continue;
    banks.push(L.one(R() < .55 ? 'mangrove' : 'palm', side * (150 + R() * 90), a + R() * 40, { size: .9 + R() * .5, facing: R() * 6.28 }));
    if (R() < .7) banks.push(L.one('fern', side * (125 + R() * 30), a + R() * 60, { size: .9 + R() * .6, facing: R() * 6.28 }));
    if (R() < .5) banks.push(L.one('mangrove', side * (300 + R() * 300), a + R() * 60, { size: 1.1 + R() * .5, facing: R() * 6.28 }));
  }
}
const scenery = [
  banks,
  [L.one('stiltHut', 170, 620, { size: 1.1, facing: Math.PI / 2 + .9 }), L.one('stiltHut', -175, 1080, { size: 1.1, facing: Math.PI / 2 - .9 }), L.one('stiltHut', 185, 1110, { facing: Math.PI / 2 + .8 }),
    L.one('dock', 128, 770, { facing: Math.PI / 2 + Math.PI / 2 }), L.one('dock', -128, 1240, { facing: 0 }), L.one('wreckBoat', -80, 450), L.one('wreckBoat', 70, 1820, { facing: 2 }),
    L.one('dock', 40, 2200, { facing: 0, size: 1.2 }), L.one('dock', -60, 2600, { facing: 0 }), L.one('waterfall', 0, 3700, { size: 2.5 }), L.one('rock', -160, 3620, { size: 3 }), L.one('rock', 180, 3640, { size: 3.4 })]
];
// the rope bridge at along 1500, z 40: two ropes (props) and the planks between the banks
const BR = 1500;
WP.defStage({
  id: 'op2', n: 2, name: 'MANGROVE RUN', music: 'op2', time: 'morning', forward: true, bob: true, water,
  toWorld: W,
  sky: { sky: ['#6a8a7a', '#9ab8a0', '#c8d8c0'], sun: { x: .3, y: .5, r: 16, color: '#f0f0d0' }, layers: [{ kind: 'forest', color: '#2e4a32', y: .72, height: .3, parallax: .06, seed: 4 }, { kind: 'forest', color: '#3e5e3e', y: .86, height: .18, parallax: .12, seed: 8 }, { kind: 'fog', color: '#c8d8c0', y: .82, height: .2 }] },
  fog: { color: '#a8c0a8', near: 200, far: 1100 }, grade: { mul: '#e8f8ec', add: '#000a04' },
  floor: RIVER, outside: '#2a3a2a', cam: { h: 20, pitch: 4, fov: 60 },
  rail: [{ d: 0, x: 0, y: WP.Y0, angle: -Math.PI / 2 }, { d: 2600, x: 0, y: WP.Y0 - 2600 }],
  speed: 20,
  holds: [{ d: 1000, until: 'air', max: 30, slow: 8 }, { d: 1300, until: 'flag', flag: 'bridgeDone', max: 14 }, { d: 2600, until: 'boss' }],
  scenery,
  props: [['rope', 'ropeL', -120, BR, { z: 34 }], ['rope', 'ropeR', 120, BR, { z: 34 }], ['barrel', 'fb1', 30, 2440, { z: 6 }], ['barrel', 'fb2', 44, 2446, { z: 6 }], ['crate', 'dk1', 120, 880, { z: 7, drop: 'gbox' }], ['crate', 'dk2', 134, 884, { z: 7 }], ['ammoCrate', 'dk3', -122, 1250, { z: 7 }], ['ammoCrate', 'dk4', 44, 2190, { z: 9 }], ['crate', 'dk5', -126, 1700, { z: 6, drop: 'ration' }], ['ammoCrate', 'dk6', -60, 2590, { z: 8 }]],
  init(sim) {
    sim.flags.bridge = 'up';
    for (const id of ['ropeL', 'ropeR']) { const r = sim.propById(id); if (r) r.onBreak = (s, e, p) => WP.Op2.bridgeOut(s, p); }
  },
  beats: [
    { at: 0, radio: 'op2.go' },
    { at: 60, spawn: [['rifleman', { beh: 'popup', lxs: [-130, 130, -150], dzs: [200, 230, 260], n: 3, gap: .5, cycles: 2 }]] },
    { at: 200, spawn: [['skiff', { lx: 20, dz: 420, passLx: -60 }]] },
    { at: 380, tip: 'tip.knife', spawn: [['knife', { beh: 'branch', lxs: [-60, 60], dz: 74, z: 40, n: 2, gap: .7 }]] },
    { at: 520, spawn: [['monkey', { lx: 150, dz: 160, z: 34, carry: 'gbox' }], ['rifleman', { lxs: [110, 130, 150], dz: 250, z: 8, n: 3, gap: .4, beh: 'stand', cycles: 2 }]] },
    { at: 700, spawn: [['skiff', { lx: 260, dz: 300, cross: true, dir: -1, n: 2, gap: 1.6 }]] },
    { at: 860, spawn: [['grenadier', { beh: 'roof', lxs: [-175, 185], dz: 230, z: 28, n: 2, gap: .6, cycles: 3 }]] },
    { at: 1000, hold: 1000, radio: 'air.in', run: (sim, b) => { const h = sim.spawn('heli', { lx: 60, dz: 800, z: 60, beh: 'heli', beat: b }); sim.after(5, () => { for (let i = 0; i < 3; i++) sim.spawn('para', { lx: (i - 1) * 140, dz: 220, z: 150, beat: b }); }); void h; } },
    { at: 1250, radio: 'op2.bridge', tip: 'tip.bridge', run: (sim, b) => { for (let i = 0; i < sim.count(5); i++) { const e = sim.spawn('rifleman', { x: -80 + i * 40, y: WP.Y0 - BR, z: 40, beh: 'stand', cycles: 3, beat: b }); if (e) { e.onBridge = true; e.floorZ = 40; } } sim.after(16, () => { sim.flags.bridgeDone = true; }); } },
    { at: 1500, spawn: [['gunboat', { lx: -20, dz: 350 }], ['mortar', { lx: 220, dz: 700 }], ['mortar', { lx: 240, dz: 700, loader: true }]] },
    { at: 1700, spawn: [['parrot', { side: 'L', dz: 140, z: 60, carry: 'fury' }], ['parrot', { side: 'L', dz: 160, z: 70 }], ['parrot', { side: 'R', dz: 150, z: 55, carry: 'mag' }], ['rifleman', { beh: 'popup', lxs: [-140, 140, -160, 160], dzs: [180, 200, 240, 260], n: 4, gap: .4 }]] },
    { at: 1900, spawn: [['skiff', { lx: -30, dz: 420, passLx: 60 }], ['brute', { lx: 40, dz: 300, z: 9, beh: 'stand', cycles: 3 }], ['rifleman', { lxs: [20, 60], dz: 300, z: 9, n: 2, gap: .4, beh: 'stand', cycles: 2 }]] },
    { at: 2100, spawn: [['rifleman', { lx: -260, dz: 120, n: 3, gap: .8, beh: 'cross', dir: 1, stops: 1 }], ['sniper', { lx: 170, dz: 500, z: 60, beh: 'snipe' }]] },
    { at: 2350, spawn: [['knife', { beh: 'branch', lxs: [-70, 70], dz: 72, z: 42, n: 2, gap: .5 }], ['skiff', { lx: 10, dz: 430, passLx: -55 }]] },
    { at: 2600 }
  ],
  quotas: { soldier: 28, boat: 6, air: 1 }, boss: 'crocodile', perk: 'campLocated', clearHeal: 10,
  reinforce: { soldier: ['rifleman', 'rifleman', 'knife'], boat: 'skiff' },
  ambient: [['parrot', 400, 900], ['monkey', 160, 1400, 'ration'], ['parrot', -200, 2300]],
  drawExtra(m7, world, R) {
    if (world.flags && world.flags.bridge === 'down') return;
    // the rope bridge: two ropes sagging between the banks, planks hung under them
    const y = WP.Y0 - BR, fall = world.flags && world.flags.bridgeFall || 0;
    m7.add(0, y, 0, (g, sx, sy, k) => {
      const V = world.view, a = V.project(-130, y, 46), b = V.project(130, y, 46); if (!a || !b) return;
      for (let i = 0; i <= 24; i++) { const u = i / 24, x = -130 + u * 260, sag = Math.sin(u * Math.PI) * 10, z = 40 - sag - fall * u * 40, p = V.project(x, y, z), q = V.project(x, y, z + 6); if (!p || !q) continue; px.rect(g, p[0] - 1.5 * k, p[1] - 1, 3 * k, Math.max(1, k), '#7a5a32'); px.line(g, p[0], q[1], p[0], p[1], '#4a3420'); }
      for (const dz of [6, 0]) { let prev = null; for (let i = 0; i <= 24; i++) { const u = i / 24, x = -130 + u * 260, z = 40 + dz - Math.sin(u * Math.PI) * 10 - fall * u * 40, p = V.project(x, y, z); if (p && prev) px.line(g, prev[0], prev[1], p[0], p[1], '#3a2a18', Math.max(1, Math.round(k * .6))); prev = p; } }
      for (const x of [-130, 130]) { const p = V.project(x, y, 0), q = V.project(x, y, 52); if (p && q) px.line(g, p[0], p[1], q[0], q[1], '#5a4020', Math.max(2, Math.round(k * 2))); }
    });
  }
});
WP.Op2 = {
  bridgeOut(sim, p) {
    if (sim.flags.bridge !== 'up') return;
    sim.flags.bridge = 'falling'; sim.flags.bridgeFall = 0; sim.radio('bridgeOut');
    sim.ev('bridgeOut', {});
    for (const e of sim.ents) if (e.onBridge && !e.dead) { sim.kill(e, p ? p.pid : null, 'body', 'fall'); if (p) sim.score(p, 300, { x: e.x, y: e.y, z: e.z }, { raw: true }); e.floorZ = 0; e.vz = 40; }
    const fall = () => { sim.flags.bridgeFall = Math.min(1, sim.flags.bridgeFall + .05); if (sim.flags.bridgeFall < 1) sim.after(.04, fall); else { sim.flags.bridge = 'down'; sim.flags.bridgeDone = true; } };
    fall();
  }
};
})();
