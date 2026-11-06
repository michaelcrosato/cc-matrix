// Heroes: creation, level and XP, intents to movement, casting, dodge, potion, death, revive.
import { CLASSES, SKILLS, toneUnlockLevel } from '../data/classes.js';
import { DEVOTION_TRACKS, devotionCost, LEGENDARY } from '../data/items.js';
import { F, LEVEL_CAP, SLOT_LEVELS, VOW_LEVELS } from '../data/tuning.js';
import { makeItem } from './loot.js';
import { recalc } from './stats.js';
import { DT, after, emit, findOpenNear, moveCircle, near } from './world.js';
import { effectiveSkill, runOps, spawnFloating, softTarget } from './effects.js';

export function makeHero(w, { seat = 0, cls = 'bellwarden', name = 'THE LATE', level = 1, isBot = false } = {}) {
  const h = {
    id: w.nextId++, seat, cls, name, level, xp: 0, x: 0, z: 0, px: 0, pz: 0, facing: 0, hp: 1, res: 0, isBot,
    gear: {}, inv: [], gold: 0, mats: { scrap: 0, dust: 0, shards: 0, keys: 0 }, gems: {}, reliquary: { weapon: null, armour: null, jewel: null },
    slots: [{ skill: null, tone: null }, { skill: null, tone: null }, { skill: null, tone: null }, { skill: null, tone: null }, { skill: null, tone: null }, { skill: null, tone: null }],
    vows: [], cds: {}, charges: {}, potionCd: 0, dodgeCd: 0, state: 'idle', stateT: 0, cast: null, castSeq: 0, buffs: [], shield: 0, combo: 0, comboT: 0,
    moving: false, dead: false, deadT: 0, deaths: 0, recentDeaths: 0, kills: 0, damage: 0, revives: 0, goldEarned: 0, eliteKills: 0, stunT: 0, rootT: 0, inv_T: 0, invulnerable: 0, unseen: 0,
    lastHit: -99, outCombat: 0, clamorHold: 0, plateN: 0, plateT: 0, batonN: 0, swatN: 0, clemencyT: 12, lastLight: 0, thrice: 0, bellT: 0, reviveT: 0, reviving: null, interactT: 0, heldPrev: {}, swap: {}, stuckT: 0, levelPicks: [], newest: null, savedNewest: null, slowT: 0, slowV: 0,
  };
  recalc(h, w.tuning, null);
  h.hp = h.stats.maxHp;
  return h;
}

export const slotOpen = (h, i) => h.level >= SLOT_LEVELS[i];
export const skillUnlocked = (h, id) => h.level >= SKILLS[id].level;
export const toneUnlocked = (h, skill, i) => h.level >= toneUnlockLevel(skill, i);
export const vowSlots = (h) => VOW_LEVELS.filter((L) => h.level >= L).length;

export function refresh(w, h) { recalc(h, w.tuning, w.devotion?.spent); }
export const hasBuff = (h, id) => h.buffs.find((b) => b.id === id);
export function addBuff(w, h, b) { const old = h.buffs.find((x) => x.id === b.id); if (old) Object.assign(old, b); else h.buffs.push({ ...b }); emit(w, { t: 'buff', id: h.id, buff: b.id, dur: b.dur }); }

export function starterGear(w, h, ilvl = 1) {
  h.gear.main = makeItem(w.rngs.loot, { slot: 'main', rarity: 'common', ilvl, cls: h.cls, weaponId: CLASSES[h.cls].starterWeapon });
  if (h.cls === 'bellwarden') h.gear.main.dps = Math.round(h.gear.main.dps * 1.05 * 10) / 10;
  refresh(w, h); h.hp = h.stats.maxHp;
}
export function autoAssignSkills(h) {
  // Fills open slots with the earliest skills the hero has, keeping what's there.
  const have = new Set(h.slots.map((s) => s.skill).filter(Boolean));
  const list = CLASSES[h.cls].skills.filter((s) => skillUnlocked(h, s.id));
  for (let i = 0; i < 6; i++) if (slotOpen(h, i) && !h.slots[i].skill) { const s = list.find((x) => !have.has(x.id)); if (s) { h.slots[i].skill = s.id; have.add(s.id); } }
}

