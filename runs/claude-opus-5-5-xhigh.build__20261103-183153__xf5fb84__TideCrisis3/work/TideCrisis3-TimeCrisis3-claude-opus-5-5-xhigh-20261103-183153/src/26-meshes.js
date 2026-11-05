/* 26-meshes: the moving machines as local meshes (built once, drawn with a transform): our speedboat, the Stingray
 * gunboat and its turret, the Bulldog truck, jet skis, drones, the Seawolf gunship (body, rotor, pods), the Scylla
 * walker (body, leg segments, claws, cockpit), the funicular cars, the glass lift, turbines, the lighthouse lens, the
 * Hammerhead's hatch-door shield, the master lever. Local frame: x forward, y right, z up. */
const MESHDEF = {};
const MESH = new Map();
function meshDef(id, fn) { MESHDEF[id] = fn; }
function meshOf(id) { let m = MESH.get(id); if (!m) { const G = new Builder({ local: true, maxEdge: 64 }); MESHDEF[id](G); m = G.mesh(); MESH.set(id, m); } return m; }
TC.meshOf = meshOf; TC.MESHDEF = MESHDEF;
meshDef('speedboat', G => {
  G.box('hull-white', -44, -16, -10, 34, 16, 0, { top: 'pier', skip: '' });
  G.lathe('hull-white', 34, 0, -10, [[16, 0], [12, 6], [0, 10]], { seg: 4 });
  G.box('hull-red', -44.5, -16.5, -10, 34, 16.5, -5, { skip: 'tb', solid: false });
  // armored gunwale plates (the cover) along both sides and the bow
  G.box('panel-dark', -44, -17, 0, 30, -14, 14); G.box('panel-dark', -44, 14, 0, 30, 17, 14);
  G.box('panel-dark', 26, -14, 0, 30, 14, 10);
  G.box('steel-dk', -40, -9, 0, -30, 9, 12, { top: 'steel' }); G.box('glass', -30, -9, 12, -29, 9, 18, { solid: false });   // the helm and windscreen at the stern
  G.cyl('steel', -40, 0, 0, 3, 20, { seg: 6 }); G.box('glow-red', -41, -1, 20, -39, 1, 22, { solid: false });
});
meshDef('stingray', G => {
  G.box('hull-dark', -70, -20, -12, 60, 20, 6, { top: 'steel-dk' });
  G.lathe('hull-dark', 60, 0, -12, [[20, 0], [14, 10], [0, 18]], { seg: 4 });
  G.box('hull-red', -70.5, -20.5, -12, 60, 20.5, -6, { skip: 'tb', solid: false });
  G.box('panel-dark', -20, -14, 6, 14, 14, 30, { top: 'steel-dk' }); G.box('tower-windows', 13.5, -12, 20, 14.5, 12, 28, { solid: false });   // the armored bridge
  G.box('panel-dark', -10, -18, 30, 6, 18, 33);                                                                 // the bridge wing
  G.cyl('steel', -6, 0, 33, 1.5, 22, { seg: 5 }); G.box('glow-red', -7, -1, 55, -5, 1, 57, { solid: false });
  KIT.rail(G, [-68, -19, 6], [58, -19, 6], 8, 'steel'); KIT.rail(G, [-68, 19, 6], [58, 19, 6], 8, 'steel');
  G.box('panel-dark', -68, -19, 6, -40, -16, 12); G.box('panel-dark', 30, -19, 6, 56, -16, 12);
});
meshDef('turret', G => { G.cyl('hull-gun', 0, 0, 0, 7, 6, { seg: 10 }); G.box('panel-dark', -5, -6, 6, 6, 6, 12); G.tube('steel-dk', [4, -3, 9], [22, -3, 9], 1.4, { seg: 6 }); G.tube('steel-dk', [4, 3, 9], [22, 3, 9], 1.4, { seg: 6 }); });
meshDef('bulldog', G => {
  G.box('hull-gun', -36, -18, 8, 30, 18, 34, { top: 'panel-dark' }); G.box('hull-gun', 30, -16, 8, 46, 16, 28, { top: 'panel-dark' });
  G.box('glass', 45.5, -12, 18, 46.5, 12, 26, { solid: false }); G.box('steel-dk', 44, -18, 4, 50, 18, 12);
  for (const x of [-24, 0, 34]) for (const y of [-19, 19]) G.tube('rubber', [x, y - 4, 9], [x, y + 4, 9], 9, { seg: 10 });
  G.box('panel-dark', -10, -12, 34, 10, 12, 44);                                    // the gun shield
  G.box('hazard', 46.5, -18, 8, 47, 18, 12, { solid: false });
});
meshDef('fueltank', G => { G.tube('paint-orange', [-14, 0, 0], [14, 0, 0], 6, { seg: 10 }); G.tube('hazard', [-3, 0, 0], [3, 0, 0], 6.3, { seg: 10 }); });
meshDef('jetski', G => { G.box('paint-yellow', -12, -5, -2, 10, 5, 4, { top: 'rubber' }); G.lathe('paint-yellow', 10, 0, -2, [[5, 0], [3, 3], [0, 6]], { seg: 4 }); G.box('rubber', -6, -3, 4, 2, 3, 7); G.box('steel-dk', 4, -5, 6, 6, 5, 8); });
meshDef('drone', G => { G.box('steel-dk', -5, -5, -2, 5, 5, 2); G.box('panel-dark', -3, -3, -4, 3, 3, -2); for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { G.tube('steel', [0, 0, 0], [x, y, 0], .6, { seg: 4 }); G.cyl('rubber', x, y, 1, 4, .6, { seg: 8 }); } G.box('glow-red', 5, -1.5, -1, 5.6, 1.5, 1, { solid: false }); });
meshDef('seawolf', G => {
  G.lathe('hull-gun', -10, 0, 0, [[0, -20], [9, -16], [11, 0], [9, 16], [0, 22]].map(([r, z]) => [r, z]), { seg: 10 });
  G.box('hull-gun', -10, -10, -10, 22, 10, 8, { top: 'panel-dark' }); G.box('glass', 21.5, -8, -6, 24, 8, 4, { solid: false });
  G.box('hull-gun', -70, -3, -2, -10, 3, 5); G.box('hull-gun', -74, -2, -2, -66, 2, 14); G.box('glow-red', -75, -1, 12, -73, 1, 14, { solid: false });
  G.box('steel-dk', -12, -28, -6, 2, 28, -4);   // the short wings (the pods hang under them)
  G.cyl('steel-dk', 0, 0, 8, 3, 6, { seg: 8 });
});
meshDef('rotor', G => { for (const a of [0, Math.PI / 2]) G.box('steel-dk', -46 * Math.cos(a) - 2 * Math.sin(a), -46 * Math.sin(a) - 2 * Math.cos(a), 0, 46 * Math.cos(a) + 2 * Math.sin(a), 46 * Math.sin(a) + 2 * Math.cos(a), 1, { solid: false }); G.cyl('steel', 0, 0, -2, 3, 4, { seg: 8 }); });
meshDef('pod', G => { G.tube('panel-dark', [-10, 0, 0], [10, 0, 0], 4, { seg: 8 }); G.box('glow-amber', 9.6, -2, -2, 10.6, 2, 2, { solid: false }); });
meshDef('scylla-body', G => {
  G.lathe('hull-gun', 0, 0, -12, [[0, 0], [30, 4], [36, 12], [32, 22], [18, 28], [0, 30]], { seg: 12 });
  G.box('panel-dark', 18, -12, 4, 40, 12, 22, { top: 'steel-dk' });             // the armored cockpit
  G.box('glass', 39.5, -8, 10, 41, 8, 18, { solid: false });
  for (const s of [-1, 1]) G.box('panel-dark', -20, s * 26 - 6, 14, 0, s * 26 + 6, 26);   // missile pods
  G.box('glow-red', 34, -4, 22, 38, 4, 24, { solid: false });
});
meshDef('scylla-hatch', G => { G.box('hull-gun', 0, -12, 0, 22, 12, 4); });
meshDef('leg', G => { G.tube('hull-gun', [0, 0, 0], [1, 0, 0], 3.2, { seg: 6 }); });
meshDef('knee', G => { G.lathe('glow-amber', 0, 0, -4, [[0, 0], [4, 1], [4.5, 4], [4, 7], [0, 8]], { seg: 8 }); });
meshDef('claw', G => { G.box('hull-gun', 0, -6, -5, 26, 6, 5); G.tube('steel-dk', [24, 0, 0], [40, 0, 0], 2.2, { seg: 6 }); G.box('panel-dark', 20, -8, 2, 30, -2, 8); });
meshDef('funicular', G => {
  G.box('paint-green', -24, -14, 0, 24, 14, 4, { top: 'planks' }); G.box('paint-green', -24, -14, 4, 24, -12, 16); G.box('paint-green', -24, 12, 4, 24, 14, 16);
  G.box('paint-green', 20, -12, 4, 24, 12, 16); G.box('glass', -24, -14, 16, 24, -13, 30, { solid: false }); G.box('glass', -24, 13, 16, 24, 14, 30, { solid: false });
  G.box('paint-green', -26, -15, 30, 26, 15, 34); G.box('planks', -8, -12, 4, 0, 12, 13);   // the bench (cover)
  G.box('glow-amber', -2, -2, 28, 2, 2, 30, { solid: false });
});
/** the car the players ride up the cliff (2-3): open above the waist, so the roof, its lamp and the side glass never fill
 *  the view of the terraces; the car coming down (full of them) keeps the closed body */
