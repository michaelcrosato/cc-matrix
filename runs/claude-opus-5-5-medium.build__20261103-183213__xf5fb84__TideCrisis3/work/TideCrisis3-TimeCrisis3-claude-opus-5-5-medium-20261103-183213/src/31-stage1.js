// 31-stage1: HARBOR LIGHTS (Port Lumen Docks, 23:40, the Lantern Festival). Scenes 1-1 LANTERN PIER, 1-2 FISH MARKET,
// 1-3 CONTAINER YARD (the Bulldog), 1-4 CANAL RUN (moving), 1-B STINGRAY -> BARRACUDA. Reads: stagefmt (30).

const S1 = { pier: F(0, 0, 0, 0), market: F(620, 220, 0, 90), yard: F(620, 900, 0, 90), canal: F(860, 1500, -24, 0), mouth: F(3620, 1500, -24, 0) };
const W1 = -24;   // the harbor's water
const sl11 = S1.pier.slots({ gap: 22 }), sl12 = S1.market.slots({ gap: 24 }), sl13 = S1.yard.slots({ gap: 24 });

def('stage', 1, { name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', briefing: 'b1',
  env: { sky: { stops: ['#0b1026', '#1b2a52', '#3a3060'], stars: true, moon: { az: -.6, el: .55, color: '#fff3d0' }, clouds: { color: '#262c58', cover: .4, k: .6 }, glow: { color: '#a03a8a', az: 1.2, w: 1.2, k: .45 },
    sil: [{ color: '#121834', lit: '#ffd070', h: az => (Math.cos(az - 1.5) > -.2 ? .035 + .06 * Math.abs(Math.sin(az * 17)) * Math.abs(Math.sin(az * 5.3)) : .012) }] },
    fog: ['#1a2242', 420, 2100], ambient: .34, ambientColor: '#8a98d8', sun: { dir: [-.35, .45, .82], color: '#a8b8ff', k: .42 }, water: { z: W1, mat: 'sea-night' }, fireworks: true },
  build(G) {
    // ---- 1-1 the pier: a wooden deck, stalls, lanterns, a fishing boat, warehouses on the quay ahead
    const A = S1.pier;
    G.push(A.x, A.y, A.z, A.yaw);
    G.box(-260, -62, -10, 420, 62, 0, 'planks', { surf: 'wood' });
    for (let d = -240; d < 420; d += 60) for (const l of [-58, 58]) G.cyl(d, l, W1 - 4, 0, 3, 3, 6, 'timber');
    PF.railing(G, [-260, -62, 0], [330, -62, 0], 12, 'timber'); PF.railing(G, [-260, 62, 0], [200, 62, 0], 12, 'timber');
    G.box(420, -440, -10, 760, 140, 0, 'cobble', { surf: 'concrete' });          // the quay
    for (const [d, l, a] of [[150, -44, 'awning-red'], [215, 44, 'awning-blue'], [280, -44, 'awning-green'], [90, 44, 'awning-red']]) PF.stall(G, d, l, 0, 0, a);
    for (let d = -200; d <= 380; d += 60) { G.cyl(d, -62, 0, 46, 1.2, 1.2, 5, 'timber', { collide: false }); G.cyl(d, 62, 0, 46, 1.2, 1.2, 5, 'timber', { collide: false }); }
    for (let d = -200; d < 380; d += 60) { PF.lanternString(G, [d, -62, 44], [d + 60, -62, 44], 5, 5); PF.lanternString(G, [d, 62, 44], [d + 60, 62, 44], 5, 5); PF.lanternString(G, [d, -62, 46], [d + 30, 62, 46], 8, 10); }
    for (const d of [-120, 40, 180, 330]) { PF.lantern(G, d, -50, 40); PF.lantern(G, d + 20, 50, 40, 'lantern-red'); }
    G.box(196, -8, 0, 210, 8, 14, 'crate', { fit: true, surf: 'wood' });    // c3's crates
    G.box(196, 8, 0, 210, 18, 12, 'crate', { fit: true, surf: 'wood' });
    PF.barrel(G, 304, -18, 0); PF.barrel(G, 314, -8, 0, 'iron');            // c6
    PF.boat(G, 238, 104, -16, .15, 110, { hull: 'hull' });                    // a fishing boat beside the pier
    PF.bollard(G, 120, 58, 0); PF.bollard(G, 120, -58, 0); PF.bollard(G, -60, 58, 0);
    PF.warehouse(G, A, 480, -140, 200, 160, 70, { sign: true }); PF.warehouse(G, A, 470, -340, 160, 150, 80, { lit: true });
    PF.lamppost(G, 440, -30, 0, 64, true); PF.lamppost(G, 560, 110, 0, 64, true);
    // the giant festival screen on the warehouse (Krake's broadcast)
    G.box(481, -172, 68, 486, -108, 114, 'iron', { collide: false }); G.box(479.5, -168, 72, 481, -112, 110, 'screen-teal', { collide: false, tess: false });
    G.pop();
    for (const s of sl11) PF.slotProp(G, s, 'crates');
    // ---- 1-2 the fish market: a brick hall, tiled floor, stalls, ice tables, an upper gallery
    const M = S1.market;
    G.push(M.x, M.y, M.z, M.yaw);
    G.box(-60, -120, -1, 380, 120, 0, 'tiles', { surf: 'concrete' });
    G.box(-60, -122, 0, 380, -120, 96, 'brick', { surf: 'concrete' }); G.box(-60, 120, 0, 380, 122, 96, 'brick', { surf: 'concrete' });
    G.box(378, -120, 0, 380, -20, 96, 'brick'); G.box(378, 20, 0, 380, 120, 96, 'brick'); G.box(378, -20, 40, 380, 20, 96, 'brick');
    G.box(-62, -120, 0, -60, -24, 96, 'brick'); G.box(-62, 24, 0, -60, 120, 96, 'brick'); G.box(-62, -24, 40, -60, 24, 96, 'brick');
    G.box(-60, -120, 96, 380, 120, 98, 'timber', { collide: false, bottom: true });
    // the gallery along the far end (z 48) on posts, with a railing
    G.box(260, -118, 46, 378, 118, 48, 'planks', { surf: 'wood', bottom: true }); G.box(258, -118, 46, 262, 118, 60, 'timber', { surf: 'wood' });
    for (const l of [-100, -40, 40, 100]) G.box(258, l - 2, 0, 262, l + 2, 46, 'timber', { surf: 'wood' });
    for (const l of [-60, 60]) { G.cyl(250, l, 0, 18, 7, 7, 10, 'barrel-red', { collide: 'metal' }); }
    for (const [d, l] of [[120, -60], [130, 50], [200, -10], [60, 80]]) { G.box(d - 14, l - 22, 0, d + 14, l + 22, 15, 'steel', { surf: 'metal', top: 'ice' }); }
    for (const [d, l, a] of [[170, 70, 'awning-blue'], [180, -80, 'awning-red']]) PF.stall(G, d, l, 0, 0, a);
    for (let d = 0; d < 360; d += 70) { PF.lantern(G, d, -50, 80, 'lantern-red'); PF.lantern(G, d + 30, 50, 80); }
    G.box(377.5, -40, 60, 378, 40, 80, 'poster', { collide: false });
    G.pop();
    for (const s of sl12) PF.slotProp(G, s, 'crates');
    // ---- the street between: the quay continues south
    G.box(540, 598, -10, 700, 782, 0, 'cobble', { surf: 'concrete' }); G.box(538, 598, 0, 540, 782, 60, 'brick'); G.box(700, 598, 0, 702, 782, 60, 'brick');
    // ---- 1-3 the container yard: asphalt, stacks, a gantry crane, forklifts, sodium lamps
    const Y = S1.yard;
    G.push(Y.x, Y.y, Y.z, Y.yaw);
    G.box(-120, -260, -2, 470, 300, 0, 'asphalt', { surf: 'concrete' });
    PF.container(G, 200, -80, 0, Math.PI / 2, 'container-blue'); PF.container(G, 200, -80, 42, Math.PI / 2, 'container-red');
    PF.container(G, 240, 70, 0, 0, 'container-ochre'); PF.container(G, 330, -150, 0, Math.PI / 2, 'container-green'); PF.container(G, 330, -150, 42, Math.PI / 2, 'container-grey');
    PF.container(G, 420, 40, 0, 0, 'container-red'); PF.container(G, 420, 40, 42, 0, 'container-blue'); PF.container(G, 120, 170, 0, .1, 'container-green');
    PF.container(G, 300, 250, 0, Math.PI / 2, 'container-ochre');   // the wall the Bulldog smashes through
    G.box(256, -14, 0, 272, 2, 16, 'crate', { fit: true, surf: 'wood' }); G.box(348, -28, 0, 364, -12, 16, 'crate', { fit: true, surf: 'wood' });
    G.box(120, -50, 0, 150, -26, 20, 'container-ochre', { surf: 'metal' });   // a forklift's body
    G.box(150, -46, 0, 160, -30, 34, 'iron', { collide: false });
    G.box(150, 30, 0, 176, 52, 20, 'container-ochre', { surf: 'metal' }); G.box(176, 34, 0, 184, 48, 34, 'iron', { collide: false });
    // the gantry crane
    for (const l of [-220, 220]) { G.box(480, l - 6, 0, 492, l + 6, 170, 'container-red', { surf: 'metal' }); G.box(380, l - 6, 0, 392, l + 6, 170, 'container-red', { surf: 'metal' }); }
    G.box(380, -226, 170, 492, 226, 186, 'container-red', { collide: false, bottom: true });
    for (const [d, l] of [[60, -200], [60, 200], [300, -230], [300, 220]]) PF.lamppost(G, d, l, 0, 80, true);
    G.pop();
    for (const s of sl13) PF.slotProp(G, s, 'crates');
    // ---- the canal: water between walls of houses, bridges
    const C = S1.canal;
    G.push(C.x, C.y, 0, C.yaw);
    for (const side of [-1, 1]) {
      G.box(-200, side * 90, -40, 2500, side * 90 + side * 30, 0, 'stone', { surf: 'concrete' });
      for (let d = -150; d < 2500; d += 140) { G.box(d, side * 120 + (side > 0 ? 0 : -70), 0, d + 120, side * 120 + (side > 0 ? 70 : 0), 80 + (d % 3) * 18, d % 280 === 130 ? 'plaster' : 'brick', { surf: 'concrete' }); G.box(side > 0 ? d + 20 : d + 20, side * 119.4, 30, d + 100, side * 119.4 + side * .4, 48, 'glasslit', { collide: false }); }
    }
    for (const d of [500, 1100, 1700]) { G.box(d, -90, 26, d + 40, 90, 34, 'stone', { surf: 'concrete', bottom: true }); PF.railing(G, [d + 2, -90, 34], [d + 2, 90, 34], 14); PF.railing(G, [d + 38, -90, 34], [d + 38, 90, 34], 14); for (let l = -80; l <= 80; l += 40) PF.lantern(G, d + 20, l, 30, l % 80 ? 'lantern' : 'lantern-red'); }
    G.box(1400, -90, 14, 1430, 90, 20, 'stone', { surf: 'concrete', bottom: true });   // the low bridge
    for (const d of [300, 900, 1500, 2100]) PF.lanternString(G, [d, -90, 60], [d, 90, 60], 8, 12);
    PF.boat(G, 760, 60, -16, 0, 90, { hull: 'hull' });   // a moored boat
    G.box(1880, 40, -26, 1980, 86, -14, 'plank', { surf: 'wood' });   // the fireworks barge
    G.pop();
    // ---- the harbor mouth: a breakwater, a far lighthouse
    G.push(S1.mouth.x, S1.mouth.y, 0, 0);
    G.box(-100, -460, -40, 900, -420, 6, 'stone', { surf: 'concrete' });
    G.cyl(820, -440, 6, 120, 12, 9, 10, 'plaster'); G.cyl(820, -440, 120, 136, 10, 10, 10, 'lamp');
    G.light(820, -440, 128, 200, 1, '#fff0c0');
    G.pop();
    // far skyline blocks
    for (let i = 0; i < 14; i++) PF.skylineBlock(G, 900 + i * 90, -700 - (i % 3) * 60, 70, 60, 100 + (i * 37) % 120, i % 2 === 0);
  },
  intro: 'c1-intro', outro: 'c1-outro', scenes: ['1-1', '1-2', '1-3', '1-4', '1-B'] });

