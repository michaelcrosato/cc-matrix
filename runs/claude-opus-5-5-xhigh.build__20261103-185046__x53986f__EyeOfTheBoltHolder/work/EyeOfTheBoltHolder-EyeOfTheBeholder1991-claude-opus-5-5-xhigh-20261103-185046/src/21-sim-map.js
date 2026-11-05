/* =====================================================================================
 * 21-sim-map: each floor's index (built once from its data), cell queries, sight (E.Grid's symmetric shadowcasting)
 * and the automap's record of what was seen
 * ===================================================================================== */
const DOOR_CH = { '+': 'door', '=': 'gate', L: 'lock', K: 'lock', M: 'seal', H: 'secret', I: 'illusion', U: 'undergate' };
B.IDX = {};
B.idx = f => B.IDX[f] || (B.IDX[f] = buildIdx(f));
function buildIdx(f) {
  const F = B.FLOORS[f], rows = F.map, H = rows.length, W = rows[0].length;
  const X = { f, W, H, rows, doors: {}, doorAt: {}, featAt: {}, feats: {}, featList: [], plateAt: {}, trapAt: {}, pitAt: {}, tpAt: {}, spin: {}, stairAt: {}, safe: {}, water: {} };
  const ch = (x, y) => (rows[y] || '')[x] || '#';
  X.ch = ch;
  const wallish = (x, y) => ch(x, y) === '#';
  const named = {};
  for (const [id, v] of Object.entries(F.doors || {})) named[key(v[0], v[1])] = [id, v[2] || {}];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = ch(x, y), k = key(x, y);
    if (DOOR_CH[c]) {
      const [id, o] = named[k] || ['D' + k, {}];
      const d = Object.assign({ id, x, y, kind: DOOR_CH[c], ns: wallish(x - 1, y) && wallish(x + 1, y) }, o);
      if (c === 'K' && !d.lock) d.lock = 'gearKey';
      if (d.lock && !d.kind.match(/lock/)) d.kind = 'lock';
      X.doors[id] = d; X.doorAt[k] = d;
    }
    if (c === 'S') X.spin[k] = true;
    if (c === '<' || c === '>') X.stairAt[k] = Object.assign({ up: c === '<' }, (F.stairs || {})[k] || {});
  }
  for (const [id, [x, y, mode]] of Object.entries(F.plates || {})) X.plateAt[key(x, y)] = { id, x, y, mode };
  for (const [id, [x, y]] of Object.entries(F.traps || {})) X.trapAt[key(x, y)] = { id, x, y };
  for (const [id, [x, y, o]] of Object.entries(F.pits || {})) X.pitAt[key(x, y)] = Object.assign({ id, x, y }, o || {});
  for (const [id, [x, y, o]] of Object.entries(F.tps || {})) X.tpAt[key(x, y)] = Object.assign({ id, x, y }, o || {});
  for (const [id, kind, x, y, face, o] of F.feats || []) { const ft = { id, kind, x, y, face, dir: FACE_DIR[face], o: o || {} }; X.feats[id] = ft; X.featList.push(ft); X.featAt[key(x, y) + face] = ft; }
  for (const [x0, y0, x1, y1] of F.safe || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) X.safe[key(x, y)] = true;
  for (const [x0, y0, x1, y1] of F.water || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) X.water[key(x, y)] = true;
  X.grid = new E.Grid(W, H, { walkable: (x, y) => !wallish(x, y), opaque: (x, y) => B.opaque(f, x, y) });
  return X;
}
const FL = (f = S.floor) => S.floors[f];
const IX = (f = S.floor) => B.idx(f);
B.FL = FL; B.IX = IX;
const wallAt = (x, y, f) => IX(f).ch(x, y) === '#';
B.wallAt = wallAt;
const doorAt = (x, y, f) => IX(f).doorAt[key(x, y)] || null;
B.doorAt = doorAt;
const doorSt = (d, f) => FL(f).doors[d.id];
/** can a body stand in a door's cell: an illusion always, the rest when open */
const doorPass = (d, f) => d.kind === 'illusion' || doorSt(d, f).open >= .85;
B.doorPass = doorPass;
/** does a cell block sight: walls, closed doors and seals (a gate's bars do not) */
B.opaque = (f, x, y) => {
  const X = B.idx(f); if (X.ch(x, y) === '#') return true;
  const d = X.doorAt[key(x, y)]; if (!d || !S || !S.floors[f]) return false;
  if (d.kind === 'gate') return false;
  if (d.kind === 'illusion') return true;
  return S.floors[f].doors[d.id].open < .5;
};
/** a pit in a cell that a body would fall into (open, unbridged) */
const pitOpen = (x, y, f) => { const p = IX(f).pitAt[key(x, y)]; if (!p) return null; const st = FL(f).pits[p.id]; return st.bridged ? null : p; };
B.pitOpen = pitOpen;
/** the party may step into (x, y): no wall, a door passable (or noclip) */
B.partyCan = (x, y) => {
  const X = IX(); if (x < 0 || y < 0 || x >= X.W || y >= X.H) return false;
  if (B.CHEATS.noclip) return true;
  if (wallAt(x, y)) return false;
  const d = doorAt(x, y); if (d && !doorPass(d)) return false;
  return true;
};
/** monsters at a cell (living) */
const monsAt = (x, y, f) => FL(f).mons.filter(m => m.hp > 0 && m.cx === x && m.cy === y);
B.monsAt = monsAt;
/** may a monster of a type enter (x, y): no walls, closed doors, illusions, stairs, teleporters, pits it would fall in, the
 *  party's cell, or a full cell */
