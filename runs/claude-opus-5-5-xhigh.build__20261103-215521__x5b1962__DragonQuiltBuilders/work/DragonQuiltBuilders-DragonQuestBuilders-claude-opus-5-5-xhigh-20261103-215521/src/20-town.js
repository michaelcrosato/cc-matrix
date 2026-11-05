// The town: the Banner of Mending, its stitched border, Cheer and the town level, and Patterns (blueprints of ghost blocks
// the player and helper residents fill in).
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const SOLID = DQ.SOLID;
class Town {
  constructor(ctx) {
    this.ctx = ctx; this.planted = false; this.x = DQ.WORLD.town.x; this.y = DQ.WORLD.town.y; this.L = 9; this.banner = null;
    this.level = 1; this.cheer = 0; this.rDisp = 0; this.patterns = []; this.placing = null; this.arrivals = []; this.sweep = 0; this.name = 'Thimbleton';
  }
  get radius() { return DQ.LEVELS[this.level].r; }
  get rShown() { return Math.round(this.rDisp); }
  inside(x, y, pad = 0) { if (!this.planted) return false; const r = this.rShown + pad; return Math.abs(x - this.x) <= r && Math.abs(y - this.y) <= r; }
  respawnPoint() { if (!this.planted) return null; const w = this.ctx.world, y = this.y + 2; return [this.x * T + 8, y * T + 8, w.topZ(this.x, y) * T]; }
  /** plant the Banner at (x, y, L) */
  plant(x, y, L, o = {}) {
    this.x = x; this.y = y; this.L = L; this.planted = true; this.rDisp = o.instant ? this.radius : 0;
    this.banner = this.ctx.objects.add('banner', x, y, L, 1, { silent: true }); this.banner.data.rise = o.instant ? 1 : 0;
    this.ctx.flags.bannerPlanted = true;
    this.ctx.events.emit('bannerPlanted', { x, y, L });
    if (this.ctx.crafting) this.ctx.crafting.trigger('flag', 'bannerPlanted');
  }
  /** add Cheer (rooms, quests, bubbles); levels up across thresholds */
  addCheer(n, src = '') {
    if (!this.planted || !n) return 0;
    const k = Math.max(1, Math.round(n * DQ.tune('cheerMul')));
    this.cheer += k; this.ctx.stats.cheer += k;
    this.ctx.events.emit('cheer', { n: k, src, total: this.cheer });
    while (this.level < DQ.MAX_LEVEL && this.cheer >= DQ.LEVELS[this.level + 1].cheer && !(this.level + 1 === 5 && !this.ctx.flags.bossDone)) this.levelUp();
    return k;
  }
  levelUp(o = {}) {
    if (this.level >= DQ.MAX_LEVEL) return;
    this.level++; const L = DQ.LEVELS[this.level];
    this.ctx.events.emit('townLevel', { level: this.level, quiet: !!o.quiet });
    if (this.ctx.crafting) this.ctx.crafting.trigger('level', this.level);
    if (L.arrives && !(this.ctx.npcs && this.ctx.npcs.get(L.arrives))) this.arrivals.push(L.arrives);
  }
  setLevel(lv) { while (this.level < lv) this.levelUp({ quiet: true }); this.cheer = Math.max(this.cheer, DQ.LEVELS[lv].cheer); this.rDisp = this.radius; }
  nextCheer() { return this.level < DQ.MAX_LEVEL ? DQ.LEVELS[this.level + 1].cheer : null; }
  update(dt) {
    if (!this.planted) return;
    const tr = this.radius; if (this.rDisp < tr) { this.rDisp = Math.min(tr, this.rDisp + dt * 6); this.sweep = .6; } else this.sweep = Math.max(0, this.sweep - dt);
    if (this.banner && this.banner.data.rise < 1) this.banner.data.rise = Math.min(1, this.banner.data.rise + dt * .8);
    for (const p of this.patterns) if (!p.done && p.dirty) this.checkPattern(p);
  }
  // ---------------------------------------------------------------- Patterns
  /** the cells of a Pattern laid out at (x0, y0, L) turned rot quarter turns: [{ x, y, z, block | obj, facing }] */
  layout(def, x0, y0, L, rot = 0) {
    const [w, d] = def.size, out = [], R = (x, y) => rot === 0 ? [x, y] : rot === 1 ? [d - 1 - y, x] : rot === 2 ? [w - 1 - x, d - 1 - y] : [y, w - 1 - x];
    def.layers.forEach((rows, k) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const v = def.legend[ch]; if (v === undefined) return;
      const [rx, ry] = R(x, y), cell = { x: x0 + rx, y: y0 + ry, z: L + k };
      if (typeof v === 'string') cell.block = DQ.blockId(v); else { cell.obj = v.obj; cell.facing = (v.facing + rot) & 3; }
      out.push(cell);
    })));
    return out;
  }
  footprint(def, rot) { const [w, d] = def.size; return rot % 2 ? [d, w] : [w, d]; }
  /** can a Pattern go here? (inside the border, ground flat within one level, no objects in the way) */
  canPlacePattern(def, x0, y0, L, rot) {
    const w = this.ctx.world, [fw, fd] = this.footprint(def, rot);
    for (let y = y0; y < y0 + fd; y++) for (let x = x0; x < x0 + fw; x++) {
      if (!this.inside(x, y)) return 'It must fit inside the town border!';
      const t = w.topZ(x, y); if (Math.abs(t - L) > 1) return 'The ground must be flat!';
      for (let z = L; z < L + def.layers.length; z++) { const o = w.objIdx.get(w.idx(x, y, z)); if (o) return 'Something\'s in the way!'; }
    }
    return null;
  }
  placePattern(def, x0, y0, L, rot = 0, o = {}) {
    const cells = this.layout(def, x0, y0, L, rot), w = this.ctx.world;
    const p = { id: def.id, def, x0, y0, L, rot, cells, done: false, dirty: true, progress: 0, total: cells.length };
    for (const c of cells) c.i = w.idx(c.x, c.y, c.z);
    // the ground under it: fill holes so blocks stand on something
    for (const c of cells) if (c.z === L && !SOLID[w.get(c.x, c.y, L - 1)]) w.set(c.x, c.y, L - 1, DQ.blockId('cobble'), { silent: true });
    this.patterns.push(p); this.checkPattern(p);
    if (!o.silent) this.ctx.events.emit('patternPlaced', { id: def.id, pattern: p });
    this.syncGhosts();
    return p;
  }
  cellDone(c) {
    const w = this.ctx.world;
    if (c.block) return w.vox[c.i] === c.block;
    const ob = w.objIdx.get(c.i); return !!(ob && ob.id === c.obj && ob.z === c.z);
  }
  checkPattern(p) {
    p.dirty = false; let n = 0; for (const c of p.cells) { const d = this.cellDone(c); if (d && !c.done && p.progress) this.ctx.events.emit('patternCell', { pattern: p, cell: c }); c.done = d; if (d) n++; }
    p.progress = n;
    if (n === p.total && !p.done) { p.done = true; this.ctx.events.emit('patternDone', { id: p.id, pattern: p }); }
    this.syncGhosts();
  }
  markDirty(x, y) { for (const p of this.patterns) if (!p.done) { const [fw, fd] = this.footprint(p.def, p.rot); if (x >= p.x0 - 1 && y >= p.y0 - 1 && x <= p.x0 + fw && y <= p.y0 + fd) p.dirty = true; } }
  syncGhosts() {
    const R = this.ctx.render; if (!R) return;
    const m = new Map(); for (const p of this.patterns) if (!p.done) for (const c of p.cells) if (!c.done) m.set(c.i, { block: c.block, obj: c.obj, done: false });
    if (this.placing && this.placing.cells) for (const c of this.placing.cells) m.set(this.ctx.world.idx(c.x, c.y, c.z), { block: c.block, obj: c.obj, preview: true, bad: !!this.placing.why });
    R.ghosts = m;
  }
  /** the materials a Pattern still needs: [{ id, need, have }] (have: the bag plus the Town Chest) */
  needs(p, bag) {
    const need = {}; for (const c of p.cells) if (!c.done) { const id = c.block ? DQ.BLOCKS[c.block].key : c.obj; need[id] = (need[id] || 0) + 1; }
    const tc = this.townChest();
    return Object.keys(need).map(id => ({ id, need: need[id], have: (bag ? bag.count(id) : 0) + (tc ? tc.data.store.count(id) : 0) }));
  }
  active() { return this.patterns.find(p => !p.done) || null; }
  /** is this room the interior of a completed Pattern of that id? */
  patternRoom(id, room) {
    for (const p of this.patterns) {
      if (p.id !== id || !p.done || room.L !== p.L) continue;
      const [fw, fd] = this.footprint(p.def, p.rot); let ok = true;
      for (const [x, y] of room.list) if (x <= p.x0 || y <= p.y0 || x >= p.x0 + fw - 1 || y >= p.y0 + fd - 1) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  }
  /** a helper's next job: an unbuilt cell, the material for it in the Town Chest */
  helperTask(npc) {
    const p = this.active(), tc = this.townChest(); if (!p || !tc) return null;
    let best = null, bd = 1e9;
    const sorted = p.cells.filter(c => !c.done && !c.claimed);
    const minZ = Math.min(...sorted.map(c => c.z));
    for (const c of sorted) {
      if (c.z > minZ + 0) continue;
      const id = c.block ? DQ.BLOCKS[c.block].key : c.obj; if (tc.data.store.count(id) <= 0) continue;
      const d = DQ.d2(c.x, c.y, npc.cx, npc.cy); if (d < bd) { bd = d; best = { cell: c, item: id, pattern: p }; }
    }
    if (!best && sorted.length) { const c = sorted.find(c => c.z === minZ); if (c) return { need: c.block ? DQ.BLOCKS[c.block].key : c.obj }; }
    return best;
  }
  townChest() { const ob = this.ctx.objects ? this.ctx.objects.list.find(o => o.def.chest && o.data.townChest && !o.gone) : null; return ob || null; }
  setTownChest(ob) { for (const o of this.ctx.objects.list) if (o.data && o.data.townChest) o.data.townChest = false; ob.data.townChest = true; this.ctx.flags.townChest = true; this.ctx.events.emit('townChest', { obj: ob }); }
  // ---------------------------------------------------------------- the border's running stitch
  draw(r) {
    if (!this.planted) return;
    const w = this.ctx.world, rr = this.rDisp, R = Math.round(rr), x0 = this.x - R, y0 = this.y - R, x1 = this.x + R, y1 = this.y + R, t = DQ.game.real, night = this.ctx.clock && this.ctx.clock.isNight;
    const vis = this.ctx.render ? this.ctx.render.visibleCols(r) : null;
    const seg = (cx, cy, ax, ay, bx, by) => {
      if (vis && (cx < vis[0] || cx > vis[2] || cy < vis[1] || cy > vis[3])) return;
      const lv = w.topZ(cx, cy); if (!lv) return;
      const z = lv * T + .5;
      r.queue(cx * T + 8, cy * T + 8, z, g => {
        const a = r.w(ax, ay, z), b = r.w(bx, by, z), n = 8;
        for (let i = 0; i < n; i++) { if (((i + Math.floor(t * 6)) & 3) >= 2) continue; const u0 = i / n, u1 = (i + 1) / n; px.line(g, Math.round(a[0] + (b[0] - a[0]) * u0), Math.round(a[1] + (b[1] - a[1]) * u0), Math.round(a[0] + (b[0] - a[0]) * u1), Math.round(a[1] + (b[1] - a[1]) * u1), night ? '#ffe9a0' : '#f8f0d8'); }
      }, { bias: .0005, emissive: night });
    };
    for (let x = x0; x <= x1; x++) { seg(x, y0, x * T, y0 * T + 1, x * T + T, y0 * T + 1); seg(x, y1, x * T, y1 * T + T - 1, x * T + T, y1 * T + T - 1); }
    for (let y = y0; y <= y1; y++) { seg(x0, y, x0 * T + 1, y * T, x0 * T + 1, y * T + T); seg(x1, y, x1 * T + T - 1, y * T, x1 * T + T - 1, y * T + T); }
  }
  serialize() { return { planted: this.planted, x: this.x, y: this.y, L: this.L, level: this.level, cheer: this.cheer, patterns: this.patterns.map(p => [p.id, p.x0, p.y0, p.L, p.rot]), arrivals: this.arrivals.slice() }; }
  load(d) {
    if (!d) return; this.level = d.level || 1; this.cheer = d.cheer || 0; this.arrivals = (d.arrivals || []).slice();
    if (d.planted) { this.planted = true; this.x = d.x; this.y = d.y; this.L = d.L; this.rDisp = this.radius; this.banner = this.ctx.objects.find('banner'); if (this.banner) this.banner.data.rise = 1; }
    this.patterns = []; for (const [id, x0, y0, L, rot] of d.patterns || []) this.placePattern(DQ.WORLD.patterns[id], x0, y0, L, rot, { silent: true });
  }
}
DQ.Town = Town;
})();
