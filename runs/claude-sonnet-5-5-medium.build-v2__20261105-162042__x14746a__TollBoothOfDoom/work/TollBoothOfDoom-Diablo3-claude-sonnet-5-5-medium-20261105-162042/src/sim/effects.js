// Skill effect ops. Skills and Tones only compose these ops; nothing else touches combat.
import { CLASSES, resolveSkill } from '../data/classes.js';
import { DT, ev, nid, heroHit, dealToMonster, monstersNear, heal, applyStatus, stun, spawnMonster, allyMinions, walkable, addRes, livingHeroes, refreshStats, wakePack } from './core.js';
import { modifySkill, onCast, castMultiplier } from './powers.js';
import { clamp } from './stats.js';

const isFoe = (m) => !m.dead && (!m.team || m.team === 'monster');
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };

export function skillSpec(h, slot) {
  const sk = h.skills[slot];
  if (!sk) return null;
  const key = sk.id + ':' + (sk.tone || '') + ':' + h.stats.powers.size + ':' + (h.stats.sets.last_lamplighter || 0) + (h.stats.sets.ringing_order || 0) + (h.stats.sets.perpetual_mourner || 0) + (h.stats.vowKeeper ? 'k' : '') + (h.stats.vowUnion ? 'u' : '') + (h.res > 70 ? 'w' : '');
  if (h._specKey === key + slot && h._specs[slot]) return h._specs[slot];
  h._specs = h._specs || [];
  h._specKey = key + slot;
  h._specs[slot] = modifySkill(h, resolveSkill(sk.id, sk.tone));
  return h._specs[slot];
}
export const skillCost = (w, h, spec) => Math.round(spec.cost * (1 - h.stats.costRed / 100));
export const skillCd = (w, h, spec) => spec.cd * (1 - h.stats.cdr / 100) * w.tuning.cooldownScale;

export function canCast(w, h, slot) {
  const sk = h.skills[slot];
  if (!sk || !h.alive || h.cast || h.stunT > 0 || h.rootT > 0 && false) return false;
  if (h.lockT[slot] > w.t) return false;
  const spec = skillSpec(h, slot);
  if (h.cd[slot] > 0 && !(spec.charges > 1 && h.charges[slot] > 0)) return false;
  const free = h.freeNext || (h.devFlags && h.devFlags.noCd);
  if (!free && spec.cost && h.res < skillCost(w, h, spec) && !(h.devFlags && h.devFlags.infRes)) { return 'res'; }
  return true;
}

export function startCast(w, h, slot, aim) {
  const ok = canCast(w, h, slot);
  if (ok !== true) { if (ok === 'res' && (!h.resWarn || w.t - h.resWarn > 0.8)) { h.resWarn = w.t; ev(w, { t: 'cantcast', id: h.id, seat: h.seat, why: 'res' }); } return false; }
  const spec = skillSpec(h, slot);
  let dx = aim.x - h.x, dz = aim.z - h.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  if (spec.melee || spec.upper !== undefined) h.facing = Math.atan2(dx, dz);
  const mult = castMultiplier(w, h);
  const as = 1 + h.stats.atkSpeed / 100;
  const combo = spec.id === 'clout' || spec.id === 'shovel_swat';
  let clip = spec.clip;
  if (combo) { h.combo = (w.t - h.comboT < 1.0 ? h.combo + 1 : 0) % 3; h.comboT = w.t; clip = ['Slash1', 'Slash2', 'Slash3'][h.combo]; }
  h.cast = { slot, spec, t: 0, wind: spec.wind / as, rec: spec.rec / as, fired: false, dx, dz, tx: aim.x, tz: aim.z, mult, clip, free: !!mult };
  h.facing = Math.atan2(dx, dz);
  ev(w, { t: 'castStart', id: h.id, seat: h.seat, slot, clip, wind: h.cast.wind, rec: h.cast.rec, upper: spec.upper, skill: spec.id });
  if (spec.fx[0].op === 'ring' || spec.id === 'last_peal') ev(w, { t: 'sfx', name: 'wind_up', x: h.x, z: h.z });
  return true;
}

