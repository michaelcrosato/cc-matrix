// A track: placements on a 32 x 32 x 16 grid of 32 m cells and 8 m levels, the links between their ports, the route from
// Start to Finish, the turtle compiler for shipped tracks, and the share-code format.
import { BLOCKS, CELL, LEVEL, HEAD, localFrame, DECO } from './blocks.js';
import { add, scale } from './v3.js';

export const GRID = 32, LEVELS = 16, ORIGIN = 1536;   // metres: the grid's north-west corner in the world
const key = (cx, cy, L) => cx + ',' + cy + ',' + L;
const pkey = (cx, cy, L, h) => cx + ',' + cy + ',' + L + ',' + h;

export class Track {
  constructor(o = {}) {
    this.env = o.env || 'dustbowl'; this.name = o.name || 'UNTITLED'; this.id = o.id || null;
    this.blocks = []; this.occ = new Map(); this.nextId = 1; this.chasmExtra = o.chasms || []; this.deco = []; this.gapKind = o.gapKind || 'canyon'; this.canyonGaps = !!o.canyonGaps;
    this.version = 0;
    for (const b of o.blocks || []) this.place(b[0], b[1], b[2], b[3], b[4], true);
    for (const d of o.deco || []) this.deco.push({ kind: d[0], cx: d[1], cy: d[2] });
  }
  /** the world cells (cx, cy, L) a placement fills */
  cellsOf(type, cx, cy, L, rot) {
    const B = BLOCKS[type], H = HEAD[rot], R = HEAD[(rot + 1) % 4];
    if (!B) return [];
    return B.cells.map(([a, b, dl]) => [cx + a * H[0] + b * R[0], cy + a * H[1] + b * R[1], L + dl]);
  }
  /** why a placement can't go there ('' if it can) */
  check(type, cx, cy, L, rot, ignoreId = null) {
    const B = BLOCKS[type]; if (!B) return 'UNKNOWN BLOCK';
    if (type === 'ST' && this.blocks.some(b => b.type === 'ST' && b.id !== ignoreId)) return 'ONLY ONE START';
    for (const [x, y, l] of this.cellsOf(type, cx, cy, L, rot)) {
      if (x < 0 || y < 0 || x >= GRID || y >= GRID || l < 0 || l >= LEVELS) return 'OUTSIDE THE GRID';
      const o = this.occ.get(key(x, y, l)); if (o && o !== ignoreId) return 'SPACE TAKEN';
    }
    if (this.deco.some(d => this.cellsOf(type, cx, cy, L, rot).some(([x, y]) => x === d.cx && y === d.cy))) return 'SCENERY IN THE WAY';
    return '';
  }
  place(type, cx, cy, L, rot, force = false) {
    if (!force && this.check(type, cx, cy, L, rot)) return null;
    const b = { id: this.nextId++, type, cx, cy, L, rot };
    this.blocks.push(b);
    for (const [x, y, l] of this.cellsOf(type, cx, cy, L, rot)) this.occ.set(key(x, y, l), b.id);
    this.version++; this._links = null;
    return b;
  }
  remove(id) {
    const i = this.blocks.findIndex(b => b.id === id); if (i < 0) return null;
    const b = this.blocks[i]; this.blocks.splice(i, 1);
    for (const [x, y, l] of this.cellsOf(b.type, b.cx, b.cy, b.L, b.rot)) if (this.occ.get(key(x, y, l)) === b.id) this.occ.delete(key(x, y, l));
    this.version++; this._links = null;
    return b;
  }
  at(cx, cy, L) { const id = this.occ.get(key(cx, cy, L)); return id ? this.blocks.find(b => b.id === id) : null; }
  get(id) { return this.blocks.find(b => b.id === id) || null; }
  /** ports: forward in/out and (reversible blocks) reverse in/out, as { cell: [cx, cy], L, h } */
  ports(b) {
    const B = BLOCKS[b.type], H = HEAD[b.rot], R = HEAD[(b.rot + 1) % 4];
    const inP = { cx: b.cx, cy: b.cy, L: b.L + B.inDl, h: b.rot };
    if (!B.exit) return { in: inP, out: null };
    const e = B.exit, ho = (b.rot + e.turn + 4) % 4;
    const out = { cx: b.cx + e.a * H[0] + e.b * R[0], cy: b.cy + e.a * H[1] + e.b * R[1], L: b.L + e.dl, h: ho };
    return { in: inP, out };
  }
  /** link tables: a map from an entering port key to the traversals that start there */
  links() {
    if (this._links) return this._links;
    const M = new Map(), put = (k, v) => { if (!M.has(k)) M.set(k, []); M.get(k).push(v); };
    for (const b of this.blocks) {
      const B = BLOCKS[b.type]; if (!B.path) continue;
      if (B.cross) { for (let h = 0; h < 4; h++) put(pkey(b.cx, b.cy, b.L, h), { b, rev: false, rot: h }); continue; }
      const P = this.ports(b);
      put(pkey(P.in.cx, P.in.cy, P.in.L, P.in.h), { b, rev: false, rot: b.rot });
      if (B.rev && P.out) {   // driven backwards: enter from the exit's side, into the block's last cell
        const Ho = HEAD[P.out.h];
        put(pkey(P.out.cx - Ho[0], P.out.cy - Ho[1], P.out.L, (P.out.h + 2) % 4), { b, rev: true, rot: b.rot });
      }
    }
    return (this._links = M);
  }
  /** where a traversal leaves: the next port (cell it enters, level, heading), or null (a kicker: in the air) */
  outOf(t) {
    const B = BLOCKS[t.b.type];
    if (B.cross) { const H = HEAD[t.rot]; return { cx: t.b.cx + H[0], cy: t.b.cy + H[1], L: t.b.L, h: t.rot }; }
    const P = this.ports(t.b);
    if (!t.rev) return P.out;
    const Hi = HEAD[P.in.h]; return { cx: P.in.cx - Hi[0], cy: P.in.cy - Hi[1], L: P.in.L, h: (P.in.h + 2) % 4 };
  }
  /** a kicker's landing: the first block within 5 cells ahead, on its level or up to 3 lower, entered facing away */
  jumpFrom(b) {
    const H = HEAD[b.rot], M = this.links();
    for (let d = 1; d <= 6; d++) for (let dl = 0; dl >= -3; dl--) {
      const list = M.get(pkey(b.cx + H[0] * d, b.cy + H[1] * d, b.L + dl, b.rot));
      if (list) { const t = list.find(t => !BLOCKS[t.b.type].gap); if (t) return { t, cells: d - 1 }; }
    }
    return null;
  }
  /** the route from Start: [{ b, rev, rot, jump }] and ok (reaches Finish) or error */
  route() {
    const st = this.blocks.find(b => b.type === 'ST');
    if (!st) return { ok: false, error: 'NO START', list: [] };
    const list = [{ b: st, rev: false, rot: st.rot }], M = this.links(), seen = new Map();
    let cur = list[0];
    for (let guard = 0; guard < 400; guard++) {
      if (cur.b.type === 'FN') return { ok: true, list };
      let next = null;
      if (cur.b.type === 'KI') { const j = this.jumpFrom(cur.b); if (j) next = Object.assign({}, j.t, { jump: j.cells }); }
      else {
        const o = this.outOf(cur);
        if (o) { const c = M.get(pkey(o.cx, o.cy, o.L, o.h)); if (c) next = c.find(t => !t.rev) || c[0]; }
      }
      if (!next) { const B = cur.b; return { ok: false, error: 'ROUTE BROKEN AFTER ' + BLOCKS[B.type].name, at: B, list }; }
      const k = next.b.id + ':' + next.rot + ':' + next.rev, n = (seen.get(k) || 0) + 1; seen.set(k, n);
      if (n > 1 && !BLOCKS[next.b.type].cross) return { ok: false, error: 'ROUTE GOES IN CIRCLES', at: next.b, list };
      if (n > 2) return { ok: false, error: 'ROUTE GOES IN CIRCLES', at: next.b, list };
      list.push(next); cur = next;
    }
    return { ok: false, error: 'ROUTE TOO LONG', list };
  }
  /** the world frame of a traversal at s along it: { p, t, u, r } in world metres */
  frame(t, s) {
    const B = BLOCKS[t.b.type], L = B.path.len, rev = t.rev;
    const lf = localFrame(B, rev ? L - s : s);
    const rot = t.rot, cx = t.b.cx, cy = t.b.cy;
    return toWorld(lf, rot, cx, cy, t.b.L, rev);
  }
  /** chasm cells: { 'cx,cy': 'canyon' | 'water' } from level-0 gaps and the track's own list */
  chasms() {
    const out = {};
    for (const b of this.blocks) if (BLOCKS[b.type].gap && (b.L === 0 || this.canyonGaps)) for (const [x, y, l] of this.cellsOf(b.type, b.cx, b.cy, b.L, b.rot)) if (l === b.L) out[x + ',' + y] = b.L === 0 ? this.gapKind : 'canyon';
    for (const c of this.chasmExtra) out[c[0] + ',' + c[1]] = c[2] || 'canyon';
    return out;
  }
  bounds() {
    let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
    for (const b of this.blocks) for (const [x, y] of this.cellsOf(b.type, b.cx, b.cy, b.L, b.rot)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  }
  cost() { let c = 0; for (const b of this.blocks) c += BLOCKS[b.type].cost; for (const d of this.deco) c += (DECO[d.kind] || {}).cost || 0; return c; }
  toJSON() { return { env: this.env, name: this.name, gapKind: this.gapKind, canyonGaps: this.canyonGaps, blocks: this.blocks.map(b => [b.type, b.cx, b.cy, b.L, b.rot]), chasms: this.chasmExtra, deco: this.deco.map(d => [d.kind, d.cx, d.cy]) }; }
  clone() { const t = new Track(this.toJSON()); t.id = this.id; return t; }
}

/** a local block frame to the world: rot turns local +x to the heading, the entry sits on the west face of cell (cx, cy) */
export function toWorld(lf, rot, cx, cy, L, rev = false) {
  const H = HEAD[rot], R = HEAD[(rot + 1) % 4];
  const ex = ORIGIN + cx * CELL + 16 - H[0] * 16, ey = ORIGIN + cy * CELL + 16 - H[1] * 16, ez = L * LEVEL;
  const tw = v => [H[0] * v[0] + R[0] * v[1], H[1] * v[0] + R[1] * v[1], v[2]];
  const p = tw(lf.p); p[0] += ex; p[1] += ey; p[2] += ez;
  let t = tw(lf.t); const u = tw(lf.u); if (rev) t = scale(t, -1);
  const r = [u[1] * t[2] - u[2] * t[1], u[2] * t[0] - u[0] * t[2], u[0] * t[1] - u[1] * t[0]];
  return { p, t, u, r };
}
export const cellCenter = (cx, cy) => [ORIGIN + cx * CELL + 16, ORIGIN + cy * CELL + 16];
export const worldToCell = (x, y) => [Math.floor((x - ORIGIN) / CELL), Math.floor((y - ORIGIN) / CELL)];

/** the turtle: a program (start cell, heading, tokens) to placements */
export function compileTurtle(prog) {
  const [sx, sy] = prog.start; let cx = sx, cy = sy, L = 0, h = prog.heading ?? 0;
  const t = new Track({ env: prog.env, name: prog.name, chasms: prog.chasms || [], gapKind: prog.gapKind, canyonGaps: prog.canyonGaps }); t.id = prog.id;
  const errs = [];
  const fwd = n => { cx += HEAD[h][0] * n; cy += HEAD[h][1] * n; };
  const put = type => { const e = t.check(type, cx, cy, L, h); if (e) errs.push(type + ' at ' + cx + ',' + cy + ',' + L + ': ' + e); else t.place(type, cx, cy, L, h); };
  for (const tok of prog.code.trim().split(/\s+/)) {
    let m;
    if ((m = /^(S|DS|IS)(\d*)$/.exec(tok))) { const n = +(m[2] || 1); for (let i = 0; i < n; i++) { put(m[1]); fwd(1); } }
    else if (['ST', 'CP', 'FN', 'BO', 'BU', 'KI'].includes(tok)) { put(tok); fwd(1); }
    else if (tok === 'CR') { const o = t.at(cx, cy, L); if (!(o && o.type === 'CR')) put('CR'); fwd(1); }
    else if ((m = /^(I|D|B)?([LR])(\d)$/.exec(tok))) {
      const n = +m[3], side = m[2] === 'R' ? 1 : -1; put(tok);
      const s = HEAD[(h + side + 4) % 4]; cx += HEAD[h][0] * (n - 1) + s[0] * n; cy += HEAD[h][1] * (n - 1) + s[1] * n; h = (h + side + 4) % 4;
    }
    else if ((m = /^([UD])([12])$/.exec(tok))) { const n = +m[2]; if (m[1] === 'U') { put(tok); fwd(n); L++; } else { L--; put(tok); fwd(n); } }
    else if (tok === 'LOOPR' || tok === 'LOOPL') { const side = tok === 'LOOPR' ? 1 : -1, s = HEAD[(h + side + 4) % 4]; put(tok); cx += HEAD[h][0] * 2 + s[0]; cy += HEAD[h][1] * 2 + s[1]; }
    else if ((m = /^GAP(\d)$/.exec(tok))) { put(tok); fwd(+m[1]); }
    else if ((m = /^DROP(\d)$/.exec(tok))) L -= +m[1];
    else if ((m = /^RISE(\d)$/.exec(tok))) L += +m[1];
    else if (tok === 'LA') { put('LA'); fwd(2); }
    else errs.push('unknown token ' + tok);
  }
  t.errors = errs;
  return t;
}

/** share codes: base64url of the track's JSON */
export function shareCode(track) {
  const j = JSON.stringify(track.toJSON()), b = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(j))) : Buffer.from(j, 'utf8').toString('base64');
  return 'CRK1.' + b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromShareCode(code) {
  try {
    const s = String(code).trim(); if (!s.startsWith('CRK1.')) return null;
    let b = s.slice(5).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    const j = typeof atob === 'function' ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, 'base64').toString('utf8');
    const o = JSON.parse(j); if (!o || !Array.isArray(o.blocks)) return null;
    const t = new Track({ env: o.env, name: o.name, gapKind: o.gapKind, canyonGaps: o.canyonGaps }); t.chasmExtra = o.chasms || [];
    for (const bl of o.blocks) if (BLOCKS[bl[0]] && !t.check(bl[0], bl[1], bl[2], bl[3], bl[4])) t.place(bl[0], bl[1], bl[2], bl[3], bl[4]);
    for (const d of o.deco || []) if (DECO[d[0]]) t.deco.push({ kind: d[0], cx: d[1], cy: d[2] });
    return t;
  } catch (e) { return null; }
}
