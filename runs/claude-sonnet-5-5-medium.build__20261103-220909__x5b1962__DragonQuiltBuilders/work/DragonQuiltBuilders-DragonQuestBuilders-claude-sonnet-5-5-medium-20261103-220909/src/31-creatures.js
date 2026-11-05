// Monsters, bosses, shots, residents, objects' behaviour (doors, traps, ballistas, portals), interaction.
(() => {
const { E, T } = DQ;
const ev = DQ.events;
const A = () => DQ.audio;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cellC = c => c * T + 8;

// ---------- rigs ----------
DQ.makeMonsterRig = function (def) {
  if (def.kind === 'blob') return new E.Blob({ R: def.r + 1, colors: def.colors, horns: !!def.horns, wings: !!def.wings, feet: true, mouth: def.horns ? 'fangs' : true, ears: def.id === 'lintling' ? 'rabbit' : undefined });
  return new E.Humanoid({ size: def.size || 1.1, build: def.build || 'chibi', weapon: def.boss ? 'sword' : 'sword', hair: 'bald', outfit: 'coat', colors: { ...def.colors, pants: '#2a2038', boot: '#1a1428', metal: (def.colors && def.colors.metal) || '#b0a8c8' }, eyeGlow: def.id === 'gnarlgrim' || def.id === 'knight' ? '#ff6a6a' : undefined });
};

// ---------- spawning ----------
DQ.spawnMonster = function (id, x, y, o = {}) {
  const S = DQ.S, def = { id, ...DQ.MONSTERS[id] }; if (!def.name) return null;
  const hpMult = DQ.tuning.monsterHp * (def.boss ? 1 : 1);
  const m = { id, def, x, y, z: 0, vx: 0, vy: 0, hp: Math.round(def.hp * hpMult), maxHp: Math.round(def.hp * hpMult), state: 'idle', t: 0, face: Math.random() * 6, home: { x, y }, path: null, pathT: 0, flash: 0, stun: 0, tele: null, cd: 1.5 + Math.random(), stuck: 0, tangle: 0, tangleHits: 0, tangleWin: 0, phase: 1, dead: 0, wander: 0, wdx: 0, wdy: 0, siege: !!o.siege, summoned: 0 };
  m.body = new E.Body({ x, y, r: def.r }); m.body.x = x; m.body.y = y;
  m.rig = DQ.makeMonsterRig(def); m.atk = new E.Attack('overhead');
  if (def.kind === 'blob' && def.fly) m.hover = 6;
  S.monsters.push(m); ev.emit('monsterSpawn', { m }); return m;
};
DQ.monsterCountField = () => DQ.S.monsters.filter(m => !m.def.boss && !m.siege).length;
DQ.spawnTick = function (dt) {
  const S = DQ.S; if (S.cut || S.mode === 'story' && !S.town.planted && !S.flags.thimbleDone && DQ.cheat !== 'spawn') { /* wilds still spawn */ }
  if (S.cut || ['prep', 'breather'].includes(S.siege.phase) && false) return;
  S.spawnT = (S.spawnT || 0) - dt; if (S.spawnT > 0) return;
  const night = DQ.phase(S.clock.hour) === 'night'; S.spawnT = DQ.tuning.spawnEvery * (night ? .65 : 1);
  if (DQ.monsterCountField() >= DQ.tuning.maxMonsters) return;
  if (S.mode === 'bee') return;
  const h = S.hero, w = S.world, r = DQ.rng('spawn');
  for (let tries = 0; tries < 30; tries++) {
    const a = r() * 6.283, d = 10 + r() * 13, cx = Math.floor(h.x / T + Math.cos(a) * d), cy = Math.floor(h.y / T + Math.sin(a) * d);
    if (!w.walkable(cx, cy, true) || DQ.inBorder(cx, cy) && S.town.level >= 1) continue;
    const reg = DQ.regionAt(cx, cy); if (reg === 'plaza' || reg === 'lake') continue;
    if (S.town.planted && Math.hypot(cx - S.town.x, cy - S.town.y) < DQ.townRadius() + 2) continue;
    const pool = Object.keys(DQ.MONSTERS).filter(k => { const d2 = DQ.MONSTERS[k]; return d2.regions.includes(reg) && (!d2.night || night); });
    if (!pool.length) continue;
    let id = pool[Math.floor(r() * pool.length)]; if (id === 'knight' && !night && reg === 'glen') continue;
    DQ.spawnMonster(id, cellC(cx), cellC(cy)); return;
  }
};

// ---------- damage ----------
DQ.damageMonster = function (m, atk, fx, fy, o = {}) {
  const S = DQ.S, def = m.def; if (m.hp <= 0) return 0;
  let defv = m.tangle > 0 ? 0 : def.def, mult = 1;
  if (def.boss && m.tangle > 0) { mult = 2; if (o.weapon === 'ripper') mult = 3; if (o.front) mult *= 1.5; }
  let d = Math.max(1, Math.round((atk - defv / 2) * (.9 + DQ.rng('combat')() * .2) * mult));
  if (m.id === 'gnarlgrim' && m.tangle <= 0 && !o.tangleShot) { S.flags.tightHits = (S.flags.tightHits || 0) + 1; if (S.flags.tightHits === 3) DQ.say && DQ.say('mortimer', ['His skin is too tight! Use the BALLISTAS, Builder!']); }
  m.hp -= d; m.flash = .12; m.stun = def.boss ? 0 : .25; m.state = m.state === 'idle' ? 'chase' : m.state;
  if (!def.boss || m.tangle > 0) E.knockback({ x: fx, y: fy }, m.body, o.spin ? 180 : 120, def.boss ? 0 : 40);
  DQ.game.hitFx(m.x, m.y, 14, { power: o.crit ? 1.2 : .8, angle: Math.atan2(m.y - fy, m.x - fx), damage: o.silent ? undefined : d, color: o.crit ? '#ffe060' : '#ffffff', sound: 'hit' });
  m.rig.kick && m.rig.kick(o.crit ? 6 : 3);
  S.stats.dealt = (S.stats.dealt || 0) + d;
  if (m.hp <= 0) DQ.killMonster(m);
  return d;
};
DQ.killMonster = function (m) {
  const S = DQ.S, def = m.def; m.dead = 1; m.state = 'dead';
  A().sfx('pop'); DQ.game.particles.explosion(m.x, m.y, 12, def.boss ? 18 : 7, { debris: true, shake: def.boss ? 4 : 0 }); DQ.game.particles.bits(m.x, m.y, 12, 16, [def.colors.base || def.colors.cloth || '#fff', '#fff']);
  for (const [id, p, a, b] of def.drops) if (DQ.chance(Math.min(1, p * DQ.tuning.dropRate), 'drops')) DQ.spawnDrop(m.x, m.y, 12, id, a + Math.floor(DQ.rng('drops')() * (b - a + 1)));
  S.stats.killed[m.id] = (S.stats.killed[m.id] || 0) + 1; S.stats.kills++;
  if (def.boss) { S.flags['boss_' + m.id] = true; S.boss = null; ev.emit('bossKilled', { id: m.id }); }
  ev.emit('monsterKilled', { m, id: m.id });
};

// ---------- targets ----------
function pickTarget(m) {
  const S = DQ.S, h = S.hero, sg = S.siege;
  const aggro = (m.siege || sg.phase === 'wave' || sg.phase === 'boss' ? 999 : DQ.tuning.aggro) * T;
  const sieging = m.siege;
  if (sieging && S.town.planted && S.town.bannerHp > 0) {
    // banner first, then ballistas, then residents/hero close by
    const near = (arr, rr) => arr.filter(t => Math.hypot(t.x - m.x, t.y - m.y) < rr);
    if (h.hp > 0 && dist(h, m) < 4 * T && !h.dead) return { x: h.x, y: h.y, kind: 'hero' };
    const rs = near(S.residents.filter(r => r.ko <= 0), 3 * T)[0]; if (rs) return { x: rs.x, y: rs.y, kind: 'res', ref: rs };
    const bal = S.world.list.filter(o => o.type === 'ballista').sort((a, b) => Math.hypot(a.x * T - m.x, a.y * T - m.y) - Math.hypot(b.x * T - m.x, b.y * T - m.y))[0];
    if (bal && Math.hypot(bal.x * T - m.x, bal.y * T - m.y) < 6 * T) return { x: cellC(bal.x), y: cellC(bal.y), kind: 'obj', ref: bal };
    return { x: cellC(S.town.x), y: cellC(S.town.y), kind: 'banner' };
  }
  if (h.hp > 0 && !S.cut && dist(h, m) < aggro && (m.def.boss || DQ.S.world.map.los(m.x, m.y, h.x, h.y) || m.state === 'chase')) return { x: h.x, y: h.y, kind: 'hero' };
  for (const r of S.residents) if (r.ko <= 0 && dist(r, m) < Math.min(aggro, 5 * T) && S.town.planted) return { x: r.x, y: r.y, kind: 'res', ref: r };
  return null;
}
function steer(m, tx, ty, speed, dt) {
  const S = DQ.S, w = S.world, map = w.map;
  let dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
  const wps = m.def.fly ? true : map.los(m.x, m.y, tx, ty);
  if (!wps && d > T * 1.2) {
    m.pathT -= dt;
    if (m.pathT <= 0 || !m.path) {
      m.pathT = .8 + Math.random() * .4;
      m.path = w.path(Math.floor(m.x / T), Math.floor(m.y / T), Math.floor(tx / T), Math.floor(ty / T), { breaker: m.siege, monster: true, cap: 2200 });
      m.pi = 1;
    }
    if (m.path && m.path.length > 1) {
      m.pi = Math.min(m.pi, m.path.length - 1);
      let wp = m.path[m.pi]; if (Math.hypot(cellC(wp[0]) - m.x, cellC(wp[1]) - m.y) < 6 && m.pi < m.path.length - 1) { m.pi++; wp = m.path[m.pi]; }
      dx = cellC(wp[0]) - m.x; dy = cellC(wp[1]) - m.y; d = Math.hypot(dx, dy) || 1;
    }
  }
  m.body.vx = dx / d * speed; m.body.vy = dy / d * speed; m.face = Math.atan2(dy, dx);
}
DQ.batterCell = function (cx, cy, dmg) {
  const S = DQ.S, w = S.world; const o = w.objAt(cx, cy);
  if (w.height(cx, cy) === 0 && o) { o.hp -= dmg; o.flash = .15; if (o.hp <= 0) { w.removeObj(o); A().sfx('rip'); DQ.game.particles.bits(cellC(cx), cellC(cy), 10, 12, ['#c68c54', '#fff']); } return true; }
  if (w.height(cx, cy) > 0 && (w.townCells.has(w.idx(cx, cy)) || S.mode === 'bee')) {
    const key = 'm' + cx + ',' + cy; S.batter = S.batter || {}; S.batter[key] = (S.batter[key] || 0) + dmg;
    const id = w.topId(cx, cy), hp = DQ.BLOCKS[id].hp * 4; A().sfx('thud', { vol: .4 });
    if (S.batter[key] >= hp) { S.batter[key] = 0; w.pop(cx, cy); A().sfx('rip'); DQ.game.particles.bits(cellC(cx), cellC(cy), 14, 10, [DQ.BLOCKS[id].top, DQ.BLOCKS[id].side]); } return true;
  }
  return false;
};

// ---------- monster AI ----------
function monUpdate(m, dt) {
  const S = DQ.S, def = m.def, h = S.hero, w = S.world, b = m.body;
  m.t += dt; m.flash = Math.max(0, m.flash - dt); m.stun = Math.max(0, m.stun - dt); m.cd -= dt; m.tangle = Math.max(0, m.tangle - dt); if (m.tangleWin > 0) { m.tangleWin -= dt; if (m.tangleWin <= 0) m.tangleHits = 0; }
  if (m.state === 'dead') { m.dead -= dt * 2; m.rig.update && m.rig.update(dt, m.def.kind === 'blob' ? { squash: .3 } : { x: m.x, y: m.y, z: 0, vx: 0, vy: 0, facing: m.face, pose: 'die' }); return; }
  m.x = b.x; m.y = b.y; m.z = b.z;
  // pin traps
  const o = w.objAt(Math.floor(m.x / T), Math.floor(m.y / T)); let slow = 1;
  if (o && o.type === 'trap' && !m.def.fly) { slow = .6; m.trapT = (m.trapT || 0) - dt; if (m.trapT <= 0) { m.trapT = .8; DQ.damageMonster(m, 16, m.x, m.y, { silent: false, tangleShot: true }); } }
  if (b.z > 0.5 && m.hover) b.z = b.z;
  if (def.boss) bossPhase(m);
  if (m.stun > 0 || m.tangle > 0 && def.boss) { b.vx *= .8; b.vy *= .8; b.update(dt, w.map); syncRig(m, dt); return; }
  if (def.boss) return bossUpdate(m, dt, slow);
  const tgt = pickTarget(m); let spd = def.spd * slow;
  const d = tgt ? Math.hypot(tgt.x - m.x, tgt.y - m.y) : 999;
  const reach = def.r + (tgt && tgt.kind === 'banner' ? 14 : 10);
  switch (m.state) {
    case 'idle': case 'wander':
      m.wander -= dt; if (m.wander <= 0) { m.wander = 1.5 + Math.random() * 2.5; const a = Math.random() * 6.28; m.wdx = Math.cos(a) * def.spd * .35 * (Math.random() < .4 ? 0 : 1); m.wdy = Math.sin(a) * def.spd * .35 * (m.wdx === 0 ? 0 : 1); }
      b.vx = m.wdx; b.vy = m.wdy; if (m.wdx || m.wdy) m.face = Math.atan2(m.wdy, m.wdx);
      if (Math.hypot(m.x - m.home.x, m.y - m.home.y) > 6 * T) { m.wdx = (m.home.x - m.x) * .1; m.wdy = (m.home.y - m.y) * .1; }
      if (tgt && d < DQ.tuning.aggro * T) { m.state = 'notice'; m.t = 0; A().sfx('squeak', { vol: .4 }); }
      if (m.siege && tgt) m.state = 'chase';
      break;
    case 'notice': b.vx = b.vy = 0; if (tgt) m.face = Math.atan2(tgt.y - m.y, tgt.x - m.x); if (m.t > .3) { m.state = 'chase'; m.t = 0; } break;
    case 'chase':
      if (!tgt) { m.state = 'idle'; break; }
      if (!m.siege && Math.hypot(m.x - m.home.x, m.y - m.home.y) > 24 * T) { m.state = 'idle'; m.home = { x: m.x, y: m.y }; break; }
      steer(m, tgt.x, tgt.y, spd, dt);
      if (d < reach + 4) { m.state = 'windup'; m.t = 0; m.tele = { kind: 'flash' }; b.vx = b.vy = 0; if (def.kind === 'rig') m.atk.start && m.atk.start(); A().sfx('windup', { vol: .4 }); m.tgt = tgt; }
      // battering walls
      if (m.siege && b.hitWall) { const a = m.face; const cx = Math.floor((m.x + Math.cos(a) * 9) / T), cy = Math.floor((m.y + Math.sin(a) * 9) / T); m.bash = (m.bash || 0) + dt; if (m.bash > .8) { m.bash = 0; DQ.batterCell(cx, cy, def.blk); } }
      break;
    case 'windup':
      b.vx = b.vy = 0; if (m.tgt) m.face = Math.atan2(m.tgt.y - m.y, m.tgt.x - m.x);
      if (def.kind === 'rig' && m.atk.update) m.atk.update(dt);
      if (m.t >= def.wind) { m.state = 'attack'; m.t = 0; m.tele = null; m.hitDone = false; A().sfx('swing', { vol: .4 }); b.vx = Math.cos(m.face) * def.spd * 3.2; b.vy = Math.sin(m.face) * def.spd * 3.2; }
      break;
    case 'attack':
      if (def.kind === 'rig' && m.atk.update) m.atk.update(dt);
      b.vx *= .9; b.vy *= .9;
      if (!m.hitDone && m.t > .08) {
        m.hitDone = true; const t = m.tgt;
        if (t) {
          const dd = Math.hypot(t.x - m.x, t.y - m.y);
          if (dd < reach + 9) {
            if (t.kind === 'hero') DQ.hurtHero(def.atk, m.x, m.y);
            else if (t.kind === 'res') DQ.hurtResident(t.ref, def.atk);
            else if (t.kind === 'banner') DQ.hurtBanner(def.blk);
            else if (t.kind === 'obj') { t.ref.hp -= def.blk; t.ref.flash = .15; A().sfx('thud'); if (t.ref.hp <= 0) { S.world.removeObj(t.ref); A().sfx('rip'); } }
          }
        }
      }
      if (m.t > .35) { m.state = 'recover'; m.t = 0; }
      break;
    case 'recover': b.vx = b.vy = 0; if (m.t > .5) { m.state = 'chase'; m.t = 0; } break;
  }
  if (m.hp < def.hp * hpMult(m) * .2 && m.id === 'lintling' && m.state !== 'dead' && m.state !== 'attack') { m.state = 'flee'; }
  if (m.state === 'flee') { b.vx = -Math.cos(m.face) * def.spd * 1.2; b.vy = -Math.sin(m.face) * def.spd * 1.2; if (m.t > 2) { m.state = 'idle'; } }
  // despawn when far
  if (!m.siege && dist(m, h) > 40 * T) { m.far = (m.far || 0) + dt; if (m.far > 20) m.remove = true; } else m.far = 0;
  b.update(dt, w.map);
  if (m.hover) { /* bats hover slightly */ }
  syncRig(m, dt);
}
const hpMult = m => m.maxHp / m.def.hp;
function syncRig(m, dt) {
  const b = m.body, def = m.def; m.x = b.x; m.y = b.y; m.z = b.z;
  const moving = Math.hypot(b.vx, b.vy) > 6;
  if (def.kind === 'blob') {
    const wind = m.state === 'windup' ? Math.min(1, m.t / def.wind) : 0;
    m.rig.update(dt, { squash: wind ? -.3 * wind : m.state === 'attack' ? .25 : moving ? Math.sin(m.t * 12) * .1 : Math.sin(m.t * 2) * .04, look: [Math.cos(m.face), Math.sin(m.face)], walk: moving ? 1 : 0, flap: def.wings ? 1 : 0, squint: m.state === 'windup' ? 1 : 0 });
  } else {
    const down = m.tangle > 0 ? .6 : 0;
    m.rig.update(dt, { x: m.x, y: m.y, z: m.z, vx: b.vx, vy: b.vy, facing: m.face, attack: m.state === 'windup' || m.state === 'attack' || m.state === 'recover' ? m.atk.state : null, hurt: m.flash > 0, expr: m.state === 'windup' || m.phaseRoar ? 'angry' : null, down, pose: m.tangle > 0 ? 'kneel' : m.dizzy > 0 ? 'hips' : null });
  }
}

// ---------- bosses ----------
function ring(m, rad, dmg, band = 10, label) {
  const S = DQ.S; m.rings = m.rings || []; m.rings.push({ r: 4, max: rad, dmg, band, t: 0, done: false, x: m.x, y: m.y });
}
function bossPhase(m) {
  const S = DQ.S, def = m.def, hpf = m.hp / m.maxHp;
  if (m.id === 'gnarlgrim') {
    const ph = hpf > .66 ? 1 : hpf > .33 ? 2 : 3;
    if (ph > m.phase) { m.phase = ph; m.cd = 2; DQ.game.shake(6); A().sfx('boom'); m.phaseRoar = 1.2; ring(m, 5 * T, 8, 12); DQ.say && DQ.say('gnarlgrim', [ph === 2 ? 'GRRRR... TIGHTER! TIGHTER!' : 'KNOT... KNOT... KNOOOOT!']); const n = ph === 2 ? 4 : 1; for (let i = 0; i < n; i++) { const a = i * 1.6; DQ.spawnMonster(ph === 2 ? 'lintling' : 'brute', m.x + Math.cos(a) * 36, m.y + Math.sin(a) * 36, { siege: true }); } }
  }
  if (m.id === 'buttons' && hpf < .5 && !m.summoned) { m.summoned = 1; for (let i = 0; i < 3; i++) DQ.spawnMonster('lintling', m.x + Math.cos(i * 2.1) * 34, m.y + Math.sin(i * 2.1) * 34, { siege: true }); DQ.toast('Sir Buttonsworth calls for backup!', '#ffb070'); }
}
function bossUpdate(m, dt, slow) {
  const S = DQ.S, h = S.hero, def = m.def, b = m.body, w = S.world;
  const hpf = m.hp / m.maxHp;
  if (m.phaseRoar > 0) m.phaseRoar -= dt;
  const spdF = m.id === 'gnarlgrim' && m.phase === 3 ? 1.25 : 1;
  m.dizzy = Math.max(0, (m.dizzy || 0) - dt);
  // expanding rings
  for (const r of m.rings || []) {
    r.t += dt; r.r += dt * (r.max - 4) / .5; if (r.r >= r.max) r.done = true;
    if (!r.hit && Math.abs(Math.hypot(h.x - r.x, h.y - r.y) - r.r) < r.band && h.z < 8 && !h.dead) { r.hit = true; DQ.hurtHero(r.dmg, r.x, r.y); }
  }
  m.rings = (m.rings || []).filter(r => !r.done);
  const tgtH = h.hp > 0 && !h.dead; const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy) || 1;
  const stateBusy = m.state === 'windup' || m.state === 'attack' || m.state === 'recover';
  if (m.dizzy > 0) { b.vx *= .8; b.vy *= .8; b.update(dt, w.map); syncRig(m, dt); return; }
  if (!stateBusy) {
    m.state = 'chase'; if (tgtH) steer(m, h.x, h.y, def.spd * slow * spdF * (d > 28 * T ? 2 : 1), dt); else { b.vx = b.vy = 0; }
    if (m.cd <= 0 && tgtH && d < 12 * T) {
      const pick = Math.floor(DQ.rng('boss')() * 3); let atk;
      if (m.id === 'buttons') atk = d < 3.2 * T ? 'slam' : pick === 0 ? 'charge' : 'volley';
      else atk = d < 4 * T && pick < 2 ? 'slam' : m.phase >= 2 && pick === 2 ? 'charge' : 'toss';
      m.atkName = atk; m.state = 'windup'; m.t = 0; m.face = Math.atan2(dy, dx); b.vx = b.vy = 0; m.atk.start && m.atk.start();
      m.windT = { slam: .6, volley: .45, charge: .7, toss: .6 }[atk] / spdF; m.tele = { kind: atk, x: h.x, y: h.y }; A().sfx('windup');
      if (atk === 'toss') m.tossAt = { x: h.x, y: h.y };
    } else if (tgtH && d < def.r + 12) { if (m.cd <= 0) { m.atkName = 'swipe'; m.state = 'windup'; m.t = 0; m.windT = .4; m.atk.start && m.atk.start(); } }
  } else {
    m.atk.update && m.atk.update(dt);
    if (m.state === 'windup') { b.vx = b.vy = 0; if (m.atkName !== 'charge') m.face = Math.atan2(dy, dx); if (m.t >= m.windT) { m.state = 'attack'; m.t = 0; m.tele = null; fireBossAttack(m); } }
    else if (m.state === 'attack') {
      if (m.atkName === 'charge') {
        b.vx = Math.cos(m.chargeDir) * 140 * spdF; b.vy = Math.sin(m.chargeDir) * 140 * spdF;
        const cx = Math.floor((m.x + Math.cos(m.chargeDir) * 12) / T), cy = Math.floor((m.y + Math.sin(m.chargeDir) * 12) / T);
        if (w.height(cx, cy) > 0 && cx > 0 && cy > 0 && cx < w.W - 1 && cy < w.H - 1) { while (w.height(cx, cy) > 0) w.pop(cx, cy); DQ.game.particles.bits(cellC(cx), cellC(cy), 12, 12, ['#9a9aa6', '#fff']); A().sfx('rip'); DQ.game.shake(2); }
        const ob = w.objAt(cx, cy); if (ob && !DQ.OBJECTS[ob.type].portal) DQ.batterCell(cx, cy, 60);
        if (tgtH && d < def.r + 8 && !m.chargeHit) { m.chargeHit = true; DQ.hurtHero(def.atk * 1.1, m.x, m.y); }
        if (m.t > 1.3 || b.hitWall && m.t > .25) { m.state = 'recover'; m.t = 0; m.dizzy = b.hitWall ? 2 : .6; if (b.hitWall) { DQ.game.shake(4); A().sfx('boom'); DQ.game.particles.explosion(m.x, m.y, 10, 6, { debris: true }); } }
      } else if (m.t > .35) { m.state = 'recover'; m.t = 0; }
    } else if (m.state === 'recover') { b.vx *= .85; b.vy *= .85; if (m.t > .5) { m.state = 'chase'; m.cd = (m.id === 'gnarlgrim' ? 1.6 : 1.8) / spdF; } }
  }
  b.update(dt, w.map); syncRig(m, dt);
}
function fireBossAttack(m) {
  const S = DQ.S, h = S.hero, def = m.def; A().sfx('boom', { vol: .5 });
  switch (m.atkName) {
    case 'slam': ring(m, m.id === 'gnarlgrim' ? 3.5 * T : 3 * T, def.atk * .9, 9); DQ.game.shake(3); DQ.game.particles.ring && DQ.game.particles.ring(m.x, m.y, 4, 30, '#ffe9a0', .4); break;
    case 'volley': for (let i = -2; i <= 2; i++) { const a = m.face + i * .22; DQ.shoot({ x: m.x, y: m.y, z: 14, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, team: 'mon', dmg: 8, life: 3, kind: 'button', r: 3 }); } break;
    case 'charge': m.chargeDir = m.face; m.chargeHit = false; break;
    case 'toss': { const tx = m.tossAt.x, ty = m.tossAt.y; DQ.shoot({ x: m.x, y: m.y, z: 30, vx: (tx - m.x) / 1.1, vy: (ty - m.y) / 1.1, vz: 150, grav: 280, team: 'mon', dmg: 10, life: 1.1, kind: 'yarn', r: 4, land: { x: tx, y: ty } }); break; }
    default: if (Math.hypot(h.x - m.x, h.y - m.y) < def.r + 18) DQ.hurtHero(def.atk, m.x, m.y);
  }
}
// tangle: spool shots from ballistas
DQ.tangleHit = function (m, shot) {
  if (m.id !== 'gnarlgrim') return; const S = DQ.S;
  m.tangleHits++; m.tangleWin = 8;
  if (m.tangleHits >= 2 || m.state === 'attack' && m.atkName === 'charge') { m.tangle = 5; m.tangleHits = 0; m.state = 'recover'; m.t = 0; m.rings = []; m.dizzy = 0; DQ.game.shake(4); A().sfx('powerup'); DQ.game.particles.glints(m.x, m.y, 30, 24, '#ffd36a'); DQ.toast('Gnarlgrim is TANGLED! Hit his chest!', '#ffe9a0'); S.flags.tangledOnce = true; }
  else DQ.toast('Tangle! One more spool!', '#ffe9a0');
};

// ---------- shots ----------
DQ.shoot = function (s) { const S = DQ.S; S.shots.push({ vz: 0, grav: 0, life: 2, r: 2, pierce: 0, t: 0, ...s }); };
DQ.shotsTick = function (dt) {
  const S = DQ.S, w = S.world, h = S.hero;
  for (const s of S.shots) {
    s.t += dt; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.vz -= s.grav * dt;
    if (s.kind === 'spool' || s.kind === 'sling' || s.kind === 'pie') { }
    const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T);
    if (s.kind !== 'yarn' && w.height(cx, cy) * T > s.z + 2 && s.kind !== 'pie') { s.dead = true; DQ.game.particles.sparks(s.x, s.y, s.z, 4, 0); continue; }
    if (s.life <= 0 || s.z < 0 && s.kind !== 'yarn' && s.kind !== 'pie') { s.dead = true; if (s.kind === 'yarn' || s.kind === 'pie') { } continue; }
    if (s.land && s.life <= 0) { }
    if (s.team === 'player') {
      for (const m of S.monsters) { if (m.hp <= 0 || s.hitSet && s.hitSet.has(m)) continue; if (Math.hypot(m.x - s.x, m.y - s.y) < m.def.r + s.r + 2 && Math.abs((m.z || 0) + 8 - s.z) < 30) {
        if (s.kind === 'spool') { if (m.id === 'gnarlgrim') { DQ.tangleHit(m, s); DQ.damageMonster(m, s.dmg, s.x - s.vx, s.y - s.vy, { tangleShot: true }); } else DQ.damageMonster(m, s.dmg, s.x - s.vx, s.y - s.vy, { tangleShot: true }); }
        else DQ.damageMonster(m, s.dmg, s.x - s.vx, s.y - s.vy, {});
        s.hitSet = s.hitSet || new Set(); s.hitSet.add(m); if (!(s.pierce > 0)) s.dead = true; else s.pierce--; } }
    } else {
      if (s.kind === 'yarn') { if (s.life <= 0 || s.z <= 0) { s.dead = true; DQ.game.particles.explosion(s.land.x, s.land.y, 4, 5, {}); A().sfx('thud'); for (const t of [h]) if (!h.dead && Math.hypot(h.x - s.land.x, h.y - s.land.y) < 22 && h.z < 14) DQ.hurtHero(s.dmg, s.land.x, s.land.y); continue; } }
      else if (!h.dead && Math.hypot(h.x - s.x, h.y - s.y) < 8 && Math.abs(h.z + 12 - s.z) < 18) { s.dead = true; DQ.hurtHero(s.dmg, s.x - s.vx, s.y - s.vy); }
      else for (const r of S.residents) if (r.ko <= 0 && Math.hypot(r.x - s.x, r.y - s.y) < 8) { s.dead = true; DQ.hurtResident(r, s.dmg); }
    }
  }
  S.shots = S.shots.filter(s => !s.dead);
};