export function tickCast(w, h, intent) {
  const c = h.cast;
  if (!c) return;
  c.t += DT;
  if (!c.fired && c.t >= c.wind) { c.fired = true; fireSkill(w, h, c); }
  if (c.t >= c.wind + c.rec || (c.fired && c.t >= c.wind + c.rec * 0.5 && intent && (intent.mx || intent.mz))) {
    h.cast = null;
  }
}

function fireSkill(w, h, c) {
  const spec = c.spec;
  // pay
  const free = c.free || (h.devFlags && h.devFlags.infRes);
  if (spec.cost && !free) h.res = Math.max(0, h.res - skillCost(w, h, spec));
  if (spec.gen) addRes(h, spec.gen * (h.cls === 'lamplighter' ? 1 : 1));
  if (h.devFlags && h.devFlags.noCd) h.cd[c.slot] = 0;
  else if (spec.charges > 1) {
    if (h.charges[c.slot] === 0) h.charges[c.slot] = spec.charges;
    h.charges[c.slot]--; h.cd[c.slot] = h.charges[c.slot] > 0 ? 0.3 : skillCd(w, h, spec);
    if (h.charges[c.slot] === 0 && h.cd[c.slot] <= 0.3) h.cd[c.slot] = skillCd(w, h, spec);
  } else if (spec.cd) h.cd[c.slot] = skillCd(w, h, spec);
  h.lastCombat = w.t;
  onCast(w, h, spec);
  const ctx = { ox: h.x, oz: h.z, dx: c.dx, dz: c.dz, tx: c.tx, tz: c.tz, spec, mult: c.mult ? c.mult.dmg : 1, hit: [], slot: c.slot };
  ev(w, { t: 'castFire', id: h.id, seat: h.seat, skill: spec.id, x: h.x, z: h.z, dx: c.dx, dz: c.dz, el: spec.fx[0].el || 'phys' });
  for (const op of spec.fx) runOp(w, h, op, ctx);
  if (spec.fx[0].sfx) ev(w, { t: 'sfx', name: spec.fx[0].sfx, x: h.x, z: h.z });
  if (spec.fx[0].shake) ev(w, { t: 'shake', amt: spec.fx[0].shake });
}

function hitMods(op, ctx) {
  return { el: op.el || 'phys', knock: op.knock || 0, stun: op.stun || 0, status: op.status, burn: op.burn, consume: op.consume, res: op.res, area: true, mult: ctx.mult, fromX: ctx.ox, fromZ: ctx.oz };
}
function applyHits(w, h, targets, op, ctx, pct) {
  let n = 0;
  for (const m of targets) {
    heroHit(w, h, m, pct ?? op.dmg, hitMods(op, ctx));
    ctx.hit.push(m);
    n++;
    if (op.heal) heal(w, h, h.maxHp * op.heal, true);
    if (op.genPer) addRes(h, op.genPer);
    if (op.blind && !m.boss) m.blindT = w.t + op.blind;
    if (op.mark) m.status.mark = { t: 5, v: op.mark };
    if (op.pull && !m.boss && !m.static) { const dx = ctx.ox - m.x, dz = ctx.oz - m.z, d = Math.hypot(dx, dz) || 1; const k = Math.min(op.pull, d); m.x += (dx / d) * k * 0.6; m.z += (dz / d) * k * 0.6; }
    if (op.notes) spawnNote(w, h, m);
    if (op.relight) m.relightAt = w.t + op.relight;
  }
  return n;
}
function spawnNote(w, h, from) {
  const t = monstersNear(w, from.x, from.z, 8).find((m) => isFoe(m) && m !== from);
  if (!t) return;
  w.shots.push({ id: nid(w), x: from.x, z: from.z, vx: 0, vz: 0, speed: 14, range: 12, dmg: 0.6, el: 'sound', r: 0.5, owner: h.seat, ownerId: h.id, team: 'hero', pierce: 0, homing: true, target: t.id, life: 3, hit: new Set(), vfx: 'note' });
}
export function inArc(m, ox, oz, dx, dz, ang, r) {
  const mx = m.x - ox, mz = m.z - oz, d = Math.hypot(mx, mz);
  if (d > r + m.r) return false;
  if (d < 0.6) return true;
  return angDiff(Math.atan2(mx, mz), Math.atan2(dx, dz)) <= (ang * Math.PI) / 360 + Math.atan2(m.r, d);
}

