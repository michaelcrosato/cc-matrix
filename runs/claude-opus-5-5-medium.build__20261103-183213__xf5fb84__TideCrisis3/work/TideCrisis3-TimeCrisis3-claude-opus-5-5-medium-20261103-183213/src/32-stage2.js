// 32-stage2: STORM SIGNAL (Gull's Rest and Lighthouse Point, 02:10, a thunderstorm). Scenes 2-1 GULL'S REST
// (rushers, the shotgun), 2-2 NET LOFTS (shields, rappellers), 2-3 FUNICULAR (moving; the passing car; THE GULL),
// 2-4 LIGHTHOUSE KEEP (the hostage), 2-B HAMMERHEAD on the lantern gallery. Rain, lightning, the lighthouse beam.

const S2 = { lane: F(0, 0, 0, 0), lofts: F(640, 0, 0, 0), funi: F(1120, 0, 0, 0), keep: F(1980, 0, 460, 0), gal: F(2180, 0, 760, 0) };
const FUN_TOP = [1880, 0, 448];
const sl21 = S2.lane.slots({ gap: 22 }), sl22 = S2.lofts.slots({ gap: 24 }), sl24 = S2.keep.slots({ gap: 24 });
const sl2B = S2.gal.slots({ gap: 22 }), sl2B2 = F(2180 - 34, -64, 760, 0).slots({ gap: 18 });
const LH = S2.keep.p(300, 0, 0);   // the lighthouse's foot

