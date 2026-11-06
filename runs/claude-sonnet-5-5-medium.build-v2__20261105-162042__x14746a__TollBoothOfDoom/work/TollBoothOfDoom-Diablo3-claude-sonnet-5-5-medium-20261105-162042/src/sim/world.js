// stepWorld: the whole simulation at 60 Hz. Zones, spawns, areas, interaction.
import { NavGrid } from '../../pixel-engine.js';
import { MONSTERS, AFFLICTION_IDS, ELITE_NAMES } from '../data/monsters.js';
import { ZONES } from '../data/zones.js';
import { CLASSES } from '../data/classes.js';
import { generateZone } from './zonegen.js';
import { DT, ev, nid, createWorld, makeHero, refreshStats, spawnMonster, monsterLevel, livingHeroes, heal, monstersNear, snapToFloor, dealToMonster, killMonster, heroHit, stun, dropGold, dropItem, diff, giveXp, walkable, partyLevel, allyMinions, applyStatus } from './core.js';
import { stepHero, pickupDrops, hurtHero, reviveHero, aimFor } from './hero.js';
import { stepMonsters } from './monsters.js';
import { tickShots, runOp } from './effects.js';
import { rollDrop, makeItem } from './items.js';
import { clamp } from './stats.js';
import { LEGENDARY_IDS } from '../data/items.js';

export { createWorld, makeHero };

const isFoe = (m) => !m.dead && (!m.team || m.team === 'monster');

export function stepWorld(w, intents = {}) {
  if (w.frozen) return;
  w.tick++; w.t += DT;
  if (!w.zone) return;
  for (const h of w.heroes) { if (h.gone) continue; stepHero(w, h, intents[h.seat] || null); }
  if (w.hooks && w.hooks.preMonsters) w.hooks.preMonsters(w);
  stepMonsters(w);
  tickShots(w);
  stepAreas(w);
  for (const h of w.heroes) if (!h.gone) pickupDrops(w, h);
  for (const d of w.drops) { d.t += DT; if (d.kind === 'gold' && d.t > 120) d.dead = true; }
  if (w.drops.some((d) => d.dead)) w.drops = w.drops.filter((d) => !d.dead);
  // interactions
  for (const h of w.heroes) if (!h.gone && h.alive) interactTick(w, h, intents[h.seat] || null);
  // rise from death: revive by allies
  reviveTick(w, intents);
  // monster resonance decay
  for (const m of w.monsters) if (m.status.resonance) { m.status.resonance.t -= DT; if (m.status.resonance.t <= 0) m.status.resonance = null; }
  if (w.hooks && w.hooks.post) w.hooks.post(w);
  if (w.tick % 60 === 0 && w.events.length > 4000) w.events.splice(0, w.events.length - 2000);
}
export function drainEvents(w) { const e = w.events; w.events = []; return e; }

