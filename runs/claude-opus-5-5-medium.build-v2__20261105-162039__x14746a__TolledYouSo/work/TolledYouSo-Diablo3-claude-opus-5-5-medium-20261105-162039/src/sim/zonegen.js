// Stitches ASCII rooms into a map from a seed. Same code on every client: a pure function of (seed, zone id).
import { NavGrid } from '../../pixel-engine.js';
import { BIOMES, BOSS_ROOMS, TOWN, YARD } from '../data/rooms.js';
import { ZONES } from '../data/zones.js';

const OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };
const sockets = (t) => {
  const out = [];
  const H = t.rows.length; const W = t.rows[0].length;
  t.rows.forEach((r, y) => { if (r.length !== W) throw new Error(`room ${t.name} row ${y} is ${r.length}, wanted ${W}`); });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (t.rows[y][x] !== 'D') continue;
    out.push({ x, y, side: y === 0 ? 'N' : y === H - 1 ? 'S' : x === 0 ? 'W' : 'E' });
  }
  return out;
};

function layoutRooms(rng, spec, biome) {
  const pool = biome.rooms;
  const placed = [];
  const overlaps = (x, y, w, h) => placed.some((p) => x < p.x + p.w && p.x < x + w && y < p.y + p.h && p.y < y + h);
  const place = (t, x, y, depth, parent) => { const r = { t, x, y, w: t.rows[0].length, h: t.rows.length, depth, parent, used: new Set(), name: t.name }; placed.push(r); return r; };
  place(biome.entrance, 0, 0, 0, null);
  const attach = (t, preferDeep, branch = false) => {
    const opens = [];
    for (const p of placed) for (const s of sockets(p.t)) if (!p.used.has(`${s.x},${s.y}`)) opens.push({ p, s });
    rng.shuffle(opens);
    if (preferDeep) opens.sort((a, b) => b.p.depth - a.p.depth);
    if (spec.linear && !branch) opens.sort((a, b) => (b.s.side === 'E' ? 1 : 0) - (a.s.side === 'E' ? 1 : 0) || (b.p.x + b.s.x) - (a.p.x + a.s.x));
    for (const { p, s } of opens) {
      const tsocks = sockets(t).filter((q) => q.side === OPP[s.side]);
      rng.shuffle(tsocks);
      for (const q of tsocks) {
        const dx = s.side === 'E' ? 1 : s.side === 'W' ? -1 : 0;
        const dy = s.side === 'S' ? 1 : s.side === 'N' ? -1 : 0;
        const x = p.x + s.x + dx - q.x;
        const y = p.y + s.y + dy - q.y;
        if (overlaps(x, y, t.rows[0].length, t.rows.length)) continue;
        p.used.add(`${s.x},${s.y}`);
        const r = place(t, x, y, p.depth + 1, p);
        r.used.add(`${q.x},${q.y}`); r.door = { x: x + q.x, y: y + q.y }; r.doorP = { x: p.x + s.x, y: p.y + s.y };
        return r;
      }
    }
    return null;
  };
  const special = (spec.include ?? []).map((k) => biome.special?.[k]).filter(Boolean);
  const count = spec.rooms - 2;
  const midAt = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    if (special.length && i === midAt) { for (const t of special) if (!attach(t, spec.linear)) return null; }
    const shuffled = rng.shuffle([...pool]);
    let ok = null;
    for (const t of shuffled) { ok = attach(t, !spec.linear && i % 3 !== 2, spec.linear && i % 3 === 2); if (ok) break; }
    if (!ok) return null;
  }
  return attach(biome.exit, true) ? placed : null;
}

const mixBiome = () => ({
  rooms: [...BIOMES.crypt.rooms, ...BIOMES.cloister.rooms, ...BIOMES.belfry.rooms],
  entrance: BIOMES.crypt.entrance,
  exit: BIOMES.belfry.exit,
});

const blank = () => ({ lights: [], spawns: [], breakables: [], chests: [], traps: [], shrines: [], named: [], gates: [], marks: [] });
function readMarker(z, ch, x, y, namedList, room) {
  const at = { x: x + 0.5, z: y + 0.5, room };
  switch (ch) {
    case 'L': z.lights.push(at); break;
    case 'S': z.spawns.push({ ...at, kind: 'S' }); break;
    case 'E': z.spawns.push({ ...at, kind: 'E' }); break;
    case 'B': z.breakables.push(at); break;
    case 'C': z.chests.push(at); break;
    case 'T': z.traps.push(at); break;
    case 'A': z.shrines.push(at); break;
    case 'G': z.gates.push(at); break;
    case 'X': z.marks.push({ ...at, kind: 'X' }); break;
    case 'Y': z.marks.push({ ...at, kind: 'Y' }); break;
    case 'N': { const id = namedList?.[namedList.cursor++ % namedList.length]; if (id) z.named.push({ ...at, id }); break; }
    default: if (/[a-zA-Z]/.test(ch)) z.marks.push({ ...at, kind: ch });
  }
}

function fromAuthored(spec, def) {
  const z = blank();
  const list = def.named ? [...def.named] : null; if (list) list.cursor = 0;
  const rows = def.rows.map((r, y) => [...r].map((c, x) => { if (c !== '#' && c !== '.' && c !== '~') { readMarker(z, c, x, y, list, 0); return '.'; } return c; }).join(''));
  z.rows = rows; z.w = rows[0].length; z.h = rows.length; z.roomRects = [{ x: 0, y: 0, w: z.w, h: z.h, name: spec.id, depth: 0 }];
  return z;
}

