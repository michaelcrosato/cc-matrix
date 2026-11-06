// A bot that plays by intents and commands. Attract mode, Sister Pyx, dev mode's "bot plays this hero"
// and the whole-game playthrough all use it. It knows where things are; it cheats only in knowledge.
import { CLASSES, VOWS } from '../data/classes.js';
import { SKILLS } from '../data/skills.js';
import { RULES } from '../data/tuning.js';
import { dist, nearestEnemy } from './core.js';
import { resolveSkill, toneUnlocked } from './effects.js';
import { skillCharges, skillUnlocked, slotOpen } from './hero.js';
import { BTN, SLOT_BITS, emptyIntent } from './intents.js';
import { isUpgrade } from './loot.js';
import { objectByKey, usableObjects } from './objects.js';
import { objectiveOf } from './quests.js';
import { applyCommand, zoneOpen } from './commands.js';

export function newBotMemory(o = {}) {
  return { t: 0, path: null, pathI: 0, pathGoal: null, pathT: 0, stuckT: 0, lastX: 0, lastZ: 0, wander: 0, rot: 0, manageT: 0, hold: 0, talkT: 0, ...o };
}

function hazardAt(w, h) {
  for (const a of w.areas) {
    if (a.team !== 1) continue;
    if (a.kind === 'tele_ring') {
      if (dist(h.x, h.z, a.x, a.z) <= a.r + 0.6) return a;
    } else if (a.kind === 'tele_line') {
      const px = h.x - a.x, pz = h.z - a.z;
      const along = px * a.dx + pz * a.dz;
      if (along >= -0.5 && along <= a.len && Math.abs(px * a.dz - pz * a.dx) <= a.width / 2 + 0.5) return a;
    } else if (a.kind === 'wave') {
      const rad = a.speed * a.t;
      if (Math.abs(dist(h.x, h.z, a.x, a.z) - rad) < 1.8) return a;
    }
  }
  return null;
}

function moveAlong(w, h, mem, gx, gz, it) {
  if (dist(h.x, h.z, gx, gz) < 0.3) return false;
  if (w.zone.nav.lineOfSight(h.x, h.z, gx, gz, h.r * 0.9)) {
    const l = Math.hypot(gx - h.x, gz - h.z) || 1;
    it.mx = (gx - h.x) / l; it.mz = (gz - h.z) / l;
    return true;
  }
  const same = mem.pathGoal && Math.abs(mem.pathGoal[0] - gx) < 0.5 && Math.abs(mem.pathGoal[1] - gz) < 0.5;
  if (!mem.path || !same || mem.pathT <= w.time) {
    mem.path = w.zone.nav.path([h.x, 0, h.z], [gx, 0, gz]);
    mem.pathI = 1; mem.pathGoal = [gx, gz]; mem.pathT = w.time + 1;
  }
  if (!mem.path) return false;
  while (mem.pathI < mem.path.length && dist(h.x, h.z, mem.path[mem.pathI][0], mem.path[mem.pathI][2]) < 0.45) mem.pathI++;
  const p = mem.path[mem.pathI];
  if (!p) return false;
  const l = Math.hypot(p[0] - h.x, p[2] - h.z) || 1;
  it.mx = (p[0] - h.x) / l; it.mz = (p[2] - h.z) / l;
  return true;
}

function canAfford(w, h, sk) {
  if (sk.cost && h.res < sk.cost * (1 - h.stats.costred) && !h.attract && !w.cheats.infRes) return false;
  if (sk.cd && skillCharges(h, sk) <= 0 && !h.attract && !w.cheats.noCd) return false;
  return true;
}

function pickSkill(w, h, mem, target, d) {
  let basic = -1;
  const rotating = [];
  for (let i = 0; i < 6; i++) {
    const s = h.skills[i];
    if (!s) continue;
    const sk = resolveSkill(h, s.id, s.tone);
    if (!canAfford(w, h, sk)) continue;
    if (!sk.cost && !sk.cd) { if (basic < 0 || d <= (sk.range ?? 2)) basic = i; continue; }
    const range = sk.range ?? 8;
    if (sk.id === 'exhume' && !w.graves.some((g) => dist(g.x, g.z, h.x, h.z) < 12)) continue;
    if (sk.id === 'snuff' && !target.status?.burn) continue;
    if (sk.id === 'raise_pallbearers' && w.allies.filter((a) => a.owner === h.id && a.def.ai === 'minion').length >= 4) continue;
    if (d <= range + 1 || sk.ground) rotating.push(i);
  }
  if (rotating.length) {
    mem.rot = (mem.rot + 1) % 997;
    return rotating[mem.rot % rotating.length];
  }
  return basic;
}

