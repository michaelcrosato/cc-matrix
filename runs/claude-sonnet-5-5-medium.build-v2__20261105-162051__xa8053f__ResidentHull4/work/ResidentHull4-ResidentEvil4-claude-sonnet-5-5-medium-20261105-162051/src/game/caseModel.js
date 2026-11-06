// The Case: a grid inventory. Pure logic, no engine.
import { ITEMS } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';

export function footprint(e) {
  const fp = e.kind === 'weapon' ? WEAPONS[e.id].fp : ITEMS[e.id].fp;
  return e.rot ? [fp[1], fp[0]] : [fp[0], fp[1]];
}
export class Case {
  constructor(w = 10, h = 6) { this.w = w; this.h = h; this.items = []; this.nextUid = 1; }
  fitsAt(entry, x, y, rot, ignoreUid) {
    const fp = footprint({ ...entry, rot });
    if (x < 0 || y < 0 || x + fp[0] > this.w || y + fp[1] > this.h) return false;
    for (const o of this.items) {
      if (o.uid === ignoreUid || o === entry) continue;
      const of = footprint(o);
      if (x < o.x + of[0] && x + fp[0] > o.x && y < o.y + of[1] && y + fp[1] > o.y) return false;
    }
    return true;
  }
  firstFit(entry) {
    for (const rot of [0, 1]) {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.fitsAt(entry, x, y, rot, entry.uid)) return { x, y, rot };
    }
    return null;
  }
  at(x, y) {
    return this.items.find((o) => { const f = footprint(o); return x >= o.x && x < o.x + f[0] && y >= o.y && y < o.y + f[1]; }) || null;
  }
  /** Add an item (stacks ammo). Returns {ok, left} where left is what did not fit. */
  add(kind, id, count = 1) {
    const def = kind === 'weapon' ? WEAPONS[id] : ITEMS[id];
    if (!def) throw new Error('unknown item ' + id);
    let left = count;
    if (kind === 'item' && def.stack) {
      for (const o of this.items) {
        if (left <= 0) break;
        if (o.id === id && o.count < def.stack) { const n = Math.min(left, def.stack - o.count); o.count += n; left -= n; }
      }
      while (left > 0) {
        const e = { uid: this.nextUid, kind, id, x: 0, y: 0, rot: 0, count: 0 };
        const spot = this.firstFit(e);
        if (!spot) break;
        this.nextUid++;
        Object.assign(e, spot);
        e.count = Math.min(left, def.stack);
        left -= e.count;
        this.items.push(e);
      }
    } else {
      for (let i = 0; i < count; i++) {
        const e = { uid: this.nextUid, kind, id, x: 0, y: 0, rot: 0, count: 1 };
        const spot = this.firstFit(e);
        if (!spot) break;
        this.nextUid++;
        Object.assign(e, spot);
        this.items.push(e);
        left--;
      }
    }
    return { ok: left === 0, left };
  }
  place(entry, x, y, rot) {
    if (!this.fitsAt(entry, x, y, rot, entry.uid)) return false;
    entry.x = x; entry.y = y; entry.rot = rot;
    if (!this.items.includes(entry)) { entry.uid = this.nextUid++; this.items.push(entry); }
    return true;
  }
  remove(uid) { const i = this.items.findIndex((o) => o.uid === uid); if (i >= 0) return this.items.splice(i, 1)[0]; return null; }
  count(id) { return this.items.filter((o) => o.id === id).reduce((a, o) => a + (o.count ?? 1), 0); }
  has(id) { return this.items.some((o) => o.id === id); }
  take(id, n = 1) {
    let need = n;
    for (const o of [...this.items].reverse()) {
      if (o.id !== id || need <= 0) continue;
      const t = Math.min(need, o.count ?? 1);
      if ((o.count ?? 1) - t <= 0) this.remove(o.uid); else o.count -= t;
      need -= t;
    }
    return need === 0;
  }
  /** Pack everything first-fit decreasing. Returns false (and leaves the layout alone) if it cannot. */
  arrange() {
    const snapshot = this.items.map((o) => ({ ...o }));
    const area = (o) => { const f = footprint({ ...o, rot: 0 }); return f[0] * f[1]; };
    const sorted = [...this.items].sort((a, b) => area(b) - area(a) || footprint({ ...b, rot: 0 })[0] - footprint({ ...a, rot: 0 })[0]);
    const keep = this.items; this.items = [];
    for (const o of sorted) {
      const spot = this.firstFit({ ...o, uid: -1 });
      if (!spot) { this.items = keep; keep.forEach((k, i) => Object.assign(k, snapshot[i])); return false; }
      Object.assign(o, spot);
      this.items.push(o);
    }
    return true;
  }
  resize(w, h) { this.w = w; this.h = h; if (this.items.some((o) => !this.fitsAt(o, o.x, o.y, o.rot, o.uid))) this.arrange(); }
  serialize() { return { w: this.w, h: this.h, next: this.nextUid, items: this.items.map((o) => ({ ...o })) }; }
  static from(d) { const c = new Case(d.w, d.h); c.nextUid = d.next; c.items = d.items.map((o) => ({ ...o })); return c; }
}
