/* 33-stage3: STAGE 3, THE TIDEWALL (05:20 -> 06:00, dawn). The barrier's crest runs along +x at z 0 (y -60..60): the
 * sea high on the north, rising scene by scene; the city far below on the south. Crest Road (x 0..520), the Sluice
 * Locks (x 600..900), the Turbine Hall (x 980..1300), the control tower (centre 1520, 0; roof z 300) with its glass
 * lift on the west face and, on its roof, the helipad (Scylla) and the control room (Krake). */
const TW = { roof: 300, tx: 1520 };
/** the control room's consoles: a front row the four players duck behind (y -110, -88, -66, -48), and Krake's three */
const CONSOLES = [[1462, -110], [1462, -88], [1462, -66], [1462, -48], [1520, -96], [1556, -64], [1580, -100]];
TC.CONSOLES = CONSOLES;
def('stage', 3, {
  num: 3, name: 'THE TIDEWALL', place: 'Meridian Tidewall', clock: '05:20', music: 'tidewall', maxThreats: 2,
  env: { ambient: .44, skyK: .08, sun: { dir: [.7, .25, .35], k: .5 }, fog: ['#8a7a8f', 520, 2500], warm: '#ffb04a', water: { z: -30 }, ambience: 'sluice', actorK: 1.05,
    sky: { colors: ['#1f1a3a', '#6a3f6f', '#f29e6b'], glow: '#ffb070', below: '#3a3048', moon: { dir: [.95, .1, .06], r: 4, color: '#ffe0a0' }, clouds: '#c87a7a', cloudK: .5, layers: [{ kind: 'city', color: '#241a30', lit: '#ffb860', height: .03, seed: 33, from: .3, span: 2.6 }, { kind: 'hills', color: '#3a2a44', height: .045, seed: 7 }] } },
  carriers: {
    tram: { path: [[-260, 0, 0], [-60, 0, 0], [20, 0, 0]], speed: 90 },
    lift: { path: [[1436, 0, 6], [1436, 0, 7], [1436, 0, 286]], speed: 24, fixedYaw: 270, mesh: 'lift' }
  },
  objectives: ['Clear the crest road', 'Jam the four gate locks', 'Cross the turbine hall', 'Ride the tower lift', 'Stop Krake at the master lever'],
  briefing: [['hale', 'This is it, agents. Jam the gates, reach the tower, stop Krake.'], ['juno', "And maybe don't fall in. The water's rising."], ['tejada', 'The gate locks glow amber. Four of them. Hit them hard.']],
  setup(sim) { sim.waterRise = 0; },
  build(G) {
    KIT.sea(G, 'sea-dawn', -1200, -2400, 2600, -60, -30);
    // the barrier: the crest road (z 0), its sea face and its long drop to the city
    G.box('concrete', -300, -60, -200, 1700, 60, 0, { top: 'asphalt', solid: true, maxEdge: 64 });
    G.box('concrete-dk', -300, -64, 0, 1700, -60, 12, { solid: true }); G.box('concrete-dk', -300, 60, 0, 600, 64, 12, { solid: true }); G.box('concrete-dk', 1300, 60, 0, 1700, 64, 12, { solid: true });
    G.box('concrete-dk', -300, 64, -400, 1700, 900, -260, { solid: false, maxEdge: 300 });
    KIT.skyline(G, -400, 1100, 1900, 1100, 41, 30, 120, 'city-windows');
    for (let x = -280; x < 1700; x += 120) G.box('hazard', x, -59, 0, x + 60, -57, 2, { solid: false });
    for (let x = -200; x < 1700; x += 160) KIT.lamp(G, x, 54, 0, 'glow-amber', 46, .5);
    // the tram rails
    G.box('steel-dk', -300, -6, 0, 1400, -4, 1.5, { solid: false }); G.box('steel-dk', -300, 4, 0, 1400, 6, 1.5, { solid: false });
    // ---- 3-1 Crest Road ----
    G.box('concrete', 70, -44, 0, 86, -14, 18, { top: 'hazard', cover: true }); G.box('concrete', 70, 14, 0, 86, 44, 18, { top: 'hazard', cover: true });   // the players' jersey barriers
    G.box('panel-steel', 180, -60, 0, 230, -24, 54, { top: 'steel-dk' }); G.box('panel-steel', 330, 24, 0, 380, 60, 54, { top: 'steel-dk' });               // gate-machinery houses
    for (const x of [270, 470]) { G.box('paint-yellow', x, -62, 0, x + 6, -56, 70); G.box('paint-yellow', x, 56, 0, x + 6, 62, 70); G.box('grate', x - 6, -62, 66, x + 12, 62, 70, { side: 'paint-yellow' }); KIT.rail(G, [x + 12, -62, 70], [x + 12, 62, 70], 12, 'paint-yellow'); }
    KIT.crates(G, 300, -20, 0, 1, 2, 1, 15); KIT.sandbags(G, 440, 40, 0, 30, Math.PI / 2, 4);
    // ---- 3-2 the Sluice Locks: the channel, catwalks, the giant gate ----
    G.box('concrete-dk', 600, -400, -110, 900, -60, -100, { solid: false }); G.quad('sluice', [600, -400, -96], [900, -400, -96], [900, 400, -96], [600, 400, -96], { maxEdge: 100 });
    KIT.catwalk(G, 600, -60, 900, -40, 0); KIT.catwalk(G, 600, 40, 900, 60, 0); KIT.catwalk(G, 660, -40, 680, 40, 0, false); KIT.catwalk(G, 760, -40, 780, 40, 0, false);
    G.box('grate', 600, -40, -2, 900, 40, 0, { side: 'steel-dk' });
    G.box('panel-dark', 860, -110, -110, 880, 110, 120, { top: 'hazard' });   // the gate
    for (const y of [-80, 80]) G.box('concrete-dk', 850, y - 30, -110, 890, y + 30, 140, { top: 'concrete' });
    KIT.catwalk(G, 760, -100, 850, -80, 60); KIT.catwalk(G, 760, 80, 850, 100, 60);
    G.box('panel-steel', 640, -36, 0, 652, -10, 18, { cover: true }); G.box('panel-steel', 640, 12, 0, 652, 38, 18, { cover: true });   // the players' control boxes
    G.box('panel-steel', 724, -30, 0, 740, -6, 20, { cover: true }); G.box('panel-steel', 800, 10, 0, 816, 34, 20, { cover: true });
    // ---- 3-3 the Turbine Hall (x 980..1300, y -130..130, roof z 130) ----
    G.box('concrete-dk', 976, -134, 0, 980, -20, 130, { skip: 'b' }); G.box('concrete-dk', 976, 20, 0, 980, 134, 130, { skip: 'b' }); G.box('concrete-dk', 976, -20, 50, 980, 20, 130, { skip: 'b' });
    G.box('concrete-dk', 976, -134, 0, 1304, -130, 130, { skip: 'b' }); G.box('concrete-dk', 976, 130, 0, 1304, 134, 130, { skip: 'b' }); G.box('concrete-dk', 1300, -130, 0, 1304, 130, 130, { skip: 'b' });
    G.box('panel-dark', 976, -134, 130, 1304, 134, 136, { solid: false });
    G.box('concrete', 980, -130, -2, 1300, 130, 0, { solid: false });
    for (const [x, y] of [[1100, -60], [1200, 60]]) { G.cyl('steel-dk', x, y, 0, 36, 4, { seg: 16, solid: false }); G.cyl('panel-steel', x, y, 0, 14, 24, { seg: 10, solid: true }); }
    KIT.catwalk(G, 1000, -130, 1300, -104, 56); KIT.catwalk(G, 1000, 104, 1300, 130, 56); KIT.catwalk(G, 1270, -104, 1300, 104, 56);
    G.box('panel-steel', 1010, -40, 0, 1024, -12, 18, { cover: true }); G.box('panel-steel', 1010, 14, 0, 1024, 42, 18, { cover: true });
    G.box('glow-teal', 1299, -60, 60, 1300, 60, 100, { solid: false }); G.box('panel-dark', 1150, -20, 0, 1170, 20, 22, { cover: true }); G.box('panel-dark', 1230, -40, 0, 1246, -10, 20, { cover: true });
    for (const [x, y] of [[1050, 0], [1150, 0], [1250, 0]]) G.light(x, y, 110, 160, .55);
    // ---- 3-4 and 3-B: the control tower, its roof, the control room ----
    G.box('concrete', TW.tx - 60, -60, 0, TW.tx + 60, 60, TW.roof, { top: 'concrete', solid: true });
    KIT.windowsX(G, TW.tx - 60, -60, 60, 20, 7, 'tower-windows');
    G.box('steel-dk', 1458, -26, 0, 1460, 26, TW.roof, { solid: false });   // the lift rails
    G.box('concrete', 1400, -120, TW.roof - 10, 1640, 120, TW.roof, { solid: true });
    G.box('concrete-dk', 1400, -120, TW.roof, 1404, 120, TW.roof + 16, { cover: true }); G.box('concrete-dk', 1636, -120, TW.roof, 1640, 120, TW.roof + 16); G.box('concrete-dk', 1400, 116, TW.roof, 1640, 120, TW.roof + 16);
    G.box('concrete-dk', 1428, 20, TW.roof, 1436, 50, TW.roof + 17, { cover: true }); G.box('concrete-dk', 1428, 70, TW.roof, 1436, 100, TW.roof + 17, { cover: true });   // the parapet blocks (phase 1 cover)
    G.cyl('hazard', 1550, 60, TW.roof, 44, .5, { seg: 16, solid: false }); G.cyl('asphalt', 1550, 60, TW.roof + .5, 38, .5, { seg: 16, solid: false });
    // the control room: glass walls, consoles
    G.box('glass', 1440, -120, TW.roof, 1600, -118, TW.roof + 40, { solid: false }); G.box('glass', 1440, -42, TW.roof, 1600, -40, TW.roof + 40, { solid: false }); G.box('panel-dark', 1440, -120, TW.roof + 40, 1600, -40, TW.roof + 44, { solid: false });
    G.box('glass', 1598, -120, TW.roof, 1600, -40, TW.roof + 40, { solid: false });
    for (const [x, y] of CONSOLES) G.box('panel-dark', x - 7, y - 8, TW.roof, x + 7, y + 8, TW.roof + 16, { top: 'glow-teal', cover: true });
    G.box('panel-steel', 1610, -110, TW.roof, 1630, -90, TW.roof + 50, { solid: false });   // the antenna mast base
    G.cyl('steel', 1620, -100, TW.roof + 50, 1.5, 60, { seg: 5 }); G.box('glow-red', 1618, -102, TW.roof + 110, 1622, -98, TW.roof + 114, { solid: false });
  },
  lights(R3, sim, t) { if (sim.scene && sim.scene.id === '3-3') for (const [x, y] of [[1100, -60], [1200, 60]]) R3.addLight(x, y, 30, 60, .3 + .2 * Math.sin(t * 9)); },
  draw(R, sim, t) {
    const sc = sim.scene && sim.scene.id;
    // the turbines turn; steam vents puff
    for (const [x, y, k] of [[1100, -60, 1], [1200, 60, -1]]) R.mesh('turbine', mat34(x, y, 26, t * 2.4 * k), {});
    if (sc === '3-3' && R.fx.r() < .25) for (const [x, y] of [[1040, -120], [1260, 120], [1150, -120]]) R.fx.smoke([x, y, 4], 1, [230, 236, 240], 6);
    if (sc === '3-2' || sc === '3-1') { if (R.fx.r() < .4) R.fx.add({ pos: [600 + R.fx.r() * 300, -60 - R.fx.r() * 20, -90], vel: [0, 60, 40], g: 120, life: .8, size: 4, mode: 2, color: [230, 245, 250] }); }
    // the master lever
    const B = sim.boss; R.mesh('lever', mat34(1592, -80, TW.roof, 0, 0, B && B.lever ? -B.lever * .9 : 0), { glow: B && B.finalT > 0 ? .5 : 0 });
    // the tram at the start
    const C = sim.carriers.tram; if (C && C.M && (sc === '3-1' || sim.cut)) R.mesh('funicular', C.M, {});
  },
  scenes: ['3-1', '3-2', '3-3', '3-4', '3-B'], intro: 'c3-intro', outro: 'c3-outro'
});