/** One frame's intent for a hero. */
export function botIntent(w, h, mem) {
  const it = emptyIntent();
  mem.t += 1 / 60;
  if (h.dead) return it;
  const zone = w.zone;
  if (h.hp < h.stats.maxHp * 0.45 && h.potionCd <= 0) it.pressed |= BTN.POTION;

  // Stuck? Try another way for a moment.
  if (mem.t - (mem.checkT ?? 0) > 1) {
    mem.checkT = mem.t;
    const moved = Math.hypot(h.x - mem.lastX, h.z - mem.lastZ);
    mem.lastX = h.x; mem.lastZ = h.z;
    mem.stuckT = moved < 0.3 ? mem.stuckT + 1 : 0;
    if (mem.stuckT >= 4) { mem.wander = 1.2; mem.wanderA = w.rng.range(-3.14, 3.14); mem.stuckT = 0; mem.path = null; }
  }

  // Get out of the red.
  const hz = hazardAt(w, h);
  if (hz) {
    if (h.dodgeCd <= 0 && (hz.t / hz.life > 0.35 || hz.kind === 'wave')) it.pressed |= BTN.DODGE;
    let ax = h.x - hz.x, az = h.z - hz.z;
    if (hz.kind === 'tele_line') { ax = -hz.dz; az = hz.dx; if ((h.x - hz.x) * ax + (h.z - hz.z) * az < 0) { ax = -ax; az = -az; } }
    const l = Math.hypot(ax, az) || 1;
    it.mx = ax / l; it.mz = az / l;
    if (!w.zone.nav.walkable(h.x + it.mx, h.z + it.mz)) { it.mx = -az / l; it.mz = ax / l; }
    const near = nearestEnemy(w, h.x, h.z, 9);
    if (near) { it.ax = near.x; it.az = near.z; it.aimed = 2; it.tgt = near.id; }
    return it;
  }
  // The great bell tolls: roll on the toll.
  const boss = w.boss;
  if (boss?.def.boss === 'malison' && boss.bossState.phase === 2 && boss.bossState.toll < 0.25 && h.dodgeCd <= 0 && !boss.dead) it.pressed |= BTN.DODGE;

  if (mem.wander > 0) { mem.wander -= 1 / 60; it.mx = Math.cos(mem.wanderA); it.mz = Math.sin(mem.wanderA); return it; }

  if (h.companion) return companionThink(w, h, mem, it);
  if (h.attract) return attractThink(w, h, mem, it);

  // The objective for hold-the-line steps.
  const obj = mem.override ?? (w.camp ? objectiveOf(w) : null);
  const ropeTime = obj?.key === 'rope';
  if (ropeTime) return ropeThink(w, h, mem, it);
  const escortAnchor = obj?.escort ? objectByKey(w, 'wagon') : obj?.defend ? objectByKey(w, 'novice') : null;

  // Fight what is near.
  const fightRange = boss ? 22 : 12;
  const target = pickTarget(w, h, fightRange);
  if (target) return fightThink(w, h, mem, it, target, escortAnchor);

  // Pick up what fell for us.
  const loot = nearestLoot(w, h);
  if (loot) { moveAlong(w, h, mem, loot.x, loot.z, it); return it; }

  // Break what is near, for the gold, sometimes.
  if (w.run?.state === 'fill' || escortAnchor) {
    if (escortAnchor) { if (dist(h.x, h.z, escortAnchor.x, escortAnchor.z) > 5) moveAlong(w, h, mem, escortAnchor.x, escortAnchor.z, it); return it; }
  }
  if (w.run) return runThink(w, h, mem, it);
  if (mem.tour) { const o = tourTarget(w, h); if (o) return walkUse(w, h, mem, it, o); }
  if (!obj) return freeThink(w, h, mem, it);
  return objectiveThink(w, h, mem, it, obj);
}

