/* Floor generation: ASCII floors from a seed (rooms, 2-wide corridors, a key-aware solvability check), the boss hall, the hoards. */
const GEN_CHAR = { g: 'G', n: 'N', o: 'L', i: 'I', y: 'F', x: 'S' };

// generate floor `step` of PLAN with a seed; returns { rows, meta } (rows are strings, the same width)
function genFloor(step, seed, descent2) {
  const P = PLAN[step];
  if (P.kind === 'boss') return bossHall(P);
  if (P.kind === 'treasure') return hoardRoom(P, seed);
  for (let attempt = 0; attempt < 40; attempt++) {
    const f = tryFloor(P, E.rng((seed * 9973 + step * 7919 + attempt * 104729) >>> 0), descent2);
    if (f) { f.meta.attempt = attempt; return f; }
  }
  throw new Error('floor ' + step + ' would not generate');
}

function tryFloor(P, R, descent2) {
  const [W, H] = P.size, g = Array.from({ length: H }, () => Array(W).fill('#'));
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1)), rp = a => a[Math.floor(R() * a.length)];
  // --- rooms: random rectangles, 2 tiles of wall between them
  const rooms = [];
  for (let t = 0; t < 600 && rooms.length < P.rooms; t++) {
    const w = ri(6, 11), h = ri(5, 8), x = ri(2, W - w - 3), y = ri(2, H - h - 3);
    if (rooms.some(o => x < o.x + o.w + 3 && o.x < x + w + 3 && y < o.y + o.h + 3 && o.y < y + h + 3)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  if (rooms.length < Math.max(5, P.rooms - 3)) return null;
  // --- chain order: start at the leftmost room, always hop to the nearest unvisited one
  rooms.sort((a, b) => a.x - b.x);
  const order = [rooms.shift()];
  while (rooms.length) { const l = order[order.length - 1]; let bi = 0, bd = 1e9; rooms.forEach((o, i) => { const d = Math.abs(o.cx - l.cx) + Math.abs(o.cy - l.cy); if (d < bd) { bd = d; bi = i; } }); order.push(rooms.splice(bi, 1)[0]); }
  order.forEach((r, i) => { r.i = i; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = '.'; });
  const inRoom = (x, y) => order.some(r => x >= r.x - 1 && x < r.x + r.w + 1 && y >= r.y - 1 && y < r.y + r.h + 1);
  // --- corridors (2 wide, L shaped); remember each link's path to place doors on it
  const links = [];
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i], b = order[i + 1], path = [], hFirst = R() < .5;
    const carve = (x, y) => { for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) { const X = x + dx, Y = y + dy; if (X > 0 && Y > 0 && X < W - 1 && Y < H - 1 && g[Y][X] === '#') g[Y][X] = ','; } };
    let x = a.cx, y = a.cy;
    const stepH = () => { while (x !== b.cx) { carve(x, y); path.push([x, y, 'h']); x += Math.sign(b.cx - x); } };
    const stepV = () => { while (y !== b.cy) { carve(x, y); path.push([x, y, 'v']); y += Math.sign(b.cy - y); } };
    if (hFirst) { stepH(); stepV(); } else { stepV(); stepH(); }
    carve(x, y);
    links.push({ a: i, b: i + 1, path });
  }
  for (const r of order) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y][x] === ',') g[y][x] = '.';
  const taken = new Set(), K = (x, y) => y * W + x, free = (x, y) => g[y] && g[y][x] === '.' && !taken.has(K(x, y));
  const use = (x, y, c) => { g[y][x] = c; taken.add(K(x, y)); };
  // corridor cells become '.', rooms marked
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === ',') g[y][x] = '.';
  const cellsOf = r => { const o = []; for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) o.push([x, y]); return o; };
  const roomCell = (r, avoid) => { for (let t = 0; t < 40; t++) { const c = rp(cellsOf(r)); if (free(c[0], c[1])) return c; } return null; };
  const placeIn = (r, ch) => { const c = roomCell(r); if (!c) return null; use(c[0], c[1], ch); return c; };
  const first = order[0], last = order[order.length - 1];
  // --- start and stairs (kept clear)
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) use(first.x + 1 + dx, first.y + 1 + dy, '@');
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) use(last.cx + dx, last.cy + dy, 'E');
  // keep the cells beside the start free of other things
  for (let dy = -1; dy < 3; dy++) for (let dx = -1; dx < 3; dx++) taken.add(K(first.x + 1 + dx, first.y + 1 + dy));
  // --- doors: on the chain, just outside the room a link leaves; each needs a key found in rooms up to that room
  const doorLinks = []; const cand = links.map((l, i) => i).filter(i => i >= 1 && i < links.length - 0);
  for (let t = 0; t < P.doors && cand.length; t++) { const i = cand.splice(Math.floor(R() * cand.length), 1)[0]; doorLinks.push(i); }
  doorLinks.sort((a, b) => a - b);
  const doors = [];
  for (const li of doorLinks) {
    const L = links[li], A = order[L.a];
    const ok = L.path.findIndex(([x, y]) => !inRoom(x, y) && !inRoom(x + 1, y + 1) && !inRoom(x, y + 1) && !inRoom(x + 1, y));
    if (ok < 0 || ok + 2 >= L.path.length) continue;
    const [x, y, dir] = L.path[ok + 1];
    const cells = dir === 'h' ? [[x, y], [x, y + 1]] : [[x, y], [x + 1, y]];
    if (cells.some(([cx, cy]) => g[cy][cx] !== '.' || taken.has(K(cx, cy)))) continue;
    // door must not be adjacent to a room's cells
    cells.forEach(([cx, cy]) => use(cx, cy, '+'));
    doors.push({ li, room: L.a, cells });
  }
  // --- keys for every door (in rooms up to the one before the door), plus a spare for a locked chest
  const keyRooms = [];
  doors.forEach((d, j) => { const r = order[Math.floor(R() * (d.room + 1))]; if (placeIn(r, 'k')) keyRooms.push(r.i); });
  // --- generators
  const gens = [];
  const genMons = P.mons.filter(m => GEN_CHAR[m]);
  for (let n = 0; n < P.gens; n++) {
    const r = order[Math.min(order.length - 1, 1 + Math.floor((n + R()) * (order.length - 1) / P.gens))];
    const m = genMons[n % genMons.length], c = placeIn(r, GEN_CHAR[m]); if (c) gens.push({ x: c[0], y: c[1], m });
  }
  // --- monsters scattered in every room but the first
  const monN = 4 + P.no * 2;
  for (let n = 0; n < monN; n++) { const r = order[1 + Math.floor(R() * (order.length - 1))], m = rp(P.mons.filter(c => c !== 'x')); placeIn(r, m); }
  if (P.mons.includes('x')) placeIn(order[Math.max(1, order.length >> 1)], 'x');
  // --- food, flasks and treasure
  for (let n = 0; n < P.food; n++) placeIn(order[Math.floor(R() * order.length)], rp(['f', 'b', 'j', 'b', 'f']));
  for (let n = 0; n < 2; n++) placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'z');
  for (let n = 0; n < 2 + (P.no >> 1); n++) placeIn(order[Math.floor(R() * order.length)], 'm');
  for (let n = 0; n < 8 + P.no * 2; n++) placeIn(order[Math.floor(R() * order.length)], R() < .25 ? '*' : '$');
  for (let n = 0; n < 2; n++) placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'h');
  if (P.no >= 2) { if (placeIn(order[Math.max(1, order.length - 2)], 'l')) placeIn(order[Math.floor(R() * (order.length - 1))], 'k'); }
  const specials = [], amulets = [];
  { const s = SPECIALS[(P.no * 3 + (R() * 3 | 0)) % SPECIALS.length]; if (placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'u')) specials.push(s); }
  { const a = AMULETS[(P.no + (R() * 5 | 0)) % AMULETS.length]; if (placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'a')) amulets.push(a); }
  if (P.no >= 3 && R() < .7) placeIn(order[Math.floor(R() * order.length)], 'w');
  // --- closets: alcoves cut into the outer face of a room's wall, sealed by trap walls, cracks or a fake wall
  const closet = (seal, contents) => {
    for (let t = 0; t < 60; t++) {
      const r = rp(order.slice(1)), side = Math.floor(R() * 4);
      let sx, sy, dx = 0, dy = 0;       // seal cell, direction out of the room
      if (side === 0) { dy = -1; sx = r.x + 1 + Math.floor(R() * (r.w - 2)); sy = r.y - 1; }
      else if (side === 1) { dy = 1; sx = r.x + 1 + Math.floor(R() * (r.w - 2)); sy = r.y + r.h; }
      else if (side === 2) { dx = -1; sx = r.x - 1; sy = r.y + 1 + Math.floor(R() * (r.h - 2)); }
      else { dx = 1; sx = r.x + r.w; sy = r.y + 1 + Math.floor(R() * (r.h - 2)); }
      // the 3x3 pocket beyond the seal must be solid wall and inside the map
      const px0 = sx + dx, py0 = sy + dy; let ok = true; const pocket = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const X = px0 + dx + (dx ? 0 : a) + (dx ? 0 : 0), Y = py0 + dy + (dy ? 0 : b); const xx = dx ? px0 + dx * Math.max(0, 0) + (a === 0 ? 0 : 0) : px0 + a, yy = dy ? py0 : py0 + b; void X; void Y; }
      const cs = [[px0, py0]]; if (dx) { cs.push([px0 + dx, py0]); cs.push([px0, py0 - 1], [px0, py0 + 1]); } else { cs.push([px0, py0 + dy]); cs.push([px0 - 1, py0], [px0 + 1, py0]); }
      for (const [X, Y] of cs) if (X < 2 || Y < 2 || X > W - 3 || Y > H - 3 || g[Y][X] !== '#') ok = false;
      // the ring around the pocket must also be wall (so it stays closed)
      for (let a = -2; a <= 2 && ok; a++) for (let b = -2; b <= 2; b++) { const X = px0 + a + dx, Y = py0 + b + dy; if (X < 1 || Y < 1 || X > W - 2 || Y > H - 2) { ok = false; break; } const cc = g[Y][X]; if (cc !== '#' && !(X === sx && Y === sy) && !(Math.abs(X - px0) + Math.abs(Y - py0) <= 2 && cc === '#')) { if (cc !== '#') { ok = false; break; } } }
      if (!ok || g[sy][sx] !== '#' || !free(sx - dx, sy - dy)) continue;
      // carve the pocket (2 cells deep), seal it
      g[py0][px0] = '.'; taken.add(K(px0, py0)); g[py0 + dy][px0 + dx] = '.'; taken.add(K(px0 + dx, py0 + dy));
      g[sy][sx] = seal; taken.add(K(sx, sy)); taken.add(K(sx - dx, sy - dy));
      contents.forEach((c, i) => { const p = i === 0 ? [px0, py0] : i === 1 ? [px0 + dx, py0 + dy] : [px0 + (dx ? 0 : (i === 2 ? -1 : 1)), py0 + (dy ? 0 : (i === 2 ? -1 : 1))]; if (g[p[1]][p[0]] === '#') g[p[1]][p[0]] = '.'; if (c) g[p[1]][p[0]] = c; taken.add(K(p[0], p[1])); });
      return { sx, sy, px: px0, py: py0 };
    }
    return null;
  };
  let traps = 0;
  for (let n = 0; n < (P.traps || 0); n++) {
    if (n % 2 === 0) { if (closet('T', ['$', '*', '$']) && placeIn(order[Math.floor(R() * order.length)], '^')) traps++; }
    else { if (closet('Y', ['n', 'n', 'n']) && placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'v')) traps++; }
  }
  if (P.no >= 2) closet('X', ['f', 'm', 'h']);
  if (P.no >= 1) closet('?', ['*', '$', 'j']);
  if (P.skip) { const sk = closet('?', [String(P.skip)]); void sk; }
  // --- force fields across corridors, runes and spikes, lava, the bell, transporters
  for (let n = 0; n < (P.force || 0); n++) {
    const li = 1 + Math.floor(R() * (links.length - 1)), L = links[li];
    const k = L.path.findIndex(([x, y]) => !inRoom(x, y) && !inRoom(x + 1, y + 1) && !inRoom(x, y + 1) && !inRoom(x + 1, y));
    if (k < 0 || k + 3 >= L.path.length) continue;
    const [x, y, dir] = L.path[k + 2], cells = dir === 'h' ? [[x, y, '|'], [x, y + 1, '|']] : [[x, y, '-'], [x + 1, y, '-']];
    if (cells.every(([cx, cy]) => g[cy][cx] === '.' && !taken.has(K(cx, cy)))) cells.forEach(([cx, cy, c]) => use(cx, cy, c));
  }
  for (let n = 0; n < (P.runes || 0); n++) { const r = rp(order.slice(1)); for (let q = 0; q < 3; q++) { const c = roomCell(r); if (c) use(c[0], c[1], '!'); } }
  for (let n = 0; n < (P.spikes || 0); n++) { const r = rp(order.slice(1)); for (let q = 0; q < 4; q++) { const c = roomCell(r); if (c) use(c[0], c[1], 's'); } }
  if (P.lava) for (let n = 0; n < 3; n++) { const r = rp(order.slice(1)), c = roomCell(r); if (c && c[0] + 1 < r.x + r.w - 1 && c[1] + 1 < r.y + r.h - 1) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (free(c[0] + dx, c[1] + dy)) use(c[0] + dx, c[1] + dy, '~'); }
  if (P.bell) placeIn(order[Math.max(1, order.length - 3)], 'B');
  if (P.no >= 3) { const a = placeIn(order[1], 'O'), b = placeIn(order[order.length - 2], 'O'); if (!a || !b) { if (a) g[a[1]][a[0]] = '.'; if (b) g[b[1]][b[0]] = '.'; } }
  // --- validate: with doors counted by keys, lava and all, the stairs must be reachable and every key too
  const rows = g.map(r => r.join(''));
  if (!solvable(rows)) return null;
  return { rows, meta: { name: P.name, realm: P.realm, no: P.no, kind: 'floor', par: 150 + P.no * 10, rank: Math.min(3, 1 + (P.no >= 3) + (P.no >= 6)) + (descent2 ? 1 : 0), genRank: Math.min(3, 1 + (P.no >= 2) + (P.no >= 5)) + (descent2 ? 1 : 0), specials, amulets, skip: P.skip || 0, tithe: !!P.tithe, step: PLAN.indexOf(P), rooms: order.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })) } };
}

