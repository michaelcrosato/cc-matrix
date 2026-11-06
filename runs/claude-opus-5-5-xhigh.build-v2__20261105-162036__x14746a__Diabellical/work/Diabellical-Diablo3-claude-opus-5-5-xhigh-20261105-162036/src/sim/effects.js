// Effect ops. Skills and Tones only compose these; they are the whole vocabulary:
// arc circle cone ring projectile lob chain dash leap blink zone obstacle summon turret buff debuff
// pull knock stun apply_status consume_status consume_graves comet_rain delay repeat spawn_decoy
import { SKILLS } from '../data/skills.js';
import { RULES } from '../data/tuning.js';
import { clamp, dist, dist2, enemiesIn, ev, heroById, nearestEnemy, nextId, slide, walkable } from './core.js';
import { damageMonster, knockMonster, addAlly, removeAlly } from './monsters.js';
import { hitPropsIn } from './objects.js';
import { POWERS } from './powers.js';

// ---- Skill resolution -----------------------------------------------------------------------
const clone = (o) => JSON.parse(JSON.stringify(o));

function patchOp(op, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'thenPatch') { for (const t of [op.then].flat()) Object.assign(t, clone(v)); }
    else if (k === 'thenAdd') { op.then = [...[op.then].flat(), ...clone(v)]; }
    else if (k === 'thenPatchAt') { for (const [i, p] of Object.entries(v)) Object.assign(op.then[i], clone(p)); }
    else op[k] = clone(v);
  }
}

export function toneUnlocked(h, skillId, toneId) {
  const s = SKILLS[skillId];
  const idx = Object.keys(s.tones).indexOf(toneId);
  if (idx < 0) return false;
  return h.level >= Math.min(RULES.levelCap, s.level + RULES.toneLevels[idx]);
}

export function resolveSkill(h, id, toneId) {
  const key = `${id}:${toneId ?? ''}:${h.gearV}`;
  const cached = h.skillCache.get(key);
  if (cached) return cached;
  const base = SKILLS[id];
  const sk = { ...base, fx: clone(base.fx) };
  sk.charges = 1;
  const tone = toneId ? base.tones[toneId] : null;
  if (tone) {
    if (tone.patch) Object.assign(sk, tone.patch);
    if (tone.fx) for (const [i, p] of Object.entries(tone.fx)) patchOp(sk.fx[i], p);
    if (tone.add) sk.fx.push(...clone(tone.add));
  }
  for (const p of Object.keys(h.stats?.powers ?? {})) POWERS[p]?.modifySkill?.(h, sk);
  if (h.stats?.set4?.ringing_order && sk.tags?.includes('toll')) for (const op of sk.fx) { if (op.dmg) op.dmg *= 4; if (op.then) for (const t of [op.then].flat()) if (t.dmg) t.dmg *= 4; }
  if (h.stats?.set4?.perpetual_mourner && sk.id === 'exhume') for (const op of sk.fx) { if (op.dmg) op.dmg *= 5; op.healMinions = true; }
  h.skillCache.set(key, sk);
  return sk;
}

// ---- Damage ---------------------------------------------------------------------------------
export function heroDamageUp(h) {
  let d = 0;
  for (const b of h.buffs) if (b.dmg) d += b.dmg;
  d += h.areaDmg ?? 0;
  if (h.stats.powers.plate_lining) d += Math.min(0.3, (h.plateStacks ?? 0) * 0.01);
  return d;
}

export function baseHit(w, h, pct, el) {
  const s = h.stats;
  let d = s.weaponDps * pct * (1 + s.power / 100) * (1 + s.dmgpct);
  if (el && s[el]) d *= 1 + s[el];
  return d * w.tuning.playerDamage;
}

