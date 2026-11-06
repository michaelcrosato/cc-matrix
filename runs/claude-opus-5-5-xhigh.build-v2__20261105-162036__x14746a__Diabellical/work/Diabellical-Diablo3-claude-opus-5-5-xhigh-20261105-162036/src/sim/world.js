// The world: one object for a whole session, one step function. Solo is a party of one.
import { Rng } from '../../pixel-engine.js';
import { defaultTuning, DIFFICULTIES, RULES } from '../data/tuning.js';
import { DT, dist, ev } from './core.js';
import { spawnArea, stepObstacles, stepSched, endShot, spawnShot, gainRes, healHero, resolveSkill, applyHit, runOps, addBuff } from './effects.js';
import { stepEnemyArea } from './hazards.js';
import { addHero, heroToData, hurtHero, stepHero, stepRevives } from './hero.js';
import { EMPTY_INTENT } from './intents.js';
import { stepDrops } from './loot.js';
import { damageMonster, stepAllies, stepMonsters, monsterLevel } from './monsters.js';
import { stepObjects } from './objects.js';
import { newCampaign, questInit, stepQuests } from './quests.js';
import { stepRound } from './round.js';
import { loadZone, riseAtGate } from './travel.js';
import { computeHit } from './effects.js';

export function newAccount() {
  return {
    stash: Array.from({ length: RULES.stashTabs }, () => Array(RULES.stashSize).fill(null)),
    devotion: { level: 0, xp: 0, points: 0, spent: { core: [0, 0, 0, 0], offence: [0, 0, 0, 0], defence: [0, 0, 0, 0], utility: [0, 0, 0, 0] } },
    unlocks: { knell: false, penance: false }, bests: {}, powers: {},
  };
}

export function createWorld(o = {}) {
  const seed = o.seed ?? 1;
  const w = {
    seed, root: new Rng(seed), t: 0, time: 0, nextId: 1, tuning: { ...defaultTuning(), ...(o.tuning ?? {}) }, difficulty: o.difficulty ?? 0, diffDef: DIFFICULTIES[o.difficulty ?? 0],
    heroes: [], monsters: [], allies: [], shots: [], areas: [], drops: [], objects: [], props: [], graves: [], obstacles: [], sched: [], events: [], hash: new Map(), zone: null, boss: null, coffin: null,
    cheats: { god: false, oneHit: false, noCd: false, infRes: false, noClip: false, invisible: false }, account: o.account ?? newAccount(), camp: o.camp === undefined ? newCampaign() : o.camp, run: null, round: null, pendingZone: null, graveLife: RULES.graveLife,
    mode: o.mode ?? 'campaign',
  };
  w.rng = w.root.fork('sim');
  w.lootRng = w.root.fork('loot');
  w.resolveSkillOp = (h, id, tone) => resolveSkill(h, id, tone).fx[0];
  return w;
}

export function stepWorld(w, intents = []) {
  w.t++;
  w.time = w.t * DT;
  stepRound(w);
  stepHeroAreas(w);
  for (const h of w.heroes) stepHero(w, h, intents[h.seat] ?? EMPTY_INTENT);
  stepRevives(w, intents);
  stepMonsters(w);
  stepAllies(w);
  stepShots(w);
  stepAreas(w);
  stepObstacles(w);
  stepSched(w);
  stepDrops(w);
  stepObjects(w);
  stepGraves(w);
  stepQuests(w);
  markSeen(w);
  if (w.pendingRise) { const pr = w.pendingRise; w.pendingRise = null; const h = w.heroes.find((o) => o.seat === pr.seat); if (h) riseAtGate(w, h, pr.how); }
  if (w.pendingZone) {
    const p = w.pendingZone;
    w.pendingZone = null;
    loadZone(w, p.zone, p.floor, p.entry);
  }
}

function stepGraves(w) {
  for (let i = w.graves.length - 1; i >= 0; i--) {
    const g = w.graves[i];
    g.t -= DT;
    if (g.t <= 0) { ev(w, { t: 'gravex', id: g.id }); w.graves.splice(i, 1); }
  }
}