// ---------------- areas ----------------
function stepAreas(w) {
  const keep = [];
  for (const a of w.areas) {
    a.t -= DT;
    const owner = a.hid ? w.heroes.find((q) => q.id === a.hid) : null;
    switch (a.kind) {
      case 'grave': break;
      case 'decoy': break;
      case 'zone': zoneTick(w, a, owner); break;
      case 'lobbed': if (a.t <= 0) lobBurst(w, a, owner); break;
      case 'obstacle_fall': if (a.t <= 0) obstacleLand(w, a, owner); break;
      case 'turret': turretTick(w, a, owner); break;
      case 'comets': cometTick(w, a, owner); break;
      case 'comet': if (a.t <= 0) { const list = monstersNear(w, a.x, a.z, a.r).filter(isFoe); for (const m of list) heroHit(w, owner || w.heroes[0], m, a.dmg, { el: a.el, burn: a.burn, area: true, knock: 1, fromX: a.x, fromZ: a.z }); ev(w, { t: 'fx', name: 'ring_flame', x: a.x, z: a.z, r: a.r, shock: true }); ev(w, { t: 'shake', amt: 0.15 }); ev(w, { t: 'sfx', name: 'boom', x: a.x, z: a.z }); } break;
      case 'timer': if (a.t <= 0 && owner) { const c = a.ctx; c.ox = owner.x; c.oz = owner.z; runOp(w, owner, a.then, c); if (a.then.sfx) ev(w, { t: 'sfx', name: a.then.sfx, x: owner.x, z: owner.z }); if (a.then.shake) ev(w, { t: 'shake', amt: a.then.shake }); } break;
      case 'finale': if (a.t <= 0 && owner) { for (const m of allyMinions(w, owner.seat)) { for (const o of monstersNear(w, m.x, m.z, 3)) if (isFoe(o)) dealToMonster(w, owner, o, Math.round(owner.stats.weaponDps * a.dmg * w.tuning.playerDamage), { el: 'grave' }); ev(w, { t: 'fx', name: 'puff_grave', x: m.x, z: m.z, r: 3 }); m.dead = true; } } break;
      case 'hostile_ring': { const k = 1 - Math.max(0, a.t) / a.dur; const r = a.r0 + (a.r1 - a.r0) * k; a.cur = r; for (const h of livingHeroes(w)) { const d = Math.hypot(h.x - a.x, h.z - a.z); if (!a.hit) a.hit = new Set(); if (!a.hit.has(h.id) && Math.abs(d - r) < 0.8) { a.hit.add(h.id); hurtHero(w, h, a.src.hit * a.dmg, { x: a.x, z: a.z }, a.src); } } break; }
      case 'hostile_fire': case 'poison_pool': { a.tick = (a.tick || 0) + DT; if (a.tick >= 0.5) { a.tick = 0; for (const h of livingHeroes(w)) if (Math.hypot(h.x - a.x, h.z - a.z) < a.r) { const src = a.src || { hit: 20 + 5 * partyLevel(w), level: partyLevel(w) }; hurtHero(w, h, (src.hit || 10) * (a.dps || 0.3) * 0.5, { x: a.x, z: a.z }, src); } } break; }
      case 'timed_blast': if (a.t <= 0) { for (const h of livingHeroes(w)) if (Math.hypot(h.x - a.x, h.z - a.z) < a.r) hurtHero(w, h, (6 + partyLevel(w) * 4) * (a.dmg || 1), { x: a.x, z: a.z }, { level: partyLevel(w) }); ev(w, { t: 'fx', name: 'ring_flame', x: a.x, z: a.z, r: a.r }); } break;
      case 'hostile_blast': if (a.t <= 0) { for (const h of livingHeroes(w)) if (Math.hypot(h.x - a.x, h.z - a.z) < a.r) hurtHero(w, h, a.src.hit * a.dmg, { x: a.x, z: a.z }, a.src); ev(w, { t: 'fx', name: a.vfx || 'ring_phys', x: a.x, z: a.z, r: a.r, shock: true }); ev(w, { t: 'shake', amt: a.shake ?? 0.3 }); ev(w, { t: 'sfx', name: a.sfx || 'slam', x: a.x, z: a.z }); if (a.after) a.after(w, a); } break;
      case 'hostile_line': if (a.t <= 0) { const dx = a.x2 - a.x, dz = a.z2 - a.z, L = Math.hypot(dx, dz) || 1; for (const h of livingHeroes(w)) { const px = ((h.x - a.x) * dx + (h.z - a.z) * dz) / L; const qx = Math.abs(((h.x - a.x) * -dz + (h.z - a.z) * dx) / L); if (px > 0 && px < L && qx < a.w) hurtHero(w, h, a.src.hit * a.dmg, { x: a.x, z: a.z }, a.src); } ev(w, { t: 'fx', name: 'line_hit', x: a.x, z: a.z, x2: a.x2, z2: a.z2 }); ev(w, { t: 'shake', amt: 0.2 }); } break;
      case 'timer_hostile': if (a.t <= 0) hostileTimer(w, a); break;
      case 'beams': beamTick(w, a); break;
      case 'trap': trapTick(w, a); break;
      case 'bone_wall': case 'obstacle': break;
      case 'script': if (a.t <= 0 && a.fn) a.fn(w, a); break;
      default: break;
    }
    if (a.t > 0 || a.kind === 'beams' || a.kind === 'trap') keep.push(a);
    else {
      if (a.kind === 'turret' && a.endBlast && owner) { for (const m of monstersNear(w, a.x, a.z, 4).filter(isFoe)) heroHit(w, owner, m, a.endBlast, { el: 'flame', burn: true, area: true }); ev(w, { t: 'fx', name: 'ring_flame', x: a.x, z: a.z, r: 4, shock: true }); }
      ev(w, { t: 'areaEnd', id: a.id, kind: a.kind, x: a.x, z: a.z });
    }
  }
  w.areas = keep;
}
function lobBurst(w, a, owner) {
  const op = a.op; if (!owner) return;
  const list = monstersNear(w, a.x, a.z, op.r).filter(isFoe);
  for (const m of list) { heroHit(w, owner, m, op.dmg, { el: op.el, burn: op.burn, status: op.status, area: true, fromX: a.x, fromZ: a.z, knock: 0.5, mult: a.mult }); if (op.slow) m.status.slow = { t: 2, dps: 0, acc: 0 }; }
  ev(w, { t: 'fx', name: 'ring_' + (op.el || 'phys'), x: a.x, z: a.z, r: op.r }); ev(w, { t: 'sfx', name: op.sfx || 'smash', x: a.x, z: a.z }); ev(w, { t: 'shake', amt: op.shake || 0.1 });
  if (op.pool) w.areas.push({ id: nid(w), kind: 'zone', x: a.x, z: a.z, r: op.r, t: op.pool.t, dur: op.pool.t, dps: op.pool.dps, el: op.el, burn: op.burn, owner: owner.seat, hid: owner.id, vfx: 'patch_fire', tick: 0, pull: op.dragPool ? 1 : 0, slow: op.slow });
}
function obstacleLand(w, a, owner) {
  const op = a.op;
  if (owner) for (const m of monstersNear(w, a.x, a.z, op.r).filter(isFoe)) heroHit(w, owner, m, op.dmg, { el: 'grave', stun: op.stun, area: true, fromX: a.x, fromZ: a.z, knock: 1, mult: a.mult });
  w.areas.push({ id: nid(w), kind: 'obstacle', x: a.x, z: a.z, r: 2.4, t: op.t, block: true, owner: a.owner });
  ev(w, { t: 'fx', name: 'coffin', x: a.x, z: a.z, r: 2.4, dur: op.t }); ev(w, { t: 'shake', amt: op.shake || 0.4 }); ev(w, { t: 'sfx', name: 'coffin', x: a.x, z: a.z });
  if (op.skeleton && owner) { const m = spawnMonster(w, 'skeleton', a.x + 1.5, a.z, { team: 'hero', owner: owner.seat, dormant: false, level: owner.level, noDrop: true }); m.hp = m.maxHp = 40; m.hit = owner.stats.weaponDps * 0.6 * w.tuning.playerDamage; m.ownerId = owner.id; }
}
function zoneTick(w, a, owner) {
  if (a.follow && owner) { a.x = owner.x; a.z = owner.z; }
  if (a.followTarget && owner) { const t = monstersNear(w, a.x, a.z, 14).filter(isFoe)[0]; if (t) { a.x = t.x; a.z = t.z; } }
  a.tick += DT;
  if (a.tick < 0.25) return;
  const dt = a.tick; a.tick = 0;
  if (a.dps && owner) for (const m of monstersNear(w, a.x, a.z, a.r).filter(isFoe)) {
    heroHit(w, owner, m, a.dps * dt, { el: a.el, burn: a.burn, area: true, res: false });
    if (a.slow) m.status.slow = { t: 0.6, dps: 0, acc: 0 };
    if (a.pull && !m.boss && !m.static) { const dx = a.x - m.x, dz = a.z - m.z, d = Math.hypot(dx, dz) || 1; m.x += (dx / d) * 0.5; m.z += (dz / d) * 0.5; }
  }
  if (a.curse) for (const m of monstersNear(w, a.x, a.z, a.r).filter(isFoe)) m.status.curse = { t: 0.5, v: a.curse, dps: 0, acc: 0 };
  if (a.slow && !a.dps) for (const m of monstersNear(w, a.x, a.z, a.r).filter(isFoe)) m.status.slow = { t: 0.6, dps: 0, acc: 0 };
  if (a.ally || a.heal || a.dmgBuff) for (const h of livingHeroes(w)) if (Math.hypot(h.x - a.x, h.z - a.z) < a.r) {
    if (a.heal) heal(w, h, h.maxHp * a.heal * dt, true);
    if (a.dmgBuff) { h.buffs.push({ t: w.t + 0.4, dmg: a.dmgBuff }); if (h.cls === 'lamplighter') h.beaconRegen = w.t + 0.4; }
    if (a.stunImmune) h.stunT = 0;
  }
  if (a.dmgBuff && a.dps && owner) { /* beacon burns enemies: handled via dps */ }
}
function turretTick(w, a, owner) {
  a.cool -= DT;
  if (owner && a.cool <= 0) {
    const t = monstersNear(w, a.x, a.z, a.range).filter((m) => isFoe(m) && !m.prop && m.state !== 'dormant').sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0];
    if (t) {
      a.cool = 1 / a.rate; const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz) || 1;
      const mult = a.setBolt ? 5 : 1;
      w.shots.push({ id: nid(w), x: a.x, z: a.z, vx: dx / d, vz: dz / d, speed: 20, range: a.range, life: a.range / 20, dmg: a.dmg * mult, el: a.el, r: 0.5, team: 'hero', owner: a.owner, ownerId: owner.id, pierce: 0, burn: a.burn, hit: new Set(), vfx: 'bolt_fire' });
      if (a.beams) { const o = w.areas.find((q) => q.kind === 'turret' && q !== a && q.owner === a.owner); if (o) for (const m of monstersNear(w, (a.x + o.x) / 2, (a.z + o.z) / 2, Math.hypot(a.x - o.x, a.z - o.z) / 2).filter(isFoe)) heroHit(w, owner, m, 0.3, { el: 'flame', area: true, res: false }); }
    }
  }
  if (a.healAlly && owner) for (const h of livingHeroes(w)) if (Math.hypot(h.x - a.x, h.z - a.z) < 4) heal(w, h, h.maxHp * a.healAlly * DT, true);
}
function cometTick(w, a, owner) {
  if (owner) { a.x = owner.x; a.z = owner.z; }
  a.acc += a.rate * DT;
  while (a.acc >= 1) {
    a.acc -= 1;
    const foes = monstersNear(w, a.x, a.z, a.range).filter((m) => isFoe(m) && !m.prop);
    const t = foes.length ? foes[w.rng.int(0, foes.length - 1)] : null;
    const x = t ? t.x : a.x + w.rng.range(-a.range, a.range) * 0.6, z = t ? t.z : a.z + w.rng.range(-a.range, a.range) * 0.6;
    if (!walkable(w, x, z, 0.3)) continue;
    w.areas.push({ id: nid(w), kind: 'comet', x, z, r: a.r, t: 0.45, dmg: a.dmg, el: a.el, burn: a.burn, hid: a.hid, owner: a.owner });
    ev(w, { t: 'comet', x, z, r: a.r });
  }
  if (a.healParty && owner) for (const h of livingHeroes(w)) heal(w, h, h.maxHp * a.healParty * DT, true);
}
function hostileTimer(w, a) {
  if (a.fx === 'shackle') { for (const h of livingHeroes(w)) if (Math.hypot(h.x - a.tx, h.z - a.tz) < 1.4) { h.rootT = 1.5; hurtHero(w, h, a.src.hit * 0.3, { x: a.sx, z: a.sz }, a.src); ev(w, { t: 'fx', name: 'arc_line', x: a.sx, z: a.sz, x2: h.x, z2: h.z, el: 'phys' }); } }
  else if (a.fx === 'entomb') { for (let i = 0; i < 6; i++) { const ang = (i / 6) * 6.283; w.areas.push({ id: nid(w), kind: 'bone_wall', x: a.tx + Math.cos(ang) * 2.6, z: a.tz + Math.sin(ang) * 2.6, r: 2.0, t: 3, block: true }); } ev(w, { t: 'fx', name: 'ring_grave', x: a.tx, z: a.tz, r: 3 }); }
  else if (a.fx === 'poison') w.areas.push({ id: nid(w), kind: 'poison_pool', x: a.tx, z: a.tz, r: 2, t: 6, src: a.src, dps: 0.4, tick: 0 });
}
function beamTick(w, a) {
  const m = w.monsters.find((q) => q.id === a.follow && !q.dead); if (!m) { a.t = 0; return; }
  a.x = m.x; a.z = m.z; a.ang += 0.5 * DT;
  for (const h of livingHeroes(w)) {
    const dx = h.x - a.x, dz = h.z - a.z, d = Math.hypot(dx, dz);
    if (d > 9 || d < 0.5) continue;
    for (let k = 0; k < 3; k++) { const ang = a.ang + k * 2.094; const da = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang))); if (da * d < 0.6) { a.tk = (a.tk || 0) + DT; if (a.tk > 0.4) { a.tk = 0; hurtHero(w, h, m.hit * 0.25, { x: a.x, z: a.z }, m); } } }
  }
}
function trapTick(w, a) {
  if (a.disarmed) return;
  a.cyc = (a.cyc || 0) + DT;
  const T = 3.2;
  const ph = (a.cyc + a.off) % T;
  if (Math.abs(ph - 2.2) < DT / 2) ev(w, { t: 'tele', kind: 'ring', x: a.x, z: a.z, r: 1.2, time: 0.8 });
  if (Math.abs(ph - 3.0) < DT / 2) { ev(w, { t: 'fx', name: 'spikes', x: a.x, z: a.z, r: 1.2 }); for (const h of livingHeroes(w)) if (Math.hypot(h.x - a.x, h.z - a.z) < 1.2) hurtHero(w, h, (8 + partyLevel(w) * 5) * 0.7, { x: a.x, z: a.z }, { level: partyLevel(w) }); for (const m of monstersNear(w, a.x, a.z, 1.2).filter(isFoe)) if (!m.prop) dealToMonster(w, null, m, Math.round(m.maxHp * 0.05), { el: 'phys' }); }
}