/** Everything worth using nearby: gates, shrines, chests, books, levers, by the shortest walk. */
function tourTarget(w, h) {
  let best = null, bd = Infinity;
  for (const o of w.objects) {
    if (o.hidden) continue;
    const want = (o.kind === 'lychgate' && !w.camp?.gates[`${w.zone.id}:${w.zone.floor}`]) || ((o.kind === 'shrine' || o.kind === 'chest' || o.kind === 'book' || o.kind === 'lever') && o.state === 0);
    if (!want) continue;
    const d = (o.x - h.x) ** 2 + (o.z - h.z) ** 2;
    if (d < bd && w.zone.nav.path([h.x, 0, h.z], [o.x, 0, o.z])) { bd = d; best = o; }
  }
  return best;
}

function pickTarget(w, h, range) {
  let best = null, bs = Infinity;
  for (const m of w.monsters) {
    if (m.dead || m.hidden) continue;
    const d = dist(h.x, h.z, m.x, m.z);
    if (d > range + (m.def.boss ? 8 : 0)) continue;
    const score = d - (m.def.boss ? 2 : 0) - (m.elite ? 1 : 0) - (m.def.ai === 'spawner' ? 2 : 0) + (m.def.ai === 'plate' ? -4 : 0);
    if (score < bs && (d < 3 || w.zone.nav.lineOfSight(h.x, h.z, m.x, m.z))) { bs = score; best = m; }
  }
  return best;
}

function nearestLoot(w, h) {
  let best = null, bd = 12 * 12;
  for (const d of w.drops) {
    if (d.owner !== h.seat || d.t < 0.2) continue;
    if (d.kind === 'gold' || d.kind === 'coin') continue;
    if (d.kind === 'item' && h.inv.indexOf(null) < 0) continue;
    const dd = (d.x - h.x) ** 2 + (d.z - h.z) ** 2;
    if (dd < bd && w.zone.nav.lineOfSight(h.x, h.z, d.x, d.z)) { bd = dd; best = d; }
  }
  if (best) return best;
  if (h.hp < h.stats.maxHp * 0.7) {
    for (const d of w.drops) {
      if (d.kind !== 'tallow' && d.kind !== 'coin') continue;
      const dd = (d.x - h.x) ** 2 + (d.z - h.z) ** 2;
      if (dd < bd) { bd = dd; best = d; }
    }
  }
  return best;
}

function fightThink(w, h, mem, it, target, anchor = null) {
  const d = dist(h.x, h.z, target.x, target.z) - target.r;
  const slot = pickSkill(w, h, mem, target, d);
  it.ax = target.x; it.az = target.z; it.aimed = 2; it.tgt = target.id;
  const sk = slot >= 0 ? resolveSkill(h, h.skills[slot].id, h.skills[slot].tone) : null;
  const range = sk?.range ?? 2.4;
  if (slot >= 0 && d <= range) {
    it.pressed |= SLOT_BITS[slot];
    it.held |= SLOT_BITS[slot];
    // Spellcasters keep their distance.
    if (sk.moveCast && h.cls !== 'bellwarden' && d < 4) {
      const l = dist(h.x, h.z, target.x, target.z) || 1;
      it.mx = (h.x - target.x) / l; it.mz = (h.z - target.z) / l;
      if (!w.zone.nav.walkable(h.x + it.mx, h.z + it.mz)) { it.mx = 0; it.mz = 0; }
    }
    return it;
  }
  moveAlong(w, h, mem, target.x, target.z, it);
  return it;
}

function ropeThink(w, h, mem, it) {
  const m = w.boss;
  const ropes = w.objects.filter((o) => o.kind === 'rope' && !o.hidden && o.state === 0);
  if (!ropes.length) return it;
  ropes.sort((a, b) => dist(a.x, a.z, h.x, h.z) - dist(b.x, b.z, h.x, h.z));
  const r = ropes[0];
  if (dist(h.x, h.z, r.x, r.z) <= RULES.interactRange - 0.3) { it.held |= BTN.INTERACT; return it; }
  moveAlong(w, h, mem, r.x, r.z, it);
  return it;
}

