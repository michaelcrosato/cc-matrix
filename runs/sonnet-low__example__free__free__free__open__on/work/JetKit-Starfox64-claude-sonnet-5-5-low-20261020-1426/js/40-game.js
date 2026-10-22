// ---------- core gameplay: player, weapons, wingmen, pickups, HUD ----------
const V = THREE.Vector3;
const G = { state: 'menu', enemies: [], pshots: [], eshots: [], pickups: [], obst: [], rocks: [], wing: [], time: 0, shake: 0, cheat: false, ai: false, mission: null, P: null, mIdx: 0 };
const _a = new V(), _b = new V(), _c = new V(), _d = new V();
const FACE = { kit: ['🦊', '#ff9a3c', 'KIT'], rook: ['🐇', '#e8eef8', 'ROOK'], pip: ['🐸', '#6ad05a', 'PIP'], vex: ['🐺', '#9aa0b4', 'VEX'], hq: ['🐕', '#6aa8ff', 'COMMAND'], sys: ['ℹ', '#ffd25a', 'TIP'] };
const Radio = { q: [], cur: null, t: 0,
  say(who, text, dur) { dur = dur || Math.max(3, text.length * .055); if (this.q.length > 3) this.q.shift(); this.q.push({ who, text, dur }); },
  clear() { this.q = []; this.cur = null; $('radio').classList.remove('on'); },
  update(dt) {
    if (this.cur) { this.t -= dt; if (this.t <= 0) { this.cur = null; $('radio').classList.remove('on'); } }
    if (!this.cur && this.q.length) { const m = this.cur = this.q.shift(); this.t = m.dur; const f = FACE[m.who] || FACE.sys;
      $('r-face').textContent = f[0]; $('r-face').style.background = f[1] + '55'; $('r-face').style.borderColor = f[1]; $('r-who').textContent = f[2]; $('r-txt').textContent = m.text; $('radio').classList.add('on');
      if (m.who !== 'sys') { Audio.voice(m.who === 'vex' ? .6 : m.who === 'pip' ? 1.4 : 1); setTimeout(() => Audio.voice(m.who === 'vex' ? .6 : 1.1), 280); } else Audio.sfx('ui'); }
  } };
let bannerT = 0;
function banner(html, secs = 2.5) { const b = $('banner'); b.innerHTML = html; b.classList.add('on'); bannerT = secs; }
const segDist2 = (a, b, c) => { _c.subVectors(b, a); const l2 = _c.lengthSq(); let t = l2 > 0 ? clamp(_d.subVectors(c, a).dot(_c) / l2, 0, 1) : 0; _d.copy(a).addScaledVector(_c, t); return _d.distanceToSquared(c); };
const faceDir = (m, d) => m.lookAt(_a.copy(m.position).sub(d));
G.isRail = () => G.mission && G.mission.mode === 'rail';
G.fwd = (out) => { const P = G.P; if (G.isRail()) return out.set(0, 0, -1); return out.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)); };

function newPlayer() {
  if (G.P) GFX.scene.remove(G.P.mesh);
  const mesh = GFX.ship(); mesh.rotation.order = 'YXZ'; GFX.scene.add(mesh);
  G.P = { mesh, pos: new V(), vel: new V(), px: 0, py: 0, vx: 0, vy: 0, hp: 100, max: 100, lives: 3, bombs: 3, up: 0, boost: 100, boostCD: 0, iframes: 0, rollT: 0, rollDir: 0, flipT: 0, yaw: 0, pitch: 0, roll: 0, speed: 48, fireT: 0, side: 0, charge: 0, locks: [], lockT: 0, mq: [], bombCD: 0, dead: false, deadT: 0, camYaw: 0, camPitch: 0, visible: true, chargeSfx: 0 };
}
GFX.scene.add(new THREE.Object3D());
newPlayer();

