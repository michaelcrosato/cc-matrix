// ===================================================================
//  GAME CORE  -  state, entities, weapons, player ship (rail + all-range), wingmen, pickups
// ===================================================================
const LEAD = 520;           // static scenery spawns this far ahead of the rail
const ENEMIES = {};         // enemy / obstacle / pickup definitions (see 52_enemies.js)
const STAGES = {};          // stage definitions (see 55_stages.js)

const G = {
  mode: 'boot', world: null, ents: [], pbs: [], ebs: [], bombs: [], t: 0, tScale: 1,
  def: null, stageId: null, rail: { s: 0, scale: 1, speed: 50, px: 0, py: 0, pos: new V3(), dir: new V3(0, 0, -1), baseScale: 1 },
  pl: null, wing: [], boss: null, events: [], evIdx: 0, later: [],
  score: 0, stageScore: 0, hits: 0, stageHits: 0, combo: 0, comboT: 0, gold: 0, lives: 3, stageTime: 0,
  cheat: false, attract: false, flags: {}, bossScale: 1, clearT: -1, deadT: -1, cp: 0, flash: 0,
  stats: { shots: 0, deflects: 0, bombsUsed: 0, wingLost: 0, deaths: 0, rescues: 0 },
  campaign: { route: 'a', total: 0, history: [] },
  killed: 0, totalSpawnedHittable: 0, arKills: 0, arTarget: 0, camRoll: 0,
};

const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _q1 = new Q4(), _e1 = new E3();
const FWD = new V3(0, 0, -1), UP = new V3(0, 1, 0);

// ---------------------------------------------------------------- rail path helpers
function pathX(s) { return G.def && G.def.path ? G.def.path.x(s) : 0; }
function pathY(s) { return G.def && G.def.path ? G.def.path.y(s) : 0; }
function railAt(s, out) { return out.set(pathX(s), pathY(s), -s); }
function railDir(s, out) { return out.set((pathX(s + 5) - pathX(s - 5)) / 10, (pathY(s + 5) - pathY(s - 5)) / 10, -1).normalize(); }
function W(atS, ox = 0, oy = 0, out = new V3()) { return out.set(pathX(atS) + ox, pathY(atS) + oy, -atS); }
function later(sec, fn) { G.later.push({ t: sec, fn }); }
function faceDir(obj, d) { _v3.copy(obj.position).sub(d); obj.lookAt(_v3); }
function toScreen(p, out = { x: 0, y: 0, vis: false }) {
  _v3.copy(p).project(R.camera);
  out.x = (_v3.x * 0.5 + 0.5) * innerWidth; out.y = (-_v3.y * 0.5 + 0.5) * innerHeight;
  out.vis = _v3.z < 1 && _v3.z > -1 && _v3.x > -1.1 && _v3.x < 1.1 && _v3.y > -1.1 && _v3.y < 1.1;
  return out;
}
function shake(a) { R.shake = Math.max(R.shake, a); }
function screenFlash(hex, a) { G.flash = a; G.flashCol = hex; }

// ---------------------------------------------------------------- entities
function spawn(kind, pos, o = {}) {
  const def = ENEMIES[kind];
  if (!def) throw new Error('unknown entity ' + kind);
  const e = {
    kind, def, cat: def.cat || 'enemy', alive: true, pos: pos.clone(), vel: new V3(), rel: new V3(), mode: 'world',
    hp: def.hp, maxHp: def.hp, r: def.r, score: def.score || 0, t: 0, flash: 0, lockable: def.lockable !== false,
    countHit: def.hit !== false, static: !!def.static,
  };
  Object.assign(e, o);
  e.maxHp = e.hp;
  if (def.build) { e.mesh = def.build(e); if (e.mesh) { e.mesh.position.copy(e.pos); G.world.add(e.mesh); } }
  if (e.cat === 'enemy' || e.cat === 'part') Phys.addKin(e, { ball: e.r + 0.4 }, GRP.ENEMY, GRP.PLAYER | GRP.PB);
  else if (e.cat === 'obst') {
    const sh = def.shape ? def.shape(e) : { ball: e.r };
    if (e.static) Phys.addFixed(e, sh, GRP.OBST, GRP.PLAYER | GRP.PB, e.quat);
    else Phys.addKin(e, sh, GRP.OBST, GRP.PLAYER | GRP.PB);
  } else if (e.cat === 'pickup') Phys.addKin(e, { ball: e.r }, GRP.PICK, GRP.PLAYER, true);
  if (e.mode === 'rel') e.rel.copy(e.pos).sub(G.rail.pos);
  if (def.init) def.init(e, o);
  G.ents.push(e);
  if (e.cat === 'enemy' && e.countHit && !e.noCount) G.totalSpawnedHittable++;
  return e;
}
function spawnRel(kind, rx, ry, rz, o = {}) {
  const p = new V3(G.rail.pos.x + rx, G.rail.pos.y + ry, G.rail.pos.z + rz);
  return spawn(kind, p, Object.assign({ mode: 'rel' }, o));
}
function addScore(base, pos, countHit = true) {
  if (!base && !countHit) return;
  G.comboT = 2.4; G.combo++;
  const mult = Math.min(4, 1 + Math.floor(G.combo / 5) * 0.5);
  const v = Math.round(base * mult);
  G.score += v; G.stageScore += v;
  if (countHit) { G.hits++; G.stageHits++; }
  if (pos && v) HUD.popup('+' + v, pos);
}
function flashMats(e) {
  const mats = e.mesh && e.mesh.userData.mats;
  if (!mats) return;
  const f = e.flash > 0 ? 0.9 : 0;
  for (const m of mats) {
    if (!m.userData.em0) m.userData.em0 = m.emissive.clone();
    if (f) m.emissive.setRGB(f, f * 0.9, f * 0.7); else m.emissive.copy(m.userData.em0);
  }
}
function damage(e, dmg, hitPos, o = {}) {
  if (!e.alive) return false;
  if (e.shield && e.shield(e)) {
    Snd.play('clink', { pan: Snd.panFor(e.pos), vol: 0.8 });
    FX.burst(hitPos || e.pos, 5, 16, 0xaaddff, 0.25, 0.3);
    return false;
  }
  e.hp -= dmg; e.flash = 0.08;
  if (e.onHit) e.onHit(e, dmg);
  FX.burst(hitPos || e.pos, 4, 14, 0xffd070, 0.3, 0.35);
  Snd.play('hitEnemy', { pan: Snd.panFor(e.pos), vol: 0.7 });
  if (e.hp <= 0) { kill(e, o); return true; }
  return false;
}
function kill(e, o = {}) {
  if (!e.alive) return;
  e.alive = false;
  if (e.kind === 'bandit' && !o.silent) G.arKills++;
  if (e.def.die) e.def.die(e, o);
  else { FX.explosion(e.pos, e.r > 3 ? 1.6 : 1); Snd.play(e.r > 3 ? 'bigExplosion' : 'explosion', { pan: Snd.panFor(e.pos) }); shake(e.r > 3 ? 0.5 : 0.15); }
  if (!o.silent) addScore(e.score, e.pos, e.countHit);
  if (e.drop && !o.silent) spawn('pickup', e.pos, { type: e.drop, mode: 'world' });
  if (e.onKill) e.onKill(e);
  if (e.wing) e.wing.chaser = null;
}
function removeEnt(e) {
  e.alive = false;
  if (e.mesh) {
    if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
    if (e.mesh.userData.mats) for (const m of e.mesh.userData.mats) m.dispose && m.dispose();
  }
  Phys.remove(e);
}

