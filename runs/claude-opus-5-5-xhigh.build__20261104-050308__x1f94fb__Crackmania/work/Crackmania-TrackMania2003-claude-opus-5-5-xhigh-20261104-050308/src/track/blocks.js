// CRACKMANIA block catalogue (PLAN §4.1, §4.2). Every track is a list of placements { type, cx, cy, L, rot }.
// A block's local frame: entry at the centre of the west face of local cell (0, 0) at level 0, heading +x, local +y to
// the right. Paths are in local metres: path(s) -> { p, t, u }. rot = heading of local +x: 0 E, 1 S, 2 W, 3 N.
import { norm, sub, add, mul, dot, cross, rotate } from '../lib/v3.js';

export const CELL = 32, LEVEL = 8, GRID = 32, LEVELS = 16;
/** the grid's north-west corner in world metres (the terrain around it is 4 km square) */
export const GX = 1536, GY = 1536;
export const HEAD = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // E S W N (x east, y south)
export const HEAD_NAME = ['E', 'S', 'W', 'N'];
const D2R = Math.PI / 180;

const smooth = x => 3 * x * x - 2 * x * x * x, dsmooth = x => 6 * x - 6 * x * x;
const upOf = (t, u0) => norm(sub(u0, mul(t, dot(u0, t))));
const Z = [0, 0, 1];
/** numeric tangent of a position function */
const tangent = (P, s, L) => { const h = .01, a = P(Math.max(0, s - h)), b = P(Math.min(L, s + h)); return norm(sub(b, a)); };

/* ---- path builders (local metres) ---- */
function straightPath(len) { return { len, path: s => ({ p: [s, 0, 0], t: [1, 0, 0], u: [0, 0, 1] }) }; }
function turnPath(n, side, bankDeg = 0) {
  const rho = CELL * n - CELL / 2, len = Math.PI * rho / 2;
  return { len, rho, path: s => {
    const ph = s / rho, p = [rho * Math.sin(ph), side * rho * (1 - Math.cos(ph)), 0], t = [Math.cos(ph), side * Math.sin(ph), 0];
    let u = [0, 0, 1];
    if (bankDeg) { const b = bankDeg * D2R * Math.sin(2 * ph), right = cross(u, t), rin = mul(right, side); u = norm(add(mul(Z, Math.cos(b)), rin, Math.sin(b))); }
    return { p, t, u };
  } };
}
function hillPath(n, dir) {   // dir +1 up, -1 down: rise LEVEL over 32n
  const len0 = CELL * n, H = LEVEL * dir;
  const P = s => { const x = s / len0; return [s, 0, H * smooth(x)]; };
  // arc length ~ chord; we use x as parameter and the length of the slope
  let L = 0, prev = P(0); for (let i = 1; i <= 400; i++) { const q = P(len0 * i / 400); L += Math.hypot(q[0] - prev[0], q[2] - prev[2]); prev = q; }
  return { len: L, path: s => {
    const x = Math.min(1, Math.max(0, s / L)), sx = x * len0, p = [sx, 0, H * smooth(x)], dz = H * dsmooth(x) / len0;
    const t = norm([1, 0, dz]); return { p, t, u: upOf(t, Z) };
  } };
}
const KR = 123.6;
function kickerPath() {
  const zf = x => KR - Math.sqrt(KR * KR - x * x);
  let L = 0, px = 0, pz = 0; for (let i = 1; i <= 400; i++) { const x = 32 * i / 400, z = zf(x); L += Math.hypot(x - px, z - pz); px = x; pz = z; }
  return { len: L, path: s => {
    const x = Math.min(32, (s / L) * 32), z = zf(x), dz = x / Math.sqrt(KR * KR - x * x), t = norm([1, 0, dz]);
    return { p: [x, 0, z], t, u: upOf(t, Z) };
  } };
}
function landingPath() {
  const zf = x => 3 * (1 - smooth(x / 64)), dzf = x => -3 * dsmooth(x / 64) / 64;
  let L = 0, px = 0, pz = 3; for (let i = 1; i <= 400; i++) { const x = 64 * i / 400, z = zf(x); L += Math.hypot(x - px, z - pz); px = x; pz = z; }
  return { len: L, path: s => { const x = Math.min(64, (s / L) * 64), t = norm([1, 0, dzf(x)]); return { p: [x, 0, zf(x)], t, u: upOf(t, Z) }; } };
}
export const LOOP_R = 12;
function loopPath(side) {
  const S = 32 + 2 * Math.PI * LOOP_R + 32, yOf = s => side * 32 * smooth(s / S);
  const P = s => {
    if (s <= 32) return [s, yOf(s), 0];
    if (s <= 32 + 2 * Math.PI * LOOP_R) { const th = (s - 32) / LOOP_R; return [32 + LOOP_R * Math.sin(th), yOf(s), LOOP_R * (1 - Math.cos(th))]; }
    return [32 + (s - 32 - 2 * Math.PI * LOOP_R), yOf(s), 0];
  };
  const U0 = s => { if (s <= 32 || s >= 32 + 2 * Math.PI * LOOP_R) return Z; const th = (s - 32) / LOOP_R; return [-Math.sin(th), 0, Math.cos(th)]; };
  return { len: S, path: s => { const t = tangent(P, s, S); return { p: P(s), t, u: upOf(t, U0(s)) }; } };
}
function bumpsPath() {
  const zf = x => .5 * Math.sin(3 * Math.PI * x / 32) ** 2, dz = x => .5 * 2 * Math.sin(3 * Math.PI * x / 32) * Math.cos(3 * Math.PI * x / 32) * 3 * Math.PI / 32;
  return { len: 32.05, path: s => { const x = Math.min(32, s * 32 / 32.05), t = norm([1, 0, dz(x)]); return { p: [x, 0, zf(x)], t, u: upOf(t, Z) }; } };
}

