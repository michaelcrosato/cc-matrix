// Monsters: spawning, per-archetype brains, elites and Afflictions, kills and what they pay.
import { AFFLICTION_IDS, ELITE_BASE, KNELL_VALUES, MONSTERS } from '../data/monsters.js';
import { F } from '../data/tuning.js';
import { randomGem, rollDrop, rollLegendaryItem, makeItem } from './loot.js';
import { DT, after, emit, findOpenNear, monsterLevel, moveCircle, near, nearestHero, playerCount, walkable } from './world.js';
import { damageHero, gainResource, grantXp, addBuff } from './hero.js';
import { hostileProjectile } from './effects.js';
import { stepBoss, bossOnDeath } from './bosses.js';

export function hitHero(w, h, amt, src) { return damageHero(w, h, amt, src); }

export function spawnMonster(w, type, x, z, o = {}) {
  const d = MONSTERS[type]; if (!d) throw new Error(`no monster ${type}`);
  const L = o.level ?? monsterLevel(w);
  const n = w.round ? w.round.players : playerCount(w);
  const eliteK = o.elite ? ELITE_BASE.hp : 1;
  const maxHp = Math.round(F.monsterHp(L, d.hp * eliteK, n, w.diff.hp, w.tuning) * (w.knell?.hpMul ?? 1));
  const m = {
    id: w.nextId++, type, defn: d, name: o.name ?? d.name, level: L, x, z, px: x, pz: z, facing: o.facing ?? 0, hp: maxHp, maxHp, hit: F.monsterHit(L, d.hit * (o.elite ? ELITE_BASE.dmg : 1), w.diff.dmg, w.tuning) * (w.knell?.dmgMul ?? 1),
    speed: d.speed * (o.elite ? 1.1 : 1) * (w.knell?.speedMul ?? 1), r: d.radius * (o.scaleMul ?? 1), scale: (d.scale ?? 1) * (o.scaleMul ?? 1), state: o.state ?? 'idle', t: 0, target: null, pack: o.pack ?? 0, elite: o.elite ?? null, affl: o.affl ?? [], status: {}, resonance: 0, resT: 0, flash: 0, blindT: 0, rootT: 0, stunT: 0, knockT: 0, knockX: 0, knockZ: 0, dormant: o.dormant ?? true, aggro: !!o.aggro, static: !!d.static, cd: w.rngs.ai.range(0, 1), xpMul: o.xpMul ?? 1, tint: o.tint ?? d.tint ?? null, noLoot: !!o.noLoot, minion: !!o.minion, spawnT: 0, script: o.script ?? null, summoned: !!o.summoned,
  };
  w.monsters.push(m);
  if (!m.dormant) wake(w, m);
  return m;
}
export function wake(w, m) {
  if (m._woke) return;
  m._woke = true; m.dormant = false;
  emit(w, { t: 'mspawn', id: m.id, type: m.type, x: m.x, z: m.z, hp: m.hp, maxHp: m.maxHp, elite: m.elite, affl: m.affl, name: m.name, tint: m.tint, sm: m.scale, level: m.level, pack: m.pack, r: m.r, spawnAnim: m.spawnAnim ?? 0 });
  if (m.defn.boss) w.boss = w.boss ?? null;
}
export function chooseAfflictions(w) {
  const [lo, hi] = w.diff.afflictions; const n = w.rngs.spawn.int(lo, hi);
  return w.rngs.spawn.shuffle([...AFFLICTION_IDS]).slice(0, n);
}
export function spawnElitePack(w, x, z, kind = null, affl = null, types = null, o = {}) {
  const rng = w.rngs.spawn;
  kind ??= rng.chance(0.5) ? 'champion' : 'rare';
  const list = (types ?? w.zone.spec.monsters).filter((t) => !MONSTERS[t].big || rng.chance(0.4));
  const type = rng.pick(list.length ? list : ['peatwalker']);
  affl ??= chooseAfflictions(w);
  const pack = w.nextId++;
  const out = [];
  if (kind === 'champion') {
    const n = rng.int(3, 4);
    for (let i = 0; i < n; i++) { const p = findOpenNear(w, x + rng.range(-1.5, 1.5), z + rng.range(-1.5, 1.5)); out.push(spawnMonster(w, type, p.x, p.z, { elite: 'champion', affl, pack, xpMul: ELITE_BASE.xp, name: `${o.prefix ?? 'CHAMPION'} ${MONSTERS[type].name}`, dormant: o.dormant ?? true, aggro: o.aggro })); }
  } else {
    const leader = spawnMonster(w, type, x, z, { elite: 'rare', affl, pack, xpMul: ELITE_BASE.xp * 1.5, name: rareName(rng, type), dormant: o.dormant ?? true, aggro: o.aggro, scaleMul: 1.2 });
    out.push(leader);
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) { const p = findOpenNear(w, x + rng.range(-2.5, 2.5), z + rng.range(-2.5, 2.5)); out.push(spawnMonster(w, type, p.x, p.z, { pack, minion: true, dormant: o.dormant ?? true, aggro: o.aggro, xpMul: 2, elite: null })); }
  }
  return out;
}
const RARE_A = ['Grim', 'Sour', 'Dread', 'Wept', 'Rotten', 'Black', 'Pale', 'Cold', 'Gaunt', 'Hollow'];
const RARE_B = ['Verger', 'Prebend', 'Precentor', 'Sacristan', 'Canon', 'Beadle', 'Almoner', 'Chantry', 'Cantor', 'Lector'];
const rareName = (rng) => `${rng.pick(RARE_A)} ${rng.pick(RARE_B)}`;

