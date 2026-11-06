// Paints the map text into rows of characters, and answers questions about them.
import { MAP_TEXT } from '../data/levels/maps.js';

export function paintMaps(text = MAP_TEXT) {
  const maps = {};
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    for (const cmd of line.split(' | ')) {
      const p = cmd.trim().split(/\s+/);
      if (p[0] === 'map') {
        cur = { name: p[1], w: +p[2], h: +p[3], cells: Array.from({ length: +p[3] }, () => Array(+p[2]).fill(p[4])) };
        maps[p[1]] = cur;
      } else if (p[0] === 'R') {
        const [x0, y0, x1, y1] = p.slice(1, 5).map(Number);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (cur.cells[y]) cur.cells[y][x] = p[5];
      } else if (p[0] === 'B') {
        const [x0, y0, x1, y1] = p.slice(1, 5).map(Number);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cur.cells[y][x] = (x === x0 || x === x1 || y === y0 || y === y1) ? p[5] : p[6];
      } else if (p[0] === 'P') {
        cur.cells[+p[2]][+p[1]] = p[3];
      } else throw new Error(`bad map command: ${cmd}`);
    }
  }
  for (const m of Object.values(maps)) {
    m.rows = m.cells.map((r) => r.join(''));
    delete m.cells;
  }
  return maps;
}

export const MAPS = paintMaps();
export const BLOCKED = '#T~HBSG';
export const FLOOR_CHARS = '.,=:_%cr';
export const MARKERS = 'a12345mty$pndwukzosqvhl';

export class MapInfo {
  constructor(name) {
    const m = MAPS[name];
    this.name = name; this.w = m.w; this.h = m.h; this.rows = m.rows;
    this.ox = -m.w / 2; this.oz = -m.h / 2;
  }
  ch(c, r) { return (r >= 0 && r < this.h && c >= 0 && c < this.w) ? this.rows[r][c] : '#'; }
  /** World x, z of a cell's centre. Fractions are welcome: col 41.5 is the seam between 41 and 42. */
  x(c) { return c + 0.5 + this.ox; }
  z(r) { return r + 0.5 + this.oz; }
  col(x) { return Math.floor(x - this.ox); }
  row(z) { return Math.floor(z - this.oz); }
  at(x, z) { return this.ch(this.col(x), this.row(z)); }
  find(ch) {
    const out = [];
    for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) if (this.rows[r][c] === ch) out.push([c, r]);
    return out;
  }
  /** Groups of touching cells of one character: one door, one gate. Each is { cells, c0, r0, c1, r1 }. */
  groups(ch) {
    const seen = new Set(); const out = [];
    for (const [c, r] of this.find(ch)) {
      const key = `${c},${r}`;
      if (seen.has(key)) continue;
      const cells = []; const stack = [[c, r]];
      seen.add(key);
      while (stack.length) {
        const [a, b] = stack.pop();
        cells.push([a, b]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${a + dx},${b + dy}`;
          if (!seen.has(k) && this.ch(a + dx, b + dy) === ch) { seen.add(k); stack.push([a + dx, b + dy]); }
        }
      }
      const cs = cells.map((v) => v[0]); const rs = cells.map((v) => v[1]);
      out.push({ cells, c0: Math.min(...cs), r0: Math.min(...rs), c1: Math.max(...cs), r1: Math.max(...rs) });
    }
    return out;
  }
  /** Greedy rectangles over cells where test(ch) holds. */
  rects(test) {
    const used = Array.from({ length: this.h }, () => new Uint8Array(this.w));
    const out = [];
    for (let r = 0; r < this.h; r++) {
      for (let c = 0; c < this.w; c++) {
        if (used[r][c] || !test(this.rows[r][c], c, r)) continue;
        let w = 1;
        while (c + w < this.w && !used[r][c + w] && test(this.rows[r][c + w], c + w, r)) w++;
        let h = 1;
        outer: while (r + h < this.h) {
          for (let i = 0; i < w; i++) if (used[r + h][c + i] || !test(this.rows[r + h][c + i], c + i, r + h)) break outer;
          h++;
        }
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) used[r + y][c + x] = 1;
        out.push({ c0: c, r0: r, c1: c + w - 1, r1: r + h - 1 });
      }
    }
    return out;
  }
}

/** The floor character under a marker or door: the most common floor around it. */
export function floorUnder(info, c, r, fallback = '.') {
  const ch = info.ch(c, r);
  if (FLOOR_CHARS.includes(ch)) return ch;
  const counts = {};
  for (let d = 1; d <= 3; d++) {
    for (let y = -d; y <= d; y++) {
      for (let x = -d; x <= d; x++) {
        const n = info.ch(c + x, r + y);
        if (FLOOR_CHARS.includes(n) && n !== 'c') counts[n] = (counts[n] ?? 0) + 1;
      }
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (best) return best[0];
  }
  return fallback;
}

/** Every cell reachable from `a` with doors, windows, ladders, gates, shutters and crates counted open. */
export function reachable(info, start) {
  const closed = '#T~H';
  const seen = new Set();
  const q = [start];
  seen.add(`${start[0]},${start[1]}`);
  while (q.length) {
    const [c, r] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = info.ch(c + dx, r + dy);
      if (closed.includes(n)) continue;
      const k = `${c + dx},${r + dy}`;
      if (!seen.has(k)) { seen.add(k); q.push([c + dx, r + dy]); }
    }
  }
  return seen;
}