/* ---- the catalogue ---- */
// cells: [along, right, level] occupied; air: reserved (no block may sit there); ends: local { p, t } where t points
// OUT of the block. A block is entered at one end and left by another; `oneway` blocks only from end 0.
const T = {};
const def = (id, o) => { T[id] = Object.assign({ id, cells: [[0, 0, 0]], air: [], surface: 'road', cost: 5, pack: 'BASIC', cat: 'ROADS', envs: null, oneway: false }, o); };
const E0 = { p: [0, 0, 0], t: [-1, 0, 0] }, E1 = n => ({ p: [CELL * n, 0, 0], t: [1, 0, 0] });
const straightLike = (id, o) => { const sp = straightPath(CELL); def(id, Object.assign({ len: sp.len, path: sp.path, ends: [E0, E1(1)] }, o)); };
straightLike('ST', { name: 'Start', cost: 0, start: true, spawnS: 8, archS: 10, oneway: true, cat: 'ROADS' });
straightLike('FN', { name: 'Finish', cost: 0, finish: true, gateS: 16, oneway: true });
straightLike('CP', { name: 'Checkpoint', cost: 15, cp: true, gateS: 16 });
straightLike('S', { name: 'Straight', cost: 5 });
straightLike('BO', { name: 'Boost', cost: 40, boost: [10, 22], pack: 'STUNTS', cat: 'STUNTS' });
straightLike('DS', { name: 'Dirt road', cost: 5, surface: 'dirt', pack: 'SURFACES', cat: 'SURFACES', envs: ['dustbowl', 'hedgerow'] });
straightLike('IS', { name: 'Ice road', cost: 5, surface: 'ice', pack: 'SURFACES', cat: 'SURFACES', envs: ['frostpeak'] });
{ const bp = bumpsPath(); def('BU', { name: 'Bumps', cost: 10, len: bp.len, path: bp.path, ends: [E0, E1(1)], pack: 'STUNTS', cat: 'STUNTS', envs: ['hedgerow'] }); }
for (const n of [1, 2, 3]) for (const [side, k] of [[1, 'R'], [-1, 'L']]) {
  const tp = turnPath(n, side), cells = []; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) cells.push([a, side * b, 0]);
  const exit = { p: [tp.rho, side * tp.rho, 0], t: [0, side, 0] };
  const base = { len: tp.len, path: tp.path, rho: tp.rho, cells, ends: [E0, exit], turn: side, size: n, cat: 'TURNS' };
  def(k + n, Object.assign({ name: (n === 1 ? 'Tight ' : n === 2 ? 'Wide ' : 'Sweeping ') + (side > 0 ? 'right' : 'left'), cost: [8, 15, 25][n - 1] }, base));
  if (n <= 2) {
    def('D' + k + n, Object.assign({ name: 'Dirt ' + (side > 0 ? 'right' : 'left') + (n === 1 ? ' (tight)' : ' (wide)'), cost: [8, 15][n - 1], surface: 'dirt', pack: 'SURFACES', cat: 'SURFACES', envs: ['dustbowl', 'hedgerow'] }, base));
    def('I' + k + n, Object.assign({ name: 'Ice ' + (side > 0 ? 'right' : 'left') + (n === 1 ? ' (tight)' : ' (wide)'), cost: [8, 15][n - 1], surface: 'ice', pack: 'SURFACES', cat: 'SURFACES', envs: ['frostpeak'] }, base));
  }
  if (n === 2) {
    const bp = turnPath(2, side, 28), bc = cells.flatMap(([a, b]) => [[a, b, 0], [a, b, 1]]);
    def('B' + k + '2', Object.assign({}, base, { name: 'Banked ' + (side > 0 ? 'right' : 'left'), cost: 30, path: bp.path, cells: bc, bank: 28, pack: 'LOOPS', cat: 'STUNTS', envs: ['dustbowl', 'frostpeak'] }));
  }
}
for (const n of [1, 2]) {
  const up = hillPath(n, 1), dn = hillPath(n, -1), c = []; for (let a = 0; a < n; a++) c.push([a, 0, 0], [a, 0, 1]);
  const cd = []; for (let a = 0; a < n; a++) cd.push([a, 0, 0], [a, 0, -1]);
  def('U' + n, { name: (n === 1 ? 'Steep ' : '') + 'Hill up', cost: [10, 15][n - 1], len: up.len, path: up.path, cells: c, ends: [E0, { p: [CELL * n, 0, LEVEL], t: [1, 0, 0] }], hill: 1, cat: 'HILLS' });
  def('D' + n, { name: (n === 1 ? 'Steep ' : '') + 'Hill down', cost: [10, 15][n - 1], len: dn.len, path: dn.path, cells: cd, ends: [E0, { p: [CELL * n, 0, -LEVEL], t: [1, 0, 0] }], hill: -1, cat: 'HILLS' });
}
{ const kp = kickerPath(); def('KI', { name: 'Kicker', cost: 30, len: kp.len, path: kp.path, cells: [[0, 0, 0]], air: [[0, 0, 1]], ends: [E0], oneway: true, kicker: true, lip: kp.path(kp.len), pack: 'STUNTS', cat: 'STUNTS' }); }
{ const lp = landingPath(); def('LA', { name: 'Landing', cost: 20, len: lp.len, path: lp.path, cells: [[0, 0, 0], [1, 0, 0]], air: [[0, 0, 1], [1, 0, 1]], ends: [{ p: [0, 0, 3], t: [-1, 0, 0], air: true }, E1(2)], oneway: true, landing: true, pack: 'STUNTS', cat: 'STUNTS' }); }
for (const [side, k] of [[1, 'R'], [-1, 'L']]) {
  const lp = loopPath(side), cells = []; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let l = 0; l < 4; l++) cells.push([a, side * b, l]);
  def('LOOP' + k, { name: 'Loop (' + (side > 0 ? 'right' : 'left') + ' exit)', cost: 120, len: lp.len, path: lp.path, cells, ends: [E0, { p: [64, side * 32, 0], t: [1, 0, 0] }], loop: side, assist: true, oneway: true, pack: 'LOOPS', cat: 'STUNTS' });
}
// the crossing: a flat deck with four ends; its route path is the straight line between the two ends it is driven through
def('CR', { name: 'Crossing', cost: 20, len: CELL, path: straightPath(CELL).path, ends: [E0, E1(1), { p: [16, -16, 0], t: [0, -1, 0] }, { p: [16, 16, 0], t: [0, 1, 0] }], cross: true });
for (const n of [1, 2, 3]) { const c = []; for (let a = 0; a < n; a++) c.push([a, 0, 0], [a, 0, 1]); def('GAP' + n, { name: 'Gap ' + n, cost: 0, cells: [], air: c, ends: [], gap: n, len: CELL * n, path: straightPath(CELL * n).path, pack: 'STUNTS', cat: 'STUNTS', editor: false }); }
// scenery props the editor places (no road): drawn by the deco module
for (const [id, name, cost, envs] of [['XCACT', 'Saguaro', 5, ['dustbowl']], ['XROCK', 'Rocks', 5, null], ['XSTAND', 'Grandstand', 25, null], ['XTREE', 'Tree', 5, ['hedgerow']], ['XHAY', 'Hay bales', 5, ['hedgerow']], ['XPINE', 'Snowy pine', 5, ['frostpeak']], ['XCHALET', 'Chalet', 20, ['frostpeak']], ['XBOARD', 'Billboard', 10, null], ['XTYRE', 'Tyre stack', 5, ['dustbowl']], ['XSNOWMAN', 'Snowman', 5, ['frostpeak']], ['XCOW', 'Cow', 10, ['hedgerow']], ['XWIND', 'Windmill', 25, ['hedgerow', 'dustbowl']]])
  def(id, { name, cost, cells: [[0, 0, 0]], ends: [], deco: id, len: 0, path: null, pack: 'SCENERY', cat: 'SCENERY', envs });

