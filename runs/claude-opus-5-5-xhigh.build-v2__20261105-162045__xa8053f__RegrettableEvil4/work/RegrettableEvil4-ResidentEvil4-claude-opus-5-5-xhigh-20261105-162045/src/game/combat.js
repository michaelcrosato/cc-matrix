// Shots, hit zones and melee. Zones are cached from joints after animation, in Enemy.updateZones.
import { THREE } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { app } from '../core/app.js';

const { Vector3 } = THREE;
export const BULLET_IGNORE = ['player', 'enemy', 'water', 'noBullet', 'companion'];

const v1 = new Vector3(); const v2 = new Vector3(); const v3 = new Vector3();

/** Ray against a sphere: distance along the ray or null. */
export function raySphere(o, d, c, r) {
  const ox = c.x - o.x; const oy = c.y - o.y; const oz = c.z - o.z;
  const t = ox * d.x + oy * d.y + oz * d.z;
  if (t < 0) return null;
  const dx = o.x + d.x * t - c.x; const dy = o.y + d.y * t - c.y; const dz = o.z + d.z * t - c.z;
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 > r * r) return null;
  return Math.max(0, t - Math.sqrt(r * r - d2));
}

/** Ray against a capsule: closest approach of ray and segment. */
export function rayCapsule(o, d, a, b, r) {
  const ux = d.x; const uy = d.y; const uz = d.z;
  const vx = b.x - a.x; const vy = b.y - a.y; const vz = b.z - a.z;
  const wx = o.x - a.x; const wy = o.y - a.y; const wz = o.z - a.z;
  const A = ux * ux + uy * uy + uz * uz;
  const B = ux * vx + uy * vy + uz * vz;
  const C = vx * vx + vy * vy + vz * vz;
  const D = ux * wx + uy * wy + uz * wz;
  const E = vx * wx + vy * wy + vz * wz;
  const den = A * C - B * B;
  let s = den > 1e-6 ? (B * E - C * D) / den : 0;
  let t = den > 1e-6 ? (A * E - B * D) / den : (C > 1e-6 ? E / C : 0);
  if (t < 0) { t = 0; s = -D / A; } else if (t > 1) { t = 1; s = (B - D) / A; }
  if (s < 0) return null;
  const px = o.x + ux * s - (a.x + vx * t);
  const py = o.y + uy * s - (a.y + vy * t);
  const pz = o.z + uz * s - (a.z + vz * t);
  const d2 = px * px + py * py + pz * pz;
  if (d2 > r * r) return null;
  return Math.max(0, s - Math.sqrt(r * r - d2));
}

/** Nearest zone of an enemy under the ray, or null. Head first on near-ties. */
export function zoneOnRay(enemy, o, d, headBonus = 0) {
  if (enemy.dead) return null;
  if (enemy.d?.crawler) {
    const t = raySphere(o, d, v3.set(enemy.x, enemy.y + 0.12, enemy.z), 0.3);
    return t === null ? null : { zone: 'torso', t, part: 'torso' };
  }
  if (!enemy.zonesReady) return null;
  const z = enemy.zones;
  // Quick reject on a sphere round the body.
  const quick = raySphere(o, d, z.center, z.radius);
  if (quick === null) return null;
  let best = null; let bt = Infinity;
  const test = (zone, t, part) => { if (t !== null && t < bt) { bt = t; best = zone; z.part = part; } };
  test('head', raySphere(o, d, z.head.c, z.head.r + headBonus), 'head');
  test('torso', rayCapsule(o, d, z.torso.a, z.torso.b, z.torso.r), 'torso');
  for (const a of z.arms) test('arm', rayCapsule(o, d, a.a, a.b, a.r), a.side);
  for (const l of z.legs) test('leg', rayCapsule(o, d, l.a, l.b, l.r), l.side);
  if (!best) return null;
  return { zone: best, t: bt };
}

