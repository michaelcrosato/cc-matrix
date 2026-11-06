// The effect ops. Skills and Tones only compose these; nothing here knows a skill by name except powers.
import { SKILLS, CLASSES } from '../data/classes.js';
import { F } from '../data/tuning.js';
import { DT, after, emit, findOpenNear, moveCircle, near, walkable } from './world.js';
import { damageBonus, gainResource, healHero, addBuff } from './hero.js';
import { killMonster, stunMonster } from './monsters.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const setPath = (obj, path, v) => { const parts = path.split('.'); let o = obj; for (let i = 0; i < parts.length - 1; i++) { o = o[parts[i]] ?? (o[parts[i]] = {}); } o[parts.at(-1)] = v; };

// Skill + Tone + legendary powers = the concrete skill this cast uses. Cached by the hero's loadout key.
export function effectiveSkill(h, skillId, toneId) {
  const key = `${skillId}|${toneId ?? ''}|${[...h.powers].join(',')}|${Object.keys(h.setBonus).join(',')}`;
  h._skillCache ??= new Map();
  const hit = h._skillCache.get(key); if (hit) return hit;
  const base = SKILLS[skillId];
  const sk = { ...base, fx: clone(base.fx), tones: undefined };
  const t = toneId ? base.tones[toneId] : null;
  if (t) {
    if (t.fxAll) sk.fx = clone(t.fxAll);
    if (t.set) Object.assign(sk.fx[0], clone(t.set));
    if (t.patch) for (const p of t.patch) setPath(sk.fx[0], p.path, p.v);
    if (t.add) sk.fx.push(...clone(t.add));
    if (t.addThen) sk.fx[0].then.push(...clone(t.addThen));
    if (t.cd !== undefined) sk.cd = t.cd;
    if (t.wind !== undefined) sk.wind = t.wind;
    if (t.charges) sk.charges = t.charges;
  }
  // Legendary powers change how skills work, not only the numbers.
  const P = h.powers;
  if (P.has('widows_clapper') && skillId === 'great_toll') for (const dl of [0.4, 0.8]) sk.fx.push({ op: 'delay', t: dl, then: [{ op: 'ring', radius: 6, dmg: sk.fx[0].dmg * 0.5, vfx: 'ring_bronze', sfx: 'bell_small', shake: 0.15 }] });
  if (P.has('anvil') && skillId === 'clapper_charge') sk.fx[0].drag = true;
  if (P.has('hymnal_greaves') && skillId === 'chain_reap') sk.fx[0].homingNote = true;
  if (P.has('last_wick') && skillId === 'spark_bolt') sk.fx[0].wickSplit = true;
  if (P.has('patient_moth') && skillId === 'lantern_hurl') for (const op of sk.fx) for (const th of op.then ?? []) if (th.op === 'zone') th.pull = 2;
  if (P.has('snuffer_mitts') && skillId === 'snuff') sk.fx[0].mitts = true;
  if (P.has('cinderwalk') && skillId === 'dusk_step') sk.fx.push({ op: 'trail', dur: 3, dmg: 0.6, element: 'flame', radius: 1.2, steps: 6, fromOrigin: true });
  if (P.has('second_crook') && skillId === 'raise_pallbearers') { sk.fx[0].slam = true; sk.fx[0].hpMul = 1.5; sk.fx[0].dmg = (sk.fx[0].dmg ?? 0.6) * 1.3; sk.fx[0].crook = true; }
  if (P.has('ledger_graves') && skillId === 'exhume') { sk.fx[0].max = 99; sk.fx[0].tithe = 1; }
  if (P.has('family_deed') && skillId === 'coffin_drop') { const main = sk.fx[0]; main.count = (main.count ?? 1) + 3; main.spread = main.spread ?? 3; }
  const sb = h.setBonus;
  if (sb.ringing_order4 && base.tags?.includes('toll')) for (const op of sk.fx) { if (op.dmg) op.dmg += 3; for (const th of op.then ?? []) if (th.dmg) th.dmg += 3; }
  if (sb.perpetual_mourner4 && skillId === 'exhume') { sk.fx[0].dmg += 4; sk.fx[0].healMinions = true; }
  if (sb.last_lamplighter4 && skillId === 'lamp_post') { sk.fx[0].setBolt = true; sk.fx[0].dmg += 4; }
  if (sb.perpetual_mourner2 && skillId === 'raise_pallbearers') sk.fx[0].max = (sk.fx[0].max ?? 4) + 2;
  if (h.vows.includes('union_rates') && skillId === 'raise_pallbearers') sk.fx[0].max = (sk.fx[0].max ?? 4) + 1;
  if (h.vows.includes('keeper_of_lamps') && skillId === 'lamp_post') sk.fx[0].max = (sk.fx[0].max ?? 3) + 1;
  h._skillCache.set(key, sk);
  return sk;
}

