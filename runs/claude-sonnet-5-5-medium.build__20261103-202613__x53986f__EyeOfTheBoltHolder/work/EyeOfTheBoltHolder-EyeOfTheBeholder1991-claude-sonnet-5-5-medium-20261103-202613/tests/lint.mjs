// Content lint: features on walls, items/monsters on floor, stairs pair up, everything reachable.
import fs from 'node:fs'; import vm from 'node:vm';
export function loadB(files) { const ctx = vm.createContext({ console }); for (const f of files) vm.runInContext(fs.readFileSync('src/' + f, 'utf8').replace(/^const B =/m, 'var B ='), ctx); return ctx.B; }
export function lint(B) {
  const errs = [], D = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  for (const id in B.FLOORS) {
    const f = B.FLOORS[id], at = (x, y) => (f.rows[y] || '')[x] || '#', open = c => c !== '#';
    if (f.rows.some(r => r.length !== f.w) || f.rows.length !== f.h) errs.push(id + ': not rectangular');
    for (const ft of f.features) { const [x, y, d] = ft.at; if (!open(at(x, y))) errs.push(`${id}: feature ${ft.k} at ${x},${y} not on open cell`); const w = at(x + D[d][0], y + D[d][1]); if (open(w) && !'=+LM'.includes(w) && !(ft.k === 'torch')) errs.push(`${id}: feature ${ft.k} at ${x},${y},${d} faces ${w} not a wall`); if (ft.k === 'torch' && open(w)) errs.push(`${id}: torch ${x},${y},${d} not on wall`); }
    for (const it of f.items) if (!open(at(it[0], it[1])) || !B.ITEMS[it[2]]) errs.push(`${id}: item ${it} bad`);
    for (const m of f.mons) if (!open(at(m[0], m[1])) || !B.MONS[m[2]]) errs.push(`${id}: monster ${m} bad`);
    for (const k in f.stairs) { const [x, y] = k.split(',').map(Number); if (!'<>'.includes(at(x, y))) errs.push(`${id}: stairs ${k} not on stair cell`); const t = f.stairs[k]; if (!['end', 'finish'].includes(t.to) && !B.FLOORS[t.to]) errs.push(`${id}: stairs to unknown ${t.to}`); }
    for (const k in (f.gates || {})) if (at(...k.split(',').map(Number)) !== '=') errs.push(`${id}: gate ${k} not '='`);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const c = at(x, y); if (c === '=' && !f.gates[x + ',' + y]) errs.push(`${id}: unnamed gate ${x},${y}`); if (c === 'L' && !f.locks[x + ',' + y]) errs.push(`${id}: unnamed lock ${x},${y}`); }
    // flood fill from the start, every door-type passable; pits and teleporters passable
    const [sx, sy] = f.start, seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
    while (q.length) { const [x, y] = q.pop(); for (const d of Object.values(D)) { const nx = x + d[0], ny = y + d[1], k = nx + ',' + ny; if (!seen.has(k) && open(at(nx, ny)) ) { seen.add(k); q.push([nx, ny]); } } }
    for (const k of seen) { /* reachable */ }
    for (const it of f.items) if (!seen.has(it[0] + ',' + it[1])) errs.push(`${id}: item ${it[2]} at ${it[0]},${it[1]} not reachable (without secrets)`);
    for (const m of f.mons) if (!seen.has(m[0] + ',' + m[1])) errs.push(`${id}: monster ${m[2]} unreachable`);
    for (const k in f.stairs) if (!seen.has(k) && !(f.secrets[k])) errs.push(`${id}: stairs ${k} unreachable`);
  }
  return errs;
}
if (process.argv[1] && process.argv[1].endsWith('lint.mjs')) { const B = loadB(['00-core.js', '10-data-rules.js', '11-data-floors.js']); const e = lint(B); console.log(e.length ? e.join('\n') : 'lint ok'); }
