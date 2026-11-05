// 33-stage3: THE TIDEWALL (05:20 -> 06:00, dawn). Scenes 3-1 CREST ROAD (drones, rockets, the grenade launcher),
// 3-2 SLUICE LOCKS (four gate locks to jam; the SEAWOLF gunship), 3-3 TURBINE HALL, 3-5 HELIPAD (SCYLLA), 3-6
// CONTROL ROOM (ADMIRAL KRAKE and the FINAL SHOT). The sea rises scene by scene. Then the ending.

const S3 = { crest: F(0, 0, 0, 0), sluice: F(720, 0, 0, 0), hall: F(1420, 0, -40, 0), roof: F(2040, 0, 170, 0), ctrl: F(2040, 560, 170, 90) };
const sl31 = S3.crest.slots({ gap: 22 }), sl32 = S3.sluice.slots({ gap: 22, pitch: 7 }), sl33 = S3.hall.slots({ gap: 24 }), sl35 = S3.roof.slots({ gap: 24 }), sl36 = S3.ctrl.slots({ gap: 24 });
const rise = k => sim => { sim.water = -46 + k * 6; };

def('stage', 3, { name: 'THE TIDEWALL', place: 'Meridian Tidewall', clock: '05:20', music: 'tidewall', briefing: 'b3', amb: 'tidewall', ending: 'c3-ending',
  env: { sky: { stops: ['#3a2a5a', '#8a4f7a', '#f29e6b'], stars: false, clouds: { color: '#c87a8a', cover: .45, k: .55 }, glow: { color: '#ffd090', az: -.2, w: .9, k: .7 }, moon: { az: -.2, el: .06, color: '#fff2c0' },
    sil: [{ color: '#4a3a5a', h: az => (Math.sin(az) > 0 ? .02 + .05 * Math.abs(Math.sin(az * 13)) * Math.abs(Math.sin(az * 3.7)) : .006) }] },
    fog: ['#8a7a8f', 520, 2400], ambient: .48, ambientColor: '#e8c8d0', sun: { dir: [.9, -.15, .4], color: '#ffc890', k: .55 }, water: { z: -46, mat: 'sea-dawn' } },
  build(G) {
    // ---- 3-1 the crest road on top of the barrier: the sea on the left, the city far below on the right
    const C = S3.crest;
    G.push(C.x, C.y, C.z, C.yaw);
    G.box(-220, -70, -200, 640, 70, 0, 'asphalt', { surf: 'concrete', side: 'concrete' });
    G.box(-220, -76, 0, 640, -70, 12, 'concrete', { surf: 'concrete' }); G.box(-220, 70, 0, 640, 76, 12, 'concrete', { surf: 'concrete' });
    for (let d = -200; d < 640; d += 32) G.box(d, -2, 0, d + 16, 2, .3, 'hazard', { collide: false, tess: false });
    for (const d of [80, 240, 420]) { G.box(d, -70, 0, d + 44, -36, 54, 'concrete-dark', { surf: 'concrete', top: 'steel' }); G.box(d + 44, -60, 10, d + 44.6, -46, 40, 'plank', { collide: false }); G.box(d + 44, -68, 44, d + 44.6, -38, 50, 'hazard', { collide: false }); }
    for (const d of [0, 160, 320, 480]) { PF.lamppost(G, d, 64, 12, 64, true); }
    // a gantry across the road for the rocketeers
    for (const l of [-64, 64]) G.box(276, l - 4, 0, 284, l + 4, 76, 'steel-paint', { surf: 'metal' });
    G.box(270, -68, 76, 290, 68, 80, 'grate', { surf: 'metal', bottom: true }); G.box(268, -68, 80, 270, 68, 90, 'steel-paint', { surf: 'metal' });
    G.box(340, -40, 0, 352, 40, 20, 'sandbag', { surf: 'concrete' });   // the barricade line
    G.pop();
    PF.slotProp(G, sl31[0], 'concrete'); PF.slotProp(G, sl31[1], 'concrete');
    // the city below and its far lights
    for (let i = 0; i < 18; i++) PF.skylineBlock(G, -200 + i * 120, 400 + (i % 4) * 60, 90, 70, 30 + (i * 53) % 140, i % 3 !== 0);
    // ---- 3-2 the sluice: a catwalk platform, the roaring channel, the giant gate with four locks, catwalks across
    const S = S3.sluice;
    G.push(S.x, S.y, S.z, S.yaw);
    G.box(-80, -90, -6, 40, 90, 0, 'grate', { surf: 'metal', bottom: true }); PF.railing(G, [40, -90, 0], [40, 90, 0], 14);
    G.box(-80, -260, -120, 380, -200, 60, 'concrete', { surf: 'concrete' }); G.box(-80, 200, -120, 380, 260, 60, 'concrete', { surf: 'concrete' });
    G.box(360, -260, -120, 400, 260, 230, 'concrete-dark', { surf: 'concrete' });   // the gate
    for (let l = -240; l < 240; l += 40) G.box(359, l, -60, 360, l + 4, 220, 'steel-paint', { collide: false, tess: false });
    G.box(358, -250, 200, 360, 250, 206, 'hazard', { collide: false });
    PF.catwalk(G, [200, -200, 30], [200, 200, 30], 22); G.box(190, -200, 24, 210, 200, 30, 'grate', { surf: 'metal', bottom: true });
    PF.catwalk(G, [330, -200, 92], [330, 200, 92], 22); G.box(320, -200, 86, 340, 200, 92, 'grate', { surf: 'metal', bottom: true });
    for (const l of [-200, 200]) for (const d of [200, 330]) G.box(d - 4, l - 4, -120, d + 4, l + 4, d === 200 ? 30 : 92, 'steel-paint', { collide: false });
    G.box(186, -60, 30, 196, 60, 44, 'steel', { surf: 'metal' }); G.box(316, -160, 92, 326, -100, 104, 'steel', { surf: 'metal' }); G.box(316, 80, 92, 326, 140, 104, 'steel', { surf: 'metal' });
    G.pop();
    PF.slotProp(G, sl32[0], 'steel'); PF.slotProp(G, sl32[1], 'steel');
    // ---- 3-3 the turbine hall: an interior with catwalks, cranes, steam vents and coolant tanks
    const H = S3.hall;
    G.push(H.x, H.y, H.z, H.yaw);
    G.box(-60, -150, -2, 440, 150, 0, 'concrete', { surf: 'concrete' });
    G.box(-60, -152, 0, 440, -150, 170, 'concrete-dark', { surf: 'concrete' }); G.box(-60, 150, 0, 440, 152, 170, 'concrete-dark', { surf: 'concrete' }); G.box(438, -150, 0, 440, 150, 170, 'concrete-dark', { surf: 'concrete' });
    G.box(-62, -150, 0, -60, -30, 170, 'concrete-dark'); G.box(-62, 30, 0, -60, 150, 170, 'concrete-dark'); G.box(-62, -30, 50, -60, 30, 170, 'concrete-dark');
    G.box(-60, -150, 170, 440, 150, 172, 'steel', { collide: false, bottom: true });
    for (let d = 20; d < 440; d += 80) G.box(d, -150, 166, d + 6, 150, 170, 'steel-paint', { collide: false, bottom: true });
    G.box(330, -150, 54, 438, 150, 58, 'grate', { surf: 'metal', bottom: true }); G.box(326, -150, 54, 330, 150, 68, 'steel-paint', { surf: 'metal' });
    G.box(80, -150, 54, 330, -110, 58, 'grate', { surf: 'metal', bottom: true }); G.box(80, -112, 54, 330, -110, 68, 'steel-paint', { surf: 'metal' });
    for (const d of [120, 220, 320]) { G.box(d - 4, -150, 0, d + 4, -142, 54, 'steel-paint', { collide: false }); }
    for (const [d, l] of [[140, 90], [260, 90], [380, 90]]) { G.cyl(d, l, 0, 30, 36, 36, 14, 'gunmetal', { collide: 'metal' }); G.box(d - 8, l - 50, 30, d + 8, l - 36, 70, 'gunmetal', { collide: false }); G.light(d, l - 40, 60, 120, .6, '#43f0c8'); }
    for (const [d, l] of [[120, -30], [200, 30], [260, -60], [180, -90]]) G.box(d - 10, l - 18, 0, d + 10, l + 18, 18, 'steel', { surf: 'metal' });
    for (const l of [-100, 0, 100]) G.box(437.5, l - 30, 70, 438, l + 30, 110, 'screen-teal', { collide: false });
    for (let d = 40; d < 440; d += 100) PF.lamppost(G, d, -140, 0, 150, true, true);
    G.pop();
    PF.slotProp(G, sl33[0], 'steel'); PF.slotProp(G, sl33[1], 'steel');
    // ---- 3-5 the tower roof and helipad
    const Rf = S3.roof;
    G.push(Rf.x, Rf.y, Rf.z, Rf.yaw);
    G.box(-100, -220, -300, 440, 220, 0, 'concrete', { surf: 'concrete' });
    G.cyl(260, 0, .1, .2, 110, 110, 20, 'asphalt', { collide: false }); for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; G.box(260 + Math.cos(a) * 104 - 3, Math.sin(a) * 104 - 3, .2, 260 + Math.cos(a) * 104 + 3, Math.sin(a) * 104 + 3, .4, 'hazard', { collide: false, tess: false }); }
    G.box(225, -40, .3, 235, 40, .5, 'foam', { collide: false }); G.box(285, -40, .3, 295, 40, .5, 'foam', { collide: false }); G.box(235, -5, .3, 285, 5, .5, 'foam', { collide: false });
    for (const l of [-220, 220]) G.box(-100, l - 4, 0, 440, l + 4, 14, 'concrete', { surf: 'concrete' });
    G.box(436, -220, 0, 444, 220, 14, 'concrete'); PF.lamppost(G, 420, -200, 0, 40, true); PF.lamppost(G, 420, 200, 0, 40, true);
    G.box(-100, -60, 0, -60, 60, 40, 'concrete-dark', { surf: 'concrete' });   // the stairwell
    G.pop();
    PF.slotProp(G, sl35[0], 'concrete'); PF.slotProp(G, sl35[1], 'concrete');
    // ---- 3-6 the control room: consoles, windows on the sea, the master lever
    const K = S3.ctrl;
    G.push(K.x, K.y, K.z, K.yaw);
    G.box(-60, -160, -2, 300, 160, 0, 'tiles', { surf: 'concrete' });
    G.box(-60, -162, 0, 300, -160, 90, 'concrete-dark'); G.box(-60, 160, 0, 300, 162, 90, 'concrete-dark'); G.box(-62, -160, 0, -60, 160, 90, 'concrete-dark');
    G.box(298, -160, 0, 300, 160, 24, 'concrete-dark'); G.box(298, -160, 70, 300, 160, 90, 'concrete-dark'); for (let l = -160; l < 160; l += 40) G.box(298, l - 2, 24, 300, l + 2, 70, 'steel-paint', { collide: false });
    G.box(-60, -160, 90, 300, 160, 92, 'steel', { collide: false, bottom: true });
    for (const [d, l] of [[150, -90], [150, 0], [150, 90], [230, -50], [230, 50]]) { G.box(d - 8, l - 26, 0, d + 8, l + 26, 20, 'gunmetal', { surf: 'metal' }); G.box(d - 8.5, l - 24, 14, d - 8, l + 24, 19, 'screen-teal', { collide: false, tess: false }); }
    for (const l of [-100, 0, 100]) G.box(-59.5, l - 30, 40, -59, l + 30, 70, 'screen-teal', { collide: false });
    G.pop();
    PF.slotProp(G, sl36[0], 'console'); PF.slotProp(G, sl36[1], 'console');
  },
  intro: 'c3-intro', scenes: ['3-1', '3-2', '3-3', '3-5', '3-6'] });