/** Full player hit against a monster: buffs, target state, crit. Returns [damage, crit]. */
export function computeHit(w, h, m, pct, el, c = null) {
  const s = h.stats;
  let d = baseHit(w, h, pct, el) * (1 + heroDamageUp(h));
  if (h.vows.includes('contrition') && h.hp < s.maxHp * 0.5) d *= 1.15;
  if (h.vows.includes('plot') && el === 'grave') d *= 1.1;
  if (s.powers.mourning_band) {
    let n = 0;
    for (const a of w.allies) if (a.owner === h.id && !a.def.static) n++;
    for (const o of w.heroes) if (o.dead) n++;
    d *= 1 + Math.min(0.3, n * 0.05);
  }
  if (m.status.burn && h.cls === 'lamplighter') d *= 1 + RULES.burnBonus;
  if (m.status.mark) d *= 1 + m.status.mark;
  if (m.vuln) d *= 1 + m.vuln;
  if (m.elite && s.powers.malisons_knuckle) d *= 1.25;
  if (c?.mult) d *= c.mult;
  const veil = h.buffs.find((b) => b.nextHit);
  if (veil) { d *= 1 + veil.nextHit; veil.nextHit = 0; veil.t = Math.min(veil.t, 0.2); }
  let critChance = s.crit;
  if (m.status.burn && h.vows.includes('bright_eyes')) critChance += 0.1;
  const crit = w.rng.chance(clamp(critChance, 0, 0.95));
  if (crit) d *= 1.5 + s.critdmg;
  return [d, crit];
}

function gainRes(h, amt) {
  if (h.dead) return;
  h.res = Math.min(h.stats.maxResTotal, h.res + amt);
}

function healHero(w, h, frac) {
  if (h.dead || h.hp >= h.stats.maxHp) return;
  h.hp = Math.min(h.stats.maxHp, h.hp + h.stats.maxHp * frac);
}

export function applyStatus(w, h, m, st) {
  const dps = baseHit(w, h, st.dps ?? 0, st.k === 'burn' ? 'flame' : st.k === 'poison' ? 'grave' : null);
  const cur = m.status[st.k];
  if (!cur || cur.dps <= dps) m.status[st.k] = { dps, t: st.t, src: h.id };
  else cur.t = Math.max(cur.t, st.t);
}

function applyBurn(w, h, m) {
  const mul = h.stats.set2.last_lamplighter ? 1.3 : 1;
  applyStatus(w, h, m, { k: 'burn', dps: RULES.burnDps * mul, t: RULES.burnTime });
}

/** One hit of one op on one monster. */
export function applyHit(w, h, m, op, c) {
  if (m.dead) return;
  let pct = op.dmg ?? 0;
  if (op.consume === 'resonance' && m.status.res > 0) {
    pct *= 1 + m.status.res * RULES.resonanceBonus;
    ev(w, { t: 'fx', k: 'res_pop', x: m.x, z: m.z, n: m.status.res });
    m.status.res = 0;
  }
  if (op.aoe && h.stats.area) pct *= 1 + h.stats.area;
  if (pct > 0) {
    const [d, crit] = computeHit(w, h, m, pct, op.el, c);
    damageMonster(w, m, d, { src: h, crit, el: op.el, c, dx: m.x - c.x, dz: m.z - c.z, big: !!op.shake });
  }
  if (h.cls === 'bellwarden' && op.el === 'sound' && !m.dead) {
    m.status.res = Math.min(h.stats.resonanceMax, (m.status.res ?? 0) + 1);
    m.status.resT = RULES.resonanceTime;
  }
  if (h.cls === 'lamplighter' && op.el === 'flame' && !m.dead) applyBurn(w, h, m);
  c.hits = (c.hits ?? 0) + 1;
  if (m.dead) return afterHit(w, h, m, op, c);
  if (op.status) for (const st of op.status) applyStatus(w, h, m, st);
  if (op.knock) knockMonster(m, m.x - c.x, m.z - c.z, op.knock);
  if (op.pull) knockMonster(m, c.x - m.x, c.z - m.z, Math.min(op.pull, dist(m.x, m.z, c.x, c.z)));
  if (op.stun && !m.def.boss) m.status.stun = Math.max(m.status.stun ?? 0, op.stun);
  if (op.root && !m.def.boss) m.status.root = Math.max(m.status.root ?? 0, op.root);
  if (op.blind) m.status.blind = Math.max(m.status.blind ?? 0, op.blind);
  if (op.mark) { m.status.mark = op.mark.p; m.status.markT = op.mark.t; }
  afterHit(w, h, m, op, c);
}