// ---------------- interaction ----------------
export function nearestSpot(w, h, maxD = 2.4) {
  let best = null, bd = maxD;
  for (const s of w.spots) { if (s.hidden || s.used && !s.reusable) continue; const d = Math.hypot(s.x - h.x, s.z - h.z) - (s.r || 0.5) * 0.5; if (d < bd) { bd = d; best = s; } }
  return best;
}
function hostileClose(w, h, r = 4) { return monstersNear(w, h.x, h.z, r).some((m) => isFoe(m) && !m.prop && m.state !== 'dormant'); }
function interactTick(w, h, intent) {
  if (!intent) return;
  const spot = nearestSpot(w, h);
  h.nearSpot = spot ? spot.id : 0;
  const hold = intent.interactHold;
  // revive downed ally
  const downed = w.heroes.find((o) => !o.alive && !o.gone && o !== h && Math.hypot(o.x - h.x, o.z - h.z) < 2.2 && !o.waitRevive === false || (!o.alive && !o.gone && o !== h && Math.hypot(o.x - h.x, o.z - h.z) < 2.2));
  if (downed && hold) {
    h.reviveT = (h.reviveT || 0) + DT;
    if (h.reviveT >= 2) { h.reviveT = 0; reviveHero(w, downed, 0.5); h.revives++; ev(w, { t: 'toast', seat: h.seat, text: 'REVIVED ' + downed.name }); downed.respawnT = null; }
    return;
  }
  h.reviveT = 0;
  if (!spot) return;
  const needHold = spot.hold || 0;
  if (needHold) {
    if (hold && !hostileClose(w, h, 3)) {
      spot.prog = (spot.prog || 0) + DT; h.channeling = spot.id;
      if (spot.prog >= needHold) { spot.prog = 0; useSpot(w, h, spot); }
    } else { if (spot.prog) spot.prog = Math.max(0, spot.prog - DT * 2); }
    return;
  }
  if (intent.interact || (hold && h.holdT > 0.4)) {
    if (!(hostileClose(w, h, 4) && spot.kind !== 'npc' && spot.kind !== 'exit')) useSpot(w, h, spot);
  }
  if (hold) h.holdT = (h.holdT || 0) + DT; else h.holdT = 0;
}
export function useSpot(w, h, s) {
  if (s.kind === 'rope') { s.used = true; ev(w, { t: 'sfx', name: 'bell_big', x: s.x, z: s.z }); }
  ev(w, { t: 'interact', seat: h.seat, kind: s.kind, id: s.id, name: s.name });
  switch (s.kind) {
    case 'chest': {
      s.used = true;
      for (const q of livingHeroes(w)) { dropGold(w, s.x, s.z, (20 + monsterLevel(w) * 8) * w.tuning.goldRate, q.seat); const it = rollDrop(w.lootRng, { ilvl: monsterLevel(w), cls: q.cls, elite: true, magicFind: q.stats.magicFind, legMult: diff(w).leg, tuningLeg: w.tuning.legendaryChance, minRarity: 'blessed' }); dropItem(w, it, s.x + w.rng.range(-1, 1), s.z + 1, q.seat); }
      ev(w, { t: 'fx', name: 'puff_flame', x: s.x, z: s.z, r: 1.5 }); ev(w, { t: 'sfx', name: 'chest', x: s.x, z: s.z });
      break;
    }
    case 'shrine': {
      s.used = true;
      const kinds = [['ardour', 'ARDOUR: +50% DAMAGE', { dmg: 0.5 }], ['haste', 'HASTE: +30% SPEED', { speed: 0.3 }], ['ward', 'WARD: A SHIELD OF WAX', {}], ['plenty', 'PLENTY: DOUBLE GOLD', {}]];
      const k = kinds[w.rng.int(0, 3)];
      for (const q of livingHeroes(w)) { if (k[0] === 'ward') q.lastLifeShield = w.t + 0; if (k[0] === 'ward') { q.hp = Math.min(q.maxHp, q.hp); q.shieldHp = q.maxHp * 0.3; } q.buffs.push({ t: w.t + 30, ...k[2], plenty: k[0] === 'plenty' }); }
      w.flags.shrineUsed = true;
      ev(w, { t: 'banner', text: k[1], small: true }); ev(w, { t: 'fx', name: 'ring_gold', x: s.x, z: s.z, r: 3 }); ev(w, { t: 'sfx', name: 'bell_mid', x: s.x, z: s.z });
      break;
    }
    case 'lychgate': {
      if (!s.unlocked) { s.unlocked = true; ev(w, { t: 'lychgate', id: s.id, x: s.x, z: s.z, zone: w.zoneId, n: s.n }); ev(w, { t: 'toast', seat: h.seat, text: 'LYCHGATE ATTUNED' }); ev(w, { t: 'sfx', name: 'bell_mid', x: s.x, z: s.z }); }
      else ev(w, { t: 'openMap', seat: h.seat });
      break;
    }
    case 'coffin': {
      s.used = true; w.coffin = { x: s.x, z: s.z, t: 45, spawnT: 0, wave: 0, owner: h.seat, spot: s };
      ev(w, { t: 'banner', text: 'THE COFFIN OPENS. SURVIVE 45 SECONDS', small: true }); ev(w, { t: 'fx', name: 'ring_grave', x: s.x, z: s.z, r: 5 }); ev(w, { t: 'shake', amt: 0.4 });
      break;
    }
    case 'lever': { s.used = true; for (const a of w.areas) if (a.kind === 'trap') a.disarmed = true; ev(w, { t: 'banner', text: 'LEVER PULLED. THE TRAPS FALL SILENT', small: true }); ev(w, { t: 'sfx', name: 'lever', x: s.x, z: s.z }); w.flags.leverPulled = true; break; }
    case 'npc': case 'exit': case 'font': case 'board': case 'rope': case 'book': case 'relic': case 'box': case 'gate': case 'wagon': case 'novice': ev(w, { t: 'use', seat: h.seat, kind: s.kind, id: s.id, npc: s.npc, spot: s }); if (w.hooks && w.hooks.onUse) w.hooks.onUse(w, h, s); break;
    default: break;
  }
}
function reviveTick(w) {
  // Unquiet coffin waves
  const c = w.coffin;
  if (c) {
    c.t -= DT; c.spawnT -= DT;
    if (c.spawnT <= 0) {
      c.spawnT = 4.5; c.wave++;
      const n = 3 + Math.min(5, c.wave);
      for (let i = 0; i < n; i++) {
        const a = w.rng.range(0, 6.28), d = w.rng.range(4, 7); const x = c.x + Math.cos(a) * d, z = c.y;
        const px = c.x + Math.cos(a) * d, pz = c.z + Math.sin(a) * d;
        if (walkable(w, px, pz, 0.4)) { const type = (w.zoneDef.mon && w.zoneDef.mon[0]) || 'peatwalker'; const m = spawnMonster(w, type, px, pz, { dormant: false }); ev(w, { t: 'fx', name: 'puff_grave', x: px, z: pz, r: 1 }); }
      }
    }
    if (c.t <= 0) {
      w.coffin = null; w.flags.coffinDone = true;
      const s = { id: nid(w), kind: 'chest', x: c.x, z: c.z + 1.5, r: 0.7, name: 'Chest', hidden: false };
      w.spots.push(s);
      for (const q of livingHeroes(w)) giveXp(w, q, monsterLevel(w) * 40);
      ev(w, { t: 'banner', text: 'THE COFFIN IS QUIET. TAKE YOUR PAY', small: true }); ev(w, { t: 'coffinDone' });
      if (w.hooks && w.hooks.onCoffinDone) w.hooks.onCoffinDone(w);
    }
  }
}

