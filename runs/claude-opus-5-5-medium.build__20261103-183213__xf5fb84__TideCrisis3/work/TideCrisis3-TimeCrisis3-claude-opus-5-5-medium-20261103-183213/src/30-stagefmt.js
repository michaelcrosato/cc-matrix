// 30-stagefmt: the stage and scene format helpers and the prefabs. Scenes are authored in an arena's local frame
// (d = metres... in world units forward, l = to the right, z up from the arena's ground): A(frame).p(d, l, z) gives a
// world point. Slots (P1 left, P2 right) with their stand and cover poses and their cover props, cover points for
// enemies, rails between arenas. Prefabs build geometry on a Builder: piers, warehouses, stalls, lantern strings,
// containers, cranes, forklifts, houses, lamps, boats, bridges, railings, catwalks, consoles and the rest.
// The validators check every stage's data (tests run them). Reads: Builder (03), registries (00).

class Frame {
  constructor(x, y, z, yaw) { this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.c = Math.cos(yaw); this.s = Math.sin(yaw); }
  // local (d forward, l right, h up) -> world
  p(d, l = 0, h = 0) { return [this.x + d * this.c - l * this.s, this.y + d * this.s + l * this.c, this.z + h]; }
  yawOf(a = 0) { return this.yaw + a; }
  // two slots: P1 on the left, P2 on the right; o: { gap: 22, coverH: 17, turn: 14, back: 4, lift: 0, pitch: -2 }
  slots(o = {}) {
    const gap = o.gap || 22, turn = (o.turn === undefined ? 14 : o.turn) * DEG, eye = 24 + (o.lift || 0), pz = (o.pitch === undefined ? -3 : o.pitch);
    const out = [];
    for (const side of [-1, 1]) {
      const l = side * gap + (o.shift || 0), st = this.p(0, l, eye), lookD = 300, lk = this.p(lookD, l * .4, eye + Math.tan(pz * DEG) * lookD);
      const ca = this.p(-(o.back || 4), l + side * (o.out || 12), 12 + (o.lift || 0)), cy = this.yaw + side * turn;
      const clk = [ca[0] + Math.cos(cy) * 300, ca[1] + Math.sin(cy) * 300, ca[2] - 12];
      out.push({ stand: { at: st, look: lk }, cover: { at: ca, look: clk }, side, prop: { at: [ca[0] + Math.cos(cy) * 13, ca[1] + Math.sin(cy) * 13, this.z + (o.lift || 0)], yaw: cy, h: o.coverH || 18 } });
    }
    return out;
  }
}
TC.Frame = Frame;
const F = (x, y, z, yawDeg) => new Frame(x, y, z, yawDeg * DEG);
TC.F = F;

// a rail from frame a's stand to frame b's: world points (the arrival path); vias in b's local frame or world points
function rail(a, b, vias = [], eye = 24) {
  const pts = [a.p(0, 0, eye)];
  for (const v of vias) pts.push(v.length === 3 && v.world ? v : b.p(v[0], v[1], v[2] === undefined ? eye : v[2]));
  pts.push(b.p(0, 0, eye));
  return pts;
}
TC.rail = rail;

// cover points: covers(frame, { c1: [d, l, h?, peek?, extra], ... }) -> { c1: { at, h, peek } }
function covers(fr, spec) {
  const out = {};
  for (const k in spec) { const [d, l, h, peek, x] = spec[k]; out[k] = Object.assign({ at: fr.p(d, l, x && x.z || 0), h: h || 18, peek: peek || ['up'] }, x || {}); }
  return out;
}
TC.covers = covers;
TC.noCheck = cs => { for (const k in cs) cs[k].noCheck = true; return cs; };   // moving scenes: checked in play, not from the start pose

