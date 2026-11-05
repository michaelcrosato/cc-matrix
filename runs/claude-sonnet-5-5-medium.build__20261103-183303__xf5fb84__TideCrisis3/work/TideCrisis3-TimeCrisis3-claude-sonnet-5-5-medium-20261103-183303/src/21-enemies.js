// 21-enemies.js — enemy archetype registry, spawning with entry animations, the cover/peek/aim/fire state machine,
// hit volumes, and the ThreatDirector's decision for every enemy shot. Owns: sim.enemies. Reads: scene covers.
const SKIN = ['#e8b894', '#c68c5c', '#8d5a3a', '#f2cba8'];
const L = (o) => o;
def('enemy', 'deckhand', { name: 'Deckhand', hp: 1, score: 1000, ai: 'peek', exposed: [1.4, 2.2], burst: 3, gap: .12, chance: [.25, .32, .40], tel: 1.1, peeks: ['up', 'left', 'right'], look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'cap', hair: 'short', weapon: 'gun', colors: { cloth: '#2e4a7a', pants: '#2b3140', boot: '#1b1b20', hat: '#1f2a44' } } });
def('enemy', 'marine', { name: 'Marine', hp: 2, score: 1500, ai: 'peek', exposed: [1.6, 2.4], burst: 4, gap: .12, chance: [.35, .4, .45], tel: .95, peeks: ['up', 'left', 'right'], flinch: 1, look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: 'helmet', weapon: 'gun', armor: true, colors: { cloth: '#556b3a', coat: '#556b3a', pants: '#3d4a2a', plate: '#6a7d48', metal: '#4a5a34' } } });
def('enemy', 'redtide', { name: 'Red Tide', hp: 2, score: 3000, ai: 'peek', exposed: [1.2, 1.6], burst: 2, gap: .2, chance: [1, 1, 1], always: true, tel: .7, peeks: ['left', 'right'], elite: true, look: { build: 'heroic', size: 1.02, outfit: 'coat', hat: 'cap', hair: 'bald', weapon: 'gun', colors: { cloth: '#b01c2a', coat: '#b01c2a', pants: '#3a0f14', hat: '#8a1020', trim: '#ffd36a' } } });
def('enemy', 'quartermaster', { name: 'Quartermaster', hp: 1, score: 2000, ai: 'route', look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'cap', weapon: null, colors: { cloth: '#ff7a1a', pants: '#3a3a3a', hat: '#ff7a1a' } }, dropDefault: 'mg' });
def('enemy', 'grenadier', { name: 'Grenadier', hp: 2, score: 2000, ai: 'peek', exposed: [1.5, 1.9], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.2, peeks: ['up'], throws: 'grenade', look: { build: 'bulky', size: .95, outfit: 'shirt', hat: 'helmet', weapon: null, colors: { cloth: '#6a4a2a', pants: '#2b2b2b', plate: '#7a5a38' } } });
def('enemy', 'rocketeer', { name: 'Rocketeer', hp: 2, score: 2500, ai: 'peek', exposed: [2.2, 2.8], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: .8, peeks: ['up', 'left'], throws: 'rocket', look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: 'helmet', weapon: 'gun', colors: { cloth: '#30343c', coat: '#30343c', pants: '#222', metal: '#c8a020' } } });
def('enemy', 'shield', { name: 'Shield Trooper', hp: 3, score: 3000, ai: 'shield', burst: 3, gap: .15, chance: [.4, .4, .45], tel: .9, look: { build: 'bulky', size: 1.0, outfit: 'coat', hat: 'helmet', weapon: 'gun', armor: true, colors: { cloth: '#2d3340', coat: '#2d3340', plate: '#59616f', metal: '#3a414d' } } });
def('enemy', 'rusher', { name: 'Rusher', hp: 1.5, score: 2000, ai: 'rush', look: { build: 'chibi', size: 1.0, outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#d03a2a' }, weapon: 'sword', sleeves: 'none', colors: { cloth: '#c9c9c9', pants: '#5a4a38', trim: '#d03a2a' } } });
def('enemy', 'sniper', { name: 'Sniper', hp: 1, score: 3000, ai: 'peek', exposed: [3.2, 3.6], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.4, peeks: ['up'], elite: true, laser: true, look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: { style: 'pointed', color: '#4a4f5a' }, weapon: 'gun', colors: { cloth: '#4a4f5a', coat: '#4a4f5a', pants: '#2a2c33' } } });
def('enemy', 'drone', { name: 'Drone', hp: 2, score: 1500, ai: 'fly', chance: [.3, .3, .3], tel: .9, look: null });
def('enemy', 'jetski', { name: 'Jet Ski', hp: 1, score: 1500, ai: 'ski', chance: [.3, .3, .3], tel: 1.0, skiHp: 3, look: { build: 'chibi', size: .9, outfit: 'shirt', hat: 'helmet', weapon: 'gun', colors: { cloth: '#d83030', pants: '#222' } } });
def('enemy', 'gunner', { name: 'Gunner', hp: 3, score: 2500, ai: 'peek', exposed: [3, 4], burst: 6, gap: .1, chance: [.5, .5, .5], tel: 1, peeks: ['none'], look: { build: 'bulky', size: 1.0, outfit: 'shirt', hat: 'helmet', weapon: 'gun', colors: { cloth: '#3a3040', pants: '#222', plate: '#5a5a66' } } });
def('enemy', 'captor', { name: 'Captor', hp: 1, score: 5000, ai: 'peek', exposed: [.7, .7], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: .8, peeks: ['side'], headOnly: true, look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: 'cap', weapon: 'gun', colors: { cloth: '#b01c2a', coat: '#b01c2a', pants: '#3a0f14', hat: '#8a1020' } } });
def('enemy', 'civilian', { name: 'Civilian', hp: 1, score: 0, ai: 'route', civ: true, look: { build: 'chibi', size: .95, outfit: 'shirt', hair: 'long', weapon: null, colors: { cloth: '#d8b84a', pants: '#3a5a8a' } } });
def('enemy', 'hostage', { name: 'Hostage', hp: 1, score: 0, ai: 'static', civ: true, look: { build: 'chibi', size: 1, outfit: 'coat', hair: 'short', weapon: null, colors: { cloth: '#f4f4f4', coat: '#f4f4f4', pants: '#4a5a6a', hair: '#bbbbbb' } } });
def('enemy', 'target', { name: 'Cut-out', hp: 1, score: 500, ai: 'static', look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'cap', weapon: 'gun', colors: { cloth: '#8a6a3a', pants: '#6a5a3a' } } });