function stepHeroAreas(w) {
  for (const h of w.heroes) { h.areaDr = 0; h.areaDmg = 0; h.areaRegen = 0; h.areaStun = false; }
  for (const m of w.monsters) { m.slowFromArea = 0; m.vuln = 0; }
  for (const a of w.areas) {
    if (a.team === 1) continue;
    if (!(a.allyDr || a.allyDmg || a.allyRegen || a.allyStunImmune || a.enemySlow || a.enemyVuln)) continue;
    for (const h of w.heroes) {
      if (h.dead || h.gone || dist(h.x, h.z, a.x, a.z) > a.r) continue;
      h.areaDr = Math.max(h.areaDr, a.allyDr); h.areaDmg = Math.max(h.areaDmg, a.allyDmg); h.areaRegen = Math.max(h.areaRegen, a.allyRegen);
      if (a.allyStunImmune) h.areaStun = true;
    }
    if (a.enemySlow || a.enemyVuln) {
      for (const m of w.monsters) {
        if (m.dead || dist(m.x, m.z, a.x, a.z) > a.r + m.r) continue;
        m.slowFromArea = Math.max(m.slowFromArea, a.enemySlow); m.vuln = Math.max(m.vuln, a.enemyVuln);
      }
    }
  }
}

function stepShots(w) {
  for (let i = w.shots.length - 1; i >= 0; i--) {
    const s = w.shots[i];
    s.life -= DT;
    if (s.tgt) {
      const t = w.monsters.find((m) => m.id === s.tgt && !m.dead);
      if (t) {
        const dx = t.x - s.x, dz = t.z - s.z, l = Math.hypot(dx, dz) || 1;
        s.vx += ((dx / l) * s.speed - s.vx) * 0.12;
        s.vz += ((dz / l) * s.speed - s.vz) * 0.12;
      }
    }
    s.x += s.vx * DT;
    s.z += s.vz * DT;
    if (s.life <= 0 || !w.zone.nav.walkable(s.x, s.z) && !isPit(w, s.x, s.z)) { endShot(w, i, s, false); continue; }
    if (s.team === 1) {
      if (w.areas.some((a) => a.stopsShots && dist(a.x, a.z, s.x, s.z) <= a.r)) { endShot(w, i, s, false); continue; }
      let hit = false;
      for (const h of w.heroes) {
        if (h.dead || h.gone || dist(h.x, h.z, s.x, s.z) > h.r + s.r) continue;
        if (h.state === 'dodge' || h.invuln > 0) continue;
        hurtHero(w, h, s.dmg, { src: null, el: s.el });
        hit = true;
        break;
      }
      if (hit) { endShot(w, i, s, true); continue; }
      continue;
    }
    const h = w.heroes.find((o) => o.id === s.owner);
    if (!h) { endShot(w, i, s, false); continue; }
    let done = false;
    for (const m of w.monsters) {
      if (m.dead || m.hidden || (s.hit && s.hit.has(m.id))) continue;
      const rr = s.r + m.r;
      if ((m.x - s.x) ** 2 + (m.z - s.z) ** 2 > rr * rr) continue;
      const c = { x: s.x - s.vx * 0.02, z: s.z - s.vz * 0.02, dx: s.vx / s.speed, dz: s.vz / s.speed, sk: s.sk ?? null, mult: s.mult, kills: 0 };
      applyHit(w, h, m, s.op, c);
      if (s.op?.forkOnKill && c.kills > 0) {
        const n = s.op.forkOnKill;
        const base = Math.atan2(s.vz, s.vx);
        for (let k = 0; k < n; k++) {
          const a = base + (k === 0 ? -0.5 : 0.5);
          const fork = spawnShot(w, { owner: h.id, team: 0, kind: s.kind, x: s.x, z: s.z, dx: Math.cos(a), dz: Math.sin(a), speed: s.speed, range: 10, op: { ...s.op, forkOnKill: 0 }, sk: s.sk });
          fork.hit = new Set([m.id]);
        }
      }
      if (s.pierce > 0) { s.pierce--; (s.hit ??= new Set()).add(m.id); }
      else { done = true; }
      break;
    }
    if (done) { endShot(w, i, s, true); continue; }
    if (w.props.length) {
      for (const p of w.props) {
        if (p.broken || (p.x - s.x) ** 2 + (p.z - s.z) ** 2 > 0.5) continue;
        import_breakProp(w, p, s.x, s.z, h);
        endShot(w, i, s, true);
        done = true;
        break;
      }
    }
  }
}

import { breakProp as import_breakProp } from './objects.js';

