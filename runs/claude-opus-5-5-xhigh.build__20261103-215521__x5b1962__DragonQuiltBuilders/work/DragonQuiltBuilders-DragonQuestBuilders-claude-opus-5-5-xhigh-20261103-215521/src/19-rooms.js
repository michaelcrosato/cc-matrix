// Rooms: an enclosed floor of 2 to 64 cells, walls at least 2 blocks high all round, a door set in a straight wall, a light
// inside. Typed by the furniture on its cells (DQ.ROOMS, in priority order). Detected 0.3 s after an edit near town.
(() => {
const DQ = globalThis.DQ, T = 16;
const SOLID = DQ.SOLID, OPAQUE = DQ.OPAQUE;
const WALL = 1, DOOR = 2, FLOOR = 3, OPEN = 0;
const FELT = new Set(['feltRed', 'feltBlue', 'feltYellow', 'gildedFelt'].map(k => DQ.blockId(k)));
class Rooms {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.awards = {}; this.slots = new Set(); this.timer = -1; this.extra = []; this.hintT = 0; this.outsideWarned = false; }
  /** an edit at (x, y): detect again in .3 s */
  dirty(x, y) { this.timer = .3; const t = this.ctx.town; if (t && t.planted && !t.inside(x, y, 3)) this.extra.push([x, y]); }
  update(dt) { this.hintT = Math.max(0, this.hintT - dt); if (this.timer >= 0) { this.timer -= dt; if (this.timer < 0) this.detect(); } }
  regions() {
    const t = this.ctx.town, w = this.ctx.world, out = [];
    if (t && t.planted) { const r = t.radius + 2; out.push([t.x - r, t.y - r, t.x + r, t.y + r, true]); }
    for (const [x, y] of this.extra.splice(0)) { if (!out.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])) out.push([x - 10, y - 10, x + 10, y + 10, false]); }
    return out.map(b => [Math.max(1, b[0]), Math.max(1, b[1]), Math.min(w.W - 2, b[2]), Math.min(w.D - 2, b[3]), b[4]]);
  }
  /** classify every cell of a region at level L */
  grid(b, L) {
    const w = this.ctx.world, [x0, y0, x1, y1] = b, gw = x1 - x0 + 1, gd = y1 - y0 + 1, g = new Uint8Array(gw * gd);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const a = w.get(x, y, L), c = w.get(x, y, L + 1), o = w.objIdx.get(w.idx(x, y, L));
      let k = OPEN;
      if (OPAQUE[a] && OPAQUE[c]) k = WALL;
      else if (o && o.def.door && o.z === L) k = DOOR;
      else if (!SOLID[a] && !SOLID[c] && SOLID[w.get(x, y, L - 1)] && !(o && o.def.door)) k = FLOOR;
      g[(y - y0) * gw + (x - x0)] = k;
    }
    // doors must sit in a straight wall
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = (y - y0) * gw + (x - x0); if (g[i] !== DOOR) continue;
      const o = w.objIdx.get(w.idx(x, y, L)), alongX = o.facing % 2 === 1, at = (xx, yy) => (xx < x0 || yy < y0 || xx > x1 || yy > y1) ? OPEN : g[(yy - y0) * gw + (xx - x0)];
      const ok = alongX ? ((at(x - 1, y) === WALL || at(x - 1, y) === DOOR) && (at(x + 1, y) === WALL || at(x + 1, y) === DOOR)) : ((at(x, y - 1) === WALL || at(x, y - 1) === DOOR) && (at(x, y + 1) === WALL || at(x, y + 1) === DOOR));
      if (!ok) g[i] = OPEN;
    }
    return { g, gw, gd, x0, y0 };
  }
  detect() {
    const w = this.ctx.world, found = [];
    for (const b of this.regions()) {
      // candidate floor levels: where a cell has ground with two free levels above
      const Ls = new Set();
      for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { const t = w.topZ(x, y); for (let L = Math.max(1, t - 6); L <= Math.min(w.H - 3, t); L++) if (SOLID[w.get(x, y, L - 1)] && !SOLID[w.get(x, y, L)] && !SOLID[w.get(x, y, L + 1)]) Ls.add(L); }
      for (const L of Ls) {
        const G = this.grid(b, L), { g, gw, gd, x0, y0 } = G, seen = new Uint8Array(gw * gd);
        for (let i = 0; i < g.length; i++) {
          if (g[i] !== FLOOR || seen[i]) continue;
          const cells = [], st = [i]; seen[i] = 1; let leak = false, doors = 0;
          while (st.length) {
            const j = st.pop(); cells.push(j); if (cells.length > 200) { leak = true; }
            const x = j % gw, y = (j - x) / gw;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gd) { leak = true; continue; }
              const k = ny * gw + nx, c = g[k];
              if (c === FLOOR) { if (!seen[k]) { seen[k] = 1; st.push(k); } } else if (c === DOOR) doors++; else if (c !== WALL) leak = true;
            }
          }
          if (leak || cells.length < DQ.ROOM_RULE.min || cells.length > DQ.ROOM_RULE.max || !doors) continue;
          const room = this.describe(cells.map(j => [x0 + j % gw, y0 + Math.floor(j / gw)]), L, b[4]);
          if (room.light < 1) continue;
          found.push(room);
        }
      }
    }
    this.commit(found);
  }
  describe(cells, L, inTownRegion) {
    const w = this.ctx.world, tags = {}, set = new Set(), objs = [];
    let sx = 0, sy = 0, felt = false, glow = 0;
    for (const [x, y] of cells) {
      set.add(y * w.W + x); sx += x; sy += y;
      const o = w.objIdx.get(w.idx(x, y, L)); if (o && !o.def.door) { objs.push(o); for (const t of o.def.tags) tags[t] = (tags[t] || 0) + 1; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const z of [L, L + 1]) { const id = w.get(x + dx, y + dy, z); if (FELT.has(id)) felt = true; if (DQ.BLOCKS[id] && DQ.BLOCKS[id].light) glow++; }
    }
    tags.light = (tags.light || 0) + (glow ? 1 : 0);
    const cx = sx / cells.length, cy = sy / cells.length, t = this.ctx.town, inTown = !!(t && t.planted && cells.every(([x, y]) => t.inside(x, y)));
    const room = { cells: set, list: cells, L, center: [cx, cy], size: cells.length, tags, light: tags.light || 0, felt, objs, inTown, type: 'snug' };
    for (const def of DQ.ROOMS) {
      if (def.pattern) { if (t && t.patternRoom && t.patternRoom(def.pattern, room) && room.size >= def.min && room.size <= def.max) { room.type = def.id; break; } continue; }
      let ok = true; for (const k in def.need) if ((tags[k] || 0) < def.need[k]) { ok = false; break; }
      if (ok && Object.keys(def.need).length) { room.type = def.id; break; }
    }
    room.slot = room.type + ':' + Math.round(cx / 2) + ',' + Math.round(cy / 2) + ',' + L;
    return room;
  }
  commit(found) {
    const prev = this.list, ev = this.ctx.events;
    if (this._loading) { this._loading = false; for (const r of found) r.id = 'room' + (this._n = (this._n || 0) + 1); this.list = found; return; }
    const overlap = (a, b) => { let n = 0; for (const c of a.cells) if (b.cells.has(c)) n++; return n / Math.max(a.size, b.size); };
    for (const r of found) {
      const old = prev.find(p => p.L === r.L && overlap(p, r) >= .7);
      r.id = old ? old.id : 'room' + (this._n = (this._n || 0) + 1);
      if (!old || old.type !== r.type) {
        if (old && old.type !== r.type) ev.emit('roomLost', { room: old, changed: true });
        let cheer = 0;
        if (r.inTown && !this.slots.has(r.slot)) {
          const def = DQ.ROOM[r.type], n = this.awards[r.type] || 0;
          if (n < def.maxAwards) { cheer = def.cheer; this.awards[r.type] = n + 1; }
          this.slots.add(r.slot);
        }
        if (r.inTown) this.ctx.stats.rooms++;
        ev.emit('roomFormed', { room: r, cheer, isNew: !old });
        if (!r.inTown && !this.outsideWarned && this.ctx.hud) { this.outsideWarned = true; this.ctx.hud.toast('Rooms only count inside the town border!', null, 'border'); }
      }
    }
    for (const p of prev) if (!found.some(r => r.id === p.id)) ev.emit('roomLost', { room: p });
    this.list = found;
    // a leak hint: the builder just built near an almost-room
    const b = this.ctx.builder, t = this.ctx.town, now = DQ.game ? DQ.game.real : 0;
    if (b && b.local && t && t.planted && t.inside(b.cx, b.cy) && this.ctx.mode === 'story' && now - (this.lastHint || -99) > 8 && !this.roomAt(b.cx, b.cy, b.L)) {
      const h = this.diagnose(b.cx, b.cy, b.L); if (h && this.ctx.hud) { this.lastHint = now; this.ctx.hud.toast(h, null, 'leak'); }
    }
  }
  roomAt(x, y, L) { const W = this.ctx.world.W; return this.list.find(r => (L === undefined || r.L === L || r.L === L - 1) && r.cells.has(y * W + x)) || null; }
  count(type, inTown = true) { return this.list.filter(r => r.type === type && (!inTown || r.inTown)).length; }
  has(type) { return this.list.some(r => r.type === type && r.inTown); }
  /** why the space at (x, y, L) is not a room yet (a hint for the player), or null */
  diagnose(x, y, L) {
    const w = this.ctx.world, b = [x - 12, y - 12, x + 12, y + 12], G = this.grid(b, L), { g, gw, gd, x0, y0 } = G, s = (y - y0) * gw + (x - x0);
    if (g[s] !== FLOOR) return null;
    const seen = new Uint8Array(gw * gd), st = [s]; seen[s] = 1; let size = 0, doors = 0, low = 0, gap = 0, light = 0;
    while (st.length && size < 120) {
      const j = st.pop(); size++; const cx = x0 + j % gw, cy = y0 + Math.floor(j / gw), o = w.objIdx.get(w.idx(cx, cy, L)); if (o && o.def.tags.includes('light')) light++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = j % gw + dx, ny = Math.floor(j / gw) + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gd) { gap += 9; continue; }
        const k = ny * gw + nx, c = g[k];
        if (c === FLOOR) { if (!seen[k]) { seen[k] = 1; st.push(k); } } else if (c === DOOR) doors++;
        else if (c === OPEN) { const X = x0 + nx, Y = y0 + ny; if (SOLID[w.get(X, Y, L)] && !SOLID[w.get(X, Y, L + 1)]) low++; else gap++; }
      }
    }
    if (size >= 120) return null;
    if (gap > 2) return null;
    if (low || gap) return low ? 'Walls must be 2 blocks high!' : 'There\'s a gap in the walls!';
    if (size > DQ.ROOM_RULE.max) return 'Too big! A room is at most 64 floor cells.';
    if (!doors) return 'Missing: a door!';
    if (!light) return 'Missing: a light!';
    return null;
  }
  serialize() { return { awards: this.awards, slots: [...this.slots] }; }
  load(d) { this.awards = Object.assign({}, (d && d.awards) || {}); this.slots = new Set((d && d.slots) || []); this.list = []; this.timer = 0; this._loading = true; }
}
DQ.Rooms = Rooms;
})();