// ---------------------------------------------------------------- 3-1 CREST ROAD
def('scene', '3-1', { title: 'CREST ROAD', time: 75, enter: rise(0),
  arrive: { path: [S3.crest.p(-210, 0, 24), S3.crest.p(-100, 0, 24), S3.crest.p(0, 0, 24)], speed: 110 },
  slots: sl31,
  covers: covers(S3.crest, { g1: [282, -30, 10, ['up'], { z: 80, ledge: true }], g2: [282, 40, 10, ['up'], { z: 80, ledge: true }], b1: [362, -20, 20, ['up']], b2: [362, 24, 20, ['up']], h1: [140, -46, 54, ['left']], h2: [300, -46, 54, ['left']] }),
  waves: [
    { at: .6, spawn: [0, 1, 2, 3, 4].map(k => ['drone', null, { at: S3.crest.p(170 + k * 22, -40 + k * 20, 40 + (k % 2) * 16) }]), say: ['juno', 'Drones! Use the machine gun!'] },
    { after: 'clear', spawn: [['rocketeer', 'g1', { entry: 'stand' }], ['rocketeer', 'g2', { entry: 'stand' }], ['deckhand', 'h1', { entry: 'stand' }]], say: ['juno', 'Rocket! Shoot it down!'] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [S3.crest.p(250, -80, 0), S3.crest.p(250, 0, 0), S3.crest.p(250, 80, 0)], drop: 'gl', speed: 50 }], ['marine', 'b1', { entry: 'stand' }], ['shield', null, { route: [S3.crest.p(420, 10, 0), S3.crest.p(380, 10, 0)] }], ['marine', 'b2', { entry: 'stand' }], ['deckhand', 'h2', { entry: 'stand' }]] } ],
  objects: [['barrel', S3.crest.p(360, 50, 0)], ['barrel', S3.crest.p(370, -50, 0)]],
  cues: [{ at: 0, fn: sim => { for (const p of sim.players) { p.owned.mg = true; if (p.ammo.mg < 60) p.ammo.mg = 60; } sim.emit('prompt', { id: 'switch' }); } }],
  step(sim) { if (!sim.flags.glLine && sim.players.some(p => p.owned.gl)) { sim.flags.glLine = true; sim.say('rook', 'Grenade launcher. My kind of party.'); } } });

