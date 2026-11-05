/* 31-stage1: STAGE 1, HARBOR LIGHTS (Port Lumen Docks, 23:40, the Lantern Festival). Geometry along +x: Lantern Pier
 * (x -320..340), the quay, the Fish Market hall (x 600..880), the Container Yard (x 900..1420), the Silver Canals (the
 * boat, x 1450..2750), the harbor mouth (the Stingray, x 2800..). Scenes 1-1 .. 1-4 and the boss 1-B. */
def('stage', 1, {
  num: 1, name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', maxThreats: 1,
  env: { ambient: .3, skyK: .05, sun: { dir: [-.35, .45, .82], k: .32 }, fog: ['#1a2242', 420, 2100], warm: '#ffb347', water: { z: -24 },
    sky: { colors: ['#0b1026', '#1b2a52', '#3a3060'], glow: '#b8448a', below: '#0e1630', stars: true, moon: { dir: [.55, -.6, .42], r: 2.6 }, clouds: '#26345e', cloudK: .45,
      layers: [{ kind: 'city', color: '#0c1230', lit: '#ffd88a', height: .075, seed: 3 }, { kind: 'hills', color: '#141a3a', height: .05, seed: 9 }] }, fireworks: true, actorK: 1.2 },
  carriers: {
    boat: { path: [[1440, 0, -18], [1700, -10, -18], [1950, 15, -18], [2200, 0, -18], [2450, -12, -18], [2700, 0, -18], [2780, 0, -18]], speed: 105, mesh: 'speedboat' },
    boat2: { path: [[2900, -40, -18], [3300, -40, -18], [3800, -40, -18], [4400, -40, -18], [5200, -40, -18]], speed: 55, mesh: 'speedboat' }
  },
  build(G) {
    // the sea, the far city
    KIT.sea(G, 'sea-night', -1600, -1800, 6200, 1800, -24);
    KIT.skyline(G, -900, -1500, 5600, -1500, 11, 80, 220);
    KIT.skyline(G, 5600, 1500, -900, 1500, 12, 60, 180);
    // ---- 1-1 Lantern Pier ----
    KIT.pier(G, -340, -60, 340, 60, 0);
    KIT.crates(G, 20, -34, 0, 2, 1, 1, 14); KIT.crate(G, 20, -34, 13, 12);              // P1's fish crates
    KIT.barrel(G, 18, 34); KIT.barrel(G, 30, 30); KIT.bollard(G, 24, 46);                 // P2's barrels and bollard
    KIT.stall(G, 170, -38, 0, 0, 'awning-red'); KIT.stall(G, 175, 34, 0, 0, 'awning-blue'); KIT.stall(G, 90, -44, 0, 0, 'awning-green');
    KIT.crates(G, 236, 0, 0, 2, 1, 2, 15);
    KIT.barrel(G, 258, 40); KIT.barrel(G, 258, 52); KIT.crate(G, 316, 50, 0, 16); KIT.bollard(G, 300, 38);
    for (let x = -300; x <= 300; x += 75) { KIT.lamp(G, x, -58, 0, 'glow-amber', 40, .55); }
    KIT.lights(G, [-200, -58, 38], [-80, 58, 38], 14); KIT.lights(G, [-60, -58, 38], [60, 58, 38], 14); KIT.lights(G, [80, -58, 38], [200, 58, 38], 14); KIT.lights(G, [220, -58, 38], [330, 58, 38], 12);
    KIT.fishingBoat(G, 250, 100, -14, 0); KIT.fishingBoat(G, -160, -105, -14, Math.PI);
    // the quay and its warehouses
    KIT.ground(G, 340, -420, 620, 420, 0, 'concrete', 'stone');
    KIT.building(G, 420, -380, 560, -70, 84, { mat: 'brick', roof: 'slate' }); KIT.windowsX(G, 420, -380, -70, 20, 2);
    KIT.building(G, 420, 70, 560, 380, 84, { mat: 'brick-dk', roof: 'slate' }); KIT.windowsX(G, 420, 70, 380, 20, 2);
    KIT.crates(G, 346, -10, 0, 2, 1, 2, 14); KIT.lamp(G, 360, -66, 0); KIT.lamp(G, 360, 66, 0);
    G.box('sign', 421, -280, 52, 423, -150, 70, { solid: false });
    // ---- 1-2 the Fish Market hall (x 600..880, y -160..160) ----
    G.box('floortile', 600, -160, -2, 880, 160, 0, { solid: false });
    G.box('brick', 596, -164, 0, 600, 160, 100, { solid: true, skip: 'b' }); G.box('brick', 596, -164, 0, 884, -160, 100, { skip: 'b' }); G.box('brick', 596, 160, 0, 884, 164, 100, { skip: 'b' }); G.box('brick', 880, -160, 0, 884, 160, 100, { skip: 'b' });
    G.box('timber', 596, -164, 100, 884, 164, 104, { bottom: 'timber', solid: false });
    for (let x = 640; x <= 860; x += 55) G.box('timber', x - 2, -160, 92, x + 2, 160, 100, { solid: false });
    // the door gap: west wall opening at y -16..16 is drawn as a dark doorway (we enter through it)
    G.box('timber', 594, -18, 0, 597, 18, 34, { solid: false });
    // the gallery (east and north), its balustrade
    G.box('planks', 820, -160, 40, 880, 160, 44, { bottom: 'pier-dk' }); G.box('oak', 818, -160, 44, 822, 160, 60, { cover: true });
    for (let y = -150; y <= 150; y += 50) G.cyl('oak', 822, y, 0, 2.5, 40, { seg: 6 });
    G.stairs('planks', 760, -150, 0, 820, -150, 44, 16, 8);
    // stalls, the ice table, crates
    G.box('planks', 656, -42, 0, 672, -8, 20, { top: 'ice', cover: true });           // P1's fish counter
    KIT.crates(G, 664, 28, 0, 1, 2, 2, 14);                                                // P2's crates
    KIT.stall(G, 722, -60, 0, 0, 'awning-red'); KIT.stall(G, 722, 50, 0, 0, 'awning-green');
    G.box('steel', 752, -22, 0, 768, 14, 18, { top: 'ice' });
    KIT.crates(G, 726, -100, 0, 2, 1, 2, 14); KIT.crates(G, 726, 100, 0, 2, 1, 2, 14);
    G.box('planks', 600, -160, 26, 760, -154, 28, { solid: false });                       // a shelf (the intel bottle)
    for (const [x, y] of [[680, -60], [680, 60], [760, 0], [840, -100], [840, 100]]) G.light(x, y, 70, 120, .28);
    // ---- 1-3 the Container Yard (x 900..1420) ----
    KIT.ground(G, 884, -420, 1430, 420, 0, 'asphalt', 'stone');
    G.box('crate', 956, -50, 0, 972, -24, 18, { cover: true }); G.box('steel-dk', 958, -48, 18, 970, -26, 22);   // P1's forklift-crate
    KIT.barrel(G, 962, 26); KIT.barrel(G, 962, 40);
    for (const [y, m] of [[-130, 'corr-red'], [130, 'corr-blue']]) { KIT.container(G, 1089, y, 0, 0, m); KIT.container(G, 1187, y, 0, 0, m === 'corr-red' ? 'corr-green' : 'corr-ochre'); KIT.container(G, 1089, y, 42, 0, 'corr-ochre'); KIT.container(G, 1187, y, 42, 0, 'corr-grey'); }
    KIT.crates(G, 1086, -70, 0, 2, 1, 2, 14); KIT.crates(G, 1086, 80, 0, 2, 1, 2, 14);
    G.box('paint-yellow', 1128, 0, 0, 1144, 24, 16, { cover: true }); G.box('steel-dk', 1128, 0, 16, 1144, 6, 30);     // forklifts
    G.box('paint-yellow', 1160, -52, 0, 1176, -28, 16, { cover: true }); G.box('paint-yellow', 1160, 48, 0, 1176, 72, 16, { cover: true });
    KIT.container(G, 1290, -110, 0, Math.PI / 2, 'corr-white'); KIT.container(G, 1290, 110, 0, Math.PI / 2, 'corr-red'); KIT.container(G, 1290, -110, 42, Math.PI / 2, 'corr-blue');
    // the gantry crane
    for (const y of [-200, 200]) { G.box('paint-yellow', 1340, y - 6, 0, 1352, y + 6, 160); G.box('paint-yellow', 1400, y - 6, 0, 1412, y + 6, 160); }
    G.box('paint-yellow', 1336, -206, 160, 1416, 206, 172, { solid: false }); G.box('steel-dk', 1360, -20, 120, 1392, 20, 160, { solid: false });
    for (const [x, y] of [[1000, -200], [1000, 200], [1240, -200], [1240, 200]]) KIT.lamp(G, x, y, 0, 'glow-amber', 70, .7);
    // ---- 1-4 the Silver Canals (x 1440..2750): quays, houses, bridges, side canals ----
    for (const s of [-1, 1]) {
      for (let x = 1430; x < 2760; x += 220) {
        const gap = (s < 0 && x >= 1540 && x < 1760) || (s > 0 && x >= 1980 && x < 2200);
        if (gap) continue;
        KIT.ground(G, x, s < 0 ? -320 : 72, x + 220, s < 0 ? -72 : 320, 0, 'cobble', 'stone', 40);
        for (let hx = x + 10; hx < x + 210; hx += 52) KIT.house(G, hx, s < 0 ? -230 : 120, hx + 44, s < 0 ? -120 : 230, 60 + ((hx * 7) % 40), { mat: ['plaster', 'plaster-blue', 'plaster-ochre'][((hx / 52) | 0) % 3], roof: 'rooftile', lit: true });
        KIT.lamp(G, x + 110, s * 80, 0, 'paper-lantern', 30, .6);
      }
    }
    KIT.lights(G, [1600, -72, 40], [1600, 72, 40], 12); KIT.lights(G, [2000, -72, 40], [2000, 72, 40], 12); KIT.lights(G, [2350, -72, 40], [2350, 72, 40], 12);
    KIT.bridge(G, 1800, -80, 80, 30, 34); KIT.bridge(G, 2200, -80, 80, 30, 34); KIT.bridge(G, 2560, -80, 80, 14, 26, 'brick');
    G.box('pier-dk', 2360, 30, -24, 2420, 62, -16, { top: 'pier' });                       // the fireworks barge
    G.box('hull-dark', 2420, -60, -24, 2490, -34, -14, { top: 'pier' });                    // the moored gunboat
    // ---- 1-B the harbor mouth: breakwater, a lighthouse light far off ----
    G.box('rock', 2900, 360, -30, 5200, 420, 10, { solid: false, maxEdge: 200 }); G.box('rock', 2900, -520, -30, 5200, -460, 10, { solid: false, maxEdge: 200 });
    for (let x = 3000; x < 5200; x += 400) { G.box('glow-red', x, 356, 10, x + 6, 362, 18, { solid: false }); G.box('glow-green', x, -460, 10, x + 6, -454, 18, { solid: false }); }
  },
  scenes: ['1-1', '1-2', '1-3', '1-4', '1-B'], intro: 'c1-intro', outro: 'c1-outro'
});

