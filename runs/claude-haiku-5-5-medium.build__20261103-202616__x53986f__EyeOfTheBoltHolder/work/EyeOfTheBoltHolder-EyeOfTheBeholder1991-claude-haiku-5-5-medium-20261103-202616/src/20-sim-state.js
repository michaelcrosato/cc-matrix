/* ===== 20 sim · state, floors, map queries =====
 * THE SIM: pure and deterministic. It owns S (the state; JSON, also the save), advances in update(dt, cmds) and pushes
 * events (S.events, cleared each step) for the view, the audio and the HUD to read. No world, DOM, audio or Math.random
 * in this layer (tests/lint checks it). Directions: 0 N, 1 E, 2 S, 3 W; DX/DY as the map's. */
let S = null;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], DNAME = ['north', 'east', 'south', 'west'];
const ev = (t, o) => { S.events.push(Object.assign({ t }, o)); };
const sfx = n => ev('sfx', { n });
const key = (x, y) => x + ',' + y;
const inb = (f, x, y) => x >= 0 && y >= 0 && y < f.rows.length && x < f.rows[0].length;
const dirTo = (x, y, x2, y2) => { for (let d = 0; d < 4; d++) if (x + DX[d] === x2 && y + DY[d] === y2) return d; return -1; };
const rel = (d, which) => (d + { f: 0, r: 1, b: 2, l: 3 }[which]) % 4;
const cheb = (x, y, x2, y2) => Math.max(Math.abs(x - x2), Math.abs(y - y2));
const manh = (x, y, x2, y2) => Math.abs(x - x2) + Math.abs(y - y2);

/** the message log (the three newest on the HUD, the rest in the Journal) and the event for the view */
function msg(text, kind = 'info') {
  S.log.push({ t: S.time, text, kind }); if (S.log.length > 100) S.log.shift();
  ev('msg', { text, kind });
}
/** a hint, shown once (or as the player keeps at it) */
function hint(text, id) { if (S.hints[id || text]) return; S.hints[id || text] = true; ev('hint', { text }); }

