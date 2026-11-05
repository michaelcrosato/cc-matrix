// The Patchwork Realm around Thimbleton (144 x 144 columns, 24 levels) and the Bee's Bumblebee Meadow (48 x 48 x 16).
// Deterministic from the seed: regions, heightmap, layers, ores, water, trees, plants, stamps, portals.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = 16, id = DQ.blockId;
const N = (x, y, s, f) => E.noise2(x / f + s * 31.7, y / f + s * 17.3);
const hh = DQ.hash3;

// ---- the world's places (cells) ----
DQ.WORLD = {
  W: 144, D: 144, H: 24,
  banner: [72, 76], town: [72, 76],
  regions: {
    hollow: { name: 'Lint Hollow', music: 'hollow' }, glen: { name: 'Gingham Glen', music: 'glen' }, town: { name: 'Thimbleton', music: 'town' },
    crags: { name: 'Corduroy Crags', music: 'crags' }, quarry: { name: 'Button Quarry', music: 'crags' }, tweedwood: { name: 'Tweedwood', music: 'tweedwood' },
    coast: { name: 'Calico Coast', music: 'glen' }, verge: { name: 'Frayed Verge', music: 'fraying' }, fraying: { name: 'The Fraying', music: 'fraying' }, rift: { name: 'The Rift', music: 'fraying' }
  },
  // points of interest: [x, y, level or null (the surface)]
  poi: {
    hollowStart: [36, 41, 7], hollowLedge: [34, 37, 8], tunnelMark: [45, 40, 7], hollowExit: [51, 42, null], bannerSpot: [72, 76, null],
    quarryFloor: [21, 18, 6], spireTop: [124, 124, 22], lintCamp: [116, 30, null], gate: [99, 113, null], riftCenter: [96, 80, null],
    shipwreck: [22, 126, null], ledgeButton: [48, 8, 19], treeButton: [134, 52, null], hallSite: [76, 64, null],
    eastRoad: [96, 76, null], northPath: [72, 52, null], townEdge: [96, 72, null], dummy: [66, 72, null]
  },
  portals: [
    { id: 'thimbleton', name: 'Thimbleton', at: [69, 80] }, { id: 'hollow', name: 'Lint Hollow Exit', at: [54, 44] },
    { id: 'crags', name: 'Corduroy Crags', at: [34, 26] }, { id: 'tweedwood', name: 'Tweedwood', at: [110, 36] },
    { id: 'coast', name: 'Calico Coast', at: [30, 116] }, { id: 'verge', name: 'Frayed Verge', at: [94, 110] }
  ],
  // monster spawns per region: [day table, night table] as [[id, weight]]
  spawns: {
    glen: [[['lintling', 70], ['dyedLintling', 30]], [['lintling', 40], ['mothlet', 60]]],
    coast: [[['pinhog', 100]], [['pinhog', 60], ['mothlet', 40]]],
    crags: [[['lintling', 50], ['pinhog', 50]], [['lintling', 50], ['pinhog', 50]]],
    tweedwood: [[['dyedLintling', 100]], [['mothlet', 50], ['dyedLintling', 50]]],
    verge: [[], [['frayedKnight', 100]]],
    fraying: [[['frayedKnight', 80], ['knotbrute', 20]], [['frayedKnight', 70], ['knotbrute', 30]]],
    rift: [[], [['frayedKnight', 100]]]
  }
};
const P = DQ.WORLD.poi;
DQ.regionAt = (x, y) => {
  if (Math.hypot(x - 96, y - 80) <= 3.5) return 'rift';
  if (Math.hypot(x - 72, y - 76) <= 14) return 'town';
  if (x >= 31 && x <= 50 && y >= 34 && y <= 46) return 'hollow';
  if (x >= 12 && x <= 31 && y >= 9 && y <= 26) return 'quarry';
  if (x >= 99 && y >= 92) return 'fraying';
  if (x >= 90 && x < 99 && y >= 92) return 'verge';
  if (x < 60 && y < 56) return 'crags';
  if (x >= 90 && y < 62) return 'tweedwood';
  if (x < 62 && y >= 98) return 'coast';
  return 'glen';
};