// can the heroes reach the stairs, taking keys and opening whole door runs, with lava and trap walls closed?
function solvable(rows) {
  const H = rows.length, W = rows[0].length, g = rows.map(r => r.split(''));
  const walk = (c) => !'#%XTY~='.includes(c) && c !== '?' ;   // a fake wall is walkable but we do not count on it
  let sx = -1, sy = -1; for (let y = 0; y < H && sx < 0; y++) { const x = g[y].indexOf('@'); if (x >= 0) { sx = x; sy = y; } }
  if (sx < 0) return false;
  let keys = 0; const seen = new Uint8Array(W * H), open = new Set();
  const flood = () => {
    const q = [[sx, sy]]; seen.fill(0); seen[sy * W + sx] = 1; let reachedExit = false, kc = 0; const doorCells = [];
    while (q.length) {
      const [x, y] = q.pop(); const c = g[y][x];
      if (c === 'E') reachedExit = true; if (c === 'k') kc++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx]) continue;
        const d = g[ny][nx];
        if (d === '+' && !open.has(ny * W + nx)) { doorCells.push([nx, ny]); continue; }
        if (!walk(d) && d !== '+') continue;
        seen[ny * W + nx] = 1; q.push([nx, ny]);
      }
    }
    return { reachedExit, kc, doorCells };
  };
  const taken = new Set();
  for (let it = 0; it < 30; it++) {
    const f = flood(); if (f.reachedExit) return true;
    // keys picked so far = keys seen in reachable area minus used
    let totalSeen = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (seen[y * W + x] && g[y][x] === 'k' && !taken.has(y * W + x)) { taken.add(y * W + x); totalSeen++; }
    keys += totalSeen;
    if (!f.doorCells.length || keys < 1) return false;
    // open one whole 4-connected door run
    const [dx0, dy0] = f.doorCells[0], st = [[dx0, dy0]];
    while (st.length) { const [x, y] = st.pop(); if (open.has(y * W + x)) continue; open.add(y * W + x); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + ax, Y = y + ay; if (g[Y] && g[Y][X] === '+') st.push([X, Y]); } }
    keys--;
  }
  return false;
}

