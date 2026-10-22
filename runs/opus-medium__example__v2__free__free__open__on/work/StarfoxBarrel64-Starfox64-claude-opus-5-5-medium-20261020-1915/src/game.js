// Mission runtime: loading, events, collisions, scoring, cameras, cutscenes, AI pilot.
import { THREE, gfx, toon, glow, geo, mesh } from './gfx.js';
import * as M from './models.js';
import { physics, G } from './physics.js';
import { fx } from './fx.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { settings, DIFFICULTY, clamp, damp, lerp, rand, pick } from './config.js';
import { Rail, circleRail } from './rail.js';
import { MISSIONS, CAST, WINGMEN } from './levels.js';
import { buildPlanetWorld, buildSpaceWorld } from './world.js';
import { Player } from './player.js';
import { Enemy, RailEnemy, Turret, Mine, Supply, Obstacle, Dogfighter, Wingman, Item, Projectiles, StriderBoss, CarrierBoss } from './entities.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = V(), tv2 = V(), tq = new THREE.Quaternion(), tm = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const smooth = (t) => t * t * (3 - 2 * t);
const HIT_VALUE = { dart: 1, bat: 1, bomber: 3 };

export class Game {
  constructor(ui) {
    this.ui = ui;
    this.settings = settings;
    this.player = new Player(this);
    this.proj = new Projectiles(this);
    this.time = 0; this.state = 'idle';
    this.camPos = V(); this.camLook = V(); this.camUp = V(0, 1, 0);
    this.shakeAmt = 0; this.timeScale = 1;
    this.newRun();
  }
  newRun() {
    this.team = { hopper: { hp: 100 }, brock: { hp: 100 }, nova: { hp: 100 } };
    this.run = { totalHits: 0, missionResults: [] };
    this.player.lives = 3; this.player.laser = 0;
  }
  get diff() { return this.attract ? DIFFICULTY[1] : DIFFICULTY[settings.difficulty]; }
  panOf(p) { if (!gfx.camera) return 0; tv2.copy(p).applyMatrix4(gfx.camera.matrixWorldInverse); return clamp(tv2.x / 60, -1, 1); }

  // =================================================================
  // loading
  // =================================================================
  unload() {
    if (this.root) {
      this.clearEntities();
      gfx.scene.remove(this.root); gfx.scene.remove(this.worldRoot);
    }
    fx.clear && fx.root && fx.clear();
    audio.engineStop(); audio.chargeStop();
    this.state = 'idle';
  }
  loadMission(index, o = {}) {
    this.unload();
    const m = MISSIONS[index];
    this.mi = index; this.m = m; this.mode = m.mode; this.attract = !!o.attract; this.cheat = !!o.attract;
    physics.reset(m.mode === 'rail' ? -30 : 0);
    this.worldRoot = new THREE.Group(); this.root = new THREE.Group();
    gfx.scene.add(this.worldRoot); gfx.scene.add(this.root);
    fx.attach(this.worldRoot);
    this.enemies = []; this.items = []; this.arches = []; this.checkpoints = []; this.wingmen = []; this.shockwaves = [];
    this.boss = null; this.radioQ = []; this.radioCur = null; this.radioLog = new Map();
    this.stats = { spawned: 0, shots: 0, shotsHit: 0, deflects: 0, rolls: 0, loops: 0, uturns: 0, charges: 0, bombs: 0, items: 0, damageTaken: 0, multiBonus: 0 };
    this.hits = 0; this.archesPassed = new Set(); this.firedEvents = new Set(); this.hintShown = new Set();
    this.time = 0; this.missionTime = 0; this.timeScale = 1; this.forcedSpeed = 0; this.noGround = false;
    this.player.attach(this.worldRoot);
    this.player.bombs = 3; this.player.resetStats();
    if (m.mode === 'rail') {
      this.rails = {}; for (const k in m.routes) this.rails[k] = new Rail(m.routes[k]);
      this.route = m.defaultRoute; this.rail = this.rails[this.route];
      this.bossRail = circleRail(this.rail.p1, this.rail.t1, m.bossRadius);
      buildPlanetWorld(this.worldRoot, m, this.rails, this.bossRail);
      this.checkpoint = { s: 0, hits: 0 };
      this.medal = this.estimateMedal();
    } else {
      this.arena = m.arena;
      buildSpaceWorld(this.worldRoot, m);
      this.step = -1; this.stepT = 0; this.aces = [];
      this.medal = 85;
    }
    this.placeStatics(0);
    this.spawnWingmen();
    this.state = 'intro'; this.stateT = 0;
    if (m.mode === 'rail') this.player.spawn('rail', { s: 0, ox: 0, oy: 0, invuln: 0 });
    else this.player.spawn('allrange', { pos: V(0, 0, 1400), dir: V(0, 0, -1), invuln: 0 });
    this.player.control = false;
    audio.engineStart();
    audio.playMusic(m.music);
    this.ui.missionCard(m);
    if (o.jump) this.jumpTo(o.jump);
    this.snapCamera();
  }
  estimateMedal() {
    const m = this.m;
    let total = 0;
    for (const e of m.events) if (e.a === 'spawn' && (!e.route || e.route === m.defaultRoute)) total += (e.n || 1) * (HIT_VALUE[e.e] || 1);
    for (const s of m.statics) if (!s.route || s.route === m.defaultRoute) { if (/urret/.test(s.k)) total += 1; if (s.k === 'battleship') total += 3; if (s.k === 'mine' || s.k === 'tower') total += 1; }
    total += 3 + 15; // rescue chasers + boss parts
    return Math.round(total * m.medalPct / 5) * 5;
  }
  // jump inside a loaded mission (used by attract-mode montage and checkpoints)
  jumpTo(j) {
    const P = this.player;
    if (this.mode === 'rail') {
      this.archesPassed = new Set(); this.firedEvents = new Set(); this.branchDone = false;
      this.route = this.m.defaultRoute; this.rail = this.rails[this.route]; this.hits = 0;
      if (j.arches) for (let i = 1; i <= j.arches; i++) this.archesPassed.add(i);
      if (j.route) { this.route = j.route; this.rail = this.rails[j.route]; }
      let s = j.s ?? 0;
      if (j.boss) { s = this.rail.length - 260; this.branchDone = true; }
      this.clearEntities();
      for (const e of this.m.events) { const es = e.s < 0 ? this.rail.length + e.s : e.s; if (es < s) this.firedEvents.add(e); }
      if (s > this.m.branch.at) this.branchDone = true;
      this.placeStatics(s);
      this.spawnWingmen();
      P.spawn('rail', { s, invuln: 0 });
      P.control = false;
      this.state = 'intro'; this.stateT = 3.4;
    } else {
      this.step = (j.step ?? 0) - 1; this.stepT = 0;
      if (j.step >= 4) { this.step = 3; this.stepAdvance(); }
    }
  }
  clearEntities() {
    for (const e of this.enemies || []) e.remove();
    for (const i of this.items || []) i.remove();
    for (const a of this.arches || []) a.remove();
    for (const c of this.checkpoints || []) c.obj.parent && c.obj.parent.remove(c.obj);
    for (const w of this.wingmen || []) { w.obj.parent && w.obj.parent.remove(w.obj); w.trailL.dispose(); w.trailR.dispose(); if (w.sensor) physics.removeSensor(w.sensor); }
    for (const s of this.shockwaves || []) s.obj.parent && s.obj.parent.remove(s.obj);
    if (this.boss) { this.boss.remove(); this.boss = null; }
    this.proj.clear();
    this.enemies = []; this.items = []; this.arches = []; this.checkpoints = []; this.wingmen = []; this.shockwaves = [];
    if (this.root) { while (this.root.children.length) this.root.remove(this.root.children[0]); }
    this.ui.bossBar(null);
  }
  spawnWingmen() {
    this.wingmen = WINGMEN.map((id) => new Wingman(this, id));
    if (this.mode === 'allrange') this.wingmen.forEach((w, i) => { w.pos.set((i - 1) * 25, 8 * i, 1430 + i * 15); w.fwd.set(0, 0, -1); });
  }