// ---------------------------------------------------------------- projectiles
const BOLT_GEO = (() => { const g = new THREE.CylinderGeometry(0.13, 0.13, 3.4, 6); g.rotateX(Math.PI / 2); return g; })();
const BOLT_GEO_BIG = (() => { const g = new THREE.CylinderGeometry(0.28, 0.28, 5.5, 8); g.rotateX(Math.PI / 2); return g; })();
const boltMats = {};
function bmat(hex, k) { const key = hex + '_' + k; return boltMats[key] || (boltMats[key] = solidGlow(hex, k)); }
function firePB(pos, dir, o = {}) {
  const b = { cat: 'pb', pos: pos.clone(), dir: dir.clone().normalize(), speed: o.speed || 300, dmg: (o.dmg || 1) * (G.attract && !o.wing ? 2.2 : 1), life: o.life || 1.5, r: o.r || 0.5, pierce: o.pierce || 0, type: o.type || 'laser', target: o.target || null, turn: o.turn || 0, alive: true, hit: new Set(), t: 0, wing: !!o.wing, delay: o.delay || 0 };
  let mesh;
  if (b.type === 'laser') { mesh = new THREE.Mesh(BOLT_GEO, bmat(o.color || 0x60e8ff, 2.2)); }
  else if (b.type === 'hyper') { mesh = new THREE.Mesh(BOLT_GEO_BIG, bmat(0x90ff80, 2.2)); const h = new THREE.Mesh(BOLT_GEO_BIG, glowMat(0xb0ff90, 0.4, true, 1.2)); h.scale.set(2.2, 2.2, 1); mesh.add(h); }
  else if (b.type === 'missile') { mesh = new THREE.Mesh(GEO.sph, bmat(0xffa040, 2.2)); mesh.scale.set(0.5, 0.5, 1.1); const h = new THREE.Mesh(GEO.sph, glowMat(0xff7020, 0.5, true, 1.2)); h.scale.setScalar(1.8); mesh.add(h); }
  else if (b.type === 'blast') { mesh = new THREE.Mesh(GEO.sph, bmat(0xfff0c0, 2.4)); mesh.scale.setScalar(1.5); const h = new THREE.Mesh(GEO.sph, glowMat(0x80c8ff, 0.5, true, 1.3)); h.scale.setScalar(2.2); mesh.add(h); }
  else { mesh = new THREE.Mesh(BOLT_GEO, bmat(o.color || 0x60e8ff, 2.2)); }
  mesh.position.copy(b.pos); faceDir(mesh, b.dir);
  G.world.add(mesh); b.mesh = mesh;
  G.pbs.push(b);
  return b;
}
function fireEB(pos, dir, o = {}) {
  const sp = o.speed || 70;
  const b = { cat: 'eb', pos: pos.clone(), vel: dir.clone().normalize().multiplyScalar(sp), dmg: o.dmg || 10, life: o.life || 6, r: 0.9, alive: true, t: 0, shootable: o.shootable !== false, score: 10, decor: !!o.decor, big: !!o.big, hp: 1, def: { die: null }, countHit: false, lockable: false };
  const scale = o.big ? 2.2 : 1;
  const g = new THREE.Group();
  const core = new THREE.Mesh(GEO.sphLo, solidGlow(o.color || 0xff3a8a, 2.2)); core.scale.setScalar(0.65 * scale);
  const halo = new THREE.Mesh(GEO.sphLo, glowMat(o.color || 0xff3a8a, 0.55, true, 1.3)); halo.scale.setScalar(1.25 * scale);
  g.add(core, halo); g.position.copy(pos);
  G.world.add(g); b.mesh = g; b.halo = halo;
  b.r = 0.9 * scale;
  if (!b.decor && b.shootable) Phys.addKin(b, { ball: 0.9 * scale + 0.3 }, GRP.EB, GRP.PB);
  G.ebs.push(b);
  Snd.play('enemyShot', { pan: Snd.panFor(pos), vol: 0.5 });
  return b;
}
function enemyShotAtPlayer(from, o = {}) {
  const pl = G.pl;
  const lead = o.lead === undefined ? 0.5 : o.lead;
  const sp = o.speed || 70;
  const d = _v1.copy(pl.pos).sub(from);
  const t = d.length() / sp;
  d.copy(pl.pos).addScaledVector(pl.vel, t * lead).sub(from);
  if (o.spread) d.add(_v2.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(o.spread * d.length() * 0.01));
  return fireEB(from, d, Object.assign({ speed: sp }, o));
}
function killEB(b, silent) {
  b.alive = false;
  if (!silent) { FX.burst(b.pos, 8, 14, 0xff60a0, 0.35, 0.4); FX.flash(b.pos, 1.8, 0xff80c0, 0.2); }
}
function updatePBs(dt) {
  const pl = G.pl;
  for (const b of G.pbs) {
    if (!b.alive) continue;
    b.t += dt; b.life -= dt;
    if (b.life <= 0) { b.alive = false; continue; }
    if (b.turn && b.target && b.target.alive) {
      _v1.copy(b.target.pos).sub(b.pos).normalize();
      b.dir.lerp(_v1, clamp(b.turn * dt * (b.t > 0.25 ? 1 : 0.25), 0, 1)).normalize();
    }
    if (b.type === 'missile') FX.spark(b.pos, _v2.set(rnd(-2, 2), rnd(-2, 2), rnd(-2, 2)), 0xffa030, 0.35, 0.5, 0, 2);
    const travel = b.speed * dt;
    const hit = Phys.ray(b.pos, b.dir, travel + b.r, ig(GRP.PB, GRP.ENEMY | GRP.EB | GRP.OBST), b.pierce ? (c) => !b.hit.has(c.handle) : undefined);
    if (hit) {
      const e = hit.ent;
      const pt = b.pos.clone().addScaledVector(b.dir, Math.max(0, hit.t));
      if (b.pierce) b.hit.add(e.collider.handle);
      if (e.cat === 'eb') { if (e.shootable) { killEB(e); addScore(10, e.pos, false); } }
      else if (e.cat === 'obst') {
        if (e.hp < 900) damage(e, b.dmg, pt);
        else { Snd.play('clink', { pan: Snd.panFor(pt), vol: 0.6 }); FX.burst(pt, 4, 12, 0xffffff, 0.2, 0.3); }
      } else damage(e, b.dmg * (e.armor ? 0.5 : 1), pt);
      if (b.type === 'missile') { FX.explosion(pt, 0.6, 0xffa030); }
      if (--b.pierce < 0) b.alive = false;
    }
    b.pos.addScaledVector(b.dir, travel);
    b.mesh.position.copy(b.pos); faceDir(b.mesh, b.dir);
    if (b.type === 'blast') b.mesh.scale.setScalar(1.5 + Math.sin(b.t * 30) * 0.2);
  }
  for (let i = G.pbs.length - 1; i >= 0; i--) if (!G.pbs[i].alive) { G.world.remove(G.pbs[i].mesh); G.pbs.splice(i, 1); }
}
function reflectEB(b) {
  const pl = G.pl;
  killEB(b, true);
  FX.ring(b.pos, 3, 0x9ae0ff, 0.3); FX.burst(b.pos, 10, 22, 0x9ae0ff, 0.3, 0.4);
  Snd.play('reflect', { pan: Snd.panFor(b.pos) });
  G.stats.deflects++;
  let best = null, bd = 1e9;
  for (const e of G.ents) {
    if (e.cat !== 'enemy' || !e.alive || !e.lockable) continue;
    const d = e.pos.distanceTo(b.pos);
    if (d < bd && (G.def.mode === 'ar' || e.pos.z < pl.pos.z)) { bd = d; best = e; }
  }
  const dir = best ? _v1.copy(best.pos).sub(b.pos).normalize().clone() : pl.aim.clone();
  firePB(b.pos, dir, { type: 'laser', color: 0xc0f0ff, dmg: 3, speed: 240, target: best, turn: best ? 4 : 0, life: 2 });
  addScore(25, b.pos, false);
  HUD.toast('DEFLECT!', 'good', 0.6);
}
function updateEBs(dt) {
  const pl = G.pl, rail = G.rail;
  for (const b of G.ebs) {
    if (!b.alive) continue;
    b.t += dt; b.life -= dt;
    if (b.life <= 0) { b.alive = false; continue; }
    const sp = b.vel.length();
    const travel = sp * dt;
    if (!b.decor && !pl.dead) {
      const dist = b.pos.distanceTo(pl.pos);
      if (pl.rollT > 0 && dist < 7.5) { reflectEB(b); continue; }
      if (G.attract && G.cheat && dist < 6) { reflectEB(b); continue; }
      const dir = _v1.copy(b.vel).normalize();
      const hit = Phys.ray(b.pos, dir, travel + b.r, ig(GRP.EB, GRP.PLAYER));
      if (hit) { hurt(b.dmg, b.pos, 'bullet'); killEB(b); continue; }
    }
    b.pos.addScaledVector(b.vel, dt);
    b.mesh.position.copy(b.pos);
    b.halo.scale.setScalar((b.big ? 2.75 : 1.25) * (1 + Math.sin(b.t * 20) * 0.12));
    if (b.body) Phys.move(b);
    if (G.def.mode === 'rail' && b.pos.z > rail.pos.z + 60) b.alive = false;
    if (b.pos.length() > 2200) b.alive = false;
  }
  for (let i = G.ebs.length - 1; i >= 0; i--) {
    const b = G.ebs[i];
    if (!b.alive) { G.world.remove(b.mesh); Phys.remove(b); G.ebs.splice(i, 1); }
  }
}

