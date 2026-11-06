/** @file Wind-driven fuel grid, scars, smoke, regrowth and heat. It is the same deterministic grid in every copy. */
import { spawnProp, removeProp, damage } from '../../../engine/sim-api';
import { campaign, people, value, mark, cheat, type GW } from './state';
import { ground, roadDistance, PLACES } from './map';
export const GRID = 192,
  CELL = 8;
export const cellAt = (x: number, z: number): number =>
  Math.max(0, Math.min(GRID - 1, Math.floor(z / CELL))) * GRID + Math.max(0, Math.min(GRID - 1, Math.floor(x / CELL)));
export const cellPoint = (i: number): [number, number] => [
  ((i % GRID) + 0.5) * CELL,
  (Math.floor(i / GRID) + 0.5) * CELL,
];
export function makeFuel(): number[] {
  return Array.from({ length: GRID * GRID }, (_, i) => {
    const [x, z] = cellPoint(i);
    if (
      Math.abs(z - 902) < 22 ||
      roadDistance(x, z) < 4 ||
      Math.hypot(x - 1240, z - 260) < 60 ||
      x < 40 ||
      z < 40 ||
      x > 1496 ||
      z > 1496
    )
      return 0;
    if (PLACES.some((p) => p.type !== 'wreck' && Math.hypot(x - p.x, z - p.z) < 25)) return 4;
    return z > 925 ? 2 : 1;
  });
}
export function ignite(w: GW, x: number, z: number, radius = 0): void {
  const c = campaign(w),
    origin = cellAt(x, z);
  for (let dz = -radius; dz <= radius; dz++)
    for (let dx = -radius; dx <= radius; dx++) {
      const i = origin + dz * GRID + dx;
      if (i < 0 || i >= c.fire.length || !c.fuel[i] || c.fire[i] === 2 || c.fire[i] === 3) continue;
      c.fire[i] = 2;
      c.timers[i] =
        w.tick + Math.round((c.fuel[i] === 4 ? 60 : c.fuel[i] === 3 ? 40 : 8) * 60 * value(w, 'fire.burnTime'));
      const [fx, fz] = cellPoint(i);
      const id = spawnProp(w, { prop: 'prop:field-flame-patch', at: [fx, ground(fx, fz), fz], yaw: 0 });
      c.flames[i] = id;
      const grass = c.grass[i];
      if (grass >= 0) {
        removeProp(w, grass);
        c.grass[i] = -1;
      }
      mark(w, 'ignite');
      w.emit('ignite', { at: [fx, ground(fx, fz), fz] });
    }
}
export function smokeBlocks(w: GW, ax: number, az: number, bx: number, bz: number): boolean {
  const c = campaign(w),
    n = Math.ceil(Math.hypot(bx - ax, bz - az) / 8);
  let count = 0,
    last = -1;
  for (let k = 0; k <= n; k++) {
    const i = cellAt(ax + ((bx - ax) * k) / Math.max(1, n), az + ((bz - az) * k) / Math.max(1, n));
    if (i !== last && c.fire[i] === 2) count++;
    last = i;
    if (count >= 2) return true;
  }
  return false;
}
export function fireStep(w: GW): void {
  if (w.tick % 15) return;
  const c = campaign(w),
    rng = w.rng('fire'),
    next: number[] = [];
  for (let i = 0; i < c.fire.length; i++) {
    if (c.fire[i] === 3 && c.regrow[i] && w.tick >= c.regrow[i]) {
      c.fire[i] = 1;
      c.fuel[i] = 2;
      c.regrow[i] = 0;
      const [x, z] = cellPoint(i);
      spawnProp(w, { prop: 'prop:field-stubble', at: [x, ground(x, z), z], yaw: 0 });
      mark(w, 'regrowth');
      continue;
    }
    if (c.fire[i] !== 2) continue;
    const [x, z] = cellPoint(i);
    if (w.tick >= c.timers[i]) {
      c.fire[i] = 3;
      const tree = w.get(c.flags[`tree-${i}`])?.sceneProp;
      if (tree) tree.prop = 'prop:field-char-tree';
      c.regrow[i] = w.tick + Math.round(((value(w, 'fire.regrow') * value(w, 'day.minutes')) / 24) * 60);
      const flame = c.flames[i];
      if (flame !== undefined) {
        removeProp(w, flame);
        delete c.flames[i];
      }
      spawnProp(w, { prop: 'prop:field-scorch', at: [x, ground(x, z) + 0.025, z], yaw: 0 });
      for (const site of PLACES)
        if (Math.hypot(x - site.x, z - site.z) < site.radius)
          c.flags[`burned:${site.id}`] = (c.flags[`burned:${site.id}`] ?? 0) + 1;
      mark(w, 'scorch');
      continue;
    }
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const ni = i + dz * GRID + dx;
        if (
          ni < 0 ||
          ni >= c.fire.length ||
          !c.fuel[ni] ||
          c.fire[ni] !== 1 ||
          Math.abs((ni % GRID) - (i % GRID)) > 1 ||
          c.rain > 0
        )
          continue;
        const base = [0, 0.016, 0.008, 0.005, 0.008][c.fuel[ni]],
          alignment = Math.cos(Math.atan2(dx, dz) - c.wind);
        const chance =
          base *
          value(w, 'fire.spread') *
          Math.max(0.15, 1 + ((value(w, 'fire.windBias') * c.windSpeed) / 5) * alignment) *
          (dx && dz ? 0.7 : 1) *
          (ground(x + dx * 8, z + dz * 8) > ground(x, z) + 0.5 ? 1.4 : 1);
        if (rng.chance(chance)) next.push(ni);
      }
    if (c.fuel[i] === 3 && c.windSpeed >= 8 && !c.rain && rng.chance(0.01)) {
      const dist = rng.int(2, 5) * 8,
        nx = x + Math.sin(c.wind) * dist,
        nz = z + Math.cos(c.wind) * dist;
      if (c.fuel[cellAt(nx, nz)] && c.fire[cellAt(nx, nz)] === 1) {
        next.push(cellAt(nx, nz));
        mark(w, 'ember jump');
      }
    }
  }
  for (const i of [...new Set(next)].sort((a, b) => a - b)) {
    const [x, z] = cellPoint(i);
    ignite(w, x, z);
  }
  for (const p of people(w)) {
    if (
      p.health.hp <= 0 ||
      (c.mode === 'story' && c.contract === 0 && c.step === 3 && c.buddies.some((b) => b.entity === p.id)) ||
      c.buddies.some((b) => b.entity === p.id && b.fallen > 0)
    )
      continue;
    const i = cellAt(p.actor.x, p.actor.z);
    if (c.fire[i] === 2 && (!p.seat || !cheat(w, 'god'))) {
      damage(w, p, { amount: value(w, 'fire.damage') / 4, from: [p.actor.x, p.actor.y, p.actor.z] });
      if (p.soldier) p.soldier.data.state = 'Panic';
    }
  }
}
export function windStep(w: GW): void {
  const c = campaign(w),
    interval = Math.round(value(w, 'wind.shiftMinutes') * 3600);
  if (c.flags.windInterval !== interval) {
    c.flags.windInterval = interval;
    c.windNext = w.tick + interval;
  }
  c.windSpeed =
    value(w, 'wind.speed') + Math.sin(w.tick / 180) * 1.5 + (c.mode === 'story' && c.contract === 4 ? 4 : 0);
  if (w.tick === c.windNext - Math.min(1800, Math.round(interval / 2))) {
    c.windTo = c.wind + w.rng('wind').range(-1.9, 1.9);
    w.emit('forecast', { direction: c.windTo });
  }
  if (w.tick >= c.windNext) {
    const d = Math.atan2(Math.sin(c.windTo - c.wind), Math.cos(c.windTo - c.wind));
    c.wind += d / Math.max(1, 1200 - (w.tick - c.windNext));
    if (w.tick >= c.windNext + 1200) {
      c.wind = c.windTo;
      c.windNext = w.tick + interval;
      mark(w, 'wind shift');
    }
  }
  if (w.tick % Math.max(1, Math.round(value(w, 'day.minutes') * 3600)) === 0 && w.tick > 0) {
    c.rain = 5400;
    w.emit('thunder', {});
  }
  if (c.rain > 0) c.rain--;
}
