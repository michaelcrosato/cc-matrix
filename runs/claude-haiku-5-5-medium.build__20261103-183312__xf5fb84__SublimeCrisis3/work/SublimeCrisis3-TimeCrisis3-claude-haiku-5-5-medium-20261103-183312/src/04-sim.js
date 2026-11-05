// 04-sim.js: Sim, the authoritative game state (plan 3.4, 4.2, 4.5). It holds the stage, the players, the enemies,
// threats, projectiles and pickups, and steps them from per-player commands. It never touches the DOM or Math.random.
// The presentation reads sim.state and drains sim.events every frame; a replica (AI Hub client) fills the same fields
// from the host's snapshots and never steps.
//
// A command: { aim: [ax, ay], fire, firePressed, cover, coverPressed, reload, next, prev, select, cont }.
//   fire / cover are held; the *Pressed flags are true on the step they went down.
//
// Phases of a stage: 'arrive' (the camera rides to the next area: WAIT) -> 'action' (ACTION!, waves, TIME) -> 'clear'
// (the time bonus) -> the next area, or 'boss' -> 'stageclear'. A wiped-out team is 'continue' (10 s) and then 'over'.
TC.ARRIVE = 2.2;      // seconds to ride to a new area
TC.CLEAR_T = 1.2;     // seconds of the clear bonus
TC.CONT_T = 10;       // the CONTINUE? countdown
TC.EYE_STAND = 24;    // eye height, standing (u)
TC.EYE_COVER = 12;    // eye height, in cover (u)
TC.SLOT_GAP = 30;     // lateral spacing of the player slots (u)

