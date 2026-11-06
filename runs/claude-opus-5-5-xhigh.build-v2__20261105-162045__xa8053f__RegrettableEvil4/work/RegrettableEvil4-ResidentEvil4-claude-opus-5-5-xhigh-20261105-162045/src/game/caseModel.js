// The Case: a pure grid model, no engine. Items have a footprint and may be rotated 90 degrees.
import { ITEMS, recipeFor } from '../data/items.js';

export const CASE_SIZES = [[10, 6], [12, 7], [14, 8]];
let nextUid = 1;

export function makeItem(id, qty = 1, extra = {}) {
  return { uid: nextUid++, id, qty, x: -1, y: -1, rot: false, ...extra };
}
export function footprint(it) {
  const d = ITEMS[it.id];
  return it.rot ? [d.h, d.w] : [d.w, d.h];
}

export class CaseGrid {
  constructor(w = 10, h = 6) { this.w = w; this.h = h; this.items = []; }

  toJSON() { return { w: this.w, h: this.h, items: this.items.map((i) => ({ ...i })) }; }
  static from(data) {
    const c = new CaseGrid(data.w, data.h);
    c.items = data.items.map((i) => ({ ...i, uid: nextUid++ }));
    return c;
  }

  at(x, y) {
    return this.items.find((it) => {
      const [w, h] = footprint(it);
      return x >= it.x && y >= it.y && x < it.x + w && y < it.y + h;
    }) ?? null;
  }

  fits(it, x, y, ignore = null) {
    const [w, h] = footprint(it);
    if (x < 0 || y < 0 || x + w > this.w || y + h > this.h) return false;
    for (const o of this.items) {
      if (o === it || o === ignore) continue;
      const [ow, oh] = footprint(o);
      if (x < o.x + ow && o.x < x + w && y < o.y + oh && o.y < y + h) return false;
    }
    return true;
  }

  place(it, x, y) {
    if (!this.fits(it, x, y)) return false;
    it.x = x; it.y = y;
    if (!this.items.includes(it)) this.items.push(it);
    return true;
  }

  remove(it) {
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
    return i >= 0;
  }

  /** The first free spot, with or without rotating. */
  findSpot(it) {
    for (const rot of [it.rot, !it.rot]) {
      const saved = it.rot;
      it.rot = rot;
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) if (this.fits(it, x, y)) return { x, y, rot };
      }
      it.rot = saved;
    }
    return null;
  }

  /** Put it anywhere. False: no room (the caller opens the Case in arrange mode). */
  add(it) {
    const spot = this.findSpot(it);
    if (!spot) return false;
    it.rot = spot.rot;
    return this.place(it, spot.x, spot.y);
  }

  /** ARRANGE: first-fit decreasing, biggest footprint first, weapons before all else. False if it can't all fit. */
  arrange() {
    const order = [...this.items].sort((a, b) => {
      const [aw, ah] = footprint(a); const [bw, bh] = footprint(b);
      return (bw * bh) - (aw * ah) || (Math.max(bw, bh) - Math.max(aw, ah)) || a.id.localeCompare(b.id);
    });
    const saved = this.items.map((i) => [i, i.x, i.y, i.rot]);
    this.items = [];
    for (const it of order) {
      it.rot = false;
      if (!this.add(it)) {
        this.items = saved.map(([i, x, y, r]) => { i.x = x; i.y = y; i.rot = r; return i; });
        return false;
      }
    }
    return true;
  }

  /** Grow in place; everything stays where it is. */
  resize(w, h) { this.w = w; this.h = h; }

  count(id) { return this.items.filter((i) => i.id === id).reduce((n, i) => n + i.qty, 0); }
  find(id) { return this.items.find((i) => i.id === id) ?? null; }
  all(id) { return this.items.filter((i) => i.id === id); }

  /** Add ammo or stackables: fill stacks first. Returns what didn't fit. */
  addStack(id, qty) {
    const d = ITEMS[id];
    let left = qty;
    if (d.max) {
      for (const it of this.all(id)) {
        const room = d.max - it.qty;
        const n = Math.min(room, left);
        it.qty += n; left -= n;
        if (!left) return 0;
      }
    }
    while (left > 0) {
      const n = d.max ? Math.min(d.max, left) : 1;
      const it = makeItem(id, n);
      if (!this.add(it)) return left;
      left -= n;
    }
    return 0;
  }

  /** Take ammo out across stacks. Returns how much was taken. */
  takeStack(id, qty) {
    let got = 0;
    for (const it of this.all(id)) {
      const n = Math.min(it.qty, qty - got);
      it.qty -= n; got += n;
      if (it.qty <= 0) this.remove(it);
      if (got >= qty) break;
    }
    return got;
  }

  /** Combine two herb items into a stationary result at a's place. Null: no recipe. */
  combine(a, b) {
    const out = recipeFor(a.id, b.id);
    if (!out) return null;
    const res = makeItem(out, 1, { x: a.x, y: a.y, rot: a.rot });
    this.remove(a); this.remove(b);
    this.items.push(res);
    return res;
  }
}