def('scene', '1-1', { title: 'LANTERN PIER', time: 45,
  arrive: { start: [-320, 0, 24], path: [[-220, -6, 24], [-120, -14, 24]], speed: 120, walk: true },
  slots: [
    { stand: { at: [0, -20, 24], look: [300, -12, 15] }, cover: { at: [-4, -32, 12], look: [300, -66, 8] } },
    { stand: { at: [0, 22, 24], look: [300, 12, 15] }, cover: { at: [-4, 34, 12], look: [300, 66, 8] } }],
  covers: { c1: { at: [186, -38, 0], h: 19 }, c2: { at: [192, 34, 0], h: 19, peek: ['up', 'right'] }, c3: { at: [256, 0, 0], h: 28, peek: ['up', 'left', 'right'] },
    c4: { at: [270, 46, 0], h: 17 }, c5: { at: [362, -10, 0], h: 26, peek: ['up', 'left'] }, c6: { at: [330, 50, 0], h: 15 } },
  waves: [
    { at: .6, spawn: [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'c3', { delay: .7 }]] },
    { after: 'clear', spawn: [['deckhand', 'c5', { entry: 'door', from: [600, 0, 0] }], ['deckhand', 'c4', { entry: 'jump', from: [236, 100, 14] }]] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [[400, -150, 0], [400, -60, 0], [395, 160, 0]], drop: 'mg', wait: .6 }], ['deckhand', 'c6', { entry: 'run', from: [440, 200, 0] }]] }],
  civilians: [{ at: 1.2, route: [[110, -20, 0], [130, -50, 0], [330, -50, 0], [420, -40, 0]], look: 0, leave: 3 }, { at: 1.4, route: [[118, -8, 0], [140, -46, 0], [330, -44, 0], [420, -30, 0]], look: 1, leave: 3 }],
  objects: [['lifering', [96, 58, 20], { yaw: Math.PI / 2 }], ['goods', [170, -38, 19]], ['goods', [175, 34, 19]], ['lantern', [120, -20, 34]], ['lantern', [160, 18, 33]], ['lanternR', [210, -26, 32]], ['lantern', [280, 22, 32]], ['lanternR', [60, 4, 34]]],
  cues: [{ at: 0, say: ['juno', 'Hostiles on the pier! Watch the festival crowd!'] }, { at: .2, prompt: 'cover' },
    { on: 'spawn:quartermaster', say: ['juno', "Orange vest! He's hauling ammo. Drop him!"] }, { on: 'clear', say: ['kai', "Pier's clear. Moving!"] }]
});