def('stage', 2, { name: 'STORM SIGNAL', place: "Gull's Rest · Lighthouse Point", clock: '02:10', music: 'storm', briefing: 'b2', amb: 'storm',
  env: { sky: { stops: ['#141c22', '#26343c', '#34444a'], stars: false, clouds: { color: '#3c4c54', cover: .2, k: .9 }, sil: [{ color: '#1a2428', h: az => .03 + .04 * Math.abs(Math.sin(az * 3.1)) }] },
    fog: ['#26343c', 220, 1300], ambient: .36, ambientColor: '#90a8b0', sun: { dir: [.3, -.4, .86], color: '#b8c8d0', k: .35 }, water: { z: -60, mat: 'sea-storm' }, rain: true, lightning: true },
  build(G) {
    // ---- 2-1 the lane: cobbles, timber and plaster houses with slate roofs, balconies, washing lines, a boat on blocks
    const L = S2.lane;
    G.push(L.x, L.y, L.z, L.yaw);
    G.box(-160, -64, -4, 560, 64, 0, 'wet-cobble', { surf: 'concrete' });
    for (const side of [-1, 1]) for (let d = -150, k = 0; d < 520; d += 96, k++) {
      const timber = (k + (side > 0 ? 1 : 0)) % 2 === 0, l0 = side > 0 ? 64 : -64 - 76;
      PF.house(G, L, d, l0 + 38, 76, 88, 66 + (k % 3) * 10, { wall: timber ? 'plaster' : 'stone', timber, windows: [[16, 38, k % 2], [46, 38, (k + 1) % 2]], door: 44 });
    }
    // windows and doors on the house fronts that face the lane
    for (const side of [-1, 1]) for (let d = -150; d < 520; d += 96) { const f = side * 64 - side * .6; for (const w of [14, 50]) G.box(d + w, Math.min(f, side * 64), 34, d + w + 14, Math.max(f, side * 64), 52, ((d + 150) / 96 | 0) % 2 ? 'glasslit' : 'window-dark', { collide: false, tess: false }); G.box(d + 34, Math.min(f, side * 64), 0, d + 50, Math.max(f, side * 64), 28, 'plank', { collide: false, tess: false }); }
    // balconies for the window shooters
    for (const [d, side] of [[170, -1], [262, 1], [380, -1]]) { G.box(d - 14, side * 64, 30, d + 14, side * 50, 32, 'timber', { surf: 'wood', bottom: true }); G.box(d - 14, side * 50, 32, d + 14, side * 52, 44, 'timber', { surf: 'wood' }); }
    for (const d of [60, 200, 320]) { PF.railing(G, [d, -64, 60], [d + 10, 64, 60], 1, 'rope'); for (let l = -50; l <= 50; l += 18) G.box(d + 4 + l * .04, l - 4, 46, d + 5 + l * .04, l + 4, 59, (l / 18 | 0) % 2 ? 'awning-blue' : 'linen', { collide: false, tess: false, double: true }); }
    PF.boat(G, 290, -36, 8, .3, 70, { hull: 'hull' }); G.box(276, -46, 0, 304, -26, 8, 'timber');
    for (const [d, l] of [[150, 30], [300, 20], [330, -10], [420, 30]]) PF.barrel(G, d, l, 0, d === 330 ? 'iron' : 'oak');
    G.box(326, -30, 0, 344, 30, 16, 'plank', { surf: 'wood' });   // the cart barricade
    PF.lamppost(G, 100, -56, 0, 60, false); PF.lamppost(G, 300, 56, 0, 60, false); PF.lamppost(G, 470, -56, 0, 60, false);
    G.pop();
    PF.slotProp(G, sl21[0], 'cart'); PF.slotProp(G, sl21[1], 'well');
    // ---- 2-2 the net lofts: a tall wooden hall, an upper floor, hanging nets, fish-oil barrels, a roof hatch
    const N = S2.lofts;
    G.push(N.x, N.y, N.z, N.yaw);
    G.box(-50, -100, -1, 380, 100, 0, 'planks', { surf: 'wood' });
    G.box(-50, -102, 0, 380, -100, 112, 'timber', { surf: 'wood' }); G.box(-50, 100, 0, 380, 102, 112, 'timber', { surf: 'wood' }); G.box(378, -100, 0, 380, 100, 112, 'timber', { surf: 'wood' });
    G.box(-52, -100, 0, -50, -22, 112, 'timber'); G.box(-52, 22, 0, -50, 100, 112, 'timber'); G.box(-52, -22, 44, -50, 22, 112, 'timber');
    G.box(-50, -100, 112, 380, 100, 114, 'plank', { collide: false, bottom: true });
    G.box(230, -100, 54, 380, 100, 56, 'planks', { surf: 'wood', bottom: true }); G.box(226, -100, 54, 230, 100, 68, 'timber', { surf: 'wood' });
    for (let k = 0; k < 8; k++) G.box(150 + k * 10, 64, 0, 160 + k * 10, 100, 7 + k * 7, 'plank', { surf: 'wood' });
    for (const [d, l] of [[60, -70], [100, 60], [180, -40], [300, 50], [320, -60]]) G.quad([d, l - 30, 100], [d, l + 30, 100], [d, l + 30, 40], [d, l - 30, 40], 'net', { double: true, tess: false });
    for (const l of [-90, 90]) for (let d = 0; d < 360; d += 90) G.box(d - 3, l - 3, 0, d + 3, l + 3, 112, 'timber', { collide: false });
    G.box(140, -40, 110, 180, 0, 112.5, 'iron', { collide: false });
    for (let d = 30; d < 360; d += 90) PF.lantern(G, d, 0, 100, 'lantern');
    for (const [d, l] of [[110, -30], [150, 40], [70, 70]]) G.box(d - 12, l - 16, 0, d + 12, l + 16, 16, 'crate', { fit: true, surf: 'wood' });
    G.box(108, 48, 0, 124, 72, 16, 'crate', { fit: true, surf: 'wood' });
    G.pop();
    PF.slotProp(G, sl22[0], 'crates'); PF.slotProp(G, sl22[1], 'barrels');
    // ---- 2-3 the cliff and the funicular track
    const C = S2.funi;
    G.push(C.x, C.y, 0, 0);
    G.box(-140, -100, -4, 60, 100, 0, 'planks', { surf: 'wood' });   // the bottom station
    for (const y of [-28, 28]) G.quad([0, y - 2, 0], [790, y - 2, 448], [790, y + 2, 448], [0, y + 2, 0], 'iron', { tess: false });
    G.quad([0, -40, -2], [790, -40, 446], [790, 40, 446], [0, 40, -2], 'stone', {});
    // the cliff face to the left (terraces) and the drop to the right
    for (let k = 0; k < 6; k++) { const d = 80 + k * 130, z = d * 448 / 790; G.box(d, -240, -60, d + 130, -60, z + 30, 'cliff', { surf: 'concrete' }); G.box(d + 10, -110, z + 30, d + 120, -60, z + 32, 'planks', { surf: 'wood' }); G.box(d + 10, -62, z + 32, d + 120, -60, z + 44, 'timber', { surf: 'wood' }); }
    G.box(-140, -400, -60, 900, -240, 520, 'cliff', { collide: false });
    G.box(740, -120, 440, 900, 120, 448, 'planks', { surf: 'wood' });   // the top station
    G.pop();
    // ---- 2-4 the keep: a courtyard, the keeper's house, the lighthouse
    const K = S2.keep;
    G.push(K.x, K.y, K.z, K.yaw);
    G.box(-120, -200, -4, 420, 200, 0, 'wet-cobble', { surf: 'concrete' });
    G.box(-120, -200, -80, 420, -196, 0, 'cliff', { collide: false });
    G.box(100, -170, 0, 220, -70, 70, 'stone', { surf: 'concrete', top: 'roof-slate' }); G.box(99.4, -150, 30, 100, -130, 46, 'glasslit', { collide: false }); G.box(99.4, -110, 0, 100, -94, 30, 'plank', { collide: false });
    G.box(150, -70, 30, 190, -58, 32, 'timber', { surf: 'wood', bottom: true }); G.box(150, -60, 32, 190, -58, 44, 'timber', { surf: 'wood' });
    for (const [d, l] of [[120, 60], [160, 20], [200, 80]]) G.box(d - 10, l - 12, 0, d + 10, l + 12, 16, 'crate', { fit: true, surf: 'wood' });
    G.box(140, -30, 0, 160, 10, 18, 'stone', { surf: 'concrete' });
    PF.lamppost(G, 60, 100, 0, 60, false); PF.lamppost(G, 240, -40, 0, 60, false);
    G.pop();
    PF.slotProp(G, sl24[0], 'crates'); PF.slotProp(G, sl24[1], 'well');
    // the lighthouse: a tapering tower, a lower balcony, the lantern gallery at the top
    G.cyl(LH[0], LH[1], LH[2], LH[2] + 300, 44, 34, 14, 'plaster', { collide: 'concrete' });
    for (let z = 40; z < 300; z += 60) G.cyl(LH[0], LH[1], LH[2] + z, LH[2] + z + 14, 44 - z * .033 + .6, 44 - (z + 14) * .033 + .6, 14, '#c03028', { cap: false });
    G.box(LH[0] - 44.5, LH[1] - 10, LH[2], LH[0] - 43, LH[1] + 10, LH[2] + 34, 'plank', { collide: false });
    G.cyl(LH[0], LH[1], LH[2] + 96, LH[2] + 98, 56, 56, 14, 'iron', { collide: false, bottom: true });
    // ---- 2-B the lantern gallery (a wide platform around the lantern room) at z 760
    const Gl = S2.gal;
    G.push(Gl.x, Gl.y, Gl.z, Gl.yaw);
    G.box(-60, -130, -6, 240, 130, 0, 'iron', { surf: 'metal', bottom: true });
    PF.railing(G, [240, -130, 0], [240, 130, 0], 16); PF.railing(G, [-60, -130, 0], [240, -130, 0], 16); PF.railing(G, [-60, 130, 0], [240, 130, 0], 16);
    G.cyl(100, -70, 0, 50, 34, 34, 12, 'glass', { collide: 'glass' }); G.cyl(100, -70, 50, 70, 36, 10, 12, 'iron');
    G.box(-62, -40, 0, -56, 40, 40, 'stone', { surf: 'concrete' });   // the doorway
    G.pop();
    PF.slotProp(G, sl2B2[0], 'steel'); PF.slotProp(G, sl2B2[1], 'steel');
  },
  // the lighthouse beam and the second funicular car
  dyn(R, sim, view) {
    const top = [LH[0] + 20, LH[1] - 70, LH[2] + 330], a = view.t * .78;
    R.drawMesh({ mesh: TC.mesh('lens'), x: S2.gal.p(100, -70)[0], y: S2.gal.p(100, -70)[1], z: 760 + 6, yaw: a });
    const dir = [Math.cos(a), Math.sin(a), -.08];
    for (let k = -2; k <= 2; k++) { const d2 = [Math.cos(a + k * .05), Math.sin(a + k * .05), -.08]; R.line(S2.gal.p(100, -70, 30), vadd(S2.gal.p(100, -70, 30), vmul(d2, 1400)), [255, 245, 200], 'add', .16); }
    FX.light(vadd(S2.gal.p(100, -70, 30), vmul(dir, 120)), 200, .5, '#fff0c0', .03);
    if (sim.scene && sim.scene.id === '2-3' && sim.flags.passing) { const p = sim.flags.passing; R.drawMesh({ mesh: TC.mesh('funicular'), x: p[0], y: p[1], z: p[2], yaw: Math.PI, pitch: .52 }); }
    if (sim.scene && sim.scene.id === '2-3' && sim.flags.passing === undefined) R.drawMesh({ mesh: TC.mesh('funicular'), x: FUN_TOP[0] - 40, y: 28, z: FUN_TOP[2] - 20, yaw: Math.PI, pitch: .52 });
  },
  intro: 'c2-intro', outro: 'c2-outro', scenes: ['2-1', '2-2', '2-3', '2-4', '2-B'] });

