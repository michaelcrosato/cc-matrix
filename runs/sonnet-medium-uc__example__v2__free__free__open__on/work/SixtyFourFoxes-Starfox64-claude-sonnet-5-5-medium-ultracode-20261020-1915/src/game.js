// Core gameplay: stage loading, entities, combat, rail-mode flight, camera, timeline director.
import { THREE, R, mk, toon, glowMat, makeSky, TEX, addOutline } from './render.js';
import { Physics, FILTER, G, RAPIER } from './physics.js';
import { FX } from './fx.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { settings } from './settings.js';
import * as M from './models.js';
import { Animator, clamp, damp, lerp, rr, pick, TAU, mulberry32, smooth, store } from './util.js';
import { Rail, mkFrame, buildTerrain, makeWater, STAGES, THEMES } from './level.js';
import { DEFS, RAIL, AIR, ALLIES, fwd, steer, dRel } from './enemies.js';

const V = THREE.Vector3;
const SCORE_BASE = { bolt: 0 };
export class Game {
  constructor(ui) {
    this.ui = ui; this.hud = ui.hud; this.phys = null; this.running = false; this.paused = false;
    this.world = new THREE.Group(); R.scene.add(this.world);
    this.fx = new FX(R.scene);
    this.ents = []; this.fr = mkFrame(); this.fr2 = mkFrame();
    this.mode = 'none';
    this.camPos = new V(); this.camLook = new V();
    this.listeners = {};
  }
  on(n, f) { this.listeners[n] = f; }
  emit(n, ...a) { this.listeners[n] && this.listeners[n](...a); }
  async init() { this.phys = await Physics.create(); }

