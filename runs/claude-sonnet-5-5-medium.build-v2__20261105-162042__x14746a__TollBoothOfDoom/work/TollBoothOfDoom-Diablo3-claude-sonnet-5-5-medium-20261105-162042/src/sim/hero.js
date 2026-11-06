// Hero per-tick logic: statuses, resource, movement, dodge, potion, casting, damage taken, death and revive.
import { CLASSES } from '../data/classes.js';
import { DT, ev, nid, moveBy, walkable, heal, diff, livingHeroes, monstersNear, refreshStats, snapToFloor, allyMinions, dropGold } from './core.js';
import { canCast, startCast, tickCast, tickHeroMotion, skillSpec } from './effects.js';
import { tickPowers, modifyIncomingFatal, onHeroDamaged, onPickupGold } from './powers.js';
import { reduction, clamp } from './stats.js';
import { RARITIES } from '../data/items.js';
import { isUpgrade } from './items.js';

export function aimFor(w, h, intent, range = 14) {
  if (intent && intent.ax != null && intent.az != null && !intent.soft) return { x: intent.ax, z: intent.az };
  // soft lock: best monster within 120 deg of facing
  let best = null, bd = 1e9;
  const fx = Math.sin(h.facing), fz = Math.cos(h.facing);
  for (const m of monstersNear(w, h.x, h.z, range)) {
    if (m.dead || (m.team && m.team !== 'monster') || m.state === 'dormant' && m.type === 'gargoyle') continue;
    const dx = m.x - h.x, dz = m.z - h.z, d = Math.hypot(dx, dz) || 1;
    const dot = (dx * fx + dz * fz) / d;
    if (dot < 0.5) continue;
    const score = d * (2 - dot);
    if (score < bd) { bd = score; best = m; }
  }
  h.softTarget = best ? best.id : 0;
  if (intent && intent.ax != null && intent.soft) { // right stick override
    return { x: h.x + intent.ax * 8, z: h.z + intent.az * 8 };
  }
  if (best) return { x: best.x, z: best.z };
  return { x: h.x + fx * 8, z: h.z + fz * 8 };
}

export function hurtHero(w, h, amt, from, src) {
  if (!h.alive) return false;
  if (h.inv_t > 0 || h.dodgeT > 0) return false;
  if (h.devFlags && h.devFlags.god) return false;
  if (h.invisible) return false;
  const lvl = src && src.level ? src.level : w.zoneDef ? w.zoneDef.level : 1;
  let red = reduction(h.stats.armour, lvl);
  for (const a of w.areas) if (a.kind === 'zone' && a.reduce && a.ally && Math.hypot(a.x - h.x, a.z - h.z) < a.r) red = Math.min(0.85, red + a.reduce);
  let dmg = Math.max(1, Math.round(amt * (1 - red)));
  if (h.lastLifeShield && h.lastLifeShield > w.t) dmg = 0;
  if (h.hp - dmg <= 0 && modifyIncomingFatal(w, h)) return true;
  h.hp -= dmg; h.lastDamaged = w.t; h.lastCombat = w.t;
  ev(w, { t: 'hurt', id: h.id, seat: h.seat, x: h.x, z: h.z, amt: dmg, fx: from ? from.x : h.x, fz: from ? from.z : h.z });
  if (src) onHeroDamaged(w, h, src, dmg);
  if (h.hp <= 0) killHero(w, h);
  return true;
}

export function killHero(w, h) {
  h.hp = 0; h.alive = false; h.deaths++; h.cast = null; h.dash = null; h.leap = null; h.peal = null;
  h.recentDeaths = h.recentDeaths.filter((t) => w.t - t < 120); h.recentDeaths.push(w.t);
  h.respawnT = w.session ? 8 : Math.min(30, 5 + 5 * (h.recentDeaths.length - 1));
  h.diedAt = { x: h.x, z: h.z };
  ev(w, { t: 'heroDeath', id: h.id, seat: h.seat, x: h.x, z: h.z, name: h.name });
  if (w.hooks && w.hooks.onHeroDeath) w.hooks.onHeroDeath(w, h);
}
export function reviveHero(w, h, frac = 0.5, at = null) {
  h.alive = true; h.hp = Math.max(1, Math.round(h.maxHp * frac)); h.inv_t = 2;
  if (at) { h.x = at.x; h.z = at.z; snapToFloor(w, h); }
  ev(w, { t: 'revive', id: h.id, seat: h.seat, x: h.x, z: h.z });
}

