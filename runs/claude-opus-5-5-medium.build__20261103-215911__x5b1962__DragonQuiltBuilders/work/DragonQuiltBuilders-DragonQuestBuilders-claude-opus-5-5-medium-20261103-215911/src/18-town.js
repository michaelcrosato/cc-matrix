// Rooms (enclosed floors with walls 2 high, a door and a light), the town (Banner, border, Cheer, levels) and Patterns.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;
const WALL = 1, DOOR = 2, FLOOR = 3, OPEN = 0;

// ---- Patterns (blueprints): layers bottom to top, rows north to south; legend: block key or { obj, facing } ----
function hallLayers() {
  const W = 11, D = 9, L = [];
  const per = (x, y) => x === 0 || y === 0 || x === W - 1 || y === D - 1;
  const door = (x, y) => x === 5 && y === D - 1;
  const row = f => { const rows = []; for (let y = 0; y < D; y++) { let s = ''; for (let x = 0; x < W; x++) s += f(x, y); rows.push(s); } return rows; };
  let k = 0;
  L.push(row((x, y) => door(x, y) ? 'D' : per(x, y) ? 'c' : ((x === 1 || x === W - 2) && (y === 1 || y === D - 2)) ? 'L' : '.'));
  L.push(row((x, y) => door(x, y) ? '^' : per(x, y) ? 'p' : '.'));
  L.push(row((x, y) => per(x, y) ? 'p' : '.'));
  const fel = ['r', 'b', 'y']; k = 0;
  L.push(row((x, y) => { if (!per(x, y)) return '.'; const i = y === 0 ? x : x === W - 1 ? W - 1 + y : y === D - 1 ? W - 1 + D - 1 + (W - 1 - x) : 2 * (W - 1) + D - 1 + (D - 1 - y); return i % 2 === 0 ? fel[(i / 2 | 0) % 3] : '.'; }));
  return L;
}
function barn(h, cren) {
  const W = 7, D = 5, per = (x, y) => x === 0 || y === 0 || x === W - 1 || y === D - 1, door = (x, y) => x === 3 && y === D - 1;
  const row = f => { const rows = []; for (let y = 0; y < D; y++) { let s = ''; for (let x = 0; x < W; x++) s += f(x, y); rows.push(s); } return rows; };
  const L = [row((x, y) => door(x, y) ? 'D' : per(x, y) ? 'c' : (x === 1 && y === 1) || (x === W - 2 && y === 1) ? 'T' : '.')];
  for (let i = 1; i < h; i++) L.push(row((x, y) => door(x, y) && i === 1 ? '^' : per(x, y) ? (i === h - 1 && h > 2 ? 'r' : 'p') : '.'));
  if (cren) L.push(row((x, y) => per(x, y) && (x + y) % 2 === 0 && cren-- > 0 ? 'r' : '.'));
  return L;
}
const LEG = { c: 'cobble', p: 'planks', r: 'feltRed', b: 'feltBlue', y: 'feltYellow', D: { obj: 'plankDoor' }, L: { obj: 'lantern' }, T: { obj: 'torch' }, '^': { door: true } };
DQ.PATTERNS = {
  hall: { id: 'hall', name: "Quilters' Hall", layers: hallLayers(), legend: Object.assign({}, LEG), reward: { cheer: 100 } },
  barn1: { id: 'barn1', name: 'Quilt Barn', layers: barn(2, 0), legend: Object.assign({}, LEG, { D: { obj: 'latticeDoor' } }) },
  barn2: { id: 'barn2', name: 'Quilt Barn', layers: barn(3, 0), legend: Object.assign({}, LEG, { D: { obj: 'latticeDoor' } }) },
  barn3: { id: 'barn3', name: 'Quilt Barn', layers: barn(3, 10), legend: Object.assign({}, LEG, { D: { obj: 'latticeDoor' } }) }
};
// the cells of a pattern at an origin and rotation: [{ x, y, z, block | obj }]
DQ.patternCells = (pid, ox, oy, oz, rot = 0) => {
  const P = DQ.PATTERNS[pid], out = [], D = P.layers[0].length, W = P.layers[0][0].length;
  P.layers.forEach((rows, l) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const leg = P.legend[ch]; if (!leg || ch === '.' || leg.door) return;
    let rx = x, ry = y; if (rot === 1) { rx = D - 1 - y; ry = x; } else if (rot === 2) { rx = W - 1 - x; ry = D - 1 - y; } else if (rot === 3) { rx = y; ry = W - 1 - x; }
    const c = { x: ox + rx, y: oy + ry, z: oz + l };
    if (typeof leg === 'string') c.block = DQ.blockId(leg); else { c.obj = leg.obj; c.facing = (rot + 1) % 4; }
    out.push(c);
  })));
  return out;
};
DQ.patternSize = (pid, rot = 0) => { const P = DQ.PATTERNS[pid], D = P.layers[0].length, W = P.layers[0][0].length; return rot % 2 ? [D, W] : [W, D]; };