// ---------- mission lifecycle
G.start = function (idx, opts = {}) {
  const M = MISSIONS[idx]; G.mission = M; G.mIdx = idx; G.ai = !!opts.attract; G.cheat = !!opts.attract;
  for (const l of [G.enemies, G.pshots, G.eshots, G.pickups]) for (const o of l) GFX.scene.remove(o.mesh);
  for (const o of G.obst) GFX.scene.remove(o.mesh); for (const o of G.rocks) GFX.scene.remove(o.mesh); for (const w of G.wing) GFX.scene.remove(w.mesh);
  G.enemies = []; G.pshots = []; G.eshots = []; G.pickups = []; G.obst = []; G.rocks = []; G.wing = [];
  GFX.setTheme(M.theme); newPlayer(); const P = G.P;
  Object.assign(G, { time: 0, score: 0, kills: 0, hits: 0, fired: 0, landed: 0, shake: 0, si: 0, won: false, ended: false, outT: 0, boss: null, combo: 0, comboT: 0, paused: false, wingLost: 0, objText: '', deaths: 0, timeScale: 1 });
  P.pos.set(0, M.mode === 'rail' ? 0 : 0, 0); P.px = 0; P.py = 0; P.yaw = 0; P.pitch = 0; P.camYaw = 0; P.camPitch = 0; P.speed = M.mode === 'rail' ? 48 : 55;
  G.wing = [mkWing('rook', 0xf0f0ff, 0xc23030, -1), mkWing('pip', 0xd8f0d8, 0x2f9a40, 1)];
  Radio.clear(); G.script = M.script.map(r => ({ at: r[0], cmd: r[1], args: r.slice(2) })).sort((a, b) => a.at - b.at);
  if (opts.startAt) { G.si = G.script.findIndex(s => s.at >= opts.startAt); if (G.si < 0) G.si = G.script.length; if (M.mode === 'rail') P.pos.z = -opts.startAt * 48; }
  if (M.mode === 'free') initFree(M);
  Audio.music(M.music); Audio.intensity(0);
  $('hud').classList.add('on'); $('radar').style.display = M.mode === 'free' ? 'block' : 'none'; $('h-boss').style.display = 'none';
  banner(M.name.toUpperCase() + '<small>' + M.sub + '</small>', 3);
  G.state = 'play'; Input.setAI(G.ai ? Attract.ai : null);
  GFX.updateScenery(P.pos.x, P.pos.y, P.pos.z, 0); snapCamera();
};
function mkWing(id, body, accent, side) {
  const m = GFX.ship(body, accent, 0x66ddff); m.rotation.order = 'YXZ'; GFX.scene.add(m);
  return { id, name: FACE[id][2], mesh: m, pos: new V(side * 11, 2, -6), vel: new V(), dir: new V(0, 0, -1), hp: 60, max: 60, alive: true, side, fireT: rnd(1), t: rnd(6), hitT: 0, helpT: 0 };
}
G.finish = function (success) {
  if (G.ended) return; G.ended = true; G.state = 'end';
  if (G.ai) return;
  const M = G.mission, acc = G.fired ? Math.round(G.landed / G.fired * 100) : 0, alive = G.wing.filter(w => w.alive).length, P = G.P;
  const r = G.hits / M.medal + alive * .12 + (P.hp / 100) * .15 + (G.deaths === 0 ? .1 : 0);
  const rank = r >= 1.3 ? 'S' : r >= 1.0 ? 'A' : r >= .7 ? 'B' : 'C', medal = G.hits >= M.medal;
  const best = Save.best[M.id]; if (!best || G.score > best) Save.best[M.id] = G.score; if (success && Save.unlocked < G.mIdx + 2) Save.unlocked = Math.min(MISSIONS.length, G.mIdx + 2); Save.save();
  Audio.sfx(success ? 'win' : 'lose'); Audio.music(null);
  UI.results({ success, rank, medal, M, acc, alive, time: G.time });
};
G.quit = function () {
  G.state = 'menu'; G.ai = false; G.cheat = false; Input.setAI(null); Radio.clear(); $('hud').classList.remove('on'); $('banner').classList.remove('on');
  for (const l of [G.enemies, G.pshots, G.eshots, G.pickups]) { for (const o of l) GFX.scene.remove(o.mesh); l.length = 0; }
  for (const o of G.obst) GFX.scene.remove(o.mesh); for (const o of G.rocks) GFX.scene.remove(o.mesh); for (const w of G.wing) GFX.scene.remove(w.mesh); G.obst = []; G.rocks = []; G.wing = [];
  GFX.setTheme('coast'); newPlayer(); G.mission = null; Audio.music('title');
};

// ---------- damage / death
G.hurt = function (d, src) {
  const P = G.P; if (P.dead || P.iframes > 0 || G.cheat || G.won) return;
  P.hp -= d; P.iframes = d >= 15 ? 1.4 : .7; G.shake = Math.max(G.shake, d >= 15 ? 1 : .5); $('dmg').style.opacity = 1; setTimeout(() => $('dmg').style.opacity = 0, 120); Audio.sfx('hit');
  GFX.burst(P.pos, 0xffd070, 14, 14, 1.2, .5); G.combo = 0;
  if (P.hp <= 0) G.die();
};
G.die = function () {
  const P = G.P; P.dead = true; P.deadT = 2.4; P.mesh.visible = false; GFX.explode(P.pos, 2.2); Audio.sfx('boom'); G.shake = 2; G.deaths++; P.lives--; P.up = 0; P.bombs = Math.min(P.bombs, 3);
  if (P.lives < 0) { G.state = 'over'; G.ended = true; Audio.music(null); Audio.sfx('lose'); setTimeout(() => { if (G.state === 'over') UI.gameover(); }, 1800); }
  else Radio.say('hq', 'Kit, you took a hit! Respawning your Jet — hang in there.', 3);
};
G.respawn = function () {
  const P = G.P; P.dead = false; P.hp = 100; P.iframes = 3; P.mesh.visible = true; P.rollT = 0; P.flipT = 0;
  if (!G.isRail()) { P.pos.set(rnd(-30, 30), 0, rnd(-30, 30)); P.yaw = rnd(6.28); P.pitch = 0; }
};

