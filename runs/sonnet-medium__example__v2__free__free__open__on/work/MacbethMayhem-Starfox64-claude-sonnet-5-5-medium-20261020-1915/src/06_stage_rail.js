/* ===================== 06 RAIL STAGE RUNTIME ===================== */
const LOOK = 235; // spawn look-ahead distance

class RailStage {
  constructor(def, opts = {}) {
    this.def = def; this.opts = opts; this.mode = 'rail'; this.attract = !!opts.attract;
    this.path = new RailPath(def.path); this.route = null; this.lane = 0; this.laneT = 0;
    this.baseSpeed = def.speed; this.introT = 0; this.cinematic = false; this.freezeRail = false; this.ended = false; this.endT = 0; this.bossMode = false;
    this.hint = null; this.hintT = 0; this.rescued = new Set(); this.lost = new Set(); this.spawnedKillable = 0; this.cp = null; this.time = 0; this.camPos = new V3(); this.camLook = new V3(); this.camInit = false; this.deathHandled = false;
    this.camShake = new V3(); this.clock = 0; this.forkWall = false; this.aiState = { chargeT: 0, rollT: 0, route: opts.route || (Math.random() < 0.5 ? 'A' : 'B') };
    this.events = def.events.map((e) => Object.assign({ done: false }, e));
    this.tmp = new V3();
  }
  /* ---------- helpers used by UI / AI ---------- */
  say(who, text) { UI.comm(who, text); }
  banner(a, b) { UI.banner(a, b); }
  toast(t, kind) { UI.toast(t, kind); }
  pathY(s) { this.path.frame(s); return this.path.p.y; }
  minY() { return 4.8; }
  laneCenter(s) { if (!this.route) return 0; return s < 3470 ? (this.route === 'A' ? -21 : 21) : 0; }
  relCoords(pos, out) { const P = this.player; this.path.frame(P.s); const rel = this.tmp.copy(pos).sub(this.path.p); out = out || {}; out.ds = rel.dot(this.path.t); out.x = rel.dot(this.path.r); out.y = rel.dot(this.path.u); return out; }
  lockable(e) { return e.alive && e.team === 'e' && e.targetable !== false && e.active !== false && e.kind !== 'bossbody' && e.kind !== 'boss'; }
  dropPickup(pos, kind) { W.add(new Pickup(this, kind, this.player.s + 30, 0, 0, { pos: pos.clone(), life: 12 })); }
  aimAssist(origin, fwd) {
    const dir = new V3().copy(fwd);
    if (!Settings.aimAssist) return dir;
    let best = null, bd = 0.10;
    for (const e of W.ents) {
      if (!this.lockable(e)) continue;
      this.tmp.copy(e.pos).sub(origin); const d = this.tmp.length(); if (d < 15 || d > 230) continue;
      const a = this.tmp.normalize().angleTo(fwd); if (a < bd) { bd = a; best = e; }
    }
    if (best) { this.tmp.copy(best.pos).sub(origin).normalize(); dir.lerp(this.tmp, 0.85).normalize(); }
    return dir;
  }
  enemyShoot(e, speed, inacc, from, ang = 0) {
    const P = this.player; if (!P.alive) return;
    const src = from ? from : e.pos; const d = src.distanceTo(P.pos); if (d < 10) return;
    this.path.frame(P.s);
    const aim = this.tmp.copy(P.pos).addScaledVector(this.path.t, P.speed * (d / speed) * 0.9);
    aim.x += rand(-1, 1) * inacc * d * 0.08; aim.y += rand(-1, 1) * inacc * d * 0.08;
    const dir = aim.sub(src).normalize(); if (ang) dir.applyAxisAngle(this.path.u, ang);
    Bullets.spawn({ team: 'e', kind: 'orb', pos: src, vel: dir.multiplyScalar(speed), dmg: 9, life: 6, r: 0.75, hp: 1 });
    Sfx.enemyLaser();
  }
  enemyMissile(e, pos) {
    const P = this.player; if (!P.alive) return;
    const dir = new V3().copy(P.pos).sub(pos).normalize().add(new V3(rand(-0.25, 0.25), rand(0.1, 0.4), rand(-0.1, 0.1))).normalize();
    Bullets.spawn({ team: 'e', kind: 'missile', pos, vel: dir.multiplyScalar(40), dmg: 16, life: 7, r: 1.0, hp: 3, target: P, turn: 1.2 });
    Sfx.missile();
  }