// ---------- residents ----------
DQ.hurtResident = function (r, d) { if (r.ko > 0) return; r.hp -= d; r.flash = .2; A().sfx('hurt', { vol: .3 }); DQ.game.particles.bits(r.x, r.y, 14, 6, ['#ff8a8a', '#fff']); if (r.hp <= 0) { r.ko = 18; r.hp = 0; DQ.balloon(r, 'dots'); } };
DQ.hurtBanner = function (d) { const S = DQ.S; if (S.town.bannerHp <= 0) return; S.town.bannerHp -= d * (DQ.tuning.monsterDmg); A().sfx('thud'); DQ.game.shake(1.5); S.bannerFlash = .2; if (S.town.bannerHp <= 0) { S.town.bannerHp = 0; ev.emit('bannerFell', {}); } };
DQ.balloon = (r, kind, t = 2.5) => { r.balloon = { kind, t }; };
DQ.makeResident = function (id, x, y) {
  const S = DQ.S, def = DQ.NPCS[id];
  const r = { id, def, x, y, z: 0, vx: 0, vy: 0, face: Math.PI / 2, hp: 40, maxHp: 40, ko: 0, path: null, pi: 0, pathT: 0, goal: null, goalT: 0, wanderT: 0, state: 'idle', flash: 0, balloon: null, bubbled: {}, mood: 3, slept: false, ate: false, shootCd: 0, giftDay: 0, bed: null, hi: 0, stuck: 0, lastPos: [x, y], stuckT: 0, t: 0 };
  r.body = new E.Body({ x, y, r: 5 });
  r.rig = def.blob ? new E.Blob({ R: def.look.R, colors: def.look.colors, ears: def.look.ears, feet: def.look.feet, mouth: true }) : new E.Humanoid(def.look);
  S.residents.push(r); return r;
};
function goalFor(r) {
  const S = DQ.S, hr = S.clock.hour, t = S.town, w = S.world; const bx = t.x, by = t.y;
  const walk = (x, y) => w.nearestWalkable(x, y, 4);
  const siege = ['prep', 'wave', 'breather', 'boss'].includes(S.siege.phase);
  if (siege) { const a = r.t * .3 + DQ.hash(r.id); return walk(bx + Math.round(Math.cos(a) * 3), by + Math.round(Math.sin(a) * 3)); }
  const phase = hr >= 21 || hr < 5.5 ? 'sleep' : hr < 8 ? 'wake' : hr < 18 ? 'work' : hr < 20 ? 'supper' : 'social';
  if (phase === 'sleep') {
    if (!r.bed) { const taken = new Set(S.residents.map(x => x.bed && x.bed.id)); r.bed = DQ.bedFree().find(b => !taken.has(b.id)) || null; }
    if (r.bed) { const p = walk(r.bed.x, r.bed.y); r.sleepPos = [r.bed.x, r.bed.y]; return p; }
    return walk(bx + 2 + (DQ.hash(r.id) % 3), by + 2);
  }
  r.bed = phase === 'sleep' ? r.bed : null;
  if (phase === 'supper') { const tb = w.list.find(o => o.type === 'table' && DQ.inBorder(o.x, o.y)); if (tb) return walk(tb.x, tb.y + 1); return walk(bx, by + 2); }
  if (phase === 'social') return walk(bx + (DQ.hash(r.id) % 5) - 2, by - 2);
  if (phase === 'wake') return walk(bx + (DQ.hash(r.id + 'w') % 7) - 3, by + 1);
  // work: wander near a station that matches the job, else near the banner
  const home = { gatherer: 'tree', guard: 'rack', cook: 'hearth', helper: 'workbench', farmer: 'bed' }[r.def.job];
  const spots = w.list.filter(o => o.type === home && DQ.inBorder(o.x, o.y));
  if (spots.length && DQ.chance(.6, 'npc')) { const s = spots[Math.floor(DQ.rng('npc')() * spots.length)]; return walk(s.x + (Math.floor(DQ.rng('npc')() * 3) - 1), s.y + (Math.floor(DQ.rng('npc')() * 3) - 1)); }
  const rad = Math.max(3, DQ.townRadius() - 3), a = DQ.rng('npc')() * 6.28, d = DQ.rng('npc')() * rad;
  return walk(Math.round(bx + Math.cos(a) * d), Math.round(by + Math.sin(a) * d));
}
function residentUpdate(r, dt) {
  const S = DQ.S, def = r.def, b = r.body, w = S.world, hr = S.clock.hour; r.t += dt; r.hi = Math.max(0, r.hi - dt);
  if (r.balloon) { r.balloon.t -= dt; if (r.balloon.t <= 0) r.balloon = null; }
  r.flash = Math.max(0, r.flash - dt);
  if (r.ko > 0) { r.ko -= dt; b.vx = b.vy = 0; if (r.ko <= 0) { r.hp = r.maxHp; } r.body.update(dt, w.map); r.rig.update && r.rig.update(dt, def.blob ? { squash: .3 } : { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, facing: r.face, pose: 'down', down: 1 }); r.x = b.x; r.y = b.y; return; }
  r.x = b.x; r.y = b.y;
  const siege = ['prep', 'wave', 'breather', 'boss'].includes(S.siege.phase);
  // fight: Mortimer melee, others ranged in sieges
  let fighting = false;
  const close = S.monsters.filter(m => m.hp > 0 && !m.def.boss && Math.hypot(m.x - r.x, m.y - r.y) < (r.id === 'mortimer' ? 5 : 6) * T && (S.town.planted && DQ.inBorder(Math.floor(m.x / T), Math.floor(m.y / T)) || m.siege));
  r.shootCd -= dt;
  if (close.length) {
    close.sort((a, c) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(c.x - r.x, c.y - r.y)); const m = close[0], dm = Math.hypot(m.x - r.x, m.y - r.y);
    if (r.id === 'mortimer') { fighting = true; r.face = Math.atan2(m.y - r.y, m.x - r.x); if (dm > 16) { b.vx = Math.cos(r.face) * 46; b.vy = Math.sin(r.face) * 46; } else { b.vx = b.vy = 0; if (r.shootCd <= 0) { r.shootCd = 1; r.swing = .35; DQ.damageMonster(m, 12, r.x, r.y, { silent: false }); A().sfx('swing', { vol: .3 }); } } }
    else if ((r.id === 'wren' || r.id === 'marigold') && siege && r.shootCd <= 0) { r.shootCd = r.id === 'wren' ? 1.2 : 2; const a = Math.atan2(m.y - r.y, m.x - r.x); DQ.shoot({ x: r.x, y: r.y, z: 14, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, team: 'player', dmg: r.id === 'wren' ? 6 : 8, life: 1.2, kind: r.id === 'wren' ? 'sling' : 'pie', r: 3 }); A().sfx('pop', { vol: .3 }); r.face = a; }
    else if (!siege && r.id !== 'mortimer') { /* flee toward banner */ }
  }
  if (!fighting) {
    // goal & movement
    r.goalT -= dt;
    if (r.goalT <= 0 || !r.goal) { r.goalT = 7 + DQ.rng('npc')() * 8; r.goal = goalFor(r); r.path = null; r.arrived = false; }
    if (r.goal) {
      const gx = cellC(r.goal[0]), gy = cellC(r.goal[1]), d = Math.hypot(gx - r.x, gy - r.y);
      if (d > 5) {
        r.pathT -= dt;
        if (!r.path || r.pathT <= 0) { r.pathT = 1.5; r.path = w.path(Math.floor(r.x / T), Math.floor(r.y / T), r.goal[0], r.goal[1], { cap: 2500 }); r.pi = 1; }
        let tx = gx, ty = gy;
        if (r.path && r.path.length > 1) { r.pi = Math.min(r.pi, r.path.length - 1); let wp = r.path[r.pi]; if (Math.hypot(cellC(wp[0]) - r.x, cellC(wp[1]) - r.y) < 5 && r.pi < r.path.length - 1) { r.pi++; wp = r.path[r.pi]; } tx = cellC(wp[0]); ty = cellC(wp[1]); }
        const dd = Math.hypot(tx - r.x, ty - r.y) || 1, sp = siege ? 46 : 34;
        b.vx = (tx - r.x) / dd * sp; b.vy = (ty - r.y) / dd * sp; r.face = Math.atan2(b.vy, b.vx);
        // stuck rule
        r.stuckT += dt; if (r.stuckT > 4) { r.stuckT = 0; if (Math.hypot(r.x - r.lastPos[0], r.y - r.lastPos[1]) < 6) { r.stuck++; if (r.stuck > 2 || Math.hypot(r.x - DQ.S.hero.x, r.y - DQ.S.hero.y) > 18 * T) { b.x = gx; b.y = gy; r.stuck = 0; } else { r.path = null; if (b.onGround) b.jump(180); } } r.lastPos = [r.x, r.y]; }
      } else { b.vx = b.vy = 0; r.arrived = true; }
    }
  }
  b.update(dt, w.map); r.x = b.x; r.y = b.y;
  // sleeping pose
  const sleeping = (hr >= 21 || hr < 5.5) && r.arrived && r.bed && !siege;
  if (r.def.blob) r.rig.update(dt, { squash: sleeping ? .2 : Math.hypot(b.vx, b.vy) > 4 ? Math.sin(r.t * 14) * .12 : Math.sin(r.t * 2) * .05, look: [Math.cos(r.face), Math.sin(r.face)], walk: Math.hypot(b.vx, b.vy) > 4 ? 1 : 0 });
  else r.rig.update(dt, { x: r.x, y: r.y, z: b.z, vx: b.vx, vy: b.vy, facing: r.face, hurt: r.flash > 0, pose: sleeping ? 'down' : r.hi > 0 ? 'wave' : r.pose || null, down: sleeping ? 1 : 0, expr: r.hi > 0 ? 'smile' : null, attack: r.swing > 0 ? E.move('overhead', 1 - r.swing / .35) : null });
  if (r.swing > 0) r.swing -= dt;
  r.sleeping = sleeping;
}
// per-day needs → Cheer bubbles
DQ.residentsDaily = function (kind) {
  const S = DQ.S; if (!S.town.planted) return;
  for (const r of S.residents) {
    if (kind === 'morning') {
      if (r.sleeping || r.bed) { r.hi = 2; if (r.bed) DQ.spawnBubble(r, 'slept in a bed'); r.bed = null; }
      const fav = DQ.roomCount(r.def.fav) > 0; if (fav) DQ.spawnBubble(r, 'loves their ' + r.def.fav); else DQ.balloon(r, 'dots', 4);
      gift(r);
    }
    if (kind === 'supper') { const mh = DQ.roomCount('Mess Hall') > 0; if (mh) DQ.spawnBubble(r, 'enjoyed supper'); }
  }
};
function gift(r) {
  const S = DQ.S; const items = { wren: [['branch', 2], ['straw', 1]], lintwick: [['lint', 2]], marigold: DQ.roomCount('Kitchen') ? [['crumpet', 2]] : [], selvage: DQ.roomCount('Smithy') ? [['copperthread', 1]] : [], mortimer: [] }[r.id] || [];
  const chest = S.world.list.find(o => o.type === 'chest' && (o.townChest || !S.town.chestId)); if (!items.length) return;
  for (const [id, n] of items) { if (chest) { chest.items = chest.items || []; const e = chest.items.find(i => i.id === id); if (e) e.n += n; else if (chest.items.length < 20) chest.items.push({ id, n }); } else DQ.spawnDrop(r.x, r.y, 10, id, n); }
  if (items.length && DQ.chance(.5, 'npc')) DQ.balloon(r, 'note');
}
DQ.spawnBubble = function (r, why) {
  const S = DQ.S; if (S.bubbles.length > 12) return; S.bubbles.push({ x: r.x + (DQ.rng('npc')() - .5) * 8, y: r.y + 4, z: 34, t: 0, id: r.id, why, val: 5 });
};
DQ.bubblesTick = function (dt) {
  const S = DQ.S, h = S.hero;
  for (const b of S.bubbles) { b.t += dt; if (!b.fly && Math.hypot(h.x - b.x, h.y - b.y) < T * 2 && h.hp > 0) { b.fly = true; } if (b.fly) { b.z += 60 * dt; b.done = b.z > 80; if (b.done) { DQ.addCheer(b.val, 'bubble'); A().sfx('ding'); DQ.toast('+' + b.val + ' Cheer', '#ff9ac8'); } } }
  S.bubbles = S.bubbles.filter(b => !b.done);
};
DQ.arriveResident = function (id) {
  const S = DQ.S; if (S.flags['arrived_' + id]) return; S.flags['arrived_' + id] = 1;
  const t = S.town; const sx = Math.min(S.world.W - 3, t.x + 12), sy = t.y;
  const p = S.world.nearestWalkable(sx, sy, 6) || [t.x, t.y + 3]; const r = DQ.makeResident(id, cellC(p[0]), cellC(p[1]));
  ev.emit('arrive', { id, r });
  return r;
};
DQ.arrivalsTick = function () { const S = DQ.S; if (S.mode !== 'story' || !S.town.planted || S.cut) return; for (const a of DQ.ARRIVALS) if (!S.flags['arrived_' + a.id] && a.when()) { DQ.startCutscene && DQ.startCutscene('arrive', a.id); break; } };