// ---------------------------------------------------------------- 2-1 GULL'S REST
def('scene', '2-1', { title: "GULL'S REST", time: 50,
  arrive: { path: [S2.lane.p(-150, 20, 24), S2.lane.p(-80, 0, 24), S2.lane.p(0, 0, 24)], speed: 100 },
  slots: sl21,
  covers: covers(S2.lane, { b1: [170, -57, 12, ['up'], { z: 32, ledge: true }], b2: [262, 57, 12, ['up'], { z: 32, ledge: true }], b3: [380, -57, 12, ['up'], { z: 32, ledge: true }], c1: [160, 38, 18, ['up']], c2: [312, 22, 18, ['up']], c3: [352, -10, 16, ['up']], c4: [352, 18, 16, ['up']], c5: [292, -10, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['deckhand', 'b1', { entry: 'stand' }], ['deckhand', 'b2', { entry: 'stand' }], ['deckhand', 'c1']], fx: { kind: 'glass' } },
    { after: 'clear', id: 'blades', spawn: [['rusher', null, { from: S2.lane.p(480, -20, 0), ground: 0 }], ['rusher', null, { from: S2.lane.p(500, 30, 0), ground: 0 }]], say: ['juno', "Blades! Don't let them get close!"] },
    { after: 'blades', id: 'blades2', spawn: [['rusher', null, { from: S2.lane.p(470, 0, 0), ground: 0 }], ['rusher', null, { from: S2.lane.p(520, -30, 0), ground: 0 }], ['rusher', null, { from: S2.lane.p(540, 40, 0), ground: 0 }]] },
    { after: 'blades2', spawn: [['quartermaster', null, { route: [S2.lane.p(250, -70, 0), S2.lane.p(250, 0, 0), S2.lane.p(250, 70, 0)], drop: 'sg', speed: 50 }], ['marine', 'c3', { entry: 'run' }], ['marine', 'c4', { entry: 'run' }], ['deckhand', 'b3', { entry: 'stand' }]] } ],
  objects: [['window', S2.lane.p(64, -63.6, 34), { size: [16, 2, 18] }], ['window', S2.lane.p(208, 63.6, 34), { size: [16, 2, 18] }], ['barrel', S2.lane.p(300, 40, 0)], ['lantern', S2.lane.p(100, -50, 56)]],
  cues: [{ at: 0, say: ['mari', 'Gull\'s Rest. Stay low, the whole lane is watching.'] }, { at: 2, fn: sim => TC.spawnCivilian(sim, { kind: 'fisher', at: S2.lane.p(120, -58, 0), route: [S2.lane.p(120, -58, 0), S2.lane.p(124, -60, 0)], line: ['fisher', 'Not me! Not me!'] }) },
    { on: 'spawn:rusher', prompt: 'switch' }, { on: 'spawn:quartermaster', say: ['juno', 'Orange vest! Drop him for the shotgun!'] }, { at: 12, prompt: 'switch' }],
  step(sim) { if (!sim.flags.shotgunLine && sim.players.some(p => p.owned.sg)) { sim.flags.shotgunLine = true; sim.say('kai', 'Shotgun. Now we\'re talking.'); } } });

