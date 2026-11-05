// Floors. Each stage is a grid of rooms joined by two-tile gaps. Some gaps are iron doors (one key opens a whole run),
// some are trap walls (a plate opens them). Transporter pads pair up, fake walls hide shortcuts, cracked walls hide
// stashes, and runes, force fields, spikes, the Dinner Bell, locked chests, crowns, specials and amulets are placed on
// free tiles. Every floor is generated from its seed and checked by a flood fill: the stairs must be reachable from the
// starts, opening doors with keys and stepping on plates on the way. A failed layout is rejected and the next seed tried.

const ROOM_W = 9, ROOM_H = 6;   // a room's interior, in tiles

function makeFloor(index) {
  const stage = STAGES[index];
  for (let attempt = 0; attempt < 800; attempt++) {
    const f = generateFloor(stage, stage.seed * 1000 + attempt, index);
    if (validateFloor(f)) return f;
  }
  throw new Error('no solvable layout for stage ' + (index + 1));
}

function generateFloor(stage, seed, index) {
  const R = stream(seed), pick = a => a[Math.floor(R() * a.length)];
  const inRange = (a, b) => a + Math.floor(R() * (b - a + 1));
  const feat = stage.feat || {};
  const treasure = stage.kind === 'treasure';
  const cols = stage.cols, rows = stage.rows;
  const W = cols * (ROOM_W + 1) + 1, H = rows * (ROOM_H + 1) + 1;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const room = (c, r) => ({ c, r, x0: c * (ROOM_W + 1) + 1, y0: r * (ROOM_H + 1) + 1, x1: c * (ROOM_W + 1) + ROOM_W, y1: r * (ROOM_H + 1) + ROOM_H });
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const q = room(c, r);
    for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++) g[y][x] = '.';
  }
  // links: a random spanning tree, plus a few extra links so there are loops
  const edges = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (c + 1 < cols) edges.push({ a: [c, r], b: [c + 1, r], horiz: true });
    if (r + 1 < rows) edges.push({ a: [c, r], b: [c, r + 1], horiz: false });
  }
  for (let i = edges.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [edges[i], edges[j]] = [edges[j], edges[i]]; }
  const parent = new Map(), find = k => { while (parent.has(k) && parent.get(k) !== k) k = parent.get(k); return k; };
  const links = [];
  for (const e of edges) {
    const ka = e.a.join(), kb = e.b.join(), fa = find(ka), fb = find(kb);
    if (!parent.has(ka)) parent.set(ka, ka); if (!parent.has(kb)) parent.set(kb, kb);
    if (fa !== fb) { parent.set(fa, fb); links.push(e); } else if (R() < .3) links.push(e);
  }
  for (const e of links) {
    const A = room(e.a[0], e.a[1]), B = room(e.b[0], e.b[1]);
    if (e.horiz) { const wx = B.x0 - 1, y = A.y0 + Math.floor(ROOM_H / 2) - 1; e.cells = [[wx, y], [wx, y + 1]]; }
    else { const wy = B.y0 - 1, x = A.x0 + Math.floor(ROOM_W / 2) - 1; e.cells = [[x, wy], [x + 1, wy]]; }
    for (const [x, y] of e.cells) g[y][x] = '.';
  }
  const linkKey = e => e.a.join() + '|' + e.b.join();
  const toStart = e => e.a.join() === '0,0' || e.b.join() === '0,0';
  // key doors and trap walls, on links that are not the way into the start room
  const doorOf = Array.from({ length: H }, () => Array(W).fill(-1));
  const doors = [], traps = [];
  if (!treasure) {
    for (const e of links) {
      if (toStart(e) || R() > .4) continue;
      const id = doors.length; doors.push({ id, cells: e.cells, open: false, plate: null });
      for (const [x, y] of e.cells) { g[y][x] = '+'; doorOf[y][x] = id; }
      e.used = true;
    }
    for (let i = 0; i < (feat.trapGroups || 0); i++) {
      const cand = links.filter(e => !e.used && !toStart(e) && !e.trap);
      if (!cand.length) break;
      const e = pick(cand); e.trap = true; e.used = true;
      const id = doors.length + traps.length; traps.push({ id, cells: e.cells, open: false, trap: true });
      for (const [x, y] of e.cells) { g[y][x] = 'T'; doorOf[y][x] = id; }
    }
  }
  // the stairs: the room farthest from the start by links
  const adj = new Map();
  for (const e of links) {
    const ka = e.a.join(), kb = e.b.join();
    if (!adj.has(ka)) adj.set(ka, []); if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push(kb); adj.get(kb).push(ka);
  }
  const dist = new Map([['0,0', 0]]), queue = ['0,0'];
  while (queue.length) { const k = queue.shift(); for (const n of adj.get(k) || []) if (!dist.has(n)) { dist.set(n, dist.get(k) + 1); queue.push(n); } }
  let far = '0,0';
  for (const [k, d] of dist) if (d > dist.get(far)) far = k;
  const [fc, fr] = far.split(',').map(Number), SR = room(fc, fr);
  const stairs = [SR.x0 + Math.floor(ROOM_W / 2), SR.y0 + Math.floor(ROOM_H / 2)];
  g[stairs[1]][stairs[0]] = '.';
  const S0 = room(0, 0);
  const starts = [[S0.x0 + 1, S0.y0 + 1], [S0.x0 + 1, S0.y0 + 2], [S0.x0 + 2, S0.y0 + 1], [S0.x0 + 2, S0.y0 + 2]];
  // fake walls and cracked walls: in wall lines between two rooms that are not linked, so they block nothing
  const wallCells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c + 1 < cols; c++) {
    const A = room(c, r), wx = A.x1 + 1; for (let y = A.y0; y <= A.y1; y++) wallCells.push([wx, y, 'v']);
  }
  for (let c = 0; c < cols; c++) for (let r = 0; r + 1 < rows; r++) {
    const A = room(c, r), wy = A.y1 + 1; for (let x = A.x0; x <= A.x1; x++) wallCells.push([x, wy, 'h']);
  }
  const freeWall = wallCells.filter(([x, y]) => g[y][x] === '#' && x > 0 && y > 0 && x < W - 1 && y < H - 1 && g[y][x - 1] !== '#' && g[y][x + 1] !== '#' && g[y - 1][x] !== '#' && g[y + 1][x] !== '#' && !(linkOn(x, y)));
  function linkOn(x, y) { return links.some(e => e.cells.some(([cx, cy]) => Math.abs(cx - x) <= 1 && Math.abs(cy - y) <= 1)); }
  const fakes = [], cracks = [];
  for (let i = 0; i < (feat.fakes || 0) && freeWall.length; i++) {
    const k = Math.floor(R() * freeWall.length), [x, y] = freeWall.splice(k, 1)[0];
    g[y][x] = '?'; fakes.push([x, y]);
  }
  for (let i = 0; i < (feat.cracked || 0) && freeWall.length; i++) {
    const k = Math.floor(R() * freeWall.length), [x, y] = freeWall.splice(k, 1)[0];
    g[y][x] = 'X'; cracks.push([x, y]);
  }
  // contents: free tiles in rooms away from the start
  const ents = new Map();
  const free = (x, y) => g[y][x] === '.' && !ents.has(x + ',' + y) && !starts.some(s => s[0] === x && s[1] === y) && !(x === stairs[0] && y === stairs[1]);
  const placeIn = (q, ch) => {
    for (let t = 0; t < 40; t++) {
      const x = inRange(q.x0, q.x1), y = inRange(q.y0, q.y1);
      if (free(x, y)) { ents.set(x + ',' + y, ch); return [x, y]; }
    }
    return null;
  };
  const roomsAway = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (c + r > 0 && !(c === fc && r === fr)) roomsAway.push(room(c, r));
  const shuffled = () => roomsAway.slice().sort(() => R() - .5);
  // the boss-free stages: monsters, then generators, each by its weights
  const monKinds = Object.entries(stage.mon || {});
  for (const [kind, n] of monKinds) for (let i = 0; i < n; i++) {
    const ch = Object.keys(MON_OF_CHAR).find(k => MON_OF_CHAR[k] === kind);
    placeIn(pick(roomsAway), ch);
  }
  const genKinds = Object.entries(stage.gen || {});
  const genRooms = shuffled().slice(0, genKinds.reduce((a, [, n]) => a + n, 0));
  let gi = 0;
  for (const [kind, n] of genKinds) for (let i = 0; i < n; i++) {
    const ch = Object.keys(GEN_OF_CHAR).find(k => GEN_OF_CHAR[k] === kind);
    if (genRooms[gi]) placeIn(genRooms[gi], ch);
    gi++;
  }
  // food and treasure in every room away from the start
  const FOOD = treasure ? [['$', .9], ['*', .8], ['h', .4]] : [['f', .4], ['b', .3], ['j', .2], ['z', .05], ['m', .3], ['$', .6], ['*', .3], ['h', .14]];
  for (const q of roomsAway) for (const [ch, p] of FOOD) if (R() < p) placeIn(q, ch);
  if (treasure) for (let i = 0; i < 4; i++) placeIn(pick(roomsAway), 'w');
  for (let i = 0; i < (feat.stew || 0); i++) placeIn(pick(roomsAway), 'z');
  for (let i = 0; i < (feat.crowns || 0); i++) placeIn(pick(roomsAway), 'w');
  // specials and amulets: each in its own room
  for (const s of feat.specials || []) { const ch = placeIn(pick(roomsAway), 'u'); if (ch) ents.set(ch[0] + ',' + ch[1], 'u:' + s); }
  for (const a of feat.amulets || []) { const ch = placeIn(pick(roomsAway), 'a'); if (ch) ents.set(ch[0] + ',' + ch[1], 'a:' + a); }
  // locked chests (a key opens each), and one of them holds a special in the reliquary
  const locked = feat.locked || 0;
  for (let i = 0; i < locked; i++) placeIn(pick(roomsAway), 'l');
  // keys: one for each door and locked chest, plus one spare
  const keyCount = treasure ? 0 : doors.length + locked + 1;
  for (let i = 0; i < keyCount; i++) placeIn(pick(roomsAway), 'k');
  // pads: pairs of transporters
  const pads = feat.transporters || 0;
  for (let i = 0; i < pads * 2; i++) placeIn(pick(roomsAway), 'O');
  // traps: a plate for each trap wall, in a room away from it
  for (const t of traps) placeIn(pick(roomsAway), '^');
  // runes, force fields (a column of three beam tiles), spikes, the bell
  for (let i = 0; i < (feat.runes || 0); i++) placeIn(pick(roomsAway), '!');
  for (let i = 0; i < (feat.fields || 0); i++) {
    const q = pick(roomsAway);
    for (let t = 0; t < 30; t++) {
      const x = inRange(q.x0 + 1, q.x1 - 1), y = inRange(q.y0, q.y1 - 2);
      if (free(x, y) && free(x, y + 1) && free(x, y + 2)) { ents.set(x + ',' + y, '|'); ents.set(x + ',' + (y + 1), '|'); ents.set(x + ',' + (y + 2), '|'); break; }
    }
  }
  for (let i = 0; i < (feat.spikes || 0); i++) placeIn(pick(roomsAway), 's');
  if (feat.bell) placeIn(pick(roomsAway), 'B');
  // skip stairs: down to a later stage (a number is carved on them)
  if (feat.skip !== undefined) { const q = pick(roomsAway); const c = placeIn(q, 'Z'); if (c) ents.set(c[0] + ',' + c[1], 'skip:' + feat.skip); }
  // lava: a two-by-two pool in a corner of some rooms (blocked, and it glows)
  for (let i = 0; i < (feat.lava || 0); i++) {
    const q = pick(roomsAway), x = q.x0 + 1, y = q.y0 + 1;
    if (g[y][x] === '.' && g[y][x + 1] === '.' && g[y + 1][x] === '.' && g[y + 1][x + 1] === '.' && !ents.has(x + ',' + y)) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g[y + dy][x + dx] = '~'; }
  }
  // the treasure rooms and the stairs' room hold no monsters: placed above only in roomsAway
  // the pads: which tile pairs with which (in reading order)
  const padList = [...ents].filter(([, c]) => c === 'O').map(([k]) => k).sort((a, b) => {
    const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return ay - by || ax - bx;
  });
  const padPair = new Map();
  for (let i = 0; i + 1 < padList.length; i += 2) { padPair.set(padList[i], padList[i + 1]); padPair.set(padList[i + 1], padList[i]); }
  return { stage, index, cols, rows, W, H, g, doorOf, doors, traps, ents, starts, stairs, links, fakes, cracks, padPair, treasure, realm: REALMS[stage.realm] };
}