// ---------- enemy shots / kills
G.eshot = function (from, dir, speed, dmg = 8, color = 0xff4a3a, size = 1) {
  const m = GFX.orb(color, size); m.position.copy(from);
  G.eshots.push({ mesh: m, pos: m.position, prev: from.clone(), vel: dir.clone().normalize().multiplyScalar(speed), life: 6, dmg, r: .7 * size });
  if (G.eshots.length > 160) { const o = G.eshots.shift(); GFX.scene.remove(o.mesh); }
};
G.aimShot = function (e, speed = 62, dmg = 8, spread = 0, tgt) {
  const P = G.P, t = tgt || P; _b.copy(t.pos); const dist = _b.distanceTo(e.pos), tt = dist / speed;
  if (t === P) { if (G.isRail()) _b.z -= P.speed * tt * .9; else _b.addScaledVector(P.vel, tt * .6); } else _b.addScaledVector(t.vel, tt * .5);
  _b.sub(e.pos); if (spread) { _b.x += rnd(-spread, spread) * dist; _b.y += rnd(-spread, spread) * dist; _b.z += rnd(-spread, spread) * dist * .3; }
  G.eshot(e.pos, _b, speed, dmg); Audio.sfx('enemylaser');
};
G.damageEnemy = function (e, d) {
  if (e.dead) return; if (e.shield) { Audio.sfx('clang'); GFX.burst(e.pos, 0x88ccff, 6, 14, .8, .3); e.pulse = .3; return; }
  e.hp -= d; e.pulse = .15; G.landed++; GFX.burst(e.pos, 0xffd080, 5, 12, .8, .3);
  if (e.hp <= 0) G.kill(e);
};
G.kill = function (e) {
  if (e.dead) return; e.dead = true; const big = e.r > 4;
  GFX.explode(e.pos, big ? 2.4 : e.r > 2 ? 1.2 : .8); Audio.sfx(big ? 'boom' : 'smallboom'); G.shake = Math.max(G.shake, big ? 1.4 : .25);
  if (!e.nopts) { G.kills++; G.hits++; G.combo++; G.comboT = 2; G.score += (e.score || 100) * (1 + Math.min(G.combo, 10) * .1) | 0; }
  if (e.chasing && e.chasing.alive) { Radio.say(e.chasing.id, e.chasing.id === 'rook' ? 'Nice shooting, Kit! That was close.' : 'Phew! Thanks, Kit — I owe you one!'); e.chasing.helpT = 0; }
  if (!e.nodrop && Math.random() < (G.P.hp < 60 ? .12 : .04)) G.pickup(rpick(['ring', 'ring', 'bomb']), e.pos.x, e.pos.y, e.pos.z);
  if (e.onKill) e.onKill(e);
};
G.pickup = function (kind, x, y, z) { const m = GFX.pickup(kind); m.position.set(x, y, z); GFX.scene.add(m); G.pickups.push({ mesh: m, pos: m.position, kind, t: 0, r: 3.4 }); };
G.bomb = function () {
  const P = G.P; if (P.bombs <= 0 && !G.cheat) { Audio.sfx('back'); return; } if (P.bombCD > 0) return;
  if (!G.cheat) P.bombs--; P.bombCD = 1.4; Audio.sfx('bomb'); G.shake = 2;
  const fl = $('flash'); fl.style.transition = 'none'; fl.style.opacity = .85; requestAnimationFrame(() => { fl.style.transition = 'opacity .8s'; fl.style.opacity = 0; });
  for (let i = 0; i < 60; i++) { const a = rnd(6.28), b = Math.acos(rnd(-1, 1)); GFX.spark(P.pos.x, P.pos.y, P.pos.z, Math.sin(b) * Math.cos(a) * 160, Math.cos(b) * 160, Math.sin(b) * Math.sin(a) * 160, 0xfff0a0, 5, 1.1, .5); }
  for (const s of G.eshots) { GFX.explode(s.pos, .3); GFX.scene.remove(s.mesh); } G.eshots = [];
  for (const e of G.enemies.slice()) if (!e.dead && e.pos.distanceTo(P.pos) < 170) { G.damageEnemy(e, e.boss ? 14 : 12); e.stun = 1.2; }
};