// ---------------- zone loading ----------------
function weightedPick(w, list) { return list[w.rng.int(0, list.length - 1)]; }
export function setupNavs(w) {
  w.navs = [];
  const z = w.zone;
  for (let i = 0; i < 4; i++) w.navs.push(i === 0 ? z.nav : NavGrid.fromRows(z.rows, { blocked: '#~P', origin: [0, 0, 0] }));
}
export function spawnProp(w, variant, x, z, hp = 1) {
  const m = {
    id: nid(w), type: 'prop', prop: true, variant, x, z, vx: 0, vz: 0, kx: 0, kz: 0, facing: 0, level: monsterLevel(w), hp: 5 * hp, maxHp: 5 * hp, hit: 0, r: 0.5, speed: 0, state: 'idle', t: 0, dead: false, status: {}, stunT: 0, flash: 0,
    elite: false, rare: false, aff: [], name: variant, pack: 0, big: false, static: true, team: 'prop', atkCd: 0, target: 0, nextSpawn: 0, boss: null, scale: 1, hover: false, home: [x, z], shield: 0, lastHit: -99, extra: {},
  };
  m.team = 'prop';
  w.monsters.push(m);
  return m;
}
const PROP_VARIANTS = { ossuary: ['urn', 'urn', 'barrel', 'crate', 'tombstone'], yard: ['tombstone', 'tombstone', 'urn', 'barrel'], cloister: ['urn', 'crate', 'barrel'], belfry: ['urn', 'crate'], town: ['barrel', 'crate'] };