// The flood fill: can the party reach the stairs, opening doors with keys found, stepping on plates, and taking the
// transporter pads? Fake walls are passable (the hero bumps them open); cracked walls are passable (shots open them).
function validateFloor(f) {
  const { g, doorOf, doors, traps, ents, starts, stairs, W, H, padPair } = f;
  const openedDoor = new Set(), openedTrap = new Set(), usedKeys = { n: 0 };
  const keyCells = new Set([...ents].filter(([, c]) => c === 'k').map(([k]) => k));
  const plateCells = new Set([...ents].filter(([, c]) => c === '^').map(([k]) => k));
  for (let round = 0; round < 60; round++) {
    const seen = Array.from({ length: H }, () => Array(W).fill(false));
    const todo = starts.map(s => s.slice());
    for (const [x, y] of todo) seen[y][x] = true;
    const found = new Set();
    while (todo.length) {
      const [x, y] = todo.pop();
      const k = x + ',' + y;
      if (keyCells.has(k)) found.add(k);
      if (padPair.has(k)) { const [px, py] = padPair.get(k).split(',').map(Number); if (!seen[py][px]) { seen[py][px] = true; todo.push([px, py]); } }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny][nx]) continue;
        const ch = g[ny][nx], ent = ents.get(nx + ',' + ny);
        if (ch === '#' || ch === '~' || ent === 'G' || ent === 'N' || ent === 'L' || ent === 'I' || ent === 'F' || ent === 'S') continue;
        if (ch === '+' && !openedDoor.has(doorOf[ny][nx])) continue;
        if (ch === 'T' && !openedTrap.has(doorOf[ny][nx])) continue;
        seen[ny][nx] = true; todo.push([nx, ny]);
      }
    }
    if (seen[stairs[1]][stairs[0]]) return true;
    // plates reached open their trap walls (free)
    let progressed = false;
    for (const t of traps) {
      if (openedTrap.has(t.id)) continue;
      const adjacent = t.cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && seen[ny][nx];
      }));
      if (adjacent) { openedTrap.add(t.id); progressed = true; }
    }
    if (progressed) continue;
    // otherwise a key opens the nearest closed door beside the reached area
    const keys = found.size - usedKeys.n;
    if (keys <= 0) return false;
    let opening = null;
    for (const d of doors) {
      if (openedDoor.has(d.id)) continue;
      if (d.cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && seen[ny][nx];
      }))) { opening = d; break; }
    }
    if (!opening) return false;
    openedDoor.add(opening.id); usedKeys.n++;
  }
  return false;
}

// The floor as the TileMap reads it: '#' walls (fake walls too), '+' key doors, 'T' trap walls, 'X' cracked walls.
function floorRows(f) {
  const rows = [];
  for (let y = 0; y < f.H; y++) {
    let s = '';
    for (let x = 0; x < f.W; x++) {
      const c = f.g[y][x];
      s += c === '+' ? '+' : c === 'T' ? 'T' : c === 'X' ? 'X' : c === '~' ? 'L' : c === '#' || c === '?' ? '#' : '.';
    }
    rows.push(s);
  }
  return rows;
}