function afterHit(w, h, m, op, c) {
  if (op.gainPerTarget) gainRes(h, op.gainPerTarget * w.tuning.resourceRegen);
  if (op.healPerTarget) healHero(w, h, op.healPerTarget);
  if (h.stats.lifehit) h.hp = Math.min(h.stats.maxHp, h.hp + h.stats.lifehit);
  if (op.chainTo && !op.noProc) chainArc(w, h, m, op.chainTo, op, c);
  if (!op.noProc) for (const p of Object.keys(h.stats.powers)) POWERS[p]?.onHit?.(w, h, m, op, c);
}

function chainArc(w, h, from, ch, op, c) {
  const hit = new Set([from.id]);
  let cur = from;
  for (let i = 0; i < ch.n; i++) {
    const next = nearestEnemy(w, cur.x, cur.z, ch.range ?? 6, (o) => !hit.has(o.id));
    if (!next) break;
    hit.add(next.id);
    ev(w, { t: 'fx', k: 'arc', x: cur.x, z: cur.z, x2: next.x, z2: next.z, el: op.el });
    const [d, crit] = computeHit(w, h, next, ch.dmg, op.el, c);
    damageMonster(w, next, d, { src: h, crit, el: op.el, c, dx: next.x - cur.x, dz: next.z - cur.z });
    if (h.cls === 'lamplighter' && op.el === 'flame' && !next.dead) applyBurn(w, h, next);
    cur = next;
  }
}

// ---- Op runner ------------------------------------------------------------------------------
function fx(w, op, c, x, z, extra) {
  if (op.vfx || op.sfx || op.shake) ev(w, { t: 'fx', k: op.vfx ?? '', s: op.sfx ?? '', sh: op.shake ?? 0, x, z, dx: c.dx, dz: c.dz, r: op.radius ?? op.range ?? 0, a: op.angle ?? 0, el: op.el, wv: op.wave ? 1 : 0, fall: op.falling ?? '', ...extra });
}

