// The block catalogue. A block's local frame (metres): entry at (0, 0, 0) heading +x, +y is to the right, z up; local
// cell (a, b) spans x in [32a, 32a + 32], y in [32b - 16, 32b + 16]; levels are 8 m. Every block exports path(s) ->
// local position p; tangents come from the path, up from upHint(s) made square to the tangent.
import { norm, cross, dot, add, scale, sub } from './v3.js';

export const CELL = 32, LEVEL = 8;
const smooth = x => x * x * (3 - 2 * x);
const dsmooth = x => 6 * x * (1 - x);

function straight(n) { return { len: CELL * n, p: s => [s, 0, 0] }; }
function turn(n, side) {   // side +1 right, -1 left
  const R = CELL * n - 16;
  return { len: Math.PI * R / 2, p: s => { const f = s / R; return [R * Math.sin(f), side * R * (1 - Math.cos(f)), 0]; }, R, side };
}
function hill(n, dir) {    // dir +1 up (0 -> 8), -1 down (8 -> 0)
  const L = CELL * n;
  return { len: L, p: s => { const x = s / L; return [s, 0, dir > 0 ? LEVEL * smooth(x) : LEVEL * (1 - smooth(x))]; } };
}
const RK = 32 / Math.sin(20 * Math.PI / 180);   // a 20 degree lip, 5.6 m up
const kicker = { len: CELL, p: s => [s, 0, RK - Math.sqrt(RK * RK - s * s)] };
const landing = { len: 64, p: s => { const x = s / 64; return [s, 0, 3 * (1 - smooth(x))]; } };
const bumps = { len: CELL, p: s => [s, 0, .5 * Math.sin(3 * Math.PI * s / 32) ** 2] };
function loop(side) {
  const S = 32 + 24 * Math.PI + 32, R = 12;
  const y = s => side * 32 * smooth(s / S);
  return {
    len: S, R, side,
    p: s => {
      if (s <= 32) return [s, y(s), 0];
      if (s >= 32 + 24 * Math.PI) return [32 + (s - 32 - 24 * Math.PI), y(s), 0];
      const th = (s - 32) / R; return [32 + R * Math.sin(th), y(s), R * (1 - Math.cos(th))];
    },
    up: s => { if (s <= 32 || s >= 32 + 24 * Math.PI) return [0, 0, 1]; const th = (s - 32) / R; return [-Math.sin(th), 0, Math.cos(th)]; }
  };
}
function banked(side) {
  const t = turn(2, side), B = 28 * Math.PI / 180;
  // up leans toward the turn's centre (0, side R): the outer edge rises, 0 at both ports, 28 degrees mid-bend
  return { len: t.len, p: t.p, R: t.R, side, bank: B, up: s => { const f = s / t.R, b = B * Math.sin(2 * f), ix = -Math.sin(f), iy = side * Math.cos(f); return [Math.sin(b) * ix, Math.sin(b) * iy, Math.cos(b)]; } };
}