export function loadZone(w, zoneId, opts = {}) {
  const def = ZONES[zoneId];
  w.zoneId = zoneId; w.zoneDef = def;
  w.monsters = []; w.shots = []; w.areas = []; w.drops = []; w.spots = []; w.coffin = null; w.requiem = { count: 0, t: 0, xp: 0 }; w.recentDead = [];
  w.flags.zoneSalt = opts.salt || '';
  const zone = generateZone(w.root, opts.baseZone || zoneId, { salt: opts.salt, gen: opts.gen });
  zone.safe = !!def.safe;
  w.zone = zone;
  setupNavs(w);
  w.levelFloor = opts.levelFloor || 0;
  // heroes at entrance
  const ent = zone.entrance;
  livingHeroes(w).concat(w.heroes.filter((h) => !h.alive && !h.gone)).forEach((h, i) => {
    h.x = ent.x + (i % 2) * 1.2 - 0.6; h.z = ent.z + 1 + Math.floor(i / 2) * 1.2; h.vx = h.vz = 0; h.cast = null; h.dash = null; h.leap = null; h.peal = null; h.dodgeT = 0;
    snapToFloor(w, h);
    if (!h.alive && !w.session) reviveHero(w, h, 1);
  });
  if (w.noSpawn) return zone;
  populate(w, zone, def, opts);
  w.zoneQuota = null;
  if (QUOTA_ZONES[zoneId]) { const mm = w.monsters.filter((m) => !m.dead && !m.prop && !m.boss && !m.static && m.type !== 'collection_plate' && (!m.team || m.team === 'monster')); mm.forEach((m) => { m.q = true; }); w.zoneQuota = { total: mm.length, need: Math.ceil(mm.length * QUOTA_ZONES[zoneId]), killed: 0 }; }
  ev(w, { t: 'zone', id: zoneId, name: def.name });
  return zone;
}