// The best monster inside a 120 degree cone of facing and the skill's range.
export function softTarget(w, h, sk, intent) {
  if (intent.hardAim) return null;
  const range = sk?.range ?? rangeOf(sk) ?? 8;
  let best = null; let bs = Infinity;
  const fx = intent.aimX ?? Math.sin(h.facing); const fz = intent.aimZ ?? Math.cos(h.facing);
  for (const m of w.active) {
    if (m.dead || m.untargetable) continue;
    const dx = m.x - h.x; const dz = m.z - h.z; const d = Math.hypot(dx, dz);
    if (d > range + m.r) continue;
    const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
    if (dot < 0.5) continue;
    const s = d - dot * 3 - (m.elite ? 1 : 0) - (m.defn.boss ? 2 : 0);
    if (s < bs) { bs = s; best = m; }
  }
  return best;
}
const rangeOf = (sk) => { const o = sk?.fx?.[0]; if (!o) return 8; return o.range ?? o.radius ?? o.dist ?? 8; };

const ELEMENT_STAT = { sound: 'soundPct', flame: 'flamePct', grave: 'gravePct' };

// hero hit on monster: the one formula, with hooks.
export function heroHit(w, c, m, pct, op = {}) {
  const h = c.hero; if (!h || m.dead || m.invulnerable) return 0;
  const s = h.stats; const element = op.element ?? c.sk?.element ?? 'phys';
  const rng = w.rngs.combat;
  let crit = s.crit;
  if (h.vows.includes('bright_eyes') && m.status.burn) crit += 10;
  const isCrit = rng.chance(Math.min(100, crit) / 100);
  let dmg = s.weaponDps * pct * (c.mult ?? 1) * (1 + s.power / 100) * (1 + (s[ELEMENT_STAT[element]] ?? 0) / 100) * damageBonus(w, h, m) * w.tuning.playerDamage;
  if (isCrit) dmg *= 1.5 + s.critDmg / 100;
  // Class passives.
  if (m.status.burn && h.cls === 'lamplighter') dmg *= 1.15;
  if (m.status.curse) dmg *= 1 + m.status.curse.v;
  if (m.status.mark) dmg *= 1.2;
  const veil = h.buffs.find((b) => b.nextHit); if (veil) { dmg *= 1 + veil.nextHit; veil.nextHit = 0; veil.dur = 0; h.unseen = 0; }
  if (op.consume === 'resonance' && m.resonance > 0) { dmg *= 1 + 0.25 * m.resonance; if (c.hero.cls === 'bellwarden') { m.resonance = 0; m.resT = 0; emit(w, { t: 'mstack', id: m.id, n: 0 }); } }
  if (w.cheats.oneHit) dmg = m.hp + 1;
  dmg = Math.round(dmg);
  m.hp -= dmg;
  m.flash = 2; m.lastHitBy = h.id;
  h.damage += dmg; h.outCombat = 0;
  m.woke ||= true;
  emit(w, { t: 'hit', id: m.id, amt: dmg, crit: isCrit, x: m.x, z: m.z, element, by: h.seat, mat: m.defn.material });
  if (op.sfx) emit(w, { t: 'sfx', id: op.sfx, x: m.x, z: m.z, rate: 0.15 });
  // Secondary effects.
  if (h.cls === 'bellwarden' && !op.noRes) { m.resonance = Math.min(h.resonanceCap, m.resonance + 1); m.resT = 6; emit(w, { t: 'mstack', id: m.id, n: m.resonance }); }
  if (s.lifePerHit > 0) h.hp = Math.min(s.maxHp, h.hp + s.lifePerHit * 0.2);
  if (op.heal) healHero(w, h, op.heal);
  if (op.resPerTarget) gainResource(h, op.resPerTarget);
  if (c.sk?.genPerTarget) gainResource(h, c.sk.genPerTarget);
  if (element === 'flame' && h.cls === 'lamplighter' && !op.noBurn) applyStatus(w, m, 'burn', { dps: s.weaponDps * 0.3 * h.burnMul * w.tuning.playerDamage * (1 + s.power / 100), t: 4, by: h.id });
  if (op.burn) applyStatus(w, m, 'burn', { dps: s.weaponDps * op.burn * h.burnMul * (1 + s.power / 100), t: 4, by: h.id });
  if (op.bleed) applyStatus(w, m, 'bleed', { dps: s.weaponDps * op.bleed * (1 + s.power / 100), t: 3, by: h.id });
  if (op.poison) applyStatus(w, m, 'poison', { dps: s.weaponDps * op.poison * (1 + s.power / 100), t: 3, by: h.id });
  if (op.slow) applyStatus(w, m, 'slow', { v: op.slow, t: 3 });
  if (op.blind) m.blindT = op.blind;
  if (op.mark) applyStatus(w, m, 'mark', { t: op.mark });
  if (op.stun) stunMonster(w, m, op.stun);
  if (op.root) { m.rootT = op.root; }
  if (op.knock) knockMonster(w, m, c.ox ?? c.x, c.oz ?? c.z, op.knock);
  if (op.pull) { const dx = c.x - m.x; const dz = c.z - m.z; const d = Math.hypot(dx, dz) || 1; if (!m.static) moveCircle(w, m, (dx / d) * Math.min(op.pull, d - 0.8), (dz / d) * Math.min(op.pull, d - 0.8), m.r * 0.6); }
  if (op.homingNote) runOps(w, { ...c, x: m.x, z: m.z, ox: m.x, oz: m.z }, [{ op: 'projectile', speed: 12, range: 10, width: 0.5, dmg: 0.4, homing: 8, look: 'note', noRes: true }]);
  if (h.powers.has('malisons_knuckle') && m.elite && !op.noChain) { for (const o of w.active) if (o !== m && !o.dead && o.pack === m.pack && o.pack && near(o, m.x, m.z, 10)) { heroHit(w, c, o, pct * 0.3, { noChain: true, noRes: true }); break; } }
  if (m.hp <= 0) {
    const overkill = -m.hp / Math.max(1, m.maxHp);
    if (op.refundKill && c.sk?.cd) h.cds[c.sk.id] -= c.sk.cd * op.refundKill;
    if (op.killExtend && c.buff) c.buff.dur += op.killExtend;
    if (op.forkOnKill) for (let i = 0; i < op.forkOnKill; i++) {
      const a = Math.atan2(c.ax, c.az) + (i ? 0.7 : -0.7);
      fireProjectile(w, { ...c, x: m.x, z: m.z, ax: Math.sin(a), az: Math.cos(a) }, { speed: 18, range: 8, width: 0.5, dmg: pct * 0.6, look: 'spark', ignore: m.id });
    }
    killMonster(w, m, h, { overkill, ax: m.x - (c.ox ?? c.x), az: m.z - (c.oz ?? c.z) });
  }
  // Chain jumps.
  if (op.chain) {
    let from = m; const seen = new Set([m.id]);
    for (let i = 0; i < op.chain.count; i++) {
      let best = null; let bd = op.chain.range;
      for (const o of w.active) { if (o.dead || seen.has(o.id)) continue; const d = Math.hypot(o.x - from.x, o.z - from.z); if (d < bd) { bd = d; best = o; } }
      if (!best) break;
      seen.add(best.id);
      emit(w, { t: 'arc', x: from.x, z: from.z, x2: best.x, z2: best.z, element });
      heroHit(w, c, best, pct * op.chain.mult, { noRes: true, element, noChain: true });
      from = best;
    }
  }
  return dmg;
}
export function knockMonster(w, m, ox, oz, dist0) {
  if (m.static || m.defn.boss) return;
  const dx = m.x - ox; const dz = m.z - oz; const d = Math.hypot(dx, dz) || 1;
  m.knockX = (dx / d) * dist0 * 6; m.knockZ = (dz / d) * dist0 * 6; m.knockT = 1 / 6;
}
export function applyStatus(w, m, id, data) {
  if (m.dead) return;
  const old = m.status[id];
  if (old && id !== 'curse') { old.t = Math.max(old.t, data.t); if (data.dps) old.dps = Math.max(old.dps, data.dps); if (data.v) old.v = Math.max(old.v, data.v); if (data.by) old.by = data.by; return; }
  m.status[id] = { ...data };
  emit(w, { t: 'mstatus', id: m.id, status: id, on: true });
}