function statusTick(w, h) {
  for (const k of ['stunT', 'rootT', 'slowT']) if (h[k] > 0) h[k] = Math.max(0, h[k] - DT);
  if (h.buffs.length) h.buffs = h.buffs.filter((b) => b.t > w.t);
}

export function stepHero(w, h, intent) {
  intent = intent || {};
  h.mx = 0; h.mz = 0;
  // cooldowns
  for (let i = 0; i < 6; i++) { if (h.cd[i] > 0) { h.cd[i] = Math.max(0, h.cd[i] - DT); if (h.cd[i] === 0 && h.charges[i] > 0 && h.charges[i] < (skillSpec(h, i)?.charges || 1)) { h.charges[i] = 0; } } }
  if (h.potionCd > 0) h.potionCd -= DT; if (h.dodgeCd > 0) h.dodgeCd -= DT; if (h.inv_t > 0) h.inv_t -= DT;
  if (h.dodgeT > 0) h.dodgeT -= DT;
  statusTick(w, h);
  if (!h.alive) {
    if (h.respawnT != null) { h.respawnT -= DT; if (h.respawnT <= 0 && !h.waitRevive) { h.respawnT = null; if (w.hooks && w.hooks.onRespawn) w.hooks.onRespawn(w, h); else reviveHero(w, h, 1); } }
    if (h.respawnT == null && w.session) reviveHero(w, h, 1);
    return;
  }
  const cls = CLASSES[h.cls];
  const s = h.stats;
  tickPowers(w, h);
  // regen & resource
  if (s.regen) heal(w, h, s.regen * DT, true);
  if (h.hp < h.maxHp && w.zone && w.zone.safe) heal(w, h, h.maxHp * 0.1 * DT, true);
  if (cls.regen) h.res = Math.min(h.resMax, h.res + cls.regen * w.tuning.resourceRegen * DT * (h.cls === 'lamplighter' && h.beaconRegen && h.beaconRegen > w.t ? 1.5 : 1));
  if (cls.drain && w.t - h.lastCombat > 4 && !(s.vowClamour && w.t - h.lastCombat < 12)) h.res = Math.max(0, h.res - cls.drain * DT);
  if (h.devFlags && h.devFlags.infRes) h.res = h.resMax;
  // revive allies
  if (intent.interactHold) { /* handled by world interact */ }
  // dodge
  if (intent.dodge && h.dodgeCd <= 0 && h.stunT <= 0 && !h.leap && !h.dash) {
    let dx = intent.mx, dz = intent.mz; const l = Math.hypot(dx, dz);
    if (l < 0.1) { dx = Math.sin(h.facing); dz = Math.cos(h.facing); } else { dx /= l; dz /= l; }
    h.dodgeT = 0.35; h.dodgeDir = [dx, dz]; h.dodgeCd = w.tuning.dodgeCooldown; h.cast = null; h.peal = null;
    h.facing = Math.atan2(dx, dz);
    ev(w, { t: 'dodge', id: h.id, seat: h.seat, x: h.x, z: h.z });
  }
  if (intent.potion && h.potionCd <= 0 && h.hp < h.maxHp) {
    h.potionCd = w.tuning.potionCooldown; heal(w, h, h.maxHp * 0.6); ev(w, { t: 'potion', id: h.id, seat: h.seat, x: h.x, z: h.z });
  }
  let speed = s.speed * w.tuning.playerSpeed;
  for (const b of h.buffs) if (b.speed) speed *= 1 + b.speed;
  if (h.slowT > 0) speed *= 0.8;
  if (h.devFlags && h.devFlags.noclip) h.noclip = true; else h.noclip = false;
  if (h.dodgeT > 0) {
    const k = 4.5 / 0.35 * DT;
    moveBy(w, h, h.dodgeDir[0] * k, h.dodgeDir[1] * k);
  } else {
    // aim & casting
    const aim = aimFor(w, h, intent);
    h.aimX = aim.x; h.aimZ = aim.z;
    if (!h.cast && h.stunT <= 0 && !h.dash && !h.leap) {
      for (let i = 0; i < 6; i++) if (intent.pressed && intent.pressed[i]) { if (startCast(w, h, i, aim)) break; }
      if (!h.cast) for (let i = 0; i < 6; i++) if (intent.held && intent.held[i]) { if (startCast(w, h, i, aim)) break; }
    }
    // movement
    const rooted = h.rootT > 0 || h.stunT > 0 || h.dash || h.leap;
    const castMoveOk = !h.cast || h.cast.spec.upper || (h.cast.fired && h.cast.t >= h.cast.wind + h.cast.rec * 0.5);
    let mx = intent.mx || 0, mz = intent.mz || 0; const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    if (!rooted && castMoveOk && ml > 0.05) {
      const sp = speed * (h.peal ? 0.8 : 1) * (h.cast && h.cast.spec.upper ? 0.85 : 1);
      moveBy(w, h, mx * sp * DT, mz * sp * DT);
      h.mx = mx; h.mz = mz;
      if (!h.cast) h.facing = Math.atan2(mx, mz);
      h.moving = true;
    } else h.moving = false;
    if (h.cast && h.cast.spec.upper && ml > 0.05) { /* aim facing kept */ }
    else if (h.cast) h.facing = Math.atan2(h.cast.dx, h.cast.dz);
    tickCast(w, h, intent);
  }
  tickHeroMotion(w, h);
  // keep inside
  if (!h.noclip && !walkable(w, h.x, h.z, 0.12)) snapToFloor(w, h);
}