// ---------------------------------------------------------------- 3-2 SLUICE LOCKS (and the SEAWOLF)
def('scene', '3-2', { title: 'SLUICE LOCKS', time: 100, enter: rise(1),
  arrive: { path: [S3.crest.p(0, 0, 24), S3.crest.p(400, 0, 24), S3.crest.p(600, 0, 24), S3.sluice.p(-70, 0, 24), S3.sluice.p(0, 0, 24)], speed: 160 },
  slots: sl32,
  covers: covers(S3.sluice, { w1: [204, -40, 14, ['up'], { z: 30 }], w2: [204, 80, 14, ['up'], { z: 30 }], w3: [204, -120, 14, ['up'], { z: 30 }], u1: [334, -130, 12, ['up'], { z: 92 }], u2: [334, 110, 12, ['up'], { z: 92 }], u3: [334, 0, 14, ['up'], { z: 92 }] }),
  seawolf: S3.sluice.p(250, 0, 120), rappelTo: [S3.sluice.p(204, -40, 30), S3.sluice.p(204, 80, 30)],
  waves: [
    { at: .6, spawn: [['deckhand', 'w1', { entry: 'stand' }], ['deckhand', 'w2', { entry: 'stand' }], ['redtide', 'u1', { entry: 'stand' }]] },
    { after: 'clear', id: 'wolf', spawn: [['deckhand', 'u2', { entry: 'stand' }], ['drone', null, { at: S3.sluice.p(150, -60, 70) }], ['drone', null, { at: S3.sluice.p(170, 60, 80) }]], fx: { kind: 'seawolf' } },
    { after: 'wolf', delay: 4, spawn: [['redtide', 'u3', { entry: 'stand' }], ['marine', 'w3', { entry: 'stand' }]] } ],
  objects: [['lock', S3.sluice.p(356, -150, 50), { yaw: Math.PI }], ['lock', S3.sluice.p(356, -50, 150), { yaw: Math.PI }], ['lock', S3.sluice.p(356, 60, 76), { yaw: Math.PI }], ['lock', S3.sluice.p(356, 160, 140), { yaw: Math.PI }], ['intel', S3.sluice.p(196, -140, 34), { intel: 'i3a' }]],
  cues: [{ at: 0, say: ['tejada', 'Jam the gate locks! Four of them—the glowing clamps!'] }],
  objective: sim => sim.objects.filter(o => o.kind === 'lock' && !o.dead).length === 0 && !!sim.flags.seawolfDone && sim.boss === null,
  step(sim) { if (!sim.flags.locksLine && sim.objects.filter(o => o.kind === 'lock' && !o.dead).length === 0) { sim.flags.locksLine = true; sim.say('tejada', 'Gate jammed! Hurry to the tower!'); } } });