const isPit = (w, x, z) => {
  const row = w.zone.rows[Math.floor(z)];
  const ch = row?.[Math.floor(x)];
  return ch === '~';
};

function stepAreas(w) {
  for (let i = w.areas.length - 1; i >= 0; i--) {
    const a = w.areas[i];
    if (a.team === 1) { stepEnemyArea(w, a, i); continue; }
    a.t += DT;
    if (a.follow) { const h = w.heroes.find((o) => o.id === a.follow); if (h && !h.dead) { a.x = h.x; a.z = h.z; ev2follow(w, a); } }
    if (a.followTarget) {
      const m = w.monsters.find((o) => o.id === a.followTarget && !o.dead);
      if (m) { a.x = m.x; a.z = m.z; ev2follow(w, a); }
    }
    if (a.t >= a.nextTick) {
      a.nextTick += a.tick;
      const h = a.h;
      if (a.dmg && h && !h.gone) {
        for (const m of w.monsters) {
          if (m.dead || m.hidden || dist(m.x, m.z, a.x, a.z) > a.r + m.r) continue;
          const [d, crit] = computeHit(w, h, m, a.dmg, a.el, null);
          damageMonster(w, m, d, { src: h, crit, el: a.el, dot: true });
        }
      }
      if (a.drag) for (const m of w.monsters) {
        if (m.dead || m.def.static || m.def.huge || dist(m.x, m.z, a.x, a.z) > a.r + 1) continue;
        const dx = a.x - m.x, dz = a.z - m.z, l = Math.hypot(dx, dz) || 1;
        m.kx += (dx / l) * a.drag; m.kz += (dz / l) * a.drag;
      }
      if (a.allyHeal) for (const o of w.heroes) if (!o.dead && !o.gone && dist(o.x, o.z, a.x, a.z) <= a.r) healHero(w, o, a.allyHeal * a.tick);
    }
    if (a.t >= a.life) {
      w.areas.splice(i, 1);
      ev(w, { t: 'areax', id: a.id });
      if (a.endBlast && a.h && !a.h.gone) runOps(w, a.h, [{ op: 'ring', radius: a.endBlast.radius, dmg: a.endBlast.dmg, el: a.endBlast.el, vfx: 'fire_burst', sfx: 'blast', shake: 0.4, wave: true }], { x: a.x, z: a.z, dx: 0, dz: 1, sk: null });
    }
  }
}

function ev2follow(w, a) { if (w.t % 6 === 0) ev(w, { t: 'areamove', id: a.id, x: a.x, z: a.z }); }

function markSeen(w) {
  if (w.t % 20 !== 0) return;
  const z = w.zone;
  for (const h of w.heroes) {
    if (h.gone) continue;
    const cx = Math.floor(h.x), cz = Math.floor(h.z), R = 12;
    for (let j = Math.max(0, cz - R); j <= Math.min(z.h - 1, cz + R); j++) {
      for (let i = Math.max(0, cx - R); i <= Math.min(z.w - 1, cx + R); i++) {
        if ((i - cx) ** 2 + (j - cz) ** 2 <= R * R) z.seen[j * z.w + i] = 1;
      }
    }
  }
}

/** The save-relevant state of a hero and campaign. */
export function worldHash(w) {
  let s = `${w.t}|${w.zone?.id}|${w.zone?.floor}|${w.nextId}|${w.rng.state}|${w.lootRng.state}`;
  for (const h of w.heroes) s += `|${h.x.toFixed(3)},${h.z.toFixed(3)},${h.hp.toFixed(2)},${h.level},${Math.round(h.xp)},${h.gold}`;
  s += `|m${w.monsters.length}`;
  for (const m of w.monsters) s += `,${m.x.toFixed(2)},${m.z.toFixed(2)},${Math.round(m.hp)}`;
  let hash = 5381;
  for (let i = 0; i < s.length; i++) hash = ((hash * 33) ^ s.charCodeAt(i)) >>> 0;
  return hash.toString(16);
}

export function beginCampaign(w, heroDatas, o = {}) {
  heroDatas.forEach((d, seat) => addHero(w, d, seat, { navIndex: seat }));
  const start = o.zone ?? 'yard';
  loadZone(w, start, o.floor ?? 0, 'start');
  if (!o.noQuestInit) questInit(w);
}

export { heroToData, addHero, loadZone, monsterLevel, spawnArea, gainRes, addBuff };