// ---- terrain height (surface level: blocks fill 0 .. s-1) ----
function surface(x, y) {
  const reg = DQ.regionAt(x, y);
  const glen = 9 + Math.round((N(x, y, 1, 18) - .5) * 4);
  let s = glen;
  // the crags rise north-west with ridges
  const cw = E.clamp(Math.min((60 - x) / 10, (56 - y) / 10), 0, 1);
  if (cw > 0) { const ridge = 1 - Math.abs(N(x, y, 2, 11) - .5) * 2; s = Math.round(E.lerp(glen, 11 + ridge * 8 + N(x, y, 3, 5) * 2, cw)); }
  // tweedwood gentle
  if (x >= 90 && y < 62) s = 10 + Math.round((N(x, y, 4, 9) - .5) * 4);
  // the coast slopes down to the sea
  const coastW = E.clamp(Math.min((62 - x) / 8, (y - 98) / 8), 0, 1);
  if (coastW > 0) { const d = Math.max(0, (132 - y)) * .12 + Math.max(0, x - 14) * .05; s = Math.round(E.lerp(s, 5.5 + Math.min(3, d) + (N(x, y, 5, 7) - .5), coastW)); }
  // the fraying: rough
  if (x >= 99 && y >= 92) s = 9 + Math.round((N(x, y, 6, 8) - .5) * 6);
  if (x >= 90 && x < 99 && y >= 92) s = 9;
  // town flattened
  const td = Math.hypot(x - 72, y - 76);
  if (td < 24) s = Math.round(E.lerp(9, s, E.clamp((td - 17) / 7, 0, 1)));
  // around the hollow exit: a plateau at 10
  const ed = Math.hypot(x - 53, y - 43);
  if (ed < 7) s = Math.round(E.lerp(10, s, E.clamp((ed - 4) / 3, 0, 1)));
  return E.clamp(s, 2, 21);
}

function fill(w, x, y, z0, z1, b, o) { for (let z = z0; z < z1; z++) w.set(x, y, z, b, Object.assign({ silent: true }, o)); }
function clearUp(w, x, y, z0) { for (let z = z0; z < w.H; z++) w.set(x, y, z, 0, { silent: true }); }