/** Find what a ray hits. `shootables` are spheres (Tannoys, thrown things, sacs, valves). */
export function traceShot(area, o, d, { max = 80, skip = null, headBonus = 0 } = {}) {
  const world = area.ctx.physics.castRay(o, d, max, BULLET_IGNORE);
  let limit = world ? world.distance : max;
  let hit = world ? { kind: 'world', t: world.distance, collider: world.collider, normal: world.normal, point: world.point } : null;
  for (const s of area.shootables) {
    if (!s.active) continue;
    const t = raySphere(o, d, s.pos, s.radius);
    if (t !== null && t < limit) { limit = t; hit = { kind: 'shootable', t, shootable: s }; }
  }
  for (const e of area.enemies) {
    if (skip && skip.includes(e)) continue;
    const r = zoneOnRay(e, o, d, headBonus);
    if (r && r.t < limit) { limit = r.t; hit = { kind: 'enemy', t: r.t, enemy: e, zone: r.zone, part: e.zones?.part ?? 'torso' }; }
  }
  for (const a of area.friendlies) {
    if (a.zonesReady && a.shootable) {
      const r = zoneOnRay(a, o, d, 0);
      if (r && r.t < limit) { limit = r.t; hit = { kind: 'friendly', t: r.t, friend: a }; }
    }
  }
  return hit;
}

/** A body-part damage multiplier. */
export const ZONE_DAMAGE = { head: 2, torso: 1, arm: 0.7, leg: 0.7 };

/** Fire one weapon. `by` is the player (or a remote seat on the host). */
export function fireWeapon(area, by, stats, o, d, rng) {
  const out = { hits: 0, heads: 0, kills: 0 };
  const pellets = stats.pellets ?? 1;
  const assist = by.isLocal && app.device.kind === 'pad' ? 0.03 : 0;
  for (let i = 0; i < pellets; i++) {
    const dir = v1.copy(d);
    if (pellets > 1) {
      const cone = ((stats.cone ?? 5) * Math.PI) / 180;
      const a = rng.range(0, Math.PI * 2); const r = cone * Math.sqrt(rng.next());
      const right = v2.set(d.z, 0, -d.x).normalize();
      const up = v3.crossVectors(right, d).normalize();
      dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    }
    let pierce = stats.pierce ?? 0;
    const skip = [];
    let guard = 0;
    while (guard++ < 12) {
      const hit = traceShot(area, o, dir, { skip, headBonus: assist });
      if (!hit) { area.fx.tracerEnd(o, dir, 40); break; }
      area.fx.lastImpact.copy(o).addScaledVector(dir, hit.t);
      if (hit.kind === 'world') {
        area.onWorldHit(hit, dir, stats, by);
        break;
      }
      if (hit.kind === 'shootable') {
        hit.shootable.onHit({ by, damage: damageOf(stats, 1, hit.t), weapon: stats.id, t: hit.t, point: area.fx.lastImpact });
        out.hits++;
        if (!hit.shootable.solid) { skip.push(hit.shootable); }
        break;
      }
      if (hit.kind === 'friendly') {
        hit.friend.onFriendlyFire?.(stats, hit.t, dir, by);
        break;
      }
      // An enemy.
      const e = hit.enemy;
      const dmg = damageOf(stats, ZONE_DAMAGE[hit.zone], hit.t);
      const r = e.hit({ zone: hit.zone, part: hit.part, damage: dmg, weapon: stats, dir, t: hit.t, point: area.fx.lastImpact, by, pellets });
      out.hits++;
      if (hit.zone === 'head') out.heads++;
      if (r?.killed) out.kills++;
      if (pierce > 0) { pierce--; skip.push(e); continue; }
      break;
    }
  }
  return out;
}

function damageOf(stats, zoneMul, t) {
  let dmg = stats.damage * TUNING.weaponDamage * zoneMul;
  if (stats.falloff && t > stats.falloff) dmg *= Math.max(0.25, 1 - (t - stats.falloff) / 14);
  if (app.dev.oneHit) dmg = 9999;
  return dmg;
}

