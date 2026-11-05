// CRACKMANIA track model (PLAN §4.1, §6.1): placements, 3D occupancy, links between block ends, jump links, the route
// from Start to Finish, the turtle compiler for the shipped tracks, serialize / share codes
import { TYPES, CELL, LEVEL, GRID, LEVELS, HEAD, GX, GY, cellWorld, endsOf, keyOf, frameAt } from './blocks.js';
import { dot, sub, add, mul, norm, dist, cross } from '../lib/v3.js';

const ck = (x, y, l) => x + ',' + y + ',' + l;

export class Track {
  constructor(o = {}) {
    this.id = o.id || 'custom'; this.name = o.name || 'NEW TRACK'; this.env = o.env || 'dustbowl';
    this.blocks = []; this.occ = new Map(); this.nextId = 1; this.chasms = new Map();   // chasm cells 'cx,cy' -> 'canyon' | 'water'
    this.nobuild = new Map();   // 'cx,cy' -> what stands there ('rock' 'hedge' 'pond' 'pine') (puzzles)
    this.version = 0;
    if (o.blocks) for (const b of o.blocks) this.place(b, { force: true });
    if (o.chasms) for (const [x, y, k] of o.chasms) this.chasms.set(x + ',' + y, k);
    if (o.nobuild) for (const [x, y, k] of o.nobuild) this.nobuild.set(x + ',' + y, k);
  }
  /** the cells a placement fills and reserves: [[cx, cy, L, kind]] */
  cellsOf(pl) {
    const T = TYPES[pl.type], out = [];
    for (const c of T.cells) out.push([...cellWorld(pl, c), 'solid']);
    for (const c of T.air) out.push([...cellWorld(pl, c), 'air']);
    return out;
  }
  /** why a placement can't go there, or null: 'grid' | 'overlap' | 'start' | 'nobuild' */
  check(pl, ignore) {
    const T = TYPES[pl.type]; if (!T) return 'type';
    for (const [x, y, l, kind] of this.cellsOf(pl)) {
      if (x < 0 || y < 0 || x >= GRID || y >= GRID || l < 0 || l >= LEVELS) return 'grid';
      const o = this.occ.get(ck(x, y, l)); if (o !== undefined && o !== ignore) return 'overlap';
      if (this.nobuild.has(x + ',' + y) && l <= 1) return 'nobuild';
      if (this.chasms.has(x + ',' + y) && l === 0 && kind === 'solid') return 'chasm';
    }
    if (T.start && this.blocks.some(b => TYPES[b.type].start && b.id !== ignore)) return 'start';
    return null;
  }
  place(pl, o = {}) {
    const b = { id: pl.id || this.nextId, type: pl.type, cx: pl.cx, cy: pl.cy, L: pl.L || 0, rot: pl.rot & 3, fixed: !!pl.fixed };
    if (!o.force) { const why = this.check(b); if (why) return why; }
    this.nextId = Math.max(this.nextId, b.id + 1);
    this.blocks.push(b);
    for (const [x, y, l] of this.cellsOf(b)) if (!this.occ.has(ck(x, y, l))) this.occ.set(ck(x, y, l), b.id);
    this.version++; this._links = null; return b;
  }
  remove(id) {
    const i = this.blocks.findIndex(b => b.id === id); if (i < 0) return null;
    const b = this.blocks[i]; this.blocks.splice(i, 1);
    for (const [x, y, l] of this.cellsOf(b)) if (this.occ.get(ck(x, y, l)) === id) this.occ.delete(ck(x, y, l));
    this.version++; this._links = null; return b;
  }
  at(cx, cy, L) { const id = this.occ.get(ck(cx, cy, L)); return id === undefined ? null : this.blocks.find(b => b.id === id) || null; }
  byId(id) { return this.blocks.find(b => b.id === id) || null; }
  get start() { return this.blocks.find(b => TYPES[b.type].start) || null; }
  get finishes() { return this.blocks.filter(b => TYPES[b.type].finish); }
  get cps() { return this.blocks.filter(b => TYPES[b.type].cp); }