// ---------------------------------------------------------------- 1-1 LANTERN PIER
def('scene', '1-1', { title: 'LANTERN PIER', time: 45,
  arrive: { path: [S1.pier.p(-240, 30, 14), S1.pier.p(-150, 10, 22), S1.pier.p(-60, 0, 24), S1.pier.p(0, 0, 24)], speed: 110 },
  slots: sl11,
  covers: covers(S1.pier, { c1: [150, -30, 16, ['up', 'right']], c2: [215, 30, 16, ['up', 'left']], c3: [220, 0, 15, ['up']], c4: [250, 48, 16, ['up']], c5: [340, 10, 18, ['up', 'left']], c6: [325, -14, 20, ['up']], c7: [290, -30, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'c3']] },
    { after: 'clear', spawn: [['deckhand', 'c5', { entry: 'door', from: S1.pier.p(478, -140, 0) }], ['deckhand', 'c4', { entry: 'jump', from: S1.pier.p(250, 96, 22) }]] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [S1.pier.p(330, -60, 0), S1.pier.p(330, 60, 0), S1.pier.p(420, 120, 0)], drop: 'mg', speed: 55 }], ['deckhand', 'c6', { entry: 'run', from: S1.pier.p(420, -60, 0) }], ['deckhand', 'c7', { entry: 'run', from: S1.pier.p(440, 90, 0) }]] } ],
  civilians: [],
  objects: [['lifering', S1.pier.p(96, 60, 22)], ['lantern', S1.pier.p(150, -50, 36)], ['lantern', S1.pier.p(200, 50, 36)], ['bottles', S1.pier.p(152, -44, 16)], ['bottles', S1.pier.p(215, 44, 16)], ['barrel', S1.pier.p(270, 40, 0)]],
  cues: [{ at: 0, say: ['juno', 'Hostiles on the pier! Watch the festival crowd!'] }, { at: 0, prompt: 'cover' }, { at: 1.5, fn: sim => TC.spawnCivilian(sim, { kind: 'festival', route: [S1.pier.p(160, 0, 0), S1.pier.p(260, 20, 0), S1.pier.p(420, 40, 0)], leave: 4, speed: 80, line: ['juno', "Civilians on the pier! Don't hit them!"] }) },
    { on: 'spawn:quartermaster', say: ['juno', "Orange vest! He's hauling ammo—drop him!"] }, { on: 'clear', say: ['kai', "Pier's clear. Moving!"] }, { at: 4, prompt: 'reload' }] });