const QUOTA_ZONES = { causeway: 0.6, ossuary1: 0.6, ossuary2: 0.6, ossuary3: 0.6, ossuary4: 0.6, cloister: 0.6, cloister2: 0.6 };
export function populate(w, zone, def, opts = {}) {
  const dens = w.tuning.density * (opts.density || 1);
  const biome = def.look || 'ossuary';
  const variants = PROP_VARIANTS[biome] || PROP_VARIANTS.ossuary;
  let packId = 1, lych = 0;
  const lvl = monsterLevel(w);
  const mon = def.mon && def.mon.length ? def.mon : null;
  const safeRooms = new Set(zone.rooms.filter((r) => r.first).map((r) => r.id));
  for (const mk of zone.markers) {
    const room = zone.rooms[mk.room] || { first: false };
    switch (mk.t) {
      case 'B': { const p = spawnProp(w, w.rng.pick(variants), mk.x, mk.z); p.level = lvl; break; }
      case 'S': {
        if (!mon || safeRooms.has(mk.room) || opts.noMonsters) break;
        if (def.gen && def.gen.tutorial) break;
        const n = Math.max(1, Math.round(w.rng.int(4, 9) * dens * (w.knellCrowd || 1)));
        const type = weightedPick(w, mon); packId++;
        for (let i = 0; i < n; i++) {
          const a = w.rng.range(0, 6.283), d = w.rng.range(0, 2.2);
          const x = mk.x + Math.cos(a) * d, z = mk.z + Math.sin(a) * d;
          if (!walkable(w, x, z, 0.4)) continue;
          spawnMonster(w, w.rng.chance(0.2) ? weightedPick(w, mon) : type, x, z, { pack: packId, level: lvl });
        }
        break;
      }
      case 'E': {
        if (!mon || safeRooms.has(mk.room) || opts.noMonsters || (def.gen && def.gen.tutorial)) break;
        const chance = (1 / 3) * w.tuning.eliteRate * (w.knellElite || 1);
        if (!w.rng.chance(clamp(chance, 0, 1))) break;
        spawnElitePack(w, def, mk.x, mk.z, ++packId, lvl);
        break;
      }
      case 'N': if (def.nests && !opts.noMonsters) { const type = zoneId2nest(def); const m = spawnMonster(w, type, mk.x, mk.z, { dormant: false, level: lvl }); m.name = MONSTERS[type].name; } break;
      case 'C': w.spots.push({ id: nid(w), kind: 'chest', x: mk.x, z: mk.z, r: 0.8, name: 'Chest' }); break;
      case 'A': w.spots.push({ id: nid(w), kind: 'shrine', x: mk.x, z: mk.z, r: 0.8, name: 'Votive Shrine' }); break;
      case 'T': if (def.traps || biome === 'ossuary') w.areas.push({ id: nid(w), kind: 'trap', x: mk.x, z: mk.z, t: 1e9, off: w.rng.range(0, 3), r: 1.2, cyc: 0 }); break;
      case 'K': w.spots.push({ id: nid(w), kind: 'coffin', x: mk.x, z: mk.z, r: 0.9, name: 'Unquiet Coffin' }); break;
      case 'H': w.spots.push({ id: nid(w), kind: 'lever', x: mk.x, z: mk.z, r: 0.6, name: 'Lever' }); break;
      case 'L': break;
      default: break;
    }
  }
  // lychgates: at the start and exit of generated zones
  if (!zone.authored || def.id === 'town') {
    const lg = (x, z) => { const p = { x, z }; snapToFloor(w, p); w.spots.push({ id: nid(w), kind: 'lychgate', x: p.x, z: p.z, r: 0.9, name: 'Lychgate', n: ++lych }); };
    if (zone.entrance && def.lychgates) lg(zone.entrance.x + 2.5, zone.entrance.z + 2);
    if (zone.exit && def.lychgates > 1) lg(zone.exit.x - 2.5, zone.exit.z + 2);
  }
  if (zone.exit) w.spots.push({ id: nid(w), kind: 'exit', x: zone.exit.x, z: zone.exit.z, r: 1.0, name: 'Way on', toZone: def.next || null });
  // chance of a Collection Plate
  if (mon && !(def.gen && def.gen.tutorial) && w.rng.chance(opts.plateChance ?? 0.125)) {
    const r = zone.rooms[Math.min(zone.rooms.length - 1, 1 + w.rng.int(0, Math.max(0, zone.rooms.length - 2)))];
    spawnMonster(w, 'collection_plate', (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { level: lvl, dormant: true });
  }
}
const zoneId2nest = (def) => (def.nests && def.look === 'cloister' ? 'unrung_font' : 'crawler_nest');

export function spawnElitePack(w, def, x, z, pack, lvl) {
  const df = diff(w);
  const type = weightedPick(w, def.elites && def.elites.length ? def.elites : def.mon);
  const nAff = df.id === 'pilgrim' ? 1 : df.id === 'zealot' ? 2 : w.rng.int(3, 4);
  const aff = []; const pool = [...AFFLICTION_IDS];
  while (aff.length < nAff && pool.length) aff.push(pool.splice(w.rng.int(0, pool.length - 1), 1)[0]);
  const rare = w.rng.chance(0.4);
  const names = ELITE_NAMES;
  let leader = null;
  if (rare) {
    leader = spawnMonster(w, type, x, z, { elite: true, rare: true, aff, pack, level: lvl, name: names[w.rng.int(0, names.length - 1)], scale: 1.25 });
    leader.leader = true;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; spawnMonster(w, type, x + Math.cos(a) * 2, z + Math.sin(a) * 2, { pack, level: lvl }); }
  } else {
    const n = w.rng.int(3, 4);
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; const m = spawnMonster(w, type, x + Math.cos(a) * 1.5, z + Math.sin(a) * 1.5, { elite: true, aff, pack, level: lvl, name: names[w.rng.int(0, names.length - 1)] }); if (i === 0) m.leader = true; }
  }
  return pack;
}

export function setDifficulty(w, id) { w.diffId = id; }
export function clearMonsters(w) { for (const m of w.monsters) { if (!m.prop) { m.dead = true; } } w.monsters = w.monsters.filter((m) => !m.dead || m.prop); }