const inCone = (c, m, range, angle) => {
  const dx = m.x - c.x; const dz = m.z - c.z; const d = Math.hypot(dx, dz);
  if (d > range + m.r) return false;
  if (d < m.r + 0.3) return true;
  return (dx * c.ax + dz * c.az) / d >= Math.cos(((angle / 2) * Math.PI) / 180);
};
function hitProps(w, c, x, z, r, op) { for (const p of w.props) if (p.hp > 0 && !p.broken && near(p, x, z, r + 0.5)) w.hooks.breakProp(w, p, c.hero, x, z); }

function areaBonus(c) { return c.hero ? 1 + (c.hero.stats.area ?? 0) * 0 : 1; }

const VFX = (w, kind, x, z, r, extra = {}) => emit(w, { t: 'vfx', kind, x, z, r, ...extra });
function commonOpFx(w, c, op, x, z, r) {
  if (op.vfx) VFX(w, op.vfx, x, z, r, op.op === 'cone' ? { ax: c.ax, az: c.az, angle: op.angle } : {});
  if (op.sfx && op.op !== 'arc') emit(w, { t: 'sfx', id: op.sfx, x, z });
  if (op.shake) emit(w, { t: 'shake', v: op.shake });
  if (op.decal) emit(w, { t: 'decal', kind: op.decal, x, z, r });
}