function hoardRoom(P, seed) {
  const R = E.rng(seed * 31 + 7), W = 36, H = 22, g = Array.from({ length: H }, () => Array(W).fill('#'));
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) g[y][x] = '.';
  for (let x = 12; x < 24; x += 6) for (let y = 6; y < 16; y++) g[y][x] = '#';
  g[3][3] = g[3][4] = g[4][3] = g[4][4] = '@';
  g[H - 5][W - 5] = g[H - 5][W - 4] = g[H - 4][W - 5] = g[H - 4][W - 4] = 'E';
  let n = 0;
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (g[y][x] === '.' && (x + y) % 2 === 0 && R() < .5) { g[y][x] = R() < .12 ? '*' : R() < .02 ? 'w' : R() < .06 ? 'h' : '$'; n++; }
  return { rows: g.map(r => r.join('')), meta: { name: P.name, realm: 3, no: 0, kind: 'treasure', par: 60, rank: 1, genRank: 1, specials: [], amulets: [], step: PLAN.indexOf(P), treasureCount: n } };
}

function bossHall(P) {
  const W = 42, H = 22, g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? '#' : '.'));
  // the banquet table: a low wall three cells deep, platters along both edges, a tureen at each corner; the king sits at its head
  for (let y = 5; y <= 7; y++) for (let x = 10; x <= 30; x++) g[y][x] = '=';
  for (let x = 13; x <= 28; x += 3) { g[5][x] = 'P'; g[7][x] = 'P'; }
  g[5][10] = g[7][10] = g[5][30] = g[7][30] = 'U';
  g[6][33] = 'K';
  for (const [x, y, c] of [[4, 10, '$'], [37, 10, '$'], [4, 12, 'f'], [37, 12, 'f'], [20, 12, 'j'], [10, 15, 'm'], [18, 15, 'm'], [26, 15, 'm'], [34, 15, 'm'], [20, 3, '*'], [14, 2, '$'], [26, 2, '$']]) g[y][x] = c;
  g[18][4] = g[18][5] = g[19][4] = g[19][5] = '@';
  return { rows: g.map(r => r.join('')), meta: { name: P.name, realm: 3, no: 9, kind: 'boss', par: 400, rank: 2, genRank: 2, specials: [], amulets: [], step: PLAN.indexOf(P), points: { escape: [] } } };
}