const OPS = {
  arc(w, h, op, c) { sweep(w, h, op, c, op.range, op.angle); },
  cone(w, h, op, c) {
    sweep(w, h, op, c, op.range, op.angle);
    if (op.bounce) {
      const d = w.zone.nav.castWall(c.x, c.z, c.dx, c.dz, op.range);
      if (d < op.range - 0.5) {
        const wx = c.x + c.dx * (d - 0.5), wz = c.z + c.dz * (d - 0.5);
        const axisX = !walkable(w, wx + c.dx * 1.2, wz);
        const ndx = axisX ? -c.dx : c.dx, ndz = axisX ? c.dz : -c.dz;
        const c2 = { ...c, x: wx, z: wz, dx: ndx, dz: ndz };
        sweep(w, h, { ...op, bounce: false, range: op.range * 0.7 }, c2, op.range * 0.7, op.angle);
      }
    }
  },
  circle(w, h, op, c) { burst(w, h, op, c, op.radius); },
  ring(w, h, op, c) { burst(w, h, op, c, op.radius); },

  projectile(w, h, op, c) {
    let count = op.count ?? 1;
    let fan = op.fan ?? 24;
    if (op.kind === 'spark' && h.stats.powers.last_wick && h.res > 70) { count = 3; fan = 28; }
    const base = Math.atan2(c.dz, c.dx);
    for (let i = 0; i < count; i++) {
      const a = base + (count > 1 ? (i / (count - 1) - 0.5) * (fan * Math.PI) / 180 : 0);
      spawnShot(w, { owner: h.id, team: 0, kind: op.kind, x: c.x + Math.cos(a) * 0.5, z: c.z + Math.sin(a) * 0.5, dx: Math.cos(a), dz: Math.sin(a), speed: op.speed, range: op.range, op, sk: c.sk, mult: c.mult, tgt: op.homing ? c.tgt?.id : 0 });
    }
    if (op.sfx) ev(w, { t: 'fx', k: '', s: op.sfx, x: c.x, z: c.z });
  },

  lob(w, h, op, c) {
    const n = op.count ?? 1;
    for (let i = 0; i < n; i++) {
      let px = c.px, pz = c.pz;
      if (i > 0) { const a = w.rng.range(0, Math.PI * 2), r = op.spread ?? 2; px += Math.cos(a) * r; pz += Math.sin(a) * r; }
      if (!walkable(w, px, pz)) { px = c.x + c.dx * 2; pz = c.z + c.dz * 2; }
      const tgt = op.homing ? nearestEnemy(w, c.px, c.pz, 10) : null;
      if (tgt) { px = tgt.x; pz = tgt.z; }
      ev(w, { t: 'lob', k: op.kind, x: c.x, z: c.z, px, pz, dur: op.flight, s: i === 0 ? op.sfx : '' });
      schedule(w, op.flight * (1 + i * 0.15), { h, ops: op.then, c: { ...c, x: px, z: pz, px, pz, tgtId: tgt?.id ?? 0, rehome: !!tgt } });
    }
  },

  chain(w, h, op, c) { if (c.tgt) chainArc(w, h, c.tgt, op, op, c); },

  dash(w, h, op, c) {
    const d = Math.min(op.dist, Math.max(2, dist(h.x, h.z, c.px, c.pz)));
    h.move = { k: 'dash', t: 0, dur: d / op.speed, vx: c.dx * op.speed, vz: c.dz * op.speed, op, c, hit: new Set(), dragged: [], nextTrail: 0, sx: h.x, sz: h.z };
    h.state = 'dash';
    if (op.sfx) ev(w, { t: 'fx', k: 'dash', s: op.sfx, sh: op.shake ?? 0, x: h.x, z: h.z });
  },

  leap(w, h, op, c) {
    let d = Math.min(op.range, dist(h.x, h.z, c.px, c.pz), Math.max(0.5, w.zone.nav.castWall(h.x, h.z, c.dx, c.dz, op.range) - 0.4));
    let tx = h.x + c.dx * d, tz = h.z + c.dz * d;
    while (d > 0.5 && !walkable(w, tx, tz)) { d -= 0.5; tx = h.x + c.dx * d; tz = h.z + c.dz * d; }
    if (!walkable(w, tx, tz)) { tx = h.x; tz = h.z; }
    h.move = { k: 'leap', t: 0, dur: op.time, sx: h.x, sz: h.z, tx, tz, op, c, nextTrail: 0 };
    h.state = 'leap';
    ev(w, { t: 'leap', id: h.id, dur: op.time, x: tx, z: tz });
  },

  blink(w, h, op, c) {
    const ox = h.x, oz = h.z;
    let d = Math.min(op.dist, Math.max(1.5, dist(h.x, h.z, c.px, c.pz)), Math.max(0.5, w.zone.nav.castWall(h.x, h.z, c.dx, c.dz, op.dist) - 0.4));
    let tx = h.x + c.dx * d, tz = h.z + c.dz * d;
    while (d > 0.5 && !walkable(w, tx, tz)) { d -= 0.5; tx = h.x + c.dx * d; tz = h.z + c.dz * d; }
    if (!walkable(w, tx, tz)) { tx = h.x; tz = h.z; }
    h.x = tx; h.z = tz;
    h.invuln = Math.max(h.invuln, op.invuln ?? 0.15);
    c.ox = ox; c.oz = oz; c.x = tx; c.z = tz;
    ev(w, { t: 'blink', id: h.id, x: ox, z: oz, x2: tx, z2: tz, s: op.sfx ?? 'blink' });
    if (op.bringMinions) for (const a of w.allies) if (a.owner === h.id && !a.def.static) { a.x = tx + w.rng.range(-1.5, 1.5); a.z = tz + w.rng.range(-1.5, 1.5); if (!walkable(w, a.x, a.z)) { a.x = tx; a.z = tz; } }
    if (c.sk?.id === 'dusk_step' && h.stats.powers.cinderwalk_boots) {
      const n = Math.ceil(d / 1.6);
      for (let i = 0; i <= n; i++) spawnArea(w, h, { kind: 'fire', radius: 1.3, life: 4, tick: 0.25, dmg: 0.2, el: 'flame' }, ox + ((tx - ox) * i) / n, oz + ((tz - oz) * i) / n, c);
    }
  },

  zone(w, h, op, c) {
    const atPoint = op.atPoint || c.ground;
    const x = atPoint ? c.px : c.x, z = atPoint ? c.pz : c.z;
    spawnArea(w, h, op, x, z, c);
    if (op.sfx) ev(w, { t: 'fx', k: '', s: op.sfx, x, z });
  },

  obstacle(w, h, op, c) { spawnObstacle(w, op, c.x, c.z); },

  summon(w, h, op, c) {
    let max = op.max + (h.vows.includes('union') ? 1 : 0) + (h.stats.set2.perpetual_mourner && op.kind === 'pallbearer' ? 2 : 0);
    let have = w.allies.filter((a) => a.owner === h.id && a.type === op.kind && !a.temp).length;
    const n = Math.min(op.count + (op.count > 1 && h.stats.set2.perpetual_mourner ? 2 : 0), Math.max(0, max - have));
    for (let i = 0; i < n; i++) {
      const a = w.rng.range(0, Math.PI * 2);
      const r = addAlly(w, h, op.kind, c.x + Math.cos(a) * 1.2, c.z + Math.sin(a) * 1.2, { pct: op.dmg, life: op.life ?? 0, quick: op.quick, explodes: op.explodes, slam: h.stats.powers.second_best_crook ? 2.4 : 0, coffin: !!h.stats.powers.second_best_crook });
      r.temp = !!op.life;
    }
    if (op.sfx) ev(w, { t: 'fx', k: 'raise', s: op.sfx, x: c.x, z: c.z });
  },

  turret(w, h, op, c) {
    const mine = w.allies.filter((a) => a.owner === h.id && a.type === op.kind);
    let max = op.max + (op.kind === 'lamp_post' && h.vows.includes('keeper') ? 1 : 0);
    while (mine.length >= max) { removeAlly(w, mine.shift(), 'expire'); }
    let x = c.ground ? c.px : c.x, z = c.ground ? c.pz : c.z;
    if (!walkable(w, x, z)) { x = c.x; z = c.z; }
    const t = addAlly(w, h, op.kind, x, z, { pct: op.dmg, life: op.life, turret: op });
    t.nextShot = w.time + 0.4;
    if (op.sfx) ev(w, { t: 'fx', k: 'plant', s: op.sfx, x, z });
  },

  buff(w, h, op, c) {
    addBuff(h, { id: op.id, t: op.t, speedMul: op.speedMul, unstoppable: op.unstoppable, unseen: op.unseen, nextHit: op.nextHit, spin: op.spin, minionDmg: op.minionDmg, minionSpeed: op.minionSpeed, dmg: op.dmg_up, finale: op.finale });
    if (op.spin) ev(w, { t: 'spin', id: h.id, dur: op.t });
  },

  debuff(w, h, op, c) {
    for (const m of enemiesIn(w, c.x, c.z, op.radius ?? 6)) if (op.mark) { m.status.mark = op.mark.p; m.status.markT = op.mark.t; }
  },
  pull(w, h, op, c) { for (const m of enemiesIn(w, c.x, c.z, op.radius ?? 6)) knockMonster(m, c.x - m.x, c.z - m.z, op.dist ?? 1.5); },
  knock(w, h, op, c) { for (const m of enemiesIn(w, c.x, c.z, op.radius ?? 6)) knockMonster(m, m.x - c.x, m.z - c.z, op.dist ?? 2); },
  stun(w, h, op, c) { for (const m of enemiesIn(w, c.x, c.z, op.radius ?? 6)) if (!m.def.boss) m.status.stun = Math.max(m.status.stun ?? 0, op.t ?? 1); },
  apply_status(w, h, op, c) { for (const m of enemiesIn(w, c.x, c.z, op.radius ?? 6)) for (const st of op.status) applyStatus(w, h, m, st); },

  consume_status(w, h, op, c) {
    let hits = 0;
    for (const m of enemiesIn(w, c.x, c.z, op.radius)) {
      const st = m.status[op.k];
      if (!st) continue;
      const d = st.dps * st.t * op.mult * (1 + heroDamageUp(h));
      delete m.status[op.k];
      hits++;
      ev(w, { t: 'fx', k: 'snuff_one', x: m.x, z: m.z });
      damageMonster(w, m, d, { src: h, el: op.el, dx: m.x - c.x, dz: m.z - c.z, c });
      if (m.dead) continue;
      if (op.stun && !m.def.boss) m.status.stun = Math.max(m.status.stun ?? 0, op.stun);
      if (op.relight) schedule(w, op.relight, { h, ops: [{ op: 'apply_status', radius: 0.1, status: [{ k: 'burn', dps: RULES.burnDps, t: RULES.burnTime }] }], c: { ...c, x: m.x, z: m.z } });
    }
    if (op.gainPerTarget) gainRes(h, op.gainPerTarget * hits);
    fx(w, op, c, c.x, c.z);
    if (h.stats.powers.snuffers_mitts) {
      const refund = Math.floor(hits / 10) * (c.sk?.cost ?? 40) * 0.5;
      if (refund) gainRes(h, refund);
      if (hits > 0) { h.cds.dusk_step = 0; h.charges.dusk_step = Math.max(1, h.charges.dusk_step ?? 1); }
    }
  },

  consume_graves(w, h, op, c) {
    const near = w.graves.filter((g) => dist(g.x, g.z, c.x, c.z) <= op.radius).sort((a, b) => dist2(a.x, a.z, c.x, c.z) - dist2(b.x, b.z, c.x, c.z));
    const unpaid = h.stats.powers.unpaid_graves;
    const take = unpaid ? near : near.slice(0, op.max);
    if (op.sfx) ev(w, { t: 'fx', k: '', s: op.sfx, sh: op.shake ?? 0, x: c.x, z: c.z });
    const queue = [...take];
    const done = new Set();
    let count = 0;
    while (queue.length) {
      const g = queue.shift();
      if (done.has(g)) continue;
      done.add(g);
      w.graves.splice(w.graves.indexOf(g), 1);
      ev(w, { t: 'gravex', id: g.id });
      count++;
      if (!op.noBlast) {
        const c2 = { ...c, x: g.x, z: g.z };
        ev(w, { t: 'fx', k: op.vfx ?? 'grave_burst', x: g.x, z: g.z, r: op.blast, el: op.el });
        for (const m of enemiesIn(w, g.x, g.z, op.blast)) applyHit(w, h, m, { dmg: op.dmg, el: op.el, aoe: true }, c2);
        hitPropsIn(w, g.x, g.z, op.blast, h);
        if (op.chain) for (const o of w.graves) if (!done.has(o) && dist(o.x, o.z, g.x, g.z) <= op.blast) queue.push(o);
      }
      if (op.healEach) healHero(w, h, op.healEach);
      if (unpaid) gainRes(h, 1);
      if (op.rise) {
        const r = addAlly(w, h, 'pallbearer', g.x, g.z, { pct: 0.6, life: op.rise, explodes: op.finale ?? h.buffs.find((b) => b.finale)?.finale, quick: false });
        r.temp = true;
      }
      if (op.healMinions) for (const a of w.allies) if (a.owner === h.id && !a.def.static) a.hp = a.maxHp;
    }
    c.graves = count;
  },

  comet_rain(w, h, op, c) {
    const total = Math.round(op.rate * op.t);
    for (let i = 0; i < total; i++) {
      schedule(w, (i + w.rng.next()) / op.rate, { h, ops: [{ op: 'comet', dmg: op.dmg, radius: op.radius, el: op.el, spread: op.spread, big: op.big, s: op.sfx }], c });
    }
  },
  comet(w, h, op, c) {
    // Land on something if we can; otherwise anywhere near the caster.
    const pool = enemiesIn(w, h.x, h.z, op.spread ?? 12);
    let x, z;
    if (pool.length && !op.big) { const m = w.rng.pick(pool); x = m.x + w.rng.range(-1, 1); z = m.z + w.rng.range(-1, 1); }
    else if (pool.length) { x = pool[0].x; z = pool[0].z; }
    else { x = h.x + w.rng.range(-8, 8); z = h.z + w.rng.range(-8, 8); }
    const dur = 0.45;
    ev(w, { t: 'lob', k: op.big ? 'meteor' : 'comet', x: x + 3, z: z - 3, px: x, pz: z, dur, s: op.s, sky: 1 });
    schedule(w, dur, { h, ops: [{ op: 'ring', radius: op.radius, dmg: op.dmg, el: op.el, vfx: 'fire_burst', sfx: 'blast', shake: op.big ? 0.7 : 0.12, wave: !!op.big }], c: { ...c, x, z } });
  },

  delay(w, h, op, c) { schedule(w, op.t, { h, ops: [op.then].flat(), c: { ...c }, atCaster: op.atCaster }); },
  repeat(w, h, op, c) {
    const sched = { h, ops: [op.then].flat(), c: { ...c }, atCaster: op.atCaster, left: op.n - 1, every: op.every, extendOnKill: op.extendOnKill };
    schedule(w, 0, sched);
  },
  spawn_decoy(w, h, op, c) {
    const d = addAlly(w, h, 'decoy', h.x, h.z, { pct: 0, life: op.t, taunt: true });
    d.taunt = true;
  },
};
OPS.spawn_decoy = OPS.spawn_decoy;