// ---- rooms ----
class Rooms {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.awarded = {}; this.awardCount = {}; this.dirty = 0; this.lastFail = null; this.debug = null; }
  mark() { this.dirty = .3; }
  update(dt) { if (this.dirty > 0) { this.dirty -= dt; if (this.dirty <= 0) this.detect(); } }
  region() {
    const t = this.ctx.town;
    if (t && t.planted) { const r = t.radius + 3; return [t.bx - r, t.by - r, t.bx + r, t.by + r]; }
    const b = this.ctx.builder; if (!b) return null; const cx = Math.floor(b.body.x / T), cy = Math.floor(b.body.y / T); return [cx - 12, cy - 12, cx + 12, cy + 12];
  }
  detect(o = {}) {
    const ctx = this.ctx, w = ctx.world, reg = o.region || this.region(); if (!reg) return [];
    const [x0, y0, x1, y1] = [Math.max(1, reg[0]), Math.max(1, reg[1]), Math.min(w.W - 2, reg[2]), Math.min(w.D - 2, reg[3])];
    const RW = x1 - x0 + 1, RD = y1 - y0 + 1;
    let lmin = 99, lmax = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const t = w.topZ(x, y); if (t) { lmin = Math.min(lmin, t - 3); lmax = Math.max(lmax, t); } }
    lmin = Math.max(1, lmin); lmax = Math.min(w.H - 2, lmax);
    const found = [], fails = [];
    const cls = new Uint8Array(RW * RD), seen = new Uint8Array(RW * RD);
    const solidWall = (x, y, z) => { const id = w.get(x, y, z); return id && DQ.BLOCKS[id].solid && DQ.BLOCKS[id].shape !== 'stair'; };
    for (let L = lmin; L <= lmax; L++) {
      let anyFloor = false;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = (y - y0) * RW + (x - x0), o = w.objAt(x, y, L);
        let c = OPEN;
        if (o && o.def.door && o.z === L) c = DOOR;
        else if (solidWall(x, y, L) && solidWall(x, y, L + 1)) c = WALL;
        else if (!w.solidAt(x, y, L) && !w.solidAt(x, y, L + 1) && w.solidAt(x, y, L - 1) && !w.liquidAt(x, y, L) && !(o && o.def.door)) { c = FLOOR; anyFloor = true; }
        cls[i] = c;
      }
      if (!anyFloor) continue;
      seen.fill(0);
      // a door counts only set in a straight wall
      const okDoor = (x, y) => { const a = (xx, yy) => { if (xx < x0 || yy < y0 || xx > x1 || yy > y1) return false; const c = cls[(yy - y0) * RW + (xx - x0)]; return c === WALL || c === DOOR; }; return (a(x - 1, y) && a(x + 1, y)) || (a(x, y - 1) && a(x, y + 1)); };
      for (let sy = y0; sy <= y1; sy++) for (let sx = x0; sx <= x1; sx++) {
        const si = (sy - y0) * RW + (sx - x0); if (cls[si] !== FLOOR || seen[si]) continue;
        const cells = [], stack = [[sx, sy]]; seen[si] = 1; let leak = false, edge = false, doors = new Set(), leakCell = null;
        while (stack.length) {
          const [x, y] = stack.pop(); cells.push([x, y]);
          if (cells.length > 120) { edge = true; }
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < x0 || ny < y0 || nx > x1 || ny > y1) { edge = true; continue; }
            const ni = (ny - y0) * RW + (nx - x0), c = cls[ni];
            if (c === FLOOR) { if (!seen[ni]) { seen[ni] = 1; stack.push([nx, ny]); } }
            else if (c === DOOR) { if (okDoor(nx, ny)) doors.add(nx + ',' + ny); else { leak = true; leakCell = leakCell || [nx, ny, 'door']; } }
            else if (c === OPEN) { leak = true; if (!leakCell) leakCell = [nx, ny, solidWall(nx, ny, L) ? 'low' : 'gap']; }
          }
        }
        if (edge) continue;
        const has = {}; let lights = 0, felt = false;
        const cellSet = new Set(cells.map(c => c[0] + ',' + c[1]));
        for (const [x, y] of cells) {
          const ob = w.objAt(x, y, L); if (ob && ob.z === L) { has[ob.id] = (has[ob.id] || 0) + 1; if (ob.def.roomLight) lights++; }
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (cellSet.has((x + dx) + ',' + (y + dy))) continue; for (const l of [L, L + 1]) { const id = w.get(x + dx, y + dy, l); if (id === 26) lights++; if (id && DQ.BLOCKS[id].felt) felt = true; } }
        }
        const r = { L, cells, size: cells.length, has, lights, doors: doors.size, felt, cx: cells.reduce((a, c) => a + c[0], 0) / cells.length, cy: cells.reduce((a, c) => a + c[1], 0) / cells.length };
        let why = null;
        if (leak) why = leakCell && leakCell[2] === 'low' ? 'walls must be 2 blocks high' : leakCell && leakCell[2] === 'door' ? 'doors must sit in a straight wall' : 'there is a gap in the walls';
        else if (r.size > 64) why = 'too big (max 64)';
        else if (r.size < 2) why = 'too small';
        else if (!doors.size) why = 'a door';
        else if (!lights) why = 'a light';
        if (why) { if (cells.length <= 90 && cells.length >= 2) fails.push(Object.assign(r, { why, leak: leakCell })); continue; }
        // the Quilters' Hall: the finished hall pattern's interior
        const t = ctx.town; if (t && t.hallDone && t.hallInterior && cells.filter(c => t.hallInterior.has(c[0] + ',' + c[1])).length >= cells.length * .8) r.pattern = 'hall';
        r.inBorder = !t || !t.planted ? false : cells.every(([x, y]) => t.inBorder(x, y));
        const type = DQ.ROOMS.find(q => q.need(r)); r.type = type.id; r.name = type.name;
        r.key = r.type + ':' + Math.round(r.cx) + ',' + Math.round(r.cy) + ',' + L;
        found.push(r);
      }
    }
    // match to the previous set: new or changed rooms form, missing ones are lost
    const prev = this.list, events = ctx.events;
    for (const r of found) {
      const old = prev.find(p => p.L === r.L && overlap(p, r) >= .7);
      if (!old || old.type !== r.type) { events.emit('roomFormed', { room: r, changed: !!old }); this._award(r); }
    }
    for (const p of prev) if (!found.some(r => r.L === p.L && overlap(p, r) >= .7)) events.emit('roomLost', { room: p });
    this.list = found; this.fails = fails;
    const b = ctx.builder;
    const near = f => Math.hypot(f.cx - b.body.x / T, f.cy - b.body.y / T) + Math.abs(f.L - Math.floor((b.body.z + 1) / T)) * 4;
    this.lastFail = b ? fails.filter(f => Math.hypot(f.cx - b.body.x / T, f.cy - b.body.y / T) < 10).sort((a, c) => near(a) - near(c))[0] || null : null;
    return found;
  }
  _award(r) {
    const ctx = this.ctx, def = DQ.room(r.type);
    if (!r.inBorder) { if (ctx.town && ctx.town.planted && ctx.hud) ctx.hud.hint('Rooms only count inside the town border!'); return; }
    if (this.awarded[r.key]) return;
    const n = this.awardCount[r.type] || 0; if (n >= def.max) return;
    this.awarded[r.key] = true; this.awardCount[r.type] = n + 1;
    ctx.stats.rooms++;
    if (ctx.town) ctx.town.addCheer(def.cheer, 'room');
  }
  has(type, fn) { return this.list.some(r => r.type === type && r.inBorder && (!fn || fn(r))); }
  roomAt(x, y, L) { return this.list.find(r => r.L === L && r.cells.some(c => c[0] === x && c[1] === y)) || null; }
  serialize() { return { awarded: Object.assign({}, this.awarded), count: Object.assign({}, this.awardCount) }; }
  load(d) { this.awarded = Object.assign({}, d.awarded || {}); this.awardCount = Object.assign({}, d.count || {}); this.list = []; this.detect({ silent: true }); }
}
function overlap(a, b) { const s = new Set(a.cells.map(c => c[0] + ',' + c[1])); let n = 0; for (const c of b.cells) if (s.has(c[0] + ',' + c[1])) n++; return n / Math.max(a.cells.length, b.cells.length); }
DQ.Rooms = Rooms;