B.monCan = (mon, x, y) => {
  const X = IX(), T = B.MON(mon.type), k = key(x, y);
  if (x < 0 || y < 0 || x >= X.W || y >= X.H || wallAt(x, y)) return false;
  const d = doorAt(x, y); if (d && (d.kind === 'illusion' || !doorPass(d))) return false;
  if (X.stairAt[k] || X.tpAt[k]) return false;
  const p = X.pitAt[k]; if (p && !T.fly && (!FL().pits[p.id].bridged || p.trapdoor)) return false;
  const P = S.party; if (P.cx === x && P.cy === y) return false;
  if (S.boss && S.boss.alive && S.boss.cx === x && S.boss.cy === y && mon.type !== 'boltholder') return false;
  return unitsIn(FL(), x, y, mon) + B.UNITS[T.size] <= 4;
};
/** the party's view: the cells seen from its cell (radius r), cached until it moves or a door changes */
B._fovKey = null; B._fov = new Set();
B.doorsV = 0;
function partyFov() {
  const P = S.party, k = S.floor + ':' + P.cx + ',' + P.cy + ':' + B.doorsV;
  if (B._fovKey !== k) { B._fovKey = k; B._fov = IX().grid.fov([P.cx, P.cy], 10); }
  return B._fov;
}
B.partyFov = partyFov;
/** the party looks: the automap marks what is near and in sight (radius 4), and monsters it falls on may notice */
function look() {
  const P = S.party, X = IX(), fl = FL(), fov = partyFov();
  let s = fl.seen.split('');
  for (const c of fov) { const [x, y] = c.split(',').map(Number); if (Math.max(Math.abs(x - P.cx), Math.abs(y - P.cy)) <= 4) s[y * X.W + x] = '1'; }
  s[P.cy * X.W + P.cx] = '1';
  fl.seen = s.join('');
}
B.look = look;
B.seen = (x, y, f = S.floor) => { const X = IX(f); return B.CHEATS.reveal || FL(f).seen[y * X.W + x] === '1'; };
/** a wall feature on the wall at face of the open cell (x, y) */
B.featAt = (x, y, dir, f) => IX(f).featAt[key(x, y) + FACE[dir]] || null;
/** the cell ahead of the party */
B.front = () => { const P = S.party; return [P.cx + DX[P.dir], P.cy + DY[P.dir]]; };
/** the items lying in a cell */
B.itemsAt = (x, y, f) => FL(f).items[key(x, y)] || [];
/** is a cell in a safe room */
B.isSafe = (x, y) => !!IX().safe[key(x, y)];
/** is the cell open to stand in and free of monsters (where a thing may be put down) */
B.openFree = (x, y) => !wallAt(x, y) && (() => { const d = doorAt(x, y); return !d || (d.kind !== 'illusion' && doorPass(d)); })() && !monsAt(x, y).length && !(S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === x && S.boss.cy === y);