export function stunMonster(w, m, t) { if (m.defn.boss) return; m.stunT = Math.max(m.stunT, t); emit(w, { t: 'mstun', id: m.id, dur: t }); }

// Generic telegraphs: a growing mark on the floor, then the blow. Dodging through always works.
export function telegraph(w, o) {
  const dur = Math.max(0.6, o.dur ?? 0.8);
  const t = { id: w.nextId++, ...o, dur, left: dur };
  w.telegraphs.push(t);
  emit(w, { t: 'tele', id: t.id, kind: o.kind, x: o.x, z: o.z, r: o.r, x2: o.x2, z2: o.z2, width: o.width, dur, color: o.color });
  emit(w, { t: 'sfx', id: 'telegraph', x: o.x, z: o.z, rate: 0.2 });
  return t;
}
const inShape = (t, h) => {
  if (t.kind === 'circle') return near(h, t.x, t.z, t.r);
  if (t.kind === 'ring') { const d = Math.hypot(h.x - t.x, h.z - t.z); return d <= t.r && d >= (t.inner ?? 0); }
  if (t.kind === 'line') { const dx = t.x2 - t.x; const dz = t.z2 - t.z; const L2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((h.x - t.x) * dx + (h.z - t.z) * dz) / L2)); return Math.hypot(h.x - (t.x + dx * u), h.z - (t.z + dz * u)) <= t.width; }
  return false;
};
export function stepTelegraphs(w) {
  for (let i = w.telegraphs.length - 1; i >= 0; i--) {
    const t = w.telegraphs[i]; t.left -= DT;
    if (t.moveWith && !t.moveWith.dead) { t.x = t.moveWith.x; t.z = t.moveWith.z; }
    if (t.left > 0) continue;
    w.telegraphs.splice(i, 1);
    emit(w, { t: 'telefire', id: t.id, kind: t.kind, x: t.x, z: t.z, r: t.r, x2: t.x2, z2: t.z2, vfx: t.vfx, sfx: t.sfx });
    if (t.shake) emit(w, { t: 'shake', v: t.shake });
    for (const h of w.heroes) {
      if (h.dead || h.left || !inShape(t, h)) continue;
      if (t.pred && !t.pred(h)) continue;
      if (h.invulnerable > 0) { t.dodged?.(h); h.dodgedTele = (h.dodgedTele ?? 0) + 1; continue; }
      if (t.dmg) damageHero(w, h, t.dmg, { name: t.name, level: t.level });
      t.onHit?.(w, h);
    }
    for (const a of w.allies) if (!a.turret && !a.dead && t.dmg && inShape(t, a)) { a.hp -= t.dmg; }
    t.fire?.(w, t);
  }
}
export function hostileField(w, x, z, r, dur, dmgPerTick, o = {}) {
  const f = { id: w.nextId++, x, z, r, t: dur, dur, tick: o.tick ?? 0.5, tickT: o.delay ?? 0.3, hostile: true, dmg: dmgPerTick, level: o.level, name: o.name, slow: o.slow, look: o.look ?? 'poison', op: {} };
  w.fields.push(f);
  emit(w, { t: 'field', id: f.id, x, z, r, dur, look: f.look, hostile: true });
  return f;
}

function moveToward(w, m, tx, tz, speed, seat) {
  const nav = w.zone.nav;
  let dx = tx - m.x; let dz = tz - m.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  if (d > 1.5 && !nav.lineOfSight(m.x, m.z, tx, tz, m.r * 0.5)) {
    const nf = w.navs[seat ?? 0]; const out = w._o2 ?? (w._o2 = [0, 0]);
    if (nf.flowDirection(m.x, m.z, out)) { dx = out[0]; dz = out[1]; }
  }
  if (m.status.slow) speed *= 1 - m.status.slow.v;
  moveCircle(w, m, dx * speed * DT, dz * speed * DT, m.r * 0.6);
  m.facing = Math.atan2(dx, dz);
}

const attack = (w, m, clip, dur = m.defn.wind) => { m.state = 'wind'; m.t = dur; m.atkSeq = (m.atkSeq ?? 0) + 1; emit(w, { t: 'matk', id: m.id, clip: clip ?? m.defn.attack ?? 'Slash1', dur }); };
const faceTo = (m, t) => { m.facing = Math.atan2(t.x - m.x, t.z - m.z); };