// ---------- player update
function playerUpdate(dt) {
  const P = G.P, I = Input, rail = G.isRail();
  P.iframes = Math.max(0, P.iframes - dt); P.bombCD = Math.max(0, P.bombCD - dt);
  if (P.dead) { P.deadT -= dt; if (P.deadT <= 0 && G.state === 'play') G.respawn(); if (!rail) P.pos.addScaledVector(G.fwd(_a), P.speed * dt * .3); return; }
  const mx = I.mx, my = I.my;
  // boost / brake
  let tgt = rail ? 48 : 55; const canBoost = P.boost > 0 && P.boostCD <= 0;
  if (I.act.boost && canBoost) { tgt = rail ? 82 : 105; P.boost = Math.max(0, P.boost - 34 * dt); if (P.boost <= 0) P.boostCD = 1.5; if (!P.boosting) Audio.sfx('boost'); P.boosting = true; }
  else { P.boosting = false; P.boost = Math.min(100, P.boost + (I.act.brake ? 10 : 20) * dt); P.boostCD = Math.max(0, P.boostCD - dt); if (I.act.brake) tgt = rail ? 26 : 28; }
  if (G.won && rail) tgt = 120;
  P.speed = damp(P.speed, tgt, 3.5, dt);
  // actions
  if ((I.pressed.roll_l || I.pressed.roll_r) && P.rollT <= 0 && !G.won) { P.rollT = .62; P.rollDir = I.pressed.roll_l ? -1 : 1; Audio.sfx('roll'); if (rail) P.vx += P.rollDir * 45; else P.sideDash = P.rollDir * 40; }
  if (I.pressed.flip && P.flipT <= 0 && !G.won) { P.flipT = .9; P.iframes = Math.max(P.iframes, .9); Audio.sfx('flip'); }
  if (I.pressed.bomb && !G.won) G.bomb();
  if (rail) {
    P.vx = damp(P.vx, mx * 25, 6, dt); P.vy = damp(P.vy, -my * 19, 6, dt);
    P.px += P.vx * dt; P.py += P.vy * dt; const lim = G.mission.theme === 'canyon' ? 18 : 22;
    if (Math.abs(P.px) > lim) { P.px = Math.sign(P.px) * lim; P.vx = 0; } if (P.py > 12 || P.py < -7) { P.py = clamp(P.py, -7, 12); P.vy = 0; }
    P.pos.set(P.px, P.py, P.pos.z - P.speed * dt); P.vel.set(P.vx, P.vy, -P.speed);
    P.mesh.rotation.set(P.vy * .03, -P.vx * .012, -P.vx * .04);
  } else {
    const yawRate = (P.boosting ? 1.1 : 1.7) * (I.act.brake ? 1.4 : 1);
    P.yaw -= mx * yawRate * dt; const pc = -my * (Settings.invertPitch ? -1 : 1);
    P.pitch += pc * 1.4 * dt; if (pc === 0) P.pitch = damp(P.pitch, 0, .35, dt); P.pitch = clamp(P.pitch, -1.25, 1.25);
    if (P.flipT > 0) { P.yaw += Math.PI * dt / .9; }
    // arena boundary: steer back
    const dc = Math.hypot(P.pos.x, P.pos.z), lim = 430; G.outside = dc > lim - 40;
    if (dc > lim) { const toC = Math.atan2(P.pos.x, P.pos.z); P.yaw += wrapPi(toC - P.yaw) * 2.2 * dt; if (dc > lim + 60) G.hurt(10); }
    G.fwd(_a); const sd = P.sideDash || 0; P.sideDash = damp(sd, 0, 5, dt);
    _b.set(-_a.z, 0, _a.x).normalize(); // right vector in horizontal plane
    P.vel.copy(_a).multiplyScalar(P.speed).addScaledVector(_b, P.sideDash); P.pos.addScaledVector(P.vel, dt);
    P.roll = damp(P.roll, -mx * .9, 5, dt);
    P.mesh.rotation.set(P.pitch, P.yaw, P.roll);
  }
  // roll / flip animation
  let extraRoll = 0, extraPitch = 0;
  if (P.rollT > 0) { const k = 1 - P.rollT / .62; extraRoll = -P.rollDir * (k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)) * Math.PI * 2; P.rollT -= dt; P.iframes = Math.max(P.iframes, .12); }
  if (P.flipT > 0) { const k = 1 - P.flipT / .9; extraPitch = (rail ? 1 : 0) * Math.PI * 2 * k; extraRoll += rail ? 0 : Math.PI * 2 * k; P.flipT -= dt; }
  P.mesh.rotation.z += extraRoll; P.mesh.rotation.x += extraPitch; P.mesh.position.copy(P.pos);
  P.mesh.userData.glows.forEach(g => { const s = (P.boosting ? 3.4 : 1.7) + Math.random() * .4; g.scale.set(s, s, 1); });
  P.mesh.userData.wings.forEach((w, i) => { w.rotation.z = damp(w.rotation.z, (i ? -1 : 1) * (P.boosting ? -.12 : I.act.brake ? .25 : 0), 8, dt); });
  if (P.boosting && Math.random() < .8) GFX.spark(P.pos.x + rnd(-.5, .5), P.pos.y, P.pos.z + 2.5, 0, 0, 20, 0x66ccff, 1, .3);
  // barrel roll deflect
  if (P.rollT > 0) for (let i = G.eshots.length - 1; i >= 0; i--) { const s = G.eshots[i]; if (s.pos.distanceToSquared(P.pos) < 64) {
    G.eshots.splice(i, 1); s.vel.multiplyScalar(-1.6); s.life = 2.5; s.dmg = 3; s.kind = 'reflect'; s.mesh.children[0].material = GFX.glowMat(0x60ffb0); G.pshots.push(s); Audio.sfx('deflect'); GFX.burst(s.pos, 0x80ffd0, 6, 15, .8, .3); G.score += 25; } }
  weaponUpdate(dt);
}
function muzzle(side) { const P = G.P; P.mesh.updateMatrixWorld(); return _c.set(side * 3.3, 0, -2.4).applyMatrix4(P.mesh.matrixWorld).clone(); }
function playerShot(pos, vel, dmg, color, len, w, kind = 'laser', target = null) {
  const b = GFX.bolt(color, len, w); b.position.copy(pos); faceDir(b, vel); G.pshots.push({ mesh: b, pos: b.position, prev: pos.clone(), vel, dmg, life: 1.6, r: .5 * w, kind, target });
}
function weaponUpdate(dt) {
  const P = G.P, I = Input, rail = G.isRail(); P.fireT -= dt; G.fwd(_a); const dir = _a.clone();
  // lasers
  if (I.act.fire && !I.act.charge && P.fireT <= 0 && !G.won) {
    P.fireT = P.up >= 2 ? .1 : .13; const speed = 250 + (rail ? 0 : P.speed);
    const sides = P.up >= 1 ? [-1, 1] : [P.side = -P.side || 1];
    for (const s of sides) playerShot(muzzle(s), dir.clone().multiplyScalar(speed), P.up >= 2 ? 2 : 1, P.up >= 2 ? 0xffa030 : 0x55ff88, 1.1, P.up >= 2 ? 1.6 : 1);
    if (P.up >= 2) playerShot(muzzle(0), dir.clone().multiplyScalar(speed * 1.05), 2, 0xffe070, 1.5, 1.4);
    G.fired += sides.length; Audio.sfx(P.up >= 2 ? 'laser2' : 'laser', rnd(.9, 1.1));
  }
  // charge & lock-on
  if (I.act.charge && !G.won) {
    P.charge = Math.min(P.charge + dt, 3); if (P.charge > .2 && P.chargeSfx <= 0) { Audio.sfx('charge'); P.chargeSfx = .9; } P.chargeSfx -= dt;
    if (P.charge > .3) { P.lockT -= dt; if (P.lockT <= 0 && P.locks.length < 6) {
      let best = null, bd = 1e9; const ss = Settings.aim ? .42 : .22;
      for (const e of G.enemies) { if (e.dead || e.noLock || P.locks.includes(e)) continue; _b.copy(e.pos).project(GFX.camera); if (_b.z > 1) continue; const d = Math.hypot(_b.x * GFX.camera.aspect, _b.y), dist = e.pos.distanceTo(P.pos); if (d < ss && dist < 300 && dist > 15 && d < bd) { bd = d; best = e; } }
      if (best) { P.locks.push(best); P.lockT = .16; Audio.sfx('lock', P.locks.length); } else P.lockT = .05; } }
  } else if (P.charge > 0) {
    if (P.charge > .3) {
      if (P.locks.length) { P.locks.forEach((e, i) => P.mq.push({ e, t: i * .07 })); }
      else { const m = muzzle(0); playerShot(m, dir.clone().multiplyScalar(200), 6, 0x66d8ff, 2, 3.2, 'plasma'); G.fired++; Audio.sfx('missile'); G.shake = .3; }
    } P.charge = 0; P.locks = [];
  }
  for (let i = P.mq.length - 1; i >= 0; i--) { const q = P.mq[i]; q.t -= dt; if (q.t <= 0) { P.mq.splice(i, 1); const d2 = _b.copy(dir).add(_c.set(rnd(-.4, .4), rnd(.1, .6), 0)).normalize().multiplyScalar(130);
    playerShot(muzzle(i % 2 ? 1 : -1), d2, 4, 0xff9040, 1.6, 1.6, 'missile', q.e.dead ? null : q.e); G.fired++; Audio.sfx('missile'); } }
  P.locks = P.locks.filter(e => !e.dead);
}