DQ.generateWorld = (world) => {
  const W = world.W, D = world.D, H = world.H, objs = [], S = new Float32Array(W * D);
  const obj = (oid, x, y, z, o) => objs.push(Object.assign({ id: oid, x, y, z }, o || {}));
  world.genObjects = objs;
  // 1-2: heightmap and layers
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    if (x < 2 || y < 2 || x >= W - 2 || y >= D - 2) continue;   // the outer ring: the Unravel
    const s = surface(x, y), reg = DQ.regionAt(x, y); S[y * W + x] = s;
    world.set(x, y, 0, id('backing'), { silent: true });
    let top = id('grass'), sub = id('earth');
    if (reg === 'coast' && s <= 9) { top = id('sand'); sub = id('sand'); }
    if (reg === 'fraying' || reg === 'verge') { top = id('frayed'); sub = id('earth'); }
    if ((reg === 'crags' || reg === 'quarry') && s >= 12) { top = id('stone'); sub = id('stone'); }
    for (let z = 1; z < s; z++) world.set(x, y, z, z === s - 1 ? top : z >= s - 4 ? sub : id('stone'), { silent: true });
    // gravel on steep crag slopes
    if ((reg === 'crags') && s >= 12) { const sl = Math.abs(surface(x + 1, y) - s) + Math.abs(surface(x, y + 1) - s); if (sl >= 3 && hh(x, y, 9) < .6) world.set(x, y, s - 1, id('gravel'), { silent: true }); }
  }
  // 3: ores in the crags (exposed blobs on the slopes)
  const oreR = E.rng(DQ.SEED ^ 77);
  for (let k = 0; k < 70; k++) {
    const x = 6 + Math.floor(oreR() * 52), y = 6 + Math.floor(oreR() * 48);
    if (DQ.regionAt(x, y) !== 'crags' && DQ.regionAt(x, y) !== 'quarry') continue;
    const s = world.topZ(x, y), ore = k % 2 ? id('copperOre') : id('coal'), n = 4 + Math.floor(oreR() * 4);
    for (let i = 0; i < n; i++) { const ox = x + Math.floor(oreR() * 3) - 1, oy = y + Math.floor(oreR() * 3) - 1, oz = world.topZ(ox, oy) - 1 - Math.floor(oreR() * 2); if (oz >= 2 && world.get(ox, oy, oz) && world.get(ox, oy, oz) !== id('backing')) world.set(ox, oy, oz, ore, { silent: true }); }
  }
  // a guaranteed coal and copper seam close to the hollow exit (the club's first stone and coal)
  for (const [x, y, b] of [[56, 38, 'coal'], [57, 38, 'coal'], [56, 37, 'stone'], [57, 37, 'stone'], [58, 37, 'stone'], [58, 38, 'stone'], [55, 37, 'copperOre'], [55, 36, 'copperOre'], [59, 38, 'copperOre'], [59, 37, 'stone']]) { const t = world.topZ(x, y); world.set(x, y, t, id(b), { silent: true }); }
  for (const [x, y] of [[55, 40], [56, 40], [57, 40], [58, 40], [55, 41], [56, 41]]) { const t = world.topZ(x, y); world.set(x, y, t - 1, id('gravel'), { silent: true }); }
  // 4: the stream (1 deep) from the crags down to the coast, and the sea
  let sx = 30, sy = 58;
  for (let i = 0; i < 400 && sy < 136; i++) {
    for (const [dx, dy] of [[0, 0], [1, 0]]) { const x = Math.round(sx) + dx, y = Math.round(sy) + dy; const t = world.topZ(x, y); if (t > 3 && DQ.regionAt(x, y) !== 'town') { clearUp(world, x, y, t - 1); world.set(x, y, t - 1, id('water'), { silent: true }); world.set(x, y, t - 2, id('sand'), { silent: true }); } }
    sy += .5; sx += Math.sin(sy * .13) * .55 - .045;
  }
  for (let y = 98; y < D - 2; y++) for (let x = 2; x < 64; x++) { const t = world.topZ(x, y); if (t > 0 && t < 7) for (let z = t; z < 7; z++) world.set(x, y, z, id('water'), { silent: true }); }
  // 5: trees: groves in the glen, dense in tweedwood (Poisson-ish by hash)
  const tree = (x, y, hgt) => {
    const t = world.topZ(x, y); if (t < 3 || t > 18 || world.get(x, y, t - 1) === id('water') || world.get(x, y, t - 1) === id('sand')) return;
    for (let z = t; z < t + hgt; z++) world.set(x, y, z, id('log'), { silent: true });
    const c = t + hgt;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy + dz * dz * 2 > 6 + hh(x + dx, y + dy, c + dz) * 2) continue;
      const X = x + dx, Y = y + dy, Z = c + dz; if (world.inside(X, Y, Z) && !world.get(X, Y, Z)) world.set(X, Y, Z, id('leaves'), { silent: true });
    }
  };
  for (let y = 4; y < D - 4; y += 1) for (let x = 4; x < W - 4; x += 1) {
    const reg = DQ.regionAt(x, y), q = hh(x, y, 21);
    if (reg === 'tweedwood' && q < .055 && !(Math.hypot(x - 116, y - 30) < 7) && !(Math.hypot(x - 110, y - 36) < 3) && !(Math.hypot(x - 134, y - 52) < 4)) tree(x, y, 3 + Math.floor(hh(x, y, 22) * 3));
    else if (reg === 'glen' && N(x, y, 7, 14) > .72 && q < .06) tree(x, y, 3 + Math.floor(hh(x, y, 22) * 2));
  }
  // dead trees in the fraying
  for (let k = 0; k < 18; k++) { const x = 104 + Math.floor(hh(k, 1, 31) * 34), y = 98 + Math.floor(hh(k, 2, 31) * 38); const t = world.topZ(x, y); if (t) for (let z = t; z < t + 3; z++) world.set(x, y, z, id('log'), { silent: true }); }
  // 7: stamps
  stampHollow(world, obj); stampQuarry(world, obj); stampTown(world, obj); stampLintCamp(world, obj); stampShipwreck(world, obj);
  stampKnotWall(world, obj); stampSpire(world, obj); stampRift(world); stampLedge(world, obj); stampHollowTree(world, obj);
  // void holes in the fraying
  for (let k = 0; k < 7; k++) { const cx = 106 + Math.floor(hh(k, 5, 41) * 30), cy = 100 + Math.floor(hh(k, 6, 41) * 30), r = 1.5 + hh(k, 7, 41) * 1.5; if (Math.hypot(cx - 124, cy - 124) < 10 || Math.abs(cy - 113) < 5) continue; for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) if (Math.hypot(x - cx, y - cy) < r) clearUp(world, x, y, 0); }
  // 6: plants (objects), after the stamps so they sit on the final ground
  for (let y = 3; y < D - 3; y++) for (let x = 3; x < W - 3; x++) {
    const reg = DQ.regionAt(x, y), t = world.topZ(x, y); if (!t) continue;
    const below = world.get(x, y, t - 1); if (below !== id('grass') && below !== id('sand') && below !== id('frayed') && below !== id('earth')) continue;
    if (world.get(x, y, t) || world.get(x, y, t + 1)) continue;
    const q = hh(x, y, 51), td = Math.hypot(x - 72, y - 76);
    let p = null;
    if (reg === 'glen' || (reg === 'town' && td > 9)) {
      if (q < 1 / 12) p = 'tuft'; else if (q < .11) p = 'cottonPuff'; else if (q < .125 && td < 30) p = 'berryBush'; else if (q < .135) p = 'buttercup';
    } else if (reg === 'tweedwood') { if (q < .05) p = 'puffballPlant'; else if (q < .07) p = 'bluebell'; else if (q < .09) p = 'tuft'; }
    else if (reg === 'coast') { if (q < .05) p = 'cottonPuff'; else if (q < .065) p = 'berryBush'; else if (q < .08) p = 'tuft'; }
    else if (reg === 'crags' && below === id('grass')) { if (q < .05) p = 'tuft'; else if (q < .07) p = 'deadBush'; }
    else if (reg === 'fraying' || reg === 'verge') { if (q < .04) p = 'deadBush'; }
    if (p && !objs.some(o => o.x === x && o.y === y)) obj(p, x, y, t);
  }
  // berries, bluebells and puffballs close enough for the early quests
  for (const [x, y, p] of [[64, 88, 'berryBush'], [80, 90, 'berryBush'], [86, 86, 'berryBush'], [58, 70, 'berryBush'], [92, 40, 'puffballPlant'], [94, 44, 'puffballPlant'], [96, 38, 'puffballPlant'], [93, 48, 'bluebell'], [95, 50, 'bluebell'], [91, 46, 'bluebell'], [97, 45, 'bluebell'], [60, 60, 'cottonPuff'], [62, 58, 'tuft'], [64, 57, 'tuft']]) { const t = world.topZ(x, y); if (!objs.some(o => o.x === x && o.y === y)) { clearUp(world, x, y, t); obj(p, x, y, t); } }
  // 8: portals
  for (const p of DQ.WORLD.portals) { const [x, y] = p.at; flatten(world, x - 1, y - 1, x + 1, y + 1); const t = world.topZ(x, y); obj('portal', x, y, t, { portalId: p.id }); }
  // 11: the base snapshot (saves and the network store only what differs)
  world.recomputeTops();
  world.snapshotBase();
  return world;
};
// flatten a rectangle to the level of its middle
function flatten(w, x0, y0, x1, y1, lvl, top) {
  const L = lvl || w.topZ((x0 + x1) >> 1, (y0 + y1) >> 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!w.insideCol(x, y)) continue;
    clearUp(w, x, y, L);
    for (let z = 1; z < L; z++) if (!w.get(x, y, z) || w.get(x, y, z) === id('water') && z >= L - 1) w.set(x, y, z, z === L - 1 ? (top || id('grass')) : id('earth'), { silent: true });
    if (top) w.set(x, y, L - 1, top, { silent: true });
  }
}
DQ.flatten = flatten;

