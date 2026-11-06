import { MAPS, MapInfo, reachable } from '../../src/game/mapPaint.js';

export default async function (t) {
  const names = ['quay', 'loft', 'road', 'cannery', 'yard', 'causeway', 'abbey', 'nave'];
  for (const n of names) {
    t.ok(MAPS[n], `map ${n} exists`);
    const m = new MapInfo(n);
    for (const row of m.rows) t.ok(row.length === m.w, `${n} row width`);
    if (n === 'loft') continue;
    const [start] = m.find('a');
    t.ok(start, `${n} has a start`);
    const seen = reachable(m, start);
    let open = 0; let reached = 0;
    for (let r = 0; r < m.h; r++) {
      for (let c = 0; c < m.w; c++) {
        if ('#T~H'.includes(m.ch(c, r))) continue;
        open++;
        if (seen.has(`${c},${r}`)) reached++;
      }
    }
    t.eq(reached, open, `${n}: every open cell reachable`);
  }
  const q = new MapInfo('quay');
  t.eq(q.find('y').length, 6, 'quay has six Tannoys');
  t.eq(q.find('$').length, 3, 'quay has three chests');
  t.eq(q.ch(56, 43), 'a', 'quay start on the pier');
  t.eq(q.ch(46, 34), 'W', 'quay cottage window');
  t.eq(new MapInfo('abbey').find('s').length, 3, 'three lamp statues');
  t.eq(new MapInfo('abbey').find('h').length, 3, 'three hiding niches');
  t.eq(new MapInfo('yard').find('z').length, 18, 'two 3x3 crane zones');
  const total = names.reduce((n, k) => n + new MapInfo(k).find('y').length, 0);
  t.eq(total, 15, 'fifteen Tannoys in the game');
  t.eq(q.groups('D').length, 4, 'quay has four doors');
}