const OPS = {
  arc(w, c, op) { for (const m of [...w.active]) if (inCone(c, m, op.range, op.angle)) { heroHit(w, c, m, op.dmg, op); c.targets++; } hitProps(w, c, c.x + c.ax * op.range * 0.6, c.z + c.az * op.range * 0.6, op.range * 0.6, op); commonOpFx(w, c, op, c.x, c.z, op.range); },
  cone(w, c, op) { for (const m of [...w.active]) if (inCone(c, m, op.range, op.angle)) { heroHit(w, c, m, op.dmg, op); c.targets++; } hitProps(w, c, c.x + c.ax * op.range * 0.5, c.z + c.az * op.range * 0.5, op.range * 0.5, op); commonOpFx(w, c, op, c.x, c.z, op.range); },
  circle(w, c, op) {
    const at = op.at === 'origin' ? { x: c.ox, z: c.oz } : op.at === 'zoneTarget' ? { x: c.tx, z: c.tz } : { x: c.x, z: c.z };
    for (const m of [...w.active]) if (near(m, at.x, at.z, op.radius + m.r)) { heroHit(w, { ...c, x: at.x, z: at.z, ox: at.x, oz: at.z }, m, op.dmg, op); c.targets++; }
    hitProps(w, c, at.x, at.z, op.radius, op); commonOpFx(w, c, op, at.x, at.z, op.radius);
  },
  ring(w, c, op) { for (const m of [...w.active]) if (near(m, c.x, c.z, op.radius + m.r)) { heroHit(w, c, m, op.dmg, op); c.targets++; } hitProps(w, c, c.x, c.z, op.radius, op); commonOpFx(w, c, op, c.x, c.z, op.radius); },
  projectile(w, c, op) {
    const count = op.wickSplit && c.hero?.res > 70 ? 3 : op.count ?? 1; const spread = ((op.spread ?? (op.wickSplit ? 16 : 0)) * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(c.ax, c.az) + (count > 1 ? (i - (count - 1) / 2) * spread : 0);
      fireProjectile(w, { ...c, ax: Math.sin(a), az: Math.cos(a) }, op);
    }
  },
  lob(w, c, op) {
    const count = op.count ?? 1;
    for (let i = 0; i < count; i++) {
      let tx = c.tx; let tz = c.tz;
      const d = Math.hypot(tx - c.x, tz - c.z); const maxR = op.range ?? 14;
      if (d > maxR) { tx = c.x + ((tx - c.x) / d) * maxR; tz = c.z + ((tz - c.z) / d) * maxR; }
      if (i > 0 || count > 1) { const a = (i / count) * Math.PI * 2; tx += Math.cos(a) * (i === 0 ? 0 : op.spread ?? 2.5); tz += Math.sin(a) * (i === 0 ? 0 : op.spread ?? 2.5); }
      const p = findOpenNear(w, tx, tz); tx = p.x; tz = p.z;
      const delay = (op.time ?? 0.5) + i * 0.1;
      emit(w, { t: 'lob', x: c.x, z: c.z, x2: tx, z2: tz, dur: delay, look: op.look ?? 'lantern' });
      after(w, delay, () => { runOps(w, { ...c, x: tx, z: tz, ox: tx, oz: tz, tx, tz }, op.then ?? []); });
    }
  },
  chain(w, c, op) {
    let from = { x: c.x, z: c.z }; const seen = new Set();
    for (let i = 0; i < op.count; i++) {
      let best = null; let bd = op.range;
      for (const o of w.active) { if (o.dead || seen.has(o.id)) continue; const d = Math.hypot(o.x - from.x, o.z - from.z); if (d < bd) { bd = d; best = o; } }
      if (!best) break;
      seen.add(best.id); emit(w, { t: 'arc', x: from.x, z: from.z, x2: best.x, z2: best.z });
      heroHit(w, c, best, op.dmg, op); from = best;
    }
  },
  dash(w, c, op) {
    const h = c.hero; const v = op.dist / op.time; const hitIds = new Set(); const dragged = [];
    c.ox = h.x; c.oz = h.z;
    h.moveDash = { vx: c.ax * v, vz: c.az * v, t: op.time, inv: true,
      step: (w2, he) => {
        for (const m of [...w2.active]) {
          if (m.dead || hitIds.has(m.id)) continue;
          if (near(m, he.x, he.z, op.width + m.r)) { hitIds.add(m.id); heroHit(w2, { ...c, x: he.x, z: he.z, ox: he.x, oz: he.z }, m, op.dmg, { ...op, knock: op.drag ? 0 : op.shove ?? 2 }); if (op.drag && !m.dead && !m.static) dragged.push(m); }
        }
        for (const m of dragged) if (!m.dead) moveCircle(w2, m, c.ax * v * DT, c.az * v * DT, m.r * 0.6);
        hitProps(w2, c, he.x, he.z, op.width, op);
      } };
    emit(w, { t: 'shake', v: 0.1 });
  },
  leap(w, c, op) {
    const h = c.hero; let dx = c.tx - h.x; let dz = c.tz - h.z; let d = Math.hypot(dx, dz);
    const r = op.range ?? 12; if (d > r) { dx *= r / d; dz *= r / d; d = r; }
    const target = findOpenNear(w, h.x + dx, h.z + dz);
    const time = op.time ?? 0.45; const vx = (target.x - h.x) / time; const vz = (target.z - h.z) / time;
    h.moveDash = { vx, vz, t: time, inv: true, noClip: true, end: (w2, he) => { he.x = target.x; he.z = target.z; runOps(w2, { ...c, x: he.x, z: he.z, ox: he.x, oz: he.z }, op.then ?? []); } };
    h.leapT = time; emit(w, { t: 'leap', id: h.id, dur: time });
    c.tx = target.x; c.tz = target.z;
  },
  blink(w, c, op) {
    const h = c.hero; const nav = w.zone.nav;
    const maxD = nav.castWall(h.x, h.z, c.ax, c.az, op.dist);
    let d = Math.max(0, maxD - 0.5);
    let nx = h.x + c.ax * d; let nz = h.z + c.az * d;
    const p = findOpenNear(w, nx, nz); nx = p.x; nz = p.z;
    VFX(w, 'blink', h.x, h.z, 1); h.x = nx; h.z = nz; h.px = nx; h.pz = nz; VFX(w, 'blink', nx, nz, 1);
    if (op.inv) h.invulnerable = Math.max(h.invulnerable, op.inv);
    if (op.bringMinions) for (const a of w.allies) if (a.owner === h.id && a.minion) { a.x = nx + w.rngs.ai.range(-2, 2); a.z = nz + w.rngs.ai.range(-2, 2); const q = findOpenNear(w, a.x, a.z); a.x = q.x; a.z = q.z; }
    runOps(w, { ...c, x: nx, z: nz }, op.then ?? []);
  },
  zone(w, c, op) {
    const f = { id: w.nextId++, x: op.at === 'origin' ? c.ox : c.tx ?? c.x, z: op.at === 'origin' ? c.oz : c.tz ?? c.z, r: op.radius, t: op.dur, dur: op.dur, tick: op.tick ?? 0.5, tickT: 0, op, c: { ...c }, owner: c.hero?.id, follow: op.follow ? c.hero : null, ally: op.ally, ward: op.ward, look: op.look ?? 'shock', pull: op.pull, slow: op.slow };
    if (!op.follow && c.sk?.fx?.[0]?.op !== 'zone' && c.tx === undefined) { f.x = c.x; f.z = c.z; }
    w.fields.push(f);
    emit(w, { t: 'field', id: f.id, x: f.x, z: f.z, r: f.r, dur: f.dur, look: f.look, follow: f.follow?.id ?? 0 });
    if (op.onSfx) emit(w, { t: 'sfx', id: op.onSfx, x: f.x, z: f.z });
  },
  debuff(w, c, op) { OPS.zone(w, c, { ...op, tick: op.tick ?? 0.5, dmg: op.dmg ?? 0, isDebuff: true }); },
  obstacle(w, c, op) {
    const o = { id: w.nextId++, x: c.x, z: c.z, r: op.radius, t: op.dur, look: op.look ?? 'coffin' };
    w.obstacles.push(o); emit(w, { t: 'obstacle', id: o.id, x: o.x, z: o.z, r: o.r, look: o.look, dur: o.t });
  },
  summon(w, c, op) { for (let i = 0; i < (op.count ?? 1); i++) w.hooks.summon(w, c, op); },
  turret(w, c, op) {
    const h = c.hero; const kind = op.kind;
    const live = w.allies.filter((a) => a.kind === kind && a.owner === h.id && !a.dead);
    if (op.max && live.length >= op.max) { live[0].dead = true; emit(w, { t: 'allygone', id: live[0].id }); }
    const p = findOpenNear(w, c.tx ?? c.x, c.tz ?? c.z);
    const a = { id: w.nextId++, kind, owner: h.id, seat: h.seat, x: p.x, z: p.z, px: p.x, pz: p.z, facing: 0, hp: 1e6, maxHp: 1e6, ttl: op.dur, rate: op.rate, rateT: 0.2, dmg: op.dmg, range: op.range ?? 10, radius: op.radius, taunt: op.taunt, arc: op.arc, healAura: op.healAura, endBlast: op.endBlast, setBolt: op.setBolt, c: { ...c }, turret: true, state: 'idle' };
    w.allies.push(a); emit(w, { t: 'ally', id: a.id, kind, x: a.x, z: a.z, owner: h.id, seat: h.seat });
  },
  buff(w, c, op) {
    const h = c.hero;
    const b = { id: op.id, dur: op.dur, ...op }; delete b.op;
    addBuff(w, h, b);
    if (op.unseen) h.unseen = op.dur;
  },
  pull(w, c, op) { for (const m of w.active) if (near(m, c.x, c.z, op.radius)) { const d = Math.hypot(c.x - m.x, c.z - m.z) || 1; if (!m.static) moveCircle(w, m, ((c.x - m.x) / d) * op.dist, ((c.z - m.z) / d) * op.dist, m.r * 0.6); } },
  knock(w, c, op) { for (const m of w.active) if (near(m, c.x, c.z, op.radius)) knockMonster(w, m, c.x, c.z, op.dist); },
  stun(w, c, op) { for (const m of w.active) if (near(m, c.x, c.z, op.radius)) stunMonster(w, m, op.t); },
  apply_status(w, c, op) { for (const m of w.active) if (near(m, c.x, c.z, op.radius)) applyStatus(w, m, op.status, { dps: (op.dps ?? 0) * (c.hero?.stats.weaponDps ?? 10), t: op.t, v: op.v, by: c.hero?.id }); },
  consume_status(w, c, op) {
    let n = 0;
    for (const m of [...w.active]) {
      const st = m.status[op.status]; if (m.dead || !st || !near(m, c.x, c.z, op.radius)) continue;
      const pay = st.dps * st.t * op.mult; n++;
      const payout = pay / Math.max(1, c.hero.stats.weaponDps);
      delete m.status[op.status]; emit(w, { t: 'mstatus', id: m.id, status: op.status, on: false });
      heroHit(w, c, m, payout, { element: 'flame', noBurn: true, stun: op.stun, resPerTarget: op.resPerTarget, sfx: 'hit_fire' });
      if (op.relight && !m.dead) after(w, op.relight, () => { if (!m.dead) applyStatus(w, m, 'burn', { dps: st.dps, t: 4, by: c.hero.id }); });
      VFX(w, 'burst_fire', m.x, m.z, 1);
    }
    if (op.mitts && n > 0) { gainResource(c.hero, (c.sk.cost ?? 40) * 0.5 * Math.floor(n / 10)); if (n >= 10) c.hero.cds.dusk_step = 0; }
    commonOpFx(w, c, op, c.x, c.z, op.radius);
    return n;
  },
  consume_graves(w, c, op) {
    let n = 0;
    const list = w.graves.filter((g) => near(g, c.x, c.z, op.radius)).slice(0, op.max);
    const blast = (g, depth) => {
      w.graves.splice(w.graves.indexOf(g), 1); n++;
      emit(w, { t: 'graveburst', id: g.id, x: g.x, z: g.z });
      for (const m of [...w.active]) if (near(m, g.x, g.z, op.blast + m.r)) heroHit(w, { ...c, ox: g.x, oz: g.z }, m, op.dmg, { element: 'grave', knock: 1 });
      if (op.heal) healHero(w, c.hero, op.heal);
      if (op.tithe) gainResource(c.hero, op.tithe);
      if (op.rise) w.hooks.summon(w, { ...c, x: g.x, z: g.z }, { kind: 'pallbearer', dmg: 0.6, ttl: op.rise, max: 12 });
      if (op.chainGraves && depth < 2) for (const o of [...w.graves]) if (near(o, g.x, g.z, op.blast)) blast(o, depth + 1);
    };
    for (const g of list) if (w.graves.includes(g)) blast(g, 0);
    if (op.healMinions) for (const a of w.allies) if (a.owner === c.hero.id && a.minion) a.hp = a.maxHp;
    if (n) emit(w, { t: 'shake', v: op.shake ?? 0.2 });
    c.targets += n;
  },
  raise_graves(w, c, op) {
    let n = 0;
    for (const g of [...w.graves]) { if (n >= op.max || !near(g, c.x, c.z, op.radius)) continue; w.graves.splice(w.graves.indexOf(g), 1); w.hooks.summon(w, { ...c, x: g.x, z: g.z }, { kind: 'pallbearer', dmg: op.dmg, ttl: op.ttl, max: 30 }); n++; }
    for (let i = n; i < 4; i++) w.hooks.summon(w, c, { kind: 'pallbearer', dmg: op.dmg, ttl: op.ttl, max: 30 });
  },
  detonate_minions(w, c, op) { for (const a of [...w.allies]) if (a.owner === c.hero.id && a.minion && !a.dead) { runOps(w, { ...c, x: a.x, z: a.z, ox: a.x, oz: a.z }, [{ op: 'circle', radius: op.radius, dmg: op.dmg, vfx: 'ring_grave', sfx: 'grave_burst' }]); a.dead = true; emit(w, { t: 'allygone', id: a.id, burst: true }); } },
  comet_rain(w, c, op) {
    const n = Math.round(op.dur * op.rate); const h = c.hero;
    for (let i = 0; i < n; i++) after(w, i / op.rate, () => {
      const rng = w.rngs.combat;
      // Comets look for trouble: mostly on foes near the caster.
      const near2 = w.active.filter((m) => !m.dead && near(m, h.x, h.z, op.area));
      const m = near2.length ? rng.pick(near2) : null;
      const tx = m ? m.x : h.x + rng.range(-op.area, op.area); const tz = m ? m.z : h.z + rng.range(-op.area, op.area);
      emit(w, { t: 'lob', x: tx + 3, z: tz - 3, x2: tx, z2: tz, dur: 0.35, look: 'comet', high: true });
      after(w, 0.35, () => runOps(w, { ...c, x: tx, z: tz, ox: tx, oz: tz, tx, tz, mult: c.mult }, [{ op: 'circle', radius: op.radius, dmg: op.dmg, vfx: 'ring_fire', sfx: 'explode_fire', decal: 'scorch', shake: 0.12 }]));
      if (op.partyHeal) for (const he of w.heroes) healHero(w, he, op.partyHeal / op.rate);
    });
  },
  delay(w, c, op) { after(w, op.t, () => { const cc = { ...c }; if (c.hero && !op.fixed) { cc.x = c.hero.x; cc.z = c.hero.z; cc.ox = cc.x; cc.oz = cc.z; } runOps(w, cc, op.then ?? []); }); },
  repeat(w, c, op) { for (let i = 0; i < op.n; i++) after(w, i * op.every, () => runOps(w, c, op.then ?? [])); },
  spawn_decoy(w, c, op) {
    const a = { id: w.nextId++, kind: 'decoy', owner: c.hero.id, seat: c.hero.seat, x: c.x, z: c.z, px: c.x, pz: c.z, facing: 0, hp: 1e6, maxHp: 1e6, ttl: op.dur, taunt: true, turret: true, state: 'idle', rate: 99, rateT: 99 };
    w.allies.push(a); emit(w, { t: 'ally', id: a.id, kind: 'decoy', x: a.x, z: a.z, owner: c.hero.id, seat: c.hero.seat });
  },
  trail(w, c, op) {
    const steps = op.steps ?? 6;
    for (let i = 0; i < steps; i++) after(w, i * 0.08, () => { const h = c.hero; OPS.zone(w, { ...c, tx: h.x, tz: h.z }, { op: 'zone', radius: op.radius, dur: op.dur, tick: 0.5, dmg: op.dmg, element: op.element, look: op.look ?? 'fire' }); });
  },
};
export const OP_IDS = Object.keys(OPS);

