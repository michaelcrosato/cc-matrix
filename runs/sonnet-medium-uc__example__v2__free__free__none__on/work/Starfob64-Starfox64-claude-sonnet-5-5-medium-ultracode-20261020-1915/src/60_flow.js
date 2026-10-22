// ===================================================================
//  FLOW  -  stage lifecycle, director, respawn, clear sequence, results, attract-mode AI
// ===================================================================
function clearWorld() {
  for (const e of G.ents) removeEnt(e);
  G.ents.length = 0;
  for (const b of G.ebs) Phys.remove(b);
  G.ebs.length = 0; G.pbs.length = 0; G.bombs.length = 0;
  for (const b of G.beams) b.alive = false;
  G.beams.length = 0;
  if (G.pl) { if (G.pl.chargeSnd) G.pl.chargeSnd.stop(); if (G.pl.engine) G.pl.engine.stop(); }
  clearWingmen();
  Terrain.clear();
  G.world.clear();
  FX.clear(); Tweens.clear(); G.later.length = 0;
  G.boss = null; G.pl = null;
  HUD.bossBar(null);
}

function startStage(id, o = {}) {
  const def = STAGES[id];
  G.def = def; G.stageId = id;
  clearWorld();
  applyTheme(THEMES[def.theme]);
  Phys.reset(def.gravity || 0, def.ground ? def.ground.y : null);
  Terrain.setup(def);
  if (def.decor) G.world.add(def.decor());
  G.pl = newPlayer();
  const pl = G.pl;
  if (o.carry && G.carry) { Object.assign(pl, G.carry); }
  pl.oz = 0;
  resetPlayerState(pl, !o.carry);
  pl.inv = 2.5;
  Object.assign(G, { t: 0, tScale: 1, stageTime: 0, stageScore: 0, stageHits: 0, combo: 0, comboT: 0, gold: 0, flags: {}, bossScale: 1, clearT: -1, deadT: -1, cp: 0, flash: 0, cleared: false, clearFly: 0, camMode: null, totalSpawnedHittable: 0, arKills: 0, arTarget: def.arTarget || 0, arT: 0, arWaveT: 2, camBackOverride: 0 });
  G.stats = { shots: 0, deflects: 0, bombsUsed: 0, wingLost: 0, deaths: 0, rescues: 0 };
  G.rail.s = 0; G.rail.scale = 1; G.rail.baseScale = 1; G.rail.px = pathX(0); G.rail.py = pathY(0); G.rail.pos.set(G.rail.px, G.rail.py, 0);
  R.camera.userData.init = false; R.camera.fov = S.fov;
  Radio.reset(); Hint.clear();
  if (!o.keepLives) G.lives = 3;
  if (def.mode === 'rail') {
    pl.ox = 0; pl.oy = 2; pl.pos.set(G.rail.px, G.rail.py + 2, 0);
    G.events = def.events();
  } else {
    pl.pos.set(0, 0, 250); pl.yaw = 0; pl.pitch = 0; pl.speed = def.speed; pl.q.identity();
    G.events = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.4; spawn('bandit', new V3(Math.cos(a) * 200, rnd(-40, 40), -40 + Math.sin(a) * 200), {}); }
    later(1.5, () => Radio.say('kestrel', 'Fob Squadron — the whole Gloom Armada is in this sector. Splash their fighters, then take down the Dreadnought!'));
    later(8, () => Hint.show(() => `Stick to turn · ${glyphSet().maneuver} Somersault · hold stick back + ${glyphSet().maneuver} U-Turn`, 8));
  }
  pl.mesh.position.copy(pl.pos);
  Phys.move(pl);
  makeWingmen();
  G.pl.engine = null;
  HUD.show(true);
  HUD.card(def.name, def.sub);
  Music.play(def.music); Snd.play('stageStart');
  G.mode = 'play';
  G.cpScore = G.score;
  if (!G.attract) { G.engine = null; }
  UI.hideAll();
}

