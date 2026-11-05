// The bag (40 slots, stacks of 99, key items apart), the hotbar, chests, crafting stations and Notions.
(() => {
const E = My3D2dge, DQ = globalThis.DQ;
const STACK = 99;
class Bag {
  constructor(slots = 40) { this.size = slots; this.slots = []; this.keys = {}; this.infinite = false; }
  count(id) { if (this.infinite && DQ.ITEMS[id] && !DQ.ITEMS[id].keyItem) return 999; const it = DQ.ITEMS[id]; if (it && it.keyItem) return this.keys[id] || 0; let n = 0; for (const s of this.slots) if (s.id === id) n += s.n; return n; }
  real(id) { const it = DQ.ITEMS[id]; if (it && it.keyItem) return this.keys[id] || 0; let n = 0; for (const s of this.slots) if (s.id === id) n += s.n; return n; }
  // add n of an item; returns how many did not fit
  add(id, n = 1) {
    const it = DQ.ITEMS[id]; if (!it || n <= 0) return 0;
    if (it.keyItem) { this.keys[id] = (this.keys[id] || 0) + n; return 0; }
    for (const s of this.slots) { if (s.id !== id || s.n >= STACK) continue; const k = Math.min(n, STACK - s.n); s.n += k; n -= k; if (!n) return 0; }
    while (n > 0 && this.slots.length < this.size) { const k = Math.min(n, STACK); this.slots.push({ id, n: k }); n -= k; }
    return n;
  }
  fits(id, n = 1) { const it = DQ.ITEMS[id]; if (!it) return false; if (it.keyItem) return true; let room = (this.size - this.slots.length) * STACK; for (const s of this.slots) if (s.id === id) room += STACK - s.n; return room >= n; }
  remove(id, n = 1) {
    if (this.infinite && DQ.ITEMS[id] && !DQ.ITEMS[id].keyItem) return true;
    const it = DQ.ITEMS[id]; if (!it) return false;
    if (it.keyItem) { if ((this.keys[id] || 0) < n) return false; this.keys[id] -= n; if (!this.keys[id]) delete this.keys[id]; return true; }
    if (this.count(id) < n) return false;
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) { const s = this.slots[i]; if (s.id !== id) continue; const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.slots.splice(i, 1); }
    return true;
  }
  has(map) { for (const k in map) if (this.count(k) < map[k]) return false; return true; }
  ids() { const s = new Set(this.slots.map(q => q.id)); for (const k in this.keys) s.add(k); return [...s]; }
  byCat(cat) { const out = []; const seen = new Map(); for (const s of this.slots) { const it = DQ.ITEMS[s.id]; if (it.cat !== cat) continue; seen.set(s.id, (seen.get(s.id) || 0) + s.n); } for (const [id, n] of seen) out.push({ id, n }); if (cat === 'Key') for (const k in this.keys) out.push({ id: k, n: this.keys[k] }); return out; }
  serialize() { return { slots: this.slots.map(s => [s.id, s.n]), keys: Object.assign({}, this.keys) }; }
  load(d) { this.slots = (d.slots || []).filter(s => DQ.ITEMS[s[0]]).map(s => ({ id: s[0], n: s[1] })); this.keys = Object.assign({}, d.keys || {}); }
  clear() { this.slots = []; this.keys = {}; }
}
DQ.Bag = Bag;

// chests hold 20 stacks, kept on the object as { id: n }
DQ.Chest = {
  SIZE: 20,
  count(ch, id) { return ch.items[id] || 0; },
  stacks(ch) { let n = 0; for (const k in ch.items) n += Math.ceil(ch.items[k] / STACK); return n; },
  add(ch, id, n) { const it = DQ.ITEMS[id]; if (!it || it.keyItem) return n; const free = (DQ.Chest.SIZE - DQ.Chest.stacks(ch)) * STACK + (ch.items[id] ? (STACK - ch.items[id] % STACK) % STACK : 0); const k = Math.min(n, free); if (k > 0) ch.items[id] = (ch.items[id] || 0) + k; return n - k; },
  take(ch, id, n) { const k = Math.min(n, ch.items[id] || 0); if (k) { ch.items[id] -= k; if (!ch.items[id]) delete ch.items[id]; } return k; },
  // store every material and building item from the bag
  storeAll(ch, bag) { let moved = 0; for (const s of bag.slots.slice()) { const it = DQ.ITEMS[s.id]; if (!['material', 'block'].includes(it.kind)) continue; const n = bag.real(s.id), left = DQ.Chest.add(ch, s.id, n); if (n - left > 0) { bag.remove(s.id, n - left); moved += n - left; } } return moved; }
};

// ---- crafting ----
class Crafting {
  constructor(ctx) { this.ctx = ctx; this.known = new Set(); this.crafted = {}; this.queue = []; }
  know(id, silent) {
    if (this.known.has(id)) return false; const r = DQ.recipe(id); if (!r) return false;
    this.known.add(id);
    if (!silent) { this.ctx.events.emit('notion', { recipe: id }); }
    return true;
  }
  knows(id) { return this.known.has(id) || DQ.dev.creative; }
  // inputs for a recipe the bag can pay (the main or the alternative), or null
  inputs(r, bag) { if (bag.has(r.inputs)) return r.inputs; if (r.alt && bag.has(r.alt)) return r.alt; return null; }
  list(station) { return DQ.RECIPES.filter(r => r.station === station && this.knows(r.id)); }
  max(r, bag) { if (bag.infinite) return 99; let best = 0; for (const inp of [r.inputs, r.alt]) { if (!inp) continue; let m = 99; for (const k in inp) m = Math.min(m, Math.floor(bag.count(k) / inp[k])); best = Math.max(best, m); } return best; }
  craft(id, n, bag, o = {}) {
    const r = DQ.recipe(id); if (!r || !this.knows(id)) return 0;
    let made = 0;
    for (let i = 0; i < n; i++) {
      const inp = this.inputs(r, bag); if (!inp) break;
      if (!bag.fits(r.out, r.n) && !bag.infinite) break;
      for (const k in inp) bag.remove(k, inp[k]);
      bag.add(r.out, r.n); made++;
      this.crafted[r.out] = (this.crafted[r.out] || 0) + r.n;
    }
    if (made) { this.ctx.stats.crafted += made; this.ctx.events.emit('crafted', { id: r.out, n: made * r.n, recipe: id, by: o.by }); }
    return made;
  }
  // notion triggers: called by events
  trigger(on, key) {
    for (const r of DQ.RECIPES) {
      const nt = r.notion; if (!nt || this.known.has(r.id) || nt.on !== on) continue;
      if (nt.key !== key) continue;
      if (nt.level && (!this.ctx.town || this.ctx.town.level < nt.level)) continue;
      this.know(r.id);
    }
  }
  // recipes whose notion waits on a level the town just reached (pickup notions gated by level)
  recheck() { for (const r of DQ.RECIPES) { const nt = r.notion; if (!nt || this.known.has(r.id)) continue; if (nt.on === 'level' && this.ctx.town && this.ctx.town.level >= nt.key) this.know(r.id); if (nt.on === 'pickup' && nt.level && this.ctx.town && this.ctx.town.level >= nt.level && this.ctx.builder && this.ctx.builder.bag.real(nt.key) > 0) this.know(r.id); if (nt.on === 'flag' && this.ctx.flags[nt.key]) this.know(r.id); } }
  serialize() { return { known: [...this.known], crafted: Object.assign({}, this.crafted) }; }
  load(d) { this.known = new Set(d.known || []); this.crafted = Object.assign({}, d.crafted || {}); }
}
DQ.Crafting = Crafting;

// ---- drops: items that bounce out, bob, magnetize and get picked up ----
class Drops {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.uid = 1; }
  spawn(item, n, x, y, z, o = {}) {
    if (!DQ.ITEMS[item] || n <= 0) return null;
    const a = DQ.fx() * Math.PI * 2, s = o.burst === false ? 0 : 20 + DQ.fx() * 25;
    const d = { id: o.id || this.uid++, item, n, x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: o.burst === false ? 0 : 110, t: 0, life: 300, owner: o.owner };
    this.list.push(d); return d;
  }
  update(dt) {
    const ctx = this.ctx, w = ctx.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i]; d.t += dt;
      d.vz -= 600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= .94; d.vy *= .94;
      const g = w.groundAt(d.x, d.y, 2, d.z + 4, 6);
      d.z += d.vz * dt; if (d.z <= g) { d.z = g; d.vz = Math.abs(d.vz) > 60 ? -d.vz * .35 : 0; }
      if (d.z < -40) { d.z = g > -1e9 ? g : 0; if (g === -Infinity) { this.list.splice(i, 1); continue; } }
      if (d.t > d.life) { this.list.splice(i, 1); continue; }
      if (d.t < .3 || (ctx.netClient && !ctx.netClient.local)) continue;
      for (const b of ctx.builders) {
        if (b.ko || !b.body) continue;
        const dx = b.body.x - d.x, dy = b.body.y - d.y, dz = b.body.z + 8 - d.z, dist = Math.hypot(dx, dy, dz);
        if (dist < 24) { d.x += dx * dt * 8; d.y += dy * dt * 8; d.z += dz * dt * 8; }
        if (dist < 9) {
          if (!b.bag.fits(d.item, d.n)) { if (!d.full) { d.full = true; if (b.local && ctx.hud) ctx.hud.toast('Your bag is full!', 'warn'); } continue; }
          b.take(d.item, d.n, { drop: d }); this.list.splice(i, 1); break;
        }
      }
    }
  }
  draw(r) {
    const t = r.game.real;
    for (const d of this.list) {
      const bob = Math.sin(t * 4 + d.id) * 1.5;
      r.queue(d.x, d.y, d.z, g => {
        const [sx, sy] = r.w(d.x, d.y, d.z + 5 + bob), ic = DQ.Icons.get(d.item, 10);
        if (ic) g.drawImage(ic, Math.round(sx - ic.width / 2), Math.round(sy - ic.height / 2));
        if (d.n > 1) E.font.text(g, String(d.n), Math.round(sx + 3), Math.round(sy + 1), '#fff', { font: 'tiny', outline: '#000' });
      }, { bias: .01 });
      r.queue(d.x, d.y, d.z, g => { const [sx, sy] = r.w(d.x, d.y, d.z); E.px.rect(g, Math.round(sx) - 3, Math.round(sy), 6, 1, '#1a1426'); }, { bias: -.01 });
    }
  }
}
DQ.Drops = Drops;
})();