export function runOps(w, c, ops) { for (const op of ops) { const fn = OPS[op.op]; if (!fn) throw new Error(`unknown op ${op.op}`); if (op.count && op.op !== 'lob' && op.op !== 'projectile' && op.op !== 'summon' && op.op !== 'chain') { for (let i = 0; i < op.count; i++) fn(w, c, op); } else fn(w, c, op); } }

export function fireProjectile(w, c, op) {
  const p = { id: w.nextId++, x: c.x, z: c.z, vx: c.ax * op.speed, vz: c.az * op.speed, speed: op.speed, travelled: 0, range: op.range, width: op.width ?? 0.5, op, c: { ...c }, pierce: op.pierce ? 99 : op.pierceN ?? 0, bounce: op.bounce ?? 0, homing: op.homing ?? 0, hit: new Set(op.ignore ? [op.ignore] : []), look: op.look, hostile: false };
  w.projectiles.push(p);
  emit(w, { t: 'proj', id: p.id, x: p.x, z: p.z, vx: p.vx, vz: p.vz, range: p.range, look: p.look, sfx: null, w: p.width });
  return p;
}
export function hostileProjectile(w, m, tx, tz, { speed = 7, range = 16, dmg = 1, look = 'note', width = 0.5, status = null } = {}) {
  const dx = tx - m.x; const dz = tz - m.z; const d = Math.hypot(dx, dz) || 1;
  const p = { id: w.nextId++, x: m.x, z: m.z, vx: (dx / d) * speed, vz: (dz / d) * speed, speed, travelled: 0, range, width, dmg, look, hostile: true, m, status };
  w.projectiles.push(p);
  emit(w, { t: 'proj', id: p.id, x: p.x, z: p.z, vx: p.vx, vz: p.vz, range, look, w: width, hostile: true });
  return p;
}