Sim.prototype._fireWave = (orig => function (w) { orig.call(this, w); if (w.fx && w.fx.kind === 'seawolf') this.startBoss('seawolf'); })(Sim.prototype._fireWave);

// ---------------------------------------------------------------- 3-3 TURBINE HALL
def('scene', '3-3', { title: 'TURBINE HALL', time: 60, enter: rise(2),
  arrive: { path: [S3.sluice.p(0, 0, 24), S3.sluice.p(-60, 120, 24), [1300, 170, -16], S3.hall.p(-120, 0, 24), S3.hall.p(-30, 0, 24), S3.hall.p(0, 0, 24)], speed: 170 },
  slots: sl33,
  covers: covers(S3.hall, { c1: [130, -30, 18, ['up']], c2: [210, 30, 18, ['up']], c3: [270, -60, 18, ['up']], c4: [190, -90, 18, ['up']], k1: [200, -126, 12, ['up'], { z: 58, ledge: true }], k2: [300, -126, 12, ['up'], { z: 58, ledge: true }], u1: [344, -40, 12, ['up'], { z: 58, ledge: true }], u2: [344, 50, 12, ['up'], { z: 58, ledge: true }] }),
  waves: [
    { at: .6, spawn: [['marine', 'k1', { entry: 'stand' }], ['marine', 'k2', { entry: 'stand' }], ['redtide', 'c2', { entry: 'roll' }], ['deckhand', 'c1', { entry: 'stand' }]] },
    { after: 'clear', spawn: [['shield', null, { route: [S3.hall.p(400, 0, 0), S3.hall.p(300, -20, 0), S3.hall.p(230, -20, 0)] }], ['shield', null, { route: [S3.hall.p(410, 60, 0), S3.hall.p(320, 40, 0), S3.hall.p(250, 50, 0)] }], ['rusher', null, { from: S3.hall.p(420, -100, 0), ground: S3.hall.z }], ['rusher', null, { from: S3.hall.p(430, 110, 0), ground: S3.hall.z }]] },
    { after: 'clear', spawn: [['grenadier', 'u1', { entry: 'stand' }], ['rocketeer', 'u2', { entry: 'stand' }], ['redtide', 'c3', { entry: 'roll' }], ['quartermaster', null, { route: [S3.hall.p(300, 140, 0), S3.hall.p(300, 0, 0), S3.hall.p(300, -140, 0)], drop: 'sg', speed: 55 }]] } ],
  objects: [['tank', S3.hall.p(240, -130, 0)], ['tank', S3.hall.p(170, 120, 0)], ['tank', S3.hall.p(350, -20, 58)], ['intel', S3.hall.p(328, -60, 68), { intel: 'i3b' }]],
  allies: [{ agent: 'rook', at: S3.hall.p(60, 130, 0), facing: 0 }],
  cues: [{ at: 0, say: ['rook', 'Turbine hall. Mind the fans.'] }, { at: 6, say: ['juno', 'Coolant tanks—stay clear. Unless the bad guys are closer.'] }],
  dyn(R, sim, view) { for (const [d, l] of [[140, 90], [260, 90], [380, 90]]) { const p = S3.hall.p(d, l, 34); R.drawMesh({ mesh: TC.mesh('turbine'), x: p[0], y: p[1], z: p[2], yaw: view.t * 3 + d }); if (fxRand() < .15) FX.add({ p: S3.hall.p(d - 40, l - 60, 0), v: [0, 0, 30], rgb: [230, 235, 240], size: 4, grow: 8, life: 1.4, mode: 'alpha', alpha: .5 }); } } });

