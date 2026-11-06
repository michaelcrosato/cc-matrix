// Boss fights: The Bursar, Bishop Ambrose, Malison and the Knell Wardens. Each is a small state machine
// that composes hostile areas (telegraph, then blast), adds and phases. Hooks are installed on the world.
import { MONSTERS } from '../data/monsters.js';
import { TAUNTS } from '../data/quests.js';
import { DT, ev, nid, livingHeroes, spawnMonster, dropGold, dealToMonster, killMonster, monsterLevel, monstersNear, heal, giveXp, dropItem, walkable, snapToFloor } from './core.js';
import { steer } from './monsters.js';
import { hurtHero } from './hero.js';
import { makeItem, rollDrop } from './items.js';
import { LEGENDARIES, SETS, SET_OF_CLASS } from '../data/items.js';

const say = (w, who, text) => ev(w, { t: 'subtitle', who, text });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function blast(w, src, x, z, r, tele, dmg, o = {}) {
  ev(w, { t: 'tele', kind: 'ring', x, z, r, time: tele });
  w.areas.push({ id: nid(w), kind: 'hostile_blast', x, z, r, t: tele, dmg, src, vfx: o.vfx, shake: o.shake, sfx: o.sfx });
}
export function lineStrike(w, src, x, z, x2, z2, width, tele, dmg) {
  ev(w, { t: 'tele', kind: 'line', x, z, x2, z2, time: tele, w: width });
  w.areas.push({ id: nid(w), kind: 'hostile_line', x, z, x2, z2, w: width, t: tele, dmg, src });
}
export function installBossHooks(w) {
  w.bossHooks = { tick: bossTick, onBossDying, onBossDead };
}
export function startBoss(w, id, x, z) {
  installBossHooks(w);
  const type = id === 'warden' ? w.knell.wardenType : id;
  const lvl = monsterLevel(w);
  const m = spawnMonster(w, type, x, z, { dormant: true, level: lvl, boss: id, hpMult2: w.knellBossHp || 1 });
  m.bossBar = true; m.state = 'dormant'; m.extra = { phase: 1, cd: 3, cd2: 6, cd3: 12, round: 1, started: false, pillars: [] };
  m.stunImmune = true; m.name = MONSTERS[type].name;
  if (id === 'bursar') { m.phaseTicks = [0.3]; m.name = 'The Bursar'; }
  if (id === 'ambrose') { m.phaseTicks = [0.33, 0.66]; }
  if (id === 'malison') { m.phaseTicks = [0.25, 0.6]; m.hover = true; }
  if (id === 'warden') m.phaseTicks = [0.5];
  w.boss = m;
  return m;
}
function begin(w, m) {
  m.extra.started = true; m.state = 'aggro'; w.flags.bossActive = m.boss;
  ev(w, { t: 'bossStart', boss: m.boss, id: m.id, name: m.name });
  ev(w, { t: 'sfx', name: m.boss === 'malison' ? 'bell_cracked' : 'roar' });
  const T = TAUNTS[m.boss]; if (T && T.enter) say(w, m.boss, T.enter);
  m.invuln = w.t + 0.5;
}
function bossTick(w, m, tgt, dt) {
  const B = m.extra;
  if (!B.started) { if (dist(m, tgt) < 13 || m.hp < m.maxHp) begin(w, m); else return; }
  B.cd -= dt; B.cd2 -= dt; B.cd3 -= dt;
  const f = m.hp / m.maxHp;
  switch (m.boss) {
    case 'bursar': bursar(w, m, tgt, B, f); break;
    case 'ambrose': ambrose(w, m, tgt, B, f); break;
    case 'malison': malison(w, m, tgt, B, f); break;
    case 'warden': warden(w, m, tgt, B, f); break;
    default: break;
  }
}
const nearHeroes = (w, m, r = 40) => livingHeroes(w).filter((h) => dist(h, m) < r);