export function pickupDrops(w, h) {
  if (!h.alive) return;
  const rad = w.tuning.pickupRadius + h.stats.pickup;
  for (const d of w.drops) {
    if (d.dead || (d.owner != null && d.owner !== h.seat && d.owner !== -1)) continue;
    const dist = Math.hypot(d.x - h.x, d.z - h.z);
    if (d.kind === 'gold') {
      if (dist < rad) { d.x += (h.x - d.x) * 0.2; d.z += (h.z - d.z) * 0.2; if (dist < 0.8) { d.dead = true; h.gold += d.v; h.goldFound += d.v; ev(w, { t: 'gold', seat: h.seat, v: d.v, x: d.x, z: d.z }); onPickupGold(w, h); } }
    } else if (d.kind === 'tallow') {
      if (dist < 1.2) { d.dead = true; heal(w, h, h.maxHp * 0.2); ev(w, { t: 'tallow', seat: h.seat, x: d.x, z: d.z }); }
      else if (dist < rad * 0.6) { d.x += (h.x - d.x) * 0.1; d.z += (h.z - d.z) * 0.1; }
    } else if (d.kind === 'item' || d.kind === 'gem') {
      if (dist < 1.0) {
        if (d.kind === 'gem') { h.gems.push(d.gem); d.dead = true; ev(w, { t: 'pickup', seat: h.seat, name: 'Gem', color: 'cyan', x: d.x, z: d.z }); continue; }
        if (h.inv.length >= 40) { if (!d.warned || w.t - d.warned > 3) { d.warned = w.t; ev(w, { t: 'toast', seat: h.seat, text: 'INVENTORY FULL' }); } continue; }
        d.dead = true; h.inv.push(d.item);
        const up = isUpgrade(h, d.item);
        if (up) h.upgrade = d.item.uid;
        ev(w, { t: 'pickup', seat: h.seat, name: d.item.name, rarity: d.item.rarity, upgrade: up, uid: d.item.uid, x: d.x, z: d.z, item: d.item.uid });
        if (w.hooks && w.hooks.onPickup) w.hooks.onPickup(w, h, d.item);
      }
    } else if (d.kind === 'coin') { // coins stolen by the Bursar
      if (dist < 1.0) { d.dead = true; h.gold += d.v; heal(w, h, h.maxHp * 0.03); ev(w, { t: 'gold', seat: h.seat, v: d.v, x: d.x, z: d.z }); }
    }
  }
}

/** Equip an inventory item by uid. Returns the replaced item or null. */
export function equipItem(w, h, uid) {
  const i = h.inv.findIndex((it) => it.uid === uid);
  if (i < 0) return null;
  const it = h.inv[i];
  if (it.cls && it.cls !== h.cls) return null;
  if (it.slot === 'main' && !CLASSES[h.cls].weapons.includes(it.base)) return null;
  if (it.slot === 'off' && !CLASSES[h.cls].offhands.includes(it.base)) return null;
  const old = h.gear[it.slot] || null;
  h.gear[it.slot] = it;
  h.inv.splice(i, 1);
  if (old) h.inv.push(old);
  if (h.upgrade === uid) h.upgrade = 0;
  refreshStats(w, h);
  ev(w, { t: 'equip', seat: h.seat, uid, slot: it.slot });
  return old;
}
export function unequip(w, h, slot) {
  if (!h.gear[slot] || h.inv.length >= 40) return false;
  h.inv.push(h.gear[slot]); h.gear[slot] = null; refreshStats(w, h); return true;
}
