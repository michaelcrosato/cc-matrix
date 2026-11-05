/* 32-stage2: STAGE 2, STORM SIGNAL (Gull's Rest and Lighthouse Point, 02:10, a thunderstorm). Geometry along +x: the
 * cobbled lane of Gull's Rest climbing east (x 0..440, z 0..40), the Net Lofts (x 480..700, floor z 40), the funicular
 * up the cliff (x 760..1300, z 40..400), the lighthouse courtyard (x 1340..1640, z 400), the lighthouse (centre x 1560,
 * gallery z 540). Scenes 2-1 .. 2-4 and Hammerhead, 2-B. */
const LH = [1560, 0, 400];   // the lighthouse's foot
/* the lighthouse's outside stair: stone steps cantilevered from the tower, climbing anticlockwise from the courtyard's
 * south-west corner, nearly two turns, to the gate in the gallery railing on the west side. s: the angle climbed. */
const LHS = { r0: 74, r1: 88, r: 81, a0: -135 * DEG, sEnd: 695 * DEG, z0: 400, z1: 544 };
LHS.k = (LHS.z1 - LHS.z0) / LHS.sEnd;
/** the point on the stair after climbing s radians, at radius r; z is the step's top */
function stairAt(s, r = LHS.r) { const a = LHS.a0 + s; return [LH[0] + Math.cos(a) * r, LH[1] + Math.sin(a) * r, LHS.z0 + clamp(s, 0, LHS.sEnd) * LHS.k]; }
/** an eye-height path up the stair from s0 to s1 (every 20 degrees) */
function stairPath(s0, s1, r = LHS.r) { const out = []; for (let s = s0; s < s1 - 1e-6; s += 20 * DEG) { const p = stairAt(s, r); out.push([p[0], p[1], p[2] + EYE]); } const e = stairAt(s1, r); out.push([e[0], e[1], e[2] + EYE]); return out; }
/** where on the stair a point is (its s), or -1 when it is not on the stair */
function stairS(p) { const r = Math.hypot(p[0] - LH[0], p[1] - LH[1]); if (Math.abs(r - LHS.r) > 12 || p[2] < LHS.z0 + EYE + 4) return -1; const a = Math.atan2(p[1] - LH[1], p[0] - LH[0]), base = (((a - LHS.a0) % TAU) + TAU) % TAU, zs = (p[2] - EYE - LHS.z0) / LHS.k; let best = base, d = 1e9; for (let t = base; t <= LHS.sEnd + TAU; t += TAU) if (Math.abs(t - zs) < d) { d = Math.abs(t - zs); best = t; } return Math.min(best, LHS.sEnd); }
TC.LHS = LHS; TC.stairAt = stairAt; TC.stairS = stairS; TC.LH = LH;
/* the stair landing where the players fight up the stair (2-4), and the two deckhands on the turn above */
const LANDING = 300 * DEG, STAIR_FOES = { t1: 595 * DEG, t2: 565 * DEG };
def('stage', 2, {
  num: 2, name: 'STORM SIGNAL', place: "Gull's Rest  •  Lighthouse Point", clock: '02:10', music: 'storm', maxThreats: 2,
  env: { ambient: .3, skyK: .04, sun: { dir: [.3, -.5, .8], k: .26 }, fog: ['#26343c', 220, 1300], warm: '#ffc070', water: { z: -24 }, rain: true, storm: true, ambience: 'storm', actorK: 1.25, swayK: .9,
    sky: { colors: ['#10161c', '#1e2a30', '#34444a'], below: '#1a2428', clouds: '#3a4a52', cloudK: .7, layers: [{ kind: 'hills', color: '#141c20', height: .07, seed: 21 }] } },
  carriers: {
    funi: { path: [[770, -30, 44], [1300, -30, 404]], speed: 70, mesh: 'funicular' },
    funi2: { path: [[1300, 30, 404], [770, 30, 44]], speed: 70, mesh: 'funicular' }
  },
  objectives: ['Push up through Gull\'s Rest', 'Ride the funicular to Lighthouse Point', 'Free Dr. Tejada', 'Silence the lighthouse relay'],
  briefing: [['hale', 'The lighthouse relays Krake\'s commands to the whole fleet.'], ['juno', 'Take it out and his ships go deaf. Also, it\'s raining. A lot.'], ['mari', 'They\'re holding my father up there. Let\'s go get him.']],
  build(G) {
    KIT.sea(G, 'sea-storm', -1400, -1600, 2600, 1600, -24);
    // the harbor wall and the lane of Gull's Rest, climbing east
    KIT.ground(G, -200, -300, 0, 300, 0, 'cobble-wet', 'stone');
    G.ramp('cobble-wet', 0, 0, 0, 440, 0, 40, 140, { maxEdge: 40 }); G.collider([0, -70, -40, 440, 70, 0], { impact: 'stone' });
    G.box('rock-wet', 0, -70, -60, 440, 70, -2, { skip: 't', solid: false });
    for (const s of [-1, 1]) for (let x = 0; x < 440; x += 62) {
      const z = x / 440 * 40, y0 = s < 0 ? -150 : 70, y1 = s < 0 ? -70 : 150;
      G.box('cobble-wet', x, y0, z - 60, x + 62, y1, z + 2, { solid: false });
      KIT.house(G, x + 4, y0 + (s < 0 ? 0 : 6), x + 58, y1 - (s < 0 ? 6 : 0), 60 + ((x * 3) % 30), { mat: (x / 62 | 0) % 2 ? 'plaster' : 'timber', roof: 'slate', lit: true, dark: (x / 62 | 0) % 3 === 0 });
      // the balconies (cover for the window gunmen)
      if ((x / 62 | 0) % 2 === 1) { const bz = z + 30; G.box('timber', x + 12, s < 0 ? -76 : 64, bz - 3, x + 50, s < 0 ? -64 : 76, bz, { solid: true }); G.box('timber', x + 12, s < 0 ? -64 : 62, bz, x + 50, s < 0 ? -62 : 64, bz + 14, { cover: true }); }
      KIT.lamp(G, x + 31, s * 64, z, 'glow-amber', 34, .5);
    }
    // the player's cart and well, the cart barricade up the lane
    G.box('planks', 52, -44, 4, 70, -14, 18, { top: 'pier' }); G.tube('rubber', [61, -46, 5], [61, -48, 5], 6); G.tube('rubber', [61, -12, 5], [61, -10, 5], 6);
    G.cyl('stone', 60, 34, 4, 10, 16, { seg: 10, solid: true, top: 'rock-wet' }); G.box('timber', 49, 33, 20, 71, 35, 22, { solid: false });
    G.box('planks', 276, -30, 25, 296, 30, 43, { cover: true }); G.box('crate', 300, 40, 27, 316, 56, 41);
    KIT.crates(G, 220, -50, 20, 1, 1, 2, 14); KIT.barrel(G, 214, 46, 19); KIT.barrel(G, 360, -40, 32);
    for (let k = 0; k < 4; k++) KIT.rail(G, [100 + k * 80, -70, 50 + k * 4], [100 + k * 80, 70, 50 + k * 4], 0, 'rope');   // washing lines
    // ---- 2-2 the Net Lofts (x 480..700, y -110..110, floor z 40, upper floor z 92) ----
    G.box('planks', 440, -150, 30, 760, 150, 40, { side: 'stone' });
    G.box('timber', 480, -114, 40, 700, -110, 170, { skip: 'b' }); G.box('timber', 480, 110, 40, 700, 114, 170, { skip: 'b' }); G.box('timber', 696, -110, 40, 700, 110, 170, { skip: 'b' });
    G.box('timber', 476, -114, 40, 480, -24, 170, { skip: 'b' }); G.box('timber', 476, 24, 40, 480, 114, 170, { skip: 'b' }); G.box('timber', 476, -24, 80, 480, 24, 170, { skip: 'b' });
    G.box('slate', 476, -118, 170, 704, 118, 176, { bottom: 'timber', solid: false });
    G.box('planks', 620, -110, 88, 700, 110, 92, { bottom: 'pier-dk' }); G.box('oak', 618, -110, 92, 622, 110, 106, { cover: true });
    G.stairs('planks', 560, 80, 40, 620, 80, 92, 22, 9);
    G.box('steel-dk', 640, -14, 168, 668, 14, 172, { solid: false });   // the roof hatch
    for (const [x, y] of [[540, -60], [600, 50], [660, -20]]) G.quad('net', [x, y - 30, 160], [x, y + 30, 160], [x, y + 30, 100], [x, y - 30, 100], { uv: [[0, 0], [60, 0], [60, 60], [0, 60]] });
    G.box('crate', 512, -40, 40, 528, -12, 58, { cover: true }); KIT.crates(G, 520, 30, 40, 1, 2, 1, 15);
    KIT.crates(G, 590, -60, 40, 2, 1, 2, 15); G.box('planks', 600, 20, 40, 616, 50, 58, { cover: true });
    for (const [x, y] of [[530, 0], [600, 0], [660, 0]]) G.light(x, y, 150, 120, .5);
    // ---- 2-3 the funicular up the cliff ----
    G.ramp('steel-dk', 760, -30, 40, 1300, -30, 400, 30); G.ramp('steel-dk', 1300, 30, 400, 760, 30, 40, 30);
    for (let k = 0; k <= 10; k++) { const x = 760 + k * 54, z = 40 + k * 36; G.box('rock-wet', x, -130, z - 200, x + 54, -50, z + 4, { solid: false }); G.box('rock-wet', x, 50, z - 200, x + 54, 130, z + 4, { solid: false }); G.box('rock-wet', x, -260, z - 200, x + 54, -130, z + 70, { solid: false }); G.box('rock-wet', x, 130, z - 200, x + 54, 260, z + 60, { solid: false }); }
    for (const [x, s] of [[900, -1], [1040, 1], [1180, -1]]) { const z = 40 + (x - 760) / 540 * 360; G.box('cobble-wet', x - 30, s < 0 ? -128 : 64, z + 6, x + 30, s < 0 ? -64 : 128, z + 10, { solid: true }); G.box('stone', x - 22, s < 0 ? -70 : 62, z + 10, x + 22, s < 0 ? -64 : 70, z + 12, { solid: false }); KIT.lamp(G, x + 26, s * 100, z + 10, 'glow-amber', 30, .5); }
    // ---- 2-4 the lighthouse courtyard (z 400) and the lighthouse ----
    KIT.ground(G, 1300, -260, 1720, 260, 400, 'cobble-wet', 'rock-wet', 80);
    G.box('stone', 1300, -260, 400, 1720, -252, 416); G.box('stone', 1300, 252, 400, 1720, 260, 416);
    G.cyl('lighthouse', LH[0], LH[1], LH[2], 34, 140, { r2: 26, seg: 14, solid: true }); G.cyl('slate', LH[0], LH[1], LH[2] + 136, 72, 8, { seg: 18 });   // the tower and the wide gallery
    for (const [hx, hy] of [[66, 28], [28, 66]]) G.collider([LH[0] - hx, LH[1] - hy, LH[2] + 136, LH[0] + hx, LH[1] + hy, LH[2] + 144], { impact: 'stone' });   // the gallery floor: a cross of boxes inside its circle (the stair passes just outside)
    G.cyl('glass', LH[0], LH[1] + 34, LH[2] + 144, 16, 26, { seg: 10, caps: false }); G.lathe('hull-red', LH[0], LH[1] + 34, LH[2] + 170, [[20, 0], [14, 8], [0, 16]], { seg: 10 });
    const inGate = a => { const d = Math.abs(((a - (LHS.a0 + LHS.sEnd)) % TAU + TAU + Math.PI) % TAU - Math.PI); return d < 14 * DEG; };   // the railing, open at the gate
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, a2 = a + TAU / 24; if (!inGate(a)) G.cyl('iron', LH[0] + Math.cos(a) * 71, LH[1] + Math.sin(a) * 71, LH[2] + 144, .8, 14, { seg: 4, caps: false }); if (!inGate(a) && !inGate(a2)) G.tube('iron', [LH[0] + Math.cos(a) * 71, LH[1] + Math.sin(a) * 71, LH[2] + 158], [LH[0] + Math.cos(a2) * 71, LH[1] + Math.sin(a2) * 71, LH[2] + 158], .8, { seg: 4 }); }
    G.box('brass', 1532, 12, 544, 1552, 40, 560, { top: 'steel-dk', cover: true });   // the lens housing (the second cover)
    { const gate = [LHS.a0 + LHS.sEnd - 13 * DEG, LHS.a0 + LHS.sEnd + 13 * DEG].map(a => [LH[0] + Math.cos(a) * 71, LH[1] + Math.sin(a) * 71]);   // the gate in the railing at the stair's top
      for (const [x, y] of gate) G.box('steel-dk', x - 1.5, y - 1.5, 544, x + 1.5, y + 1.5, 572, { solid: false }); G.tube('steel-dk', [gate[0][0], gate[0][1], 571], [gate[1][0], gate[1][1], 571], 1, { seg: 4 }); }
    G.box('timber', LH[0] - 36, -12, 400, LH[0] - 30, 12, 432, { solid: false });   // the door
    KIT.house(G, 1420, 120, 1500, 230, 54, { mat: 'plaster', roof: 'slate', lit: true });   // the keeper's house
    KIT.house(G, 1420, -230, 1490, -130, 48, { mat: 'timber', roof: 'slate', lit: true });
    G.box('stone', 1390, -40, 400, 1404, -10, 418, { cover: true }); G.box('stone', 1390, 14, 400, 1404, 44, 418, { cover: true });    // the players' low wall
    KIT.crates(G, 1460, -60, 400, 2, 1, 2, 15); KIT.barrel(G, 1470, 70, 400); G.box('planks', 1500, 20, 400, 1516, 54, 418, { cover: true });
    // the outside stair: one stone step every 10 degrees, a bracket to the tower every 40, an iron handrail on the outside
    { const ds = 10 * DEG, n = Math.round(LHS.sEnd / ds);
      for (let k = 0; k < n; k++) { const sm = (k + .5) * ds, c = stairAt(sm), top = LHS.z0 + (k + 1) * ds * LHS.k, hw = LHS.r * ds / 2 + .8; G.box('stone', c[0] - (LHS.r1 - LHS.r0) / 2, c[1] - hw, top - 5, c[0] + (LHS.r1 - LHS.r0) / 2, c[1] + hw, top, { yaw: LHS.a0 + sm, top: 'cobble-wet', solid: false }); }
      for (let s = 20 * DEG; s < LHS.sEnd; s += 40 * DEG) { const a = stairAt(s, 30), b = stairAt(s, LHS.r1 - 3); G.tube('iron', [a[0], a[1], a[2] - 22], [b[0], b[1], b[2] - 5.5], 1.1, { seg: 4 }); }
      let prev = null; for (let s = 0; s <= LHS.sEnd + 1e-6; s += 15 * DEG) { const p = stairAt(s, LHS.r1 - 1); G.cyl('iron', p[0], p[1], p[2], .7, 13, { seg: 4, caps: false }); const t = [p[0], p[1], p[2] + 13]; if (prev) G.tube('iron', prev, t, .7, { seg: 4 }); prev = t; } }
    for (const [x, y] of [[1420, -40], [1420, 40], [1600, -120], [1600, 120]]) KIT.lamp(G, x, y, 400, 'glow-amber', 34, .6);
  },
  /** the lighthouse beam sweeps: a dynamic light and visible edges */
  lights(R3, sim, t) { const a = t * .78, b = [LH[0] + Math.cos(a) * 40, LH[1] + 34 + Math.sin(a) * 40, LH[2] + 158]; R3.addLight(b[0], b[1], b[2], 160, .7); },
  draw(R, sim, t) {
    const a = t * .78, c = [LH[0], LH[1] + 34, LH[2] + 158];
    R.mesh('lens', mat34(LH[0], LH[1] + 34, LH[2] + 144, a), {});
    for (const off of [-.08, .08]) R.line(c, [c[0] + Math.cos(a + off) * 900, c[1] + Math.sin(a + off) * 900, c[2] - 60], [120, 110, 70]);
    R.glow(c, 22, [255, 240, 180], .7);
    for (const id of ['funi', 'funi2']) { const C = sim.carriers[id]; if (C && C.M && id === 'funi2' && sim.scene.id === '2-3') R.R3.drawMesh(meshOf('funicular'), C.M, {}); }
  },
  setup(sim) { sim.carriers.funi2.d = 0; sim.poseCarrier(sim.carriers.funi2); },
  scenes: ['2-1', '2-2', '2-3', '2-4', '2-B'], intro: 'c2-intro', outro: 'c2-outro'
});