export function grantXp(w, h, amount) {
  if (h.isPyx) return;
  amount = amount * w.tuning.xp * w.diff.xp;
  if (h.level >= LEVEL_CAP) {
    const d = w.devotion; d.xp += amount;
    while (d.xp >= devotionCost(d.level)) { d.xp -= devotionCost(d.level); d.level++; emit(w, { t: 'toast', seat: h.seat, text: 'DEVOTION RISES. A POINT TO SPEND.', color: 'sky' }); emit(w, { t: 'sfx', id: 'bell_small' }); }
    return;
  }
  h.xp += amount;
  while (h.level < LEVEL_CAP && h.xp >= F.xpToNext(h.level)) { h.xp -= F.xpToNext(h.level); levelUp(w, h); }
}
export function levelUp(w, h) {
  h.level++;
  refresh(w, h);
  h.hp = h.stats.maxHp;
  if (!w.round) autoSlotNew(w, h);
  w.hooks?.levelUp?.(w, h);
  emit(w, { t: 'level', id: h.id, seat: h.seat, level: h.level, x: h.x, z: h.z });
}
function autoSlotNew(w, h) {
  const newly = CLASSES[h.cls].skills.find((s) => s.level === h.level);
  if (newly) {
    emit(w, { t: 'toast', seat: h.seat, text: `NEW SKILL: ${newly.name}`, color: 'sand', prompt: 'skills' });
    const empty = h.slots.findIndex((s, i) => !s.skill && slotOpen(h, i));
    if (empty >= 0) h.slots[empty].skill = newly.id;
  }
  const sOpen = SLOT_LEVELS.indexOf(h.level);
  if (sOpen >= 2) { autoAssignSkills(h); emit(w, { t: 'toast', seat: h.seat, text: 'A NEW SKILL SLOT OPENS.', color: 'sand', prompt: 'skills' }); }
  for (const s of CLASSES[h.cls].skills) for (let i = 0; i < 3; i++) if (toneUnlockLevel(s, i) === h.level && s.level <= h.level) { emit(w, { t: 'toast', seat: h.seat, text: `NEW TONE: ${Object.values(s.tones)[i].name}`, color: 'sky', prompt: 'skills' }); break; }
  if (VOW_LEVELS.includes(h.level)) emit(w, { t: 'toast', seat: h.seat, text: 'A VOW MAY BE SWORN.', color: 'plum', prompt: 'skills' });
}

export function spendResource(w, h, amt) { if (w.cheats.infRes) return; h.res = Math.max(0, h.res - amt); }
export function gainResource(h, amt) { h.res = Math.min(h.stats.maxResource, h.res + amt); }
export function healHero(w, h, frac, flat = 0) {
  if (h.dead) return;
  const amt = h.stats.maxHp * frac + flat;
  const before = h.hp;
  h.hp = Math.min(h.stats.maxHp, h.hp + amt);
  if (h.hp - before >= 1 && frac >= 0.05) emit(w, { t: 'heal', id: h.id, amt: Math.round(h.hp - before), x: h.x, z: h.z });
}