// ---------------------------------------------------------------- 1-2 FISH MARKET
def('scene', '1-2', { title: 'FISH MARKET', time: 50,
  arrive: { path: [S1.pier.p(0, 0, 24), S1.pier.p(300, 0, 24), S1.pier.p(520, 20, 24), S1.pier.p(620, 60, 24), S1.market.p(-80, 0, 24), S1.market.p(0, 0, 24)], speed: 140 },
  slots: sl12,
  covers: covers(S1.market, { c1: [130, -60, 16, ['up']], c2: [140, 50, 16, ['up']], g1: [274, -60, 12, ['up'], { z: 48, ledge: true }], g2: [274, 70, 12, ['up'], { z: 48, ledge: true }], c3: [210, -10, 16, ['up']], c4: [180, 70, 14, ['up']], g3: [274, 0, 12, ['up'], { z: 48, ledge: true }], c5: [110, 70, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'g1'], ['deckhand', 'g2']] },
    { after: 'clear', spawn: [['redtide', 'c3', { entry: 'roll', from: S1.market.p(230, -70, 0) }]], say: ['juno', "Red uniform! That's Red Tide—they don't miss. Hit him first!"] },
    { after: 'clear', spawn: [['marine', 'c4', { entry: 'vault' }], ['marine', 'c5', { entry: 'vault' }], ['grenadier', 'g3', { entry: 'stand' }]] } ],
  objects: [['tank', S1.market.p(250, -60, 0), { cue: 'gallery' }], ['tank', S1.market.p(250, 60, 0), { cue: 'gallery' }], ['intel', S1.market.p(260, 104, 60), { intel: 'i1a' }], ['lantern', S1.market.p(70, -50, 76)], ['bottles', S1.market.p(170, 70, 16)]],
  allies: [{ agent: 'rook', at: S1.market.p(300, -100, 0), facing: Math.PI }],
  cues: [{ at: 0, say: ['rook', 'Market hall. Stay sharp.'] }, { on: 'spawn:grenadier', say: ['juno', 'Grenade! Shoot it out of the air!'] }, { on: 'gallery', say: ['rook', "Now that's what I call fresh fish."], fn: sim => { for (const e of sim.enemies) if (!e.dead && e.cover && e.cover.ledge) TC.killEnemy(sim, e, { style: 'fall', p: sim.players[0] }); sim.emit('fx', { kind: 'gallery' }); } }] });

