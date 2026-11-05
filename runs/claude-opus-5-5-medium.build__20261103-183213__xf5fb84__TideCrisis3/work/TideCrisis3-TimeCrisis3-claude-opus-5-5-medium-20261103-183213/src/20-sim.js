// 20-sim: the Sim, the whole game state stepped from player commands with seeded RNG. Players (cover, lives, i-frames,
// score, chain, stats, continues), weapons (registry, firing, ammo, switching), hitscan shots, TIME, the Director
// (travel -> action -> clear -> ... -> boss -> outro), cutscenes as data, and each player's logical camera.
// The presentation only reads it. Reads: registries (00), Builder (03), enemies (21), combat (22), bosses (25).

// rig heights (heroic, size 1) measured from the engine's Humanoid: standing and crouching
const RIGH = { head: 28.7, headCrouch: 23.6, sh: 24.1, shCrouch: 19.2, hip: 14.5, hipCrouch: 9.8, top: 32 };
TC.RIGH = RIGH;
const EYE_STAND = 24, EYE_COVER = 12;

// ---------------------------------------------------------------- weapons
def('weapon', 'hg', { slot: 1, name: 'P9 MARLIN', short: 'HANDGUN', mag: 9, rate: 6, auto: 3.5, dmg: () => tune.weapon.hgDamage, spread: 0, switch: .2, recoil: .6, sfx: 'hg' });
def('weapon', 'mg', { slot: 2, name: 'RIPTIDE', short: 'MACHINE GUN', pool: 240, pick: 60, rate: () => tune.weapon.mgRate, full: true, dmg: () => tune.weapon.mgDamage, spread: .6, bloom: 3, switch: .25, recoil: .25, sfx: 'mg' });
def('weapon', 'sg', { slot: 3, name: 'BREAKWATER', short: 'SHOTGUN', pool: 36, pick: 8, rate: 1.5, dmg: () => .45, pellets: () => tune.weapon.sgPellets, spread: () => tune.weapon.sgSpread, switch: .3, recoil: 2.2, sfx: 'sg', stagger: true });
def('weapon', 'gl', { slot: 4, name: 'SQUALL', short: 'GRENADE L.', pool: 6, pick: 2, rate: 1, dmg: () => tune.weapon.glDamage, proj: true, switch: .35, recoil: 1.5, sfx: 'gl' });
const WEAPONS = ['hg', 'mg', 'sg', 'gl'];
TC.WEAPONS = WEAPONS;
const wv = (w, k) => typeof w[k] === 'function' ? w[k]() : w[k];

// ---------------------------------------------------------------- speakers' agents (players)
const AGENTS = ['kai', 'rook', 'mari', 'juno'];
TC.AGENTS = AGENTS;