function stampHollow(w, obj) {
  // the rim (13-14) around a 12 x 10 floor at level 7
  for (let y = 31; y <= 49; y++) for (let x = 28; x <= 49; x++) {
    const inF = x >= 32 && x <= 43 && y >= 35 && y <= 44;
    const rim = 10 + (hh(x, y, 61) < .5 ? 1 : 0);
    clearUp(w, x, y, 1); w.set(x, y, 0, id('backing'), { silent: true });
    const L = inF ? 7 : rim;
    for (let z = 1; z < L; z++) w.set(x, y, z, z >= L - 1 ? (inF ? id('earth') : id('stone')) : id('stone'), { silent: true });
  }
  // a ledge one block up (step 1: look around, jump)
  for (const [x, y] of [[33, 36], [34, 36], [33, 37], [34, 37]]) w.set(x, y, 7, id('earth'), { silent: true });
  // loose earth to break, dead bushes for branches
  for (const [x, y] of [[37, 38], [38, 38], [39, 39], [36, 42], [41, 37], [40, 42]]) w.set(x, y, 7, id('earth'), { silent: true });
  for (const [x, y] of [[35, 43], [42, 36], [41, 43], [33, 40]]) obj('deadBush', x, y, 7);
  // the tunnel: 2 high, roofed, from the east wall rising by stairs to the exit plateau at level 10
  const path = [[44, 7], [45, 7], [46, 8], [47, 9], [48, 10], [49, 10]];
  for (const [x, L] of path) for (const y of [40, 41]) {
    clearUp(w, x, y, L); for (let z = 1; z < L; z++) w.set(x, y, z, id('stone'), { silent: true });
    for (let z = L + 2; z <= 11; z++) w.set(x, y, z, id('stone'), { silent: true });
  }
  for (const [x, L] of [[46, 7], [47, 8], [48, 9]]) for (const y of [40, 41]) { w.set(x, y, L, id('stairsPlank'), { silent: true, rot: 0 }); }
  // the exit opening
  for (let x = 50; x <= 52; x++) for (const y of [40, 41, 42]) { clearUp(w, x, y, 10); for (let z = 1; z < 10; z++) if (!w.get(x, y, z)) w.set(x, y, z, id('earth'), { silent: true }); w.set(x, y, 9, id('grass'), { silent: true }); }
}