// ---------------------------------------------------------------- prefabs
const PF = {};
TC.PF = PF;
// the cover prop in front of a slot's cover pose: crates, barrels, a sandbag wall, a cart...
PF.slotProp = (G, s, kind = 'crates') => {
  const p = s.prop; G.push(p.at[0], p.at[1], p.at[2], p.yaw);
  const h = p.h;
  if (kind === 'crates') { G.box(-7, -11, 0, 7, 1, h, 'crate', { fit: true, surf: 'wood' }); G.box(-6, 1, 0, 6, 12, h - 3, 'crate', { fit: true, surf: 'wood' }); }
  else if (kind === 'barrels') { for (const [x, y] of [[0, -7], [0, 5]]) { G.cyl(x, y, 0, h, 7, 7, 10, 'iron', { collide: 'metal' }); } }
  else if (kind === 'sandbags') { for (let r = 0; r < 3; r++) G.box(-6, -12 + r % 2 * 2, r * 6, 6, 12 - r % 2 * 2, r * 6 + 6, 'sandbag', { surf: 'concrete' }); }
  else if (kind === 'concrete') { G.box(-6, -12, 0, 6, 12, h, 'concrete', { surf: 'concrete' }); G.box(-6.5, -12.5, h - 2, 6.5, 12.5, h, 'hazard', { collide: false }); }
  else if (kind === 'steel') { G.box(-4, -12, 0, 4, 12, h, 'steel-paint', { surf: 'metal' }); }
  else if (kind === 'cart') { G.box(-8, -16, 6, 8, 16, h, 'plank', { surf: 'wood' }); G.cyl(0, -17, 0, 0, 0, 0, 4, 'iron'); G.box(-6, -18, 0, 6, -16, 8, 'iron', { collide: false }); G.box(-6, 16, 0, 6, 18, 8, 'iron', { collide: false }); }
  else if (kind === 'well') { G.cyl(0, 0, 0, h, 14, 14, 12, 'stone', { collide: 'concrete' }); G.box(-2, -15, h, 2, -13, h + 22, 'timber', { collide: false }); G.box(-2, 13, h, 2, 15, h + 22, 'timber', { collide: false }); G.box(-3, -16, h + 22, 3, 16, h + 25, 'timber', { collide: false }); }
  else if (kind === 'console') { G.box(-6, -12, 0, 6, 12, h, 'gunmetal', { surf: 'metal' }); G.box(-6, -11, h - 1, 2, 11, h + 1, 'screen-teal', { collide: false }); }
  G.pop();
};
PF.lantern = (G, x, y, z, mat = 'lantern', light = true) => { G.lathe(x, y, z - 6, [[0, 0], [3, 1], [4.5, 3], [4.5, 7], [3, 9.5], [0, 10.5]], 6, mat); if (light) G.light(x, y, z, 95, .85, mat === 'lantern-red' ? '#ff6a4a' : '#ffb347'); };
PF.lanternString = (G, a, b, n = 6, sag = 8) => {
  for (let i = 0; i <= n; i++) { const t = i / n, p = vlerp(a, b, t); p[2] -= Math.sin(t * Math.PI) * sag; const cols = ['#ff5a5a', '#ffd34a', '#5ad1ff', '#8aff8a']; G.box(p[0] - .8, p[1] - .8, p[2] - 1.6, p[0] + .8, p[1] + .8, p[2], 'glow' + cols[i % 4], { collide: false, tess: false }); }
};
PF.lamppost = (G, x, y, z, h = 60, sodium = false, light = true) => { G.cyl(x, y, z, z + h, 1.6, 1.2, 6, 'iron', { collide: 'metal' }); G.box(x - 5, y - 3, z + h, x + 5, y + 3, z + h + 3, 'iron', { collide: false }); G.box(x - 4, y - 2, z + h - 2, x + 4, y + 2, z + h, sodium ? 'lamp-sodium' : 'lamp', { collide: false, skip: 't' }); if (light) G.light(x, y, z + h - 4, 150, .8, sodium ? '#ffb04a' : '#ffe0b0'); };
PF.bollard = (G, x, y, z) => { G.cyl(x, y, z, z + 10, 4, 3.5, 8, 'iron', { collide: 'metal' }); G.cyl(x, y, z + 10, z + 12, 5, 5, 8, 'iron'); };
PF.crateStack = (G, x, y, z, n = 2, yaw = 0) => { G.push(x, y, z, yaw); for (let i = 0; i < n; i++) G.box(-8, -8 + (i % 2) * 2, i * 15, 8, 8 - (i % 2) * 2, i * 15 + 15, 'crate', { fit: true, surf: 'wood' }); G.pop(); };
PF.barrel = (G, x, y, z, mat = 'iron') => { G.cyl(x, y, z, z + 18, 6.5, 6.5, 10, mat, { collide: 'metal' }); };
PF.container = (G, x, y, z, yaw, mat = 'container-red', o = {}) => {
  G.push(x, y, z, yaw); G.box(-49, -19.5, 0, 49, 19.5, 42, mat, { surf: 'metal', top: mat }); G.box(49, -19.5, 0, 50, 19.5, 42, 'iron', { collide: false });
  if (o.doors) { G.box(49.5, -18, 2, 50.5, -1, 40, 'iron', { collide: false }); G.box(49.5, 1, 2, 50.5, 18, 40, 'iron', { collide: false }); }
  G.pop();
};
PF.warehouse = (G, fr, d, l, w, depth, h, o = {}) => {
  // a brick shed along l (width w), depth along d, a door and lit windows facing the arena (-d side)
  const A = fr.p(d, l - w / 2), yaw = fr.yaw;
  G.push(A[0], A[1], A[2], yaw);
  G.box(0, 0, 0, depth, w, h, o.mat || 'brick', { surf: 'concrete', top: 'iron' });
  for (let i = 0; i < Math.floor(w / 40); i++) G.box(-.6, 12 + i * 40, h * .55, 0, 26 + i * 40, h * .55 + 14, o.lit === false ? 'window-dark' : 'glasslit', { collide: false, tess: false });
  if (o.door !== false) G.box(-1, w / 2 - 10, 0, 0, w / 2 + 10, 34, 'plank', { collide: false });
  if (o.sign) G.box(-1.2, w / 2 - 30, h - 16, -.2, w / 2 + 30, h - 4, 'poster', { collide: false });
  G.pop();
};
PF.stall = (G, x, y, z, yaw, awn = 'awning-red', goods = true) => {
  G.push(x, y, z, yaw);
  G.box(-10, -18, 0, 10, 18, 14, 'plank', { surf: 'wood' });
  for (const [a, b] of [[-10, -18], [-10, 16], [8, -18], [8, 16]]) G.box(a, b, 14, a + 2, b + 2, 34, 'timber', { collide: false });
  G.quad([-14, -20, 36], [-14, 20, 36], [12, 20, 30], [12, -20, 30], awn, { double: true });
  if (goods) { for (let i = 0; i < 4; i++) G.box(-6 + i % 2 * 6, -14 + i * 7, 14, -2 + i % 2 * 6, -9 + i * 7, 18, i % 2 ? '#c0a040' : '#5a8ad0', { collide: false, tess: false }); }
  G.pop();
};
PF.boat = (G, x, y, z, yaw, len = 80, o = {}) => {
  G.push(x, y, z, yaw);
  const w = len * .32, hl = len / 2;
  G.box(-hl, -w / 2, -6, hl - 12, w / 2, 8, o.hull || 'hull', { surf: 'metal' });
  G.quad([hl - 12, -w / 2, -6], [hl + 6, 0, 0], [hl + 6, 0, 10], [hl - 12, -w / 2, 8], o.hull || 'hull', { tess: false });
  G.quad([hl + 6, 0, 0], [hl - 12, w / 2, -6], [hl - 12, w / 2, 8], [hl + 6, 0, 10], o.hull || 'hull', { tess: false });
  G.box(-hl + 4, -w / 2 + 2, 8, hl - 14, w / 2 - 2, 9, 'planks', { collide: false });
  if (o.cabin !== false) { G.box(-hl * .4, -w * .35, 9, hl * .15, w * .35, 30, 'plaster', { surf: 'wood', top: 'planks' }); G.box(hl * .15 - .2, -w * .25, 18, hl * .15 + .6, w * .25, 26, 'glasslit', { collide: false, tess: false }); }
  G.pop();
};
PF.railing = (G, a, b, h = 14, mat = 'iron') => {
  const n = Math.max(1, Math.round(vdist(a, b) / 24));
  for (let i = 0; i <= n; i++) { const p = vlerp(a, b, i / n); G.box(p[0] - .8, p[1] - .8, p[2], p[0] + .8, p[1] + .8, p[2] + h, mat, { collide: false, tess: false }); }
  const d = vnorm(vsub(b, a)), nn = [-d[1] * .6, d[0] * .6, 0];
  G.quad(vadd(vadd(a, nn), [0, 0, h - 1.4]), vadd(vadd(b, nn), [0, 0, h - 1.4]), vadd(vadd(b, nn), [0, 0, h]), vadd(vadd(a, nn), [0, 0, h]), mat, { double: true });
};
PF.house = (G, fr, d, l, w, depth, h, o = {}) => {
  const A = fr.p(d, l - w / 2); G.push(A[0], A[1], A[2], fr.yaw + (o.turn || 0));
  const wall = o.wall || 'plaster';
  G.box(0, 0, 0, depth, w, h, wall, { surf: 'wood', top: 'roof-slate', skip: 't' });
  // a pitched roof along w
  G.quad([-3, -3, h], [-3, w + 3, h], [depth / 2, w + 3, h + depth * .45], [depth / 2, -3, h + depth * .45], 'roof-slate', { double: false });
  G.quad([depth + 3, w + 3, h], [depth + 3, -3, h], [depth / 2, -3, h + depth * .45], [depth / 2, w + 3, h + depth * .45], 'roof-slate', {});
  G.quad([0, 0, h], [depth, 0, h], [depth / 2, 0, h + depth * .45], [depth / 2, 0, h + depth * .45], wall, { tess: false });
  G.quad([depth, w, h], [0, w, h], [depth / 2, w, h + depth * .45], [depth / 2, w, h + depth * .45], wall, { tess: false });
  if (o.timber) for (let i = 0; i <= w; i += 24) G.box(-.6, i, 0, 0, i + 3, h, 'timber', { collide: false, tess: false });
  const wins = o.windows || [];
  for (const wn of wins) G.box(-.5, wn[0], wn[1], 0, wn[0] + 14, wn[1] + 16, wn[2] ? 'glasslit' : 'window-dark', { collide: false, tess: false });
  if (o.door) G.box(-.8, o.door - 9, 0, 0, o.door + 9, 32, 'plank', { collide: false, tess: false });
  G.pop();
};
PF.catwalk = (G, a, b, w = 24, mat = 'grate') => {
  const d = vnorm(vsub(b, a)), n = [-d[1] * w / 2, d[0] * w / 2, 0];
  G.quad(vadd(a, vmul(n, -1)), vadd(b, vmul(n, -1)), vadd(b, n), vadd(a, n), mat, { double: true });
  PF.railing(G, vadd(a, n), vadd(b, n), 14); PF.railing(G, vadd(a, vmul(n, -1)), vadd(b, vmul(n, -1)), 14);
};
PF.water = (G, x0, y0, x1, y1, z, mat = 'sea-night') => { G.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], mat, {}); };
PF.ground = (G, x0, y0, x1, y1, z, mat) => { G.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], mat, {}); };
PF.skylineBlock = (G, x, y, w, d, h, lit = true) => { G.box(x, y, 0, x + w, y + d, h, lit ? 'glasslit' : 'concrete-dark', { collide: false, tess: false }); };