function sweep(w, h, op, c, range, angle) {
  const cosHalf = Math.cos(((angle ?? 120) / 2) * (Math.PI / 180));
  const list = enemiesIn(w, c.x, c.z, range);
  for (const m of list) {
    const dx = m.x - c.x, dz = m.z - c.z, l = Math.hypot(dx, dz);
    if (l > m.r + 0.5 && (dx * c.dx + dz * c.dz) / (l || 1) < cosHalf) continue;
    applyHit(w, h, m, { ...op, aoe: list.length > 1 }, c);
  }
  hitPropsIn(w, c.x + c.dx * range * 0.5, c.z + c.dz * range * 0.5, range * 0.6, h);
  fx(w, op, c, c.x, c.z);
}

function burst(w, h, op, c, radius) {
  if (c.rehome && c.tgtId) {
    const t = w.monsters.find((m) => m.id === c.tgtId && !m.dead);
    if (t) { c.x = t.x; c.z = t.z; }
  }
  const x = op.atOrigin ? (c.ox ?? c.x) : c.x, z = op.atOrigin ? (c.oz ?? c.z) : c.z;
  const c2 = op.atOrigin ? { ...c, x, z } : c;
  for (const m of enemiesIn(w, x, z, radius)) applyHit(w, h, m, { ...op, aoe: true }, c2);
  hitPropsIn(w, x, z, radius, h);
  fx(w, op, c2, x, z);
  if (op.falling === 'bell') ev(w, { t: 'obj_fall', k: 'bell', x, z });
}