function pickTarget(w, m) {
  let best = nearestHero(w, m.x, m.z); let bd = best ? Math.hypot(best.x - m.x, best.z - m.z) : 1e9;
  for (const a of w.allies) {
    if (a.dead) continue;
    const d = Math.hypot(a.x - m.x, a.z - m.z) - (a.taunt ? 8 : 0.5);
    if (a.kind === 'lamp' || a.turret && !a.taunt) continue;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}
function hurtTarget(w, m, t, amt, name) { if (t.seat !== undefined && t.stats) damageHero(w, t, amt, { m, name: name ?? m.name, level: m.level, blindable: true }); else if (t.hp !== undefined && !t.turret) t.hp -= amt; }

// Brains: what each archetype does once awake. Common stun, knock, status and aggro are handled in stepMonster.
const BRAINS = {
  melee(w, m, t, d) {
    if (d <= m.defn.reach + m.r * 0.5 && m.cd <= 0) { faceTo(m, t); attack(w, m); return; }
    moveToward(w, m, t.x, t.z, m.speed, t.seat ?? 0);
  },
  lunge(w, m, t, d) {
    if (d < 5 && d > 1.5 && m.cd <= 0) { faceTo(m, t); attack(w, m, 'Lunge', 0.3); m.lungeTo = { x: t.x, z: t.z }; m.cd = 2; return; }
    if (d <= m.defn.reach + m.r * 0.5 && m.cd <= 0.8) { faceTo(m, t); attack(w, m, 'Slash1', 0.3); return; }
    moveToward(w, m, t.x, t.z, m.speed, t.seat ?? 0);
  },
  floater(w, m, t, d) {
    if (d < 9) { const dx = m.x - t.x; const dz = m.z - t.z; moveCircle(w, m, (dx / d) * m.speed * DT, (dz / d) * m.speed * DT, m.r); }
    else if (d > 12) moveToward(w, m, t.x, t.z, m.speed, t.seat ?? 0);
    faceTo(m, t);
    if (m.cd <= 0 && d < 16 && w.zone.nav.lineOfSight(m.x, m.z, t.x, t.z)) { attack(w, m, 'Sing', m.defn.wind); }
  },
  slam(w, m, t, d) {
    if (d <= m.defn.reach + 0.5 && m.cd <= 0) {
      faceTo(m, t);
      attack(w, m, 'CoffinSlam', 0.8);
      const fx = m.x + Math.sin(m.facing) * 1.8; const fz = m.z + Math.cos(m.facing) * 1.8;
      telegraph(w, { kind: 'circle', x: fx, z: fz, r: 2.2, dur: 0.8, dmg: m.hit, level: m.level, name: m.name, vfx: 'ring_chain', sfx: 'coffin_crash', shake: 0.2 });
      m.noHit = true;
      return;
    }
    moveToward(w, m, t.x, t.z, m.speed, t.seat ?? 0);
  },
  bloat(w, m, t, d) {
    if (d <= 3 && !m.swelling) { m.swelling = true; attack(w, m, 'Swell', 1); telegraph(w, { kind: 'circle', x: m.x, z: m.z, r: 4, dur: 1, dmg: m.hit, level: m.level, name: m.name, moveWith: m, vfx: 'ring_grave', sfx: 'bloat_burst', shake: 0.25, fire: (w2, tl) => { if (!m.dead) { m.hp = 0; killMonster(w2, m, null, { noPay: false }); hostileField(w2, tl.x, tl.z, 3, 5, m.hit * 0.12, { level: m.level, name: m.name, look: 'poison' }); } } }); return; }
    if (!m.swelling) moveToward(w, m, t.x, t.z, m.speed, t.seat ?? 0);
  },
  leaper(w, m, t, d) {
    if (d < 6 && d > 2 && m.cd <= 0) { faceTo(m, t); m.state = 'leap'; m.t = 0.4; m.cd = 2.5; m.leapV = { x: (t.x - m.x) / 0.4, z: (t.z - m.z) / 0.4 }; emit(w, { t: 'matk', id: m.id, clip: 'Lunge', dur: 0.4, hop: 1 }); return; }
    BRAINS.melee(w, m, t, d);
  },
  hook(w, m, t, d) {
    if (d < 10 && d > 3 && m.cd <= 0 && w.zone.nav.lineOfSight(m.x, m.z, t.x, t.z)) {
      faceTo(m, t); attack(w, m, 'Cast', 0.7); m.cd = 5; m.noHit = true;
      telegraph(w, { kind: 'line', x: m.x, z: m.z, x2: t.x, z2: t.z, width: 0.8, dur: 0.7, dmg: m.hit * 0.5, level: m.level, name: m.name, vfx: 'hook', sfx: 'chain_whirl', onHit: (w2, h) => { const dx = m.x - h.x; const dz = m.z - h.z; const dd = Math.hypot(dx, dz) || 1; const steps = Math.max(0, dd - 1.5); moveCircle(w2, h, (dx / dd) * steps, (dz / dd) * steps); const stolen = Math.min(h.gold, Math.round(10 + h.gold * 0.05)); h.gold -= stolen; m.stolen = (m.stolen ?? 0) + stolen; m.stolenFrom = h; if (stolen) emit(w2, { t: 'toast', seat: h.seat, text: `THE COLLECTOR TAKES ${stolen} GOLD.`, color: 'sand' }); } });
      return;
    }
    BRAINS.melee(w, m, t, d);
  },
  blinker(w, m, t, d) {
    if (m.struck && m.cd2 <= 0) { m.struck = false; m.cd2 = 3; blink(w, m, t, 3 + w.rngs.ai.range(0, 3)); return; }
    if (d > 6 && (m.cd2 ?? 0) <= 0) { m.cd2 = 4; blink(w, m, t, 1.5); return; }
    if (d <= m.defn.reach + 0.3 && m.cd <= 0) { faceTo(m, t); m.combo = (m.combo ?? 0) + 1; attack(w, m, m.combo % 3 === 0 ? 'Slash3' : m.combo % 3 === 1 ? 'Slash1' : 'Slash2', 0.28); if (m.combo % 3 !== 0) m.quickRec = true; return; }
    moveToward(w, m, t.x, t.z, m.speed, t.seat ?? 0);
  },
  charger(w, m, t, d) {
    if (d < 11 && d > 3 && m.cd <= 0) {
      faceTo(m, t); attack(w, m, 'Roar', 0.9); m.noHit = true; m.cd = 6;
      const dx = (t.x - m.x) / d; const dz = (t.z - m.z) / d; m.chargeDir = { x: dx, z: dz };
      telegraph(w, { kind: 'line', x: m.x, z: m.z, x2: m.x + dx * 10, z2: m.z + dz * 10, width: 1.3, dur: 0.9, color: 'red' });
      m.afterWind = 'charge';
      emit(w, { t: 'sfx', id: 'roar', x: m.x, z: m.z });
      return;
    }
    BRAINS.melee(w, m, t, d);
  },
  gargoyle(w, m, t, d) {
    if (m.statue) { if (d < 6) { m.statue = false; emit(w, { t: 'matk', id: m.id, clip: 'Wake', dur: 0.4 }); emit(w, { t: 'sfx', id: 'hit_stone', x: m.x, z: m.z }); } return; }
    if (m.swoop) {
      m.swoop.t -= DT;
      const hit = moveCircle(w, m, m.swoop.vx * DT, m.swoop.vz * DT, m.r * 0.5);
      if (!m.swoop.done && near(t, m.x, m.z, 1.2)) { m.swoop.done = true; hurtTarget(w, m, t, m.hit); }
      if (m.swoop.t <= 0 || hit) { m.swoop = null; m.cd = 1.5; }
      return;
    }
    if (m.cd <= 0) { const dd = d || 1; m.swoop = { vx: ((t.x - m.x) / dd) * 9, vz: ((t.z - m.z) / dd) * 9, t: Math.min(1.2, (dd + 3) / 9) }; faceTo(m, t); emit(w, { t: 'sfx', id: 'whoosh', x: m.x, z: m.z, rate: 0.2 }); return; }
    const a = w.time * 1.1 + m.id; moveToward(w, m, t.x + Math.cos(a) * 5, t.z + Math.sin(a) * 5, m.speed * 0.7, t.seat ?? 0);
  },
  necro(w, m, t, d) {
    if (d < 8) { const dd = d || 1; moveCircle(w, m, ((m.x - t.x) / dd) * m.speed * DT, ((m.z - t.z) / dd) * m.speed * DT, m.r * 0.6); m.facing = Math.atan2(m.x - t.x, m.z - t.z); }
    else if (d > 14) moveToward(w, m, t.x, t.z, m.speed, t.seat ?? 0);
    m.raiseT = (m.raiseT ?? 3) - DT;
    if (m.raiseT <= 0 && (m.raised ?? 0) < 12) {
      m.raiseT = 5; m.raised = (m.raised ?? 0) + 3; faceTo(m, t); attack(w, m, 'RaiseHands', 0.7); m.noHit = true;
      const count = 2 + (w.graves.length ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const p = findOpenNear(w, m.x + w.rngs.ai.range(-3, 3), m.z + w.rngs.ai.range(-3, 3));
        after(w, 0.7, () => { if (!m.dead && w.monsters.includes(m)) { const s = spawnMonster(w, 'rattlebones', p.x, p.z, { dormant: false, aggro: true, xpMul: 0.3, noLoot: true, summoned: true, minion: true }); s.spawnAnim = 1; s.hp = s.maxHp * 0.6; emit(w, { t: 'vfx', kind: 'burst_grave', x: p.x, z: p.z, r: 1 }); } });
      }
    }
  },
  plate(w, m, t, d) {
    m.plateT = (m.plateT ?? 12) - DT;
    if (m.plateT <= 0 && !m.escaping) { m.escaping = true; emit(w, { t: 'plateescape', id: m.id, x: m.x, z: m.z }); emit(w, { t: 'toast', seat: -1, text: 'THE COLLECTION PLATE HAS ESCAPED WITH THE OFFERING.', color: 'sand' }); m.dead = true; m.gone = true; return; }
    const dd = d || 1; let vx = (m.x - t.x) / dd; let vz = (m.z - t.z) / dd;
    const a = Math.sin(w.time * 2 + m.id) * 0.7; const c = Math.cos(a); const s = Math.sin(a); const nx = vx * c - vz * s; const nz = vx * s + vz * c;
    let hit = moveCircle(w, m, nx * m.speed * DT * (d < 15 ? 1 : 0.5), nz * m.speed * DT * (d < 15 ? 1 : 0.5), m.r * 0.6);
    if (hit) m.turn = (m.turn ?? 0) + 1;
    if (hit) { const a2 = m.id + m.turn; moveCircle(w, m, Math.cos(a2) * m.speed * DT, Math.sin(a2) * m.speed * DT, m.r * 0.6); }
    m.facing = Math.atan2(nx, nz);
    m.spill = (m.spill ?? 0) - DT;
    if (m.spill <= 0) { m.spill = 0.45; w.hooks.dropGold(w, m.x, m.z, Math.round(4 + m.level * 1.5), 1); }
  },
  spawner(w, m, t, d) {
    m.spawnCd = (m.spawnCd ?? 2) - DT;
    if (m.spawnCd <= 0 && d < 16 && (m.spawned ?? 0) < 18) {
      m.spawnCd = 3.5; m.spawned = (m.spawned ?? 0) + 3;
      for (let i = 0; i < 3; i++) { const p = findOpenNear(w, m.x + w.rngs.ai.range(-1.6, 1.6), m.z + w.rngs.ai.range(-1.6, 1.6)); const s = spawnMonster(w, m.defn.spawn, p.x, p.z, { dormant: false, aggro: true, xpMul: 0.5, noLoot: true, summoned: true }); s.cd = 0.5; }
      emit(w, { t: 'matk', id: m.id, clip: 'Pulse', dur: 0.4 }); emit(w, { t: 'sfx', id: 'nest', x: m.x, z: m.z, rate: 0.3 });
    }
  },
};
function blink(w, m, t, r) { const a = w.rngs.ai.range(0, Math.PI * 2); const p = findOpenNear(w, t.x + Math.cos(a) * r, t.z + Math.sin(a) * r); emit(w, { t: 'vfx', kind: 'blink', x: m.x, z: m.z, r: 1 }); m.x = p.x; m.z = p.z; m.px = p.x; m.pz = p.z; faceTo(m, t); emit(w, { t: 'vfx', kind: 'blink', x: p.x, z: p.z, r: 1 }); emit(w, { t: 'sfx', id: 'blink', x: p.x, z: p.z, rate: 0.2 }); }

function stepStatuses(w, m) {
  for (const k in m.status) {
    const s = m.status[k]; s.t -= DT;
    if (s.dps && !m.dead) {
      m.dotAcc = (m.dotAcc ?? 0) + s.dps * DT;
      if (m.dotAcc >= 1) {
        const amt = Math.floor(m.dotAcc); m.dotAcc -= amt; m.hp -= amt;
        const by = w.heroes.find((h) => h.id === s.by); if (by) by.damage += amt;
        m.dotT = (m.dotT ?? 0) - 1;
        if (m.dotT <= 0) { m.dotT = 30; emit(w, { t: 'dot', id: m.id, status: k, x: m.x, z: m.z, amt }); }
        if (m.hp <= 0) { killMonster(w, m, by ?? null, { overkill: 0, ax: 0, az: 0, dot: k }); return; }
      }
    }
    if (s.t <= 0) { delete m.status[k]; emit(w, { t: 'mstatus', id: m.id, status: k, on: false }); }
  }
}

function stepAfflictions(w, m) {
  // Pack effects run from one member so a pack does not stack them.
  const isHead = m.elite === 'rare' || (m.elite === 'champion' && !m.packHeadChecked ? true : false);
  for (const a of m.affl) {
    m.aT = m.aT ?? {};
    m.aT[a] = (m.aT[a] ?? w.rngs.ai.range(2, 5)) - DT;
    if (a === 'smouldering') { m.trailT = (m.trailT ?? 0) - DT; if (m.trailT <= 0 && !m.static) { m.trailT = 0.7; hostileField(w, m.x, m.z, 1.1, 3, m.hit * 0.1, { level: m.level, name: m.name, look: 'fire', delay: 0.5 }); } }
    if (m.aT[a] > 0) continue;
    const h = nearestHero(w, m.x, m.z, 18); if (!h) { m.aT[a] = 1; continue; }
    switch (a) {
      case 'tolling': m.aT[a] = 5; telegraph(w, { kind: 'circle', x: m.x, z: m.z, r: 7, dur: 0.9, dmg: m.hit * 0.8, level: m.level, name: m.name, vfx: 'ring_bronze', sfx: 'bell_small', moveWith: m, color: 'sand' }); break;
      case 'shackled': m.aT[a] = 6; telegraph(w, { kind: 'line', x: m.x, z: m.z, x2: h.x, z2: h.z, width: 0.7, dur: 0.7, dmg: m.hit * 0.3, level: m.level, name: m.name, vfx: 'hook', sfx: 'chain_whirl', color: 'mist', onHit: (w2, he) => { he.rootT = 1.5; emit(w2, { t: 'root', id: he.id, dur: 1.5 }); } }); break;
      case 'entombing': { m.aT[a] = 8; const hx = h.x; const hz = h.z; telegraph(w, { kind: 'circle', x: hx, z: hz, r: 2.4, dur: 0.7, color: 'mist', fire: (w2) => { for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; const o = { id: w2.nextId++, x: hx + Math.cos(an) * 2.4, z: hz + Math.sin(an) * 2.4, r: 0.55, t: 3, look: 'bone' }; w2.obstacles.push(o); emit(w2, { t: 'obstacle', id: o.id, x: o.x, z: o.z, r: o.r, look: 'bone', dur: 3 }); } emit(w2, { t: 'sfx', id: 'hit_stone', x: hx, z: hz }); } }); break; }
      case 'vigil_lamps': { m.aT[a] = 9; const spin = w.rngs.ai.chance(0.5) ? 1 : -1; const start = w.rngs.ai.range(0, 6.28); for (let i = 0; i < 2; i++) beam(w, m, start + i * Math.PI, spin); break; }
      case 'penitent_haste': m.aT[a] = 6; m.hasteT = 2.5; emit(w, { t: 'vfx', kind: 'haste', x: m.x, z: m.z, r: 1 }); break;
      case 'plagued': { m.aT[a] = 5; const hx = h.x; const hz = h.z; telegraph(w, { kind: 'circle', x: hx, z: hz, r: 2.2, dur: 0.8, color: 'lime', fire: (w2) => hostileField(w2, hx, hz, 2.2, 5, m.hit * 0.15, { level: m.level, name: m.name, look: 'poison' }) }); break; }
      default: m.aT[a] = 99;
    }
  }
}
function beam(w, m, startAngle, spin) {
  const b = { id: w.nextId++, owner: m, a: startAngle, spin: spin * 0.9, t: 6, len: 8, hitT: 0 };
  w.beams = w.beams ?? []; w.beams.push(b);
  emit(w, { t: 'beam', id: b.id, m: m.id, a: b.a, spin: b.spin, dur: b.t, len: b.len });
}
export function stepBeams(w) {
  if (!w.beams) return;
  for (let i = w.beams.length - 1; i >= 0; i--) {
    const b = w.beams[i]; b.t -= DT; b.a += b.spin * DT; b.hitT -= DT;
    if (b.t <= 0 || b.owner.dead) { w.beams.splice(i, 1); emit(w, { t: 'beamend', id: b.id }); continue; }
    if (b.hitT <= 0) {
      b.hitT = 0.15; const m = b.owner; const dx = Math.cos(b.a); const dz = Math.sin(b.a);
      for (const h of w.heroes) {
        if (h.dead || h.left) continue;
        const u = Math.max(0, Math.min(b.len, (h.x - m.x) * dx + (h.z - m.z) * dz));
        if (Math.hypot(h.x - (m.x + dx * u), h.z - (m.z + dz * u)) < 0.5) { damageHero(w, h, m.hit * 0.25, { name: m.name, level: m.level }); }
      }
    }
  }
}