def('scene', '1-2', { title: 'FISH MARKET', time: 70,
  arrive: { path: [[160, -20, 24], [330, -20, 24], [440, -8, 24], [560, 0, 24], [610, 0, 24]], speed: 150, walk: true },
  slots: [
    { stand: { at: [642, -24, 24], look: [860, -30, 22] }, cover: { at: [636, -34, 12], look: [860, -80, 8] } },
    { stand: { at: [642, 26, 24], look: [860, 30, 22] }, cover: { at: [636, 36, 12], look: [860, 80, 8] } }],
  covers: { m1: { at: [738, -60, 0], h: 19 }, m2: { at: [738, 50, 0], h: 19, peek: ['up', 'left'] }, m3: { at: [778, -4, 0], h: 18, peek: ['up', 'left'] },
    m4: { at: [742, -100, 0], h: 26 }, m5: { at: [742, 100, 0], h: 26 },
    g1: { at: [832, -70, 44], h: 16, ledge: true, floor: 0 }, g2: { at: [832, 60, 44], h: 16, ledge: true, floor: 0 }, g3: { at: [832, -10, 44], h: 16, ledge: true, floor: 0, noRelocate: true } },
  waves: [
    { at: .5, spawn: [['deckhand', 'm1'], ['deckhand', 'm2', { delay: .4 }], ['deckhand', 'g1'], ['deckhand', 'g2', { delay: .8 }]] },
    { after: 'clear', spawn: [['redtide', 'm3', { entry: 'roll', from: [800, 120, 0] }]], cue: 'redtide' },
    { after: 'clear', spawn: [['marine', 'm4', { entry: 'vault', from: [800, -140, 0] }], ['marine', 'm5', { entry: 'vault', from: [800, 140, 0] }], ['grenadier', 'g3', { entry: 'run', from: [850, 150, 44] }]] }],
  objects: [['generator', [800, -60, 0], { onBreak: 'gallery' }], ['generator', [800, 70, 0], { onBreak: 'gallery' }], ['intel', [640, -157, 28], { n: 0 }], ['lantern', [700, -40, 70]], ['lantern', [700, 40, 70]], ['lanternR', [760, -80, 72]], ['lanternR', [760, 80, 72]], ['goods', [722, -60, 19]], ['goods', [722, 50, 19]]],
  allies: [{ who: 'rook', at: [612, 120, 0], facing: 0, every: 4 }],
  cues: [{ at: 0, say: ['rook', 'Market hall. Stay sharp.'] }, { on: 'redtide', say: ['juno', "Red uniform! That's Red Tide. They don't miss. Hit him first!"] },
    { on: 'grenade', say: ['juno', 'Grenade! Shoot it out of the air!'] },
    { on: 'gallery', say: ['rook', "Now that's what I call fresh fish."], do: sim => { for (const e of sim.enemies) if (e.alive && e.z > 30) damageEnemy(sim, e, 99, sim.players[0], 'blast', {}); sim.ev({ type: 'collapse', at: [840, 0, 44] }); } }]
});