Object.assign(Sim.prototype, {
  coverOf(id) { return this.covers.find(c => c.id === id); },
  spawnEnemy(type, coverId, o = {}) {
    const d = reg('enemy', type); if (!d) throw new Error('no enemy ' + type);
    const cv = coverId ? this.coverOf(coverId) : null; if (coverId && !cv) throw new Error('no cover ' + coverId + ' in ' + this.sceneId);
    const base = cv ? { x: cv.x + (cv.back == null ? 12 : cv.back), y: cv.y + (o.dy || 0), z: cv.z0 || 0 } : { x: o.at ? o.at[0] : 200, y: o.at ? o.at[1] : 0, z: o.at ? o.at[2] : 0 };
    const hpm = tune.enemy.hpMul, e = { id: this.nextId++, type, x: base.x, y: base.y, z: base.z, bx: base.x, by: base.y, bz: base.z, cover: cv, st: 'hide', t: this.rr(.2, .7, 'ai'), p: 0, foot: base.z - 28, hp: (o.hp || d.hp) * hpm, maxHp: (o.hp || d.hp) * hpm, flash: 0, hurtT: 0, stagger: 0, dead: false, dying: 0, dt: 0,
      civ: !!d.civ, ai: d.ai, peek: 'up', peekDir: 1, exposedAt: null, cycles: 0, drop: o.drop || d.dropDefault, anim: 'idle', aimT: 0, burstLeft: 0, entryKind: o.entry || 'stand', skin: SKIN[this.rr(0, 4, 'skin') | 0], armor: o.armor, ally: o.ally, rail: o.rail, shield: type === 'shield', flagOnDie: o.flag, lookAt: 0, exposures: 0, size: (d.look && d.look.size) || 1 };
    if (cv && cv.peek) { const pk = d.peeks ? d.peeks.filter(k => cv.peek.includes(k) || k === 'none' || k === 'side' && (cv.peek.includes('left') || cv.peek.includes('right'))) : ['up']; e.peek = o.peek || (pk.length ? this.pick(pk, 'ai') : 'up'); }
    if (e.peek === 'left' || e.peek === 'right' || e.peek === 'side') { e.peekDir = e.peek === 'left' ? -1 : e.peek === 'right' ? 1 : (this.rng('ai') < .5 ? -1 : 1); e.peek = 'side'; }
    if (e.peek === 'none') { e.peek = 'none'; }
    if (type === 'jetski') { e.skiHp = d.skiHp; e.water = true; }
    if (type === 'drone') { e.size = 1; e.ox = base.x; e.oy = base.y; e.oz = o.z || 40; e.ph = this.rng('ai') * TAU; e.foot = e.oz; }
    if (o.route) { e.route = o.route; e.routeT = 0; e.routeDur = o.dur || Math.hypot(o.route[1][0] - o.route[0][0], o.route[1][1] - o.route[0][1]) / (o.speed || 70); e.st = 'route'; e.flee = o.flee; e.x = o.route[0][0]; e.y = o.route[0][1]; e.foot = o.route[0][2] || 0; e.z = e.foot; }
    if (d.ai === 'rush') { e.st = 'rushin'; e.x = o.from ? o.from[0] : 360; e.y = o.from ? o.from[1] : this.rr(-60, 60, 'ai'); e.foot = 0; e.z = 0; e.tgtP = this.alive().length ? this.alive()[(this.rng('ai') * this.alive().length) | 0].id : 0; e.zig = this.rng('ai') * TAU; e.t = 0; }
    if (d.ai === 'shield') { e.st = 'adv'; e.x = o.from ? o.from[0] : base.x; e.y = o.from ? o.from[1] : base.y; e.foot = base.z; e.advX = o.advance || [base.x - 80]; e.advI = 0; e.t = 1; e.shieldDown = 0; }
    if (d.ai === 'static') { e.st = 'static'; e.p = 1; e.foot = base.z; }
    if (d.ai === 'ski') { e.route = o.route; e.routeT = 0; e.routeDur = o.dur || 5; e.st = 'ski'; e.foot = (o.route[0][2] || 0); }
    if (o.entry && o.entry !== 'stand' && (d.ai === 'peek')) this.startEntry(e, o);
    if (d.ai === 'peek' && e.peek === 'none') { e.p = 1; e.foot = base.z; e.st = 'rise'; }
    if (o.t != null) e.t = o.t;
    this.enemies.push(e); this.emit('spawn', { id: e.id, type, pos: [e.x, e.y, e.z] }); return e;
  },
  startEntry(e, o) {
    const k = o.entry; e.ent = { k, t: 0, dur: 1, from: o.from || [e.bx + 100, e.by + (o.fy || 0), e.bz], to: [e.bx, e.by, e.bz], arc: 0 };
    if (k === 'run') { const dd = Math.hypot(e.ent.from[0] - e.bx, e.ent.from[1] - e.by); e.ent.dur = Math.max(.6, dd / 95); e.anim = 'run'; }
    else if (k === 'jump') { e.ent.from = o.from || [e.bx, e.by, e.bz + 48]; e.ent.dur = .55; e.anim = 'air'; }
    else if (k === 'door') { e.ent.from = o.from || [e.bx + 14, e.by, e.bz]; e.ent.dur = 1.0; e.anim = 'run'; }
    else if (k === 'vault') { e.ent.from = o.from || [e.bx + 36, e.by, e.bz]; e.ent.dur = .65; e.ent.arc = 16; e.anim = 'air'; }
    else if (k === 'roll') { e.ent.from = o.from || [e.bx + 60, e.by + 10, e.bz]; e.ent.dur = .7; e.anim = 'roll'; }
    else if (k === 'rappel') { e.ent.from = o.from || [e.bx, e.by, e.bz + 90]; e.ent.dur = 1.6; e.anim = 'climb'; }
    else if (k === 'vehicle') { e.ent.from = o.from || [e.bx + 40, e.by, e.bz + 10]; e.ent.dur = .6; e.anim = 'air'; }
    e.st = 'entry'; e.p = 1; e.foot = e.ent.from[2]; e.x = e.ent.from[0]; e.y = e.ent.from[1];
  },
  maxThreatsFor(pid) { const s = this.stage, base = s === 1 ? 1 : 2, v = Math.max(1, base + this.diff.maxT + (tune.enemy.maxThreats ? tune.enemy.maxThreats - base : 0)); return v; },
  // the ThreatDirector's decision for a burst
  decideThreat(e, d) {
    if (this.players.every(p => p.down)) return false;
    const act = this.threats.length; if (act >= this.maxThreatsFor() + (d.always ? 1 : 0)) return false;
    if (d.always) return true;
    const ch = (d.chance[this.stage - 1] || d.chance[0]) * tune.enemy.threatMul * this.diff.threat;
    return this.rng('threat') < ch;
  },
  stepEnemies(dt) {
    for (const e of this.enemies) { if (e.gone) continue; this.stepEnemy(e, dt); }
    for (let i = this.enemies.length - 1; i >= 0; i--) if (this.enemies[i].gone && this.enemies[i].dt > 3) this.enemies.splice(i, 1);
  },
  // where an enemy's head will be when fully exposed (the bot pre-aims here)
  exposedPos(e) { const cv = e.cover, w2 = cv ? (cv.w || 30) / 2 : 0; if (e.peek === 'side') return [e.bx, e.by + e.peekDir * (w2 + 7), e.bz + 24 * (e.size || 1)]; return [e.bx, e.by, e.bz + 24 * (e.size || 1)]; },
  eyePos(e) { return [e.x, e.y, e.foot + 20 * (e.size || 1)]; },
  muzzle(e) { return [e.x - 5, e.y + (e.peek === 'side' ? 0 : 0), e.foot + 15 * (e.size || 1)]; },
  stepEnemy(e, dt) {
    const d = reg('enemy', e.type);
    if (e.dead) { e.dt += dt; e.flash = Math.max(0, e.flash - dt); if (e.dt > (e.civ ? 2 : 2.2)) { e.gone = true; } if (e.deathStyle === 'flyback' && e.dt < .5) { e.x += 60 * dt; } if (e.deathStyle === 'fall' && e.cover && e.bz > 4) { e.vzf = (e.vzf || 0) - GRAV * dt; e.foot = Math.max(0, e.foot + e.vzf * dt); e.falling = e.foot > 0; } return; }
    e.flash = Math.max(0, e.flash - dt); const hurtPause = e.hurtT > 0; e.hurtT = Math.max(0, e.hurtT - dt); e.stagger = Math.max(0, e.stagger - dt);
    if (d.ai === 'peek') this.stepPeek(e, d, dt, hurtPause);
    else if (d.ai === 'route') this.stepRoute(e, d, dt);
    else if (d.ai === 'rush') this.stepRush(e, d, dt);
    else if (d.ai === 'shield') this.stepShield(e, d, dt, hurtPause);
    else if (d.ai === 'fly') this.stepDrone(e, d, dt);
    else if (d.ai === 'ski') this.stepSki(e, d, dt);
    else if (d.ai === 'static') { e.p = 1; }
    if (e.hp <= 0 && !e.dead) this.killEnemy(e, this.players[e.lastHit || 0], 0, null, 'torso');
  },
  stepPeek(e, d, dt, hurtPause) {
    if (e.st === 'entry') {
      const n = e.ent; n.t += dt; const u = clamp(n.t / n.dur, 0, 1);
      e.x = lerp(n.from[0], n.to[0], u); e.y = lerp(n.from[1], n.to[1], u);
      e.foot = n.k === 'jump' ? lerp(n.from[2], n.to[2], u * u) : n.k === 'rappel' ? lerp(n.from[2], n.to[2], u) : lerp(n.from[2], n.to[2], u) + Math.sin(u * Math.PI) * n.arc;
      if (u >= 1) { e.st = 'hide'; e.t = .15; e.p = 0; e.anim = 'land'; e.landT = .25; e.x = e.bx; e.y = e.by; e.foot = e.bz; this.emit('landed', { id: e.id }); e.p = 1; e.hideFast = 1; }
      return;
    }
    const sp = d.peeks && d.peeks[0] === 'none';
    if (e.st === 'hide') {
      e.p = Math.max(0, e.p - dt * 7); if (!hurtPause) e.t -= dt * (e.landT > 0 ? 1 : 1) / Math.max(.3, tune.enemy.reactMul);
      if (e.t <= 0) { e.st = 'rise'; e.exposures++; }
    } else if (e.st === 'rise') {
      e.p = Math.min(1, e.p + dt * 5.5);
      if (e.p >= 1) { e.st = 'aim'; e.exposedAt = this.t; e.expLeft = this.rr(d.exposed[0], d.exposed[1], 'ai') / Math.max(.3, tune.enemy.fireMul * 1 / 1); this.beginAim(e, d); }
    } else if (e.st === 'aim') {
      if (!hurtPause) { e.aimT -= dt; e.expLeft -= dt; }
      if (e.aimT <= 0) { e.st = 'fire'; e.fireT = 0; e.shot = 0; }
    } else if (e.st === 'fire') {
      e.fireT -= dt; e.expLeft -= dt;
      if (e.fireT <= 0) {
        if (e.shot < e.burstN) { this.enemyShot(e, d, e.shot); e.shot++; e.fireT = Math.max(d.gap || .1, e.shotsThreat && e.shotsThreat[e.shot - 1] ? tune.enemy.minGap : 0) / 1; }
        else { e.st = 'wait'; }
      }
    } else if (e.st === 'wait') {
      e.expLeft -= dt;
      if (e.expLeft <= 0 || d.throws && e.throwDone) { if (!sp) { e.st = 'hide'; e.t = this.rr(.5, 1.3, 'ai') / Math.max(.3, tune.enemy.fireMul); e.cycles++; e.exposedAt = null; e.throwDone = false; } else { e.st = 'rise'; e.p = 1; e.exposedAt = this.t; } }
    }
    e.landT = Math.max(0, (e.landT || 0) - dt);
    // placement from peek amount
    const cv = e.cover, w2 = cv ? (cv.w || 30) / 2 : 0;
    if (e.peek === 'side') { e.foot = e.bz; e.y = e.by + e.peekDir * (e.p * (w2 + 7) * 1); e.x = e.bx; if (cv) e.y = e.by + e.peekDir * (-w2 * .3 + e.p * (w2 * .3 + 7 + w2 * .7)); }
    else if (e.peek === 'none') { e.foot = e.bz; }
    else { e.foot = e.bz - (1 - e.p) * 30; e.x = e.bx; e.y = e.by; }
    if (e.stagger > 0 && e.p >= 1) e.x += 30 * dt;
    e.anim = e.p < .98 ? (e.st === 'hide' || e.st === 'rise' ? 'crouch' : 'stand') : (e.st === 'aim' || e.st === 'fire' ? 'point' : 'stand');
  },
  beginAim(e, d) {
    const th = this.decideThreat(e, d), burst = d.burst || 1; e.burstN = burst; e.shotsThreat = [];
    if (d.throws) { e.burstN = 1; e.aimT = d.tel * tune.enemy.telegraphMul; e.throwKind = d.throws; e.tgtPlayer = this.pickTarget(); const tr = this.tgtPose(e.tgtPlayer);
      e.shotsThreat = [true]; e.aimThreat = null; this.emit('aimglint', { id: e.id, kind: d.throws }); return; }
    if (th) {
      e.aimT = d.tel * tune.enemy.telegraphMul * (d.always && d.tel < .7 ? 1 : 1); const alive = this.alive(); const tgt = alive[(this.rng('tgt') * alive.length) | 0];
      for (let i = 0; i < burst; i++) e.shotsThreat.push(d.always ? true : i === 0);
      e.aimThreat = this.newThreat(e, d.laser ? 'sniper' : 'bullet', e.aimT, { target: tgt && tgt.id, sp: this.muzzle(e) });
      if (e.aimThreat) e.aimThreat.firstShot = true;
    } else { e.aimT = this.rr(.35, .6, 'ai') * tune.enemy.telegraphMul; for (let i = 0; i < burst; i++) e.shotsThreat.push(false); e.aimThreat = null; }
    if (d.laser) e.laserT = e.aimT;
  },
  pickTarget() { const a = this.alive(); return a.length ? a[(this.rng('tgt') * a.length) | 0].id : 0; },
  tgtPose(pid) { return this.pose(pid); },
  enemyShot(e, d, i) {
    if (d.throws) { this.launchThrown(e, d); e.throwDone = true; return; }
    const m = this.muzzle(e); this.emit('eshot', { id: e.id, from: m, kind: d.laser ? 'sniper' : 'bullet' });
    const isThreat = e.shotsThreat[i];
    if (isThreat) {
      if (i === 0 && e.aimThreat && this.threats.includes(e.aimThreat)) { /* the telegraphed impact lands at aim end */ }
      else if (i > 0 && d.always) this.newThreat(e, 'bullet', .01, { sp: m });
    } else { const p = this.players[this.pickTarget()]; const pose = this.pose(p.id); this.emit('emiss', { id: e.id, from: m, to: [pose.x + 6 + this.rr(-30, 30, 'miss'), pose.y + this.rr(-30, 30, 'miss'), pose.z + this.rr(-12, 12, 'miss')], p: p.id }); }
  },
  launchThrown(e, d) {
    const p = this.players[e.tgtPlayer != null ? e.tgtPlayer : this.pickTarget()], pose = this.pose(p.id), m = this.muzzle(e);
    if (d.throws === 'grenade') {
      const to = [pose.x + 40 + this.rr(0, 20, 'ai'), pose.y + this.rr(-10, 10, 'ai'), 0], T = this.rr(1.1, 1.4, 'ai');
      const vx = (to[0] - m[0]) / T, vy = (to[1] - m[1]) / T, vz = (to[2] - m[2] + .5 * GRAV * T * T) / T;
      const pr = { id: this.nextId++, kind: 'grenade', team: 'e', x: m[0], y: m[1], z: m[2], vx, vy, vz, g: GRAV, hp: 1, r: 6, src: e.id, tgt: p.id };
      pr.th = this.newThreat(e, 'grenade', T, { target: p.id, proj: pr.id, sp: m }); this.proj.push(pr); this.emit('throw', { id: e.id, kind: 'grenade' });
    } else {
      const to = [pose.x + 4, pose.y, pose.z - 4], dd = Math.hypot(to[0] - m[0], to[1] - m[1], to[2] - m[2]), sp = 220, T = dd / sp;
      const pr = { id: this.nextId++, kind: 'rocket', team: 'e', x: m[0], y: m[1], z: m[2], vx: (to[0] - m[0]) / T, vy: (to[1] - m[1]) / T, vz: (to[2] - m[2]) / T, g: 0, hp: 1, r: 5, src: e.id, tgt: p.id };
      pr.th = this.newThreat(e, 'rocket', T, { target: p.id, proj: pr.id, sp: m }); this.proj.push(pr); this.emit('throw', { id: e.id, kind: 'rocket' });
    }
  },
  stepRoute(e, d, dt) {
    e.routeT += dt; const u = clamp(e.routeT / e.routeDur, 0, 1), r = e.route;
    e.x = lerp(r[0][0], r[1][0], u); e.y = lerp(r[0][1], r[1][1], u); e.foot = e.z = r[0][2] || 0; e.p = 1; e.anim = d.civ && e.panic ? 'panic' : 'run';
    e.facing = Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]);
    if (u >= 1) { e.gone = true; e.dt = 4; e.escaped = true; this.emit('escaped', { id: e.id, type: e.type }); }
  },
  stepRush(e, d, dt) {
    const p = this.players[e.tgtP] && !this.players[e.tgtP].down ? this.players[e.tgtP] : this.alive()[0]; if (!p) return; const pose = this.pose(p.id);
    e.p = 1; e.foot = 0; e.t += dt; e.z = 0;
    if (e.st === 'rushin') {
      const spd = 78, dx = pose.x + 46 + this.rail * 0 - e.x, dy = pose.y - e.y + Math.sin(e.t * 5 + e.zig) * 18;
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), spd * dt); e.y += clamp(dy, -50, 50) * dt * 1.2; e.anim = 'run';
      if (Math.abs(e.x - (pose.x + 46)) < 6) { e.st = 'wind'; e.t = 0; this.emit('windup', { id: e.id }); e.slashT = this.newThreat(e, 'slash', .45 * tune.enemy.telegraphMul, { target: p.id, sp: [e.x - 6, e.y, e.foot + 16] }); if (!e.slashT) { e.st = 'back'; } }
    } else if (e.st === 'wind') { e.anim = 'windup'; e.t += 0; if (!this.threats.includes(e.slashT)) { e.st = 'slash'; e.t = 0; this.emit('slash', { id: e.id }); } }
    else if (e.st === 'slash') { e.anim = 'slash'; if (e.t > .35) { e.st = 'back'; e.t = 0; } }
    else if (e.st === 'back') { e.anim = 'run'; e.x += 90 * dt; if (e.t > 1.2) { e.st = 'rushin'; e.t = 0; } }
  },
  stepShield(e, d, dt, hurtPause) {
    const pose = this.pose(this.pickTargetStable(e)); e.p = 1; e.foot = e.bz;
    e.shieldDown = Math.max(0, (e.shieldDown || 0) - dt);
    if (e.st === 'adv') { const tx = e.advX[Math.min(e.advI, e.advX.length - 1)]; const dx = tx - e.x; e.anim = 'walk'; e.x += Math.sign(dx) * Math.min(Math.abs(dx), 26 * dt); if (Math.abs(dx) < 1) { e.advI++; e.st = 'sfire'; e.t = .5; e.anim = 'stand'; } else if (e.advI >= e.advX.length) { e.st = 'sfire'; e.t = .5; } }
    else if (e.st === 'sfire') {
      e.t -= dt; if (!e.fireStarted && e.t <= 0) { e.fireStarted = true; this.beginAim(e, d); e.aimT = Math.max(e.aimT, .5); e.st = 'saim'; }
    } else if (e.st === 'saim') { e.openT = 1; e.aimT -= dt; e.anim = 'point'; if (e.aimT <= 0) { e.st = 'sshoot'; e.shot = 0; e.fireT = 0; } }
    else if (e.st === 'sshoot') { e.fireT -= dt; if (e.fireT <= 0) { if (e.shot < e.burstN) { this.enemyShot(e, d, e.shot); e.shot++; e.fireT = d.gap; } else { e.st = 'adv'; e.fireStarted = false; e.advI = Math.min(e.advI, e.advX.length - 1); if (e.advI >= e.advX.length - 1 && Math.abs(e.x - e.advX[e.advX.length - 1]) < 1) { e.st = 'sfire'; e.t = 1.4; } e.openT = 0; } } }
    e.shieldUp = !(e.st === 'saim' || e.st === 'sshoot') && e.shieldDown <= 0;
    if (e.st === 'adv' && e.advI >= e.advX.length) { e.st = 'sfire'; e.t = .4; }
  },
  pickTargetStable(e) { return e.tgtP != null ? e.tgtP : (e.tgtP = this.pickTarget()); },
  stepDrone(e, d, dt) {
    e.ph += dt * .85; const ox = e.ox, oy = e.oy, lift = this.scene.lift ? this.rail : 0;
    e.x = ox + Math.sin(e.ph * .9) * 40; e.y = oy + Math.sin(e.ph * 1.3 + 1) * 60; e.foot = e.oz + lift + Math.sin(e.ph * 1.7) * 12; e.z = e.foot; e.p = 1; e.t -= dt;
    if (e.st !== 'zap' && e.t <= -1.8 && !e.zapping) { e.zapping = true; e.zapAt = null; const th = this.decideThreat(e, d); if (th) { const a = this.alive(); e.zapT = this.newThreat(e, 'zap', d.tel * tune.enemy.telegraphMul, { target: a[(this.rng('tgt') * a.length) | 0].id, sp: [e.x, e.y, e.foot] }); } e.zapDone = this.t + d.tel; }
    if (e.zapping && this.t > e.zapDone) { e.zapping = false; e.t = this.rr(-.4, 0, 'ai'); this.emit('eshot', { id: e.id, from: [e.x, e.y, e.foot], kind: 'zap' }); }
  },
  stepSki(e, d, dt) {
    e.routeT += dt; const u = clamp(e.routeT / e.routeDur, 0, 1), r = e.route;
    e.x = lerp(r[0][0], r[1][0], u); e.y = lerp(r[0][1], r[1][1], u); e.foot = (r[0][2] || 0) + Math.sin(e.routeT * 9) * 1.2; e.z = e.foot; e.p = 1; e.facing = Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]);
    e.t -= dt;
    if (u > .25 && u < .85 && !e.shotDone && !e.zapping) { e.zapping = true; const th = this.decideThreat(e, d); if (th) { const a = this.alive(); e.zapT = this.newThreat(e, 'bullet', d.tel * tune.enemy.telegraphMul, { target: a[(this.rng('tgt') * a.length) | 0].id, sp: [e.x, e.y, e.foot + 14] }); } e.zapDone = this.t + d.tel; }
    if (e.zapping && this.t > e.zapDone) { e.zapping = false; e.shotDone = true; this.emit('eshot', { id: e.id, from: [e.x, e.y, e.foot + 14], kind: 'bullet' }); }
    if (u >= 1) { e.gone = true; e.dt = 4; e.escaped = true; }
  },
  // ---------- hit volumes ----------
  volumes(e) {
    const s = e.size || 1, f = e.foot, d = reg('enemy', e.type), x = e.x, y = e.y, out = [];
    if (e.type === 'drone') { out.push({ k: 's', c: [x, y, f], r: 7, part: 'torso' }); return out; }
    if (e.type === 'jetski') { out.push({ k: 's', c: [x, y, f + 24 * .9], r: 4.2, part: 'head' }); out.push({ k: 'c', a: [x, y, f + 11], b: [x, y, f + 19], r: 5.2, part: 'torso' }); out.push({ k: 'box', box: { x0: x - 14, x1: x + 14, y0: y - 16, y1: y + 16, z0: f - 2, z1: f + 7 }, part: 'legs', ski: 1 }); return out; }
    if (e.p < .12 && e.peek !== 'none' && e.peek !== 'side') return out;
    if (e.peek === 'side' && e.p < .12) return out;
    const crouch = e.anim === 'crouch' ? .78 : 1;
    if (!d.headOnly || true) { out.push({ k: 's', c: [x, y, f + 24.2 * s * crouch], r: 4.3 * s, part: 'head' }); }
    if (!d.headOnly) { out.push({ k: 'c', a: [x, y, f + 12 * s * crouch], b: [x, y, f + 20 * s * crouch], r: 5.6 * s, part: 'torso' }); out.push({ k: 'c', a: [x, y, f + 1.5], b: [x, y, f + 9 * s * crouch], r: 4 * s, part: 'legs' }); }
    if (e.shield && e.shieldUp) out.unshift({ k: 'box', box: { x0: x - 9, x1: x - 5, y0: y - 9, y1: y + 9, z0: f + 2, z1: f + 24 }, part: 'shield' });
    return out;
  }
});
// dispatch hits on 'ski'
const _hitEnemy = Sim.prototype.hitEnemy;
Sim.prototype.hitEnemy = function (p, e, part, dmg, wi, pos, dir) {
  if (e.type === 'jetski') { const vol = this.volumes(e).find(v => v.ski); if (part === 'legs') { e.skiHp -= dmg; this.emit('hit', { p: p.id, id: e.id, part: 'ski', pos }); p.st.hits++; p.chain++; this.addScore(p, 100); if (e.skiHp <= 0) { this.emit('explode', { pos: [e.x, e.y, e.foot], r: 30, big: false }); this.addScore(p, 1000); this.killEnemy(e, p, 3, dir, 'torso'); } return true; } }
  return _hitEnemy.call(this, p, e, part, dmg, wi, pos, dir);
};