TC.Sim = class Sim {
  constructor(o = {}) {
    this.o = o;
    this.seed = (o.seed || 1) >>> 0;
    this.diff = TC.DIFF[o.difficulty || 'Normal'];
    this.difficulty = o.difficulty || 'Normal';
    this.mode = o.mode || 'stage';
    this.stageId = o.stage || 1;
    this.stage = TC.get('stage', this.stageId);
    this.rngs = {};
    this.t = 0;
    this.phase = 'arrive';
    this.phaseT = 0;
    this.sceneIdx = o.sceneIndex || 0;
    this.events = [];
    this.frozen = false;
    this.over = false;
    this.cheats = Object.assign({ god: false, ammo: false, freeze: false, oneHit: false }, o.cheats || {});
    this.autoFire = o.autoFire !== false;
    this.enemies = [];
    this.threats = [];
    this.projectiles = [];
    this.pickups = [];
    this.bonus = [];          // bottles and rings: shootable, floating
    this.boss = null;
    this.nextId = 1;
    this.sceneStats = { kills: 0, pops: 0 };
    this.intel = [];
    this.result = null;
    this.prevBase = null;
    this.waveIdx = 0;
    this.waveQueue = [];
    this.clearing = false;
    // The world: the stage's boxes (solid or not) and the scene list.
    this.nPlayers = Math.max(1, Math.min(4, o.players ? o.players.length : 1));
    this.world = TC.buildStage(this, this.stage);
    this.scene = this.world.scenes[this.sceneIdx];
    this.base = this.scene.base;
    this.players = [];
    const n = this.nPlayers;
    for (let i = 0; i < n; i++) this.players.push(this.makePlayer(i, n, o.players ? o.players[i] || {} : {}, o.carry ? o.carry[i] : null));
    this.enterScene(this.sceneIdx, true);
  }

  // Lives at the start of a run: the dev slider when it is set (1 to 9), else the difficulty's.
  startLives() { return TC.tune.player.lives || this.diff.lives; }

  // A stream of random numbers for one purpose; never Math.random.
  rng(name) {
    if (!this.rngs[name]) this.rngs[name] = TC.stream(this.seed, name);
    return this.rngs[name];
  }
  id() { return this.nextId++; }
  emit(type, data) { this.events.push(Object.assign({}, data || {}, { type, t: +this.t.toFixed(4) })); }
  drain() { const e = this.events; this.events = []; return e; }

  makePlayer(i, n, meta, carry) {
    const y = (i - (n - 1) / 2) * TC.SLOT_GAP;
    const p = {
      id: i, name: meta.name || ('P' + (i + 1)), color: meta.color || '#e8443a', agent: meta.agent || 'kai',
      slotY: 0, x: 0, y: 0, z: TC.EYE_STAND, c: 0, want: false, aim: [0, 0],
      wpn: 0, mag: 9, pool: { mg: 0, shotgun: 0, gl: 0 }, owned: { handgun: true, mg: false, shotgun: false, gl: false },
      reloadT: -1, switchT: 0, shotT: 0, bloom: 0, recoil: 0, invul: 0, lives: this.startLives(), score: 0, chain: 0,
      bestChain: 0, mult: 1, continues: 0, out: false, outT: 0, dead: false, lastFire: false, hit: 0, flash: 0,
      stats: { shots: 0, hits: 0, headshots: 0, kills: 0, quick: 0, saves: 0, lost: 0, civ: 0 },
      wasIn: false,
    };
    p.slotY = y;
    p.x = this.base || 0;
    if (carry) {
      p.lives = carry.lives; p.score = carry.score; p.continues = carry.continues || 0;
      p.pool = Object.assign(p.pool, carry.pool || {}); p.owned = Object.assign(p.owned, carry.owned || {});
      p.stats = Object.assign(p.stats, carry.stats || {}); p.bestChain = carry.bestChain || 0; p.intel = carry.intel || [];
    }
    return p;
  }

  // The poses. A stand pose is at the slot, looking east (yaw 0); the cover pose is lower and a step back.
  standPose(p) { return [this.base, p.slotY, TC.EYE_STAND]; }
  coverPose(p) { return [this.base - 6, p.slotY, TC.EYE_COVER]; }
  // The logical camera for a player: pose blended by cover c.
  camFor(p) {
    const s = this.standPose(p), c = this.coverPose(p), k = TC.smooth(p.c);
    return { x: TC.lerp(s[0], c[0], k), y: TC.lerp(s[1], c[1], k), z: TC.lerp(s[2], c[2], k), yaw: 0, pitch: 0,
      fov: TC.tune.view.fov, roll: Math.sin(Math.PI * p.c) * 2 * Math.PI / 180 };
  }
  exposed(p) { return p.c < 0.5; }
  // What a player can fire: 'handgun' always, the specials when they have ammo.
  available(p) { return TC.WEAPON_ORDER.filter(w => w === 'handgun' || p.owned[w]); }
  weaponId(p) { return TC.WEAPON_ORDER[p.wpn]; }
  ammoOf(p, w) { return w === 'handgun' ? p.mag : p.pool[w] || 0; }

  // Enter a scene: its base moves the rail, the nests and walls are already in the world.
  enterScene(idx, first) {
    this.sceneIdx = idx;
    this.scene = this.world.scenes[idx];
    this.prevBase = first ? this.scene.base : this.base;
    this.base = this.scene.base;
    this.placeSlots();
    this.ride = this.scene.ride ? { to: this.base + this.scene.ride.dx, speed: this.scene.ride.speed, started: false, done: false } : null;
    this.timeMax = this.scene.time * this.diff.time * TC.tune.time.sceneMul;
    this.timer = this.timeMax;
    this.phase = 'arrive';
    this.phaseT = 0;
    this.enemies = [];
    this.threats = [];
    this.projectiles = [];
    this.bonus = [];
    this.waveQueue = this.scene.waves.map(w => Object.assign({}, w, { spawned: false }));
    this.waveIdx = 0;
    this.clearing = false;
    this.emit('scene', { index: idx, id: this.scene.id, title: this.scene.title, base: this.base, prev: this.prevBase });
    for (const p of this.players) {
      p.x = this.base; p.c = 0; p.want = false;
    }
    this.placeBonus();
  }

  // Restart the current area after a wiped-out team's continue: its waves start again, the score kept as it is.
  restartScene() {
    for (const p of this.players) { p.out = false; p.dead = false; p.outT = 0; p.lives = this.startLives(); }
    this.enterScene(this.sceneIdx, false);
    this.emit('restart', { scene: this.scene.id });
  }

  // The per-step driver. cmds[i] is player i's command (missing = nothing held).
  step(dt, cmds = []) {
    if (this.over || this.frozen) return;
    this.t += dt;
    this.phaseT += dt;
    for (const p of this.players) {
      if (p.dead) continue;
      this.playerStep(p, dt, cmds[p.id] || {});
    }
    this.phaseStep(dt);
    this.enemiesStep(dt);
    this.threatsStep(dt);
    this.projectilesStep(dt);
    this.pickupsStep(dt);
    if (this.boss) this.bossStep(dt);
    this.timeStep(dt);
  }

  playerStep(p, dt, cmd) {
    if (p.out) {
      // Out of lives: the CONTINUE? count runs down; a press of fire or cover rejoins (plan 4.5).
      if (!p.dead) p.outT -= dt;
      if ((cmd.firePressed || cmd.coverPressed) && p.outT > 0) {
        // The whole team out: a continue restarts the area. Otherwise this player rejoins on their own half.
        if (this.players.every(q => q.out)) this.continueAll(p);
        else this.rejoin(p);
      }
      if (p.outT <= 0 && !p.dead) { p.dead = true; this.emit('dead', { player: p.id }); }
      return;
    }
    p.invul = Math.max(0, p.invul - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.bloom = Math.max(0, p.bloom - 6 * dt);
    p.recoil = Math.max(0, p.recoil - 6 * dt);
    p.shotT = Math.max(0, p.shotT - dt);
    p.switchT = Math.max(0, p.switchT - dt);
    // Aim: the reticle position in view units, kept on screen.
    if (cmd.aim) p.aim = [TC.clamp(cmd.aim[0], -1.6, 1.6), TC.clamp(cmd.aim[1], -1, 1)];
    // Cover: the blend moves toward the held state, in coverIn / coverOut seconds for the full move.
    const wantIn = !!cmd.cover;
    if (wantIn !== p.want) {
      p.want = wantIn;
      // Pop-out protection: a threat that would land within 0.15 s of leaving cover lands 0.15 s later.
      if (!wantIn) this.protectPopOut(p);
    }
    const target = p.want ? 1 : 0;
    const full = p.want ? TC.tune.player.coverIn : TC.tune.player.coverOut;
    const dir = target - p.c, step = dt / full;
    p.c = Math.abs(dir) <= step ? target : p.c + Math.sign(dir) * step;
    const inCover = p.c >= 0.5;
    if (inCover !== p.wasIn) {
      p.wasIn = inCover;
      this.emit(inCover ? 'cover-in' : 'cover-out', { player: p.id });
    }
    // Weapon cycle and number keys.
    if (cmd.next || cmd.prev || cmd.select) {
      const avail = this.available(p);
      let idx = p.wpn;
      if (cmd.select) {
        const want = TC.WEAPON_ORDER[cmd.select - 1];
        if (want && avail.includes(want)) idx = TC.WEAPON_ORDER.indexOf(want);
      } else {
        const cur = avail.indexOf(this.weaponId(p));
        const step = cmd.next ? 1 : -1;
        const nxt = avail[(cur + step + avail.length) % avail.length];
        idx = TC.WEAPON_ORDER.indexOf(nxt);
      }
      if (idx !== p.wpn) this.switchTo(p, idx);
    }
    // Weapon cycle while hidden: a fire press in cover cycles the weapons with ammo, for a trigger-only player.
    if (inCover && cmd.firePressed && !cmd.reload) {
      const avail = this.available(p);
      if (avail.length > 1) {
        const cur = avail.indexOf(this.weaponId(p));
        const nxt = avail[(cur + 1) % avail.length];
        this.switchTo(p, TC.WEAPON_ORDER.indexOf(nxt));
      }
    }
    // Reload: only in cover, the handgun's magazine.
    const w = TC.get('weapon', this.weaponId(p));
    if (inCover && (cmd.reload || (p.mag <= 0 && w.id === 'handgun' && cmd.fire)) && p.mag < w.mag && p.reloadT < 0) {
      p.reloadT = 0;
      this.emit('reload', { player: p.id });
    }
    if (p.reloadT >= 0) {
      if (!inCover) { p.reloadT = -1; }
      else {
        p.reloadT += dt;
        if (p.reloadT >= w.reloadCover * (TC.tune.player.reload / 0.30)) {
          p.mag = w.mag;
          p.reloadT = -1;
          this.emit('reloaded', { player: p.id });
        }
      }
    }
    // Empty specials: fall back to the handgun.
    if (w.id !== 'handgun' && this.ammoOf(p, w.id) <= 0) this.switchTo(p, 0);
    // Shooting. Not while the cover blend is high (c > 0.2), not while switching or reloading.
    const cur = TC.get('weapon', this.weaponId(p));
    const canFire = p.c <= 0.2 && p.reloadT < 0 && p.switchT <= 0 && this.phase !== 'continue';
    if (canFire && cmd.firePressed) this.tryFire(p, cur, true);
    else if (canFire && cmd.fire) {
      // Held: the machine gun fires on its own rate; the handgun auto-repeats when Hold-to-fire is on.
      if (cur.auto || (cur.id === 'handgun' && this.autoFire)) this.tryFire(p, cur, false);
    }
  }

  switchTo(p, idx) {
    if (idx === p.wpn) return;
    p.wpn = idx;
    const w = TC.get('weapon', TC.WEAPON_ORDER[idx]);
    p.switchT = w.switchT;
    p.reloadT = -1;
    this.emit('switch', { player: p.id, weapon: w.id });
  }

  // One player rejoins while the others play on: lives back, the score starts again from zero (the continue mark).
  rejoin(p) {
    p.out = false; p.dead = false; p.lives = this.startLives(); p.score = 0; p.continues++; p.outT = 0;
    this.emit('rejoin', { player: p.id });
  }

  // The whole team continues: every player's lives back, the scores reset, and the area starts again.
  continueAll(p) {
    for (const q of this.players) { q.continues++; q.score = 0; }
    this.emit('continue', { player: p.id });
    this.restartScene();
  }

  // The fire model, per weapon (plan 4.4). Hitscan rays from the logical camera; pellets for the shotgun; a projectile
  // for the grenade launcher.
  tryFire(p, w, pressed) {
    const id = w.id;
    if (p.shotT > 0) return;
    if (id === 'handgun') {
      if (p.mag <= 0) { if (pressed) this.emit('empty', { player: p.id }); return; }
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.mag--;
      p.shotT = 1 / (pressed ? w.rate : w.autoRate);
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.fireRays(p, w, 1, 0, w.damage(), 'handgun');
    } else if (id === 'mg') {
      if (this.ammoOf(p, 'mg') <= 0) return;
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.pool.mg--;
      p.shotT = 1 / w.rate();
      p.bloom = Math.min(3, p.bloom + 0.25);
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.fireRays(p, w, 1, p.bloom, w.damage(), 'mg');
    } else if (id === 'shotgun') {
      if (this.ammoOf(p, 'shotgun') <= 0) return;
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.pool.shotgun--;
      p.shotT = 1 / w.rate;
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.fireRays(p, w, w.pellets(), w.spread(), w.damage, 'shotgun');
    } else if (id === 'gl') {
      if (this.ammoOf(p, 'gl') <= 0) return;
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.pool.gl--;
      p.shotT = 1 / w.rate;
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.launchGrenade(p, w);
    }
    p.stats.shots++;
    this.emit('shot', { player: p.id, weapon: id });
  }

  // Ray directions for a shot: the aim (view units), with spread in degrees, from a stream of this player's own.
  aimDirs(p, n, spreadDeg) {
    const cam = this.camFor(p);
    const out = [];
    const rs = this.rng('p' + p.id + '.spread');
    for (let i = 0; i < n; i++) {
      let ax = p.aim[0], ay = p.aim[1];
      if (spreadDeg > 0) {
        const r = (spreadDeg * Math.PI / 180) * Math.sqrt(rs());
        const a = rs() * Math.PI * 2;
        const t = Math.tan((cam.fov * Math.PI / 180) / 2);
        ax += Math.cos(a) * r / t * (16 / 9) * 0.5;
        ay += Math.sin(a) * r / t * 0.5;
      }
      out.push(TC.aimRay(cam, ax, ay));
    }
    return out;
  }

  fireRays(p, w, n, spreadDeg, dmg, kind) {
    const cam = this.camFor(p);
    const o = [cam.x, cam.y, cam.z];
    const dirs = this.aimDirs(p, n, kind === 'mg' ? spreadDeg : spreadDeg);
    let anyHit = false;
    const muzzle = [o[0] + 4, o[1] + 0, o[2] - 4];
    for (const d of dirs) {
      const hit = this.traceShot(p, o, d, dmg, kind);
      if (hit) anyHit = true;
    }
    this.emit('flare', { player: p.id, from: muzzle, weapon: kind });
    if (!anyHit) {
      // A miss resets the chain (plan 4.5).
      if (p.chain > 0) p.chain = 0; p.mult = 1;
      this.emit('miss', { player: p.id, from: muzzle, dir: dirs[0] });
    }
  }

  // The nearest of everything along a ray: enemies (head and body), solid boxes, breakables, bonus pickups, shootable
  // projectiles, boss parts. Applies the result. Returns true when something a shot can score on was hit.
  traceShot(p, o, d, dmg, kind) {
    let best = { t: Infinity };
    const consider = (t, what) => { if (t >= 0 && t < best.t) best = Object.assign({ t }, what); };
    // An enemy that has stepped out to fire leans past its own nest wall: that wall does not hide it.
    const leaning = new Set(this.enemies.filter(e => e.alive && e.exposed && e.nest).map(e => e.nest));
    for (const b of this.world.boxes) {
      if (!b.solid) continue;
      if (b.nest && leaning.has(b.nest)) continue;
      const t = TC.rayBox(o, d, b.b);
      if (t >= 0) consider(t, { kind: 'box', box: b });
    }
    for (const e of this.enemies) {
      if (!e.alive || !e.exposed) continue;
      for (const v of this.hitVolumes(e)) {
        const t = TC.rayBox(o, d, v.b);
        if (t >= 0) consider(t, { kind: 'enemy', enemy: e, part: v.part });
      }
    }
    for (const q of this.bonus) {
      if (q.gone) continue;
      const t = TC.raySphere(o, d, [q.x, q.y, q.z], q.r);
      if (t >= 0) consider(t, { kind: 'bonus', item: q });
    }
    for (const pr of this.projectiles) {
      if (pr.gone || pr.noShoot) continue;
      const t = TC.raySphere(o, d, [pr.x, pr.y, pr.z], pr.r);
      if (t >= 0) consider(t, { kind: 'projectile', item: pr });
    }
    if (this.boss) this.bossVolumes(best, consider, o, d);
    for (const b of this.world.barrels || []) {
      if (b.gone) continue;
      const t = TC.rayBox(o, d, b.b);
      if (t >= 0) consider(t, { kind: 'barrel', item: b });
    }
    if (best.kind === undefined) {
      // Only the ground (or nothing) in the way: a miss.
      return false;
    }
    if (best.t > 1e6) return false;
    const at = [o[0] + d[0] * best.t, o[1] + d[1] * best.t, o[2] + d[2] * best.t];
    switch (best.kind) {
      case 'box': {
        const box = best.box;
        if (box.hp > 0) {
          box.hp -= dmg;
          if (box.hp <= 0) { this.breakBox(box, at, p); return true; }
        }
        this.emit('impact', { at, surface: box.mat, player: p.id });
        return false;
      }
      case 'enemy': {
        const e = best.enemy;
        if (best.part === 'hostage') {
          p.stats.hits++;
          this.hitCivilian(e, p, at, true);
          return true;
        }
        const head = best.part === 'head';
        this.damageEnemy(e, p, dmg * (head ? 2 : 1), head, at, kind, o, d);
        return true;
      }
      case 'bonus': {
        this.collectBonus(best.item, p, at);
        return true;
      }
      case 'projectile': {
        this.shootDown(best.item, p, at);
        return true;
      }
      case 'boss': {
        this.damageBoss(best.part, p, dmg, at);
        return true;
      }
      case 'barrel': {
        this.detonateBarrel(best.item, p);
        return true;
      }
      default: return false;
    }
  }

  // Hit volumes of a live enemy, from its position (a head and a body box). Crouched enemies in cover are not in
  // this list (they are not exposed).
  hitVolumes(e) {
    const s = e.size || 1;
    const x = e.x, y = e.y, z = e.z || 0;
    const head = { part: 'head', b: [x - 3.2 * s, y - 3.2 * s, z + 22 * s, x + 3.2 * s, y + 3.2 * s, z + 29 * s] };
    if (e.def && e.def.headOnly) {
      // The captor's hostage stands beside it: a shot at the hostage costs a life (plan 5.3).
      return [head, { part: 'hostage', b: [x + 8 * s - 3 * s, y - 3 * s, z, x + 8 * s + 3 * s, y + 3 * s, z + 20 * s] }];
    }
    return [head, { part: 'body', b: [x - 5 * s, y - 5 * s, z, x + 5 * s, y + 5 * s, z + 22 * s] }];
  }

  // Score and chain (plan 4.5).
  addScore(p, pts, at) {
    if (!pts) return;
    p.score += Math.round(pts * p.mult);
    this.emit('score', { player: p.id, pts: Math.round(pts * p.mult), at });
  }
  bumpChain(p) {
    p.chain++;
    p.bestChain = Math.max(p.bestChain, p.chain);
    p.mult = Math.min(2, 1 + Math.floor(p.chain / 5) * 0.1);
  }

  damageEnemy(e, p, dmg, head, at, kind, o, d) {
    const def = TC.get('enemy', e.type);
    p.stats.hits++;
    this.bumpChain(p);
    if (def.role === 'civilian') {
      this.hitCivilian(e, p, at);
      return;
    }
    e.hp -= dmg;
    e.lastHitBy = p.id;
    e.hurtT = 0.25;
    e.hitHead = head || e.hitHead;
    this.emit('hit', { player: p.id, enemy: e.id, head, at, dmg });
    this.addScore(p, 100, at);
    if (e.hp <= 0) {
      this.killEnemy(e, p, head, at, o, d);
    }
  }

  killEnemy(e, p, head, at, o, d) {
    const def = TC.get('enemy', e.type);
    e.alive = false; e.dead = true; e.deathT = 0; e.deathWhy = head ? 'head' : (e.hitKind || 'body');
    p.stats.kills++;
    let pts = def.score;
    if (head) { pts += 500; p.stats.headshots++; }
    const quick = e.exposedAt !== undefined && (this.t - e.exposedAt) <= 0.7;
    if (quick) { pts += 500; p.stats.quick++; }
    this.addScore(p, pts, at);
    if (def.elite) {
      const add = TC.tune.time.eliteBonus;
      if (this.phase === 'action' || this.phase === 'boss') this.timer += add;
      this.emit('timeExtend', { player: p.id, s: add });
    }
    if (def.drop) this.dropAmmo(e, p, at);
    // A jet-ski's fuel tank goes up with the rider: a bonus for the shooter and an area blast (plan 5.3).
    if (def.ski) { this.addScore(p, 1000, at); this.explode(e.x, e.y, 6, 40, 8, p); }
    this.emit('kill', { player: p.id, enemy: e.id, etype: e.type, head, at, quick });
  }

  // A civilian (or a hostage) is hit: the penalty is the same. A captor's hostage is hit alive: the captor stays.
  hitCivilian(e, p, at, hostage = false) {
    if (!hostage) { e.hp = 0; e.alive = false; e.dead = true; e.deathT = 0; e.deathWhy = 'civ'; }
    p.stats.civ++;
    this.addScore(p, -5000, at);
    this.loseLife(p, hostage ? 'hostage' : 'civilian', true);
    this.emit('civilian', { player: p.id, at, hostage });
  }

  // Quartermasters drop ammo for the killer: a random special, at once (plan 4.8).
  dropAmmo(e, p, at) {
    const pick = this.rng('drop').pick(['mg', 'shotgun', 'gl']);
    const w = TC.get('weapon', pick);
    const n = Math.round(w.pickup * TC.tune.weapon.ammoMul);
    const first = !p.owned[pick];
    p.owned[pick] = true;
    p.pool[pick] = Math.min(w.pool, (p.pool[pick] || 0) + n);
    this.emit('pickup', { player: p.id, kind: 'ammo', weapon: pick, n, at, first });
  }

  shootDown(pr, p, at) {
    pr.gone = true;
    p.stats.hits++;
    this.bumpChain(p);
    this.addScore(p, 1000, at);
    if (pr.kind === 'grenade') {
      this.explode(pr.x, pr.y, pr.z, 48, 6, 'enemy', p);
      const th = this.threats.find(t => t.pr === pr);
      if (th) { th.resolved = true; th.blown = true; this.emit('threatDown', { id: th.id, player: p.id }); }
    }
    this.emit('shootdown', { kind: pr.kind, at, player: p.id });
  }

  collectBonus(q, p, at) {
    q.gone = true;
    p.stats.hits++;
    this.bumpChain(p);
    if (q.kind === 'ring') {
      if (p.lives < 9) p.lives++;
      this.emit('pickup', { player: p.id, kind: 'ring', at });
      this.addScore(p, 2000, at);
    } else if (q.kind === 'bottle') {
      this.addScore(p, 2000, at);
      this.intel.push(q.intel);
      this.emit('pickup', { player: p.id, kind: 'intel', intel: q.intel, at });
    }
  }

  // Lose a life. An invulnerable player only loses it to a civilian or to TIME (ignoreInvul).
  loseLife(p, why, ignoreInvul) {
    if (!ignoreInvul && (p.invul > 0 || this.cheats.god || TC.tune.player.godMode)) return false;
    if (this.cheats.god || (TC.tune.player.godMode && !ignoreInvul)) return false;
    p.lives--;
    p.stats.lost++;
    p.chain = 0; p.mult = 1;
    p.invul = TC.tune.player.iframes;
    p.hit = 0.6;
    this.emit('lifeLost', { player: p.id, why, lives: p.lives });
    if (p.lives <= 0) this.playerOut(p);
    return true;
  }

  playerOut(p) {
    p.out = true;
    p.outT = TC.CONT_T;
    p.c = 0; p.want = false; p.reloadT = -1;
    this.emit('out', { player: p.id });
    if (this.players.every(q => q.out)) this.enterContinue();
  }

  enterContinue() {
    this.phase = 'continue';
    this.phaseT = 0;
    for (const p of this.players) if (p.out) { p.outT = TC.CONT_T; p.dead = false; }
    this.emit('phase', { phase: 'continue' });
  }

  // TIME (plan 4.5): counts only in action and boss fights. At zero, TIDE'S IN!, a life each, refill.
  timeStep(dt) {
    if (TC.tune.time.freeze || this.cheats.freeze) return;
    if (this.phase !== 'action' && this.phase !== 'boss') return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.timeMax * TC.tune.time.refill;
      this.emit('timeup', { t: this.t });
      for (const p of this.players) if (!p.out) this.loseLife(p, 'tide', true);
    }
  }

  // The scene director: arrival, ACTION, waves, clear, boss, stage clear.
  phaseStep(dt) {
    if (this.phase === 'continue') {
      // The CONTINUE? countdown: the sim is still, every out player can rejoin with a press.
      const allOut = this.players.every(p => p.out);
      if (allOut) {
        const left = TC.CONT_T - this.phaseT;
        if (left <= 0) this.gameOver();
      } else {
        this.phase = 'action';
        this.phaseT = 0;
      }
      return;
    }
    if (this.phase === 'arrive') {
      if (this.phaseT >= TC.ARRIVE) {
        this.phase = 'action';
        this.phaseT = 0;
        this.emit('phase', { phase: 'action' });
        this.startWaves();
      }
      return;
    }
    if (this.phase === 'action') {
      this.updateWaves();
      this.rideStep(dt);
      return;
    }
    if (this.phase === 'clear') {
      if (this.phaseT >= TC.CLEAR_T && !this.clearing) {
        this.clearing = true;
        this.advanceAfterClear();
      }
      return;
    }
    if (this.phase === 'boss') {
      if (this.boss && this.boss.defeated) {
        this.phase = 'outro';
        this.phaseT = 0;
        this.emit('phase', { phase: 'outro' });
      }
      return;
    }
    if (this.phase === 'outro') {
      if (this.phaseT >= 2) this.stageClear();
    }
  }

  startWaves() {
    this.waveIdx = 0;
    this.spawnedScene = true;
    this.emit('actionStart', { scene: this.scene.id });
    this.spawnPending();
  }

  // Waves: 'start' spawn at ACTION, 'clear' spawn when the field is clear, { t } at a time into the action.
  updateWaves() {
    const actionT = this.phaseT;
    // The field is clear when no combatant is alive: civilians walk on and never count (plan 4.10).
    const alive = () => this.enemies.filter(e => e.alive && e.role !== 'boss' && e.role !== 'civilian').length;
    for (let i = this.waveIdx; i < this.waveQueue.length; i++) {
      const wv = this.waveQueue[i];
      if (wv.spawned) continue;
      let go = false;
      if (wv.when === 'start') go = i === 0 || this.waveDone(i - 1);
      else if (wv.when === 'clear') go = alive() === 0;
      else if (wv.when && wv.when.t !== undefined) go = actionT >= wv.when.t;
      if (go) {
        wv.spawned = true;
        this.waveIdx = i;
        for (const [type, nest, extra] of wv.spawn) this.spawn(type, nest, extra || {});
        this.emit('wave', { index: i, n: wv.spawn.length });
      }
    }
    const done = this.waveQueue.every(w => w.spawned) && alive() === 0 && this.threats.every(t => t.resolved) && (!this.ride || this.ride.done);
    if (!done) return;
    if (this.scene.boss) { if (!this.boss) this.startBoss(this.scene.boss); }
    else this.toClear();
  }
  waveDone(i) { const w = this.waveQueue[i]; return !!w && w.spawned === true && this.enemies.filter(e => e.wave === i && e.alive).length === 0; }
  spawnPending() {
    // A 'start' wave spawns at ACTION; the rest wait for their trigger.
    this.updateWaves();
  }

  toClear() {
    this.phase = 'clear';
    this.phaseT = 0;
    this.clearing = false;
    // The time bonus: remaining seconds x 100, per player who is still in.
    const secs = Math.max(0, Math.floor(this.timer));
    const bonus = secs * 100;
    for (const p of this.players) if (!p.out) this.addScore(p, bonus, null);
    this.emit('clear', { seconds: secs, bonus });
  }

  advanceAfterClear() {
    if (this.sceneIdx + 1 < this.world.scenes.length && !this.scene.final) {
      this.enterScene(this.sceneIdx + 1, false);
      this.emit('phase', { phase: 'arrive' });
    } else {
      this.stageClear();
    }
  }

  gameOver() {
    this.over = true;
    this.result = this.makeResult(false);
    this.emit('gameover', { result: this.result });
  }
  stageClear() {
    this.over = true;
    this.result = this.makeResult(true);
    this.emit('stageclear', { result: this.result });
  }

  // The results of a stage (plan 4.5): stats, accuracy, the ranks, and the no-damage bonus.
  makeResult(won) {
    const rows = this.players.map(p => {
      const s = p.stats;
      const acc = s.shots ? Math.round(100 * s.hits / s.shots) : 0;
      let rank = 'C';
      if (p.continues > 0) rank = 'D';
      else if (acc >= 75 && s.lost === 0) rank = 'S';
      else if (acc >= 60 && s.lost <= 1) rank = 'A';
      else if (acc >= 45) rank = 'B';
      const accBonus = acc * 300;
      const noDamage = s.lost === 0 && won ? 20000 : 0;
      return { id: p.id, name: p.name, score: p.score, rank, acc, shots: s.shots, hits: s.hits, kills: s.kills,
        headshots: s.headshots, quick: s.quick, saves: s.saves, lost: s.lost, civ: s.civ, bestChain: p.bestChain,
        continues: p.continues, accBonus, noDamage, total: p.score + accBonus + noDamage, time: Math.round(this.t) };
    });
    return { won, stage: this.stageId, difficulty: this.difficulty, rows, intel: this.intel.slice(), time: this.t,
      boss: !!(this.boss && this.boss.defeated) };
  }

  // Carry state for the next stage of an ARCADE run.
  carryOut() {
    return this.players.map(p => ({ lives: p.lives, score: p.score, continues: p.continues, pool: Object.assign({}, p.pool),
      owned: Object.assign({}, p.owned), stats: Object.assign({}, p.stats), bestChain: p.bestChain, intel: this.intel.slice() }));
  }

  // The protection for leaving cover: a threat that would land within 0.15 s is moved later.
  protectPopOut(p) {
    for (const th of this.threats) {
      if (th.resolved || th.target !== p.id) continue;
      if (th.impactAt - this.t < 0.15) th.impactAt += 0.15;
    }
  }

  // A snapshot of the state a presentation or a replica reads (plain data, no engine objects).
  snapshot() {
    return {
      t: this.t, phase: this.phase, phaseT: this.phaseT, scene: this.scene.id, sceneIdx: this.sceneIdx,
      base: this.base, timer: this.timer, timeMax: this.timeMax, stage: this.stageId, over: this.over,
      players: this.players.map(p => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.slotY, c: p.c,
        aim: p.aim, wpn: this.weaponId(p), mag: p.mag, pool: Object.assign({}, p.pool), owned: Object.assign({}, p.owned),
        lives: p.lives, score: p.score, chain: p.chain, mult: p.mult, out: p.out, outT: p.outT, invul: p.invul,
        reloadT: p.reloadT, stats: Object.assign({}, p.stats), continues: p.continues })),
      enemies: this.enemies.filter(e => !e.gone).map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, z: e.z,
        facing: e.facing, state: e.state, hp: e.hp, alive: e.alive, exposed: e.exposed, size: e.size })),
      threats: this.threats.filter(t => !t.resolved).map(t => ({ id: t.id, src: t.src, target: t.target,
        muzzle: t.muzzle, impactAt: t.impactAt, t0: t.t0, kind: t.kind })),
      projectiles: this.projectiles.filter(q => !q.gone).map(q => ({ id: q.id, kind: q.kind, x: q.x, y: q.y, z: q.z })),
      bonus: this.bonus.filter(q => !q.gone).map(q => ({ id: q.id, kind: q.kind, x: q.x, y: q.y, z: q.z })),
      boss: this.boss ? this.bossSnap() : null,
      intel: this.intel.slice(),
    };
  }
};