// nova bomb
function fireBomb() {
  const pl = G.pl;
  if (pl.dead || pl.bombCd > 0) return;
  if (pl.bombs <= 0 && !G.cheat) { Snd.play('uiError', { vol: 0.6 }); HUD.toast('NO BOMBS', 'bad', 0.6); return; }
  if (!G.cheat) pl.bombs--;
  pl.bombCd = 0.8; G.stats.bombsUsed++;
  const mesh = new THREE.Mesh(GEO.sph, bmat(0xffb060, 2.4)); mesh.scale.setScalar(1.1);
  const h = new THREE.Mesh(GEO.sph, glowMat(0xff8030, 0.5, true, 1.2)); h.scale.setScalar(2.4); mesh.add(h);
  G.world.add(mesh);
  const dir = pl.aim.clone();
  G.bombs.push({ pos: pl.pos.clone().addScaledVector(dir, 3), dir, speed: 150 + (G.def.mode === 'rail' ? G.rail.speed : pl.speed), t: 0, life: 0.65, mesh, alive: true });
  Snd.play('bombLaunch');
  Input.vibrate(0.3, 0.5, 200);
}
function detonateBomb(b) {
  b.alive = false;
  const p = b.pos;
  // visuals
  const shell = new THREE.Mesh(GEO.sph, glowMat(0xffd890, 0.55, true, 1.4)); shell.position.copy(p); G.world.add(shell);
  const shell2 = new THREE.Mesh(GEO.sph, glowMat(0x80c0ff, 0.35, true, 1.3)); shell2.position.copy(p); G.world.add(shell2);
  Tweens.add(1.1, (k) => { shell.scale.setScalar(2 + easeOut(k) * 70); shell.material.opacity = 0.55 * (1 - k); shell2.scale.setScalar(2 + easeOut(k) * 52); shell2.material.opacity = 0.35 * (1 - k); },
    (t) => t, () => { G.world.remove(shell, shell2); shell.material.dispose(); shell2.material.dispose(); });
  FX.ring(p, 22, 0xffe0a0, 0.9); FX.burst(p, 60, 70, 0xffc060, 1.1, 1.2);
  FX.flash(p, 30, 0xfff0d0, 0.7);
  Snd.play('nova');
  shake(0.9); screenFlash(0xfff4d8, S.reduceFlash ? 0.25 : 0.7); Input.vibrate(1, 0.8, 500);
  const R_ = 62, hits = [];
  Phys.overlap(p, R_, ig(GRP.PB, GRP.ENEMY | GRP.EB | GRP.OBST), (e) => hits.push(e));
  later(0.12, () => {
    for (const e of hits) {
      if (!e.alive) continue;
      if (e.cat === 'eb') { killEB(e); continue; }
      if (e.cat === 'obst') { if (e.hp < 900) damage(e, 12, e.pos); continue; }
      damage(e, e.isBoss ? 14 : 30, e.pos, { nova: true });
    }
  });
}
function updateBombs(dt) {
  for (const b of G.bombs) {
    if (!b.alive) continue;
    b.t += dt;
    const travel = b.speed * dt;
    const hit = Phys.ray(b.pos, b.dir, travel + 1, ig(GRP.PB, GRP.ENEMY | GRP.OBST));
    b.pos.addScaledVector(b.dir, travel);
    b.mesh.position.copy(b.pos);
    b.mesh.scale.setScalar(1.1 + Math.sin(b.t * 40) * 0.15);
    FX.spark(b.pos, _v2.set(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)), 0xffa040, 0.4, 0.9, 0, 2);
    if (hit || b.t > b.life) detonateBomb(b);
  }
  for (let i = G.bombs.length - 1; i >= 0; i--) if (!G.bombs[i].alive) { G.world.remove(G.bombs[i].mesh); G.bombs.splice(i, 1); }
}

