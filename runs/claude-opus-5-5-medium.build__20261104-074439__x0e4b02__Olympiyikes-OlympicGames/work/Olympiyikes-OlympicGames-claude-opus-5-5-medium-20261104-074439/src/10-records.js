/* OLYMPIYIKES! — records (§5.7, §7.5): world records, top-5 tables with initials, laurels, the medal cabinet, medal tables. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game;

/** better-than for an event's measure */
O.better = (def, a, b) => a != null && (b == null || (def.measure.better === 'lower' ? a < b : a > b));
O.Records = {
  /** the saved tables: { eventId: [{ v, nat, name, ini }] } top 5, seeded with the WR holder + four CPU marks */
  all() {
    let t = O.store.get('records', null);
    if (!t || typeof t !== 'object') t = {};
    for (const id in O.EVENTS) if (!Array.isArray(t[id]) || !t[id].length) t[id] = this.seed(O.EVENTS[id]);
    return t;
  },
  seed(def) {
    const [v, nat, name] = def.measure.wr, lower = def.measure.better === 'lower', rows = [{ v, nat, name, ini: name.split(' ').map(w => w[0]).join('').slice(0, 3) }];
    const others = O.NATIONS.filter(n => n.id !== nat).slice(0, 4);
    others.forEach((n, i) => { const k = (i + 1) * .025; const vv = lower ? v * (1 + k) : v * (1 - k); rows.push({ v: def.measure.round ? Math.round(vv) : +vv.toFixed(2), nat: n.id, name: n.athlete, ini: n.athlete.split(' ').map(w => w[0]).join('').slice(0, 3) }); });
    return rows;
  },
  wr(def) { const t = this.all()[def.id]; return t && t.length ? t[0] : null; },
  /** would v enter the top 5? */
  qualifies(def, v) { if (v == null) return false; const t = this.all()[def.id]; return t.length < 5 || O.better(def, v, t[t.length - 1].v); },
  insert(def, row) { const all = this.all(), t = all[def.id]; t.push(row); t.sort((a, b) => def.measure.better === 'lower' ? a.v - b.v : b.v - a.v); all[def.id] = t.slice(0, 5); O.store.set('records', all); return all[def.id].indexOf(row); },
  reset() { O.store.set('records', null); }
};
O.Laurels = {
  get() { const l = O.store.get('laurels', null); return l && typeof l === 'object' ? l : {}; },
  has(id) { return !!this.get()[id]; },
  award(id, name) { if (O.meet && (O.meet.mode === 'attract' || O.meet.mode === 'hub')) return false; const l = this.get(); if (l[id]) return false; l[id] = 1; O.store.set('laurels', l); O.toast('LAUREL EARNED: ' + name, '', { color: '#f2c94c' }); O.sting('laurel'); return true; },
  unlockAll() { const l = {}; for (const id in O.EVENTS) { const d = O.EVENTS[id]; if (d.laurel) l[d.laurel.id] = 1; } O.store.set('laurels', l); },
  reset() { O.store.set('laurels', null); }
};
O.Cabinet = {
  get() { const c = O.store.get('cabinet', null); return c && typeof c === 'object' ? c : {}; },
  add(nat, ev, rank) { if (!rank || rank > 3 || (O.meet && (O.meet.mode === 'attract' || O.meet.mode === 'hub' || O.meet.practice))) return; const c = this.get(); c[nat] = c[nat] || {}; if (!c[nat][ev] || rank < c[nat][ev]) c[nat][ev] = rank; O.store.set('cabinet', c); },
  golden(nat, ev) { const c = this.get(); return !!(c[nat] && c[nat][ev] === 1); }
};
/** medal table rows sorted gold, silver, bronze, then name */
O.medalTable = medals => O.NATIONS.map(n => { const m = medals[n.id] || { g: 0, s: 0, b: 0 }; return { nat: n, g: m.g, s: m.s, b: m.b, t: m.g + m.s + m.b }; })
  .sort((a, b) => b.g - a.g || b.s - a.s || b.b - a.b || a.nat.name.localeCompare(b.nat.name));
O.PARTY = [10, 8, 6, 5, 4, 3, 2, 1];
})();