// the shapes of moving things (dynamic meshes, built once)
const MESH = {};
TC.MESH = MESH;
TC.mesh = (id) => MESH[id] || (MESH[id] = TC.makeMesh(MESHDEF[id]));
const MESHDEF = {
  speedboat: G => { PF.boat(G, 0, 0, 0, 0, 96, { hull: 'hull', cabin: false }); G.box(-30, -16, 8, -26, 16, 20, 'steel-paint', { surf: 'metal' }); G.box(-10, -14, 8, 6, -6, 22, 'steel-paint'); G.box(-10, -6, 20, 6, 6, 24, 'glass'); G.box(10, -16, 8, 40, -14, 18, 'steel-paint'); G.box(10, 14, 8, 40, 16, 18, 'steel-paint'); },
  stingray: G => { PF.boat(G, 0, 0, 0, 0, 150, { hull: 'hull-dark', cabin: false }); G.box(-20, -18, 9, 22, 18, 34, 'gunmetal'); G.box(-14, -16, 34, 16, 16, 46, 'gunmetal'); G.box(16.2, -12, 36, 16.8, 12, 42, 'glasslit'); G.box(-60, -24, 8, 60, -23, 18, 'iron'); G.box(-60, 23, 8, 60, 24, 18, 'iron'); },
  turret: G => { G.cyl(0, 0, 0, 6, 7, 6, 8, 'gunmetal'); G.box(-5, -5, 6, 5, 5, 12, 'gunmetal'); G.pipe(4, 22, -2, 9, 1.4, 6, 'iron'); G.pipe(4, 22, 2, 9, 1.4, 6, 'iron'); },
  truck: G => { G.box(-46, -16, 6, 20, 16, 40, 'camo'); G.box(20, -16, 6, 46, 16, 30, 'camo'); G.box(46, -15, 14, 46.6, 15, 26, 'glass'); for (const x of [-30, 0, 32]) for (const y of [-17, 17]) G.cyl(x, y, 0, 0, 0, 0, 3, 'rubber'); for (const x of [-30, 0, 32]) for (const y of [-18, 14]) G.box(x - 7, y, 0, x + 7, y + 4, 12, 'rubber'); G.box(-28, -17, 6, -16, -13, 20, 'tank-white'); G.box(-6, -8, 40, 8, 8, 46, 'gunmetal'); G.box(4, -10, 46, 6, 10, 56, 'steel-paint'); },
  jetski: G => { G.box(-10, -5, -2, 8, 5, 5, 'teal-paint'); G.quad([8, -5, -2], [16, 0, 0], [16, 0, 4], [8, -5, 5], 'teal-paint', { tess: false }); G.quad([16, 0, 0], [8, 5, -2], [8, 5, 5], [16, 0, 4], 'teal-paint', { tess: false }); G.box(-4, -3, 5, 4, 3, 8, 'rubber'); G.box(5, -6, 8, 7, 6, 9, 'iron'); },
  drone: G => { G.box(-5, -5, -2, 5, 5, 3, 'gunmetal'); for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { G.box(x - 4, y - 4, 3, x + 4, y + 4, 3.6, 'rubber', { double: true }); G.box(x * .5 - 1, y * .5 - 1, 1, x * .5 + 1, y * .5 + 1, 3, 'iron'); } G.box(4.5, -1.5, -1, 5.5, 1.5, 1.5, 'red-lamp'); },
  seawolf: G => { G.box(-30, -12, -10, 22, 12, 12, 'gunmetal'); G.quad([22, -12, -10], [38, 0, -4], [38, 0, 6], [22, -12, 12], 'gunmetal', { tess: false }); G.quad([38, 0, -4], [22, 12, -10], [22, 12, 12], [38, 0, 6], 'gunmetal', { tess: false }); G.box(22.2, -8, 0, 30, 8, 10, 'glasslit'); G.box(-80, -3, -2, -30, 3, 6, 'gunmetal'); G.box(-84, -1, 6, -78, 1, 24, 'gunmetal'); G.box(-6, -32, -6, 10, 32, -3, 'gunmetal'); G.cyl(4, -18, -12, -1, 6, 6, 8, 'steel-paint', { bottom: true }); G.cyl(4, 18, -12, -1, 6, 6, 8, 'steel-paint', { bottom: true }); G.cyl(0, 0, 12, 18, 4, 4, 8, 'iron'); },
  rotor: G => { G.box(-90, -3, 0, 90, 3, 1, 'iron', { double: true }); G.box(-3, -90, 0, 3, 90, 1, 'iron', { double: true }); },
  scyllaBody: G => { G.lathe(0, 0, -6, [[0, 0], [30, 2], [36, 10], [30, 22], [0, 26]], 10, 'gunmetal'); G.box(18, -10, 4, 40, 10, 18, 'steel-paint'); G.box(40, -8, 8, 41, 8, 16, 'glasslit'); for (const s of [-1, 1]) { G.box(20, s * 18 - 5, 0, 54, s * 18 + 5, 10, 'steel-paint'); G.box(-10, s * 14 - 7, 22, 10, s * 14 + 7, 32, 'hazard'); } },
  scyllaLeg: G => { G.box(-3, -3, -3, 3, 30, 3, 'steel-paint'); },
  lens: G => { G.lathe(0, 0, 0, [[0, 0], [16, 4], [18, 20], [16, 36], [0, 40]], 8, 'lens'); },
  turbine: G => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; G.push(0, 0, 0, a); G.box(0, -4, -1, 50, 4, 1, 'steel-paint', { double: true }); G.pop(); } G.cyl(0, 0, -6, 6, 9, 9, 10, 'gunmetal'); },
  funicular: G => { G.box(-36, -18, 0, 36, 18, 3, 'planks'); G.box(-36, -18, 3, 36, -16, 18, 'teal-paint'); G.box(-36, 16, 3, 36, 18, 18, 'teal-paint'); G.box(-36, -18, 3, -34, 18, 40, 'teal-paint'); G.box(-36, -18, 40, 36, 18, 42, 'teal-paint'); G.box(34, -18, 30, 36, 18, 40, 'teal-paint'); G.box(-20, -14, 3, -12, 14, 15, 'plank'); G.box(-36, -18, 18, -35, 18, 30, 'glass'); },
  lift: G => { G.box(-30, -24, 0, 30, 24, 3, 'grate'); G.box(-30, -24, 3, 30, -22, 14, 'steel-paint'); G.box(-30, 22, 3, 30, 24, 14, 'steel-paint'); G.box(-6, -14, 3, 6, 14, 18, 'gunmetal'); },
  bargeCrate: G => { G.box(-7, -7, 0, 7, 7, 14, 'fireworks'); },
  krakeLever: G => { G.box(-4, -4, 0, 4, 4, 30, 'gunmetal'); G.box(-1.5, -1.5, 30, 1.5, 1.5, 44, 'hazard'); G.box(-4, -4, 44, 4, 4, 48, 'red-lamp'); }
};
TC.MESHDEF = MESHDEF;

