// Paint rows of characters from map commands. One source for geometry, colliders, nav and the Map tab.
import { MAP_SOURCE } from '../data/levels/maps.js';
export function paintMaps(src = MAP_SOURCE) {
  const maps = {}; let cur = null;
  const R = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (cur.rows[y] && x >= 0 && x < cur.w) cur.rows[y][x] = c; };
  for (const raw of src.split('\n')) {
    const line = raw.trim(); if (!line) continue;
    if (line.startsWith('map ')) {
      const [, name, W, H, fill] = line.split(/\s+/);
      cur = maps[name] = { name, w: +W, h: +H, rows: Array.from({ length: +H }, () => Array(+W).fill(fill)) };
      continue;
    }
    for (const cmd of line.split(' | ')) {
      const p = cmd.trim().split(/\s+/);
      if (p[0] === 'R') R(+p[1], +p[2], +p[3], +p[4], p[5]);
      else if (p[0] === 'P') R(+p[1], +p[2], +p[1], +p[2], p[3]);
      else if (p[0] === 'B') { R(+p[1], +p[2], +p[3], +p[4], p[5]); R(+p[1] + 1, +p[2] + 1, +p[3] - 1, +p[4] - 1, p[6]); }
    }
  }
  for (const k in maps) maps[k].rows = maps[k].rows.map((r) => r.join(''));
  return maps;
}
export const MAPS = paintMaps();
export const MARKERS = 'a12345mtyu$pndwkzoqsvhl';
export const BLOCKED = '#T~HBSG';
/** Everything of one char: [{col,row}]. */
export function findCells(map, chars) {
  const out = [];
  map.rows.forEach((r, row) => { for (let col = 0; col < r.length; col++) if (chars.includes(r[col])) out.push({ col, row, c: r[col] }); });
  return out;
}
export const worldX = (map, col) => col + 0.5 - map.w / 2;
export const worldZ = (map, row) => row + 0.5 - map.h / 2;
export const colOf = (map, x) => Math.floor(x + map.w / 2);
export const rowOf = (map, z) => Math.floor(z + map.h / 2);
export function reachable(map, open = (c) => !BLOCKED.includes(c)) {
  const a = findCells(map, 'a')[0]; const seen = new Set(); if (!a) return { ok: false, missing: ['no start'] };
  const q = [[a.col, a.row]]; seen.add(a.col + ',' + a.row);
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = map.rows[y + dy]?.[x + dx]; const k = (x + dx) + ',' + (y + dy); if (c && open(c) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  const missing = [];
  map.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (open(r[x]) && !seen.has(x + ',' + y)) missing.push(x + ',' + y); });
  return { ok: missing.length === 0, missing };
}