// ---------------------------------------------------------------- player
function newPlayer() {
  const fm = buildFighter(PALETTES.fob);
  fm.group.traverse((o) => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
  const pl = {
    cat: 'player', kind: 'player', fm, mesh: fm.group, pos: new V3(), vel: new V3(), aim: new V3(0, 0, -1),
    ox: 0, oy: 0, vx: 0, vy: 0, hp: 100, maxHp: 100, wingL: true, wingR: true, bombs: 3, laser: 1,
    boostE: 100, overheat: false, boosting: false, braking: false, rollT: 0, rollDir: 1, inv: 0, stun: 0, cd: 0, bombCd: 0,
    charging: false, chargeT: 0, locks: [], lockT: 0, chargeSnd: null, dead: false, t: 0, alarmT: 0, r: 1.5,
    // all-range
    yaw: 0, pitch: 0, bankV: 0, speed: 60, man: null, tail: 0, outT: 0, q: new Q4(), heading: new V3(0, 0, -1),
    spR: new Spring(0, 90, 11), spP: new Spring(0, 90, 11), engine: null, lastBoost: false,
  };
  G.world.add(pl.mesh);
  Phys.addKin(pl, { ball: 1.5 }, GRP.PLAYER, GRP.ENEMY | GRP.EB | GRP.OBST | GRP.PICK);
  return pl;
}
function resetPlayerState(pl, full) {
  pl.hp = pl.maxHp; pl.wingL = pl.wingR = true; pl.dead = false; pl.inv = 2; pl.stun = 0;
  pl.fm.wingL.visible = pl.fm.wingR.visible = true;
  pl.boostE = 100; pl.overheat = false; pl.rollT = 0; pl.charging = false; pl.locks = []; pl.vx = pl.vy = 0;
  if (pl.chargeSnd) { pl.chargeSnd.stop(); pl.chargeSnd = null; }
  if (full) { pl.bombs = 3; pl.laser = 1; pl.maxHp = 100; pl.hp = 100; }
  else { pl.bombs = Math.max(pl.bombs, 3); }
  pl.mesh.visible = true;
}
function hurt(dmg, from, type = 'bullet') {
  const pl = G.pl;
  if (pl.dead || pl.inv > 0 || G.clearT >= 0) return;
  if (G.cheat) { FX.burst(pl.pos, 6, 14, 0x80d0ff, 0.3, 0.4); return; }
  pl.hp -= dmg;
  pl.inv = type === 'bullet' ? 0.35 : 1.1;
  shake(0.25 + dmg * 0.012);
  screenFlash(0xff3030, S.reduceFlash ? 0.12 : 0.4);
  Snd.play('hit');
  Input.vibrate(0.8, 0.6, 220);
  FX.burst(pl.pos, 14, 18, 0xff8040, 0.5, 0.6);
  HUD.damageFlash();
  G.combo = 0;
  if (Math.random() < (type === 'bullet' ? 0.14 : 0.45)) breakWing();
  if (pl.hp <= 0) { pl.hp = 0; killPlayer(); }
  else if (pl.hp < 35 && G.stageTime > 2) Radio.once('lowhp', 'bolt', pick(['Fob, you\'re smoking! Grab a shield ring!', 'Hang in there, Fob — you\'re hurting!']));
}
function breakWing() {
  const pl = G.pl;
  const side = pl.wingL && pl.wingR ? (Math.random() < 0.5 ? 'L' : 'R') : pl.wingL ? 'L' : pl.wingR ? 'R' : null;
  if (!side) return;
  const piv = side === 'L' ? pl.fm.wingL : pl.fm.wingR;
  if (side === 'L') pl.wingL = false; else pl.wingR = false;
  const wp = new V3(); piv.getWorldPosition(wp);
  const clone = piv.clone(true); clone.quaternion.copy(pl.mesh.quaternion); clone.position.copy(wp);
  piv.visible = false;
  Phys.addDebris(clone, wp, new V3(side === 'L' ? -9 : 9, 8, 6).add(pl.vel.clone().multiplyScalar(0.3)), new V3(rnd(-6, 6), rnd(-6, 6), rnd(-8, 8)), 1.4, 3.5);
  FX.explosion(wp, 0.9, 0xffc060);
  Snd.play('wing'); shake(0.5); G.stats.wingLost++;
  HUD.toast(side === 'L' ? 'LEFT WING LOST' : 'RIGHT WING LOST', 'bad', 1.4);
  Radio.say('bolt', pick(['You lost a wing! Find a wrench!', 'Your wing\'s gone — watch your turns!']));
}
function repairWings() {
  const pl = G.pl;
  if (pl.wingL && pl.wingR) return false;
  pl.wingL = pl.wingR = true; pl.fm.wingL.visible = pl.fm.wingR.visible = true;
  FX.ring(pl.pos, 6, 0xffffff, 0.5);
  return true;
}
function killPlayer() {
  const pl = G.pl;
  pl.dead = true; pl.mesh.visible = false;
  FX.explosion(pl.pos, 2.4, 0xffa040); FX.flash(pl.pos, 20, 0xffffff, 0.6);
  Snd.play('bigExplosion'); shake(1); Input.vibrate(1, 1, 600);
  if (pl.chargeSnd) { pl.chargeSnd.stop(); pl.chargeSnd = null; }
  G.deadT = 0; G.stats.deaths++;
  Radio.say('kestrel', 'FOB! ... No!');
}

function aimAssistDir(origin, dir, coneDeg = 6, range = 320) {
  if (!S.aimAssist && !G.attract) return dir;
  const cosMin = Math.cos(coneDeg * Math.PI / 180);
  let best = null, bs = cosMin;
  for (const e of G.ents) {
    if (e.cat !== 'enemy' || !e.alive || !e.lockable) continue;
    _v1.copy(e.pos).sub(origin);
    const d = _v1.length();
    if (d < 15 || d > range) continue;
    const c = _v1.dot(dir) / d;
    if (c > bs) { bs = c; best = e; }
  }
  if (!best) return dir;
  _v1.copy(best.pos).sub(origin).normalize();
  return dir.clone().lerp(_v1, 0.65).normalize();
}

function playerShoot() {
  const pl = G.pl, fm = pl.fm;
  let muz = [];
  const both = pl.wingL && pl.wingR;
  if (pl.laser === 1) muz = [new V3(0, 0, -3.2)];
  else {
    if (pl.wingL) muz.push(new V3(-2.95, -0.08, -1.3));
    if (pl.wingR) muz.push(new V3(2.95, -0.08, -1.3));
    if (!muz.length) muz = [new V3(0, 0, -3.2)];
  }
  const hyper = pl.laser >= 3 && both;
  for (const m of muz) {
    const o = pl.mesh.localToWorld(m.clone());
    const dir = aimAssistDir(o, pl.aim);
    firePB(o, dir, hyper ? { type: 'hyper', dmg: 2.6, pierce: 1, speed: 340, r: 0.8, life: 1.3 } : { type: 'laser', dmg: 1, speed: 320, color: pl.laser > 1 ? 0x70f0ff : 0x60e8ff });
  }
  pl.cd = hyper ? 0.16 : 0.14;
  G.stats.shots++;
  Snd.play(hyper ? 'hyper' : muz.length > 1 ? 'laser2' : 'laser', { vol: 0.8 });
  for (const m of muz) FX.spark(pl.mesh.localToWorld(m.clone()), pl.vel, 0xa0f0ff, 0.12, 0.7, 0, 0);
}

function updateCharge(dt, a) {
  const pl = G.pl;
  if (a.chargeDown && !pl.charging && !pl.dead) {
    pl.charging = true; pl.chargeT = 0; pl.locks = []; pl.lockT = 0.2;
    pl.chargeSnd = Snd.charge();
  }
  if (!pl.charging) return;
  pl.chargeT += dt;
  pl.lockT -= dt;
  if (pl.chargeT > 0.25 && pl.lockT <= 0 && pl.locks.length < 8) {
    pl.lockT = 0.13;
    let best = null, bs = Math.cos(0.3);
    for (const e of G.ents) {
      if (e.cat !== 'enemy' || !e.alive || !e.lockable || pl.locks.includes(e)) continue;
      _v1.copy(e.pos).sub(pl.pos);
      const d = _v1.length();
      if (d < 20 || d > 360) continue;
      if (G.def.mode === 'rail' && e.pos.z > pl.pos.z) continue;
      const c = _v1.dot(pl.aim) / d;
      if (c > bs) { bs = c; best = e; }
    }
    if (best) { pl.locks.push(best); Snd.play('lock', { n: pl.locks.length }); }
  }
  // charge glow at nose
  if (Math.random() < 0.8) FX.spark(pl.mesh.localToWorld(new V3(0, 0, -3.4)), _v2.set(rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)), 0x80e0ff, 0.25, 0.5 + Math.min(1.2, pl.chargeT), 0, 3);
  if (pl.chargeT > 3.2 || !a.charge || pl.dead) releaseCharge();
}
function releaseCharge() {
  const pl = G.pl;
  if (!pl.charging) return;
  pl.charging = false;
  if (pl.chargeSnd) { pl.chargeSnd.stop(); pl.chargeSnd = null; }
  const origin = pl.mesh.localToWorld(new V3(0, 0, -3.4));
  if (pl.locks.length) {
    const locks = pl.locks.slice(); pl.locks = [];
    locks.forEach((t, i) => later(i * 0.07, () => {
      if (pl.dead) return;
      const o = pl.mesh.localToWorld(new V3(0, 0, -3.2));
      const d = pl.aim.clone().add(new V3(rnd(-0.5, 0.5), rnd(-0.1, 0.6), 0)).normalize();
      firePB(o, d, { type: 'missile', dmg: 3.4, speed: 170, turn: 7, target: t.alive ? t : null, life: 3, r: 0.8 });
      Snd.play('missile', { pan: Snd.panFor(o) });
    }));
    G.stats.shots += locks.length;
  } else if (pl.chargeT > 0.7) {
    const dmg = pl.chargeT > 1.6 ? 12 : 7;
    firePB(origin, aimAssistDir(origin, pl.aim, 4), { type: 'blast', dmg, pierce: 4, speed: 230, r: 2, life: 2 });
    Snd.play('chargeFire'); shake(0.15);
  }
  pl.chargeT = 0; pl.cd = 0.25;
}
function lowHealthAlarm(dt) {
  const pl = G.pl;
  if (pl.hp < 30 && !pl.dead) { pl.alarmT -= dt; if (pl.alarmT <= 0) { pl.alarmT = 0.9; Snd.play('alarm', { vol: 0.8 }); } }
}

