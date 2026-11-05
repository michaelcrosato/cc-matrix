// 31-stage1.js — STAGE 1: HARBOR LIGHTS (Port Lumen Docks, 23:40, Lantern Festival): 1-1…1-4 and the boss 1-B.
const cvr = (x, y, w, h, mat, peek, o) => Object.assign({ x, y, w, h, mat, peek: peek || ['up'] }, o);
def('stage', 1, { name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', scenes: ['1-1', '1-2', '1-3', '1-4', '1-B'], intro: 'c1-intro', outro: 'c1-outro', brief: 'brief1' });
defScene('1-1', {
  title: 'LANTERN PIER', time: 45, env: 'harbor', from: [-170, 0, 24], whip: .9,
  build(b) {
    b.floor(-200, 420, -130, 130, 0, 'planks'); b.floor(-200, 420, -60, 60, 0, 'planks');
    for (let x = -120; x < 380; x += 60) { b.post(x, -128, 20); b.post(x, 128, 20); b.lantern(x, -128, 22); b.lantern(x, 128, 22); }
    b.stall(110, -82); b.stall(150, 88, 'awn_blue'); b.stall(250, -96); b.stall(300, 78, 'awn_blue');
    b.warehouse(390, -130, 130, 78); b.door(389, 20); b.door(389, -70);
    b.box(240, 105, 40, 60, 30, 'hull', 0, { solid: 1 }); b.box(238, 105, 22, 28, 22, 'hull_w', 30, { solid: 1 });   // fishing boat + cabin
    b.lanternString(60, -120, 120, 46); b.lanternString(200, -120, 120, 50); b.lanternString(330, -120, 120, 52);
    b.lamppost(40, -112); b.lamppost(40, 112); b.lamppost(330, -112); b.lamppost(330, 112);
    b.box(100, 58, 3, 3, 16, 'wood_d');
  },
  covers: { c1: cvr(155, -40, 26, 16, 'crate', ['up', 'left']), c2: cvr(185, 34, 22, 16, 'barrel', ['up', 'right']), c3: cvr(215, -86, 36, 18, 'planks', ['up', 'left']), c4: cvr(245, 40, 30, 17, 'crate', ['up']), c5: cvr(310, -10, 30, 16, 'crate', ['up', 'left', 'right']), c6: cvr(350, 52, 26, 16, 'crate', ['up']) },
  waves: [W_at(.6, [['deckhand', 'c1', { entry: 'stand' }], ['deckhand', 'c2'], ['deckhand', 'c3']]),
    W_after([['deckhand', 'c5', { entry: 'door', from: [380, 20, 0] }], ['deckhand', 'c4', { entry: 'jump', from: [238, 105, 52] }]]),
    W_after([['quartermaster', null, { route: [[380, -100, 0], [380, 90, 0]], drop: 'mg', speed: 38 }], ['deckhand', 'c6', { entry: 'run', from: [420, -40, 0] }]])],
  civ: [{ at: 2, route: [[120, -60, 0], [330, -60, 0]], speed: 30 }, { at: 2.4, route: [[120, -66, 0], [330, -66, 0]], speed: 30 }],
  objs: [['lifering', 100, 58, 17], ['lantern', 110, -82, 26], ['lantern', 150, 88, 28], ['bottle', 110, -88, 13], ['bottle', 118, -78, 13], ['crate', 270, -20, 0, { solid: 0 }]],
  cues: [{ at: 0, say: ['juno', 'Hostiles on the pier! Watch the festival crowd!'], prompt: 'cover' }, { on: 'qm', say: ['juno', 'Orange vest! He\'s hauling ammo—drop him!'] }, { at: 12, fn: s => { s.flags.qm = 1; } }],
});
defScene('1-2', {
  title: 'FISH MARKET', time: 50, env: 'market', from: [-190, 0, 24], whip: -.8,
  build(b) {
    b.floor(-200, 420, -130, 130, 0, 'cobble'); b.raw(-200, -130, 0, 420, -120, 80, 'brick', { solid: 1 }); b.raw(-200, 120, 0, 420, 130, 80, 'brick', { solid: 1 }); b.raw(-200, -130, 80, 420, 130, 86, 'timber', { solid: 1 });
    b.wall(400, -130, 130, 80, 'brick'); b.box(399, 0, 2, 120, 22, 'black', 0, { edge: false });
    b.box(260, 0, 28, 240, 6, 'timber', 46, { solid: 1 }); b.box(260, -100, 28, 20, 46, 'timber', 0); b.box(260, 100, 28, 20, 46, 'timber', 0);  // the gallery
    for (let y = -90; y <= 90; y += 45) { b.lantern(120, y, 60); b.lantern(220, y, 62); }
    b.box(300, -70, 22, 56, 4, 'white', 16, {});   // ice table top (decor)
    for (const y of [-60, 10, 70]) b.stall(170, y, y > 0 ? 'awn_blue' : 'awn_red');
    b.box(240, -60, 14, 14, 24, 'rust', 0, { solid: 1 }); b.box(240, 60, 14, 14, 24, 'rust', 0, { solid: 1 });
    b.box(398, -55, 3, 24, 30, 'screen', 22, { glow: 1, edge: false });
    b.box(185, 110, 8, 6, 30, 'white', 10, { solid: 0 });
  },
  covers: { c1: cvr(160, -36, 26, 16, 'planks', ['up', 'left']), c2: cvr(185, 40, 26, 16, 'planks', ['up', 'right']), g1: cvr(262, -50, 24, 14, 'timber', ['up'], { z0: 46 }), g2: cvr(262, 52, 24, 14, 'timber', ['up'], { z0: 46 }), g3: cvr(262, 0, 24, 14, 'timber', ['up'], { z0: 46 }), ice: cvr(300, -70, 40, 18, 'steel', ['left', 'up']), s1: cvr(215, -14, 26, 15, 'crate', ['up', 'right']), s2: cvr(340, 38, 30, 16, 'crate', ['up', 'left']), gg: cvr(268, 20, 22, 14, 'timber', ['up'], { z0: 46 }) },
  waves: [W_at(.6, [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'g1'], ['deckhand', 'g2']]),
    W_after([['redtide', 'ice', { entry: 'roll', from: [330, -100, 0] }], ['deckhand', 's1']], { }),
    W_after([['marine', 's2', { entry: 'vault', from: [360, 90, 0] }], ['marine', 'c2', { entry: 'vault', from: [230, 90, 0] }], ['grenadier', 'gg']])],
  objs: [['tank', 225, -98, 0, { fall: 1, fallR: 90, hp: 3 }], ['tank', 230, 98, 0, { fall: 1, fallR: 90, hp: 3 }], ['intel', 150, 106, 18, { intelId: 'i1' }], ['lantern', 170, -60, 40], ['lantern', 170, 70, 40]],
  cues: [{ at: 0, say: ['rook', 'Market hall. Stay sharp.'] }, { on: 'rt', say: ['juno', 'Red uniform! That\'s Red Tide—they don\'t miss. Hit him first!'] }, { at: 14, fn: s => { s.flags.rt = 1; } }, { on: 'gr', say: ['juno', 'Grenade! Shoot it out of the air!'] }, { at: 24, fn: s => { s.flags.gr = 1; } }],
  sceneObjective: null
});
defScene('1-3', {
  title: 'CONTAINER YARD', time: 60, env: 'yard', from: [-170, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 460, -150, 150, 0, 'asphalt');
    const cols = ['corr_red', 'corr_blue', 'corr_ochre', 'corr_green'];
    [[130, -120, 0], [130, 112, 0], [230, -130, 1], [230, 128, 2], [340, -110, 3], [340, 118, 0]].forEach(([x, y, c], i) => { b.container(x, y, cols[c], 0); if (i % 2) b.container(x, y, cols[(c + 1) % 4], 0, 0, 0); b.container(x, y, cols[(c + 2) % 4], 0, 42, 42); });
    b.container(410, -60, 'corr_blue', 1); b.container(410, 60, 'corr_ochre', 1); b.raw(430, -150, 0, 440, 150, 90, 'corr_red', { solid: 1 });
    b.raw(260, -20, 100, 290, 20, 104, 'steel', {}); for (const y of [-40, 40]) b.raw(266, y - 2, 0, 270, y + 2, 100, 'steel', {}); // crane
    b.lamppost(100, -60, 60); b.lamppost(200, 60, 60); b.lamppost(300, -50, 60);
    b.box(180, -66, 22, 12, 12, 'steel', 0, { solid: 1 }); b.box(180, -66, 10, 10, 12, 'black', 12);
  },
  covers: { c1: cvr(150, -44, 26, 16, 'crate', ['up', 'left']), c2: cvr(175, 40, 26, 16, 'barrel', ['up', 'right']), c3: cvr(215, -6, 28, 16, 'crate', ['up']), f1: cvr(250, -62, 26, 15, 'steel', ['up', 'left']), f2: cvr(260, 56, 26, 15, 'steel', ['up', 'right']), m1: cvr(320, 40, 24, 14, 'crate', ['up', 'right']), m2: cvr(320, -34, 24, 14, 'crate', ['up', 'left']), c4: cvr(290, 5, 26, 15, 'barrel', ['up']), c5: cvr(345, 90, 26, 15, 'crate', ['up']) },
  waves: [W_at(.6, [['deckhand', 'c1', { entry: 'jump', from: [150, -44, 90] }], ['deckhand', 'c2', { entry: 'jump', from: [175, 40, 90] }], ['deckhand', 'c3', { entry: 'jump', from: [215, -6, 90] }], ['deckhand', 'f1'], ['deckhand', 'f2']]),
    { after: 'clear', boss: 'bulldog', spawn: [] },
    W_after([['grenadier', 'c4'], ['quartermaster', null, { route: [[420, 110, 0], [150, 110, 0]], drop: 'mg', speed: 55 }]])],
  civ: [{ at: 1, route: [[100, 100, 0], [260, 100, 0]], speed: 30 }],
  objs: [['barrel', 190, -90, 0], ['barrel', 196, -96, 0], ['intel', 300, -100, 40, { intelId: 'i2', hp: 1 }]],
  cues: [{ at: 0, say: ['juno', 'Containers everywhere. Watch the rooftops!'] }, { on: 'wk', say: ['worker', 'Don\'t shoot! I just work here!'] }, { at: 4, fn: s => { s.flags.wk = 1; } }]
});
// the Bulldog set piece is a wave with a boss field: handle it in the scene flow
Sim.prototype._waveBoss = function (w) { if (w.boss) { this.spawnBoss(w.boss); } };
defScene('1-4', {
  title: 'CANAL RUN', time: 60, env: 'canal', from: [-60, 0, 24], whip: .5, moving: { speed: 70, dist: 640 }, sway: [1.6, .006], looseView: 1, coverMat: 'hull_w', coverProp: { h: 15, mat: 'hull_w' },
  build(b) {
    b.floor(-200, 900, -26, 26, -14, 'sea'); b.raw(-200, -140, -80, 900, -26, 6, 'brick', { solid: 0 }); b.raw(-200, 26, -80, 900, 140, 6, 'brick', { solid: 0 });
    for (let x = 60; x < 880; x += 90) { b.lantern(x, -32, 14); b.lantern(x, 32, 14); b.post(x, -34, 28); b.post(x, 34, 28); }
    for (const x of [180, 420, 640]) { b.raw(x, -140, 40, x + 20, 140, 54, 'concrete', { solid: 0 }); b.raw(x, -140, 6, x + 20, -128, 40, 'brick'); b.raw(x, 128, 6, x + 20, 140, 40, 'brick'); b.lanternString(x - 2, -120, 120, 38); }
    b.raw(300, -140, 6, 340, -60, 30, 'planks', { solid: 0 }); b.raw(500, 60, 6, 540, 140, 30, 'planks', { solid: 0 });
    for (let x = 100; x < 800; x += 120) { b.stall(x, -70, 'awn_red'); b.stall(x + 40, 74, 'awn_blue'); }
    b.box(380, 60, 40, 24, 12, 'hull', -8, { solid: 1 }); b.box(560, -60, 40, 24, 12, 'hull', -8, { solid: 1 });
    b.box(740, 0, 40, 30, 10, 'hull_w', -12, { solid: 1 });
  },
  covers: { b1: cvr(250, -22, 24, 14, 'crate', ['up'], { z0: 4 }), b2: cvr(300, 22, 24, 14, 'crate', ['up'], { z0: 4 }), r1: cvr(210, -64, 30, 16, 'planks', ['up', 'left'], { z0: 6 }), r2: cvr(235, 60, 30, 16, 'planks', ['up', 'right'], { z0: 6 }), r3: cvr(360, -66, 30, 16, 'planks', ['up'], { z0: 6 }), r4: cvr(420, 66, 30, 16, 'planks', ['up'], { z0: 6 }), r5: cvr(520, -62, 30, 16, 'planks', ['up'], { z0: 6 }), r6: cvr(560, 62, 30, 16, 'planks', ['up', 'left'], { z0: 6 }), r7: cvr(680, 0, 30, 16, 'planks', ['up'], { z0: 6 }), m1: cvr(600, 20, 26, 14, 'crate', ['up'], { z0: 4 }) },
  waves: [W_at(.5, [['deckhand', 'r1'], ['deckhand', 'r2'], ['jetski', null, { route: [[420, 90, -10], [90, -70, -10]], dur: 4.2 }]]),
    { atD: 120, spawn: [['jetski', null, { route: [[560, -90, -10], [160, 30, -10]], dur: 4 }], ['jetski', null, { route: [[560, 90, -10], [160, -30, -10]], dur: 4.4 }], ['deckhand', 'r3'], ['deckhand', 'r4']] },
    { atD: 300, spawn: [['deckhand', 'r5'], ['deckhand', 'r6'], ['gunner', 'r7', { }], ['quartermaster', null, { route: [[720, 0, 0], [760, -30, 0]], drop: 'sg', speed: 20 }]] },
    { atD: 460, spawn: [['jetski', null, { route: [[760, -80, -10], [420, 40, -10]], dur: 3.6 }], ['jetski', null, { route: [[760, 80, -10], [420, -40, -10]], dur: 3.4 }], ['deckhand', 'm1']] }],
  objs: [['barrel', 520, 20, 0, { z: 2 }]],
  cues: [{ at: 0, say: ['mari', 'Grab something! We\'re taking the canals!'] }, { at: 4, say: ['juno', 'Jet skis, three o\'clock!'] }, { atD: 180, say: ['mari', 'Low bridge! Heads down!'] }, { atD: 380, say: ['rook', 'Fireworks barge. Happy festival.'] }]
});
defScene('1-B', {
  title: 'STINGRAY', time: 100, env: 'harborMouth', boss: 'stingray', from: [-120, 0, 24], whip: .6, sway: [1.2, .01], coverMat: 'hull_w', coverProp: { h: 15 }, looseView: 1,
  build(b) {
    b.floor(-100, 120, -40, 40, 0, 'hull_w'); b.raw(-100, -40, 0, 120, -34, 14, 'hull', { solid: 0 }); b.raw(-100, 34, 0, 120, 40, 14, 'hull', { solid: 0 });
    b.floor(215, 340, -96, 96, 10, 'hull'); b.raw(215, -96, 10, 340, -88, 24, 'hull_w', { solid: 0 }); b.raw(215, 88, 10, 340, 96, 24, 'hull_w', { solid: 0 });
    b.box(310, 0, 36, 70, 44, 'hull_w', 10, { solid: 0 }); b.box(291, 0, 4, 60, 8, 'window', 34, { glow: 1, edge: false }); b.box(310, 0, 20, 30, 18, 'steel', 54, { solid: 0 });
    for (const y of [-80, 80]) { b.box(286, y, 22, 22, 8, 'steel', 10, { solid: 0 }); }
    b.lamppost(230, -60, 50); b.lamppost(230, 60, 50);
  },
  slots: [{ at: [0, -20, 24] }, { at: [0, 20, 24] }],
  covers: { d1: cvr(238, -30, 20, 14, 'crate', ['up', 'left'], { z0: 10, w: 22 }), d2: cvr(244, 30, 20, 14, 'crate', ['up', 'right'], { z0: 10, w: 22 }), d3: cvr(246, -54, 20, 14, 'barrel', ['up', 'left'], { z0: 10, w: 20 }), d4: cvr(250, 54, 20, 14, 'crate', ['up', 'right'], { z0: 10, w: 20 }) },
  waves: [], cues: [{ at: -1, say: ['kai', 'Stingray dead ahead!'] }]
});
