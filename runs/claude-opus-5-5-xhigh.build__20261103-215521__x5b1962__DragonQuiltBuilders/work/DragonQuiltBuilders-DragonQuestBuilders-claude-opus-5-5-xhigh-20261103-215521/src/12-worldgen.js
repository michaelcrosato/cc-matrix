// World generation: heightmap by region, layers, ores, water, trees, plants, stamps, portals. Deterministic from the
// seed (named streams only). Returns the objects to place and the places with their standing levels.
(() => {
const DQ = globalThis.DQ, E = DQ.E;
const B = k => DQ.blockId(k);
const sstep = (a, b, x) => { const t = E.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const boxW = (x, y, b, fall) => { const dx = Math.max(b[0] - x, 0, x - b[2]), dy = Math.max(b[1] - y, 0, y - b[3]); return 1 - sstep(0, fall, Math.hypot(dx, dy)); };

const WG = DQ.WG = {};
/** a column: backing at 0, stone, earth, a top block; L = the standing level (top block at L - 1) */
WG.column = (w, x, y, L, top = 'grass', under = 'earth', deep = 'stone', earthN = 3) => {
  const H = w.H, base = (y * w.W + x) * H, V = w.vox;
  for (let z = 0; z < H; z++) V[base + z] = 0;
  if (L <= 0) return;
  V[base] = DQ.BACKING;
  for (let z = 1; z < L; z++) V[base + z] = z === L - 1 ? B(top) : z >= L - 1 - earthN ? B(under) : B(deep);
};
WG.recalc = w => { for (let y = 0; y < w.D; y++) for (let x = 0; x < w.W; x++) { w._recalcTop(x, y); w.colVer[y * w.W + x]++; } };
WG.tree = (w, x, y, L, R, o = {}) => {
  const h = o.h || 3 + Math.floor(R() * 3), r = o.r || 2, leaf = o.leaves === false ? 0 : B('leaves');
  for (let z = L; z < L + h && z < w.H; z++) w.vox[w.idx(x, y, z)] = B('log');
  if (!leaf) return;
  const cz = L + h - .5;
  for (let dz = -1; dz <= r; dz++) for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
    const X = x + dx, Y = y + dy, Z = Math.round(cz + dz); if (!w.inside(X, Y, Z)) continue;
    const d = Math.hypot(dx, dy, (dz - .3) * 1.25); if (d > r + .45 + (DQ.h01(X, Y, Z) - .5) * .6) continue;
    const i = w.idx(X, Y, Z); if (!w.vox[i]) w.vox[i] = leaf;
  }
};
/** stamp ASCII layers at origin (x0, y0, level z0); objects go to the list */
WG.stamp = (w, st, x0, y0, z0, objs, o = {}) => {
  st.layers.forEach((rows, k) => rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === ' ') return; const x = x0 + dx, y = y0 + dy, z = z0 + k; if (!w.inside(x, y, z)) return;
    if (ch === '.') { if (!o.keepAir) w.vox[w.idx(x, y, z)] = 0; return; }
    const v = st.legend[ch]; if (v === undefined) return;
    if (typeof v === 'string') w.vox[w.idx(x, y, z)] = B(v);
    else if (v.obj) { w.vox[w.idx(x, y, z)] = 0; objs.push({ id: v.obj, x, y, z, facing: v.facing || 0 }); }
  })));
};
WG.levelAt = (w, x, y) => w.topZ(x, y);   // standing level (after recalc)