// ---------------------------------------------------------------- 1-3 CONTAINER YARD (the Bulldog)
def('scene', '1-3', { title: 'CONTAINER YARD', time: 60,
  arrive: { path: [S1.market.p(0, 0, 24), S1.market.p(250, 0, 24), S1.market.p(420, 0, 24), S1.yard.p(-130, 0, 24), S1.yard.p(0, 0, 24)], speed: 150 },
  slots: sl13,
  covers: covers(S1.yard, { k3: [420, 24, 12, ['up'], { z: 84, ledge: true }], f1: [130, -62, 20, ['up']], f2: [165, 60, 20, ['up']], c1: [160, -6, 16, ['up']], c2: [276, -6, 16, ['up']], c3: [362, -20, 16, ['up']] }),
  bulldog: { from: S1.yard.p(300, 330, 0), to: S1.yard.p(320, 10, 0) }, bulldogMen: [S1.yard.p(296, -34, 0), S1.yard.p(300, 48, 0)],
  waves: [
    { at: .6, spawn: [['deckhand', 'f1', { entry: 'jump', from: S1.yard.p(200, -60, 84) }], ['deckhand', 'f2', { entry: 'jump', from: S1.yard.p(240, 70, 42) }], ['deckhand', 'c1', { entry: 'jump', from: S1.yard.p(200, -20, 84) }], ['deckhand', 'k3']] },
    { after: 'clear', id: 'truck', spawn: [], fx: { kind: 'bulldog' } },
    { after: 'truck', spawn: [['grenadier', 'c3', { entry: 'run' }], ['quartermaster', null, { route: [S1.yard.p(300, -230, 0), S1.yard.p(300, 0, 0), S1.yard.p(330, 260, 0)], drop: 'mg', speed: 60 }], ['deckhand', 'c2', { entry: 'run' }]] } ],
  objects: [['barrel', S1.yard.p(210, -30, 0)], ['barrel', S1.yard.p(240, 30, 0)]],
  cues: [{ at: 0, say: ['juno', 'Something big is coming through the containers!'] }, { at: 3, fn: sim => TC.spawnCivilian(sim, { kind: 'worker', at: S1.yard.p(140, 40, 0), route: [S1.yard.p(140, 40, 0), S1.yard.p(150, 42, 0)], line: ['worker', "Don't shoot! I just work here!"] }) }],
  objective: sim => !sim.waves.find(w => w.id === 'truck' && w.fired) || sim.flags.bulldogDone });