def('scene', '2-1', { title: "GULL'S REST", time: 70,
  arrive: { start: [-180, 0, 24], path: [[-100, 0, 24], [0, -10, 26]], speed: 120, walk: true },
  slots: [
    { stand: { at: [40, -28, 27], look: [300, -20, 50] }, cover: { at: [44, -40, 15], look: [300, -60, 30] } },
    { stand: { at: [40, 26, 27], look: [300, 20, 50] }, cover: { at: [44, 38, 15], look: [300, 60, 30] } }],
  covers: { w1: { at: [217, -70, 47], h: 14, ledge: true, floor: 20 }, w2: { at: [341, -70, 58], h: 14, ledge: true, floor: 31 }, w3: { at: [341, 70, 58], h: 14, ledge: true, floor: 31 }, w4: { at: [217, 70, 47], h: 14, ledge: true, floor: 20 },
    k1: { at: [306, 0, 28], h: 18 }, k2: { at: [320, 48, 29], h: 16, peek: ['up', 'left'] }, k3: { at: [230, -50, 21], h: 26 } },
  waves: [
    { at: .5, spawn: [['deckhand', 'w1'], ['deckhand', 'w3', { delay: .5 }], ['deckhand', 'w2', { delay: 1 }]] },
    { after: 'clear', spawn: [['rusher', null, { from: [420, -20, 38] }], ['rusher', null, { from: [430, 30, 39], delay: 1.2 }]], cue: 'rusher' },
    { after: 'clear', spawn: [['rusher', null, { from: [420, 0, 38] }], ['rusher', null, { from: [430, -40, 39], delay: .8 }], ['rusher', null, { from: [440, 40, 40], delay: 1.6 }]] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [[250, -140, 23], [250, -60, 23], [262, 140, 24]], drop: 'sg', amount: 8 }], ['marine', 'k1', { entry: 'run', from: [420, -10, 38] }], ['marine', 'k2', { entry: 'run', from: [420, 50, 38] }], ['deckhand', 'w4']] }],
  civilians: [{ at: 1.5, route: [[110, 60, 10], [126, 66, 11]], look: 2, say: ['fisher', 'Not me! Not me!'] }],
  objects: [['window', [130, -70, 36], { yaw: Math.PI / 2 }], ['window', [192, 70, 40], { yaw: Math.PI / 2 }], ['window', [376, -70, 50], { yaw: Math.PI / 2 }], ['lifering', [340, 66, 48], { yaw: Math.PI / 2 }], ['lanternR', [200, 0, 60]], ['lantern', [330, 10, 72]]],
  cues: [{ at: 0, say: ['juno', 'Storm\'s getting worse. Watch the windows!'] }, { on: 'rusher', say: ['juno', "Blades! Don't let them get close!"] }, { on: 'spawn:quartermaster', say: ['juno', 'Ammo runner in the alley!'] }]
});