// Damage to a hero, with shields, immunity and last-chance powers.
export function damageHero(w, h, amt, src = {}) {
  if (h.dead || h.left || h.invulnerable > 0 || w.cheats.god && !h.isPyx || h.attractGod) return 0;
  if (src.blindable && src.m?.blindT > 0) { emit(w, { t: 'miss', x: h.x, z: h.z }); return 0; }
  let dr = h.stats.dr / 100;
  for (const f of w.fields) if (f.ally?.dr && near(h, f.x, f.z, f.r)) dr = 1 - (1 - dr) * (1 - f.ally.dr);
  const reduction = src.pure ? 0 : F.reduction(h.stats.armour, src.level ?? h.level);
  let dealt = amt * (1 - reduction) * (1 - dr);
  if (h.shield > 0) { const take = Math.min(h.shield, dealt); h.shield -= take; dealt -= take; }
  if (dealt <= 0) return 0;
  h.hp -= dealt;
  h.lastHit = w.time; h.outCombat = 0;
  emit(w, { t: 'hurt', id: h.id, amt: Math.round(dealt), x: h.x, z: h.z, big: dealt > h.stats.maxHp * 0.2 });
  if (h.channel && h.channel.target?.kind !== 'rope') { h.channel = null; }
  if (h.reviving) h.reviving = null;
  if (h.hp <= 0) {
    if (h.powers.has('thrice_buried') && w.time >= h.thrice) { h.thrice = w.time + 90; h.hp = h.stats.maxHp * 0.3; emit(w, { t: 'vfx', kind: 'ring_grave', x: h.x, z: h.z, r: 3 }); emit(w, { t: 'toast', seat: h.seat, text: 'ONE LEARNS TO KEEP A SPADE IN THE COFFIN.', color: 'orange' }); return dealt; }
    if (h.vows.includes('last_light') && w.time >= h.lastLight) { h.lastLight = w.time + 90; h.hp = h.stats.maxHp * 0.25; h.invulnerable = 1; emit(w, { t: 'vfx', kind: 'ring_fire', x: h.x, z: h.z, r: 3 }); emit(w, { t: 'toast', seat: h.seat, text: 'THE LAST LIGHT HOLDS.', color: 'sand' }); return dealt; }
    killHero(w, h, src);
  }
  return dealt;
}
export function killHero(w, h, src = {}) {
  h.hp = 0; h.dead = true; h.deadT = 0; h.deaths++; h.recentDeaths++; h.state = 'dead'; h.cast = null; h.moveDash = null; h.channel = null;
  h.respawnWait = w.round ? 8 : Math.min(w.boss ? 10 : 30, 5 + 5 * (h.recentDeaths - 1));
  emit(w, { t: 'herodeath', id: h.id, seat: h.seat, x: h.x, z: h.z, by: src.name ?? '' });
  w.hooks?.heroDied?.(w, h);
}
export function reviveHero(w, h, at = null, frac = 0.6) {
  h.dead = false; h.hp = h.stats.maxHp * frac; h.state = 'idle'; h.invulnerable = 2; h.deadT = 0;
  if (at) { const p = findOpenNear(w, at.x, at.z); h.x = p.x; h.z = p.z; h.px = h.x; h.pz = h.z; }
  // Never rise under a boss's hands: come up across the arena from it.
  const boss = w.boss?.m;
  if (boss && !boss.dead && Math.hypot(boss.x - h.x, boss.z - h.z) < 9 && w.zone.spec.kind === 'arena') { const cx = w.zone.w / 2; const cz = w.zone.h / 2; const dx = cx - boss.x; const dz = cz - boss.z; const d = Math.hypot(dx, dz) || 1; const p = findOpenNear(w, cx + (dx / d) * 12, cz + (dz / d) * 12); h.x = p.x; h.z = p.z; h.px = h.x; h.pz = h.z; }
  h.res = Math.max(h.res, 0);
  emit(w, { t: 'revive', id: h.id, x: h.x, z: h.z });
}

const SKILL_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5'];

// Bursts of a skill: charges for "Double" and "Deep" Tones.
function cdLeft(w, h, skillId) { return Math.max(0, (h.cds[skillId] ?? 0) - w.time); }
export function skillReadyFrac(w, h, sk) {
  const left = cdLeft(w, h, sk.id);
  return sk.cd ? left / sk.cd : 0;
}

export function tryCast(w, h, slot, intent) {
  const def = h.slots[slot]; if (!def?.skill || !slotOpen(h, slot)) return false;
  const swapT = h.swap?.[slot] ?? 0; if (swapT > w.time) return false;
  const sk = effectiveSkill(h, def.skill, def.tone);
  const free = h.powers.has('choirmaster') && h.batonN >= 5;
  const cost = free ? 0 : (sk.cost ?? 0) * (1 - Math.min(60, h.stats.costRed) / 100);
  const noCd = w.cheats.noCd || w.tuning.cooldown === 0;
  const cds = sk.charges ? (h.charges[sk.id] ?? sk.charges) <= 0 : cdLeft(w, h, sk.id) > 0;
  if (cds && !noCd) return false;
  if (h.res < cost && !w.cheats.infRes) { if (intent.pressed?.[SKILL_KEYS[slot]]) emit(w, { t: 'nores', id: h.id, seat: h.seat, slot, res: CLASSES[h.cls].resource }); return false; }
  spendResource(w, h, cost);
  const spd = 1 + Math.min(100, h.stats.atkSpd) / 100;
  const wind = (sk.wind ?? 0.15) / spd; const rec = (sk.rec ?? 0.2) / spd;
  let ax = intent.aimX ?? Math.sin(h.facing); let az = intent.aimZ ?? Math.cos(h.facing);
  const lock = softTarget(w, h, sk, intent);
  let tx = intent.tx; let tz = intent.tz;
  if (lock && !intent.hardAim) { const dx = lock.x - h.x; const dz = lock.z - h.z; const d = Math.hypot(dx, dz) || 1; ax = dx / d; az = dz / d; if (tx === undefined) { tx = lock.x; tz = lock.z; } if ((sk.fx[0].op === 'arc') && d > 1 && d < 3.4) { moveCircle(w, h, ax * Math.min(0.6, d - 1), az * Math.min(0.6, d - 1)); } }
  if (tx === undefined) { const r = sk.range ?? 6; tx = h.x + ax * r; tz = h.z + az * r; }
  h.facing = Math.atan2(ax, az);
  let clip = sk.clip;
  if (Array.isArray(clip)) { clip = clip[h.combo % clip.length]; h.combo++; h.comboT = 1.2; }
  h.state = 'cast'; h.stateT = 0; h.castSeq++;
  h.cast = { sk, wind, rec, fired: false, ax, az, tx, tz, slot, free, moving: !!sk.moving };
  if (sk.cd) {
    if (sk.charges) { h.charges[sk.id] = (h.charges[sk.id] ?? sk.charges) - 1; after(w, sk.cd * w.tuning.cooldown * (1 - Math.min(50, h.stats.cdr) / 100), () => { h.charges[sk.id] = Math.min(sk.charges, (h.charges[sk.id] ?? 0) + 1); }); }
    h.cds[sk.id] = w.time + sk.cd * w.tuning.cooldown * (1 - Math.min(50, h.stats.cdr) / 100);
  }
  emit(w, { t: 'cast', id: h.id, seat: h.seat, skill: sk.id, clip, upper: !!sk.upper, dur: wind + rec, ax, az, tx, tz, vfx: sk.vfx, sfx: sk.sfx, element: sk.element });
  return true;
}

