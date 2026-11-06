// Stitches ASCII room templates into a map from a seed. The same code runs on every client.
import { NavGrid } from '../../pixel-engine.js';
import { ZONES } from '../data/zones.js';

const OUT = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const OPP = { n: 's', s: 'n', w: 'e', e: 'w' };

function normalize(t) {
  const w = Math.max(...t.rows.map((r) => r.length));
  return t.rows.map((r) => r.padEnd(w, ' '));
}

function doorsOf(rows) {
  const out = [];
  const h = rows.length, w = rows[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== 'D') continue;
      let dir = null;
      if (y === 0 || rows[y - 1][x] === ' ' || rows[y - 1][x] === '~' && y === 0) dir = 'n';
      else if (y === h - 1) dir = 's';
      else if (x === 0) dir = 'w';
      else if (x === w - 1) dir = 'e';
      else if (rows[y - 1][x] === ' ') dir = 'n';
      else if (rows[y + 1][x] === ' ') dir = 's';
      else if (rows[y][x - 1] === ' ') dir = 'w';
      else if (rows[y][x + 1] === ' ') dir = 'e';
      if (dir) out.push({ x, y, dir });
    }
  }
  return out;
}

const solid = (ch) => ch === '#' || ch === 'D' || ch === '~' || ch === ' ';
const key = (x, y) => (x + 4096) * 8192 + (y + 4096);

class Canvas {
  constructor() { this.cells = new Map(); this.rooms = []; this.sockets = []; this.links = []; }
  get(x, y) { return this.cells.get(key(x, y)); }
  fits(rows, ox, oy) {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[0].length; x++) {
        const ch = rows[y][x];
        if (ch === ' ') continue;
        const cur = this.get(ox + x, oy + y);
        if (cur === undefined) continue;
        if (!(solid(ch) && solid(cur))) return false;
      }
    }
    return true;
  }
  stamp(tpl, rows, ox, oy) {
    const index = this.rooms.length;
    const room = { index, id: tpl.id, x: ox, y: oy, w: rows[0].length, h: rows.length, tpl };
    this.rooms.push(room);
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[0].length; x++) {
        const ch = rows[y][x];
        if (ch === ' ') continue;
        const cur = this.get(ox + x, oy + y);
        if (cur === undefined || cur === '~' || (cur === '#' && ch === '#')) {
          if (ch === 'D') this.cells.set(key(ox + x, oy + y), 'D');
          else if (cur !== '#' || ch !== '~') this.cells.set(key(ox + x, oy + y), ch);
        }
      }
    }
    for (const d of doorsOf(rows)) {
      const wx = ox + d.x, wy = oy + d.y;
      this.sockets.push({ x: wx, y: wy, dir: d.dir, room: index });
    }
    return room;
  }
}

function tryAttach(rng, canvas, tpl, rows, socket) {
  const doors = doorsOf(rows).filter((d) => d.dir === OPP[socket.dir]);
  rng.shuffle(doors);
  for (const d of doors) {
    const ox = socket.x - d.x, oy = socket.y - d.y;
    if (!canvas.fits(rows, ox, oy)) continue;
    const room = canvas.stamp(tpl, rows, ox, oy);
    canvas.links.push({ x: socket.x, y: socket.y, a: socket.room, b: room.index, dir: socket.dir });
    canvas.cells.set(key(socket.x, socket.y), '.');
    // Both sides of the door are now used.
    canvas.sockets = canvas.sockets.filter((s) => !(s.x === socket.x && s.y === socket.y));
    return room;
  }
  return null;
}

/** Lay out one floor. Retries with the same stream until the layout is whole; deterministic. */
export function layoutFloor(rng, zone, floor) {
  const g = zone.gen;
  const rooms = Array.isArray(g.rooms) ? g.rooms[floor] ?? g.rooms[g.rooms.length - 1] : g.rooms;
  const byId = Object.fromEntries(zone.templates.map((t) => [t.id, t]));
  const endId = g.bossAt?.[floor] ?? g.end;
  for (let attempt = 0; attempt < 60; attempt++) {
    const canvas = new Canvas();
    const startTpl = byId[g.start];
    const start = canvas.stamp(startTpl, normalize(startTpl), 0, 0);
    const required = [...g.required];
    const fill = () => { const t = byId[rng.pick(g.fill)]; return t; };
    let ok = true;
    const sequence = [];
    const middle = Math.max(0, rooms - 2 - required.length);
    for (let i = 0; i < middle; i++) sequence.push(fill());
    for (const r of required) sequence.splice(rng.int(0, sequence.length), 0, byId[r]);
    for (const tpl of sequence) {
      const rows = normalize(tpl);
      const socks = orderSockets(rng, canvas, g, start);
      let placed = null;
      for (const s of socks) { placed = tryAttach(rng, canvas, tpl, rows, s); if (placed) break; }
      if (!placed) { const alt = byId[rng.pick(g.fill)]; const altRows = normalize(alt); for (const s of socks) { placed = tryAttach(rng, canvas, alt, altRows, s); if (placed) break; } }
      if (!placed) { ok = false; break; }
    }
    if (!ok) continue;
    if (g.side) {
      for (const id of g.side) {
        const tpl = byId[id];
        const rows = normalize(tpl);
        const socks = canvas.sockets.filter((s) => s.dir === 'n' || s.dir === 's');
        rng.shuffle(socks);
        let placed = false;
        for (const s of socks) if (tryAttach(rng, canvas, tpl, rows, s)) { placed = true; break; }
        if (!placed) ok = false;
      }
      if (!ok) continue;
    }
    // The end room goes on the socket farthest from the start, walking room links.
    const endTpl = byId[endId];
    const endRows = normalize(endTpl);
    const socks = farthestSockets(canvas, g);
    let endRoom = null;
    for (const s of socks) { endRoom = tryAttach(rng, canvas, endTpl, endRows, s); if (endRoom) break; }
    if (!endRoom) continue;
    return finish(canvas, zone, start, endRoom);
  }
  throw new Error(`zonegen: no layout for ${zone.id} floor ${floor}`);
}