def('scene', '2-2', { title: 'NET LOFTS', time: 75,
  arrive: { path: [[240, 0, 50], [400, 0, 62], [470, 0, 64]], speed: 140, walk: true },
  slots: [
    { stand: { at: [500, -24, 64], look: [700, -20, 80] }, cover: { at: [498, -34, 52], look: [700, -70, 60] } },
    { stand: { at: [500, 26, 64], look: [700, 20, 80] }, cover: { at: [498, 36, 52], look: [700, 70, 60] } }],
  covers: { n1: { at: [606, -60, 40], h: 28, peek: ['left', 'right'] }, n2: { at: [624, 36, 40], h: 18, peek: ['up', 'left'] }, u1: { at: [632, -60, 92], h: 14, ledge: true, floor: 40 }, u2: { at: [632, 0, 92], h: 14, ledge: true, floor: 40 }, u3: { at: [632, 60, 92], h: 14, ledge: true, floor: 40 },
    r1: { at: [600, -10, 40], h: 1, peek: ['up'], noRelocate: true }, r2: { at: [650, 20, 40], h: 1, noRelocate: true }, r3: { at: [660, -40, 40], h: 1, noRelocate: true } },
  waves: [
    { at: .5, spawn: [['shield', null, { from: [600, 80, 92], entry: 'run', advance: [[580, 60, 60], [580, 20, 40], [560, 0, 40]] }], ['deckhand', 'n1']], cue: 'shield' },
    { after: 'clear', spawn: [['marine', 'r1', { entry: 'rappel', ropeH: 128 }], ['deckhand', 'r2', { entry: 'rappel', ropeH: 128, delay: .6 }], ['deckhand', 'r3', { entry: 'rappel', ropeH: 128, delay: 1.2 }]], cue: 'ropes' },
    { after: 'clear', spawn: [['redtide', 'u1', { entry: 'run', from: [680, -100, 92] }], ['deckhand', 'u3', { entry: 'run', from: [680, 100, 92], delay: .8 }], ['grenadier', 'u2', { entry: 'run', from: [690, 0, 92], delay: 2.5 }]] }],
  objects: [['barrel', [690, -80, 40], { onBreak: 'oil' }], ['barrel', [690, 80, 40], { onBreak: 'oil' }], ['barrel', [650, -90, 92]], ['intel', [610, 100, 92], { n: 2 }], ['lantern', [560, -30, 130]], ['lantern', [640, 40, 130]]],
  cues: [{ on: 'shield', say: ['juno', 'Shield! Knock it aside with the shotgun!'], prompt: 'shield' }, { on: 'ropes', say: ['rook', "Ropes! They're coming through the roof!"] }, { on: 'oil', say: ['rook', 'Fish oil. Burns like a bad breakup.'] }]
});

