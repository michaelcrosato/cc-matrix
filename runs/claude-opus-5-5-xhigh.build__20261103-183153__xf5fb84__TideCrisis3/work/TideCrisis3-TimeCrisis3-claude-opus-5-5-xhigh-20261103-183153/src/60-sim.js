/* 60-sim: Sim, the authoritative, deterministic game state, stepped from player commands with seeded RNG streams.
 * The presentation (renderer, HUD, audio, FX) only reads it and drains sim.events. The headless tests, the bot, the
 * attract mode and the AI Hub host all drive it the same way.
 *   const sim = new Sim({ mode: 'arcade' | 'stage' | 'coop' | 'range' | 'attract' | 'host', stage: 1, scene: '1-1',
 *     difficulty: 'normal', seed, cheats: { god, ammo }, players: [{ name, color, agent }] });
 *   sim.step(dt, commands); sim.cameraFor(i); sim.jump(stage, sceneId); sim.hash()
 * Phases: cut (a cutscene) -> travel (WAIT) -> arrive -> action (TIME runs) -> clear -> travel ... -> outro (cut) ->
 * done; continue and gameover when lives run out. */
const WORLDS = new Map();
function worldOf(stage) {
  let W = WORLDS.get(stage.id); if (W) return W;
  const G = new Builder({ maxEdge: 48 }), S = { carriers: {}, statics: [] };
  stage.build(G, S);
  const env = stage.env;
  W = bakeWorld(G, env); W.extra = S; env._lights = W.lights;
  WORLDS.set(stage.id, W); return W;
}
TC.worldOf = worldOf;