  /* ---- links ---- */
  /** end key -> [{ b, e }] */
  links() {
    if (this._links) return this._links;
    const m = new Map();
    for (const b of this.blocks) for (const e of endsOf(b)) { const k = keyOf(e.p); if (!m.has(k)) m.set(k, []); m.get(k).push({ b, e }); }
    return (this._links = m);
  }
  /** the block end that joins end e of block b, or null */
  partner(b, e) {
    const L = this.links().get(keyOf(e.p)); if (!L) return null;
    for (const q of L) if (q.b !== b && dot(q.e.t, e.t) < -.999) return q;
    return null;
  }
  /** open ends: ends no other block joins (the editor's red arrows) */
  openEnds() { const out = []; for (const b of this.blocks) for (const e of endsOf(b)) if (!e.air && !this.partner(b, e) && !(TYPES[b.type].start && e.i === 0) && !(TYPES[b.type].finish && e.i === 1)) out.push({ b, e }); return out; }
  /** a kicker's landing: the first block ahead along its heading (within 5 cells, its level or up to 3 lower) whose end
   *  faces back at it */
  jumpFrom(k) {
    const h = HEAD[k.rot];
    for (let d = 1; d <= 6; d++) for (let dl = 0; dl >= -3; dl--) {
      const x = k.cx + h[0] * d, y = k.cy + h[1] * d, l = k.L + dl, b = this.at(x, y, l); if (!b || b === k) continue;
      const T = TYPES[b.type]; if (!T.ends.length) continue;
      const fx = GX + (x + .5) * CELL - h[0] * CELL / 2, fy = GY + (y + .5) * CELL - h[1] * CELL / 2;
      for (const e of endsOf(b)) if (dot(e.t, [h[0], h[1], 0]) < -.999 && Math.hypot(e.p[0] - fx, e.p[1] - fy) < 1) return { b, e };
    }
    return null;
  }
  /** the route from Start to Finish: { ok, segs: [{ b, from, to, s0, s1, dir, air }], broken: { b } | null, len } */
  route() {
    if (this._route && this._route.v === this.version) return this._route;
    const st = this.start, segs = [], R = { v: this.version, ok: false, segs, broken: null, len: 0, why: '' };
    this._route = R;
    if (!st) { R.why = 'NO START'; return R; }
    const T0 = TYPES[st.type];
    segs.push({ b: st, from: 0, to: 1, s0: 0, s1: T0.len, dir: 1 });
    let cur = st, endIdx = 1, guard = 0;
    while (guard++ < 600) {
      const e = endsOf(cur)[endIdx];
      if (!e) { R.why = 'ROUTE BROKEN'; R.broken = { b: cur }; return R; }
      let nx = this.partner(cur, e);
      if (!nx) { R.why = 'ROUTE BROKEN'; R.broken = { b: cur, e }; return R; }
      const b = nx.b, T = TYPES[b.type], inE = nx.e.i;
      if (T.oneway && inE !== 0) { R.why = 'WRONG WAY'; R.broken = { b }; return R; }
      if (T.finish) { segs.push({ b, from: 0, to: 1, s0: 0, s1: T.len, dir: 1 }); R.ok = true; break; }
      if (T.kicker) {
        segs.push({ b, from: 0, to: -1, s0: 0, s1: T.len, dir: 1 });
        const land = this.jumpFrom(b);
        if (!land) { R.why = 'NO LANDING'; R.broken = { b }; return R; }
        segs.push({ air: true, from: b, to: land.b, toEnd: land.e.i });
        const LT = TYPES[land.b.type];
        cur = land.b; const ent = land.e.i;
        if (LT.oneway && ent !== 0) { R.why = 'WRONG WAY'; R.broken = { b: cur }; return R; }
        if (LT.finish) { segs.push({ b: cur, from: 0, to: 1, s0: 0, s1: LT.len, dir: 1 }); R.ok = true; break; }
        const out = LT.cross ? [1, 0, 3, 2][ent] : ent === 0 ? 1 : 0;
        segs.push(segOf(cur, ent, out)); endIdx = out;
        if (segs.length > 400) break;
        continue;
      }
      const out = T.cross ? [1, 0, 3, 2][inE] : inE === 0 ? 1 : 0;
      if (T.ends.length < 2) { R.why = 'ROUTE BROKEN'; R.broken = { b }; return R; }
      segs.push(segOf(b, inE, out)); cur = b; endIdx = out;
      if (segs.length > 400) { R.why = 'ROUTE LOOPS'; return R; }
    }
    return R;
  }
  /** samples along the route every `step` metres: [{ p, t, u, r, b, s, hw, surface, flags }] (the bot's line) */
  samples(step = 2) {
    const R = this.route(); if (!R.ok) return [];
    const out = [];
    for (let i = 0; i < R.segs.length; i++) {
      const g = R.segs[i];
      if (g.air) {
        const a = out[out.length - 1], land = frameAtSeg(R.segs[i + 1], 0), n = Math.max(2, Math.ceil(dist(a.p, land.p) / step));
        for (let k = 1; k < n; k++) { const q = k / n, p = add(a.p, sub(land.p, a.p), q); p[2] += Math.sin(Math.PI * q) * dist(a.p, land.p) * .12; out.push({ p, t: norm(sub(land.p, a.p)), u: [0, 0, 1], r: cross([0, 0, 1], norm(sub(land.p, a.p))), b: null, s: 0, air: true, flags: 'air' }); }
        continue;
      }
      const T = TYPES[g.b.type], L = T.cross ? CELL : Math.abs(g.s1 - g.s0), n = Math.max(1, Math.ceil(L / step));
      for (let k = (out.length ? 1 : 0); k <= n; k++) {
        const f = frameAtSeg(g, k / n * L);
        f.b = g.b; f.flags = T.loop ? 'loop' : T.kicker ? 'kicker' : T.landing ? 'landing' : T.boost ? 'boost' : T.cp || T.finish ? 'gate' : T.bank ? 'bank' : '';
        f.surface = T.surface; out.push(f);
      }
    }
    return out;
  }
  /* ---- data ---- */
  toJSON() {
    return { v: 1, id: this.id, name: this.name, env: this.env, blocks: this.blocks.map(b => [b.type, b.cx, b.cy, b.L, b.rot, b.fixed ? 1 : 0]), chasms: [...this.chasms].map(([k, v]) => [...k.split(',').map(Number), v]), nobuild: [...this.nobuild].map(([k, v]) => [...k.split(',').map(Number), v]) };
  }
  static fromJSON(j) {
    const t = new Track({ id: j.id, name: j.name, env: j.env, chasms: j.chasms, nobuild: j.nobuild });
    for (const [type, cx, cy, L, rot, fixed] of j.blocks) if (TYPES[type]) t.place({ type, cx, cy, L, rot, fixed: !!fixed }, { force: true });
    return t;
  }
  clone() { return Track.fromJSON(JSON.parse(JSON.stringify(this.toJSON()))); }
  /** a share code: base64url of a compact text form */
  shareCode() {
    const j = this.toJSON(), txt = ['C1', j.env[0], encodeURIComponent(j.name), j.blocks.map(b => b.join('.')).join('_'), j.chasms.map(c => c.join('.')).join('_')].join('~');
    return b64url(txt);
  }
  static fromCode(code) {
    const txt = unb64url(String(code).trim()); const [tag, e, name, bl, ch] = txt.split('~');
    if (tag !== 'C1') throw new Error('not a CRACKMANIA track code');
    const env = { d: 'dustbowl', h: 'hedgerow', f: 'frostpeak' }[e] || 'dustbowl';
    const blocks = bl ? bl.split('_').map(s => { const [t, x, y, l, r, f] = s.split('.'); return [t, +x, +y, +l, +r, +f]; }) : [];
    const chasms = ch ? ch.split('_').map(s => { const [x, y, k] = s.split('.'); return [+x, +y, k]; }) : [];
    return Track.fromJSON({ id: 'code', name: decodeURIComponent(name || 'SHARED'), env, blocks, chasms });
  }
}
function segOf(b, from, to) {
  const T = TYPES[b.type];
  if (T.cross) return { b, from, to, s0: 0, s1: CELL, dir: 1, cross: true };
  return from === 0 ? { b, from, to, s0: 0, s1: T.len, dir: 1 } : { b, from, to, s0: T.len, s1: 0, dir: -1 };
}
/** the world frame at distance d along a route segment, in its direction of travel */
export function frameAtSeg(g, d) {
  const b = g.b, T = TYPES[b.type];
  if (g.cross) {
    const E = endsOf(b), a = E[g.from].p, z = E[g.to].p, t = norm(sub(z, a)), p = add(a, t, d);
    return { p: [p[0], p[1], p[2]], t, u: [0, 0, 1], r: cross([0, 0, 1], t), s: d };
  }
  const s = g.dir > 0 ? g.s0 + d : g.s0 - d, f = frameAt(b, s);
  if (g.dir < 0) { f.t = mul(f.t, -1); f.r = mul(f.r, -1); }
  f.s = s; return f;
}
const B64 = typeof btoa === 'function' ? btoa : s => Buffer.from(s, 'binary').toString('base64');
const UNB64 = typeof atob === 'function' ? atob : s => Buffer.from(s, 'base64').toString('binary');
export const b64url = s => B64(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64url = s => decodeURIComponent(escape(UNB64(s.replace(/-/g, '+').replace(/_/g, '/'))));

/* ---- the turtle (PLAN §6.1) ---- */
const TURN = /^(D|I|B)?(L|R)([123])$/;
/** compile a turtle program into a Track: def { id, name, env, start: [cx, cy], heading: 'E', program, chasms } */
export function compile(def) {
  const t = new Track({ id: def.id, name: def.name, env: def.env, nobuild: def.nobuild });
  let [cx, cy] = def.start, L = def.level || 0, h = 'ESWN'.indexOf(def.heading || 'E'); const errors = [];
  const gaps = [];
  const put = (type, extra = {}) => {
    const pl = { type, cx, cy, L, rot: h, ...extra }, why = t.check(pl);
    if (why) {
      // a crossing entered again at right angles: drive through it
      const o = t.at(cx, cy, L); if (type === 'CR' && o && o.type === 'CR') return o;
      errors.push(why + ' at ' + type + ' (' + cx + ',' + cy + ',' + L + ')'); return null;
    }
    return t.place(pl);
  };
  const fwd = n => { cx += HEAD[h][0] * n; cy += HEAD[h][1] * n; };
  for (const tok of def.program.trim().split(/\s+/)) {
    let m;
    if (['ST', 'CP', 'FN', 'BO', 'BU', 'KI', 'CR'].includes(tok)) { put(tok); fwd(1); }
    else if ((m = /^(S|DS|IS)(\d*)$/.exec(tok))) { const n = +(m[2] || 1); for (let i = 0; i < n; i++) { put(m[1]); fwd(1); } }
    else if ((m = TURN.exec(tok))) {
      const n = +m[3], side = m[2] === 'R' ? 1 : -1; put(tok);
      const hh = HEAD[h], ss = HEAD[(h + (side > 0 ? 1 : 3)) & 3];
      cx += hh[0] * (n - 1) + ss[0] * n; cy += hh[1] * (n - 1) + ss[1] * n; h = (h + (side > 0 ? 1 : 3)) & 3;
    }
    else if ((m = /^(U|D)([12])$/.exec(tok))) { put(tok); fwd(+m[2]); L += m[1] === 'U' ? 1 : -1; }
    else if ((m = /^LOOP(L|R)$/.exec(tok))) {
      put(tok); const side = m[1] === 'R' ? 1 : -1, hh = HEAD[h], ss = HEAD[(h + (side > 0 ? 1 : 3)) & 3];
      cx += hh[0] * 2 + ss[0]; cy += hh[1] * 2 + ss[1];
    }
    else if ((m = /^GAP(\d)$/.exec(tok))) { const n = +m[1]; const g = put(tok); if (g && (L === 0 || def.bigCrack)) for (let i = 0; i < n; i++) gaps.push([cx + HEAD[h][0] * i, cy + HEAD[h][1] * i]); fwd(n); }
    else if ((m = /^DROP(\d)$/.exec(tok))) L -= +m[1];
    else if ((m = /^RISE(\d)$/.exec(tok))) L += +m[1];
    else if (tok === 'LA') { put('LA'); fwd(2); }
    else errors.push('unknown token ' + tok);
  }
  const kind = def.chasmKind || 'canyon';
  for (const [x, y] of gaps) t.chasms.set(x + ',' + y, kind);
  for (const c of def.chasms || []) t.chasms.set(c[0] + ',' + c[1], c[2] || kind);
  if (!t.start) errors.push('no start');
  if (!t.finishes.length) errors.push('no finish');
  for (const k of t.blocks.filter(b => TYPES[b.type].kicker)) if (!t.jumpFrom(k)) errors.push('kicker without landing at ' + k.cx + ',' + k.cy);
  t.errors = errors; t.def = def;
  return t;
}