export function runOps(w, h, ops, c) {
  for (const op of ops) {
    const f = OPS[op.op];
    if (!f) throw new Error(`unknown effect op "${op.op}"`);
    f(w, h, op, c);
  }
}
export const OP_NAMES = Object.keys(OPS);

// ---- Scheduled ops --------------------------------------------------------------------------
export function schedule(w, delay, s) { s.at = w.time + delay; w.sched.push(s); }

export function stepSched(w) {
  for (let i = w.sched.length - 1; i >= 0; i--) {
    const s = w.sched[i];
    if (s.at > w.time) continue;
    if (s.h.dead && !s.left) { w.sched.splice(i, 1); continue; }
    if (s.atCaster) { s.c.x = s.h.x; s.c.z = s.h.z; }
    const before = s.c.kills ?? 0;
    runOps(w, s.h, s.ops, s.c);
    const killed = (s.c.kills ?? 0) - before;
    if (s.left > 0) {
      s.left--;
      if (s.extendOnKill && killed > 0) {
        const add = Math.round((killed * s.extendOnKill) / s.every);
        s.left += add;
        const b = s.h.buffs.find((x) => x.spin);
        if (b) b.t += add * s.every;
      }
      s.at = w.time + s.every;
    } else {
      w.sched.splice(i, 1);
    }
  }
}

