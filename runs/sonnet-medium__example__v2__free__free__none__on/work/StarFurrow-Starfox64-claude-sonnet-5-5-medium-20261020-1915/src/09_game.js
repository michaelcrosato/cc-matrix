// ===== 09_game: stage runtime — rail, event timeline, spawners, collisions, camera, flow (intro/play/outro/results) =====
const LEAD = { say: 0, tip: 0, music: 0, gunship: 60, crawler: 60, help: 0 };
const DIFF = [{ name: 'Easy', e: 0.65, p: 0.7 }, { name: 'Normal', e: 1, p: 1 }, { name: 'Hard', e: 1.4, p: 1.4 }];

const newStats = () => ({ score: 0, hits: 0, kills: 0, enemiesTotal: 0, alliesSaved: 0, alliesLost: 0, deflected: 0, rolls: 0, shots: 0, volleys: 0, bombsUsed: 0, boostTime: 0, brakeTime: 0, damageTaken: 0, rings: 0, deaths: 0 });

const Game = {
  mode: 'menu',        // 'menu' | 'play' | 'attract'
  phase: 'none',       // 'intro' | 'play' | 'outro' | 'dead' | 'done'
  paused: false, cheat: false, attract: false,
  root: null, lvl: null, lvlIdx: 0, dist: 0, startAt: 0, time: 0, introT: 0, outroT: 0, nextEv: 0, checkpoint: 0,
  ents: [], pending: [], wingmen: [], squads: {}, boss: null, stats: newStats(), continues: 2,
  combo: 0, comboT: 0, bombFx: null, tipActive: null, tipFlags: {}, tipClock: 0, moveAcc: 0, deadShown: false, showT: 0,
  camPos: V3(), camLook: V3(), fov: 62, camInit: false, startMusic: null,

  init() {
    this.root = new THREE.Group(); Gfx.scene.add(this.root);
    Phys.scene = this.root;
    Scenery.init(Gfx.scene);
    Player.init();
    this.wingmen = [
      new Wingman(0, 'buckle', PALETTES.buckle, { x: -13, y: 1.5, z: -8 }),
      new Wingman(1, 'clover', PALETTES.clover, { x: 13, y: 2, z: -12 }),
      new Wingman(2, 'marrow', PALETTES.marrow, { x: 0, y: -7, z: -3 }),
    ];
    Phys.newWorld(0);
    Settings.listeners.push(() => {});
  },
  eDmg() { return DIFF[S().difficulty].e; },
  eDmgPlayer() { return DIFF[S().difficulty].p; },
  levelCount() { return LEVELS.length; },

  clearWorld() {
    for (const e of this.ents) { if (e.group && e.group.parent) e.group.parent.remove(e.group); disposeTree(e.group); }
    this.ents.length = 0; this.pending.length = 0; this.squads = {}; this.boss = null;
    Shots.clear(); Hazards.clear(); Fx.clear();
    while (this.root.children.length) { const c = this.root.children[0]; this.root.remove(c); }
    for (const d of [...Phys.debris]) { /* world replaced below */ }
    this.bombFx = null; this.tipActive = null; UI.clearTip && UI.clearTip(); UI.hideBoss && UI.hideBoss();
    Sfx.chargeUpdate(0, false);
  },

  // ---------- stage lifecycle ----------
  startLevel(idx, o = {}) {
    this.clearWorld();
    const L = this.lvl = LEVELS[idx]; this.lvlIdx = idx;
    Phys.newWorld(L.gravity || 0); if (L.ground !== null) Phys.setGround(L.ground);
    Gfx.setEnv(L.env); Scenery.reset(L.scenery, L.env);
    this.dist = o.startAt || 0; this.startAt = this.dist; this.nextEv = 0; this.time = 0; this.checkpoint = this.dist;
    this.startMusic = L.music;
    this.attract = !!o.attract; this.cheat = !!o.attract; this.mode = o.attract ? 'attract' : 'play';
    this.paused = false; this.deadShown = false; this.combo = 0; this.comboT = 0; this.tipFlags = {}; this.tipActive = null; this.moveAcc = 0;
    if (!o.keepStats) { this.stats = newStats(); this.continues = 2; }
    this.root.add(Player.group);
    if (!o.keepStats || o.fresh) { Player.maxHp = 100; Player.bombs = 3; Player.laserLv = 1; }
    else { Player.bombs = Math.max(3, Player.bombs); Player.laserLv = 1; }
    Player.reset(Player.maxHp);
    for (const w of this.wingmen) { this.root.add(w.group); }
    Player.pos.z = -this.dist;
    for (const w of this.wingmen) { w.reset(); }
    Autopilot.reset();
    this.phase = o.noIntro ? 'play' : 'intro'; this.introT = 0; this.camInit = false;
    Sfx.engineStart();
    // fast-forward: apply music/env events before startAt
    for (const ev of L.events) { if (ev.at < this.startAt - 1 && ev.t === 'music') this.startMusic = ev.name; }
    Music.play(this.startMusic);
    UI.onLevelStart(L, o);
    Input.consumeRoll();
  },
  startShowcase() {
    this.clearWorld();
    const L = this.lvl = LEVELS[0]; this.lvlIdx = 0; this.mode = 'menu'; this.phase = 'none'; this.attract = false; this.cheat = false;
    Phys.newWorld(0); Gfx.setEnv(L.env); Scenery.reset(L.scenery, L.env);
    this.dist = 0; this.showT = 0;
    this.root.add(Player.group); Player.reset(100); Player.invuln = 0; Player.group.visible = true;
    for (const w of this.wingmen) { this.root.add(w.group); w.reset(); }
    Sfx.engineStop(); this.camInit = false;
  },
  showcaseUpdate(dt) {
    this.showT += dt; const t = this.showT;
    this.dist += 46 * dt; Player.speed = 46;
    Player.pos.set(Math.sin(t * 0.45) * 5, Math.sin(t * 0.7) * 2.2, -this.dist); Player.vel.set(0, 0, -46);
    const U = Player.group.userData;
    U.pivot.rotation.set(Math.sin(t * 0.7) * 0.06, 0, Math.sin(t * 0.45) * 0.3 + (Math.sin(t * 0.2) > 0.97 ? t * 8 : 0));
    U.flames.forEach((f) => f.scale.set(1, 1, 0.9 + Math.random() * 0.3));
    Player.group.position.copy(Player.pos);
    for (const w of this.wingmen) w.update(dt);
    Scenery.update(Player.pos.z);
    Gfx.updateDust(Player.pos.x, Player.pos.y, Player.pos.z, 46, dt);
    const a = t * 0.14 + 0.9, r = 17;
    const cp = V3(Player.pos.x + Math.sin(a) * r, Player.pos.y + 3.4 + Math.sin(t * 0.3) * 1.6, Player.pos.z + Math.cos(a) * r * 0.9 - 4);
    Gfx.camera.position.copy(cp); Gfx.camera.lookAt(Player.pos.x, Player.pos.y + 1.2, Player.pos.z - 4);
    Gfx.camera.fov = 52; Gfx.camera.updateProjectionMatrix();
    Gfx.updateSky(Gfx.camera.position, t); Gfx.updateSun(Player.pos);
    if (Math.random() < 0.6) for (const sx of [-0.55, 0.55]) Fx.emit(_a.set(Player.pos.x + sx, Player.pos.y, Player.pos.z + 2.4), V3(0, 0, 12), 0.35, 0.28, 0x7fe8ff, 0, 1.5);
  },

  // ---------- entities ----------
  add(ent, shape, noGroup) {
    if (!noGroup) this.root.add(ent.group);
    if (shape) { if (ent.fixedBody) Phys.attachFixed(ent, shape, ent.cat); else Phys.attach(ent, shape, ent.cat); }
    this.ents.push(ent);
    if (ent.score > 0 && !ent.noCount && ent.cat === CAT.ENEMY && ent.kind !== 'missile') this.stats.enemiesTotal++;
    if (ent.squad) { const q = this.squads[ent.squad] || (this.squads[ent.squad] = { total: 0, left: 0, broken: false }); q.total++; q.left++; }
    return ent;
  },
  removeEnt(e, killed = false) {
    if (e.removed) return;
    e.removed = true; e.alive = false; this.pending.push(e);
    if (!killed && e.squad && this.squads[e.squad]) this.squads[e.squad].broken = true;
    if (Player.locks.includes(e)) Player.locks.splice(Player.locks.indexOf(e), 1);
  },
  flushRemovals() {
    if (!this.pending.length) return;
    for (const e of this.pending) {
      Phys.detach(e);
      if (e.group && e.group.parent) e.group.parent.remove(e.group);
      if (e.group) disposeTree(e.group);
      const i = this.ents.indexOf(e); if (i >= 0) this.ents.splice(i, 1);
    }
    this.pending.length = 0;
  },
  registerHit() { this.comboT = 2.4; },
  addScore(n, label) { this.stats.score += Math.round(n); if (label) UI.banner(label, '#ffe060', 1.1); },
  onKill(e, src) {
    const st = this.stats;
    if (e.score > 0 && !e.noCount) {
      st.kills++; st.hits++; this.combo++; this.comboT = 2.4;
      const mult = 1 + Math.min(4, Math.floor(this.combo / 6)) * 0.25;
      st.score += Math.round(e.score * mult);
    }
    if (e.squad && this.squads[e.squad]) {
      const q = this.squads[e.squad]; q.left--;
      if (q.left <= 0 && !q.broken && q.total > 1) { this.addScore(q.total * 100); UI.banner(`SQUAD CLEARED  +${q.total * 100}`, '#7fffd4', 1.6); Sfx.clear(); Player.heal(5); }
    }
    if (e.partName && e.partName !== 'core' && e.anchor) e.anchor.visible = false;
    if (e.kind === 'pylon' && e.parent) e.parent.disable();
    if (e.partName === 'core') { /* boss AI notices */ }
    if (e.kind === 'flyer' && Math.random() < 0.06) this.spawnPickup('crate-laser-or-bomb', e.p.x, e.p.y, e.p.z);
    Input.rumble(0.1, 0.4, 70);
  },
  spawnPickup(kind, x, y, z) {
    if (kind === 'ring') {
      const e = new Ent('ring', buildRing('silver'), { cat: CAT.PICKUP, hp: 1, r: 3.8, targetable: false, keep: false, params: { kind: 'silver' } });
      e.p.set(x, y, z); e.pickup = 'silver'; this.add(e, { r: 3.8 }); return;
    }
    const k = Math.random() < 0.5 ? 'bomb' : 'laser';
    const e = new Ent('crate', buildCrate(k), { cat: CAT.PICKUP, hp: 1, r: 2.2, targetable: false, params: { kind: k } });
    e.p.set(x, y, z); e.pickup = k; this.add(e, { r: 2.2 });
  },
  spawnMissile(pos, speed = 40, turn = 1.3) {
    const e = new Ent('missile', buildMissile(), { hp: 1, r: 1.2, score: 60, contact: 18, targetable: true, keep: true, params: { speed, turn }, colors: [0xe8e0d0, 0xe2562f, 0xffc040] });
    e.p.copy(pos); e.vel.set(0, 0, speed * 0.4); this.add(e, { r: 1.2 });
  },
  spawnScout(x, y, z, o = {}) {
    const swoop = o.t === 'swooper';
    const e = new Ent('flyer', swoop ? buildSwooper() : buildScout(o.color), {
      hp: o.hp ?? 2, r: 1.9, score: swoop ? 150 : 100, act: o.act ?? 260, squad: o.squad,
      colors: swoop ? [0xe2562f, 0x7a2418, 0xffc040] : [0x6a2f9a, 0x3c1d66, 0xff3a4a],
      params: { pattern: o.pattern || 'weave', speed: o.speed ?? 38, amp: o.amp ?? 9, fireRate: o.fireRate ?? (swoop ? 1.4 : 1.9), burst: o.burst ?? (swoop ? 2 : 1), tail: o.tail, dmg: o.dmg ?? 9, freq: o.freq, dir: o.dir },
    });
    e.p.set(x, y, z); faceFlip(e.group); this.add(e, { r: 1.9 }); return e;
  },
  warnTail(e) {
    if (e.warned) return; e.warned = true;
    UI.warn('TAILED!  Roll, bomb or let wingmen help'); Sfx.warn();
    this.say('marrow', 'Hazel, you have one on your tail! Hang on!', 2.8, true);
  },
  onDeflect() { this.addScore(25); Input.rumble(0.2, 0.6, 80); },
  onAllyLost() { UI.warn('WINGMAN DOWN'); },
  onPlayerDown() {
    this.phase = 'dead'; this.stats.deaths++; this.deadShown = false;
    Music.stop(); Music.defeat();
  },
  say(who, text, dur = 3.4, quick = false) { UI.say(who, text, dur, quick); },
  banner(text, color, dur) { UI.banner(text, color, dur); },
  tipEvent(id) { this.tipFlags[id] = true; },

  novaBomb(pos) {
    Sfx.bomb(); Input.rumble(1, 1, 500); Fx.trauma = 1; UI.flash('#fff6d8', 0.8);
    Fx.shockwave(_a.copy(pos).add(V3(0, 0, -10)), 150, 0xffe0a0, false); Fx.shockwave(_a.copy(pos).add(V3(0, 0, -30)), 100, 0xffffff, false);
    this.bombFx = { t: 0, pos: pos.clone(), ticks: 0 };
    this.bombPulse(14, 1.0);
  },
  bombPulse(dmg, k) {
    const P = Player;
    for (const e of [...this.ents]) {
      if (!e.alive) continue;
      const ep = e.wpos(V3()); const dz = P.pos.z - ep.z;
      if (dz < -10 || dz > 280) continue;
      if (Math.hypot(ep.x - P.pos.x, ep.y - P.pos.y) > 110) continue;
      if (e.cat !== CAT.ENEMY || e.kind === 'boss') continue;
      Fx.explosion(ep.clone(), 0.5, { shake: 0.1 });
      e.damage(e.kind === 'part' ? dmg * 0.6 : dmg, { from: 'p' });
    }
    for (let i = Shots.list.length - 1; i >= 0; i--) {
      const s = Shots.list[i]; if (s.from !== 'e') continue;
      Fx.burst(s.pos, 4, { speed: 8, life: 0.4, size: 0.4, color: 0xffd080 }); s.mesh.parent && s.mesh.parent.remove(s.mesh); Shots.list.splice(i, 1);
    }
    for (let i = 0; i < 8 * k; i++) Fx.explosion(V3(P.pos.x + rr(-40, 40), P.pos.y + rr(-25, 25), P.pos.z - rr(30, 160)), rr(0.5, 1.2), { shake: 0.05 });
  },

  // ---------- timeline ----------
  processEvents() {
    const evs = this.lvl.events;
    while (this.nextEv < evs.length) {
      const ev = evs[this.nextEv];
      const lead = LEAD[ev.t] ?? 420;
      if (ev.at - lead > this.dist) break;
      this.nextEv++;
      if (ev.at < this.startAt - 1) continue; // already passed (checkpoint restart)
      this.fire(ev);
    }
  },
  fire(ev) {
    const f = Spawn[ev.t]; if (f) f(ev, this);
  },

  // ---------- tutorial ----------
  updateTips(dt) {
    const T = this.tipActive; if (!T) return;
    T.t += dt;
    if (!T.done) {
      let ok = !!this.tipFlags[T.def.done];
      if (T.id === 'move') { this.moveAcc += (Math.abs(Input.move.x) + Math.abs(Input.move.y) > 0.5 ? dt : 0); ok = this.moveAcc > 0.8; }
      if (T.id === 'boost') ok = this.stats.boostTime - T.b0 > 0.8;
      if (T.id === 'brake') ok = this.stats.brakeTime - T.k0 > 0.6;
      if (ok || T.t > 18) { T.done = true; T.t = 0; if (ok) { Sfx.clear(); } UI.tipDone(ok); }
    } else if (T.t > 1.3) { this.tipActive = null; UI.clearTip(); }
  },

  readControls() {
    return { mx: Input.move.x, my: Input.move.y, fire: Input.held('fire'), firePressed: Input.pressed('fire'), bombPressed: Input.pressed('bomb'), boost: Input.held('boost'), brake: Input.held('brake'), roll: Input.consumeRoll() };
  },

  // ---------- main per-frame update ----------
  update(dt) {
    const P = Player;
    this.time += dt;
    const ctl = this.attract ? Autopilot.controls(dt) : this.readControls();
    if (this.attract) { const r = ctl.roll; if (r) Input.rollQueue = 0; }

    if (this.phase === 'intro') {
      this.introT += dt;
      if (this.introT > 3.2) { this.phase = 'play'; UI.banner('GO!', '#7fffd4', 1.0); Sfx.go(); }
    }
    P.update(dt, ctl);
    if (P.state === 'alive') { this.dist += P.speed * dt; }
    P.pos.z = -this.dist; P.group.position.copy(P.pos);

    if (this.phase === 'play' || this.phase === 'intro') this.processEvents();
    for (let i = 0; i < this.ents.length; i++) {
      const e = this.ents[i]; if (!e.alive) continue;
      const f = AI[e.kind]; if (f) f(e, dt);
      if (e.pulse > 0) { e.pulse -= dt; if (e.kind !== 'asteroid' && e.kind !== 'mine' && e.group && e.kind !== 'boss' && e.kind !== 'part') e.group.scale.setScalar(1 + Math.max(0, e.pulse) * 0.7); }
    }
    for (const w of this.wingmen) w.update(dt);
    Shots.update(dt); Hazards.update(dt);
    this.playerCollisions();
    if (this.bombFx) { this.bombFx.t += dt; if (this.bombFx.ticks === 0 && this.bombFx.t > 0.35) { this.bombFx.ticks = 1; this.bombPulse(10, 0.6); } if (this.bombFx.t > 1.2) this.bombFx = null; }
    this.comboT -= dt; if (this.comboT <= 0) this.combo = 0;
    // checkpoints
    for (const c of this.lvl.checkpoints) if (this.dist >= c && c > this.checkpoint) this.checkpoint = c;
    if (!this.attract && this.tipActive) this.updateTips(dt);
    // outro & death
    if (this.phase === 'outro') { this.outroT += dt; if (this.outroT > 4.2 && !this.doneShown) { this.doneShown = true; this.completeLevel(); } }
    if (this.phase === 'dead' && P.deadT > 2.4 && !this.deadShown) { this.deadShown = true; UI.showGameOver(); }
    // sync physics bodies
    for (const e of this.ents) if (e.alive) Phys.sync(e);
    this.flushRemovals();
    // world visuals
    Scenery.update(P.pos.z);
    Gfx.updateDust(P.pos.x, P.pos.y, P.pos.z, P.speed, dt);
    Gfx.updateSun(P.pos);
    this.updateCamera(dt);
    Gfx.updateSky(Gfx.camera.position, this.time);
  },

  updateCamera(dt) {
    const P = Player, cam = Gfx.camera;
    let tp, tl, fov = 62 + (P.boosting ? 14 : 0) - (P.braking ? 4 : 0);
    if (this.phase === 'intro') {
      const k = sstep(0, 3.2, this.introT);
      tp = V3(lerp(16, P.pos.x * 0.62, k), lerp(7, P.pos.y * 0.62 + 3.1, k), lerp(P.pos.z + 34, P.pos.z + 11.5, k));
      tl = V3(P.pos.x * 0.4, P.pos.y * 0.4 + 1, P.pos.z - lerp(-4, 45, k));
      this.camInit = true; this.camPos.copy(tp); this.camLook.copy(tl); fov = lerp(48, 62, k);
    } else if (this.phase === 'outro') {
      tp = V3(P.pos.x * 0.4 + 6, P.pos.y * 0.4 + 5, P.pos.z + 22); tl = V3(P.pos.x, P.pos.y, P.pos.z - 30); fov = 70;
    } else if (P.state === 'dead') {
      tp = this.camPos.clone(); tl = V3(P.pos.x, P.pos.y, P.pos.z - 10);
    } else {
      tp = V3(P.pos.x * 0.62, P.pos.y * 0.62 + 3.1, P.pos.z + 11.5); tl = V3(P.pos.x * 0.38, P.pos.y * 0.38 + 1.2, P.pos.z - 45);
    }
    if (!this.camInit) { this.camPos.copy(tp); this.camLook.copy(tl); this.camInit = true; }
    const kp = this.phase === 'intro' ? 1 : 1 - Math.exp(-9 * dt);
    this.camPos.lerp(tp, kp); this.camLook.lerp(tl, 1 - Math.exp(-12 * dt));
    cam.position.copy(this.camPos);
    const sh = Fx.shakeAmount();
    if (sh > 0.0005) cam.position.add(_a.set(rr(-1, 1) * sh * 1.6, rr(-1, 1) * sh * 1.6, rr(-1, 1) * sh));
    cam.lookAt(this.camLook);
    if (P.state === 'alive') cam.rotateZ(-P.vx * 0.0035);
    this.fov = damp(this.fov, fov, 5, dt); cam.fov = this.fov; cam.updateProjectionMatrix();
  },

  playerCollisions() {
    const P = Player; if (P.state !== 'alive') return;
    const hits = [];
    Phys.overlap(P.pos, 1.5, CAT.ENEMY | CAT.OBST | CAT.PICKUP, (e) => { hits.push(e); return true; });
    for (const e of hits) {
      if (!e.alive) continue;
      if (e.cat === CAT.PICKUP) { this.collect(e); continue; }
      if (e.cat === CAT.OBST) {
        if (e.kind === 'laserGate' && !e.beamOn) continue;
        P.hurt(e.kind === 'laserGate' ? 18 : 22, 'ram');
        const ep = e.wpos(V3());
        P.vx += Math.sign(P.pos.x - ep.x || 1) * 18; P.vy += Math.sign(P.pos.y - ep.y || 1) * 10;
        Fx.burst(P.pos, 8, { speed: 12, life: 0.4, size: 0.35, color: [0xffa040, 0xffffff] });
        continue;
      }
      if (e.kind === 'boss' || e.parent) { P.hurt(26, 'ram'); P.vx += Math.sign(P.pos.x - e.p.x || 1) * 16; P.vy += 6; continue; }
      P.hurt(e.contact, 'ram');
      P.vx += Math.sign(P.pos.x - e.p.x || 1) * 12;
      e.damage(e.kind === 'missile' || e.kind === 'mine' ? 99 : 6, { from: 'ram' });
    }
  },
  collect(e) {
    const P = Player; const p = e.p;
    Fx.burst(p, 16, { speed: 14, life: 0.7, size: 0.4, color: e.pickup === 'gold' ? [0xffe080, 0xffffff] : [0xbfe6ff, 0xffffff] });
    if (e.kind === 'ring') {
      this.stats.rings++;
      if (e.pickup === 'gold') { P.maxHp = Math.min(160, P.maxHp + 20); P.hp = P.maxHp; UI.banner('GOLD RING!  SHIELD MAX UP', '#ffd040', 1.6); this.addScore(1000); }
      else { P.heal(28); UI.banner('SHIELD +28', '#9affff', 1.0); this.addScore(300); }
      Sfx.ring();
    } else if (e.kind === 'crate') {
      if (e.pickup === 'bomb') { P.bombs = Math.min(6, P.bombs + 1); UI.banner('NOVA BOMB +1', '#ffa060', 1.1); Sfx.bombPickup(); }
      else { if (P.laserLv < 3) { P.laserLv++; UI.banner(P.laserLv === 2 ? 'TWIN LASERS!' : 'HYPER LASERS!', '#9affc8', 1.3); } else { this.addScore(500, 'LASER MAX  +500'); } Sfx.pickup(); }
    }
    this.removeEnt(e, true);
  },

  // ---------- boss / stage flow ----------
  onBossDefeated(b) {
    UI.hideBoss(); Music.stop();
    Sfx.alarm(); this.addScore(b.type === 'crawler' ? 8000 : 5000);
    this.say('granny', b.type === 'crawler' ? 'The Crawler is going down! Magnificent flying, Furrow Squadron!' : 'The gunship is breaking up! Great shooting, Furrow Squadron!', 4, true);
    for (const e of [...this.ents]) { if (e.parent === b && e.alive) { e.alive = false; this.removeEnt(e, true); } }
    for (let i = Shots.list.length - 1; i >= 0; i--) if (Shots.list[i].from === 'e') { Shots.list[i].mesh.parent && Shots.list[i].mesh.parent.remove(Shots.list[i].mesh); Shots.list.splice(i, 1); }
    Hazards.clear();
  },
  onBossGone() {
    this.boss = null; this.phase = 'outro'; this.outroT = 0; this.doneShown = false;
    Music.victory(); UI.banner('STAGE CLEAR!', '#7fffd4', 3);
    Player.invuln = 99;
  },
  completeLevel() {
    if (this.attract) { Attract.next(); return; }
    const st = this.stats;
    const killPct = st.enemiesTotal ? st.kills / st.enemiesTotal : 1;
    const ally = (3 - st.alliesLost) / 3; const hpPct = Player.hp / Player.maxHp;
    const val = killPct * 0.55 + ally * 0.2 + hpPct * 0.15 + (st.deaths === 0 ? 0.1 : 0);
    const medal = val >= 0.9 ? 'S' : val >= 0.75 ? 'A' : val >= 0.55 ? 'B' : 'C';
    st.bonus = Math.round(val * 5000); st.score += st.bonus;
    SaveData.record(this.lvl.id, st.score, medal);
    SaveData.data.unlocked = Math.max(SaveData.data.unlocked, this.lvlIdx + 2); SaveData.save();
    this.phase = 'done';
    UI.showResults({ stats: st, medal, killPct, level: this.lvl, hasNext: this.lvlIdx + 1 < LEVELS.length, best: SaveData.data.scores[this.lvl.id] });
  },
  retryFromCheckpoint() {
    this.continues--;
    const cp = this.checkpoint; const keep = this.stats;
    this.startLevel(this.lvlIdx, { startAt: cp, keepStats: true, noIntro: false });
    this.stats = keep;
  },
  restartStage() { this.startLevel(this.lvlIdx, { fresh: true }); },
  exitToTitle() {
    this.attract = false; this.cheat = false; this.mode = 'menu'; this.paused = false;
    this.startShowcase(); Music.play('title'); UI.hideHud();
  },
};