// ---------------------------------------------------------------- rail-mode player & camera
function updatePlayerRail(dt, a) {
  const pl = G.pl, def = G.def, rail = G.rail;
  pl.t += dt;
  pl.inv = Math.max(0, pl.inv - dt); pl.rollT = Math.max(0, pl.rollT - dt); pl.stun = Math.max(0, pl.stun - dt);
  pl.cd -= dt; pl.bombCd -= dt;
  if (pl.dead) { rail.scale = damp(rail.scale, 0.2, 2, dt); advanceRail(dt); return; }
  const lockedIn = G.clearT >= 0;
  const wantBoost = a.boost > 0.3 && !pl.overheat && pl.boostE > 0 && !lockedIn;
  const wantBrake = a.brake > 0.3 && !wantBoost && !lockedIn;
  if (wantBoost) { pl.boostE -= 32 * dt; if (pl.boostE <= 0) { pl.boostE = 0; pl.overheat = true; HUD.toast('BOOST OVERHEAT', 'bad', 0.8); } }
  else pl.boostE = Math.min(100, pl.boostE + (wantBrake ? 32 : 17) * dt);
  if (pl.overheat && pl.boostE > 40) pl.overheat = false;
  if (G.cheat) { pl.boostE = 100; pl.overheat = false; }
  if (wantBoost && !pl.lastBoost) { Snd.play('boost'); Input.vibrate(0.2, 0.6, 300); }
  if (wantBrake && !pl.braking) Snd.play('brake', { vol: 0.7 });
  pl.lastBoost = wantBoost; pl.boosting = wantBoost; pl.braking = wantBrake;
  rail.scale = damp(rail.scale, wantBoost ? 1.75 : wantBrake ? 0.5 : 1, 3.5, dt);

  const bank = (a.bankL ? -1 : 0) + (a.bankR ? 1 : 0);
  pl.bank = damp(pl.bank || 0, bank, 12, dt);
  const wf = (pl.wingL ? 1 : 0.8) * (pl.wingR ? 1 : 0.8);
  const maxV = (def.lat || 30) * (1 + 0.55 * Math.abs(bank)) * wf;
  const ctl = pl.stun > 0 ? 0.15 : lockedIn ? 0 : 1;
  const tvx = a.move.x * maxV * ctl, tvy = a.move.y * maxV * 0.85 * ctl;
  if ((a.rollL || a.rollR) && pl.rollT <= 0 && !lockedIn) {
    pl.rollT = 0.62; pl.rollDir = a.rollL ? -1 : 1; pl.vx += pl.rollDir * 34;
    Snd.play('roll'); FX.ring(pl.pos, 5, 0x9ae0ff, 0.4);
  }
  pl.vx = damp(pl.vx, tvx, a.move.x ? 8 : 5.5, dt);
  pl.vy = damp(pl.vy, tvy, a.move.y ? 8 : 5.5, dt);
  pl.ox += pl.vx * dt; pl.oy += pl.vy * dt;
  const bx = def.bx || 26, y0 = def.by0 === undefined ? -9 : def.by0, y1 = def.by1 === undefined ? 14 : def.by1;
  if (pl.ox > bx) { pl.ox = bx; if (pl.vx > 0) pl.vx = 0; } else if (pl.ox < -bx) { pl.ox = -bx; if (pl.vx < 0) pl.vx = 0; }
  if (pl.oy > y1) { pl.oy = y1; if (pl.vy > 0) pl.vy = 0; }
  if (pl.oy < y0) {
    if (pl.vy < -8 && def.ground && Math.random() < 0.6) FX.spark(pl.pos.clone().add(_v2.set(0, -1, 2)), _v3.set(rnd(-6, 6), rnd(3, 9), rnd(8, 20)), 0xffc060, 0.3, 0.5, 20, 1);
    pl.oy = y0; if (pl.vy < 0) pl.vy = 0;
  }
  if (!lockedIn && G.cleared !== true) advanceRail(dt);
  const prev = _v1.copy(pl.pos);
  pl.pos.set(rail.px + pl.ox, rail.py + pl.oy, -rail.s + (pl.oz || 0));
  pl.vel.copy(pl.pos).sub(prev).divideScalar(Math.max(dt, 1e-4));
  const rd = railDir(rail.s, new V3());
  pl.aim.copy(rd);
  // pose
  const rollAnim = pl.rollT > 0 ? pl.rollDir * -TAU * easeInOut(1 - pl.rollT / 0.62) : 0;
  pl.spR.t = -pl.vx * 0.022 - pl.bank * 0.95;
  pl.spP.t = pl.vy * 0.012 + Math.atan2(rd.y, 1);
  pl.mesh.position.copy(pl.pos);
  const yaw = -Math.atan2(rd.x, 1) - pl.vx * 0.006;
  pl.mesh.rotation.set(pl.spP.step(dt), yaw, pl.spR.step(dt) + rollAnim, 'YXZ');
  poseFighter(pl, dt, wantBoost, wantBrake);
  playerControls(dt, a);
  FX_engine(pl, wantBoost);
}
function advanceRail(dt) {
  const rail = G.rail;
  rail.speed = G.def.speed * rail.scale * rail.baseScale;
  rail.s += rail.speed * dt;
  rail.px = pathX(rail.s); rail.py = pathY(rail.s);
  rail.pos.set(rail.px, rail.py, -rail.s);
}
function poseFighter(pl, dt, boost, brake) {
  const fm = pl.fm;
  const fold = boost ? 0.32 : brake ? -0.18 : 0;
  pl.wf = damp(pl.wf || 0, fold, 8, dt);
  fm.wingL.rotation.y = pl.wf; fm.wingR.rotation.y = -pl.wf;
  fm.wingL.rotation.z = -Math.abs(pl.wf) * 0.3; fm.wingR.rotation.z = Math.abs(pl.wf) * 0.3;
  const gs = boost ? 2.2 : brake ? 0.4 : 1;
  pl.gs = damp(pl.gs || 1, gs, 8, dt);
  for (let i = 0; i < fm.glows.length; i++) { if (i % 2) fm.glows[i].scale.set(0.2 * pl.gs, 1.4 * pl.gs, 0.2 * pl.gs); else fm.glows[i].scale.setScalar(0.28 * (0.8 + 0.4 * pl.gs)); }
  // flicker while invulnerable
  pl.mesh.visible = !pl.dead && (pl.inv <= 0 || Math.floor(pl.t * 18) % 2 === 0 || pl.inv > 1.2 && pl.inv > 99);
}
function FX_engine(pl, boost) {
  for (const sx of [-0.95, 0.95]) {
    const p = pl.mesh.localToWorld(new V3(sx, 0, 2.0));
    FX.spark(p, _v2.copy(pl.vel).multiplyScalar(-0.15).add(_v3.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1))), boost ? 0xa0e8ff : 0x5ad0ff, boost ? 0.35 : 0.18, boost ? 0.9 : 0.5, 0, 1);
  }
  if (boost) {
    // speed streaks around the camera
    const c = R.camera.position;
    FX.spark(_v1.set(c.x + rnd(-30, 30), c.y + rnd(-18, 18), c.z - rnd(10, 60)), _v2.set(0, 0, 160), 0xffffff, 0.25, 0.35, 0, 0, 0.9);
  }
}
function playerControls(dt, a) {
  const pl = G.pl;
  updateCharge(dt, a);
  if (!pl.charging && pl.cd <= 0 && !pl.dead && G.clearT < 0 && ((S.autoFire || G.attract) ? a.fire : a.fireDown)) playerShoot();
  if (a.bomb && !pl.dead && G.clearT < 0) fireBomb();
  lowHealthAlarm(dt);
}
const _camT = new V3(), _camL = new V3();
function updateCameraRail(dt) {
  const pl = G.pl, rail = G.rail, cam = R.camera;
  const rd = railDir(rail.s, _v1);
  const px = rail.px + pl.ox * 0.55, py = rail.py + pl.oy * 0.5 + 4.4;
  _camT.set(px - rd.x * 17.5, py - rd.y * 17.5, -rail.s + 17.5);
  if (G.camMode === 'clear') { /* handled by clear sequence */ }
  else {
    if (!cam.userData.init) { cam.position.copy(_camT); cam.userData.init = true; }
    cam.position.lerp(_camT, 1 - Math.exp(-9 * dt));
    _camL.set(rail.px + pl.ox * 0.85, rail.py + pl.oy * 0.8 + 0.6, -rail.s - 42);
    cam.lookAt(_camL);
    cam.rotateZ(-pl.vx * 0.0045 - (pl.bank || 0) * 0.05);
  }
  const fovT = S.fov + (pl.boosting ? 14 : pl.braking ? -7 : 0) + (pl.rollT > 0 ? 3 : 0);
  cam.fov = damp(cam.fov, fovT, 5, dt); cam.updateProjectionMatrix();
}