// the Bulldog: a mini-boss launched by its wave
TC.bus.on('*', () => {});
const _fireWave = Sim.prototype._fireWave;
Sim.prototype._fireWave = function (w) {
  _fireWave.call(this, w);
  if (w.fx && w.fx.kind === 'bulldog') { this.startBoss('bulldog'); }
};
const _isClear = Sim.prototype._isClear;
Sim.prototype._isClear = function () {
  if (this.boss && this.boss.id === 'bulldog' && this.boss.defeated && this.boss.outT > 1) { this.flags.bulldogDone = true; this.boss = null; }
  if (this.boss && (this.boss.id === 'gull' || this.boss.id === 'seawolf') && this.boss.defeated && this.boss.outT > 1.5) { this.flags[this.boss.id + 'Done'] = true; this.boss = null; }
  if (this.boss && this.boss.defeated && this.boss.outT < 2.4) return false;
  return _isClear.call(this);
};

// ---------------------------------------------------------------- 1-4 CANAL RUN (moving: Mari's speedboat)
const CN = S1.canal, boatSlots = [
  { stand: { at: [0, -10, 32], look: [300, -6, 26] }, cover: { at: [-6, -20, 18], look: [300, -70, 14] } },
  { stand: { at: [0, 10, 32], look: [300, 6, 26] }, cover: { at: [-6, 20, 18], look: [300, 70, 14] } }];