// ---- Buffs, shots, areas --------------------------------------------------------------------
export function addBuff(h, b) {
  const cur = h.buffs.find((x) => x.id === b.id);
  if (cur) Object.assign(cur, b);
  else h.buffs.push(b);
}

export function spawnShot(w, s) {
  const shot = { id: nextId(w), life: (s.range ?? 16) / (s.speed ?? 10), pierce: s.op?.pierce ?? 0, hit: null, vx: s.dx * s.speed, vz: s.dz * s.speed, r: s.r ?? 0.3, ...s };
  w.shots.push(shot);
  ev(w, { t: 'shot', id: shot.id, k: shot.kind, x: shot.x, z: shot.z, vx: shot.vx, vz: shot.vz, life: shot.life, team: shot.team, el: shot.op?.el ?? shot.el });
  return shot;
}

export function endShot(w, i, s, hit) {
  ev(w, { t: 'shotx', id: s.id, x: s.x, z: s.z, hit: hit ? 1 : 0, k: s.kind });
  w.shots.splice(i, 1);
}

export function spawnArea(w, h, op, x, z, c) {
  let drag = op.drag ?? 0;
  if (c?.sk?.id === 'lantern_hurl' && h?.stats.powers.patient_moth) drag = 3;
  const a = {
    id: nextId(w), kind: op.kind, x, z, r: op.radius, life: op.life, t: 0, tick: op.tick ?? 0.5, nextTick: 0,
    owner: h?.id ?? 0, team: 0, dmg: op.dmg ?? 0, el: op.el, allyDr: op.allyDr ?? 0, allyHeal: op.allyHeal ?? 0, allyDmg: op.allyDmg ?? 0, allyRegen: op.allyRegen ?? 0,
    allyStunImmune: !!op.allyStunImmune, enemySlow: op.enemySlow ?? 0, enemyVuln: op.enemyVuln ?? 0, deathTithe: op.deathTithe ?? 0,
    follow: op.follow ? h?.id ?? 0 : 0, followTarget: op.followTarget ? c?.tgt?.id ?? 0 : 0, stopsShots: !!op.stopsShots, endBlast: op.endBlast ?? null, drag, c: c ?? null, h: h ?? null,
  };
  w.areas.push(a);
  ev(w, { t: 'area', id: a.id, k: a.kind, x, z, r: a.r, life: a.life, follow: a.follow });
  return a;
}