function updateDirector(dt) {
  const def = G.def;
  if (def.mode === 'rail') {
    for (const ev of G.events) {
      if (ev.done) continue;
      if (ev.s <= G.rail.s) { ev.done = true; ev.fn(); } else break;
    }
  } else arDirector(dt);
}
function arDirector(dt) {
  if (G.boss || G.cleared || G.clearT >= 0) return;
  G.arT += dt;
  const alive = G.ents.filter((e) => e.kind === 'bandit' && e.alive).length;
  if (G.arKills >= G.arTarget) {
    startBoss('dreadnought');
    later(1.0, () => Radio.say('gen', 'All wings, the Dreadnought is jumping in! Knock out its turrets and generators, then hit the reactor!'));
    later(6, () => Radio.say('vex', 'You insects dare scratch MY flagship? Burn!'));
    return;
  }
  G.arWaveT -= dt;
  if (alive < 3 && G.arWaveT <= 0) {
    const remaining = G.arTarget - G.arKills - alive;
    const n = Math.min(5, Math.max(0, remaining));
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), r = rnd(220, 340); spawn('bandit', new V3(Math.cos(a) * r, rnd(-50, 50), Math.sin(a) * r), {}); }
    G.arWaveT = 4;
    if (n) Radio.once('wave' + Math.floor(G.arT / 25), 'bolt', pick(['More bandits on the scope!', 'Here come another batch!', 'Fresh fighters — let\'s go!']));
  }
  if (!G.flags.c1 && G.arT > 14) { G.flags.c1 = true; chase('newt'); }
  if (!G.flags.p1 && G.arT > 22) { G.flags.p1 = true; spawn('pickup', new V3(rnd(-60, 60), rnd(-20, 20), rnd(-60, 60)), { type: 'bomb' }); Radio.say('newt', 'Supply drop marked on your radar — grab it!'); }
  if (!G.flags.c2 && G.arT > 42) { G.flags.c2 = true; chase('bolt'); }
  if (!G.flags.p2 && G.arT > 50) { G.flags.p2 = true; spawn('pickup', new V3(rnd(-60, 60), rnd(-20, 20), rnd(-60, 60)), { type: 'health' }); spawn('pickup', new V3(rnd(-80, 80), rnd(-20, 20), rnd(-80, 80)), { type: 'laser' }); }
  if (!G.flags.c3 && G.arT > 70) { G.flags.c3 = true; chase('kestrel'); }
  if (!G.flags.m1 && G.arT > 30) { G.flags.m1 = true; for (let i = 0; i < 5; i++) spawn('mine', new V3(rnd(-150, 150), rnd(-30, 30), rnd(-150, 150)), {}); }
  if (!G.flags.p3 && G.arT > 85) { G.flags.p3 = true; spawn('pickup', new V3(rnd(-60, 60), 0, rnd(-60, 60)), { type: 'wrench' }); }
}

// ---------------------------------------------------------------- death / respawn / game over
function handleDeath(dt) {
  if (G.deadT < 0) return;
  G.deadT += dt;
  if (G.deadT > 2.6 && !G.attract) {
    G.deadT = -1;
    if (G.lives > 0) respawn();
    else { G.mode = 'gameover'; Music.play('gameover'); Snd.play('gameOver'); UI.open('gameover'); }
  }
}
function respawn() {
  G.lives--;
  const pl = G.pl;
  for (const e of G.ents) removeEnt(e);
  G.ents.length = 0;
  for (const b of G.ebs) { Phys.remove(b); G.world.remove(b.mesh); }
  G.ebs.length = 0;
  for (const b of G.pbs) G.world.remove(b.mesh);
  G.pbs.length = 0;
  for (const b of G.bombs) G.world.remove(b.mesh);
  G.bombs.length = 0;
  for (const b of G.beams) b.alive = true;
  updateBeams(10);
  G.later.length = 0;
  if (G.boss) { for (const e of G.boss.parts) removeEnt(e); G.world.remove(G.boss.root); G.boss = null; HUD.bossBar(null); }
  G.rail.baseScale = 1; G.rail.scale = 1;
  resetPlayerState(pl, false);
  pl.inv = 2.5;
  G.combo = 0;
  for (const w of G.wing) { w.state = 'ok'; w.hp = w.maxHp; w.chaser = null; w.mesh.visible = true; }
  if (G.def.mode === 'rail') {
    const cp = G.cp || 0;
    G.rail.s = cp; G.rail.px = pathX(cp); G.rail.py = pathY(cp); G.rail.pos.set(G.rail.px, G.rail.py, -cp);
    pl.ox = 0; pl.oy = 2;
    for (const ev of G.events) ev.done = ev.at !== undefined && ev.at < cp;
    G.stageScore = 0;
    G.score = G.cpScore || 0;
    Music.play(G.def.music);
  } else {
    pl.pos.set(0, 0, 250); pl.yaw = 0; pl.pitch = 0; pl.q.identity(); pl.speed = G.def.speed;
    G.arT = Math.max(G.arT - 10, 0);
    if (G.arKills >= G.arTarget) G.arKills = Math.max(0, G.arTarget - 6);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, r = 230; spawn('bandit', new V3(Math.cos(a) * r, rnd(-40, 40), Math.sin(a) * r), {}); }
    Music.play(G.def.music);
  }
  R.camera.userData.init = false;
  HUD.card('RETRY', 'Lives ×' + G.lives, 2);
  pl.mesh.position.copy(pl.pos);
}