function companionThink(w, h, mem, it) {
  const lead = w.heroes.find((o) => !o.companion && !o.gone && !o.dead) ?? w.heroes.find((o) => !o.companion);
  if (!lead) return it;
  const d = dist(h.x, h.z, lead.x, lead.z);
  if (d > 26) { h.x = lead.x + 1; h.z = lead.z + 1; if (!w.zone.nav.walkable(h.x, h.z)) { h.x = lead.x; h.z = lead.z; } return it; }
  const near = nearestEnemy(w, h.x, h.z, 13, (m) => !m.hidden);
  if (near && w.zone.nav.lineOfSight(h.x, h.z, near.x, near.z)) {
    const slot = pickSkill(w, h, mem, near, dist(h.x, h.z, near.x, near.z));
    it.ax = near.x; it.az = near.z; it.aimed = 2; it.tgt = near.id;
    if (slot >= 0) { it.pressed |= SLOT_BITS[slot]; it.held |= SLOT_BITS[slot]; }
    const m = dist(h.x, h.z, near.x, near.z);
    if (m < 4) { const l = m || 1; it.mx = (h.x - near.x) / l; it.mz = (h.z - near.z) / l; if (!w.zone.nav.walkable(h.x + it.mx, h.z + it.mz)) { it.mx = 0; it.mz = 0; } }
    else if (d > 12) moveAlong(w, h, mem, lead.x, lead.z, it);
    return it;
  }
  if (d > 4) moveAlong(w, h, mem, lead.x + 1, lead.z + 1, it);
  return it;
}

function attractThink(w, h, mem, it) {
  const target = pickTarget(w, h, 16);
  if (target) return fightThink(w, h, mem, it, target);
  if (mem.goalX !== undefined && dist(h.x, h.z, mem.goalX, mem.goalZ) > 1) { moveAlong(w, h, mem, mem.goalX, mem.goalZ, it); return it; }
  const next = w.zone.spawnList.find((s) => !s.done);
  const r = next ?? w.rng.pick(w.zone.rooms);
  mem.goalX = next ? next.x : r.cx; mem.goalZ = next ? next.z : r.cz;
  return it;
}

function runThink(w, h, mem, it) {
  const r = w.run;
  if (r.state === 'done') {
    const home = objectByKey(w, 'run_home');
    if (home) return walkUse(w, h, mem, it, home);
    return it;
  }
  if (r.state === 'warden') {
    const lead = r.warden;
    if (lead && !lead.dead) { moveAlong(w, h, mem, lead.x, lead.z, it); }
    return it;
  }
  const next = nearestSpawn(w, h);
  if (next) { moveAlong(w, h, mem, next.x, next.z, it); return it; }
  const stairs = objectByKey(w, 'exit_on');
  if (stairs) return walkUse(w, h, mem, it, stairs);
  // Everything spawned is dead: the knell tick raises more; wait in the middle of things.
  return it;
}