export function spawnObstacle(w, op, x, z) {
  const col = Math.floor(x), row = Math.floor(z);
  const cells = [];
  for (const [cx, cz] of [[col, row], [col, row + 1]]) {
    if (!w.zone.nav.isOpen(cx, cz)) continue;
    // Never wall anyone in: a body on the cell keeps it open.
    if (w.heroes.some((h) => Math.floor(h.x) === cx && Math.floor(h.z) === cz)) continue;
    cells.push([cx, cz]);
    for (const n of w.zone.navs) n.setOpen(cx, cz, false);
  }
  const o = { id: nextId(w), x: col + 0.5, z: row + 1, cells, life: op.life, kind: op.kind };
  w.obstacles.push(o);
  ev(w, { t: 'obst', id: o.id, k: o.kind, x: o.x, z: o.z, life: o.life });
  return o;
}

export function stepObstacles(w) {
  for (let i = w.obstacles.length - 1; i >= 0; i--) {
    const o = w.obstacles[i];
    o.life -= 1 / 60;
    if (o.life > 0) continue;
    for (const [cx, cz] of o.cells) for (const n of w.zone.navs) n.setOpen(cx, cz, true);
    ev(w, { t: 'obstx', id: o.id, x: o.x, z: o.z });
    w.obstacles.splice(i, 1);
  }
}

export { gainRes, healHero, heroById };
