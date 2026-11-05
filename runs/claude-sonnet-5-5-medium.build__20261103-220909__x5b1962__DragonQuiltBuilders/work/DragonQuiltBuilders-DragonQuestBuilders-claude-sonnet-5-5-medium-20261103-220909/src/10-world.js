// Block columns on a TileMap, placeable objects, world generation, room detection, pathfinding.
(() => {
const { E, T } = DQ;
const DOOR_T = 200;

const vnoise = (x, y, seed) => {            // smooth value noise, 0..1
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => DQ.hash(a + ',' + b + ',' + seed) / 4294967296;
  const s = t => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
};
DQ.noise = (x, y, seed = 1) => vnoise(x, y, seed) * .6 + vnoise(x * 2.1, y * 2.1, seed + 7) * .3 + vnoise(x * 4.3, y * 4.3, seed + 3) * .1;

class World {
  constructor(W, H, kind = 'story') {
    this.W = W; this.H = H; this.kind = kind;
    this.cols = new Uint8Array(W * H * DQ.MAXH);
    this.hgt = new Uint8Array(W * H);
    this.floor = new Array(W * H).fill('grass');
    this.objs = new Map();            // cell index -> object
    this.list = [];                   // all objects
    this.edits = new Set();           // cells changed by play (for saves)
    this.townCells = new Set();       // cells of player-built town blocks (monsters may batter them)
    this.nextId = 1;
    this.buildMap();
  }
  idx(x, y) { return y * this.W + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  height(x, y) { return this.inside(x, y) ? this.hgt[y * this.W + x] : 9; }
  topId(x, y) { const h = this.height(x, y); return h ? this.cols[(y * this.W + x) * DQ.MAXH + h - 1] : 0; }
  blockAt(x, y, z) { return this.inside(x, y) && z >= 0 && z < this.hgt[y * this.W + x] ? this.cols[(y * this.W + x) * DQ.MAXH + z] : 0; }
  // ----- the engine map -----
  buildMap() {
    const types = {};
    DQ.BLOCKS.forEach((b, bi) => { if (!b) return; for (let h = 1; h <= DQ.MAXH; h++) types[bi * 8 + h] = { h: h * T, top: b.top, side: b.side, face: b.mat, roof: b.mat, cut: true, cutH: 6 }; });
    types[DOOR_T] = { h: 2 * T, top: '#c68c54', side: '#8a5a2e', face: 'plank', roof: 'plank', cut: true, cutH: 6 };
    const cells = new Array(this.W * this.H).fill(0);
    this.map = new E.TileMap({
      w: this.W, h: this.H, cells, floor: this.floor.slice(), types, outside: '#0d0b2a', ao: 5,
      floorMats: { grass: 'grass', dirt: 'dirt', stone: 'flagstone', water: 'water', fray: '#5a3a7a speckle', sand: 'sand', wool: 'wool' },
      block: ['water']
    });
  }
  syncCell(x, y) {
    if (!this.inside(x, y)) return;
    const i = this.idx(x, y), h = this.hgt[i], o = this.objs.get(i);
    let v = h ? this.topId(x, y) * 8 + h : 0;
    let blocked = false;
    if (o) {
      const def = DQ.OBJECTS[o.type];
      if (def.door) { if (!o.open && !h) v = DOOR_T; }
      else if (def.solid) blocked = !h;
    }
    if (this.map.cells[i] !== v) this.map.set(x, y, v);
    if (this.floor[i] !== 'water') this.map.block(x, y, blocked); else if (h) this.map.block(x, y, false); else this.map.block(x, y, true);
  }
  refreshFloor() { for (let i = 0; i < this.floor.length; i++) this.map.setFloor(i % this.W, Math.floor(i / this.W), this.floor[i], this.floor[i] === 'water' && !this.hgt[i]); }
  // ----- editing -----
  push(x, y, id, o = {}) {
    if (!this.inside(x, y)) return false; const i = this.idx(x, y), h = this.hgt[i];
    if (h >= DQ.MAXH) return false; this.cols[i * DQ.MAXH + h] = id; this.hgt[i] = h + 1;
    if (o.town) this.townCells.add(i); if (!o.gen) this.edits.add(i);
    this.syncCell(x, y); if (!o.silent) DQ.events.emit('blockPlaced', { x, y, id, z: h }); return true;
  }
  pop(x, y, o = {}) {
    if (!this.inside(x, y)) return 0; const i = this.idx(x, y), h = this.hgt[i]; if (!h) return 0;
    const id = this.cols[i * DQ.MAXH + h - 1]; this.cols[i * DQ.MAXH + h - 1] = 0; this.hgt[i] = h - 1;
    if (h - 1 === 0) this.townCells.delete(i); if (!o.gen) this.edits.add(i);
    this.syncCell(x, y); if (!o.silent) DQ.events.emit('blockBroken', { x, y, id, z: h - 1 }); return id;
  }
  setColumn(x, y, ids) { for (let k = 0; k < DQ.MAXH; k++) this.cols[this.idx(x, y) * DQ.MAXH + k] = ids[k] || 0; this.hgt[this.idx(x, y)] = Math.min(DQ.MAXH, ids.length); this.syncCell(x, y); }
  // ----- objects -----
  objAt(x, y) { return this.inside(x, y) ? this.objs.get(this.idx(x, y)) : null; }
  addObj(type, x, y, o = {}) {
    if (!this.inside(x, y) || this.objs.has(this.idx(x, y))) return null;
    const def = DQ.OBJECTS[type]; if (!def) return null;
    const ob = { id: this.nextId++, type, x, y, facing: o.facing || 0, hp: def.hp, open: false, openT: 0, home: { x, y }, born: o.gen ? 0 : 1, ...o.extra };
    this.objs.set(this.idx(x, y), ob); this.list.push(ob); this.syncCell(x, y);
    if (!o.silent) DQ.events.emit('objectPlaced', { obj: ob, type, x, y, fromGen: !!o.gen });
    return ob;
  }
  removeObj(ob, silent) {
    this.objs.delete(this.idx(ob.x, ob.y)); const k = this.list.indexOf(ob); if (k >= 0) this.list.splice(k, 1);
    this.syncCell(ob.x, ob.y); if (!silent) DQ.events.emit('objectRemoved', { obj: ob });
  }
  worldPos(x, y) { return [x * T + T / 2, y * T + T / 2]; }
  cellOf(px, py) { return [Math.floor(px / T), Math.floor(py / T)]; }
  // can something walk through (for AI): height 0, no solid object, not water, closed doors blocked for monsters
  walkable(x, y, forMonster) {
    if (!this.inside(x, y)) return false; const i = this.idx(x, y);
    if (this.hgt[i] > 0) return false;
    if (this.floor[i] === 'water') return false;
    const o = this.objs.get(i); if (o) { const d = DQ.OBJECTS[o.type]; if (d.door) return !(forMonster && !o.open); if (d.solid) return false; }
    return true;
  }
  // ----- A* on cells; breaker=true lets paths pass through player-built blocks and doors at a cost -----
  path(sx, sy, tx, ty, o = {}) {
    const W = this.W, H = this.H, cap = o.cap || 2600, breaker = !!o.breaker, mon = o.monster;
    if (!this.inside(tx, ty) || !this.inside(sx, sy)) return null;
    const g = new Map(), f = new Map(), from = new Map(), open = [[sx + sy * W, 0]];
    g.set(sx + sy * W, 0); let n = 0;
    const tkey = tx + ty * W, hfn = (x, y) => Math.max(Math.abs(x - tx), Math.abs(y - ty)) + .4 * Math.min(Math.abs(x - tx), Math.abs(y - ty));
    const cost = (x, y) => {
      if (x === tx && y === ty) return 1;
      if (this.walkable(x, y, mon)) return 1;
      if (breaker && this.inside(x, y)) { const i = this.idx(x, y), o2 = this.objs.get(i); if (o2 && DQ.OBJECTS[o2.type].door) return 4; if (this.townCells.has(i) || o2) return 8; }
      return 0;
    };
    const closed = new Set();
    while (open.length && n < cap) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][1] < open[bi][1]) bi = i;
      const [k] = open.splice(bi, 1)[0]; if (closed.has(k)) continue; closed.add(k); n++;
      if (k === tkey) { const out = []; let c = k; while (c !== undefined) { out.push([c % W, Math.floor(c / W)]); c = from.get(c); } return out.reverse(); }
      const cx = k % W, cy = Math.floor(k / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (!this.inside(nx, ny)) continue;
        const c = cost(nx, ny); if (!c) continue;
        if (dx && dy && (!cost(cx + dx, cy) || !cost(cx, cy + dy))) continue;
        const nk = nx + ny * W, ng = g.get(k) + c * (dx && dy ? 1.41 : 1);
        if (g.has(nk) && g.get(nk) <= ng) continue; g.set(nk, ng); from.set(nk, k); open.push([nk, ng + hfn(nx, ny)]);
      }
    }
    return null;
  }
  nearestWalkable(x, y, maxR = 6) {
    for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (this.walkable(x + dx, y + dy)) return [x + dx, y + dy];
    }
    return null;
  }
  hash() { let h = 2166136261; for (let i = 0; i < this.hgt.length; i++) { h ^= this.hgt[i] + 1; h = Math.imul(h, 16777619); } for (const o of this.list) { h ^= o.x * 31 + o.y * 7 + DQ.hash(o.type); h = Math.imul(h, 16777619); } return h >>> 0; }
  // ----- save diff -----
  diff() {
    const out = []; for (const i of this.edits) { const cols = []; for (let k = 0; k < this.hgt[i]; k++) cols.push(this.cols[i * DQ.MAXH + k]); out.push([i, cols, this.townCells.has(i) ? 1 : 0]); }
    return out;
  }
  applyDiff(list) { for (const [i, cols, tw] of list) { const x = i % this.W, y = Math.floor(i / this.W); this.setColumn(x, y, cols); this.edits.add(i); if (tw) this.townCells.add(i); } }
}
DQ.World = World;