def('scene', '2-3', { title: 'FUNICULAR', time: 60, carrier: 'funi', carrierHold: 600, holds: [[12, 'w0'], [181, 'w2'], [351, 'w3']],
  arrive: { path: [[620, -20, 64], [720, -30, 66], [760, -30, 68]], speed: 140, walk: true },
  slots: [
    { stand: { at: [-6, -6, 24], yaw: 0, pitch: 16 }, cover: { at: [-12, -6, 13], yaw: 0, pitch: 4 } },
    { stand: { at: [8, 6, 24], yaw: 4, pitch: 16 }, cover: { at: [2, 6, 13], yaw: 4, pitch: 4 } }],
  covers: { t1: { at: [900, -76, 143], h: 0, ledge: true, floor: 60 }, t2: { at: [1040, 76, 237], h: 0, ledge: true, floor: 150 }, t3: { at: [1180, -76, 330], h: 0, ledge: true, floor: 240 },
    p1: { at: [1520, -40, 544], h: 14, peek: ['up', 'left'], noRelocate: true }, p2: { at: [1514, 30, 544], h: 14, peek: ['up', 'right'], noRelocate: true }, p3: { at: [1510, -6, 544], h: 14, noRelocate: true } },
  waves: [
    { atD: 2, spawn: [['deckhand', 't1', { entry: 'run', from: [900, -120, 143] }], ['marine', 't1', { entry: 'stand', delay: .5 }]] },
    { atD: 120, do: sim => { sim.flags.passing = true; }, spawn: [['gunner', null, { entry: 'stand', carrier: 'funi2', local: [0, -6, 4], from: [1300, 30, 404] }], ['deckhand', null, { entry: 'stand', carrier: 'funi2', local: [-14, 6, 4], from: [1300, 30, 404] }], ['deckhand', null, { entry: 'stand', carrier: 'funi2', local: [14, 6, 4], from: [1300, 30, 404] }]], cue: 'passing' },
    { atD: 165, spawn: [['deckhand', 't2', { entry: 'run', from: [1040, 120, 237] }], ['redtide', 't2', { entry: 'roll', from: [1060, 120, 237], delay: .8 }]] },
    { atD: 335, spawn: [['deckhand', 't3', { entry: 'run', from: [1180, -120, 330] }], ['deckhand', 't3', { entry: 'stand', delay: .5 }]] },
    { atD: 590, do: sim => spawnBoss(sim, 'gull'), cue: 'gull' },
    { on: 'gull-down', spawn: [['quartermaster', null, { route: [[1330, -100, 400], [1330, 100, 400]], drop: 'mg' }]] }],
  objects: [['lifering', [960, -60, 210], { yaw: Math.PI / 2 }]],
  cues: [{ at: 0, say: ['mari', "The funicular's the only way up the cliff."] }, { on: 'passing', say: ['juno', "Car coming down! It's full of them!"] }, { on: 'gull', say: ['juno', 'Laser sight! Sniper on the lighthouse!'] }],
  tick: (sim, dt) => { const C2 = sim.carriers.funi2; if (sim.flags.passing && C2.d < C2.path.length - 1) { C2.d = Math.min(C2.path.length - 1, C2.d + 95 * dt); sim.poseCarrier(C2); } }
});