function fireCast(w, h) {
  const c = h.cast; const sk = c.sk;
  c.fired = true;
  const mult = c.free ? 2 : 1;
  if (h.powers.has('choirmaster')) h.batonN = c.free ? 0 : h.batonN + 1;
  if (sk.gen) gainResource(h, sk.gen);
  const ctx = { src: h, hero: h, x: h.x, z: h.z, ox: h.x, oz: h.z, ax: c.ax, az: c.az, tx: c.tx, tz: c.tz, sk, mult, kills: 0, targets: 0 };
  runOps(w, ctx, sk.fx);
  h.used = h.used ?? {}; h.used[sk.id] = (h.used[sk.id] ?? 0) + 1;
  if (h.powers.has('first_digger') && sk.id === 'shovel_swat') { h.swatN++; if (h.swatN % 5 === 0) w.graves.push({ id: w.nextId++, x: h.x + c.ax * 1.5, z: h.z + c.az * 1.5, t: 12 }); }
  if (h.setBonus.ringing_order4 && sk.tags?.includes('toll')) h.cds.bellfall = Math.max(w.time, (h.cds.bellfall ?? 0) - 2);
}

export function startDodge(w, h, intent) {
  if (h.dodgeCd > 0 && !w.cheats.noCd) return false;
  if (h.state === 'dead' || h.stunT > 0) return false;
  let ax = intent.moveX; let az = intent.moveZ;
  if (Math.hypot(ax, az) < 0.2) { ax = Math.sin(h.facing); az = Math.cos(h.facing); }
  const d = Math.hypot(ax, az) || 1; ax /= d; az /= d;
  h.state = 'dodge'; h.stateT = 0; h.cast = null; h.moveDash = { vx: (ax * 4.5) / 0.35, vz: (az * 4.5) / 0.35, t: 0.35, inv: true };
  h.facing = Math.atan2(ax, az); h.dodgeCd = w.tuning.dodgeCd; h.castSeq++; h.dodges = (h.dodges ?? 0) + 1;
  emit(w, { t: 'cast', id: h.id, seat: h.seat, clip: 'Roll', dur: 0.35, sfx: 'dodge', dodge: true });
  emit(w, { t: 'tutorial', seat: h.seat, id: 'dodge' });
  return true;
}
export function usePotion(w, h) {
  if (h.potionCd > 0 || h.dead) return false;
  h.potionCd = w.tuning.potionCd; h.potions = (h.potions ?? 0) + 1;
  healHero(w, h, 0.6);
  emit(w, { t: 'potion', id: h.id, x: h.x, z: h.z });
  emit(w, { t: 'tutorial', seat: h.seat, id: 'potion' });
  return true;
}