export const TYPES = T;
export const PACKS = { BASIC: { name: 'BASIC', cost: 0 }, STUNTS: { name: 'STUNTS', cost: 250 }, LOOPS: { name: 'LOOPS & BANKS', cost: 600 }, SURFACES: { name: 'SURFACES', cost: 200 }, SCENERY: { name: 'SCENERY', cost: 150 } };
export const CATS = ['ROADS', 'TURNS', 'HILLS', 'STUNTS', 'SURFACES', 'SCENERY'];

/* ---- placements in the world ---- */
/** the world transform of a placement: origin O (metres), heading h, right s (unit vectors in x/y) */
export function xform(pl) {
  const h = HEAD[pl.rot & 3], s = HEAD[(pl.rot + 1) & 3];
  const ox = GX + (pl.cx + .5) * CELL - h[0] * CELL / 2, oy = GY + (pl.cy + .5) * CELL - h[1] * CELL / 2, oz = pl.L * LEVEL;
  return { o: [ox, oy, oz], h: [h[0], h[1], 0], s: [s[0], s[1], 0] };
}
/** a local point to world metres */
export const toWorld = (X, p) => [X.o[0] + X.h[0] * p[0] + X.s[0] * p[1], X.o[1] + X.h[1] * p[0] + X.s[1] * p[1], X.o[2] + p[2]];
/** a local vector to world */
export const vecWorld = (X, v) => [X.h[0] * v[0] + X.s[0] * v[1], X.h[1] * v[0] + X.s[1] * v[1], v[2]];
/** a local cell offset [a, b, l] to the world cell [cx, cy, L] */
export const cellWorld = (pl, c) => { const h = HEAD[pl.rot & 3], s = HEAD[(pl.rot + 1) & 3]; return [pl.cx + h[0] * c[0] + s[0] * c[1], pl.cy + h[1] * c[0] + s[1] * c[1], pl.L + c[2]]; };
/** the world frame at s along a placed block's path { p, t, u, r } */
export function frameAt(pl, s) {
  const T0 = TYPES[pl.type], X = pl._x || (pl._x = xform(pl)), q = T0.path(Math.max(0, Math.min(T0.len, s)));
  const p = toWorld(X, q.p), t = vecWorld(X, q.t), u = vecWorld(X, q.u);
  return { p, t, u, r: cross(u, t) };
}
/** the placed block's ends in the world: [{ p, t (out of the block), air }] */
export function endsOf(pl) { const X = pl._x || (pl._x = xform(pl)); return TYPES[pl.type].ends.map((e, i) => ({ i, p: toWorld(X, e.p), t: vecWorld(X, e.t), air: !!e.air })); }
export const keyOf = p => Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2) + ',' + Math.round(p[2] * 2);