// ---------- shots update & collisions
function shotsUpdate(dt) {
  const P = G.P;
  for (let i = G.pshots.length - 1; i >= 0; i--) {
    const s = G.pshots[i]; s.prev.copy(s.pos); s.life -= dt;
    if (s.kind === 'missile') {
      const t = s.target && !s.target.dead ? s.target : null; if (t) { _a.copy(t.pos).sub(s.pos).normalize().multiplyScalar(150); s.vel.lerp(_a, 1 - Math.exp(-5 * dt)); }
      GFX.spark(s.pos.x, s.pos.y, s.pos.z, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), 0xffb060, 1.4, .4); faceDir(s.mesh, s.vel);
    }
    s.pos.addScaledVector(s.vel, dt);
    let hit = false;
    for (const e of G.enemies) { if (e.dead || e.ghost) continue; const rr = e.r + s.r; if (segDist2(s.prev, s.pos, e.pos) < rr * rr) { G.damageEnemy(e, s.dmg); hit = true; if (s.kind === 'plasma' && !e.shield) { hit = false; s.dmg = Math.max(1, s.dmg - 2); } break; } }
    if (!hit && !G.isRail()) for (const r of G.rocks) { if (segDist2(s.prev, s.pos, r.pos) < r.r * r.r) { hit = true; GFX.burst(s.pos, 0xaaaaaa, 4, 8, .8, .3); break; } }
    if (!hit && G.isRail()) for (const o of G.obst) if (o.box.containsPoint(s.pos)) { hit = true; GFX.burst(s.pos, 0xffdd88, 4, 8, .8, .3); break; }
    if (hit || s.life <= 0) { if (hit && s.kind === 'missile') GFX.explode(s.pos, .5); GFX.scene.remove(s.mesh); G.pshots.splice(i, 1); }
  }
  for (let i = G.eshots.length - 1; i >= 0; i--) {
    const s = G.eshots[i]; s.prev.copy(s.pos); s.life -= dt; s.pos.addScaledVector(s.vel, dt); s.mesh.rotation.z += dt * 8;
    let rm = s.life <= 0;
    if (!rm && !P.dead) { const rr = 1.5 + s.r; if (segDist2(s.prev, s.pos, P.pos) < rr * rr) { G.hurt(s.dmg); rm = true; } }
    if (!rm) for (const w of G.wing) if (w.alive && s.pos.distanceToSquared(w.pos) < 6) { hurtWing(w, s.dmg * .7); rm = true; break; }
    if (rm) { GFX.scene.remove(s.mesh); G.eshots.splice(i, 1); }
  }
}
function hurtWing(w, d) {
  if (!w.alive || G.cheat) return; w.hp -= d; w.hitT = .4; GFX.burst(w.pos, 0xffc060, 8, 10, 1, .4);
  if (w.hp <= 0) { w.alive = false; G.wingLost++; GFX.explode(w.pos, 1.5); Audio.sfx('boom'); GFX.scene.remove(w.mesh); Radio.say(w.id, w.id === 'rook' ? "I'm hit! Kit, I have to pull out... good luck!" : 'Mayday! Systems failing — I\'m bailing out!'); }
  else if (w.helpT <= 0) { w.helpT = 9; Radio.say(w.id, w.id === 'rook' ? 'Kit, I\'ve got one on my tail! Get it off me!' : 'Help! Somebody shoot this guy off me!'); }
}
G.hurtWing = hurtWing;