// ---------------------------------------------------------------- validators (the content suite runs them)
TC.validate = () => {
  const errs = [], err = s => errs.push(s);
  for (const st of all('stage')) {
    for (const sid of st.scenes) { if (!has('scene', sid)) { err('stage ' + st.id + ': missing scene ' + sid); continue; } }
    for (const k of ['intro', 'outro', 'ending']) if (st[k] && !has('cutscene', st[k])) err('stage ' + st.id + ': missing cutscene ' + st[k]);
    if (st.music && !has('song', st.music)) err('stage ' + st.id + ': missing song ' + st.music);
  }
  for (const sc of all('scene')) {
    if (!sc.slots || sc.slots.length < 2) err('scene ' + sc.id + ': needs two slots');
    for (const w of sc.waves || []) for (const s of w.spawn || []) { if (!has('enemy', s[0])) err('scene ' + sc.id + ': unknown enemy ' + s[0]); if (s[1] && !(sc.covers || {})[s[1]]) err('scene ' + sc.id + ': unknown cover ' + s[1]); }
    for (const c of sc.cues || []) if (c.say && !has('speaker', c.say[0])) err('scene ' + sc.id + ': unknown speaker ' + c.say[0]);
    for (const w of sc.waves || []) if (w.say && !has('speaker', w.say[0])) err('scene ' + sc.id + ': unknown speaker ' + w.say[0]);
    if (sc.boss && !has('boss', sc.boss)) err('scene ' + sc.id + ': unknown boss ' + sc.boss);
  }
  for (const c of all('cutscene')) for (const s of c.steps) if (s.say && !has('speaker', s.say[0])) err('cutscene ' + c.id + ': unknown speaker ' + s.say[0]);
  for (const h of all('highlight')) { if (!has('stage', h.stage)) err('highlight ' + h.id + ': unknown stage'); else if (!get('stage', h.stage).scenes.includes(h.scene)) err('highlight ' + h.id + ': scene ' + h.scene + ' not in stage ' + h.stage); }
  return errs;
};
// geometric validation of one scene (needs a Sim at that scene): every cover point's exposed head can be seen and shot
// from slot 0's stand pose, and the hidden pose is covered
TC.validateScene = (sim) => {
  const errs = [], cs = camSetup(Object.assign({}, sim.poseOf(0, 'stand'), { fov: 55, aspect: 16 / 9 }));
  for (const k in sim.covers) {
    const c = sim.covers[k]; if (c.noCheck) continue;
    const tallC = c.h >= 30, head = [c.at[0], c.at[1], c.at[2] + RIGH.head];
    let target = head;
    if (tallC) { const f = Math.atan2(cs.pos[1] - c.at[1], cs.pos[0] - c.at[0]), s = c.peek.includes('left') ? -1 : 1; target = [c.at[0] - Math.sin(f) * 14 * s, c.at[1] + Math.cos(f) * 14 * s, c.at[2] + RIGH.head]; }
    const v = projectVU(cs, target);
    if (!v || Math.abs(v[0]) > .95 * 16 / 9 || Math.abs(v[1]) > .95) { errs.push(sim.sceneId + ' cover ' + k + ': exposed head off screen (' + (v ? v[0].toFixed(2) + ',' + v[1].toFixed(2) : 'behind') + ')'); continue; }
    const d = vnorm(vsub(target, cs.pos)), t = vdist(target, cs.pos);
    for (const col of sim.colliders) { if (!col.on) continue; const ht = rayAABB(cs.pos, d, col.b); if (ht < t - 6) { errs.push(sim.sceneId + ' cover ' + k + ': head blocked by a collider at ' + ht.toFixed(0) + ' of ' + t.toFixed(0)); break; } }
  }
  // objective and bonus targets (locks, life rings, intel bottles) can be seen and shot from slot 1 or slot 2
  for (const ob of sim.objects) {
    if (!ob.K.objective && !ob.K.bonus) continue;
    const ok = [0, 1].some(i => { const c2 = camSetup(Object.assign({}, sim.poseOf(i, 'stand'), { fov: 55, aspect: 16 / 9 })), v = projectVU(c2, ob.pos); if (!v || Math.abs(v[0]) > .95 * 16 / 9 || Math.abs(v[1]) > .95) return false; const h = sim.raycast(c2.pos, vnorm(vsub(ob.pos, c2.pos))); return h && h.kind === 'object' && h.ob === ob; });
    if (!ok && !ob.noCheck) errs.push(sim.sceneId + ' object ' + ob.kind + ' at ' + ob.pos.map(Math.round) + ': not visible or not shootable');
  }
  return errs;
};
const cam = (t, at, look) => ({ t, at, look });   // a cutscene camera key