// ---------------------------------------------------------------- clear sequence & results
function stageClear() {
  G.cleared = true; G.clearFly = 0; G.camMode = 'clear';
  G.rail.baseScale = 1;
  Music.play('victory'); Snd.play('fanfare');
  HUD.card('MISSION COMPLETE', G.def.name, 4);
  const pl = G.pl;
  pl.rollT = 0.62; pl.rollDir = 1;
  Radio.say('kestrel', 'Outstanding flying, Fob! That\'s a clear!');
  if (G.attract) later(4, () => Attract.next());
}
function updateClear(dt) {
  if (G.clearT >= 0 && !G.cleared) {
    G.clearT += dt;
    G.tScale = G.clearT < 3.4 ? 0.4 : 1;
  }
  if (!G.cleared) return;
  const pl = G.pl;
  G.clearFly += dt; G.tScale = 1;
  const sp = 50 + G.clearFly * 70;
  if (G.def.mode === 'rail') {
    // ship streaks ahead of the (frozen) rail
    pl.oz = (pl.oz || 0) - sp * dt; pl.pos.z -= sp * dt; pl.oy += dt * 4 * Math.min(1, G.clearFly); pl.vel.set(0, 0, -sp);
    pl.mesh.position.copy(pl.pos);
    pl.mesh.rotation.set(0.12, 0, pl.rollT > 0 ? -TAU * easeInOut(1 - pl.rollT / 0.62) : 0, 'YXZ');
  } else {
    pl.pos.addScaledVector(pl.aim, sp * dt); pl.mesh.position.copy(pl.pos);
    pl.rollT = Math.max(0, pl.rollT - dt);
  }
  FX_engine(pl, true);
  if (G.clearFly > 5.4 && G.mode === 'play' && !G.attract) showResults();
}
function computeResults() {
  const spawned = Math.max(1, G.totalSpawnedHittable);
  const pct = clamp(G.stageHits / spawned, 0, 1);
  const medal = G.stageHits >= G.def.medalHits;
  const timeBonus = Math.max(0, Math.round((300 - G.stageTime) * 10));
  const survive = G.stats.deaths === 0 ? 1500 : 0;
  const wingBonus = G.wing.filter((w) => w.state === 'ok').length * 400;
  const total = Math.round(G.stageScore + timeBonus + survive + wingBonus);
  const grade = pct >= 0.85 ? 'S' : pct >= 0.7 ? 'A' : pct >= 0.5 ? 'B' : 'C';
  return { hits: G.stageHits, spawned, pct, medal, timeBonus, survive, wingBonus, total, grade, time: G.stageTime, stats: G.stats, gold: G.gold, wingAlive: G.wing.filter((w) => w.state === 'ok').length, rescues: G.stats.rescues };
}
function showResults() {
  const res = computeResults();
  G.results = res;
  G.score += res.timeBonus + res.survive + res.wingBonus;
  const b = SAVE.best[G.stageId] || 0;
  if (G.score > b) SAVE.best[G.stageId] = G.score;
  if (res.medal) SAVE.medals[G.stageId] = true;
  saveGame();
  if (G.stageId === 's1') G.campaign.route = G.flags.route === 'b' ? 'b' : 'a';
  G.mode = 'results';
  UI.open('results');
}
function nextAfterResults() {
  const id = G.stageId;
  G.carryOver();
  if (id === 's1') {
    if (G.campaign.route === 'b') UI.open('branch'); else startStage('s2a', { carry: true, keepLives: true });
  } else if (id === 's2a' || id === 's2b') startStage('s3', { carry: true, keepLives: true });
  else { G.mode = 'ending'; Music.play('title'); UI.open('ending'); }
}
G.carryOver = function () {
  const pl = G.pl;
  G.carry = { maxHp: Math.min(pl.maxHp, 125), bombs: Math.max(3, pl.bombs), laser: pl.laser };
  return G.carry;
};

