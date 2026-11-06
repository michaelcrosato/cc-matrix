// Painter commands -> rows of characters. Same rows drive geometry, colliders, nav and the Map screen.
import { MAP_SOURCE } from '../data/levels/maps.js';

export function parseMaps(src = MAP_SOURCE) {
  const maps = {};
  let cur = null;
  for (const line of src.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('map ')) {
      const [, name, w, h, fill] = line.trim().split(/\s+/);
      cur = { name, W: +w, H: +h, grid: Array.from({ length: +h }, () => Array(+w).fill(fill)) };
      maps[name] = cur;
      continue;
    }
    for (const cmd of line.split(' | ')) {
      const t = cmd.trim().split(/\s+/);
      const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < cur.W && y < cur.H) cur.grid[y][x] = c; };
      if (t[0] === 'R') { const [, x0, y0, x1, y1, c] = t; for (let y = +y0; y <= +y1; y++) for (let x = +x0; x <= +x1; x++) set(x, y, c); }
      else if (t[0] === 'B') {
        const [, x0, y0, x1, y1, wall, floor] = t;
        for (let y = +y0; y <= +y1; y++) for (let x = +x0; x <= +x1; x++) set(x, y, (x === +x0 || x === +x1 || y === +y0 || y === +y1) ? wall : floor);
      } else if (t[0] === 'P') { const [, x, y, c] = t; set(+x, +y, c); }
      else throw new Error('bad map command: ' + cmd);
    }
  }
  for (const m of Object.values(maps)) m.rows = m.grid.map((r) => r.join(''));
  return maps;
}
export const MAPS = parseMaps();
export const BLOCKED = '#T~HBSG';
export const MARKERS = 'a12345mtyu$pndwuk zosqvhl'.replace(' ', '');
/** Find all cells of a marker char: [{x,z,col,row}] in world metres. */
export function findCells(map, ch) {
  const out = [];
  for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) if (map.rows[r][c] === ch) out.push({ col: c, row: r, x: c + 0.5 - map.W / 2, z: r + 0.5 - map.H / 2 });
  return out;
}
export const cellToWorld = (map, col, row) => [col + 0.5 - map.W / 2, row + 0.5 - map.H / 2];
export const worldToCell = (map, x, z) => [Math.floor(x + map.W / 2), Math.floor(z + map.H / 2)];

/** Reachability from `a`: every open (non-blocked) cell must be reached. Doors, windows, ladders count as open. */
export function reachability(map, start = 'a') {
  const s = findCells(map, start)[0];
  if (!s) return { ok: false, unreachable: [], reason: 'no start' };
  const seen = new Set(); const q = [[s.col, s.row]]; seen.add(s.row * map.W + s.col);
  const open = (c, r) => c >= 0 && r >= 0 && c < map.W && r < map.H && !BLOCKED.includes(map.rows[r][c]) || (c >= 0 && r >= 0 && c < map.W && r < map.H && 'SGB'.includes(map.rows[r][c]));
  while (q.length) { const [c, r] = q.pop(); for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (open(nc, nr) && !seen.has(nr * map.W + nc)) { seen.add(nr * map.W + nc); q.push([nc, nr]); } } }
  const un = [];
  for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) { const ch = map.rows[r][c]; if (!BLOCKED.includes(ch) && !seen.has(r * map.W + c)) un.push([c, r, ch]); }
  return { ok: un.length === 0, unreachable: un };
}