// ---------- regions ----------
DQ.REGIONS = { glen: 'Thimble Glen', plaza: 'Thimbleton', crags: 'Corduroy Crags', quarry: 'Button Quarry', fray: 'The Fraying', lake: 'Lake Bobbin' };
DQ.regionAt = (x, y) => {
  if (Math.hypot(x - 57, y - 60) < 8) return 'lake';
  if (Math.hypot(x - 37, y - 47) < 11) return 'plaza';
  if (x <= 11) return 'fray';
  if (y <= 17 && x >= 20 && x <= 52) return 'quarry';
  if (x >= 52 && y <= 46) return 'crags';
  return 'glen';
};
DQ.POI = {
  start: [16, 58], plaza: [37, 47], banner: [37, 47], rift: [4, 47], arena: [36, 9], portalPlaza: [31, 44], portalCrags: [53, 40], portalQuarry: [36, 19],
  nook: [8, 58], knotChamber: [7, 60]
};

// ---------- the story world ----------
DQ.generateStory = function () {
  const W = 72, H = 72, w = new World(W, H, 'story');
  const rng = DQ.rng('worldgen'), N = (x, y, s) => DQ.noise(x / 9, y / 9, s);
  const setF = (x, y, t) => { if (w.inside(x, y)) w.floor[w.idx(x, y)] = t; };
  const col = (x, y, ids) => { if (w.inside(x, y)) { const i = w.idx(x, y); for (let k = 0; k < DQ.MAXH; k++) w.cols[i * DQ.MAXH + k] = ids[k] || 0; w.hgt[i] = ids.length; } };
  const felt = DQ.blockId('felt'), cobble = DQ.blockId('cobble'), copper = DQ.blockId('copper'), steel = DQ.blockId('steel'), fray = DQ.blockId('fray'), burlap = DQ.blockId('burlap'), knot = DQ.blockId('knot'), snow = DQ.blockId('snow');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const reg = DQ.regionAt(x, y); let f = 'grass', ids = [];
    if (reg === 'lake') { f = Math.hypot(x - 57, y - 60) < 6.5 ? 'water' : 'sand'; }
    else if (reg === 'plaza') { f = Math.hypot(x - 37, y - 47) < 7 ? 'stone' : 'dirt'; }
    else if (reg === 'glen') { const n = N(x, y, 3); if (n > .62) ids = n > .72 ? [felt, felt] : [felt]; if (N(x + 40, y, 9) > .7 && y > 52 && x > 40) f = 'sand'; }
    else if (reg === 'crags') {
      f = 'stone'; const n = N(x, y, 11) * 1.25 + (46 - y) * .004; const hh = n > .72 ? 4 : n > .6 ? 3 : n > .5 ? 2 : n > .42 ? 1 : 0;
      for (let k = 0; k < hh; k++) ids.push(cobble);
      if (hh >= 2 && rng() < .12) ids[hh - 1] = copper;
      if (hh >= 3 && y < 26 && rng() < .15) ids[hh - 1] = steel;
      if (hh >= 4 && y < 22) ids[hh - 1] = snow;
    }
    else if (reg === 'quarry') {
      f = 'stone'; const edge = Math.min(x - 20, 52 - x, y); const n = N(x, y, 21);
      if (edge < 2) ids = [cobble, cobble, cobble, cobble]; else if (n > .66 && !(x > 28 && x < 45 && y > 2 && y < 15)) ids = [cobble, cobble];
      if (ids.length >= 2 && rng() < .08) ids[ids.length - 1] = copper;
    }
    else if (reg === 'fray') {
      f = 'fray'; const n = N(x, y, 31); if (n > .66 && Math.abs(y - 47) > 3) ids = n > .75 ? [fray, fray, fray] : [fray, fray];
    }
    w.floor[w.idx(x, y)] = f; col(x, y, ids);
  }
  // world rim (the Unravel's edge)
  for (let i = 0; i < W; i++) for (const [x, y] of [[i, 0], [i, H - 1], [0, i], [W - 1, i]]) { col(x, y, [fray, fray, fray, fray, fray, fray]); }
  // starting clearing and the road to Thimbleton
  const clear = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (w.inside(x, y) && Math.hypot(x - cx, y - cy) <= r) { col(x, y, []); if (w.floor[w.idx(x, y)] === 'water') w.floor[w.idx(x, y)] = 'grass'; } };
  const road = (pts, wd = 1) => { for (let p = 0; p < pts.length - 1; p++) { const [ax, ay] = pts[p], [bx, by] = pts[p + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let s = 0; s <= n; s++) { const x = Math.round(ax + (bx - ax) * s / n), y = Math.round(ay + (by - ay) * s / n); clear(x, y, wd); for (let dy = -wd; dy <= wd; dy++) for (let dx = -wd; dx <= wd; dx++) if (w.inside(x + dx, y + dy) && w.floor[w.idx(x + dx, y + dy)] !== 'stone') w.floor[w.idx(x + dx, y + dy)] = 'dirt'; } } };
  clear(DQ.POI.start[0], DQ.POI.start[1], 4);
  clear(37, 47, 10);
  road([[16, 58], [24, 55], [31, 50], [37, 47]], 1);
  road([[37, 47], [37, 36], [36, 19]], 1);               // north to the quarry
  road([[37, 47], [46, 44], [53, 40]], 1);               // east to the crags
  road([[37, 47], [24, 47], [13, 47], [6, 47]], 1);      // west to the Fraying
  clear(DQ.POI.arena[0], DQ.POI.arena[1], 6);
  clear(53, 40, 2); clear(36, 19, 2); clear(31, 44, 1);
  // quarry arena pillars (cobble, 4 high)
  for (const [x, y] of [[31, 5], [41, 5], [31, 12], [41, 12]]) col(x, y, [cobble, cobble, cobble, cobble]);
  // knot-sealed chamber in the Fraying: needs the Seam Ripper
  for (let y = 54; y <= 62; y++) for (let x = 4; x <= 11; x++) { const edge = x === 4 || x === 11 || y === 54 || y === 62; if (edge) col(x, y, [knot, knot, knot]); else col(x, y, []); }
  col(11, 58, [knot, knot]); w.floor[w.idx(8, 58)] = 'fray';
  for (let y = 55; y <= 61; y++) for (let x = 5; x <= 10; x++) w.floor[w.idx(x, y)] = 'fray';
  // plants and props
  const free = (x, y) => w.inside(x, y) && !w.hgt[w.idx(x, y)] && w.floor[w.idx(x, y)] !== 'water' && w.floor[w.idx(x, y)] !== 'stone' && !w.objs.has(w.idx(x, y));
  const scatter = (type, n, test, seed) => { const r = DQ.rng('scatter' + seed); let tries = 0, c = 0; while (c < n && tries++ < n * 40) { const x = 2 + Math.floor(r() * (W - 4)), y = 2 + Math.floor(r() * (H - 4)); if (!free(x, y) || !test(x, y)) continue; if (Math.hypot(x - 37, y - 47) < 9 && type !== 'tuft') continue; if (Math.hypot(x - 16, y - 58) < 2) continue; w.addObj(type, x, y, { gen: true, facing: r() * 6 }); c++; } };
  const glen = (x, y) => DQ.regionAt(x, y) === 'glen' && w.floor[w.idx(x, y)] === 'grass';
  scatter('tree', 70, glen, 1); scatter('cottonbush', 38, glen, 2); scatter('berrybush', 26, glen, 3); scatter('tuft', 120, glen, 4);
  scatter('boulder', 14, (x, y) => DQ.regionAt(x, y) !== 'fray' && DQ.regionAt(x, y) !== 'plaza', 5);
  scatter('pine', 40, (x, y) => DQ.regionAt(x, y) === 'crags' && w.floor[w.idx(x, y)] === 'stone' && x > 54, 6);
  scatter('cottonbush', 8, (x, y) => DQ.regionAt(x, y) === 'fray', 7);
  // ancient buttons (collectibles)
  const BUTTONS = [[20, 66], [45, 64], [66, 20], [58, 8], [25, 8], [47, 8], [8, 40], [3, 66], [62, 34], [30, 28], [6, 58], [8, 60], [9, 57], [6, 56]];
  for (const [x, y] of BUTTONS) { const q = w.nearestWalkable(x, y, 3) || [x, y]; w.addObj('button', q[0], q[1], { gen: true }); }
  // portals
  for (const k of ['portalPlaza', 'portalCrags', 'portalQuarry']) { const [x, y] = DQ.POI[k]; w.addObj('portal', x, y, { gen: true, extra: { name: k === 'portalPlaza' ? 'Thimbleton' : k === 'portalCrags' ? 'Corduroy Crags' : 'Button Quarry', key: k } }); }
  // a few treasure chests
  const tre = [[44, 62, ['heartpatch']], [60, 12, ['steelthread']]];
  for (const [x, y, items] of tre) { const q = w.nearestWalkable(x, y, 4) || [x, y]; const c = w.addObj('chest', q[0], q[1], { gen: true }); c.items = items.map(id => ({ id, n: 1 })); }
  w.refreshFloor();
  return w;
};