// ---------------------------------------------------------------- 2-2 NET LOFTS
def('scene', '2-2', { title: 'NET LOFTS', time: 55,
  arrive: { path: [S2.lane.p(0, 0, 24), S2.lane.p(300, 0, 24), S2.lane.p(520, 0, 24), S2.lofts.p(-90, 0, 24), S2.lofts.p(0, 0, 24)], speed: 140 },
  slots: sl22,
  covers: covers(S2.lofts, { r1: [124, -30, 16, ['up']], r2: [164, 40, 16, ['up']], r3: [120, 60, 16, ['up']], u1: [244, -50, 12, ['up'], { z: 56, ledge: true }], u2: [244, 30, 12, ['up'], { z: 56, ledge: true }], u3: [244, -10, 12, ['up'], { z: 56, ledge: true }], s1: [200, 0, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['shield', null, { route: [S2.lofts.p(340, 0, 0), S2.lofts.p(240, -10, 0), S2.lofts.p(160, -10, 0), S2.lofts.p(110, 0, 0)] }], ['deckhand', 's1']], say: ['juno', 'Shield! Knock it aside with the shotgun!'] },
    { after: 'clear', spawn: [['marine', 'r1', { entry: 'rappel', from: S2.lofts.p(160, -20, 112) }], ['marine', 'r2', { entry: 'rappel', from: S2.lofts.p(165, -10, 112) }], ['deckhand', 'r3', { entry: 'rappel', from: S2.lofts.p(155, -30, 112) }]], say: ['rook', "Ropes! They're coming through the roof!"] },
    { after: 'clear', spawn: [['redtide', 'u1', { entry: 'stand' }], ['redtide', 'u2', { entry: 'stand' }], ['grenadier', 'u3', { entry: 'stand' }]] } ],
  objects: [['barrel', S2.lofts.p(236, -80, 56)], ['barrel', S2.lofts.p(236, 70, 56)], ['barrel', S2.lofts.p(180, 80, 0)], ['intel', S2.lofts.p(228, 92, 68), { intel: 'i2a' }], ['lantern', S2.lofts.p(120, 0, 96)]],
  allies: [{ agent: 'rook', at: S2.lofts.p(60, -86, 0), facing: 0 }],
  cues: [{ at: 0, prompt: 'shield' }] });

