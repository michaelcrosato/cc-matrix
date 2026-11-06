// Small helpers for level scripts.
import { S } from './enemy.js';

export const cp = (a, c, r) => [a.level.wx(c), a.level.wz(r)];
export const inCells = (a, c0, r0, c1, r1) => { const [c, r] = a.level.cellOf(a.player.x, a.player.z); return c >= c0 && c <= c1 && r >= r0 && r <= r1; };
export const nearXZ = (a, x, z, rad) => Math.hypot(a.player.x - x, a.player.z - z) < rad;
export const cam = (x, y, z, tx, ty, tz, fov = 50) => ({ position: [x, y, z], target: [tx, ty, tz], fov });
/** Shots orbiting a point: from angle a0 to a1. */
export function orbit(t0, t1, cx, cz, r, h, ty, a0, a1, fov = 50) {
  return [{ at: t0, ...cam(cx + Math.sin(a0) * r, h, cz + Math.cos(a0) * r, cx, ty, cz, fov), cut: true }, { at: t1, ...cam(cx + Math.sin(a1) * r, h, cz + Math.cos(a1) * r, cx, ty, cz, fov) }];
}
export function* hintUntil(a, text, cond, timeout = 30) { a.showHint(text, timeout); let t = 0; while (!cond() && t < timeout) { yield 0.1; t += 0.1; } a.hintT = 0; }
export const alive = (list) => list.filter((e) => !e.dead);
export function* waitAllDead(list, timeout = 600) { let t = 0; while (alive(list).length && t < timeout) { yield 0.25; t += 0.25; } }
export function* waitKills(a, n, timeout = 600) { const start = a.killsThisArea; let t = 0; while (a.killsThisArea - start < n && t < timeout) { yield 0.25; t += 0.25; } }
export function* waitFlag(a, f, timeout = 600) { let t = 0; while (!a.hasFlag(f) && t < timeout) { yield 0.25; t += 0.25; } }
/** Spawn n of a type at a spawn door, one every `gap` seconds. Returns the list (filled over time). */
export function spawnStream(a, type, door, n, gap, o = {}) {
  const list = [];
  a.scripts.start(function* () { for (let i = 0; i < n; i++) { list.push(a.spawnAtDoor(type, door, { state: S.WAIT, ...o })); yield gap; } }, 'stream');
  return list;
}
export function shake(a, v) { a.ctx.engine.shake.add(v); }
export function flashBang(a, color = 'white', t = 0.15) { a.flashT = t; a.flashColor = color; }
export const lines = (...l) => l.map(([who, text], i) => ({ at: 0, until: 0, who, text }));
/** Lay out dialogue lines in time: returns lines with at/until. */
export function timed(list, t0 = 0.4, per = 2.4) {
  let t = t0; return list.map(([who, text, dur]) => { const d = dur ?? Math.max(1.8, text.length / 22 + 0.6); const o = { at: t, until: t + d, who, text }; t += d + 0.15; return o; });
}
export function lineDuration(l) { return l.length ? l[l.length - 1].until + 0.6 : 3; }