function bursar(w, m, tgt, B, f) {
  if (dist(m, tgt) > 3) steer(w, m, tgt.x, tgt.z, m.speed);
  if (B.cd <= 0) {
    B.cd = f < 0.3 ? 3.2 : 4.5; B.k = (B.k || 0) + 1;
    const kind = B.k % 3;
    if (kind === 1) { for (const h of nearHeroes(w, m)) blast(w, m, h.x, h.z, 5, 2.0, 2.0); ev(w, { t: 'subtitle', who: 'bursar', text: 'AUDIT!' }); }
    else if (kind === 2) { // collections: sweep steals gold
      ev(w, { t: 'tele', kind: 'ring', x: m.x, z: m.z, r: 5, time: 1.0, mid: m.id });
      w.areas.push({ id: nid(w), kind: 'script', t: 1.0, fn: (ww) => { for (const h of livingHeroes(ww)) if (dist(h, m) < 5) { const steal = Math.floor(h.gold * 0.1); h.gold -= steal; hurtHero(ww, h, m.hit * 1.2, m, m); for (let i = 0; i < 4; i++) { const a = ww.rng.range(0, 6.28); { const cn = { id: nid(ww), kind: 'coin', x: m.x + Math.cos(a) * 4, z: m.z + Math.sin(a) * 4, v: Math.max(1, Math.floor(steal / 4)), owner: h.seat, t: 0 }; snapToFloor(ww, cn); ww.drops.push(cn); } } } ev(ww, { t: 'fx', name: 'ring_gold', x: m.x, z: m.z, r: 5, shock: true }); } });
      say(w, 'bursar', TAUNTS.bursar.phase);
    } else { blast(w, m, m.x, m.z, 4.5, 1.2, 1.4); }
  }
  if (B.cd2 <= 0) { B.cd2 = 16; const n = f < 0.5 ? 4 : 3; for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; spawnMonster(w, 'rattlebones', m.x + Math.cos(a) * 4, m.z + Math.sin(a) * 4, { dormant: false, level: m.level, noDrop: true }); } say(w, 'bursar', 'I HAVE YOU DOWN FOR ONE DEATH. I SEE IT WAS NOT COLLECTED.'); }
  if (f < 0.3 && !B.foreclose) { B.foreclose = true; B.ring = 0; B.cd3 = 0; say(w, 'bursar', TAUNTS.bursar.low); ev(w, { t: 'banner', text: 'FORECLOSURE', small: false }); }
  if (B.foreclose && B.cd3 <= 0 && B.ring < 5) {
    B.cd3 = 4.5; B.ring++;
    const cx = w.zone.w / 2, cz = w.zone.h / 2; const R = 11 - B.ring * 1.6;
    for (let a = 0; a < 6.28; a += 0.5) { const x = cx + Math.cos(a) * (R + 3), z = cz + Math.sin(a) * (R + 3) * 0.75; ev(w, { t: 'tele', kind: 'dot', x, z, time: 0.8 }); w.areas.push({ id: nid(w), kind: 'bone_wall', x, z, r: 2.2, t: 1e9, block: true }); }
  }
}
function ambrose(w, m, tgt, B, f) {
  const round = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
  if (round > B.round) {
    B.round = round; m.invuln = w.t + 3.2; B.burying = 3;
    blast(w, m, m.x, m.z, 3, 0.6, 1.5, { vfx: 'ring_grave' }); ev(w, { t: 'fx', name: 'coffin', x: m.x, z: m.z, r: 2.4, dur: 3 });
    say(w, 'ambrose', round === 2 ? TAUNTS.ambrose.r2 : TAUNTS.ambrose.r3);
    m.hidden = true;
    return;
  }
  if (B.burying > 0) {
    B.burying -= DT; if (B.burying <= 0) {
      m.hidden = false; const z = w.zone; const cx = z.w / 2, cz = z.h / 2; const a = w.rng.range(0, 6.28); m.x = cx + Math.cos(a) * 6; m.z = cz + Math.sin(a) * 5; snapToFloor(w, m);
      blast(w, m, m.x, m.z, 3.5, 0.5, 1.6, { vfx: 'ring_grave', shake: 0.4 }); heal(w, m, 0);
      if (round >= 2) for (let i = 0; i < 2; i++) spawnMonster(w, 'penitent', m.x + (i ? 3 : -3), m.z, { dormant: false, level: m.level, noDrop: true });
    }
    return;
  }
  if (dist(m, tgt) > 2.5) steer(w, m, tgt.x, tgt.z, m.speed);
  if (B.cd <= 0) {
    B.cd = 3.2; B.k = (B.k || 0) + 1;
    if (B.k % 2) { // chains: shackle line to the target
      lineStrike(w, m, m.x, m.z, tgt.x, tgt.z, 0.9, 1.0, 1.0); w.areas.push({ id: nid(w), kind: 'timer_hostile', t: 1.0, fx: 'shackle', tx: tgt.x, tz: tgt.z, sx: m.x, sz: m.z, src: m });
    } else blast(w, m, m.x, m.z, 3.2, 0.9, 1.5, { vfx: 'ring_sound' });
  }
  if (round === 3 && B.cd2 <= 0) { B.cd2 = 9; w.areas.push({ id: nid(w), kind: 'hostile_ring', x: m.x, z: m.z, r0: 1, r1: 11, t: 1.8, dur: 1.8, dmg: 1.0, src: m }); ev(w, { t: 'tele', kind: 'ring', x: m.x, z: m.z, r: 11, time: 1.8 }); }
}
function warden(w, m, tgt, B, f) {
  const kind = MONSTERS[m.type].wk; const rage = f < 0.5 ? 1.4 : 1;
  if (kind === 'sexton') {
    if (dist(m, tgt) > 3) steer(w, m, tgt.x, tgt.z, m.speed * rage);
    if (B.cd <= 0) { B.cd = 3.4 / rage; blast(w, m, tgt.x, tgt.z, 3.5, 1.1, 1.3, { vfx: 'ring_grave' }); }
    if (B.cd2 <= 0) { B.cd2 = 9 / rage; for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28; spawnMonster(w, 'rattlebones', m.x + Math.cos(a) * 3, m.z + Math.sin(a) * 3, { dormant: false, level: m.level, noDrop: true }); } }
  } else if (kind === 'chorister') {
    if (dist(m, tgt) < 3.5) { const dx = m.x - tgt.x, dz = m.z - tgt.z, l = Math.hypot(dx, dz) || 1; const nx = m.x + (dx / l) * m.speed * DT, nz = m.z + (dz / l) * m.speed * DT; if (walkable(w, nx, nz, 0.5)) { m.x = nx; m.z = nz; } } else if (dist(m, tgt) > 8) steer(w, m, tgt.x, tgt.z, m.speed);
    if (B.cd <= 0) { B.cd = 4 / rage; w.areas.push({ id: nid(w), kind: 'hostile_ring', x: m.x, z: m.z, r0: 1, r1: 10, t: 1.6, dur: 1.6, dmg: 1.0, src: m }); ev(w, { t: 'tele', kind: 'ring', x: m.x, z: m.z, r: 10, time: 1.6 }); }
    if (B.cd2 <= 0) { B.cd2 = 8 / rage; for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28; spawnMonster(w, 'choir_skull', m.x + Math.cos(a) * 3, m.z + Math.sin(a) * 3, { dormant: false, level: m.level, noDrop: true }); } }
  } else {
    if (B.cd <= 0 && dist(m, tgt) > 3) { B.cd = 5 / rage; const dx = (tgt.x - m.x), dz = (tgt.z - m.z), l = Math.hypot(dx, dz) || 1; lineStrike(w, m, m.x, m.z, m.x + dx / l * 14, m.z + dz / l * 14, 1.4, 1.0, 1.7); m.extra.charge = { dx: dx / l, dz: dz / l, t: 1.0, go: 0.6 }; }
    if (B.charge) { B.charge.t -= DT; if (B.charge.t <= 0) { B.charge.go -= DT; const nx = m.x + B.charge.dx * 12 * DT, nz = m.z + B.charge.dz * 12 * DT; if (walkable(w, nx, nz, 1)) { m.x = nx; m.z = nz; } else B.charge = null; if (B.charge && B.charge.go <= 0) B.charge = null; } }
    else if (dist(m, tgt) > 3) steer(w, m, tgt.x, tgt.z, m.speed * rage);
    if (B.cd2 <= 0) { B.cd2 = 7 / rage; blast(w, m, m.x, m.z, 3.5, 0.9, 1.5); }
  }
}
function malison(w, m, tgt, B, f) {
  const z = w.zone; const cx = z.w / 2, cz = z.h / 2 - 1;
  // a saint does not fall in a hurry: each phase lasts at least a while, however hard she is hit
  B.t0 = B.t0 ?? w.t; const el = w.t - B.t0; const floorF = el < 55 ? 0.62 : el < 118 ? 0.27 : 0; m.hpFloor = m.maxHp * floorF; if (m.hp < m.hpFloor) m.hp = m.hpFloor;
  m.hover = true;
  const phase = f > 0.6 ? 1 : f > 0.25 ? 2 : 3;
  if (phase > B.phase) {
    B.phase = phase; m.invuln = w.t + 2.5; ev(w, { t: 'shake', amt: 0.6 }); ev(w, { t: 'sfx', name: 'bell_cracked' });
    if (phase === 2) { say(w, 'malison', TAUNTS.malison.p2); ev(w, { t: 'banner', text: 'THE CRACKED HOUR', small: false }); ev(w, { t: 'music', song: 'eventide' }); B.cd3 = 8; }
    if (phase === 3) { say(w, 'malison', TAUNTS.malison.p3); ev(w, { t: 'banner', text: 'EVENTIDE', small: false }); ev(w, { t: 'dark', on: true }); for (const s of w.spots) if (s.kind === 'rope') s.hidden = false; B.ropes = 0; }
  }
  if (phase === 1) {
    if (dist(m, { x: cx, z: cz }) > 1) steer(w, m, cx, cz, 2);
    if (B.cd <= 0) { B.cd = 3.4; for (const h of nearHeroes(w, m)) lineStrike(w, m, m.x, m.z, h.x, h.z, 0.9, 1.1, 1.4); }
    if (B.cd2 <= 0) { B.cd2 = 8; w.areas.push({ id: nid(w), kind: 'hostile_ring', x: m.x, z: m.z, r0: 1, r1: 14, t: 2.0, dur: 2.0, dmg: 1.4, src: m }); ev(w, { t: 'tele', kind: 'ring', x: m.x, z: m.z, r: 14, time: 2.0 }); }
    if (B.cd3 <= 0) { B.cd3 = 22; for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28; spawnMonster(w, 'rattlebones', cx + Math.cos(a) * 8, cz + Math.sin(a) * 6, { dormant: false, level: m.level, noDrop: true }); } }
  } else if (phase === 2) {
    if (B.cd <= 0) { B.cd = 3.6; for (const h of nearHeroes(w, m)) lineStrike(w, m, m.x, m.z, h.x, h.z, 0.9, 1.1, 1.4); }
    if (B.cd2 <= 0) { // crumble a patch of floor under a hero
      B.cd2 = 5; const hs = nearHeroes(w, m); const h = hs[w.rng.int(0, Math.max(0, hs.length - 1))]; if (h) crumble(w, m, h.x, h.z, 3.2);
    }
    if (B.cd3 <= 0) { B.cd3 = 15; toll(w, m, cx, cz); }
    if (B.cd3 > 14.2) {}
  } else {
    m.invuln = w.t + 5; // only the ropes can hurt her
    const near = nearHeroes(w, m)[0];
    if (near && dist(m, near) > 2.5 && !(m.stagger > w.t)) steer(w, m, near.x, near.z, 1.8);
    if (B.cd <= 0 && near && dist(m, near) < 4) { B.cd = 2.6; blast(w, m, m.x, m.z, 4, 0.7, 2.6, { shake: 0.4 }); }
    const used = w.spots.filter((s) => s.kind === 'rope' && s.used).length;
    if (used > (B.ropes || 0)) {
      B.ropes = used; m.stagger = w.t + 3; ev(w, { t: 'sfx', name: 'bell_clemency' }); ev(w, { t: 'shake', amt: 0.7 }); ev(w, { t: 'fx', name: 'ring_gold', x: cx, z: cz, r: 14, shock: true });
      m.hp -= m.maxHp * 0.12; m.invuln = 0; ev(w, { t: 'banner', text: 'THE BELL RINGS TRUE', small: false });
      if (used >= 3) { m.hp = 0; killMonster(w, m, null, 0, {}); }
    }
  }
}
function crumble(w, m, x, z, r) {
  ev(w, { t: 'tele', kind: 'ring', x, z, r, time: 2.0 });
  w.areas.push({ id: nid(w), kind: 'script', t: 2.0, fn: (ww) => {
    const zn = ww.zone; const cells = [];
    for (let rr = Math.floor(z - r); rr <= Math.ceil(z + r); rr++) for (let c = Math.floor(x - r); c <= Math.ceil(x + r); c++) if (Math.hypot(c + 0.5 - x, rr + 0.5 - z) <= r && zn.cells[rr * zn.w + c] === 1) { zn.cells[rr * zn.w + c] = 2; zn.nav.setOpen(c, rr, false); cells.push([c, rr]); }
    const cid = nid(ww); ev(ww, { t: 'crumble', cells, x, z, cid }); ev(ww, { t: 'shake', amt: 0.35 }); ev(ww, { t: 'sfx', name: 'boom' });
    ww.areas.push({ id: nid(ww), kind: 'script', t: 9, fn: (w3) => { for (const [c, r] of cells) { w3.zone.cells[r * w3.zone.w + c] = 1; w3.zone.nav.setOpen(c, r, true); } ev(w3, { t: 'crumble', cells, restore: true, cid }); } });
    for (const h of livingHeroes(ww)) if (!walkable(ww, h.x, h.z, 0.1)) { hurtHero(ww, h, m.hit * 1.5, m, m); const t = nearestFloor(ww, h); h.x = t.x; h.z = t.z; }
    for (const mo of ww.monsters) if (!mo.dead && !mo.boss && !mo.prop && !walkable(ww, mo.x, mo.z, 0.1)) { mo.dead = true; }
  } });
}
function nearestFloor(w, h) { for (let r = 1; r < 14; r++) for (let a = 0; a < 16; a++) { const x = h.x + Math.cos(a / 16 * 6.28) * r, z = h.z + Math.sin(a / 16 * 6.28) * r; if (walkable(w, x, z, 0.35)) return { x, z }; } return { x: w.zone.w / 2, z: w.zone.h - 3 }; }
function toll(w, m, cx, cz) {
  ev(w, { t: 'banner', text: 'THE BELL TOLLS: GET BEHIND A PILLAR', small: true }); ev(w, { t: 'tele', kind: 'ring', x: cx, z: cz, r: 20, time: 2.4 }); ev(w, { t: 'sfx', name: 'wind_up' });
  say(w, 'malison', TAUNTS.malison.mid);
  w.areas.push({ id: nid(w), kind: 'script', t: 2.4, fn: (ww) => {
    ev(ww, { t: 'sfx', name: 'bell_clemency' }); ev(ww, { t: 'shake', amt: 0.8 }); ev(ww, { t: 'fx', name: 'ring_gold', x: cx, z: cz, r: 20, shock: true });
    for (const h of livingHeroes(ww)) { const blocked = !ww.zone.nav.lineOfSight(cx, cz, h.x, h.z); if (!blocked) hurtHero(ww, h, m.hit * 3.2, { x: cx, z: cz }, m); }
    m.extra.tolls = (m.extra.tolls || 0) + 1;
    if (m.extra.tolls % 2 === 0) { // pillars break after two tolls
      const zn = ww.zone; for (let i = 0; i < zn.cells.length; i++) if (zn.cells[i] === 3) { zn.cells[i] = 1; zn.nav.setOpen(i % zn.w, Math.floor(i / zn.w), true); ev(ww, { t: 'pillarBreak', x: (i % zn.w) + 0.5, z: Math.floor(i / zn.w) + 0.5 }); }
    }
  } });
}