export function runOp(w, h, op, ctx) {
  const mods = hitMods(op, ctx);
  switch (op.op) {
    case 'arc': case 'cone': {
      let r = op.r * (1 + (op.area === false ? 0 : 0));
      const list = monstersNear(w, ctx.ox, ctx.oz, r).filter((m) => isFoe(m) && inArc(m, ctx.ox, ctx.oz, ctx.dx, ctx.dz, op.ang, r));
      applyHits(w, h, list, op, ctx);
      ev(w, { t: 'fx', name: op.op === 'cone' ? 'cone_' + (op.el || 'phys') : 'arc_' + (op.el || 'phys'), x: ctx.ox, z: ctx.oz, dx: ctx.dx, dz: ctx.dz, r, ang: op.ang });
      if (op.bounce) {
        const nav = w.zone.nav; const wd = nav.castWall(ctx.ox, ctx.oz, ctx.dx, ctx.dz, r);
        const bx = ctx.ox + ctx.dx * wd, bz = ctx.oz + ctx.dz * wd;
        const list2 = monstersNear(w, bx, bz, r - wd).filter((m) => isFoe(m) && !list.includes(m) && inArc(m, bx, bz, -ctx.dx, -ctx.dz, op.ang, r - wd));
        applyHits(w, h, list2, op, ctx, op.dmg * 0.7);
      }
      break;
    }
    case 'circle': case 'ring': {
      const r = op.r * (op.op === 'ring' ? 1 : 1);
      const list = monstersNear(w, ctx.ox, ctx.oz, r).filter(isFoe);
      applyHits(w, h, list, op, ctx);
      ev(w, { t: 'fx', name: op.vfx || ('ring_' + (op.el || 'phys')), x: ctx.ox, z: ctx.oz, r, shock: !!op.shock });
      break;
    }
    case 'originBlast': {
      const list = monstersNear(w, ctx.ox, ctx.oz, op.r).filter(isFoe);
      applyHits(w, h, list, op, ctx);
      ev(w, { t: 'fx', name: 'ring_flame', x: ctx.ox, z: ctx.oz, r: op.r });
      break;
    }
    case 'chain': {
      let last = ctx.hit[ctx.hit.length - 1];
      const done = new Set(ctx.hit);
      for (let i = 0; i < op.n && last; i++) {
        const nxt = monstersNear(w, last.x, last.z, op.r).filter((m) => isFoe(m) && !done.has(m)).sort((a, b) => Math.hypot(a.x - last.x, a.z - last.z) - Math.hypot(b.x - last.x, b.z - last.z))[0];
        if (!nxt) break;
        ev(w, { t: 'fx', name: 'arc_line', x: last.x, z: last.z, x2: nxt.x, z2: nxt.z, el: op.el });
        applyHits(w, h, [nxt], op, ctx);
        done.add(nxt); last = nxt;
      }
      break;
    }
    case 'projectile': {
      const n = op.split3 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const a = Math.atan2(ctx.dx, ctx.dz) + (n === 1 ? 0 : (i - 1) * 0.2);
        w.shots.push({ id: nid(w), x: ctx.ox + ctx.dx * 0.6, z: ctx.oz + ctx.dz * 0.6, vx: Math.sin(a), vz: Math.cos(a), speed: op.speed, range: op.range, dmg: op.dmg, el: op.el, r: op.r, owner: h.seat, ownerId: h.id, team: 'hero', pierce: op.pierce || 0, burn: op.burn, fork: op.forkKill, hit: new Set(), vfx: op.vfx || 'bolt_fire', life: op.range / op.speed, homing: false, mult: ctx.mult, setBolt: op.setBolt });
      }
      break;
    }
    case 'lob': {
      let tx = ctx.tx, tz = ctx.tz;
      const d = Math.hypot(tx - ctx.ox, tz - ctx.oz);
      if (d > op.range) { tx = ctx.ox + (ctx.dx) * op.range; tz = ctx.oz + (ctx.dz) * op.range; }
      if (op.homing) { const best = monstersNear(w, h.x, h.z, op.range).filter(isFoe).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; if (best) { tx = best.x; tz = best.z; } }
      const n = op.cluster || 1;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283, o = n > 1 ? 1.6 : 0;
        w.areas.push({ id: nid(w), kind: 'lobbed', x0: ctx.ox, z0: ctx.oz, x: tx + Math.cos(a) * o, z: tz + Math.sin(a) * o, t: 0.45, dur: 0.45, op, owner: h.seat, hid: h.id, mult: ctx.mult, vfx: op.vfx });
      }
      break;
    }
    case 'dash': {
      h.dash = { dx: ctx.dx, dz: ctx.dz, left: op.dist, speed: op.dist / 0.22, op, hit: new Set(), ctx };
      h.inv_t = Math.max(h.inv_t, 0.1);
      break;
    }
    case 'leap': {
      let d = Math.hypot(ctx.tx - ctx.ox, ctx.tz - ctx.oz); d = Math.min(op.dist, d);
      let tx = ctx.ox + ctx.dx * d, tz = ctx.oz + ctx.dz * d;
      let k = 1; while (!walkable(w, tx, tz, 0.4) && k > 0) { k -= 0.1; tx = ctx.ox + ctx.dx * d * k; tz = ctx.oz + ctx.dz * d * k; }
      h.leap = { t: 0, dur: 0.45, x0: ctx.ox, z0: ctx.oz, x1: tx, z1: tz, op, ctx };
      h.inv_t = Math.max(h.inv_t, 0.5);
      ev(w, { t: 'leap', id: h.id, x: ctx.ox, z: ctx.oz, x1: tx, z1: tz, dur: 0.45 });
      break;
    }
    case 'blink': {
      const dist = op.dist; let k = dist; let tx = ctx.ox, tz = ctx.oz;
      for (; k > 0; k -= 0.5) { tx = ctx.ox + ctx.dx * k; tz = ctx.oz + ctx.dz * k; if (walkable(w, tx, tz, 0.4)) break; }
      if (op.decoy) w.areas.push({ id: nid(w), kind: 'decoy', x: ctx.ox, z: ctx.oz, r: 1, t: op.decoy, owner: h.seat });
      ev(w, { t: 'fx', name: 'puff_' + (h.cls === 'sexton' ? 'grave' : 'flame'), x: ctx.ox, z: ctx.oz, r: 1.5 });
      if (op.fireLine) for (let q = 0; q <= k; q += 1.2) w.areas.push({ id: nid(w), kind: 'zone', x: ctx.ox + ctx.dx * q, z: ctx.oz + ctx.dz * q, r: 1.4, t: 3, dps: 0.6, el: 'flame', burn: true, owner: h.seat, hid: h.id, vfx: 'patch_fire', tick: 0 });
      h.x = tx; h.z = tz;
      if (op.inv) h.inv_t = Math.max(h.inv_t, op.inv);
      if (op.r) { applyHits(w, h, monstersNear(w, tx, tz, op.r).filter(isFoe), op, ctx); if (op.root) for (const m of monstersNear(w, tx, tz, op.r).filter(isFoe)) m.rootT = op.root; ev(w, { t: 'fx', name: 'ring_grave', x: tx, z: tz, r: op.r }); }
      if (op.minions) for (const m of allyMinions(w, h.seat)) { m.x = tx + (w.rng.range(-1, 1)); m.z = tz + w.rng.range(-1, 1); }
      ev(w, { t: 'fx', name: 'puff_' + (h.cls === 'sexton' ? 'grave' : 'flame'), x: tx, z: tz, r: 1.5 });
      break;
    }
    case 'zone': {
      let x = ctx.ox, z = ctx.oz;
      if (op.range) { const d = Math.min(op.range, Math.hypot(ctx.tx - ctx.ox, ctx.tz - ctx.oz)); x += ctx.dx * d; z += ctx.dz * d; }
      w.areas.push({ id: nid(w), kind: 'zone', x, z, r: op.r, t: op.t, dur: op.t, dps: op.dps || 0, el: op.el || 'phys', burn: op.burn, heal: op.heal, reduce: op.reduce, dmgBuff: op.dmgBuff, curse: op.curse, slow: op.slow, ally: op.ally, follow: op.follow, ward: op.ward, tithePerDeath: op.tithePerDeath, taunt: op.taunt, stunImmune: op.stunImmune, owner: h.seat, hid: h.id, vfx: op.vfx, tick: 0, followTarget: op.followTarget, pull: op.pull });
      ev(w, { t: 'fx', name: op.vfx || 'patch_holy', x, z, r: op.r, dur: op.t });
      break;
    }
    case 'obstacle': {
      const n = op.n || 1;
      const pts = [[ctx.tx, ctx.tz]];
      if (op.extra) for (let i = 0; i < op.extra; i++) { const a = (i / op.extra) * 6.283; pts.push([ctx.tx + Math.cos(a) * 3, ctx.tz + Math.sin(a) * 3]); }
      for (let i = 1; i < n; i++) { const a = (i / n) * 6.283; pts.push([ctx.tx + Math.cos(a) * 3, ctx.tz + Math.sin(a) * 3]); }
      for (const [px, pz] of pts) {
        let tx = px, tz = pz; const d = Math.hypot(tx - ctx.ox, tz - ctx.oz); if (d > op.range) { tx = ctx.ox + (tx - ctx.ox) / d * op.range; tz = ctx.oz + (tz - ctx.oz) / d * op.range; }
        if (!walkable(w, tx, tz, 0.3)) { tx = ctx.ox + ctx.dx * 3; tz = ctx.oz + ctx.dz * 3; }
        w.areas.push({ id: nid(w), kind: 'obstacle_fall', x: tx, z: tz, t: 0.5, op, owner: h.seat, hid: h.id, mult: ctx.mult });
        ev(w, { t: 'tele', kind: 'ring', x: tx, z: tz, r: op.r, time: 0.5, friendly: true });
      }
      break;
    }
    case 'summon': {
      const kind = op.kind || 'skeleton';
      const cap = op.n;
      const mine = allyMinions(w, h.seat);
      while (mine.length >= cap) { const old = mine.shift(); old.dead = true; old.hp = 0; ev(w, { t: 'kill', id: old.id, x: old.x, z: old.z, type: old.type, minion: true }); }
      const toMake = Math.max(1, cap - mine.length);
      for (let i = 0; i < toMake; i++) {
        const a = (i / toMake) * 6.283 + 0.5;
        const m = spawnMonster(w, kind, h.x + Math.cos(a) * 1.8, h.z + Math.sin(a) * 1.8, { team: 'hero', owner: h.seat, dormant: false, level: h.level, noDrop: true });
        m.hp = m.maxHp = h.maxHp * 0.2 * (op.hp / 3) + 20; m.hit = h.stats.weaponDps * (op.dmg || 0.6) * w.tuning.playerDamage * (1 + h.stats.power / 100);
        m.speed = (kind === 'brute' ? 2.8 : 3.8) * (op.fast ? 1.4 : 1); m.explode = op.explode || 0; m.carryCoffin = op.coffins; m.ownerId = h.id;
        ev(w, { t: 'fx', name: 'puff_grave', x: m.x, z: m.z, r: 1.2 });
      }
      break;
    }
    case 'turret': {
      const mine = w.areas.filter((a) => a.kind === 'turret' && a.owner === h.seat);
      while (mine.length >= op.max) { const o = mine.shift(); o.t = 0; }
      let tx = ctx.tx, tz = ctx.tz; const d = Math.hypot(tx - ctx.ox, tz - ctx.oz); if (d > 6) { tx = ctx.ox + ctx.dx * 3; tz = ctx.oz + ctx.dz * 3; } else if (d < 1) { tx = ctx.ox + ctx.dx * 2; tz = ctx.oz + ctx.dz * 2; }
      if (!walkable(w, tx, tz, 0.3)) { tx = ctx.ox; tz = ctx.oz; }
      w.areas.push({ id: nid(w), kind: 'turret', x: tx, z: tz, r: 0.5, t: op.t, rate: op.rate, dmg: op.dmg, el: op.el, range: op.range, burn: op.burn, beams: op.beams, healAlly: op.healAlly, endBlast: op.endBlast, owner: h.seat, hid: h.id, cool: 0, setBolt: op.setBolt });
      ev(w, { t: 'fx', name: 'puff_flame', x: tx, z: tz, r: 1 });
      break;
    }
    case 'buff': {
      if (op.raiseGraves != null) {
        const graves = w.areas.filter((a) => a.kind === 'grave' && Math.hypot(a.x - h.x, a.z - h.z) < op.range).slice(0, op.raiseGraves);
        for (const g of graves) { g.t = 0; const m = spawnMonster(w, 'skeleton', g.x, g.z, { team: 'hero', owner: h.seat, dormant: false, level: h.level, noDrop: true, ttl: op.t + 2 }); m.hp = m.maxHp = 30 + h.maxHp * 0.1; m.hit = h.stats.weaponDps * 0.6 * w.tuning.playerDamage; m.ownerId = h.id; }
        h.danse = w.t + op.t; h.danseMods = { dmg: op.minionDmg, speed: op.minionSpeed || 0, finale: op.finale || 0 };
        for (const m of allyMinions(w, h.seat)) { m.hit *= 1 + op.minionDmg; if (op.minionSpeed) m.speed *= 1 + op.minionSpeed; }
        if (op.finale) w.areas.push({ id: nid(w), kind: 'finale', t: op.t, owner: h.seat, hid: h.id, dmg: op.finale });
        ev(w, { t: 'fx', name: 'ring_grave', x: h.x, z: h.z, r: op.range });
      }
      break;
    }
    case 'consume_status': {
      const list = monstersNear(w, ctx.ox, ctx.oz, op.r).filter((m) => isFoe(m) && m.status[op.status]);
      let n = 0;
      for (const m of list) {
        const s = m.status[op.status]; const remain = Math.max(0.5, s.t);
        const amt = Math.round(h.stats.weaponDps * s.dps * remain * op.mult * (1 + h.stats.power / 100) * w.tuning.playerDamage);
        dealToMonster(w, h, m, Math.max(1, amt), { el: op.el, stun: op.stun });
        m.status[op.status] = null; delete m.status[op.status]; n++;
        if (op.genPer) addRes(h, op.genPer);
        if (op.relight) { m.relightAt = w.t + op.relight; }
        ev(w, { t: 'fx', name: 'puff_flame', x: m.x, z: m.z, r: 1.2 });
      }
      if (op.refund && n >= 10) { h.res = Math.min(h.resMax, h.res + 20 * Math.floor(n / 10)); h.cd[4] = 0; }
      ev(w, { t: 'fx', name: 'ring_flame', x: ctx.ox, z: ctx.oz, r: op.r });
      break;
    }
    case 'consume_graves': {
      let graves = w.areas.filter((a) => a.kind === 'grave' && Math.hypot(a.x - h.x, a.z - h.z) <= op.range).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z)).slice(0, op.n);
      for (const g of graves) {
        g.t = 0;
        const list = monstersNear(w, g.x, g.z, op.r).filter(isFoe);
        applyHits(w, h, list, op, ctx);
        if (op.heal) heal(w, h, h.maxHp * op.heal, true);
        if (op.tithePerGrave) addRes(h, op.tithePerGrave);
        if (op.rise) { const m = spawnMonster(w, 'skeleton', g.x, g.z, { team: 'hero', owner: h.seat, dormant: false, level: h.level, noDrop: true, ttl: op.rise }); m.hp = m.maxHp = 40; m.hit = h.stats.weaponDps * 0.5; m.ownerId = h.id; }
        if (op.healMinions) for (const m of allyMinions(w, h.seat)) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.3);
        ev(w, { t: 'fx', name: 'puff_grave', x: g.x, z: g.z, r: op.r });
        if (op.chain) for (const o of w.areas) if (o.kind === 'grave' && o.t > 0 && Math.hypot(o.x - g.x, o.z - g.z) < op.r) { o.t = 0; applyHits(w, h, monstersNear(w, o.x, o.z, op.r).filter(isFoe), op, ctx, op.dmg * 0.6); }
      }
      break;
    }
    case 'comet_rain': {
      w.areas.push({ id: nid(w), kind: 'comets', x: ctx.ox, z: ctx.oz, t: op.t, dur: op.t, rate: op.rate, r: op.r, dmg: op.dmg, el: op.el, range: op.range, burn: op.burn, healParty: op.healParty, owner: h.seat, hid: h.id, acc: 0 });
      break;
    }
    case 'delay': {
      w.areas.push({ id: nid(w), kind: 'timer', t: op.t, then: op.then, ctx: { ...ctx, hit: [] }, owner: h.seat, hid: h.id });
      break;
    }
    case 'repeat': {
      const slow = op.slow || 0;
      h.peal = { n: op.n, every: op.every, left: op.n, acc: 0, then: op.then, unstoppable: op.unstoppable, slow, ctx: { ...ctx, hit: [] }, extend: h.cast ? h.cast.spec.flags.includes('extend_kill') : false };
      h.inv_t = Math.max(h.inv_t, 0.2);
      break;
    }
    default: break;
  }
}