def('scene', '3-1', { title: 'CREST ROAD', time: 90,
  arrive: { start: [-240, 0, 24], path: [[-120, 0, 24], [0, -6, 24]], speed: 120 },
  slots: [
    { stand: { at: [56, -28, 24], look: [400, -24, 30] }, cover: { at: [60, -30, 12], look: [400, -70, 6] } },
    { stand: { at: [56, 28, 24], look: [400, 24, 30] }, cover: { at: [60, 30, 12], look: [400, 70, 6] } }],
  covers: { g1: { at: [276, -40, 70], h: 12, ledge: true, floor: 0 }, g2: { at: [476, 30, 70], h: 12, ledge: true, floor: 0 }, h1: { at: [238, -30, 0], h: 54, peek: ['left'] }, h2: { at: [322, 40, 0], h: 54, peek: ['left', 'up'] },
    b1: { at: [472, -16, 0], h: 22 }, b2: { at: [472, 16, 0], h: 22 } },
  waves: [
    { at: .5, spawn: [['drone', null, { from: [300, -40, 60], orbit: 80 }], ['drone', null, { from: [320, 40, 70], orbit: 70, delay: .3 }], ['drone', null, { from: [260, 0, 80], orbit: 90, delay: .6 }], ['drone', null, { from: [360, -20, 50], orbit: 60, delay: .9 }]], cue: 'drones' },
    { after: 'clear', spawn: [['rocketeer', 'g1'], ['rocketeer', 'g2', { delay: .8 }], ['deckhand', 'h1'], ['deckhand', 'h2']], cue: 'rockets' },
    { after: 'clear', spawn: [['quartermaster', null, { route: [[400, -58, 0], [400, 58, 0]], drop: 'gl', amount: 2 }], ['marine', 'b1'], ['shield', 'b2'], ['marine', 'h2', { delay: .5 }]], cue: 'barricade' }],
  objects: [['barricade', [460, 0, 0], { yaw: Math.PI / 2 }], ['barrel', [250, 30, 0]], ['lifering', [150, 58, 22], { yaw: Math.PI / 2 }]],
  cues: [{ at: 0, say: ['tejada', 'The gate locks are past the turbine hall. Hurry!'] }, { on: 'drones', say: ['juno', 'Drones! Use the machine gun!'] }, { on: 'rockets', say: ['juno', 'Rocket! Shoot it down!'] }, { on: 'barricade', say: ['rook', 'Grenade launcher. My kind of party.'] }]
});