  /* ---------- world building ---------- */
  build() {
    const def = this.def, th = def.theme, path = this.path;
    Gfx.clearWorld(); FX.reset(); Debris.clear(); Bullets.clear(); W.reset(); Phys.reset(); Gfx.setTheme(th);
    W.stage = this; W.mode = 'rail';
    // ground
    const gt = groundTexture(th.ground[0], th.ground[1], th.ground[2], 11); gt.repeat.set(90, 90);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000).rotateX(-Math.PI / 2), toon(0xffffff, { map: gt }));
    ground.position.set(120, 0, -5600); ground.receiveShadow = true; Gfx.world.add(ground); this.ground = ground;
    Phys.addGround(0);
    this.buildDecor();
    // entities
    const startS = this.opts.startS || 0;
    this.player = new RailPlayer(this); W.player = this.player; W.add(this.player);
    this.player.s = startS; this.player.winCx = 0;
    this.player.y = 0;
    if (this.opts.attract) this.player.god = true;
    if (!startS && !this.attract) this.introT = 3.4;
    WING.forEach((d, i) => { const w = new Wingman(this, d, i); W.allies.push(w); W.add(w); });
    if (this.opts.route) { this.route = this.opts.route; }
    // mark passed events
    for (const ev of this.events) {
      const trig = this.trigOf(ev);
      if (ev.at < startS - 1 && !(ev.do === 'checkpoint')) ev.done = true;
      if (ev.do === 'banner' && startS === 0) ev.done = false;
    }
    if (startS > this.def.forkAt && !this.route) this.route = this.aiState.route;
    this.baseSpeed = def.speed;
    UI.setBossBar(null);
    Sfx.playMusic(def.music);
    this.updateCamera(0.016, true);
    const P = this.player; P.update(0.001, { x: 0, y: 0 }, this); // initial transform
  }
  decorPut(batch, kind, s, lat, sx, sy, sz, color, o = {}) {
    const path = this.path; path.world(s, lat, 0, this.tmp); const yaw = path.yaw(s) + (o.yaw || 0);
    const cy = o.y !== undefined ? o.y : (kind === 'rock' || kind === 'ball' ? sy * 0.35 : sy / 2);
    batch.add(kind, this.tmp.x, cy, this.tmp.z, yaw, sx, sy, sz, color);
  }
  buildDecor() {
    const def = this.def, path = this.path, batch = new DecorBatch(), rng = mulberry(1337), R = (a, b) => a + rng() * (b - a), PK = (arr) => arr[Math.floor(rng() * arr.length)];
    const rock = [0x8e4632, 0xa8553a, 0x7a3a30, 0xc06a44], canyon = [0x9a4a38, 0xb25c40, 0x7a3a34, 0xc47048], ind = [0x585069, 0x6a5a68, 0x46405a, 0xb04a3a], tankc = [0x8a8aa0, 0x6a7a8a, 0xb0a090], yard = [0x6a5a68, 0x7a4a3a, 0x4a4a68, 0x56506a];
    const L = Math.min(path.length - 60, 10400);
    const put = (k, s, lat, sx, sy, sz, c, o) => this.decorPut(batch, k, s, lat, sx, sy, sz, c, o);
    for (let s = -60; s < L; s += 24) {
      for (const side of [-1, 1]) {
        if (s < 900) { // desert
          if (rng() < 0.55) put('rock', s + R(-10, 10), side * R(34, 220), R(3, 12), R(3, 10), R(3, 12), PK(rock));
          if (rng() < 0.12) put('mesa', s, side * R(160, 420), R(30, 60), R(40, 110), R(30, 60), PK(canyon));
        } else if (s < 1800) { // canyon
          put('mesa', s + R(-8, 8), side * R(58, 78), R(18, 34), R(60, 130), R(22, 34), PK(canyon));
          if (rng() < 0.4) put('spire', s, side * R(90, 170), R(8, 18), R(50, 120), R(8, 18), PK(canyon));
          if (rng() < 0.4) put('rock', s, side * R(30, 52), R(3, 9), R(3, 8), R(3, 9), PK(rock));
        } else if (s < 2480) { // refinery
          if (rng() < 0.5) put('tank', s, side * R(40, 90), R(7, 14), R(12, 30), R(7, 14), PK(tankc));
          if (rng() < 0.4) put('tower', s, side * R(36, 80), R(4, 8), R(30, 70), R(4, 8), PK(ind));
          if (rng() < 0.3) put('tank', s, side * R(50, 110), R(3, 5), R(60, 95), R(3, 5), 0x46405a);
          if (rng() < 0.45) put('tower', s, side * R(30, 42), R(0.8, 1.4), R(1.2, 2), R(40, 70), PK(ind), { y: R(8, 14) }); // pipes running along the track
          if (rng() < 0.25) put('mesa', s, side * R(160, 300), R(30, 60), R(40, 110), R(30, 60), PK(canyon));
        } else if (s < 3500) { // fork zone: lanes drawn below
          if (rng() < 0.35) put('mesa', s, side * R(200, 420), R(30, 60), R(40, 110), R(30, 60), PK(canyon));
        } else { // train yard
          if (rng() < 0.55) put('tower', s + R(-6, 6), side * R(40, 100), R(14, 30), R(8, 18), R(24, 50), PK(yard));
          if (rng() < 0.35) put('tank', s, side * R(40, 110), R(6, 12), R(10, 22), R(6, 12), PK(tankc));
          if (rng() < 0.25) put('tower', s, side * R(34, 60), R(3, 5), R(40, 80), R(3, 5), PK(ind));
          if (rng() < 0.18) put('mesa', s, side * R(180, 400), R(30, 60), R(40, 110), R(30, 60), PK(canyon));
        }
      }
      // distant mountains and clouds
      if (rng() < 0.22) put('spire', s, (rng() < 0.5 ? -1 : 1) * R(500, 1100), R(120, 260), R(250, 520), R(120, 260), PK([0x6a3a5a, 0x7a4a6a, 0x58305a]));
      if (rng() < 0.28) put('cloud', s, R(-700, 700), R(60, 160), R(14, 30), R(40, 90), 0xffd0c0, { y: R(160, 340) });
    }
    // fork wall support structure + lanes
    const fa = def.forkAt;
    for (let s = fa + 40; s < 3470; s += 30) {
      path.frame(s); const py = path.p.y;
      // divider
      put('tower', s, 0, 4, 78, 31, 0x4a4468);
      // lane A: tunnel
      put('tower', s, -44, 4, 78, 31, 0x56506a);
      if (Math.floor(s / 30) % 3 !== 2) put('tower', s, -22, 46, 2.6, 30, 0x46405a, { y: py + 20 });
      // lane B: foundry
      put('tank', s, 52 + (rng() < 0.5 ? 0 : 14), R(6, 11), R(16, 36), R(6, 11), PK([0x6a5a68, 0x8a3a30]));
      if (rng() < 0.4) put('tank', s, 70 + R(0, 50), R(4, 7), R(60, 110), R(4, 7), 0x46405a);
      if (rng() < 0.3) put('tower', s, 56, R(10, 18), R(10, 22), R(14, 26), 0x7a3a30);
    }
    for (let s = fa + 60; s < 3470; s += 60) {
      path.frame(s); const py = path.p.y;
      for (const x of [-42, -2]) put('tower', s, x, 2.6, py + 20, 2.6, 0x8a2f3a);
      put('tower', s, -22, 44, 2.6, 2.6, 0xd8b24a, { y: py + 19 });
    }
    // railway on the ground through the yard
    const track = (s) => { for (const lat of [-1.4, 1.4]) put('tower', s, lat, 0.45, 0.5, 6.4, 0x7a7488, { y: 0.55 }); };
    for (let s = 3400; s < L; s += 6) track(s);
    for (let s = 3400; s < L; s += 2.4) put('tower', s, 0, 5, 0.3, 0.8, 0x4a3a3a, { y: 0.15 });
    // yard gantries crossing the rail (decor only)
    for (let s = 3700; s < L - 400; s += 380) { for (const x of [-30, 30]) put('tower', s, x, 3, 36, 3, 0x56506a); put('tower', s, 0, 66, 3, 3, 0x56506a, { y: 36 }); }
    batch.build(Gfx.world);
    // glow lamps and furnace pools
    const gb = new DecorBatch();
    for (let s = fa + 40; s < 3470; s += 60) { path.frame(s); const py = path.p.y; for (const x of [-30, -12]) { path.world(s, x, 0, this.tmp); gb.add('lamp', this.tmp.x, py + 18, this.tmp.z, path.yaw(s), 3, 0.6, 3, 0xffe0a0); } path.world(s, 82 + R(-10, 20), 0, this.tmp); gb.add('lamp', this.tmp.x, 0.2, this.tmp.z, path.yaw(s), 26, 0.4, 40, 0xff6a2a); }
    for (let s = 1850; s < 2450; s += 70) for (const side of [-1, 1]) { path.world(s, side * R(45, 80), 0, this.tmp); gb.add('lamp', this.tmp.x, R(60, 80), this.tmp.z, 0, 4, 4, 4, 0xff8a3a); }
    for (let s = 3500; s < L - 200; s += 160) for (const side of [-1, 1]) { path.world(s, side * 38, 0, this.tmp); gb.add('lamp', this.tmp.x, 12, this.tmp.z, 0, 1.2, 1.2, 1.2, 0xff4a3a); }
    gb.buildGlow(Gfx.world);
  }

  /* ---------- events ---------- */
  trigOf(ev) { return ['say', 'hint', 'banner', 'checkpoint', 'boss'].includes(ev.do) ? ev.at : ev.at - (ev.do === 'fork' ? 250 : ev.do === 'mid' ? 150 : LOOK); }
  laneX() { return this.route === 'A' ? -21 : this.route === 'B' ? 21 : 0; }
  runEvents() {
    const P = this.player;
    for (const ev of this.events) {
      if (ev.done) continue;
      if (ev.route && ev.route !== this.route) { if (this.route) ev.done = true; continue; }
      if (P.s < this.trigOf(ev)) continue;
      ev.done = true; this.fireEvent(ev);
    }
  }
  fireEvent(ev) {
    const P = this.player, lane = ev.route ? this.laneX() : 0;
    switch (ev.do) {
      case 'say': this.say(ev.who, ev.text); break;
      case 'hint': if (Settings.hints && !this.attract) { this.hint = HINTS[ev.id]; this.hintId = ev.id; this.hintT = 0; UI.setHint(this.hint, this); } break;
      case 'banner': if (!this.attract) UI.banner(ev.text, ev.sub); break;
      case 'checkpoint': this.cp = { s: ev.at, route: this.route, name: ev.name }; if (!this.attract) { UI.toast('CHECKPOINT · ' + ev.name.toUpperCase(), 'good'); Game.checkpoint = { stage: this.def.id, s: ev.at, route: this.route }; } break;
      case 'wave': this.spawnWave(Object.assign({ route: ev.route }, ev), ev.at, lane); break;
      case 'obstacle': W.add(new Obstacle(this, ev.kind, ev.x + lane, ev.y, ev.at)); break;
      case 'pickup': W.add(new Pickup(this, ev.kind, ev.at, ev.x + lane, ev.y)); break;
      case 'chase': this.spawnChase(ev.who); break;
      case 'train': this.spawnTrain(ev); break;
      case 'mid': { const e = new Enemy('hecate', { rs: ev.at + 60, rx: 0, ry: 2, x0: 0, y0: 2, holdDist: 78, closing: 22, freq: 1, amp: 0, phase: 0 }); W.add(e); this.spawnedKillable++; UI.banner('WARNING', 'HECATE GUNSHIP'); Sfx.warn(); break; }
      case 'fork': {
        this.forkWall = true; W.add(new Obstacle(this, 'wall', 0, 0, this.def.forkAt, { names: { A: 'CANYON TUNNEL', B: 'FOUNDRY ROW' } })); break;
      }
      case 'boss': this.startBoss(); break;
    }
  }
  spawnWave(ev, s0, lane = 0) {
    const n = ev.n, kind = ev.kind;
    for (let i = 0; i < n; i++) {
      const [dx, dy, ds] = formationOffset(ev.form, i, n, ev.sp);
      const x = (ev.x || 0) + (kind === 'swooper' ? 0 : dx) + lane, y = (ev.y || 0) + dy;
      const base = { rs: s0 + ds + (kind === 'swooper' ? 0 : 0), rx: x, ry: y, x0: x, y0: y, phase: rand(TAU), freq: rand(0.7, 1.3), amp: ev.form === 'line' || ev.form === 'v' ? rand(1.5, 3.5) : rand(3, 6), closing: ev.vs !== undefined ? ev.vs : 18, holdDist: rand(48, 78), noFire: !!ev.slow };
      let e;
      if (kind === 'drone') e = new Enemy('drone', base);
      else if (kind === 'swooper') e = new Enemy('swooper', Object.assign(base, { side: dx > 0 ? 1 : -1, closing: 66, x0: (ev.x || 0) + lane, y0: y, rs: s0 + 60 + i * 12 }));
      else if (kind === 'mine') e = new Enemy('mine', Object.assign(base, { closing: ev.vs !== undefined ? -ev.vs : 5, rs: s0 + ds, y0: y }));
      else if (kind === 'gunship') e = new Enemy('gunship', Object.assign(base, { holdDist: 72, holdT: 24, ry: y + 2, y0: y + 2, x0: x + (ev.n > 1 ? (i ? 14 : -14) : 0) }));
      else if (kind === 'turret') {
        const ps = s0 + ds; this.path.frame(ps); const wy = Math.max(8, this.path.p.y - 4 + rand(-2, 4));
        e = new Enemy('turret', Object.assign(base, { rs: ps, worldY: wy + 1.4, meshDy: 1.4 }));
        part(e.mesh, G.cyl(1.7, 2.4, wy, 8), 0x585069, [0, -wy / 2 + 0.2, 0]);
        e.mesh.userData.parts.head.rotation.order = 'YXZ';
      }
      e.noFire = !!ev.slow; W.add(e); if (e.spec.kill) this.spawnedKillable++;
    }
  }
  spawnChase(who) {
    const w = W.allies.find((a) => a.id === who); if (!w || !w.alive) return;
    w.chasers = 2;
    for (let i = 0; i < 2; i++) { const e = new Enemy('chaser', { rs: w.s - 9, rx: w.x, ry: w.y, target: w, phase: i * 3, closing: 0, holdDist: 0, freq: 1, amp: 0 }); W.add(e); this.spawnedKillable++; }
  }
  spawnTrain(ev) {
    const kinds = ev.kinds || ['box', 'tank', 'flat'], n = ev.cars, trainSpeed = this.baseSpeed * 0.62; let prev = null;
    for (let i = n - 1; i >= 0; i--) {
      const isLoco = i === n - 1;
      const o = { rs: ev.at + i * 16, rx: 0, ry: 0, worldY: 3.6, meshDy: 3.6, noFlip: true, speedS: trainSpeed, carKind: kinds[i % kinds.length], t: 0 };
      const e = new Enemy(isLoco ? 'loco' : 'car', o); e.updateTransform(0);
      // trains are scenery-sized targets; collider is a box-ish ball so it blocks the low ground
      W.add(e); if (isLoco) this.spawnedKillable++;
      if ((isLoco || i % 2 === 0) && !(ev.noTurrets)) {
        const t = new Enemy('carTurret', { rs: o.rs, rx: 0, ry: 0, worldY: 5.2 + 1.4, meshDy: 1.4, parent: e, dz: 0, phase: rand(TAU), closing: 0, holdDist: 0, freq: 1, amp: 0 });
        W.add(t); this.spawnedKillable++;
      }
    }
  }
  startBoss() {
    this.bossMode = true; this.baseSpeed = 34; UI.banner('WARNING', 'THANE EXPRESS'); Sfx.warn(); Sfx.playMusic(this.def.bossMusic);
    this.boss = new Boss(this); W.add(this.boss); this.spawnedKillable += 3;
    this.say('maldoon', pick(['Is this a cannon I see before me? Fools, you cannot stop the Thane Express!', 'Double, double, toil and trouble — this train shall be your tomb!']));
  }
  onBossDefeated() {
    this.cinematic = true; this.ended = true; this.endT = 0; this.baseSpeed = 30; Sfx.playMusic('victory'); W.slow = 0.35;
    this.say('hollin', 'The Thane Express is destroyed! Magnificent flying, Birnam Wing!');
    UI.banner('MISSION COMPLETE', '');
  }

  /* ---------- AI for attract mode ---------- */
  aiControl(dt) {
    const P = this.player, c = { x: 0, y: 0, fire: true, charge: false, chargeUp: false, bomb: false, bombDown: false, boost: false, brake: false, rollLDown: false, rollRDown: false, uturn: false };
    P.god = true; const st = this.aiState; st.rollT -= dt;
    let tx = P.x, ty = P.y, best = null, bd = 1e9, near = 0;
    this.path.frame(P.s);
    for (const e of W.ents) {
      if (!e.alive) continue;
      if (this.lockable(e)) { const rc = this.relCoords(e.pos); if (rc.ds < 15 || rc.ds > 170) continue; if (rc.ds < 90) near++; const sc = rc.ds + Math.abs(rc.x - P.x) * 1.5; if (sc < bd) { bd = sc; best = rc; } }
    }
    if (best) { tx = best.x; ty = best.y; }
    else { tx = this.laneCenter(P.s) + Math.sin(this.time * 0.7) * 8; ty = Math.sin(this.time * 0.9) * 4; }
    // obstacles
    for (const e of W.ents) {
      if (!e.alive || !e.solid) continue; const ds = e.rs - P.s; if (ds < 0 || ds > 70) continue;
      if (e.kind === 'obstacle' && e.cols.length) { const rc = this.relCoords(e.pos); tx = Math.abs(rc.x) < 8 && e.cols.length === 3 ? rc.x : (Math.abs(rc.x - P.x) < 6 ? P.x + sign(P.x - rc.x) * 12 : tx); }
    }
    if (!this.route && P.s > this.def.forkAt - 120 && P.s < this.def.forkAt + 20) tx = st.route === 'A' ? -12 : 12;
    if (this.bossMode) { const bp = this.boss && this.boss.phase === 2 ? this.boss.core : this.boss && (this.boss.podL.alive ? this.boss.podL : this.boss.podR); if (bp && bp.alive) { const rc = this.relCoords(bp.pos); tx = rc.x; ty = rc.y; } }
    c.x = clamp((tx - P.x) * 0.3, -1, 1); c.y = -clamp((ty - P.y) * 0.3, -1, 1);
    // dodge bullets
    for (const b of W.bullets) { if (b.alive && b.team === 'e' && b.pos.distanceTo(P.pos) < 18 && st.rollT <= 0 && P.rolling <= 0 && Math.random() < 0.06) { st.rollT = 2.5; if (Math.random() < 0.5) c.rollLDown = true; else c.rollRDown = true; break; } }
    // lock-on volleys
    if (near >= 3 && P.chargeT === 0 && Math.random() < 0.01) st.chargeT = 1.0;
    if (st.chargeT > 0) { st.chargeT -= dt; c.charge = true; c.fire = false; if (st.chargeT <= 0) { c.charge = false; c.chargeUp = true; } }
    if (near >= 6 && P.bombs > 0 && Math.random() < 0.01) c.bombDown = true;
    return c;
  }

  /* ---------- per-frame ---------- */
  update(dt0, ctlIn) {
    let dt = dt0;
    if (W.hitstop > 0) { W.hitstop -= dt0; dt = dt0 * 0.08; }
    dt *= this.ended ? W.slow : 1;
    this.time += dt; W.time += dt; this.introT = Math.max(0, this.introT - dt);
    const P = this.player;
    const c = this.attract ? this.aiControl(dt) : ctlIn;
    this.ctl = c;
    // route decision once past the fork wall
    if (this.forkWall && !this.route && P.s > this.def.forkAt + 3) { this.route = P.x < 0 ? 'A' : 'B'; UI.banner(this.route === 'A' ? 'ROUTE A' : 'ROUTE B', this.route === 'A' ? 'CANYON TUNNEL' : 'FOUNDRY ROW'); }
    if (this.route && P.s > 3470 && !this.merged) { this.merged = true; }
    this.runEvents();
    this.updateHint(dt, c);
    P.update(dt, c, this);
    for (const e of W.ents) {
      if (!e.alive || e === P) continue;
      if (e instanceof Wingman) e.update(dt, this);
      else if (e instanceof Enemy) { const ai = e.spec.ai; if (ai) ai(e, dt, this); if (e.alive) e.updateTransform(dt); e.syncBody(); e.syncMesh(); }
      else if (e instanceof Pickup) { e.update(dt, this); e.syncBody(); e.syncMesh(); }
      else if (e instanceof Boss) e.update(dt, this);
      if (e instanceof Wingman) e.syncMesh();
    }
    P.syncMesh(); P.mesh.quaternion.copy(P.tilt);
    Phys.step(dt);
    Bullets.update(dt);
    // cleanup
    for (let i = W.ents.length - 1; i >= 0; i--) {
      const e = W.ents[i];
      if (!e.alive && !(e instanceof RailPlayer)) { if (e instanceof Boss && e.dead && e.deathT < 6) { continue; } e.dispose(); W.ents.splice(i, 1); }
      else if (e instanceof Obstacle && e.rs - P.s < -80) { e.alive = false; }
    }
    FX.update(dt); Debris.update(dt);
    W.shake = Math.max(0, W.shake - dt * 2.2);
    if (W.flashWhite) W.flashWhite = Math.max(0, W.flashWhite - dt * 2);
    // ending logic
    if (this.ended) { this.endT += dt0; W.slow = Math.min(1, W.slow + dt0 * 0.3); if (this.endT > 7 && !this.completed) { this.completed = true; Game.stageComplete(this); } }
    if (P.dead && P.deadT > 2.6 && !this.deathHandled) { this.deathHandled = true; Game.playerDied(this); }
    if (this.attract && Game.attractTimeUp && Game.attractTimeUp()) { /* handled by game */ }
    // sky / shadow follow
    this.updateCamera(dt0, false);
    Gfx.followShadow(P.pos);
    UI.setBossBar(W.hudBoss); W.hudBoss = null;
    Dust.update(Gfx.camera.position, this.path.frame(P.s).t, P.speed);
  }
  updateHint(dt, c) {
    if (!this.hint) return;
    this.hintT += dt;
    if (this.hint.done(c, this.player) && this.hintT > 0.6) { this.hint = null; UI.clearHint(true); }
    else if (this.hintT > 11) { this.hint = null; UI.clearHint(false); }
  }
  updateCamera(dt, snap) {
    const P = this.player, cam = Gfx.camera;
    const intro = this.introT > 0 ? this.introT / 3.4 : 0;
    const back = 10.5 + (P.speedMul - 1) * 3 + intro * 18, up = 3.4 + intro * 4;
    const s = P.dead ? P.s : P.s - back;
    const desired = this.path.world(P.s - back, P.x * 0.6, P.y * 0.55 + up, this.tmp.set(0, 0, 0)).clone();
    const look = this.path.world(P.s + 28, P.x * 0.45, P.y * 0.4 + 0.6, new V3());
    if (snap || !this.camInit) { this.camPos.copy(desired); this.camLook.copy(look); this.camInit = true; }
    else { this.camPos.lerp(desired, 1 - Math.exp(-9 * dt)); this.camLook.lerp(look, 1 - Math.exp(-10 * dt)); }
    cam.position.copy(this.camPos);
    if (W.shake > 0) cam.position.add(this.camShake.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(W.shake * 0.55));
    this.path.frame(P.s); cam.up.copy(this.path.u);
    cam.lookAt(this.camLook);
    cam.rotateZ(-P.bankV * 0.09);
    const baseFov = Gfx.baseFov || 62, tf = baseFov + (P.boosting ? 10 : P.braking ? -5 : 0) + intro * 14 + W.shake * 3;
    cam.fov = damp(cam.fov, tf, 6, dt || 0.016); cam.updateProjectionMatrix();
    Gfx.updateSky(cam.position);
  }
  /** screen positions for reticles (near / far) */
  reticles() {
    const P = this.player, path = this.path;
    const a = path.world(P.s + 24, P.x, P.y, new V3()), b = path.world(P.s + 62, P.x, P.y, new V3());
    return [Gfx.project(a), Gfx.project(b)];
  }
  dispose() { Sfx.setEngine(false, 0); }
}
