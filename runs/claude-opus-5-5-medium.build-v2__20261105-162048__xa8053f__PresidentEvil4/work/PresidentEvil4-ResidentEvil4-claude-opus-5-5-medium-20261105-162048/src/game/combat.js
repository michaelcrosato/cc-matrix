// Ray tests against hit zones and shootables. Damage, stagger, kicks, explosions.
import { THREE } from '../../pixel-engine.js';
const a = new THREE.Vector3(), b = new THREE.Vector3(), w = new THREE.Vector3(), u = new THREE.Vector3();
/** Distance along a unit ray to a sphere, or null. */
export function raySphere(o, d, c, r) {
  const mx = o.x - c.x, my = o.y - c.y, mz = o.z - c.z, B = mx * d.x + my * d.y + mz * d.z, C = mx * mx + my * my + mz * mz - r * r;
  if (C > 0 && B > 0) return null; const D = B * B - C; if (D < 0) return null; const t = -B - Math.sqrt(D); return t < 0 ? 0 : t;
}
/** Distance along a unit ray to a capsule (segment p-q, radius r), or null. Closest approach of two lines. */
export function rayCapsule(o, d, p, q, r) {
  u.subVectors(q, p); w.subVectors(o, p); const A = u.dot(u), B = u.dot(d), D = u.dot(w), E = d.dot(w), den = A - B * B;
  let s = den > 1e-6 ? (D - B * E) / den : 0; s = Math.max(0, Math.min(1, s));
  a.copy(p).addScaledVector(u, s);
  return raySphere(o, d, a, r);
}
/** Nearest zone of one enemy hit by a ray: {t, zone}. */
export function rayEnemy(o, d, e, assistHead = 0) {
  const z = e.zones; if (!z) return null; let best = null;
  const check = (t, zone) => { if (t != null && (!best || t < best.t)) best = { t, zone }; };
  check(raySphere(o, d, z.head, z.headR + assistHead), 'head');
  if (e.crawler) return best;
  check(rayCapsule(o, d, z.pelvis, z.neck, z.torsoR), 'torso');
  check(rayCapsule(o, d, z.armRa, z.armRb, z.armR), 'arm'); check(rayCapsule(o, d, z.armLa, z.armLb, z.armR), 'arm');
  check(rayCapsule(o, d, z.legRa, z.legRb, z.legR), 'leg'); check(rayCapsule(o, d, z.legLa, z.legLb, z.legR), 'leg');
  return best;
}
export const ZONE_MULT = { head: 2, torso: 1, arm: 0.7, leg: 0.7 };
/** Cast one shot through the world. Returns ordered hits: [{t, enemy, zone}|{t, shootable}] then wall. */
export function castShot(area, o, d, maxPierce = 0, range = 80, assistHead = 0, ignore = null) {
  const hits = []; const world = area.ctx.physics.castRay(o, d, range, ['player', 'enemy', 'noBullet']); const wallT = world ? world.distance : range;
  for (const e of area.enemies) { if (e.dead || e === ignore) continue; const r = rayEnemy(o, d, e, assistHead); if (r && r.t < wallT) hits.push({ t: r.t, enemy: e, zone: r.zone }); }
  for (const s of area.shootables) { if (s.dead) continue; const t = raySphere(o, d, s.pos, s.r); if (t != null && t < wallT + (s.through ?? 0.4)) hits.push({ t, shootable: s }); }
  if (area.boss?.rayParts) for (const h of area.boss.rayParts(o, d)) if (h.t < wallT) hits.push(h);
  hits.sort((x, y) => x.t - y.t);
  return { hits, world, wallT };
}
export const pointAt = (o, d, t, out = new THREE.Vector3()) => out.copy(o).addScaledVector(d, t);