/** Blast: damage and knockdown to everyone in radius, crates and barrels too. */
export function explode(area, x, y, z, radius, damage, { by = null, knock = true, hurtPlayer = true } = {}) {
  const { ctx } = area;
  for (const e of [...area.enemies]) {
    if (e.dead) continue;
    const dist = Math.hypot(e.x - x, e.z - z);
    if (dist > radius || Math.abs(e.y - y) > 3) continue;
    const dmg = damage * (1 - (dist / radius) * 0.5);
    const dir = v1.set(e.x - x, 0.3, e.z - z).normalize();
    e.blast(dmg, dir, knock);
  }
  if (hurtPlayer) {
    for (const p of area.players) {
      if (!p.alive || p.remote) continue;
      const dist = Math.hypot(p.x - x, p.z - z);
      if (dist < radius && Math.abs(p.y - y) < 2.5) p.hurt(damage * 0.6 * (1 - (dist / radius) * 0.5), { x, z }, { knock: dist < radius * 0.7, explosive: true });
    }
  }
  for (const f of area.friendlies) {
    const dist = Math.hypot(f.x - x, f.z - z);
    if (dist < radius && f.hurt) f.hurt(damage * 0.4, 'blast');
  }
  for (const c of area.level.crates) {
    if (c.broken) continue;
    if (Math.hypot(c.x - x, c.z - z) < radius) area.breakCrate(c, { by, chain: true });
  }
  area.fx.explosion(x, y, z, radius);
}

/** The roundhouse: 120 degree cone in front of the kicker. */
export function kickCone(area, by, target) {
  const f = by.facing;
  const fx = Math.sin(f); const fz = Math.cos(f);
  let hits = 0;
  const R = TUNING.kickRadius;
  for (const e of [...area.enemies]) {
    if (e.dead) continue;
    const dx = e.x - by.x; const dz = e.z - by.z;
    const dist = Math.hypot(dx, dz);
    if (dist > R + 0.4 || Math.abs(e.y - by.y) > 1.5) continue;
    const dot = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
    if (dot < Math.cos((60 * Math.PI) / 180) && e !== target) continue;
    const base = e === target ? TUNING.kickDamage + 15 : TUNING.kickDamage;
    e.kicked(base, by);
    hits++;
  }
  return hits;
}

export function takedownBurst(area, by, target) {
  for (const e of [...area.enemies]) {
    if (e.dead || e === target) continue;
    if (Math.hypot(e.x - target.x, e.z - target.z) < 1.5) e.knockdown(v1.set(e.x - target.x, 0, e.z - target.z).normalize());
  }
  target.hit({ zone: 'torso', part: 'torso', damage: 60, weapon: { id: 'melee' }, dir: v1.set(Math.sin(by.facing), 0, Math.cos(by.facing)), t: 1, point: target.pos3(), by, melee: true });
  if (!target.dead) target.knockdown(v1);
}

/** Knife: short arc, free crate-breaking, x3 on the downed. */
export function knifeArc(area, by, knife) {
  const f = by.facing;
  const fx = Math.sin(f); const fz = Math.cos(f);
  let n = 0;
  for (const e of [...area.enemies]) {
    if (e.dead) continue;
    const dx = e.x - by.x; const dz = e.z - by.z;
    const dist = Math.hypot(dx, dz);
    if (dist > knife.reach + 0.3 || Math.abs(e.y - by.y) > 1.2) continue;
    if ((dx * fx + dz * fz) / Math.max(0.01, dist) < Math.cos(knife.arc * 0.5)) continue;
    const down = e.isDown();
    e.hit({ zone: 'torso', part: 'torso', damage: knife.damage * (down ? knife.downed : 1) * TUNING.weaponDamage, weapon: { id: 'knife' }, dir: v1.set(fx, 0, fz), t: dist, point: e.pos3(), by, melee: true });
    n++;
  }
  for (const c of area.level.crates) {
    if (c.broken) continue;
    const dx = c.x - by.x; const dz = c.z - by.z;
    const dist = Math.hypot(dx, dz);
    if (dist < knife.reach + 0.4 && (dx * fx + dz * fz) / Math.max(0.01, dist) > 0.4) { if (c.kind !== 'brine') { area.breakCrate(c, { by }); n++; } }
  }
  return n;
}