def('scene', '3-2', { title: 'SLUICE LOCKS', time: 90,
  arrive: { path: [[280, 0, 24], [480, 0, 24], [600, -6, 24]], speed: 150 },
  slots: [
    { stand: { at: [626, -24, 24], look: [880, -20, 40] }, cover: { at: [630, -26, 12], look: [880, -70, 10] } },
    { stand: { at: [626, 26, 24], look: [880, 20, 40] }, cover: { at: [630, 28, 12], look: [880, 70, 10] } }],
  covers: { k1: { at: [748, -20, 0], h: 20 }, k2: { at: [824, 22, 0], h: 20, peek: ['up', 'left'] }, k3: { at: [700, -50, 0], h: 14, ledge: true, floor: -96 }, k4: { at: [700, 50, 0], h: 14, ledge: true, floor: -96 },
    u1: { at: [800, -90, 60], h: 14, ledge: true, floor: -96 }, u2: { at: [800, 90, 60], h: 14, ledge: true, floor: -96 }, r1: { at: [720, 0, 0], h: 1, noRelocate: true }, r2: { at: [790, -10, 0], h: 1, noRelocate: true } },
  waves: [
    { at: .5, spawn: [['deckhand', 'k1'], ['deckhand', 'k2', { delay: .5 }], ['marine', 'u1', { delay: 1.5 }]], say: ['tejada', 'Jam the gate locks! Four of them: the glowing clamps!'], cue: 'locks' },
    { at: 8, do: sim => spawnBoss(sim, 'seawolf'), say: ['juno', "Gunship inbound! It's the Seawolf!"] },
    { on: 'seawolf-drop', spawn: [['marine', 'r1', { entry: 'rappel', ropeH: 120 }], ['deckhand', 'r2', { entry: 'rappel', ropeH: 120, delay: .5 }]] },
    { on: 'seawolf-down', delay: 2, spawn: [['redtide', 'u2'], ['drone', null, { from: [760, 0, 60], orbit: 40 }]] }],
  objects: [['lock', [858, -40, 20], { onBreak: 'lock' }], ['lock', [858, 40, 20], { onBreak: 'lock' }], ['lock', [858, -40, 74], { onBreak: 'lock' }], ['lock', [858, 40, 74], { onBreak: 'lock' }], ['barrel', [770, -50, 0]]],
  objective: sim => sim.objects.filter(o => o.kind === 'lock' && o.scene === '3-2').every(o => !o.alive),
  cues: [{ on: 'locks', prompt: 'locks' }, { on: 'lock', repeat: true, do: sim => { const left = sim.objects.filter(o => o.kind === 'lock' && o.alive).length; sim.ev({ type: 'locks', left }); if (left === 0) sim.say('tejada', 'Gate jammed! Hurry to the tower!'); else sim.say('juno', left + ' lock' + (left > 1 ? 's' : '') + ' to go!'); } }],
  tick: (sim, dt) => { sim.waterRise = Math.min(6, (sim.waterRise || 0) + dt * .02); }
});