/** Per-tick systems for hero-owned mechanics: dash, leap, peal, shots, areas. */
export function tickHeroMotion(w, h) {
  if (h.dash) {
    const d = h.dash; const step = Math.min(d.left, d.speed * DT);
    const nx = h.x + d.dx * step, nz = h.z + d.dz * step;
    if (walkable(w, nx, nz, 0.38)) { h.x = nx; h.z = nz; } else d.left = 0;
    d.left -= step;
    for (const m of monstersNear(w, h.x, h.z, d.op.r + 0.2)) {
      if (!isFoe(m) || d.hit.has(m.id)) continue;
      d.hit.add(m.id); heroHit(w, h, m, d.op.dmg, { el: d.op.el, knock: d.op.knock, stun: d.op.stun, fromX: h.x - d.dx, fromZ: h.z - d.dz, area: true, mult: d.ctx.mult });
      if (d.op.dragAlong && !m.boss) { m.x = h.x + d.dx * 1.2; m.z = h.z + d.dz * 1.2; }
    }
    if (d.left <= 0.001) { if (d.op.stun) for (const m of monstersNear(w, h.x, h.z, 2.5)) if (isFoe(m)) stun(m, d.op.stun); h.dash = null; }
  }
  if (h.leap) {
    const l = h.leap; l.t += DT; const k = Math.min(1, l.t / l.dur);
    h.x = l.x0 + (l.x1 - l.x0) * k; h.z = l.z0 + (l.z1 - l.z0) * k; h.air = Math.sin(k * Math.PI) * 2.2;
    if (l.op.trail && Math.floor(l.t * 20) !== Math.floor((l.t - DT) * 20)) w.areas.push({ id: nid(w), kind: 'zone', x: h.x, z: h.z, r: 1.6, t: 3, dps: 0.7, el: 'flame', burn: true, owner: h.seat, hid: h.id, vfx: 'patch_fire', tick: 0 });
    if (k >= 1) {
      h.leap = null; h.air = 0;
      const op = l.op;
      applyHits(w, h, monstersNear(w, h.x, h.z, op.r).filter(isFoe), op, { ...l.ctx, ox: h.x, oz: h.z, hit: [] });
      ev(w, { t: 'fx', name: 'ring_bronze', x: h.x, z: h.z, r: op.r + 1, shock: true }); ev(w, { t: 'shake', amt: op.shake || 0.4 }); ev(w, { t: 'sfx', name: op.sfx || 'bell_big', x: h.x, z: h.z });
      if (h.stats.sets.ringing_order >= 4) { /* handled in onCast */ }
    }
  }
  if (h.peal) {
    const p = h.peal; p.acc += DT; h.slowT = Math.max(h.slowT, 0.1);
    if (p.acc >= p.every) {
      p.acc -= p.every; p.left--;
      const c = { ...p.ctx, ox: h.x, oz: h.z, hit: [] };
      const op = { ...p.then }; if (h.cast === null && p.thenMod) Object.assign(op, p.thenMod);
      const sk = h.skills.find((s) => s && s.id === 'last_peal'); const spec = sk && sk.tone === 'cyclone' ? { pull: 1.2 } : null;
      if (spec) Object.assign(op, spec);
      runOp(w, h, op, c);
      ev(w, { t: 'castFire', id: h.id, seat: h.seat, skill: 'last_peal', x: h.x, z: h.z, dx: 0, dz: 1, el: 'sound', spin: true });
      if (p.left <= 0) h.peal = null;
    }
    if (h.peal) h.inv_t = Math.max(h.inv_t, 0); // unstoppable: stun ignore handled in damage
  }
}