// ---------------------------------------------------------------- all-range player & camera
function updatePlayerAR(dt, a) {
  const pl = G.pl, def = G.def;
  pl.t += dt;
  pl.inv = Math.max(0, pl.inv - dt); pl.rollT = Math.max(0, pl.rollT - dt); pl.stun = Math.max(0, pl.stun - dt);
  pl.cd -= dt; pl.bombCd -= dt;
  if (pl.dead) return;
  const lockedIn = G.clearT >= 0;
  const wantBoost = a.boost > 0.3 && !pl.overheat && pl.boostE > 0 && !lockedIn;
  const wantBrake = a.brake > 0.3 && !wantBoost && !lockedIn;
  if (wantBoost) { pl.boostE -= 30 * dt; if (pl.boostE <= 0) { pl.boostE = 0; pl.overheat = true; HUD.toast('BOOST OVERHEAT', 'bad', 0.8); } }
  else pl.boostE = Math.min(100, pl.boostE + (wantBrake ? 30 : 16) * dt);
  if (pl.overheat && pl.boostE > 40) pl.overheat = false;
  if (G.cheat) { pl.boostE = 100; pl.overheat = false; }
  if (wantBoost && !pl.lastBoost) { Snd.play('boost'); Input.vibrate(0.2, 0.6, 300); }
  if (wantBrake && !pl.braking) Snd.play('brake', { vol: 0.7 });
  pl.lastBoost = wantBoost; pl.boosting = wantBoost; pl.braking = wantBrake;
  const baseSp = def.speed || 62;
  pl.speed = damp(pl.speed, baseSp * (wantBoost ? 1.7 : wantBrake ? 0.5 : 1), 3, dt);

  const bank = (a.bankL ? -1 : 0) + (a.bankR ? 1 : 0);
  pl.bank = damp(pl.bank || 0, bank, 12, dt);
  const wf = (pl.wingL ? 1 : 0.85) * (pl.wingR ? 1 : 0.85);
  const ctl = pl.stun > 0 ? 0.2 : lockedIn ? 0.15 : 1;
  const maneuvering = !!pl.man;
  let my = a.move.y * (S.flightPitch ? -1 : 1);
  const yawRate = 1.35 * (1 + 0.75 * Math.abs(bank)) * wf, pitchRate = 1.15 * wf;
  if (!maneuvering) {
    pl.yaw -= a.move.x * yawRate * dt * ctl;
    pl.yaw -= bank * 0.9 * dt * 0.0; // bank only widens the turn rate
    pl.pitch += my * pitchRate * dt * ctl;
    pl.pitch = clamp(pl.pitch, -1.3, 1.3);
    pl.bankV = damp(pl.bankV, -a.move.x * 0.9 - bank * 0.7, 6, dt);
    // roll maneuver
    if ((a.rollL || a.rollR) && pl.rollT <= 0 && !lockedIn) { pl.rollT = 0.62; pl.rollDir = a.rollL ? -1 : 1; Snd.play('roll'); FX.ring(pl.pos, 5, 0x9ae0ff, 0.4); }
    if (a.maneuver && !lockedIn) {
      pl.man = { type: a.uturnHeld ? 'uturn' : 'somer', t: 0, dur: a.uturnHeld ? 1.25 : 1.05 };
      pl.manQ = new Q4().setFromEuler(new E3(pl.pitch, pl.yaw, 0, 'YXZ'));
      pl.manYaw = pl.yaw; pl.manPitch = pl.pitch;
      Snd.play('uturn');
    }
  }
  let q;
  if (pl.man) {
    const m = pl.man; m.t += dt;
    const k = clamp(m.t / m.dur, 0, 1);
    let th, ph = 0;
    if (m.type === 'uturn') { th = Math.PI * easeInOut(clamp(k / 0.72, 0, 1)); ph = Math.PI * easeInOut(clamp((k - 0.62) / 0.38, 0, 1)); }
    else th = TAU * easeInOut(k);
    q = pl.manQ.clone().multiply(new Q4().setFromAxisAngle(new V3(1, 0, 0), th)).multiply(new Q4().setFromAxisAngle(new V3(0, 0, 1), ph));
    pl.inv = Math.max(pl.inv, 0.15);
    if (k >= 1) {
      if (m.type === 'uturn') { pl.yaw = pl.manYaw + Math.PI; pl.pitch = -pl.manPitch; } else { pl.yaw = pl.manYaw; pl.pitch = pl.manPitch; }
      pl.man = null; pl.bankV = 0;
    }
  } else {
    const rollAnim = pl.rollT > 0 ? pl.rollDir * -TAU * easeInOut(1 - pl.rollT / 0.62) : 0;
    pl.spR.t = pl.bankV;
    q = new Q4().setFromEuler(new E3(pl.pitch, pl.yaw, pl.spR.step(dt) + rollAnim, 'YXZ'));
  }
  pl.q.copy(q);
  pl.mesh.quaternion.copy(q);
  const fwd = _v1.set(0, 0, -1).applyQuaternion(q);
  pl.aim.copy(fwd);
  const prev = pl.pos.clone();
  pl.pos.addScaledVector(fwd, pl.speed * dt);
  // arena bounds
  const dist = Math.hypot(pl.pos.x, pl.pos.z);
  const out = dist > (def.arena || 420) || pl.pos.y > 190 || pl.pos.y < -140;
  if (out) {
    pl.outT += dt;
    const targetYaw = Math.atan2(pl.pos.x, pl.pos.z);
    let d = targetYaw - pl.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (G.attract) { pl.yaw += clamp(d, -2.4 * dt, 2.4 * dt); pl.pitch = damp(pl.pitch, 0, 2, dt); }
    else {
      HUD.setCenterWarning('RETURN TO COMBAT AREA');
      if (pl.outT > 3 && !pl.man) {
        pl.yaw += clamp(d, -2 * dt, 2 * dt);
        pl.pitch = damp(pl.pitch, pl.pos.y > 150 ? -0.4 : pl.pos.y < -100 ? 0.4 : 0, 2, dt);
      }
    }
  } else { pl.outT = 0; HUD.setCenterWarning(null); }
  pl.vel.copy(pl.pos).sub(prev).divideScalar(Math.max(dt, 1e-4));
  pl.mesh.position.copy(pl.pos);
  poseFighter(pl, dt, wantBoost, wantBrake);
  playerControls(dt, a);
  FX_engine(pl, wantBoost);
}
const _camQ = new Q4();
function updateCameraAR(dt) {
  const pl = G.pl, cam = R.camera;
  const fwd = _v1.copy(pl.aim);
  const up = _v2.set(0, 1, 0).applyQuaternion(pl.q);
  const smoothUp = _v3.set(0, 1, 0).lerp(up, 0.15).normalize();
  const back = G.camBackOverride || 19;
  _camT.copy(pl.pos).addScaledVector(fwd, -back).addScaledVector(smoothUp, 5.2);
  if (!cam.userData.init) { cam.position.copy(_camT); cam.userData.init = true; }
  cam.position.lerp(_camT, 1 - Math.exp(-(pl.man ? 14 : 10) * dt));
  _camL.copy(pl.pos).addScaledVector(fwd, 36);
  const m = new M4().lookAt(cam.position, _camL, smoothUp);
  _camQ.setFromRotationMatrix(m);
  cam.quaternion.slerp(_camQ, 1 - Math.exp(-(pl.man ? 14 : 9) * dt));
  const fovT = S.fov + (pl.boosting ? 14 : pl.braking ? -7 : 0);
  cam.fov = damp(cam.fov, fovT, 5, dt); cam.updateProjectionMatrix();
}