class Sim {
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'arcade'; this.diffId = o.difficulty || 'normal'; this.diff = DIFF[this.diffId];
    this.seed = o.seed === undefined ? 1 : o.seed; this.rngs = {};
    this.cheats = Object.assign({ god: false, ammo: false, freeze: false, oneHit: false }, o.cheats || {});
    this.t = 0; this.events = []; this.runner = new Runner(); this.nextId = 1;
    this.players = (o.players || [{ id: 0, name: 'P1', color: '#e8443a' }]).map((p, i) => this._newPlayer(p, i));
    this.enemies = []; this.projectiles = []; this.objects = []; this.civilians = []; this.allies = []; this.threats = []; this.boss = null; this.fxq = [];
    this.stageList = o.stages || (this.mode === 'arcade' || this.mode === 'coop' ? [1, 2, 3] : [o.stage || 1]);
    this.stageIdx = 0; this.phase = 'boot'; this.timer = 0; this.scene = null; this.sceneIdx = -1; this.cut = null; this.done = null;
    this.travelD = 0; this.actionT = 0; this.clearT = 0; this.waves = []; this.spawnedBy = {}; this.cueFired = {}; this.timeUp = 0; this.slow = 0;
    this.radio = [];   // { speaker, text, t } queued radio lines (presentation shows them)
    this.water = 0;   // stage 3's rising water
    this.hostage = null;
    this.flags = {};
    if (o.noStart) return;
    this.loadStage(this.stageList[0], o.scene ? { scene: o.scene } : {});
  }
  rng(stream) { return this.rngs[stream] || (this.rngs[stream] = mkRng(hashStr(stream) ^ (this.seed * 2654435761))); }
  emit(type, e = {}) { e.type = type; e.t = this.t; this.events.push(e); return e; }
  _newPlayer(p, i) {
    const lives = this.o.lives || (tune.player.lives !== TUNE.player.lives ? tune.player.lives : this.diff.lives);
    return { id: p.id === undefined ? i : p.id, i, name: p.name || 'P' + (i + 1), color: p.color || ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i % 4], agent: p.agent || AGENTS[i % 4], aspect: p.aspect || 16 / 9,
      slot: i, c: 0, coverHeld: false, lives, iframes: 0, score: 0, chain: 0, bestChain: 0, w: 'hg', mag: 9, ammo: { mg: 0, sg: 0, gl: 0 }, owned: { hg: true, mg: false, sg: false, gl: false },
      cool: 0, switchT: 0, reloadT: 0, bloom: 0, aim: [0, 0], cont: 0, contMark: 0, out: false, left: false, exposedFor: 0, hitT: 0, recoil: 0, lastFire: -9, firedAny: false, autoT: 0,
      stats: { shots: 0, hits: 0, heads: 0, kills: 0, quick: 0, saves: 0, livesLost: 0, civ: 0, time: 0 }, stageStats: null, nextExtra: 150000, bonusWave: 0 };
  }
  get stage() { return this._stage; }
  // ---------------------------------------------------------------- stage and scene flow
  loadStage(id, o = {}) {
    const st = get('stage', id); this._stage = st; this.stageId = id;
    this.builder = new Builder(st.env); this.builder.sim = this;
    st.build(this.builder, this);
    this.colliders = this.builder.colliders; this.covers = {};
    this.water = st.env.water ? st.env.water.z : -1e9;
    this.enemies = []; this.projectiles = []; this.objects = []; this.civilians = []; this.allies = []; this.threats = []; this.boss = null;
    for (const p of this.players) { p.stageStats = Object.assign({}, p.stats); p.stageLives = p.livesLostStage = 0; p.stageCont = false; p.stageScore = p.score; }
    this.stageT = 0; this.emit('stage', { id });
    const first = o.scene ? st.scenes.indexOf(o.scene) : 0;
    if (o.scene) { this.startScene(Math.max(0, first)); return; }
    if (st.intro && !this.o.skipCuts) this.startCut(st.intro, () => this.startScene(0)); else this.startScene(0);
  }
  startCut(id, then) {
    const c = get('cutscene', id);
    this.phase = 'cut'; this.cut = { id, steps: c.steps, i: -1, t: 0, line: null, then, cam: null, actors: c.actors || [], lineT: 0, total: 0 };
    this.emit('cut', { id });
    this._nextCutStep();
  }
  _nextCutStep() {
    const C = this.cut;
    for (;;) {
      C.i++; if (C.i >= C.steps.length) { this._endCut(); return; }
      const s = C.steps[C.i];
      if (s.cam) { C.cam = { keys: s.cam, t0: C.total }; continue; }
      if (s.fx) { this.emit('fx', s.fx); continue; }
      if (s.music) { this.emit('music', { song: s.music }); continue; }
      if (s.actor) { const a = C.actors.find(x => x.id === s.actor); if (a) Object.assign(a, s.set); continue; }
      if (s.say) { C.line = { speaker: s.say[0], text: s.say[1], screen: s.screen }; C.lineT = 0; this.emit('say', { speaker: s.say[0], text: s.say[1], modal: true }); return; }
      if (s.wait) { C.line = null; C.wait = s.wait; C.lineT = 0; return; }
    }
  }
  _endCut() { const C = this.cut; this.cut = null; this.emit('cutend', { id: C.id }); if (C.then) C.then(); }
  skipCut() { if (!this.cut) return; const C = this.cut; for (const s of C.steps.slice(C.i + 1)) if (s.fx && s.fx.keep) this.emit('fx', s.fx); this._endCut(); }
  startScene(idx) {
    const st = this._stage, id = st.scenes[idx]; this.sceneIdx = idx; const sc = this.scene = get('scene', id); this.sceneId = id;
    this.phase = 'travel'; this.travelD = 0; this.actionT = 0; this.waves = (sc.waves || []).map((w, i) => Object.assign({ i, fired: false, id: w.id || 'w' + i }, w)); this.spawnedBy = {}; this.cueFired = {};
    this.covers = {}; for (const k in sc.covers || {}) this.covers[k] = Object.assign({ id: k, busy: 0, h: 16, peek: ['up'] }, sc.covers[k]);
    this.arrive = sc.arrive ? new E.Path(sc.arrive.path, { smooth: 'catmull' }) : null;
    this.carrier = sc.carrier ? { path: new E.Path(sc.carrier.path, { smooth: 'catmull' }), d: 0, speed: sc.carrier.speed, pos: null, yaw: 0, mesh: sc.carrier.mesh, stopped: false } : null;
    if (this.carrier) this._carrierUpdate(0);
    const T = (sc.time || 60) * this.diff.timeMul * tune.time.sceneMul; this.timeMax = T; this.timer = T;
    this.emit('scene', { id, title: sc.title, idx });
    if (sc.enter) sc.enter(this);
    for (const o of sc.objects || []) this.spawnObject(o[0], o[1], o[2] || {});
    for (const a of sc.allies || []) if (this.players.length === 1 && this.mode !== 'host' && this.mode !== 'replica') this.allies.push({ id: this.nextId++, agent: a.agent, at: a.at, facing: a.facing || 0, fireT: 3, pose: a.pose });
    if (!this.arrive) this._beginAction();
  }
  _beginAction() {
    this.phase = 'action'; this.actionT = 0; this.emit('action', { id: this.sceneId });
    const sc = this.scene; if (sc.boss) this.startBoss(sc.boss);
    for (const p of this.players) { p.c = 0; }
  }
  _sceneClear() {
    this.phase = 'clear'; this.clearT = 0;
    const bonus = Math.floor(Math.max(0, this.timer)) * 100;
    for (const p of this.players) if (!p.out && !p.left) this.addScore(p, bonus, null, 'time');
    this.emit('clear', { id: this.sceneId, bonus, time: this.timer });
    this._cue('clear');
  }
  _nextScene() {
    const st = this._stage; this.threats = []; this.projectiles = this.projectiles.filter(p => p.team === 'fx');
    this.enemies = []; this.objects = this.objects.filter(o => o.keep); this.civilians = []; this.allies = []; this.hostage = null;
    if (this.sceneIdx + 1 < st.scenes.length) { this.startScene(this.sceneIdx + 1); return; }
    const fin = () => { this.phase = 'results'; this.emit('stageclear', { id: this.stageId }); };
    if (st.outro && !this.o.skipCuts) this.startCut(st.outro, fin); else fin();
  }
  // after the results screen (presentation calls it): the next stage, or the end
  nextStage() {
    this.stageIdx++;
    if (this.stageIdx < this.stageList.length) { this.loadStage(this.stageList[this.stageIdx]); return true; }
    const ending = this._stage.ending;
    if (ending && !this.o.skipCuts) this.startCut(ending, () => { this.phase = 'done'; this.done = { won: true }; this.emit('done', { won: true }); });
    else { this.phase = 'done'; this.done = { won: true }; this.emit('done', { won: true }); }
    return false;
  }
  jump(stageId, sceneId) { this.stageIdx = Math.max(0, this.stageList.indexOf(stageId)); if (this.stageIdx < 0) this.stageIdx = 0; this.loadStage(stageId, { scene: sceneId }); }
  // ---------------------------------------------------------------- the step
  step(dt, cmds = []) {
    this.events = [];
    this.t += dt; this.stageT += dt;
    if (this.phase === 'done' || this.phase === 'results' || this.phase === 'gameover') { this._players(dt, cmds, true); return this.events; }
    const allOut = this.players.length && this.players.every(p => p.out || p.left);
    const contFreeze = this.players.length === 1 && this.players[0].out && this.mode !== 'host';
    if (this.phase === 'cut') { this._cutStep(dt, cmds); this.runner.update(dt); return this.events; }
    this._players(dt, cmds, false);
    if (contFreeze) return this.events;
    if (allOut && this.mode !== 'host' && this.mode !== 'attract') { this.phase = 'gameover'; this.emit('gameover', {}); return this.events; }
    if (this.phase === 'travel') this._travel(dt);
    else if (this.phase === 'action') {
      this.actionT += dt;
      if (!tune.time.freeze && !this.cheats.freeze && !(this.boss && this.boss.intro > 0)) this.timer -= dt;
      if (this.timer <= 0) this._timeUp();
      this._waves(dt);
      this._cues();
      if (this.carrier) this._carrierStep(dt);
      if (this.scene.step) this.scene.step(this, dt);
    } else if (this.phase === 'clear') { this.clearT += dt; if (this.clearT > 1.4) this._nextScene(); }
    this.runner.update(dt);
    TC.stepEnemies(this, dt);
    TC.stepThreats(this, dt);
    TC.stepProjectiles(this, dt);
    TC.stepObjects(this, dt);
    if (this.boss) TC.stepBoss(this, dt);
    if (this.phase === 'action' && this._isClear()) this._sceneClear();
    return this.events;
  }
  _cutStep(dt, cmds) {
    const C = this.cut; C.t += dt; C.total += dt; C.lineT += dt;
    const adv = cmds.some(c => c && c.advance), skip = cmds.some(c => c && c.skip);
    if (skip) { this.skipCut(); return; }
    if (C.wait !== undefined && C.line === null) { if (C.lineT >= C.wait) { C.wait = undefined; this._nextCutStep(); } return; }
    if (C.line) {
      const need = Math.max(1.2, C.line.text.length * .045 + .6);
      if ((adv && C.lineT > .25) || C.lineT > need + (this.mode === 'attract' ? .4 : 3.5)) this._nextCutStep();
    }
  }
  _travel(dt) {
    const sc = this.scene, speed = (sc.arrive.speed || 110) * (this.mode === 'attract' ? 1.5 : 1);
    this.travelD += dt * speed;
    if (this.travelD >= this.arrive.length + speed * .3) this._beginAction();
  }
  _timeUp() {
    this.emit('timeup', {}); this._cue('timeup');
    for (const p of this.players) if (!p.out && !p.left) this.hurt(p, { ignoreI: true, reason: 'time' });
    this.timer = this.timeMax * tune.time.refill;
  }
  _waves(dt) {
    for (const w of this.waves) {
      if (w.fired) continue;
      let go = false;
      if (w.at !== undefined && this.actionT >= w.at) go = true;
      if (w.atD !== undefined && this.carrier && this.carrier.d >= w.atD) go = true;
      if (w.after === 'clear') { const prev = this.waves.filter(x => x.i < w.i); go = prev.every(x => x.fired && x.clear !== false) && this._waveAlive(prev) === 0 && this.actionT > .3; if (go) { w.delay = w.delay || 0; w._d = (w._d || 0) + dt; go = w._d >= (w.delay || .6); } }
      if (w.after && w.after.startsWith && w.after.startsWith('kills:')) go = this.killsInScene >= +w.after.slice(6);
      if (w.after && w.after !== 'clear' && !w.after.startsWith('kills:')) { const ref = this.waves.find(x => x.id === w.after); go = ref && ref.fired && this._waveAlive([ref]) === 0; }
      if (go) this._fireWave(w);
    }
  }
  _waveAlive(ws) { let n = 0; for (const w of ws) n += this.enemies.filter(e => e.wave === w.id && !e.dead && !e.civil && !e.noClear).length; return n; }
  _fireWave(w) {
    w.fired = true; this.emit('wave', { id: w.id });
    for (const s of w.spawn || []) this.spawnEnemy(s[0], s[1], Object.assign({ wave: w.id }, s[2] || {}));
    for (const c of w.civilians || []) TC.spawnCivilian(this, c);
    if (w.say) this.say(w.say[0], w.say[1]);
    if (w.fx) this.emit('fx', w.fx);
  }
  _cues() {
    const sc = this.scene;
    for (let i = 0; i < (sc.cues || []).length; i++) {
      const c = sc.cues[i]; if (this.cueFired[i]) continue;
      if (c.at !== undefined && this.actionT >= c.at) { this.cueFired[i] = true; this._doCue(c); }
    }
  }
  _cue(evt) { const sc = this.scene; if (!sc) return; (sc.cues || []).forEach((c, i) => { if (!this.cueFired[i] && c.on === evt) { this.cueFired[i] = true; this._doCue(c); } }); }
  _doCue(c) {
    if (c.say) this.say(c.say[0], c.say[1]);
    if (c.prompt) this.emit('prompt', { id: c.prompt });
    if (c.fx) this.emit('fx', c.fx);
    if (c.fn) c.fn(this);
  }
  say(speaker, text) { this.radio.push({ speaker, text, t: this.t }); this.emit('say', { speaker, text }); }
  _isClear() {
    if (this.waves.some(w => !w.fired)) return false;
    if (this.enemies.some(e => !e.dead && !e.civil && !e.noClear)) return false;
    if (this.boss && !(this.boss.defeated && this.boss.outT > 2.4)) return false;
    if (this.scene.objective && !this.scene.objective(this)) return false;
    if (this.carrier && !this.carrier.arrived) return false;
    return this.actionT > .5;
  }
  // ---------------------------------------------------------------- carriers (moving scenes)
  _carrierUpdate(dt) {
    const C = this.carrier, d = Math.min(C.d, C.path.length - .01), a = C.path.at(d), b = C.path.at(Math.min(C.path.length, d + 8));
    C.pos = [a.x, a.y, a.z]; C.yaw = Math.atan2(b.y - a.y, b.x - a.x); C.pitch = this.scene.carrier.pitch ? Math.atan2(b.z - a.z, Math.hypot(b.x - a.x, b.y - a.y)) : 0;
  }
  _carrierStep(dt) {
    const C = this.carrier, alive = this.enemies.some(e => !e.dead && !e.civil);
    let maxD = C.path.length - 1;
    for (const w of this.waves) if (w.hold !== undefined && w.fired && this.enemies.some(e => e.wave === w.id && !e.dead)) maxD = Math.min(maxD, w.hold);
    if (C.d < maxD) { C.d = Math.min(maxD, C.d + C.speed * dt); }
    // enemies the carrier has left behind drop out of the fight
    const fx = Math.cos(C.yaw), fy = Math.sin(C.yaw);
    for (const e of this.enemies) if (!e.dead && !e.ride && (e.x - C.pos[0]) * fx + (e.y - C.pos[1]) * fy < -30) { e.gone = true; if (e.cover) e.cover.busy = Math.max(0, e.cover.busy - 1); }
    else { C.arrived = this.waves.every(w => w.fired) ? true : C.arrived; if (!alive) C.arrived = true; }
    if (this.waves.every(w => w.fired) && C.d >= C.path.length - 1) C.arrived = true;
    this._carrierUpdate(dt);
  }
  // carrier-local -> world
  cw(p) { const C = this.carrier; if (!C) return p; let x = p[0], z = p[2]; if (C.pitch) { const cp = Math.cos(C.pitch), sp = Math.sin(C.pitch); x = p[0] * cp - p[2] * sp; z = p[0] * sp + p[2] * cp; } const c = Math.cos(C.yaw), s = Math.sin(C.yaw); return [C.pos[0] + x * c - p[1] * s, C.pos[1] + x * s + p[1] * c, C.pos[2] + z]; }
  // ---------------------------------------------------------------- cameras
  slotOf(i) {
    const sc = this.scene, sl = sc.slots, n = sl.length;
    if (i < n) return sl[i];
    // auto slots 3-4: slot 1 / 2 moved 28 u further out to the side
    const base = sl[i % 2] || sl[0], side = i % 2 === 0 ? -1 : 1, off = this._sideVec(base.stand, 28 * side);
    return { stand: { at: vadd(base.stand.at, off), look: vadd(base.stand.look, off) }, cover: { at: vadd(base.cover.at, off), look: vadd(base.cover.look, off) }, auto: true };
  }
  _sideVec(pose, k) { const f = vnorm([pose.look[0] - pose.at[0], pose.look[1] - pose.at[1], 0]); return [-f[1] * k, f[0] * k, 0]; }
  poseOf(i, which) {
    const s = this.slotOf(i)[which]; let at = s.at, look = s.look;
    if (this.carrier) { at = this.cw(at); look = this.cw(look); }
    const d = vsub(look, at); return { x: at[0], y: at[1], z: at[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.atan2(d[2], Math.hypot(d[0], d[1])) };
  }
  cameraFor(i) {
    const fov = tune.view.fov;
    if (this.phase === 'cut' && this.cut && this.cut.cam) return Object.assign(this._cutCam(), { fov });
    if (!this.scene) return { x: 0, y: 0, z: 24, yaw: 0, pitch: 0, roll: 0, fov };
    const p = this.players[i] || this.players[0];
    if (this.phase === 'travel' && this.arrive) {
      const L = this.arrive.length, d = Math.min(this.travelD, L), q = this.arrive.at(Math.max(0, Math.min(L - .01, d))), q2 = this.arrive.at(Math.min(L, d + 24));
      const stand = this.poseOf(i, 'stand'), end = this.arrive.at(L - .01);
      const k = smooth(clamp((d - (L - 90)) / 90, 0, 1)) * (L > 0 ? 1 : 0), k2 = clamp((this.travelD - L) / (((this.scene.arrive.speed || 110)) * .3), 0, 1);
      const offx = (stand.x - end.x) * k, offy = (stand.y - end.y) * k;
      let yaw = Math.atan2(q2.y - q.y, q2.x - q.x), pitch = 0;
      const lk = this.scene.arrive.look; if (lk && lk !== 'path') { yaw = lerpAng(yaw, Math.atan2(lk[1] - q.y, lk[0] - q.x), smooth(clamp(d / L, 0, 1))); pitch = lerp(0, Math.atan2(lk[2] - q.z, Math.hypot(lk[0] - q.x, lk[1] - q.y)), clamp(d / L, 0, 1)); }
      const bob = Math.sin(this.travelD / 14) * 1.2 * (this.scene.arrive.speed > 80 && !this.scene.arrive.vehicle ? 1 : 0);
      const pos = { x: q.x + offx, y: q.y + offy, z: q.z + bob, yaw, pitch, roll: 0, fov };
      if (k2 > 0) { const s = smooth(k2); return { x: lerp(pos.x, stand.x, s), y: lerp(pos.y, stand.y, s), z: lerp(pos.z, stand.z, s), yaw: lerpAng(yaw, stand.yaw, s), pitch: lerp(pitch, stand.pitch, s), roll: 0, fov }; }
      return pos;
    }
    const a = this.poseOf(i, 'stand'), b = this.poseOf(i, 'cover'), c = smooth(clamp(p.c, 0, 1));
    return { x: lerp(a.x, b.x, c), y: lerp(a.y, b.y, c), z: lerp(a.z, b.z, c), yaw: lerpAng(a.yaw, b.yaw, c), pitch: lerp(a.pitch, b.pitch, c), roll: Math.sin(Math.PI * c) * 2 * DEG, fov };
  }
  _cutCam() {
    const C = this.cut.cam, keys = C.keys, t = this.cut.total - C.t0;
    let k0 = keys[0], k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    if (t > keys[keys.length - 1].t) k0 = k1 = keys[keys.length - 1];
    const s = k1 === k0 ? 1 : smooth(clamp((t - k0.t) / (k1.t - k0.t), 0, 1)), at = vlerp(k0.at, k1.at, s), look = vlerp(k0.look, k1.look, s), d = vsub(look, at);
    return { x: at[0], y: at[1], z: at[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.atan2(d[2], Math.hypot(d[0], d[1])), roll: 0 };
  }
  camSetupFor(i) { const cam = this.cameraFor(i), p = this.players[i]; return camSetup(Object.assign({}, cam, { aspect: p ? p.aspect : 16 / 9 })); }
  // ---------------------------------------------------------------- players
  exposed(p) { return p.c < .5; }
  _players(dt, cmds, frozen) {
    for (const p of this.players) {
      const cmd = cmds[p.i] || {};
      if (p.left) continue;
      if (p.out) {
        if (this.mode === 'host' || this.mode === 'replica') { p.cont -= dt; if (p.cont <= 0) this.continuePlayer(p, true); continue; }
        p.cont -= dt; if (cmd.advance || cmd.fireP) { if (p.cont < 9.7) this.continuePlayer(p); }
        if (p.cont <= 0) { p.cont = 0; p.left = this.players.length > 1; if (this.players.length === 1) { this.phase = 'gameover'; this.emit('gameover', {}); } }
        continue;
      }
      if (frozen) continue;
      p.aim = cmd.aim ? [clamp(cmd.aim[0], -p.aspect, p.aspect), clamp(cmd.aim[1], -1, 1)] : p.aim;
      p.iframes = Math.max(0, p.iframes - dt); p.cool = Math.max(0, p.cool - dt); p.switchT = Math.max(0, p.switchT - dt); p.hitT = Math.max(0, p.hitT - dt);
      p.bloom = Math.max(0, p.bloom - 6 * dt); p.recoil = Math.max(0, p.recoil - dt * 8);
      const fighting = this.phase === 'action';
      // cover
      const want = fighting ? !!cmd.cover || p.reloadT > 0 : false;
      const was = p.c >= .5;
      p.c = approach(p.c, want ? 1 : 0, dt / (want ? tune.player.coverIn : tune.player.coverOut));
      if (p.c >= .5 && !was) this.emit('cover', { p: p.i, on: true }); if (p.c < .5 && was) this.emit('cover', { p: p.i, on: false });
      p.stats.time += fighting ? dt : 0;
      if (!fighting) { p.c = 0; continue; }
      p.exposedFor = this.exposed(p) ? p.exposedFor + dt : 0;
      // reload in cover (handgun magazine)
      if (p.c >= .99 && p.mag < 9) { p.reloadT += dt; if (p.reloadT >= tune.player.reload) { p.mag = 9; p.reloadT = 0; this.emit('reload', { p: p.i }); } }
      else if (cmd.reload && p.mag < 9 && p.c < .99) { p.reloadT = Math.max(p.reloadT, .0001); }
      else if (p.c < .99 && p.reloadT > 0 && !cmd.reload && p.c < .5) p.reloadT = 0;
      // weapon select
      if (cmd.sel) this.selectWeapon(p, WEAPONS[cmd.sel - 1]);
      if (cmd.next) this.cycleWeapon(p, 1); if (cmd.prev) this.cycleWeapon(p, -1);
      // fire
      const w = get('weapon', p.w);
      if (cmd.fireP && p.c >= .5) { this.cycleWeapon(p, 1); continue; }   // fire while hidden cycles weapons
      if (p.c > .2 || p.switchT > 0) continue;
      const rate = wv(w, 'rate'), auto = w.full || (cmd.fireDown && cmd.autoFire !== false && w.auto);
      if (cmd.fireP || (cmd.fireDown && auto)) {
        const interval = cmd.fireP && !w.full ? 1 / rate : 1 / (w.full ? rate : (w.auto || rate));
        if (p.cool <= 0) { this.fire(p, w); p.cool = interval; }
      }
    }
  }
  selectWeapon(p, id) { if (!id || p.w === id) return; if (id !== 'hg' && !(p.ammo[id] > 0 || this.cheats.ammo || tune.player.infAmmo)) return; p.w = id; p.switchT = get('weapon', id).switch; this.emit('switch', { p: p.i, w: id }); }
  cycleWeapon(p, dir) {
    const have = WEAPONS.filter(id => id === 'hg' || p.ammo[id] > 0 || ((this.cheats.ammo || tune.player.infAmmo) && p.owned[id]));
    if (have.length < 2) { this.emit('switch', { p: p.i, w: p.w, none: true }); return; }
    const i = have.indexOf(p.w); this.selectWeapon(p, have[(i + dir + have.length) % have.length]);
  }
  giveAmmo(p, id, n) { const w = get('weapon', id); const was = p.owned[id]; p.owned[id] = true; p.ammo[id] = Math.min(w.pool, p.ammo[id] + Math.round(n * tune.weapon.ammoMul)); this.emit('pickup', { p: p.i, w: id, n, first: !was }); }
  fire(p, w) {
    const inf = this.cheats.ammo || tune.player.infAmmo;
    if (w.id === 'hg') { if (p.mag <= 0) { this.emit('empty', { p: p.i }); p.cool = .25; return; } if (!inf) p.mag--; }
    else { if (p.ammo[w.id] <= 0 && !inf) { this.selectWeapon(p, 'hg'); return; } if (!inf) p.ammo[w.id]--; if (p.ammo[w.id] <= 0 && !inf) { p.w = 'hg'; p.switchT = .2; this.emit('switch', { p: p.i, w: 'hg', auto: true }); } }
    p.stats.shots++; p.recoil = 1; p.lastFire = this.t; p.firedAny = true;
    const cs = this.camSetupFor(p.i), pellets = w.pellets ? wv(w, 'pellets') : 1, spread = (wv(w, 'spread') || 0) + (w.bloom ? p.bloom : 0);
    if (w.bloom) p.bloom = Math.min(w.bloom, p.bloom + .35);
    this.emit('shot', { p: p.i, w: w.id, aim: p.aim.slice() });
    if (w.proj) { const dir = aimRay(cs, p.aim[0], p.aim[1]); TC.spawnProjectile(this, 'pgl', vadd(cs.pos, vmul(dir, 10)), vmul(dir, 640), { team: 'player', owner: p.i, gravity: 240 }); return; }
    let anyHit = false;
    const R = this.rng('spread' + p.i);
    for (let k = 0; k < pellets; k++) {
      let ax = p.aim[0], ay = p.aim[1];
      if (spread) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * Math.tan(spread * DEG) / cs.t; ax += Math.cos(a) * r; ay += Math.sin(a) * r; }
      const res = this.shoot(cs.pos, aimRay(cs, ax, ay), p, w, k === 0);
      if (res && res.scoring) anyHit = true;
    }
    if (anyHit) { p.stats.hits++; } else { p.chain = 0; this.emit('miss', { p: p.i }); }
  }
  // a ray through the world from a player: hits the nearest of enemies' volumes, boss parts, projectiles, objects,
  // civilians and colliders. Returns { kind, ... , scoring }.
  raycast(o, d, opt = {}) {
    let best = { t: Infinity };
    for (const c of this.colliders) { if (!c.on) continue; const t = rayAABB(o, d, c.b); if (t < best.t) best = { t, kind: 'wall', col: c }; }
    if (this.carrier && this.scene.carrier.cover) for (const cb of this.scene.carrier.cover) { const a = this.cw(cb[0]), b = this.cw(cb[1]); const bb = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])]; const t = rayAABB(o, d, bb); if (t < best.t && t > 6) best = { t, kind: 'wall', col: { surf: 'metal' } }; }
    for (const e of this.enemies) {
      if (e.dead || !e.vols) continue;
      for (const v of e.vols) { const t = v.cap ? rayCapsule(o, d, v.a, v.b, v.r) : raySphere(o, d, v.c, v.r); if (t < best.t) best = { t, kind: v.shield ? 'shield' : 'enemy', e, part: v.part }; }
    }
    if (this.boss) for (const part of this.boss.parts) { if (!part.alive || !part.pos || part.hidden) continue; const t = raySphere(o, d, part.pos, part.r); if (t < best.t) best = { t, kind: 'boss', part }; }
    for (const pr of this.projectiles) { if (pr.team === 'player' || !pr.shootable) continue; const t = raySphere(o, d, pr.pos, pr.r + (opt.assist || 0)); if (t < best.t) best = { t, kind: 'proj', pr }; }
    for (const ob of this.objects) { if (ob.dead || !ob.r) continue; const t = ob.box ? rayAABB(o, d, ob.box) : raySphere(o, d, ob.pos, ob.r); if (t < best.t) best = { t, kind: 'object', ob }; }
    for (const c of this.civilians) { if (c.dead || !c.vols) continue; for (const v of c.vols) { const t = v.cap ? rayCapsule(o, d, v.a, v.b, v.r) : raySphere(o, d, v.c, v.r); if (t < best.t) best = { t, kind: 'civ', c }; } }
    if (this.water > -1e8 && d[2] < 0) { const t = (this.water - o[2]) / d[2]; if (t > 0 && t < best.t) best = { t, kind: 'water' }; }
    if (best.t === Infinity) return null;
    best.at = vadd(o, vmul(d, best.t)); return best;
  }
  shoot(o, d, p, w, first) {
    const hit = this.raycast(o, d);
    if (!hit) return null;
    const dmg = (wv(w, 'dmg') || 1) * (this.cheats.oneHit ? 99 : 1);
    hit.scoring = false;
    if (hit.kind === 'enemy') {
      const mul = hit.part === 'head' ? 2 : hit.part === 'legs' ? .75 : 1;
      TC.damageEnemy(this, hit.e, dmg * mul, { p, w: w.id, part: hit.part, at: hit.at, dir: d });
      hit.scoring = true;
    } else if (hit.kind === 'shield') { TC.shieldHit(this, hit.e, { p, w: w.id, at: hit.at }); this.emit('impact', { at: hit.at, surf: 'shield' }); hit.scoring = true; }
    else if (hit.kind === 'boss') { TC.damageBoss(this, hit.part, dmg, { p, w: w.id, at: hit.at }); hit.scoring = true; }
    else if (hit.kind === 'proj') { TC.damageProjectile(this, hit.pr, dmg, { p, at: hit.at }); hit.scoring = true; }
    else if (hit.kind === 'object') { hit.scoring = TC.damageObject(this, hit.ob, dmg, { p, at: hit.at, w: w.id }); }
    else if (hit.kind === 'civ') { TC.hitCivilian(this, hit.c, p, hit.at); }
    else this.emit('impact', { at: hit.at, surf: hit.kind === 'water' ? 'water' : hit.col.surf, n: vmul(d, -1) });
    return hit;
  }
  addScore(p, pts, at, why) {
    if (!p || p.left) return 0;
    const mul = why === 'time' || why === 'bonus' || pts < 0 ? 1 : 1 + Math.min(10, Math.floor(p.chain / 5)) * .1;
    const v = Math.round(pts * mul); p.score = Math.max(0, p.score + v);
    if (at) this.emit('points', { p: p.i, v, at, why });
    while (p.score >= p.nextExtra) { p.lives++; this.emit('extra', { p: p.i }); p.nextExtra = p.nextExtra === 150000 ? 400000 : p.nextExtra + 400000; }
    return v;
  }
  chainUp(p) { p.chain++; p.bestChain = Math.max(p.bestChain, p.chain); }
  hurt(p, o = {}) {
    if (p.out || p.left) return false;
    if (!o.ignoreI && p.iframes > 0) return false;
    if (this.cheats.god || tune.player.god) { this.emit('godhit', { p: p.i }); return false; }
    p.lives--; p.iframes = tune.player.iframes; p.chain = 0; p.hitT = .5; p.stats.livesLost++; p.livesLostStage = (p.livesLostStage || 0) + 1;
    this.emit('hurt', { p: p.i, reason: o.reason || 'shot', lives: p.lives });
    if (p.lives <= 0) { p.out = true; p.cont = 10; this.emit('out', { p: p.i }); if (this.mode === 'host' || this.mode === 'replica') p.cont = 6; }
    return true;
  }
  continuePlayer(p, auto) {
    p.out = false; p.lives = this.players.length === 1 || !auto ? (this.diff.lives) : 3; p.iframes = 2; p.contMark++; p.stageCont = true;
    if (auto) { p.score = Math.max(0, p.score - 5000); } else { p.score = 0; p.nextExtra = 150000; }
    this.emit('continue', { p: p.i });
    if (this.players.length === 1 && !auto) this._restartWaves();
  }
  _restartWaves() {
    if (this.phase !== 'action' || this.boss) return;
    this.enemies = []; this.threats = []; this.projectiles = []; this.timer = this.timeMax;
    for (const w of this.waves) { w.fired = false; w._d = 0; } this.actionT = 0;
  }
  // ---------------------------------------------------------------- spawning
  spawnEnemy(type, coverId, o = {}) { return TC.makeEnemy(this, type, coverId, o); }
  spawnObject(kind, at, o = {}) { return TC.makeObject(this, kind, at, o); }
  startBoss(id) { TC.makeBoss(this, id); }
  // a compact hash of the state (determinism tests)
  hash() {
    let s = this.phase + '|' + this.sceneId + '|' + this.timer.toFixed(3);
    for (const p of this.players) s += '|' + p.score + ',' + p.lives + ',' + p.c.toFixed(3) + ',' + p.mag + ',' + p.w;
    for (const e of this.enemies) s += '|' + e.id + e.state + e.x.toFixed(2) + e.y.toFixed(2) + e.hp.toFixed(2);
    for (const t of this.threats) s += '|t' + t.target + t.left.toFixed(3);
    if (this.boss) s += '|b' + this.boss.parts.map(p => p.hp.toFixed(2)).join(',');
    return hashStr(s).toString(16);
  }
}
TC.Sim = Sim;
TC.EYE = { stand: EYE_STAND, cover: EYE_COVER };