DQ.generateWorld = function (w, def = DQ.WORLD, opts = {}) {
  const seed = def.seed, R = DQ.rng('worldgen', seed), N = E.noise2, ox = (seed % 997) * 1.37, oy = (seed % 769) * 2.11;
  const W = w.W, D = w.D, objs = [];
  const n = (x, y, s) => N(x / s + ox, y / s + oy);
  // ---------- 1. heightmap (standing levels) ----------
  const HM = new Float32Array(W * D), kind = new Uint8Array(W * D);   // kind: 0 glen 1 crags 2 tweed 3 coast 4 fray 5 verge 6 void 7 town
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    let h = 9 + (n(x, y, 14) - .5) * 3.2 + (n(x + 50, y + 50, 5) - .5) * 1.2, k = 0;
    const wc = boxW(x, y, [2, 2, 56, 52], 9);
    if (wc > 0) { const rg = 1 - Math.abs(2 * n(x + 9, y + 3, 11) - 1), crag = 11.5 + 8.5 * rg * rg + (n(x, y, 4) - .5) * 1.5; h = E.lerp(h, crag, wc); if (wc > .5) k = 1; }
    const wt = boxW(x, y, [94, 4, 141, 58], 6); if (wt > 0) { h = E.lerp(h, 10 + (n(x, y, 9) - .5) * 3.4, wt); if (wt > .5) k = 2; }
    const wco = boxW(x, y, [4, 104, 62, 141], 10);
    if (wco > 0) { let c = 7.6 + (n(x, y, 8) - .5) * 1.6; if (x < 14 || y > 132) c = 5; h = E.lerp(h, c, wco); if (wco > .5) k = 3; }
    if (x >= 101 && y >= 94) { h = 9 + (n(x, y, 10) - .5) * 5; k = 4; }
    else if (x >= 90 && x <= 100 && y >= 92) { h = 9; k = 5; }
    const dt = Math.hypot(x - def.town.x, y - def.town.y); if (dt < 18) { h = E.lerp(h, 9, 1 - sstep(def.town.flat, 18, dt)); if (dt < def.town.flat) k = 7; }
    if (x < 2 || y < 2 || x > W - 3 || y > D - 3) { h = 0; k = 6; }
    HM[y * W + x] = h; kind[y * W + x] = k;
  }
  const L = new Int16Array(W * D); for (let i = 0; i < W * D; i++) L[i] = HM[i] <= 0 ? 0 : Math.max(2, Math.round(HM[i]));
  const at = (x, y) => L[y * W + x], setL = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < D) L[y * W + x] = v; };
  // Lint Hollow: a bowl (floor L7) with a high rim and a tunnel east
  for (let y = 31; y <= 48; y++) for (let x = 28; x <= 50; x++) setL(x, y, Math.max(at(x, y), 13 + (DQ.h01(x, y, 3) < .4 ? 1 : 0)));
  for (let y = 35; y <= 44; y++) for (let x = 32; x <= 43; x++) setL(x, y, 7);
  setL(35, 36, 8); setL(36, 36, 8); setL(35, 35, 8); setL(36, 35, 8);   // the ledge (a jump)
  for (let y = 38; y <= 45; y++) for (let x = 51; x <= 56; x++) setL(x, y, 10);
  // the Button Quarry: an open pit, terraces, a stepped ramp from the east
  for (let y = 9; y <= 27; y++) for (let x = 12; x <= 38; x++) {
    const dx = Math.max(17 - x, 0, x - 28), dy = Math.max(13 - y, 0, y - 22), d = Math.max(dx, dy);
    let lv = d === 0 ? 6 : Math.min(15, 6 + d * 2);
    if (x >= 28 && y >= 16 && y <= 19) lv = Math.min(15, 6 + (x - 28));   // the ramp, one block a step
    setL(x, y, Math.min(at(x, y), lv));
  }
  // the crag ledge with an Ancient Button (a stairs puzzle)
  for (let y = 6; y <= 10; y++) for (let x = 46; x <= 50; x++) setL(x, y, Math.min(at(x, y), 13));
  setL(48, 8, 19);
  objs.push({ id: 'ancientButton', x: 48, y: 8, z: 19, facing: 1 });
  // ---------- 2. layers ----------
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const lv = at(x, y), k = kind[y * W + x];
    if (lv <= 0) { WG.column(w, x, y, 0); continue; }
    let top = 'grass', under = 'earth', deep = 'stone';
    if (k === 1) { top = lv >= 15 ? 'stone' : 'grass'; }
    if (k === 3 && lv <= 9) { top = 'sand'; under = 'sand'; }
    if (k === 4) { top = 'frayedTurf'; under = 'earth'; deep = 'darkStone'; }
    if (k === 5) top = DQ.h01(x, y, 5) < .3 ? 'frayed' : 'frayedTurf';
    if (x >= 12 && x <= 38 && y >= 9 && y <= 27 && lv < 15) { top = 'stone'; under = 'stone'; }
    if (x >= 28 && x <= 50 && y >= 31 && y <= 48 && lv >= 12) { top = 'stone'; under = 'stone'; }
    WG.column(w, x, y, lv, top, under, deep);
    if (k === 1 && lv < 15) {   // gravel on the crags' slopes
      let sl = 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (x + a >= 0 && y + b >= 0 && x + a < W && y + b < D) sl = Math.max(sl, Math.abs(at(x + a, y + b) - lv));
      if (sl >= 2 && DQ.h01(x, y, 21) < .5) w.vox[w.idx(x, y, lv - 1)] = B('gravel');
    }
    if (k === 4 && DQ.h01(x, y, 23) < .12) w.vox[w.idx(x, y, lv - 1)] = B('frayed');
  }
  // the Hollow floor is earth; the tunnel east (2 wide, 2 high, roofed) with stairs up to the exit
  for (let y = 35; y <= 44; y++) for (let x = 32; x <= 43; x++) w.vox[w.idx(x, y, 6)] = B('earth');
  for (const ty of [41, 42]) {
    for (let x = 44; x <= 47; x++) { for (let z = 7; z <= 8; z++) w.vox[w.idx(x, ty, z)] = 0; w.vox[w.idx(x, ty, 6)] = B('earth'); }
    [[48, 7], [49, 8], [50, 9]].forEach(([x, s]) => { for (let z = 1; z < s; z++) if (!w.vox[w.idx(x, ty, z)]) w.vox[w.idx(x, ty, z)] = B('stone'); w.vox[w.idx(x, ty, s)] = B('stairsCobble'); w.rotm[w.idx(x, ty, s)] = 0; for (let z = s + 1; z <= s + 2; z++) w.vox[w.idx(x, ty, z)] = 0; });
  }
  // ---------- 3. ores (crags and the quarry terraces): blobs of 4-7 ----------
  const Ro = DQ.rng('ores', seed);
  for (let i = 0; i < 150; i++) {
    const x = 4 + Math.floor(Ro() * 54), y = 4 + Math.floor(Ro() * 50), lv = at(x, y); if (lv < 8) continue;
    const ore = Ro() < .5 ? 'copperOre' : 'coal', zr = ore === 'copperOre' ? [7, 12] : [8, 14], z = E.clamp(lv - 1 - Math.floor(Ro() * 2), zr[0], zr[1]);
    if (z >= lv) continue;
    let cx = x, cy = y, cz = z; const nB = 4 + Math.floor(Ro() * 4);
    for (let k = 0; k < nB; k++) {
      if (w.inside(cx, cy, cz)) { const id = w.vox[w.idx(cx, cy, cz)]; if (id === B('stone') || id === B('earth') || id === B('gravel') || id === B('grass')) w.vox[w.idx(cx, cy, cz)] = B(ore); }
      const d = Math.floor(Ro() * 6); if (d === 0) cx++; else if (d === 1) cx--; else if (d === 2) cy++; else if (d === 3) cy--; else if (d === 4) cz++; else cz--;
    }
  }
  for (const [x, y, z, ore] of [[17, 12, 8, 'coal'], [18, 12, 8, 'coal'], [29, 14, 9, 'copperOre'], [29, 15, 9, 'copperOre'], [16, 24, 8, 'copperOre'], [15, 24, 9, 'coal'], [28, 21, 8, 'copperOre'], [27, 23, 9, 'coal']]) if (w.inside(x, y, z) && w.vox[w.idx(x, y, z)]) w.vox[w.idx(x, y, z)] = B(ore);
  // ---------- 4. water: the stream (1 deep), the sea, the town pond ----------
  const Rw = DQ.rng('water', seed); let sx = 30, sy = 58;
  for (let i = 0; i < 200 && sy < 133; i++) {
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = Math.round(sx) + a, y = Math.round(sy) + b, lv = at(x, y); if (lv > 3 && Math.hypot(x - def.town.x, y - def.town.y) > 16) w.vox[w.idx(x, y, lv - 1)] = DQ.WATER; }
    sy += .7; sx += Math.sin(i * .21 + Rw() * .8) * .9 - .06;
  }
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) { const lv = at(x, y); if (kind[y * W + x] === 3 && lv > 0 && lv < 7) for (let z = lv; z < 7; z++) w.vox[w.idx(x, y, z)] = DQ.WATER; }
  for (let y = 85; y <= 88; y++) for (let x = 63; x <= 65; x++) w.vox[w.idx(x, y, 8)] = DQ.WATER;
  // ---------- 5. trees ----------
  const Rt = DQ.rng('trees', seed), treeAt = new Set();
  const plantTree = (x, y, o) => { const lv = at(x, y); if (lv <= 2 || w.vox[w.idx(x, y, lv - 1)] === DQ.WATER) return false; WG.tree(w, x, y, lv, Rt, o); treeAt.add(y * W + x); return true; };
  for (let i = 0; i < 520; i++) { const x = 95 + Math.floor(Rt() * 45), y = 5 + Math.floor(Rt() * 53); if (Math.hypot(x - 116, y - 30) < 8 || Math.hypot(x - 134, y - 52) < 4 || Math.hypot(x - 110, y - 36) < 3) continue; let ok = true; for (const t of treeAt) { const tx = t % W, ty = (t - tx) / W; if (Math.abs(tx - x) < 4 && Math.abs(ty - y) < 4) { ok = false; break; } } if (ok) plantTree(x, y); }
  const groves = [[58, 62], [86, 58], [52, 92], [88, 98], [64, 104], [104, 70], [120, 80], [40, 70], [30, 90], [48, 112]];
  for (const [gx, gy] of groves) for (let k = 0; k < 5; k++) { const x = gx + Math.floor((Rt() - .5) * 9), y = gy + Math.floor((Rt() - .5) * 9); if (Math.hypot(x - def.town.x, y - def.town.y) > 15) plantTree(x, y); }
  for (let i = 0; i < 40; i++) { const x = 103 + Math.floor(Rt() * 36), y = 97 + Math.floor(Rt() * 40); if (Math.hypot(x - 124, y - 124) > 9 && Math.abs(y - 113 - (x - 101) * 3 / 23) > 3) plantTree(x, y, { leaves: false, h: 3 + Math.floor(Rt() * 2) }); }
  // the hollow tree (Tweedwood) with an Ancient Button inside
  { const x0 = 133, y0 = 51, lv = at(134, 52); for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) for (let z = lv; z < lv + 7; z++) { const edge = dx !== 1 || dy !== 1; const door = dx === 1 && dy === 2 && z < lv + 2; w.vox[w.idx(x0 + dx, y0 + dy, z)] = edge && !door ? B('log') : 0; }
    for (let dy = -2; dy <= 4; dy++) for (let dx = -2; dx <= 4; dx++) for (let dz = 7; dz <= 9; dz++) if (Math.hypot(dx - 1, dy - 1, (dz - 7.5) * 1.3) < 3.3) { const i = w.idx(x0 + dx, y0 + dy, lv + dz); if (w.inside(x0 + dx, y0 + dy, lv + dz) && !w.vox[i]) w.vox[i] = B('leaves'); }
    objs.push({ id: 'ancientButton', x: 134, y: 52, z: lv, facing: 1 }); }
  // ---------- 6. the town: plaza, ruins, well, roads, the north path ----------
  const tl = 9;
  for (let y = 74; y <= 78; y++) for (let x = 70; x <= 74; x++) w.vox[w.idx(x, y, tl - 1)] = B('cobble');
  WG.stamp(w, DQ.WORLD.stamps.ruins, 62, 67, tl, objs, { keepAir: true });
  for (let x = 75; x < W - 2; x++) for (const y of [75, 76]) { const lv = at(x, y); if (lv > 1 && Math.hypot(x - 96, y - 80) > 4.2) { w.vox[w.idx(x, y, lv - 1)] = B('planks'); } }
  for (let y = 46; y < 70; y++) { const lv = at(72, y); if (lv > 1 && y < 74) w.vox[w.idx(72, y, lv - 1)] = B('earth'); }
  objs.push({ id: 'well', x: 76, y: 79, z: tl, facing: 1 });
  for (const [id, x, y, f] of [['barrel', 69, 73, 0], ['barrel', 68, 73, 1], ['crate', 75, 73, 0], ['sack', 76, 74, 2], ['sign', 69, 79, 1], ['barrel', 80, 77, 1], ['crate', 58, 75, 0], ['sack', 57, 76, 0]]) objs.push({ id, x, y, z: tl, facing: f });
  // ---------- 7. stamps: Lint Camp, the shipwreck, the Knot Wall and Gate, the Fraying's holes, the Spire, the Rift ----------
  { const cx = 111, cy = 27; let lv = at(116, 30); for (let y = cy - 1; y <= cy + 7; y++) for (let x = cx - 1; x <= cx + 11; x++) { WG.column(w, x, y, lv, 'grass'); setL(x, y, lv); } WG.stamp(w, DQ.WORLD.stamps.lintCamp, cx, cy, lv, objs); }
  { const lv = 8; for (let y = 121; y <= 130; y++) for (let x = 16; x <= 27; x++) { WG.column(w, x, y, lv, 'sand', 'sand'); setL(x, y, lv); } WG.stamp(w, DQ.WORLD.stamps.shipwreck, 18, 123, lv, objs); }
  // the Knot Wall (west and north of the Fraying), the Gate in it
  for (let y = 92; y < D - 2; y++) for (const x of [99, 100]) for (let z = 1; z < w.H - 1; z++) w.vox[w.idx(x, y, z)] = B('knotWall');
  for (let x = 99; x < W - 2; x++) for (const y of [92, 93]) for (let z = 1; z < w.H - 1; z++) w.vox[w.idx(x, y, z)] = B('knotWall');
  for (let y = 112; y <= 114; y++) for (const x of [99, 100]) for (let z = 9; z <= 13; z++) w.vox[w.idx(x, y, z)] = B('knot');
  for (let y = 108; y <= 118; y++) for (let x = 88; x <= 98; x++) { WG.column(w, x, y, 9, DQ.h01(x, y, 31) < .3 ? 'frayed' : 'frayedTurf'); setL(x, y, 9); }
  for (let y = 108; y <= 118; y++) for (let x = 101; x <= 106; x++) { WG.column(w, x, y, 9, 'frayedTurf', 'earth', 'darkStone'); setL(x, y, 9); }
  // void holes in the Fraying (a safe road from the Gate to the Spire)
  for (let y = 95; y < D - 2; y++) for (let x = 102; x < W - 2; x++) {
    const onRoad = Math.abs(y - (113 + (x - 101) * 3 / 23)) < 3.5 && x <= 125, nearSp = Math.hypot(x - 124, y - 124) < 10;
    if (onRoad || nearSp || (x < 107 && y > 106 && y < 120)) continue;
    if (N(x / 6 + 31, y / 6 + 17) > .74) { WG.column(w, x, y, 0); setL(x, y, 0); }
  }
  // the Knotted Spire: a 9 x 9 core up to L22 with a spiral ramp two wide
  { const cx = 124, cy = 124, base = 9;
    for (let y = cy - 8; y <= cy + 8; y++) for (let x = cx - 8; x <= cx + 8; x++) if (w.inside(x, y, 0)) { WG.column(w, x, y, base, 'frayedTurf', 'earth', 'darkStone'); setL(x, y, base); }
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) for (let z = base; z <= 21; z++) w.vox[w.idx(x, y, z)] = ((z + x + y) % 5 === 0) ? B('knot') : B('frayed');
    const path = []; for (let x = cx - 1; x <= cx + 6; x++) path.push([x, cy - 6, 0]); for (let y = cy - 5; y <= cy + 6; y++) path.push([cx + 6, y, 1]); for (let x = cx + 5; x >= cx - 6; x--) path.push([x, cy + 6, 2]); for (let y = cy + 5; y >= cy - 6; y--) path.push([cx - 6, y, 3]); for (let x = cx - 5; x <= cx - 2; x++) path.push([x, cy - 6, 0]);
    const rises = 13, P = path.length;
    path.forEach(([x, y, dir], p) => {
      const s = base + Math.floor(p * rises / P), sNext = base + Math.floor((p + 1) * rises / P), rise = sNext > s;
      const lanes = dir === 0 ? [[0, 0], [0, 1]] : dir === 1 ? [[0, 0], [-1, 0]] : dir === 2 ? [[0, 0], [0, -1]] : [[0, 0], [1, 0]];
      for (const [a, b] of lanes) { const X = x + a, Y = y + b; if (Math.max(Math.abs(X - cx), Math.abs(Y - cy)) <= 4) continue;
        for (let z = base; z < s; z++) w.vox[w.idx(X, Y, z)] = (z % 3 === 0) ? B('knot') : B('frayed');
        if (rise) { w.vox[w.idx(X, Y, s)] = B('stairsCobble'); w.rotm[w.idx(X, Y, s)] = dir; } }
    });
    objs.push({ id: 'goldenThreadPedestal', x: cx, y: cy, z: 22, facing: 1 });
    // the top: a little crown of knots
    for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) w.vox[w.idx(cx + dx, cy + dy, 22)] = B('knot');
  }
  // the Quarry's four cobble pillars (they break under Sir Buttonsworth's charges)
  for (const [x, y] of [[19, 15], [26, 15], [19, 20], [26, 20]]) for (let z = 6; z <= 8; z++) w.vox[w.idx(x, y, z)] = B('cobble');
  // the Rift: a frayed hole east of town (re-stitched at the chapter's end)
  for (let y = 75; y <= 85; y++) for (let x = 91; x <= 101; x++) { const d = Math.hypot(x - 96, y - 80); if (d <= 3.2) { WG.column(w, x, y, 0); setL(x, y, 0); } else if (d <= 5) { const i = w.idx(x, y, at(x, y) - 1); if (w.vox[i]) w.vox[i] = B('frayedTurf'); } }
  WG.recalc(w);
  // ---------- 8. plants (objects) and portals ----------
  const Rp = DQ.rng('plants', seed), taken = new Set(objs.map(o => o.y * W + o.x));
  const free = (x, y) => { const lv = w.topZ(x, y); if (lv < 2 || lv >= w.H - 2) return 0; const top = w.vox[w.idx(x, y, lv - 1)]; if (top === DQ.WATER || top === B('leaves') || top === B('log') || top === B('knotWall') || top === B('knot')) return 0; if (taken.has(y * W + x)) return 0; return lv; };
  // rocks: scattered decoration, kept off the Hollow and named places (where the story's targets are)
  const Rk = DQ.rng('rocks', seed);   // (their own stream: rocks leave every plant where it was)
  const pois = Object.values(DQ.WORLD.poi).filter(q => q && q.x !== undefined), hb = DQ.WORLD.regions.find(r => r.id === 'hollow').box;
  const rockOk = (x, y) => !(x >= hb[0] - 3 && x <= hb[2] + 3 && y >= hb[1] - 3 && y <= hb[3] + 3) && pois.every(q => Math.hypot(q.x - x, q.y - y) > 5);
  const put = (id, x, y) => { const lv = free(x, y); if (!lv) return; taken.add(y * W + x); objs.push({ id, x, y, z: lv, facing: Math.floor((id === 'rock' ? Rk : Rp)() * 4) }); };
  for (let y = 3; y < D - 3; y++) for (let x = 3; x < W - 3; x++) {
    const k = kind[y * W + x], dt = Math.hypot(x - def.town.x, y - def.town.y), r = Rp(), top = w.vox[w.idx(x, y, Math.max(0, w.topZ(x, y) - 1))];
    if (dt < 8) continue;
    if (k === 0 || k === 7) {
      if (top !== B('grass')) continue;
      if (r < .075) put('tuft', x, y); else if (r < .09) put('cottonPuff', x, y); else if (r < .105) put('buttercup', x, y);
      else if (r < .14 && dt < 26 && dt > 11) put('berryBush', x, y); else if (r < .143) put('deadBush', x, y);
    } else if (k === 1) { if (top === B('grass') && r < .03) put('tuft', x, y); else if (r < .02) put('deadBush', x, y); else if (r < .028 && dt > 14 && rockOk(x, y)) put('rock', x, y); }
    else if (k === 2) { if (r < .045 && treeAt.size) put('puffball', x, y); else if (r < .075 && (x < 100 || y > 50 || x > 136 || y < 9)) put('bluebell', x, y); else if (r < .065) put('tuft', x, y); }
    else if (k === 3) { if (r < .02 && top === B('sand')) put('cottonPuff', x, y); else if (r < .03 && top === B('grass')) put('tuft', x, y); else if (r < .036 && top === B('sand') && rockOk(x, y)) put('rock', x, y); }
    else if (k === 4) { if (r < .015) put('deadBush', x, y); }
  }
  // the Hollow: dead bushes (branches), loose earth to break
  for (const [x, y] of [[33, 37], [41, 43], [34, 43], [42, 36]]) objs.push({ id: 'deadBush', x, y, z: 7, facing: 0 });
  for (const [x, y] of [[38, 37], [39, 37], [40, 42], [33, 40], [41, 39], [37, 43]]) w.set(x, y, 7, B('earth'), { silent: true });
  // a few tufts and a cotton puff right by the ruins (Wren's Bed starts here)
  for (const [id, x, y] of [['tuft', 60, 70], ['tuft', 59, 72], ['tuft', 84, 70], ['tuft', 85, 82], ['tuft', 58, 82], ['cottonPuff', 86, 74], ['tuft', 61, 86], ['cottonPuff', 57, 66], ['tuft', 83, 64]]) put(id, x, y);
  // portals on cobble pads
  for (const p of def.portals) {
    const lv = w.topZ(p.x, p.y);
    for (let y = p.y - 1; y <= p.y + 1; y++) for (let x = p.x - 1; x <= p.x + 1; x++) { WG.column(w, x, y, lv, 'cobble', 'earth'); w._recalcTop(x, y); taken.add(y * W + x); }
    for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (Math.abs(o.x - p.x) <= 1 && Math.abs(o.y - p.y) <= 1 && o.id !== 'portal') objs.splice(i, 1); }
    objs.push({ id: 'portal', x: p.x, y: p.y, z: lv, facing: 1, portal: p.id });
  }
  for (const o of objs) if (o.z === undefined || o.z === null) o.z = w.topZ(o.x, o.y);
  WG.recalc(w);
  // places: standing levels
  const poi = {};
  for (const k in def.poi) { const p = def.poi[k]; poi[k] = Object.assign({}, p, { L: p.L || w.topZ(p.x, p.y) }); }
  poi.hollowStart.L = 7; poi.tunnelMark.L = 7; poi.hollowLedge.L = 8;
  poi.spireTop.L = 22;
  return { objects: objs, poi };
};