// ---- the town ----
class Town {
  constructor(ctx, o = {}) {
    this.ctx = ctx; this.planted = false; this.bx = o.bx || DQ.WORLD.banner[0]; this.by = o.by || DQ.WORLD.banner[1]; this.bz = 9;
    this.level = 1; this.cheer = 0; this.bubbles = []; this.pattern = null; this.placing = null; this.hallDone = false; this.hallInterior = null;
    this.townChest = null; this._grow = 0; this.radiusShown = 0; this.helpLog = [];
  }
  get radius() { return DQ.LEVELS[this.level].r; }
  inBorder(x, y) { return this.planted && Math.abs(x - this.bx) <= this.radius && Math.abs(y - this.by) <= this.radius; }
  spawnPoint() { return [(this.bx + .5) * T, (this.by + 2.5) * T, this.bz * T]; }
  bannerObj() { return this.ctx.objects.find(o => o.id === 'banner'); }
  nextCheer() { const n = DQ.LEVELS[this.level + 1]; return n ? n.cheer : null; }
  tryPlant(b) {
    const ctx = this.ctx, [sx, sy] = DQ.WORLD.banner, d = Math.hypot(b.body.x / T - (sx + .5), b.body.y / T - (sy + .5));
    if (this.planted) return false;
    if (d > 4) { if (ctx.hud) ctx.hud.hint('Plant the Banner at the marked spot in the ruins of Thimbleton.'); return false; }
    b.bag.remove('banner', 1); this.plant(true);
    return true;
  }
  plant(cut) {
    const ctx = this.ctx, [sx, sy] = DQ.WORLD.banner, w = ctx.world;
    this.bx = sx; this.by = sy; this.bz = w.topZ(sx, sy); this.planted = true;
    const ex = w.objAt(sx, sy, this.bz); if (ex && ex.def.plant) ctx.objects.remove(ex, { silent: true, noRegrow: true });
    if (!this.bannerObj()) ctx.objects.add({ id: 'banner', x: sx, y: sy, z: this.bz, hp: 300 }, { force: true });
    ctx.flags.bannerPlanted = true; this.radiusShown = 0;
    ctx.events.emit('bannerPlanted', {});
    if (cut && ctx.cutscenes) ctx.cutscenes.play('plantBanner');
    if (ctx.crafting) ctx.crafting.trigger('flag', 'bannerPlanted');
    ctx.rooms && ctx.rooms.mark();
  }
  addCheer(n, src) {
    if (!this.planted) return;
    const k = Math.round(n * DQ.tuning.get('cheer')); this.cheer += k; this.ctx.stats.cheerEarned += k;
    this.ctx.events.emit('cheer', { n: k, src });
    while (DQ.LEVELS[this.level + 1] && this.cheer >= DQ.LEVELS[this.level + 1].cheer && this.level < (this.ctx.flags.bossBeaten ? 5 : 4)) this.levelUp();
  }
  levelUp(silent) {
    this.level++; this._grow = 1.5;
    const ctx = this.ctx; ctx.events.emit('townLevel', { level: this.level, silent });
    if (ctx.crafting) { ctx.crafting.trigger('level', this.level); ctx.crafting.recheck(); }
    ctx.rooms && ctx.rooms.mark();
  }
  update(dt) {
    const ctx = this.ctx;
    if (this._grow > 0) this._grow -= dt;
    this.radiusShown = E.approach(this.radiusShown, this.radius, dt * 8);
    // cheer bubbles: walk within 2 blocks to collect
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const q = this.bubbles[i]; q.t += dt;
      if (q.fly) { q.fly -= dt; if (q.fly <= 0) { this.bubbles.splice(i, 1); this.addCheer(5, 'bubble'); ctx.audioX && ctx.audioX.sfx('bubble'); ctx.hud && ctx.hud.pulseBanner(); } continue; }
      if (q.owner && q.owner.body) { q.x = q.owner.body.x; q.y = q.owner.body.y; q.z = q.owner.body.z + 38; }
      for (const b of ctx.builders) if (!b.ko && Math.hypot(b.body.x - q.x, b.body.y - q.y) < 2 * T && Math.abs(b.body.z + 20 - q.z) < 40) { q.fly = .5; q.owner = null; ctx.audioX && ctx.audioX.sfx('bubble'); break; }
    }
    // the Pattern: count matching cells
    if (this.pattern) this._patternCheck();
  }
  addBubble(owner, need) { if (!this.planted) return; this.bubbles.push({ owner, need, x: owner.body.x, y: owner.body.y, z: owner.body.z + 38, t: 0 }); }
  // ---- patterns ----
  startPlacing(pid, b) {
    if (!this.planted) return false;
    if (this.pattern && !this.pattern.done) { this.ctx.hud && this.ctx.hud.hint('A pattern is already laid out.'); return false; }
    this.placing = { pid, rot: 0, x: 0, y: 0, z: 0, ok: false, why: '' };
    this.ctx.hud && this.ctx.hud.hint('Lay out the Pattern: {btn:place} to confirm, {btn:hotbar} to turn, {btn:interact} to cancel.');
    return true;
  }
  placingStep(it, b) {
    const p = this.placing, w = this.ctx.world;
    if (it.interact) { this.placing = null; return; }
    if (it.hot === 1 || it.hot === -1) p.rot = (p.rot + (it.hot > 0 ? 1 : 3)) % 4;
    // the footprint follows the cursor (or sits in front of the builder)
    let cx, cy; const [W, D] = DQ.patternSize(p.pid, p.rot);
    if (it.cursor) { cx = it.cursor.x; cy = it.cursor.y; } else { const [dx, dy] = DQ.DIR8(b.body.facing); cx = Math.floor(b.body.x / T) + dx * (Math.ceil(Math.max(W, D) / 2) + 1); cy = Math.floor(b.body.y / T) + dy * (Math.ceil(Math.max(W, D) / 2) + 1); }
    p.x = cx - (W >> 1); p.y = cy - (D >> 1);
    let lo = 99, hi = 0, inB = true, objBlock = false;
    for (let y = p.y; y < p.y + D; y++) for (let x = p.x; x < p.x + W; x++) { const t = w.topZ(x, y); lo = Math.min(lo, t); hi = Math.max(hi, t); if (!this.inBorder(x, y)) inB = false; for (let l = t - 1; l <= t + 4; l++) { const o = w.objAt(x, y, l); if (o && !o.def.plant) objBlock = true; } }
    p.z = w.topZ(cx, cy); p.ok = inB && hi - lo <= 1 && !objBlock;
    p.why = !inB ? 'Inside the town border, please!' : hi - lo > 1 ? 'The ground must be flat.' : objBlock ? 'Something is in the way.' : '';
    if (it.place) {
      if (!p.ok) { this.ctx.hud && this.ctx.hud.hint(p.why); this.ctx.audioX && this.ctx.audioX.sfx('uiCancel'); return; }
      this.layPattern(p.pid, p.x, p.y, p.z, p.rot); this.placing = null;
      if (p.pid === 'hall') { b.bag.remove('hallPattern', 1); this.ctx.flags.hallPlaced = true; this.ctx.events.emit('flag', { k: 'hallPlaced' }); }
    }
  }
  layPattern(pid, x, y, z, rot) {
    const cells = DQ.patternCells(pid, x, y, z, rot), w = this.ctx.world, [PW, PD] = DQ.patternSize(pid, rot), H = DQ.PATTERNS[pid].layers.length;
    const has = new Set(cells.map(c => c.x + ',' + c.y + ',' + c.z));
    for (let yy = y; yy < y + PD; yy++) for (let xx = x; xx < x + PW; xx++) {
      for (let l = z; l < z + H + 1; l++) if (!has.has(xx + ',' + yy + ',' + l) && w.get(xx, yy, l) && !w.liquidAt(xx, yy, l)) cells.push({ x: xx, y: yy, z: l, block: 0, clear: true });
      if (!w.solidAt(xx, yy, z - 1)) cells.push({ x: xx, y: yy, z: z - 1, block: DQ.blockId('earth'), fill: true });
    }
    this.pattern = { id: pid, x, y, z, rot, cells, built: 0, total: cells.length, done: false, need: {} };
    this.ctx.audioX && this.ctx.audioX.sfx('stitch');
    this.ctx.events.emit('patternPlaced', { id: pid });
    this._patternCheck();
  }
  cellOk(c) { const w = this.ctx.world; if (c.clear) return !w.get(c.x, c.y, c.z); if (c.block) { const id = w.get(c.x, c.y, c.z); return id === c.block; } const o = w.objAt(c.x, c.y, c.z); return !!o && o.id === c.obj; }
  _patternCheck() {
    const P = this.pattern; if (!P || P.done) return;
    let built = 0; const need = {};
    for (const c of P.cells) { c.ok = this.cellOk(c); if (c.ok) built++; else if (!c.clear) { const item = c.block ? DQ.BLOCKS[c.block].key : c.obj; need[item] = (need[item] || 0) + 1; } }
    if (built > P.built && P.built > 0) { this.ctx.audioX && this.ctx.audioX.sfx('arp'); }
    P.built = built; P.need = need;
    if (built === P.total) {
      P.done = true;
      if (P.id === 'hall') { this.hallDone = true; const [W, D] = DQ.patternSize('hall', P.rot); this.hallInterior = new Set(); for (let yy = P.y + 1; yy < P.y + D - 1; yy++) for (let xx = P.x + 1; xx < P.x + W - 1; xx++) this.hallInterior.add(xx + ',' + yy); this.ctx.flags.hallBuilt = true; }
      this.ctx.events.emit('patternDone', { id: P.id });
      this.ctx.rooms && this.ctx.rooms.mark();
    }
  }
  serialize() { return { planted: this.planted, level: this.level, cheer: this.cheer, pattern: this.pattern ? { id: this.pattern.id, x: this.pattern.x, y: this.pattern.y, z: this.pattern.z, rot: this.pattern.rot, done: this.pattern.done } : null, hallDone: this.hallDone, bubbles: this.bubbles.length }; }
  load(d) {
    this.planted = !!d.planted; this.level = d.level || 1; this.cheer = d.cheer || 0; this.hallDone = !!d.hallDone; this.radiusShown = this.radius;
    if (this.planted) { this.bz = this.ctx.world.topZ(this.bx, this.by); const b = this.bannerObj(); if (b) this.bz = b.z; }
    this.pattern = null;
    if (d.pattern) { this.layPattern(d.pattern.id, d.pattern.x, d.pattern.y, d.pattern.z, d.pattern.rot); if (d.pattern.done) { this.pattern.done = true; if (d.pattern.id === 'hall') { const [W, D] = DQ.patternSize('hall', d.pattern.rot); this.hallInterior = new Set(); for (let yy = d.pattern.y + 1; yy < d.pattern.y + D - 1; yy++) for (let xx = d.pattern.x + 1; xx < d.pattern.x + W - 1; xx++) this.hallInterior.add(xx + ',' + yy); } } }
  }
  // ---- drawing: the border stitch, pattern ghosts, bubbles ----
  draw(r) {
    const ctx = this.ctx, w = ctx.world, t = r.game.real, view = r.view;
    if (this.planted) {
      const R = this.radiusShown, x0 = this.bx - R, x1 = this.bx + R + 1, y0 = this.by - R, y1 = this.by + R + 1, night = ctx.clock && ctx.clock.isNight;
      const edge = (ax, ay, bx, by) => {
        const n = Math.round(Math.hypot(bx - ax, by - ay));
        for (let i = 0; i < n; i++) {
          const fx = ax + (bx - ax) * (i + .5) / n, fy = ay + (by - ay) * (i + .5) / n, cx = Math.floor(fx - (bx > ax ? 0 : bx < ax ? 1 : 0) * 0), cy = Math.floor(fy);
          const top = w.topZ(Math.min(w.W - 1, Math.max(0, Math.floor(fx))), Math.min(w.D - 1, Math.max(0, Math.floor(fy))));
          const z = (top || 0) * T + .5, wx = fx * T, wy = fy * T;
          const [sx, sy] = r.w(wx, wy, z); if (sx < -20 || sx > r.W + 20 || sy < -20 || sy > r.H + 20) continue;
          r.queue(wx, wy, z, g => {
            const a = r.w(ax * T + (bx - ax) * T * i / n, ay * T + (by - ay) * T * i / n, z), b = r.w(ax * T + (bx - ax) * T * (i + 1) / n, ay * T + (by - ay) * T * (i + 1) / n, z);
            const steps = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
            for (let k = 0; k < steps; k++) { if (((k + Math.floor(t * 8) + i * 3) % 4) >= 2) continue; px.rect(g, Math.round(a[0] + (b[0] - a[0]) * k / steps), Math.round(a[1] + (b[1] - a[1]) * k / steps), 1, 1, night ? '#fff0b0' : '#f1e6c8'); }
          }, { bias: -.003, emissive: !!night });
        }
      };
      edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
      // the banner spot glows until planted (drawn by the hud otherwise)
    } else if (ctx.flags.hasBanner || (ctx.quests && ctx.quests.active('m2'))) {
      const [sx, sy] = DQ.WORLD.banner, z = w.topZ(sx, sy) * T;
      r.queue((sx + .5) * T, (sy + .5) * T, z, g => { const pts = r.groundPts((sx + .5) * T, (sy + .5) * T, 10 + Math.sin(t * 3) * 2, 16, z + .5); px.polyDither(g, pts, '#ffd84a', .35, r.ix, r.iy); }, { bias: -.004, emissive: true });
    }
    // pattern ghosts
    const A = ctx.renderer && ctx.renderer.A;
    if (this.pattern && !this.pattern.done && A) {
      for (const c of this.pattern.cells) {
        if (c.ok) continue;
        const [sx, sy] = r.w((c.x + .5) * T, (c.y + .5) * T, c.z * T); if (sx < -30 || sx > r.W + 30 || sy < -40 || sy > r.H + 30) continue;
        if (w.cut && c.z >= w.cut.z && Math.hypot(c.x + .5 - w.cut.x, c.y + .5 - w.cut.y) < w.cut.r) continue;
        const wrong = c.clear || (c.block && w.get(c.x, c.y, c.z) && w.get(c.x, c.y, c.z) !== c.block);
        r.queue((c.x + .5) * T, (c.y + .5) * T, c.z * T, g => {
          if (c.block && !wrong) ctx.renderer.ghost(g, r, A, c.block, c.x, c.y, c.z, .35 + Math.sin(t * 3) * .05);
          else if (c.obj) { const p = r.w((c.x + .5) * T, (c.y + .5) * T, c.z * T + 8); const ic = DQ.Icons.get(Object.keys(DQ.ITEMS).find(k => DQ.ITEMS[k].obj === c.obj), 12); if (ic) { g.globalAlpha = .6; g.drawImage(ic, Math.round(p[0]) - 6, Math.round(p[1]) - 6); g.globalAlpha = 1; } }
          ctx.renderer.cube(g, r, c.x, c.y, c.z, wrong ? '#ff6a6a' : '#bfe8ff', true);
          if (wrong) { const p = r.w((c.x + .5) * T, (c.y + .5) * T, (c.z + 1) * T); DQ.Glyphs.tick(g, Math.round(p[0]) - 3, Math.round(p[1]) - 4, false); }
        }, { bias: .003 });
      }
    }
    // placement preview
    if (this.placing && A) {
      const p = this.placing, cells = DQ.patternCells(p.pid, p.x, p.y, p.z, p.rot);
      for (const c of cells) r.queue((c.x + .5) * T, (c.y + .5) * T, c.z * T, g => { if (c.block) ctx.renderer.ghost(g, r, A, c.block, c.x, c.y, c.z, .3); ctx.renderer.cube(g, r, c.x, c.y, c.z, p.ok ? '#6ae06a' : '#ff6a6a', true); }, { bias: .004 });
    }
    // cheer bubbles: pink hearts
    for (const q of this.bubbles) {
      r.queue(q.x, q.y, q.z, g => {
        let [sx, sy] = r.w(q.x, q.y, q.z + Math.sin(t * 3 + q.t) * 2);
        if (q.fly) { const k = 1 - q.fly / .5, tx = r.W - 30, ty = 52; sx = E.lerp(sx, tx, k); sy = E.lerp(sy, ty, k) - Math.sin(k * Math.PI) * 30; }
        px.disc(g, sx - 2.5, sy - 1, 3.2, '#ff7aa8'); px.disc(g, sx + 2.5, sy - 1, 3.2, '#ff7aa8'); px.poly(g, [[sx - 5.6, sy], [sx + 5.6, sy], [sx, sy + 6]], '#ff7aa8');
        px.dot(g, sx - 3, sy - 2, '#ffffff');
      }, { bias: .05, emissive: true });
    }
  }
}
DQ.Town = Town;
})();