// ---------------------------------------------------------------- contacts
function onContact(a, b, started) {
  if (!started) return;
  let pl = null, o = null;
  if (a.cat === 'player') { pl = a; o = b; } else if (b.cat === 'player') { pl = b; o = a; } else return;
  if (!o.alive || pl.dead) return;
  if (o.cat === 'pickup') collectPickup(o);
  else if (o.cat === 'obst') {
    if (o.def.onTouch) { o.def.onTouch(o); return; }
    hurt(o.touchDmg || o.def.touchDmg || 22, o.pos, 'crash');
    const away = _v1.copy(pl.pos).sub(o.pos);
    if (G.def.mode === 'rail') { pl.vx += sign(away.x || rnd(-1, 1)) * 20; pl.vy += sign(away.y || 0.5) * 12; pl.stun = 0.35; }
    else { pl.stun = 0.4; pl.pos.addScaledVector(away.normalize(), 3); }
    FX.explosion(pl.pos, 0.8, 0xffa040); Snd.play('explosion'); shake(0.6);
    if (o.hp < 900) damage(o, 6, o.pos);
  } else if (o.cat === 'enemy' || o.cat === 'part') {
    if (o.def.onTouch) { o.def.onTouch(o); return; }
    hurt(o.touchDmg || o.def.touchDmg || 16, o.pos, 'crash');
    if (G.def.mode === 'rail') { pl.vx += sign(pl.pos.x - o.pos.x || 1) * 14; pl.stun = 0.2; }
    if (!o.isBoss && !o.noRam) damage(o, 6, o.pos);
    shake(0.4);
  }
}
function collectPickup(p) {
  const pl = G.pl;
  p.alive = false;
  const t = p.type;
  FX.ring(p.pos, 4, 0xffffff, 0.4);
  if (t === 'silver') { pl.hp = Math.min(pl.maxHp, pl.hp + 22); Snd.play('ring'); HUD.toast('SHIELD +22', 'good', 0.8); }
  else if (t === 'health') { pl.hp = Math.min(pl.maxHp, pl.hp + 45); Snd.play('heal'); HUD.toast('SHIELD +45', 'good', 0.9); }
  else if (t === 'gold') {
    G.gold++; Snd.play('goldRing'); HUD.toast(`GOLD RING ${G.gold}/3`, 'gold', 1.1);
    if (G.gold >= 3 && !G.flags.goldDone) {
      G.flags.goldDone = true; pl.maxHp = 125; pl.hp = pl.maxHp; Snd.play('heal');
      HUD.toast('SHIELD EXPANDED! +25 MAX', 'gold', 2); G.flags.route = 'b';
      addScore(500, p.pos, false);
      if (G.def.id === 's1') Radio.say('kestrel', 'Nice flying, Fob! That gold run lit up a hidden warp lane — route B is open!');
    }
  } else if (t === 'laser') {
    if (pl.laser < 3) { pl.laser++; HUD.toast(pl.laser === 2 ? 'TWIN LASERS' : 'HYPER LASERS', 'good', 1.4); } else { addScore(300, p.pos, false); HUD.toast('LASER MAXED +300', 'good', 1); }
    Snd.play('pickup');
  } else if (t === 'bomb') { pl.bombs = Math.min(6, pl.bombs + 1); Snd.play('pickup'); HUD.toast('NOVA BOMB +1', 'good', 0.9); }
  else if (t === 'wrench') {
    if (repairWings()) { HUD.toast('WINGS REPAIRED', 'good', 1.2); Snd.play('heal'); Radio.say('newt', 'All patched up! Good as new!'); }
    else { pl.hp = Math.min(pl.maxHp, pl.hp + 20); HUD.toast('SHIELD +20', 'good', 0.8); Snd.play('ring'); }
  } else if (t === 'life') { G.lives++; Snd.play('goldRing'); HUD.toast('1UP!', 'gold', 1.4); }
}