// ---------- the Quilting Bee world (small arena, shared seed) ----------
DQ.generateBee = function () {
  const W = 36, H = 36, w = new World(W, H, 'bee');
  const r = DQ.rng('beegen');
  const felt = DQ.blockId('felt'), cobble = DQ.blockId('cobble'), wool = DQ.blockId('wool');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    w.floor[w.idx(x, y)] = 'grass';
    const d = Math.hypot(x - 18, y - 18), n = DQ.noise(x / 5, y / 5, 71);
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { w.cols[w.idx(x, y) * DQ.MAXH] = cobble; w.hgt[w.idx(x, y)] = 4; for (let k = 0; k < 4; k++) w.cols[w.idx(x, y) * DQ.MAXH + k] = cobble; }
    else if (d > 6 && n > .64) { w.cols[w.idx(x, y) * DQ.MAXH] = felt; w.hgt[w.idx(x, y)] = 1; }
    else if (d > 6 && n < .2) { w.cols[w.idx(x, y) * DQ.MAXH] = cobble; w.cols[w.idx(x, y) * DQ.MAXH + 1] = cobble; w.hgt[w.idx(x, y)] = 2; }
    if (d < 5) w.floor[w.idx(x, y)] = 'dirt';
  }
  const free = (x, y) => w.inside(x, y) && !w.hgt[w.idx(x, y)] && !w.objs.has(w.idx(x, y)) && Math.hypot(x - 18, y - 18) > 4;
  const sc = (type, n) => { let c = 0, t = 0; while (c < n && t++ < n * 40) { const x = 2 + Math.floor(r() * (W - 4)), y = 2 + Math.floor(r() * (H - 4)); if (free(x, y) && w.addObj(type, x, y, { gen: true, facing: r() * 6 })) c++; } };
  sc('tree', 14); sc('boulder', 6); sc('cottonbush', 8); sc('tuft', 16);
  w.refreshFloor();
  return w;
};