def('scene', '1-4', { title: 'CANAL RUN', time: 60,
  arrive: { path: [S1.yard.p(0, 0, 24), S1.yard.p(150, 0, 24), S1.yard.p(300, 20, 24), S1.yard.p(360, -30, 20), [CN.x - 160, CN.y - 40, 8], [CN.x - 40, CN.y, 8]], speed: 150 },
  carrier: { path: [CN.p(-40, 0, 0), CN.p(600, 0, 0), CN.p(1300, -10, 0), CN.p(2000, 0, 0), CN.p(2400, 0, 0)], speed: 58, mesh: 'speedboat', cover: [[[8, -18, 8], [40, -14, 22]], [[8, 14, 8], [40, 18, 22]]] },
  slots: boatSlots,
  covers: covers(CN, { b1: [512, -30, 14, ['up'], { z: 58 }], b2: [512, 40, 14, ['up'], { z: 58 }], b3: [1112, -40, 14, ['up'], { z: 58, noCheck: true }], b4: [1112, 30, 14, ['up'], { z: 58, noCheck: true }], m1: [780, 60, 14, ['up'], { z: 17 }] }),
  waves: [
    { atD: 60, spawn: [['jetski', null, { path: [CN.p(260, -300, W1 - CN.z), CN.p(330, -60, 0), CN.p(500, 30, 0), CN.p(900, 60, 0)], speed: 150 }], ['jetski', null, { path: [CN.p(300, 300, 0), CN.p(380, 50, 0), CN.p(560, -30, 0), CN.p(950, -60, 0)], speed: 150 }]], say: ['juno', 'Jet skis, three o\'clock!'] },
    { atD: 250, hold: 430, spawn: [['gunner', 'b1', { mount: true }], ['deckhand', 'b2', { entry: 'stand' }]] },
    { atD: 560, spawn: [['quartermaster', null, { route: [CN.p(780, 30, 10), CN.p(780, 90, 10)], drop: 'mg', speed: 30 }], ['deckhand', 'm1']] },
    { atD: 760, spawn: [['jetski', null, { path: [CN.p(900, -300, 0), CN.p(980, -40, 0), CN.p(1200, 20, 0), CN.p(1600, 50, 0)], speed: 140 }], ['jetski', null, { path: [CN.p(940, 300, 0), CN.p(1020, 40, 0), CN.p(1250, -20, 0), CN.p(1650, -50, 0)], speed: 140 }]] },
    { atD: 860, hold: 1030, spawn: [['gunner', 'b3', { mount: true }], ['deckhand', 'b4', { entry: 'stand' }]] },
    { atD: 1450, spawn: [['jetski', null, { path: [CN.p(1700, -300, 0), CN.p(1760, -40, 0), CN.p(2000, 30, 0), CN.p(2300, 60, 0)], speed: 120 }], ['jetski', null, { path: [CN.p(1740, 300, 0), CN.p(1800, 40, 0), CN.p(2040, -30, 0), CN.p(2350, -60, 0)], speed: 120 }]], say: ['rook', 'Fireworks barge. Happy festival.'] } ],
  objects: [['fwcrate', CN.p(1900, 60, -14)], ['fwcrate', CN.p(1930, 50, -14)], ['fwcrate', CN.p(1960, 66, -14)]],
  cues: [{ at: 0, say: ['mari', "Grab something! We're taking the canals!"] }, { at: 20, say: ['mari', 'Low bridge! Heads down!'] }] });

// ---------------------------------------------------------------- 1-B STINGRAY -> BARRACUDA
def('scene', '1-B', { title: 'HARBOR MOUTH', time: 100, boss: 'stingray',
  arrive: { path: [CN.p(2400, 0, 32), CN.p(2600, 0, 32), S1.mouth.p(-140, 0, 32), S1.mouth.p(0, -10, 32)], speed: 120, vehicle: true },
  carrier: { path: [S1.mouth.p(-20, 0, 0), S1.mouth.p(20, 0, 0)], speed: 1, mesh: 'speedboat', cover: [[[8, -18, 8], [40, -14, 22]], [[8, 14, 8], [40, 18, 22]]], idle: true },
  slots: [{ stand: { at: [0, -10, 32], look: [60, -300, 26] }, cover: { at: [-4, -20, 18], look: [-60, -300, 14] } }, { stand: { at: [0, 10, 32], look: [100, -300, 26] }, cover: { at: [8, -16, 18], look: [180, -300, 14] } }],
  bossAt: S1.mouth.p(80, -290, 0),
  covers: {},
  cues: [] });