// ---------------------------------------------------------------- 3-5 HELIPAD: SCYLLA
def('scene', '3-5', { title: 'TOWER ROOF', time: 90, boss: 'scylla', enter: rise(3),
  arrive: { path: [S3.hall.p(0, 0, 24), S3.hall.p(380, -20, 24), S3.hall.p(500, -40, 40), [1960, -120, 120], S3.roof.p(-140, -60, 50), S3.roof.p(-40, 0, 24), S3.roof.p(0, 0, 24)], speed: 170 },
  slots: sl35, scyllaAt: S3.roof.p(250, 0, 0),
  covers: {},
  cues: [] });
// ---------------------------------------------------------------- 3-6 CONTROL ROOM: ADMIRAL KRAKE
def('scene', '3-6', { title: 'CONTROL ROOM', time: 90, boss: 'krake', enter: rise(4),
  arrive: { path: [S3.roof.p(0, 0, 24), S3.roof.p(-60, 60, 24), [S3.ctrl.x, S3.ctrl.y - 160, S3.ctrl.z + 24], S3.ctrl.p(-40, 0, 24), S3.ctrl.p(0, 0, 24)], speed: 140 },
  slots: sl36,
  krake: { spots: [S3.ctrl.p(166, -90, 0), S3.ctrl.p(166, 0, 0), S3.ctrl.p(166, 90, 0), S3.ctrl.p(246, -50, 0), S3.ctrl.p(246, 50, 0)], lever: S3.ctrl.p(286, 120, 40), minions: ['m1', 'm2'] },
  covers: covers(S3.ctrl, { m1: [166, -50, 20, ['up']], m2: [166, 50, 20, ['up']] }),
  cues: [{ at: .5, say: ['krake', 'So. The little agents reach the bridge of my storm.'] }] });