// ---------- objects behaviour ----------
DQ.objectsTick = function (dt) {
  const S = DQ.S, w = S.world, h = S.hero;
  const actors = [h, ...S.residents.filter(r => r.ko <= 0)];
  for (const o of w.list) {
    if (o.flash) o.flash = Math.max(0, o.flash - dt);
    const def = DQ.OBJECTS[o.type];
    if (def.door) {
      const cx = cellC(o.x), cy = cellC(o.y); const near = actors.some(a => Math.hypot(a.x - cx, a.y - cy) < T * 1.25);
      if (near !== o.open) { o.open = near; w.syncCell(o.x, o.y); A().sfx('door', { vol: .25 }); }
      o.openT += ((o.open ? 1 : 0) - o.openT) * Math.min(1, dt * 12);
    }
    if (def.portal && !S.stats.discovered[o.key || o.extraKey] && Math.hypot(h.x - cellC(o.x), h.y - cellC(o.y)) < T * 1.8) { const k = o.key; if (k && !S.stats.discovered[k]) { S.stats.discovered[k] = 1; DQ.toast('Portal attuned: ' + o.name, '#a0c8ff'); A().sfx('harp'); DQ.popup('portal', 'Bobbin Portal attuned', o.name, {}); } }
    if (def.ballista && S.siege.phase !== 'none' && o.type === 'ballista' && !(h.mount === o)) {
      o.cd = (o.cd || 4) - dt;
      if (o.cd <= 0) {
        let best = null, bd = 10 * T; for (const m of S.monsters) { if (m.hp <= 0 || m.def.boss) continue; const d = Math.hypot(m.x - cellC(o.x), m.y - cellC(o.y)); if (d < bd) { bd = d; best = m; } }
        if (best) { o.cd = 5; const a = Math.atan2(best.y - cellC(o.y), best.x - cellC(o.x)); o.aim = a; DQ.shoot({ x: cellC(o.x), y: cellC(o.y), z: 16, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, team: 'player', dmg: 20, life: 1.2, kind: 'spool', r: 3 }); A().sfx('twang'); }
      }
    }
  }
  S.bannerFlash = Math.max(0, (S.bannerFlash || 0) - dt);
};
DQ.ballistaAim = function (dt, intent) {
  const S = DQ.S, h = S.hero, o = h.mount; if (!o || !S.world.objs.has(S.world.idx(o.x, o.y))) { h.mount = null; return; }
  const cx = cellC(o.x), cy = cellC(o.y); h.x = cx - Math.cos(o.facing) * 9; h.y = cy - Math.sin(o.facing) * 9; h.vx = h.vy = 0;
  let want = o.aim == null ? o.facing : o.aim;
  const m = intent.mx, n = intent.my;
  if (intent.aim != null) want = intent.aim; else if (Math.hypot(m, n) > .2) want = Math.atan2(n, m);
  // aim-assist within a cone
  let best = null, bd = 1e9; for (const mo of S.monsters) { if (mo.hp <= 0) continue; const a = Math.atan2(mo.y - cy, mo.x - cx), dd = Math.abs(E.angDiff ? E.angDiff(a, want) : Math.atan2(Math.sin(a - want), Math.cos(a - want))); if (dd < .21 && dd < bd) { bd = dd; best = a; } }
  const target = best != null ? best : want; const df = Math.atan2(Math.sin(target - (o.aim == null ? o.facing : o.aim)), Math.cos(target - (o.aim == null ? o.facing : o.aim)));
  o.aim = (o.aim == null ? o.facing : o.aim) + df * Math.min(1, dt * 10); h.facing = o.aim;
  o.reload = Math.max(0, (o.reload || 0) - dt);
  if (intent.swingPressed && o.reload <= 0) { o.reload = 2.5; DQ.shoot({ x: cx, y: cy, z: 16, vx: Math.cos(o.aim) * 260, vy: Math.sin(o.aim) * 260, team: 'player', dmg: 30, life: 1.4, kind: 'spool', r: 3, pierce: 1 }); A().sfx('twang'); DQ.game.shake(1.5); DQ.game.particles.smoke(cx, cy, 14, 3, {}); }
  else if (intent.swingPressed) A().sfx('bump', { vol: .3 });
  if (intent.interactPressed || intent.cancel) { h.mount = null; DQ.toast('You step away from the ballista.', '#ccc'); }
};

