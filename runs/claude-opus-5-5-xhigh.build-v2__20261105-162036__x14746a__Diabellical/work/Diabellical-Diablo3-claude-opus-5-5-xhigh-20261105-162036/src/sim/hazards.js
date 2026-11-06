// Things that hurt heroes on the ground: telegraphs, pools, expanding rings. All dodge through.
import { DT, clamp, dist, ev, nextId, setCellOpen } from './core.js';
import { hurtHero } from './hero.js';
import { hurtAlly } from './monsters.js';

export function spawnEnemyArea(w, x, z, o) {
  const a = { id: nextId(w), team: 1, kind: o.kind, x, z, r: o.r, life: o.life, t: 0, tick: o.tick ?? 0.5, nextTick: 0.2, dps: o.dps ?? 0, root: o.root ?? 0 };
  w.areas.push(a);
  ev(w, { t: 'area', id: a.id, k: a.kind, x, z, r: a.r, life: a.life, team: 1 });
  return a;
}

/** A growing red ring. At the end it hits everyone inside and applies its extras. */
export function telegraphRing(w, x, z, r, delay, dmg, o = {}) {
  const d = Math.max(0.6, delay);
  const a = { id: nextId(w), team: 1, kind: 'tele_ring', x, z, r, life: d, t: 0, dmg, o, nextTick: Infinity, tick: 1 };
  if (o.follow) a.followM = o.follow;
  w.areas.push(a);
  ev(w, { t: 'tele', id: a.id, sh: 'ring', x, z, r, life: d, follow: o.follow?.id ?? 0 });
  return a;
}

export function telegraphLine(w, x, z, dx, dz, len, width, delay, dmg, o = {}) {
  const d = Math.max(0.6, delay);
  const a = { id: nextId(w), team: 1, kind: 'tele_line', x, z, dx, dz, len, width, r: len, life: d, t: 0, dmg, o, nextTick: Infinity, tick: 1 };
  w.areas.push(a);
  ev(w, { t: 'tele', id: a.id, sh: 'line', x, z, dx, dz, len, w: width, life: d });
  return a;
}

/** An expanding ring with an optional gap (radians, centred on gapA). Roll through it, or stand in the gap. */
export function spawnWave(w, x, z, o) {
  const a = { id: nextId(w), team: 1, kind: 'wave', x, z, r: o.maxR, life: o.maxR / o.speed, t: 0, speed: o.speed, thick: o.thick ?? 0.7, dmg: o.dmg, gapA: o.gapA ?? 0, gapW: o.gapW ?? 0, hit: new Set(), nextTick: Infinity, tick: 1 };
  w.areas.push(a);
  ev(w, { t: 'wave', id: a.id, x, z, sp: a.speed, max: a.r, gapA: a.gapA, gapW: a.gapW, el: o.el ?? 'sound' });
  ev(w, { t: 'sfx', k: 'wave', x, z });
  return a;
}

function resolveTelegraph(w, a) {
  const o = a.o;
  const hitBy = (h) => {
    if (a.kind === 'tele_ring') return dist(h.x, h.z, a.x, a.z) <= a.r + h.r * 0.5;
    const px = h.x - a.x, pz = h.z - a.z;
    const along = px * a.dx + pz * a.dz;
    if (along < -0.5 || along > a.len) return false;
    return Math.abs(px * a.dz - pz * a.dx) <= a.width / 2 + h.r * 0.5;
  };
  if (o.vfx || o.sfx || o.shake) ev(w, { t: 'fx', k: o.vfx ?? '', s: o.sfx ?? '', sh: o.shake ?? 0, x: a.x, z: a.z, r: a.r, dx: a.dx ?? 0, dz: a.dz ?? 0 });
  if (o.src?.dead && a.kind === 'tele_line' && o.onHit) return;
  for (const h of w.heroes) {
    if (h.dead || h.gone || !hitBy(h)) continue;
    if (h.state === 'dodge' || h.invuln > 0 || h.state === 'leap') { ev(w, { t: 'dodged', id: h.id }); continue; }
    if (a.dmg > 0) hurtHero(w, h, a.dmg, { src: o.src ?? null, knockFrom: o.knock ? a : null, knock: o.knock ?? 0, el: o.el });
    if (o.root && !h.dead) h.rooted = Math.max(h.rooted ?? 0, o.root);
    if (o.stun && !h.dead) h.stunned = Math.max(h.stunned ?? 0, o.stun);
    o.onHit?.(h);
  }
  for (const ally of w.allies) {
    if (ally.def.static || !hitBy(ally)) continue;
    if (a.dmg > 0) hurtAlly(w, ally, a.dmg);
  }
  if (o.pool) spawnEnemyArea(w, a.x, a.z, o.pool);
  if (o.entomb) entomb(w, a.x, a.z, a.r, o.entomb);
  if (o.then) o.then(w, a);
}