/** a deckhand's spot on the stair (a ledge: shot, he falls to the courtyard), facing the landing */
function stairCover(s) { const p = stairAt(s), l = stairAt(LANDING); return { at: p, h: 10, ledge: true, floor: 400, noRelocate: true, stair: true, noCheck: true, face: Math.atan2(l[1] - p[1], l[0] - p[0]) / DEG }; }
/** the landing: players 1 and 2 side by side on the step, 3 and 4 two steps below; they look up at the turn above */
const CLIMB = {
  slots: (() => { const foes = [STAIR_FOES.t1, STAIR_FOES.t2].map(s => stairAt(s)), look = [(foes[0][0] + foes[1][0]) / 2, (foes[0][1] + foes[1][1]) / 2, (foes[0][2] + foes[1][2]) / 2 + 22];
    return [[LANDING, 77], [LANDING, 85], [LANDING - 14 * DEG, 77], [LANDING - 14 * DEG, 85]].map(([s, r]) => { const p = stairAt(s, r); return { stand: { at: [p[0], p[1], p[2] + EYE], look }, cover: { at: [p[0], p[1], p[2] + EYE_COVER], look: [look[0], look[1], look[2] - 30] } }; }); })(),
  /** from the courtyard wall, round the crates to the stair's foot, and up it to the landing */
  path: () => [[1420, -30, 424], [1470, -40, 424]].concat(stairPath(0, LANDING - 6 * DEG))
};
TC.CLIMB = CLIMB;
def('scene', '2-4', { title: 'LIGHTHOUSE KEEP', time: 85,
  arrive: { path: [[1310, -30, 428], [1350, -10, 424], [1376, 0, 424]], speed: 120, walk: true },
  slots: [
    { stand: { at: [1384, -26, 424], look: [1560, -20, 430] }, cover: { at: [1380, -26, 412], look: [1560, -60, 410] } },
    { stand: { at: [1384, 30, 424], look: [1560, 20, 430] }, cover: { at: [1380, 30, 412], look: [1560, 60, 410] } }],
  covers: { y1: { at: [1476, -60, 400], h: 28 }, y2: { at: [1526, 36, 400], h: 18, peek: ['up', 'left'] }, y3: { at: [1484, 70, 400], h: 17 },
    door: { at: [1516, 0, 400], h: 40, noRelocate: true }, hw1: { at: [1504, 96, 400], h: 40, peek: ['left', 'up'], noRelocate: true },
    t1: stairCover(STAIR_FOES.t1), t2: stairCover(STAIR_FOES.t2) },
  waves: [
    { at: .5, spawn: [['marine', 'y1'], ['marine', 'y3', { delay: .5 }], ['redtide', 'y2', { entry: 'roll', from: [1600, 80, 400], delay: 1.5 }]] },
    { after: 'clear', spawn: [['captor', 'door', { hostage: 'tejada', side: 1 }]], say: ['captor', 'One more step and the old man swims!'], do: sim => sim.say('kai', 'Easy... easy...') },
    { after: 'clear', spawn: [['rusher', null, { from: [1470, 160, 400] }], ['rusher', null, { from: [1470, -170, 400], delay: 1 }], ['deckhand', 'hw1', { entry: 'door', from: [1500, 150, 400] }]] },
    // up the outside stair to the landing (the clock stops while they climb), then two deckhands on the turn above
    { after: 'clear', say: ['kai', 'Up the stairs. Move!'], do: sim => sim.climb(CLIMB.slots, CLIMB.path(), 100, 'landing') },
    { on: 'landing', say: ['juno', 'Two on the stairs above you!'], spawn: [['deckhand', 't1', { entry: 'run', from: stairAt(STAIR_FOES.t1 + 22 * DEG) }], ['deckhand', 't2', { entry: 'run', from: stairAt(STAIR_FOES.t2 - 22 * DEG), delay: .7 }]] }],
  objects: [['window', [1420, 160, 30 + 400], { yaw: Math.PI / 2 }], ['window', [1420, -180, 26 + 400], { yaw: Math.PI / 2 }], ['barrel', [1600, -150, 400]], ['lantern', [1450, 0, 450]], ['intel', [1470, 70, 417], { n: 3 }]],
  cues: [{ at: 0, say: ['rook', 'Courtyard. Stay low.'] }, { on: 'kill:captor', say: ['mari', 'Papa! Get down!'] }]
});