// ---------- interaction ----------
DQ.nearInteract = function () {
  const S = DQ.S, h = S.hero, w = S.world; let best = null, bd = 1e9;
  const consider = (kind, ref, x, y, maxD) => { const d = Math.hypot(x - h.x, y - h.y); if (d < maxD && d < bd) { bd = d; best = { kind, ref, x, y }; } };
  for (const r of S.residents) if (r.ko <= 0) consider('talk', r, r.x, r.y, 26);
  const a = Math.round(h.facing / (Math.PI / 4)) * (Math.PI / 4);
  for (const o of w.list) {
    const def = DQ.OBJECTS[o.type]; const ox = cellC(o.x), oy = cellC(o.y);
    if (def.door || def.plant || def.trap) continue;
    const front = Math.hypot(ox - (h.x + Math.cos(a) * 12), oy - (h.y + Math.sin(a) * 12));
    const maxD = def.solid ? 26 : 18;
    if (Math.hypot(ox - h.x, oy - h.y) < maxD && (front < 24 || def.collect || !def.solid)) consider(def.chest ? 'chest' : def.bed ? 'bed' : def.station ? 'station' : def.portal ? 'portal' : def.collect ? 'collect' : def.ballista ? 'ballista' : o.type === 'banner' ? 'banner' : 'look', o, ox, oy, 30);
  }
  return best;
};
DQ.heroInteract = function () {
  const S = DQ.S, h = S.hero, n = DQ.nearInteract(); if (!n) return false;
  const u = DQ.ui;
  switch (n.kind) {
    case 'talk': DQ.talkTo(n.ref); break;
    case 'chest': u.open('chest', { obj: n.ref }); A().sfx('chestopen'); break;
    case 'station': u.open('craft', { station: DQ.OBJECTS[n.ref.type].station, obj: n.ref }); break;
    case 'banner': u.open('banner'); break;
    case 'bed': DQ.trySleep(n.ref); break;
    case 'portal': u.open('travel', { from: n.ref }); break;
    case 'collect': S.world.removeObj(n.ref); S.stats.buttons++; DQ.inv.add('button', 1); A().sfx('coin'); DQ.game.particles.glints(n.x, n.y, 16, 14, '#ffe060'); DQ.toast('Ancient Button ' + S.stats.buttons + '/14!', '#ffe060'); break;
    case 'ballista': h.mount = n.ref; n.ref.aim = null; DQ.toast('Aim, then fire! Gnarlgrim hates spools.', '#ffe9a0'); break;
    default: DQ.toast(DQ.OBJECTS[n.ref.type].name, '#ccc');
  }
  return true;
};
DQ.trySleep = function (bed) {
  const S = DQ.S, hr = S.clock.hour;
  if (hr >= 5 && hr < 19) { DQ.toast("It's not bedtime yet!", '#ffb070'); return; }
  if (S.monsters.some(m => m.hp > 0 && Math.hypot(m.x - S.hero.x, m.y - S.hero.y) < 8 * T)) { DQ.toast('Monsters are too close to sleep!', '#ff8a8a'); return; }
  if (['prep', 'wave', 'breather', 'boss'].includes(S.siege.phase)) { DQ.toast('No time to sleep!', '#ff8a8a'); return; }
  DQ.startCutscene && DQ.startCutscene('sleep');
};

// ---------- frame update for the world's living things ----------
DQ.creaturesTick = function (dt) {
  const S = DQ.S;
  for (const m of S.monsters) DQ.safe('mon', () => monUpdate(m, dt));
  S.monsters = S.monsters.filter(m => !(m.state === 'dead' && m.dead <= 0) && !m.remove);
  for (const r of S.residents) DQ.safe('res', () => residentUpdate(r, dt));
  DQ.safe('shots', () => DQ.shotsTick(dt));
  DQ.safe('bubbles', () => DQ.bubblesTick(dt));
};
})();