export function stepMonster(w, m) {
  m.px = m.x; m.pz = m.z;
  if (m.flash > 0) m.flash--;
  m.spawnT += DT; m.cd -= DT; if (m.cd2 !== undefined) m.cd2 -= DT;
  stepStatuses(w, m); if (m.dead) return;
  if (m.resT > 0) { m.resT -= DT; if (m.resT <= 0) { m.resonance = 0; emit(w, { t: 'mstack', id: m.id, n: 0 }); } }
  if (m.blindT > 0) m.blindT -= DT;
  if (m.rootT > 0) m.rootT -= DT;
  if (m.knockT > 0) { m.knockT -= DT; moveCircle(w, m, m.knockX * DT, m.knockZ * DT, m.r * 0.6); }
  if (m.stunT > 0) { m.stunT -= DT; return; }
  if (m.defn.boss) { stepBoss(w, m); return; }
  if (m.affl.length) stepAfflictions(w, m);
  if (m.state === 'wind') {
    m.t -= DT;
    if (m.t <= 0) {
      m.state = 'rec'; m.t = (m.quickRec ? 0.2 : m.defn.rec); m.quickRec = false;
      const tgt = pickTarget(w, m);
      if (m.afterWind === 'charge') { m.afterWind = null; m.state = 'charge'; m.t = 10 / 7; emit(w, { t: 'matk', id: m.id, clip: 'Charge', dur: m.t }); return; }
      if (m.noHit) { m.noHit = false; }
      else if (m.defn.brain === 'floater') { if (tgt) hostileProjectile(w, m, tgt.x, tgt.z, { speed: 6, dmg: m.hit, look: 'note', range: 18 }); m.cd = m.defn.rec + 1; emit(w, { t: 'sfx', id: 'sour_note', x: m.x, z: m.z, rate: 0.3 }); }
      else if (tgt && near(tgt, m.x, m.z, m.defn.reach + m.r + 0.5)) { hurtTarget(w, m, tgt, m.hit); emit(w, { t: 'sfx', id: 'monster_hit', x: m.x, z: m.z, rate: 0.15 }); }
      if (m.lungeTo) { const dx = m.lungeTo.x - m.x; const dz = m.lungeTo.z - m.z; moveCircle(w, m, dx * 0.7, dz * 0.7, m.r * 0.6); m.lungeTo = null; }
      if (m.defn.brain !== 'floater') m.cd = m.defn.rec * 0.5;
    }
    return;
  }
  if (m.state === 'rec') { m.t -= DT; if (m.t <= 0) m.state = 'idle'; return; }
  if (m.state === 'leap') { m.t -= DT; moveCircle(w, m, m.leapV.x * DT, m.leapV.z * DT, m.r * 0.5); if (m.t <= 0) { m.state = 'rec'; m.t = 0.3; const tgt = pickTarget(w, m); if (tgt && near(tgt, m.x, m.z, 1.4)) hurtTarget(w, m, tgt, m.hit); } return; }
  if (m.state === 'charge') {
    m.t -= DT; const v = 7;
    const hit = moveCircle(w, m, m.chargeDir.x * v * DT * 1.2, m.chargeDir.z * v * DT * 1.2, m.r * 0.6);
    for (const h of w.heroes) if (!h.dead && !h.left && near(h, m.x, m.z, m.r + 0.5) && (m.chargeHit ?? 0) < w.time) { m.chargeHit = w.time + 1; damageHero(w, h, m.hit, { name: m.name, level: m.level }); moveCircle(w, h, m.chargeDir.x * 1.5, m.chargeDir.z * 1.5); }
    if (hit) { m.state = 'rec'; m.t = 0.2; stunMonster(w, m, 1.8); emit(w, { t: 'shake', v: 0.25 }); emit(w, { t: 'sfx', id: 'hit_stone', x: m.x, z: m.z }); emit(w, { t: 'vfx', kind: 'ring_chain', x: m.x, z: m.z, r: 2 }); }
    else if (m.t <= 0) { m.state = 'rec'; m.t = 0.8; }
    return;
  }
  // Awake logic: aggro at 12 m with line of sight.
  const t = pickTarget(w, m);
  if (!t) return;
  const dx = t.x - m.x; const dz = t.z - m.z; const d = Math.hypot(dx, dz);
  if (!m.aggro) {
    if (d < (m.defn.aggro) && w.zone.nav.lineOfSight(m.x, m.z, t.x, t.z)) {
      m.aggro = true;
      for (const o of w.active) if (o.pack && o.pack === m.pack) o.aggro = true;
      for (const o of w.active) if (!o.aggro && near(o, m.x, m.z, 6)) o.aggro = true;
      emit(w, { t: 'maggro', id: m.id, x: m.x, z: m.z, type: m.type });
    } else if (m.flash > 0 || m.hp < m.maxHp) m.aggro = true;
    else return;
  }
  if (m.hasteT > 0) { m.hasteT -= DT; }
  const speedSave = m.speed; if (m.affl.includes('penitent_haste')) m.speed *= 1.4 * (m.hasteT > 0 ? 1.6 : 1);
  if (m.rootT > 0) { m.speed = 0; }
  BRAINS[m.defn.brain]?.(w, m, t, d);
  m.speed = speedSave;
}

