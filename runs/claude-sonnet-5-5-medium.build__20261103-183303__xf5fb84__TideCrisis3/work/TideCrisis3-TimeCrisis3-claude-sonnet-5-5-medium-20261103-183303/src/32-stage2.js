// 32-stage2.js — STAGE 2: STORM SIGNAL (Gull's Rest and Lighthouse Point, 02:10, thunderstorm): 2-1…2-4 and the boss 2-B.
def('stage', 2, { name: 'STORM SIGNAL', place: 'Gull\'s Rest', clock: '02:10', music: 'storm', scenes: ['2-1', '2-2', '2-3', '2-4', '2-B'], intro: 'c2-intro', outro: 'c2-outro', brief: 'brief2' });
const house = (b, x, y, w, mat = 'plaster', h = 54) => { b.box(x, y, 36, w, h, mat, 0, { solid: 1 }); b.box(x, y, 42, w + 8, 10, 'slate', h, { solid: 1 }); b.box(x - 19, y, 2, 10, 14, 'glass', 18, { glow: 1, edge: false }); b.box(x - 19, y + w / 3, 2, 8, 12, 'glass', 34, { glow: 1, edge: false }); };
defScene('2-1', {
  title: 'GULL\'S REST', time: 50, env: 'storm', from: [-180, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 440, -130, 130, 0, 'cobble'); b.raw(-200, -130, -4, 440, -40, 0, 'cobble'); 
    house(b, 300, -84, 60); house(b, 300, 84, 60, 'timber'); house(b, 190, -118, 40, 'timber', 50); house(b, 190, 118, 40); house(b, 380, 0, 70, 'plaster', 70); 
    b.raw(150, -130, 0, 190, -118, 40, 'brick', { solid: 0 }); b.raw(150, 118, 0, 190, 130, 40, 'brick', { solid: 0 });
    b.lamppost(80, -100, 50); b.lamppost(80, 100, 50); b.lamppost(260, 0, 50);
    b.box(120, -80, 40, 24, 12, 'hull', 0, { solid: 1 }); b.box(130, 90, 40, 24, 12, 'hull', 0, { solid: 1 });
    for (const [bx, by] of [[268, -84], [268, 84], [344, -34]]) { b.box(bx + 4, by, 28, 34, 4, 'timber', 26, {}); b.post(bx - 6, by - 14, 26); b.post(bx - 6, by + 14, 26); }
  },
  covers: { cart: cvr(170, -40, 30, 17, 'planks', ['up', 'left']), well: cvr(195, 30, 20, 17, 'rock', ['up', 'right']), w1: cvr(262, -84, 20, 14, 'timber', ['up'], { z0: 30 }), w2: cvr(262, 84, 20, 14, 'timber', ['up'], { z0: 30 }), w3: cvr(350, -34, 20, 14, 'timber', ['up'], { z0: 30 }), c1: cvr(240, -10, 30, 17, 'crate', ['up', 'left']), c2: cvr(300, 36, 30, 17, 'crate', ['up', 'right']), al: cvr(330, 30, 24, 17, 'barrel', ['up']), bar: cvr(275, -25, 36, 18, 'planks', ['up', 'right']) },
  waves: [W_at(.6, [['deckhand', 'w1'], ['deckhand', 'w2'], ['deckhand', 'w3'], ['deckhand', 'cart']]),
    W_after([['rusher', null, { from: [380, -50, 0] }], ['rusher', null, { from: [390, 30, 0] }]]),
    W_after([['rusher', null, { from: [400, -10, 0] }], ['rusher', null, { from: [380, 60, 0] }], ['rusher', null, { from: [380, -70, 0] }]]),
    W_after([['quartermaster', null, { route: [[380, 100, 0], [380, -100, 0]], drop: 'sg', speed: 45 }], ['marine', 'bar'], ['marine', 'c2']])],
  civ: [{ at: 1, route: [[100, 60, 0], [300, 12, 0]], speed: 30 }],
  objs: [['window', 262, 84, 30], ['lantern', 230, -20, 40], ['lantern', 240, 40, 40], ['bottle', 300, 46, 17]],
  cues: [{ at: 0, say: ['rook', 'Gull\'s Rest. Rain, mud, and me being cold.'] }, { on: 'rush', say: ['juno', 'Blades! They\'re rushing you—duck behind cover!'] }, { at: 10, fn: s => { s.flags.rush = 1; } }, { on: 'qm', say: ['juno', 'Orange vest again. A shotgun this time!'] }, { at: 26, fn: s => { s.flags.qm = 1; } }]
});
defScene('2-2', {
  title: 'NET LOFTS', time: 55, env: 'loft', from: [-170, 0, 24], whip: -.7,
  build(b) {
    b.floor(-200, 420, -130, 130, 0, 'planks'); b.raw(-200, -130, 0, 420, -120, 110, 'timber', { solid: 1 }); b.raw(-200, 120, 0, 420, 130, 110, 'timber', { solid: 1 }); b.raw(-200, -130, 110, 420, 130, 120, 'timber', { solid: 1 });
    b.wall(400, -130, 130, 110, 'timber');
    for (let i = 0; i < 6; i++) { b.raw(120 + i * 40, -118, 20 + i * 4, 135 + i * 40, -60, 24 + i * 4, 'grate', { solid: 0 }); b.box(100 + i * 50, -40 + (i % 2) * 80, 2, 50, 30, 'tarp', 56, { edge: false }); }
    b.box(280, 0, 90, 220, 6, 'planks', 56, { solid: 1 });   // upper floor
    b.box(280, -112, 40, 14, 56, 'timber', 0); b.box(280, 112, 40, 14, 56, 'timber', 0);
    for (let y = -90; y <= 90; y += 45) b.lantern(200, y, 90);
    b.box(180, 100, 14, 14, 22, 'barrel', 0, { solid: 1 }); b.box(184, -100, 14, 14, 22, 'barrel', 0, { solid: 1 });
    b.box(398, 0, 2, 30, 56, 'black', 0, { edge: false });
  },
  covers: { c1: cvr(160, -36, 26, 16, 'crate', ['up', 'left']), c2: cvr(180, 34, 26, 16, 'barrel', ['up', 'right']), st: cvr(260, 0, 30, 17, 'crate', ['up', 'left', 'right']), u1: cvr(285, -60, 24, 14, 'timber', ['up'], { z0: 62 }), u2: cvr(285, 60, 24, 14, 'timber', ['up'], { z0: 62 }), u3: cvr(285, 0, 24, 14, 'timber', ['up'], { z0: 62 }), r1: cvr(300, -50, 24, 16, 'crate', ['up'], { z0: 0 }), r2: cvr(310, 10, 24, 16, 'crate', ['up'], { z0: 0 }), r3: cvr(300, 62, 24, 16, 'crate', ['up'], { z0: 0 }) },
  waves: [W_at(.6, [['shield', 'st', { from: [370, 0, 0], advance: [300, 250, 215] }], ['deckhand', 'c1'], ['deckhand', 'c2']]),
    W_after([['marine', 'r1', { entry: 'rappel', from: [300, -50, 100] }], ['marine', 'r2', { entry: 'rappel', from: [310, 10, 100] }], ['marine', 'r3', { entry: 'rappel', from: [300, 62, 100] }]]),
    W_after([['redtide', 'u1'], ['redtide', 'u2'], ['grenadier', 'u3']])],
  objs: [['barrel', 330, -90, 0], ['barrel', 330, 90, 0], ['intel', 200, -105, 20, { intelId: 'i3' }]],
  cues: [{ at: 0, say: ['kai', 'Nets and rope everywhere.'] }, { at: 3, say: ['juno', 'Shotgun! Knock that shield aside!'], prompt: 'shield' }]
});
defScene('2-3', {
  title: 'FUNICULAR', time: 60, env: 'cliff', from: [-70, 0, 26], whip: .4, moving: { speed: 16, dist: 220, hold: 1 }, lift: 1, sway: [1.1, .005], looseView: 1, coverMat: 'timber', coverProp: { h: 15, mat: 'timber' },
  build(b) {
    b.floor(-100, 420, -140, 140, -40, 'rock'); b.raw(-100, -140, -40, 420, -60, 300, 'rock', { solid: 0 }); b.raw(-100, 60, -40, 420, 140, 300, 'rock', { solid: 0 });
    for (let i = 0; i < 8; i++) { b.raw(100 + i * 24, -50, i * 28 - 10, 124 + i * 24, 50, i * 28 + 4, 'rock', { solid: 0 }); b.box(80 + i * 26, 0, 6, 6, 40, 'steel', i * 28 - 10, {}); }
    b.box(380, 0, 40, 100, 220, 'brick', 40, { solid: 0 }); b.box(396, 0, 20, 22, 120, 'white', 160, { solid: 0 });   // lighthouse
    b.box(396, 0, 30, 30, 8, 'steel', 280, { solid: 0 }); b.box(396, 0, 14, 14, 12, 'lamp', 288, { glow: 1, edge: false });
    for (let z = 0; z < 240; z += 40) { b.lantern(160, -70, z); b.lantern(160, 70, z + 10); }
  },
  covers: { t1: cvr(200, -60, 26, 16, 'timber', ['up'], { z0: 22 }), t2: cvr(210, 60, 26, 16, 'timber', ['up'], { z0: 40 }), t3: cvr(240, -20, 26, 16, 'timber', ['up'], { z0: 80 }), t4: cvr(250, 44, 26, 16, 'timber', ['up'], { z0: 110 }), cr1: cvr(180, -24, 24, 14, 'crate', ['up'], { z0: 24 }), cr2: cvr(180, 30, 24, 14, 'crate', ['up'], { z0: 24 }), cs1: cvr(220, -16, 24, 14, 'steel', ['up'], { z0: 140 }), cs2: cvr(220, 30, 24, 14, 'steel', ['up'], { z0: 140 }), cs3: cvr(220, 4, 24, 14, 'steel', ['up'], { z0: 140 }), p1: cvr(330, -30, 20, 12, 'brick', ['up'], { z0: 210, perch: 1 }), p2: cvr(330, 30, 20, 12, 'brick', ['up'], { z0: 220, perch: 1 }), p3: cvr(330, 0, 20, 12, 'brick', ['up'], { z0: 205, perch: 1 }) },
  waves: [W_at(.5, [['deckhand', 't1'], ['deckhand', 't2'], ['deckhand', 'cr1']]),
    { atD: 70, spawn: [['deckhand', 't3'], ['deckhand', 't4'], ['marine', 'cr2']] },
    { atD: 140, spawn: [['gunner', 'cs1'], ['gunner', 'cs2'], ['gunner', 'cs3'], ['quartermaster', null, { route: [[190, 0, 130], [190, 0, 130]], drop: 'mg', speed: 20, dur: 6 }]] },
    { atD: 210, spawn: [['gull', 'p1']] }],
  objs: [['lifering', 150, 70, 100]],
  cues: [{ at: 0, say: ['kai', 'Hold on tight.'] }, { atD: 150, say: ['juno', 'The other car! Three gunners — four seconds!'] }, { atD: 212, say: ['juno', 'The Gull! A sniper—watch for the laser!'], prompt: 'laser' }]
});
defScene('2-4', {
  title: 'LIGHTHOUSE KEEP', time: 60, env: 'lighthouse', from: [-170, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 440, -140, 140, 0, 'cobble'); b.raw(-200, -140, 0, 440, -132, 40, 'rock'); b.raw(-200, 132, 0, 440, 140, 40, 'rock');
    house(b, 300, -100, 70, 'plaster', 56); b.box(380, 0, 60, 60, 160, 'white', 0, { solid: 1 }); b.box(349, 0, 2, 18, 36, 'black', 0, { edge: false }); for (const by of [-80, 82]) { b.box(244, by, 28, 34, 4, 'timber', 26, {}); b.post(236, by - 14, 26); b.post(236, by + 14, 26); }
    b.box(300, 112, 40, 50, 44, 'timber', 0, { solid: 1 }); b.lamppost(100, 0, 50); b.lamppost(300, 100, 50);
    for (let i = 0; i < 10; i++) b.raw(380 + Math.cos(i * .628) * 36 - 6, Math.sin(i * .628) * 36 - 6, 160 + i * 14, 380 + Math.cos(i * .628) * 36 + 6, Math.sin(i * .628) * 36 + 6, 168 + i * 14, 'steel', {});
  },
  covers: { c1: cvr(170, -36, 26, 16, 'rock', ['up', 'left']), c2: cvr(185, 36, 26, 16, 'rock', ['up', 'right']), c3: cvr(250, 8, 28, 17, 'crate', ['up']), k1: cvr(300, -30, 24, 14, 'crate', ['up', 'left']), h1: cvr(330, 0, 12, 16, 'white', ['side'], { w: 18 }), w1: cvr(238, -80, 20, 14, 'timber', ['up'], { z0: 30 }), w2: cvr(238, 82, 20, 14, 'timber', ['up'], { z0: 24 }), s1: cvr(350, 48, 20, 14, 'timber', ['up'], { z0: 32 }), s2: cvr(350, -48, 20, 14, 'timber', ['up'], { z0: 32 }) },
  waves: [W_at(.5, [['marine', 'c1'], ['redtide', 'c2'], ['marine', 'c3']]),
    W_after([['captor', 'h1', { flag: 'free' }]], { fn: (S) => { S.spawnEnemy('hostage', null, { at: [346, 0, 0] }); S.say('captor', 'One more step and the old man swims!'); } }),
    W_after([['rusher', null, { from: [420, -60, 0] }], ['rusher', null, { from: [420, 40, 0] }], ['deckhand', 'w1'], ['deckhand', 'w2'], ['deckhand', 's1'], ['deckhand', 's2']])],
  objs: [['barrel', 140, 80, 0], ['barrel', 150, -86, 0]],
  cues: [{ at: 0, say: ['mari', 'My father is in there. Be careful!'] }, { on: 'free', say: ['tomas', 'Thank you, CREST! The override is in the control tower!'] }]
});
defScene('2-B', {
  title: 'HAMMERHEAD', time: 120, env: 'lighthouse', boss: 'hammerhead', from: [-60, 0, 24], whip: .5, looseView: 1, coverMat: 'rock', coverProp: { h: 15, mat: 'rock' },
  build(b) {
    b.floor(-120, 420, -110, 110, 0, 'steel'); b.raw(-120, -110, 0, 420, -104, 22, 'steel'); b.raw(-120, 104, 0, 420, 110, 22, 'steel');
    b.box(380, 0, 60, 50, 90, 'glass', 0, { glow: 1, solid: 0 }); b.box(380, 0, 80, 70, 8, 'steel', 90); b.box(380, 0, 8, 30, 70, 'lamp', 10, { glow: 1, edge: false });
    for (let i = 0; i < 8; i++) b.box(300 - i * 30, -104, 4, 4, 30, 'steel', 0);
    b.lamppost(80, -90, 50); b.lamppost(80, 90, 50);
  },
  slots: [{ at: [0, -22, 24] }, { at: [0, 22, 24] }], covers: {}, waves: [], cues: [{ at: -1, say: ['kai', 'That is one very large man.'] }]
});