meshDef('funicular-open', G => {
  G.box('paint-green', -24, -14, 0, 24, 14, 4, { top: 'planks' }); G.box('paint-green', -24, -14, 4, 24, -12, 15); G.box('paint-green', -24, 12, 4, 24, 14, 15);
  G.box('paint-green', 20, -12, 4, 24, 12, 15); G.box('paint-green', -24, -12, 4, -20, 12, 15); G.box('brass', -24, -14, 15, 24, -12, 16.5, { solid: false }); G.box('brass', -24, 12, 15, 24, 14, 16.5, { solid: false }); G.box('brass', 20, -12, 15, 24, 12, 16.5, { solid: false });
  G.box('planks', -8, -12, 4, 0, 12, 13);   // the bench (cover)
});
meshDef('lift', G => {
  G.box('steel', -20, -20, 0, 20, 20, 3, { top: 'grate' }); G.box('steel-dk', -20, -20, 52, 20, 20, 55);
  for (const [x, y] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) G.box('steel', x - 1.5, y - 1.5, 3, x + 1.5, y + 1.5, 52);
  G.box('glass', -20, -20, 14, 20, -19, 52, { solid: false }); G.box('glass', -20, 19, 14, 20, 20, 52, { solid: false }); G.box('steel', 19, -20, 14, 20, 20, 16, { solid: false });
  G.box('panel-dark', -2, -16, 3, 10, 16, 16, { top: 'glow-teal' });   // the console (cover)
  G.box('grate', 20, -20, 0, 42, 20, 3, { side: 'steel' }); G.box('steel', 41, -20, 3, 42, 20, 14); G.box('steel', 20, -20, 3, 42, -19, 14); G.box('steel', 20, 19, 3, 42, 20, 14);   // the outer platform
});
/** the lift from inside (3-4): its frame, roof and console without the two glass panes, which up close were all streaks */
meshDef('lift-open', G => {
  G.box('steel', -20, -20, 0, 20, 20, 3, { top: 'grate' }); G.box('steel-dk', -20, -20, 52, 20, 20, 55);
  for (const [x, y] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) G.box('steel', x - 1.5, y - 1.5, 3, x + 1.5, y + 1.5, 52);
  G.box('steel', -20, -20, 14, 20, -19, 16, { solid: false }); G.box('steel', -20, 19, 14, 20, 20, 16, { solid: false }); G.box('steel', 19, -20, 14, 20, 20, 16, { solid: false });   // the waist rails
  G.box('panel-dark', -2, -16, 3, 10, 16, 16, { top: 'glow-teal' });   // the console (cover)
  G.box('grate', 20, -20, 0, 42, 20, 3, { side: 'steel' }); G.box('steel', 41, -20, 3, 42, 20, 14); G.box('steel', 20, -20, 3, 42, -19, 14); G.box('steel', 20, 19, 3, 42, 20, 14);   // the outer platform
});
meshDef('turbine', G => { G.cyl('steel', 0, 0, -6, 10, 12, { seg: 10 }); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; G.box('panel-steel', -2, 8, -4, 2, 46, 4, { yaw: a, solid: false }); } });
meshDef('lens', G => { G.cyl('lens', 0, 0, 0, 14, 26, { seg: 8 }); G.cyl('brass', 0, 0, -3, 15, 3, { seg: 8 }); G.cyl('brass', 0, 0, 26, 15, 3, { seg: 8 }); });
meshDef('hatchshield', G => { G.box('rust', -1.5, -10, 0, 1.5, 10, 30); G.box('steel-dk', -2, -8, 18, -1.5, -2, 24); G.box('iron', -2, 4, 12, -1.5, 8, 14); });
meshDef('lever', G => { G.box('steel-dk', -4, -4, 0, 4, 4, 22); G.tube('hazard', [0, 0, 20], [0, 0, 44], 1.6, { seg: 6 }); G.box('glow-red', -3, -3, 44, 3, 3, 48, { solid: false }); });
meshDef('riotshield', G => { G.box('glass', -1, -7, 0, 1, 7, 26, { solid: false }); G.box('steel-dk', -1.4, -7, 0, -1, 7, 3, { solid: false }); });
meshDef('rope', G => { G.tube('rope', [0, 0, 0], [0, 0, 1], .5, { seg: 4 }); });
meshDef('crate1', G => { G.box('crate', -7, -7, 0, 7, 7, 13); });