def('scene', '1-3', { title: 'CONTAINER YARD', time: 90,
  arrive: { path: [[700, 0, 24], [860, 0, 24], [900, 0, 24]], speed: 150, walk: true },
  slots: [
    { stand: { at: [940, -32, 24], look: [1200, -20, 20] }, cover: { at: [936, -42, 12], look: [1200, -80, 8] } },
    { stand: { at: [940, 28, 24], look: [1200, 30, 20] }, cover: { at: [936, 38, 12], look: [1200, 80, 8] } }],
  covers: { k1: { at: [1100, -70, 0], h: 28 }, k2: { at: [1100, 80, 0], h: 28, peek: ['up', 'left'] }, k3: { at: [1152, 12, 0], h: 16 },
    f1: { at: [1184, -40, 0], h: 16 }, f2: { at: [1184, 60, 0], h: 16, peek: ['up', 'right'] }, t1: { at: [1222, -46, 0], h: 16 }, t2: { at: [1222, 46, 0], h: 16 } },
  waves: [
    { at: .5, spawn: [['deckhand', 'k1', { entry: 'jump', from: [1100, -128, 84] }], ['deckhand', 'k2', { entry: 'jump', from: [1100, 128, 84], delay: .5 }], ['deckhand', 'k3', { entry: 'jump', from: [1180, -128, 84], delay: 1 }], ['deckhand', 'f1'], ['deckhand', 'f2']] },
    { after: 'clear', do: sim => spawnBoss(sim, 'bulldog'), say: ['juno', 'Something big is coming through the containers!'] },
    { on: 'bulldog-down', delay: 1.2, spawn: [['grenadier', 'k3', { entry: 'run', from: [1300, -60, 0] }], ['quartermaster', null, { route: [[1330, -170, 0], [1330, -80, 0], [1320, 170, 0]], drop: 'mg' }], ['deckhand', 'k1', { entry: 'run', from: [1300, -180, 0] }]] }],
  civilians: [{ at: 2.5, route: [[1150, 140, 0], [1166, 100, 0]], look: 4, say: ['worker', "Don't shoot! I just work here!"] }],
  objects: [['intel', [1086, 80, 26], { n: 1 }]],
  cues: [{ on: 'spawn:quartermaster', say: ['juno', 'Another ammo runner. Grab that machine gun!'] }]
});