function nearestSpawn(w, h) {
  let best = null, bd = Infinity;
  for (const s of w.zone.spawnList) {
    if (s.done) continue;
    const d = (s.x - h.x) ** 2 + (s.z - h.z) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function walkUse(w, h, mem, it, o) {
  if (dist(h.x, h.z, o.x, o.z) <= RULES.interactRange - 0.4) {
    it.pressed |= BTN.INTERACT;
    h.useSel = 0;
    // Make sure the thing we walked to is the first in the list.
    const list = usableObjects(w, h);
    const i = list.indexOf(o);
    if (i > 0) h.useSel = i;
    return it;
  }
  moveAlong(w, h, mem, o.x, o.z, it);
  return it;
}

function freeThink(w, h, mem, it) { return attractThink(w, h, mem, it); }

function objectiveThink(w, h, mem, it, obj) {
  const zone = w.zone;
  if (obj.zone && obj.zone !== zone.id) {
    if (zone.def.safe) {
      // In town: the map takes us anywhere open.
      mem.travel = { zone: obj.zone, floor: 0 };
      return it;
    }
    // Only one way into some places: back out first, or down through the door that leads there.
    if (obj.via && zone.id === obj.via.zone) {
      const door = objectByKey(w, obj.via.key);
      if (door) return walkUse(w, h, mem, it, door);
    }
    if (zone.def.bellOk !== false && !w.run) { it.held |= BTN.BELL; return it; }
    const back = objectByKey(w, 'exit_back') ?? objectByKey(w, 'yard_gate');
    if (back) return walkUse(w, h, mem, it, back);
    return it;
  }
  if (obj.floor !== undefined && obj.floor !== zone.floor) {
    const o = objectByKey(w, obj.floor > zone.floor ? 'exit_on' : 'exit_back');
    if (o) {
      const res = walkUse(w, h, mem, it, o);
      if (!it.mx && !it.mz && !(it.pressed & BTN.INTERACT)) return leverOr(w, h, mem, it);
      return res;
    }
    return leverOr(w, h, mem, it);
  }
  if (obj.key) {
    const o = objectByKey(w, obj.key);
    if (o && !o.hidden) {
      if (o.kind === 'npc' || o.kind === 'coffin' || o.kind === 'gate' || o.kind === 'relic' || o.kind === 'ledger' || o.kind === 'lychgate' || obj.use) {
        if (o.kind === 'coffin' && o.state !== 0) { return it; }
        if (o.kind === 'gate' && o.locked) { return it; }
        const res = walkUse(w, h, mem, it, o);
        if (!it.mx && !it.mz && !(it.pressed & BTN.INTERACT)) return leverOr(w, h, mem, it);
        return res;
      }
      if (dist(h.x, h.z, o.x, o.z) > 4) { moveAlong(w, h, mem, o.x, o.z, it); if (!it.mx && !it.mz) return leverOr(w, h, mem, it); }
      return it;
    }
  }
  if (obj.boss) {
    const room = zone.rooms.find((r) => r.tpl?.boss === obj.boss);
    if (room) {
      const gx = w.boss ? w.boss.x : room.cx, gz = w.boss ? w.boss.z : room.cz;
      moveAlong(w, h, mem, gx, gz, it);
      if (!it.mx && !it.mz && !w.boss) return leverOr(w, h, mem, it);
      return it;
    }
  }
  if (obj.x !== undefined) { moveAlong(w, h, mem, obj.x, obj.z, it); return it; }
  if (obj.fight && w.boss) { moveAlong(w, h, mem, w.boss.x, w.boss.z, it); return it; }
  return it;
}

function leverOr(w, h, mem, it) {
  const lever = w.objects.find((o) => o.kind === 'lever' && o.state === 0);
  if (lever) return walkUse(w, h, mem, it, lever);
  return it;
}

// ---- Keeping house: equip, assign, vow. Called now and then with commands, like a menu would. ----
export function botManage(w, h, mem, o = {}) {
  const seat = h.seat;
  const cmd = (c) => applyCommand(w, seat, c);
  // Equip what is better.
  for (const it of h.inv) {
    if (it && isUpgrade(h, it, w.account, w.tuning)) cmd({ c: 'equip', uid: it.uid });
  }
  // Fill empty slots with what is unlocked; generators first, then the newest.
  const known = CLASSES[h.cls].skills.filter((id) => skillUnlocked(h, id));
  const missing = known.filter((id) => !h.skills.some((s) => s?.id === id));
  for (let i = 0; i < 6; i++) {
    if (!slotOpen(h, i) || h.skills[i]) continue;
    const id = missing.shift();
    if (id) cmd({ c: 'skill', slot: i, id });
  }
  // With every slot full, keep the newest skills in rotation so everything gets used.
  if (o.rotateSkills && missing.length) {
    const i = 2 + Math.floor(w.rng.next() * 4);
    if (slotOpen(h, i)) cmd({ c: 'skill', slot: i, id: missing[Math.floor(w.rng.next() * missing.length)] });
  }
  // Tones: try them all as they open.
  if (o.rotateTones) {
    for (const s of h.skills) {
      if (!s) continue;
      const opts = Object.keys(SKILLS[s.id].tones).filter((t) => toneUnlocked(h, s.id, t));
      if (opts.length) cmd({ c: 'tone', id: s.id, tone: opts[Math.floor(w.rng.next() * opts.length)] });
    }
  }
  // Vows.
  RULES.vowLevels.forEach((lv, idx) => {
    if (h.level >= lv && !h.vows[idx]) {
      const pool = VOWS[h.cls].filter((v) => !h.vows.includes(v.id));
      if (pool.length) cmd({ c: 'vow', index: idx, id: pool[0].id });
    }
  });
  // Pack nearly full: salvage what is not worth keeping.
  const free = h.inv.filter((x) => !x).length;
  if (free < 6) {
    for (const it of [...h.inv]) {
      if (!it || it.rarity === 'legendary' || it.rarity === 'set') continue;
      cmd({ c: 'salvage', uid: it.uid });
    }
  }
}

/** Whatever a dialogue, map or death screen would have the player do. */
export function botAfter(w, h, mem) {
  if (h.dead) {
    if (h.deadT >= (h.deathWait ?? 5)) applyCommand(w, h.seat, { c: 'rise', how: 'here' });
    return;
  }
  if (mem.travel) {
    const t = mem.travel;
    mem.travel = null;
    if (zoneOpen(w, t.zone)) applyCommand(w, h.seat, { c: 'travel', zone: t.zone, floor: 0 });
  }
}

export { BTN };