// cells: [a, b, dl] footprint; exit: { a, b, dl, turn: 0 | 1 (right) | -1 (left) } or null; inDl: entry level offset
const T = {};
function def(id, o) { T[id] = Object.assign({ id, cost: 5, pack: 'basic', cat: 'ROADS', surface: 'road', inDl: 0, rev: true, rails: 'auto', envs: null, gate: null, icon: id }, o); }
const cells1 = [[0, 0, 0]];
const sq = (n, side, lv = 1) => { const c = []; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let l = 0; l < lv; l++) c.push([a, side * b, l]); return c; };
def('ST', { name: 'START', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: straight(1), cost: 0, rev: false, gate: 10, spawn: 8 });
def('FN', { name: 'FINISH', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: straight(1), cost: 0, rev: false, gate: 16 });
def('CP', { name: 'CHECKPOINT', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: straight(1), cost: 15, gate: 16 });
def('S', { name: 'STRAIGHT', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: straight(1), cost: 5 });
def('BO', { name: 'BOOST', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: straight(1), cost: 40, rev: false, pack: 'stunts', cat: 'STUNTS', boost: [10, 22] });
for (const [n, cost] of [[1, 8], [2, 15], [3, 25]]) {
  def('R' + n, { name: ['', 'TIGHT', 'WIDE', 'SWEEPER'][n] + ' RIGHT', cells: sq(n, 1), exit: { a: n - 1, b: n, dl: 0, turn: 1 }, path: turn(n, 1), cost, cat: 'TURNS' });
  def('L' + n, { name: ['', 'TIGHT', 'WIDE', 'SWEEPER'][n] + ' LEFT', cells: sq(n, -1), exit: { a: n - 1, b: -n, dl: 0, turn: -1 }, path: turn(n, -1), cost, cat: 'TURNS' });
}
def('BR2', { name: 'BANKED RIGHT', cells: sq(2, 1, 2), exit: { a: 1, b: 2, dl: 0, turn: 1 }, path: banked(1), cost: 30, pack: 'loops', cat: 'STUNTS' });
def('BL2', { name: 'BANKED LEFT', cells: sq(2, -1, 2), exit: { a: 1, b: -2, dl: 0, turn: -1 }, path: banked(-1), cost: 30, pack: 'loops', cat: 'STUNTS' });
def('U1', { name: 'STEEP UP', cells: [[0, 0, 0], [0, 0, 1]], exit: { a: 1, b: 0, dl: 1, turn: 0 }, path: hill(1, 1), cost: 10, cat: 'HILLS' });
def('D1', { name: 'STEEP DOWN', cells: [[0, 0, 0], [0, 0, 1]], inDl: 1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: hill(1, -1), cost: 10, cat: 'HILLS' });
def('U2', { name: 'HILL UP', cells: [[0, 0, 0], [0, 0, 1], [1, 0, 0], [1, 0, 1]], exit: { a: 2, b: 0, dl: 1, turn: 0 }, path: hill(2, 1), cost: 15, cat: 'HILLS' });
def('D2', { name: 'HILL DOWN', cells: [[0, 0, 0], [0, 0, 1], [1, 0, 0], [1, 0, 1]], inDl: 1, exit: { a: 2, b: 0, dl: 0, turn: 0 }, path: hill(2, -1), cost: 15, cat: 'HILLS' });
def('KI', { name: 'KICKER', cells: [[0, 0, 0], [0, 0, 1]], exit: null, path: kicker, cost: 30, rev: false, pack: 'stunts', cat: 'STUNTS', rails: 'none' });
def('LA', { name: 'LANDING', cells: [[0, 0, 0], [1, 0, 0]], exit: { a: 2, b: 0, dl: 0, turn: 0 }, path: landing, cost: 20, rev: false, pack: 'stunts', cat: 'STUNTS', rails: 'none' });
def('BU', { name: 'BUMPS', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: bumps, cost: 10, pack: 'stunts', cat: 'STUNTS', envs: ['hedgerow'] });
def('LOOPR', { name: 'LOOP RIGHT', cells: sq(2, 1, 4), exit: { a: 2, b: 1, dl: 0, turn: 0 }, path: loop(1), cost: 120, rev: false, pack: 'loops', cat: 'STUNTS', rails: 'lips', assist: true });
def('LOOPL', { name: 'LOOP LEFT', cells: sq(2, -1, 4), exit: { a: 2, b: -1, dl: 0, turn: 0 }, path: loop(-1), cost: 120, rev: false, pack: 'loops', cat: 'STUNTS', rails: 'lips', assist: true });
def('CR', { name: 'CROSSING', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: straight(1), cost: 20, cross: true });
for (const [p, surf, envs] of [['D', 'dirt', ['hedgerow', 'dustbowl']], ['I', 'ice', ['frostpeak']]]) {
  def(p + 'S', { name: surf.toUpperCase() + ' STRAIGHT', cells: cells1, exit: { a: 1, b: 0, dl: 0, turn: 0 }, path: straight(1), cost: 5, surface: surf, pack: 'surfaces', cat: 'SURFACES', envs });
  for (const n of [1, 2]) {
    def(p + 'R' + n, { name: surf.toUpperCase() + (n === 1 ? ' TIGHT' : ' WIDE') + ' RIGHT', cells: sq(n, 1), exit: { a: n - 1, b: n, dl: 0, turn: 1 }, path: turn(n, 1), cost: n === 1 ? 8 : 15, surface: surf, pack: 'surfaces', cat: 'SURFACES', envs });
    def(p + 'L' + n, { name: surf.toUpperCase() + (n === 1 ? ' TIGHT' : ' WIDE') + ' LEFT', cells: sq(n, -1), exit: { a: n - 1, b: -n, dl: 0, turn: -1 }, path: turn(n, -1), cost: n === 1 ? 8 : 15, surface: surf, pack: 'surfaces', cat: 'SURFACES', envs });
  }
}
for (const n of [1, 2, 3]) def('GAP' + n, { name: 'GAP', cells: Array.from({ length: n }, (_, i) => [[i, 0, 0], [i, 0, 1]]).flat(), exit: null, path: null, cost: 0, gap: n, rev: false, hidden: true });
export const BLOCKS = T;

/** frame at s along a block's local path: { p, t, u } (local metres) */
export function localFrame(B, s) {
  const P = B.path, L = P.len, h = .01;
  const a = Math.max(0, s - h), b = Math.min(L, s + h);
  const p = P.p(s), t = norm(sub(P.p(b), P.p(a)));
  const hint = P.up ? P.up(Math.min(L, Math.max(0, s))) : [0, 0, 1];
  const u = norm(sub(hint, scale(t, dot(hint, t))));
  return { p, t, u };
}
export const HEAD = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // rot 0 E, 1 S, 2 W, 3 N
export const PACKS = {
  basic: { name: 'BASIC', price: 0 }, stunts: { name: 'STUNTS', price: 250 }, loops: { name: 'LOOPS & BANKS', price: 600 },
  surfaces: { name: 'SURFACES', price: 200 }, scenery: { name: 'SCENERY', price: 150 }
};
export const PALETTE = [
  ['ROADS', ['ST', 'FN', 'CP', 'S', 'CR']],
  ['TURNS', ['R1', 'L1', 'R2', 'L2', 'R3', 'L3']],
  ['HILLS', ['U1', 'D1', 'U2', 'D2']],
  ['STUNTS', ['BO', 'KI', 'LA', 'LOOPR', 'LOOPL', 'BR2', 'BL2', 'BU']],
  ['SURFACES', ['DS', 'DR1', 'DL1', 'DR2', 'DL2', 'IS', 'IR1', 'IL1', 'IR2', 'IL2']],
  ['SCENERY', ['@tree', '@rock', '@cactus', '@pine', '@hay', '@cone', '@tyres', '@snowman']]
];
export const DECO = {   // editor scenery blocks: kind, cost, envs
  '@tree': { name: 'TREE', cost: 10, envs: ['hedgerow'] }, '@rock': { name: 'ROCK', cost: 5 }, '@cactus': { name: 'CACTUS', cost: 10, envs: ['dustbowl'] },
  '@pine': { name: 'PINE', cost: 10, envs: ['frostpeak'] }, '@hay': { name: 'HAY BALE', cost: 5, envs: ['hedgerow'] }, '@cone': { name: 'CONES', cost: 5 },
  '@tyres': { name: 'TYRE STACK', cost: 5 }, '@snowman': { name: 'SNOWMAN', cost: 25, envs: ['frostpeak'] }
};