function entomb(w, x, z, r, life) {
  const cells = [];
  const cx = Math.floor(x), cz = Math.floor(z);
  const R = Math.max(2, Math.round(r));
  for (let i = -R; i <= R; i++) {
    for (let j = -R; j <= R; j++) {
      const d = Math.hypot(i, j);
      if (d < R - 0.5 || d > R + 0.5) continue;
      const col = cx + i, row = cz + j;
      if (!w.zone.nav.isOpen(col, row)) continue;
      cells.push([col, row]);
    }
  }
  // Leave a body-width gap so nobody is trapped for good if the timer is long.
  const o = { id: nextId(w), x, z, cells: [], life, kind: 'bone_wall' };
  for (const [col, row] of cells) {
    if (w.heroes.some((h) => Math.floor(h.x) === col && Math.floor(h.z) === row)) continue;
    setCellOpen(w, col, row, false);
    o.cells.push([col, row]);
  }
  w.obstacles.push(o);
  ev(w, { t: 'obst', id: o.id, k: 'bone_wall', x, z, cells: o.cells, life });
}

export function stepEnemyArea(w, a, i) {
  a.t += DT;
  if (a.kind === 'tele_ring' || a.kind === 'tele_line') {
    if (a.followM) { a.x = a.followM.x; a.z = a.followM.z; }
    if (a.t >= a.life) {
      w.areas.splice(i, 1);
      ev(w, { t: 'telex', id: a.id });
      if (!(a.o.follow && a.o.follow.dead && a.o.cancelOnDeath)) resolveTelegraph(w, a);
    }
    return;
  }
  if (a.kind === 'wave') {
    const rad = a.speed * a.t;
    for (const h of w.heroes) {
      if (h.dead || h.gone || a.hit.has(h.id)) continue;
      const d = dist(h.x, h.z, a.x, a.z);
      if (Math.abs(d - rad) > a.thick) continue;
      if (a.gapW > 0) {
        let da = Math.atan2(h.z - a.z, h.x - a.x) - a.gapA;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        if (Math.abs(da) < a.gapW / 2) continue;
      }
      a.hit.add(h.id);
      if (h.state === 'dodge' || h.invuln > 0 || h.state === 'leap') { ev(w, { t: 'dodged', id: h.id }); continue; }
      hurtHero(w, h, a.dmg, { src: null, el: 'sound' });
    }
    if (a.t >= a.life) { w.areas.splice(i, 1); ev(w, { t: 'areax', id: a.id }); }
    return;
  }
  // Pools and patches.
  if (a.t >= a.nextTick) {
    a.nextTick += a.tick;
    for (const h of w.heroes) {
      if (h.dead || h.gone) continue;
      if (dist(h.x, h.z, a.x, a.z) <= a.r) {
        hurtHero(w, h, a.dps * a.tick, { dot: true, src: null });
        if (a.root) h.rooted = Math.max(h.rooted ?? 0, a.root);
      }
    }
    for (const ally of w.allies) if (!ally.def.static && dist(ally.x, ally.z, a.x, a.z) <= a.r) hurtAlly(w, ally, a.dps * a.tick);
  }
  if (a.t >= a.life) { w.areas.splice(i, 1); ev(w, { t: 'areax', id: a.id }); }
}

export const clampUnused = clamp;