// ---------------------------------------------------------------- attract-mode AI (cheats freely)
const AI = {
  chT: 0, chOn: false, rollCd: 0, boostT: 0, bombCd: 5, manCd: 0,
  act(dt) {
    const a = emptyAct(), pl = G.pl;
    if (!pl || pl.dead) return a;
    this.rollCd -= dt; this.bombCd -= dt; this.manCd -= dt; this.chT += dt;
    if (G.def.mode === 'rail') this.rail(a, dt, pl); else this.ar(a, dt, pl);
    return a;
  },
  pickTarget(pl) {
    let best = null, bd = 1e9;
    for (const e of G.ents) {
      if ((e.cat !== 'enemy' && e.cat !== 'part') || !e.alive || !e.lockable) continue;
      if (e.shield && e.shield(e)) continue;
      if (G.def.mode === 'rail' && e.pos.z > pl.pos.z - 10) continue;
      const d = e.pos.distanceTo(pl.pos);
      if (d < bd && d < 320) { bd = d; best = e; }
    }
    return best;
  },
  rail(a, dt, pl) {
    const t = this.pickTarget(pl), rail = G.rail;
    let tx = Math.sin(G.t * 0.7) * 14, ty = 2 + Math.sin(G.t * 1.1) * 6;
    if (t) { tx = t.pos.x - rail.px; ty = t.pos.y - rail.py; }
    // dodge solid obstacles / thread gates
    for (const e of G.ents) {
      if (e.cat !== 'obst' || !e.alive || e.hp < 900) continue;
      const dz = pl.pos.z - e.pos.z;
      if (e.kind === 'gateBar') {
        if (e.visual && dz > -5 && dz < 130) { tx = e.mesh.position.x - rail.px; ty = e.mesh.position.y - rail.py; }
        continue;
      }
      if (dz > -5 && dz < 85) {
        const hw = (e.w || e.r * 2 || 6) / 2 + 7, hh = (e.h || e.r * 2) / 2 + 5;
        if (Math.abs(e.pos.x - pl.pos.x) < hw && Math.abs(e.pos.y - pl.pos.y) < hh) {
          if (e.w > 20 && (e.h || 0) < 8) ty = e.pos.y + (pl.pos.y > e.pos.y ? hh + 3 : -hh - 3) - rail.py;
          else tx = e.pos.x + (pl.pos.x >= e.pos.x ? hw + 2 : -hw - 2) - rail.px;
        }
      }
    }
    a.move.x = clamp((tx - pl.ox) * 0.22, -1, 1); a.move.y = clamp((ty - pl.oy) * 0.22, -1, 1);
    a.fire = true;
    // charge/lock cycle
    const cyc = this.chT % 12;
    const want = cyc > 8 && cyc < 9.6;
    if (want && !this.chOn) { a.chargeDown = true; this.chOn = true; }
    if (!want && this.chOn) { a.chargeUp = true; this.chOn = false; }
    a.charge = this.chOn;
    // roll when shots are about to hit
    if (this.rollCd <= 0) {
      for (const b of G.ebs) { if (!b.decor && b.pos.distanceTo(pl.pos) < 24 && b.vel.z > 0) { if (Math.random() < 0.5) a.rollL = true; else a.rollR = true; this.rollCd = 2.2; break; } }
    }
    // bomb on crowds / boss
    const crowd = G.ents.filter((e) => e.cat === 'enemy' && e.alive && e.pos.z < pl.pos.z && pl.pos.z - e.pos.z < 200).length;
    if (this.bombCd <= 0 && (crowd >= 6 || (G.boss && G.boss.t > 6))) { a.bomb = true; this.bombCd = G.boss ? 14 : 9; }
    this.boostT -= dt; if (this.boostT < -12) this.boostT = 2.5;
    a.boost = this.boostT > 0 ? 1 : 0;
  },
  ar(a, dt, pl) {
    const t = (() => {
      let best = null, bd = 1e9;
      const boss = G.boss;
      for (const e of G.ents) {
        if (!e.alive || !(e.cat === 'enemy' || e.cat === 'part') || !e.lockable) continue;
        if (e.shield && e.shield(e)) continue;
        const d = e.pos.distanceTo(pl.pos) - (e.cat === 'part' ? 40 : 0) - (e.onTail ? 100 : 0);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    })();
    a.fire = true;
    if (!t) { a.move.x = Math.sin(G.t * 0.4) * 0.4; return; }
    const inv = pl.q.clone().invert();
    const l = t.pos.clone().sub(pl.pos).applyQuaternion(inv);
    const dist = l.length();
    const behind = l.z > 0;
    const norm = Math.max(25, Math.abs(l.z));
    a.move.x = behind ? (l.x >= 0 ? 1 : -1) : clamp(l.x / norm * 3.2, -1, 1);
    a.move.y = behind ? 0.3 : clamp(l.y / norm * 3.2, -1, 1);
    if (behind && dist > 60 && this.manCd <= 0 && !pl.man) { a.maneuver = true; a.move.y = -1; a.uturnHeld = true; this.manCd = 4; }
    else if (G.ents.some((e) => e.kind === 'bandit' && e.onTail) && this.manCd <= 0 && !pl.man) { a.maneuver = true; this.manCd = 5; }
    if (G.boss && dist < 70) a.brake = 0.8; // don't ram the hull
    if (this.bombCd <= 0 && G.ents.filter((e) => e.kind === 'bandit' && e.alive && e.pos.distanceTo(pl.pos) < 90).length >= 4) { a.bomb = true; this.bombCd = 10; }
    if (this.rollCd <= 0) { for (const b of G.ebs) { if (!b.decor && b.pos.distanceTo(pl.pos) < 22) { a.rollL = Math.random() < 0.5; a.rollR = !a.rollL; this.rollCd = 2.5; break; } } }
    const cyc = this.chT % 14;
    const want = cyc > 9 && cyc < 10.6 && !behind;
    if (want && !this.chOn) { a.chargeDown = true; this.chOn = true; }
    if (!want && this.chOn) { a.chargeUp = true; this.chOn = false; }
    a.charge = this.chOn;
  },
};

const Attract = {
  active: false, idx: 0, t: 0, seq: ['s1', 's2a', 's3', 's2b'], skipped: false, startedAt: 0,
  start() {
    this.active = true; G.attract = true; G.cheat = true; this.idx = 0; this.startedAt = performance.now();
    G.score = 0; G.lives = 99;
    this.load();
    $('#attract').classList.add('on');
  },
  load() {
    this.t = 0; this.skipped = false; this.pending = false;
    startStage(this.seq[this.idx % this.seq.length], { keepLives: true });
    G.mode = 'attract'; G.lives = 99; G.cheat = true; G.attract = true;
    AI.chT = 0; AI.bombCd = 6; AI.manCd = 3;
  },
  next() {
    if (this.pending) return;
    this.pending = true;
    UI.fade(() => { this.idx++; this.load(); });
  },
  update(dt) {
    this.t += dt;
    const def = G.def;
    if (!this.skipped && !G.boss) {
      if (def.mode === 'rail' && this.t > 26) { this.skipped = true; this.skipToBoss(); }
      if (def.mode === 'ar' && this.t > 24) { this.skipped = true; G.arKills = G.arTarget; }
    }
    if (this.t > 95) this.next();
    // cheat: keep the shield topped up and bombs stocked
    const pl = G.pl;
    if (pl && !pl.dead) { pl.hp = pl.maxHp; if (pl.bombs < 3) pl.bombs = 3; }
  },
  skipToBoss() {
    const def = G.def, pl = G.pl;
    for (const e of G.ents) removeEnt(e);
    G.ents.length = 0;
    for (const b of G.ebs) { Phys.remove(b); G.world.remove(b.mesh); }
    G.ebs.length = 0;
    const target = def.bossAt - 40;
    G.rail.s = target; G.rail.px = pathX(target); G.rail.py = pathY(target); G.rail.pos.set(G.rail.px, G.rail.py, -target);
    for (const ev of G.events) if (ev.at < def.bossAt) ev.done = true;
    pl.pos.set(G.rail.px + pl.ox, G.rail.py + pl.oy, -target);
    R.camera.userData.init = false;
    pl.laser = 3; pl.bombs = 5;
    HUD.toast('DEMO: JUMP TO BOSS', 'good', 1.2);
  },
  stop() {
    this.active = false; G.attract = false; G.cheat = false;
    $('#attract').classList.remove('on');
  },
};