export function stepProjectiles(w) {
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const p = w.projectiles[i]; let done = false;
    if (p.homing) {
      let best = null; let bd = 10;
      for (const m of w.active) { if (m.dead || p.hit.has(m.id)) continue; const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < bd) { bd = d; best = m; } }
      if (best) { const dx = best.x - p.x; const dz = best.z - p.z; const d = Math.hypot(dx, dz) || 1; const k = p.homing * DT; p.vx += (dx / d) * p.speed * k; p.vz += (dz / d) * p.speed * k; const v = Math.hypot(p.vx, p.vz) || 1; p.vx = (p.vx / v) * p.speed; p.vz = (p.vz / v) * p.speed; }
    }
    const sx = p.vx * DT; const sz = p.vz * DT;
    const nx = p.x + sx; const nz = p.z + sz;
    const blocked = !walkableOrPit(w, nx, nz);
    if (blocked) {
      if (p.bounce > 0) { p.bounce--; if (!walkableOrPit(w, nx, p.z)) p.vx *= -1; if (!walkableOrPit(w, p.x, nz)) p.vz *= -1; emit(w, { t: 'projturn', id: p.id, x: p.x, z: p.z, vx: p.vx, vz: p.vz }); continue; }
      done = true;
    } else { p.x = nx; p.z = nz; p.travelled += p.speed * DT; if (p.travelled >= p.range) done = true; }
    if (p.hostile) {
      for (const f of w.fields) if (f.ward && near(p, f.x, f.z, f.r)) done = true;
      for (const h of w.heroes) {
        if (h.dead || h.left) continue;
        if (near(h, p.x, p.z, p.width + 0.4)) {
          w.hooks.hitHero(w, h, p.dmg, { m: p.m, name: p.m?.name, level: p.m?.level, blindable: true });
          if (p.status === 'poison') { h.poisonT = 3; }
          done = true; break;
        }
      }
      for (const a of w.allies) if (!a.turret && !a.dead && near(a, p.x, p.z, p.width + 0.3)) { a.hp -= p.dmg; done = true; }
    } else {
      for (const m of w.active) {
        if (m.dead || p.hit.has(m.id)) continue;
        if (near(m, p.x, p.z, p.width + m.r)) {
          p.hit.add(m.id);
          const c = { ...p.c, x: p.x, z: p.z, ox: p.x - p.vx * 0.05, oz: p.z - p.vz * 0.05, ax: p.vx / p.speed, az: p.vz / p.speed };
          heroHit(w, c, m, p.op.dmg, p.op);
          if (p.op.burst) { for (const o of [...w.active]) if (o !== m && !o.dead && near(o, p.x, p.z, p.op.burst + o.r)) heroHit(w, c, o, p.op.dmg * 0.6, { ...p.op, burst: 0, chain: null }); VFX(w, 'burst_grave', p.x, p.z, p.op.burst); }
          if (p.pierce <= 0) { done = true; break; }
          p.pierce--;
        }
      }
      for (const pr of w.props) if (pr.hp > 0 && !pr.broken && near(pr, p.x, p.z, 0.8)) { w.hooks.breakProp(w, pr, p.c.hero, p.x, p.z); if (!p.pierce) done = true; }
    }
    if (done) { w.projectiles.splice(i, 1); emit(w, { t: 'projend', id: p.id, x: p.x, z: p.z, look: p.look }); }
  }
}
const walkableOrPit = (w, x, z) => { const nav = w.zone.nav; const col = nav.col(x); const row = nav.row(z); if (row < 0 || col < 0 || row >= w.zone.h || col >= w.zone.w) return false; const ch = w.zone.rows[row][col]; if (ch === '#' || ch === ' ') return false; return true; };