function onBossDying(w, m) { return false; }
function onBossDead(w, m) {
  const id = m.boss; w.flags.bossActive = null;
  ev(w, { t: 'bossDead', boss: id, x: m.x, z: m.z, name: m.name });
  const first = !w.camp || !w.camp.firstKill[id]; if (w.camp) w.camp.firstKill[id] = true;
  if (id === 'bursar') w.flags.bursarDead = true; if (id === 'ambrose') w.flags.ambroseDead = true; if (id === 'malison') w.flags.malisonDead = true;
  if (id === 'malison') say(w, 'malison', TAUNTS.malison.kill);
  for (const h of livingHeroes(w)) {
    dropGold(w, m.x, m.z, 200 * (1 + h.level * 0.4) * w.tuning.goldRate, h.seat);
    const rar = (first && (id === 'bursar' || id === 'malison')) ? 'legendary' : 'reliquary';
    if (rar === 'legendary') { const pool = Object.keys(LEGENDARIES).filter((k) => !LEGENDARIES[k].cls || LEGENDARIES[k].cls === h.cls); const it = makeItem(w.lootRng, { legendary: pool[w.rng.int(0, pool.length - 1)], ilvl: Math.min(30, m.level), cls: h.cls }); dropItem(w, it, m.x + 1, m.z + 1, h.seat); }
    else { const it = rollDrop(w.lootRng, { ilvl: m.level, cls: h.cls, forceRarity: 'reliquary' }); dropItem(w, it, m.x + 1, m.z + 1, h.seat); const it2 = rollDrop(w.lootRng, { ilvl: m.level, cls: h.cls, forceRarity: 'blessed' }); dropItem(w, it2, m.x - 1, m.z + 1, h.seat); }
    if (first && id === 'malison') { const it = makeItem(w.lootRng, { setPiece: true, rarity: 'set', ilvl: Math.min(30, m.level), cls: h.cls }); dropItem(w, it, m.x, m.z + 2, h.seat); }
    w.boss = null;
  }
  for (const a of w.areas) if (a.kind === 'bone_wall' || a.kind === 'hostile_ring' || a.kind === 'beams') a.t = Math.min(a.t, 0);
  for (const o of w.monsters) if (!o.dead && !o.boss && !o.prop && o.team !== 'hero') { o.dead = true; ev(w, { t: 'kill', id: o.id, x: o.x, z: o.z, type: o.type, big: o.big, over: 0.5, dirx: 0, dirz: 1 }); }
}