/** the demo town (title diorama, attract mode, dev beats): builds rooms up to a stage ('lv2' | 'lv3' | 'lv4'); objects to the list */
DQ.stampTownRooms = function (w, objs, stage = 'lv4', o = {}) {
  const order = ['lv2', 'lv3', 'lv4'], upto = order.indexOf(stage), lv = 9;
  for (const rm of DQ.WORLD.demoRooms) {
    if (order.indexOf(rm.beat) > upto) continue;
    if (o.only && !o.only.includes(rm.id)) continue;
    for (let dy = 0; dy < rm.d; dy++) for (let dx = 0; dx < rm.w; dx++) {
      const x = rm.x + dx, y = rm.y + dy, edge = dx === 0 || dy === 0 || dx === rm.w - 1 || dy === rm.d - 1;
      w.set(x, y, lv - 1, B(rm.id === 'kitchen' || rm.id === 'smithy' ? 'cobble' : 'planks'), { silent: true });
      for (let z = lv; z < lv + 3; z++) w.set(x, y, z, 0, { silent: true });
      if (edge) { const door = dx === rm.door[0] && dy === rm.door[1]; if (!door) for (let z = lv; z < lv + 2; z++) w.set(x, y, z, B(rm.wall), { silent: true, town: true }); else objs.push({ id: rm.id === 'workshop' || rm.id === 'bedroom' ? 'latticeDoor' : 'plankDoor', x, y, z: lv, facing: dy === 0 || dy === rm.d - 1 ? 1 : 0 }); }
    }
    for (const [dx, dy, id, f] of rm.objs) objs.push({ id, x: rm.x + dx, y: rm.y + dy, z: lv, facing: f });
  }
  return objs;
};
})();