// ---------------------------------------------------------------- 2-3 FUNICULAR (moving) and THE GULL
const funSlots = [{ stand: { at: [0, -8, 34], look: [300, -70, -90] }, cover: { at: [-4, -4, 12], look: [60, -200, -200] } }, { stand: { at: [0, 8, 34], look: [300, 0, -80] }, cover: { at: [-6, 6, 12], look: [60, 200, -200] } }];
def('scene', '2-3', { title: 'FUNICULAR', time: 65,
  arrive: { path: [S2.lofts.p(0, 0, 24), S2.lofts.p(300, 0, 24), S2.lofts.p(420, 0, 24), [1060, -10, 30], [1120 - 20, -28, 32]], speed: 140 },
  carrier: { path: [[1120, -28, 3], [1500, -28, 3 + 380 * 448 / 790], [1880, -28, 448 + 3]], speed: 22, mesh: 'funicular', cover: [[[-36, -18, 3], [36, -16, 18]], [[-20, -14, 3], [-12, 14, 15]], [[-36, 16, 3], [36, 18, 18]]], pitch: true },
  slots: funSlots,
  covers: TC.noCheck(covers(F(1120, 0, 0, 0), { t1: [160, -86, 12, ['up'], { z: 160 * 448 / 790 + 32 }], t2: [290, -86, 12, ['up'], { z: 290 * 448 / 790 + 32 }], t3: [420, -86, 12, ['up'], { z: 420 * 448 / 790 + 32 }], t4: [550, -86, 12, ['up'], { z: 550 * 448 / 790 + 32 }], t5: [680, -86, 12, ['up'], { z: 680 * 448 / 790 + 32 }], q1: [800, 60, 16, ['up'], { z: 448 }] })),
  perches: [S2.keep.p(150, -80, 70), S2.keep.p(170, -64, 32), S2.keep.p(250, -20, 98)],
  waves: [
    { atD: 20, spawn: [['deckhand', 't1', { entry: 'stand' }], ['deckhand', 't2', { entry: 'stand' }]], say: ['mari', "The funicular's the only way up the cliff."] },
    { atD: 140, spawn: [['deckhand', 't3', { entry: 'stand' }], ['marine', 't4', { entry: 'stand' }]] },
    { atD: 300, id: 'passing', spawn: [], say: ['juno', "Car coming down—it's full of them!"] },
    { atD: 560, spawn: [['deckhand', 't5', { entry: 'stand' }], ['quartermaster', null, { route: [[1880, 70, 448], [1900, -10, 448], [1950, -100, 448]], drop: 'mg', speed: 40 }]] },
    { atD: 600, id: 'gull', spawn: [], fx: { kind: 'gull' } } ],
  objects: [['lifering', [1860, 50, 470]]],
  step(sim, dt) {
    // the passing car: down the parallel track with three gunners aboard, for a few seconds
    const w = sim.waves.find(x => x.id === 'passing');
    if (w && w.fired && !sim.flags.passDone) {
      sim.flags.passT = (sim.flags.passT || 0) + dt; const u = clamp(sim.flags.passT / 6.5, 0, 1), d = lerp(780, 40, u), p = [1120 + d, 28, d * 448 / 790 + 3];
      sim.flags.passing = p;
      if (!sim.flags.passMen) { sim.flags.passMen = [-16, 0, 16].map(o => { const e = TC.makeEnemy(sim, 'gunner', null, { at: [p[0] + o, p[1], p[2] + 3], entry: 'stand', mount: true, noClear: false }); e.cover = { h: 14, peek: ['up'], at: [0, 0, 0], busy: 1 }; e.passO = o; e.state = 'peek'; e.t = .3; return e; }); }
      for (const e of sim.flags.passMen) if (!e.dead) { e.x = p[0] + e.passO * Math.cos(.52); e.y = p[1] + 4; e.z = p[2] + 3 + e.passO * Math.sin(.52) * -.1; } else if (e.deathFix !== true) { e.deathFix = true; }
      if (u >= 1) { sim.flags.passDone = true; sim.flags.passing = null; for (const e of sim.flags.passMen) if (!e.dead) e.gone = true; }
    }
  } });