export function stepFields(w) {
  for (let i = w.fields.length - 1; i >= 0; i--) {
    const f = w.fields[i]; f.t -= DT;
    if (f.follow) { f.x = f.follow.x; f.z = f.follow.z; }
    f.tickT -= DT;
    if (f.tickT <= 0) {
      f.tickT = f.tick; const op = f.op;
      if (f.hostile) {
        for (const h of w.heroes) if (!h.dead && !h.left && near(h, f.x, f.z, f.r)) { w.hooks.hitHero(w, h, f.dmg, { pure: false, level: f.level, name: f.name }); if (f.slow) { h.slowT = 1; h.slowV = f.slow; } }
      } else {
        if (op.dmg) for (const m of [...w.active]) if (!m.dead && near(m, f.x, f.z, f.r + m.r)) heroHit(w, { ...f.c, x: f.x, z: f.z, ox: f.x, oz: f.z }, m, op.dmg * (f.tick / 0.5), { element: op.element, noRes: true, noBurn: op.look !== 'fire' });
        if (op.curse || f.slow || f.pull) for (const m of w.active) if (!m.dead && near(m, f.x, f.z, f.r + m.r)) {
          if (op.curse) { m.status.curse = { v: op.curse, t: 0.7, by: f.owner, tithe: op.tithe }; }
          if (f.slow) applyStatus(w, m, 'slow', { v: f.slow, t: 0.7 });
          if (f.pull && !m.static) { const dx = f.x - m.x; const dz = f.z - m.z; const d = Math.hypot(dx, dz) || 1; moveCircle(w, m, (dx / d) * f.pull * f.tick * 0.5, (dz / d) * f.pull * f.tick * 0.5, m.r * 0.6); }
        }
        if (f.ally?.heal) for (const h of w.heroes) if (near(h, f.x, f.z, f.r)) healHero(w, h, f.ally.heal * f.tick);
      }
    }
    if (f.t <= 0) { w.fields.splice(i, 1); emit(w, { t: 'fieldend', id: f.id }); }
  }
  for (let i = w.obstacles.length - 1; i >= 0; i--) { const o = w.obstacles[i]; o.t -= DT; if (o.t <= 0) { w.obstacles.splice(i, 1); emit(w, { t: 'obstacleend', id: o.id }); } }
}
export const CLASS_INFO = CLASSES;
export { F };
export function spawnFloating() {}