function arenaRows(kind) {
  const def = BOSS_ROOMS[kind] ?? { w: 31, h: 31 };
  const { w, h } = def; const rows = [];
  const z = blank();
  const cx = w / 2; const cy = h / 2;
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (kind === 'malison' || kind === 'title') {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const R = Math.min(w, h) / 2 - 1;
        r += d >= R + 1 ? ' ' : d >= R ? '#' : '.';
      } else r += edge ? '#' : '.';
    }
    rows.push(r);
  }
  z.rows = rows; z.w = w; z.h = h; z.roomRects = [{ x: 0, y: 0, w, h, name: kind, depth: 0 }];
  z.marks.push({ x: cx, z: h - 4.5, kind: 'X', room: 0 });
  if (kind === 'countinghouse') {
    for (const [x, y] of [[5, 5], [w - 6, 5], [5, h - 6], [w - 6, h - 6], [cx, 4], [cx, h - 3]]) z.lights.push({ x: x + 0.5, z: y + 0.5, room: 0 });
    for (const [x, y, id] of [[8, 8, 'gold-pile'], [w - 9, 8, 'gold-pile'], [8, h - 9, 'gold-pile'], [w - 9, h - 9, 'gold-pile'], [5, cy, 'desk'], [w - 6, cy, 'desk'], [cx - 7, 3, 'strongbox'], [cx + 7, 3, 'strongbox']]) z.named.push({ x: x + 0.5, z: y + 0.5, id, room: 0 });
  }
  if (kind === 'malison') {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; z.lights.push({ x: cx + Math.cos(a) * 16, z: cy + Math.sin(a) * 16, room: 0 }); }
  }
  return z;
}

function fromRooms(rng, spec) {
  const biome = spec.biome === 'mix' ? mixBiome() : BIOMES[spec.biome];
  let placed = null;
  for (let attempt = 0; attempt < 40 && !placed; attempt++) placed = layoutRooms(rng.fork(`try:${attempt}`), spec, biome);
  if (!placed) throw new Error(`zonegen failed for ${spec.id}`);
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const p of placed) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h); }
  const pad = 3;
  const w = maxX - minX + pad * 2; const h = maxY - minY + pad * 2;
  const g = Array.from({ length: h }, () => new Array(w).fill(' '));
  const z = blank();
  z.roomRects = [];
  placed.forEach((p, i) => {
    const ox = p.x - minX + pad; const oy = p.y - minY + pad;
    p.ox = ox; p.oy = oy;
    z.roomRects.push({ x: ox, y: oy, w: p.w, h: p.h, name: p.name, depth: p.depth, parent: p.parent ? placed.indexOf(p.parent) : -1, door: p.door ? { col: p.door.x - minX + pad, row: p.door.y - minY + pad } : null });
    const list = p.t.named ? [...p.t.named] : null; if (list) list.cursor = 0;
    p.t.rows.forEach((row, y) => [...row].forEach((c, x) => {
      const gx = ox + x; const gy = oy + y;
      let out = c;
      if (c === 'D') out = p.used.has(`${x},${y}`) ? '.' : '#';
      else if (c !== '#' && c !== '.' && c !== '~') {
        // X is only meaningful in the first and last rooms; Y is the special event spot.
        readMarker(z, c, gx, gy, list, i);
        out = '.';
      }
      g[gy][gx] = out;
    }));
  });
  // Doors are three cells wide wherever both rooms have floor behind them: hordes and the camera both like it.
  placed.forEach((p, i) => {
    if (!p.door) return;
    const ax = p.door.x - minX + pad; const ay = p.door.y - minY + pad; const bx = p.doorP.x - minX + pad; const by = p.doorP.y - minY + pad;
    const dx = ax - bx; const dy = ay - by; const cells = [{ col: ax, row: ay }];
    for (const o of [-1, 1]) {
      const px = dy !== 0 ? o : 0; const py = dx !== 0 ? o : 0;
      const a = [ax + px, ay + py]; const b = [bx + px, by + py];
      const inA = g[a[1] + dy]?.[a[0] + dx]; const inB = g[b[1] - dy]?.[b[0] - dx];
      if (inA === '.' && inB === '.' && g[a[1]][a[0]] === '#' && g[b[1]][b[0]] === '#') { g[a[1]][a[0]] = '.'; g[b[1]][b[0]] = '.'; cells.push({ col: a[0], row: a[1] }); }
    }
    z.roomRects[i].door.cells = cells;
  });
  z.rows = g.map((r) => r.join('')); z.w = w; z.h = h;
  return z;
}

export function generateZone(rootRng, zoneId) {
  const spec = ZONES[zoneId];
  const rng = rootRng.fork(`zone:${zoneId}`);
  let z;
  if (spec.kind === 'authored') z = fromAuthored(spec, spec.id === 'yard' ? YARD : TOWN);
  else if (spec.kind === 'arena') z = arenaRows(spec.arena);
  else z = fromRooms(rng, spec);
  z.id = zoneId; z.spec = spec;
  z.nav = NavGrid.fromRows(z.rows, { blocked: '#~ ', origin: [0, 0, 0] });
  const xs = z.marks.filter((m) => m.kind === 'X');
  z.entrance = xs[0] ?? { x: z.w / 2, z: z.h / 2 };
  z.exit = xs.length > 1 ? xs[xs.length - 1] : xs[0];
  // Tollhaven: you arrive in the square by the Crier, not on top of a gate.
  if (zoneId === 'town') { const c = z.marks.find((m) => m.kind === 'c'); z.entrance = { x: c.x - 4, z: c.z + 4 }; }
  return z;
}
export const zoneHash = (z) => { let h = 7; for (const r of z.rows) for (let i = 0; i < r.length; i++) h = (h * 31 + r.charCodeAt(i)) | 0; return h; };