  // ---------- stage lifecycle ----------
  clearWorld() {
    for (const e of this.ents) { if (e.mesh) this.world.remove(e.mesh); }
    this.ents.length = 0;
    while (this.world.children.length) this.world.remove(this.world.children[0]);
    if (this.phys) this.phys.reset();
    this.fx.clear(); R.particles && R.particles.clear();
    this.debris = [];
  }
  /** opts: {attract, checkpointS, title, carry} */
  start(stageId, opts = {}) {
    this.clearWorld();
    const def = STAGES[stageId](); this.stage = def; this.stageId = stageId;
    this.attract = !!opts.attract; this.title = !!opts.title;
    this.mode = def.mode; this.rail = def.rail || null; this.theme = def.theme;
    this.time = 0; this.clearT = 0; this.over = false; this.cleared = false; this.bossActive = false; this.boss = null;
    this.paused = false;
    // environment
    this.setupEnvironment(def);
    // player
    const carry = opts.carry || {};
    this.p = {
      s: opts.checkpointS || 0, x: 0, y: 4, vx: 0, vy: 0, health: carry.maxHealth || 100, maxHealth: carry.maxHealth || 100,
      bombs: Math.max(3, carry.bombs ?? 3), laser: carry.laser ?? 0, boost: 100, boostLock: false, score: carry.score ?? 0, kills: carry.kills ?? 0, combo: 0, comboT: 0,
      roll: 0, rollCd: 0, rollT: 0, invuln: 0, tilt: 0, speedMul: 1, pos: new V(), wvel: new V(), bank: 0, pitchVis: 0, rings: carry.rings ?? 0,
      yaw: 0, pitch: 0, speed: def.speed || 70, fireT: 0, bombCd: 0, uturnT: 0, somerT: 0, aimX: 0, aimY: 0, alive: true,
      lockT: 0, charge: 0, locks: [], hurtT: 0, ringCombo: 0, alliesLost: 0, time0: 0,
    };
    this.stats = { start: performance.now(), shots: 0, hits: 0, bombsUsed: 0, damageTaken: 0, alliesLost: 0, ringsMissed: 0, deaths: opts.deaths || 0 };
    this.checkpoint = { s: opts.checkpointS || 0, score: this.p.score, kills: this.p.kills, laser: this.p.laser, maxHealth: this.p.maxHealth, bombs: this.p.bombs };
    this.buildPlayer();
    this.ev = 0; this.evList = def.timeline.slice();
    if (opts.checkpointS) this.evList = this.evList.filter((e) => e.ev === 'music' || e.s > opts.checkpointS - (['scout', 'drone', 'gunship', 'bomber', 'walker'].includes(e.kind) ? 450 : 800));
    this.bullets = []; this.fireAcc = 0; this.missiles = [];
    this.wave = -1; this.waveClear = 0;
    this.hudState = {};
    this.buildAllies();
    if (this.mode === 'allrange') this.initAir();
    else { this.railFrame(); this.camPos.copy(this.p.pos).addScaledVector(this.fr.t, -16).addScaledVector(this.fr.u, 5); }
    this.updateEntitySync();
    audio.playMusic(this.title ? 'title' : def.music);
    this.running = true; this.hud.show(!this.title);
    this.hud.reset();
    if (!this.title) {
      this.hud.banner(def.name, def.subtitle, 3.2);
      if (this.mode === 'allrange') this.hud.objective('Destroy the Silver Jackal squad');
    }
    this.snapCamera();
  }
  setupEnvironment(def) {
    const th = def.theme, sc = R.scene;
    this.sky = makeSky(th.sky[0], th.sky[2] ? th.sky[1] : th.sky[1], th.sky[2]);
    this.world.add(this.sky);
    sc.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
    sc.background = new THREE.Color(th.fog);
    R.hemi.color.set(th.hemi[0]); R.hemi.groundColor.set(th.hemi[1]);
    R.sunLight.color.set(th.sun);
    this.sunDir = new V(...th.sunDir).normalize();
    if (def.mode === 'rail') {
      this.terrain = buildTerrain(def.rail, th); this.world.add(this.terrain);
      this.water = makeWater(th); this.world.add(this.water);
      this.buildScenery(def);
    } else {
      this.buildAirScene(def);
    }
  }
  buildScenery(def) {
    this.scen = [];
    const f = mkFrame(); const g = new THREE.Group(); this.world.add(g);
    for (const o of def.scenery) {
      def.rail.at(o.s, f);
      const h = def.theme.height(o.s, o.u);
      const m = o.kind === 'rock' ? M.buildRock(o.size, o.seed, 0x6c667c) : M.buildPillar(o.size * 5, o.size * 0.35);
      m.position.copy(f.p).addScaledVector(f.r, o.u); m.position.y = f.p.y + h - 2;
      m.rotation.y = o.seed;
      g.add(m); this.scen.push({ m, s: o.s });
    }
    // cel cloud clusters off to the sides
    for (let i = 0; i < 30; i++) {
      const sN = i * 280 + rr(0, 200); def.rail.at(sN, f);
      const cl = new THREE.Group(); const n = 4 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(rr(18, 36), 8, 6), toon(0xffffff)); c.position.set(k * 26 - n * 13 + rr(-6, 6), rr(-4, 8), rr(-10, 10)); c.scale.y = 0.75; cl.add(c); }
      cl.position.copy(f.p).addScaledVector(f.r, (Math.random() < 0.5 ? -1 : 1) * rr(300, 700)); cl.position.y = rr(90, 200); cl.rotation.y = rr(0, 6); g.add(cl);
    }
  }
  buildAirScene(def) {
    const th = def.theme;
    this.scen = [];
    // cloud sea
    const geo = new THREE.PlaneGeometry(4000, 4000); geo.rotateX(-Math.PI / 2);
    const cm = new THREE.MeshToonMaterial({ color: 0xffd8c8, gradientMap: R.toon });
    const sea = new THREE.Mesh(geo, cm); sea.position.y = -110; sea.receiveShadow = true; this.world.add(sea); this.water = sea;
    // cel cloud puffs
    for (let i = 0; i < 90; i++) {
      const a = rr(0, TAU), d = rr(60, 1200);
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(18, 50), 1), toon(0xffe9df, { flat: true }));
      c.position.set(Math.cos(a) * d, -100 + rr(-8, 16), Math.sin(a) * d); c.scale.y = 0.5; c.castShadow = true; this.world.add(c);
    }
    // floating rock islands with physics colliders
    const rng = mulberry32(7); this.rocks = [];
    for (let i = 0; i < 14; i++) {
      const a = rng() * TAU, d = 90 + rng() * 380, r = 9 + rng() * 22;
      const rock = M.buildRock(r, i * 17 + 3, 0x7b6f86); rock.position.set(Math.cos(a) * d, -10 + rng() * 80, Math.sin(a) * d);
      rock.scale.y = 1.4; this.world.add(rock);
      const e = this.makeEnt({ kind: 'rock', team: 'obst', mesh: null, pos: rock.position.clone(), r: r * 0.92, filter: FILTER.obst, hp: 1e9 });
      e.vis = rock; this.rocks.push(e);
    }
    // sun disc
    const sun = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 12), glowMat(0xfff0c0)); sun.position.copy(this.sunDir).multiplyScalar(1300); sun.material.fog = false; this.world.add(sun);
    const stars = new THREE.Group();
    const sm = glowMat(0xffffff, 0.85); sm.fog = false;
    for (let i = 0; i < 140; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(rr(1.5, 3.5), 0), sm); const v = new V(rr(-1, 1), rr(0.15, 1), rr(-1, 1)).normalize().multiplyScalar(1400); s.position.copy(v); stars.add(s); }
    this.world.add(stars);
  }
  buildPlayer() {
    const ship = M.buildArwing(M.PALETTES.kit);
    this.shipRoot = new THREE.Group(); this.shipBank = new THREE.Group();
    this.shipRoot.add(this.shipBank); this.shipBank.add(ship); this.ship = ship;
    this.world.add(this.shipRoot);
    this.anim = new Animator(ship); this.anim.play(M.CLIPS.wingFlutter, { loop: true, layer: 'wing' });
    ship.traverse((o) => { if (o.isMesh && !o.userData.isOutline) o.castShadow = true; });
    // reticles in world are DOM; player collider
    this.pe = this.makeEnt({ kind: 'player', team: 'player', mesh: null, pos: this.p.pos.clone(), r: 1.6, filter: FILTER.player, hp: 1e9 });
    this.pe.isPlayer = true;
  }
  buildAllies() {
    this.allies = [];
    const list = this.mode === 'rail' ? ['rook', 'hazel', 'dot'] : ['rook', 'hazel', 'dot'];
    const offs = [[-16, 6, 40], [16, 7, 52], [0, 14, 70]];
    list.forEach((k, i) => {
      const info = ALLIES[k]; const mesh = M.buildArwing(M.PALETTES[info.pal]);
      mesh.traverse((o) => { if (o.isMesh && !o.userData.isOutline) o.castShadow = true; });
      this.world.add(mesh);
      const a = { kind: 'ally', key: k, info, team: 'ally', mesh, pos: new V(), hp: 100, maxHp: 100, state: 'formation', off: offs[i], dead: false, rail: { s: 0, x: 0, y: 0 }, t: i * 2, yaw: 0, pitch: 0, vel: new V(), chasers: 0, fireT: rr(0.3, 1), r: 1.8, anim: new Animator(mesh), roll: 0, helped: false };
      a.anim.play(M.CLIPS.wingFlutter, { loop: true, layer: 'wing' });
      const h = this.phys.kinematic(a.pos, [{ type: 'ball', r: 2.0 }], FILTER.ally, a); a.h = h;
      if (this.mode === 'allrange') { a.pos.set(i * 20 - 20, 10, 40 + i * 8); a.yaw = 0; }
      this.allies.push(a); this.ents.push(a);
    });
  }

  // ---------- entity management ----------
  makeEnt(o) {
    const e = Object.assign({ pos: new V(), vel: new V(), t: 0, dead: false, rail: null, fireT: rr(0.5, 1.5), hp: 1, maxHp: o.hp ?? 1 }, o);
    e.maxHp = e.hp; e.pos = o.pos ? o.pos.clone() : new V();
    if (e.mesh) this.world.add(e.mesh);
    const shapes = o.shapes || [{ type: 'ball', r: o.r || 1 }];
    e.h = this.phys.kinematic(e.pos, shapes, o.filter, e);
    this.ents.push(e); return e;
  }
  removeEnt(e) { if (e.dead) return; e.dead = true; e.remove = true; }
  purge() {
    for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i];
      if (e.remove) {
        if (e.mesh) this.world.remove(e.mesh);
        if (e.h) this.phys.remove(e.h);
        e.h = null; this.ents.splice(i, 1);
      }
    }
  }
  railFrame(s = this.p.s) { this.rail.at(s, this.fr); return this.fr; }
  railToWorld(s, x, y, out) { this.rail.at(s, this.fr2); return out.copy(this.fr2.p).addScaledVector(this.fr2.r, x).addScaledVector(this.fr2.u, y); }
  groundY(s, x) { this.rail.at(s, this.fr2); return this.fr2.p.y + this.theme.height(s, x); }
  orientRail(mesh, s, facePlayer = true) {
    this.rail.at(s, this.fr2); const f = this.fr2;
    const m = new THREE.Matrix4(), Z = facePlayer ? f.t : f.t.clone().negate();
    const X = new V().crossVectors(f.u, Z).normalize();
    m.makeBasis(X, f.u, Z); mesh.quaternion.setFromRotationMatrix(m);
  }

  spawnEnemy(kind, o = {}) {
    const def = DEFS[kind];
    const e = {
      kind, def, team: 'enemy', score: def.score, name: def.name, hp: def.hp, r: def.r, filter: FILTER.enemy, vs: o.vs ?? 40,
      x0: o.x ?? 0, y0: o.y ?? 4, freq: rr(0.8, 1.6), ph: rr(0, TAU), amp: rr(2, 7), phase: 'in', hold: o.hold ?? 150, holdT: 24, parts: [],
    };
    let mesh;
    if (kind === 'tower') mesh = this.buildTowerMesh(); else mesh = def.build();
    e.mesh = mesh; mesh.traverse((c) => { if (c.isMesh && !c.userData.isOutline) c.castShadow = true; });
    Object.assign(e, o.extra || {});
    const ent = this.makeEnt(e);
    ent.anim = new Animator(mesh);
    if (this.mode === 'rail') {
      const s = o.s ?? this.p.s + 450;
      ent.rail = { s, x: e.x0, y: e.y0, vs: ent.vs };
      if (def.ground) { ent.ground = true; ent.rail.y = 0; }
      if (kind === 'turret' || kind === 'tower') ent.vs = 0;
      this.syncRailEnt(ent);
    } else {
      ent.pos.copy(o.pos || new V(0, 0, 0)); ent.yaw = o.yaw ?? 0; ent.pitch = 0; ent.speed = 60;
    }
    if (kind === 'walker') ent.anim.play(M.CLIPS.walk, { loop: true });
    if (kind === 'turret') ent.mesh.userData.parts.head.rotation.y = 0;
    if (kind === 'bomber') this.setupBomber(ent);
    if (kind === 'walker') this.setupWalker(ent);
    if (kind === 'carrier') this.setupCarrier(ent);
    if (kind === 'ace' || kind === 'leader') { ent.speed = 90; ent.yaw = o.yaw ?? 0; }
    return ent;
  }
  buildTowerMesh() {
    const g = new THREE.Group(); g.userData.parts = {};
    for (let i = 0; i < 4; i++) g.add(mk(new THREE.BoxGeometry(7 - i * 0.5, 7, 7 - i * 0.5), i % 2 ? 0xc7b5a0 : 0x9d8a78, { flat: true, pos: [0, 3.5 + i * 7, 0] }));
    const cap = mk(new THREE.CylinderGeometry(2.5, 3.3, 2.2, 8), 0x5b5368, { pos: [0, 29, 0] }); g.add(cap);
    const head = new THREE.Group(); head.position.y = 31; g.add(head); g.userData.parts.head = head;
    head.add(mk(new THREE.SphereGeometry(1.7, 10, 8), 0xb43a4a));
    head.add(mk(new THREE.CylinderGeometry(0.28, 0.34, 3.2, 6), 0x2b2630, { rot: [Math.PI / 2, 0, 0], pos: [0, 0.1, -2] }));
    return g;
  }
  syncRailEnt(e) {
    const r = e.rail;
    let y = r.y;
    if (e.ground) { y = this.groundY(r.s, r.x) - this.railBaseY(r.s) + (e.kind === 'walker' ? -1 : 0); }
    this.railToWorld(r.s, r.x, y, e.pos);
    if (e.kind === 'tower') e.top = e.top || new V(), e.top.copy(e.pos).setY(e.pos.y + 31);
    e.mesh.position.copy(e.pos);
    this.orientRail(e.mesh, r.s, true);
    if (e.mesh.userData.parts && e.kind === 'tower') { /* head tracks player in AI */ }
  }
  railBaseY(s) { this.rail.at(s, this.fr2); return this.fr2.p.y; }

  // ---------- projectiles ----------
  playerBolt(pos, dir, dmg = 1, speed = 320, col = 0x7cf3ff) {
    const mesh = M.buildBolt(col, 4.5, 0.2); mesh.position.copy(pos); mesh.lookAt(pos.clone().add(dir));
    const b = this.makeEnt({ kind: 'pbolt', team: 'pbullet', mesh, pos, r: 1.0, filter: FILTER.pbullet, hp: 1, dmg, life: 1.5 });
    b.vel.copy(dir).multiplyScalar(speed);
    if (this.mode === 'rail') b.vel.addScaledVector(this.fr.t, this.p.speed * this.p.speedMul);
    else b.vel.addScaledVector(this.p.wvel, 0.5);
    this.bullets.push(b); return b;
  }
  enemyBolt(from, speed = 85, dmg = 10, opts, dirOverride) {
    if (this.title || !this.p.alive) return;
    const dir = dirOverride ? dirOverride.clone() : this.leadDir(from, speed);
    const mesh = M.buildBolt(0xff5a8a, 3.2, 0.34); mesh.position.copy(from); mesh.lookAt(from.clone().add(dir));
    const b = this.makeEnt({ kind: 'ebolt', team: 'ebullet', mesh, pos: from.clone(), r: 0.9, filter: FILTER.ebullet, hp: 1, dmg, life: 5 });
    b.vel.copy(dir).multiplyScalar(speed); this.bullets.push(b); audio.sfx('enemyLaser'); return b;
  }
  enemyBoltTo(from, to, speed, dmg, target) {
    const dir = to.clone().sub(from).normalize();
    const mesh = M.buildBolt(0xff5a8a, 3.2, 0.34); mesh.position.copy(from); mesh.lookAt(from.clone().add(dir));
    const b = this.makeEnt({ kind: 'ebolt', team: 'ebullet', mesh, pos: from.clone(), r: 0.9, filter: FILTER.ebullet, hp: 1, dmg, life: 4 });
    b.vel.copy(dir).multiplyScalar(speed); this.bullets.push(b); return b;
  }
  leadDir(from, speed) {
    const P = this.p; const d = P.pos.distanceTo(from); const t = Math.min(1.6, d / (speed + 60));
    const tgt = P.pos.clone().addScaledVector(P.wvel, t * 0.85);
    return tgt.sub(from).normalize();
  }
  ringBurst(pos, n, speed, dmg) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const dir = new V(Math.cos(a), Math.sin(a) * 0.6, 0.0);
      // orient the ring toward the player's plane
      const toP = this.p.pos.clone().sub(pos).normalize();
      const right = new V().crossVectors(toP, new V(0, 1, 0)).normalize(); const up = new V().crossVectors(right, toP);
      const d = right.multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a)).addScaledVector(toP, 0.5).normalize();
      this.enemyBolt(pos, speed, dmg, null, d);
    }
  }

  // ---------- damage / death ----------
  damageEnt(e, dmg, src) {
    if (e.dead || e.invulnerable) return false;
    if (e.shielded) { audio.sfx('clank'); this.fx.spark(e.pos, 4, 0x9fe8ff, 20); return false; }
    e.hp -= dmg; e.flash = 0.1; this.stats.hits++;
    audio.sfx('hit'); this.fx.spark(e.pos, 3, 0xfff0b0, 24);
    if (e.parent) e.parent.flash = 0.1;
    if (e.hp <= 0) this.killEnt(e, src);
    return true;
  }
  killEnt(e, src) {
    if (e.dead) return;
    e.dead = true; e.remove = !e.keepAfterDeath;
    const scale = clamp(e.r / 3, 0.7, 4);
    this.fx.explosion(e.pos, scale);
    if (e.onDeath) e.onDeath(e);
    if (e.team === 'enemy' && !e.noScore) this.addScore(e.score || 50, e.pos, e.kind !== 'drone' || true);
    if (e.team === 'enemy' && e.kind !== 'part') {
      this.p.kills++; this.p.combo++; this.p.comboT = 2.6;
      if (Math.random() < 0.08 && e.def && !e.def.ground && this.mode === 'rail') this.dropItem(e);
      this.spawnDebris(e);
    }
    if (e.kind === 'tower') this.collapseTower(e);
    if (e.mesh && e.keepAfterDeath) e.mesh.visible = false;
    input.rumble(0.3, 0.6, 140);
  }
  dropItem(e) {
    if (this.mode !== 'rail') return;
    const r = e.rail; if (!r) return;
    this.spawnPickup(pick(['item_shield', 'item_bomb']), r.s, r.x, r.y);
  }
  addScore(v, pos, show = true) {
    const P = this.p; const mult = 1 + Math.min(20, P.combo) * 0.05;
    const gain = Math.round(v * mult); P.score += gain;
    if (show && pos) this.hud.popup('+' + gain, pos);
  }
  spawnDebris(e) {
    if (this.title) return;
    const n = clamp(Math.round(e.r * 1.5), 3, 9);
    for (let i = 0; i < n; i++) {
      const sz = rr(0.25, 0.55) * Math.max(1, e.r * 0.45);
      const mesh = mk(new THREE.BoxGeometry(sz * 2, sz * 1.2, sz * 1.6), pick([0x5a3a7a, 0x8a3ad9, 0xb43a4a, 0x2b2630]), { flat: true, outline: 0.03 });
      mesh.position.copy(e.pos); this.world.add(mesh);
      const v = new V(rr(-1, 1), rr(0.1, 1), rr(-1, 1)).normalize().multiplyScalar(rr(8, 22));
      v.addScaledVector(this.mode === 'rail' ? this.fr.t : this.p.wvel, this.mode === 'rail' ? this.p.speed * 0.8 : 0.4);
      const h = this.phys.debrisBody(e.pos, { x: sz, y: sz * 0.6, z: sz * 0.8 }, v, { x: rr(-6, 6), y: rr(-6, 6), z: rr(-6, 6) }, null);
      this.debris.push({ mesh, h, life: rr(2.2, 3.4), trail: 0 });
    }
  }
  collapseTower(e) {
    const base = e.pos; const slab = this.phys.groundSlab(new V(base.x, base.y - 0.2, base.z), 22, 22);
    const dirT = this.mode === 'rail' ? this.fr.t : new V(0, 0, -1);
    this.debris.push({ slab, life: 6, mesh: null });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const sz = 3.3; const mesh = mk(new THREE.BoxGeometry(sz * 2, 3.4, sz * 2), i % 2 ? 0xc7b5a0 : 0x9d8a78, { flat: true });
      const pos = new V(base.x + (j - 0.5) * 3, base.y + 2 + i * 3.6, base.z);
      mesh.position.copy(pos); this.world.add(mesh);
      const v = new V(rr(-3, 3), rr(0, 3), rr(-3, 3)).addScaledVector(dirT, this.mode === 'rail' ? -this.p.speed * 0.1 : 0);
      const h = this.phys.debrisBody(pos, { x: sz, y: 1.7, z: sz }, v, { x: rr(-1, 1), y: rr(-1, 1), z: rr(-1, 1) }, null);
      this.debris.push({ mesh, h, life: 5, big: true });
    }
    this.fx.shake = Math.max(this.fx.shake, 0.5);
  }
  updateDebris(dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]; d.life -= dt;
      if (d.mesh && d.h) {
        const t = d.h.body.translation(), q = d.h.body.rotation();
        d.mesh.position.set(t.x, t.y, t.z); d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
        d.trail -= dt; if (d.trail <= 0 && !d.big && d.life > 1) { d.trail = 0.09; this.fx.smoke(d.mesh.position, new V(0, 1, 0), 1.2, 0x302630); }
      }
      if (d.life <= 0) {
        if (d.mesh) this.world.remove(d.mesh);
        if (d.h) this.phys.world.removeRigidBody(d.h.body);
        if (d.slab) this.phys.world.removeRigidBody(d.slab.body);
        this.debris.splice(i, 1);
      }
    }
  }
  hurtPlayer(dmg, src, silent) {
    const P = this.p;
    if (!P.alive || P.invuln > 0 || this.attract || this.title || this.cleared) return false;
    P.health -= dmg; P.invuln = 0.9; P.hurtT = 0.4; P.combo = 0; this.stats.damageTaken += dmg;
    this.fx.shake = Math.max(this.fx.shake, 0.5 + dmg / 60); this.hud.flash('damage');
    audio.sfx('hurt'); input.rumble(0.8, 0.9, 260);
    this.fx.spark(P.pos, 10, 0xff8a40, 30);
    if (P.health <= 0) this.playerDie();
    else if (P.health < 30) { this.hud.warn('SHIELD CRITICAL'); audio.sfx('warn'); }
    return true;
  }
  playerDie() {
    const P = this.p; P.alive = false; P.health = 0; this.stats.deaths++;
    this.fx.explosion(P.pos, 3.5); this.shipRoot.visible = false;
    this.pe.invulnerable = true;
    audio.sfx('bigExplode'); input.rumble(1, 1, 600);
    this.hud.banner('MISSION FAILED', 'Your Arwing was destroyed', 3);
    setTimeout(() => this.emit('dead'), 2400);
  }
  heal(v) { const P = this.p; P.health = Math.min(P.maxHealth, P.health + v); this.hud.flash('heal'); }

  // ---------- pickups ----------
  spawnPickup(kind, s, x, y, pos) {
    const mk2 = kind.startsWith('item_') ? kind.slice(5) : kind;
    const mesh = kind === 'ring' ? M.buildRing(false) : kind === 'gold' ? M.buildItem('gold') : kind === 'item_shield' ? M.buildItem('shield') : M.buildItem(mk2);
    if (kind === 'ring') { mesh.scale.setScalar(1.0); }
    const e = this.makeEnt({ kind, team: 'pickup', mesh, r: kind === 'ring' ? 3.0 : 2.4, filter: FILTER.pickup, hp: 1, t: 0 });
    if (this.mode === 'rail') { e.rail = { s, x, y }; this.syncRailEnt(e); } else e.pos.copy(pos);
    return e;
  }
  collect(e) {
    if (e.dead) return;
    e.dead = true; e.remove = true; const P = this.p;
    switch (e.kind) {
      case 'ring': audio.sfx('ring'); this.heal(8); P.rings++; this.addScore(50, e.pos); this.hud.toast('RING +8'); break;
      case 'gold': audio.sfx('medal'); P.maxHealth = Math.min(200, P.maxHealth + 25); P.health = P.maxHealth; P.rings += 3; this.addScore(500, e.pos); this.hud.toast('GOLD RING — MAX SHIELD UP'); break;
      case 'item_shield': audio.sfx('pickup'); this.heal(40); this.hud.toast('SHIELD +40'); break;
      case 'item_bomb': audio.sfx('bombPickup'); P.bombs = Math.min(6, P.bombs + 1); this.hud.toast('BOMB +1'); break;
      case 'item_laser': audio.sfx('pickup'); P.laser = Math.min(2, P.laser + 1); this.hud.toast(P.laser === 1 ? 'TWIN LASERS' : 'HYPER LASERS'); break;
    }
    this.fx.spark(e.pos, 14, 0xffffff, 30);
  }

  // ---------- collision resolution ----------
  handlePairs(pairs) {
    for (const [a, b] of pairs) {
      if (a.dead || b.dead) continue;
      const t = (x, y) => (a.team === x && b.team === y) ? [a, b] : (a.team === y && b.team === x) ? [b, a] : null;
      let m;
      if ((m = t('pbullet', 'enemy'))) {
        const [bl, en] = m; if (en.invulnerable && !en.shielded) continue;
        this.damageEnt(en, bl.dmg, bl); if (!bl.pierce) { this.removeEnt(bl); }
      } else if ((m = t('pbullet', 'obst'))) { this.fx.spark(m[0].pos, 3, 0xffffff, 20); this.removeEnt(m[0]); }
      else if ((m = t('ebullet', 'player'))) { this.removeEnt(m[0]); if (this.p.rollT > 0 && this.p.rollT < 0.45) { /* deflect handled earlier */ } this.hurtPlayer(m[0].dmg, m[0]); }
      else if ((m = t('ebullet', 'ally'))) { const al = m[1]; this.removeEnt(m[0]); this.damageAlly(al, m[0].dmg); }
      else if ((m = t('ebullet', 'obst'))) { this.fx.spark(m[0].pos, 3, 0xff8aa0, 16); this.removeEnt(m[0]); }
      else if ((m = t('player', 'enemy'))) { this.ram(m[1]); }
      else if ((m = t('player', 'obst'))) { this.crash(m[1]); }
      else if ((m = t('player', 'pickup'))) { this.collect(m[1]); }
    }
  }
  ram(en) {
    if (en.kind === 'part') return;
    if (this.p.rollT > 0) return; // barrel rolling slips past
    const dmg = en.kind === 'drone' ? 12 : 18;
    if (this.hurtPlayer(dmg, en)) {
      this.fx.explosion(en.pos, 0.8);
      if (en.hp < 4 || en.kind === 'drone' || en.kind === 'scout') this.killEnt(en, 'ram');
    }
  }
  crash(ob) {
    if (this.hurtPlayer(26, ob)) {
      audio.sfx('crash');
      const P = this.p;
      if (this.mode === 'rail') { const d = P.pos.clone().sub(ob.pos); P.vx = clamp(d.dot(this.fr.r), -1, 1) * 40; P.vy = 14; }
      else { P.yaw += Math.PI * 0.5; }
    }
  }
  damageAlly(a, dmg) {
    if (a.dead || a.state === 'gone') return;
    a.hp -= dmg; this.fx.spark(a.pos, 5, 0xff8a40, 18);
    if (a.hp <= 0) {
      a.state = 'gone'; a.goneT = 0; this.stats.alliesLost++;
      this.hud.comm(a.key, a.key === 'rook' ? 'I\'m hit! Pulling out — you\'re on your own, Kit!' : a.key === 'hazel' ? 'Engines failing! I\'m heading home!' : 'Mayday! Retreating to base!', 4);
      for (const e of this.ents) if (e.chase === a) e.chase = null;
    }
  }

  // ---------- main update ----------
  update(dt, inp) {
    if (!this.running || this.paused) return;
    dt = Math.min(dt, 1 / 30);
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.15; }
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.35; }
    this.time += dt;
    const P = this.p;
    if (this.attract) inp = this.aiInput(dt);
    if (this.title) inp = Object.assign(inputBlank(), { mx: Math.sin(this.time * 0.5) * 0.6, my: Math.cos(this.time * 0.4) * 0.35 });
    if (!P.alive) inp = inputBlank();
    if (this.cleared) inp = this.cleared && !this.title ? Object.assign(inputBlank(), { mx: 0, my: 0 }) : inp;
    P.invuln = Math.max(0, P.invuln - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.bombCd -= dt;
    if (P.comboT > 0) { P.comboT -= dt; if (P.comboT <= 0) P.combo = 0; }
    if (this.mode === 'rail') this.updateRailPlayer(dt, inp); else this.updateAirPlayer(dt, inp);
    if (!this.title) this.updateWeapons(dt, inp);
    this.director(dt);
    this.updateAllies(dt);
    this.updateEnts(dt);
    this.updateEntitySync();
    this.deflect();
    const pairs = this.phys.step(dt); this.handlePairs(pairs);
    this.updateDebris(dt);
    this.purge();
    this.updateCamera(dt);
    this.fx.update(dt); R.particles.update(dt);
    this.updateScenery();
    this.updateHud(dt, inp);
    if (this.attract) this.attractCheck(dt);
    if (this.cleared) this.clearT += dt;
  }
  updateScenery() {
    const P = this.p;
    if (this.mode === 'rail') {
      for (const o of this.scen) o.m.visible = Math.abs(o.s - P.s) < 1000 && o.s > P.s - 120;
      if (this.water) { this.water.position.x = P.pos.x; this.water.position.z = P.pos.z; }
    } else {
      for (const r of this.rocks) if (r.vis) { /* static */ }
      this.sky.position.copy(P.pos);
    }
    if (this.sky && this.mode === 'rail') this.sky.position.copy(P.pos);
    R.sunLight.position.copy(P.pos).addScaledVector(this.sunDir, 120); R.sunLight.target.position.copy(P.pos);
  }
  updateEntitySync() {
    for (const e of this.ents) {
      if (e.dead || !e.h) continue;
      if (e.kind === 'ally' || e.isPlayer) { this.phys.move(e.h.body, e.pos); continue; }
      this.phys.move(e.h.body, e.pos);
    }
    // player collider follows ship
    this.pe.pos.copy(this.p.pos); this.phys.move(this.pe.h.body, this.pe.pos);
  }
  updateEnts(dt) {
    for (const e of this.ents) {
      if (e.dead) continue;
      e.t += 0;
      if (e.flash > 0) { e.flash -= dt; this.setFlash(e, e.flash > 0); }
      switch (e.team) {
        case 'pbullet': case 'ebullet':
          if (e.homing) this.homing(e, dt);
          e.pos.addScaledVector(e.vel, dt); e.mesh.position.copy(e.pos); e.life -= dt;
          if (e.kind === 'missile') { this.fx.flame(e.pos, new V(0, 0, 0), 1.6); }
          if (e.life <= 0) this.removeEnt(e);
          break;
        case 'enemy': case 'pickup': case 'obst': {
          if (e.team === 'obst' && e.kind === 'rock') break;
          if (this.mode === 'rail') {
            const fn = RAIL[e.kind] || (e.team === 'pickup' ? (e.kind === 'ring' || e.kind === 'gold' ? RAIL.ring : RAIL.item) : e.kind === 'pillar' || e.kind === 'arch' ? RAIL.pillar : null);
            if (e.team === 'enemy' && e.kind !== 'part') {
              if (fn) fn(this, e, dt);
              if (!e.dead) this.syncRailEnt(e);
            } else if (e.team === 'pickup') { if (fn) fn(this, e, dt); if (!e.dead) this.syncRailEnt(e); }
            else if (e.team === 'obst') { if (fn) fn(this, e, dt); }
            if (e.kind === 'part') this.updatePart(e);
          } else {
            if (e.team === 'enemy') {
              if (e.kind === 'part') this.updatePart(e);
              else { const fn = AIR[e.kind]; if (fn) fn(this, e, dt); this.syncAirEnt(e); }
            } else if (e.team === 'pickup') { e.mesh.rotation.y += dt * 2; }
          }
          if (e.anim && e.team === 'enemy') e.anim.update(dt);
          if (e.kind === 'drone' || e.kind === 'bomber') { /* spin handled in AI */ }
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }
  setFlash(e, on) {
    if (!e.mesh) return;
    e.mesh.traverse((c) => { if (c.isMesh && !c.userData.isOutline && c.material && c.material.emissive) { /* shared materials: use scale pulse instead */ } });
    if (e.baseScale == null) e.baseScale = e.mesh.scale.x;
    e.mesh.scale.setScalar(e.baseScale * (on ? 1.06 : 1));
  }
  updatePart(e) {
    const par = e.parent; if (!par || par.dead) { if (!e.dead) this.removeEnt(e); return; }
    par.mesh.updateMatrixWorld(true); e.pos.copy(e.local).applyMatrix4(par.mesh.matrixWorld);
  }
  homing(e, dt) {
    const t = e.target;
    if (!t || t.dead) { e.homing = false; return; }
    const want = t.pos.clone().sub(e.pos); const dist = want.length(); want.normalize();
    const sp = e.vel.length(); const cur = e.vel.clone().normalize();
    cur.lerp(want, clamp(dt * 5.5, 0, 1)).normalize();
    e.vel.copy(cur).multiplyScalar(Math.min(sp + 80 * dt, 260));
    e.mesh.lookAt(e.pos.clone().add(e.vel));
  }
  // barrel roll reflects bullets
  deflect() {
    const P = this.p;
    if (P.rollT <= 0 || P.rollT > 0.55) return;
    for (const b of this.bullets) {
      if (b.dead || b.team !== 'ebullet') continue;
      if (b.pos.distanceTo(P.pos) < 10) {
        b.team = 'pbullet'; b.dmg = 3; b.vel.multiplyScalar(-1.5).add(new V(rr(-12, 12), rr(-8, 8), rr(-12, 12)));
        this.phys.setFilter(b.h.cols, FILTER.pbullet); b.mesh.lookAt(b.pos.clone().add(b.vel));
        b.life = 3; audio.sfx('deflect'); this.fx.spark(b.pos, 5, 0xffffff, 20); P.score += 0; this.stats.deflects = (this.stats.deflects || 0) + 1;
      }
    }
  }

  // ---------- rail-mode player ----------
  updateRailPlayer(dt, inp) {
    const P = this.p; const th = this.theme;
    // boost / brake
    let want = 1;
    const canBoost = P.boost > 0 && !P.boostLock;
    P.boosting = inp.boost && canBoost && !inp.brake && P.alive;
    P.braking = inp.brake && !P.boosting && P.alive;
    if (P.boosting) { want = 1.75; P.boost = Math.max(0, P.boost - 34 * dt); if (P.boost <= 0) P.boostLock = true; }
    else { P.boost = Math.min(100, P.boost + (P.braking ? 28 : 16) * dt); if (P.boostLock && P.boost > 30) P.boostLock = false; }
    if (P.braking) want = 0.55;
    if (P.boosting && !this._boostSfx) { audio.sfx('boost'); this._boostSfx = true; input.rumble(0.2, 0.5, 300); }
    if (!P.boosting) this._boostSfx = false;
    if (P.braking && !this._brakeSfx) { audio.sfx('brake'); this._brakeSfx = true; } if (!P.braking) this._brakeSfx = false;
    P.speedMul = damp(P.speedMul, this.cleared ? 1.1 : want, 3, dt);
    const base = this.title ? 26 : this.stage.speed;
    P.speed = base;
    if (this.bossActive && this.boss && !this.boss.dead) P.speed = base * 0.8;
    P.s += P.speed * P.speedMul * dt;
    // tilt (hold L1/R1)
    P.tilt = damp(P.tilt, inp.tiltL ? -1 : inp.tiltR ? 1 : 0, 10, dt);
    const tilting = (inp.tiltL || inp.tiltR) && P.rollT <= 0;
    // barrel roll
    P.rollCd -= dt;
    if (P.rollT > 0) { P.rollT -= dt; }
    if ((inp.rollL || inp.rollR) && P.rollCd <= 0 && P.alive) {
      P.rollT = 0.62; P.rollCd = 0.85; P.rollDir = inp.rollL ? -1 : 1;
      this.anim.play(inp.rollL ? M.CLIPS.rollL : M.CLIPS.rollR, { restart: true, layer: 'roll' });
      audio.sfx('roll'); P.vx += P.rollDir * 22;
    }
    const lat = (tilting ? 52 : 36) * (P.boosting ? 0.85 : 1) * (P.braking ? 1.1 : 1);
    const ax = inp.mx, ay = inp.my;
    P.vx = damp(P.vx, ax * lat, 6.5, dt); P.vy = damp(P.vy, ay * lat * 0.78, 6.5, dt);
    const gy = this.theme.height(P.s, P.x);
    const minY = Math.max(-11, gy + 3.5);
    const maxX = 27;
    P.x = clamp(P.x + P.vx * dt, -maxX, maxX); P.y = clamp(P.y + P.vy * dt, minY, 19);
    if (P.x >= maxX - 0.01 && P.vx > 0) P.vx = 0; if (P.x <= -maxX + 0.01 && P.vx < 0) P.vx = 0;
    if (P.y <= minY + 0.01 && P.vy < 0) { P.vy = 0; if (gy + 3.5 > -10 && Math.random() < 0.3) this.fx.spark(P.pos, 1, 0xffcc88, 14); }
    if (P.y >= 18.99 && P.vy > 0) P.vy = 0;
    // aim (right stick) smoothing
    P.aimX = damp(P.aimX, inp.ax, 12, dt); P.aimY = damp(P.aimY, inp.ay, 12, dt);
    this.railFrame(); const f = this.fr;
    P.pos.copy(f.p).addScaledVector(f.r, P.x).addScaledVector(f.u, P.y);
    P.wvel.copy(f.t).multiplyScalar(P.speed * P.speedMul).addScaledVector(f.r, P.vx * 0.5).addScaledVector(f.u, P.vy * 0.5);
    // ship visuals
    const m = new THREE.Matrix4(); m.makeBasis(f.r.clone().negate(), f.u, f.t.clone().negate());
    this.shipRoot.quaternion.setFromRotationMatrix(m); this.shipRoot.position.copy(P.pos);
    P.bank = damp(P.bank, -P.vx * 0.022 + P.tilt * 1.15, 9, dt); P.pitchVis = damp(P.pitchVis, P.vy * 0.016, 8, dt);
    this.shipBank.rotation.set(P.pitchVis, -P.vx * 0.005, P.bank);
    this.shipRoot.visible = P.alive && !(P.invuln > 0 && !this.attract && Math.floor(this.time * 18) % 2 === 0 && P.invuln < 0.8);
    this.shipEngine(dt);
    this.anim.update(dt);
    // roll clip reset
    if (P.rollT <= 0 && this.ship.userData.parts.body.rotation.z !== 0 && !this.anim.isPlaying('roll')) this.ship.userData.parts.body.rotation.z = 0;
    // collider radius shrinks while tilting
    if (this.pe.h) this.pe.h.cols[0].setRadius(tilting ? 0.9 : P.rollT > 0 ? 1.0 : 1.6);
  }
  shipEngine(dt) {
    const P = this.p; const parts = this.ship.userData.parts;
    const k = P.boosting ? 2.2 : P.braking ? 0.5 : 1;
    for (const k2 of ['flameL', 'flameR']) { const fl = parts[k2]; fl.scale.set(1, 0.7 + Math.random() * 0.4 * k + 0.5 * k, 1); fl.scale.x = fl.scale.z = 0.8 + (k - 1) * 0.4; }
    if (P.boosting && Math.random() < 0.7) { const q = new V(1, 0, 2.6).applyMatrix4(this.shipBank.matrixWorld); this.fx.flame(this.ship.localToWorld(new V(1.0, -0.15, 3.2)), new V(0, 0, 0).addScaledVector(this.fr.t, 20), 1.6); this.fx.flame(this.ship.localToWorld(new V(-1.0, -0.15, 3.2)), new V(0, 0, 0).addScaledVector(this.fr.t, 20), 1.6); }
    // camera FOV
    this.fovT = P.boosting ? 76 : P.braking ? 56 : 64;
  }
}
export function inputBlank() { return input.blank(); }