  // =================================================================
  // statics
  // =================================================================
  placeStatics(fromS) {
    const m = this.m;
    for (const d of m.statics) {
      if (this.mode === 'rail') {
        const route = d.route || 'shared';
        if (route !== 'shared' && route !== this.route) {
          // place other route's statics too (they are physically elsewhere); events decide the route
        }
        if (d.s < fromS - 10) continue;
        const rail = d.route ? this.rails[d.route] : this.rails[m.defaultRoute];
        this.placeRailStatic(d, rail);
      } else {
        this.placeFreeStatic(d);
      }
    }
  }
  placeRailStatic(d, rail) {
    const f = rail.frame(d.s, {});
    const p = V().copy(f.p).addScaledVector(f.r, d.x || 0).addScaledVector(f.u, d.y || 0);
    const yaw = Math.atan2(f.t.x, f.t.z);
    const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    const rq = { x: q.x, y: q.y, z: q.z, w: q.w };
    const ground = (x) => V().copy(f.p).addScaledVector(f.r, x).setY(1.2);
    switch (d.k) {
      case 'ring': case 'goldRing': {
        tm.makeBasis(tv.copy(f.r).negate(), f.u, f.t);
        this.items.push(new Item(this, d.k, p, { s: d.s, quat: new THREE.Quaternion().setFromRotationMatrix(tm) }));
        break;
      }
      case 'laser': case 'bombItem': case 'oneUp':
        this.items.push(new Item(this, d.k === 'bombItem' ? 'bomb' : d.k, p, { s: d.s })); break;
      case 'supply': { const e = new Supply(this, p, d.item); e.s = d.s; this.enemies.push(e); break; }
      case 'mine': { const e = new Mine(this, p); e.s = d.s; this.enemies.push(e); break; }
      case 'seaTurret': {
        const obj = M.buildTurret();
        obj.add(mesh(geo('box', 9, 2, 9), toon(0x4a4f60)));
        obj.children[obj.children.length - 1].position.y = -0.4;
        const gp = ground(d.x || 0).setY(0.6);
        obj.position.copy(gp); obj.quaternion.copy(q);
        const t = new Turret(this, obj, tv.copy(gp).setY(3), {}); t.obj.position.copy(gp); t.s = d.s; this.enemies.push(t);
        break;
      }
      case 'turret': case 'roofTurret': {
        const obj = M.buildTurret();
        const gp = ground(d.x || 0); if (d.k === 'roofTurret') gp.y = 1.2 + d.h;
        obj.position.copy(gp); obj.quaternion.copy(q);
        const t = new Turret(this, obj, tv.copy(gp).setY(gp.y + 2.2)); t.obj.position.copy(gp); t.s = d.s; this.enemies.push(t);
        break;
      }
      case 'tower': {
        const obj = M.buildTower(); obj.quaternion.copy(q);
        const gp = ground(d.x || 0);
        const o = new Obstacle(this, 'tower', obj, gp, { hp: Math.round(12 * this.diff.enemyHp), hits: 2, debrisColor: 0xb8bcc8, boxes: [[gp.x, 22, gp.z, 3, 22, 3, null]] });
        o.height = 44; o.s = d.s;
        // towers are shootable: give them a sensor box for bolts
        o.sensor = physics.addSensorBox(o, 3.2, 22, 3.2, G.ENEMY); physics.teleportSensor(o.sensor, tv.copy(gp).setY(22)); o.pos = obj.position;
        o.base = function (dt) { this.t += dt; if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) for (const [m, mat] of this.meshes) m.material = mat; } };
        this.enemies.push(o);
        break;
      }
      case 'building': {
        const obj = M.buildBuilding(d.w, d.h, d.d, pick([0xe9d8c4, 0xc9d6e8, 0xf0c8a8, 0xd8c0d8]));
        obj.quaternion.copy(q);
        const gp = ground(d.x || 0);
        const o = new Obstacle(this, 'building', obj, gp, { indestructible: true, boxes: [[gp.x, 1.2 + d.h / 2, gp.z, d.w / 2, d.h / 2, d.d / 2, rq]] });
        o.indestructible = true; this.enemies.push(o); o.s = d.s;
        break;
      }
      case 'pillar': case 'spire': {
        const h = d.k === 'spire' ? 70 : 90;
        const obj = d.k === 'spire' ? M.buildPillar(h) : M.buildPillar(h);
        if (d.k === 'spire') obj.children.forEach((c) => (c.material = toon(0x6a7a70)));
        obj.quaternion.copy(q);
        const gp = ground(d.x || 0).setY(d.k === 'spire' ? -5 : 1);
        const o = new Obstacle(this, d.k, obj, gp, { boxes: [[gp.x, gp.y + h / 2, gp.z, 2.6, h / 2, 2.6, rq]] });
        o.indestructible = true; o.s = d.s; this.enemies.push(o);
        break;
      }
      case 'rockArch': {
        const g = new THREE.Group();
        const R = toon(0x9b7a5a), R2 = toon(0x7a5e44);
        const span = 90, y = d.y;
        const top = mesh(geo('box', span, 9, 12), R); top.position.set(0, y + 4.5, 0); g.add(top);
        const cap = mesh(geo('box', span * 0.8, 3, 13), R2); cap.position.set(0, y + 10, 0); g.add(cap);
        for (const sx of [-1, 1]) { const leg = mesh(geo('box', 14, y + 10, 14), R2); leg.position.set(sx * (span / 2 - 4), (y + 10) / 2, 0); g.add(leg); }
        const gp = V().copy(f.p).setY(0);
        g.quaternion.copy(q);
        const right = tv.copy(f.r);
        const boxes = [[gp.x, y + 4.5, gp.z, span / 2, 4.5, 6, rq]];
        for (const sx of [-1, 1]) boxes.push([gp.x + right.x * sx * (span / 2 - 4), (y + 10) / 2, gp.z + right.z * sx * (span / 2 - 4), 7, (y + 10) / 2, 7, rq]);
        const o = new Obstacle(this, 'rockArch', g, gp, { boxes });
        o.indestructible = true; o.s = d.s; this.enemies.push(o);
        break;
      }
      case 'battleship': {
        const g = new THREE.Group();
        const hull = mesh(geo('box', 26, 10, 90), toon(0x5c6070)); hull.position.y = 3; g.add(hull);
        const bow = mesh(geo('cone', 13, 24, 4), toon(0x5c6070)); bow.rotation.set(Math.PI / 2, 0, Math.PI / 4); bow.scale.set(1, 1, 0.4); bow.position.set(0, 3, 56); g.add(bow);
        const deck = mesh(geo('box', 18, 8, 30), toon(0x3b3e4a)); deck.position.set(0, 12, -14); g.add(deck);
        const stripe = mesh(geo('box', 26.4, 1.2, 90.4), toon(0xff8a20)); stripe.position.y = 6; g.add(stripe);
        const gp = ground(d.x || 0).setY(0);
        g.quaternion.copy(q);
        const o = new Obstacle(this, 'battleship', g, gp, { boxes: [[gp.x, 4, gp.z, 13, 6, 45, rq]] });
        o.indestructible = true; o.s = d.s; this.enemies.push(o);
        for (const dz of [-30, 10, 34]) {
          const tp = V(0, 8.2, dz).applyQuaternion(q).add(gp);
          const obj = M.buildTurret(); obj.position.copy(tp); obj.quaternion.copy(q);
          const t = new Turret(this, obj, tv.copy(tp).setY(tp.y + 2.2), { hp: 6 }); t.obj.position.copy(tp); t.s = d.s + dz; this.enemies.push(t);
        }
        break;
      }
      case 'arch': {
        const obj = M.buildArch(); obj.quaternion.copy(q);
        const gp = ground(d.x || 0).setY(0);
        const right = f.r;
        const o = new Obstacle(this, 'arch', obj, gp, {
          boxes: [[gp.x - right.x * 11, 11, gp.z - right.z * 11, 1.3, 11, 1.3, rq], [gp.x + right.x * 11, 11, gp.z + right.z * 11, 1.3, 11, 1.3, rq], [gp.x, 22, gp.z, 13, 1.3, 1.6, rq]],
        });
        o.indestructible = true; o.s = d.s; o.archN = d.n; o.ax = d.x || 0; o.passed = this.archesPassed.has(d.n);
        this.arches.push(o);
        break;
      }
      case 'checkpoint': {
        const obj = M.buildCheckpoint(); obj.position.copy(p); tm.makeBasis(tv.copy(f.r).negate(), f.u, f.t); obj.quaternion.setFromRotationMatrix(tm);
        this.root.add(obj);
        this.checkpoints.push({ obj, s: d.s, passed: this.checkpoint && this.checkpoint.s >= d.s });
        break;
      }
    }
  }
  placeFreeStatic(d) {
    const p = V(...d.at);
    if (d.k === 'supply') { this.enemies.push(new Supply(this, p, d.item)); return; }
    this.items.push(new Item(this, d.k === 'bombItem' ? 'bomb' : d.k, p));
  }

  // =================================================================
  // spawning
  // =================================================================
  makeEnemyModel(type) { return type === 'bat' ? M.buildBat() : type === 'bomber' ? M.buildBomber() : M.buildDart(); }
  enemyStats(type) {
    const hpm = this.diff.enemyHp;
    if (type === 'bat') return { hp: Math.max(1, Math.round(2 * hpm)), radius: 3.2, hits: 1, debrisColor: 0x7a3fd1, boom: 1.1 };
    if (type === 'bomber') return { hp: Math.round(10 * hpm), radius: 6.5, hits: 3, debrisColor: 0x5a6b3a, boom: 2.2 };
    return { hp: Math.max(1, Math.round(1 * hpm)), radius: 2.9, hits: 1, debrisColor: 0xc0303a, boom: 1 };
  }
  spawnRail(ev) {
    const P = this.player, n = ev.n || 1;
    for (let i = 0; i < n; i++) {
      const c = i - (n - 1) / 2;
      let rs = P.s + (ev.ahead || 300), ox = ev.x || 0, oy = ev.y || 0, phase = 0;
      if (ev.f === 'v') { ox += c * 9; rs += Math.abs(c) * 12; oy += Math.abs(c) * 1.5; }
      if (ev.f === 'line') { ox += c * 10; }
      if (ev.f === 'ring') { phase = (i / n) * Math.PI * 2; }
      if (ev.p === 'cross') { ox = (ev.side || 1) * (90 + i * 18); rs = P.s + (ev.ahead || 220) + i * 6; oy = (ev.y || 0) + Math.sin(i) * 3; }
      if (ev.p === 'behind') { rs = P.s - 50 - i * 14; ox = c * 12; }
      if (ev.p === 'tail') { rs = P.s - 32 - i * 8; ox = c * 14; oy = ev.y || 4; }
      if (ev.p === 'swoop' || ev.p === 'hover') phase = i * 0.9;
      const st = this.enemyStats(ev.e);
      const e = new RailEnemy(this, ev.e, this.makeEnemyModel(ev.e), { ...st, rs, ox, oy, pattern: ev.p, phase, side: ev.side, ahead: ev.ahead, fire: ev.fire, item: ev.item });
      if (ev.p === 'tail') e.bx = c * 14, e.by = 4;
      this.enemies.push(e);
    }
  }
  spawnDogfighter(type, pos, o = {}) {
    const st = this.enemyStats(type);
    const e = new Dogfighter(this, type, this.makeEnemyModel(type), pos, { ...st, speed: type === 'bomber' ? 40 : type === 'bat' ? 70 : 60, turn: type === 'bat' ? 1.6 : 1.2, item: o.item, wave: o.wave });
    this.enemies.push(e);
    return e;
  }
  spawnWave(ev) {
    const P = this.player;
    for (let i = 0; i < (ev.n || 1); i++) {
      const dir = V(rand(-1, 1), rand(-0.3, 0.3), rand(-1, 1)).normalize();
      if (dir.dot(P.forward) < -0.3) dir.add(P.forward).normalize();
      const pos = V().copy(P.pos).addScaledVector(dir, rand(380, 620));
      pos.clampLength(0, this.arena * 0.9);
      this.spawnDogfighter(ev.e, pos, { item: i === 0 ? ev.item : null, wave: true });
    }
  }
  spawnAces() {
    const defs = [['vex', 0x22222c, 0xe0283c], ['rizzo', 0x3a2a4c, 0xffd030], ['mort', 0x4a3a2a, 0xff8a30]];
    const P = this.player;
    this.aces = [];
    defs.forEach(([id, a, s], i) => {
      const pos = V().copy(P.pos).addScaledVector(P.forward, 500).add(V((i - 1) * 60, 30, 0));
      const hp = Math.round(24 * this.diff.enemyHp);
      const handler = {
        id, down: false, saidHit: false,
        onHit: (e) => {
          if (!handler.saidHit && e.hp < e.maxHp * 0.6) { handler.saidHit = true; this.radio(id, pick(['Lucky shot!', 'You\'ll pay for that!', 'Grr... not bad for a kit.'])); }
          if (e.hp < e.maxHp * 0.25 && !handler.down) {
            handler.down = true; e.alive = false;
            this.radio(id, pick(['I\'m outta here! This isn\'t over!', 'Retreat! I\'ll get you next time, Barrel!']), { priority: true });
            this.addHits(5, e.pos); fx.explode(e.pos, 1, 0x333333, 3, this.root);
            // fly off trailing smoke then vanish
            const dir = e.fwd.clone(); let t = 0;
            const tick = () => { t += 1 / 60; e.pos.addScaledVector(dir, 3); fx.smoke(e.pos, 0.6); if (t < 2 && e.obj.parent) requestAnimationFrame(tick); else e.remove(); };
            tick();
          }
        },
        onDown: () => { if (!handler.down) { handler.down = true; this.addHits(4, P.pos); this.radio(id, 'Nooooo!', { priority: true }); } },
      };
      const e = new Dogfighter(this, 'ace', M.buildAce(a, s), pos, { hp, radius: 3.4, hits: 1, debrisColor: a, boom: 1.6, speed: 82, turn: 1.9, fireRate: 1.2, ace: handler, trailColor: s });
      e.aceName = CAST[id].name;
      this.enemies.push(e); this.aces.push(handler);
    });
    this.ui.toast('JACKAL SQUADRON', 'red');
  }
  spawnItem(kind, pos) {
    const k = kind === 'bombItem' ? 'bomb' : kind;
    const it = new Item(this, k, pos, { dropped: true });
    this.items.push(it);
  }
  startRescue(id) {
    const w = this.wingmen.find((x) => x.id === id);
    if (!w || w.state !== 'formation') return;
    w.state = 'rescue'; w.rescueT = 14;
    const P = this.player;
    let chaser;
    if (this.mode === 'rail') {
      w.rs = P.s + 60;
      const st = this.enemyStats('dart'); st.hp = Math.round(5 * this.diff.enemyHp); st.hits = 1;
      chaser = new RailEnemy(this, 'dart', M.buildBat(), { ...st, rs: w.rs - 14, ox: w.ox, oy: w.oy, pattern: 'chase' });
      chaser.noFire = true;
    } else {
      chaser = this.spawnDogfighter('bat', V().copy(w.pos).addScaledVector(w.fwd, -30));
      chaser.target = w;
    }
    chaser.victim = w; chaser.isChaser = true;
    chaser.onKill = (src) => {
      if (w.state === 'rescue') { w.state = 'formation'; this.radio(id, pick(['Thanks, Kit! I owe you one.', 'Whew! Nice shooting!', 'You saved my tail!']), { priority: true }); this.stats.rescues = (this.stats.rescues || 0) + 1; }
    };
    this.enemies.push(chaser);
    w.chaser = chaser; w.chaseDmgT = 1.5;
    this.radio(id, id === 'hopper' ? 'Kit! Help! Get this guy off me!' : id === 'brock' ? 'I\'ve got one on my tail, kid! Shake him loose!' : 'Ugh, this one\'s sticky! Little help?', { priority: true });
  }
  updateRescues(dt) {
    for (const w of this.wingmen) {
      if (w.state !== 'rescue') continue;
      const c = w.chaser;
      if (!c || !c.alive) { w.state = 'formation'; continue; }
      w.chaseDmgT -= dt;
      if (w.chaseDmgT <= 0) {
        w.chaseDmgT = 2;
        this.enemyShoot(c.pos, w.pos, 160, 'e0', 0, false);
        w.damage(2.5, c);
      }
      if (w.rescueT <= 0 && w.state === 'rescue') {
        w.damage(12, c);
        if (w.state === 'rescue') { w.state = 'formation'; this.radio(w.id, 'He got me good... I\'m still flying, barely.', { priority: true }); }
        c.pattern = 'chase'; c.victim = null; c.target = null;
      }
    }
  }

  // =================================================================
  // combat helpers called by entities
  // =================================================================
  enemyShoot(from, target, speed, kind, dmg, lead = true) {
    const P = this.player;
    const aim = V().copy(target);
    if (lead && target === P.pos) { const t = from.distanceTo(target) / speed; aim.addScaledVector(P.vel, t * 0.85); }
    const dir = aim.sub(from).normalize();
    this.enemyShootDir(from, dir, speed, kind, dmg);
  }
  enemyShootDir(from, dir, speed, kind, dmg) {
    this.proj.add({ kind, pos: from, vel: V().copy(dir).normalize().multiplyScalar(speed), life: 4, owner: dmg > 0 ? 'enemy' : 'fx', dmg, radius: kind === 'eBig' ? 3 : 1.6 });
    if (this.player.pos.distanceTo(from) < 400) audio.enemyLaser(this.panOf(from));
  }
  friendShoot(from, target) {
    const dir = V().subVectors(target.pos, from).normalize().add(V(rand(-0.04, 0.04), rand(-0.04, 0.04), rand(-0.04, 0.04))).normalize();
    this.proj.add({ kind: 'friend', pos: V().copy(from).addScaledVector(dir, 4), vel: dir.multiplyScalar(380), life: 1.2, owner: 'friend', dmg: 0.34 });
  }
  findLockTarget(pos, fwd, minDot, maxDist) {
    let best = null, bd = minDot;
    const test = (e) => {
      tv.subVectors(e.pos, pos); const d = tv.length();
      if (d > maxDist || d < 8) return;
      const dot = tv.divideScalar(d).dot(fwd);
      if (dot > bd) { bd = dot; best = e; }
    };
    for (const e of this.enemies) if (e.alive && e.lockable && e.sensor) test(e);
    if (this.boss && this.boss.alive) for (const p of this.boss.targets()) test(p);
    return best;
  }
  areaDamage(pos, r, dmg, src = 'player', exclude = null, countMulti = false) {
    let kills = 0;
    for (const e of [...this.enemies]) {
      if (!e.alive || e === exclude || e.indestructible || !e.sensor) continue;
      if (e.pos.distanceTo(pos) < r + e.radius) { if (e.hit(dmg, null, src)) kills++; }
    }
    if (this.boss && this.boss.alive) for (const p of this.boss.parts) if (p.alive && p.pos.distanceTo(pos) < r + p.radius + 4) p.hit(dmg, p.pos, src);
    if (countMulti && kills >= 2) {
      const bonus = kills - 1;
      this.hits += bonus; this.stats.multiBonus += bonus;
      this.ui.toast(`+${bonus} MULTI-HIT BONUS`, 'gold');
    }
    return kills;
  }
  bombBlast(pos) {
    audio.bombBlast();
    for (let i = 0; i < 26; i++) fx.fireball(pos, 6, i % 2 ? 0xff6080 : 0xffd0a0);
    fx.flash(pos, 40, 0xffd0e0);
    fx.ring(pos, 70, 0xff7090, 0.8); fx.ring(pos, 50, 0xffffff, 0.6);
    gfx.flash.value = 0.6; this.shake(1.2); input.rumble(1, 1, 400);
    this.proj.clearEnemyShots(pos, 90);
    this.areaDamage(pos, 60, Math.round(18), 'player', null, true);
    for (const rk of physics.rocks) { const d = rk.obj.position.distanceTo(pos); if (d < 120) physics.impulse(rk.body, V().subVectors(rk.obj.position, pos).normalize().multiplyScalar(60000 / Math.max(10, d))); }
  }
  hitRock(o, dmg, point, dir) {
    if (!o.rk) return;
    o.hp -= dmg;
    physics.impulse(o.rk.body, V().copy(dir).normalize().multiplyScalar(800 * dmg));
    fx.hitSpark(point, 0xddccaa);
    if (o.hp <= 0) {
      fx.explode(o.obj.position, o.radius / 6, 0x8a7a6a, Math.min(10, Math.round(o.radius / 2)), this.worldRoot);
      audio.explosion(o.radius / 8, this.panOf(o.obj.position));
      physics.removeRock(o.rk); o.rk = null; o.obj.parent && o.obj.parent.remove(o.obj);
      if (o.radius > 12) this.addHits(1, o.obj.position);
    }
  }
  shockwave(pos, height) {
    const obj = mesh(geo('torus', 1, 0.6, 6, 48), glow(0xff8844, 3, { additive: true }), { cast: false, receive: false });
    obj.rotation.x = Math.PI / 2; obj.position.copy(pos).setY(3);
    this.root.add(obj);
    this.shockwaves.push({ obj, pos: pos.clone(), r: 5, height, hitDone: false });
    audio.explosion(2.5); this.shake(0.8);
    this.radio('brock', 'Shockwave! Get some altitude!', { minGap: 20 });
  }
  updateShockwaves(dt) {
    const P = this.player;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += 120 * dt;
      s.obj.scale.set(s.r, s.r, 8);
      const d = Math.hypot(P.pos.x - s.pos.x, P.pos.z - s.pos.z);
      if (!s.hitDone && Math.abs(d - s.r) < 5 && P.pos.y < s.height + 6) { s.hitDone = true; P.damage(14, 'shock'); }
      if (s.r > 420) { s.obj.parent && s.obj.parent.remove(s.obj); this.shockwaves.splice(i, 1); }
    }
  }
  addHits(n, pos, ent) {
    if (n <= 0) return;
    this.hits += n;
    this.ui.hitPopup(pos, n);
  }
  addLife() { this.player.lives = Math.min(9, this.player.lives + 1); audio.oneUp(); this.ui.toast('1-UP!', 'gold'); }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a * settings.shake); }
  toast(t, c) { this.ui.toast(t, c); }
  onPlayerHurt(amt) {
    this.shake(0.6); input.rumble(0.8, 0.6, 180);
    gfx.vignette.value = 0.7;
    const P = this.player;
    if (P.shield < P.maxShield * 0.3 && !this.lowWarned) { this.lowWarned = true; this.radio('hopper', 'Kit, your shield is low! Look for rings!', { priority: true }); }
    if (P.shield > P.maxShield * 0.5) this.lowWarned = false;
  }
  onPlayerDeath() {
    this.state = 'dying'; this.stateT = 0;
    input.rumble(1, 1, 600); this.shake(1.5);
    this.radio(pick(['nova', 'brock', 'hopper']), pick(['KIT!!', 'No! Kit\'s down!', 'Kit, eject!']), { priority: true });
  }
  bossDefeated(boss) {
    this.ui.bossBar(null);
    this.timeScale = 0.35; this.slowT = 1.8;
    this.addHits(10, boss.pos);
    this.state = 'bossdown'; this.stateT = 0;
    audio.stopMusic();
    this.radio('hopper', 'Its reactor is going critical! We did it!', { priority: true });
  }

  // =================================================================
  // radio + hints
  // =================================================================
  radio(who, text, o = {}) {
    const key = who + text;
    const now = this.time;
    if (o.minGap && this.radioLog.has(key) && now - this.radioLog.get(key) < o.minGap) return;
    this.radioLog.set(key, now);
    const msg = { who, text, dur: Math.max(2.8, text.length / 17 + 1.4) };
    if (o.priority) { this.radioQ.unshift(msg); if (this.radioCur && !this.radioCur.priority) this.radioCur.t = this.radioCur.dur; msg.priority = true; }
    else { if (this.radioQ.length > 3) this.radioQ.shift(); this.radioQ.push(msg); }
  }
  updateRadio(dt) {
    if (this.radioCur) {
      this.radioCur.t += dt;
      const c = this.radioCur;
      const chars = Math.floor(c.t * 38);
      if (chars > c.shown && chars <= c.text.length) {
        if (chars % 2 === 0) audio.voiceBlip(CAST[c.who].voice, c.text[chars - 1] || '');
        c.shown = chars;
      }
      if (c.t >= c.dur) { this.radioCur = null; this.ui.radio(null); }
      else this.ui.radio(c, Math.min(c.text.length, chars));
    }
    if (!this.radioCur && this.radioQ.length) {
      this.radioCur = this.radioQ.shift(); this.radioCur.t = 0; this.radioCur.shown = 0;
      audio.radioOpen();
    }
  }
  hint(id, text) {
    if (!settings.hints || this.attract || this.hintShown.has(id)) return;
    this.hintShown.add(id);
    this.ui.hint(text);
  }

  // =================================================================
  // events
  // =================================================================
  runAction(e) {
    switch (e.a) {
      case 'radio': this.radio(e.who, e.text); break;
      case 'hint': this.hint(e.id, e.text); break;
      case 'spawn': this.spawnRail(e); break;
      case 'wave': this.spawnWave(e); break;
      case 'rescue': this.startRescue(e.who); break;
      case 'aces': this.spawnAces(); break;
      case 'music': audio.playMusic(e.m); break;
      case 'warning': this.ui.warning(); audio.warning(); break;
      case 'boss': this.startBoss(e.boss); break;
    }
  }
  updateRailEvents() {
    const P = this.player;
    for (const e of this.m.events) {
      if (this.firedEvents.has(e)) continue;
      if (e.route && e.route !== this.route) continue;
      const es = e.s < 0 ? this.rail.length + e.s : e.s;
      if (P.s >= es && this.rail !== this.bossRail) { this.firedEvents.add(e); this.runAction(e); }
    }
    // branch decision
    const br = this.m.branch;
    if (br && !this.branchDone && P.s >= br.at && this.rail !== this.bossRail) {
      this.branchDone = true;
      if (this.archesPassed.size >= br.need) {
        this.route = br.route; this.rail = this.rails[br.route];
        this.ui.toast('ROUTE UNLOCKED: CANYON PASS', 'gold');
        this.radio('nova', 'All five arches?! Show-off. Canyon route it is!', { priority: true });
      } else {
        this.ui.toast('ROUTE: CORVALIS BAY', 'blue');
        this.radio('hopper', `We threaded ${this.archesPassed.size} of 5 arches. Taking the bay route.`);
      }
    }
    // arches
    for (const a of this.arches) {
      if (a.passed || !a.alive) continue;
      if (P.s >= a.s) {
        a.passed = true;
        if (Math.abs(P.ox - a.ax) < 9.5 && P.pos.y < 21 && P.pos.y > 0) {
          this.archesPassed.add(a.archN);
          audio.ring(true);
          this.ui.toast(`GOLD ARCH ${this.archesPassed.size}/5`, 'gold');
          a.obj.userData.lamp.material = glow(0x66ff88, 4);
        }
      }
    }
    for (const c of this.checkpoints) {
      if (!c.passed && P.s >= c.s) {
        c.passed = true;
        this.checkpoint = { s: c.s, hits: this.hits };
        P.heal(40);
        audio.checkpoint(); this.ui.toast('CHECKPOINT', 'blue');
        fx.ring(c.obj.position, 14, 0x66eeff, 0.6, c.obj.quaternion);
      }
      c.obj.userData.lights.rotation.z += 0.02;
    }
  }
  updateSteps(dt) {
    this.stepT += dt;
    if (this.step < 0) { this.stepAdvance(); return; }
    const st = this.m.steps[this.step];
    if (!st) return;
    const u = st.until || {};
    const waveLeft = this.enemies.filter((e) => e.alive && e.wave).length;
    let done = false;
    if (u.clear && waveLeft === 0 && this.stepT > 3) done = true;
    if (u.acesDown && this.aces.length && this.aces.every((a) => a.down)) done = true;
    if (u.bossDead) done = this.boss && !this.boss.alive;
    if (u.time && this.stepT >= u.time && !u.bossDead) done = true;
    if (done && !u.bossDead) this.stepAdvance();
    // occasional rescue requests from wingmen when aces are around
    if (this.aces.length && !this.aces.every((a) => a.down) && !this.wingmen.some((x) => x.state === 'rescue') && Math.random() < dt / 35) {
      const w = pick(this.wingmen.filter((x) => x.state === 'formation'));
      if (w) this.startRescue(w.id);
    }
  }
  stepAdvance() {
    this.step++; this.stepT = 0;
    const st = this.m.steps[this.step];
    if (!st) return;
    for (const a of st.do) this.runAction(a);
  }
  startBoss(kind) {
    const P = this.player;
    if (kind === 'strider') {
      // hand over to the circular boss rail
      for (const e of this.enemies) e.remove();
      this.enemies = [];
      for (const a of this.arches) a.remove();
      this.arches = [];
      if (this.rail !== this.bossRail) P.s = P.s - this.rail.length; // only when handing over from the route
      this.rail = this.bossRail;
      this.boss = new StriderBoss(this);
      this.wingmen.forEach((w) => { if (w.state !== 'gone') { w.rs = P.s + 30; w.state = w.state === 'rescue' ? 'formation' : w.state; } });
    } else {
      this.boss = new CarrierBoss(this);
    }
    audio.playMusic('boss');
    this.state = 'bossintro'; this.stateT = 0; this.player.control = false;
    this.ui.bossCard(this.boss);
    this.ui.bossBar(this.boss);
    this.radio('hopper', 'I\'ve patched its shield readout into your HUD!', {});
  }

  // =================================================================
  // pilot input
  // =================================================================
  readPilot() {
    if (this.attract) return this.aiPilot();
    return {
      lx: input.lx, ly: input.ly, boost: input.down('boost'), brake: input.down('brake'),
      rollL: input.down('rollL'), rollR: input.down('rollR'), loop: input.pressed('loop'), uturn: input.pressed('uturn'),
      fire: input.down('fire'), firePressed: input.pressed('fire'), bombPressed: input.pressed('bomb'),
      pressedRoll: { rollL: input.pressed('rollL'), rollR: input.pressed('rollR') },
    };
  }
  aiPilot() {
    const P = this.player, A = this.ai || (this.ai = { fireT: 0, rollT: 0, rollStep: 0, bombT: 6, hold: 0, t: 0 });
    A.t += 1 / 60;
    const out = { lx: 0, ly: 0, boost: false, brake: false, rollL: false, rollR: false, loop: false, uturn: false, fire: false, firePressed: false, bombPressed: false, pressedRoll: { rollL: false, rollR: false } };
    let target = null;
    if (this.mode === 'rail') {
      let best = 1e9;
      const f = this.rail.frame(P.s, {});
      const cands = this.enemies.filter((e) => e.alive && e.sensor && !e.indestructible && e.lockable);
      if (this.boss && this.boss.alive) cands.push(...this.boss.targets());
      for (const e of cands) {
        tv.subVectors(e.pos, P.pos); const ahead = tv.dot(f.t);
        if (ahead < 20 || ahead > 320) continue;
        if (ahead < best) { best = ahead; target = e; }
      }
      let tx = 0, ty = 4;
      const arch = this.arches.find((a) => !a.passed && a.s - P.s > 0 && a.s - P.s < 260);
      if (arch && (this.attractRoute === 'canyon' || !target)) { tx = arch.ax; ty = 13 - f.p.y; target = null; }
      else if (target) { tv.subVectors(target.pos, f.p); tx = tv.dot(f.r); ty = tv.dot(f.u); }
      else {
        const it = this.items.find((i) => i.alive && i.pos.distanceTo(P.pos) < 300 && tv.subVectors(i.pos, P.pos).dot(f.t) > 10);
        if (it) { tv.subVectors(it.pos, f.p); tx = tv.dot(f.r); ty = tv.dot(f.u); }
      }
      ty = Math.max(ty, 9 - f.p.y); // never hug the ground
      if (target && best < 45) { tx = P.ox + (tx >= P.ox ? -14 : 14); ty = P.oy + 6; } // break off before ramming
      out.lx = clamp((tx - P.ox) / 8, -1, 1); out.ly = clamp((ty - P.oy) / 8, -1, 1);
      if (target && Math.abs(tx - P.ox) < 8 && Math.abs(ty - P.oy) < 8) {
        A.fireT -= 1 / 60; if (A.fireT <= 0) { out.firePressed = true; out.fire = true; A.fireT = 0.12; }
      }
      // tail enemies: loop
      if (this.enemies.some((e) => e.alive && e.pattern === 'tail' && e.rs < P.s && e.rs > P.s - 60) && P.boost >= 1) out.loop = true;
      if (Math.sin(A.t * 0.4) > 0.93 && !target) out.boost = true;
    } else {
      let best = 1e9;
      const cands = this.enemies.filter((e) => e.alive && e.sensor && e.lockable);
      if (this.boss && this.boss.alive) cands.push(...this.boss.targets());
      // prefer targets ahead (score = distance penalised by angle), like a player picking a shot
      for (const e of cands) { tv.subVectors(e.pos, P.pos); const d = tv.length(); const dot = tv.divideScalar(Math.max(d, 1)).dot(P.forward); const sc = d * (2.2 - dot); if (sc < best) { best = sc; target = e; } }
      if (target) {
        tv.subVectors(target.pos, P.pos).normalize();
        const local = tv.applyQuaternion(tq.copy(P.quat).invert());
        out.lx = clamp(-local.x * 3, -1, 1); out.ly = clamp(local.y * 3, -1, 1);
        if (local.z < -0.3 && P.boost >= 1) out.uturn = true;
        // keep clear of the carrier hull: pull up and away when close
        if (this.boss && this.boss.alive && this.boss.obj && this.boss.pos.distanceTo(P.pos) < 95) {
          tv2.subVectors(P.pos, this.boss.pos).normalize().applyQuaternion(tq.copy(P.quat).invert());
          out.lx = clamp(-tv2.x * 3, -1, 1); out.ly = clamp(tv2.y * 3 + 0.5, -1, 1); out.uturn = false;
        }
        // hold to charge while the target is ahead, release once locked (homing blast)
        if (local.z > 0.8 && !(P.lockTarget && P.charge >= 1)) { out.fire = true; if (!A.holding) { out.firePressed = true; A.holding = true; } }
        else { A.holding = false; }
      } else {
        tv.copy(P.pos).multiplyScalar(-1).normalize();
        const local = tv.applyQuaternion(tq.copy(P.quat).invert());
        out.lx = clamp(-local.x * 2, -1, 1); out.ly = clamp(local.y * 2, -1, 1);
      }
    }
    // barrel roll when shots are near
    A.rollT -= 1 / 60;
    const threat = this.proj.list.some((b) => b.owner === 'enemy' && b.pos.distanceTo(P.pos) < 45);
    if (threat && A.rollT <= 0 && A.rollStep === 0) { A.rollStep = 1; out.pressedRoll.rollR = true; A.rollT = 0.08; }
    else if (A.rollStep === 1 && A.rollT <= 0) { out.pressedRoll.rollR = true; A.rollStep = 0; A.rollT = 1.2; }
    // occasional charged shot / bomb for show
    A.hold -= 1 / 60;
    if (target && Math.sin(A.t * 0.23) > 0.85) { out.fire = true; A.charging = true; }
    else if (A.charging) { A.charging = false; }
    A.bombT -= 1 / 60;
    if (A.bombT <= 0 && this.enemies.filter((e) => e.alive && e.sensor && e.pos.distanceTo(P.pos) < 260).length >= 5) { out.bombPressed = true; A.bombT = 14; }
    return out;
  }

  // =================================================================
  // main update
  // =================================================================
  update(rawDt) {
    if (this.state === 'idle') return;
    if (this.slowT > 0) { this.slowT -= rawDt; if (this.slowT <= 0) this.timeScale = 1; }
    const dt = Math.min(rawDt, 1 / 20) * this.timeScale;
    this.time += dt; this.missionTime += dt; this.stateT += dt;
    const P = this.player;
    if (this.titleMode) { this.titleUpdate(dt, rawDt); return; }
    const pilot = this.readPilot();
    // state machine
    if (this.state === 'intro') {
      const len = this.mode === 'rail' ? 4.2 : 3.2;
      if (this.mode === 'allrange') {
        const k = smooth(Math.min(1, this.stateT / 2.6));
        P.pos.set(0, 0, lerp(1400, 620, k)); P.speed = lerp(600, 78, k);
      }
      if (this.stateT > len || (!this.attract && this.stateT > 0.6 && (input.pressed('confirm') || input.pressed('fire')))) {
        this.state = 'play'; this.stateT = 0; P.control = true; this.ui.missionCard(null);
        if (this.mode === 'allrange') { P.pos.set(0, 0, 620); P.speed = 78; }
      }
    } else if (this.state === 'bossintro') {
      if (this.stateT > 3.2) { this.state = 'play'; P.control = true; this.ui.bossCard(null); }
    } else if (this.state === 'dying') {
      if (this.stateT > 2.6) this.respawnOrGameOver();
    } else if (this.state === 'bossdown') {
      if (this.stateT > 2.6) { this.state = 'clear'; this.stateT = 0; P.control = false; P.invuln = 99; audio.playMusic('results'); this.ui.clearCard(this.m); }
    } else if (this.state === 'clear') {
      if (this.stateT > 6.5) { this.finishMission(); return; }
    }
    if (this.state === 'gameover' || this.state === 'results') return;

    // player
    if (this.mode === 'rail' && (this.state === 'clear' || this.state === 'bossdown')) this.forcedSpeed = this.stateT > 3 && this.state === 'clear' ? 260 : 0;
    else this.forcedSpeed = 0;
    if (this.mode === 'allrange' && this.state === 'clear' && this.stateT > 3) P.speed = 260;
    P.update(dt, P.control ? pilot : (this.state === 'intro' || this.state === 'clear' || this.state === 'bossintro' ? { lx: 0, ly: 0 } : null));
    if (this.cheat) { P.shield = P.maxShield; }
    // world
    if (this.mode === 'rail') this.updateRailEvents(); else if (this.state !== 'intro') this.updateSteps(dt);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.alive) e.update(dt);
      if (!e.alive || e.dead) { if (!e.dead) e.remove(); this.enemies.splice(i, 1); }
    }
    for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i]; if (it.alive) it.update(dt); if (!it.alive) this.items.splice(i, 1); }
    for (const a of this.arches) { if (a.alive && a.obj.userData.lamp) a.obj.userData.lamp.rotation.y += dt * 2; }
    if (this.mode === 'rail') {
      for (let i = this.arches.length - 1; i >= 0; i--) if (P.s - this.arches[i].s > 200) { this.arches[i].remove(); this.arches.splice(i, 1); }
      for (const e of this.enemies) if (e.indestructible && e.s !== undefined && P.s - e.s > 220 && this.rail !== this.bossRail) e.remove();
    }
    for (const w of this.wingmen) w.update(dt);
    this.updateRescues(dt);
    if (this.boss && this.boss.alive && this.state !== 'bossintro') this.boss.update(dt);
    else if (this.boss && this.boss.alive) { this.boss.update(dt * 0.0001); }
    if (this.boss && this.boss.alive && this.state === 'bossintro') this.bossIntroPose(dt);
    this.updateShockwaves(dt);
    this.proj.update(dt);
    physics.step(dt);
    fx.update(dt);
    this.updateRadio(dt);
    this.updateCamera(dt, rawDt);
    // sun follows the action for crisp shadows
    tv.copy(gfx.skyUniforms.sunDir.value).multiplyScalar(320);
    gfx.sun.position.copy(P.pos).add(tv); gfx.sun.target.position.copy(P.pos);
    gfx.sky.position.copy(gfx.camera.position);
    gfx.vignette.value = Math.max(0, gfx.vignette.value - rawDt * 1.6) + (P.alive && P.shield < P.maxShield * 0.2 ? 0.12 + Math.sin(this.time * 6) * 0.08 : 0);
    gfx.flash.value = Math.max(0, gfx.flash.value - rawDt * 2.5);
    this.ui.hud(this);
  }
  // cinematic flyover used behind the title menu
  titleUpdate(dt, rawDt) {
    const P = this.player, t = this.time;
    P.control = true; P.invuln = 0;
    if (P.s > 1450) { P.s = 0; P.trailL.reset(); P.trailR.reset(); P.engineTrail.reset(); this.wingmen.forEach((w) => { w.rs = 0; w.trailL.reset(); w.trailR.reset(); }); this.titleCamSnap = true; }
    P.update(dt, { lx: Math.sin(t * 0.37) * 0.45, ly: Math.sin(t * 0.21) * 0.35 });
    const bucket = Math.floor(t / 9);
    if (bucket !== this._rollBucket) { this._rollBucket = bucket; P.rollT = 0.6; P.rollDir = bucket % 2 ? 1 : -1; }
    for (const w of this.wingmen) w.update(dt);
    physics.step(dt); fx.update(dt);
    const f = this.rail.frame(P.s, {});
    const a = t * 0.12;
    const pos = V().copy(P.pos).addScaledVector(f.t, Math.cos(a) * 46 + 10).addScaledVector(f.r, Math.sin(a) * 40).addScaledVector(f.u, 10 + Math.sin(t * 0.3) * 5);
    const look = V().copy(P.pos).addScaledVector(f.t, 20).addScaledVector(f.u, 6);
    if (this.titleCamSnap) { this.camPos.copy(pos); this.camLook.copy(look); this.titleCamSnap = false; }
    this.camPos.lerp(pos, 1 - Math.exp(-2 * rawDt)); this.camLook.lerp(look, 1 - Math.exp(-3 * rawDt));
    const cam = gfx.camera; cam.position.copy(this.camPos); cam.up.set(0, 1, 0); cam.lookAt(this.camLook); cam.fov = 55; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    tv.copy(gfx.skyUniforms.sunDir.value).multiplyScalar(320);
    gfx.sun.position.copy(P.pos).add(tv); gfx.sun.target.position.copy(P.pos);
    gfx.sky.position.copy(cam.position);
  }
  bossIntroPose(dt) {
    // the boss keeps walking during the intro (strider) so legs animate
    if (this.boss instanceof StriderBoss) { const b = this.boss; b.t += dt; const u = b.obj.userData; const w = b.t * 2.6; u.legs.forEach((L, i) => { const ph = w + i * Math.PI; L.thigh.rotation.x = Math.sin(ph) * 0.35; L.shin.rotation.x = Math.max(0, -Math.cos(ph)) * 0.6; }); b.rs = this.player.s + 130; const f = this.rail.frame(b.rs, {}); b.pos.copy(f.p); b.pos.y = 1; b.obj.lookAt(tv.copy(b.pos).sub(f.t)); b.parts.forEach((p) => p.alive && p.sync(dt)); }
  }
  respawnOrGameOver() {
    const P = this.player;
    if (this.cheat) { P.spawn(this.mode, this.mode === 'rail' ? { s: P.s, ox: 0, oy: 0 } : { pos: P.pos.clone(), dir: P.forward.clone() }); this.state = 'play'; return; }
    P.lives--;
    if (P.lives < 0) {
      P.lives = 0;
      this.state = 'gameover'; audio.playMusic('gameover'); audio.engineStop();
      this.ui.gameOver(this);
      return;
    }
    P.laser = 0; P.resetStats();
    if (this.mode === 'rail') {
      const onBoss = this.rail === this.bossRail;
      if (onBoss) {
        // restart the boss fight
        const bossS = 0;
        this.boss && this.boss.remove(); this.boss = null;
        for (const e of [...this.enemies]) e.remove(); this.enemies = []; this.proj.clear();
        P.spawn('rail', { s: bossS, invuln: 2.5 });
        this.startBoss('strider');
      } else {
        const cs = this.checkpoint.s;
        this.hits = this.checkpoint.hits;
        this.clearEntities();
        for (const e of this.m.events) { const es = e.s < 0 ? this.rail.length + e.s : e.s; if (es >= cs) this.firedEvents.delete(e); }
        if (cs < this.m.branch.at) { this.branchDone = false; this.route = this.m.defaultRoute; this.rail = this.rails[this.route]; }
        this.placeStatics(cs);
        this.spawnWingmen();
        P.spawn('rail', { s: cs, invuln: 2.5 });
        this.state = 'intro'; this.stateT = 2.4; P.control = false;
        audio.playMusic(this.m.music);
      }
    } else {
      P.spawn('allrange', { pos: P.pos.clone().setLength(Math.min(P.pos.length(), this.arena * 0.7)), dir: P.forward.clone(), invuln: 3 });
      this.state = 'play';
    }
    this.radio('moss', 'Get back in there, Barrel. We\'re counting on you.');
    // keep scripted states (checkpoint intro / boss intro) so they hand control back themselves
    if (this.state !== 'intro' && this.state !== 'bossintro') { this.state = 'play'; P.control = true; }
  }
  continueAfterGameOver() {
    this.player.lives = 3; this.run.totalHits = Math.floor(this.run.totalHits / 2);
    this.loadMission(this.mi, {});
  }
  finishMission() {
    this.state = 'results';
    audio.engineStop();
    const res = {
      mission: this.m, hits: this.hits, medal: this.hits >= this.medal, medalNeed: this.medal,
      accuracy: this.stats.shots ? Math.round(100 * this.stats.shotsHit / this.stats.shots) : 0,
      team: WINGMEN.map((id) => ({ id, hp: this.team[id].hp })), route: this.mode === 'rail' ? this.route : null,
      stats: { ...this.stats }, time: this.missionTime,
    };
    this.run.totalHits += this.hits;
    this.run.missionResults.push(res);
    this.ui.results(res, this);
  }

  // =================================================================
  // camera
  // =================================================================
  snapCamera() { this.updateCamera(1, 1, true); }
  updateCamera(dt, rawDt, snap = false) {
    const P = this.player, cam = gfx.camera;
    let pos = tv.set(0, 0, 0), look = tv2.set(0, 0, 0), up = V(0, 1, 0), fov = 62, k = 7;
    if (this.mode === 'rail') {
      const f = this.rail.frame(P.s, {});
      const back = 21 + (P.boosting ? 6 : 0) - (P.braking ? 5 : 0) + (P.loopT ? 10 : 0);
      pos.copy(f.p).addScaledVector(f.r, P.ox * 0.72).addScaledVector(f.u, P.oy * 0.72 + 5).addScaledVector(f.t, -back);
      look.copy(f.p).addScaledVector(f.r, P.ox * 0.86).addScaledVector(f.u, P.oy * 0.82 + 1.5).addScaledVector(f.t, 40);
      up.copy(f.u).addScaledVector(f.r, P.bank * 0.12).normalize();
      fov = P.boosting ? 74 : P.braking ? 55 : 62;
      if (this.state === 'intro' && this.stateT < 4.2) {
        const a = Math.PI * (1 - smooth(Math.min(1, this.stateT / 3.6)));
        pos.copy(P.pos).addScaledVector(f.t, -Math.cos(a) * 24).addScaledVector(f.r, Math.sin(a) * 26).addScaledVector(f.u, 5 + Math.sin(a) * 4);
        look.copy(P.pos).addScaledVector(f.t, 6);
        k = 20;
      }
      if (this.state === 'bossintro' && this.boss) {
        const b = this.boss;
        const bf = this.rail.frame(b.rs, {});
        pos.copy(b.pos).addScaledVector(bf.t, -75).addScaledVector(bf.r, 30).setY(30 + this.stateT * 3);
        look.copy(b.pos).setY(36);
        k = 3; fov = 55;
      }
      if (this.state === 'clear' || this.state === 'bossdown') {
        const a = this.stateT * 0.6;
        pos.copy(P.pos).addScaledVector(f.t, Math.cos(a) * 26 + (this.state === 'clear' && this.stateT > 3 ? -(this.stateT - 3) * 10 : 0)).addScaledVector(f.r, Math.sin(a) * 26).addScaledVector(f.u, 6);
        if (this.state === 'clear' && this.stateT > 3) pos.copy(this.camPos);
        look.copy(P.pos); k = 4; fov = 58;
        if (this.state === 'bossdown' && this.boss) { look.copy(this.boss.pos).setY(30); pos.copy(P.pos).addScaledVector(f.t, -30).addScaledVector(f.u, 10); }
      }
      if (this.state === 'dying') { pos.copy(this.camPos); look.copy(P.pos); k = 2; }
    } else {
      pos.copy(P.pos).addScaledVector(P.forward, -24).addScaledVector(P.up, 6.5);
      look.copy(P.pos).addScaledVector(P.forward, 26);
      up.copy(P.up);
      fov = P.boosting ? 76 : P.braking ? 56 : 64;
      k = P.uturnT || P.loopT ? 2.2 : 5;
      if (this.state === 'intro') { pos.set(30, 14, 560); look.copy(P.pos); k = 30; up.set(0, 1, 0); }
      if (this.state === 'bossintro' && this.boss) {
        pos.copy(this.boss.pos).add(V(90, 40, 120).applyQuaternion(this.boss.obj.quaternion)); look.copy(this.boss.pos); k = 3; up.set(0, 1, 0); fov = 58;
      }
      if (this.state === 'clear' || this.state === 'bossdown') {
        const a = this.stateT * 0.5;
        pos.copy(P.pos).add(V(Math.cos(a) * 30, 9, Math.sin(a) * 30));
        if (this.state === 'clear' && this.stateT > 3) pos.copy(this.camPos);
        look.copy(this.state === 'bossdown' && this.boss ? this.boss.pos : P.pos); k = 3; up.set(0, 1, 0);
      }
      if (this.state === 'dying') { pos.copy(this.camPos); look.copy(P.pos); k = 2; }
    }
    if (snap) { this.camPos.copy(pos); this.camLook.copy(look); this.camUp.copy(up); }
    else {
      this.camPos.lerp(pos, 1 - Math.exp(-k * rawDt));
      this.camLook.lerp(look, 1 - Math.exp(-k * 1.4 * rawDt));
      this.camUp.lerp(up, 1 - Math.exp(-4 * rawDt)).normalize();
    }
    cam.position.copy(this.camPos);
    if (this.shakeAmt > 0.001) {
      cam.position.add(V(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(this.shakeAmt * 1.2));
      this.shakeAmt *= Math.exp(-6 * rawDt);
    }
    cam.up.copy(this.camUp);
    cam.lookAt(this.camLook);
    cam.fov = damp(cam.fov, fov, 4, rawDt);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
}
