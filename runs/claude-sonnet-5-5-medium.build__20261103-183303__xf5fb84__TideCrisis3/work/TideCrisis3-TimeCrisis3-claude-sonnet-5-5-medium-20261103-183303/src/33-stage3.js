// 33-stage3.js — STAGE 3: THE TIDEWALL (05:20 → 06:00, dawn): 3-1…3-4 and the final boss 3-B (Scylla → Krake).
def('stage', 3, { name: 'THE TIDEWALL', place: 'Meridian Tidewall', clock: '05:20', music: 'tidewall', scenes: ['3-1', '3-2', '3-3', '3-4', '3-B'], intro: 'c3-intro', outro: 'c3-outro', brief: 'brief3' });
defScene('3-1', {
  title: 'CREST ROAD', time: 50, env: 'dawn', from: [-190, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 460, -140, 140, 0, 'concrete'); b.raw(-200, -50, 0, 460, 50, 1, 'asphalt', { floor: 1 }); for (let x = -180; x < 440; x += 40) b.raw(x, -3, 1, x + 20, 3, 2, 'white', { floor: 1, edge: false });
    b.raw(-200, -140, 0, 460, -128, 18, 'hazard', { solid: 0 }); b.raw(-200, 128, 0, 460, 140, 18, 'hazard', { solid: 0 });
    b.box(330, -90, 60, 70, 80, 'concrete', 0, { solid: 1 }); b.box(330, 90, 60, 70, 80, 'concrete', 0, { solid: 1 }); b.box(300, -60, 10, 4, 30, 'screen', 36, { glow: 1, edge: false });
    for (let x = -100; x < 400; x += 80) b.lamppost(x, -120, 54), b.lamppost(x, 120, 54);
    b.raw(430, -140, 0, 450, 140, 100, 'concrete', { solid: 1 }); b.box(300, 0, 6, 60, 6, 'hazard', 20, { solid: 0 });
  },
  covers: { c1: cvr(155, -40, 26, 16, 'concrete', ['up', 'left']), c2: cvr(180, 44, 26, 16, 'concrete', ['up', 'right']), g1: cvr(280, -74, 24, 14, 'steel', ['up'], { z0: 60 }), g2: cvr(285, 78, 24, 14, 'steel', ['up'], { z0: 60 }), b1: cvr(250, 0, 40, 18, 'concrete', ['up', 'left', 'right'], { w: 40 }), b2: cvr(320, 30, 26, 16, 'crate', ['up']), b3: cvr(340, -30, 26, 16, 'crate', ['up']) },
  waves: [W_at(.5, [['drone', null, { at: [230, -60, 0], z: 44 }], ['drone', null, { at: [260, -20, 0], z: 52 }], ['drone', null, { at: [250, 30, 0], z: 40 }], ['drone', null, { at: [270, 70, 0], z: 56 }], ['drone', null, { at: [240, 0, 0], z: 62 }]]),
    W_after([['rocketeer', 'g1'], ['rocketeer', 'g2'], ['deckhand', 'c1']]),
    W_after([['quartermaster', null, { route: [[420, -100, 0], [420, 100, 0]], drop: 'gl', speed: 55 }], ['marine', 'b2'], ['marine', 'b3'], ['shield', 'b1', { from: [400, 0, 0], advance: [330, 290, 260] }]])],
  objs: [['section', 255, 0, 0, { solid: 1, hp: 1 }]],
  cues: [{ at: 0, say: ['juno', 'Drones! Use the machine gun!'] }, { on: 'rk', say: ['juno', 'Rocket! Shoot it down!'] }, { at: 12, fn: s => { s.flags.rk = 1; } }, { on: 'gl', say: ['rook', 'Grenade launcher. Blow that barricade apart.'] }, { at: 26, fn: s => { s.flags.gl = 1; } }]
});
defScene('3-2', {
  title: 'SLUICE LOCKS', time: 100, env: 'dawn', from: [-170, 0, 24], whip: -.8,
  build(b) {
    b.floor(-200, 100, -140, 140, 0, 'grate'); b.floor(100, 440, -140, -40, -30, 'sea'); b.floor(100, 440, 40, 140, -30, 'sea');
    b.floor(100, 440, -40, 40, 0, 'grate'); b.raw(100, -40, 0, 420, -34, 20, 'hazard', { solid: 0 }); b.raw(100, 34, 0, 420, 40, 20, 'hazard', { solid: 0 });
    b.wall(430, -140, 140, 100, 'concrete'); b.box(420, 0, 6, 120, 70, 'steel', 0, { solid: 0 }); for (const y of [-70, -24, 24, 70]) b.box(414, y, 8, 12, 14, 'hazard', 36, { solid: 0 });
    for (let x = 140; x < 400; x += 60) { b.post(x, -48, 24, 'steel'); b.post(x, 48, 24, 'steel'); b.lamppost(x, -60, 42); }
    b.box(250, -90, 60, 40, 30, 'concrete', -30, { solid: 0 }); b.box(250, 90, 60, 40, 30, 'concrete', -30, { solid: 0 });
  },
  covers: { c1: cvr(180, -26, 26, 16, 'steel', ['up', 'left']), c2: cvr(200, 28, 26, 16, 'steel', ['up', 'right']), c3: cvr(260, -2, 26, 16, 'crate', ['up']), c4: cvr(310, -28, 26, 16, 'steel', ['up', 'left']), c5: cvr(320, 30, 26, 16, 'steel', ['up', 'right']), r1: cvr(300, -2, 24, 14, 'steel', ['up'], { z0: 0 }), r2: cvr(240, -36, 24, 14, 'crate', ['up']), r3: cvr(240, 36, 24, 14, 'crate', ['up']) },
  waves: [W_at(.6, [['deckhand', 'c1'], ['redtide', 'c2'], ['deckhand', 'c3'], ['drone', null, { at: [250, -50, 0], z: 48 }]]),
    W_after([['marine', 'c4'], ['marine', 'c5'], ['drone', null, { at: [280, 40, 0], z: 52 }], ['drone', null, { at: [260, -20, 0], z: 60 }]]),
    W_after([['redtide', 'c3'], ['deckhand', 'r2'], ['deckhand', 'r3']])],
  objs: [['lock', 414, -70, 36, { lockN: 1 }], ['lock', 414, -24, 36, { lockN: 2 }], ['lock', 414, 24, 36, { lockN: 3 }], ['lock', 414, 70, 36, { lockN: 4 }]],
  objective: s => (s.flags.locks || 0) >= 4,
  onStart: s => { s.spawnBoss('seawolf', { final: false }); },
  cues: [{ at: 0, say: ['tomas', 'Jam the four gate locks before the tide gauge peaks!'] }, { at: 20, say: ['juno', 'Gunship inbound! Duck on the strafe!'] }]
});
defScene('3-3', {
  title: 'TURBINE HALL', time: 60, env: 'turbine', from: [-180, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 440, -140, 140, 0, 'concrete'); b.raw(-200, -140, 0, 440, -130, 130, 'metal', { solid: 1 }); b.raw(-200, 130, 0, 440, 140, 130, 'metal', { solid: 1 }); b.raw(-200, -140, 130, 440, 140, 140, 'metal', { solid: 1 }); b.wall(430, -140, 140, 130, 'metal');
    for (const y of [-80, 0, 80]) { b.box(330, y, 40, 40, 70, 'steel', 0, { solid: 1 }); b.box(330, y, 44, 44, 6, 'hazard', 34, {}); b.box(310, y, 6, 30, 6, 'screen', 50, { glow: 1, edge: false }); }
    b.raw(180, -130, 50, 300, 130, 54, 'grate', { solid: 0 }); b.raw(180, -130, 0, 184, -120, 50, 'steel', {}); b.raw(180, 120, 0, 184, 130, 50, 'steel', {});
    for (let x = 120; x < 420; x += 70) { b.lamppost(x, -120, 90); b.lamppost(x, 120, 90); }
    b.box(250, -100, 12, 12, 26, 'white', 0, { solid: 1 }); b.box(256, 102, 12, 12, 26, 'white', 0, { solid: 1 });
  },
  covers: { c1: cvr(160, -36, 26, 16, 'steel', ['up', 'left']), c2: cvr(180, 36, 26, 16, 'steel', ['up', 'right']), cw1: cvr(255, -48, 24, 14, 'steel', ['up'], { z0: 56 }), cw2: cvr(255, 48, 24, 14, 'steel', ['up'], { z0: 56 }), cw3: cvr(255, 0, 24, 14, 'steel', ['up'], { z0: 56 }), t1: cvr(300, -40, 26, 16, 'crate', ['up', 'left']), t2: cvr(300, 40, 26, 16, 'crate', ['up', 'right']), t3: cvr(380, -40, 26, 16, 'crate', ['up']), t4: cvr(380, 40, 26, 16, 'crate', ['up']) },
  waves: [W_at(.5, [['marine', 'cw1'], ['redtide', 'cw2'], ['marine', 'cw3'], ['redtide', 'c1']]),
    W_after([['shield', 't1', { from: [400, -30, 0], advance: [340, 300] }], ['shield', 't2', { from: [400, 40, 0], advance: [345, 310] }], ['rusher', null, { from: [420, 0, 0] }], ['rusher', null, { from: [420, -60, 0] }]]),
    W_after([['grenadier', 't3'], ['rocketeer', 'cw3'], ['deckhand', 't4']])],
  objs: [['tank', 270, -110, 0, { hp: 3 }], ['tank', 280, 110, 0, { hp: 3 }], ['intel', 150, 100, 30, { intelId: 'i4' }]],
  cues: [{ at: 0, say: ['rook', 'Turbine hall. Loud. Watch the steam.'] }, { at: 8, say: ['juno', 'Combination arms! Mix your weapons!'] }]
});
defScene('3-4', {
  title: 'TOWER LIFT', time: 50, env: 'tower', from: [-70, 0, 26], whip: .4, moving: { speed: 22, dist: 240, hold: 1 }, lift: 1, sway: [1.4, .004], looseView: 1, coverMat: 'steel', coverProp: { h: 15, mat: 'steel' },
  build(b) {
    b.floor(-100, 120, -50, 50, -4, 'glass', { glow: 1 }); b.floor(-100, 120, -50, 50, -4, 'steel');
    b.box(340, 0, 50, 120, 700, 'concrete', -100, { solid: 0 }); b.box(250, 0, 4, 160, 700, 'glass', -100, { glow: 1, edge: false, solid: 0 });
    for (let z = 0; z < 280; z += 36) { b.box(160, -60, 6, 6, 20, 'steel', z); b.box(160, 60, 6, 6, 20, 'steel', z + 10); b.lamppost(150, -90, z + 20); }
    b.floor(-300, 600, -300, 300, -120, 'sea');
  },
  covers: { l1: cvr(160, -30, 24, 14, 'steel', ['up'], { z0: 30 }), l2: cvr(170, 28, 24, 14, 'steel', ['up'], { z0: 50 }), l3: cvr(185, 0, 24, 14, 'steel', ['up'], { z0: 100 }), ro1: cvr(160, -36, 20, 14, 'steel', ['up'], { z0: 160 }), ro2: cvr(160, 36, 20, 14, 'steel', ['up'], { z0: 160 }), r1: cvr(170, -20, 20, 14, 'steel', ['up'], { z0: 80 }), r2: cvr(170, 20, 20, 14, 'steel', ['up'], { z0: 120 }) },
  waves: [W_at(.5, [['drone', null, { at: [200, -40, 0], z: 40 }], ['drone', null, { at: [220, 20, 0], z: 54 }], ['drone', null, { at: [210, 50, 0], z: 46 }]]),
    { atD: 70, spawn: [['marine', 'r1', { entry: 'rappel', from: [170, -20, 180] }], ['marine', 'r2', { entry: 'rappel', from: [170, 20, 200] }], ['redtide', 'l3']] },
    { atD: 140, spawn: [['marine', 'ro1'], ['marine', 'ro2'], ['rocketeer', 'ro1']] }],
  objs: [['lifering', 140, 40, 60]],
  objective: s => !s.boss || s.boss.dead,
  onStart: s => { }, bossAtD: 160, bossId: 'seawolf',
  cues: [{ at: 0, say: ['kai', 'Glass elevator. Always the glass elevator.'] }, { atD: 160, say: ['juno', 'Seawolf is back! Take out its weapon pods!'] }]
});
defScene('3-B', {
  title: 'SCYLLA', time: 90, env: 'tower', boss: 'scylla', from: [-70, 0, 24], whip: .5, looseView: 1, coverMat: 'concrete', coverProp: { h: 15, mat: 'concrete' },
  build(b) {
    b.floor(-120, 460, -130, 130, 0, 'concrete'); b.raw(-120, -130, 0, 460, -124, 24, 'concrete', { solid: 0 }); b.raw(-120, 124, 0, 460, 130, 24, 'concrete', { solid: 0 });
    b.floor(300, 460, -130, 130, 0, 'hazard'); for (let y = -100; y <= 100; y += 50) b.box(420, y, 4, 4, 70, 'steel', 0);
    b.box(450, 0, 12, 200, 70, 'screen', 20, { glow: 1, edge: false }); b.lamppost(60, -100, 50); b.lamppost(60, 100, 50);
    b.box(210, -36, 18, 26, 14, 'concrete', 0, { solid: 1 }); 
  },
  slots: [{ at: [0, -22, 24] }, { at: [0, 22, 24] }], covers: { k1: cvr(250, -70, 20, 14, 'concrete', ['up', 'left'], { hidden: 1 }), k2: cvr(255, 0, 20, 14, 'concrete', ['up'], { hidden: 1 }), k3: cvr(250, 70, 20, 14, 'concrete', ['up', 'right'], { hidden: 1 }) }, waves: [], cues: [{ at: -1, say: ['kai', 'Is that a crab? That is a big crab.'] }]
});
