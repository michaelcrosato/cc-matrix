// Zone generator: stitches ASCII room templates into a map from a seed. Same code on every client.
import { NavGrid } from '../../pixel-engine.js';
import { TEMPLATES, TEMPLATE_IDS, START_ROOM, EXIT_ROOM, TEMPLATE_W, TEMPLATE_H } from '../data/rooms/templates.js';
import * as ARENAS from '../data/rooms/arenas.js';
import { ZONES } from '../data/zones.js';

const PX = TEMPLATE_W - 1; // pitch: neighbouring rooms share a wall row/column
const PY = TEMPLATE_H - 1;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function finish(def, w, h, cells, markers, rooms, extra = {}) {
  const rows = [];
  for (let r = 0; r < h; r++) {
    let s = '';
    for (let c = 0; c < w; c++) { const v = cells[r * w + c]; s += v === 0 ? '#' : v === 2 ? '~' : v === 3 ? 'P' : '.'; }
    rows.push(s);
  }
  const nav = NavGrid.fromRows(rows, { blocked: '#~P', origin: [0, 0, 0] });
  return { id: def.id, w, h, cells, rows, markers, rooms, nav, ...extra };
}

export function parseAuthored(name) {
  const rows = ARENAS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cells = new Uint8Array(w * h);
  const markers = [];
  for (let r = 0; r < h; r++) {
    const row = rows[r].padEnd(w, '#');
    for (let c = 0; c < w; c++) {
      const ch = row[c];
      cells[r * w + c] = ch === '#' ? 0 : ch === '~' ? 2 : ch === 'P' ? 3 : 1;
      if (/[SECBTLAXNKHZOWY1-9]/.test(ch)) markers.push({ t: ch, x: c + 0.5, z: r + 0.5, room: 0 });
    }
  }
  return { w, h, cells, markers, rooms: [{ id: 0, x0: 0, y0: 0, x1: w - 1, y1: h - 1, tpl: name }] };
}

