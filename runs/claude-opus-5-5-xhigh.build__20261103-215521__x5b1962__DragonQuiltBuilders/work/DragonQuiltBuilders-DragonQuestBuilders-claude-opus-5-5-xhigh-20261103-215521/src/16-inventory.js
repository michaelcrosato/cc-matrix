// Inventory: the Bag (40 slots, stacks of 99; key items apart, unlimited), the hotbar (8 references to bag items, DQB
// style), chests (20 slots) and the Town Chest.
(() => {
const DQ = globalThis.DQ;
class Store {
  constructor(n = 20) { this.n = n; this.slots = new Array(n).fill(null); }
  count(id) { let c = 0; for (const s of this.slots) if (s && s.id === id) c += s.n; return c; }
  /** add n of id; returns how many did NOT fit */
  add(id, n = 1) {
    const it = DQ.ITEMS[id]; if (!it || n <= 0) return n; const st = it.stack || 99;
    for (const s of this.slots) if (s && s.id === id && s.n < st) { const k = Math.min(n, st - s.n); s.n += k; n -= k; if (!n) return 0; }
    for (let i = 0; i < this.n && n > 0; i++) if (!this.slots[i]) { const k = Math.min(n, st); this.slots[i] = { id, n: k }; n -= k; }
    return n;
  }
  remove(id, n = 1) {
    if (this.count(id) < n) return false;
    for (let i = this.n - 1; i >= 0 && n > 0; i--) { const s = this.slots[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.slots[i] = null; } }
    return true;
  }
  free() { return this.slots.filter(s => !s).length; }
  room(id) { const it = DQ.ITEMS[id], st = (it && it.stack) || 99; let r = 0; for (const s of this.slots) r += !s ? st : s.id === id ? st - s.n : 0; return r; }
  ids() { const o = {}; for (const s of this.slots) if (s) o[s.id] = (o[s.id] || 0) + s.n; return o; }
  serialize() { return this.slots.map(s => s ? [s.id, s.n] : 0); }
  load(a) { this.slots = new Array(this.n).fill(null); (a || []).forEach((s, i) => { if (s && i < this.n && DQ.ITEMS[s[0]]) this.slots[i] = { id: s[0], n: s[1] }; }); }
  compact() { const ids = this.ids(); this.slots.fill(null); for (const id in ids) this.add(id, ids[id]); }
}
DQ.Store = Store;

class Bag extends Store {
  constructor() { super(40); this.keys = {}; this.hotbar = new Array(8).fill(null); this.infinite = false; this.onGain = null; }
  count(id) { if (this.infinite && DQ.ITEMS[id] && DQ.ITEMS[id].kind !== 'key') return 99; const it = DQ.ITEMS[id]; if (it && it.kind === 'key') return this.keys[id] || 0; return super.count(id); }
  realCount(id) { const it = DQ.ITEMS[id]; if (it && it.kind === 'key') return this.keys[id] || 0; return super.count(id); }
  add(id, n = 1) {
    const it = DQ.ITEMS[id]; if (!it) return n;
    if (it.kind === 'key') { this.keys[id] = (this.keys[id] || 0) + n; return 0; }
    const left = super.add(id, n);
    if (left < n) this.autoHot(id);
    return left;
  }
  remove(id, n = 1) {
    const it = DQ.ITEMS[id]; if (!it) return false;
    if (this.infinite && it.kind !== 'key') return true;
    if (it.kind === 'key') { if ((this.keys[id] || 0) < n) return false; this.keys[id] -= n; if (!this.keys[id]) delete this.keys[id]; return true; }
    return super.remove(id, n);
  }
  has(req) { for (const id in req) if (this.count(id) < req[id]) return false; return true; }
  /** a new placeable or usable item takes the first empty hotbar slot */
  autoHot(id) {
    const it = DQ.ITEMS[id]; if (!it || !['block', 'obj', 'food', 'use'].includes(it.kind)) return;
    if (this.hotbar.includes(id)) return; const i = this.hotbar.indexOf(null); if (i >= 0) this.hotbar[i] = id;
  }
  setHot(i, id) { const j = this.hotbar.indexOf(id); if (j >= 0) this.hotbar[j] = null; this.hotbar[i] = id; }
  serialize() { return { slots: super.serialize(), keys: Object.assign({}, this.keys), hotbar: this.hotbar.slice() }; }
  load(d) { if (!d) return; super.load(d.slots); this.keys = Object.assign({}, d.keys || {}); this.hotbar = (d.hotbar || []).slice(0, 8); while (this.hotbar.length < 8) this.hotbar.push(null); }
  /** materials only (what a KO can lose, what "store all" moves) */
  materials() { const o = {}; for (const s of this.slots) if (s) { const it = DQ.ITEMS[s.id]; if (it && ['mat', 'block', 'food'].includes(it.kind)) o[s.id] = (o[s.id] || 0) + s.n; } return o; }
}
DQ.Bag = Bag;
/** move every material from a bag into a store (a chest); returns the count moved */
DQ.storeAll = (bag, store) => { let k = 0; const m = bag.materials(); for (const id in m) { const left = store.add(id, m[id]); const moved = m[id] - left; if (moved) { bag.remove(id, moved); k += moved; } } return k; };
})();