// ---------------------------------------------------------------- wingmen
const WING_DEFS = [
  { id: 'bolt', name: 'BOLT', slot: [-11, 1.5, 7], pal: 'bolt', pitch: 270 },
  { id: 'kestrel', name: 'KESTREL', slot: [11, 2.5, 8], pal: 'kestrel', pitch: 150 },
  { id: 'newt', name: 'NEWT', slot: [0, 8, 12], pal: 'newt', pitch: 340 },
];
function makeWingmen() {
  clearWingmen();
  for (const d of WING_DEFS) {
    const fm = buildFighter(PALETTES[d.pal]);
    const w = { def: d, id: d.id, fm, mesh: fm.group, pos: new V3(), vel: new V3(), hp: 60, maxHp: 60, state: 'ok', chaser: null, t: Math.random() * 10, cd: rnd(0.3, 1), rel: new V3(...d.slot), roll: 0, rollDir: 1, out: 0, q: new Q4(), fwd: new V3(0, 0, -1), yawRate: 0 };
    w.pos.copy(G.pl.pos).add(new V3(...d.slot));
    G.world.add(w.mesh);
    G.wing.push(w);
  }
}
function clearWingmen() { for (const w of G.wing) if (w.mesh.parent) w.mesh.parent.remove(w.mesh); G.wing.length = 0; }
function wingmanById(id) { return G.wing.find((w) => w.id === id); }
function updateWingmen(dt) {
  const pl = G.pl, rail = G.rail;
  for (const w of G.wing) {
    w.t += dt; w.cd -= dt;
    if (w.state === 'gone') continue;
    if (w.state === 'down') {
      w.out += dt;
      w.pos.addScaledVector(w.vel, dt); w.vel.y += 4 * dt; w.vel.z -= 30 * dt;
      FX.spark(w.pos, _v2.set(rnd(-2, 2), rnd(-2, 2), rnd(-2, 2)), 0x403040, 0.8, 1.6, 0, 1, 0.5);
      w.mesh.position.copy(w.pos); w.mesh.rotation.z += dt * 3;
      if (w.out > 3) { w.state = 'gone'; w.mesh.visible = false; }
      continue;
    }
    const chased = w.chaser && w.chaser.alive;
    if (G.def.mode === 'rail') {
      // target in rail space
      let tx = w.def.slot[0], ty = w.def.slot[1], tz = w.def.slot[2];
      if (chased) { tx = Math.sin(w.t * 1.6) * 20 + w.def.slot[0] * 0.5; ty = 3 + Math.cos(w.t * 2.1) * 6; tz = -6; }
      else { tx += Math.sin(w.t * 0.9 + w.def.slot[0]) * 3; ty += Math.cos(w.t * 1.3) * 1.2; }
      const target = _v1.set(rail.px + pl.ox * 0.4 + tx, rail.py + ty + pl.oy * 0.3, -rail.s + tz);
      const prev = _v2.copy(w.pos);
      w.pos.lerp(target, 1 - Math.exp(-(chased ? 3.5 : 2.4) * dt));
      w.vel.copy(w.pos).sub(prev).divideScalar(Math.max(dt, 1e-4));
      w.mesh.position.copy(w.pos);
      const vx = w.vel.x;
      const rollAnim = w.roll > 0 ? w.rollDir * -TAU * easeInOut(1 - w.roll / 0.7) : 0;
      w.roll = Math.max(0, w.roll - dt);
      w.mesh.rotation.set(w.vel.y * 0.01, -vx * 0.004, -vx * 0.03 + rollAnim, 'YXZ');
      if (!chased && w.roll <= 0 && Math.random() < dt * 0.06) { w.roll = 0.7; w.rollDir = Math.random() < 0.5 ? -1 : 1; }
    } else {
      // all-range: hold a loose formation, break away when chased
      const t = w.t;
      let goal;
      if (chased) { goal = _v1.copy(pl.pos).add(_v2.set(Math.sin(t * 0.9) * 90, Math.cos(t * 0.7) * 25, Math.cos(t * 0.8) * 90)); w.speed = 70; }
      else { goal = _v1.copy(pl.pos).addScaledVector(pl.aim, 30).add(_v2.set(w.def.slot[0] * 2.2, w.def.slot[1] * 2, 0)); w.speed = pl.speed * 1.05 + 4; }
      const want = _v3.copy(goal).sub(w.pos);
      const dist = want.length();
      want.normalize();
      w.fwd.lerp(want, clamp((chased ? 2.6 : 2.0) * dt, 0, 1)).normalize();
      w.pos.addScaledVector(w.fwd, Math.min(w.speed + Math.max(0, dist - 20) * 0.4, 110) * dt);
      w.vel.copy(w.fwd).multiplyScalar(w.speed);
      w.mesh.position.copy(w.pos);
      const m = new M4().lookAt(w.pos, _v2.copy(w.pos).sub(w.fwd), UP);
      w.mesh.quaternion.slerp(_camQ.setFromRotationMatrix(m), 1 - Math.exp(-8 * dt));
    }
    FX.spark(w.mesh.localToWorld(_v2.set(0.95, 0, 2)), _v3.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)), PALETTES[w.def.pal].glow, 0.15, 0.4, 0, 1);
    FX.spark(w.mesh.localToWorld(_v2.set(-0.95, 0, 2)), _v3.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)), PALETTES[w.def.pal].glow, 0.15, 0.4, 0, 1);
    // pursuit damage
    if (chased) {
      w.hp -= (G.def.mode === 'rail' ? 5.5 : 4.5) * dt;
      if (Math.random() < dt * 3) Radio.once('help_' + w.id + Math.floor(G.stageTime / 25), w.id, pick(['Help! I\'ve got one on my tail!', `Get this guy off me, Fob!`, 'I can\'t shake him! Help!']));
      if (w.hp <= 0) wingmanDown(w);
    }
    // wingman gunnery
    if (w.cd <= 0 && !G.boss) {
      let best = null, bd = 1e9;
      for (const e of G.ents) {
        if (e.cat !== 'enemy' || !e.alive || e.isPartOfBoss) continue;
        _v1.copy(e.pos).sub(w.pos);
        const d = _v1.length();
        const ahead = G.def.mode === 'rail' ? e.pos.z < w.pos.z - 10 : _v1.dot(w.fwd) / d > 0.85;
        if (ahead && d < 240 && d < bd) { bd = d; best = e; }
      }
      if (best) {
        const o = w.mesh.localToWorld(_v2.set(0, 0, -3));
        firePB(o, _v1.copy(best.pos).sub(o).normalize(), { type: 'laser', dmg: 0.7, speed: 260, color: PALETTES[w.def.pal].glow, wing: true, life: 1.4 });
        w.cd = rnd(0.35, 0.7);
        if (Math.random() < 0.25) Snd.play('laser', { vol: 0.25, pan: Snd.panFor(w.pos) });
      } else w.cd = 0.3;
    }
  }
}
function wingmanDown(w) {
  w.state = 'down'; w.out = 0;
  w.vel.set(w.id === 'bolt' ? -10 : 10, -2, 4);
  if (w.chaser) { w.chaser.target = null; w.chaser.lost = true; }
  FX.explosion(w.pos, 1, 0xffa040); Snd.play('explosion');
  Radio.say(w.id, 'I\'m hit! Pulling out — I\'ll catch up later!');
  HUD.toast(w.def.name + ' HAS RETIRED', 'bad', 1.6);
  G.stats.wingLost++;
}
function rescueWingman(w) {
  G.stats.rescues++;
  addScore(300, w.pos, false);
  Radio.say(w.id, pick(['Thanks, Fob! I owe you one!', 'Whew! That was close — nice shot!', 'You\'re a lifesaver, Fob!']));
  HUD.toast(w.def.name + ' RESCUED +300', 'good', 1.4);
  w.hp = Math.min(w.maxHp, w.hp + 25);
}