def('scene', '2-B', { title: 'THE LANTERN GALLERY', time: 120, boss: 'hammerhead',
  arrive: { path: from => { const s0 = from ? stairS([from.x, from.y, from.z]) : -1, g = stairAt(LHS.sEnd, 66); return (s0 >= 0 ? stairPath(s0 + 10 * DEG, LHS.sEnd) : [[1420, -30, 424], [1470, -40, 424]].concat(stairPath(0, LHS.sEnd))).concat([[g[0], g[1], LHS.z1 + EYE]]); }, speed: 110, walk: true },
  slots: [
    { stand: { at: [1500, -26, 568], look: [1620, -24, 560] }, cover: { at: [1494, -32, 556], look: [1620, -60, 548] } },
    { stand: { at: [1500, -6, 568], look: [1620, -4, 560] }, cover: { at: [1494, 2, 556], look: [1620, 30, 548] } }],
  alt: [
    { stand: { at: [1524, 20, 568], look: [1620, -20, 560] }, cover: { at: [1520, 26, 556], look: [1620, 26, 548] } },
    { stand: { at: [1528, 36, 568], look: [1620, 0, 560] }, cover: { at: [1524, 40, 556], look: [1620, 50, 548] } }],
  covers: {},
  waves: [],
  cues: [{ at: 0, say: ['hammerhead', 'LITTLE AGENTS. BIG MISTAKE.'] }]
});