def('scene', '1-4', { title: 'CANAL RUN', time: 70, carrier: 'boat', carrierHold: 1180, holds: [[230, 'b1'], [640, 'b2'], [940, 'gb']],
  arrive: { path: [[1200, 0, 24], [1380, 0, 20], [1430, 0, 8]], speed: 160 },
  slots: [
    { stand: { at: [-6, -8, 24], yaw: 0, pitch: -2 }, cover: { at: [-10, -9, 13], yaw: -6, pitch: -6 } },
    { stand: { at: [-6, 9, 24], yaw: 0, pitch: -2 }, cover: { at: [-10, 10, 13], yaw: 6, pitch: -6 } }],
  covers: { b1: { at: [1800, -36, 30], h: 12, ledge: true, water: true }, b2: { at: [1800, 36, 30], h: 12, ledge: true, water: true }, bg1: { at: [1806, 0, 30], h: 14 },
    b3: { at: [2200, -36, 30], h: 12, ledge: true, water: true }, b4: { at: [2200, 36, 30], h: 12, ledge: true, water: true }, bg2: { at: [2206, 0, 30], h: 14 },
    gb1: { at: [2456, -46, -14], h: 12, water: true } },
  waves: [
    { atD: 40, spawn: [['jetski', null, { route: [[1640, -360, -24], [1650, -110, -24], [1760, -30, -24], [1900, 30, -24], [2050, 40, -24]], speed: 170 }], ['jetski', null, { route: [[1680, -380, -24], [1690, -120, -24], [1820, 20, -24], [1980, 50, -24]], speed: 165, delay: .8 }]], say: ['juno', 'Jet skis, three o\'clock!'] },
    { id: 'b1', atD: 140, spawn: [['gunner', 'bg1'], ['deckhand', 'b1', { entry: 'run', from: [1800, -120, 30] }], ['deckhand', 'b2', { entry: 'run', from: [1800, 120, 30] }]] },
    { atD: 520, spawn: [['jetski', null, { route: [[2090, 380, -24], [2090, 110, -24], [2200, 20, -24], [2350, -30, -24], [2500, -20, -24]], speed: 170 }], ['jetski', null, { route: [[2120, 400, -24], [2120, 120, -24], [2260, 30, -24], [2420, -20, -24]], speed: 160, delay: .7 }]] },
    { id: 'b2', atD: 560, spawn: [['gunner', 'bg2'], ['deckhand', 'b3', { entry: 'run', from: [2200, -120, 30] }], ['deckhand', 'b4', { entry: 'run', from: [2200, 120, 30] }]] },
    { id: 'gb', atD: 860, spawn: [['quartermaster', null, { route: [[2430, -48, -14], [2488, -48, -14]], drop: 'mg', wait: .4 }], ['deckhand', 'gb1']] }],
  objects: [['fuel', [2380, 46, -16], { onBreak: 'fireworks' }], ['lantern', [1600, -30, 32]], ['lanternR', [1600, 30, 32]], ['lantern', [2000, -20, 32]], ['lanternR', [2350, 10, 32]]],
  cues: [{ at: 0, say: ['mari', "Grab something! We're taking the canals!"] },
    { on: 'fireworks', say: ['rook', 'Fireworks barge. Happy festival.'], do: sim => { sim.ev({ type: 'cutfx', fx: 'fireworks', at: [2390, 46, 0] }); for (const e of sim.enemies) if (e.alive && !e.civ && Math.hypot(e.x - 2440, e.y + 40) < 120) damageEnemy(sim, e, 99, sim.players[0], 'blast', {}); } }],
  tick: (sim, dt) => { const d = sim.carrierD(); if (d > 1060 && !sim.flags.lowbridge) { sim.flags.lowbridge = true; sim.say('mari', 'Low bridge! Heads down!'); } }
});

def('scene', '1-B', { title: 'HARBOR MOUTH', time: 100, carrier: 'boat2', boss: 'stingray',
  arrive: { path: [[2790, -10, 6], [2860, -30, 6]], speed: 120 },
  slots: [
    { stand: { at: [-14, 4, 24], yaw: 62, pitch: -2 }, cover: { at: [-17, 2, 13], yaw: 66, pitch: -8 } },
    { stand: { at: [10, 6, 24], yaw: 58, pitch: -2 }, cover: { at: [7, 4, 13], yaw: 52, pitch: -8 } }],
  alt: [
    { stand: { at: [-14, 4, 24], yaw: -9, pitch: -4 }, cover: { at: [-16, 2, 10], yaw: -12, pitch: -10 } },
    { stand: { at: [8, 8, 24], yaw: -28, pitch: -6 }, cover: { at: [6, 9, 10], yaw: -30, pitch: -12 } }],
  covers: {},
  waves: [],
  cues: [{ at: 0, say: ['mari', 'That gunboat is heading straight for us!'] }]
});