def('scene', '3-3', { title: 'TURBINE HALL', time: 85,
  arrive: { path: [[700, 0, 24], [900, 0, 24], [990, 0, 24]], speed: 150, walk: true },
  slots: [
    { stand: { at: [998, -28, 24], look: [1280, -20, 40] }, cover: { at: [1002, -28, 12], look: [1280, -70, 10] } },
    { stand: { at: [998, 30, 24], look: [1280, 20, 40] }, cover: { at: [1002, 30, 12], look: [1280, 70, 10] } }],
  covers: { c1: { at: [1176, 0, 0], h: 22 }, c2: { at: [1254, -26, 0], h: 20, peek: ['up', 'right'] }, w1: { at: [1150, -112, 56], h: 14, ledge: true, floor: 0 }, w2: { at: [1220, 112, 56], h: 14, ledge: true, floor: 0 }, w3: { at: [1282, 0, 56], h: 14, ledge: true, floor: 0 },
    t1: { at: [1100, -30, 0], h: 24 }, t2: { at: [1200, 30, 0], h: 24, peek: ['left', 'right'] } },
  waves: [
    { at: .5, spawn: [['marine', 'w1'], ['redtide', 'w2', { delay: .6 }], ['marine', 'c1']] },
    { after: 'clear', spawn: [['shield', null, { from: [1290, -60, 0], entry: 'run', advance: [[1200, -40, 0], [1120, -30, 0]] }], ['shield', null, { from: [1290, 60, 0], entry: 'run', advance: [[1210, 50, 0], [1130, 40, 0]], delay: .8 }], ['rusher', null, { from: [1290, 0, 0], delay: 1.5 }], ['rusher', null, { from: [1290, 30, 0], delay: 2.5 }]] },
    { after: 'clear', spawn: [['grenadier', 'w3'], ['rocketeer', 'c2', { delay: .5 }], ['deckhand', 't1', { delay: 1 }]] }],
  objects: [['tank', [1260, -110, 0]], ['tank', [1260, 110, 0]], ['tank', [1100, 110, 0]], ['intel', [1290, 90, 56], { n: 4 }], ['intel', [1040, -120, 18], { n: 5 }]],
  allies: [{ who: 'rook', at: [1010, 110, 56], facing: 0, every: 3.5 }],
  cues: [{ at: 0, say: ['rook', 'Turbine hall. Mind the fans.'] }, { at: 4, say: ['juno', 'Coolant tanks: stay clear. Unless the bad guys are closer.'] }],
  onEnter: sim => { sim.waterRise = Math.max(sim.waterRise || 0, 7.5); }
});