// ---------- wingmen
function wingUpdate(dt) {
  const P = G.P, rail = G.isRail();
  for (const w of G.wing) {
    if (!w.alive) continue; w.t += dt; w.hitT -= dt; w.helpT -= dt; w.fireT -= dt;
    if (rail) {
      _a.set(w.side * (10 + Math.sin(w.t * .8 + w.side) * 4), 3 + Math.sin(w.t * 1.1 + w.side * 2) * 3 + P.py * .5, P.pos.z - 4 + Math.cos(w.t * .5) * 3 - (w.side > 0 ? 3 : 0));
      _a.x += P.px * .5; if (w.sweep > 0) { w.sweep -= dt; _a.x += Math.sin(w.t * 5) * 8; }
      w.vel.copy(_a).sub(w.pos).multiplyScalar(4); w.pos.addScaledVector(w.vel, dt); w.pos.z = lerp(w.pos.z, _a.z, 1 - Math.exp(-5 * dt));
      w.mesh.rotation.set(w.vel.y * .02, 0, -w.vel.x * .04);
      if (w.fireT <= 0) { let tg = null, bd = 160; for (const e of G.enemies) { if (e.dead || e.shield) continue; const dz = P.pos.z - e.pos.z; if (dz > 25 && dz < bd && Math.abs(e.pos.x - w.pos.x) < 14) { bd = dz; tg = e; } }
        if (tg) { w.fireT = rnd(.4, .8); playerShot(w.pos.clone(), _b.set((tg.pos.x - w.pos.x) * .4, (tg.pos.y - w.pos.y) * .4, -230), 1, 0x80c8ff, 1, .8); G.pshots[G.pshots.length - 1].wing = true; } else w.fireT = .3; }
    } else {
      let tg = null, bd = 260; for (const e of G.enemies) { if (e.dead || e.ghost || e.shield) continue; const d = e.pos.distanceTo(w.pos); if (d < bd) { bd = d; tg = e; } }
      _a.copy(P.pos).addScaledVector(G.fwd(_c), -12).add(_d.set(w.side * 14, 3, 0));
      if (tg && w.helpT < 5) _b.copy(tg.pos).sub(w.pos); else _b.copy(_a).sub(w.pos);
      const dist = _b.length(); _b.normalize(); w.dir.lerp(_b, 1 - Math.exp(-2.4 * dt)).normalize();
      const sp = tg ? 68 : clamp(dist * 1.2 + P.speed * .6, 20, 100); w.vel.copy(w.dir).multiplyScalar(sp); w.pos.addScaledVector(w.vel, dt); faceDir(w.mesh, w.dir);
      if (tg && w.fireT <= 0 && w.dir.dot(_b) > .95 && bd < 160) { w.fireT = rnd(.35, .7); playerShot(w.pos.clone(), w.dir.clone().multiplyScalar(250), 1, 0x80c8ff, 1, .8); G.pshots[G.pshots.length - 1].wing = true; }
      for (const r of G.rocks) { const d = w.pos.distanceTo(r.pos); if (d < r.r + 3) w.pos.addScaledVector(_a.copy(w.pos).sub(r.pos).normalize(), r.r + 3 - d); }
    }
    w.mesh.position.copy(w.pos); w.mesh.userData.glows.forEach(g => { const s = 1.5 + Math.random() * .4; g.scale.set(s, s, 1); });
    w.mesh.visible = !(w.hitT > 0 && Math.floor(w.hitT * 20) % 2);
  }
}

