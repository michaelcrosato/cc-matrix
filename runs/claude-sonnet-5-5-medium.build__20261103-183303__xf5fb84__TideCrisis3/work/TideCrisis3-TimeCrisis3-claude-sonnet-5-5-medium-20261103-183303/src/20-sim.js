// 20-sim.js — Sim: the authoritative, deterministic, render-free game state. Owns: players, cover, weapons, shots,
// threats (the crisis flash), projectiles, objects, director (waves, cues, clear), TIME, scoring, coroutines.
// Reads: registries (scene, enemy, weapon, boss). The presentation only reads sim.state/sim.events.
const WEAPONS = [
  { id: 'handgun', name: 'P9 MARLIN', short: 'P9', rate: 6, auto: 3.5, dmg: 1, spread: 0, sw: .2, recoil: .6 },
  { id: 'mg', name: 'RIPTIDE', short: 'MG', rate: 12, dmg: .45, spread: .6, bloom: 3, sw: .25, recoil: .25, pool: 240, pick: 60 },
  { id: 'sg', name: 'BREAKWATER', short: 'SG', rate: 1.5, dmg: .45, pellets: 8, spread: 5.5, sw: .3, recoil: 2.2, pool: 36, pick: 8 },
  { id: 'gl', name: 'SQUALL', short: 'GL', rate: 1, dmg: 6, radius: 48, sw: .35, recoil: 1.5, pool: 6, pick: 2 }
];
const GRAV = 240;
function newPlayer(i, spec, lives) {
  return { id: i, name: spec.name || 'P' + (i + 1), color: spec.color || PCOL[i], agent: spec.agent || AGENT[i], aspect: spec.aspect || 16 / 9,
    c: 0, wantCover: false, exposedSince: 0, aim: [0, 0], weapon: 0, switchT: 0, cool: 0, mag: 9, reloadT: 0, ammo: [9, 0, 0, 0], bloom: 0,
    lives, score: 0, chain: 0, best: 0, inv: 0, hurt: 0, down: false, contT: 0, continues: 0, cheat: 0,
    st: { shots: 0, hits: 0, heads: 0, kills: 0, quick: 0, saves: 0, lost: 0, civ: 0, bonus: 0 }, nextLife: 150000, recoil: 0, handled: 0, lastFire: -9, seen: {} };
}
class Sim {
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'stage'; this.diff = DIFF[o.difficulty || 'normal']; this.seed = o.seed == null ? 12345 : o.seed;
    this._rngs = {}; this.t = 0; this.events = []; this.nextId = 1; this.cheats = Object.assign({ god: 0, ammo: 0, freeze: 0, oneHit: 0 }, o.cheats || {});
    this.players = (o.players || [{}]).map((p, i) => newPlayer(i, p, this.diff.lives));
    if (o.lives) for (const p of this.players) p.lives = o.lives;
    this.enemies = []; this.threats = []; this.proj = []; this.objs = []; this.civs = []; this.cors = []; this.fx = [];
    this.stage = o.stage == null ? 1 : o.stage; this.sceneId = null; this.scene = null; this.phase = 'idle'; this.pt = 0; this.timer = 0; this.timeMax = 0;
    this.rail = 0; this.railSpeed = 0; this.waves = []; this.waveT = 0; this.spawned = 0; this.cues = []; this.cueDone = {}; this.boss = null; this.flags = {};
    this.slow = 1; this.over = false; this.won = false; this.hist = []; this.sayq = []; this.clearT = 0; this.shake = 0; this.mark = 0; this.sceneIdx = 0; this.lastKill = {}; this.sceneLog = [];
    this.stageStats = { time: 0, scenesCleared: 0, lostAtStart: 0 };
    this.travelFrom = null; this.statsStart = null; this.whip = 0; this.gauge = 0;
    if (o.scene) this.jump(this.stage, o.scene);
  }
  rng(s = 'a') { return (this._rngs[s] || (this._rngs[s] = mulberry(hash32(s) ^ this.seed)))(); }
  rr(a, b, s = 'a') { return a + (b - a) * this.rng(s); }
  pick(a, s = 'a') { return a[Math.floor(this.rng(s) * a.length) % a.length]; }
  emit(type, d) { this.events.push(Object.assign({ type, t: this.t }, d)); }
  say(who, text, dur) { this.emit('say', { who, text, dur }); }
  alive() { return this.players.filter(p => !p.down); }
  // ---------- stage and scene control ----------
  jump(stage, sceneId, o = {}) {
    this.stage = stage; this.sceneId = sceneId; const sc = this.scene = reg('scene', sceneId);
    if (!sc) throw new Error('no scene ' + sceneId);
    this.sceneIdx = (reg('stage', stage).scenes || []).indexOf(sceneId);
    this.enemies.length = 0; this.threats.length = 0; this.proj.length = 0; this.objs.length = 0; this.civs.length = 0; this.cors.length = 0; this.fx.length = 0;
    this.boss = null; this.waves = []; this.cues = (sc.cues || []).map((c, i) => Object.assign({ id: i }, c)); this.cueDone = {}; this.flags = {}; this.rail = 0; this.gauge = 0;
    this.waveT = 0; this.spawned = 0; this.sayq = [];
    const sl = sc.slots; this.slotsList = this.players.map((p, i) => sl[Math.min(i, sl.length - 1)] ? this.slotFor(sc, i) : this.slotFor(sc, 0));
    this.covers = Object.keys(sc.covers || {}).map(k => Object.assign({ id: k }, sc.covers[k]));
    for (const w of sc.waves || []) this.waves.push(Object.assign({ started: false, done: false, spawned: [] }, w));
    for (const o2 of sc.objs || []) this.addObj(o2);
    for (const c of sc.civ || []) this.addCiv(c);
    for (const p of this.players) { p.c = 0; p.wantCover = false; p.mag = 9; p.reloadT = 0; if (!p.down) p.inv = 0; p.chain = 0; p.bloom = 0; }
    this.timeMax = Math.round(sc.time * this.diff.time * tune.time.sceneMul); this.timer = this.timeMax;
    this.pt = 0; this.travelLen = this.pathLen(sc); this.travelDur = Math.max(1.2, this.travelLen / (sc.speed || 110)) * (this.o.fast ? .6 : 1);
    this.phase = o.phase || (sc.boss ? 'travel' : 'travel'); if (o.phase === 'action') this.beginAction(); this.emit('scene', { id: sceneId, stage, title: sc.title });
    for (const p of this.players) { p.st0 = Object.assign({}, p.st); }
    this.sceneStartT = this.t; this.hitsAtStart = this.players.map(p => p.st.lost);
  }
  slotFor(sc, i) {
    // seats 3 and 4: slot 1 moved 28 u further left, slot 2 moved 28 u further right (perpendicular to the view)
    const base = i >= sc.slots.length ? sc.slots[(i - sc.slots.length) % sc.slots.length] : sc.slots[i];
    const sdir = Math.sign(base.at[1]) || 1, at = [base.at[0], base.at[1] + (i >= sc.slots.length ? sdir * 28 : 0), base.at[2] || 24];
    const cover = base.cover || { dy: sdir * -7, yaw: -sdir * 10, dz: -12 };
    return { stand: { x: at[0], y: at[1], z: at[2], yaw: (base.yaw || 0) * DEG, pitch: (base.pitch || 0) * DEG }, cover: { x: at[0] - 2, y: at[1] + cover.dy, z: at[2] + cover.dz, yaw: ((base.yaw || 0) + cover.yaw) * DEG, pitch: (base.pitch || 0) * DEG - .04 }, prop: base.prop };
  }
  pathLen(sc) { const a = sc.from || [-160, 0, 24], b = sc.slots[0].at; return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  // the cover prop box for a slot (in front of the camera) -- also what cover looks like
  coverBox(i) {
    const s = this.slotsList[i], sc = this.scene, pr = Object.assign({ d: 26, w: 58, h: 13, mat: sc.coverMat || 'crate' }, sc.coverProp || {}, s.prop || {});
    const lift = sc.lift ? this.rail : 0, x = s.stand.x + (sc.lift ? 0 : this.rail) + pr.d, y = s.stand.y + (s.cover.y - s.stand.y) * .5;
    return { x0: x - 6, x1: x + 6, y0: y - pr.w / 2, y1: y + pr.w / 2, z0: s.stand.z - 24 - 4 + lift, z1: pr.h + lift, mat: pr.mat, cover: true, owner: i };
  }
  pose(i) {
    const p = this.players[i], s = this.slotsList[i]; if (!s) return { x: 0, y: 0, z: 24, yaw: 0, pitch: 0, roll: 0, fov: tune.view.fov };
    const k = smooth(clamp(p.c, 0, 1)), a = s.stand, b = s.cover; let pose;
    const sc = this.scene;
    if (this.phase === 'travel' && !this.travelDone) {
      const f = sc.from || [-160, 0, 24], u = clamp(this.pt / this.travelDur, 0, 1), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      pose = { x: lerp(f[0], a.x, e), y: lerp(f[1], a.y, e), z: lerp(f[2], a.z, e) + Math.sin(this.pt * 12) * 1.1 * (1 - e) * (this.travelLen / (this.travelDur) > 80 ? 1 : 0), yaw: a.yaw + (1 - e) * (sc.whip == null ? .85 : sc.whip), pitch: a.pitch + (1 - e) * .06, roll: Math.sin(this.pt * 6) * .008 };
    } else {
      pose = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k), roll: Math.sin(Math.PI * clamp(p.c, 0, 1)) * .035 };
      if (sc.lift) pose.z += this.rail;
      else pose.x += this.rail;
      if (sc.sway) { pose.roll += Math.sin(this.t * sc.sway[0]) * sc.sway[1]; pose.z += Math.sin(this.t * sc.sway[0] * 1.3) * sc.sway[1] * 40; pose.y += Math.sin(this.t * sc.sway[0] * .7) * sc.sway[1] * 60; }
    }
    pose.fov = tune.view.fov; return pose;
  }
  // exposed: can be hit
  exposed(p) { return p.c < .5; }
  // ---------- phases ----------
  beginAction() {
    this.phase = 'action'; this.travelDone = true; this.timer = this.timeMax; this.actionT = 0; this.emit('action', {});
    this.pt = this.travelDur; this.civQ = null; this.boomAt = [];
    for (const p of this.players) { p.lastFire = -9; }
    const sc = this.scene; if (sc.boss) this.spawnBoss(sc.boss); if (sc.onStart) sc.onStart(this);
  }
  step(dt, cmds = []) {
    this.events.length = 0; dt *= this.slow;
    if (this.cheats.freeze && false) return;
    this.t += dt;
    for (const p of this.players) this.stepPlayer(p, cmds[p.id] || {}, dt);
    if (this.phase === 'travel') { this.pt += dt; if (this.pt >= this.travelDur) { this.travelDone = true; this.beginAction(); } this.runCues(dt); }
    else if (this.phase === 'action' || this.phase === 'boss') this.stepAction(dt);
    else if (this.phase === 'clear') { this.clearT += dt; if (this.clearT > 1.6) this.advance(); }
    this.stepProjectiles(dt); this.stepObjs(dt); this.stepThreats(dt); this.stepFx(dt); this.runCoros(dt);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    // continues
    for (const p of this.players) if (p.down && p.contT > 0) { p.contT -= dt; if (p.contT <= 0) { p.contT = 0; p.contFail = true; this.emit('contfail', { p: p.id }); this.checkOver(); } }
  }
  stepAction(dt) {
    this.actionT += dt;
    if (this.sc_rail) this.sc_rail(dt);
    const sc = this.scene;
    if (sc.moving) {
      let lim = sc.moving.dist; const sx = this.slotsList[0] ? this.slotsList[0].stand.x : 0;
      for (const e of this.enemies) if (!e.dead && !e.gone && !e.civ && e.cover && e.rail !== false) lim = Math.min(lim, sc.lift ? e.bz - 20 : e.bx - 110 - sx);
      this.rail = Math.max(this.rail, Math.min(lim, this.rail + sc.moving.speed * dt));
    }
    this.stepWaves(dt); this.runCues(dt); this.stepEnemies(dt);
    if (sc.bossAtD != null && !this.flags.bossSpawned && this.rail >= sc.bossAtD) { this.flags.bossSpawned = 1; this.spawnBoss(sc.bossId, { final: true }); }
    if (this.boss) this.stepBoss(dt);
    if (!tune.time.freeze) { this.timer -= dt; }
    if (this.timer <= 0 && !tune.time.freeze) this.timeUp();
    if ((this.phase === 'action' || this.phase === 'boss') && this.sceneClear()) this.clearScene();
  }
  timeUp() {
    this.emit('timeup', {}); this.timer = Math.round(this.timeMax * tune.time.refill / 100);
    for (const p of this.players) if (!p.down) this.loseLife(p, 'time');
  }
  sceneClear() {
    if (this.waves.some(w => !w.done)) return false; if (this.boss && !this.boss.dead) return false;
    if (this.scene.objective && !this.scene.objective(this)) return false;
    return !this.enemies.some(e => !e.dead && !e.civ && !e.ally);
  }
  clearScene() {
    this.phase = 'clear'; this.clearT = 0; const bonus = Math.max(0, Math.round(this.timer)) * 100; this.emit('clear', { bonus, boss: !!this.scene.boss });
    for (const p of this.players) if (!p.down) { p.score += bonus; this.checkLife(p); }
    this.stageStats.scenesCleared++; this.threats.length = 0; for (const e of this.proj) if (e.team !== 'p') e.dead = true;
  }
  advance() {
    const st = reg('stage', this.stage), i = this.sceneIdx;
    if (i + 1 < st.scenes.length) this.jump(this.stage, st.scenes[i + 1]);
    else { this.phase = 'stageclear'; this.emit('stageclear', { stage: this.stage }); }
  }
  // ---------- waves, cues ----------
  stepWaves(dt) {
    this.waveT += dt;
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i]; if (w.started) { if (!w.done && w.spawned.every(e => e.dead || e.gone)) w.done = true; continue; }
      let go = false;
      if (w.at != null) go = this.actionT >= w.at; else if (w.atD != null) go = this.rail >= w.atD;
      else if (w.after === 'clear') go = (!this.boss || this.boss.dead) && (i === 0 || (this.waves[i - 1].started && this.waves[i - 1].spawned.every(e => e.dead || e.gone) && this.noPending(i)));
      else if (w.after === 'obj') go = !!this.flags[w.flag];
      else if (w.on) go = !!this.flags[w.on];
      else if (typeof w.after === 'number') go = this.waves[w.after] && this.waves[w.after].done;
      if (go) this.startWave(w);
    }
  }
  noPending(i) { return true; }
  startWave(w) {
    w.started = true; this.emit('wave', {});
    for (const s of w.spawn) { const e = this.spawnEnemy(s[0], s[1], s[2] || {}); if (e) w.spawned.push(e); }
    if (w.boss) this.spawnBoss(w.boss);
    if (w.fn) w.fn(this, w);
    if (!w.spawned.length) w.done = true;
  }
  runCues(dt) {
    for (const c of this.cues) {
      if (this.cueDone[c.id]) continue;
      let go = false;
      if (c.at != null) go = (this.phase === 'travel' ? this.pt - this.travelDur : this.actionT) >= c.at - (c.at < 0 ? 0 : 0) && (c.at >= 0 ? this.phase !== 'travel' || c.pre : true);
      else if (c.on) go = !!this.flags[c.on]; else if (c.atD != null) go = this.rail >= c.atD;
      if (c.at === -1 && this.phase === 'travel') go = this.pt > 0.3;
      if (go) { this.cueDone[c.id] = 1; if (c.say) this.say(c.say[0], c.say[1]); if (c.fn) c.fn(this); if (c.flag) this.flags[c.flag] = 1; if (c.prompt) this.emit('prompt', { id: c.prompt }); if (c.music) this.emit('music', { song: c.music }); }
    }
  }
  // ---------- coroutines (boss scripts, scripted bits) ----------
  coro(gen) { this.cors.push({ g: gen, w: 0, pred: null, sub: null }); }
  runCoros(dt) {
    for (const c of this.cors) {
      if (c.done) continue;
      if (c.boss && c.boss.dead) { c.done = true; if (c.sub) c.sub.done = true; continue; }
      if (c.sub) { if (!c.sub.done) continue; c.sub = null; }
      if (c.pred) { if (!c.pred()) continue; c.pred = null; }
      c.w -= dt; if (c.w > 0) continue;
      let r; try { r = c.g.next(); } catch (e) { c.done = true; throw e; }
      if (r.done) { c.done = true; continue; }
      const v = r.value; c.w = 0;
      if (typeof v === 'number') c.w = v; else if (typeof v === 'function') c.pred = v; else if (v && v.next) { const sub = { g: v, w: 0, pred: null, sub: null }; this.cors.push(sub); c.sub = sub; }
    }
    if (this.cors.length > 20) this.cors = this.cors.filter(c => !c.done);
  }
  // ---------- players ----------
  stepPlayer(p, c, dt) {
    if (p.down) return;
    p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.cool = Math.max(0, p.cool - dt); p.switchT = Math.max(0, p.switchT - dt); p.recoil = Math.max(0, p.recoil - dt * 6);
    p.bloom = Math.max(0, p.bloom - dt * 6);
    if (c.aim) p.aim = [clamp(c.aim[0], -p.aspect, p.aspect), clamp(c.aim[1], -1, 1)];
    const was = p.c < .5; p.wantCover = !!c.coverDown;
    const canMove = this.phase === 'action' || this.phase === 'boss' || this.phase === 'clear' || this.phase === 'travel';
    const tgt = p.wantCover ? 1 : 0, rate = tgt > p.c ? 1 / Math.max(.02, tune.player.coverIn) : 1 / Math.max(.02, tune.player.coverOut);
    if (this.phase === 'travel') p.c = approach(p.c, 0, rate * dt); else p.c = approach(p.c, tgt, rate * dt);
    if (!was && p.c < .5) { } if (was && p.c >= .5) { } if (p.c < .5 && !(p.c0 < .5)) p.exposedSince = this.t; p.c0 = p.c;
    // weapon select
    if (c.select != null && c.select > 0 && c.select <= 4) this.selectWeapon(p, c.select - 1);
    if (c.next) this.cycleWeapon(p, 1); if (c.prev) this.cycleWeapon(p, -1);
    // reload (handgun) in cover
    const w = WEAPONS[p.weapon];
    if (p.weapon === 0 && p.mag < 9 && (p.c > .8 || c.reload && p.c > .8)) { p.reloadT += dt; if (p.reloadT >= tune.player.reload) { p.mag = 9; p.reloadT = 0; this.emit('reload', { p: p.id }); } } else if (p.c < .8) p.reloadT = 0;
    if (c.reload && p.c < .5 && p.weapon === 0 && p.mag < 9) this.emit('prompt', { id: 'reload', p: p.id });
    if (this.phase !== 'action' && this.phase !== 'boss' && this.phase !== 'clear') return;
    // fire
    if (c.firePressed && p.c > .5) { this.cycleWeapon(p, 1, true); }
    const wantsFire = (c.firePressed || (c.fireDown && (p.weapon === 1 || (p.weapon === 0 && c.autoFire !== false) ))) && p.c < .2 && p.switchT <= 0;
    if (wantsFire && p.cool <= 0) {
      const auto = p.weapon !== 0 || !c.firePressed;
      if (p.weapon === 0 && c.fireDown && !c.firePressed && p.cool > 0) return;
      this.fire(p, auto);
    }
  }
  selectWeapon(p, i) {
    if (i === p.weapon) return; if (i > 0 && p.ammo[i] <= 0) return;
    p.weapon = i; p.switchT = WEAPONS[i].sw; this.emit('switch', { p: p.id, w: i });
  }
  cycleWeapon(p, dir, fromCover) {
    for (let k = 1; k <= 4; k++) { const i = ((p.weapon + dir * k) % 4 + 4) % 4; if (i === 0 || p.ammo[i] > 0) { this.selectWeapon(p, i); return; } }
  }
  fire(p, auto) {
    const w = WEAPONS[p.weapon], i = p.weapon;
    if (i === 0) { if (p.mag <= 0) { p.cool = .25; this.emit('empty', { p: p.id }); return; } p.mag--; p.cool = auto ? 1 / w.auto : 1 / w.rate; }
    else if (!this.cheats.ammo && !tune.player.infAmmo && p.ammo[i] <= 0) { this.selectWeapon(p, 0); return; }
    else { if (!this.cheats.ammo && !tune.player.infAmmo) p.ammo[i]--; p.cool = 1 / (i === 1 ? tune.weapon.mgRate : w.rate); }
    if (i !== 0 && p.ammo[i] <= 0 && !this.cheats.ammo && !tune.player.infAmmo) p.autoSwitch = true;
    p.lastFire = this.t; p.st.shots++; p.recoil = 1;
    this.emit('shot', { p: p.id, w: i });
    const pose = this.pose(p.id);
    let anyHit = false;
    if (i === 3) { this.fireGL(p, pose); }
    else {
      const n = i === 2 ? tune.weapon.sgPellets : 1;
      for (let k = 0; k < n; k++) {
        let ax = p.aim[0], ay = p.aim[1];
        const sp = i === 2 ? tune.weapon.sgSpread : i === 1 ? (w.spread + p.bloom) : 0;
        if (sp > 0) { const a = this.rng('spread') * TAU, r = Math.sqrt(this.rng('spread')) * sp * DEG / Math.tan(pose.fov * DEG / 2); ax += Math.cos(a) * r; ay += Math.sin(a) * r; }
        const dmg = i === 0 ? tune.weapon.hgDmg : i === 1 ? tune.weapon.mgDmg : w.dmg;
        if (this.shootRay(p, pose, ax, ay, dmg, i, k === 0)) anyHit = true;
      }
      if (i === 1) p.bloom = Math.min(w.bloom, p.bloom + .4);
    }
    if (!anyHit && i !== 3) { p.chain = 0; }
    if (p.autoSwitch) { p.autoSwitch = false; if (p.ammo[i] <= 0 && i > 0) this.selectWeapon(p, 0); }
  }
  // find nearest thing along a ray; returns {t, kind, ent, vol}
  castRay(o, d, opts = {}) {
    let best = { t: Infinity };
    const consider = (t, kind, ent, vol, pt) => { if (t < best.t && t > 0) best = { t, kind, ent, vol }; };
    for (const e of this.enemies) {
      if (e.dead || e.gone || e.civ && opts.noCiv) continue; const vols = this.volumes(e);
      for (const v of vols) { const t = v.k === 's' ? R3.raySphere(o, d, v.c, v.r) : v.k === 'c' ? R3.rayCapsule(o, d, v.a, v.b, v.r) : R3.rayBox(o, d, v.box); if (t < Infinity) consider(t, v.part || 'enemy', e, v); }
    }
    if (this.boss) for (const v of this.bossVolumes()) { if (v.dead) continue; const t = v.k === 's' ? R3.raySphere(o, d, v.c, v.r) : R3.rayBox(o, d, v.box); if (t < Infinity) consider(t, 'boss', this.boss, v); }
    for (const pr of this.proj) { if (pr.dead || pr.team === 'p') continue; const t = R3.raySphere(o, d, [pr.x, pr.y, pr.z], pr.r || 5); if (t < Infinity) consider(t, 'proj', pr, null); }
    for (const ob of this.objs) { if (ob.dead || ob.passive) continue; const t = R3.rayBox(o, d, { x0: ob.x - ob.rx, x1: ob.x + ob.rx, y0: ob.y - ob.ry, y1: ob.y + ob.ry, z0: ob.z, z1: ob.z + ob.h }); if (t < Infinity) consider(t, 'obj', ob, null); }
    // solid scenery: cover props and scene colliders block shots
    const blockers = this.colliders(opts.skip); for (const b of blockers) { const t = R3.rayBox(o, d, b); if (t < Infinity && t < best.t) { best = { t, kind: 'wall', ent: b }; } }
    // ground
    if (d[2] < 0) { const t = (0 - o[2]) / d[2]; if (t > 0 && t < best.t) best = { t, kind: 'ground' }; }
    return best;
  }
  colliders(skip) {
    if (!this._coll || this._collScene !== this.sceneId) { this._collScene = this.sceneId; this._coll = (this.scene.solids || []).filter(b => b.solid !== false); }
    const r = this._coll.slice();
    for (let i = 0; i < this.players.length; i++) if (i !== skip) r.push(this.coverBox(i));
    for (const o of this.objs) if (o.solid && !o.dead) r.push({ x0: o.x - o.rx, x1: o.x + o.rx, y0: o.y - o.ry, y1: o.y + o.ry, z0: o.z, z1: o.z + o.h, ent: o, mat: o.mat });
    return r;
  }
  shootRay(p, pose, ax, ay, dmg, wi, first) {
    const r = R3.ray(pose, ax, ay), hit = this.castRay(r.o, r.d, { skip: p.id });
    return this.resolveHit(p, hit, r, dmg, wi, first);
  }
  resolveHit(p, hit, r, dmg, wi, first) {
    const pos = [r.o[0] + r.d[0] * Math.min(hit.t, 3000), r.o[1] + r.d[1] * Math.min(hit.t, 3000), r.o[2] + r.d[2] * Math.min(hit.t, 3000)];
    if (hit.kind === 'ground' || hit.kind === 'wall') { this.emit('impact', { pos, mat: hit.kind === 'wall' && hit.ent.mat || 'ground', p: p.id }); return false; }
    if (hit.kind === 'head' || hit.kind === 'torso' || hit.kind === 'legs') return this.hitEnemy(p, hit.ent, hit.kind, dmg, wi, pos, r.d);
    if (hit.kind === 'boss') return this.hitBoss(p, hit.vol, dmg, wi, pos);
    if (hit.kind === 'proj') { this.shootDown(p, hit.ent, dmg); return true; }
    if (hit.kind === 'obj') { return this.hitObj(p, hit.ent, dmg, pos); }
    if (hit.kind === 'shield') { this.emit('impact', { pos, mat: 'steel', p: p.id, spark: 1 }); if (wi === 2 || wi === 3) { hit.ent.shieldDown = 1.5; this.emit('shieldaside', { id: hit.ent.id }); } return false; }
    return false;
  }
  fireGL(p, pose) {
    const r = R3.ray(pose, p.aim[0], p.aim[1]), sp = 640, a = Math.atan2(r.d[1], r.d[0]);
    this.proj.push({ id: this.nextId++, kind: 'gl', team: 'p', owner: p.id, x: r.o[0] + r.d[0] * 8, y: r.o[1] + r.d[1] * 8, z: r.o[2] + r.d[2] * 8 - 2, vx: r.d[0] * sp, vy: r.d[1] * sp, vz: r.d[2] * sp, g: GRAV, hp: 1, r: 3, life: 1.2 });
  }
  // ---------- damage and scoring ----------
  addScore(p, n, noChain) { const mul = noChain ? 1 : Math.min(2, 1 + Math.floor(p.chain / 5) * .1); p.score += Math.round(n * mul); this.checkLife(p); }
  checkLife(p) { while (p.score >= p.nextLife) { p.lives++; p.nextLife = p.nextLife < 400000 ? 400000 : 1e12; this.emit('oneup', { p: p.id }); } }
  hitEnemy(p, e, part, dmg, wi, pos, dir) {
    const def_ = reg('enemy', e.type); if (!def_) return false;
    if (e.civ) { this.civHit(p, e); return true; }
    p.st.hits++; p.chain++; p.best = Math.max(p.best, p.chain);
    let mult = part === 'head' ? 2 : part === 'legs' ? .75 : 1;
    if (e.armor && part !== 'head') mult *= e.armor;
    if (wi === 3) mult = 1;
    const d = dmg * mult * (def_.shotMul ? def_.shotMul(wi) : 1);
    this.addScore(p, 100); e.hp -= d; e.flash = .08; e.hurtT = .25; e.lastHit = p.id;
    if (part === 'legs' || wi === 2) { e.stagger = .3; }
    this.emit('hit', { p: p.id, id: e.id, part, pos, head: part === 'head' });
    if (e.hp <= 0 || (part === 'head' && e.hp <= 0)) { if (part === 'head') { p.st.heads++; this.addScore(p, 500); this.emit('headshot', { p: p.id, pos }); } this.killEnemy(e, p, wi, dir, part); }
    else if (def_.onHit) def_.onHit(this, e, p);
    return true;
  }
  killEnemy(e, p, wi, dir, part) {
    if (e.dead) return; e.dead = true; e.dt = 0; e.dying = 1; const d = reg('enemy', e.type);
    e.deathStyle = wi === 2 && Math.abs(e.x - this.pose(p ? p.id : 0).x) < 150 ? 'flyback' : wi === 1 ? 'spin' : wi === 3 ? 'flyback' : (e.z > 20 && e.entryKind !== 'run' ? 'fall' : 'crumple');
    if (e.water) e.deathStyle = 'splash';
    p = p || this.players[0]; p.st.kills++;
    let pts = d.score || 1000; const quick = e.exposedAt != null && this.t - e.exposedAt < .7; if (quick) { pts += 500; p.st.quick++; this.emit('quick', { p: p.id }); }
    this.addScore(p, pts); this.threats = this.threats.filter(t => t.src !== e.id);
    this.emit('kill', { p: p.id, id: e.id, type: e.type, pos: [e.x, e.y, e.z + 12], score: pts, style: e.deathStyle });
    if (d.elite) { this.timer += tune.time.elite; this.emit('extend', { s: tune.time.elite }); }
    if (d.drop) this.drop(e, p, d.drop === true ? e.drop : d.drop);
    if (e.drop && !d.drop) this.drop(e, p, e.drop);
    if (d.onDie) d.onDie(this, e, p);
    if (e.onDie) e.onDie(this, e, p);
    if (e.flagOnDie) this.flags[e.flagOnDie] = 1;
    this.lastKill = { t: this.t };
  }
  drop(e, p, kind) {
    const wi = { mg: 1, sg: 2, gl: 3 }[kind]; if (!wi) return; const W = WEAPONS[wi], n = Math.round(W.pick * tune.weapon.ammoMul);
    const had = p.seen[wi]; p.seen[wi] = 1; p.ammo[wi] = Math.min(W.pool, p.ammo[wi] + n);
    this.emit('pickup', { p: p.id, w: wi, n, first: !had, pos: [e.x, e.y, e.z + 12] });
  }
  shootDown(p, pr, dmg) {
    pr.hp -= dmg; this.emit('impact', { pos: [pr.x, pr.y, pr.z], mat: 'steel', p: p.id });
    if (pr.hp <= 0) { pr.dead = true; p.chain++; this.addScore(p, 1000); p.st.hits++; this.threats = this.threats.filter(t => t.proj !== pr.id); this.explode(pr.x, pr.y, pr.z, pr.kind === 'torpedo' ? 40 : 48, 'p', p.id, pr.kind === 'grenade' ? 3 : 2, true); this.emit('shotdown', { p: p.id, kind: pr.kind }); }
  }
  explode(x, y, z, rad, team, owner, dmg, small) {
    this.emit('explode', { pos: [x, y, z], r: rad, big: !small });
    this.shake = Math.min(1, this.shake + (small ? .15 : .35));
    const pl = this.players[owner || 0];
    for (const e of this.enemies.slice()) {
      if (e.dead || e.civ) continue; const d = Math.hypot(e.x - x, e.y - y, e.z + 12 - z);
      if (d < rad) { const f = 1 - d / rad * .75; e.hp -= dmg * f * (e.armor ? .6 : 1); e.flash = .1; e.hurtT = .3; this.emit('hit', { p: owner, id: e.id, part: 'torso', pos: [e.x, e.y, e.z + 12] }); if (team === 'p') { pl.st.hits++; this.addScore(pl, 100); } if (e.hp <= 0) this.killEnemy(e, pl, 3, null, 'torso'); }
    }
    for (const ob of this.objs.slice()) { if (ob.dead || ob.passive) continue; const d = Math.hypot(ob.x - x, ob.y - y, ob.z + ob.h / 2 - z); if (d < rad) this.hitObj(pl, ob, dmg, [x, y, z], true); }
    if (this.boss && team === 'p') this.bossExplode(pl, x, y, z, rad, dmg);
  }
  loseLife(p, why) {
    if (this.cheats.god || tune.player.godMode) return;
    p.lives--; p.chain = 0; p.st.lost++; p.inv = tune.player.iframes; p.hurt = .5; this.shake = Math.min(1, this.shake + .5);
    this.emit('hurt', { p: p.id, why, lives: p.lives });
    if (p.lives <= 0) { p.down = true; p.contT = this.players.length > 1 ? 10 : 10; p.contFail = false; this.emit('down', { p: p.id }); this.checkOver(); }
  }
  checkOver() { if (this.players.every(p => p.down && (p.contFail || this.o.noContinue))) { if (!this.over) { this.over = true; this.phase = 'over'; this.emit('gameover', {}); } } }
  continuePlayer(p) { p.down = false; p.lives = this.diff.lives; p.score = 0; p.mark = (p.mark || 0) + 1; p.continues++; p.contT = 0; p.inv = 2; p.c = 0; p.ammo = [9, 0, 0, 0]; p.mag = 9; p.weapon = 0; this.emit('continue', { p: p.id }); if (this.phase === 'over') { this.over = false; this.phase = 'travel'; } this.restartScene(); }
  restartScene() { const keep = this.players.map(p => ({ ...p })); this.jump(this.stage, this.sceneId); }
  civHit(p, e) { p.st.civ++; p.score = Math.max(0, p.score - 5000); this.emit('civhit', { p: p.id, id: e.id }); this.loseLife(p, 'civ'); e.dead = true; e.dt = 0; e.deathStyle = 'crumple'; e.civ = true; this.say('juno', 'Civilian down! Hold your fire!'); }
  // ---------- threats (the crisis flash) ----------
  newThreat(src, kind, tel, o = {}) {
    const alive = this.players.filter(p => !p.down); if (!alive.length) return null;
    const tgtP = o.target != null ? this.players[o.target] : alive[Math.floor(this.rng('tgt') * alive.length)];
    const th = Object.assign({ id: this.nextId++, src: src && src.id, kind, tgt: tgtP.id, t0: this.t, tel, at: this.t + tel, shifted: false }, o);
    // enforce the minimum gap between impacts on one player
    const gap = tune.enemy.minGap; for (const t of this.threats) if (t.tgt === th.tgt && Math.abs(t.at - th.at) < gap) th.at = t.at + gap;
    th.tel = th.at - th.t0; this.threats.push(th); this.emit('threat', { id: th.id, src: th.src, tgt: th.tgt, tel: th.tel, kind, sp: o.sp }); return th;
  }
  stepThreats(dt) {
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const th = this.threats[i], p = this.players[th.tgt]; if (!p) { this.threats.splice(i, 1); continue; }
      const left = th.at - this.t;
      if (left <= 0) {
        if (!th.shifted && this.exposed(p) && p.exposedSince > th.at - .25 && p.exposedSince > th.t0 + .05) { th.shifted = true; th.at += .15; continue; }
        this.threats.splice(i, 1);
        if (p.down) continue;
        const ignoreCover = th.ignoreCover;
        if ((this.exposed(p) || ignoreCover) && p.inv <= 0) { this.emit('impactme', { p: p.id, src: th.src, kind: th.kind }); this.loseLife(p, th.kind); }
        else if (!this.exposed(p) && !ignoreCover) { p.st.saves++; this.emit('blocked', { p: p.id, src: th.src, kind: th.kind }); }
      }
    }
  }
  stepFx(dt) { }
  // a deterministic digest of the whole state, for determinism tests and net checks
  hash() {
    const r = n => Math.round(n * 100) / 100;
    const st = [this.t.toFixed(3), this.phase, this.sceneId, this.timer.toFixed(2), this.rail.toFixed(1), this.players.map(p => [p.score, p.lives, r(p.c), p.weapon, p.mag, p.ammo.join(','), p.st.hits, p.st.shots].join(':')).join('|'),
      this.enemies.map(e => [e.id, e.type, r(e.x), r(e.y), r(e.foot), e.st, e.hp, e.dead ? 1 : 0].join(':')).join('|'), this.threats.map(t => t.id + ':' + r(t.at)).join(','), this.proj.map(p => p.id + ':' + r(p.x)).join(','), this.boss ? Object.values(this.boss.parts).map(p => r(p.hp)).join(',') : ''].join('#');
    return hash32(st);
  }
}
const approach = (a, b, d) => a < b ? Math.min(b, a + d) : Math.max(b, a - d);