function stampQuarry(w, obj) {
  // an open pit 16 x 14, floor 6, terraces up to the rim (15)
  const x0 = 14, x1 = 29, y0 = 11, y1 = 24;
  for (let y = y0 - 3; y <= y1 + 3; y++) for (let x = x0 - 3; x <= x1 + 6; x++) {
    const dx = Math.max(x0 - x, x - x1, 0), dy = Math.max(y0 - y, y - y1, 0), d = Math.max(dx, dy);
    const inner = x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const ex = Math.min(x - x0, x1 - x, y - y0, y1 - y);   // distance inside from the edge
    let L = inner ? (ex >= 2 ? 6 : 6 + (2 - ex) * 3) : 15;
    // the ramp from the east (y 17-18), stepping down
    if (y >= 17 && y <= 18 && x >= x1 - 1) L = E.clamp(6 + Math.max(0, x - x1 + 1) * 1, 6, 15);
    clearUp(w, x, y, 1); w.set(x, y, 0, id('backing'), { silent: true });
    for (let z = 1; z < L; z++) w.set(x, y, z, z === L - 1 && L >= 12 ? id('stone') : z >= L - 2 && hh(x, y, z) < .1 ? (hh(x, y, z + 1) < .5 ? id('coal') : id('copperOre')) : id('stone'), { silent: true });
  }
  for (let x = x1 - 1; x <= x1 + 6; x++) for (const y of [17, 18]) { const L = w.topZ(x, y); if (L > 6 && x > x1 - 1) { w.set(x, y, L - 1, id('stairsCobble'), { silent: true, rot: 2 }); } }
  // 4 cobble pillars in the arena
  for (const [x, y] of [[18, 15], [25, 15], [18, 21], [25, 21]]) for (let z = 6; z < 9; z++) w.set(x, y, z, id('cobble'), { silent: true });
}