def('scene', '3-4', { title: 'TOWER LIFT', time: 95, carrier: 'lift', carrierHold: 270, holds: [[60, 'w0'], [120, 'w1']],
  arrive: { path: [[1120, 0, 24], [1320, 0, 24], [1420, 0, 30]], speed: 150 },
  slots: [
    { stand: { at: [-12, 8, 24], yaw: 0, pitch: 8 }, cover: { at: [-8, 8, 11], yaw: 0, pitch: 0 } },
    { stand: { at: [-12, -8, 24], yaw: 0, pitch: 8 }, cover: { at: [-8, -8, 11], yaw: 0, pitch: 0 } }],
  covers: {},
  waves: [
    { atD: 10, spawn: [['drone', null, { from: [1340, -40, 80], orbit: 50, follow: 'lift', local: [90, -40, 30] }], ['drone', null, { from: [1340, 40, 110], orbit: 50, follow: 'lift', local: [100, 40, 50], delay: .5 }], ['drone', null, { from: [1320, 0, 140], orbit: 60, follow: 'lift', local: [120, 0, 70], delay: 1 }]] },
    { atD: 70, spawn: [['deckhand', null, { entry: 'rappel', carrier: 'lift', local: [30, -12, 3], ropeH: 70 }], ['marine', null, { entry: 'rappel', carrier: 'lift', local: [30, 12, 3], ropeH: 70, delay: .8 }]] },
    { atD: 130, do: sim => spawnBoss(sim, 'seawolf2'), say: ['juno', "Seawolf's back! Hit the weapon pods!"] }],
  objects: [['lifering', [1440, 0, 230], { yaw: 0 }]],
  cues: [{ at: 0, say: ['kai', 'Going up.'] }, { on: 'seawolf2-down', say: ['rook', 'Scratch one gunship.'] }],
  onEnter: sim => { sim.waterRise = Math.max(sim.waterRise || 0, 9); },
});