/* ---- FLOORS: each floor's runtime state (its map is data, read from B.FLOORS) ---- */
const FLOOR_ORDER = ['f1', 'f2', 'f3', 'f4'];
const floorData = id => B.FLOORS[id];
const curF = () => floorData(S.floor);
const curFS = () => S.floors[S.floor];
/** a fresh runtime for a floor: its features' states from the map and its ids */
function makeFloorState(id) {
  const d = B.FLOORS[id], st = { gates: {}, doors: {}, plates: {}, levers: {}, buttons: {}, teles: {}, items: {}, alcoves: {}, mons: [], seen: '', flags: {}, wand: 0, loops: {}, dirs: {}, pits: {}, lastCrown: 0, leverLog: [], candles: {}, lit: [], ward: {}, uid: 0, visited: false, falls: {} };
  for (const [kid, [x, y]] of Object.entries(d.ids)) {
    const c = d.rows[y][x];
    if (c === '=') st.gates[kid] = { open: false };
    else if (c === '+' || c === 'L' || c === 'K' || c === 'M' || c === 'H' || c === 'I') {
      st.doors[kid] = { open: c === 'I', locked: c === 'L' || c === 'K' || c === 'M', kind: c };
    }
    else if (c === 'P') st.plates[kid] = { down: false, mode: (d.plates[kid] || {}).mode || 'latch', items: 0 };
    else if (c === 'T' || c === 'O' || c === 'o') st.plates[kid] = st.plates[kid] || { down: false };
    else if (c === '^') st.teles[kid] = { on: true };
    else if (c === 'S') st.teles[kid] = { on: true, spin: true };
  }
  for (const w of d.walls || []) {
    if (w.k === 'lever') st.levers[w.id] = { on: !!(d.leverStart && d.leverStart[w.id]) };
    else if (w.k === 'button') st.buttons[w.id] = { t: -99 };
    else if (w.k === 'candle') st.candles[w.id] = { lit: false };
  }
  for (const [k, list] of Object.entries(d.items || {})) if (list.length) st.items[k] = list.map(id => mkItem(id));
  for (const [id, list] of Object.entries(d.alcoves || {})) st.alcoves[id] = list.map(i => mkItem(i));
  st.mons = (d.monsters || []).flatMap(g => groupMonsters(g, id));
  st.wand = (d.wanderers && d.wanderers.budget) || 0;
  st.seen = '0'.repeat(d.rows.length * d.rows[0].length);
  if (id === 'f1') st.gates.G1 = { open: false };
  return st;
}
/** the monsters of a group, placed on the floor's cells (a group of n spreads on the cell and its neighbours) */
function groupMonsters(g, floorId) {
  const out = [], n = g.n || 1, spots = [[g.at[0], g.at[1]]];
  for (let i = 1; i < n; i++) spots.push([g.at[0], g.at[1]]);
  return spots.map((p, i) => mkMon(g.type, p[0], p[1], floorId, { asleep: !!g.asleep, patrol: g.patrol || null, id: g.id && i === 0 ? g.id : null }));
}
/** an item ref: { id, n? (stacks), charges?, rust? } */
function mkItem(id, n) {
  const def = B.ITEMS[id]; if (!def) throw new Error('no item ' + id);
  const r = { id }; if (def.stack) r.n = n || 1; if (def.charges) r.charges = def.charges; if (def.uses) r.uses = def.uses;
  return r;
}
/** a monster record */
function mkMon(type, cx, cy, floorId, o = {}) {
  const d = B.MONS[type]; if (!d) throw new Error('no monster ' + type);
  const f = S ? S.floors[floorId] : null, uid = f ? ++f.uid : 1;
  const hpScale = d.boss ? B.T.bossHp : B.T.monHp * ((S && S.diffMult && S.diffMult.monHp) || 1);
  return { id: (o.id || type) + '#' + uid, uid, type, cx, cy, hp: Math.max(1, Math.round(d.hp * hpScale)), max: Math.max(1, Math.round(d.hp * hpScale)), state: o.asleep ? 'asleep' : (o.patrol ? 'patrol' : 'idle'),
    aware: false, timer: 0, wind: 0, status: {}, dir: 2, drop: null, patrol: o.patrol || null, pi: 0, flee: 0, moveT: 0, stolen: [], lastSeen: -99, gaze: 0, bolt: 0, hold: 0, named: o.id || null, sleepHp: 0 };
}
/** the floor's current state, and a deep copy for a save */
function floorCells(id) { return B.FLOORS[id].rows; }
const cellOf = (x, y) => { const d = curF(); return d.rows[y] ? d.rows[y][x] || '#' : '#'; };
const isWallChar = c => c === '#' || c === undefined;
/** does the map cell hold a wall feature (a lever's wall is the cell beside): by the data */
const featAt = (x, y, dir) => (curF().walls || []).find(w => w.at[0] === x && w.at[1] === y && w.dir === dir);
/** the wall feature on the face (x, y, dir), or null */
function faceFeature(x, y, dir) { return featAt(x, y, dir) || null; }
/** the id of the map cell's feature (a gate, plate...), or null: the cell's id in the floor's ids */
function idAt(x, y) { const d = curF(); for (const [k, [a, b]] of Object.entries(d.ids)) if (a === x && b === y) return k; return null; }
/** can the party or a monster stand here now (a closed gate or door, a seal, a locked lock stop them) */
function passable(x, y, who = 'party') {
  const d = curF(), c = d.rows[y] && d.rows[y][x]; if (!c || c === '#') return false;
  const k = idAt(x, y), f = S.floors[S.floor];
  if (c === '=') return !!(k && f.gates[k] && f.gates[k].open);
  if (c === '+' || c === 'L' || c === 'K' || c === 'M' || c === 'H') { const dr = f.doors[k]; return !!(dr && dr.open); }
  if (c === 'I') return true;                     // an illusion walks like floor
  if (c === 'U') return !!(f.undergate && f.undergate.open);
  if (c === 'B') return false;                    // the Bolt-Holder fills the arena's centre
  return true;
}
/** the cell blocks sight: a wall, or a shut gate, door, seal, secret wall or Undergate */
function opaque(x, y) {
  const d = curF(), c = d.rows[y] && d.rows[y][x]; if (!c || c === '#') return true;
  return '=+LKMHU'.includes(c) && !passable(x, y);
}
/** line of sight between two cells (Bresenham, the cells between must be clear) */
function los(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, x = x0, y = y0;
  for (let guard = 0; guard < 99; guard++) {
    if (x === x1 && y === y1) return true;
    if ((x !== x0 || y !== y0) && opaque(x, y)) return false;
    const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx; } if (e2 <= dx) { err += dx; y += sy; }
  }
  return false;
}
/** reveal the automap: each cell in sight within 4, marked seen */
function reveal() {
  const f = S.floors[S.floor], d = curF(), W = d.rows[0].length; const p = S.party;
  let s = f.seen.split('');
  for (let y = p.cy - 4; y <= p.cy + 4; y++) for (let x = p.cx - 4; x <= p.cx + 4; x++) {
    if (!inb(d, x, y) || cheb(x, y, p.cx, p.cy) > 4) continue;
    if (los(p.cx, p.cy, x, y)) s[y * W + x] = '1';
  }
  f.seen = s.join('');
}
const seenAt = (x, y) => { const d = curF(); return S.floors[S.floor].seen[y * d.rows[0].length + x] === '1'; };
/** the monsters on the current floor */
const monsOn = () => S.floors[S.floor].mons;
const monAt = (x, y) => monsOn().find(m => m.hp > 0 && m.cx === x && m.cy === y) || null;
/** a monster's size in units of a cell (small 1, medium 2, large 4) */
const monUnits = m => ({ S: 1, M: 2, L: 4 })[B.MONS[m.type].size];
/** the units a cell's monsters take (a cell holds 4) */
const unitsIn = (x, y, except) => monsOn().reduce((n, m) => n + (m !== except && m.hp > 0 && m.cx === x && m.cy === y ? monUnits(m) : 0), 0);
/** a monster may enter the cell: passable for monsters, free of the party and of full cells */
const monCanEnter = (m, x, y) => {
  if (!passable(x, y, 'mon') || (S.party.cx === x && S.party.cy === y)) return false;
  if (unitsIn(x, y, m) + monUnits(m) > 4) return false;
  const pit = cellOf(x, y) === 'O' || cellOf(x, y) === 'o';   // pits and trapdoors: only the fliers cross them
  return !pit || !!B.MONS[m.type].flies;
};
/** breadth-first path (4-way) from a to b, through cells passable to the monster; the first step (or null) */
function bfsStep(m, tx, ty, blockFn) {
  const d = curF(), W = d.rows[0].length, H = d.rows.length, start = m.cy * W + m.cx, goal = ty * W + tx;
  const prev = new Int32Array(W * H).fill(-1); prev[start] = start; const q = [start];
  for (let i = 0; i < q.length; i++) {
    const c = q[i]; if (c === goal) break;
    const x = c % W, y = (c - x) / W;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (prev[n] !== -1) continue;
      if (n !== goal && (!monCanEnter(m, nx, ny) || (blockFn && blockFn(nx, ny)))) continue;
      if (n === goal && !passable(nx, ny, 'mon')) continue;
      prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] === -1) return null;
  let c = goal; if (c === start) return null;
  while (prev[c] !== start) c = prev[c];
  return [c % W, Math.floor(c / W)];
}
/** a deep copy of the state for a save: JSON, no events */
function cloneState(s) { return JSON.parse(JSON.stringify(s, (k, v) => k === 'events' ? undefined : v)); }
