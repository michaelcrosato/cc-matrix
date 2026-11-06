// Monster AI: per-archetype state machines driven by data in src/data/monsters.js.
import { MONSTERS } from '../data/monsters.js';
import { DT, ev, nid, moveBy, walkable, monstersNear, livingHeroes, spawnMonster, dealToMonster, killMonster, rebuildHash, dropGold, stun, snapToFloor, heal } from './core.js';
import { hurtHero } from './hero.js';
import { NavGrid } from '../../pixel-engine.js';

const out = [0, 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function nearestTarget(w, m) {
  let best = null, bd = 1e9;
  // taunt zones and decoys
  for (const a of w.areas) if ((a.kind === 'decoy' || (a.kind === 'zone' && a.taunt)) && a.t > 0) { const d = Math.hypot(a.x - m.x, a.z - m.z); if (d < 14 && d < bd) { bd = d; best = { x: a.x, z: a.z, id: -a.id, decoy: true, r: 0.5 }; } }
  for (const h of livingHeroes(w)) {
    if (h.invisible || (h.veilT && h.veilT > w.t)) continue;
    if (h.devFlags && h.devFlags.invisible) continue;
    const d = Math.hypot(h.x - m.x, h.z - m.z);
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}
export function steer(w, m, tx, tz, speed, slowMult = 1) {
  // direct when the way is clear and near; otherwise follow the flow field, aiming at the next cell's centre
  const nav = w.zone.nav;
  let dx = tx - m.x, dz = tz - m.z;
  const d = Math.hypot(dx, dz) || 1;
  const direct = d < 9 && nav.lineOfSight(m.x, m.z, tx, tz, m.r + 0.25);
  if (!direct) {
    const nv = w.navs[0] || nav;
    nv.flowTo(tx, tz);
    if (nv.flowDirection(m.x, m.z, out)) {
      const nx = Math.floor(m.x) + 0.5 + Math.round(out[0]), nz = Math.floor(m.z) + 0.5 + Math.round(out[1]);
      const ax = nx - m.x, az = nz - m.z, l = Math.hypot(ax, az);
      if (l > 0.12) { dx = ax / l; dz = az / l; } else { dx = out[0]; dz = out[1]; }
    } else { dx /= d; dz /= d; }
  } else { dx /= d; dz /= d; }
  m.facing = Math.atan2(dx, dz);
  const sp = speed * slowMult * (m.status.slow ? 0.6 : 1);
  moveBy(w, m, dx * sp * DT, dz * sp * DT, m.r * 0.7);
  m.moving = true;
}
function separate(w, m) {
  if (m.static) return;
  for (const o of monstersNear(w, m.x, m.z, m.r + 0.4)) {
    if (o === m || o.dead || o.static) continue;
    const dx = m.x - o.x, dz = m.z - o.z, d = Math.hypot(dx, dz) || 0.01; const need = m.r + o.r;
    if (d < need) { const k = (need - d) * 0.25; moveBy(w, m, (dx / d) * k, (dz / d) * k, m.r * 0.8); }
  }
}
export function monsterHurt(w, m, h, pct, ang) {
  return hurtHero(w, h, m.hit * pct, m, m);
}
function tele(w, m, kind, o) { ev(w, { t: 'tele', kind, x: m.x, z: m.z, mid: m.id, ...o }); }

function hostileShot(w, m, h, dmgPct, speed = 9) {
  const dx = h.x - m.x, dz = h.z - m.z, d = Math.hypot(dx, dz) || 1;
  w.shots.push({ id: nid(w), x: m.x, z: m.z, vx: dx / d, vz: dz / d, speed, range: 20, life: 2.5, r: 0.4, team: 'monster', hitAmt: m.hit * dmgPct, src: m, hit: new Set(), vfx: 'note_bad', el: 'grave' });
  ev(w, { t: 'sfx', name: 'sour_note', x: m.x, z: m.z });
}

export function stepMonsters(w) {
  rebuildHash(w);
  w.recentDead = w.recentDead || [];
  for (const m of w.monsters) {
    if (m.dead) continue;
    stepMonster(w, m);
  }
  // remove dead (kept one tick for events)
  if (w.monsters.some((m) => m.dead)) w.monsters = w.monsters.filter((m) => !m.dead);
}

function statusTickM(w, m) {
  if (m.flash > 0) m.flash--;
  for (const k of Object.keys(m.status)) {
    const s = m.status[k]; if (!s) { delete m.status[k]; continue; }
    if (typeof s.t === 'number') s.t -= DT;
    if (s.dps) { s.acc += s.dps * DT; if (s.acc >= 0.25) { const src = w.heroes.find((q) => q.id === s.src) || livingHeroes(w)[0]; const base = src && src.stats ? src.stats.weaponDps * (1 + src.stats.power / 100) * w.tuning.playerDamage : 10; const amt = Math.max(1, Math.round(base * s.acc * (k === 'burn' && src && src.stats.sets.last_lamplighter >= 2 ? 1.3 : 1))); s.acc = 0; dealToMonster(w, src, m, amt, { el: k === 'burn' ? 'flame' : 'grave' }); if (m.dead) return; } }
    if (s.t <= 0) { delete m.status[k]; if (k === 'burn' && m.relightAt && m.relightAt > w.t) { /* relight */ } }
  }
  if (m.relightAt && w.t >= m.relightAt) { m.relightAt = 0; m.status.burn = { t: 3, dps: 0.3, src: 0, acc: 0 }; }
  if (m.kx || m.kz) { moveBy(w, m, m.kx * DT, m.kz * DT, m.r * 0.7); m.kx *= 0.85; m.kz *= 0.85; if (Math.abs(m.kx) < 0.05) m.kx = 0; if (Math.abs(m.kz) < 0.05) m.kz = 0; }
  if (m.rootT > 0) m.rootT -= DT;
  if (m.ttl) { m.ttl -= DT; if (m.ttl <= 0) { m.dead = true; ev(w, { t: 'kill', id: m.id, x: m.x, z: m.z, type: m.type, minion: true }); } }
}

function stepMonster(w, m) {
  if (m.prop) { if (m.flash > 0) m.flash--; if (m.kx || m.kz) { m.kx = m.kz = 0; } return; }
  m.moving = false;
  statusTickM(w, m);
  if (m.dead) return;
  if (m.stunT > 0) { m.stunT -= DT; return; }
  if (m.team === 'hero') return stepMinion(w, m);
  const d = MONSTERS[m.type];
  const tgt = nearestTarget(w, m);
  if (!tgt) return;
  const dt = dist(m, tgt);
  if (m.state === 'dormant') {
    if (dt < 13 && w.zone.nav.lineOfSight(m.x, m.z, tgt.x, tgt.z)) { m.state = 'aggro'; if (m.pack) for (const o of w.monsters) if (o.pack === m.pack && o.state === 'dormant') o.state = 'aggro'; ev(w, { t: 'wake', id: m.id, type: m.type, x: m.x, z: m.z }); }
    else if (dt < 7) { m.state = 'aggro'; }
    if (m.state === 'dormant') return;
  }
  if (m.blindT && m.blindT > w.t && m.state !== 'wind') { // blind: wander
    m.facing += 0.1; moveBy(w, m, Math.sin(m.facing) * m.speed * 0.5 * DT, Math.cos(m.facing) * m.speed * 0.5 * DT, m.r * 0.7); return;
  }
  if (m.rootT > 0) { if (m.state === 'wind') { /* may still attack */ } else return; }
  m.atkCd -= DT;
  const slowS = (w.slowAll || 1);
  if (m.aff.length) tickAfflictions(w, m, tgt);
  switch (d.kind) {
    case 'melee': case 'lunger': meleeAI(w, m, d, tgt, dt); break;
    case 'slammer': slammerAI(w, m, d, tgt, dt); break;
    case 'caster': casterAI(w, m, d, tgt, dt); break;
    case 'bloat': bloatAI(w, m, d, tgt, dt); break;
    case 'hooker': hookerAI(w, m, d, tgt, dt); break;
    case 'blinker': blinkerAI(w, m, d, tgt, dt); break;
    case 'charger': chargerAI(w, m, d, tgt, dt); break;
    case 'swooper': swooperAI(w, m, d, tgt, dt); break;
    case 'raiser': raiserAI(w, m, d, tgt, dt); break;
    case 'plate': plateAI(w, m, d, tgt, dt); break;
    case 'nest': nestAI(w, m, d, tgt, dt); break;
    default: break;
  }
  if (m.boss && w.bossHooks && d.kind !== 'nest') w.bossHooks.tick(w, m, tgt, DT);
  if (!m.static) {
    // a monster jammed in a crowd for a moment passes through its neighbours instead of deadlocking at a doorway
    if (m.moving && w.t - (m.jt || 0) > 0.7) { if (Math.hypot(m.x - (m.jx ?? m.x), m.z - (m.jz ?? m.z)) < 0.15) m.ghostT = w.t + 1.2; m.jx = m.x; m.jz = m.z; m.jt = w.t; }
    if (!(m.ghostT > w.t)) separate(w, m);
  }
}

function spd(m) { return m.speed * (m.aff.includes('haste') ? 1.4 : 1) * (m.status.slow ? 0.6 : 1); }

function meleeAI(w, m, d, tgt, dt) {
  if (m.state === 'aggro') {
    if (dt <= d.reach) { m.state = 'wind'; m.t = d.wind * (m.aff.includes('haste') ? 0.7 : 1); m.facing = Math.atan2(tgt.x - m.x, tgt.z - m.z); ev(w, { t: 'mattack', id: m.id, type: m.type, x: m.x, z: m.z, wind: m.t }); }
    else steer(w, m, tgt.x, tgt.z, spd(m));
  } else if (m.state === 'wind') {
    m.t -= DT;
    if (d.kind === 'lunger' && m.t < d.wind * 0.5) moveBy(w, m, Math.sin(m.facing) * 7 * DT, Math.cos(m.facing) * 7 * DT, m.r * 0.7);
    if (m.t <= 0) {
      if (tgt.stats) { for (const h of livingHeroes(w)) if (dist(m, h) <= d.reach + 0.5 + (d.kind === 'lunger' ? 1.2 : 0)) monsterHurt(w, m, h, 1.0); } else if (tgt.decoy) { /* hits the decoy: nothing */ }
      m.state = 'recover'; m.t = 0.5;
    }
  } else if (m.state === 'recover') { m.t -= DT; if (m.t <= 0) m.state = 'aggro'; }
}
function slammerAI(w, m, d, tgt, dt) {
  if (m.state === 'aggro') {
    if (dt <= d.reach + 0.5) { m.state = 'wind'; m.t = d.wind; m.slamAt = { x: m.x, z: m.z }; tele(w, m, 'ring', { r: d.reach + 0.8, time: d.wind, x: m.x, z: m.z }); ev(w, { t: 'mattack', id: m.id, type: m.type, x: m.x, z: m.z, wind: m.t, big: true }); }
    else steer(w, m, tgt.x, tgt.z, spd(m));
  } else if (m.state === 'wind') {
    m.t -= DT;
    if (m.t <= 0) {
      for (const h of livingHeroes(w)) if (Math.hypot(h.x - m.slamAt.x, h.z - m.slamAt.z) <= d.reach + 0.8) monsterHurt(w, m, h, 1.5);
      ev(w, { t: 'fx', name: 'ring_phys', x: m.slamAt.x, z: m.slamAt.z, r: d.reach + 0.8 }); ev(w, { t: 'shake', amt: 0.25 }); ev(w, { t: 'sfx', name: 'slam', x: m.x, z: m.z });
      m.state = 'recover'; m.t = 0.9;
    }
  } else if (m.state === 'recover') { m.t -= DT; if (m.t <= 0) m.state = 'aggro'; }
}
function casterAI(w, m, d, tgt, dt) {
  const hasLos = w.zone.nav.lineOfSight(m.x, m.z, tgt.x, tgt.z);
  if (m.state === 'aggro') {
    if (dt < d.keep - 2) { const dx = m.x - tgt.x, dz = m.z - tgt.z, l = Math.hypot(dx, dz) || 1; moveBy(w, m, (dx / l) * spd(m) * DT, (dz / l) * spd(m) * DT, m.r * 0.7); m.facing = Math.atan2(-dx, -dz); }
    else if (dt > d.range || !hasLos) steer(w, m, tgt.x, tgt.z, spd(m));
    if (dt <= d.range && hasLos && m.atkCd <= 0) { m.state = 'wind'; m.t = d.wind; tele(w, m, 'dot', { r: 0.8, time: d.wind }); }
  } else if (m.state === 'wind') { m.t -= DT; m.facing = Math.atan2(tgt.x - m.x, tgt.z - m.z); if (m.t <= 0) { if (tgt.stats) hostileShot(w, m, tgt, 1.0); m.atkCd = 2.2; m.state = 'aggro'; } }
}
function bloatAI(w, m, d, tgt, dt) {
  if (m.state === 'aggro') {
    if (dt <= 2.5) { m.state = 'wind'; m.t = d.wind; ev(w, { t: 'swell', id: m.id }); tele(w, m, 'ring', { r: 4, time: d.wind }); }
    else steer(w, m, tgt.x, tgt.z, spd(m));
  } else if (m.state === 'wind') {
    m.t -= DT;
    if (m.t <= 0) { for (const h of livingHeroes(w)) if (dist(m, h) <= 4) monsterHurt(w, m, h, 1.0); ev(w, { t: 'fx', name: 'ring_grave', x: m.x, z: m.z, r: 4 }); ev(w, { t: 'sfx', name: 'burst', x: m.x, z: m.z }); killMonster(w, m, null, 0, {}); }
  }
}
function hookerAI(w, m, d, tgt, dt) {
  if (m.state === 'aggro') {
    const los = w.zone.nav.lineOfSight(m.x, m.z, tgt.x, tgt.z);
    if (dt < 3) { const dx = m.x - tgt.x, dz = m.z - tgt.z, l = Math.hypot(dx, dz) || 1; moveBy(w, m, (dx / l) * spd(m) * DT, (dz / l) * spd(m) * DT, m.r * 0.7); }
    else if (dt > d.range || !los) steer(w, m, tgt.x, tgt.z, spd(m));
    if (tgt.stats && dt <= d.range && dt > 3 && los && m.atkCd <= 0) { m.state = 'wind'; m.t = d.wind; m.hookTo = { x: tgt.x, z: tgt.z }; tele(w, m, 'line', { x2: tgt.x, z2: tgt.z, time: d.wind, w: 0.5 }); }
  } else if (m.state === 'wind') {
    m.t -= DT;
    if (m.t <= 0) {
      for (const h of livingHeroes(w)) {
        // hit if near the hook line
        const dx = m.hookTo.x - m.x, dz = m.hookTo.z - m.z, L = Math.hypot(dx, dz) || 1; const px = (h.x - m.x) * dx / L + (h.z - m.z) * dz / L; const qx = Math.abs((h.x - m.x) * -dz / L + (h.z - m.z) * dx / L);
        if (px > 0 && px < L + 2 && qx < 0.9) {
          const nx = m.x + (h.x - m.x) * 0.15, nz = m.z + (h.z - m.z) * 0.15; h.x = nx; h.z = nz; snapToFloor(w, h);
          monsterHurt(w, m, h, 0.8); const steal = Math.floor(h.gold * 0.05); if (steal > 0) { h.gold -= steal; m.extra.gold = (m.extra.gold || 0) + steal; m.extra.onDeath = (ww, mm) => { dropGold(ww, mm.x, mm.z, mm.extra.gold, h.seat); }; ev(w, { t: 'toast', seat: h.seat, text: 'GOLD STOLEN' }); }
          ev(w, { t: 'fx', name: 'arc_line', x: m.x, z: m.z, x2: h.x, z2: h.z, el: 'phys' });
        }
      }
      m.atkCd = 4; m.state = 'aggro';
    }
  }
}
function blinkerAI(w, m, d, tgt, dt) {
  if (m.state === 'aggro') {
    if (dt > 6 && m.atkCd <= 0) { // blink in
      const a = (tgt.facing || 0) + Math.PI + w.rng.range(-0.6, 0.6); const nx = tgt.x + Math.sin(a) * 1.4, nz = tgt.z + Math.cos(a) * 1.4;
      if (walkable(w, nx, nz, 0.3)) { ev(w, { t: 'fx', name: 'puff_grave', x: m.x, z: m.z, r: 1 }); m.x = nx; m.z = nz; ev(w, { t: 'fx', name: 'puff_grave', x: m.x, z: m.z, r: 1 }); m.atkCd = 3; }
    }
    if (dt <= d.reach) { m.state = 'wind'; m.t = d.wind; m.combo = 0; }
    else steer(w, m, tgt.x, tgt.z, spd(m));
  } else if (m.state === 'wind') {
    m.t -= DT; m.facing = Math.atan2(tgt.x - m.x, tgt.z - m.z);
    if (m.t <= 0) {
      for (const h of livingHeroes(w)) if (dist(m, h) <= d.reach + 0.6) monsterHurt(w, m, h, 0.7);
      m.combo++; if (m.combo >= 3) { m.state = 'recover'; m.t = 0.7; } else m.t = 0.35;
    }
  } else if (m.state === 'recover') { m.t -= DT; if (m.t <= 0) { m.state = 'aggro'; m.atkCd = 1; } }
}
function chargerAI(w, m, d, tgt, dt) {
  if (m.state === 'aggro') {
    if (dt < 11 && dt > 3 && m.atkCd <= 0 && w.zone.nav.lineOfSight(m.x, m.z, tgt.x, tgt.z)) {
      m.state = 'wind'; m.t = d.wind; m.chargeDir = [(tgt.x - m.x) / dt, (tgt.z - m.z) / dt]; m.facing = Math.atan2(m.chargeDir[0], m.chargeDir[1]);
      tele(w, m, 'line', { x2: m.x + m.chargeDir[0] * 10, z2: m.z + m.chargeDir[1] * 10, time: d.wind, w: 1.6 }); ev(w, { t: 'sfx', name: 'roar', x: m.x, z: m.z });
    } else if (dt <= d.reach) { m.state = 'wind2'; m.t = 0.5; tele(w, m, 'ring', { r: d.reach, time: 0.5 }); }
    else steer(w, m, tgt.x, tgt.z, spd(m));
  } else if (m.state === 'wind2') { m.t -= DT; if (m.t <= 0) { for (const h of livingHeroes(w)) if (dist(m, h) <= d.reach + 0.3) monsterHurt(w, m, h, 1.0); m.state = 'recover'; m.t = 0.8; } }
  else if (m.state === 'wind') { m.t -= DT; if (m.t <= 0) { m.state = 'charge'; m.t = 1.4; m.hitSet = new Set(); } }
  else if (m.state === 'charge') {
    m.t -= DT;
    const nx = m.x + m.chargeDir[0] * 7 * DT, nz = m.z + m.chargeDir[1] * 7 * DT;
    if (!walkable(w, nx, nz, m.r * 0.7)) { m.state = 'stunned'; m.t = 1.6; ev(w, { t: 'shake', amt: 0.3 }); ev(w, { t: 'fx', name: 'ring_phys', x: m.x, z: m.z, r: 2 }); }
    else { m.x = nx; m.z = nz; for (const h of livingHeroes(w)) if (!m.hitSet.has(h.id) && dist(m, h) < m.r + 0.5) { m.hitSet.add(h.id); monsterHurt(w, m, h, 1.6); } }
    if (m.t <= 0 && m.state === 'charge') { m.state = 'recover'; m.t = 0.8; }
  } else if (m.state === 'stunned' || m.state === 'recover') { m.t -= DT; if (m.t <= 0) { m.state = 'aggro'; m.atkCd = 3.5; } }
}
function swooperAI(w, m, d, tgt, dt) {
  if (m.state === 'aggro') {
    if (dt < 10 && m.atkCd <= 0) { m.state = 'wind'; m.t = 0.6; m.dive = [(tgt.x - m.x) / dt, (tgt.z - m.z) / dt]; tele(w, m, 'line', { x2: tgt.x + m.dive[0] * 4, z2: tgt.z + m.dive[1] * 4, time: 0.6, w: 1 }); }
    else steer(w, m, tgt.x, tgt.z, spd(m) * 0.8);
  } else if (m.state === 'wind') { m.t -= DT; if (m.t <= 0) { m.state = 'dive'; m.t = 0.7; m.hitSet = new Set(); } }
  else if (m.state === 'dive') {
    m.t -= DT; const nx = m.x + m.dive[0] * 10 * DT, nz = m.z + m.dive[1] * 10 * DT; m.facing = Math.atan2(m.dive[0], m.dive[1]);
    if (walkable(w, nx, nz, 0.2)) { m.x = nx; m.z = nz; }
    for (const h of livingHeroes(w)) if (!m.hitSet.has(h.id) && dist(m, h) < 1.1) { m.hitSet.add(h.id); monsterHurt(w, m, h, 1.0); }
    if (m.t <= 0) { m.state = 'aggro'; m.atkCd = 2.5; }
  }
}
function raiserAI(w, m, d, tgt, dt) {
  if (dt < d.keep - 2) { const dx = m.x - tgt.x, dz = m.z - tgt.z, l = Math.hypot(dx, dz) || 1; moveBy(w, m, (dx / l) * spd(m) * DT, (dz / l) * spd(m) * DT, m.r * 0.7); }
  else if (dt > d.range + 3) steer(w, m, tgt.x, tgt.z, spd(m));
  m.nextSpawn -= DT;
  if (m.nextSpawn <= 0) {
    m.nextSpawn = 5;
    const rd = (w.recentDead || []).filter((p) => Math.hypot(p.x - m.x, p.z - m.z) < 14).pop();
    const risen = w.monsters.filter((o) => o.raisedBy === m.id && !o.dead).length;
    if (rd && risen < 4) { const r = spawnMonster(w, 'rattlebones', rd.x, rd.z, { dormant: false, level: m.level, noDrop: false, pack: m.pack }); r.raisedBy = m.id; w.recentDead = w.recentDead.filter((p) => p !== rd); ev(w, { t: 'fx', name: 'ring_grave', x: rd.x, z: rd.z, r: 1.5 }); }
  }
}
function plateAI(w, m, d, tgt, dt) {
  m.fleeT = (m.fleeT || 0) + DT;
  const dx = m.x - tgt.x, dz = m.z - tgt.z, l = Math.hypot(dx, dz) || 1;
  let fx = dx / l, fz = dz / l;
  // slide along walls: try the flee direction, else perpendicular
  const sp = spd(m) * DT;
  const tries = [[fx, fz], [-fz, fx], [fz, -fx], [-fx, -fz]];
  for (const [ax, az] of tries) if (walkable(w, m.x + ax * sp * 3, m.z + az * sp * 3, m.r * 0.7)) { m.x += ax * sp; m.z += az * sp; m.facing = Math.atan2(ax, az); break; }
  m.moving = true;
  m.spill = (m.spill || 0) + DT;
  if (m.spill > 0.8) { m.spill = 0; for (const h of livingHeroes(w)) dropGold(w, m.x, m.z, (2 + m.level * 1.2) * 4 * w.tuning.goldRate, h.seat); ev(w, { t: 'sfx', name: 'coin_spray', x: m.x, z: m.z }); }
  if (m.fleeT > 12) { m.dead = true; ev(w, { t: 'plateEscape', x: m.x, z: m.z, id: m.id }); ev(w, { t: 'banner', text: 'THE PLATE ESCAPED', small: true }); }
}
function nestAI(w, m, d, tgt, dt) {
  m.nextSpawn -= DT;
  if (dt < 18 && m.nextSpawn <= 0) {
    const kids = w.monsters.filter((o) => o.nestId === m.id && !o.dead).length;
    m.nextSpawn = 3.5;
    if (kids < 5) {
      const a = w.rng.range(0, 6.28); const k = spawnMonster(w, d.spawn, m.x + Math.cos(a) * 1.2, m.z + Math.sin(a) * 1.2, { dormant: false, level: m.level }); k.nestId = m.id; k.xpMult = 0.5;
      ev(w, { t: 'fx', name: 'puff_grave', x: k.x, z: k.z, r: 0.8 });
    }
  }
}

function stepMinion(w, m) {
  const owner = w.heroes.find((h) => h.seat === m.owner && h.alive) || w.heroes.find((h) => h.alive);
  if (!owner) return;
  const d = MONSTERS[m.type];
  let tgt = null, bd = 14;
  for (const o of monstersNear(w, owner.x, owner.z, 16)) { if (o.dead || (o.team && o.team !== 'monster') || o.state === 'dormant' && dist(o, owner) > 10) continue; const dd = dist(o, m); if (dd < bd) { bd = dd; tgt = o; } }
  m.atkCd -= DT;
  if (tgt) {
    const dt = dist(m, tgt);
    if (dt <= d.reach + tgt.r * 0.5) {
      m.facing = Math.atan2(tgt.x - m.x, tgt.z - m.z);
      if (m.atkCd <= 0) {
        m.atkCd = m.type === 'brute' ? 1.4 : 0.8;
        dealToMonster(w, null, tgt, Math.max(1, Math.round(m.hit)), { el: 'grave', knock: m.type === 'brute' ? 1.5 : 0.3, fromX: m.x, fromZ: m.z });
        ev(w, { t: 'mattack', id: m.id, type: m.type, x: m.x, z: m.z, wind: 0.1 });
        if (m.type === 'brute') ev(w, { t: 'fx', name: 'ring_phys', x: m.x, z: m.z, r: 2 });
        const ow = w.heroes.find((h) => h.id === m.ownerId); if (ow && ow.stats.vowCare) heal(w, ow, ow.maxHp * 0.01, true);
      }
    } else steer(w, m, tgt.x, tgt.z, m.speed);
  } else {
    const dd = dist(m, owner);
    if (dd > 3.5) steer(w, m, owner.x, owner.z, m.speed * (dd > 10 ? 1.6 : 1));
    if (dd > 25) { m.x = owner.x + 1; m.z = owner.z + 1; snapToFloor(w, m); }
  }
  separate(w, m);
  // monsters hit minions
  for (const o of monstersNear(w, m.x, m.z, m.r + 1.2)) {
    if (o.dead || (o.team && o.team !== 'monster') || o.state !== 'wind' || o.t > 0.1 || o.t < -0.05) continue;
    m.hp -= o.hit * 0.8; m.flash = 2;
  }
  if (m.hp <= 0) {
    m.dead = true; ev(w, { t: 'kill', id: m.id, x: m.x, z: m.z, type: m.type, minion: true });
    if (m.explode) for (const o of monstersNear(w, m.x, m.z, 3)) if (!o.team || o.team === 'monster') dealToMonster(w, null, o, Math.round(m.hit * m.explode * 2), { el: 'grave' });
    if (m.explode) ev(w, { t: 'fx', name: 'puff_grave', x: m.x, z: m.z, r: 3 });
  }
}

// ------- elite afflictions -------
function tickAfflictions(w, m, tgt) {
  const ex = m.extra;
  const now = w.t;
  if (!m.rare && !m.elite) return;
  for (const a of m.aff) {
    switch (a) {
      case 'tolling':
        if (m.leader && now - (ex.toll || 0) > 5) { ex.toll = now; w.areas.push({ id: nid(w), kind: 'hostile_ring', x: m.x, z: m.z, r0: 1, r1: 8, t: 1.4, dur: 1.4, dmg: 0.8, src: m }); ev(w, { t: 'tele', kind: 'ring', x: m.x, z: m.z, r: 8, time: 1.4 }); }
        break;
      case 'smouldering':
        if (now - (ex.smould || 0) > 1.2) { ex.smould = now; w.areas.push({ id: nid(w), kind: 'hostile_fire', x: m.x, z: m.z, r: 1.3, t: 3, dps: 0.35, src: m }); }
        break;
      case 'shackled':
        if (m.leader && tgt.stats && now - (ex.shackle || 0) > 8 && dist(m, tgt) < 12) { ex.shackle = now; ev(w, { t: 'tele', kind: 'line', x: m.x, z: m.z, x2: tgt.x, z2: tgt.z, time: 1.0, w: 0.6 }); w.areas.push({ id: nid(w), kind: 'timer_hostile', t: 1.0, fx: 'shackle', tx: tgt.x, tz: tgt.z, sx: m.x, sz: m.z, src: m }); }
        break;
      case 'entombing':
        if (m.leader && tgt.stats && now - (ex.entomb || 0) > 9 && dist(m, tgt) < 12) { ex.entomb = now; ev(w, { t: 'tele', kind: 'ring', x: tgt.x, z: tgt.z, r: 3, time: 1.0 }); w.areas.push({ id: nid(w), kind: 'timer_hostile', t: 1.0, fx: 'entomb', tx: tgt.x, tz: tgt.z, src: m }); }
        break;
      case 'vigil_lamps':
        if (m.leader && !ex.lamps) { ex.lamps = true; w.areas.push({ id: nid(w), kind: 'beams', x: m.x, z: m.z, follow: m.id, t: 1e9, ang: w.rng.range(0, 6.28), src: m }); }
        break;
      case 'plagued':
        if (tgt.stats && now - (ex.plague || 0) > 4 && dist(m, tgt) < 14) { ex.plague = now; ev(w, { t: 'tele', kind: 'ring', x: tgt.x, z: tgt.z, r: 2, time: 0.9 }); w.areas.push({ id: nid(w), kind: 'timer_hostile', t: 0.9, fx: 'poison', tx: tgt.x, tz: tgt.z, src: m }); }
        break;
      default: break;
    }
  }
}