// ---------- spawners: one function per event type ----------
const Spawn = {
  say: (ev) => Game.say(ev.who, ev.text, ev.dur),
  tip: (ev) => {
    if (!S().tutorial || Game.attract) return;
    const def = TIPS[ev.id]; if (!def) return;
    Game.tipActive = { id: ev.id, def, t: 0, done: false, b0: Game.stats.boostTime, k0: Game.stats.brakeTime };
    UI.showTip(ev.id, def.text);
  },
  banner: (ev) => UI.banner(ev.text, ev.color, ev.dur),
  music: (ev) => Music.play(ev.name),
  scout: (ev) => Game.spawnScout(ev.x ?? 0, ev.y ?? 0, -ev.at, ev),
  swooper: (ev) => Game.spawnScout(ev.x ?? 0, ev.y ?? 0, -ev.at, ev),
  drone: (ev) => {
    const e = new Ent('drone', buildDrone(), { hp: ev.hp ?? 1, r: 1.9, score: 100, act: ev.act ?? 300, params: { fire: ev.fire, bob: true }, squad: ev.squad, colors: [0x5a5a78, 0xff4060, 0xffb030] });
    e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { r: 1.9 });
  },
  turret: (ev) => {
    const m = buildTurret(Game.lvl.scenery === 'canyon' ? 0x7a5a48 : 0x5a5470);
    const e = new Ent('turret', m, { hp: ev.hp ?? 3, r: 1.8, score: 150, act: ev.act ?? 240, params: { fireRate: ev.fireRate }, anchor: m.userData.head, colors: [0x5a5470, 0x8a3a4a, 0xff4060] });
    e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { r: 1.8 });
  },
  mine: (ev) => {
    const e = new Ent('mine', buildMine(), { hp: 1, r: 1.9, score: 120, contact: 22, act: ev.act ?? 270, colors: [0x4a2a5a, 0xffd040, 0xff3050] });
    e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { r: 1.9 });
  },
  asteroid: (ev) => {
    const size = ev.size ?? 4; const g = buildAsteroid(size, ev.variant ?? 0, Game.lvl.env.rock || 0x8a7d78);
    if (ev.solid) {
      const e = new Ent('asteroid', g, { cat: CAT.OBST, hp: 999, r: size, targetable: false, params: {} });
      e.fixedBody = true; e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { r: size * 0.88 });
      // static colliders cannot move: asteroid spin only
    } else {
      const e = new Ent('asteroid', g, { cat: CAT.ENEMY, hp: ev.hp ?? 3, r: size * 0.9, score: 0, targetable: false, contact: 18, params: {} });
      e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { r: size * 0.88 });
    }
  },
  ring: (ev) => {
    const e = new Ent('ring', buildRing(ev.kind || 'silver'), { cat: CAT.PICKUP, hp: 1, r: 3.8, targetable: false, params: { kind: ev.kind } });
    e.pickup = ev.kind || 'silver'; e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { r: 3.8 });
  },
  crate: (ev) => {
    const e = new Ent('crate', buildCrate(ev.kind), { cat: CAT.PICKUP, hp: 1, r: 2.2, targetable: false, params: { kind: ev.kind } });
    e.pickup = ev.kind; e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { r: 2.2 });
  },
  walker: (ev) => {
    const m = buildWalker();
    const e = new Ent('walker', m, { hp: 9, r: 3.2, score: 400, big: 1.8, act: ev.act ?? 270, anchor: m.userData.body, params: { double: ev.double }, colors: [0x8a6a4a, 0xc6a070, 0xff4060] });
    e.p.set(ev.x ?? 0, 0, -ev.at); Game.add(e, { r: 3.2 });
  },
  carrier: (ev) => {
    const m = buildCarrier();
    const e = new Ent('carrier', m, { hp: 36, r: 15, score: 1500, big: 3.2, act: ev.act ?? 330, contact: 30, params: { launches: ev.launches ?? 6 }, colors: [0x5a4a72, 0x7a6a92, 0xff8030] });
    e.p.set(ev.x ?? 0, ev.y ?? 0, -ev.at); Game.add(e, { hx: 5, hy: 2.6, hz: 17 });
  },
  rock: (ev) => {
    const g = buildRock(ev.w ?? 7, ev.h ?? 26, ev.d ?? 7, Game.lvl.env.rock || 0x8a6a4a);
    const e = new Ent('obst', g, { cat: CAT.OBST, hp: 999, r: 4, targetable: false, params: {} });
    const a = new THREE.Object3D(); a.position.y = (ev.h ?? 26) / 2; g.add(a); e.anchor = a; e.fixedBody = true;
    e.p.set(ev.x ?? 0, 0, -ev.at); Game.add(e, { hx: (ev.w ?? 7) * 0.46, hy: (ev.h ?? 26) / 2, hz: (ev.d ?? 7) * 0.46 });
  },
  arch: (ev) => {
    const w = ev.width ?? 24, h = ev.height ?? 20, t = 4;
    const g = buildArch(w, h, Game.lvl.env.rock || 0x8a6a4a);
    const e = new Ent('obst', g, { cat: CAT.OBST, hp: 999, r: 4, targetable: false, params: {} });
    e.p.set(ev.x ?? 0, 0, -ev.at); Game.add(e, null);
    const c = e.p;
    Phys.extraFixed(e, V3(c.x - w / 2 - t / 2, h / 2, c.z), t / 2, h / 2, t * 0.7, CAT.OBST);
    Phys.extraFixed(e, V3(c.x + w / 2 + t / 2, h / 2, c.z), t / 2, h / 2, t * 0.7, CAT.OBST);
    Phys.extraFixed(e, V3(c.x, h + t * 0.3, c.z), (w + t * 2.4) / 2, t * 0.6, t * 0.9, CAT.OBST);
  },
  laserGate: (ev) => {
    const w = ev.width ?? 34; const g = buildLaserGate(w);
    const gate = new Ent('laserGate', g, { cat: CAT.OBST, hp: 999, r: 3, targetable: false, params: {} });
    gate.beamOn = true; g.position.set(ev.x ?? 0, ev.y ?? 0, -ev.at);
    Game.add(gate, null);
    gate.beamCol = Phys.extraFixed(gate, V3(g.position.x, g.position.y, g.position.z), w / 2 - 1, 0.5, 0.6, CAT.OBST);
    gate.disable = () => {
      if (!gate.beamOn) return; gate.beamOn = false;
      try { Phys.byHandle.delete(gate.beamCol.handle); Phys.world.removeCollider(gate.beamCol, false); gate.extras = gate.extras.filter((c) => c !== gate.beamCol); } catch (e) { /* ignore */ }
      Fx.burst(g.position, 24, { speed: 18, life: 0.7, size: 0.4, color: [0xff3050, 0xffffff] }); Sfx.explosion(0.8); Game.addScore(250, 'FENCE DOWN +250');
    };
    gate.pylons = [];
    for (const sd of [-1, 1]) {
      const a = new THREE.Object3D(); a.position.set(sd * w / 2, 0, 0); g.add(a);
      const p = new Ent('pylon', new THREE.Object3D(), { hp: 3, r: 1.5, score: 150, anchor: a, parent: gate, contact: 15, keep: true, colors: [0x5a5470, 0xff4060] });
      p.params = {}; Game.add(p, { r: 1.5 }, true); gate.pylons.push(p);
    }
  },
  help: (ev) => {
    const w = Game.wingmen.find((x) => x.cast === ev.who);
    if (!w || w.state !== 'fly') return;
    w.state = 'chased'; w.chasers = [];
    Game.say(ev.who, pick(["Help! I've got bandits on my tail — get them off me!", 'Hazel, they are all over me! Shoot them!', 'I cannot shake them! A little help here?']), 3.6, true);
    UI.warn(`${CAST[ev.who].name.toUpperCase()} NEEDS HELP`); Sfx.warn();
    for (let i = 0; i < (ev.chasers ?? 2); i++) {
      const c = Game.spawnScout(w.pos.x, w.pos.y, w.pos.z + 16, { hp: 2, act: 99999 });
      c.st = 'chase'; c.chaseTarget = w; c.off = V3(rr(-3, 3), rr(0.5, 2), 14 + i * 9); c.score = 200; c.params.tail = false;
      w.chasers.push(c);
    }
  },
  gunship: () => {
    const P = Player; const m = buildGunship(); const U = m.userData;
    const b = new Boss('gunship', m, { r: 9, big: 5, title: 'BLIGHT GUNSHIP' });
    b.anchor = U.hull; b.p.set(0, 0, P.pos.z - 260); b.group.rotation.y = Math.PI;
    Game.add(b, { hx: 3.4, hy: 1.6, hz: 7 });
    b.addPart('engL', U.parts.engL, 10, 2.2, { score: 300 }); b.addPart('engR', U.parts.engR, 10, 2.2, { score: 300 });
    b.parts.engL.countsForBar = false; b.parts.engR.countsForBar = false;
    b.addPart('turL', U.parts.turL, 14, 1.8, { score: 600 }); b.addPart('turR', U.parts.turR, 14, 1.8, { score: 600 });
    b.addPart('core', U.eye, 44, 2.3, { invuln: true, score: 3000, big: 3 }); b.parts.core.targetable = false;
    Game.boss = b; UI.showBoss(b); Sfx.warn();
    Game.say('blight', 'Hrrr... tender little sprouts. My gunship will mulch you all!', 3.8, true);
  },
  crawler: () => {
    const P = Player; const m = buildCrawler(); const U = m.userData;
    const b = new Boss('crawler', m, { r: 22, big: 7, title: 'COLOSSUS CRAWLER' });
    b.anchor = U.body; b.p.set(0, 0, P.pos.z - 300); b.group.rotation.y = Math.PI;
    Game.add(b, { hx: 12, hy: 8, hz: 13 });
    b.addPart('genL', U.parts.genL, 22, 2.8, { score: 800 }); b.addPart('genR', U.parts.genR, 22, 2.8, { score: 800 });
    b.addPart('canL', U.parts.canL, 14, 2.2, { score: 500 }); b.addPart('canR', U.parts.canR, 14, 2.2, { score: 500 });
    b.parts.canL.countsForBar = false; b.parts.canR.countsForBar = false;
    b.addPart('core', U.parts.core, 52, 3.4, { invuln: true, score: 5000, big: 4 }); b.parts.core.targetable = false;
    Game.boss = b; UI.showBoss(b); Sfx.warn();
    Game.say('blight', 'Behold my Colossus! No sprout survives the Dustbowl!', 3.8, true);
  },
};