Sim.prototype._fireWave = (orig => function (w) { orig.call(this, w); if (w.fx && w.fx.kind === 'gull') { this.startBoss('gull'); } })(Sim.prototype._fireWave);

// ---------------------------------------------------------------- 2-4 LIGHTHOUSE KEEP (the hostage)
def('scene', '2-4', { title: 'LIGHTHOUSE KEEP', time: 60,
  arrive: { path: [[1880, -28, 470], [1920, 0, 484], S2.keep.p(-40, 0, 24), S2.keep.p(0, 0, 24)], speed: 90 },
  slots: sl24,
  covers: covers(S2.keep, { k1: [126, 60, 16, ['up']], k2: [166, 20, 16, ['up']], k3: [206, 80, 16, ['up']], k4: [168, -10, 18, ['up']], h1: [170, -63, 12, ['up'], { z: 32, ledge: true }], cap: [246, 0, 30, ['left'], { z: 0, noCheck: true }], lb1: [252, 16, 12, ['up'], { z: 98, ledge: true }] }),
  waves: [
    { at: .6, spawn: [['marine', 'k1'], ['marine', 'k3'], ['redtide', 'k2', { entry: 'roll' }]] },
    { after: 'clear', id: 'hostage', spawn: [['captor', 'cap', { at: S2.keep.p(250, 0, 0), entry: 'stand' }]], say: ['captor', 'One more step and the old man swims!'] },
    { after: 'hostage', spawn: [['rusher', null, { from: S2.keep.p(260, 120, 0), ground: S2.keep.z }], ['deckhand', 'h1', { entry: 'stand' }], ['deckhand', 'k4', { entry: 'run' }], ['deckhand', 'lb1', { entry: 'stand' }]] } ],
  objects: [['barrel', S2.keep.p(200, 40, 0)], ['window', S2.keep.p(100, -140, 30), { size: [2, 18, 16] }], ['intel', S2.keep.p(97, -82, 48), { intel: 'i2b' }]],
  cues: [{ on: 'spawn:captor', fn: sim => { sim.say('kai', 'Easy… easy…'); sim.emit('prompt', { id: 'civ' }); } }, { on: 'rescue', fn: sim => { sim.say('tejada', 'Mari! You came!'); sim.say('mari', 'Papa—get down!'); } }] });