// One hero, one step.
export function stepHero(w, h, intent) {
  h.px = h.x; h.pz = h.z;
  if (h.left) return;
  const s = h.stats; const dt = DT;
  h.potionCd = Math.max(0, h.potionCd - dt); h.dodgeCd = Math.max(0, h.dodgeCd - dt); h.invulnerable = Math.max(0, h.invulnerable - dt); h.unseen = Math.max(0, h.unseen - dt);
  h.comboT -= dt; if (h.comboT <= 0) h.combo = 0;
  h.outCombat += dt;
  stepBuffs(w, h);
  if (h.dead) { h.deadT += dt; intent.pressed = {}; w.hooks?.deadStep?.(w, h, intent); return; }
  // Resource.
  const regenMul = w.tuning.resource;
  if (h.cls === 'lamplighter') { let bonus = 1; for (const f of w.fields) if (f.ally?.wick && near(h, f.x, f.z, f.r)) bonus += f.ally.wick; gainResource(h, 14 * dt * regenMul * bonus); }
  if (h.cls === 'bellwarden') { if (h.outCombat > 4 && h.clamorHold <= 0) h.res = Math.max(0, h.res - 8 * dt); h.clamorHold -= dt; }
  if (w.cheats.infRes) h.res = s.maxResource;
  if (s.regen > 0) h.hp = Math.min(s.maxHp, h.hp + s.regen * dt);
  if (h.powers.has('clemency_shard')) { h.clemencyT -= dt; if (h.clemencyT <= 0) { h.clemencyT = 12; runOps(w, { src: h, hero: h, x: h.x, z: h.z, ox: h.x, oz: h.z, ax: 0, az: 1, tx: h.x, tz: h.z, sk: { id: 'clemency', element: 'sound' }, mult: 1 }, [{ op: 'ring', radius: 6, dmg: 3, vfx: 'ring_bronze', sfx: 'bell_small', shake: 0.15 }]); } }
  h.stunT = Math.max(0, h.stunT - dt); h.rootT = Math.max(0, h.rootT - dt); h.slowT = Math.max(0, h.slowT - dt);
  if (h.stunT > 0) return;

  const pressed = intent.pressed ?? {}; const held = intent.held ?? {};
  // Dodge cancels anything.
  if (pressed.dodge && h.state !== 'dodge') startDodge(w, h, intent);
  if (pressed.potion) usePotion(w, h);
  // Dash or dodge in motion.
  if (h.moveDash) {
    const m = h.moveDash; m.t -= dt;
    if (m.inv) h.invulnerable = Math.max(h.invulnerable, 0.02);
    const noClip = m.noClip;
    if (noClip) { h.x += m.vx * dt; h.z += m.vz * dt; } else moveCircle(w, h, m.vx * dt, m.vz * dt);
    m.step?.(w, h);
    if (m.t <= 0) { h.moveDash = null; if (noClip) { const p = findOpenNear(w, h.x, h.z); h.x = p.x; h.z = p.z; } m.end?.(w, h); if (h.state === 'dodge') { h.state = 'idle'; } }
    if (h.state === 'dodge') return;
  }
  // Skills.
  if (h.cast) {
    const c = h.cast; h.stateT += dt;
    if (!c.fired && h.stateT >= c.wind) fireCast(w, h);
    const total = c.wind + c.rec;
    if (c.fired && h.stateT >= total) { h.cast = null; h.state = 'idle'; }
    else if (c.fired && h.stateT >= c.wind + c.rec / 2 && Math.hypot(intent.moveX, intent.moveZ) > 0.2) { h.cast = null; h.state = 'idle'; }
  }
  if (!h.cast && h.state !== 'dodge') {
    for (let i = 0; i < 6; i++) if ((pressed[SKILL_KEYS[i]] || held[SKILL_KEYS[i]]) && tryCast(w, h, i, intent)) break;
  }
  // Channels: Passing Bell, rope, revive. A hit interrupts (see damageHero).
  if (h.channel) {
    h.channel.t += dt;
    if (h.channel.t >= h.channel.dur) { const c = h.channel; h.channel = null; c.done(w, h); }
    else if (Math.hypot(intent.moveX, intent.moveZ) > 0.5 || (c_isReleased(h.channel, held))) { h.channel = null; }
  }
  // Movement.
  const mag = Math.hypot(intent.moveX, intent.moveZ);
  const canMove = !h.channel && h.rootT <= 0 && (!h.cast || h.cast.moving || h.cast.fired && h.cast.moving);
  h.moving = false;
  if (canMove && mag > 0.15 && !h.buffRoot) {
    const k = Math.min(1, mag);
    let sp = s.speed * k;
    for (const b of h.buffs) { if (b.speed) sp *= 1 + b.speed; if (b.slow) sp *= 1 - b.slow; }
    if (h.slowT > 0) sp *= 1 - h.slowV;
    const nx = intent.moveX / mag; const nz = intent.moveZ / mag;
    const bx = h.x; const bz = h.z;
    if (w.cheats.noClip) { h.x = Math.max(1, Math.min(w.zone.w - 1, h.x + nx * sp * dt)); h.z = Math.max(1, Math.min(w.zone.h - 1, h.z + nz * sp * dt)); }
    else moveCircle(w, h, nx * sp * dt, nz * sp * dt);
    h.moving = true; h.speedNow = sp;
    if (!h.cast && !intent.hardAim) h.facing = Math.atan2(nx, nz);
    if (Math.hypot(h.x - bx, h.z - bz) < sp * dt * 0.25) h.stuckT += dt; else h.stuckT = 0;
    h.walked = (h.walked ?? 0) + Math.hypot(h.x - bx, h.z - bz);
  } else h.stuckT = 0;
  if (intent.hardAim && !h.cast && h.state !== 'dodge') { const a = Math.atan2(intent.aimX ?? 0, intent.aimZ ?? 1); h.facing = a; }
  // Soft body push from monsters; stuck heroes pass through small ones.
  if (h.stuckT < 0.3 && !w.cheats.noClip) {
    for (const m of w.active) {
      if (m.dead || m.static || m.defn.hover) continue;
      const dx = h.x - m.x; const dz = h.z - m.z; const rr = m.r + 0.4;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-4) {
        const d = Math.sqrt(d2); const push = (rr - d) * 0.25;
        moveCircle(w, h, (dx / d) * push, (dz / d) * push);
      }
    }
  }
}
function c_isReleased(ch, held) { return ch.hold && !held[ch.hold]; }