class Sim {
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'arcade'; this.seed = (o.seed === undefined ? 12345 : o.seed) >>> 0; this._rng = {};
    this.diffId = o.difficulty || 'normal'; this.diff = DIFF[this.diffId] || DIFF.normal;
    this.cheats = Object.assign({ god: false, ammo: false }, o.cheats || {});
    this.t = 0; this.events = []; this._id = 1; this.flags = {}; this.say_q = [];
    this.players = (o.players && o.players.length ? o.players : [{}]).map((p, i) => newPlayer(this, p, i));
    this.enemies = []; this.projectiles = []; this.objects = []; this.threats = []; this.boss = null; this.carriers = {};
    this.runStats = { stages: [] }; this.contUsed = 0; this.stageQueue = o.stages || null;
    this.loadStage(o.stage || 1, o.scene, o.skipIntro || this.mode === 'host' || this.mode === 'attract' || this.mode === 'range' || !!o.scene);
  }
  /* ---- plumbing ---- */
  nid() { return this._id++; }
  rng(stream) { let f = this._rng[stream]; if (!f) f = this._rng[stream] = E.rng((this.seed ^ hashStr(stream)) >>> 0); return f(); }
  ev(e) { e.t = this.t; this.events.push(e); if (this.events.length > 600) this.events.splice(0, 200); }
  drain() { const e = this.events; this.events = []; return e; }
  cheat(p, k) { return !!(this.cheats[k] || (k === 'god' && tune.player.god) || (k === 'ammo' && tune.player.infAmmo)); }
  flag(k) { const v = this.flags[k]; this.flags[k] = true; return v; }
  enemyById(id) { for (const e of this.enemies) if (e.id === id) return e; return null; }
  say(who, text) { this.ev({ type: 'say', who, text }); }
  cue(name, data) { if (this.dir) this.dir.cue(name, data); this.ev({ type: 'cue', name }); }
  launch(o) { return launch(this, o); }
  explode(at, r, dmg, owner, air, kind) { explode(this, at, r, dmg, owner, air, kind); }
  threatsPopOut(p) { threatsPopOut(this, p); }
  waterZ() { const w = this.stage.env.water; return w ? w.z + (this.waterRise || 0) : -1e4; }
  groundBelow(e) { return this.stage.env.water ? Math.max(this.waterZ(), (e.cover && e.cover.floor) || -999) : 0; }
  timeExtend(s) { if (s > 0 && (this.phase === 'action')) { this.timer += s; this.ev({ type: 'extend', s }); } }

  /* ---- stages and scenes ---- */
  loadStage(id, sceneId, skipIntro) {
    this.stage = reg('stage', id); if (!this.stage) throw new Error('unknown stage ' + id);
    this.stageNum = typeof id === 'number' ? id : (this.stage.num || 1);
    this.world = worldOf(this.stage);
    this.enemies = []; this.projectiles = []; this.threats = []; this.objects = []; this.boss = null; this.waterRise = 0;
    this.carriers = {};
    for (const [cid, C] of Object.entries(this.stage.carriers || {})) this.carriers[cid] = { id: cid, C, path: new E.Path(C.path, { smooth: 'catmull' }), d: 0, M: null, yaw: 0, pos: [0, 0, 0] };
    for (const cid in this.carriers) this.poseCarrier(this.carriers[cid]);
    for (const sid of this.stage.scenes) { const sc = reg('scene', sid); for (const ob of sc.objects || []) addObject(this, ob[0], ob[1], Object.assign({ scene: sid }, ob[2] || {})); }
    if (this.stage.setup) this.stage.setup(this);
    this.stageStart = { score: this.players.map(p => p.score), stats: this.players.map(p => Object.assign({}, p.stats)), t: this.t };
    this.contAtStage = this.contUsed;
    const idx = sceneId ? this.stage.scenes.indexOf(sceneId) : 0;
    this.sceneIdx = Math.max(0, idx);
    this.startScene(this.sceneIdx, true);
    if (!skipIntro && this.stage.intro) this.playCut(this.stage.intro, () => this.setPhase('travel'));
    else if (sceneId) this.arriveNow();
    this.ev({ type: 'stage', stage: this.stage.id });
  }
  startScene(i, first) {
    // where the players stand now (the scene they are leaving), read before the scene changes: the ride starts there
    this.prevSlots = first || !this.scene ? null : this.slotWorld();
    this.sceneIdx = i; this.scene = prepScene(reg('scene', this.stage.scenes[i]));
    for (const e of this.enemies) if (e.th) { e.th.done = true; }
    this.enemies = []; this.projectiles = []; for (const t of this.threats) t.done = true; this.threats = []; this.boss = null;
    this.dir = new Director(this, this.scene);
    this.timer = this.scene.time * this.diff.time * tune.time.sceneMul;
    this.travelD = 0; this.travelL = 0; this.rail = null; this.phase = 'travel'; this.phaseT = 0; this.slotsAlt = null; this.slotBlend = null;
    if (this.scene.carrier) { const C = this.carriers[this.scene.carrier]; C.d = this.scene.carrierFrom || 0; this.poseCarrier(C); }
    this.buildRail(first);
    if (this.scene.onEnter) this.scene.onEnter(this);
    this.ev({ type: 'scene', id: this.scene.id, title: this.scene.title, n: i });
  }
  /** the current slots in world space [{ stand: pose, cover: pose }] */
  slotWorld() { return this.scene.slots.map((s, i) => ({ stand: this.slotPose(i, 0), cover: this.slotPose(i, 1) })); }
  buildRail(first) {
    const sc = this.scene, end = this.slotPose(0, 0), pts = [];
    const from = this.prevSlots ? this.prevSlots[0].stand : this.startPose || (sc.arrive.start ? { x: sc.arrive.start[0], y: sc.arrive.start[1], z: sc.arrive.start[2] } : null);
    if (from) pts.push([from.x, from.y, from.z]);
    for (const p of (typeof sc.arrive.path === 'function' ? sc.arrive.path(from) : sc.arrive.path)) pts.push(p.slice());
    pts.push([end.x, end.y, end.z]);
    if (first && !from) pts.shift();
    this.rail = new E.Path(pts, { smooth: 'catmull' }); this.travelL = this.rail.length; this.travelD = 0;
    this.railFromYaw = this.prevSlots ? this.prevSlots[0].stand.yaw : null;
  }
  /** jump straight to the current scene's action (dev, attract, tests, stage select) */
  arriveNow() { this.travelD = this.travelL; this.setPhase('arrive'); this.phaseT = .35; }
  jump(stageId, sceneId, o = {}) {
    if (stageId !== this.stage.id) this.loadStage(stageId, sceneId, true);
    else {
      for (const e of this.enemies) if (e.th) e.th.done = true;
      this.enemies = []; this.projectiles = []; this.threats = []; this.boss = null;
      this.startScene(Math.max(0, this.stage.scenes.indexOf(sceneId)), true);
      this.arriveNow();
    }
    this.cut = null;
    if (o.phase === 'travel') { this.setPhase('travel'); this.travelD = 0; }
    this.ev({ type: 'jump', scene: sceneId });
  }
  restartScene() { this.jump(this.stage.id, this.scene.id); }
  setPhase(ph) {
    this.phase = ph; this.phaseT = 0; this.ev({ type: 'phase', phase: ph, scene: this.scene && this.scene.id });
    if (ph === 'action') {
      this.dir.start();
      if (this.scene.boss) { this.boss = makeBoss(this, this.scene.boss); }
      this.ev({ type: 'action', scene: this.scene.id, boss: this.scene.boss || null });
    }
  }
  carrierD() { const C = this.scene.carrier && this.carriers[this.scene.carrier]; return C ? C.d : 0; }
  poseCarrier(C) {
    const L = C.path.length, d = clamp(C.d, 0, L - .01), p = C.path.at(d), z = (C.C.z !== undefined ? C.C.z : p.z);
    const yaw = C.C.fixedYaw !== undefined ? C.C.fixedYaw * DEG : p.angle;
    C.pos = [p.x, p.y, z]; C.yaw = yaw; C.M = mat34(p.x, p.y, z, yaw, 0, 0, 1);
  }
  /** player i's slot pose: k = 0 stand, 1 cover -> { x, y, z, yaw, pitch } */
  slotPose(i, k) {
    const sc = this.scene, slots = this.slotsAlt || sc.slots, slot = slots[Math.min(i, slots.length - 1)], s = k ? slot.cover : slot.stand;
    if (sc.carrier) {
      const C = this.carriers[sc.carrier], w = xform(C.M, s.at);
      return { x: w[0], y: w[1], z: w[2], yaw: C.yaw + (s.yaw || 0) * DEG, pitch: (s.pitch || 0) * DEG };
    }
    const look = s.look || [s.at[0] + 100, s.at[1], s.at[2]], [yaw, pitch] = lookAngles(s.at, look);
    return { x: s.at[0], y: s.at[1], z: s.at[2], yaw, pitch };
  }
  slotGround(i) { const p = this.slotPose(i, 0); return [p.x, p.y, p.z - EYE]; }
  focus() { const p = this.slotPose(0, 0); return [p.x, p.y, p.z]; }
  /** player i's logical camera pose (the origin of every ray; no shake) */
  cameraFor(i) {
    const fov = tune.view.fov;
    if (this.cut && this.cut.cam) return Object.assign({ fov }, this.cut.cam);
    const ph = this.phase;
    if (ph === 'travel' && this.rail) {
      const L = this.travelL, u = L > 0 ? clamp(this.travelD / L, 0, 1) : 1, us = smooth(u), d = us * L, p = this.rail.at(Math.min(L - .01, d));
      const ahead = this.rail.at(Math.min(L - .01, d + 50)), end = this.slotPose(0, 0);
      let yaw = Math.atan2(ahead.y - p.y, ahead.x - p.x), pitch = Math.atan2(ahead.z - p.z, Math.hypot(ahead.x - p.x, ahead.y - p.y)) * .5;
      if (L - d < 52 || !(Math.hypot(ahead.x - p.x, ahead.y - p.y) > 1)) { yaw = end.yaw; pitch = end.pitch; }
      if (this.railFromYaw !== null && u < .2) yaw = lerpAng(this.railFromYaw, yaw, smooth(u / .2));
      const lk = clamp((u - .7) / .3, 0, 1); yaw = lerpAng(yaw, end.yaw, smooth(lk)); pitch = lerp(pitch, end.pitch, smooth(lk));
      let x = p.x, y = p.y, z = p.z;
      if (i > 0) { const cur = this.slotPose(i, 0), off1 = [cur.x - end.x, cur.y - end.y, cur.z - end.z], prev = this.prevSlots ? this.prevSlots[Math.min(i, this.prevSlots.length - 1)].stand : null, prev0 = this.prevSlots ? this.prevSlots[0].stand : null, off0 = prev ? [prev.x - prev0.x, prev.y - prev0.y, prev.z - prev0.z] : off1; x += lerp(off0[0], off1[0], us); y += lerp(off0[1], off1[1], us); z += lerp(off0[2], off1[2], us); }
      const bob = this.scene.arrive.walk ? Math.sin(this.t * 12.6) * 1.2 * (1 - lk) : 0;
      return { x, y, z: z + bob, yaw, pitch, fov };
    }
    const p = this.players[i] || this.players[0], c = smooth(p.c), a = this.slotPose(i, 0), b = this.slotPose(i, 1);
    let yaw = lerpAng(a.yaw, b.yaw, c), pitch = lerp(a.pitch, b.pitch, c);
    if (ph === 'arrive' && this.railEnd) { const k = smooth(clamp(this.phaseT / .35, 0, 1)); yaw = lerpAng(this.railEnd.yaw, yaw, k); pitch = lerp(this.railEnd.pitch, pitch, k); }
    const out = { x: lerp(a.x, b.x, c), y: lerp(a.y, b.y, c), z: lerp(a.z, b.z, c), yaw, pitch, fov };
    if (this.slotBlend && this.slotBlend.path) {   // climbing: along the path, looking where it goes, then at the new slot
      const B = this.slotBlend, u = clamp((this.t - B.t) / B.dur, 0, 1), us = smooth(u), d = us * B.L, q = B.path.at(Math.min(B.L - .01, d)), ah = B.path.at(Math.min(B.L - .01, d + 40));
      let yw = Math.hypot(ah.x - q.x, ah.y - q.y) > 1 ? Math.atan2(ah.y - q.y, ah.x - q.x) : out.yaw, pt = Math.atan2(ah.z - q.z, Math.max(1, Math.hypot(ah.x - q.x, ah.y - q.y))) * .5;
      if (u < .15) { const f = B.from[0]; yw = lerpAng(f.yaw, yw, smooth(u / .15)); pt = lerp(f.pitch, pt, smooth(u / .15)); }
      const lk = smooth(clamp((u - .8) / .2, 0, 1)); yw = lerpAng(yw, out.yaw, lk); pt = lerp(pt, out.pitch, lk);
      const f0 = B.from[0], fi = B.from[i] || f0, a0 = this.slotPose(0, 0), off0 = [fi.x - f0.x, fi.y - f0.y, fi.z - f0.z], off1 = [a.x - a0.x, a.y - a0.y, a.z - a0.z];
      return { x: q.x + lerp(off0[0], off1[0], us), y: q.y + lerp(off0[1], off1[1], us), z: q.z + lerp(off0[2], off1[2], us) + Math.sin(this.t * 12.6) * 1.1 * (1 - lk), yaw: yw, pitch: pt, fov };
    }
    if (this.slotBlend && this.slotBlend.from[i]) { const k = smooth(clamp((this.t - this.slotBlend.t) / .6, 0, 1)), f = this.slotBlend.from[i]; if (k >= 1 && i === 0) this.slotBlend = null; else { out.x = lerp(f.x, out.x, k); out.y = lerp(f.y, out.y, k); out.z = lerp(f.z, out.z, k) + Math.sin(k * Math.PI) * 6; out.yaw = lerpAng(f.yaw, out.yaw, k); out.pitch = lerp(f.pitch, out.pitch, k); } }
    return out;
  }
  /** move every player to new slots mid-scene along a path (up a stair): the clock stops until they arrive, then cue */
  climb(slots, path, speed, cue) {
    const from = this.players.map((p, i) => this.cameraFor(i)), pts = [[from[0].x, from[0].y, from[0].z]].concat(path.map(p => p.slice()));
    this.slotsAlt = prepScene({ slots: slots.map(s => ({ stand: s.stand, cover: s.cover })), covers: {} }).slots;
    const end = this.slotPose(0, 0); pts.push([end.x, end.y, end.z]);
    const P = new E.Path(pts, { smooth: 'catmull' }); this.slotBlend = { from, t: this.t, path: P, L: P.length, dur: P.length / speed, cue };
    for (const p of this.players) p.c = 0;
    this.ev({ type: 'climb' });
  }
  climbing() { return !!(this.slotBlend && this.slotBlend.path); }
  /** move every player to new slots mid-scene (a cover swap), the camera diving across */
  swapSlots(alt) { const from = this.players.map((p, i) => this.cameraFor(i)); this.slotsAlt = prepScene({ slots: alt.map(s => ({ stand: s.stand, cover: s.cover })), covers: {}, carrier: this.scene.carrier }).slots; this.slotBlend = { from, t: this.t }; this.ev({ type: 'swap' }); }

  /* ---- the step ---- */
  step(dt, cmds = []) {
    const ph = this.phase;
    if (ph === 'gameover' || ph === 'done') { this.phaseT += dt; return; }
    if (ph === 'continue') { this.continueStep(dt, cmds); return; }
    this.t += dt; this.phaseT += dt;
    if (this.cut) { cutStep(this, dt, cmds); if (this.cut) return; }
    // the rail and the phases
    if (ph === 'travel') {
      const sp = (this.scene.arrive.speed || 140) * (this.mode === 'attract' ? 1.5 : 1);
      this.travelD = Math.min(this.travelL, this.travelD + sp * dt * (this.travelL > 0 ? 1 : 0));
      if (this.travelL <= 0 || this.travelD >= this.travelL) { this.railEnd = this.cameraFor(0); this.setPhase('arrive'); }
    } else if (ph === 'arrive') {
      if (this.phaseT >= .35) this.setPhase('action');
    } else if (ph === 'clear') {
      if (this.phaseT >= 1.4) this.nextScene();
    }
    const live = this.phase === 'action';
    // carriers move during action
    if (this.scene.carrier && (this.phase === 'action' || this.phase === 'clear')) {
      const C = this.carriers[this.scene.carrier], L = C.path.length;
      let hold = this.scene.carrierHold && !this.dir.clear() ? this.scene.carrierHold : L;
      for (const [hd, wid] of this.scene.holds || []) { if (C.d > hd + 1) continue; const W = this.dir.waves.find(w => w.id === wid); if (W && (!W.started || !this.dir.waveDone(W))) { hold = Math.min(hold, hd); break; } }
      if (C.d < Math.min(L - 1, hold)) C.d = Math.min(L - 1, hold, C.d + (this.scene.carrierSpeed || C.C.speed || 80) * dt);
      this.poseCarrier(C);
      // whoever the carrier leaves behind is gone
      const fx = Math.cos(C.yaw), fy = Math.sin(C.yaw), cam = this.cameraFor(0);
      if (!C.C.fixedYaw) for (const e of this.enemies) if (e.alive && e.carrier !== this.scene.carrier && !e.ally && (e.x - cam.x) * fx + (e.y - cam.y) * fy < -50) { e.gone = true; e.alive = false; if (e.cover && e.cover.taken === e.id) e.cover.taken = 0; for (const t of this.threats) if (t.src === e.id && !t.done) { t.done = true; t.cancelled = true; } }
    }
    // players
    for (const p of this.players) {
      const cmd = cmds[p.id] || NOCMD;
      if (!p.present) { p.c = 1; continue; }
      if (p.out) { this.outStep(p, dt, cmd); continue; }
      if (live) { playerStep(this, p, cmd, dt); weaponStep(this, p, cmd, dt); p.stats.time += dt; }
      else { p.c = Math.max(0, p.c - dt / tune.player.coverOut); p.heldT = 0; p.recoil = Math.max(0, p.recoil - dt * 6); if (p.mag < 9 && this.phase === 'travel') p.mag = 9; }
    }
    if (this.phase === 'action') this.dir.step(dt);
    enemiesStep(this, dt);
    threatsStep(this);
    projectilesStep(this, dt);
    objectsStep(this, dt);
    if (this.boss) bossStep(this, this.boss, dt);
    if (this.scene.tick) this.scene.tick(this, dt);
    // TIME
    if (this.phase === 'action') {
      if (this.climbing() && this.t - this.slotBlend.t >= this.slotBlend.dur) { const cue = this.slotBlend.cue; this.slotBlend = null; if (cue) this.cue(cue); }
      if (!tune.time.freeze && !this.cheats.freeze && this.mode !== 'attract' && !this.climbing() && (this.mode !== 'range' || this.scene.timed && this.flags.timed)) this.timer -= dt;
      if (this.timer <= 0) this.timeUp();
      if (this.dir.clear()) this.sceneClear();
    }
    // continues
    if (this.mode !== 'coop' && this.mode !== 'host' && this.players.every(p => p.out || !p.present) && this.phase !== 'gameover') {
      if (this.mode === 'attract') { for (const p of this.players) { p.out = false; p.lives = 9; } }
      else { this.resumePhase = this.phase; this.phase = 'continue'; this.ev({ type: 'continue', t: 10 }); }
    }
    if ((this.mode === 'coop') && this.players.every(p => p.out && p.contT <= 0)) { this.phase = 'gameover'; this.ev({ type: 'gameover' }); }
  }
  outStep(p, dt, cmd) {
    p.c = 1; p.contT -= dt;
    if (this.mode === 'host') { if (p.contT <= 0) { p.out = false; p.lives = Math.max(1, Math.ceil(this.diff.lives / 2)); p.score = Math.max(0, p.score - 5000); p.inv = 2; this.ev({ type: 'return', p: p.id }); } return; }
    if (this.mode === 'coop' && cmd.firePressed && p.contT > 0) this.continueRun(p.id);
  }
  continueStep(dt, cmds) {
    for (const p of this.players) { p.contT -= dt; if (cmds[p.id] && cmds[p.id].firePressed && p.contT < 9.6) { this.continueRun(p.id); break; } }
    if (this.phase === 'continue' && this.players.every(p => p.contT <= 0)) { this.phase = 'gameover'; this.ev({ type: 'gameover' }); }
  }
  /** a continue: lives restored, the score back to 0 (a continue mark is shown), the scene's waves restart */
  continueRun(i) {
    const p = this.players[i]; if (!p || !p.out) return false;
    p.out = false; p.lives = tune.player.startLives || this.diff.lives; p.score = 0; p.conts++; p.chain = 0; p.inv = 2; this.contUsed++;
    this.ev({ type: 'continued', p: i });
    if (this.phase === 'continue') {
      this.phase = this.resumePhase || 'action';
      if (this.mode !== 'coop') { const keepD = this.carrierD(); this.enemies = this.enemies.filter(e => e.ally); this.projectiles = []; for (const t of this.threats) t.done = true; this.threats = []; this.dir = new Director(this, this.scene); this.timer = this.scene.time * this.diff.time * tune.time.sceneMul; if (this.boss) { this.boss = makeBoss(this, this.scene.boss, this.boss); } if (this.phase === 'action') this.dir.start(); if (this.scene.carrier) { this.carriers[this.scene.carrier].d = keepD; } }
    }
    return true;
  }
  timeUp() {
    this.ev({ type: 'timeup' });
    for (const p of this.players) if (!p.out && p.present) hurtPlayer(this, p, 'time', true);
    this.timer = this.scene.time * this.diff.time * tune.time.sceneMul * tune.time.refill;
  }
  sceneClear() {
    const bonus = Math.max(0, Math.floor(this.timer)) * 100;
    for (const p of this.players) if (!p.out && p.present) addScore(this, p, bonus, null, true);
    this.ev({ type: 'clear', scene: this.scene.id, bonus, time: this.timer });
    this.cue('clear');
    for (const t of this.threats) if (!t.done) { t.done = true; t.cancelled = true; }
    this.projectiles = [];
    this.setPhase('clear');
  }
  nextScene() {
    const i = this.sceneIdx + 1;
    if (i < this.stage.scenes.length) { this.startScene(i, false); this.setPhase('travel'); return; }
    // the stage is over: its outro, then done
    const finish = () => { this.phase = 'done'; this.phaseT = 0; this.ev({ type: 'stageclear', stage: this.stage.id }); };
    if (this.stage.outro && this.mode !== 'host' && this.mode !== 'attract' && this.mode !== 'range') this.playCut(this.stage.outro, finish); else finish();
  }
  /** the next stage of a run (arcade): keeps players, score, ammo and lives */
  nextStage(id) { this.loadStage(id, null, this.mode === 'host'); }
  playCut(id, onDone) { startCut(this, id, onDone); }

  /* ---- rays ---- */
  /** the nearest world collider (static and objects) along a ray within maxT -> { t, col } */
  rayWorld(ray, maxT = 4000, objs = true) {
    let best = null, bt = maxT;
    for (const c of this.world.colliders) { if (!c.alive) continue; const t = rayCollider(ray.o, ray.d, c); if (t >= 0 && t < bt) { bt = t; best = c; } }
    if (objs) for (const ob of this.objects) { if (!ob.alive || (ob.K.popup && ob.up < .6)) continue; const t = rayBox(ray.o, ray.d, ob.box); if (t >= 0 && t < bt) { bt = t; best = ob.col; } }
    if (this.boss && this.boss.colliders) for (const c of this.boss.colliders()) { const t = rayCollider(ray.o, ray.d, c); if (t >= 0 && t < bt) { bt = t; best = c; } }
    const wz = this.waterZ(); if (ray.d[2] < 0 && wz > -1e3) { const t = (wz - ray.o[2]) / ray.d[2]; if (t >= 0 && t < bt) { bt = t; best = { impact: 'water', water: true }; } }
    if (ray.d[2] < 0 && !this.stage.env.water) { const t = (0 - ray.o[2]) / ray.d[2]; if (t >= 0 && t < bt) { bt = t; best = { impact: 'stone', ground: true }; } }
    return best ? { t: bt, col: best } : null;
  }
  /** the nearest enemy volume along a ray -> { t, e, part } */
  rayEnemies(ray, maxT = 4000, withAllies = false) {
    let best = null, bt = maxT;
    for (const e of this.enemies) {
      const V = e.vols; if (!V || (!e.alive && !e.civ)) continue;
      if (e.ally && !withAllies) continue;
      for (const part in V) {
        const v = V[part]; if (part === 'hidden') continue;
        const t = v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r);
        if (t >= 0 && t < bt) { bt = t; best = { t, e, part }; }
      }
      if (e.hvols && e.alive) for (const part in e.hvols) { const v = e.hvols[part], t = v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r); if (t >= 0 && t < bt) { bt = t; best = { t, e, part: 'hostage' }; } }
    }
    return best;
  }
  /** a player's shot: the nearest of enemies, projectiles, the boss, objects and the world; applies it -> { at, kind, scoring } */
  resolveRay(ray, p, W, primary) {
    const hits = [], push = (t, k, d) => hits.push({ t, k, d });
    const w = this.rayWorld(ray, 4000); if (w) push(w.t, w.col.obj ? 'obj' : 'world', w.col);
    const en = this.rayEnemies(ray, w ? w.t : 4000, true); if (en) push(en.t, 'enemy', en);
    for (const pr of this.projectiles) { if (!pr.alive || pr.owner >= 0) continue; const t = raySphere(ray.o, ray.d, pr.pos, pr.r * 1.7); if (t >= 0) push(t, 'proj', pr); }
    if (this.boss && this.boss.rayTest) { const b = this.boss.rayTest(this, ray); if (b) push(b.t, 'boss', b); }
    hits.sort((a, b) => a.t - b.t);
    const dmg = W.dmg();
    for (const h of hits) {
      const at = V3.add(ray.o, V3.mul(ray.d, h.t));
      if (h.k === 'enemy') {
        const { e, part } = h.d;
        if (e.ally) { if (!this.allyBarkT || this.t > this.allyBarkT) { this.allyBarkT = this.t + 5; this.ev({ type: 'allyhit', e: e.id }); } continue; }
        if (part === 'shield') { this.ev({ type: 'impact', at, mat: 'metal', shield: true }); if (W.knock || p.weapon === 'gl') damageEnemy(this, e, 0, p, 'torso', { weapon: p.weapon }); return { at, kind: 'shield', scoring: false }; }
        if (part === 'hostage') { if (e.alive) civHit(this, { civHitT: 0, flash: 0, x: e.x, y: e.y, z: e.z, id: e.id }, p); return { at, kind: 'civ', scoring: false }; }
        if (e.civ) { civHit(this, e, p); return { at, kind: 'civ', scoring: false }; }
        if (!e.alive) continue;
        damageEnemy(this, e, dmg, p, part, { weapon: p.weapon });
        this.ev({ type: 'hitmark', p: p.id, head: part === 'head', at });
        return { at, kind: part === 'head' ? 'head' : 'enemy', scoring: true };
      }
      if (h.k === 'proj') { shootProjectile(this, h.d, p, dmg); this.ev({ type: 'hitmark', p: p.id, at }); return { at, kind: 'proj', scoring: true }; }
      if (h.k === 'boss') { const r = this.boss.hit(this, h.d, p, dmg, p.weapon, at); if (r === false) continue; this.ev({ type: 'hitmark', p: p.id, at, boss: true }); return { at, kind: 'boss', scoring: !!r }; }
      if (h.k === 'obj') { const r = hitObject(this, h.d.obj, p, dmg, p.weapon); this.ev({ type: 'impact', at, mat: h.d.impact }); if (r.scoring) { p.stats.hits++; addHitChain(p); } return { at, kind: 'obj', scoring: r.scoring }; }
      this.ev({ type: 'impact', at, mat: h.d.impact || 'stone', water: !!h.d.water });
      return { at, kind: 'world', scoring: false };
    }
    return { at: V3.add(ray.o, V3.mul(ray.d, 1200)), kind: 'none', scoring: false };
  }

  /* ---- results and checks ---- */
  stageResult(i) {
    const p = this.players[i], s0 = this.stageStart.stats[i] || {}, st = {}; for (const k in p.stats) st[k] = p.stats[k] - (s0[k] || 0);
    const conts = this.contUsed - this.contAtStage, acc = st.shots ? st.hits / st.shots : 0;
    return { stats: st, acc, rank: rankOf(p, st, conts), score: p.score, conts, accBonus: Math.round(acc * 100) * 300, noDamage: st.lost === 0 ? 20000 : 0 };
  }
  hash() {
    let h = 2166136261; const mix = v => { h ^= (Math.round(v * 100) | 0); h = Math.imul(h, 16777619); };
    mix(this.t); mix(this.sceneIdx); mix(this.timer);
    for (const p of this.players) { mix(p.score); mix(p.lives); mix(p.c); mix(p.mag); mix(p.ammo.mg); }
    for (const e of this.enemies) { mix(e.x); mix(e.y); mix(e.z); mix(e.hp); }
    return (h >>> 0).toString(16);
  }
  snapshot() {
    return { phase: this.phase, stage: this.stage.id, scene: this.scene.id, timer: +this.timer.toFixed(2), t: +this.t.toFixed(2),
      players: this.players.map(p => ({ score: p.score, lives: p.lives, c: +p.c.toFixed(2), weapon: p.weapon, mag: p.mag, ammo: Object.assign({}, p.ammo), out: p.out, chain: p.chain })),
      enemies: this.enemies.filter(e => e.alive && !e.ally).map(e => ({ id: e.id, type: e.type, state: e.state, hp: +e.hp.toFixed(2) })),
      threats: this.threats.filter(t => !t.done).map(t => ({ kind: t.kind, target: t.target, left: +(t.T - this.t).toFixed(2) })),
      boss: this.boss ? { id: this.boss.id, phase: this.boss.phaseName, hp: this.boss.hpFrac ? +this.boss.hpFrac().toFixed(3) : null } : null };
  }
}
TC.Sim = Sim;