// ---------------------------------------------------------------- 2-B HAMMERHEAD on the lantern gallery
def('scene', '2-B', { title: 'LANTERN GALLERY', time: 120, boss: 'hammerhead',
  arrive: { path: [S2.keep.p(0, 0, 24), S2.keep.p(200, 60, 60), [LH[0] - 90, 60, 500], [LH[0] - 80, -40, 650], S2.gal.p(-50, 0, 24), S2.gal.p(0, 0, 24)], speed: 160 },
  slots: sl2B, slots2: sl2B2,
  hammer: { track: [S2.gal.p(150, -60, 0), S2.gal.p(150, 90, 0)] },
  covers: {},
  objects: sl2B.flatMap(s => [-9, 9].map(o => ['crate', [s.prop.at[0] - Math.sin(s.prop.yaw) * o, s.prop.at[1] + Math.cos(s.prop.yaw) * o, s.prop.at[2]], { size: [14, 18, 18], coverProp: true, hp: 999 }])),
  cues: [{ at: 1, say: ['rook', 'Top of the lighthouse. Nowhere left to run.'] }] });

def('cutscene', 'c2-intro', { actors: [{ id: 'kai', at: S2.lane.p(-120, 10, 0), facing: 0 }, { id: 'mari', at: S2.lane.p(-130, -14, 0), facing: .2 }, { id: 'rook', at: S2.lane.p(-136, 24, 0), facing: -.1 }],
  steps: [{ music: 'storm' }, { fx: { kind: 'lightning' } },
    { cam: [cam(0, S2.lane.p(-60, 60, 40), S2.lane.p(-128, 4, 18)), cam(9, S2.lane.p(-80, 40, 30), S2.lane.p(-128, 4, 18))] },
    { say: ['krake', 'Hammerhead. No one reaches the lamp.'], screen: true }, { fx: { kind: 'lightning' } },
    { cam: [cam(0, S2.lane.p(0, 0, 40), [LH[0], LH[1], LH[2] + 200]), cam(8, S2.lane.p(40, 0, 50), [LH[0], LH[1], LH[2] + 240])] },
    { say: ['hammer', 'NOBODY. PASSES. HAMMERHEAD.'], screen: true },
    { cam: [cam(0, S2.lane.p(-100, 30, 22), S2.lane.p(-136, 24, 20)), cam(6, S2.lane.p(-104, 34, 22), S2.lane.p(-136, 24, 20))] },
    { say: ['rook', 'He talks in capital letters.'] }] });
def('cutscene', 'c2-outro', { actors: [{ id: 'tejada', at: S2.gal.p(30, 20, 0), facing: Math.PI }, { id: 'mari', at: S2.gal.p(14, 34, 0), facing: -.6 }, { id: 'kai', at: S2.gal.p(0, -10, 0), facing: .3 }],
  steps: [{ cam: [cam(0, S2.gal.p(80, 40, 30), S2.gal.p(10, 10, 20)), cam(10, S2.gal.p(70, 50, 26), S2.gal.p(10, 10, 20))] },
    { say: ['tejada', 'The override is in the Tidewall control tower. At the peak, Krake opens every gate.'] },
    { say: ['juno', 'Forty minutes to dawn. The maintenance tram can get you there.'] },
    { say: ['kai', "Then let's catch a ride."] }] });