// ---------- pickups
function pickupsUpdate(dt) {
  const P = G.P, rail = G.isRail();
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const k = G.pickups[i]; k.t += dt; k.mesh.rotation.y += dt * 2; k.mesh.scale.setScalar(1 + Math.sin(k.t * 5) * .06);
    const d = k.pos.distanceTo(P.pos); if (d < 16 && !P.dead) k.pos.lerp(P.pos, 1 - Math.exp(-1.2 * dt));
    let rm = rail ? k.pos.z > P.pos.z + 25 : k.t > 40;
    if (!P.dead && d < k.r + 1.8) {
      rm = true; Audio.sfx('pickup'); GFX.burst(k.pos, 0xaaffcc, 20, 18, 1.4, .6);
      if (k.kind === 'ring') { if (P.hp >= P.max) G.score += 300; P.hp = Math.min(P.max, P.hp + 40); banner('SHIELD REPAIRED', 1); }
      else if (k.kind === 'bomb') { P.bombs = Math.min(9, P.bombs + 1); banner('NOVA BOMB +1', 1); }
      else if (k.kind === 'up') { P.up = Math.min(2, P.up + 1); banner(P.up >= 2 ? 'HYPER LASER' : 'TWIN LASER', 1.4); }
      else if (k.kind === 'life') { P.lives++; banner('EXTRA JET', 1.4); }
    }
    if (rm) { GFX.scene.remove(k.mesh); G.pickups.splice(i, 1); }
  }
}

// ---------- camera
function snapCamera() { const P = G.P; P.camYaw = P.yaw; P.camPitch = P.pitch; cameraUpdate(.5, true); }
function cameraUpdate(dt, snap) {
  const P = G.P, cam = GFX.camera;
  if (G.isRail()) {
    const tx = P.px * .6, ty = P.py * .5 + 4.6; cam.position.set(tx, ty, P.pos.z + 11 + (P.boosting ? 3 : 0)); cam.lookAt(P.px * .55, P.py * .45 + 1, P.pos.z - 34);
    cam.fov = damp(cam.fov, P.boosting ? 78 : P.speed < 35 ? 60 : 66, 4, dt); cam.rotation.z = P.vx * -.004;
  } else {
    P.camYaw += wrapPi(P.yaw - P.camYaw) * (snap ? 1 : 1 - Math.exp(-6 * dt)); P.camPitch = damp(P.camPitch, P.pitch * .75, 6, dt);
    const e = new THREE.Euler(P.camPitch, P.camYaw, 0, 'YXZ'); _a.set(0, 3.2, 12.5).applyEuler(e); cam.position.copy(P.pos).add(_a); _b.set(0, 1.2, -30).applyEuler(e); cam.lookAt(_c.copy(P.pos).add(_b));
    cam.fov = damp(cam.fov, P.boosting ? 80 : 66, 4, dt);
  }
  cam.updateProjectionMatrix();
  if (G.shake > 0 && Settings.shake) { const s = G.shake * .5; cam.position.x += rnd(-s, s); cam.position.y += rnd(-s, s); }
  G.shake = Math.max(0, G.shake - dt * 2.2);
}

// ---------- main update
G.update = function (dt) {
  if (G.state === 'menu') return menuBg(dt);
  if (G.state !== 'play' && G.state !== 'over' && G.state !== 'end') return;
  dt = Math.min(dt, .05) * G.timeScale; G.time += dt; const P = G.P;
  if (G.state === 'play') {
    playerUpdate(dt); wingUpdate(dt); scriptUpdate(dt); enemiesUpdate(dt); shotsUpdate(dt); pickupsUpdate(dt); missionLogic(dt);
    G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  } else { enemiesUpdate(dt); shotsUpdate(dt); P.mesh.visible = false; }
  Radio.update(dt); bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('on');
  GFX.updateScenery(P.pos.x, P.pos.y, P.pos.z, G.time); GFX.updateFX(dt); cameraUpdate(dt); Audio.intensity(G.boss && !G.boss.dead ? 1 : G.enemies.length > 3 ? .5 : 0); hudUpdate(dt);
};
let bgT = 0;
function menuBg(dt) {
  bgT += dt; const P = G.P, cam = GFX.camera; P.pos.set(Math.sin(bgT * .5) * 3, Math.sin(bgT) * .8, P.pos.z - 30 * dt); P.mesh.position.copy(P.pos); P.mesh.rotation.set(0, 0, Math.sin(bgT * .7) * .25); P.mesh.visible = true;
  P.mesh.userData.glows.forEach(g => { const s = 1.8 + Math.random() * .4; g.scale.set(s, s, 1); });
  const a = bgT * .12 + .4; cam.position.set(P.pos.x + Math.sin(a) * 13, P.pos.y + 2.5 + Math.sin(bgT * .3), P.pos.z + Math.cos(a) * 13 * (Math.cos(a) > 0 ? 1 : -1)); cam.lookAt(P.pos.x, P.pos.y + .5, P.pos.z - 2); cam.fov = 60; cam.updateProjectionMatrix();
  GFX.updateScenery(P.pos.x, P.pos.y, P.pos.z, bgT); GFX.updateFX(dt);
}