export function generateZone(root, zoneId, opts = {}) {
  const def = ZONES[zoneId] || ZONES[opts.base];
  const rng = root.fork('zone:' + zoneId + (opts.salt ? ':' + opts.salt : ''));
  if (def.authored) {
    const a = parseAuthored(def.authored);
    return finish({ id: zoneId }, a.w, a.h, a.cells, a.markers, a.rooms, { authored: true, entrance: findMarker(a.markers, 'X'), exit: null });
  }
  const g = opts.gen || def.gen;
  const count = g.rooms;
  // self-avoiding growth on a coarse grid
  const key = (x, y) => x + ',' + y;
  const cellsAt = new Map();
  const list = [{ x: 0, y: 0, links: [] }];
  cellsAt.set(key(0, 0), list[0]);
  let guard = 0;
  while (list.length < count && guard++ < 5000) {
    const src = rng.chance(0.65) ? list[list.length - 1] : rng.pick(list);
    let d = rng.pick(DIRS);
    if (g.outdoor && rng.chance(0.6)) d = rng.chance(0.75) ? [1, 0] : rng.pick(DIRS);
    const nx = src.x + d[0], ny = src.y + d[1];
    if (cellsAt.has(key(nx, ny))) continue;
    const n = { x: nx, y: ny, links: [src] };
    src.links.push(n);
    cellsAt.set(key(nx, ny), n); list.push(n);
  }
  // also connect random adjacent pairs for loops
  for (const a of list) for (const d of DIRS) { const b = cellsAt.get(key(a.x + d[0], a.y + d[1])); if (b && !a.links.includes(b) && rng.chance(0.18)) { a.links.push(b); b.links.push(a); } }
  const minX = Math.min(...list.map((c) => c.x)), minY = Math.min(...list.map((c) => c.y));
  const maxX = Math.max(...list.map((c) => c.x)), maxY = Math.max(...list.map((c) => c.y));
  for (const c of list) { c.x -= minX; c.y -= minY; }
  const W = (maxX - minX) * PX + TEMPLATE_W, H = (maxY - minY) * PY + TEMPLATE_H;
  // BFS from start for the exit
  const depth = new Map([[list[0], 0]]);
  const q = [list[0]];
  while (q.length) { const c = q.shift(); for (const n of c.links) if (!depth.has(n)) { depth.set(n, depth.get(c) + 1); q.push(n); } }
  let exitCell = list[0];
  for (const c of list) if (depth.get(c) > depth.get(exitCell)) exitCell = c;
  const cells = new Uint8Array(W * H);
  const markers = [];
  const rooms = [];
  let prev = null;
  list.forEach((rc, i) => {
    let tplName, rows;
    if (i === 0) { tplName = 'start'; rows = START_ROOM; }
    else if (rc === exitCell && !g.noExit) { tplName = 'exit'; rows = EXIT_ROOM; }
    else {
      const pool = TEMPLATE_IDS.filter((t) => t !== prev);
      tplName = rng.pick(pool); rows = TEMPLATES[tplName]; prev = tplName;
    }
    const ox = rc.x * PX, oy = rc.y * PY;
    const room = { id: i, cx: rc.x, cy: rc.y, x0: ox, y0: oy, x1: ox + TEMPLATE_W - 1, y1: oy + TEMPLATE_H - 1, tpl: tplName, depth: depth.get(rc), first: i === 0, last: rc === exitCell };
    rooms.push(room);
    for (let r = 0; r < TEMPLATE_H; r++) for (let c = 0; c < TEMPLATE_W; c++) {
      const ch = rows[r][c];
      const idx = (oy + r) * W + ox + c;
      if (ch === 'D') continue; // doors decided below
      if (ch === '#') { if (cells[idx] === 0) cells[idx] = 0; continue; }
      cells[idx] = ch === '~' ? 2 : ch === 'P' ? 3 : 1;
      if (/[SECBTLAXNKHZ]/.test(ch)) markers.push({ t: ch, x: ox + c + 0.5, z: oy + r + 0.5, room: i });
    }
  });
  // doors: open between linked rooms
  for (const a of list) for (const b of a.links) {
    if (a === b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const ox = a.x * PX, oy = a.y * PY;
    const mx = ox + (TEMPLATE_W >> 1), my = oy + (TEMPLATE_H >> 1);
    const dc = dx > 0 ? [ox + TEMPLATE_W - 1, my] : dx < 0 ? [ox, my] : dy > 0 ? [mx, oy + TEMPLATE_H - 1] : [mx, oy];
    cells[dc[1] * W + dc[0]] = 1;
    // open a little of the wall beside for a wider doorway
  }
  // remove pits that block a doorway or the middle line to keep connectivity (rooms are connected by their middles)
  const zone = finish({ id: zoneId }, W, H, cells, markers, rooms, {});
  const e = findMarker(markers, 'X');
  zone.entrance = e || { x: 7.5, z: 6.5 };
  const exits = markers.filter((m) => m.t === 'X');
  zone.exit = exits.length > 1 ? exits[exits.length - 1] : (g.noExit ? null : exits[0] || null);
  if (zone.exit && zone.exit === zone.entrance) zone.exit = null;
  // ensure connectivity from start to exit; repair by carving if needed
  if (zone.exit) {
    let tries = 0;
    while (!zone.nav.path([zone.entrance.x, 0, zone.entrance.z], [zone.exit.x, 0, zone.exit.z]) && tries++ < 20) {
      carveCorridor(zone, zone.entrance, zone.exit);
    }
  }
  return zone;
}

function carveCorridor(zone, a, b) {
  let x = Math.floor(a.x), z = Math.floor(a.z);
  const tx = Math.floor(b.x), tz = Math.floor(b.z);
  while (x !== tx || z !== tz) {
    if (x !== tx) x += Math.sign(tx - x); else z += Math.sign(tz - z);
    const i = z * zone.w + x;
    if (zone.cells[i] !== 1) { zone.cells[i] = 1; zone.nav.setOpen(x, z, true); zone.rows[z] = zone.rows[z].slice(0, x) + '.' + zone.rows[z].slice(x + 1); }
  }
}

function findMarker(markers, t) { return markers.find((m) => m.t === t) || null; }
export const isFloor = (zone, x, z) => { const c = Math.floor(x), r = Math.floor(z); return c >= 0 && r >= 0 && c < zone.w && r < zone.h && zone.cells[r * zone.w + c] === 1; };
export const cellAt = (zone, x, z) => { const c = Math.floor(x), r = Math.floor(z); return c < 0 || r < 0 || c >= zone.w || r >= zone.h ? 0 : zone.cells[r * zone.w + c]; };