const HOT = new Set();
export function separation(w) {
  // Spatial hash with 1.5 m cells: soft shove so a horde spreads instead of stacking.
  const cells = w._hash ?? (w._hash = new Map()); cells.clear();
  for (const m of w.active) { const k = (Math.floor(m.x / 1.5) << 12) ^ Math.floor(m.z / 1.5); let c = cells.get(k); if (!c) { c = []; cells.set(k, c); } c.push(m); }
  for (const c of cells.values()) {
    if (c.length < 2) continue;
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      const a = c[i]; const b = c[j]; if (a.static || b.static) continue;
      const dx = a.x - b.x; const dz = a.z - b.z; const rr = a.r + b.r; const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.01; const push = ((rr - d) / 2) * 0.35; const nx = d2 > 1e-5 ? dx / d : (a.id % 2) - 0.5; const nz = d2 > 1e-5 ? dz / d : 0.5 - (b.id % 2);
        if (!a.defn.boss) moveCircle(w, a, nx * push, nz * push, a.r * 0.5);
        if (!b.defn.boss) moveCircle(w, b, -nx * push, -nz * push, b.r * 0.5);
      }
    }
  }
}

// A death pays out: XP, drops per seat, Tallow, Graves, Requiem, Knell.
export function killMonster(w, m, killer, o = {}) {
  if (m.dead) return;
  if (m.affl.includes('undying') && !m.rose) {
    m.rose = true; m.hp = Math.round(m.maxHp / 2); m.stunT = 1.2; m.flash = 8;
    emit(w, { t: 'rise', id: m.id, x: m.x, z: m.z }); emit(w, { t: 'vfx', kind: 'ring_grave', x: m.x, z: m.z, r: 2 }); return;
  }
  if (m.defn.boss && !o.bossDone) { if (bossOnDeath(w, m, killer)) return; }
  m.dead = true;
  m.deathSeq = o;
  emit(w, { t: 'death', id: m.id, type: m.type, x: m.x, z: m.z, elite: m.elite, ax: o.ax ?? 0, az: o.az ?? 0, overkill: o.overkill ?? 0, by: killer?.seat ?? -1, dot: o.dot, burst: m.defn.burst, big: m.defn.big });
  w.bestiary[m.type] = (w.bestiary[m.type] ?? 0) + 1;
  w.stats.kills++;
  w.lastKill = m;
  const xpBase = F.monsterXp(m.level, m.defn.xp * (m.xpMul ?? 1));
  for (const h of w.heroes) {
    if (h.left) continue;
    grantXp(w, h, xpBase);
    if (near(h, m.x, m.z, 14) && h.cls === 'sexton') gainResource(h, 3 + (h.vows.includes('mourners_due') ? 2 : 0));
    if (m.status.curse?.tithe && h.cls === 'sexton') gainResource(h, m.status.curse.tithe);
    if (h.vows.includes('silence') && h === killer) addBuff(w, h, { id: 'silence', dur: 3, speed: 0.15 });
    if (h.vows.includes('clamour') && h === killer) { gainResource(h, 20); h.clamorHold = 8; }
  }
  if (killer) { killer.kills++; if (m.elite) killer.eliteKills++; killer.hp = Math.min(killer.stats.maxHp, killer.hp); }
  if (m.stolen && m.stolenFrom) { m.stolenFrom.gold += m.stolen; emit(w, { t: 'toast', seat: m.stolenFrom.seat, text: `RECOVERED ${m.stolen} GOLD.`, color: 'sand' }); }
  // Requiem: kills within a second of each other chain.
  const r = w.requiem;
  if (r.t > 0) r.n++; else { r.n = 1; r.xp = 0; }
  r.t = 1; r.xp += xpBase;
  // Corpses become Graves for the Graveyard Shift.
  if (!m.static && !m.summoned && w.heroes.some((h) => h.cls === 'sexton') || (m.summoned && w.rngs.ai.chance(0.2) && w.heroes.some((h) => h.cls === 'sexton'))) {
    const t = w.heroes.some((h) => h.vows.includes('plot_holder')) ? 20 : 12;
    w.graves.push({ id: w.nextId++, x: m.x, z: m.z, t }); emit(w, { t: 'grave', x: m.x, z: m.z });
    if (w.graves.length > 40) { const g = w.graves.shift(); emit(w, { t: 'graveburst', id: g.id, x: g.x, z: g.z, quiet: true }); }
  }
  if (!m.noLoot) w.hooks.dropsFor(w, m);
  // Volatile (Knell modifier) and Smouldering explode after a beat.
  if (w.knell?.mods?.includes('volatile') || m.affl.includes('smouldering')) { const hx = m.x; const hz = m.z; telegraph(w, { kind: 'circle', x: hx, z: hz, r: 2.6, dur: 1, dmg: m.hit * 0.8, level: m.level, name: 'A CLOSE CORPSE', vfx: 'ring_fire', sfx: 'explode_fire', color: 'orange' }); }
  w.hooks.onKill?.(w, m, killer);
}

export function stepRequiem(w) {
  const r = w.requiem;
  if (r.t > 0) {
    r.t -= DT;
    if (r.t <= 0) {
      if (r.n >= 10) {
        const bonus = r.xp * r.n * 0.02;
        for (const h of w.heroes) if (!h.left) grantXp(w, h, bonus);
        emit(w, { t: 'requiem', n: r.n, xp: Math.round(bonus) }); w.requiems = (w.requiems ?? 0) + 1;
      }
      r.n = 0;
    }
  }
}
export function stepGraves(w) { for (let i = w.graves.length - 1; i >= 0; i--) { w.graves[i].t -= DT; if (w.graves[i].t <= 0) { emit(w, { t: 'graveburst', id: w.graves[i].id, x: w.graves[i].x, z: w.graves[i].z, quiet: true }); w.graves.splice(i, 1); } } }
export const KNELL_OF = (m) => (m.elite === 'rare' ? KNELL_VALUES.rare : m.elite === 'champion' ? KNELL_VALUES.champion : m.defn.big ? KNELL_VALUES.big : m.summoned ? 0 : KNELL_VALUES.trash);
export { makeItem, randomGem, rollDrop, rollLegendaryItem, walkable };