export function tickShots(w) {
  for (const s of w.shots) {
    if (s.dead) continue;
    if (s.homing) {
      const t = w.monsters.find((m) => m.id === s.target && !m.dead) || monstersNear(w, s.x, s.z, 12).find(isFoe);
      if (t) { const dx = t.x - s.x, dz = t.z - s.z, d = Math.hypot(dx, dz) || 1; s.vx += (dx / d - s.vx) * 0.2; s.vz += (dz / d - s.vz) * 0.2; const n = Math.hypot(s.vx, s.vz) || 1; s.vx /= n; s.vz /= n; }
    }
    const step = s.speed * DT;
    s.x += s.vx * step; s.z += s.vz * step; s.life -= DT;
    if (s.life <= 0 || !walkable(w, s.x, s.z, 0.05)) { s.dead = true; if (s.explode) ev(w, { t: 'fx', name: 'puff_flame', x: s.x, z: s.z, r: 1 }); continue; }
    if (s.team === 'hero') {
      const h = w.heroes.find((q) => q.id === s.ownerId); if (!h) { s.dead = true; continue; }
      for (const m of monstersNear(w, s.x, s.z, s.r)) {
        if (!isFoe(m) || s.hit.has(m.id)) continue;
        s.hit.add(m.id);
        heroHit(w, h, m, s.dmg, { el: s.el, burn: s.burn, knock: 0.4, fromX: s.x - s.vx, fromZ: s.z - s.vz, mult: s.mult });
        if (m.dead && s.fork) {
          const nx = monstersNear(w, m.x, m.z, 7).find((q) => isFoe(q) && !s.hit.has(q.id));
          if (nx) { const dx = nx.x - m.x, dz = nx.z - m.z, d = Math.hypot(dx, dz) || 1; w.shots.push({ ...s, id: nid(w), x: m.x, z: m.z, vx: dx / d, vz: dz / d, hit: new Set(s.hit), fork: false, life: 1 }); }
        }
        if (s.pierce > 0) s.pierce--; else { s.dead = true; ev(w, { t: 'fx', name: 'puff_' + (s.el === 'flame' ? 'flame' : 'sound'), x: s.x, z: s.z, r: 0.8 }); break; }
      }
    } else {
      for (const h of livingHeroes(w)) {
        if (s.hit.has(h.id)) continue;
        if (Math.hypot(h.x - s.x, h.z - s.z) < s.r + 0.4) { s.hit.add(h.id); hurtHero(w, h, s.hitAmt, { x: s.x - s.vx, z: s.z - s.vz }, s.src); s.dead = true; ev(w, { t: 'fx', name: 'puff_grave', x: s.x, z: s.z, r: 0.8 }); break; }
      }
      // wards
      for (const a of w.areas) if (a.kind === 'zone' && a.ward && Math.hypot(a.x - s.x, a.z - s.z) < a.r) s.dead = true;
    }
  }
  if (w.shots.length > 60 || w.shots.some((s) => s.dead)) w.shots = w.shots.filter((s) => !s.dead);
}

import { hurtHero } from './hero.js';
