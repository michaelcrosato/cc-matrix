// Records: the in-world World Record table per event (top 5, initials), laurels, the medal cabinet, points, medal
// tables and party points. Saved with O.store (never during the attract mode or a hub session).
(() => {
'use strict';
const E = My3D2dge, O = OLY;

const better = (ev, a, b) => { if (a == null) return false; if (b == null) return true; return ev.measure.better === 'lower' ? a < b : a > b; };
O.better = better;
const R = O.Records = {
  /** the event's table: [{ name, init, nation, perf }] best first, seeded with the WR holder and four marks below */
  table(id) {
    const all = O.store.get('records', {}); if (all[id] && all[id].length) return all[id];
    const ev = O.EVENTS[id]; if (!ev || !ev.measure.wr) return [];
    const [v, nat, nm] = ev.measure.wr, step = ev.measure.seedStep || (ev.measure.better === 'lower' ? v * .012 : -v * .02), others = O.NATION_IDS.filter(n => n !== nat);
    const t = [{ name: nm, init: nm.split(' ').map(w => w[0]).join('').slice(0, 3), nat, perf: v }];
    for (let i = 1; i < 5; i++) { const n = O.nation(others[(i * 3) % others.length]); t.push({ name: n.athlete.name, init: n.athlete.name.split(' ').map(w => w[0]).join('').slice(0, 3), nat: n.id, perf: +(v + step * i * (1 + i * .15)).toFixed(ev.measure.dp === undefined ? 2 : ev.measure.dp) }); }
    return t;
  },
  wr(id) { const t = R.table(id); return t[0] ? t[0].perf : null; },
  wrEntry(id) { return R.table(id)[0] || null; },
  qualifies(id, perf) { const ev = O.EVENTS[id]; if (perf == null || !ev || ev.format.type === 'match' && !ev.measure.wr) return false; const t = R.table(id); return t.length < 5 || better(ev, perf, t[t.length - 1].perf); },
  insert(id, entry) {
    const ev = O.EVENTS[id], all = O.store.get('records', {}), t = R.table(id).slice();
    t.push(entry); t.sort((a, b) => better(ev, a.perf, b.perf) ? -1 : better(ev, b.perf, a.perf) ? 1 : 0);
    all[id] = t.slice(0, 5); O.store.set('records', all); return all[id].indexOf(entry);
  },
  reset() { O.store.set('records', {}); },
  // laurels
  laurels() { return O.store.get('laurels', {}); },
  hasLaurel(id) { return !!R.laurels()[id]; },
  award(id) { if (!O.meet || O.meet.mode === 'attract' || O.meet.mode === 'practice' || O.inHub) return false; const L = Object.assign({}, R.laurels()); if (L[id]) return false; L[id] = 1; O.store.set('laurels', L); return true; },
  resetLaurels() { O.store.set('laurels', {}); },
  // cabinet: the best medal per nation per event (golden gear for that nation after a gold)
  cabinet() { return O.store.get('cabinet', {}); },
  addMedal(nat, id, m) { const c = JSON.parse(JSON.stringify(R.cabinet())), rank = { g: 3, s: 2, b: 1 }; c[nat] = c[nat] || {}; if (!c[nat][id] || rank[m] > rank[c[nat][id]]) c[nat][id] = m; O.store.set('cabinet', c); },
  golden(nat, id) { const c = R.cabinet(); return !!(c[nat] && c[nat][id] === 'g'); }
};

// medal tables: { SUN: { g, s, b } } sorted gold, silver, bronze, then name
O.medalTable = medals => O.NATIONS.map(n => ({ id: n.id, name: n.name, g: (medals[n.id] || {}).g || 0, s: (medals[n.id] || {}).s || 0, b: (medals[n.id] || {}).b || 0 }))
  .map(r => Object.assign(r, { total: r.g + r.s + r.b }))
  .sort((a, b) => b.g - a.g || b.s - a.s || b.b - a.b || a.name.localeCompare(b.name));
O.PARTY = [10, 8, 6, 5, 4, 3, 2, 1];
O.points = (id, perf) => { const ev = O.EVENTS[id]; if (!ev || perf == null || !ev.points) return 0; return Math.max(0, Math.round(ev.points(perf))); };
})();