function stampTown(w, obj) {
  const [bx, by] = DQ.WORLD.banner;
  // flatten the square, plaza 5 x 5 cobble
  flatten(w, bx - 16, by - 16, bx + 16, by + 16, 9);
  for (let y = by - 2; y <= by + 2; y++) for (let x = bx - 2; x <= bx + 2; x++) w.set(x, y, 8, id('cobble'), { silent: true });
  // three 1-high cobble outlines of old houses (hints for room shapes)
  for (const [x0, y0, ww, dd] of [[60, 68, 5, 5], [61, 81, 6, 5], [80, 81, 5, 6]]) {
    for (let y = y0; y < y0 + dd; y++) for (let x = x0; x < x0 + ww; x++) if (x === x0 || y === y0 || x === x0 + ww - 1 || y === y0 + dd - 1) if (hh(x, y, 71) < .82) w.set(x, y, 9, id('ruin'), { silent: true });
  }
  // a broken well, crates and barrels
  obj('well', 67, 71, 9); obj('barrel', 63, 74, 9); obj('crate', 64, 75, 9); obj('sack', 79, 74, 9); obj('barrel', 81, 78, 9); obj('sign', 75, 79, 9); obj('crate', 62, 79, 9); obj('dummy', 66, 73, 9);
  // a pond 3 x 4
  for (let y = 86; y < 90; y++) for (let x = 74; x < 77; x++) w.set(x, y, 8, id('water'), { silent: true });
  // the east road: planks to the world's edge
  for (let x = bx + 3; x <= 141; x++) for (const y of [76, 77]) { const t = w.topZ(x, y); if (t > 2 && DQ.regionAt(x, y) !== 'rift') { clearUp(w, x, y, t); w.set(x, y, t - 1, id('road'), { silent: true }); } }
  // north path toward the glen
  for (let y = 50; y < by - 3; y++) for (const x of [72]) { const t = w.topZ(x, y); if (t > 2) { clearUp(w, x, y, t); w.set(x, y, t - 1, id('earth'), { silent: true }); } }
}