def('scene', '3-B', { title: 'THE KING TIDE', time: 90, boss: 'scylla',
  arrive: { path: [[1452, 0, 300], [1420, 30, 320], [1410, 40, TW.roof + 24]], speed: 80 },
  slots: [
    { stand: { at: [1410, 34, TW.roof + 24], look: [1560, 50, TW.roof + 30] }, cover: { at: [1406, 36, TW.roof + 12], look: [1560, 20, TW.roof + 10] } },
    { stand: { at: [1410, 84, TW.roof + 24], look: [1560, 70, TW.roof + 30] }, cover: { at: [1406, 86, TW.roof + 12], look: [1560, 110, TW.roof + 10] } }],
  alt: [-88, -66, -110, -48].map((y, k) => ({ stand: { at: [1448, y, TW.roof + 24], look: [1600, [-84, -64, -96, -60][k], TW.roof + 24] }, cover: { at: [1452, y, TW.roof + 12], look: [1600, y + (k % 2 ? 18 : -22), TW.roof + 8] } })),
  covers: { d1: { at: [1590, -56, TW.roof], h: 40, peek: ['left'], noRelocate: true }, d2: { at: [1590, -104, TW.roof], h: 40, peek: ['right'], noRelocate: true }, k1: { at: [1528, -96, TW.roof], h: 16 }, k2: { at: [1564, -64, TW.roof], h: 16 } },
  waves: [],
  cues: [{ at: 0, say: ['krake', 'You climbed my tower. Admirable. Now meet my Scylla.'] }],
  onEnter: sim => { sim.waterRise = Math.max(sim.waterRise || 0, 10); }
});