function stepBuffs(w, h) {
  h.buffRoot = false;
  for (let i = h.buffs.length - 1; i >= 0; i--) {
    const b = h.buffs[i]; b.dur -= DT;
    if (b.spin) {
      b.spinT = (b.spinT ?? 0) - DT;
      if (b.spinT <= 0) {
        b.spinT = b.spin.every;
        const ctx = { src: h, hero: h, x: h.x, z: h.z, ox: h.x, oz: h.z, ax: Math.sin(h.facing), az: Math.cos(h.facing), tx: h.x, tz: h.z, sk: { id: 'last_peal', element: 'sound' }, mult: 1, buff: b };
        runOps(w, ctx, [{ op: 'circle', radius: b.spin.radius, dmg: b.spin.dmg, pull: b.spin.pull, killExtend: b.spin.killExtend, vfx: 'ring_chain', sfx: 'hit_bell' }]);
        h.castSeq++;
      }
    }
    if (b.unseen) h.unseen = Math.max(h.unseen, 0.1);
    if (b.shield !== undefined && b.dur <= 0) h.shield = 0;
    if (b.dur <= 0) { h.buffs.splice(i, 1); emit(w, { t: 'buffend', id: h.id, buff: b.id }); }
  }
}

export function damageBonus(w, h, target) {
  // Multiplicative pile of everything a hero's hit can gain.
  let k = 1 + h.stats.dmgPct / 100;
  for (const b of h.buffs) { if (b.dmg) k *= 1 + b.dmg; }
  for (const f of w.fields) if (f.ally?.dmg && near(h, f.x, f.z, f.r)) k *= 1 + f.ally.dmg;
  if (h.vows.includes('contrition') && h.hp < h.stats.maxHp / 2) k *= 1.15;
  if (h.powers.has('plate_lining') && h.plateT > w.time) k *= 1 + Math.min(30, h.plateN) / 100;
  if (h.powers.has('mourning_band')) { const n = w.allies.filter((a) => a.owner === h.id && a.minion && !a.dead).length + w.heroes.filter((o) => o.dead && o !== h).length; k *= 1 + Math.min(0.3, n * 0.05); }
  if (h.powers.has('malisons_knuckle') && target?.elite) k *= 1.25;
  return k;
}
export const hasLegendary = (h, id) => h.powers.has(id) && !!LEGENDARY[id];
export const devotionPointsFree = (w) => w.devotion.level + (w.devotion.bonus ?? 0) - Object.values(w.devotion.spent).reduce((a, b) => a + b, 0);
export const DEVOTION_IDS = Object.keys(DEVOTION_TRACKS);
export { spawnFloating };