function stampLintCamp(w, obj) {
  const cx = 116, cy = 30; flatten(w, cx - 5, cy - 5, cx + 5, cy + 5);
  const L = w.topZ(cx, cy);
  for (let a = 0; a < 24; a++) { if (a % 6 === 0) continue; const x = Math.round(cx + Math.cos(a / 24 * Math.PI * 2) * 5), y = Math.round(cy + Math.sin(a / 24 * Math.PI * 2) * 5); w.set(x, y, L, id('knot'), { silent: true }); }
  obj('cage', cx, cy, L); obj('sack', cx + 2, cy - 2, L); obj('crate', cx - 2, cy + 2, L);
}
function stampShipwreck(w, obj) {
  const cx = 22, cy = 126; flatten(w, cx - 5, cy - 3, cx + 5, cy + 3, 8, id('sand'));
  const L = 8;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 4; x <= cx + 4; x++) {
    const edge = Math.abs(y - cy) === 2 || Math.abs(x - cx) === 4 || (Math.abs(x - cx) === 3 && Math.abs(y - cy) === 2);
    if (edge && !(x === cx + 4 && y === cy) && hh(x, y, 81) < .85) { w.set(x, y, L, id('planks'), { silent: true }); if (Math.abs(x - cx) < 3 && hh(x, y, 82) < .6) w.set(x, y, L + 1, id('planks'), { silent: true }); }
  }
  w.set(cx, cy, L - 1, id('planks'), { silent: true });
  obj('ancientButton', cx, cy, L, { buttonId: 'coast' }); obj('barrel', cx - 2, cy + 1, L);
}
function stampKnotWall(w, obj) {
  // x 99-100 for y 92-141, and a north side along y 92-93: full height, so only the gate lets anyone through
  for (let y = 92; y <= 141; y++) for (const x of [99, 100]) { w.set(x, y, 0, id('backing'), { silent: true }); for (let z = 1; z < 17; z++) w.set(x, y, z, id('knot'), { silent: true }); }
  for (let x = 99; x <= 141; x++) for (const y of [92, 93]) { w.set(x, y, 0, id('backing'), { silent: true }); for (let z = 1; z < 17; z++) w.set(x, y, z, id('knot'), { silent: true }); }
  // the gate (3 wide x 5 high) at y 112-114: marked so cutting one block rips the whole gate
  w.gate = [];
  flatten(w, 95, 110, 98, 116, 9, id('frayed')); flatten(w, 101, 110, 104, 116, 9, id('frayed'));
  for (let y = 112; y <= 114; y++) for (const x of [99, 100]) for (let z = 9; z < 14; z++) { w.gate.push([x, y, z]); const m = w.meta.get(w.idx(x, y, z)) || {}; m.gate = true; w.meta.set(w.idx(x, y, z), m); }
  for (let y = 112; y <= 114; y++) for (const x of [99, 100]) for (let z = 1; z < 9; z++) w.set(x, y, z, id('stone'), { silent: true });
}
function stampSpire(w, obj) {
  const cx = 124, cy = 124, base = 9;
  flatten(w, cx - 7, cy - 7, cx + 7, cy + 7, base, id('frayed'));
  for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) for (let z = 1; z < 22; z++) w.set(x, y, z, (x + y + z) % 3 === 0 ? id('frayed') : id('knot'), { silent: true });
  // the outer spiral ramp, 2 wide: one lap from level 9 to 22, clockwise from the south-west corner
  const ring = []; const r = 5;
  for (let x = cx - r; x <= cx + r; x++) ring.push([x, cy + r]);
  for (let y = cy + r - 1; y >= cy - r; y--) ring.push([cx + r, y]);
  for (let x = cx + r - 1; x >= cx - r; x--) ring.push([x, cy - r]);
  for (let y = cy - r + 1; y <= cy + r - 1; y++) ring.push([cx - r, y]);
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x, y] = ring[i], L = base + Math.min(13, Math.floor(i * 13 / (n - 4)));
    const out = [x + Math.sign(x - cx) * (Math.abs(x - cx) === r ? 1 : 0), y + Math.sign(y - cy) * (Math.abs(y - cy) === r ? 1 : 0)];
    for (const [X, Y] of [[x, y], out]) { for (let z = 1; z < L; z++) w.set(X, Y, z, z === L - 1 ? id('frayed') : id('knot'), { silent: true }); clearUp(w, X, Y, L); }
    const nx = ring[(i + 1) % n], Ln = base + Math.min(13, Math.floor((i + 1) * 13 / (n - 4)));
    if (Ln > L && i + 1 < n) {   // a stair where the ramp rises
      const dx = nx[0] - x, dy = nx[1] - y, rot = dx > 0 ? 0 : dy > 0 ? 1 : dx < 0 ? 2 : 3;
      for (const [X, Y] of [[x, y], out]) w.set(X, Y, L, id('stairsCobble'), { silent: true, rot });
    }
  }
  // the last cells of the ramp reach the core's top (22): a landing onto it
  obj('threadPedestal', cx, cy, 22);
}
function stampRift(w) { for (let y = 76; y <= 84; y++) for (let x = 92; x <= 100; x++) if (Math.hypot(x - 96, y - 80) <= 3.2) clearUp(w, x, y, 0); }
function stampLedge(w, obj) {
  // a stone pillar at (48, 8) to level 19, with a broken stair of stone around it: one step missing (build it)
  for (let z = 1; z < 19; z++) w.set(48, 8, z, id('stone'), { silent: true });
  clearUp(w, 48, 8, 19);
  const steps = [[47, 9], [46, 9], [45, 8], [45, 7], [46, 6], [47, 6], [48, 6], [49, 6], [50, 7], [50, 8], [50, 9], [49, 10]];
  let L = w.topZ(47, 10) + 1;
  for (let i = steps.length - 1; i >= 0; i--) { const [x, y] = steps[i]; L = Math.min(18, Math.max(L, w.topZ(x, y)) ); }
  const start = Math.max(12, w.topZ(49, 10));
  steps.forEach(([x, y], i) => { const lvl = Math.min(18, start + i); if (i === 6) { clearUp(w, x, y, start); return; } for (let z = 1; z < lvl; z++) w.set(x, y, z, id('stone'), { silent: true }); clearUp(w, x, y, lvl); });
  obj('ancientButton', 48, 8, 19, { buttonId: 'crags' });
}
function stampHollowTree(w, obj) {
  const cx = 134, cy = 52, L = w.topZ(cx, cy); flatten(w, cx - 3, cy - 3, cx + 3, cy + 3, L);
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
    if (x === cx && y === cy) continue;
    for (let z = L; z < L + 6; z++) if (!(x === cx && y === cy + 1 && z < L + 2)) w.set(x, y, z, id('log'), { silent: true });
  }
  for (let z = L + 2; z < L + 6; z++) w.set(cx, cy, z, id('log'), { silent: true });
  for (let dz = 0; dz <= 2; dz++) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy + dz * dz < 10) { const X = cx + dx, Y = cy + dy, Z = L + 6 + dz; if (!w.get(X, Y, Z)) w.set(X, Y, Z, id('leaves'), { silent: true }); }
  obj('ancientButton', cx, cy, L, { buttonId: 'tree' });
}