function orderSockets(rng, canvas, g, start) {
  const socks = [...canvas.sockets];
  rng.shuffle(socks);
  if (g.axis === 'x') {
    // Walk east: the +X sockets of the latest rooms first.
    socks.sort((a, b) => (b.dir === 'e' ? b.x + 1000 : b.x * 0.1) - (a.dir === 'e' ? a.x + 1000 : a.x * 0.1));
  } else {
    socks.sort((a, b) => b.room - a.room + rng.range(-3, 3));
  }
  return socks;
}

function farthestSockets(canvas, g) {
  const depth = new Map([[0, 0]]);
  for (const l of canvas.links) depth.set(l.b, (depth.get(l.a) ?? 0) + 1);
  const socks = [...canvas.sockets];
  if (g.axis === 'x') socks.sort((a, b) => (b.dir === 'e' ? b.x + 1000 : b.x * 0.1) - (a.dir === 'e' ? a.x + 1000 : a.x * 0.1));
  else socks.sort((a, b) => (depth.get(b.room) ?? 0) - (depth.get(a.room) ?? 0));
  return socks;
}

function finish(canvas, zone, startRoom, endRoom) {
  // Bounds, with a margin of void.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of canvas.cells.keys()) {
    const x = Math.floor(k / 8192) - 4096, y = (k % 8192) - 4096;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const pad = 2;
  const W = maxX - minX + 1 + pad * 2, H = maxY - minY + 1 + pad * 2;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) {
      const ch = canvas.get(x + minX - pad, y + minY - pad);
      r += ch === undefined ? ' ' : ch === 'D' ? (zone.gen.axis === 'x' ? '~' : '#') : ch;
    }
    rows.push(r);
  }
  const rooms = canvas.rooms.map((rm) => ({ ...rm, x: rm.x - minX + pad, y: rm.y - minY + pad, cx: rm.x - minX + pad + rm.w / 2, cz: rm.y - minY + pad + rm.h / 2, tplId: rm.id }));
  const links = canvas.links.map((l) => ({ ...l, x: l.x - minX + pad, y: l.y - minY + pad }));
  return { rows, w: W, h: H, rooms, links, start: rooms[startRoom.index], end: rooms[endRoom.index] };
}

export function layoutAuthored(tpl) {
  const rows = normalize(tpl);
  return { rows, w: rows[0].length, h: rows.length, rooms: [{ index: 0, id: tpl.id, tplId: tpl.id, x: 0, y: 0, w: rows[0].length, h: rows.length, cx: rows[0].length / 2, cz: rows.length / 2, tpl }], links: [], start: null, end: null };
}

/**
 * Read the markers out of a laid-out map. Returns the grid, nav and lists of what goes where.
 * Pure data: every client gets the same result from the same seed.
 */
export function scanLayout(layout, zone, rng) {
  const out = { lights: [], spawns: [], breakables: [], traps: [], shrines: [], chests: [], named: [], entrances: [], pillars: [] };
  const rows = layout.rows.map((r) => r.split(''));
  const bp = zone.breakables ?? ['urn'];
  const roomOf = (x, y) => layout.rooms.find((rm) => x >= rm.x && x < rm.x + rm.w && y >= rm.y && y < rm.y + rm.h) ?? null;
  const namedIdx = new Map();
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[0].length; x++) {
      const ch = rows[y][x];
      const room = roomOf(x, y);
      const at = { x: x + 0.5, z: y + 0.5, room: room?.index ?? -1 };
      switch (ch) {
        case 'L': out.lights.push(at); rows[y][x] = '.'; break;
        case 'S': out.spawns.push({ ...at, kind: 'S' }); rows[y][x] = '.'; break;
        case 'E': out.spawns.push({ ...at, kind: 'E' }); rows[y][x] = '.'; break;
        case 'B': out.breakables.push({ ...at, type: rng.pick(bp) }); rows[y][x] = '.'; break;
        case 'T': out.traps.push(at); rows[y][x] = '.'; break;
        case 'A': out.shrines.push(at); rows[y][x] = '.'; break;
        case 'C': out.chests.push(at); rows[y][x] = '.'; break;
        case 'X': out.entrances.push(at); rows[y][x] = '.'; break;
        case 'P': out.pillars.push(at); break;
        case 'N': {
          const n = namedIdx.get(room?.index) ?? 0;
          namedIdx.set(room?.index, n + 1);
          const name = room?.tpl?.named?.[n] ?? 'nothing';
          out.named.push({ ...at, name });
          rows[y][x] = '.';
          break;
        }
        default: break;
      }
    }
  }
  const finalRows = rows.map((r) => r.join(''));
  const nav = NavGrid.fromRows(finalRows, { blocked: '#~P ', cell: 1, origin: [0, 0, 0] });
  return { ...out, finalRows, nav };
}

export { OUT, ZONES };