// ---------- rooms ----------
// A room: an enclosed floor area of 2..64 cells, every border cell a wall >= 2 high or a door; >=1 door, >=1 light.
DQ.detectRooms = function (w, bounds) {
  const rooms = [], seen = new Set(), W = w.W;
  const x0 = Math.max(1, bounds.x0), x1 = Math.min(w.W - 2, bounds.x1), y0 = Math.max(1, bounds.y0), y1 = Math.min(w.H - 2, bounds.y1);
  const isFloor = (x, y) => { if (!w.inside(x, y)) return false; const i = w.idx(x, y); if (w.hgt[i] > 0 && w.hgt[i] < 2) return false; if (w.hgt[i] >= 2) return false; if (w.floor[i] === 'water') return false; const o = w.objs.get(i); if (o && DQ.OBJECTS[o.type].door) return false; return true; };
  const isWallish = (x, y) => { if (!w.inside(x, y)) return false; const i = w.idx(x, y); if (w.hgt[i] >= 2) return true; const o = w.objs.get(i); return !!(o && DQ.OBJECTS[o.type].door && !w.hgt[i]); };
  for (let sy = y0; sy <= y1; sy++) for (let sx = x0; sx <= x1; sx++) {
    const si = sx + sy * W; if (seen.has(si) || !isFloor(sx, sy)) continue;
    const cells = [], q = [[sx, sy]]; seen.add(si); let leak = null, doors = new Set(), lights = 0, ok = true;
    while (q.length) {
      const [x, y] = q.pop(); cells.push([x, y]);
      if (cells.length > 64) { ok = false; leak = leak || [x, y, 'too big (max 64)']; }
      if (x < x0 || x > x1 || y < y0 || y > y1) { ok = false; leak = leak || [x, y, 'leaks out of the town']; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, ni = nx + ny * W;
        if (isFloor(nx, ny)) { if (!seen.has(ni)) { if (cells.length + q.length <= 400) { seen.add(ni); q.push([nx, ny]); } else { ok = false; leak = leak || [nx, ny, 'too big (max 64)']; } } }
        else if (isWallish(nx, ny)) { const o = w.objs.get(ni); if (o && DQ.OBJECTS[o.type].door) doors.add(ni); }
        else { ok = false; leak = leak || [nx, ny, 'walls must be 2 blocks high']; }
      }
    }
    if (!ok || cells.length < 2 || cells.length > 64) { if (cells.length >= 4 && leak) rooms.push({ ok: false, leak, cells: cells.slice(0, 80) }); continue; }
    const counts = {}; for (const [x, y] of cells) { const o = w.objs.get(x + y * W); if (o) { const d = DQ.OBJECTS[o.type]; counts[o.type] = (counts[o.type] || 0) + 1; if (d.room === 'light' || d.light && !d.station) lights++; if (d.light) counts._light = (counts._light || 0) + 1; } }
    // lights placed in the room's walls' neighbours also count if a light object sits on a perimeter wall top: keep simple (inside only)
    const nl = counts._light || 0;
    if (!doors.size) { rooms.push({ ok: false, leak: [cells[0][0], cells[0][1], 'needs a door'], cells }); continue; }
    if (!nl) { rooms.push({ ok: false, leak: [cells[0][0], cells[0][1], 'needs a light'], cells }); continue; }
    let type = 'Snug'; for (const def of DQ.ROOMS) { if (def.minCells && cells.length < def.minCells) continue; if (Object.entries(def.needs).every(([k, n]) => (counts[k] || 0) >= n)) { type = def.type; break; } }
    let cx = 0, cy = 0; for (const [x, y] of cells) { cx += x; cy += y; } cx /= cells.length; cy /= cells.length;
    rooms.push({ ok: true, type, cells, counts, doors: [...doors], cx, cy, size: cells.length });
  }
  return rooms;
};
})();