// ---- the Bee's world: Bumblebee Meadow ----
DQ.BEE = { W: 48, D: 48, H: 16, banner: [24, 26], site: [26, 16], bench: [20, 26], hearth: [21, 27], crate: [22, 28], spawns: [[4, 4], [43, 4], [4, 43], [43, 43]] };
DQ.generateBee = (world) => {
  const W = world.W, D = world.D, objs = []; world.genObjects = objs;
  const obj = (oid, x, y, z, o) => objs.push(Object.assign({ id: oid, x, y, z }, o || {}));
  for (let y = 2; y < D - 2; y++) for (let x = 2; x < W - 2; x++) {
    const s = 5 + Math.round((E.noise2(x / 9 + 3.3, y / 9 + 1.1) - .5) * 2 * (Math.hypot(x - 24, y - 22) > 12 ? 1 : 0));
    world.set(x, y, 0, id('backing'), { silent: true });
    for (let z = 1; z < s; z++) world.set(x, y, z, z === s - 1 ? id('grass') : z >= s - 3 ? id('earth') : id('stone'), { silent: true });
  }
  flatten(world, 14, 12, 34, 32, 5);
  const tr = (x, y) => { const t = world.topZ(x, y); for (let z = t; z < t + 3; z++) world.set(x, y, z, id('log'), { silent: true }); for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 3 && !world.get(x + dx, y + dy, t + 3 + dz)) world.set(x + dx, y + dy, t + 3 + dz, id('leaves'), { silent: true }); };
  for (const [x, y] of [[36, 7], [40, 9], [43, 12], [37, 13], [41, 6], [35, 10]]) tr(x, y);
  for (const [x, y] of [[5, 7], [9, 9], [6, 12], [11, 6]]) { const t = world.topZ(x, y); for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { world.set(x + dx, y + dy, t, id('stone'), { silent: true }); world.set(x + dx, y + dy, t + 1, id('stone'), { silent: true }); } world.set(x + 2, y, t - 1, id('gravel'), { silent: true }); world.set(x, y + 2, t - 1, id('gravel'), { silent: true }); }
  for (const [x, y, p] of [[18, 39, 'cottonPuff'], [22, 41, 'berryBush'], [26, 40, 'cottonPuff'], [30, 42, 'berryBush'], [20, 43, 'cottonPuff'], [28, 38, 'berryBush'], [5, 26, 'tuft'], [7, 29, 'tuft'], [9, 32, 'tuft'], [6, 33, 'tuft']]) obj(p, x, y, world.topZ(x, y));
  obj('bench', 20, 26, 5); obj('hearthPot', 20, 28, 5); obj('supplyCrate', 22, 28, 5); obj('banner', 24, 26, 5);
  world.recomputeTops(); world.snapshotBase();
  return world;
};
})();