def('cutscene', 'c3-intro', { actors: [{ id: 'kai', at: S3.crest.p(-180, -8, 0), facing: 0 }, { id: 'rook', at: S3.crest.p(-190, 14, 0), facing: .1 }, { id: 'mari', at: S3.crest.p(-196, -24, 0), facing: -.1 }],
  steps: [{ music: 'tidewall' },
    { cam: [cam(0, S3.crest.p(-80, -120, 60), S3.crest.p(-190, 0, 20)), cam(9, S3.crest.p(-110, -100, 40), S3.crest.p(-190, 0, 20))] },
    { say: ['krake', 'Look at the sea, CREST. It rises for me.'], screen: true },
    { say: ['krake', 'At dawn, Port Lumen returns to the deep!'], screen: true },
    { cam: [cam(0, S3.crest.p(-150, 10, 24), S3.crest.p(-182, -8, 24)), cam(8, S3.crest.p(-146, 14, 24), S3.crest.p(-182, -8, 24))] },
    { say: ['kai', 'Not on our watch.'] }, { say: ['rook', 'Did you rehearse that?'] }, { say: ['kai', '…Maybe.'] }] });
def('cutscene', 'c3-ending', { actors: [{ id: 'krake', at: S3.ctrl.p(200, 0, 0), facing: Math.PI / 2 + Math.PI, pose: 'kneel' }, { id: 'mari', at: S3.ctrl.p(170, 30, 0), facing: -1.8 }, { id: 'kai', at: S3.ctrl.p(160, -20, 0), facing: 1.2 }, { id: 'rook', at: S3.ctrl.p(140, 40, 0), facing: -.6 }, { id: 'juno', at: S3.ctrl.p(120, -60, 0), facing: .4 }],
  steps: [{ music: 'ending' },
    { cam: [cam(0, S3.ctrl.p(60, 0, 40), S3.ctrl.p(200, 0, 20)), cam(10, S3.ctrl.p(90, 10, 34), S3.ctrl.p(200, 0, 20))] },
    { say: ['juno', 'All forty gates closing! You did it!'] },
    { say: ['mari', "Silas Krake, you're under arrest by the Lumen Coast Guard."] },
    { say: ['krake', 'The tide will turn again.'] },
    { say: ['rook', "Twice a day. It's called science."] },
    { cam: [cam(0, S3.ctrl.p(200, 0, 40), S3.ctrl.p(400, 0, 60)), cam(10, S3.ctrl.p(230, 0, 44), S3.ctrl.p(420, 0, 70))] },
    { say: ['hale', 'Outstanding work, agents. Port Lumen owes you its dawn.'] },
    { say: ['kai', 'Tell the festival to save us some lanterns.'] },
    { say: ['rook', 'Kid. No puns at the debriefing.'] },
    { say: ['kai', 'No promises.'] }] });