// ---------- HUD
const H = { fill: $('h-fill'), lives: $('h-lives'), sc: $('h-sc'), hits: $('h-hits'), bombs: $('h-bombs'), up: $('h-up'), boost: $('h-boost').firstElementChild, wing: $('h-wing'), obj: $('h-obj'), ret: $('ret'), ret2: $('ret2'), charge: $('charge'), locks: [], radar: $('radar').getContext('2d') };
for (let i = 0; i < 6; i++) { const d = document.createElement('div'); d.className = 'lock'; $('locks').appendChild(d); H.locks.push(d); }
const _p = new V();
function toScreen(v, out) { _p.copy(v).project(GFX.camera); out.visible = _p.z < 1; out.x = (_p.x * .5 + .5) * innerWidth; out.y = (-_p.y * .5 + .5) * innerHeight; return out; }
const _s = {};
function hudUpdate(dt) {
  const P = G.P, M = G.mission; if (!M) return;
  H.fill.style.width = Math.max(0, P.hp) + '%'; H.fill.style.background = P.hp < 30 ? 'linear-gradient(90deg,#ff3030,#ff8a30)' : '';
  H.lives.textContent = '✈ × ' + Math.max(0, P.lives); H.sc.textContent = G.score.toLocaleString(); H.hits.textContent = 'HITS ' + G.hits + ' / ' + M.medal + (G.combo > 2 ? '   COMBO ×' + G.combo : '');
  H.bombs.textContent = 'NOVA ' + '◉'.repeat(P.bombs) + '○'.repeat(Math.max(0, 3 - P.bombs)); H.up.textContent = ['LASER', 'TWIN LASER', 'HYPER LASER'][P.up]; H.boost.style.width = P.boost + '%'; H.boost.style.background = P.boostCD > 0 ? '#ff4a3a' : '#ffb02e';
  H.wing.innerHTML = G.wing.map(w => `<div class="wm ${w.alive ? '' : 'lost'}"><span>${w.name}</span><div class="b"><i style="width:${Math.max(0, w.hp / w.max * 100)}%"></i></div></div>`).join('');
  H.obj.style.display = G.objText ? 'block' : 'none'; H.obj.textContent = G.objText;
  const fwdLen = G.isRail() ? 55 : 60; G.fwd(_a); _b.copy(P.pos).addScaledVector(_a, fwdLen); toScreen(_b, _s); const show = !P.dead && _s.visible;
  H.ret.style.display = show ? 'block' : 'none'; H.ret.style.left = _s.x + 'px'; H.ret.style.top = _s.y + 'px'; H.ret.style.borderColor = P.charge > .3 ? '#ffe45a' : '';
  _b.copy(P.pos).addScaledVector(_a, fwdLen * 2.2); toScreen(_b, _s); H.ret2.style.display = show ? 'block' : 'none'; H.ret2.style.left = _s.x + 'px'; H.ret2.style.top = _s.y + 'px';
  H.charge.style.display = P.charge > .3 ? 'block' : 'none'; if (P.charge > .3) { H.charge.style.left = H.ret.style.left; H.charge.style.top = H.ret.style.top; H.charge.style.transform = `scale(${1.6 - Math.min(P.charge, 1.2) * .5}) rotate(${G.time * 200}deg)`; }
  for (let i = 0; i < 6; i++) { const d = H.locks[i], e = P.locks[i]; if (e && !e.dead) { toScreen(e.pos, _s); d.style.display = _s.visible ? 'block' : 'none'; d.style.left = _s.x + 'px'; d.style.top = _s.y + 'px'; } else d.style.display = 'none'; }
  if (G.boss && !G.boss.dead) { $('h-boss').style.display = 'block'; $('h-bossn').textContent = G.boss.name; $('h-bossf').style.width = Math.max(0, G.boss.hp / G.boss.maxHp * 100) + '%'; } else $('h-boss').style.display = 'none';
  if (!G.isRail()) radarDraw();
}
function radarDraw() {
  const c = H.radar, P = G.P, R = 110, S = .26; c.clearRect(0, 0, 220, 220); c.save(); c.translate(R, R); c.strokeStyle = 'rgba(95,200,255,.4)'; for (const r of [35, 70, 105]) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
  const dot = (p, col, sz, sq) => { _a.copy(p).sub(P.pos); const x = _a.x * Math.cos(P.yaw) - _a.z * Math.sin(P.yaw), z = _a.x * Math.sin(P.yaw) + _a.z * Math.cos(P.yaw); let px = x * S, py = z * S; const d = Math.hypot(px, py); if (d > 104) { px *= 104 / d; py *= 104 / d; }
    c.fillStyle = col; if (sq) c.fillRect(px - sz, py - sz, sz * 2, sz * 2); else { c.beginPath(); c.arc(px, py, sz, 0, 7); c.fill(); } };
  for (const e of G.enemies) if (!e.dead) dot(e.pos, e.boss ? '#ff9a2a' : e.relay ? '#ffd25a' : '#ff4a4a', e.boss ? 6 : e.relay ? 5 : 3, e.relay);
  for (const w of G.wing) if (w.alive) dot(w.pos, '#59b6ff', 3);
  for (const k of G.pickups) dot(k.pos, '#6aff9a', 3, true);
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore();
}
